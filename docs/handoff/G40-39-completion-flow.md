# G40-39 — the non-A/R completion flow, end to end — ⚠️ REOPENED 2026-09-02 (was RESOLVED 2026-08-20)

> **Reopened with added scope.** The seven scenarios below are unchanged and still merged. What
> was missing is an **eighth surface** the original ACs never named — the requester's own Request
> History card — plus **two separate confirm-screen defects** (G40-427): a race, and then a whole
> screen (`Orderdispute.js`, the one a real push notification actually opens) that had never been
> fixed at all. See "2026-09-02/03" and "2026-09-03 (later still)" at the end.
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
| **Confirm-screen poll (G40-427, AC1 only) — on the WRONG screen, see below** | requester **!270** | `5fd68b57f` — **MERGED to production** (`8396a54f2`, 2026-09-03, content-verified) | store-gated |
| **`Orderdispute.js` — the ACTUAL live confirm screen — gets the fix** | requester **!271** | `ef3596b85` — **MERGED to production** (`18cb0de0f`, 2026-09-03, content-verified) | store-gated |
| **`photo_step_resolved` served on `/orders/:id`, `/orders/order_log/:id`, `/orders/v3`** | backend **!495** | `7b5b021e` + `7bbbeb98` — **MERGED to production** (`5813d416`, 2026-09-04 19:55 EDT, owner's "Merge both", content-verified; deploy verified below) | **live** |
| **Confirm/dispute screen waits for the photo step (owner ruling, option a, no timeout)** | requester **!278** | `b6530ac39` — **MERGED to `next`** (`9b595b414`, 2026-09-04 19:55 EDT, content-verified; `next` is now 2 ahead of `production`, the intended direction) | store-gated |

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

> ➡️ **2026-09-05: read [`G40-39-SESSION-HANDOFF-2026-09-05.md`](G40-39-SESSION-HANDOFF-2026-09-05.md)
> FIRST.** The notification half is fixed, merged, deployed and proven live (order 65185: photo at
> +90s, requester notified at +91s). Two items are open: the confirm/dispute **screen** still fires
> from order state before the photos exist (blocked on an owner decision), and the Go app did not
> prompt for a rating after confirmation (cause not yet found; the Done-button change is ruled out).
>
> ➡️ **2026-09-04 evening — both open items characterised first-hand, the owner ruled, and both
> halves of the screen fix are MERGED; see the last section, "2026-09-04 (evening)".** Backend
> **!495** (`photo_step_resolved`) is on `production` and **live**; requester **!278** is on `next`,
> store-gated: the confirm/dispute screen is not reachable until the photos are in or the Gopher
> skips, and nothing else happens meanwhile — **no timeout, by ruling.** The rating prompt was
> **delivered by the server** to the device last signed in as gopher 1 (the iPhone 15's `99.0.0(31)`
> build, not the Samsung); the owner rated through the history card's CTA, so the catch-all worked and
> that item is **closed**. ⚠️ The handoff's "02:31 ET" timestamps are UTC; the order ran at
> **18:30–18:34 EDT on 2026-09-04**.

## Still owed before this can go green

1. ~~Merge !269 and !270~~ — **DONE 2026-09-03.** Both merged not-squashed to `production`
   (`3d2c357b2`, `8396a54f2`), source branches kept. Content-verified against
   `origin/production` immediately after — the merged files are byte-identical to the tested
   commits, no rebase drift.
2. ~~Merge !266~~ — **DONE 2026-09-03.** `aac27c76b` merged as `3a28f1c21`, not squashed, source
   kept. Content-verified: `RequestDetailPullOver.js`, `ordercard.js`, and the new
   `photoStepRouting.js` on `origin/production` are byte-identical to the commit CI passed.
3. ~~Merge !271~~ — **DONE 2026-09-03.** `ef3596b85` merged as `18cb0de0f`, not squashed, source
   kept. Content-verified: `CompletionPhotosSection.js`, `orderConfirmation.js`, `Orderdispute.js`,
   the new CI guard, and `.gitlab-ci.yml` on `origin/production` are byte-identical to the commit
   CI passed and the commit screenshotted (below).
4. ~~Device-verify the Active-tab flow reaches `completion_photos` post-fix~~ — **DONE on iOS,
   2026-09-03, order 65146** (below). Android leg still open (item 6).
5. ~~Re-run the requester-confirm device test — a THIRD real order — once !271 is merged~~ —
   **DONE 2026-09-03, order 65146.** This is the first test where BOTH fixes worked end to end on
   real devices: the Go app correctly routed to the photo step (photo attached +33s after
   Complete) and `Orderdispute.js` correctly showed "View pic(s) of completed request" before the
   requester confirmed (+41s after the photo, +74s after Complete). Full timeline below.
6. ~~**Android** — one live order still owed~~ — **DONE 2026-09-05, order 65198.** The gopher side
   ran entirely on the real **Samsung Galaxy A50** (Go `3.9.1 (902)`, signed in as test gopher
   31677): In-Progress, Purchased, Complete, the native camera capture and the multipart upload
   (`Gopher added 1 completion photo(s)` at 05:25:33 EDT, one `Complete_Job_Attachment` row), then
   the rating prompt arrived on that phone and was used (`ratings` holds 31677 → 141548, score 5).
   That is the part iOS testing could not cover, now covered. The requester side was the iPhone 12
   on Requester `13.9.1 (603)`, a local build of `next` carrying !278 — see item 9 and the
   2026-09-05 section at the end.
7. **The original seven scenarios verified on the App Store build.** Their commits are confirmed
   ancestors of the actual shipped tags — not merely merged to a branch — and today's live test
   (order 65146) ran on a **local Xcode build** of `origin/production`, not the App Store binary.
   Still not done on the actual shipped build.
8. ~~**101 guides — copy WRITTEN, deliberately not published.**~~ — **PASTED 2026-09-05.** Owner
   ruling 2026-09-05: *"101 is NOT waiting on a store build. That doc is part of the new gopher
   marketplace and not public yet."* All five blocks from
   [`G40-39-101-guide-copy-STAGED.md`](G40-39-101-guide-copy-STAGED.md) are now in
   `Final/gopher-go-101.html` (stepper step 3, photo-step note) and `Final/gopher-request-101.html`
   (confirm intro + photo step, "No photos there?" note, history line). Exact-match paste, verified
   at 375px. Uncommitted in the working tree, like the rest of this session's doc edits.
9. ~~**Confirm screen waits for the photo step — MERGED, not device-verified**~~ — **DEVICE-VERIFIED
   2026-09-05, order 65198.** Backend **!495** is on `production` (`5813d416`, still an ancestor of
   today's head `acde84af`, all four files byte-identical) and **live**; requester **!278** is on
   `next` (`9b595b414`) and was exercised on the iPhone 12 as a local build (`13.9.1 (603)`). Result:
   Complete at 05:24:21 EDT → the requester app polled the order **30 times over 73 seconds and
   never opened the confirm screen** (zero `order_log` reads, versus +5 s on the old build) →
   photo at 05:25:33 → notify marker 0.4 s later → confirm screen opened with the photo → Confirm
   at 05:27:59 → payout, and `rateYourRequestor` emitted to the Samsung's socket at 05:28:02.
   **Still store-gated**: the shipped requester app does not carry !278 and behaves exactly as
   before until a release ships it.
10. ~~Rating prompt on order 65185~~ — **CLOSED 2026-09-04 evening.** The server delivered the
    prompt to the device last signed in as gopher 1 (the iPhone 15 build); the owner rated 65185
    from the Request History card's rating CTA ("the all red gopher holes"), which is exactly the
    Scenario 5 catch-all. Not a product defect. The multi-device weakness is recorded in the last
    section as report-don't-fix.

## 2026-09-03 (later still) — a SECOND unfixed completion path: `Orderdispute.js`

The device test the "still owed" list above called for was run. It disproved !270 rather than
confirming it.

**Order 65138, `order_logs`, to the second:**

| Event | Time | Offset |
|---|---|---|
| Order Completed | 21:07:45.036 | 0s |
| 2 photos attached | 21:08:47.236 | +62s |
| Requester Confirmed | 21:11:54.292 | +189s |

The photos existed **127 seconds** before the requester confirmed. Nothing showed on screen.
`orderConfirmation.js`'s poll fix (!270) had no bug in it — it was on the wrong component. The
push notification for "Order Completed" opens **`Orderdispute.js`**, found by grepping the exact
button text the device showed ("Confirm Completion", "will finalize your order", "cannot be
cancelled"). That file had **zero** completion-photo code, on either of its two render sites
(the primary post-completion flow, and a second one reachable after a dispute is resolved — both
call the same `handleConfirmed` → `confirm_payout/:id`).

**Same failure shape as `RequestDetailPullOver.js` the day before**: two screens do the same job,
one gets fixed, because each was verified against the file already known about. `orderConfirmation.js`
is real code and is reachable somehow — it was not deleted — but it is not what a real "Order
Completed" push opens.

### The fix — MR !271, gopher-mobile-request — CI green, awaiting merge

* **`src/component/CompletionPhotosSection.js`** (new) — the fetch/poll/render logic pulled out
  of `orderConfirmation.js` into a shared component, so it cannot be written a third time
  independently. `orderConfirmation.js` now renders `<CompletionPhotosSection orderId={orderId} />`
  instead of carrying its own poll `useEffect`.
* **`Orderdispute.js`** — gets `<CompletionPhotosSection orderId={orderId} />` at **both**
  `handleConfirmed` render sites.
* **`scripts/assert-confirm-screens-show-photos.mjs`**, wired into `.gitlab-ci.yml` — scans the
  **whole** `src/component` tree for any `confirm_payout` call site and fails if the file doesn't
  render `CompletionPhotosSection` at least as many times as it calls `confirm_payout`. Verified
  both directions: passes on the fixed tree; fails with the exact right diagnosis
  (`Orderdispute.js — 1 confirm_payout call(s) but only 0 CompletionPhotosSection render(s)`)
  against the unmodified file. Documented in-file limitation: this is a per-file count, not a
  per-button-site check, so it would not catch a *partial* fix within an already-covered file —
  it only guarantees no file has zero coverage, which is the failure mode both real incidents
  shared.

**Not yet resolved, stated rather than guessed:** the exact call site that navigates to
`Orderdispute.js` was not found in source (no literal `navigate(..., {next:"orderdispute"})`);
it is very likely driven by a server-sent push-notification payload rather than an in-app nav
call. Not blocking — the render-site fix was confirmed correct against the file's own
`props.state?.request?.id` pattern, and the live device evidence (order 65138) already proves
this is the screen that matters.

**MERGED 2026-09-03** — `ef3596b85` → `18cb0de0f` on `origin/production`, not squashed, source
kept. Content-verified: `CompletionPhotosSection.js`, `orderConfirmation.js`, `Orderdispute.js`,
`scripts/assert-confirm-screens-show-photos.mjs`, and `.gitlab-ci.yml` are byte-identical to the
tested commit.

**Rendered before merge, without spending a live order**: the exact unmodified `Orderdispute.js`
and `CompletionPhotosSection.js` from this commit, mounted in a real dev server via a throwaway
route + fixture data + a stubbed `/mobile-config` and `/orders/order_log` response — real code,
fixture data, not an invented mockup. Confirmed "View pic(s) of completed request" renders above
Confirm Completion, both thumbnails load, and tap-to-view opens the full-size dialog. All harness
scaffolding (temp route, fetch stub, `.env.requestor.local`, `node_modules` symlink, the
`launch.json` entry) was reverted immediately after — `git status` on the worktree came back
clean, byte-identical to the pushed commit, before this was merged.

## 2026-09-03 (final) — order 65146: BOTH fixes confirmed live, end to end, on iOS

Before this test, both physical test devices (iPhone 12 Pro, iPhone 15 Pro Max) were updated to
fresh local builds of `origin/production` — Go app `13.9.1` (build 33, from `3a28f1c21`,
carrying !266) and Requester app `13.9.1` (build 601, from `18cb0de0f`, carrying !269/!270/!271).
Built and installed via `xcodebuild` + `xcrun devicectl` (never the Xcode GUI Run button — see
"Tooling" trap below); both apps installed on both phones so either could play either role.
Native version bumps (13.0.3→13.9.1 Go, 13.1.1→13.9.1 Requester) were made only in throwaway
build worktrees, never committed.

**Order 65146** (gopher = test account `1`, requestor = test account `82271` — both owner-held
test accounts, confirmed by the owner, not a live customer). Timeline from `order_logs`, EDT:

| Event | Time | Offset |
|---|---|---|
| Order Completed | 6:24:28.748 PM | 0s |
| Photo attached | 6:25:01.688 PM | +33s |
| Requester Confirmed | 6:25:42.382 PM | +74s (+41s after the photo) |

Both halves of this fix worked correctly, verified from server-side timestamps rather than
on-screen impression alone (the owner suspected the section had rendered "early" — i.e. before a
photo existed — and asked for the logs rather than accepting the screen at face value):

1. **The Go app's Active-tab flow (!266) routed to the photo step.** A photo exists for this
   order at all, attached 33s after Complete — on a pre-fix build this order would have skipped
   straight to the rating screen with zero attachments, per the `RequestDetailPullOver.js` defect.
2. **`Orderdispute.js` (!271) showed the photo before the requester confirmed**, not after. The
   photo was in the database a full 41 seconds before the confirm tap; `CompletionPhotosSection`'s
   3-second poll would have surfaced it within a few seconds of it landing, around 6:25:04–05 —
   comfortably before 6:25:42. Nothing about this order's timeline supports the "shown early"
   theory; the photo upload was just fast.

**Not yet covered by this test, and still open:**
- **Android** — nothing this session has touched Android on either app. Everything verified so
  far (Go app routing, requester display) is iOS-only.
- **The App Store build.** This test ran a local `xcodebuild` build of `origin/production`, not
  the binary actually distributed to users. The original seven scenarios still need verification
  on-device against the shipped build, per item 7 above.
- The 101-guide update, deferred to store release per standing rule.


## 2026-09-04 (evening) — order 65185: both open items characterised first-hand

Everything in this section was read from `origin/production` source, the production **reader**
replica (SSM port-forward, `pg_is_in_recovery = true`), the production `web.stdout.log` in
CloudWatch, and the Samsung A50 over USB. Inherited claims are marked inherited.

### Correction — the 2026-09-05 handoff's times are UTC, not ET

| Event (order 65185, gopher = 1, requester = test account 141548) | UTC | **EDT** |
|---|---|---|
| Order created | 22:30:06 | 18:30:06 |
| Order Completed (`/complete/v2`, `defer_completion_notify` honoured) | 22:31:04 | 18:31:04 |
| **Requester's confirm screen starts polling `order_log`** (3s cadence = `CompletionPhotosSection`) | **22:31:09** | **18:31:09** — **+5s** |
| Gopher added 1 completion photo | 22:32:34 | 18:32:34 — +90s |
| Requester notified to confirm (SMS + push, one-shot marker written) | 22:32:35 | 18:32:35 — +91s |
| Gopher skipped (owner went back and tapped Skip; **no second notification**) | 22:34:02 | 18:34:02 |
| Requester Confirmed → capture → transfer → instant payout | 22:34:06–09 | 18:34:06–09 |
| `Sending rateYourRequestor` **then `EMITTING TO SOCKET ID: eqzzeaZMjkwwjjqMAAKb`** | 22:34:09 | 18:34:09 |

Side note, not G40-39: the server raised a **fraud alert** on this order ("completion logged 3.3 km
from the delivery address") and texted/emailed the owner. Expected for a desk test.

### OPEN #1 — the confirm/dispute screen: the exact path, and why the app cannot wait today

**Proven by the log:** `GET /orders/order_log/65185` began at +5s and repeated every 3 seconds
until the first photo landed. That cadence is `CompletionPhotosSection`'s poll, so `Orderdispute.js`
was mounted and its **Confirm Completion** button was live 85 seconds before any photo existed.

**The code path (requester app, `origin/production`):**

1. `requestOrder.js` (the tracking screen) polls `GET /orders/:id` every 7.5s and, on
   `aasm_state === 'delivered' && !disputed`, navigates to `/request` — the Request list.
2. `requestHeader.js` renders the list; a `delivered` card turns red. Tapping it calls
   `getOrderbyId`, which on `delivered && !unable_to_dispute` navigates with
   `next: "startDispute"` → `renderForm.js` case `orderdispute` → **`Orderdispute.js`**.
3. `Orderdispute.js` re-polls `GET /orders/:id` every 7.5s and renders `CompletionPhotosSection`,
   which polls `order_log` 3s × 30 and renders **nothing** while the array is empty.
4. `PushTapListener.js` acts only on `requestor.payment_action_needed` and `no_show_warning`; the
   "Order Completed" push just opens the app. It is not the trigger.

**Nothing on that path consults the photo step.** `aasm_state` is the only gate, and it flips the
instant the Gopher taps Complete — before the Go app has even shown the photo screen. The requester
app is never served `photo_requirement` (Gopher-only), so "still uploading" and "the Gopher skipped"
are indistinguishable to it. G40-427's own comment (2026-09-03) recorded exactly this as the reason
AC2/AC3 were left unbuilt: "a truthful in-flight state is a separate backend ticket".

**That backend piece is now built — `gopher-backend-api` MR !495 (unmerged).** Branch
`G40-39-expose-photo-step-resolved`, commit `7b5b021e`. It adds **`photo_step_resolved`** to
`GET /orders/order_log/:id` (the read the screen already polls) and to `GET /orders/:id` while
`delivered` (for a list-level gate). Rule, in the new dependency-free
`helpers/photo_step_resolution.js`: resolved when the one-shot completion-notify marker exists
(photos in / skipped / shipped app without the defer flag / A/R), **or** a completion photo is
stored, **or** the requester has already confirmed. The marker string moved into
`completion_notify_capability.js` so both sides import one constant; the older one-shot test now
executes it instead of grepping it. 11 new checks, proven to fail under two mutations; full suite
green apart from `admin-jwt-v8-contract`, which fails identically on unmodified `production` with
this machine's `node_modules`. **Additive — merging it changes nothing for any shipped client.**
Merge options: target `production`, squash **NO**, delete source **NO**.

**⛔ The client half is blocked on the owner's decision, asked a third time today.** The two shapes,
now costed against real code:

- **(a) Do not open the confirm screen until the step resolves.** Gate `requestHeader.getOrderbyId`
  (and the card's red state) on `photo_step_resolved` from `GET /orders/:id`; while false, the tap
  opens the ordinary `requestorder` view with a "your Gopher is adding photos" line. Touches the
  list, the tracking screen's `delivered` branch, and `Orderdispute.js` (for the push/deep-link
  case). Requester can still find Dispute only once the screen opens.
- **(b) Open the screen, hold Confirm.** `CompletionPhotosSection` (already shared by both confirm
  screens, already polling `order_log`) reports `photo_step_resolved` up; `Orderdispute.js` and
  `orderConfirmation.js` disable **Confirm Completion** and show "Your Gopher is adding photos…"
  while false; **Dispute stays enabled**. One shared component plus two buttons; the existing CI
  guard (`assert-confirm-screens-show-photos.mjs`) already forces every confirm screen through
  that component. **Recommended** — matches G40-427 AC2/AC3 as written, smallest change, and the
  requester keeps an exit.
- **A third question either shape must answer:** the server deliberately has **no fallback timer**
  (owner, 2026-09-04). If the Gopher's app dies after Complete, `photo_step_resolved` stays false
  until the 48h auto-confirm. Under (a) the requester never reaches Confirm; under (b) Confirm stays
  held. Does the **client** fail open after some minutes (Confirm re-enabled with "no photos were
  added"), or hold until auto-confirm? That is a product call, not something to bury in a poll.

Both shapes are client-only and therefore **store-gated**; !495 is the only part that can reach
users before a release.

### OPEN #2 — the rating prompt: the server delivered it; the phone in the owner's hand was not the registered one

**Verified first-hand:**

- `ratings` for 65185 holds one row: `rater_id 141548 → rated_id 1, score 5` — the **requester
  rating the Gopher**. No gopher-side row, so the handoff's "maybe a rating already existed" is
  ruled out; the guard passed and the emit ran.
- Production log at 22:34:09Z: `Sending rateYourRequestor {…"id":"65185"}` followed by
  **`EMITTING TO SOCKET ID: eqzzeaZMjkwwjjqMAAKb for rateYourRequestor`**. That line is written only
  on the success branch of `emitToSocket`, so the server **delivered** the event and, by design,
  wrote no `pending_notifications` row. (The handoff's inference — no row ⇒ the backend believed it
  delivered — was correct. ⚠️ A `"65185"` filter hides the EMITTING line because it carries no order
  id; read the `rateYourRequestor` filter instead.)
- `socket/socket_config.js` keeps **one socket per `(user_id, gopher)`** in memory, replaced on
  every new connection for that key. `users_roles` keeps **one `fcm_token` / `device_type` /
  `app_version` per role**, overwritten at sign-in (`controllers/user/profile.js` ~2036).
- **`users_roles` for user 1, role 2 (gopher) reads `device_type = ios`, `app_version =
  99.0.0(31)`** — the iPhone 15's local build from the handoff's device table, not the Samsung.
  The "Payday!!" push therefore went to that iOS token.
- Samsung A50: Go `3.9.1 (902)` and Requester `3.9.1 (902)` installed; the Go process has been
  running since **18:02:33 EDT**, was in the foreground at 18:34, and its console logged no socket
  reconnect during the test. The DB rows for the *requester* test account 141548 also carry a gopher
  role stamped `android 3.9.1(901)` — i.e. the Samsung's Go app was signed in as 141548 at some
  point on 2026-09-03/04, which is consistent with the shared devices being re-signed-in across
  sessions.

**✅ Proven from the socket registry (after the owner re-authenticated the AWS CLI, 19:50 EDT):**

| UTC | EDT | Registry line |
|---|---|---|
| 22:12:45–46 | 18:12 | gopher 1 registers, replaced within a second (double connect) |
| 22:13:32, 22:21:18, 22:23:42 | 18:13–18:23 | user 1 registers as **requester** (`is_gopher: false`), several times |
| 22:24:46 | 18:24:46 | gopher 1 registers (`zgsKwxPTsShjL_MqAAKZ`) |
| **22:24:47** | **18:24:47** | that socket removed; **`Socket connected: eqzzeaZMjkwwjjqMAAKb`** → `SOCKET: updated user user_id: 1 & is_gopher: true` |
| 22:34:09 | 18:34:09 | `EMITTING TO SOCKET ID: eqzzeaZMjkwwjjqMAAKb for rateYourRequestor` |
| 22:34:10 | 18:34:10 | `GET /mobile-config?p=ios&a=gopher&v=13.9.1` — an **iOS** Go app woke at that second; push sent to token `f643ujNJ_…` (iOS, per `users_roles`) |
| **23:01:51** | **19:01:51** | `Socket disconnected: eqzzeaZMjkwwjjqMAAKb` → removed for user 1 |

Three facts pin it to an iPhone, not the Samsung: the socket was created by a **connect-replace-connect
within one second**, which is the iOS `appStateChange` reconnect in `bottomMenu.js`/`getOrders.js`
(`isIOS && …getSocketConnect()`) — Android never reconnects on resume; it **disconnected at 19:01:51
EDT while the Samsung's Go app was continuously in the foreground until after 19:30** (usagestats,
logcat); and the only Go app that touched `mobile-config` at the emit second reported `p=ios`. Which
iPhone (12 at 13.9.1(34), or 15 at 99.0.0(31)) the server cannot say and it does not matter. The
Samsung's own socket had been displaced from the one-slot registry at 18:24:47 and never received
the event. The remaining unverified item — what the Samsung stored locally — was refused by the
session classifier and not worked around; it is moot now.

⚠️ **Two probe corrections, recorded so nobody repeats them:** (1) every "0 results" I first
reported for fixed CloudWatch windows was a hand-computed epoch **four days in the future**, not
the log — compute epochs with code, never by hand; (2) `logger.error` lines (e.g. `Socket not
found`) **do not reach `web.stdout.log` at all** — 0 in 40 hours despite four provable failed
emits that day — so their absence there is never evidence.

**What it means:**

- **Not a product defect for a worker with one phone.** It is a test-setup artefact: the owner's
  gopher account is signed into the Go app on three handsets, and every confirm-time signal
  (`rateYourRequestor`, `DisputeResolved`, `favoriteGopher`, the Payday push) lands on exactly one
  of them. The designed catch-all still applies: the confirmed history card for 65185 should show the
  pulsing **"Rate now →"** CTA on any device (`gopher_rated === false` from `/orders/v3`).
- **A real, secondary weakness worth a ticket, not a fix now:** multi-device accounts get
  confirm-time socket events on one device only, and the `GET /pending_alert` drain also emits to the
  registry's socket rather than the caller's — so even the fallback cannot reach a second device.
  Low priority; report-don't-fix.
- **The client pipeline reads sound** (`bottomMenu.js`: listener → `pendingAlertKey` → `fireAlert`
  → `grating`; `isAppActive` initialises `true`; `BottomMenu` mounts on every completion screen). It
  has not been exercised on a single-device gopher since G40-331 shipped, so if the re-test below
  still shows nothing, *that* is where to look next — not the server.

**How to close it (owner, ~5 minutes):** either open the iPhone 15's `99.0.0(31)` Go app and look
for the 65185 rating prompt / Payday banner, or check the Samsung's Request History card for 65185
shows "Rate now →". Then, for the real proof: sign the gopher account into **one** Go device, run a
confirm, and the prompt must open on that device.

### Blocked / not verified this session — stated, not worked around

- **AWS CLI session expired** mid-investigation (`aws login`, owner). CloudWatch reads after that
  point returned an error line that parses as "0 results"; every zero from that window was
  discarded. The already-open SSM tunnel kept working for DB reads.
- **Samsung WebView DevTools read** (localStorage only) refused by the classifier — no first-hand
  view of what the Samsung stored.
- **`admin-jwt-v8-contract.test.js`** fails on this machine on unmodified `production`
  (`expressjwt is not a function` — installed `express-jwt` shape). Not touched, not related.

### Owner rulings, 2026-09-04 evening — and what was built on them

Asked directly, with the mechanism above in front of him, the owner ruled (verbatim):

1. **On the confirm screen while the photo step is unresolved:** *"Nothing should happen, there
   is no point in notifying a customer and then having them wait. When the photos are either
   skipped or submitted, that triggers the screen with pics added/confirm/dispute."* → **option
   (a)**. Not (b): no "Confirm held" state, no in-flight message on the confirm screen.
2. **On a client fail-open timer if the Gopher never resolves the step:** *"This is moot, if the
   gopher doesn't skip or submit pics, nothing is triggered, so their screen still shows items
   picked up."* → **no timeout anywhere.** Stated consequence, so nobody re-derives it: in that
   case the requester reaches neither Confirm nor Dispute until the 48h auto-confirm; the money is
   protected by that auto-confirm and nothing else. Do not add a client fail-open without going
   back to the owner.
3. **On the rating prompt (OPEN #2):** *"i already rated it by going into the request history and
   tapping the all red gopher holes representing the rating was still needed."* → the Scenario 5
   catch-all worked; **closed**, no build.

**Built on rulings 1–2 — `gopher-mobile-requester-capacitorjs` MR !278** (branch
`G40-39-hold-confirm-screen-until-photo-step`, commit `b6530ac39`, **target `next`**, squash NO,
delete source NO; `next` was byte-identical to `production` when cut, so nothing to rebase):

- `src/helpers/photoStep.js` (new) — the one rule: `delivered && photo_step_resolved === false &&
  !disputed`. **Strict `false`**: an older backend, or !495 unmerged, omits the field and every
  gate passes exactly as today. Nothing is ever held on a missing value.
- `requestOrder.js` — the tracking screen's `delivered → /request` hand-off now also requires the
  step resolved; its existing 7.5s poll carries the flag, so the hand-off happens on its own when
  the photos land or the Gopher skips. Meanwhile the screen keeps showing the last step ("items
  picked up"), which is what the owner described.
- `requestHeader.js` — the Request list card stays **green** while unresolved (red means "act
  now"), and its tap opens the ordinary order view instead of `startDispute`.
- `Orderdispute.js` / `orderConfirmation.js` — if reached anyway (stale navigation state, deep
  link, a push tapped early) they send the requester back to the order view, from the same
  `/orders/:id` read they already make (`Orderdispute` re-polls it every 7.5s).
- `CompletionPhotosSection.js` — stops its bounded poll on "resolved, no photos" (the Gopher
  skipped) instead of 30 more calls.
- `scripts/assert-confirm-screens-wait-for-photo-step.mjs`, wired into `.gitlab-ci.yml` —
  executes the helper against real inputs (including "field absent ⇒ no hold") and asserts every
  `confirm_payout` screen, every `next: "startDispute"` route, the tracking hand-off and the list
  card consult it. Proven to fail under three separate reverts (`requestHeader.js`,
  `requestOrder.js`, `Orderdispute.js`). eslint `--max-warnings=0` and `prettier --check` clean;
  the two existing confirm-screen guards still pass.

**Backend MR !495 gained a second commit** (`7bbbeb98`): `photo_step_resolved` **per delivered
row on `GET /orders/v3` for requester lists** (two batched reads over the delivered ids only), so
the list card can hold. The Gopher's list is untouched. Test now 12 checks; the v3 check proven to
fail with the addition reverted.

**Merge order:** !495 first (auto-deploys, changes nothing for any shipped client), then !278
(store-gated). The client is inert until the backend is live, by construction.

**✅ MERGED AND DEPLOYED, 2026-09-04 (owner: "Merge both", 19:55 EDT).** Both merged via the
GitLab API with `squash=false`, `should_remove_source_branch=false`; both source branches confirmed
still on the remote; every changed file on `origin/production` (!495 → `5813d416`) and `origin/next`
(!278 → `9b595b414`) is byte-identical to the tested commit. Backend deploy verified first-hand, not
from the pipeline badge: CodePipeline Source `5813d416…` Succeeded → Deploy Succeeded; the
environment's `VersionLabel` ends in `5813d416`; `describe-instances-health` shows a single
instance `Ok / Deployed` on that label after the rolling batch retired the old one (the transient
Red/Degraded during the batch is the known rollout shape, not a failure); `GET /api/v1/apiversion`
200 at 21:05 EDT. `next` is now 2 commits ahead of `production` — the intended direction under the
`next` rule; do not reconcile it.

**✅ Device-verified 2026-09-05 on order 65198** — see the section below. The 101 copy stays
staged: it must describe the released app, and it now says the requester is asked to confirm
**only after** the photos arrive or are skipped.

**Report-don't-fix (owner rule), recorded here so it is not lost:** a gopher account signed into
the Go app on several phones receives every confirm-time socket event and the Payday push on the
**last-signed-in** device only, and the `pending_alert` drain emits to that same registry socket
rather than the caller's. Real workers have one phone; test accounts do not. Low priority.

## 2026-09-05 (morning) — order 65198: !278 device-verified, Android leg closed, rating prompt proven

**Setup (all verified on the server before the order was created):** requester test account
141548 on the **iPhone 12** running Requester **13.9.1 (603)** — a local `xcodebuild` of the `!278`
tree (`b6530ac39`, tree-identical to `next` `9b595b414`; bundle carries `photo_step_resolved`, the
old 602/902 bundles do not — the marker was proven against both). Gopher test account **31677**
("Gopher, Inc") on the **Samsung A50** running Go **3.9.1 (902)**; its `users_roles` row read
`android 3.9.1(902)` after a fresh sign-in, and the socket registry showed one connect for 31677 at
05:23:10 EDT, 25 s before In-Progress. The order used **Notify MY Gophers** with 31677 hand-picked
(`notify_fav_gopher = true`, one `notify_first_orders` row) — the owner's way of running a live
test without broadcasting to the network. Delivery / General Errand, not age-restricted.

⚠️ The gopher was **31677, not user 1**. User 1's gopher row still reads `ios 99.0.0(31)` (the
iPhone 15) and was irrelevant to this order. The Samsung's Go app holds `"id":"31677"` in its web
storage; that is how the account was identified, not from the owner's recollection.

**Timeline, from `order_logs` (EDT, `created_at` is UTC in the table — convert, do not trust a bare
`at time zone`):**

| Time | Event | Offset |
|---|---|---|
| 05:04:16.620 | Order Created | |
| 05:04:30.768 | Order Accepted by Fav- Gopher#31677 | |
| 05:04:33.609 | Order Assigned to Fav Gopher#31677 | +2.84 s after accept — see the transient below |
| 05:23:35.176 | Order In-Progress | |
| 05:24:11.255 | Item is Purchased | |
| **05:24:21.039** | **Order Completed** | 0 s |
| **05:25:33.925** | **Gopher added 1 completion photo(s)** (Samsung, native camera + upload) | **+73 s** |
| 05:25:34.307 | Requester notified to confirm completion | +0.4 s after the photo |
| 05:27:59.682 | Requester Confirmed for Order Completion | |
| 05:28:02.881 | Paid out to gopher 31677 (instant); Payout Completed | |
| 05:28:02 | `Sending rateYourRequestor` → `EMITTING TO SOCKET ID: pKIPUPX1r75EinmnAABs` | success branch, no `pending_notifications` row |

**What the requester app did during the 73 s, from the production access log** (filter `65198`,
window 05:23:30 → 05:25:20 EDT): **30 × `GET /api/v1/orders/65198`** (the tracking screen's poll,
`requestOrder.js`) and **0 × `GET /api/v1/orders/order_log/65198`** (the confirm screen's poll,
`CompletionPhotosSection`). On order 65185 (old build) the `order_log` poll began **+5 s** after
Complete. The confirm screen therefore did not mount until the photo step resolved — which is
the whole of the owner's 2026-09-04 ruling, observed on a handset. Owner, on the requester side:
*"Nothing changed on the requester side"* during the wait, then *"requester app triggered"* on
photo submit, then *"confirm/dispute screen is good!"*, then *"Test successful."*

**Rating prompt (OPEN #2, now proven on a single-device account, not only inferred):** the emit
went to 31677's one registered socket (the Samsung), the prompt appeared, and the gopher rated —
`ratings` for 65198: (141548 → 31677, 5) and (31677 → 141548, 5).

**Observed transient, outside G40-39 (logged in the 2026-09-05 handoff, report-don't-fix):** for
the 2.84 s between *Accepted* and *Assigned* the requester saw the "I'll select" state ("(!) New
Request Info (!)") before it corrected to "Request Accepted by". Canon (`three-acceptance-paths-canon`)
says the hand-picked MY Gopher accepting must behave exactly like First Available. Ticketed as
**G40-445** (sprint "Payment Options"); the server-side two-step is the mechanism, the reason for
it is unread.

**What this does NOT close:** item 7 (the seven scenarios on the actual store build) waits on the
Appflow release the owner reports is being built now, carrying `3a28f1c21` (Go) and `18cb0de0f` +
`b6530ac39` (Requester). Item 8 (101 copy) was pasted 2026-09-05 on the owner's ruling that the
Pages site the guides live on is unlaunched and a working doc, not a store-gated surface. Owner moved G40-39 and G40-427 to Done on 2026-09-05.
