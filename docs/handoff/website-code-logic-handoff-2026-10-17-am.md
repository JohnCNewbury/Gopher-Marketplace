# Website Code/Logic seat — handoff, 2026-10-17 ~8:45 AM ET

Written by the outgoing session (`local_41362588`, title "Website Code/Logic") at John's request
("This session needs a handoff carryover. Context too high"). Nothing is deploying or half-pushed.
One piece of app work is saved as a **local WIP commit** (section 2); nothing of it is on GitLab.

**Read first, in order:** this file → §0 of the 10/16 PM handoff on this branch
(`docs/handoff/website-code-logic-handoff-2026-10-16-pm.md`) → §0 and §8 of the 10/16 morning
handoff (`git show code-logic/request-sync:docs/handoff/website-code-logic-handoff-2026-10-16.md`).
This file supersedes their state sections.

## 0. Rules that bit today (on top of the earlier §0s)

- **John's word comes IN THIS SESSION**, never a desk relay. The desk said so itself today.
- **Before pushing, merging or deploying, give John what it solves, the risk and the undo**, then wait.
  Merges are pinned (`--sha <full> --auto-merge=false`), target `production`, no squash, source kept.
- **A harness picture that looks wrong is a probable REAL defect** (desk PORT-PLAYBOOK, after !531).
  I told the desk the react-datepicker pop-up drawing over the sheet was a harness artifact; the
  phone showed exactly that. Do not dismiss a render you cannot explain.
- **Describe the website from the live page, not from its CSS.** I told John the web's exact-time
  picker was a 4-column button grid (the `.time-slots` CSS exists); the live page draws a calendar +
  a "Select time" dropdown. He picked "web's layout" on my wrong description; it cost a second
  question. Drive the live page (localhost :8733, stubbed map points, §5) before describing it.
- **Every device walk gets a run-sheet ARTIFACT** (rows + Pass/Fail/note → db `results`), not a chat
  list. Pre-fill your own checks with `by:"Claude"`.
- **zsh traps:** `"$H:refs/..."` is the `:r` modifier — write `"${H}:refs/..."`; `=====` in a
  command breaks it; don't put an unformatted harness file in a worktree while gates run there
  (prettier/eslint scan `./src`).
- **Harness renders:** set `window.innerWidth` BEFORE the component module loads (`require()` it
  inside the test). Modules read `const { innerWidth } = window` at import; a top-level `import`
  gives jsdom's 1024 and every inline size comes out ~2.6× too big.
- **⛔ FILE HOLD (desk, ~8:15 AM):** G40-604 is doing the website buttons (Stage 5 = A) on
  `Final/gopher-request.html`, `Final/index.html`, `Final/gopher-go.html`, cut from `5d3606bc`.
  **No edits to those three until its deploy lands**; then merge its source before any web edit.

## 1. What shipped today (all verified first-hand; desk-verified too)

| What | App (Request) | Web (live / twin) | Source |
|---|---|---|---|
| Phase 2: !527 300-char cap | merged `98075383f` 5:51 | — | — |
| Phase 2: !528 dispute ≥10 chars | merged `203c34bac` 5:58 | — | — |
| Stage 6 tier pills + CAT-3 + on-the-go 900 | — | `6f260ff2` / `a054dfb8` 4:40 | `1546f2e0` |
| "Give it a try" header (John's sketch) | — | `faf5edf2` / `5f3f68f9` 5:37 | `ee95b327` |
| PL-309 ID line + purchase sheet after "Submit as-is" + "What to expect" pulse until opened | !525 merged `5ad475efc` 7:19 | `2189f3b0` / `11b043ce` 7:24 | `9007bae3` |
| PL-347 TrustShield wording ("…showing a valid ID… Your TrustShield ID is on file, so no new photo is taken.") | !533 merged `37ab6aa06` 7:51 | `dc1d7bc3` / `3f4acca3` 7:55 | `5d3606bc` |

- origin `code-logic/request-tier-badges` = `5d3606bc` (= live `dc1d7bc3`). It carries 101 Tutorials'
  navy-menu commit `a1cd4417`. `brand-audit-corrections-2026-10-02` is untouched (UI/UX merges).
- Since then **Request production moved to `0ee95e4cf`** (G40-604 !532, 67 files) and Go to
  `a7228d6f9e`. App merges reach users only with the next store build.
- 101 UPDATEs and DOC UPDATEs (John's rulings verbatim) for all of the above are with the desk.
- John's rulings today (verbatim picks): PL-309 P1 → "Ask, skippable" (purchase sheet on the flagged
  Delivery path, first sentence names the word) and "Until opened" (pulse); PL-347 → "Different
  words"; !531 → "The live website" layout. The Matt shared-logic doc is NOT due today
  (John: "relax the urgency there until next week TBD").

## 2. In flight: !531 (time grid) — WIP, NOT pushed

- MR !531 (`fix/exact-time-slot-grid`) on GitLab = `b53c3e34c`: rebased onto `0ee95e4cf`, gates
  219/219, CI green. **Do not merge it**: walked on iOS **5739** → W1 FAIL ("Very poor UI"),
  W2–W6 pass. Run sheet: https://claude.ai/artifact/Ej1sh2Yi9gEeoAtzGVtnVa
- **Why W1 failed:** `datetimepicker.js` opens react-datepicker as a POP-UP (non-inline popper,
  opened on mount by the `…visible` effect, with a hand-made 350px "Done" child). Inside the
  Schedule-for-later Drawer it floats over the 📅 308 head and the Flexible/Exact choice, clips the
  calendar's top row and shows a second Done. **Pre-existing** (desk parked it as **PL-348**; it
  likely affects the store app; not yet seen on a store build).
- **John's pick (10/17 ~8:40):** "The live website" — exactly what
  `output/pl531-time-grid-2026-10-17/web-pick-exact-time-live-375.jpg` shows: inline month
  calendar (first bookable day pre-selected green, unbookable days grey, ‹ › months), "⏰ Time"
  with a "Select time" dropdown of half-hour slots, then "Scheduled for …" or "Select a time to
  continue"; the sheet's Done is the only Done.
- **WIP saved:** Request repo local branch **`wip/531-exact-time-inline` @ `fa7a956cc`** (on
  `b53c3e34c`), in worktree `…/80a00d2d-…/scratchpad/app` (shares `Dev/gopher-mobile-request/.git`).
  It adds `src/component/yardFlow/ExactTimePicker.js` (website rules: `TIME_SLOTS`, `slotsFor`,
  `firstBookableDay`, `lastBookableDay`, `isBookable`, `scheduleLabel`) and wires it into
  `TimingChoice` instead of `BasicDateTimePicker slots noDefault`. Lint clean.
- **Left to do, in order:**
  1. Revert `src/component/datetimepicker.js` and `src/css/datetimeselector.css` to production
     (`0ee95e4cf`): nothing uses `slots`/`noDefault` any more, and the other callers never did.
  2. Replace `src/component/datetimepicker.slots.test.js` with an ExactTimePicker suite (keep the
     fixed-clock `FixedDate` trick): the 31-slot grid; today at 10:10 offers 11:30 AM–9:00 PM; a
     later day the full grid; first bookable day pre-selected (tomorrow when today has no slot
     left); nothing past 14 days; month nav disabled at the bounds; no time on open; a stale pick
     dropped; a new day keeps the time when offered, else clears; and the REAL review sheet holds
     Done + "Select a time above to continue." until a time is picked, while Flexible stays
     available. Its current review-sheet test fails (it drives the old pop-up).
  3. Squash the WIP into one proper commit on `fix/exact-time-slot-grid` (or a second commit),
     re-check 0 behind production, full gates (`docs/handoff/code-logic-tools/gates.sh`).
  4. Desk gate before a number: modal list (the Schedule-for-later sheet; no new modal; its Done is
     the only Done) + a **FULL device-faithful screenshot of the open sheet with the picker**. The
     inline picker has no popper, so a harness render (app CSS bundle + CSSOM rules, see §5) may now
     be faithful — check it against the web reference picture, and still capture the real sheet with
     `xcrun devicectl device capture screenshot` after install.
  5. Push with the lease (old `b53c3e34c`), CI, build on the desk's number (next free iOS **5740**),
     install on the iPhone 15 Request slot (now 5739; Go 5735 is G40-604's — don't touch), new run
     sheet rows, John's walk, then his merge word.
- The web already runs this logic; **!531 needs no web change** (and the web file is on hold anyway).

## 3. Phase 3 queue after !531 (desk order)

!530 category switch → !517 + Go !454 PL-314 (both apps, one walk) → !522 / !523 / !524 only after
John rules who owns G40-624 / 626 / 614 (still unasked of him today; ask in your session). Every one
re-rebases onto the CURRENT production (re-read with glab; it moves) and re-gates first. None of them
touch InAppMessage.js / inbox.js (desk asked, for G40-635).

## 4. Desk + peers

- Desk: **"iQ | Brain Sprint" `local_c2a2d7a6-ea1c-4a73-bfa2-08c0f0ab37b6`** (the 6:01 PM one; the
  older `local_33f66501` is retired). Report every push, merge, install and deploy with SHAs + ET.
- Website UI/UX `local_a6b21910-…`; 101 Tutorials `local_51b076a1-…`. The earlier spawn
  `local_bc3024df` ("Website Code/Logic") stood down 10/16 evening — it is NOT the seat.

## 5. How-to (worked today)

- **iOS test build** (fresh worktree `…/067e9f85-…/scratchpad/req5734`, own `npm ci`; `.env` copy
  with `REACT_APP_VERSION=48`): `npm run build:requestor_production` →
  `npx env-cmd -f .env.requestor.production npx cap copy ios` (**never `cap sync`**, PL-273) →
  `LANG=en_US.UTF-8 pod install` → restore `Podfile.lock`'s COCOAPODS stamp AND copy it over
  `Pods/Manifest.lock` (else "sandbox is not in sync") → `xcodebuild … -scheme gopher-requester
  -configuration Release -destination 'generic/platform=iOS' MARKETING_VERSION=14.0.0
  CURRENT_PROJECT_VERSION=<n> build` → check Info.plist, `main.*.js` sha = `build/`,
  `appversion="48"`, 36 frameworks (FCM is static), profile has the UDID →
  `xcrun devicectl device install app --device 00008130-000E2D802652001C <.app>`; read both apps
  before/after (`devicectl device info apps --json-output`). GopherCardScan is Go-only.
- **Web deploy:** guard live/twin by `ls-remote` right before; `scripts/deploy.sh` dry run (1 file,
  0 strays) → `--push` → check parents = previous live → 3-host poll
  (`docs/handoff/code-logic-tools/check-hosts.sh`, edit its markers) → push the source on John's
  word.
- **Driving the web to Review on localhost:** Maps refuses localhost, so stub the two addresses with
  `window.__gopherPlaces.remember(text, {lat, lng})` before the change event; the demo profile holds
  TrustShield (`__setTrustShield(false)` to test without).
