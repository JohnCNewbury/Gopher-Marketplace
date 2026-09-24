# Payout setup is unreachable — the debit card is never tokenized

**Jira:** [G40-360](https://gopherapp.atlassian.net/browse/G40-360) (Bug, High) · Component **Gopher Go App** · Label `pay` · Assignee John Newbury · *relates to* G40-19
**Written:** 2026-08-09, from a live support case.
**Surface:** worker app (`gopher-mobile-gopher`) — Payout Account → Debit Card screen.
**Backend:** `gopher-backend-api` (correct as-is; see §5 — do not "fix" the backend).
**Scope:** DIAGNOSIS ONLY. No code written. Payments/billing is reserved for the human dev per
`CLAUDE.md` → *Scope of AI work*.

> **This document is the source of truth, not the ticket.** G40-360 carries the repro and the
> acceptance criteria and dies with the fix; the reasoning, the ruled-out theories and the scale
> caveat live here and outlive it.
>
> **No customer details appear in this document.** The repo is public. The defect is universal —
> it does not depend on the user, their card, or their bank — so the repro below needs no real
> account to reproduce.

---

## 1. TL;DR for the developer

> **⚠️ CORRECTED 2026-08-13 — two claims below were wrong. See §5.** This became a **live outage**
> (135 workers blocked over ten days), and it was **fixed backend-only**, not by a store release.

**`payoutCard.js` never calls Stripe.** `external_account_token` — the field that is supposed to
carry the debit card the worker just typed — is populated there by reading an id out of
`localStorage`.

**But the app *does* tokenize**, in the form definition rather than that component:
`src/json/gopher/payout_detail.json` → `on_click_actions[2]` chains
**create account → `setStripeId` → tokenize the card → set token → attach card**. *(This doc
originally said "no tokenization happens anywhere in the payout flow." That was wrong — it traced the
component and missed the form driving it.)*

For a worker with no connected account, that `localStorage` id is **null** — and the 2026-08-03
backend guard rejected the request:

> *"A debit card is required to set up your payout account. Please add your card and try again."*

**The trap is the ordering.** The guard rejected **step 1**, and the step that *produces* the token
only runs on step 1's success. So first-time setup could never succeed — any card, any device, any
number of retries. ("Add another card" kept working: it enters at the last step with a real token.)

**Fixed 2026-08-13, backend-only** (`eabf56d1`, live at `2b035d2d`): shipped app versions are exempt
from the guard, which now applies only from `PAYOUT_TOKEN_REQUIRED_FROM_VERSION` (default 46).

**Still worth doing app-side:** have `payoutCard.js` tokenize the entered card directly, so the flow
does not depend on the chained ordering. That half needs a store release — but it is an improvement
now, not the incident fix.

---

## 2. The failing path, end to end

| # | File (branch `origin/production`) | What happens |
|---|---|---|
| 1 | `src/component/payoutCard.js:45` | `formik.setFieldValue("external_account_token", stripe.stripe_id)` where `stripe = JSON.parse(localStorage.getItem("items"))` |
| 2 | `src/actions/action.js:455` | `items` is written at sign-in: `localStorage.setItem("items", JSON.stringify(data.data.data))` — i.e. the **user payload**, not a card |
| 3 | `controllers/user/auth.js` (login) | that `stripe_id` is the account's own Stripe id; the backend elsewhere tests `stripe_id.split('_')[0] === 'acct'`, confirming it is expected to be a **connected-account id** |
| 4 | `controllers/user/payment.js:174-179` | `if (!external_account_token) → 400` — the guard fires |

**Nothing in step 1 involves the card the worker typed.** The card number, expiry and CVV are held
in component state and used for display and validation only.

### The one Stripe call in the app is the wrong one

`src/component/cardComponent.js:54` calls `stripe.createPaymentMethod(...)` and then
`attachPaymentMethodToCustomer(...)`. That is the **requester-side** "add a card to pay with" flow —
it attaches a PaymentMethod to the Customer object. It is unrelated to payouts and it works
correctly.

That contrast is what makes this hard to diagnose from the outside: the worker adds their card,
Stripe shows it saved on the customer, and the payout screen still refuses. **Both observations are
true, and they concern different Stripe objects** — `cus_…` (how they pay) versus `acct_…` + an
external account (how they get paid).

---

## 3. Second defect in the same function

```js
const handleExpBlur = (name, value) => {
  ...
  formik.setFieldValue("external_account_token", stripe.stripe_id);
};
```

The assignment happens **only in the expiry field's blur handler**. Even once step 1 is fixed to
carry a real token, a worker who fills expiry last and submits without the field losing focus would
send an empty token again.

Fix both. Assign the token where it is produced, not from a blur side effect.

---

## 4. What this rules out — so support stops chasing it

| Theory | Verdict |
|---|---|
| "The card is not supported / not a real debit card" | **No.** The same card tokenizes successfully on the requester side. The payout path never asks Stripe about it at all. |
| "Delete the account and start fresh" | **No.** A new account has `users.stripe_id` null, which is the exact input that fails. Verified: deletion cascades to Stripe, so the rebuilt account starts from the same null. |
| "Don't name the card" | **No mechanism exists.** `cardName` is written to formik and used in exactly one place — rendering text on the card graphic (`payoutCard.js:143`). It never touches `external_account_token`. Reported anecdotally as a workaround; retested 2026-08-09 and it did not work. Attributing it to the name is a coincidence — the failure is deterministic on a null `stripe_id`, so anything the user varies looks random. |
| "Retry / re-enter the details" | **No.** Deterministic, not intermittent. |

---

## 5. ~~⛔ Do NOT change the backend guard~~ — SUPERSEDED 2026-08-13

> ### ⚠️ Read this before acting on anything below it
>
> **This section said the guard was correct, must stay, and that "the app is what is broken." That
> was wrong, and acting on it would have prolonged a live outage.** It is kept rather than deleted
> because the reasoning is instructive — but **do not follow it**.
>
> **What actually happened.** The 2026-08-03 guard (`c035d968`, MR !210) did not merely prevent bad
> accounts — it **stopped payout setup completely**. Measured: workers completing setup ran 22–32%
> per signup-week for nine weeks, then **3.3%, then 0.0%**. Last success was **9h23m before the guard
> merged**. **135 workers blocked, growing 25–30/week, for ten days.**
>
> **Why the guard was self-defeating.** The account-creation call is step 1 of a five-step chain in
> `src/json/gopher/payout_detail.json` → `on_click_actions[2]`:
>
> ```
> callApi POST {baseurl}/users/payment_account      ← the guard rejects HERE
>   └─ on_success: setStripeId
>   └─ on_success: callApi https://api.stripe.com/v1/tokens   ← tokenize, never reached
> ```
>
> The guard demanded a token that is only produced **after** the call it was rejecting. It closed the
> door on the room containing its own key. ("Add another card" kept working because it enters at the
> last step with a real token already in hand.)
>
> **Resolved 2026-08-13** (`eabf56d1`, live at `2b035d2d`) by **exempting shipped app versions**
> rather than removing the guard: it now fires only when `appversion >= PAYOUT_TOKEN_REQUIRED_FROM_VERSION`
> (default 46). Shipped apps send a lower version and proceed; an unknown or unparseable version is
> treated as legacy and let through, so the failure direction is "allow", not "block". When the fixed
> app ships, raise that env var to re-arm the guard — no deploy needed.
>
> **The protection this section defended is still real** — a Custom connected account created with no
> external account is born `past_due` and cannot pay out. That is exactly why the fix was an exemption
> rather than a revert. **The error was not the guard's intent; it was shipping a precondition the
> client could not satisfy, and never driving first-time setup afterwards.**

**The original text follows, superseded.**

`controllers/user/payment.js:174-179` is **correct and must stay**. It is the prevention half of the
2026-08-03 fix (MR !210). Its own comment records why:

> A Custom connected account created without an external account is born `past_due` on
> `external_account` and can never pay out … Stripe's hosted onboarding cannot rescue them because
> it does not collect a debit card.

Before that guard, a missing token minted a connected account with **no payout method** — permanently
unrepairable from inside the app. Relaxing the guard to "let them through" would resume manufacturing
those accounts. **The 400 is the system working. The app is what is broken.**

⚠️ **One line in that comment was wrong — and this doc got it half right:**

> *"The app does send this token (payoutCard.js sets it from the tokenize result), so a missing one
> means tokenization failed or was skipped."*

`payoutCard.js` does not tokenize — **but the app does**, in the form definition
(`payout_detail.json`), which this doc traced past. So "there is no tokenize result" was itself
wrong: there is one, it just runs *after* the rejected call. The corrected guard comment now says so.

---

## 6. Scale — stated as a hypothesis, not a finding

G40-13 records that `create_payout` accepting a missing `external_account_token` minted payout-less
accounts for **~44,662 workers**, remediated in MR !209. Separately, ~42,800 workers are recorded as
having **no Stripe account at all**.

This defect is a plausible and probably major contributor to the second figure, because it blocks
first-time setup completely. **It has not been measured**, and it should not be quoted as the cause
until someone does. What is certain is the mechanism; the share of the population it explains is not.

---

## 7. Acceptance criteria

1. A worker with **no** existing connected account can complete payout setup end to end and reach
   `payouts_enabled: true`.
2. The token sent as `external_account_token` is produced by tokenizing the entered card, and is a
   Stripe card/bank token — never an `acct_…`, `cus_…`, or any id read from `localStorage`.
3. Submitting without a successfully tokenized card is blocked **in the app**, with a message naming
   what is missing — the backend 400 is a backstop, not the user-facing path.
4. Filling the expiry field last and submitting immediately still sends the token (no dependence on
   blur).
5. A tokenization failure returned by Stripe is surfaced to the worker with Stripe's reason, not
   swallowed.
6. The backend guard at `payment.js:174-179` is unchanged, and its stale comment is corrected.

---

## 8. What was NOT verified

- **The shipped binary.** This traces `origin/production` of `gopher-mobile-gopher`. It was not
  confirmed that the store build in the field is byte-identical to that branch.
- **The exact runtime value** of `localStorage["items"].stripe_id` on a real device. The null path is
  inferred from the login payload shape and from the observed 400, which only fires on a falsy token.
- ~~**Whether any worker has ever completed payout setup on the current app build.**~~
  **ANSWERED 2026-08-13 — and the answer changed the diagnosis.** They have, routinely: completion
  ran **22–32% per signup-week for nine weeks**, then **3.3% (w/c Aug 3)**, then **0.0% (w/c Aug 10)**.
  Last success was **9h23m before the 2026-08-03 guard merged**. So the app build was never the
  blocker on its own — the guard was, and this doc's original framing ("the app is what is broken")
  followed from leaving this question open. **When a doc lists something as unverified, that item is
  usually the one holding the wrong conclusion in place.**

---

## 9. Related

| | |
|---|---|
| **G40-13** | Stripe payout account type — records the missing-token remediation (!209) and prevention (!210). Does **not** cover why the token is missing. |
| **G40-19** | Payout-card management: failed-transfer recovery, last-card protection. Different flow — recovery, not first-time setup. |
| **G40-271 / G40-13** | The payout-verification funnel that gates worker supply. |

⚠️ **Mobile merge ≠ production.** A merged app fix changes nothing until a store release ships it.
