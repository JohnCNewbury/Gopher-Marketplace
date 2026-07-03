# G40-78 — Cancel an ACCEPTED request (before the Gopher starts): Cancel or instant Repost

**Jira:** G40-78 (Task) · Epic **G40-1 Bug Fixes & Polish** · Label `pay`
**Assignee:** John Newbury
**Surfaces built:** Request web `Final/gopher-request.html` · Connect `Final/gopher-connect.html`
**Scope of this branch:** FRONT-END + UX, demo-grade and complete (John: "front end and UX needs to be
completely finished before handing to dev"). The modals, status-gated routing, and the repost/exclude
state changes are built and verified in-browser. The real re-broadcast push, the dropped-Gopher
notification, and cancellation logging are dev/backend.

---

## What the ticket asks

Let a requestor cancel a request **a Gopher has accepted but has NOT yet marked in-progress**. On
cancel, show a pop-up with two choices: **Cancel** the request, or **instantly put it back out**
(re-broadcast) — so the customer doesn't have to contact support and manually repost. **Once the Gopher
has started (in-progress), cancel is not an option.**

This is the sibling of **G40-40** (which handles cancelling while still *broadcasting / pre-acceptance*).
Together they cover the full requestor-cancel lifecycle:

| Request phase | `r.status` | Cancel behavior | Ticket |
|---|---|---|---|
| Broadcasting, no Gopher yet | `pending`, no hired worker | Early-cancel modal (reassure / re-alert) | G40-40 (built) |
| **Accepted, not started** | `pending` **+ a worker `hired`** | **Cancel or Repost modal** | **G40-78 (this)** |
| In progress | `in-progress` / `active` | **Cancel removed** + note | G40-78 (this) |

## Product decisions — LOCKED (John, 2026-07-02). No open questions.
1. **No cancellation fee** to the requestor before the Gopher starts. (Gopher-side two-strike fees =
   separate ticket G40-81.)
2. **In-progress = cancel removed** — hide the Cancel affordance and show a short note ("Your Gopher has
   started — message them or contact support").
3. **Instant repost** = release the current Gopher, **exclude them from re-accepting** this repost, and
   **notify** them; then re-broadcast the **same** request (same details/price, same record).

---

## ✅ DONE (front-end reference) — `Final/gopher-request.html` and `Final/gopher-connect.html`

Both surfaces share the same design, ported 1:1 (Request uses `gr-*` modal classes, Connect uses `gc-*`).

- **New modal** `#acceptedCancelOverlay` (+ `#acceptedCancelBody`), reusing the existing `.gr-modal` /
  `.gc-modal` primitives. Body rendered by JS.
- **Status-aware routing** in `window.__openCancelModal(dashId)` — the single entry point every cancel
  affordance already calls (request-detail **Cancel Request** button, home-log ✕, in-flow Step-7):
  1. `in-progress`/`active` → `__openStartedCantCancel(id)` — "already in progress" note (defensive; the
     button is also hidden, see below).
  2. `pending` **and a worker is `hired`** → `__openAcceptedCancelModal(id)` — the G40-78 choice modal.
  3. `pending` only → `__openEarlyCancelModal(id)` — G40-40 (unchanged).
  4. else → generic confirm (unchanged).
  Detection of "accepted, not started": `r.status==='pending' && r.interestedWorkers.some(w=>w.status==='hired')`
  (hiring a worker does **not** flip `r.status`; it stays `pending` until Start Job → `in-progress`).
- **The choice modal** (`__openAcceptedCancelModal`): "*[Gopher] accepted but hasn't started yet, so
  you're free to make a change — no fee.*" →
  - **Repost to new Gophers** (primary) → `doRepost()`: pushes each hired worker's id into
    `r.excludedGophers`, removes them from `interestedWorkers`, sets `r.status='pending'`,
    `statusLabel='Reposted · Live'`, `needsAttention=true`, re-renders, and shows a "Done — we're on it"
    confirmation panel.
  - **Cancel request** (danger text) → `__cancelDashboardRequest(id)` → files into
    `cancelledRequests` and routes to Previous Requests (existing path, unchanged).
- **In-progress gate** in `renderRequestDetail`: when `r.status` is `in-progress`/`active`, the header
  `#reqDetailCancelBtn` is hidden (`display:none`) and a `.req-detail-started-note` is shown in the
  header. New CSS rule added in both files.
- **Demo helpers** (console): `__previewAcceptedCancel()` and `__previewStartedCantCancel()` render
  either state without needing a live hired request (matches the G40-40 `__previewEarlyCancel` convention).

### Verified in-browser (local static server)
Both pages: inline script parses clean, all four globals register
(`__openAcceptedCancelModal`, `__openStartedCantCancel`, updated `__openCancelModal`, previews), the
overlay is in the DOM, both modal states render with correct copy/buttons ("Repost to new Gophers" /
"Cancel request"; "This request is already in progress"), and **zero console errors**. Screenshot of the
Request modal captured. (The router→repost state mutation runs on `DASH_DATA`, which is IIFE-scoped, so
it was validated by code review against the existing, working `__cancelDashboardRequest` /
`__openEarlyCancelModal` patterns rather than from the console.)

### Preview it
Open a request that has a **hired** Gopher but hasn't started, tap **Cancel Request** → the Cancel/Repost
modal. Console: `__previewAcceptedCancel()` / `__previewStartedCantCancel()` force either state.

---

## 🔧 TO BUILD (developer / backend)
- **Real re-broadcast** on Repost: release the assigned Gopher and push a fresh broadcast to nearby
  Gophers for the SAME order record (no new order number needed; keep details/price). The prototype flips
  `r.status` back to `pending` and shows a confirmation.
- **Exclude + notify the dropped Gopher:** honor `r.excludedGophers` server-side so the released Gopher
  can't re-accept this repost, and send them a "your assignment was cancelled" notification (BACKEND
  SEAM — the prototype records the exclusion and stubs the notify).
- **Enforce the in-progress cutoff server-side:** cancel/repost must be rejected once the order is
  in-progress, regardless of client state. The client hides the button; the server is the gate.
- **No fee** path (confirm the cancel endpoint charges nothing pre-start).
- **Cancellation logging** on the Cancel path (same seam as G40-9 `logCancellation`).
- **Native mobile app:** apply the same status-gated logic (Cancel/Repost while accepted-not-started;
  remove Cancel once in-progress). The mobile prototype `_prototypes/Request/gopher-request-inprogress.html`
  is a single in-progress screen (a G40-9 auto-repost *component demo*), so it already illustrates the
  "started = can't cancel" end-state but has no live accepted-state screen to host this modal — build it
  on the real "finding/assigned your Gopher" screen.

## Acceptance criteria → where it lives
| Ticket rule | Front-end (done) | Backend (to build) |
|---|---|---|
| Cancel allowed only before Gopher marks in-progress | `__openCancelModal` routing + detail-button gate | server-enforced cutoff |
| Pop-up: Cancel **or** instantly put back out | `__openAcceptedCancelModal` (Repost / Cancel) | — |
| Instant repost avoids support + manual repost | `doRepost` → same record, back to broadcasting | real re-broadcast push |
| Dropped Gopher excluded + notified | `r.excludedGophers` + notify stub | enforce exclusion + send notice |
| Started → cancel not an option | button hidden + `.req-detail-started-note` | reject cancel server-side |
| No cancel fee before start | (no charge in flow) | confirm endpoint charges $0 |

## Notes
- Cross-reference **G40-9** (Gopher-initiated cancel → auto-repost) and **G40-40** (pre-acceptance
  early-cancel): all three share the re-broadcast concept and the `__cancelDashboardRequest` file-into-
  Cancelled path. Keep one re-broadcast implementation.
- Scheduled requests are **out of scope** here — their cancel/reschedule lives under the G40-80 umbrella.
- Single entry point `__openCancelModal(dashId)` means every existing cancel affordance (detail button,
  home ✕, Step-7) automatically gets the correct status-aware flow — no per-call-site changes.
