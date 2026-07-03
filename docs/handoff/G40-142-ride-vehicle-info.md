# G40-142 — Need A Ride: show the Gopher's vehicle on the active screen

**Type:** Task (child of Epic G40-1) · **Priority:** Medium · **Bucket A** (Request/demand flow)
**Assignee:** John Newbury · **Status:** front-end BUILT + browser-verified; backend seam only.
Built 2026-07-02. **Key change from John (2026-07-02):** the vehicle photo is a **real photo
the Gopher takes of their actual car (front + back)** in Work Settings & Radius — **NOT** an
auto-generated image from a paid vehicle-image API. The EVOX / CarsXE / VinAudit / CarImagery
dependency is **removed**. NHTSA dropdowns for Year/Make/Model remain optional/nice-to-have.

## What the rider sees
When a Gopher accepts a **Need A Ride** request, the requestor's active-request screen shows a
neat "Look for this vehicle" card below the assigned-Gopher card: **front + rear car photos**
(tap to zoom), **Year/Make/Model**, **Color** (with a color swatch), and **plate**. A message
button is already present (the crew card's Text button). Ride requests only; only after accept.

## What was BUILT (front-end, browser-verified)

**Driver side — `Final/gopher-go.html` → Work Settings & Radius (already existed):**
The "Ride sharing info" section already captures Make / Model / Year / Color / Max-passengers /
Plate / Driver's-license / Issuing-state, plus **Front (head-on)** and **Rear (plate visible)**
vehicle **photo** uploaders with an "on file ✓" state and the rule "if you change any vehicle
detail, new photos are required." This matches John's real-photo model — no change needed.

**Requestor side — `Final/gopher-request.html` (new):**
- A shared component `docs/handoff/vehicle-card-component.html` injected between
  `GOPHER-VEHICLE-COMPONENT (G40-142) START/END` markers. Exposes:
  - `window.__vehicleCard(v)` → the vehicle-card HTML for `v = { frontPhoto, rearPhoto, year,
    make, model, color, plate }`.
  - `window.__demoCarPhoto(color, view)` → **DEMO ONLY** color-matched car SVG (front/rear) so
    the card renders with no photo server (delete in prod).
- The card is rendered in `renderRequestDetail()` → `cardFor(lw)`, appended after each
  assigned-worker card, **gated on `category === 'ride'` and `lw.vehicle`** (so it never shows
  on delivery/service/moving).
- Photo tap-to-zoom **reuses the G40-101 receipt viewer** (`window.__receiptViewer` via the
  delegated `[data-rcpt-open]` handler) — one zoom viewer serves both features.
- Added an in-progress ride demo request **GR-00131** ("Ride — RDU Airport to 412 Oakwood Ave",
  Sarah R., Elite+) with `live.crew[0].vehicle` populated, since no in-progress ride existed to
  demo the card.

Verified in a browser (standalone harness): card renders with front+rear photos, "2022 Toyota
Camry", Silver swatch, plate `HXR-4471`; tapping a photo opens the fullscreen zoom.

## What the DEVELOPER wires (backend — only remaining work)
1. **Store two photo URLs** (front, rear) on the driver profile when the Gopher uploads them in
   Work Settings & Radius (same image-upload path as profile/credential photos).
2. **Return them on ride accept** — when a Gopher accepts a Need A Ride request, include
   `frontPhoto`, `rearPhoto`, `year`, `make`, `model`, `color`, `plate` on the accepted worker
   so the active screen can render `window.__vehicleCard(v)`. Null photo → the demo car shows;
   pass real URLs and the demo generator never runs.
3. **Message button** — already wired to the existing in-app messaging (the crew card's Text
   button → `openInboxThread`); nothing new needed.
4. (Optional) **NHTSA** `vpic.nhtsa.dot.gov/api` for standardized Year/Make/Model dropdowns at
   registration. Free; no key.

## Acceptance criteria mapping (updated for real photos)
| # | Scenario | Status |
|---|----------|--------|
| 1 | Gopher registers vehicle + photos at setup | **Built** — Work Settings ride-sharing info (front+rear photo uploaders) |
| 2 | Vehicle photo + YMM + color shown to rider after accept | **Built** — vehicle card on the active ride screen |
| 3 | Message button on the ride active screen | **Built** — existing crew-card Text button |
| 4 | Vehicle info only for Need A Ride | **Built** — gated on `category === 'ride'` |
| — | (removed) auto-generate photo via image API | **Dropped** — real front/rear photos instead |

## Files touched
- `Final/gopher-request.html` — vehicle component injected; `cardFor` renders the card (ride-gated); ride demo GR-00131 added.
- `docs/handoff/vehicle-card-component.html` — canonical shared component.
- `Final/gopher-go.html` — **unchanged** (driver ride-sharing info + front/rear photos already present).

## Verification note
Component + card browser-verified in a standalone harness (the full app couldn't be served —
the preview sandbox can't read the project dir). All 13 inline scripts in `gopher-request.html`
parse cleanly after the edits (`new Function` check). To see it in the app: open an in-progress
**ride** request (GR-00131) on the active screen → the vehicle card shows below the Gopher; tap
a photo to zoom.
