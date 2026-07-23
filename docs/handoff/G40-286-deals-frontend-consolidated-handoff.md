# Gopher Deals — Front-End Consolidated Handoff (G40-286)

**Consolidates:** G40-286 (DLM-1) + G40-288 (DLM-3), G40-290 (DLM-6), G40-291 (DLM-7),
G40-293 (DLP-1), G40-294 (DLP-3), G40-295 (DLP-4).
**Prepared:** 2026-07-09. **Source of truth for roles/eligibility:**
`Documentation/Gopher — Intended/Gopher-Roles-Capability-Matrix.md` (regenerated from the xlsx).

## TL;DR

The **Deals front-end is built at prototype scale** across the merchant portal and both customer
apps. Grooming each of the six sub-tickets against the actual code confirmed **none needs net-new
front-end** — every one has reached its **ceiling before dev handoff**. What remains is uniformly
**backend / matching / accounts**, gated on **SPINE-1 (G40-296)** identity + the real **deals data
model**. The six sub-tickets are therefore **consolidated into this ticket (G40-286)** and canceled
as superseded; this doc is the single hand-off.

## Two tracks

- **DLM — Deals (merchant / last-mile).** Third-party merchants post deals; customers browse and
  order on the merchant's site; some orders parlay a Gopher last-mile request.
- **DLP — Deals Local Pro (service providers).** *Service Provider is NOT a separate role — it is an
  eligibility tier of Worker.* Eligible Gophers post defined-price service deals in a radius;
  redemption spawns a provider-directed request.

## Build status by capability

| Ticket | Cap | Status | Where it lives |
|---|---|---|---|
| G40-288 | DLM-3 Manage deals across locations | ✅ Built (prototype) | `Final/gopher-deals.html` merchant portal |
| G40-290 | DLM-6 Customer browse by location/category | ✅ Built | `Final/gopher-request.html` + `gopher-connect.html` (View Local Deals) |
| G40-291 | DLM-7 View deal + order on merchant site | ✅ Built | `gopher-request.html` / `gopher-connect.html` deal detail |
| G40-293 | DLP-1 Provider registration (defined price, 50-mi) | ✅ Built (entry); model fully specified | `gopher-deals.html` "I'm a Service Provider"; management → **Gopher Go** |
| G40-294 | DLP-3 Customer browse Local Pro Deals | ✅ Built | Same View Local Deals surface (SP rail) |
| G40-295 | DLP-4 Redeem provider deal (directed request) | ✅ Built | `gopher-request.html` redemption → `state.dealProvider` |

---

## DLM-3 — Manage deals across locations (G40-288)

**Built.** The merchant portal in `Final/gopher-deals.html` models
**account → businesses[] → locations[]** (`ACCOUNT`, ~line 5181). The demo account owns *My Way
Tavern* (Raleigh / Holly Springs / Fuquay-Varina — each with its own address, per-location deal
count, and optional per-location ordering `site`) and *The Blind Pelican*. "Submit a New Deal" uses a
business/location picker (`populateLocationSelect`, ~5208) ending in **"+ Add a new business or
location…"**; picking a location `prefillFromLocation()` pre-fills business details and the last deal
at that location. "My Deals" (~4667) lists deals with real status badges (**Live / In review /
Draft**) + view counts.

**Confirmed business rule (owner, 2026-07-09):** **deals are location-bound.** Each deal ties to a
single location; that location's ordering site AND the parlayed Gopher Request pickup both resolve to
it. To offer at another location the owner adds the location in the dashboard and submits a new deal
there. There is no "one deal, many locations" fan-out and no customer-facing location chooser at
redemption.

**Mobile (food-truck) rule:** the "Business address is mobile" flag (`applyMobileAddr`, ~5275) means
the parlayed request must NOT pre-fill a fixed pickup — the customer enters pickup themselves
(preview logic at ~5264; hint at ~2706/4508).

**Backend seams for dev:** persist businesses/locations/deals; wire edit/pause/delete actions on My
Deals; honor the `mobileAddress` flag on the real request (`TODO(backend)` at
`gopher-deals.html:5280`); gate portal access on SPINE-1 identity + the "Users & Access" roles pane.

## DLM-6 — Customer browse deals by location/category (G40-290)

**Built.** The in-app **"View Local Deals"** browse ("Sponsored picks") is live in both customer apps
(`gopher-request.html` ~line 18001/22505; `gopher-connect.html` ~8718/13646) and the Go prototype. It
provides: a **"Search local deals"** keyword box, category sections/rails (Local Service Provider
Deals, Restaurants & Food Trucks, Local Favorites, …), a **"Home" location chip**, and **distance
labels** per card.

**Confirmed rules (owner):** ordering is **closest-first** — customer location vs. the merchant's
**fixed** address; for a **mobile** merchant it falls back to the owner's **registered business
address**. Keyword search matches the **keywords set at registration** (the up-to-3 chips).
*(Note: an older `gopher-request.html` changelog entry (v99) describes a "coming soon" placeholder —
that has since been superseded by the shipped browse; do not treat the v99 note as current.)*

**Backend seams:** real deals feed behind the `advertiserDeals.js` seam (G40-180); real device
geolocation; persistence.

## DLM-7 — View merchant deal + order on merchant site (G40-291)

**Built, robustly.** The deal-detail view offers **"Order directly from [merchant]"**, which embeds
the merchant's live ordering site in a **sandboxed iframe** with a **load-timeout fallback +
"Open in a new tab"** for sites that refuse embedding (code comment at `gopher-request.html:22725`
explicitly handles X-Frame-Options / CSP). Promo code is surfaced; the alternate **"Make a Gopher
Request → Bring you your deal"** parlay is present.

**Backend seams:** real merchant ordering URLs from registration; the parlay bridge into
`controllers/order/create.js` (shared with DLM-8/DLP-4). **Re-gate `isDealsEligible()`** —
currently `return true` (TEMP, open to all) at `gopher-request.html:21843`.

## DLP-1 — Provider registration, defined price, 50-mi radius (G40-293)

**Entry built; eligibility model fully specified (no ambiguity).** `gopher-deals.html` has the
**"I'm a Service Provider"** path (~2368), a **1–50 mile reach-radius slider on the map** (copy at
~2481/2532/2549), a **defined "one honest price"** model, and the ratings-earned **tier badge**.

**Eligibility (matrix rows 49–54, note 80) — two gates:**
1. **Eligibility is AUTOMATIC** when a Gopher meets the bar: **Elite, Elite+, or Pro · 20+ completed
   SERVICE jobs · 4.75★ over the last 20 completed SERVICE jobs** (founder ruling 2026-07-06, lowered
   from 5.0★; plus an **admin manual override** to grant any worker). Meeting the bar = *eligible, not
   approved.* **Service jobs only (founder amendment 2026-07-23): Delivery, Ride Sharing, and Other
   jobs count toward NEITHER the 20-job bar NOR the last-20 rating window** — service categories are
   being piloted first, and counting delivery/ride volume would flood the manual review queue with
   meaningless provider deals.
2. **Each posted deal is reviewed MANUALLY** initially ("nothing crazy") before it goes live.

**Home surface = Gopher Go.** Eligible providers manage deals + their worker account via the
**Gopher Go** dashboard; the Deals page is informational/entry only (reachable if their number is
unblocked for Deals). *Scope flag:* the provider management surface is the worker app (Gopher Go),
outside this customer-facing repo — do not rebuild it here.

**Backend seams:** the automatic eligibility computation + admin override; the manual deal-review
queue; the Gopher Go provider dashboard.

## DLP-3 — Customer browse Local Pro Deals (G40-294)

**Built.** Same surface as DLM-6 — the **"Local Service Provider Deals"** rail inside View Local
Deals (present in both customer apps). Cards show the provider's earned **tier badge** + **defined
price**; ordering is proximity by the provider's profile address. Matrix bundles DLM-6·DLP-3 (row 45).

**Backend seams:** same feed/persistence as DLM-6.

## DLP-4 — Redeem provider deal → provider-directed request (G40-295)

**Built.** Redeeming a service-provider deal sets `state.dealProvider` (name/role/tier/pic) and
routes a **provider-directed** request. The code comment is the spec
(`gopher-request.html:14472`): *"Service-provider deal redemptions go ONLY to the offering provider
and are auto-accepted (a simulated connect) as a flexible, within-2-week request — no broadcast to
other workers. Merchant deals keep the normal ASAP flow."* Redemption pre-selects the "Within 2
weeks" timing tab (`flexibleWindow = '2weeks'`).

**Backend seams:** real directed routing to the specific provider + a real accept (replace the
simulated connect); the flexible-scheduling handoff.

---

## Cross-cutting dependencies (all six)

- **SPINE-1 (G40-296)** — unified identity. Merchant and provider accounts fold in as entity types;
  gates portal login + Users & Access roles. Provider identity = an eligibility tier on the existing
  worker account.
- **Deals data model** — a real `deals` store (merchant/provider id, category, location(s),
  price/defined-price, radius, window, status, click counters) behind the **`advertiserDeals.js`**
  (G40-180) admin seam, which already provides `isDealLive` / `liveHomeDeals` / `trackClick` /
  `toCsv`.
- **Order bridge** — `controllers/order/create.js` is where a merchant order (DLM-8) or a provider
  redemption (DLP-4) spawns the actual Gopher request.
- **B2B portal shell** — merchant/provider portal reuses G40-160 / Epic G40-2 rather than a
  standalone auth.

## What is explicitly NOT built (human-dev only, per CLAUDE.md)

Persistence/DB, authentication/accounts, matching/routing (directed-request, eligibility
computation), payments. The prototype is the **UX + data-shape blueprint**; it is not wired to a
backend.

## Superseded tickets

G40-288, G40-290, G40-291, G40-293, G40-294, G40-295 are **canceled as superseded** and linked
(Duplicate) to G40-286. This ticket + this doc are the single consolidated hand-off.
