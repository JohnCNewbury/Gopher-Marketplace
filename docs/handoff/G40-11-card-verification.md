# G40-11 — Verified card add: billing address + AVS/CVC/Radar, SMS code before save, dispute audit log

**Type:** Task (child of Epic G40-1 "Bug Fixes & Polish") · **Priority:** Medium · **Assignee:** John Newbury
**Sprint:** Payment Options (2026-09-07 → 09-16) · **Status:** In Progress — **BUILT, blocked on the owner** (UI approval + device QA)
**Groomed:** 2026-07-02 · **Built:** 2026-09-08 (this doc rewritten the same day; the July spec survives as §1)

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

| Piece | State | Where |
|---|---|---|
| Backend — three endpoints, appversion gate, audit table | **MERGED + LIVE 2026-09-08 17:29 ET** — merge commit `aa499b27`; `POST /users/payment_methods/verify/start` went 404 → 440 ("sign in") on production, `apiversion` 200 | [`gopher-backend-api!525`](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/525) · branch `feat/g40-11-card-verification` · target `production` · squash **no** · delete source **no** |
| Requester app — card form + native sheet + code step | **Built, lint-clean, unit-tested, Draft MR** | [`gopher-mobile-requester-capacitorjs!287`](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/287) (Draft) · branch `G40-11-card-verification` · target `production` · squash **no** · delete source **no** |
| Prototypes — Request web, Connect, Request app prototype | **DEPLOYED 2026-09-08** — deploy `609fd81` → `origin/main`; content-verified on Pages AND TigerTech (`payOtpBoxes` ×2 in gopher-request.html, `addpayOtpBoxes` ×2 in gopher-connect.html); the three riders were HELD BACK per the owner ("exclude them") and are NOT live | [`docs/handoff/G40-11-prototype.patch`](G40-11-prototype.patch) is now history, not a to-do |
| Side-by-side (current vs proposed, all three surfaces) | **Published** | <https://claude.ai/code/artifact/000285b0-12e0-4f5e-a04b-72d9a790c403> (private artifact; the Request/Connect frames are rendered from the actual page code) |
| Stripe Dashboard Radar rules | **Owner action — unverified** (Dashboard needs a login) | §6 |
| 101 guides + Terms of Service | **LIVE on the site 2026-09-08** (same deploy; "Adding a card" in both 101s, "Payment Method Verification" in the ToS, verified on both hosts) · live gophergo.io Terms: handed to the **ToS session** by message (its file is in flight) | §7 |

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
   and *Cash App Pay* only — no Bank tile, no Link — matching what !518 wanted. iOS half is G40-38's.
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

**Live gophergo.io Terms — owner paste (WordPress).** `docs/handoff/gophergo-io-terms-CORRECTED.html`
is another session's in-flight file (uncommitted edits in the tree), so it was not touched. Paste
this after the *Fraudulent Chargebacks and Restitution* paragraphs:

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
