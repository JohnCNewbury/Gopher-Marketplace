# Gopher iQ — how the suggested offer learns

**Status:** specification, revised 2026-09-21. Nothing built.
**Read `G40-502-suggested-pricing-delivery.md` first** — that describes the curve this
starts from; this describes how it moves. **Scope: Delivery.**

> Every number below is measured from `Orders_21_09_2026.csv` (64,777 orders),
> `Counter_Offer_21_09_2026.csv` (8,322 counters) and the ZIP coverage table in
> `Final/assets/js/gopher-iq-data.js`. Where something is a judgement rather than
> a measurement, it says so. **The owner has confirmed this data is queryable
> directly from the production DB** — the exports are a convenience, not the
> source.

---

## 1 · What it is trying to find

**The lowest offer at which a request reliably gets picked up.** Never the most a
requester will tolerate, never revenue.

Owner ruling, 2026-09-21:

> *"The thing data doesn't do is 'feel', and the people making the offer that do
> 'feel' have expressed they're NOT going to pay a lot for a little. I'd rather
> not suggest too high yet."*

The model climbs **only as far as evidence forces it**, from a floor he set,
under a ceiling he sets.

---

## 2 · ⚠️ What changed in this revision, and why

The first draft learned a separate curve per cost-of-goods band, restricted to
the Triangle. **Both were wrong, and measurably so.**

**The Triangle restriction cost 85% of the data.** It was chosen to remove the
supply confound, but the Triangle is only **14.9% of recent** Delivery
resolutions — 116 a month. At that rate the busiest band earned one move every
four months and the thinnest one every 3.5 years. It would have visibly done
nothing for a quarter.

*(An earlier estimate of 36% was wrong: that share is all-time, and the Triangle
was a much larger fraction of early volume than of current volume. Applying an
all-time ratio to a recent window overstated the cadence roughly fourfold.)*

**Per-band learning was unnecessary.** Once supply and offer are fixed, cost of
goods moves fill by only **6–7 points** — against **19 points** for moving the
offer one bucket. Basket size is a second-order effect being given first-order
machinery.

**The fix is to control for supply instead of filtering on it**, and to learn one
level parameter rather than a matrix. That recovers **748 resolutions a month**
instead of 116.

---

## 3 · The measured picture

### 3.1 Supply density is the dominant variable

Delivery resolutions with a known drop-off ZIP (n = 31,504), tiered by **active
Gophers within 10 miles** (`gopher-iq-data.js`, `activeLast3mo`):

| tier | active Gophers | orders | fill rate |
| --- | --- | ---: | ---: |
| none | 0 | 9,720 | **19%** |
| thin | 1–2 | 5,739 | **39%** |
| ok | 3–9 | 4,875 | **52%** |
| dense | 10+ | 11,170 | **81%** |

Nothing else in the dataset comes close to this as a predictor.

### 3.2 Within a tier, the offer drives fill — basket size barely does

Dense tier, fill rate by offer × cost-of-goods band:

| offer | COG $0–15 | $15–35 | $35–60 | $60+ | **spread** |
| --- | ---: | ---: | ---: | ---: | ---: |
| $10–$13 | 81% | 74% | 65% | 83% | 18 pts |
| $13–$16 | 88% | 85% | 88% | 92% | **7 pts** |
| $16–$20 | 91% | 97% | 93% | — | **6 pts** |
| $20–$25 | 91% | 93% | 93% | 97% | **6 pts** |
| $25–$35 | 90% | 95% | 93% | 97% | **7 pts** |

Moving the offer from $10–13 to $16–20 is worth ~19 points. Moving across the
entire range of basket sizes at a fixed offer is worth 6–7. **This is the finding
the whole design rests on.**

### 3.3 ⛔ Money buys fill in every tier — but supply sets the ceiling

| offer | none | thin | ok | dense |
| --- | ---: | ---: | ---: | ---: |
| $10–$13 | 11% | 25% | 35% | 78% |
| $16–$20 | 20% | 33% | 54% | 94% |
| $25–$35 | 31% | 56% | 77% | 94% |
| $35+ | **52%** | 64% | 75% | 94% |

| tier | $10–13 → $20–25 | lift for ~$10 more |
| --- | --- | ---: |
| none | 11% → 28% | +17 pts |
| thin | 25% → 48% | +23 pts |
| ok | 35% → 66% | **+30 pts** |
| dense | 78% → 93% | +16 pts |

**In a ZIP with no active Gophers, $35+ still fills only 52%.** Raising the
suggestion there charges the requester 3.5× for a coin flip. That is not a
pricing problem and the model must never treat it as one — see §6.4.

Note also that **dense saturates early**: it is already at 78% by $10–$13 and
94% by $16–$20. There is very little the model should do there.

### 3.4 Cadence — every tier can move monthly

Last 180 days, Delivery, known ZIP: **4,485 resolutions = 748/month.**

| tier | per month | days to 100 resolutions |
| --- | ---: | ---: |
| dense | 107 | 29 |
| ok | 149 | 20 |
| thin | 179 | 17 |
| none | 313 | 10 |

A **monthly** review is supportable on every tier, with a 100-resolution minimum.

### 3.5 Unit economics, so the cost of being wrong is known

6,037 completed Delivery orders: **$341,723 GMV · $24,201 net · 7.1% take ·
$4.01 average net contribution per completed order.**

⛔ Every extra $1 of suggested offer adds about **$0.08** of platform revenue via
the instant-transfer fee. **Which is exactly why revenue is banned from the
objective** — anything revenue-shaped drifts upward forever with a reason that
always sounds defensible.

---

## 4 · What is actually learned

**Four numbers.** One level multiplier per supply tier, applied to the owner's
anchor curve:

```
suggested(cog, tier) = clamp( anchor(cog) * k[tier], anchor(cog), ceiling[tier] )
```

- `anchor(cog)` is the owner's curve — $10 → $10, $100 → $20, $200 → $30.
- `k[tier]` starts at **1.00** and is the only thing that learns.
- The **shape** of the owner's curve is never touched, only its level, and only
  per supply tier.

Why this shape:

- **It is interpretable.** "In thin-supply areas we are running at 1.15× the base
  curve" is a sentence the owner can accept or reject. A learned matrix is not.
- **Each parameter is well-evidenced.** 107–313 resolutions per month behind each
  of four numbers, rather than a handful behind each of thirty cells.
- **It cannot violate the existing invariants.** Multiplying a monotone,
  ratio-tapering curve by a positive constant leaves both properties intact, so
  the tests already written still hold after every update.
- **The floor is structural.** `k >= 1.00` by construction, so the model can
  climb from the owner's anchors and return toward them, but never go below.

The 6–7 point cost-of-goods effect from §3.2 is **deliberately ignored for now**.
It is real but second order, and folding it in costs an order of magnitude more
evidence per parameter. Revisit once the four multipliers have settled.

---

## 5 · The update rule

Per tier, monthly:

```
fill(tier, offerBucket) = (filled + α·priorFill) / (resolved + α)

target(tier)  = the LOWEST offer bucket whose smoothed fill >= TARGET_FILL
kTarget(tier) = target(tier) / medianAnchorOffer(tier)

k[tier] <- clamp(
    k[tier] + 0.25 * (kTarget - k[tier]),      // quarter of the gap
    k[tier] - MAX_STEP, k[tier] + MAX_STEP,    // MAX_STEP = 0.05 (5% of base)
    1.00, kCeiling[tier]                        // owner floor and ceiling
)
```

**`α` is prior strength in equivalent orders** — the dial the owner described. At
α = 1500 one order moves the estimate by 2¢; at α = 15 it moves it $1.88. Seed at
**α = 300** per tier: roughly three months of that tier's volume, so a tier needs
sustained evidence, not one good week. ⚠️ *Judgement, not measurement — first
thing to tune once live.*

**Proportional steps, not flat.** Moving a quarter of the remaining gap converges
fast when far off and slows to nothing as it approaches — self-damping, and it
cannot overshoot. The first draft's flat $0.50 was the reason it would have taken
two years to close a $5 gap.

**`TARGET_FILL`** is owner-set. **90%** is the suggested start. ⚠️ It is only
reachable in the **dense** tier; in thin and none it is unreachable at any price
(§3.3), which §6.4 handles.

**Counters corroborate; they never initiate.** If a tier's counter rate is high
*and* counters cluster below **1.35×** — the shoulder where requesters demonstrably
do not resist (42% acceptance at ≤1.35×, collapsing to 12% above 2.1×) — that
raises confidence in a move the fill data already supports. Counters alone are a
self-selected population (only workers who thought it was too low bother) and are
biased high in the same way accepted prices are biased low.

---

## 6 · Guardrails

1. **Hard ceiling per tier, owner-set.** The model can never exceed it. This is
   what makes *"I'd rather not suggest too high yet"* a property of the code
   rather than an intention.
2. **Floor is the owner's anchor curve** — `k >= 1.00`, always.
3. **Max 5% of base per tier per month**, and no move without **100 new
   resolutions** in that tier.
4. ⛔ **Marginal fill per dollar, not fill.** A tier may only be raised if the
   evidence shows the increase actually converts. In the **none** tier it does
   not — 11% → 52% for 3.5× the money. **The none tier's ceiling is `k = 1.00`:
   it does not learn upward at all.** When it is starving, the output is an
   alert that the area needs Gophers, not a higher price for the requester.
   Same test applies to any tier: if a raise does not move fill, it is reverted.
5. **It can move down.** Not ratcheted. Two periods without improvement walks it
   back.
6. **Every change is logged with its evidence** — tier, counts, before/after,
   triggering signal — and is revertible to any prior version.
7. **`iq_model_version` is written with every suggestion**, or orders priced by
   different curves become indistinguishable and the dataset is contaminated at
   birth.
8. **Supply tier is computed at request time** from the drop-off ZIP, so the
   suggestion is reproducible after the fact.

---

## 7 · The signals — and the two that must never be used

### ✅ Used

| Signal | Why admissible | Status |
| --- | --- | --- |
| **Expiry** — posted, offered $X, nobody took it | The unbiased read on "too low." iQ did not author it. | ✅ 20,038 orders |
| **Counter** — a Gopher asked for $Y | The revealed supply curve. | ✅ amount, worker, status, timestamp, reason |
| **Counter outcome** | The demand-side response; gives the 1.35× shoulder. | ✅ |
| **Time-to-accept** | Separates "filled" from "filled fast." | ✅ derivable |
| **Supply tier at request time** | The dominant covariate (§3.1). | ✅ from ZIP coverage |
| **Abandonment after the card opens** | The counterweight. | ⛔ **NOT captured — §8** |

### ⛔ Never used

**Accepted offers.** A model fed them learns its own suggestions: iQ says $20,
the requester taps "Use this offer," iQ grows more confident in $20. An echo, not
learning, and it would freeze the anchors while appearing to work.

**Any revenue measure.** §3.5.

> ### ⛔ And the reason the accepted-offer ban matters more as you grow
>
> An accepted price is the **minimum reservation price** among the workers who
> saw the request — a first-order statistic, biased low by construction. **The
> bias deepens as supply grows**, because the minimum of 50 draws is lower than
> the minimum of 5. A model trained on accepted prices would push suggestions
> *down* as the network got healthier, reading success as evidence that the work
> is worth less. Silent, and the worst failure available here.

---

## 8 · ⛔ The missing signal, and why it is the important one

**Fill rate can only see requests that were submitted.** Someone who closes the
app because the suggestion looked absurd never becomes an expired order — they
become nothing at all. The fill signal is *structurally incapable* of detecting
the failure the owner is worried about, so a model driven by fill alone only ever
hears the argument for a higher number.

On a $20 basket the difference is concrete: an $11 suggestion means paying about
**$33** for $20 of groceries; $16 means about **$39**. Fill rate prefers $39. The
requester may simply leave.

**Capture needed:** when the suggestion card opens, record whether the request was
subsequently submitted or abandoned, with the amount shown.

Then add the brake: `if abandonRate(tier) rises after a raise -> roll back`.

**Until that exists the model proposes; the owner approves.** Not a temporary
inconvenience — the correct behaviour while the evidence argues in one direction
only.

---

## 9 · What must be captured

| # | Field | Exists? |
| --- | --- | --- |
| 1 | `iq_suggested_offer` — what iQ displayed | ❌ |
| 2 | `iq_model_version` and `iq_supply_tier` | ❌ |
| 3 | `customer_initial_offer` — what they submitted | ❌ |
| 4 | `suggestion_opened` / `suggestion_used` / `abandoned_after_suggestion` | ❌ |
| 5 | counters with amount, worker, status, timestamp | ✅ |
| 6 | expiries | ✅ |
| 7 | time-to-accept | ✅ |

1–3 are small. **4 is the one that matters and is the only genuinely new
instrumentation.**

---

## 10 · Acceptance criteria

1. Fill rate is computed per supply tier and offer bucket from **expiries and
   fills only**, with supply tier resolved from the drop-off ZIP at request time.
2. No accepted-offer value and no revenue measure appears in the objective. **A
   test asserts this.**
3. `k[tier]` moves at most 5% of base per month, never below 1.00, never above
   the owner's ceiling, and only with ≥100 new resolutions.
4. **The `none` tier never learns upward.** A test asserts it.
5. A raise that does not improve fill within two periods is reverted. Exercised
   by a test, not only the upward path.
6. After any update the curve is still monotone in cost and tapering in ratio —
   the existing pricing tests pass against the moved curve.
7. Every move is logged with its evidence and is revertible.
8. Until §8's capture exists, moves are **proposed, not applied**.

---

## 11 · Risk / reward

**What it solves.** The starting curve is a judgement made under uncertainty —
deliberately below historical behaviour, on the owner's read of customers arriving
from marketplaces that trained them to pay almost nothing. Parts of it will be
wrong in ways nobody can see today. This finds out which parts, from evidence,
without anyone re-litigating it from instinct.

**The reward.** The **ok** tier converts money into fill better than anywhere else
— +30 points for ~$10 — and sits at 52% fill today. That is the tier where a
correct suggestion is worth the most, and it is invisible without the supply
dimension. At $4.01 net per completed order, moving that tier's 149 monthly
resolutions from 52% to 70% is roughly 27 additional completed orders a month.

**The risk.** A model that raises suggestions on one-sided evidence drives
requesters away invisibly — precisely what the owner's instinct is protecting
against, and precisely what fill rate cannot see. §6's caps and §8's brake exist
for that. Maximum exposure from a wrong move is one month at 5% of base on one
tier, logged and revertible.

**What is NOT verified.** The fill-to-offer relationship is observational, not
causal. `α`, `TARGET_FILL` and the tier boundaries are judgement. The ZIP coverage
table is a static snapshot derived from July 2026 exports and **must be refreshed
from the live database** before it drives pricing. No part of this has run against
live traffic.
