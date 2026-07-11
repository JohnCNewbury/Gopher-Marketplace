# Gopher Deals™ — End-to-End Pathway (Registration → Redemption → Management)

**Status:** authoritative pathway reference for the Deals initiative (G40-286 and its consolidated
sub-tickets 288/290/291/293/294/295). Grounded in the shipped prototype code, not memory — every
seam below cites the real file + line. Now spans three surfaces: the public/merchant Deals page
(`gopher-deals.html`), the **Gopher Go worker app** (`gopher-go.html`) where providers create deals,
and the worker tutorial (`gopher-go-101.html`). Companion to
`G40-286-deals-frontend-consolidated-handoff.md` (ticket-level verdicts).

**Two tracks in one system.** Everything below has a *merchant* (DLM) path and a *service-provider*
(DLP) path. They share the customer browse surface and much of the dashboard shell, but they diverge
in **how you register**, **what a deal is**, and **what redemption does**. The merchant registers and
posts a deal on the public Deals page; the provider only *checks eligibility* there and posts the deal
from **inside the Gopher Go app**:

| | **DLM — Merchant / last-mile** | **DLP — Local Pro / service provider** |
|---|---|---|
| Who | A local business (restaurant, retail, convenience, age-restricted, local favorite) | An existing **Worker** who qualifies for the Service-Provider tier (see eligibility below) |
| Deal shape | A promo/offer (e.g. "10% off", "free appetizer") + optional promo code | **One honest defined price** for a service (e.g. "power wash up to 2,500 sq ft — $150, normally $225") |
| Registration | A public form on the Deals page (business + deal) | **Two-entry:** the public Deals page collects only an **eligibility funnel**; the deal itself is created **in the Gopher Go app** by eligible workers (Stage 1) |
| Redemption | Order on the merchant's own site **or** parlay into a Gopher Request for last-mile delivery | Spawns a **provider-directed** Gopher Request routed only to that provider |
| Reach | The merchant's fixed location(s) | Up to **50 mi**, set in the Gopher Go app — **not** on the public page |

---

## Stage 1 — Registration (where it starts)

**Merchant surface:** `Final/gopher-deals.html` — the public page has two entry cards: "I'm a
Business" (DLM) and "I'm a Service Provider" (DLP, card at `gopher-deals.html:2380`). They behave
differently: the **merchant** card opens a full registration + deal form; the **provider** card opens
only a short **eligibility funnel** (the deal is created later, in the Gopher Go app).

### Merchant (DLM) — fields at `gopher-deals.html:2679`–`2786`

| Field | Form name | Notes |
|---|---|---|
| Business Name | `business_name` | |
| Business Logo | `logo` (file) | Upload; `showLogoName()` shows the chosen filename |
| Business Tagline | `tagline` | |
| Business Address | `address` | Places autocomplete-backed |
| **Address is mobile** | `address_is_mobile` (checkbox) | Food-truck / no-fixed-location case — drives redemption pickup (Stage 5) |
| Business Website | `website` | Used for the "order on merchant site" embed (Stage 5) |
| Business Category | `category` | Restaurants & Food Trucks / Local Favorites / Age-Restricted / Retail / … |
| Deal Offered | `deal` | Free text |
| Promo Code | `promo` | e.g. `GOPHER10` |
| **Searchable Keywords** | up to 3 chips | **These become the customer keyword-search index** (Stage 5) |
| Owner Name / Phone / Email / Address | `owner_*` | |
| **Phone verified** | `phone_verified` (hidden) | OTP affordance — **currently simulated**, see backend seams |
| Referral Code | `referral_code` | Optional |

### Service Provider (DLP) — a two-entry model

A provider deal can only be offered by an *eligible Worker*, so the public page never takes a full
deal submission — it gates first.

**Entry A · public eligibility funnel** — the "Offer your service on Gopher" modal in
`gopher-deals.html` (the "I'm a Service Provider" card opens it). A short form captures only identity:
**First, Last, SMS, Email, Gopher ID** (`first_name` / `last_name` / `sms` / `email` / `gopher_id`,
at `gopher-deals.html:2991`–`3010`). The Gopher-ID field has an info tooltip pointing to **Refer &
Earn** in the Gopher Go app (the referral code, e.g. `MARCUS-4F9`) — a screen-grab slot is wired but
the export is still to be dropped at `assets/img/gopher-id-refer.webp` (self-hides until present).
Submit posts through the same `submitForm('worker')` lead plumbing (`:3013`) → thank-you: *"we'll
check your eligibility, email you terms + next steps, and message your Gopher Go inbox."* No deal, no
price, no reach here — this only determines eligibility.

**Entry B · in-app deal form** — `Final/gopher-go.html`, the worker dashboard. An eligible worker
gets a green **"Offer My Service →"** button above the Profile nav item (`gopher-go.html:2478`); it
opens the real **Deal + Earning** form (`offerServiceOverlay`, `:2777`) *minus personal*
(name/phone/email/Gopher ID already on the account):

- Deal you're offering + **Searchable Keywords** (1–3 chips)
- **What you want to earn** → **Customer will pay** = `earn × 1.10` (the 10% Deal Boost, live-calc)
- **What you'd normally charge** → struck-through value anchor at `normal × 1.10`
- **Deal reach** — a **1–50 mi** slider (capped at 50), separate from the worker's general work radius
- Submit (`osfSubmit`, `:2828`) → a "Deal submitted for review" state (honoring the manual-review gate)

If the worker is **not** eligible, the button is locked and taps open a pop-up
(`offerIneligibleOverlay`, `:2765`) that redirects to the eligibility terms in Gopher Go 101
(`gopher-go-101.html#offer-deals`, `:745`). Eligibility is **automatic** at the bar; each posted deal
is **manually reviewed** before it goes live. In the prototype the gate is simulated with a demo
toggle (the `ELIGIBLE` flag, `gopher-go.html:3705`); production reads it from the worker's tier + the
Gopher-ID lookup.

### Where the information goes (today)

`submitForm(type)` at `gopher-deals.html:3664`:

1. Serializes every named field in the modal to a `data` object.
2. **Writes a local backup** — appends to `localStorage['gopherLeads']` (`:3702`), so nothing is lost
   even if the network call fails.
3. **POSTs to a Google Apps Script Web App** — `GOPHER_FORM_ENDPOINT` (`:3662`), sent as
   `text/plain;charset=utf-8` (`:3710`) so it counts as a CORS-"simple" request and works from any
   origin without a preflight. The Apps Script appends the row to the backing Google Sheet.
4. Console export escape hatch — `downloadGopherLeads()` (`:3719`) dumps the localStorage backup as a
   CSV for manual recovery.

> **This is the current persistence layer.** There is no deals database yet — a "lead" is a Sheet
> row. The production system (SPINE-1 identity + a real deals table) replaces the Apps Script
> endpoint behind this same `submitForm` seam. Until then, the Sheet **is** the pipeline (merchant
> deals + provider eligibility requests).

---

## Stage 2 — The data model (how merchant registration becomes structure)

Once a merchant is in the portal, the shape is **account → businesses[] → locations[] → deals**.
Defined in the `ACCOUNT` object at `gopher-deals.html:4943` (the demo account owns *My Way Tavern*
across Raleigh / Holly Springs / Fuquay-Varina, and *The Blind Pelican* in Holly Springs):

```
ACCOUNT
 └─ businesses[]           { id, name, tagline, color, locations[] }
     └─ locations[]        { id, label, address, deals: <count>, mobileAddress?: bool, orderSite? }
         └─ deals          authored per-location
```

**Key rule — deals are location-bound** (owner-confirmed):

- Each deal ties to exactly **one** location. That location's ordering site *and* the parlayed
  Gopher Request pickup both resolve to **that** location's address.
- To offer the same deal elsewhere, the owner **adds the location** (`bizAddForm`,
  `gopher-deals.html:4445`; push at `:5189`) and submits a **new** deal there. There is no "one deal,
  many locations" fan-out — this is intentional and keeps pickup unambiguous.
- **Mobile / food-truck** locations set `mobileAddress:true` (`applyMobileAddr()`, `:5037`). This
  flag is what makes redemption ask the customer for a pickup address instead of auto-filling one.

**Authoring UX:** the "Submit a New Deal" form has a business/location picker grouped by business
(`populateLocationSelect()`, `:4970`) ending in "+ Add a new business or location…". Picking a
location calls `prefillFromLocation()` (`:4980`) → "Pre-filled from your last deal at this location."

*(The provider deal has no such multi-location model — a provider posts one defined-price service
from their Gopher Go account; see Stage 1 Entry B.)*

---

## Stage 3 — APIs & external services (the explicit ask)

| API / service | Where used | Purpose | Key / auth | Prod note |
|---|---|---|---|---|
| **Google Maps JavaScript API** | `gopher-deals.html:2316` (loader) | Renders the merchant **audience map** in registration + dashboard | Browser key `AIzaSy…UVJAU`, **HTTP-referrer restricted** | Add each deploy origin to the referrer allowlist (below) |
| **Google Places API** | Maps-ready init (`:3208`) | Address autocomplete on the merchant address fields | Same key, `libraries=places` | — |
| **Google Geocoding API** | `new google.maps.Geocoder().geocode()` `:3194` | Turns a typed address → lat/lng to drop the audience-map pin | Same key | — |
| **Google Distance Matrix API** | Request/Connect ride-pricing seam (`getRideTripEstimate`) | When a merchant deal **parlays into a Gopher Request**, real mileage → delivery price | Same Google project | Wired in the customer apps, not the Deals page itself |
| **Google Apps Script Web App** | `GOPHER_FORM_ENDPOINT` `:3662` | **Current** lead/eligibility persistence → Google Sheet | Deployed "execute as me / access: Anyone" | Replaced by the real backend at handoff |
| **SMS / OTP provider** | Phone-verify affordance, `phone_verified` hidden field | Verify owner phone at merchant registration | **None yet — simulated** | Needs a real provider (Twilio/etc.) in production |

**The audience map uses NO live data API.** The "X customers · Y workers in radius" figure comes from
a **baked static dataset** — `Final/assets/js/gopher-deals-audience.js`, an `AUDIENCE_POINTS` array
of `[lat, lng, role]` tuples (role 0 = customer, 1 = worker), generated offline from the user +
orders CSVs jittered onto GeoNames ZIP centroids. `viewAudienceAt()` / `eachInRadius()` /
`setRadiusMiles()` filter it **client-side**. Production swaps this file for a live
`GopherIQData.lookup(zip, radius)` query behind the same seam — the map code doesn't change.

> **Note on provider reach:** it is no longer set on a public map. Deal reach is a **1–50 mi slider in
> the in-app deal form** (Stage 1 Entry B); the general work radius lives in the Gopher Go **Work
> Settings & Radius** section. So the Maps API on the Deals page now serves only the *merchant*
> audience map.

**Deploy gotcha (referrer key):** on any new origin (e.g. `*.netlify.app`) the Maps key is rejected
and the map shows its error state until you add `https://<origin>/*` in Google Cloud Console →
Credentials → that key → Website restrictions. Registration + lead capture still work without it.
Owner setup walkthrough: `Final/SETUP-Google-Maps-Steps.html`.

---

## Stage 4 — Management in the dashboard(s)

**Merchant portal** — built inside `gopher-deals.html` (left nav: Dashboard, My Deals, Inbox,
Business Info, Users & Access, Feature My Business; section map at `:4776`), with a live-preview
phone that mirrors how the deal will appear in the customer apps.

- **My Deals** — lists each deal with a real **status badge**: `● Live` (`:4432`), `In review`
  (`:4434`), `Draft` (`:4435`) and a **Views** counter. It's a **display list today** — edit / pause
  / delete are not wired (backend actions).
- **Business Info** — status "Active / Verified" (`pi-status`, `:4486`); the account/identity surface
  SPINE-1 will own.
- **Feature My Business** — an **open-bid** placement auction (`:4524`): top bid per category is
  featured across the app/web platforms next month; top overall becomes the Featured Deal.
- **Live preview** — a `sandbox`ed `<iframe>` (`pvFrame`, `:4386`) renders the merchant's own ordering
  site inside the branded page (the same embed technique the customer redemption uses).

> **Provider management is in Gopher Go, and it's built.** An eligible provider **creates and manages
> deals from the Gopher Go worker app** (`gopher-go.html` — the "Offer My Service" flow, Stage 1
> Entry B), not this merchant portal. On the public Deals page they only check eligibility (Entry A).
> The eligibility terms live in `gopher-go-101.html#offer-deals`.

**Admin side (Gopher HQ):** deal lifecycle state, click tracking, and CSV export also exist in the
HQ Dashboard's `advertiserDeals.js` (the G40-180 admin tool) — the manual "review before it goes
live" step happens there.

---

## Stage 5 — Application & redemption (connect / request / request app)

The customer-facing deal surfaces are built in **`gopher-request.html`**, **`gopher-connect.html`**,
and the **Go split-screen prototype** — the same logic, mirrored across all three. *(These files were
not touched by the provider-registration redesign, so their line numbers below remain current.)*

### Browse & find (DLM-6 / DLP-3)

"View Local Deals" browse: keyword search box, category rails (incl. a "Local Service Provider
Deals" rail), and distance labels. **Keyword search matches the registration keywords** from Stage 1.
Ordering is **proximity** — customer location vs. the merchant's **fixed** address (mobile merchant →
their registered business address; provider → their profile address).

### Deal detail + order on merchant site (DLM-7)

Tapping a merchant deal opens the detail card with the promo code and two paths:

1. **Order directly** — the merchant's ordering site is embedded in a **sandboxed `<iframe>`**
   (`allow-scripts allow-same-origin allow-popups allow-forms`) with a **load-timeout fallback +
   "Open in a new tab"**, because many sites refuse embedding via `X-Frame-Options` /
   `frame-ancestors` CSP (handled explicitly — `gopher-request.html:22584`/`:22783`,
   `gopher-connect.html:13712`/`:13916`).
2. **"+ Make a Gopher request to bring you your deal"** (`data-deal-cta`, `:23011` /
   connect `:14142`) — the last-mile parlay.

### Merchant last-mile parlay ("Bring you your deal")

Opens the `dealReq` modal (`:23033`). Pickup resolution follows the location's `mobileAddress` flag:

- **Fixed location** → pickup auto-applies to that location's address and the pickup field stays
  **hidden**.
- **Mobile merchant** → the **Pick-up address** field is **shown** (`dealPickupField` / `dealPickup`,
  `:23035`–`:23037`, connect `:14166`–`:14168`) so the customer enters where to collect from.

The request then flows into the normal ASAP Gopher Request pipeline.

### Provider-directed redemption (DLP-4)

Redeeming a **service-provider** deal (`svc-deal-redeem` / `svcDealRedeem`, `:22883` / connect
`:14014`) behaves differently from a merchant deal. Per the governing comment at
`gopher-request.html:14472`:

> Service-provider deal redemptions go **only to the offering provider** and are **auto-accepted**
> (a simulated connect) as a **flexible, within-2-week** request — no broadcast to other workers.
> Merchant deals keep the normal ASAP flow.

It sets `state.dealProvider = { name, role, tier, pic }` (`:14494` / connect `:12400`) which directs
the request to that one provider and drives the "once **[provider]** accepts, they'll contact you to
schedule" copy (`:13246`).

### The customer-side eligibility gate (temporary)

`isDealsEligible()` at `gopher-request.html:21888` currently **returns `true` for all users** — the
Deals gate is intentionally open in the prototype so anyone can demo it. Production restores the real
check (`return !!_sessionUserProfile;`) once accounts exist. *(This is the customer's access to the
Deals surface — distinct from the provider-posting eligibility in Stage 1 Entry B.)*

---

## What's built vs. what the human dev still wires

**Built (prototype-complete, no net-new UI needed):** merchant registration + the
account→business→location→deal model; the merchant portal (My Deals, Business Info, Feature-bidding);
the audience map; the **provider two-entry registration** — the public eligibility funnel in
`gopher-deals.html` + the in-app **"Offer My Service"** deal form in `gopher-go.html`, gated by
eligibility, with the eligibility terms in `gopher-go-101.html#offer-deals`; customer browse + keyword
search + proximity; deal detail + sandboxed merchant-site embed; and both redemption paths (merchant
parlay + provider-directed).

**Backend seams flagged for the human dev (all gated on SPINE-1 identity + a real deals table):**

1. **Persistence** — replace the Apps Script/Sheet + `localStorage` with a real deals/locations DB
   behind `submitForm` and `GopherIQData.lookup`.
2. **My Deals actions** — wire edit / pause / delete (display-only today).
3. **Mobile-address flag** — carry `mobileAddress` into the real request payload
   (`TODO(backend)`, `gopher-deals.html:5042`).
4. **Provider-directed routing** — real directed routing + real accept (currently a simulated
   connect), plus the flexible-2-week scheduling handoff → matching logic.
5. **Re-gate customer Deals** — restore `isDealsEligible()` (`gopher-request.html:21888`) once
   accounts are real.
6. **OTP** — real SMS provider behind the `phone_verified` affordance.
7. **Live audience data** — swap the baked `gopher-deals-audience.js` for a live query.
8. **Provider eligibility + two-entry flow (DLP)** — Service Provider is **not a separate role**;
   it's an eligibility tier of Worker. Auto-eligible when a Gopher is **Elite / Elite+ / Pro · 20+
   completed jobs · 4.75★ over the last 20 completed** (admin manual-override allowed); each posted
   deal is **manually reviewed** before going live. The dev wires: the **Gopher-ID → eligibility
   lookup** behind the public funnel, the real **email + Gopher Go inbox** notification, and the real
   **eligibility gate** on the in-app "Offer My Service" button (simulated by the `ELIGIBLE` demo
   toggle today). (Source: `Gopher — Intended/Gopher-Roles-Capability-Matrix.md`.)
9. **Gopher-ID tooltip asset** — export the Refer & Earn screen to `assets/img/gopher-id-refer.webp`
   (the funnel tooltip references it and self-hides until it exists).

---

## Appendix — pathway at a glance

```
REGISTRATION
  Merchant → full form on gopher-deals.html (business + deal)
  Provider → TWO ENTRIES:
     A) public eligibility funnel (gopher-deals.html)
          submitForm('worker') → localStorage backup → Apps Script → Google Sheet
          → "we'll email you terms + Gopher Go inbox"
     B) eligible worker posts the deal IN-APP (gopher-go.html · "Offer My Service")
          earn × 1.10 = customer pays · normal × 1.10 struck · 1–50 mi reach
          not eligible → gopher-go-101.html#offer-deals
        ▼
DATA MODEL (merchant)     account → businesses[] → locations[] → deals   (location-bound)
        │                 mobileAddress flag · per-location orderSite · keywords
        ▼
DASHBOARDS
  Merchant: gopher-deals.html portal — My Deals (Live/In review/Draft + Views) · Business Info
            · Feature-bid · live preview
  Provider: Gopher Go app — creates + manages deals (built)
        ▼
CUSTOMER APPS (request / connect / Go)
  Browse: keyword search (reg. keywords) + category rails + proximity
        ├─ Merchant deal → order on site (sandboxed iframe + tab fallback)
        │                → "Bring you your deal" parlay → Gopher Request
        │                     fixed loc → pickup auto  |  mobile → customer enters pickup
        └─ Provider deal → redeem → provider-directed request (auto-accept, flexible 2-wk)

APIS: Google Maps JS · Places · Geocoding (merchant audience map) · Distance Matrix (parlay pricing)
      Apps Script Web App (current persistence) · SMS/OTP (needed, not built)
      Audience = baked static dataset, NOT a live API (yet)
```

---

## Next: #2 — merchant-coverage tracking (drafted, to build later)

*Recorded now so we account for it; not yet built.*

**Goal:** ensure a minimum of **20 merchants per category per 15-mile radius across the entire
Raleigh DMA** — a coverage/recruiting KPI managed by **ZIP code**, visualized on a map in the HQ
Dashboard.

**Shape this will likely take (for the later build session):**

- **A ZIP-coverage model** — for each ZIP (or 15-mi cell) × category, track: target (20), current
  signed merchants, and a gap. Source of "current" = the registration pipeline (Stage 1 Sheet →
  future deals table); source of ZIP geography = the same GeoNames ZIP-centroid data the audience
  map already uses.
- **A dashboard map view** — reuse the Google-Maps + baked-centroid seam already proven in
  `gopher-deals-audience.js`, but color ZIPs/cells by **coverage status** (red = under target,
  green = met) instead of plotting users. A 15-mi radius overlay per anchor point.
- **A category × ZIP grid** — the tabular companion to the map: rows = ZIPs, columns = categories,
  cells = "signed / 20" with the gap highlighted, so recruiting can see exactly where to push.
- **Feeds the recruiting playbook** — the coverage gaps become the target list for
  `gopher-deals-merchant-recruiting-playbook.html`.

This bolts onto the existing audience/ZIP infrastructure rather than being net-new — which is why
it's worth accounting for the seam now. Full spec + build in a dedicated session.
