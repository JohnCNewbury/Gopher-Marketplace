# G40-301 — Banner-notification audit (reskin-readiness)

**Status:** DONE — ticket closed 2026-08-19 (audit completed 2026-07-07; this doc is the deliverable and outlives the ticket) · Assignee: John Newbury
**Sibling:** G40-302 (pop-up modal audit) · **Implements-from-this:** G40-306 (banner templates + sound toggle)
**Goal:** make the eventual UX refresh a *pure reskin, not a discovery exercise* — inventory every banner
notification across Request + Connect + Go, decide relevance against the **new canonical flow + current
code** (not the stale Figma), and log exact code locations so the new dev just restyles.

---

## Method & scope

Four parallel read-only sweeps: `Final/gopher-request.html`, `Final/gopher-connect.html`,
`Final/gopher-go.html` (+ `_prototypes/Go/*-figma.html`), and `_prototypes/Request/*` (per-screen boards).

**In scope (this audit):** persistent inline banners, push-style banners, toasts/snackbars, inline
alert strips, status bars, "needs-attention" indicators.
**Out of scope → G40-302:** modals / overlays / sheets / bottom-sheets. Several sweeps surfaced these
(low-offer, request-limit upsell, biz-upgrade/downgrade, age-purchase guardrail, duplicate-request,
early-cancel, hire-cap, review pre-prompt, OTP-confirm, deals-coming-soon). They are **listed at the
bottom as a cross-reference** and belong to the modal audit — not re-catalogued here.

### Headline findings

1. **No obsolete banners.** Zero live banners reference legacy terminology (`Need it Now`,
   `Select My Gopher`/`SMG`, `Notify MY Gopher`, `Pro`/`Pro+` tiers). Every kept banner already uses
   canonical terms (`Need ASAP`, `I'll select my worker`, `Prioritize MY Gophers`, `Elite`/`Elite+`).
   **→ No copy/UX corrections were required; nothing to restyle-for-correctness.**
2. **The one real gap = push-banner wiring, owned by G40-306.** The canonical `GopherBanner` push
   component (G40-306) is loaded in all apps but its in-app **call sites are largely not wired** —
   the Request mobile board has demo hooks (`__inboxAlert`, `__counterAlert`); Go loads the library
   but never invokes it. Wiring the 28-banner catalog to real events is **G40-306's** implementation
   task, not a reskin item. Flagged, not silently deferred.
3. **Demo-trigger scaffolding must be stripped at production wiring** (not now — it powers the
   prototype demos): `g40RecoveryDemoBar` / `g40SimGopherCancel` (Connect), `pfDemoBtn`
   (Go payout-fail), `__previewReviewPrompt` (Go). Each is self-labelled "in production this is
   triggered by the app, not a button."
4. **One naming item to verify (not a banner defect):** `gopher-go.html:3083` seeds `tier:'Pro'` as
   demo data. Per the tier rename, legacy `Pro→Elite`; `Pro` is now reserved for NEW accredited pros
   (G40-199). The Figma `.elite-banner` concept boards should bind to the canonical tier once the tier
   system lands — verify `Pro` here is the new-accredited meaning, not a legacy leftover.

**Disposition legend:** `Relevant` = keep as-is, restyle only · `Update` = keep but needs a change
(copy/wiring/strip-demo) · `Obsolete` = new flow negates it (none found).

---

## Request app  (`Final/gopher-request.html` + `_prototypes/Request/*`)

The Final web file and the per-screen mobile boards share the same primitives; locations below are the
Final file unless a `_prototypes/Request/…` path is given.

| Banner | Trigger | What it does | Disposition | Code location |
|---|---|---|---|---|
| **g40-recovery-banner** | Gopher cancels an active request (prod: Gopher-app push; demo: sim button). 15-min auto-cancel. | Amber persistent alert "Your Gopher cancelled this request" → CTA "Review your options →" opens 3-path recovery. | **Relevant** (G40-9). Restyle only. | markup `#g40RecoveryBanner` L18030–18037; CSS L7326–7337; JS `g40ShowBanner()`/`g40ResolveBanner()` L23514–23610. Mobile: `_prototypes/Request/gopher-request-inprogress.html` L385–387 (CSS 122–129; logic 453/458/516). |
| **ar-banner** (+ `su-ar-banner`) | `state.ageRestricted === true` on Delivery Details / confirmation. | Inline strip "Safe-Guarding & Identity Verification Activated · Physical ID required…"; right side renders TrustShield badge / Get-TrustShield / Submit-ID by age state. | **Relevant** (age-restricted flow). Restyle only. | render L12730–12741 (`ageRestrictedBannerControl` 12313–12342); CSS L3667–3703. Mobile: `gopher-request-flow.html` L1198–1205 / conf L2317–2321. |
| **ts-promo** | age-restricted AND `!__hasTrustShield()`. | Navy promo strip "Add your free TrustShield™ — save $1…" → "Learn more" opens TS modal. | **Relevant** (D-013). Restyle only. | `tsPromoMarkup()` L12270–12281; CSS L4320–4379; inserted L12740/12791. |
| **gophers-banner** | MY Gophers dashboard section, when ≥1 saved Gopher. | Info strip explaining Prioritize-MY-Gophers first-dibs. Canonical term ✅. | **Relevant**. Restyle only. | `#gophersBanner` L18063–18067; CSS L8691–8696; visibility in `renderMyGophers()` L21895–21896. |
| **refer-reward-banner** | Refer section (always). | Green promo strip "Earn rewards for every referral." | **Relevant**. Restyle only. | markup L18160–18166; CSS L6526–6535. Mobile: `gopher-request-refer.html` L217 (`rs-banner`). |
| **dd-offer-banner** | Deal detail with an `.offer`. | Shamrock strip showing offer + promo code. | **Relevant** (Deals). Restyle only. | template L23106; CSS L7964–7966. |
| **req-gate-toast** | Tap disabled Continue with a blocking field. | Transient toast "[Field] is required to continue"; 3.2 s auto-out. | **Relevant** (validation). Restyle only. | CSS L4855–4874; JS `showGateToast()` L14400–14414. |
| **waiver-warning** | Submit without liability-waiver checked (Step 6). | Red inline alert "Please check the liability waiver above…" + waiver-box nudge. | **Relevant**. Restyle only. | CSS L4816–4823; JS `requireWaiver()` L14427–14436. |
| **up-status** | AI search photo upload/analysis. | Color-coded status strip (analyzing→ok/err) + cancel ×. | **Relevant** (AI search). Restyle only. | CSS L2395–2420; created in AI-engine inline script ~L14869 (stub). |
| **hb-alert / hb-dot** | Bucket has an `attention` item. | Red glow + pulsing dot on the tab (no text; aria "needs attention"). | **Relevant**. Restyle only. | mobile `gopher-request-home.html` CSS L419–421; render L911. |
| **inbox-alert / counter-alert** | New message / counter-offer (mobile demo hooks). | Push-style top banners (message preview / counter action-needed). | **Update** — reconcile to the `GopherBanner` catalog + wire to real events (**G40-306**). | mobile `gopher-request-home.html` `__inboxAlert()` L1101–1110; `__counterAlert()` L1114–1123. |
| **toast** (generic) | Misc confirmations / "coming soon". | Navy bottom toast, ~2 s. | **Relevant**. Restyle only. | mobile `gopher-request-home.html` `toast()` L636–641 (also refer/flow boards). |

---

## Connect app  (`Final/gopher-connect.html`)

| Banner | Trigger | What it does | Disposition | Code location |
|---|---|---|---|---|
| **g40-recovery-banner** | Gopher cancels active request (prod: Gopher-app push). | Warning banner "Your Gopher cancelled this request" → "Review your options →" (3-path modal). | **Relevant** (G40-9). Restyle only. | `#g40RecoveryBanner` L9044–9051; CSS L5130–5141; `initG40RecoveryUX()` L20921+. |
| **g40-recovery-demobar** | Always (demo). | "G40-9 preview: simulate a Gopher cancelling…" + sim button. | **Update — strip before prod** (demo-only). | `#g40RecoveryDemoBar` L9039–9043; CSS L5118–5128; button `#g40SimGopherCancel` L9042. |
| **g40-recovery-timer** | Recovery modal open. | "Auto-cancels in 15:00" countdown (demo setInterval). | **Update** — prod needs a durable server-side job (seam noted at L21100), not in-page timer. | injected L21003–21006; CSS L5143–5148; JS L21099–21150+. |
| **ar-banner** | `state.ageRestricted` on Job Details. | Inline "Safe-Guarding & Identity Verification Activated · Physical ID required…" + TrustShield badge. | **Relevant**. Restyle only. | render L10637–10645; CSS L2404–2406. |
| **refer-reward-banner** | Refer section (always). | "🎁 Earn rewards for every referral." | **Relevant**. Restyle only. | markup L9273–9279; CSS L1178–1187. |
| **role-info-banner** | Users&Access + MY Gophers sections (always). | Reference strip: Owner / Admin / User role definitions. | **Relevant** (help text). Restyle only. | L9227–9232 (and L9259–9261); CSS L6340–6350. |
| **dd-offer-banner** | Deal card with an offer. | Green strip: offer amount + promo code. | **Relevant**. Restyle only. | built L14544; CSS L5764–5765 / 5851. |
| **req-gate-toast** | Tap disabled Continue with blocking field. | Floating toast "[Field] is required to continue"; 3.2 s. | **Relevant** (validation). Restyle only. | CSS L2913–2933; JS `showGatePrompt()` L12419–12497. |
| **bv-check-list** | Business-Verification modal body. | Status list (✓/•): EIN, domain match, manual review. | **Relevant** (status list, not an alert). Restyle only. | L7921–7924; CSS L6235–6239. |
| KPI **pending** filter · card **has-attention** flag | Dashboard chrome / `needsAttention`. | Amber "Pending" count filter; attention highlight on request cards. | **Relevant** (dashboard chrome, not notification banners). Restyle only. | filter L9007–9009 (count `#kpiCountPending` L13794); flag L13827 / detail L15476. |

---

## Gopher Go worker app  (`Final/gopher-go.html` + `_prototypes/Go/*-figma.html`)

| Banner | Trigger | What it does | Disposition | Code location |
|---|---|---|---|---|
| **rh-payfail** (inline payout-fail) | Request-history item `st==='failed'` (list + detail). | Red inline strip "Payout failed — Stripe declined card ••[last4]. Add a new debit card…" + CTA. | **Relevant** (G40-19). Restyle only. | CSS L2190–2198; list render L3479; detail render L3436; CTA handlers L3452/3487 → `goToPayoutAddCard()` L3041–3052. |
| **toast** | Save settings / copy code / block / add card, etc. | Center-bottom toast + check icon; 2.6 s. | **Relevant**. Restyle only. | `#toast` L2829; CSS L2400–2402; `showToast()` L3034–3039. |
| **GopherBanner** push (G40-306) | `window.GopherBanner.show({…})` — **not yet invoked** in Go. | Frosted top push banner (GO mark, title/sub/time), 4.8 s / tap-dismiss. | **Update** — wire call sites to the 28-banner catalog (**G40-306**). | lib `Final/assets/js/gopher-banner.js` L1–56; loaded `gopher-go.html:11`. |
| `.elite-banner` (Figma concept) | Home / Account boards. | Tier-status / promotion banner. | **Update / verify** — not wired in app; bind to canonical tier; confirm `Pro`→`Elite` naming (see finding #4, G40-199). | `_prototypes/Go/gopher-go-home-figma.html`, `…-account-figma.html`. |
| `.alert-wrap` job-alert (Figma concept) | Worker-flow board: new job nearby. | Navy "glance" push "A job just came in near you" + See/Pass + auto-pass timer. | **Update** — real delivery is a native-OS push; reconcile to `GopherBanner` + G40-306. | `_prototypes/Go/gopher-go-worker-flow-figma.html`. |

> **Payout-failure MODAL** (`#payoutFailOverlay`, reskinned to `.gc-modal` per G40-308) is a modal →
> tracked in **G40-19 / G40-309**, audited under **G40-302**. Its *inline* companion `rh-payfail` is
> the banner-scope row above.

---

## Cross-reference → G40-302 (modals encountered during the sweep, NOT catalogued here)

Request web/mobile: `lowOfferOverlay`, `dupNoticeOverlay`, `agePurchaseOverlay`,
low-availability notice. Connect: `reqLimitOverlay`, `bizUpgradeOverlay`, `bizDowngradeOverlay`,
`hireCapOverlay`, `startEncOverlay`, `incompleteCrewOverlay`, `ageKwOverlay`, `agePurchaseOverlay`,
`earlyCancelOverlay`/`cancelReqOverlay`, `dealsOverlay`. Go: `payoutFailOverlay`, `goReviewOverlay`
(G40-107), `confirmOverlay` (OTP), `rhmOverlay` (history detail). → all belong to the **G40-302**
modal audit.

---

## Canonical push-banner catalog (the reskin target — full spec in G40-306)

28 finalized push banners (15 Request + 13 Go), each with exact copy, trigger, assigned sound, and
on-tap destination, live in **`docs/handoff/G40-306-banner-notifications.html`** (arrays `REQ`/`GO`,
L237–297) with a copy-paste `GopherBanner` template. **This audit's job was to confirm what exists and
where; wiring those call sites is G40-306.**

## Net result for the reskinning dev

- **~24 banner-scope primitives** inventoried with file+line anchors across the three apps.
- **0 obsolete**, **0 copy corrections needed** — the visual refresh is a pure restyle.
- **Update items are wiring/strip-demo, not restyle:** push-catalog call sites (→G40-306), the three
  demo-trigger scaffolds (strip at prod), the Connect recovery timer (→durable job), and the two Go
  Figma concepts (`.elite-banner` tier binding, `.alert-wrap`→native push).
- No prototype code was changed by this audit (nothing was broken or off-flow).
