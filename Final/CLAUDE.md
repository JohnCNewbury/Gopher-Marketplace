# CLAUDE.md — Gopher Marketplace

## What this is

This repository is an **AI-generated static HTML prototype** for "Gopher Marketplace."
It is a **visual blueprint, not production code.** Do not treat it as a real, working
platform. It exists to be handed off to a human developer who will perform a
production rebuild.

Every page is self-contained static HTML (no build step, no framework, no backend).

## Repository layout

The prototype lives in the **`Final/`** folder — that folder is the **site root**
(the page served at the GitHub Pages URL is `Final/index.html`, and pages reference
each other and their assets relative to `Final/`). It contains ~132 HTML pages plus
`.css` files, `.mp4` scene videos, and image assets.

`Final.zip` is the original archive `Final/` was extracted from; it is kept only as a
backup and is not part of the served site.

## Scope of AI work (important)

Limit all AI work to **cleanup, documentation, and front-end reference fixes.**

**Do NOT implement or modify any of the following — they are reserved for a human
developer:**

- Payments / billing
- Authentication / accounts
- Database / persistence
- Matching logic (connecting requesters and "Gophers")
- Security logic

If a task seems to require any of the above, stop and flag it rather than building it.

## Deployment constraints (these cause real bugs)

The prototype is deployed via **GitHub Pages at a subdirectory URL:**

> https://johncnewbury.github.io/Gopher-Marketplace/

Two consequences follow directly from this, and both are easy to get wrong:

1. **All paths must be relative — never root-absolute.**
   Because the site lives under the `/Gopher-Marketplace/` subdirectory, a leading
   slash resolves to the domain root, not the project root.
   - ❌ `/scenes/delivery.mp4` → 404
   - ❌ `<a href="/index.html">` → 404
   - ✅ `scenes/delivery.mp4`, `./delivery.mp4`, `index.html`
   This applies to **every** href, src, link, and asset reference (pages, videos,
   images, CSS, JS).

2. **File references are case-sensitive.**
   GitHub Pages serves on **Linux**, which is case-sensitive, even though macOS
   (where these files were authored) is not. A reference must match the actual
   filename casing **exactly**, character for character.
   - If the file is `Junk-Removal.mp4`, then `junk-removal.mp4` will 404 on the
     live site even though it "works" locally on macOS.
   - When fixing references, verify against the real filename, not from memory.

## Known issues

These are known and expected in the prototype. Document/clean them as appropriate;
do not assume they indicate deeper problems.

- **Very large, base64-bloated pages.** Several HTML files embed large base64 assets
  inline, making them multi-megabyte. (e.g. `gopher-connect.html`,
  `gopher-request.html`, and `index.html` are each in the megabytes.) These should
  eventually be replaced with external asset references in the production rebuild.
- **Duplicate element IDs.** The same `id` value appears on multiple elements within
  a page. This is invalid HTML and breaks `getElementById`-style lookups.
- **Demo-only JavaScript.** Some functions are placeholders/stubs that only simulate
  behavior for the prototype. Known demo-only functions include:
  - `bookService`
  - `analyzeUpload`
  - `contactSupport`
  These do not perform real work and must not be relied on as functional logic.

## How to work in this repo

- Treat every page as **reference/blueprint output**, not as a system to extend.
- When fixing front-end references, prefer relative paths and exact-case filenames.
- Keep changes scoped to cleanup, documentation, and reference correctness.
- Do not introduce backend behavior, real data flows, or security/auth/payment code.

## Session progress (cleanup work done so far)

_Paths below are relative to the site root (`Final/`); handoff docs live in the
repo-root `docs/handoff/` folder, one level above this file._

### Done

- **Image optimization (content images).** 19 base64-embedded images were externalized
  to `assets/img/`, removing **~4.9 MB of base64** from the HTML across `index.html`,
  `gopher-blog.html`, `gopher-customer-deals.html`, `gopher-request.html`, and
  `gopher-our-story.html` (4 exact JPEGs + 7 HQ masters + 8 hero pics → WebP). Full-res
  originals are archived in `assets/img/originals/`.
- **Shared header/footer "chrome" dedup (the big one — done 2026-06-26).** The 7
  highest-duplication chrome blobs (5 brand logos + 2 app-store badges, inlined as base64
  on 100+ pages each) were externalized to single shared files in `assets/img/`, and all
  **862** inline copies replaced with relative, case-exact references — **16.76 MB of
  base64 text removed** across **127 pages**, collapsing to 7 cached files (106.8 KB).
  Each instance was sha256-verified byte-identical before merging; zero inline chrome
  base64 remains. SVG logos kept as `.svg`, badges kept as PNG (externalized as-is). Full
  detail: `docs/handoff/chrome-dedup-manifest.md`.
- **Honesty copy fixes in `gopher-request.html`** (copy-only, no functionality change):
  removed the false persistence claims — "Your information is saved automatically" →
  "Your progress stays here while this page is open"; "✓ Saved to your job history" →
  "✓ Request submitted". (There is no real storage; state is in-memory only.)
- **New handoff docs** (in `docs/handoff/`):
  - `connect-request-readiness.md` — deep production-readiness audit of
    `gopher-connect.html` and `gopher-request.html`, which are intended to become the
    **real product front end** (web version of the Gopher Request app). Verdict for both:
    **prototype-grade, needs hardening.** Recommended path: **rebuild as components with a
    real state layer + backend — do NOT patch the inline JS in place.**
  - `deals-asset-match.md` — cross-reference of the Deals merchant-logo folders vs. what
    the Deals pages embed.
  - (Earlier docs also present: secrets-scan, broken-references, missing-files,
    page-inventory, unfinished-functions, component-structure, base64-image-plan +
    manifest, asset-match-report, README.)
- **Page-count corrections across the handoff docs.** After the duplicate
  `e-waste-removal_1.html` was deleted, every doc that cited the old totals was updated to
  the verified counts: **133 HTML files** (was 134) = 19 core/brand/legal + **107
  service-detail** (was 108) + 7 components/fragments. Junk Removal dropped 13 → 12.
  Touched `page-inventory.md`, `README.md`, `component-structure.md`, `broken-references.md`,
  and `base64-image-plan.md`; the stale `e-waste-removal_1.html` orphan/duplicate entries
  in `page-inventory.md` were updated to reflect the deletion.
- **Gopher iQ location intelligence + coverage "data brain" (done 2026-07-02).** The
  search pill now answers location questions ("Do you have service in Raleigh?", "become a
  Gopher in Cary", "when are you coming to Charlotte?") with **real local-Gopher counts** and
  drives a request/signup. New shared data layer **`gopher-iq-data.js`** (`window.GopherIQData`),
  loaded before the engine on every pill page, holds a **10-mile-radius** coverage table built
  offline from `Users_02_07_2026.csv` + `Orders_02_07_2026.csv` (+ GeoNames ZIP centroids,
  CC BY 4.0). Worker = role∋Gopher & Stripe-payout-verified & active **& engaged** (signed up
  in the last 6 months OR has completed ≥1 request all-time — so the count isn't inflated by
  registrations that never worked); recent-activity (tier 4) = distinct gophers who completed a
  delivery in the last ~3 months. Availability answers are
  **4-tiered** (< 20 "word getting out" + *Find MY Gopher* → `age-restricted.html#find-my-gopher`;
  20–49 / 50+ standard; 50+ & 10+-active "ready to connect"), plus a **collision clarifier**
  ("Denver → CO/NC/PA?"). Engine changes (`gopher-ai-engine.js`/`.css`) propagated to all
  inlined copies (index, request, services, faqs, both `-block` fragments, sandbox). It is a
  **prototype static data layer** — production swaps the tables for a live query behind the same
  `GopherIQData.lookup()` seam. Full detail + regeneration recipe:
  `docs/handoff/gopher-iq-location-intelligence.md`.

### Asset packs at repo root — spare/upgrade assets, NOT live-site dependencies

`source-images/`, `source-assets/`, and six Deals merchant-logo folders (`Age-Restricted/`,
`Convenience Store/`, `Restaurants & Food Trucks/`, `Local Favorites/`, `Service Providers/`,
`Home Screen/`) sit at the repo root. They are **high-res masters / spares for the
rebuild**, not required for the live site to render — e.g. the Deals page already embeds all
23 merchant logos as thumbnails; the folders are just crisp upgrade sources. (See
`deals-asset-match.md` and `asset-match-report.md`.)

### Outstanding to-do

- **The "verify visually" image rows** + the two downgrades — left for human review
  (`docs/handoff/asset-match-report.md`).
- **8 hero clips** still needed: `hero-media/clip-1..4.{webm,mp4}` referenced by
  `gopher-connect.html` (`docs/handoff/missing-files.md`).
