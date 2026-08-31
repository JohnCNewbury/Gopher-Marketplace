# Post-accept on the web — what is actually missing

**Written 2026-08-31, from first-hand inspection of the live files.** Companion to
[`web-split-screen-playground.md`](web-split-screen-playground.md).

## The headline, because it changes the size of the job

> **The web apps are not missing post-accept features. They are missing the thing that
> TRIGGERS them.**

Nine of the twelve post-accept surfaces are already built in `Final/gopher-request.html` and
`Final/gopher-connect.html` — tracker, cost adjustment, counter-offer, completion confirm, rating +
MY Gophers, dispute, messaging, cancel/recovery, completion photos. They are not stubs; they render
properly and their money math is canonical.

**What none of them have is a real event source.** Every trigger is written *only* inside the
`DASH_DATA` demo seed:

| Trigger | Written at | Reachable by a real user? |
|---|---|---|
| `counterOffers` | `gopher-request.html:20347` | **No** — demo seed only |
| `pendingAdjustment` | `:20436` | **No** — demo seed only |
| `awaitingConfirmation` | `:20592` | **No** — demo seed only |
| `completionPhotos` | `:20593` | **No** — demo seed only |
| `reviewSnapshot` | 5 seeded records | **Was no** — fixed 2026-08-31 (`57f8d0b`) |
| G40-9 cancel recovery | a "Simulate: Gopher cancelled" demo button | Demo-triggered only |

So a requester on the live site can submit a request and then reach **none** of the post-accept
experience, because nothing on the platform produces the events. The Gopher Go app is the event
source that was never connected.

**That is what the web↔Go playground connects**, and why the wiring lives inside the real files
rather than a copy.

## Where each surface stands

Status is from driving both apps end to end in the playground (2026-08-31), not from reading code.

### Wired and proven — the surface exists and now receives real events
- live status tracker (in-progress → items → completed)
- cost adjustment, incl. the `pending` (needs approval) vs `applied` (same/lower) split
- counter-offer, both Accept and Deny
- completion → confirm → rate → **Add as MY Gopher**
- in-app messaging, both directions
- Gopher cancel → request returns to Pending and re-broadcasts
- requester cancel → job leaves the worker's board
- acceptance under all three `workerSelection` modes

### Built on web, NOT yet fed by the Go app
**Both wired and verified 2026-08-31 — this section is now empty.**
- ~~**dispute**~~ — WIRED. Requester submits (`disputeState:'disputed'` + `disputeReason`) →
  `__ptDisputed(id, note)` → the Go phone shows **PAYMENT ON HOLD** with the requester's reason
  carried **verbatim** (asserted `disputeNote === disputeReason`), and the worker can resolve it
  with a cost adjustment — which, being a dispute, always routes through the requester's approval
  even when it lowers the price. Relayed on the transition INTO `disputed` and re-armed if the
  state leaves it, so a re-raised dispute after a failed resolution is not swallowed.
- ~~**completion photos**~~ — WIRED. Both sides speak the same dialect (a plain array of image
  `src` strings), so it is a straight copy, carried in the SAME call as the status change: the
  requester never sees "completed" with the photos arriving a tick later and the details modal
  repopulating. Verified two photos render at their natural 140×140 (genuinely decoded, not broken
  `img` tags) under "View pic(s) of completed request"; the section is omitted entirely when the
  array is empty.

### Genuinely missing on the web — two BUILT 2026-08-31, one still open

1. ✅ **No-show flow — BUILT** (`aed189a`). Requester's card leads with a live countdown while the
   worker waits at an age-restricted drop-off, and becomes a terminal "Completed as No Show" block
   if reported. Rules read from the Go app's own G40-192 implementation, not invented. Consequence
   copy matches the age-restricted waiver already in the flow. **No cancellation fee is involved** —
   a reported no-show pays the worker in full and withholds the items.

2. ✅ **Turn-by-turn navigation — BUILT** (`650977c`). Renders inside the Live location section,
   because the invariant is the point: navigation NEVER pauses the location feed, so the line states
   both facts together. Clears the moment the worker advances the status.

3. ⏳ **Report-a-request — OPEN, and it is the MIRROR that is missing.** Go's `openReportRequest` is
   the **worker** flagging to trust & safety (`POST orders/<id>/flag`, reasons incl. "may be
   illegal/suspicious", "unsafe request/location"); the requester is deliberately never told, which
   is correct. The gap is the other direction: on Request web a requester can **Block** a Gopher
   (`rqRelBlock`) but cannot **report** one, and Connect has neither. Blocking is a private
   preference; reporting is a safety escalation to HQ. Today a requester who feels unsafe has no
   escalation path on the web at all.

   **Blocked on the owner for the reason taxonomy** — what a requester may report a Gopher for is
   trust & safety policy, and a wrong list is worse than none. Once the reasons are set the build is
   small and mirrors the Go side (same modal shape, same `POST orders/<id>/flag` seam).

Neither built surface is `?pt=1`-gated, and neither needs to be: `navTo`, `noShowUntil` and `noShow`
are written only by the Go app through the bridge, so on the live site none is ever set and both
blocks render nothing. Inert by data rather than by flag.

## Suggested order

1. **Dispute relay** — surface exists on both sides, only the wire is missing. Smallest change,
   completes the money-dispute loop that cost adjustment already half-covers.
2. **Completion photos relay** — same shape, small.
3. **No-show** — the largest, and the only one requiring genuinely new web UI.
   *Corrected 2026-08-31: this does NOT involve a cancellation fee.* Under G40-192 a reported
   no-show pays the worker **in full** and simply does not release the items — there is no charge to
   argue about. And the behaviour does not need a fresh spec: the Go app already implements it, so
   the canonical rules are read from there rather than invented.
   (Separately, per the owner: cancellation-fee **policy** is real and its copy is correct — only
   the mechanism that would collect a fee is deliberately not plugged in. Nothing to change.)
4. **Navigation state** — smallest of the three new builds; a card state, not a screen.

## Two decisions still open for the owner

- **The "Start job" gate.** On web, Hire and Start are separate acts; the Go app has no equivalent
  and shows the worker as on the job the moment they are hired. The two surfaces genuinely disagree
  in that window. Not a bug to close quietly — a product decision.
- **The `reviewSnapshot` fix** (`57f8d0b`) is the one change in this workstream that is **not**
  `?pt=1`-gated, because it is a parity fix rather than scaffolding. It changes what a live user
  sees on an in-progress request (canonical recap replaces the fallback card). Built and verified,
  **not deployed.**

## Before committing anything here

```bash
./scripts/web-checks/run-all.sh
```

Parses both live apps, proves PT cannot activate on a production host (13 hostnames), and runs the
repo's own parity harnesses and unit tests. Mutation-proved — see its commit message.
