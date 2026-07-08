# CSS consolidation (G40-316)

_Done 2026-07-08. Part of Epic **G40-312** (scale/production-readiness)._

## Summary

Extracted the two large **duplicated** inline `<style>` blocks into shared, cached files under the new `Final/assets/css/` folder. **~2.25 MB of duplicated CSS removed** from the HTML.

| Block | Was | Now | Pages | Dedup |
|---|---|---|---|---|
| Service-detail CSS (`gopher-fd-css`) | inline `<style>` (~12 KB), identical | `assets/css/gopher-fd.css` | **107** service pages | ~1.29 MB |
| Footer CSS (`.gopher-footer`, anon block) | inline `<style>` (~7.7 KB), identical | `assets/css/gopher-footer.css` | **124** pages | ~0.95 MB |

Each inline block was replaced **in place** with a `<link rel="stylesheet">` so the cascade order is preserved. Neither block contains `url()` refs, so no path rewriting was needed.

## Notes

- The **header CSS** was already externalized in G40-315 (bundled into `assets/js/gopher-header.js`). Between G40-315 and G40-316, all three shared chrome pieces — header, footer markup, footer CSS, service CSS — are now single cached files instead of per-page copies.
- `assets/css/gopher-footer.css` is linked on **all 124** footer-bearing pages (both the 108 that use the `gopher-footer.js` component and the ~16 with inline/branded footers), so every footer is styled regardless of how its markup is produced.
- **Left inline (correct — page-specific, no dedup value):** `gd-portal-dashboard-styles` (~77 KB, 1 page), `gopher-services-css` (~21 KB, 1 page), `os-css` (~18 KB, 1 page), `gopher-age-css`, `veh-styles`, `rcpt-styles`, `gopher-iq-page-overrides`.
- **Minor, deferred:** `gopher-ai-engine-css-inline` (~16 KB on 5 pages, ~64 KB potential dedup) — a root `gopher-ai-engine.css` already exists but the inline copies may have drifted; left for a careful follow-up. Scattered inline `style=""` attributes also remain (low value, high effort) — a rebuild concern.

## Verified in browser

`assets/css/gopher-fd.css` + `assets/css/gopher-footer.css` load (no 404s); service page fully styled; footer navy background + 22 links on both a service page and a branded page (deals); header intact.

## Deploy note

Same as G40-315: these are external files — **the deploy must upload `Final/assets/css/`** or pages lose styling. Deploy the whole `Final/` tree (ideally from a git commit) to avoid partial-deploy gaps.
