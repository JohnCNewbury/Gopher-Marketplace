# Deals — HQ review surface: handoff

**Written:** 2026-08-10, end of the session that shipped merchant intake.
**For:** the session that builds step 5. Read this before touching the Dashboard.

> **State in one line:** merchant registration works end to end in production; the
> submissions have nowhere to be *seen* yet. That is the whole remaining job.

---

## 1. What is already live and proven

Merchant intake is deployed on GitHub Pages and TigerTech, driven end to end in a
real browser against production — **not asserted from a spec**.

| Step | Endpoint | State |
|---|---|---|
| Phone OTP | `POST /api/v1/otp/get` | live |
| Recognise **or** create the user | `POST /api/v1/users/sign_in` | live |
| Save real details (new users) | `PUT /api/v1/users` | live |
| Email OTP | `POST /users/email_otp/send` + `/verify` | live |
| File the deal | `POST /api/v1/users/deals` | live |
| **Review queue** | `GET /api/v1/users/deals/queue` | ⚠️ **merged? check** — MR !254 |

**Five real deals exist** (ids 1–5), three categories, four owners. They are test
data but they are *real rows* — build the queue against them rather than mocks.

### The flow, as the owner ruled it 2026-08-10

- **Existing user** → one SMS OTP. Autofill. **No email OTP** — their address was
  verified when they became a user.
- **New user** → SMS OTP, then an email Verify button **under the email field**,
  parallel to the phone. Not a separate stage.
- **Recognition is the server's job, not the checkbox's.** `sign_in` returns the
  account when it knows the number and creates one when it does not; the
  placeholder address in the response distinguishes them. A merchant who forgets
  to tick "I'm already a Gopher user" is recognised anyway.

---

## 2. The job

1. **Dashboard Deals view reads `/deals/queue`** instead of `MERCHANTS[]` in
   `deals-merchants.js`.
2. **Remove the sample-data banner** (`app_part4.js:256`) — owner directive, now
   that real submissions land.
3. **Remove the fake deals.**
4. **Map shows only real** live / pending / considering rows.
5. **Approve / reject writes through the API**, not `localStorage['gopher_deals_admin']`.
6. **Backfill `deal_code`** for deals 1–5 — they predate the DL-nnnn assignment
   and are currently unnameable.
7. **SP section** — see §4.

---

## 3. ⛔ Traps, each of which has already cost someone time

- **The category is stored as a KEY** (`restaurants` · `favorites` · `age` ·
  `retail`), not a label. The review UI must map key → display name. Showing
  `favorites` to a reviewer is a trap for HQ staff, and the label is *also* the
  bid-board join key, so do not "fix" it by storing labels.
- **`earn_amount` must never reach a reviewer payload** and is deliberately not
  selected by the queue endpoint. It is the provider's own earnings (contract
  §7.2). Do not add it back for convenience.
- **`age` is not a column and must never become one.** It derives from
  `category`. Two sources of truth on whether a 21+ ID check is required fails
  silently — the check simply does not happen.
- **The queue is ordered OLDEST FIRST.** The merchant was promised an activation
  date within *five business days*. Sorting newest-first buries whoever has
  waited longest, which is exactly the person the SLA is about.
- **Approval is a human act.** There is no automatic approval anywhere in this
  pipeline, for either track (SP-PIPE §5). `status` on write is always `pending`.
- **Tagging happens on approval, never at submit.** Until HQ approves, the owner
  is a plain Requester. That is why a rejected deal still leaves a marketable one.

---

## 4. Service Providers — the pre-launch grandfather play

**Owner, 2026-08-10:** a one-time pre-launch play. *"This does NOT change the
standard. The criteria is still the truth."*

⚠️ **It is an OVERRIDE, not a lowered bar**, and the distinction is the whole
point. D-022 already permitted *"Admin may grant eligibility case-by-case"*, so
grandfathering 19 named people is 19 uses of a right that already existed — not a
threshold change. `BAR_JOBS` stays **20**.

Grants are recorded on `users_roles`: `sp_deal_granted / _at / _by / _reason`.
The verdict reports the measured jobs and rating **alongside** the grant plus a
`granted` flag, so a reader can always tell whether someone cleared the bar or
was let in.

### Measured 2026-08-10

| Band | Workers |
|---|---|
| Canon — 20+ service jobs, 4.75★, tiered | **14** |
| Pre-launch candidates — 15+ jobs | **19** |
| Near-miss 5–14 | **15** (13 of them at 5–9) |
| Total outreach list | **34** |

**Still to build:** the pre-launch list view and a button to email eligible +
near-eligible providers.

**✅ DECIDED (owner, 2026-08-10): near-miss is 5–14.** Everything below the
pre-launch bar of 15, so the 2 workers at 11–14 do not fall through a gap.

**⚠️ Copy warning for the email:** 13 of the 15 near-miss providers sit at 5–9
service jobs — a long way from 20. "You're close" would be untrue and they will
feel misled when it does not switch on.

**Worth knowing:** relaxing the *tier* changes nothing — all 19 at 15+ jobs are
already Elite/Elite+. **The job count is the only thing gating this population.**

---

## 5. Where the numbers come from

Eligibility is `helpers/sp_eligibility.js`; the endpoint is
`GET /users/deals/eligibility`. It returns the verdict **and its inputs**, never a
bare boolean, because HQ renders near-miss and would otherwise re-derive the bar.

The classifier reads `orders.category_type` (85% populated) and falls back to a
title heuristic for the ~15% null. **Four cue defects were found and fixed on
2026-08-10** — a prefix bug, a missing `move` stem, a missing `remov` stem, and
`leaf`/`leaves` — every one under-granting, and eligibility held at 14 throughout.
Do not add a cue without running it against production titles first; `mulch` was
tried and removed because its matches were store runs.

⛔ **Delivery / Errand / Ride Sharing are TERMINAL** in that classifier and must
never be re-read from the description. They are 16,596 + 459 orders and the entire
basis of D-022. `Other` is re-read (owner ruling); those three are not. Pinned by
a test.

---

## 6. Test accounts created 2026-08-10

None have real orders. Clean up before launch.

| User | Number | Note |
|---|---|---|
| 141548 | 805-555-7547 | usable, email confirmed |
| 141554 | 805-555-1234 | usable, confirmed — **owner's Path A test, filed deal 5** |
| 141557 | 805-555-0173 | deal 1 |
| 141561 | 805-555-0198 | deal 3 |
| **141564** | 919-555-0142 | **junk — placeholder email, delete** |
| 141568 | 805-555-0211 | deal 4 |

Spare verified-clean numbers: **919-555-0173**, **805-555-0244**.

⚠️ **Signing in on an unknown number CREATES an account.** Every "let me just
check this number" consumes it. That is the same mechanism behind these and behind
the 775 duplicates in G40-359 (deferred to Phase II).

---

## 7. Still open elsewhere

- **`gopher-deals-101.html`** documents the *morning's* flow — an email step after
  "Review my deal". That is no longer true, and it does not mention that existing
  users skip email entirely. **A user-facing change is not done until its 101 is
  reviewed** (owner rule).
- ~~**Netlify**~~ — ✅ **updated by the owner 2026-08-10.** All three hosts now
  carry the wired form, so there is no longer a split where some merchants
  register for real and others post to the dead Sheet.
- ~~**Elastic Beanstalk pruning**~~ — ✅ **CLOSED 2026-08-10.** The account hit
  1000/1000 application versions on 08-08 and **every production deploy failed
  silently for two days** while GitLab showed green — four merges, including a
  fix for 13 typos returning 500s to real users. Cleared to 355/1000 by deleting
  645 pre-2026 DevGopher versions (S3 bundles preserved, production and stage
  untouched), then `MaxCountRule` enabled at 200 on all three applications.
  Nothing was deleted by enabling it — every app is under the cap — so it is
  purely preventive.

  ⚠️ **The lesson outlives the fix:** the failure mode was *invisible*. Merges
  looked successful, MRs closed, pipelines were green, and nothing shipped.
  If a change seems not to be live, check the CodePipeline **Deploy** stage
  before re-reading the code.
- **G40-360** — payout setup is unreachable; the debit card is never tokenized.
  App fix plus a store release.
- **`submitted_ip` 90-day purge job** does not exist. The retention is documented
  in `config/db.config.js` and enforced by nothing.

---

## 8. The lesson this session paid for twice

**Green tests and a green pipeline prove neither correctness nor deployment.**

- The unit tests passed while `POST /users/deals` 422'd **every** authenticated
  call, because they call the controller directly and never run the middleware —
  which injects three fields into `req.body`.
- Four merges sat undeployed for two days behind an EB version ceiling while every
  MR looked successful.
- The OTP autofill bug was invisible for as long as the demo accepted any six
  digits.

Each was found by driving the real path with a real account. **Drive the thing.**
