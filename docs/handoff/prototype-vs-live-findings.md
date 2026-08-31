# Prototype vs live — three findings, owner's call on each

**2026-08-31.** Owner's standing rule: *"The prototype was a product built from most of
the existing live app. Always check both and have me clarify which is correct."* So these are
presented as divergences, not as defects — I have not ranked them, and I have changed nothing.

All three were things I originally reported from the **prototype alone**, before that rule was
given. Each is now checked against the live apps first-hand. Sources are named so they can be
re-derived rather than trusted.

---

## 1. Counter-offer cap — the rule MATCHES; the tier exemption does NOT

**Agreed.** Prototype `Math.max(20, amtNum*1.5)` (`gopher-go-prototype.html` ~3468) is exactly
the live backend's `Math.max(20, currentOffer * 1.5)`
(`gopher-backend-api/helpers/functions.js:755`, `isCounterOfferValid`). My earlier report of this
cap was correct.

⚠️ **Diverges on who it applies to.** The prototype's comment says:

> *"Standard-tier ceiling … Elite/Elite+/Pro: unlimited & uncapped."*

The live rule takes **no tier argument at all** — `isCounterOfferValid(currentOffer, counterOffer)` —
and `controllers/order/counter_offer.js` has no tier reference on that path. **Live caps every
worker.**

**Question:** should tiered workers be uncapped (prototype) or is the flat cap correct (live)?
The prototype also carries `coTiered=false`, so today it *behaves* like live — the divergence is in
the stated rule, which is what dev will build from.

---

## 2. Receipt required to raise cost of goods (G40-101) — prototype has it, live does NOT

The prototype blocks a cost-of-goods increase without a receipt:

> `if(newCost>curCost && !receiptAttached){ … toast('Attach a receipt to raise the item cost'); return; }`

**Live has no such gate, on either side.** `gopher-mobile-gopher/src/` has zero hits for
`receipt_image` / `attach…receipt` / `receipt…required`, and `controllers/order/cost_adjustment.js`
has no receipt check. The only "receipt" in the backend is G40-88's *emailed* updated-request
receipt, which is unrelated.

This is the **opposite direction** to the no-show timer: there the prototype had regressed from
live; here the prototype is **ahead** of live — plausibly correct-as-spec for work not yet built.

**Question:** is G40-101 shipped-and-I-missed-it, still-to-build, or dropped? If it is to build, the
prototype is right and live is behind.

---

## 3. The three acceptance modes (INV-ACCEPT) have NO backend representation

Prototype and both web apps model three modes — `first` / `select` / `my` — and INV-ACCEPT is
treated as canon across the flow docs.

**The live `orders` model stores no such field.** `models/orders.model.js` has no
`worker_selection`, no `first_available`, no `selection*`. Nothing under `controllers/`, `helpers/`
or `models/` names those concepts; `my_gophers` exists, but that is the saved-worker relationship,
not a per-order selection mode.

So on the live platform an acceptance is an acceptance — `controllers/order/order_gophers.js`
`exports.accept` — and the mode that decides whether it auto-hires appears to live only in the
clients.

**Question:** are the three modes client-side UX over one server behaviour, or a planned feature the
schema has not caught up to? This one matters most of the three: **it is the rule the whole
web↔Go acceptance relay is built on**, and if the server cannot distinguish the modes then the
distinction cannot survive a real backend.

---

## What I did NOT do

Changed nothing in the prototype, the live apps, or the backend on the strength of these. Each needs
a ruling first. Related and already ruled on: the no-show timer (prototype regression, fixed by the
TrustShield session as `fadee76`), First Available auto-start (owner: use the live behaviour, done),
report taxonomy (owner: already exists, ported from `gopher-mobile-request`).
