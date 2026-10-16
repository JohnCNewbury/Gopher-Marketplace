# Website UI/UX seat — handoff, 2026-10-16 ~7:05 AM ET

Supersedes `website-uiux-handoff-2026-10-15.md` (keep it for history). Paste the **"Start here"** block
into the new session. Everything below it is the reference, written for someone who has never seen this
seat.

---

## Start here (paste this)

You are the **Website UI/UX** seat for the Gopher Code repo. `Final/` is the public marketing site (and the
Request web dashboard inside `gopher-request.html`). You work **directly with John** (stage by stage,
three options each, he picks on a pick doc) and you **deploy through the iQ | Brain Sprint desk**.

1. ⛔ **FIRST, before any work: check in with the iQ | Brain Sprint desk** (`SendMessage` to
   `iQ | Brain Sprint`). Say you are the new Website UI/UX session, that you have read
   `docs/handoff/website-uiux-handoff-2026-10-16.md`, and ask: what is live now, what is in the web
   queue, and does anything in flight touch the pages you are about to change.
2. Read this file in full. Then memory `resume-request-dashboard-overhaul-2026-10-12` (top block only;
   the rest is history).
3. Work in the worktree **`.claude/worktrees/elegant-pasteur-b04a42`**, branch
   **`brand-audit-corrections-2026-10-02`**. **Live at handoff: `a9aa51ce`** (twin `84400565`), built
   6:50 AM 10/16 from source `e65c776a`. Before touching anything: `git fetch origin main` and compare
   `Final/` with live (see "Re-sync" below). Live moves several times a day.
4. Open work, in order:
   **(1)** John's run sheet for the "Gopher that too" section: rows G1–G4 are his, not passed yet
   (https://claude.ai/artifact/U7xLtZ2t7KA2tpPq8HFNyu, db `results`). Read the db; act on any Fail.
   **(2)** the post-G40-604 recapture (item C) when the desk says 604 phase 2 has merged.
   Nothing else is open. **Deals and Connect are PARKED by John — do not touch them.**

---

## State at handoff (verified 10/16 ~7:00 AM ET)

| | |
|---|---|
| Live `main` (Pages + TigerTech) | **`a9aa51ce`**, 6:50:08 AM 10/16, "Gopher that too" section |
| Prototype twin (`proto/main`) | **`84400565`** |
| Branch `brand-audit-corrections-2026-10-02` | pushed; tip = the commit that added this file (docs only past `e65c776a`) |
| Unshipped work of mine | **none** (this file and `website-uiux-tools/verify-hosts.sh` are docs, which never deploy) |
| Next in the desk's web queue | **Website Code/Logic** (two local branches that edit other regions of `gopher-request.html`; they rebase on `a9aa51ce`) |

---

## What shipped 10/15 – 10/16 (all verified on 3 hosts)

| When (ET) | Live SHA | What | Run sheet |
|---|---|---|---|
| 10/15 11:21 | `925c761` | **Refer Yourself QR without John's precise lat/lon** (`go-refer-yourself-phone.webp` re-drawn as `api.gophergo.io/self-referral/1`; the route reads only the id, and the Go app dropped lat/lon in G40-602 D2). Old QR image `go-gg-share-label.png` deleted. | https://claude.ai/artifact/KPn2snSnroMDPW2oAHr7eN · **8/8 PASS** |
| 10/15 11:54 | `e8e4ddc` | **Go page hero** back in the July **silver iPhone + 3D tilt** with the real Go app screens (John rejected the flat dark lean). Built with `fitquad.py` + `mockup_warp.py` from the July renders in `website-uiux-tools/mockups/`. | https://claude.ai/artifact/Doi7dMaVkwfk5bxm746oQA · **7/7 PASS** |
| 10/16 06:50 | `a9aa51ce` | **"Yes, we can Gopher that too."** (Request page, lower half): the 4 white cards became **Gopher character outlines** with real clips inside. Details below. | https://claude.ai/artifact/U7xLtZ2t7KA2tpPq8HFNyu · **C1–C4 PASS (mine), G1–G4 open (John's)** |

Docs-only commits (never deploy): `1da53c3` the desk's G40-607 note in `G40-38-payment-methods.md`;
`3f1d015`, `db8654c9` handoff updates.

---

## The "Gopher that too" section (what a new session most needs to know)

- **Where:** `Final/gopher-request.html`, the BITE section (search `bite-grid`), its `.bite-*` CSS block
  (search `v28 (John 10/15`), and a 13-line script right after `</section>` that plays the clips only
  while on screen (IntersectionObserver) and does nothing under `prefers-reduced-motion` (poster stays).
- **John's picks** (pick doc https://claude.ai/artifact/Y9Zxohy4k8zNo2kgxjYjb3, db `rulings`):
  `FR`=B the **Gopher outline, ears filled**, line ~25% thinner than his reference ·
  `C1` beer handoff at the grill (`Final/Beer-Delivery.mp4`) ·
  `C2` **his own clip** — a Gopher returns a backpack he forgot (`assets/video/gopher-that-backpack.mp4`) ·
  `C3` a Gopher carries a couch through an apartment door (`assets/video/gopher-that-couch.mp4`, from the
  library's "Couch Moving") · `C4` the movers from tour.gophergo.io (`Final/Movers.mp4`, byte-identical to
  the tour's `video/move.mp4`).
- **Copy change:** card 2's body is John's words, verbatim: "Forgotten cord. Last-minute gift. Something
  you kinda need a vetted neighbor to help with." The other cards' words are unchanged.
- **Files:** `assets/img/gopher-outline-thin.svg` (navy line + dirt mound), `assets/img/gopher-head-mask.svg`
  (the inside, ears included, masks the clip), posters `assets/img/gopher-that-{beer,backpack,couch,movers}.webp`.
  `.bite-clip`'s box (left 11.29% · top 3.607% · w 80.645% · h 83.607%) is the mask's bounding box inside
  the 1240×1220 outline — re-trace both together. How: `website-uiux-tools/gopher-outline/README.md`.
- **Layout:** 4 across ≥1001 px (ears reach into the gaps: `.bite-gd` is 110% wide), 2×2 ≤1000, 1 per row
  ≤560 (the page's own 880/560 rules agree).
- **John's process on this one (do it the same way next time):** one card at a time, 3 options each, a pick
  doc with Save-pick bars, read the db before building. He asked for changes mid-way (his own clip for
  card 2, the Gopher outline instead of the doorway arch, "it needs to fit in the ears too", the tour's
  moving clip for card 4, the card 2 copy) — each was mocked on the doc first, then built.

---

## Open work

### (1) John's run sheet for the section
G1 desktop row of four Gophers · G2 card 2's new line · G3 iPhone one per row · G4 TigerTech + twin.
Read `ArtifactData list results` on https://claude.ai/artifact/U7xLtZ2t7KA2tpPq8HFNyu. A Fail with a note
→ fix, dry run, desk, John's "deploy", re-verify, re-pass that row.

### (2) Item C — recapture after G40-604 phase 2 (app restyle: fonts, headers, buttons)
The desk says when 604 phase 2 has merged (at handoff: Request !515 / Go !453 pushed, NOT merged —
per 604's memory note, not checked first-hand). Then recapture from the 101 refresh process (ask the desk
who captures; real device preferred, simulator allowed) and re-run. **Same filenames → no markup change.**

| Site file | Page(s) | Source capture (`Final/assets/img/…`) | How |
|---|---|---|---|
| `request-home.webp`, `request-in-progress.webp` | gopher-request, gopher-services | `101-request/home-submitted`, `live-accepted` | `phone_frame.py … 640` |
| `go-get-it-on-google-play.webp` (Go hero 1) | gopher-go | `101-go/home-active` | ⛔ NOT phone_frame/tilt. `mockup_warp.py mockups/go-hero-1-silver-island.webp <capture> <out> --quad "$(fitquad.py mockups/go-hero-1-silver-island.webp)" --band 0.105 --cy 0.082 --icons 0.81` |
| `go-gopher-go-app-available-requests.webp` (hero 3) | gopher-go | `101-go/preaccept` | `mockup_warp.py mockups/go-hero-3-silver.webp … --island-from mockups/go-hero-1-silver-island.webp --island-quad "$(fitquad.py mockups/go-hero-1-silver-island.webp)" --no-restore` (same band/cy/icons) |
| `go-gopher-go-app-home-screen.webp` (hero 2, flat) | gopher-go, gopher-marketplace | `101-go/home` | `phone_frame.py … 678` (John didn't flag hero 2) |
| `go-refer-yourself-phone.webp` | gopher-go | `101-go/refer` + QR composite | `qrbox.swift` → paste at (178,335) 185×184, 6 px white pad → `phone_frame.py … 640` → decode with `qr.swift`: must be exactly `https://api.gophergo.io/self-referral/1` (NO lat/lon) |
| `go-feed-card-expanded/offer/history.webp` | gopher-go | `101-go/card-expanded`, `offer`, `history` | `phone_frame.py … 520` |

Demo-data captures only — John's own device captures show a real street address.

### Parked / not this seat's
- ⛔ **Deals + Connect: PARKED** (John 10/15: "WE're not doing anything deals or connect yet. Leave them").
  The verified findings (16 lines promising Deals "in the apps"; neither app has Deals) are kept in
  https://claude.ai/artifact/6Wty7RS8f6Sfiu46rCYbcK. Don't raise them again until he reopens it.
- `Final/index.html` ~2074–2092: dead "step carousel" JS; its 4 images are shown nowhere. Tidy only with
  John's OK.
- Tiers on gopher-go ("Elite / Elite+ / Pro"): **leave** — the rename is deferred by John.

---

## How a change ships here (follow exactly)

1. **Announce to the desk before editing** (which file, which region). Shared files
   (`gopher-request.html` especially) have several editors: Code/Logic (app↔web logic), G40-604 (buttons
   on every page — check button CSS with them first).
2. Build on the **current live SHA** (re-sync first). Commit.
3. `bash scripts/web-checks/run-all.sh` → only these may fail (pre-existing, identical on a clean
   baseline): **13/18** parity harness (JXA EOF), **14/18** Go parity (worktrees lack
   `_prototypes/Go/gopher-go-canonical.html`), **18/18** Deals featured picks (date-dependent).
   Plus `node docs/handoff/website-uiux-tools/parsecheck.js Final/<page>.html` → 0 fail.
4. **Dry run:** `bash scripts/deploy.sh` (no flags = both sites). Read the full file list: it must be
   exactly your files on both sites, `0 strays`. Send the desk the list + added bytes.
5. **Ask John yourself** for "deploy" (one asker — the desk never asks for you). Give him what it solves,
   the risk, the reward, and how fast it can be undone.
6. Push + deploy in ONE command, guarded:
   ```
   git push origin brand-audit-corrections-2026-10-02 && git fetch origin main && git fetch proto main && \
   L=$(git rev-parse --short=7 origin/main) && P=$(git rev-parse --short=7 proto/main) && \
   [ "$L" = "<live you built on>" ] && [ "$P" = "<twin you saw>" ] && bash scripts/deploy.sh --push -m "Deploy: … (John's go <date>)"
   ```
7. **Verify on 3 hosts:** `docs/handoff/website-uiux-tools/verify-hosts.sh <page> "<sentinel>" -- <files…>`
   in a background loop until exit 0 (Pages ~1 min). Report SHA + ET time + results to the desk.
8. **Run sheet** for John (copy the newest run sheet's HTML, change rows; pre-fill your own C rows in db
   `results` with `by:"Claude"`). Never a markdown table.

### Re-sync to live
`main` is a flattened rsync lineage — never `git merge origin/main`; `git diff <main> HEAD -- Final/x`
is meaningless. Compare trees: `git diff --stat origin/main: HEAD:Final` (ignore `_prototypes/`,
`.github/`, `.nojekyll`, `README.md`). If live has files you lack, `website-uiux-tools/resync-live.sh`.
⛔ Never take `_prototypes/` from `origin/main` (published form). The two gitignored banners
(`_prototypes/{Go,Request}/gopher-banner.js`) are copied in from the main clone if a worktree lacks them.

---

## Traps that bit this seat (all still true)

- ⛔ **TigerTech is ONLY `gophergo.io.customers.tigertech.net/preview/`.** `gophergo.io/preview/*` is a 301
  to the WordPress site. A missing file there returns a **500** WordPress page (2704 B), not a 404 —
  compare against a never-existed path before concluding.
- ⛔ **The photo library `Documentation/Pic:Video Assets/` is iCloud "dataless"**: the first read of a file
  downloads it (minutes). Copy what you need to the scratchpad in a background command.
- ⛔ **The Browser preview cannot read `~/Desktop`.** Rsync `Final/` (skip `*.mp4`, then copy the clips you
  need) into your scratchpad and add a `launch.json` entry serving that copy (main checkout's
  `.claude/launch.json`, not the worktree's). Remove your entries when done.
- ⛔ **In the hidden/scaled preview pane, IntersectionObserver never fires** (a fresh observer reported 0
  entries). That's the pane, not your code — start clips by hand when checking; don't "fix" the page.
- ⛔ **An `<img height="…">` attribute beats CSS `aspect-ratio`** — add `height:auto`.
- zsh: `$var:x` is a modifier (use `${var}`); quote globs like `--include='*.html'`; `ugrep` chokes on long
  `.{0,N}` regexes — use Python for context extraction.
- Pick docs: G40-596 model (Save-pick bars → db `rulings`), **look at every phone view in the browser
  before publishing**, prove the save path (probe doc, read back, delete), cold-test the link.
- `MEMORY.md` is over its size limit — keep index lines short.

---

## Tools — `docs/handoff/website-uiux-tools/`

| File | Use |
|---|---|
| `verify-hosts.sh <page> "<sentinel>"… -- <files>…` | **NEW 10/16.** sha256 of each file on Pages / TigerTech / twin vs `Final/`, plus fixed-string page sentinels. Exit 0 = all pass |
| `resync-live.sh <old-base> origin/main` | Take files you hold no changes in from live; 3-way merge `gopher-request.html`; reports (never copies) `_prototypes/` |
| `resync.sh`, `splice.py`, `shim.html` | Local preview snapshot of the Request dashboard with a preview shim (never commit the shim) |
| `parsecheck.js <files…>` | Parse every inline `<script>` with node's `vm.Script` |
| `phone_frame.py <capture> <out.webp> <width>` | Titanium bezel + 9:41 status band (101 captures have no status bar) |
| `fitquad.py <mockup>` / `mockup_warp.py …` | The **approved Go-hero look**: real screen perspective-warped into the July silver iPhone (`mockups/`) |
| `tilt.py` | ⛔ retired for the Go hero (John: "looks terrible") |
| `qr.swift` / `qrbox.swift` | CoreImage QR decode / locate + generate (`swift qr.swift x.png`; WebP → PNG first) |
| `gopher-outline/` | John's outline reference + how the Gopher outline SVG and mask were traced (potrace) |

## Asset sources
- **Site clips (the approved warm-light set):** `Final/*.mp4` (Beer-Delivery, Grocery-Delivery,
  Packed-Delivered, Movers, Junk-Removal, Ride-Sharing, Teen_Lawn_Mower, Handyman…) and
  `Final/assets/video/services-clip-1..18.mp4`. Mostly 624×624 or 480×480, no audio.
- **Library:** `Documentation/Pic:Video Assets/` (iCloud). Higher-res stills (e.g. "Beer to Backyard"
  1024², "Senior Friendly", "Community") and clips ("Couch Moving" 1920×1080).
- **The tour (tour.gophergo.io):** source in `Confidential/Gopher Pitch Deck/Interactive Deck/` (`video/*.mp4`,
  e.g. `move.mp4`). Confidential folder — read only what you need.
- **John's own clips** arrive in `~/Downloads` (copy into their own scratchpad folder first; strip audio;
  trim and crop with ffmpeg; check both ends of the loop).

## Artifacts (all private to John)
| | |
|---|---|
| "Gopher that too" pick doc | https://claude.ai/artifact/Y9Zxohy4k8zNo2kgxjYjb3 (C1–C4, FR in `rulings`) |
| "Gopher that too" run sheet | https://claude.ai/artifact/U7xLtZ2t7KA2tpPq8HFNyu |
| Refer QR run sheet | https://claude.ai/artifact/KPn2snSnroMDPW2oAHr7eN (8/8) |
| Go hero run sheet | https://claude.ai/artifact/Doi7dMaVkwfk5bxm746oQA (7/7) |
| Deals findings (PARKED) | https://claude.ai/artifact/6Wty7RS8f6Sfiu46rCYbcK |

## People / sessions
- **iQ | Brain Sprint** — the desk: sequences web deploys, keeps the ledger. Check in first; report every
  deploy (SHA, ET time, 3-host check).
- **Website Code/Logic** — app↔web code/logic parity; deploys next, after this seat's last deploy. Tell them
  directly if you touch app↔web logic in `gopher-request.html`.
- **G40-604: App Fonts** — owns the Style Guide and the app restyle; its phase 2 triggers item C; check any
  button HTML/CSS on site pages with them first.
- **101 Tutorials** — owns the 101 guides and their captures.
