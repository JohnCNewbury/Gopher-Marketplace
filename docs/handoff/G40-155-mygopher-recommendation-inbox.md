# G40-155 — MY Gopher (Favorite Gopher) Recommendation View In Inbox

**Type:** Bug (3 bundled) · **Priority:** Medium · **Backlog map:** KEEP · Bucket A ·
"MY Gopher recommendation inbox: 3 bundled bugs." · **Figma:** node 105-15465
**Status set this session:** In Progress

## Context
The prototype's Inbox had **no** MY Gopher recommendation message at all — `renderInbox()`
rendered only plain-text bubbles. So the three reported bugs (which assume the feature
exists in the native app) couldn't be reproduced. Per direction ("if missing, understand
the goal and build it — no dev handoffs when we can build it now"), the recommendation
inbox message was **built** into the Request prototype, with Bugs 1 & 3 fixed by
construction. Bug 2 (SMS) is the one genuinely backend piece.

## What was built (Request app — `Final/gopher-request.html`)
A MY Gopher recommendation message now renders in the Inbox thread: a card headed
"★ MY Gopher — {friend} recommended N Gophers for you", containing a list of
recommended-Gopher rows (avatar + name + tier + rating + "View Profile ›").

### Bug 1 — View Profile opens the standard profile modal ✅
- Each row is a **single tap target** spanning the photo through the "View Profile"
  label (`<button class="inbox-rec-row">`).
- Tapping it calls the **existing** `openGopherProfileModal(...)` (line ~22675) — the
  same modal used for bids, interested Gophers, and counter offers — passing
  `{ name, pro, tier, rating, reviews, photo }`.
- **Verified:** clicking a row opens `#gopherProfOverlay` with that Gopher's profile
  (e.g. Rosa Medina → "Gopher Elite+ … Verified").

### Bug 3 — recommendation list is scrollable ✅
- The list wrapper `.inbox-rec-list` has `max-height:172px; overflow-y:auto;
  -webkit-overflow-scrolling:touch;` so **all** recommended Gophers are reachable
  regardless of count (the native Android bug was a non-scrollable container).
- **Verified:** with 4 seeded Gophers, `scrollHeight=560` vs `clientHeight=172`,
  `overflow-y:auto`, list scrolls; the 4th Gopher sits below the fold and scrolls into view.

### Implementation points (for the RN rebuild)
- Render branch: `renderInboxMsg(m, mi)` — `m.type === 'recommendation'` → the card,
  else the normal text bubble. Thread map now calls `renderInboxMsg`.
- Message shape: `{ type:'recommendation', friend, time, gophers:[{name,tier,rating,reviews,photo}], text }`.
- Demo seed: `REC_SEED_THREAD()` is unshifted into `getThreads()` so the message shows
  in the Inbox (isolated to the Inbox; **not** added to `activeRequests`). In production
  this message is created when a referrer sends a MY Gopher recommendation.
- Tap wiring: after `renderInbox()` sets innerHTML, `.inbox-rec-row` clicks resolve the
  Gopher from `thread[mi].gophers[gi]` and call `openGopherProfileModal`.
- RN translation: build the row list inside a `ScrollView`/`FlatList` with a bounded
  height (the `max-height` above), and attach the row's `onPress` to the same profile
  modal component used for bids/interested/counters.

## Bug 2 — Referral SMS missing app download links (BACKEND SEAM)
The SMS is sent server-side (not in the static prototype), so this is the one piece that
stays a backend change. The referral SMS template for MY Gopher recommendations must
include **both** app deep links:
- **Gopher App (Requestor):** `https://api.gophergo.io/api/v1/app/requester`
- **Gopher Go:** `https://api.gophergo.io/api/v1/app/go`

Reconcile with the referral scaffold `Documentation/Jira Tickets/referFlow.js` (G40-212),
whose `STORE_LINKS` are still placeholders (`gophergo://get-started/*`, `apps.apple.com/idXXXX`,
Play Store) with a `// TODO: confirm real store URLs`. Use the two `api.gophergo.io`
links above as the canonical app-download URLs for the referral SMS.

## Files touched
- `Final/gopher-request.html` — `.inbox-rec-*` CSS; `renderInboxMsg()` + thread-map call;
  `.inbox-rec-row` tap wiring → `openGopherProfileModal`; `REC_SEED_THREAD()` + `getThreads()` unshift.

## Verified
- 2.5 MB page loads with **no console errors** (edits parse/run clean).
- Inbox → recommendation card renders 4 rows; tap → standard profile modal; list scrolls.
