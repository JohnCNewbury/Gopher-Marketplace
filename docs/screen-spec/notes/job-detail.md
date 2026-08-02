VERDICT: ADAPT — money flow + counter validation REUSE; privacy + tier caps are new.

BEHAVIOUR
- Request details: masked requester (photo + exact address unlock on accept or when
  the requester Prioritizes you), YOU'LL EARN block (worker gets 100% of offer),
  Accept / Counter-Offer / Message.
- Counter cap: server rule max($20, 1.5 × offer) — the offer ALONE is the base (owner
  7/24; Cost of Items is NOT in the base). Standard tier: 5/month resetting the 1st,
  must beat the offer. Elite/Elite+/Pro: unlimited and uncapped (D-026) — the tier
  exemption layer is NET-NEW on top of the live formula.
- Purchase jobs: deposit banner — worker fronts the purchase, reimbursed at
  completion.
- Cancellation note: accepting binds the worker cancellation policy ($5 fee tree).

ENDPOINTS / BACKEND SEAMS
- REUSE: claim/approval endpoints + processing lock, isCounterOfferValid, Stripe
  120%-auth / confirm-on-claim / partial-capture chain.
- Live allow_counter has an "|| true" bug (always allows) — rebuild honors the flag.
