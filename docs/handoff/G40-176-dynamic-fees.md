# G40-176 — Dynamic fee updating (Gopher Fee / Instant Transfer / Age-Restricted)

**Jira:** G40-176 (Story) · Epic **G40-1 Bug Fixes & Polish** · Label `age` · Priority Lowest
**Status of the work:** the admin-facing tool is **already built** in the Gopher HQ Dashboard. This ticket is
now about **wiring that tool to the real DB / backend / client** so fee edits are dynamic at runtime instead
of hard-coded in `constants/index.js`.

---

## What the ticket asks
Fees on Gopher requests must be **dynamic and editable via the admin portal** — currently hard-coded in
`gopher-backend-api/constants/index.js`. The **DB, backend, and admin panel** all need updating. The three
fees: **Gopher Fee**, **Instant Transfer Fee**, **Age-Restricted Fee**.

## ✅ ALREADY CODED — the "Pricing Control" tool in the HQ Dashboard
**Where:** `Documentation/Dashboard/app_part4.js` → `VIEWS.pricing` (the **Pricing Control** tab, registered
`app_part1.js:169`, `icon:'price'`, **OWNER**-gated). It renders in the built `output/Gopher_HQ_Dashboard.html`.

### The model (`seedPricing()`, app_part4.js:284)
A single source-of-truth object, seeded from the canonical pricing sheet (`M._parity.truth`):
```js
PRICING = {
  gopherFee:  { <category>: { request, connectStd, connectBiz } },   // 8 categories × 3 surfaces
  ageFee:     { request:1.99, connectStd:2.99, connectBiz:2.99 },    // Age-Restricted Fee
  instantTransfer: 0.08,                                             // Instant Transfer Fee (8%)
  deal:       { serviceWaivesAll:true, boostPct:0.10 },
  _publishedAt: <iso|null>
}
```
Categories: delivery, other, ride, labor, junk, yard, moving, home. Surfaces: Request app / Connect Standard
/ Connect Business. **All three fees the ticket names are editable here.**

### The UI + behavior (all working today)
- **Editable schedule table** — a `$`-input per (category × surface) gopher fee, plus an age-restricted row;
  Instant Transfer as a `%` input (`#px-it`), deal boost `%`, and a "service deal waives all fees" toggle.
- **Owner-gated** — non-owners see "Owner access required"; only Owner can edit (`ROLE==='owner'`).
- **Live audit log** (`PRICING_AUDIT` / `logChange()`) — who/field/from→to/timestamp, shown in "Change log",
  persisted alongside pricing.
- **Live parity check** (`parityVs()`) — diffs the edited truth against the **backend** and **Connect client**
  per surface/category, flagging mismatches/gaps. Mirrored by the CI script `pricing_parity_check.py`
  (+ `pricing_parity.json`) that gates truth vs `constants/index.js` vs `gopher-connect.html`.
- **Backend patch generator** (`genBackendPatch()`, app_part4.js:398) — emits a ready-to-paste
  `constants/index.js` block: `exports.FEE_SCHEDULES = { request/connectStd/connectBiz: {…, ageFee} }` +
  `exports.INSTANT_TRANSFER_RATE`, plus the `create.js` surface-selection snippet. **This is the exact target
  shape for the backend.**
- **Persistence today = localStorage** (`persistPricing()` → `gopher_pricing` + `gopher_pricing_audit`) plus
  **Export/Import config JSON**. "Save & publish" stamps `_publishedAt`. *This is the prototype seam — it does
  not yet reach the real DB/backend.*

## 🔧 TO BUILD — connect the tool to DB / BE / FE
The editor, audit, parity, and code-gen are done. What's missing is making it **live** end-to-end:

### 1. DB
- New table **`fee_schedules`** (or `app_settings`) holding the full `PRICING` model — one row per
  (surface, category) gopher fee, `ageFee` per surface, `instantTransfer`, `deal.boostPct`,
  `deal.serviceWaivesAll`, and `published_at`.
- New **`fee_schedule_audit`** table mirroring `PRICING_AUDIT` (role, field, from, to, ts).

### 2. Backend
- Replace the hard-coded fees in **`constants/index.js`** with a **DB read** (cached; cache-bust on publish).
  Use the `genBackendPatch()` shape (`FEE_SCHEDULES` + `INSTANT_TRANSFER_RATE`) but sourced from `fee_schedules`.
- Update the consumption sites to read the dynamic values:
  - `controllers/order/create.js` — `application_fee` (gopher fee by category × surface) and
    `age_restricted_fee` (surface-aware; the patch's `SCH.ageFee`).
  - `lib/payment.stripe.js` — the instant-transfer rate (the 8% ITF).
- **Admin write API** (owner-only), e.g. `PUT /admin/pricing` — persists the posted `PRICING` to
  `fee_schedules` + writes `fee_schedule_audit` rows. `GET /admin/pricing` hydrates the tool from the DB.

### 3. Dashboard (small change)
- Point `seedPricing()` / `persistPricing()` at `GET/PUT /admin/pricing` instead of localStorage
  ("Save & publish" → the write API). Everything else (edit UI, parity, audit, patch) stays.

### 4. Client apps (FE)
- The consumer app and `gopher-connect.html` currently hard-code their own schedules
  (`GOPHER_FEE` / `AGE_FEE` / business). Point them at a public `GET /pricing?surface=…` (or bake at build
  from the same source). Keep `pricing_parity_check.py` as the CI guard that client + backend + truth agree.

### Note — surface-awareness is a bonus fix
The backend today ships only the consumer schedule (no Connect schedule), so Connect age-restricted orders
fall back to $1.99 instead of $2.99. Making fees DB-driven with the surface-aware shape closes that gap too.

## Acceptance criteria
1. Owner can edit Gopher Fee (per category/surface), Age-Restricted Fee, and Instant Transfer Fee in the
   dashboard — **done** (Pricing Control).
2. Edits persist to the **DB** (not localStorage) via an owner-only admin API — *to build*.
3. Backend charges from the **DB-driven** schedule, not `constants/index.js` hard-codes — *to build*.
4. Client apps display fees consistent with the DB (parity check green) — *to build*.
5. Every change is audit-logged (who/what/when) — **done** in the tool; persist server-side — *to build*.

## Notes
- The dashboard already treats pricing as the company source of truth and can already **generate the exact
  backend constants** — the dev's job is to swap "generate a patch + localStorage" for "read/write the DB via
  an admin API."
- Keep the Owner gate (`ROLE==='owner'`) → owner-only admin auth on the write endpoint.
