# Website Updates deck (2026-09-30) — status, open decisions, traps

Source: `/Users/johnnewbury/Desktop/Website Updates.pptx`, 14 slides, owner-annotated
screenshots. The file is **edited in place and reused** — it was 12 slides on 09-29 and
1,896,574 bytes; on 09-30 it became 14 slides / 2,695,869 bytes at the same path. Check the
mtime and slide count before assuming you are reading the same deck a previous session read.

Branch: `feature/deals-google-maps-audience`. Everything below is on it.

---

## 1 · What is LIVE

### Deployed 2026-10-02 — the whole 10-02 deck

| | |
|---|---|
| production | `de7e7a1 -> origin/main` (GitHub Pages + TigerTech) |
| prototype twin | `3fbdab7 -> proto/main` |

One file: `Final/gopher-request.html`. Scope-checked on the dry run — 1 file
claimed and 1 file listed, so nothing was elided and no other session's work
rode along. Working tree was clean and the branch was 0 behind origin.

Content-verified on **all three hosts**: 14 positive strings present, 4 strings
that had to be gone absent (the rejected amber fill, the card corner orb, the
preview-only bootstrap, the sidebar's SPONSORED PICKS line). Live and TigerTech
byte-identical at 1,894,044; the twin is 48 bytes larger, which is its `noindex`
meta. The **bytes each host serves** re-parsed: 19/19 blocks, 0 failed.

⚠️ Both GitHub Pages hosts served the OLD build on the first check while
TigerTech was already current. That is Pages build latency, not a bad deploy —
poll until the string lands rather than concluding anything.

Deck items live from this run: slides **1, 2, 3, 4, 5, 6, 7, 9, 10**. Slides 8
and 11 were already live before it.

### Also deployed 2026-10-02 — the port to Connect and the split prototype

| | |
|---|---|
| production | `c725843 -> origin/main` |
| prototype twin | `97c047f -> proto/main` |

⚠️ **Connect is NOT the worker app — Go is.** Connect is "On-Demand Workforce
for Businesses", a customer-side portal and a sibling of Request, so most of the
deck applied there. A session that assumes otherwise will under-scope the port.

Ported to `Final/gopher-connect.html`: floating cards, the Age-Restricted
category always showing, the deals headliner + 5 category winners (Connect had
the **identical** empty-data bug — `dealsHomePicks()` scanned for a
`featuredSlot` no merchant carried), the 5-up `.dh-cats` grid, tap-to-change
profile photo, and the greeting moving below the header bar (its avatar was
already top-right).

NOT ported because the surface does not exist in Connect: the two-pathway home
screen, the deals button, the merchant marquee, the delete-account dialog, the
TrustShield cancel dialog, the matched sidebar CTA pair. `.hirerev-back` **is**
defined in Connect, so Request's unstyled-button bug does not exist there.

`_prototypes/Request/gopher-request-flow.html` is the allowlisted prototype file
carrying `.cat-tile`; it got the same borderless treatment.
⚠️ `_prototypes/` belongs to the **Web → Go Prototype** session. Edited on the
owner's direct instruction — tell that session rather than let it discover this.

Content-verified on all three hosts. Connect: live and TigerTech byte-identical
at 1,456,830, twin +48 for its `noindex`.

### Deployed 2026-09-30 by `scripts/deploy.sh --push` (both sites, one run):

| | |
|---|---|
| production | `77bf910 -> origin/main` (GitHub Pages + TigerTech) |
| prototype twin | `20f0676 -> proto/main` |

Verified by CONTENT on all three hosts, probes proven against `77bf910^` first, and the
**bytes each host serves** re-parsed (19 / 14 / 4 blocks, 0 failed).

Live from the deck: slides **7, 10, 11, 14** (these four were carried forward from the 09-29
deck and were already shipped), plus **13's stacking half**, **1 (partial)**, **6**.
Also live: G40-68's previous-jobs filter (see §5).

⚠️ Pages and the twin lagged ~25s behind TigerTech on first check. That is Pages build
latency, not a bad deploy. Re-check before concluding.

## 2 · What is COMMITTED BUT NOT DEPLOYED

`75ae40c`, `c6d23b4`, `544a1ca`, `814c7fe`. Working tree clean under `Final/` and
`_prototypes/`. **None of this is live. Do not deploy without the owner seeing it** —
he has sent the home screen back twice.

**The dashboard home screen** (`data-rqsec="choose"`) — its only job is the choice,
Services or Deals. The dashboard OPENS here, superseding the v76 "New Request is the
screen" decision. Both destinations already existed; the cards call `setRequestPath()` /
`renderDealsHome()` directly.

Built to the owner's 10/01 annotated mockup:
- Both cards lead with their own mark, **centred**.
- Copy verbatim: "Let's get you connected to a great local worker" / "View hot local deals
  near you", with short bodies that run the full card width (no max-width cap).
- **Symmetrical CTAs**, both exactly 186x45 — "+ Make a request" (green) and "View Local
  Deals" (gold, with the old `dtSheen` sweep, SPONSORED PICKS sub-line dropped). The green
  one carries a transparent 1.5px border purely to match the gold one's height.
- **Merchant marquee** — two rows of real marks from `gopher-customer-deals.html`, 20 logos,
  top scrolling →, bottom ←.
- Services card runs four looping `services-clip-*.mp4` quads, same pattern as the laptop on
  `gopher-services.html`.
- **"Activated" state**: the sidebar's `+ New Request` and `View Local Deals` buttons are
  HIDDEN on the home screen and appear once a card is chosen (`.dashboard.is-choosing`).
- Sidebar narrowed 260px -> 229px.
- Profile photo by default (46px, 14px gap); `px-1043471-240x240.webp`.
- `Start` -> `Submit` on the bid review; tab row removed from the request destination.

## 3 · Deck slide status

| # | Item | Status |
|---|---|---|
| 1 | header: drop "Submit New Request", profile circle, logo | **done** — title removed, avatar leads, logo resolved (§4) |
| 2 | home screen, 2 pathways | **built to the 10/01 mockup, unapproved** |
| 3 | services destination | existing; tab row removed |
| 4 | deals destination + headliner & 5 category winners | **NOT built** — the headliner/5-winner hierarchy is still outstanding |
| 5 | "floating cards … almost 3D" | **rebuilt with 4-layer depth, unapproved** — first attempt rejected |
| 6 | Done button on Saved addresses | **live** |
| 7 | bids `$0.00` vs `$102` | **live** |
| 8 | 1st-available / MY Gopher auto-connect to live screen | **NOT started** |
| 9 | "Start job" bar rule | **NOT started** (see §4) |
| 10 | BID left + tappable itemisation | **live** |
| 11 | bid review + Submit | **live** |
| 12 | TrustShield panel — celebrate, manage card/selfie, soft removal | **NOT started** — owner rejected what shipped as a scare dialog |
| 13 | delete dialog | stacking **live**; "Fix UI" **NOT started** |
| 14 | TrustShield discount copy | **live** |

## 4 · OPEN — needs the owner

1. ~~**The sidebar logo.**~~ **RESOLVED 2026-10-01.** The owner's third screenshot showed the
   wordmark WHITE on the navy. `gopher-request-logo.svg` paints it `fill="#012462"` — the same
   navy — and there is no white variant in the repo, so an `<img>` could never work. `initLogo()`
   now FETCHES the SVG, inlines it, and swaps that one fill for white; the gopher art keeps its
   greens. Inlining is what makes it recolourable at all.
   ⚠️ `fetch` fails on `file://`, so a double-clicked local copy falls back to the old
   bitmap-on-a-white-chip. That fallback is deliberate, not a regression — see §8.
2. **Home screen treatment.** Built as "Brand fields" (navy vs gold). Two alternatives were
   mocked (photography; light & airy). Not chosen.
3. **Slide 9's "Start job" rule** — Connect only, and only when more workers were requested
   than accepted. NOT yet implemented. ⚠️ Do not conflate with slide 11: the owner ruled
   2026-09-30 that slide 11's button is **Submit**, a different control on the bid review
   overlay. Implementing slide 9 must not remove it.
4. **"on and on and on"** — the owner said there is more wrong than he had listed. His list
   has not arrived. Do not infer it from the deck.

## 5 · G40-68 (another session's work, merged here)

Previous-jobs filter on the Gopher profile. Merged `f1db11d`, docs follow-ups `c84e6a5`,
`c901597`. **Live on web.** The Request APP gets it only with the 10/2 store build.
`!419` (Business Gophers show their business, everyone else personal) **IS merged** —
28f51c802 is an ancestor of `origin/production`; an earlier claim that it was pending is
wrong.

**101 guides are STILL OUTSTANDING** for it, and the owner's standing rule is that a
user-facing change is not done until its guide is updated.

⚠️ Commit `1812669` on this branch is titled "G40-68: 101 guides describe the new Gopher
profile" — **it does not.** It is two lines: a passing "past jobs" mention inside a
radio-row description. Neither guide contains the phrase "previous jobs" at all, and none
of the rules below are described. Checked by reading the diff, not the subject line. Do not
let that commit close this item. Rules to write against (owner-approved, via
the G40-68 seat):
- Default is View All Previous Jobs; "View Previous [Category] Jobs Only" follows the active
  request's category — Delivery, Need A Ride, Service, Other.
- Each row: month + year, type, and ★ rating or "Not rated".
- Empty state: "No Previous [Category] Jobs".
- NOT shown: other customers' comments, photos, prices, exact dates.
- Ride Sharing Info on Need a Ride only.
- Write the web-accurate version now; HOLD app-specific sentences until the 10/2 build.

Also outstanding: 101 guides for this deck's user-facing changes — the step-1 header,
Other -> Custom Task, TrustShield in nav, account deletion, and the new home screen.

## 6 · Traps found here (cost real time; do not re-learn)

- **`1fr` is `minmax(auto,1fr)`.** Grid tracks floor at their content's intrinsic size. Image
  tracks computed 201px rows inside a 140px box and the second row overflowed out of view,
  which read as "only 2 of 4 images are there". Use `minmax(0,1fr)`.
- **A browser will not start a video it cannot show.** `play()` called while the container is
  `display:none` resolves and leaves the video paused — readyState 4, no error. Defer past
  paint (`requestAnimationFrame`) and re-issue when the section is shown, because videos also
  pause when hidden.
- **The preview pane does not autoplay muted video.** Control: the LIVE `gopher-services.html`
  — same pattern, in production — is also 0/4 playing in the pane. So "paused here" is not
  evidence of a bug. It is also not evidence the clips work; that needs a real browser.
- **A repo-vs-`origin/main` byte compare flags transformed files as changed.** The deploy adds
  a `noindex` meta and rewrites `../../Final/assets/` -> `../../assets/`. Undo those before
  concluding a file is out of date. I reported a false "DIFFERS" on this twice.
- **`.dashboard` is `display:none` until `openRequestDashboard()` runs** (Request) /
  `__openDashboard()` (Connect). Rendering into it without opening it produces blank
  screenshots and `offsetParent: null` on every element.
- **A `textContent` probe over a filtered list reads hidden rows too** and reports the same
  list filtered or not — it will pass a broken filter. Use `offsetParent` + computed display.
- **The deploy script's diffstat ELIDES.** It printed "4 file(s) changed" and listed 3. Check
  the count against the list; the omitted file was a shared JS module.

## 7 · Cross-session

- **Explorer Deck / Public Tour** (`local_55c39be8…`) mirrors the repo WORKING TREE into
  explore.gophergo.io and tour.gophergo.io and byte-compares against live first. Ping it when
  a deploy lands. Its `mirror-proto.py` parses `PROTO=( … )` out of `scripts/deploy.sh` —
  see the ⛔ comment at that array before reshaping it.
- **Web -> Go Prototype** (`local_15b531c4…`) owns the PT side. Agreed 09-30: one combined
  `deploy.sh --push` rather than split `--site` runs, per the both-sites-are-default ruling.
- **G40-68** (`local_2817ac02…`) — see §5.

## 8 · How to SHOW the owner (he could not open the link)

⛔ **`http://localhost:8250` is NOT reachable from the owner's own browser.** The preview
server runs inside the session sandbox — nothing listens on that port from outside. Handing
him a localhost URL wastes a round trip; it works only in the in-app Browser pane.

### 8a · Best route — a published Artifact (added 2026-10-01)

**https://claude.ai/artifact/UakWSaDiygowUcwPM6kx9P** — the home screen, served over HTTPS,
openable on any device he is signed in on. Private to his account; nothing is published to
any of the three real hosts. 105 files, ~7 MB: `index.html` plus only the assets the page
actually requests (captured from a real network log, not guessed), including all 18
`services-clip-*.mp4` because the quads pick 4 at random from the full pool.

Rebuild + republish recipe — the staging dir is
`<session scratchpad>/artifact/`, and the republish must pass
`url: https://claude.ai/artifact/UakWSaDiygowUcwPM6kx9P` or it creates a SECOND artifact
at a new URL instead of updating this one.

⚠️ **Three things differ from the served page, all expected:**
- A **preview-only bootstrap** is appended before `</body>` that calls
  `openRequestDashboard()` on load. Without it the artifact lands on the marketing page and
  the dashboard is reachable only through sign-in, which needs the network. **It is NOT in
  the repo copy** — `Final/gopher-request.html` has zero bootstrap hits. Do not let it leak
  back into the repo.
- **Google Maps is blocked.** The artifact CSP admits only the artifact's own files, Google
  Fonts and a few script CDNs, so `maps.googleapis.com/maps/api/js` never loads and address
  autocomplete is dead inside the preview. It does not touch the home screen.
- It is **a snapshot.** Editing `Final/gopher-request.html` does not update it; republish.

⛔ **Could NOT be verified end to end from this session** — the in-app Browser pane is not
signed into claude.ai and hits the sign-in wall. What IS verified: all 105 files published
with correct MIME types (`action: "list"`, `scope: "files"`), and the identical bytes minus
the bootstrap render correctly on the preview server (screenshots sent 2026-10-01). If he
reports it blank, that gap is where to look first.

### 8b · Fallback — a self-contained copy on his Desktop

```
rm -rf ~/Desktop/Gopher-Home-Preview && mkdir -p ~/Desktop/Gopher-Home-Preview/assets
cp Final/gopher-request.html ~/Desktop/Gopher-Home-Preview/index.html
rsync -a --include='*/' --include='img/***' --include='css/***' --include='js/***' \
  --include='fonts/***' --include='video/services-clip-*.mp4' --exclude='*' \
  Final/assets/ ~/Desktop/Gopher-Home-Preview/assets/
open ~/Desktop/Gopher-Home-Preview/index.html
```

The page references `assets/…` relatively, so that layout is all it needs (~60 MB with the
clips). **Expect one difference from the served version: the logo falls back to the white
chip**, because `file://` blocks the fetch that inlines and recolours the SVG. That is the
fallback working. If the logo itself is what needs judging, serve it or inline the SVG into
the markup.

## 9 · Immediate next steps

1. **Owner review of the home screen** — built twice to his notes, still unapproved. His
   "on and on and on" list has never arrived; do not infer it.
2. **Slide 4** — the deals destination needs 1 headliner + 5 category winners. Not started,
   and it is the one piece with commercial weight (those are the sold placement slots).
3. **Slide 12** — TrustShield panel: celebrate verified, manage card/selfie, soft removal.
   What shipped was a scare dialog and he rejected it.
4. **Slides 8 + 9** — flow tightening. ⚠️ Slide 9's "Start job" rule is Connect-only /
   multi-worker-partial; it must NOT remove slide 11's **Submit** button, which is a
   different control.
5. **Slide 13** — "Fix UI" on the delete dialog (the stacking half is already live).
6. **101 guides** — this deck's user-facing changes plus G40-68 (§5).
7. **Deploy** when approved: one bare `scripts/deploy.sh --push` (both sites), scope-check
   the dry run, then content-verify all three hosts.
