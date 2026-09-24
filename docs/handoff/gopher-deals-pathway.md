# Gopher Deals™ — End-to-End Pathway (Registration → Redemption → Management)

**Status:** authoritative pathway reference for the Deals initiative (G40-286 and its consolidated
sub-tickets 288/290/291/293/294/295). Grounded in the shipped prototype code, not memory — every
seam below cites the real file + line. Now spans three surfaces: the public/merchant Deals page
(`gopher-deals.html`), the **Gopher Go worker app** (`gopher-go.html`) where providers create deals,
and the worker tutorial (`gopher-go-101.html`). Companion to
`G40-286-deals-frontend-consolidated-handoff.md` (ticket-level verdicts).

> 📍 **Citation + accuracy refresh — 2026-09-24 (G40-288 close-out).** Every `file:line` citation in
> this doc was written against the July files and had gone stale by ≈2,000 lines on
> `gopher-deals.html` alone (e.g. the old `:5037` landed on a Twilio comment). **All have been
> re-derived by content** and re-pinned to branch `feature/deals-google-maps-audience` @ `a26a476`
> (2026-09-24): `gopher-deals.html` 9,408 lines · `gopher-request.html` 28,082 ·
> `gopher-connect.html` 25,498 · `gopher-go.html` 9,581 · `gopher-go-101.html` 1,005.
> **Numbers rot — the backticked symbol beside each one is the durable anchor; grep that first.**
>
> ⚠️ **Which "main" you mean decides whether these numbers hold — and the two disagree.**
> `main` is the **deploy** branch: it publishes `Final/`'s contents at its **root**, with no `Final/`
> prefix and no `CLAUDE.md`.
>
> - **`origin/main` — numbers HOLD.** Its `gopher-deals.html` is the same 9,408 lines and was
>   byte-identical to `feature/deals-google-maps-audience:Final/gopher-deals.html` on 2026-09-24;
>   `populateLocationSelect()` is `:7483` there too. But the path differs:
>   `git show "origin/main:Final/gopher-deals.html"` returns **empty**, because it lives at
>   `origin/main:gopher-deals.html`. That empty answer reads as "untracked" and is the most
>   convincing wrong answer available.
> - **A local `main` or a session worktree — numbers DO NOT hold.** These sit far behind (625b0ae,
>   19 Jul, **6,044** lines), where `populateLocationSelect()` is `:5407`, not `:7483` — a ~2,000-line
>   drift, which is how this doc's citations rotted in the first place.
>
> So: read the source at `feature/deals-google-maps-audience:Final/<file>` (or `origin/main:<file>`
> for what is deployed) — **never from a worktree checkout**, and never from bare `main` without
> checking which one you have. **A cited line number past the file's own `wc -l` is a wrong-ref
> alarm, not a typo.**
>
> Three claims were wrong in **substance**, not just position, and are flagged inline where they
> appear — each would have sent a dev to build something that already exists or was deliberately
> removed:
> 1. **My Deals edit/pause** (Stage 4) — described as unwired; **shipped and API-wired**.
> 2. **The Apps Script / Google Sheet pipeline** (Stage 1, Stage 3, Stage 4, summary map) —
>    described as current persistence; **severed by owner decision 2026-08-21**.
> 3. **The provider eligibility gate** (Stage 1 Entry B) — described as demo-toggle only;
>    the **live verdict read is wired**.

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
| Reach | Customers & workers within **25 mi** of the merchant's fixed location(s) (canonical 2026-07-12) | Up to **50 mi**, set in the Gopher Go app — **not** on the public page |

---

## Stage 1 — Registration (where it starts)

**Merchant surface:** `Final/gopher-deals.html` — the public page has two entry cards: "I'm a
Business" (DLM) and "I'm a Service Provider" (DLP, card at `gopher-deals.html:2780` — the on-page heading is sentence-case, *"I'm a service provider"*). They behave
differently: the **merchant** card opens a full registration + deal form; the **provider** card opens
only a short **eligibility funnel** (the deal is created later, in the Gopher Go app).

### Merchant (DLM) — `#modal-merchant` at `gopher-deals.html:3058`, fields `:3097`–`:3271`

| Field | Form name | Notes |
|---|---|---|
| Business Name | `business_name` | |
| Business Logo | `logo` (file) | Upload; `showLogoName()` shows the chosen filename |
| Business Tagline | `tagline` | **Required** (2026-07-14) — ⓘ: no formal tagline? any sub-header works |
| Business Address | `address` | Places autocomplete-backed |
| **Address is mobile** | `address_is_mobile` (checkbox) | Food-truck / no-fixed-location case — drives redemption pickup (Stage 5) |
| **Website for Online Ordering** | `website` | Renamed 2026-07-14. The ordering URL shown in the in-app web view (Stage 5) |
| **No online ordering** | `no_online_ordering` (checkbox) | 2026-07-14 — common for food trucks. Triggers (a) Gopher follow-up email to establish an ordering URL (likely a social page) and (b) the **cost-of-items field** in the shortened redemption flow (Gopher fronts the purchase) |
| Business Category | `category` | Restaurants & Food Trucks / Local Favorites / Age-Restricted / Retail / … |
| Deal Offered | `deal` | Free text |
| Promo Code | `promo` | e.g. `GOPHER10` |
| **Searchable Keywords** | up to 3 chips | **These become the customer keyword-search index** (Stage 5) |
| Owner **Personal Info** (First, Last, DOB, Phone, Email, Address) | `owner_first_name` `owner_last_name` `owner_dob` `owner_phone` `owner_email` `owner_address` | **2026-07-14: exact parity with standard-signup Personal Info** (seam #10 front-end DONE). Photo excluded — prompted at first sign-in to any Gopher platform |
| Source — How did you discover Gopher? | `discovery_source` | Canonical signup list + **"Gopher Deals"** added platform-wide. (`source` was taken by channel attribution) |
| Referred by — Gopher User ID | `referred_by_gopher_id` | Shown only when Source = Referral; skippable. ⚠️ **NOT 6-digit — corrected 2026-08-09.** The Gopher ID is **opaque and variable-length**; **70% of production accounts (97,977 of 139,272) are 1–5 digits** and IDs run 1 → 141,303. A 6-digit validation rejects most real users. Never length-validate it. See `deals-registration-to-publication-config.md` Ruling 6. |
| **Phone verified** | `phone_verified` (hidden) | OTP affordance — **currently simulated**, see backend seams |


### Service Provider (DLP) — a two-entry model

A provider deal can only be offered by an *eligible Worker*, so the public page never takes a full
deal submission — it gates first.

**Entry A · public eligibility funnel** — the "Offer your service on Gopher" modal in
`gopher-deals.html` (the "I'm a service provider" card opens it).

> ⛔ **REWRITTEN 2026-09-24 — this funnel was rebuilt on 2026-08-21 when Apps Script was severed, and
> the old description would have a rebuild re-create five fields the code explicitly forbids.**
> It previously read: *"a short form captures only identity: **First, Last, SMS, Email, Gopher ID**
> … Submit posts through the same `submitForm('worker')` lead plumbing"*, plus a Gopher-ID tooltip.
> **All of that is gone.** Enumerated on `a26a476`, `#modal-worker` (opens `:3524`) contains exactly
> **two** named inputs. Per the in-code note (`:3560`–`:3575`): once the phone is OTP-verified the
> platform already knows which account this is, so name, email and Gopher ID were redundant *and*
> were being "collected and would have gone nowhere". Verbatim: **"Do not re-add an input this form
> does not send."**

Today it captures **one field — mobile (SMS)** (`name="sms"`, `:3580`) with a send-code / verify pair
(`sendOtp()` `:3581` → `workerCheckOtp()` `:3587`, the OTP input `name="otp_code_sms"` at `:3586`).
Verification answers **on the spot**: `workerCheckOtp` (`:4737`) calls
**`GET /users/deals/eligibility`** and renders `eligible` / `ineligible` / `notgopher` / `error` into
`#spResult` (`:3593`). `submitForm` has exactly one caller, the merchant form — this funnel submits
nothing. No deal, no price, no reach here; this only determines eligibility.

⚠️ The old thank-you copy — *"we'll check your eligibility, email you terms + next steps…"* — **no
longer exists in the file** (zero matches; the answer is now inline). An earlier draft of this
correction said it "still stands"; it does not.

> ⚠️ **Name trap for the rebuild.** The old `name="gopher_id"` on *this* form meant the applicant's
> **own** ID. The merchant form's `referred_by_gopher_id` means the **referrer**. Near-identical
> names, opposite meanings; `applyReferralPrefill` is merchant-scoped and must stay that way. The
> only `gopher_id` string left near this modal is inside that warning comment at `:3572` — **it is
> not a field**, and a grep that treats it as one will reintroduce the bug. (The Refer & Earn
> tooltip and `assets/img/gopher-id-refer.webp` now pertain only to the merchant form's
> `referred_by_gopher_id`.)

**Entry B · in-app deal form** — `Final/gopher-go.html`, the worker dashboard. An eligible worker
gets a green **"Offer My Service →"** button above the Profile nav item (`gopher-go.html:4515`); it
opens the real **Deal + Earning** form (`offerServiceOverlay`, `:5283`) *minus personal*
(name/phone/email/Gopher ID already on the account):

- Deal you're offering + **Searchable Keywords** (1–3 chips)
- **What you want to earn** → **Customer will pay** = `earn × 1.10` (the 10% Deal Boost, live-calc)
- **What you'd normally charge** → struck-through value anchor at `normal × 1.10`
- **Deal reach** — a **1–50 mi** slider (`#osfReach`, `gopher-go.html:5369`), separate from the
  worker's general work radius
- Submit (`osfSubmit`, `:5374`) → a "Deal submitted for review" state (honoring the manual-review gate)

If the worker is **not** eligible, the button is locked and taps open a pop-up
(`offerIneligibleOverlay`, `:5271`) that redirects to the eligibility terms in Gopher Go 101
(`gopher-go-101.html#offer-deals`, `:746`). Eligibility is **automatic** at the bar; each posted deal
is **manually reviewed** before it goes live. In the prototype the gate is simulated with a demo
toggle (the `ELIGIBLE` flag, `gopher-go.html:8466`; the toggle itself at `:8527`). ⚠️ **CORRECTED
2026-09-24 — the live read is now wired**: `refreshEligibility()` (`:8531`) calls
`GoAuth.fetchEligibility()` and sets `ELIGIBLE` from the server verdict after a real sign-in and on
session restore. The demo toggle survives only for the signed-out demo.

### Where the information goes (today)

> ⛔ **CORRECTED 2026-09-24 — the Apps Script pipeline described here no longer exists.**
> This section used to say the form **"POSTs to a Google Apps Script Web App (`GOPHER_FORM_ENDPOINT`)"**
> and that **"the Sheet *is* the pipeline."** Both are now false, and acting on them would rebuild
> something the owner deliberately removed. **`GOPHER_FORM_ENDPOINT` was severed on 2026-08-21** —
> owner, quoted in-code at `gopher-deals.html:5314`: *"I wanted to sever App Scripts and EVERYTHING
> is internal now."* The comment adds: **"Do not reintroduce this constant or anything that posts to
> `script.google.com`."**

`submitForm(type)` at `gopher-deals.html:5356` — **as built today**:

1. Serializes every named field in the modal to a `data` object.
2. **Writes a local backup** — appends to `localStorage['gopherLeads']` (`:5433`), so nothing is lost
   even if the network call fails. *(Still true.)*
3. **Merchant registration POSTs to the real internal API** — `apiCall('/users/deals')` (`:5531`),
   token-gated (an unverified phone is refused at `:5448`) and sent as an **allowlisted payload
   built by picking named fields**, never by forwarding `data` — the intake rejects unknown keys by
   name with a 422. Optional address geocode stamps `lat`/`lng` first, with a 1.6 s race that sends
   without coordinates rather than blocking (`:5591`).
4. **The service-provider / worker funnel no longer submits at all.** It verifies a phone and reads
   the live eligibility endpoint `GET /users/deals/eligibility` (`workerCheckOtp`). `submitForm` now
   has exactly **one** caller, the merchant form; anything else reaching the old fall-through
   **fails loudly** by design (`:5586`; the severance note itself is at `:5578`) rather than showing a thank-you for a submission that went
   nowhere.
5. Console export escape hatch — `downloadGopherLeads()` (`:5615`) dumps the localStorage backup as a
   CSV for manual recovery. *(Still true.)*

> **Current persistence:** merchant deals live in the **real backend**
> (`GOPHER_API = 'https://api.gophergo.io/api/v1'`, `:5274`) — merchant submission was verified
> against production on 2026-08-10 per the in-code note at `:5439`. SPINE-1 identity is still the
> open piece; the Google Sheet is **not** the pipeline any more.

---

## Stage 2 — The data model (how merchant registration becomes structure)

Once a merchant is in the portal, the shape is **account → businesses[] → locations[] → deals**.
Defined in the `ACCOUNT` object at `gopher-deals.html:7456` (the demo account owns *My Way Tavern*
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
  `gopher-deals.html:6366`; the "+ Add location" push is `.la-save` at `:7697`, "+ Add business" is
  `naSave` at `:7710`) and submits a **new** deal there. There is no "one deal,
  many locations" fan-out — this is intentional and keeps pickup unambiguous.
- **Mobile / food-truck** locations set `mobileAddress:true` (`applyMobileAddr()`, `:7550`). This
  flag is what makes redemption ask the customer for a pickup address instead of auto-filling one.

**Authoring UX:** the "Submit a New Deal" form has a business/location picker grouped by business
(`populateLocationSelect()`, `:7483`) ending in "+ Add a new business or location…". Picking a
location calls `prefillFromLocation()` (`:7493`) → "Pre-filled from your last deal at this location."

*(The provider deal has no such multi-location model — a provider posts one defined-price service
from their Gopher Go account; see Stage 1 Entry B.)*

---

## Stage 3 — APIs & external services (the explicit ask)

| API / service | Where used | Purpose | Key / auth | Prod note |
|---|---|---|---|---|
| **Google Maps JavaScript API** | `gopher-deals.html:2713` (loader) | Renders the merchant **audience map** in registration + dashboard | Browser key `AIzaSy…UVJAU`, **HTTP-referrer restricted** | Add each deploy origin to the referrer allowlist (below) |
| **Google Places API** | Maps-ready init (`:3810`) | Address autocomplete on the merchant address fields | Same key, `libraries=places` | — |
| **Google Geocoding API** | `new google.maps.Geocoder().geocode()` `:3796` (registration) / `:5598` (at submit) | Turns a typed address → lat/lng to drop the audience-map pin | Same key | — |
| **Google Distance Matrix API** | Request/Connect ride-pricing seam (`getRideTripEstimate`) | When a merchant deal **parlays into a Gopher Request**, real mileage → delivery price | Same Google project | Wired in the customer apps, not the Deals page itself |
| ~~**Google Apps Script Web App**~~ ⛔ **REMOVED** | ~~`GOPHER_FORM_ENDPOINT`~~ — severed 2026-08-21, note at `:5314` | ⚠️ **No longer a dependency.** Was lead/eligibility persistence → Google Sheet | — | **Do not reintroduce.** Merchant deals now `POST /users/deals`; SP funnel reads `GET /users/deals/eligibility` |
| **Gopher internal API** | `GOPHER_API` `:5274` → `apiCall()` `:5286` | Merchant deal submission, My Deals read + edit/pause/resume, org roles, eligibility | Bearer `access-token` header from sign-in | Replaced the Apps Script (verified against production 2026-08-10, `:5439`) |
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
Business Info, Personal Info, Payment, Users & Access, Refer Gopher, Feature My Business; nav at
`:6037`–`:6069`, panes at `:6105`–`:6628`, section-title map at `:7034`), with a live-preview
phone that mirrors how the deal will appear in the customer apps.

- **My Deals** — ⛔ **CORRECTED 2026-09-24 — this is no longer a display list.** It previously read:
  *"lists each deal with a real status badge … and a **Views** counter. It's a **display list today**
  — edit / pause / delete are not wired (backend actions)."* **Edit and pause/resume shipped**
  (owner ruling in-code at `:7927`, 2026-08-25) and call the real API. There is **no Views counter**.
  As built: `loadMyDeals()` (`:7896`) fetches `GET /users/deals/mine`; `renderMyDeals()` (`:7793`)
  draws real rows with a status badge (**Live / In review / Paused / Not approved / Expired**,
  `DEAL_STATUS_LABEL` `:7778`) plus the rejection reason and pause / edit-in-review state; the Edit
  and Pause buttons (`:7843`–`:7850`, gated on `_authToken`) dispatch at `:8054`–`:8059` into
  `openPauseModal` → `PATCH /users/deals/{id}/pause`, `resumeDeal` → `…/resume`, `openEditModal`
  → `PATCH /users/deals/{id}` (edit goes to review; the live version keeps serving).
  **Delete is still unbuilt** — no delete control exists anywhere in the file. The four hardcoded
  rows that remain are the **signed-out showroom** (`MY_DEALS` `:7755`; why, at `:7745`).
  ⚠️ Read in source only — **no write was driven against the live `api.gophergo.io`**, so persistence
  is *wired, not proven end to end*. Full detail: `G40-286-deals-frontend-consolidated-handoff.md`
  → DLM-3.
- **Business Info** — status "Active / Verified" (`pi-status`, `:6407`); the account/identity surface
  SPINE-1 will own.
- **Feature My Business** — an **open-bid** placement auction (`advertise` pane, `:6536`): top bid per category is
  featured across the app/web platforms next month; top overall becomes the Featured Deal.
- **Live preview** — a `sandbox`ed `<iframe>` (`pvFrame`, `:6307`) renders the merchant's own ordering
  site inside the branded page (the same embed technique the customer redemption uses).

> **Provider management is in Gopher Go, and it's built.** An eligible provider **creates and manages
> deals from the Gopher Go worker app** (`gopher-go.html` — the "Offer My Service" flow, Stage 1
> Entry B), not this merchant portal. On the public Deals page they only check eligibility (Entry A).
> The eligibility terms live in `gopher-go-101.html#offer-deals`.

> ~~**Interim data pipeline (owner note 2026-07-12):** the Apps Script Sheet (live registrations,
> now with `lat`/`lng` + a `source` channel column) is **periodically uploaded into the Gopher HQ
> Dashboard** to refresh the Raleigh DMA merchant-coverage map (`deals-coverage.js` manual upload)
> until the real backend/DB connection automates it.~~
>
> ⛔ **SUPERSEDED 2026-09-24.** The Apps Script Sheet this describes was **severed on 2026-08-21**,
> so there is no longer a Sheet to upload from. Merchant registrations land in the internal API
> (`POST /users/deals`). **How the HQ merchant-coverage map is refreshed now was NOT verified in this
> pass** — do not assume either the old manual upload or an automated feed; confirm with the HQ
> Dashboard owner before building against it.

**Admin side (Gopher HQ):** the manual "review before it goes live" step happens in the HQ Dashboard.
⚠️ **CORRECTED 2026-08-06** — this previously said deal lifecycle state, click tracking and CSV export
*"also exist in the HQ Dashboard's `advertiserDeals.js` (the G40-180 admin tool)."* **They do not.**
`advertiserDeals.js` is a 44-line scaffold at `Documentation/Jira Tickets/advertiserDeals.js`, and
none of `isDealLive` / `liveHomeDeals` / `trackClick` / `toCsv` appear anywhere in the Dashboard. The
wired module is **`deals-merchants.js`** (review/reject/contact modals, `localStorage` action store),
which has a different status vocabulary and no DLP fields. Build to
`deals-registration-to-publication-config.md` §4.1 / §5.1 / §7.

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
   `frame-ancestors` CSP (handled explicitly — `gopher-request.html:25431`/`:25642`,
   `gopher-connect.html:16017`/`:16233`).
2. **"+ Make a Gopher request to bring you your deal"** (`data-deal-cta`, `:25918` /
   connect `:16495`) — the last-mile parlay.

### Merchant last-mile parlay ("Bring you your deal")

Opens the `dealReq` modal (`dealReqOverlay`, `:25931` / connect `:16508`). Pickup resolution follows the location's `mobileAddress` flag:

- **Fixed location** → pickup auto-applies to that location's address and the pickup field stays
  **hidden**.
- **Mobile merchant** → the **Pick-up address** field is **shown** (`dealPickupField` / `dealPickup`,
  `:25942`, connect `:16519`) so the customer enters where to collect from.

The request then flows into the normal ASAP Gopher Request pipeline.

### Provider-directed redemption (DLP-4)

Redeeming a **service-provider** deal (`svc-deal-redeem` / `svcDealRedeem`, `:25766` / connect
`:16356`) behaves differently from a merchant deal. Per the governing comment at
`gopher-request.html:15604`:

> Service-provider deal redemptions go **only to the offering provider** and are **auto-accepted**
> (a simulated connect) as a **flexible, within-2-week** request — no broadcast to other workers.
> Merchant deals keep the normal ASAP flow.

It sets `state.dealProvider = { name, role, tier, pic }` (`:15610` / connect `:14418`) which directs
the request to that one provider and drives the "once **[provider]** accepts, they'll contact you to
schedule" copy (`:14295`). Redemption also pre-selects the "Within 2 weeks" timing tab
(`flexibleWindow = '2weeks'`, `:15609`).

### The customer-side eligibility gate (temporary)

`isDealsEligible()` currently **returns `true` for all users** — the Deals gate is intentionally open
in the prototype so anyone can demo it. ⚠️ **It is stubbed in BOTH customer apps**, not just one:
`gopher-request.html:24603` **and** `gopher-connect.html:22701` are the identical stub; re-gating one
and not the other leaves the gate open.

⚠️ **Consequence worth knowing before you test.** The "Coming soon to your area" overlay
(`#dealsTitle`, request `:17649`) sits on the **else** branch of the Deals-tab handler
(request `:26194`, connect `:16965`), which reads
`if (isDealsEligible() && host) { renderDealsHome() } else { overlay.hidden = false }`. With the stub
always true, that else branch is reached **only if the host element is missing** — so in normal use
the coming-soon notice is effectively unreachable from the Deals tab. A reviewer who sees
"Coming soon" is looking at a different surface, or at a page where `dashDealsHost` failed to
render. Production restores the real
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

1. **Persistence** — ⚠️ **partly done.** Merchant **deals** now persist through the internal API
   (`POST /users/deals`; the Apps Script/Sheet is gone). Still outstanding: the
   **businesses/locations tree**, which lives only in the in-memory `ACCOUNT` object ("+ Add
   location" / "+ Add business" push and re-render but there is no `/users/businesses` endpoint), and
   the `localStorage` lead backup / `GopherIQData.lookup` seam.
2. **My Deals actions** — ⛔ **CORRECTED 2026-09-24: edit and pause/resume are BUILT and API-wired.**
   This previously read *"wire edit / pause / delete (display-only today)"*. **Only delete is
   unbuilt.** See Stage 4 → My Deals. *(Read in source; no write was driven against the live API.)*
3. **Mobile-address flag** — carry `mobileAddress` into the real request payload
   (`TODO(backend)`, `gopher-deals.html:7555`).
4. **Provider-directed routing** — real directed routing + real accept (currently a simulated
   connect), plus the flexible-2-week scheduling handoff → matching logic.
5. **Re-gate customer Deals** — restore `isDealsEligible()` in **both** apps
   (`gopher-request.html:24603` **and** `gopher-connect.html:22701` — identical stubs) once
   accounts are real.
6. **OTP** — real SMS provider behind the `phone_verified` affordance.
7. **Live audience data** — swap the baked `gopher-deals-audience.js` for a live query.
8. **Provider eligibility + two-entry flow (DLP)** — Service Provider is **not a separate role**;
   it's an eligibility tier of Worker. Auto-eligible when a Gopher is **Elite / Elite+ / Pro · 20+
   completed SERVICE jobs · 4.75★ over the last 20 completed SERVICE jobs** (admin manual-override
   allowed; **Delivery, Ride Sharing, and Other jobs count toward NEITHER the 20 NOR the rating
   window** — founder amendment 2026-07-23, service categories piloted first); each posted
   deal is **manually reviewed** before going live. The dev wires: the **Gopher-ID → eligibility
   lookup** behind the public funnel, the real **email + Gopher Go inbox** notification, and the real
   **eligibility gate** on the in-app "Offer My Service" button (simulated by the `ELIGIBLE` demo
   toggle today). (Source: `Gopher — Intended/Gopher-Roles-Capability-Matrix.md`.)
9. ~~**Gopher-ID tooltip asset**~~ — **DONE**: captured from `gopher-go.html`'s Refer & Earn panel to
   `assets/img/gopher-id-refer.webp` (shows "the Refer & Earn QR code"). Reconciled the tooltip/placeholder
   example from the figma's `MARCUS-4F9` to the built app's numeric `820083`. *Open design question for the
   dev/owner: the referral-code format differs between the figma (`MARCUS-4F9`, name-based) and the built app
   (`820083`, numeric) — pick one as canonical for the real "Gopher ID."*
10. **Owner Personal-Info parity — FRONT-END DONE 2026-07-14** (ruling 2026-07-12; validated
    against John's signup screenshots). The merchant form's Business Owner Verification now
    collects the exact standard-signup set (First/Last/DOB/Phone/Email/Address/Source + the
    Referral→Gopher-ID pattern — **variable length, never length-validated**, see Ruling 6). Remaining for the dev: provision the owner's Gopher account
    from these fields, and the **first-sign-in photo prompt** (Deals dashboard or any platform).
    Original ruling:
    Per the standard Gopher process, every sign-up provisions a Gopher Request account — the canonical
    baseline for "Personal Info." A merchant owner must therefore provide, at minimum, all the Personal
    Info a standard Gopher Request sign-up captures. The live pre-registration form deliberately does
    NOT capture the full set yet (left as-is so the recruiting push isn't disrupted). **Before dev
    handoff, WE expand the merchant form's "Business Owner Verification" section to request ALL
    standard-signup Personal Info fields**, and that Personal Info **auto-populates the Merchant
    dashboard → Personal Info** panel. Until then, the gap between pre-registration leads and full
    accounts is closed manually at approval time.

---

## Appendix — pathway at a glance

```
REGISTRATION
  Merchant → full form on gopher-deals.html (business + deal) → POST /users/deals
  Provider → TWO ENTRIES:
     A) public eligibility funnel (gopher-deals.html)
          phone verify → GET /users/deals/eligibility  (submits nothing; Apps Script severed)
          → "we'll email you terms + Gopher Go inbox"
     B) eligible worker posts the deal IN-APP (gopher-go.html · "Offer My Service")
          earn × 1.10 = customer pays · normal × 1.10 struck · 1–50 mi reach
          not eligible → gopher-go-101.html#offer-deals
        ▼
DATA MODEL (merchant)     account → businesses[] → locations[] → deals   (location-bound)
        │                 mobileAddress flag · per-location orderSite · keywords
        ▼
DASHBOARDS
  Merchant: gopher-deals.html portal — My Deals (real feed: Live/In review/Paused/Not approved/
            Expired · edit + pause/resume WIRED, delete not) · Business Info · Feature-bid
            · live preview
  Provider: Gopher Go app — creates + manages deals (built)
        ▼
CUSTOMER APPS (request / connect / Go)
  Browse: keyword search (reg. keywords) + category rails + proximity
        ├─ Merchant deal → order on site (sandboxed iframe + tab fallback)
        │                → "Bring you your deal" parlay → Gopher Request
        │                     fixed loc → pickup auto  |  mobile → customer enters pickup
        └─ Provider deal → redeem → provider-directed request (auto-accept, flexible 2-wk)

APIS: Google Maps JS · Places · Geocoding (merchant audience map) · Distance Matrix (parlay pricing)
      Gopher internal API (api.gophergo.io) = persistence · Apps Script REMOVED 2026-08-21
      SMS/OTP (needed, not built)
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
