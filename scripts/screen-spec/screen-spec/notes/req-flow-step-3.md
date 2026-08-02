VERDICT: ADAPT — logistics details per category.

BEHAVIOUR
- Delivery type (items in hand vs purchase needed), pickup/dropoff addresses
  (Saved addresses integration — owner: a VERY important feature, restored 7/23),
  category-specific detail blocks (crew size for labor, truck fraction for junk…).
- REQUEST HIRE RULE (owner 7/27): workersNeeded is the CREW SIZE and drives
  pricing/labels — but a Request job always HIRES ONE lead worker who brings/pays
  the rest. Never build individually-hired multi-worker into Request (Connect-only).

ENDPOINTS / BACKEND SEAMS
- Address book CRUD; distance/duration for ride/delivery pricing via the backend
  Maps proxy (never a raw client key — SEC-1).
