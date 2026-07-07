# G40-147 — Profile email change shows "Network Error" instead of "That email is already in use"

**Type:** Bug · **Both apps** · `spine` · Low · Owner: John Newbury
Jira: https://gopherapp.atlassian.net/browse/G40-147

## The bug
On **My Profile → edit email**, changing your email to one that's already registered to another account shows the generic **"Network Error"** toast. It should show the specific, inline message **"That email is already in use."** (John, ticket + comment: surface it *inline on the My Profile email row* — Gopher Go redesign shows this row.)

## Root cause
The email is unique on the `users` table (Devise "confirmable" — see G40-271). When the new address collides:
- **Backend** (`controllers/user/emails.js`, the user-facing email-update endpoint — the twin of the admin path `controllers/admin/user.js update_User:369` rooted in [G40-271](G40-271-signup-existing-users-regressions.md)) lets the uniqueness violation surface **unstructured** instead of returning a clean duplicate error.
- **Front-end** then can't tell a *duplicate* (a real server response) apart from an *offline/transport failure*, so its catch-all renders **"Network Error"** for both.

So it's a two-sided fix: backend returns a **structured** duplicate error; the FE **maps a server response to specific copy** and reserves any connectivity wording for an actual transport failure.

## The fix
**Backend** (`controllers/user/emails.js`):
- Pre-check availability (mirrors G40-203 `phoneChange.isPhoneInUse`) **or** rescue the uniqueness violation, and respond **422** (or 409) with a structured body: `{ error: "email_in_use", message: "That email is already in use" }`. Do **not** let it fall through to a 500/unhandled error.
- Case-insensitive + trimmed comparison (`me@x.com` == `  ME@X.com `).
- Keep this consistent with the confirmable flow (G40-271): a *pending* address lives in `unconfirmed_email` — the uniqueness check should consider both `email` and other users' `unconfirmed_email` so a collision is caught even mid-verification.

**Front-end (both apps, My Profile email row):**
- Replace the generic catch with the shared mapper so the message is identical across apps and is shown **inline on the email field**, not as a generic toast.
- Only a genuine transport failure (no HTTP response) may show a connectivity message — never the literal "Network Error" for a server-returned duplicate.

## Code (scaffolded + verified)
- **`Documentation/Jira Tickets/profileEmailChange.js`** — `mapEmailChangeError(err)` (server-response → inline copy; transport-failure → offline copy), `isEmailInUseResponse(resp)`, and `checkEmailAvailable(email, deps)` pre-submit guard. Pure logic, no I/O.
- **`Documentation/Jira Tickets/profileEmailChange.test.js`** — run `node profileEmailChange.test.js`. Logic verified passing, incl. the key case: a `422 invalid_email` is **not** mis-mapped to the duplicate message (explicit codes beat the bare-status fallback).
- Canonical copy lives in `EMAIL_CHANGE_MESSAGES` so both apps share one source of truth.

**Dev owns:** the backend rescue/pre-check + structured response in `user/emails.js`; wiring both apps' My-Profile email field to `mapEmailChangeError` and inline rendering; QA on iOS + Android.

## FYI (not a blocker — proceeding as specified)
Telling a signed-in user "that email is already in use" does reveal that the address is registered (account-enumeration). For a **self-service email change by an authenticated user** this is standard (Google, Apple, etc. all do it) and it's the message you specified, so we keep it. Flagging only so it's a conscious choice — no action needed.

## Acceptance criteria
- Changing profile email to an in-use address → inline **"That email is already in use"** on the email row (not "Network Error"), on **both** apps. ✅ (mapper + copy)
- A genuine offline/timeout still shows a connectivity message, distinct from the duplicate case. ✅
- Case/whitespace variants of the same address are treated as a collision. ✅

## Related
- **G40-187** — secure email change (OTP, dual-verify) — the email twin of `phoneChange.js` (G40-203). This ticket is the *error-message half*; wire them together when G40-187 is built.
- **G40-271** — email-verification state / admin email update (same backend path). *Relates.*
