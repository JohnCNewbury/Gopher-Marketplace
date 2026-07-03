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

## Live split-screen harness — `_prototypes/split-screen.html`
A from-scratch two-phone harness: **Request (left) ↔ Go (right)**, both loaded **live** (iframe
`src`, not base64), fully interactive, plus a control bar and a cross-app **message bus**.
Open: `http://localhost:8000/_prototypes/split-screen.html` (must be http — the panes talk
same-origin).

Panes: left `Request/gopher-request-home.html`, right `Go/gopher-go-worker.html`.

Core loop wired (submit → accept):
- **"▶ Requestor submits a request"** → adds a `stage:'searching'` request to the left via
  `L.GReq.add()` + `initPending()` (broadcasting), and fires the Go worker's incoming-job push
  (`R.simulate()`).
- On the right: tap the push → open job → **Accept**. The harness **wraps the Go app's global
  `acceptJob(id)`** so it `postMessage`s `{source:'gopher-split', type:'job:accepted'}` to the
  parent.
- The parent relays it to the left: flips that request to `stage:'active'` + `hired` via
  `L.GReq.update()` / `L.__onJobStarted()`, and toasts “Gopher accepted your request”.

Bus contract (extend from here): parent listens for `window` messages with
`source:'gopher-split'`. To add stages/completion, wrap the relevant Go/Request globals the same
way (e.g. Go's `go('active')` / stage advance → emit `job:progress`; Request reflects it). No app
files are modified — all wiring lives in the harness, re-applied on each iframe `load`.

Status: **v1 scaffold**, verified by syntax + code review (not live-run in the authoring sandbox).
The left-pane “broadcasting” visibility depends on the home’s submitted-bucket rendering; if it
doesn’t flip visibly, that’s the first thing to tune after a live look.
