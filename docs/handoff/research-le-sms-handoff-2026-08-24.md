# Research / L&E recruitment + SMS deliverability — session handoff 2026-08-24

**Transcript:** `9f8eb622-0340-40c4-bfed-c1e68d0a4d03.jsonl`
(`~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/`)

**Grep anchors:** `fcm_token` · `9491df73` · `f947f7e1` · `!280` · `!281` · `SMS-G-NEV` ·
`rewards.gophergo.io/o?t=` · `21610` · `30003` · `order 64420` · `sms_state` ·
`+19123035002` · `gopher_code` · `TOPUP 1 - Requesters` · `SMS 3 - REMAINING`

---

## What this session was

Two workstreams that turned out to be one. **(A)** Recruit a Gopher audience into L&E
Research's paid tobacco study — build the opt-in portal, write and send the outreach across
email / in-app / SMS. **(B)** The SMS half surfaced a production bug that had been silently
halving *every* SMS campaign ever sent from the admin panel, which then consumed most of the
session.

---

## State of play

### DONE and verified

- **Campaign fully sent, all three channels.** Email 887 (257 opened, 31 clicked) · in-app
  7,700 (88 opened, 1.14%) · **SMS 4,083 unique people** (requesters 509 · gophers-with-
  activity 473 · gophers-never-worked 3,101). ~3,251 delivered, ~$32 spend. Verified by
  Twilio Insights and per-message log, not inferred.
- **`fcm_token` gate fixed** — `9491df73`, MR !280, merge `f947f7e1`. **Verified live** by
  reading `origin/production:controllers/admin.controller.js`: the SMS branch now reads
  `if (notificationData.send_via_sms) { if (!data.telephone) { skipped_no_phone += 1; return; }`.
  Post-deploy proof was behavioural: a 50-message test returned **exactly 50** (was ~41%).
- **CI fix** `!281` (Jira session's, I only diagnosed it) — merged, `57b7dc51`. Pipeline
  `2757640314` green with **all four security guards executing**; they had been skipped on
  every production merge since `0f61a420`.
- **Inbound webhook fixed by the owner.** Texting the number now returns *"This is an
  unmonitored number. Please contact support@gophergo.io…"* instead of Twilio's
  `Configure your number's SMS URL` placeholder. Verified by live text.
- **`rewards.gophergo.io` portal** live on Netlify, `/opportunities/`, token pass-through
  working (`/o?t=X` → `/opportunities/?t=X` → Qualtrics `gopher_code=GP-X`).

### DONE but NOT verified by me

- **Brett confirmed `gopher_code` was unnecessary** because Gopher was the only audience for
  that survey. **Inherited from the owner, not seen by me.** Consequence: total recruits are
  attributable, but the **per-channel breakdown is permanently lost** — you cannot tell whether
  email, SMS or in-app produced recruits. If there is a second study, capture the token from
  day one.

### IN FLIGHT

- **Waiting on Brett for the recruit count.** This is the only measurement of whether the
  pilot worked and the only basis for invoicing at $30/head.
- **SMS suppression work — assigned to this session by the owner on 8/17, now unowned.**
  Scoped, not started. See "What I'd do next".

### NOT STARTED — ⚠️ SUPERSEDED SAME DAY (2026-08-24), read this instead

- ~~Status-callback webhook~~ → **BUILT.** `gopher-backend-api` `a04299fb` on
  `feat/sms-status-callback`. Reuses `middleware/twilioWebhook.js`, already live on
  production, so **no new credential and no restart**.
- ~~Deactivations-feed ingest~~ → **BUILT.** `491767a6` on `feat/deactivations-feed-ingest`.
  ⚠️ **BOTH ARE UNPUSHED AND UNMERGED**, and they are **stacked** — both amend
  `test/sms-state-columns.test.js`, so the ingest lands first or they go as one MR.
  A branch push deploys nothing; only an MR merge to `production` auto-deploys.
  Design + the decisions that outlive the branches:
  **`docs/handoff/sms-dead-number-detection.md`**.
- **Portal expiry — still `live: true`, and deliberately so.** Owner decided 8/24: take it
  down **on 8/28**, after the 8/27 groups. Flipping it early would arm a takedown while the
  study is still recruiting, because `dist/` ships whenever John next drags it to Netlify.
  **Dry-run verified 8/24 in a scratch copy** — `build_portal.py` hides the card, strips the
  Qualtrics URL (0 references survive into `dist/`), and the owner-chosen empty state renders:
  *"Nothing open right now — we'll let you know as soon as something is."*
  The takedown is **conditional on Brett**: if the screener keeps recruiting past 8/27, hold it.

---

## Deployed?

Verified **by content**, per the standing rule (`merge-base --is-ancestor` is invalid for a
feature commit against `main`, though it *is* valid here because these are backend MRs merged
into `production`, which shares history):

| Thing | State | How verified |
|---|---|---|
| `fcm_token` fix | **live** | read the gate out of `origin/production`; 50-of-50 behavioural test |
| CI negative-control fix | **live** | pipeline `2757640314`, all 6 jobs `success` |
| `sms_state` columns | **live** (`b3e01b0f`) | read `origin/production:models/users_roles.model.js` — 4 columns present |
| Inbound webhook | **live** | live text returned the branded reply |
| Portal | **live** | `curl` returned the card + survey URL |

---

## Uncommitted / disk-only files

⚠️ **`Documentation/Research Partnership/` IS NOT A GIT REPO.** Everything below is
disk-only and exists nowhere else. `git status` will never show it.

```
Research Partnership/
  portal/portal.src.html          <- SOURCE. Never hand-edit index.html or dist/
  portal/build_portal.py             (both are generated); dist/ is wiped each build
  portal/assets-b64.json          <- fonts + BOTH logo PNGs live here
  build_scripts_final.py          -> LE-Outreach-Scripts-FINAL.html (the runbook)
  build_email_templates.py        -> LE-Email-{Workers,Requesters}.html
  send-lists/*.csv|.xlsx          <- ⚠️ REAL CUSTOMER EMAILS AND PHONE NUMBERS
  send-lists/_audit/*.csv         <- who received what, per send
```

**Nothing uncommitted in `gopher-backend-api`** (clean). The `Code/` repo has only
pre-existing `.claude/` noise that is not mine.

---

## What I'd do next, in order

1. **Chase Brett for the count.** 3 days to the groups. Nothing else in the pilot matters
   until this lands. **Draft written 8/24 and ready to send:**
   `Documentation/Research Partnership/LE-Brett-Chase-DRAFT-2026-08-24.md`. It asks the
   portal question in the same message, because the 8/28 decision depends on his answer.
   ⚠️ **No mail tool exists in-session and Brett's address is nowhere on disk** — this needs
   John to send it.
2. **Decide the portal card** — expire it, or repoint it if the screener is recruiting for a
   rolling panel rather than the 8/27 session. Ask Brett in the same message.
3. **Status-callback webhook.** Needs no new credential: `lib/sendSms.js` already
   authenticates via `TWILIO_ACCNT_SID` / `TWILIO_AUTH_TOKEN`, the callback is *inbound*, and
   the auth token is what validates the signature. Add `statusCallback` to
   `client.messages.create()`, add a route, validate the signature, write `sms_state`.
   ⚠️ This trips `test/sms-state-columns.test.js` case 6 **by design** — it fails the moment
   any file outside `config/|models/|test/` references `sms_state`. That is the owner's
   "record, don't act yet" ruling enforced in code. Make the channel-split decision explicit
   there; do not delete the case.
4. **Deactivations-feed ingest** — blocked on the owner decision below.
5. **Backfill** historical `21610`/`300xx` from the Messages **REST API**, not the console
   export.

---

## ✅ RESOLVED 2026-08-24 — was an open question, do NOT re-raise

**⛔ OWNER RULING 2026-08-24 — BACKEND CRON. Decided; do not re-raise.**

The deactivations-feed ingest runs as a **backend cron in `gopher-backend-api`**, not as an
HQ-side job. Grounds: the write path and credential handling already exist there, and one
scheduled restart is cheaper than provisioning and guarding a second DB credential against a
login that is currently read-only.

**What this unblocks, and what it still needs:**
1. A **read-only Twilio API key** must be created and added to the Beanstalk environment —
   that is an OWNER action (credential), not a session one.
2. Adding it is a **planned production restart**. Brief, but it must be scheduled by John, not
   taken opportunistically.

**⚠️ This does NOT change the "record, don't act yet" ruling.** The ingest only *marks*
`sms_state`; it must not suppress or reroute any send. That ruling is enforced in code —
`test/sms-state-columns.test.js` case 6 fails the moment any file outside
`config/|models/|test/` references `sms_state`. Do not delete that case to make the ingest
pass; make the channel-split decision explicit there instead.

**Suppressing sends based on the mark is a SEPARATE decision that has not been made.**

---

### (historical) ⛔ OPEN QUESTION FOR JOHN — asked in-session 8/17, still unanswered

**Where does the deactivations-feed ingest run?** Both paths need something from him:

- **Backend cron** — the read-only Twilio key goes into Beanstalk = a **planned production
  restart**.
- **HQ-side job** — ⚠️ **the HQ database credential is READ-ONLY** (`cannot execute UPDATE in
  a read-only transaction`), so it cannot write `sms_state` without a new credential.

My recommendation was **backend cron**: the write path and credential handling already exist
there, and one scheduled restart is cheaper than provisioning and guarding a second DB
credential. *(HQ-session findings, inherited — I verified the schema and the absence of
`StatusCallback`, but not the read-only DB error or the feed measurements.)*

---

## Traps that cost me time

1. **Reasoning from the shape of a failure is not reasoning about its mechanism.** Both SMS
   bursts *ended* on `21610` errors, so I concluded "aborts on blocked user." Wrong — HQ read
   the source: `chunk.map()` initiates every send before any settles, so `Promise.all` cannot
   cancel siblings. What actually settled it was **positional**, from my own data: recipients
   who *did* send occupied **non-contiguous** slots (0, 3, 4, 6, 7, 9…). An abort leaves a
   contiguous prefix; a per-user filter leaves scattered gaps.
2. **`21610` ≠ a new opt-out.** It means Twilio *refused* because the person opted out
   previously. New opt-outs are **inbound STOP messages**. Conflating them makes a campaign
   look far more damaging than it was — the real figure was 53 new STOPs across 4,083
   messages (1.3%), not the 269 pre-existing refusals.
3. **The Twilio console CSV export caps at ~528 rows.** Cost several round trips of
   "is this truncation or a real shortfall?" Use **Messaging Insights** for aggregates (not
   capped) or the **REST API** for per-message. `Export to CSV` opens a page rather than
   downloading; ⌘A/⌘C → TextEdit → save as RTF works, and `textutil -convert txt` parses it.
4. **Intercom merge fields reject inner spaces.** `{{ first_name }}` fails with *"invalid
   message template variable"*; `{{first_name | fallback:"there"}}` passes. An
   `{{unsubscribe_url}}`/`{{unsubscribe_link}}` is **mandatory** in a full-HTML email.
5. **Never put a merge field in a tracking URL.** An unset attribute renders empty and the
   portal then tags every arrival `GP-PREVIEW` — i.e. the invoice basis silently becomes
   test-looking data. Use static per-channel literals.
6. **Send lists were replaced under me mid-flight** (11:56, three minutes before a send) and
   my earlier "yes that's the right file" no longer applied. Re-verify a file at send time,
   not once.
7. **A scratchpad is not storage.** Mine was wiped repeatedly mid-session and I lost cached
   Twilio exports twice. Copy any input you will need again into the workstream folder.

---

## MEMORY.md — nothing owed (verified, not assumed)

Both of this session's memories are written **and already indexed**:

- `MEMORY.md:156` → `admin-panel-sms-fcm-token-gate.md`
- `MEMORY.md:90` → `intercom-html-email-mechanics.md`

`le-pilot-terms-and-panel.md` was also updated in place (campaign completion figures + the
`gopher_code` dependency); it needs no new index line.

⚠️ **`admin-panel-sms-fcm-token-gate.md` carries a correction worth reading before quoting
any opt-out number from it.** The 15.6% opt-out rate among active gophers is **legacy OOA
damage, not campaign-caused** — owner's correction, 8/13. Quoting it as a research-messaging
signal would be wrong.
