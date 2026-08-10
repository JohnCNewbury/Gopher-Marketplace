# Moving — Suggested Pricing: DISCOVERY (complete)

**Status:** discovery complete. **No code written.** Ready to become a build spec for Website Updates.
**Owner ask (2026-07-28):** extend Gopher iQ suggested pricing to **Moving**, Junk-style scope tiers,
two routes — single location vs between two locations. Goal: help requesters who don't know the rate.
**Owner scoping:** scope to the **new flow**; **one Moving category**, no sub-categories; **iQ reads
the customer's description and the price offered**, not a sub-category field.
**Sibling doc (pattern being mirrored):** `docs/handoff/junk-suggested-pricing.md`.

**Decisions locked (owner, 2026-07-28):**

| | Decision |
|---|---|
| **D1** | **Three tiers**, named in **item / truck** language (not home size). |
| **D2** | **One shared ladder** across both routes; the routes differ in *questions asked*, not in anchors. |
| **D3** | iQ may use the **structured fields already collected** — stairs, service elevator, item count — as **modifiers**; the **description drives the base tier**. |
| **D4** | Trip distance on the two-location route: **show as context, never price on it.** |
| **D5** | **Anchors are owner-set**, informed by the envelope in §5. |
| **D6** | The `few` anchor **holds at $60** after the corpus correction (§4b · Q7). Settled. |

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

**F1 · Descriptions carry real scope signal — 72%.** Of 215 completed Moving orders, **155 (72%)**
contain at least one scope-bearing phrase; 28% contain none.

| Signal | Coverage | | Signal | Coverage |
|---|---|---|---|---|
| named items | **47%** | | duration | 7% |
| vehicle needed | **38%** | | crew size | 6% |
| item count | 12% | | home size | **2%** |

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

## 4b. ⚠️ Corpus correction (2026-07-28, after §4 was written)

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

**Q7 · Should the `few` anchor move up from $60? — ✅ RULED: HOLD $60 (owner, 2026-07-28).**
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

- **28% of descriptions carry no scope signal** (70 orders). Their observed median is **$75** — nearer
  T1 ($72) than T2 ($100).
- Junk defaults to the **median tier** and lets the requester re-pick with one tap. Recommendation:
  **do the same (default T2)** for consistency and because under-suggesting is the failure mode F3
  identifies — but note the empirical median argues for T1. It is a one-tap correction either way, and
  the correction is what teaches the model. **Worth an explicit owner call.**
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
