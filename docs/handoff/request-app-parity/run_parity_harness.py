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
    ("junk_removal", "I need an electrician.", "home_services"),
    ("junk_removal", "need a plumber", "home_services"),
    ("other", "I need an electrician", "home_services"),
    ("junk_removal", "paint my bedroom", "home_services"),
    ("junk_removal", "furniture", None),
    ("delivery", "furniture", None),
    ("moving", "dolly rental", None),
    ("ride_sharing", "boxes", None),
    ("junk_removal", "help", None),
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
    # SMART PUNCTUATION (owner repro 2026-08-05). Phones autocorrect ' -> \u2019, and
    # the brain stores straight ASCII, so every possessive brand was undetectable
    # on mobile - 41 of 1,658 keywords. These four must stay green or the age
    # gate silently reopens for exactly the customers most likely to hit it.
    ("I need some Tito\u2019s", True),          # the exact text that failed
    ("grab a bottle of Jack Daniel\u2019s", True),
    ("Maker\u2019s Mark please", True),
    ("deliver a titanium bolt", False),      # 'tito' substring must NOT fire
]
# Canonical persisted+shared core — must exist in EVERY surface (see schema doc §2).
# Grew 42 -> 50 with the 2026-07-14 reconciliation: canonical location ARRAYS
# (pickupStops/dropoffStops) + the age-compliance/schedule/offer contract fields
# are now universal.
CORE_FIELDS = set("""ageKeywordAck ageRestricted calViewISO category costOfItems description
destStairs flexibleWindow hazardous itemCount itemsPurchased lowOfferAck maxStepReached
moreThanOneWorker multipleItems noSpecificPickup numBags numHours numRiders numWorkers
payAmount payByHour payMode paymentMethod paymentPickerOpen picThumbs pickupStairs
promoApplied promoCode promoError schedDate scheduleType serviceElevatorDest
serviceElevatorPickup specialInstructions sseOpen step timeSlot tripDistance waiverChecked
workerSelection wteOpen
pickupStops dropoffStops idRequiredAtCompletion agePurchaseAck agePurchaseDismissed
scheduleConfirmed selectedDate suggestedOfferUsed""".split())
# Documented drift (schema doc §3) — present-but-not-universal fields. New fields
# outside core+documented are reported as NEW DRIFT (warning). The RETIRED legacy
# shapes (pickupStop/dropoffStop strings, idVerified bool) are deliberately NOT
# listed: if one reappears anywhere, it surfaces as NEW-DRIFT.
DOCUMENTED_EXTRA = set("""businessPlan dealBoost dealKind
descriptionIsPlaceholder descriptionPlaceholder dupWarnAck
eligibleWorkers fromDeal hasPic hireAgainGophers idFrontCaptured idFrontSrc
idVerification junkTier movingTier laborManagement lowAvailabilityAck
openCatInfo openInfo osOpen profileOpen savedOnFile
selfieCaptured selfieSrc submittedAt waiverPrompted
userAcknowledgedCategory lastCheckedDescription trustShield demo""".split())


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


FHF_RE = re.compile(r"FIELD_HIDDEN_FOR\s*=\s*\{")
def surface_hidden_for(src):
    """Parse a surface's inline FIELD_HIDDEN_FOR into {field: [categories]}."""
    m = FHF_RE.search(src)
    if not m:
        return None
    start = m.end() - 1
    depth, j = 0, start
    while j < len(src):
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    body = src[start:j + 1]
    out = {}
    for k, v in re.findall(r"([A-Za-z0-9_]+)\s*:\s*\[([^\]]*)\]", body):
        out[k] = sorted(x.strip().strip("'\"") for x in v.split(",") if x.strip())
    return out


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

    print("== 3. AGE — single-sourced detector; every surface delegates ==")
    # The detector now lives ONLY in the shared module (brain + supplement).
    brain = read(AGE_BRAIN) + "\n" + read(AGE_SUPP)
    module_verdicts = jxa("var window={};\n" + brain + "\n" + mod +
                          "\nvar C=" + json.dumps([c for c, _ in AGE_CASES]) + ";" +
                          "JSON.stringify(C.map(function(t){var k=window.GopherRequestLogic.findAgeRestrictedKeyword(t);return k?String(k).toLowerCase():null;}));")
    for i, (case, expect) in enumerate(AGE_CASES):
        v = module_verdicts[i]
        exp_ok = True if expect is None else ((v is not None) == expect)
        check(exp_ok, "age(module): %r" % case[:44], "-> %s" % v)
    names = list(SURFACES)
    for name, rel in SURFACES.items():
        src = read(rel)
        body = extract_fn(src, "findAgeRestrictedKeyword")
        delegates = "GopherRequestLogic" in body
        no_local_list = "const AGE_RESTRICTED_KEYWORDS" not in src
        check(delegates and no_local_list, "%s age detector is a delegating shim" % name,
              "(delegates:%s localList:%s)" % (delegates, not no_local_list))

    print("== 4. OFFER — single-sourced pricing; canonical values locked ==")
    # Table + math live ONLY in the module. Spot values lock the NC-forced model
    # ($100 -> 16/21/26, the owner-verified numbers) AND the >$200 terminal-slope
    # extrapolation (NC +$0.40/$, US +$0.16/$) that superseded the flat variant.
    spots = jxa("var window={};\n" + mod +
                "\nvar S=window.GopherRequestLogic.suggestedOffer;" +
                "JSON.stringify([S(100,true),S(100,false),S(300,true),S(300,false)]);")
    expected = [{"low":16,"suggested":21,"generous":26},{"low":26,"suggested":35,"generous":44},
                {"low":64,"suggested":85,"generous":106},{"low":50,"suggested":66,"generous":83}]
    for lbl, got, exp in zip(["NC $100","US $100","NC $300","US $300"], spots, expected):
        check(got == exp, "offer %s == %s" % (lbl, exp), "got %s" % got)
    for name, rel in SURFACES.items():
        src = read(rel)
        no_table = "const OFFER_TABLE" not in src
        shim = "GopherRequestLogic.suggestedOffer" in src
        check(no_table and shim, "%s pricing is a delegating shim" % name,
              "(localTable:%s shim:%s)" % (not no_table, shim))

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

    print("== 6. DRAFT — the cross-device contract holds ==")
    # The draft kernel is what makes "start on the web, finish in the app" possible.
    # Two things have to stay true as surfaces change:
    #   a) every field the kernel promises to carry actually EXISTS in each surface,
    #      or a resumed request silently drops data;
    #   b) nothing sensitive or transient can reach a draft — that one is a privacy
    #      guarantee, so it is asserted against the kernel's real output, not by
    #      reading the source.
    draft_js = os.path.join(ROOT, "Final/assets/js/gopher-request-draft.js")
    if not os.path.exists(draft_js):
        check(False, "draft kernel present", draft_js)
    else:
        probe = r"""
          var K = require(%s);
          var state = {};
          K.CONTRACT_FIELDS.forEach(function(f){ state[f] = 'x'; });
          // a state that carries everything a real one would, including what must NOT travel
          state.idVerification = {idFrontSrc:'data:image/jpeg;base64,SECRET', selfieSrc:'data:image/jpeg;base64,S'};
          state.picThumbs = [{id:1, src:'data:image/jpeg;base64,AAAA'}];
          K.TRANSIENT_FIELDS.forEach(function(f){ state[f] = 'x'; });
          var d = K.toDraft(state, {rev:0});
          var json = JSON.stringify(d);
          var leaked = K.SENSITIVE_FIELDS.filter(function(f){ return f in d.data; })
            .concat(K.TRANSIENT_FIELDS.filter(function(f){ return f in d.data; }));
          console.log(JSON.stringify({
            contract: K.CONTRACT_FIELDS,
            leaked: leaked,
            imageData: json.indexOf('data:image') !== -1,
            validates: K.validate(d).ok,
            reconsent: K.RECONSENT_FIELDS
          }));
        """ % json.dumps(draft_js)
        try:
            out = subprocess.run(["node", "-e", probe], capture_output=True, text=True,
                                 timeout=60, cwd=ROOT)
            info = json.loads(out.stdout.strip().splitlines()[-1])
        except Exception as e:
            info = None
            check(False, "draft kernel runs", str(e)[:120])

        if info:
            check(not info["leaked"], "no sensitive or transient field can reach a draft",
                  ", ".join(info["leaked"]))
            check(not info["imageData"], "no image data can reach a draft")
            check(info["validates"], "kernel validates its own output")

            # Every carried field must exist in every surface's makeInitialState(),
            # otherwise a resumed request silently drops data. Two exemptions:
            #
            #   derived  — computed BY the kernel/map, never read from surface state.
            #   optional — schema doc §3c "platform-specific": genuinely part of the
            #              contract, legitimately absent until that platform gains the
            #              feature (Connect/prototype have no Deals surface yet). These
            #              WARN rather than fail: a known, documented gap that fails the
            #              build teaches people to ignore the build.
            derived = {"picCount", "categoryRaw", "subCategoryRaw", "hasPic"}
            optional = {"fromDeal", "dealKind", "dealBoost", "hireAgainGophers"}
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
                absent = (set(info["contract"]) - derived) - fields
                soft = absent & optional
                hard = absent - optional
                check(not hard, "%s has every field the draft carries" % name,
                      ("absent: " + ", ".join(sorted(hard))) if hard else "")
                if soft:
                    WARNS.append("%s lacks platform-specific contract fields: %s — a draft "
                                 "resumed here loses them (schema doc §3c)"
                                 % (name, ", ".join(sorted(soft))))

            # Consent must be re-taken on the receiving device, never inherited.
            check(set(info["reconsent"]) >= {"waiverChecked"},
                  "liability waiver is re-consented on resume, not carried")

    # ---------------------------------------------------------------- 6. FLOW RULES
    # Which fields a category shows is duplicated inline in all three surfaces.
    # gopher-flow-rules.js is the shared source of truth; this asserts every
    # surface's private copy still agrees with it, so drift fails a run instead
    # of shipping. Request and Connect agree on 16 of 17 fields — the one real
    # difference (multiStop) is modelled as a surface override, not tolerated as
    # drift.
    print("\n6. FLOW RULES — inline visibility tables vs the shared module")
    rules_js = os.path.join(ROOT, "Final/assets/js/gopher-flow-rules.js")
    if not os.path.exists(rules_js):
        check(False, "shared flow-rules module present", rules_js)
    else:
        try:
            # jxa() already returns parsed JSON.
            M = jxa("var module={exports:{}};" + read("Final/assets/js/gopher-flow-rules.js") +
                    ";JSON.stringify({base:module.exports.tableFor(),"
                    "connect:module.exports.tableFor('connect'),"
                    "bad:module.exports.assertInvariants()})")
        except Exception as e:
            M = None
            check(False, "shared flow-rules module runs", str(e)[:160])
        if M:
            check(not M["bad"], "flow-rules module passes its own invariants",
                  "; ".join(M["bad"]))
            # Each surface is compared against the table for ITS surface.
            for name, rel in SURFACES.items():
                want = M["connect"] if name == "connect" else M["base"]
                got = surface_hidden_for(read(rel))
                if got is None:
                    check(False, "%s exposes a FIELD_HIDDEN_FOR table" % name)
                    continue
                # A surface need not implement every field; it must not DISAGREE
                # about one it does implement.
                shared = sorted(set(got) & set(want))
                bad = [f for f in shared if sorted(got[f]) != sorted(want[f])]
                check(not bad,
                      "%s visibility matches the shared module (%d shared fields)"
                      % (name, len(shared)),
                      "" if not bad else "DRIFT on %s — %s has %s, module has %s" % (
                          ", ".join(bad), name,
                          {f: got[f] for f in bad}, {f: want[f] for f in bad}))
                extra = sorted(set(got) - set(want))
                if extra:
                    WARNS.append("%s defines visibility fields the module does not: %s"
                                 % (name, ", ".join(extra)))

    print()
    for w in WARNS:
        print("  [WARN] " + w)
    print("\nPARITY: %s (%d failure%s, %d warning%s)" %
          ("OK" if not FAILS else "BROKEN", len(FAILS), "" if len(FAILS) == 1 else "s",
           len(WARNS), "" if len(WARNS) == 1 else "s"))
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
