#!/usr/bin/env python3
"""
verify-faqs-integrity.py — pre-deploy guard for the inlined Gopher iQ FAQS store.

Every page that inlines the iQ engine must carry a well-formed `const FAQS = [...]`
JSON array. On 2026-07-11 a copy-edit find/replace on text that was duplicated across
BOTH the static HTML FAQ accordion AND the inline FAQS JSON collapsed 474 lines out of
Final/gopher-faqs.html — silently stripping its `const FAQS` declaration and shipping a
page whose search throws. This guard makes that failure loud instead of silent.

For each inlined copy it checks:
  1. exactly one `const FAQS = [ ... ];` declaration is present,
  2. the array is valid JSON,
  3. it holds the expected number of entries (default 184),
  4. it round-trips (json.dumps(arr) == the source literal) — i.e. no mangling,
  5. all copies agree except an allow-listed drift set (gopher-request.html carries 5
     intentionally-different entries — same questions, Request-specific answers).

Exit non-zero (blocking a deploy) if any check fails.

Usage:
  python3 verify-faqs-integrity.py [--root Final] [--expect 184]
"""
import argparse, json, re, sys, hashlib
from pathlib import Path

# The seven inlined copies (paths relative to the Final/ root).
COPIES = [
    "assets/js/gopher-ai-engine.js",
    "index.html",
    "gopher-request.html",              # intentional drift — see DRIFT_ALLOWED
    "gopher-services.html",
    "gopher-faqs.html",
    "2-engine-js-block.html",
    "gopher-iq-sandbox-standalone.html",
]
# Copies allowed to differ in entry *content* from the canonical set (not in count/shape).
DRIFT_ALLOWED = {"gopher-request.html"}

DECL_RE = re.compile(r"const FAQS\s*=\s*(\[.*?\])\s*;", re.S)

def load(path: Path):
    txt = path.read_text(encoding="utf-8")
    decls = re.findall(r"const FAQS\s*=", txt)
    m = DECL_RE.search(txt)
    return txt, decls, m

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="Final")
    ap.add_argument("--expect", type=int, default=184)
    args = ap.parse_args()
    root = Path(args.root)

    failures, canon_hash, canon_name = [], None, None
    for rel in COPIES:
        p = root / rel
        if not p.exists():
            failures.append(f"{rel}: MISSING FILE")
            continue
        txt, decls, m = load(p)
        if len(decls) != 1:
            failures.append(f"{rel}: found {len(decls)} `const FAQS =` declarations (want 1)")
            continue
        if not m:
            failures.append(f"{rel}: `const FAQS =` present but array literal not parseable")
            continue
        lit = m.group(1)
        try:
            arr = json.loads(lit)
        except json.JSONDecodeError as e:
            failures.append(f"{rel}: FAQS is not valid JSON ({e})")
            continue
        if len(arr) != args.expect:
            failures.append(f"{rel}: {len(arr)} entries (want {args.expect})")
        if json.dumps(arr, ensure_ascii=False) != lit:
            failures.append(f"{rel}: FAQS does not round-trip (whitespace/mangling in the literal)")
        # shape check: every entry needs the core keys
        for i, e in enumerate(arr):
            missing = {"group", "q", "a"} - set(e)
            if missing:
                failures.append(f"{rel}: entry[{i}] missing keys {sorted(missing)}")
                break
        h = hashlib.md5(json.dumps(arr, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        if rel not in DRIFT_ALLOWED:
            if canon_hash is None:
                canon_hash, canon_name = h, rel
            elif h != canon_hash:
                failures.append(f"{rel}: content differs from canonical ({canon_name}) but is not in the drift allow-list")
        print(f"  {rel:42s} {len(arr):3d} entries  {'DRIFT-OK' if rel in DRIFT_ALLOWED else h[:10]}")

    if failures:
        print("\nFAQS INTEGRITY: FAIL", file=sys.stderr)
        for f in failures:
            print(f"  ✗ {f}", file=sys.stderr)
        sys.exit(1)
    print(f"\nFAQS INTEGRITY: OK — all {len(COPIES)} copies carry {args.expect} valid entries.")

if __name__ == "__main__":
    main()
