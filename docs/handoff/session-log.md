# Session log — Gopher Marketplace cleanup programme

> **Moved out of `CLAUDE.md` on 2026-08-26.** This is the historical record of completed work.
> It used to sit at the bottom of `CLAUDE.md`, which meant ~40,700 tokens of finished history
> loaded into **every request of every session**, forever — about 6% of the weekly usage
> allowance spent re-reading things that were already done.
>
> **Nothing here is a rule.** The live rules are in `CLAUDE.md` and, above it,
> `Dev/gopher-dev-handoff/STANDING-RULES.md`. Read this file when you need the history of a
> specific surface — grep it for the page or feature name — not as a matter of routine.

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
  read `625b0ae` right after the deploy). Verify by **content**: compare
  `git show origin/main:<file>` against the working/`HEAD:Final/` file, then curl the live URL
  and **grep for the changed string** — a 200 only proves the file exists, not that it updated.
  ⚠️ **`git merge-base --is-ancestor <sha> origin/main` is valid ONLY for a DEPLOY sha (a commit
  that lives on `main`). It is INVALID — always false — for a source/feature commit** (corrected
  2026-08-05; the older text here recommended it without that distinction). `main` is a flattened
  rsync lineage sharing no history with the dev branches, so a feature commit is *never* its
  ancestor **no matter how completely its content is live**; asked that way it reports NOT
  DEPLOYED for every change ever shipped. It produced a false "deploy gap", then a false
  *retraction* of a finding that had actually been correct. Also **never suppress the fetch**
  (`git fetch origin main -q 2>/dev/null` hides failures and leaves you reading a stale
  `origin/main` as current) — re-fetch, unsuppressed, immediately before any "is it live?" claim.

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
  - Verified: 7 inline script blocks parse clean (JXA — ⚠️ the parenthetical here originally
    read "**no `node` on this box**", true on 2026-07-21 and **STALE since 2026-07-28**:
    Node **v24.18.0** is installed at `~/bin/node` and on PATH. Don't build a JXA shim
    harness for JS that node can run — that's a workaround with no blocker behind it. JXA
    is still the right tool for a pure syntax parse-check, `new Function(src)` per inline
    `<script>` block, where it needs no `window`/`module` shims and node buys nothing), 0 console
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
  UI chrome. **Follow-on (same day, owner-approved): the FAQ-corpus sweep ran**
  — all 23 corpus instances fixed across ALL 7 inline copies (engine js, index,
  request, services, faqs, 2-engine-block, sandbox; all in q/a text, zero in kw
  fields so iQ matching is unaffected) plus gopher-faqs.html's 13 static
  rendered duplicates. verify-faqs-integrity.py green (184/copy, new common
  hash 68f9929b02, request DRIFT-OK), all copies JXA-parse clean, browser check
  confirms rendered "Requester" + working iQ answers. Identifiers
  (favoritedByRequestor etc.) and code comments deliberately untouched.
  **Standing owner directive recorded to memory: proactively police
  typos/terminology in all user-visible copy — iQ corpus above all.**
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
  **Follow-on corrections (owner, same day):** (a) **iQ branding corrected on
  all 4 platforms** — my first read was wrong: the STYLE GUIDE forbids touching
  the iQ pill itself; the pill is reverted to stock, and instead the PLATFORM
  logo above it is replaced by the iQ lockup (Connect+Request: static
  `shared-scribble.webp` in `#aiLogoSlot`, the JS nav-logo copy removed; Go's
  Ask pane got the lockup; Deals already had it). Rule recorded in the brand
  memory. (b) **Referral links now WORK on Request and Go** — they were inert
  (toast-only on Go, nothing on Request). Connect's refer/recommend modal
  system ported 1:1: Request gets both modals (recommend reads
  `window.__getMyGophers()`; referrals file into its TRACK.pending),
  Go gets the refer modal minus recommend AND minus the "Refer Yourself" tile
  (owner-removed) — **⚠️ the Refer Yourself removal was REVERSED by the owner
  2026-07-27; the tile is back and must stay, see the entry below**;
  submissions land in REFER.pending. Per-portal Gopher IDs
  (614072 / 820083). CSS ported collision-checked (request kept its own
  rc-copy/rf-done-ico/rf-sub; Go already had the gc-modal system).
  (c) **Go got "← Back to main page" above Sign out** (leaves the dashboard,
  keeps the session — mirrors Connect). (d) Age-restricted category card's
  toggle upsized to match the others (`sm` class dropped).
  (e) **Go Business info cleaned up (owner, same day):** the two-button
  business/individual segment (owner: "done poorly") became a single
  activate/deactivate SWITCH — "Showing as a business" card with a live
  "Requesters see ⟨business name | Marcus Hale⟩" sub-line, standard `.sw`
  primitive, feeds the pane's save-dirty tracking. **"Become a Pro" is its own
  pane + sidebar item directly under Business info**, titled with the REAL
  navy/white Pro lockup (`assets/img/tier-pro.svg`; also the nav icon on a
  white chip); the insurance/bonded/license upload tiles moved there with
  their own save-row (`wire('pro')`); Business info keeps name/title/address/
  show-as/logo. Cred-upload wiring now spans both panes (dispatches input on
  the tile's own section). App Prototypes session pinged with all three
  refinements.

- **"Request history" → "Previous requests", all customer-facing copy (owner, 2026-07-24).**
  Owner directive from a Go-sidebar screenshot: no customer-facing surface may say
  "Request history" anywhere. Swept `Final/`: Go portal sidebar label + history-panel
  `<h2>` (the last portal still using the old name — Connect/Request/Deals were already
  renamed); **9 FAQ-corpus answers × all 7 synchronized copies** (all in q/a text, zero
  in `kw` fields — iQ matching unaffected, verified by driving "How can I see my previous
  orders?" live); the 4 static rendered duplicates in `gopher-faqs.html`; 1 sentence in
  `gopher-trustshield.html`; and the iQ pricing-explainer string in request+connect
  ("request history logic" → "historical data"). **The stale "Account →" path was fixed
  in the same stroke** — corpus answers said "Account → Request History" but Previous
  requests is a top-level sidebar item, not under Account (same staleness the 101-guide
  fix corrected). verify-faqs-integrity green (184/copy, new common hash 6f37ef9058,
  request DRIFT-OK); all inline scripts JXA-parse clean; 0 rendered stale refs site-wide.
  **Left alone on purpose:** `rh-` CSS classes, `data-dash-section="history"`, JS/HTML
  comments — identifiers and non-rendered text. **Prototype side NOT touched** (App
  Prototypes turf, session retired): `_prototypes/Request/gopher-request-app.html:280`
  still carries a visible `'Request history'` label in a nav-row array, and the Go
  `-figma` screens + `gopher-go-help-figma.html` FAQ copy still say "Request History" —
  flagged to owner for the successor session (label renames there interact with the
  `ROUTES`-keyed-by-visible-label trap documented 2026-07-21). **CLOSED same day — see
  the next entry.**

- **App Prototypes successor (2026-07-24): prototype-side "Previous requests" rename +
  the SP-Deal Perks component (owner-approved).**
  (1) **Rename DONE** — the 7 relayed surfaces plus 3 unlisted variant twins (the same
  `ACCT_ROWS` label in `gopher-request-prototype`/`FOOTER-FIXED`/`sim_base.upload`), 11
  edits, one count-asserted script. Casing per surrounding style: sentence case in the
  Request app array, title case in the Go `-figma` screens; `gopher-go-help-figma` also
  got the stale "Account →" path fix. **The ROUTES trap does NOT exist in
  `gopher-request-app.html`** — no `ROUTES` object; the label lives in `ACCT_ROWS`
  whose handler only toasts. **Git nuance: 9 of the 10 files are gitignored by design**
  (figma screens + Request variants are disk-only) — commit `08f95c7` carries only the
  tracked `gopher-request-prototype.html`; the rest are disk edits. Identifiers,
  filenames, header comments, internal spec docs, `_stale_pre_upload/` untouched.
  (2) **"+ Service Provider Deal" built into the Go app prototype's home Perks zone**
  (owner directive 7/24 item-2 parenthetical; commits `96100dc` + `1e77f09`; owner
  visually approved 7/24). Third tile after Gopher Rewards/Refer App: ineligible →
  dim + lock, tap opens the motivating criteria popup (Elite/Elite+/Pro · 20+ service
  jobs · 4.75★ last-20, Delivery/Ride/Other excluded) with a demo progress line;
  eligible → **"Offer your service" form ported 1:1 from `Final/gopher-go.html`
  `offerServiceOverlay`** (≤3 keyword chips, pay = earn × 1.10 Deal Boost, 1–50 mi
  reach, same validation order + copy). In-memory `SPDEAL` state; "SP eligible on/off"
  demo chip in the Perks eyebrow; wired via the router's special-case chain (like
  `gopher-iq`) + a `renderSPTile(sr)` hook in `load()`'s home stamp. **Production seams
  commented, not built:** server-side eligibility (Dashboard `regen_sp_eligibility.py`
  = reference impl), eligibility email drafted at
  `Documentation/SMS:Emails/gopher-email-sp-deals-eligible.html` sent via the platform
  dispatcher (`sendEmail.js`/G40-305 — production has **NO Apps Script**, owner 7/24),
  submissions → HQ Dashboard Deals review queue + deals@ email, web-live-on-approval /
  app-on-store-release. Pipeline doc `docs/handoff/sp-deal-pipeline.md` updated to
  BUILT. Verified via JXA (all script blocks parse; money math/dedup/gate smoke-tested)
  — the browser pane cannot render this 2.8 MB file; owner's tunnel eyeball was the
  visual check.
  **CORRECTION (2026-07-26): the browser pane RENDERS `gopher-go-prototype.html` fine.**
  Driven repeatedly since — `load('deals')`, clicking `[data-goto2]`, reading the
  shadow root, measuring layout. Two real constraints got mistaken for "can't render":
  serve a **copy** (TCC blocks the pane from reading the Desktop tree) and **cache-bust
  with `?v=N`** after every edit, or you test stale bytes and chase ghosts. It can also
  report viewport `0x0` — call `resize_window` before measuring anything. Don't skip
  browser verification on this file; JXA parse-checks syntax, not behaviour.

- **Connect Hire-again modal: 4-across grid, uncropped photos, mobile-safe (owner
  screenshot, 2026-07-24).** The category picker was 2-across in a 460px modal with
  photos hard-cropped to a 64px strip. Now: new `gc-modal-hac` class on the hire-again
  dialog only (`gc-modal-wide` still 460px — it's shared by the add-Gophers and
  ra-fast modals, don't widen it) → 780px max-width, 8 cards flow **4-across × 2 rows
  left-to-right**, wider than tall; photos at `aspect-ratio:4/3` (matches the source
  images — zero crop). **Gotcha that cost a round-trip:** `.hac-photo` is a flex item,
  so its automatic `min-height` floors at the image's natural height and silently
  beats `aspect-ratio` — `min-height:0` is REQUIRED on the span or the aspect rule
  is decorative. Mobile (≤700px): back to 2-across at 460px, photos 16:9 (all 8 cards
  + note fit one screen), modal `max-height:calc(100vh-48px)` + `overflow-y:auto` so
  it can never trap content off-screen. Connect-only by owner instruction (Request's
  hire-again deliberately has no category modal — v107 Decision A). Verified at
  desktop + 375: grid, selection→Continue enable, 0 console errors.

- **SP-Deal pipeline: owner decisions recorded + 101 synced (2026-07-24).** Deep-dive
  traced the 7-step Service-Provider-Deal process through the code; owner answered the
  gap list, now spec'd in **`docs/handoff/sp-deal-pipeline.md`** (production build spec):
  eligibility computed in backend (Dashboard `regen_sp_eligibility.py` = reference impl);
  **eligibility notification is automatic — congratulations email from deals@gophergo.io
  built from the existing G40-305 email templates**, CTA + app Perks-section entry
  activate (App Prototypes session adding the app component); in-app deal submission
  lands in **HQ Dashboard → Deals for approval + emails deals@ on every form**; review
  reuses the **existing merchant review process** (no separate SP queue); approval →
  **web goes live immediately** (no store regulation assumed), **apps queue for the next
  store release** and catch up. The deals@ send-wiring (tabled 7/22, below) is now a
  dependency of this pipeline. `gopher-go-101.html` #offer-deals synced to the built UI:
  stale **"Offer My Service →" → "+ Service Provider Deal"** (renamed 7/23 but the 101
  was missed), top-of-sidebar placement, deactivated + "Learn more" framing, plus the
  owner-decided notification promises (deals@ email, app Perks entry, inbox message on
  live).

- **Counter-offer cap base corrected: 150% of the OFFER only (owner, 2026-07-24).** The
  D-026 Standard cap base is the **offer alone — Cost of Items is NOT part of the base**;
  the Jul 6 "grand-total (offer + item cost)" correction is REVERSED (everything else
  stands: $20 floor, 5/month resetting the 1st, must beat the offer, Elite/Elite+/Pro
  unlimited & uncapped, server-side enforcement). With this, the 4.0 cap base now matches
  the live backend (`isCounterOfferValid` = `max($20, 1.5 × order.offer)`, verified in the
  GitLab export). Synced everywhere it was stated: `Canonical Go Flow - Master/
  gopher-go-canonical.html` (5 sites: §9.3 box, live-comparison note, §3 crosswalk row,
  D-026 decisions row ×2 clauses) + the byte-identical `_prototypes/Go/` copy (SHA
  `908551a9…`), `Final/gopher-go-101.html` #counter tip, `Gopher-Roles-Capability-Matrix
  .xlsx` (Decisions A14/B14 + dated Matrix A2 note) + both md mirrors (the Dev-Handoff
  mirror had never received the Jul 6 edit — now standardized to the Jul 24 canon).
  Older prototype-side docs (logic-spec, CARRYOVER, decisions-note) already said
  ≤150%-of-offer — left as-is, now correct. App Prototypes implemented the prototype
  side same day (commit `b0c67e9`, verified by diff): capnote copy fixed + Standard
  ceiling enforced client-side (`Math.max(20, offer*1.5)`, stepper clamp, red rule line
  on overshoot, `coTiered` seam for the uncapped tiers). **Bonus find while verifying the live code:
  the OLD worker app's client-side `counterOfferMaxCheck` computes the limit off
  `cost_of_goods`, not the offer** — disagrees with its own backend both directions
  (claims $20 max on no-items jobs; over-permits on high-item-cost jobs). Legacy-only
  bug, superseded by the rebuild — recorded in memory, not ticketed.
  **`Final/gopher-go-101.html` needs a deploy to go live.**

- **Board Member Demo — Gopher iQ, 6 examples with real screenshots (done 2026-07-24).**
  Mobile-friendly one-page HTML deck showing what iQ does today: market-coverage answers
  (+ the ambiguous-city clarifier), description-driven junk pricing, live Distance-Matrix
  ride pricing, the age-restricted slang gate, a plain-English audience query, and FAQ
  support deflection. Framing per owner: half the screens inset in the site's laptop art
  (`services-laptop.webp` + the exact `.lh-screen` inset percentages from
  gopher-services.html), half in the site's titanium `.phone-case` CSS (the ON-THE-GO
  pattern). All screens are REAL captures of the live prototype (CDP-driven headless
  Chrome at 375×812 / 1480×853 against a scratch serve on port 8123 — the Maps-allowlisted
  port, which is what made the ride example's live routing call work); the audience example
  is real computed numbers in a clearly-labeled HQ-concept frame (the dashboard's ask box
  doesn't run demographic queries yet). **Lives OUTSIDE this repo on purpose** —
  `Documentation/Board Member Demo/` (self-contained folder incl. fonts + regeneration
  sources in `_source/`) — because the audience example carries platform business
  analytics and this repo is public (same rule that moved the research reports to the
  private Dashboard repo on 7/20). Nothing in `Final/` changed; the capture hooks were
  scratch-copy-only and never committed.

- **Tier info corrections — MVR canon fixed (owner, 2026-07-24, commit `ab7322b`, deploy `cd45ce2`).**
  Owner screenshot review of `gopher-tiers.html` + `gopher-go-101.html`. **Canon: MVR (Motor
  Vehicle Record) belongs to Elite+, NOT Elite** — the original AI-generated tiers card had
  listed it under Elite (present as far back as the retired 6/26 site snapshot), and
  `Documentation/Gopher — Intended/Gopher-Deals-Build-Spec.md` D-015 inherited the error
  verbatim while citing the page as its source; the tier-grant emails (Elite = clean criminal
  screen; Elite+ = Elite + clean DMV record) were always correct. Fixed on the tiers page AND
  in the Build-Spec (dated correction note added; the two retired website snapshots outside
  the repo left as archives). Also per owner: **all 3 tiers** now list "Instant payout from
  day 1" (tiers cards + a new go-101 table row; replaces Elite+'s "Stripe Instant Payouts")
  and "Eligible to offer a Gopher Deal"; "Unlimited counter offers" → **"Unlimited counter
  offers w/o cap"** (Elite + Elite+ cards; owner follow-up same day added the line to the
  Pro card too — all 3 cards now carry it, matching go-101 step-5's "unlimited and
  uncapped" incl. Pro); Elite+ lede →
  **"Everything in Elite, plus priority Ride Sharing benefits."** (go-101's "Ride Sharing
  isn't a tier unlock" caption still stands — priority ≠ unlock); Pro copy opened up so **any
  verifiable professional credential provides eligibility** (card lede, section intro,
  pro-apply blurb, go-101 card sub-line + table row, and a 4th "Other verifiable credential"
  checkbox in the application form — no JS reads `credType`, so it's inert-safe). Deployed
  same day, scope-checked (exactly the 2 pages), live-verified by content grep.

- **Category-mismatch nudge was DEAD on gopher-request.html — fixed (owner repro
  2026-07-25, commit `518c92c`, deploy `6b24b2c`, live-verified at runtime).** Owner filed
  "I need someone to help me offload a container truck." under Home/Office Services and got
  no reroute suggestion — on ANY wrong-category example. The decision logic
  (`GopherRequestLogic.detectCategoryMismatch`) was fine — it fires Moving (6 vs 0) on that
  exact sentence — and the page wiring (blur + Continue gates) was fine. **Root cause: the
  request page's inlined iQ engine runs inside an IIFE** (added with its diagnostic-error
  wrapper), so `scoreCategories`/`catWords`/`CAT_THRESH` are IIFE-scoped, NOT globals;
  the module's `resolveClassifier()` global-lexical fallback found nothing and detection
  fail-safed to null — silently, by design. **Fix: the engine IIFE now exports
  `window.GopherCategoryClassifier`** (same shape as `gopher-category-classifier.js`,
  which Connect + the prototype flow load via `<script src>` — both were verified working).
  **Why the harness missed it:** `run_category_tests.py` paths A/B test the standalone
  files, where the functions ARE top-level — the page's IIFE copy was never executed by a
  test. The harness now has **path C** (per-surface wiring assert: request exports the
  classifier, connect + prototype-flow load the file) plus the owner's repro in the matrix
  — 40/40 green. Verified in-browser end-to-end (modal fires on blur, "Switch to Moving"
  rewinds to a moving flow, no repeat modal, guard cases like "moving labor" stay silent)
  and on the LIVE site via console probe. **Trap for engine resyncs:** the export lives
  INSIDE the page's inline engine block — a wholesale resync from `gopher-ai-engine.js`
  would wipe it and path C will catch that; re-add the export after any resync.

- **iQ "Counter potential" — board section 8 shipped, feature spec'd platform-wide (2026-07-26,
  `G40-336` / **D-034**).** _(Scope note: docs + canonical only — **no prototype code changed.**
  The computation is backend/pricing logic, fenced from AI edits.)_ The first **supply-side** iQ
  signal: when a requester's offer is materially below **that requester's own** average accepted
  amount, the worker's available-request card carries one pill (`iQ · Counter potential`) and job
  detail carries the read + a suggested counter. Owner decisions this session: **band, never an
  exact average or job count**; suggestion **clamps silently** to the D-026 cap and the cap is
  **never named in the UI** (naming it makes the pill a tier upsell); repeat-customer stays a quiet
  stats-line mark, not a badge.
  - **Board deck: section 8 built into `Documentation/Board Member Demo/gopher-iq-board-demo.html`.**
    That file is the **source of truth** — the 1 MB `-single.html` is **generated** by
    `_source/build.py`; edit the source and rebuild, never hand-patch the single file. Both phone
    screens are **live HTML, not screenshots** (the mock was already pure HTML/CSS), so all CSS is
    scoped under a `.s8` class that exists on that one section — `--green-dark` is declared **on
    `.s8`, not `:root`**, and `.s8 .phone-case` / `.s8 .phone-cap` override the deck's shared
    values on specificity. Verified: sections 1–7 unchanged (deck phones still 250 px, `:root`
    `--green-dark` unset), 0 horizontal overflow at 375. Section 8 uses the deck's **72vw** factor,
    not the mock's 84vw — 84vw overflows the `.ex` padding at 375. It is the deck's only
    non-screenshot section and carries a `CONCEPT` ribbon saying so; the closing card gained a
    two-sided-marketplace clause. Also fixed a latent bug in `build.py`: the `--review` stamp
    replacement was pinned to `07/24/2026` and had been silently no-op'ing — now a dated regex that
    **hard-fails** if it can't match.
  - **⚠️ Three figures in the 7/25 draft did not survive verification** and were corrected in the
    deck, the mock, and the ticket. Recomputed from `Dashboard/data/master/Orders.csv` (62,528
    orders, 2018-10-16 → 2026-07-25): completed = **20,366** (`AASM='delivered'`), *not* 15,330
    (which reconciles to nothing, even excluding the owner's own accounts: 17,293 / 17,017);
    requesters with 3+ prior completed = **70.8%**, not 82%; fire rate = **1 in 31**, not 1 in 13.
    The 1-in-13 came from averaging a requester's **whole history including orders placed after the
    one being scored** — reproducing that leaky method gives ~1 in 18, and **it cannot be
    implemented at all**, because at runtime the future does not exist. Verified unchanged: **6,020
    counters = 9.6%** of all orders. Median gap **$3.75**. **Lesson: a stat that survived a session
    handoff is not a verified stat — recompute before it enters a canonical doc or a board deck.**
  - **Two hazards found while spec'ing, both real, neither obvious.** (1) **`TOP PAY` already
    exists on the same card** and fires off `offerBand === 'generous'` against the **platform**
    suggested-offer model, while Counter potential scores against **this requester's own** history —
    so the two can disagree on one card, and a card claiming both "pays unusually well" and "money
    left on the table" destroys trust in both. **Mutually exclusive; TOP PAY wins.** (2) **The
    baseline feeds on its own output** — it averages *accepted* amounts, and a successful counter
    raises the accepted amount, so every counter the feature causes widens the next gap. Already
    measurable: countered completed orders settle at **$20.00 median / $27.29 mean** vs **$15.00 /
    $24.69**. Fix is free (`COUNTER INVOLVED='Y'` already exists as a flag): exclude counter-driven
    accepts; fire rate moves 1 in 31 → 1 in 34.
  - **Blocker for the segmented baseline: the order has no category field.** The spec wants a
    per-category norm (a junk-removal average must not set the bar for a handyman job), but `TITLE`
    is a canned category string on delivery orders and **free text** on service ones (3,589 distinct
    values across 9,451 orders). Per-category baselines **cannot be computed from the current
    export**, so every figure above is unsegmented. Production needs a real `category_id`. **The one
    open item that would make the feature wrong rather than merely coarse.**
  - **New invariant `INV-CPRIVACY`** — a worker never sees a requester's precise payment history;
    band only, from ≥3 completed jobs, never a job count, and **the band must not be invertible**
    (band + sample size leaks the mean). Same principle as `INV-RATING`, different field. This is a
    **counterparty** read, which did not fit the existing iQ rungs (Rung 2 is scoped to "the user's
    **own** data") — so `Gopher-iQ-Scoping.md` gained **Rung 2b — counterparty aggregate**, and any
    future feature that shows one user something computed from another user's behaviour inherits it.
  - **Documented in:** `docs/handoff/G40-336-counter-potential-worker-signal.md` (the spec — trigger
    math, cold start, precompute/fail-silent build shape, 10 acceptance tests); **Go canonical**
    §2 / §9.2 / §9.3 / §11 (D-034) / §13, with the byte-identical `_prototypes/Go/` copy re-synced
    (was `908551a9…`, the SHA CLAUDE.md recorded 7/24 — confirmed in sync before editing);
    **Request canonical** `connect-flows-granular.html` **v3.10** (both byte-identical copies);
    `Gopher-iQ-Scoping.md`; `Gopher-Worker-Flow-Build-Spec.md` §4.1 + §4.2; the **capability matrix
    workbook** (Decisions & Gaps A23/B23 + dated Matrix A2 note, `.bak-20260726` written first) and
    **both** md mirrors. `Documentation/Board Member Demo/iq-worker-card-mock.html`'s three "YOUR
    CALL" rows became `DECIDED 7/26` + a `CORRECTED 7/26` row.
  - **Deliberately NOT documented in two places, both judgement calls.** (a) **The RFP** — this would
    price under SOW **bucket B (Worker flow)**, but the bid documents are out with vendors and adding
    a feature changes what they're pricing; flagged for the owner instead. (b) **`gopher-go-101.html`**
    — the 101 guides describe what the app *does*, and this does not exist yet; documenting an
    unbuilt feature in a user-facing guide would be a false promise. Add it the day it ships.
  - **Numbering wart found, not fixed:** the capability-matrix decision ledger and the Go canonical's
    have **diverged** (matrix D-029 = age-restricted quick-signup identity, Go D-029 = Deals fee
    logic; matrix D-033 = ITF/discounts, Go D-033 = TrustShield Request-side). **D-034 was the next
    free number in both**, so it means the same decision in both — but the earlier overlap is
    unreconciled and will bite anyone citing a mid-20s D-number without saying which ledger.

- **App prototypes are now SERVED from the live site (owner 7/26, deploy `c989c66`).** The deploy
  used to ship `Final/` only, so the prototypes lived on tunnel links that churn. They now have a
  permanent URL: **`/Gopher-Marketplace/_prototypes/split-screen.html`** (plus
  `_prototypes/Go/gopher-go-prototype.html`, `_prototypes/Request/gopher-request-flow.html?step=1`).
  Two things about how, both load-bearing:
  (1) **`scripts/deploy.sh` ships an ALLOWLIST (`PROTO[]`, 11 files), never the folder.**
  `_prototypes/` is 186 files / 34 MB and mostly **internal** — the canonical flow doc (business
  decisions, fee tables, the unreleased D-034 spec), build briefs, session handoffs, backend wiring
  checklists, Stripe payout guardrails. `rsync _prototypes/` would undo the 2026-07-17 internal-docs
  removal in one command. The list came from crawling the 4 entry points for href/src **and JS string
  literals** — 4 screens (deals/inbox/inprogress/refer) are reachable only from JS and a static crawl
  misses them. A post-stage check aborts if anything unlisted reaches the worktree; verified live that
  the canonical doc, build briefs and handoffs all **404**.
  (2) **The `../../Final/` layout trap.** In the repo `_prototypes/` and `Final/` are siblings, so the
  phones load shared modules as `../../Final/assets/js/…`. The deploy **flattens** `Final/` to the site
  root, so no `Final/` dir exists on `main` and every one of those 404s — and `gopher-iq-data.js` fails
  **silently**, degrading coverage/FAQ answers with nothing on screen. Shipped copies are rewritten
  `../../Final/` → `../../`; **the source keeps its repo-layout paths**, which is what the local serve
  and the tunnel need — do not "fix" them in the source. The leftover-reference guard matches
  attribute values and quoted literals only, because these files also *discuss* `Final/…` paths in
  comments (a substring grep flagged 5 files of pure prose).
  `noindex` is a **meta tag, not robots.txt** — robots.txt is only honoured at the DOMAIN root and this
  site is served from `/Gopher-Marketplace/`, so the existing one is inert here. Prototypes stay out of
  `sitemap.xml`. Live-verified: iQ brain loads through the rewritten path (`lookup('Raleigh')` → 188
  workers), noindex present, 0 console errors.

- **Request app: Help Center + 101 guide matched to the Go format (owner screenshots 7/26, `9ec098e`).**
  Both were **structural**, not styling — the Request shell CSS already matched Go's values exactly.
  (1) `gPage()` mounted at `inset:0` on `#phone`, **covering the 34px `.status-bar`**, so the back
  chevron and title rendered at the top of the device and collided with the notch. Go builds these as
  real screens (`<div class="frame">${SBAR}<div class="hcbody">`) with the status bar visible. `gPage`
  now anchors below `.status-bar`, measured from the element — fixes **all three** shell screens
  (Help Center, FAQs, Contact Us). (2) The 101 overlay drew a navy `‹ Back  Gopher Request 101` top
  bar **that exists on neither app**. Go's `showGuide()` is a full-bleed iframe whose embedded doc
  injects a floating `#appBack` pill bottom-left plus two repositions so the pill owns that corner
  (`.sections-fab` → right, `.totop` → `bottom:78px`). Request now renders identically, but the Back
  pill is owned by the **overlay** (`absolute`, not Go's `fixed` — the overlay is already `inset:0` of
  `#phone`, and `fixed` resolves against the viewport inside the split-screen); only the FAB reposition
  is injected into the doc, so if that cross-document access ever fails Back still works. Injected
  rather than forking the doc, so `Final/gopher-request-101.html` stays the single source.
  **Deliberately NOT copied: Go's red "NEW" corner ribbon** (`.rib`) — prototype-status dev chrome
  marking newly-designed screens, not product UI. No variant twins carry this code
  (`reqpkg/home.html` is still the stale pre-shared-brain bundle — left alone).

- **Spelling canon finished off in the legal pages (owner 7/26, commit `501deac`, deploy
  `2364e5d`, live-verified).** The 7/23 "Requestor"→"Requester" sweep had covered the FAQ
  corpus + UI chrome but **never reached the legal documents**. 57 occurrences fixed across
  `gopher-terms-of-service.html` (**55** — including the defining clause `("Requestors")` →
  `("Requesters")`), `gopher-merchant-agreement.html` (1, the definitions clause), and
  `gopher-trustshield.html` (1, body prose). **All 57 were the capitalized `Requestor`** — a
  single variant, so both contracts are internally consistent with no mixed usage left.
  Change is **orthographic only**: same word, same defined party, no change to meaning,
  rights, or obligations — which is why it was safe to do without counsel review.
  **Method worth reusing:** before rewriting, every occurrence was position-checked against
  masked regions (HTML tags / HTML comments) to prove all 57 were rendered prose — 0 in
  markup. The follow-up site-wide sweep needs `<script>` and `<style>` **contents** masked
  too, not just tags: a first pass without that flagged 25 false positives (JS `//` comments
  plus the `favoritedByRequestor` identifier in request/connect/go). Correctly masked, **0
  rendered `requestor` remains in `Final/`**. Identifiers and comments stay untouched by
  standing rule. Also fixed 2 prose instances in the staged
  `Documentation/Gopher Rewards/gopher-rewards-terms-of-service.html` (disk-only, outside
  any repo — not yet shipped, so this prevents the violation going live). **NOT fixed:**
  `Dashboard/regen_user_trends.py:325` emits a `<th>Requestor</th>` header into the research
  page — internal HQ analytics in a private repo, so **not customer-facing** and outside the
  owner's stated condition; the fix belongs in the generator (the pipeline overwrites the
  HTML), and it's flagged for the Dashboard session rather than done here.

- **TigerTech FTPS deploy FIXED (owner-authorized 7/26, commit `3c2e9d2`).** `.nojekyll`
  (+ `**/.nojekyll`) added to the action's `exclude:` in
  `.github/workflows/deploy-tigertech.yml` on `main`. The action had gone green exactly
  **twice** (both 07-23) out of 40 runs and failed all 8 since — so TigerTech had received
  nothing since 07-23 while Pages kept updating. Cause was the already-diagnosed one:
  `.nojekyll` is 0 bytes, FTP-Deploy-Action aborts the whole upload on empty files with an
  opaque `tlsv1 alert decode error … SSL alert number 50`, and `**/.git*` never matched it.
  It must STAY on `main` (Pages' Jekyll silently 404s underscore files without it) and is
  inert on Apache, hence exclude-not-delete. Test push went green: **1362 files, 0 errors**,
  clearing the whole backlog; confirmed on the server that the 7/24 tier fixes, the 7/26
  Requester rename, and the 7/25 classifier export are all present. **A push to `main` now
  really does publish to TigerTech** — re-verified on the very next deploy (`725b456`).
  **Where it lands:** `server-dir: preview/` = **`https://gophergo.io.customers.tigertech.net/preview/`**.
  It is **NOT** at `https://gophergo.io/preview/` (that 200s but WordPress redirects to the
  homepage), so the FTPS deploy does **not** touch the public gophergo.io docroot. **Trap:**
  `exclude:` is a YAML **literal block scalar** — every line is a glob pattern, NOT a comment;
  `#` lines inside it silently become junk patterns, so explanatory comments go ABOVE the key.
  If `SSL alert number 50` returns, look for a NEW 0-byte file:
  `git ls-tree -r -l origin/main | awk '$4=="0"'`. **Consequence: every `main` push now
  publishes to two places — scope-check the deploy accordingly.**

- **Go work settings: vehicle photos gate the save BEFORE the OTP (owner 7/26, commit
  `f3e0554`, deploy `725b456`, live-verified).** Owner rule: when a Gopher turns **Ride
  Sharing** on in *Work settings & radius*, the **front (head-on) and rear (plate visible)**
  photos must be submitted to save — and the check must run **before a code is requested**.
  It didn't: `wire('work')` had **no `resolveVerify`**, so Save went straight to
  `openConfirm()` and a worker could sit on two "Update needed" tiles, receive an OTP, verify
  it, and only then find the save incomplete. Now `wire('work')` supplies `resolveVerify`,
  which runs **`ridePhotoGate()`** first and **returns without calling `openConfirm`** when a
  photo is outstanding. The gate reads each tile's own hidden `data-field` — the same value
  the save serializes — so it can't drift from what gets submitted: `onfile`/`updated` =
  satisfied, `need` (or anything else) blocks. **Owner-confirmed 7/26: "On file" counts as
  satisfied — settled, don't tighten it.** A Gopher whose photos are on file and whose
  vehicle details are unchanged saves without re-uploading; the block fires when a vehicle
  detail changes (tiles flip to "Update needed") or a photo was never submitted. Requiring
  fresh photos on every Ride Sharing enable was explicitly considered and declined. **Ride Sharing OFF is always satisfied** — no
  vehicle to evidence, so unrelated category/radius edits are never held up by a stale photo
  flag. The requirement is also surfaced in the save row *before* the click, since a blocked
  Save with no forewarning reads as a broken button. Verified in-browser on all three paths
  (ride ON + outstanding → 0 modals/no code/stays unsaved; ride ON + submitted → "Confirm
  it's you" opens; ride OFF + outstanding → not gated), 0 console errors, all 7 inline
  scripts JXA-parse clean.
  **NO PROTOTYPE MIRROR — verified by App Prototypes 7/26 (`a79440e`), do not build one.**
  I flagged this for mirroring on a hedged premise ("same shape likely exists there"); the
  premise was wrong and the defect is **structurally impossible** in
  `_prototypes/Go/gopher-go-prototype.html`: that screen's work-settings save **requests no
  OTP at all** (`save.onclick` persists then `GO('payout')` — zero otp/"Send code" markers),
  so there is no late `openConfirm` to reorder. Porting `resolveVerify`/`openConfirm` would
  **import an OTP step the flow doesn't have**. Its gate is also already *stricter* —
  `rideComplete()` requires both photos **plus registration + insurance + every vehicle
  field**, `curCats()` drops Ride Sharing from saved categories unless it passes, and a
  second gate blocks at accept time. The "On file counts" clause has no equivalent either:
  the prototype has no `onfile`/`updated`/`need` tri-state, just in-memory
  `state.ridePhotos={front:false,rear:false}`.
  **↔ REVERSE GAP, on the WEB side, still open:** `ridePhotoGate()` checks the two `.vphoto`
  tiles **only**, so registration, insurance, and the vehicle text fields do **not** block
  the web save. Confirmed at source: the "Submit registration" / "Submit insurance" tiles
  (`gopher-go.html:2738-2739`) carry **no `data-cred`, no `data-field`, no hidden input** —
  unlike the Business-info credential tiles — so they are **inert decorations** that hold no
  state and cannot be gated on without first being wired up. Vehicle fields serialize but
  have no empty/required check. This matched the owner's original rule exactly ("front and
  back of the car"), so widening it was an **owner decision, not a bug** — raised 7/26.
  **→ OWNER RULED 7/26: "all ride fields need to be submitted to pass." CLOSED** (commit
  `335bf2e`, deploy `f3424c1`, live on Pages + TigerTech). The web now matches the
  prototype's stricter bar. **The two doc tiles had to be BUILT before they could be
  required** — they were inert markup, so they now carry `.vdoc` + `data-vdoc` + a
  `.vp-state` label + the hidden `data-field`, i.e. the same `onfile|updated|need`
  contract as the photos, plus the same click-to-upload (docs also accept
  `application/pdf`). Registration/insurance are **per-vehicle**, so a change to any
  vehicle detail flips them to "Update needed" alongside the photos. `ridePhotoGate()`
  now requires **all four tiles satisfied AND every vehicle field non-blank**;
  `rideGateMsg()` names what's actually outstanding rather than a generic "incomplete";
  blank fields get `.field-missing` (amber); tile CSS is now shared by `.vphoto, .vdoc`
  instead of duplicated. Ride Sharing OFF still passes trivially, the gate still runs in
  `resolveVerify` **before** `openConfirm`, and **"On file" still counts as satisfied**.
  Verified in-browser on 4 cases (detail changed → all 4 tiles need + no code; tiles OK +
  blank field → blocked + field highlighted; all satisfied → verify modal opens; ride OFF
  + everything outstanding → not gated), 0 console errors.
  **RESOLVED same day (App Prototypes): no mirror needed, and do NOT port this fix.** The
  prototype's work-settings save **requests no OTP at all** (zero `otp`/`Send code` markers in
  that screen; `save.onclick` persists and goes straight to `payout`), so the ordering defect
  cannot exist there — there is no `openConfirm` to run late. Its gate is also **stricter than
  the web's**: `rideComplete()` requires `fields && ph && dc` — both photos **plus** registration
  + insurance **plus** every vehicle field — and `curCats()` additionally drops Ride Sharing from
  the saved categories unless it passes, with a second gate at accept time. Porting
  `resolveVerify`/`openConfirm` here would **import an OTP step this flow doesn't have**.
  ⚠️ The live gap runs the other way: **the web checks the two photo tiles only**, so documents
  and vehicle fields do not block its save. If they should, that is a `Final/gopher-go.html`
  change and is unowned — App Prototypes did not touch the web build.

- **"Refer Yourself" restored to `gopher-go.html` — the 7/23 removal is REVERSED (owner
  7/27, commit `f6c8730`, deploy `6ab8ef0`, live on Pages + TigerTech).** Owner reported the
  tile missing from the Refer Gopher pane. It had been deleted in `978b897` (7/23) and
  recorded here as "(owner-removed)" — that note is now wrong and has been marked at its
  source, because **it is canonical Go functionality, not a nice-to-have**: `refer-self` /
  **G40-135** in the Go canonical doc, built in the Go app prototype
  (`rs-tile data-rk="self"`), and wired through `_prototypes/split-screen.html`, where a
  Refer-Yourself referral stamps `__ptReferral` and lands in the **requester's inbox** with an
  "★ Add ⟨Gopher⟩ to MY Gophers" option. **Do not remove it again.**
  - Tile restored **first** in `.refer-grid` with the exact copy/icon `978b897` deleted
    (⭐ "Refer Yourself" / "Share your code so new customers add you as their saved Gopher.").
    Four tiles now form a clean **2×2** — the grid was already `1fr 1fr` (single column
    ≤700px), so **no CSS change was needed**.
  - **`REFER_COPY.self` added.** Without it `openReferModal` falls back to `REFER_COPY.go`
    (`const c = REFER_COPY[kind] || REFER_COPY.go`) — the tile would have opened silently
    branded "Refer Gopher Go", which looks like it works. Any new `data-rk` needs a matching
    `REFER_COPY` key or it fails this way rather than erroring.
  - **The distinction the copy has to carry:** the other three tiles invite someone to a
    *platform*; this one shares the Gopher's **own** code so a customer saves them as a MY
    Gopher. Sub-copy follows the prototype's wording.
  - Verified in browser: 2×2 grid, modal copy per kind, full SMS round trip (share → add
    contact → submit) filing into Referral tracking, other three tiles unchanged, 0 console
    errors; all 7 inline scripts JXA-parse clean. **Two pane traps hit again, both documented:**
    `resize_window` first (viewport reported 86px-wide and the grid read as single-column), and
    `.dash-section` activates on **`.active`**, not `.on`.

- **Referral engines audited across all four portals (owner 7/27, commits `e7fb372` + `61ca239`,
  deploys `9331fdd` + `5995288`, live on Pages + TigerTech).** Triggered by the Refer Yourself
  restore; the two rendering bugs found were **pre-existing from the 7/23 1:1 modal port**, not
  caused by it.
  - **⚠️ `[hidden]` IS NOT SAFE ON THESE PAGES.** `.rf-view` sets `display:flex`, which beats the
    browser's default `[hidden]` rule — so all three refer views (home/entry/done) rendered
    **stacked at once** on Go and Request. **`gopher-connect.html` is the only portal carrying a
    global `[hidden]{display:none!important}`** (line ~83), which is why Connect looked fine and
    the other two didn't. Fixed with a targeted `.rf-view[hidden]{display:none}` on each rather
    than importing the global rule — a runtime audit found `.rf-view` was the *only* affected
    selector on Go (27 hidden els, 2 broken). **Any new `display:`-styled element that also uses
    the `hidden` attribute needs its own `[hidden]` guard on Go/Request/Deals.**
  - **`.gc-modal-btn-text` was entirely absent from `gopher-go.html`** — the 7/23 port brought the
    markup but not the rule, so both text buttons in Go's refer modal rendered as raw browser
    buttons (grey bordered bars). Ported the base rule + `:hover` from Connect; skipped the
    `.ec-danger`/`.pe-modal` variants (Go has neither).
  - **Copy parity fixes:** Go's pending header `Referred Info` → **`Referral Info`** (Connect and
    Request both used the latter); Request's Refer-Gopher-Connect CTA `Share the app →` →
    **`Refer a business →`** (matching Connect, which is canonical for the shared component).
  - **Verified clean:** every tile/card on all three engines opens with its own brand/title/sub —
    **no silent `REFER_COPY` fallback** (the lookup is `REFER_COPY[kind] || REFER_COPY.go`, so a
    missing key mis-brands rather than erroring — add a key for any new `data-rk`); Gopher ID
    consistent page vs modal per portal (Connect **738105** / Request **614072** / Go **820083**);
    full share→entry→submit→tracking round trip on all three; tab labels and added/pending column
    sets match. ~~**Deals has no refer engine by design** (Rewards = "Feature my business")~~ **⚠️ REVERSED by the owner 2026-08-18** — the Deals dashboard "should not have anything different than the other 3"; a Refer Gopher section (spec shape: headline platform-invite QR, ID once in the navy bar, gated sends, other-three card grid) is assigned to Website Updates. "Feature my business" stays alongside it; its
    `820083` is a deliberate worked example in a tooltip pointing merchants at their ID in the Go
    app — not a stray, don't "fix" it.
  - **Left as owner decisions, not silently changed:** Go's active-table header **"App Used"** vs
    "Type" elsewhere (Go's data genuinely holds app names, so its header is the *more* accurate
    one); **date format differs across portals** (Connect `7/27/26`, Request+Go `7.27.26`) but each
    is internally consistent including seed rows; Go's tiles carry no CTA line because they are a
    different component (`.refer-tile` vs `.refer-card`).
  - **Adjacent finding — 4 more broken `[hidden]` elements on `gopher-request.html` outside the
    referral engine. CLOSED same day** (owner approved, commit `68fbde9`, deploy `2a6a66d`, live
    on Pages + TigerTech). `#osJunkTiers` (junk volume-tier selector, would render for non-junk
    categories), `#idSubFrontThumb` + `#idSubSelfieThumb` (ID capture previews, would render empty
    before capture) — those three **latent**, inside closed modals — plus **`#progressCat`, the
    only one leaking visibly** (an empty green pill, 20×8px at load). Three guards added
    (`.os-junk-tiers[hidden]`, `.idsub-thumb[hidden]`, `.progress-meta-cat[hidden]`). **Safe
    because all four toggle the `hidden` ATTRIBUTE only** (`el.hidden = true/false`, both
    branches, no inline `style.display`) — verified **both directions** per element (hidden →
    `none`, `hidden=false` → `flex`), so nothing that should appear is now suppressed.
    ⚠️ **Not exercised end-to-end:** the multi-step paths that actually reveal the junk tiers and
    the ID previews — the guard only affects the hidden state and the show path is `hidden=false`,
    which was tested directly.
  - **Whole-site `[hidden]` sweep now clean at load:** connect 89 / request 73 / go 26 / deals 40
    hidden elements, **0 broken on each**. Audit is of the **loaded state** — elements built later
    or only in other states aren't covered, so re-run the audit after adding modal markup.
  - **Method note:** two verification passes in a row measured the wrong thing — first asserting
    `el.hidden` (the DOM property, correct all along) instead of `getComputedStyle().display`, then
    "testing" Connect's cards without noticing the overlay never opened because its handlers attach
    only inside `openDashboard()`. **For modal work, assert computed style AND that the overlay
    actually opened.** Connect/Request dashboards must be entered via `__openDashboardGophers()` /
    `openRequestDashboard()`; Go's handlers bind at load.

- **Request hires ONE worker, always — multi-individual is CONNECT-ONLY (owner 7/27, commit
  `0dbdf41`).** Owner found `Final/gopher-request.html` letting a requester **individually hire
  >1 worker**. Canon: a Request job needing a crew means selecting **ONE lead worker who is
  responsible for bringing/paying the rest**. **Matches live production — the live app was NOT
  changed.**
  - **Root cause:** Connect has the `laborManagement` radio (`individually` | `one-hires`,
    default `individually`, 7 refs). **Request has ZERO refs** — yet it set
    `multiIndividual: needed > 1` unconditionally, so Request silently behaved as Connect's
    `individually` default whenever >1 worker was requested ("Hire Approved 0 of 3" + a cap that
    allowed 3 hires).
  - **Fix:** `multiIndividual` permanently `false` (incl. the seeded 3-worker demo request, which
    was demonstrating the wrong behavior); **all five** hire-count comparisons (hire-cap,
    `fullyHired`/section counts, both start-encourage paths, incomplete-crew) now use `1`.
    **⚠️ `r.workersNeeded` is UNCHANGED and must stay so — it is the CREW SIZE and still drives
    pricing/totals/labels, not the hire count.** That separation is documented in-code once as
    **`REQUEST HIRE RULE`**. Step-3 copy de-pluralized; new lead-worker note under "# of workers
    needed"; hire-cap modal rewritten (it read "you've already approved all 1 worker this request
    needs" — nonsense on a 3-worker job).
  - **Canon was NOT clear — corrected in both places** (owner suspected this and was right). The
    flow doc documented the Connect-only radio but **never stated what Request does** when >1
    worker, and "default `individually`" invites the wrong reading. Only the *Bids when >1 worker*
    row implied it ("a single hire responsible for paying the whole crew").
    **`connect-flows-granular.html`** gained a divergence row **"Individually hiring >1 worker"**
    (Connect yes / Request never) and the `laborManagement` glossary row now says Request has **no**
    equivalent and is always `one-hires` — *do not read Request as inheriting the `individually`
    default*. Both byte-identical copies updated (Master + `Dev-Handoff-FeeModel`), `.bak-20260727`
    saved. **Capability matrix B14/D14**: "Labor management / multi-worker | —" was ambiguous
    (readable as "Request can't have multi-worker jobs at all", which is **wrong** — Request CAN set
    a crew size) → **"Labor management — individually hire >1 worker"** with Customer
    **"— one lead worker"**; xlsx + both md mirrors + dated A2 note.
  - Verified in browser: the 3-worker request renders the single-hire path, first hire lands as
    "Hired 1", second is blocked by the corrected modal, Step 3 stays singular at 1 and 3 workers
    while the note pluralizes. **`gopher-connect.html` untouched**, still carries `laborManagement`
    + `multiIndividual`. 17 scripts parse clean, 0 console errors.
  - **⏳ DEPLOY HELD** at time of writing: `scripts/deploy.sh` preflight blocked on an uncommitted
    **allowlisted** prototype file (`_prototypes/Request/gopher-request-flow.html`) — the App
    Prototypes session mirroring this same rule. Not committed by this session and **not** forced
    with `--allow-dirty` (that is the 2026-07-19 incident the guard exists to prevent). Owner
    authorized shipping as soon as they commit.

- **Flow-comparison doc set for the incoming dev partner (done 2026-08-01).** _(Scope note:
  all three files live OUTSIDE this repo in `Documentation/Canonical Request Flow - Master /`
  — note the trailing space in the folder name.)_ Owner asked for a documented comparison of
  the new canonical request flow vs the LIVE production app flow. Built two new docs alongside
  the canonical:
  (1) **`production-request-flow-granular.html`** — the "complete and complex" as-built doc,
  reusing the canonical doc's exact interactive shell (category tabs → step cards → clickable
  logic boxes) so they read as siblings, plus a **⚙ Server lifecycle** tab and 14 reference
  sections (fees, Stripe money flow, states, matching, counters, cancellation, favorites,
  quirks, provenance). Traced from **clean `origin/production` worktrees** (requester-web-app
  `e0a56bb3b`, gopher-api `e9fda50f`) — never from `main`/work branches; worktrees removed
  after. Every load-bearing constant was re-verified verbatim in source.
  (2) **`flow-comparison.html`** — the high-level side-by-side (grouped table + "eight things
  that most change the ground under the rebuild" strip), linking both granular docs.
  **Owner directive same day: a leftmost REUSE/ADAPT/NEW verdict column** was added to every
  row so the dev knows where live code carries — headline example **"Stripe is NOT being
  reintegrated"** (the PI auth/capture/transfer/payout chain, connected accounts, re-auth
  crons and payout-speed rule carry as-is). Verdict census: 10 REUSE / 5 ADAPT / 4 NET-NEW;
  the legend restates the standing rule (live logic that works carries; prototype≠live ⇒ the
  prototype is the bug). Other REUSE anchors: `cal_amounts` + fee constants (= the Request
  schedule), `isCounterOfferValid`, the claim/approval endpoints + processing lock, iDenfy,
  the scheduling/expiry/re-auth crons, and the post-submit states (formalize, don't rename).
  **Same-day follow-ons (owner directives):**
  (a) **The GO (worker) doc pair** — `Canonical Go Flow - Master/production-go-flow-granular.html`
  + `go-flow-comparison.html` (6 REUSE / 9 ADAPT / 3 NET-NEW), traced from gopher-web-app
  `origin/production` `381c37e55` (worktree removed after). Worker-side as-built headlines,
  all line-verified: **the order screen exists TWICE** (`RequestDetailPullOver.js` 13k lines
  for Pro vs `ordercard.js` 12k for non-Pro — a diverged fork; its counter-cap math
  double-divides by 100 so its threshold is ≈always $20); **two client counter caps disagree**
  (one advisory off cost_of_goods with copy claiming "Gopher Earnings", one blocking off
  offer that matches the server); **pre-acceptance privacy is client-side only** (street
  number + requester name stripped in render — the API returns them; G40-91 needs server
  enforcement); **live-tracking root cause confirmed at line level** (truthy redux
  placeholder → `initialize()` TypeError; `emitLocation()` computes and returns — never
  emits); **no notification tap-through exists** (empty push handlers, `AppUrlListener`
  never mounted); sort/offer-limit filters orphaned (UI removed, localStorage keys still
  read); the worker sees the requester's live rating on every card (INV-RATING violation
  to fix in rebuild); a raw Maps key is hardcoded in `ordercard.js` (SEC-1 adjunct).
  (b) **Total-Gopher-Deployment-Priorities.html → v0.2** — new group-3 row for the doc set.
  (c) **New PRIVATE org repo `The-Gopher-Marketplace/gopher-dev-handoff`** (AbsolutOD
  engagement; created via API — no `gh` on this box, token from git credential store).
  Local clone ready at **`All New Gopher/Dev/gopher-dev-handoff`** with all 7 files
  (README + both canonicals + both as-built + both comparisons) in 2 commits. In-session
  `git push` was permission-blocked; **owner pushed it themselves same day — REMOTE VERIFIED
  via API** (main = `f62cdf3`, all 7 files present). The Dev/ clone is the working copy for
  future doc updates: commit there, push goes to the org repo.
  **Key as-built facts now on record** (with file:line refs in the doc): live backend is
  **Node/Express + Sequelize — the Rails app is dead** (`ruby.old.README.md`); NO state
  machine (`aasm_state` is a plain string, ad-hoc updates), NO DB transactions in the order
  flow, broadcast timers are in-process `setTimeout`s; **the live fee schedule IS the
  canonical Request schedule** ($0.99–$4.99 flat + 8% + $1.99 A/R −$1 TrustShield) — full
  continuity, Connect plans are net-new; worker gets 100% of offer+COGS; Stripe = 120%-auth /
  confirm-on-claim / partial-capture; counter cap `max($20, 1.5×offer)` matches D-026's
  formula but has **no tier exemptions/monthly limit live**, bids uncapped, `allow_counter`
  always true (`|| true` bug); **no automatic $5 cancellation fee exists live** (manual admin
  flag only), requester hard-locked after accept; First Available only exists for
  Delivery/Ride/Other; favorites get a 1-second broadcast head start + approval bypass while
  the in-app copy promises "5 minutes"; A/R gating is menu-level + title `indexOf` — **no
  keyword scanning exists live**; missing `appversion` header ⇒ $0 service fee. The requester
  app is one JSON-driven form engine (screen id = JSON filename; schemas contain executable
  expressions); stale-taxonomy trap: `getCategoryTypeSelectionList.json` has zero references,
  the live taxonomy is `request.json` → sub-menu JSONs; the below-average-offer nudge is
  **iOS-only**. Both docs browser-verified (all 9 tabs, click-through panels, 0 console
  errors, no mobile overflow at 375; comparison table wrapped in `.mx-scroll`).
  **Drift + correction pass 2026-08-02** (prompted by an App Prototypes relay; both claims
  re-verified here rather than taken on faith, and both docs carry dated notes now —
  **edit the generators in the session scratchpad, not the HTML**, or a rebuild wipes them):
  (i) **Backend pin is stale, app pins are not.** `gopher-api` `origin/production` is now
  **`98ce5744`** (2026-08-02) vs the `e9fda50f` traced; both app pins (`e0a56bb3b`,
  `381c37e55`) are **still current heads**. Server-side sections are accurate-as-of
  `e9fda50f` and were NOT re-traced — the docs now say exactly that.
  (ii) **Live-tracking mechanism refined — the relay's line cite was real but not the
  operative one.** The unguarded `this.currentOrder.requestor.id` appears **twice** in
  `initialize()`: L31 (inside the `setConfig` argument) and L81 (inside `ready()`).
  **Only L81 fires:** `isInitialized` isn't set true until **L108**, *after* `ready()`, so
  the L81 throw prevents L108 from ever running, `isInitialized` stays `false` forever, and
  the L31 branch is **unreachable while the bug is live**. L31 is a genuine latent defect to
  fix alongside, not the cause. Conclusion unchanged (one throw kills the native autoSync
  transport too, since `ready()` never hands the plugin its `url`/`params`), and
  `emitLocation()` L150-159 confirmed verbatim as a compute-and-return no-op.
  _(Method note: settled by reading the file and tracing assignment order — the same
  "don't reason from shape" rule that produced the original `initialize()` correction.)_

- **Deals registration → publication config spec (done 2026-08-05, G40-351).** _(Docs only — no
  prototype or Dashboard code changed.)_ One configuration/data-flow spec reconciling the eight
  existing Deals sources into the end-to-end path: DLM/DLP registration → transport → `deals` record
  → HQ Dashboard review queue → publication on every consumer surface → redemption seed.
  **`docs/handoff/deals-registration-to-publication-config.md`**; every rule cites its source doc +
  section, nothing re-invented. Four drifts found by reading the code against the docs:
  (1) **⛔ the category taxonomy has five different vocabularies across five surfaces** — registration
  offers *Retail Merchants* (no consumer rail can show it), the browse rails + bid board carry
  *Convenience Stores* (unregisterable), and the overlapping names differ by string (`&` vs `and`,
  three spellings of Age-Restricted). Category is the join key, so this **blocks the feed**;
  (2) **`advertiserDeals.js` is NOT in the HQ Dashboard** — the orientation doc and the G40-286
  handoff both name it as the seam to extend and call it "In Progress in the HQ Dashboard"; it
  actually lives in `Documentation/Jira Tickets/` (44-line build-console scaffold), while the wired
  module is `deals-merchants.js` with a **different status vocabulary**, and **neither can represent
  a DLP deal** (no reach/keywords/price fields);
  (3) **Request and Connect have drifted on real deal data** — `r-buoy` (Buoy Bowls) carries a
  different **address** and tagline in each, and for a fixed-location merchant the address auto-fills
  the last-mile parlay pickup, so the same deal sends a Gopher to two different addresses depending
  on the app. Demo data today; the shared feed is what kills this class of bug;
  (4) **`gopher-customer-deals.html` is a marketing page, not a browse surface** (zero deal
  machinery; CTAs point at merchant registration) — the orientation doc's "customer-facing deals
  browse" is wrong, the Build Spec's "marketing/value-prop page" is right.
  Confirmed settled and restated, not re-decided: the Apps Script is **deleted, not migrated**, at
  go-live (`sp-deal-pipeline.md` §6 — do not build production integrations against
  `GOPHER_FORM_ENDPOINT`); SP eligibility = Elite/Elite+/Pro · 20+ **service** jobs · 4.75★ last-20
  **service**; approval is always a human act with one shared queue for merchants and providers;
  activation SLA **≤5 business days**; `earnAmount` must never reach a customer payload. **6 open
  rulings** collected at the end of the doc (canonical categories · is customer-deals a browse
  surface · refresh cadence · do apps still wait for a store release now that deals are API data ·
  which Buoy Bowls address is real · confirm the Gopher ID format to close pathway seam #9), each
  with a recommendation.

- **Deals category taxonomy settled — the rail is "Retail Merchants" (owner 2026-08-05, G40-351
  Ruling 1; commit `df40c61`, Dashboard `44ffca9`).** The spec's blocking finding (five surfaces,
  five vocabularies) turned out to be a **naming collision, not a category conflict**: *Retail
  Merchants* (registerable, no rail) and *Convenience Stores* (a rail, unregisterable) were **one
  bucket with a different name on each side of the funnel**. Owner reconfirmed the June 7 four
  from the live form — **merchant registration is unchanged** — and ruled the **rail renamed to
  Retail Merchants** (key `convenience` → `retail`, incl. the `data-cat` CSS hooks) in both
  consumer editions, the shared bid brain, and `gopher-deals-101.html`. BUILD-SPEC §3 therefore
  carries a **dated reconfirmation, not a supersede**.
  - **Registration list ≠ publication list** — 4 merchant categories; publication carries a 5th,
    **Service Providers**, never registerable there because DLP submits in the Go app. Canonical
    keys: `restaurants` · `favorites` · `age` · `retail` (+ `providers` on publication).
  - **⚠️ `Restaurants and Food Trucks` → `&` was NOT cosmetic.** `canBid()` is string equality, so
    `gopher-deals.html`'s `BID_VIEWER` **and its three `MY_DEALS` records** had to move with the
    brain or a merchant silently loses the ability to bid on their own category. Caught only by
    checking the brain's consumers after editing it — **any edit to a `gopher-bid-brain.js`
    category string must sweep both bid boards for viewer/deal strings.**
  - **The June 7 lock's own follow-up is finally done:** it said "the FAQ should be updated to
    match" and never was — the iQ corpus served merchants the **superseded six** for fourteen
    months. Fixed in all 7 inlined copies (integrity green, 184 entries, new common hash
    `2c16c52bd4`, request DRIFT-OK); it now also points Service Providers at the Go app.
    _(Trap hit and fixed: writing `—` as an escape into the corpus fails the round-trip
    check — `json.dumps(ensure_ascii=False)` emits the literal character. Write real em-dashes.)_
  - **Deliberately NOT done:** both category `<select>`s still submit **display text**, because
    that same string is rendered back to the merchant *and* is the bid join key — adding `value=`
    keys without a label↔key map would break the portal. Key/label separation is a
    production-schema requirement (spec §4.1 / acceptance criterion 5), not a prototype patch.
  - Verified in browser (Request rail + renamed CSS hook, Age-Restricted still age-gated, Connect
    matches, `canBid` own=true/other=false, registration options unchanged, 0 console errors).
    **Five rulings still open** in `deals-registration-to-publication-config.md` §10.

- **App prototypes: button weight follows impact, + the Deals pill matched to web (owner deck
  "App Prototype Update", done 2026-08-09; commits `5030a7e` + `6b91c71`, deploys by the Deals
  session and `55b38be`, live-verified on BOTH Pages and TigerTech).** _(Scope: `_prototypes/`.)_
  Owner directive, verbatim: *"Button size and UX style should be proportionate to it's impact."*
  Both job-action modals in `gopher-go-prototype.html` had it **inverted**, and the numbers are the
  point — measure before restyling:
  - **Update request** — the primary sat INSIDE the padded Next-step box, so *Start the job*
    rendered **260×43** while *Cost Adjustment* (**286×45**) and *Cancel this request* (**286×43**)
    each ran the full modal width as heavy outlined buttons: the two rarer actions were the largest
    things on the card. Now the primary is a flush green foot on that box at **284×54 / 16px**, Cost
    Adjustment is a lighter secondary (**286×39 / 12.5px**), and Cancel drops to the labelled-text
    pattern already used for the 1-in-100 outcomes in `openAgeIdConfirm`. **Cancel's full warning
    (fee up to $5, reliability score, required reason) still lives in `openCancelRequest`, which the
    tap still opens — prominence changed, disclosure did not.** That distinction is the rule to
    reuse: demote the affordance, never the disclosure.
  - **Confirm ID and Identity, NON-TrustShield branch** — capture is the one control nothing else
    can proceed without, yet it was a dashed grey placeholder in `#8C8675` (weakest element on the
    card) while the two exceptions were full-width outlined buttons and the disabled confirm was
    pale-green-on-pale-green, which reads as *broken* rather than *not yet*. Capture is now the loud
    green tile and **the loudness HANDS OFF to the confirm button on capture** — exactly one
    dominant action at any moment, always the step the worker owes next; the tile stays tappable to
    retake. The branch also gained the **"Not yet"** dismiss its TrustShield twin already had.
    Labels are unchanged throughout, so **no 101-guide edit was owed** (checked against the standing
    rule, not assumed).
  - **"View all local Deals" → the web Deals button.** The two apps had also drifted **from each
    other** — Go's copy was content-width (175px) while Request's carried `width:100%` (328px) — so
    Request dropped `width:100%` (a `<button>` sizes to content when width is auto even as a
    block-level flex container). Dead `.dva-arrow` rule removed from both.
    ⚠️ **CORRECTED, owner 2026-08-09 (commit `b3a787f`, deploy `c285a9d`) — the first attempt styled
    the WRONG RULE and shipped a pale-green PILL. Do not reinstate it.** The live web control carries
    **two** classes — `dh-viewall-link` **and** `dh-viewall-hero` — and the first pass read only the
    base class, whose `#eafaf0` / `radius:999px` **never render**. The `-hero` override is the button:
    cream 160deg gradient (`#FFFDF8` → `#FBF3E4` 58% → `#F6E9D0`), `#EAD9B6` hairline, **14px**
    radius, `0 12px 26px rgba(0,36,97,.10)` lift (the owner's "shadow of variance"), `#1a9d4b` ink,
    Nunito 800 **15px**, `12px 34px` padding, 16px chevron. **Pill shapes are NOT used for buttons on
    this brand** — owner, stated as a general rule, not a one-off.
    **Lesson, and it generalises past CSS:** when an element carries more than one class, reading one
    rule is reading a fragment. Compose the cascade before claiming a match. The replica is now
    *proven* — a script parses both rules, applies `-hero` over the base, and diffs the property set
    against `.deals-viewall`: **15/15 identical**, only the positioning margin local. That check also
    caught its own bug first (it swallowed the declaration following an inline CSS comment and
    reported a false `background` mismatch) — fix the comparator, not the CSS.
  - **Follow-up corrections, owner review 2026-08-09 (commit `b3a787f`, deploy `c285a9d`, live on
    both hosts).** Two more things the first pass got wrong, both about *reading as* rather than
    *measuring as*:
    (a) **The flush-foot advance button did not read as a button** — square corners running edge to
    edge inside the tinted box looked like a status banner, even though it measured as the biggest
    control on the card. Size dominance is not the same as affordance. It now sits **outside** the box
    as its own raised control (full modal width, 13px radius, `0 10px 22px rgba(28,176,97,.28)`),
    286×54 at 16px vs Cost Adjustment's 286×42 at 13px; Cost Adjustment also gained a small lift
    because a 1px hairline on white was reading as a **text field**.
    ⚠️ **Load-bearing:** `adjOnly` hid the primary via `advB.parentElement`, which *was* the tinted
    box. With the button reparented to the modal card, that one line would have **blanked the entire
    modal** in cost-adjust-only mode. It hides button and box individually now; the dispute path
    (`.js-dispadjust` → `openUpdateSheet('completed', true)`) was driven to prove it.
    **Whenever you move an element out of its parent, grep for `parentElement` before shipping.**
    (b) **Step names are INSTRUCTIONS with an explanation line** — "Items Picked Up" →
    **"Purchase the items"** when the worker fronts money, **"Pick-up the items"** when they don't;
    "Completed" → **"Complete the delivery"**. `cta` stays a past-tense confirmation: heading says
    what to do, button confirms it — don't collapse them. `label` is read in **two** places (the
    Next-step heading *and* the numbered progress stepper), so these are the step names everywhere.
    `explain` is Next-step-box only and each line restates an existing commitment (out-of-pocket
    reimbursement, pending-confirmation payout) rather than inventing a promise. **Scoped beyond the
    literal ask for accuracy:** "Complete the delivery" applies to delivery/errand only — on
    labor/yard there is no delivery, so a job-shaped variant is used; raised, not silently
    generalised. **"In progress" was deliberately left** as the one step name that is still a state.
    Both wordings driven live on two real submitted requests ($24 → purchase, $0 → pick-up).
    **Method note:** mutating `__ptJobs[id].cost` and re-calling `load('job-detail')` does **not**
    re-derive these labels (the screen doesn't re-read the job that way) — an attempt to shortcut the
    check produced three identical readings and proved nothing. Exercising a per-job branch needs a
    genuinely new submitted request; `__ptJobs` is also **stale after a re-submit** unless the Go
    frame reloads, and injection only fires on a live submit event, not on a store re-read.
  - **Deck slides 3–5 were already closed and were RECONFIRMED rather than assumed** — `trustShield`
    on the shared record (slide 3, `238205c`), the real `trustshield-logo.svg` loading in the badge
    (slide 4, `91b89a7`), and the existing `DEMO · TrustShield ON/off` chip as the prototype's
    TrustShield-vs-regular control point (slide 5), verified to toggle both ways **and** to gate
    step 2's Continue. The badge was also watched appear/disappear as the flag flipped.
  - **Three traps, all worth keeping.** (1) **`preview_list` cwd lies about the serve root** — `psrv`
    reports the repo as its cwd but serves a **scratch copy** under `scratchpad/psrv`, so the first
    round of "verification" measured the PRE-EDIT file. That accident was useful (it captured the
    before-numbers above) but the lesson is: `curl` the served URL and grep for a string you just
    wrote before trusting any browser measurement. (2) **Go's `.deals-viewall` CSS lives inside a
    double-quoted JS string** (`FRAMES["deals"].css`), where a literal newline is a syntax error —
    the first explanatory comment introduced one and broke the whole script block; CSS line breaks
    there must be `\n` escapes. Caught by the parse check, invisible to the eye. (3) **Not every Go
    screen uses a `.frame` wrapper** — probing for one made the Deals screen look empty when it was
    rendering 527 KB of content. Two near-misreports, both caught by checking instead of concluding.
  - Verified end-to-end in the split-screen harness on a real submitted request (age-restricted +
    purchase): geometry measured before/after, the capture→confirm handoff driven live, clicks driven
    **from the SVG itself** to prove `closest()` still resolves, TrustShield branch intact with both
    ID images loading **unaltered** at full resolution, all inline scripts parse clean, 0 failed
    images. **Harness note for next time:** `?pt=1` seeds no jobs, the Go side is populated by
    `ptSyncHome()`, and `window.__ptApprove(id)` is the purpose-built hook for the hired state —
    `.js-update` only exists once `j.accepted && jobApproved(j)`.

- **Confirmation is INDEPENDENT of the rating — prototype corrected to match live (owner
  2026-08-09; commit `cc4493c`, deploy `41ae476`, live-verified).** _(Scope: `_prototypes/`. No live
  app, backend, or payment code touched — `confirm_payout` is payment logic and fenced.)_
  Owner: *"Once the Requester confirms the order, that should immediately update the Gopher's side.
  The rating is optional so we're creating a potential issue if the requester doesn't rate."*
  **Live is right and stays the reference** (traced on `origin/production`): `POST /confirm_payout/:id`
  captures, transfers, updates order status and notifies; `POST /ratings`
  (`controllers/common/ratings.js`) writes the rating row and `users_roles` and **never touches
  `aasm_state`**. Two endpoints, two effects. Also live: `PATCH /:id/complete` confirms payout
  automatically, `PATCH /:id/complete/v2` completes *without* confirming — worth knowing before
  anyone "simplifies" the completion path in the rebuild.
  **The prototype had them fused in TWO places, which is why it looked like one bug and wasn't:**
  (1) Go — `job.confirmed=true` was set *inside* `window.__ptRated`, so nothing else on earth could
  confirm a job; (2) the harness — `watchRating()` only relayed when `r.rating` existed, so a confirm
  with no rating was never carried across at all. **The requester side was already correct**:
  `openConfirmCompletion` writes `confirmed:1` on CONFIRM COMPLETED. Nothing consumed it. So a
  requester who confirmed and closed the (optional) rating modal left the worker reading
  *"Pending confirmation — {who} controls the payout until they confirm"* **forever**, payout
  apparently unreleased. **Half-fixing either side leaves the bug intact — check both.**
  **Now:** `window.__ptConfirmed(id)` is the only thing that flips `job.confirmed` (idempotent,
  clears any open dispute, re-renders); `__ptRated` records rating + favourite and **deliberately
  does not confirm**, so a rating can never be what releases the payout on screen. The harness
  relays confirm on its own `confirmSeen` map, ahead of and independent of `ratingSeen`. The shared
  re-render moved to `_ptSettleRender()` so both paths keep the two guards that were already there:
  never `load()` over an open modal (it rebuilds the shadow root and eats the worker's modal
  mid-tap), and never auto-return home until the worker has rated on *their* timing.
  Verified on a clean run: confirm with **no** rating → *"Confirmed by Jamie L. — $95 paid out"*,
  `confirmed` true / `rated` unset; then rating → `rated` 5, `confirmed` still true.
  ⚠️ **Harness testing trap, cost me a false alarm:** an intermediate run looked like the rating had
  stopped relaying. It hadn't — the order id **`GR-00128` is reused every run**, and the harness's
  `statusSeen` / `ratingSeen` / `confirmSeen` maps live in page scope, so a warm harness silently
  suppresses relays for an id it has already seen. **Reload `split-screen.html` between scenarios,
  or you will diagnose the harness instead of the product.** Injection also only fires for a record
  in stage `searching`.
  Also fixed here: the completion explanation said *"Hand off the items"* on a TV-mounting job — it
  now follows the same delivery/service split as the step label.
  **Deploy note (owner-directed):** the iQ session's Moving-pricing commit `f8b1953` was in the tree
  and the owner said ship mine only. Done by running `scripts/deploy.sh` from a **worktree pinned at
  `cc4493c`** rather than reverting anything in the shared clone. ⚠️ **A pinned worktree is missing
  the disk-only allowlisted prototype files** (`Go/gopher-banner.js`, `Request/gopher-banner.js` are
  gitignored) and the deploy aborts on them — copy them in from the clone first. That is the
  repeatable way to ship one session's work while another's sits uncommitted-to-live beside it.

- **iQ calibration: `<trade> work` misrouted to Hourly / Day Labor — FIXED (owner screenshot
  2026-08-12; diagnosed 8/09; shipped 8/19, commit `ae6f8a0`, deploy `3fa5b80`, live on Pages +
  TigerTech, content-verified on all 8 files both hosts).** Repro: **"Can you help me with electrical work"** → CTA
  **Hourly / Day Labor**, a delivery FAQ as the related answer, and **Ride Sharing** suggested.
  Three defects, fixed together behind a regression matrix per the standing caveat — this
  matcher is hand-tuned keyword scoring, so every change here is a data-level tune and the
  corpus is **not** provably collision-free.
  - **1. The stemmer was the actual cause, not the stop list.** `stem()` folds `worker`/`workers`
    → `work`, and `hourly_day_labor` legitimately carries both agent nouns in `tokens`+`hints`.
    So the bare noun `work` collected **hint-strength** score (4× weight) for day labor: `work`
    alone → labor **7.5**, ride 3.5, home 1. Against `electrical` (home 9.5 alone) the combined
    query still went **labor 7.5 ▸ home 4.5**. *"plumbing work"* survived by a single point
    (8.5 ▸ 7.5) — every `<trade> work` phrasing was one point from misrouting.
    **Fix: `worker`/`workers` added to `STEM_KEEP`**, so the agent nouns keep their own token and
    the bare verb no longer inherits their weight; both explicit forms were added back to the
    labor vocabulary so *"need 2 workers"* is unaffected. `work` alone now tops out at **1.0**.
    ⚠️ **`work` is deliberately NOT a stop word** — "yard work" and "day labor" are topical, the
    same nuance that made stopping `out` regress "cash out" (2026-07-21). Both are asserted.
  - **2. `ride_sharing` carried a bare `work` token** (from "commute to work" / "pickup after
    work") — that alone is why an electrical query offered a ride. Token removed; the phrases
    stay, so *"commute to work"* still scores ride_sharing **18.5**.
  - **3. The FAQ related answer was carried by pure function words — but NOT by a STOP-set gap.**
    The 8/09 note blamed drift between the two STOP sets; **that diagnosis was wrong and is
    corrected here.** `scoreRec` already excludes low-information words from `terms` via the
    LOWINFO guard. The leak was that **`synExtra` was built from `expandQuery(q)`, which returns
    the ORIGINAL query words alongside any synonyms**, and only `terms` were subtracted from it —
    so every LOWINFO word the guard had just excluded (`help`, `with`, `you`) re-entered as a fake
    "synonym" and bought the capped −3 confidence bonus, dragging unrelated records under
    `FAQ_FLOOR`. The guard was working; the bonus path went around it. **Fix: subtract the raw
    query words from `synSet` too.** (`someone` also added to LOWINFO — "can someone …" is filler.)
    **Lesson: a guard that is bypassed elsewhere reads exactly like a guard that is missing.**
  - **Trade vocabulary gap found while fixing:** `electrical`/`carpentry` do **not** stem-fold onto
    the existing `electrician`/`carpenter` hints (unlike `plumbing`→`plumber`), so home_services had
    no entry for the adjective at all. Added `electrical`/`electric`/`carpentry` + the trade-work
    phrases.
  - **Regression is asserted, not eyeballed — and both harnesses were PROVEN to fail on the old
    code before being accepted** (8 failures / 3 failures respectively; a green test that cannot
    fail proves nothing). `run_category_tests.py` gained **path D — classifier ranking** (15 rankings
    + a `work`-alone score ceiling), because paths A/B only assert the mismatch *decision* and a
    scoring regression that stays on the right side of the thresholds would pass silently. **72/72.**
    New **`docs/handoff/category-mismatch/run_faq_matcher_tests.py`** covers the other half of a pill
    answer (which FAQ is offered) with MUST_MATCH / MUST_NOT sets — **13/13**. FAQS integrity green
    (184 × 7, hash unchanged: the corpus was not touched, only matcher code). Parity harness 0
    failures.
  - **Applied to all 7 synchronized copies** (engine + 6 inline pages) by a two-phase splice that
    validates every file before writing any, then regenerated `gopher-category-classifier.js` using
    the generator's own extraction. **`regen_categories_from_ml.py`'s own `STEM_KEEP` was synced
    too** — it has a duplicate `stem()` for phrase dedupe, so leaving it stale would silently undo
    the fix on the next data refresh.
  - Browser-verified on a served copy: the owner's exact query → **Home Services**, no delivery FAQ,
    no Ride Sharing; plus "seasonal yard work" → Yard Work, "day labor" → Hourly/Day Labor, and the
    `gopher-request.html` IIFE export intact with the mismatch nudge firing to home_services.
    0 console errors; all 8 modified files JXA-parse clean.
  - ⚠️ **"do you have service in Raleigh" lost its related FAQ** (it had been clearing the floor on
    the same `you` bonus). **Verified in-browser to be cosmetic:** that query is answered by the
    **coverage brain** ("Raleigh has ~188 neighbors…"), which owns it via `classifyLocationIntent`
    long before the FAQ pipeline — and category routing for location queries is unchanged. Checked
    rather than assumed, because the regression matrix flagged it as a loss.

- **Category-mismatch nudge stayed silent on a misfiled Moving job — a DUAL-USE NOUN was reading as
  proof the requester chose right (owner screenshots 2026-08-19, BOTH surfaces; commit `9986eb0`,
  deploy `7de4ed4`, live on Pages + TigerTech).** Repro: **"Looking to have a couch moved to 3rd
  floor"** (Request web) and **"looking to move a couch"** (Request app) filed under **Junk
  Removal** → **no reroute offered to Moving**, though Moving scored **16** to junk's **4.5**.
  - **Root cause: "weak selected" was an ABSOLUTE floor only.** The confident-disagreement gate
    required `selectedScore < CAT_THRESH` (4) before suggesting a switch. **One dual-use object
    noun clears that:** `couch` is a legitimate junk-removal **token (2.5)** + **pword (1)**, and
    the filler `looking` adds **1** → **4.5**, over the line by half a point. The nudge was
    suppressed at a **3.6× dominance**. Nothing was wrong with the scoring; the *gate* was.
  - **Fix: the weakness test is now RELATIVE as well as absolute.** New `DOMINANCE_RATIO = 2.5`;
    `selectedWeak = selectedScore < CAT_THRESH || top.score >= DOMINANCE_RATIO * selectedScore`.
    **`strongTop` (≥8) and `MARGIN` (≥5) are unchanged** — only the faulty condition loosened.
  - **2.5 was measured, not chosen by feel — and the band it sits in is empty.** Genuinely
    dual-category junk/moving jobs cluster at ratio **1.00–1.61** ("move a couch to the dump" 1.36,
    "get rid of an old couch and mattress" 1.60, "haul away my old couch" 1.00, "take my old
    furniture to the landfill" 1.36); real misfilings sit at **3.56–5.57**. **Nothing occupies the
    gap between**, which is why the constant has room on both sides. ⚠️ **Do NOT lower it toward
    1.6** — that is the top of the legitimately-dual band, and the code comment says so.
  - ⚠️ **`couch` stays a junk-removal token on purpose — couch removal IS junk work.** The
    vocabulary was right; the gate was reading a *shared* noun as evidence of correct filing. The
    tempting "fix" (prune the dual-use nouns) would have broken real junk queries.
  - **One definition, three consumers — verified by grep BEFORE editing, not assumed.**
    `detectCategoryMismatch` is defined **only** in `Final/assets/js/gopher-request-logic.js` and
    consumed by `gopher-request.html`, `gopher-connect.html`, and
    `_prototypes/Request/gopher-request-flow.html` — so **one edit covered both surfaces the owner
    filmed**. (Contrast the 7/25 defect, where the *page's* inlined engine was the broken copy.)
  - **Harness: +13 rows, PROVEN to fail on the pre-fix module first** — 4 failures, exactly the two
    owner repros across paths A **and** B (same standing rule as 8/12: a green test that cannot
    fail proves nothing). **98/98** after. ⚠️ **The 8/12 entry above says 72/72 — that was the count
    then; don't read it as current.** Two of the four new repro rows (*"need a couch moved
    upstairs"* 5.29, *"help moving a mattress to my new apartment"* 5.57) **already passed pre-fix**
    — their selected score was 3.5, under the absolute floor — so they are regression guards, not
    things this fix repaired. The 9 guard rows are what forbid lowering the ratio.
  - Browser-verified through the **real event path** (programmatic `input` + `blur` on
    `#descriptionInput`, i.e. the handler the product actually uses), on a served copy: the modal
    renders — *"🧭 This looks like a Moving job … Switch to Moving?"* — and **"move a couch to the
    dump" stays silent on that same wiring**; prototype flow confirmed to load both modules and
    agree; 0 console errors; module JXA-parse clean.
  - **Deploy was pinned, and had to be.** Another session's **G40-308** modal work sat uncommitted
    in the shared clone on `gopher-connect.html` + `gopher-request.html` (and was committed as
    `c5d8012` mid-deploy). Shipped from a **worktree pinned at `9986eb0`** → **1 file, 0 riders**;
    the 2 gitignored disk-only allowlisted prototype files were copied in first, as always.
  - ⚠️ **Method note — a rider check that proves nothing.** The first "did their work ride along?"
    check grepped the live page for `ca-overlay` **expecting 0, and got 13** — the class **predates**
    that commit, so its presence was evidence of neither outcome. The real check is a **content hash
    of the live page against BOTH candidate source states** (pre- and post-their-commit): live ==
    pre-G40-308, byte-identical, so nothing of theirs shipped. Same family as *verify by content,
    never by SHA* — but the sharper form: **a string that already existed cannot be a rider probe.**

- **Split-screen harness: "⟳ Reset demo" now clears EVERY seen-map — the second demo run was
  broken (2026-08-11/12, commit `505ac28`, deploy `3a31b0b`, live on Pages + TigerTech).**
  _(Scope: `_prototypes/split-screen.html` + one new test + one doc correction. No app, backend,
  or payment code.)_ **The regression was self-inflicted by the 2026-08-09 confirm/rating
  decoupling** (`cc4493c`): that change added a `confirmSeen` map and **never added it to the
  Reset-demo clearing line**, where all 18 of its siblings already were.
  - **Why that is worse than it sounds.** Reset reboots both iframes but does **not** reload
    `split-screen.html`, so the seen-maps live on in page scope — and **order ids are reused every
    run (`GR-00128` each time)**. So after one Reset the stale `confirmSeen['GR-00128']` suppressed
    the confirm relay and the worker sat on *"Pending confirmation — {who} controls the payout until
    they confirm"* **forever** — reproducing the exact bug `cc4493c` had just fixed, gated behind one
    button. Reset's only purpose is re-running the demo without a reload, so the button was **worse
    than absent**: it silently poisoned the next run.
  - **Auditing the class rather than the instance found two more, both pre-existing and both the
    subtler seq-keyed variant:** `navSeen` and `flagSeen` compare against `job.<x>.seq`, built as
    `seq:((j.x&&j.x.seq)||0)+1`, which **restarts at 1 on a rebooted frame** — so a stale `1` equals
    the fresh `1` and swallows the **first** turn-by-turn narration and the **first**
    Report-A-Request after a Reset. **A boolean map fails on any re-run; a seq-keyed map fails only
    on the first event after a Reset — precisely when someone is demoing.** All three added.
  - **New `docs/handoff/category-mismatch/run_splitscreen_reset_test.py`** asserts every *mutated*
    relay-state var appears in the Reset line, and guards the reverse (a cleared name no longer
    declared). **Proven to FAIL on the pre-fix file with exactly those three names before being
    accepted** — same standing rule as the 2026-08-12 iQ harnesses: a green test that cannot fail
    proves nothing.
  - **`docs/handoff/rating-gate-on-requester-confirm.md` was stale in a load-bearing direction and
    is corrected.** It told the production dev that **`__ptRated` sets `confirmed`** — i.e. the
    fused behaviour the owner ruled wrong on 8/09. Now names `__ptConfirmed`, records the live
    parity (`/confirm_payout/:id` vs `/ratings`, which writes no order state; plus
    `PATCH /:id/complete` confirms automatically while `/complete/v2` does not), and adds a
    checklist item to audit clients for the same fusion. **It also records what the decoupling
    un-broke and nobody had noticed:** because `confirmed` only ever arrived *with* a rating, the
    Gopher's own "Rate {requester} →" button **could never appear for a requester who declined to
    rate** — the gate that doc specifies was *unreachable on the most common path*.
  - **Verified behaviourally, on the live URL, not just by matching bytes:** shared iQ brain loads
    through the deploy's `../../Final/` → `../../` rewrite (`lookup('Raleigh').workers` = 188);
    run 1 confirm with **no rating** → confirmed; **Reset**; run 2 on the reused `GR-00128` →
    `confirmed:true`, `substage:'completed'`, `rated` **unset**. 0 console errors. The pane
    throttled the 600ms tick twice while occluded and the relay looked dead both times — the
    documented quirk, not a product bug; screenshot/front the tab and it resumes.
  - **Deploy was pinned on purpose.** Three other sessions' uncommitted **customer-facing** files
    (`gopher-connect.html`, `gopher-request.html`, `gopher-go-101.html` + 2 handoff docs) were in the
    shared clone, so `deploy.sh` ran from a **worktree pinned at `505ac28`** — shipped **1 file, 0
    riders**, nothing of theirs. Owner of those edits (the *Jira Low Risk Tickets* session, G40-37 +
    G40-69) was pinged: the deploy reads the **working tree**, so the next `--allow-dirty` deploy
    from this clone publishes their in-flight work. **Confirmed by curl + `origin/main` that none of
    it is live yet** — worth stating because that session's own `HTTP 200` + grep reads like a live
    check but was a local serve.
  - **Two traps re-confirmed:** a pinned worktree lacks the **gitignored disk-only** allowlisted
    files (`Go/gopher-banner.js`, `Request/gopher-banner.js`) and the preflight aborts until they are
    copied in from the clone; and the Go router itself audited **clean** (all 21 `data-goto` values
    resolve via `BYID` or an explicit `dg===` case) — the one apparent cross-app leak, Go's deals
    screen pointing at `gopher-request-home.html`, carries a **"do NOT fix these paths"** G40-327
    deeplink-seam comment. Don't "fix" it.

- **Gopher Deals: Apps Script severed, attribution persisted, merchant logos built (2026-08-21/22,
  owner-directed).** Three pieces, all live and content-verified:
  - **Apps Script SEVERED** (commit `193bd8d`, deploy `7fa5a60`). Owner corrected the record —
    the 08-14 "freeze" meant *stop building on it while it is removed*, not *keep it*; the entry
    above is marked superseded. The last dependency was the SP/worker eligibility funnel, which
    now does phone OTP → `GET /users/deals/eligibility` and answers on the spot instead of
    promising an email. `GOPHER_FORM_ENDPOINT`, its `fetch` and `GOPHER_BACKEND` are gone.
    **0 `AKfycb` on all three hosts.** ⚠️ `POST /users/sign_in` MINTS an account on an
    unrecognised number — desired for a merchant, not here; detected via the
    `@placeholder.gophergo.io` address and the flow stops rather than "assessing" a
    two-second-old account. Sized first: 2,460 placeholder accounts already exist, ~440–500/mo,
    **zero of which have ever ordered or worked** — which also inflates every roster metric.
  - **Attribution persisted** (`!353`). `?src=` was the small half: `discovery_source` and
    `referred_by_gopher_id` were allowlisted and **never written**, so no merchant registration
    had ever carried attribution. Three columns, all written, all returned by the HQ queue.
  - **Merchant logos** (`!354`, `!355`, deploy `af5c3d7`). There was no logo pipeline at all and
    it was invisible from four sides at once. Upload → key → JSON submit; `PATCH
    /users/deals/:id/logo` to change it later in any status including live. **SVG is REJECTED,
    not sanitised** (no sanitiser in the 43 deps; hand-rolling one is stored XSS on a public
    surface). Keys are owner-namespaced and ownership is proven from the key shape. Details +
    the four `gopher-deals.html` runtime traps: memories `deals-merchant-logo-pipeline` and
    `gopher-deals-html-traps`.
  - **✅ The merchant portal is WIRED TO LIVE DATA — `a2ec9a2`, 2026-08-23.** Real sign-in (phone
    OTP → `/users/sign_in` → token), then `loadMyDeals()` fetches **`GET /users/deals/mine`** and
    renders the merchant's own rows: logos, deal codes, statuses, rejection reasons. `MY_DEALS`
    survives **only as the signed-out showroom**, because this page is a public marketing surface
    as well as a portal. Live on both hosts (md5 `0067b7c2…` on local HEAD, Pages and TigerTech).
    ⚠️ **This bullet used to say the dashboard "is still a DEMO" and that wiring it to
    `GET /users/deals/mine` was "the obvious next piece."** True on 08-22; **wrong from 08-23**,
    and left standing. On **2026-08-24 it sent a session to propose rebuilding the live feature** —
    it never opened `loadMyDeals`, because a sentence stating the dashboard was a demo answered
    the question before it was asked. **That is the cost of a stale claim: not a wrong sentence, a
    verification that never happens and therefore leaves no trace.** The same wording was standing
    in **three** places — here, a comment in `gopher-deals.html`, and the memory
    `deals-merchant-logo-pipeline` — all descended from **one** pre-`a2ec9a2` observation, so their
    agreement was worth one observation, not three. Fixing two of the three would have re-seeded
    from the third; this file is the worst place for one to survive, because it loads into **every**
    session automatically. See memory `agreement-is-not-corroboration`.
    ⛔ **STILL UNVERIFIED and it needs a real phone: the end-to-end sign-in.** `/otp/get` sends a
    live SMS, so proving the token path takes a real code on a real handset. Every render branch
    and the whole demo path are proven. **Failure is silent by design** — no token, a failed fetch
    and an error all leave the showroom standing — which is exactly why it could stay broken
    unnoticed. Do not record it as verified until someone actually signs in.
    **OPEN, owner's call (2026-08-24):** `#modal-logo`'s own trigger — *"when the portal is wired
    to live data, move this in and delete the entry point"* — has now fired, but that modal is
    reachable by a merchant who never opens the dashboard ("Already registered?"), so deleting the
    entry point removes that path. **Owner ruled: leave both doors for now**, precisely because the
    real sign-in above is unverified — if that path is broken, the standalone modal is the only
    working way a merchant can change a live logo.
  - **⚠️ A PINNED DEPLOY CAN BE A REVERT.** The rule, in its sharpest form:
    **pinning is safe ONLY when the pin point is at or ahead of what is currently live.**
    Pinning excludes *uncommitted* work only — it does nothing about other sessions' commits, and
    if the pin point sits BEHIND live it silently rolls back everything shipped since. Pinning at
    your own last-**deployed** commit is the dangerous case (live has usually moved on); pinning
    at your own **latest** commit is safe, because it carries everyone's ancestors.
    Caught 2026-08-22: pinning at `193bd8d` to exclude another session's committed file showed two
    `_prototypes/` files as changes — that deploy would have reverted them. The safe shape is
    **build the deploy tree from HEAD and `git rm` the specific file you don't own.**
    ⚠️ **The dry-run diffstat shows riders and reverts IDENTICALLY.** An unfamiliar file is either
    someone else's new work or something you are about to roll back, and the only way to tell is
    to check whether it is currently live — one `curl`. Do not skip it.
  - **⚠️ `git` author does NOT identify a session** — every commit here is "John Newbury". To find
    which workstream owns a file, read the SIBLING PATHS in the same commit (a `docs/handoff/<x>/`
    directory usually names the lane), or search session transcripts. Guessing "the nearest active
    session that touches this area" produced a misattribution on 2026-08-22 that the wrongly-named
    session had to correct.

- **SP deal cards: no-image fallback = Gopher mascot on white, never initials (owner rulings
  2026-08-25; commits `04dd155` + `75f3332`, deploys `903f11f` + `86470a7`, live-verified on
  Pages + TigerTech).** The "JR" initials wordmark is gone from both LIVE SP render sites on
  BOTH apps (rail `serviceCard` `.deal-pic` + View Details `#svcDealPic`): a provider with no
  logo and no elected profile photo now shows `assets/img/gopher-character-full.svg` on plain
  white — the identical treatment a logo gets ("Logos are against NO background. White is the
  cleanest."). The mascot img always renders UNDER the photo, so a broken image (the exact
  live-"JR" mechanism: bad S3 headers → onerror) degrades to mascot-on-white too. In the
  onerror handler, `classList.add` runs BEFORE `this.remove()` — closest()/parentElement stop
  resolving on a detached node. Dead `.deal-pic-fallback`/`.svc-pic-fb` CSS removed so the
  ruled-out pattern can't be quietly reused. `serviceDetailHTML` still carries an initials
  fallback but has ZERO callers on both surfaces — dead code, left alone. **Merchant tiles: CLOSED 2026-08-26 (owner ruled option A of the side-by-side)** — commit
  `a61a7b8`, deploy `f23c2b0`, live-verified both hosts: a no-logo merchant shows the mascot
  free-floating via the SAME classes a logo uses (no tile, no category tint); every merchant
  logo `<img>` also gained in-place onerror→mascot degradation; `.deal-logo-tile` + `.dh-mono`
  CSS deleted with their producers. Portal admin rows in `gopher-deals.html` deliberately out
  of scope ("no logo" there is information to the listing's own merchant). Deploy note: the
  Deals session had ALREADY shipped `b783964` (`26ca21a`), so the pin-at-live carried their
  work forward untouched — and a Pages CDN edge briefly served the pre-`26ca21a` deals.html,
  making the two hosts look divergent; cache-busted curl showed them identical. **A cross-host
  content mismatch on a file your deploy didn't touch is a cache artifact until proven
  otherwise — cache-bust before concluding anything.** Ruling path worth keeping: the
  first side-by-side offered mascot-on-cream and the owner picked it AS LABELED, then corrected
  when shown — a ruling on a mock is only as good as what the mock shows; re-confirm with the
  actual pixels. Companion (same rulings): all three merchant logo-upload surfaces in
  `gopher-deals.html` + the Deals 101 field description now warn that logos display on a white
  background (all-white/very-light artwork won't show — the registration copy asks for a
  TRANSPARENT PNG, which is exactly when white art vanishes). Also this session: Connect now
  declares the four deal/hire-again contract fields it was already using (`a915e85`, parity
  harness 0 warnings; `resetFlowState` had been DELETING them as unknown keys rather than
  resetting — accidentally safe only because every Connect read coerces). **Both deploys were
  pinned worktrees, and the second one earned it:** the Deals session committed `b783964` (321
  lines, portal self-service) BETWEEN my two deploys, so the 101 follow-up would have shipped
  it as a rider — caught on the dry-run diffstat, excluded by restoring `origin/main`'s
  `gopher-deals.html` into the pinned worktree (md5-verified = live) and shipping
  `--allow-dirty` with a 1-file diffstat. `b783964` remains committed-not-live, its session's
  to ship. ⚠️ The "App Prototypes' 5 prototype commits await the owner's localhost test" note
  from 08-24 was STALE by this deploy — all of them content-verified already live.

- **G40 request modals: all six WIRED, the preview chip is gone, four owner corrections
  (2026-08-26; commits `76a3b9c`→`7db2171`, deploy `c72c824`, live-verified BOTH hosts).** The
  bottom-right "G40" chip was dev chrome shipping to every real visitor, and `window.G40_REQ`'s six
  rebuilt modals had ZERO callers outside its preview menu. Now: **phoneEntered** hard-blocks step-2
  Continue on a phone number in the description (no ack flag — the no-broadcast rule holds);
  **pickupSameAsDropoff** is PRESENTATION on the existing shared `addressesDiffer` hard gate
  (steps 4 AND 6) — `toWebShape()` now carries the failing rule's `id` and Request swaps that one
  gate's field-flash for the modal (a duplicate warn-once backstop was built first and reverted).
  ⚠️ **The id exists ONLY where the shared module is consumed** — a surface with its own inline
  `stepGate()` returns `{ok,sel,msg}` with no id, so copying the `gate.id === 'addressesDiffer'`
  wiring there is a SILENT NO-OP: false forever, nothing throws, presents as "the modal just
  doesn't appear." App Prototypes hit exactly this mirroring the work (2026-08-26) and caught it
  only by driving the gate — carry the id on that surface's own return first;
  **selectedGopherBusy** blocks Hire/Approve on `busy:true` before the hire cap — **mirrored to
  Connect** (`#busyGopherOverlay` on gc-modal primitives) after the owner's "didn't fire" turned out
  to be BOTH apps seeding a Marcus with wiring on only one — when a repro disagrees with
  verification, ask WHICH SURFACE before debugging the one you wired; **expiredInterestedWorkers**
  fires at the EXPIRY of an active request a worker accepted but was never approved (owner corrected
  my previous-requests wiring; DEMO sim bar, since no broadcast-expiry runs in the prototype;
  production also sends SMS); **paymentNotAuthorized** got a DEMO sim bar in the hired section (real
  trigger = backend Stripe event); **cantDeleteOnlyCard was REMOVED from the Request set** — owner:
  a last-card guard is a WORKER concept protecting the Stripe payout account, and `gopher-go.html`
  already implements it (`#lastCardOverlay`). Also owner-ruled: **hourly mode hides the iQ suggested
  offer AND skips the low-offer notice** (the model prices a WHOLE JOB; in hourly mode the field is
  a per-hour rate — Moving+Junk carry both features); and the low-offer notice **names the actual
  category** (said "a delivery like this" on a Moving job; per-category phrase, both apps).
  Traps worth keeping: an HTML cache-buster does NOT bust `<script src>` — a stale cached
  `gopher-step-gates.js` made the gate-id wiring look broken mid-verification (fetch
  `{cache:'reload'}` before concluding anything about a shared-module edit); the page pre-builds
  ~24 static `.gr-modal-overlay` nodes, so `querySelector('.gr-modal-overlay')` grabs the wrong one
  — filter on `!o.hidden`; and `grep -c` under `LC_ALL=C` errors on multibyte pages ("character not
  in range") and reads as 0 — a probe failure indistinguishable from a real miss; verify live
  content with a UTF-8-safe prober. ⚠️ **The TigerTech workflow did NOT auto-trigger on this push**
  (first time since the 7/26 fix; workflow active, file present, same commit-message shape) —
  fired manually via `workflow_dispatch` + the stored token, went green, content-verified. Watch
  the next push: if it skips again, that is a pattern, not a blip.

- **Connect had its OWN G40 preview chip, still live — wired and removed (2026-08-26, commit
  `a6dc482`, deploy `973fc07`, live-verified both hosts).** Found by sweeping all four portals for
  dev chrome *after* the Request fix — which is the check that should have run with it.
  `gopher-connect.html` carried its own `__g40ReqMenu` + fixed `z-index:99999` launcher and its own
  7-modal set with **zero real callers**, live on Pages and TigerTech the entire time. **The lesson
  is the scoping, not the chip: the ticket said "Request modals" and I fixed one file for a defect
  that was a PATTERN.** When a defect is a pattern (dev chrome, a duplicated helper, a copied
  block), sweep every surface that could carry it before closing.
  Wired to real flow points, mirroring Request: `phoneEntered` (step-2 Continue hard block);
  `pickupSameAsDropoff` (presentation on the shared `addressesDiffer` gate — Connect **does**
  consume `gopher-step-gates.js`, so `gate.id` is populated, verified at runtime not assumed);
  `paymentNotAuthorized` + `expiredInterestedWorkers` as DEMO sim bars, mutually exclusive by
  construction (decline needs `hired>0`, expiry needs `hired==0`).
  **Deliberately NOT wired, each recorded in the block header:** `selectedGopherBusy` (already built
  the same day as static `#busyGopherOverlay` — one copy, not two); `cantDeleteOnlyCard` (owner
  ruling: worker concept, `gopher-go.html` owns it via `#lastCardOverlay`); and Connect-only
  **`duplicateRequest`, which has no supporting infrastructure** (no `__findDuplicateActive` /
  `dupWarnAck` as Request has) — wiring it means BUILDING duplicate detection, a scoped feature
  rather than modal plumbing. **Open for an owner ruling.**
  ⚠️ **Bug introduced and caught only by DRIVING it:** the rebuilt block dropped the `b2()`
  secondary-button helper the payloads call, so every modal threw `b2 is not defined` **at call
  time**. The library loaded fine and the page looked healthy — the symptom was "Continue does
  nothing", not an error anyone would see. **A JS parse check cannot catch this; only calling each
  modal can.** The block now smoke-tests all four on load.
  Two environment notes: the **`localhost:8123` server had survived a permissions reset but lost
  filesystem access** — still holding the port while 404-ing every request, so it looked like the
  site was broken rather than the server; restarted from `Final/`. And the **browser pane's console
  buffer persists across navigations**, so stale errors read as current — the proof that mattered
  was each modal returning its title instead of throwing.
  ✅ **The TigerTech auto-trigger anomaly flagged on the previous deploy did NOT recur** — this push
  triggered `Deploy to Tiger Tech` on `push` and went green, as did another session's `cb4b00e`.
  One-off blip, not a pattern; no longer worth watching.

### Outstanding to-do

- **NOT a to-do — the Netlify mirror (`gopher-deals.netlify.app`).** Owner ruling 2026-07-28:
  **keeping it current is LOW priority; do not flag its drift.** Its job is **fielding merchant
  registration leads**, and that path is buttoned up — the `GOPHER_FORM_ENDPOINT` Apps Script URL,
  the fallback logic and the form fields on the live Netlify build are **byte-identical to
  `Final/`** (verified 7/28), so copy/feature deploys to Pages + TigerTech leave its actual
  function untouched. **Only changes that touch the merchant registration flow itself** (the form,
  its validation, `GOPHER_FORM_ENDPOINT`, `_redirects`, or the Maps key it geocodes with) warrant
  raising a redeploy. It is also **owner-action only** — no Netlify CLI, token or `netlify.toml`
  exists on this machine, and the redeploy is a manual drag of `Final/` onto the gopher-deals
  project's Deploys page. Past sessions have repeatedly re-raised this as stale; it isn't a defect.

- ~~4 produced hero clips for `gopher-connect.html`~~ — **CLOSED with owner-approved stock
  stand-ins 2026-08-05** (commit `4510598`). Four Pexels clips (courier / movers / cleaning /
  **skilled trades** — clip 4 per the brief's recommendation, owner ruled) are live at
  `assets/video/connect-hero-1..4.mp4`, each visually verified frame-by-frame, crossfade-looped
  (seam ≈ 2 frames of normal motion), ≤600 KB each. **Produced clips can replace them at the
  SAME filenames with zero code change** — that is the remaining (optional) production task.
  Reduced-motion verified safe at source: the guard strips autoplay and returns before goLive
  attaches, so the static-photo path can't be hijacked.
  _Superseded detail (kept for history):_ the old entry read: **4 produced hero clips** still wanted for `gopher-connect.html`. **Full production brief:
  `docs/handoff/connect-hero-video-brief.md`** (written 7/27 from the code — subjects, the
  6s-visible/8s-minimum/seamless-loop timing, the ~600 KB budget, and the two framing rules
  that follow from the CSS: don't bake in a zoom, and shoot bright because the overlay is
  86%-opacity navy). **⚠️ The old line here said "the hero plays services b-roll stand-ins
  meanwhile" — that was STALE.** The stand-ins were **removed 2026-07-17** (any clip that
  loads hides the photo cycle by design, so they put Go footage on the Connect hero). The
  hero is **photos-only** today: 9 stills, which are also the `prefers-reduced-motion`
  experience, so they stay regardless. There are **no `.hero-clip` elements in the markup**,
  so nothing 404s. The player wiring + CSS + photo→video handoff are **built and dormant** —
  landing the files is ~10 lines of markup. One open owner decision in the brief: clip 4 is
  warehouse (matches the stills) vs skilled trades (matches the hero copy's "skilled
  professionals"); recommendation is trades. Note `Final/hero-media/` exists but is **empty**
  and predates the asset reorg — the brief recommends `assets/video/connect-hero-1..4.mp4`
  to match the site-wide convention.
- **deals@ email wiring — NOT started. The 8/5 "front end DONE" claim was wrong and has been
  reverted (owner, 2026-08-05; backout `40fc4eb`).** ⚠️ **Correcting the record**, because the
  previous wording here overstated it in a way that mattered: `5a41322` wired the merchant-portal
  Inbox composer to POST every message to the registration Apps Script as
  `submission_type:'inbox_message'`, and this entry claimed the POSTs "land harmlessly in the lead
  sheet." **They did not land harmlessly.** That endpoint is the LIVE merchant-lead capture sheet,
  so each demo message mutated the Leads header with 5 new columns, appended a junk row, and fired
  a pre-registration alert. The relay half was **never written script-side**, so the feature was
  never functional end to end — it was pure cost. It shipped in `f18cacb` and ran live until the
  backout. The composer now sends nothing (verified: 0 fetch calls on send).
  **Rebuild target: the G40-305 dispatcher (`sendEmail.js`) — NOT Apps Script, and NOT against the
  lead-capture endpoint.** A tombstone comment in `gopher-deals.html` (search
  `inbox_message` — the line number has already drifted from 5554 to ~6408, so do not cite one)
  records this so nobody
  re-adds it from the old handoff doc.
  ⚠️ **`docs/handoff/deals-email-wiring.md` is FROZEN and must not be followed as written** — its
  paste-ready snippet keys on `data.email`, but the **merchant** form's field is `owner_email`
  (only the worker/SP form uses `email`), so the merchant welcome email would silently never fire.
  Left unfixed on purpose while the Apps Script freeze decision is open.
  **⛔⛔ SUPERSEDED 2026-08-21 (owner) — THE APPS SCRIPT IS BEING *SEVERED*, NOT KEPT.** Verbatim:
  *"I wanted to sever App Scripts and EVERYTHING is internal now. Deals and GO -> HQ and soon
  HQ -> Connect and Request."* The architecture is internal end to end.
  **Read the 08-14 "freeze" below as *stop building on it while it is being removed*, NOT as
  *it legitimately stays*.** That misreading is live-tested: on 2026-08-21 a session reported the
  one surviving Apps Script dependency to the owner as intended design, and was corrected.
  **Any remaining `GOPHER_FORM_ENDPOINT` / `script.google.com` / `AKfycb…` reference is DEBT TO
  REMOVE.** Audited 2026-08-21 — the entire remaining surface is **one path**:
  `Final/gopher-deals.html` `submitForm('worker')`, the SP-eligibility funnel. The **merchant**
  path is already fully internal (`POST /api/v1/users/deals` behind phone + email OTP) and is
  proven with real public traffic. Use the merchant path as the template for severing the worker
  one. See memory `apps-script-is-severed-everything-internal`.

  _Superseded ruling, kept for its reasoning:_
  **RULED 2026-08-14 (owner): FREEZE THE APPS SCRIPT.** It stays at exactly today's behaviour —
  lead capture + notify deals@ — and nothing is added to it, ever. No welcome email, no inbox
  relay, no new `submission_type`. **Do not build against `GOPHER_FORM_ENDPOINT`**; the work goes
  to the **G40-305 dispatcher (`sendEmail.js`)** in production. `docs/handoff/deals-email-wiring.md`
  is now a DECISION RECORD, not a work item — its paste-ready snippet must never be pasted, and its
  old header wrongly claimed the front end was built (it was reverted, `40fc4eb`) and that the
  stray POSTs were harmless (they mutated the live Leads sheet). This closes the question below;
  the grounds are kept because they are the reasons, not the decision: Grounds: SOW
  Bucket F already scopes and prices "two registration paths; full account creation" so anything
  built here is paid for twice; the owner already ruled 7/24 that production has no Apps Script;
  and **the welcome email would open a relay hole** — the endpoint is `Who has access: Anyone` and
  today only mails a fixed address, so it can't be abused, but mailing whatever address is in the
  POST body turns a URL that sits in public page source into an open relay from your domain, with
  no rate limiting, suppression or bounce handling.
  _Original entry:_ tabled by owner 2026-07-22. Two pieces, both via
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
- ~~gopher-go worker-dashboard bid board~~ — **BUILT 2026-08-05** (commit `a98682f`).
  "Feature my deal" sidebar item under the Rewards divider; renders 100% from
  **`assets/js/gopher-bid-brain.js`** (board/catTop/topOverall/isLeading/placeBid/closeLabel) —
  zero auction logic inline, per the standing rule, which still applies to future edits.
  View-layer note: the brain's `mine` flag is seeded for the Deals demo viewer, so you-ness is
  gated on `mine && own` and the seed's "You · " holder prefix is stripped on non-own cards
  (production keys placements by merchantId — the brain documents this). CSS is `gbb-`-prefixed
  (`.bid-cta` already means something else on this page).
- ~~The "verify visually" image rows~~ — **DONE 2026-07-05** (see below).
