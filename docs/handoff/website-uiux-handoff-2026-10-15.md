# Website UI/UX seat — handoff, 2026-10-15 ~11:10 AM ET

Paste the **"Start here"** block into a new session. Everything below it is the reference.

---

## Start here (paste this)

You are the **Website UI/UX** seat for the Gopher Code repo (`Final/` is the public marketing
site + the Request web dashboard). You work **directly with John** (stage by stage, he picks) and
**deploy through the iQ | Brain Sprint desk**.

1. ⛔ **FIRST, before any work: check in with the iQ | Brain Sprint desk** (John, 10/15). Use
   `SendMessage` to `iQ | Brain Sprint`: say you are the new Website UI/UX session replacing the
   previous one, that you have read `docs/handoff/website-uiux-handoff-2026-10-15.md`, and ask
   what is live now, what is in the web queue, and whether anything touches the pages below.
2. Read this file in full, then memory `resume-request-dashboard-overhaul-2026-10-12`.
3. Work in the worktree `.claude/worktrees/elegant-pasteur-b04a42`, branch
   **`brand-audit-corrections-2026-10-02`** (pushed; tip at handoff = the commit that added
   this file). **Live at handoff: `fbbb38f`** (twin `00b8a91`), built from source **`8ad6983`**
   — the branch tip differs from it only by docs (this file + `website-uiux-tools/`), which
   never deploy. Before touching anything: `git fetch origin main` and re-sync (see Tools).
   Framing script: **`docs/handoff/website-uiux-tools/phone_frame.py`**.
4. Open work, in order: **(A) refer QR without coordinates**, **(B) Deals = web panel**, then
   **(C) the post-G40-604 recapture** when the desk says phase 2 has merged.
   **UPDATE 10/15 ~1:30 PM ET:** (A) is LIVE (`925c761`, John's run sheet 8/8 PASS). The Go hero was
   re-done in the July silver phone + tilt (`e8e4ddc`, run sheet 7/7 PASS; tools in
   `website-uiux-tools/`). ⛔ **(B) is PARKED by John:** *"WE're not doing anything deals or connect
   yet. Leave them."* Do not edit Deals or Connect pages/copy until he reopens it. Only (C) remains.

---

## The operating rules that bit this seat (all still binding)

- ⛔ **John's go authorises the CHANGE; the desk's slot decides WHEN it ships.** Every deploy:
  build on the CURRENT live SHA, send the desk the whole-repo dry run, ask **John** for
  "deploy" yourself (ONE ASKER — the desk never asks John for you), push with a re-fetch in the
  same command and **abort unless live == the SHA you built on**, then verify on **3 hosts** and
  report SHA + ET time + checks to the desk.
- ⛔ **Live moves several times an hour.** Today alone: G40-604, G40-611, G40-622, G40-623,
  G40-625, G40-274, Code/Logic PL-291. A dry run once caught a would-be REVERT of G40-623's Ride
  age-gate line because live moved between my build and my dry run. Re-sync immediately before
  every dry run.
- ⛔ `main` is a flattened rsync lineage — `git merge origin/main` is refused and
  `git diff <main-sha> HEAD -- Final/...` is meaningless (main has no `Final/`; every line shows
  as added). Compare `git show <sha>:gopher-request.html` against `Final/gopher-request.html`.
- ⛔ **Never take `_prototypes/` from `origin/main`** — that is the PUBLISHED form (noindex
  injected, `../../Final/assets` rewritten). Take a prototype source from the last deployer's
  branch (the desk names it); the dry run is the proof (it applies the same transforms).
- ⛔ **Verify with fixed strings.** `grep -F` for code sentinels (a regex pattern containing
  `$`, `{`, `(` silently failed once and timed out a "failed" verification that had actually
  shipped). For images, compare **sha256** of the host's file to yours.
- ⛔ zsh traps: `$var:stuff` is a modifier (garbles output — use `${var}`); `"$R:path"` →
  "bad substitution" (use `"${R}:path"`); unquoted `--include=*.html` globs (quote it).
- The memory directory is shared; `MEMORY.md` is over its size limit — keep index lines short.

---

## What is live (all verified on Pages, TigerTech `/preview`, and the twin)

| Time ET 10/15 | Live SHA | What |
|---|---|---|
| 9:02 | `0a1d57d` | Category names "Delivery" / "Yard Project" (app is truth); **Message a worker before hire** like the app (`messageOfferGopher`) + guard fix (a `::name` thread is "connected" only when THAT worker is hired) + pre-hire thread carried into `r.thread` on hire |
| 9:25 | `fe8d10e` | Worker / counter-offer / bid cards match the app's `OffersSheet` (Jobs \| Rating; distance only when approval needed; counter Was/Now/Change + "Hire for $X") |
| 9:47 | `f842796` | Bid card shows the **ALL-IN** total — deliberate divergence from the app (owner: "keep the difference"; web has no review step) |
| 10:24 | `a5c7294` | PL-297: distance line guarded by `firstAvailable` again (helper-scope check) |
| 10:47 | `c350380` | "On the Go" phones (gopher-request + gopher-services) → current Request app; removed a web-prototype render showing "Integration seam (human dev)" |
| 11:03 | **`fbbb38f`** | Gopher Go page: hero rotator (3 images), Refer Yourself → real screen, job feed → 3 real screens |

Earlier (10/14): Request dashboard Stages 1–4 (shell, sections, worker list B, mobile C) and the
"your worker" iQ guidance re-port. Comparison doc: `docs/handoff/request-home-web-vs-app-2026-10-14/`.

---

## Open work

### (A) Refer QR — DROP the coordinates (John 10/15, not built)

- `Final/assets/img/go-refer-yourself-phone.webp` (Go page Refer section) carries John's live
  self-referral link **with precise lat/lon**:
  `https://api.gophergo.io/self-referral/1?lat=35.63531061069964&lon=-78.85400299979864`.
- ⛔ **Before changing it, verify the link works WITHOUT lat/lon** — read the route in
  `gopher-backend-api` (search `self-referral`) and see what it does with missing lat/lon. Do NOT
  guess, and do not hit production to "try it"; if the code is unclear, ask John. If lat/lon is
  required, ask John whether a coarse value (e.g. a town centroid) is acceptable.
- Rebuild: `qrbox.swift <capture.png> <url> <out_qr.png>` generates the QR; composite it into
  `101-go/refer.webp` at box **(178,335) 185×184** (white pad 6px, NEAREST resize); frame with
  `phone_frame.py … 640`; **decode the framed result with `qr.swift`** and confirm the exact URL.
- ⚠️ The **old** QR image `Final/assets/img/go-gg-share-label.png` (John's QR with the same
  coordinates) is no longer referenced by any page but is **still published** on live. Deleting
  it from `Final/` removes it on the next deploy — include that (and grep all `Final/*.html` +
  blog pages first; at handoff nothing referenced it).

### (B) Deals = the WEB dashboard panel — ⛔ PARKED (John 10/15 ~1:17 PM: "not doing anything deals or connect yet. Leave them")

> The findings stand and are kept for when he reopens it, in the pick doc
> https://claude.ai/artifact/6Wty7RS8f6Sfiu46rCYbcK (16 lines, verified 10/15). Neither app has Deals
> (Request `ada5e1532` / Go `cfac0396d`: zero "deal"). Ruling 7 promises paid placement on "app and
> web" (his D1 pick: B, keep as is). Bid winners render only in the web Request/Connect dashboards;
> SP deals submit from the WEB Go dashboard. Two iQ FAQ answers say the same; not sent to the iQ
> seat, parked with the rest. Nothing below was built.

- Finding: **neither app has a Deals surface** (requester production `80cd8ada3` and Go
  `1f5a13caf`: no Deals component/route). Only the **web** Request dashboard has a Local Deals
  panel (`Final/gopher-request.html`, `#dashDealsHost`, "Raleigh-DMA rollout", plus a "Local
  Gopher Deals are on their way" modal).
- But merchant-facing pages promise app placement:
  - `Final/gopher-deals.html` ~line 6600 — a "where it shows" carousel; slide "On the Gopher
    Request Home Page" uses `assets/img/deals-on-the-gopher-request-home-page.webp` (July, a
    tilted phone of an old app home with deals). Same page: "Top bid … featured on all Gopher
    Marketplace app and web platforms next month."
  - `Final/gopher-deals-101.html` ~line 299 — "Where your deal shows up. One deal, four stages.
    Your card appears on the Deals site **and inside the Gopher apps**": On the Gopher Request home
    page · **In the Gopher Go app** · Featured on Gopher Request & Connect · On the Gopher website.
- John's (a): show the web dashboard's Local Deals panel and **reword that stage to the web
  dashboard**. Work: get the panel visible in the preview (find what gates `#dashDealsHost`),
  capture it, replace the image (same filename is fine), reword the stage on BOTH pages.
- ⛔ The **"In the Gopher Go app"** stage and the "inside the Gopher apps" / "all … app … platforms"
  lines are untrue for the same reason — John chose (a) for the Request stage; **show him the
  exact wording for every line you'd change before building** (merchant promise; may relate to
  the Merchant Agreement). Copy rule: describe what the product does, not what it will do.

### (C) Re-run after G40-604 (app restyle — fonts, headers, phase 2 buttons)

- The desk will say when 604 phase 2 has merged. Then recapture (the 101 refresh process — ask
  the desk who captures; real device preferred, simulator not forbidden as of 10/15) and re-run
  the pipeline. **Same filenames → no markup change.** Current mapping:

| Site file | Page(s) | Source capture (`Final/assets/img/…`) | Command |
|---|---|---|---|
| `request-home.webp` | gopher-request, gopher-services | `101-request/home-submitted.webp` | `phone_frame.py … 640` → 640×1379 |
| `request-in-progress.webp` | same | `101-request/live-accepted.webp` | `phone_frame.py … 640` |
| `go-get-it-on-google-play.webp` (hero 1, tilted) | gopher-go | `101-go/home-active.webp` | ⛔ NOT phone_frame/tilt (John rejected that look 10/15). `mockup_warp.py mockups/go-hero-1-silver-island.webp <capture> <out> --quad "$(fitquad.py mockups/go-hero-1-silver-island.webp)" --band 0.105 --cy 0.082 --icons 0.81` |
| `go-gopher-go-app-home-screen.webp` (hero 2, flat) | gopher-go, gopher-marketplace | `101-go/home.webp` | `phone_frame.py … 678` |
| `go-gopher-go-app-available-requests.webp` (hero 3, tilted) | gopher-go | `101-go/preaccept.webp` | `mockup_warp.py mockups/go-hero-3-silver.webp <capture> <out> --quad "$(fitquad.py mockups/go-hero-3-silver.webp)" --band 0.105 --cy 0.082 --icons 0.81 --island-from mockups/go-hero-1-silver-island.webp --island-quad "$(fitquad.py mockups/go-hero-1-silver-island.webp)" --no-restore` (its July "notch" was drawn into the prototype screenshot, not hardware) |
| `go-refer-yourself-phone.webp` | gopher-go | `101-go/refer.webp` + QR composite (A) | `phone_frame.py … 640` |
| `go-feed-card-expanded.webp`, `go-feed-offer.webp`, `go-feed-history.webp` | gopher-go | `101-go/card-expanded`, `offer`, `history` | `phone_frame.py … 520` |

- Use **demo-data** captures only. John's own device captures (10/15) show a real street address.
- The 101 guides themselves will also need the recapture — that is the 101 Tutorials seat's.

### Smaller / parked

- `Final/index.html` ~2074–2092: dead "step carousel" JS (`.step-item` / `#phoneImg` no longer
  exist in the markup); its 4 images (`home-img.webp`, `wp-gopher-app-request-2/3/4.webp`) are
  shown nowhere. Tidy only with John's OK.
- Tiers section on gopher-go ("Elite / Elite+ / Pro") — **leave**: the Elite/Pro rename is
  deferred by John ("Pro and Pro+ are current. Elite / Pro conversion later.").
- PL-291 ("$28.00 total" after accepting a counter; `startJob` writes worker pay into
  `r.amount`) — **Code/Logic owns it** (John). Their fix shipped in `ec0310f`; confirm with the
  desk whether it is closed.
- Pre-existing web-check failures (fail identically on a pre-change baseline; NOT ours): 13/18
  parity harness (JXA "Unexpected EOF"), 14/18 Go parity (worktrees lack
  `_prototypes/Go/gopher-go-canonical.html`), 18/18 Deals featured picks (date-dependent).
  `scripts/web-checks/run-all.sh` — run it before a dry run; only these three may fail.

---

## Tools — `docs/handoff/website-uiux-tools/` (copied from my session scratchpad)

| File | Use |
|---|---|
| `resync-live.sh <old-base> origin/main` | Run from the worktree root. Takes files I hold no changes in from live; 3-way-merges `gopher-request.html` (refuses on conflict or changed hunks); **reports, never copies** `_prototypes/` changes |
| `resync.sh` | `S=<scratch dir> resync.sh` → preview snapshot of `gopher-request.html` with the LOCAL PREVIEW SHIM (`?preview=home`, `&view=list`, `&sec=…`, `&detail=1`). Serve with `python3 -m http.server 8969`. Shim must never reach the repo (the script checks) |
| `splice.py`, `shim.html` | Used by `resync.sh` |
| `parsecheck.js <files…>` | Parse every inline `<script>` with node's `vm.Script` |
| `phone_frame.py <capture> <out.webp> <width>` | Titanium bezel + 9:41 status bar ADDED above the content (101 captures have none). Prints the output size → set `width`/`height` attributes to match |
| `tilt.py <framed> <out.webp> 839 1400 --deg 9 --persp 0.11` | ⛔ RETIRED for the Go hero — John 10/15: "the tilted phone looks terrible" |
| `fitquad.py <mockup>` / `mockup_warp.py …` | The APPROVED Go-hero look (John 10/15): the July silver iPhone + its 3D tilt (`mockups/`, Mockuuups Studio renders) with the real screen perspective-warped in. fitquad fits the screen's four bezel edges (~1px); mockup_warp builds status band + capture and warps it in |
| `qr.swift <png…>` / `qrbox.swift <capture.png> <url> <out_qr.png>` | CoreImage QR decode / locate-and-generate (`swift qr.swift x.png`). WebP → PNG first via PIL |

Other pages: serve `Final/` with `python3 -m http.server 8972` from `Final/` for a visual check.
Browser checks need `resize_window` each turn (the app clears it).

---

## People / sessions

- **iQ | Brain Sprint** — the desk; sequences web deploys, keeps the ledger. Check in first.
- **Website Code/Logic** — app↔web code/logic parity (PL-291, G40-628 age sheets). Their lane;
  tell them directly when you touch app↔web logic in `gopher-request.html`.
- **G40-604: App Fonts** — the app restyle that will trigger (C). Button HTML/CSS on site pages
  must be checked with 604 first (their website phase 2 is in picks).
- **101 Tutorials** — owns the 101 guides and their captures.
