VERDICT: ADAPT — claim endpoints carry; card privacy + signals change materially.

BEHAVIOUR
- Available requests, sort chips (Best fit / Pay / Distance / Expiring / New).
- TOP PAY pill fires off the platform suggested-offer model (offerBand 'generous').
- PRE-ACCEPTANCE PRIVACY: requester name + street number are hidden until accept.
  Live strips these CLIENT-side only (API returns them) — the rebuild must enforce
  server-side (G40-91).
- INV-RATING: the live app shows the requester's rating on every card — violation;
  the rebuild never shows a counterparty rating.
- Locked cards: Connect jobs (Elite & Pros) and Gopher Deals (unlocks once verified)
  render with a Tier-up CTA, not hidden.
- iQ "Counter potential" signal (D-034) is spec'd but DEFERRED to Phase II.

ENDPOINTS / BACKEND SEAMS
- Broadcast/eligibility feed; favorites get a broadcast head start + approval bypass
  (live = 1 second; in-app copy promises "5 minutes" — reconcile in rebuild).
- First Available exists live only for Delivery/Ride/Other — formalize, don't assume
  for service categories.
