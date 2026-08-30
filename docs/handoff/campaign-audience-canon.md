# Campaign audience — who a mass send actually reaches

**Status:** Canonical. Shipped to `production` 2026-08-29 (MR !428, merge commit `2ce4d667`),
verified live against production data the same day.
**Owner directive it enforces:** never market to a deactivated or deleted user.
**Code:** `helpers/campaign_audience.js` in `gopher-backend-api` — the single home for this rule.

## The rule

Two consumers build a campaign audience, and **both must call the shared helper**:

| surface | file | channel |
|---|---|---|
| push / SMS | `controllers/admin.controller.js` → `get_filtered_users` | `send_new_app_alert` |
| inbox | `controllers/admin/inbox_message.js` → `get_filtered_user` | `send_inbox_mail` |

### 1. Account-state suppression — `audience_state_sql(excludeOnboarding)`

- **`deactivated` is always suppressed.** Non-negotiable; it is the owner directive above.
- **Both deletion tests are applied together** (`first_name <> 'Deleted'` AND `deleted = false`).
  They are not equivalent — they disagreed on 2 live rows — so the conservative intersection is used.
- **`COALESCE(u.aasm_state, '')`** is required: 799 audience rows have a NULL state and are
  legitimate recipients. A bare `NOT IN` would silently drop every one of them.
- **`incomplete` and `email_verified` are NOT suppressed by default.** They are real people
  mid-signup, and a "finish setting up your account" campaign targets exactly them. Pass
  `exclude_onboarding: true` in the filter to drop them for a given campaign.

### 2. De-duplication is CHANNEL-AWARE — `dedupe_for_channel(rows, channel)`

The audience query is `SELECT DISTINCT ur.id ... JOIN users_roles ur`, so it returns **one row per
ROLE, not per person**. De-duplication is therefore by **destination**:

| channel | collapses by | why |
|---|---|---|
| `sms` | phone digits | also catches the **731 numbers shared by more than one account** |
| `email` | lowercased address | |
| `push` | `fcm_token` | **NOT per person** — see the trap below |
| `inbox` | user id | |

> ⚠️ **THE TRAP: never collapse push per-person.** Push is addressed by device token, and one
> person running both apps legitimately holds two. Collapsing push per-person would silently
> **under-send** — a worse failure than the duplicate it set out to fix, and an invisible one.
> `test/campaign-audience-dedup.test.js` §2a exists solely to stop that regression, and has been
> mutation-tested to prove it fails when the rule is broken.

Inbox **rows** stay per (user, role) — the Gopher and Requester apps have separate inboxes and a
person with both should find the message in each. But the **push announcing an inbox message**
collapses by token, so one device gets one buzz.

Rows with **no destination are kept**, not dropped — the send path counts them
(`skipped_no_phone`). Swallowing them inside de-duplication would hide a reach problem.

## What it was before (measured on production, 2026-08-29)

Neither query filtered on `aasm_state` at all, and the two used *different* deletion tests. Result:
**693 deactivated accounts were in the audience of every push, SMS and inbox campaign.**

A full-audience send, before → after:

| channel | was | now | saved |
|---|---|---|---|
| SMS | 136,950 | 125,378 | **11,572** |
| Email | 136,952 | 126,123 | **10,829** |
| Inbox | 136,952 | 126,148 | **10,804** |
| Push | 61,802 | 60,811 | **991** |

At Twilio's rate a full SMS campaign was paying roughly **$90 to text ~11,000 people twice**.

## Why the defect existed — the pattern to watch for

**The audience rule was written out longhand in two files, and the two drifted apart.** This is the
same failure shape as `pickBusinessPicUrl` and as `classifyOrder` vs `SERVICE_PREDICATE`: *a rule
expressed in two languages will disagree, and the disagreement is silent.* When you touch this
rule, change `helpers/campaign_audience.js` — if you find yourself editing SQL in a controller,
that is the regression.

## Filters — the send must honour what the operator chose

**Shipped 2026-08-29, MR !430.** `helpers/campaign_filters.js` is the single normaliser; both
audience queries read their filters through it.

Before it, HQ Campaigns showed a filtered count and then sent to a different, far larger set of
people. A push targeting **Raleigh · Elite gophers · confirmed email** reached **136,265 role rows —
every user on the platform**. It now reaches **36**. Three independent causes:

1. **`get_filtered_users` (push/SMS) discarded most of its filters** — it destructured only
   `{ role, device, age, interests, sourcing, custom }`, so city, state, ZIP, tier, email-confirmed,
   Stripe and TrustShield were accepted from the caller and thrown away.
2. **Key-name drift.** HQ sends `gopher_type` · `trustshield` · `stripe_verified`; the inbox query
   reads `gopherType` · `trustshieldVerified` · `stripeVerified`.
3. **Shape/case drift, which 500'd the send.** The server switches on the exact string `'Yes'`
   inside `.forEach`, HQ sends the lowercase **scalar** `'yes'`. A string has no `.forEach`.

> **The rule: a filter must be applied or visibly rejected.** Accepted-and-quietly-discarded is what
> makes an operator trust a number that is not real, and spend money on it.

The normaliser is **tolerant on input, canonical on output** — either spelling, scalar or array, any
case — and returns `legacy`, shaped exactly as the older inbox switches expect, so the legacy admin
panel keeps working unchanged. Tier is mapped by name and by id across both spellings of the gated
rename: `Standard`→0, `Pro`/`Elite`→1, `Pro+`/`Elite+`→2.

⚠️ **HQ-only filters are still not sent at all.** The search box, status, missing-fields,
thresholds, deactivation dates and join dates are applied by `matchAudience()` against the
Dashboard's client-side `USR` dataset and are never translated into the payload. `signUpDate` and
`usage` exist server-side (inbox only) but HQ never sends them. Until that is closed, those filters
narrow the PREVIEW only — treat a count produced with them as advisory.

## The ledger — every send is recorded (2026-08-30)

Owner: *"Every message we send should be logged and provide as much details as we have avaiable."*

**Two tables, because the two halves have different truths available.**

| Channel | Where the record lives | Open rate? |
|---|---|---|
| In-app | `inboxes` + one `inbox_users` row per recipient | **Yes** — `inbox_users.viewed` is a real read receipt |
| Push · SMS | **`campaign_sends`**, one row per **send** | **No** — and it must not pretend otherwise |

- **Read it at** `GET /admin/inbox_message/get_inbox_message` (in-app, MR !446) and
  `GET /admin/campaign_sends` (push/SMS, MR !447). HQ's *Sent messages* card merges them into one
  chronological table with a channel chip.
- ⛔ **Push and SMS have no open rate and never will from these sources.** FCM reports
  accepted-by-Google; Twilio reports accepted-for-delivery. Neither is "someone read it". The column
  is left **empty** on those rows — a `0` there would read as "nobody opened it", which is a
  measurement nobody took.
- ⛔ **`campaign_sends.audience` stores the FILTERS, never the recipient ids.** 137,000 ids per
  campaign is not a ledger, it is a second copy of the users table. A pasted custom-id list is
  reduced to a **count**.
- ⛔ **The writer cannot throw.** `helpers/campaign_log.js` runs *after* the messages have left, so
  every path is caught and logged (`CAMPAIGN_LOG_FAILED`). A throw would turn a completed campaign
  into a 500, and an operator seeing a 500 re-sends — the duplicate-send defect this document exists
  to prevent, reintroduced by the audit trail meant to watch for it.
- **Push now counts what it reached.** FCM returns `successCount`/`failureCount` on every multicast
  and `sendPushNotif` was logging them and throwing them away, so a campaign whose every token was
  rejected read as *"Sent Successfully"*. It reports `Sent to 812 of 900 devices`. **Devices, not
  people** — one person running both apps is deliberately two (see *The rule*, above).
- ⚠️ **Nothing before 2026-08-30 exists in the push/SMS half.** Those sends were never written down
  anywhere; the four campaigns of 2026-08-30 (105,025 recipients) survive only as log lines. HQ says
  so on screen.
- ⛔ **`sent_by` is a `users_roles` id, not a `users` id.** Join through `users_roles`; joining
  `users` directly returns a real, plausible, **wrong** person. See the memory
  `admin-userid-is-a-users-roles-id`.

## Still missing (not shipped)

- **Bulk email has no unsubscribe and no suppression list.** Unsubscribe is a legal requirement for
  bulk marketing email, so a mass *marketing* email cannot go out until it exists. Inbox and push
  announcements are unaffected.
- **SMS STOP is not tracked.** `sms_state` is NULL for all 152,009 rows. Twilio rejects opted-out
  numbers at its edge with error **21610**, which the send path logs as `SMS_BLOCKED_OPTOUT` — that
  log is currently the only way to harvest them. Roughly **16% of gophers** messaged on 2026-08-11
  were already opted out, versus 1.4% of requesters.
- **`CAMPAIGN_LOG_FAILED` has no alarm.** It is registered in `docs/alert-markers.json` under
  `acknowledgedUnalarmed` as an **alarm candidate**: creating the CloudWatch filter + alarm on
  `Gopher-Prod-Alerts` is a production change and is the owner's to approve. Silence means one
  campaign is missing from the ledger; the send itself still happened.
