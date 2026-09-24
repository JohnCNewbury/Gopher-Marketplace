#!/usr/bin/env python3
"""Every refer card/tile key must have a REFER_COPY entry in its own file.

The lookup on every portal is `REFER_COPY[kind] || REFER_COPY.<default>` — a
missing key MIS-BRANDS silently instead of erroring (documented twice, 7/27 and
8/18). Suggested by the Go Dashboard session after Request's REFER_COPY drifted
from Connect's by one trailing comma.  Prove-fail: remove any entry and rerun.
"""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parents[3] / "Final"
FILES = ["gopher-connect.html", "gopher-request.html", "gopher-go.html"]
fails = 0
for name in FILES:
    src = (ROOT / name).read_text(encoding="utf-8")
    used = set(re.findall(r'data-(?:refer|rk)="([a-z]+)"', src))
    m = re.search(r'(?:const|var)\s+REFER_COPY\s*=\s*\{(.*?)\n\s*\};', src, re.S)
    if not m:
        print(f"  FAIL {name}: no REFER_COPY object found"); fails += 1; continue
    keys = set(re.findall(r'^\s*([a-z]+):\s*\{', m.group(1), re.M))
    missing = used - keys - {"recommend"}   # recommend opens its own modal, not REFER_COPY
    for k in sorted(missing):
        print(f"  FAIL {name}: data key '{k}' has no REFER_COPY entry (silent mis-brand)")
        fails += 1
    print(f"  ok   {name}: keys used {sorted(used)} covered")
print(("PASS" if not fails else "FAIL") + f" — {fails} uncovered key(s)")
sys.exit(1 if fails else 0)
