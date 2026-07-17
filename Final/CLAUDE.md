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
  detail: `docs/handoff/final-cleanup/chrome-dedup-manifest.md`.
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
- **Canonical-flow scrub — Connect/Request prototypes vs the flow spec (done 2026-07-05).**
  Audited `gopher-connect.html` + `gopher-request.html` against the canonical
  `Documentation/Canonical Request Flow - Master/connect-flows-granular.html` (v3.2) —
  all 19 invariants, the visibility matrix, fee tables, and the Connect↔Request
  divergence table. Verdict: **both adhere**, with two fixes:
  (1) **Connect `eligibleWorkers` enum** normalized `pros`/`my`/`all` → canonical
  `elite_pros`/`my_gophers`/`entire_workforce` across all 10 read/write sites (brings
  Connect into parity with the already-migrated Request app; no behavior/UX change). The
  field is **not yet in the submit payload** — that wiring is matching logic, flagged for
  the human dev in `docs/handoff/connect-eligibleworkers-backend-seam.md`.
  (2) **TrustShield $1 perk scope** — both builds gate it to *age-restricted delivery + all
  ride*; the canonical doc had claimed a broader "all delivery & ride" scope. Owner decision
  (Jul 5): the **narrow build scope is authoritative** — corrected the canonical doc (Master
  + the byte-identical `Dev-Handoff-FeeModel/` copy; older `Jira Tickets/` snapshot left as-is).
  **No prototype code changed for #2** (it was already correct; fee-engine = human-dev only).
- **Asset "verify visually" pass + 4 swaps (done 2026-07-05).** Eyeballed all 6 `med`/`low`
  candidate rows in `asset-match-report.md` by extracting each embedded blob (matched by mime +
  exact decoded byte-size) and comparing side-by-side with its external master. **Completed 4
  of 6** — `img-140`→`go101-delivery.webp` + `img-144`→`go101-moving.webp` (gopher-go-101.html,
  straight swaps), `img-060`→`connect-junk-removal.webp` (gopher-connect.html, center-cropped
  the square master to 3:2 to match the embedded framing), and `img-025`→`services-laptop.webp`
  (gopher-services.html, the clean no-guides variant, which also shrank a 216 KB PNG blob → 12 KB
  WebP). WebP q82, originals archived in `assets/img/originals/`; **~409 KB of base64 removed**.
  The other **2 were left as correctness traps, not cost savings**: `img-037` is a **false match**
  (Connect-business vs Request-customer deals screenshot — the pHash collision the report warned
  about) and `img-052` is a **different version** (different featured deal; the embedded has a
  bottom-nav the master lacks) — swapping either would inject a wrong/changed screenshot. Verdicts
  in `asset-match-report.md` → "Visual-verify pass". _(Principle applied: do the crop/clean work
  ourselves where the asset is genuinely the same image; only decline when swapping would be a bug.)_
  **Follow-on (2026-07-06):** the two merchant logos originally flagged "downgrade — don't swap"
  (`Blind Pelican`, `Buoy Bowls`) were **upgraded with owner-supplied transparent art** — Buoy Bowls
  → 325px transparent WebP across `gopher-connect`/`gopher-request`/`gopher-customer-deals` (replacing
  a 256px WebP + a 150px PNG); Blind Pelican → swapped the `LOGO_PELICAN` constant in `gopher-deals.html`
  from a 365px **no-alpha** PNG to a 336px **transparent** WebP with corrected pelican-in-circle art.

### Asset packs at repo root — spare/upgrade assets, NOT live-site dependencies

`source-images/`, `source-assets/`, and six Deals merchant-logo folders (`Age-Restricted/`,
`Convenience Store/`, `Restaurants & Food Trucks/`, `Local Favorites/`, `Service Providers/`,
`Home Screen/`) sit at the repo root. They are **high-res masters / spares for the
rebuild**, not required for the live site to render — e.g. the Deals page already embeds all
23 merchant logos as thumbnails; the folders are just crisp upgrade sources. (See
`deals-asset-match.md` and `asset-match-report.md`.)

- **Full base64 externalization — images + video (done 2026-07-07, G40-313).** Removed
  **all** remaining inline base64: **~14.6 MB** of base64 raster images across 15 pages
  (217 occurrences → **145 unique files**, SHA-dedup) externalized to `assets/img/`, plus
  the **~4.64 MB** inline base64 video montage in `gopher-services.html` (18 clips →
  `assets/video/services-clip-1..18.mp4`, referenced from the JS `CLIPS[]` array). Real file
  types detected by magic bytes; **exact original bytes** written (lossless — compression/resize
  is G40-314). Biggest drops: `gopher-connect` 5.64→1.20 MB, `gopher-deals` 5.22→0.52 MB,
  `gopher-services` 5.03→0.35 MB, `gopher-customer-deals` 1.93→0.29 MB, `gopher-our-story`
  1.42→0.13 MB. **Zero** base64 raster/video remains (tiny URL-encoded inline `<svg>` icons kept
  intentionally). Verified: 0 missing refs site-wide + live render checks (deals/connect/
  customer-deals/services-video) pass. Generic auto-names (`connect-img-N`, `request-img-N`,
  `shared-img-N`) left for G40-320 to polish. Full mapping:
  `docs/handoff/base64-externalization-2026-07-07.md`. _(Part of Epic G40-312 scale-readiness.)_

- **Image compression + resize (done 2026-07-07, G40-314).** Compressed the externalized
  assets in `assets/img/` — **~6.1 MB saved**. **83** raster files (PNG/JPG/GIF) → **WebP q82**
  (alpha preserved, longest side capped 1400 px) = 4.42 MB saved; the **2 large deals-page Figma
  SVGs** (vector-wrapped layered rasters, 918 KB + 875 KB) composited to flat WebP (52 KB + 72 KB,
  **visually verified pixel-identical** before swap) = 1.67 MB saved. Live `assets/img/` footprint
  ~12 MB → **6.2 MB** (excl. `originals/`). **330** references updated across **118** files (incl.
  the App-Store/Google-Play badges on 100+ pages); 0 broken/missing refs site-wide, verified in
  browser (deals/connect/customer-deals/services). Done with Pillow 11.3 (no cwebp/ffmpeg). Kept
  as-is where WebP wasn't smaller (`04-labor.jpg`, `go-gg-share-label.png`, animated `story-pin.gif`).
  **Video not compressed** — `assets/video/*.mp4` (~3.4 MB) needs ffmpeg (unavailable); flagged for
  dev. Full detail: `docs/handoff/image-compression-2026-07-07.md`. _(Epic G40-312.)_

- **Shared header/footer components — client-side include (done 2026-07-07, G40-315).**
  Header + footer were duplicated inline on every page (~25 KB header CSS+JS/page + ~5.8 KB
  static footer/page). Now shared: **`assets/js/gopher-header.js`** (26 KB, on **124 pages**;
  per-page logo via `window.GopherHeader={logo:'…'}`, mounts `<header class="gh-header">`) and
  **`assets/js/gopher-footer.js`** (6.5 KB, on **108 pages**; mounts at `<div id="gopher-footer">`).
  **~3.6 MB of duplicated HTML removed**, 0 broken refs, verified in browser (default + all branded
  logos, Deals dropdown, footer styling). Built from the canonical inline block (not the stale
  standalone `gopher-header.html`, now a pointer stub). Reconciled connect/request/request-101
  variants onto canonical (logos byte-identical); deleted 5 duplicate logo SVGs; **removed the
  external `gophergo.io/wp-content` footer-logo dependency** → local `assets/img/gopher-logo-footer.webp`.
  18 branded/variant footers + index/go/sandbox bespoke headers intentionally left inline.
  SEO caveat (accepted): nav/footer links are JS-injected — production rebuild should use
  server/build-time components. Full detail: `docs/handoff/header-footer-componentization-2026-07-07.md`.

- **CSS consolidation (done 2026-07-08, G40-316).** Extracted the two large **duplicated**
  inline `<style>` blocks into the new `assets/css/`: service-detail CSS (`gopher-fd-css`,
  ~12 KB) → **`assets/css/gopher-fd.css`** on **107** service pages; footer CSS (`.gopher-footer`,
  ~7.7 KB) → **`assets/css/gopher-footer.css`** on **124** pages. Replaced in place with
  `<link>` (cascade preserved); no `url()` so no path rewrites. **~2.25 MB removed.** With the
  header CSS already in `gopher-header.js` (G40-315), all shared chrome CSS is now cached files.
  Page-specific blocks (dashboard/services/os, single pages) correctly left inline. Verified in
  browser (service + branded pages styled, footer navy, no 404s). Detail:
  `docs/handoff/css-consolidation-2026-07-07.md`. **Deploy must include `assets/css/`.**

- **Mobile responsiveness pass (done 2026-07-08, G40-317).** Verified the 8 priority templates
  at phone (375) + tablet (768): **0 horizontal overflow** on all (index, a service page repping
  all 107, connect, request, deals, go, services, faqs). Mobile burger drawer opens the full
  styled nav (incl. Deals/Tutorials sub-dropdowns) from the shared `gopher-header.js`; gopher iQ
  search pill renders correctly at 375. **No fixes required** — the site is already consistently
  responsive, now structurally so via the shared components. Not exhaustive (every page / extreme
  widths / real devices) — follow-up if wanted. Detail: `docs/handoff/mobile-responsiveness-2026-07-08.md`.

- **Navigation paths & broken refs (done 2026-07-08, G40-318).** Audited every href/src across
  all pages + the shared header/footer JS vs real filenames: **0 root-absolute paths, 0 case
  mismatches**; Home/logo → `index.html` confirmed. Fixed 1 legacy broken link
  (`terms-of-service.html` → `gopher-terms-of-service.html` in request-101). **Localized 13
  external `gophergo.io/wp-content` images** (hot-linked from the live WP site — would 404 when
  gophergo.io is replaced) → `assets/img/wp-*.webp`+`blog-*.webp`, repointed across 7 pages; 0
  hotlinks remain; `mailto:` addresses untouched. Only unresolved refs left = the 8 known-missing
  hero clips (video production, degrades gracefully). Verified in browser. Detail:
  `docs/handoff/nav-paths-2026-07-08.md`.

- **Per-page SEO basics (done 2026-07-08, G40-319).** Base domain `https://gophergo.io/` (owner
  decision). Injected into **126 pages**: `<link rel="canonical">` (home → `/`, others →
  `/<page>.html`), Open Graph (type/site_name/title/description/url/image) + Twitter
  `summary_large_image`; **filled 13 missing meta descriptions** with hand-written copy. Titles
  (127/127) and single-`<h1>` were already good. Created a 1200×630 share image
  `assets/img/og-default.jpg` (cream + navy/green logo + tagline), used as default og/twitter
  image. Idempotent; verified 1 canonical/og:image/desc per page, header/footer intact, no errors.
  `gopher-go-101.html` skipped (concurrent refactor) — add its SEO block once that lands. If prod
  adopts clean URLs, regenerate canonicals without `.html`. Detail: `docs/handoff/seo-basics-2026-07-08.md`.

- **Asset naming + folder organization (done 2026-07-08, G40-320 — final epic ticket).** Created
  `draft-content/` (staging); **consolidated all loose root CSS/JS into `assets/`** (`gopher-ai-engine.css`,
  `3-pill-css.css` → `assets/css/`; `gopher-ai-engine.js`, `gopher-iq-data.js` → `assets/js/`; only
  iq-data is `src`-loaded (4 pages, refs updated) — engines are inlined). Archived 4 unref spare
  images → `assets/img/originals/`. **0 broken refs** (verified `GopherIQData.lookup` still works).
  Documented the naming convention (`<context>-<descriptor>[-n].<ext>`) + live-vs-spare + what the
  rebuild should still move (root `.mp4` scene videos → `assets/video/`; generic `*-img-N` names left
  as-is; go-101 pending concurrent refactor). Full map: `docs/handoff/folder-structure.md`.

- **Connect hero b-roll stand-ins + Maps localhost fix (done 2026-07-15, audit response).**
  The 8 hero-clip 404s in `gopher-connect.html` are **gone**: the 4 hero `<video>` sources now
  point at existing `assets/video/services-clip-{1,5,9,14}.mp4` (the documented stopgap —
  approved services b-roll; `.webm` sources dropped). Photo-cycle fallback + clip swap-in JS
  unchanged; comments mark where to re-point at `hero-media/clip-1..4` when the produced clips
  arrive. Deployed live (main `7972687`) together with a new **`.nojekyll`** on main — GitHub
  Pages' Jekyll was silently dropping underscore files (`__maps-check.html`, `_redirects` were
  404 live; now 200). Also verified the Maps key end-to-end: works on the live github.io domain
  AND (after owner fixed the allowlist) on `localhost:8123` — Google's referrer matcher does
  **not** support wildcard ports (`localhost:*` never matches; use `localhost:8123/*`).
  `file://` can never be allowlisted — reviewers must serve the folder
  (`python3 -m http.server 8123`).

- **SEO quick wins — sitemap, robots, structured data (done 2026-07-15, launch-readiness §11).**
  Added `sitemap.xml` (all 127 canonical URLs, `gophergo.io` base per the SEO-basics owner
  decision) + `robots.txt` (allow-all + sitemap pointer; header comment notes it's inert on the
  GitHub Pages subdirectory and becomes effective at the domain root). Injected JSON-LD
  structured data on **108 pages**: schema.org `Service` (name/description/canonical/provider)
  on all 107 service pages, `Organization` + `WebSite` on `index.html`. Generated from each
  page's existing title/description/canonical (no invented content, no fake ratings);
  idempotent script; all 108 blocks machine-validated + browser render check clean (header
  mounts, 0 console errors). Tracked in `RFP/Gopher-Launch-Readiness-Checklist.md` §11.

- **Public-exposure security pass (done 2026-07-17).** Audited what the two public hosts
  (gopher-deals.netlify.app + GitHub Pages) actually serve. Verdict: no secrets, no
  writable backend, form endpoint safe on read (Apps Script `doGet` returns a liveness
  string only), iQ/audience data aggregate-only. Two fixes applied:
  (1) **Demo-profile PII swapped to fictional** — the seeded demo accounts in
  `gopher-connect.html`/`gopher-request.html` carried a real personal email + 2 real phone
  numbers; now `john.demo@gophergo.io` / `tony.demo@gophergo.io` and 555-pattern phones
  (`9195550124` = the TrustShield/deals-eligible demo profile, `9195550160` = the second
  profile). Digits swapped consistently everywhere incl. logic comments — demo behavior
  unchanged, but anyone using the old numbers to identify the demo accounts should note
  the new ones.
  (2) **Internal docs removed from the served tree** — `docs/handoff/*` (11 files) moved
  to repo-root `docs/handoff/final-cleanup/`, and `GOPHER_IQ_UPDATE_KIT.md`,
  `_MOBILE_FIX_REPORT.txt`, `SETUP-Google-Maps-Steps.html` moved to repo-root `docs/`
  (nothing on the site linked to any of them — verified). `CLAUDE.md` must stay in
  `Final/` for tooling: masked on Netlify via a forced `_redirects` rule
  (`/CLAUDE.md / 301!`) and **excluded at deploy time on GitHub Pages** (the deploy
  worktree step now `rm`s it before committing to `main`).

### Outstanding to-do

- **4 produced hero clips** still wanted for `gopher-connect.html`: `hero-media/clip-1..4`
  (.mp4, optionally .webm). No longer urgent — the hero plays services b-roll stand-ins
  meanwhile (see 2026-07-15 entry); swap the `<source>`s back when production clips exist.
- ~~The "verify visually" image rows~~ — **DONE 2026-07-05** (see below).
