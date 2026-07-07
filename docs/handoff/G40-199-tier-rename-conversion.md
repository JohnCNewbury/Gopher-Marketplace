# G40-199 — Gopher Worker-Tier Rename: Developer Conversion Guide

**Canonical ticket:** G40-199 — "GOPHER Pro/Pro+ Rebranding To Gopher Elite"
**Author of this handoff:** prepared for the incoming production developer
**Status:** ready to execute. One product decision is still open (see [§9](#9-open-decisions)).

> **Read this first.** This is a **rename + one-new-tier** change, not a data migration.
> The tier is stored everywhere as an **integer** (`gopher_type_id`); every "Gopher Pro"
> / "Gopher Pro+" you see in the UI is a **display label** computed from that integer. So
> ~95% of the work is swapping label strings, plus adding **one new tier** (`id = 3`) and
> giving admins a way to set it manually. **No destructive DB migration is required.**

---

## 1. The new taxonomy

| `gopher_type_id` | OLD label (today) | NEW label (after G40-199) | Who verifies it | Cost |
|:---:|---|---|---|---|
| `0` | Standard | **Standard** (unchanged) | — | Free |
| `1` | Gopher Pro | **Gopher Elite** | Yardstik (background check) | $35 one-time |
| `2` | Gopher Pro+ / "Pro Plus" | **Gopher Elite+** | Yardstik (enhanced BG + DMV) | $50 one-time |
| `3` **(NEW)** | *(did not exist)* | **Gopher Pro** | **Gopher, internally** (license + insurance credentialing) | Free / internal |

### The one gotcha that will bite you

**"Pro" is being reused for a different tier.** The word "Pro" in *legacy* code/tickets
means **`id = 1` → now Elite**. The word "Pro" in the *new* taxonomy is a **brand-new
`id = 3`** tier for accredited, licensed-and-insured professionals.

- ✅ Legacy `gopher_type_id === 1` → rename its label to **Elite**.
- ✅ Legacy `gopher_type_id === 2` → rename its label to **Elite+**.
- ✅ New **Pro** = **`gopher_type_id = 3`**. **Never** reuse `id = 1` for it.
- ⚠️ When you see any `=== 1` / `=== 2` conditional, it is a *tier gate*, not a label — leave
  the integer logic alone; only change the strings it prints.

`id = 3` as "new Pro" is already the established convention (email program G40-305 maps
`gopher_type_id` 3 → new Pro; broadcast cadence G40-44 puts new Pro in Tier‑2 alongside
Elite/Elite+).

---

## 2. The tier-up flow and the domains to update

### How it works today (unchanged in intent)

A **Standard** gopher who wants to tier up taps a prompt **inside the Gopher Go app**,
which opens a **gophergo.io marketing page** that hands off to **Yardstik** for the
background check. Yardstik clearing the check does **not** auto-set the tier — an admin
sets `gopher_type_id` manually afterward (see [§5](#5-backend-gopher-backend-api)). **This
stays a manual process.**

### From → To

| | Current ("from") | New ("to") |
|---|---|---|
| **In-app tier-up link** | `https://gophergo.io/become-a-gopher/gopher-pro/#reg-form` | the new **tiers page** (prototype: `Final/gopher-tiers.html`) — production URL is the open decision in §9 |
| **Secondary "learn more" link** | `https://www.gophergo.io/become-a-gopher-pro/` | same new tiers page |
| **Tiers page → Yardstik hand-off** | *(new)* | `Final/gopher-tiers.html:1065` intentionally still points at `…/become-a-gopher/gopher-pro/#reg-form` because that is where Yardstik's embedded reg-form lives. Keep until Yardstik's portal path is updated. |

### The new page

`Final/gopher-tiers.html` **replaces** the old become-a-gopher signup page. It already uses
the correct new names (Elite / Elite+ / Pro) and includes a deliberate user-facing note that
**Yardstik's portal still shows the legacy names** (`gopher-tiers.html:1062-1063`). Do **not**
"fix" that note — it is correct until Yardstik updates their side (see [§8](#8-yardstik-coordination)).

### In-app links to repoint (legacy apps)

| App | File:line | Current URL |
|---|---|---|
| Worker (Gopher Go) | `src/component/getOrders.js:958` | `…/become-a-gopher/gopher-pro/#reg-form` |
| Requester | `src/component/getOrders.js:787` | `…/become-a-gopher/gopher-pro/#reg-form` |
| Worker | `src/component/gopherPro.js:113` | `https://www.gophergo.io/become-a-gopher-pro/` |
| Requester | `src/component/gopherPro.js:113` | `https://www.gophergo.io/become-a-gopher-pro/` |

---

## 3. Where everything lives — repo map

Six surfaces carry tier names or tier logic. Full file:line lists follow in §4–§7.

| # | Surface | Repo / location | Role in the rename |
|---|---|---|---|
| A | **Marketing + web prototype** | `Final/` (GitHub `Gopher-Marketplace`) | Public tiers page + stale labels in `gopher-go.html` |
| B | **Backend API** | `gopher-backend-api` | Source of truth: enum, SQL label CASEs, admin tier-set endpoint, confirmation emails |
| C | **Admin frontend** | `gopher-admin-frontend` | "Change Gopher Type" control + dropdown labels |
| D | **Worker app** | `gopher-mobile-gopher` | ~40 tier display strings + tier-up links |
| E | **Requester app** | `gopher-mobile-request` | ~40 tier display strings + tier-up links |
| F | **HQ Dashboard** | `Documentation/Dashboard/` | New internal console (replaces Active Admin). Already display-maps Pro→Elite. Now gets manual tier-set UI. |
| G | **Database** | `gopher-db` | `users_roles.gopher_type_id` + `gopher_type_updated_on` |

> **Old-app code access:** the legacy apps are GitLab exports (`.tar` → `project.bundle` →
> `git clone`) in `Documentation/GitLab Repos/`. Paths in §5–§7 are relative to each cloned
> repo root.

---

## 4. A — Marketing / web prototype (`Final/`)

| File:line | Current text | Action |
|---|---|---|
| `gopher-tiers.html` (whole page) | Elite / Elite+ / Pro | ✅ Already correct — this is the canonical new page. |
| `gopher-tiers.html:1062-1063` | "Yardstik's portal still shows … 'Gopher Pro' is now Elite ($35) …" | ✅ Keep as-is (intentional migration note). |
| `gopher-tiers.html:1065` | Yardstik CTA → `…/become-a-gopher/gopher-pro/#reg-form` | Keep until Yardstik path changes (§2). |
| `gopher-go.html:1323` | `alt="Gopher Pro"` — the "gopher **pro** / Documented Professional" badge | ✅ **Correct — this is the NEW Pro tier.** Leave. |
| `gopher-go.html:2577` | identity-panel badge "Gopher Pro ✓ Verified" (green `pro` badge) | ✅ **Correct — NEW Pro credential, verified.** Leave. |
| `gopher-go.html:2611, 2616` | "…business details & documents / these docs determine your **Gopher Pro** eligibility" | ✅ **Correct — business/insurance docs → NEW Pro** (licensed professional). Leave. |
| `gopher-go.html:2676` | work travel-radius `workTierName` (static fallback "Gopher Pro"; toggle "Elite / Pro view") | ✅ **Correct — NEW Pro.** Value is JS-driven; static text is just a demo default. |
| `gopher-request.html:1652` | dev comment: "real ladder is Elite/Elite+/Pro" | ✅ Already correct (metadata). |
| `gopher-request.html:11656` | "look for a **Gopher Pro**" (licensed work) | ✅ Correct — refers to the **new** Pro tier. |
| `gopher-request.html:14511` | JS fallback name `'Gopher Pro'` | Review data flow; likely a provider-name default, not a tier. |

> **Verified 2026-07-06 (visual pass):** every "Gopher Pro" string in `gopher-go.html` is the
> **new** Pro tier — the page was authored with the rename already in mind and uses the green
> `pro` / "Documented Professional" badge consistently, with the Elite/Elite+ tiers named
> correctly (TrustShield card body: "With Gopher **Elite**, **Elite+**, and **Pro** tiers…").
> **No relabeling of `gopher-go.html` is required.** The only legacy "Pro"/"Pro+" left in the
> web prototype is the data-driven backend feed, not authored copy.

Reference docs already carrying the spec: `docs/G40-phase1-handoff.csv:5107-5113` (the
canonical G40-199 statement) and `docs/handoff/G40-103-hq-dashboard-user-fields-db-map.md:63`.

---

## 5. B — Backend (`gopher-backend-api`)

**This is the source of truth. Change it first.**

### Enum
- `constants/index.js:166-170`
  ```js
  exports.GOPHER_TYPE = { STANDARD: 0, PRO: 1, PRO_PLUS: 2 };
  ```
  → rename keys to `ELITE: 1, ELITE_PLUS: 2` (or keep keys, but **add** `PRO: 3` for the new
  tier). Whichever you choose, **document that `1 = Elite`, `2 = Elite+`, `3 = new Pro`.**

### Human-readable label CASE statements
- `controllers/admin/user.js:906-908` — export query: `0→'Standard' 1→'Pro' 2→'Pro+'` → `Elite`/`Elite+`; add `3→'Pro'`.
- `controllers/admin/inbox_message.js:592` — `1→'Gopher Pro' 2→'Gopher Pro+' else 'Standard'` → Elite/Elite+; add `3→'Gopher Pro'`.

### Manual tier-set endpoint (the "manual process")
- `controllers/admin/user.js:1013-1049` — `set_gopher_type()` (`POST /admin/user/setgophertype`).
  - Updates `users_roles.gopher_type_id` + stamps `gopher_type_updated_on`.
  - Sends confirmation email **15** when `id === 1`, **16** when `id === 2` (line ~1032).
  - Log strings at ~1036-1037: `'Gopher Pro'` / `'Gopher Pro+'` → Elite / Elite+.
  - **Add `id === 3` handling** (email + log) for the new Pro tier.

### Confirmation emails
- `lib/sendEmail.js:42-43` — template map:
  `15: 'bocome-gopher-pro.ejs'` (Pro), `16: 'become-gopehr-proplus.ejs'` (Pro+).
  Update copy inside those `.ejs` files to Elite / Elite+ (filenames can stay or be renamed —
  they're referenced only by these ids). Add a template for the new Pro tier if §9 says so.

### Models / schema
- `models/users_roles.model.js:44-46` — `gopher_type_id INTEGER`.
- `models/users_roles.model.js:59-61` — `gopher_type_updated_on TIMESTAMP` (already tracks changes).
- `models/pending_notification.modal.js:30-32` — `gopher_type INTEGER`.
- `config/db.config.js:124` — `ALTER TABLE users_roles ADD COLUMN IF NOT EXISTS gopher_type_updated_on timestamp;`

### Yardstik / background check — important nuance
The live integration is **iDenfy/TrustShield** (`lib/idenfy_trustshield.js`,
`controllers/user/trustshield.js`), reached via routes in `controllers/user/index.js:283-302`.
On approval the webhook (`verify_idenfy_hook`, ~`trustshield.js:159-198`) only sets
`trust_shield_verified = true`. **It does not set `gopher_type_id`.** So tiering is already a
**manual admin action** today — consistent with the product decision to keep it manual. If a
future ticket wants Yardstik/BG completion to auto-upgrade tier, that new logic goes in this
webhook; it is **out of scope** for G40-199.

---

## 6. C — Admin frontend (`gopher-admin-frontend`)

`src/containers/DetailedView/components/UserView.js`:

| Line | What | Action |
|---|---|---|
| `368-372` | `groferTypeArr = [{0,'Standard'},{1,'Gopher Pro'},{2,'Gopher Pro Plus'}]` | → Elite / Elite+; **add `{3,'Gopher Pro'}`**. |
| `721-722` | display labels `'Gopher Pro' : 'Gopher Pro +'` | → Elite / Elite+ (+ handle 3). |
| `140-156` | `onSaveForm` validates `subcriptype == 0/1/2` | **add `== 3`** so the new tier can be saved. |
| `923-934` | **"Change Gopher Type"** button (gopher-only) | Rename to **"Change Gopher Tier"** if desired. |
| `936-943` | **"View User's JSON Version"** button | **Remove** (per product: no longer needed). |
| `944-952` | **"Gopher Settings"** button | This is the per-user settings (OOA Subscribe toggle) — the "Gopher Notifications" equivalent. |
| `977-1005` | tier-change modal | Uses `groferTypeArr` → picks up new labels automatically. |

API glue:
- `src/queries/user.queries.js:61-68` — `setUserGoferType()` posts `{user_id, gopher_type_id}`.
- `src/constants/url.js:15` — `postUserGoferTypeUpdate: '/admin/user/setgophertype'`.

> Note: the HQ Dashboard (surface F) is the **intended replacement** for this Active Admin
> panel (G40-70). The manual-tier UI has been prototyped there this session (see §7 / the
> dashboard build note). If the HQ Dashboard is the go-forward admin, treat these Active-Admin
> edits as the interim/parity path.

---

## 7. D+E — Mobile apps & F — HQ Dashboard

### Worker app (`gopher-mobile-gopher`) and Requester app (`gopher-mobile-request`)

Both apps display tier the same way, from `gopher_type_id` (0/1/2). There is **no string
constants file** — labels are hardcoded in ~40 conditionals per app. Highest-value sites:

| File (both apps unless noted) | Lines | What shows |
|---|---|---|
| `src/component/getOrders.js` | worker 923/961, req 752/790 | "This section is for Gopher Pros" gate + tier-up link |
| `src/component/gopherPro.js` | 53, 99, 108, 113 | become-a-Pro modal copy + link |
| `src/component/fav_gropher_list.js` | 75-79 | `Gopher Pro / Pro+` profile header |
| `src/component/InAppMessage.js` | worker 422-439 | `Gopher Pro+ / Gopher Pro` message header |
| `src/component/parentMenuButton.js` | worker 239 / req 224 | "Gopher Pro+ Verified" badge |
| `src/component/rating.js` | 140-142 | Pro / Pro+ badge **icons** (asset swap too) |
| `src/component/layoutComponent/CustomPullOver.js` | 570-589 | "Pro " / "Pro+ " name prefix on offer cards |
| `src/component/inbox.js` | 466-470, 662-665 | thread headers |
| `src/component/ordercard.js` | worker 7656/7714/8315 | cancellation-policy copy "(unless you're a Gopher Pro)" |
| `src/component/requestOrder.js` (req) | 919 | Pro+ prefix |
| `src/component/fav_gropher_details.js` (req) | 113-315 | tier info incl. `gopher_type_updated_on` |

**Recommended approach for the rebuild:** introduce a single tier-label helper
(`tierLabel(gopher_type_id)` → 'Standard' | 'Elite' | 'Elite+' | 'Pro') and its badge-icon
map, then replace the ~40 inline ternaries with it. Do the same for the two apps.

Icon assets referenced today: `gopher_pro_icon@3x.png`, `Icons.pro_batch`, `Icons.pro_plus_batch`
— add a new-Pro badge asset and keep Elite/Elite+ pointing at the existing "pro/pro+" art
(or supply new art) per design.

### HQ Dashboard (`Documentation/Dashboard/`)

Already partly migrated for **display**:
- `app_part4.js:1929` — `_tierName(t)` maps `'Pro'→'Elite'`, `'Pro+'→'Elite+'`. Used on the
  user page badge + Gopher-details card.
- `app_part2.js:216-244` — supply funnel already prints **Elite / Elite+** and earmarks a
  "Pro · data at launch" slot (`:243`) for the new tier.
- `app_part3.js:268-274` — the Gopher-tiers KPI still keys off `M.gopher_type` with raw
  `'Standard' / 'Pro' / 'Pro+'` (the metrics feed). When the data feed adopts the new tier
  names/`id=3`, update these keys and the `_tierName` map together.
- `app_part2.js:563-565` — iQ natural-language tier filter (`\bpro\b`, `\bpro plus\b`).

Underlying per-user field: `user.gopherType` (string `'—'|'Standard'|'Pro'|'Pro+'`), parsed
from `M.users_sample` in `app_part2.js`. Source feed: `metrics.json → M.gopher_type`.

**New this session:** the user-detail page (`renderUserPage`, `app_part4.js`) now has a
manual **Change Gopher Tier** control (Standard / Elite / Elite+ / Pro), plus **Edit /
Deactivate / Delete / Gopher Notifications** actions and a per-user **change log** — see the
dashboard build note in `docs/handoff` and rebuild with `python3 build.py`. In the prototype
these mutate the in-memory record + a `localStorage` change log; the production wiring is the
`POST /admin/user/setgophertype` endpoint in §5 plus equivalent edit/deactivate/delete/notify
endpoints.

---

## 8. Yardstik coordination

Yardstik manages **only the two background-check tiers**. Ask Yardstik to update:

| Yardstik package (current name) | Rename to | Price |
|---|---|---|
| "Gopher Pro" | **Gopher Elite** | $35 |
| "Gopher Pro+" | **Gopher Elite+** | $50 |

- **Do not** ask Yardstik to add "Pro" — the **new Pro tier is credentialed internally by
  Gopher** (license + insurance), not through Yardstik.
- Until Yardstik updates their portal, the user-facing note on `gopher-tiers.html:1062-1063`
  keeps requesters/gophers from being confused by the legacy names. Remove that note only
  after Yardstik confirms the portal is renamed.

---

## 9. Open decisions

1. **Production URL for the new tiers page.** `Final/gopher-tiers.html` is the prototype. What
   production URL replaces `gophergo.io/become-a-gopher/gopher-pro/`? Options: (a) publish the
   new page **at** that same path (cleanest — no in-app link change needed, and existing
   inbound links keep working); (b) new path (e.g. `/tiers` or `/become-a-gopher/`) **+** a
   301 redirect from the old path, **+** repoint the four in-app links in §2. **Recommend (a)**
   if the CMS allows replacing that page's content in place.
2. **New-Pro confirmation email.** Should promoting a gopher to the new **Pro** tier
   (`id = 3`) send its own confirmation email (a new template), or none? (Elite/Elite+ reuse
   templates 15/16.)
3. **Enum key style.** Rename `GOPHER_TYPE.PRO/PRO_PLUS` → `ELITE/ELITE_PLUS` (clearer, but a
   wider code churn) vs. keep the keys and just add `PRO_NEW: 3` (smaller diff, but the key
   `PRO` then means Elite — confusing). **Recommend rename** for long-term clarity.

---

## 10. Suggested execution order

1. **Backend** — enum + add `id = 3`; label CASEs; `set_gopher_type` email/log for `id = 3`;
   confirmation-email copy. (Source of truth; everything else displays from here.)
2. **Admin / HQ Dashboard** — dropdown labels + add tier 3; remove "View User's JSON"; wire
   Change Gopher Tier to `/admin/user/setgophertype`.
3. **Mobile apps** — add `tierLabel()` helper + badge map; replace inline strings; repoint the
   tier-up links per §9 decision.
4. **Marketing** — resolve §9-1; fix `gopher-go.html` stale labels; publish `gopher-tiers.html`.
5. **Yardstik** — request the Elite / Elite+ package renames; later remove the §8 note.

**No DB migration needed** — `gopher_type_id` already holds `3`; `gopher_type_updated_on`
already exists.
