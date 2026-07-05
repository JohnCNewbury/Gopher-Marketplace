# G40-189 — Active Admin › Orders › Allow Admin To Update A Live Request

**Type:** Task · **Priority:** Lowest · **Label:** spine · **Bucket:** E (Admin) · **Disposition:** KEEP
**Ask:** From an order in the Orders tab, an admin can perform any/all functions for a **live**
request (advance to in-progress, mark items picked up, mark delivered, etc.). Every such action
stamps the GPS/timestamp entry as **"Updated by admin."**

Surface note: "Active Admin" is being replaced by the **Gopher HQ Dashboard** (`Documentation/Dashboard/`).
Build this into the dashboard's order surface, not legacy Active Admin.

---

## Current state (verified)

### Backend (June-2026 export, commit `e9bf57a3`)
- **Lifecycle transitions already exist — but only for the assigned gopher.**
  `controllers/order/update.js` advances `aasm_state` through
  `ORDER_STATUS` (`assigned → in_progress → picked_up/purchased → delivered`,
  constants at `constants/index.js:101`). Every handler is scoped to the acting gopher
  (`where: { id, gopher_id: decoded.id }`) and writes an `order_logs` row, e.g.
  `db.order_logs.create({ notes:'Order In-Progress', order_status:'order_in_progress',
  gopher_id, order_id, created_on, type:'info', lat, lon })` (`update.js:1143`).
- **Admin API exists and is auth-gated**, but can only *cancel*/*delete* an order — not advance it.
  `routes/admin.routes.js` mounts `router.use('/orders', verify_auth, orderRouter)` where
  `verify_auth` requires a JWT with `userType === 'ADMIN'` (`ADMIN_SECRET`). `controllers/admin/orders.js`
  exposes read (`get_bookings`, `get_booking_details`, `getCSV`, `getOrderJsonById`), plus
  **`cancelOrder`** (writes `aasm_state:'cancelled'` + `order_logs`, line 613) and `delete_order`.
  There is **no** admin endpoint for in-progress / picked-up / delivered.
- **No actor/attribution column on `order_logs`.** `models/order_logs.model.js` has
  `notes, order_id, type, lat, lon, address, order_status, updated_amount, gopher_id, event_id` —
  nothing records *who* made a change or that it came from an admin. So "Updated by admin"
  has nowhere structured to live today.

### Dashboard (`Documentation/Dashboard/app_part4.js`)
- The full-page order view `VIEWS.order → renderOrderPage(id)` (line 2031) is **read-only**.
  It already renders a **"Timing & status"** section (line 2081, with an `Updated at` field
  earmarked "Add to order bake") and an **Order log** (`_renderOrderLog`, line 1951, `Updated at`
  row earmarked). These are the exact host slots for the new controls + the admin-stamped entry.
- Owner-gating already exists in the dashboard (the Pricing Control publish flow is owner-gated) —
  reuse it so only owner/admin roles see the action buttons.

**Conclusion:** the order-detail surface exists on both ends, but the *interactive admin override*
(advance lifecycle + "Updated by admin" attribution) is **not built**. This is net-new.

---

## What to build

### 1. DB — attribute order-log entries
Add to `order_logs` (migration): `updated_by INTEGER NULL` (admin user id) and
`source VARCHAR NULL` (`'gopher' | 'requester' | 'admin' | 'system'`). Backfill existing rows to
`source='gopher'` where `gopher_id` is set. This makes "Updated by admin" queryable and renderable
rather than string-only.

### 2. Backend — admin lifecycle endpoints
In `controllers/admin/orders.js`, add admin-authed handlers that mirror the gopher-side transitions
in `update.js` but **drop the `gopher_id: decoded.id` guard** and validate state machine legality
(same guards as the gopher path — e.g. can't picked_up an already delivered/cancelled order). Suggested routes under the existing `verify_auth` `orderRouter`:
- `PATCH /orders/:id/in-progress`
- `PATCH /orders/:id/picked-up`
- `PATCH /orders/:id/delivered`
- (optionally a generic `PATCH /orders/:id/status { aasm_state }` validating allowed transitions)

Each handler:
1. Loads the order, asserts the transition is legal from its current `aasm_state`.
2. Updates `aasm_state` + `updated_at`.
3. Writes an `order_logs` row stamped as admin:
   `{ notes:'Order In-Progress — Updated by admin', order_status, order_id, created_on:new Date(),
   type:'info', source:'admin', updated_by:req.user.userId, lat:null, lon:null }`
   (no gopher GPS on an admin action — geo stays null; the "Updated by admin" label comes from `source`).
4. Fires the same downstream notifications the gopher path fires (so requester/gopher still get their
   status pushes) — reuse `controllers/order/notification.js`, single-recipient as today.

Mirror `cancelOrder` (line 613) for structure — it already proves the admin-writes-state + order_logs pattern.

### 3. Dashboard — action controls on the order page
In `renderOrderPage` (`app_part4.js:2031`), add an **owner-gated** action row to the "Timing & status"
card: buttons for the legal next transitions given the order's current status
("Mark in progress", "Mark items picked up", "Mark delivered"). On click → call the matching admin
endpoint, then refresh. In `_renderOrderLog`, render admin-sourced rows with an **"Updated by admin"**
badge (from `source==='admin'`) beside the timestamp.

### 4. Audit / safety
- Every admin transition is already captured by the stamped `order_logs` row (who via `updated_by`,
  what via `order_status`/`notes`, when via `created_on`) — that IS the audit trail; surface it in the log.
- Gate strictly to owner/admin. Never expose these controls to gopher/requester roles.

---

## Acceptance criteria
- An owner/admin, from the dashboard order page, can advance a live order through in-progress →
  items-picked-up → delivered (and any legal transition) without being the assigned gopher.
- Each admin action persists the new `aasm_state` and an `order_logs` entry with `source='admin'`
  and `updated_by=<admin id>`, no gopher GPS.
- The order log renders those entries with an "Updated by admin" label at the correct timestamp.
- Requester/gopher still receive their normal status notifications (single-recipient, unchanged).
- Illegal transitions are rejected with a clear error; controls are hidden from non-admin roles.

No front-end prototype screens are required — this rides the existing dashboard order page.
