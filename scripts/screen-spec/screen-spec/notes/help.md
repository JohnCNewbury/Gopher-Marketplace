VERDICT: ADAPT — Help Center shell; answers ride on the shared Gopher iQ brain.

BEHAVIOUR
- Help Center hub: Ask Gopher iQ (branding canon — the iQ lockup replaces the
  platform logo ABOVE the pill; the pill itself stays stock), FAQs, Contact Us.
- iQ answer tiers (shared function, one per app — never re-implement inline):
  coverage brain (GopherIQData) → curated FAQ search (confident matches only) →
  category/pricing intent. Empty input → prompt copy.
- "Near me" resolves to the worker's own area (state.zip) — never captures pronouns
  as place names.

ENDPOINTS / BACKEND SEAMS
- Production replaces the static coverage tables with a live query behind the same
  GopherIQData.lookup() seam; FAQ matching should become a real retrieval layer
  (the keyword scorer is hand-tuned and not provably collision-free).
