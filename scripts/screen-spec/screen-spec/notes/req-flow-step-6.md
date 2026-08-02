VERDICT: REUSE (fee engine) — the live fee schedule IS the canonical Request schedule.

BEHAVIOUR
- Review: category, description, addresses, offer, Request fee, promo code, total,
  payment method (canonical __payStore), iQ review card, waiver checkbox (gates
  submit), ASAP/schedule confirmation.
- Fees: $0.99–$4.99 flat + 8% + $1.99 age-restricted − $1 TrustShield perk. That is
  the LIVE production schedule (cal_amounts + fee constants) — full continuity, do
  not re-derive.
- TrustShield $1 perk scope: age-restricted delivery + all ride ONLY (owner 7/5).
- MISSING-HEADER TRAP (live): no appversion header ⇒ $0 service fee — the rebuild
  must not reproduce the accidental fee waiver.

ENDPOINTS / BACKEND SEAMS
- REUSE cal_amounts, fee constants, promo validation, Stripe PI auth at 120% on
  submit. Payment methods via the canonical __payStore parity module.
