VERDICT: REUSE (backend) / new UI — the OTP machinery is live and working.

BEHAVIOUR
- 6-digit SMS code, resend link, auto-advance on fill.
- On success during sign-up → personal info (onboarding). During sign-in → Home.

ENDPOINTS / BACKEND SEAMS
- Live SMS OTP endpoints carry as-is (Twilio). Rate-limiting/resend windows are
  backend-owned; the screen only reflects state.
