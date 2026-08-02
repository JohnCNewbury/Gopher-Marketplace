VERDICT: NET-NEW — canonical Go feature G40-135; no live equivalent.

BEHAVIOUR
- "Refer Yourself": the worker shares their OWN code/QR so a customer saves them as a
  MY Gopher (distinct from the other refer tiles, which invite someone to a platform).
- The referral lands in the requester's inbox with "★ Add ⟨Gopher⟩ to MY Gophers".
- RESTORED by owner 7/27 after a mistaken removal — do not remove this tile again.
- Modal branding comes from REFER_COPY.self — any new refer kind needs its own
  REFER_COPY key or it silently mis-brands as the fallback.

ENDPOINTS / BACKEND SEAMS
- Referral tracking (pending → added), MY Gopher attach on redemption.
