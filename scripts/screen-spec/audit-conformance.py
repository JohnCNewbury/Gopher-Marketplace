#!/usr/bin/env python3
"""
Prototype-vs-canon conformance audit.

WHY THIS IS NOT A GREP SCRIPT: a marker hit proves the concept is MENTIONED, not that it
behaves. The 5-counters-per-month allowance is the cautionary tale — the UI says "3 of 5
monthly counter-offers left" and there is no counter state anywhere behind it. A grep for
"5" would have called that a pass.

So every check declares its METHOD:
  STATIC   — source inspection. Cheap, and only ever evidence of presence/absence.
  RUNTIME  — drives the rendered prototype and observes what actually happens.
  ADVERSARIAL — tries to make the rule FAIL. A rule that cannot be violated is enforced;
                a rule that can be violated is decoration, whatever the copy says.

Verdicts: PASS · FAIL · DECORATIVE (present but unenforced) · UNKNOWN (could not settle —
reported as unknown rather than guessed).

Usage: python3 audit-conformance.py [--runs N]
Requires a local serve on 8141.
"""
import json, os, subprocess, sys, time, urllib.request, re
from collections import OrderedDict

try:
    import websocket
except ImportError:
    sys.exit("pip install websocket-client")

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9344
BASE = "http://localhost:8141/_prototypes"
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

GO = os.path.join(REPO, "_prototypes/Go/gopher-go-prototype.html")
RQ_FLOW = os.path.join(REPO, "_prototypes/Request/gopher-request-flow.html")
RQ_HOME = os.path.join(REPO, "_prototypes/Request/gopher-request-home.html")


class CDP:
    def __init__(self, ws):
        self.ws = websocket.create_connection(ws, timeout=60); self.i = 0
    def send(self, method, **p):
        self.i += 1
        self.ws.send(json.dumps({"id": self.i, "method": method, "params": p}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get("id") == self.i:
                if "error" in m: raise RuntimeError(f"{method}: {m['error']}")
                return m.get("result", {})
    def ev(self, expr):
        r = self.send("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        if r.get("exceptionDetails"):
            return {"__error": r["exceptionDetails"].get("text", "") +
                    " " + r.get("result", {}).get("description", "")}
        return r.get("result", {}).get("value")
    def close(self):
        try: self.ws.close()
        except Exception: pass


def launch():
    prof = "/tmp/_audit_profile"
    subprocess.run(["rm", "-rf", prof], check=False)
    p = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}",
                          "--remote-allow-origins=*", f"--user-data-dir={prof}",
                          "--no-first-run", "--disable-gpu", "about:blank"],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            urllib.request.urlopen(f"http://localhost:{PORT}/json/version", timeout=1); return p
        except Exception: time.sleep(0.4)
    p.kill(); sys.exit("chrome did not start")


def src(path):
    return open(path, encoding="utf-8", errors="ignore").read()


# ─────────────────────────────────────────────────────────────────────────────
RESULTS = []
def rec(cid, canon, method, verdict, evidence):
    RESULTS.append(OrderedDict(id=cid, canon=canon, method=method,
                               verdict=verdict, evidence=str(evidence)[:300]))


def audit(c):
    go, rqf, rqh = src(GO), src(RQ_FLOW), src(RQ_HOME)

    # ── D-026 counter offers ────────────────────────────────────────────────
    c.ev("load('job-detail')"); time.sleep(1.2)
    cap = c.ev("""(()=>{const r=(document.querySelector('.stage .host')||document.querySelector('.host')).shadowRoot;
      const t=r.textContent||''; return {capNote:/150% of the offer/i.test(t),
      itemExcluded:/item cost is not part of the base|Cost of Items is NOT/i.test(t)};})()""")
    m = re.search(r"coCap\s*=\s*\(([^)]*)\)\s*\?\s*Infinity\s*:\s*Math\.max\(20\s*,\s*([A-Za-z0-9_.]+)\s*\*\s*1\.5\)", go)
    rec("D-026-CAP", "cap = max($20, 1.5 x offer), OFFER ONLY", "STATIC",
        "PASS" if m else "FAIL",
        f"coCap base='{m.group(2)}' tierEscape='{m.group(1)}'" if m else "formula not found")

    beat = re.search(r"coVal\s*<=\s*amtNum", go)
    rec("D-026-BEAT", "counter must beat the offer", "STATIC",
        "PASS" if beat else "FAIL", "blocks coVal<=offer" if beat else "no must-beat guard")

    # the allowance: copy vs state
    copy_has = re.search(r"(\d+)\s+of\s+(\d+)</b>\s*monthly counter-offers", go)
    state_has = re.search(r"countersUsed|counterCount|monthlyCounter|countersLeft|counterAllowance", go)
    rec("D-026-5MO", "Standard = 5 counters/month, resets the 1st",
        "STATIC+ADVERSARIAL",
        "PASS" if state_has else ("DECORATIVE" if copy_has else "FAIL"),
        f"copy={'yes' if copy_has else 'no'} ({copy_has.group(0)[:28] if copy_has else '-'}) · "
        f"backing state={'yes' if state_has else 'NONE — the number is hardcoded'}")

    tier = re.search(r"const\s+coTiered\s*=\s*(\w+)", go)
    rec("D-026-TIER", "Elite/Elite+/Pro unlimited & uncapped", "STATIC",
        "PASS" if tier else "FAIL",
        f"coTiered seam present, hardcoded {tier.group(1)} (never exercised)" if tier else "absent")

    # ADVERSARIAL: can a counter above the cap actually be sent?
    # The counter panel is collapsed by default — .js-co toggles it. An earlier version of
    # this check reported UNKNOWN purely because it never opened the panel; that was the
    # CHECK being wrong, not the rule being unverifiable.
    c.ev("""(()=>{const r=(document.querySelector('.stage .host')||document.querySelector('.host')).shadowRoot;
      const b=r.querySelector('.js-co'); if(b) b.click(); return !!b;})()""")
    time.sleep(0.8)
    adv = c.ev("""(()=>{const r=(document.querySelector('.stage .host')||document.querySelector('.host')).shadowRoot;
      const inp=r.querySelector('.js-coin'), send=r.querySelector('.js-cosend'), rule=r.querySelector('.js-corule');
      if(!inp||!send) return {reachable:false};
      const set=v=>{inp.value=v; inp.dispatchEvent(new Event('input',{bubbles:true}));};
      const state=()=>({dim:getComputedStyle(send).opacity!=='1', rule:(rule?rule.textContent:'').slice(0,80)});
      set(999999); const over=state();          // far above the cap
      set(1);      const under=state();         // at or below the offer — must also refuse
      return {reachable:true, overCap:over, atOrBelowOffer:under, max:inp.max||null};})()""")
    if isinstance(adv, dict) and adv.get("reachable"):
        blocked_hi = adv["overCap"]["dim"] or bool(re.search(r"cap|exceed", adv["overCap"]["rule"], re.I))
        blocked_lo = adv["atOrBelowOffer"]["dim"] or bool(re.search(r"more than|higher", adv["atOrBelowOffer"]["rule"], re.I))
        rec("D-026-ENFORCE", "cap ENFORCED both ends (over-cap AND at/below offer)", "ADVERSARIAL",
            "PASS" if (blocked_hi and blocked_lo) else "DECORATIVE",
            f"over-cap blocked={blocked_hi} ({adv['overCap']['rule'][:46]}) · "
            f"at-or-below blocked={blocked_lo} ({adv['atOrBelowOffer']['rule'][:46]})")
    else:
        rec("D-026-ENFORCE", "cap ENFORCED both ends", "ADVERSARIAL", "UNKNOWN",
            f"counter panel did not open: {adv}")

    # ── INV-RATING ──────────────────────────────────────────────────────────
    rt = c.ev("""(()=>{const r=(document.querySelector('.stage .host')||document.querySelector('.host')).shadowRoot;
      const t=r.textContent||'';
      // a requester star rating shown to the WORKER violates INV-RATING
      const m=t.match(/(\\d\\.\\d)\\s*(?:\\u2605|\\u2b50|stars?|rating)/i) || t.match(/(?:\\u2605|\\u2b50)\\s*(\\d\\.\\d)/);
      return {found:!!m, sample:m?m[0]:null};})()""")
    rec("INV-RATING", "ratings never surfaced to the other party", "RUNTIME",
        "FAIL" if (isinstance(rt, dict) and rt.get("found")) else "PASS", rt)

    # ── INV-PAYOUT ──────────────────────────────────────────────────────────
    pay = c.ev("""(()=>{const r=(document.querySelector('.stage .host')||document.querySelector('.host')).shadowRoot;
      const t=(r.textContent||'');
      return {feeWordShown:/service fee|platform fee|our fee|fee of \\$/i.test(t),
              earnShown:/YOU.?LL EARN|You.ll earn/i.test(t)};})()""")
    rec("INV-PAYOUT", "worker sees Offer + Cost of Items only; zero fees", "RUNTIME",
        "PASS" if (isinstance(pay, dict) and pay.get("earnShown") and not pay.get("feeWordShown")) else "FAIL", pay)

    # ── G40-91 pre-acceptance privacy ───────────────────────────────────────
    priv = c.ev("""(()=>{const r=(document.querySelector('.stage .host')||document.querySelector('.host')).shadowRoot;
      const t=r.textContent||'';
      return {maskNoted:/unlock when you accept|exact address(es)? unlock|Prioritize/i.test(t),
              streetVisible:/\\b\\d{2,5}\\s+[A-Z][a-z]+\\s+(St|Ave|Rd|Dr|Way|Blvd|Ln)\\b/.test(t)};})()""")
    rec("G40-91", "requester anonymous / address masked until hired", "RUNTIME",
        "PASS" if (isinstance(priv, dict) and priv.get("maskNoted") and not priv.get("streetVisible")) else
        ("FAIL" if isinstance(priv, dict) and priv.get("streetVisible") else "UNKNOWN"), priv)

    # ── Ride gate ───────────────────────────────────────────────────────────
    ride = re.search(r"function\s+rideComplete\s*\([^)]*\)\s*\{([^}]*)\}", go)
    rec("RIDE-GATE", "Ride Sharing needs photos + docs + vehicle fields", "STATIC",
        "PASS" if (ride and "&&" in ride.group(1)) else "UNKNOWN",
        ride.group(1).strip()[:140] if ride else "rideComplete not found")

    # ── Tier naming (D-015) ─────────────────────────────────────────────────
    old = len(re.findall(r"\bPro\+", go)); elite = len(re.findall(r"\bElite\+", go))
    rec("D-015-TIERS", "Standard / Elite / Elite+ / Pro-as-credential", "STATIC",
        "PASS" if (elite and not old) else ("FAIL" if old else "UNKNOWN"),
        f"'Elite+'={elite}  legacy 'Pro+'={old}")

    # ── Request: one lead worker ────────────────────────────────────────────
    # NOT checked via `multiIndividual` — that is the WEB app's flag (Final/gopher-request.html).
    # The prototype encodes the rule in its hire handler and the Request-Details cap. Checking
    # the web mechanism against the prototype produced a false UNKNOWN on the first pass.
    scalar = re.search(r"act===?'hire'\s*\)\s*\{[^}]*?hired\s*:\s*([A-Za-z0-9_.]+)", rqh, re.S)
    arrays = re.search(r"hired\s*:\s*\[|hired\.push\(", rqh)
    rec("REQ-ONE-HIRE-STATE", "one hire — `hired` holds a single worker, not a list", "STATIC",
        "PASS" if (scalar and not arrays) else ("FAIL" if arrays else "UNKNOWN"),
        f"hired := {scalar.group(1) if scalar else '?'} (scalar) · list-form found={bool(arrays)}")

    # ADVERSARIAL, on the real panel: hire once, then try to hire again.
    c.send("Page.navigate", url=f"{BASE}/Request/gopher-request-home.html")
    time.sleep(5)
    second = c.ev("""(()=>{
      if(typeof window.__openReqDetails!=='function') return {reachable:false};
      window.__openReqDetails();
      const p=document.querySelector('#rdPanel'); if(!p) return {reachable:false};
      const hireBtns=[...p.querySelectorAll('[data-rd="hire"]')];
      if(!hireBtns.length) return {reachable:false, note:'no hire control in default state'};
      // Count HIRED CARDS, not UI chrome. The refusal is a toast (.rd-toast), not a modal —
      // an earlier version of this check looked for .rdm-card and produced a false FAIL.
      // State is the real evidence: if the count cannot exceed 1, the rule holds whatever
      // the UI does.
      const hiredCount=()=>document.querySelectorAll('#rdPanel .rd-card.rd-hired, #rdPanel [data-hired]').length
                        || (document.querySelector('#rdPanel')||{textContent:''}).textContent
                             .split('Hire Approved').length-1;
      hireBtns[0].click();
      const afterFirst=hiredCount();
      const again=[...document.querySelectorAll('#rdPanel [data-rd="hire"]')];
      let msg='';
      if(again.length){
        again[0].click();
        const t=document.querySelector('.rd-toast');
        msg=t?t.textContent.replace(/\\s+/g,' ').slice(0,120):'(no toast seen)';
      } else { msg='no second hire control rendered'; }
      const afterSecond=hiredCount();
      return {reachable:true, hiredAfterFirst:afterFirst, hiredAfterSecond:afterSecond,
              secondHireRefused: afterSecond<=Math.max(1,afterFirst), toast:msg};})()""")
    if isinstance(second, dict) and second.get("reachable"):
        rec("REQ-ONE-HIRE-ENFORCE", "a SECOND hire is refused", "ADVERSARIAL",
            "PASS" if second.get("secondHireRefused") else "FAIL", second)
    else:
        rec("REQ-ONE-HIRE-ENFORCE", "a SECOND hire is refused", "ADVERSARIAL",
            "UNKNOWN", second)
    c.send("Page.navigate", url=f"{BASE}/Go/gopher-go-prototype.html")
    time.sleep(4)

    # ── Request: selection modes ────────────────────────────────────────────
    sel = ("Prioritize MY Gophers" in rqf)
    rec("REQ-SELECT", "modes incl. 'Prioritize MY Gophers'", "STATIC",
        "PASS" if sel else "FAIL", f"'Prioritize MY Gophers' present={sel}")

    # ── Request: age-restricted keyword scan ────────────────────────────────
    ar = re.search(r"gopher-age-keywords|AGE_KEYWORDS|GopherAgeKeywords", rqf)
    rec("AR-KEYWORDS", "iQ age-keyword scan on the description (step 2)", "STATIC",
        "PASS" if ar else "FAIL", ar.group(0) if ar else "no keyword brain referenced")

    # ── Request: fee schedule ───────────────────────────────────────────────
    fees = {k: (k in rqf) for k in ["0.99", "1.99", "2.99", "3.99", "4.99"]}
    rec("REQ-FEES", "Request schedule $0.99-$4.99 + A/R $1.99", "STATIC",
        "PASS" if all(fees.values()) else "UNKNOWN", fees)


def run_once(n):
    global RESULTS
    RESULTS = []
    proc = launch()
    try:
        tgt = json.load(urllib.request.urlopen(f"http://localhost:{PORT}/json"))
        page = next(t for t in tgt if t["type"] == "page")
        c = CDP(page["webSocketDebuggerUrl"])
        c.send("Page.enable"); c.send("Runtime.enable")
        c.send("Emulation.setDeviceMetricsOverride", width=430, height=950,
               deviceScaleFactor=1, mobile=True)
        c.send("Page.navigate", url=f"{BASE}/Go/gopher-go-prototype.html")
        time.sleep(6)
        audit(c)
        c.close()
    finally:
        proc.kill()
    return list(RESULTS)


def main():
    runs = 3
    if "--runs" in sys.argv:
        runs = int(sys.argv[sys.argv.index("--runs") + 1])
    all_runs = []
    for i in range(runs):
        print(f"── run {i+1}/{runs} ──", flush=True)
        all_runs.append(run_once(i))

    base = all_runs[0]
    print(f"\n{'CHECK':<16}{'METHOD':<20}{'VERDICT':<13}CANON")
    print("-" * 108)
    for r in base:
        flag = "  " if r["verdict"] == "PASS" else "!!"
        print(f"{flag}{r['id']:<14}{r['method']:<20}{r['verdict']:<13}{r['canon']}")

    # determinism across runs
    keys = lambda run: {x["id"]: x["verdict"] for x in run}
    stable = all(keys(r) == keys(base) for r in all_runs)
    print("\n" + "=" * 108)
    print(f"DETERMINISM across {runs} runs: {'STABLE — identical verdicts every run' if stable else 'UNSTABLE'}")
    if not stable:
        for i, r in enumerate(all_runs):
            d = {k: v for k, v in keys(r).items() if keys(base).get(k) != v}
            if d: print(f"   run {i+1} differed: {d}")

    print("\nFINDINGS (anything not PASS):")
    for r in base:
        if r["verdict"] != "PASS":
            print(f"\n  [{r['verdict']}] {r['id']} — {r['canon']}")
            print(f"       method: {r['method']}")
            print(f"       evidence: {r['evidence']}")
    out = os.path.join(REPO, "docs", "screen-spec", "conformance-audit.json")
    json.dump({"runs": runs, "stable": stable, "results": base}, open(out, "w"), indent=1)
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
