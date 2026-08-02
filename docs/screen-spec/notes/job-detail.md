VERDICT: ADAPT — money flow + counter validation REUSE; privacy + tier caps are new.

BEHAVIOUR
- Request details: masked requester (photo + exact address unlock on accept or when
  the requester Prioritizes you), YOU'LL EARN block (worker gets 100% of offer),
  Accept / Counter-Offer / Message.
- Counter cap: server rule max($20, 1.5 × offer) — the offer ALONE is the base (owner
  7/24; Cost of Items is NOT in the base). Standard tier: 5/month resetting the 1st,
  ⚠️ NOT IMPLEMENTED IN THE PROTOTYPE — the "3 of 5 monthly counter-offers left" line is
  static copy with no counter state behind it (conformance audit 2026-08-02, verdict
  DECORATIVE). Do not read the prototype as a reference for the allowance; it is
  server-enforced canon and is a BACKEND SEAM. The cap and must-beat rules ARE enforced
  client-side and were adversarially verified — a counter above the cap and one at or
  below the offer are both refused.
  must beat the offer. Elite/Elite+/Pro: unlimited and uncapped (D-026) — the tier
  exemption layer is NET-NEW on top of the live formula.
- Purchase jobs: deposit banner — worker fronts the purchase, reimbursed at
  completion.
- Cancellation note: accepting binds the worker cancellation policy ($5 fee tree).

ENDPOINTS / BACKEND SEAMS
- REUSE: claim/approval endpoints + processing lock, isCounterOfferValid, Stripe
  120%-auth / confirm-on-claim / partial-capture chain.
- Live allow_counter has an "|| true" bug (always allows) — rebuild honors the flag.
