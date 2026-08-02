VERDICT: ADAPT — settings shape carries; the ride gate is canon and must be server-enforced.

BEHAVIOUR
- Categories (9) + radius; Elite tier gets separate delivery/labor radii.
- Age-restricted delivery is its own category card (owner 7/23).
- RIDE GATE (owner canon 7/26): enabling Ride Sharing requires ALL ride fields —
  front + rear vehicle photos, registration, insurance, and every vehicle text field —
  before the save is accepted. "On file" counts as satisfied (settled — don't tighten).
  The prototype's rideComplete() additionally drops Ride Sharing from saved categories
  when incomplete, and re-gates at accept time.
- Gate runs BEFORE any OTP/confirm step — never collect a code for a save that will fail.

ENDPOINTS / BACKEND SEAMS
- Worker profile update endpoint. Server must re-validate the ride gate (client-only
  enforcement is the live app's recurring mistake — see G40-91 pattern).
