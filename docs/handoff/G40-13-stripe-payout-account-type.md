# G40-13 — Stripe payout: stop mis-classifying gig workers as businesses

**Jira:** G40-13 (Bug, Low) · Component **Gopher Go App** · Label `pay` · Fix version *Phase 1 — Bug Fixes & Polish*
**Assignee:** John Newbury
**Surface:** worker app payout setup — legacy backend `gopher-backend-api`; new UX reference `Final/gopher-go.html` (Payout Info)
**Scope of this branch:** BACKEND fix (Stripe integration). Per `Final/CLAUDE.md`, Payments/billing
is reserved for the human dev — no payment code was written here. The front-end reference is already
correct and needs no change (see bottom). What's below is a red-carpet spec: exact cause, exact files,
exact fix. **There are no open questions. Do not go discover anything — build to this.**

---

## TL;DR for the developer

A small % (John: "a few %") of Gophers get bounced to **Stripe's hosted onboarding page in the
mobile browser**, which asks them for a **business website** — a field a gig worker doesn't have and
can't fill. The payout model is **not changing** (debit-card instant payouts stay). The fix is to
stop Stripe from **classifying these individuals as card-accepting merchants**, so the only things
Stripe can ever ask for are *individual-identity* fields, never business fields.

**One root cause, one create call.** The connected account is created correctly as
`business_type: 'individual'` **but also requests the `card_payments` capability and sets a
`business_profile` (MCC + URL + product description).** Those are merchant signals. They let Stripe
escalate `business_profile.url` ("business website"), MCC, and product-description into the account's
`currently_due` requirements — and when that happens for a given user, the app redirects them to
Stripe's hosted page to collect it. Remove the merchant signals → only individual fields can ever
come due → the "business website" prompt becomes impossible.

Two things John confirmed for this ticket:
1. **Payout method does not change.** Existing debit-card instant-payout method carries forward. Do
   **not** re-architect payouts. This ticket is only about the mis-classification.
2. **Verification UX = in-app first, hosted *individual* page as fallback.** Collect verification
   in-app normally; a redirect to Stripe's hosted flow is acceptable *only* as a fallback and *only*
   the individual-identity flow — **never** the business flow. (After the fix below, the fallback
   can no longer surface business fields, so this is satisfied automatically.)

---

## Root cause (exact location)

Legacy repo: `gopher-backend-api` · file **`lib/payment.stripe.js`** · the single `accounts.create`
call (there is only one — verified by grep).

```js
// lib/payment.stripe.js  (≈ lines 467–491)
const account_options = {
  type: 'custom',
  country: legal_entity_address.country,
  email: user.email,
  capabilities: {
    card_payments: { requested: true },   // ❌ merchant signal — Gophers never charge cards
    transfers:     { requested: true },   // ✅ this is all a payout-only worker needs
  },
  tos_acceptance: { date: moment().unix(), ip },
  business_type: 'individual',            // ✅ correct, keep
  external_account: external_account_token,
  business_profile: {                     // ❌ merchant signals for a payout-only individual
    mcc: 5045,
    url: 'https://www.gophergo.io/',      // ❌ this is the "business website" Stripe re-asks for
    product_description: 'Gopher, Inc - SERVICE PROVIDER',
  },
  individual: legal_entity_params,        // ✅ correct, keep
};
const account = await stripe.accounts.create(account_options);
```

**Why only a few %:** the merchant signals make business verification *possible*, but Stripe's risk
engine only escalates the extra business requirements to `currently_due` for a subset of accounts.
So it looks intermittent. It is not random — remove the signals and it can't happen to anyone.

**The redirect that shows the business field** (this is what the user actually sees):
- `controllers/user/payment.js:587-597` — if `account.requirements.currently_due.length`, it calls
  `account_onboarding()` and sets `redirect_url` to Stripe's hosted page.
- `controllers/user/payment.js:668-669` — the `reauth/stripe` return path re-generates the same link
  and `res.redirect(data.url)`.
- `lib/payment.stripe.js:1634-1653` — `account_onboarding()` builds an `accountLinks.create({ type:
  'account_onboarding' })` hosted link.
- `lib/payment.stripe.js:57-90` — `payout_account_need_attention` is the flag the app reads to know
  an account has due requirements.

These stay (they're the fallback John approved). They just stop being able to ask for business info
once the create call is fixed.

---

## The fix (do all three)

### 1. Fix new-account creation — `lib/payment.stripe.js` (~467–491)
Create Gophers as **payout-only individuals**:
- **Remove** `capabilities.card_payments` — request **`transfers` only**.
- **Remove** the entire `business_profile` block (`mcc`, `url`, `product_description`). A
  `transfers`-only individual account does not need it, and `business_profile.url` is the exact field
  being re-collected as "business website."
- **Keep** `type: 'custom'`, `business_type: 'individual'`, `tos_acceptance`, `external_account`,
  and `individual: legal_entity_params`.

Result: the only requirements Stripe can raise are individual-identity fields (e.g.
`individual.verification.document`, `individual.id_number`, `individual.dob`, `individual.address`,
SSN last-4) — never `business_profile.*`.

> If your platform's Stripe config requires an MCC at the platform level, set it in the Stripe
> Dashboard platform settings, not per-account here — do not reintroduce it into `business_profile`
> on the individual account.

### 2. Remediate the already-affected accounts (the "identify the breakdown" John asked for)
The few % already created with the old options are still mis-classified in Stripe and will keep
getting prompted. Find and fix them:

**Identify** — enumerate connected accounts (Stripe `GET /v1/accounts` list, or a Sigma query) where
**any** of these is true:
- the `card_payments` capability is `active` or `pending`, **or**
- `requirements.currently_due`, `eventually_due`, or `past_due` contains any `business_profile.*`
  entry (especially `business_profile.url`), **or**
- `business_profile.url` / `business_profile.mcc` / `business_profile.product_description` is set.

**Fix each** — `accounts.update(id, …)`:
- deactivate/stop requesting `card_payments` (request `transfers` only),
- clear `business_profile` (`url`, `mcc`, `product_description`),
- confirm `business_type: 'individual'`.

Some accounts with an active `card_payments` capability may not let you drop it cleanly via the API
if requirements are outstanding — for those, use Stripe Support / dashboard to remove the capability,
or (if simpler and the account has no payout history at risk) recreate the connected account with the
corrected options and re-attach the external debit card. Confirm `payouts_enabled: true` after.

### 3. Verify the fallback redirect is now individual-only
No code change expected here — once step 1 lands, `currently_due` can only hold individual fields, so
the existing `account_onboarding` redirect (`payment.js:592-597`, `:668-669`) can only ever show the
individual identity flow. **Do confirm** in a Stripe test account that the hosted page after the fix
never asks for a business website. This satisfies the ticket's Scenario 1 & 2 and John's "in-app
first, hosted individual page as fallback" decision.

---

## Acceptance / QA (maps to the ticket's scenarios)

- **New worker, payout setup:** account is created `individual` + `transfers`-only, no
  `business_profile`. Stripe never asks for a business website. `payouts_enabled` reaches `true`
  after individual identity is satisfied.
- **Existing affected worker (the few %):** after remediation, their account no longer shows a
  `business_profile.url` requirement; re-opening payout setup does not redirect them to a business
  page.
- **Fallback redirect:** when Stripe genuinely needs more individual identity info, the hosted page
  shows only individual identity fields (ID doc, DOB, SSN last-4, address) — **never** business
  website / EIN / company info.
- **Reproduce originally / regression:** test on iOS and Android. Confirm no business-info browser
  prompt in any of: new setup, fixing a restricted account, updating existing payout details.

---

## Front-end status — DONE, no work needed

`Final/gopher-go.html` → **Payout Info** section (≈ line 2694) is already correct and matches John's
design note on the ticket:
- Copy reads *"Your identity is already verified through Stripe. Manage the card(s) we pay out to
  here."* (line 2697) — individual framing, not business onboarding.
- The only inputs are **debit-card** fields (name, number, exp, CVV, nickname). **Zero** business
  fields (no business website, EIN, company info) — verified by grep of the payout section.

Nothing to change on the front end for this ticket.
