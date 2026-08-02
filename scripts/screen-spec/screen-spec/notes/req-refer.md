VERDICT: NET-NEW — referral engine (no live equivalent).

BEHAVIOUR
- Refer screen: refer a friend (requester), refer a business (Connect), refer a
  worker (Go) — each tile opens its own branded modal (REFER_COPY key per kind —
  a missing key silently mis-brands as the fallback, add one for any new kind).
- Gopher ID doubles as the referral code. Referral tracking: pending (name fills at
  the invitee's signup — never typed by the referrer) → active.
- [hidden] TRAP: .rf-view sets display:flex which beats the UA [hidden] rule — any
  new hidden-attribute element with its own display needs a [hidden]{display:none}
  guard (only Connect carries a global one).

ENDPOINTS / BACKEND SEAMS
- Referral create/track/redeem; reward crediting into Gopher Rewards when live.
