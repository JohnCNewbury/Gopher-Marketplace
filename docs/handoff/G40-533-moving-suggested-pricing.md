# G40-533 — Suggested Pricing: Moving (+ category routing in `get_smart_price`)

**Jira:** G40-533 · Task · **Highest** · sprint "Suggested Pricing" (842)
**Surfaces:** `gopher-backend-api` (routing + the Moving model) · `gopher-mobile-request`
(schemas + component). **GO/iOS and GO/Android are out of scope and untouched.**
**Pattern repeated:** `G40-502-suggested-pricing-delivery.md`.
**This doc is the source of truth. The ticket references it, not the other way round.**

> **Verification note.** Every claim below is marked **VERIFIED** (I ran it) or
> **INHERITED** (read from a doc or told to me). Nothing is asserted from memory.

---

## 1 · Status — **MERGED**, and still **not Done**

| | |
| --- | --- |
| App | [!379](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/379) **merged** `fb3c1367` · production pipeline **2875171817** 29/29 |
| Backend | [!633](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/633) **merged** `54b5fd72` · production pipeline **2875211976** 6/6 |
| Order | App first, then backend — as ruled. squash **no**, source branch **kept**, target `production`, all read back from the API |
| AC9 | ✅ **MET on hardware** — Samsung A50, build 13.9.4 from `production`. "move my 3 bedroom house" → **$375** (3+ bedroom auto-selected, rail $280–$470); tapping "A few items" → **$75**. The first is the exact case that returned $110 before the echoed-tier fix; the second proves the fix did not kill the correction path. |
| Echoed-tier fix | `85e86eaf` · pipeline **2875701251** 6/6 — a LIVE mispricing on Moving **and** Junk, found only by driving it on a phone. See §13. |
| Jira | **Ready for Release** |

**Verified against the tree as merged on `production`:**

```
Moving few / truck / 1-2br / 3+br -> $75 / $110 / $225 / $375   g40-533-moving-anchors-2026-09-22
Moving couch + stairs             -> $75   ← identical to no-stairs (AC4)
Junk Removal                      -> $40   g40-534-junk-anchors-2026-09-22
Delivery $100 goods               -> $20   g40-502-owner-anchors-2026-09-21
unknown category                  -> $20   falls through, as before
registry keys: ["moving","junk removal"]
```

Suites on production's tree: registry **11/11** · Moving **52/52** · Delivery **40/40** ·
iq-capture **25/25** · Junk **67/67**.

⚠️ **A green GitLab pipeline is not a completed CodePipeline deploy.** The merged *code*
is verified; the *running service* is not. Nobody should read this doc as proof the new
build is serving.

⚠️ The app's production pipeline ran **29** jobs against 28 on the branch. The extra is
`purchase-anywhere-clears-pickup`, added to `production` by another ticket after my branch
pipeline ran. Checked, not waved through.

--- | --- |
| Backend branch | `G40-533-moving-suggested-pricing` @ `8b7b762f` — **pushed**, MR [!633](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/633), pipeline **2874606418** 6/6 green |
| Request branch | `G40-533-moving-suggested-pricing` @ `26d504f29` — **pushed**, MR [!379](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/379), pipeline **2874570877** 28/28 green |
| Merge | **HELD.** Owner's order is **G40-534 → G40-533 → G40-535** |
| ⛔ Rebase debt | G40-534 also built the tier row into the shared component and merges first. **Theirs wins; mine is dropped.** Two behaviours Moving needs must be re-added — see §12 |
| AC9 (handset) | ⛔ **OUTSTANDING.** Nothing has run on a phone |

⛔ **Not Done.** AC9 is unmet and the MRs do not exist yet.

---

## 2 · The routing contract (Part 1 — what G40-534 and G40-535 build against)

**VERIFIED** against `origin/production` in both repos.

**The key is `request_type`.** It is already on the wire — no client change was
needed. `src/helpers/orderObject.js:46` and `:258` set
`request_type: values.category_type`, and `smartPriceSuggestion.js` posts
`formatOrderObjcet(values, null)` verbatim.

**Exact values**, from the `category_type.defaultValue` hidden field across **all 34**
requester schemas (VERIFIED — I enumerated every file, not only the ones I needed):

| literal | forms |
| --- | --- |
| `Delivery` | 8 (6 live + alcohol/tobacco legacy) |
| `Moving` | 4 — locationmove, samelocationmove, othermoving, storepickupdelivery |
| `Junk Removal` | junkremoval.json — **G40-534** |
| `Need a Ride` | needaride.json — **G40-535** (note the lowercase "a") |
| `Home Services` · `Yard Project` · `Hourly / Day Labor` · `Other` | not priced |

Lookup normalises with `trim().toLowerCase()`, so client-side casing drift cannot
break routing.

**Response — unchanged shape, every category:**

```
{ success: true,
  suggestion: {
    suggested_offer, low, generous,   // whole dollars
    model_version,                    // DISTINCT PER CATEGORY
    basis                             // per-category; shape varies
  } }
```

**The seam.** Adding a category is one registry line plus one function:

```js
const CATEGORY_MODELS = {
  moving: { version: MOVING_MODEL_VERSION, price: movingBand },
};
```

A `price` function takes the raw request body and returns
`{ low, suggested, generous, basis }`. **The router attaches `model_version`** — a
category cannot ship without one, and cannot disagree with itself about which one
priced the order.

⛔ **THE ROUTER IMPOSES NO FLOOR, and an earlier draft of this doc said it did.**
I circulated the clause *"a price function must satisfy `suggested >= MIN_SUGGESTION`"*
to G40-534 and G40-535, and the router really did wrap the routed suggestion in
`Math.max(MIN_SUGGESTION, band.suggested)`. Both the clause and the code were wrong.
`MIN_SUGGESTION` (10) is **Delivery's** floor, not the platform's — a floor is part of
a pricing model, so it belongs inside the model that owns it.

**How it was caught, and why my own tests could not have caught it.** G40-535 read the
code rather than inheriting my relayed contract. Its Ride model floors at **$8**,
deliberately below 10, so the clamp would have raised every short trip to $10 while
that ticket's own *"the $8 floor holds"* assertion went quietly untrue — and the cause
would have looked like G40-535's bug, not mine.

### ⭐ The general lesson, which outlives this bug

⚠️ **Every Moving AC stays GREEN under that mutation.** All four Moving anchors sit
above $10, so the clamp never fired on this category and no test here could observe it.

**Junk could not have caught it either** — its lowest tier is $40. Ride was the *only*
one of the three that could, and only by the accident of having an $8 floor.

> **The first consumer of a shared default cannot test that default.** It has nothing to
> compare against, so the default is indistinguishable from no default at all. "My tests
> are green" is therefore the *weakest* available evidence about a seam you have just
> created — it is exactly the claim the seam is built to be unable to falsify.

Two things follow, and they are the reason this is in the doc rather than in a DM:

1. **G40-534 and G40-535 should check what the ROUTER does to their band, separately
   from what their own model does.** Their own suites will not tell them.
2. When the fourth category arrives, the same hazard applies again to whatever *this*
   seam now takes for granted. The fix is not "add more tests here" — it is to keep
   shared behaviour out of the router unless it is genuinely universal, which a floor
   is not.

*(Framing owed to G40-535, which found the defect by reading the code instead of
inheriting the contract I had circulated.)*

### ⛔ And one level further down: the seam could not test its own LOAD ORDER

G40-535 then found a **second** defect in the same seam, on an integration dry-run —
and this one does not mis-price, it **stops the backend booting**.

The `version` values in `CATEGORY_MODELS` are `const`, which is not hoisted, and the
object is evaluated at require time. A category block placed **below** the registry hits
the temporal dead zone:

```
ReferenceError: Cannot access 'RIDE_MODEL_VERSION' before initialization
```

The module never loads, so the process never starts. On a repo that auto-deploys to live
on merge, that is the whole API down. Reproduced first-hand before the report was
accepted.

**The defect was the comment I wrote.** It said *"one line each plus their model
function"* — which reads as "append your block, add a line", and that is exactly the
resolution git produces for a conflict on this object. `rideBand` / `junkBand` hoist fine
(function declarations); it is the version constant alone that does it, which is why the
crash looks unrelated to the line that was added.

**Fixed in `8b7b762f`.** The comment now states the constraint, and
`test/g40-533-registry-load-order.test.js` asserts it so a bad placement fails CI instead
of failing the deploy.

⛔ **That guard is in its own file, and that is not tidiness.** The same assertion inside
the Moving suite was **useless**: that suite requires the helper at the top, so a bad
ordering killed it before one assertion ran — the run printed a raw ReferenceError and
**no summary at all**. CI still goes red on the exit code, but the reader gets a stack
trace instead of a diagnosis. The new file **deliberately does not require the module it
tests**; it reads the source, which is the only way it can name the problem and the fix.
*A test that cannot report is not a failing test.*

Mutation-proved three ways: block below → names the constant and the fix; registry line
without the block → "referenced but never declared"; block correctly above → 5/5, Ride
routes at $9 on its own version, Moving unchanged at 55/75/95.

> **So the lesson has two halves, and the second is sharper than the first.** The first
> consumer of a shared seam cannot test the seam's **defaults** — and it cannot test the
> seam's **load order** either, because with one entry there is no "below". Both defects
> were found by the second category through the seam, not by the one that built it.

Fixed in `9a61205d`. Removing it changes nothing for Delivery — `suggestedOffer` already
floors internally, so the wrapper never fired — and a new assertion pins that a zero-cost
Delivery request still returns $10, so this is **not** a guard deleted to green. The new
guard uses a registered stub returning $8 rather than a real category, so it keeps
testing the router after anchors move. Mutation-proved: restoring the clamp turns it red
with *"got low $6 / suggested $10 — the router is clamping"*.

⛔ **Unknown or absent category falls through to the Delivery cost curve**, which is
exactly today's behaviour. Adding a category cannot change an existing one.
Delivery's own suite is **40/40, unchanged** (VERIFIED).

---

## 3 · The Moving model (Part 2)

Four owner-set anchors (**D8**, 2026-08-09), band ±25% **rounded to $5**:

| tier | low | suggested | generous |
| --- | ---: | ---: | ---: |
| A few items | $55 | **$75** | $95 |
| A truck-load | $85 | **$110** | $140 |
| 1–2 bedroom home | $170 | **$225** | $280 |
| 3+ bedroom home | $280 | **$375** | $470 |

⭐ **$5 rounding, not whole dollars — and the owner's own mockup settles it.** His
G40-533 screen shows `$110 → $85 — $140`. That is 82.5 and 137.5 on a $5 grid.
Whole-dollar rounding prints **$83 / $138** and does not match the approved screen.

⚠️ **One discrepancy worth recording.** The D8 table in the discovery doc writes the
`truck` low as **$80** — a round-*down* of the same 82.5. The other three tiers agree
with the code exactly. **The owner's screen ($85) is authoritative**; the doc's $80 is
a transcription choice, not a different decision.

### The three recorded rulings — honoured, not re-derived

| | ruling | how it is enforced |
| --- | --- | --- |
| **D4** | trip distance is **never** an input | a 130-mile move and a same-block move assert identical |
| **D9** | forward learning **frozen** (`w = 0`) | no learning-store read exists in the module; the suggestion is the anchor whatever is in the payload |
| — | **stairs must not move the price** | inverted test: identical with and without, across all four tiers |

The distance ruling is the easy one to break by accident — all four Moving forms carry
a live `distance` field, so the number is right there in the payload.

---

## 4 · Scope — Moving is four forms and **three** are in

| form | `category_type` | in scope |
| --- | --- | :---: |
| `locationmove.json` | Moving | ✅ |
| `samelocationmove.json` | Moving | ✅ |
| `othermoving.json` | Moving | ✅ |
| `storepickupdelivery.json` | Moving | ❌ **out** |

**Why Store Pick Up & Delivery is out, with evidence.** The Moving anchors were fitted
on a corpus that *deliberately removed* those orders (discovery §4b dropped 22 of them
before fitting — **INHERITED**). The production check in §5 says why that matters
(**VERIFIED**): across those 22 completed orders the detector tiers **15 as `truck`**
and would suggest **$110 against a real median of $75** — a ~47% over-suggestion on the
modal case. That is the same defect class G40-502 existed to remove.

**A test asserts it stays out**, because the obvious tidy-up is to spot one Moving form
missing the control and add it.

Wiring, in all three, placed directly after `gopher_offering`:

```json
"smart_price": { "type": "smartPriceSuggestion", "visible": true }
```

**VERIFIED:** zero actions target `smart_price` / `smart_pricevisible` in any of them.

---

## 5 · ⚠️ The anchors-vs-production check — the one nobody had done

Delivery's equivalent is what found the $50 hole and the 46% over-suggestion. Moving's
anchors had only ever been checked against the extract they were *fitted on*.

**Source:** `Documentation/Dashboard/data/master/Orders.csv`, production export dated
**2026-09-22**. Real production order data. Script and captured output:
`g40-533-moving-anchors-vs-production.py` / `.txt`.

**The corpus reproduces the doc's exactly.** N = 153 against the doc's 155, and the
envelope is **identical to the dollar**: p25 $60 · median $100 · p75 $150 · p90 $200 ·
max $390. That agreement is what licenses the rest of the comparison.

| tier | n | real median | anchor | anchor vs median |
| --- | ---: | ---: | ---: | ---: |
| few | 55 | $100 | **$75** | **−25%** |
| truck | 93 | $100 | **$110** | +10% |
| home_small | 4 | $175 | **$225** | +29% |
| home_large | 1 | $260 | **$375** | +44% |

### What this says — and it is not "the anchors are wrong"

- **`few` sitting 25% below its median is D8 working as designed, not drift.** It was
  deliberately set below the historical mean on labor-model grounds — that is exactly
  what took the one-couch job from $115 to $75. Reading this row as an error and
  "correcting" it upward would undo the fix.
- **`truck` at +10% on n=93 is the well-powered cell and is in good shape.**
- **The top two tiers are still n=4 and n=1.** The doc said n=3 and n=1 (**INHERITED**);
  six weeks later there is essentially no new evidence. Those two anchors continue to
  rest on the labor model, not on measurement, and that has not changed.
- **Only 5 completed Moving orders exist since the 2026-08-09 calibration**, median
  $100. Nothing has moved. **The anchors are as current as they were on the day they
  were set** — which is the honest answer to "are they current?", and it is not the
  same as "they have been validated against fresh data."
- **Detector coverage holds:** 27% of descriptions carry no tier signal (doc said 23%),
  and their median is **exactly $100** — confirming `truck` as the right fallback.
- **Monotonic on real data:** $100 ≤ $100 < $175 < $260.

⛔ **THE GAP, STATED PLAINLY AND NOT SILENTLY CORRECTED.** The upper two anchors
(`home_small` $225, `home_large` $375) are **unvalidated** — n=4 and n=1 — and both sit
well above the little history there is. **The anchors are the owner's.** This is
reported for his decision, not adjusted. If he wants them moved, that is a one-line
change plus a `MOVING_MODEL_VERSION` bump.

> ⚠️ **What this number measures, and what it excludes.** Completed orders are what
> *cleared*, on a marketplace where only ~47–50% of Moving requests ever match
> (**INHERITED**). The jobs that were priced too low to attract anyone are absent by
> construction. This is corroboration of the ordering, not a market rate — the same
> caveat the discovery doc puts on its own tier medians.

### A probe that lied, and how it was caught

The first run reported **"0 completed Moving orders since 2026-08-09"** — a clean,
confident, entirely false zero. The export's dates are `MM-DD-YYYY HH:MM AM/PM` and the
parser was ISO-only, so it returned `None` for **all 64,665 rows**. The real answer is 5.
The script now refuses to run unless the parser demonstrates it can report a non-zero.

---

## 6 · Two defects found while wiring this up (both fixed here)

**6.1 · Bid mode would have shipped a button that wrote into a hidden field.**
Moving has two mutually exclusive pricing modes that **no Delivery form has** —
"Set your own price" (`price_offer`) and "Ask a Gopher for a bid" (`gopher_bid`) — and
the bid mode hides `gopher_offering` outright (VERIFIED: 2 `setHide` actions on all four
Moving forms, **0** on every Delivery form). The card would have rendered a Submit whose
only effect was writing an amount the requester could never see.

Fixed in the **component**, which now reads `gopher_offeringvisible` and renders nothing
when it is `false`. ⛔ A **read, not a write** — adding a JSON action to hide
`smart_price` is precisely the three-writer race G40-502 removed. Strictly `=== false`,
because the key is absent until an action fires and absent must mean visible.

**6.2 · The low-offer notice said "for a delivery like this"** — false on a Moving form.
Now "for a request like this". Three of the four assertions pinning that string asserted
*absence*, so they passed on any copy at all; all four now name the real string.

---

## 7 · AC8 — "existing schema guards still pass" was weaker than it read

**VERIFIED:** the G40-502 guard was scoped to a hard-coded `DELIVERY_FORMS` map of six
schemas and covered **no other category**. It now covers the Moving forms too.

Its *"nothing hides `gopher_offering`"* assertion **could not be applied verbatim**, and
this is the one place I deviated from the AC's literal wording — loudly, on purpose:

> On Delivery, zero hiders is correct; the hide there was a bug. On Moving the hide **is
> the bid feature**. Deleting those two actions to make a zero-assertion pass would be
> deleting a guard to green and would cost a working feature.

So Moving's guard is a **whitelist**: only `price_offer` and `gopher_bid` may hide the
offer field, and anything else — in particular anything hung off the suggestion — still
fails. A mutation adding a rogue hider elsewhere in the schema turns it red (VERIFIED).

---

## 8 · Evidence

**Every guard was proved able to fail.** 16 mutations, each written the way the bug
would actually be written, each turning the suite red and naming the right defect.
Printed summaries cited, never exit codes.

**Backend — `node test/g40-533-moving-suggested-pricing.test.js` → 50/50**

| mutation | result |
| --- | --- |
| reinstate a flat +15% stairs modifier | 5 failed — all four tiers + the $115 couch |
| price on trip distance | 1 failed — `$110 vs $285` |
| let the blend pull `few` to $100 | 4 failed |
| drop Moving from the registry | 12 failed — names the Delivery version it fell back to |
| round to whole dollars | 4 failed — `$83 – $138` |
| ignore the requester's tier correction | 3 failed |
| make Moving share Delivery's `model_version` | iq-capture: 1 failed |
| restore the router's `MIN_SUGGESTION` clamp | 1 failed — `got low $6 / suggested $10` |
| drop `low`/`generous` from the tier rows | 2 failed — prints the nulls |
| register a category BELOW the registry | load-order suite: 2 failed, names the constant; **Moving suite: no summary at all** |
| registry line with no block | load-order suite: 2 failed — "referenced but never declared" |

**Request — `npm run test:services -- smartPriceSuggestion` → 52/52** (20 new)

| mutation | result |
| --- | --- |
| stop sending `iq_tier` | 1 failed |
| drop `description` from the price key | 1 failed |
| render the card in bid mode | 1 failed |
| treat absent visibility as hidden | **12 failed** — proves the `=== false` strictness |
| restore the Delivery-only wording | 1 failed |
| remove the tier row | 2 failed |
| rogue `setHide` on `gopher_offering` | 1 failed |
| visibility action targeting `smart_price` | 1 failed |
| declare the control on the out-of-scope 4th form | 1 failed |

**Full suites.** Backend `npm test`: **18 of 314 suites failed**, against a control run
on untouched `origin/production` of **17 of 313** — the same 17, plus my new suite. The
one difference was mine and is fixed (§9). Request `npm run test:services`: **397/397
tests pass**; one suite fails to *load* on a missing `@capacitor-community/stripe` —
that file is **byte-identical to `origin/production`** (VERIFIED by diff).

**CI lint, run verbatim.** Backend `npx eslint . --max-warnings=0` +
`npx prettier . --check`: prettier clean; eslint reports 2 `import/no-unresolved` in
`helpers/order_timezone.js` and `shared/sentry.js` — **neither file is in my diff**, and
both are artifacts of a symlinked `node_modules` (CI runs `npm ci`; `@sentry/node` is a
declared dependency). Request `npx eslint ./src/ --max-warnings=0` + `npx prettier . --check`:
**both exit 0.**

---

## 9 · One existing test I changed, and why

`test/iq-capture-is-recorded.test.js` asserted `model_version: MODEL_VERSION` as a
**source grep**. Routing made that literal wrong *without making the capture wrong* — it
went red while the behaviour it guarded was intact and, in fact, better.

The intent was never "this file contains that identifier"; it was "every suggestion
leaves with a version attached." It is now asserted **behaviourally** across every
registered category and the default path, plus "no two models share a version" — which
is a stronger guard than the grep was, and catches the exact trap the AC names. Both
replacements were mutation-proved.

---

## 10 · Not verified — do not record as done

- ⛔ **Nothing has run on a handset.** AC9 is unmet. jsdom is not a phone: the 4-up tier
  grid at 375 px, the tap targets, and how the row sits above the rail are **unobserved**.
  This is the single largest untested surface, because the tier row is new UI.
- ⛔ **The live endpoint has not been exercised end to end** against the new client.
- **GO/iOS and GO/Android** — out of scope, untouched, not built, not run.
- The Store Pick Up & Delivery exclusion rests on n=22 completed orders. Directionally
  clear, thin in absolute terms.

---

## 11 · Risk / reward

**What it solves.** Moving requesters get no suggestion at all today, and they
demonstrably do not know the rate — the counter-offer rate on Moving is ~20% against
9.6% platform-wide (**INHERITED**), roughly double. An unpriced request that sits
unmatched reads to the requester as "the app doesn't work."

**The reward.** Four evidenced anchors, a visible one-tap correction when the detector
misreads the description, and the routing seam that makes Junk and Ride a registry line
each instead of three more endpoints.

**The risk.** Pricing is money-adjacent and requester-visible. Over-suggest and
requesters overpay; under-suggest and workers get lowballed. The two upper anchors are
n=4 and n=1 and are the weakest numbers here (§5). ⛔ **The backend auto-deploys to live
on merge via CodePipeline — no build gate, no store gate, CI does not gate the deploy.**
Undo is a revert commit and one pipeline run — minutes, not days. The client path is
store-gated: slower to ship and slower to undo.

⛔ **Merge the app first, then the backend.** The reverse gives every Moving requester
new prices against a UI that cannot render the tier row — the exact inversion that
happened on G40-502.


---

## 12 · ⛔ Rebase debt — what must be re-added onto G40-534's component

G40-534 independently built the tier-selector row into the shared
`smartPriceSuggestion.js` and **merges first**. Its own ticket makes that row a hard
requirement, so it was never something it could skip. **Theirs wins and mine is dropped
wholesale** — blending two implementations of one row is worse than either.

**VERIFIED by reading `origin/G40-534-junk-suggested-pricing`, not from its description.**
Two behaviours Moving cannot ship without are absent from it:

**12.1 · `description` is not in the price key, and nothing else reads it.** The only
occurrence in the whole file is a comment. For Junk that is survivable — a wrong tier is
one tap away. For Moving it is the headline bug:

> Requester opens the form. First fetch goes out with an empty description, so the server
> returns `tier_source: fallback` → `truck` → **$110**. They then type *"move my 3 bedroom
> house"*. **No refetch fires.** It stays $110 where it should be $375 — a 3.4×
> under-suggestion, permanent for that session unless they happen to tap a tier, and
> nothing on screen looks wrong.

**12.2 · `iq_tier` is never put in the fetch payload.** `fetchPrice` posts
`formatOrderObjcet(values, null)` unmodified, so the correction is client-side only. The
local re-range makes it right on screen, but the server never learns the corrected tier —
so `basis` on every later fetch still reflects the detector, and `iq_suggested_offer`
records the **detected** tier's price rather than the one the requester saw and accepted.
That is the capture G40-361 exists to make trustworthy.

Both re-additions are additive and touch neither their row, their re-range, nor their
`tier_source` handling. G40-534 has been told and invited to object or carry them itself.

**Already reconciled, no action left:**

- **`tiers[]` now carry `low`/`generous`** (`600ee3ab`). Their row re-ranges from this
  table with no refetch, and without the full band the client derives its own — rounding
  to whole dollars, so a tapped `truck` showed **$83–$138** where the server and the
  owner's mockup both say **$85–$140**. One band on tap, another on the next fetch.
- **`tier_source` enum.** Theirs is `detected` | `corrected` with `detection_confidence`
  in its own field; mine was `requested` | `detected` | `fallback`. Their AC names the
  enum and mine does not, so Moving emits their shape: `fallback` → `detected` +
  `detection_confidence: 'low'`, `requested` → `corrected`. No information is lost.
- **The bid-mode guard.** Theirs is better than mine and is inherited: I guarded only on
  `gopher_offeringvisible === false`; theirs also keeps `gopher_bid`, which covers a
  restored draft that never fired the action. A case I had not considered.

---

## 13 · ⛔ The defect AC9 caught — an echoed tier suppressed the detector

**Live on production, on Moving AND Junk.** No suite found it and none could have: it is an
interaction between two individually-correct halves.

The client writes the tier the **server detected** into `iq_tier` — correct, it is a capture
column. `formatOrderObjcet` then sends that field on the **next** pricing request, and both
models treated any supplied tier as a requester *correction* outranking the detector. So the
model read its own output back as a user override, pinning the tier to whatever the **first**
fetch produced. That fetch is debounced and fires against an **empty description**, so it is
always the fallback — the detector was dead for the rest of the session, invisibly.

Captured off the device over CDP:

```
request   { request_type: "Moving",
            description:  "move my 3 bedroom house to a new address.",
            iq_tier:      "truck" }     ← nobody picked this
response  $110          correct: $375
```

Junk identically: "whole garage cleanout" → **$60**, correct **$100**. G40-534 measured an
**87% fallback rate**, so this pinned nearly every junk request to the median tier.

⛔ **Self-confirming**, which is its worst property: the detector's own guess became the
evidence for itself — the same class as letting the offer feed the tier estimate, which the
discovery doc rules out by name.

**Fix:** only `iq_tier_source: 'corrected'` counts as a correction. Server-side, so it holds
for every category and cannot be undone by a client rebuild. **Not** "ignore `iq_tier`" —
that would delete the correction row's purpose. Mutation-proved in both directions.

### What this says about AC9

Every guard in this ticket was green, mutation-proved, and wrong about the product. **The
handset was the only instrument that could see it**, because the bug needs a real description
typed at human speed against a real debounce. AC9 is not ceremony.

---

## 14 · Two process failures of mine, recorded

**1. I asserted a root cause I had not checked.** On a config failure I read one logcat line
(`https://localhost/undefined/mobile-config`) and reported the build was missing
`REACT_APP_BASE_URL`. Wrong — the bundle contained the literal all along. I should have opened
the artefact before asserting.

**2. I then read a stale log and got it wrong again.** After a rebuild I saw the same line and
concluded the rebuild had not helped. I had not run `logcat -c`; the entry was from the prior
run, still in the ring buffer.

⛔ **The config failure has no confirmed root cause.** A cached WebView chunk is the likeliest
explanation and is a hypothesis, not a finding.

⚠️ **Installing over the app logs the owner out**, and for a period left his Request app stuck
at the config screen. Expect a re-login on any device install on his daily driver.
