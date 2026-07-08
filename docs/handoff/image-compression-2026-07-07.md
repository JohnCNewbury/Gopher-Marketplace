# Image compression & resize (G40-314)

_Done 2026-07-07. Part of Epic **G40-312** (website scale/production-readiness). Follows G40-313 (base64 externalization)._

## Summary

Compressed/resized the externalized image assets in `Final/assets/img/`. **~6.1 MB saved.**

| Metric | Value |
|---|---|
| Raster files → WebP (q82) | **83** files, **4.42 MB** saved |
| Large Figma SVGs → composited WebP | **2** files (918 KB + 875 KB → 52 KB + 72 KB), **1.67 MB** saved |
| Live `assets/img/` footprint | ~12 MB → **6.2 MB** (excl. `originals/` archive) |
| Site references updated | 330 refs across 118 files |
| Broken / missing refs after | **0** (verified site-wide) |

## What was done

- **PNG/JPG/GIF → WebP q82**, alpha preserved, longest side capped at **1400 px** (only trimmed the 1600 px Connect hero JPGs). Biggest wins: `deals-on-the-gopher-request-home-page` 621 KB→73 KB, `request-home` 522 KB→50 KB, `deals-bidrottrack` 514 KB→62 KB, `request-in-progress` 394 KB→42 KB. The most-repeated assets — the App Store / Google Play badges (referenced on 100+ pages) — converted once and re-referenced everywhere.
- **Two large deals-page Figma SVGs** were vector wrappers around layered base64 rasters (a full-canvas background + one inset screenshot). Composited to flat WebP with Pillow (background stretched to canvas + inset resized into its sub-rect) and **visually verified pixel-identical** to the SVG in-browser before swapping.
- **Kept as-is** where WebP wasn't smaller: `04-labor.jpg`, `go-gg-share-label.png`; `story-pin.gif` (101-frame animation — animated WebP was larger); `cust-deals-img.gif` (1×1 tracking spacer).

## Tooling note

Done with **Pillow 11.3** (WebP q82, LANCZOS resize). No `cwebp`/`ffmpeg`/ImageMagick available in the environment.

## Not done here (flag for follow-up / dev)

- **Video not compressed.** `Final/assets/video/services-clip-1..18.mp4` (~3.4 MB, from G40-313) is untouched — needs `ffmpeg` (unavailable here) to re-encode/right-size. Low priority (avg ~190 KB/clip). A production build step should transcode these (e.g. H.264/VP9 + poster frames).
- **`originals/` archive** (~22 MB, full-res masters from prior + current cleanup) is not part of the live site — dev can drop it or keep as source.
- **Naming polish** for generic auto-named files (`connect-img-N`, `shared-img-N`) remains **G40-320**.

## Provenance

Pre-compression raster bytes recoverable from git HEAD (base64 in the pre-G40-313 HTML) and the session backup. WebP re-encode is lossy at q82 — visually verified on deals/connect/customer-deals/services.
