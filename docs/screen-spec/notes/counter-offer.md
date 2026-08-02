VERDICT: ADAPT — server validation REUSE; tier layer + UI are new.

BEHAVIOUR
- Counter flow: stepper clamps to the Standard ceiling max($20, 1.5 × offer) — base
  is the OFFER ALONE (owner 7/24; item cost never in the base). Red rule line on
  overshoot; must beat the offer.
- Standard: 5 counters/month, resets the 1st. Elite/Elite+/Pro: unlimited & uncapped
  (D-026) — coTiered seam in the prototype marks where the tier exemption plugs in.
- Requester sees Accept / Decline / (optionally) re-counter on their side.

ENDPOINTS / BACKEND SEAMS
- REUSE isCounterOfferValid (live formula matches D-026's base formula exactly);
  ADD tier exemptions + monthly quota server-side (neither exists live). Live
  allow_counter is always true via an "|| true" bug — honor the flag in rebuild.
