# Moving — Suggested Pricing: DISCOVERY

**Status:** discovery only. **No code written, nothing built, no decisions locked.**
**Owner ask (2026-07-28):** extend Gopher iQ suggested pricing to **Moving**, using the Junk Removal
scope-tier pattern, with **two routes** — a move at a *single location* and a move *between two
locations*. Goal: help requesters who don't know the going rate.
**Build handoff:** Website Updates session, once the open questions in §7 are answered.
**Sibling doc (the pattern being mirrored):** `docs/handoff/junk-suggested-pricing.md`.

---

## 1. What already exists (so we build on it, not beside it)

| Piece | Where | Reusable for Moving? |
|---|---|---|
| Scope-tier model — 3 tiers, keyword detector, `$` anchor per tier | `assets/js/gopher-request-logic.js` → `JUNK_TIERS`, `detectJunkVolumeTier`, `suggestedJunkOffer` | **Yes — directly.** Same shape. |
| Tier selector UI (buttons that re-range the offer slider) | `gopher-request.html` `#osJunkTiers` / `.os-tier` | **Yes.** Renders from the tier table, so a Moving table drops in. |
| Forward-learning store + shrinkage blend (`w = n/(n+8)`) | `recordJunkOffer` / `ingestJunkCompletions` | **Yes.** Backend seam already documented. |
| Trip-distance pill (miles + minutes, Distance Matrix) | `gopher-request.html` `#osTripContext`, ride-only | **Partly — see §4, F5.** |
| Moving pricing of any kind | — | **None exists today.** Greenfield. |

Moving would be the **first category needing both** the Junk-style tier selector *and* the
ride-style trip context in the same sheet. Both primitives already exist; nothing new is invented.

---

## 2. The corpus we actually have

**Intent phrases — 1,120**, in `Dashboard/Gopher iQ/Category Info For AI/moving_production_intent_library.csv`,
already carrying a `subcategory` label (all at confidence 0.97):

| subcategory | phrases | | subcategory | phrases |
|---|---|---|---|---|
| furniture | 150 | | office | 120 |
| apartment_move | 120 | | dorm | 120 |
| house_move | 120 | | packing | 120 |
| storage | 120 | | loading | 120 |
| unloading | 120 | | general | 10 |

These are **phrasings, not priced jobs** — useful for the *detector*, useless for the *dollar anchor*.

**Real orders — 572 Moving-prefixed, 214 completed with a worker offer** (`Orders.csv`, keyed on
`GOPHER OFFER` = worker pay, never `GOPHER EARNINGS`). For scale: Junk calibrated on **715**. Moving
has **less than a third** of that, which pushes weight onto forward learning (§4, F7).

---

## 3. The finding that reframes the ask: **the two routes already exist in production**

`TITLE` on a modern Moving order is structured `Moving - <subtype>`. The subtypes *are* the routes:

| Production subtype | All | Completed | Median | q25 – q75 | Both addresses present |
|---|---|---|---|---|---|
| `Moving - Location Move` | 283 | 46 | **$100** | $75 – $180 | 55% |
| `Moving - Same Location Move` | 128 | 39 | **$100** | $60 – $150 | **0%** |
| `Moving - Store Pick Up & Delivery` | 67 | 18 | $82 | $55 – $200 | **100%** |
| `Moving - Other` | 34 | 12 | $80 | $50 – $100 | — |

The address coverage is the proof, and it is clean: **Same Location Move never has two addresses;
Store Pick Up & Delivery always does.** The taxonomy already encodes exactly the split being asked
for — we are surfacing an existing field, not inventing a classification.

Two wrinkles:

- **There is a third route in the data.** `Store Pick Up & Delivery` is a retail-pickup→home move
  (100% two-address, the widest pay spread of any subtype, max $500). It is neither of the owner's
  two routes. **Open question §7-Q2.**
- **A legacy combined category exists:** `Moving / Junk Removal - <same subtypes>`, 153 orders, using
  the identical subtype vocabulary — the two categories were once merged and later split. Its
  `Location Move` rows (median $125) look like Moving; its `Junk Removal` rows (median $40) look like
  Junk. **Open question §7-Q3.**

---

## 4. Seven findings that shape the model

**F1 · Route is data-derivable today; scope is not.** Route is a structured production field with
clean history. Scope (how big the job is) exists nowhere as a field — only in free text. So the two
axes need *different* treatments, and that asymmetry is the core design fact.

**F2 · The historical pay data is anchored, not measured.** Of 214 completed Moving offers, **60% are
multiples of $25**, 48% of $50, and **15% are exactly $100**. Requesters are picking round numbers.
The history records *guesses that happened to get accepted* — it is a reasonable envelope, but it is
not a market rate, and it should not be presented internally as one.

**F3 · Scope language barely separates pay — a text back-fit will fail.** Splitting completed orders
by description language: single-item **median $88** (n=24) vs whole-home/truck **median $100**
(n=16), with heavily overlapping quartiles ($60–150 vs $80–200). A $12 gap on samples that small is
noise. **This is the same wall Junk hit** — its doc records that 467/715 orders had no parseable
volume phrase and a back-fit priced "full load" *below* "single item." Do not repeat the attempt:
set anchors from the pay distribution, capture tier as a structured field, learn forward.

**F4 · Moving requesters demonstrably don't know the rate — this is the justification.** Counter-offer
rate is **20% on both routes** (57/283 and 25/128) against a **platform-wide 9.6%**. Moving requests
get countered at **roughly twice the platform rate**. That is the strongest available evidence that
the offer-setting problem is real and concentrated here, and it is the number to lead with.

**F5 · Distance does NOT drive Moving pay — do not copy the ride model.** Among completed
`Location Move` orders with both ZIPs (n=56, full coverage): **same-ZIP median $115**, different-ZIP
median **$100**. Distance is flat-to-inverted. Local moving is priced by effort and volume, not
mileage — unlike Ride Sharing, where distance *is* the price. Trip context may still be worth showing
as *context* on the two-location route, but it should not be a multiplier without new evidence.

**F6 · Moving is not priced hourly in practice.** Only **7%** of completed Moving orders mention
hours or an hourly rate (16/214); crew size appears in 19. Both cluster at a $100 median. A flat
per-job suggestion matches how the marketplace already behaves.

**F7 · Small corpus ⇒ forward learning carries more weight than it did for Junk.** 214 priced jobs
across 3–4 routes and (say) 3 scope tiers means some cells would start with **single-digit samples**.
The Junk blend (`w = n/(n+8)`, baseline holds until ~8 completions) is the right mechanism, but the
per-cell cold start is much longer here. Expect anchors to do the work for months.

---

## 5. The shape this suggests (for discussion — not a decision)

A **route × scope grid**, not two separate models:

- **Route** — from the existing structured subtype. Changes *what is asked and shown*, not the
  arithmetic: the two-location route additionally collects a second address and can show trip
  context; the single-location route asks about floors/stairs instead.
- **Scope tier** — a small ordered set, mirroring Junk's `single / half / full`, pre-selected by a
  keyword detector and correctable by the requester (the correction is what teaches the model).
- **Anchors** — owner-set per cell, informed by the pay envelope in §3, monotonic by construction.
- **Learning** — same `recordX/ingest/suggest` seam as Junk, so the backend swap is identical.

Scope-tier vocabulary is genuinely open. The intent library's 10 subcategories are *job types*
(packing, loading, dorm), not sizes — they'd need mapping onto a size ladder, and several
(`packing`, `loading`, `unloading`) are really **single-location** work regardless of size. That
mapping is the main piece of discovery still outstanding (§8).

---

## 6. What would need to be true for this not to break at scale

- The scope tier must be captured as a **structured field on the order**, or the learning loop has
  nothing clean to learn from and we are back to F3 forever.
- Anchors must be **monotonic within a route** — a bigger tier must never suggest less.
- The suggestion must degrade to the route-level median when a cell has no samples, and to the
  category median when the route is unknown. **Never fail loud** on a pricing hint.
- `Store Pick Up & Delivery` has a **$55–$200 interquartile spread** — the widest here. If it is
  folded into a route rather than kept separate, it will drag that route's anchor and make the
  suggestion worse for everyone in it.

---

## 7. Open questions — owner

**Q1 · How many scope tiers, and in what language?** Junk used 3 (`single item` / `half-truck` /
`full truck`). Moving's natural ladder might be *a few items → a room → a full home*, but "3 bedroom
house" and "studio apartment" are the phrases requesters actually use. Recommendation: **3 tiers**,
named in home-size language, since that is how people describe a move.

**Q2 · Is `Store Pick Up & Delivery` in scope?** It is a real, live third route (67 orders, always
two-address, widest spread). Options: treat as a third route, fold into the two-location route, or
leave out of the Moving model entirely. Recommendation: **keep it separate or leave it out** — folding
it in degrades the two-location anchor (§6).

**Q3 · What happens to the legacy `Moving / Junk Removal` orders (153)?** Include their Moving-side
subtypes in the calibration corpus, or exclude the whole legacy category? Recommendation: **include
the `Location Move` / `Same Location Move` rows, exclude its `Junk Removal` rows**, which belong to
the Junk model.

**Q4 · Do you want trip distance shown on the two-location route?** F5 says it should not change the
price. It may still be worth showing as context. Recommendation: **show it, don't price on it.**

**Q5 · Are the anchors yours to set, as with Junk?** The Junk values ($40/$60/$100) were owner-set
and informed by the distribution. Recommendation: **same here** — I bring the envelope, you set the
numbers.

---

## 8. Discovery still to do (once Q1–Q3 are answered)

1. **Map the 1,120 intent phrases onto the route × scope grid** — this is the real "hundreds of use
   cases" pass, and it produces the keyword detector's word lists. Cannot start before Q1 fixes the
   tier vocabulary.
2. **Build the pay envelope per candidate cell** (percentiles, as Junk did) so the anchors are set
   against real distribution rather than intuition.
3. **Hand-label a sample of the 214 completed orders** against the chosen tiers, to measure detector
   accuracy — *as a test set only*, never as the price source (F3).
4. **Decide the cold-start fallback ladder** and confirm cell-level sample counts are survivable (F7).

## 9. Explicitly out of scope for this document

No code, no `gopher-request-logic.js` changes, no flow changes. Fee logic, matching, and payout are
untouched and remain developer-only. Nothing here changes what any live surface does today.
