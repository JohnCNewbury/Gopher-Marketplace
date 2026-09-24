# G40-180 — Admin Panel: Advertising Partner Entry

**Status:** Built + verified (HQ Dashboard = Admin Panel replacement)

> ⚠️ **STATUS CORRECTED 2026-08-06 (owner-confirmed): STARTED, not built.**
>
> The owner confirms this work *"has been started."* Verified what that means, because the document
> conflates two different things:
>
> | Claim in this doc | Reality |
> |---|---|
> | *"Scaffold: `wave2/g40-180/advertiserDeals.js` (model + `isDealLive` + `liveHomeDeals` + click tracking + `toCsv`, tested)"* | ✅ **Accurate.** It exists at `Documentation/Jira Tickets/advertiserDeals.js` — 44 lines, `createAdDeal` / `isDealLive` / `liveHomeDeals` / `trackClick` / `toCsv`, `AD_STATUS {active,paused}`, `CSV_COLUMNS`. Pure and testable, as described. **This is the started work.** |
> | *"Status: Built + verified"* + the **"What was built — Gopher HQ Dashboard"** section below (nav entry, routing, compiled section) | ❌ **Not in the Dashboard.** No `id:'advertising'` in `app_part*.js`, no `VIEWS.advertising`, none of `isDealLive`/`liveHomeDeals`/`trackClick` in any Dashboard `.js`, no such section in the built `output/Gopher_HQ_Dashboard.html` (its only "Advertising" strings are QuickBooks expense categories), nothing on any Dashboard branch, and no commit ever adding it. |
>
> **So: the engine is written and tested; the Dashboard surface that would use it is not built.**
> Read everything below the "What was built" heading as the **intended design**, not as shipped code.
>
> ⚠️ **Do not treat this document as evidence that admin deal-review, click tracking or CSV export
> exist today.** The module actually wired into the Dashboard's Deals view is **`deals-merchants.js`**,
> which has none of them, a different status vocabulary, and no fields for a DLP (service-provider)
> deal. When this surface is built, build it to the union record in
> `deals-registration-to-publication-config.md` §4.1 with the status vocabulary in §5.1 — the
> scaffold's `{active, paused}` maps on as `active → live`, and `paused` is the one state it
> contributes that the Dashboard vocabulary lacks (spec §5.1).

## Goal
A central admin portal to **add / activate / pause / remove advertisers** whose deals populate the **Gopher
app Home Screen** (only while active and inside their date window), with click tracking and a CSV report.

## What was built — Gopher HQ Dashboard (`Documentation/Dashboard/`)
A new **"Advertising"** section (Tools group), compiled via `python3 build.py` into
`output/Gopher_HQ_Dashboard.html`. Mirrors the tested `advertiserDeals.js` engine.

- **Nav + routing** — `app_part1.js`: added `{id:'advertising',name:'Advertising',icon:'tag',pill:NEW}` to
  the Tools NAV group + a `TITLES.advertising` entry. `go('advertising')` renders `VIEWS.advertising`.
- **`VIEWS.advertising`** — `app_part4.js` (appended before `init()`):
  - **KPI row:** Advertising partners · **Live on home now** (active + in-window, via `isDealLive`) · Paused · Deal-link clicks (+ request-link clicks).
  - **Table:** each advertiser — name + Advertiser ID, category, **status pill** (Active·live / Active·scheduled / Paused), date **window**, deal clicks, request clicks, and per-row **Pause/Activate · Edit · Delete** (delete confirms).
  - **Add / Edit form** with every AC1 field: Advertiser ID, Business category, Business name, Logo URL, Deal description, Deal URL, Activation instructions, copy/paste **deal text**, **Gopher Request link**, **Start Date**, **End Date**, Status. Click-tracking counters (`dealClicks`/`requestClicks`) are shown per row.
  - **Download CSV** — reuses the dashboard's `exportCSV()`; columns include advertiserId, category, name, description, url, start/end, status, **live**, dealClicks, requestClicks.
  - **Persistence:** entries live in `localStorage['gopher_advertising']` (same pattern as the moderation actions) so they survive reload without a backend; seeded with 3 demo advertisers (2 live, 1 future+paused).
  - **Home-sync + order popup** are documented inline as the app-side seam.

### AC coverage
1. ✅ Advertising-partner entry section with all listed fields (+ click-tracking counters shown).
2. ✅ Home-screen sync represented — "Live on home now" KPI + per-row live/scheduled status via `isDealLive`/`liveHomeDeals` (the real Home Screen binds to `liveHomeDeals()` — app-side seam).
3. ✅ "Download CSV" report.
4. ✅ Add, activate, and deactivate (pause) deals — plus edit/delete.

## Verification
- **Isolated harness** (verbatim advertising code + stubbed dashboard helpers): mounts `VIEWS.advertising`
  and drives it — **all real behaviors pass**: 3 seeded, `isDealLive` correct (Sheetz/Circle K live, Bella
  future+paused not live), KPI "Live on home now"=2, **Add** → 4 + rendered, **toggle** → paused persisted +
  KPI recomputes to 2, **delete** → removed, **CSV** → rows incl. advertiserId + live columns, **edit form
  has all 12 AC1 fields**. (The block runs to completion → no syntax errors.)
- **Build:** `python3 build.py` succeeds (72.5 MB); the compiled output contains `VIEWS.advertising` and the
  `id:'advertising'` nav item. (The 72 MB file is too heavy to load in the preview, hence the harness.)

## Backend seam
- Persist advertisers server-side; the app **Home Screen** reads `liveHomeDeals(deals)` (active + in-window).
- Real click tracking → increment `dealClicks` / `requestClicks` on the deal-link and Gopher-Request-link taps (`trackClick`).
- The **order-time pop-up** ("fulfillment through Gopher is not guaranteed") fires **app-side** when a user starts an order from a deal.

## Files
- `Dashboard/app_part1.js` — NAV item + TITLES.
- `Dashboard/app_part4.js` — advertising engine (`advLoad/advSave/advIsLive/…`) + `VIEWS.advertising`.
- Rebuild: `cd Documentation/Dashboard && python3 build.py`.
