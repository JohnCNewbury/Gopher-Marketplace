# Suggested pricing — can Ride, Junk and Moving join this release?

**Discovery only. Nothing built. 2026-09-22.**
Follows G40-502 (Delivery), which is shipped and live — see
`G40-502-suggested-pricing-delivery.md` for the pattern this would repeat.

**Verdict: yes for all three, but they are not equal.** Moving is the
best-prepared, Junk is close behind, and Ride has a calibrated model with **no
written spec** and its model in the wrong place.

---

## 1 · The short answer

| | Calibrated model | Workbook | Written doc | Live form has the input? | Verdict |
| --- | :---: | :---: | :---: | --- | --- |
| **Moving** | ✅ shared module | ✅ ×3 | ✅ **714 lines** | ✅ `description` | **Ready** |
| **Junk Removal** | ✅ shared module | ✅ ×2 | ✅ 127 lines | ✅ `description` | **Ready** |
| **Ride Sharing** | ✅ but page-local | ✅ | ❌ **none** | ⚠️ miles yes, minutes no | **Needs a spec first** |

The owner's instinct was right: *"the code and logic exist in the new gopher
marketplace."* They do. The qualifier is **where** they live and **what the live
form can feed them**.

---

## 2 · What G40-502 established that these three inherit

The Delivery work built the seam, and it is the reason these are cheap now:

- **A pricing module on the backend** — `helpers/suggested_pricing.js`, pure, no
  models, no network. Each new category is a function in it.
- **One endpoint** — `orders/smart_price`. It currently assumes cost-of-goods.
  ⚠️ **It must learn to route by category**, because these three price on
  completely different axes. That is the one piece of shared work all three need
  and none of them can skip.
- **A client control** — `smartPriceSuggestion`, already owning its own
  visibility, already rendering the card, already writing the offer and the
  capture fields. Adding a category is a JSON declaration, not a new component.
- **The capture columns** — `iq_suggested_offer`, `iq_model_version`,
  `customer_initial_offer`, `suggested_offer_used`. They are category-agnostic
  and already live.

**So the per-category work is: port the model, teach the endpoint the category,
declare the control in the right schemas.**

---

## 3 · Moving — the strongest candidate

**Model:** `MOVING_TIERS` + `suggestedMovingOffer` + `detectMovingTier`, in the
**shared** module `Final/assets/js/gopher-request-logic.js`. Portable as-is.

Four anchors, owner-set:

| tier | suggested |
| --- | ---: |
| A few items | $75 |
| A truck-load | $110 |
| 1–2 bedroom home | $225 |
| 3+ bedroom home | $375 |

**Documentation: the best of the three — 714 lines across two docs**
(`moving-suggested-pricing-discovery.md` 346, `moving-suggested-pricing-build-spec.md`
368), plus the *Moving Price Intelligence Blueprint* and two seed workbooks.
It carries the owner's D1–D10 rulings and the reasoning behind four anchor
revisions in a single day.

**Live input:** the tier is detected from the **description**, which all the
moving forms have.

⚠️ **Three constraints the docs already settle — do not re-derive them:**

- **D4: trip distance is NEVER an input to Moving.** The live forms carry a
  `distance` field. Using it would contradict a recorded ruling.
- **D9: forward learning is FROZEN for Moving** (`w = 0`). Blending would move
  'few' from $75 back to $100 and undo D8's headline fix.
- **Stairs must not change the suggestion.** An acceptance test is deliberately
  inverted to assert this; a regression there reintroduces a known $115 bug.

⚠️ **Moving is four live forms, not one:** `moving.json` is a menu routing to
`locationmove`, `samelocationmove`, `othermoving` and `storepickupdelivery`.
Scope the ticket to all of them or say explicitly which are out.

---

## 4 · Junk Removal — ready, with one UI piece

**Model:** `JUNK_TIERS` + `suggestedJunkOffer` + `detectJunkVolumeTier`, also in
the **shared** module. Three tiers: Single item $40 · Half-truck $60 ·
Full truck/trailer $100, with low/generous at ±25%.

**Documentation:** `junk-suggested-pricing.md` (127 lines) including the
recalibration recipe, plus two workbooks.

**Live input:** `detectJunkVolumeTier` reads the **description** with a keyword
regex, and `junkremoval.json` has `description`. It falls back to the median
tier at low confidence rather than guessing high.

⚠️ **It needs the tier-selector row.** In the prototype iQ pre-selects the
detected tier and shows three buttons so the requester can correct it — and the
owner's own note records why: a bug where the detector silently defaulted every
request to the median tier meant the correction path is the safety net, not a
nicety. **A silent detector with no visible correction is the failure mode
here.** That is the only genuinely new UI in this ticket.

---

## 5 · Ride Sharing — real model, no spec, and in the wrong file

**Model:** `RIDE_RATES` + `RIDE_MILE_TIERS` + `rideSuggestedOffer`, calibrated
against **1,226 real rides plus Uber/Lyft benchmarks**. Tapered per-mile tiers
($2.40/mi close in, down to $1.05 beyond 40), a $0.55/min time component, an
$8 floor, the Gopher fee held constant across the band, and an 8% instant-transfer
uplift.

⚠️ **It is NOT in the shared module.** It lives inside
`Final/gopher-request.html` as page-local code. Junk and Moving are importable;
this one has to be lifted out first.

❌ **There is no pricing doc.** The workbook exists
(`Gopher_RideShare_Suggested_Offer_Analysis_2.xlsx`, 122KB) but nothing in
`docs/handoff/` describes the model, its rulings, or its recalibration recipe —
the two ride docs there are about vehicle info and missing details, not pricing.
**Every constant above would have to be re-derived from the workbook and the
owner's memory.** That is the real cost of this one, and it is why it should not
be scoped identically to the other two.

**Live input — better than expected:**

- ✅ **Miles are already live.** `needaride.json` declares a `getDistance`
  control, which calls `get_distance?origin=&destination=` and writes real
  Distance-Matrix miles into the form. Nothing to build.
- ⚠️ **Minutes are not surfaced.** The ride model uses time as half its variable
  component. Distance Matrix already returns duration; the backend helper parses
  only `distance.text` and throws the rest away. Small change, but it is a change
  to a shared helper used elsewhere — **check every consumer before widening it.**

---

## 6 · What all three share, and must not be duplicated

`orders/smart_price` takes `service_cost` and assumes a cost-of-goods curve.
These three price on **miles+minutes**, **a volume tier** and **a move tier**.

**Do this once, not three times:** teach the endpoint to route on category and
return the same `{suggested, low, generous, model_version}` shape regardless of
how it got there. The client already consumes that shape and needs no change per
category beyond a JSON declaration.

⚠️ **`iq_model_version` must be distinct per category** (e.g.
`g40-5xx-moving-anchors-<date>`), or orders priced by different models become
indistinguishable in the capture — the same trap G40-502 closed for Delivery.

---

## 7 · Recommended ticket split

**Prerequisite — fold into the first ticket, do not make it a fourth:**
category routing in `get_smart_price`, plus per-category `iq_model_version`.

| # | Ticket | Prep | Notes |
| --- | --- | --- | --- |
| 1 | **Moving** | highest | 714 lines of spec; four forms; three recorded rulings to honour |
| 2 | **Junk Removal** | high | shared model; needs the tier-selector row |
| 3 | **Ride Sharing** | **lowest** | lift the model out of the page, surface minutes, **write the spec first** |

**Order matters.** Doing Moving first carries the shared routing work on the
best-documented category. Ride last, because its spec does not exist yet and
writing it is the bulk of the work.

⚠️ **Ride Sharing is also promised where it does not exist.**
`gopher-request-101.html` already tells users iQ is on Ride Sharing, and
`needaride.json` has zero references to `smart_price`. Shipping the Ride ticket
would make that sentence true; until then the guide is wrong. Recorded in
G40-502's doc as owner-deferred.

---

## 8 · Honest answer to "do we have enough documentation?"

**Moving: yes, comfortably.** More than Delivery had.

**Junk: yes.** Thinner, but the model is calibrated, the seed data is there and
the recalibration recipe is written.

**Ride: no — the model exists but the documentation does not.** It is buildable,
because the code and the workbook are both real, but the spec has to be written
as part of the work rather than read. Scoping it like the other two would
under-estimate it.

**What is NOT verified:** none of these models has been checked against current
production data the way Delivery's was, and that check is what surfaced the
$50 hole and the 46% over-suggestion. Expect each to need one.
