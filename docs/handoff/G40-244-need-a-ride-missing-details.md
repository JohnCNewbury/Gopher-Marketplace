# G40-244 — "Need a Ride" details (riders / instructions / trip distance) missing on the Gopher view — DEV HANDOFF

**Type:** Bug (`worker`) · **Priority:** Medium · Gopher Go app (+ possible backend). Verified against the 2026-06-12 `gopher-mobile-gopher-` export.

> ⚠️ **Scope correction (verify-before-build):** the ticket says all three are missing, but in the current export **only rider count is truly missing from the UI.** Trip distance and special instructions are **already coded** on the available-request details view — so those two are most likely a **data/field-mapping gap**, not missing UI. Don't re-implement what's already there; verify data first.

## The Gopher "request details view" = `src/component/layoutComponent/RequestDetailPullOver.js`
This is the pullover the gopher sees for an **available** request (rendered from `src/component/getOrders.js:1474`; it owns accept / make-an-offer / pickup / complete). That's the surface the ticket means. (The list *card* `GopherOrderCardView.js` is a separate summary — see note at end.)

## Field-by-field current state (in `RequestDetailPullOver.js`)

### 1. Rider count — ❌ genuinely missing → ADD
No `noof_rider` / "Riders" anywhere in this component (confirmed: grep count 0). The requester submits it as **`order_info.noof_rider`** (see `counterbox.js`), and it's already rendered in the *other* view `requestOrder.js:2489` — copy that pattern here:
```jsx
{props.request?.category_type === "Need a Ride" ? (
  <KeyValueDisplay Caption="Riders" Value={props.request?.order_info?.noof_rider} ... />
) : null}
```
Per AC: **always** shown for Need a Ride (required at submit, value ≥ 1). Place it near the trip-distance/details blocks (~L3100-3130).

### 2. Trip Distance — ✅ already implemented → VERIFY, don't rebuild
`RequestDetailPullOver.js:3107` renders `Trip Distance: ${localFormProps.tripDistance} mi`, with display gated on **`pickup_address.latitude && dropoff_address.latitude`** (`:3099-3102`). `tripDistance` is fetched from the `get_distance?origin=…&destination=…` API (`:656`). For a ride (always has pickup+dropoff) it **should** show. If it doesn't:
- Confirm the available-ride payload includes **pickup & dropoff `latitude`/`longitude`** (the display hides silently without them).
- Confirm the `get_distance` call succeeds for the ride's coords.
So: a **data/coords** check, not a UI change. (Note: the sibling `requestOrder.js:2673` uses the same value with an inverted-looking `!tripDistance ? <empty> : <show>` ternary — that one is correct; just be consistent.)

### 3. Special Instructions — ✅ already implemented → VERIFY DATA + relabel
`RequestDetailPullOver.js:3946` renders `props.request?.special_instructions` (display gated on it being present), but under the caption **`Details:`**. The requester submits top-level `special_instructions` (Request app `helpers/orderObject.js:124`, `pages/summary.js:919`). If it's not appearing on a ride:
- Verify the **available-request payload carries `special_instructions`** for Need-a-Ride orders (backend order retrieve for the gopher available list — `controllers/order/retrieve.js`). If the ride form stored instructions under a different key (e.g. `order_info.*`), fix the mapping so the view reads the populated field.
- Per AC (full text, no truncation; omit row when empty) the current `display: special_instructions ? flex : none` already omits-when-empty and shows full text — good. Consider **relabeling `Details:` → `Special Instructions`** to match the AC wording (and to disambiguate from the separate `description` block at ~L3123).

## Why the ticket likely reported all three
Rider count is absent (real), and trip distance + special instructions **hide silently** when their data is missing (`display: … ? flex : none`) — so a ride whose payload lacks coords or `special_instructions` shows *nothing* for those rows, reading as "missing." Root for 2 & 3 is almost certainly the **payload**, not the view.

## Recommended work
1. **Add the Riders row** to `RequestDetailPullOver.js` (Need-a-Ride only, `order_info.noof_rider`, always shown). ← the only certain UI change.
2. **Verify the gopher available-request payload** (backend `controllers/order/retrieve.js` available-orders query) returns, for Need-a-Ride: `order_info.noof_rider`, `special_instructions`, and pickup/dropoff `latitude`/`longitude`. Add any that are stripped.
3. **Relabel** `Details:` → `Special Instructions` for the `special_instructions` block.
4. Regression: Delivery + Service views unchanged (Scenario 6).

## QA (from the ticket, plus the scope correction)
- Submit a Need-a-Ride with riders + instructions + valid pickup/dropoff → all three show on the gopher pullover.
- Submit without special instructions → the row is omitted (already the behavior).
- Long instructions → full text (already the behavior).
- Trip distance matches a known route in **miles**.
- Confirm on a real device the two "already-coded" fields render once the payload is confirmed — if they do, the remaining code change is just the Riders row.
- iOS + Android; regress Delivery/Service.

## Note — the list card (secondary)
`src/component/GopherOrderCardView.js` (the available-list card) shows trip distance (`:884`, gated on coords) but not riders/instructions. If you want the summary card to surface riders too, add it there as well — but the ticket's "details view" is the pullover above.

## Files
- `src/component/layoutComponent/RequestDetailPullOver.js` — add Riders row (~L3100-3130); relabel special-instructions caption (~L3946).
- `controllers/order/retrieve.js` (backend) — verify Need-a-Ride available payload includes `order_info.noof_rider`, `special_instructions`, pickup/dropoff coords.
- (optional) `src/component/GopherOrderCardView.js` — riders on the list card.
