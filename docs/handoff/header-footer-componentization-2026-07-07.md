# Shared header/footer componentization (G40-315)

_Done 2026-07-07. Part of Epic **G40-312** (scale/production-readiness). Owner chose **client-side include**._

## What changed

The site header and footer were **duplicated inline on every page** (~25 KB of header CSS+JS per page, plus ~5.8 KB of static footer HTML). They are now **shared client-side components** loaded once and cached.

| | Before | After |
|---|---|---|
| Header | inline `<style id="gopher-header-css">` (~9 KB) + `<script id="gopher-header-js">` (~16.5 KB) on **124 pages** | `assets/js/gopher-header.js` (26 KB, cached once) |
| Footer | static `<footer>` (~5.8 KB) duplicated on **108 pages** | `assets/js/gopher-footer.js` (6.5 KB, cached once) |
| **HTML removed** | — | **~3.6 MB** across the site |
| Broken/missing refs | — | **0** (verified site-wide + in browser) |

## How it works

**Header** — every content page includes:
```html
<script>window.GopherHeader = { logo: 'connect' };</script>   <!-- branded pages only -->
<script src="assets/js/gopher-header.js" defer></script>
```
The script injects the header CSS (`<style id="gopher-header-css">`) and builds `<header class="gh-header">`. Default logo unless a page sets `window.GopherHeader.logo` first. Valid logos: `request`, `connect`, `go`, `customerDeals`, `merchantDeals` (default = main Gopher).

**Footer** — pages place a mount point where the footer goes:
```html
<div id="gopher-footer"></div>
<script src="assets/js/gopher-footer.js" defer></script>
```
The script replaces the mount with the full footer markup.

## Rollout detail

- **Header: 124 pages.** Built the shared file from the **canonical inline block** (the version on 121 pages — the newest, with the `LOGIN_HASH` feature and correct `assets/img/gopher-*-logo.svg` paths), not the stale standalone `gopher-header.html`. `gopher-connect`/`gopher-request` (2-page variant) and `gopher-request-101` (older variant with an external logo URL) were reconciled onto the canonical component — verified their branded logos are byte-identical, so no visual change; request-101 was upgraded off its external `gophergo.io/wp-content` logo dependency.
- **Footer: 108 pages** (the canonical static footer). 18 pages keep their own footer (branded: deals/customer-deals/connect/request/request-101; plus a 14-page variant used by blog/contact/faqs/etc.) — left inline, flagged below.
- **Cleanup:** removed 5 duplicate logo SVGs (`shared-gf-inner/url-lock/img-2/img-10/img-4.svg`) that G40-313 had externalized from connect/request's inline base64 — they were byte-identical to the existing `gopher-*-logo.svg`; refs repointed.
- **External dependency removed:** the footer brand logo pointed at `https://gophergo.io/wp-content/uploads/2024/01/Hero-Logo-Peek-1.png`. Downloaded, converted to `assets/img/gopher-logo-footer.webp` (transparent, 480px), and repointed — so the footer no longer depends on the WordPress site being replaced. (Social links in the footer remain external, as intended.)
- The old standalone `gopher-header.html` / `gopher-footer.html` were **stale** (different from what pages rendered). Replaced with pointer stubs → the canonical `assets/js/*.js`.

## Verified in browser

Header renders + branded logos correct (default service page, deals, connect, request, request-101); Deals dropdown toggles (`aria-expanded`, menu items); footer injects styled (navy bg, 22 links) with the localized logo; no console errors; no 404s for the shared JS.

## Notes / flagged for dev

- **SEO caveat (as accepted):** header nav + footer links are now JS-injected. Googlebot renders JS so they remain discoverable, but the **production rebuild should use real server/build-time components** for the strongest crawlability. The per-page SEO `<head>` (title/description/canonical/OG — G40-319) stays inline and is unaffected.
- **18 branded/variant footers** remain inline. If desired, a follow-up can parameterize the footer (like the header's logo config) to fold these in; left as-is to avoid changing branded pages.
- **index.html, gopher-go.html, gopher-iq-sandbox-standalone.html** use bespoke headers (not the `gh-header` component) — intentionally not touched.
