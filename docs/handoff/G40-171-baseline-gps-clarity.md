# Gopher Go — Baseline GPS clarity (worker taps Pick-Up/Destination → Google Maps)

**Status:** Built + verified (front-end reference) · **Surface:** `_prototypes/Go/gopher-go-purchase-delivery-figma.html`
**Relation:** Baseline (Phase I) for the worker active-job screen. The full 3-app chooser is **G40-171 → Phase II**.

## Why this exists
On the Gopher **worker** app the worker taps the **Pick-Up** and **Destination** stops on an active
job to get **Google Maps GPS** turn-by-turn directions (already integrated today). The prototype did
**not** make that obvious — on the active-job screen the two stops read as plain text, weren't real
links, and were shown **dimmed behind** the (Phase II) navigation-chooser overlay. A worker could miss
that these give GPS assistance. This pass makes the baseline behavior clear and functional, separately
from the deferred Phase II chooser.

## What changed — `gopher-go-purchase-delivery-figma.html`
This is the canonical worker **active-job lifecycle** surface (per `gopher-go-BUILD-BRIEF.md`, row 2.6).
The single "G40-171 · Navigation" frame conflated baseline + Phase II. It was split into two frames:

1. **Baseline frame — "Active job · tap a stop for Google Maps GPS"** (new)
   - Pick-Up and Destination are now real, tappable **`<a>` map deep-links** matching the **live app's
     endpoint/params** — `https://maps.google.com/maps?daddr=<dest>` (`target="_blank"`).
   - Each stop shows an explicit **"Tap for GPS directions"** cue + a green **Maps** chip, a hover/focus
     state, and a one-line note: *"Pick-up and destination open turn-by-turn GPS in your maps app —
     Google Maps on Android, Apple Maps on iPhone (as the live app does today)."* No JS — pure HTML/CSS,
     consistent with this figma-import file.
   - Demo addresses: Pick-up `Sheetz · 100 Village Walk Dr, Holly Springs, NC`; Destination
     `100 Demo Way, Raleigh, NC`.
   - The Phase II "purchase-from-anywhere" timer is intentionally **not** on this baseline frame (it's a
     Phase II item — see below).

2. **Phase II frame — "PHASE II · G40-171 — Maps / Waze chooser + timer"** (preserved reference)
   - The full G40-171 chooser (Google Maps `Integrated` / Apple Maps / Waze), the **set-default** toggle,
     and the **60-min purchase-from-anywhere timer** — kept intact as the front-end reference for when
     Phase II is built. Nothing from the G40-171 deliverable was lost; it was relocated and re-labeled.

## Fidelity to the LIVE app (GitLab source of truth)
This feature already ships. The prototype was reconciled to match it exactly. Live implementation —
`gopher-mobile-gopher` (Gopher Go worker app), identical logic in **two** places:
`src/component/ordercard.js` (~L11853–11985) and
`src/component/layoutComponent/RequestDetailPullOver.js` (~L13090–13205).

Per-stop `onClick` (Pick-Up and Destination buttons):
```js
let { latitude, longitude } = await getLocation();          // current GPS → saddr
isIOS
  ? window.open(`http://maps.apple.com/maps?saddr=${latitude},${longitude}&daddr=${destLat},${destLng}&dirflg=d&t=m`, "_blank")
  : window.open(`http://maps.google.com/maps?saddr=${latitude},${longitude}&daddr=${destLat},${destLng}`, "_blank");
```
- **Platform-split, no chooser today:** iOS → Apple Maps, everything else → Google Maps. (The G40-171
  Phase-II chooser is what *adds* a picker + Waze + set-default.)
- **Coordinates, not text:** `daddr` = the order's pickup/dropoff **lat,lng** (`params.pickupAddress` /
  `params.address || params.dropoffAddress`); `saddr` = the Gopher's current location.
- Buttons are green circular icon buttons ("Pick-Up"/"Destination", `assets_1/map_location.png`), shown
  only while `aasmState ∈ {scheduled, accepted, picked_up, purchased, delivered}` and the address exists.
- The prototype uses the **same endpoint + `daddr` param**, with the demo **address string** standing in
  for the live lat,lng coords (the static file has no coordinate data). Production passes coords.

**Note for the G40-171 Phase-II build:** adopt these **proven live formats** (`maps.google.com/maps?…` /
`maps.apple.com/maps?…&dirflg=d&t=m`) rather than the newer `maps/dir/?api=1&destination=` form, to avoid
regressing what already works. Waze is the only genuinely new target.

**Secret spotted (flag, don't fix here):** `ordercard.js` embeds a hard-coded Google Maps Platform
API key (`AIzaSyB7K7kg…` — **value redacted, do not re-paste it here**; ~L864/897) in client code.
Belongs to the secret inventory / rotation work (G40-283 / SEC-1).

_Redacted 2026-07-20: the literal key was published in this file while the repo was public. The full
value, both affected apps, the four APIs in play, and why the obvious "just restrict it" fix would
break production live in `Documentation/Security/maps-key-exposure-SEC-1.md` — kept **outside** this
repo deliberately. Do not restore the literal here._

## Verification
Served the file and loaded it in-browser: both baseline rows are anchors to Google Maps
(`target="_blank"`), each with the "Tap for GPS directions" hint + Maps chip; captions read
"Active job · tap a stop for Google Maps GPS" and "PHASE II · G40-171 — …"; the Phase II chooser still
renders its 3 options. No console errors. Screenshot shared.

## To build (native / dev)
- The baseline is **already live** — parity here just means the prototype now reflects it. If the rebuild
  re-implements it, mirror the live logic above: `getLocation()` → `saddr`, `isIOS ? maps.apple.com/maps…&dirflg=d&t=m
  : maps.google.com/maps…`, `daddr` = the order's pickup/drop **lat,lng**.
- Phase II (**G40-171**, deferred): the Apple Maps / Waze chooser, set-default persistence, auto-prompt on
  "items picked up," and the purchase-from-anywhere timer re-timing to the nav ETA — built on the live
  formats above. See `docs/handoff/G40-171-navigation-links.md`.

## Notes
- `Final/gopher-go.html` has **no** active-job screen (marketing + account only); the worker active-job
  lifecycle lives in the `_prototypes/Go/*-figma.html` set. This is the correct surface.
