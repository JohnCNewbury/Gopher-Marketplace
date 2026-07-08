# G40-302 — Pop-up modal audit (reskin-readiness)

**Status:** In Progress · Assignee: John Newbury
**Siblings:** G40-301 (banner audit) · **G40-309** (the Figma-catalog *disposition* log — 54-modal pass, 28 survive)
· **Standards:** G40-308 (Guide A centered card / Guide B bottom sheet)
**Goal:** make the eventual UX refresh a *pure reskin, not a discovery exercise* — inventory every
pop-up/modal/overlay/sheet in the current **code**, decide relevance vs the new flow, and log exact code
locations + G40-308 compliance so the new dev just restyles.

> **How this differs from G40-309.** G40-309 records John's *design-catalog* decisions per **Figma node**
> (keep / update / remove + target UX). **G40-302 is the code-side companion:** where each modal actually
> lives in the prototypes today, and whether it already conforms to the G40-308 class system. Read them
> together — 309 says *what the modal should become*; 302 says *where it is and how far off standard it is*.

---

## Method & scope

Four parallel read-only sweeps: `Final/gopher-request.html` (33 modals), `Final/gopher-connect.html`
(40 overlays), `Final/gopher-go.html` + `_prototypes/Go/` (7), `_prototypes/Request/*` per-screen boards
(27). **~107 modal/overlay/sheet primitives total.** Banners/toasts/inline strips were excluded (→ G40-301).

**G40-308 compliance classes:** *Guide A* = centered card (`.gr-modal` / `.gc-modal` / `.g-modal` / `.gmodal`);
*Guide B* = bottom sheet (`.g-sheet` / `.sheet` / `.g40-sheet` / `.gsheet` / `.su-sheet`); *Ad-hoc/legacy* =
any other bespoke overlay class. Canonical palette: navy `#002461`, Shamrock `#33D975`, ink-on-green = navy
(never white); the red danger accent `#C44257` on cancel/guardrail CTAs is an accepted intentional variant.

### Headline findings

1. **The refresh is mostly a pure restyle.** The two **Final web apps are ~90% already on the canonical
   Guide-A card system** (`.gr-modal` / `.gc-modal` with the correct palette and button variants). Most
   rows below are **Keep — restyle only.**
2. **No obsolete/legacy-term modals.** Zero live modals use `Need it Now` / `Select My Gopher` / `SMG` /
   `Notify MY Gopher` / `Pro`-`Pro+` tiers. Tier language is canonical (`Standard` / `Elite` / `Elite+`;
   `Pro` = new accredited credential).
3. **The real reskin work = a short list of non-canonical overlays** (below), not the whole catalogue:
   the `.ca-overlay` fee/rating/dispute family (web), Connect's `.signin-`/`.otp-modal-overlay` naming,
   Go's `.gl-overlay`/`.rhm-overlay`, and the **Request mobile boards' per-screen bespoke sheet classes**
   (Guide-B-shaped but not sharing G40-308 tokens).
4. **Substantive change-work is captured, not restyle:** the **11 "Update" rows in G40-309** carry John's
   copy/logic notes (delivery-only pickup=dropoff, phone-entered → "Edit my message", counter-offer
   150%-cap Standard-only, age-restricted ID → TrustShield protocol, etc.). Those are mapped to code
   locations in the "Substantive updates" section — they need a dev change beyond styling.
5. **Demo/placeholder to strip at prod:** the `__g40ReqMenu()` demo launcher (Request mobile), demo
   payment card forms (Connect `bizUpgradeOverlay` + signup Step 2 — Stripe test card `4242…`), and the
   `admin@gopher.example` demo address in `connectCancelOverlay`.

**Disposition legend:** `Keep` = restyle only · `Update` = needs a copy/logic/token change (noted) ·
`Remove` = per G40-309 (no live code equivalent found = already done).

---

## Compliance scoreboard

| Surface | Total | Guide A (card) | Guide B (sheet) | Ad-hoc / legacy | Notes |
|---|---|---|---|---|---|
| Request web (`gopher-request.html`) | 33 | 28 (`.gr-modal`) | — | 6 (`.ca-overlay` ×5, `.pay-modal-ov` ×1) | web app is card-based |
| Connect web (`gopher-connect.html`) | 40 | ~32 (`.gc-modal` + `.ca-overlay` variants) | — | 2 naming (`.signin-`/`.otp-modal-overlay`) + 2 non-modal + 1 datepicker | |
| Gopher Go (`gopher-go.html`) | 7 | 4 (`.gc-modal`) | — | 3 (`.gl-overlay`, `.rhm-overlay`, `.menu-overlay`) | |
| Request mobile (`_prototypes/Request/*`) | 27 | 3 (`.gmodal`) | 17 (bespoke sheets) | 7 (`.overlay`, `.iqp-wrap`, `.rd-wrap`, `.offer-modal`, inline demo) | sheets are right for mobile; tokens unshared |

---

## Reskin targets — the non-canonical overlays (this is the actual work)

Everything else is "swap the design tokens on an already-canonical card." These are the ones that need a
**structural migration** to the G40-308 class system:

### Request web (`Final/gopher-request.html`)
| Modal(s) | Current class | Action | Code anchor |
|---|---|---|---|
| Completion details · Rating · Unable-to-resolve (dispute) | `.ca-overlay`+`.ca-modal` | Migrate to `.gr-modal` (or Guide-B sheet on mobile parity). Note: `caOverlay` cost-adjust is the **canonical G40-305 fee-vocabulary modal** — keep its fee layout, just align tokens. | built ~L20876–20910 (completion/rating/unable); `.ca-*` CSS ~L3+ blocks; cost-adjust `buildAdjustmentModal` ~L20990; counter `buildCounterModal` ~L21106 |
| Add / edit payment method | `.pay-modal-ov`+`.pay-modal-card` | Migrate to `.gr-modal`; payment capture itself is reserved (dev). | built ~L10872–10899; `ensureModal()` ~L10995 |

### Connect web (`Final/gopher-connect.html`)
| Modal(s) | Current class | Action | Code anchor |
|---|---|---|---|
| Sign-in / portal · OTP entry | `.signin-modal-overlay` / `.otp-modal-overlay` | **Rename only** — visually Guide A already; rename to `.gc-modal-overlay` pattern for consistency. | signin L7023–7314 (CSS 358–391); otp L7318–7335 (CSS 894–902) |
| Completion / rating / dispute / cost-adjust / counter / g40-recovery/edit/rating | `.ca-overlay`+`.ca-modal` | Same as Request web — align `.ca-*` tokens to G40-308 (fee layout stays). | dashboard modals L16334–16519; g40-* L20997–21077; `.ca-*` CSS L5079–5114 |

### Gopher Go (`Final/gopher-go.html`)
| Modal(s) | Current class | Action | Code anchor |
|---|---|---|---|
| Sign-in + OTP sub-modal | `.gl-overlay` / `.gl-otp-overlay` | Migrate to `.gc-modal` (predates G40-308). | markup L1854–1894; CSS L1806–1851; init L1897–1994 |
| Request-history detail | `.rhm-overlay`+`.rhm-card` | Migrate to `.gc-modal` (or Guide-B sheet). Note: the *payout-fail* modal `#payoutFailOverlay` was already reskinned to `.gc-modal` (G40-19) ✅. | shell L2790; CSS L2156–2183; `openDetail()` L3426–3450 |
| Nav drawer | `.menu-overlay`+`.menu-panel` | Drawer, not a dialog — leave as-is unless a standardized drawer token is introduced. | overlay L964; panel L968–988; init L1708–1728 |

### Request mobile (`_prototypes/Request/*`)
Bottom sheets are the correct pattern for mobile, but **each board defines its own sheet classes** instead
of a shared G40-308 Guide-B token. Consolidate these into one Guide-B primitive:
| Sheet class | Board(s) | Code anchor |
|---|---|---|
| `.ov` / `.sheet` | completion (details/rating/unable) | `gopher-request-completion.html` L214–256; CSS L92–101 |
| `.g40-ovl` / `.g40-sheet` | inprogress (recovery/edit-repost/rate) | `gopher-request-inprogress.html` L393–424; CSS L118–166 |
| `.gov` / `.gmodal` (Guide A) · `.gov` / `.gsheet` (Guide B) | home (generic modal + sheet used app-wide) | `gopher-request-home.html` `gModal()` L964, `gSheet()` L966; CSS L248–377 |
| `.su-sheet` / `.su-back` | flow + home (age-restricted ID verify) | `gopher-request-flow.html` L2290–2430 |
| `.sheet-back` / `.sheet` | deals (redeem), refer (recommend/refer/history) | `gopher-request-deals.html` L364–366; `gopher-request-refer.html` L236–293 |
| **Ad-hoc (not sheets):** `.offer-modal`/`.offer-card` (Gopher iQ offer), `.overlay` (Deals slide-in/web-view/review), `.iqp-wrap` (iQ panel), `.rd-wrap` (request details) | flow / deals / home | flow L1493–1530; deals L340–362; home L1447–1600, L1733–1745 |

---

## Substantive updates (from G40-309 "Update (11)") mapped to code

These are **not** restyle — each carries a John note requiring a copy or logic change. Do these during the reskin:

| G40-309 node | Modal | Change required | Where in code |
|---|---|---|---|
| `5617:2177` | Pick-up = drop-off address | Make **delivery-only**; reword moving/single-location case ("No specific pick-up location"). | Request-flow demo modal set (`__g40ReqMenu` #3), web equivalent in address step |
| `5418:845` | Phone number entered in message | Change button **"Edit my request" → "Edit my message"**. | Request-flow demo modal (`__g40ReqMenu` #1) |
| `4160:7115` | Age-restricted ID agreement | Follow the **TrustShield** protocol (shown when user lacks TrustShield). | `idSubmitOverlay` L16433 / `ts-promo` path |
| `4902:2963` | Accepted Gopher no longer available | Define the post-"options" paths (John to confirm) → then wire `acceptedCancelOverlay`. | `acceptedCancelOverlay` L16226 (web) / L7444 (connect) |
| `4514:1156` | Cancel deterrent — Gophers available | New feature → fold into **G40-40** handoff (trigger/logic/function). | `earlyCancelOverlay` L16215 (web) / L7434 (connect) |
| `8821:8919` | Request expired — interested workers | Ties to **G40-43**; rebuild to G40-308. | Request-flow demo modal (`__g40ReqMenu` #6) |
| `3600:7530` | Bid sent — what happens next | Simplify → toast; **logic error** noted separately. | Go bid flow (see G40-309 note) |
| `3746:19620` | "Complete request" outcome options | Actually the **ID-not-confirmed** path, not a completion modal — relabel. | Go complete flow |
| `3816:20864` | Counter-offer exceeds 150% max | **150% cap is Standard-only** — no cap for Elite/Elite+/Pro. | Go counter-offer (`_prototypes/Go/gopher-go-counter-offer-figma.html`) |
| `5167:10546` | Delivery photos (Pic 1/2) | Not a modal — inline into the requester completion screen. | Go completion; Request completion photo gallery |
| `5802:1346` | Still broadcasting — Still Need / Cancel | Ties to **G40-209**; needs thumbnail. | `earlyCancelOverlay` variant B |

---

## G40-309 reconciliation — code confirms the "Keep" survivors are built

Spot-check of the 17 "Keep" Figma survivors against live code (all present, on-standard unless noted):
`Age-restricted no-purchase` → `agePurchaseOverlay`/`ageKwOverlay` ✅ · `Offer below average` → `lowOfferOverlay` ✅ ·
`Payment not authorized after acceptance` → Request-flow demo #2 ✅ · `Can't delete only card` → demo #5 + Go
last-card (G40-19 kit) ✅ · `Selected Gopher already on a job` → demo #4 ✅ · `Duplicate request` →
`dupNoticeOverlay` ✅ · `Payout card blocked/compromised` → `payoutFailOverlay` (reskinned ✅) ·
`iDenfy identity verification` → `idSubmitOverlay`/`idVerifyOverlay` ✅ · `Multi-worker job accept` →
"TARGET · TO BUILD" in G40-309, **not yet in code** — flag for build.
The 26 "Remove" Figma nodes have **no live code equivalent** (already dropped or downgraded to toast/inline) —
consistent with G40-309's disposition.

## Net result for the reskinning dev

- **~107 modal primitives** inventoried across 4 surfaces with file+line anchors + G40-308 compliance.
- **0 obsolete, 0 legacy-term** — visual refresh is a pure restyle for the large majority.
- **Structural migration list is short** (above): the `.ca-overlay` fee/rating/dispute family, Connect's
  two `-modal-overlay` names (rename), Go's `.gl-`/`.rhm-overlay`, and consolidating the Request-mobile
  per-screen sheet classes into one Guide-B token.
- **Substantive (non-restyle) work** = the 11 G40-309 "Update" notes mapped above + build the missing
  "Multi-worker job accept" modal.
- **Strip at prod:** `__g40ReqMenu()` demo launcher, demo payment card forms, `admin@gopher.example`.
- No prototype code was changed by this audit.
