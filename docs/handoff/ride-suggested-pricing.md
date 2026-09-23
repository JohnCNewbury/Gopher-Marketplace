# Ride Sharing — suggested pricing

**G40-535.** The written spec that did not exist. Everything below is
transcribed from `Gopher_RideShare_Suggested_Offer_Analysis_2.xlsx`
(`Documentation/Dashboard/Gopher iQ/Suggested Pricing/`) — the model, its
constants, its validation and its refinement history — plus the decisions taken
while porting it, and two things the workbook does not tell you.

**Surfaces:** `gopher-backend-api` (`helpers/suggested_pricing.js`,
`orders/smart_price`) · `gopher-mobile-request` (`needaride.json`) ·
`Final/assets/js/gopher-request-logic.js` (prototype).
Pattern followed: `G40-502-suggested-pricing-delivery.md`.

> **Verification note.** Claims are marked **VERIFIED** (I ran it, first-hand)
> or **INHERITED** (read from another session's work or another document, not
> re-derived here). Nothing is asserted from memory.

---

## 1 · The model

```
Mileage Cost = sum of (miles in each tier × that tier's rate)
Time Cost    = trip minutes × per-minute rate
Average      = (Mileage Cost + Time Cost) / 2
Base         = MAX(Flat Fee + Average, Minimum Ride Floor)
if scheduled:  Base = Base × (1 + Scheduled Uplift)
ITF          = Base × ITF%
SUGGESTED    = Base + ITF
```

| tunable input | value | source |
| --- | ---: | --- |
| Flat Gopher fee | **$2.99** | Request schedule — **see §2, this is a decision** |
| Per-minute rate | $0.55 | workbook `Recommended Model` C8 |
| Instant Transfer Fee | 8% | C9 |
| Minimum ride floor | $8.00 | C10 |
| Scheduled-ride uplift | 15% | C11 |
| Low/Generous band | ±25% | C12 |

**Tapered mileage tiers** (workbook B15:D18):

| from | to | $/mile |
| ---: | ---: | ---: |
| 0 | 5 | 2.40 |
| 5 | 15 | 1.80 |
| 15 | 40 | 1.35 |
| 40 | — | 1.05 |

**Why averaged and not summed.** The research model's own scaffolding, kept
deliberately (workbook Summary, finding 5). A long ride is expensive by *both*
measures at once, so adding them compounds the same trip twice.

**Why tapered and not flat.** The original research used a flat $2.00/mile and
ran **$10–$19 above Uber/Lyft on 19–39 mile trips** (finding 2). Every real
rideshare market prices in distance economies of scale; a flat rate cannot.

### ⛔ The band applies to the variable portion only

The ±25% multiplies **the averaged mile+time cost**, never the finished figure.
The flat fee is added *after* the multiplier, so it is **identical across Low /
Suggested / Generous**, and the $8 floor is applied after that, so it **protects
Low**.

`low = suggested × 0.75` is the obvious wrong implementation. It discounts the
platform fee at the Low end and inflates it at the Generous end, and the rail
stops widening with distance the way the workbook's does. **VERIFIED that it is
caught:** writing it that way turns 14 checks red in
`test/ride-suggested-pricing.test.js`, including all seven workbook rail rows —
while leaving `suggested` **completely unchanged**. A test pinned only to the
suggested figure would pass on the bug.

---

## 2 · ⛔ The flat fee: $2.99, decided, not transcribed

The workbook is titled *"Gopher Connect — Ride Sharing"* and prices on
**Connect's plan-based** schedule, listing both:

| | |
| --- | ---: |
| Flat Gopher Fee (**Starter** Plan) | $4.99 |
| Flat Gopher Fee (**Business** Plan) | $2.99 |

and it computed **its published validation at $4.99**.

**This ticket is the Request app** (`needaride.json`), whose ride fee is
**$2.99**, from `Gopher_Connect_Pricing.xlsx` → the **"Gopher App"** column —
the consumer schedule, explicitly *not* Connect's Standard/Business columns.
That $2.99 coinciding with Connect's Business plan is a coincidence, not the
same number twice.

### Decision — owner, 2026-09-23: **$2.99**

Three reasons, all **VERIFIED**:

1. It is what the Request app actually charges for a ride at checkout
   (`GOPHER_FEE.ride` in `Final/gopher-request.html`). Pricing a Request ride on
   a Connect plan fee builds every suggestion on a fee this app does not charge.
2. ⭐ **The owner's own reference UI renders $2.99.** A screenshot supplied
   during the build shows a trip pill of ~15.1 mi / 24 min over a rail of
   **$21 / $27 / $32**. At $2.99 the model gives 20.78 / 26.63 / 32.48 →
   **$21 / $27 / $32**. At $4.99 it gives **$23 / $29 / $35**. Pinned as a test
   fixture so the decision rests on something observable rather than on this
   paragraph.
3. The prototype has used $2.99 since the model was ported in 2026-05-28. Only
   its *comment* said $4.99 — corrected in this ticket (§7).

### ⚠️ The cost of that choice, stated plainly

The validation was re-run at $2.99. **VERIFIED** — and the transcription was
proved first by reproducing the workbook at **its own** $4.99: all seven
sample-trip rail rows to the cent, and its mean absolute error to four
decimals ($3.8887).

| flat fee | MAE vs Uber/Lyft | routes below market |
| --- | ---: | ---: |
| $4.99 (workbook) | **$3.89** | 3 of 5 |
| **$2.99 (shipped)** | **$4.11** | **4 of 5** |

MAE barely moves — but only because the workbook's own acknowledged off-peak
outlier (Raleigh → Durham, which it calls *"unusually low"*) gets **better** at
$2.99 and masks the rest. **Excluding that row: $2.19 at $4.99 against $3.00 at
$2.99.**

> ⛔ **So the workbook's published "within a few dollars of Uber/Lyft" claim is
> weaker at the fee we ship than the sheet prints.** At $2.99 the model runs
> **systematically below market**. That is recorded here rather than left for
> someone to rediscover and read as a regression.

⛔ **Do not "fix" this back to $4.99** to make the workbook's numbers line up.
Those rows are correct for Gopher **Connect**. If Connect ever gets its own
suggested pricing it wants its own registry entry and its own `model_version` —
not this constant edited.

---

## 3 · Validation against the market (at the shipped $2.99)

Five verified Raleigh-area routes, real Google Maps miles/minutes, real
Uber/Lyft quotes. **VERIFIED**, recomputed here:

| route | mi | min | market | model | diff | % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Cary → Cary | 4.3 | 13 | 14.29 | 12.66 | −1.63 | −11% |
| Durham → Durham | 8.6 | 22 | 24.45 | 19.74 | −4.70 | −19% |
| Holly Springs → Raleigh | 19.4 | 27 | 28.23 | 30.66 | +2.43 | +9% |
| Raleigh → Durham ⚠️ | 22.4 | 31 | 25.50 | 34.03 | +8.54 | +34% |
| Fuquay-Varina → Durham | 38.6 | 50 | 54.74 | 51.48 | −3.25 | −6% |
| | | | | **MAE** | **$4.11** | |

⚠️ The Raleigh → Durham quote ($25.50 for 22 miles) is flagged by the workbook
itself as unusually low and likely off-peak. The model tracks typical market,
not the cheapest obtainable quote.

---

## 4 · ⛔ The gap the workbook does not measure

**The workbook validates against Uber/Lyft market rates — not against what
Gophers actually accepted.** Delivery's equivalent check is what found a $9
pricing cliff and a 46% over-suggestion. So it was run here too.

**VERIFIED.** All 1,226 rows of the workbook's `Real Order Data` sheet. The
extraction was proved first by reproducing the workbook's own published
summary from it: 1,117 plausible orders, $20 median, $30.69 mean — all three
match. Miles from GeoNames ZIP centroids (CC BY 4.0); 658 usable pairs after
dropping same-ZIP rows.

Median model vs median real offer, at $2.99:

| miles | n | real offer | model | gap |
| --- | ---: | ---: | ---: | ---: |
| 0–2 | 23 | $25 | $8.64 | **−65%** |
| 2–5 | 110 | $20 | $10.84 | −46% |
| 5–10 | 169 | $20 | $17.06 | −15% |
| 10–20 | 241 | $30 | $27.51 | −8% |
| 20–40 | 73 | $35 | $44.13 | +26% |
| **40+** | 42 | $60 | **$115.89** | **+93%** |

**Two findings, and they point opposite ways:**

- ⛔ **Long rides over-suggest badly.** Beyond 40 miles the model suggests
  roughly **double** what requesters actually offered. This is the Ride
  analogue of Delivery's 46% over-suggestion, and it is *larger*. Real
  requesters cap long rides; the tapered tiers still compound past the point
  where anyone will pay.
- ⛔ **Short rides under-suggest badly.** Under 5 miles the model lands 35–65%
  *below* what requesters offered. Real riders appear not to offer below ~$20
  for any ride at all, regardless of distance — the $8 floor is far under the
  behavioural floor.

### ⚠️ Two caveats that bound how far this can be pushed

1. **Minutes are not in that sheet.** They were imputed from miles. **That is
   an assumption, not data**, and time is half the variable component. Run at
   18 / 25 / 35 mph the **direction is stable at both extremes** — 40+ miles
   over-suggests +66%→+133% at every speed and every fee; 0–5 miles
   under-suggests 30–65% at every speed. **The mid-range (5–20 mi) is
   assumption-sensitive and must not be quoted as measured.**
2. ⛔ **These are offers, not acceptances.** The column is `GOPHER OFFER` and
   the sheet has **no order-state column**. Delivery's check was against
   *completed* orders; this one cannot be, with this data. **It is not a
   completed-order check and must not be cited as one.**

**What would settle it:** the same comparison against completed rides in the
production DB, grouped by real Distance-Matrix miles and minutes. That is the
G40-361 feedback loop, and `iq_model_version` (§6) is what makes it possible.

---

## 5 · ⛔ THE FEE AND ITF ARE COUNTED TWICE — on the LIVE path

**Not fixed here. Fee-engine work, human-developer only.** Recorded because it
is larger than anything else in this document.

⚠️ **SCOPE CORRECTION, 2026-09-23.** The first version of this section cited
`Final/gopher-request.html` and was scoped to **the prototype**. That was too
narrow and it understated the finding. The same double-count is true of the
**live** request app and the **deployed** backend, verified first-hand against
`origin/production` after G40-535 merged. Line references below are the live
ones; the prototype exhibits the identical shape.

### The path, read as arithmetic rather than by field name

**The suggestion already contains the fee and the ITF:**

| | |
| --- | --- |
| `helpers/suggested_pricing.js:916-940` | `base = MAX(FLAT_FEE + variable×mult, MIN_RIDE_FLOOR)`, returns `base × (1 + ITF)` — `FLAT_FEE` 2.99, `ITF` 0.08 |
| `src/component/smartPriceSuggestion.js:320` | `setFieldValue("gopher_offering", v.toFixed(2))` — the **worker-pay** field |

**Checkout then applies both again** — `controllers/order/create.js`,
`exports.summary`:

| line | |
| --- | --- |
| `:69` | `combined_offering = ceil(offer) + ceil(cost_of_goods)` |
| `:80` | `application_fee = getServiceFee(category_type, appversion)` |
| `:94` | `transaction_fee = ceil((combined_offering + application_fee + trustshield_fee) × PAYOUT_FEE)` |
| `:124` | `total_charge = combined_offering + application_fee + trustshield_fee + transaction_fee − discount` |

Constants, not inferred from names: `constants/index.js:48`
`APPLICATION_FEE_NEED_A_RIDE: 299` · `:53` `PAYOUT_FEE: 0.08` ·
`helpers/functions.js:285` routes `needaride` → that fee.

### Worked example — the workbook's own 4.3 mi / 13 min validation route

Benchmarked at an **Uber/Lyft average of $14.295**:

| | |
| --- | ---: |
| model suggests, written into `gopher_offering` | **$13.00** |
| checkout `application_fee` | +$2.99 ← second time |
| checkout `transaction_fee` | +$1.28 ← second time |
| **`total_charge`** | **$17.27** |
| vs the Uber benchmark | **+$2.97 (+21%)** |
| vs the model's own intended all-in fare ($12.66) | **+$4.61 (+36%)** |

### ⛔ No order has been charged twice, and structurally none could have been

**This is a reading of the code, not an observed transaction.**

`src/pages/renderForm.js:313` does
`require("../json/" + apptype + "/" + next + ".json")` — a **dynamic require
resolved by webpack at build time**, so the schemas are **bundled into the app
binary, not fetched**. *(Scope: every non-test file under `src/` on
`origin/production`; there is no remote schema fetch.)*

`smart_price` reached `needaride.json` on **2026-09-23**, so no build predating
that can contain it. No shipped app renders the Ride iQ card, nothing posts
`request_type: "Need a Ride"` to `orders/smart_price`, and no requester has been
shown a ride suggestion.

⚠️ **So this is live-on-deploy the moment the client half ships — not a live
overcharge today.** The backend is deployed and will do this the first time a
released app asks it. The one thing to confirm is that no Request build cut
after the merge has shipped.

⚠️ **Boundary of what was verified:** the arithmetic in `exports.summary`, which
produces the `totalCharge` the requester is shown and pays. **The Stripe
PaymentIntent amount was not traced** — that is one further hop.

### Which of two things is wrong — the owner's call

Either **(a)** the model's output is the all-in rider fare, in which case it
must not populate the worker-pay field; or **(b)** it is meant to be worker pay,
in which case the fee and ITF do not belong inside it. ⚠️ **Either way the
workbook's Uber/Lyft validation is invalid as published**, because Uber quotes
are all-in rider fares and the model is being compared to them.

⚠️ **This does not change the fee decision in §2** — whichever fee sits inside
the model is the one being counted twice.

## 6 · How it is wired

### Backend — `gopher-backend-api`

| file | change |
| --- | --- |
| `helpers/suggested_pricing.js` | **The model.** `rideBand`, `rideOfferExact`, `rideMileageCost`, `rideMilesFromBody`, `rideMinutesFromMiles`, `RIDE_RATES`, `RIDE_MILE_TIERS`, `RIDE_MODEL_VERSION`. Pure — no models, no network. |
| `helpers/functions.js` | `get_distance_duration_origin_to_destination` — one Distance Matrix call returning **both** distance and duration. `get_distance_origin_to_destination` kept as a thin wrapper, unchanged in shape. |
| `controllers/common/distance.js` | `get_distance` returns `duration` **beside** `distance`. |
| `test/ride-suggested-pricing.test.js` | **New.** 82 checks. |

**Routing is G40-533's**, not this ticket's. `CATEGORY_MODELS` gains one line:

```js
'need a ride': { version: RIDE_MODEL_VERSION, price: rideBand },
```

⚠️ **`"Need a Ride"` — lowercase "a".** `needaride.json`'s
`category_type.defaultValue` (**VERIFIED**). The router normalises
`trim().toLowerCase()`, so the lookup key is `'need a ride'`. Retyping it as
`"Need A Ride"` costs nothing visible and silently drops every ride back onto
the Delivery cost curve — asserted in the client schema guard.

⛔ **`rideBand` does not set `model_version`.** The router attaches it from the
registry entry, so the version travels with the registration rather than the
maths. ⛔ **And it returns `suggested`, not `suggested_offer`** —
`suggested_offer` is the *wire* name the client reads
(`smartPriceSuggestion.js:128`); the controller maps to it once, as it already
does for Delivery.

### `iq_model_version` (AC6)

`g40-535-ride-taper-2026-09-23` — distinct from Delivery's
`g40-502-owner-anchors-2026-09-21`. ⛔ **Bump it whenever any constant moves.**
Without it, the day the tiers change every prior ride becomes unattributable
and the before/after comparison is gone for good.

### Client — `gopher-mobile-request`

| file | change |
| --- | --- |
| `src/json/requester/needaride.json` | `smart_price: { type: "smartPriceSuggestion", visible: true }`, **after** `gopher_offering`. |
| `src/helpers/getDistance.js` | also writes `tripDuration` when the server sends one. |
| `src/helpers/orderObject.js` | `formatOrderObjcet` forwards `trip_duration`. |
| `src/component/smartPriceSuggestion.test.js` | schema guard extended to `needaride.json`. |

⛔ **No `setVisible` / `setHide` action targets `smart_price` or
`smart_pricevisible`, and nothing hides the offer field.** Both asserted. This
is the G40-502 defect — three writers racing on one visibility field, with the
winner decided by React effect ordering — and it must not be recreated on a new
form. The component owns its own visibility.

⛔ **No `basis.tiers`.** Ride prices continuously on miles and minutes, not on a
tier ladder, so the shared component's tier-correction row correctly does not
render.

### Prototype — `Final/`

The model was **page-local inside `gopher-request.html`** while Delivery, Junk
and Moving all lived in the shared module — which is precisely why it was the
one that could not be imported. It now lives in
`Final/assets/js/gopher-request-logic.js`; the page keeps two thin shims that
pass its own `GOPHER_FEE.ride` and `INSTANT_TRANSFER_RATE` in as overrides, so
the prototype's checkout fee table and the pricing model still cannot drift
apart. **VERIFIED in a browser:** the ride offer modal renders $14 / $18 / $22
for the default 8 mi / 18 min trip, which is the model exactly.

---

## 7 · Minutes — the input that did not exist

Distance Matrix has always returned `duration`; the backend parsed only
`distance.text` and threw the rest away. Time is **half** the variable
component, so it had to stop being discarded.

**AC4 — every consumer checked. VERIFIED, scope stated:** across **every file
tracked on `origin/production` in `gopher-backend-api`, whole repo, no path
filter** —

- `helpers/functions.js`'s `get_distance_origin_to_destination` has exactly
  **one live consumer**: `controllers/common/distance.js`.
- The nine references in `controllers/order/retrieve.js` are **all inside
  commented-out blocks**.
- `helpers/helper.js:47` is a **second, separate definition** with its own four
  call sites that does not import the first. **Untouched.**
- Its cache `orderGeolocationBucket` is **module-private** to `functions.js`
  (declared line 25, never exported, no references elsewhere), so widening it
  cannot poison `helper.js`.

The change is therefore **purely additive**: `distance` keeps its exact previous
shape and meaning, `duration` sits beside it.

⛔ **`distance`'s shape is load-bearing and was deliberately not touched.**
`getDistance.js` compares it to the **string** `'0'` to raise the "both
addresses are the same" modal, and four more components render it straight into
`"{n} mi"`. Changing its type would break five call sites silently.

⛔ **The cache read had to change to preserve behaviour.** The old code stored
the distance itself and tested `if (bucket[key])`, so the string `'0'` hit the
cache while a numeric `0` did not. Storing an object would make every entry
truthy and start serving numeric zeroes from cache, so the read tests
`cached.distance`, not `cached`.

### When minutes are absent

An app build in the field that predates `trip_duration` sends none. Zeroing them
would **halve every suggestion** — a silent, large mispricing. So they are
estimated and the response **says so** (`basis.minutes_source`).

⭐ **The estimate is measured, not guessed:** a least-squares fit over the five
verified routes in the workbook's Validation sheet, whose miles and minutes are
real Google Maps readings — **minutes = 9.8 + 1.01 × miles, R² = 0.97**, worst
residual 3.5 minutes. The intercept is real and matters: it is the fixed cost of
any trip at all, which a flat "city driving speed" constant cannot express.

⛔ **A sent duration of `0` is treated as absent**, not as a zero-minute trip.

---

## 8 · Recalibration recipe

1. Change the constant in `RIDE_RATES` or `RIDE_MILE_TIERS` in
   `helpers/suggested_pricing.js`. They are the workbook's own labelled tunable
   inputs; nothing else is a pricing input.
2. **Bump `RIDE_MODEL_VERSION`.** Format `g40-5xx-<change>-<ISO date>`.
3. Re-run `node test/ride-suggested-pricing.test.js`. ⚠️ The workbook fixture
   runs at **$4.99** on purpose — it pins the *transcription*, independent of
   the fee we ship, and must keep passing. If a change makes it fail, the model
   has moved away from the workbook and that needs saying out loud.
4. Mirror the change in `Final/assets/js/gopher-request-logic.js` so the
   prototype and the live model stay identical.
5. Re-run §4's comparison against real orders, not just §3's against market.

---

## 9 · What is verified, and what is not

**VERIFIED first-hand:**

- The model reproduces the workbook at its own $4.99 — seven rail rows to the
  cent, MAE to four decimals. This is the proof the transcription is right.
- The band, floor, constant-fee and scheduled-uplift rules: 82/82 checks, and
  **proved able to fail** — the whole-figure band turns 14 red, removing the
  floor 9, the Connect fee 7, zeroing minutes 3, and folding the uplift inside
  the floor 1.
- The schema guard: 36/36, and proved able to fail on four separate schema
  mutations (control removed, category retyped, a visibility race added,
  declaration moved above the offer field).
- The prototype extraction, in a browser: $14 / $18 / $22 at 8 mi / 18 min.
- The `get_distance` consumer enumeration (§7).
- The real-order gap (§4), within its two stated caveats.

⚠️ **One inert assertion was found and replaced.** An earlier version asserted
the scheduled uplift is applied *before* ITF. A mutation run turned **0 checks
red** — because both are plain multipliers and commute, so that test could never
fail. It was replaced with the ordering that *can* break: the uplift goes
**after the floor**, so a short scheduled ride is 8.00 × 1.15 × 1.08 = **$9.94**
and not the bare $8.64. The model comment claiming the ITF ordering mattered was
wrong and was corrected too.

**NOT verified — do not record as done:**

- ⛔ **Nothing has run on a handset.** AC10 requires a real address pair, and
  that is the owner's device.
- ⛔ **The live endpoint has not been exercised end to end**, because the
  category routing it needs is G40-533's and had not merged when this was
  written.
- The §4 gap rests on **imputed minutes** and on **offers rather than
  acceptances**. Its extremes are robust; its mid-range is not.
