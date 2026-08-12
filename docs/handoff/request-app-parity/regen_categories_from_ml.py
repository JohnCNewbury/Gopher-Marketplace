#!/usr/bin/env python3
"""Regenerate the iQ CATEGORIES classifier data from the ML category files.

    python3 regen_categories_from_ml.py            # dry-run report
    python3 regen_categories_from_ml.py --apply    # splice into engine + copies

Source of truth: Documentation/Dashboard/Gopher iQ Keywords/Category Info For AI/
  <slug>_ml_category_expanded.json   (preferred, owner-expanded)
  <slug>_ml_category.json            (fallback: category left UNTOUCHED — the
                                      current engine entry already encodes it
                                      plus hand tuning)

Only categories WITH an *_expanded.json are regenerated; all others keep their
current engine data verbatim. Hand-curated `hints` are always PRESERVED and
merged (they carry deliberate scoring weight — professions/verbs at 4x).

Field mapping (mirrors how the original entries were built):
  phrases <- examples + intent_phrases + multi-word misspellings   [pruned]
  tokens  <- related_words + object_terms + single-word misspellings
  hints   <- existing hand-curated hints (preserved, deduped)
  pwords  <- unique single words of examples/intent_phrases (soft overlap)

Pruning (page-weight: the engine is inlined on 7 pages — 6,400 raw examples
would add ~2 MB site-wide):
  1. normalize (lowercase, collapse whitespace, strip edge punctuation)
  2. collapse near-duplicates: one phrase per stemmed-token-set signature
     (keep the shortest — engine phrase matching is substring-bidirectional,
     so the shortest phrasing covers its longer variants)
  3. drop phrases containing another kept phrase as a substring (redundant:
     the contained phrase already matches those queries)
  4. length bounds 4..48 chars

Applies to: Final/assets/js/gopher-ai-engine.js + the 6 pages inlining it +
regenerates Final/assets/js/gopher-category-classifier.js. Run the parity
harness + category tests afterwards; the matrix guardrails are the acceptance
gate for any data refresh.
"""
import json, os, re, sys, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATA = "/Users/johnnewbury/Desktop/All New Gopher/Documentation/Dashboard/Gopher iQ Keywords/Category Info For AI"
ENGINE = os.path.join(ROOT, "Final/assets/js/gopher-ai-engine.js")
CLASSIFIER = os.path.join(ROOT, "Final/assets/js/gopher-category-classifier.js")
INLINE_PAGES = ["Final/index.html", "Final/gopher-request.html", "Final/gopher-services.html",
                "Final/gopher-faqs.html", "Final/2-engine-js-block.html",
                "Final/gopher-iq-sandbox-standalone.html"]

CAT_STOP = set("a an the to of for i need my me you we is it do does can someone help with this and or in on at".split())
STEM_KEEP = {'ride','rides','riding','side','tide','wide','dome','time','line','worker','workers'}


def stem(w):
    if len(w) <= 3 or w in STEM_KEEP: return w
    if w.endswith('s') and not w.endswith('ss') and len(w) > 4: w = w[:-1]
    if w.endswith('ing') and len(w) > 5: w = w[:-3]
    elif w.endswith('er') and len(w) > 4: w = w[:-2]
    elif w.endswith('ed') and len(w) > 4: w = w[:-2]
    if w.endswith('e') and len(w) > 3: w = w[:-1]
    return w


def norm(s):
    s = re.sub(r"\s+", " ", str(s).strip().lower())
    return s.strip(" .,!?;:")


def sig(phrase):
    return frozenset(stem(w) for w in re.findall(r"[a-z0-9']+", phrase) if w not in CAT_STOP)


PHRASE_CAP = 800   # page-weight bound: the engine is inlined on 7 pages

def build_phrases(priority_raw, raw):
    """priority_raw (intent_phrases — 'how people ask') is kept preferentially;
    raw (examples) fills the remainder. Three prunes: signature dedupe,
    substring cover, then SIG-SUBSET cover (a phrase whose stemmed-token set is
    a superset of a kept one adds little — the token layer scores those words
    anyway), finally a shortest-first cap."""
    def stage(items):
        seen = {}
        for p in items:
            p = norm(p)
            if not (4 <= len(p) <= 40): continue
            s = sig(p)
            if not s: continue
            if s not in seen or len(p) < len(seen[s]): seen[s] = (p if s not in seen else min(seen[s], p, key=len))
        return sorted(set(seen.values()), key=len)
    ordered = stage(priority_raw) + [p for p in stage(raw) if True]
    kept, kept_sigs = [], []
    for p in ordered:
        if any(k in p for k in kept): continue                      # substring cover
        s = sig(p)
        if any(ks <= s for ks in kept_sigs): continue               # sig-subset cover
        kept.append(p); kept_sigs.append(s)
        if len(kept) >= PHRASE_CAP: break
    return sorted(set(kept))


def phrases_of(items):
    """Schema v1 examples are strings; v2 (production_intent_library) are records
    {phrase, confidence, redirect_to, should_match,...}. Skip anything marked as
    belonging elsewhere."""
    out = []
    for e in items:
        if isinstance(e, dict):
            if e.get("redirect_to") or e.get("should_match") is False: continue
            p = e.get("phrase", "")
        else:
            p = e
        if p: out.append(p)
    return out


def build_entry(exp, cur):
    """MERGE semantics: expanded data can only ADD. Current phrases/pwords are
    unioned in (then pruned together); tokens fall back to the current set when
    the source arrays are absent (some owner exports are examples-only — a
    partial file must never wipe an existing vocabulary layer)."""
    misspell = [norm(m) for m in exp.get("common_misspellings", [])]
    phrases = build_phrases(phrases_of(exp.get("intent_phrases", [])) + [m for m in misspell if " " in m]
                            + cur.get("phrases", []),
                            phrases_of(exp.get("examples", [])))
    toks = set(norm(t) for t in cur.get("tokens", []))
    for t in exp.get("related_words", []) + exp.get("object_terms", []) + [m for m in misspell if " " not in m]:
        t = norm(t)
        if t and t not in CAT_STOP: toks.add(t)
    pw = set(norm(w) for w in cur.get("pwords", []))
    for p in phrases_of(exp.get("examples", [])) + phrases_of(exp.get("intent_phrases", [])):
        for w in re.findall(r"[a-z0-9']+", norm(p)):
            if w not in CAT_STOP and len(w) > 2: pw.add(w)
    return {"id": cur["id"], "slug": cur["slug"], "label": cur["label"], "blurb": cur["blurb"],
            "phrases": phrases, "tokens": sorted(t for t in toks if t),
            "hints": sorted(set(norm(h) for h in cur["hints"])),      # hand-curated: preserved
            "pwords": sorted(w for w in pw if w)}


def main():
    apply = "--apply" in sys.argv
    src = open(ENGINE, encoding="utf-8").read()
    m = re.search(r'const CATEGORIES = (\[.*?\]);', src, re.S)
    cats = json.loads(m.group(1))
    assert json.dumps(cats, ensure_ascii=False) == m.group(1), "engine CATEGORIES round-trip drift"

    expanded = {}
    for pat in ("*_ml_category_expanded.json", "*_production_intent_library.json"):
        for f in glob.glob(os.path.join(DATA, pat)):
            d = json.load(open(f, encoding="utf-8"))
            expanded[d["category_slug"]] = d
    print("expanded datasets found: %s" % (", ".join(sorted(expanded)) or "none"))

    out = []
    for c in cats:
        if c["slug"] in expanded:
            e = build_entry(expanded[c["slug"]], c)
            print("  %-28s phrases %d->%d  tokens %d->%d  hints %d (kept)  pwords %d->%d"
                  % (c["slug"], len(c["phrases"]), len(e["phrases"]), len(c["tokens"]), len(e["tokens"]),
                     len(e["hints"]), len(c["pwords"]), len(e["pwords"])))
            out.append(e)
        else:
            out.append(c)
    new_literal = json.dumps(out, ensure_ascii=False)
    print("CATEGORIES literal size: %dKB -> %dKB" % (len(m.group(1)) // 1024, len(new_literal) // 1024))
    if not apply:
        print("(dry run — pass --apply to splice)"); return

    # 1. engine file
    files_done = []
    def splice(path):
        s = open(path, encoding="utf-8").read()
        mm = re.search(r'const CATEGORIES = (\[.*?\]);', s, re.S)
        if not mm:
            print("  !! no CATEGORIES literal in %s — skipped" % path); return
        old = json.loads(mm.group(1))          # parse check
        s = s[:mm.start(1)] + new_literal + s[mm.end(1):]
        open(path, "w", encoding="utf-8").write(s)
        files_done.append(path)
    splice(ENGINE)
    for rel in INLINE_PAGES:
        splice(os.path.join(ROOT, rel))

    # 2. regenerate the extracted classifier (same extraction as its original build)
    eng = open(ENGINE, encoding="utf-8").read()
    def efn(name):
        i = eng.index("function " + name + "("); k = eng.index("{", i); d = 0
        while k < len(eng):
            if eng[k] == "{": d += 1
            elif eng[k] == "}":
                d -= 1
                if d == 0: return eng[i:k + 1]
            k += 1
    def econst(name):
        i = eng.index("const " + name); k = eng.index("=", i); d = 0
        while k < len(eng):
            ch = eng[k]
            if ch in "[{(": d += 1
            elif ch in "]})": d -= 1
            elif ch == ";" and d == 0: return eng[i:k + 1]
            k += 1
    parts = [econst("CATEGORIES"), econst("CAT_STOP"), econst("STEM_KEEP")]
    for fn in ("catNorm", "catWords", "stem", "stemSet", "scoreCategories"):
        parts.append(efn(fn))
    header = ("// gopher-category-classifier.js — the iQ service-category intent classifier,\n"
              "// extracted from gopher-ai-engine.js so pages WITHOUT the full engine (e.g.\n"
              "// gopher-connect.html) can reuse scoreCategories(). GENERATED — regenerate via\n"
              "// docs/handoff/request-app-parity/regen_categories_from_ml.py; do not hand-edit.\n"
              "(function(){\n")
    footer = ("\n  var CAT_THRESH=4, CAT_HIGH=8;\n"
              "  window.GopherCategoryClassifier = { scoreCategories: scoreCategories, catWords: catWords,\n"
              "    CATEGORIES: CATEGORIES, CAT_THRESH: CAT_THRESH, CAT_HIGH: CAT_HIGH };\n"
              "})();\n")
    open(CLASSIFIER, "w", encoding="utf-8").write(header + "\n".join(parts) + footer)
    files_done.append(CLASSIFIER)
    print("spliced %d files:" % len(files_done))
    for f in files_done: print("  " + os.path.relpath(f, ROOT))
    print("NOW RUN: the parity harness + run_category_tests.py + FAQS guard.")


if __name__ == "__main__":
    main()
