# G40-281 — Stripe registering the temp signup email as the customer's main email — DEV HANDOFF

**Type:** Bug (`spine`) · **Priority:** Medium · both apps / backend. Verified against the 2026-06-12 `gopher-backend-api` export.
_(The Jira description is only a dead `blob:` screenshot — root-caused from the title + code. Re-attach the screenshot to the ticket if it's still needed.)_

## What's happening
The new **phone-first** signup issues a **temporary/placeholder email** at account creation (the real email is collected/verified later). The backend both **stores** that temp email and **creates the Stripe customer** with it — then, when the user finalizes their real email, the DB is updated but **Stripe is never re-synced**. The Stripe customer's main email stays the temp value forever.

## Root cause (exact path)
1. **Signup writes the temp email + creates the Stripe customer in one shot** — `controllers/user/auth.js`:
   - User row created with `email: req.body.email`, `uid: req.body.email`, `unconfirmed_email: req.body.email` (`:181,:183,:194`).
   - Immediately after, for requesters, `create_stripe_customer(stripe_customer_data)` is called with `email: data.email` (`:228,:232`) → `lib/payment.stripe.js:346 create_stripe_customer` → `stripe.customers.create({ email: checkuser.email, … })` (`:350`). (Also called at `auth.js:969` and `:995` on later logins if `stripe_id` is missing — same temp email.)
   - So `req.body.email` at signup = the Stripe customer email. In the phone-first flow that value is the **temp placeholder** (real email not yet known).
2. **Email is later finalized in the DB only — no Stripe sync:**
   - Email change: `controllers/user/profile.js:853-905` sets `email`, `unconfirmed_email`, `confirmed_at:null` then `db.users.update(...)`.
   - Email confirm (promote): `controllers/user/emails.js:79 verify_email` sets `confirmed_at:NOW`, `unconfirmed_email:null` (`:113-116`).
   - Admin email edit: `controllers/admin/user.js update_*_user` (see G40-271) writes `users.email` directly.
   - **None of these call `stripe.customers.update`.** The **only** `stripe.customers.update` in the whole backend is `lib/payment.stripe.js:117` — and it's `set_default_payment_method` (updates `invoice_settings.default_payment_method`), **not email**. So there is no email→Stripe sync anywhere.

## The fix
Keep the Stripe customer's email in lockstep with `users.email`. Two parts:

### 1. Add a reusable sync helper (`lib/payment.stripe.js`)
```js
exports.update_customer_email = async (stripe_customer_id, email) => {
  if (!stripe_customer_id || !email) return null;
  return stripe.customers.update(stripe_customer_id, { email });
};
```

### 2. Call it wherever `users.email` becomes/changes to the real value
- **Primary — email confirmed:** in `controllers/user/emails.js verify_email` (`:79`), after the user is confirmed, sync the (now-real) email to the requester's Stripe customer (`users_roles.stripe_id`, role_id 3). This is the cleanest single choke point since it's exactly when the real email is finalized.
- **Email changed via profile:** `controllers/user/profile.js` email-update path (`:853-905`) — sync after `db.users.update` (or defer to the subsequent `verify_email`, but syncing on confirm covers both).
- **Admin email edit:** `controllers/admin/user.js update_*_user` — same sync (this is the Stripe half of **G40-271**'s "admin email update not recognized" — do them together).

### 3. Preferred root fix (discuss)
Better than patching every write site: **don't seed the Stripe customer with a temp email.** Options — (a) defer `create_stripe_customer` until the real email is confirmed, or (b) create it at signup but treat the confirm step as the authoritative email sync (option 2 above). (a) is cleaner but check nothing between signup and confirmation needs the Stripe customer (e.g. adding a card early). Given the current flow creates the customer eagerly at signup, **option 2 (sync-on-confirm + on-change) is the low-risk fix**; flag (a) as the ideal if the flow can defer customer creation.

### 4. Backfill existing accounts
Existing customers already carry temp emails. Add a one-off reconciliation: for users where the Stripe customer email ≠ `users.email` (confirmed), push `users.email` to the Stripe customer. Scope with the Stripe/backend owner.

## Confirm with the front-end
The temp email is **issued client-side** at registration (the backend just stores what it receives in `req.body.email`). Confirm the placeholder format the app sends (e.g. a phone-derived or `…@temp`-style address) so QA can detect affected customers in Stripe. This is a byproduct of the **G40-7** phone-first signup and is closely related to **G40-271** (email-update/sync regressions).

## Acceptance / QA
- New signup → finalize real email → **Stripe customer email = real email** (not the temp placeholder). Check the Stripe dashboard.
- Change email in profile → re-confirm → Stripe customer email updates to the new value.
- Admin edits a user's email → Stripe customer email updates.
- Backfill run → existing temp-email customers reconciled.
- iOS + Android, requester accounts (Stripe customer is requester-side).

## Files to touch
- `lib/payment.stripe.js` — add `update_customer_email`; (`create_stripe_customer:346` unchanged unless deferring).
- `controllers/user/emails.js` (`verify_email:79`) — sync on confirm.
- `controllers/user/profile.js` (`:853-905`) — sync on email change.
- `controllers/admin/user.js` (`update_*_user`) — sync on admin edit (with G40-271).
- Backfill script/migration for existing customers.
