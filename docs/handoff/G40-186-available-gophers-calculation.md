# G40-186 — Available Gophers Calculation Update (request creation)

**Status:** Built + verified · reuses the live **Gopher iQ** coverage brain for website↔app continuity
**Jira:** G40-186 · Task · Medium · `request` · KEEP · Bucket A · Scaffold: `wave2/g40-186/eligibility.js` (4 criteria + `<20`, tested)

## Goal
On the request-creation address step, show an accurate count of eligible Gophers near the route, and if
**< 20**, show a low-availability warning modal. Recalc when the address changes.

## Approach — continuity with the website (per owner direction)
Rather than a parallel calculation, this reuses the **same Gopher iQ coverage data** that powers the website
search-pill availability answers (`window.GopherIQData` from `gopher-iq-data.js`), so the in-app count matches
what users already see online once plugged in.

- **Count source:** `GopherIQData.lookup("City, State").workers`. A "worker" in that brain already applies **3
  of the 4** ticket criteria — **Stripe-payout verified**, **active account**, **engaged** (signed up ≤6 mo OR
  completed ≥1 job) — within its coverage radius. A Gopher near **pick-up AND/OR drop-off** counts, so we take
  the **better-covered endpoint** (`max` of the two lookups).
- **Threshold:** `workers < 20` — the exact **tier-1 boundary** the website's `coverageTier()` uses, so the
  low-availability trigger is identical online and in-app.
- **Address→place:** `lookup()` keys on `City, State`, so a `_reqPlaceFromAddr()` helper extracts the city from
  the full street address (`"218 Fayetteville St, Raleigh, NC" → "Raleigh, NC"`).

## What was built — `Final/gopher-request.html`
- **`reqRouteWorkers()`** — extracts the place from pickup/dropoff, calls `GopherIQData.lookup`, returns the max
  workers (or `null` if unresolved).
- **`reqAvailabilityLine()`** — renders under the route on the address step: green *"✅ N Gophers available near
  your route"* when ≥20, amber *"📍 N … — availability is limited right now"* when <20. Recalcs on every render
  (i.e. when a stop is added/removed/changed). Carries `data-req-avail` so the flow can detect the address step.
- **`window.__openLowAvailabilityNotice()`** — the low-availability modal (G40-308 `gr-modal` pattern, mirrors
  the low-offer backstop). Only opens on the `<20` tier; shows the count + **"Post my request anyway"**
  (acknowledges) + **"Find MY Gopher instead"** → `age-restricted.html#find-my-gopher` (the same `<20`-tier CTA
  the website uses). One-shot via `state.lowAvailabilityAck`.
- **Continue gate** — in the flow's Continue handler, right after the low-offer backstop: if the address step is
  showing (`$content` has `[data-req-avail]`) and not yet acknowledged, fire the modal and block advance.
- **State:** `state.lowAvailabilityAck` added to flow state.

## Verification
- **Real file** (loaded in browser): **no console errors**; `GopherIQData` continuity confirmed — the demo route
  resolves to **Raleigh 186 / Apex 123 → 186** (not low, no modal), a small town resolves to **Aberdeen 3 → <20**;
  `window.__openLowAvailabilityNotice` is defined.
- **Isolated harness** (verbatim functions + stubbed `GopherIQData`/`reqModal`/state): **14/14 pass** — place
  extraction, high route = 186 (green, no modal), low route = 3 (amber line + modal with count + Find MY Gopher
  CTA), Post-anyway sets ack, ack prevents re-open, unresolved → null/empty/no-modal. Screenshot shared.

## Backend seam (eligibility.js — the tested reference)
The prototype count uses Gopher iQ coverage (3 of 4 criteria, static tables). Production should:
- Add the **exact 15-mi geodistance** (haversine on pickup/dropoff coords) and the **per-category work-settings +
  service-radius match** (criteria 2 precise + 3) — these are in `wave2/g40-186/eligibility.js`
  (`isEligibleGopher` / `countEligible` / `showLowAvailability`).
- Swap `GopherIQData.lookup()`'s static tables for the live eligibility query behind the same call shape (the
  `gopher-iq-data.js` header already flags this seam), keeping website and app on one source.

## Files
- `Final/gopher-request.html` — `lowAvailabilityAck` state, `_reqPlaceFromAddr`/`reqRouteWorkers`/
  `reqAvailabilityLine`/`__openLowAvailabilityNotice`, the address-step availability line, the Continue gate.
