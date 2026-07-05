# G40-184 — Gopher Go: Disputed Order Bug (Order 45741)

**Type:** Bug · **Priority:** Lowest · **Label:** worker · **Status:** To Do
**Reported symptom:** "Order 45741 — Request was sent and caused a large number of users to
receive a 'Dispute' message and locked their active screen." (created 2025-08-26)

---

## Verdict: Not reproducible in the current codebase — fixed by the Ruby → Node rewrite

The incident occurred on the **legacy Ruby backend** (see `ruby.old.README.md`) driving the
old smashingboxes iOS apps. Both have since been fully replaced:

- Backend → the current **Node/Express + Sequelize** API (June-2026 GitLab export).
- Clients → the **new Request / Gopher Go apps** John is building (the `-figma.html` screens).

The multi-user fan-out that produced this bug has **no surviving code path**.

### Evidence (June-2026 backend export, commit `e9bf57a3`)

1. **Dispute is single-recipient.**
   `controllers/order/report_dispute.js` → `dispute_order()`:
   - Looks up exactly **one** recipient: `users_roles.findOne({ user_id: updated_order.gopher_id, role_id: 2 })` (lines 147-152).
   - Fires push to that single token only via `notification.send_push_notifs('request.disputed.gopher', { gopher: { fcm_token } })` (lines 154-166).
   - Emails only that gopher (`send_mail(11, gopher_data.email, …)`, line 245).

2. **The push case is scoped to one token.**
   `controllers/order/notification.js` → `send_push_notifs`, case `'request.disputed.gopher'`
   (title "Your Request Is Being Disputed :(", ~line 790-811):
   `notif_data.fcm_tokens = [gopher.fcm_token]` (or `new_app_fcm_token`) — a one-element array.

3. **No broadcast primitive exists.**
   `lib/sendPushNotif.js` only calls `getMessaging().sendEachForMulticast(payload)`, each guarded
   by `if (validTokens.length > 0)`. There is **no** FCM topic send, `sendAll`, `sendToTopic`, or
   `subscribeToTopic` anywhere in the backend (grep clean). An empty/missing token list sends to
   **nobody** — it can never fan out to "a large number of users."

4. **No socket broadcast on dispute.** No dispute-related emissions in `socket/`.

### Why the old app failed (root cause, historical)
The legacy Ruby stack delivered the dispute notification through a path that reached far more than
the order's two parties (topic-style / mis-scoped recipient set), and the old Gopher Go client
locked its **active-request screen** on *any* inbound dispute message rather than only when the
disputed order was that user's own active order. Neither the delivery path nor that client exists now.

---

## Recommended disposition

**Close as "Cannot Reproduce / fixed by rewrite."** The architecture that caused it is gone and the
new one is structurally incapable of the fan-out.

### Optional low-cost hardening (if we want a permanent guard rather than a close)
Both are cheap and make the fix durable rather than incidental:

1. **Backend regression test** — assert `dispute_order` calls the push sender with a recipient array
   of length ≤ 1, and that `sendPushNotif` is never invoked with an empty token array producing a
   topic send. Prevents a future refactor from reintroducing a broadcast.
2. **New-client rule (Gopher Go)** — the dispute lock/notice must key off the *user's own active
   order id* matching the disputed order id; a dispute for any other order must not alter the
   active screen. Bake this into the active-request screen's dispute handling as it's built.

No front-end prototype work is required for this ticket.
