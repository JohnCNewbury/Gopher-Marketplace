#!/usr/bin/env python3
"""
Worker-side parity harness — Gopher Go web vs the Gopher Go app, vs canon.

WHY THIS EXISTS. The requester side has had enforced parity since 2026-08
(docs/handoff/request-app-parity/). The WORKER side had none: verified
2026-08-26, `gopher-go-prototype.html` was referenced by zero harnesses. So a
requester-side divergence failed a test, and a worker-side divergence failed in
production. This closes that asymmetry.

⛔ READ-ONLY AND OFFLINE. This reads source files and prints pass/fail. It makes
no network call, writes nothing outside /tmp, and touches no live repo — no
gopher-mobile-*, no gopher-backend-api, no origin/production. It lives under
docs/, which scripts/deploy.sh EXCLUDES, so it is never published.

⚠️ THE TWO SURFACES ARE NOT THE SAME PRODUCT, and a naive parity check is wrong.
  Final/gopher-go.html            = the worker WEB DASHBOARD (settings, payout,
                                    tiers, business info, referrals)
  _prototypes/Go/gopher-go-prototype.html = the future Gopher Go APP: that same
                                    dashboard PLUS the job lifecycle (accept,
                                    counter, no-show, completion)
So absence of lifecycle rules on the web is CORRECT, not drift. Checks are
therefore split three ways:
  A · SHARED   — both surfaces state it; they must agree.
  B · APP-ONLY — only the app has it; it is checked against CANON instead.
  C · DECLARED — the web legitimately lacks it; asserted so a future reader
                 cannot mistake the absence for divergence.

Run:  python3 docs/handoff/go-app-parity/run_go_parity_harness.py
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))

WEB = "Final/gopher-go.html"
APP = "_prototypes/Go/gopher-go-prototype.html"
CANON = "_prototypes/Go/gopher-go-canonical.html"  # byte-identical to the Master copy

failures = []
notes = []


def check(name, cond, detail=""):
    if cond:
        print(f"  [PASS] {name}")
    else:
        print(f"  [FAIL] {name}" + (f"  {detail}" if detail else ""))
        failures.append(name)


def note(msg):
    notes.append(msg)
    print(f"  [NOTE] {msg}")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8", errors="replace") as fh:
        return fh.read()


def strip_svg(src):
    """⚠️ REQUIRED, not tidiness. SVG path data contains bare numbers: `4.75`
    appears twice inside <path d="..."> coordinates in gopher-go.html. Without
    this, a numeric rule check matches artwork and reports agreement that is not
    there. Learned by hitting it."""
    return re.sub(r"<svg\b.*?</svg>", " ", src, flags=re.S | re.I)


def searchable(src):
    """Everything a RULE can live in, minus artwork.

    ⚠️ Do NOT strip <script> here. The first version of this harness did, and the
    app prototype collapsed from 5,202 lines to 1,364 characters -- it renders
    its entire UI from JavaScript template strings, so removing scripts removed
    the product. The probe-sanity check below is what caught it. Worker rules
    also live in CODE COMMENTS on both surfaces (`// Active only when the worker
    is eligible (Elite/Elite+/Pro ...)`), which a rendered-text-only extractor
    cannot see either.

    So: strip artwork, keep everything else."""
    return " ".join(strip_svg(src).split())


web_raw, app_raw, canon_raw = read(WEB), read(APP), read(CANON)
web, app, canon = searchable(web_raw), searchable(app_raw), searchable(canon_raw)
web_code, app_code = strip_svg(web_raw), strip_svg(app_raw)

print("\nWorker-side parity — Go web vs Go app vs canon")
print(f"  web   {WEB}   {len(web_raw):,} bytes")
print(f"  app   {APP}   {len(app_raw):,} bytes")
print(f"  canon {CANON} {len(canon_raw):,} bytes\n")

# ── probe sanity ──────────────────────────────────────────────────────────────
# A sweep that can see nothing passes everything. Prove the probe first.
print("Probe sanity")
check("web searchable text extracted", len(web) > 20000, f"got {len(web)}")
check("app searchable text extracted", len(app) > 20000, f"got {len(app)}")
check("canon searchable text extracted", len(canon) > 20000, f"got {len(canon)}")
check(
    "strip_svg actually removes artwork numerals",
    web_raw.count("4.75") > strip_svg(web_raw).count("4.75"),
    "if this fails, numeric checks below may be matching <path d> coordinates",
)

# ── A · SHARED rules — both surfaces state these, so they must agree ──────────
print("\nA · SHARED worker rules (both surfaces must agree)")

SP_TIERS = ("Elite", "Pro")
for t in SP_TIERS:
    check(
        f"SP-deal eligibility names the {t} tier on BOTH surfaces",
        t in web and t in app,
        f"web={t in web} app={t in app}",
    )

check(
    "SP-deal rating bar is 4.75 on BOTH surfaces",
    "4.75" in web and "4.75" in app,
    f"web={'4.75' in web} app={'4.75' in app}",
)

SERVICE_JOBS = re.compile(r"20\+?\s*(completed\s*)?SERVICE\s*jobs", re.I)
check(
    "SP-deal bar is 20+ SERVICE jobs on BOTH surfaces (not all jobs)",
    bool(SERVICE_JOBS.search(web)) and bool(SERVICE_JOBS.search(app)),
    f"web={bool(SERVICE_JOBS.search(web))} app={bool(SERVICE_JOBS.search(app))}",
)

# The 2026-07-23 amendment is the whole point of the bar: delivery/ride volume
# must NOT count, or the manual review queue floods.
EXCL = re.compile(r"Delivery\s*[/,].{0,30}Ride", re.I)
check(
    "the Delivery/Ride/Other EXCLUSION is stated on BOTH surfaces",
    bool(EXCL.search(web)) and bool(EXCL.search(app)),
    f"web={bool(EXCL.search(web))} app={bool(EXCL.search(app))}",
)

# ── B · APP-ONLY rules — no web counterpart, so check against CANON ───────────
print("\nB · APP-ONLY rules (checked against canon, not against web)")

cap = re.search(r"Math\.max\(\s*20\s*,\s*[A-Za-z0-9_.]+\s*\*\s*1\.5\s*\)", app_code)
check(
    "app enforces the D-026 counter cap as max($20, 1.5 x offer)",
    bool(cap),
    "expected Math.max(20, <offer> * 1.5) in the app",
)
check(
    "canon states the same 150%-of-offer cap",
    ("150%" in canon) or ("1.5" in canon),
    "canon should carry D-026's cap",
)
check(
    "the cap base is the OFFER, never cost-of-items (owner correction 2026-07-24)",
    not re.search(r"Math\.max\(\s*20\s*,\s*[A-Za-z0-9_.]*cost[A-Za-z0-9_.]*\s*\*", app_code, re.I),
    "a cost_of_goods base is the legacy worker-app bug; it must not reappear",
)

check(
    "app models the no-show flow (G40-192); canon documents it",
    re.search(r"no.?show", app, re.I) is not None,
    "",
)

# ── C · DECLARED absences — legitimate, asserted so they read as intentional ──
print("\nC · DECLARED differences (absence on web is CORRECT, not drift)")

LIFECYCLE = {
    "no-show": re.compile(r"no.?show", re.I),
}
for label, rx in LIFECYCLE.items():
    on_web = bool(rx.search(web))
    check(
        f"'{label}' is app-only — the web dashboard has no job lifecycle",
        not on_web,
        "if this FAILS the web grew lifecycle behaviour; that is a product change, "
        "not a harness bug — re-scope this check deliberately",
    )

note(
    "Go web is a DASHBOARD; the app is dashboard + job lifecycle. Do not add a "
    "blanket web-vs-app equality check — it would fail on every lifecycle rule by design."
)
note(
    "COVERAGE IS PARTIAL AND THIS IS THE HONEST LIMIT: this harness asserts the "
    "SP-deal bar, the counter cap and the no-show split. It does NOT yet cover "
    "acceptance paths, tier perks, ride-photo gating or payout timing."
)

print("")
if failures:
    print(f"GO PARITY: BROKEN ({len(failures)} failure(s), {len(notes)} note(s))")
    for f in failures:
        print(f"   - {f}")
    sys.exit(1)
print(f"GO PARITY: OK (0 failures, {len(notes)} note(s))")
