VERDICT: REUSE — Stripe is NOT being reintegrated; the whole payout chain carries.

BEHAVIOUR
- Stripe Connect payout onboarding (connected account + payout method).
- Payout ramp canon: first 10 payouts settle on a 2-hour trust delay, then instant.
  All three paid tiers (Elite/Elite+/Pro) get instant payout from day 1.
- Workers pay ZERO fees; worker receives 100% of offer + cost-of-goods.

ENDPOINTS / BACKEND SEAMS
- Live Stripe connected-account onboarding, payout-speed rule, transfer/payout chain
  carry as-is (PI auth/capture/transfer/payout, re-auth crons).
