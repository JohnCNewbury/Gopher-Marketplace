# AWS — session handoff 2026-08-24

**Transcript:** `67ce7b41-acae-4a4d-b6eb-46ae71fa75ac.jsonl`
(`~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/`)

**Grep anchors:**
`Gopher-Prod-Alerts` · `RollingWithAdditionalBatch` · `FARUD_INTERVAL` · `buildAlertEmailData`
`pi_3U7xj0CQp3eawbpn0JarZWXp` · `i-0fd0aa69eadfec69c` · `refresh-token-comparison.sh`
`7.09%` · `fraud-alarms-backup-20260807T100730Z.json` · `8ca71edd-e810-4cf8-babf-ded67ee83aee`

Account **049786760635**, `us-east-1`. Session ran 2026-08-04 → 08-24.

---

## State of play

### DONE — verified against the live account

| Thing | Evidence |
|---|---|
| **Email flood diagnosed and already over** | SNS `NumberOfMessagesPublished` 9,636/30d; ~400/day → ~28/day at **2026-07-30 18:12 UTC**, the owner-approved 4xx health-rule change. Mailbox was ~2 months' accumulation, **not** 20k/month. |
| **No second sender** | Gmail `label:AWS/Alerts -from:no-reply@sns.amazonaws.com` → **19** of ~22,917 (0.08%). |
| **Fraud alarms decoupled from EB** | `Gopher-Prod-FraudAlertUndeliverable` + `…FraudSmsPermanentlyRejected` moved off the EB-managed topic to **`Gopher-Prod-Alerts`**. Field-level before/after diff: **only `AlarmActions` changed**. Delivery **tested**: published=2, delivered=2, failed=0. Backup `/tmp/fraud-alarms-backup-20260807T100730Z.json` (⚠️ `/tmp` clears on reboot). |
| **All 17 `Gopher-Prod-*` alarms publish to `Gopher-Prod-Alerts`** | none stranded on the old topic. |
| **4 external `@jaiinfoway.com` SNS subs removed** | zero remain; clean in us-west-2/us-east-2/eu-west-1; vendor had **no IAM users or keys**. Backup `/tmp/sns-subs-backup-20260807T124818Z.json`. |
| **Rob Hazle: 11 redundant policies detached** | `AdministratorAccess` kept. **`simulate-principal-policy`: all 10 probe actions still allowed**, incl. MFA enrolment. Backup `/tmp/rob-hazle-perms-backup-20260807T131341Z.txt`. |
| **Cost reductions are landing** | RDS **39.03 → 32.13 $/day**; total **60.01 → 52.20 $/day** (≈ **−$242/mo**). Budget limit $1,700, AWS forecast $1,551. |
| **`refresh_token` returns 500 for an auth outcome** | should be 401; ~21% of all production 5xx. **Fixed in prod 08-07 (`db4a54f4`).** |
| **Crons double-run on every deploy** | `RollingWithAdditionalBatch` + `MinSize 1/MaxSize 2` + environment-level `START_CRONS=true`. Proven from **log streams named by instance id** — 4 distinct instances, 2 per event. |
| **No duplicate money movement (7d, our logs)** | 75 money markers → **75 distinct (type, order)**; CAPTURE 25 / TRANSFER 25 / PAYOUT 25. |

### ⚠️ NOT verified — do not repeat these as fact

- **"No money moved twice" rests on OUR application logs over 7 days, NOT Stripe.** Stripe is the
  authority and this session never had access. **This is the one open item.** See *Open questions*.
- **`orders.payment_status` / `payment_auth_retry_count` for 64739 / 64771 / 64730** — never read.
  Production RDS is **VPC-only** (`10.0.135.69` / `10.0.152.165`, TCP 5432 times out from this box).
- **"Other crons are unguarded"** — grep-based (`ON CONFLICT`, `claimTier`, advisory, `FOR UPDATE`,
  `SKIP LOCKED`). The probe *does* find guards where they exist, but **absence is not proof**. A real
  read is owed before anyone acts on the list.
- **Victim list for the 08-20 broadcast outage** (6 orders / 2 requesters) came from **HQ Dashboard**,
  not verified here.

### RECOMMENDED but NOT applied

- **Muting EB notifications (was "step 4") — recommended AGAINST**, deliberately. ~24/day of deploy
  chatter remains; a Gmail filter handles it at zero production risk. Ordering hazard is gone now
  that the fraud alarms are independent, so it is safe whenever wanted.
- **Account password policy — none exists** (`GetAccountPasswordPolicy` → `NoSuchEntity`). Offered
  (14 chars, complexity, reuse prevention, no forced expiry); never authorised.
- **OK-actions on the 17 alarms** — **none has one**, so an alarm going quiet never emails an
  all-clear. Offered as a one-pass change; not done.
- **Leader election** (`pg_try_advisory_lock` around `getTasks`, `crons.js:1448`) — with the owner as
  a payments-architecture decision. No migration needed.
- **Stripe idempotency** (treat `payment_intent_unexpected_state` as success, match the **code** not
  the message) — **John's Tickets is building it.**

### APPLIED but unconfirmed in console
**None.** Everything applied in this session was verified afterwards.

---

## Deployed?

Nothing in this session touched application code, a repo, or a deploy. AWS changes were made
directly via API and each was re-read afterwards. Backend fixes referenced here
(`db4a54f4`, `233cc58f`, `!372`) were shipped by **other** sessions.

---

## Uncommitted / disk-only files

⚠️ **`Documentation/AWS/` is NOT under git.** Everything below is disk-only and will not appear in
any `git status`:

```
Documentation/AWS/aws-alert-volume-findings-2026-08-06.md   <- the main artifact (457 lines)
Documentation/AWS/refresh-token-comparison.sh               <- tested end-to-end
Documentation/AWS/repoint-fraud-alarms.sh                   <- dry-run default, --apply to write
Documentation/AWS/force-mfa-policy.json                     <- unused; for future contractors
```

`Code/` repo dirty files (`launch.json`, `.gitignore`, `settings.local*` backups) are **not mine**.
`gopher-backend-api` is **clean** — this session only ever read it.

Scheduled task `refresh-token-post-deploy-comparison` (fired 08-09) — `~/.claude/scheduled-tasks/`.

---

## What I would do next, in order

1. **Close the Stripe question** — the only genuine unknown. See below.
2. **Leader election.** One change at `crons.js:1448` fixes all 20 crons; per-cron idempotency fixes one.
3. **Add OK-actions** to the 17 alarms so recovery is visible.
4. **Set the account password policy.**
5. **Fix two wrong alarm descriptions** (see traps) — they will mislead the next responder.

---

## Traps the next session will hit

1. ⛔ **`Gopher-Prod-PaymentIntentCancelFailed`'s description is WRONG.** It says a customer
   authorisation "is still held on their card." In every observed case the cancel **succeeded** on
   the winning instance. **Check for `SUCCESS: cancellation of expired order` in the same second on
   a different log stream before treating it as a money incident.**
2. ⛔ **That alarm UNDERCOUNTS the race.** It only emits when a *loser* errors. On 08-24 12:04 both
   instances won (order 64730) — no datapoint at all. Metric is a **lower bound**.
3. ⛔ **`Gopher-Prod-MessageFlagEmailFailed` points at the wrong file.** Says `crons.js ~line 320`;
   the real defect was `helpers/fraud_alert.js` via `message_guard.js:106`.
4. **AWS credentials expire in ~20 minutes.** Re-auth: `BROWSER="open -a 'Google Chrome' %s" aws login`.
   If it opens Safari, grab the printed URL and `open -a "Google Chrome" "<url>"` — and **do not
   re-run `aws login`** while a flow is still listening (`lsof -nP -iTCP:<port> -sTCP:LISTEN`).
5. **Judge liveness by state, never by title.** A session titled *"(retired 8/9)"* was the owner's
   pinned, actively-running one. Use `isRunning` / `lastActivityAt`.
6. **Trust `describe-environment-health`, not `describe-environments`.** The latter lags mid-deploy
   and reported `Red` on a healthy environment.
7. **Count instances from LOG STREAMS, not EB events.** EB events only name instances they mention
   → I got 11; the true figure was **34** in 24h.
8. **Exclude `OPTIONS` from any `refresh_token` rate.** CORS preflights (`OPTIONS → 204`) inflated
   the failure rate 2× — the real baseline is **4,341 POSTs / 7.09%**, not 7,898 / 3.90%.
9. **Log group retention is 7 days.** Capture any before-picture to a FILE at capture time.
10. **`FARUD_INTERVAL`** is spelled that way in production config and in code. Grepping `FRAUD_` finds nothing.
11. **Production RDS is VPC-only.** SSM Session Manager IS available on `i-074b13eb5e8f1a025`
    (`AmazonSSMManagedInstanceCore` on role `gopher-stage-prod`) — that is the legitimate path in.
    Do **not** make RDS public.
12. **Grep for order ids carefully** — `64771` matches inside GPS coordinates like `35.588764771822916`.

---

## Open questions for John

**One, and it is a pause-and-wait access item — do not work around it.**

**Stripe read access, to confirm no payment was ever double-captured.** Current evidence is our own
application logs over 7 days; Stripe is the authority. Either:
- he checks `pi_3U7epDCQp3eawbpn1uPSZHIl` (order 64739) and `pi_3U7xj0CQp3eawbpn0JarZWXp`
  (order 64771) in the dashboard — status + timeline, expecting one cancellation each, no capture;
  plus **Payments → Transfers, last 7 days**, looking for any order number appearing twice
  (transfers carry `transfer_group: order_<id>` and `metadata.order_id`, so they ARE searchable); or
- a **restricted read-only** Stripe key so a session can check all history rather than 7 days.

**RESOLVED — he answered.** ~~treat "no double capture" as well-supported but
unconfirmed~~, and do not let it become an assumption. It was walked through with him on 2026-08-24
and was outstanding at retirement.

Secondary, non-blocking: approval for an **SSM port-forward to the Aurora reader endpoint** (no
inbound ports, physically read-only, CloudTrail-logged) plus explicit OK to read `DB_PASSWORD` from
Beanstalk config — would let a session answer "which orders" itself instead of handing it off.

---

## MEMORY.md lines owed

⛔ Not appended — `MEMORY.md` is over its limit and twelve sessions are retiring concurrently.
Memory files are written; these index lines are owed:

```
- [⛔ Crons DOUBLE-RUN on every deploy](cron-double-run-on-every-deploy.md) — START_CRONS env-level + Additional Batch = 2 instances; PaymentIntentCancelFailed alarm text is WRONG, no money held
- [Fraud alarms own SNS topic](fraud-alarms-own-sns-topic.md) — moved off EB topic 8/7; EB muting recommended AGAINST
- [AWS account access posture](aws-account-access-posture.md) — Rob Hazle = trusted advisor, Matt O'Donnell = the dev; root HAS MFA; don't re-raise
- [refresh_token 500 mislabel](refresh-token-500-misclassified.md) — auth outcome sent as 500; count POST only, OPTIONS inflate the rate 2x
- [Cross-session messaging works](cross-session-messaging.md) — ccd_session_mgmt__send_message, NOT SendMessage; judge liveness by isRunning, never by a "(retired)" title
```

_(The first four already have lines in `MEMORY.md`; the fifth was an edit to an existing file.
Re-verify against the index after `/consolidate-memory` runs.)_

---

## ✅ RESOLVED — memory-file number, and a correction to MY OWN reasoning

**Nothing to do here. Do not re-open it.** Previously this section told a successor to "correct
that line to 34, citing the log-stream method." **Both halves were wrong.**

`memory/cron-double-run-on-every-deploy.md` now reads **35** and is correct, fixed by the
session-coordination lane on 2026-08-24.

**My causal explanation was the real error.** I wrote that `describe-events` "only names instances
they explicitly mention, so it structurally undercounts." **That is false**, and it would have
taught future sessions to distrust a perfectly good API. Both methods agree once paginated —
reproduced here:

```
describe-events --start-time <24h>  --max-items 100   -> 12
describe-events --start-time <24h>  --max-items 200   -> 29
describe-events --start-time <24h>  --max-items 1000  -> 35   <- agrees with log streams
describe-log-streams, 24h window                      -> 34-35 (sliding window)
```

My original `11` came from `--max-items 100` on a day's worth of events. **A page cap, not an API
limitation.**

⚠️ **The trap worth keeping, found while verifying this:** `--no-paginate` does **NOT** mean
"return everything." It returns **one page** — 100 events, 12 ids. The flag that reads like
"give me all of it" is the one that silently truncates. Use `--max-items 1000`.

**The actual lesson: either API is fine. THE TIME WINDOW AND THE PAGE CAP MUST BOTH BE EXPLICIT.**
Neither method is preferred; an unscoped or capped call samples an arbitrary slice and looks like
an answer.

## Task carried forward (owner-directed 2026-08-24)

The **Stripe double-capture confirmation** transfers to the successor session — it is the single
open item and it is an access question, not a research one. Full navigation is in *Open questions
for John* above. Status: **✅ CONFIRMED CLEAN — owner, 2026-08-24.** John checked Stripe itself and closed it: "Clean and closed." Stripe is the authority and it has now spoken, so this is no longer inherited or log-derived. **Do not re-raise.**
