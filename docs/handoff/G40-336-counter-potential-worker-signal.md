# G40-336 — iQ "Counter potential": the worker-side signal

**Jira:** [G40-336](https://gopherapp.atlassian.net/browse/G40-336) (Story) · labels `gopher-go`, `gopher-iq` · Priority Medium
**Canonical decision:** **D-034** in `Canonical Go Flow - Master/gopher-go-canonical.html`
**Nature:** backend/data + two pieces of worker UI. The **computation is developer-only** — pricing and
matching logic are fenced from AI edits. Nothing in the prototype implements this today.
**Status:** specced, not built. Design exists as a mock and as §8 of the iQ board demo.

---

## 1. What it is, in one line

When a requester posts an offer **materially below what that same requester has historically paid**, the
worker's available-request card shows one pill — `iQ · Counter potential` — and the job-detail screen shows
the read plus a suggested counter amount.

This is the **first supply-side iQ feature.** Everything iQ does today serves the demand side.

Why it matters commercially: it raises worker take-home **without touching platform economics** — the
platform fee sits on the requester side, and the worker's counter moves `Earn` only. It is a retention
feature that costs the platform nothing per use.

---

## 2. Owner decisions — settled 2026-07-26, do not re-litigate

| # | Decision | Rationale |
|---|---|---|
| 1 | Show a **band** ("usually pays $75–$90"). **Never** an exact average, and never a job count. | Actionable for the worker without publishing another user's precise spending history. See `INV-CPRIVACY` (§7). |
| 2 | The suggested amount **clamps silently** to the worker's counter cap. | iQ must never suggest a number the worker cannot send. The cap is **never named in the UI** — naming it turns the pill into a tier upsell, which is a different message from "get paid what this job is worth." |
| 3 | Repeat-customer is a **quiet metadata mark** ("4th request"), not a badge. | It must not compete with the pill for attention. Demoted from the pill it used to be. |
| 4 | Scope for now = **spec + documentation only.** No prototype implementation. | The computation is backend logic reserved for the human developer. |

---

## 3. The data — verified against `Orders.csv`, 2026-07-26

Source: `Documentation/Dashboard/data/master/Orders.csv` — **62,528 orders**, 2018-10-16 → 2026-07-25.
Recomputed from scratch for this spec; **three figures quoted in earlier drafts did not survive
verification** (§3.3).

### 3.1 The behaviour already exists

| Figure | Value | How |
|---|---|---|
| Orders involving a counter-offer | **6,020 = 9.6% of all orders** | `COUNTER INVOLVED = 'Y'` |
| Completed orders | **20,366** | `AASM = 'delivered'` |
| Completed orders from requesters with 3+ prior completed | **14,416 = 70.8%** | chronological walk |
| Orders carrying a worker offer > 0 | **60,848** | `GOPHER OFFER > 0` |

Workers counter on about **1 in 10** requests today, blind. This arms an existing behaviour rather than
introducing one — the strongest single line available for this feature.

### 3.2 The threshold is the whole design

Baseline = the mean of that requester's **prior completed** accepted offers. Chronological — an order is
only ever scored against history that existed **before** it.

| Stage | Value |
|---|---|
| Requests where the requester has ≥3 prior completed jobs (**eligible**) | 22,438 = **37%** of requests |
| Of eligible: offer comes in **below** the requester's own prior average | 57.5% |
| Median gap when below | **$3.75** |
| Of eligible: gap is **material** (≥ $10 **AND** ≥ 15%) | 1,951 = 8.7% |
| **Fire rate over all requests** | **≈ 1 in 31** |

Firing on every below-average request would put the pill on ~21% of all requests at a median gap of
**$3.75** — workers would tune it out inside a week and the pill would be worth nothing. The material-gap
test is what makes it mean something.

**Threshold sensitivity** (same method; tune here, not in the UI):

| Threshold | % of eligible | Fire rate overall |
|---|---|---|
| ≥ $15 and ≥ 20% | 2.7% | 1 in 138 |
| **≥ $10 and ≥ 15%** *(spec default)* | **8.7%** | **1 in 31** |
| ≥ $8 and ≥ 12% | 12%¹ | 1 in 25¹ |
| ≥ $5 and ≥ 15% | 19%¹ | 1 in 17¹ |

¹ unsegmented baseline, same walk. Treat as directional: the point is that the absolute floor, not the
percentage, is what moves the rate.

### 3.3 Corrections to earlier drafts — read this before quoting any number

Three figures circulated on 2026-07-25 (and reached the board deck) **could not be reproduced**:

| Claim | Reality | Cause |
|---|---|---|
| "15,330 completed" | **20,366** completed (`delivered`) | Does not reconcile to `Orders.csv` under any definition tried (incl. excluding the owner's own accounts: 17,293 / 17,017). Provenance unknown. |
| "82% of completed orders come from customers with 3+ prior completed jobs" | **70.8%** | — |
| "1 in 13 requests would show the pill" | **1 in 31** | The original figure was computed with a baseline that averaged the requester's **whole history including orders that came after** the one being scored. Reproducing that leaky method gives ~1 in 18; making it chronological gives 1 in 31. |

**A leaky baseline cannot be implemented** — at runtime the future does not exist. Any figure computed that
way overstates the fire rate. The board deck has been corrected to the verified numbers.

---

## 4. Eligibility and cold start

The pill is **silent** unless all of these hold. Silence is the default and the safe state.

1. **Request is fixed-price.** Never on `mode='bid'` — the worker sets the price there, so the signal is
   meaningless (same reasoning that already excludes `TOP PAY` from bids).
2. **Not a deal card.** Suppressed on Gopher Deal and directed provider-deal bookings, matching `TOP PAY`.
3. **Requester has ≥ 3 prior completed jobs** in the comparison scope. Below that the average is noise.
   **63% of requests are not eligible** — that is the expected steady state, not a bug.
4. **The gap is material:** `avg − offer ≥ $10` **AND** `(avg − offer) / avg ≥ 0.15`.
5. **A valid counter exists inside the worker's cap** — see §6. If the clamped suggestion cannot beat the
   offer, suppress the pill entirely rather than suggest an unsendable number.

New requesters, and requesters new to a category, therefore never trigger it. That is correct: there is
nothing to read.

---

## 5. Two hazards that only appear at scale

### 5.1 `TOP PAY` and `Counter potential` can contradict each other

`TOP PAY` already exists on the same card (§9.2 of the canonical). It fires when the requester-side
`offerBand` is `generous` against the **platform** suggested-offer model. Counter potential compares against
**this requester's own** history. **The two models can disagree** — a habitually generous requester can post
an offer that is generous platform-wide yet below their own norm.

> **Rule: they must never appear on the same card. `TOP PAY` wins, and Counter potential is suppressed.**

A card that says both "this pays unusually well" and "there's money left on the table" destroys trust in
both signals. `TOP PAY` wins because platform-wide generosity is the broader, more defensible claim, and
because nudging a counter on a genuinely generous offer reads as coaching greed.

### 5.2 The baseline feeds on its own output

The baseline is the mean of **accepted** amounts. A successful counter raises the accepted amount. So every
counter this feature causes **raises that requester's baseline**, which widens the gap on their next
request, which makes the pill fire more often — a positive feedback loop that gets stronger as the feature
succeeds.

Measured today: countered completed orders settle at a **$20.00 median / $27.29 mean** versus **$15.00 /
$24.69** for non-countered ones. The effect is already visible in the data.

> **Rule: exclude `COUNTER INVOLVED = 'Y'` orders from the baseline.**

Cost of the fix: the fire rate moves from 1 in 31 to **1 in 34** at today's volume — a ~9% relative change,
cheap now and structurally necessary later. The flag already exists on the order; there is nothing to build.
The alternative (baseline off the requester's **original offers** rather than accepted amounts) also works
and is worth considering, but it measures intent rather than what workers actually got paid.

---

## 6. Interaction with the counter-offer cap (D-026)

D-026 is authoritative and unchanged by this ticket:

- A counter adjusts **`Earn` only** and must **beat the requester's offer**.
- **Standard:** 5 counters per calendar month (resets the 1st), floor **$20**, ceiling **150% of the OFFER
  only** — Cost of Items is **not** in the base.
- **Elite / Elite+ / Pro:** unlimited and uncapped.
- Caps are enforced **server-side**.

The suggestion is therefore:

```
band        = quantised(requesterCategoryAvg)        # display only, see §7
target      = requesterCategoryAvg                   # the raw read
cap         = tiered ? Infinity : max(20, 1.5 * offer)
suggestion  = clamp(target, offer + 1, cap)           # rounded to a whole dollar
if suggestion <= offer:  suppress the pill entirely
```

**The clamp is silent** (owner decision 2). The worker never sees the cap named, and never sees a number
they cannot send. The server re-validates on submit regardless — the client suggestion is a convenience, not
an authority.

*Worked example, the one in the mock:* offer $65, requester band $75–$90, cap = `max(20, 1.5 × 65)` =
**$97.50**. Suggestion $80 is inside the cap for **every** tier, which is why the mock uses it.

---

## 7. Privacy — `INV-CPRIVACY`

> **A worker may never see another user's precise payment history.** Counter potential may surface only a
> **quantised band** derived from **≥ 3** of that requester's completed jobs. Never an exact average, never a
> job count, never per-job amounts, never a trend over time.

This is a new class of read and it needs naming, because it does not fit the existing rungs in
`Gopher-iQ-Scoping.md`: Rung 2 ("grounded read") is defined as retrieval over **the user's own** data. This
reads **counterparty** data and shows a derived aggregate to a *different* user. Call it **Rung 2b —
counterparty aggregate.** Any future feature in that class inherits this invariant.

Band construction: round the average to a sensible increment (the mock uses $5) and present it as a range
that **contains** the average without revealing it — e.g. avg $82 over 11 jobs → "usually pays $75–$90".
The band must not be invertible: do not also publish the sample size, or the band plus n leaks the mean.

Related and consistent: `INV-RATING` — ratings are never surfaced to either party. Same principle, different
field.

---

## 8. Where it renders

**Feed card** (`jobs-list`) — one pill in the **flags row**, alongside `Tools on site` etc. Nothing else on
the card changes. The pill is the entire footprint in the feed; the reasoning does not belong here.

**Job detail** (`job-detail`) — an iQ panel placed **directly above the action grid**, so the read sits next
to the `Counter-Offer` button it is arguing for:

| Element | Copy |
|---|---|
| Panel heading | `iQ` · **COUNTER POTENTIAL** |
| Read | "This requester **usually pays $75–$90** for jobs like this — 8 of their last 11." |
| Sub | "They've offered below their own norm this time. Countering is unlikely to cost you the job." |
| Suggestion | "iQ suggests **$80** · +$15 over the offer" |
| Button | `Counter-Offer $80` |

> ⚠️ The mock's read line says "8 of their last 11", which **contradicts §7** (it publishes a sample count).
> Ship it as "for jobs like this" with no count, or with a deliberately coarse qualifier ("most of the time").
> Flagged as an open item — the mock has not been changed, because the *design* of the panel is approved and
> only that clause needs a copy decision.

**Repeat-customer mark** — grey circular-arrow glyph + "4th request", in the stats line beside distance and
duration. On job detail it appears once as a low-contrast chip. Not a badge, not green, not competing.

---

## 9. Build shape (developer)

**Precompute, don't compute per card.** The feed fans out one request to many workers; scoring inside the
card render is an N+1 waiting to happen at broadcast time.

- Materialise a per-`(requester, category)` aggregate: `n`, `mean`, `updated_at`, built from completed
  orders with `COUNTER INVOLVED = 'N'`.
- Refresh on order completion for that pair only — it is an incremental mean, not a rescan.
- The scoring decision (`show / suppress`, `band`, `suggestion`) is computed **once per request at creation
  time** and stored on the request, then read by every worker's feed. The requester's history does not
  change while a request is open, so there is nothing to recompute per viewer. The only per-worker part is
  the **cap clamp**, which depends on the worker's tier — apply that at render.
- **Fail silent.** If the aggregate is missing, stale, or errors, omit the pill. A missing pill is invisible;
  a wrong pill costs a worker money and costs the platform trust. Never block a card render on this.

**Category is the open data problem.** The spec calls for a per-category baseline — a requester's
junk-removal norm must not set the bar for their handyman job. **`Orders.csv` has no category column.**
`TITLE` is a canned category string for delivery orders but **free text** for service orders (3,589 distinct
values across 9,451 orders), so per-category baselines **cannot be computed from the current export**. The
figures in §3.2 therefore use an **unsegmented** baseline. Production needs a real `category_id` on the
order; until it exists, either ship unsegmented (and say so) or block on the category field. This is the one
item that would make the feature wrong rather than merely coarse.

---

## 10. Acceptance tests

1. Requester with 2 prior completed jobs → **no pill** (below the n≥3 floor).
2. Requester avg $82, offer $78 → gap $4 → **no pill** (fails the $10 floor).
3. Requester avg $82, offer $65 → gap $17 = 20.7% → **pill fires**; suggestion $80; card shows the pill in
   the flags row and nothing else changes.
4. Same as 3 but `mode='bid'` → **no pill**.
5. Same as 3 but the card also qualifies for `TOP PAY` → **`TOP PAY` only**, Counter potential suppressed.
6. Standard worker, offer $20, requester avg $95 → cap = `max(20, 30)` = $30 → suggestion clamps to **$30**,
   silently; no cap language anywhere in the UI.
7. Standard worker whose clamped suggestion would be ≤ offer → **no pill**.
8. Requester's last 4 completed jobs were all counter-driven → those orders are **excluded** from the
   baseline.
9. Aggregate row missing → card renders normally with **no pill** and no error surfaced to the worker.
10. Panel copy contains **no** exact average and **no** job count (§7).

---

## 11. Explicitly out of scope

- Any change to fee logic, the counter cap, or payout. D-026 and `INV-PAYOUT` are untouched.
- Any change to **which** worker sees **which** request. This is information on a card the worker already
  sees — it is not matching logic.
- Showing requester ratings or a "requester reliability" score. Barred by `INV-RATING`.
- Requester-side visibility. The requester is never told that their offer was flagged, and never told which
  workers saw it.

## 12. Open items

1. **Category field** (§9) — blocks the segmented baseline. The one real blocker.
2. **The "8 of their last 11" clause** (§8) — needs a copy decision to comply with §7.
3. **RFP placement** — this is new scope that would price under SOW **bucket B (Worker flow — Gopher Go)**.
   Deliberately **not** added to the RFP: the bid documents are out with vendors, and adding a feature
   changes what they are pricing. Owner's call whether it goes into bucket B or into the iQ workstream annex
   when that annex is written.
4. Whether the band increment is $5 at all price points, or scales with the amount.
