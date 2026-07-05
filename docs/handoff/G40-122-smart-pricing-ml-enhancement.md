# G40-122 — Suggested Pricing: ML/context enhancement

**Jira:** G40-122 (Task) · Epic **G40-3 AI Inclusion** · Label `pay` · Priority Lowest
**Nature:** backend/pricing — **developer-only** (payments/pricing logic is fenced from AI edits). This doc is
the **zero-discovery spec**: the exact current algorithm + how to factor in the new signals. No code changed.

---

## Current algorithm (the thing to enhance)
`controllers/order/create.js` → **`exports.get_smart_price` (lines ~156-186)**. It takes only `service_cost`
(cost of goods, "COGS") and returns a flat base plus a tiered percentage:

```js
const base = 10.0;
let multiplier = 0;
if      (sc >= 25 && sc < 30) multiplier = 0.10;
else if (sc >= 30 && sc < 35) multiplier = 0.13;
else if (sc >= 35 && sc < 45) multiplier = 0.15;
else if (sc >= 45 && sc < 50) multiplier = 0.18;
else if (sc > 50)             multiplier = 0.20;
suggestion.suggested_offer = base + multiplier * sc;   // <-- static
```
**Only input is `service_cost`.** The ticket: *"Currently use static algorithm from COGS"* — correct.

> Incidental bugs to fix while here: `sc === 50` falls through to `multiplier = 0` (use `>= 50`), and any
> `sc < 25` returns the flat $10 with no scaling. Confirm both are intended before shipping.

## What the ticket wants added
Factor additional signals into the suggestion:
1. **Day of week** · 2. **Time of day** · 3. **Google-recognized holidays** ·
4. For **"Gopher can purchase from anywhere"** requests → **distance from pickup to drop-off**.

## Near-term (deterministic) design — ship before the model
Keep the COGS base, apply **contextual demand factors** multiplicatively, add a distance component:

```
core          = base + multiplier(sc) * sc                    // unchanged COGS core
demandFactor  = dowFactor * todFactor * holidayFactor         // each ~0.9–1.4, config-driven
distanceComp  = isShopAnywhere ? perMileRate * miles(pickup,dropoff) : 0
suggested_offer = round( core * demandFactor + distanceComp )
```
- **dowFactor / todFactor** — lookup tables (higher on weekends + evening/rush windows), tuned per market.
- **holidayFactor** — Google Calendar "Holidays in United States" calendar (or a holidays lib); cache yearly.
- **distanceComp** — Google Maps **Distance Matrix** (Maps is already an integration, RFP Annex §3) for
  pickup→drop-off miles; applies only to the "purchase-from-anywhere" request type.

### Inputs `get_smart_price` must start receiving
Today it only gets `service_cost`. Add to the request body / derive server-side:
- `requested_at` (or use `now()` in the requestor's timezone) → dow + tod,
- request **type/category** → the `isShopAnywhere` flag (identify the "buy from anywhere" type),
- **pickup + drop-off** addresses/coords → Distance Matrix miles.

## ML path (the AI-Inclusion goal)
The deterministic factors are the bridge; the model replaces the hand-tuned multipliers:
- **Training data:** log every suggestion (features) alongside the **realized accepted offer** and
  time-to-accept. Sources already exist — `orders` (final offer, category, timing, geo via `addresses`) and
  `orders_cogs` (`original_offer` / `original_cost`). Add a `pricing_suggestions` log if you want clean
  (features → outcome) rows.
- **Features:** service_cost, dow, tod, holiday flag, distance, geo (state/zip), category, recent local
  acceptance rate.
- **Target:** the offer that gets accepted quickly (regression toward accepted offer / time-to-fill).
- Serve behind the same `get_smart_price` endpoint so the client contract doesn't change.

## Acceptance criteria
1. `get_smart_price` factors day-of-week, time-of-day, and US holidays into the suggestion (not just COGS).
2. "Purchase-from-anywhere" requests add a pickup→drop-off distance component.
3. Suggestion logic is centralized in `get_smart_price` (single seam); client contract unchanged.
4. Suggestions + realized accepted offers are logged so a model can later replace the deterministic factors.

## Notes
- Fee tiers (`helpers/functions.js:219`, `FEES.APPLICATION_FEE_*`) are a separate concern from `suggested_offer`.
- Keep it one endpoint — the app already calls `get_smart_price`; enhancing it needs no client rework beyond
  passing timing/type/addresses.
