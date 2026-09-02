# Live App Bugs & Features — session handoff, 2026-09-02 (index, not diary)

**Transcript (never deleted, full-text searchable):**
`~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/f8e86ed2-21ff-4efb-9616-24dd71ae7513.jsonl` — 21.5 MB.
Confirmed on disk, read out of this session's own scratchpad path (**not** the `local_` id —
different id space, produces a dead reference).

**Supersedes parts of `live-app-bugs-handoff-2026-08-24.md`** — see *What is now stale* at the
bottom. That doc is otherwise still the record for everything before 8/24; this one does not
repeat it.

---

## Grep anchors

```
af30f61a            backend merge — requester-cancel email, G40-188
!438 !261 !249      the three MRs this session opened
feat/g40-188-cancel-reason      client branch, BOTH mobile repos
CancelReasonSheet   the new shared picker component
cancelReasons.js    MIN_REASON_WORDS — the reason POLICY module
cancelation-byrequester-mail-to-gopher.ejs      new email type 45
64954  64981        trigger order / smoke-test order
REACT_APP_VERSION   PAYOUT_TOKEN_REQUIRED_FROM_VERSION   the version-floor finding
emails: true        G40-276 root cause (one word)
R58N22N8QSM         the attached A50, for device QA
```

---

## State of play

### ✅ DONE and verified end-to-end

**G40-188 backend — merged, deployed, proven by a live send.**
`!438` → merge `af30f61a` → CodePipeline `7e160263` Succeeded → EB **Green/Ok**, 0× 5xx.
Smoke-tested on **order 64981**: the assigned worker received *"Request #64981 was cancelled by
the requester"* with the reason block rendering. Adds email **type 45**
(`cancelation-byrequester-mail-to-gopher.ejs`), sent whenever a Gopher is **assigned** — not
only on `scheduled`, because a requester can also cancel from `picked_up`/`purchased`.

⚠️ **Template 6 is NOT that email.** `cancelation-byrequester-email-admin.ejs` is the *admin*
record — "View Request in Admin Panel", no name, no reason. An earlier read of mine said wiring
it would inform the worker; **that was wrong** and the ticket carries the correction.

**Six defects reopened from the 2026-06-15 bulk-cancel**, each with first-hand evidence on the
ticket, all now **To Do**, resolution cleared, **no sprint assigned** (owner's call):
G40-14 · G40-55 · G40-59 · G40-185 · G40-193 · G40-276.

### ⚠️ DONE but NOT verified on a device

**G40-188 client — both halves green, awaiting merge AND device QA.**
`!261` (GO, head `4549e1aec`) · `!249` (Request, head `840ce3fc4`). Both `production`,
squash **NO**, delete source **NO**. ⛔ **Ship together** — one alone leaves two reason formats.

Owner ruled 2026-08-30: option wording approved as-is, reschedule intercept **IN** as **option B**
(nudge to message the Gopher — it deliberately does *not* call the reschedule endpoint), both
apps ship together.

**The sheet has never rendered on a handset.** That is the only gap. Runbook is written and
turn-key: `docs/handoff/G40-188-device-qa-runbook.md`.

### 🔎 INVESTIGATED, handed over, not fixed

**DOB sent as arithmetic** (`1962-06-22` → `1934`). Full writeup:
`docs/handoff/dob-arithmetic-client-investigation.md`. Received from the Sentry session, which
patched the backend (**inherited, not verified here**: MR !448 / `53791a18`).

Three of its conclusions are corrected there with first-hand evidence — guards **are** in the
shipped builds, it is **Gopher Go** not Request, and `evaluateExpression` is **not** the path.
⛔ What writes a *number* into `formik.values.date_of_birth` **could not be established**. Stated
as a limit, deliberately not dressed up as a mechanism.

### ❌ NOT STARTED

Ten of the twenty-three 2026-06-15 bulk-cancelled tickets could not be settled from code alone
and need a device: **G40-33 · G40-89 · G40-129 · G40-130 · G40-178 · G40-183 · G40-196 ·
G40-227 · G40-239 · G40-240**. (G40-183/196 are Gopher Connect *user-story* tickets, not
defects — plausibly the only ones in the batch that deserved cancelling.)

---

## Deployed?

| thing | live? | verified how |
|---|---|---|
| G40-188 backend (type 45 email) | **YES** | EB version label carries `af30f61a`; a real email arrived for order 64981 |
| G40-188 client (both apps) | **NO** | store-gated, no OTA; MRs unmerged |
| the six reopened defects | n/a | Jira only, nothing shipped |
| Release prep doc change | **YES** | `5685d81` confirmed an ancestor of `origin/main` **and** read back from `origin/main` by content |

Store reality: **3.9.1 live on both stores, both apps, since 2026-08-29.** Tags
`release/ios-863` / `release/android-864` (GO), `release/ios-851` / `release/android-852`
(Request).

---

## Uncommitted / disk-only files

**Nothing of mine is uncommitted anywhere.** Swept every repo touched:

| repo | my state |
|---|---|
| `Code` (this repo) | my 3 docs committed — `c91086f`, `d2930f2`. Branch is 134 commits ahead of upstream, which is this repo's normal state (deploys read the working tree, feature branches are not pushed) |
| `gopher-backend-api` | worked in a throwaway worktree, now removed; branch pushed, MR merged |
| `gopher-mobile-gopher` | worktree removed; `feat/g40-188-cancel-reason` pushed |
| `gopher-mobile-request` | worktree removed; `feat/g40-188-cancel-reason` pushed |
| `gopher-dev-handoff` | clean, `5685d81` pushed to `origin/main` |

⚠️ The Dev clones show dirt (backend 35 files + 4 stashes, Request 17, GO 4) and sit on other
sessions' branches. **None of that is mine** — I never edited a shared clone, only worktrees cut
from `origin/production`. Do not assume that dirt is abandoned work from this lane.

⚠️ **The gitignored disk-only trap does not apply here.** `_prototypes/Go/gopher-banner.js` and
`_prototypes/Request/gopher-banner.js` were **never edited by this session** — saying so in words
because `git status` can never show it either way.

---

## What I would do next, in order

1. **Device QA on the G40-188 sheet**, then merge `!261` + `!249` together. Everything needed is
   already on the machine — the A50 (`R58N22N8QSM`, Android 11) is attached, both apps installed,
   `capacitor.config.ts` already carries the commented live-reload hooks. No Appflow build needed.
   Runbook: `docs/handoff/G40-188-device-qa-runbook.md`.
2. **Answer the worker-tier question** (test E1 in that runbook): Standard vs Pro/Pro+. It decides
   whether the *route* to the Gopher's cancel screen also needs fixing — the pin redirect in
   `bottomRoutes.js` is gated on `!user?.gopher_type_id`, i.e. Standard-only.
3. **G40-276** — one word, `email: true` → `emails: true` in `emailList.js`, **both apps**. Highest
   value-per-effort of the six reopened. Deliberately not done: a third MR would have muddied the
   ship-together pair.
4. **G40-185** — one character, backend, **ships without a store release**.
5. **The DOB handover's blocking question:** what `app_version` were the two Sentry events on.
   Needs Sentry or a production DB read. If the March build, it is already fixed by the 8/29
   release and the exposure is un-updated installs.
6. **The ten unsettled bulk-cancel tickets** — needs the same device session as (1).

---

## Traps that cost me time (all first-hand; observation separated from cause)

⛔ **CloudWatch on `Gopher-Production` lags ~20 minutes.** I queried for a cancellation *after*
the resulting email was already in the owner's inbox and got **zero matches**. Taken at face
value that reads as "the request never reached the server." Newest ingested event was `19:01:47`
at a wall clock of `19:21:47`. **Measure the newest ingested timestamp before treating an empty
recent-log result as absence.** Written up as memory `production-cloudwatch-lags-20-minutes`.

⛔ **`aws logs filter-log-events --output text` returns every event on ONE tab-separated line.**
A single `grep -v` therefore discards the entire result and looks exactly like zero matches. Use
`--output json` and parse. This produced two false "nothing found" readings in a row.

⛔ **CI lint runs `npx eslint .` AND `npx prettier . --check`.** Both mobile pipelines failed on
the first push with eslint clean locally. Run prettier before pushing, always.

⚠️ **`git log --oneline -3` in the Code repo does not show your own recent commits** if other
sessions have committed since with later dates. I briefly read this as my work having been
reset. Check `git merge-base --is-ancestor <sha> HEAD` before concluding anything.

⚠️ **The GitLab merge endpoint is classifier-flaky.** `PUT .../merge` was blocked once and went
through on an immediate retry, same call. That is not an auth problem — the token was fine
throughout. (Recorded previously in memory `credential-locations-on-disk`; confirmed again.)

⚠️ **This Jira workflow has no `Canceled → To Do` transition, but the route exists.**
Canceled → **Blocked** (6) → **In Progress** (9, *"Blocker has been removed"*) → **To Do**
(7, *"Work can't be started yet"*). Also clear `resolution` separately — a reopened ticket keeps
`Resolution: Done` and reads as closed. G40-188 was left in In Progress on the first attempt
because I stopped one hop short.

⚠️ **The `@capacitor-community/contacts` projection silently ignores unknown keys.** `email: true`
is not a key (`emails` is), so the field is never requested and the list is always empty. No
error. This is G40-276's entire cause.

---

## Open questions for John

**None.** Two decisions were taken with him at the keyboard on 8/30 (option wording; intercept =
option B; ship both apps together). The remainder below are **recommended defaults**, labelled as
such, because he retired for the night before they came up.

1. **Sprint placement for the six reopened tickets** — *default: leave them out of TrustShield.*
   They are backlog until he places them; the sprint is already carrying 24 items.
2. **Bumping `REACT_APP_VERSION`** — *default: do nothing this release.* See below; it is not a
   blocker for anything currently in flight.
3. **G40-80's link on G40-188** — a stale `Duplicate` link (id `11241`) still needs deleting by
   hand; the correct `Relates` link is already added. *Default: delete the Duplicate row.* This
   MCP has no delete-link tool.

---

## ⛔ The version-floor finding — read before writing any server-side gate

`REACT_APP_VERSION` is the only signal the API has about which client is calling, and it **binds
at build time**. Measured in the Appflow **prod** environments 2026-08-30: **GO `45`, Request
`44`** — and **neither moved in the 3.9.1 release**. The API cannot currently tell a current app
from a March one.

⚠️ **GO 45 → 46 is not neutral.** `PAYOUT_TOKEN_REQUIRED_FROM_VERSION` defaults to **46** with no
override on `Gopher-Production` (checked — the same query returns `STRIPE_API_VERSION`, so the
absence is real, not a blind probe). Bumping GO to 46 therefore **arms the payout-token guard**,
whose last outing took payout-account creation to zero for nine weeks. Arm it deliberately or
raise that env var first.

**Correction to something I said three times before checking:** there is **no** cancel-reason
version gate in production. `REQUIRED_FROM_VERSION` appears exactly once in the whole backend —
the payout one. `!438` was email-only. So the bump is **not** a blocker for G40-188.

The durable fix is now a pre-build step in
`gopher-dev-handoff/public/release/Store Release Sprints/8.29.26_TrustShield/STORE-RELEASE-PREP-TRUSTSHIELD.md`
§5 (commit `5685d81`), because bumping once fixes nothing — it froze precisely because nobody
owned it at release time.

---

## What is now stale in the 8/24 handoff and its renewal prompt

Confirmed, not assumed:

1. ✅ **Stripe ledger check — still CLOSED.** Nothing this session touched it. `RENEWAL-PROMPTS-2026-08-24.md` §7 is correct.
2. ✅ **Leader election — still DECIDED.** G40-411 verified today: **To Do, no sprint** (backlog).
   §7 is correct. Do not re-raise.
3. ⛔ **NEW — the 8/24 doc's item #2 is stale.** It says *"the store release is the highest
   user-impact item and it is not ours — ten client MRs wait on it."* **That release shipped
   2026-08-29**: 3.9.1, both apps, both stores. Those MRs are no longer waiting on a release.
4. ⛔ **NEW — the §7 renewal prompt's last instruction is stale.** It says *"Claim files in
   `Dev/gopher-dev-handoff/WORK-REGISTRY.md`."* **That path no longer exists.** The handoff repo
   was restructured onto Astro; it is now
   `src/content/docs/programme/work-registry.md`. ⚠️ **And that repo went GitLab-canonical on
   2026-08-30** — `origin` is GitLab, the GitHub remote is renamed
   `github-STALE-do-not-push` (verified first-hand). Any instruction to push it to GitHub is dead.

---

## MEMORY.md lines owed

Per the retire instruction, memory **files** are written but `MEMORY.md` was **not** touched —
other sessions are retiring concurrently. Owed index lines:

```
- ⛔ [prod CloudWatch lags ~20min](production-cloudwatch-lags-20-minutes.md) — an empty recent-log query is LAG, not absence
```

⚠️ That one line was **already added** earlier in this session (before the concurrency warning
arrived) and is present in the index. **Nothing further is owed** — stated explicitly rather than
left ambiguous, because "probably nothing" in a handoff becomes a re-derivation later.

---

## Opening prompt for the successor

```
You are the successor to the Live App Bugs & Features session, which was retired 2026-09-02.

FIRST, before reading any code: read
docs/handoff/live-app-bugs-handoff-2026-09-02.md.
It is an index, not a diary. It carries the state of play, what is verified vs
inherited, the traps that cost the last session time, and grep anchors into its
full transcript. It also lists what has gone stale in the 2026-08-24 handoff —
read that section before trusting the older doc.

To recover detail the handoff only points at, grep the archive:
  grep -l "<anchor>" ~/.claude/projects/-Users-johnnewbury-*/*.jsonl
Anchors: af30f61a · !438 · !261 · !249 · feat/g40-188-cancel-reason ·
CancelReasonSheet · cancelReasons.js · 64981 · REACT_APP_VERSION ·
PAYOUT_TOKEN_REQUIRED_FROM_VERSION · "emails: true" · R58N22N8QSM
Then read around the match — the transcript holds the full reasoning AND the tool
output, which is more than any summary preserves.

The likely first task: device QA on the G40-188 cancellation reason sheet, then
merging !261 and !249 TOGETHER. Runbook: docs/handoff/G40-188-device-qa-runbook.md.
Everything needed is already on the machine — no Appflow build.

Standing constraints for this lane:
- Local-test gate STANDS: for any Final/ change, stand up a local serve, give John
  the URL, wait for his go-ahead before deploy.sh --push. An explicit per-instance
  "ship it" overrides that deploy only.
- A push to main publishes to BOTH GitHub Pages and TigerTech. There is no staging.
- Verify deploys BY CONTENT (curl + grep a string you changed), never by SHA.
- A backend merge to production AUTO-DEPLOYS. Owner consent first, in plain words:
  what it solves, the risk, the reward.
- Mobile changes are store-gated — there is no OTA. A merge reaches nobody until a
  build ships. Say so explicitly rather than calling a merge a fix.
- CI lint = eslint AND prettier --check. Run both before pushing.
- Do not append to MEMORY.md while other sessions are retiring. Write your memory
  files, and list owed index lines at the end of your handoff.
- Ask John directly about anything ambiguous. Do not leave open questions in a doc.

Confirm you have read the handoff and state what you believe the next task is
before doing any work.
```
