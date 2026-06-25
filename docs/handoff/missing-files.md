# Missing Files — Your To-Do List

_Updated: 2026-06-24 after the service-page pass · Source: [broken-references.md](broken-references.md)_

This is the **residual list of files that must be created by hand** — nothing here
could be safely auto-fixed, because no equivalent exists in the repo. Everything that
*could* be rewired to an existing file (terms page, scene videos, service-category
anchors, support links), resolved via a library CDN (Leaflet map icons), or **built
from an existing service-page template** (the two missing service pages) has already
been handled and is no longer listed here.

**The only real outstanding work is the 8 hero-clip video files** (plus one optional
shared-header script). **Do NOT fabricate or stub these** — they are intentionally
left for you to produce or source.

---

## 🎬 1. Hero background clips — `hero-media/` (8 files = 4 clips × 2 formats)

- **Create:** `hero-media/clip-1.webm`, `hero-media/clip-1.mp4`,
  `hero-media/clip-2.webm`, `hero-media/clip-2.mp4`,
  `hero-media/clip-3.webm`, `hero-media/clip-3.mp4`,
  `hero-media/clip-4.webm`, `hero-media/clip-4.mp4`
- **Referenced by:** `gopher-connect.html` — `clip-1` (lines 6698–6699),
  `clip-2` (6702–6703), `clip-3` (6706–6707), `clip-4` (6710–6711),
  via `<video class="hero-clip"><source>` tags.
- **What they are:** Four decorative, looping, muted background clips that crossfade
  behind the Gopher Connect hero (`aria-hidden`, staggered 6-second animation delays).
  Each needs both a `.webm` and an `.mp4` source.
- **Why not auto-fixed:** No `clip-*` files exist and there are **no `.webm` files
  anywhere** in the repo. The root-level `.mp4`s are not named/sized for this slot.
  Produce/source 4 short branded clips (or, as a stopgap, point the `.mp4` sources at
  existing root clips and drop the `.webm` lines — a content decision left to you).

---

## ⚙️ Optional / future — `gopher-header.js`

- **Create (only if you extract the shared header):** `gopher-header.js` (repo root)
- **Referenced by:** `gopher-header.html:20` — **inside an HTML comment**, as a build
  instruction, not a live `<script>` tag. Nothing 404s today.
- **What it is:** The comment instructs lifting the inline `<style>` + `<script>` header
  blocks into a single shared `gopher-header.js` loaded on every page. This is a
  production-rebuild step, not a current breakage. Create it only when you do that
  extraction; otherwise it can be ignored.

---

### Already handled (for reference — not your job)

- `last-minute-runs.html` → **created** from the `errand-running.html` template
  (Delivery & Errands category); hero image marked `[PLACEHOLDER]`.
- `yard-work.html` → **created** from the `yard-cleanup.html` template (Yard & Outdoor
  category), positioned as general yard help; hero image marked `[PLACEHOLDER]`.
- `gopher-terms.html` → rewired to existing `gopher-terms-of-service.html`.
- `scenes/{delivery,mowing,handyman,groceries}.mp4` → rewired to existing root videos
  (`Packed-Delivered.mp4`, `Teen-Lawn-Mower.mp4`, `Handyman.mp4`, `Grocery-Delivery.mp4`).
- Leaflet `images/{layers,layers-2x,marker-icon}.png` → resolved by loading Leaflet
  from its official CDN on the deals pages (no local image files needed).
