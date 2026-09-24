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

---

## AS-BUILT — updated 2026-09-24

> Everything above this line was written **2026-07-02** and describes the BACKEND design plus a
> standalone front-end reference. It is still correct as a backend spec, but it predates the
> 2026-07-28 owner directive that widened this ticket to all platforms, so on its own it reads as
> though nothing has shipped. It has.

### Surface state (verified 2026-09-24 unless marked inherited)

| Surface | State | Evidence |
| --- | --- | --- |
| Gopher Request / Connect / Go / Deals (web) | ✅ Built, live | **INHERITED** — built 2026-07-28, verified in-browser by that session. Not re-driven by me. |
| Go app prototype | ✅ Built + defect fixed 2026-09-24 | Verified first-hand, see below |
| Request app prototype | ✅ Built | Verified first-hand, see below |
| Native iOS / Android | ⛔ Deferred by owner 2026-07-28 | Sequencing gate — a store release, not a deploy. Specifying is allowed; building is held. |

### Shared implementation

`Final/assets/js/gopher-inbox-delete.js` (`window.GopherInboxDelete`) +
`Final/assets/css/gopher-inbox-delete.css` (`.ibx-*`). Each surface supplies a small adapter.
`confirmPermanent()` is reused everywhere so the destructive copy cannot drift.

**⚠️ The stylesheet has a CONTRACT and it is easy to miss.** The CSS slides
`.ibx-rowwrap > .inbox-row` — the row you pass into `wrapRow()` **must carry the class
`inbox-row`**, whatever else it is called. A row without it is never positioned, never opaque and
never moves, which means the red delete bed sits **exposed and tappable at rest** and swipe-left
does nothing. The four web portals carry the class; the Go prototype did not (fixed `d86d267`).
On touch the desktop `×` is `display:none`, so on a phone that exposed bed is the *only* delete
affordance — a stray tap deletes.

### Verified behaviour — Go + Request prototypes, 2026-09-24

Driven on the running pages, not read from source:

- Two-stage delete: stage 1 moves to Deleted with no confirm; stage 2 from Deleted is permanent.
- Confirm copy byte-exact on both: **"Delete permanently?" / "This cannot be undone."** /
  **Cancel** (secondary, white+border) then **Delete** (primary destructive, `#C44257`), `aria-modal`.
  Cancel aborts and leaves the message.
- No restore affordance; no silence affordance. (The only `silen` match anywhere is the word
  "silently" in a code comment.)
- **Scenario 9** — a permanently deleted item stays gone across 10 re-renders, in **both** tabs.
- **Scenario 10** — deleting every conversation still renders the tabs, and Deleted stays reachable.
- **Empty thread does not throw** — the Request prototype survives deleting every message in the
  thread with zero console errors; composer and tabs remain.

### The 90-day clock — exercised in `node` against the real module

22 assertions, all green, and **proved by mutation** (three mutants, all killed):

- Purge boundary is `>=` 90 days: 89d not purged, 90d purged, 90d−1ms not purged.
- `daysLeft` never goes negative.
- `applyAdminExpiry` stamps `deletedAt` **at the expiry instant, not at the moment it is noticed** —
  a message that expired 30 days ago reads 60 days left, not 90, and re-running the check 10 times
  does not re-stamp it. An admin message that expired 91 days ago is purged on first sight.
- A user's own `deletedAt` is never clobbered by a later expiry evaluation.

> Mutants used: stamp-at-now (the clock-restart bug) → 3 failures; `>` instead of `>=` → 1 failure;
> dropping the already-deleted guard → 3 failures. A green run that cannot go red proves nothing.

### Prototype boundary (unchanged)

Deletion state is in memory and does not survive a reload. Purge and admin-expiry are
**check-on-read**, which this ticket's Implementation Considerations explicitly permit. Production
still needs the real `deleted_at` / `purged_at` columns, the sweep job, and server-side `expires_at`
evaluation — all as specced above this line.

### Measurement note for whoever verifies this next

The Browser pane reports `document.visibilityState === "hidden"`, and **CSS transitions do not
advance in a hidden document**. A transitioned `transform` therefore reads its START value forever
and a perfectly good rule looks dead. Disable the transition to observe the target value. This
cost a full diagnostic detour and nearly produced a false "the fix didn't work" finding.
