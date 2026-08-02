VERDICT: NET-NEW (tracking) / ADAPT (status) — live tracking is broken at the root live.

BEHAVIOUR
- Live job view: status timeline (assigned → en route → arrived → items purchased →
  completed), worker card with contact, live map tracking, completion confirm
  (G40-65: requester confirms or disputes; age-restricted shows ID-confirmed event).
- Event log rows carry time + optional location (the pattern the worker history
  reuses).

ENDPOINTS / BACKEND SEAMS
- REBUILD tracking end-to-end: the live apps' initialize() crashes on a truthy redux
  placeholder and emitLocation() computes but never emits — the backend socket layer
  is fine; the client layer is NET-NEW.
- Completion confirm/dispute endpoints; payout release on confirm.
