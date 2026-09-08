# Jira / backend + mobile tickets — session handoff 2026-08-24

**Transcript:** `c6692ac6-c4ff-400c-b200-b8ea1cc988c3.jsonl`
(`~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/`, 37.5 MB)

**Grep anchors** — distinctive to this session, use these to read back full reasoning + tool output:

| anchor | finds |
|---|---|
| `needs: []` / `2766857585` / `2767584587` | the CI skip-cascade defect, its A/B proof |
| `whenInUse` / `AUTHORIZATION_STATUS_WHEN_IN_USE` | G40-58 permission gate |
| `LocationBanner` / `locationTrackingState` | G40-58 AC4 banner |
| `PINNED_BROKEN` / `verify-g40-266-submit-routing` | the moving-ref control trap + fix |
| `6.11.6 running Node.js 24` / `Gopher-Stage` | G40-366 platform migration + rehearsal |
| `DB Configuration: 73 queries succeeded` | Stage boot proof on Node 24 |
| `allow_merge_on_skipped_pipeline` | the merge-gate hole (closed) |
| `sprint-routing-rule-677-vs-710` | owner's 8/18 routing rule |

---

## State of play

### DONE and verified live (by content, not SHA)

| ticket | what | evidence |
|---|---|---|
| **G40-383** | Backend CI: a lint failure skipped unit-tests + all 4 security guards | `!322` → prod `372cddc3`; first post-merge pipeline `2770353889` showed guards finishing **while lint still ran** |
| **G40-400** | Same defect in BOTH mobile repos + `node:24` pin + wired a guard that had never run | `!238` GO / `!227` REQ, both merged; `needs: []` and the pinned control confirmed on production |
| **G40-58** | While-Using grant now tracks (was transmitting nothing); AC4 "Location Not Available" banner | `!236` merged; `whenInUse`, `LocationBanner.js`, `locationTrackingState` all confirmed on `origin/production` |
| **G40-376 / G40-377** | Offline banner (socket auth as object) / iOS composer behind keyboard | merged earlier; both in sprint 710 |
| **G40-373** | Available-tab pin after Completed | merged; moved to 710 |

**Merge-gate state, all three repos:** red pipeline blocks the merge · no job can be skipped by another's failure · `allow_merge_on_skipped_pipeline` now **False** (owner clicked 8/19).

### IN FLIGHT — the one live thing

**G40-366 — retired Node 18 EB platform.** Status **In Progress**, sprint 677.

- **Stage rehearsal DONE and clean (8/20).** `Gopher-Stage` moved `6.6.3/Node 18` → **`6.11.6/Node 24`**, settled Ready/Green in ~4.5 min. Boot log `DB Configuration: 73 queries succeeded, 0 skipped`, zero ERRORs. Live HTTP probe of an authed route returned **440 + the app's own auth-refusal JSON** = nginx → Express → jsonwebtoken working on Node 24 on real hardware.
- **PRODUCTION IS HELD** pending John's explicit go. ← *the open item; see bottom*
- Command (John runs it — this session's harness denies mutating AWS calls, correctly):
  ```
  aws elasticbeanstalk update-environment --environment-name Gopher-Production \
    --solution-stack-name "64bit Amazon Linux 2023 v6.11.6 running Node.js 24"
  ```
- **Rollback:** same command with `64bit Amazon Linux 2023 v6.6.3 running Node.js 18`. Baseline recorded: Stage was `6.6.3`, Ready/Green, version `code-pipeline-1774384417973-…`.
- **After production goes green:** open the MR moving the six `.gitlab-ci.yml` `image: node:18` → `node:24`. **The pin follows the platform, never leads it.**

### NOT STARTED / owned elsewhere

- **Peer MRs awaiting John's review:** GO `!240`, REQ `!229` (G40-372 safe-eval guards, from *John's Tickets*). I verified both diff **purely additive** over my CI work — zero removed lines. Their hand-off: squash NO, **delete source YES**.
- **G40-39 / G40-10 client halves** — parked until Matt's first build proves the existing fixes.

---

## Deployed?

Backend fixes are live the moment they merge (CodePipeline → EB). **All mobile work is store-gated** — merged ≠ shipped. Newest code on any handset: **2026-03-19 (GO) / 2026-01-28 (Request)**; 48/37 commits merged-but-never-built as of 8/17, and the number grows every merge — **re-count, never cite**:
```
git rev-list --count c10078700..origin/production   # GO
```

---

## Uncommitted / disk-only files

**None from this session.** All work went to `Dev/*` repos via the GitLab commits API and is merged. The `Code/` repo's dirty files (`.claude/launch.json`, `.gitignore`, settings backups, `aws-handoff-2026-08-24.md`) belong to other sessions — I did not touch them. My scratch worktree `node24-proof` is removed.

⚠️ **My source branches were DELETED on merge** despite the hand-off stating "delete source NO" (`fix/ci-guards-cannot-be-skipped`, `fix/g40-58-when-in-use-and-ac4` — both gone from both remotes). Content is fully merged and verified, so nothing is lost — but the stated rationale (*branch = the only intact copy if a store-gated fix must be backed out*) no longer holds for these. Recovery would be via revert commit, not branch checkout.

---

## What I would do next, in order

1. **G40-366 production window** — John's go, low-traffic. Watch settle → smoke sign-in / order / Stripe charge / `account.updated` / payouts → then the CI pin MR.
2. **Review + merge peer `!240` / `!229`** (they explicitly wanted John's eyes after their near-miss).
3. **Matt's first build** — the highest-leverage event on the board: it ships ~5 months of fixes and is the *only* way to validate G40-58/373/376/377, none of which has ever run on a device.
4. `t3.xlarge` swap (~10% cheaper, two generations newer) — deliberately NOT bundled with the platform change; its own five-minute decision.

---

## Traps the next session will hit

1. **⛔ JQL `sprint = <id>` matches sprint HISTORY, not current sprint.** A ticket moved out still matches. Verify placement by reading `customfield_10020` on the issue directly. This fooled me twice in one evening. Also: the Jira search index lags a just-made edit by seconds — a direct issue read doesn't.
2. **Jira transitions out of To Do fail with "Need to assign a responsible"** until an assignee is set. Path is To Do → In Progress (3) → Code Review (4) → Ready for QA (12) → In Review/QA (13) → Ready for Release (14). "Ready for QA" **does** exist (id 10042) — an older memory said it didn't.
3. **A guard's negative control must be pinned to an immutable literal.** Bitten twice: backend `!281`, and `verify-g40-266-submit-routing.js` which sat **wired into no job** because its `origin/production` control inverted when the fix merged (3-of-14 red at HEAD). **Run any unwired guard before wiring it** — unwired = unvalidated by definition.
4. **A green pipeline on the wrong SHA is worse than a red one.** A peer nearly shipped a silent revert of the G40-400 work behind a green tick that belonged to the branch-creation commit. Read the pipeline for *your* commit.
5. **`git fetch` updates refs, never the tree.** Same incident: fetched, then edited the stale checkout and committed the whole file via API — which reverts wholesale. **Diff any whole-file API commit against the target branch before opening the MR** (`repository/compare?from=production`).
6. **Mutating AWS calls are denied in this session type** even standalone, and the harness also refuses a read+write compound command. Reads are fine. Hand John the exact one-liner; everything after the trigger is yours.
7. **Use the repo-local prettier** (`./node_modules/.bin/prettier`, 3.6.2), not `npx` — and note `prettier . --check` covers `.gitlab-ci.yml` itself, so a hand-edit there can fail lint.
8. **The mobile jest runner globs `test/*.test.js` only** — a helper named otherwise is linted but never executed. Useful when you need a file that fails lint *without* failing tests.

---

## MEMORY.md lines owed

⛔ Not appended — MEMORY.md is over its limit and twelve sessions are retiring concurrently. New memory files are written; these index lines are owed:

```
- [CI guards cannot be skipped](ci-guards-cannot-be-skipped.md) — all 3 repos on `needs: []` since 8/19; every new job carries it or names its dep
- [Node 24 platform migration](node24-platform-migration.md) — G40-366; Stage DONE 8/20, production HELD; the "auth breaks off 18" premise is FALSE below Node 26
```

Also updated in place (no new index line needed): `backend-ci-guard-stack.md` (skip-cascade CLOSED + the two-halves gating precision), `shared-branch-stale-snapshot-hazard.md` (the near-revert case study), `sprint-routing-rule-677-vs-710.md` (new).

---

## Doc rows

Every ticket I moved has its durable record:

| ticket | doc row |
|---|---|
| G40-383 | memory `backend-ci-guard-stack` (rewritten) |
| G40-400 | memory `ci-guards-cannot-be-skipped` (new) + the rationale lives in each `.gitlab-ci.yml` header, which travels with the code |
| G40-58 / 373 / 376 / 377 | `APPFLOW-RELEASE-RUNBOOK.md` §0 — all four named with their device-QA steps |
| G40-366 | memory `node24-platform-migration` (new) + the ticket's own comments |

**None owed.**

---

## Open questions for John

**One, and it is live:** G40-366 — **production go/no-go.** Stage rehearsed clean; production is held indefinitely at this checkpoint and is safe to leave. Asked directly in-session at retirement.
