# G40-39 — the non-A/R completion flow, end to end — ⚠️ REOPENED 2026-09-02 (was RESOLVED 2026-08-20)

> **Reopened with added scope.** The seven scenarios below are unchanged and still merged. What
> was missing is an **eighth surface** the original ACs never named — the requester's own Request
> History card — plus a **race** on the confirm screen (G40-427). See "2026-09-02/03" at the end.
> The 2026-08-20 resolution was correct for what it covered; it did not cover everything the
> owner's design shows.

All seven scenarios (as corrected 2026-08-14: dismissible rating, no non-dismissible screen)
plus the G40-331 rating gate are built and merged. Backend pieces are live; client pieces are
**store-gated** and ride the next release.

## The flow as it now exists

**Gopher completes a non-A/R job** (`ordercard.js`, `/complete` or `/complete/v2` — the
response serves `photo_requirement` from `completion_photo_policy`, !346):
1. **Photo step** (`completion_photos` screen, !243): up to served max (3) photos,
   camera/gallery, Submit disabled until a photo exists; Skip always available — on Delivery
   it opens the served confirmation dialog (bundled fallback copy). Photos POST to
   `POST /orders/update/completed_jobs/:id` (G40-379). Scenarios 1 & 3.
2. **Waiting screen** (`completion_waiting`, !245): "Job complete — waiting for {name} to
   confirm. Confirmation releases your payout — and you'll rate them once they confirm."
   Nothing rates at mark-complete any more (G40-331; also the non-photo/no-show completion
   paths land here).

**Requester confirms** (`orderConfirmation.js`, !234):
3. "View pic(s) of completed request" renders above the Confirm button — from
   `GET /orders/order_log/:id → complete_job_attachment`; tap-to-view; skipped = no section;
   fetch failure never blocks confirming. Scenarios 2 & 3.

**At confirmation (payout release — the gate):**
4. The "Payday!!" push (`order.payout`, deep-link keys, !347) is the banner; tapping it opens
   the dashboard (`PushTapListener`, !245) where the pending-alert pipeline navigates to the
   rating with the server's `rateYourRequestor` payload — now emitted for EVERY unrated order
   (!347; was A/R-only). Scenario 4.
5. The rating is dismissible; the pulsing **"Rate now →"** CTA on confirmed history cards
   (`gopher_rated` served by `/orders/v3`, !347) keeps it reachable until submitted.
   Scenario 5 / INV-RATING.
6. Favorite congrats fires after the rating if the requester favorited — pre-existing
   `favoriteGopher` emit + congrats modal, sequenced by the alert queue. Scenarios 6 & 7.

## MR ledger (all squash-off, sources kept, content-verified)

| Piece | MR | Merge | State |
|---|---|---|---|
| Photo write path + served policy | backend !310 / !314 (G40-379) | `bc6fd465` / `963158eb` | live |
| Serve `photo_requirement` in both complete responses | backend !346 | `39fc5767` | live |
| Worker photo step | worker !243 | `c223b04a` | store-gated |
| Requester confirmation photos | requester !234 | `b2108479` | store-gated |
| Rating gate server half | backend !347 | `0112957e` | live |
| Rating gate client half (waiting screen, banner tap, CTA) | worker !245 | `15b4a269` | store-gated |
| **Request History photos (Scenario 8, added scope)** | requester **!269** | `241e0915e` — **MERGED to production** (`3d2c357b2`, 2026-09-03, content-verified) | store-gated |
| **Confirm-screen poll (G40-427, AC1 only)** | requester **!270** | `5fd68b57f` — **MERGED to production** (`8396a54f2`, 2026-09-03, content-verified) | store-gated |

## Traps that outlive this work

- **Never widen `order_pick_up_complete_v2` to store photos** — it silently drops non-A/R
  files and also moves payment; the dedicated endpoint is the only writer (two backend tests
  guard this).
- **The served `skip_warning` needs the client's bundled fallback** — rendering it blindly
  shows an empty dialog against an older server.
- **The Pro/non-Pro completion fork (`RequestDetailPullOver.js`) is the OLD app's layout** —
  in the capacitor worker repo, completion lives only in `ordercard.js` (verified 2026-08-20).
- **`gopher_rated === false` (strict) drives the CTA** — an older server omits the field and
  the CTA correctly stays hidden; do not loosen to falsy.
- Device QA owed at the store release: photo permissions/cap/skip-dialog, photos on the
  requester confirm screen, complete → waiting, confirm on a second device → rating opens,
  dismiss → CTA pulses → rate → gone, favorite → congrats after rating.

Related docs: `rating-gate-on-requester-confirm.md` (the gate's spec + build record),
G40-379 ticket (backend write path evidence), G40-18 doc (AUTH LIFECYCLE timeline the
confirm writes into).

---

## 2026-09-02/03 — added scope, verification, and three corrections

### Scenario 8: the requester's Request History card had NO photo code at all

The original **Scenario 2** targets the requester's *confirmation* screen, and that half shipped
on 2026-08-20 (`8095c2ca6`, in `release/ios-851` / `release/android-852`). It was never the gap.

The gap is a **different screen**: `requestorhistory.js` (`src/json/requester/history.json`), the
card behind "TAP TO VIEW DETAILS". It renders only `item.attachments` — what the **requester**
attached at request time — and never called `/orders/order_log/:id`, the only endpoint serving
`complete_job_attachment`. So there was no race to lose there: **there was no code.** Owner ruled
2026-09-02 to fold this into G40-39 rather than raise a new ticket.

**✅ VERIFIED on device** (iOS simulator, production API, order **64887**, 2 real stored photos):
heading renders · both thumbnails load · tap opens full size · **the search-results card renders
them too** · an order with no photos shows no section (65093). Screenshot:
`G40-39-verified-search-variant.png`.

### Correction 1 — completion-photo capture did NOT regress on 08-28

Claimed mid-session and **withdrawn**. It rested on "no photos for any order above 64910", which
is an artifact of keying on *order id*: a real worker captured one on 2026-09-02 onto order
64672 (created 08-21, completed late). The supporting "0 of 12 since vs 9 of 17 before" was also
contaminated — the "before" set includes the test accounts `1` and `31677`, so 53% was never the
real-world base rate. **Capture is alive on the store build.**

### Correction 2 — order 65093's missing photo step was a STALE LOCAL BINARY

Non-A/R Delivery, zero attachments, so the step should have run. The Gopher device was running
Go **build 31** — a local Xcode build — not the shipped **863**. Not a product defect. Read the
installed version with `xcrun devicectl device info apps --device <udid>` before diagnosing this
class of report again.

### Correction 3 — the requester's S3 URLs are PUBLIC, not presigned

The requester path builds a bare `https://${AWS_BUCKET}.s3.amazonaws.com/...` while the admin
path presigns with a 15-minute TTL. The thumbnails render **because the objects carry an
`AllUsers: READ` ACL** — unauthenticated GET returns HTTP 200.

⛔ **This is a live privacy exposure, tracked with the owner, NOT fixed here.** ~1,109 completion
photos are world-readable at a sequentially enumerable path
(`uploads/image/Completed_orders/{order_id}/{attachment_id}/{file}`) in bucket **`gopher-test`**
— which is what `AWS_BUCKET` is set to on the `Gopher-Production` EB environment. **Flipping
those ACLs breaks this feature, the HQ card and admin simultaneously**; presigning is the fix and
it must land as a backend + client pair.

## Traps added 2026-09-03

- ⛔ **`requestorhistory.js` has TWO copies of the order card** — the plain list and the
  search-results list are duplicated markup, not a shared component. Patch one and the photos
  vanish the moment the requester types in the search box. Both are patched; both were verified.
- ⛔ **A locally-built app is force-updated out of production.** The gate reads the **native**
  version (`App.getInfo()` in `src/mobileconfig.tsx`), **not** `REACT_APP_VERSION` — rebuilding
  the web bundle changes nothing on device. `android/app/build.gradle` ships
  `versionName "3.0.3"` against an `api_version.android_requester` minimum of `3.8.0`. Appflow
  overrides it via trapeze, so only local builds are affected. iOS passes by accident because
  `REACT_APP_VERSION=42` beats `13.8.0` at the first component. Bump the native version to test,
  and **revert it** — that file is tracked. See memory `local-mobile-builds-are-force-updated-out`.
- ⚠️ **`/mobile-config` sits behind `mobileConfigTokenAuth`** — curl returns `Forbidden`. That is
  the MCT middleware, not an auth or version failure. Do not diagnose from it.
- ⚠️ **iCloud collision copies break the Android build.** These repos live on an iCloud-synced
  `~/Desktop`, and `cap sync` regenerates files like `res/xml/config 3.xml`. Android's resource
  merger rejects spaces in filenames; this killed three builds (one after 25 minutes). Clear
  `find android/app/src/main/res -name "* [0-9].*"` before building.

## 2026-09-03 (later) — THE REAL ROOT CAUSE FOUND: a THIRD, unfixed completion path

Everything above this section is still true and still shipped. It did not explain the owner's
original report (order 65085, no photo prompt) because that report was never about the confirm
screen or Request History — it was about the **worker never being offered the step at all**, on
a real order, well after 08-28. Chasing that down the wrong way cost two withdrawn guesses
(capture "regressed" on 08-28; 65085's Gopher was on a stale local build) before landing on the
actual cause.

**`RequestDetailPullOver.js` is the screen behind the live Active tab** (`getOrders.js` →
`RequestDetailPullOver`, confirmed live on a real device: Active / Scheduled / Available tabs).
`ordercard.js` — where G40-39's `photo_requirement` routing was written on 2026-08-20 — is
**not** part of that flow; its only reachable use from `getOrders.js` is a past/no-longer-available
request detail, not active-job completion.

Both of `RequestDetailPullOver.js`'s completion handlers (`/complete` and `/complete/v2`)
hardcoded `next: "grating"` — no `photo_requirement` check, no branch, straight to the rating
screen — on every real completion, regardless of order type. This is the actual reason 65085 got
no photo prompt. It would have happened on the App Store build too; it is not a build-freshness
issue.

**This is now the third time this exact rule has been implemented per-call-site and gone stale:**
1. `grating.js` embedded its own "Add a pic" control at the rating screen — retired 2026-08-24
   when rating was decoupled from completion (G40-331); picker and thumbnail strip are still in
   the file, `display:none`, submitting nothing.
2. `ordercard.js` got the real G40-39 fix, 2026-08-20 — two calls, both correct.
3. `RequestDetailPullOver.js` had the same two calls and neither was ever touched.

### The fix — MR !266, gopher-mobile-gopher — ✅ MERGED to production 2026-09-03 (`3a28f1c21`, content-verified)

* **`src/helpers/photoStepRouting.js`** (new) — `resolvePhotoStepTarget(photoRequirement, isAgeRestricted)`,
  the branch that had been implemented twice independently in `ordercard.js`.
* **`RequestDetailPullOver.js`** — both handlers now call it. Confirmed both are the
  **same-named functions** as `ordercard.js`'s two (`onTapRequesterNotShow`, and the plain
  `/complete/v2` handler) — mirrors an already-decided precedent (no-show completions get the
  photo step) rather than a fresh product call.
* **`ordercard.js`** — both existing sites now call the shared function too, so there is one
  place this rule lives, not three.
* **`scripts/assert-photo-step-routing.mjs`**, wired into `.gitlab-ci.yml` — scans the **whole**
  `src/component` tree for any `/complete`/`/complete/v2` call site and fails if it doesn't route
  through the shared helper. Deliberately not scoped to named files: naming files is exactly how
  this path went unnoticed for two weeks. Verified both directions (passes fixed, fails with the
  exact two offending offsets against the unmodified file) and confirmed **green on GitLab's own
  CI runners**, not just locally — pipeline `2817970729`, jobs `photo-step-routing` and
  `available-tab-after-complete` both `success`.

**Client-only. Backend needs nothing** — it already serves `photo_requirement` on both endpoints;
confirmed because `ordercard.js`'s pre-existing code already read it from the identical response.

**Unresolved loose end, stated rather than guessed:** how order 64887 got its photos, given
`ordercard.js` isn't reachable from the live Active-tab flow. Not blocking; noted so nobody
re-derives the "which screen produced 64887" question from scratch.

## Still owed before this can go green

1. ~~Merge !269 and !270~~ — **DONE 2026-09-03.** Both merged not-squashed to `production`
   (`3d2c357b2`, `8396a54f2`), source branches kept. Content-verified against
   `origin/production` immediately after — the merged files are byte-identical to the tested
   commits, no rebase drift.
2. ~~Merge !266~~ — **DONE 2026-09-03.** `aac27c76b` merged as `3a28f1c21`, not squashed, source
   kept. Content-verified: `RequestDetailPullOver.js`, `ordercard.js`, and the new
   `photoStepRouting.js` on `origin/production` are byte-identical to the commit CI passed.
3. Device-verify the Active-tab flow reaches `completion_photos` post-fix, on iOS and Android, via
   the real tab flow (not `ordercard.js`) — this is the walkthrough that actually matters now.
4. Android leg of Scenario 8 — the emulator clears the version gate now but needs a signed-in
   session.
5. **The original seven scenarios verified on the App Store build.** Their commits are confirmed
   ancestors of the actual shipped tags — not merely merged to a branch — and no later commit has
   touched the completion/photo/rating files since. Still not done on-device.
6. `gopher-request-101.html` says nothing about completion photos. The 101-guide rule bites at
   **store release**, when it becomes user-visible — not at merge, so this is not blocking yet.

