# G40-40 — Early-cancellation pop-up & logic (broadcasting, pre-acceptance)

**Jira:** G40-40 (Task, High) · Epic **G40-1 Bug Fixes & Polish** · Label `request`
**Assignee:** John Newbury
**Surfaces:** Request web `Final/gopher-request.html` · Connect `Final/gopher-connect.html` · Request mobile app `_prototypes/Request/gopher-request-inprogress.html`
**Scope of this branch:** FRONT-END, demo-grade. The two pop-ups + the variant logic are built and wired to the live coverage data layer where present; the real re-broadcast push, the true completed-order count, and cancellation logging are dev/backend.

---

## What the ticket asks

While a request is **broadcasting but not yet accepted**, cancelling should show a smart pop-up:
- **Variant A** — within **20 min** of submit AND strong local coverage (**>20 Gophers with ≥1 completed order in the area**) → reassure/encourage to wait.
- **Variant B** — otherwise (>20 min, or weak coverage) → standard.
- **Still need it** → re-broadcast to local Gophers; request info stays as-is (so less time left).
- **Still cancel** → cancel the request.

**Copy decision (John, this session):** the Figma (node 52-14911) is **outdated / previous UX** — the copy was written **new and on-brand** for this build, not lifted from Figma.

---

## ✅ DONE (front-end reference)

### Request web — `Final/gopher-request.html`
- New modal `#earlyCancelOverlay` (reuses the `.gr-modal` pattern), body rendered by JS per variant.
- **Interception:** `window.__openCancelModal(dashId)` now checks the request — if `status === 'pending'`
  (broadcasting, pre-acceptance) it routes to `window.__openEarlyCancelModal(dashId)` instead of the
  generic "Cancel this request?" confirm. Accepted/in-progress requests keep the old flow untouched.
- **Variant logic** (`pickVariant`): `elapsedMin ≤ 20` (from a new `submittedAt` stamp on the request)
  AND `strong` coverage → A, else B.
- **Coverage is LIVE:** `coverageFor()` derives an area from the request's drop-off/pickup and calls
  `GopherIQData.lookup()` — mapping `workers > 20` = ">20 Gophers" and `activeLast3mo ≥ 1` = "≥1
  completed order in the area." Falls back to a representative strong-coverage value when the location
  isn't resolvable/known.
- **Still need it** → in-modal confirmation panel ("On it! We've sent a fresh alert…"). **Still cancel**
  → existing `__cancelDashboardRequest(id)` path → files into Cancelled.

### Connect — `Final/gopher-connect.html`
- Same flow, ported to Connect's `.gc-modal` primitives and its single-arg `__openCancelModal(dashId)`.
- Connect does **not** load `gopher-iq-data.js`, so coverage uses the representative fallback (variant
  logic still works: fresh → A, older → B). Optional future polish: add
  `<script src="gopher-iq-data.js"></script>` to Connect to make coverage live there too.

### Request mobile app — `_prototypes/Request/gopher-request-inprogress.html`
- Bottom-sheet rendition (`#ecOvl`, reusing the `.g40-ovl/.g40-sheet` pattern) with both variants +
  Still need it / Still cancel, behind a **Demo** trigger (matches the existing G40-9 demo convention).
- ⚠️ This standalone screen is the **In-Progress (post-acceptance)** view, so there is no live
  broadcasting request to hang this on — it's included as a **component demo**. In production it belongs
  on the "finding your Gopher" (broadcasting) screen.
- Follow-up: the phone-frame **simulator** `gopher-request-prototype.html` embeds this screen as base64
  `srcdoc`; it still shows the pre-G40-40 copy until re-embedded (same re-embed step G40-9 used).

### Preview it
- Web/Connect: open a request detail while it's **Pending** and tap **Cancel** → variant A (fresh).
  Console: `__previewEarlyCancel('A')` / `__previewEarlyCancel('B')` forces either variant.
- Mobile: the **Demo** bar buttons "Preview: strong coverage" / "Preview: standard."

---

## 🔧 TO BUILD (developer / backend)
- **Real re-broadcast** on "Still need it": push a fresh notification to local Gophers; keep the
  request record and its original broadcast window intact (no timer reset — less time remains). The
  prototype shows a confirmation panel and logs a `[G40-40 BACKEND SEAM]` marker (mobile).
- **True coverage count:** the "≥1 completed order in the area" gate must come from live order data,
  not the iQ static table (the prototype uses `GopherIQData` as the stand-in).
- **Cancellation logging** on "Still cancel" (same seam as G40-9's `logCancellation`).
- **Host the modal on the real broadcasting/"finding a Gopher" screen** in the native apps, and wire
  the 20-min window to the true server-side submit time.

## Acceptance criteria → where it lives
| Ticket rule | Front-end (done) | Backend (to build) |
|---|---|---|
| <20 min + >20 Gophers w/ ≥1 completed order → variant A | `pickVariant` + `GopherIQData.lookup` | live completed-order count |
| >20 min / else → variant B | `pickVariant` fallback | — |
| "Still need!" → re-notify local Gophers, info stays current | confirmation panel; request untouched | real push, keep broadcast window |
| "Still cancel" → request cancelled | routes to `__cancelDashboardRequest` | server cancel + logging |

## Notes
- New `submittedAt: Date.now()` stamp added to `__createDashboardRequest` in both web + Connect.
- Only `status === 'pending'` cancels are intercepted — accepted/in-progress and in-flow (Step-7,
  delete-X callback) cancels are unchanged.
- Copy is intentionally new/on-brand; Figma 52-14911 is stale and should not be used as the source.
