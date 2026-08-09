# Session carryover — HQ Dashboard / Deals intake

**Written:** 2026-08-09, end of the Gopher HQ Dashboard session (G40-321).
**For:** the successor session. Read this before doing anything.

---

## 1. ⛔ The rules that matter most — read these first

### PAUSE AND WAIT when access is the blocker. Never work around it.

Owner, verbatim (2026-08-06, hardened 2026-08-08):

> *"NO SESSION is to take the less optimal route, EVER. It is a pause and wait for my attention to
> log in to whatever platform is the block, to create a token, or share my credentials… With no dev
> support on my end, this cannot ever happen again."*

And again on 2026-08-09:

> *"If something would help and I am the one who can help, you ask before looking for a work
> around."*

**This is not best-effort. It is stop-and-ask.** John answers in minutes. On 2026-08-08 a session
lacking Sentry proceeded on a workaround and MR !222 was merged wrong; once asked, a token existed
in five minutes. Later the same day a Sentry token turned a three-hour guess into an answer in
ninety seconds.

**Flagging is not waiting.** A workaround shipped with a caveat attached is still a workaround, and
the caveat gets read past — including by you. This happened twice in one session: a finding was
labelled *"⚠️ n=1, unconfirmed"* in one message and restated as settled fact in the next.

**He can unblock:** Sentry · AWS · GitLab/GitHub tokens · Play & App Store · Appflow · Stripe ·
Netlify · Twilio · SendGrid · Firebase · iDenfy · the production DB · `git push`.

### Access currently available to you

| Access | State | How |
|---|---|---|
| **Sentry** | ✅ working | `~/.sentry-token`, format `SENTRY_AUTH_TOKEN=sntryu_…` — **strip the prefix**, `cat` alone sends it and 401s. Org `gophergo`, projects `gopher-backend-api` and `gopher-mobile-capacitorjs` |
| **AWS / CloudWatch** | ✅ working | `~/bin/aws`. If expired: `BROWSER="open -a 'Google Chrome' %s" ~/bin/aws login` — **ask him, don't work around** |
| **Production DB (read-only)** | ✅ | Aurora reader via the HQ shim's creds on EC2 `18.205.226.141`, key `~/.ssh/gopher-hq2.pem`, run as `sudo -u gopher-hq` |
| **GitLab API** | ✅ | token from `git credential fill` — used to poll pipelines |
| **`git push`** | ⛔ **DENIED** | `.claude/settings.local.json` has `deny: ["Bash(git push*)"]`. **John pushes.** He chose to keep this — it caught two mistakes. Give him the command; don't try to route around it |

### Every merge hand-off states three things, in plain words

**Target branch · squash yes/no · delete source branch yes/no.** Never leave them to MR defaults —
he is the one clicking Merge. Default answer: **squash NO** (SHAs are cited in docs), **delete source
NO** until the deploy is confirmed healthy (the branch is the rollback).

⚠️ **Merge to `production` = deploy.** CodePipeline auto-deploys; there is no second gate. Verified
directly: MR !245 merged and the new code was live and logging at 14:19:28 UTC.

### Other standing rules

- **Docs are truth, not tickets.** Cite the doc; if the doc is silent, that is the bug to fix.
- **No live production changes without the owner.**
- **The Code repo is PUBLIC.** Check for PII before committing.
- **Never create test accounts on a real person's phone number.** See §6.

---

## 2. What shipped today, and what is proven

### Production, verified working

| Commit | What | Proof |
|---|---|---|
| `7cebe356` | **Session platform detection** — the root cause of repeat sign-ins | **Measured: 321 forced re-auth session rows in the 22h before deploy → 0 in the 22h after**, while 154 distinct people signed in normally at 94% OTP consumption. Zero is both the success signal and what an outage looks like — the sign-in check is what distinguishes them. Don't report one without the other. |
| `796f0e8e` | **Confirmed-account re-verify** — the exit from the verify-email loop | ⚠️ **UNPROVEN.** Deployed, never exercised. See §5. |
| `7e86d47` | Users & Access + 5 sidebar sections restored | Live, verified in served bytes |
| `3ff70a6` + `ed9f943` | Sign-in Doctor, then corrected | Live |
| `a2494ae` | Build hardening — a broken module can't ship silently | Runs on every deploy |

### The session fix, in one paragraph

Both mobile apps hardcode `const isWebPlateform = true;` (`src/axios/axios.js:12`), so the API
treated every phone as a browser: 12-hour access tokens, `generate()` invalidating **every** other
session on each refresh, and `user_auth` demanding the caller's token equal the single active
session's token. Together that enforced **one live access token per user+role platform-wide**. The
fix resolves the platform from the mobile config token (`X-Gopher-MCT`) — a build-time secret a
browser cannot forge — instead of asking the client. It also **enforces** the refresh-outlives-access
invariant in code, because production's env vars (`JWT_REFERS_EXP_TIME=10d` vs `JWT_EXP_TIME=30d`)
had silently inverted it and made an earlier fix inert.

---

## 3. Committed, NOT pushed — John must push

| Repo | Branch | Commit | What |
|---|---|---|---|
| gopher-backend-api | `feat/deals-schema` | `758de3f3` | `normal_price >= customer_price` correction |
| Code | `feature/deals-google-maps-audience` | `207c80f`, `d17269d` | The intake build spec + owner review |
| gopher-backend-api | `feat/deals-schema` | — | **Sequelize model `models/deals.model.js` is written but UNCOMMITTED.** Commit it. |

Also unpushed/unmerged from earlier: `46bdc6d7` (OTP lock messaging), `a31d4677`
(`onboarding_complete` flag), `fix/onboarding-relaunch-trap` (requester app — ⚠️ **needs rebase**,
`work/api36` moved under it).

**Waiting on John, not you:** set `JWT_REFERS_EXP_TIME=90d` on Gopher-Production (Configuration →
Software). The code guard overrides it correctly on every mint but logs an error each time.

---

## 4. The Deals build — your main work

**Read `docs/handoff/deals-intake-build-spec.md` first.** It is owner-approved as of 2026-08-09 and
its §9 is your build order. Do not re-derive it.

### The one thing not to get wrong

**This is a user intake that carries a deal, not a lead form.** Submitting creates or links a **real
Gopher user** at submit time. A rejected deal still leaves a marketable Requester. I designed it as
a standalone insert first and was wrong; the spec leads with that correction for a reason.

### State

- ✅ **Schema built and reviewed field-by-field** — `502cd3d2`. No `deals` table existed in
  production before this; verified against `information_schema`, not assumed.
- ✅ **Spec written, owner-reviewed, five changes applied**
- ⬜ Sequelize model — written, uncommitted
- ⬜ Everything else

### ⛔ Gate before the collision branch goes live

Path B's collision handling assumes a phone resolves to at most one account. **It does not** — 775
numbers carry more than one. John owns that cleanup personally (its own session, started
2026-08-09). **The spec's §6 requires confirming with the Total SOW Priorities session before
green-lighting**, not merely the ticket closing.

---

## 5. Open verification loops — do these FIRST, they take minutes

1. **Matt O'Donnell (#141240)** — ask John to have him open the app and tap **Resend**. A second
   `email_otps` row (he has one, from 08-05) proves `796f0e8e`. Currently unproven.
2. **Denis Leite (#74373)** — his session gap. 36h and counting at handoff vs 94 prior intervals at
   ~12h. Another day makes the session fix conclusive.
3. **Sentry `5768381649`** — is it firing on current releases now ingestion is restored? **Jira owns
   this**; coordinate, don't duplicate.

⚠️ **Sentry was blind 2026-07-17 → 2026-08-09** (quota exhausted, `onDemandMaxSpend: 0`). Any
`lastSeen` in that window means *recording stopped*, not *the defect stopped*. Two of my conclusions
died on this.

---

## 6. Collaboration — Gopher Deals → Dashboard Sync

**Reach them with `mcp__ccd_session_mgmt__send_message`, not `SendMessage`** (which only reaches
subagents you spawned). The inbound message header carries their session id.

### The boundary, agreed 2026-08-09

| Theirs | Yours |
|---|---|
| The spec (`deals-registration-to-publication-config.md`) — **it is the contract** | The public intake endpoint |
| The `gopher-deals.html` form: validation, debounce, field integrity | Creating/linking the user + the email OTP step |
| The `gopher-deals.html` repoint | The HQ review surface |
| The three-host cutover (Pages, TigerTech, **Netlify = owner-action only**) | The eligibility endpoint |
| Jira: G40-351, G40-355, G40-357 | The `deals` schema (done) |

**They initially declined the intake endpoint** on the `CLAUDE.md` restriction reserving
Database/persistence and Security logic for a human dev. **John overruled directly and assigned it
to me/you.** That ruling is direct, not relayed — but note the scope text still says otherwise, and
another session may decline again on the same grounds.

### How they work, and why it's worth using

They review properly. Their field-by-field pass on the schema caught a **pricing invariant missing
from their own spec** (`normal_price >= customer_price`) that would have shipped a markup wearing a
discount label, silently. **Send them design artifacts before building.** It has paid off every time.

Open questions with them: none blocking. They confirmed the SP eligibility seam (backend owns the
rule; the nightly bake reports rather than re-derives) and asked to review the union-record schema —
which they have now done.

### Other sessions

- **Total SOW Priorities** — platform-wide priorities and rulings. **Must sign off the collision
  branch.** Relay anything platform-wide.
- **App Prototypes** — the two mobile apps. `work/api36` carries the inbox badge fix (both apps),
  401 sign-out handling, and `safeLocalJSON`, all awaiting an app release.

---

## 7. Traps that cost real time today

- **`users.telephone` is NOT unique**, and auth resolves by phone with no ordering. A deactivated
  admin test account on John's own number told him *"Your account has been deactivated"* while
  account #1 was healthy. **If someone reports that message and their account looks fine, check for
  a second row on the same telephone before anything else.**
- **Timestamps are `timestamp without time zone` holding UTC.** The conversion is the **double**
  `AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'`. A single conversion is silently four hours
  wrong. `serve/db.js` has `ET()` — use it, don't hand-roll.
- **`otps.used = true` does not mean "this code signed them in."** One success flips *every* live
  code for that number.
- **`otp_attempts` holds one mutable row with no history.** An unblock zeroes it, so "not locked
  now" is never evidence they were never locked.
- **`config/db.config.js` is the migration mechanism** — idempotent `CREATE TABLE IF NOT EXISTS`
  applied on boot. There is no `migrations/` dir and no sequelize-cli.
- **CI runs `eslint .` over the whole repo.** Linting only your changed files is how you get a green
  local check and a red pipeline. And **re-lint after your last edit** — I linted, then added an
  export, then committed, and CI caught it.
- **`git checkout -- fileA fileB`** aborts entirely if any pathspec is untracked. Don't suppress its
  stderr.

---

## 8. The failure mode to avoid

Four of my findings were wrong before being caught: Denis's error cause, a `js_order` theory, a
verify-email warning on two accounts, and a breadcrumb mechanism. **Every one was a plausible
mechanism inferred from a partial read and stated more firmly than the data carried.** Every one was
caught by someone checking, not by me hedging.

Two specific habits that would have prevented all four:

1. **Ask what the failure case would look like before claiming success.** `321 → 0` only means
   something because I also asked whether anyone could still sign in. Zero is both signals.
2. **Absence is not evidence.** Zero email-OTPs, zero recent Sentry events — both read as "it's
   fine" when they meant "I can't see." This burned me twice in one day.

---

## 9. Unrelated but open

- **Angela Green (#74542)** — told the app was broken; the truth is 3 orders/month near Powder
  Springs, GA and 2 pending platform-wide. She was given the honest answer. **Not an app bug.**
- **Yonathan Melaku (#140798)** — 3 duplicate orders, all cancelled/expired with zero bids. Whether
  a requester can *see* their own submitted requests was never answered.
- **Task #12** — Kristin Nerton's email, user 119530.
- **`submitted_ip` purge job** — 90-day retention is documented in the schema; nothing deletes it.
- **~60 unpushed/unmerged branches** in gopher-backend-api. Release notes built from merged MRs will
  be wrong.
