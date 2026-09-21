# G40-502 — Suggested Pricing (Delivery, all sub-categories)

**Jira:** G40-502 · Task · Priority **Highest** · **sprint headliner** · Epic context: Gopher iQ
**Surface:** `gopher-mobile-request` (live Request app) + `gopher-backend-api` (`orders/smart_price`)
**Status:** built on two branches, **NOT merged.** One blocker remains (§5a).
**This doc is the source of truth. The ticket references it, not the other way round.**

> **Verification note.** Every claim in §1–§3 was read first-hand against
> `origin/production` on 2026-09-21 (`gopher-mobile-request` `75acb26e0`,
> `gopher-backend-api` `production`). Nothing here is inherited from another
> session except where explicitly marked **[inherited]**.

---

## 1 · What the ticket says vs. what is actually on production

The ticket says: *"There is not a current asset built for this on the live apps. You are
going to build it by simply adding in the suggested pricing component."*

**That is half right, and the half that is wrong is the part that costs money.**

| Claim | Reality on `production` |
| --- | --- |
| No suggested-pricing asset on the live app | ❌ There is one: `src/component/smartPriceSuggestion.js`, wired as renderForm control type `smartPriceSuggestion` (`renderForm.js:885`), declared in 6 live Delivery forms. |
| No live pricing model | ❌ There is one: `POST orders/smart_price` → `controllers/order/create.js:186`. |
| No below-suggested pop-up | ✅ **Correct.** There is no low-offer notice of any kind in the live Request app. Grep for `suggested_offer`, `lowOffer`, "below suggested", "Send as-is" across `src/` returns nothing outside `smartPriceSuggestion.js`. |

So this is **not** a greenfield add. It is a **replacement** of a component that already
ships, plus a **new** low-offer notice. That changes the risk profile: a regression here
is visible to every Delivery requester immediately, not to nobody.

---

## 2 · Why nobody sees the existing component (the real defect)

### 2.1 It is hard-gated on "I need items purchased"

`smartPriceSuggestion.js` has two independent gates on `formik.values.need_purchase`:

```js
useEffect(() => {                                   // line 23
  const isVisible = !!formik.values.need_purchase;
  props.formik.setFieldValue("smart_pricevisible", isVisible);
}, [formik.values.need_purchase]);

const getSmartPrice = async (values) => {           // line 43
  if (!formik.values.need_purchase) return;         // <- never even fetches
  ...
};
```

**Consequence:** a pure Delivery/Courier run — move this thing from A to B, nothing
purchased — gets **no suggestion at all**. That is exactly the flow the ticket names as
the one to start with.

### 2.2 Three different rules write `smart_pricevisible`, and they contradict

`setVisible`/`setHide` resolve to `formik.setFieldValue(target + "visible", …)`
(`src/actions/action.js:229-236`). So all three of these write the same field:

| Writer | Rule it applies | Source |
| --- | --- | --- |
| The JSON toggle | `need_purchase` ON → **hide** smart_price; OFF → **show** it | `courier.json` `need_purchase.on_checked_actions` / `on_uncchecked_actions` |
| The component | `smart_pricevisible = !!need_purchase` — **show when ON** | `smartPriceSuggestion.js:23` |
| The offer field | `smart_pricevisible = need_purchase && !(gopher_offering > 0)` | `courier.json` `gopher_offering.on_change_actions` |

Writers 1 and 2 are **exact opposites**. Which one wins is decided by React effect
ordering, not by intent. Writer 3 then adds a third rule on top. This is the mechanism
behind "it is currently written poorly" — it is not style, it is a race.

### 2.3 The explanatory copy describes a model that does not exist

The "Make your own offer" modal tells the requester the Suggested Offer:

> *"factors in things like estimated time, distance, cost of items, time of day and the
> average accepted offer amount for similar offer types in your area."*

**The live endpoint factors in exactly one input: cost of goods.** Not time, not
distance, not time of day, not local acceptance rates. The copy is a promise the backend
does not keep — the same honesty standard the owner applied to the `gopher-request.html`
copy fixes and the Deals 101 guide.

### 2.4 And `restaurant.json` disagreed with the other five

Five forms did `setVisible smart_price` when the purchase toggle went OFF.
`restaurant.json` did `setHide` in **both** branches — so on Restaurant the
suggestion was hidden whichever way the toggle went. A fourth inconsistency
nobody had noticed, found only by dumping all six schemas side by side.

### 2.5 `alcohol.json` / `tobacco.json` carry a dead `smart_price` block

Both declare `smart_price` but neither has the `targetControl` wiring the other five
have. Both forms are also unreachable as new-request entry points post-G40-495 —
`deliverySections.test.js:206` asserts `alcohol` is absent from the Delivery sections.
Legacy residue; they still matter for historical `sub_category_type` reads only.

---

## 3 · The live pricing model, and what it actually returns

`controllers/order/create.js:186`:

```js
const base = 10.0;
let multiplier = 0;
if      (sc >= 25 && sc < 30) multiplier = 0.10;
else if (sc >= 30 && sc < 35) multiplier = 0.13;
else if (sc >= 35 && sc < 45) multiplier = 0.15;
else if (sc >= 45 && sc < 50) multiplier = 0.18;
else if (sc > 50)             multiplier = 0.20;
suggestion.suggested_offer = base + multiplier * sc;
```

### 3.1 ⛔ `sc === 50` falls through every branch

`>= 45 && < 50` excludes 50. `> 50` excludes 50. So **exactly $50.00 of goods suggests
$10.00** — while $49.99 suggests $18.99 and $50.01 suggests $20.00. A $9 cliff at the
single most common round-number basket. *(Independently recorded in
`docs/handoff/G40-122-smart-pricing-ml-enhancement.md` **[inherited]**; re-verified
first-hand here against `origin/production`.)*

### 3.2 Anything under $25 returns a flat $10, regardless

`sc < 25` hits no branch → multiplier 0 → $10.00 flat. A $5 errand and a $24 errand
suggest the same number.

### 3.3 It disagrees materially with our own data

The prototype's model is calibrated against **9,147 real delivery orders**
(`Final/assets/js/gopher-request-logic.js:236`, NC column — NC pricing is platform-wide
per the owner's 2026-07-09 directive):

| Cost of goods | Live backend | Calibrated (9,147 orders) | Delta |
| ---: | ---: | ---: | ---: |
| $25 | $12.50 | $11 | +14% |
| $50 | **$10.00** *(the bug)* | $13.50 | −26% |
| $100 | $30.00 | $20.50 | **+46%** |
| $150 | $40.00 | $30.00 | **+33%** |
| $200 | $50.00 | $44.50 | +12% |

The live formula **over-suggests on larger baskets** against what actually got accepted.

---

## 4 · The build target (the design in the ticket's screenshots)

The three images on the ticket are **not** new mockups — they are screenshots of
`_prototypes/Request/gopher-request-flow.html`, the Request-app prototype. Exact source
lines, so there is no interpretation gap:

| Screenshot | Prototype source |
| --- | --- |
| "Your offer to the worker" + hint + green iQ entry row (264×171) | `gopher-request-flow.html:1779-1789` (`renderPaySuggest()`, line 1809) |
| "Suggested fair offer" slider card (269×284) | `offerModalHTML()`, line 1816-1852 |
| Full flow screen (645×1398) | `renderStep5()`, line 1758 |

**The three parts to port:**

1. **Entry row** — `Tap here for a suggested offer range`, Gopher iQ logo, green arrow.
   Sits *under* the offer field, always visible for priced categories. Never a blocking step.
2. **"Suggested fair offer" card** — LOW / FAIR / GENEROUS rail, slider, `$low — $generous`,
   a *typed* "Your offer" box, and **Cancel / Use this offer**. The slider and the typed box
   are two doors to one number.
3. **Low-offer notice — inline, not a pop-up.** `gopher-request-flow.html:1783`:
   > *"That's on the low side for a delivery like this. A fair offer gets accepted faster —
   > but you can send it as-is."* + a `Send as-is` button that acknowledges and re-arms on edit.

   ⚠️ The **marketplace website** (`Final/gopher-request.html:17601`) uses a *blocking*
   modal for the same moment. The Request-app prototype does not. **The inline banner is
   the better answer** and matches "easy to use, simple to engage with, effective with
   informing": it informs without seizing the screen, and it cannot be dismissed by
   accident into an unpriced submit.

**Threshold:** `low = 75% of suggested`, one constant shared by the card and the notice,
so the rail's "Low" label and the warning can never disagree.

⛔ **Hourly mode is excluded** (owner, 2026-08-26). The model prices a **whole job**;
an hourly field is a **per-hour rate**. Comparing them warns on fair rates and blesses
low ones. Not reachable in Delivery today, but the guard travels with the component.

### 4.1 Scope — "ALL categories" for Delivery = these six forms

`generalerrand` · `restaurant` · `grocery` · `cbd` (Age-Restricted) · `conveniencestore` ·
`courier` — per `delivery.json` navigation paths, post-G40-495.

---

## 5 · Decisions taken (owner, 2026-09-21)

| # | Decision | Chosen |
| --- | --- | --- |
| D1 | Where the number comes from | **Fix the backend endpoint.** One seam; the client contract is unchanged and only additive. |
| D2 | Pure delivery, nothing purchased | **Add the distance component now.** |
| D3 | Below-suggested treatment | **Inline banner + "Send as-is".** No blocking modal. |

## 5c · The Gopher iQ pricing corpus — where it is, and what has reached the apps

**Location:** `Documentation/Dashboard/Gopher iQ/Suggested Pricing/` (16 files).
Five categories are modelled: **Delivery · Ride Share · Junk Removal · Moving ·
Yard Work/Landscaping**.

### ⛔ None of it has reached the live apps. Not one table.

`git grep` for `OFFER_TABLE|suggestedOffer|RIDE_MILE|JUNK_TIER|MOVING_TIER`
across `origin/production` in **all three** live repos, 2026-09-21:

| Repo | Result |
| --- | --- |
| `gopher-backend-api` | **nothing** |
| `gopher-mobile-gopher` | **nothing** |
| `gopher-mobile-request` | one hit — `smartPriceSuggestion.js`, which contains no table; it calls the backend's tier ladder |

Where the models actually live today:

| Category | Workbook | Prototype | Live apps |
| --- | :---: | :---: | :---: |
| Delivery | ✅ | ✅ `gopher-request-logic.js` | ❌ |
| Junk Removal | ✅ | ✅ `gopher-request-logic.js` | ❌ |
| Moving | ✅ | ✅ `gopher-request-logic.js` | ❌ |
| Ride Share | ✅ | ✅ `gopher-request.html` | ❌ |
| Yard / Landscaping | ✅ | ❌ | ❌ |

**The G40-502 branch is the first time any of this reaches a live repo**, and it
carries **Delivery only**. Yard/Landscaping (2026-08-10, the newest workbook)
has never been coded anywhere.

### The Delivery table was verified against the workbook, not against the prototype

`Claude.AI_Suggested_Pricing_Model_Update.xlsx` → sheet **Recommended Model**,
`NC Suggested` column. Diffed point by point against
`helpers/suggested_pricing.js`: **40 of 40 exact, zero mismatches**, and the
workbook's own `NC Low` / `NC Generous` columns are exactly ±25% on every row —
the same band the component and the low-offer notice use.

**On 9,147 vs 9,306** — both appear in the workbook and both are true, with
different definitions. 9,306 is after removing 3 zero-offer rows; 9,147 is after
excluding the 1.7% of outliers above 3× item cost, and is the model-fitting set
(6,070 NC + 3,077 US). The code cites 9,147, which is the right one.

### Two workbook findings that bear on this ticket

- **The US column is deliberately not carried.** Non-NC requesters offer
  **25–40% more** for the same item cost — median on a ~$45 item is $20 NC vs
  $30 US. NC-only pricing is the standing policy, but that gap is the single
  biggest source of variance the moment the platform leaves NC.
- **NC plateaus around $25 above ~$75 of goods**, and the workbook names why:
  *"heavily tobacco/vape/age-restricted 'commodity runs' where users cap the tip
  regardless of cost."* That is the Age-Restricted form — one of the six in scope
  and the screen the owner screenshotted.

---

## 5d · ⚠️ The distance component may apply to far fewer requests than assumed

The raw workbook (`Suggested Pricing Raw Data - Delivery.xlsx`, 18,143 rows)
carries `PICKUP ZIP` and `DROPOFF ZIP`, so it looked like it could settle §5a
without the production DB. **It cannot, and the reason is the finding.**

| | rows |
| --- | ---: |
| Total delivery rows | 18,143 |
| With a **drop-off** ZIP | 5,879 |
| With a **pick-up** ZIP | **942** |
| With **both** | 910 |
| Both, and resolvable to an NC ZIP centroid | 615 |
| Of those, **same ZIP at both ends** | **380 (62%)** |

Median centroid-to-centroid distance came out at **0.00 miles** — which is not a
distance, it is ZIP-centroid resolution failing on same-ZIP trips. So the
workbook does not calibrate `BASELINE_MILES`, and §5a still needs the production
DB.

**But the 942 is the real signal: ~84% of delivery requests that record a
drop-off have no pick-up at all.** These are `purchase_anywhere` runs — the
Gopher buys wherever the item is. **For the majority of Delivery requests there
is no pickup point to measure from at the moment the requester is setting their
offer.** The origin only exists once a Gopher picks a store, which is after the
price is set.

**This reopens D2.** A distance component that can only fire on ~1 request in 6
is not the fix for the zero-COGS pure-delivery case it was chosen for. Options
worth putting back in front of the owner:

1. **Drop-off distance from the requester**, not pickup→drop-off — always known,
   and it is what actually predicts whether a Gopher nearby will take it.
2. **Keep pickup→drop-off but only when a pickup exists**, and fall back to the
   cost curve alone otherwise. Honest, but leaves the Courier case exactly as
   thin as it is today.
3. **Price pure delivery on local coverage instead of distance** — `gopher-iq-data.js`
   already carries worker counts per ZIP at a 10-mile radius.

---

### 5a · ⛔ THE ONE REMAINING BLOCKER — two uncalibrated constants

D2 was taken, and the structure is built and tested. **The two numbers inside it
are not measured.** They are named in one place —
`helpers/suggested_pricing.js` → `DISTANCE` — and the module ships with
`CALIBRATED: false`, which the test suite prints as a merge warning on every run.

| Constant | Placeholder | What it must actually be |
| --- | --- | --- |
| `BASELINE_MILES` | 6 | The **median** pickup→drop-off distance across the same delivery orders the cost curve was fitted to. The curve already contains an average distance; without this offset the distance component double-counts it. |
| `PER_EXCESS_MILE` | 1.35 | Seeded from the 15–40mi tier of the **ride** model, which *is* calibrated (1,226 real rides). That is an analogue, not a measurement of delivery. |

**Why this is a pause-and-wait, not a caveat.** The production DB is not reachable
from this machine (no `psql`, no tunnel, no credentials). A guessed pricing
constant is exactly the shape of failure the standing rule names: not that it
breaks, but that it produces a confident wrong number that then gets paid.

**What unlocks it:** read access to the production DB, or someone running the
query below and pasting the two numbers back.

```sql
-- BASELINE_MILES: median pickup -> drop-off distance on completed deliveries.
-- Same haversine constant the dispatcher uses (3959 mi earth radius).
WITH d AS (
  SELECT 3959 * acos(LEAST(1, GREATEST(-1,
           cos(radians(p.latitude)) * cos(radians(o.latitude))
             * cos(radians(o.longitude) - radians(p.longitude))
           + sin(radians(p.latitude)) * sin(radians(o.latitude))
         ))) AS miles
  FROM orders ord
  JOIN addresses p ON p.id = ord.pickup_address_id
  JOIN addresses o ON o.id = ord.dropoff_address_id
  WHERE ord.request_type = 'Delivery'
    AND ord.aasm_state  = 'completed'
    AND p.latitude IS NOT NULL AND o.latitude IS NOT NULL
    AND NOT (p.latitude = 0 AND p.longitude = 0)
    AND NOT (o.latitude = 0 AND o.longitude = 0)
)
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY miles) AS baseline_miles,
       count(*) AS n
FROM d WHERE miles BETWEEN 0.1 AND 100;
```

For `PER_EXCESS_MILE`, regress accepted `offer` on `miles` holding cost of goods
fixed over the same set — the slope is the number. Until both are replaced,
`CALIBRATED` stays `false` and this does not merge.

⚠️ **Column names above are written from the model definitions, not from a live
schema** (`pickup_address_id` / `dropoff_address_id` on `orders`). Confirm them
against the real database before running — that is part of the same unblock.

---

## 5b · What was built

Two branches, both cut from `production`, neither merged and neither pushed.

### `gopher-backend-api` — branch `G40-502-suggested-pricing`

| File | Change |
| --- | --- |
| `helpers/suggested_pricing.js` | **New.** The model: the 9,147-order calibrated table, interpolation, terminal-slope extrapolation above $200, the distance component, the ±25% band, and `milesFromOrderBody`. Pure — no models, no network, no DDL. |
| `controllers/order/create.js` | `get_smart_price` rewritten to call it. Validates input, resolves distance, returns the band. |
| `test/suggested-pricing-curve.test.js` | **New.** 34 checks. |

**The response is additive.** `suggestion.suggested_offer` keeps its name and
meaning; `low`, `generous` and a `basis` block are new. An app build already in
the field keeps working unchanged.

**The test proves itself.** Restoring the old ladder verbatim turns it red —
8 of 34 checks fail, and the monotonic sweep names the defect exactly:
`drops $8.95 at $50 (18.95 -> 10.00)`. Restored, 34/34 pass. The guard is
monotonicity across the whole curve, not an assertion on $50 — a test pinned to
$50 would pass on a ladder with the hole moved to $45.

### `gopher-mobile-request` — branch `G40-502-suggested-pricing`

| File | Change |
| --- | --- |
| `src/component/smartPriceSuggestion.js` | **Rewritten.** Entry row, "Suggested fair offer" card, inline low-offer notice. Owns its own visibility. Debounced, and a superseded reply cannot overwrite a newer price. |
| `src/img/gopher-iq.png` | **New** (15KB). Extracted from the prototype's inline base64 rather than pasting the blob into JS. |
| 6 Delivery schemas | The competing visibility actions removed — 17 lines each. |
| `src/component/smartPriceSuggestion.test.js` | **New.** 29 checks. |
| `jest.services.config.json`, `jest.fileStub.js` | Image imports stubbed, or every suite dies before the first test. |

**Three behaviours worth naming:**

- **A suggestion we cannot make is not offered.** If the endpoint fails or
  returns nothing usable, the entry row does not render at all. The prototype
  states this as an invariant: offering a pay suggestion where no model exists
  is a broken promise.
- **The offer field is the requester's.** The component only ever writes a
  *value* into `gopher_offering`, and only when they tap "Use this offer". It
  never touches its visibility — that was half the old race.
- **The low-offer notice re-arms on edit.** An acknowledgement applies to the
  offer that was acknowledged, not to whatever is typed next.

## 6 · Overlap — corrected 2026-09-21

> ⚠️ **G40-122 IS NOT ON THE BOARD.** An earlier draft of this doc named
> `G40-122 — Suggested Pricing: ML/context enhancement` as the overlapping
> ticket, citing `docs/handoff/G40-122-smart-pricing-ml-enhancement.md`. A JQL
> sweep of the whole G40 project for pricing/suggested returns **no G40-122**,
> and fetching it by key returns "does not exist or you do not have permission."
>
> **The doc outlived its ticket**, which is the fossil this project's standing
> rule is about — a truth read out of a dead ticket still reads as authoritative
> to whoever finds it next. The doc's *technical* content is still correct and
> was independently re-verified here (the $50 fallthrough, the COGS-only
> algorithm). Its *ticket* reference is not. Treat
> `G40-122-smart-pricing-ml-enhancement.md` as a design note, not a work item.

The real overlap is two **live** tickets.

### 6.1 G40-361 — instrument the feedback loop · To Do · **High**

*"PHASE II — Gopher iQ suggested pricing: instrument the feedback loop (store
the suggestion, preserve the price events)."* It asks for `iq_suggested_offer`,
`iq_tier`, `iq_tier_source`, `iq_model_version`, `customer_initial_offer`, a
`price_events` append log, and match outcomes **including the unmatched
requests**. Its own scope line: *"No pricing behaviour changes in this ticket;
it is purely capture."*

Two lines in it bear directly on G40-502:

- *"Validating Junk / Delivery / Ride, **none of which have ever been checked
  against outcomes**."*
- Moving's anchors went through **four revisions in one day**, every one
  corrected by measuring something, and *"the next recalibration will be the
  same guesswork unless the loop is instrumented."*

**That is G40-502's §5a blocker, described from the other end.** The reason the
distance constants cannot be settled is the reason G40-361 exists.

**Recommendation: keep the tickets separate, but carve ONE slice of G40-361
into G40-502's backend MR** — write `iq_suggested_offer` and `iq_model_version`
at the moment the suggestion is produced.

- *Separate*, because G40-361 is capture-only and G40-502 changes prices. One MR
  that does both is the hardest possible thing to revert on a repo that
  auto-deploys to live on merge.
- *But one slice together*, because **without `iq_model_version` the calibration
  data is ambiguous forever.** The moment §5a is resolved the curve changes, and
  if orders priced by the placeholder constants are indistinguishable from
  orders priced by the measured ones, the first real Delivery dataset is
  contaminated at birth. It is ~3 lines, and `get_smart_price` — the one place
  that knows the answer — is already being rewritten by this ticket.

### 6.2 G40-113 — "Suggested Offer Used" Yes/No · **In Progress** · Low

⛔ **This one is already touched by the work above, and the touch is inert.**
`smartPriceSuggestion.js` sets `suggested_offer_used` when the requester takes
the suggestion. Grepped across both repos on 2026-09-21: **the field exists
nowhere else** — not in `formatOrderObjcet`'s payload, not in the create
controller, not as a column on `orders`. The value is set on the form and
dropped on submit.

It is written anyway, and annotated in place as inert, because that moment is
the only one that knows the answer: once the amount is in the field, "typed it"
and "took the suggestion" are indistinguishable.

⚠️ **And it is not yet the rule G40-113 asks for.** Per
`docs/handoff/G40-113-suggested-offer-used.md`, the flag must flip back to
**false** if the requester hand-edits the pay field afterwards — the question is
where the *submitted* offer came from, not whether iQ was opened. The component
only ever sets true. **Do not record G40-113 as satisfied by this.**

**Recommendation: finish G40-113's wiring inside this ticket** — the payload
field, the controller, the column, and the flip-back-on-edit rule. It is small,
the ticket is already In Progress, and the alternative is a flag that looks
implemented and measures nothing.

## 7 · Risk / reward, stated plainly (pre-consent, per the standing rule)

**What it solves.** Delivery requesters currently get either no suggestion at all (any
pure-delivery run) or one that is up to 46% above what comparable jobs actually accepted —
and at exactly $50 of goods, a $10 suggestion that is simply wrong. Unpriced and
mispriced requests sit in the marketplace unaccepted, which reads to the requester as
"the app doesn't work."

**The reward.** Every Delivery sub-category gets a suggestion grounded in 9,147 real
accepted orders, one consistent low-offer threshold, and a first visible Gopher iQ
surface in the requester's hands.

**The risk.** Pricing is money-adjacent and requester-visible. If the curve is wrong we
under-suggest and workers get lowballed, or over-suggest and requesters overpay. The
backend path (D1a) deploys to live on merge with no store gate — **undo is a revert
commit and one pipeline run, minutes not days**. The client path (D2b) is store-gated:
slower to ship, slower to undo.

## 8 · What is verified, and what is not

**Verified first-hand:**

- The defects in §1–§3, read against `origin/production` in both repos.
- The backend model: 34/34, and proven to go red against the restored bug.
- The component: 29/29 under jsdom, including the schema guard across all six forms.
- ⚠️ The "is the card open" probe was **wrong on its first version** and reported
  the card open before it had ever been opened — `.MuiDialog-container` carries
  `aria-hidden=null` in both states. Corrected to read `.MuiDialog-root`, which is
  where MUI actually puts `MuiModal-hidden`. Worth knowing because every future
  `keepMounted` assertion in this app has the same trap under it.

**NOT verified — do not record as done:**

- **Nothing has run on a handset.** jsdom is not a phone. Layout, the slider's
  touch behaviour, and how the entry row sits under the offer field are all
  unobserved.
- **The distance component has never priced a real order** — see §5a.
- **The live endpoint has not been exercised** end to end against the new client.

**Pre-existing test failures, unrelated to this work and confirmed identical on a
clean checkout:** `paymentSheet.test.js` (missing `@capacitor-community/stripe`)
and 9 backend suites that need a database or absent modules — `order-timezone`
and `deals-geo-gating` were both run on the untouched main clone and fail there
in exactly the same way.
