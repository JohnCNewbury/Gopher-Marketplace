# External Asset ↔ Embedded Image Match Report — Gopher Marketplace

_Generated: 2026-06-25 · Read-only matching report — no HTML or images were modified._

Cross-references the **107 files in `source-images/`** against the **168 unique base64-embedded images** cataloged in [base64-image-manifest.csv](base64-image-manifest.csv). Use it to decide which embedded blobs can be replaced by an external file.

**Method.** *Exact* = byte-for-byte identical (MD5 of the decoded image bytes equal the decoded bytes of an embedded blob). *Likely* = perceptual hash (pHash) match within a distance threshold — same picture, different size/compression/format — found via Pillow + imagehash. Casing/spacing differences in filenames are irrelevant to hashing, so they don't affect matches. SVGs and videos can't be perceptually hashed (vector / not images), so for those only exact byte matches are possible.

> ⚠️ Perceptual nearest-neighbour can collide on visually similar app screenshots. Treat `med`/`low` confidence rows as *candidates to eyeball*, not certainties.

---

## ✅ Swap status (updated 2026-06-25)

**The exact matches and the high-confidence (distance-0) upgrades have been extracted.**
A content-image swap phase replaced **19 embedded blobs across 5 pages**, removing
**~4.9 MB of base64** from the HTML. Externalized files live in **`Final/assets/img/`**;
full-res masters are archived in **`Final/assets/img/originals/`** for the rebuild.

- ✅ **DONE — 4 EXACT** (Group 1): externalized byte-for-byte (no re-encode) as `.jpg`.
- ✅ **DONE — 15 high-confidence d0 upgrades** (Group 2): the 7 HQ masters + 8 hero pics,
  converted to web-sized WebP (capped ≤1600px, q82) with originals archived.
- ⏳ **OUTSTANDING — your call:** the 2 downgrades (`Blind Pelican`, `Buoy Bowls`) and all
  `med`/`low` "verify visually" rows were intentionally **left untouched**.
- ⛔ **Not part of this phase:** the shared header/footer chrome dedup (the big remaining
  lever) — see [base64-image-plan.md](base64-image-plan.md).

Per-row status is marked in the tables below.

## 1. EXACT MATCHES — safe, certain swaps ✅ DONE

**4 external files are byte-for-byte identical to an embedded blob.**

| External file | Embedded id | Size | Embedded on page(s) | Status |
|---|---|---|---|---|
| `05-junk.jpg` | img-059 | 61.6 KB | `gopher-request.html` | ✅ DONE → `Final/assets/img/05-junk.jpg` |
| `04-labor.jpg` | img-061 | 59.8 KB | `gopher-request.html` | ✅ DONE → `Final/assets/img/04-labor.jpg` |
| `06-yard.jpg` | img-064 | 55.8 KB | `gopher-request.html` | ✅ DONE → `Final/assets/img/06-yard.jpg` |
| `07-ride.jpg` | img-082 | 38.0 KB | `gopher-request.html` | ✅ DONE → `Final/assets/img/07-ride.jpg` |

_All four extracted **byte-for-byte (no re-encode)** and referenced via relative `assets/img/…` paths in `gopher-request.html` (a JS image-source map). Net: ~286.9 KB of base64 removed from that page._

## 2. LIKELY MATCHES — same image, not byte-identical · ✅ 15 of 27 extracted

**27 external files perceptually match an embedded blob.** `HQ` = the external file is clearly higher-resolution / less-compressed than the embedded copy (a better master to swap in). Where the external is *lower* res, it's noted — swapping would downgrade.

**Status:** the **15 high-confidence distance-0 upgrades** (7 HQ masters + 8 hero pics) were extracted to WebP (capped ≤1600px, q82) in `Final/assets/img/`, with full-res originals in `Final/assets/img/originals/`. The remaining 12 rows are **outstanding — your call**: `gopher-laptop.png` was skipped (near-identical, not an upgrade), the two ⛔ downgrades were left, and all `med`/`low` "verify visually" rows are untouched.

| Conf | External file | External (size / dims / fmt) | Embedded id | Embedded (size / dims / fmt) | Page(s) | Note | Status |
|---|---|---|---|---|---|---|---|
| high (d0) | `Redeem.png` | 3.2 MB / 2457×4096 / png | img-011 | 669.8 KB / 960×1600 / png | `gopher-customer-deals.html` | **HQ** external is higher-res master | ✅ DONE → `assets/img/redeem.webp` |
| high (d0) | `gopher-laptop.png` | 229.0 KB / 1500×963 / png | img-025 | 216.8 KB / 1500×963 / png | `gopher-services.html` | near-identical | ⏳ skipped — near-identical, not an upgrade |
| high (d0) | `Refer App.png` | 2.2 MB / 1536×1024 / png | img-021 | 139.3 KB / 1280×853 / jpeg | `gopher-blog.html` | **HQ** external is higher-res master | ✅ DONE → `assets/img/refer-app.webp` (2× on page) |
| high (d0) | `Deals.png` | 1.2 MB / 1317×2716 / png | img-010 | 752.9 KB / 960×1980 / png | `gopher-customer-deals.html` | **HQ** external is higher-res master | ✅ DONE → `assets/img/deals.webp` |
| high (d0) | `Community.jpeg` | 233.4 KB / 2048×1365 / jpeg | img-034 | 138.4 KB / 1280×853 / jpeg | `gopher-blog.html` | **HQ** external is higher-res master | ✅ DONE → `assets/img/community.webp` |
| high (d0) | `Deals Home.png` | 4.4 MB / 2456×4096 / png | img-009 | 822.4 KB / 960×1601 / png | `gopher-customer-deals.html` | **HQ** external is higher-res master | ✅ DONE → `assets/img/deals-home.webp` |
| high (d0) | `Cart Girl.png` | 2.5 MB / 1536×1024 / png | img-031 | 158.3 KB / 1200×800 / jpeg | `gopher-our-story.html` | **HQ** external is higher-res master | ✅ DONE → `assets/img/cart-girl.webp` |
| high (d0) | `Senior Friendly.png` | 1.9 MB / 1402×1122 / png | img-019 | 151.2 KB / 1280×1024 / jpeg | `gopher-blog.html` | **HQ** external is higher-res master | ✅ DONE → `assets/img/senior-friendly.webp` (2× on page) |
| high (d0) | `Main Page Hero Pics/junk_removal.png` | 823.2 KB / 1056×454 / png | img-042 | 85.7 KB / 1056×454 / png | `index.html` | same dims; external less-compressed | ✅ DONE → `assets/img/hero-junk-removal.webp` |
| high (d0) | `Main Page Hero Pics/delivery.png` | 272.4 KB / 768×256 / png | img-085 | 37.3 KB / 768×256 / png | `index.html` | same dims; external less-compressed | ✅ DONE → `assets/img/hero-delivery.webp` |
| high (d0) | `Main Page Hero Pics/lawn_mowing.png` | 872.6 KB / 1280×374 / png | img-040 | 94.7 KB / 1280×374 / png | `index.html` | same dims; external less-compressed | ✅ DONE → `assets/img/hero-lawn-mowing.webp` |
| high (d0) | `Main Page Hero Pics/grocery_delivery.png` | 262.6 KB / 768×256 / png | img-091 | 34.2 KB / 768×256 / png | `index.html` | same dims; external less-compressed | ✅ DONE → `assets/img/hero-grocery-delivery.webp` |
| high (d0) | `Main Page Hero Pics/ride_sharing.png` | 283.2 KB / 768×256 / png | img-077 | 39.4 KB / 768×256 / png | `index.html` | same dims; external less-compressed | ✅ DONE → `assets/img/hero-ride-sharing.webp` |
| high (d0) | `Main Page Hero Pics/moving.png` | 872.2 KB / 1220×508 / png | img-043 | 83.0 KB / 1220×508 / png | `index.html` | same dims; external less-compressed | ✅ DONE → `assets/img/hero-moving.webp` |
| high (d0) | `Main Page Hero Pics/tv_mounting.png` | 329.6 KB / 698×324 / png | img-093 | 30.9 KB / 698×324 / png | `index.html` | same dims; external less-compressed | ✅ DONE → `assets/img/hero-tv-mounting.webp` |
| high (d0) | `Main Page Hero Pics/plumber.png` | 557.5 KB / 1012×438 / png | img-069 | 47.4 KB / 1012×438 / png | `index.html` | same dims; external less-compressed | ✅ DONE → `assets/img/hero-plumber.webp` |
| high (d4) | `other.jpeg` | 28.7 KB / 600×360 / jpeg | img-131 | 15.0 KB / 300×198 / jpeg | `gopher-go-101.html` | **HQ** external is higher-res master | ⏳ outstanding (d4, not d0) — your call |
| high (d4) | `home.jpeg` | 21.7 KB / 600×360 / jpeg | img-142 | 10.9 KB / 300×198 / jpeg | `gopher-go-101.html` | **HQ** external is higher-res master | ⏳ outstanding (d4, not d0) — your call |
| high (d4) | `Target Merchants/Blind Pelican.png` | 8.5 KB / 62×62 / png | img-096 | 29.7 KB / 365×365 / png | `gopher-deals.html` | ⚠ external is *lower*-res than embedded (swap = downgrade) | ⛔ left — downgrade |
| med (d6) | `delivery.jpeg` | 20.5 KB / 600×360 / jpeg | img-140 | 11.1 KB / 300×198 / jpeg | `gopher-go-101.html` | **HQ** external is higher-res master | ⏳ verify visually — your call |
| med (d6) | `Target Merchants/Buoy Bowls.png` | 19.6 KB / 110×110 / png | img-098 | 14.5 KB / 256×256 / webp | `gopher-connect.html`, `gopher-request.html` | ⚠ external is *lower*-res than embedded (swap = downgrade) | ⛔ left — downgrade |
| med (d8) | `Copy of Perspective iPhone 17 Mockup (Semi Right) (Mockuuups Studio).png` | 5.0 MB / 2456×4096 / png | img-052 | 75.7 KB / 839×1400 / webp | `gopher-go.html` | **HQ** external is higher-res master; verify visually | ⏳ verify visually — your call |
| med (d8) | `Request Home.png` | 5.1 MB / 2456×4096 / png | img-009 | 822.4 KB / 960×1601 / png | `gopher-customer-deals.html` | **HQ** external is higher-res master; verify visually | ⏳ verify — note img-009 already swapped via `Deals Home.png` |
| med (d8) | `Connect Deals.png` | 563.9 KB / 1500×963 / png | img-037 | 129.1 KB / 1400×899 / png | `gopher-deals.html` | same dims; external less-compressed; verify visually | ⏳ verify visually — your call |
| med (d8) | `moving.jpeg` | 21.6 KB / 600×360 / jpeg | img-144 | 10.7 KB / 300×198 / jpeg | `gopher-go-101.html` | **HQ** external is higher-res master; verify visually | ⏳ verify visually — your call |
| low (d10) | `gopher-laptop-clean.png` | 227.3 KB / 1500×963 / png | img-025 | 216.8 KB / 1500×963 / png | `gopher-services.html` | near-identical; verify visually | ⏳ verify visually — your call |
| low (d12) | `Junk-Removal.png` | 1.7 MB / 1024×1024 / png | img-060 | 61.5 KB / 600×400 / jpeg | `gopher-connect.html` | **HQ** external is higher-res master; verify visually | ⏳ verify visually — your call |

## 3. NO MATCH

### 3a. External files with no embedded counterpart

**76 of 107 external files** have no image embedded in the site. Most are net-new assets (app screenshots, hero/illustration art, merchant logos, and the video library).

**Videos (.mp4) (20)**

| File | Size |
|---|---|
| `Beer-Delivery.mp4` | 2.9 MB |
| `Couch Moving.mp4` | 4.8 MB |
| `Delivery Groceries.mp4` | 2.4 MB |
| `Delivery of Beer.mp4` | 2.9 MB |
| `Drywall.mp4` | 24.3 MB |
| `Gardening.mp4` | 4.0 MB |
| `Grocery-Delivery.mp4` | 3.1 MB |
| `Handyman-Mounting-TV.mp4` | 2.8 MB |
| `Handyman.mp4` | 2.3 MB |
| `Junk-Removal.mp4` | 3.9 MB |
| `Labor.mp4` | 6.2 MB |
| `Lawn Mowing.mp4` | 5.1 MB |
| `Lighting Crew.mp4` | 2.2 MB |
| `Movers.mp4` | 3.6 MB |
| `Office Cleaning.mp4` | 2.7 MB |
| `Plumber.mp4` | 3.4 MB |
| `Ride-Sharing.mp4` | 2.2 MB |
| `Sawing.mp4` | 4.3 MB |
| `Staining.mp4` | 5.7 MB |
| `Teen-Lawn-Mower.mp4` | 3.2 MB |

**SVGs (8)**

| File | Size |
|---|---|
| `Deal Customer Home.svg` | 816.2 KB |
| `Deals Home.svg` | 8.1 MB |
| `Deals.svg` | 1.5 MB |
| `Go Available Requests.svg` | 1.8 MB |
| `Go Home.svg` | 9.1 MB |
| `Go Request Details.svg` | 8.0 MB |
| `Redeem.svg` | 6.7 MB |
| `Target Merchants/habitat Restore.svg` | 30.8 KB |

**Merchant logos (18)**

| File | Size |
|---|---|
| `Target Merchants/Ace Hardware.png` | 6.9 KB |
| `Target Merchants/Acme Pizza.png` | 7.1 KB |
| `Target Merchants/Apex Wings.png` | 24.7 KB |
| `Target Merchants/Aviator.png` | 20.2 KB |
| `Target Merchants/Big Jerrys Fensing.png` | 9.0 KB |
| `Target Merchants/Bless Your Heart.png` | 10.9 KB |
| `Target Merchants/Doherys.png` | 9.8 KB |
| `Target Merchants/Eggs Up Grill.png` | 9.2 KB |
| `Target Merchants/Lees Show Repair.png` | 14.5 KB |
| `Target Merchants/Mama Mia.png` | 13.1 KB |
| `Target Merchants/Mattress Firm.png` | 8.7 KB |
| `Target Merchants/My Way Tavern.png` | 6.0 KB |
| `Target Merchants/Parc Cleaners.png` | 7.6 KB |
| `Target Merchants/Sand Savvy Rental.png` | 5.7 KB |
| `Target Merchants/Texas Roadhouse.png` | 21.8 KB |
| `Target Merchants/Tour les Jours.png` | 78.9 KB |
| `Target Merchants/WaveMax.png` | 14.7 KB |
| `Target Merchants/Yard U.png` | 5.1 KB |

**Images (png/jpeg) (29)**

| File | Size |
|---|---|
| `Accepted Request.png` | 1.0 MB |
| `Beer to Backyard.png` | 1.2 MB |
| `Bulk-Labor.png` | 1.2 MB |
| `ChatGPT Image Jun 7, 2026 at 08_19_39 AM.png` | 1.4 MB |
| `ChatGPT Image Jun 8, 2026 at 06_51_13 PM.png` | 2.2 MB |
| `Day-Labor.png` | 1.8 MB |
| `Extreme Sports.png` | 2.5 MB |
| `Female on Phone.png` | 65.4 KB |
| `Fresh Start Drycleaning.png` | 2.1 MB |
| `Grocery Delivery.png` | 1.3 MB |
| `Handyman 1.png` | 400.1 KB |
| `Handyman.png` | 1.2 MB |
| `Hawthorne Furniture.png` | 2.0 MB |
| `Home Screen.png` | 1.5 MB |
| `IMG_8358.jpeg` | 1.0 MB |
| `John Profile.png` | 262.8 KB |
| `Office Cleaner.png` | 1.2 MB |
| `Office Cleaning.png` | 794.7 KB |
| `Outdoor Projects.png` | 1.5 MB |
| `Outlaws Steakhouse.png` | 2.5 MB |
| `Peak Appliances.png` | 2.1 MB |
| `Peeky Platters.png` | 2.2 MB |
| `Ride Sharing.png` | 1.4 MB |
| `Ride-Sharing.png` | 1.1 MB |
| `Rise & Shine Breakfast.png` | 2.2 MB |
| `Royal Burgers.png` | 2.2 MB |
| `Smoothies.png` | 2.4 MB |
| `TNT.png` | 2.2 MB |
| `u1592723386_friendly_everyday_American_neighbor_standing_casu_26bb8a1a-6ccb-4e72-9abd-54dfb48ee1a7_2.png` | 614.6 KB |

**Other / non-image (1)**

| File | Size |
|---|---|
| `READ-ME-photos.txt` | 1.1 KB |

> **Videos:** the 20 external `.mp4`s correspond *by name* to the site's videos, but **none is byte-identical to the existing `Final/*.mp4`** files (even same-named ones like `Junk-Removal.mp4`, `Labor.mp4`, `Beer-Delivery.mp4`, `Teen-Lawn-Mower.mp4`) — they are different encodings, likely higher-quality masters. Video is outside the image-manifest scope, so they're listed here for completeness, not as image swaps.

> **SVGs:** the 8 external `.svg`s (app screens / illustrations) had no byte-identical embedded SVG. SVG can't be perceptually hashed here, so any correspondence to embedded SVG blobs would need manual confirmation.

### 3b. Embedded blobs with no external counterpart

**139 of 168 unique embedded images** have no file in the asset pack — by type: png 49, webp 48, jpeg 25, svg+xml 15, gif 2.

Critically, this includes **all of the shared header/footer chrome** (logos, social icons, app-store badges) that dominate the duplication count — the asset pack does **not** contain replacements for these, so they still need to be extracted from the HTML directly:

| Embedded id | Type | Size | On pages |
|---|---|---|---|
| img-006 | svg+xml | 9.6 KB | 127 |
| img-002 | svg+xml | 18.5 KB | 126 |
| img-003 | svg+xml | 18.3 KB | 126 |
| img-017 | svg+xml | 3.3 KB | 126 |
| img-004 | svg+xml | 17.1 KB | 126 |
| img-005 | png | 18.4 KB | 109 |
| img-001 | png | 21.5 KB | 109 |
| img-047 | svg+xml | 26.6 KB | 3 |

The remaining unmatched blobs are mostly per-page service-card art (many `webp`/`png`) that the asset pack doesn't cover.

## Summary

| Group | Count | Meaning |
|---|---|---|
| Exact | 4 | Safe, certain swaps |
| Likely | 27 | Same image, different size/format — verify med/low |
| External, no counterpart | 76 | Net-new assets (incl. 20 videos, 18 merchant logos, 8 SVGs) |
| Embedded, no counterpart | 139 | Still must be extracted from HTML (incl. all shared chrome) |

**Takeaways for the swap decision:** (1) the asset pack is mostly **higher-quality masters** — many `high (d0)` rows are large PNG/JPEG sources for embedded images that were downscaled/re-compressed, so swapping *upgrades* quality; (2) the **8 Main-Page hero PNGs** match embedded copies at identical dimensions but far larger file size (less compression) — a quality choice, not a resolution gain; (3) **two merchant logos** (`Blind Pelican`, `Buoy Bowls`) are *lower*-res than the embedded versions — don't swap those; (4) the asset pack does **not** replace the shared header/footer chrome — that extraction is separate (see [base64-image-plan.md](base64-image-plan.md)).