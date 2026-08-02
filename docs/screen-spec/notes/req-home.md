VERDICT: ADAPT — new IA; rails read live order state; deals + iQ are new surfaces.

BEHAVIOUR
- Requester home: Active / Scheduled / Submitted rails with live job cards
  ("Track live →" into in-progress); category tiles deep-link into the flow
  (?category=); "All services →" opens the flow's real Step 1 (?step=1 — distinct
  from ?demo=1, which adds demo chrome).
- Deals section (sponsored), Perks, Tools (TrustShield · Payment methods · Saved
  addresses · MY Gophers · Previous requests), Account.
- The iQ pill is REAL: reads the input, shared answer brain (coverage → FAQ →
  category/pricing intent), Enter + autofocus; empty input → prompt copy.
- Naming canon: "Previous requests" (never "Request history").

ENDPOINTS / BACKEND SEAMS
- Orders read scoped to requester; deals inventory; iQ coverage behind
  GopherIQData.lookup() seam.
