# Production-Readiness Audit — `gopher-connect.html` & `gopher-request.html`

_Generated: 2026-06-26 · Read-only audit — no files modified._

These two pages are intended to become the **real product front end** (the web version
of the Gopher Request app), so they are judged here as production code, not throwaway
prototype. Scope is **these two files only**. Findings are grouped by severity
(Critical / Major / Minor) and tagged by dimension: `[JS]` robustness, `[State]`,
`[A11y]`, `[Mobile]`, `[Backend]`, `[Struct]`, `[Perf]`.

**Method.** Targeted `grep` + range reads over the two multi-MB files, plus two deep
per-file passes, cross-checked against direct measurement. A few raw counts were
**calibrated** (e.g. duplicate IDs are ~4–6 per file, not "50+"; `id="${r.id}"` is a
template literal that emits unique IDs at runtime, not a static duplicate).

## Baseline metrics

| Metric | connect | request | Note |
|---|---|---|---|
| Size / lines | **5.5 MB** / 18,695 | **2.7 MB** / 20,937 | request already lighter after the image-swap phase |
| `<script>` blocks (all inline, 0 external, 0 `defer`) | 7 | 11 | render-blocking |
| `addEventListener` vs `removeEventListener` | 357 / 10 | 290 / 3 | leak risk |
| `setInterval`/`setTimeout` vs clears | 1+20 / 1+4 | 1+16 / 3+2 | mostly cleared, a few not |
| `localStorage` / `sessionStorage` | 0 / 0 | 0 / 0 | **nothing persists** |
| Duplicate element IDs (distinct) | ~4 | ~6 | calibrated |
| `<img>` missing `alt` | 0 | 4 | request: lines 1318–1321, 1967 |
| `position:fixed` / hardcoded `width:NNNpx` | 11 / 88 | 11 / 110 | mobile risk |
| Inline `onclick` | 13 | 18 | CSP / componentization |

---

# `gopher-connect.html`

## 🔴 Critical

- **`[JS][Perf]` Listener leak in `render()` (line 11305; second `render()` at 18237).**
  `render()` rewrites `innerHTML` and re-attaches ~100 listeners on every state change
  (toggles, counters, steps, calendar, payment). 357 `addEventListener` vs 10
  `removeEventListener`; the `dataset.wired` guard appears only **4** times, so most
  re-binds are unguarded. **Why:** duplicate handlers fire N× after N renders, memory
  grows unbounded across a session, and the page slows progressively. **Fix:** event
  delegation on a stable container (identify targets via `data-*`), or a render that
  preserves DOM (diffing) instead of `innerHTML` replacement.
- **`[State]` Nothing persists; full loss on reload/back/crash (state at ~9719).** All
  state is an in-memory object — no `localStorage`/`sessionStorage`/URL state. A refresh
  or accidental back mid-flow discards everything entered. **Fix:** debounced
  `sessionStorage` draft (excluding card data) restored on init, or backend draft save.
- **`[Backend]` Faked calls have no failure/timeout/empty/loading handling.** The Stripe
  "seam" (upgrade 17538, downgrade 17573, cancel 17586, business signup 18158) only
  `console.log('(simulated)')`; the Ask-Gopher KB (`ask()` ~16246) fakes a delay then
  returns hardcoded data; hire/message-worker (11685/11693) and feedback (16320) are
  no-ops; `__createDashboardRequest` (15814) writes in-memory. **Why:** real network
  calls fail/timeout/return empty — none of these have error UI, retries, loading
  states, or idempotency. **Fix:** wrap each in async with timeout (`AbortController`),
  loading + error + empty states, and idempotency tokens. (See
  [unfinished-functions.md](unfinished-functions.md) for the full list.)
- **`[JS]` No double-submit guard on request submit (handler ~11901–11950).** The submit
  path calls `captureRequestToDashboard()` without disabling the button or an in-flight
  flag. **Why:** a rapid double-click creates duplicate requests (and, once payments are
  real, double charges). **Fix:** disable + "Submitting…" on first click; re-enable only
  on resolved success/failure.
- **`[A11y]` Modals/popovers lack focus management (dialogs at 7093, 7109, 7121, 7134,
  7170, 7182, 7194, 7240, 7278, 7292, 7303; Esc handlers at 9132, 13282, 13455, 13502,
  13624, 13911, 13953, 13997, 14611).** `role="dialog"` is present but focus isn't moved
  in, trapped, or restored, and multiple document-level Esc listeners accumulate (added
  on open, not removed on close). **Why:** keyboard/SR users can tab behind the modal and
  Esc behaves unpredictably; WCAG 2.1 AA failure. **Fix:** on open move focus to first
  control + trap Tab; on close remove the Esc listener by reference and restore focus.

## 🟠 Major

- **`[Backend][Security]` Raw card data handled client-side (9118–9176).** Card number is
  read into state (9159) and rendered to a preview (9118). Today it's the `4242…` test
  card, but the *pattern* — full PAN in JS/DOM — is PCI-noncompliant. **Fix:** never hold
  the PAN; tokenize via the PSP (Stripe Elements/Square), show only last-4.
- **`[Struct]` Duplicate IDs:** `ph-avatar-img` ×3 (8720, 17059, 17130),
  `seeWorkersInDashboard` ×2 (11021, 11095), `snPhotoInitials` ×2 (6813, 17831).
  `getElementById` returns only the first; second instances are unreachable and it
  breaks once componentized. **Fix:** unique IDs or `data-*` + scoped `querySelector`.
- **`[JS]` Silent `try/catch(e){}` swallows errors (6615, 6663, 6669, 11486, 11559,
  12028, 13380, 18043).** Failures vanish with no log. **Fix:** log/handle specific
  errors; don't blanket-swallow.
- **`[Perf]` 5.5 MB page, all-inline render-blocking scripts (7 blocks, no `defer`),
  heavy base64.** Slow FCP/TTI on mobile; no caching benefit. **Fix:** externalize
  scripts (+`defer`), extract base64 assets (see
  [base64-image-plan.md](base64-image-plan.md) — connect not yet processed), enable
  compression.
- **`[Mobile]` ~88 hardcoded `width:NNNpx` + 11 `position:fixed` overlays.** Fixed widths
  >320px overflow small screens; fixed overlays fight the mobile keyboard. **Fix:**
  `min()/clamp()`/`max-width`, test overlays with on-screen keyboard.
- **`[JS][Security]` `innerHTML` with interpolated data (e.g. 11314, 13090, 13483, +).**
  Safe with today's static data, but an **XSS vector once real user/merchant data flows
  in**. **Fix:** `textContent` for data, or sanitize (DOMPurify) where HTML is intended.
- **`[Backend]` Debounced AI match (`setTimeout … 850ms`, ~9938) has no timeout/error
  path** — a slow/offline backend leaves a permanent spinner. **Fix:** race with a
  timeout, render an error/empty state.

## 🟡 Minor

- `[Struct]` 13 inline `onclick` (e.g. 7973, 10150, 10329, 11041) — break strict CSP and
  componentization; move to `addEventListener`.
- `[JS]` Global `scroll` listener never removed (6545) — harmless on a static page, leaks
  in an SPA shell.
- `[JS]` Promo "Apply" errors on empty input (9537); price field allows malformed decimals
  (11461); calendar nav has no year bounds (11585).
- `[JS]` Magic strings for categories/status/windows scattered — centralize as constants.

---

# `gopher-request.html`

## 🔴 Critical

- **`[State]` Misleading "saved automatically" copy + total loss on reload (9194, 13786,
  13791; state at 11566).** The UI literally tells users *"Your information is saved
  automatically,"* but there is **no persistence** — refresh/crash discards the whole
  in-progress request. **Why:** this is a broken user promise, not just a gap. **Fix:**
  actually persist a draft (sessionStorage/backend) or remove the claim and warn on
  unload.
- **`[JS][Perf]` Listener leak across re-renders (290 add / 3 remove; payment re-render
  10697–10722; modals 11130–11150).** `__renderPayMethods` re-binds on every toggle/render
  without removing old listeners (`dataset.wired` used only twice). **Why:** "Remove
  payment method" and modal Esc fire multiple times after repeated opens; memory grows.
  **Fix:** delegation or remove-before-rebind; keep modal DOM alive instead of recreating.
- **`[JS]` No double-submit / double-back guard (submit ~13961–14013 calls
  `submitRequestAndCapture` 11544; back handler 13959).** Submit isn't disabled in-flight
  → duplicate requests; back has no debounce → double-click skips a step. **Fix:**
  in-flight flag + disable on submit; debounce nav buttons.
- **`[Backend]` Faked calls with no failure/timeout/empty/loading handling:**
  `analyzeUpload` stub (15030) — spinner hangs forever if a real API stalls (no timeout/
  cancel/skip); promo `tryApplyPromo` (10790) — sync stub, no server-error/retry/loading;
  ID-verify upload (12015–12125) — no rejection feedback/retry; `submitRequestAndCapture`
  (11544) — return value unchecked, silent failure; feedback `fetch('/api/feedback')`
  commented (19847) — shows "Thanks!" but sends nothing. **Fix:** async + timeout +
  error/empty/loading UI for each.
- **`[State]` `__resetRequestFlow` (14017) has no confirmation; ID-verify state persists
  across requests (11605).** Dashboard can wipe an in-progress request silently; stale ID
  metadata can carry into the next request. **Fix:** confirm reset when `step>1`; clear
  per-request verification state.

## 🟠 Major

- **`[A11y]` Payment labels not associated with inputs (10576–10582).** `<label>` wraps the
  field but has no `for=` (and inputs would still benefit from explicit linkage); custom
  toggle lacks `role="switch"`/`aria-checked` (10623). **Fix:** add `for=`/`id` pairs and
  proper ARIA on custom controls.
- **`[A11y]` 4 `<img>` without `alt` (1318–1321, 1967).** **Fix:** add `alt` (or `alt=""`
  if decorative).
- **`[A11y]` Modals lack focus trap / Esc (payment 10595–10622; address 12912–12926).**
  Same pattern as connect. **Fix:** focus-in/trap/restore; Esc to close.
- **`[Struct]` Duplicate IDs:** `aiInput`, `toggleSchedule`, `rqSuPhotoInitials`,
  `rqInfoLastSignin`, `rqCompletePhotoInitials`, `aiScopeLabel` each ×2. **Fix:** unique
  IDs / scoped queries.
- **`[Backend]` Payment & address validation are client-only (10640; 12912).** No
  server verify-card / geocoding → declined cards and bad addresses have no correction
  path. **Fix:** server validation with field-level error recovery.
- **`[Mobile]` ~110 hardcoded `width:NNNpx`; touch targets <44px (e.g. 28px @2152, 22px
  @2372, 16px @2204, 14px @2378); 11 `position:fixed` overlays vs mobile keyboard.**
  **Fix:** responsive units, 44px min targets, keyboard testing.
- **`[Perf]` 2.7 MB, 11 inline render-blocking scripts (no `defer`), base64 bloat.**
  (Already reduced ~287 KB by the image-swap phase.) **Fix:** externalize/`defer` scripts,
  finish base64 extraction.
- **`[JS][Security]` Unescaped `state.description` rendered via `innerHTML` (11490, 12835)**
  — XSS once it's real user input. **Fix:** escape/`textContent`.
- **`[JS]` Schedule can be submitted invalid (11657; gate at 13108) and past dates aren't
  validated (12840).** **Fix:** validate in `submitRequestAndCapture` before capture.
- **`[A11y]` Color-only meaning in fee/discount text (5220).** **Fix:** add icon/text
  prefix, not just green.

## 🟡 Minor

- `[Struct]` 18 inline `onclick` (e.g. 14757, 14942, 15055) — CSP/componentization.
- `[JS]` Promo state not reset on category change (11587) — stale discount.
- `[Perf]` CSS unminified; no resource hints (`preload`/`prefetch`).

---

# Cross-cutting themes (both pages)

1. **The render-by-`innerHTML`-and-rebind pattern is the root cause** of the leak,
   double-fire, and "breaks on repeated use" findings. Fixing it once (delegation or a
   real view layer) resolves a whole class of issues on both pages.
2. **No persistence layer.** Both lose everything on reload; request actively claims it
   saves. This is the highest user-facing risk.
3. **No network-failure model.** Every faked call assumes success; production needs a
   uniform loading/error/empty/timeout/retry convention before any backend is wired.
4. **Accessibility for custom widgets** (modals, toggles, popovers) is the largest
   compliance gap — focus management is essentially absent.
5. **Weight + all-inline scripts** hurt mobile load; the base64/component work already
   scoped in the other handoff docs addresses most of it.

# Must-fix before production (prioritized)

1. **Replace the re-render/rebind pattern** with event delegation or a view layer — kills
   the listener leak + multi-fire bugs on both pages.
2. **Add state persistence** (draft save/restore) and **fix the misleading "saved
   automatically" copy** in request.
3. **Add a network-call convention** (loading/error/empty/timeout/retry/idempotency) and
   apply it to every faked call before wiring the backend.
4. **Double-submit/double-nav guards** on request submit, back, and all payment actions.
5. **Stop handling raw card data client-side** — tokenize via a PSP; never store/show PAN.
6. **Accessibility pass on modals/toggles** — focus trap + restore, Esc, labels/`for`,
   missing `alt`, ARIA on custom controls; remove color-only meaning.
7. **Resolve duplicate IDs** and move off inline `onclick` (CSP + componentization).
8. **Performance**: externalize + `defer` scripts, finish base64 extraction, compress.
9. **Escape user data** rendered via `innerHTML` before real data flows in.
10. **Mobile**: responsive widths, 44px touch targets, keyboard-vs-fixed-overlay testing.

# Verdict

| Page | Verdict | Rationale |
|---|---|---|
| `gopher-connect.html` | **Prototype-grade — needs hardening** | Strong, complete UX choreography, but the listener leak, zero persistence, no backend-failure model, absent modal a11y, raw-card handling, and 5.5 MB weight are all blockers. The structure is a solid blueprint; the JS layer needs a real rebuild, not patches. |
| `gopher-request.html` | **Prototype-grade — needs hardening** | Same class of issues, plus a *user-facing false promise* ("saved automatically") and a more complex multi-step/payment/ID flow that multiplies the double-submit, validation, and a11y surface. Closest to "the real app" in intent, furthest in hardening required. |

Neither page is near-ready as-is. Both are excellent **functional specifications** of the
product; the recommended path (see [component-structure.md](component-structure.md)) is to
rebuild the front end as components with a real state layer and backend, using these pages
as the definitive reference for behavior and copy — not to incrementally patch the inline
JS in place.
