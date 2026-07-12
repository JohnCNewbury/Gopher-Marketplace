# Base64 externalization — Images + Video (G40-313)

_Done 2026-07-07. Part of Epic **G40-312** (website scale/production-readiness)._

## Summary

Removed **all** remaining inline base64 raster images and inline base64 video from the `Final/` site and replaced them with external, relative, case-exact file references.

| Metric | Value |
|---|---|
| Base64 **image** text removed | ~14.6 MB (14,614,128 chars) across 15 pages |
| Base64 **video** text removed | ~4.64 MB (4,643,703 chars) in `gopher-services.html` |
| Unique image files written | 145 → `Final/assets/img/` |
| Unique video files written | 18 → `Final/assets/video/` |
| Image occurrences replaced | 217 (dedup: 217 → 145 unique) |
| Remaining base64 raster/video | **0** |
| Remaining `data:image/svg+xml` (URL-encoded inline SVG icons) | kept intentionally — tiny (<1 KB each), valid |

### Page size reductions (HTML text)

| Page | Before | After |
|---|---|---|
| `gopher-deals.html` | 5.22 MB | 0.52 MB |
| `gopher-connect.html` | 5.64 MB | 1.20 MB |
| `gopher-services.html` | 5.03 MB | 0.35 MB |
| `gopher-customer-deals.html` | 1.93 MB | 0.29 MB |
| `gopher-request.html` | 2.55 MB | 1.54 MB |
| `gopher-our-story.html` | 1.42 MB | 0.13 MB |
| `gopher-go.html` | 0.95 MB | 0.49 MB |
| `index.html` | 0.77 MB | 0.39 MB |
| `gopher-go-101.html` | 0.30 MB | 0.10 MB |
| `gopher-blog.html` | 0.30 MB | 0.10 MB |

## Method (deterministic, reversible)

1. Every `data:image/*;base64,…` and `data:video/mp4;base64,…` decoded; real file type detected by **magic bytes** (not the declared MIME) so extensions are correct.
2. Deduplicated by SHA-256 — identical blobs written once and shared across pages.
3. Written to `assets/img/` (images) and `assets/video/` (video). **Exact original bytes** — this is a lossless externalization; compression/resize is deferred to **G40-314**.
4. Each inline occurrence replaced with a relative `assets/…/<name>` reference (works for `<img src>`, CSS `url()`, and the JS `CLIPS[]` video array on the services page).
5. Verified: 0 base64 remaining, 0 missing references site-wide, and live render-checks (deals, connect, customer-deals, services video montage) pass with no image/video 404s.

## Naming note (for G40-320)

Names derive from each image's `alt`/`class`/`id`. Descriptive where context existed (merchant logos `cust-deals-<merchant>.png`, service thumbnails `go101-<service>.jpg`, hero shots `connect-hero-*`). Where no usable context existed, a stable page-prefixed sequential fallback was used (`connect-img-N`, `request-img-N`, `shared-img-N`). **G40-320** can rename these for polish — references update mechanically.

## Full mapping (filename ← bytes × occurrences ← pages)

```
deals-in-the-gopher-go-app.svg                 918,656B  x1   gopher-deals.html
deals-featured-on-gopher-request-and-connect-p.svg   874,976B  x1   gopher-deals.html
story-pin.gif                                  674,422B  x1   gopher-our-story.html
deals-on-the-gopher-request-home-page.png      621,303B  x1   gopher-deals.html
deals-bidrottrack.png                          514,503B  x1   gopher-deals.html
connect-hero-img.jpg                           462,666B  x1   gopher-connect.html
connect-hero-img-2.jpg                         351,459B  x1   gopher-connect.html
connect-hero-img-3.jpg                         258,412B  x1   gopher-connect.html
connect-hero-img-4.jpg                         242,214B  x1   gopher-connect.html
connect-hero-img-5.jpg                         234,153B  x1   gopher-connect.html
connect-hero-img-6.jpg                         203,758B  x1   gopher-connect.html
home-img.png                                   201,642B  x1   index.html
story-os-stop-right-dig-final-rise.png         188,656B  x1   gopher-our-story.html
connect-hero-img-7.jpg                         173,112B  x1   gopher-connect.html
connect-hero-img-8.jpg                         158,003B  x1   gopher-connect.html
deals-browsing-local-deals-in-the-gopher-marke.png   157,886B  x1   gopher-deals.html
connect-hero-imgs.jpg                          134,703B  x1   gopher-connect.html
deals-redeem-shot-s1.png                       132,181B  x1   gopher-deals.html
deals-dp-pv-slide.png                          104,643B  x1   gopher-deals.html
deals-opening-a-merchant-deal.png              103,541B  x1   gopher-deals.html
connect-offersuggestclose.png                   98,041B  x3   gopher-connect.html×3
story-badge.jpg                                 83,035B  x1   gopher-our-story.html
request-img.png                                 81,084B  x1   gopher-request.html
go-get-it-on-google-play.webp                   77,470B  x1   gopher-go.html
go-gopher-go-app-available-requests.webp        72,206B  x1   gopher-go.html
deals-requesting-a-gopher-to-bring-the-deal.png    69,630B  x1   gopher-deals.html
connect-img.jpg                                 69,417B  x1   gopher-connect.html
connect-img-2.jpg                               57,494B  x1   gopher-connect.html
connect-use-cta.jpg                             47,728B  x1   gopher-connect.html
cust-deals-sand-savvy-rental.png                47,236B  x2   gopher-customer-deals.html×2
connect-use-cta-2.jpg                           46,862B  x1   gopher-connect.html
cust-deals-frankie-fannkks.png                  42,387B  x2   gopher-customer-deals.html×2
request-compare-stage.webp                      41,192B  x1   gopher-request.html
cust-deals-buoy-bowls.png                       40,135B  x2   gopher-customer-deals.html×2
connect-use-cta-3.jpg                           40,101B  x1   gopher-connect.html
go-gopher-go-app-home-screen.webp               39,514B  x1   gopher-go.html
cust-deals-partner-band.png                     39,286B  x2   gopher-customer-deals.html×2
cust-deals-bass-lake-outfitters.png             38,798B  x2   gopher-customer-deals.html×2
cust-deals-johns-deli.png                       38,710B  x2   gopher-customer-deals.html×2
connect-img-3.jpg                               38,519B  x1   gopher-connect.html
request-img-2.webp                              37,494B  x1   gopher-request.html
request-img-3.webp                              37,408B  x1   gopher-request.html
cust-deals-cardinal.png                         34,854B  x2   gopher-customer-deals.html×2
request-img-4.webp                              33,394B  x1   gopher-request.html
request-img-5.webp                              31,422B  x1   gopher-request.html
connect-img-4.png                               30,871B  x1   gopher-connect.html
request-img-6.webp                              30,102B  x1   gopher-request.html
request-img-7.webp                              29,620B  x1   gopher-request.html
cust-deals-videri.png                           29,099B  x2   gopher-customer-deals.html×2
tiers-tier-cta.svg                              28,823B  x1   gopher-tiers.html
shared-gopher-elite.svg                         28,443B  x2   gopher-go-101.html, gopher-go.html
request-img-8.webp                              28,270B  x1   gopher-request.html
cust-deals-my-way-tavern.png                    28,161B  x2   gopher-customer-deals.html×2
go-gc-modal-close.svg                           28,012B  x1   gopher-go.html
shared-ts-right.svg                             28,011B  x3   gopher-go-101.html, gopher-go.html, gopher-tiers.html
shared-brand.svg                                27,242B  x3   gopher-faqs.html, gopher-iq-sandbox-standalone.html, gopher-services.html
go-img.png                                      27,084B  x1   gopher-go.html
cust-deals-triangle-vine.png                    26,729B  x2   gopher-customer-deals.html×2
request-img-9.webp                              25,516B  x1   gopher-request.html
request-img-10.webp                             24,646B  x1   gopher-request.html
deals-img.webp                                  24,504B  x1   gopher-deals.html
cust-deals-carolina-cellars.png                 24,435B  x2   gopher-customer-deals.html×2
blog-post-card-cat-business-reveal.jpg          24,227B  x1   gopher-blog.html
request-img-11.webp                             24,024B  x1   gopher-request.html
cust-deals-diced.png                            23,753B  x2   gopher-customer-deals.html×2
shared-hatch-coffee.webp                        23,404B  x4   gopher-connect.html, gopher-customer-deals.html×2, gopher-request.html
connect-img-5.webp                              22,336B  x1   gopher-connect.html
request-download-on-the-app-store.png           21,999B  x1   gopher-request.html
cust-deals-ember-cigar-lounge.png               21,948B  x2   gopher-customer-deals.html×2
request-img-12.webp                             21,922B  x1   gopher-request.html
cust-deals-la-cocina.png                        21,892B  x2   gopher-customer-deals.html×2
home-arr.png                                    21,397B  x1   index.html
cust-deals-triangle-handyman.png                21,363B  x2   gopher-customer-deals.html×2
connect-img-6.png                               21,211B  x1   gopher-connect.html
request-img-13.webp                             20,768B  x1   gopher-request.html
shared-scribble.png                             20,031B  x2   gopher-request.html, index.html
shared-img.webp                                 19,986B  x2   gopher-connect.html, gopher-request.html
request-img-14.webp                             19,292B  x1   gopher-request.html
cust-deals-quickstop.png                        19,270B  x2   gopher-customer-deals.html×2
connect-img-7.jpg                               19,093B  x1   gopher-connect.html
cust-deals-bass-lake-quickmart.png              19,009B  x2   gopher-customer-deals.html×2
shared-img-2.svg                                18,978B  x3   gopher-connect.html, gopher-request-101.html, gopher-request.html
request-go.png                                  18,806B  x1   gopher-request.html
shared-url-lock.svg                             18,770B  x4   gopher-connect.html×2, gopher-request-101.html, gopher-request.html
connect-img-8.jpg                               18,769B  x1   gopher-connect.html
connect-img-9.webp                              18,098B  x1   gopher-connect.html
go101-home-office-services.jpg                  18,077B  x1   gopher-go-101.html
shared-img-3.webp                               18,018B  x2   gopher-connect.html, gopher-request.html
go101-hourly-day-labor.jpg                      17,744B  x1   gopher-go-101.html
cust-deals-circle-g.png                         17,650B  x2   gopher-customer-deals.html×2
shared-img-4.svg                                17,547B  x3   gopher-connect.html, gopher-request-101.html, gopher-request.html
cust-deals-download-on-the-app-store.png        17,463B  x1   gopher-customer-deals.html
home-platforms-inner.png                        16,787B  x1   index.html
go101-delivery-errand.jpg                       16,487B  x1   gopher-go-101.html
connect-img-10.jpg                              16,147B  x1   gopher-connect.html
connect-img-11.png                              16,106B  x1   gopher-connect.html
request-img-15.webp                             15,614B  x1   gopher-request.html
home-arr-2.png                                  15,573B  x1   index.html
go101-ride-sharing.jpg                          15,360B  x1   gopher-go-101.html
connect-img-12.webp                             15,104B  x1   gopher-connect.html
connect-img-13.webp                             14,364B  x1   gopher-connect.html
cust-deals-app-badges.png                       13,714B  x1   gopher-customer-deals.html
shared-img-5.webp                               13,692B  x2   gopher-connect.html, gopher-request.html
cust-deals-mini-aussie-bottle-shop.png          12,836B  x2   gopher-customer-deals.html×2
go101-yard-outdoor-projects.jpg                 12,500B  x1   gopher-go-101.html
request-img-16.webp                             12,204B  x1   gopher-request.html
connect-img-14.webp                             11,848B  x1   gopher-connect.html
connect-img-15.webp                             11,838B  x1   gopher-connect.html
cust-deals-holly-springs-market.png             11,565B  x2   gopher-customer-deals.html×2
connect-img-16.webp                             11,260B  x1   gopher-connect.html
go101-moving.jpg                                11,211B  x1   gopher-go-101.html
shared-img-6.webp                               11,060B  x2   gopher-connect.html, gopher-request.html
home-arr-3.png                                  11,041B  x1   index.html
connect-img-17.webp                             10,530B  x1   gopher-connect.html
connect-img-18.webp                             10,474B  x1   gopher-connect.html
shared-btn-green.svg                            10,131B  x2   gopher-request.html, gopher-trustshield.html
shared-gf-inner.svg                              9,852B  x3   gopher-connect.html×2, gopher-request.html
connect-img-19.webp                              9,790B  x1   gopher-connect.html
shared-img-7.webp                                9,660B  x2   gopher-connect.html, gopher-request.html
connect-img-20.jpg                               9,659B  x1   gopher-connect.html
shared-mh-sub.svg                                9,361B  x15  gopher-blog.html×13, gopher-our-story.html×2
connect-img-21.webp                              9,248B  x1   gopher-connect.html
cust-deals-gopantry.png                          9,127B  x2   gopher-customer-deals.html×2
connect-img-22.webp                              8,862B  x1   gopher-connect.html
go-app-row-label.png                             8,778B  x2   gopher-go.html×2
connect-img-23.webp                              8,248B  x1   gopher-connect.html
connect-img-24.webp                              7,490B  x1   gopher-connect.html
connect-img-25.webp                              7,486B  x1   gopher-connect.html
cust-deals-sugarbird.png                         7,440B  x2   gopher-customer-deals.html×2
go-download-on-the-app-store.png                 7,259B  x2   gopher-go.html×2
connect-img-26.webp                              7,210B  x1   gopher-connect.html
deals-img-2.jpg                                  7,059B  x1   gopher-deals.html
shared-img-8.webp                                4,510B  x2   gopher-connect.html, gopher-request.html
shared-img-9.webp                                4,476B  x2   gopher-connect.html, gopher-request.html
go-gg-share-label.png                            4,200B  x1   gopher-go.html
shared-img-10.svg                                3,373B  x3   gopher-connect.html, gopher-request-101.html, gopher-request.html
shared-gopher-pro.svg (renamed from shared-gopher-elite-2.svg 2026-07-12; it is the Pro wordmark)                        3,143B  x3   gopher-go-101.html, gopher-go.html, gopher-tiers.html
request-img-17.webp                              2,784B  x1   gopher-request.html
connect-img-27.webp                              2,752B  x1   gopher-connect.html
connect-img-28.webp                              2,048B  x1   gopher-connect.html
request-img-18.webp                              1,986B  x1   gopher-request.html
shared-img-11.webp                               1,490B  x2   gopher-connect.html, gopher-request.html
go-idstat-ok.svg                                 1,270B  x2   gopher-go.html×2
deals-img-3.svg                                    763B  x1   gopher-deals.html
cust-deals-img.gif                                  26B  x1   gopher-customer-deals.html

VIDEO (gopher-services.html CLIPS[] background montage):
services-clip-1.mp4 … services-clip-18.mp4   (18 files, ~3.4 MB total)
```