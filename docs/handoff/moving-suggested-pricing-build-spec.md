# Moving — Suggested Pricing: BUILD SPEC

**For:** Website Updates session.
**From:** Gopher iQ session, 2026-08-09. Discovery + calibration: `docs/handoff/moving-suggested-pricing-discovery.md`
(read §4–§6 before changing any number — the anchors are evidenced, not guessed).
**Pattern being mirrored:** `docs/handoff/junk-suggested-pricing.md` and the live Junk implementation.
**Nature:** front-end prototype work in the shared logic module + both Final apps. **No fee-engine,
matching, payout, or persistence changes.** Nothing here touches live production behaviour.

> # ✅ RECALIBRATED AGAINST MARKET DATA — 2026-08-09 (D7)
>
> The original internal anchors ($60/$100/$200) are **withdrawn**. Owner ruled **option B**: reprice
> *and* split the top tier, per the taxonomy in `Gopher_iQ_Moving_Price_Intelligence_Blueprint.docx`.
>
> | Tier | Key | **Anchor** | Market benchmark it tracks |
> |---|---|---|---|
> | A few items — no truck | `few` | **$100** | below the 2-mover/2-hour market minimum ($254); a one-worker, 1–2 hour job |
> | A truck-load | `truck` | **$250** | **U-Haul Moving Help NC average $254** (2 movers, 2 hrs) |
> | 1–2 bedroom home | `home_small` | **$325** | HireAHelper Raleigh: 1BR apt $287 · 2BR apt $331 · 2BR house $390 |
> | 3+ bedroom home | `home_large` | **$475** | HireAHelper Raleigh: 3BR apt $386 · 3BR house $455 · 4BR $545 · 5BR $645 |
>
> Monotonic: **$100 < $250 < $325 < $475**. Sources now filed at
> `Dashboard/Gopher iQ/Suggested Pricing/`.
>
> **Why they moved:** the internal corpus is *accepted* prices only. Just 47–50% of Moving requests
> ever match and unmatched jobs sit 43–60% below matched ones, so "median accepted" was the price at
> which a coin flip clears. Compounding it, the **lead worker is paid the offer and pays the crew** —
> $100 for a 2-person 2-hour job is $25/labor-hour split two ways against a ~$63 market. Gopher was
> sitting at **~40% of market**.
>
> **D1 is amended by this ruling:** the two upper tiers use **bedroom** language, because that is how
> the market prices and how the seed data is shaped. The two lower tiers keep item/truck language.
>
> ⚠️ **Two follow-ons NOT yet ruled — see §6 and §7-D4.** The market data also says stairs add
> **+1 hr per flight** (vs my +15%/+25%, measured on the thin internal corpus) and that drive distance
> adds **+0.5–3 hrs**, which directly contradicts **D4** ("never price on distance"). D4 rested on F4,
> which was measured on the same under-priced accepted-price data that produced the bad anchors — so
> it is suspect for exactly the same reason. **Recommend revisiting both.**

**Owner decisions (2026-08-09) — locked, do not re-litigate:**

| | Decision |
|---|---|
| D1 | **Three tiers**, named in **item / truck** language (not home size) |
| D2 | **One shared ladder** for both routes — routes differ in *questions asked*, not anchors |
| D3 | Structured fields (stairs, elevator, item count) may act as **modifiers**; the **description drives the base tier** |
| D4 | Trip distance on the two-location route: **show as context, never price on it** |
| D5 | Anchors are **owner-set** — the values in §3 are the approved proposals |
| D6 | The `few` anchor **holds at $60** after the corpus correction — settled, build to $60 |

---

## 0. Scope — both apps, mirrored

Junk is implemented identically in **`Final/gopher-request.html`** and **`Final/gopher-connect.html`**,
with the shared logic in **`Final/assets/js/gopher-request-logic.js`**. Moving must be mirrored the
same way. Both apps already expose the Moving route toggle (`noSpecificPickup` visible for
`['delivery','moving']` in both), so there is no per-app divergence to design around.

**Line numbers below are as of 2026-08-09 — locate by symbol, not by line.**

---

## 1. Integration points (all three must agree)

| # | File | Symbol | Change |
|---|---|---|---|
| 1 | both apps | `FIELD_HIDDEN_FOR.aiPaySuggest` | remove `'moving'` from the hidden list |
| 2 | both apps | `PRICED_CATEGORIES` | add `'moving'` |
| 3 | both apps | `#osJunkTiers` render block | generalise to serve Moving too |
| 4 | logic module | new `MOVING_TIERS`, `detectMovingTier`, `suggestedMovingOffer`, `recordMovingOffer`, `ingestMovingCompletions` | new exports |
| 5 | both apps | `currentMovingTier()`, `getCurrentMovingModel()`, `seedMovingLearningOnce()` | mirror the Junk trio |
| 6 | both apps | `state.movingTier` + serialisation list | new state field |

> ⚠️ **#2 is the one that gets missed.** The comment above `PRICED_CATEGORIES` says so explicitly:
> *"ONE list, because three things must agree: the suggested-offer modal, the low-offer Continue gate,
> and the `suggested_offer_used` telemetry on submit. Junk joined 2026-07-19 (INV-JUNK-TIER) and the
> telemetry was missed."* Add `'moving'` to that list or the modal will work while the gate and the
> telemetry silently don't.

---

## 2. Shared module — `assets/js/gopher-request-logic.js`

Add alongside the Junk block. Reference implementation:

```js
/* ── Moving suggested pricing (owner 2026-08-09) ────────────────────────────
   Ladder is items/truck, NOT home size: home size appears in 2% of real
   descriptions, named items in 47%, a vehicle in 38%. Calibration + the
   monotonicity result: docs/handoff/moving-suggested-pricing-discovery.md   */
var MOVING_TIERS = {
  few:        { label: 'A few items',      suggested: 100,
                hint: 'a couple of pieces \u2014 no truck needed' },
  truck:      { label: 'A truck-load',     suggested: 250,
                hint: 'a U-Haul, trailer or pod \u2014 or enough to need one' },
  home_small: { label: '1\u20132 bedroom home', suggested: 325,
                hint: 'studio, apartment, condo or small house' },
  home_large: { label: '3+ bedroom home',  suggested: 475,
                hint: 'a larger house, or an office move' }
};
var MOVING_TIER_ORDER = ['few','truck','home_small','home_large'];

/* Priority home_large > home_small > truck > few. Falls back to 'truck' (the
   median tier) so the slider still opens somewhere sensible and the requester
   can re-pick in one tap.
   Bare "house" resolves LARGE and bare "apartment" resolves SMALL: houses skew
   bigger in the market data (Raleigh 2BR house $390 vs 2BR apt $331), and
   erring low is the failure mode this recalibration exists to fix. */
function detectMovingTier(text){
  var t = ' ' + String(text || '').toLowerCase() + ' ';
  if(/\b([3-9]|1[0-9])\s*(bed|br|bedroom)s?\b|\b(three|four|five)[- ]bedroom\b|\b(whole|entire|full)\s+(house|home)\b|\bresidential relocation\b|\b(large|big)\s+(house|home|move)\b|\boffice move\b|\brelocate office\b|\bmove cubicles\b|\bmove (my|our) (house|home)\b|\bhouse to house\b/.test(t))
    return { tier: 'home_large', confidence: 'high' };
  if(/\b(studio|efficiency)\b|\b([12])\s*(bed|br|bedroom)s?\b|\b(one|two)[- ]bedroom\b|\b(whole|entire)\s+apartment\b|\bapartment to apartment\b|\bmove (my|our) (apartment|condo)\b|\bmove (in)?to (a |an )?(new )?(apartment|condo)\b|\bmove out of (my |the )?apartment\b|\bmoving across town\b/.test(t))
    return { tier: 'home_small', confidence: 'high' };
  if(/\b(u-?haul|uhaul|box truck|moving truck|trailer|pod|storage unit|storage|load(ing)?|unload(ing)?|need (a )?truck|truck required|will need (a )?truck|dorm|college move|student move|piano|appliances?|bedroom furniture|labor only)\b/.test(t))
    return { tier: 'truck', confidence: 'high' };
  if(/\b(couch|sofa|loveseat|mattress|dresser|desk|table|nightstand|chair|headboard|bookcase|tv|boxes?|rearrange|pack(ing)?|unpack|wrap furniture|small move|a few (items|things|pieces))\b/.test(t))
    return { tier: 'few', confidence: 'high' };
  return { tier: 'truck', confidence: 'low' };   // median-ish tier — see §5
}

/* Stairs. ⚠️ RECOMMENDED CHANGE, NOT YET RULED — see the banner. Shipped value
   is +15% one end / +25% both, measured on the (thin, under-priced) internal
   corpus. The market seed data says a flight of stairs adds +1 HOUR per flight
   (U-Haul), which on a 2-crew-hour job implies far more than 15%. Recommend
   +20% one end / +35% both as a grounded middle, pending an owner ruling. */
function suggestedMovingOffer(tier, opts){
  opts = opts || {};
  var base = MOVING_TIERS[tier] || MOVING_TIERS.truck;
  var suggested = base.suggested, learnedN = 0;
  var b = movingLoadLearn()[tier];
  if(b && b.n > 0){                                  // same shrinkage as Junk
    var learnedMean = b.sum / b.n, K = 8, w = b.n / (b.n + K);
    suggested = base.suggested * (1 - w) + learnedMean * w;
    learnedN = b.n;
  }
  var ends = (opts.pickupStairs ? 1 : 0) + (opts.destStairs ? 1 : 0);
  if(ends === 1) suggested *= 1.15;
  else if(ends >= 2) suggested *= 1.25;
  var r5 = function(x){ return Math.round(x / 5) * 5; };
  suggested = r5(suggested);
  return {
    tier: (MOVING_TIERS[tier] ? tier : 'truck'),
    label: base.label, hint: base.hint,
    low: r5(suggested * 0.75), suggested: suggested, generous: r5(suggested * 1.25),
    learnedSamples: learnedN, baseline: base.suggested, stairsEnds: ends
  };
}
```

`recordMovingOffer` / `ingestMovingCompletions` / `movingLoadLearn` are **straight copies** of the
Junk functions with the store key **`gopher_moving_pay_learn_v1`**. Export all five on
`window.GopherRequestLogic` alongside `MOVING_TIERS` and `MOVING_TIER_ORDER`.

**Item-count promotion (D3).** If the flow's item count is available and `>= 8`, promote `few` →
`truck` before pricing. ⚠️ **The threshold of 8 is an unvalidated default** — item count appears in
only 12% of historical descriptions, so there was nothing to calibrate against. Tune it after ~20
real completions and record the change in the discovery doc.

---

## 3. The numbers (owner-approved, D5)

| Tier | Key | Anchor | Derivation |
|---|---|---|---|
| A few items — no truck | `few` | **$100** | below the 2-mover/2-hour market minimum ($254); sized for a one-worker 1–2 hour job |
| A truck-load | `truck` | **$250** | **U-Haul Moving Help NC average $254**, 2 movers / 2 hrs — the same job unit |
| 1–2 bedroom home | `home_small` | **$325** | HireAHelper Raleigh 1BR apt $287 · 2BR apt $331 · 2BR house $390 |
| 3+ bedroom home | `home_large` | **$475** | HireAHelper Raleigh 3BR apt $386 · 3BR house $455 · 4BR $545 · 5BR $645 |

Band is ±25% of the (possibly learned) suggested, rounded to $5 — identical to Junk, so the two
categories behave the same way.

**Envelope — clean corpus, N = 155** (keyed on `GOPHER OFFER`, never `GOPHER EARNINGS`):

```
p25 $60 · median $100 · p60 $100 · p75 $150 · p90 $200 · max $390
```

> ⚠️ **Corpus corrected 2026-08-09, after the first draft.** The original selector
> (`TITLE startswith "moving"`, N=215) swept in 38 legacy `Moving / Junk Removal - Junk Removal` rows
> (median $40 — Junk jobs) and 22 `Store Pick Up & Delivery` rows. **The anchors did not move:** the
> clean data hits $100 and $200 exactly, and clean p25 lands exactly on the $60 T1 anchor. Full
> working and the audit trail: `Suggested Pricing Data - Moving.xlsx`, and §4b of the discovery doc.

**Monotonic on real data — $80 < $100 < $200** (detected-tier medians, clean corpus). This is the
test Junk's text back-fit failed. Any change to the tier regexes must keep it monotonic; §6 has the
assertion.

---

## 4. Page wiring (both apps)

Mirror the Junk trio, which sits just above `PRICED_CATEGORIES`:

```js
function currentMovingTier(){
  const L = window.GopherRequestLogic;
  if(state.movingTier && L && L.MOVING_TIERS && L.MOVING_TIERS[state.movingTier]) return state.movingTier;
  return (L && L.detectMovingTier) ? L.detectMovingTier(state.description || '').tier : 'truck';
}
function getCurrentMovingModel(){
  const L = window.GopherRequestLogic;
  if(!L || !L.suggestedMovingOffer) return null;
  return L.suggestedMovingOffer(currentMovingTier(), {
    pickupStairs: !state.noSpecificPickup && !!state.pickupStairs,
    destStairs:   !!state.destStairs
  });
}
```

> 🚨 **`state.description`, NOT `state.describe`.** `describe` is only a key in the
> `FIELD_HIDDEN_FOR` visibility map. Reading it returns `undefined`, the detector silently defaults
> every request to the median tier, and **nothing appears broken** — exactly the bug that made every
> Junk request price at $60 regardless of what the requester wrote (fixed 2026-07-19). If the Moving
> suggestion ever looks suspiciously constant at $100, check this first.

**Route handling (D2 / D4).** The route does **not** change the anchor. It changes two things:

- `pickupStairs` is only meaningful on Route B — gate it on `!state.noSpecificPickup`, matching how
  the flow already suppresses that field on a single-location move.
- Route B may show the existing trip-context pill (`#osTripContext`, currently ride-only).
  **Context only — it must never enter the arithmetic** (real data: same-ZIP moves median $115 vs
  different-ZIP $100, so distance is flat-to-inverted).

**Tier selector.** Generalise the `#osJunkTiers` block rather than duplicating it — it already
renders from a tier table, so it needs the table and the active tier swapped by category. Keep the
`aria-label` accurate per category ("How much are we hauling?" is Junk's; Moving needs its own).
On click, set `state.movingTier` and re-range the slider via `applyModel(...)`, exactly as Junk does.

**Seeding.** `seedMovingLearningOnce()` mirrors `seedJunkLearningOnce()` — filter
`DASH_DATA.previousRequests` on `/moving/i`, detect the tier from each completed job's text, record
actual worker pay. Idempotent by id.

**Describe hint.** `DESCRIBE_HINT.moving` currently reads *"…the items, the rooms, and anything heavy
or fragile."* Recommend appending **"…and whether a truck is needed"** — "needs a truck" is the
sharpest tier discriminator in the corpus (38% coverage), and the hint is the cheapest way to raise
detector coverage above today's 72%.

---

## 5. Cold start

- **28% of real descriptions carry no scope signal.** The detector falls back to the **median tier
  (`truck`, $100)**, matching Junk's behaviour, and the requester corrects it in one tap — that
  correction is what teaches the model.
- ✅ **Resolved 2026-08-09.** The first draft flagged this as an unconfirmed assumption, because
  no-signal descriptions looked like they sat at **$75** (nearer `few`). That was an artefact of the
  contaminated corpus. On the **clean corpus** no-signal descriptions sit at **$100 (n=36)** —
  exactly the median tier. **Defaulting to `truck` is empirically correct**, not just
  consistent-with-Junk. No owner ruling needed.
- Fallback ladder: unknown tier → median tier → category median. **A pricing hint must never fail
  loud** — if the module is missing, the sheet renders without a suggestion.

---

## 6. Acceptance tests

1. `detectMovingTier('move my 3 bedroom house')` → **`home_large`**.
   `('moving out of my 1 bedroom apartment')` → **`home_small`**.
   `('load my u-haul')` → `truck`. `('move a couch to the curb')` → `few`.
2. **Priority holds:** `('move a couch out of my whole house')` → `home_large` (large beats few);
   `('2 bedroom apartment, need a u-haul loaded')` → `home_small` (small beats truck).
3. **Bare-noun defaults:** `('move my house')` → `home_large`; `('move my apartment')` → `home_small`.
4. **Monotonicity across all four:** `few < truck < home_small < home_large`
   (**$100 < $250 < $325 < $475**), with an empty learning store **and** after seeding.
5. Empty/garbage description → `truck`, no throw.
6. **The `state.description` trap:** set a description that should tier `home_large`, open the sheet,
   and assert the suggestion is **$475, not the `truck` default**. A test that only checks "a number
   appeared" passes while the detector is dead.
7. Stairs: one end → +15% vs no stairs; both ends → +25% (**or the recommended +20%/+35% if the owner
   rules on it** — see the banner). Route A (`noSpecificPickup === true`) must ignore `pickupStairs`.
8. `PRICED_CATEGORIES` includes `'moving'` → the low-offer Continue gate fires on a lowball Moving
   offer, and `suggested_offer_used` is emitted on submit.
9. Trip context on Route B changes **no** suggested value (assert the number is identical with and
   without a destination address).
10. Requester taps a different tier → slider re-ranges and `state.movingTier` owns the tier from then
   on (the detector must not overwrite the correction).
11. Both apps behave identically on the same inputs.

---

## 7. Traps carried from discovery

- **Do not add a crew-size modifier.** Descriptions mentioning ≥2 people show a +88% lift, the largest
  effect measured — but the flow already collects **`workersNeeded` as crew size and that field
  already drives pricing and totals** (it is *not* the hire count; Request hires one lead worker who
  pays the crew). Applying a crew multiplier in iQ pays for the same labour twice. **Confirm where
  `workersNeeded` enters the total before revisiting.**
- **Never let the offered price feed the tier estimate.** If the offer informs the scope read and the
  read then judges the offer, the advice is self-confirming. The offer is the thing being judged.
- **Elevator is collected but not priced** — n=2 in the historical data. Leave the fields alone.
- **Mirror both apps.** A change landing in only one is the most common regression in this repo.

## 8. Out of scope

Fee logic, matching, payout, persistence, and the counter-offer cap are untouched and remain
developer-only. No production behaviour changes. The learning store stays `localStorage` — the
production backend swap happens behind the same `record/ingest/suggest` seam already documented for
Junk.
