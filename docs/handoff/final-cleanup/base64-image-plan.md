# Base64 Image Extraction Plan — Gopher Marketplace

_Generated: 2026-06-24 · Read-only survey — no site files were modified._
_Companion data: **[base64-image-manifest.csv](base64-image-manifest.csv)** — all 168 unique images, sorted by total site footprint, with the page list and recommended action for each._

This sizes the work to move base64-embedded images out of the HTML into external,
deduplicated, mostly-WebP assets. **The dominant problem is duplication, not
compression** — the single biggest win is extracting shared images once.

---

## ✅ Progress (updated 2026-06-25)

**Done — content-image batch (19 images, 5 pages, ~4.9 MB of base64 removed).** A first
swap phase extracted the exact matches and the high-confidence distance-0 upgrades from
[asset-match-report.md](asset-match-report.md): 4 exact JPEGs (byte-for-byte) + 7 HQ
masters + 8 hero pics → WebP. Externalized files are in `Final/assets/img/`; full-res
masters archived in `Final/assets/img/originals/`. Per-page HTML reduction:

| Page | Before → After | Removed |
|---|---|---|
| `gopher-customer-deals.html` | 4.9 MB → 2.0 MB | 2.9 MB |
| `gopher-blog.html` | 1.3 MB → 395 KB | 959 KB |
| `index.html` | 1.3 MB → 768 KB | 603 KB |
| `gopher-request.html` | 2.9 MB → 2.6 MB | 287 KB |
| `gopher-our-story.html` | 1.7 MB → 1.5 MB | 211 KB |
| **Total** | | **~4.9 MB** |

**✅ Done — shared header/footer chrome deduplication (2026-06-26).** The 7
highest-duplication chrome blobs (5 brand logos + 2 app-store badges, embedded on 100+
pages each) were externalized to single shared files in `assets/img/` and all **862**
inline base64 copies replaced with relative, case-exact references — **16.76 MB of base64
text removed** from the HTML across **127 pages**, collapsing to 7 cached files (106.8 KB).
Zero inline chrome base64 remains. Full detail: **[chrome-dedup-manifest.md](chrome-dedup-manifest.md)**.

**⛔ Still pending:** the page-specific raster across the other heavy pages
(`gopher-deals.html`, `gopher-connect.html`, etc.), the lower-duplication shared blobs
(2–3 pages each), the remaining SVG externalization, and the GIF→animated-WebP/MP4
conversion. The plan below remains the roadmap for that work.

---

## Survey results

### Totals by type
| Type | Instances (data: URIs) | Unique images |
|---|---|---|
| SVG (`image/svg+xml`) | 682 | 15 |
| PNG | 305 | 63 |
| WebP | 61 | 50 |
| JPEG | 40 | 38 |
| GIF | 3 | 2 |
| **Total** | **1,091** | **168** |

**Total decoded base64 weight: 27.4 MB** (≈36 MB as base64 *text* in the HTML — base64 is ~33% larger than the binary it encodes).

### Duplication is the headline
Only **168 of 1,091 blobs are unique**; **923 are duplicates**. The same images (the
shared header/footer chrome) are re-embedded page after page.
**Deduplicating alone saves 14.3 MB**, before any recompression.

Most-duplicated blobs (shared logos / social icons / app-store badges):

| Copies | Size each | Type | Wasted across site |
|---|---|---|---|
| ×127 / ×126 / ×126 | ~18 KB | SVG (logos/icons) | ~2.3 MB each |
| ×109 | 21.5 KB | PNG (app badge) | 2.3 MB |
| ×109 | 18.4 KB | PNG | 1.9 MB |
| ×145 | 9.6 KB | SVG | 1.4 MB |

### 10 largest individual blobs (unique, page-specific content)
| Approx decoded | Type | Page |
|---|---|---|
| 897 KB | SVG | gopher-deals.html |
| 855 KB | SVG | gopher-deals.html |
| 822 KB | PNG | gopher-customer-deals.html |
| 753 KB | PNG | gopher-customer-deals.html |
| 670 KB | PNG | gopher-customer-deals.html |
| 659 KB | GIF | gopher-our-story.html |
| 607 KB | PNG | gopher-deals.html |
| 502 KB | PNG | gopher-deals.html |
| 452 KB | JPEG | gopher-connect.html |
| 343 KB | JPEG | gopher-connect.html |

### Heaviest 10 pages by base64 weight
| Page | Base64 weight |
|---|---|
| gopher-customer-deals.html | 3.5 MB |
| gopher-deals.html | 3.4 MB |
| gopher-connect.html | 3.2 MB |
| gopher-request.html | 1.2 MB |
| gopher-our-story.html | 1.1 MB |
| gopher-blog.html | 938 KB |
| index.html | 761 KB |
| gopher-services.html | 661 KB |
| gopher-go.html | 263 KB |
| gopher-go-101.html | 246 KB |

### Unique asset library (what you actually store, after dedupe)
**13.1 MB across 168 files:** PNG 63 (5.9 MB), JPEG 38 (3.5 MB), SVG 15 (1.9 MB),
WebP 50 (1.2 MB), GIF 2 (659 KB). Of this, **11.2 MB is raster (WebP targets)** and
**1.9 MB is SVG**.

---

## The plan

### ✅ Extract → external WebP (raster only) — 101 files, 9.4 MB
PNG + JPEG blobs (and the 2 GIFs, see below). PNG/JPEG → WebP typically shrinks
**25–50%** → roughly **6–8 MB**. The big page-specific images on deals /
customer-deals / connect / our-story are the highest-value individual conversions.

### ✅ Extract → external as-is (already WebP) — 50 files, 1.2 MB
Just externalize and dedupe; **do not re-encode**.

### ✅ Extract → shared external files (the real win: dedupe)
The header/footer chrome (logos, social icons, app-store badges) embedded on 100–145
pages each becomes **one file per asset**, referenced everywhere and browser-cached
across the site. This is the **14.3 MB** duplication saving and dovetails with the
component plan in [component-structure.md](component-structure.md). In the manifest,
these rows are flagged `SHARED→one shared file`.

### ✅ Extract SVGs as `.svg`, NOT WebP — 13 files, ~200 KB
The smaller unique SVGs are logos/illustrations — keep them **vector** as external
`.svg`. Converting vector→WebP loses scalability and often grows the file. (WebP
conversion is raster-only.)

### ⛔ Leave inline / handle specially
- **Inline `<svg>` markup** (button arrows, chevrons, e.g. `<svg viewBox="0 0 24 24">`) —
  these are NOT data: URIs and are not in the 1,091 count. Splitting tiny icons into
  files adds requests for no benefit; **keep inline**.
- **Leaflet / map-control SVGs and any JS-generated/data-logic SVGs** — leave them;
  Leaflet now loads from CDN and supplies its own icons.
- **The 2 large "SVGs" on gopher-deals.html (~850–900 KB each, 1.7 MB)** — flagged
  `INSPECT` in the manifest. An SVG that large likely wraps embedded raster data. If
  truly vector → keep as `.svg`; if it wraps a raster → pull the raster out as WebP.
- **The 659 KB GIF on gopher-our-story.html** (likely animated) → convert to
  **animated WebP or a short muted MP4**, not a static WebP.

### Suggested extraction workflow
1. Set up an `assets/img/` folder. Give each of the 168 unique images a stable name
   (the manifest's `hash`/`id` columns disambiguate identical blobs).
2. Decode each unique blob once; convert raster → WebP, keep SVG as `.svg`, keep
   existing WebP as-is, special-case the GIF and the 2 large SVGs.
3. Replace every `data:` URI in the HTML with a relative `src="assets/img/…"` —
   **relative paths, exact-case filenames** (subdirectory + Linux rules from
   [broken-references.md](broken-references.md)).
4. Shared chrome images resolve to the same file on every page (cached after first load).

---

## Expected size reduction

| Stage | Footprint |
|---|---|
| Today — base64 text inlined across 133 pages | ~36 MB (27.4 MB decoded) |
| After dedupe + externalize (no recompress) | **13.1 MB** unique, cached across pages |
| After raster → WebP on top | **~8–9 MB** total |

**Net: ~36 MB of repeated inline base64 → ~8–9 MB of cacheable external assets (~75%
reduction).** The heavy pages (customer-deals, deals, connect) each shed 3+ MB. The
single biggest lever is **deduplication**, not per-image compression.

---

## Manifest reference

[base64-image-manifest.csv](base64-image-manifest.csv) columns:
`id, mime, decoded_bytes, decoded_human, instances, distinct_pages, shared,
footprint_bytes, recommended_action, example_page, all_pages, hash`.

Rows are sorted by `footprint_bytes` (total bytes the image costs across the whole
site = size × instances), so the top rows are the highest-impact extractions —
typically the shared chrome (many copies) followed by the big page-specific content
images.
