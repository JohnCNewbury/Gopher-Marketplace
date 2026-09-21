# Gopher iQ — how the suggested offer learns

**Status:** specification. Nothing built. **Read `G40-502-suggested-pricing-delivery.md` first** —
this describes how the curve *moves*; that describes the curve it starts from.
**Scope: Delivery, Triangle only, to begin with.**

> **Everything below is measured from two exports the owner pulled on 2026-09-21** —
> `Counter_Offer_21_09_2026.csv` (8,322 counters) and `Orders_21_09_2026.csv`
> (64,777 orders) — plus the completed-order fee columns. Where a number is an
> assumption rather than a measurement, it says so.

---

## 1 · What it is trying to find

**The lowest offer at which a request reliably gets picked up.** Not the highest
a requester will tolerate, not the average accepted price, and never revenue.

The reason it is the *lowest* such offer is the owner's ruling of 2026-09-21:

> *"The thing data doesn't do is 'feel', and the people making the offer that do
> 'feel' have expressed they're NOT going to pay a lot for a little. I'd rather
> not suggest too high yet."*

So the model's job is to climb **only as far as the evidence forces it**, from a
floor the owner set, under a ceiling the owner sets.

---

## 2 · The measured picture it starts from

### 2.1 Fill rate is driven by the OFFER, not by basket size

Delivery requests in served Triangle ZIPs that either filled or expired
(n = 12,073; overall fill **79.6%**, against 48.1% platform-wide — supply
density outside the Triangle swamps everything, which is why scope is the
Triangle):

| offer | $0–15 COG | $15–35 | $35–60 | $60–90 | $90+ |
| --- | ---: | ---: | ---: | ---: | ---: |
| under $10 | 35% | 25% | 33% | — | — |
| $10–$13 | 79% | 72% | 63% | 82% | — |
| $13–$16 | 86% | 83% | 86% | 91% | 91% |
| $16–$20 | 91% | 95% | 92% | — | — |
| $20–$25 | 89% | 93% | 90% | 93% | 98% |
| $25+ | 89–92% | 93% | 92–98% | 96–97% | 96% |

**The knee sits in the same place — around $13–$16 — at every basket size**, and
above roughly $20 more money buys almost nothing. That is the single most useful
fact in this document: the model is looking for one knee per band, and it knows
roughly where to expect it.

⚠️ **Observational, not causal.** Requesters who offer more may differ in other
ways. The relationship is monotone across every band and the mechanism is
obvious (Gophers choose by offer), but this is correlation and the model must be
able to be wrong about it — hence §5's rollback.

### 2.2 What workers ask for when they push back

6,282 Delivery counters with amounts. Median counter is **1.50×** the original
offer; **91%** of counters come in above it.

| COG band | counters | median offer | median ask | ask ÷ offer |
| --- | ---: | ---: | ---: | ---: |
| $0–$15 | 2,080 | $10 | $20 | 2.00× |
| $15–$35 | 2,571 | $10 | $20 | 2.00× |
| $35–$60 | 914 | $15.25 | $23 | 1.51× |
| $60–$90 | 351 | $22 | $30 | 1.36× |
| $90–$125 | 237 | $28 | $40 | 1.43× |
| $125+ | 129 | $30 | $50 | 1.67× |

And what the requester does about it:

| counter asks… | n | requester accepts |
| --- | ---: | ---: |
| ≤1.15× | 684 | 42% |
| 1.15–1.35× | 1,059 | 42% |
| 1.35–1.6× | 1,963 | 37% |
| 1.6–2.1× | 1,605 | 26% |
| >2.1× | 899 | 12% |

**There is a shoulder at about 1.35×** — below it the requester does not flinch;
past 1.6× acceptance collapses. That shoulder is the corroborating signal in §4.

### 2.3 Unit economics, so the cost of being wrong is known

6,037 completed Delivery orders: **$341,723 GMV · $24,201 net · 7.1% take rate ·
$4.01 average net contribution per completed order.** Net per order rises with
basket size ($2.70 → $14.62) while take rate falls (9.8% → 5.4%), because the
Gopher fee is a flat $0.99 and only the ~7.4% instant-transfer fee scales.

⛔ **Which is exactly why the objective is not revenue.** Every extra $1 of
suggested offer adds about **$0.08** of platform revenue through the ITF. A
model optimising anything revenue-shaped drifts upward forever with a
defensible-looking reason. Fill rate and time-to-fill only.

---

## 3 · The signals — and the two that must never be used

### ✅ Used

| Signal | Why it is admissible | Status |
| --- | --- | --- |
| **Expiry** — posted, offered $X, nobody took it | The unbiased read on "too low." iQ did not author the outcome. | **Captured today** (`AASM = expired`, 20,038 orders) |
| **Counter** — a Gopher asked for $Y instead | The revealed supply curve: direct observation of a worker's floor. | **Captured today** (`Counter_Offer` export: amount, gopher, status, timestamp, free-text reason) |
| **Counter outcome** — accepted or declined | The demand-side response. Gives the §2.2 shoulder. | **Captured today** |
| **Time-to-accept** | Separates "filled" from "filled fast." | Derivable from `CREATED AT` → `ORDER IN PROGRESS` |
| **Abandonment after the card opens** | The counterweight. See §6. | ⛔ **NOT captured — must be built** |

### ⛔ Never used

**Accepted offers.** If the model learns from prices requesters accepted, it
learns its own suggestions. iQ says $20, the requester taps "Use this offer," iQ
observes $20 and grows more confident in $20. That is an echo, not learning, and
it would freeze the anchors permanently while appearing to work.

**Any revenue measure.** §2.3.

> ### ⛔ And the reason this matters more as the platform grows
>
> An accepted price is the **minimum reservation price** among the workers who
> saw the request — a first-order statistic, biased low by construction. **The
> bias deepens as supply grows**, because the minimum of 50 draws is lower than
> the minimum of 5. A model trained on accepted prices would therefore push
> suggestions *down* as the Gopher network got healthier — reading success as
> evidence that the work is worth less. This is the single worst failure mode
> available here and it is silent.

---

## 4 · The update rule

### 4.1 Shape

Per **band** (the §2.1 COG bands) and per **offer bucket**, keep a rolling
window of resolutions. The estimated fill rate is smoothed toward the band's
prior so a thin bucket cannot swing it:

```
fillRate(band, offer) = (filled + α · priorFill) / (resolved + α)
```

`α` is prior strength **in equivalent orders**. This is the dial the owner
described: at α = 1500 one order moves the estimate by 2¢; at α = 15 it moves it
$1.88.

**Seed `α` from the real evidence behind each band** (Triangle, filled-or-expired):

| band | orders | seed α |
| --- | ---: | ---: |
| $0–$15 | 5,188 | 500 |
| $15–$35 | 4,182 | 500 |
| $35–$60 | 1,348 | 250 |
| $60–$90 | 608 | 150 |
| $90+ | 747 | 150 |

⚠️ **The α column is a judgement, not a measurement** — chosen so a band needs
roughly 10% of its historical volume in new evidence before it moves materially.
It is the first thing to tune once the model is live.

### 4.2 The target

```
target(band) = the LOWEST offer bucket whose smoothed fill rate >= TARGET_FILL
```

`TARGET_FILL` is owner-set. **90%** is the suggested start — §2.1 shows it is
reachable in every band by $16–$20, and chasing the last few points costs real
money for almost no fill.

Corroboration from §2.2: if a band's counter rate is high **and** counters
cluster below 1.35× (the shoulder, where requesters do not resist), that is
independent evidence the band is underpriced. It may **raise confidence** in a
move the fill data already supports. **It may not initiate one** — counters are
a self-selected population (only workers who thought it was too low bother), so
alone they are biased high in the same way accepted prices are biased low.

### 4.3 Movement

```
suggested(band) <- clamp(
   suggested(band) + sign(target - suggested) * min(STEP, |target - suggested|),
   floor(band),      // the owner's anchor curve — never goes below
   ceiling(band)     // owner-set, hard
)
```

Then **re-project the whole curve** so the two invariants the tests already
enforce still hold: the offer never falls as cost rises, and the offer-to-cost
ratio never rises. A band cannot be moved in isolation into a shape that
contradicts its neighbours.

---

## 5 · Guardrails

1. **Hard ceiling per band, owner-set.** The model cannot exceed it, ever. This
   is what makes *"I'd rather not suggest too high yet"* a property of the code
   rather than an intention.
2. **Floor = the owner's anchor curve.** $10 → $10, $100 → $20, $200 → $30. The
   model may climb from it; it may never go below it.
3. **STEP cap.** No band moves more than **$0.50** per review period. A wrong
   move is visible for one period and costs cents per order.
4. **Minimum evidence.** No move without at least **200 new resolutions** in
   that band since its last move.
5. **It can move down.** If a raise does not improve fill within two periods, it
   walks back. Movement is not ratcheted.
6. **Triangle only, to start.** §2.1 — supply density outside the served area
   dominates fill and would teach the model that everything is underpriced.
7. **Every change is logged with its evidence** — the band, the counts, the
   before/after, the triggering signal — and is revertible to any prior version.
8. **`iq_model_version` is written with every suggestion**, or orders priced by
   different curves become indistinguishable and the dataset is contaminated at
   birth.

---

## 6 · ⛔ The one signal that is missing, and why it is the important one

**Fill rate can only see requests that were submitted.** If a suggestion is high
enough that someone closes the app, that never becomes an expired order — it
becomes nothing at all. So the fill signal is *structurally incapable* of
detecting the failure the owner is worried about, and a model driven by fill
alone only ever hears the argument for a higher number.

On a $20 basket the difference is concrete: an $11 suggestion means paying about
**$33** for $20 of groceries; a $16 suggestion means about **$39**. The fill data
prefers $39. The requester may simply leave.

**Capture needed:** when the suggestion card is opened, record whether the
request was subsequently submitted or abandoned, with the suggested amount.

Then add the brake:

```
if abandonRate(band) rises materially after a raise -> roll the band back
```

**Until that exists, the model must not be given authority to raise a band on
fill evidence alone.** It can propose; the owner approves. That is not a
temporary inconvenience — it is the correct behaviour while the evidence is
one-sided.

---

## 7 · What must be captured before any of this runs

| # | Field | Where | Exists? |
| --- | --- | --- | --- |
| 1 | `iq_suggested_offer` — what iQ displayed | order | ❌ |
| 2 | `iq_model_version` | order | ❌ |
| 3 | `customer_initial_offer` — what they actually submitted | order | ❌ |
| 4 | `suggestion_opened` / `suggestion_used` / `abandoned_after_suggestion` | event | ❌ |
| 5 | counters with amount, worker, status, timestamp | — | ✅ |
| 6 | expiries | — | ✅ |
| 7 | time-to-accept | — | ✅ (derivable) |

**1–3 are small.** 4 is the one that matters most and is the only genuinely new
instrumentation.

---

## 8 · Acceptance criteria

1. Per band and offer bucket, a smoothed fill rate is computed from **expiries
   and fills only**, restricted to served Triangle ZIPs.
2. No accepted-offer value and no revenue measure appears anywhere in the
   objective. A test asserts this.
3. A band moves at most `STEP` per period, never below the owner's anchor floor,
   never above the owner's ceiling, and only with `MIN_EVIDENCE` new
   resolutions.
4. After any move the full curve is re-projected: monotone in cost, tapering in
   ratio. The existing tests must still pass against the moved curve.
5. Downward movement is exercised by a test, not only upward.
6. Every move is logged with its evidence and is revertible.
7. Until §6's abandonment capture exists, moves are **proposed, not applied**.

---

## 9 · Risk / reward

**What it solves.** The starting curve is a judgement made under uncertainty —
deliberately below historical behaviour, on the owner's read of customers
arriving from marketplaces that trained them to pay almost nothing. That
judgement will be partly wrong in ways nobody can see today. This is the
mechanism that finds out which parts, from evidence, without anyone having to
re-litigate it from instinct.

**The reward.** In the Triangle, requests at $10–$13 fill at 72–79% while those
at $16–$20 fill at 91–95%. If the marketplace proves that gap is real and
causal, closing it on the $15–$35 band alone is roughly 960 additional completed
orders across the historical sample, about **$3,200** of contribution at $3.35
net per order. The mechanism earns that only if the evidence supports it.

**The risk.** A model that raises suggestions on one-sided evidence drives
requesters away invisibly — the exact thing the owner's instinct is protecting
against, and the thing fill rate cannot see. §5's caps and §6's brake exist for
that and nothing else. If it is wrong, one period of $0.50 on one band is the
maximum exposure, and every move is logged and revertible.

**What is NOT verified.** The fill-to-offer relationship is observational. The
`α` values are judgement. No part of this has been run against live traffic.
