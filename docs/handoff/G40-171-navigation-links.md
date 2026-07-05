# G40-171 — Gopher Go: Pick-Up/Destination navigation links (Google Maps / Apple Maps / Waze)

**Jira:** G40-171 (Bug, functions as a feature) · Label `worker` · Priority Lowest
**Surface built:** the real worker screens — `_prototypes/Go/gopher-go-purchase-delivery-figma.html` (the
accepted-job lifecycle file, same one that owns G40-86). New frame **"G40-171 · Navigation"**.
**Scope of this pass:** FRONT-END reference complete (chooser modal + live deep-links + set-default + the
purchase-from-anywhere timer). ETA capture, preference persistence, auto-prompt, and timer re-timing are
native/dev.

---

## What the ticket asks
- Tapping **Pick-Up** or **Destination** on the active-request screen opens a modal with **3 navigation
  options**: Google Maps (already integrated), Apple Maps, Waze.
- Option to **set a default platform for the request** (if set for pick-up, destination uses the same).
- Apple & Waze have APIs; pull **ETAs for Requestors** if possible.
- When the request updates to **"items picked up"**, the navigation prompt pops up **automatically**.
- If **"Gopher can pick up from anywhere"** is selected, a timer **defaults to 60 min and counts down**;
  once the Gopher marks **"Items Picked Up / Purchased"**, the timer **re-times to the nav app's ETA** for
  the distance from the actual pickup point to the drop-off.

## ✅ DONE (front-end) — `gopher-go-purchase-delivery-figma.html`
New **"G40-171 · Navigation"** frame, built with the file's own tokens (navy/green, `.block`, `.pill`,
`.timer-*`), showing the chooser in its open state:
- Tappable **Pick-up** and **Destination** route rows (each with a navigate glyph).
- Bottom-sheet **"Navigate to destination"** with three options — **Google Maps** (`Integrated` badge),
  **Apple Maps**, **Waze** — each a **real deep-link** (`target="_blank"`).
- **"Set as default for this request (used for pick-up & destination)"** toggle.
- **Purchase-from-anywhere timer:** 60-min countdown (`59:12`) with the note "re-times to the nav app's ETA
  once you mark items picked up."
- Verified in-browser (no console errors); screenshot shared.

### Deep-link formats used (swap in the order's real address/coords)
| App | URL |
|---|---|
| Google Maps | `https://www.google.com/maps/dir/?api=1&destination=<addr|lat,lng>` (native `comgooglemaps://?daddr=…`) |
| Apple Maps | `https://maps.apple.com/?daddr=<addr|lat,lng>` (native `maps://?daddr=…`) |
| Waze | `https://waze.com/ul?q=<addr>&navigate=yes` (or `…?ll=<lat,lng>&navigate=yes`; native `waze://?ll=…&navigate=yes`) |

## 🔧 TO BUILD (native / dev)
- **Trigger from the real rows:** wire the chooser to actual Pick-Up/Destination taps on the live
  active-request screen (this frame is the reference).
- **Native deep-links with fallback:** prefer the app scheme (`comgooglemaps://` / `maps://` / `waze://`);
  fall back to the https URL if the app isn't installed. Pass the order's structured pickup/drop coords.
- **Default-platform preference:** persist per-request (and optionally a user-level default) — same platform
  used for both pick-up and destination once chosen.
- **Auto-prompt on "items picked up":** when status transitions to Items Picked Up / Purchased, auto-open the
  chooser (or launch straight into the default platform if one is set).
- **Timer:**
  - Default **60:00** countdown for "pick up from anywhere" requests.
  - On **Items Picked Up / Purchased**, recompute the remaining time from the **navigation ETA** for
    actual-pickup → drop-off.
- **ETA for the Requestor (ideal):** Apple/Waze deep-links don't return an ETA to the app. Compute the ETA
  **server-side via Google Directions / Distance Matrix** (Maps already integrated, RFP Annex §3) regardless
  of which app the Gopher navigates in, and surface it on the requestor side.

## Acceptance criteria → where it lives
| Rule | Front-end (done) | Native/dev (to build) |
|---|---|---|
| Tap Pick-Up/Destination → 3 nav options | chooser sheet + 3 deep-links | wire to live rows; native schemes + fallback |
| Set default platform for the request | toggle in sheet | persist preference (request + user default) |
| Auto-prompt on "items picked up" | note in frame | status-transition hook opens chooser |
| Purchase-from-anywhere 60-min timer, re-times to ETA | 60:00 timer + copy | timer engine + Directions ETA recompute |
| ETA to Requestor | — | server-side Google Directions ETA → requestor UI |

## Notes
- Google Maps is already integrated in the app; this adds Apple Maps + Waze alongside it.
- Built in the real accepted-lifecycle screen (`gopher-go-purchase-delivery-figma.html`), not the
  reference-only concept file.
