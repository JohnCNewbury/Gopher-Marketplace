# G40-172 — New Connect User Sign Up

**Status:** 7 ACs already present (verified) + built the narrative "add MY Gophers" option · verified
**Jira:** G40-172 · Story · Medium · `connect` · Scaffold: `wave2/g40-172/connectSignup.js` (`canActivateConnect`, tested)

## The 7 acceptance criteria — all present in `Final/gopher-connect.html`
(Confirmed here and previously under G40-157's Connect pass.)
1. Home Sign-Up entry — `#heroSignUpBtn` (~L7002).
2. Demo/info link — `#flow-demo` / "View Instant Demo" (~L7000).
3. Phone **and** email dual OTP — `#snPhone` + `#snEmail` with inline OTP buttons; `#otpOverlay` (~L7112–7113).
4. Resend code — `#otpResend` (~L7317).
5. Field errors — `.signup-err` inline (e.g. `#snEmailErr`).
6. Confirmation required for activation — client gate: Step-2 submit is blocked until `snPhoneVerified`
   **and** `snEmailVerified` (~L20037). Mirrors the scaffold's `canActivateConnect` (requires both
   phone_otp + email_otp). **The durable activation gate is the backend seam** (account stays inactive until
   confirmed server-side).
7. Welcome / tutorial — Step 3 `#newStep3` "Welcome to Gopher Connect!" (~L7249) + the Gopher Connect 101
   tutorial link in the header.

Ties to the tested scaffold `connectSignup.js` — `canActivateConnect` reuses the G40-157 field validator and
returns a `needs` list (phone_otp / email_otp). Bind the flow's activation to it server-side.

## Built — the "option to immediately add MY Gophers"
The user story's narrative ("…with an option to immediately add MY Gophers") was the one piece missing: the
welcome step (`#newStep3`) only offered **Enter Dashboard →**; MY Gophers was reachable only after landing in
the dashboard. Added a first-class path:

- **Welcome-step CTA** — a "＋ Add MY Gophers now" button on `#newStep3`, above "Enter Dashboard →"
  (secondary/ghost styling, non-disruptive).
- **Cross-scope hook** — `window.__openDashboardGophers = () => { openDashboard(); showSection('gophers'); }`
  (next to the existing `__openDashboard` / `__openDashboardRequest` hooks), so the button opens the dashboard
  **directly on the MY Gophers section** (same prefill/enter path as "Enter Dashboard", then routes to
  `data-section="gophers"`).
- The MY Gophers section itself is unchanged: its banner explains gophers are saved from prior jobs / granted
  by the Business Plan (the app's real accrual model — there is no manual "add a stranger" action).

### Verification (in-browser, real 5.6 MB file)
No console errors. `#snStep3AddGophers` renders with label "＋ Add MY Gophers now" alongside the unchanged
"Enter Dashboard →"; `window.__openDashboardGophers` is defined; clicking the button throws no error and makes
the `data-section="gophers"` section **active** (only active section) — lands on "MY Gophers — Preferred
Workers." Screenshot shared.

## Backend seam
- Durable **activation gate** (AC #6): the account must remain inactive until phone+email are confirmed
  server-side; the client gate is a UX pre-check. Wire to `connectSignup.js` `canActivateConnect`.
- Dual-OTP delivery + resend are real SMS/email sends (backend).

## Files
- `Final/gopher-connect.html` — welcome-step "Add MY Gophers" button, `__openDashboardGophers` hook, its
  click handler.
