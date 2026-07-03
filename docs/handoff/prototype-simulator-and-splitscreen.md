# Prototype loading model — source of truth, simulator refresh, split-screen

Short reference so the mobile prototype never has a "which copy is real?" loose end.

## Source of truth = the standalone screen files
The real, current screens are the standalone HTML files in `_prototypes/Request/`:
- `gopher-request-home.html` — home + **Request Details panel** (workers interested/hire/consider,
  live activity, chat, and the **Review profile → previous-jobs filter**, G40-68).
- `gopher-request-inprogress.html` — in-progress screen (+ the **early-cancel** sheet, G40-40).
- `gopher-request-flow.html`, `-deals.html`, `-refer.html`, `-help.html`, `-inbox.html`,
  `-completion.html`, `-101.html`.

Edit these. They are built to be embedded: each adds an `embedded` class when inside an iframe
(`window.self !== window.top`) and exposes `window.__navHook` for host-driven navigation.

## The phone-frame simulator is a base64 snapshot (can go stale)
`gopher-request-prototype.html` does **not** load the screens live. It holds a `SCREENS` map of
**base64 snapshots** keyed by filename and injects them via `iframe.srcdoc`. So after you edit a
standalone screen, the simulator shows the **old** copy until its snapshot is refreshed.

### Refresh a screen's snapshot (one command, out-of-band, byte-verified)
Run from `_prototypes/Request/`:
```bash
python3 - <<'PY'
import re, base64
SIM="gopher-request-prototype.html"
# add any screens you changed here (key == filename == SCREENS key):
screens=["gopher-request-home.html","gopher-request-inprogress.html"]
data=open(SIM,encoding="utf-8").read()
for key in screens:
    b64=base64.b64encode(open(key,encoding="utf-8").read().encode("utf-8")).decode()
    data=re.sub(r"('"+re.escape(key)+r"'\s*:\s*')[A-Za-z0-9+/=]+(')",
                lambda m:m.group(1)+b64+m.group(2), data, count=1)
open(SIM,"w",encoding="utf-8").write(data)
print("refreshed:", screens)
PY
```
Encoding note: the simulator decodes with `decodeURIComponent(escape(atob(b)))`, which is exactly
`base64` of the file's UTF-8 bytes — so the plain `b64encode(html.encode('utf-8'))` above is correct
(verified: the re-embedded bytes round-trip identical to the standalone file).

Done 2026-07-02: refreshed `home` (G40-68) and `inprogress` (G40-40); both round-trip byte-identical.

## For the live split-screen (Request ↔ Go in real time)
No split-screen harness lives in this repo — it's external. For real-time interaction with **all
features working**, the split-screen should load the **standalone screen files live** (iframe `src`
to the `.html`, served over the local http server), **not** the base64 simulator. Because the
standalone files are the source of truth and are already current, that path needs **no re-embedding
ever** — every edit shows immediately. Use `window.__navHook` on each iframe to drive navigation
between screens from the host, the same way the simulator sets `frame.contentWindow.__navHook`.

Serve the whole tree so both apps resolve:
```bash
cd "/…/Claude Code Review:Cleanup/Code" && python3 -m http.server 8000
# Request screens: http://localhost:8000/_prototypes/Request/<screen>.html
# Go screens:      http://localhost:8000/_prototypes/Go/<screen>.html  (and Final/gopher-go.html#app)
```

## Live split-screen harness — `_prototypes/split-screen.html`  (two real apps, one shared store)
A two-phone harness: **Request (left) ↔ Go (right)**, both the **real, correct app files**, loaded
live (iframe `src`, not base64), in **PT mode** (`?pt=1`). Must be served over http (the panes read
each other same-origin). Open: `http://localhost:<port>/_prototypes/split-screen.html`.

Panes:
- left  `Request/gopher-request-home.html?pt=1`
- right `Go/gopher-go-prototype.html?pt=1`  ← the polished *gopher GO* worker app (Pro tier ·
  Available/Active/Scheduled · LOCAL JOBS), **not** the older `gopher-go-worker.html` concept page.

**Design principle:** the harness is a **thin, invisible data-sync layer** — no top-bar form, no
Reset, no overlays, no control sheets. Both apps drive themselves through their **own native
screens**; the harness only relays state between their two real stores. There is no separate "harness
DB": the Request app's `GReq` store and the Go app's `JOBS`/`__ptJobs` ARE the database (this is the
"the two prototypes together are the DB" model John asked for).

**PT mode (`?pt=1`)** — what the query param changes in each app (standalone default is untouched):
- **Request** (`gopher-request-home.html` + `gopher-request-flow.html`): `GReq.seed()` returns `[]`
  so the requester starts with **no pending requests** (clean categories+deals home). Sticky via a
  `sessionStorage['gopher_pt']` flag so it survives the home↔flow navigation.
- **Go** (`gopher-go-prototype.html`, PT block near the old `load('splash')` boot): empties every
  `JOBS[cat]` in place (keeps app furniture — tiles, deals, settings), **strips the design-review
  chrome** (hides `<aside>` + title bar, makes the phone fill the iframe), boots to **`home`** instead
  of `splash`, and installs `window.__injectJob(order)` + a "new job near you" notification banner.

**The loop, both directions (all through native screens):**
1. **Submit** — requester goes through the Request app's own 7-step flow (＋ start a request → Submit).
   `submitRequest()` → `stashPending()` → `GReq.add(buildPending())`. `buildPending()` was enriched to
   carry the **real** details entered (worker pay via `perWorkerPay()`, cost of goods via
   `currentItemCost()`, pickup, drop-off, scope=description, distance, schedule). Category keys
   (`delivery/junk/moving/home/labor/yard/ride/other`) map 1:1 to the Go `PT_CATMAP`.
2. **Inject** — the harness polls the left `GReq` (`watchNative`, 600ms), and for any new
   `stage:'searching'`, non-scheduled record calls `R.__injectJob(orderFromReq(r))`. The Go app
   unshifts it into `JOBS[mappedCat]`, repaints its live `jobs-list`, and shows the banner. Scheduled
   requests are skipped (they land in the Request "Scheduled" bucket).
3. **View** — banner → `jobs-list` (live Available feed) shows the real card; tapping it opens
   `job-detail` (NATIVE screen, reads `state.job`) — real pay/scope/requester/locations.
4. **Accept** — job-detail's "Accept Request" CTA sets `job.accepted=true` on the very object the
   harness injected (`state.job` === the `JOBS` entry === `__ptJobs[id]`). No edit to the accept
   handler was needed.
5. **Sync back** — the harness polls `R.__ptJobs[id].accepted` (`watchAccept`, 600ms); on true it
   `GReq.update(id,{stage:'active',hired:'Marcus K.',...})` + re-renders the Request home, so the
   request moves into the requester's **Active** list ("Job in progress · Track live"). Reload the
   page to start over — there is no reset button by design.

**Counter-offer negotiation (bidirectional, added 2026-07-03):**
- **Rule (real live-app logic, always on — not PT-gated):** a Gopher's counter **must be higher than
  the requester's offer**. In `job-detail`, the counter stepper opens one step above the offer
  (`coVal = amtNum+1`), its min clamps to `offer+1`, and `js-cosend` blocks any send where
  `coVal <= amtNum` (rule line turns red, send dims). Only a valid counter writes
  `j.counter = {amt, was, note, by}` onto the shared job object.
- **Counter → requester** — the harness `watchCounter` (600ms) sees `__ptJobs[id].counter` and sets
  `GReq.update(id,{attention:{type:'counter', label:'Counter-offer from … — $X (offer was $Y)', …}})`.
  The request card flips to **"⚠ … ACTION NEEDED · Review now →"** (uses the existing `attention`
  model; a `type:'counter'` attention routes the CTA to `data-pending-action="counter"`, **not** the
  disconnected `rdPanel`).
- **Accept / Decline** — "Review now" opens `openCounterReview()` (a `gModal`). **Accept** →
  `GReq.update(id,{stage:'active', hired:by, amount:'$X', pay:X, counterDecision:'accepted', …})`;
  **Decline** → stays `searching`, `counterDecision:'declined'`.
- **Decision → Gopher** — the harness `watchDecision` (600ms) relays `r.counterDecision` to Go via
  `R.__ptDecision(id, decision, amt)`: accepted → `job.accepted=true`, `job.amt='$X'` and (if the
  detail is open) it live-redraws to "accepted at the new price"; declined → `job.counterDeclined=true`
  and the Gopher can counter again. `accepted[id]` is pre-set on accept so `watchAccept` doesn't
  double-fire.
- **PT gate on the requester sim** — `initPending()` now calls `startAccepting()` **only when not in
  PT mode** (`isPTmode()`), so in the split-screen the Go app is the *only* thing that advances a
  request; the old auto-"New bid from Marcus K." simulator no longer fires and can't collide with the
  real counter loop.

**App-file changes (all additive, PT-gated except the counter rule, backward compatible):**
- `gopher-request-home.html` / `gopher-request-flow.html`: `ptEmpty()` guard in `seed()`; enriched
  `buildPending()`. Home also adds `isPTmode()` (gates `startAccepting`), the `type:'counter'`
  card CTA, and `openCounterReview()` (Accept/Decline `gModal`).
- `gopher-go-prototype.html`: the `if(PT){…}` block (empty feed, chrome-strip, boot-to-home,
  `__injectJob`, banner, and `__ptDecision`) replacing the bare `load('splash')`; **plus** the
  counter validation + `j.counter` write in `job-detail` (real logic, runs in standalone too) and the
  banner-retract-on-`job-detail` overlay fix.
- `split-screen.html`: the thin sync layer — `orderFromReq`, `watchNative`, `watchAccept`,
  `watchCounter`, `watchDecision`; iframes point at the `?pt=1` correct files.

**Verified live** (browser-driven via the preview tools, 2026-07-03): empty state on both phones,
chrome stripped on Go, submit→inject→banner→`jobs-list` card→`job-detail` (all real data)→Accept→
Request flips to **Active**. Counter loop: same-amount counter **blocked**, valid counter surfaces as
**ACTION NEEDED** on the request, **Accept** → Active/hired at the new price (Go live-shows "hired at
new price"), **Decline** → request stays open and the Gopher is notified. Screenshots captured.

**Known gaps / next iteration:**
- Go **home** is a static base64 frame, so its baked tab/tile counts ("Available 59 · Active 2",
  "22"/"9") don't zero out — only the **live** `jobs-list` is truly empty. Zeroing those means editing
  the static home frame (or making home live).
- `job-detail`'s exact pickup/drop-off use the screen's own defaults, not the submitted
  `pickup`/`dropoff` (its unlock logic isn't wired to the injected fields yet).
- Back-half beyond Accept (en route → complete → rate, and syncing those states back) runs on Go's
  **static** `worker-flow`/`purchase-*` frames — not yet wired for live status/complete/rate sync.
