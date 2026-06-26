# Broken Reference Audit — Gopher Marketplace

**Status: 🟡 PARTIALLY RESOLVED — 22 references fixed, 23 remaining (14 of those are intentional / out-of-scope)**

_Original audit: 2026-06-24 · Remediation pass: 2026-06-24 · Service-page pass: 2026-06-24_
_Scope: all `href`, `src`, `srcset`, `poster`, CSS `url()`, and `fetch()` / XHR
references across the 133 HTML pages plus `gopher-ai-engine.js` and the CSS files
under `Final/` (the GitHub Pages site root)._

The original audit found **45** broken internal references. Remediation resolved
**22** (a first safe-fix pass of 20, plus 2 more after two new service pages were
created). Of the **23** remaining, **14** are intentionally left alone
(commented-out demo backend calls + Leaflet icons now served from a CDN) and **9**
are the 8 hero-clip files + 1 optional shared-header script that must be created by
hand (tracked in [missing-files.md](missing-files.md)).

---

## ✅ Resolved by creating the two missing service pages (2 references)

| Referencing file | Line | Was | Now | Type |
|---|---|---|---|---|
| `Final/gopher-services.html` | 1208 | `last-minute-runs.html` (missing) | Page created (cloned from `errand-running.html`, Delivery & Errands category) | missing → created |
| `Final/gopher-services.html` | 1263 | `yard-work.html` (missing) | Page created (cloned from `yard-cleanup.html`, Yard & Outdoor category) | missing → created |

Both new pages reuse the shared header/footer/CSS verbatim, use relative paths only,
match on-disk filename casing, and introduced **no** new broken references. Hero images
and any spots needing final content are marked `[PLACEHOLDER]`.

## ✅ Resolved in the first safe-fix pass (20 references)

| Referencing file | Line(s) | Was | Now | Type |
|---|---|---|---|---|
| `Final/gopher-contact-us.html` | 310 | `/hire-a-gopher/gopher-request-support/` | `gopher-request.html` | wrong-path |
| `Final/gopher-contact-us.html` | 311 | `/become-a-gopher/gopher-go-support/` | `gopher-go.html` | wrong-path |
| `Final/gopher-request.html` | 772 | `/trustshield` | `gopher-trustshield.html` | wrong-path |
| `Final/gopher-services.html` | 1189 | `/services/delivery/` | `#cat-delivery` | wrong-path |
| `Final/gopher-services.html` | 1220 | `/services/home_services/` | `#cat-home_services` | wrong-path |
| `Final/gopher-services.html` | 1257 | `/services/yard_work_outdoor_projects/` | `#cat-yard_work_outdoor_projects` | wrong-path |
| `Final/gopher-services.html` | 1290 | `/services/moving/` | `#cat-moving` | wrong-path |
| `Final/gopher-services.html` | 1318 | `/services/junk_removal/` | `#cat-junk_removal` | wrong-path |
| `Final/gopher-services.html` | 1345 | `/services/hourly_day_labor/` | `#cat-hourly_day_labor` | wrong-path |
| `Final/gopher-services.html` | 1374 | `/services/ride_sharing/` | `#cat-ride_sharing` | wrong-path |
| `Final/gopher-faqs.html` | 793, 799, 948 | `gopher-terms.html` | `gopher-terms-of-service.html` | missing → rewired |
| `Final/gopher-privacy.html` | 762 | `gopher-terms.html` | `gopher-terms-of-service.html` | missing → rewired |
| `Final/gopher-prohibited-list.html` | 623, 763 | `gopher-terms.html` | `gopher-terms-of-service.html` | missing → rewired |
| `Final/gopher-request.html` | 9044 | `scenes/delivery.mp4` | `Packed-Delivered.mp4` | missing → rewired |
| `Final/gopher-request.html` | 9045 | `scenes/mowing.mp4` | `Teen-Lawn-Mower.mp4` | missing → rewired |
| `Final/gopher-request.html` | 9046 | `scenes/handyman.mp4` | `Handyman.mp4` | missing → rewired |
| `Final/gopher-request.html` | 9047 | `scenes/groceries.mp4` | `Grocery-Delivery.mp4` | missing → rewired |
| `Final/gopher-deals.html` | 1878, 1883, 1926 | `images/layers.png`, `images/layers-2x.png`, `images/marker-icon.png` | Leaflet CDN (CSS+JS added) | missing → CDN |
| `Final/gopher-customer-deals.html` | 1876, 1881, 1924 | `images/layers.png`, `images/layers-2x.png`, `images/marker-icon.png` | Leaflet CDN (CSS+JS added) | missing → CDN |

**Notes on the fixes**

- **Service category links** (`/services/<cat>/`) were converted to in-page anchors
  (`#cat-<cat>`) because each slug exactly matches an existing `id="cat-<cat>"`
  section on the same `gopher-services.html` page.
- **Scene videos** in `gopher-request.html` are inside a commented-out hero block, but
  were rewired anyway so the markup is correct if/when that block is restored. The new
  filenames match the on-disk casing exactly (Linux-safe).
- **Leaflet icons:** rather than create local image files, the official Leaflet 1.9.4
  CDN `<link>` (CSS) and `<script>` (JS) were added to both deals pages, placed **after**
  the inline Leaflet CSS so the CDN's `images/…` rules win the cascade and resolve to
  the CDN-hosted icons. The old `url(images/…)` lines still exist in the inline CSS
  text (so the audit regex still lists them — see below) but they are overridden and
  never fetched at runtime. _This depends on the CDN's SRI integrity hashes being valid;
  if they fail, the resources are blocked and the icons would fall back to the broken
  local paths._

---

## ⏳ Remaining references (23)

### Intentionally left as-is (14) — no action wanted

| Referencing file | Line(s) | Reference | Why it's left |
|---|---|---|---|
| `2-engine-js-block.html`, `gopher-ai-engine.js`, `gopher-faqs.html`, `gopher-iq-sandbox-standalone.html`, `gopher-request.html`, `gopher-services.html`, `index.html` | 795 / 777 / 1905 / 1250 / 15034 / 2612 / 3376 | `/api/analyze-upload` (×7) | Commented-out demo backend call; no backend exists (out of scope). |
| `gopher-request.html` | 19847 | `/api/feedback` | Commented-out demo backend call; out of scope. |
| `gopher-deals.html`, `gopher-customer-deals.html` | 1876–1926 | `images/layers.png`, `images/layers-2x.png`, `images/marker-icon.png` (×6) | **Resolved at runtime via the Leaflet CDN** (above). The literal text remains in the inline CSS; optional future cleanup, not a live 404. |

### Must be created by hand (9) — see [missing-files.md](missing-files.md)

| Referencing file | Line(s) | Reference | Type |
|---|---|---|---|
| `gopher-connect.html` | 6698–6711 | `hero-media/clip-1…4.{webm,mp4}` (×8) | missing — MUST CREATE |
| `gopher-header.html` | 20 | `gopher-header.js` | missing — optional/future (referenced only inside an HTML comment; not a live 404) |

> The two missing service pages (`last-minute-runs.html`, `yard-work.html`) have now
> been created — see the "Resolved by creating the two missing service pages" section above.

---

## Summary

| | Original | Fixed | Remaining |
|---|---|---|---|
| `wrong-path` | 18 | 10 | 8 (all `/api/*` demo, out of scope) |
| `missing` | 27 | 12 | 15 (6 Leaflet → CDN; 8 hero clips; 1 comment-only) |
| `wrong-case` | 0 | — | 0 |
| `no-extension` | 0 | — | 0 |
| **Total** | **45** | **22** | **23** |

Of the 23 remaining, only the **8 hero-clip files** represent real outstanding work
(plus 1 optional shared-header script). Everything else is either intentional demo
code or already resolved at runtime via the Leaflet CDN. The two missing service
pages have been created.
