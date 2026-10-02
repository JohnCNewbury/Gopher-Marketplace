# Code & logic lane — ownership handoff (2026-10-02)

This session **owns all code and logic** on the Gopher web surfaces. Created
because the originating session ran out of context, and because the owner wants
one seat accountable for behaviour rather than it being spread across lanes.

Branch: `feature/deals-google-maps-audience`, clean and pushed at handoff.
Everything described as shipped below is deployed and content-verified on all
three hosts.

---

## 1 · ⛔ You share two files with another live session — read this first

A **brand compliance** session started the same day and is editing the *same two
files* you are: `Final/gopher-request.html` and `Final/gopher-connect.html`.
Its handoff is `brand-compliance-dashboards-2026-10-02.md`.

**The split:**

| Lane | Owns | Does not touch |
|---|---|---|
| Brand (other session) | colour values, contrast, font smoothing, shadows, spacing of existing elements | behaviour, handlers, data, flow, markup structure |
| **Code & logic (you)** | handlers, state, routing, data shape, new markup, anything that changes what the product *does* | colour values and the style-guide pass |

⚠️ **The deploy reads the WORKING TREE, not HEAD.** A bare
`scripts/deploy.sh --push` ships whatever is sitting uncommitted in the shared
clone — including the other session's half-finished work. Before any deploy:
`git status --porcelain Final/ _prototypes/` and scope-check the dry run. If the
other lane has uncommitted edits, coordinate rather than shipping them.

⚠️ `git` author identifies nobody here — every commit is "John Newbury". To tell
whose work a change is, read the sibling paths in the same commit or the handoff
docs, never the author.

---

## 2 · What is actually open

### Deck slides 8 and 9 — the only unbuilt deck items
- **Slide 8:** 1st-available / MY Gopher auto-connect to the live screen.
- **Slide 9:** the "Start job" bar.
  ⛔ **Connect-only, and only when more workers were requested than accepted.**
  It must **NOT** remove slide 11's **Submit** button — that is a different
  control on the bid-review overlay. The two were conflated once already and the
  owner had to correct it. Slide 11 shipped; leave it alone.

### Open question the owner has not ruled on
**There is no route back to the two-pathway home screen.** Once a user picks
Services or Deals, only a page reload returns them — no sidebar item targets
`choose`, because `Dashboard` maps to `home` (the overview). I raised this with
him on 2026-10-02; he has not answered. ⛔ Do not invent a route; ask.

### Stubs I shipped knowingly — wire or remove, do not leave silently
- **TrustShield panel, ID card and Selfie rows**, in BOTH files. They toast
  "coming soon" rather than doing nothing, because a dead row reads as a broken
  button. Hooks are `#tspCard` and `#tspSelfie`. Wire them to the real screens
  when those exist.
- **Deals featured placements are demo data.** Six merchants carry
  `featuredSlot` + `featuredMonth:'2026-09'`, and `dealsHomePicks()` has a
  clearly-marked **prototype fallback** that ignores the month so the page never
  renders empty mid-demo. ⛔ **Delete that fallback when real auction data backs
  the slots** — in production an unsold month SHOULD render without a headliner.
  The real rule (winners are whoever bought the slot in the auction that closed
  last month) is intact above it.
  ⚠️ Those FEATURED badges name real local businesses. Fine as demo data; a
  decision to make before anyone outside sees it as a claim.

### Longer-standing, from CLAUDE.md
- **deals@ email wiring** — not started. ⛔ Must **NOT** be built against Apps
  Script; that was severed 2026-08-21. It belongs to the G40-305 dispatcher
  (`sendEmail.js`). `docs/handoff/deals-email-wiring.md` is a *decision record*,
  not a work item — its paste-ready snippet must never be pasted.
- **Merchant-portal sign-in, end to end** — still unverified. `/otp/get` sends a
  live SMS, so it needs a real code on a real handset. Failure is silent by
  design. Do not record it verified until someone actually signs in.
- **`#modal-logo` second entry point** — owner ruled 2026-08-24: leave both
  doors open, precisely because the sign-in above is unverified.
- **Produced hero clips for `gopher-connect.html`** — optional. Stock stand-ins
  are live; produced clips drop in at the same filenames with zero code change.

### Backend — closed today, for context
`!691` merged to `production` (`31c3a993`): the Work Settings radius guard now
enforces 1–50 with a default of 25, on **both** writers. It superseded `!653`,
which the release desk closed for being 93 commits behind. PL-168 can close.

---

## 3 · Rules that will bite you if you skip them

- ⛔ **Ask before building when there is a discrepancy.** Owner, 2026-10-02,
  after two guesses at deck slides went wrong. He would rather answer a question
  than review the wrong build.
- ⛔ **Verify deployment by CONTENT, never by SHA.** `main` is a flattened rsync
  lineage sharing no history with feature branches, so
  `git merge-base --is-ancestor` is **always false** for a feature commit and
  reports NOT DEPLOYED for everything ever shipped.
- ⛔ **Both sites are the default.** A bare `--push` ships live *and* the
  prototype twin. `--site live` leaves the twin silently behind.
- ⛔ **The dry-run diffstat ELIDES.** It printed "4 file(s) changed" and listed
  3. Compare the count against the list every time.
- ⚠️ **The lagging host varies.** On 2026-10-02 both GitHub Pages hosts served
  the old build while TigerTech was current; on a later run that reversed. Poll
  until your string lands; never conclude from a first fetch in either direction.
- ⛔ **101 guides are DEFERRED** to near launch (owner, 2026-10-02). This
  supersedes the `CLAUDE.md` rule from 2026-08-05. Do not list them as open.
- `_prototypes/` belongs to the **Web → Go Prototype** session. It was edited on
  2026-10-02 on the owner's direct instruction and that session was told. Tell
  it again rather than letting it discover changes.

## 4 · Traps that cost real time — do not re-learn

- **A JS parse check does not catch a CSS brace error.** A missing `}` in an
  injected `@media` block killed every rule after it while the parse check
  reported 14/14 clean and the page was visibly broken. Add a brace-balance
  check over `<style>` blocks after any CSS edit.
- **The LAST `showSection()` in `openDashboard()` wins.** An earlier call is
  silently overwritten — a v76-era `showSection('new-request')` at the end of the
  function quietly undid the landing-section change.
- **Undefined CSS variables fall back to INHERITED, not to a default.** That is
  how a cream button ended up with white text. 30 such declarations are still
  present across the two files; the brand session has the list.
- **Requiring a backend controller runs every model definition** — use
  `node --check` for syntax, and stub `models` before the controller loads.
- **A probe that counts a string also counts your own comments.** A verification
  probe reported a removed class as "still there" on all three hosts; it was
  matching the comment explaining the removal.
- **`grep -c "var(--green-d"` also matches `var(--green-dark)`.** That prefix
  error turned 1 use into 212.

## 5 · Previewing

Both dashboards open only through sign-in. Use the published preview artifacts,
which carry a preview-only bootstrap that is deliberately **not** in the repo
copies:

- Request — https://claude.ai/artifact/UakWSaDiygowUcwPM6kx9P
- Connect — https://claude.ai/artifact/Ag7WPWBXWg1pD5n7wBQ8Mv
  ⚠️ **The Connect URL changed on 2026-10-02.** The old one
  (`9bpG9NEdpaXea7p6sQK7TG`) is STALE and will keep serving the pre-rename
  page — do not review it. It could not be updated in place: republishing an
  artifact requires having read its live version first, and because every line
  of that page is short the platform demands a FULL read, which for a 1.4MB
  page is ~630k tokens and cannot fit in a context window. The Request page
  escapes this only because two of its lines are long enough that the full-read
  requirement is waived. A Connect republish therefore means publishing a new
  artifact and re-attaching its 174 asset files; they can be copied server-side
  from the previous artifact (`files: {path: {artifact, path}}`) EXCEPT SVGs,
  which that mechanism refuses — publish those 8 from `Final/assets/img/`.

They are snapshots. After changing the repo files, republish to the same URL or
the owner reviews stale pages. `localhost` is **not** reachable from his browser
— the preview server lives in the session sandbox.
