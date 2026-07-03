# G40-80 — Gopher-proposed reschedule of an active request (UX + front-end requirements, and code-state addendum)

**Jira:** G40-80 (Task, Low) · Both apps · Label `pay` · Umbrella for the scheduled-request-handling work (absorbed G40-72, G40-111, G40-188)
**Assignee:** John Newbury
**What this doc is:** the **UX / front-end requirements** John asked to prepare, plus a **code-state
addendum** so the dev *extends the reschedule feature that already exists* rather than rebuilding it.
The full behavioural spec (12 scenarios, Stripe A/B/C table, business rules) lives in the ticket
description — this doc does not repeat it; it grounds it in the actual code and defines the screens.

---

## Decisions locked by John (this pass)

1. **Eligibility = ANY active order, including on-demand / ASAP** — not just scheduled orders. Remove
   the existing "scheduled order only" guard. A Gopher on an ASAP job (even mid-**In Progress**) can
   propose a new date/time, converting it to scheduled.
2. **Two problems this solves** (keep these front-of-mind for scope):
   - **Stripe's ~7-day authorization limit** — a reschedule that pushes the time past the original
     auth window must re-authorize (the A/B/C cases in the ticket).
   - **Mutually-agreed pause/resume of a started job** — today, if a Requester and Gopher agree to
     break and resume a started project, **Gopher Inc must intervene manually**. Standard Gophers take
     **one request at a time**, so a stuck in-progress order blocks the Gopher. This feature removes
     that manual step — protecting Gopher's low-overhead model.
3. **Reuse the existing reschedule button/flow** — this is an *extension of a shipped feature*, not a
   new one. See the code-state addendum below.

---

## Code-state addendum — what already exists vs. what's net-new

**Already exists (legacy `gopher-backend-api` — extend this, don't rebuild):**
- Module **`controllers/order/re_schedule.js`** with the full request → approve/decline loop:
  - `request_reschedule` (`POST /orders/:id/rescheduled`) — Gopher proposes; notifies the requestor
    (`reschedule.requested.requestor`); creates a `re_schedule_order` row.
  - `view_reschedule_request` (`GET /orders/:id/rescheduled`).
  - `accept_reschedule` (`POST /orders/:id/accept/rescheduled`) — sets
    `orders.request_schedule_time = reschedule_time`, marks the row `active:true`, notifies the Gopher
    (`reschedule.request.accepted.gopher`).
  - `declined_reschedule` (`POST /orders/:id/declined/rescheduled`).
- Table **`re_schedule_order`**: `order_id`, `reschedule_time`, `active`, `declined`, `created_at`.
- **One-pending-at-a-time** is already enforced (`request_reschedule` 409s if an `active:false,
  declined:false` row exists) — satisfies the ticket's "only one Reschedule Pending" rule.
- Push-notif templates: `reschedule.requested.requestor`, `reschedule.request.accepted.gopher`,
  titles "Rescheduled Request Approval Needed / Approved".

**Net-new (all developer work — payments/state-machine/cron are dev-only per `Final/CLAUDE.md`):**
1. **Widen eligibility.** Remove the scheduled-only guard at `re_schedule.js:61`
   (`if (!order.request_schedule_later || !order.request_schedule_time) → 400`). Replace with an
   **active-lifecycle** check: allow **Accepted through In Progress**, block **Completed / Cancelled**.
2. **Stripe auth handling (A/B/C)** at the moment of requestor approval — none exists in
   `re_schedule.js` today. Encapsulate in one service fn `(order, proposed_time) → auth_ok|auth_failed`
   per the ticket table. On failure, revert to original time (Scenario 6).
3. **4-hour timeout + 1-hour reminder.** Add `expires_at` to `re_schedule_order` and a periodic sweep
   (the crons live in `middleware/cronTasks.js` — mirror `reminder_confirm_auto_payout`). Expiry =
   decline (Scenario 8); reminder push at 1 hour remaining (Scenario 9).
4. **Decline/expire notifications** (templates for the requestor-declined and auto-expired paths).
5. **`accept_reschedule` must call the Stripe service** before updating the time, and revert if it
   returns `auth_failed`.

> Migration note: add `expires_at` (and optionally `created_by`, though initiator is Gopher-only) to
> `re_schedule_order`. No backfill needed.

---

## Front-end / UX requirements

The go-forward prototype has **no reschedule-with-approval UI** today (only the initial
new-request scheduling picker, `reScheduleDefaults`/`ensureScheduleDefaults`). Both surfaces below are
net-new front-end, to be built against the endpoints above.

### A. Gopher Go — "Reschedule" propose surface (Gopher side)
- **Entry point:** a **Reschedule** action on the active-request detail, visible for **any active
  order from Accepted through In Progress** (hidden on Completed/Cancelled — Scenario 10). Only Gophers
  see it (Scenario 12). Reuse the existing reschedule button styling/pattern.
- **Picker:** reuse the app's date/time picker (same one used to schedule a new request) to choose the
  proposed new date/time. Prevent past times.
- **Confirm:** a confirm step stating "This sends a request to <Requestor> to approve the new time. The
  job stays active until they respond." On confirm → `POST /orders/:id/rescheduled` with
  `request_reschedule_time`.
- **Pending state:** show a non-blocking **"Reschedule pending — waiting on <Requestor>"** chip on the
  order. Base state (Accepted / In Progress) is **unchanged and still visible** (Scenario 2). Disable a
  second Reschedule while one is pending (the API 409s anyway).
- **Resolution:** on approve/decline/expire, update the chip and surface a toast/notification.
- **Pause/resume framing:** for an **In Progress** job, the confirm copy should reflect the
  mutually-agreed-pause use case ("You and <Requestor> are pausing this job and resuming <new time>").

### B. Gopher Request — approve / decline surface (Requestor side)
- **Notification:** push + **in-app banner** on the order: "<Gopher> proposed a new time: <new time>."
  with **Approve** / **Decline** actions (Scenario 1).
- **Approve:** calls `POST /orders/:id/accept/rescheduled`. Handle the Stripe outcomes returned by the
  backend:
  - success (cases A/B/C-ok) → confirmation state, order shows as scheduled at the new time on the Home
    Screen (Scenario 3/4/5, 11).
  - **card failed (case C fail)** → error state: "Your card couldn't authorize the new time," with a
    **path to update payment method and retry**; order reverts to original time (Scenario 6).
- **Decline:** calls `POST /orders/:id/declined/rescheduled`; order stays at original time/state;
  both parties notified (Scenario 7).
- **Countdown:** show the **4-hour** response window and a **1-hour-left** reminder (Scenario 8/9). On
  expiry, banner resolves to "Reschedule request expired — original time stands."

### C. Post-approval behaviour (both apps)
- Indistinguishable from a normally-scheduled request: Gopher's **scheduled tab** on Home; Requestor's
  Home Screen shows it as a scheduled request at the new time (Scenario 11). This reuses the existing
  rescheduled-request post-accept handling (`accept_reschedule` already sets `request_schedule_time`).

### Design reference
Figma (old UX, directional only — not the style guide):
`https://www.figma.com/design/g7DWLbI86O6SqiwITY7jeL/...?node-id=6503-4701`

---

## Suggested build order (cheapest path)
1. Widen the eligibility guard + add `expires_at` (tiny backend change to an existing module).
2. Front-end A + B wired to the existing endpoints (works end-to-end **minus** Stripe re-auth, since
   the accept path already updates the time).
3. Stripe A/B/C service + wire into `accept_reschedule` (the genuinely hard, highest-risk part).
4. Timeout/reminder cron.
5. Feature-flag the whole thing (ticket recommends this — touches state machine + payments + dual-party
   UX at once).

---

## Still-open for the dev? — none
All product ambiguity is resolved: eligibility = any active order incl. ASAP; reuse the existing
reschedule feature; the two problems being solved are the Stripe 7-day window and mutually-agreed
pause/resume. Remaining items are pure engineering implementation (Stripe incremental-auth capability
per card brand, cron cadence) — the dev owns those, and the ticket already calls them out.
