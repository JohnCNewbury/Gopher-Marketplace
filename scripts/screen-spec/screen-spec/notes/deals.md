VERDICT: NET-NEW — worker-side Deals surface has no live equivalent.

BEHAVIOUR
- Worker view of Gopher Deals: featured deal, category rails, merchant cards; deals
  are delivered by neighbors, not algorithms — the Offer to a Gopher IS the pay and
  100% goes to the worker.
- LAUNCH GATE: outside the Raleigh DMA the Deals surface is removed entirely
  (__dealsLive() seam; the home Deals section and this screen both gate on it).
- "+ Service Provider Deal" entry: deactivated unless auto-eligible — Elite/Elite+/
  Pro · 20+ completed SERVICE jobs · 4.75★ over the last 20 service jobs
  (Delivery / Ride Sharing / Other are excluded from BOTH the count and the rating
  window — owner 7/23). Ineligible tap opens the motivating criteria popup.

ENDPOINTS / BACKEND SEAMS
- Deals inventory read; SP eligibility computed BACKEND-side (reference impl:
  Dashboard regen_sp_eligibility.py). SP-deal submissions land in the HQ review
  queue + email deals@ (sp-deal-pipeline.md is the build spec).
