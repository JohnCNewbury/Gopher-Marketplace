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

## Safety of the `Final/` edits — it cannot run in production

**The deploy is the reason this matters.** `scripts/deploy.sh` rsyncs `Final/` to the live hosts
**wholesale** (`rsync -a --delete`, everything not explicitly excluded), so these three files ship
on the next deploy *anyone* runs — and now that they are committed they will not even trip the
preflight's dirty-tree warning. Shipping is therefore the default, not a decision.

So PT requires **two** things: `?pt=1` **and** a development host — `localhost`, `127.0.0.1`,
`*.local`, or `*.trycloudflare.com` (the tunnel `scripts/preview-tunnel.sh` shares previews from).
It is an **allowlist, not a denylist** of the three known production hosts: fail-closed means a host
nobody thought of is denied rather than silently permitted.

Without the host gate, `?pt=1` alone would leave a mode on a public site that anyone could enter by
guessing a query parameter — and entering it **empties the visible dashboard**. That is not a mode a
live site should have. With it, the flag on a production host is not merely dormant, it is
unreachable.

Verified by unit test across 13 hostnames, including all three production hosts with the flag
present (all `false`) and the spoofing near-misses `trycloudflare.com.evil.example` and
`localhost.evil.example` (both `false`).

The flag is read from `location.search` **only** — deliberately not sticky in sessionStorage,
because sticky PT is how the prototype's own store once contaminated a normal visit. A broken host
adapter **throws** rather than degrading, so a silent half-bridge can never be mistaken for a
legitimately empty dashboard.

**The harness itself never ships.** `_prototypes/` is deployed by an explicit `PROTO` allowlist in
`scripts/deploy.sh`, and `web-split-screen.html` is not in it.

### If you are the next person to deploy

The dry-run diffstat will list `Final/gopher-request.html`, `Final/gopher-connect.html` and the new
`Final/assets/js/gopher-web-pt-bridge.js`. Per the repo's own rule an unfamiliar file in that list is
either someone's new work or something you are about to revert — these are the former, they are
safe to carry, and they change nothing for a real visitor. **Do not pin the deploy behind this
commit to avoid shipping them**: pinning at a point behind what is currently live silently rolls
back everything shipped since, which is the more expensive mistake.

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

6. **⛔ An accepted counter-offer was relayed to the worker as a DECLINE — a money disagreement
   across the two panes.** The requester accepted $42; the web charged **$46.43** and hired at $42,
   while the Go phone showed *"A requester declined your counter"* and **"YOU'LL EARN $30"**.

   Cause: the harness decided the outcome with `rec.hired === GOPHER`, a **display-name string
   match** — and the Go prototype names this worker two different ways (below). One spelling
   difference silently inverted a pricing decision. Fixed by reading the outcome from the record
   (`!!rec.hired`) instead of comparing names; the same fragile pattern was removed from the hire
   relay. **Rule: never let a money or state decision hang on a name match.**

7. **⚠️ The Go prototype names its worker twice, differently.** Account state is `fn:'Marcus'`
   `ln:'Hale'`, but the counter-offer payload hardcodes `by:'Marcus K.'`
   (`gopher-go-prototype.html:3273`/`3276`) — so the requester meets one name on an accept and a
   different one on a counter. This bridge normalises to the account identity rather than
   propagating it. Note `_prototypes/split-screen.html` hid the same defect by hardcoding
   `accBy='Marcus K.'` on its accept path — matching the bug rather than the account. **The
   prototype fix belongs to the Go workstream.**

8. **Request now builds a `reviewSnapshot` — parity with Connect (FIXED, not deployed).**
   Scope corrected first: an earlier note here implied this "silently breaks two money features for
   every real user". **It does not, today.** `counterOffers` and `pendingAdjustment` are written
   ONLY onto the five seeded demo records — nothing in the live app can put either on a
   user-created request — so the snapshot gap was **latent**, not an active break. It becomes live
   the moment the Go app is wired to Request, which is precisely what this playground prototypes.

   What it *did* affect today: `renderRequestDetail()` gates the Request recap on
   `r.reviewSnapshot`, so a real user's in-progress request rendered the **minimal fallback card**
   (ID / description / worker / total) instead of the canonical recap. Request-Again also reads
   `snapshot.category` / `.description` for carry-over.

   Fixed by building the snapshot at capture from `computeRequestFee()` on the same COG+offer base
   Step 7 already foots — the frozen deal and the screen the customer agreed on are computed once,
   not twice, so they cannot drift. Verified: review screen showed offer $30.00 / Gopher Fee $0.99 /
   ITF $2.48 / **Total $33.47**; the stored snapshot reads `workerPay 30, gopherFee 0.99,
   instantTransfer 2.4792, total 33.4692` — identical. The recap now renders all ten canonical rows.

   WARNING: **this is the one change in this workstream that is NOT `?pt=1`-gated**, because it is a
   real parity fix rather than playground scaffolding. It changes what a live user sees on an
   in-progress request: the canonical recap replaces the fallback card. Behaviour is otherwise
   unchanged, the live page loads with no console errors, `window.GWeb` stays undefined, and the
   bridge's `ensureSnapshot` scaffold is now a dormant fallback (the app's own snapshot is used —
   verified by the absence of `__ptSynthesized`). **Not deployed — needs an owner decision.**

9. **`gopher-connect.html` never loads `gopher-iq-data.js`.** It references `GopherIQData` three
   times (guarded, so nothing crashes), which means Connect's ZIP/city **coverage lookup silently
   never runs**. Pre-existing, out of scope here, and a live-site behaviour change — left for an
   owner decision.

10. **The cost-adjustment receipt was relayed as a SENTENCE, not a receipt (FIXED 2026-09-01).**
    Owner ruled the G40-101 receipt gate is in play for the prototype. Both ends were already
    built — Go blocks the submit without a receipt (`gopher-go-prototype.html:3461`), and the web
    card renders `window.__receiptThumb(P.receipt && P.receipt.src)` on Request *and* Connect, in
    the card and the breakdown modal. Only this harness dropped it, appending the words *"(receipt
    attached)"* to the worker's note. That is the one form the requester cannot act on: the card
    instructs them to *"zoom in and verify the line items and total before you approve."* The relay
    now passes `receipt:{src:null}` — null deliberately, since the Go attach button records the
    FACT of a receipt, not an image, and the component documents null as its stand-in. Same shape
    as the reference App Prototype Split (`split-screen.html:488` relays the boolean;
    `gopher-request-home.html:1577` draws the demo from it). Verified end to end, including the
    negative case: submitting without a receipt is refused and relays nothing.

11. **The Go prototype read a decimal money value 100× too large (FIXED 2026-09-01).**
    `parseInt(value.replace(/[^0-9]/g,''))` on every money field strips the decimal point, so a
    typed **$61.40 became $6,140**. Confirmed with real keystrokes: the requester's approval card
    offered **$6,666.83** against an agreed $87.47. `inputmode="numeric"` is a keyboard hint, not a
    filter. Live has always been right (`type="number"` + `parseFloat`, cents in the DB). Owner
    ruled fix it. Replaced with `parseMoney` / `fmtMoney` — deliberately not named `money()`, since
    a different function-scoped `money()` already exists in that file and returns **null** for zero.
    ⚠️ The inputs alone were not enough: `j.amt` is a display STRING and two readers parsed it the
    same broken way, so an applied $61.40 would write `"$61.4"` and read back **614**. The writers
    now normalise and the readers parse — the round trip is closed and tested. Guarded by
    `scripts/web-checks/go-money-parse.js` (step 9/9), which fails all four mutations. Full detail
    in `prototype-vs-live-findings.md` §4.

12. **"Reset demo" leaves the relay dead until a page reload (NOT fixed — reported).**
    After pressing Reset demo, a newly submitted request never reaches the Go phone and the status
    line never updates: `watchNative` and every other relay stop firing. A plain reload of the
    harness restores everything, including relaying the persisted request. Found while re-verifying
    the money fix — and it cost real time, because a dead relay looks exactly like a broken change.
    Anyone testing after a Reset should reload before concluding a relay is broken.

## Web | App — one requester, two clients (added 2026-09-01)

**Owner's idea, and it is the right production analogue:** in production the requester is a person
with a phone *and* a browser, and the same order has to render correctly in both. The left pane now
carries a **Web | App** switch. It swaps the CHASSIS — desktop browser vs 390px phone — while the
orders underneath stay put. It is not two demos; it is one requester, drawn twice.

- **Web** → `Final/gopher-request.html` / `gopher-connect.html` (navigable, as before)
- **App** → `_prototypes/Request/gopher-request-home.html?pt=1`, the same surface the reference
  App Prototype Split mounts

### Why this was cheap rather than a rewrite

Four things already lined up, three of them on purpose:

1. `GWeb.all()` has emitted **GReq-shaped** records since it was written — that was the point of
   shaping it that way. The mirror is a field-for-field copy, not a translation layer.
2. `GReq` is **sessionStorage-backed, and sessionStorage is per-TAB, shared by every iframe in
   it** — the app's own store is already visible to the harness. No bridge invented.
3. The app is PT-aware already (`?pt=1` → empty store, no demo seed).
4. The Go phone is fed by relays that speak the same shape.

### What it does today, and what it does not

**Web → App is live and verified.** A request created in the web flow appears in the app, bucketed
by the **app's own** `statusBucket()` (Submitted before acceptance, Active after) — not by anything
the harness decides. A Gopher accepting on the Go phone lands in **both** panes while the App is the
one on screen.

⛔ **App → Web is NOT built.** The app can create its own requests (Home → a category →
`gopher-request-flow.html` → `GReq.add`), and adopting those into the web's `DASH_DATA` is the other
half. Until it lands, an app-created request is **left alone rather than half-mirrored** — a record
the web pane cannot render is worse than one it does not show. ⚠️ `onAppLoad` currently WIPES the
app store before re-mirroring, which is safe only while the mirror is one-way; that line has to
become a targeted purge before app-side creation ships, or it will destroy the app's own work.

⚠️ **There is no Connect app prototype** — `_prototypes/` has Request and Go only. So the switch
covers the **Request** surface; on Connect the App side has nothing to show. Not a defect, a bound.

### Two things this shook out

13. **`display:none` on the inactive chassis STALLED EVERY RELAY.** With the pane switched to App, a
    Gopher's Accept did not reach the requester at all — and landed the instant Web was shown again,
    which reads exactly like a broken relay rather than a hidden one. An un-laid-out iframe is not a
    reliable place to keep a running app (this repo already records a sibling: an occluded pane
    freezing CSS transitions). The inactive chassis is now moved **off-screen** and stays live,
    which is also the honest model — the requester's phone does not stop existing while they are
    looking at the browser.

14. **The tick could die silently, and did.** A stalled relay is indistinguishable from a broken
    feature: the panes just stop agreeing. It cost **three separate investigations in one day**, two
    of them diagnosed wrongly from the outside, because nothing distinguished *the loop threw and
    stopped rescheduling* from *the loop is parked on `!signedIn`* from *the loop is fine and a
    watcher is wrong*. Every pass is now guarded, the loop always reschedules, and it publishes
    vitals at `window.__tick` (`n`, `parked`, `lastError`, `lastAt`) — a debugging seam, not a
    feature. Read it; never drive from it.

## Relay coverage

⚠️ **Verified and wired are not the same thing, and an earlier draft of this file conflated them.**
Split explicitly:

**EVERY RELAY HAS NOW BEEN DRIVEN END TO END** through both apps' own controls (2026-08-31).
Nothing in the list below is inferred from code review:

submit → broadcast · acceptance under all three modes — `first` (auto-hire), `select` (candidacy →
requester Hire), `my` (auto-hire, after earning a MY Gopher) · Start job (narrated) · worker
progress in-progress → items → completed → live tracker · completion → requester **confirm** →
**rate** → **Add as MY Gopher** · counter-offer → counter card → **Accept** and **Deny**, both
relayed · messaging **both ways** · cost adjustment → approval → relayed back · **Gopher cancel** ·
**requester cancel**.

**Deliberately NOT wired** — see the list below; unchanged.

⚠️ **Running them found seven more bugs, five of which made the two panes disagree.** Wired is not
working: every one of these would have read as fine until it mattered. They are listed in the
findings section.

**Deliberately NOT wired** — the Go app raises these but the web dashboards have no surface that
can receive them, so they are not faked: no-show timer · dispute · turn-by-turn navigation state ·
report-a-request · Refer-Yourself.

## The `my` (Prioritize MY Gophers) path — and why it was nearly untestable

`my` is **locked in the UI** until you have favourited a Gopher from a completed job
(`aria-disabled`, "Unlocks once you've favorited neighborhood Gophers from completed jobs"). PT
empties `myGophers`, so it starts locked — correct behaviour, and the only honest unlock is to
actually finish a job and favourite the worker.

That route was **blocked by a bug in this bridge**: `buildCompletionBlock()` renders nothing unless
the record carries `awaitingConfirmation`, and the completion relay never set it. So the Gopher
could mark a job complete and the requester had no way to confirm, dispute, rate **or favourite** —
the request sat "completed" while the detail screen still offered "Start job". One missing field
closed off the confirm flow, the rating flow, and the entire `my` branch behind it.

Fixed, then driven the whole way: complete on Go → **Confirm completion** → **Rate now** → tick
**Add as MY Gopher** → MY Gophers = 1 → the option unlocks ("we'll notify your favs first") → new
request under `my` → Marcus accepts on Go → **auto-hired** (`Marcus Hale:hired (auto)`), landing at
the Start-job gate like every other acceptance path.

Minor, recorded not fixed: the Go app's banner says *"first available, you're hired"* even under
`my` — its copy does not distinguish the two auto-hire reasons.

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
