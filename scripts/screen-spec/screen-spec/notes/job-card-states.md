VERDICT: COMPONENT SPEC — build one JobCard component with variants, not a screen.

BEHAVIOUR
- One frame per card state, flattened: Set Pay + TOP PAY · Bids ("Submit a Bid",
  no $/hr, no Top Pay) · iQ flags (input-solid vs iQ-soft + marker chips) ·
  Locked-Connect (Elite & Pros + Tier up) · Locked-Gopher-Deal (unlocks once
  verified).
- Component model: Pay-mode × State variants; flags carry an Input vs iQ source prop.
- Locked cards keep full content visible but muted, with the lock ribbon + CTA.

ENDPOINTS / BACKEND SEAMS
- None — this is the component library contract for jobs-list/job-detail cards.
