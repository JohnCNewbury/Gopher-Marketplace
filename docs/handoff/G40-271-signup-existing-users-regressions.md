# G40-271 — Both Apps: Sign-Up regressions for existing users (March-2026 deploy)

**Type:** Bug · **Priority:** Highest · **Status:** groomed dev-ready — 2026-07-03.
**Regression owner:** the March-2026 sign-up enhancement (**G40-7** FE / **G40-242** BE). This ticket
captures the regressions that shipped with it. **All three reviewed together** (ticket's own note).

## TL;DR — two halves, one already scaffolded

The four reported sub-issues split cleanly:

| # | Sub-issue | Layer | Where the fix lives |
|---|---|---|---|
| 1 | Existing unconfirmed user forced into **new account creation** | FE routing | **Already scaffolded** — `signupFlow.js` `routeUserOnLogin` + `shouldCreateNewAccount` (shared w/ G40-7) |
| 4 | **Back arrow** on email-OTP screen refreshes; no way to fix email / resend | FE nav | **Already scaffolded** — `signupFlow.js` `otpBackTarget` → Confirmation/Profile-Info |
| 3 | **Send Confirmation Email** button broken | Backend + admin | Rooted below — `admin.controller.js:234` |
| 2 | Admin email update **not recognized by app** ("new AWS category not linked") | Backend | Rooted below — `admin/user.js` update_* |

Sub-issues **1 & 4** are covered by the shared `signupFlow.js` module (`routeUserOnLogin`,
`otpBackTarget`, `canEnterHome`, `shouldCreateNewAccount`) already built + regression-tested per
`G40-Build-Recap.md` and the **G40-7 handoff** (`docs/handoff/G40-7-simplify-signup.md`). Wire the
FE to those; don't re-derive. This doc roots the **backend** half (2 & 3), verified in the
June-2026 `gopher-backend-api` export.

## ⚠️ Correction — there is NO AWS Cognito
The ticket says a "new AWS category in AWS is not linked to the admin panel." **Verified false:**
`aws-sdk` in the backend is **S3-only**; `git log --all -S cognito` is empty across every branch;
the admin-frontend references AWS only for S3 image URLs. Email verification is the Rails-**Devise
"confirmable"** pattern on the `users` table — columns `email`, `unconfirmed_email`,
`confirmation_token`, `confirmed_at`, `confirmation_sent_at`. The real "category the admin panel
doesn't manage" is this **email-verification state**, introduced/relied-on by the new flow — not a
Cognito user pool. (If G40-242 introduced Cognito in an unmerged branch, confirm with whoever ran
the March deploy; nothing in the export shows it.)

## Root cause — sub-issue 3: "Send Confirmation Email"
`controllers/admin.controller.js:234 send_confirmation_email` (admin-frontend button →
`/admin/user/send_confirmation_email`, `src/constants/url.js:13`):
- Emails **`data.email`**, never `data.unconfirmed_email` — so if the new flow parked the pending
  address in `unconfirmed_email`, the confirmation goes to the **wrong (old) address**.
- Sends a **legacy token-link** (`/api/v1/email-verify?token=…`) → `user/emails.js verify_email`
  sets `confirmed_at` + clears `unconfirmed_email`. But the March flow verifies email by **OTP**
  (G40-7: email-OTP is the final step, `canEnterHome` gates on it). The admin button never issues an
  OTP, so **it can't unstick a user sitting on the app's email-OTP screen**, and the link-verify vs
  OTP-verify paths are unreconciled.
- Minor: `confirmation_sent_at: db.Sequelize.NOW` sets a constant ref, not `Sequelize.fn('NOW')` —
  confirm it persists a real timestamp.

**Fix:** target `unconfirmed_email || email`; make the admin action drive the **same** verification
mechanism the app now uses (issue/resend the email **OTP**, or reconcile link-verify to also satisfy
the new email-verified gate). Same bug exists in the user-facing twin `user/emails.js:20`.

## Root cause — sub-issue 2: admin email update not recognized
`controllers/admin/user.js` — `update_requester_user` / `update_gopher_user` / `update_admin_user`
(via `update_User:369`) write **`email: data.email` directly** to `users.email` and touch **none**
of `confirmed_at` / `unconfirmed_email` / `confirmation_token`. Consequences under the new flow:
- If the user was already confirmed, the new address inherits `confirmed_at` → app treats a
  never-verified email as verified (wrong, and a light security smell).
- No `unconfirmed_email` staging + no confirmation/OTP is triggered → "the change is not saved in a
  way the app recognizes."

**Fix:** route admin email changes through the confirmable flow — set `unconfirmed_email`, reset the
verified gate (`confirmed_at = null` or the new-flow equivalent), and auto-trigger the same
confirmation/OTP as sub-issue 3. One shared helper for admin + app keeps a single source of truth.

## Acceptance criteria
Unchanged from the ticket (Scenarios 1–7). Note Scenarios 5 ("AWS category linked") should be
re-read as **"email-verification state is managed by the admin panel"** given the correction above.

## Related
- **G40-7** (FE umbrella, absorbed **G40-242** BE) — intended behavior + the shared `signupFlow.js`.
  Link as *Relates*; implement together.
- **G40-157** `signupValidation.js`; **G40-170** Incomplete-status; **G40-272** admin Email-OTP report.

## Files (backend)
- `controllers/admin.controller.js` (`send_confirmation_email` ~L234)
- `controllers/user/emails.js` (`send_confirmation_email` L20, `verify_email` L74)
- `controllers/admin/user.js` (`update_admin_user`, `update_requester_user`, `update_gopher_user`)
- `models/users.model.js` (confirmable columns)
- FE: bind to `signupFlow.js` (`routeUserOnLogin`, `otpBackTarget`, `canEnterHome`,
  `shouldCreateNewAccount`) per the G40-7 handoff.
