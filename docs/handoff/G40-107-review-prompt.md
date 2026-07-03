# G40-107 — App-store review prompt for engaged users (both apps)

**Jira:** G40-107 (Task) · Epic **G40-1 Bug Fixes & Polish** · Label `spine`
**Assignee:** John Newbury
**Surfaces built:** Request web `Final/gopher-request.html` · Gopher Go `Final/gopher-go.html`
**Scope of this branch:** FRONT-END + UX, complete and verified in-browser. The branded pre-prompt gate,
its per-app copy, eligibility gating, once-per-session behavior, and the "Rate us → native" seam are
built. The native store-review call and the server-side eligibility (completed-count / 7-day velocity)
are dev/backend.

---

## What the ticket asks (eligibility REWRITTEN by John, 2026-07-02)

Nudge engaged, happy users to leave a store review at a positive moment, using the **platform-native**
review APIs (`SKStoreReviewController` on iOS, Play In-App Review `ReviewManager` on Android), which
carry their own OS rate limits. **A branded pre-prompt gate is shown first** ("Rate us / Not now"); only
on **Rate us** does the app call the native API. This lets us ask in our own voice and keeps the native
prompt for users who opt in.

> **The original 3-in-a-row + all-5-star eligibility is REPLACED.** New triggers:
> - **Gopher Request (Requestor):** eligible when a user with **≥ 5 completed requests** opens
>   **Request History**. The pre-prompt shows there.
> - **Gopher Go (Gopher):** eligible after **≥ 7 completed requests within a rolling 7-day window.**
>   The real trigger fires **post-completion** when that threshold is hit.

Unchanged from the prior spec: native APIs only (no custom prompt that bypasses them), OS enforces its
own rate limit (iOS ≤ 3 / 365 days), the app **never tracks** whether a review was left (the APIs don't
expose it), and the whole feature should sit behind a **feature flag**.

---

## ✅ DONE (front-end reference)

### Request web — `Final/gopher-request.html`
- New modal `#reviewPromptOverlay` (+ `#reviewPromptBody`), reusing the `.gr-modal` primitives.
- `initReviewPrompt` IIFE exposes `window.__maybeReviewPrompt('request')` and a demo helper
  `window.__previewReviewPrompt()`.
- **Eligibility gate:** `completedCount() = DASH_DATA.previousRequests.length >= 5`, shown **once per
  session**. Copy: *"Enjoying Gopher? You've completed N requests with us — thank you! … a quick App
  Store rating helps your neighbors find us."* Buttons **Rate us** / **Not now**.
- **Trigger:** hooked into `showSection('previous')` (Request History) — deferred 350 ms so the section
  paints first.
- **Rate us → seam:** swaps to a "Thank you — this is where the App Store review prompt opens" panel.
  That click is the `SKStoreReviewController.requestReview()` / Play `ReviewManager` call in production.

### Gopher Go — `Final/gopher-go.html`
- New modal `#goReviewOverlay` (+ `#goReviewBody`), reusing the `.gc-modal` primitives (dark theme).
- `initGoReviewPrompt` IIFE exposes `window.__maybeReviewPrompt('go')` + `window.__previewReviewPrompt()`.
- **Eligibility gate:** `eligible() = _completedThisWeek >= 7` — a **prototype stub** (`_completedThisWeek`,
  seeded 9) that the dev replaces with the **server's rolling-7-day completed count**. Shown once/session.
  Copy: *"Enjoy earning with Gopher Go? You've completed N jobs this week — nice work! …"* Rate us / Not now.
- **Trigger (prototype):** hooked into Request History open (`show('history')`) as a demonstrable surface.
  **Production trigger is post-completion** when the 7-in-7-day threshold is crossed — see below.
- **Rate us → seam:** same native-call seam as Request.

### Verified in-browser (local static server)
Both pages: inline script parses clean, `__maybeReviewPrompt` + `__previewReviewPrompt` register, the
modal renders with correct per-app copy and live counts (Request "6", Go "9"), the **eligibility gate**
fires only when the threshold is met, the **once-per-session guard** blocks re-showing, and **Rate us**
swaps to the native-seam thank-you panel. **Zero console errors.** Screenshots captured for both.

### Preview it
- Request: open **Request History** with ≥5 completed (the demo has 6) → the pre-prompt appears. Console:
  `__previewReviewPrompt()` forces it.
- Go: open **Request History** (demo Gopher is seeded eligible) → the pre-prompt appears. Console:
  `__previewReviewPrompt()` forces it.

---

## 🔧 TO BUILD (developer / backend + native)

- **Native review call** on "Rate us": iOS `SKStoreReviewController.requestReview()` (scene-based on
  iOS 14+); Android Play In-App Review via `ReviewManager`. OS renders its own prompt and enforces its own
  rate limit; do **not** track the outcome.
- **Server-side eligibility:**
  - *Request:* count of **completed** requests ≥ 5 for the user (lifetime). Expose to the client so the
    pre-prompt can gate on it when Request History opens.
  - *Go:* **rolling 7-day** count of completed requests ≥ 7. Compute post-completion; set a
    `should_prompt_review` flag the client reads (replaces the `_completedThisWeek` stub).
- **Trigger wiring:**
  - *Request:* on Request-History open, if eligible and not recently prompted → show the gate.
  - *Go:* fire **after an order completes** when the 7-in-7 threshold is crossed (the prototype uses
    history-open only because a static page has no live completion event).
- **Feature flag** around the whole feature for quick rollback.
- **Frequency:** rely on the OS rate limit; optionally add a server-side "don't re-ask for N days" guard
  so the branded gate itself isn't shown too often (the prototype shows once per session).

## Acceptance criteria → where it lives
| Rule (rewritten) | Front-end (done) | Backend/native (to build) |
|---|---|---|
| Request: ≥5 completed + opens History → gate | `__maybeReviewPrompt('request')` on `showSection('previous')` | server completed-count |
| Go: ≥7 completed in 7 days → gate | `__maybeReviewPrompt('go')` + `eligible()` stub | rolling-7-day server flag, post-completion trigger |
| Branded gate first, native only on "Rate us" | both modals + Rate us/Not now | native API call |
| OS rate limit respected, outcome not tracked | (no tracking in flow) | native APIs enforce |
| Behind a feature flag | — | feature flag |

## Notes
- "Both apps" = **Request + Go** (not Connect).
- Per-app copy is intentionally distinct: Requestor = "Enjoying Gopher?"; Gopher = "Enjoy earning with
  Gopher Go?".
- The gate replaces the un-styleable native prompt as the place for brand voice; the native prompt still
  does the actual review capture (store-policy compliant).
- Prior spec's 3-in-a-row streak + all-5-star-given criteria and their acceptance scenarios are
  **obsolete** — superseded by the completed-count / 7-day-velocity triggers above.
