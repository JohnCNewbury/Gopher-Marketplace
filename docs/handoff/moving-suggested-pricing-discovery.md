# Moving — Suggested Pricing: DISCOVERY (complete)

**Status:** discovery complete. **No code written.** Ready to become a build spec for Website Updates.
**Owner ask (2026-08-09):** extend Gopher iQ suggested pricing to **Moving**, Junk-style scope tiers,
two routes — single location vs between two locations. Goal: help requesters who don't know the rate.
**Owner scoping:** scope to the **new flow**; **one Moving category**, no sub-categories; **iQ reads
the customer's description and the price offered**, not a sub-category field.
**Sibling doc (pattern being mirrored):** `docs/handoff/junk-suggested-pricing.md`.

**Decisions locked (owner, 2026-08-09):**

| | Decision |
|---|---|
| **D1** | **Three tiers**, named in **item / truck** language (not home size). *Amended by D7: the two upper tiers use bedroom language.* |
| **D2** | **One shared ladder** across both routes; the routes differ in *questions asked*, not in anchors. |
| **D3** | iQ may use the **structured fields already collected** — stairs, service elevator, item count — as **modifiers**; the **description drives the base tier**. *Narrowed by D8: stairs is collected but NOT priced.* |
| **D4** | Trip distance on the two-location route: **show as context, never price on it.** ⚠️ Rests on F4, which was measured on under-priced accepted-price data — flagged as suspect, not yet re-ruled. |
| **D5** | **Anchors are owner-set.** |
| **D6** | ~~The `few` anchor holds at $60~~ — **SUPERSEDED by D7.** |
| **D7** | ~~Option B: market-benchmarked anchors $100/$250/$325/$475~~ — **SUPERSEDED by D8.** Priced worker pay against *agency retail*; Gopher is gig and takes only ~8%. |
| **D9** | **Forward learning is FROZEN for Moving** (owner 2026-08-09): `w = 0`, and `seedMovingLearningOnce()` does not run. Measured: seeding would pull `few` from **$75 → $100 (+33%)** — undoing the exact correction D8 was made for. Re-enable only against **post-D8** completions. |
| **D10** | **The learned blend uses the MEDIAN, not the mean** (owner 2026-08-09), for Moving **and live Junk**. Moving `few`: mean $104 vs median $88 on right-skewed pay (60% round numbers, tail to $390). The seed workbook §12 and the Junk doc both already say prefer median. ⚠️ Requires a **store-shape change** — a median cannot be derived from `{sum, n}`. |
| **D8** | **(2026-08-09):** anchors = **crew × hours × $30/labor-hour**, cross-checked against Gopher history — `few $75` · `truck $110` · `home_small $225` · `home_large $375`. **Flat tiers** this release; the hours engine is the destination. **Stairs modifier removed** — it scales with trips, not as a flat %. |

> # ✅ D8 — LABOR-MODEL ANCHORS (2026-08-09, owner-ruled). THIS IS THE CURRENT LADDER.
>
> **D7's market-benchmarked anchors are withdrawn.** They priced Gopher's *worker pay* against
> *agency retail* (HireAHelper, U-Haul Moving Help, 1-800-GOT-JUNK). Those prices carry dispatch,
> insurance, trucks, overhead and margin. **Gopher is gig: Gopher Inc takes ~8% for the connection
> and the rest is the worker's.** Pricing the offer at agency retail makes Gopher dearer than the
> thing it replaces — the opposite of the value proposition.
>
> **The trigger:** a real request — *"single couch moved to the 3rd floor"*, one flight — priced at
> **$115**. Owner: *"that customer would NOT go with our suggestion, and might not use Gopher after
> that screen."* Three methods put it near **$75**.
>
> **Model: `crew × hours × $30 per labor-hour`** (owner-set midpoint of a $20–$50 gig labor range),
> cross-checked against Gopher's own completed history.
>
> | Tier | Labor assumption | Model @ $30 | Gopher history | **Anchor** | Band |
> |---|---|---|---|---|---|
> | A few items | 2 × 1.0 hr | $60 | n=26, med $88 | **$75** | $55–$95 |
> | A truck-load | 2 × 2.0 hr, one location | $120 | n=52, med $100 | **$110** | $80–$140 |
> | 1–2 bedroom home | load 2h + drive .5h + unload 2h | $270 | n=3, med $200 | **$225** | $170–$280 |
> | 3+ bedroom home | 3 crew × 5 hr | $450 | n=1 | **$375** | $280–$470 |
>
> The two well-powered tiers (`few` n=26, `truck` n=52) have the labor model and the order history
> agreeing closely. The upper two lean on the model — the history is n=3 and n=1.
>
> **Owner ruled FLAT tiers for now** — ship these four values. The full `crew × hours` engine (hours
> derived from item count, home size, truck, stairs × trips, one vs two locations) is the intended
> destination, not this release.
>
> ### ⚠️ The stairs modifier is REMOVED, not retuned
>
> It does not survive its own definition. Measured on the clean corpus:
> `truck` — the best-powered cell — shows **+0%** (n=15 vs 37). `few` shows **+43%** under one
> reasonable tier regex and **−22%** under another (single-item with stairs med $78 vs $100 without).
> The upper tiers are n=1–2.
>
> The reason is structural: **stairs cost scales with the number of trips**, so one couch up one
> flight is one trip and barely moves the price, while a 3-bedroom house is dozens. U-Haul's
> "+1 hr per flight" is a whole-home figure. A flat percentage is wrong at both ends — it was
> inflating exactly the small job that produced the $115 complaint.
>
> **Keep collecting stairs; do not price on it** until the hours model can scale it by trips.


---

## 0. The failure mode this dataset invites — read this first

Every wrong number in this workstream came from the same mistake, four times in one day:
**a figure that measures something adjacent to what you think it measures.** Not arithmetic errors —
each one was internally consistent, monotonic, and passed its tests.

| # | The number used | What it actually measures | Consequence |
|---|---|---|---|
| 1 | *accepted* prices | what cleared, on a marketplace where **only 47–50% of Moving requests ever match** — the too-cheap jobs are absent by construction | anchors far too **low** ($60/$100/$200) |
| 2 | agency retail (HireAHelper, U-Haul) | a price carrying dispatch, insurance, trucks, overhead and margin — **not** what a gig worker is paid, when Gopher takes ~8% | anchors far too **high** ($100/$250/$325/$475); a single couch priced at $115 |
| 3 | same-ZIP vs **all** different-ZIP | lumps a next-suburb move in with a cross-metro one, so a real effect cancels out | **F4/D4** concluded distance doesn't matter; splitting at the metro boundary shows **+25%** |
| 4 | the **mean** of accepted pay | a right-skewed distribution's mean (60% round numbers, tail to $390) — `few` mean $104 vs median $88 | the learning blend inflates; fixed by **D10** |

A fifth of the same shape, caught before it shipped: a **flat percentage** stairs modifier measures
"jobs with stairs cost more" when the real quantity is **cost per trip up the stairs** — which is why
it was too big for one couch and too small for a house, and why the signal flipped sign depending on
the tier regex.

**What actually caught each one, in order:** re-deriving a figure instead of inheriting it; the owner
looking at a single rendered screen; splitting a comparison at a boundary that matters; and measuring
a feedback loop rather than predicting it. **Two confident predictions about that loop — one in this
doc's own earlier drafts, one from the implementing session — were both backwards.**

**The working rule:** before any number here becomes an anchor, say out loud what it measures and what
it excludes. If those two sentences don't match the decision being made, it is the wrong number, no
matter how clean it looks.

---

## 1. The new flow already captures both routes

`gopher-request.html` → `FIELD_HIDDEN_FOR`. Moving is one of eight flat categories
(`UI_TO_SLUG.moving = 'moving'`), and the route is a toggle the requester already sets — literally
labelled **"Single-location move"**, help text *"Your worker helps at ONE address only — loading,
unloading, or rearranging items on site. This is not a two-location move."*

| Route | `state.noSpecificPickup` |
|---|---|
| **A — single location** | `true` |
| **B — two locations** | `false` |

Already serialised. Nothing to infer, nothing to build.

**Moving-only structured fields the flow already collects:** `pickupStairs` / `destStairs`,
`serviceElevatorPickup` / `serviceElevatorDest`, item count + "Multiple items" (`itemInfo`), and
`describe` — iQ's primary input.

**The integration point is one line.** Moving is currently excluded from the pay-suggestion matrix:

```
aiPaySuggest: ['moving','home','labor','yard','other'],   // Delivery + Ride + Junk only
```

Remove `'moving'`, add the tier model behind it. That is the whole surface change.

---

## 2. Findings

**F1 · Descriptions carry real scope signal — 79%.** On the **clean corpus (N=155, §4b)**, **122 (79%)**
contain at least one scope-bearing phrase; 21% contain none.

| Signal | Coverage | | Signal | Coverage |
|---|---|---|---|---|
| named items | **50%** | | duration | 10% |
| vehicle needed | **43%** | | crew size | 8% |
| item count | 13% | | home size | **1%** |

> **Two different "no signal" numbers, both correct — don't conflate them.** A *broad* scan finds some
> scope phrase in 79% (21% none). The **tier detector itself** — which needs a phrase it can map to a
> tier — fails to tier **23% (36/155)**. The detector's 23% is the operationally relevant one and is
> what the shipped code cites. *(Superseded: the first pass reported 72% / 28% on the contaminated
> 215-row corpus.)*

**This is what validates the description-first approach.** Junk's doc records the opposite — 467/715
orders had *no* parseable volume phrase, forcing pure owner-anchors. Moving descriptions are rich:
*"move headboard mattress and two nightstands into upstairs bedroom. bedroom is on 2nd floor. will
need 4 people"* · *"move couch and staging from uhaul to home. maybe 2 hours."*

**F2 · The ladder is items-and-truck, not home size** — home size appears in 2% of descriptions,
named items in 47%, a vehicle in 38%. "Will need a truck" is the sharpest discriminator: it separates
*two people carry it* from *a vehicle is required*.

**F3 · Moving requesters demonstrably don't know the rate.** Counter-offer rate **20%** on both legacy
routes (57/283, 25/128) vs **9.6%** platform-wide — roughly double. The justification number.

**F4 · Distance does not drive Moving pay.** Two-location moves with both ZIPs (n=56, full coverage):
same-ZIP median **$115**, different-ZIP **$100**. Flat-to-inverted → D4.

**F5 · Not priced hourly** — 7% mention hours; 6% mention crew. Flat per-job matches behaviour.

**F6 · Historical pay is anchored, not measured** — 60% of accepted offers are multiples of $25, 48%
of $50, **15% exactly $100**. A usable envelope; not a market rate.

**F7 · Route does not separate price — scope does.** Legacy `Location Move` and `Same Location Move`
both sit at a **$100 median**. A single-location job can be a whole-house reshuffle; a two-location
job can be one nightstand. This is why D2 (one shared ladder) is right.

**F8 · Small corpus** — 215 priced jobs. Junk had 715. Anchors carry the model for months.

---

## 3. The intent library, mapped

⚠️ **The library is a templated expansion, not 1,120 independent use cases.** 1,120 phrases reduce to
**121 distinct objects** and roughly **41 real concepts** — the same carrier sentences ("Need someone
to X", "Can someone X", "X near me") wrapped around one object each, plus `help` / `service` suffix
variants. Excellent as *detector vocabulary*; it teaches nothing about price.

**Route mapping** (the library leans into the split without ever naming it):

| Route | Subcategories | Objects |
|---|---|---|
| **A — single location** | `loading`, `unloading`, `packing` (+ `rearrange furniture`) | load/unload U-Haul · moving truck · pod · trailer · packing assistance · unpack boxes · wrap furniture · rearrange furniture |
| **B — two locations** | `apartment_move`, `house_move`, `dorm`, `office`, `storage`, most `furniture` | move my apartment · house to house · residential relocation · dorm/college/student move · office move · move cubicles · to/from storage · move a couch/piano/appliances |
| **Ambiguous** | `general` | "move", "need movers", "small move", "local move" — no route cue; fall back to the toggle |

Route A is **~32%** of the library by phrase count (360/1,120), which is a reasonable prior for how
often the single-location toggle should be expected.

**Tier mapping** (D1 vocabulary):

| Tier | Name | Library objects that map here |
|---|---|---|
| **T1** | *A few items — no truck needed* | move a couch · rearrange furniture · packing assistance · unpack boxes · wrap furniture · small move |
| **T2** | *A truck-load* | load/unload U-Haul · moving truck · trailer · pod · storage unit move · dorm / college / student move · move a piano · move appliances · move bedroom furniture · labor only with my truck |
| **T3** | *A full home* | move my house · whole house move · house to house · residential relocation · move my apartment · apartment to apartment · move into/out of apartment · office move · relocate office · move cubicles · moving across town |

---

## 4. The ladder is monotonic on real pay — the test Junk failed

Applying the T3 > T2 > T1 priority detector to the 215 completed orders:

| Tier | n | Median | Mean | q25 – q75 |
|---|---|---|---|---|
| **T1** a few items / no truck | 74 | **$72** | $99 | $50 – $150 |
| **T2** truck-load | 65 | **$100** | $115 | $60 – $150 |
| **T3** full home | 6 | **$228** | $236 | $100 – $260 |
| *no signal (default)* | 70 | $75 | $87 | $30 – $125 |

**Monotonic: $72 < $100 < $228.** Junk's first pass priced "full load" *below* "single item" and had
to abandon text back-fit entirely. Moving passes cleanly — the items/truck ladder is real signal, not
an artefact.

**Honest caveats:** T3 is **n=6**, so $228 is directional only. T1 and T2 overlap heavily in the
quartiles even though the medians separate. Treat this as *corroboration* of the anchor ordering,
**not** as the price source (F6).

---

## 4b. ⚠️ Corpus correction (2026-08-09, after §4 was written)

Building the calibration workbook surfaced a contamination in the corpus used for §4 and §5. The
selector was `TITLE startswith "moving"`, which silently swept in **38 legacy
`Moving / Junk Removal - Junk Removal` rows (median $40)** — those are Junk jobs and belong to the
Junk model — plus **22 `Store Pick Up & Delivery`** rows that §7-Q6 had already recommended excluding.

**Clean corpus = 155** completed Moving orders (was 215). Revised figures:

| | As first published (N=215) | **Clean (N=155)** |
|---|---|---|
| p25 | $50 | **$60** |
| median | $90 | **$100** |
| p90 | $200 | **$200** |
| tier medians (few / truck / home) | $72 / $100 / $228 | **$80 / $100 / $200** |
| no-signal descriptions | $75 (n=70) | **$100 (n=36)** |

**What this changes:**

- **The anchors survive.** T2 ($100) and T3 ($200) are now hit *exactly* by the clean data. T1's
  detected median rises $72 → $80, so the $60 anchor now sits below it rather than between the
  quantile and the median — **worth an owner look, see §7-Q7.**
- **Monotonicity holds** and is cleaner: **$80 < $100 < $200**.
- **The no-signal default question is resolved in favour of `truck`.** The $75 figure that argued for
  defaulting to `few` was an artefact of the cheap junk-side rows; on the clean corpus no-signal
  descriptions sit at **$100**, exactly the median tier. The build spec's choice was right for a
  reason it did not yet have.
- **F7 is reinforced, hard:** Route A median **$100** (n=52) vs Route B median **$100** (n=55).
  Identical. One shared ladder is correct.

Percentages elsewhere in §2 and §6 (signal coverage, stairs lift) were computed on the wider 215-row
set and are **directional, not restated** — they concern which words appear, not what things cost.

**Q7 · Should the `few` anchor move up from $60? — ✅ RULED: HOLD $60 (owner, 2026-08-09).**
Clean p25 is $60 and the detected-tier median is $80, so the question was real. Held at **$60**
because the T1 band already reaches $75, and under-anchoring the cheapest tier is the safer error
while forward learning is thin. **D6.** Settled — do not re-raise; if forward learning moves it, that
is the learning loop doing its job, not a reason to re-open the anchor.

## 5. Pay envelope and proposed anchors

Whole-corpus envelope, completed Moving orders, keyed on `GOPHER OFFER` (worker pay — never
`GOPHER EARNINGS`), **N = 215**:

```
p10 $25 · p20 $50 · p30 $50 · p40 $70 · p50 $90 · p60 $100 · p70 $125 · p80 $150 · p90 $200 · max $500
```

Junk set its tiers at q(.30) / q(.55) / q(.82). Applied here that gives **$50 / $100 / $150**. Blended
against the observed tier medians ($72 / $100 / $228):

| Tier | Quantile method | Observed median | **Proposed anchor** |
|---|---|---|---|
| T1 — a few items, no truck | $50 | $72 | **$60** |
| T2 — a truck-load | $100 | $100 | **$100** |
| T3 — a full home | $150 | $228 (n=6) | **$200** |

Both methods **agree exactly at T2 ($100)**, which is the strongest cell (n=65) and a good sign. T1 is
set between the two; T3 follows the p90 rather than the thin n=6 median. Monotonic by construction,
round numbers, ±25% derived low/generous as Junk does. **These are proposals — D5 says the final
numbers are yours.**

---

## 6. Modifiers (D3) — sized against real pay, not invented

| Modifier | Evidence | Recommendation |
|---|---|---|
| **Stairs** | T1 **+11%** (n=24), T2 **+36%** (n=16), overall **+25%** (n=57 vs 158) | **+15%** when stairs at either end; direction is consistent and grows with tier |
| **Stairs both ends** | not separable in text data | **+25%**, by extension — flag for forward learning |
| **Service elevator** | **n=2.** Unusable. | **Collect, don't price.** Revisit once the field has real volume |
| **Item count** | 12% of descriptions | Use to *promote* T1 → T2 above a threshold, not as a % |

⚠️ **Crew size is a double-count risk — do not add it as a modifier.** Descriptions mentioning ≥2
people show a **+88% lift** (n=13), the largest effect measured. But the flow already collects
**`workersNeeded` as crew size, and that field already drives pricing and totals** (it is *not* the
hire count — Request hires one lead worker who is responsible for the crew). If iQ also applies a
crew multiplier, the same labour gets paid for twice in the suggestion. **Confirm where
`workersNeeded` enters the total before touching this**, and let the flow own it.

---

## 7. Cold start and defaults

- ✅ **RESOLVED — default to the median tier (`truck`). No owner call needed.** The detector fails to
  tier **23% of descriptions (36/155)** on the clean corpus, and their observed median is **$100** —
  *exactly* the median tier. Falling back to `truck` is therefore **empirically correct**, not merely
  consistent-with-Junk, and the requester still re-picks in one tap (that correction is what teaches
  the model).
  ⚠️ *Superseded, do not re-derive from it:* the first pass reported "28% / median $75, nearer T1" and
  called it an open owner question. The $75 was an artefact of the 38 legacy Junk rows swept into the
  corpus (§4b). Both the build spec §5 and the shipped code now say RESOLVED.
- Fallback ladder: unknown tier → route median → category median. **A pricing hint must never fail
  loud.**
- Forward learning: reuse Junk's `recordX / ingest / suggest` seam and its `w = n/(n+8)` blend, so the
  production backend swap is identical and already documented.

---

## 8. What must be true for this not to break at scale

- The chosen tier must land on the order as a **structured field**, or every future recalibration is
  back to parsing prose.
- Anchors must stay **monotonic** — a bigger tier must never suggest less.
- **The offered price must not feed the tier estimate.** If the offer informs the scope read and the
  scope read then judges the offer, the advice is self-confirming — a low offer implies a small job
  implies the low offer was right. Use the offer as the thing being judged: *"your $60 is below the
  $90–$140 range for a job like this."* (Same failure class as the self-feeding baseline in G40-336.)
- Don't let `workersNeeded` be counted twice (§6).

---

## 9. Ready for build spec — what Website Updates would need

1. `MOVING_TIERS` table (3 rows: key, label, hint, anchor) — same shape as `JUNK_TIERS`.
2. `detectMovingTier(text)` — T3 > T2 > T1 priority regex, word lists from §3.
3. `suggestedMovingOffer(tier, {stairs, route})` — anchor blend + stairs modifier, ±25% band.
4. Remove `'moving'` from `aiPaySuggest`; render the `.os-tier` buttons from `MOVING_TIERS`.
5. Route-specific question set (Route B may show trip context — D4, context only).
6. Record/ingest wiring for forward learning, mirroring the Junk functions.

## 10. Out of scope

No code. No `gopher-request-logic.js` or flow changes. Fee logic, matching, and payout untouched and
developer-only. Nothing here changes what any live surface does today.
