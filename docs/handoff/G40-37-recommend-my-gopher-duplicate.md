# G40-37 — Recommend MY Gopher: duplicate inbox entries

> **STATUS 2026-08-11 — ✅ LIVE ON PRODUCTION.**
> **[MR !264](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/264)** merged by the
> owner as **`da899765`**, carrying **`db49ec24`** — **not squashed, so that SHA stays citable.**
> Deployed by `gopher-prod-codepipeline` (Source + Deploy both Succeeded);
> `Gopher-Production` is **Ready / Green** on version label
> `code-pipeline-1786476331530-da899765524dc5c686990766c1c07d4aee42b7c9`.
>
> **Verified by content on the running instance, not by a green pipeline** — the two are different
> claims. On the live box: `already_recommended_gopher_ids` present (3 hits), the 409 string present,
> **`referral_telephones.forEach` gone (0 hits)**, `max(im.id)` present in `inbox_message.js`, and the
> node process restarted with the deploy. ⚠️ EB **replaced the instance** during the rollout —
> `i-046f082ea01bf9475` → `i-0a17f8a5ff2cb1be9`; a stale instance id fails with
> `InvalidInstanceId … not in a valid state`, so re-read it from
> `describe-environment-resources` before any post-deploy check.
>
> **Owner direction 2026-08-11: go-forward only** — existing duplicate rows are deliberately left
> alone, so the 870 people currently affected keep their inboxes exactly as they are and the pile
> simply stops growing.
>
> **Two corrections to the spec below were found by reading the live code** — see
> [§ Built](#built--2026-08-11); the sections above are the original spec and one of its claims is
> now known to be unbuildable as written.

**Jira:** G40-37 (Bug, Low) · Components **Gopher App (Requestor)** + **Gopher Go App** · Label `request`
**Assignee:** John Newbury
**Corrected name (John):** this is a **"Recommend MY Gopher"** ticket (not "Refer"). MY Gopher
recommendations **do not expire**; a **declined** recommendation **may be sent again**.
**Surface:** legacy backend `gopher-backend-api`; go-forward front-end recommend surface is a stub (see bottom).
**Scope:** BACKEND fix (referral persistence + inbox). Per `Final/CLAUDE.md`, persistence/matching is
developer-only — no code written here. This is a red-carpet spec with the exact fix already present in a
sibling controller. **No open questions.**

---

## TL;DR

When a customer recommends a MY Gopher to someone, the recommendation can show up in the **referee's
inbox multiple times**. Root cause: the **Recommend MY Gopher** endpoint creates a `refer_favorites`
row **every time with no dedup**, and the referee's inbox renders **one message per row**. The
**identical "already sent" guard already exists** in the sibling generic-referrals endpoint and the
**mobile client already handles the 409** — it was simply never wired into the Recommend-MY-Gopher
path. Bring the guard over (keyed on `refer_favorites` so declined recs can be re-sent) and collapse
existing duplicate rows.

**Answer to "does this logic already exist?" — Partially.** It exists for `POST /referrals`
(`controllers/common/referrals.js`), **not** for `POST /refer-favorite`
(`controllers/common/fav_gopher.js`). The client expects it for both.

---

## Root cause (exact locations)

**1. The referee's inbox = one message per `refer_favorites` row.**
`controllers/user/inbox_message.js:166-169`:
```sql
from refer_favorites rf
join users u ON rf.referrer_id = u.id
LEFT JOIN images i ON rf.referrer_id = CAST(i.imageable_id AS int) AND i.imageable_type='User'
where rf.referred_to_id = :user_id and rf.completed_action is not true and 1 = :conditional
```
So **N rows → N inbox messages.** (Secondary latent risk: the `images` LEFT JOIN fans out a single
referral into multiple inbox rows if a referrer ever has >1 `User` image. Profile-photo updates
delete-then-insert today, so normally 1 image — but the join is not `DISTINCT`, so it's fragile.)

**2. `refer_favorite_gopher` creates a row unconditionally — no dedup.**
`controllers/common/fav_gopher.js` calls `db.referFavorite.create(...)` at **4 sites** with no
"already recommended?" check:
- `:295` — recommend to a **phone** (main ticket path)
- `:383` — recommend to an **email** (main ticket path)
- `:476`, `:496` — `refer_yourself` (worker self-referral; same table/inbox, same duplication risk)

The only guard present (`existance_refferal = db.invites.findOne({ telephone, referrer_id })` at
`:282` / `:371`) protects **only the marketing SMS/email invite for non-app users** — it does **not**
gate `referFavorite.create`, and it never throws. The `refer_favorites` table has **no unique
constraint** (`models/refer_favorite.model.js`), and there is **no dedup branch** in git history.

**3. The fix already exists next door.** `controllers/common/referrals.js:80-84` and `:120-124`
throw `409 "Referrals have already been sent."` when a prior invite exists. The customer mobile app
already catches exactly this: `src/component/referInputMobile.js:96-97` handles
`"This number has already been sent a referral link."` / `"Referrals have already been sent."` and
shows the "already sent" state (`refer_sms_failed`). **The Recommend-MY-Gopher endpoint just never
emits it.**

---

## The fix (backend)

### 1. Add a dedup guard in `fav_gopher.js` before each `referFavorite.create` (`:295`, `:383`, and the `refer_yourself` sites `:476`/`:496`)
Dedup against **`refer_favorites`** (the inbox source), NOT `invites` — because the rule depends on
the recommendation's *status*, which lives on `refer_favorites`:

- Look for an **active** existing recommendation matching **(referrer_id = sender, recipient, and the
  same MY Gopher)** where recipient = `referred_to_id` (app user) or `ref_to_contact` (phone/email),
  and the row is still active: `completed_action IS NOT TRUE` **and** the gopher is **not** in
  `denied_gophers` (i.e., not declined).
- **If an active match exists for a gopher → do not create a second row, do not send inbox/push/socket
  for it.** If *every* selected gopher is already active for that recipient, throw
  `409 "Referrals have already been sent."` (reuse the exact string — the client already handles it).
- **Declined or completed → allowed to re-send** (recs don't expire; a declined gopher is eligible
  again — John confirmed).
- A recommendation can include **multiple gophers**; dedup **per gopher**, submit the genuinely-new
  ones, and only 409 when nothing new remains.

> Note: don't copy the sibling's `numbers.length === 1` limitation from `referrals.js:80` — that lets
> batch sends bypass the guard. Dedup each recipient/gopher independently.

### 2. Make the inbox query duplicate-proof (defense-in-depth)
In `inbox_message.js:166`, guarantee one row per referral: `SELECT DISTINCT ON (rf.id) …` (or collapse
the `images` join to a single image via a correlated subquery / `MAX(i.id)`), so even legacy duplicate
rows or a multi-image referrer can't render the same recommendation twice.

### 3. One-time cleanup of existing duplicates
Migration/script to collapse existing **active** duplicate `refer_favorites` (same
`referrer_id` + recipient + overlapping `referred_gopher_ids`, `completed_action IS NOT TRUE`, not
declined) down to a single row, so currently-affected referees stop seeing multiples.

---

## Acceptance / QA

- Recommend the same MY Gopher to the same person twice → referee's inbox shows it **once**; the second
  send returns `409 "Referrals have already been sent."` and the app shows the "already sent" alert.
- Recommend **Gopher A + Gopher B**, where only A was already sent to that person → **B is submitted**,
  A is skipped; no duplicate A in the inbox.
- Referee **declines** a recommendation → the customer **can send it again**, and it reappears (recs
  don't expire).
- Existing affected referees: after the cleanup migration, duplicate inbox entries collapse to one.
- Regression: generic `POST /referrals` behavior unchanged; `refer_yourself` no longer duplicates.

---

## Front-end status — Rule 12 sync DONE 2026-08-11

> ⚠️ **Corrected 2026-08-11.** An earlier version of this section said *"Request has no
> recommend-a-favorite surface yet."* **That is now false** — `Final/gopher-request.html` has one
> (`Recommend MY Gophers`, ~L26362, module ~L26498, reading the canonical store via
> `window.__getMyGophers`). Re-checked by grep rather than carried forward.

The Recommend-MY-Gopher surfaces in the new build are still **stubs** — none of them sends anything
real yet. Under **Rule 12** the contract is therefore *recorded on the stub* rather than implemented,
so whoever wires it up builds against the behaviour that is already live:

| Surface | Has the screen? | Action taken |
|---|---|---|
| **Connect** `Final/gopher-connect.html` | yes (`openRecommendModal`) | **contract comment added** above the module |
| **Request** `Final/gopher-request.html` | yes (`Recommend MY Gophers`) | **contract comment added** above the module |
| **Go** `Final/gopher-go.html` | **no** — Refer & Earn tiles only, no recommend path | nothing to annotate |
| **App prototypes** `_prototypes/Go`, `_prototypes/Request` | **no** — zero matches | nothing to annotate |

**The contract propagated** (only what shipped — the "great minds" copy is deliberately excluded and
marked do-not-pre-build):

- A MY Gopher already unactioned in that recipient's inbox is **not** sent again.
- Dedup is **per gopher**: a mixed selection submits the genuinely-new ones and returns success.
  **Say nothing about the filtered ones** (owner ruling — the intent was that the Gopher got
  recommended, and it did).
- When **nothing** is new: `409 "Referrals have already been sent."` → render the standard
  "already sent" state, **not** a generic error. Match the string exactly.
- Declined or completed recommendations may be sent again; recommendations do not expire.

All inline scripts in both edited files re-parsed clean (13 and 18 blocks, 0 failures).

⚠️ **Still outstanding on the app side** (needs a store release, not covered here): two of the four
sending surfaces in the **shipped** apps — `referGophercontactList.js` / `referGopheremailList.js` —
`Sentry.captureException` and show a generic failure instead of matching the 409 string. Only
`referInputMobile` / `referInputEmail` render "already sent" correctly today.

---

## Vocabulary — fixed by the owner 2026-08-11. Use these words.

**Three parties, named by the owner 2026-08-11.** Use these words — earlier drafts of this doc called
two different people "the referral", which is how the rule below got misread.

| Party | Who | Column |
|---|---|---|
| **Requester** | the user-customer doing the recommending | `refer_favorites.referrer_id` |
| **The referred party** | the person it is sent to — **may or may not be a user** | `referred_to_id` when they have an account; `ref_to_contact` / `ref_to_email` when they do not |
| **The gopher** | the user-worker being recommended | `referred_gopher_ids` |

"**Referral**" is the *credit record*, never a person: `invites` (pending) → `referrals` (converted).

### The rule (owner)

- **If the referred party IS a user** → they get the inbox notification, and it is **not** a referral.
- **If the referred party is NOT a user** → it counts **also** as a referral.

**First clause, verified 2026-08-11: implemented.** `createInvite` is reachable only in the non-user
branch, so a referred party who already has an account never earns referral credit.

**Second clause: the `invites` row is written. Whether it can complete is under review with the
owner** — see *Referral attribution* below for exactly what was traced.

---

## Built — 2026-08-11

**Branch:** `fix/g40-37-recommend-my-gopher-dedup` · **base:** `origin/production` (GitLab
`gopher-backend-api`) · **not merged, not deployed.** Verified against the live code, not inherited
from the spec above.

### The canonical rule

A MY Gopher **already sitting unactioned in that person's inbox** is not sent again. "Already
recommended" = an **active** `refer_favorites` row (`completed_action IS NOT TRUE`) from this
referrer to this recipient that carries the gopher and has **not** been declined. Dedup is **per
gopher**: recommending A+B to someone who already has A pending submits **B alone**. When nothing
is new for anyone in the request, the endpoint throws
**`409 "Referrals have already been sent."`** — the exact string `referrals.js` already throws and
both apps already match on. **Declined or completed recommendations may be sent again**;
recommendations do not expire.

### Two corrections to the spec above

**1. ⛔ The 409 could not have worked as specified — the fix had to change the loop shape first.**
The spec says to "throw `409`" inside `refer_favorite_gopher`. Both recipient loops were
`forEach(async …)`, which does **not** await: `res.send({ success: true })` at the end of the
handler ran **before any recipient was processed**, and anything thrown inside the callback became
an **unhandled rejection** — outside the reach of the surrounding `try/catch`. A 409 thrown there
would have been silently discarded and the client still told it succeeded. Demonstrated, not
assumed, with a standalone repro of the same control flow. Both loops are now sequential indexed
loops (`for...of` is banned by the eslint config; indexed is the repo's own convention, cf.
`helpers/trustshield_files.js`), each iteration wrapped in its own `try/catch` so **one bad
recipient in a contact-list batch cannot sink the rest** — the tolerance the fire-and-forget shape
had by accident. That matters because `referGophercontactList.js` / `referGopheremailList.js` post
a whole selected address book in **one** request; only `referInputMobile`/`referInputEmail` send one
at a time.

**2. The spec's four `referFavorite.create` sites are not four sites to fix — two of them are in a
dead endpoint.** Line numbers had drifted (`:295/:383/:476/:496` → `:377/:465/:558/:581`), and the
last two are inside **`send_refer_yourself`** (`POST /refer_yourself`), which has **no client
caller** — verified across tracked files in both mobile apps and the admin front end. Both apps'
"Refer Yourself" rides `POST /refer-favorite` with `refer_yourself: true` in the body, i.e. the same
`refer_favorite_gopher` handler that was fixed, so **Refer Yourself is covered**. `send_refer_yourself`
was left untouched: changing an endpoint nothing calls is risk without benefit. **Flagged as a
separate question — is it dead code to remove?**

### Also fixed, defence-in-depth

`inbox_message.js` joined `images` on `referrer_id` alone, so a referrer with more than one `User`
image fanned **one** recommendation into **one message per image**, and the enclosing `UNION` could
not collapse them because `profile_image` differed per row. The join is now pinned to a single image
(`max(id)`). Latent today — profile updates delete-then-insert — and cheap to close.

### Evidence

- **New suite** `test/g40-37-recommend-my-gopher-dedup.test.js` — 21 assertions, all passing.
  Run as a **negative control against the pre-fix file: 14 of 21 fail**, including
  `res.send was never called — {"success":true}`, which is the `forEach(async)` defect caught
  directly. Covers: nothing-sent-yet, partial overlap, full overlap → 409 with **no** success
  response, declined-is-re-sendable, the `completed_action IS NULL` case, and the email path.
- Full backend suite: **53 suites / 428 assertions, all passing.**
- `npx eslint .` back to the **pre-change baseline** (measured on a clean `origin/production`
  worktree: 1 pre-existing `@sentry/node` resolution error, 0 others). Prettier clean using the
  repo's pinned **2.8.8** — note that a stray `npx prettier` pulls **3.x**, which reformats the
  whole file and buries the change in a 450-line diff.
- The substantive diff is **~150 lines**; the rest of the file diff is pure re-indentation from
  wrapping the loop bodies. **Review with `git diff -w`.**

### Deployment reality

**Backend-only. No app release required** — the 409 contract is already handled by the shipped
apps, so the fix reaches users the moment it merges. ⚠️ **`origin` (GitLab) is the live production
branch; the GitHub mirror `github/production` was a day stale** when this was built (`77dc872b` vs
`0bee3529`) and is an ancestor of it. Branch from GitLab.

### Known, accepted, and not fixed here

- **Batch surfaces show a generic failure on the 409, not "already sent."**
  `referGophercontactList.js` / `referGopheremailList.js` `Sentry.captureException` and set
  `refer_failed`; only `referInputMobile`/`referInputEmail` match the string. Same behaviour as the
  sibling `POST /referrals` endpoint, so this is not a regression — but the copy is wrong on those
  two screens and fixing it is an **app change** (store release).
- **A gopher the recipient already ACCEPTED, on a row still active for other gophers, is treated as
  a duplicate and blocked.** That follows the spec's "active and not denied" wording and errs
  toward fewer inbox messages. Once the row completes, they become re-sendable. Raise it if the
  other reading is wanted.

### ⏸ FOLLOW-UP — accepted recommendations should also stop, with warmer copy (owner ruling 2026-08-11)

**Found by the owner testing the live fix**, 2026-08-11, ~4:00pm ET. He re-recommended Gopher Inc
(31677) from his own account to Test TrustShield (141548) and got no "already sent". **That was
correct behaviour, not a miss** — verified in the data: the prior row `32113` carried
`accepted_gophers = {31677}` and `completed_action = true`, so the recommendation was settled and
therefore re-sendable under the locked rule (*recommendations do not expire; a declined one may be
sent again*). His new send created row `32116`.

**The gap the rule never covered: what happens when the friend ACCEPTED.** Re-recommending a Gopher
the friend has already added produces a fresh inbox message for a Gopher already in their MY Gophers.
Nothing is achieved by it.

**Owner ruling 2026-08-11.** Stop it, and say something better than an error. Copy, his words:

> "**… has already been recommended to that user. Great minds…**"

The current `409 "Referrals have already been sent."` is a **failure-shaped message for something
that is not a failure**; this replaces it.

**Privacy — raised and settled.** I flagged that naming what the friend has in their MY Gophers turns
the endpoint into an enumeration oracle: anyone with a phone number could probe Gophers one at a time
and reconstruct that person's saved-worker list. **Owner: no privacy issue with this wording**, and
the wording he chose is in fact narrower than the concern — it speaks to *a recommendation existing*,
not to the contents of their MY Gophers. Recorded as decided; do not re-raise.

**Scope — and the one thing that must NOT change.** The block stays keyed to **the same requester**:
A is stopped because *A* already recommended that Gopher to B, whether it is pending **or accepted**.
It must **not** widen to "anyone recommended this Gopher to B" — two different requesters recommending
the same Gopher to the same friend is legitimate, and was **proven working on live production** the
same day (rows `32111`/`32112` to `+18055550199`, and `32113`/`32115` to `141548`, from different
requesters, all correctly allowed).

**Which states trigger the note (owner-confirmed 2026-08-11):**

| That Gopher, for that friend, from the same requester | Behaviour |
|---|---|
| **Pending** — unactioned in their inbox | blocked, note shown *(already live)* |
| **Saved** — accepted into their MY Gophers | blocked, note shown **← the new part** |
| **Declined** | sends again, unchanged |

**Partial sends stay silent — owner ruling 2026-08-11.** When a selection mixes already-recommended
Gophers with new ones, the new ones are sent and **nothing is said about the filtered ones**. Owner's
reasoning, and it is the right test to apply to copy like this: *"The user's intent was to make sure
the gopher was recommended… and they were, so all is good. They don't need to know they were beat to
the punch."* The note therefore appears **only when nothing remains to send**. ⚠️ This is also what
made the owner's first live test look like a failure — with *Select All*, one un-recommended Gopher
is enough to produce a normal success.

**Ships in two halves.** The shipped apps match on the literal string `"Referrals have already been
sent."`, so the new copy needs a **distinguishable reason code** on the response plus an app release
to render it. Backend can carry the reason immediately while older apps keep showing the legacy
string; the copy lands with the next store release, naturally alongside the batch-surface fix below.

### ⏸ Referral attribution — built for EMAIL, missing for SMS (NOT a G40-37 fix)

Using A/B/C as the owner framed it: **A** is the requester recommending, **B** is the friend it is
sent to (may or may not be a user), **C** is the MY Gopher being recommended.

> ⚠️ **An earlier draft of this section claimed A can never be credited when B signs up. That was
> wrong** — written after grepping `controllers/user/auth.js` alone. Corrected 2026-08-11 after the
> owner pushed back. The conversion path exists and is automatic; it is **email-only**.

**How B's signup credits A today — with no code typed by anyone.** On the signup screen, when B
leaves the **email** field, the app POSTs it to `/referral`
(`gopher-mobile-request/src/component/textElement.js:85-101`). `get_referral_by_email`
(`controllers/common/referrals.js:298`) looks that address up in `invites`, and if A invited it,
returns `GOPHER<A's id>`. The app stores it in `localStorage.referralCode`, which feeds signup, and
`auth.js` (~L404) writes the `referrals` row. **A is credited automatically.**

**The gap is the phone channel.** There is **no `get_referral_by_phone`** — the lookup is bound to
`name === "email"` on the client and to the `email` column on the server. So when B was invited by
**SMS**, nothing resolves a code, no `referrals` row is written, and **A is never credited.** The SMS
body carries no code either (bare `https://gophergo.io/`), so there is no fallback. Not specific to
Recommend MY Gopher: `controllers/common/referrals.js` sends a near-identical codeless SMS, so the
whole SMS referral channel has it.

**Why it lands hardest here:** Recommend MY Gopher is predominantly an SMS flow — two of its four
sending options are SMS, and SMS is the channel that reaches people who do not yet have an account,
which is exactly the population the owner's rule is about.

**Second-order effect, and the visible one:** `get_referrals` drops an invite from the pending list
only once a matching `referrals` row exists. An SMS invite can never produce one, so it stays
**pending forever** — including after B signs up and starts ordering. The pending list only grows;
the credited list under-counts by whatever share of referral volume went out over SMS.

**Still not verified:** what the Refer App QR encodes. That is the other plausible attribution route
and should be traced before the phone fix is designed.

### 🔴 SECURITY, found in the same file — unauthenticated SQL injection

`get_referral_by_email` interpolates the request body straight into SQL:

```js
query: `select referrer_id from invites where email not in (...) and LOWER(email) =LOWER('${req.body.email}') order by id`
```

`req.body.email` is **not escaped or parameterised**, and `router.post('/referral', ...)`
(`routes/common.routes.js:45`) is one of the few routes in that block carrying **no
`middleware.user_auth`** — it has to be callable before signup. So it is reachable by anyone with no
account.

The registered-email check just above it uses Sequelize escaping correctly, so this is a lone
inconsistency rather than a pattern — and that check does not blunt an attack, because an injection
payload is not a registered address and falls straight through to the vulnerable query.

**The fix is small** (bind it as a replacement, like its siblings), but it is a security change on a
public endpoint and belongs in its own ticket with its own owner decision — not folded into G40-37.

### ⏸ Still open — the one-time cleanup, and why it was NOT written

Rows already duplicated in `refer_favorites` still render multiple inbox messages for the people
affected today; the guard only stops **new** ones. The cleanup was deliberately held back rather
than written blind: **it mutates production data, and nobody here has looked at that data.** Writing
a data migration against a table whose duplicate shape and volume are unmeasured is the exact
"confident wrong answer" the pause-and-wait rule exists to prevent, and it is the least reversible
part of this ticket.

**What unblocks it: read-only access to the production database** (or the owner running this and
pasting the result). It is a `SELECT`, it changes nothing:

```sql
-- How many active recommendations are duplicated, and for how many people?
SELECT count(*)                                   AS duplicate_groups,
       count(DISTINCT referrer_id)                AS affected_referrers,
       count(DISTINCT coalesce(referred_to_id::text, ref_to_contact, ref_to_email))
                                                  AS affected_recipients,
       sum(rows_in_group - 1)                     AS redundant_rows
FROM (
  SELECT referrer_id,
         referred_to_id,
         ref_to_contact,
         ref_to_email,
         count(*) AS rows_in_group
  FROM refer_favorites
  WHERE completed_action IS NOT TRUE
  GROUP BY referrer_id, referred_to_id, ref_to_contact, ref_to_email
  HAVING count(*) > 1
) g;
```

The intended shape once the numbers are known: keep the **oldest** active row per
(referrer, recipient); trim gopher ids already covered by it out of the newer rows; a newer row left
with nothing gets `completed_action = true` rather than being deleted, so the cleanup drops the
inbox message without destroying the record. **`down()` cannot restore trimmed arrays** — that
needs to be said out loud before it runs.
