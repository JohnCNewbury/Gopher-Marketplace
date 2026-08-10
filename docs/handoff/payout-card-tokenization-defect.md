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

**The payout screen never calls Stripe.** `external_account_token` — the field that is supposed to
carry the debit card the worker just typed — is populated by reading an id out of `localStorage`.
No tokenization happens anywhere in the payout flow.

For any worker who does not already have a connected account, that id is **null**, so the request
reaches the backend with an empty token and is correctly rejected:

> *"A debit card is required to set up your payout account. Please add your card and try again."*

**This is circular and cannot be escaped from the app.** The field that is supposed to *create* the
payout account is filled from an id that only exists *after* the payout account exists. A first-time
setup can never succeed, with any card, on any device, however many times it is retried.

**Fix:** tokenize the entered card and send *that* token. App-side change plus a store release —
there is no OTA route, so a merge alone changes nothing for users.

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

## 5. ⛔ Do NOT change the backend guard

`controllers/user/payment.js:174-179` is **correct and must stay**. It is the prevention half of the
2026-08-03 fix (MR !210). Its own comment records why:

> A Custom connected account created without an external account is born `past_due` on
> `external_account` and can never pay out … Stripe's hosted onboarding cannot rescue them because
> it does not collect a debit card.

Before that guard, a missing token minted a connected account with **no payout method** — permanently
unrepairable from inside the app. Relaxing the guard to "let them through" would resume manufacturing
those accounts. **The 400 is the system working. The app is what is broken.**

⚠️ **One line in that comment is wrong and should be corrected when the app fix lands:**

> *"The app does send this token (payoutCard.js sets it from the tokenize result), so a missing one
> means tokenization failed or was skipped."*

There is no tokenize result. `payoutCard.js` has never tokenized anything. Anyone debugging from
that comment will look for an intermittent tokenization failure that does not exist.

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
- **Whether any worker has ever completed payout setup on the current app build.** If some have, the
  mechanism above is incomplete and that should be established before the fix is scoped.

---

## 9. Related

| | |
|---|---|
| **G40-13** | Stripe payout account type — records the missing-token remediation (!209) and prevention (!210). Does **not** cover why the token is missing. |
| **G40-19** | Payout-card management: failed-transfer recovery, last-card protection. Different flow — recovery, not first-time setup. |
| **G40-271 / G40-13** | The payout-verification funnel that gates worker supply. |

⚠️ **Mobile merge ≠ production.** A merged app fix changes nothing until a store release ships it.
