# G40-187 — Secure email change (folded into G40-203 "SMS/Email change requirements")

**Type:** Task · **Both apps** · `spine` · Low → **consolidated into [G40-203]** · Owner: John
Jira: https://gopherapp.atlassian.net/browse/G40-187 · Home: https://gopherapp.atlassian.net/browse/G40-203

## Status: closed as folded into G40-203
Per John's decision (G40-187 comment, 2026-06-30 + the G40-203 consolidation comments), email + phone changes share **one dual same-channel OTP model**, so G40-187 is **not built standalone** — its requirements live in **G40-203** ("SMS/Email change requirements"). This doc captures the **email-specific delta** so nothing from G40-187's spec is lost on close.

## Corrected model (supersedes G40-187's original body)
G40-187 originally specified a **single** OTP to the new email. **Superseded:** email now uses the **dual same-channel OTP** flow, mirroring the phone flow (`phoneChange.js`):
1. OTP to the **current** email — initiate / prove possession.
2. OTP to the **new** email — confirm control.
3. Commit **only after both** verify. Abandon persists nothing.

## Pre-OTP guards (run before any OTP is sent)
Reused from `profileEmailChange.js` (G40-147):
- same-as-current → **"No change detected"** / "That's already your email address" — no OTP.
- already in use on another account → **"That email is already in use"** — no OTP, **logged as a collision**.
- invalid format → standard format message — no OTP.

## On successful commit
- Email updated on the account (write-back only after both OTPs pass).
- **Confirmation email to BOTH the old and new address** — identical body, single source of truth.
- Other active sessions invalidated.
- **Stripe untouched** — keyed by account id, an email change never detaches payment/payout (same guarantee G40-203 verified for phone: `users.stripe_id` is on the account record).
- **Audit event** written: `success` | `otp_failure` | `duplicate_collision` — with account id, old/new email, device + approximate location.

### ⚠️ One intended email-vs-phone divergence
`phoneChange.js` alerts **only the OLD** number. For **email**, G40-187's AC require confirmation to **BOTH old + new** — kept, since a "your email was changed" notice to both addresses is standard account-takeover protection. This is the single deliberate difference between the two channels; flag for the dev so it isn't "normalized" back to old-only.

## Confirmation email content (G40-187 rules)
- **Subject:** Your email address was changed.
- Body includes From / To / timestamp (local tz) / device + approximate city-region, the "if this wasn't you → support@gophergo.io" line.
- **Excludes:** IP address; a one-click revert link (support email is the only recovery path this release — a self-serve revert is a separate future ticket).
- Uses each app's **standard email template** (Gopher / Gopher Go).

## Code (scaffolded + verified)
- **`Documentation/Jira Tickets/emailChange.js`** — the email reciprocal of `phoneChange.js`: `makeEmailChangeFlow(deps)` dual-OTP machine (`start` → `verifyCurrent` → `verifyNew` → `commit`), `buildChangeConfirmationEmail(...)`, `AUDIT` event types. Reuses `profileEmailChange.js` for the pre-OTP checks.
- **`Documentation/Jira Tickets/emailChange.test.js`** — `node emailChange.test.js`. Verified passing: happy path (dual OTP, both notified, success audit), same-as-current, collision-logged, OTP-failure-logged, commit guard, and the confirmation-email content rules (no IP, no revert link).

**Dev owns (reserved security/auth code):** wire the deps to the real OTP core (`controllers/user/auth.js` + email OTP — see G40-272), the confirmable email update, `users_sessions` invalidation, the audit-trail write (same transaction as the update), and the standard templates. Bind the UX to the built Personal Info dual-OTP prototype (G40-203 cascade, all 5 surfaces).

## Related
- **[G40-203]** — the consolidation home (phone + email). Rename to "SMS/Email change requirements."
- **G40-147** — the pre-OTP "email already in use" message (`profileEmailChange.js`) — reused here.
- **G40-272** — add an Email OTP field like SMS (build the OTP UX once, reuse).
- **G40-271** — email-verification (Devise confirmable) state / admin email update.
- **G40-11** — shared OTP core.

[G40-203]: https://gopherapp.atlassian.net/browse/G40-203
