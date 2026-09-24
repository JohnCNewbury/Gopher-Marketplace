# Gopher Deals — Front-End Consolidated Handoff (G40-286)

**Consolidates:** G40-286 (DLM-1) + G40-288 (DLM-3), G40-290 (DLM-6), G40-291 (DLM-7),
G40-293 (DLP-1), G40-294 (DLP-3), G40-295 (DLP-4).
**Prepared:** 2026-07-09. **Source of truth for roles/eligibility:**
`Documentation/Gopher — Intended/Gopher-Roles-Capability-Matrix.md` (regenerated from the xlsx).

> 📍 **Citation refresh — 2026-09-24 (G40-288 close-out).** Every `file:line` citation in this doc
> was written against the July files and had gone ≈2,000 lines stale; they resolved to unrelated
> code. All of them have been **re-derived by content** and re-pinned to branch
> `feature/deals-google-maps-audience` @ `a26a476` (2026-09-24), where `gopher-deals.html` is 9,408
> lines, `gopher-request.html` 28,082, `gopher-connect.html` 25,498, `gopher-go.html` 9,581.
> **Numbers rot; the backticked symbol next to each one does not — grep the symbol first.**
> Two claims were wrong in *substance*, not just position, and are flagged inline: the My Deals
> edit/pause seam (DLM-3) and the provider reach slider (DLP-1).

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
| G40-288 | DLM-3 Manage deals across locations | ✅ Built — **now past prototype**: My Deals is API-wired (edit/pause/resume) | `Final/gopher-deals.html` merchant portal |
| G40-290 | DLM-6 Customer browse by location/category | ✅ Built | `Final/gopher-request.html` + `gopher-connect.html` (View Local Deals) |
| G40-291 | DLM-7 View deal + order on merchant site | ✅ Built | `gopher-request.html` / `gopher-connect.html` deal detail |
| G40-293 | DLP-1 Provider registration (defined price, 50-mi) | ✅ Built (entry); model fully specified | `gopher-deals.html` "I'm a Service Provider"; management → **Gopher Go** |
| G40-294 | DLP-3 Customer browse Local Pro Deals | ✅ Built | Same View Local Deals surface (SP rail) |
| G40-295 | DLP-4 Redeem provider deal (directed request) | ✅ Built | `gopher-request.html` redemption → `state.dealProvider` |

---

## DLM-3 — Manage deals across locations (G40-288)

> ⚠️ **CORRECTED 2026-09-24 (G40-288 close-out).** Two separate errors are fixed in this section.
> **(1)** Every line number here was written against the ≈5,600-line July file and is now ≈2,000
> lines stale — they pointed at unrelated code. **(2)** The backend-seam list below claimed
> edit/pause on My Deals was unbuilt; it has since shipped and is wired to the real API. That is the
> direction of error that gets working code rebuilt, so it is called out explicitly.
> **Line numbers below are pinned to `gopher-deals.html` at 9,408 lines (branch
> `feature/deals-google-maps-audience`, 2026-09-24). The backticked symbol is the durable anchor —
> grep the symbol, not the number.**

**Built.** The merchant portal in `Final/gopher-deals.html` models
**account → businesses[] → locations[]** (`var ACCOUNT`, 7456). The demo account owns *My Way
Tavern* (Raleigh / Holly Springs / Fuquay-Varina — each with its own address, per-location deal
count, and optional per-location ordering `site`) and *The Blind Pelican*. "Submit a New Deal" uses a
business/location picker (`populateLocationSelect`, 7483) ending in **"+ Add a new business or
location…"**; picking a location `prefillFromLocation()` (7493) pre-fills business details and the
last deal at that location.

**"My Deals" is a live authenticated pane, no longer a display list.** `loadMyDeals()` (7896) fetches
`GET /users/deals/mine` and `renderMyDeals()` (7793) draws the merchant's real rows — status badge
(**Live / In review / Paused / Not approved / Expired**), the rejection reason when there is one
(7822 — the one status a merchant cannot act on), and the pause / edit-in-review state.

⚠️ **The badges are table-driven, not literal markup.** `DEAL_STATUS_LABEL` (defined 7778) and
`DEAL_STATUS_BADGE` (7782) are applied at the render sites 7858 / 7857. The demo-data status strings
in `MY_DEALS` (7755–7758, e.g. `status:'In review'`) *look* like the badge source and are not — they
feed only the signed-out showroom. Change a label in the tables, not in the demo rows. The four hardcoded rows and
the `MY_DEALS` array (7755) are the **signed-out showroom only**; the in-code comment at 7745 records
why they were kept. ⚠️ The old **"+ view counts"** claim was also wrong — `renderMyDeals` renders no
views counter.

**Confirmed business rule (owner, 2026-07-09):** **deals are location-bound.** Each deal ties to a
single location; that location's ordering site AND the parlayed Gopher Request pickup both resolve to
it. To offer at another location the owner adds the location in the dashboard and submits a new deal
there. There is no "one deal, many locations" fan-out and no customer-facing location chooser at
redemption.

**Mobile (food-truck) rule:** the "Business address is mobile" flag (`applyMobileAddr`, 7550) means
the parlayed request must NOT pre-fill a fixed pickup — the customer enters pickup themselves
(checkbox `#ndMobileAddr` 6188, hint `#ndMobileHint` 6191, preview branch 7525).

### Backend seams for dev — **corrected 2026-09-24**

⛔ **Read this before touching My Deals.** Two of the four seams listed here have shipped. Rebuilding
them would re-implement working, API-wired code.

| Seam | State | Evidence |
|---|---|---|
| Edit / pause / resume on My Deals | ✅ **BUILT — do not rebuild** | Controls 7843–7850, dispatcher 8054–8059, real API calls (below) |
| "Users & Access" roles pane | ✅ **BUILT** (identity unification still open) | `/users/org/*` calls 8334–8430 |
| Delete a deal | ❌ Still unbuilt | No delete control exists (see note) |
| Persist businesses / locations | ❌ Still unbuilt | In-memory only (see note) |
| Honor `mobileAddress` on the real request | ❌ Still unbuilt | `TODO(backend)` 7555 |

**What shipped (owner ruling recorded in-code at 7927, 2026-08-25).** The action buttons render only
on a real session (`if(_authToken)`, 7841) and call `GOPHER_API = 'https://api.gophergo.io/api/v1'`
(5274) through `apiCall()` (5286):

- `openPauseModal()` (7958) → `PATCH /users/deals/{id}/pause`, reason required.
- `resumeDeal()` (7982) → `PATCH /users/deals/{id}/resume`. Offered only when `paused_by_owner` — a
  deal Gopher took down must not show a button that can only 409.
- `openEditModal()` (7991) → `PATCH /users/deals/{id}`. The edit goes to review and **the current
  live version keeps serving** until approved.

**Delete is genuinely absent.** Scope of the check: the whole 9,408-line `gopher-deals.html`. A
delete-shaped probe (`md-delete|deleteDeal|data-md-del|Delete</button>`) returns **0**, while the
same probe shape returns **4** hits each for pause, edit and resume — the negative is the probe
working, not the probe missing. The 28 `delete` strings in the file are inbox-message deletion
(G40-100), payment-method detach and org member/invite removal; none is a deal.

**Businesses/locations still do not persist.** "+ Add location" (`.la-save`, 7697) and "+ Add
business" (`naSave`, 7710) are **real handlers, not stubs** — they push onto `ACCOUNT.businesses` /
`biz.locations` and re-render — but there is **no `/users/businesses` endpoint** in the file, so the
tree is lost on reload. Deals persist; the businesses/locations structure above them does not. This
is the remaining half of the original "persist businesses/locations/deals" seam.

> ⚠️ **Verification limit — stated plainly.** The controls, the dispatcher and the endpoint strings
> above were **read in the source**. **No write was driven against `api.gophergo.io`**: it is the live
> production backend, and a pause or edit would be a real mutation on real merchant data. Persistence
> is therefore **wired, not proven end to end**. Anyone who needs certainty should exercise it against
> a non-production account, not against a live merchant's deal.

## DLM-6 — Customer browse deals by location/category (G40-290)

**Built.** The in-app **"View Local Deals"** browse ("Sponsored picks") is live in both customer apps
(`gopher-request.html` — entry pill 19601, browse surface 25351; `gopher-connect.html` — 9973 /
15929) and the Go prototype. It
provides: a **"Search local deals"** keyword box, category sections/rails (Local Service Provider
Deals, Restaurants & Food Trucks, Local Favorites, …), a **"Home" location chip**, and **distance
labels** per card.

**Confirmed rules (owner):** ordering is **closest-first** — customer location vs. the merchant's
**fixed** address; for a **mobile** merchant it falls back to the owner's **registered business
address**. Keyword search matches the **keywords set at registration** (the up-to-3 chips).
*(Note: an older `gopher-request.html` changelog entry (v99) describes a "coming soon" placeholder —
that has since been superseded by the shipped browse; do not treat the v99 note as current.)*

**Backend seams:** a real deals feed; real device geolocation; persistence. ⚠️ **CORRECTED
2026-08-06** — this previously read *"behind the `advertiserDeals.js` seam (G40-180)"*. That file is
a 44-line scaffold in `Documentation/Jira Tickets/`, **not** in the HQ Dashboard; the wired module is
`deals-merchants.js`. Build to the feed contract in
`deals-registration-to-publication-config.md` §7, not to that file.

## DLM-7 — View merchant deal + order on merchant site (G40-291)

**Built, robustly.** The deal-detail view offers **"Order directly from [merchant]"**, which embeds
the merchant's live ordering site in a **sandboxed iframe** with a **load-timeout fallback +
"Open in a new tab"** for sites that refuse embedding (code comments at `gopher-request.html` 25431
and 25642 explicitly handle X-Frame-Options / CSP). Promo code is surfaced; the alternate **"Make a Gopher
Request → Bring you your deal"** parlay is present.

**Backend seams:** real merchant ordering URLs from registration; the parlay bridge into
`controllers/order/create.js` (shared with DLM-8/DLP-4). **Re-gate `isDealsEligible()`** —
currently `return true` (TEMP, open to all) at `gopher-request.html` 24603.

## DLP-1 — Provider registration, defined price, 50-mi radius (G40-293)

**Entry built; eligibility model fully specified (no ambiguity).** `gopher-deals.html` has the
**"I'm a service provider"** entry card (2780, → `openModal('worker')`), a **defined "one honest
price"** model, and the ratings-earned **tier badge**.

> ⚠️ **CORRECTED 2026-09-24.** This previously read *"a 1–50 mile reach-radius slider on the map
> (copy at ~2481/2532/2549)"* on the Deals page. That is wrong twice over. The Deals-page slider
> (`#radius-slider`, 3042) is the **merchant audience map** and runs **1–25 mi**. **Provider deal
> reach is a 1–50 mi slider in the Gopher Go in-app deal form** — `#osfReach`,
> `gopher-go.html` 5369, *"How far your deal travels — up to 50 miles, separate from your work
> radius."* (Consistent with the pathway doc's Stage 3 note that reach is no longer set on a public
> map.)

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
(`gopher-request.html` 15604): *"Service-provider deal redemptions go ONLY to the offering provider
and are auto-accepted (a simulated connect) as a flexible, within-2-week request — no broadcast to
other workers. Merchant deals keep the normal ASAP flow."* Redemption pre-selects the "Within 2
weeks" timing tab (`flexibleWindow = '2weeks'`, 15609).

**Backend seams:** real directed routing to the specific provider + a real accept (replace the
simulated connect); the flexible-scheduling handoff.

---

## Cross-cutting dependencies (all six)

- **SPINE-1 (G40-296)** — unified identity. Merchant and provider accounts fold in as entity types;
  gates portal login + Users & Access roles. Provider identity = an eligibility tier on the existing
  worker account.
- **Deals data model** — a real `deals` store (merchant/provider id, category, location(s),
  price/defined-price, radius, window, status, click counters). ⚠️ **CORRECTED 2026-08-06:** this
  previously placed the store *"behind the `advertiserDeals.js` (G40-180) admin seam, which already
  provides `isDealLive` / `liveHomeDeals` / `trackClick` / `toCsv`."* **`advertiserDeals.js` is not
  in the HQ Dashboard** — it is a 44-line scaffold at `Documentation/Jira Tickets/advertiserDeals.js`,
  so those helpers are an intended shape rather than existing code to extend. The wired Dashboard
  module is **`deals-merchants.js`**, with a different status vocabulary and **no fields for a DLP
  deal**. Build the **union record** in `deals-registration-to-publication-config.md` §4.1 with the
  status vocabulary in §5.1, and keep **exactly one** `isDealLive(deal, now)` predicate (§7.1).
- **Order bridge** — `controllers/order/create.js` is where a merchant order (DLM-8) or a provider
  redemption (DLP-4) spawns the actual Gopher request.
- **B2B portal shell** — merchant/provider portal reuses G40-160 / Epic G40-2 rather than a
  standalone auth.

## What is explicitly NOT built

> ⚠️ **Superseded 2026-08-09** — CLAUDE.md's *Scope of AI work* no longer reserves these for a human developer (there is no dev partner, and sessions have been shipping auth/authz/DB work to `production`). **The gate is now the owner's informed consent before production:** what it solves, the risk, the reward — then his decision. Build status below is still accurate; the *who may build it* framing is not.

Persistence/DB, authentication/accounts, matching/routing (directed-request, eligibility
computation), payments. The prototype is the **UX + data-shape blueprint**; it is not wired to a
backend.

## Superseded tickets

G40-288, G40-290, G40-291, G40-293, G40-294, G40-295 are **canceled as superseded** and linked
(Duplicate) to G40-286. This ticket + this doc are the single consolidated hand-off.
