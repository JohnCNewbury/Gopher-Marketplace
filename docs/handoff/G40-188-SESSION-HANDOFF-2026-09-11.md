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

## ⏱ START HERE — the 60-second version

| | |
|---|---|
| **G40-188** | Server side **complete and proven on live traffic**. Client side merged but **reaches nobody until an Appflow build** — that is the whole remaining critical path, and it is the owner's to run. |
| **G40-469** | Live and working as of 10:49:01Z today — **after shipping broken and being hotfixed**. §3 has the arc; read it before touching that file. |
| **Your first job** | ~~§3 open defect~~ **DONE 2026-09-11 — `gopher-backend-api!579` awaits the owner's merge.** Next: content-verify the deploy (`git show origin/production:middleware/cronTasks.js \| grep auth_expires_at`) and update the doc row. |
| **Do not** | Re-litigate §1 (settled owner rulings), or trust any number in §6 without re-reading its provenance row. |
| **Repo state** | This repo has **unpushed commits belonging to other sessions. Do not push.** See §7. |

**Two habits this session learned the hard way, both worth inheriting:**

1. **A green test suite proved nothing** — every assertion was about source text, none executed
   the code. CloudWatch caught the bug, twelve failures in. When you add a guard, break the code
   deliberately and watch it fail before you trust it.
2. **Verify by content, never by a report.** "✓ Merged!", a green pipeline number, a passing
   suite, and a peer's message are all claims. Each one here was checked at source, and three of
   them turned out to need correcting.

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

### Backend — `gophergo/gopher-backend-api`, `origin/production` @ `4538d7b0`

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

## 3. G40-469 — shipped, broken, fixed — and what is still NOT live

### ✅ G40-469 — MERGED, SHIPPED BROKEN, HOTFIXED, NOW WORKING. Read the whole arc.

**Do not read this as "!573 landed cleanly." It did not.** The sequence is the useful part.

| Time (UTC) | Event |
|---|---|
| 10:23:02 | **!573 merged** as `fce5e0e7`. CI green on head SHA `accdd4f9`, six jobs. |
| 10:25:24 | Deployed. CodePipeline `519ca1da` Succeeded, EB version label matched the SHA. |
| 10:26:01 | **`CRON FAILED: review_hold_stall_alert -- rows is not iterable`** — and every minute after. |
| 10:37 | Caught in CloudWatch. **12 of 12 ticks had failed.** |
| 10:44 | Owner: *"fix forward."* |
| 10:46 | **!575** raised. CI green on `3ea889a2`. |
| 10:47 | **Merged** as `4538d7b0`, deployed 10:48:24. |
| 10:49:01 | Sweep ran clean and reported. `CRON FAILED` count: **0**. |

#### The defect

```js
const [rows] = await db.sequelize.query(`…`, {
  type: db.Sequelize.QueryTypes.SELECT,   // returns the ROW ARRAY directly
});
```

Under `QueryTypes.SELECT`, Sequelize resolves to the array **itself**, not the
`[results, metadata]` pair. The destructuring bound the **first row object**. It is truthy and has
no `.length`, so `rows.length === 0` was `undefined === 0` → false — **the guard I wrote to catch
an empty result is what waved the bad value through** — and `for...of` threw.

Every other sweep in that file (~254, ~316, ~389, ~506) assigns without destructuring. This one
broke the local convention and nothing caught it.

#### ⛔ Why the test suite passed a function that could not run

**Every assertion in `test/review-hold-alert.test.js` was a claim about SOURCE TEXT.** It read the
file, stripped comments and ran regexes. **Nothing ever executed the sweep**, so the return shape
was never exercised. Eleven confident green checks against code that threw on its first real tick.

The fix deliberately did **not** add a mock of `sequelize.query` — a mock returning `[rows, meta]`
would have asserted the wrong assumption straight back. Instead !575 adds:

1. **A census** over all of `cronTasks.js`: no `QueryTypes.SELECT` result may be destructured,
   anywhere. **It fails if it matches zero SELECTs**, so it cannot pass by finding nothing.
2. **An executable proof** of the JS semantics — binds the first row, shows it is truthy, shows
   `.length` is `undefined`, asserts the `for...of` actually throws `is not iterable`.

Both verified by deliberate breakage: restoring `const [rows] =` fails the census; the fix passes.

#### Verified working, 10:49:01Z

```
info:  G40-469: 1 review hold(s) unresolved for over 24h
error: REQUIRES ADMIN DECISION - REVIEW HOLD UNRESOLVED:
       order_id: 45865; held_hours: 9419; auth_days_left: 0;
       aasm_state: delivered; gopher_id: null
```

`CRON FAILED` → 0 · alert fired **once**, not per-tick, so the claim-before-send marker works ·
environment back to **Ok**, 0 Severe.

#### ⛔ THE OPEN DEFECT — the query is over-broad. This is the next session's main job.

> ✅ **RESOLVED IN CODE, NOT MERGED — successor session, 2026-09-11 ~12:15Z.**
> **`gopher-backend-api!579`** (`fix/g40-469-review-hold-auth-bound`, commit `0dd5786b`, cut from
> `origin/production` @ `4538d7b0`; target `production` · squash **no** · delete source **no**).
> The merge is the owner's click.
>
> **What it does:** the `held` CTE computes
> `auth_expires_at = COALESCE(payment_auth_expires_at, created_at + AUTHORIZATION_WINDOW_DAYS)` and
> the outer `WHERE` adds `AND auth_expires_at > NOW()`; the email's "days left" now reads that same
> column instead of recomputing `created_at + 7d`. `AUTHORIZATION_WINDOW_DAYS` is imported from
> `helpers/payment_auth_helper` (⚠️ under `exports.CONSTANTS`, not top-level).
>
> **Two deliberate deviations from the direction below, stated loudly:** (1) **no fixed
> `raised_at` ceiling** — a hold is never re-authorised after it is raised, so the auth clock IS the
> exact bound and "14 days" would be a guess at it; (2) **`delivered` is NOT excluded** — a no-show
> hold on an age-restricted order sits at `delivered` with a live auth, and that is the case to
> alert on. 45865 is excluded by its clock (`payment_auth_expires_at` NULL pre-2025-12 → fallback),
> not by its state.
>
> **The production-DB count the paragraph below calls for was answered from CloudWatch instead,
> first-hand:** the 10:49:01Z tick logged `1 review hold(s)` and no `G40-469` line appears on any
> later tick (checked through 12:11Z, allowing the 20-minute lag). 45865 was the entire historical
> population; it has alerted once and its marker row prevents a repeat. Nothing else will surface.
>
> **Proof is executed, not grepped:** new `test/g40-469-review-hold-sweep.db.test.js` runs the REAL
> sweep against a real Postgres (CI's PostGIS service; locally a throwaway `embedded-postgres` on
> 127.0.0.1:55432 — see memory `run-backend-db-tests-locally-with-embedded-postgres`). 14/14; broken
> deliberately twice, 8/14 and 2/14 fail with named assertions. **It caught a defect the first cut
> shipped** — the top-level destructure of `AUTHORIZATION_WINDOW_DAYS` is `undefined` and threw
> `Named replacement ":auth_days" has no entry` on the first executed run, after all 16 source
> checks had passed it. Habit 1 above, vindicated within the hour.
>
> Doc row written: `gopher-dev-handoff/src/content/docs/request/production-flow.md` (as-built,
> committed locally — that repo also carries other sessions' unpushed commits). Jira G40-469 has a
> pointer comment. Full local suite 273/281 with the 8 failures reproduced identically on pristine
> `origin/production` in the same worktree (stale `tz-lookup` install ×6, no PostGIS in the
> throwaway DB ×2); read the `unit-tests` job on !579 for the true count.

**9,419 hours is 392 days.** The sweep exists to catch a hold **inside** the 7-day authorisation
window so a human can act before Stripe lets go. Its first real find was a **thirteen-month-old
`delivered` order with `gopher_id: null` and `auth_days_left: 0`** — the window shut roughly a year
ago. Nothing is at risk on it and no decision remains to be made.

Two faults in the `WHERE` clause, both mine:

- **No upper age bound.** "Older than `REVIEW_HOLD_ALERT_HOURS`" has no ceiling, so the entire
  order history qualifies.
- **No terminal-state exclusion.** `delivered` with a null gopher is not an unresolved hold in any
  sense the ticket means.

**Direction, not a decision:** something like `AND raised_at > now() - interval '14 days'` plus
excluding terminal states. ⚠️ **The ceiling is a product judgement and is the owner's**, and
sizing it needs a count of matching historical rows — a **production DB** question, which is owner
access, not something to work around.

⚠️ **The alert already sent for 45865 is noise, and noise is the failure mode that matters here.**
An alert that cries about 2025 teaches its reader to ignore the one that matters. The marker row
means it will not repeat for that order, but other historical rows may surface on later ticks.

**Deliberately not fixed in the originating session** — owner's call, recorded rather than
bolted on after a night that had already produced one shipped defect in ninety minutes.

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
| 1 | ~~Merge !573~~ ~~confirm the deploy~~ **BOTH DONE** — see §3 for the arc | — | Live, verified in CloudWatch at 10:49:01Z. |
| 1b | ~~Bound the review-hold query~~ **BUILT — `gopher-backend-api!579`, NOT merged** | **John** (merge click) | Bound is the authorisation clock, not a fixed ceiling; `delivered` kept. Count answered from CloudWatch: 45865 was the only row. See §3. |
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
   the bad claim came from testing
   `queryGenerator.updateQuery` — the low-level SQL generator — instead of `Model.update`, which
   normalises values first. Wrong layer. **Do not "fix" healthy call sites** — the same pattern
   lives in `cost_adjustment.js` and `update.js`, which are payments paths, and a drive-by change
   on a false alarm is the real risk. Memory entry rewritten.

   ⛔ **PROVENANCE — read this before citing any number in support of the retraction.**
   Corrected 2026-09-11 after the G40-304 session challenged the chain, and the challenge proved
   larger than either of us thought:

   | Claim | Status |
   |---|---|
   | `reminder_autopay_senton` holds **1,239** non-null timestamps | **INHERITED.** Not measured in this session. Sole source: a code comment at `middleware/cronTasks.js:1127`, committed **`117cc6ce`, 2026-08-16**, whose own latest data point is **2026-08-14**. |
   | `1,241` non-null, most recent **2026-09-09 05:57**, against 64,274 total orders | **A SECOND, LATER SOURCE — not a copy of the comment.** Its most-recent data point post-dates the comment's by 25 days, so it cannot have been read off it. Self-described as a direct measurement, carried in memory `sequelize-now-is-a-type-not-a-value`. **Unconfirmed and not re-runnable from either session** — neither of us has DB access from here, and neither worked around it. |
   | `orders.updated_at IS NULL` = 0, column is NOT NULL | **INHERITED**, same 2026-08-16 comment. **NOT provable from the repo** — `models/orders.model.js:80-82` declares only `updated_at: { type: 'TIMESTAMP' }` with **no `allowNull`**. Confirming it needs the production DB. |
   | `updated_at` is a raw-string `'TIMESTAMP'` column | **VERIFIED first-hand** 2026-09-11, `models/orders.model.js:81`. |
   | The mechanism (wrong layer: `queryGenerator.updateQuery` vs `Model.update`) | **The strongest part, and it needs no count** — it is checkable by reading either layer. |

   **Two drafts of this document got this wrong in opposite directions, and the second error is
   the instructive one.** Draft 1 said "two independent counts hours apart" — false; neither
   session ran a query. Draft 2 said "neither of us measured anything" — **also false, and worse**,
   because it quietly promoted an unverified claim to a disproven one. The 1,241 figure is a real,
   distinct, later source that simply cannot be re-run from here.

   **The safe formulation is: ONE unconfirmed measurement, plus one 25-day-old comment — not two
   independent counts, and not zero.** What neither session did is measure anything *in these
   sessions*. If anyone wants certainty, re-running it is a **production DB** access item for the
   owner, not something to work around.

   ⛔ **The systemic finding, which matters more than the bug.** Commit `117cc6ce` (2026-08-16) is
   titled *"Correct a wrong explanation I shipped: Sequelize.NOW is NOT broken."* **The correction
   already existed in the codebase, with the right root cause, 25 days before three sessions
   independently re-derived the false claim on 2026-09-10 and shipped it into two more production
   comments.** The comment was doing its job — it was simply never read. A correction buried at
   line 1127 of a 1,200-line cron file does not defend itself. That is the argument for fixing the
   two sites in §5 item 7 rather than leaving a third generation of this to be re-derived in
   October.

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
5. **"There is a real unresolved review hold on a live authorisation right now" — FALSE.** Said
   while the cron was failing, reasoning: *it throws only when rows exist, therefore something
   qualifies.* That step was sound. The next one — *therefore something is at risk* — was never
   supported, and order 45865 disproved it (`auth_days_left: 0`, `delivered`, 392 days old). Same
   shape as the other errors here: a correct inference followed by an unearned extension of it.

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
