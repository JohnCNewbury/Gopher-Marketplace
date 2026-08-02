VERDICT: NET-NEW — customer Deals surface has no live equivalent.

BEHAVIOUR
- Deals near you: featured deal, category rails (Local Service Provider / Restaurants
  & Food Trucks / Local Favorites / Convenience Stores / Age-Restricted Merchants 21+),
  merchant cards with offers and distances.
- "How deals works" footer: deals are delivered by neighbors, not algorithms; the
  Offer to a Gopher is the pay and 100% goes to the worker.
- Redeeming a deal deep-links into the request flow prefilled (?from=deal&…, lands on
  Step 6; age=1 marks identity already resolved in Deals — D-029).

ENDPOINTS / BACKEND SEAMS
- Deals inventory (merchant + SP deals, HQ-approved); audience/geo scoping mirrors
  the Deals audience-map dataset (ZIP-centroid, Maps-only rendering).
