# Requester-initiated cancel in the LIVE app pair — audit & gap spec (G40-40 / G40-78)

**Requested by:** John Newbury, 2026-07-17 (App Prototypes session)
**Scope of this note:** AUDIT ONLY — no wiring has been done. This documents exactly how the
live split-screen pair is coded today ("what IS") and what must change to conform to the
locked G40-40 / G40-78 requirements ("what's NEEDED"), so the implementation pass — and the
production dev after it — can be checked against a written spec instead of memory.
**Surfaces audited:** `_prototypes/Request/gopher-request-home.html` ·
`_prototypes/Request/gopher-request-flow.html` ·
`_prototypes/Request/gopher-request-inprogress.html` · `_prototypes/split-screen.html`
(harness) · `_prototypes/Go/gopher-go-prototype.html`
**Reference implementations (source of truth to port):** `Final/gopher-request.html`
`window.__openCancelModal(dashId)` status-aware router (+ `__openEarlyCancelModal`,
`__openAcceptedCancelModal`, `__openStartedCantCancel`) and the same in
`Final/gopher-connect.html` (`gc-*`). Ticket docs: `G40-40-early-cancellation.md`,
`G40-78-accepted-cancellation.md`, `G40-81-cancellation-fee-system.md` (fees, separate).

---

## The requirements (locked — G40-78 doc, John 2026-07-02)

| Request phase | Live-pair state | Cancel behavior required | Ticket |
|---|---|---|---|
| Broadcasting, no Gopher yet | `stage:'searching'` | Early-cancel modal: Variant A (≤20 min since submit AND strong coverage → reassure) else Variant B; **Still need it** → re-broadcast, same request, less time left; **Still cancel** → cancel | G40-40 |
| Accepted, not started | `stage:'active'` and **no** `substage` | **Cancel or Repost** modal. Repost = release the Gopher, **exclude them from re-accepting**, **notify them**, re-broadcast the **same record** (same order #) | G40-78 |
| In progress | `substage` set (`inprogress`/`items`/`completed`) | **Cancel removed** + note: "Your Gopher has started — message them or contact support" | G40-78 |

No cancellation fee to the requester pre-start (Gopher-side two-strike fees = G40-81, out of
scope here). NOTE the order-# contrast: G40-78's repost keeps the **same record/order #**
(re-broadcast); G40-9's Gopher-cancel recovery mints a **new** order # — do not conflate.

## WHAT IS — how the live pair is coded today

**1. Home (`gopher-request-home.html`) has NO requester-cancel affordance at all.**
- The card "×" is `DEMO_SHOW_CARD_DISMISS` (line ~924) → `GReq.remove(order)` — it silently
  **deletes** the record in ANY state, including accepted/active. The code's own comment says
  it "MUST be false/removed for the live prototype." It does not relay anything to the Go
  phone: an available or accepted job over there stays live → permanent stale state.
- `openDetails()` (submitted/scheduled view) — read-only rows, no Cancel button.
- `openLiveTracker()` (active view) — zero cancel affordances (verified by search).

**2. The flow's Step-7 "Cancel request" is broken in the live pair.**
`gopher-request-flow.html` step 7 renders a "Cancel request" button whose handler is a native
`confirm('Cancel this request?')` → `resetAll()` (line ~2254 → ~2332). `resetAll()` only
clears the flow's own state (`gopher_pending`) — **the GReq record is untouched**, so after
the user "cancels," the request keeps broadcasting on Home and stays live on the Go phone.
The UI tells the user it cancelled; nothing cancelled. This is the single worst IS-item.

**3. G40-40 exists only as an unreachable component demo.**
`gopher-request-inprogress.html` carries `initEarlyCancelMobile()` — the correct Variant A/B
sheet with the right copy — but it sits behind a "Demo" preview bar on the post-acceptance
In-Progress screen (its own comment: "In production it lives on the 'finding your Gopher'
screen… shown here as a component demo"). "Still cancel" is a `console.log` backend seam.
Nothing in the live pair routes to it.

**4. G40-78 is not present in the live pair in any form.** The state distinction it needs
DOES already exist implicitly: `stage:'active'` with no `substage` = accepted-not-started
(the harness accept relay sets exactly this); `substage` set = started.

**5. The harness has no requester→Go cancel relay.** Only the Go→Request direction exists
(`watchGoCancel`, added for G40-9). If the requester cancels by any current means, the Go
phone is never told.

**6. Useful rails that already exist** (build on these, don't duplicate):
- `watchNative` re-injects a record whose `resubmitSeq` bumps — this is the natural
  "Still need it → re-alert Gophers" mechanism (G40-40) with no new machinery.
- `submittedAt` is now stamped on every record (added 2026-07-17 for the expiry countdown) —
  this is the Variant-A "≤20 min since submit" input.
- The Go side already excludes `cancelled` jobs from Available/Active/counts and has the
  Request-History cancelled row (added 2026-07-17 for G40-9).
- Home's `gSheet`/`gModal` primitives and the G40-9 module (`__gopherCancelled`) show the
  established idiom for exactly this kind of sheet.

## WHAT'S NEEDED — changes to conform

**A. Request home — port the web's status-aware router** (from `Final/gopher-request.html`
`__openCancelModal`):
1. Add a real Cancel affordance on the home card / details / live-tracker views (replacing
   the demo "×" in the live pair; set `DEMO_SHOW_CARD_DISMISS=false` for pt mode or remove).
2. Route by state: `searching` → early-cancel sheet (G40-40) · `active` + no `substage` →
   Cancel-or-Repost sheet (G40-78) · `substage` set → no cancel affordance at all, show the
   started-note instead.
3. G40-40 sheet: Variant A when `Date.now()-submittedAt ≤ 20 min` AND strong coverage (web
   uses the live coverage layer; the pair can stub "strong" or reuse the same numbers), else
   Variant B. **Still need it** → `GReq.update(order,{resubmitSeq:+1})` (harness re-alerts
   the Go phone automatically) — expiry clock is NOT reset (spec: "less time left").
   **Still cancel** → mark `cancelled:1` (record leaves home per `statusBucket`).
4. G40-78 sheet: **Cancel** → `cancelled:1`, no fee messaging. **Repost instantly** → clear
   `hired`/`accepted`, back to `stage:'searching'`, same order #, stamp
   `excludeGopher:<name>`; requester card returns to Submitted with the expiry countdown.

**B. Harness — add the requester→Go relay** (`watchReqCancel` mirroring `watchGoCancel`):
- On `cancelled:1` for a relayed order: mark the Go-side job cancelled-by-requester → it
  leaves Available/Active; if it was accepted, fire the Go banner ("Request cancelled by the
  requester") and add the history row ("Cancelled by requester — no earnings impact").
- On a G40-78 repost: notify the dropped Gopher (banner + history), and respect
  `excludeGopher` when re-broadcasting.
- ⚠️ **1-Gopher demo caveat:** the demo Go phone has exactly one Gopher (Marcus). A G40-78
  repost that excludes Marcus is invisible on the right phone. Decide before building:
  either (a) honor the exclusion and have the harness status line narrate it ("re-broadcast
  excludes Marcus — other Gophers would see it"), or (b) demo-only bypass of the exclusion
  with a clearly-labeled note. Recommendation: (a) — it demonstrates the real rule.

**C. Go app** — new cancelled-by-requester presentation: distinct history sub-line (today's
cancelled row says "You cancelled after accepting", which is wrong for this direction) and
the dropped-Gopher notification for the G40-78 repost path.

**D. Flow Step-7** — delete the `confirm()`/`resetAll()` path and route through the same
router (or navigate Home and open it there). Under no circumstance may "Cancel" leave the
record broadcasting.

**E. Backend seams to tag** (same convention as G40-9): real re-broadcast push, dropped-
Gopher notification, exclusion enforcement in matching, cancellation logging, coverage
signal for Variant A. Fees: none to requester pre-start; Gopher-side strikes are G40-81.

## Acceptance checks for the implementation pass

- [ ] Cancel a broadcasting request → Variant A/B sheet (correct variant by age), Still-need-it
      re-alerts the Go phone (fresh notification, same order #), Still-cancel removes the job
      from the Go phone's Available feed.
- [ ] Cancel an accepted-not-started request → Cancel-or-Repost sheet; Repost releases +
      notifies the Gopher on the right phone and re-broadcasts same order # with exclusion.
- [ ] A started request (any `substage`) shows NO cancel affordance anywhere, only the note.
- [ ] Step-7 "Cancel request" can no longer strand a live record.
- [ ] Demo "×" dismiss is disabled in the live pair.
- [ ] No fee is ever shown to the requester for pre-start cancels.
