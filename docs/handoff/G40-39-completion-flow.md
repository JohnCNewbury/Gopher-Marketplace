# G40-39 — the non-A/R completion flow, end to end — ✅ RESOLVED 2026-08-20

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
