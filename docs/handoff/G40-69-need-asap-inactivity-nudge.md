# G40-69 — Need-ASAP inactivity nudge

> **STATUS 2026-08-12 — ✅ LIVE ON PRODUCTION AND VERIFIED END TO END WITH A REAL REQUEST.**
> [MR !270](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/270) merged as
> **`d0dac62c`**, carrying **`5225d2c2`** — **not squashed**, so that SHA stays citable. Deployed by
> `gopher-prod-codepipeline`; `need_asap_inactivity_nudge` confirmed present in the running app.
> `START_CRONS=true`, `NEED_ASAP_NUDGE` unset → **ON**. **Backend only — no app release needed.**
>
> **No go-live burst.** Measured immediately after deploy: **zero** nudge markers and **zero**
> qualifying orders. The feared backlog — every accepted Need-ASAP order older than 10 minutes
> becoming due at once, since no markers existed yet — did not exist. The owner had asked for
> `NEED_ASAP_NUDGE=false` as insurance; once measured to zero the flag was left ON by agreement.
>
> ### Live test, order 64302 (owner-driven, 2026-08-12)
>
> | UTC | Event |
> |---|---|
> | 10:41:36 | accepted by gopher 31677 |
> | **10:52:00** | `need_asap_nudge_1` — **"SMS + push"**, 24s after due, inside the 1-minute tick |
> | **11:02:00** | `need_asap_nudge_2` — **"push"**, no SMS, exactly 10m00s later |
> | 11:05:21 | `order_in_progress` written (In Progress tapped) |
> | 11:12:00 | nudge 3 due — **never fired**; watched to 11:22 |
>
> Owner confirmed the SMS **and** the push arrived on the device. **The cost rule holds on real
> infrastructure:** one SMS, then push only.
>
> ⚠️ **What the stop test did NOT isolate.** By 11:11:41 the order had reached `picked_up`, so at
> 11:12 **two** conditions independently excluded it — the `order_in_progress` log row *and*
> `aasm_state` no longer being `accepted`. That the sequence stops is confirmed; that the **log-row
> check** is what stopped it is not. The isolating test is to tap In Progress and **not** pick up —
> leaving `accepted` + an `order_in_progress` row — then let a 10-minute mark pass. That is precisely
> the window in which the replaced 60-minute alert fired its false nag. Covered by the unit test and
> by code reading; not yet proven live.

**Jira:** G40-69 (Task, High) · **Sprint** John "Low Risk"

---

## ⛔ The ticket mis-describes live behaviour. Read this first.

The ticket says: *"Current Behavior: No SMS or push notification is sent when a Gopher accepts a Need
ASAP request but fails to start it within 10 minutes."*

**That is false.** `delayed_gopher_order_sms_alert` has been running in production on the existing
cron the whole time:

| | Live behaviour before this change |
|---|---|
| Fires at | **60 minutes** after acceptance |
| Scope | **`category_type = 'Delivery'` only** |
| Repeats | **No** — one-shot, guarded by `orders.delayed_order_sms_send` |
| Need-ASAP scoped | Yes (`request_schedule_now = true`) |
| Kill switch | **None** — on whenever `START_CRONS=true` |

So G40-69 is a **tightening of a live feature**, not a new one. This is a docs-are-truth instance:
the ticket was written from intent, not from the code.

## 🐛 Live defect found while tracing it (independent of this ticket's scope)

**The 60-minute SMS nags Gophers who have already started.** Marking a request In Progress writes an
`order_logs` row (`order_status = 'order_in_progress'`) but leaves `aasm_state` at **`accepted`**
until pickup. The old query filtered on `aasm_state` alone, so a Gopher who had updated the app still
received *"your request hasn't had any activity"* an hour later.

This is going out today, to real workers, and it is fixed as a side effect of the change below —
recorded here so it is not lost if G40-69 is ever re-scoped.

---

## The canonical rule (owner, 2026-08-11)

Owner, verbatim: *"This ticket is actually costly over kill. Simplify into 1 process. 10 min no
activity is an SMS and Push, every 10 min after that is Push only since those are free."*

- **One process.** The 60-minute alert is **superseded**, not run alongside — two overlapping nudges
  would mean a worker gets the 10-minute chain *and* the 60-minute message.
- **Nudge 1, at 10 minutes: SMS + push.**
- **Every nudge after, every 10 minutes: push only.** Push is free; SMS is not. **An abandoned
  request costs exactly one SMS, however long it sits.**
- **Stops** when the Gopher marks In Progress **or** messages the customer.
- Need-ASAP only (`request_schedule_now = true`); **all categories**, no longer Delivery-only.

Earlier owner ruling the same day: the follow-up interval is **10 minutes**. The ticket contradicts
itself — Scenario 2's heading says "every 5 minutes" while the notification sequence, business rules
and expected behaviour all say 10. **Ten is correct; the heading is wrong.**

## What it costs — measured, not estimated

Read-only against production, Need-ASAP orders accepted in the **30 days to 2026-08-11**:

| | |
|---|---|
| Need-ASAP orders accepted | **185** |
| Would send the new 10-minute SMS | **68** (36.8%) |
| Actually sent under the old 60-minute rule | **12** |
| Never started *or* messaged at all | **6** |

≈5.7× more SMS, but on a tiny base: 68 messages × 2 segments ≈ **$1/month**. Follow-ups are free.

⚠️ **The number worth a second look is 36.8%, not the cost.** More than one in three Gophers who
accept a Need-ASAP request would be told they have done nothing — while only **6 of 185** genuinely
abandoned one. The rest were working and simply had not tapped the button within ten minutes. That is
a "does this feel naggy" judgement, not a billing one. `NEED_ASAP_NUDGE_MINUTES` changes it without a
code change.

## Two implementation decisions that depart from the ticket

**1. A cron with durable state, NOT "a background timer triggered on request acceptance."**
Elastic Beanstalk **replaces the instance on every deploy** and runs **two instances during a rolling
deploy** — both observed directly on 2026-08-11. An in-process `setTimeout` would be lost on every
deploy and could fire twice mid-rollout. State lives in `order_logs`, so a restart resumes exactly
where it left off, and a missed window catches up **one step per tick** rather than firing a burst.

**2. The stop condition is the log row, not the order state** — see the defect above.

## The SMS body, and the one character that matters

```
Hi {first_name},

Your Gopher request hasn't had any activity since you accepted it.

Please reach out to your customer ASAP and update the app to in-progress.

Thanks!

Gopher, Inc
```

**Straight apostrophe, deliberately.** The ticket's template used a curly one. A single non-GSM-7
character forces the whole message to UCS-2, dropping the segment size from **153 → 67** and billing
**three segments instead of two**, on every send, forever. The test asserts the charset rather than
trusting it.

## Configuration

| Env var | Default | Effect |
|---|---|---|
| `NEED_ASAP_NUDGE` | **on** | set to `false` to stop it **without a deploy** — the old alert had no switch |
| `NEED_ASAP_NUDGE_MINUTES` | `10` | cadence |
| `NEED_ASAP_NUDGE_MAX` | `6` | cap, so an abandoned request cannot nudge forever |

**Default-on is deliberate:** this replaces a live behaviour, and defaulting off would silently leave
Need-ASAP requests with no nudge at all.

## Files

- `middleware/cronTasks.js` — `delayed_gopher_order_sms_alert` → **`need_asap_inactivity_nudge`**
- `middleware/crons.js` — task map repointed (the schedule entry is unchanged)
- `controllers/order/notification.js` — new push type `gopher.order.inactive`, **appended at the end
  of `notif_types`**: every case is matched by **array index**, so inserting anywhere else silently
  re-points existing notifications at the wrong copy
- `test/g40-69-need-asap-inactivity-nudge.test.js` — new

## Verification

- **34 assertions passing.** The cost rule is asserted directly (first nudge SMS+push, all later ones
  push-only) because it is the assertion most likely to be broken by a well-meaning later edit.
- **Negative control against the replaced function: all 4 key assertions fail** — no in-progress
  check, no message check, Delivery-only, 60 minutes.
- Full suite **61 suites / 537 assertions green**; all four CI guards pass; lint at the pre-existing
  baseline; prettier clean on the pinned 2.8.8.
- ⚠️ A harness flaw was caught and fixed: `cronTasks.js` **destructures `send_sms` at require time**,
  so swapping the stub afterwards has no effect — which silently turned the resilience test into a
  no-op. The stub now fails on a sentinel number instead.

## Rule 12 — front-end counterparts

**None.** This changes no Connect / Request / Deals / Go surface and no prototype: the nudge is
entirely server-side and the worker sees an SMS and a push, not a screen.

**Open question for the owner:** whether `gopher-go-101.html` should tell workers the nudge exists.
Rule 5 covers user-facing behaviour changes, and an unexpected text arguably qualifies. Raised rather
than assumed.
