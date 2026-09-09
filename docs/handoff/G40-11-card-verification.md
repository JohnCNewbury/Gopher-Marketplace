# G40-11 — Verified card add: billing address + AVS/CVC/Radar, SMS code before save, dispute audit log

**Type:** Task (child of Epic G40-1 "Bug Fixes & Polish") · **Priority:** Medium · **Assignee:** John Newbury
**Sprint:** Payment Options (2026-09-07 → 09-16) · **Status:** In Progress — **BUILT, blocked on the owner** (UI approval + device QA)
**Groomed:** 2026-07-02 · **Built:** 2026-09-08 · **Tile + `verified` flag added 2026-09-09 (§3.4)**

> **Read this first.** Everything in §2 was verified first-hand on 2026-09-08 against the live Stripe
> account, the backend `production` branch and the requester app's `production` branch. Nothing in
> this doc is inherited from the July ticket text except the owner's product decisions in §1.

---

## 0 · Where it stands (2026-09-08)

> ⛔ **INCIDENT 2026-09-08 17:29 ET — the gate refused the STORE app.** The floor defaulted to
> `appversion >= 43` on the premise that the store build sends 42 (the repo's
> `.env.requestor.production`). **It sends 45** — Appflow's prod environment bakes
> `REACT_APP_VERSION=45` into both store builds (iOS #253, Android #254, 2026-09-05). Verified
> first-hand from the installed Play APK (`e.headers.appversion="45"`, `users/attach/` still
> called). Caught by the G40-38 session within the hour. **Fix:** [`gopher-backend-api!529`](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/529)
> — no default floor; the gate is off until `CARD_VERIFICATION_REQUIRED_FROM_VERSION` is set on
> Gopher-Production (target `production`, squash no, delete no). **Damage:** CloudWatch nginx +
> web.stdout, 21:25Z → 22:02Z, probe proven on 3.7k+ lines: **zero** `PUT /users/attach` requests
> and zero 409s — nobody added a card in the window, so nobody was refused. ⚠️ Consequence for
> release: **the env var must be set to the G40-11 build's real `REACT_APP_VERSION` when that build
> is in the stores, or the gate never turns on.** Lesson recorded in memory
> `store-app-appversion-is-45-not-the-env-file`; every "appversion 42/43" statement below is
> superseded by this note.

> ⚠️ **Second device finding, same evening (18:40 ET), same MR !529 (`de45cdf6`):** on the Samsung
> the sheet completed, the server screened the card and **texted the code** (read over adb), and
> the app then said *"Verification did not start"*. `verify/start`'s response carried
> `verification_id: undefined` — `create()` returns a Sequelize instance (finders return raw
> rows; create does not) and the response spread the instance, not its columns. Fixed by
> flattening the created row; the test stub is now instance-shaped and fails against the unfixed
> controller. **The device test resumes once !529 is merged** — until then the app cannot open the
> **Timeline (all 2026-09-08, UTC in brackets):** 17:29 ET [21:29Z] `aa499b27` live with the
> gate at 43 · ~18:05 ET G40-38 session flags that the store app sends 45 · 18:12 ET store APK
> pulled over adb, `appversion="45"` confirmed first-hand · 18:20 ET `!529` opened (gate off by
> default) · 18:40 ET [22:40Z] first device run: sheet → screening `avs_postal=pass cvc=pass` →
> code SMS sent → app showed "Verification did not start" (instance-spread bug) · 18:45 ET second
> fix pushed into `!529` · 18:47 ET [22:47:16Z] `!529` merged as `fb27e3fd` on the owner's
> "Proceed" (an unrelated G40-19 merge `dcfbf1b7` deployed just before it) · 18:49 ET [22:49:38Z]
> Gopher-Production Ready on `fb27e3fd`, `apiversion` 200, EB Red ~2 min (rolling-batch
> transient, no 5xx). **Damage, 21:29Z → 22:49Z, probe proven on both log groups: zero
> `card_verification_required` refusals, zero `PUT /users/attach` calls.** Nobody was refused.
> ✅ **DEVICE TEST PASSED — 2026-09-08 18:51 ET, owner's Samsung, sheet path, after `fb27e3fd`.**
> Add a payment method → sheet (name + home address prefilled, Card / Cash App Pay, Samsung Pass on
> the card field) → owner typed the card → Set up → server: `card verification started …
> path=payment_sheet avs_postal=pass cvc=pass` → code SMS (896761, read over adb) → owner entered
> it → server: `card verified and saved pm=pm_1UDXqtCQp3eawbpnCIb3Q4cf` → nginx: `verify/start`
> 200, `verify/confirm` 200 → Stripe: customer `cus_OVbpKctbuDozvt`
> `invoice_settings.default_payment_method = pm_1UDXqt…` → app list refreshed with the new card as
> default. AC1–AC5 proven on Android via the sheet; AC6 by the server's "started"/"saved" lines
> (the row itself not read — no DB tunnel tonight). **Not proven:** iOS; the Stripe.js card-form
> fallback (web / sheet-unavailable); wrong-code / resend / expiry paths on a device (unit-tested
> only). App branch rebased onto production `313befd8d` (G40-38's !290 + !291) — services suite
> 77/77.
> Earlier in the evening, before the fix:
> sheet config (name + full address, no Bank/Link on Android), Samsung Pass autofill on the card
> field, name + home-address prefill, customer-less SetupIntent, AVS/CVC screening, audit row +
> SMS. Not yet proven: code entry → attach → default.

| Piece | State | Where |
|---|---|---|
| Backend — three endpoints, appversion gate, audit table | **MERGED + LIVE 2026-09-08 17:29 ET** — merge commit `aa499b27`; `POST /users/payment_methods/verify/start` went 404 → 440 ("sign in") on production, `apiversion` 200 | [`gopher-backend-api!525`](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/525) · branch `feat/g40-11-card-verification` · target `production` · squash **no** · delete source **no** |
| Requester app — card form + native sheet + code step | **MERGED into mobile `production` 2026-09-08 (merge `7f39edca`, owner's "Proceed"), device-tested on Android; ships in the NEXT STORE BUILD — merged ≠ released** | [`gopher-mobile-requester-capacitorjs!287`](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/287) · squash no · source kept · rebased on `313befd8d` (carries G40-38's !290 + !291) |
| Prototypes — Request web, Connect, Request app prototype | **DEPLOYED 2026-09-08** — deploy `609fd81` → `origin/main`; content-verified on Pages AND TigerTech (`payOtpBoxes` ×2 in gopher-request.html, `addpayOtpBoxes` ×2 in gopher-connect.html); the three riders were HELD BACK per the owner ("exclude them") and are NOT live | [`docs/handoff/G40-11-prototype.patch`](G40-11-prototype.patch) is now history, not a to-do |
| Saved-method tile — white bubble card, brand marks, Verified pill (2026-09-09) | **MERGED into mobile `production` 2026-09-09 13:0xZ on the owner's "Merge both MRs"** — merge commit `3dce3964`, pipeline green, source branch kept. ⚠️ **Merged ≠ released: it ships in the NEXT STORE BUILD.** | [`gopher-mobile-requester-capacitorjs!293`](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/293) · branch `G40-11-card-tiles` · target `production` · squash **no** · delete source **no** · §3.4 |
| Backend — the `verified` flag the pill reads (2026-09-09) | **MERGED + LIVE 2026-09-09** — merge commit `1c5812b7`; all six CI jobs ran and passed (none skipped); EB version `code-pipeline-…-1c5812b7…` deployed, `Environment update completed successfully` 13:07:50Z, `apiversion` 200 on 9/9 probes | [`gopher-backend-api!538`](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/538) · branch `feat/g40-11-card-tiles` · target `production` · squash **no** · delete source **no** · §3.4 |
| Brand-artwork provenance pinned by checksum (2026-09-09) | **MERGED** — merge commit `e5cde3948`; every mark's SHA-256 asserted after comparison against the vendor's own copy, guard proven to fail on a 10-byte change. ⛔ **But NOT enforced in CI — no pipeline job runs jest** (§3.4 correction); fix in flight, §3.5. ⚠️ The four card-network PNGs are pinned for DRIFT only — their origin is unknown and that is open work, §3.4 | [`gopher-mobile-requester-capacitorjs!294`](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/294) · branch `G40-11-mark-provenance` · target `production` · squash **no** · delete source **no** |
| Side-by-side (current vs proposed, all three surfaces) | **Published** | <https://claude.ai/code/artifact/000285b0-12e0-4f5e-a04b-72d9a790c403> (private artifact; the Request/Connect frames are rendered from the actual page code) |
| Stripe Dashboard Radar rules | **Owner action — unverified** (Dashboard needs a login) | §6 |
| 101 guides + Terms of Service | **LIVE on the site 2026-09-08** (same deploy; "Adding a card" in both 101s, "Payment Method Verification" in the ToS, verified on both hosts) · live gophergo.io Terms: handed to the **ToS session** by message (its file is in flight) | §7 |

**0b · The 2026-09-09 merge, and a wrong diagnosis I have to withdraw.** Both MRs merged on the
owner's "Merge both MRs". Backend `1c5812b7` is live; app `3dce3964` ships in the next store build.
The deploy itself: `Environment update completed successfully` at **13:07:50Z**, version label
carries the merge SHA, health back to **Ok/Green at 13:11:13Z** with no causes outstanding.

⛔ **What I first wrote here was wrong, and the way it was wrong is the useful part.** Elastic
Beanstalk went Degraded during the deploy. I checked the event log, found a Degraded 14 minutes
earlier that also said *"below Auto Scaling group minimum size 2"*, concluded the condition
pre-dated my deploy, and filed it as the known G40-447 scale-out issue. **Both halves were wrong**,
and the G40-38 session caught it. Verified first-hand against the event log and the live ASG:

| I claimed | Actually |
|---|---|
| the condition pre-dated the deploy (12:49:13Z) | that Degraded was the **drain from the previous deploy**, which completed 12:47:56Z — excess instance removed at 12:49:13Z — and it **cleared at 12:50:13Z**. The first `t2.xlarge` capacity message is **13:04:25Z**, 30 seconds *after* my own rolling batch launched. Different cause, same-looking text. |
| this is G40-447, recommendation `MaxSize 1` | `aws:autoscaling:asg` already reads **MinSize 1 / MaxSize 1**. The "minimum size 2" in the health text is the **deploy-time temporary minimum** `RollingWithAdditionalBatch` sets while launching the extra instance — not the standing config. Nothing is misconfigured and no recommendation is outstanding. |

**I matched on the wording of a symptom instead of reading what caused each one** — and two unrelated
events produce near-identical Degraded text here. The conclusion happened to survive (the deploy was
fine), which is exactly what makes it dangerous: a right answer reached through a broken chain reads
as confirmation. See memory `a-correction-invalidates-the-whole-inference-chain`.

**What is actually true**, re-derived: the Degraded was AWS having no `t2.xlarge` capacity in
`us-east-1a` when *this* deploy's additional batch asked for one. It is a transient of this deploy,
not a standing condition, and not an application fault. **Zero load-balancer 5xx across
13:00–13:20Z** — and that zero is on a *proven probe*: `RequestCount` over the identical window and
dimension returns 790 / 617 / 647 / 217 requests per 5-minute bucket, so the metric stream is live
and the absence is real rather than a query that was never going to return anything.

✅ **The 502 discrepancy is CLOSED, and the answer is zero user impact.** Two readings disagreed:
G40-38 saw two 502s in the deploy window, and the ALB 5xx metrics showed none. Both were right, and
they were measuring different layers. Queried the nginx access log directly — **1,464 request lines
across 13:03–13:12Z, exactly two of them 502**:

```
13:06:38.192  i-0433df531b936d705  "GET / HTTP/1.1" 502 150 "-" "ELB-HealthChecker/2.0"
13:06:42.201  i-0433df531b936d705  "GET / HTTP/1.1" 502 150 "-" "ELB-HealthChecker/2.0"
```

Both are **`ELB-HealthChecker/2.0`**, and both are on **`i-0433df531b936d705`** — the extra-batch
instance added at 13:05:13Z, still booting its node upstream. The load balancer probed a starting
instance, nginx answered 502, and the balancer correctly kept traffic off it until it passed. **No
client request was ever routed there**, which is exactly why `HTTPCode_ELB_5XX_Count` and
`HTTPCode_Target_5XX_Count` have no datapoints while `RequestCount` shows 790/617/647/217. **A
failed health check is not a client 5xx.** Two rules fall out, both bigger than this deploy: read
the **user agent and the log stream** before calling a deploy-window 502 an incident, and **never
quote a 5xx count without naming the layer**, because instance nginx and the ALB metric legitimately
disagree.

⚠️ **The one thing still worth carrying forward, from G40-38.** Because `RollingWithAdditionalBatch`
launches an extra instance, **every deploy runs two instances for roughly four minutes**, and that
window *is* the socket.io scale-out condition from G40-447. With a single instance the alternative
is downtime, so it is a deliberate trade rather than a defect — but if anyone ever debugs socket
drops that correlate with a deploy, that is the mechanism.

**0a · Deploy scope check (2026-09-08, `scripts/deploy.sh` dry run).** Besides this ticket's files,
three committed-but-undeployed files from other sessions would ride along: `gopher-go-101.html`
(+5, the G40-9 "if you have to back out" section), `gopher-request-101.html` (one sentence, G40-9
"details can't be changed while you decide"), and `_prototypes/Go/gopher-go-prototype.html` (+38,
G40-10 divergence pins). All three are additions relative to `origin/main` — riders, not reverts.
Owner ruled "exclude them": the three files were held at their `origin/main` content in the working tree for an `--allow-dirty` deploy (the script has no exclude option), the diffstat was checked to carry only this ticket's six files, then pushed as `609fd81`; the working tree was restored to HEAD afterwards. **The G40-9 / G40-10 changes remain committed and undeployed — whoever deploys next carries them.**

**Why it is blocked, in the owner's own terms:** a new UI screen (the billing block + the code step,
on the app, Request web and Connect) needs his approval before it is applied, and the code step
sends a real SMS so it needs a real handset. Both are his. The backend MR is safe to merge on its
own and changes nothing for any installed build (§3).

---

## 1 · The owner's decisions (2026-07-02) — unchanged

| # | Decision | Answer |
|---|---|---|
| 1 | Status (was parked pending Stripe Connect R&D) | **Unparked — build it.** |
| 2 | Surfaces | Native Request app + Request web + Connect. **Deals out of scope.** |
| 3 | OTP on card add | **Required on EVERY card add.** No skip. |
| 4 | Dispute evidence | **Log every card-add verification event.** |
| 5 | Prototype UI | *"Do not build UI in the prototype"* — **superseded by standing rule 12/12b (owner, 2026-08-11 / 09-01):** a completed ticket updates the front ends and the prototypes in the same pass. Built as a patch, applied on approval (rule: side-by-side first). |

Required fields: Full Name · Card Number · Expiration · CVC · **Billing address (street, city,
state, ZIP)**. OTP: 6 digits, to the **account** phone, **5-minute expiry, one resend**.

---

## 2 · What was actually true on 2026-09-08 (first-hand)

**The card add never asked the issuer anything.** On the live Stripe account, the five most
recent SetupIntents and the five most recent charges all show `billing_details` with every field
`null`, `address_line1_check: null` and `address_postal_code_check: null`. `cvc_check` is `pass`
only on the first charge after a card is added (Stripe keeps the CVC result from setup) and
`null` after. `radar_options` is `{}` on every charge — no Radar session. Every charge is
`risk_level: normal`.

**Why:** the store build's card form (`src/component/cardComponent.js`) calls Stripe.js
`createPaymentMethod({ type:'card', card, metadata:{ name } })` — the cardholder name goes into
*metadata* as a nickname, not into `billing_details`, and no address is collected at all. The
method is then handed to `PUT /users/attach/:pm`, which confirms a SetupIntent **with the
customer** — so the card is saved at that moment — and attaches it.

**The disputes this is for.** The last 15 disputes on the account (Sep 2025 → Jun 2026):

| | |
|---|---|
| Reason `fraudulent` (Visa 10.4 / MC 4837 — card-absent fraud) | 13 of 15 |
| Reason `product_not_received` | 2 of 15 |
| Lost | 13 · Won 2 |
| Evidence submitted | 5 of 15 (the two wins both had evidence; 8 had none at all) |
| `evidence.billing_address` on file | 2 of 15 — and only because the owner typed it in |
| Repeat disputers | 4 people account for 9 of the 15 |
| Dispute fee | $15 each, on top of the reversal |

**The G40-38 sheet did not change this.** The native PaymentSheet merged for G40-38
(`!280`/`!284`, unreleased) creates the SetupIntent *with* the customer (saves on completion) and
does not configure billing-details collection, so a card added through it would also carry no
address.

**Two facts that shaped the design:**

- A PaymentMethod's `billing_details` can only be updated once it is attached to a customer — so
  the name and address must be on the method **when the client creates it**; the server can refuse
  a method that lacks them but cannot repair it.
- A SetupIntent confirmed **without** a customer runs the same issuer checks (AVS, CVC) and Radar
  screening, attaches nothing, and the method can be attached afterwards — the pattern Stripe
  documents for Checkout setup mode without a customer. That is what makes "code before save"
  possible.

---

## 3 · What was built

### 3.1 Backend (`gopher-backend-api`, MR !525)

Three endpoints, all behind `user_auth`, requester role only:

| Endpoint | Does |
|---|---|
| `POST /users/payment_methods/verify/start` `{ payment_method \| setup_intent, set_default }` | Refuses a method without name + street + city + state + 5-digit ZIP (`422 billing_details_incomplete`, names the missing fields). **Card-form path:** confirms a customer-less SetupIntent so AVS + CVC + Radar run and nothing is saved; a decline is `402` with the `decline_code`, 3DS-required is `422 requires_action` (same stance as `/attach`). **Sheet path:** reads back the SetupIntent the sheet confirmed; refuses one that already has a customer. Writes the audit row, then texts a 6-digit code to the **account** phone (`users.telephone` — never a number in the request). Returns `{ verification_id, phone_masked, expires_in_seconds, resend_allowed, attempts_left }`. |
| `POST …/verify/resend` `{ verification_id }` | Once. New code, new 5 minutes. `429 resend_limit` after that. |
| `POST …/verify/confirm` `{ verification_id, code, set_default }` | Right code → `paymentMethods.attach` to the customer, default unless `set_default:false`, re-arms exhausted re-authorization exactly as `/attach` does (G40-402), row `outcome: saved`. Wrong code → `400 incorrect` with `attempts_left`; fifth wrong → `423 locked`, row `failed`. Expired → `410 expired` (`resend_allowed` says whether a resend still revives it). A closed row → `410 closed`. Another user's id → `404`. |

Structured error payloads ride as `data` on the global error response (additive, only when a
thrower sets `error.payload`).

**The appversion gate (memory `server-guard-must-be-appversion-gated`).** `PUT /users/attach/:pm`
now refuses callers with `appversion >= CARD_VERIFICATION_REQUIRED_FROM_VERSION` (env; **default
43**) with `409 card_verification_required`. The store build sends `appversion: 42`
(`.env.requestor.production`), and header-less callers are treated as legacy — both keep the old
path, **logged with user_id + appversion**. Raise the env var to retire the exemption; delete the
block to end it. ⚠️ **The build that ships this must be 43** (or the env var set to what it ships
as) or the new client will be refused by its own server.

`POST /users/payment_sheet/start` with `card_verification: true` creates the SetupIntent **without
a customer** (`create_unattached_wallet_setup_intent`, same named types `card` / `cashapp` /
`link`) and returns `setup_intent_id` + `card_verification: true`. The merged sheet code does not
send the flag → byte-identical behaviour.

**The audit table — `card_verification_events`** (model + `CREATE TABLE IF NOT EXISTS` on boot,
like every table here). One row per attempt, **never deleted, never overwritten by a card edit or
removal**:

| Column group | Columns |
|---|---|
| Who / what | `user_id`, `stripe_customer_id`, `payment_method_id`, `setup_intent_id`, `entry_path` (`card_form` \| `payment_sheet`), `card_brand`, `card_last4`, `card_funding`, `card_country`, `billing_name`, `billing_postal_code` |
| Issuer checks | `avs_line1_check`, `avs_postal_code_check`, `cvc_check`, `radar_risk_level` (**null until Stripe enables setup-attempt risk data** — §6), `stripe_error_code` |
| Phone + code | `phone_masked` (`***-***-0111`), `phone_hash` (sha256 of digits), `otp_code_hash` (sha256 of token:code — the code is never stored), `otp_status` (`sent → resent → verified \| failed \| expired`), `otp_sent_at`, `otp_expires_at`, `otp_verified_at`, `otp_attempts`, `otp_resends` |
| Session | `ip_address` (first X-Forwarded-For hop — `trust proxy` is off on this app), `user_agent`, `app_version`, `device_type` |
| Outcome | `outcome` (`pending → saved \| declined \| failed \| expired`), `created_at`, `updated_at` |

Retention: indefinite by design. Visa and Mastercard allow ~120 days from the **transaction**, and
the transaction can be months after the add, so a time-boxed purge would delete the evidence
exactly when it is needed. At today's volume this is kilobytes a month.

Codes live in this table, not in `otps`, for the reason `recovery_attempts` gives: a card-add code
must never satisfy a sign-in and vice versa.

**Files:** `helpers/card_verification_policy.js` (pure rules) · `controllers/user/card_verification.js`
· `models/card_verification_events.model.js` · `config/db.config.js` (DDL) · `controllers/user/index.js`
(routes) · `controllers/user/payment.js` (gate, sheet flag, `rearm_exhausted_auth` export) ·
`lib/payment.stripe.js` (5 appended helpers) · `index.js` (error `data` passthrough) ·
`test/g40-11-card-verification.test.js`.

**Tests:** 93 checks — the policy; the controller against raw-row stubs (production sets
`query:{raw:true}`) with a Stripe stub that records every call so the suite asserts **attach is
NOT called** until the code is right; decline / 3DS / resend-once / expiry / lockout / ownership /
sheet path; the `/attach` gate; routes; every DDL column present in the model. Full suite 244/245 —
the one failure is `admin-jwt-v8-contract`, identical on untouched `production` (the shared clone's
stale `express-jwt`, memory `shared-clone-node-modules-is-stale`).

### 3.2 Requester app (`gopher-mobile-requester-capacitorjs`, branch `G40-11-card-verification`)

- **Card form** (`cardComponent.js` — the store build's screen, and the web / sheet-unavailable
  fallback): new *NAME AND BILLING ADDRESS* block (name, street, apt optional, city, state, ZIP).
  **Save is disabled** until the three Stripe elements report `complete` and the five fields pass
  (AC1). `createPaymentMethod` carries `billing_details`. The form calls `verify/start`, swaps to
  the code step, and the server attaches the card only on a confirmed code; the post-save
  bookkeeping (summary refresh, default, confirmation screen) is unchanged. `PUT /attach` is gone
  from this screen.
- **Native sheet** (`paymentSheet.js`): asks for the customer-less SetupIntent and configures
  `billingDetailsCollectionConfiguration { name:'always', address:'full', email:'never',
  phone:'never' }`; `completed` returns `setup_intent_id`. `cardlist.js` and `summary.js` open
  `SheetVerifyModal` after completion and run their existing "newest method becomes default" logic
  only after the code. An older backend that ignores the flag → old behaviour.
- **Code step** (`CardVerifyOtp.js`): six boxes mirroring sign-in (`css/otp.css`), auto-advance,
  paste/autofill into box 1, 5:00 countdown from the server's `expires_in_seconds`, **Resend once**,
  attempts-left, "Verify and save card", "Cancel — don't save this card". Terminal errors (locked,
  closed, expired-with-no-resend) close the step and the user adds the card again.
- **New:** `services/cardVerification.js` (+9 tests) · `CardVerifyOtp.js` · `SheetVerifyModal.js`.
  `paymentSheet.test.js` gains 4 G40-11 cases. ⚠️ The 6 pre-existing G40-38 cases in that file fail
  in this checkout **with the untouched service too** (CRA's `resetMocks` strips the factory mocks;
  the sibling worktree cannot even load `setupTests.js`) — not a regression; the new cases re-install
  their mocks in `beforeEach` so they do not depend on that setting.

### 3.4 The saved-method tile, and the badge behind it (2026-09-09)

The verification only means something if a person can see which of their cards actually took it.
That is what this pair of MRs adds, and the redesign the owner asked for on 2026-09-09 rides with
it because it is the same surface.

**Backend — the `verified` flag** ([`gopher-backend-api!538`](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/538) · branch
`feat/g40-11-card-tiles` · target `production` · squash **no** · delete source **no**).
`list_requestor_payment_methods_v2` joins the ids it is about to return against
`card_verification_events` — this user, `outcome='saved'`, one query for the whole list — and
stamps `verified` on each normalised row. Stripe holds no record of the G40-11 check, so without
this the client would have to guess; a badge that is always on is worse than no badge, because it
tells someone their card passed a check it never took. The lookup is wrapped and logged rather
than fatal: if the table is missing or the query fails, every row returns `verified:false` and the
screen still renders. **18 checks** (`test/g40-11-verified-flag.test.js`) — scoped to the caller,
to `saved` only (pending / failed / declined / expired earn nothing), and to the ids in this list;
another user's row never leaks across; the failed-lookup path returns the full list with nothing
flagged.

**App — the tile** ([`gopher-mobile-requester-capacitorjs!293`](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/293)
· branch `G40-11-card-tiles` · target `production` · squash **no** · delete source **no**).
The old tile was a navy-to-green gradient with white type. Style guide §3.4 lists white on
Shamrock at 2.0:1 as a **FAIL** — *"not a style preference, an accessibility requirement"* — and
the last four sat on the green half of that gradient; and five saved methods rendered as five
identical green rectangles. The replacement is a white bubble card (the owner picked the
elevation) that answers three questions before a word is read: **which method** (the brand mark,
full size, top left), **is it usable** (the spine down the left edge, Shamrock healthy / Lava
declined), **is it trusted** (the Verified pill). All type is Midnight Blue on white, 15.6:1.
The list screen also loses its two centred headings: "Default Payment Method" now duplicates the
tile's Default pill, and "Available for use" labelled an empty list whenever only one card was
saved.

⚠️ **Three logo bugs are fixed here, and all three shipped a tile that looked finished.** Worth
carrying, because the next person to add a mark will hit them again:

| Symptom | Cause | Rule that now holds |
|---|---|---|
| Google Pay drew **nothing** | its file declares no `width`/`height`, so `width:auto + max-height` had nothing to scale from | every mark carries an explicit width AND height |
| Google Pay drew **1.85x smaller** than every other logo | its file is a white pill with the artwork inset — the ink fills **54%** of the file's height | size by INK, not by box: `boxHeight = inkHeight / fills` (`markBox`) |
| Cash App Pay and Link drew as **an empty space and a lone badge** | the shipped files were the REVERSED (white) variants, and the tile is white | `src` is the light-ground file, `srcOnDark` the other one |

The ink fractions are **measured, not assumed** — each file rendered on white at 400px and scanned
for the bounding box of every pixel darker than the ground. `markBleed` then pulls Google Pay's
taller box back into the row as a negative margin, so a mixed list keeps one tile height:
**verified in a browser at 390px, seven tiles, every one 178px, no broken images.**

**Assets added** to `public/assets/marks/`: `cash-app-pay-on-light.svg`, `link-on-light.svg`,
`gopher-peek.svg` (the owner's `GopherLogo-Hero-Peek-RGB.svg` — the logo, never the wordmark) and
`powered-by-stripe.svg`.

⚠️ **Provenance, because "don't alter the mark" is a licence term.** All four marks are third-party
trademarks used unaltered, and a replacement file has to name its source. `link-on-light.svg` is
**byte-identical (shasum)** to Stripe's own iOS SDK asset
`StripePaymentSheet.xcassets/Link/link_logo.imageset/Light.svg`, and the reversed `link.svg`
matches `Dark.svg` the same way. ⚠️ **RETRACTION, same day.** This section first said the Cash App artwork *"cannot be re-verified
against the source today"*, because the Pay Kit path
`cash-images-f.squarecdn.com/cash-app-pay-kit/…` answers 403. **That was wrong, and the fix came
from the G40-38 session:** developers.cash.app actually links
`static.afterpaycdn.com/en-US/integration/logo/lockup/cashapppay-color-{black,white}-32.svg`, which
answers 200. Both Cash App files are **byte-identical** to those, re-fetched and compared
2026-09-09. Only the squarecdn path is dead. *A 403 from one path is not "unverifiable" — it is one
path.* The other two marks are G40-38's originals: Apple's `Apple_Pay_Mark_RGB_041619.svg` and
Google's `google-pay-mark_800.svg`.

⛔ **CORRECTION — I claimed CI enforces this, and it does not.** I wrote "a swapped file fails CI",
and told the owner "the pipeline fails until they update the hash". **Both are false.** The G40-38
session caught it; verified here against `.gitlab-ci.yml` on merged `production` (`e5cde3948`): the
pipeline has **11 jobs** — `lint-job` (eslint + prettier) and ten contract jobs, each running one
`node scripts/assert-*.js`. **No job runs jest.** There is no `include:`, no other CI config in the
repo, and no `scripts/` file invokes jest indirectly. So **today a swapped mark passes all 11 jobs.**

⚠️ **The gap is wider than my claim.** *Every* jest suite in this repo is unenforced — all six under
`src/services/`, including G40-11's own `cardVerification.test.js` and G40-38's
`paymentSheet.test.js`. Every "N tests green" reported on this repo, mine and other sessions', was a
**local run**. The tests are real and they pass; nothing was checking that they keep passing.

**What is actually true:** the pins themselves are correct — all four SHA-256s recomputed from
`origin/production` match — and `paymentMethodLogos.test.js` does catch a swapped mark. It just only
fires when a human runs the suite. **Provenance is documented and locally testable, not enforced.**

**Why this one mattered more than an ordinary error:** "CI enforces this" is precisely the kind of
assurance that stops the next person checking. It converts an open risk into a closed one in
everybody's head without changing anything in the world.

**Fix built and proven, awaiting the owner:**
[!295](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/295) adds one
`services-tests` job (`npm ci` + `npm run test:services`, contract stage, `needs: []`). Whole suite
rather than a provenance-only guard, because the gap is that **no jest runs at all** — a narrow
guard would leave the payment-sheet and card-verification suites as unenforced as they are now.

**Proven in CI in both directions, not locally**, precisely because the error being corrected was
asserting enforcement without checking it:

| | `services-tests` |
|---|---|
| branch unmodified | **success**, 1m18s, all 12 jobs green |
| same branch, one mark altered by 46 bytes | **failed**, 1m20s |

…and it failed for the *right* reason — the job log names the assertion and prints both hashes
(`Expected 8445bbeb… / Received 159152db…`, `1 failed, 141 passed`). The negative-control branch has
been deleted; it survives only as that evidence.

**The image is `node:22` on purpose, and it makes the job worth more than the tests it runs**
(G40-38's contribution). Every other job is `node:24`; the reason to differ is not jest, which runs
on both — it is the `npm ci`. **Appflow's stack is Node 22.22.2 / npm 10.9.7, and `node:24` bundles
npm 11** (verified: `node v24.18.0` ships `npm 11.16.0`). npm 11 installs lockfiles npm 10.9.7
**rejects**, which is what killed Appflow build #257 — *"Missing: canvas@2.11.2 from lock file"*,
twenty minutes into a store build. On `node:24` that desync passes CI and surfaces later as a failed
store build; on `node:22` the same `npm ci` reproduces the runner's check and the MR goes red. So
one job enforces six suites **and** closes the lockfile trap.

Recorded from the CI log, because the script now echoes the versions on every run rather than
relying on the comment: **`v22.23.2` / npm `10.9.8`**, 1,833 packages installed in 40s, **142 tests /
6 suites passed**, job 1m21s, pipeline green across 13 jobs. ⚠️ Precise rather than rounded: that is
npm **10.9.8**, one patch ahead of Appflow's 10.9.7 — same major.minor so the same lockfile check,
but not literally identical. `package.json` declares **no `engines`**, so the image tag is the only
thing pinning it; **if Appflow's stack moves, move this with it.**

⚠️ **This is a decision, not a review:** it changes what the pipeline gates for **every** session, so
a broken services test would block merges repo-wide. Green today (142/142), 1m21s, `needs: []` so it
cannot cascade, removable in one line.

**The merge itself stands** ([!294](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/294),
merge commit `e5cde3948`, not squashed, source branch kept; 142 tests green locally on merged
`production`). Every mark carries its SHA-256 in `paymentMethodLogos.test.js`, taken after comparing
it against the vendor's own copy. The guard was proven before being trusted: ten bytes appended to one mark fails the suite.
⚠️ **The four card-network PNGs are pinned on a weaker claim, and the test says so:** they predate
this work and nobody recorded their source, so the hash catches silent drift but does **not**
establish that they are the networks' own unaltered artwork.

**OPEN — and now specific enough to decide on.** The G40-38 session dug out the history; re-checked
here against git and the files themselves. **Nobody knows where these came from, and the files
testify to it:**

| File | Added | Commit message |
|---|---|---|
| `Visa.png`, `masterCard.png` | `784b10fca`, 2023-09-22 | "stripe" |
| `amex.png` | `c9b24da36`, 2024-06-04 | "payoutlist" |
| `discover.png` | `203878f80`, 2024-06-12 | **"env change"** |

Four different geometries — 381×241, 379×237, 360×227 and **84×58** — and `masterCard.png` is 57 KB
against `amex.png`'s 4 KB at almost the same dimensions. A brand kit does not produce that spread;
ad-hoc web sourcing does, and the 84×58 / 1.8 KB Discover file is small enough to be a scrape. Its
artwork arrived inside a commit called *"env change"*. No `.md` in either repo records a source, and
**none of the four exist in the Code repo** — `Final/` has no card-network artwork, so this is
app-only and not a web-mirror concern.

**The option, for the owner — not taken, because swapping trademark artwork on a payments surface is
his call.** Stripe's SDK, which we already install, ships all four as **SVG at a uniform 24×16 with
intrinsic width/height declared** (`StripePaymentsUI.xcassets/CardsNoPadding/
stp_card_unpadded_{visa,mastercard,amex,discover}.imageset`, verified on disk). That is the **same
basis as the Link mark**: artwork the vendor redistributes for use inside its own integration. It
would fix three things at once — a defensible origin instead of an unknown one, vector instead of
four mismatched rasters, and coverage for **diners / jcb / unionpay**, which `logoForTile` currently
draws as nothing. It is a *defensible* basis rather than a certain one, which is exactly why it is a
decision rather than a cleanup. The alternative is four brand portals, each wanting terms accepted
by the account holder.

**Correction to the history, raised by the G40-38 session (2026-09-09).** The reversed white files
were **not a mistake when they were added** on 2026-09-08. The tile was then a navy-to-green
gradient, where white ink reads and the *light* files would have been the invisible ones. They
became wrong only when the owner picked the white bubble a day later. So `src` / `srcOnDark` is a
**pairing, not a fix** — keep both, and point each surface at the one matching its ground.

**The web mirror was corrected too, before it could ship (commit `d598460`).** The same four files
are mirrored at `Final/assets/marks/` and drawn by `_prototypes/Request/gopher-pay-store.js`, whose
`.gp-row` and `.gp-wbtn` are `background:#fff` — so Cash App Pay and Link would have been invisible
there as well, and Google Pay undersized. **It was never a live defect:** curl on the deployed
prototype JS finds no `MARK_IMG` and every `marks/` path 404s on Pages, so the marks are
committed-but-undeployed. Verified by calling the real `window.GopherPay.brandMark` against the
real files at 390px — four marks, none broken, every row 54px. ⚠️ **Not deployed. Whoever runs the
next deploy carries it; it needs no deploy of its own.**

**Back-compat:** the payout screens pass `cardName` / `cardlastdigit` with no normalised row and
still work, the logo falling back to the brand string. `payoutlist.js` passes a **boolean** as
`onClickCard`, which the old tile called — and threw on; that tile was inert, and still is,
without the exception.

**Tests:** `src/services/paymentMethodLogos.test.js`, 32 assertions anchored to the real files on
disk. Services suite **129 passed**.

**See it:** [`G40-11-tile-built.html`](G40-11-tile-built.html) — seven cases at 390px, rendered
from `cardView.js` itself rather than mocked up, with the assets inlined.

**Risk:** the app side is visual only — no network call, no payment path, no state change; the
worst case is a tile that looks wrong, seen immediately, and it reverts by reverting one commit.
The backend side adds one indexed read per list call and cannot fail the response. The Verified
pill needs both MRs; with only the app merged the pill never shows and nothing else changes.

### 3.3 Prototypes (Code repo — `docs/handoff/G40-11-prototype.patch`, apply on approval)

Same change on all three, mirroring the app: billing block under the CVC row, Save/Add disabled
until the five fields are valid, and a code panel (six boxes, 5:00 countdown, Resend once,
Cancel) that replaces the form after Save and adds the card only on "Verify and save card". Demo:
any six digits verify. The saved entry carries `billing` so a later edit pre-fills it.

- `Final/gopher-request.html` — `ensureModal()` modal (`payAddr1/payCity/payState/payZip`, `#payOtp`)
- `Final/gopher-connect.html` — `openAddPaymentModal` (`addpayAddr1/…`, `#addpayOtp`)
- `_prototypes/Request/gopher-pay-store.js` — `openAddModal` (`gp-addr1/…`, `drawOtp()`)

Every inline `<script>` parse-checks clean; the flow was driven in the browser (form → disabled
Save → filled → code panel). ⚠️ One trap, fixed in the patch: the modal's children are
`display:flex`, which beats the UA's `[hidden]` rule — `.pay-modal-card [hidden]` /
`.addpay-modal [hidden]` are pinned to `display:none !important`.

**Not edited:** `Final/gopher-deals.html` (Deals is out of scope, decision 2) and `_prototypes/Go/`
(no worker-side card add). There is no Connect app prototype (rule 12b known bound).

---

## 4 · Risk / reward — for the merge decision

**Backend MR !525**

- **Solves:** every new card carries a name and an AVS-checked address, is phone-verified before it
  exists on the customer, and leaves an evidence row — the day the next Requester build ships.
- **Risk:** low. No installed build changes behaviour (§3.1 gate). New table only. New routes only.
  If wrong: revert the merge; one pipeline (~3 min). The audit table stays, inert.
- **Reward:** the dispute pack for every future chargeback starts with AVS result + phone
  verification + device/IP; Radar's postal-code and CVC block rules (§6) finally have something to
  act on.

**App MR (Draft)**

- **Risk:** a UI the owner has not approved, and a flow that has not touched a device. Held as
  Draft so it cannot be merged by accident. Store-gated regardless (no OTA).
- **Reward:** the actual user-facing change. Nothing in the backend does anything for real users
  until this ships.

**One product consequence to state plainly:** adding a card gets longer — five more fields and a
text message. That is the owner's decision 3 ("required on every card add, no skip"), reaffirmed
in the 2026-09-08 brief.

---

## 4b · ⛔ THE GATE HAS A DOOR BESIDE IT — `POST /users/add_card` (found 2026-09-09)

**Setting `CARD_VERIFICATION_REQUIRED_FROM_VERSION` does not close this, and that is the point of
recording it before the gate is switched on.** The floor is checked in exactly one place —
`attach_payment_method_to_customer` (`controllers/user/payment.js:1585`, the `/attach` route). A
**second live route saves cards and never consults it**:

```
router.post('/add_card',
  middleware.user_auth,
  middleware.require_email_verified({ allowUnverified: true }),
  payment.add_card_and_attach_to_customer)      // controllers/user/index.js:201
```

`add_card_and_attach_to_customer` (line 1476) calls `create_payment_method` then
`attach_payment_method` directly. **No `caller_must_verify`, no billing-details check, no audit
row.** Any signed-in requester can save a card through it at any appversion, gate on or off.

⚠️ **And it is worse than a bypass — it takes the RAW PAN.** The body is
`{ card_no, card_exp_month, card_exp_year, card_cvc }`, so the full card number and CVC transit our
API and are handled server-side. The whole modern path exists to avoid that: the Stripe SDK and the
payment sheet tokenise on the device, and the number never reaches our backend. This route reverses
that, which is a **PCI scope** question separate from, and larger than, the verification gap.

**Sized, not assumed — it is DORMANT, not leaking.** CloudWatch Logs Insights on
`/aws/elasticbeanstalk/Gopher-Production/var/log/nginx/access.log`, 7 days: **zero** requests
matching `/add_card` across **1,287,981 scanned lines**. The probe is proven — the identical filter
shape on `payment_methods` returns **21,402 hits** over 1,382,396 lines, so the zero is a real
absence and not a query that could never match. No caller in the requester app (its `payout.json`
`"add_card"` is a client-side *navigation* path, not this endpoint) and none in any Gopher-app
checkout.

⛔ **THIS IS NOT A NEW DISCOVERY — WE ALREADY WROTE IT DOWN, ON THE LIVE SITE, AND ROUTED AROUND
IT.** `Final/gopher-deals.html` line 8049, in the payment-methods block (G40-38's Deals card work,
MR !453), verbatim:

> *"⛔ NOT the /users/add_card endpoint the mobile apps use. That one takes the raw number, expiry
> and CVC in the request body and builds the PaymentMethod server-side; **the apps are inside PCI
> scope because of it**. The same form on a public web page would pull gophergo.io in with them —
> **SAQ D instead of SAQ A** — for one card box on a merchant portal."*

That is the only `add_card` string anywhere in the web surface, and it exists to say *do not use
this*. So the conclusion was reached months ago, the web was deliberately built around it, and the
route was never closed.

**RECOMMENDATION: RETIRE IT, don't gate it** — and the evidence supports retiring rather than merely
preferring it.

- **It is the ONLY raw-PAN handler left.** `grep card_no|card_cvc|card_number` across
  `controllers/`, `lib/`, `helpers/`, `middleware/` returns this one route (the only other hit is
  the string `'invalid_card_number'`, an error-code comparison). So retiring it removes raw card
  numbers from the API **entirely**, rather than shaving one of several.
- **Two modern replacements are already in production:** `POST /users/cards/setup_intent`
  (`controllers/user/index.js:192` — the browser confirms straight to Stripe, MR !453) and the
  native payment sheet from G40-38.
- **Gating by appversion is strictly worse here.** It leaves raw-PAN handling in the API for old
  builds, and the PCI question does not care which version sent the card.

**Safe order, because this is production and payments** (G40-38's shape, and it is the right one):
**(1)** make it refuse — `410` plus a log line naming caller, appversion and user id. Fully
reversible, and at zero traffic the blast radius is zero. **(2)** watch a week. **(3)** delete the
handler.

⚠️ **State the coverage limit when proposing it:** the static search covers the repos on this disk,
so an unknown consumer would have to be something that produced **no** request in seven days of
nginx. **Step (1) is exactly what catches that before the delete** — that is why it is three steps
and not one.

⚠️ **THE DEPLOY FAILED ONCE, AND THE CAUSE IS WORTH KEEPING — IT WAS A TOKEN RACE, NOT A BROKEN
CONNECTION.** `gopher-prod-codepipeline`'s **Source** stage failed at **15:06:43.8Z**, seconds after
the merge, with *"[GitLab] Unable to use Connection … Ensure your source provider account has access
to the repository"*. That reads like a revoked authorisation, and it is not.

**What the GitLab side actually showed** (owner opened `/-/user_settings/applications`): the **AWS
Connector for GitLab** grant is present, carries `read_repository` / `write_repository`, and is
stamped **`Authorized At 2026-09-09 15:06:42 UTC`** — **1.8 seconds BEFORE the failure.** So the
token was being refreshed at the moment the Source action ran, and the action took the old one.

**Resolution: `Release change` on the pipeline. Source succeeded on the first retry, no
configuration touched.** Nothing was revoked, no new connection was created, nothing repointed.

⛔ **THE TRAP, FOR NEXT TIME.** The error message names *repository access*, which sends you to
GitLab permissions and to the connection's status — and `aws codeconnections get-connection` reports
**AVAILABLE**, which looks like a contradiction and is not: AVAILABLE describes the handshake
record, not a live repo read. **Both signals point away from the real cause.** Check the grant's
`Authorized At` on
`https://gitlab.com/-/user_settings/applications` first: if it is within seconds of the failure, it
is a refresh race and a plain re-run fixes it. ⚠️ **Do NOT revoke that grant to "force a refresh"** —
five AWS connections hang off it, so revoking turns one stuck pipeline into five.

**Blast radius while it was down** (real, and worth knowing for next time): the same connection
`5edf4215…` backs **`gopher-prod-admin-codepipeline`** for `gophergo/gopher-admin-frontend` on
`production`. Backend *and* admin-frontend deploys were both dead, silently — a green MR and no
deploy.

---

✅ **DEPLOYED AND SETTLED 2026-09-09.** EB version label
`code-pipeline-…-8ce3d0f43ef9d8725f77f7d281991affbbba3b90` (deployment 550); health back to
**Ok / Green with no causes outstanding**; API 200 on every probe throughout. **Zero load-balancer
5xx** across the deploy window, on a *proven* probe — `RequestCount` over the identical window and
dimension returns 931 / 59, so the metric stream is live and the absence is real. Health passed
through Red on the way, first *"incorrect application version on 1 of 2 instances"* then *"no data
from 1 of 2"* — both the `RollingWithAdditionalBatch` extra instance being deployed and torn down,
the four-minute window described above, not a fault. **Verified by CONTENT, not by SHA alone:**
`git show 8ce3d0f4:controllers/user/payment.js` carries the retirement markers.

**Route reachability confirmed by contrast:** `POST /users/add_card` answers **440** (sign-in
required — `user_auth` runs before the handler, which is correct) while a nonsense sibling path
answers **404**. So the route is registered and reachable, exactly as intended: 410 for an
authenticated caller, never 404.

⚠️ **HONEST LIMIT — the live 410 is NOT directly observed.** Reaching the handler requires an
authenticated request, and nothing calls this endpoint (that is the whole point). So the refusal is
proven by **24 unit tests plus two negative controls plus the CI unit-tests job**, not by a
production observation. Stated plainly rather than implied: *deployed and reachable* is verified;
*returns 410 in production* is inferred from the tests. **The first real caller, if one exists, is
what will prove it — and that is exactly what step 2 is watching for.**

---

**What the merge itself contains — done and green, waiting only on the deploy** (merged on the
owner's "Do step 1", 2026-09-09).
[`gopher-backend-api!540`](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/540),
merge commit `8ce3d0f4`, target `production`, squash **no**, source kept. All six CI jobs green
including the full unit suite. The route now returns **410** with
`{ code: 'add_card_retired' }` and logs the caller by user id, apptype, appversion, os, user agent
and IP. **The route stays registered on purpose:** 410 says *this is gone*, 404 would be
indistinguishable from a typo.

⚠️ **An existing guard caught a real consequence, and it was NOT silenced.**
`g40-402-rearm-on-card-fix` asserted that **all three** card-fix endpoints re-arm exhausted
authorizations before `res.send`. A retired endpoint cannot fix a card, so it must **not** re-arm —
doing so would zero a live order's retry budget and expiry on a call that saved nothing, which is
*worse* than the bug G40-402 exists to fix. The list was narrowed to the two live endpoints **with
the reason written into the test**, and the retired one is now asserted **as retired** (no re-arm,
410, never reaches Stripe). **AC6's loop is unaffected:** a requester updating their card lands on
`attach_payment_method_to_customer` or `set_default_payment_methods`, and both still re-arm — both
re-proven by deleting each call in turn and watching the guard fail.

**Tests:** `test/g40-11-add-card-retired.test.js`, 24 checks — refuses with a branchable code, never
reaches Stripe or the DB, names the caller, and **the PAN, CVC and expiry are asserted NOT logged**
(a retirement that logs the card number would be worse than the endpoint it replaces). Two negative
controls prove the suite can fail: logging the PAN fires 2 checks, returning success fires 5.

**→ STEP 2 IS NOW OPEN AND IS THE OWNER'S TO CLOSE: watch for a week.** Search CloudWatch for
`RETIRED ENDPOINT CALLED` in `/aws/elasticbeanstalk/Gopher-Production/var/log/web.stdout.log`. **A
hit is not a failure — it is the point of the step**, and it names who to migrate. Silence for a
week clears step 3, deleting the handler and the route.

---

## 5 · Honest limits — what this does and does not stop

The fraud pattern in the dispute list is **card-absent fraud on an account the fraudster controls**
(stolen card, own phone). What each layer does against it:

| Layer | Stops | Does not stop |
|---|---|---|
| Billing address + AVS | a stolen number without the billing ZIP (the common case for skimmed / breached numbers) — **only if a Radar rule blocks the failed check** (§6) | a fraudster who has the full statement address |
| CVC at setup | numbers without the physical card | a physically stolen card |
| SMS code to the account phone | account takeover adding a card to someone else's account; it also puts *"the account holder confirmed by phone"* into the dispute pack | the account owner themself using a stolen card — they own the phone |
| Audit row | nothing by itself — it wins **disputes**, it does not prevent them | — |

So the honest expectation: fewer successful adds of skimmed numbers, and a dispute pack that can
actually be argued. Not a stop to the repeat-disputer pattern by itself — that is §6's third item.

---

## 6 · Additional fraud measures (the owner's side question) — owner actions and follow-ups

Verified against Stripe's docs on 2026-09-08; the Dashboard state itself could not be read (login
page in the pane — **pause and wait**, not guessed).

1. **Radar rules — Dashboard → Radar → Rules** (owner). Enable *"Block if postal code verification
   fails based on risk score"* and *"Block if CVC verification fails based on risk score"*. These
   rules **also apply to attaching a card to a customer** — with this ticket they block at the
   code step, before anything is saved. Without an address collected they have nothing to check,
   which is why they were pointless until now.
2. **Radar risk data on setup attempts** (owner → Stripe support). By default Radar does not return
   a risk outcome for SetupIntent attempts; support enables it on request. `radar_risk_level` in
   the audit table waits for it.
3. **Block repeat disputers** (Radar rule, owner). 4 people account for 9 of the last 15 disputes.
   Radar can block a card, and a customer, with a prior dispute on this account — the Radar
   Assistant builds it from *"block payments from customers who have disputed before"*. Cheap,
   immediate, and the only item here that targets the pattern in the data.
4. **Radar Session** (code, small, follow-up). `stripe.createRadarSession()` on the client and
   `radar_options.session` on `createPaymentMethod` gives Radar device signals at setup time;
   `radar_options` is `{}` on every charge today. Not in this MR — it needs the Stripe.js call in
   the card form and a plugin option check for the native sheet.
5. **3DS on setup** (design question). Today a 3DS-required card is **refused** on the card form
   (`422`, both old and new path). The native sheet handles 3DS itself. Adaptive 3DS on
   SetupIntents shifts liability for authenticated cards — worth turning on once the sheet is the
   main path.
6. **Submit evidence every time** (process). 8 of 15 disputes had no evidence submitted; both wins
   had it. The audit row plus the order's delivery log is the pack. Stripe Smart Disputes can
   auto-assemble it.
8. **Card scanning and native saved cards** (owner question, 2026-09-08, with a TestFlight screenshot
   of the G40-38 sheet). Both come from the **native PaymentSheet**, not from the card form:
   - *Scan card* is already there — the owner's screenshot shows Stripe's "📷 Scan card" link on
     iOS. It is the Stripe iOS SDK's built-in camera scanner (no extra dependency, no config);
     the Android SDK's sheet has the same scanner. The Stripe.js card form in the WebView cannot
     scan and never will.
   - *Saved cards from the OS* — iOS Keychain / Safari AutoFill and Android Autofill (Google's
     saved cards): the sheet's card field is a native text field with the credit-card content
     type, so the keyboard offers "AutoFill Card" from the phone's saved cards behind Face ID /
     fingerprint. Again native-sheet only; a WKWebView form gets no card autofill.
   - *Apple Pay / Google Pay* is the other meaning of "saved cards" — the wallet. Already on the
     sheet when the device has a card in Wallet and the build carries the entitlement (the
     screenshot shows Link but no Apple Pay button: either that TestFlight build predates the
     entitlement merge, or the device has no card in Wallet — `canMakePayments` is false).
   - *Link* ("Pay with Link", "Save my info for faster checkout with Link") is Stripe's own
     saved-card wallet across merchants; it is on by owner decision (G40-38).
   **Verified on the Samsung (Android 11, 2026-09-08 evening), G40-11 test build:** tapping *Card
   number* in the sheet raised the phone's autofill service — Samsung Pass — offering "Add card
   using camera" (this phone has no card saved in Samsung Pass; one that does gets a one-tap fill).
   Google Pay was the top button. So OS autofill + wallet are live on the sheet with no code.
   **Added the same evening (owner: "The younger generation especially is NOT a fan of manual
   entry"):** both surfaces now start from the account's **name + saved home address**
   (`billingPrefillFromProfile` → the sheet's `defaultBillingDetails`; the card form's billing
   block), editable, so a typical add is card number + expiry + CVC. Commit `9ef3999f9` on the app
   branch.
   **Bank tile, Android half (for G40-38):** with `email:'never'` the Android sheet showed *Card*
   and *Cash App Pay* only — no Bank tile **and no Link**. G40-38 pointed out (correctly) that Link
   is a decided deliverable (Decision 2, 2026-09-06), so `'never'` was trading Link away.
   **Changed the same night:** the sheet now collects email `'automatic'`; Link returns, and the
   Bank tile is hidden by the owner's Dashboard toggle (Link → Instant Bank Payments OFF, still an
   owner action). If the owner prefers to drop Link, that is a Decision 2 change and belongs in
   the G40-38 doc §5, not here.
   **So the answer is: make the native sheet the only path on a device.** It already is when the
   plugin initialises; the card form remains only as the web / init-failure fallback. Note what
   the screenshot also shows: the sheet in that build asks for *Country + ZIP* only (Stripe's
   default `address: 'automatic'`) and offers *Bank* — both pre-date this ticket and !518. The
   G40-11 build asks for the **full** billing address (`address: 'full'`) and !518 removed Bank.
7. **Block prepaid cards** (Radar rule, judgement). `:card_funding: = 'prepaid'` — common for
   fraud, but also for legitimate low-income users; review-not-block is the safer start.

---

## 7 · 101 guides and Terms of Service — owner directive 2026-09-08

**Owner, 2026-09-08 (after approving the UI): "This info is important to add to the 101 docs and
ToS."** That overrides the earlier "hold the guides until the build ships" reading of rule 5.

**Done in the Code repo (same commit as this doc):**

- `Final/gopher-request-101.html` — new "Adding a card" under *Payment method*: the five fields,
  the bank's address check, the 6-digit code to the phone on the account, 5-minute expiry, one
  resend, "the card is not saved until the code is confirmed", and a *Why the extra step?* tip.
- `Final/gopher-connect-101.html` — same section under *Account & users*, plus who can add a card
  (Owner / Admin; a User seat cannot).
- `Final/gopher-terms-of-service.html` (the rebuild ToS) — new **§19 · Payment Method
  Verification** subsection, text below.

**Live gophergo.io Terms — DONE by the ToS session (commit `632f31f`, 2026-09-08 evening), paste
still the owner's.** The clause sits after *Fraudulent Chargebacks and Restitution* in BOTH copies:
`gophergo-io-terms-CORRECTED.html` (readable) and `gophergo-io-terms-CORRECTED-ascii.html` — **the
ASCII file is the WordPress paste copy** (0 bytes > 127; em dashes and curly quotes as `&mdash;` /
`&rsquo;`, because raw ones produced mojibake in Elementor on 2026-09-07). Paste from the ASCII
file, never from the snippet below, which is kept for the record only.

⚠️ **Flag for the owner before he pastes (raised by the ToS session, agreed here):** the second
paragraph tells a customer that the verification record "forms part of the evidence" in a
chargeback. The record exists only for cards added through the verified flow — i.e. after the app
build ships and the env floor is set. For any card added before that (every card on file today),
there is no such record, and a contested chargeback from that window would be argued without it.
Two ways out, the owner's call: (a) paste as written and accept that the sentence describes the
flow going forward; (b) soften to *"where a verification was performed, its record forms part of
the evidence"*. Neither changes the app.

Original snippet (readable form; entity-encode before any paste):

```html
<p style="font-weight: 400;"><strong>Payment Method Verification</strong></p>
<p style="font-weight: 400;">When you add a card to your Gopher account we collect the name on the card and the billing address on your card statement and pass them to our payment processor, Stripe, so your card issuer can verify them. We then send a one-time code by text message to the phone number on your account; the card is not saved until that code is entered. You agree that entering the code is your authorization to save the card and to charge it for requests you place under these Terms.</p>
<p style="font-weight: 400;">Gopher, Inc. keeps a record of each card verification — including the card brand and last four digits, the result of the issuer’s address and security-code checks, the phone number the code was sent to (masked), the device and network address used, and the time — for as long as needed to prevent fraud and to respond to payment disputes and chargebacks. This record forms part of the evidence described under Fraudulent Chargebacks and Restitution.</p>
```

⚠️ **Honesty note.** The 101 text describes the flow the owner approved on 2026-09-08. It goes live
on the website ahead of the store build that ships it in the app. That was the owner's call; do
not "correct" the guides back.

---

## 8 · QA (device — owner)

1. Card form: with any field empty, Save is grey. Fill all five → Save is navy.
2. Save → the code step appears; a text arrives on the account phone within seconds.
3. Wrong code → "Incorrect code. N attempts left." Right code → "Your card has been added!" and the
   card is in the list, default if the toggle was on.
4. Resend → second text, "Code already resent once" afterwards.
5. Let a code expire (5 min) → "That code has expired. Send a new one." Resend revives it.
6. Five wrong codes → the step closes, "The card was not saved"; the card is **not** in the list.
7. Stripe Dashboard → the new payment method shows name + billing address, and
   `address_postal_code_check: pass` (or `fail`, if you use a wrong ZIP on purpose).
8. `card_verification_events` has one row per attempt above with the matching `otp_status` /
   `outcome`, IP and user-agent.
9. Native sheet (Account → Payment Methods → Add): the sheet asks for name + full address; after
   it closes, the code step appears; the card is listed only after the code.
10. An old build can still add a card the old way. ⚠️ With the gate OFF (no env floor) the legacy
    path is simply allowed and logs nothing; the "unverified card attach allowed for legacy build"
    line appears only once the floor is set and an older build calls `/attach`.
11. **Bank tile (G40-38 ask):** with `email:'never'` the iOS SDK hides Link's "Bank" tab
    (Instant Bank Payments). Check the sheet on **both** platforms — Android's SDK may gate it
    differently — and write the finding into the G40-38 doc's "iOS device QA on build #260"
    block as well as here. This session has the Android; the iPhone is G40-38's QA device.

---

## 9 · Figma references (from the ticket)

- Card entry screen 1 — <https://www.figma.com/design/g7DWLbI86O6SqiwITY7jeL/%E2%9C%8F%EF%B8%8F-Gopher-UI_UX?node-id=5945-10274>
- Card entry screen 2 — <https://www.figma.com/design/g7DWLbI86O6SqiwITY7jeL/%E2%9C%8F%EF%B8%8F-Gopher-UI_UX?node-id=5945-10275>
- Stripe: <https://docs.stripe.com/disputes/prevention/verification> · <https://docs.stripe.com/radar/rules>
