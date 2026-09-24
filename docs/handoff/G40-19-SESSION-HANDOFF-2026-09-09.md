# G40-19 payout truth — session handoff 2026-09-09

**Transcript:** `edbc600f-e14f-45c5-b816-78a0bc395007.jsonl`
(`~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/`)

**Grep anchors:** `stripe_payout_webhook.js` · `PAYOUT_NOT_ARRIVED_NOTE` ·
`unusable_default_card_attention` · `confirm_payout_deposits` · `gopher.payout_failed` ·
`describe_orphan_payout` · `we_1Q43GzCQp3eawbpnMqmqsfsc` · `!528` `!532` `!537` `!282` ·
`dcfbf1b77` `a4a6a0b4d` `0b13550ad` `138bab55a` · order `65308`

**Spec / full detail:** `docs/handoff/G40-19-payout-failure.md` — read that first, it opens with a
SHIPPED box. This file is the index.

---

## State of play

**DONE and verified in production (first-hand, this session):**
- **AC1 in-app popup** — fired for four real workers (`17917`, `75517`, `56604`, `74469`) whose
  calls previously returned `action: null`. No store release was needed; shipped builds already
  render that modal and route on `action === 'add_payout_card'`.
- **AC4 / AC5** — proven on real order **65308**. The sweep's query selects only orders with a
  `Payout Initiated` row and no `Payout Completed` row, so its firing IS the proof.
- **Stripe config** — `payout.paid` + `payout.failed` added to the signed destination
  `we_1U48wR…`; the unsigned `we_1Q43Gz…` → `/endpoint/payout_error` is now `status: disabled`
  (read back from the API, not the screen).

**DONE but UNVERIFIED (no real event has exercised it):**
- The whole payout-FAILURE path: worker-visible `PAYOUT FAILED (…)` row, the `gopher.payout_failed`
  push, the card last-4 in the email, and `!532`'s late-failure `PAYOUT DID NOT ARRIVE (…)`.
  44 automated checks, no real declining card.
- `!537`'s orphan line — deployed AFTER the nightly automatic-payout batch, so it had not yet
  produced output. **First real output expected in the next evening batch.**

**NOT STARTED / not mine:** the store release carrying the push tap.

## Deployed?

Backend: **live on production**, all four merges deployed via CodePipeline. Verified by EB
`VersionLabel` ending in each merge SHA + a serving instance `Ok` + 200 on `/api/v1/apiversion` —
**by content and version label, never by `git merge-base`.**

| MR | Merge SHA | State |
|---|---|---|
| `gopher-backend-api!528` | `dcfbf1b77` | live |
| `gopher-backend-api!532` | `a4a6a0b4d` | live |
| `gopher-backend-api!537` | `0b13550ad` | live |
| `gopher-mobile-gopher-capacitorjs!282` | `138bab55a` | merged to `production`, **reaches no user until a build is cut** |

## Uncommitted / disk-only files

**None from this session.** Everything is committed and pushed. The uncommitted files present in
`Code`, `gopher-backend-api` (branch `G40-410-identity-submission`) and `gopher-mobile-gopher`
belong to other lanes — checked explicitly, none are payout/G40-19 files. No gitignored or
disk-only files were touched. All four worktrees removed; the four source branches are preserved
on origin per the delete-source-branch NO rule.

## What I would do next, in order

1. **Read the next evening's `!537` orphan lines.** They will name `user_id`s for the automatic
   payouts that fail. That is the first real output of this work.
2. **Cut the mobile build** when convenient — the push tap is the only piece not reaching users.
3. Nothing else. This ticket does not need more code.

## Traps the next session will hit

1. ⛔ **`aws logs filter-log-events --query 'length(events)'` prints a count PER PAGE.** Piping to
   `head -1` reads page one, often `0`, and looks like "no events". Sum it:
   `| awk '{s+=$1} END {print s+0}'`. This produced a wrong "zero in 24h" and, before that, a
   ~5x-inflated failure rate.
2. ⛔ **A `deposit verified` log line does NOT prove the webhook works.** The webhook AND the
   reconciliation sweep both write it — read the source tag, `(stripe_account endpoint)` vs
   `(deposit sweep)`. Order 65308 was resolved by the SWEEP.
3. ⛔ **`payout.paid` is not a settlement.** Stripe: *"expected to be available… if the payout
   fails, a payout.failed notification is also sent, at a later time."* That is the whole reason
   `!532` exists.
4. ⛔ **GitLab reports `has_conflicts: false` while its check is still running** (`detailed_merge_status:
   checking`). It said that for `!528`, which then had a real conflict in `lib/payment.stripe.js`.
   Merge production into the branch locally and re-run the suite before trusting it.
5. ⛔ **Stripe's Disable control is the `•••` beside "Edit destination"** — not on the destination
   overview, not inside Edit. **Delete sits directly beneath it, in red.**
6. ⚠️ **`order_logs.created_on` does not exist** — ~60 call sites pass it and Sequelize drops it
   silently. The real column is `created_at`. See memory `order-logs-has-no-created-on-column`.
7. ⚠️ **A test stub must take `Op` from the real `sequelize`.** Guessing
   `Symbol.for('sequelize.operators.in')` (the real key is `Symbol.for('in')`) makes a guard read an
   empty list and the test pass while proving nothing.
8. ⚠️ **`/v1/accounts` pages take ~13s each**; a full 12k sweep is ~27 min. Bound it and log per
   page, or a rate-limit looks identical to slow progress.

## Open questions for John

**None outstanding.** Two decisions were put to him and answered; both are recorded in
`G40-19-payout-failure.md`:

- **Notify workers on orphan automatic-payout failures → CLOSED, do not build.** Owner 2026-09-09:
  no known unsettled payout cases, and payout is the one channel workers do not wait on — they
  report immediately. See memory `payout-failures-are-self-reporting`.
- **Disable the unsigned endpoint → DONE**, by John in the dashboard.

Two items remain that are his to act on, not questions: **cut the mobile build**, and **the wording
`PAYOUT DID NOT ARRIVE (Please add a new debit card)`** — live, worker-facing, one string in one
place. **Recommended default if nobody rules on it: leave it as-is.** Do not collapse it back into
`PAYOUT FAILED`, which reintroduces the contradiction it exists to remove.
