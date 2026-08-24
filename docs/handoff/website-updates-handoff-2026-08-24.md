# Website Updates — session handoff, 2026-08-24

**This is an index, not a diary.** The transcript is never deleted and is full-text
searchable; the job here is to tell you *what to grep for*.

**Transcript:** `~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/c82e7c80-2ef1-4c9e-a300-ee39c5093ba4.jsonl`

**Lane:** `Final/` — the four web portals (`gopher-request.html`, `gopher-connect.html`,
`gopher-deals.html`, `gopher-go.html`) + shared `assets/js/` modules.

---

## Grep anchors

Search the transcript (or the repo) for these — each opens a whole thread:

| Anchor | Opens |
|---|---|
| `idSubChipBk` | the 3-step live ID capture (front/back/selfie) |
| `idsub-guide-win` | the ID-1 (1.586:1) alignment frame; `.face` = selfie oval |
| `_legacyIdVerifyFlow` | the TrustShield-enrolment delegation (two capture UIs merged into one) |
| `ar-linkbtn` | the under-30 banner rewrite |
| `dref-eyebrow` | the Deals Refer Gopher section (built from nothing) |
| `gr-lost-link` | sign-in recovery ("Lost access to this number?") |
| `DOMINANCE_RATIO` | the category-mismatch gate fix (2.5, measured not guessed) |
| `run_refer_copy_coverage_test.py` | refer-card/REFER_COPY coverage harness |
| `REFERRAL-QR-SPEC.md` | the settled Refer Gopher design (org handoff repo) |
| `SIGNIN-RECOVERY-SPEC.md` | recovery rules + the Go gated-link ruling |

---

## State of play

### Done AND verified live (content-grepped on BOTH hosts, not by SHA)

Deploy status method: `curl` the live URL and grep a string I changed. **A 200 only proves
the file exists.** `git merge-base --is-ancestor` is invalid here — `main` is a flattened
rsync lineage sharing no history with feature branches.

- **3-step live ID capture** on Request **and** Connect — front → back → selfie, all
  `getUserMedia`, **zero file inputs** in either modal. Live: `idSubChipBk`=2 on both.
- **Under-30 ID path** — they were offered TrustShield *and nothing else*, labelled
  "Required". Both halves were dead after the gate removal. Now the same
  Submit-identification path as 30+, TrustShield beside it as optional. Live: `ar-linkbtn`=3.
- **One capture component** — `openIdVerifyFlow()` delegates to the shared capture on both
  surfaces, so the TrustShield tile, deal verify-once/one-off, and D-029 quick-signup all
  get it. Legacy panes kept as `_legacyIdVerifyFlow`.
- **TrustShield step-2 gate removed** (G40-410 surface 1) — `identity` dropped from
  `SURFACE_GATES.request/.connect` in `assets/js/gopher-step-gates.js`. Four assertions
  **inverted, not silenced**. Module tests 58/58, mutation-proven.
- **Sign-in recovery** on all four portals — shared `assets/js/gopher-signin-recovery.js`;
  interactive on Connect/Request/Deals (demo sign-ins), **gated on Go** (real auth).
- **Refer Gopher, complete matrix** — headline QR = your own platform (Go excepted: Refer
  Yourself headlines), ID once per screen, no same-platform card, Deals section built,
  Deals cards on Connect/Request pointing at the live `?ref=` pre-fill.
- **Deals Refer Gopher section** (this lane's assignment) — LIVE. `dref-eyebrow`=2,
  `data-section="refer"`=1 on `gopher-deals.html`. Hero QR "Your personal link" (runtime,
  vendored encoder), navy code bar once, **sends + platform cards gated with Soon chips**
  (kind-aware rail is rebuild scope), tracking table. "Feature my business" untouched.

**Deploy drift right now: `scripts/deploy.sh` dry run reports `0 files changed —
main already matches Final/`.**

### Done, NOT deployed by me (deployed by another session, verified live anyway)

- My last three ID commits (`9d35ba0`, `54a357a`, `3fa276a`) were shipped in deploy
  `196bc40` by **App / Web Sync**, on John's "ship all of it". I had been holding them for
  John's local test per his 2026-08-23 rule. Both were correct — see the RESOLVED
  ruling below; his "ship all of it" was a per-deploy override, not a lapsed gate.

### In flight / not mine

- `Final/gopher-privacy.html`, BIPA consent lines inside the A/R waiver — **App / Web
  Sync**. They now edit the same two files I do. Leave their lines alone.
- App-prototype + live-app halves of G40-410 (surfaces 2 and 3) — App Prototypes / Matt.

### Not started

- **`gopher-go.html` and `gopher-deals.html` do NOT have the 3-step live ID capture.**
  Request and Connect do. If ID capture exists on those surfaces, they are the next port.
- Kind-aware referral send rail (rebuild scope, in `REFERRAL-QR-SPEC.md`).

---

## Uncommitted files

**Nothing of mine.** `git status --short` shows only:
- `.claude/launch.json`, `.gitignore`, and four `.claude/settings.local*` backups — not
  mine, not deployable (`.claude/` is outside `Final/`).
- `docs/handoff/SESSION-RETIRE-CHECKLIST.md` — untracked, another session's.

**No gitignored disk-only edits by me.** I never edited
`_prototypes/Go/gopher-banner.js` or `_prototypes/Request/gopher-banner.js` — I only ever
*copied them into pinned worktrees* so the deploy preflight would pass.

---

## What I'd do next, in order

1. **Port the 3-step live capture to `gopher-go.html` / `gopher-deals.html`** if those
   surfaces capture ID at all — check first; do not assume they do.
2. **Watch the two-session overlap** on `gopher-request.html` / `gopher-connect.html`
   (App / Web Sync is in them). Claim files in
   `Dev/gopher-dev-handoff/WORK-REGISTRY.md` before starting.
3. Revisit `docs/handoff/refer-parity/run_refer_copy_coverage_test.py` if refer cards change.

---

## Traps that cost me time

1. **⛔ There is more than one of everything.** Two ID-capture modals per page (`idSub*`
   for 30+, `idv*` for under-30); the owner tested and got the one I had *not* fixed. Two
   referral engines. Two step-gate copies before Phase 3. **Before "fixing" a component,
   grep for a second implementation.**
2. **State assertions pass while the UI is wrong.** On Connect the selfie step showed the
   *rectangular ID frame* while its hint said "oval" — every assertion green; only a
   **screenshot** caught it. Take one.
3. **Stale servers serve stale bytes.** A Python server from two days earlier sat on
   port 8123 serving an old scratch copy; testing against it would have "disproved" a
   working fix. `lsof -a -p <pid> -d cwd` to see what a server is actually rooted at.
4. **Browser pane traps:** viewport reports `0x0` until `resize_window` (measurements come
   back 0 and look like broken CSS); `requestAnimationFrame` freezes when the pane is
   hidden, which stalls a canvas-driven fake camera at "Starting camera…" — use
   `setInterval`; always cache-bust with `?v=N`.
5. **`grep -c` returning 0 sets exit code 1** and aborts an `&&` chain — the *desired*
   result kills the rest of your command. And capturing curl output into a shell variable
   under a bad locale silently corrupts counts (`(eval):1: character not in range`) —
   `export LC_ALL=C` and pipe directly.
6. **Regex that eats a closing tag.** Removing a block with a non-greedy `.*?</div>`
   stopped at an *inner* `</div>`, orphaning the outer one, which silently closed the
   `<section>` early and hoisted content out of its pane. **JS parse checks pass — HTML
   nesting damage is invisible to them.** Assert `closest('[data-pane]')`, not existence.
7. **A commit message with `"` breaks `git commit -m` quoting.** Use `-F <file>`.
8. **Verify by content, on both hosts.** Pages CDN lags; TigerTech is a separate FTPS
   deploy. A freshness marker must be a string that exists **only in the new version** —
   I once probed with one the old file also had.

---

## ✅ RESOLVED — owner ruling 2026-08-24 (was an open question; do NOT re-raise)

**The local-test gate STANDS.** Asked directly after App / Web Sync shipped three commits
I was deliberately holding for it. John's ruling:

> The gate stands. An explicit per-instance **"ship it" from him overrides it for THAT
> deploy only** — it is not a standing suspension. The next deploy returns to the gate.

- **Default:** stand up a local serve, give John the URL, wait for his go-ahead, *then*
  `scripts/deploy.sh --push`.
- **⛔ Do not read a past "ship all of it" as evidence the gate lapsed.** That exact
  misreading was anticipated and ruled against — and the 2026-08-24 deploy sitting in the
  log is precisely the artefact that invites it.
- **Both of 2026-08-24's events were legitimate at once:** holding the ID work for the
  local test was right, *and* shipping it on his explicit word was right. Neither
  invalidates the other.

Written into memory `local-test-before-deploy` by the session-rotation session, so it
reaches successors that never read this file.

---

## MEMORY.md lines owed

⛔ Not appended — MEMORY.md is over its limit and twelve sessions are retiring at once.
Add these when it is safe:

```
- [Two ID-capture modals per page](two-id-capture-components.md) — idSub* (30+) vs idv* (under-30); fix both or the owner finds the other
- [ID capture is live-only, 3 shots](id-capture-live-three-shots.md) — front/back/selfie, ID-1 frame, uploads removed; back carries the age barcode
- [Assertions pass while the UI is wrong](screenshot-what-assertions-cannot-see.md) — Connect selfie showed the card frame; only a screenshot caught it
```
