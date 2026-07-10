#!/usr/bin/env python3
"""Process a batch of Intercom FAQ clusters against the LIVE iQ FAQS store.

    python3 intercom_process_batch.py [faq-clusters.json] [--min-size N]
                                      [--limit N] [--apply]

Batch 1 (the top ~8 clusters) was merged by hand. This does the same triage
automatically for the long tail, following the rules locked in during batch 1:

  * COVERED   — the store already answers this cluster. Harvest the cluster's
                distinctive phrasings as KEYWORD enrichment for the matched
                entry. Safe and additive; never changes answer text.
  * NEW       — nothing in the store matches. Emit a candidate entry with the
                real support answers as raw material. The canonical answer is
                NOT written here — that needs human/LLM voice + a fact-check,
                and is where conflicts with the live store would come from.
  * NOISE     — below --min-size, or no meaningful content words.

Because COVERED clusters only ever contribute keywords (never answers), this
pass CANNOT introduce a contradicting answer. That is the whole safety model:
"live store wins" is enforced structurally, not by judgement.

Coverage is decided by the REAL engine matcher (scoreRec/searchFaqs), driven
via `osascript -l JavaScript` — so "already covered" means "the engine already
routes it to a good answer," which is the question that actually matters. If
osascript is unavailable it falls back to a conservative token heuristic and
says so.

Read-only by default: writes batch-worklist.json + batch-report.txt.
--apply then performs ONLY the keyword enrichment across all 7 inlined copies
(round-trip-safe). New entries and answers are always left for review.

Input schema (from intercom_scrub.py): a JSON array of
  {size, representative_question, top_terms, sample_questions,
   sample_answers, conversation_ids}
"""

import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ENGINE = os.path.join(ROOT, "Final/assets/js/gopher-ai-engine.js")
# All inlined copies of the FAQS store (6 byte-identical + request.html drifted).
FILES = [
    "Final/assets/js/gopher-ai-engine.js",
    "Final/index.html",
    "Final/gopher-request.html",
    "Final/gopher-services.html",
    "Final/gopher-faqs.html",
    "Final/2-engine-js-block.html",
    "Final/gopher-iq-sandbox-standalone.html",
]
FAQ_FLOOR = 12   # must match the engine: score <= this = the engine already routes it
NEAR_BAND = 22   # floor < score <= this = PROBABLY the same intent the engine misses -> enrich candidate
NEW_MIN = 8      # a genuinely-novel cluster below this size is treated as noise, not a new entry
NOISE_MAX = 4    # any not-already-covered cluster this small is too low-volume to act on

APPROVED_FILE = "batch-enrich.approved.json"  # human-curated; the ONLY thing --apply will apply

# Mirrors the engine's own stop/low-info sets so harvested keywords are the
# genuinely distinctive words, not filler.
STOP = set("the a an to of do i my is it for in on can how what when where why am are be and or if".split())
LOWINFO = set(("you your offer offers get got need want make made have has does will would should could "
               "about with this that some any please help there here they them use using used").split())
DROP = STOP | LOWINFO | {"gopher", "gophers", "app", "request", "order"}


# ---- read the live FAQS store ------------------------------------------------
def load_faqs(path):
    src = open(path, encoding="utf-8").read()
    m = re.search(r'const FAQS = (\[.*?\]);', src, re.S)
    if not m:
        sys.exit("no FAQS array in " + path)
    literal = m.group(1)
    arr = json.loads(literal)
    assert json.dumps(arr, ensure_ascii=False) == literal, "FAQS round-trip drift in " + path
    return arr, src, m.start(1), m.end(1)


# ---- drive the REAL engine matcher via JXA -----------------------------------
def _extract(src, name):
    if name.startswith("fn:"):
        name = name[3:]
        i = src.index("function " + name + "(")
        k = src.index("{", i)
        depth = 0
        while k < len(src):
            if src[k] == "{":
                depth += 1
            elif src[k] == "}":
                depth -= 1
                if depth == 0:
                    return src[i:k + 1]
            k += 1
    else:
        i = src.index("const " + name)
        k = src.index("=", i)
        depth = 0
        while k < len(src):
            c = src[k]
            if c in "[{(":
                depth += 1
            elif c in "]})":
                depth -= 1
            elif c == ";" and depth == 0:
                return src[i:k + 1]
            k += 1
    raise ValueError(name)


def match_via_engine(engine_src, questions):
    """Return [{q, group, score} | None] — the engine's best FAQ for each question."""
    parts = [_extract(engine_src, "FAQS")]
    for c in ("STOP", "LOWINFO", "SYN", "DEAL_CUST", "DEAL_BIZ"):
        try:
            parts.append(_extract(engine_src, c))
        except ValueError:
            pass
    for f in ("stem", "wordIn", "expandQuery", "subseqScore", "dealAudience", "scoreRec"):
        parts.append(_extract(engine_src, "fn:" + f))
    # Return the raw top-1 by score, WITHOUT the floor filter, so the caller can
    # band near-misses (enrich) vs. genuinely-distant clusters (new entry).
    harness = "\n".join(parts) + """
function bestFaq(q){let b=null;for(const rec of FAQS){const s=scoreRec(q,rec);
 if(s!==null&&(b===null||s<b.score))b={q:rec.q,group:rec.group,score:s};}return b;}
const QS=%s;
JSON.stringify(QS.map(bestFaq));
""" % json.dumps(questions, ensure_ascii=False)

    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as fh:
        fh.write(harness)
        tmp = fh.name
    try:
        out = subprocess.run(["osascript", "-l", "JavaScript", tmp],
                             capture_output=True, text=True, timeout=120)
        if out.returncode != 0:
            raise RuntimeError(out.stderr.strip())
        return json.loads(out.stdout.strip())
    finally:
        os.unlink(tmp)


def match_fallback(arr, questions):
    """Conservative token-overlap matcher used only if osascript is unavailable."""
    def toks(s):
        return {w for w in re.findall(r"[a-z']+", s.lower()) if w not in DROP and len(w) > 2}
    idx = [(e, toks(e["q"] + " " + e.get("kw", ""))) for e in arr]
    res = []
    for q in questions:
        qt = toks(q)
        best, bestscore = None, 0.0
        for e, et in idx:
            if not qt or not et:
                continue
            j = len(qt & et) / len(qt | et)
            if j > bestscore:
                best, bestscore = e, j
        # Map overlap -> a pseudo-score on the engine's scale so the same bands apply.
        res.append({"q": best["q"], "group": best["group"], "score": round((1 - bestscore) * 30, 1)}
                   if best else None)
    return res


# ---- keyword harvesting ------------------------------------------------------
def harvest(cluster, matched_entry):
    """Distinctive words/phrases from the cluster not already covered by the entry."""
    covered = set(re.findall(r"[a-z']+", (matched_entry["q"] + " " + matched_entry.get("kw", "")).lower()))
    seen, out = set(), []
    for q in [cluster.get("representative_question", "")] + cluster.get("sample_questions", []):
        for w in re.findall(r"[a-z']+", q.lower()):
            if w in DROP or w in covered or w in seen or len(w) < 3:
                continue
            seen.add(w)
            out.append(w)
    for t in cluster.get("top_terms", []):
        w = t.lower()
        if w not in DROP and w not in covered and w not in seen and len(w) >= 3:
            seen.add(w)
            out.append(w)
    return out


def content_words(text):
    return [w for w in re.findall(r"[a-z']+", text.lower()) if w not in STOP and len(w) > 2]


# ---- merge kw (shared with the applier) --------------------------------------
def merge_kw(existing, extra_words):
    """Append words/phrases not already present. Phrase-safe: a multi-word entry
    like "did it go through" is deduped as a whole phrase, not word-by-word."""
    cur = existing.strip()
    seen_lower = " " + cur.lower() + " "
    added = []
    for phrase in extra_words:
        p = phrase.strip()
        if not p:
            continue
        if re.search(r"(?<!\w)" + re.escape(p.lower()) + r"(?!\w)", seen_lower):
            continue  # already present as a whole word/phrase
        added.append(p)
        seen_lower += p.lower() + " "
    if not added:
        return existing
    return (cur + " " + " ".join(added)).strip() if cur else " ".join(added)


# ---- apply enrichment across all copies --------------------------------------
def apply_enrichment(enrich):
    """enrich: list of {group, q, add:[words]}. Round-trip-safe, all 7 files."""
    applied = 0
    for rel in FILES:
        path = os.path.join(ROOT, rel)
        arr, src, s, e = load_faqs(path)
        changed = False
        for item in enrich:
            hits = [x for x in arr if (x["group"], x["q"]) == (item["group"], item["q"])]
            if len(hits) != 1:
                continue  # entry not present in this copy (e.g. request.html drift) — skip safely
            new_kw = merge_kw(hits[0]["kw"], item["add"])
            if new_kw != hits[0]["kw"]:
                hits[0]["kw"] = new_kw
                changed = True
        if changed:
            new_src = src[:s] + json.dumps(arr, ensure_ascii=False) + src[e:]
            open(path, "w", encoding="utf-8").write(new_src)
            applied += 1
    return applied


def main():
    args = sys.argv[1:]
    apply = "--apply" in args
    args = [a for a in args if a != "--apply"]
    min_size = 3
    limit = None
    src_path = "faq-clusters.json"
    i = 0
    while i < len(args):
        if args[i] == "--min-size":
            min_size = int(args[i + 1]); i += 2
        elif args[i] == "--limit":
            limit = int(args[i + 1]); i += 2
        else:
            src_path = args[i]; i += 1

    if not os.path.exists(src_path):
        sys.exit("No %s — run intercom_scrub.py first to produce it." % src_path)
    clusters = json.load(open(src_path, encoding="utf-8"))
    clusters = [c for c in clusters if c.get("size", 0) >= min_size]
    clusters.sort(key=lambda c: c.get("size", 0), reverse=True)
    if limit:
        clusters = clusters[:limit]

    arr, engine_src, _, _ = load_faqs(ENGINE)
    questions = [c.get("representative_question", "") for c in clusters]

    engine_used = True
    try:
        matches = match_via_engine(engine_src, questions)
    except Exception as ex:
        engine_used = False
        print("WARNING: engine matcher unavailable (%s) — using token fallback." % ex, file=sys.stderr)
        matches = match_fallback(arr, questions)

    by_q = {(e["group"], e["q"]): e for e in arr}
    covered, near, new_c, noise = [], [], [], []
    for c, m in zip(clusters, matches):
        rep = c.get("representative_question", "")
        size = c.get("size") or 0
        if not content_words(rep):
            noise.append({"size": size, "q": rep, "reason": "no content words"})
            continue
        score = m["score"] if m else 999
        if m and score <= FAQ_FLOOR:                 # engine already routes it
            entry = by_q.get((m["group"], m["q"]))
            covered.append({"size": size, "cluster_q": rep,
                            "matched": {"group": m["group"], "q": m["q"], "score": score},
                            "add": (harvest(c, entry) if entry else [])[:12]})
        elif size <= NOISE_MAX:                       # too small to act on, whatever the band
            noise.append({"size": size, "q": rep, "reason": "low volume (<=%d)" % NOISE_MAX})
        elif m and score <= NEAR_BAND:               # PROBABLY same intent -> enrich CANDIDATE (needs review)
            entry = by_q.get((m["group"], m["q"]))
            near.append({"size": size, "cluster_q": rep, "confirm": "is this the right entry?",
                         "matched": {"group": m["group"], "q": m["q"], "score": score},
                         "add": (harvest(c, entry) if entry else [])[:12]})
        elif size >= NEW_MIN:                         # genuinely novel + enough volume
            new_c.append({"size": size, "candidate_q": rep,
                          "nearest": m, "top_terms": c.get("top_terms", [])[:8],
                          "raw_support_answers": c.get("sample_answers", [])[:3],
                          "conversation_ids": c.get("conversation_ids", [])[:10]})
        else:                                         # novel but tiny -> noise
            noise.append({"size": size, "q": rep, "reason": "novel but below NEW_MIN=%d" % NEW_MIN})

    # NOTE: near-miss targets are best-by-score and often the WRONG entry (a payment
    # FAQ can outscore the order-status FAQ for "never showed up"). So these are
    # CANDIDATES ONLY. They are NOT written by --apply; a human curates the correct
    # ones into the approved file first.
    enrich = [{"group": x["matched"]["group"], "q": x["matched"]["q"],
               "add": x["add"], "from_cluster": x["cluster_q"], "score": x["matched"]["score"]}
              for x in (near + covered) if x["add"]]
    worklist = {
        "matcher": "engine(JXA)" if engine_used else "token-fallback",
        "counts": {"covered": len(covered), "near_miss": len(near),
                   "new_candidates": len(new_c), "noise": len(noise), "enrichable": len(enrich)},
        "enrich": enrich, "near_miss": near, "covered": covered,
        "new_candidates": new_c, "noise": noise,
    }
    json.dump(worklist, open("batch-worklist.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    lines = [
        "INTERCOM BATCH PROCESSING REPORT",
        "=" * 62,
        "matcher:              %s" % worklist["matcher"],
        "clusters (size>=%d):    %d" % (min_size, len(clusters)),
        "  already covered:      %d" % len(covered),
        "  near-miss -> enrich:  %d  (engine misses these; keywords fix it)" % len(near),
        "  new-entry candidates: %d  (need answer synthesis — review)" % len(new_c),
        "  noise/skipped:        %d" % len(noise),
        "  entries to enrich:    %d" % len(enrich),
        "",
        "NEW-ENTRY CANDIDATES (highest volume first) — draft answers, then add:",
        "-" * 62,
    ]
    for c in sorted(new_c, key=lambda x: x["size"] or 0, reverse=True)[:15]:
        near_q = (" (nearest: %s)" % c["nearest"]["q"][:34]) if c.get("nearest") else ""
        lines.append("  %4dx  %s%s" % (c["size"] or 0, c["candidate_q"][:52].replace("\n", " "), near_q))
    lines += ["", "NEAR-MISS ENRICHMENT CANDIDATES (CONFIRM the target — often wrong):", "-" * 62]
    for x in sorted(near, key=lambda x: x["size"] or 0, reverse=True):
        if x["add"]:
            lines.append("  %4dx [%s] %s   (score %.1f)"
                         % (x["size"] or 0, x["matched"]["group"], x["matched"]["q"][:40], x["matched"]["score"]))
            lines.append("        \"%s\"" % x["cluster_q"][:60].replace("\n", " "))
            lines.append("        + %s" % " ".join(x["add"]))
    report = "\n".join(lines)
    open("batch-report.txt", "w", encoding="utf-8").write(report + "\n")
    print(report)
    print("\nwrote batch-worklist.json + batch-report.txt")

    print("\nNext: review the near-miss candidates (the best-by-score target is often")
    print("wrong). Keep only the correct {group, q, add} rows and save them as")
    print("  %s   e.g.:" % APPROVED_FILE)
    print('  [ {"group":"Customers","q":"Where is my order?","add":["never showed","driver"]} ]')
    print("Then run with --apply to fold ONLY those into all 7 copies.")

    if apply:
        if not os.path.exists(APPROVED_FILE):
            sys.exit("\n--apply refused: no %s found. Curate the candidates into that "
                     "file first — --apply never trusts the raw best-by-score matches." % APPROVED_FILE)
        approved = json.load(open(APPROVED_FILE, encoding="utf-8"))
        if not isinstance(approved, list) or not all("group" in a and "q" in a and "add" in a for a in approved):
            sys.exit("%s must be a list of {group, q, add:[...]} objects." % APPROVED_FILE)
        n = apply_enrichment(approved)
        print("\n--apply: applied %d approved enrichments across %d files. "
              "Re-verify with the JXA matcher, then commit." % (len(approved), n))


if __name__ == "__main__":
    main()
