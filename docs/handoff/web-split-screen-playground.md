# Web ↔ Go playground — `_prototypes/web-split-screen.html`

**Status:** built and verified live, 2026-08-31. Not deployed. Nothing here is on a live host.

## What it is

The second split screen. The original — `_prototypes/split-screen.html` — runs the **Request
prototype** against the **Go prototype**. This one runs the **live web apps**
(`Final/gopher-request.html`, `Final/gopher-connect.html`) against that same Go prototype, so the
web surfaces can be configured against the app the same way the prototype already is.

Left pane is a **desktop browser chassis** (the web apps are desktop surfaces, and rendering them
in a 390px phone would break them for reasons unrelated to the wiring). Right pane is the same
390px phone the original split uses.

**There is no Request/Connect switcher.** The left pane is *the site*: the requester follows the
site's own Connect ↔ Request links, exactly as a real one would. The harness owns the pane, so it
re-applies `?pt=1` to whatever page lands there — the site's links carry no query string, and
without the flag the bridge would not install and the pane would go quietly dead. PT therefore
stays non-sticky (never written to sessionStorage as a *mode*): it is re-applied by the frame that
owns the pane, not remembered by the app.

## No demo data — the world starts from nothing

Owner directive, 2026-08-31: *"this site should have no 'demo' or fake users… the request/connect
app is creating **real** info for the go app to react to."*

In PT the playground is an empty world. Every request is one you submitted, and the **only** Gopher
who can ever appear is the real worker on the Go phone.

- **Requests** — cleared by **provenance, not content**: only records created through
  `__createDashboardRequest` (i.e. through the real flow) are tagged `__ptOwn`, and `all()` filters
  on the tag. The dashboard's own seed is pushed onto the array directly, so it is never tagged.
- **`previousRequests`, `cancelledRequests`, `expiredRequests`, `myGophers`, `goTos`, `referrals`** —
  emptied on install. All of them represent work that happened or workers you know; in the
  playground each must be built by a real interaction.
- **The interested-worker pool** — suppressed. This is the one that produced the reported bug: with
  a pool present, `__createDashboardRequest` auto-hires `interested[0]` under *First available*, so
  **the web app announced that a Gopher had accepted before the Go phone had even seen the request.**
- **The seeded "MY Gopher Picks" inbox thread** — skipped. It introduced four fabricated Gophers
  (Tanya Brooks, Devon Price, Rosa Medina, Kyle Watts).
- **Card copy** — with no pool, the card read "0 workers interested", describing a demo pool that no
  longer exists. Now reads *"Broadcasting — no Gopher yet"*.

**Account furniture is deliberately kept** — profile, payment methods, business users, saved
addresses. A real requester legitimately has those, and blanking them breaks the flow rather than
making it honest. The signed-in identity is the mechanism that produces a dashboard at all; without
it `submitRequestAndCapture()` returns `null` and nothing broadcasts.

`GWeb.world()` reports what is still held, and the harness's self-check **fails loudly** if any
fake-activity collection is non-empty — a stray demo record is invisible until it broadcasts a job
nobody asked for.

## Continuity across the site

The web apps hold `DASH_DATA` in memory only, so following the site's own link would drop every
request the requester had made — breaking the one thing the playground is for. The PT world is
therefore snapshotted to `sessionStorage` **per surface** (`gopher_pt_world_request`,
`gopher_pt_world_connect`) and restored on arrival. Per surface deliberately: a Connect business
request and a consumer Request are different products under different accounts, and pooling them
would invent a relationship the real system does not have.

Two ordering hazards, both hit and both fixed:

- Opening the dashboard **replaces** `activeRequests` with the demo seed *after* `install()` runs,
  so restoring at install time was silently undone. Restore now happens inside `purgeSeed()`, after
  the seed has been cleared.
- A `persist()` firing in that same window would have written an **empty** world over the saved one
  and destroyed the requester's work. Writes are now gated on `worldReady`.

The Go phone keeps jobs from **both** pages. If the Gopher accepts a job whose page is not currently
loaded, the harness says which page to go back to rather than retrying in silence.

## Why it needed new code

`split-screen.html` talks to `window.GReq`, a small store the Request **prototype** publishes. The
web apps have no equivalent: their requests live in `const DASH_DATA` inside an IIFE
(`rqDashboardInit()`, `dashboardInit()`), which is script-scoped and therefore invisible to
`frame.contentWindow`. They published `__createDashboardRequest` (write) and `__isFlowInDashboard`,
but nothing to **read** requests back or apply worker-side events.

So the playground is two pieces:

| Piece | File | Role |
|---|---|---|
| Bridge | `Final/assets/js/gopher-web-pt-bridge.js` | Publishes `window.GWeb`, a **GReq-shaped** view of `DASH_DATA`, under `?pt=1` only |
| Harness | `_prototypes/web-split-screen.html` | The wire between `GWeb` and the Go app's existing `__pt*` hooks |

The **Go side needed no changes at all** — `gopher-go-prototype.html:4209` already had
`var PT = …get('pt')==='1'` and an `if(PT){}` block exporting `__injectJob`, `__ptJobs`,
`__ptApprove`, `__ptBidResult`, `__ptDecision`, `__ptRated` and the rest. That contract was reused
as-is.

`GWeb` is deliberately published in the **GReq shape** so the harness's `orderFromReq()` is
byte-identical to the original split's. A second, drifting copy of that mapping is exactly what the
shared-module work exists to prevent.

## Running it

Serve from the **repo root** (not from `_prototypes/`) — the Go pane pulls
`../../Final/assets/js/gopher-iq-data.js`, which only resolves when the root is the repo root.

```bash
cd "/Users/johnnewbury/Desktop/All New Gopher/Documentation/Claude Code Review:Cleanup/Code" && python3 -m http.server 8477 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8477/_prototypes/web-split-screen.html`.

⚠️ **Check the port is yours before trusting it.** `lsof -iTCP:<port> -sTCP:LISTEN` first — on
2026-08-31 port **8123** (the README's usual port) was already held by another session serving
`Final/` as its root, which makes `_prototypes/` unreachable while still answering 200. Never
`pkill` a server you did not start.

Maps' referrer allowlist does not include 8477, so ride-distance pricing logs
`RefererNotAllowedMapError`. That is the key working as designed, not a defect.

The harness **self-checks** after boot and replaces the status line with a loud warning if the Go
pane is missing `GopherIQData` (wrong document root), the web pane published no `GWeb` (bridge did
not install), or the Go pane has no `__injectJob` (did not boot in PT mode).

## Safety of the `Final/` edits

The bridge is `?pt=1`-gated and reads the flag from `location.search` **only** — deliberately not
sticky in sessionStorage, because sticky PT is how the prototype's own store once contaminated a
normal visit. Without the flag `install()` returns `null`, nothing is published, and no app
behaviour changes. A broken host adapter **throws** rather than degrading, so a silent half-bridge
can never be mistaken for a legitimately empty dashboard.

Per web app: load the module, suppress the demo worker pool under PT, swap the Step-7 band and the
card's worker line to PT copy, skip the fake-Gopher inbox seed (Request only), add the broadcast
fields to the payload and the record, and install the bridge at the end of the dashboard IIFE.
**Every one is gated on `?pt=1`** except the added payload fields, which are additive and read by
nothing else. Verified live on both pages without the flag: `window.GWeb` is `undefined` and there
are no console errors.

## What was found while building it

These are **live-app findings**, not harness quirks.

1. **The broadcast carried no category, no cost-of-items, and (on Request) no description.** The
   dashboard record had `icon` and a truncated `title` but no `category` slug, so the Go app had
   nothing to file the job under and no cost-of-items to show the worker. Fixed by adding
   `category`, `costOfItems` and `descriptionFull` to the payload and the record. This is the
   "missing state fields are real defects" class — `fromDeal` was the same shape of bug.

2. **`workerSelection` reaches the Go app intact, and INV-ACCEPT behaves correctly.** Verified
   live: under `'select'` a Gopher's Accept arrives on the web as a **candidacy**
   (`status:'interested'`, request stays Pending) and only the requester's **Hire** flips it. Under
   `'first'` the acceptance is the hire. This is the single most important thing the playground
   proves.

3. **⚠️ Web has a "Start job" gate the Go app does not model.** On web, Hire and Start are two
   separate acts — `startJob()` is the only place status flips pending → in-progress, and it fires
   from `#startJobBtn`. The Go app has no equivalent: the moment the worker is hired it shows them
   as on the job. **Between Hire and Start the two surfaces genuinely disagree.** The harness
   narrates this rather than auto-starting, because auto-starting would hide it — and for the same
   reason the bridge's auto-hire path (*First available*) deliberately does **not** call `startJob`
   either, so both acceptance paths stop in the same place. *This one is a product decision for the
   owner, not a bug to quietly close.*

4. **Requester-facing copy was leaking onto the worker's job card.** `rec.when` is dashboard copy
   ("Just now · awaiting your selection"); broadcast verbatim it put the customer's own status line
   on the worker's card, where "awaiting your selection" is meaningless. The bridge now derives a
   worker-facing label.

5. **The Step-7 confirmation band builds its own worker pool**, independent of the record — so
   under PT it claimed "8 workers already interested" for a request that had broadcast to nobody.
   Now reads "Broadcasting to Gophers nearby" under PT in both apps.

6. **`gopher-connect.html` never loads `gopher-iq-data.js`.** It references `GopherIQData` three
   times (guarded, so nothing crashes), which means Connect's ZIP/city **coverage lookup silently
   never runs**. Pre-existing, out of scope here, and a live-site behaviour change — left for an
   owner decision.

## Relay coverage

**Wired and verified live:** submit → broadcast · acceptance under all three `workerSelection`
modes · requester Hire · Start job (narrated) · worker progress (in-progress → items → completed)
→ live tracker · counter-offer → the dashboard's counter card · the requester's Accept/Deny on that
counter · messaging both ways · cost adjustment · Gopher cancel · requester cancel.

**Deliberately NOT wired** — the Go app raises these but the web dashboards have no surface that
can receive them, so they are not faked: no-show timer · dispute · turn-by-turn navigation state ·
report-a-request · Refer-Yourself.

## Verified end to end (2026-08-31)

Driven through the apps' own controls, not by calling internals:

- **Request:** submit (`GR-0002`, Delivery, $32, real addresses) → live on Go → Accept on Go →
  arrives as a candidacy → **Hire** on web → relayed to Go → **Start job** → live tracker →
  Go advances in-progress → items → completed → web tracker mirrors each step and flags the
  request for the requester's confirmation.
- **Connect:** submit (`GC-00201`, Junk Removal, $140) → live on Go as a Junk Removal job.
- **Empty world:** on a clean load `GWeb.world()` reports every collection at 0 and the sidebar
  reads Dashboard 0 / MY Gophers 0 / Inbox 0. Submitting leaves the card at *"Broadcasting — no
  Gopher yet"* with `interestedWorkers: []` — **no Gopher is announced until the Go phone accepts.**
- **Site navigation:** Request → (site's own link) → Connect → (site's own link) → Request. `?pt=1`
  is re-applied each time, the surface is re-detected, Connect arrives clean, and the Request
  world comes back (`pending: 1` → restored, stage and pay intact) without re-broadcasting to Go.
- **Acceptance is real:** under *First available* the Gopher hired is **Marcus Hale, the worker on
  the Go phone** — reached only after a real Accept — and the request then stops at the Start-job
  gate, narrated.

### Known rough edge

The purge/restore runs on the harness's auto sign-in, a beat after the page loads, so for roughly a
second after navigating you can see the app's demo seed before it is cleared. It is cosmetic and
self-corrects; `all()` filters on `__ptOwn` throughout, so **the seed can never broadcast** during
that window. Removing the flash entirely means gating the apps' own seeding on PT rather than
clearing it afterwards — a larger edit to the live pages, deliberately not taken without a decision.
