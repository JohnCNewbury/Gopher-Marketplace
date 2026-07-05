# G40-95 — HQ Dashboard: "Users by Location" targeted-messaging tool

**Jira:** G40-95 (Task) · Label `spine` · Priority Lowest · RFP: **KEEP**, Bucket **E (Admin)** — net-new.
**Surface:** the **Gopher HQ Dashboard** (`Documentation/Dashboard/`), the console replacing Active Admin
(G40-70). John is building the tool UI in the dashboard directly; this doc is the **zero-discovery backend
+ logic spec** — targeting rules, opt-out sources, send flow, and audit schema, all grounded in the live
`gopher-backend-api`.

Builds on **G40-103** (Users detail now carries location / work-settings fields).

---

## What it is
An admin tool to send a message to **users filtered by location**, with:
1. an **active-user eligibility floor** (don't blast dormant accounts),
2. a **two-step send** (compose → confirm with resolved recipient count),
3. **per-channel opt-out** respect, and
4. a **per-send audit log**.

Closest existing machinery: the OOA broadcast (`middleware/OOA_notif.js` + `middleware/crons.js`) — it
already does consent-checked fan-out with unsubscribe links. This tool generalizes it with location
targeting, an active floor, multi-channel, and an audit trail.

## 1. Audience targeting (grounded in real columns)

**Location** — `addresses` table (polymorphic; `addressable_id` = user id, confirm `addressable_type='User'`):
- `state`, `city`, `zip_code` — the primary "by location" filters (dropdown / multiselect).
- `latitude`, `longitude` — for radius targeting (haversine from a chosen point/zip centroid).
- `users_roles.radius` + `users_roles.point` — a gopher's own service radius, if targeting by coverage.

**Active-user eligibility floor** — `users` carries Devise auth fields:
- `last_sign_in_at`, `current_sign_in_at`, `sign_in_count`. Floor = `last_sign_in_at >= now() - :activeDays`
  (expose 30 / 60 / 90-day presets). Optionally require a live session (`users_sessions.active = true`).
- Reject a send if the resolved count is below a **minimum floor** (guardrail against tiny/accidental sends) —
  the ticket's "active-user eligibility floor."

**Role** — `users_roles.role_id` (1 = gopher, 2 = requestor) to target requestors, gophers, or both.

## 2. Per-channel opt-out (must respect before sending)

| Channel | Eligibility source | Rule |
|---|---|---|
| **Email** | `users_roles.sub_ooa` (role 2) | Send only where `sub_ooa = true`. Include the unsubscribe link (CryptoJS AES pattern from `OOA_notif.js:127` → `unsbscribe_broadcast`, which flips `sub_ooa`). Marketing sender `notifications@gophergo.io`. |
| **Push** | `users_roles.fcm_token` (+ `device_type`) | Send only where an `fcm_token` is present. No token ⇒ not pushable. |
| **SMS** | ⚠️ **GAP — no per-user SMS opt-out flag exists in the schema.** | See dependency below. Interim: rely on Twilio's carrier-level STOP list; do **not** claim per-user SMS consent until a flag exists. |

**Dependency (SMS opt-out):** add a per-user SMS consent flag — e.g. `users_roles.sub_sms BOOLEAN` (mirror
`sub_ooa`) or an `sms_opt_outs(user_id, opted_out_at)` table — and an inbound STOP webhook to set it. Until
then the tool should either disable the SMS channel or clearly label it "carrier opt-out only."

## 3. Two-step send flow
- **Step 1 — Compose:** pick channel(s), audience filters (location + role + active floor), and message body.
  Backend `POST /admin/broadcasts/preview` returns the **resolved, opt-out-filtered recipient count per
  channel** (never send from this call).
- **Step 2 — Confirm:** admin reviews channel + count + message; `POST /admin/broadcasts/send` executes the
  fan-out (reuse the `OOA_notif` loop: consent check → build unsubscribe link → dispatch → log per recipient).
  Block send if count < minimum floor.

## 4. Per-send audit log (new)
No broadcast audit table exists. Add:
```
admin_broadcasts(
  id, admin_id, channels TEXT[],           -- ['email','push']
  filter_json JSONB,                        -- {state, city, zip, role, activeDays, minFloor}
  message_subject, message_body,
  recipient_count INT, sent_count INT, failed_count INT,
  created_at TIMESTAMP
)
-- optional per-recipient detail for full auditability:
admin_broadcast_recipients(id, broadcast_id, user_id, channel, status, error, sent_at)
```
Every send writes one `admin_broadcasts` row (and, if used, one `admin_broadcast_recipients` row per send).
Surface the log in the dashboard as a "Sent history" table.

## Acceptance criteria → source
| Rule | Source / where |
|---|---|
| Filter users by location | `addresses.state/city/zip_code` (+ lat/lng radius) |
| Active-user eligibility floor | `users.last_sign_in_at` ≥ now−N; reject if count < min floor |
| Two-step send (compose → confirm) | `/admin/broadcasts/preview` then `/send` |
| Respect per-channel opt-out | email `sub_ooa`; push `fcm_token`; **SMS flag = dependency** |
| Per-send audit log | new `admin_broadcasts` (+ recipients) table |

## Notes
- Reuse `OOA_notif.js`'s consent + unsubscribe machinery rather than writing a new sender.
- Email consent (`sub_ooa`) is role-2 (requestor) only today; confirm the gopher-side consent column before
  emailing gophers.
- The dashboard bakes data in as a DB stand-in — the live preview/send endpoints are backend work; the
  dashboard tool calls them (or, pre-backend, previews against baked `metrics.json` counts).
