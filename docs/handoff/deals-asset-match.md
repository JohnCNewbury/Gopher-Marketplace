# Deals Asset Match Report — Gopher Marketplace

_Generated: 2026-06-26 · Read-only matching report — no HTML or images were modified._

Cross-references six newly-added image folders against the imagery the Deals pages
actually use. Matching combines **filename↔merchant-name** (casing/spacing/HTML-entity
normalized, e.g. `John&#x27;s Deli` → "john's deli") with **perceptual hashing** (pHash
via Pillow/imagehash, same method as [asset-match-report.md](asset-match-report.md)) and
**word-boundary text references** across all pages.

## Source folders (repo root, outside `Final/`)

`Age-Restricted/`, `Convenience Store/`, `Restaurants & Food Trucks/`,
`Local Favorites/`, `Service Providers/`, `Home Screen/` — **35 image files** total
(plus `.DS_Store` junk, ignored). Several filenames are misspelled (`Carlolina Cellars`,
`Triange Vine`, `Bass lack QuickMart`, `Frankie Fannkks`) — accounted for below.

## What the Deals pages actually use

- **`gopher-customer-deals.html` embeds 23 merchant logos** as base64 `<img>` with
  `alt="<merchant>"` (each appears 2×: deal grid + map popup). They are **small
  thumbnails** — 150×150 square or 225×150 landscape, ~11–46 KB each.
- **`gopher-deals.html` embeds NO merchant logos** — its base64 images are UI/illustration
  only. Merchant/provider names there (e.g. "John Newbury") are demo **data/text**,
  rendered without photos.

---

## 1. NEEDED & MISSING

A page references a merchant/provider **by name** with **no embedded image**, and a folder
supplies it. (Note: `gopher-deals.html` and the provider pages render these as
text/initials today — the folder file would fill a referenced-but-imageless slot.)

| Folder file | Size | Referenced on | What it is | Confidence |
|---|---|---|---|---|
| `Service Providers/John Newbury.JPG` | 92.9 KB | `gopher-deals.html` (×3, e.g. `<span class="mpf-svc-pro">John Newbury</span>`, "founder John Newbury") | Provider/owner headshot, shown as name only | **High** (exact, distinctive name) |
| `Service Providers/Tidy Triangle.png` | 2.3 MB | `gopher-connect.html` + `gopher-request.html` (×1 each) | Service-provider logo named in provider copy, no image | Med (distinctive phrase; verify it isn't shown as initials) |
| `Service Providers/Southern Flow 1.png` | 16.8 KB | `gopher-connect.html` + `gopher-request.html` (×1 each) | Provider logo named, no image | Med |
| `Service Providers/Yard U.png` | 4.0 KB | `gopher-connect.html` + `gopher-request.html` (×1 each) | Provider logo named, no image | Med |
| `Service Providers/GreenShield Pest Control.png` | 2.2 MB | `gopher-connect.html` + `gopher-request.html` (×1 each) | Provider logo named, no image | Med |

> These are **provider** mentions, not the 23 Deals merchants. Only `John Newbury` is on a
> Deals page; the other four are on the provider-facing connect/request pages (included
> because they reference provider imagery). None is a hard blocker — they currently render
> without a picture.

---

## 2. QUALITY UPGRADE

A folder file is a **higher-resolution master** of a logo already embedded (as a tiny
thumbnail) on `gopher-customer-deals.html`. **All 23 embedded Deals merchants have a
high-res counterpart** in these folders. Confidence: `high` = exact name + low perceptual
distance; `med` = exact name but the embedded thumbnail is a **landscape crop** of the
master (so pHash diverges while the merchant is certain). "before" = embedded thumbnail,
"after" = folder master.

| Folder file | Master (after) | Embedded (before) | pHashΔ | Confidence |
|---|---|---|---|---|
| `Age-Restricted/Bombshell.png` | 306 KB / 866² | `Bombshell` 21.4 KB / 150² | 2 | high |
| `Age-Restricted/Triangle Vine.png` | 2.3 MB / 1536×1024 | `Triangle Vine` 23.9 KB / 225×150 | 6 | high |
| `Convenience Store/QuickStop.png` | 2.0 MB / 1536×1024 | `QuickStop` 21.4 KB / 225×150 | 8 | high |
| `Restaurants & Food Trucks/Buoy Bowls.png` | 109 KB / 364² | `Buoy Bowls` 32.7 KB / 150² | 0 | high |
| `Restaurants & Food Trucks/Frankie Fannkks.png` | 175 KB / 1313×587 | `Frankie Fannkks` 46.1 KB / 336×150 | 6 | high |
| `Restaurants & Food Trucks/My Way.png` | 16.6 KB / 178² | `My Way Tavern` 12.5 KB / 150² | 0 | high (name variant; pHash-confirmed) |
| `Home Screen/Circle G.png` | 1.3 MB / 1024² | `Circle G` 11.3 KB / 150² | 8 | high |
| `Home Screen/Triangle Handyman.png` | 1.5 MB / 1254² | `Triangle Handyman` 39.2 KB / 150² | 2 | high |
| `Age-Restricted/Ember Cigar Lounge.png` | 2.1 MB / 1536×1024 | `Ember Cigar Lounge` 26.1 KB / 225×150 | 16 | med (landscape crop) |
| `Convenience Store/Cardinal.png` | 2.7 MB / 1536×1024 | `Cardinal` 41.4 KB / 225×150 | 20 | med |
| `Convenience Store/GoPantry.png` | 2.1 MB / 1536×1024 | `GoPantry` 28.4 KB / 225×150 | 10 | med |
| `Restaurants & Food Trucks/La Cocina.png` | 2.2 MB / 1536×1024 | `La Cocina` 17.2 KB / 225×150 | 24 | med |
| `Local Favorites/Bass Lake Outfitters.png` | 2.2 MB / 1536×1024 | `Bass Lake Outfitters` 34.0 KB / 225×150 | 26 | med |
| `Local Favorites/Hatch Coffee.png` | 1.9 MB / 1024² | `Hatch Coffee` 37.8 KB / 150² | 16 | med |
| `Local Favorites/Holly Springs Market.png` | 2.3 MB / 1536×1024 | `Holly Springs Market` 23.2 KB / 225×150 | 14 | med |
| `Local Favorites/Sugarbird.png` | 2.2 MB / 1536×1024 | `Sugarbird` 18.8 KB / 225×150 | 16 | med |
| `Local Favorites/Videri.png` | 2.2 MB / 1536×1024 | `Videri` 20.9 KB / 225×150 | 24 | med |
| `Home Screen/John's Deli.png` | 2.0 MB / 1024² | `John's Deli` 38.4 KB / 150² | 16 | med |
| `Home Screen/Mini Aussie Bottle Shop.png` | 2.8 MB / 1536×1024 | `Mini Aussie Bottle Shop` 37.9 KB / 225×150 | 22 | med |
| `Age-Restricted/Carlolina Cellars.png` *(filename typo)* | 2.2 MB / — | `Carolina Cellars` ~? / 225×150 | 22 | low-med (typo'd name; landscape crop) |
| `Convenience Store/Bass lack QuickMart.png` *(filename typo)* | 2.1 MB / — | `Bass Lake QuickMart` ~? / 225×150 | 14 | low-med (typo "lack"→"Lake") |

**Already present — NOT an upgrade** (folder copy ≈ the embedded one, same size; swapping gains nothing):
- `Restaurants & Food Trucks/diced.png` 7.4 KB/139×68 ≈ embedded `Diced` 8.9 KB/139×68 (Δ0)
- `Home Screen/Sand Savvy Rental.png` 7.2 KB/88² ≈ embedded `Sand Savvy Rental` 7.3 KB/88² (Δ0)

**Duplicate source:** `Local Favorites/Hatch Coffee.png` and `Home Screen/Hatch Coffee.png`
are **byte-identical** — keep one.

---

## 3. UNUSED / EXTRA

No counterpart referenced anywhere on the site (or a typo-duplicate / false-positive). Bank
these for the rebuild or discard.

| Folder file | Size | Why unused |
|---|---|---|
| `Age-Restricted/ChatGPT Image Jun 17, 2026 at 03_35_00 PM.png` | 2.2 MB | AI-dump filename; no merchant name; no real reference |
| `Age-Restricted/Triange Vine.png` *(typo)* | 409 KB | Smaller duplicate of `Triangle Vine` (the real upgrade source is the 2.3 MB file) |
| `Service Providers/Triangle.png` | 2.5 MB | "Triangle" matches only the **generic region word** ("the Triangle", "Triangle Vine/Handyman") — not a distinct merchant |
| `Service Providers/Peak.png` | 255 KB | "Peak" appears only inside **street addresses** ("pikes peak drive") — not a merchant |
| `Service Providers/APS.png` | 9.3 KB | No word-boundary reference ("aps" earlier matched substrings like "apps"/"maps") |
| `Service Providers/Dans Disposal.png` | 1.7 MB | Not referenced on any page |

---

## Summary

| Group | Files | Meaning |
|---|---|---|
| 1 — Needed & missing | 5 | Provider names referenced without a picture (1 on Deals: John Newbury; 4 provider mentions on connect/request) |
| 2 — Quality upgrade | 24 | High-res masters of the 23 embedded Deals logos (2 are equal/no-gain; 1 is a byte-dup) |
| 3 — Unused / extra | 6 | Junk name, typo-dup, and generic-word/address false positives |

### Plain-English verdict

**These folders are NOT required for the live site to work.** `gopher-customer-deals.html`
already ships **all 23 merchant logos** embedded inline (as small thumbnails), so the Deals
experience is visually complete today. What the folders actually are is a **high-resolution
upgrade pack**: source masters (mostly 1024–1536 px, 1–3 MB each) for those same 23 tiny
logos — exactly the kind of swap done in the earlier image phase, useful for a crisp/
responsive rebuild but optional for function. On top of that there are a **handful of
genuine gaps** (the `John Newbury` provider headshot on Deals, and four provider logos —
Tidy Triangle, Southern Flow, Yard U, GreenShield — named on the connect/request pages with
no picture), and about **six spare/junk files** (an AI-dump image, a typo duplicate, and
generic-word/address false positives). 

Bottom line: treat this as **spare/upgrade assets for the rebuild**, not a missing
dependency the current site needs to render.
