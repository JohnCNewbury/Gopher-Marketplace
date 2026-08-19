#!/usr/bin/env python3
"""Unit tests for detectCategoryMismatch (the category-mismatch matrix).

The decision logic lives in the SHARED module assets/js/gopher-request-logic.js
(one source of truth across Request web / Connect / the Request App prototype —
the surfaces only wire UI around it; see run_parity_harness.py in
docs/handoff/request-app-parity/ for the per-surface delegation checks).

This runs the matrix against the real module via JavaScriptCore
(osascript -l JavaScript), on BOTH classifier dependency paths:
  A. window.GopherCategoryClassifier (connect / prototype)
  B. inlined-engine globals (Final/gopher-request.html)

    python3 run_category_tests.py           # exit 0 if all pass, 1 otherwise

The matrix encodes the false-positive guardrails: genuinely dual-category jobs
("moving labor", "haul away branches", "couch to the dump") must NOT fire.
"""
import json, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
LOGIC = os.path.join(ROOT, "Final/assets/js/gopher-request-logic.js")
CLASSIFIER = os.path.join(ROOT, "Final/assets/js/gopher-category-classifier.js")
ENGINE = os.path.join(ROOT, "Final/assets/js/gopher-ai-engine.js")

MATRIX = [
    # Owner repro 2026-07-25 — filed under Home/Office Services, clearly moving/labor work
    ("home_services", "I need someone to help me offload a container truck.", "moving"),
    ("moving", "I need to remove unwanted items", "junk_removal"),
    ("delivery", "need a ride to the airport", "ride_sharing"),
    ("other", "need my lawn mowed", "yard_work_outdoor_projects"),
    ("junk_removal", "can someone drive me to a doctor appointment", "ride_sharing"),
    ("moving", "move a couch to the dump", None),
    ("junk_removal", "haul away branches and yard debris", None),
    ("home_services", "mount my TV", None),
    ("moving", "need help loading a u-haul", None),
    ("hourly_day_labor", "need moving labor for a few hours", None),
    ("yard_work_outdoor_projects", "", None),
    ("junk_removal", "I need an electrician.", "home_services"),
    ("junk_removal", "need a plumber", "home_services"),
    ("other", "I need an electrician", "home_services"),
    ("junk_removal", "paint my bedroom", "home_services"),
    ("junk_removal", "furniture", None),
    ("delivery", "furniture", None),
    ("moving", "dolly rental", None),
    ("ride_sharing", "boxes", None),
    ("junk_removal", "help", None),
    # Owner repro 2026-08-12 — "<trade> work" must be owned by the trade noun, not
    # by the bare word "work". Before the fix these routed to Hourly / Day Labor
    # because work/worker/workers stem-folded onto that category's hint vocabulary.
    ("junk_removal", "Can you help me with electrical work", "home_services"),
    ("junk_removal", "carpentry work", "home_services"),
    ("junk_removal", "electric work", "home_services"),
    # Guards on the SAME token: "work" is topical in these, not grammatical, so
    # stopping it outright would regress them (cf. "cash out", 2026-07-21).
    ("home_services", "seasonal yard work", "yard_work_outdoor_projects"),
    ("home_services", "need a laborer for a few hours", "hourly_day_labor"),
    ("home_services", "need 2 workers for tomorrow", "hourly_day_labor"),
    ("junk_removal", "commute to work", "ride_sharing"),
    ("home_services", "day labor", "hourly_day_labor"),

    # ---- Owner repro 2026-08-19, BOTH surfaces (Request web + Request app) ----
    # Filed under Junk Removal, described as a move; no nudge fired. "Weak selected"
    # was an ABSOLUTE floor only, and ONE dual-use object noun clears it: 'couch' is
    # a legitimate junk token (2.5) + pword (1), plus filler 'looking' (1) = 4.5,
    # over CAT_THRESH=4 by 0.5 — while Moving scored 16 (3.6x dominance). Fixed by
    # making the weakness test relative as well (DOMINANCE_RATIO).
    ("junk_removal", "Looking to have a couch moved to 3rd floor", "moving"),
    ("junk_removal", "looking to move a couch", "moving"),
    ("junk_removal", "need a couch moved upstairs", "moving"),
    ("junk_removal", "help moving a mattress to my new apartment", "moving"),
    # Guards on that SAME clause — genuinely dual-category junk/moving jobs. These
    # are the rows that forbid lowering DOMINANCE_RATIO toward the ~1.6 band.
    ("junk_removal", "haul away my old couch", None),                 # ratio 1.00
    ("junk_removal", "get rid of an old couch and mattress", None),   # ratio 1.60
    ("junk_removal", "couch removal", None),                          # ratio 1.00
    ("junk_removal", "take my old furniture to the landfill", None),  # ratio 1.36
    ("junk_removal", "clean out the garage and dispose of debris", None),
    ("moving", "help me move apartments this weekend", None),
    ("delivery", "pick up a package and drop it at my office", None),
    ("yard_work_outdoor_projects", "mow my lawn and trim hedges", None),
    ("ride_sharing", "ride to the airport tomorrow", None),
]

# Direct classifier assertions: the mismatch matrix above only sees the DECISION,
# so a scoring regression that stays on the right side of the thresholds would
# pass it silently. These pin the ranking itself.
#   (query, expected top slug, slugs that must NOT be top)
SCORE_MATRIX = [
    ("Can you help me with electrical work", "home_services", ["hourly_day_labor", "ride_sharing"]),
    ("electrical work",   "home_services", ["hourly_day_labor"]),
    ("plumbing work",     "home_services", ["hourly_day_labor"]),
    ("carpentry work",    "home_services", ["hourly_day_labor"]),
    ("hvac work",         "home_services", ["hourly_day_labor"]),
    ("painting work",     "home_services", ["hourly_day_labor"]),
    ("handyman work",     "home_services", ["hourly_day_labor"]),
    ("landscaping work",  "yard_work_outdoor_projects", ["hourly_day_labor"]),
    ("yard work",         "yard_work_outdoor_projects", ["hourly_day_labor"]),
    ("day labor",         "hourly_day_labor", []),
    ("need a laborer for a few hours", "hourly_day_labor", []),
    ("need 2 workers for tomorrow",    "hourly_day_labor", []),
    ("workers needed",                 "hourly_day_labor", []),
    ("commute to work",   "ride_sharing", ["hourly_day_labor"]),
    ("need a ride to work", "ride_sharing", ["hourly_day_labor"]),
]

# The bare word "work" carries no service intent on its own. Before the fix it
# scored hourly_day_labor 7.5 and ride_sharing 3.5 — enough for "work" alone to
# out-vote the actual subject noun of the sentence.
BARE_WORK_CEILING = 2.0


def _fn(src, name):
    i = src.index("function " + name + "("); k = src.index("{", i); d = 0
    while k < len(src):
        if src[k] == "{": d += 1
        elif src[k] == "}":
            d -= 1
            if d == 0: return src[i:k + 1]
        k += 1


def _const(src, name):
    i = src.index("const " + name); k = src.index("=", i); d = 0
    while k < len(src):
        c = src[k]
        if c in "[{(": d += 1
        elif c in "]})": d -= 1
        elif c == ";" and d == 0: return src[i:k + 1]
        k += 1


def run(deps, label):
    mod = open(LOGIC, encoding="utf-8").read()
    harness = ("var window={};\n" + deps + "\n" + mod +
               "\nvar T=" + json.dumps(MATRIX) +
               ";var d=window.GopherRequestLogic.detectCategoryMismatch;\n"
               "JSON.stringify(T.map(function(t){var r=d(t[0],t[1]);var g=r?r.suggestedSlug:null;"
               "return {sel:t[0],desc:t[1],exp:t[2],got:g,pass:(t[2]===null)?(r===null):(!!r&&g===t[2])};}));")
    tmp = "/tmp/_cat_test_harness.js"
    open(tmp, "w").write(harness)
    out = subprocess.run(["osascript", "-l", "JavaScript", tmp], capture_output=True, text=True)
    os.unlink(tmp)
    if out.returncode != 0:
        sys.exit("JXA error (%s): %s" % (label, out.stderr.strip() or out.stdout.strip()))
    rows = json.loads(out.stdout.strip())
    passed = 0
    print("-- path %s --" % label)
    for r in rows:
        print("  [%s] %-16s %-42s exp=%-26s got=%s" %
              ("PASS" if r["pass"] else "FAIL", r["sel"], (r["desc"] or "(empty)")[:42],
               r["exp"] or "null", r["got"] or "null"))
        passed += 1 if r["pass"] else 0
    return passed, len(rows)


def run_scores(deps, label):
    """Path D — assert the RANKING, not just the mismatch decision."""
    harness = ("var window={};\n" + deps +
               "\nvar T=" + json.dumps(SCORE_MATRIX) + ";" +
               "var res=T.map(function(t){var s=scoreCategories(t[0]);"
               "var top=s[0]||{slug:null,score:0};var bad=[];"
               "t[2].forEach(function(b){if(top.slug===b)bad.push(b);});"
               "return {q:t[0],exp:t[1],got:top.slug,score:top.score,bad:bad,"
               "pass:(top.slug===t[1]&&bad.length===0)};});"
               "var w=scoreCategories('work');"
               "res.push({q:'work (bare)',exp:'<= " + str(BARE_WORK_CEILING) + "',"
               "got:(w[0]?w[0].slug:'none'),score:(w[0]?w[0].score:0),bad:[],"
               "pass:(!w[0]||w[0].score<=" + str(BARE_WORK_CEILING) + ")});"
               "JSON.stringify(res);")
    tmp = "/tmp/_cat_score_harness.js"
    open(tmp, "w").write(harness)
    out = subprocess.run(["osascript", "-l", "JavaScript", tmp], capture_output=True, text=True)
    os.unlink(tmp)
    if out.returncode != 0:
        sys.exit("JXA error (%s): %s" % (label, out.stderr.strip() or out.stdout.strip()))
    rows = json.loads(out.stdout.strip())
    passed = 0
    print("-- path %s --" % label)
    for r in rows:
        print("  [%s] %-38s exp=%-28s got=%s (%.1f)%s" %
              ("PASS" if r["pass"] else "FAIL", r["q"][:38], r["exp"], r["got"], r["score"],
               "  << must not win: " + ",".join(r["bad"]) if r["bad"] else ""))
        passed += 1 if r["pass"] else 0
    return passed, len(rows)


def check_page_wiring():
    """Path C — the surfaces must actually PROVIDE a classifier at runtime.

    Found broken 2026-07-25 (owner repro): gopher-request.html inlines the
    engine INSIDE AN IIFE, so scoreCategories/catWords are NOT globals there —
    the resolver's global-lexical fallback found nothing, detection fail-safed
    to null, and the nudge silently never fired on the page while paths A/B
    (which test the standalone files) stayed green. The page must export
    window.GopherCategoryClassifier from inside that IIFE; Connect and the
    prototype flow must load gopher-category-classifier.js via <script src>.
    """
    checks = [
        (os.path.join(ROOT, "Final/gopher-request.html"),
         "window.GopherCategoryClassifier = { scoreCategories",
         "inline-engine IIFE no longer exports window.GopherCategoryClassifier"),
        (os.path.join(ROOT, "Final/gopher-connect.html"),
         "gopher-category-classifier.js",
         "no longer loads gopher-category-classifier.js"),
        (os.path.join(ROOT, "_prototypes/Request/gopher-request-flow.html"),
         "gopher-category-classifier.js",
         "no longer loads gopher-category-classifier.js"),
    ]
    ok = True
    print("-- path C: per-surface classifier wiring --")
    for path, needle, why in checks:
        if not os.path.exists(path):
            print("  [SKIP] %s (file not present)" % os.path.basename(path))
            continue
        good = needle in open(path, encoding="utf-8").read()
        print("  [%s] %s" % ("PASS" if good else "FAIL", os.path.basename(path)))
        if not good:
            print("         %s — the category-mismatch nudge will silently no-op there." % why)
            ok = False
    return ok


def main():
    a = run(open(CLASSIFIER, encoding="utf-8").read(), "A: shared classifier file")
    eng = open(ENGINE, encoding="utf-8").read()
    deps = [_const(eng, "CATEGORIES"), _const(eng, "CAT_STOP"), _const(eng, "STEM_KEEP"),
            "var CAT_THRESH=4;"]
    for f in ("catNorm", "catWords", "stem", "stemSet", "scoreCategories"):
        deps.append(_fn(eng, f))
    b = run("\n".join(deps), "B: inlined-engine globals")
    cls = open(CLASSIFIER, encoding="utf-8").read()
    # strip the classifier's IIFE wrapper so scoreCategories is directly callable
    cls_body = cls[cls.index("(function(){") + len("(function(){"):cls.rindex("})();")]
    d = run_scores(cls_body, "D: classifier ranking")
    wiring_ok = check_page_wiring()
    total_ok, total = a[0] + b[0] + d[0], a[1] + b[1] + d[1]
    print("\n%d/%d passed%s" % (total_ok, total, "" if wiring_ok else " — WIRING FAILURES above"))
    sys.exit(0 if (total_ok == total and wiring_ok) else 1)


if __name__ == "__main__":
    main()
