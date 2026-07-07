# G40-164 — In-app messaging not documented in the Admin Panel

**Status:** Root-caused (backend bug) + verified in the June-2026 export · admin-visibility already solved by the HQ Dashboard · no prototype build warranted
**Jira:** G40-164 · Bug · Medium · `spine` · Both Apps
**Repro:** order 45039 — messages occurred in-app, no record in the Active Admin Panel, so support can't see the correspondence to intervene.

## Verdict
This is a **backend defect**, not a UI gap. Messages are either (a) persisted but **excluded by the admin
query**, (b) **delivered but never persisted**, or (c) **orphaned/hard-deleted**. Fix is in the legacy
`gopher-backend-api`. The admin *visibility* half is already handled by the HQ Dashboard (below).

## Root cause — ranked (verified against the 2026-06-12 `gopher-backend-api` export)
All user-to-user chat writes to one table, **`orders_faqs`** (`content/from/to/order_id/viewed/content_type`;
`orders_faqs.model.js` declares `order_id/from/to` **nullable**). The live socket path is `index.js:224`
(`socket_init`); `shared/Socket.js` is commented out (dead).

**H1 — most likely: messages persist, but the admin per-order query drops them.**
`controllers/admin/orders.js:292–345` does `JOIN users fu ON fu.id = fq.from` **and** `JOIN users tu ON tu.id = fq.to`
(both INNER), then assembles the response `gophers[]` **only from messages where `message.gopher === true`**
(a gopher was the *sender*, L321–333). So: requester-only threads, or any row with a null/non-user `from`,
render as **"no messages."** Same INNER-JOIN pattern in `controllers/admin/messages.js:16–17,45–47,109–111`.
*Fix:* change those joins to `LEFT JOIN`; return **all** messages for the order (seed the participant list
from `orders.requestor_id`/`gopher_id`, not from message senders).

**H2 — delivered-but-not-persisted (live socket chat).**
`socket/socket_config.js:117–119` emits to the recipient **before** an **un-awaited** insert whose helper
**swallows all errors** (`create_faq_socket`, `faq.js:112,154–161` → `return error`, never throws). `from`
comes from `socket.user_id`, set by an **un-awaited** `connect_user` (L99) — a `newMessage` arriving first
has `from = undefined` → insert throws → no row, but the recipient already saw the text. Same anti-pattern in
`location_update.js:166–167` (`create_faq_socket1`, L77–84).
*Fix:* await `connect_user` before accepting events; **persist first, emit second**; make the helpers throw
so failures surface (Sentry).

**H3 — orphaned `order_id` (or null `from`/`to`).**
`create_faq_socket`/`create_faq_socket1` take `order_id/from/to` straight from the payload with no validation
(`faq.js:87–112`, `location_update.js:10–35`); nullable columns accept them, so a bad payload persists a row
no per-order query matches.
*Fix:* `allowNull:false` on `order_id/from/to` in `orders_faqs.model.js`; validate the order (`findByPk`)
before insert, as `create_faq` (Path D, `faq.js:13–78`) already does.

**H4 — least likely, destructive: hard delete.**
`admin/orders.js:462–477` `delete_order` runs `DELETE from orders_faqs where order_id=:id` with no
soft-delete/archive. If 45039 was ever deleted/recreated, its messages are gone.
*Fix:* soft-delete (`deleted_at`) or archive-before-delete; show archived rows to admin.

**Not a cause, but a trap:** system/broadcast messages never live in `orders_faqs` — `gopher_support`
(`inboxes`/`inbox_users`) and `refer_yourself`/`refer_favorites` are unioned into the in-app inbox with
`order_id=0, from=0, to=0` (`controllers/user/inbox_message.js:127–159`). If the "missing correspondence"
was one of these, no order-scoped record ever existed by design.

## Admin visibility — already solved by the HQ Dashboard (Admin Panel replacement)
`Documentation/Dashboard/`:
- **Per-order full correspondence:** `_renderOrderComms(o)` (`app_part4.js:1963–2030`) renders **every**
  message for an order (connected + pre-connection threads, flagged messages highlighted), appended to the
  order-detail page (`renderOrderPage`, L2103). Backed by `M._allmsgs` — the **full** message history, not
  just flagged.
- **Triage → conversation jump already exists:** each Message Alerts card renders an **order link**
  (`app_part4.js:2640`, `data-dd="order"`) that opens that order's detail (and its correspondence). No new
  link needed.
- **Data pipeline is clean:** `regen_reports.py:446–447` passes **every** row of the in-app-messages CSV into
  `_allmsgs` (no gopher-keying, no user-join) — the dashboard does not reproduce H1.

**Pull-layer caveat:** the dashboard is only as complete as its source CSV. If that CSV is exported via the
**flawed admin messages endpoint** (`admin/messages.js`, H1's INNER JOINs), the dashboard inherits the same
exclusion at the pull. The pull should use a **raw `orders_faqs` dump** (or the fixed query) so the HQ
Dashboard documents everything.

## Recommended fix order
1. **H1** — LEFT JOIN + return all messages in `admin/orders.js` & `admin/messages.js` (surfaces already-
   persisted rows; also fixes the dashboard pull if it uses these endpoints). Highest impact, lowest risk.
2. **H2/H3** — persist-before-emit, await `connect_user`, un-swallow errors, validate/NOT-NULL `order_id/from/to`.
3. **H4** — soft-delete `orders_faqs`.
4. Backfill: re-key existing orphaned rows (`order_id`/`from` recoverable from socket/session logs) if feasible.

## Files (legacy `gopher-backend-api`)
`controllers/admin/orders.js` (H1,H4) · `controllers/admin/messages.js` (H1) · `socket/socket_config.js` (H2) ·
`controllers/order/faq.js` (H2,H3) · `controllers/order/location_update.js` (H2,H3) · `models/orders_faqs.model.js` (H3).
Cross-ref: In-App Communication Policy (G40-35) shares the `orders_faqs` send seam.
