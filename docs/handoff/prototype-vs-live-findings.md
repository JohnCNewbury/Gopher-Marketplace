# Prototype vs live — three findings, and the owner's ruling on each

**Raised 2026-08-31. Ruled 2026-09-01.** Owner's standing rule: *"The prototype was a product
built from most of the existing live app. Always check both and have me clarify which is
correct."*

| # | Finding | Ruling (2026-09-01) | State |
|---|---------|---------------------|-------|
| 1 | Counter-offer cap: tier exemption | **Prototype is the new logic** | Live backend is behind ruled canon — see §1 |
| 2 | Receipt required to raise cost of goods | **In play for the prototype** | Relay fixed, verified — see §2 |
| 3 | The three acceptance modes have no backend representation | **"Need more info"** | **§3 was WRONG. The modes ARE represented.** |

---

## 1. Counter-offer cap — ruled: the prototype's tier exemption is the new logic

The formula matched all along: prototype `Math.max(20, amtNum*1.5)`
(`gopher-go-prototype.html:3244`) is the live backend's `Math.max(20, currentOffer * 1.5)`.

**The exemption was already ruled, before I raised it.** It is written in two places:

- `docs/handoff/G40-309-modal-dispositions.md:81` — *"The 150% cap is ONLY for standard Gophers,
  there is no cap for Elite/Elite+/Pro Gophers. This has been updated in the Gopher — Intended /
  Matrix"*
- `docs/handoff/G40-336-counter-potential-worker-signal.md` §6, quoting **D-026** as authoritative:
  - counter adjusts **Earn only** and must beat the offer
  - **Standard:** 5 counters per calendar month (resets the 1st), floor **$20**, ceiling **150% of
    the OFFER only** — cost of items is not in the base
  - **Elite / Elite+ / Pro:** unlimited and uncapped
  - **"Caps are enforced server-side."**

So the ruling confirms existing canon rather than creating it. What it changes is where the defect
sits: **not in the prototype — in the live backend.**

### The live backend is behind D-026 in two ways

Read first-hand on the `production` branch (not the shared clone's checked-out branch):

```js
// helpers/functions.js:912 — production
function isCounterOfferValid(currentOffer, counterOffer) {
  const maxAllowedOffer = Math.max(20, currentOffer * 1.5);
  return counterOffer <= maxAllowedOffer;
}
```

1. **No tier exemption.** The function takes no tier argument, and its single caller
   (`controllers/order/counter_offer.js:101`) passes none. **Live caps Elite, Elite+ and Pro
   exactly like Standard** — the opposite of the ruling.
2. **No monthly limit at all.** Nothing under `controllers/` implements "5 per calendar month".
   D-026 says caps are enforced server-side; this half is enforced nowhere.

**Not changed.** This is production authorization logic that decides what a worker may be paid,
and the standing rule is that nothing reaches production without the owner seeing what it solves,
the risk and the reward first. Flagged here, ready to spec on request.

⚠️ The prototype's `coTiered=false` (line 3243) is **correct as written** — the depicted worker is
Standard, and the flag is the documented seam for depicting a tiered one. Nothing to fix there.

---

## 2. Receipt on a cost-of-goods increase (G40-101) — ruled: in play for the prototype

Live has no such gate on either side; the prototype enforces it. **Ruling: the prototype is
right.** The prototype also already documents the intended architecture, including the server-side
half:

> *"Server-side, a receipt is REQUIRED whenever new Cost of Items > original — enforce that on the
> endpoint, not only in the UI."* — `gopher-go-prototype.html`, receipt component contract

### What was actually broken — and it was mine

Both ends were already built:

- **Go** blocks the submit on `receiptAttached` (`gopher-go-prototype.html:3461`)
- **Web** renders `window.__receiptThumb(P.receipt && P.receipt.src)` whenever `P.receipt` is
  truthy — in the card (`gopher-request.html:22446`) *and* in the breakdown modal, on **both**
  Request and Connect

Only the **playground relay** dropped it. It turned the receipt into the words *"(receipt
attached)"* appended to the worker's note — the one form the requester cannot act on, since the
card's whole instruction is *"zoom in and verify the line items and total before you approve."*

**Fixed** in `_prototypes/web-split-screen.html` — the relay now passes
`receipt: { src: null }`. `src` is null deliberately: the Go app's attach button records the
*fact* of a receipt, not an image, and the component documents null as its stand-in ("When src is
null/undefined the demo receipt shows"). This is also exactly what the reference **App Prototype
Split** does — `split-screen.html:488` relays the boolean, `gopher-request-home.html:1577` draws
the demo from it — so the two harnesses now behave identically. The seam for a real image is
`receipt.src` and nothing else changes.

### Verified end to end, 2026-09-01

Real request through all 7 steps (no seeded data): Delivery/Errand, COG **$48**, offer **$32**,
total **$87.47**, First Available. Go accepted → auto-hired *and* auto-started (`status
in-progress`, `autoHired true`) — re-confirming the 2026-08-31 First Available ruling.

Then, on the Go phone:

| Step | Result |
|---|---|
| Raise item cost above original | Receipt notice appears on its own (`display:block`) |
| Submit **without** a receipt | **Blocked** — toast *"Attach a receipt to raise the item cost"*, no adjustment created, nothing relayed |
| Attach, then submit | `hasReceipt: true` → relayed as `receipt: {src: null}` |
| Requester's card | Receipt thumbnail renders (5,552-char SVG data URI) with *"Receipt attached. Tap to zoom in and verify the line items and total before you approve."* |
| Decline | Relayed back as `status: declined`, price held at $87.47 |

The negative case is the point: the gate was proved by watching it **refuse**, not only by
watching it pass.

---

## 3. ⛔ CORRECTION — the three acceptance modes ARE represented server-side

**My original finding was wrong, and this is the correction.** I reported that
`models/orders.model.js` had "no `worker_selection`, no `first_available`, no `selection*`". Those
were the wrong names. The field is **`selectgopher`** — one word, no underscore — and it has been
there all along. Everything I concluded from its absence should be discarded.

### How live actually encodes the modes

Two booleans on `orders`, not a three-valued enum:

| Web `workerSelection` | `notify_fav_gopher` | `selectgopher` | Live behaviour |
|---|---|---|---|
| `first` | false | false | Worker's claim assigns the order immediately |
| `select` | false | **true** | Worker's claim creates a candidacy row and returns |
| `my` | **true** | **true** (forced) | Hand-picked worker auto-hires; everyone else is a candidacy |

The live admin panel names all three in one line — this is the clearest statement of the rule
anywhere in the codebase (`controllers/admin/orders.js:176`):

```sql
case when ord.notify_fav_gopher = true then 'Notify To Fav Gopher'
     when ord.selectgopher = true and (ord.notify_fav_gopher = false or ord.notify_fav_gopher is null)
       then 'Select My Gopher'
     else 'First Available' end as GopherMode
```

**The two booleans are not independent.** `controllers/order/create.js:414`:

```js
selectgopher: String(req.body.notify_fav_gopher) === 'true' ? true : req.body.select_gopher,
```

Setting `notify_fav_gopher` **forces** `selectgopher` true. That is why the admin CASE has to test
`notify_fav_gopher` first — `my` is a *sub-mode* of `select`, not a third peer value. Any future
schema work should know that before touching either column.

### Where it is enforced

`controllers/order/update.js` `assign_order`, the single funnel all three claim paths run through
(`order_claim` for a worker's claim, `order_gophers.accept` for a requester's accept,
`counter_offer` for an accepted counter):

- **:3810** — `if ((get_order.selectgopher || distance_exceeded) && gopher && !counter_offer_id && …)`
  → create an `OrderGophers` candidacy row and stop. No assignment, no charge.
- **:3852** — inside that branch, if the claimer is a hand-picked favourite:
  `is_notify_first(order_id, gopher_id)` (a row in **`notify_first_orders`**) → charge the token,
  set `gopher_id`, move to ACCEPTED. The code comment says it outright: *"If Order is claimed by
  Offered Fav Gopher, treat this as First Available."*
- Neither → falls past the branch to direct assignment.

`is_notify_first` requires an explicit per-order hand-pick, matching D-035 and
`helpers/broadcastCadence.js`: **the toggle alone is not enough** — a saved MY Gopher who was not
hand-picked falls through to the ordinary ladder.

### So the answer to the original question

The modes are **not** client-side UX over one server behaviour. They are a real server-side
product rule with a schema, a funnel, and an admin report. **The web↔Go acceptance relay is built
on something the backend actually implements**, which was the thing I said was at risk. It is not.

### The one thing that IS worth a decision — a fourth mode I did not know existed

`assign_order:3775-3806`: a **First Available** order can behave like **Select** at runtime.

```js
const isNonProGopher = +users_roles.gopher_type_id === 0;
if (location && !get_order.selectgopher && isNonProGopher &&
    await is_new_app(users_roles.app_version, users_roles.device_type, 2, 'long_distance_approval')) {
  if (distance > NEED_APPROVAL_ON_EXCEED_DISTANCE) distance_exceeded = true;   // 15 miles
}
```

If a **non-Pro** worker on a new-enough app claims from **more than 15 miles** away
(`constants/index.js:569`), the claim becomes a candidacy the requester must approve — even though
the requester chose First Available. The same rule guards counter-offers
(`counter_offer.js:128`) and bids (`order_bids.js:116`).

**So the acceptance mode is not purely a property of the request.** It is `(mode, worker tier,
worker distance, worker app version)`.

The web apps implement a version of this and **diverge from live in two ways** — both in
`gopher-request.html:20696` / `gopher-connect.html:21085`, and faithfully mirrored by the
playground bridge:

1. **Web applies the 15-mile pause to every worker.** Live applies it **only to non-Pro**
   (`gopher_type_id === 0`) and only when the worker's app build supports `long_distance_approval`.
   So on the web a Pro is paused; on live a Pro is not.
2. **Web's `my` branch ignores distance entirely.** Live requires `!distance_exceeded` before a
   hand-picked favourite auto-hires.

**Both need a ruling, and neither is changed.** Question for the owner: should the web adopt live's
non-Pro-only rule (and add the distance check to `my`), or is the web's flat rule the newer
intent — the way the counter-offer tier exemption turned out to be?

---

## 4. New, found while verifying §2 — the Go prototype reads a decimal cost 100× too large

**Not a prototype-vs-live ambiguity. Live is unambiguously correct; the prototype has a money bug.**

`gopher-go-prototype.html:3450, 3459-3460` reads both money fields as:

```js
parseInt((el.value || '').replace(/[^0-9]/g, '')) || 0
```

That strips the decimal point. **`61.40` becomes `6140`.**

Confirmed with **real keystrokes**, not a programmatic value set: typed `61.40` into Cost of items
→ field holds `"61.40"` → the app reads `6140` → the requester's approval card offered
**$6,666.83** against an agreed **$87.47**. Screenshot in the session; the receipt row rendered
correctly beside the wrong number.

The inputs are `inputmode="numeric"`, which is **a keyboard hint, not a filter** — there is no
`beforeinput`/`keypress` guard anywhere on either field. A period is typeable on desktop, on
Android's numeric pad, and by paste. Both `.js-upoffer` and `.js-upcost` are affected.

**Live does this correctly.** `gopher-mobile-gopher/src/component/ordercard.js:4709` uses
`type="number"` with `parseFloat(e.target.value)`, and `cost_of_goods` is stored in **cents**
(`/100` on every display, `*100` on submit).

**Not fixed** — `_prototypes/Go/gopher-go-prototype.html` is a shared surface and this is outside
what was asked today. The fix is to match live: accept a decimal and parse with `parseFloat`. Say
the word.

---

## What is NOT changed

Nothing in the live apps, nothing in the backend, nothing in the Go prototype. The only code change
from this pass is the receipt relay in `_prototypes/web-split-screen.html` (§2), which is
`?pt=1`-gated and reaches no live host.
