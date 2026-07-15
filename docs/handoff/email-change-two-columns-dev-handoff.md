# Dev head-start — the "two email sections" & why users can't change their own email

**For:** the incoming backend dev. **Written from:** the June-2026 GitLab exports (`gopher-db`, `gopher-backend-api`) in `Documentation/GitLab Repos/`.
**Related Jira:** G40-147 ("Network Error" instead of "email already in use"), G40-271 (sign-up issue with existing users), G40-281 (Stripe temp email registered as main), G40-187 (OTP to change email), G40-272 (Email OTP field).

---

## TL;DR

There are **two email columns** on the `users` table — **`email`** (the confirmed / login address, uniquely indexed) and **`unconfirmed_email`** (the pending address) — the standard Devise **confirmable** pair, carried into the Node/Sequelize backend. That pair is fine; the bug is that the **change** and **confirm** endpoints implement it **inconsistently**, so a change writes the new address to *both* columns at once and the login email flips to an *unconfirmed* value immediately. Combined with a uniqueness check that only looks at `email` and a mobile client that shows a raw 409 as "Network Error," users experience "I can't change my email."

---

## 1. Where the "two email sections" live (schema)

`gopher-db/drizzle/schema.ts` (users table):
- **`email: varchar("email")`** — the user's confirmed / login email. **Unique index** `index_users_on_email` (schema.ts ~253).
- **`unconfirmed_email: varchar("unconfirmed_email")`** — "Email awaiting confirmation" (schema.ts ~226).
- Supporting confirmable columns: `confirmation_token`, `confirmed_at`, `confirmation_sent_at` (schema.ts ~223–225).
- Backend mirror: `gopher-backend-api/models/users.model.js` (`unconfirmed_email` ~line 61); raw DDL in `config/db.config.js`.

Plus a **separate audit table** `email_change_trackers` (`old_email`, `new_email`, `user_id`) — `gopher-db/drizzle/imported_schema.ts` ~62–76 and `gopher-backend-api/models/email_change_tracker.model.js`.

So "2 email address sections" = the **`email` + `unconfirmed_email`** columns. That's a legitimate confirmable design — the problem is how the two endpoints use it.

## 2. Why the change is broken (the actual bug)

**Change endpoint — `gopher-backend-api/controllers/user/profile.js` (~852–905):**
1. ~855–867: looks up `db.users.findOne({ where: { email: newEmail } })`; if it belongs to another user → `throw 409 Conflict "Email already exists."` (uniqueness is checked on **`email` only**, never `unconfirmed_email`).
2. ~878–899, when the email is accepted:
   - creates an `email_change_trackers` row,
   - clears `confirmed_at` / `confirmation_token` / `confirmation_sent_at`,
   - sets **`unconfirmed_email = newEmail`** (line ~899),
   - **but never removes `email` from `fields_to_update`**, so line ~905 `db.users.update(fields_to_update, …)` also writes **`email = newEmail`**.
   - **Result:** the new, *unconfirmed* address is written to **both** `email` and `unconfirmed_email` at request time. The login email changes instantly, before any confirmation.

**Confirm endpoint — `gopher-backend-api/controllers/user/emails.js` (~85–123):**
- On a valid token it sets `confirmed_at = NOW` and `unconfirmed_email = null` (~111–116). It **never promotes `unconfirmed_email → email`** — because the change endpoint already overwrote `email`.

**So the two endpoints disagree on which column is authoritative.** Correct Devise-confirmable is: *change* writes **only** `unconfirmed_email` (+ token/sent_at) and leaves `email` untouched; *confirm* moves `unconfirmed_email → email`, nulls it, and stamps `confirmed_at`. Neither endpoint does that today.

## 3. Why it surfaces as "can't change my email" / "Network Error"

- The 409 "Email already exists" (profile.js ~862) is **not mapped in the mobile client**, which renders it as a generic **"Network Error"** (this is G40-147). The user reads that as "the app won't let me change it."
- Because `email` is overwritten immediately (§2), a half-finished change (user never clicks the confirmation link) leaves the account on an **unconfirmed address as its login `email`**, with a stale `unconfirmed_email`. A retry then trips the uniqueness check in confusing ways.
- Signup seeds `unconfirmed_email = req.body.email` (`controllers/user/auth.js` ~194); a **temporary email issued during signup can land in `email`** (G40-281), so the confirmed/login value is a temp string while the real address is stuck in `unconfirmed_email`. That is the second half of the "two sections are fighting each other" symptom.

## 4. Fix direction (hand this to the dev)

1. **Make confirmable consistent.** In `profile.js`, on an email change: set `unconfirmed_email`, `confirmation_token`, `confirmation_sent_at`, clear `confirmed_at`, and **`delete fields_to_update.email`** so `email` (login) stays the old value until confirmed. In `emails.js` confirm: set `email = unconfirmed_email`, `unconfirmed_email = null`, `confirmed_at = NOW`.
2. **Check uniqueness on both columns**, case-insensitively (`lower(email)` and `lower(unconfirmed_email)`), and return a 409 the client maps to **"That email is already in use."** (closes G40-147).
3. **Map 409 in the mobile client** so users see the real message, not "Network Error."
4. **Reconcile the temp-email signup path** (G40-281) so a temp value never becomes the confirmed `email`.
5. Note the interplay with **G40-272** (add an email **OTP** field like SMS): if email verification moves from a confirmation *link* to a numeric **OTP**, the same `unconfirmed_email` + a short-lived code replaces `confirmation_token`; keep the single-authoritative-column rule above.

## 5. Fastest way to reproduce / verify

- In staging: change a user's email, **do not** click the confirmation link, then query the row — you'll see **both** `email` and `unconfirmed_email` set to the new (unconfirmed) address and `confirmed_at = null`. That single query proves the inconsistency.
- Then attempt a second change to an address already used by another account — the API returns 409 but the app shows "Network Error."

*(This document is grounded in the read-only June-2026 exports; confirm line numbers against the live repo before editing — they will have drifted.)*
