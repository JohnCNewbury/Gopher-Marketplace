# Folder structure & asset naming (G40-320)

_Done 2026-07-08. Part of Epic **G40-312** (scale/production-readiness). Final ticket of the epic._

## Live site layout (`Final/` = site root)

```
Final/
├── *.html                      # 133 pages (index + 107 service-detail + brand/legal/tutorial)
├── assets/
│   ├── img/                    # all images (WebP photos, SVG logos/icons, PNG where alpha needed)
│   │   └── originals/          # full-res masters + unused spares (NOT live deps)
│   ├── css/                    # gopher-fd.css, gopher-footer.css, gopher-ai-engine.css, 3-pill-css.css
│   ├── js/                     # gopher-header.js, gopher-footer.js, gopher-ai-engine.js,
│   │                           #   gopher-iq-data.js, gopher-banner.js, gopher-message-guard.js,
│   │                           #   gopher-deals-audience.js
│   └── video/                  # services-clip-1..18.mp4 (externalized montage)
├── draft-content/              # NEW — staging for not-yet-live copy/assets (nothing live references it)
├── *.mp4                       # scene videos still at root (Beer-Delivery.mp4, Handyman.mp4, …) — see below
└── gopher-*.html (header/footer)# pointer stubs → the shared assets/js components (G40-315)
```

## What G40-320 changed

- **Created `draft-content/`** (+ README) — the staging area from the target tree.
- **Consolidated CSS/JS under `assets/`** — moved the four loose root source files
  (`gopher-ai-engine.css`, `3-pill-css.css`, `gopher-ai-engine.js`, `gopher-iq-data.js`) into
  `assets/css/` and `assets/js/`. Only `gopher-iq-data.js` is loaded via `<script src>` (4 pages,
  refs updated); the engine CSS/JS are inlined into pages, so their standalone files are just
  canonical sources. **0 broken refs**, verified in browser (`GopherIQData.lookup` still works).
- **Archived 4 unreferenced spare images** (`Frustrated.png`, `Realtor-SEO.png`,
  `gopher-deliver-beer.png`, `gopher-usa-map.gif`) into `assets/img/originals/`.

## Naming convention (applied to all externalized assets)

`<context>-<descriptor>[-<n>].<ext>` — lowercase, hyphenated.
- **context** = page slug (`connect`, `request`, `deals`, `cust-deals`, `go`, `go101`, `home`,
  `blog`, `story`, `tiers`), `shared` (used on 2+ pages), `wp`/`blog-` (localized from the old
  WordPress site), or a brand prefix (`gopher-*-logo`, `hero-*`, `badge-*`).
- **ext** = `.webp` for photos/screenshots, `.svg` for vector logos/icons, `.png` only where
  transparency/quality demands it, `.mp4` for video.
- Example good names: `connect-hero-img.webp`, `cust-deals-buoy-bowls.webp`, `go101-moving.webp`,
  `og-default.jpg`, `gopher-connect-logo.svg`.

## Live vs. spare (important for the dev)

- **Live:** everything under `assets/` (except `originals/`) + the root `.mp4` scene videos +
  the 133 `.html` pages.
- **Spare / not live deps:** `assets/img/originals/`, `draft-content/`, and the repo-root asset
  packs (`source-images/`, `source-assets/`, and the six Deals merchant-logo folders) — high-res
  masters/spares for the rebuild, safe to drop from the served tree.

## Left for the dev rebuild (deliberately not moved now)

- **Root `.mp4` scene videos** (~13, e.g. `Beer-Delivery.mp4`, `Handyman.mp4`, `Movers.mp4`) are
  still at `Final/` root. They're referenced case-exactly by many pages/the engine; moving them to
  `assets/video/` is a clean rebuild step but was **deliberately deferred** — it touches many pages
  and the working tree currently has a **concurrent go101 refactor** in flight, so a big cross-page
  move now would risk clobbering it or a partial-deploy. Recommend: move root media → `assets/video/`
  + `assets/img/` during the rebuild.
- **Generic auto-named images** (`connect-img-N`, `request-img-N`, `shared-img-N`) remain — these are
  UI-fragment screenshots with no clear semantic content (no alt/context at externalization time).
  They're valid and page-prefixed; renaming them well needs a visual pass. Low priority; acceptable
  as-is or polish in a focused follow-up.
- **`gopher-go-101.html`** — the concurrent refactor owns it; its SEO block (G40-319) and any naming
  touch-ups should be applied once that lands.

## Deploy reminder

Everything under `Final/assets/{img,css,js,video}` is now a hard dependency. **Deploy the whole
`Final/` tree** (ideally from a git commit) — a partial deploy that omits `assets/` breaks styling,
header/footer, and images (see the G40-315 header incident).
