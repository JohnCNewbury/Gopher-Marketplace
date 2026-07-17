# Rating gate — the Gopher rates the requester only AFTER the requester confirms

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
`j.confirmed` is set by the requester's confirm relay (`window.__ptRated`). The wait state
reads "Job complete — waiting for {requester} to confirm. You'll rate them once they confirm."
After confirm: "Rate {requester} →" (then "You rated {requester}" once submitted). Verified
in the split-screen harness: no rate button at `substage='completed'`; button appears on
`__ptRated(...)` landing.

### Gopher Go — guided completion demo (same file, `initCompletionFlow`)

Already correct before this change: the sequence is drop-off photo → **"Requester confirmed
your delivery" banner** → locked rating step. The demo never offered rating before the
(simulated) confirm. No change needed; the live card now matches the demo's ordering.

### Requester side (Request web `Final/gopher-request.html`, Connect, app prototype)

The requester's confirm + rating is a single flow and is the payout trigger. In the prototype
harness (`_prototypes/split-screen.html`, `watchRating`), the requester's rating relays to the
Go phone via `__ptRated`, which sets `confirmed`, releases the "paid out" state, and resolves
any open dispute. Unchanged by this note.

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
- [ ] **Requester app:** no change — confirm+rate stays the payout trigger.
- [ ] **TOS §23 wording** updated per above (needs attorney sign-off per the repo's review
      conventions).
