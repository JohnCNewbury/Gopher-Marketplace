VERDICT: ADAPT — history read model exists; the payout-issue lane + privacy rules are canon.

BEHAVIOUR
- "Previous requests" (never "Request history" in customer-facing copy — owner canon).
- Tabs: Completed / Cancelled / Payout issue. Search over history.
- Live session jobs interleave with seeded rows; in split-prototype mode the list
  starts empty and fills as jobs actually complete.
- INV-RATING: live rows never show the stars a requester gave (ratings are
  system-only, never shown to the other party). Seeded demo rows carry stars only as
  static art.
- Cancelled rows state earnings impact + resolution ("No action needed…" /
  "a fee may apply per the Gopher terms").

ENDPOINTS / BACKEND SEAMS
- Orders read by worker, completed = AASM 'delivered'; cancellation records with
  actor + kind (requester repost vs worker cancel) drive the copy per row.
