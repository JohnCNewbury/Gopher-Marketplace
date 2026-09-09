# G40-14 — the Gopher Go 101 note, held until the app release ships

**Status: WRITTEN, NOT APPLIED. Do not paste this before the store release
containing `gopher-mobile-gopher` `G40-14-payout-pending-copy` is live.**

## Why it is held rather than applied

The 101-guide rule ("a user-facing change is not done until its 101 guide is
updated") and the honesty rule that goes with it — *the guide describes what the
product does, not what it will do* — point in opposite directions until the app
ships. "Payout Account pending…" does not exist for any worker on a current
build, so writing it into a live guide today would be describing a screen nobody
can see.

Applying it early is not merely premature, it is **unsafe**: `scripts/deploy.sh`
reads the **working tree** and publishes the whole of `Final/`. An edit sitting
uncommitted or committed in `Final/gopher-go-101.html` goes live on the next
deploy by **any** session, whether or not that session knows about it. So the
edit lives here, outside `Final/`, where no deploy can pick it up.

## What changed in the app, in one line

After a worker adds a payout card, the screen used to say **"A new card must be
added to receive payout"** in red — above the card they had just added. Where
Stripe is simply still working, it now says **"Payout Account pending…"** in
brand blue, with no error styling and no modal. Every state where the worker
genuinely has something to do is unchanged and still loud.

## Why the guide needs anything at all

`Final/gopher-go-101.html` §payout tells workers:

> **A valid payout account is required to view and accept requests** — no payout
> account, no jobs.

A worker who adds their card, sees "Payout Account pending…", and reads that
line has an obvious question the guide does not answer: **can I accept jobs
right now, or not?** The question existed before this change; the new copy makes
it far more likely to be asked, because the screen now names the state instead
of mislabelling it.

✅ **Answered first-hand, 2026-09-08 — the worker CANNOT accept requests while
pending.** `controllers/order/retrieve.js:2505` gates `order_view` on
`decoded.gopher && !order.gopher_id`, then calls
`fetch_gopher_stripe_details` and throws **420** when `payout_enabled` is
false. So during the pending state a worker can still open a job already
assigned to them, but opening any *unassigned* request fails. The guide must
say so plainly; a worker told "nothing to fix" who then cannot open a single
request will conclude the app is broken.

✅ **That related defect is now BUILT — G40-458, not this ticket.** The 420 above
carried "No payout account found. Please add one to continue." — the same wrong
instruction, one screen later. It was raised out of G40-14 rather than widened
into it, picked up as G40-458, and is on branch
`G40-458-order-view-payout-pending`. The gate now reads `payout_account_pending`
from the *same* `is_payout_pending_verification` this ticket added, so the two
surfaces cannot drift.

⚠️ **And G40-458 found something that changes the wording below.** Verified
first-hand 2026-09-08:

> **"Pending" is two Stripe states wearing one shape.** Stripe-not-finished
> (`currently_due` empty, clears itself) and **paused for dormancy**
> (`currently_due` empty — *identical*, and it **never** clears; only we can
> lift it, via "Mark as active"). The discriminator, `paused.inactivity`, exists
> only on the **transfers capability** — never on the account object — so
> `is_payout_pending_verification` matches **both** by design.

Confirmed against live Stripe on 2026-09-08: `paused` appears on **0 of 322**
account objects, and **no** account with a card currently carries
`transfers → paused.inactivity` (all 43 blocked accounts checked). So this is a
**latent** hazard today, not an active one — but the copy must not bet on it.

**What that forbids:** any promise of a timeline. *"This usually clears on its
own"* and *"check back shortly"* are true for one half of the population and
false forever for the other. G40-458 deliberately gives both states the same
copy, promising nothing, and fires an internal
`REQUIRES SUPPORT - PAYOUT ACCOUNT PAUSED` alert for the paused case — because
what the *worker* must do is identical (nothing); what *we* must do differs.

The snippet below has been corrected accordingly. **An earlier draft of it said
"check back shortly". Do not restore that.**

## The snippet

Insert as the last child of `<section class="section" id="payout">`, directly
after the existing `<div class="note warn">…</div>` (currently
`Final/gopher-go-101.html:454`). House style matches the sibling notes: a
`note info` with a `nico` glyph and a bolded `span.h` lead-in.

```html
      <div class="note info"><span class="nico">⏳</span><div><span class="h">If you see &ldquo;Payout Account pending&hellip;&rdquo;</span>Stripe is still finishing your payout account. That message means <b>everything we need from you is in</b> &mdash; there is nothing for you to fix, and adding another card will not help. <b>You will not be able to accept new requests until it is sorted</b>; jobs you have already accepted are unaffected. Most accounts clear by themselves, but a few need us to step in &mdash; so if it is still there the next time you open the app, message support and we will take it from there. If instead you see a message asking you to <b>add a card</b> or telling you your account <b>needs attention</b>, that one is real: tap the card and follow the steps.</div></div>
```
The last sentence is the load-bearing half. The three states now read differently
on purpose, and a worker who cannot tell them apart is exactly the person this
ticket was raised for.

## Checklist when the release is live

1. Confirm the store release containing the G40-14 app change is actually live —
   not merely merged. A merge is not a release.
2. Check G40-458 has shipped in the same release. If it has not, the snippet is
   still correct — it already warns the worker they cannot accept yet.
3. Paste the snippet into `Final/gopher-go-101.html` §payout.
4. Mobile-verify at 375px before publishing (the notes wrap differently there).
5. Deploy is owner-gated. Scope-check the dry-run file list first — it shows
   other sessions' working-tree changes, and a rider is indistinguishable from a
   revert without a `curl` of the live page.
6. Delete this file once applied. It is a work item, not a decision record.
