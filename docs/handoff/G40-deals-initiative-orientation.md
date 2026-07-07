# Deals Marketplace initiative (DLM + DLP) — orientation & sequencing

Covers the net-new Deals cluster: **G40-286–292 (DLM)** + **G40-293–295 (DLP)**. All are one-line
Stories/Tasks with no acceptance criteria yet — this doc frames the initiative, maps what already
exists, sequences the build, and flags dependencies so each ticket can be fleshed out to dev-ready.

## Two tracks
- **DLM — Deals (merchant / last-mile).** Merchants post deals; customers browse and order; some
  orders seed a Gopher last-mile delivery.
- **DLP — Deals Local Pro (service providers).** Vetted local pros post defined-price service deals
  in a radius; customers browse and redeem, which spawns a provider-directed request.

## The 10 tickets
| Key | | What |
|---|---|---|
| **G40-286** | DLM-1 | Merchant self-registration + deal posting (free) — **foundation** |
| G40-287 | DLM-2 | Merchant portal dashboard + inbox |
| G40-288 | DLM-3 | Manage deals across locations |
| G40-289 | DLM-4 | Bid-for-Placement (open, opt-in auction) |
| G40-290 | DLM-6 | Customer browse deals by location/category |
| G40-291 | DLM-7 | View merchant deal + order on merchant site |
| G40-292 | DLM-8 | Seed last-mile delivery from a merchant order |
| **G40-293** | DLP-1 | Provider registration (defined-price deal, 50-mi radius) — **foundation** |
| G40-294 | DLP-3 | Customer browse Local Pro Deals |
| G40-295 | DLP-4 | Redeem provider deal (provider-directed request) |

## What already exists (reuse, don't rebuild)
- **Customer browse** — `Final/gopher-customer-deals.html` (customer-facing deals browse) + the
  merchant deal display in `Final/gopher-deals.html` (23 merchant logos, category structure). These
  are the front-end starting point for **DLM-6 / DLP-3** (browse by location/category).
- **Admin deal management + live/tracking** — `advertiserDeals.js` (the **G40-180** Admin Advertising
  Partner Entry tool, In Progress in the HQ Dashboard): `isDealLive` (active + in date window),
  `liveHomeDeals`, `trackClick` (deal + request click counters), `toCsv`. DLM deal lifecycle
  (active/scheduled/paused, click tracking) rides this — extend it rather than build parallel logic.
- **Location intelligence** — the Gopher iQ coverage layer (`gopher-iq-data.js`, 10-mi radius) already
  resolves location→coverage; the DLP 50-mi radius + DLM location browse can reuse the same geo seam.
- **Order engine** — `controllers/order/create.js` is where **DLM-8** (seed last-mile delivery) and
  **DLP-4** (provider-directed request) create the actual Gopher request from a deal.

## Net-new (the real build)
1. **Merchant + provider accounts/portals** (DLM-1/2/3, DLP-1) — self-registration, a merchant/provider
   portal, deal CRUD across locations. **Depends on the account model** — fold merchants/providers into
   the unified identity (**G40-296 SPINE-1**) as an entity type, and reuse the **B2B portal shell
   (G40-160 / Epic G40-2)** rather than a standalone auth.
2. **Deal data model** — deals today live in the admin tool / prototype only; needs a real
   `deals` table (merchant/provider id, category, location(s), price/defined-price, radius, window,
   status, click counters) behind the `advertiserDeals` seam.
3. **Bid-for-Placement auction** (DLM-4) — net-new: opt-in ranking auction for deal placement.
4. **Merchant-site view + order** (DLM-7) — external merchant-site integration/deep link.
5. **Deal → request bridge** (DLM-8, DLP-4) — a deal order/redemption calls `create.js` to spawn a
   delivery (DLM) or a provider-directed service request (DLP), tying Deals into the core marketplace.

## Recommended sequence
**Foundations first** (G40-286 DLM-1 + G40-293 DLP-1 — accounts + deal posting) → **manage/portal**
(287, 288) → **browse** (290, 294, reuse the prototypes) → **redeem/seed** (292, 295, into `create.js`)
→ **bid-for-placement** (289) last. Merchant/provider accounts gate everything, so they sequence with
the SPINE-1 (G40-296) / B2B-portal (G40-160) work.

## ⚠️ Each ticket needs full ACs before dev
These are one-liners today. Before hand-off, each needs the same treatment as the heavily-specced
tickets (flow, scenarios, business rules, data model). This doc is the initiative map; the per-ticket
ACs are the next grooming pass.
