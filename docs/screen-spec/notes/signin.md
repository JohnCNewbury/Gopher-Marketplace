VERDICT: ADAPT — UI is new; identity + OTP dispatch reuse the live backend.

BEHAVIOUR
- Phone-first sign-in; email is the fallback identifier.
- A recognized identifier routes to OTP verify; unknown → sign-up.
- TRAP (live bug, fix in rebuild): shipped apps send apptype:"" so a valid OTP can
  return "you need to sign up" — the backend fix exists; the rebuild must always send
  its correct apptype.

ENDPOINTS / BACKEND SEAMS
- Reuse live OTP request endpoint (Twilio SMS). Email-OTP is LIVE since 2026-07-30
  (logged in email_otps table).
- No Cognito — auth is Devise-based on the Node/Express backend's user store.
