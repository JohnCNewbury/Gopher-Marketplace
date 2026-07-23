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

- **Connect "Learn more" pages — built, wired, and LIVE (done 2026-07-22, deploy `9634bb8`).**
  Six business-voiced use-case pages (`connect-{skilled-trades,courier-delivery,
  workforce-support,commercial-cleaning,event-staffing,warehouse-fulfillment}.html`) are now
  public, indexable, linked from the Connect use-case grid, and in `sitemap.xml` (127→133).
  This session closed out the full handoff list: `id="use-cases"` anchor (`9e2fb1a`); card
  copy rewrite + "Bulk Labor"→"Workforce Support" + cards became real `<a>` links with
  per-card `aria-label` (they had been inert `<div>`s with `cursor:pointer`) + `.uc-*` ink
  contrast fixes (`851574e`); `?need=<slug>` deep-link receiving end — slugs live in
  `<option value=>`, never labels, so copy renames can't break links — plus 3 grid Pexels
  hot-links localized (`e286ed4`); owner approval → `noindex` off + sitemap (`58c010a`);
  **category-matched photography** — every page's rotating backdrop shows the work its own
  six job cards describe (36 frames, one per card, in card order) and every hero is its
  category's most iconic frame (`339916e`/`b459d0f`/`4acea28`). All frames Pexels at w=1600,
  **each visually verified before conversion** (rejects: 2 secretly-grayscale, 1 hazmat suit,
  2 legible company logos — alt text flags none of these); WebP q82 1400px, sources in
  `assets/img/originals/`. 6-frame pages use `class="uc-photo-bg six"` → `ucCycle6` 30s in
  `gopher-connect-uc.css` (the 9-frame `ucCycle` still exists; both cycles coexist).
  Deploy scope-checked with a full tree-vs-`origin/main` diff (88 files, 0 riders) — **the
  deploy script's diffstat display elides**; don't read it as the full list. Live-verified by
  content grep. Full trail: `Documentation/Claude Code Review:Cleanup/connect-learn-more-handoff.md`.
  Follow-on same day (`83d51e9`, deployed `2950b74`): **every Pexels hot-link site-wide
  localized** — the "66 in gopher-connect" turned out to be **218 refs across 107 pages**
  (every service-detail hero included). 160 unique image+crop combos → `assets/img/
  px-<id>-<w>[x<h>].webp` (WebP q82, exact requested dims, 11.2→7.6 MB); both raw and
  `&amp;`-encoded URL forms rewritten; source map in
  `docs/handoff/final-cleanup/pexels-localization-manifest.md`. Two source photos had been
  **deleted from Pexels** — lawn-mowing + touch-up-painting were serving broken live heroes;
  replaced with verified equivalents. **Zero external images remain in the render path
  site-wide** (gophergo.io URLs in og:/twitter:/JSON-LD metadata are intentional absolute
  URLs, not hot-links — don't "fix" them). Still open: produced hero clips for
  `gopher-connect.html` (BLOCKED on video production; b-roll stand-ins playing).

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
  the new ones. **⚠️ That pass was incomplete — see the 2026-07-20 entry below.** It
  swapped email + phone only, and left the real street address, DOB, home GPS, referrer
  name, and account ID live on the public site for three more days.
  (2) **Internal docs removed from the served tree** — `docs/handoff/*` (11 files) moved
  to repo-root `docs/handoff/final-cleanup/`, and `GOPHER_IQ_UPDATE_KIT.md`,
  `_MOBILE_FIX_REPORT.txt`, `SETUP-Google-Maps-Steps.html` moved to repo-root `docs/`
  (nothing on the site linked to any of them — verified). `CLAUDE.md` must stay in
  `Final/` for tooling: masked on Netlify via a forced `_redirects` rule
  (`/CLAUDE.md / 301!`) and **excluded at deploy time on GitHub Pages** (the deploy
  worktree step now `rm`s it before committing to `main`).

- **Self-hosted brand fonts — Google Fonts dependency removed (done 2026-07-19).** All three
  brand typefaces were hot-linked from `fonts.googleapis.com` on **129 of 135** pages (108 with
  a byte-identical request string). Now self-hosted: **`assets/fonts/`** holds 8 woff2 files
  (**251 KB** total) — Nunito, DM Sans, DM Sans italic, Caveat, each in `latin` + `latin-ext`
  subsets — declared via the new **`assets/css/gopher-fonts.css`** (8 `@font-face` blocks,
  `font-display:swap` preserved, `url(../fonts/…)` **relative to the CSS file** so it survives
  the subdirectory deploy). All are **variable fonts**, so one file per family covers the whole
  weight range (`font-weight:400 900` for Nunito etc. — intentional, not a typo); both subsets
  are declared with `unicode-range`, so a typical English page still only downloads ~161 KB.
  Each page's 2 `preconnect` hints + the `css2` `<link>` were replaced by one local `<link>` at
  the same position (cascade unchanged); **0** `fonts.googleapis.com`/`gstatic` references remain.
  `font-family` declarations were **not** touched — family names are identical, so no other CSS
  moved. Licensing: all three are SIL OFL 1.1 (self-hosting/redistribution permitted);
  `assets/fonts/OFL.txt` carries the license text + all three copyright attributions.
  Correctly skipped the 6 non-pages (engine/pill fragments, header/footer stubs, `__maps-check`).
  Verified in browser — index, deals, a service page, and `gopher-blog` (the only page that had
  requested the DM Sans `opsz` axis; nothing in the CSS drives that axis, so no change) all
  render Nunito/DM Sans/Caveat correctly with 0 console errors.
  **Deploy must include `assets/fonts/` — without it the site loses all three typefaces.**
  _Why: removes a third-party render-path dependency, stops leaking visitor IPs to Google
  (the GDPR exposure behind the 2022 Munich ruling), and is now strictly faster — browsers
  partitioned the cross-site font cache in 2020, so hot-linking no longer buys a warm cache._

- **Guarded deploy script (done 2026-07-19).** The deploy copied from the **working tree, not
  committed state** — on 2026-07-19 that silently shipped 141 uncommitted files to production
  alongside an unrelated feature (they happened to be finished; next time they might not be).
  The procedure now lives in **`scripts/deploy.sh`** instead of being retyped each time.
  **Dry run by default — it never pushes without `--push`.** Preflight *blocks* on: uncommitted
  changes under `Final/` (override with `--allow-dirty`, which prints exactly what unversioned
  work is shipping); a missing `assets/{css,js,img,fonts}`; root-absolute paths; and reintroduced
  external hotlinks (`fonts.googleapis`/`gstatic`/`gophergo.io/wp-content`). It then flattens
  `Final/` to the root of `main` via rsync, **preserving `.github`, `.nojekyll`, `README.md`**
  (these live only on `main`; an unguarded `--delete` wipes them, and losing `.nojekyll` silently
  404s every underscore file), and **excluding** `CLAUDE.md`, `docs`, `_backups`, `draft-content`
  + `.DS_Store` at any depth. Post-rsync it re-asserts the exclusions held and that `.nojekyll`
  survived before allowing a commit. Validated end-to-end: against the current clean tree it
  reports **0 files changed vs live**, i.e. it reproduces the real deploy byte-for-byte.
  **Owner decision (2026-07-20): the deploy keeps reading from the working tree — do not
  repoint it at a committed ref.** The preflight guard already closes the hole and makes any
  dirty deploy explicit, and repointing would remove the ability to deliberately ship
  in-flight work. Settled, not an open question. Re-verified by dry run on 2026-07-20: all
  guards pass, 0 files changed.
  **First real `--push` run 2026-07-21 (`ace3647`) — the script is now the deploy procedure,
  not a proposal.** Shipped 6 files (GO-To's in both apps + both 101 guides + the age-keyword
  brain); preflight passed, `CLAUDE.md` stayed excluded and `.nojekyll`/`README.md` survived,
  all verified against the live site afterwards. Two things that run taught, worth keeping:
  (1) **the dry-run file list is a scope check, not just a diffstat** — it surfaced another
  session's committed-but-undeployed `assets/js/gopher-age-keywords.js` riding along, which
  changes live age-restricted detection; read that list and get an owner OK on anything
  outside your own change before `--push`. (2) **Local `main` is not what's live** — the
  script pushes from a throwaway worktree and never fast-forwards the local ref (it still
  read `625b0ae` right after the deploy). Confirm with
  `git merge-base --is-ancestor <sha> origin/main`, then curl the live URL and **grep for the
  changed string** — a 200 only proves the file exists, not that it updated.

- **Owner PII removed from the demo profile (done 2026-07-20).** Found while moving the
  research reports out of this (public) repo. The 2026-07-17 pass swapped the demo
  account's email + phones but **left the rest of the owner's real identity in place**,
  and it was being **served live** — confirmed by fetching
  `johncnewbury.github.io/Gopher-Marketplace/gopher-request.html` and grepping the
  response. Live at that moment: the owner's real **street address**, **date of birth**,
  **home GPS**, a **family member's name** as the referrer, and an account ID ending
  `-NEWBURY`. _(Values redacted from this file 2026-07-20 — see the correction below.)_
  Now fictional and internally consistent: `100 Demo Way,
  Raleigh, NC 27601` / `01-01-1990` / `35.7796, -78.6382` / `Demo Referrer` /
  `GPH-000001-DEMO`, with the profile city+ZIP fields moved to match. 34 replacements
  across 7 files (`Final/gopher-{connect,request,go,deals}.html`, 2 `_prototypes/`, 1
  handoff doc); verified 1:1 line swaps with quote/brace parity preserved. Included the
  URL-encoded (`%20`) copies inside the Google/Apple/Waze nav deep-links, which a
  plain-text grep misses — **check both encodings when scrubbing an address.**
  **Deleting these files does not unpublish them** — they were pushed to a public repo,
  so the values remain reachable by commit SHA regardless of any later fix.

  **CORRECTION (owner, 2026-07-20) — this entry overstated the exposure.** The street
  address is the **company address** and the `805-` number is the **listed support line**;
  both have been public on gophergo.io for years, and `jnewbury@gophergo.io` is a business
  address. None of those were ever exposures, and the `docs/G40-tickets-export.csv` phone
  entry is therefore **correct as written** — it is a business contact, listed as one.
  The "address + DOB is identity-grade" framing was wrong: it assumed a *residential*
  address without checking. Removing a public company address leaves a date of birth on
  its own, which is weak. Only the **DOB** and the **family member's name** were genuinely
  non-public, and swapping them to demo values was still the right call.

  **How this went wrong is worth more than the fix:** four sessions independently found
  "home address + DOB", each inherited the residential assumption from the last, and the
  repetition read as corroboration. It was one unverified premise counted four times. The
  owner answered it in a sentence when finally asked. **Ask the owner about owner-specific
  facts before escalating on them** — cheaper than any amount of cross-session agreement.

- **App prototypes: the Gopher iQ home pill made real, in both apps (done 2026-07-21,
  commits `3aa1223` / `bb8a3a8` / `6a09f74`).** _(Scope note: this is `_prototypes/`, the
  Go + Request app blueprints — not the `Final/` site.)_ The "Ask Gopher anything…" pill on
  each app's home screen was **decorative**, in two different ways: **Go** — `data-goto="gopher-iq"`
  had no screen behind it, so every tap fell through the router's unknown-key branch and
  toasted _"gopher iq — coming soon"_; **Request** — the sheet opened, but the send handler
  ignored the input and printed a fixed `IQ_ANSWER` string no matter what was typed. Both
  apps *already* had a working iQ on their Help Center screen, so the fix was **not** to
  build a second one: the answering logic is now **hoisted to one shared function per app**
  — `iqAnswerCard()` (Go) / `reqAnswerCard()` (Request) — that the Help Center and the pill
  both call. Three tiers, most-specific first: **coverage brain** (`iqCoverageReply` →
  `GopherIQData`), **curated FAQ search** (confident matches only), **category/pricing intent**
  (`iqTopicReply`). Go gained an `openGopherIQ()` sheet on the app's own modal primitive
  (worker-scoped: Find work near me / Payout Account / Work Settings / Help Center); Request's
  sheet now reads `#iqAsk`, renders **bare** (its `.iq-ans` is already a card — nesting two
  double-framed it), and supports Enter + autofocus. `IQ_ANSWER` survives as the **empty-input**
  prompt, which is what that copy always read like.
  - **Wrong-number bug fixed at the same time (both apps).** The place-extraction regex lists
    **verbs** as location cues, so _"do you have service in Raleigh?"_ matched on `service` and
    captured **"in Raleigh"**. `GopherIQData.lookup()` has no row for that, so it synthesised an
    all-zero one and both apps answered confidently about a market with **232 requests / 188
    Gophers**: Go _"**0** Gopher requests … in **In Raleigh**"_, Request _"We're **not live** in
    **In Raleigh** just yet"_. Same shape turned _"do you serve near me"_ into _"we're not live
    in **Near, ME**"_. Leading **prepositions** are now stripped from the capture; **articles
    deliberately are not** — "The Colony, TX" is a real city `lookup()` indexes by full name.
    **Explicitly NOT gated on `inData`** (the obvious-looking fix, and wrong): `inData` is keyed
    to `workers>0`, so demand-only areas — real requests, no local Gopher yet — report `false`,
    and those are exactly the places the under-20 share-your-QR copy is written for; gating would
    also have cost every out-of-market city its _"not live yet, post anyway"_ answer, which the
    availability training sheet requires. Confined to the two prototypes — the web engine
    (`gopher-ai-engine.js`) uses a different, correct extractor.
  - **"Request history" → "Previous requests" finished off.** The `META` label was **not inert**
    as a previous session recorded — `META` builds `BYID`, which drives the left dev index nav
    *and* the label in the router's "isn't linked yet" toasts. Also caught a stale entry hiding
    among the comments: **`ROUTES.home` is keyed by `norm(element.textContent)` — the VISIBLE
    label** — so its `"request history"` key died the moment the label changed and could never
    match again. Harmless only because the tool row carries `data-goto`, which returns before
    `ROUTES` is consulted; it would have failed silently the day that attribute came off. Plus
    11 genuine code comments. **Left alone on purpose:** the `rh-` CSS prefix (25 classes) and
    the `request-history` screen id / route key / `data-goto` value — identifiers, not copy.
  - Verified: 7 inline script blocks parse clean (JXA — **no `node` on this box**), 0 console
    errors, both pills and both Help Centers driven live through all four answer tiers, quick
    actions, and FAQ tab switching.
  - **Owner-reported follow-up — "Are there requests near me" answered the wrong FAQ, confidently**
    (commit `3df3863`). It returned _"Can I request age-restricted products?"_. **Two independent
    defects.** (1) **Function words were scoring.** `there` wasn't a stop word, so the age FAQ took
    **+3** for `request` in its question **plus +1 for `there` grazing "there's no refund" in its
    ANSWER** — and that stray +1 also satisfied the `n>=2` "covers the query" gate. A pure function
    word decided the match; **35 inert words added**. (2) **"near me" had no answer path at all** —
    `iqCoverageReply()` needs a NAMED place, so the most natural question a worker can ask returned
    `null` and fell through to FAQ keyword roulette; the capture was also grabbing the pronoun `me`
    as if it were a city. Pronoun captures are discarded, and a near-me/nearby/in-my-area cue now
    resolves to the user's own area via **`iqHomePlace()`** (`state.zip` on Go, `PROFILE.zip` on
    Request — prototype-grade; production reads real device location).
  - **Cash FAQ added to the Request app** (commit `4ad791e`, owner request). `REQ_FAQS` had no cash
    entry so cash questions landed on the cost FAQ; added verbatim from the canonical corpus
    (`Final/assets/js/gopher-ai-engine.js`, "Customers"), filed under **Payments**. **Adding it did
    not fix it** — `iqCanon()` folded `cash` into the `pay` bucket, so _"can i pay with cash"_ and
    _"how much does it cost"_ tokenised identically, tied, and the tie fell to array order. `cash`
    now keeps its own token (pay/payout/payment family untouched).
  - **Two over-reaches, both caught on the regression pass, both recorded because the pattern
    matters:** stopping `out`/`over` regressed _"how do i cash out"_ onto the payout-timing FAQ
    ("cash out" is topical, not grammatical) — reverted; and the first `inData` instinct above
    would have broken demand-only areas. **`take` IS stopped** (function verb in "do you take
    cash"). Every stop-word decision here is a per-word judgement call.
  - **Standing caveat for the rebuild:** this matcher is **keyword scoring with hand-tuned stop
    words and thresholds**. Every fix above is a *data-level tune, not a structural one* — a query
    whose words happen to graze an answer can still win. The corpus is **not** provably
    collision-free. A real retrieval layer is the production answer.
  - Regression is now **asserted, not eyeballed**: 16 requester + 16 worker queries each checked
    against its *expected* FAQ question — 0 failures.

- **Request app: "All services" opens the real Step 1 picker (done 2026-07-21, owner request).**
  _(Scope note: `_prototypes/Request/`.)_ The Home **"All services →"** link opened a **rolled-up
  bottom sheet** — a flat text list of 8 category names — instead of the designed category screen.
  It now deep-links to the flow's **Step 1 of 7, "What do you need today?"** (photo tiles, iQ
  category tags, radio checks, Continue). New **`?step=1`** entry point in
  `gopher-request-flow.html`: deliberately **separate from the existing `?demo=1`**, which also
  flips `state.demo` and adds the "no account needed" ribbon + demo-signup CTA — wrong for a
  signed-in requester browsing services. Retired the dead sheet with it (`CATS8`,
  `openAllServices()`, and the orphaned `[data-svc]` row handler; 0 `[data-svc]` elements remain).
  Mirrored into the gitignored `reqpkg/home.html`. Home's own two category tiles still deep-link
  with `?category=` as before.

- **"My GO-To's" — one-tap re-requests, in both web apps + both 101 guides (done 2026-07-21,
  commits `ac0b18f` / `8d418fb`).** _(Scope note: this is `Final/`, the web apps — not
  `_prototypes/`.)_ A **GO-To** is a user-owned **copy of a completed past request**, saved so
  it can be re-sent with one tap. Built into the Previous requests page of **both**
  `gopher-request.html` and `gopher-connect.html`, then documented in both 101 walkthroughs.
  - **What makes it a copy, not a pointer.** It carries **no request ID** — the original stays
    in its bucket untouched (`srcId` is a back-pointer only) and a fresh ID is minted on each
    send. **Duplicates are allowed by design**: one past request can seed several GO-Tos (the
    small order and the big one). Editable before saving: name, type, details, payment, card,
    and which MY Gophers it routes to.
  - **Completed requests only — that restriction is the load-bearing one.** A no-review send
    needs a job that actually worked, at an amount a worker already accepted, which is also why
    **the accepted worker payment carries over** as the default. Cancelled/expired rows get a
    dashed placeholder (All view) or drop the column entirely.
  - **No review screen and no confirmation — that's the whole perk**, and it's why **Save is
    gated on the pre-checked liability waiver plus a payment above $0**: there is no Review step
    left to collect either. A **first-run intro modal** explains the one-tap behaviour before the
    editor opens, with "Do not show me this GO-To intro again".
  - Pills on Previous requests reordered to **All · GO-To's · Completed · Expired · Cancelled**
    (All is new and is the default; the All view interleaves the three buckets newest-first).
  - **Send reuses the existing `__startRequestAgainNow` prefill/submit path** — no second submit
    path, so every gate on the step-6 submit still runs. Nothing here touches matching, pricing,
    or payment logic. **Connect gotcha:** `__startRequestAgainNow` takes an optional 3rd arg
    (`payKey`) applied **after** the prefill's `resetFlowState()` and **before** the submit click
    — setting the card before that call gets silently wiped.
  - **Storage is in-memory only** (`DASH_DATA.goTos`, ids `GT-n`) like the rest of the dashboard
    — saved GO-Tos do not survive a reload. Do not let UI copy imply otherwise (same trap as the
    2026-06 `gopher-request.html` honesty fixes).
  - **Branding: the GO is always the real logo mark, never typed** — `assets/img/go-mark.svg`,
    extracted from the Gopher Go lockup, used inline as `<img class="go-mark">`. Written
    **"GO-To"** / **"GO-To's"** with the hyphen; section header **"My GO-To's"**; button
    **"Request my GO-To NOW ⚡️"**. Sized in `em` so it tracks its text, with a **left-only**
    margin (a right margin floats the hyphen off the lockup).
  - **101 guides (`8d418fb`).** Expanded the existing `#history` section in each — no new TOC
    entries. Fixed what the feature made wrong *and* what was already wrong: Connect listed the
    buckets as "Completed, Cancelled, and Expired" (wrong count **and** order); Request said
    "(Account → **Request History**)", stale twice over — renamed to "Previous requests" back in
    `bb8a3a8`, **and** it's a top-level sidebar item *above* the Account divider, not inside it
    — and listed a "scheduled" bucket that doesn't exist. Also **dropped the "1-Click" label
    from Request Again**: that path goes to Review & submit, so only a GO-To is genuinely one
    tap. Both guides now separate **Request again NOW** (re-sends as-is) from **Request again
    w/ edits** (prefill + MY Gophers picker → Review & submit) — both still exist in the apps.
    Each page got its own `.go-mark` CSS plus `.goto-word{white-space:nowrap}` so the mark and
    its hyphen never break across a line. `gopher-go-101.html` deliberately untouched — worker
    app, no Previous-requests surface (verified, zero matches).
  - Verified in browser: full round trip in both apps (tick → intro → editor → save → card →
    one-tap send → Submitted) and both guides at 1280 + 375 (all marks load, no lockup splits,
    no horizontal overflow), 0 console errors throughout.

- **`gopher-deals-101.html` — built and fully wired (done 2026-07-22).** Merchant-led
  tutorial (Service-Provider callout included), sibling to the other three 101 guides
  (same shell/CSS/scroll-spy, `logo:'merchantDeals'` header, standard footer, SEO block,
  canonical). Owner-directed scope: Deals home audience map ("neighbor eyes") →
  registration → portal tour → featured bidding. **Screenshot-first**: 7 real portal
  captures as `assets/img/deals101-*.webp` (audience map, register modal, dashboard,
  submit-deal w/ live preview, my-deals, inbox w/ new character avatar, bid board) —
  captured via headless Chrome against a scratch serve copy patched with `#shot-<section>`
  / `#mapshot` hooks (hooks were **never committed**; Maps captures need port **8123**,
  the key's localhost allowlist). Placement strip reuses the 4 `deals-bidrot` images —
  their **captions follow the carousel alt sequence, not the filenames** (filenames are
  offset by one; don't "fix" them to match). Wired everywhere the other 101s are:
  `gopher-header.js` Tutorials menu, `gopher-footer.js`, 19 inline-footer pages,
  `gopher-go.html` bespoke menu, `sitemap.xml` (134 URLs), plus a "Deals 101 guide" link
  in the merchant-portal Resources sidebar. Verified: fresh-profile DOM renders the link
  via both shared components, 0 broken images, 0 console errors, no mobile overflow at 375.

- **Invite protocol: owner amendments applied (done 2026-07-23).** Five directives
  from the owner's screenshot review, applied to BOTH portals (gopher-connect +
  gopher-deals) and folded into `docs/handoff/users-access-invite-protocol.md`
  (changelog at the end; the LOCKED decisions are untouched):
  (1) **No name on the invite** — Full-name field removed from the invite modal;
  pending rows show "Name pending — added at their signup" (`namePending` flag) and
  the name+initials fill in from the invitee's own signup/account when marked Active.
  (2) **Site-wide numeric phone standard** — new shared
  **`assets/js/gopher-phone-input.js`** (delegated `focusin`/`input` on every
  `input[type=tel]`: numeric keypad, letters dropped, 10-digit cap, live
  `(XXX) XXX-XXXX`), loaded on the 5 pages with tel fields (connect, deals, go,
  request, tiers) + missing `inputmode`/`maxlength` attrs added to stragglers.
  **Deploy must include it.** Dynamically-created fields (modals/previews) inherit
  automatically — don't add per-field formatters.
  (3) **No route chooser** — the acceptance preview's 4-option picker collapsed to
  3 demo scenarios, labeled demo chrome: production routes automatically off the
  send-time contact lookup (signed-in vs signed-out = one route + session check).
  (4) **Info above Accept** — every route ends on personal info rendered above the
  Accept button (existing account → populated, First/Last/DOB locked "set at
  signup"; new → blank + name typed by the invitee); **Accept invite = the
  save/submit**. The collision (owner's caveat) now triggers DURING registration:
  entering a recognized mobile/email pops "already has a Gopher account" → OTP →
  info populated for review — continue-as, never copy-into, nothing revealed
  pre-OTP.
  (5) **SMS example** — SMS-invite previews open on the message itself (sender
  886-46, exact §3 copy, single-use link + fallback code) before the routed flow.
  The **acceptance-preview simulator is now IN gopher-deals.html too** (1:1 port
  onto USERS/`bizName`/deals role verbs; Manage→"Preview what they'll see" added).
  Verified in browser end-to-end in both portals (all 3 routes, collision popup +
  formatted number, name flow to roster, 0 console errors); all script blocks
  JXA-parse clean.

- **SP-Deals eligibility amended: 20+ SERVICE jobs only (owner, 2026-07-23, commit `391822d`).**
  The 20-completed-jobs bar for Service-Provider Deals eligibility now counts **service-category
  jobs only** — **Delivery / Errand, Ride Sharing, and Other are EXCLUDED from the count**
  (service categories piloted first; counting delivery/ride volume would flood the manual
  deal-review queue). **Owner follow-up same day (commit `bda46ae`): the 4.75★ rating window is
  ALSO service-scoped — measured over the last 20 completed SERVICE jobs**, so Delivery/Ride
  Sharing/Other are excluded from BOTH the 20-job count and the rating window. Tier bar
  (Elite/Elite+/Pro) unchanged. Updated
  everywhere: `gopher-deals.html` FAQ, `gopher-go.html` DLP gate comment + ineligible modal,
  `gopher-go-101.html` eligibility table/caption, 4 handoff docs (2 also corrected from stale
  5.0★), and OUTSIDE the repo: `Canonical Go Flow - Master/gopher-go-canonical.html` (D-022
  amended; copy re-synced to `_prototypes/Go/` — gitignored, disk-only),
  `Gopher-Roles-Capability-Matrix.xlsx` (source of truth, 5 cells + dated A2 note) + both md
  mirrors, GOPHER-INC.html/.md, Gopher-Intended.md, Session-Handoff, both Build-Spec copies,
  Legacy-Naming work order. **Deployed live same day** (deploy `c118c81`, scope-checked: exactly
  the 3 eligibility pages, no riders). Bonus find while re-syncing the canonical: the
  master was MISSING the owner's 2026-07-15 §9.8 no-show/ID revisions (they lived only in the
  `_prototypes/Go/` copy) — merged back into the master, both now identical.
  **HQ Dashboard eligibility logic built to match (Dashboard repo `11c50c0`, owner request):**
  new `regen_sp_eligibility.py` + `sp-eligibility.js` render an SP auto-eligibility section in
  Platforms → Gopher Deal (KPIs, eligible table, near-miss, filtered-by-amendment list) from
  Orders+Users+Ratings under the amended bar. Real-data validation of the amendment: **13**
  auto-eligible on service work vs **88** under the old all-jobs bar — the 75 filtered are
  high-delivery-volume workers. Ratings.csv (rated_id=gopher) is the rating authority, not the
  Orders `GOPHER RATING` column (~25% disagreement, 0 = unrated).

- **"Gopher Marketplace Updates" pptx — 11 owner directives across all 4 portals
  (done 2026-07-23).** Source deck on the owner's Desktop; all applied same day:
  (1) **Manual "+ Add MY Gopher" REMOVED** from Connect (button, add-modal handler,
  and the signup welcome-step "Add MY Gophers now" entry + its listener +
  `__openDashboardGophers` no longer has a caller from signup). The ≥4-star
  post-job rating flow remains the ONLY way a MY Gopher is created — don't
  rebuild a manual add. (2) **Request MY Gophers = Connect format** (canonical):
  section title matched, rating dropped from the card meta line (rating still on
  the Profile modal). Card CSS was already identical (v106). (3) **Connect
  hire-again modal uses the real Step-1 photo tiles** (CAT_PHOTOS assets baked
  into HIRE_AGAIN_CATS; `.hac-chip` restyled photo-card; selection logic
  unchanged). Request's hire-again is deliberately minimal (v107 Decision A) and
  has no category modal — untouched. (4) **Referral modals: 10px gap** between
  stacked share buttons (`.rf-btn-navy + .rf-btn-navy`); **referral ID unified to
  the "Gopher ID"** (owner: assigned at personal-info creation) — one value
  (738105) page + modal, labels now "Your Gopher ID". (5) **Recommend-MY-Gophers
  done-copy**: "recommendations" per owner's exact wording. (6) **Sidebar
  restructure, all portals** (Connect/Request/Deals/Go): top-level Dashboard,
  Previous requests, MY Gophers, Inbox (portal equivalents); Account = Business
  info (C+D+Go), Personal info, Work settings & ratings (Go), Payment info,
  Users & access (C+D), Blocked requestors (Go); NEW "Rewards" divider = Refer
  Gopher (Deals: Feature my business — judgment call); Resources = Ask Gopher iQ
  (renamed everywhere), Visit site, Send feedback (built new for Go: minimal
  gc-modal). ~~Saved addresses nav entries removed from Connect+Request~~
  **CORRECTED same day — owner: "a complete oversight on my part… a VERY
  important feature"; both entries RESTORED below Personal info.** Also owner
  corrections: Go's blocked list is **"Block Requesters"** (spelling canon:
  "Requester" always ends in -er, never "requestor") and sits top-level
  directly under Request history; visible "requestor" copy swept in Go+Request
  UI chrome (the iQ FAQ corpus still has 23 instances ×7 copies — needs its
  sync procedure, flagged as follow-up).
  **Uniform sizing**: brand cards min-height 122px, CTAs min-height 50px + navy
  text on all 4 (Request's CTA was white — hardcoded #002461; note Request's
  `--ink-on-green` is still #fff globally). (7) **Go CTA = "+ Service Provider
  Deal"** (no emoji), DEACTIVATED (no modal) when not auto-eligible, new "Learn
  more" link → the eligibility popup retitled motivating ("Service Provider
  Deals — your work, your offer"; criteria unchanged: Elite/Elite+/Pro · 20+
  service jobs · 4.75★ last-20, Delivery/Ride/Other excluded). (8) **Go Business
  info**: business name EDITABLE (lock removed, joins save-dirty tracking);
  "Show me as a business / individual" segmented toggle (hidden data-field,
  fires input for dirty tracking); Business-logo tile moved out of the docs grid
  up to the Business fields; "Credentials" → **"Become a Pro"** with the pro
  pill. (9) **Age-restricted delivery = its own category card** in Go work
  settings (kept `js-sub` class so existing toggle JS works; `js-subwrap` gone
  for Delivery — the null-guard in syncPanels covers it). App Prototypes session
  pinged to mirror (owner-directed cross-session handoff). (10) **Deals
  dashboard scroll bug FIXED**: the fixed-position dashboard sat over the tall
  landing page and wheel/scrollbar input scrolled the page BEHIND it; body
  scroll now locks on enterDashboard and restores on sign-out/back.
  (11) **Ask Gopher iQ branding**: sidebar items renamed on all portals; the
  assistant pill in Connect+Request carries the Gopher iQ logo
  (`assets/img/shared-scribble.webp` — that file IS the iQ lockup); Deals' Ask
  pane (placeholder) got logo+title; Go's help pane retitled (no pill exists
  there — the app-prototype pills are the App Prototypes session's mirror).
  All four portals JXA-parse clean; verified in browser end-to-end (sidebar
  orders, hire-again photo grid, referral gap=10px, scroll lock on/off,
  Go eligibility both states, feedback modal, biz toggle) with 0 console errors.

### Outstanding to-do

- **4 produced hero clips** still wanted for `gopher-connect.html`: `hero-media/clip-1..4`
  (.mp4, optionally .webm). No longer urgent — the hero plays services b-roll stand-ins
  meanwhile (see 2026-07-15 entry); swap the `<source>`s back when production clips exist.
- **deals@ email wiring (Apps Script) — tabled by owner 2026-07-22.** Two pieces, both via
  the existing Deals registration Apps Script endpoint (`GOPHER_FORM_ENDPOINT` in
  `gopher-deals.html`): (1) welcome email sent **from deals@gophergo.io** on merchant
  registration (the script's account needs deals@ as a Gmail send-as alias; replies then
  return to deals@ automatically); (2) merchant-portal Inbox composer POSTs the message to
  the same script, which emails it to deals@ with **Reply-To = the merchant's email**.
  Script-side edits are owner-actions (no-live-changes rule); front-end wiring + the exact
  Apps Script snippet are ready to build on request.
- ~~`gopher-deals-101.html`~~ — **DONE 2026-07-22** (see the entry below).
- ~~Deals portal "Users & access" section~~ — **DONE 2026-07-22** (owner spec: "exactly
  like gopher-connect", and it is — same table/role matrix/view-as toggle/invite modal/
  manage modals ported 1:1 onto Deals tokens; role verbs adapted to deals; Owner
  protected; ownership transfer to ACTIVE teammates only; signed-in account syncs into
  the Owner row via `enterDashboard`. In-memory demo state like the rest of the portal;
  persistence + real invite delivery = backend seam. `gc-modal*`/`iv-*`/`prev-table`
  CSS primitives now exist in gopher-deals.html — reuse them for future portal modals.)
- **gopher-go worker-dashboard bid board (NOT BUILT YET, owner 2026-07-22).** The
  featured-placement auction UI is coming to the worker dashboard. It MUST render from the
  shared brain **`assets/js/gopher-bid-brain.js`** (same standings, badge rules, and
  own-category lock as the Deals "Feature my business" board) — never re-implement the
  auction logic inline.
- ~~The "verify visually" image rows~~ — **DONE 2026-07-05** (see below).
