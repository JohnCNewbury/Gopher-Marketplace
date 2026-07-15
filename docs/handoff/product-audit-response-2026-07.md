# Product Audit Response — July 2026

*Response to the external product audit of the Gopher Marketplace prototype (`Final/`),
received 2026-07-15. Each finding was verified against the codebase and the live site
before responding; two were fixed and deployed same-day. Status current as of
2026-07-15 (deploy `7972687` on `main`).*

---

## Summary

The audit's overall verdict — **"excellent investor/demo/spec prototype, not an MVP"** —
is accurate and is, in fact, the design intent. The prototype is the *specification* for
the production rebuild: real auth, database, request flow, payments, and matching are
deliberately out of scope for the prototype and are fully scoped in the RFP package
(`Documentation/RFP/`) for the development vendor. The audit independently validates that
strategy rather than redirecting it.

Of the six findings, the two that made the prototype *look broken* (rather than
pre-MVP) were fixed and deployed the same day. Verification details below.

| # | Finding | Verdict | Status |
|---|---------|---------|--------|
| 1 | `gopher-connect.html` 404s on 8 missing hero video files | Confirmed | ✅ **Fixed + deployed 2026-07-15** |
| 2 | Google Maps logs missing-key/callback issues | Confirmed — but environmental, not a product bug | ✅ **Resolved 2026-07-15** (allowlist corrected; production was never affected) |
| 3 | Most flows are browser-only demos | Accurate — by design | Scoped for the production rebuild (RFP) |
| 4 | Service pages broad but template-thin | Accurate — accepted trade-off | SEO-breadth shells at prototype scale; content depth is post-rebuild work |
| 5 | Mobile search input cramped/truncated | Unreproduced | **Awaiting auditor's page URL / device width / screenshot** |
| 6 | Prototype-heavy codebase (duplicated templates, large static pages, fake state) | Accurate — by design | Scoped for the production rebuild (RFP) |

---

## Finding 1 — Hero video 404s: FIXED

**Verified:** `gopher-connect.html` referenced `hero-media/clip-1..4` in both `.mp4` and
`.webm` (= exactly 8 files); the `hero-media/` folder never existed. The failure was
partially graceful (a photo cycle plays as fallback, so the hero never rendered blank)
but produced 8 console 404s on every load. Connect-only — `gopher-request.html` has no
hero video block.

**Fix (commit `e685c2e`, deployed in `7972687`):** the four hero `<video>` sources now
point at existing, approved site footage — `assets/video/services-clip-{1,5,9,14}.mp4`
(the services-page b-roll pool). The photo-cycle fallback and clip swap-in JS are
unchanged, and inline comments mark where to re-point the sources at
`hero-media/clip-1..4` when the produced hero clips arrive.

**Verified after fix:** zero console errors on page load (was 8 × 404); all four clips
return HTTP 200 locally and on the live site; hero renders video behind the overlay with
headline text fully readable.

## Finding 2 — Google Maps errors: environmental; allowlist corrected

**Verified:** all Maps surfaces use the correct referrer-restricted browser key with the
proper loader parameters (`libraries=places&callback=…&loading=async`). Empirical tests
on 2026-07-15:

- **Live site (`johncnewbury.github.io`):** Maps JS + Places load; Distance Matrix
  returns `OK`; Geocoder returns `OK`; no auth failure. **Production was never broken.**
- **Local run of the folder (localhost / `file://`):** exact reproduction of the
  audit's symptoms — `RefererNotAllowedMapError`, `gm_authFailure`, and Distance Matrix
  callbacks that never fire. The auditor evidently ran the `Final/` folder locally,
  which was not on the key's referrer allowlist.

**Root cause of the lingering localhost failure:** Google's referrer matcher does **not**
support wildcard ports. `localhost:*` is accepted by the Cloud-console UI but never
matches any request. Working form: explicit port + path wildcard.

**Fix (owner, Google Cloud console, 2026-07-15):** allowlist entries corrected to
`localhost:8123/*` and `127.0.0.1:8123/*`. Verified same-minute on `localhost:8123`:
Distance Matrix `OK`, Geocoder `OK`, Places (New) autocomplete returning live
predictions.

**Residual limitation (by design):** pages opened directly from the filesystem
(`file://`) send no referrer Google will accept and can never be allowlisted. Reviewers
auditing the folder should serve it locally first:

```
python3 -m http.server 8123    # then browse http://localhost:8123
```

**Related fix shipped in the same deploy:** GitHub Pages runs Jekyll by default, which
silently excludes underscore-prefixed files — the committed `__maps-check.html` (Maps
diagnostic) and `_redirects` returned 404 on the live site. An empty `.nojekyll` file was
added to `main`; both now return 200, so the Maps diagnostic page is usable on the live
domain.

## Findings 3, 4, 6 — Browser-only flows, thin service pages, prototype architecture: by design

These accurately describe what the prototype is: state is in-memory/localStorage
(`__payStore` etc.), there is no backend, and the ~107 service-detail pages are
SEO-breadth shells. The prototype's role is to be the executable specification for the
production rebuild; the rebuild scope (authentication via Devise-confirmable, Stripe
payment architecture, the canonical request/matching flow, real persistence) is
documented in the RFP package and its build specs. No prototype-side action is planned —
deepening the fake would add cost without moving the MVP forward, which is the audit's
own conclusion.

## Finding 5 — Mobile search input: unreproduced, awaiting specifics

The mobile responsiveness pass (2026-07-08) verified zero horizontal overflow at 375 px
and 768 px across the priority templates, and the search-pill placeholder on `index.html`
is short ("What can we help with?"). We could not reproduce cramping/truncation. Request
to the auditor: the specific page URL, device/viewport width, and ideally a screenshot —
if it reproduces, it is a small CSS fix and will be turned around quickly.

---

## Note for future audits of the folder

To see the product as deployed, audit the live site:
`https://johncnewbury.github.io/Gopher-Marketplace/`. If auditing the `Final/` folder
directly, serve it over localhost (command above) — double-clicking the HTML files
(`file://`) breaks all Google Maps features by design (referrer restrictions) and will
produce false "Maps is broken / missing key" findings.
