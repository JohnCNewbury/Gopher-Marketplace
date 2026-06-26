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
  originals are archived in `assets/img/originals/`. **The big shared header/footer
  "chrome" dedup (~14 MB of logos/icons/badges duplicated across 100+ pages) is NOT yet
  done** — that's the largest remaining win.
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

### Asset packs at repo root — spare/upgrade assets, NOT live-site dependencies

`source-images/`, `source-assets/`, and six Deals merchant-logo folders (`Age-Restricted/`,
`Convenience Store/`, `Restaurants & Food Trucks/`, `Local Favorites/`, `Service Providers/`,
`Home Screen/`) sit at the repo root. They are **high-res masters / spares for the
rebuild**, not required for the live site to render — e.g. the Deals page already embeds all
23 merchant logos as thumbnails; the folders are just crisp upgrade sources. (See
`deals-asset-match.md` and `asset-match-report.md`.)

### Outstanding to-do

- **Shared header/footer chrome dedup** (~14 MB) — the biggest remaining image win
  (`docs/handoff/base64-image-plan.md`).
- **The "verify visually" image rows** + the two downgrades — left for human review
  (`docs/handoff/asset-match-report.md`).
- **8 hero clips** still needed: `hero-media/clip-1..4.{webm,mp4}` referenced by
  `gopher-connect.html` (`docs/handoff/missing-files.md`).
- **Stale page counts in the docs:** several docs say **134 pages / 108 service pages**,
  but the actual current count is **133 / 107** (the duplicate `e-waste-removal_1.html`
  was deleted). Update page-inventory and any other doc that cites 134/108.
