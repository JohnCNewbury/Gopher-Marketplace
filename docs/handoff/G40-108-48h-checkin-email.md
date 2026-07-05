# G40-108 — 48-hour check-in email to Requestor when a scheduled request is still un-accepted

**Jira:** G40-108 (Task, Low) · Label `worker`
**Assignee:** John Newbury
**Family:** email program → folds under [[email-program-g40-305]] (G40-305 umbrella)

**Scope decision (John):** ship **v1 with the existing generic app-open link**. The request-specific
"cancel *this* request" deep link does **not** exist today and is split into its own prerequisite ticket
(see *Follow-up* below). So v1 = the reassurance email + a link that opens the Gopher Request app; the
user taps their request → cancel. Acceptance **Scenario 6 is deferred** to the follow-up.

---

## What's already in place (reuse — do not reinvent)

| Need | Where it lives | Notes |
|---|---|---|
| **Scheduler** | `middleware/crons.js` | `node-cron`, runs **every 1 min** (`* * * * *`), gated by `START_CRONS=true`. Tasks registered in `task_lists` and fired from `getTasks()`. Add the new job here — it is the home for every time-based sweep. |
| **Submission timestamp** | `orders.created_at` (`models/orders.model.js:76`) | The 48h anchor. **Not** `request_schedule_time` (that's the scheduled start; ticket explicitly anchors to submission). |
| **Request states** | `constants/index.js:101` `ORDER_STATUS` | `pending / accepted / picked_up / purchased / delivered / expired / cancelled / scheduled`. Column is `orders.aasm_state`. |
| **Email dispatcher** | `lib/sendEmail.js` | `send_mail(type, to, data)` — numbered `type → *.ejs` map + SendGrid. Sender rule: **transactional → `support@gophergo.io`, no unsubscribe** (per email program). |
| **One-time-send precedent** | `crons.js` | `reminder_to_requestor_for_confirm` uses a timestamp column (`confirmation_alert_at`); `re_authorize_token` uses a boolean flag; `order_notification` dedups via the `order_notifications` table. Any of these patterns is fine — recommend a timestamp column (below). |
| **Existing app link** | `gopherrequestapp.page.link/amTC` | The generic Firebase Dynamic Link used by every requester SMS/email today (e.g. `crons.js:389,557`, `cost_adjustment.js:195`). This is the v1 cancel link. |

## "Active + un-accepted" — the exact gate

A scheduled request that is still un-accepted at 48h sits in **`aasm_state IN ('pending','scheduled')`**
with **no gopher assigned** (`gopher_id IS NULL`). Every terminal/handled state is naturally excluded:
`accepted`, `picked_up`, `purchased`, `delivered` (completed), `cancelled`, `expired`. So the gate is:

```sql
aasm_state IN ('pending','scheduled')
AND gopher_id IS NULL
AND created_at <= NOW() - INTERVAL '48 hours'
AND checkin_48h_sent_at IS NULL   -- one-time guard (new column)
```

This satisfies AC Scenarios 2/3/4 (accepted/cancelled/completed before 48h → row excluded) for free.

## The two changes

**1. New column — one-time guard** (migration): `orders.checkin_48h_sent_at TIMESTAMP NULL`.
Mirrors the `confirmation_alert_at` precedent. Enforces AC Scenario 5 (one email per request, ever).

**2. New cron task** in `middleware/crons.js` `task_lists`, wired into `getTasks()` (alongside
`reminder_to_requestor_for_confirm`). Sketch:

```js
send_48h_checkin_email: async () => {
  const rows = await db.sequelize.query(`
    SELECT o.id, u.email, u.first_name
    FROM orders o
    JOIN users u ON u.id = o.requestor_id
    WHERE o.aasm_state IN ('pending','scheduled')
      AND o.gopher_id IS NULL
      AND o.created_at <= NOW() - INTERVAL '48 hours'
      AND o.checkin_48h_sent_at IS NULL`,
    { type: db.Sequelize.QueryTypes.SELECT, raw: true });

  rows.forEach(async (r) => {
    if (!r.email) {                     // missing/invalid email → log & skip, don't block (Impl. note)
      logger.info(`48h check-in: no email on file for order ${r.id}, skipping`);
    } else {
      send_mail(<NEW_TYPE>, r.email, { first_name: r.first_name, order_id: r.id });
    }
    // stamp regardless so a missing email is not retried forever
    await db.orders.update({ checkin_48h_sent_at: new Date() }, { where: { id: r.id } });
  });
},
```

**3. New email template — ✅ built.** `Documentation/SMS:Emails/checkin-48h-2026.ejs` (production, 2026
style) + preview `Documentation/SMS:Emails/gopher-email-checkin-48h.html`. Subject: *"Still need a
Gopher? We're on it."* Sender `support@gophergo.io` (transactional, no unsubscribe). Info-first: reassure
(still matching, nothing to do) → single off-ramp (cancel) → one Shamrock CTA. Still **to wire**: register
it in `sendEmail.js` at the **next free type number** (verify against
`Documentation/SMS:Emails/Gopher-Email-Tracker.md` — **36** = request-updated and **40–42** = cancellation
are taken) and add the row to the Email Tracker / Review Console.

**Deep link (the CTA "earmark") — embedded:** `https://api.gophergo.io/api/v1/app/requester` (John-supplied).
This is the requester-app open endpoint on the gophergo.io API — **not** the deprecated Firebase
`page.link` domain, so it's the correct go-forward mechanism. It is **generic** (opens the app; no request
id), which is exactly the v1 scope. When **G40-307** lands the request-specific cancel deep link, swap the
CTA `href` for it (and Scenario 6 becomes testable).

## Verification (matches AC)

- Seed a request, set `created_at` to 49h ago, `aasm_state='scheduled'`, `gopher_id=NULL` → run cron → email sent, `checkin_48h_sent_at` stamped.
- Repeat with `aasm_state='accepted'` / `'cancelled'` / `'delivered'` → no email (row excluded). ✅ S2/S3/S4
- Run cron twice → second pass finds `checkin_48h_sent_at IS NOT NULL` → no second email. ✅ S5
- Null email on file → logged + skipped + stamped, request unaffected. ✅ Impl. note

---

## Follow-up (prerequisite for AC Scenario 6) — request-specific cancel deep link

**Deferred out of G40-108 per John.** No request-specific deep link exists anywhere in the backend —
every link is the single static FDL `gopherrequestapp.page.link/amTC`, which opens the app generically
and carries no request id. Delivering "one-tap cancel *this* request" needs: (a) a link that carries the
order id, and (b) app-side routing that parses it and lands on that request's cancel flow. **Also note:**
Google has **deprecated Firebase Dynamic Links** (shutdown 2025) — the entire FDL mechanism needs
replacing platform-wide regardless, so this follow-up should pick the replacement (App Links / Universal
Links) rather than extend FDL. Tracked as its own ticket; G40-108 v1 does not block on it.
