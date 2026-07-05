# G40-113 — Capture "Suggested Offer Used" (Gopher iQ) Yes/No on Delivery & Ride orders

**Jira:** G40-113 (Task, Low) · Label `spine` · Backlog map: KEEP / bucket E / Wave 3
**Assignee:** John Newbury
**Surface (carried from G40-103):** the go-forward admin surface is the **Gopher HQ Dashboard**
(Orders report + order detail), not the legacy ActiveAdmin panel.

## Re-scope (John, 2026-07-03)

The original ticket was written against an **old UX** — a "Suggested Offer Assistance" modal with
SUBMIT / BACK buttons. That flow no longer matches the current app. The signal we actually want is
simpler:

- **Yes** — the offer was set by the user via the **Gopher iQ suggested-price button** (the iQ modal).
- **No** — the user set their price any other way (typed it in manually, or opened iQ and backed out).

Everything else about the ticket stands: Delivery & Ride only, going-forward only (no backfill),
immutable after submission, visible in the Orders report column + order detail field.

**Interpretation applied:** the flag reflects **where the *submitted* offer came from**, not merely
whether iQ was opened. Committing a price through the iQ modal's Submit = Yes; if the user then hand-edits
the pay field, it flips back to No (their final price wasn't the iQ one). This matches the ticket's
own "backed out then entered elsewhere = No" rule and the strategic question ("is the assistant actually
influencing the final price"). If you'd rather count *any* iQ open as Yes, it's a one-line change — see FE §3.

---

## The capture mechanism (end to end)

```
  [ Gopher iQ modal Submit ]  ──► state.suggestedOfferUsed = true  (Y)
  [ manual pay-field edit  ]  ──► state.suggestedOfferUsed = false (N)
                                        │
                                        ▼
             request submit payload  →  POST … suggested_offer_used
                                        │
                                        ▼
                orders.suggested_offer_used  (BOOLEAN, nullable)
                                        │
                                        ▼
        Orders.csv export  →  regen_ou.py (orders_full)  →  metrics.json
                                        │
                                        ▼
     HQ Dashboard: order-detail "Suggested offer used" + Orders-report column
```

---

## Layer 1 — Front-end capture ✅ DONE (this prototype)

Wired in both go-forward request surfaces. The current price UX (Step 5 / Worker Pay, Delivery + Ride):
a manual `#payAmountInput` field, plus a **"Need an offer suggestion?"** button
(`[data-action="ai-pay-suggest"]`) that opens the Gopher iQ modal; the modal's **Submit** writes the
chosen amount back into `state.payAmount`.

**`Final/gopher-request.html`**
1. State field — `makeInitialState()`, next to `payAmount`/`lowOfferAck`: `suggestedOfferUsed: false`.
2. **Y** — iQ modal Submit handler (`#offerSuggestSubmit`, ~line 11400): `state.suggestedOfferUsed = true`.
3. **N** — manual `#payAmountInput` `input` handler (~line 13777): `state.suggestedOfferUsed = false`.
4. Payload — `captureRequestToDashboard()` (`__createDashboardRequest({…})`, ~line 11805) now sends
   `suggestedOfferUsed`, **gated to Delivery/Ride + set-price mode** (bids / other categories → `null`).
   This is the field the real submit POST must carry as `suggested_offer_used`.

**`Final/gopher-connect.html`** (canonical business flow) — identical four edits.

> Prototype note: the prototype has no real backend; step 4 rides the flag into the in-memory dashboard
> request record so the signal is visible end-to-end. The production app must send `suggested_offer_used`
> in the actual create-order request body.
>
> Verification: edits were confirmed by inspection only — `node`/`jsc` are not available in this
> environment, so the JS was not executed. Smoke-test both flows before merge.

---

## Layer 2 — Backend persist (dev to apply)

Repo `gopher-backend-api`. Delivery/Ride = `category_type` in {`Delivery`, `Need a Ride`}
(constants/index.js) — the flag is `null` for anything else.

**a) Column — `models/orders.model.js`** (add alongside `offer` / `category_type`):
```js
suggested_offer_used: {
  type: Sequelize.BOOLEAN,
  allowNull: true,          // null = not applicable (non Delivery/Ride) OR pre-feature order (no backfill)
  defaultValue: null,
},
```
Plus a migration under `server/migrations/` adding a nullable boolean `suggested_offer_used` to `orders`.
**No backfill** — leave existing rows null.

**b) Persist at submission — `controllers/order/create.js`** (the `Order.create({…})` object, ~line 377):
```js
// G40-113: capture only for Delivery / Need a Ride; null otherwise. Immutable after this write.
suggested_offer_used:
  (req.body.category_type === 'Delivery' || req.body.category_type === 'Need a Ride')
    ? (String(req.body.suggested_offer_used) === 'true')
    : null,
```
Set once here; never written by any update/cancel/complete path (satisfies AC-8 immutability).
NB: there is an unrelated `suggested_offer` *value* calc already in this file (~line 181) — different field.

**c) Order log (optional, matches "orders logs"):** the order record itself now carries the flag, which is
what surfaces in the dashboard order log/detail. If you also want a discrete timeline event, write one
`order_logs` row at create; not required for the AC.

---

## Layer 3 — HQ Dashboard surface

**a) Order detail ✅ DONE** — `Dashboard/app_part4.js`
- Full-page order detail (`renderOrderPage`, Request section): new `_opKV('Suggested offer used', …)` →
  renders **Yes/No** when `o.suggestedOfferUsed` is set, else the earmark
  *"Going-forward capture · no backfill"* (historical + non-applicable orders).
- Quick-look drawer (`openOrderDetail`): same row, shown only when a Yes/No value exists.

**b) Orders report column (dev to add)** — `Dashboard/app_part2.js` `buildOrdersTable()` (~line 727):
add a **"Suggested Offer Used"** column (header + cell = `o.suggestedOfferUsed` → Yes/No/blank),
filterable/sortable/exportable like the other columns.

**c) Pipeline (dev, when real data flows)** — `Dashboard/regen_ou.py`
- Add `'suggestedOfferUsed'` to the `orders_full` **fields** list (~line 224) and set it in the per-order
  dict (~line 205) from the Orders.csv `suggested_offer_used` column (map `true→'Yes'`, `false→'No'`,
  null→`''`). The JS `ORD` objects key off these field names, so `o.suggestedOfferUsed` then populates
  automatically and both surfaces above flip from earmark to Yes/No.

Until the export carries the column, every order shows the earmark — which is correct (Scenario 5:
historical orders are never backfilled).

---

## Acceptance (mapped to the re-scoped definition)

1. Delivery/Ride offer committed via the Gopher iQ modal → `suggested_offer_used = true` → **Yes**.
2. Opened iQ, tapped Back, then typed a price → **No**.
3. Never opened iQ, typed a price → **No**.
4. Non-Delivery/Ride request → `null` / blank.
5. Pre-feature orders → `null` / blank (no backfill).
6. Orders report shows a filterable/sortable/exportable **Suggested Offer Used** column.
7. Order detail shows a **Suggested offer used: Yes/No** field.
8. Value is written once at submission and unchanged by later status transitions.
