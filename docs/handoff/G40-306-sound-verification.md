# G40-306 — Notification-sound verification, end to end (2026-08-19)

**Owner ruling (verbatim intent):** G40-306/G40-311 will NOT introduce any new sound. The
shipped sounds are the set; close both tickets once every legacy sound is matched to the
correct feature/function. This doc is that verification.

## Architecture (how a sound is chosen — verified at source, origin/production everywhere)

The **backend picks the sound**: `controllers/order/notification.js` sets
`notif_data.sound = PUSH_NOTIF_SOUNDS.<key>` (`constants/index.js`), `lib/sendPushNotif.js`
puts it in the push payload (`sound || 'default'`). The apps play whatever the payload names:
Android `MyFirebaseMessagingService.java` strips `.wav` and resolves `res/raw/<name>` on a
per-sound notification channel; iOS plays the bundled wav via APNs. **Both apps bundle the
identical 9-file set** (verified in android `res/raw` AND the iOS pbxproj, both repos):
`in_app_msg · new_request_available · payment_failure · payout_and_cost_adjustments ·
request_accepted · request_cancelled · request_completed · request_progress_actions ·
reschedule_request`.

⚠️ **A widely-copied claim is FALSE and is corrected here:** "current prod apps play the
single legacy tone (OLD - Gopher Go Notification.wav)". That file is in the master folder
only — it is **not in either app bundle**; production has been per-category for as long as
this dispatcher has existed. The G40-311 "Phase II" split was premised on that stale claim.

**Authority for the mapping:** `JS App Notification Flow and Audio Files.pptx` (17 slides,
Desktop/Gopher/Development/Sounds Files/), extracted slide-by-slide for this audit.

## The full production map — 36 types, every one checked against the deck

Correct before this audit (25): claim/complete/cancelled-by-gopher → their named sounds;
counter accepted/declined, cog declined/accepted, bid submitted/accepted, scheduled
accepted ×2, reschedule requested/approved, disputed, in-progress/picked-up/purchased/
started, payout, payment error, new-request broadcast, in-app message, favorite referral,
no-show warning (deck-silent; progress-family is sensible).

**Corrected in MR !326 (gitlab gophergo/gopher-backend-api, branch
`fix/g40-306-notification-sound-matching`, commit `29ba7473`):**

| type | was | now |
|---|---|---|
| `order.new_cog.available` "Cost Adjustment Requested" | `request_completed.wav` (sounds like "done!" while asking for MORE money) | `payout_and_cost_adjustments.wav` |
| `gopherorder.cancelled.requester` (worker's cancel notice) | default tone | `request_cancelled.wav` |
| `bid.order.cancelled.requester` | default tone | `request_cancelled.wav` |
| `secheduled.order.cancel.by.requester` | default tone | `request_cancelled.wav` |
| `order.bid.declined.requester` "Order Offer Request Denied" | default tone | `payment_failure.wav` (deck's declined/disputed family) |

**Deliberately unchanged:**
- `order.new_counter.available` → `in_app_msg.wav`. Deck is silent on requestor-side
  counters; the alternative is the bid-activity family (`request_accepted.wav`). Owner's
  taste call — flagged in the MR, not decided.
- Expiring / reminder / app-update / inactive nudges → default tone (no deck family).

**Deck rows that CANNOT ship, per the ruling (recorded, not built):**
- *Cash Register* (deck: requestor cost-adjustment + Rewards-Cash-added) — asset exists in
  the master folder but was never bundled. Its cost-adjustment row maps to
  `payout_and_cost_adjustments.wav` (the MR); its Rewards row is moot until Rewards (2027).
- *Favorite Gopher Congrats* — asset never bundled AND no production push type exists for
  "you were favorited". If that feature ships in the rebuild, it needs a type + a ruling on
  which of the 9 sounds it uses.

## Ticket dispositions
- **G40-306** → Done. Banner template built (`gopher-banner.js` + the reference doc +
  Style Guide §7.7); sound mapping verified and corrected (MR !326 pending merge).
- **G40-311** → Cancelled. Its entire content (new per-category sound set + New/Legacy
  toggle) is ruled out — and its premise was stale anyway: per-category is already live.
