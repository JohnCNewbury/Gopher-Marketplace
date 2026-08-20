# Rating gate — the Gopher rates the requester only AFTER the requester confirms

> ## ✅ BUILT IN THE LIVE APPS 2026-08-20 — G40-331 closed (with G40-39 scenarios 4–7)
>
> **Server (`gopher-backend-api!347`, merge `0112957e`, deployed):** at confirm,
> `rateYourRequestor` (socket + `pending_notifications` offline fallback) now fires for EVERY
> order whose Gopher has not already rated — it was age-restricted-only. The rating-absence
> guard makes the widening safe on installed apps: already-rated → never re-prompted;
> skipped → nudged. The "Payday!!" push (`order.payout`) carries deep-link `extra_data`
> {type, order_id}; `/orders/v3` gopher history orders carry `gopher_rated` (batched).
> Guard: `test/g40-331-rate-gate-on-confirm.test.js` (9 checks, 6 proven failures pre-fix).
>
> **Client (`gopher-mobile-gopher-capacitorjs!245`, merge `15b4a269`, STORE-GATED):**
> completion (photo and non-photo paths) lands on the new `completion_waiting` screen —
> *"Job complete — waiting for {name} to confirm. Confirmation releases your payout — and
> you'll rate them once they confirm."* The rating opens at confirm via the EXISTING
> bottomMenu pending-alert pipeline (the mechanism A/R orders always used — no second
> routing path was built). New `PushTapListener` routes a Payday-banner tap to the
> dashboard, where that pipeline lives. The rating stays dismissible; a pulsing
> **"Rate now →"** CTA on confirmed history cards (`payment_status==='paid' &&
> gopher_rated===false`) keeps it reachable until submitted — INV-RATING's shape. Older
> servers omit `gopher_rated` → no CTA, never a wrong one. **Favorite congrats
> (G40-39 scenarios 6–7) needed no change** — the `favoriteGopher` emit and congrats modal
> already existed, sequenced after the rating by the alert queue's priority order.
>
> The checklist below was this build's map; the "what IS" sections describe the PRE-change
> live apps and are kept as history.

**Requested by:** John Newbury, 2026-07-17 (App Prototypes session)
**Surfaces:** Gopher Go app (live + `_prototypes/Go/gopher-go-prototype.html`) · policy copy in
`Final/gopher-terms-of-service.html`
**Scope of this note:** documents the current logic precisely ("what IS") and the required
behavior ("what NEEDS TO BE") so the production dev can verify the live apps against it. The
prototype has already been corrected and is the reference implementation.

---

## The rule (what NEEDS TO BE)

**A Gopher cannot rate the requester until the requester has confirmed completion.**

Confirmation is the event that releases the Gopher's payout. A rating collected before that
moment cannot reflect the full transaction: if a requester takes 40 hours to confirm — sitting
on the Gopher's payout the whole time — the Gopher would most certainly not rate them 5 stars,
but a rating taken at mark-complete would already have said 5. Gating the rating on confirm
prevents these falsely-positive ratings and makes the score cover the request start-to-payout.

The requester side is unchanged: the requester rates the Gopher at confirmation time (the
"Rate now" flow), which is also what triggers the payout. Two-way ratings remain
system-only — never shown back to either party (see the safety note inside the job-detail
renderer: a low score from a requester who may be standing right there is a retaliation risk).

## What IS (current logic, exactly as encoded in this repo)

### Gopher Go — live job card (`_prototypes/Go/gopher-go-prototype.html`, job-detail frame)

**Before this change** the post-completion block rendered two independent pieces:

1. Status line: `j.confirmed` → "Confirmed by {requester} — paid out", else
   "Job complete — waiting for {requester} to confirm."
2. Rating block: gated **only** on `j.reqRated` — the **"Rate {requester} →" button rendered
   even while the card still said "waiting to confirm."** This is the defect: the Gopher could
   rate at mark-complete, before payout was released. (The relay handler `window.__ptRated`
   even carried a comment anticipating "if the worker already rated before the confirm
   arrived" — confirming rate-before-confirm was a reachable state by design.)

**As of this change (reference implementation):** the rating block renders **nothing** until
`j.confirmed` is set by the requester's confirm relay. The wait state
reads "Job complete — waiting for {requester} to confirm. You'll rate them once they confirm."
After confirm: "Rate {requester} →" (then "You rated {requester}" once submitted). Verified
in the split-screen harness: no rate button at `substage='completed'`; button appears once the
confirm lands.

> **⚠️ CORRECTED 2026-08-11 — the confirm relay is `window.__ptConfirmed`, NOT `__ptRated`.**
> This paragraph and the requester-side section below originally said `__ptRated` set
> `job.confirmed`. That was true when written and is now **wrong**, and the difference is the
> whole point of the 2026-08-09 fix (commit `cc4493c`): the two were **fused**, so confirmation
> could only reach the worker if the requester *also* rated. Rating is optional, so a requester
> who tapped CONFIRM COMPLETED and closed the rating modal left the worker reading "Pending
> confirmation — {who} controls the payout until they confirm" **forever**, payout apparently
> unreleased. `window.__ptConfirmed(id)` is now the only thing that flips `job.confirmed`
> (idempotent; also clears any open dispute), and `__ptRated` records the rating + favourite and
> **deliberately does not confirm**.
>
> **This also un-broke the gate documented on this page.** Because `confirmed` used to arrive
> only with a rating, the Gopher's own "Rate {requester} →" button could **never appear for a
> requester who declined to rate** — the gate was not merely strict, it was unreachable on the
> most common path. Decoupling fixed the display bug and the gate in one move. Both directions
> re-verified in the harness 2026-08-11: confirm with **no** rating → `confirmed:true`,
> `substage:'completed'`, `rated` unset, and the rate button offered.

### Gopher Go — guided completion demo (same file, `initCompletionFlow`)

Already correct before this change: the sequence is drop-off photo → **"Requester confirmed
your delivery" banner** → locked rating step. The demo never offered rating before the
(simulated) confirm. No change needed; the live card now matches the demo's ordering.

### Requester side (Request web `Final/gopher-request.html`, Connect, app prototype)

The requester's confirm is the payout trigger; the rating that follows it is **optional** and
changes no order state. In the prototype harness (`_prototypes/split-screen.html`,
`watchRating`) the two relay **separately**, on separate seen-maps (`confirmSeen` / `ratingSeen`):
the confirm fires first and independently via `__ptConfirmed`, releasing the "paid out" state and
resolving any open dispute, and a rating arriving later — or never — relays on its own via
`__ptRated`.

**This mirrors live deliberately, and live is the reference.** On `origin/production`,
`POST /confirm_payout/:id` captures, transfers, updates order status and notifies, while
`POST /ratings` (`controllers/common/ratings.js`) writes the rating row and `users_roles` and
**never touches `aasm_state`**. Two endpoints, two effects. Also live and worth knowing before
anyone "simplifies" the completion path in the rebuild: `PATCH /:id/complete` confirms payout
automatically, while `PATCH /:id/complete/v2` completes *without* confirming.

### Policy copy (`Final/gopher-terms-of-service.html`, §23 "Ratings & Removal")

Current sentence: *"After a request is completed, both Requestor and Gopher can rate the
transaction and add comments."* — **"completed" is ambiguous**: it does not distinguish
worker-marked-complete from requester-confirmed. It should be tightened (attorney review) to
say rating opens **at requester confirmation**, e.g. "Once the Requestor confirms completion,
both Requestor and Gopher can rate the transaction."

## What the production dev must verify in the LIVE apps

This repo is the blueprint, not the live code — the live apps must be audited against the rule:

- [ ] **Go app:** find where the rate-the-requester prompt/CTA is triggered. If it fires on the
      Gopher marking the job complete (as the prototype did), move the trigger to the
      requester-confirmation event (the same event that releases the payout).
- [ ] **Any queued/push prompts:** if a "rate your requester" notification is scheduled at
      mark-complete, reschedule it to confirm time.
- [ ] **Data check:** ratings submitted between mark-complete and confirm (the previously
      reachable window) are suspect per this rule — flag for review rather than migrate as-is.
- [ ] **Requester app:** no change — the **confirm** stays the payout trigger.
- [ ] **Confirm and rating must not be fused on any client** (added 2026-08-11). The live API
      already separates them (`/confirm_payout/:id` vs `/ratings`), so this is a client-side
      audit: check that no app releases payout state *inside* a rating-submit handler, and that
      skipping the optional rating modal still advances the worker's view. The prototype had
      exactly this defect and it was invisible until someone declined to rate — the failure mode
      is a worker permanently reading "pending confirmation" on a job that was in fact paid out.
- [ ] **TOS §23 wording** updated per above (needs attorney sign-off per the repo's review
      conventions).
