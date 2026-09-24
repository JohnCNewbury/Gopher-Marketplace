# Gopher Worker Tiers — The Canonical Conversion Document

**Covers:** `Pro → Elite` · `Pro+ → Elite+` · the **new, different** `Pro` (a stacking credential)
**Ticket reference:** [G40-199](https://gopherapp.atlassian.net/browse/G40-199) — *"Gopher GO — GOPHER Pro/Pro+ Rebranding To Gopher Elite"*
**Status of this document:** canonical. This is the source of truth for the tier conversion; the ticket references it, never the reverse.
**Written:** 2026-08-10. Production state verified first-hand the same day — see §13 for exactly what was verified and how to re-verify it.

**Supersedes as the single entry point:**

| Document | Status now |
|---|---|
| `G40-199-tier-rename-deployment-plan.md` (2026-07-23) | Superseded by this doc. Still useful for its patch-generation history and its Jira/Dashboard cleanup receipts. **Its per-file line numbers are stale — see §5.** |
| `G40-199-tier-rename-conversion.md` (2026-07-06) | Superseded. Read its `gopher_type_id = 3` sections as **wrong** — that model was overruled on 2026-07-12 (§4). |
| `Gopher — Intended/Gopher-Legacy-Naming-Migration-Work-Order.md` | **Still authoritative** for migration *methodology* (identity-not-substring, expand/contract discipline, sequencing). Read it alongside this doc, not instead of it. |

---

## 1. ⛔ Read this before you change a single string

**The rename has NOT happened, and it must not happen yet.** Owner ruling, 2026-07-30, verbatim:

> *"It does exist. Pro is STILL in play. We have not launched yet. When the new gopher marketplace we've been working on launches, pro → elite does too."*

Neither predecessor document contains this ruling — both were written before it, and both read as *"apply these patches and ship."* **A developer following them today would rename live production copy and describe a tier that does not yet exist to people signing up right now.**

This is not hypothetical. It already happened once: on 2026-07-30 the Email Templates session's legacy-copy sweep (`43f4e8d0`) renamed "Gopher Pro" → "Gopher Elite" **in the live signup emails**. It was caught and reverted before the MR. It will recur, because a bare "Pro → Elite" note reads as universal.

### The two vocabularies — the operative rule

Every artifact in this project belongs to exactly one of these two sets. Decide which before editing it.

| | **Live production** | **Design / spec / prototype** |
|---|---|---|
| **Says** | Pro / Pro+ | Elite / Elite+ |
| **Serves** | today's users | the unlaunched product |
| **Includes** | the two mobile apps, `views/*.ejs` backend email templates, the admin panel, anything a current user or admin sees today | the Go canonical doc, the capability matrix, the 101 guides, `Final/`, the branded 2026 email set (`SMS:Emails/gopher-email-tier-*.html`) |
| **Rule** | **Do NOT "correct" these to Elite.** They are correct as written until launch. | Elite / Elite+ is correct here. A stray "Pro" meaning the *legacy tier* is a genuine bug. |

**The question to ask on every single edit:** *does this artifact serve today's users, or the unlaunched product?*

**Corollary for the rename release itself:** the whole conversion ships as **one coordinated release gated on the marketplace launch** — not incrementally. §12 gives the ordering.

---

## 2. The conversion at a glance

Three separate conversions travel under one ticket. Conflating them is the root of nearly every error in this area.

| `gopher_type_id` | Today (live) | After launch | Verified by | Cost | Who acts |
|:---:|---|---|---|---|---|
| `0` | Standard | **Standard** *(unchanged)* | — | Free | — |
| `1` | Gopher **Pro** | **Gopher Elite** | Yardstik criminal background check | $35 one-time | Nobody — automatic |
| `2` | Gopher **Pro+** | **Gopher Elite+** | Yardstik enhanced background + DMV/MVR | $50 one-time | Nobody — automatic |
| **n/a** | *(does not exist)* | **Gopher Pro** — licensed / bonded / insured | Gopher, internally | Free | Worker submits credentials |

### Conversion 1 & 2 — the rename (Pro → Elite, Pro+ → Elite+)

**Functionally a name-and-logo change, nothing more.** Every existing Pro/Pro+ worker is **grandfathered** into Elite/Elite+: no re-verification, no user action, no fee, no lapse in benefits.

**Why it is safe:** the tier is stored as a plain integer (`users_roles.gopher_type_id`) everywhere, and every "Gopher Pro"/"Pro+" on screen is a *display label* rendered from that integer. The integers never change. Grandfathering is therefore automatic — it is not a data migration, it is a relabelling.

**No behaviour changes with the rename.** Every tier gate keeps its integer comparison. Counter-offer caps, broadcast cadence, radius unlocks, Connect/Deals eligibility — all identical before and after.

### Conversion 3 — the new Pro (the actual hazard)

**The word "Pro" is being reused for something different.** This is the single most dangerous fact in this document.

- Legacy **Pro** was a *background-check tier* you bought.
- New **Pro** is a *professional-credential designation* you earn by submitting a licence, bond, or insurance — verified internally by Gopher, free, and requiring **annual re-verification**.

**Consequence:** a current Gopher Pro who sees "you are now Elite" without explanation reads it as a **demotion** — they will believe they lost the Pro badge to someone else. Comms must state that Elite *is* their old Pro tier, renamed, and that Pro now means something else they may additionally qualify for. See §11.

---

## 3. The cardinal rule: rename by identity, never by string

*(From the Legacy-Naming Migration Work Order. This is the rule that keeps the two meanings of "Pro" from colliding.)*

- Legacy `Pro` = **`gopher_type_id === 1`** → Elite. Legacy `Pro+` = **`=== 2`** → Elite+. Identify by the integer, then change the label it prints.
- **Never regex the bare token `Pro` across a codebase, database, or doc tree.**
- Any `=== 1` / `=== 2` conditional is a **tier gate, not a label**. Leave the integer alone; change only the string or art it prints.
- **Sequencing:** rename the legacy values **first** (freeing the token), introduce new-Pro meaning **second**. Never let both meanings of "Pro" live in the same field at the same time.

### The false-positive list — calibrate every grep against this

`Gopher Profile` · `gopher-prohibited-list.html` (footer link on nearly every email template **and** the ToS) · `gopher-prod` / `gopher-production` (AWS RDS instance names) · `[data-gopher-profile]` · `openGopherProfileModal` · `.gopher-prof-card` · `Pro Forma` · `Proud` / `proof` · `ProfilePic` · `protag`-style names (those **are** tier art — §9) · base64 image payloads that happen to contain the bytes `Pro+`.

And the one that matters most: **the new Pro tier's own copy, which must survive untouched.**

---

## 4. The data model — RESOLVED, and not yet built anywhere

Two documents once modelled the new Pro tier differently. The owner settled it on **2026-07-12**:

> **✅ Model A — Pro is a separate, STACKING credential.**
> Elite/Elite+ are *background* verifications (criminal, and criminal + DMV). Pro means the worker holds *professional credentials*. They are completely different verifications, so **a worker can be Elite AND Pro at the same time.**

**Implementation shape:** a separate rolify `roles` row or a dedicated flag. **Never** a value in the tier enum. **Explicitly NOT `gopher_type_id = 3`.**

### What this ruling invalidates

| Artifact | Problem | Fix |
|---|---|---|
| `G40-199-tier-rename-conversion.md` (Jul 6) | Built on `gopher_type_id = 3` | Read those sections as superseded |
| **G40-305 email program** | Its `gopher_type_id: 3 → new Pro` mapping is wrong | The new-Pro grant email (`SMS:Emails/gopher-email-tier-pro.html`) must trigger off the **credential grant**, not a tier value |
| **HQ Dashboard tier picker** (`Documentation/Dashboard/app_part4.js`) | Exclusive Standard/Elite/Elite+/Pro radio select | Pro becomes a **separate toggle**, not a fourth radio |
| **`Final/gopher-request.html` + `gopher-go.html`** | Still model Pro as an exclusive tier — see §8 | Rebuild requirement |

### ⚠️ The new-Pro credential has no data model yet — verified

I checked the schema repo (`Dev/gopher-db`, Drizzle) directly:

- `users_roles.gopher_type_id` — `integer`, `default(0)`. Plain integer, exactly as documented. ✅
- `users_roles.gopher_type_updated_on` — `timestamp`. The audit column already exists. ✅
- **No `gopher_types` lookup table exists.** Confirmed by grep — zero matches.
- `roles.name` — plain `varchar`. This is where the tier *name* lives as row values, which is why the DB "rename" is only a value update.
- **No `elite` string anywhere in the schema. No credential, `proCred`, or professional-designation concept of any kind.**

**So: the stacking credential ruled on 2026-07-12 has no schema representation as of today.** Somebody has to build it, and that work is *not* in any of the six patch sets (§6). It is the largest unbuilt piece of the conversion and nothing tracks it as work.

**This is a build item, not a sequencing risk — clarified by the owner, 2026-08-10.** An earlier draft of this document treated it as an open product decision ("does Pro ship with the rename or after?"). It is not. The rename is an **atomic relabel of an integer**, so the token "Pro" is freed the instant launch flips; a new Pro can only exist after a credential is submitted *and* approved, which is inherently later. **The two meanings therefore never coexist**, and §3's sequencing rule is satisfied for free. Zero Pros on day one is the **expected and correct** state, not a gap.

**What must exist at launch is narrower: an application must go somewhere.**

| Piece | Needed at launch? |
|---|---|
| **Intake** — the apply form actually submits | **Yes.** Today `Final/gopher-tiers.html:676` `<form id="proApp">` has **no submit handler and the page makes zero network calls** — it is a presentational mock, so an application is silently discarded |
| **Review queue** — a human can see and act on a submission | **Yes.** Reuse the existing shared merchant/SP review queue — approval is already a manual act |
| **Grant control** — an approved credential can be recorded and rendered | **Yes.** This is the schema gap above, plus the admin toggle in §4's rework table |
| **Annual re-verification** | **No.** A year out by definition — build it before the first cohort lapses, not before launch |

The Go app's "Become a Pro" pane and the SP-Deal review queue are the natural homes; both are already designed.

### ➕ A second tier-typed column, never inventoried

`notifications.gopher_type` — `integer` (`drizzle/imported_schema.ts:992`), commented *"Type of gopher associated with the notification."*

No predecessor document inventories this. I grepped the backend's admin and lib trees for notification-targeting use of `gopher_type` and found **none**, so it appears dormant. But it is a tier-typed column, and a rename audit has to classify it rather than discover it later. **Action: confirm dormant, then either use it or drop it.**

---

## 5. Verified production state — as of 2026-08-10

Traced from **`origin/production` at `54acb023`** (2026-08-10), in a throwaway worktree, removed afterwards.

**The rename is unapplied in production.** Every legacy label is still live:

```
constants/index.js:204-208    exports.GOPHER_TYPE = { STANDARD: 0, PRO: 1, PRO_PLUS: 2 }
```

| Location (verified on `origin/production`) | What it prints |
|---|---|
| `controllers/admin/inbox_message.js:592` | SQL CASE → `'Gopher Pro'` / `'Gopher Pro+'` |
| `controllers/admin/orders.js:878-879` | SQL CASE → `'Pro'` / `'Pro+'` |
| `controllers/admin/user.js:1073-1074` | CSV-export SQL CASE → `'Pro'` / `'Pro+'` |
| `controllers/order/emails.js:135` | Sets `gopher_type = 'Pro+'` into **customer-facing order-email** `mail_data` |

### ⚠️ The predecessor line numbers have drifted — do not trust them

| File | Deployment plan said | Actually (production, today) |
|---|---|---|
| `constants/index.js` | `:166-170` | **`:204-208`** |
| `controllers/admin/user.js` | `:906-908` | **`:1073-1074`** |
| `controllers/admin/inbox_message.js` | `:592` | `:592` ✅ holds |
| `controllers/admin/orders.js` | `:878-879` | `:878-879` ✅ holds |

Two of four drifted in under a month. **Anchor on the symbol, not the line** — `exports.GOPHER_TYPE`, the CASE statement, the assignment. A line-numbered inventory is a liability in a repo under active development.

---

## 6. ✅ The patches still work — but only with `--3way`

The deployment plan claims "most of the work is already written." **That claim holds** — I verified all six patch sets against each repo's current `origin/production`. But **five of six fail a plain `git apply`**, which would read as "these are dead, regenerate them" and cost a developer days of unnecessary rework.

| Patch (all in `Documentation/Gopher — Intended/`) | Target repo | `git apply` | `git apply --3way` |
|---|---|:---:|:---:|
| `tier-rename-gopher-backend-api.patch` | gopher-backend-api | ❌ | **✅** |
| `tier-rename-gopher-backend-api-part2.patch` | gopher-backend-api | ❌ | **✅** |
| `tier-rename-gopher-mobile.patch` | gopher-mobile-gopher | ❌ | **✅** |
| `tier-rename-gopher-mobile-part2.patch` | gopher-mobile-gopher | ❌ | **✅** |
| `tier-rename-gopher-mobile-request.patch` | gopher-mobile-request | ❌ | **✅** |
| `tier-rename-gopher-admin-frontend.patch` | gopher-admin-frontend | **✅** | **✅** |

**Use `git apply --3way`.** It succeeds because the patches carry correct blob hashes — they were genuinely generated against these repos, and only the surrounding *context* drifted.

**Two cautions:**

1. **`--3way` can resolve a hunk in a way that is syntactically fine and semantically wrong.** After applying, verify by grep (§12) rather than trusting the exit code.
2. Order matters where noted: backend patch 1 **then** part-2; worker patch **then** part-2. The requester and admin patches are standalone.

**Repo pins used for this verification:** backend `origin/production` `54acb023` (2026-08-10) · worker app `381c37e55` (2026-03-19) · requester app `e0a56bb3b` (2026-03-19) · admin frontend `99f8830` (2025-02-05). Both mobile pins are unchanged since the 2026-08-02 flow-doc trace.

### What the patches cover

| Patch | Scope |
|---|---|
| backend #1 | The 4 label sites in §5 |
| backend #2 | Enum key rename (`ELITE`/`ELITE_PLUS`) · tier-email copy (templates 15/16) · signup-confirmation copy · tier-up URLs → `https://gophergo.io/gopher-tiers/` |
| worker #1 | 12 display-only files: `InAppMessage.js`, `fav_gropher*.js` ×3, `getOrders.js`, `gopherPro.js`, `CustomPullOver.js`, `RequestDetailPullOver.js`, `ordercard.js`, `parentMenuButton.js`, `json/gopher/account.json`, `pages/inbox.js` |
| worker #2 | 5 remaining label misses + all tier-up URL repoints |
| requester | Complete: 12 files, 52 lines, labels + URLs |
| admin FE | Complete: UserView tier picker + display ternary, Broadcast + Filter "Gopher Type" tag columns, filter checkboxes (3 files, 14 lines) |

**Not patched, deliberately:** files that reference badge **art by filename** (`pro_batch@3x.png`, `gopher_pro_icon.png`, …) in `src/img/icons.js`, `src/component/rating.js`, `src/component/roundPhoto.js`. Replace the **art in place, keeping filenames** — zero code diff (§9). Also `requester src/json/requester/more.json:144` "Become A Gopher" — the general worker-signup link, not the legacy Pro page.

**Notable user-facing copy the patches do change:** the cancellation-policy line *"…unless you're a Gopher Pro"* (`ordercard.js` ×3, `RequestDetailPullOver.js` ×2, per app), inbox/offer-card name prefixes, and "Gopher Pro+ Verified" account badges.

### Not covered by any patch

- The **new-Pro credential** data model, submission flow, and grant path (§4) — the big one.
- The **DB rename** — `gopher-db-tier-rename-D015.sql`. Part 1 is a read-only diagnostic; Part 2 is the transactional `roles.name` value rename. **Run Part 1 on production first, edit Part 2's strings to match its actual output, snapshot before Part 2.**
- **S3 badge art** (§9), Yardstik package renames, marketing CMS, app-store listings.

---

## 7. Surface inventory

### A — Marketing site (gophergo.io) + Yardstik

- **`Final/gopher-tiers.html` is the ready replacement page.** Verified today: Elite `:585`, Elite+ `:604`, Pro `:625`, all correct copy.
- **Publish at `https://gophergo.io/gopher-tiers/`** with 301s from `become-a-gopher/gopher-pro/` and `become-a-gopher-pro/`. *(Owner decision D-2, 2026-07-12. Slug is a one-grep change across the patches + email templates.)*
- **⚠️ 301 sequencing constraint:** the old `become-a-gopher/gopher-pro/#reg-form` page **hosts Yardstik's embedded registration form.** The 301 can only switch on after that form has a new home. Until then the old page keeps serving it, and the tiers page's "Continue to Yardstik" CTA keeps pointing there (`gopher-tiers.html:649`) — **intentional, not a bug.**
- **The page's own Yardstik note at `:652`** — *"Yardstik's signup portal still shows our legacy tier names…"* — is **intentional.** Keep it until Yardstik updates their portal, then remove.
- **Yardstik:** rename their request packages "Gopher Pro" → "Gopher Elite" ($35), "Gopher Pro+" → "Gopher Elite+" ($50). **Do NOT ask Yardstik to add "Pro"** — new Pro is credentialed internally, free. This work is display-side and decoupled: it can run in parallel with everything else.

**Confirmed and unchanged:** `controllers/user/trustshield.js` (iDenfy webhook) sets **only** `trust_shield_verified` and never touches the tier. Tiering is and remains a **manual admin action** via `POST /admin/user/setgophertype`. Neither Yardstik nor iDenfy auto-sets a tier.

### B — Backend (`gopher-backend-api`)

Covered by §5 (locations) and §6 (patches). Additional items:

| Location | What | Action |
|---|---|---|
| `controllers/admin/user.js` `set_gopher_type()` | `POST /admin/user/setgophertype` — the manual tiering endpoint. Sends email 15 (`id===1`) / 16 (`id===2`), writes log strings, stamps `gopher_type_updated_on` | Log strings → Elite/Elite+ (patched). New-Pro grant is a **separate** path per §4 |
| `lib/sendEmail.js` template map | `15: 'bocome-gopher-pro.ejs'`, `16: 'become-gopehr-proplus.ejs'` — **the filename typos are real and in-repo** | Change the copy inside; filenames may stay |
| `lib/sendEmail.js` subjects | Subjects for 15 **and** 16 are both **"Welcome to Gopher"** | Optionally differentiate ("You're Gopher Elite now") — **owner call, intentionally left unpatched** |
| `views/bocome-gopher-pro.ejs` / `become-gopehr-proplus.ejs` | Tier-grant emails: copy + badge `<img>` → S3 `assets/gopherpro.png` / `gopher_pro.png` | Copy → Elite/Elite+; art swapped in place on S3 (§9) |
| `views/confirmation-email.ejs`, `views/new-confirm-mail.ejs` | Link to `gophergo.io/become-a-gopher-pro/` and `…/become-a-gopher/gopher-pro/`. **Every signup confirmation carries this.** | Repointed by backend patch #2 |
| `views/gopher-pro.ejs`, `views/gopher-pro-plus.ejs` | Orphaned templates, referenced nowhere | Ignore or delete |
| `models/users_roles.model.js` | `gopher_type_id`, `gopher_type_updated_on` | No change |

**Push and SMS code carry no tier strings** — the emails above are the only backend notification copy affected.

### C — Admin frontend (`gopher-admin-frontend`)

Fully covered by `tier-rename-gopher-admin-frontend.patch` (the only one that still applies cleanly plain). Touches `UserView.js` (`groferTypeArr`, display ternary, badge images from `src/pro.png` / `src/pro_plus.png`), `Broadcast/index.js`, `Filter/index.js`.

**Note:** the HQ Dashboard is the intended replacement for this panel (G40-70) and already has an "Update tier" control posting to the same endpoint. Treat the admin-panel edits as the interim parity path.

### D + E — Mobile apps

Verified counts from the June exports: **worker app 50 tier-string matches across 17 files; requester app 48 across 15 files.** All inside `src/` — nothing in the `android/` or `ios/` native trees. `gopher_type_id` appears in ~18 more files per app as pure data plumbing with no visible strings — **rename-safe, don't touch.**

**⚠️ Mobile ships on store-release timing, not merge timing.** A merged rename changes nothing for users until the app store ships the build. Both apps must be released together with the rest of the launch, or the two apps will disagree with each other and with the web.

### F — HQ Dashboard (`Documentation/Dashboard/`)

Three rename bugs were found and fixed on 2026-07-12 (aggregate key mismatch, dead iQ tier query, unmapped order rows). The fixes read the new `Elite`/`Elite+` keys and **tolerate the old `Pro`/`Pro+` keys as fallback**, so they are safe against either data vintage.

**Still owed here:** the tier picker must become tier + separate Pro toggle per §4.

### G — Web prototype (`Final/`)

Legacy-copy cleanup was completed 2026-07-12 and I re-verified it today. Current state:

- **FAQ corpus — clean.** `assets/js/gopher-ai-engine.js:151` now carries 9× "Gopher Elite" and 3× "Gopher Elite+"; zero legacy tier copy. Synced across all 7 inlined copies + `gopher-faqs.html`.
- **`gopher-blog.html` ladder** — reads "Standard → Elite → Elite+". Clean.
- **`shared-gopher-pro.svg`** (formerly misnamed `shared-gopher-elite-2.svg`) — renamed, and all 3 references verified live today: `gopher-tiers.html:625`, `gopher-go.html:1346`, `gopher-go-101.html:704`.
- **Terms of Service `:464-490`** — models the new Pro **correctly**: a separate designation, licensed/bonded/insured, with annual re-verification. This is the reference wording.
- **Intentionally kept:** the Yardstik legacy-names note (`gopher-tiers.html:652`); the memorial *"our 1st Gopher Pro at the time"* (`gopher-connect-101.html:631`, `gopher-request-101.html:492`) — explicitly historical; ToS "…as a Pro perk" phrasing.

**But there is a deeper problem in this tree that the string-level audits could not see — §8.**

---

## 8. ⚠️ The prototype layer models the D-1 ruling three different ways

**This is new, and it is the most consequential finding in this document.**

Every previous audit of `Final/` asked *"which Pro does this string mean — legacy or new?"* That question passes all of the code below, which is why it survived three cleanup passes. The question nobody asked is *"is Pro modelled as a **tier value** or as a **stacking credential**?"* — and by that test, **two of three surfaces contradict the owner's own 2026-07-12 ruling.**

### `gopher-connect.html` — ✅ correct, and the reference implementation

```
__tierBadge(t, proCred)   → renders the tier badge PLUS a separate `cred-pro` chip
__tierTitle(t, proCred)   → name + (proCred ? ' · Pro' : '')
seed workers              → { badge:'elite',  proCred:true }
                            { badge:'elite+', proCred:true }
                            { badge:'standard', proCred:true }
```

Tier and credential are **orthogonal fields**. A worker can be Elite *and* Pro, or Standard *and* Pro. That is Model A, built exactly as ruled. **Any rebuild should copy this vocabulary.**

### `gopher-request.html` — ❌ models Pro as an exclusive tier

```
:19532   tier: (String(g.tier||'').toLowerCase().indexOf('elite') !== -1) ? 'Gopher Elite' : 'Gopher Pro'
:23467   tier: (String(g.tier||g.badge||'').indexOf('elite')     !== -1) ? 'Gopher Elite' : 'Gopher Pro'
:19198   { name:'Devon Price', tier:'Gopher Pro', … }
:19200   { name:'Kyle Watts',  tier:'Gopher Pro', … }
:19397   const cls = tier === 'pro+' ? 'tier-pro' : ''
         grep -c proCred  →  0
```

Two defects, both structural rather than cosmetic:

1. **Pro is the `else` branch of a tier ternary.** Tier and credential are the same field, which Model A forbids.
2. **The fallback is the *strongest* designation.** Any worker whose tier string doesn't contain "elite" — including a **Standard** worker — renders as "Gopher Pro". The safe default should be Standard; instead an unverified worker displays as a credentialed professional.

`badge:'pro+'` is a widely-used slug (12+ seed workers) that *means* new-Pro in this file's display vocabulary. The July audit reclassified it as "a confusing key name, not wrong copy" — **correct about the string, but it missed that the surrounding model is wrong.**

### `gopher-go.html:2876` — ❌ models Pro as a tier value

```
:2876  <div class="tier-badge">Your tier: <b id="workTierName">Gopher Pro</b></div>
:2877  <button data-tier="elite">Elite / Pro view</button>
:2878  "in production this is set automatically from the worker's tier (Standard vs Elite / Elite+ / Pro)"
```

`"Your tier: Gopher Pro"` and *"the worker's **tier** (Standard vs Elite / Elite+ / **Pro**)"* both state that Pro **is a tier** — a four-way exclusive ladder. The deployment plan's §10 recorded that go.html's Pro strings are "all the NEW Pro tier (correct, leave)." That is true about *which meaning*, and it is exactly why the model error slipped through: the strings refer to new-Pro, but they **model it as a mutually exclusive tier**, which D-1 forbids.

### What to do about it

**This is a production-rebuild requirement, not a prototype patch** — consistent with the existing reasoning that renaming Request's badge vocabulary means refactoring dozens of seed workers and ~10 render sites for zero visual change. Recorded here so the rebuild inherits the right model instead of copying whichever surface it happens to open first.

**The requirement:** tier and Pro credential are **separate fields**. `tier ∈ {standard, elite, elite+}` plus an independent boolean `proCred`. Never a four-valued tier enum. `gopher-connect.html` is the reference.

**One thing worth an owner decision:** the Request fallback rendering an unverified worker as "Gopher Pro" is visible in the prototype today, on a public host. It is demo seed data, not real worker data, so nothing is misrepresented about a real person — but if it should not read that way to anyone clicking through, that is a small, contained fix (change the `else` branch to Standard) rather than the full vocabulary refactor. **Raised, not silently changed.**

---

## 9. The logo half of "name and logo change"

### Legacy Pro/Pro+ art to replace or retire

| Where | Files |
|---|---|
| Both mobile apps, `public/assets_1/` | `pro_batch.png` (+@2x,@3x), `pro_status.png` (+@2x,@3x), `pro-icon.svg`, `pro_plus_batch.png` (+@2x,@3x), `pro-plus-icon.svg`, `gopher_toolbelt_pro.jpg` — **12 per app** |
| Both mobile apps, `public/assets/` | `protag.png` (+copy), `proTagBlue.png`, `proplustag.png` (+copy), `proPlustagBlue.png`, `gopher_pro_icon.png` (+@2x,@3x), `gopher_pro_icon1.png` (+@2x,@3x), `gopher_toolbelt_pro.jpg` — **13 per app** |
| Admin frontend | `src/pro.png`, `src/pro_plus.png` |
| **S3** (referenced by backend email EJS) | `assets/gopherpro.png`, `assets/gopher_pro.png` (templates 15/16) **+ `assets/pro_icon.png`, `assets/pro_plus_icon.png`** (new-confirm-mail.ejs) |
| Brand source | `Gopher Pitch Deck/assets/logos/Gopher 2.0 Logos/Gopher Pro Logo/` (12 files) + `Gopher Pro Plus/` (24 files, CMYK/Pantone/RGB) + `assets/brand/pro.png` |
| Inline base64 | `Gopher Go App (retired 6:29)/gopher-go-prototype.html` (`PRO_BADGE`/`PROLOGO`) — retired folder, leave |

**The convention that makes this cheap: replace art IN PLACE, keeping every filename and S3 key.** Zero code diff, and the patches already assume it. Renaming the files or JS keys is optional polish that buys nothing and risks a 404 in a shipped app build.

### New art that already exists

`Final/assets/img/`: `tier-elite.svg`, `tier-elite-plus.webp`, `tier-pro.svg`, `shared-gopher-elite.svg`, `shared-gopher-pro.svg`; plus `_prototypes/Go/gopher-elite-logo.svg` and `gopher-pro-wordmark.svg`.

**`SMS:Emails/gopher-go.html`** — its base64 badge decodes byte-identical to `shared-gopher-pro.svg`, i.e. it is the **new-Pro** wordmark. Its `alt="Gopher Pro"` is **correct**. Do not "fix" it.

---

## 10. Cohort conversion — what each person actually experiences

The mechanical rename is well documented. **The human conversion is not, and it is where the reputational risk sits.**

| Cohort | Holds today | Becomes | Must be told |
|---|---|---|---|
| **Standard** | `id 0` | Standard | Nothing tier-related. New Pro is newly *available* to them if they hold credentials — Pro does not require Elite. |
| **Gopher Pro** | `id 1`, paid $35 | **Gopher Elite** | *"Your Pro tier is now called Elite. Same benefits, same badge value, nothing to do, no new fee."* **And**: *"'Pro' now means a separate credential designation — you may qualify for that too."* |
| **Gopher Pro+** | `id 2`, paid $50 | **Gopher Elite+** | Same, plus Elite+ retains its DMV/MVR verification and priority Ride Sharing benefits. |
| **Credentialed trades** | any tier | tier **+ Pro** | *"Pro is new and stacks on your tier — submit a licence, bond, or insurance. Free, verified by us, renewed annually."* |

### The message that must land

**"Elite is your Pro, renamed. Pro is now something else you can also earn."**

Without both halves, a paying Pro reads the change as a demotion and a loss of the badge they bought. This is the whole reason the reuse of "Pro" is flagged as the cardinal hazard in §2 and §3.

### Comms assets that already exist

`Documentation/SMS:Emails/gopher-email-tier-elite.html` · `gopher-email-tier-elite-plus.html` · `gopher-email-tier-pro.html` — the branded 2026 set, ready art for the announcement. `impl-tier-grants.md` carries its own implementation TODOs which the §7 backend work resolves.

**Still an open decision (D-4):** whether grandfathered workers get a one-time announcement at all, and on what channel. **Recommendation: yes, email + in-app, timed to the app release, not before it** — a worker told they are Elite before the app says so will open an app that still says Pro.

**Price-lock angle worth coordinating with marketing:** the one-time verification fee is documented as rising at launch (Elite $20→$35, Elite+ $30→$50), so upgrading pre-launch locks the lower rate permanently. That is a supply-side conversion lever, and it expires the moment the rename ships. *(Sourced from the marketing tier memo — confirm current figures with the owner before using them in copy; §7's table carries the post-launch prices.)*

---

## 11. Open decisions

Resolved on 2026-07-12 and settled: **D-1** data model (stacking credential) · **D-2** tiers-page URL (`/gopher-tiers/` + 301) · **D-3** enum key rename (`ELITE`/`ELITE_PLUS`; verified zero usage sites, so no churn) · **D-7** pitch-deck testimonial ("— Gopher Elite", applied).

| # | Open decision | Recommendation |
|:---:|---|---|
| **D-4** | Announcement to grandfathered workers — send one? which channel? | **Yes**, email + in-app, timed **to** the app release. Art exists. See §10 |
| **D-5** | New-Pro grant email trigger | Unblocked by D-1: fire off the **credential grant**, not a tier value. `gopher-email-tier-pro.html` is ready |
| **D-6** | Old Pro/Pro+ logo sets — archive or re-badge for new Pro? Production Elite art source? | Archive the legacy sets; export production art from `Final/assets/img/tier-*.svg` |
| **D-8** | `Gopher_Financials_and_Pro_Forma_Summary.xlsx` "Gopher Pro Rev" line | Likely tier-fee revenue → "Elite Rev". **Confirm it isn't new-Pro revenue** before renaming |
| **D-9** | RFP `Gopher-Package-Briefing.html:253` "Advertising & Gopher Pro Deals" | Probably should read "Local Pro Deals" (the new-Pro product); as written it collides with the legacy tier name |
| **D-10** | "Gopher Pro Shopper" program name (G40-191) | Rename with the tier, or keep as a distinct program brand? G40-191 is NOT-PHASE-I |
| **D-11** *(new)* | **Build the new-Pro credential intake path** (§4 — no schema, no submission flow, no grant path) | **Not a decision — a scoped build item.** Sequenced after the rename. Minimum at launch = intake + review queue + grant control; annual re-verification comes later. Ready to estimate now |
| **D-12** *(new)* | `notifications.gopher_type` (§4) — dormant, or in use? | Confirm dormant, then use it or drop it |
| **D-13** *(new)* | Request prototype's fallback renders unverified workers as "Gopher Pro" (§8) | Contained one-line fix to default Standard, or leave for the rebuild? |

**Per the standing rule: none of these should be left for the developer to decide.** D-11 is the exception — it is no longer a decision at all, just work (§4).

---

## 12. Execution order and verification

**Everything below is gated on the marketplace launch (§1).** Yardstik and marketing prep can proceed in parallel beforehand; nothing user-visible ships early.

1. **Nothing to decide before starting.** The rename is self-contained; the new-Pro credential (D-11) sequences **after** it and does not change steps 2–6. Build the credential intake before the tiers page's "Apply for Pro" CTA goes live, or applications are discarded (§4).
2. **DB** — run `gopher-db-tier-rename-D015.sql` **Part 1** (read-only diagnostic) on production → snapshot → edit Part 2's strings to match Part 1's actual output → run **Part 2**. Must land **in the same release window as step 3**: anything comparing the literal strings `'Pro'`/`'Pro+'` breaks otherwise. The integer gates are unaffected either way.
3. **Backend** — `git apply --3way` patch #1, then part-2. Then the unpatched items: subjects (owner call), S3 badge art.
4. **Admin frontend** — apply its patch (plain apply works).
5. **Mobile** — worker patch → worker part-2; requester patch. Swap the ~25 art files per app in place. **Ship both app releases together.**
6. **Marketing + Yardstik** — publish the tiers page; 301 the legacy URLs **after** the Yardstik reg-form is rehomed; Yardstik package renames (parallel); then remove the tiers-page legacy-names note.
7. **Comms** — D-4 announcement, timed **after** the app release is live.
8. **Store listings** — review App Store / Play Store screenshots and descriptions for Pro/Pro+ mentions when the renamed builds ship.

### Verification checklist

- **DB:** `Σ legacy = Σ canonical` row counts; `legacy_rows_remaining = 0`; spot-check known Pro/Pro+ workers now render Elite/Elite+ **everywhere** — app profile, admin, order emails.
- **After every `--3way` apply:** `rg -n "Gopher Pro\b|Pro\+|Pro Plus"` over the repo returns **only** new-Pro copy and intentional migration notes. Calibrate against §3's false-positive list. **Do not trust the apply exit code alone.**
- **No behaviour drift:** Service-Provider Deal eligibility (Elite/Elite+/Pro · 20+ **service** jobs · 4.75★ over the last 20 **service** jobs — Delivery/Ride Sharing/Other excluded from both the count and the rating window) computes **identically** pre- and post-rename.
- **Broadcast cadence (G40-44)** Tier-2 unchanged — it is integer-based, so it should be untouched by definition. Verify that it is.
- **Emails 15/16** render Elite/Elite+ names with the new badge art; signup-confirmation links resolve to the live tiers page.
- **Yardstik portal** shows Elite/Elite+ → then remove the `gopher-tiers.html:652` note.
- **Grandfathering:** no worker's `gopher_type_id` changed value. The integers are the proof that nobody was re-tiered.

**Effort:** the rename proper is ~2–4 dev-days (patches exist and apply via `--3way`); the long tail is two app-store releases, art swaps, and external coordination (Yardstik, S3, marketing CMS, store listings). **The new-Pro credential build (D-11) is separate, sequences after the rename, and is scoped in §4 — estimate it independently.**

---

## 13. Provenance — what is verified vs inherited

Following the standing rule that inherited claims be marked as inherited.

**Verified first-hand on 2026-08-10:**

- Backend production state and all four label locations — traced from `origin/production` `54acb023` in a throwaway worktree (removed after).
- The line-number drift in §5 — measured against production, not remembered.
- All six patch sets tested against each repo's current `origin/production`, both plain and `--3way` (§6). Repo pins recorded there.
- The DB facts in §4 — read from `Dev/gopher-db` `drizzle/imported_schema.ts`: `gopher_type_id` integer default 0, `gopher_type_updated_on` present, no `gopher_types` table, `roles.name` plain varchar, **no elite/credential concept**.
- `notifications.gopher_type` (§4) — read from the schema; dormancy inferred from a backend grep finding no notification-targeting use.
- Every `Final/` claim in §7 and §8 — grepped and read in context today, including the three-way model divergence, which is **new to this document**.

**Inherited (not re-verified here):**

- The mobile string counts (50/17 worker, 48/15 requester) — from the June-2026 export audit.
- The art-file inventory in §9 — from the July inventory; file lists in the mobile repos and on S3 were not re-enumerated.
- The HQ Dashboard fix receipts in §7F — from the 2026-07-12 session's browser verification.
- The owner rulings (D-1/D-2/D-3/D-7, and the 2026-07-30 launch gate) — owner statements, dated, cited as such.
- The pre-launch price-lock figures in §10 — from the marketing tier memo; **confirm with the owner before using in copy.**

**How to re-verify the production state cheaply:**

```bash
cd "Dev/gopher-backend-api" && git fetch origin production
git show origin/production:constants/index.js | grep -A4 'exports.GOPHER_TYPE'
```

If that still prints `PRO: 1, PRO_PLUS: 2`, the rename has not shipped and everything in §5 still stands.
