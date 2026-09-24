#!/usr/bin/env python3
"""
Assert that "⟳ Reset demo" in _prototypes/split-screen.html clears EVERY relay-state map.

Why this exists
---------------
The harness suppresses duplicate relays with per-order "seen" maps held in page scope. Order
ids are reused on every demo run (GR-00128 each time), and Reset reboots both iframes without
reloading split-screen.html itself. So a seen-map that survives Reset silently suppresses its
relay on the second run: the relay looks dead and the PRODUCT looks broken, which is the worst
possible failure mode for a demo shown to advisors.

This has now happened three times in one file:
  * confirmSeen — added 2026-08-09 with the confirm/rating decoupling, never added to Reset.
    After one Reset, CONFIRM COMPLETED stopped reaching the Go phone and the worker sat on
    "Pending confirmation" forever — reproducing the exact bug that change had just fixed.
  * navSeen, flagSeen — pre-existing. These are the subtler, seq-keyed variant: they compare
    against job.<x>.seq, which restarts at 1 on a rebooted frame because it is built as
    seq:((j.x && j.x.seq) || 0) + 1. A stale 1 from the previous run equals the fresh 1, so the
    FIRST turn-by-turn narration and the FIRST Report-A-Request after a Reset were swallowed.

A boolean map fails loudly on a re-run; a seq-keyed map fails only on the first event after a
Reset, which is exactly when someone is demoing. Both must be cleared.

Run:  python3 docs/handoff/category-mismatch/run_splitscreen_reset_test.py
Exit: 0 = pass, 1 = a map is missing from the Reset line.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
TARGET = os.path.join(REPO, "_prototypes", "split-screen.html")

# Declared but deliberately not relay state — these are configuration, not per-order memory.
NOT_RELAY_STATE = {"DEMO_GOPHER"}


def main() -> int:
    if not os.path.exists(TARGET):
        print(f"FAIL: cannot find {TARGET}")
        return 1
    src = open(TARGET, encoding="utf-8", errors="replace").read()

    # Harness-scope declarations: two-space indented `var name={};` or `var name=0;`
    declared = re.findall(r"^\s{2}var\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\{\}|0)\s*;", src, re.M)

    # Keep only the ones actually written to during relaying — i.e. real per-order memory.
    # Matches  name[key]=…  and  name++ / name+=…  (referralSeen is a bare counter).
    relay_state = [
        n
        for n in declared
        if n not in NOT_RELAY_STATE
        and (
            re.search(re.escape(n) + r"\s*\[[^\]]+\]\s*=", src)
            or re.search(re.escape(n) + r"\s*(?:\+\+|\+=)", src)
        )
    ]

    m = re.search(r"^\s*injected=\{\};.*$", src, re.M)
    if not m:
        print("FAIL: could not locate the Reset-demo clearing line (expected it to start "
              "with `injected={};`). If it was renamed, update this test.")
        return 1
    reset_line = m.group(0)
    cleared = set(re.findall(r"([A-Za-z_$][\w$]*)\s*=\s*(?:\{\}|0)", reset_line))

    missing = [n for n in relay_state if n not in cleared]

    print(f"declarations scanned : {len(declared)}")
    print(f"relay-state maps     : {len(relay_state)}")
    print(f"cleared by Reset     : {len(cleared)}")

    if missing:
        print()
        print("FAIL — these relay-state maps survive Reset demo and will suppress their")
        print("       relay on the second run of the same order id:")
        for n in missing:
            print(f"         {n}")
        print()
        print("Fix: add each to the `injected={}; …` line in the Reset handler.")
        return 1

    # Guard the other direction too: a name cleared but no longer declared is dead code that
    # would throw a ReferenceError under strict mode and silently mislead a reader otherwise.
    stale = [n for n in cleared if n not in declared]
    if stale:
        print()
        print("FAIL — the Reset line clears names that are no longer declared:")
        for n in stale:
            print(f"         {n}")
        return 1

    print()
    print(f"PASS — all {len(relay_state)} relay-state maps are cleared by Reset demo")
    return 0


if __name__ == "__main__":
    sys.exit(main())
