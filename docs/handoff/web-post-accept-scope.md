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
- **dispute** — the web has a full state machine (`entry` → `disputed` → confirm / unable to
  resolve) and Go raises `__ptDisputed`; the relay is simply not written yet. Cheapest remaining win.
- **completion photos** — web renders them, Go collects them, nothing carries them across.

### Genuinely missing on the web — need building
1. **No-show flow.** Go runs a no-show timer and completion path; neither web app has any surface
   for it (`noShow` appears nowhere in either file). The requester currently cannot be told the
   worker arrived and they did not.
2. **Turn-by-turn navigation state.** Go raises `navigating`; the web has no `navTo` equivalent, so
   the requester never sees "your Gopher is navigating — live location on". The prototype treats
   this as a live-app invariant: navigation must never interrupt the location feed.
3. **Report-a-request.** Go's `openReportRequest` sends to Gopher HQ, not to the requester — so
   this is an **admin/HQ** surface, not a requester one. It belongs with the HQ Dashboard, not here.

## Suggested order

1. **Dispute relay** — surface exists on both sides, only the wire is missing. Smallest change,
   completes the money-dispute loop that cost adjustment already half-covers.
2. **Completion photos relay** — same shape, small.
3. **No-show** — the largest, and the only one requiring genuinely new web UI. It is also the one
   with real money consequences (cancellation fees, worker reliability), so it deserves the owner's
   spec before any code.
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
