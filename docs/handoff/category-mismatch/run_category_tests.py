#!/usr/bin/env python3
"""Unit tests for detectCategoryMismatch (Step 5 matrix).

No Node/test-runner in this static prototype, so we drive the REAL shipped code
via JavaScriptCore (osascript -l JavaScript): extract the iQ classifier from the
engine + the initCategoryMismatch IIFE from gopher-request.html, then run the
matrix. Tests the actual page code, not a copy.

    python3 run_category_tests.py           # exit 0 if all pass, 1 otherwise

The matrix encodes the false-positive guardrails: genuinely dual-category jobs
("moving labor", "haul away branches", "couch to the dump") must NOT fire.
"""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ENGINE = os.path.join(ROOT, "Final/assets/js/gopher-ai-engine.js")
PAGE = os.path.join(ROOT, "Final/gopher-request.html")

# (selectedSlug, description, expectedSuggestedSlug or None)
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


def _iife(src, marker):
    i = src.index(marker); k = src.index("{", i); d = 0
    while k < len(src):
        if src[k] == "{": d += 1
        elif src[k] == "}":
            d -= 1
            if d == 0:
                return src[i:src.index(";", k) + 1]
        k += 1


def main():
    eng = open(ENGINE, encoding="utf-8").read()
    page = open(PAGE, encoding="utf-8").read()
    deps = [_const(eng, "CATEGORIES"), _const(eng, "CAT_STOP"), _const(eng, "STEM_KEEP")]
    for f in ("catNorm", "catWords", "stem", "stemSet", "scoreCategories"):
        deps.append(_fn(eng, f))
    iife = _iife(page, "(function initCategoryMismatch(")
    harness = ("\n".join(deps) + "\nvar CAT_THRESH=4, CAT_HIGH=8;\nvar window={};\n" + iife +
               "\nvar T=" + json.dumps(MATRIX) + ";\nvar d=window.__detectCategoryMismatch;\n"
               "JSON.stringify(T.map(function(t){var r=d(t[0],t[1]);var g=r?r.suggestedSlug:null;"
               "return {sel:t[0],desc:t[1],exp:t[2],got:g,pass:(t[2]===null)?(r===null):(!!r&&g===t[2])};}));")
    tmp = "/tmp/_cat_test_harness.js"
    open(tmp, "w").write(harness)
    out = subprocess.run(["osascript", "-l", "JavaScript", tmp], capture_output=True, text=True)
    os.unlink(tmp)
    if out.returncode != 0:
        sys.exit("JXA error: " + (out.stderr.strip() or out.stdout.strip()))
    rows = json.loads(out.stdout.strip())
    passed = 0
    for r in rows:
        mark = "PASS" if r["pass"] else "FAIL"
        print("  [%s] %-16s %-42s exp=%-26s got=%s" %
              (mark, r["sel"], (r["desc"] or "(empty)")[:42], r["exp"] or "null", r["got"] or "null"))
        passed += 1 if r["pass"] else 0
    print("\n%d/%d passed" % (passed, len(rows)))
    sys.exit(0 if passed == len(rows) else 1)


if __name__ == "__main__":
    main()
