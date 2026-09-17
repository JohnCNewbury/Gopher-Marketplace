#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Re-test specific fragment-shim cases with more headroom, several times each.

Standalone on purpose: render.py runs its whole suite at import time.

Why this exists: the suite's probe gives the TARGET page 300ms after `load` to
append its marker, inside a 6s virtual-time budget. The two largest post pages
(~20-22 KB, 6-8 images) intermittently miss that window and the probe comes back
absent — which reads identically to "the redirect did not happen". This script
raises the budget to 8s and repeats, so a real failure separates from a timing
artifact instead of being waved away.
"""
import json
import os
import re
import subprocess
import sys

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SERVE = ("/private/tmp/claude-501/-Users-johnnewbury-Desktop-All-New-Gopher-"
         "Documentation-Claude-Code-Review-Cleanup-Code/"
         "71348b84-f117-4347-b162-ad34c6e5bbe6/scratchpad/blog-serve")
BASE = "http://127.0.0.1:8531/"
PROFILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chrome-profile")

CASES = sys.argv[1:] or ["deals-for-merchants", "service-providers"]
REPEATS = 5

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meta import POSTS  # noqa: E402

LAND = ("<script>window.addEventListener('load',function(){setTimeout(function(){"
        "var m='#'+'#'+'#';var pre=document.createElement('pre');pre.id='PROBE';"
        "pre.textContent=m+JSON.stringify({landed:location.pathname.split('/').pop()})+m;"
        "document.body.appendChild(pre);},300);});</script>")

targets = {c: POSTS[c]["slug"] + ".html" for c in CASES}
originals = {}
for frag, page in targets.items():
    p = os.path.join(SERVE, page)
    originals[page] = open(p, encoding="utf-8").read()
    open(p, "w", encoding="utf-8").write(
        originals[page].replace("</body>", LAND + "</body>", 1))

try:
    results = {}
    for frag, want in targets.items():
        ok = 0
        for i in range(REPEATS):
            args = [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--no-sandbox", "--user-data-dir=" + PROFILE,
                    "--window-size=1000,800", "--virtual-time-budget=8000",
                    "--dump-dom", BASE + "gopher-blog.html#" + frag]
            try:
                out = subprocess.run(args, capture_output=True, text=True, timeout=40).stdout
            except subprocess.TimeoutExpired as e:
                o = e.stdout
                out = (o.decode("utf-8", "replace") if isinstance(o, bytes) else o) or ""
            m = re.search(r'<pre id="PROBE">###(\{.*?\})###</pre>', out, re.S)
            landed = json.loads(m.group(1))["landed"] if m else None
            # independent of the probe: did the DOM we got back belong to the target page?
            canon = re.search(r'<link rel="canonical" href="[^"]*/([^"/]+)"', out)
            canon = canon.group(1) if canon else None
            good = (landed == want) or (landed is None and canon == want)
            ok += bool(good)
            print("  #%-20s try %d: probe=%-52s canonical=%-52s %s"
                  % (frag, i + 1, landed or "(absent)", canon or "(absent)",
                     "ok" if good else "MISMATCH"))
        results[frag] = ok
    print()
    for frag, ok in results.items():
        print("  #%-20s %d/%d" % (frag, ok, REPEATS))
finally:
    for page, t in originals.items():
        open(os.path.join(SERVE, page), "w", encoding="utf-8").write(t)
