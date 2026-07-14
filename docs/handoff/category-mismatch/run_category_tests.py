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
]


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


def main():
    a = run(open(CLASSIFIER, encoding="utf-8").read(), "A: shared classifier file")
    eng = open(ENGINE, encoding="utf-8").read()
    deps = [_const(eng, "CATEGORIES"), _const(eng, "CAT_STOP"), _const(eng, "STEM_KEEP"),
            "var CAT_THRESH=4;"]
    for f in ("catNorm", "catWords", "stem", "stemSet", "scoreCategories"):
        deps.append(_fn(eng, f))
    b = run("\n".join(deps), "B: inlined-engine globals")
    total_ok, total = a[0] + b[0], a[1] + b[1]
    print("\n%d/%d passed" % (total_ok, total))
    sys.exit(0 if total_ok == total else 1)


if __name__ == "__main__":
    main()
