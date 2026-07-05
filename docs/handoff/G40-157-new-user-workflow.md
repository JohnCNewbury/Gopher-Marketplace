# G40-157 — New User Workflow Improvements (signup)

**Type:** Story · **Priority:** Medium · **Scaffold:** `Jira Tickets/signupValidation.js`
(`validateSignupFields`, tested) · **Status set this session:** In Progress

## Ask
Verify the 8 signup acceptance criteria across the signup-bearing surfaces
(Connect + Request), and build anything missing.

## Surface mapping
- **Connect** → `Final/gopher-connect.html` (`snSu*` / `#otpOverlay`)
- **Request** → `Final/gopher-request.html` (`rqSu*` / `#rqOtpOverlay`)
- The `-101` files (`gopher-request-101.html`, `gopher-connect-101.html`) are the
  **tutorial** pages (criterion 8's destination), not separate signup flows.
- There is no separate "request-app" file in this static prototype; the web Request
  surface mirrors the native Request app.

## Verification matrix (per surface, with evidence)
| # | Criterion | Connect | Request |
|---|-----------|---------|---------|
| 1 | Signup from home screen | ✅ `#heroSignUpBtn` → `openSigninModal()` (L7002/18773) | ✅ `#rqPathNew` → `showSignupView()` (L16899) |
| 2 | Demo before signup | ✅ `#flow-demo` "View Instant Demo" (L7000/8151) | ✅ `#flow-demo` "before you even sign-up" (L9423/9430) |
| 3 | Phone + OTP | ✅ `#snPhone` + `#otpOverlay` (L7112/7303) | ✅ `#rqSuPhone` + `#rqOtpOverlay` (L16484/16562) |
| 4 | Email OTP required (gated) | ✅ both phone+email gate Step 1 (L19919-23) | ✅ `validateSignup` gates create on both verified (L16986) |
| 5 | Resend code | ✅ `#otpResend` (L7317/20426) | ✅ `#rqOtpResend` (L16576/17375) |
| 6 | Field error messages | ✅ inline + "Still needed" hints (L19914-50) | ✅ `#rqSuEmailErr`, `#rqSuDobErr` + gating (L16490/16480) |
| 7 | Confirmation → activation gate | ◐ PARTIAL | ◐ PARTIAL |
| 8 | Welcome / tutorial after signup | ✅ Step 3 "Welcome to Gopher Connect!" (L7249-61) | ✅ **built this session** (was missing) |

**Result: criteria 1–6 fully present on both surfaces** (they share the scaffolded
validator; `canActivateConnect` (G40-172) reuses it). Two findings below.

## Built this session — Criterion 8 on Request (was the one buildable gap)
Connect had a welcome step; **Request routed straight to the dashboard** with only a
stale placeholder card ("Dashboard build is the next stage"). Brought Request to parity:

- Repurposed the dead `#rqSignedInOverlay` placeholder into a **post-signup welcome +
  tutorial** card: 🎉 "Welcome to Gopher, {first}!", "Start my first request →", and a
  "New here? Take the 2-minute tour" link → `gopher-request-101.html` (the existing
  Gopher Request 101 tutorial).
- Shown **only on a fresh signup**, over the dashboard: `completeSignIn(name, true)`
  from the "Create my account" handler → `opts.isSignup` (survives the age-restricted
  d029 hold) → `proceedSignIn` reveals the overlay after opening the dashboard.
  Returning logins call `completeSignIn(name)` → `isSignup=false` → no welcome.
- **z-index fix:** the overlay was `z-index:1500` (it was only ever a no-dashboard
  fallback); the dashboard is `z-index:9000`, so the welcome rendered *behind* it.
  Raised to `9600`.

**Verified (browser, real page):** no console errors; completing signup shows the
welcome over the dashboard with the correct copy + tour link (`gopher-request-101.html`);
"Start my first request →" dismisses it; overlay stacks above the dashboard (screenshot).

Files touched: `Final/gopher-request.html` — welcome/tutorial markup + `.rq-signedin-tour`
CSS + overlay z-index; `completeSignIn`/`proceedSignIn` `isSignup` threading; create-account
call site.

## Remaining — Criterion 7 (backend seam, both surfaces)
Mandatory phone+email OTP **is** required before account creation, so both channels are
confirmed at signup. What's absent is a separate *account-activation* gate (account held
"pending" until a post-signup confirmation is completed) — that pending/active state is a
**backend** concern and isn't meaningfully represented in a static prototype. If product
wants an explicit post-signup activation step (beyond the mandatory OTP), it must be built
server-side: mark new accounts `pending` until confirmed, and block privileged actions
until active. Otherwise criterion 7 is effectively satisfied by the required OTP.

## Note
Connect criterion 8 is satisfied by its Step 3 welcome; neither surface *auto-launches*
the tutorial (both link it — Request now from the welcome card, both from the Help menu).
If product wants the tour auto-opened for first-time users, that's a small follow-up.
