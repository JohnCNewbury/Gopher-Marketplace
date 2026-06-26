# Shared Header/Footer Chrome Dedup — Manifest

_Executed: 2026-06-26 · Front-end asset externalization only (no backend, no markup logic changes)._
_Companion: [base64-image-plan.md](base64-image-plan.md) (plan of record) · [base64-image-manifest.csv](base64-image-manifest.csv) (original survey)._

## What was done

The 7 highest-duplication chrome blobs (brand logos + app-store badges) that were
embedded as inline base64 on 100+ pages each were extracted to single shared external
files in `assets/img/` and every inline copy replaced with a **relative, case-exact**
reference. Each instance was verified **byte-identical (sha256)** before being collapsed
into one file.

**Result: 862 inline base64 instances → 7 shared files. 16.76 MB of base64 text removed
from the HTML; 7 files (106.8 KB) stored once and browser-cached across the site.**

| Metric | Value |
|---|---|
| Pages touched | **127** |
| Inline base64 instances removed | **862** |
| HTML bytes removed | **17,579,235 (16.76 MB)** |
| External files created | **7 (109,325 B / 106.8 KB)** |
| Net reduction | **16.66 MB** |
| Inline chrome base64 remaining site-wide | **0 (verified)** |

## Assets externalized

| Manifest id | Asset | sha256 | Inline location | Instances | Decoded | External file |
|---|---|---|---|---|---|---|
| img-006 | Gopher logo (default `src`) | `7f571ac3…a30ffc8` | header-JS map + static footer | 145 | 9,852 B | `assets/img/gopher-logo.svg` |
| img-002 | Gopher Request logo | `88f7cc69…dd35f3` | header-JS map | 125 | 18,978 B | `assets/img/gopher-request-logo.svg` |
| img-003 | Gopher Connect logo | `d0b82041…e6ec45` | header-JS map (+1 static) | 126 | 18,770 B | `assets/img/gopher-connect-logo.svg` |
| img-004 | Gopher Deals logo | `2828a8e7…161629` | header-JS map | 125 | 17,547 B | `assets/img/gopher-deals-logo.svg` |
| img-017 | Gopher Go logo | `74d6804e…b204ca` | header-JS map | 125 | 3,373 B | `assets/img/gopher-go-logo.svg` |
| img-005 | App Store badge (398×114) | `9a29ce0d…6f075d` | static HTML | 108 | 18,806 B | `assets/img/badge-app-store.png` |
| img-001 | Google Play badge (398×114) | `212191c3…08eeda` | static HTML | 108 | 21,999 B | `assets/img/badge-google-play.png` |

All five SVG logos live in the per-page `<script id="gopher-header-js">` boot script as a
five-entry logo map (`src`/`request`/`connect`/`go`/`deals`), selected at runtime via
`window.GopherHeader.logo` — so all five sit on ~125 pages regardless of which one each
page displays. The two app badges live in static body HTML (the "download the app"
sections). The default Gopher logo (img-006) additionally appears in static footers.

## Conventions followed

- External files in `assets/img/`, relative `src`/href (never root-absolute), exact-case
  filenames verified against the file created on disk (per `CLAUDE.md` / GitHub Pages
  subdirectory + Linux rules).
- SVG logos kept as **vector `.svg`** (not converted) per the plan.
- App-store badges kept as **PNG** (externalized as-is). The plan suggested an optional
  PNG→WebP conversion; it was skipped by request — the dominant win is deduplication
  (108 copies → 1), and the badges are the official artwork. No `originals/` entry is
  needed because the served PNG **is** the original (no derivative).
- No backend-reserved areas touched (payments / auth / database / matching / security);
  no unrelated changes (duplicate-element-ID issue left as-is).

## Divergences from the survey (noted, then acted on)

1. **Manifest `hash` column is not sha256** — its short hashes (e.g. `cb606220734e` for
   img-001) did not match the actual sha256 (`212191c3f63c…`). Byte-identity here was
   re-verified with real sha256, not the manifest's id hash.
2. **Manifest instance counts were stale by 1** — its page lists still include the
   since-deleted `e-waste-removal_1.html`. True current counts (used above) are −1 for the
   six assets that were on that page (img-006 was never on it, so it was unaffected).
3. **No shared external header/footer JS exists** — the header/footer are inline-duplicated
   per page (`<script id="gopher-header-js">` / static footer), so this was a per-page
   sweep, not a single-file fix. (The single-shared-component refactor remains a rebuild
   item — see [component-structure.md](component-structure.md).)

## Files created

```
assets/img/gopher-logo.svg            9,852 B
assets/img/gopher-request-logo.svg   18,978 B
assets/img/gopher-connect-logo.svg   18,770 B
assets/img/gopher-deals-logo.svg     17,547 B
assets/img/gopher-go-logo.svg         3,373 B
assets/img/badge-app-store.png       18,806 B
assets/img/badge-google-play.png     21,999 B
```

## Still pending (separate from this chrome pass)

Lower-duplication shared blobs (2–3 pages each, e.g. connect/request UI images) and the
big page-specific raster on `gopher-deals.html` / `gopher-connect.html` / etc. remain
inline — these are the other batches in [base64-image-plan.md](base64-image-plan.md), not
part of the header/footer chrome dedup.
