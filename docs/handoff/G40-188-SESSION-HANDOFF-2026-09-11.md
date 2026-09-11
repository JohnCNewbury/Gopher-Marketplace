# G40-188 + G40-469 — session handoff 2026-09-11

**Transcript:** `58a8bc79-c9ba-404a-83b1-8453abf46755.jsonl`
**Grep anchors:** `G40-188` · `G40-469` · `!557` · `!572` · `!573` · `!294` · `!309` · `!313` ·
`7beffa86` · `9c57fbf35` · `492de8ba9` · `17dbca8` · `fff75f0` · `repost.js` ·
`released_at_stamp` · `review_hold_stall_alert` · `CancelReasonSheet` · `repostNeedsReason` ·
`REPOST_FREE_REASON_HOURS` · `cancel-doors-contract` · `65354` · `65360` · `65365`

Two workstreams ran here. **G40-188** (requester/gopher cancellation) is functionally complete
and live server-side. **G40-469** (review-hold stall alert) is built, green, and **not merged**.

> ⛔ **Everything below marked VERIFIED was re-checked at source on 2026-09-11**, after this
> session was compacted — by content on `origin/production`, not from the summary and not by SHA.
> Anything not so marked is inherited. The distinction is the point of this document.

---

## 1. Owner's canonical design (settled — do not re-litigate)

Recorded in memory `g40-188-cancellation-design-canon` and in the cancellation canon doc.

- Both parties can cancel a scheduled request before start.
- **Gophers WRITE** the reason (free text). **Requesters PICK** from a menu.
- **BOTH** receive an email.
- A **requester** cancelling a request a Gopher has already taken **FORKS**:
  **(a) Find a different Gopher** → keep listed + re-broadcast, Gopher told the job moved on;
  **(b) Cancel the request** → reason captured, normal cancellation, both emailed.
- **Reason is required only inside 24 hours** of the scheduled time. Outside 24h the requester
  explains nothing. *(Owner ruling, 2026-09-10.)*
- **Reuse the existing cancellation template.** No new template — "this is still just a
  cancellation." *(Owner ruling, 2026-09-10.)*
- **Repost stays available on `accepted`**, deliberately not narrowed. *(Owner ruling.)*

---

## 2. State of play — what is LIVE

### Backend — `gophergo/gopher-backend-api`, `origin/production` @ `7beffa86`

**VERIFIED 2026-09-11** by reading `origin/production` after an unsuppressed fetch:

| Thing | Evidence |
|---|---|
| `controllers/order/repost.js` (!557) | file present on `origin/production` |
| Countdown fix (!572) | `released_at_stamp` appears **3×** in `controllers/order/cancel.js` |
| Requester's own cancel copy | `sendEmail.js` line 77 → `51: 'cancelation-byrequester-mail-to-requestor.ejs'` |
| Head of branch | `7beffa86 Merge branch 'G40-9-release-countdown-null' into 'production'` |

**!572 was the real bug of the day.** `order` in `cancel.js` is the *pre-update* snapshot, so
`release_expires_at` was **null in every release payload since G40-9 shipped**. The fix stamps
`released_at_stamp` and passes a merged object to the notifier. Backend merges to `production`
**auto-deploy live** via CodePipeline, so this is in front of users now.

⚠️ **`lib/sendEmail.js` requires TWO edits per template** — the `email_path` map **and** a `case`
in the subject switch. One without the other silently falls to `default:`, logs, returns, and
**reports success while mailing nobody**. Pinned by `test/email-types-reach-transport.test.js`.
See memory `sendemail-registering-a-template-is-two-edits`.

### Request app — `gophergo/gopher-mobile-requester-capacitorjs`, `origin/production` @ `9c57fbf35`

**VERIFIED 2026-09-11:**

- `src/services/cancelReasons.js` — present; `REPOST_FREE_REASON_HOURS = 24` (line 129),
  `repostNeedsReason` (line 131), `REPOST_REASONS` (line 74).
- `src/component/modals/CancelReasonSheet.js` — consumes `repostNeedsReason(scheduledAt)`
  (line 122) and `REPOST_REASONS` (line 105). **This is where the 24-hour rule actually lives.**
- **BOTH cancel doors render the sheet**: `layoutComponent/RequestDetailPullOver.js` **and**
  `requestOrder.js`.
- `repostNeedsReason` **fails toward asking** — null, undefined, `""`, `"not a date"`,
  `"0000-00-00"` and past times all return `true`. Pinned in `cancelReasons.test.js`.

> ⛔ **The single worst error of this ticket lives here.** The fork first shipped on
> `requestOrder.js` — the wrong screen. The live door was
> `layoutComponent/RequestDetailPullOver.js`, and the owner found it by cancelling **real order
> #65354**. The root cause was *scope*: the question asked was "where is `CancelReasonSheet`
> **mounted**", when the question that mattered was "where can a cancel be **sent** from".
> The permanent fix is the census guard in §4. See memory `check-the-mount-not-just-the-wiring`
> and `a-grep-proving-a-negative-must-state-its-scope`.

### GO app — `gophergo/gopher-mobile-gopher-capacitorjs`, `origin/production` @ `492de8ba9`

**VERIFIED 2026-09-11:** the gopher side still **writes**, as canon requires —
`src/component/modals/CancelReasonSheet.js` renders a `<textarea>` with
`maxLength={MAX_REASON_LENGTH}` (150), gated by `isFreeTextComplete` and `MIN_REASON_WORDS = 3`.
The "Other" textarea is revealed **above** the keyboard (G40-421 occlusion fix).

---

## 3. State of play — what is NOT live

### ⛔ !573 (G40-469) is NOT merged — VERIFIED, and this corrects the record

**MR:** https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/573

Proven by content on `origin/production`, because the GitLab token lookup was blocked by the
permission classifier and was **not** routed around:

- `review_hold_stall_alert` in `middleware/cronTasks.js` → **0 occurrences**
- email type `52` in `lib/sendEmail.js` → **0 occurrences**
- branch head is the !572 merge, with nothing after it

**What it does:** a read-only cron sweep that emails an admin alert when an order sits on a
review hold past the point where its authorization is about to lapse. **It cannot change state,
capture, refund or pay out** — that is asserted by a guard, proven by deliberately breaking it
(pointing the sweep at `db.orders.update` made the "ALERT ONLY" assertion fail).

**Why it exists:** order **#65360** sat at `purchased` with a fraud/age flag and nobody was told.
`AUTHORIZATION_WINDOW_DAYS = 7`; `confirm_auto_payout` selects `aasm_state = 'delivered'`, so a
`purchased` order is **never** swept and does **not** "settle itself in 48h" — an earlier claim in
this session that was wrong and is corrected here.

**Merge hand-off:** target **`production`** · squash **yes** · delete source **yes**.
⚠️ Merging **auto-deploys live**. Owner consent required before it moves.

**CI:** pipeline `2839213672` passed (lint, unit-tests, admin-auth-guard, secret-scan) — this is
**inherited**, dated 2026-09-10, and should be re-confirmed on the MR page before merging.

### The store build — the whole remaining critical path for G40-188

**Nothing the apps do reaches a single user until an Appflow build ships.** There is no OTA.
The three MRs are merged to `production` in their repos and are sitting there inert.

Must be in the build:
- GO **!294** · Request **!309** · Request **!313** ← `!313` is the one that fixes the live door

⚠️ **`REACT_APP_VERSION` is NOT in the repo.** VERIFIED: `src/axios/axios.js:10` reads
`process.env.REACT_APP_VERSION` and sets the `appversion` header, but no `REACT_APP_VERSION`
exists in either repo's `.env`. It is injected by the **Appflow build environment**, so the bump
happens there. **Read the floor off the build; never guess it** — a guessed appversion floor is
what caused the G40-11 gate incident on 2026-09-08. Memory:
`store-app-appversion-is-45-not-the-env-file`, `server-guard-must-be-appversion-gated`.

⚠️ Lockfiles must be regenerated with **npm 10.9.7 / CocoaPods 1.16.2** — npm 11 or pod 1.17 locks
fail Appflow (builds #257, #258). Memory: `mobile-lockfile-regenerate-with-npm10`.

⚠️ The Request app's `production` moved **after** this session's merges — head `9c57fbf35` is
another session's `feat/duplicate-request-warning` (2026-09-11). The build will carry it. That is
expected, not drift, but it is someone else's change and should be named in the release notes.

### The 101 guides — written, committed, deliberately NOT deployed

A user-facing change is not done until its 101 guide is updated (owner, 2026-08-05) — **but the
guide describes what the product does, not what it will do.** Publishing before the build would
make both guides lie. So both sit on local branches:

| Branch | Commit | Touches |
|---|---|---|
| `G40-188-request-101-repost` | `17dbca8` | `Final/gopher-request-101.html` |
| `G40-188-go-101-cancel-picker` | `fff75f0` | `Final/gopher-go-101.html`, `Final/gopher-request-101.html` |

**VERIFIED not live**, with the probe proven rather than assumed: `gopher-request-101.html`
**does** exist on `origin/main` and a control string (`Cancel`) matches **3×**, while the new
string (`Find a different Gopher`) matches **0×**. So the zero is a real absence, not a bad path.

⚠️ **Deploy publishes the WORKING TREE to TWO live hosts** (GitHub Pages + TigerTech). These
branches are kept *out* of the working tree on purpose. Do not `--allow-dirty` them in by
accident. And **verify by CONTENT, never by SHA** — `git merge-base --is-ancestor` against
`origin/main` is always false for a feature commit and invents fake deploy gaps.

---

## 4. Guards this work added — do not weaken them

- **`scripts/assert-cancel-doors-have-the-fork.mjs`** + CI job **`cancel-doors-contract`**
  (Request app). It is a **census, not a file list**: it enumerates every caller of
  `PATCH /orders/:id/denied` and requires each to render the sheet with `onRepost` or carry a
  written exemption. **It fails if the census matches zero** — so it cannot pass by finding
  nothing. This is the structural answer to the wrong-screen bug.
- Backend guards that caught the G40-469 work and were each *answered*, never weakened:
  `order-logs-column-guard` (SQL alias collision — renamed `prior_alert`),
  `cron-failure-visibility` (added to `EXPECTED_CRONS`),
  `alert-marker-manifest` (baseline 9 → 10),
  `g40-401-awaited-promise-batches` (line-keyed allowlist refreshed).
- ⚠️ **`middleware/crons.js` needs TWO registrations** — the `task_lists` map entry **and** the
  `runCron(...)` call in `getTasks()`. One without the other registers nothing.
- ⚠️ **Crons double-fire on deploy**, so `review_hold_stall_alert` claims its marker row
  **before** sending the email, not after.

---

## 5. Open items, each with an owner

**No open questions are left for the next session to guess at.** Every item below is either an
owner action or a decision already made.

| # | Item | Owner | Notes |
|---|---|---|---|
| 1 | Merge **!573** | **John** | Auto-deploys. Consent required. Re-confirm CI on the MR page first. |
| 2 | Cut the **Appflow build** (GO !294, Request !309 + !313) | **John** | Store creds are READ-ONLY; rollout is owner-only in the console. |
| 3 | Publish both **101 branches** with that build | next session | Only after the build is live, never before. |
| 4 | **Device re-test** of the fork | **John** | Smallest Android first — the sheet has **18px** headroom at 360×640. |
| 5 | Drop *"Added ability to choose a set reason when you cancel a job"* from App Store GO notes | **John** | **Permanently** — it is false on iOS too. Release-note debt, not a code bug. |
| 6 | `in_progress` phantom state — its own ticket? | **John's call** | Recorded in G40-469. See below. |
| 7 | Correct two false code comments on production | **John's call** | `cancel.js` + `keep_listed.js`. Comments only, code is healthy. Zero runtime risk; needs a merge that auto-deploys. See §6. |

### On item 6 — the finding, stated plainly

`in_progress` **is not a real `ORDER_STATUS`**. The reauthorization query's "auth must NEVER
expire for these" branch therefore resolves to `accepted` **only** — `picked_up` and `purchased`
are **never re-authorised**. It is latent for every such order, not only flagged ones. It is
real, it is not urgent (normal orders pass through those states in minutes), and it touches the
authorization path, so it wants a fresh session rather than a tired one.

---

## 6. Corrections made in this session — inherit these, not the originals

Four claims were asserted here and later proven wrong. They are recorded so the next session does
not re-derive the wrong ones:

1. **`Sequelize.NOW` does NOT bind NULL via `Model.update`.** The opposite was repeated all day
   and propagated to the HQ session before being caught. Production evidence:
   `reminder_autopay_senton` is written only with `db.Sequelize.NOW` and holds **~1,239-1,241
   non-null timestamps** (two independent counts hours apart; the column is still being written,
   so both are right). `orders.updated_at IS NULL` = **0**, and the column is NOT NULL besides —
   silent blanking is not a state it can be in. The bad claim came from testing
   `queryGenerator.updateQuery` instead of `Model.update`. **Do not "fix" healthy call sites** —
   the same pattern lives in `cost_adjustment.js` and `update.js`, which are payments paths, and a
   drive-by change on a false alarm is the real risk. Memory entry rewritten.

   ⚠️ **The one genuinely fatal case is NOT disproven:** `Sequelize.DATE` columns given
   `"Invalid date"` still produce `invalid input syntax for type timestamp` → HTTP 500. That is
   what broke `dispute_resolved_at` on order **#64672** (fixed in !496). Only the raw-string
   `'TIMESTAMP'` + `Model.update` combination was wrong. Do not over-correct in the other
   direction.

   ⛔ **The false claim is SHIPPED ON PRODUCTION, in two code comments — and one of them is
   mine.** Verified 2026-09-11 on `origin/production`:
   - `controllers/order/cancel.js:~232-237` — shipped by **!572, this session**. It asserts "every
     release so far has blanked updated_at" and miscites the dispute_resolution 500 as the same
     defect, when that was the `Sequelize.DATE` case above.
   - `controllers/order/keep_listed.js:~93-98` — asserts "every 'Assign New Gopher' tap has been
     BLANKING updated_at". Flagged independently by the G40-304 session.

   **The code in both files is correct** (`new Date()` is fine) — only the comments lie. So there
   is zero runtime risk and zero urgency. But a false claim sitting in a comment is exactly how
   this one propagated across three sessions in the first place, and the next person to read
   `cancel.js` will inherit it. **Deliberately not fixed tonight**: it would mean a merge to
   `production`, which auto-deploys, for a comment — at the end of a long day, on a payments-
   adjacent file. It is item 7 in §5, owner's call.
2. **#65360 was not "wedged by a bug".** It stays at `purchased` **by design** (G40-454's AC7);
   HQ is the *intended* exit, not a workaround.
3. **A `purchased` order does not "settle itself in 48h".** `confirm_auto_payout` selects
   `aasm_state = 'delivered'`.
4. **The fork shipped on the wrong screen first** (§2). Caught by the owner on a real order.

Grep produced **four separate false negatives** in this session — comments matching negative
assertions, copy split across JSX by `{" "}` and a `<span>`, and a symbol surviving only inside a
comment explaining its own removal. **Read rendered output, not source, when the claim is about
what a user sees.**

---

## 7. Repo hygiene at hand-off time

⛔ **This repo has 22 commits on `HEAD` that are not on any remote**
(`git rev-list --count HEAD --not --remotes` = 22), and most belong to other sessions. **Do not
push.** The same hazard fired on 2026-09-10 on this public repo — 23 commits, 22 of them other
people's, caught one command early.

This handoff is committed **locally only**, scoped to its own file. Nothing else in the working
tree was touched.

---

## 8. Jira

**G40-188** — every server-side claim is now proven against **real traffic** (#65354, #65360,
#65365 traced end to end in CloudWatch: release → both emails → `keep_listed` → re-broadcast to
96 then 119 Pros → reassignment with `Auth status - VALID (7.0 days remaining)`), not against
tests. It is **not Done** until the build ships and the 101s publish — *Done means waiting on
nothing*.

**G40-469** — built and green; **not Done** until !573 merges.

⚠️ A ticket is never the source of truth. The canon lives in the cancellation doc and in memory
`g40-188-cancellation-design-canon`; the ticket points at them.
