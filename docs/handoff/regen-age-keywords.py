#!/usr/bin/env python3
"""Regenerate the age-restricted keyword brain from the canonical Gopher iQ xlsx.

Source of truth (owner-maintained):
  Documentation/Dashboard/Gopher iQ Keywords/Age-Restricted Key Words/
    Age_Restricted_Tobacco_Keywords.xlsx        (sheet "Keywords", col "Keyword")
    Age_Restricted_Alcohol_Keywords.xlsx        (sheet "Keywords", col "Keyword" = idx 3)
    Popular_Beer_Wine_Liquor_Keywords.xlsx      (sheet "Alcohol Keywords", col "Keyword" = idx 1)

Output (do NOT hand-edit):
  Final/assets/js/gopher-age-keywords.js   ->  window.GopherAgeKeywords = [...]

Consumed by findAgeRestrictedKeyword() in:
  Final/gopher-request.html, Final/gopher-connect.html,
  _prototypes/Request/gopher-request-flow.html

Run:  python3 docs/handoff/regen-age-keywords.py
Requires: openpyxl.  When the owner adds brands to the xlsx, re-run this.
"""
import openpyxl, json, os

HERE = os.path.dirname(os.path.abspath(__file__))              # .../Code/docs/handoff
REPO = os.path.dirname(os.path.dirname(HERE))                  # .../Code
# Dashboard lives two levels above the Code repo: .../Documentation/Dashboard
SRC  = os.path.join(REPO, "..", "..", "Dashboard", "Gopher iQ Keywords", "Age-Restricted Key Words")
OUT  = os.path.join(REPO, "Final", "assets", "js", "gopher-age-keywords.js")

def norm(s): return " ".join(str(s).strip().lower().split())

# The alcohol xlsx tags each row with a Keyword_Type. Its own Summary sheet says:
# "Flag High confidence matches automatically; queue Medium confidence slang/generic
# matches for review." The "Slang or generic keyword" rows are everyday words
# (bottle, can, shot, pint, cold one, ...) that would false-positive on ordinary
# grocery orders, so we EXCLUDE them from the auto-flag brain per that guidance.
ALCOHOL_EXCLUDE_TYPES = {"slang or generic keyword"}

# Everyday-word collisions that survive in the brand-only lists (tobacco/beer files
# have no type column). "carton of cigarettes" stays; bare "carton" (of eggs/milk) goes.
GENERIC_STOPLIST = {
    "bottle", "bottles", "can", "cans", "carton", "cartons", "pack", "packs",
    "case", "cases", "box", "boxes", "shot", "shots", "pint", "pints",
    "glass", "glasses", "cold one", "cold ones",
}

def collect(fname, sheet, col, acc, type_col=None):
    wb = openpyxl.load_workbook(os.path.join(SRC, fname), read_only=True, data_only=True)
    ws = wb[sheet]
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:  # header
            continue
        if not (row and len(row) > col and row[col] is not None):
            continue
        if type_col is not None and len(row) > type_col and row[type_col] is not None:
            if norm(row[type_col]) in ALCOHOL_EXCLUDE_TYPES:
                continue
        s = norm(row[col])
        if s and len(s) >= 2:
            acc.add(s)
    wb.close()

def main():
    kws = set()
    collect("Age_Restricted_Tobacco_Keywords.xlsx",   "Keywords",         0, kws)
    collect("Age_Restricted_Alcohol_Keywords.xlsx",   "Keywords",         3, kws, type_col=4)
    collect("Popular_Beer_Wine_Liquor_Keywords.xlsx", "Alcohol Keywords", 1, kws)
    kws -= GENERIC_STOPLIST
    arr = sorted(kws)
    hdr = ("/* AUTO-GENERATED — Gopher iQ age-restricted keyword brain.\n"
           "   Source of truth: Documentation/Dashboard/Gopher iQ Keywords/Age-Restricted Key Words/\n"
           "     Age_Restricted_Tobacco_Keywords.xlsx (col Keyword)\n"
           "     Age_Restricted_Alcohol_Keywords.xlsx (col Keyword)\n"
           "     Popular_Beer_Wine_Liquor_Keywords.xlsx (col Keyword)\n"
           "   %d unique keywords. Do NOT hand-edit — regenerate: python3 docs/handoff/regen-age-keywords.py\n"
           "   Consumed by findAgeRestrictedKeyword() in the Request flow + Final apps. */\n" % len(arr))
    js = hdr + "window.GopherAgeKeywords=" + json.dumps(arr, ensure_ascii=False, separators=(",", ":")) + ";\n"
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)
    print("wrote %s | %d keywords | %d bytes" % (OUT, len(arr), len(js)))

if __name__ == "__main__":
    main()
