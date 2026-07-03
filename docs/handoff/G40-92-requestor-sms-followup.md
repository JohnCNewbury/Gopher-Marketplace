# G40-92 — Requestor SMS follow-up fires intermittently (diagnosis + fix)

**Type:** Task (child of Epic G40-1 "Bug Fixes & Polish") · **Priority:** Medium · **Assignee:** John Newbury
**Status set:** groomed to dev-ready — 2026-07-02
**Applies to:** (A) the **current live backend** as an interim fix, and (B) the **new-build spec**.
Product decisions below confirmed by John Newbury on 2026-07-02. No open questions remain.

Backend investigated from the GitLab export `gopher-backend-api` (git bundle). Line
numbers below are from that export and are a starting map, not a guarantee of the
current HEAD — verify against the live branch before editing.

---

## TL;DR root cause (evidence-backed)
The symptom "SMS fires for some activity, not others" is **not** a flaky SMS queue. It's
that **an SMS was only ever wired for ONE of the trigger events (cost adjustment).** The
other events notify the requestor by **push notification only**, and that push is **gated
on the requestor having a valid FCM token** — so when the token is missing, expired, or
notifications are off, the requestor gets **nothing** (no SMS fallback). That reads to the
user as "intermittent."

| Trigger event | What the old code actually sends to the requestor | File:line |
|---|---|---|
| **Bid submitted** | **Push only**, gated on `requestor_data.fcm_token`. No SMS. | `controllers/order/order_bids.js:148` (`bid.submitted`) |
| **Counter-offer submitted** | **Push only**. No SMS. | `controllers/order/counter_offer.js:168` (`order.new_counter.available`) |
| **Cost adjustment pending** | **SMS** (+ push). The *only* real requestor SMS. | `controllers/order/cost_adjustment.js:196` (SMS) · `:237` (push) |
| **Request accepted / "I'll choose my worker"** | **Push only** to requestor. | `controllers/order/order_gophers.js` / bid-accept in `order_bids.js:809` sends SMS to the **gopher**, not the requestor |

Secondary reliability problems, even where SMS *is* sent:
1. **`send_sms` re-throws on any Twilio error** (`lib/sendSms.js:19` → `.catch(err => { throw err })`).
   The call sites are inline `await send_sms(...)` in the controller's main flow with **no
   local try/catch**, so a transient Twilio failure (rate limit, bad number, network) throws
   mid-request and the SMS is silently lost — no retry, no queue, no dead-letter.
2. **Push sends are fire-and-forget** (`send_push_notifs(...)` is not awaited), so push
   failures are invisible too.
3. **No acknowledgment gating** on the requestor-notify path. The ticket wants "no SMS if
   already acknowledged," but these call sites fire immediately on the event with no
   "requestor hasn't seen it yet" check. (Note: the *gopher-broadcast* path
   `middleware/OOA_notif.js` — "a new request is available in your area" — is a **different
   direction** and has its own dedup via `order_alert_send_on`; do not confuse it with the
   requestor follow-up. It also has a `chunk.forEach(async …)` inside `Promise.all` that
   doesn't actually await — flag if that path is ever in scope, but it's out of scope here.)

---

## (A) Interim fix to the LIVE backend
Goal: make the requestor SMS fire reliably on every in-scope event today, before the rebuild.

1. **Add the missing SMS sends.** Wire an SMS to the requestor at each trigger that is
   currently push-only: **bid submitted** (`order_bids.js:148`), **counter-offer**
   (`counter_offer.js:168`), and **request accepted / "I'll choose my worker"**
   (`order_gophers.js` accept path). Mirror the existing cost-adjustment SMS as the pattern.
2. **SMS must not depend on push.** Send the SMS regardless of `fcm_token` presence. Push is
   a bonus channel; SMS is the guaranteed one. Do **not** put the SMS inside the
   `if (requestor_data.fcm_token)` block.
3. **Make sends non-fatal + retried.** Wrap each `send_sms` in its own try/catch so a Twilio
   error is logged and does **not** abort the underlying action (bid/accept/adjustment must
   still succeed). Add a lightweight retry (or enqueue) rather than a single inline attempt.
4. **Acknowledgment suppression.** Do not send (or cancel a queued) SMS if the requestor has
   already acknowledged that specific activity (viewed/responded). Track per-event
   acknowledgment so a follow-up isn't sent after the user has already acted.
5. **Logging/monitoring/alerting.** Log every send attempt with outcome (queued/sent/failed)
   keyed to `order_id` + event type, and surface failed sends to an alert (the code already
   writes `db.order_logs`; extend that + add a failure alert). Cross-check against Twilio
   logs to confirm which events were previously dropping.

## (B) New-build spec (go-forward flow)
The requestor SMS follow-up must fire reliably on **every** in-scope event. Trigger set
(confirmed with John — note SMG is **renamed** "I'll choose my worker," same behavior):

**On a pending (not-yet-connected) request:**
1. **Bid submitted**
2. **Counter-offer submitted**
3. **Cost adjustment pending** requestor approval
4. **Request accepted** by a Gopher (includes "I'll choose my worker" flow)

**On a connected (matched/active) request:**
5. **Inbox message** — see rules below. (This **reverses** the original ticket's "no SMS for
   inbox"; inbox SMS applies *only after* the request is connected.)

**Rules:**
- SMS is a **first-class, independent channel** — never gated behind push having a token.
  Push may also fire, but its absence must never suppress the SMS.
- **Acknowledgment suppression:** no SMS if the requestor has already viewed/responded to
  that activity.
- **Inbox specifics (John's decisions):**
  - **Recipient: requestor only.** Gophers do **not** get inbox SMS (they're active workers;
    saves Twilio cost).
  - **One SMS max per unacknowledged message.** No duplicate SMS for the same message; if the
    requestor has already read the message/thread, send none. (No batching window — it's a
    per-message cap, gated by acknowledgment.)
- **Reliability:** non-blocking send with retry/queue + dead-letter; failed sends logged and
  alertable; delivery keyed to `order_id` + event for auditing.

## Acceptance criteria (go-forward)
1. Bid submitted → requestor SMS (even with no FCM token).
2. Counter-offer submitted → requestor SMS.
3. Cost adjustment pending → requestor SMS.
4. Request accepted / "I'll choose my worker" → requestor SMS.
5. Connected request, new inbox message the requestor hasn't seen → exactly one requestor
   SMS per message; none if already read; gophers never receive inbox SMS.
6. No SMS for any event the requestor has already acknowledged.
7. Every send attempt is logged with outcome; failures alert.
8. A Twilio failure never aborts the underlying bid/accept/adjustment/message action.
9. Holds on iOS + Android + web.

## QA
- Fire each of the 4 pending-request triggers 5×; confirm an SMS every time, including with
  push disabled / no FCM token on the requestor account.
- Connected request: send several inbox messages; confirm one SMS per unread message, none
  after the requestor opens the thread, and no SMS to the gopher.
- Force a Twilio error (invalid number/sandbox); confirm the action still completes and the
  failure is logged + alerted.
- Confirm an acknowledged event produces no SMS.

## Key files (old backend, for the interim fix)
- `controllers/order/order_bids.js` — bid submit (`:148` push-only), gopher-accept SMS (`:809`)
- `controllers/order/counter_offer.js` — counter push-only (`:168`)
- `controllers/order/cost_adjustment.js` — the working SMS pattern (`:196`, `:772`)
- `controllers/order/order_gophers.js` — accept / "choose my worker" path
- `controllers/order/notification.js` — `send_push_notifs` dispatcher (`:366`)
- `lib/sendSms.js` — `send_sms` (`:19`); re-throws on error, no retry/queue
- `middleware/OOA_notif.js` — gopher-broadcast (different direction; out of scope, noted to avoid confusion)
- `models/pending_notification.modal.js`, `models/order_notification.model.js` — existing notification-tracking tables to reuse for acknowledgment/audit
