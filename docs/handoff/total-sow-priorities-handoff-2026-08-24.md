# Total SOW Priorities — session handoff 2026-08-24

**Transcript:** `6b2162a1-d8dd-4484-8e4b-8bd4db91c2fa.jsonl` (42 MB)
`~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/6b2162a1-d8dd-4484-8e4b-8bd4db91c2fa.jsonl`

**Grep anchors** — distinctive to this session:
`Total-Gopher-Deployment-Priorities` · `LAUNCH-SOW` · `gopher@13.9.0` · `162,627` ·
`amount_received` · `INCIDENT GUARD` · `extra_data` · `pickAccountForPhone` ·
`pages_access_level` · `SENTRY_AUTH_TOKEN` · `never-built` · `c10078700`

---

## What this session was

Owner of **`Total-Gopher-Deployment-Priorities.html`** — the initiative-level board for the
incoming dev partner (Matt O'Donnell / `AbsolutOD`). Receives ticket-close relays from every
other session under the standing notify-SOW rule, verifies them, and records the **scope
consequence** rather than the narrative. Also owns direct Slack contact with Matt.

---

## State of play

### DONE and verified

| What | Where | Evidence |
|---|---|---|
| Priorities doc at **v3.77** | `Dev/gopher-deployment-priorities` `c6aabef` | pushed, byte-verified vs remote on every revision |
| **`LAUNCH-SOW.md`** — 70-item launch checklist | `gopher-dev-handoff` `4104ee0` | pushed; **the only repo Matt can see** |
| **`Gopher-Launch-SOW.html`** — same, styled + interactive | `Documentation/Gopher — Intended/` | ⚠️ **disk-only, see below** |
| `STANDING-RULES.md` §8 — *Request History* is launch-products-only | `gopher-dev-handoff` `9706104` | owner ruling 08-21, verbatim |
| `STANDING-RULES.md` §11 — credential files are `KEY=value` | `gopher-dev-handoff` `b7b04f9` | cost 3 sessions in 24h |
| Slack to Matt ×4 | `#gopher-claude-github` + DM | see "Matt" below |

### DONE but NOT verified by me

- Everything marked `INHERITED` in `LAUNCH-SOW.md` — ~19 items. Deliberately flagged; **do not
  promote them to fact without re-deriving.** Several figures in this project have failed
  re-derivation.

### IN FLIGHT / NOT STARTED

- **The SOW question is still unanswered** — see *Open questions*. It is the only thing I
  blocked on and never got.
- `RFP/Gopher-Scope-of-Work.md` is at **v1.6, last updated 2026-08-05**. Two strikes, one large
  add and one uncosted gap have accumulated since. **I deliberately did not touch it.**

---

## Deployed?

Nothing this session produced deploys to a user-facing host. Both repos are documentation.

**But the board's headline number is a deployment fact and it moves daily.** Verified by
counting commits between the shipped SHA and `origin/production`, not by SHA ancestry
(`git merge-base --is-ancestor` is invalid against the marketplace `main`):

```
Gopher GO      shipped c10078700 (2026-03-19)   →  75 commits never built
Gopher Request shipped 1d1e4d8e6 (2026-01-28)   →  63 commits never built
```

It moved **three times on 2026-08-20 alone** (71 → 73 → 75). **Recount it; never cite mine.**

`requester@3.9.1` shipped 08-22. **Gopher GO has not shipped** and carries ~93% of all error
volume — 162,627 events, 100% attributed to `gopher@13.9.0`.

---

## Uncommitted / disk-only files

- ⚠️ **`Documentation/Gopher — Intended/Gopher-Launch-SOW.html` (36 KB) — `Gopher — Intended`
  is NOT a git repo.** This file exists on disk only. A `git log` anywhere will never show it.
  Its markdown twin (`gopher-dev-handoff/LAUNCH-SOW.md`) IS committed, but the twin has no
  styling, no interactive checkboxes and no mobile CSS. **If that file is lost, it is lost.**
- Nothing else. Both repos I wrote to are clean and synced.
- The `Code/` repo has uncommitted files (`.claude/launch.json`, `.gitignore`, settings backups,
  `SESSION-RETIRE-CHECKLIST.md`) — **none are mine.** I only read from that repo.

---

## What I would do next, in order

1. **Get the SOW answer from John.** Everything else in §L of `LAUNCH-SOW.md` is downstream of it.
2. **Chase the Gopher GO build.** It is the single highest-leverage item on the whole board:
   one build removes 93% of error volume and unblocks 9 merged-but-invisible client MRs.
3. **Merge `production` → `next` in both mobile repos.** They were drifted at 4 and 2 commits on
   08-23. Anyone branching off `next` in the requester repo gets a tree where `npm ci` fails.
4. **Triage the 137 open non-Phase-II tickets** into launch / post-launch. Until that happens
   there is no real launch scope number, only a Jira count.
5. **Decide where the HTML artifacts live** — Matt proposed GitLab Pages (good idea; private
   Pages works there, `pages_access_level: private` confirmed). Open sub-question: the handoff
   repo is on **GitHub**, and there is no handoff project in the `gophergo` GitLab group.

---

## Traps the next session will hit

**These cost me time. Every one is a real incident from this transcript.**

1. **⛔ Verifying a fact is not verifying its interpretation.** I confirmed `main` was the
   default branch and last committed December 2025, then repeated another session's word for
   it — *"DEAD"* — onto the board. `main` is **deliberately frozen** as the rollback point for
   the live apps. *"Dead"* reads as an invitation to tidy. **An old timestamp is evidence of
   nothing on its own; ask who relies on it.**

2. **⛔ Grepping a literal proves nothing about a value that travels under another name.**
   Cost me twice in one day: `allow_counter` (missed because it moved through an object
   spread) and `extraData` (the intermediate variable is `extra_data`, snake_case, so my
   search returned zero and I published "zero call sites"). **Trace the chain.**

3. **⛔ A guard that refuses must fail the push with it.** An edit script aborted on a bad
   match string; the version bump and push ran anyway, so the remote briefly carried a commit
   message describing a change its diff did not contain. **Use `set -e`.** Fixed at v3.66.

4. **The Browser pane reports `viewport: 0`,** which makes every element look like it
   overflows — and it survives `resize_window`. I nearly "fixed" a layout that was never
   broken. **Screenshot before believing a measurement.**

5. **A number without its audit date is a liability.** Alerting filters went 5 → 13 → 17 in
   four days; the never-built count moved three times in one day. I corrected my own board four
   times. **Record the date beside the figure, always.**

6. **`~/.sentry-token` is `SENTRY_AUTH_TOKEN=<value>`,** not a bare token. Passing the whole
   line returns `{"detail":"Invalid token"}`, which reads exactly like expiry. Three sessions
   lost time to this; one escalated it to John as blocked access. Also: `statsPeriod` accepts
   only `''`/`24h`/`14d`, and **release attribution must come from `/issues/<id>/tags/release/`**
   — combining a free-text query with `release:` silently returns zero and looks like a finding.

7. **Peer relays are leads, not facts.** I caught a queue miscount (relay said ten, the
   enumeration listed nine), a "byte-identical" claim where 2 of 3 files differed, and a
   corroboration that was the same finding counted twice. **All were good-faith and all were
   wrong.** Re-derive anything that will enter a document.

8. **Matt reads short.** He told John *"I'm not exactly sure what this means"* about a dense
   Claude note. Bullets, one action first, no SHAs unless he needs to type them.

---

## Matt — what he has been told, so you don't repeat or contradict it

Four Slack messages, all in his DM or `#gopher-claude-github`:

1. **The 97% bug** — build Gopher GO from `production`, no code needed, filter Sentry by
   release to verify.
2. **The release protocol** — the full Appflow sequence, the draft-rollout step that died in
   March, the **undocumented** internal→production promotion, and where TestFlight fits.
3. **The GO-vs-requester split** — requester 3.9.1 shipped; GO is the one carrying the errors.
4. **GitLab Pages** — his idea, endorsed; flagged that the handoff repo is on GitHub, that
   Pages access control must be confirmed *before* first push, and that Pages solves rendering
   but **not** shared checkbox state (`localStorage` is per-browser).

**Not yet told to Matt / not in `gopher-dev-handoff`:** the tier price figures ($20→$35 /
$30→$50) are unconfirmed and must not reach copy; the Deals-to-Raleigh gate does not exist;
the waiver-link exposure is live on **production and next** in both apps.

---

## MEMORY.md lines owed

⛔ Not appended — `MEMORY.md` is over its limit and twelve sessions are retiring concurrently.
Add these when someone consolidates it:

```
- [Launch SOW is the master launch list](launch-sow-master-checklist.md) — 70 items, 9 owner decisions; HTML in Gopher — Intended is DISK-ONLY
- [Verifying a fact ≠ verifying its meaning](verified-fact-vs-inherited-interpretation.md) — "main is DEAD" was inferred from a timestamp; it is deliberately frozen
- [Never-built count moves daily](never-built-count-is-dated.md) — recount, never cite; GO 75 / REQ 63 as of 8/23
```

Memory files written this session: none new — the two rules above are recorded in
`STANDING-RULES.md` §8 and §11 instead, which every session reads regardless of worktree age.

---

## Open questions for John

**One, and it is four days old:**

> **Is `RFP/Gopher-Scope-of-Work.md` still a live bidding instrument, or has it become Matt's
> contract definition?**

It is at v1.6 (2026-08-05). Since then: **two strikes** (G40-18 closed; notification-sound
scope was priced against a false premise), **one large add** (Refer Gopher — lifetime
attribution, kind-aware rail), and **one uncosted gap** (notification tap-through, ~35 call
sites against a spec promising 30 tap destinations). A bidder pricing v1.6 today would
over-price two items, under-price one, and miss one entirely.

**I declined to edit it four times** on the grounds that it is out to bidders — a premise I
later found was itself stale (the doc's own timeline has quotes closing 08-15). **The answer
changes whether the next session freezes that document or brings it to v1.7.**
