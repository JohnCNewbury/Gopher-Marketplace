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

**⛔ OWNER RULING 2026-08-24 — TICKET IT → filed as `G40-411` (backlog, no sprint).** Recorded as known work, not built now. Do not
build it unasked, and do not re-raise it as an open decision — it is decided.

Grounds (established before the ruling — this is a scheduling decision, not a dismissal):
- The money-duplication check came back clean, and John then confirmed it **at Stripe itself** —
  "clean and closed." The harm was looked for at the authority and is not there.
- The one error the race actually produced is **fixed and live**: MR !375 treats Stripe's
  already-cancelled response as success (merge `91231bcb`, verified on `origin/production`).
- What remains is a *window*, not an observed defect.
- A stuck lock would stop the money crons **silently**, which is worse than double-running —
  a duplicate is visible, a job that quietly never runs is not.

**Why ticket rather than leave:** the urgency is gone but the window is real, and an unticketed
known-risk quietly disappears from the record. **Per `docs-are-truth-not-tickets`: this memory /
doc carries the canonical rule; the ticket carries only the repro, the acceptance criteria and
the assignee, and references the doc. The ticket is meant to die; this text is not.**

**Priority signals:** an actual duplicate capture or payout appearing, or a change to the deploy
policy / instance count. Either one promotes this from backlog to active.

## ~~OPEN DECISION~~ — leader election on the money crons · **CLOSED 2026-08-24, see the ruling above**

> ⛔ **This header used to read "OPEN DECISION FOR THE OWNER … the one item this session leaves
> undecided." It is no longer true and is corrected in place** (2026-08-24, successor session).
> The owner ruled the same day: ticketed as **`G40-411`**, backlog, no sprint. Everything below is
> kept because it is the *reasoning*, which outlives the decision — but do **not** read it as a
> live ask. Do not build it unasked; do not re-raise it.

**What it solves.** Every cron double-runs during every rolling deploy (~34 instance streams a
day). Today's symptom was benign — a duplicate authorisation cancel — but the same shape runs
on `confirm_auto_payout`, `re_authorize_token` and `process_scheduled_orders`.
`confirm_order_payout` does guard on `payment_status === PAID`, but that is a read-then-write
with no lock: the same window. **Stated as a risk to evaluate, NOT a proven defect** — the
money check below came back negative.

**The risk of doing it.** A lock in the money-cron path is itself a payments change. A stale
lock or a DB hiccup would stop money crons *silently*, which is strictly worse than
double-running loudly. **It must fail LOUD** — alarm on "tick skipped, lock held" — before it
goes anywhere near production.

**The reward.** Closes a whole class of duplicate-work bugs for all ~20 crons at once instead
of case by case.

**Recommended order (mine, not decided):**
1. Let the idempotency fix land (John's Tickets, `cronTasks.js`) — it stands on its own merits.
2. **Stripe idempotency keys** on capture/transfer/payout, keyed on order + operation. Cheaper
   and narrower than a cron-wide lock, and it defends against duplicate calls from *any* cause
   — race, retry, or an admin re-push.
3. Leader election (`pg_try_advisory_lock` around `getTasks` in `middleware/crons.js`, no
   migration) as the structural fix, designed fail-loud per above.

### Background for that decision

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
  7-day retention, and this is OUR logging, not Stripe's ledger.** ✅ **CLOSED 2026-08-24 — the
  owner checked Stripe itself: "clean and closed."** The authority has spoken, so this is no
  longer inherited or log-derived. **Do not re-raise it and do not re-derive it from our logs.**
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

## ✅ POSITIVE CONTROLS — collected 2026-08-24 (successor session)

This is item 3 of the list below, worked. **Everything here is first-hand**: CloudWatch Insights
over `/aws/elasticbeanstalk/Gopher-Production/var/log/web.stdout.log` (7-day retention) and
read-only SQL against production Aurora via the SSM tunnel. Nothing is inherited.

### Deploy timeline established first (everything else hangs off it)

Version labels carry the merge sha, so `git merge-base --is-ancestor` against the **deployed
label** settles what was running when — not the MR page, not the label's name.

| deployed (UTC) | version sha | carries `!372` (`201dc69d`) | carries `!333` (`e25f5d7e`) |
|---|---|---|---|
| 08-24 13:40 | `1140a9d3` | **NO** | YES |
| 08-24 14:49 | `9db9e0d1` | **YES** ← flag-email fix goes live | YES |
| 08-24 18:13 | `d69b89b2` | YES | YES |
| 08-24 18:43 | `91231bcb` | YES | YES ← current, Ready/Green |

### (a) G40-35 flag email — ❌ NOT YET COLLECTABLE, and now quantified

**No flag event has occurred since the fix went live.** ~7 hours of post-fix uptime at time of
writing (fix live 14:49 UTC, checked 21:48 UTC), zero flags. **Absence proves nothing** — but the
wait is now sized rather than guessed:

- **Exactly ONE message-flag event in the whole 7-day window**: order 64688, **08-24 13:56:04 UTC**.
  That is the base rate. Waiting for the positive control is a **~weekly** proposition, not an
  hourly one. Anyone "watching for it" should plan accordingly.
- ⚠️ **That one event FAILED** — `MESSAGE FLAG EMAIL FAILED for order=64688: WHERE parameter "id"
  has invalid "undefined" value`. **This is NOT a counter-example to the fix.** It ran at 13:56:04
  on `1140a9d3`, which does not carry `!372`; the fix deployed **53 minutes later**. Checked before
  concluding, because the alternative reading — "the fix is live and still failing" — would have
  been the most alarming finding of the session and it is not what happened.
- **It is, however, a PROBE CONTROL, which is what makes the eventual zero meaningful.** My query
  demonstrably sees these lines: it returned all three of the event's log lines (`moderation:
  flagged`, `MESSAGE FLAG EMAIL FAILED`, `moderation: flag notice emitted`). A later "no failures"
  result therefore means *no failures*, not *a query that cannot see*.
- It also **re-confirms the diagnosis from production one last time**, and independently confirms
  the handoff's claim that only the admin@ push was lost: the `flag notice emitted` line succeeded
  in the same millisecond the email failed.

### (b) G40-18 re-authorization — ⚠️ HALF collected, and the other half may never arrive naturally

**A live post-`!333` re-authorization exists.** Order **64561**, `order_logs` id 301868,
**08-24 19:14:01 UTC**: *"Payment re-authorized successfully (attempt 1). New auth expires:
Mon Aug 31 2026 19:14:01"*. Auth created 08-18 19:13:28 → rolled at **6 days + 33 seconds**, new
expiry exactly 7 days out. Ran on `91231bcb`, which carries `e25f5d7e`.

**But it does NOT close the control as specified, and the reason is structural.** 64561 was
`aasm_state = pending` — never accepted. `crons.js:879-880` sets `must_confirm` only for
`accepted` / `in_progress` / `scheduled`, so **the confirm branch was not taken**. Confirmed two
ways: no `New authorization confirmed` line anywhere in 7 days of logs, and the order's own log
timeline is just Created → 2× OOA broadcast → the roll. The order was a Need-a-Ride posted 08-18,
broadcast to 5 people, and never picked up.

⛔ **The specified control may be unobtainable from natural traffic — this is the finding, not an
excuse.** It requires an order that is **accepted and still un-completed six days later**. Current
production state:

- **Zero** `accepted`/`in_progress` orders hold an `authorized` payment. Not "none found" — the
  probe was proven: the same query returns the full state×payment_status grid for the last 30 days
  (476 cancelled/refunded, 408 expired/cancelled, 229 delivered/paid, 6 pending/authorized,
  3 scheduled/authorized, 1 picked_up/authorized).
- Rolls themselves are not rare — **53 successful rolls across 42 orders since 2026-01-19**, ~7–8 a
  month. It is the *accepted-state* subset that does not occur.
- ⚠️ The three orders that will roll next are all `scheduled` (64672 ~08-27 15:19 UTC, 64688 ~08-28
  01:52 UTC, 64772 ~08-30 14:43 UTC). **`scheduled` proves nothing here** — it is the one state
  that confirmed correctly *before* `!333` too. Do not accept a scheduled roll as the proof.

**Recommendation:** stop waiting for this one. The accepted-order confirm path should be proven on
**stage** with a deliberately-aged accepted order, not by watching production. Flagging rather than
building it — that is a payments-path exercise and needs the owner's word.

### 🎁 A different live control DID land — and it is a clean before/after across the deploy boundary

`!333` fixed four defects; one of them — *"successful rolls burned the 3-retry budget"* — is
**visible in production data as a before/after contrast**, which is stronger than any single
observation:

| | orders | `payment_auth_retry_count` after a SUCCESSFUL roll |
|---|---|---|
| **pre-`!333`** | 13 | **1** (and `2` for order 63593, which rolled twice) |
| **post-`!333`** | 1 (order 64561) | **0** |

**The obvious confound was checked and ruled out:** a `retries=1` could have come from a *failed*
attempt rather than the successful roll incrementing it. It did not — **zero** `Re-authorization
failed%` log rows exist on any of those 14 orders. The counter was being burned by success, exactly
as `!333` said, and it no longer is.

⚠️ **n=1 on the post-fix side.** Say it that way. The pre-fix side is n=13 with no counter-examples,
so the mechanism is well-established, but one post-fix observation is one observation.

### Clean negatives (7-day window, probe proven above)

**Zero** occurrences of `PAYOUT BLOCKED`, `AUTH CANCELED ON LIVE ORDER`, or `could not release
stray hold` — the three markers `!333` flagged as its harm signals.

### Trap this cost me

⚠️ **`RUNBOOK-production-db-readonly.md` names a dead jump host.** `i-070ac0a1c168013fc` returns
`TargetNotConnected` — **EB replaces its instances on every deploy**, so any hard-coded instance id
in that runbook is stale the moment the next deploy lands. Find the current one with
`aws ssm describe-instance-information`, then **confirm which environment it belongs to** before
tunnelling — one of the two Online instances is `Gopher-Stage`, and it would have answered happily.
The runbook has been left alone (not my file); this is the correction.

---

## What I would do next, in order

1. **Nothing is time-critical.** Every fix is merged and every backend piece is live.
2. **The store release is the highest user-impact item and it is not ours** — ten client MRs
   wait on it: no-show (`!239`/`!228`/`!230`), G40-363 (`!232`/`!242`), G40-402 (`!233`),
   G40-39 (`!243`/`!234`), G40-331 (`!245`). Device-QA checklist:
   `docs/handoff/G40-39-completion-flow.md`.
3. ~~Collect two positive controls~~ — **WORKED 2026-08-24, see the section above.** Outcome in
   one line each: **(a)** still uncollected, but now *sized* — one flag event per ~7 days, so the
   watch is weekly not hourly, and the probe is proven so a future zero will mean something;
   **(b)** half collected — a live post-`!333` roll exists (order 64561), but on a `pending`
   order, so the accepted-order confirm branch is still unproven and **probably cannot be proven
   from natural traffic**. A *different* control landed instead: a clean pre/post contrast showing
   successful rolls no longer burn the retry budget.
4. ~~Pick up the Stripe-ledger result~~ — **CLOSED (owner, 08-24): checked at Stripe itself,
   "clean and closed."** Do not re-raise it and do not re-derive it from our logs.
5. **The one live thing left, and it needs the owner's word:** prove G40-18's accepted-order
   confirm on **stage** with a deliberately-aged accepted order. Flagged, not built — it is a
   payments-path exercise. Everything else in this lane is either merged-and-live or store-gated.

---

## Traps that cost me time (all first-hand)

> *(Successor, 2026-08-24: two more are recorded above rather than here, to keep authorship
> clear — a **dead jump-host id in the DB runbook**, and a **memory file filed under a
> different name than the handoff gave it**. Both are instances of trap 2 below.)*

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

## ~~MEMORY.md lines owed~~ — **NOTHING IS OWED. Verified 2026-08-24, not assumed.**

The retiring session recorded two index lines as outstanding. **Both are already present**, so
appending them would have duplicated entries in a file that is already over its limit (207 lines
vs a 200 limit):

- `mocking-the-subject-proves-nothing` — present, **MEMORY.md:63**. (The handoff asked for this one
  to be verified rather than assumed. Verified.)
- The cron double-run memory — present, **MEMORY.md:185**, but filed as
  **`cron-double-run-on-every-deploy.md`**, *not* the `prod-crons-double-run-on-every-deploy.md`
  the handoff named. Searching for the handoff's filename returns nothing and reads as "missing".
  ⚠️ **A file that is not at the name you were given is not an absent file** — same family as the
  probe traps above. Check by content before writing a second copy.

Both memory files are also **already current** on the two items that went stale after the handoff
was written: the cron memory carries the `G40-411` ruling and the "clean and closed" Stripe
confirmation. No edit needed.
