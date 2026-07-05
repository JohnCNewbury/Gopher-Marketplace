# G40-100 — Inbox: Deleted tab, swipe-to-delete, 90-day soft-purge, admin-expiration auto-move

**Jira:** G40-100 (Task, Low) · Both apps · Label `spine`
**Assignee:** John Newbury
**Scope:** Gopher app + Gopher Request app (client UI) + BACKEND (soft-delete state, purge/expiry sweep).
Dev-owned; front-end reference built (see bottom).

---

## Which inbox this is (settled in the 2024 comments)

This targets the **company / system-message inbox** — the backend `inbox_message` system: admin/company
messages (welcome, updates, promos), and referral notices (recommend-a-fav / refer-yourself). It does
**NOT** touch the **order/worker chat** — John confirmed those threads are archived in the Admin Panel
at order conclusion and are not user-deletable. (Note: the `Final/` prototype's "Inbox" is the *worker
conversation* inbox, a different surface — that's why the reference below is standalone, not wired into
the prototype.)

## Decisions locked by John
1. **Soft everything, for audit.** User-"delete" and the 90-day purge both **flag & hide** — the DB row
   is **never hard-deleted** (2024 comment). The rewrite's "permanent / no recovery" language means
   *no recovery for the user*; the record persists for audit/debug.
2. **Two-stage delete:** swipe-left (Inbox → Deleted) then explicit permanent-delete (with confirm) in
   the Deleted tab. No restore, no "silence" affordance.

---

## What already exists (verified)

- **Admin-message expiration already modelled:** `models/inbox.model.js` has **`expired_on`**, and the
  inbox query already filters it out (`controllers/user/inbox_message.js:147` — `now() < i.expired_on`).
  Today an expired admin message simply **disappears**; the ticket wants it to **move to Deleted**.
- **Per-user inbox state:** `models/inbox_users.model.js` has `viewed` but **no delete/hide flag**.
- **The inbox feed is a UNION** of `inbox_users`↔`inboxes` (admin/company) and `refer_favorites`
  (referral notices) — `controllers/user/inbox_message.js:80-171`. **Both branches need the delete
  state**, since users can delete referral notices too.

## Net-new (developer)

1. **Soft-delete state (per user, per message).** Add a state/timestamp to the per-user record:
   - `inbox_users`: add `deleted_at` (nullable) and `purged_at` (nullable). `deleted_at IS NULL` →
     Inbox; `deleted_at` set & `purged_at NULL` → Deleted tab; `purged_at` set → hidden from user
     (row kept for audit).
   - `refer_favorites`: it has no per-recipient join row, but it already has a recipient
     (`referred_to_id`) — add the same `deleted_at` / `purged_at` there (the recipient is the only user
     who sees it, so a column on the row is fine).
2. **Inbox query = two lists.** Split the existing feed into **Inbox** (`deleted_at IS NULL`) and
   **Deleted** (`deleted_at` set AND `purged_at IS NULL`) for both UNION branches.
3. **Swipe-delete endpoint:** set `deleted_at = now()` for the message (Inbox → Deleted).
4. **Permanent-delete endpoint:** set `purged_at = now()` (hide from user; **do not** `DELETE`).
   Confirm dialog is client-side.
5. **Sweep job** (reuse the `middleware/cronTasks.js` runner):
   - **90-day purge:** `deleted_at <= now() - interval '90 days' AND purged_at IS NULL` → set
     `purged_at = now()` (soft — S4).
   - **Admin-expiry auto-move:** admin/company message with `expired_on <= now()` that is still in a
     user's Inbox (`deleted_at IS NULL`) → set `deleted_at = now()` (S5). Stop hiding it purely via the
     `now() < i.expired_on` filter; instead let it land in Deleted and follow the same rules (S6).
6. **Both apps** consume the same endpoints (S8) — the change is server + shared client component.

> One sweep job covers both the 90-day purge and the admin-expiry move (same runner, two queries).

---

## Front-end reference — BUILT

`docs/handoff/G40-100-inbox-deleted-tab.html` (self-contained, brand-styled): the system-message inbox
with **Inbox / Deleted** tabs, **pointer/touch swipe-left** to move a row to Deleted, the **"Delete
permanently?"** confirm modal (Cancel / Delete, per the spec copy), an **admin-message "Expires" badge**
with a "Simulate expiry" control that moves it Inbox→Deleted, and a both-apps toggle. States captioned
to Scenarios S1–S8. The dev builds this into the real shared inbox component; behaviour is identical in
both apps.

## QA (delta)
- Swipe a system message → appears in Deleted, gone from Inbox; DB row still present with `deleted_at`.
- Permanent-delete from Deleted → confirm required; on Delete, `purged_at` set (row retained), hidden
  from user; Cancel leaves it.
- Fast-forward `deleted_at` 90+ days → sweep sets `purged_at`, message leaves the Deleted tab; **row
  still in DB**.
- Admin message with near-future `expired_on` → sits in Inbox until expiry, then auto-moves to Deleted.
- Referral notice (recommend-a-fav) is deletable the same way.
- No "silence" affordance. iOS + Android, both apps.
