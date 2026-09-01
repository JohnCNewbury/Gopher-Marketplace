# Prototype vs live — three findings, and the owner's ruling on each

**Raised 2026-08-31. Ruled 2026-09-01.** Owner's standing rule: *"The prototype was a product
built from most of the existing live app. Always check both and have me clarify which is
correct."*

| # | Finding | Ruling (2026-09-01) | State |
|---|---------|---------------------|-------|
| 1 | Counter-offer cap: tier exemption | **Prototype is the new logic** | Live backend is behind ruled canon — see §1 |
| 2 | Receipt required to raise cost of goods | **In play for the prototype** | Relay fixed, verified — see §2 |
| 3 | The three acceptance modes have no backend representation | **"Need more info"** | **§3 was WRONG. The modes ARE represented.** |
| 4 | *(found while verifying #2)* Go prototype reads a decimal money value 100× too large | **"Fix that"** | **Fixed and guarded** — see §4 |

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

## 4. FIXED — the Go prototype read a decimal money value 100× too large

**Found while verifying §2; owner said fix it (2026-09-01). Not a prototype-vs-live ambiguity —
live was unambiguously correct.**

Every money field in `gopher-go-prototype.html` was read as:

```js
parseInt((el.value || '').replace(/[^0-9]/g, '')) || 0
```

That does not *reject* a decimal point — it **deletes** it. **`61.40` became `6140`.**

Confirmed with **real keystrokes**, not a programmatic value set: typed `61.40` into Cost of items
→ the field held `"61.40"` → the app read `6140` → the requester's approval card offered
**$6,666.83** against an agreed **$87.47**. The inputs are `inputmode="numeric"`, which is **a
keyboard hint, not a filter** — there is no `beforeinput`/`keypress` guard, so a period is typeable
on desktop, on Android's numeric pad, and by paste.

**Live has always been right:** `gopher-mobile-gopher/src/component/ordercard.js:4709` uses
`type="number"` with `parseFloat(e.target.value)`, `cost_of_goods` is stored in **cents**, and live
counter-offers are the same shape (`(offer/100).toFixed(2)`) — so cents are meaningful there too.

### What changed

Two named helpers at the top of the app script, and every money read routed through them:

- `parseMoney(v)` → a Number rounded to cents. Tolerates `$`, spaces, commas and a stray second
  `.` (keeps the first, drops the rest).
- `fmtMoney(v)` → the display string. **Whole dollars stay bare** (`32`, not `32.00`) so no
  existing copy changed; cents render `61.40`.

⚠️ **NOT named `money()`.** A *different* `money()` already exists in this file — function-scoped
inside the Service-Provider deal modal — and it returns **null** for zero because it is a
validation helper. Two same-named money functions with opposite empty-value contracts is the same
class of trap this fix was removing.

⚠️ **Fixing the inputs alone would not have been enough**, and this is the part worth remembering.
`j.amt` is a display **string** (`"$52"`), and two readers parsed it with the same digit-stripping
idiom (`amtNum`, `curOffer`). Left alone, an adjustment applied at $61.40 would write `"$61.4"` and
the next read would come back **614** — the same bug one hop later. The writers now normalise
through `fmtMoney` and the readers go through `parseMoney`, so the round trip is closed.

Sites changed: the cost-adjustment sheet (offer, item cost, running total, the +15-min button), the
counter-offer amount, the two `j.amt` readers, and every writer the PT relay reaches
(`__ptDecision`, `__ptAdjustDecision`, `__ptBidResult`, `__injectJob`).

**Deliberately unchanged:** the bid fields (`.js-bidcost` / `.js-bidlabor`). They use `cleanAmt`,
which **rewrites the field** to what it parsed, so a typed decimal is visibly corrected rather than
silently multiplied — a different failure mode, and their whole-dollar behaviour is documented as
intentional. Live does support cents on bids, so **whether bids should accept cents is a product
question, not this bug.** Flagged, not decided.

### Verified end to end, 2026-09-01

Fresh request, no seeded data: COG $48 + offer $32 = **$87.47**, First Available, accepted on the
Go phone (auto-hired and auto-started).

| Step | Before | After |
|---|---|---|
| Item cost `61.40` submitted | read `6140` | reads **`61.40`** |
| Requester's approval card | **$6,666.83** | **$101.94** (+$14.47) |
| Receipt gate on first submit | blocked | still blocked (unchanged) |
| Approve, then re-open the sheet | would read `origCost 614` | reads **`origCost 61.40`** — round trip holds |
| Lower to `55.25` | — | `status: applied` (same-or-lower needs no approval), web shows **$95.30** |
| Counter panel, `62.50` on a $52 offer | read `6250`, rejected as over cap | accepted, inside the $78 cap |
| Counter cap message on a $41 offer | `$61` (floored) | **`$61.50`** — the cap is now reachable to the cent, as live allows |

### And a regression guard that can actually fail

`scripts/web-checks/go-money-parse.js`, wired in as step 9/9. It reads the **real file**, evaluates
the **real helpers**, and covers parse, format, round-trip, the named call sites, and an
anti-regression assertion that re-runs the OLD idiom and requires it to still be wrong — so a green
here is never a green that could not have been red.

⚠️ **Its first version was itself a guard that could not fail, and the mutation test is what caught
it.** That version stripped comments and counted `replace(/[^0-9]/g,'')` occurrences; on a 2.8 MB
single-file prototype full of embedded CSS, data URIs and `http://` links, the naive `//`
line-comment regex ate **82% of the file** (2,871,768 → 533,085 chars) and took two of the three
genuine matches with it. The mutation that reverted a call site to the old idiom **passed**. It now
asserts the call sites by name. All four mutations fail it:

| Mutation | Guard |
|---|---|
| `parseMoney` reverts to digit-stripping | ✅ fails |
| One call site reverts to the old idiom | ✅ fails |
| `fmtMoney` drops cents | ✅ fails |
| Counter amount reverts to the old idiom | ✅ fails |

---

## What is NOT changed

Nothing in the live apps and nothing in the backend. Two code changes, neither of which reaches a
live host: the receipt relay in `_prototypes/web-split-screen.html` (§2, `?pt=1`-gated) and the
money parsing in `_prototypes/Go/gopher-go-prototype.html` (§4, a prototype with no public host).
The §1 backend gap and the §3 web/live distance divergences are documented and untouched.
