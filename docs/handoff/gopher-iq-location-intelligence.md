# Gopher iQ — Location Intelligence & the Data Brain

_Dated 2026-07-02. Lives in `docs/handoff/` alongside the other handoff docs.
This file is the durable source of truth for the Gopher iQ location-availability
feature and the shared coverage "data brain." Any session can pick the work up by
reading this._

## Purpose

When a customer asks Gopher iQ (the search pill) a location question —
_"Do you have service in Raleigh?"_, _"are you in 27540?"_, _"when are you coming
to Charlotte?"_ — iQ instantly answers with **how many local Gophers cover that
area** and drives them to submit a request (or, where coverage is thin, to help
recruit one). This is meant to save Customer Support hundreds of hours of
"where's my order / do you have anyone near me" tickets by answering the coverage
question up front, honestly, and **never with a hard "no."**

The number is real, computed from the actual Users + Orders exports — not a guess.

---

## Two layers — keep the boundary explicit

| | Prototype layer (built now) | Production layer (paid dev) |
|---|---|---|
| Where coverage numbers come from | Static tables in `gopher-iq-data.js`, regenerated offline from the CSV exports | A live query to the production DB (or a small coverage API) |
| Radius math | Precomputed per city/ZIP around a **centroid** | Computed from each request's **exact** coordinates |
| Recent-activity (tier 4) | `activeLast3mo` baked from the Orders export | Live "completed in last 90 days" query |
| The seam that stays identical | `GopherIQData.lookup(place)` | Same shape — swap the tables for a fetch; nothing downstream changes |

**Do not** wire the pill to a real DB in this prototype. Keep `lookup()`'s return
shape stable and replace its data source in the rebuild.

---

## Files

- **`Final/gopher-ai-engine.js` / `.css`** — the iQ engine (intent detection, tier
  logic, card rendering). Source of truth. **Each pill page inlines its own copy**
  of this engine (there is no shared `<script src>` for it), so any engine change
  must be propagated to every copy (see "Propagation" below).
- **`Final/gopher-iq-data.js`** — the **data brain**. `window.GopherIQData` with the
  coverage tables + `lookup()`. Loaded once per pill page via a relative
  `<script src="gopher-iq-data.js">` **before** the engine. The standalone sandbox
  inlines a copy instead.
- **Pill pages** (have the `.ai-bar` and load the data brain): `index.html`,
  `gopher-request.html`, `gopher-services.html`, `gopher-faqs.html`. Plus the
  copy-paste fragments `1-engine-css-block.html`, `2-engine-js-block.html`, and the
  self-contained `gopher-iq-sandbox-standalone.html` (the test harness — open it in
  any browser, no server needed).
- **`Final/age-restricted.html`** — has `id="find-my-gopher"` on the "Not many
  Gophers near you yet" section; the low-coverage tier's **Find MY Gopher** button
  deep-links there (`age-restricted.html#find-my-gopher`).

> Note: `Documentation/Dashboard/output/gopher-iq-engine.html` is a **separate,
> older copy** of the engine and did **not** receive these updates. Sync it to the
> data brain if that dashboard ever surfaces a pill.

---

## Intent families

`classifyLocationIntent()` routes a location-bearing query into one of five families
(each answered with tailored copy + CTA; all lead with "available anywhere in the US"
and never say a hard "no"):

| Family | Example | CTA |
|---|---|---|
| `availability` | "Do you have service in Raleigh?" | Submit a request (+ tiered — see below) |
| `service` | "Need junk removal in Durham" | Submit a request (category pre-selected) |
| `expansion` | "When are you coming to Charlotte?" | Submit a request ("already nationwide") |
| `business` | "Can my business use Gopher in Dallas?" | Explore Gopher Connect (`gopher-connect.html`) |
| `worker` | "Can I become a Gopher in Raleigh?" | Become a Gopher (`gopher-go.html`) |

Detection notes: runs on the **raw** query (the typo-corrector rewrites a standalone
"to" → "do", which would break "&lt;verb&gt; to &lt;place&gt;"); tolerates "City, ST";
rejects pronoun-led false places ("to you deliver"); GPS/"near me" answers without a
fabricated number.

---

## The four availability tiers

Driven by the real worker count for the searched area (`coverageTier()`):

| Tier | Condition | Copy gist | Buttons |
|---|---|---|---|
| **1** | `< 20` workers | "…word is just getting out…" (warm accent) | Submit a request · **Find MY Gopher** |
| **2** | `20–49` workers | "…workers move around…" | Submit a request · See how it works |
| **3** | `50+` workers | "…workers move around…" | Submit a request · See how it works |
| **4** | `50+` **and** `10+` recently-active gophers | "We're ready to connect you when you are!" (green) | Submit a request · See how it works |

Tier 4's recent-activity gate reads `GopherIQData.hasOrders`; it is currently **true**
(Orders export is joined). Boundary note: exactly **20** falls in tier 2.

---

## Collision clarification

When a bare city name spans multiple states with **comparable** coverage (2nd state
≥ 25% of the top's worker count), iQ answers with a **"WHICH ONE?"** card and chips
(e.g. Denver → `Denver, CO` · `Denver, NC` · `Denver, PA`). Tapping a chip re-runs the
search scoped to that state. Dominant cities (Raleigh → NC) answer directly without
asking. The chip re-search is deferred a tick so the click finishes before re-render
(otherwise the outside-click handler closes the box).

---

## The data brain — definitions & sources

`gopher-iq-data.js` exposes:

- `cityState`: `"city|state" -> [workers, activeLast3mo]`
- `zip`: `"zip" -> [workers, activeLast3mo]`
- `lookup(place)`: resolves "Raleigh" / "Raleigh, NC" / "27540" / "the Triangle",
  returns `{city, state, workers, activeLast3mo, inData}` **or**
  `{ambiguous:true, city, options:[{state, workers}…]}`.
- `asOf`, `radiusMiles` (**10**), `hasOrders` (**true**).

**Definitions:**
- **worker** = a user whose `role` includes "Gopher", whose **Gopher Stripe Verified
  = Yes**, whose `status = active`, **and who is engaged** — i.e. **signed up in the
  last 6 months OR has completed ≥ 1 request all-time**. The engagement gate keeps the
  count from being inflated by registrations that verified/activated but never actually
  worked the platform (it cut the nationwide base from ~9,957 → ~2,139). "Completed a
  request" is sourced from the Orders export (a Gopher ID with ≥ 1 `AASM = delivered`
  order, ever); signup date is `created_at`.
  - _Note: this is a **union**, not an AND. A strict "signed up ≤6mo AND completed ≥1"
    collapses to ~61 nationwide (a fresh signup hasn't worked; a proven worker signed up
    long ago) and makes almost everywhere tier-1 — not what's wanted._
- **activeLast3mo** = distinct Gophers who **completed** (`AASM = delivered`) a request
  in the **last ~3 months**, located by **dropoff ZIP**. (From the Orders export.)
- Both are a **10-mile radius** around the queried place — what actually predicts
  whether a request gets accepted — not just the exact-city count.
- **State comes from the ZIP via GeoNames**, not the report's `address_state` field,
  which is free-text and unreliable (it had `mi`/`tn` for Raleigh, and `nc` /
  `north carolina` / `n c` as three different values).

**Sources (all in `Documentation/Dashboard/data/incoming/`):**
- `Users_02_07_2026.csv` — worker counts + city/ZIP centroid inputs.
- `Orders_02_07_2026.csv` — recent completions for `activeLast3mo`.
- **GeoNames** US postal codes (`https://download.geonames.org/export/zip/US.zip`,
  **CC BY 4.0**, attributed in the file header) — ZIP → lat/long for the radius math.

---

## Regenerating the data brain (and changing the radius)

The data brain is produced by an **offline Python script** (not committed; it's a
build step, run when the exports refresh). Recipe:

1. Load GeoNames `US.txt` → `zip -> (lat, lng, state, city)`.
2. From `Orders_*.csv`: build `delivered_ever = set(gopher_id where AASM=delivered)`,
   and for rows completed since (today − 3 months) collect `dropoff ZIP -> set(gopher_id)`.
3. From `Users_*.csv`: a worker counts if it's `role∋Gopher & Stripe-verified & active`
   **and engaged** (`created_at ≥ today−6mo` **OR** `id ∈ delivered_ever`); tally per ZIP.
   Derive each city's centroid as the (user-weighted) mean of its ZIP centroids, keyed by
   **GeoNames** city+state.
4. For every city and ZIP, sum engaged workers and union distinct recent active-gophers
   within **`RADIUS_MILES`** (haversine, grid-indexed at 0.25°).
5. Emit `gopher-iq-data.js` with `RADIUS_MILES`, `hasOrders = true`, and the tables.
6. **Propagate** (below) and re-inline the sandbox.

> Source location: the exports arrive in `Documentation/Dashboard/data/incoming/`, then
> a dashboard pipeline moves them to `incoming/_processed/` with a
> `YYYYMMDD_HHMMSS__` prefix (e.g. `20260702_101134__Users_02_07_2026.csv`). Point the
> generator at whichever copy is current.

**To change the radius:** edit the single `RAD` constant in the generator (and
`RADIUS_MILES` in the emitted header) and regenerate. It was 15 mi initially, now
**10 mi**. Smaller radius → fewer places covered and lower counts (e.g. Clayton went
tier-4 → tier-3 at 10 mi because its tighter ring has < 10 recently-active gophers).

**When the Orders export lacks recent completions** (early data), set
`HAS_ORDERS = false` in the generator; tier 4 then stays disabled and 50+ areas answer
as tier 3 until real recent-completion data exists.

---

## Propagation (engine + data → every copy)

Because each pill page inlines the engine, an engine or data change must reach all
copies. This was done with an **idempotent Python script** that:
- replaces the location-intelligence module region in each inlined engine copy,
- inserts the data `<script>` tag on hosted pages (external file) and **re-inlines**
  the sandbox (its data is embedded),
- keeps CSS in sync.

Two propagation gotchas that bit us (avoid on the next pass):
- **Idempotency markers must not collide with inserted code.** Checking for a string
  like `"tier-ready"` skipped a CSS insert because that string also appears in the JS.
  Use precise markers (`.svc-card.avail.tier-ready` for CSS, `window.iqPickState=function`
  for the nav func, `<script src="gopher-iq-data.js"` for the tag).
- **`</script>` inside inlined data closes the tag early.** The data file's header
  comment must contain no literal `<script>`/`</script>` (it doesn't now), or the
  standalone sandbox breaks.

---

## Production TODOs

- Replace the static tables with a **live coverage query** behind the same
  `GopherIQData.lookup()` shape.
- Compute the radius from the **request's exact coordinates**, not the city centroid.
- Keep `activeLast3mo` a **live rolling-90-day** count (not a snapshot).
- Tier thresholds (`< 20 / 20–49 / 50+ / +10 active`), the **10-mile** radius, and the
  **25%** ambiguity share are the tuning knobs — expose them as config.
- Sync (or retire) the separate engine copy in `Dashboard/output/gopher-iq-engine.html`.
