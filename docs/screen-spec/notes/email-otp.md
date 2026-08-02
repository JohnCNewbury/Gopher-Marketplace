VERDICT: REUSE (backend) / new UI — email OTP shipped to production 2026-07-30.

BEHAVIOUR
- Same pattern as phone OTP but against the account email; used to verify the email
  identity leg during sign-up (replaces the old Devise-confirmable email link pain —
  see G40-271 regressions).

ENDPOINTS / BACKEND SEAMS
- Live email-OTP endpoint (logged in email_otps). HQ views exist for support.
