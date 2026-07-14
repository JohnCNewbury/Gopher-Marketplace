#!/usr/bin/env python3
"""Cross-platform parity harness — Gopher Request web / Connect / Request App prototype.

The three surfaces are ONE product on different platforms: decisions must be
identical everywhere; only rendering differs. This harness extracts the ACTUAL
shipped logic from each surface and asserts they agree. It is the proof (for the
dev handoff) that app === web, and the guardrail against drift between
concurrently-edited copies.

    python3 run_parity_harness.py        # exit 0 = parity holds, 1 = drift/failure

Checks:
  1. CATEGORY  — the shared module (gopher-request-logic.js) passes the mismatch
                 matrix on BOTH classifier paths (shared file / inlined engine).
  2. DELEGATE  — no surface re-implements detectCategoryMismatch locally; each
                 loads and uses the shared module.
  3. AGE       — each surface's own findAgeRestrictedKeyword (+ its local list +
                 the shared generated brain) gives IDENTICAL verdicts on the same
                 inputs, and sanity expectations hold (cigarettes hit, lawn null).
  4. OFFER     — the suggested-offer OFFER_TABLE is byte-identical across surfaces
                 (pricing parity; NC-forced model per owner directive 2026-07-09).
  5. STATE     — the canonical-core state fields (see
                 canonical-request-state-schema.md) exist in every surface's
                 makeInitialState(); NEW undocumented fields are reported as
                 warnings (drift to reconcile), missing core fields FAIL.

Runs the real code via JavaScriptCore (osascript -l JavaScript) — no Node needed.
"""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SURFACES = {
    "request":   "Final/gopher-request.html",
    "connect":   "Final/gopher-connect.html",
    "prototype": "_prototypes/Request/gopher-request-flow.html",
}
CLASSIFIER = "Final/assets/js/gopher-category-classifier.js"
LOGIC      = "Final/assets/js/gopher-request-logic.js"
ENGINE     = "Final/assets/js/gopher-ai-engine.js"
AGE_BRAIN  = "Final/assets/js/gopher-age-keywords.js"
AGE_SUPP   = "Final/assets/js/gopher-age-supplement.js"   # shared hand-maintained supplement

MATRIX = [  # (selectedSlug, description, expected suggestedSlug or None)
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
AGE_CASES = [  # (text, expected hit? True/False/None=only cross-surface equality)
    ("I need cigarettes. Marlboro Reds", True),
    ("case of beer", True),
    ("bottle of wine and a vape", True),
    ("need a ride to the airport", False),
    ("mount my TV", False),
    ("need my lawn mowed", False),
    ("move a couch to the dump", False),
    ("pick up my prescription", None),
    ("grab me a lighter and some rolling papers", None),
]
# Canonical persisted+shared core — must exist in EVERY surface (see schema doc §2).
CORE_FIELDS = set("""ageKeywordAck ageRestricted calViewISO category costOfItems description
destStairs flexibleWindow hazardous itemCount itemsPurchased lowOfferAck maxStepReached
moreThanOneWorker multipleItems noSpecificPickup numBags numHours numRiders numWorkers
payAmount payByHour payMode paymentMethod paymentPickerOpen picThumbs pickupStairs
promoApplied promoCode promoError schedDate scheduleType serviceElevatorDest
serviceElevatorPickup specialInstructions sseOpen step timeSlot tripDistance waiverChecked
workerSelection wteOpen""".split())
# Documented drift (schema doc §3) — present-but-not-universal fields. New fields
# outside core+documented are reported as NEW DRIFT (warning).
DOCUMENTED_EXTRA = set("""agePurchaseAck agePurchaseDismissed businessPlan dealBoost dealKind
descriptionIsPlaceholder descriptionPlaceholder dropoffStop dropoffStops dupWarnAck
eligibleWorkers fromDeal hasPic hireAgainGophers idFrontCaptured idFrontSrc
idRequiredAtCompletion idVerification idVerified laborManagement lowAvailabilityAck
openCatInfo openInfo osOpen pickupStop pickupStops profileOpen savedOnFile scheduleConfirmed
selectedDate selfieCaptured selfieSrc submittedAt suggestedOfferUsed waiverPrompted
userAcknowledgedCategory lastCheckedDescription""".split())


def read(rel):
    return open(os.path.join(ROOT, rel), encoding="utf-8").read()


def jxa(script):
    fn = "/tmp/_parity_run.js"
    open(fn, "w").write(script)
    out = subprocess.run(["osascript", "-l", "JavaScript", fn], capture_output=True, text=True)
    os.unlink(fn)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip()[:400])
    return json.loads(out.stdout.strip())


def extract_fn(src, name):
    i = src.index("function " + name + "("); k = src.index("{", i); d = 0
    while k < len(src):
        if src[k] == "{": d += 1
        elif src[k] == "}":
            d -= 1
            if d == 0: return src[i:k + 1]
        k += 1


def extract_const(src, name, start=0):
    i = src.index("const " + name, start); k = src.index("=", i); d = 0
    while k < len(src):
        c = src[k]
        if c in "[{(": d += 1
        elif c in "]})": d -= 1
        elif c == ";" and d == 0: return src[i:k + 1]
        k += 1


def engine_deps():
    eng = read(ENGINE)
    parts = [extract_const(eng, "CATEGORIES"), extract_const(eng, "CAT_STOP"),
             extract_const(eng, "STEM_KEEP"), "var CAT_THRESH=4;"]
    for f in ("catNorm", "catWords", "stem", "stemSet", "scoreCategories"):
        parts.append(extract_fn(eng, f))
    return "\n".join(parts)


FAILS, WARNS = [], []
def check(ok, label, detail=""):
    print("  [%s] %s%s" % ("PASS" if ok else "FAIL", label, ("  " + detail if detail else "")))
    if not ok: FAILS.append(label)


def matrix_js():
    return ("var T=" + json.dumps([[s, d, e] for s, d, e in MATRIX]) +
            ";var d=window.GopherRequestLogic.detectCategoryMismatch;"
            "JSON.stringify(T.map(function(t){var r=d(t[0],t[1]);var g=r?r.suggestedSlug:null;"
            "return (t[2]===null)?(r===null):(!!r&&g===t[2]);}));")


def main():
    print("== 1. CATEGORY — shared module vs the mismatch matrix ==")
    mod, cls = read(LOGIC), read(CLASSIFIER)
    resA = jxa("var window={};\n" + cls + "\n" + mod + "\n" + matrix_js())
    check(all(resA), "matrix via shared-classifier path (%d/%d)" % (sum(resA), len(resA)))
    resB = jxa("var window={};\n" + engine_deps() + "\n" + mod + "\n" + matrix_js())
    check(all(resB), "matrix via inlined-engine path (%d/%d)" % (sum(resB), len(resB)))

    print("== 2. DELEGATE — one source of truth, no local copies ==")
    for name, rel in SURFACES.items():
        src = read(rel)
        local = len(re.findall(r"function\s+detectCategoryMismatch\s*\(", src))
        loads = "gopher-request-logic.js" in src
        uses = "GopherRequestLogic" in src
        check(local == 0 and loads and uses, "%s delegates to the module" % name,
              "(local:%d loads:%s uses:%s)" % (local, loads, uses))

    print("== 3. AGE — identical verdicts from each surface's own detector ==")
    brain = read(AGE_BRAIN) + "\n" + read(AGE_SUPP)   # generated brain + shared supplement
    verdicts = {}
    for name, rel in SURFACES.items():
        src = read(rel)
        parts = ["var window={};", brain, extract_const(src, "AGE_RESTRICTED_KEYWORDS"),
                 extract_fn(src, "findAgeRestrictedKeyword"),
                 "var C=" + json.dumps([c for c, _ in AGE_CASES]) + ";",
                 "JSON.stringify(C.map(function(t){var k=findAgeRestrictedKeyword(t);return k?String(k).toLowerCase():null;}));"]
        verdicts[name] = jxa("\n".join(parts))
    names = list(SURFACES)
    for i, (case, expect) in enumerate(AGE_CASES):
        vals = [verdicts[n][i] for n in names]
        same = len(set(vals)) == 1
        exp_ok = True if expect is None else ((vals[0] is not None) == expect)
        check(same and exp_ok, "age: %r" % case[:44],
              "-> " + " / ".join("%s:%s" % (n, v) for n, v in zip(names, vals)))

    print("== 4. OFFER — pricing table identical across surfaces ==")
    tables = {}
    for name, rel in SURFACES.items():
        t = extract_const(read(rel), "OFFER_TABLE")
        tables[name] = jxa("var window={};\n" + t + "\nJSON.stringify(OFFER_TABLE);")
    base = tables[names[0]]
    for n in names[1:]:
        check(tables[n] == base, "OFFER_TABLE %s == %s" % (n, names[0]))

    print("== 5. STATE — canonical core present; new drift reported ==")
    known = CORE_FIELDS | DOCUMENTED_EXTRA
    for name, rel in SURFACES.items():
        src = read(rel)
        i = src.index("function makeInitialState")
        k = src.index("{", src.index("return", i)); d = 0; j = k
        while j < len(src):
            if src[j] == "{": d += 1
            elif src[j] == "}":
                d -= 1
                if d == 0: break
            j += 1
        body = re.sub(r"//[^\n]*", "", src[k:j + 1])
        fields = set(re.findall(r"([A-Za-z_]\w*)\s*:", body))
        missing = CORE_FIELDS - fields
        check(not missing, "%s carries all %d core fields" % (name, len(CORE_FIELDS)),
              ("missing: " + ", ".join(sorted(missing))) if missing else "")
        new = fields - known
        if new:
            WARNS.append("%s has undocumented NEW state fields: %s — reconcile into the schema doc"
                         % (name, ", ".join(sorted(new))))

    print()
    for w in WARNS:
        print("  [WARN] " + w)
    print("\nPARITY: %s (%d failure%s, %d warning%s)" %
          ("OK" if not FAILS else "BROKEN", len(FAILS), "" if len(FAILS) == 1 else "s",
           len(WARNS), "" if len(WARNS) == 1 else "s"))
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
