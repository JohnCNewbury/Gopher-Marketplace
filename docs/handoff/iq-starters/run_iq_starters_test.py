#!/usr/bin/env python3
"""
run_iq_starters_test.py — every Ask Gopher iQ starter chip must hit its own KB.

WHY THIS EXISTS
    The dashboard assistants match with plain substring containment
    (`text.indexOf(keyword) > -1`). That is fragile in one specific, invisible
    way: a keyword is not a stem. 'feature' does NOT match "featuring"
    (featur-ING vs featur-E), so on 2026-08-17 the Deals portal shipped a
    starter chip reading "Feature my business" whose own question —
    "How does featuring my business work?" — fell through to
    "I'm not sure I have a good answer for that one yet."

    A miss on a typed question is fine; that is what the honest fallback is
    for. A miss on a chip WE wrote, on the first tap, reads as broken. Those
    are different failures and only the second one is a bug.

WHAT IT ASSERTS
    For every dashboard carrying an Ask Gopher iQ modal, each
    `.ai-suggestion[data-q]` resolves to a KB entry rather than the fallback.

    It deliberately does NOT assert WHICH entry. Asserting the exact answer
    would freeze the KB against harmless additions; asserting "not the
    fallback" catches the whole defect class and nothing else.

HOW TO PROVE IT WORKS
    Revert the 'featur' keyword in gopher-deals.html back to 'feature' and
    re-run — it must FAIL on that one chip. A green test that cannot fail
    proves nothing (standing rule, see the 2026-08-12 iQ harnesses).

USAGE
    python3 docs/handoff/iq-starters/run_iq_starters_test.py
    exit 0 = all starters resolve
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3] / "Final"

# file -> the KB variable declared inside it
SURFACES = [
    ("gopher-go.html", "GO_IQ_KB"),
    ("gopher-deals.html", "DEALS_IQ_KB"),
    # Connect and Request use `const ASK_GOPHER_KB` and were built earlier;
    # added here when Website Updates brings them onto the shared component.
]

ENTITIES = {"&amp;": "&", "&hellip;": "…", "&mdash;": "—",
            "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">"}


def unescape(s):
    for k, v in ENTITIES.items():
        s = s.replace(k, v)
    return s


def kb_keywords(src, var_name):
    """Return a list of keyword-lists, one per KB entry.

    Parsed from the `match:[...]` literals rather than by evaluating the array,
    because the answers contain quotes, apostrophes and HTML that no naive
    JSON coercion survives — and the answers are not what we are testing.
    """
    i = src.find("var %s = [" % var_name)
    if i < 0:
        raise SystemExit("KB %s not found" % var_name)
    # bound the search to this array literal
    start = src.index("[", i)
    depth, end = 0, start
    for k in range(start, len(src)):
        if src[k] == "[":
            depth += 1
        elif src[k] == "]":
            depth -= 1
            if depth == 0:
                end = k + 1
                break
    body = src[start:end]
    out = []
    for m in re.finditer(r"match:\s*\[([^\]]*)\]", body):
        out.append([w.strip().strip("'\"").lower()
                    for w in m.group(1).split(",") if w.strip()])
    return out


def starters(src):
    return [unescape(m.group(1))
            for m in re.finditer(r'class="ai-suggestion" data-q="([^"]*)"', src)]


def lookup_hits(question, kb):
    """Mirror of the page's own matcher: most keyword hits wins, 0 hits = miss."""
    text = question.lower()
    return max((sum(1 for k in entry if k in text) for entry in kb), default=0)


def main():
    failures = 0
    for filename, var_name in SURFACES:
        path = ROOT / filename
        if not path.exists():
            print("  SKIP %s (not found)" % filename)
            continue
        src = path.read_text(encoding="utf-8")
        if "ai-suggestion" not in src:
            print("  SKIP %s (no Ask Gopher iQ modal yet)" % filename)
            continue
        kb = kb_keywords(src, var_name)
        chips = starters(src)
        print("\n=== %s — %d KB entries, %d starters ===" % (filename, len(kb), len(chips)))
        if not chips:
            print("  FAIL no starter chips found (markup changed?)")
            failures += 1
            continue
        for q in chips:
            hits = lookup_hits(q, kb)
            print(("  ok    " if hits else "  FAIL  ") + q)
            if not hits:
                failures += 1

    print("\n%s — %d starter(s) fall through to the fallback"
          % ("PASS" if not failures else "FAIL", failures))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
