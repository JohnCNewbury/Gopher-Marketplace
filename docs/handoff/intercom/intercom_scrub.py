#!/usr/bin/env python3
"""Turn raw Intercom transcripts into a PII-free, clustered FAQ corpus.

    python3 intercom_scrub.py [intercom-conversations.jsonl]

Three passes:
  1. REDACT   — strip customer PII from every message body.
  2. VERIFY   — re-scan the redacted output for PII. Exits non-zero if any survives.
  3. CLUSTER  — group near-duplicate customer questions so thousands of threads
                collapse into a few dozen canonical FAQs.

Outputs:
  intercom-clean.jsonl    scrubbed conversations
  faq-clusters.json       clusters, largest first — the input for FAQ synthesis
  redaction-report.txt    what was removed, and the verify result

Nothing here calls an LLM. Read redaction-report.txt and spot-check
intercom-clean.jsonl BEFORE any of this goes near a model or a prompt corpus.
"""

import json
import os
import re
import sys
from collections import Counter, defaultdict

SRC = sys.argv[1] if len(sys.argv) > 1 else "intercom-conversations.jsonl"
CLEAN = "intercom-clean.jsonl"
CLUSTERS = "faq-clusters.json"
REPORT = "redaction-report.txt"

SIMILARITY = 0.5   # Jaccard threshold to merge two questions into one cluster
MIN_CLUSTER = 2    # clusters smaller than this are noise, reported separately

# --------------------------------------------------------------------------
# 1. REDACTION
# --------------------------------------------------------------------------
# Order matters: cards and phones both look like digit runs, so cards go first.
PATTERNS = [
    ("CARD",    re.compile(r"\b(?:\d[ -]?){13,16}\b")),
    ("SSN",     re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("EMAIL",   re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
    ("PHONE",   re.compile(r"(?:\+?1[ .-]?)?\(?\b\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b")),
    ("URL",     re.compile(r"https?://\S+")),
    ("ADDRESS", re.compile(
        r"\b\d{1,6}\s+(?:[A-Z][\w'-]*\s+){0,4}"
        r"(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|"
        r"Way|Pl|Place|Ter|Terrace|Cir|Circle|Hwy|Highway|Pkwy|Parkway)\b\.?",
        re.I)),
    ("ZIP",     re.compile(r"\b\d{5}(?:-\d{4})?\b")),
    # The id must contain a digit, or "order hasn't" gets eaten as an order number.
    ("ORDERID", re.compile(
        r"\b(?:order|req(?:uest)?|txn|transaction)\s*#?\s*(?=[\w-]*\d)[\w-]{4,}\b", re.I)),
]

# Placeholders the redactor leaves behind. They must never become FAQ keywords.
PLACEHOLDER = re.compile(r"\[(?:%s|NAME)\]" % "|".join(label for label, _ in PATTERNS))

# Never redact these even though they appear in the author-name column.
# Two groups: brand/role words, and English words that are also common first names.
# Redacting "Will"/"Mark"/"Bill" would mangle ordinary sentences.
NAME_ALLOWLIST = {
    "gopher", "gophers", "support", "team", "bot", "fin", "operator",
    "customer", "admin", "help", "inc", "iq",
    "will", "mark", "bill", "rose", "grace", "hope", "art", "drew", "chase",
    "may", "june", "april", "august", "sunny", "frank", "rich", "sue", "pat",
    "guy", "jack", "don", "max", "ray", "van", "wade", "chip", "buck",
}

# A name token appearing in more than this share of conversations is being used
# as an ordinary word, not as somebody's name.
COMMON_WORD_RATIO = 0.02
DICT_PATH = "/usr/share/dict/words"


def english_words():
    """Common nouns from the system wordlist.

    The list stores proper nouns capitalized ("Sarah", "Chen", "John") and common
    nouns lowercase ("will", "mark", "rose"). Keeping only the already-lowercase
    entries is what separates a word from a name — a case-insensitive match would
    spare every first name in the file.
    """
    try:
        with open(DICT_PATH, encoding="utf-8", errors="ignore") as fh:
            return {w for w in (line.strip() for line in fh) if w and w.islower()}
    except OSError:
        return set()


def build_name_vocab(convos):
    """Names from author metadata, minus anything that reads as an ordinary word.

    A candidate is spared only if it is BOTH a dictionary word AND actually used
    as one in the transcripts. Either test alone gives the wrong answer:
    "sarah" is in the wordlist but is a person; "robinson" recurs often but is a
    surname. Requiring both keeps "will"/"mark" and still strips both of those.
    """
    candidates = set()
    for c in convos:
        for m in c.get("messages", []):
            for token in re.split(r"\W+", (m.get("name") or "")):
                token = token.strip().lower()
                if len(token) > 2 and token not in NAME_ALLOWLIST and token.isalpha():
                    candidates.add(token)

    # How many conversations use each candidate as a plain word in message text?
    doc_freq = Counter()
    for c in convos:
        words = set()
        for m in c.get("messages", []):
            words.update(re.findall(r"[a-z]+", (m.get("body") or "").lower()))
        doc_freq.update(words & candidates)

    lexicon = english_words()
    threshold = max(3, int(len(convos) * COMMON_WORD_RATIO))
    if lexicon:
        spared = {t for t in candidates if t in lexicon and doc_freq[t] >= threshold}
    else:
        # No wordlist available — fall back to frequency only, and say so.
        print("WARNING: %s missing; name filtering is frequency-only." % DICT_PATH)
        spared = {t for t in candidates if doc_freq[t] >= threshold}

    return candidates - spared, sorted(spared)


def redact(text, name_re, counts):
    for label, pattern in PATTERNS:
        text, n = pattern.subn("[%s]" % label, text)
        counts[label] += n
    if name_re:
        text, n = name_re.subn("[NAME]", text)
        counts["NAME"] += n
    return text


# --------------------------------------------------------------------------
# 3. CLUSTERING
# --------------------------------------------------------------------------
STOPWORDS = set("""
a an the i im i'm my me we our you your it its is are was were be been being do does did
can could would should will won't cant can't to of in on at for from with without and or but
if this that these those there here have has had get got please thanks thank hi hello hey
just about as so what when where why how not no yes ok okay any some
""".split())


def keywords(text):
    # Drop [EMAIL]/[PHONE]/... first — otherwise every question "shares" those
    # words and boilerplate contact info drives the clustering.
    text = PLACEHOLDER.sub(" ", text)
    words = re.findall(r"[a-z']+", text.lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def cluster(questions):
    """Greedy single-pass clustering. O(n * clusters) — fine for tens of thousands.

    The seed key set is deliberately frozen. Letting a cluster's vocabulary grow
    dilutes its Jaccard score against later members, which splits identical
    questions across two clusters.
    """
    clusters = []  # each: {"keys": frozen seed set, "items": [idx]}
    for idx, (_, keys) in enumerate(questions):
        best, best_score = None, SIMILARITY
        for c in clusters:
            score = jaccard(keys, c["keys"])
            if score >= best_score:
                best, best_score = c, score
        if best is None:
            clusters.append({"keys": set(keys), "items": [idx]})
        else:
            best["items"].append(idx)
    return clusters


def main():
    if not os.path.exists(SRC):
        sys.exit("No %s — run intercom_export.py first." % SRC)

    convos = []
    with open(SRC, encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                convos.append(json.loads(line))
    print("Loaded %d conversations from %s" % (len(convos), SRC))

    name_vocab, name_skipped = build_name_vocab(convos)
    name_re = None
    if name_vocab:
        name_re = re.compile(r"\b(?:%s)\b" % "|".join(sorted(map(re.escape, name_vocab))), re.I)
    print("Name vocabulary: %d names to strip (%d skipped as ordinary words)"
          % (len(name_vocab), len(name_skipped)))

    counts = Counter()
    cleaned = []
    dropped = 0

    for c in convos:
        msgs = []
        for m in c.get("messages", []):
            body = redact(m.get("body") or "", name_re, counts)
            if body.strip():
                msgs.append({"author": m.get("author"), "body": body})

        # An FAQ needs a customer asking and a human answering. Anything else is noise.
        has_q = any(m["author"] == "user" for m in msgs)
        has_a = any(m["author"] == "admin" for m in msgs)
        if not (has_q and has_a):
            dropped += 1
            continue

        cleaned.append({
            "id": c["id"],
            "subject": redact(c.get("subject") or "", name_re, counts),
            "messages": msgs,
        })

    with open(CLEAN, "w", encoding="utf-8") as fh:
        for c in cleaned:
            fh.write(json.dumps(c, ensure_ascii=False) + "\n")

    print("Redacted and kept %d conversations (dropped %d with no Q&A pair)"
          % (len(cleaned), dropped))

    # ---- 2. VERIFY: the redaction must survive its own audit -------------
    # Only the genuinely identifying patterns. ORDERID/ZIP/URL are lower risk and
    # their placeholders ("order [ORDERID]") can re-trip their own regex.
    VERIFY_LABELS = {"CARD", "SSN", "EMAIL", "PHONE", "ADDRESS"}
    leaks = Counter()
    examples = defaultdict(list)
    for c in cleaned:
        for m in c["messages"]:
            for label, pattern in PATTERNS:
                if label not in VERIFY_LABELS:
                    continue
                for hit in pattern.findall(m["body"]):
                    leaks[label] += 1
                    if len(examples[label]) < 3:
                        examples[label].append(str(hit)[:60])

    # ---- 3. CLUSTER the customer's opening question ----------------------
    questions = []
    for c in cleaned:
        first_q = next((m["body"] for m in c["messages"] if m["author"] == "user"), "")
        first_a = next((m["body"] for m in c["messages"] if m["author"] == "admin"), "")
        questions.append(((c["id"], first_q, first_a), keywords(first_q)))

    groups = cluster(questions)
    groups.sort(key=lambda g: len(g["items"]), reverse=True)

    out = []
    for g in groups:
        if len(g["items"]) < MIN_CLUSTER:
            continue
        items = [questions[i][0] for i in g["items"]]
        # The shortest question is usually the cleanest phrasing of the ask.
        rep = min(items, key=lambda it: len(it[1]))
        out.append({
            "size": len(items),
            "representative_question": rep[1][:400],
            "top_terms": [w for w, _ in Counter(
                w for i in g["items"] for w in questions[i][1]).most_common(8)],
            "sample_questions": [it[1][:300] for it in items[:5]],
            "sample_answers": [it[2][:600] for it in items[:5] if it[2]],
            "conversation_ids": [it[0] for it in items[:20]],
        })

    with open(CLUSTERS, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)

    singletons = sum(1 for g in groups if len(g["items"]) < MIN_CLUSTER)

    # ---- report ----------------------------------------------------------
    lines = [
        "INTERCOM SCRUB REPORT",
        "=" * 60,
        "source:              %s" % SRC,
        "conversations in:    %d" % len(convos),
        "kept (had Q and A):  %d" % len(cleaned),
        "dropped:             %d" % dropped,
        "",
        "REDACTIONS",
        "-" * 60,
    ]
    for label, _ in PATTERNS:
        lines.append("  %-9s %6d" % (label, counts[label]))
    lines.append("  %-9s %6d" % ("NAME", counts["NAME"]))
    if name_skipped:
        lines.append("")
        lines.append("  Names left alone (used as ordinary words): %s"
                     % ", ".join(name_skipped[:15]))
    lines += [
        "",
        "VERIFY (re-scan of %s)" % CLEAN,
        "-" * 60,
    ]
    if leaks:
        lines.append("  *** FAILED — PII survived redaction ***")
        for label, n in leaks.most_common():
            lines.append("  %-9s %6d  e.g. %s" % (label, n, ", ".join(examples[label])))
        lines.append("")
        lines.append("  DO NOT feed intercom-clean.jsonl to an LLM until this is clean.")
    else:
        lines.append("  PASSED — no PII patterns found in the redacted output.")
    lines += [
        "",
        "CLUSTERS",
        "-" * 60,
        "  clusters (>=%d threads): %d" % (MIN_CLUSTER, len(out)),
        "  one-off questions:      %d" % singletons,
        "  wrote %s" % CLUSTERS,
    ]
    if out:
        lines += ["", "  Top asks:"]
        for c in out[:10]:
            lines.append("   %4dx  %s" % (c["size"], c["representative_question"][:70].replace("\n", " ")))

    report = "\n".join(lines)
    with open(REPORT, "w", encoding="utf-8") as fh:
        fh.write(report + "\n")
    print("\n" + report)

    if leaks:
        sys.exit(1)


if __name__ == "__main__":
    main()
