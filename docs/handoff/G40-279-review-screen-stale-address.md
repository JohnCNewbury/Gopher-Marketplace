# G40-279 — Review Request screen shows the previous address after it's changed (reorder-from-history) — DEV HANDOFF

**Type:** Bug (`request`) · **Priority:** Medium · Gopher (Request) app. Verified against the 2026-06-12 `gopher-mobile-request` export.
**Severity note (from the ticket):** *display-only* — "the request does actually use the correct address, however it confuses the user." Confirmed in code: submission rebuilds the address from the live field, so the **submitted** order is correct; only the **review display** is stale.

## Repro path
Request History → tap a past order to **reorder** (`src/component/requestorhistory.js` `handleClick`, ~L46-220) → the form is seeded with the past order (`navigate("/form", { state: { data: {...result_data, path:"history"} } })`) → user **changes the address** → on the **Review** screen the address still shows the *previous* (historical) value, even though submitting uses the new one.

## Root cause — fragmented address fields + two input components + reorder seeding
There is no single source of truth for "the address." The review screen, the two address inputs, and the reorder seed all touch **different** fields:

**Review display** — `src/pages/summary.js` (the `KeyValueDisplay` blocks, ~L734-810):
- Single-address categories: `Value = values.address[0]?.line1  ||  values.address?.line1  ||  values.address_attributes?.street_line1` (L743-748) — reads `values.address`, *falls back* to `values.address_attributes`.
- Pickup/dropoff categories: reads `values.pickup_address.(street_line1|line1)` (L778-784) and `values.dropoff_address.*` (L802+).

**Address edit — two different components writing different fields:**
- `src/component/googleMapAutocomplete.js` on select (L196-204): for the `address_` picker it sets `address_attributes` = new object **and clears `values.address` to `""`** (L197-198); for any other picker it sets `{name}address` = object + `{name}` = display string (L199, L201). It never keeps `values.address` and `address_attributes` in agreement.
- `src/component/locationSearchInput.js` (L83-191): a *second* address input that writes `inputaddress` / `input{name1}` (L191) and `line1` on its own object — a different field set again.

**Reorder seed** — `requestorhistory.js` passes the whole past order (`result_data`) into the form, pre-populating `values.address` / `values.pickup_address` / `values.dropoff_address` with the **old** values.

**Net:** the field the review renders is not always the field the active picker updates. After a reorder, the display fields hold the historical address; certain edits update a *sibling* field (`address_attributes`, `{name}address`, or `inputaddress`) that the submission reads but the review does not — so the review lags while the submitted order is correct. Which exact field goes stale depends on the category (single-address vs pickup/dropoff) and which input component that category uses — that's why it's intermittent across flows.

## The fix — one canonical field per address role
Don't patch a single line; **collapse the duplication** so display, edit, and submission read/write the same field:
1. In `googleMapAutocomplete.js` (and `locationSearchInput.js`), on select write the structured object to **one** canonical field per role (`address` / `pickup_address` / `dropoff_address`) and stop clearing `values.address` to `""`. Keep the human-readable string alongside it, but drive display from the structured field.
2. In `summary.js` (L734-810), read that same canonical field for display — drop the `values.address` vs `values.address_attributes` fallback divergence (pick one; `address_attributes` is what submission uses at L186-203, so standardizing display on the same object is the safest single-source choice).
3. Ensure the reorder seed writes the canonical field(s) too, so a subsequent edit overwrites the seeded value in place.

Minimal-risk alternative if a full unify is too big: have `summary.js` display **exactly** the field submission serializes (`values.address_attributes` / the `{name}address` object used in the `address_attributes` build), so the review can never diverge from what's sent.

## QA matrix (the reason it looks inconsistent)
Test **both entry paths** × **both address shapes**:
- Fresh request vs **reorder-from-history**.
- Single-address category (e.g. bathroom/closet — uses the `address_` picker) vs pickup+dropoff category (e.g. alcohol/delivery — uses `pickup_address`/`dropoff_address`).
- In each: change the address, reach the Review screen, confirm the displayed address matches the edited one; submit and confirm the order stores the edited address (this half already works).
- iOS + Android.

## Files to touch
- `src/pages/summary.js` (~L734-810) — review display binding.
- `src/component/googleMapAutocomplete.js` (L196-204) — stop clearing `values.address`; write canonical field.
- `src/component/locationSearchInput.js` (L83-191) — align to the same canonical field.
- `src/component/requestorhistory.js` (`handleClick`, ~L46-220) — ensure the reorder seed populates the canonical field(s).
