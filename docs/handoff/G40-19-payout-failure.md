# G40-19 — Payout-card management: failed-transfer recovery + last-card protection

> ## ✅ BUILT 2026-09-08 — this file is no longer a "to build" brief. Read this box first.
>
> Everything under **"🔧 TO BUILD"** below was written in July, when the scope rule reserved
> payments for a human developer who does not exist. That rule was retired 2026-08-09. The work
> has now been done, and **the sections below are kept for their reasoning, not their status.**
> Where this box and anything lower down disagree, this box is right.
>
> ### What is already LIVE in production
>
> | Ticket AC | State | Where |
> |---|---|---|
> | **AC2 — payout-failure email** | **LIVE since 2026-07-30** | G40-343, `6e4b08f9`. Dispatcher type **35**, `views/payout-failed-2026.ejs`. Sent from `support@gophergo.io` (`SENDGRID_EMAIL` is unset), **not** `admin@gophergo.io` as the 2024 ticket text says — the branded 2026 template was owner-approved on its own terms. Raise it if the address matters. |
> | **G40-194 — last payout card cannot be deleted** | **LIVE** | Server: `lib/payment.stripe.js delete_payout_card` throws **422** when it is the only card, counting all cards regardless of health. Client: `cardseperateview.js` hides Delete and shows *"Add a new eligible card to remove this one."* Both halves shipped; G40-194 is Canceled and linked as a duplicate. |
> | **The debit-card update screen** | **LIVE** | `PAYOUT_CARD_ROUTE` = `/form` with `state.next = "payout"` (`src/helpers/payoutAttentionCopy.js`). The deep-link target the ticket asks for already exists; nothing new was designed. |
>
> ### What was built on 2026-09-08 — two MRs, both awaiting the owner's merge
>
> **`gopher-backend-api!528`** — branch `G40-19-payout-truth` → `production`, squash **no**, delete source **no**.
> **`gopher-mobile-gopher-capacitorjs!282`** — branch `G40-19-payout-failed-push-tap` → `production`, squash **no**, delete source **no**.
>
> | AC | What was wrong in production | What now does it |
> |---|---|---|
> | **AC4** | `Payout Completed` was written the moment `stripe.payouts.create()` **resolved** — Stripe *accepting* a payout, not depositing it. An instant payout to a dead card is accepted and fails minutes later. | `payout.paid`, and only `payout.paid`, writes it (`controllers/admin/stripe_payout_webhook.js`). The two creation sites now write **`Payout Initiated`**. |
> | **AC5** | That write happened in the **same handler** that had written `Requester Confirmed for Order Completion` seconds earlier. | The two events now come from two different sources; one of them is Stripe. |
> | **AC3** | `payout.failed` wrote only `Payout Failed : <reason>` — a row the worker **never sees**, because `controllers/order/retrieve.js` filters worker order-log notes through an exact-match allowlist it is not in. | A second, worker-facing row in the ticket's exact words: **`PAYOUT FAILED (Please add a new debit card)`**, added to the allowlist. The support row is deliberately left out of it. |
> | **AC1, push** | Nothing was pushed on a payout failure at all. | New notif type **`gopher.payout_failed`**; the Go app's `PushTapListener` routes the tap to `PAYOUT_CARD_ROUTE`. |
> | **AC1, in-app popup** | `users/payment_account/check` keys **only** off `requirements.currently_due`. After a failed payout Stripe flips the *card* to `status: 'errored'` and often leaves `payouts_enabled` true and `currently_due` empty — so the endpoint answered `action: null` and **no modal fired at the one moment it mattered.** | `helpers/payout_attention_policy.unusable_default_card_attention` — one shared verdict now used by **both** `get_gopher_cards` and `payout_account_check`. **No store release needed:** shipped builds already render this modal and already route on `action === 'add_payout_card'`. |
> | **AC2, completeness** | The email carried no card last 4. | It does now, when the card can be read; the sentence still reads correctly when it cannot. |
>
> ### ⛔ Three things the next person must not undo
>
> 1. **The note strings are allowlisted by EXACT MATCH.** `Payout Initiated`, `Payout Completed` and
>    `PAYOUT FAILED (Please add a new debit card)` are compared literally in
>    `controllers/order/retrieve.js`. Reword any of them and the entry **silently disappears from
>    every worker's request history** — no error, no failing test except
>    `test/g40-19-payout-truth.test.js`, which pins each string to its writer for this reason.
>    They were **added, never swapped**: `Payout Completed` stays so years of historical rows keep
>    rendering.
> 2. **`gopher.payout_failed` is one value in two repositories** — the `case` label in
>    `controllers/order/notification.js` and the literal comparison in the Go app's
>    `PushTapListener.js`. The requester app shipped a shortened form its client never matched and
>    the deep link was dead in production. `scripts/assert-push-tap-delivery.js` now fails if they
>    drift.
> 3. **The reconciliation sweep is not optional scaffolding.** `confirm_payout_deposits`
>    (`middleware/cronTasks.js`) reads the payout back from the Stripe API for anything unresolved
>    after 45 minutes. It is what makes "Payout Completed" correct **with zero Stripe dashboard
>    configuration**, and therefore what makes the deploy and the console change safe in either
>    order. Remove it and the feature depends on a setting nobody can see from the code.
>
> ### Two owner actions in the Stripe dashboard, after the merge (neither is a blocker)
>
> 1. Add **`payout.paid`** and **`payout.failed`** to the connected-accounts destination
>    **`we_1U48wRCQp3eawbpnIytySy6n`** → `/api/v1/admin/endpoint/stripe_account`. That is the
>    **signature-verified** endpoint. Until this is done the sweep does the work within ~45 minutes.
> 2. Then disable **`we_1Q43GzCQp3eawbpnMqmqsfsc`** → `/endpoint/payout_error`, which is mounted
>    with **no signature verification at all** — anything on the internet can post a fabricated
>    payout event to it. That predates G40-19 and is not widened by it (no money moves on the
>    event), and this work is what makes the move possible without a further deploy.
>
> ### Still not verified, and honestly so
>
> No real failed payout has been driven end to end. Every claim above is from reading the live code
> and the live Stripe webhook configuration, plus 31 automated checks — **not** from watching a
> worker's card decline. The handset half of AC1 (the tap) additionally needs a store release.


> **Umbrella note (2026-07-07):** G40-19 now **absorbs G40-194** ("Prevent deletion of the last payout card").
> Both are the same worker payout-card recovery flow — a payout fails → the Gopher must add a replacement,
> and they must never be able to delete their only card mid-recovery and orphan the Stripe account. G40-194
> is to be **canceled as a duplicate**, merged here (full backend fix in the "Merged: G40-194" section below).
> Two new modals (payout-failure alert + last-card "Attention!") are built to **G40-308** in
> `docs/handoff/G40-308-modal-kit.html` and tracked in `docs/handoff/G40-309-modal-dispositions.md`.

**Jira:** G40-19 (Task, High) · Component **Gopher Go App** · Label `worker` · Fix version *Phase 1 — Bug Fixes & Polish* · **absorbs G40-194** (`pay`, Bug)
**Assignee:** John Newbury
**Surface:** worker app — `Final/gopher-go.html` (the redesigned Gopher Go dashboard)
**Scope of this branch:** FRONT-END / prototype reference only. No payment, webhook, email, or
push code was written — per `Final/CLAUDE.md`, Payments/billing is reserved for the human dev.
What's below is the visual/UX reference the dev builds against, plus the exact backend contract.

---

## TL;DR for the developer

The **UX is fully specced and the front-end reference is built** in `gopher-go.html`. Your work
is the **backend that drives it**: detect the failed Stripe payout, fire the push + in-app popup,
send the email, and make the Request-History payout log tell the truth. Everything you need
(copy, template, deep-link target, log wording, timing) is in this doc or already on-screen in the
prototype. **There are no open questions — do not go discover anything. Build to this contract.**

Two facts John confirmed for this ticket:
1. **Build scope** — all three front-end pieces were built into the prototype (below).
2. **Email + push infrastructure already exists but is *intermittent/unreliable* today.** So this
   ticket's backend must **make delivery reliable** (queue + retry + delivery logging), not assume
   a fresh build and not assume the current path "just works."

---

## ✅ DONE in the prototype (front-end reference — `Final/gopher-go.html`)

All additive, tagged with `G40-19` in comments. Verified: all 5 inline scripts parse clean.

1. **Payout-failure alert popup** — a modal (`#payoutFailOverlay`) matching the app's existing
   `.rhm-overlay` pattern. Shows the failed card's last 4, the failed amount, and the retry
   sequence. Primary CTA **"Update debit card →"** deep-links straight to **Payout Info → Add a
   new card** via the shared `goToPayoutAddCard()` helper (jumps the dashboard nav to the `payout`
   section and opens the add-card form). This is the **in-app popup** half of Scenario 1.
   - Preview it: dashboard → **Payout Info** → **"▶ Preview payout-failure alert"** (`#pfDemoBtn`,
     a clearly-labeled prototype-only trigger). In production this button goes away — the modal is
     opened by your failed-transfer handler instead.

2. **Request History — "Payout issue" state.** New third tab **Payout issue** (`data-st="failed"`).
   A live failed job (`#20955`) renders a red **PAYOUT FAILED** pill + prompt *"please add a new
   debit card to receive your $52.00"* + an **Add a new debit card →** button that deep-links to
   Payout Info. Its detail log ends on a red `PAYOUT FAILED` event. This is Scenario 3 on-screen.

3. **Decoupled / verified payout log (the core bug fix).** In the seeded history:
   - The three completed jobs no longer log **"Requester confirmed"** and **"Payout completed"** at
     the *same* timestamp — completion is now a **later, separate** event worded
     `Payout completed · $X · deposit verified`.
   - A recovered job (`#20948`) demonstrates the full ticket arc across two days:
     `Order completed → Requester confirmed → PAYOUT FAILED → New debit card added →
     Payout re-initiated → Payout completed · deposit verified` (next-day). This is Scenarios 4 & 5.

The **debit-card update screen the ticket asks for already exists** — it's the **Payout Info**
section (`data-dash-section="payout"`, "Add a new card"). No new screen is needed; the deep-link
target is built.

---

## 🔧 TO BUILD (developer / backend — this is the real ticket)

### 1. Detect the failed instant transfer (Stripe)
- Wire a **Stripe webhook** for failed instant payouts to the Gopher's debit card. On Stripe
  Connect express/custom, a failed instant payout surfaces as a **`payout.failed`** event on the
  connected account (verify against the account's actual payout mechanism); the failure reason maps
  to "card expired / no longer valid / compromised."
- Payout status must be driven **only** by Stripe's deposit confirmation — **never** inferred from
  the Requestor's confirmation (see #4).

### 2. Notify immediately — push + in-app popup (fire simultaneously)
- On failure detection, fire **both** a **push alert** and the **in-app popup** at once.
- **Push tap** and **popup CTA** both deep-link to the **debit-card update screen** (Payout Info →
  add card). Front-end target + helper already exist (`goToPayoutAddCard()` / `#payoutFailOverlay`).
- ⚠️ Push is **intermittent today** — implement reliable delivery (queue + retry + delivery log),
  and make the in-app popup the guaranteed fallback since it doesn't depend on push tokens.

### 3. Automated email — from `admin@gophergo.io`
Send on failure detection. **Intermittent today → make it reliable (queue + retry + log the send).**
Dynamically populate: **first name, last name, card last 4, order #, failed payout amount.**

- **From:** admin@gophergo.io
- **To:** Gopher's email on file
- **Subject:** `Payout error for order #[Order #]`

```
Hi [First] [Last],

It appears Stripe is showing your card ending in [last 4] is no longer valid (typically this
means the card is either expired or compromised). You'll need to enter a new debit card to
receive the transfer.

The $[amount] will continue unsuccessfully attempting to deposit on this card until a new card
is updated.

The sequence works like this:
 • Once updated, the next business day the new card is assigned to the existing payout balance.
 • The following business day, the deposit is received on the new card.

We know things happen, but to avoid payout delays, you'll want to make sure you always have a
valid debit card on file. It delays payouts to the point where Gopher, Inc can't help speed up
the process. Rest assured the money is yours — you'll now just need to let Stripe and your bank
run its course.

Regards,
Gopher Support Team
```

### 4. Fix Request-History payout logging (the data-integrity core)
- Log **`PAYOUT FAILED (Please add a new debit card)`** with a timestamp on failure. Do **not** log
  "Payout Completed" in this case.
- Log **`Payout Completed`** **only** once Stripe confirms the deposit succeeded (after the card is
  updated and the retry lands). Timestamp it at the actual deposit time.
- **"Requestor Confirmed"** and **"Payout Completed"** are **independent events** — never write them
  together / at the same instant. Requestor confirmation must not imply payout success.
- Front-end wording/format to match (already reflected in the prototype):
  - `3/19/2024 08:05 PM: PAYOUT FAILED (Please add a new debit card)`
  - `3/20/2024 08:05 PM: Payout Completed`

### 5. Retry sequence (business rule)
- After a new card is added: **next business day** the new card is assigned to the existing payout
  balance; the **following business day** the deposit is received. Reflect these states in history.

---

## Acceptance criteria → where it lives

| Scenario | Front-end reference (done) | Backend (to build) |
|---|---|---|
| 1 — push + in-app popup, deep-link to card screen | `#payoutFailOverlay` + `goToPayoutAddCard()` | Stripe detect → fire push+popup; reliable push |
| 2 — automated email w/ name, last 4, amount, retry steps | template below (copy locked) | send from admin@gophergo.io, reliable + dynamic |
| 3 — history shows PAYOUT FAILED, no "Payout Completed" | "Payout issue" tab + job `#20955` | write real log entry on webhook |
| 4 — "Payout Completed" only after verified deposit | recovered job `#20948` (verified, next-day) | gate on Stripe deposit confirmation |
| 5 — Requestor Confirmed ≠ Payout Completed (not simultaneous) | decoupled timestamps in seeded logs | decouple in real logging pipeline |

## QA (from ticket) — test on iOS **and** Android
Simulate a payout failure on completion → popup + push fire immediately; both deep-link to the
card screen. Email arrives from admin@gophergo.io with correct dynamic fields. History shows
PAYOUT FAILED (no Payout Completed). Update card + confirm deposit → Payout Completed appears with
correct timestamp. Confirm Requestor Confirmed and Payout Completed never log together.

## Dependencies / notes
- Stripe webhook for failed instant-transfer events (drives everything).
- Email/push infra **exists but is intermittent** → reliability (queue/retry/delivery log) is in scope.
- Payout status in history must be decoupled from Requestor confirmation and driven by Stripe only.
- Figma: alert/history — https://www.figma.com/design/aRFH8dqUfSHLJTb89VZYNh/Jira-Tickets?node-id=21-10645 ·
  debit-card screen — https://www.figma.com/design/aRFH8dqUfSHLJTb89VZYNh/Jira-Tickets?node-id=22-11093

## Prototype limitations (do not mistake for real behavior)
The prototype has no backend: the failure trigger is the manual **Preview** button, the history is
seeded JS (`HISTORY[]`), and no email/push/Stripe call is made. It exists to lock the copy, states,
timing, and deep-link — not to function. Build the real pipeline against the contract above.

---

# Merged: G40-194 — Prevent deletion of the last payout card

The other half of payout-card management. When a payout fails (above), the Gopher must add a replacement —
but they must never be able to delete their **only** card and orphan the Stripe connected account's payout
method. This is the guard on that recovery flow. **Verified against the 2026-06-12 `gopher-backend-api` export.**

### Root cause (verified)
Deleting a payout card runs with **no check on how many cards remain**:
- **Controller** — `controllers/user/payment.js:383 delete_payout_card` (route `controllers/user/index.js:193`,
  `DELETE .../payout-card/:cardid`) calls `payment_actions.delete_payout_card(id, cardid)` directly — **zero guard**.
- **Lib** — `lib/payment.stripe.js:583 delete_payout_card` → `stripe.accounts.deleteExternalAccount(stripe_id, card_id)`,
  detaches unconditionally.
- A lister already gives the count for free: `lib/payment.stripe.js:56 get_gopher_cards(id)` returns every
  `external_accounts.data` entry (all cards, regardless of health).

### The fix (server-side — the business rule requires it before the Stripe detach)
```js
// lib/payment.stripe.js — delete_payout_card, BEFORE deleteExternalAccount
const cards = await this.get_gopher_cards(id);            // existing lister
if (!cards || cards.length <= 1) throw createHttpError(409, 'LAST_PAYOUT_CARD');
await stripe.accounts.deleteExternalAccount(stripe_id, card_id);
```
- **Count ALL cards regardless of status** — expired/declined still count (Scenario 5); don't add a health filter.
- Put the guard in the **lib** so every caller is covered; the controller (`:383`) already propagates via
  `next(error)` → the app receives a distinct, mappable `LAST_PAYOUT_CARD` code.

### Edge cases for the dev
- **Default-card handling** — if the deleted card was `default_for_currency` and others remain, Stripe may not
  auto-promote; call `set_default_payout_card` (`payment.stripe.js:607`) after so a default always exists.
- **Concurrency** — two simultaneous deletes could each read `count=2` then both detach → 0; re-check immediately
  before the detach (or accept the tiny risk) and note for QA.
- **Verify the real Stripe cascade** — Stripe doesn't literally delete a connected account when its last external
  account is removed, but it can't receive payouts; the guard (never 0 cards) is correct regardless. QA confirms
  account + payout history survive a blocked attempt (Scenario 4).

### Acceptance mapping (G40-194 scenarios)
S1 block only-card delete → `length <= 1` guard + modal · S2 add-then-delete → 2 cards passes (keep a default) ·
S3 multi-card delete → passes, no modal · S4 account preserved → never reaches 0 · S5 bad card can't be removed →
guard counts all regardless of health.

### Files to touch
`lib/payment.stripe.js` (`delete_payout_card` `:583` + `set_default_payout_card` `:607`),
`controllers/user/payment.js` (`:383` surface the code), Gopher Go app (delete handler → "Attention!" modal on 409).

---

# The two modals (built to G40-308, tracked in G40-309)

Both are **Gopher Go worker** modals → **Guide B (bottom sheet)**. Built as reusable `GSheet` configs in
`docs/handoff/G40-308-modal-kit.html` (click **"Payout failed (G40-19)"** / **"Last card — Attention!"**), and
logged in `docs/handoff/G40-309-modal-dispositions.md` under *"New — built to G40-308"*.

1. **Payout-failure alert** (`demoB('payoutfail')`) — icon badge, title *"Payout couldn't be sent"*, sub with the
   card last-4 + failed amount, a 2-step retry list (next business day → following business day), CTA
   **"Update debit card →"** (deep-links to Payout Info → Add a new card), close **"Later"**.
   **✅ The prototype `#payoutFailOverlay` in `Final/gopher-go.html` is now reskinned to this standard**
   (2026-07-07): moved off the ad-hoc `.rhm-overlay`/red-CTA onto the file's `.gc-modal` — the G40-308
   centered-card component this surface already uses (navy title, **Shamrock-green** primary w/ ink-on-green,
   warn-tint icon badge, close × + outlined "Later"). The kit demos the Guide-B *sheet* form; this dashboard
   surface uses the centered-card form — both are valid G40-308.
2. **Last-card "Attention!"** (`demoB('lastcard')`) — blocking; title *"Attention!"*, sub *"Stripe requires a card
   on file…"*, primary **"Add New Card"** (John's option-1: route straight to add-card, less friction), secondary
   **"Back"**. Shown on the `409 LAST_PAYOUT_CARD` response.

---

# Jira actions (pending — apply when the Atlassian connection is back)

The Atlassian MCP was disconnected when this merge was done, so these ticket ops are **staged, not yet applied**:
1. **G40-19** — append the "Merged: G40-194" + modals content to the description (or link this handoff); note it
   absorbs G40-194; keep In Progress / assigned to John.
2. **G40-194** — **Cancel** ("no longer necessary"), link **duplicates → G40-19**, comment: *"Merged into G40-19
   (payout-card management umbrella) — same worker payout-card recovery flow; full backend fix + Attention! modal
   carried into G40-19; modals built to G40-308 (kit + G40-309 tracker)."*
