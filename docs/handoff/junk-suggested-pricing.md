# Junk Removal — Suggested Pricing (volume-tier model + learning loop)

_Owner directive 2026-07-19. Companion to `G40-122-smart-pricing-ml-enhancement.md`
(the broader smart-pricing epic) and `G40-113-suggested-offer-used.md` (the
`suggested_offer_used` Y/N signal). Model + seam live in the shared
`Final/assets/js/gopher-request-logic.js`; UI in `gopher-request.html` +
`gopher-connect.html`._

## Why Junk is different from Delivery

Delivery's `suggestedOffer()` calibrates worker-pay off the structured **item
cost** column — a clean numeric axis. **Junk has no item cost.** It prices on how
much stuff there is: a single couch vs. a garage cleanout vs. a full trailer. So
Junk gets its own model keyed on a **volume tier**, not a dollar input.

## The three tiers (owner-specified UX)

iQ reads the description, **pre-selects** the detected tier as a button, and shows
the other two beside it so the requester can **correct** a wrong guess. Selecting a
tier re-ranges the standard iQ offer slider to that tier's band.

| Tier key | Button label | Baseline suggested (fair) | Slider band (low / generous) |
|----------|--------------|---------------------------|------------------------------|
| `single` | Single item | **$40** | $30 / $50 |
| `half` | Half-truck load | **$60** | $45 / $75 |
| `full` | Full truck/trailer load | **$100** | $75 / $125 |

_Fair values set by owner (John, 2026-07-19). `single`/`half` were nudged up from
their pure data anchors (~$25/$50) so the tiers spread cleanly; `full` sits on the
p80 envelope._

`low`/`generous` are derived as ±25% of the (possibly learned) `suggested`, rounded
to $5 — the same `low = 0.75×suggested` gate Delivery uses for the low-offer notice.
Default tier when nothing is detected = `half` (the median), so the slider always
opens somewhere sane.

## Where the baseline numbers came from (calibration)

Calibrated **offline** from **715 real Junk Removal orders** in
`Dashboard/data/master/Orders.csv`, keyed on **`GOPHER OFFER`** (worker pay — NOT
`GOPHER EARNINGS`, which is the platform's net take). Whole-corpus pay envelope:

```
p20 $23 · p35 $30 · p50 $40 · p65 $50 · p80 $100 · p90 $125   (N=714, $1000 outlier dropped)
```

The fair values are **owner-set** ($40/$60/$100, John 2026-07-19), informed by this
envelope — `single`/`half` nudged above their pure data anchors (~$25/$50) so the
tiers spread cleanly, `full` on the p80 band. Monotonic by construction.

**Why we anchor to the distribution, not to volume language back-fit:** 467 / 715
historical orders carry no parseable volume phrase, and a text back-fit came out
**noisy and non-monotonic** (a first pass priced "full load" *below* "single item").
The clean per-tier curve is meant to be **learned forward**, where the flow captures
the tier as a structured field — not reverse-engineered from messy past free-text.

## The learning process (what "begins" now)

Forward-learning store in `localStorage` (`gopher_junk_pay_learn_v1`), shape
`{ <tier>: { sum, n, ids{} } }`:

- **`recordJunkOffer(tier, pay, id)`** — record one completed Junk job's accepted
  worker-pay against its tier. `id` (order id) dedupes; idempotent.
- **`ingestJunkCompletions([{id, tier, pay}])`** — bulk seed from a surface's
  completed-request history. The Final apps call this once on first junk-modal open,
  detecting the tier from each completed job's text — exactly what production does.
- **`suggestedJunkOffer(tier)`** — returns the baseline **blended** with the learned
  mean, weighted `w = n/(n+8)`: the baseline holds until ~8 real completions exist
  for a tier, then observed reality takes over. One outlier can't swing it. Result
  carries `learnedSamples` + `baseline` for debugging.

So the suggestion sharpens per-tier as real Junk jobs complete, resolving the
"past text is too noisy to tier" problem with clean structured future data.

### Tier detector

`detectJunkVolumeTier(text)` → `{ tier, confidence }`, priority `full > half >
single`, falling back to `half` (low confidence) when nothing matches. Keyword
groups (grow these as needed — they're the one thing most worth tuning):

- **full**: full truck/trailer/load, truckload, whole house/garage/basement/room,
  entire house/apartment, 10+/20 bags, dumpster, huge/massive pile, multiple rooms
- **half**: half truck/load, pickup truck, garage/basement/room cleanout, several
  large pieces, multiple items, 5–9 bags
- **single**: single item, one couch/chair/…, a(n) (old) couch/mattress/appliance/…,
  just a/one, small pile, few bags, 1–4 bags

## Wiring (both Final apps, shared module)

- `aiPaySuggest` visibility opened to `junk` (was Delivery/Ride only).
- `getCurrentOfferModel()` returns `suggestedJunkOffer(currentJunkTier())` for junk —
  so the **low-offer Continue gate reuses the same tiered band** as the modal.
- The offer modal's model setup is refactored into a re-callable `applyModel(m)`;
  the tier buttons call `applyModel(suggestedJunkOffer(tier))` to re-range the slider.
- `state.junkTier` persists the resolved tier on submit (iQ-detected if never tapped),
  ready to feed `recordJunkOffer` at completion.

## BACKEND SEAM (for the production dev)

Swap the `localStorage` store for a query over **completed orders grouped by
detected/stored tier**, behind the unchanged `suggestedJunkOffer()` /
`recordJunkOffer()` seam. Persist the chosen `junkTier` on the order at submit; call
`recordJunkOffer(tier, finalWorkerPay, orderId)` on completion. The tier detector
(or a better ML classifier) can run server-side on the description at order time.

## Regenerating the baseline

```python
# From repo Documentation/ root:
import csv, re, statistics
rows = list(csv.DictReader(open("Dashboard/data/master/Orders.csv", encoding="utf-8", errors="replace")))
num = lambda x: float(str(x).replace('$','').replace(',','').strip() or 0)
TITLE = re.compile(r'^\s*(junk\s*removal|trash\s*removal|other\s*-\s*(junk|trash|haul|debris|dump))', re.I)
TXT   = re.compile(r'\b(junk|haul away|to the dump|debris|cleanout|clean[- ]?out|dispose|scrap|dumpster|get rid of|throw away|old (couch|mattress|furniture|appliance))\b', re.I)
DEL   = re.compile(r'\b(grocery|from (walmart|target|store|costco)|food order|order from)\b', re.I)
offs = []
for r in rows:
    t = (r.get('TITLE','') or ''); blob = t+' '+(r.get('DESCRIPTION','') or '')+' '+(r.get('SPECIAL INSTRUCTION','') or '')
    if (TITLE.search(t) or TXT.search(blob)) and not DEL.search(blob):
        o = num(r.get('GOPHER OFFER'))          # worker pay — NOT GOPHER EARNINGS
        if 0 < o <= 600: offs.append(o)
offs.sort(); q = lambda p: offs[min(len(offs)-1, int(p*len(offs)))]
# single≈q(.30), half≈q(.55), full≈q(.82); round suggested to $5.
```

Re-anchor the three `JUNK_TIERS[*].suggested` values if the corpus shifts materially;
the learned blend then re-converges from there.
