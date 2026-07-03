# G40-83 — 1-hour "Need It Now" nudge: add two-way-comms suppression

**Jira:** G40-83 (Task, Low) · Gopher Go · Label `worker`
**Assignee:** John Newbury
**Scope:** BACKEND (cron/SMS) — dev-only. Nothing to build in the front-end prototype.
**Status:** the core nudge is **already implemented** (2024). The **only remaining work** is the
two-way-communication suppression. **Push fallback is descoped** (John, this pass).

---

## What already exists (verified in code — do NOT rebuild)

`middleware/cronTasks.js` → **`delayed_gopher_order_sms_alert()`** (lines ~579-610), scheduled as
`order_delay_sms_to_gopher` in `middleware/crons.js:407`. It runs:

```sql
UPDATE orders SET delayed_order_sms_send = true
WHERE category_type = 'Delivery'
  AND aasm_state = 'accepted'
  AND delayed_order_sms_send = false
  AND request_schedule_now = true            -- "Need It Now"
  AND order_accepted_on + interval '60 minute' < now()
RETURNING *;
```
…then sends the spec SMS (`Hi {first_name}, Your Gopher Delivery request has reached the 1 hour mark…`)
to each returned order's Gopher.

This already satisfies: Delivery-only (S7), Need-It-Now-only (`request_schedule_now`), 1-hour-from-
acceptance server-side, skip-if-completed/cancelled (S5/S6 — state must be `accepted`), atomic
**one-shot per order** (`delayed_order_sms_send` flag flipped in the same UPDATE — S9), and correct
first-name interpolation (S10).

---

## The only change to make — two-way-communication suppression (Scenarios 2, 3, 4)

Today the job sends the SMS **unconditionally** once the SQL matches. Add a guard so the nudge is
suppressed **only when the silence is not real** — i.e. skip an order when **both** parties have each
sent at least one in-app message on that order **within the last 30 minutes**.

**Where:** inside `delayed_gopher_order_sms_alert()`, between the `RETURNING *` result and the
`send_sms(...)` call (the `gopher_contacts.forEach` loop). For each candidate order, run the check and
only send if it is NOT actively-conversing.

**The check (per order):** in the order's message thread, is there ≥1 message from the **Gopher** with
`created_at >= now() - interval '30 minute'` **AND** ≥1 message from the **Requestor** in the same
window?
- **Both true → suppress** (send nothing).
- **Otherwise → send** the SMS. One-sided (S3) and stale/older-than-30-min (S4) conversations do **not**
  count as two-way, so they still get the nudge.

**Important ordering detail:** the current SQL flips `delayed_order_sms_send=true` for every matched
order *before* the send loop. Keep that atomic flag as the one-shot guard — a suppressed order should
**still** have `delayed_order_sms_send=true` set (we evaluated it once; per the one-shot rule we do not
re-evaluate it later). So the suppression only decides "send vs. don't send this one time," not whether
to re-check later. (If product ever wants suppressed orders to be re-nudged later, that's a separate
change — not in scope here.)

**Perf:** index the message table on `(order_id, sender_role, created_at)` so the 30-min lookup per
candidate order is cheap. Candidate volume per sweep is small (only Need-It-Now deliveries crossing the
1-hour mark), so a per-order query is fine.

---

## Explicitly OUT of scope (descoped by John, this pass)
- **SMS→push fallback (Scenario 8).** Not building it. The nudge stays **SMS-only**. Treat Scenario 8,
  the "Push fallback (abbreviated)" copy, and the "Fallback: push notification" delivery-channel bullet
  in the description as **superseded / not-to-build**.

---

## QA (delta only — the rest already passed in 2024)
- Accept a Need-It-Now delivery, both parties message each other within the last 30 min, wait for the
  1-hr sweep → **no SMS**.
- Same, but only one party messaged in the last 30 min → **SMS still sent**.
- Same, but the last messages from both are >30 min old → **SMS still sent**.
- No messaging at all → **SMS sent** (unchanged from today).
- Confirm still one-shot: a suppressed order does not get re-nudged on a later sweep.
