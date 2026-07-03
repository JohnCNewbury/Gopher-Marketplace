# G40-70 — Gopher HQ Dashboard: replace the Admin Panel + embed Gopher iQ (the "Gopher Brain")

**Jira:** G40-70 (Task) · Epic **G40-4 Full Tech Stack Redesign & Rewrite**
**Assignee:** John Newbury
**Owner decisions (John, 2026-07-02):** ① The **Gopher HQ Dashboard completely replaces the current
Active Admin "Admin Panel."** ② **Gopher iQ lives inside it and is the "Gopher Brain."** ③ This ticket
is a **plug-in job**: everything is built; the developer wires it to the production database + admin
auth. No metrics/redesign work — understand it, then connect it.
**Artifact location (NOT in this repo):** `…/All New Gopher/Documentation/Dashboard/`
**This is a documentation/handoff deliverable** — no product code was changed for this ticket.

---

## 0. TL;DR for the developer

There is a **complete, working analytics + admin console** — the *Gopher HQ Dashboard* — that today
renders as a single self-contained `output/Gopher_HQ_Dashboard.html` (~70 MB) built by a Python
pipeline from **real production data** pulled off the Gopher admin API. It has 6 nav groups / ~30 views
(orders, users, revenue, funnels, ops cadence, marketplace, moderation, financials, geo/DMA, retention)
and an embedded **Gopher iQ** portal (routing + moderation "brain").

**Your job — nothing here needs to be designed, only connected:**
1. **Serve it from the production DB** instead of baked CSV snapshots (the transforms already exist —
   they *are* the spec; see §5).
2. **Put it behind the existing admin authentication** and retire the old Admin Panel (§7).
3. **Wire the write-backs** to real endpoints: moderation actions, iQ promote, pricing/promo (§6, §8).

Everything below tells you exactly **what pulls from which table and where to plug in**.

---

## 1. What it is (and what it replaces)

- **Replaces:** the current Active Admin **"Admin Panel."** The Gopher HQ Dashboard is the go-forward
  internal console — same data source (the production DB), richer analytics, plus the Gopher iQ brain.
- **Today's form:** a **serverless static snapshot** — all rows are baked into one HTML so it is fully
  searchable offline with no backend. This is a stand-in for database queries, accepted deliberately
  because *the file size collapses the moment there's a real backend* (see the "File size" note in
  `GOPHER_HQ_STATE.md` §7). Nothing about the approach is a dead end.
- **Freshness:** "current as of the last data pull." Real-time is the end state (see §9).

### Reporting structure (nav = `NAV` in `app_part1.js:125`)
| Group | Views |
|---|---|
| **Operate** | Daily Snapshot · Overview · Marketplace Health · Orders |
| **Grow** | Growth & Acquisition · Users · Revenue |
| **Platforms** | Request (mobile) · Go (gopher app) · Connect (B2B) · Deal · Rewards (2027) |
| **Reports** | Marketing·DMA · Referrals · Invites · OTPs · Bids · Gopher Offers · Counter Offers · Order Declines · Cost Adjustments · Out-of-Area Demand · Addresses |
| **Listen** | Quality & Safety · Message Alerts · Reviews · Support |
| **Tools** | Green Board (iQ) · Game Changer · Report Builder · **Financials** · Pricing Control · **Gopher iQ** portal |

---

## 2. How it's built (the pipeline)

All files live in `Documentation/Dashboard/`. One command refreshes everything:
`python3 gopher_pull.py` (logs into the admin API, downloads CSVs, runs `refresh.py`).

```
admin API CSVs ──▶ data/incoming/ ──(refresh.py + refresh_config.json)──▶ data/master/*.csv
        │                                                                        │
        │   pipeline order (refresh_config.json "pipeline"):                     ▼
        │   regen_ou.py → regen_full.py → regen_reports.py →           metrics.json (~69 MB)
        │   regen_expenses.py → regen_stripe.py → build.py → build_iq.py
        ▼                                                                        │
   build.py: metrics.json + brand logos + BAKE _iqcore + _built_at +            ▼
             app_part1..5.js + xlsx/pdf libs  ──▶  output/Gopher_HQ_Dashboard.html
   build_iq.py: PUBLIC iQ engine from PUBLIC stores only (exposure guard) ──▶ gopher-iq-engine.html
```

- **`regen_*.py` are the transforms** — each reads master CSV(s) and writes one or more `metrics.json`
  blocks. **They are literally the endpoint spec** (the same aggregation a DB-backed API must return).
- **`build.py`** assembles the single HTML, bakes the iQ index (`_iqcore`), a precise `_built_at`
  stamp, brand logos, and `alert_learnings.json` (moderation calibration).
- **`build_iq.py`** regenerates the *public* customer-app search pill engine — **public iQ stores only**.

### Source → transform → view map (the data contract)
Master CSVs are 1:1 mirrors of admin-API resources, which are 1:1 with **DB tables**. Endpoint map is in
`GOPHER_HQ_STATE.md` (`/orders/csv`, `/user/csv` (singular), `/messages/csv`, `/bids/csv`, `/flags/csv`,
`/referral/csv`, `/counter_offer/csv`, `/cost_adjustment/csv`, `/order_declines/csv`; Invites = manual).

| Script | Reads (DB table) | Produces (`metrics.json` keys) |
|---|---|---|
| `regen_ou.py` (main aggregator) | Orders, Users | `totals, monthly, by_category, fees, status_trend, geo_orders, geo_users, people, gopher_type, verification, funnel_requester, funnel_gopher, signups, acquisition, interests, order_states_present, recent_window, orders_full, users_sample, _gamechanger, _ops, _dma, _zipdma, _dmaNames` |
| `regen_full.py` | Users | `users_sample` (full per-user rows incl. contact fields) |
| `regen_reports.py` | Referral, Invites, Counter_Offer, bids, order_declines, cost_adjustment, In-app messages, Flags, Orders, Ratings | `_reports.*, _allmsgs, _inapp, flags, orders_full, by_category` |
| `regen_expenses.py` | `Truist_Accounts.xlsx` | `_expenses` (Financials) |
| `regen_stripe.py` | `*_Stripe_Orders_Reconciliation.xlsx` | `_stripe` |
| `build.py` | `iq_routing.json`, `moderation_rules.json`, `pricing_parity.json`, logos, `alert_learnings.json` | `_iqcore, _parity, _brand, _built_at` |

### Locked definitions (do not re-derive — verified)
- **Order status (AASM):** `delivered, cancelled, expired, pending` (+ rare `scheduled/accepted/picked_up`).
  **`delivered` = finished/paid-out.**
- **GMV = Σ `GRAND TOTAL` over `delivered` orders only ≈ $1.23M.** The ~$3.34M all-status figure is
  **not** GMV. The "completed" KPI = delivered.
- Snapshot numbers (Jun 28 2026 pull): Orders 61,100 · Users 134,953 · Completed 20,118 (32.9%) ·
  GMV $1.23M · Opex $3.4M / 96 months.

---

## 3. The data model (`metrics.json`, 35 blocks)

Two kinds of blocks: **aggregate KPI objects** (small — `totals`, `people`, `funnel_*`, `_ops`,
`_gamechanger`, `_expenses`, `_stripe`, `_dma`, `verification`, …) and **row stores** (large, embedded
stand-ins for DB queries). The row stores are what a live backend replaces with paginated endpoints:

| Block | Rows | Encoding (`fields` = column order; values indexed into `legend`) |
|---|---|---|
| `orders_full` | 61,308 | `id, day, status, cat, hour, dow, state, device, ar, total, netCents, title, desc, req, gopher, pay, itemCost, gopherOffer, gopherFeeCents, arfCents, itfCents, dcity, dstate, dzip, reqId, gopherId, …, pickupFull, dropFull, created, inProg, pickedUp, completed, scheduled` — `status`/`cat`/`state`/`device` are ints into `legend`; `day` = days since `base` 2018-01-01 |
| `users_sample` | 135,390 | `id, name, email, role, state, device, signupDay, logins, placed, completed, received, gopherType, verifBits, source, status, zip, deactDay, phone, dob, addr1, addr2, city` (`role`/`device`/`state` indexed into `legend`; `verifBits` = bitfield) |
| `_allmsgs` | 67,832 | `id, order_id, title, from, to, messages, created_at` (full in-app message text — powers Communication History search/export) |

Because these are embedded, the file is ~70 MB. **Live version:** replace each row store with an
on-demand endpoint (e.g. fetch the 50 messages for the clicked user, not all 67k) + pagination. The
row `fields`/`legend` headers above are the exact column contract for those endpoints.

---

## 4. Gopher iQ — the "Gopher Brain" (embedded here)

Gopher iQ is a **knowledge + triage system** that lives inside the dashboard and feeds the customer
apps. It has an **authoring side (this dashboard)** and a **consumption side (the public app search
pill)**. The dashboard is where terms are curated, triaged, and promoted; the apps only consume.

### 4.1 The stores (each becomes a DB table) — `iq_core_manifest.json` lists all + exposure tier
| Store | Domain | Records | Exposure |
|---|---|---|---|
| `iq_routing.json` | 8 service categories + keyword vocab (phrases/tokens/hints/pwords) + scoring tunables | 8 cats, ~1,481 routing words | **public** |
| `iq_request_behavior.json` | CTA links + per-category section anchors | 3 links + 8 anchors | **public** |
| `iq_pill.json` | pill brand tokens + `.ai-bar` CSS | 8 tokens + 1 CSS block | **public** |
| `iq_faq.json` | FAQ corpus (Customers 40 / Workers 28 / Support 60 / Businesses 54) | 182 | **public** |
| `moderation_rules.json` | 11 policies (severity + action) + trigger lexicon + tuning | 11 policies, ~3,613 phrases, 219 benign, 29 excluded-regulated | **internal** |
| `inapp_keywords.json` | alert policy keywords | — | **internal** |
| `pricing_parity.json` | pricing truth + client/backend parity | — | **restricted** |
| `zip_dma_crosswalk.json` | ZIP → DMA reference | — | **internal** |

**⚠️ Exposure boundary (must preserve):** only `public` stores may reach the customer-app engine.
`build_iq.py` enforces this — it loads public stores only and **refuses to write** (`sys.exit(3)`) if
any high-severity moderation phrase leaks into the public output. Never expose `moderation_rules.json`
publicly.

### 4.2 How it's embedded / how the portal works
- `build.py` bakes a compact index `metrics._iqcore` = `{routing:{slugs, word2slugs}, moderation:{policies,
  term2policies}}` (log line: `baked _iqcore: routing words 1481 | moderation policies 11 terms 51`).
- **Tools → Gopher iQ** (`app_part5_iq.js`) reads `M._iqcore` (no backend call) and runs a **pure**
  `iqTriage()`: upload a `.txt`/`.csv` of terms → pick domain (routing/moderation) + bucket → get a
  **verdict** (Recognized / Partial-collision / New), KPIs, and a per-term table. Owner-only view.

### 4.3 The write path (propose → promote) — the human gate
1. Portal → **Export proposals JSON** (or stage in localStorage).
2. `python3 ingest_iq_proposals.py` → accumulates into `iq_proposed.json` (**staging only**, never
   touches active stores).
3. `python3 promote_iq.py` (dry-run) → shows exactly what would change.
4. `python3 promote_iq.py --apply` → appends new routing terms to a category's `pwords` / new moderation
   terms to `moderation_rules.json`. **Collision-guarded** (a term owned by another category is held
   unless `--force`), **additive only**, **backs up every store** (`.bak-<ts>`) before writing.
5. Refresh → the change bakes into **both** the dashboard and the public engine.

### 4.4 Relationship to the customer-app engine (consumption side)
The public search pill in the apps is `Final/gopher-ai-engine.js` (+ `gopher-iq-data.js` location
coverage). It is **generated from the public iQ stores** by `build_iq.py`. Editing a keyword/link/pill in
a store → refresh → the public engine regenerates with the change (verified end-to-end in
`PLACEMENT_STEP2.md`). Propagation into the 4 live pages follows `Final/GOPHER_IQ_UPDATE_KIT.md`.
**Direction:** dashboard = author/curate/govern; apps = consume. Keep it one-way.

### 4.5 Moderation ↔ in-app messaging (ties to **G40-35**)
`moderation_rules.json` (11 policies / ~3,613 phrases, sourced from
`Gopher_Moderation_ML_Import_Package.xlsx`) is the **real, server-side source of truth** for message
moderation. The client-side guard shipped in **G40-35** (`Final/assets/js/gopher-message-guard.js`,
prototype pattern list) is the front-end deterrent; the production `POST /messages/precheck` in that
ticket should read its verdict from **this** lexicon. Wire them together — don't maintain two lists.
Moderator decisions in **Message Alerts** persist to `alert_learnings.json` (247 decisions) and are the
calibration feedback for iQ.

---

## 5. Where to plug in (the DB-backed build)

The dashboard is already decomposed exactly along query lines — you are re-pointing existing transforms
at the DB, not reverse-engineering a monolith.

- **Read path:** for each `metrics.json` block, the producing `regen_*.py` (see §2 table) is the exact
  aggregation. Either (a) run the pipeline on a schedule against fresh CSV exports (fastest), or (b)
  re-implement each block as a SQL query / endpoint. The row-store `fields`/`legend` in §3 are the column
  contracts; **add pagination** for `orders_full`, `users_sample`, `_allmsgs` (never ship 135k users).
- **iQ triage:** `iqTriage()` is pure and can move server-side unchanged; the portal reads a baked index
  today and can instead call a read endpoint.
- **iQ promote:** `ingest_iq_proposals.py` + `promote_iq.py` logic becomes a server-side, owner-only
  promotion endpoint (keep the collision-guard + backup semantics).
- **Regeneration trigger:** on store write (promote) and/or on schedule → regenerate the public engine
  and republish; preserve the `build_iq.py` exposure guard.

---

## 6. Backend seams / write-back features (currently prototype)

| Feature | Where | Today | Wire to |
|---|---|---|---|
| **Moderation actions** (Safe/Ignore/Warning/Deactivate) | `app_part4.js` `action(id,act)` — `BACKEND SEAM` / `BACKEND INTEGRATION (PLANNED)` | records to `localStorage` + `alert_learnings.json` | endpoint needs message id (`f.id`), user id (`alertUserId(f,name)`), action, message body. **Warning** → increment server warning count + escalating notice (#1 reminder → #2 formal → #3 final → #4+ auto-deactivate); **Deactivate** → disable account via admin API + email; **Safe/Ignore** → record only. (Same escalation model as G40-35.) |
| **iQ promote** | `promote_iq.py` | local script | owner-only POST endpoint (§4.3/§5) |
| **Pricing Control** | Tools → Pricing (`pricing_parity.json`) | on-device + export | POST to backend; `pricing_parity` is `restricted` exposure |
| **Promo codes** | dashboard | prototype | real endpoint |

---

## 7. Auth, PII, hosting (non-negotiable before any networked deploy)

- **Auth/access control is mandatory** — the data includes real PII (names, emails, phones, DOB, ZIPs).
  There is **no login today**. Because this **replaces the Admin Panel**, host it behind the **existing
  admin authentication** (same identity/roles as the Admin Panel it replaces) against the production DB
  (or a read replica for the heavy analytics).
- The Gopher iQ portal and all write-backs are **owner-only** — enforce server-side, not just the
  client `ROLE==='owner'` check.
- The 70 MB "everything embedded" model is for the serverless snapshot only; the live build is a few
  hundred KB of code + lazy-loaded, paginated data.

---

## 8. ✅ DONE vs 🔧 TO-BUILD

**✅ Built & working (no redesign needed):**
- Full dashboard UI + all ~30 views + reporting structure; real production data via `gopher_pull.py`.
- The refresh/build pipeline, the `metrics.json` data model, row encodings, locked GMV/definitions.
- Gopher iQ: all stores, the triage portal, the propose→promote write path, the public-engine
  regeneration with exposure guard.
- Moderation lexicon (11 policies / ~3,613 phrases) + alert-learnings persistence.

**🔧 To build (developer / backend — engineering, no product decisions left):**
- DB-backed serving of each view (re-point transforms; paginate the 3 row stores) — §5.
- Admin auth + retire the old Admin Panel — §7.
- Write-back endpoints: moderation `action()`, iQ promote, pricing/promo — §6.
- Real-time model per §9; connect `moderation_rules.json` to the G40-35 `POST /messages/precheck`.
- Automate a working Invites CSV endpoint (only dataset still manual).

## 9. Real-time model (recommended)
End state = **live, DB-backed** (the ticket asks for real time). Pragmatic sequence:
1. **Phase 1 (fast):** run the existing pipeline on a server on a schedule, host behind admin auth →
   always-current snapshot with a freshness stamp. Ships value immediately, zero redesign.
2. **Phase 2 (real-time):** replace the embedded row stores with live queries/endpoints + pagination
   (transforms already defined in §2/§5). Per-order live status stays the admin source of truth.

## 10. Reference docs (in `Documentation/Dashboard/`)
`README_START_HERE.md` (iQ portal quickstart) · `GOPHER_HQ_STATE.md` (live-data system, endpoint map,
GMV, fixes) · `NOTES_backend_activation.md` (3 activation paths + must-dos) · `PLACEMENT_STEP2/3.md` (iQ
build loop + triage portal) · `GOPHER_HQ_STATE_addendum_moderation.md` (alert learnings + backend seam)
· `refresh_config.json` (dataset map + pipeline) · `iq_core_manifest.json` (store exposure tiers).
Public engine: `Final/gopher-ai-engine.js`, `Final/GOPHER_IQ_UPDATE_KIT.md`. Related ticket: **G40-35**
(in-app messaging guard — consumes this moderation lexicon).
