# Live App Bugs — session handoff, 2026-08-24 (index, not diary)

**Transcript (never deleted, full-text searchable):**
`~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/21a587ac-967b-48ee-81a6-9263b0d6d54f.jsonl`

Session ran 2026-08-20 → 08-24. Everything below is **verified first-hand unless marked
INHERITED**.

## Grep anchors
`amount_received` · `PAYMENT INTENT CANCEL FAILED` · `MESSAGE FLAG EMAIL FAILED` ·
`buildAlertEmailData` · `completion_waiting` · `g40331RateNowPulse` · `photo_requirement` ·
`stripe-webhook-secret-2` · `rearm_exhausted_auth` · `pm_3U7xj0` · `order 64627` ·
`i-0ce2ffe17d2cf3b70`

---

## State of play — every item this session touched

| Item | Repro | Root cause | Fix | Live? |
|---|---|---|---|---|
| **G40-18** Stripe 7-day auth invariant | n/a (spec) | — | `gopher-backend-api!333` | ✅ live `e25f5d7e` |
| **G40-18 webhook chain** (2nd signing secret via SSM) | — | Stripe scopes a destination to platform OR connected events, never both | `!335` | ✅ live `2c460ed3`; destination `we_1U6TWpC…` + SSM param created by owner; **proven with real event** `evt_3U6UOz…` 200/Recovered |
| **⚠️ `amount_captured` incident** (order #64627) | ✅ owner-filmed | ✅ line level — that field exists only on **Charge** objects; a PaymentIntent reports **`amount_received`** | `!337` | ✅ live `ad2b3b9c`; order self-healed (transfer `tr_1U6WNW…` → instant payout → paid) |
| **G40-402** payment_action_needed deep-link | — | AC6 notified the requester but **nothing un-exhausted the order** when they fixed their card | backend `!342` + client `!233` | backend ✅ live `e3b096a1`; client **store-gated** |
| **G40-363** `pm_` token as order id | ✅ reproducible dead-end (not the "stale retry" the ticket guessed) | ✅ payment picker wrote the card's Stripe id into `values.id`, the order-id slot | requester `!232` + worker `!242` | **store-gated** |
| **G40-39** completion photos (scenarios 1–3) | — | photo_requirement was served by nothing (exported, zero callers) | backend `!346`, worker `!243`, requester `!234` | backend ✅ live `39fc5767`; clients **store-gated** |
| **G40-39 sc. 4–7 + G40-331** rating gate | — | confirm-time `rateYourRequestor` emit existed but was **A/R-only** | backend `!347` + worker `!245` | backend ✅ live `0112957e`; client **store-gated** |
| **G40-35 flag email** | ✅ 100% failure, 7d retention | ✅ `buildAlertEmailData` read party ids off its **ARGUMENT**, not the row it fetched | `!372` | ✅ live — deployed commit `9db9e0d1` **carries** `201dc69d`; verified by content, label does not name mine |
| **`PaymentIntentCancelFailed`** alarm | ✅ 3 occurrences | ✅ two instances, two PIDs (see below) | **NOT MINE** — idempotency half is John's Tickets' G40-403 lane | ❌ open |

**Jira:** G40-18 Done · G40-402 Done · G40-363 Done · G40-331 Done · G40-39 **Code Review**
(every half merged; only the store release remains — the 710 sprint move is the routing
owner's call, per that ticket's own warning) · G40-35 unchanged (phase 2 needs a mobile release).

**Open MRs: none of mine.** All merged, squash-off, source branches kept, each content-verified
against `origin/production` after merge.

---

## Disk state

- **Nothing of mine is uncommitted.** No stashes of mine; my worktrees are all removed.
- ⚠️ **`Code` repo: `e2b39a2` (my G40-35 doc row) is committed but UNPUSHED** on
  `feature/deals-google-maps-audience`, alongside **8 commits belonging to other sessions**
  (Deals status, BIPA/ID work). I did not push: `git push` is denied to this session, and
  pushing would carry other sessions' work. **A successor reading only the remote will not see
  it** — read it from this clone.
- ⚠️ Present in the shared clone and **NOT mine**: `gopher-backend-api` sits on branch
  `fix/business-photo-v2-past-jobs-guard` with 1 unpushed commit and **4 stashes**;
  `gopher-mobile-gopher` has an untracked `.claude/`. Left alone.
- Pre-existing dirty files in `Code` (`.claude/launch.json`, `.gitignore`, settings backups)
  predate this session.

---

## The one thing still open, and it is an OWNER decision

**`Gopher-Prod-PaymentIntentCancelFailed` — benign symptom, real mechanism.**

- **Verified:** `RollingWithAdditionalBatch`, MinSize 1 / MaxSize 2, `START_CRONS=true` at the
  **environment** namespace → every instance runs every cron and deploys add one. A single
  event has lines on **two log streams with two PIDs** (EB names streams after instance ids).
  **34 distinct instance streams in 24h.**
- ⚠️ **The alarm undercounts:** it only emits when a *loser* errors. Order 64730 (08-24 08:04)
  has two SUCCESS lines on two streams and **no datapoint**. Metric counts are a lower bound.
  I told the owner "2 in 7 days" and had to correct it to "≥3, structurally undercounted."
- **Money check came back NEGATIVE** — 0 duplicate captures, 25 payouts all unique, ~20M
  records, two sessions using two different methods (mine: CloudWatch Insights). **Limits:
  7-day retention, and this is OUR logging, not Stripe's ledger.** Well-supported, NOT
  confirmed. Stripe read-only access is still owed to the AWS session.
- **In flight (not mine):** John's Tickets is building the idempotency half in `cronTasks.js`,
  keyed on Stripe's error code — treating "already canceled" as success. That fix stands on its
  own: Stripe auto-cancels uncaptured holds at 7 days, so a genuine already-cancelled arrival
  would burn all 3 attempts and leave `payment_status` stuck at AUTHORIZED forever while the
  hold is gone. Silent permanent divergence.
- **Owner decision:** leader election (`pg_try_advisory_lock`, no migration) spans `refund`,
  `confirm_auto_payout`, `re_authorize_token`, `process_scheduled_orders`. **Design it
  fail-LOUD** — a stale lock stopping money crons silently is worse than double-running
  loudly. My cheaper first step, offered and not yet decided: **Stripe idempotency keys** on
  capture/transfer/payout, which defend against duplicate calls from any cause.

---

## What I would do next, in order

1. **Nothing is time-critical.** Every fix is merged and every backend piece is live.
2. **The store release is the highest user-impact item and it is not ours** — ten client MRs
   wait on it: no-show (`!239`/`!228`/`!230`), G40-363 (`!232`/`!242`), G40-402 (`!233`),
   G40-39 (`!243`/`!234`), G40-331 (`!245`). Device-QA checklist:
   `docs/handoff/G40-39-completion-flow.md`.
3. **Collect two positive controls** (absence proves nothing — this is the session's recurring
   lesson): (a) a real `moderation: flag email sent` line after `!372` — the AWS session is
   watching; (b) the first accepted-order re-auth roll showing a `Re-authorization` order_log
   **and** a subsequent confirm on the same order (G40-18's first live proof).
4. **Answer the Stripe-ledger question** so the money-duplication negative can be confirmed
   rather than well-supported.

---

## Traps that cost me time (all first-hand)

1. **A test that mocks its own subject proves only the stub.** Twice now: G40-18's 41 anchored
   checks passed with the wrong field name baked in, and G40-35's 332-line suite passed through
   a 100% outage because it stubbed the broken function. Drive the REAL function with EVERY
   caller's argument shape.
2. **Point-in-time observations are not live state.** I checked instance count hours after an
   incident, saw one instance, and concluded "single process" — wrong, and the log stream name
   was one query field away in output I already had.
3. **Silent exit-1 in the backend test suite** = a vendor client constructed at *require* time
   without a key (SendGrid / Twilio / Stripe all do this down `helpers/fraud_alert.js`), and
   **winston's exception handler swallows the reason and exits**. The file prints nothing at
   all. Unmask with `process.on('uncaughtException')`.
4. **zsh heredocs eat backticked text** — every MR description written through an unquoted
   heredoc lost its `code spans` (hit twice). Write the body with the Write tool, then PUT it.
5. **A deploy label may not name your commit.** `!372` deployed as `9db9e0d1` (a later Deals
   merge carrying mine). Verify by **content** — `git merge-base --is-ancestor` plus reading the
   deployed tree — never by label.
6. **CloudWatch `filter-log-events` over 7 days times out**; Insights (`start-query`) does the
   same aggregation in seconds. And check your own `parse` — my first payout-duplicate query
   grouped by a string containing the payout id, so duplicates *could not* have collided.
7. **A string that predates the commit you are testing is not a rider probe** (the
   G40-308/`ca-overlay` mistake): hash the live page against both candidate states instead.

---

## MEMORY.md lines owed (NOT appended — file is over its limit and 12 sessions are retiring)

```
- [⛔ Mocking the subject proves nothing](mocking-the-subject-proves-nothing.md) — 2 prod defects past green suites; drive real code with every caller's shape
- [⛔ Prod crons double-run every deploy](prod-crons-double-run-on-every-deploy.md) — START_CRONS is env-level + rolling adds an instance; 34 streams/24h; the alarm undercounts
```
Both memory files are written; only the index lines are owed.
*(Note: `mocking-the-subject-proves-nothing`'s index line was appended earlier today, before
the no-append instruction — verify it is still present rather than assuming.)*
