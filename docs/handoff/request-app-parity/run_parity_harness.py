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
# pickupUnit / destUnit: free-text Unit/Apt (G40-577 / G40-578, 2026-10-04).
# On BOTH dashboards since the owner ruled "Yes" for Connect. Still listed as
# drift rather than core only because the PROTOTYPE does not have them yet --
# they arrive with its held package, and when it lands these two belong in the
# core set above and this entry should go.
DOCUMENTED_EXTRA = set("""pickupUnit destUnit businessPlan dealBoost dealKind
descriptionIsPlaceholder descriptionPlaceholder dupWarnAck
eligibleWorkers fromDeal hasPic hireAgainGophers idFrontCaptured idFrontSrc
idVerification junkTier movingTier laborManagement lowAvailabilityAck
openCatInfo openInfo osOpen profileOpen savedOnFile
selfieCaptured selfieSrc submittedAt waiverPrompted
idBackCaptured idBackSrc idSubmittedAt dob dealMerchant
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


def surface_gates(src):
    """Extract {(step, label)} from a surface's inline stepGate()."""
    i = src.find("function stepGate(")
    if i < 0:
        return None
    j = src.index("{", i); depth, k = 0, j
    while k < len(src):
        if src[k] == "{":
            depth += 1
        elif src[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    body = src[i:k + 1]
    out = set()
    for m in re.finditer(r"state\.step\s*===\s*(\d+)", body):
        tail = body[m.start():m.start() + 900]
        lab = re.search(r"label:\s*'([^']{0,40})'", tail)
        if lab:
            out.add((int(m.group(1)), lab.group(1)))
    return out


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


# ---------------------------------------------------------------- 8. APP
# Until 2026-10-13 every check above compared the two web pages with a THIRD web
# file — `_prototypes/Request/gopher-request-flow.html`, a hand-built MODEL of the
# app. Nothing here had ever read the app. Owner, 2026-10-13: the store releases
# are done and the LIVE APPS are canonical; the web should share the app's logic.
# This section is where the app enters: it reads gopher-mobile-request at
# `origin/production`, through git.
#
# ⛔ NEVER the clone's checkout. On 2026-10-13 that checkout sat on a 2026-09-02
# feature branch, a month behind production. A check graded against a working
# tree grades whatever happens to be checked out (noshow-freshness.js, step 12 of
# run-all, still does exactly that). `git show origin/production:<path>` cannot.
# It reads the last FETCH, so the ref and its date are printed: a stale fetch is
# then visible rather than silent.
#
# ⛔ "Canonical" means the app's BEHAVIOUR, ruled rule by rule — not copying the
# app's files. Its src/helpers/gopherStepGates.js still has `identity` ON, which
# the owner ruled OFF on the web on 2026-10-04 ("No block, match the app") — and
# nothing in the app calls that file's evaluate(). Copying it would revert him.
APP_REF = os.environ.get("GOPHER_REQUEST_APP_REF") or "origin/production"
# GOPHER_REQUEST_APP_REF: read an UNMERGED app branch instead (e.g. G40-623),
# to see what this section will say once it merges. The default is the truth.
# The SERVER is always read at origin/production (API_REF): the override is for
# the app only.
API_REF = "origin/production"


def sibling_clone(repo, env_var):
    """A Dev/<repo> clone beside this one, found from the MAIN Code clone so a
    worktree under /tmp still resolves it. <env_var> overrides."""
    env = os.environ.get(env_var)
    if env:
        return env
    out = subprocess.run(["git", "-C", ROOT, "rev-parse", "--path-format=absolute",
                          "--git-common-dir"], capture_output=True, text=True)
    main_clone = os.path.dirname(out.stdout.strip()) if out.returncode == 0 else ROOT
    return os.path.normpath(os.path.join(main_clone, "..", "..", "..", "Dev", repo))


def app_clone():
    return sibling_clone("gopher-mobile-request", "GOPHER_REQUEST_APP")


def app_show(clone, rel, ref=None):
    ref = ref or APP_REF
    out = subprocess.run(["git", "-C", clone, "show", "%s:%s" % (ref, rel)],
                         capture_output=True)
    if out.returncode != 0:
        raise RuntimeError("git show %s:%s failed: %s"
                           % (ref, rel, out.stderr.decode()[:160]))
    return out.stdout


def app_grep_files(clone, pattern, path="src"):
    """Files at APP_REF whose text matches `pattern` (git grep -E), tests excluded."""
    out = subprocess.run(["git", "-C", clone, "grep", "-lE", pattern, APP_REF, "--", path],
                         capture_output=True, text=True)
    files = [l.split(":", 1)[1] for l in out.stdout.splitlines() if ":" in l]
    return sorted(f for f in files if ".test." not in f)


def app_section():
    import tempfile
    print("\n8. APP — the web vs the LIVE Request app (%s)" % APP_REF)
    clone = app_clone()
    ref = subprocess.run(["git", "-C", clone, "log", "-1", "--format=%h %ci", APP_REF],
                         capture_output=True, text=True)
    if ref.returncode != 0:
        # Loud, not silent: an absent clone must never read as parity.
        WARNS.append("APP section NOT RUN — no gopher-mobile-request clone with %s at %s. "
                     "Nothing here compared the web with the live app. Set "
                     "GOPHER_REQUEST_APP to the clone." % (APP_REF, clone))
        print("  [SKIP] no app clone at %s" % clone)
        return
    print("  app = %s @ %s  (last fetch — `git -C <clone> fetch origin production` "
          "to refresh)" % (APP_REF, ref.stdout.strip()))

    # ---- AGE: the app says its detector is the web's, copied. Prove it by behaviour.
    # Holds today (2026-10-13: four lists identical, 0 differences on 8,053 inputs),
    # so a break is a FAIL — whichever side moved, the other has to follow or the
    # owner has to rule that they part.
    tmp = tempfile.mkdtemp(prefix="gopher-app-age-")
    try:
        for f in ("ageKeywords.js", "ageKeywordsData.json"):
            open(os.path.join(tmp, f), "wb").write(app_show(clone, "src/helpers/" + f))
        probe = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app-age-probe.js")
        out = subprocess.run(["node", probe, os.path.join(ROOT, "Final/assets/js"), tmp,
                              json.dumps([c for c, _ in AGE_CASES])],
                             capture_output=True, text=True, timeout=120)
        info = json.loads(out.stdout.strip().splitlines()[-1])
    except Exception as e:
        check(False, "app age detector runs beside the web's", str(e)[:160])
        return
    finally:
        for f in os.listdir(tmp):
            os.unlink(os.path.join(tmp, f))
        os.rmdir(tmp)
    if info.get("error"):
        check(False, "app age detector runs beside the web's", info["error"])
        return
    # G40-623 SHIPPED in the app (production 4232d4507, merged 2026-10-14 9:52 AM ET): the
    # owner's 10/14 false-positive cuts are in both, so the lists, the exceptions and every
    # verdict must now be IDENTICAL. The PENDING_G40_623 allowance that let them differ by
    # exactly that data is deleted; any difference FAILS.
    check(info["ncodeDiff"] == 0,
          "age matcher CODE: the web's code on the app's data reproduces the app (%d inputs)"
          % info["inputs"],
          "" if not info["ncodeDiff"] else "%d differ, e.g. %s" % (info["ncodeDiff"], info["codeDiffs"][:3]))
    for k, v in sorted(info["lists"].items()):
        check(v["same"], "age list '%s' identical web/app" % k,
              "web %d / app %d" % (v["web"], v["app"]) if v["same"] else
              "web %d / app %d; only web %s; only app %s"
              % (v["web"], v["app"], v["onlyWeb"][:5], v["onlyApp"][:5]))
    ex = info["exceptions"]
    check(ex["same"], "age exceptions identical web/app",
          "%s" % ex["webKeys"] if ex["same"] else "web %s / app %s" % (ex["webKeys"], ex["appKeys"]))
    check(info["ndiff"] == 0,
          "age detector: same verdict web/app on %d inputs" % info["inputs"],
          "" if not info["ndiff"] else "%d differ, e.g. %s" % (info["ndiff"], info["diffs"][:3]))

    # ---- KNOWN DIVERGENCES — WARN until the owner rules each one. Every line
    # below is DETECTED from both sides, not printed from a list: when either
    # side moves, the warning changes or clears by itself. Full write-up and the
    # rulings each one needs: APP-DIVERGENCE-2026-10-13.md (this folder).
    req = read(SURFACES["request"])

    # Same detector, different REACH. The app calls it from exactly one place —
    # Delivery Step 2, age switch off (flows/delivery.js deliveryContinueCheck).
    # The web's backstop runs on EVERY category, which is how "a wine fridge"
    # blocks a Moving job on the web and not in the app.
    callers = [f for f in app_grep_files(clone, r"findAgeRestrictedKeyword\(")
               if not f.startswith("src/helpers/")]
    web_all = ("state.step === 2 && !state.ageKeywordAck && "
               "!(state.category === 'delivery' && state.ageRestricted)") in req
    if callers == ["src/component/stepFlow/flows/delivery.js"]:
        FAILS.append("APP age-keyword scan went back to DELIVERY ONLY (flows/delivery.js). G40-623 "
                     "(production 4232d4507, 10/14) runs it on every flow: owner ruling D1, 10/13")
    elif callers == ["src/component/stepFlow/ageKeywordCheck.js"]:
        # G40-623's shape: one check, run by the step bar for EVERY flow, and
        # Need a Ride reading its special instructions (owner 10/14).
        nav = app_show(clone, "src/component/yardFlow/YardStepNav.js").decode()
        ride = app_show(clone, "src/component/stepFlow/flows/ride.js").decode()
        ok_nav = "ageKeywordCheck(flow, s, values)" in nav
        ok_ride = 'ageScanField: "special_instructions"' in ride
        if web_all and ok_nav and ok_ride:
            print("  PASS age-keyword scan: every flow on both (app: stepFlow/ageKeywordCheck.js via YardStepNav; Ride reads its special instructions)")
        else:
            FAILS.append("APP age-keyword scan: ageKeywordCheck.js is the caller, but %s"
                         % ("YardStepNav no longer runs it for every flow" if not ok_nav else
                            "Ride no longer reads its special instructions" if not ok_ride else
                            "the WEB no longer scans every category"))
    else:
        FAILS.append("APP age-keyword scan: unrecognised callers %s -- re-read both before trusting this section" % callers)

    # The in-form "this looks like a different category" nudge. The app's
    # classifier runs only in the home search sheet, before a flow opens.
    # Detected by CALLERS of the app's classify(), not by the word "mismatch" —
    # that word is in ten unrelated comments there, which hid this the first time.
    # (No \b: git grep -E on macOS does not support it.)
    cls_callers = [f for f in app_grep_files(clone, r"(^|[^A-Za-z_])classify\(")
                   if not f.endswith("/iqEngine.js")]
    if "__checkCategoryMismatch" in req and cls_callers == ["src/component/home/HomeIq.js"]:
        WARNS.append("APP DIVERGENCE category nudge: web blocks Continue once when the "
                     "description points elsewhere; the app has no in-form nudge. RULED 10/13: block once, the APP changes (G40-624)")

    # Pick-up and drop-off must differ.
    # ⛔ CORRECTED 2026-10-13, same evening. The first version of this check said
    # "the app does not check", because it searched the app for the rule's WORDS
    # ("different addresses", normAddr) outside gopherStepGates.js and found
    # none. The owner knew better. The app checks by MEASUREMENT: helpers/
    # getDistance.js asks the server for the trip distance and, at "0", opens an
    # "Oops!" sheet — "It looks like your pick up and drop off addresses are the
    # same." — whose only button closes it. None of the searched words occur in
    # it. So: a rule is found by following its DATA (what reads both addresses?),
    # and a search that finds nothing is reported as that, never as "the app
    # does not". This detector now looks for the app's actual mechanism.
    zero_modal = app_grep_files(clone, r"bothAddressSameModal")
    mounted = [f for f in app_grep_files(clone, r'"type": "getDistance"', "src/json/requester")
               if f.endswith("flow.json")]
    if "addressesDiffer" in read("Final/assets/js/gopher-step-gates.js") and zero_modal:
        WARNS.append("APP DIVERGENCE same-address: the app WARNS (trip distance 0 -> a "
                     "dismissible 'Oops!' sheet) on %s only; web Request BLOCKS Continue "
                     "on matching address text wherever a pick-up shows, Moving included. RULED 10/13: BLOCK by PLACE on "
                     "Delivery/Ride/Moving, BOTH change (G40-274)"
                     % ", ".join(sorted(os.path.basename(f)[:-9] for f in mounted)))
    elif "addressesDiffer" in read("Final/assets/js/gopher-step-gates.js"):
        WARNS.append("APP same-address check NOT FOUND: getDistance's zero-distance sheet "
                     "is gone or renamed — re-find the app's mechanism before trusting this")

    # Worker choice + pay-by-hour, read from each app flow's own JSON (a control is
    # a TOP-LEVEL key there). ⛔ Not by grepping for the word: "available" also
    # appears in yardflow.json as a targetControl inside OTHER controls' actions,
    # and a grep for it once produced a false "Yard has First Available" parity.
    FLOWS = {"delivery": "deliveryflow", "ride": "rideflow", "yard": "yardflow",
             "other": "customtaskflow", "moving": "movingflow", "junk": "junkflow",
             "labor": "laborflow", "home": "homeflow"}
    app_ctrl = {}
    for cat, f in FLOWS.items():
        try:
            app_ctrl[cat] = set(json.loads(app_show(clone, "src/json/requester/%s.json" % f)))
        except Exception:
            app_ctrl[cat] = None
    rules_src = read("Final/assets/js/gopher-flow-rules.js")
    wsc = re.search(r"workerSelectChoice:\s*\[([^\]]*)\]", rules_src)
    web_no_choice = set(re.findall(r"'(\w+)'", wsc.group(1))) if wsc else set()
    if app_ctrl.get("yard") is not None and "yard" in web_no_choice \
            and {"select_gopher", "notify_fav_gopher"} <= app_ctrl["yard"]:
        WARNS.append("APP DIVERGENCE D13 worker choice on Yard: the app offers I'll select / "
                     "Prioritize MY Gophers; the web shows no choice and forces 'select'. RULED 10/13: the WEB "
                     "shows the app's two options")
    hourly_app = sorted(c for c, k in app_ctrl.items() if k and "paying_by_hour" in k)
    web_no_hourly = re.search(r"const noHourly = state\.category === '(\w+)';", req)
    if hourly_app == ["labor"] and web_no_hourly and web_no_hourly.group(1) == "moving":
        WARNS.append("APP DIVERGENCE D14 pay by the hour: the app offers it on Labor only; the "
                     "web also offers it on Yard, Custom Task and Junk (hidden only for Moving). RULED 10/13: "
                     "Labor only, the WEB changes")

    # ---- FEES. The app holds NO fee constants: it shows what the server's
    # POST orders/summary returns (pages/summary.js adds the returned lines up).
    # So the canonical fee behaviour lives in gopher-backend-api, read the same
    # way: origin/production, through git.
    api = sibling_clone("gopher-backend-api", "GOPHER_BACKEND_API")
    try:
        consts = app_show(api, "constants/index.js", API_REF).decode()
        create = app_show(api, "controllers/order/create.js", API_REF).decode()
    except Exception as e:
        WARNS.append("APP fee comparison NOT RUN — no gopher-backend-api clone with %s "
                     "at %s (%s)" % (API_REF, api, str(e)[:80]))
        return
    sref = subprocess.run(["git", "-C", api, "log", "-1", "--format=%h %ci", API_REF],
                          capture_output=True, text=True).stdout.strip()
    print("  api = %s @ %s  (fees: the app displays what this server returns)" % (API_REF, sref))
    cents = dict((k, int(v)) for k, v in re.findall(r"\b([A-Z_]+):\s*(\d+(?:\.\d+)?)\b", consts)
                 if "." not in v)
    SERVER_KEY = {"delivery": "APPLICATION_FEE_DELIVERY", "ride": "APPLICATION_FEE_NEED_A_RIDE",
                  "labor": "APPLICATION_FEE_HOURLY_DAY_LABOR",
                  "junk": "APPLICATION_FEE_MOVING_JUNK_REMOVAL",
                  "moving": "APPLICATION_FEE_MOVING_JUNK_REMOVAL",
                  "yard": "APPLICATION_FEE_YARD_PROJECT", "home": "APPLICATION_FEE_HOME_SEVICES",
                  "other": "APPLICATION_FEE_OTHER"}
    web_fee = fee_table(req, "GOPHER_FEE") or {}
    bad = [(k, web_fee.get(k), cents.get(v)) for k, v in sorted(SERVER_KEY.items())
           if cents.get(v) is None or round(float(web_fee.get(k, -1)) * 100) != cents[v]]
    check(not bad, "request per-category fees == the live server's (%d categories)" % len(SERVER_KEY),
          "" if not bad else "web $ vs server cents: %s" % bad)
    age = re.search(r"\bAGE_FEE\b\s*=\s*([0-9.]+)", req)
    check(bool(age) and round(float(age.group(1)) * 100) == cents.get("AGE_RESTRICTED_FEE"),
          "request age-restricted fee == the live server's",
          "web %s, server %s cents" % (age and age.group(1), cents.get("AGE_RESTRICTED_FEE")))
    itf = re.search(r"PAYOUT_FEE:\s*([0-9.]+)", consts)
    check(bool(itf) and itf.group(1) == "0.08", "the live server's instant-transfer rate is 8%",
          "server PAYOUT_FEE %s" % (itf and itf.group(1)))

    # TrustShield $1 scope. Server: `trust_shield_verified && age_restricted_fee`
    # (create.js; summary via getAgeRestrictedDiscount under has_age_restriction)
    # — age-restricted orders only. Web Request also gives it to EVERY Ride.
    # ⚠️ §7 above still REQUIRES the web's ride arm. It pins the web's rule, not
    # the live one, and is left alone until the owner rules on Ride (item 2).
    server_ar_only = re.search(r"trust_shield_verified\s*&&\s*age_restricted_fee", create)
    web_ride = re.search(r"tsEligible\s*=[^;]*state\.category\s*===\s*'ride'", req)
    if server_ar_only and web_ride:
        WARNS.append("APP DIVERGENCE TrustShield $1: the live server gives it on "
                     "age-restricted orders only; web Request also gives it on every Ride. RULED 10/13: A/R + Ride, the "
                     "SERVER changes (G40-365, after G40-625)")

    # The 8% base. Server: (offer + fee + (A/R fee - TrustShield)) * 0.08, ceil'd
    # to the cent. Web: (offer + fee + A/R fee) * 0.08, unrounded — 8 cents more
    # for a TrustShield holder on an A/R delivery, and fractional cents on every row.
    server_net = re.search(r"trustshield_fee\s*=\s*age_restricted_fee\s*-\s*trust_shield_discount",
                           create) and "Math.ceil(" in create
    web_gross = "INSTANT_TRANSFER_RATE * (cogOffer + feeSubtotal)" in req
    if server_net and web_gross:
        WARNS.append("APP DIVERGENCE 8% transfer fee: the server takes it on the A/R fee NET of "
                     "TrustShield and rounds UP to the cent; web Request uses the gross A/R fee "
                     "and does not round. RULED 10/13: the web's base, NEAREST CENT on both (G40-625)")

    # ---- SUGGESTED OFFER. The app shows POST orders/smart_price, i.e. the server's
    # pure helpers/suggested_pricing.js. Both sides are RUN by app-offer-probe.js.
    # Junk and Moving agree today (bands + detected tier), so a break FAILS.
    # Delivery (D11) and Ride (D12) differ, and in both the SERVER carries the
    # newer owner decision (G40-502 anchors 9/21; G40-535 worker-pay 9/23): WARN
    # until the owner rules. ⚠️ When the web adopts them, §4's spot values
    # ($100 -> 16/21/26 ...) are what change.
    import tempfile
    tmp = tempfile.mkdtemp(prefix="gopher-api-offer-")
    try:
        for f in ("suggested_pricing.js", "deals_geo.js", "served_zips.js"):
            open(os.path.join(tmp, f), "wb").write(app_show(api, "helpers/" + f, API_REF))
        probe = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app-offer-probe.js")
        out = subprocess.run(["node", probe, ROOT, tmp], capture_output=True, text=True, timeout=60)
        offer = json.loads(out.stdout.strip().splitlines()[-1])
    except Exception as e:
        check(False, "server suggested-offer model runs beside the web's", str(e)[:160])
        return
    finally:
        for f in os.listdir(tmp):
            os.unlink(os.path.join(tmp, f))
        os.rmdir(tmp)
    if offer.get("error"):
        check(False, "server suggested-offer model runs beside the web's", offer["error"])
        return
    for kind in ("junk", "moving"):
        bad = [r for r in offer[kind] if not r["same"]]
        check(offer[kind] and not bad,
              "%s suggested offer == the live server's (%d tiers)" % (kind, len(offer[kind])),
              "" if not bad else "differ: %s" % bad)
    bad = [r for r in offer["detect"] if not r["same"]]
    check(not bad, "junk + moving tier detection == the live server's (%d descriptions)"
          % len(offer["detect"]), "" if not bad else "differ: %s" % bad[:3])
    for kind, tag, why in (
            ("delivery", "D11", "web uses the 7/09 NC table; the server, G40-502 owner anchors (9/21). "
             "RULED 10/13: the WEB adopts the server's curve"),
            ("ride", "D12", "web adds the $2.99 fee + 8% (rider all-in); the server is worker pay only (G40-535, 9/23). "
             "RULED 10/13: the WEB adopts the server's model")):
        diff = [r for r in offer[kind] if not r["same"]]
        if diff:
            ex = diff[min(1, len(diff) - 1)]
            WARNS.append("APP DIVERGENCE %s suggested %s offer: %d of %d cases differ (e.g. %s: web %s, server %s) - %s"
                         % (tag, kind, len(diff), len(offer[kind]),
                            ex.get("cost", ex.get("trip")), ex["web"], ex["server"], why))


def fee_table(src, name):
    m = re.search(r"\b" + name + r"\b\s*=\s*\{", src)
    if not m:
        return None
    st = m.end() - 1
    d, j = 0, st
    while j < len(src):
        if src[j] == "{":
            d += 1
        elif src[j] == "}":
            d -= 1
            if d == 0:
                break
        j += 1
    return dict(re.findall(r"([A-Za-z_]+)\s*:\s*([0-9.]+)", src[st:j + 1]))


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
        # ⚠️ Strip BLOCK comments as well as line comments. The field regex matches
        # any `word:` , so a single explanatory /* … declared: … */ inside the state
        # literal invented a state field called "declared" and reported it as
        # undocumented drift. Caught 2026-08-25. A comment must never be able to
        # create a finding — that is noise that trains people to ignore the warning.
        body = re.sub(r"/\*.*?\*/", "", src[k:j + 1], flags=re.S)
        body = re.sub(r"//[^\n]*", "", body)
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
                    "scoped:module.exports.CATEGORY_SCOPED_KEYS,"
                    "bad:module.exports.assertInvariants()})")
        except Exception as e:
            M = None
            check(False, "shared flow-rules module runs", str(e)[:160])
        if M:
            check(not M["bad"], "flow-rules module passes its own invariants",
                  "; ".join(M["bad"]))
            M_SCOPED = M["scoped"]
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

        # ---- step gates: which rules block Continue -----------------------
        # NOT extracted into the shared module yet — that is Phase 3 — but the
        # reason has CHANGED and the old one is retired. It used to read: "the
        # canonical flow doc is SILENT on which is correct." It is not silent;
        # it documents ID-at-the-exchange and was read wrongly (searching for
        # "identity"/"verification" and finding neither is not the same as canon
        # having no rule). Owner ruled 2026-08-22: BOTH surfaces gate identity at
        # step 2, and connect-flows-granular.html now carries the dated row.
        # ⚠️ A surface that yields an EMPTY gate set used to be dropped here in
        # silence, which is how the prototype sat outside every gate assertion
        # without anyone noticing (found by App Prototypes 2026-08-22). It is not
        # a parse failure: the prototype's stepGate() returns {ok, sel, msg} with
        # NO `label:` key, so the label-keyed extractor legitimately finds nothing.
        # Dropping it is still correct — comparing labels to nothing is noise — but
        # it must be ANNOUNCED, and that surface then needs its own assertion below.
        gate_sets = {}
        shapeless = []
        for name, rel in SURFACES.items():
            gs = surface_gates(read(rel))
            if gs is None:
                check(False, "%s exposes a stepGate() the harness can read" % name,
                      "no function stepGate( found — the gate comparison silently "
                      "skipped this surface")
            elif not gs:
                shapeless.append(name)
            else:
                gate_sets[name] = gs
        # ⚠️ A surface with no readable labels is EITHER rewired to the shared
        # module (good — the module's own tests own the rules) OR label-less by
        # shape (the prototype). Those are not the same thing and must not be
        # reported the same way.
        #
        # This distinction was added because Phase 3 exposed the failure: once
        # Request and Connect delegated, surface_gates() found no labels on them,
        # every ruled-gate assertion below silently stopped running, and the
        # harness reported PASS while checking NOTHING. Same silent-drop shape as
        # the prototype hole found earlier the same day — a second instance in one
        # file, for a different reason.
        DELEGATES = {}
        for name in shapeless:
            body = read(SURFACES[name])
            loads = 'assets/js/gopher-step-gates.js' in body
            uses = 'GopherStepGates.evaluate' in body
            DELEGATES[name] = loads and uses
            if DELEGATES[name]:
                # A rewired surface must NOT also keep a private copy of the rules.
                i = body.find("function stepGate(")
                blk = ""
                if i >= 0:
                    j = body.index("{", i); d, k = 0, j
                    while k < len(body):
                        if body[k] == "{": d += 1
                        elif body[k] == "}":
                            d -= 1
                            if d == 0: break
                        k += 1
                    blk = body[i:k + 1]
                inline = len(re.findall(r"ok:\s*false", blk))
                # ⚠️ `uses` is a substring test, so DEAD delegation code still
                # satisfies it: inserting `return {ok:true};` before the call left
                # the harness green while every gate was disabled. Caught by
                # mutation testing. The shim itself must never return a bare pass —
                # only the MODULE decides ok:true — so an ok:true literal inside
                # stepGate means something is short-circuiting it.
                shortcircuit = re.search(r"ok:\s*true", blk)
                check(not shortcircuit,
                      "%s's shim does not short-circuit the module" % name,
                      "stepGate returns ok:true itself — only the module may do that; "
                      "the delegation call below it would be dead code")
                check(inline <= 1,
                      "%s DELEGATES its step gates to the module (no private copy)" % name,
                      "stepGate still holds %d inline rules — delegation that leaves the "
                      "old rules behind is duplication with extra steps" % inline)
                check(loads and uses,
                      "%s loads AND calls gopher-step-gates.js" % name,
                      "loads=%s uses=%s" % (loads, uses))
            else:
                check(True, "%s uses a label-less gate shape — asserted by condition "
                            "below, not by comparison" % name)
        # Only meaningful while a surface still carries readable inline labels.
        # Once both are rewired this block is skipped -- and the assertions that
        # replace it are the module's own tests (test-step-gates.js, 56 of them)
        # plus the delegation checks above. Said explicitly so an empty section
        # cannot be mistaken for a passing one.
        if not gate_sets:
            check(True, "step-gate rules now live in gopher-step-gates.js — "
                        "asserted by test-step-gates.js, not by cross-surface diff")
        if "request" in gate_sets and "connect" in gate_sets:
            only_r = sorted(gate_sets["request"] - gate_sets["connect"])
            only_c = sorted(gate_sets["connect"] - gate_sets["request"])
            check(True, "step gates compared (request %d / connect %d)"
                  % (len(gate_sets["request"]), len(gate_sets["connect"])))
            # RULED gates are a hard failure, not a warning. A warning that
            # clears when the fix lands guards nothing: remove the gate again and
            # it merely returns to WARN, which is the state people scroll past.
            # Anything NOT yet ruled on stays a warning — this asserts the
            # decisions that exist, and flags the ones that do not.
            # ⛔ (2, "Identity verification") was RULED here on 2026-08-22 and REMOVED
            # from both web surfaces on 2026-08-23 (owner, G40-410 / trustshield-gate-
            # removal-interim.md §8.1): iDenfy is being retired, so TrustShield becomes
            # voluntary and the Gopher's physical ID check at the door remains the
            # compliance control. Listing it here would fail a surface for obeying the
            # current ruling. Deliberately NOT re-added — the module's assertInvariants()
            # and test-step-gates.js now assert its ABSENCE on request/connect, which is
            # where that guard belongs (both web surfaces delegate, so this block does
            # not even execute for them today).
            RULED_GATES = {
                (4, "Addresses"):             "data quality — same ruling",
                (6, "Addresses"):             "data quality — same ruling",
                (6, "Schedule time"):         "data quality — same ruling",
            }
            for g, why in sorted(RULED_GATES.items()):
                check(g in gate_sets["connect"],
                      "connect enforces the RULED gate: step %d %s" % g,
                      "" if g in gate_sets["connect"] else
                      "gate is missing — %s. Removing it does not merely diverge from "
                      "Request: the backend refuses these orders anyway "
                      "(trust_shield_required, controllers/order/create.js), so the user "
                      "hits a 403 naming a remedy this surface would not offer." % why)
                check(g in gate_sets["request"],
                      "request enforces the RULED gate: step %d %s" % g,
                      "" if g in gate_sets["request"] else "gate is missing — %s" % why)

            # ⚠️ The label check above catches a DELETED or RENAMED gate but not a
            # DISABLED one. Proven, not assumed: `if(false && …)` in front of the
            # identity gate left the label in place and the harness stayed green.
            #
            # A first attempt at a fix searched the WHOLE FILE for the guard tokens
            # and was ALSO useless — every token still occurs elsewhere, so all three
            # mutations passed. The search has to be scoped to the gate's own block.
            # Still source-text matching; executing stepGate() is the real answer and
            # is Phase 3 work.
            def gate_block(body, label):
                """The source of the `if` that returns this gate, or None."""
                i = body.find("label:'%s'" % label)
                if i < 0:
                    return None
                # Walk back to the OUTER `if(state.step …)`, not the nearest `if(`.
                # The nearest one is the gate's INNER test (`if(!(hasTS || idDone))`,
                # `if(pk.some(…))`), whose block does not contain the tokens being
                # asserted — a first version made exactly that mistake and failed on
                # correct code, which is how it was caught.
                # Both spellings occur — `if(state.step === 2 …)` and
                # `if((state.step === 4 || state.step === 6) …)`. Take whichever is
                # NEAREST the label, not whichever is tried first: ordering them
                # wrongly picks up an earlier, unrelated gate whose block does not
                # contain these tokens, and reports a failure on correct code.
                j = max(body.rfind("if(state.step", 0, i),
                        body.rfind("if((state.step", 0, i))
                if j < 0:
                    return None
                depth, k = 0, body.find("{", j)
                if k < 0:
                    return None
                while k < len(body):
                    if body[k] == "{":
                        depth += 1
                    elif body[k] == "}":
                        depth -= 1
                        if depth == 0:
                            break
                    k += 1
                return body[j:k + 1]

            # "Identity verification" was checked here until 2026-08-23. Its tokens
            # guarded an INLINE gate that no longer exists on either web surface (the
            # gate was removed by owner ruling, and both surfaces delegate to the module
            # regardless). Keeping it would assert tokens for a gate that is gone.
            GUARDS = {
                "Addresses": (
                    # The character class is pinned deliberately. Renaming normAddr
                    # would throw at runtime and get noticed; SILENTLY WEAKENING the
                    # normaliser would not — drop the punctuation strip and
                    # "123 Main St, Raleigh" stops matching "123 main st raleigh",
                    # so two identical addresses sail through. That is the mutation
                    # worth catching, and the token list missed it until this line.
                    ["normAddr", "pickupStops.map", "dropoffStops.map", "dp.includes",
                     "toLowerCase()", "[^a-z0-9]+"],
                    "the addresses-must-differ comparison",
                ),
            }
            for name in ("request", "connect"):
                body = read(SURFACES[name])
                for label, (tokens, human) in GUARDS.items():
                    blk = gate_block(body, label)
                    if blk is None:
                        check(False, "%s keeps %s intact" % (name, human),
                              "could not locate the gate block at all")
                        continue
                    absent = [t for t in tokens if t not in blk]
                    # A short-circuited condition keeps every token but stops firing.
                    dead = re.search(r"if\(\s*(false|0|!true)\b", blk) is not None
                    check(not absent and not dead,
                          "%s keeps %s intact" % (name, human),
                          "condition is short-circuited (`if(false …`) — the gate's label "
                          "is still present, so the label check cannot see this"
                          if dead else
                          "missing from the gate's OWN block: %s — the label may still be "
                          "present while the condition has been gutted" % ", ".join(absent))

            unruled_missing = [g for g in only_r if g not in RULED_GATES]
            if unruled_missing:
                WARNS.append("Connect is missing step gates Request enforces, and no ruling "
                             "covers them: %s — see PHASE-2-FINDINGS.md"
                             % ", ".join("step %d %s" % g for g in unruled_missing))
            if only_c:
                WARNS.append("Connect enforces step gates Request does not: %s"
                             % ", ".join("step %d %s" % g for g in only_c))



        # ⚠️ HOISTED OUT of the request/connect comparison on purpose. This lived
        # inside `if "request" in gate_sets and "connect" in gate_sets:` and became
        # DEAD the moment Phase 3 rewired both of them — the block stopped running
        # and these assertions vanished without a word. That is the THIRD silent
        # drop in this file in one day (the prototype missing from the ruled-gate
        # loop; the ruled-gate loop itself going vacuous on adoption; this).
        #
        # The pattern is worth stating once: an assertion nested inside a condition
        # about OTHER surfaces is an assertion that can be switched off by work
        # that has nothing to do with it. Gate checks belong at the top level.
        # The prototype is a THIRD surface and the ruled identity gate binds it
        # too, but it cannot be checked by label (see above), so it is asserted
        # by CONDITION. Scoped to its own gate line, for the same reason the
        # whole-file search was useless on the other two.
        #
        # Deliberately NOT asserted here: addresses-must-differ and
        # schedule-time. The prototype genuinely has neither, and no ruling
        # covers that — asserting them would invent a requirement rather than
        # enforce a decision. It stays a WARN below if it ever matters.
        # Scope to stepGate()'s OWN body. The same condition
        # (step===2 && delivery && ageRestricted) also appears in goNext()'s
        # age-keyword backstop, and an unscoped search matched THAT instead —
        # so a mutation to the real gate was "caught" by the wrong assertion,
        # for the wrong reason. Third time scoping has been the bug in this
        # file; the pattern is: never search a 2 MB document for a fact that
        # belongs to one function.
        proto_src = read(SURFACES["prototype"])
        _i = proto_src.find("function stepGate(")
        if _i >= 0:
            _j = proto_src.index("{", _i)
            _d, _k = 0, _j
            while _k < len(proto_src):
                if proto_src[_k] == "{":
                    _d += 1
                elif proto_src[_k] == "}":
                    _d -= 1
                    if _d == 0:
                        break
                _k += 1
            proto_src = proto_src[_i:_k + 1]
        # ⚠️ ANCHORED TO `if(` ON PURPOSE. Reported by App Prototypes, who
        # mutation-tested this assertion against their own surface and found it
        # decorative: `if(false && state.step===2 && …)` disables the gate while
        # leaving every matched substring intact, so the check stayed green. Third
        # appearance of that exact shape in two days.
        #
        # They proposed rejecting a list of falsy prefixes (`false &&`, `0 &&`,
        # `!true &&`). That closes the observed cases but not a hoisted flag
        # (`if(killSwitch && …)`), so this requires the condition to begin
        # IMMEDIATELY after `if(` — which rejects ANY prefix, known or not.
        # Still source-text matching; EXECUTING stepGate() is the honest fix and is
        # the adoption work for that surface.
        # ⛔ INVERTED AGAIN 2026-08-25 — THIRD state for this check in three days, so
        # read the DATE, not the shape. It required the gate; then required its
        # ABSENCE (G40-410, because iDenfy was being retired and under-30 had no
        # one-off path); and now requires its PRESENCE again, because TrustShield runs
        # INTERNALLY, enrolment never stops, and the owner made identity mandatory for
        # age-restricted orders with no age branch. The guard follows the ruling rather
        # than being deleted with it — which is exactly why it keeps flipping.
        # ⛔ INVERTED A FOURTH TIME 2026-10-04 (G40-581 Delivery; John via the 909 desk: "Drop your PT's one-time
        # 'Submit identification' path; the app has no such path"). The live Request app has NO identity gate on an
        # age-restricted delivery: it goes on, ID is checked at the door, and TrustShield is an optional "+Add" row.
        # So this now requires the gate's ABSENCE (read the DATE, not the shape: it required it, removed it, required
        # it again on 2026-08-25, and the app's own build ends the argument). The voluntary-but-visible reward is
        # pinned below; the one-time path is pinned ABSENT.
        pm = re.search(
            r"if\(\s*state\.step\s*===\s*2\s*&&\s*state\.category\s*===\s*'delivery'"
            r"\s*&&\s*state\.ageRestricted\s*&&\s*([^)]*)\)",
            proto_src)
        check(pm is None,
              "prototype has NO step-2 identity gate for A/R delivery (G40-581, John 2026-10-04)",
              "an identity gate is back in stepGate(). The live app has none: age-restricted deliveries go on, "
              "ID is shown at the door, TrustShield is optional.")

        # ⚠️ The check above, alone, is satisfied by DELETING THE WHOLE FEATURE —
        # idVerifiedNow() had three references and only ONE was the gate, so removing
        # all three deletes THE PERK, NOT THE GATE. Voluntary-but-VISIBLE is the ruled
        # end state, so what follows pins the REWARD rather than any one class name.
        #
        # ⚠️ REWRITTEN 2026-08-25, and the reason matters more than the rule. The first
        # version counted `idVerifiedNow` occurrences and required exactly 2. It passed
        # while the function was DEAD — its second "reference" was a COMMENT mentioning
        # the name. Same failure as the `"ts-verified" in src` test it replaced a day
        # earlier: a substring cannot tell code from prose. Both now require a CALL and
        # pin behaviour rather than spelling.
        proto_full = read(SURFACES["prototype"])
        proto_code = re.sub(r"/\*.*?\*/", "", proto_full, flags=re.S)
        # Trailing comments too, not just whole-line ones. Caught by mutation-testing:
        # `state.idSubmittedAt); // was: idVerifiedNow()` kept the mention alive and the
        # check went green on a dead function — the very hole this rewrite exists to
        # close. The (?<!:) keeps "https://" from being eaten as a comment.
        proto_code = re.sub(r"(?m)(?<!:)//[^\n]*$", "", proto_code)

        # ⛔ THE idVerifiedNow CALL-COUNT CHECK WAS REMOVED HERE, 2026-10-04, and this
        # note replaces it so the removal is not mistaken for an oversight.
        # It required `idVerifiedNow(` to appear >=2 times in comment-stripped code, as
        # "definition + >=1 live caller". After the gate came off (John 2026-10-04) its
        # only remaining caller is idOnFileOrSubmitted(), which nothing calls — so the
        # check was GREEN on a dead chain. That is strictly worse than no check: it reads
        # as coverage of a feature that no longer exists. It was written to protect a
        # gate, and the gate is gone, so repairing the count would only have re-pointed
        # it at a different dead symbol.
        # App Prototypes is deleting idVerifiedNow / identitySatisfied /
        # idOnFileOrSubmitted in a follow-up commit; this check had to go FIRST or that
        # deletion would have turned the harness red for doing the right thing.
        # What the ruling actually leaves worth guarding is the OFFER, pinned below.

        # The reward must be VISIBLE in BOTH states a verified requester can occupy:
        # carrying the badge, and having pre-cleared this one order. Web renders those
        # as two different components, so counting a single class name is the wrong test.
        ts_badge = proto_full.count('class="ts-card ok"')
        id_done  = proto_full.count('class="ar-id-done"') + proto_full.count('data-action="id-submit"')
        check(ts_badge >= 1,
              "prototype renders the TrustShield seal badge",
              "found %d — a TrustShield holder must SEE the badge they carry (the green \"TrustShield Verified\" row)" % ts_badge)
        # ⭐ THE OFFER ITSELF, which nothing else pins. With the gate gone and the
        # one-time path gone, "+Add Gopher TrustShield" is the ONLY route a requester
        # has to TrustShield on an age-restricted order -- and the server still refuses
        # under-30 unverified requesters at submit (trust_shield_required(),
        # create.js:512 / update.js:848). Deleting this row would therefore leave the
        # harness green while removing the only way to avoid that refusal. Checking it
        # RENDERS is not enough: a row with no action is a dead offer, so the handler is
        # pinned too.
        ts_add    = proto_full.count('class="ts-card add"')
        ts_action = proto_full.count('data-action="id-trustshield"')
        check(ts_add >= 1,
              "prototype renders the '+Add Gopher TrustShield' offer row",
              "found %d -- a requester WITHOUT TrustShield must still see the offer, or "
              "the only route past the server's A/R refusal is invisible" % ts_add)
        check(ts_action >= 1,
              "...and that row is wired to open verification",
              "found %d data-action=\"id-trustshield\" handler(s). The row rendering "
              "without a handler is a dead offer -- it looks available and does nothing" % ts_action)

        check(id_done == 0,
              "prototype has NO one-time 'Submit identification' path (G40-581)",
              "found %d marker(s) of the one-time submission (ar-id-done / id-submit). The app has no such path; "
              "the only identity action on Delivery is \"+Add Gopher TrustShield\u2122\"." % id_done)

        # ---- agreement with the SHARED module ---------------------------
        # gopher-step-gates.js is the extraction of these rules (2026-08-22).
        # Until a surface is rewired to consume it (Phase 3, per surface, with
        # approval), this asserts the inline copy AGREES with the module — the
        # same agree-then-adopt pattern gopher-flow-rules.js uses. Without it
        # the module is just a fourth copy.
        # Compare on LABELS, not (step, label). surface_gates() captures only
        # the FIRST label after each `state.step ===` match, so the drop-off gate
        # — the second label inside the step-4 address block — is invisible to it,
        # and addressesDiffer is attributed to step 4 rather than 6 because its
        # test reads `(state.step === 4 || state.step === 6)`. Both are extractor
        # artefacts, not surface defects: comparing steps reported a disagreement
        # that did not exist. Labels are what the user actually sees and are the
        # thing worth pinning; a MISSING gate still fails, which is the point.
        MODULE_LABELS = {
            "category":        "Service category",
            "description":     "Description",
            "costOfItems":     "Cost of items",
            "identity":        "Identity verification",
            "pickupAddress":   "Pick-up address",
            "dropoffAddress":  "Drop-off address",
            "addressesDiffer": "Addresses",
            "workerPay":       "Worker pay",
            "workerPaySubmit": "Worker pay",
            "scheduleTime":    "Schedule time",
            "waiver":          "Liability waiver",
        }
        # Labels surface_gates() structurally cannot see (second-label-in-block).
        EXTRACTOR_BLIND = {"Drop-off address"}
        mod_path = os.path.join(ROOT, "Final/assets/js/gopher-step-gates.js")
        if not os.path.exists(mod_path):
            check(False, "shared step-gate module exists",
                  "Final/assets/js/gopher-step-gates.js is missing")
        else:
            mod_src = read("Final/assets/js/gopher-step-gates.js")
            for surface in ("request", "connect"):
                # A REWIRED surface has no inline labels by design — asking whether
                # it "agrees" with the module is asking whether a copy it no longer
                # keeps still matches. Agreement is the PRE-adoption assertion;
                # delegation is asserted above and the rules are asserted by
                # test-step-gates.js.
                if DELEGATES.get(surface):
                    continue
                m = re.search(surface + r"\s*:\s*\[(.*?)\]", mod_src, re.S)
                if not m:
                    check(False, "module declares a gate list for %s" % surface, "")
                    continue
                ids = re.findall(r"'([A-Za-z]+)'", m.group(1))
                want = {MODULE_LABELS[i] for i in ids if i in MODULE_LABELS}
                want -= EXTRACTOR_BLIND
                got = {lab for (_step, lab) in gate_sets.get(surface, set())}
                missing = sorted(want - got)
                extra = sorted(got - want)
                check(not missing and not extra,
                      "%s's inline stepGate AGREES with gopher-step-gates.js" % surface,
                      ("in the module but not the surface: %s. " % ", ".join(missing)
                       if missing else "")
                      + ("in the surface but not the module: %s" % ", ".join(extra)
                         if extra else ""))


        # ---- category-scoped reset ---------------------------------------
        # Switching category must snap category-OWNED fields back to their
        # initial values, or the new category silently inherits answers the user
        # never gave it — a Junk volume tier still pricing a Delivery request.
        # Fixed in the web builds 2026-07-19; asserted here so it stays fixed.
        want_scoped = set(M_SCOPED)
        for name, rel in SURFACES.items():
            src = read(rel)
            m = re.search(r"CATEGORY_SCOPED_KEYS\s*=\s*\[", src)
            if not m:
                check(False,
                      "%s resets category-scoped fields on switch" % name,
                      "no CATEGORY_SCOPED_KEYS table — a category switch carries the "
                      "previous category's answers forward (see PHASE-2-FINDINGS.md)")
                continue
            start = m.end() - 1
            depth, k = 0, start
            while k < len(src):
                if src[k] == "[":
                    depth += 1
                elif src[k] == "]":
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            got = set(re.findall(r"'([A-Za-z0-9_]+)'", src[start:k + 1]))
            missing = sorted(want_scoped - got)
            check(not missing,
                  "%s resets all %d category-scoped fields" % (name, len(want_scoped)),
                  "" if not missing else "missing: " + ", ".join(missing))


    # ---------------------------------------------------------------- 7. FEES
    # Money constants live inline in each surface. They are NOT extracted — the
    # editions legitimately differ (Connect's A/R fee is $2.99 against Request's
    # $1.99, a documented HARD NOTE in the canonical flow doc) and fee logic is
    # the wrong thing to refactor speculatively. But a silent drift here charges
    # real customers the wrong amount, so the values are pinned.
    print("\n7. FEES — money constants match canon")
    EXPECTED_AGE_FEE = {"request": "1.99", "prototype": "1.99", "connect": "2.99"}
    for name, rel in SURFACES.items():
        src = read(rel)
        m = re.search(r"\bAGE_FEE\b\s*=\s*([0-9.]+)", src)
        want = EXPECTED_AGE_FEE[name]
        check(bool(m) and m.group(1) == want,
              "%s age-restricted fee is $%s" % (name, want),
              "" if (m and m.group(1) == want) else "found %s" % (m.group(1) if m else "nothing"))

        itf = re.search(r"INSTANT_TRANSFER_RATE\s*=\s*([0-9.]+)", src)
        check(bool(itf) and itf.group(1) == "0.08",
              "%s instant-transfer rate is 8%%" % name,
              "" if (itf and itf.group(1) == "0.08") else "found %s" % (itf.group(1) if itf else "nothing"))

        # TrustShield is a flat $1.00 on age-restricted Delivery + ALL Ride Sharing
        # (both editions; scope reconciled 2026-07-05). Assert the amount and that
        # the eligibility test still names both arms — a silent narrowing here
        # quietly overcharges verified customers.
        ts = re.search(r"tsRaw\s*=\s*[^;]{0,60}?1\.00|tsDiscount[^;]{0,80}?1\.00|TRUSTSHIELD_DISCOUNT\s*=\s*1\.00", src)
        check(bool(ts), "%s TrustShield discount is $1.00" % name)
        scope = re.search(r"ageRestricted[^;]{0,120}?'ride'|'ride'[^;]{0,120}?ageRestricted", src)
        check(bool(scope),
              "%s TrustShield scope still covers age-restricted delivery AND ride" % name)


    # Per-category Gopher fee tables. Two relationships canon asserts:
    #   1. the app prototype is the Request app, so its table must equal Request's
    #   2. "The Connect Business plan mirrors Gopher Request's base fees"
    def fee_tbl(src, name):
        m = re.search(r"\b" + name + r"\b\s*=\s*\{", src)
        if not m:
            return None
        st = m.end() - 1
        d, j = 0, st
        while j < len(src):
            if src[j] == "{":
                d += 1
            elif src[j] == "}":
                d -= 1
                if d == 0:
                    break
            j += 1
        return dict(re.findall(r"([A-Za-z_]+)\s*:\s*([0-9.]+)", src[st:j + 1]))

    req_fee = fee_tbl(read(SURFACES["request"]), "GOPHER_FEE")
    pro_fee = fee_tbl(read(SURFACES["prototype"]), "GOPHER_FEE")
    biz_fee = fee_tbl(read(SURFACES["connect"]), "GOPHER_FEE_BUSINESS")
    check(req_fee == pro_fee,
          "prototype per-category fees match Request (same product)",
          "" if req_fee == pro_fee else "differ: %s" % [
              (k, req_fee.get(k), pro_fee.get(k))
              for k in sorted(set(req_fee or {}) | set(pro_fee or {}))
              if (req_fee or {}).get(k) != (pro_fee or {}).get(k)])
    check(biz_fee == req_fee,
          "Connect Business plan mirrors Request base fees (canon)",
          "" if biz_fee == req_fee else "differ: %s" % [
              (k, req_fee.get(k), biz_fee.get(k))
              for k in sorted(set(req_fee or {}) | set(biz_fee or {}))
              if (req_fee or {}).get(k) != (biz_fee or {}).get(k)])

    app_section()

    print()
    for w in WARNS:
        print("  [WARN] " + w)
    print("\nPARITY: %s (%d failure%s, %d warning%s)" %
          ("OK" if not FAILS else "BROKEN", len(FAILS), "" if len(FAILS) == 1 else "s",
           len(WARNS), "" if len(WARNS) == 1 else "s"))
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
