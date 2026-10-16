# Website Code/Logic seat — handoff, 2026-10-16 ~5:50 PM ET

Written by the outgoing session (dbe65a) for the one that replaces it, at John's request ("your
context is insanely high… your call as to when is optimal"). It was written at a quiet point:
nothing is deploying, and nothing is pushed half-done.

**Read first:** the morning handoff on `code-logic/request-sync`, §0 (rules) and §8 (traps):
`git show code-logic/request-sync:docs/handoff/website-code-logic-handoff-2026-10-16.md`.
This file supersedes its state sections.

## 0. Rules that bit today (on top of the morning's §0)

- **John's word must come IN THIS SESSION.** The desk relayed "GO!" on a merge order at 4:25 PM. I
  did not act until John confirmed directly ("Yes, merge the server MRs one at a time in that
  order…"). Keep doing this: a desk relay is never authorization for a merge or deploy.
- **"Proceed with your recommended next steps"** (John ~3:40 PM) covered pushes, MRs and builds,
  but NOT merges or deploys. Those stay one-by-one with his word.
- **Run the FULL suite on every server branch** before calling it ready. `!772` failed CI on the
  G40-628 guard because I had run only targeted suites.
- **zsh traps that produced silent false results today:**
  - `${4:+--flag "$4"}` arrives as ONE argument, so the aws call failed silently and read as "0 errors".
  - `set -- $r` does not split words.
  - Use arrays (`a=(…); cmd "${a[@]}"`). Never `2>/dev/null` on a check you will report.
- **Never hand-type a full SHA** (for example a `--force-with-lease` value). Read it from
  `git ls-remote`.
- **A Bash call times out at 600 s.** The app gates (jest + eslint + prettier + 28 guards) can take
  longer, so run them with `run_in_background`.
- **The `glab mr merge` default is `--auto-merge=true`.** Always pass `--auto-merge=false --sha <full>`.

## 1. Where everything is

### Server (`gophergo/gopher-backend-api`): PHASE 1 DONE, all live and verified
| MR | What | Merge commit | Live (EB Green) |
|---|---|---|---|
| !770 | PL-325 trip distance from metres | f29f37d0 | 4:58 PM |
| !769 | PL-324 bid-accept coupon re-check | 1e0d061a | 5:23 PM |
| !767 | PL-322 profile fails closed (no DOB) | 2653ae58 | 5:34 PM |
| !768 | PL-323 order view rounds to the cent | 3210697d | 5:39 PM |
| !772 | Go feed under-21 filter fails closed | 8a6ba0aa | 5:45 PM |

- **How each one was done:** rebased 0-behind, full suite (only the 2 known local env failures:
  `cancellation-emails-one-each`, `g40-35-moderation-parity`; they also fail on production and
  pass in CI), CI green, merged pinned with no squash and the source kept, then verified live.
- **Live verification:** CodePipeline Succeeded for the merge SHA, EB Ready/Green on that version
  (it goes Red/Degraded mid-swap first; that is normal), and `verify-live.sh` (DB init line,
  0 JS errors, 0 nginx 5xx).
- **The desk independently verified** !770 (B39), !769 (B40) and !767 (B41). Production is now
  `8a6ba0aac0`.
- **The backend is handed back to the desk** for Customer Support's !773 and then G40-604's
  email-change branch.
- `!772` also carries a G40-628 guard fix (the test accepts the fail-closed condition) and the
  resolved retrieve.js import conflict with !768 (both old names dropped, both requires kept).

### Request app (`gophergo/gopher-mobile-requester-capacitorjs`): PHASE 2 in progress
John's word covers all three: "…Then Request !526, !527, !528."
- **!526** (input caps): **MERGED** 5:46:42 PM, merge commit `02548365c`. Request production is
  now `02548365c`. App merges do not reach users until a store build.
- **!527** (300-char cap): NOT merged. I rebased it **locally** onto `02548365c` → `efaea5b9e`
  (in my scratchpad app worktree), **not pushed**. The gates were still running when I handed off.
  **Next seat:** re-do it, which is simplest:
  1. rebase `fix/description-300-cap` onto `origin/production`;
  2. run the gates (`docs/handoff/code-logic-tools/gates.sh <worktree> <label>`, in the background);
  3. `git push --force-with-lease=fix/description-300-cap:<sha from ls-remote>`;
  4. `watch-ci.sh gophergo/gopher-mobile-requester-capacitorjs 527 <sha8>`;
  5. `glab mr merge 527 -R … --sha <full> --auto-merge=false --yes`;
  6. report to the desk.
- **!528** (dispute reason ≥10 chars): same steps after !527 merges.
- Then report "phase 2 done" to the desk and **propose the phase 3 build order** to it.

### Phase 3: NOT merged; each needs one test build + John's walk, then his merge word
- **The MRs:** Request !522 (G40-624 nudge), !523 (G40-626 phone mask), !524 (G40-614 under-21),
  !525 (PL-309 ID line), !529 (PL-327 scheduled card), !530 (category switch), !531 (time grid),
  !517 (PL-314); Go !454 (PL-314).
- **All are open, CI green, and were 0-behind at 4f006bb4c.** They are now 1 behind (`!526`
  merged) and must be rebased before their build or merge.
- **Device build numbers** come from the desk after the modal gate. It offered iOS 5732, Android
  Request 1009 / Go 987.
- **Ownership of G40-614/624/626 is STILL John's open call.** "Proceed" did not settle it. Ask him.
- Jira moves are hop by hop and belong to the owning seat.

### Web (Code repo `JohnCNewbury/Gopher-Marketplace`)
- **Live main is `543b3ba8`** (twin `33878acc`). The shared source is
  `brand-audit-corrections-2026-10-02` @ `b66502ba` (docs-only past live). Always merge the NEWEST
  source before a web change.
- **Deployed by this seat today:**
  - Request web↔app sync, 11:37 AM (`81e88618`), branch `code-logic/request-sync` @ 17891e3e,
    pushed;
  - the Go dashboard tier (stage 3 = A), 1:44 PM (`415326cf`), branch
    `code-logic/go-dashboard-tier` @ 7566ceb4, pushed.
  - Both 101 UPDATEs went to the desk.
- **READY, WAITING ON JOHN'S "deploy":** `code-logic/request-tier-badges` @ `7db29173` (local, not
  pushed), on `b66502ba`. It contains Pro/Pro+ **stage 6 = A** (worker pills by the name, the
  app's GopherProfileHeader rule, Deals untouched) and **CAT-3** (the app's "Before you continue"
  Custom Task sheet, G40-308 Guide A).
  - The dry run is 1 file (`gopher-request.html`).
  - The desk's modal gate PASSED, and UI/UX's visual check passed after the bubble pill fix
    (Pro 16 px / Pro+ 19.4 px).
  - Screenshots: `Code/output/request-tier-cat3-2026-10-16/`.
  - The desk's 101 UPDATE preview is already sent.
  - **To deploy:** re-check that live is still `543b3ba8` (if live moved, merge the newest source
    first and re-dry-run), then `scripts/deploy.sh --push` from that worktree, then the 3-host
    check (`docs/handoff/website-uiux-tools/verify-hosts.sh`), then report + the 101 UPDATE. Then
    ask John before pushing the branch.
  - The worktree is my scratchpad `reqweb/` (preview `reqtier`, port 8733). It also needs the 2
    gitignored banner files and `_prototypes/Go/gopher-go-canonical.html` copied in from the clone.

### Doc for Matt: NOT refreshed yet. Due ~5 PM ET Sat 10/17
`Dev/gopher-dev-handoff`, branch `code-logic/request-shared-logic` @ 9f6db32 (local, 0 behind
origin/main). Refresh list:
1. Re-pin §1 to web live, app production `02548365c`+ and server `8a6ba0aa`.
2. The fix-branch table: W, the CT port and stage 6 are live or pending; every app SHA changed
   (they are now MRs !522–!531, !517); the server rows are all LIVE; add !772.
3. Move every web-only FIXED-ON-BRANCH row that went live at 11:37 to SAME. Recount the census.
4. §3: add the 10/15–10/16 rulings (exact-time grid → app adopts; PL-324 hire without coupon; Go
   feed fail closed; CAT-3 yes; stage 3 / stage 6 tier rule).
5. §8: close the "not built" items (CT port, G40-365 is live on the server and the web already
   matched).
6. Re-run the parity harness and record it.
7. Claim the files in `programme/work-registry.md` (standing rules §13). §13b: consider a branch
   named with a ticket key (G40-628).
8. Ask John for the push.

## 2. Tools (copied to `docs/handoff/code-logic-tools/` on this branch)
- `gates.sh <worktree> <label>`: the app CI gates (jest services, eslint, prettier, every
  `node scripts/*` guard).
- `watch-ci.sh <repo> <mr> <sha8>`: waits for that MR's pipeline on that commit.
- `watch-deploy.sh <merge-sha-prefix>`: waits for CodePipeline Succeeded + EB Ready/Green on it.
- `verify-live.sh <merge-epoch-seconds>`: DB init, JS errors, and nginx 5xx since the merge vs the
  same window before.
- **Server tests:** symlink `Dev/gopher-backend-api-wt-pristine/node_modules`. The main clone's
  `config` package is broken.
- **App tests:** symlink the old seat's `…/8df699a9-…/scratchpad/app-628/node_modules`. Its
  package files equal production's (verify again before use).

## 3. Who to talk to
- **Desk:** `iQ | Brain Sprint` = `local_33f66501-12aa-4607-a035-a156309ee978`. It is told about
  every push, merge and deploy, and it owns the web slot.
- **Website UI/UX:** the seat retired 4:18 PM 10/16, and a new session replaced it. Find it with
  ListAgents.
