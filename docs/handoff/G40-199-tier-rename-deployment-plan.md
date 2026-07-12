# G40-199 — Tier Rename Deployment Plan (Developer Task #1)

**Ticket:** [G40-199](https://gopherapp.atlassian.net/browse/G40-199) — "Gopher GO - GOPHER Pro/Pro+ Rebranding To Gopher Elite" (In Progress, assignee John Newbury)
**Prepared:** 2026-07-12 · full-tree discovery re-verified against the June-2026 GitLab exports, the `Final/` prototype tree, the HQ Dashboard, and the entire `/Documentation` folder.
**Companion doc:** [G40-199-tier-rename-conversion.md](G40-199-tier-rename-conversion.md) (2026-07-06) — the deep per-file conversion guide. This plan supersedes its inventory where the two differ (§10 lists the corrections) and adds the surfaces it missed.

---

## 1. What this task is

Effective the Gopher Connect launch:

| `gopher_type_id` | Today | After G40-199 | Verified by | Cost |
|:---:|---|---|---|---|
| `0` | Standard | **Standard** (unchanged) | — | Free |
| `1` | Gopher Pro | **Gopher Elite** | Yardstik background check | $35 one-time |
| `2` | Gopher Pro+ | **Gopher Elite+** | Yardstik enhanced BG + DMV | $50 one-time |
| — | *(new)* | **Gopher Pro** — licensed/bonded/insured, credentialed internally by Gopher | Gopher, internally | Free |

- **All existing Pro / Pro+ workers are grandfathered** into Elite / Elite+ (ticket text). No re-verification, no user action, no fee. Functionally this is a **name + logo change** — the tier is stored as an integer everywhere; every "Gopher Pro"/"Pro+" on screen is a display label.
- **The word "Pro" is being reused** for the new accredited-professional tier. This is the single hazard of the whole task — see §2.
- **Out of scope for this task** (explicitly, per owner): the in-app credential-submission feature for the new Pro tier (mentioned in the G40-199 ticket — a separate build), the Deals/"Local Pro Deals" product, and any behavior change. **No tier-gating logic changes** — only the strings and art those gates print.

## 2. The cardinal rule: rename by identity, never by string

(From `Gopher — Intended/Gopher-Legacy-Naming-Migration-Work-Order.md` — read it before starting.)

- Legacy `Pro` (the $35 Yardstik tier, `gopher_type_id === 1`) → **Elite**. Legacy `Pro+` (`=== 2`) → **Elite+**.
- **Never regex the bare token "Pro" across a codebase, database, or doc tree.** It substring-matches `Profile`, `Product`, `prohibited-list`, `gopher-prod` (AWS instance names), `Pro Forma`, `Proud` — and, fatally, the **new Pro tier's own copy**, which must survive untouched.
- Any `=== 1` / `=== 2` conditional is a *tier gate*, not a label. Leave the integers alone; change only the strings/art they print.
- Sequencing rule: rename the legacy values **first** (freeing the token), introduce new-Pro meaning **second** — never let the two meanings of "Pro" coexist in the same field.

### Known false-positive patterns (calibrate every grep against these)
`Gopher Profile`, `gopher-prohibited-list.html` (footer link on ~all email templates + ToS), `gopher-prod`/`gopher-production`(AWS RDS), `[data-gopher-profile]`, `openGopherProfileModal`, `.gopher-prof-card`, `Pro Forma`, `Proud`/`proof`, `ProfilePic`, `protag`-style *asset* names (those ARE tier art — see §8), and base64 image payloads that happen to contain "Pro+".

## 3. ⚠️ One data-model conflict to resolve BEFORE dev start

Two documents model the **new Pro tier** differently:

| Model | Source | Shape |
|---|---|---|
| **A — stacking credential** | `Gopher-Legacy-Naming-Migration-Work-Order.md` (D-015, June 12) + `gopher-db-tier-rename-D015.sql` | Pro is a **separate credential that stacks** on Elite/Elite+ (a worker can be Elite+ *and* Pro). Implemented as its own rolify `roles` row / flag — **never** a value in the tier enum. |
| **B — exclusive 4th tier** | [G40-199-tier-rename-conversion.md](G40-199-tier-rename-conversion.md) (July 6) + the G40-305 email program mapping | Pro = **`gopher_type_id = 3`**, mutually exclusive with Elite/Elite+. |

**✅ RESOLVED by owner, 2026-07-12: Model A — Pro is a separate, stacking credential.** John's ruling: Elite/Elite+ are criminal (and criminal+DMV) *background* verifications; Pro means the worker holds *professional credentials*. They are completely different verifications, so **a worker can be Elite AND Pro at the same time.** Implement per the D-015 work order: a separate rolify `roles` row (or dedicated flag), **never** a value in the tier enum, and **not** `gopher_type_id = 3`.

**Rework this decision implies (dev should be aware, not necessarily fix in this task):**
- **G40-305 email mapping** — its `gopher_type_id: 3 → new Pro` convention is now wrong; the new-Pro grant email (`gopher-email-tier-pro.html`) triggers off the credential grant, not a tier value.
- **HQ Dashboard tier picker** (`app_part4.js` "Update gopher tier": Standard/Elite/Elite+/Pro exclusive select) — Pro must become a separate toggle/credential control, not a 4th radio.
- **July-6 conversion guide** — read its `id = 3` sections as superseded by this plan.
- **Tiers page / ToS copy** — presents Elite, Elite+, and Pro side by side; that's fine as marketing ("badges"), but any copy implying you must *choose* Pro *instead of* Elite should be checked. The ToS already reads correctly (separate designation, annual re-verification).

## 4. Ready-made artifacts (start here — most of the work is already written)

All in `Documentation/Gopher — Intended/`:

| Artifact | What it does | Status |
|---|---|---|
| `Gopher-Legacy-Naming-Migration-Work-Order.md` | The migration methodology: identity-not-substring, expand/contract DB discipline, sequencing, guardrails | Read first |
| `gopher-db-tier-rename-D015.sql` | **Part 1** read-only diagnostic (exact stored spelling of tier role names, role IDs, blast-radius counts) + **Part 2** transactional rename of rolify `roles.name` values `Pro→Elite`, `Pro+→Elite+` | Schema-grounded (v1.1, June 13). Run Part 1 on prod first; edit Part 2 strings to match its output; snapshot before Part 2 |
| `tier-rename-gopher-backend-api.patch` | Backend label rename — 4 files: `controllers/admin/inbox_message.js` (~589), `controllers/admin/orders.js` (~875), `controllers/admin/user.js` (~904, ~1033), `controllers/order/emails.js` (~130) | Ready to apply **first**; completed by part-2 below |
| `tier-rename-gopher-backend-api-part2.patch` *(new 2026-07-12)* | Backend part 2 — D-3 enum key rename (`ELITE`/`ELITE_PLUS`; verified zero usage sites, so no churn), tier-email copy (templates 15/16 → Elite/Elite+), signup-confirmation copy + tier-up URLs → `https://gophergo.io/gopher-tiers/` (5 files, 16 lines) | Ready; apply **after** the patch above. Verified clean in sequence from the pristine June export. Subjects 15/16 ("Welcome to Gopher") intentionally untouched — owner call |
| `tier-rename-gopher-admin-frontend.patch` *(new 2026-07-12)* | **Admin frontend** — complete single patch: UserView tier picker + display ternary, Broadcast + Filter "Gopher Type" Tag columns, Filter tier checkboxes (3 files, 14 lines) | Ready; verified clean against `gopher-admin-frontend-main.zip` contents. `src/pro.png`/`pro_plus.png` badge art replaced in place (no code diff) |
| `tier-rename-gopher-mobile.patch` | **Worker app** display rename — 12 files (display-only) | Ready to apply **first**; completed by part-2 below |
| `tier-rename-gopher-mobile-part2.patch` *(new 2026-07-12)* | **Worker app part 2** — the 5 remaining label misses (requestOrder.js caption, more.json menu title) + all tier-up URLs repointed to `https://gophergo.io/gopher-tiers/` per D-2 | Ready; apply **after** the patch above. Verified: both apply cleanly in sequence from the pristine June export |
| `tier-rename-gopher-mobile-request.patch` *(new 2026-07-12)* | **Requester app** — complete single patch (12 files, 52 lines, labels + URLs), generated against the requester repo directly (its file variants differ from the worker app) | Ready; verified `git apply --check` clean from the pristine June export (f6557309) |

**DB truth (confirmed from the `gopher-db` export):** the tier *name* lives as row values in rolify `roles.name`; `users_roles.gopher_type_id` is a plain integer (0/1/2, default 0) that all app logic keys off; there is **no `gopher_types` lookup table**. So the DB "rename" is only the `roles.name` value update — the integers never change, which is what makes grandfathering automatic and zero-risk.

## 5. Surface B — Backend (`gopher-backend-api`)

All locations re-verified 2026-07-12 against the June-12 GitLab export. Items marked ➕ were **missed by the July-6 guide** and are additions.

| Location | What | Action |
|---|---|---|
| `constants/index.js:166-170` | `GOPHER_TYPE = {STANDARD: 0, PRO: 1, PRO_PLUS: 2}` | **D-3 resolved:** rename keys → `ELITE: 1, ELITE_PLUS: 2` (update every usage site). Do **not** add new-Pro here — per D-1 it is a separate credential, not a tier value |
| `controllers/admin/user.js:906-908` | CSV-export SQL CASE `'Standard'/'Pro'/'Pro+'` | → Elite/Elite+ (in patch) |
| `controllers/admin/user.js:1013-1049` | `set_gopher_type()` = `POST /admin/user/setgophertype` — the manual tiering endpoint. Sends email 15 (`id===1`) / 16 (`id===2`) at :1032, log strings `'Gopher Pro'/'Gopher Pro+'` at :1036, stamps `gopher_type_updated_on` at :1020 | Log strings → Elite/Elite+ (in patch). Email handling for new Pro per §3 decision |
| `controllers/admin/inbox_message.js:592` | CSV CASE `'Gopher Pro'/'Gopher Pro+'` | → Elite/Elite+ (in patch) |
| ➕ `controllers/admin/orders.js:878-879` | Second SQL label CASE in admin orders view | → Elite/Elite+ (in patch) |
| ➕ `controllers/order/emails.js:131-137` | Sets `gopher_type = 'Pro'/'Pro+'` into **customer-facing order-email** `mail_data` | → Elite/Elite+ (in patch) |
| `lib/sendEmail.js:42-43` | Template map `15: 'bocome-gopher-pro.ejs'`, `16: 'become-gopehr-proplus.ejs'` (filename typos are real, in-repo) | Update copy inside the templates; filenames may stay |
| ➕ `lib/sendEmail.js:196-201` | Subjects for 15/16 are both **"Welcome to Gopher"** | Optionally differentiate ("You're Gopher Elite now") — owner call |
| `views/bocome-gopher-pro.ejs:491,495,499` | "Congratulations on becoming a Gopher Pro!" + badge `<img>` → **S3 `assets/gopherpro.png`** (:481) | Copy → Elite; badge art → Elite art (S3 upload, §8) |
| `views/become-gopehr-proplus.ejs:491,481` | Same for Pro+ / S3 `gopher_pro.png` | Copy → Elite+; art → Elite+ |
| ➕ `views/confirmation-email.ejs:559` | Signup-confirmation email links `gophergo.io/become-a-gopher-pro/` | Repoint to the new tiers page (§9 / decision D-2) |
| ➕ `views/new-confirm-mail.ejs:681,702` | Links `gophergo.io/become-a-gopher/gopher-pro/` — **every signup confirmation carries this** | Same |
| ➕ `views/gopher-pro.ejs`, `views/gopher-pro-plus.ejs` | Orphaned templates, referenced nowhere | Ignore or delete |
| `controllers/user/trustshield.js` (91, 191, 343) | iDenfy/TrustShield webhook sets **only** `trust_shield_verified` — never the tier | **No change.** Confirms tiering stays a manual admin action |
| `models/users_roles.model.js:44,59` | `gopher_type_id`, `gopher_type_updated_on` | No change (audit column already exists) |

Push/SMS code carries **no tier strings** — the emails above are the only backend notification copy affected.

## 6. Surface C — Admin frontend (`gopher-admin-frontend`)

| Location | What | Action |
|---|---|---|
| `src/containers/DetailedView/components/UserView.js:368-372` | `groferTypeArr = [{0:'Standard'},{1:'Gopher Pro'},{2:'Gopher Pro Plus'}]` | → Elite / Elite+ (+ new Pro per §3) |
| `UserView.js:719-722` | Display ternary `'Gopher Pro' : 'Gopher Pro +'` | → Elite / Elite+ |
| `UserView.js:140-156` | `onSaveForm` validates `subcriptype == 0/1/2` | Extend only if §3 = model B |
| `UserView.js:474-500` (imports :25-26) | Badge images for `gopher_type_id == 1/2` from **`src/pro.png` / `src/pro_plus.png`** | Swap to Elite/Elite+ art (§8) |
| `UserView.js:923-934, 977-1005` | "Change Gopher Type" button + modal (uses `groferTypeArr`, picks up new labels automatically) | Optional label → "Change Gopher Tier" |
| ➕ `src/containers/Broadcast/index.js:250-265` | "Gopher Type" table column Tags `'Pro +'/'Pro'/'Standard'` (dup commented copy :159-171) | → Elite+/Elite |
| ➕ `src/containers/Filter/index.js:393-407` | Identical Tag column in user-filter table | → Elite+/Elite |
| `src/queries/user.queries.js:61-68`, `src/constants/url.js:15` | `setUserGoferType` → `/admin/user/setgophertype` | No change |

Note: the **HQ Dashboard** (`Documentation/Dashboard/`) is the intended replacement for this panel (G40-70) and already has an "Update tier" control posting to the same endpoint. Treat the Active-Admin edits above as the interim/parity path.

## 7. Surfaces D + E — Mobile apps

Verified counts (June-12 exports): **worker app 50 tier-string matches across 17 files; requester app 48 across 15 files.** All inside `src/` — nothing in `android/`/`ios/` native trees. `gopher_type_id` appears in ~18 more files per app as pure data plumbing (no visible strings) — rename-safe, don't touch.

**The worker patch (`tier-rename-gopher-mobile.patch`) covers 12 files:** `InAppMessage.js`, `fav_gropher.js`, `fav_gropher_details.js`, `fav_gropher_list.js`, `getOrders.js`, `gopherPro.js`, `CustomPullOver.js`, `RequestDetailPullOver.js`, `ordercard.js`, `parentMenuButton.js`, `json/gopher/account.json`, `pages/inbox.js`.

**✅ All string/URL work is now patch-covered (2026-07-12):** apply `tier-rename-gopher-mobile.patch` then `…-part2.patch` (worker), and `tier-rename-gopher-mobile-request.patch` (requester). The part-2/requester patches also repoint every tier-up URL to `https://gophergo.io/gopher-tiers/` per D-2: worker `account.json:113`, `more.json:117`, `gopherPro.js:113`, `getOrders.js:958`; requester `gopherPro.js:113`, `getOrders.js:787`.

**Deliberately NOT patched (nothing to change in code):**

| File | Why |
|---|---|
| `src/img/icons.js:65,105`, `src/component/rating.js:141`, `src/component/roundPhoto.js:77`, asset-path strings in `requestOrder.js`/`getOrders.js` | They reference badge **art by filename** (`pro_batch@3x.png`, `gopher_pro_icon.png`, …). Replace the art files **in place, keeping filenames** (§8) — zero code diff. Renaming the JS keys/filenames is optional polish |
| requester `src/json/requester/more.json:144` | "Become A Gopher" — the **general** worker-signup link, not the legacy gopher-pro page. Leave |

Notable user-facing copy covered by the patches: cancellation-policy "…unless you're a Gopher Pro" → Elite (`ordercard.js` ×3; `RequestDetailPullOver.js` ×2 per app), inbox/offer-card name prefixes, "Gopher Pro+ Verified" account badges.

## 8. The logo half of "name + logo change" — full art inventory

**Legacy Pro/Pro+ art to replace (or retire):**

| Where | Files |
|---|---|
| Both mobile apps, `public/assets_1/` | `pro_batch.png` (+@2x,@3x), `pro_status.png` (+@2x,@3x), `pro-icon.svg`, `pro_plus_batch.png` (+@2x,@3x), `pro-plus-icon.svg`, `gopher_toolbelt_pro.jpg` — 12 per app |
| Both mobile apps, `public/assets/` | `protag.png` (+ copy), `proTagBlue.png`, `proplustag.png` (+ copy), `proPlustagBlue.png`, `gopher_pro_icon.png` (+@2x,@3x), `gopher_pro_icon1.png` (+@2x,@3x), `gopher_toolbelt_pro.jpg` — 13 per app |
| Admin frontend | `src/pro.png`, `src/pro_plus.png` |
| **S3** (referenced by backend email EJS) | `assets/gopherpro.png`, `gopher_pro.png` (templates 15/16) **+ `assets/pro_icon.png`, `assets/pro_plus_icon.png`** (new-confirm-mail.ejs) — replace the objects **in place, keeping keys** (no code change; the part-2 patch already assumes this) |
| Brand source files | `Gopher Pitch Deck/assets/logos/Gopher 2.0 Logos/Gopher Pro Logo/` (12 files) + `Gopher Pro Plus/` (24 files, CMYK/Pantone/RGB) + `assets/brand/pro.png` |
| Inline base64 | `Gopher Go App (retired 6:29)/gopher-go-prototype.html` (`PRO_BADGE`/`PROLOGO`), `SMS:Emails/gopher-go.html` (`alt="Gopher Pro"` badge) |

**New art that already exists** (prototype tree, `Final/assets/img/`): `tier-elite.svg`, `tier-elite-plus.webp`, `tier-pro.svg`, `shared-gopher-elite.svg`, plus `_prototypes/Go/gopher-elite-logo.svg` and `gopher-pro-wordmark.svg`. Decision D-6: whether the retired Pro/Pro+ brand sets get archived or re-badged, and whether production apps get exports of the `tier-*.svg` art (recommended) or new deliverables from design.

**Naming trap — ✅ fixed 2026-07-12:** the new-Pro wordmark formerly misnamed `shared-gopher-elite-2.svg` is now **`Final/assets/img/shared-gopher-pro.svg`**; its 3 references (gopher-tiers.html:623, gopher-go.html:1344, gopher-go-101.html:706) were updated.

## 9. Surface A — Marketing site (gophergo.io) + Yardstik

- **`Final/gopher-tiers.html` is the ready replacement page** (Elite/Elite+/Pro, correct copy). **✅ D-2 resolved (2026-07-12): new path + 301.** Publish at **`https://gophergo.io/gopher-tiers/`** (the designated path; if marketing prefers a different slug, it's a one-grep change across the patches + email templates) with a 301 from `become-a-gopher/gopher-pro/` and from `become-a-gopher-pro/`. The 6 in-app URLs are already repointed in the §7 patches; the 3 email-template URLs (§5) are repointed in the backend part-2 patch.
- **⚠️ 301 sequencing constraint:** the old `become-a-gopher/gopher-pro/#reg-form` page **hosts Yardstik's embedded reg-form**. The 301 can only switch on after that form has a new home (embedded on the tiers page or Yardstik-hosted) — until then the old page keeps serving it, and the tiers page keeps its "Continue to Yardstik" CTA pointing there (`gopher-tiers.html:649`, intentional).
- The page's Yardstik note (:647 "Yardstik's signup portal still shows our legacy tier names…") and its CTA to `…/become-a-gopher/gopher-pro/#reg-form` (:649) are **intentional** — keep both until Yardstik updates their portal.
- **Yardstik:** request package renames "Gopher Pro"→"Gopher Elite" ($35), "Gopher Pro+"→"Gopher Elite+" ($50). Do **not** ask Yardstik to add "Pro" — new Pro is credentialed internally. Runs in parallel with everything else (display-side, decoupled). After Yardstik confirms, remove the tiers-page note.
- `gophergo.io/become-a-gopher-pro/` (the secondary marketing page) → redirect to the tiers page.
- ➕ **App-store listings:** review App Store / Play Store screenshots + descriptions for Pro/Pro+ mentions when the renamed app builds ship (not inventoried here — store copy isn't in the repos).

## 10. Web prototype (`Final/`) — remaining legacy items (owner's tree; John's consent required before edits)

Re-verified 2026-07-12. The July-6 guide's verdict stands — `gopher-go.html`'s "Gopher Pro" strings are all the NEW Pro tier (correct, leave) — but line numbers drifted after the G40-319/320 SEO/asset commits: the tiers-page Yardstik note is now **:647-649** (was ~1062), go.html badge **:1344**, identity panel **:2555**, business docs **:2589/2594**, tier fallback **:2654**, request.html "look for a Gopher Pro" **:11485**, provider-name fallback **:14501**.

Status after the 2026-07-12 owner-approved cleanup pass:

1. **FAQS corpus — ✅ FIXED.** All 9 legacy sentences (10× "Gopher Pro" + 3× "Pro+", old Yardstik meaning) renamed to Elite/Elite+ across all 7 Final surfaces (`index.html`, `gopher-services.html`, `2-engine-js-block.html`, `gopher-iq-sandbox-standalone.html`, `assets/js/gopher-ai-engine.js`, `gopher-request.html` [its drifted blob included], `gopher-faqs.html` rendered) **plus** `Dashboard/iq_faq.json` (the dashboard/public-engine source) — and the public engine was rebuilt via `build_iq.py` (exposure-guard clean) with `gopher-iq-engine.SAMPLE.html` refreshed. `const FAQS =` verified still exactly 1 single-line occurrence per copy. **Browser-verified:** the live iQ pill answers "Is there a fee to become a gopher?" with "…one-time fee to become a Gopher Elite or Gopher Elite+…". The FAQ page's new-Pro badge copy ("licensed, bonded, and/or insured") was left intact.
2. **Internal `'pro+'` key — reclassified, deliberately NOT changed.** Deeper audit showed `'pro+'` in gopher-request.html is an internal badge *slug meaning the NEW Pro tier* throughout the display layer (`tier==='pro+'` → the `tier-pro` chip; `tierLabel('pro+') → 'Pro'`; it's the default badge in seed data). Visible output is already correct new-taxonomy — this is a confusing key *name*, not wrong copy. Renaming it means refactoring the demo badge vocabulary (~dozens of seed workers + 10 render sites) for zero visual change: leave for the production rebuild, which should use clear keys (`standard`/`elite`/`elite+` + a `proCred` flag, as gopher-connect.html already does).
3. **`gopher-blog.html:611,622` — ✅ FIXED:** ladder now "Standard → Elite → Elite+" in both places (browser-verified).
4. **svg misnomer — ✅ FIXED** (§8: now `shared-gopher-pro.svg`).
5. Cosmetic, intentionally kept: ToS :403 "…as a Pro perk" phrasing; memorial "our 1st Gopher Pro at the time" (gopher-connect-101:623, gopher-request-101:484) is explicitly historical.

## 11. HQ Dashboard + Documentation-tree cleanup

**HQ Dashboard (`Documentation/Dashboard/`) — 3 rename bugs found 2026-07-12 and ✅ FIXED + rebuilt + browser-verified the same day** (cause: two rename passes collided — the JS mapped raw `Pro` keys at display time, then `regen_ou.py` renamed the data upstream, orphaning the readers). Fixes read the new `Elite`/`Elite+` keys and **tolerate the old `Pro`/`Pro+` keys as fallback**, so they're safe against either data vintage; `.pre-tierfix.bak` backups sit next to each edited file.

| Bug | Fix | Verified |
|---|---|---|
| Aggregate key mismatch (`app_part2.js:221-222`, `app_part3.js:268`, `app_part4.js:39` read `M.gopher_type.Pro/['Pro+']`) | Read `Elite/Elite+` with `Pro/Pro+` fallback | Users view: Elite **720 (1.2%)** / Elite+ **650 (1.1%)**; premium-supply KPI = **1,370** (all were 0) |
| iQ tier query dead (`app_part2.js:564-565` set `F.tier='Pro'/'Pro+'`) | Set `F.tier='Elite'/'Elite+'` | Messaging iQ "Elite+ gophers in NC" → Tier chip Elite+, **236 users** selected (was 0) |
| Order rows bypass rename (`regen_ou.py:224` bakes raw `GOPHER TYPE`; displayed at `app_part4.js:1884`, `:2081`) | `tier_label()` at bake **and** `_tierName()` at both display sites (idempotent) | Sample order with raw `Pro` renders **Elite** in the drill-down |

Rebuilt via `python3 build.py` → `output/Gopher_HQ_Dashboard.html` (78 MB, 2026-07-12 16:20).

**Documentation tree — legacy-copy stragglers, status after the 2026-07-12 pass** (everything else "Pro/Pro+" in the tree is intentional migration documentation or false positives):

- ✅ `Gopher — Intended/Gopher-Worker-Flow-Build-Spec.md` :44, :91 — **fixed** (Gopher Elite / Elite+; "Gopher Elites start on Instant")
- ✅ `Gopher — Intended/Gopher-Account-Ownership-Checklist.md` :104 **and** `Gopher-Account-Ownership-Tracker.xlsx` (Account Ownership!B22) — **fixed** ("Yardstik (Gopher Elite background checks)"). xlsx note: its 3 COUNTIF summary formulas lose their cached values until Excel next opens/recalcs the file (formulas intact)
- ✅ Pitch deck ×4 (`gopher-pitch-deck.html`, `-mobile.html`, `deck_work.html`, `mobile_work.html`) — testimonial now **"— Gopher Elite"** (D-7)
- `Gopher Go App (retired 6:29)/gopher-go-prototype.html` — 8 legacy hits + inline PRO badge — **left as-is** (retired app folder, historical)
- `SMS:Emails/gopher-go.html` — **reclassified, no change needed:** its base64 badge decodes to the NEW-Pro wordmark (byte-identical to `shared-gopher-pro.svg`), so `alt="Gopher Pro"` is correct
- `SMS:Emails/impl-tier-grants.md` — carries its own TODOs (legacy subject "You're a Gopher Pro now" for case 39; log strings) that the backend work in §5 resolves — left for the dev, as designed
- **Do NOT touch:** `SMS:Emails/gopher-email-tier-pro.html` (NEW Pro grant email — intentional), Jira-title dumps (`Jira Tickets/Gopher-Build-Console.html`, `Gopher-Jira-Reconciliation-Worksheet.xlsx` — renaming would desync from Jira), all "Elite/Elite+/Pro" three-tier lists, D-021's `elite_pros` audience enum (canonical, not legacy)

## 12. Decisions — resolved 2026-07-12 unless marked OPEN

| # | Decision | Status |
|---|---|---|
| D-1 | **New-Pro data model** (§3) | **✅ RESOLVED: stacking credential.** Elite/Elite+ = background verifications; Pro = professional credentials — different verifications, a worker can hold both. Separate rolify role/flag, never `gopher_type_id=3`. See §3 for the rework this implies |
| D-2 | **Production URL for the tiers page** | **✅ RESOLVED: new path + 301** → `https://gophergo.io/gopher-tiers/` (slug swappable in one grep). 301 from both legacy URLs **after** the Yardstik reg-form is rehomed (§9) |
| D-3 | **Backend enum key style** | **✅ RESOLVED: rename** `PRO/PRO_PLUS → ELITE/ELITE_PLUS` |
| D-4 | **Announcement to grandfathered workers** | **OPEN.** One-time "You're now Gopher Elite" email/push to existing id 1/2 holders? The 2026 email set (`SMS:Emails/gopher-email-tier-elite*.html`) is ready art for it. Recommend yes, timed with the app release |
| D-5 | **New-Pro grant email trigger** | **OPEN** (unblocked by D-1: trigger off the credential grant; `gopher-email-tier-pro.html` exists) |
| D-6 | **Old Pro/Pro+ logo sets** | **OPEN.** Archive the `Gopher 2.0 Logos/Gopher Pro*/` brand sets, or re-badge for the new Pro tier? Production Elite/Elite+ art source = `Final/assets/img/tier-*.svg` exports? |
| D-7 | Pitch-deck testimonial "— Gopher Pro" ×4 | **✅ RESOLVED:** change to **"— Gopher Elite"** (applied — see §11) |
| D-8 | `Gopher_Financials_and_Pro_Forma_Summary.xlsx` "Gopher Pro Rev" line | **OPEN.** Likely tier-fee revenue → "Elite Rev"; confirm it isn't new-Pro revenue |
| D-9 | RFP `Gopher-Package-Briefing.html:253` "Advertising & Gopher Pro Deals" | **OPEN.** Probably should read "Local Pro Deals" (new-Pro product); collides with the legacy tier name as written |
| D-10 | "Gopher Pro Shopper" program name (G40-191, modal tracker) | **OPEN.** Rename with the tier, or keep as a distinct program brand? (G40-191 is NOT-PHASE-I) |

## 13. Execution order & verification

**Order** (per the work order: DB → consumers → copy; Yardstik parallel):

1. ~~Resolve §12 decisions~~ **done for D-1/D-2/D-3/D-7 (2026-07-12)**; D-4/D-5/D-6/D-8/D-9/D-10 remain open but none block the rename.
2. **DB:** run SQL Part 1 diagnostic on prod (read-only) → snapshot → Part 2 rename of `roles.name` values, **in the same release window as step 3** (anything comparing literal `'Pro'`/`'Pro+'` strings breaks otherwise; the integer gates are unaffected).
3. **Backend:** apply `tier-rename-gopher-backend-api.patch`, then the §5 additions (EJS copy, subjects, confirmation-email URLs, S3 badge images, enum keys).
4. **Admin FE:** §6 (patch doesn't cover this repo — hand edits, small).
5. **Mobile:** apply the 3 patches (worker patch → worker part-2; requester single patch) — labels + URLs are fully covered; swap the 25-per-app art files in place (§8). Ship both app updates.
6. **Marketing + Yardstik:** publish tiers page per D-2; 301 `become-a-gopher-pro/`; Yardstik package renames (parallel); later remove the tiers-page legacy-names note.
7. **Comms:** D-4 announcement to grandfathered workers.
8. **Cleanup: ✅ done 2026-07-12** — §10 prototype items, §11 dashboard fixes, and the doc-tree stragglers are all resolved (see those sections). Remaining for the dev: update store listings when the renamed app builds ship.

**Verification checklist:**

- SQL: `Σ legacy = Σ canonical` row counts; `legacy_rows_remaining = 0`; spot-check known Pro/Pro+ workers now show Elite/Elite+ everywhere (app profile, admin, order emails).
- Service-Provider eligibility (D-020: Elite/Elite+/Pro · 20+ jobs · rating floor) computes identically pre/post.
- Broadcast cadence (G40-44) Tier-2 unchanged (it's id-based).
- `rg -n "Gopher Pro\b|Pro\+|Pro Plus"` over each repo returns only new-Pro copy and intentional migration notes (use §2's false-positive list).
- Emails 15/16 render Elite/Elite+ names + new badge art; signup-confirmation links resolve to the live tiers page.
- Yardstik portal shows Elite/Elite+ → remove the gopher-tiers.html note.

**Effort estimate:** the rename proper is ~2–4 dev-days (patches exist; the long tail is the two app-store releases and art swaps) + external coordination (Yardstik, S3, marketing CMS, store listings).
