# G40-244 Riders — session handoff 2026-09-10

**Transcript:** `55d9acde-e6c5-4363-8a87-7a5286e7a9c4.jsonl`
**Grep anchors:** `G40-244` · `!284` · `f19bffd2d` · `ba2a276f9` · `dcecf9366` ·
`assert-ride-details-visible` · `PHOTO_EXEMPT_CATEGORIES` · `!565` · `f7de7d29` · `65352` ·
`resolvePhotoStepTarget` · `photo_requirement_for` · `move_asc_desc.gopher_needed` ·
`g244-fix`

Two workstreams ran here: **G40-244** (the ticket) and an **owner-reported ride/photo bug**
found mid-session. They are unrelated in code and shipped by different mechanisms.

---

## State of play

### G40-244 — Gopher Go "Need a Ride" details · DONE + MERGED, **3 of 6 ACs never exercised**

Jira status: **Ready for QA** (moved from In Progress; deliberately *not* Done).

**The ticket overstated the bug.** It named three missing fields; **one** was missing.

| Field | Ticket | Verified on `origin/production` | Action |
|---|---|---|---|
| Rider count | missing | ❌ genuinely absent | **Added** |
| Trip Distance | missing | ✅ already coded | none |
| Special Instructions | missing | ✅ already coded, captioned `Details:` | **Renamed + relaid out** |

Trip Distance and Special Instructions render inside `display: <value> ? "flex" : "none"`, so a
thin payload made them vanish with no error, warning or log — which is why one missing row was
filed as three.

**Verified (code-level):** AC 2 (row omitted when empty), AC 5 (full text, no truncation —
measured 337px / 4 lines at 375px), AC 6 (Delivery/Service unchanged — the *shipped* gate
expression was extracted from source and evaluated against 7 category fixtures).

⛔ **NOT verified: AC 1, 3, 4.** **No Need-a-Ride request has ever rendered on this code.** They
are deferred by owner decision (merge on code-level evidence rather than spend a real card
authorisation manufacturing a ride), to close on the first organic ride. **Do not tick them off
the back of the merge.** Android also untested.

### Ride completion photo — owner-reported, **FIXED AND LIVE**

Owner hit it on a real completion (order **65352**, iPhone 15): *"Rides will never need a pic at
completion."* He skipped, so it was not a blocker.

`step_applies()` exempted only age-restricted orders, so a ride qualified by *not being A/R*.
Now `PHOTO_EXEMPT_CATEGORIES = ['need a ride']` in `helpers/completion_photo_policy.js`.

⚠️ **The larger half was not the prompt.** `controllers/order/update.js` withholds the
requester's confirm-and-release notification while `photo_requirement.applies` is true. On a ride
the requester waited on a step that could never produce a photo — and if the Gopher's client never
resolved it (force-quit/crash), **the notification never arrived at all**. Chain verified end to
end: `applies:false` → `notify_requester_to_confirm` at completion → writes `COMPLETION_NOTIFY_NOTE`
in `order_logs` → `photo_step_resolved` reads true → confirm screen opens immediately.

---

## Deployed?

| Change | Where | State |
|---|---|---|
| G40-244 | `gopher-mobile-gopher` `production`, merge **`f19bffd2d`** | **Merged, NOT shipped.** Content-verified on `origin/production`: `Riders:` + `Special Instructions:` present in both files, ``title={`Details:`}`` gone, guard present. |
| Ride photo fix | `gopher-backend-api` `production`, merge **`f7de7d29`** | **LIVE in production.** EB version label carries that SHA; env **Green/Ok, 0×4xx, 0×5xx**. |
| Go 101 guide | — | **REVERTED, never deployed** (`9508285`). `origin/main` never carried it. |

⛔ **G40-244 is store-gated and there is NO OTA in that repo** — no `@capacitor/live-updates`, no
`LiveUpdates` block. Even a pure-JS change needs an Appflow build + store release. Live App Store
build is **3.9.2 (2026-09-06)**, cut before this work. **`IOS_VERSION` must exceed 3.9.2** or
TestFlight rejects the upload.

⚠️ The backend fix **is** served, not compiled in, so it should reach 3.9.2 handsets already in the
field — via `src/helpers/photoStepRouting.js` (landed 2026-09-03). **That is inferred from dates,
not observed.** The owner's next ride completion settles it.

---

## Uncommitted / disk-only files

**Nothing of mine is uncommitted anywhere.** All three repos clean of my work.

⚠️ **The 5 stashes in the shared `gopher-backend-api` clone are NOT mine** — dated 2026-08-03 →
2026-09-04, on other branches. Left untouched.

⚠️ The `Code` repo has other sessions' uncommitted files (`.gitignore`, several
`docs/handoff/*`, `.claude/*` backups). Not mine; left alone.

**Kept deliberately:**
- Worktree `Dev/gopher-mobile-gopher-wt-G40-244` — for the outstanding device test.
- Launch config **`g244-fix`** (port 3402) → that worktree, branch build.
- **iOS Simulator (iPhone 17 Pro) has the branch build installed and signed in** to the dev
  account. Not visible to git. Deleted worktrees: `-wt-G40-244-BEFORE`, `-wt-ridephoto`.

---

## What I would do next, in order

1. **Cut an Appflow iOS build from `production`** with `IOS_VERSION` > 3.9.2. Nothing about
   G40-244 is testable until then. This is the only thing blocking it.
2. **On that build, close AC 1/3/4 on a live ride** — riders = submitted count; trip distance a
   number in **miles** (validate against a known route); all three visible *before* accepting.
   ⚠️ **No `Description:` row should appear** — `needaride.json` defines no description field.
3. **Android pass** — the ticket's QA notes require both platforms.
4. **Confirm the ride photo fix reached the handset** — complete any ride; expect no photo prompt
   and immediate requester confirm. Closes the one inferred claim above.
5. **Re-attach the ticket's screenshots** — the `blob:` URLs don't render for others. Needs a
   human; no Jira attachment tool exists on this side.

---

## Traps the next session will hit

1. ⛔ **Do not edit `Final/` or `_prototypes/` from an app ticket.** This session did it **twice**
   and reverted both (Go prototype; Go 101 guide). Owner: *"244 is a LIVE app issue, so please
   stay in that lane."* The "user-facing change updates its 101 guide" rule does **not** cross the
   repo boundary. **Accepted consequence:** the live Go 101 still says the photo step runs on
   "every job that isn't age-restricted" — false for rides since 2026-09-10. Owner has seen it and
   left it. **Known and accepted, not a defect to fix.**
2. ⛔ **Rebase before merging a stale mobile branch.** This branch sat **52 commits behind** and all
   three touched files had moved (6/4/6 commits). Post-rebase the diff was 4 files; unrebased it
   would have been unreadable. `.gitlab-ci.yml` conflicts **append-vs-append** — rebuild from
   production's copy and re-append your job, or you silently drop other sessions' jobs.
3. ⚠️ **`DetailBlock` renders a numeric `0` as a RAW UNSTYLED text node**, not nothing —
   `{props.valueText && …}`. `undefined` renders nothing. Hence `String(x ?? 0)`. I asserted "a 0
   vanishes" and was wrong; rendering it through `react-dom/server` caught it.
4. ⚠️ **`RequestDetailPullOver` white-screens on a real-shaped payload** if `move_asc_desc` is
   missing (`gopher_needed.toString()`) or lat/lng are **strings** (Google Maps `InvalidValueError`).
   Both evaluated **eagerly**, regardless of the display gate. Pre-existing; **not fixed**.
5. ⚠️ **The available-orders feed carries none of these fields** — `get_order_details` returns no
   `order_info`, and sets `address`/`addresses`, never `pickup_address`/`dropoff_address`. The
   pullover works only because every open path re-fetches `orders/:id`. **That re-fetch is
   load-bearing.**
6. ⚠️ **A stale-DOM probe nearly produced a false regression report.** Re-`load()`ing the screen
   you are already on does not rebuild it, so I read the previous render and saw all categories
   "identical". Force a real remount between probes.
7. ⚠️ **Browser pane occlusion breaks things silently** — CSS transitions and `scroll-behavior:
   smooth` do not run, so MUI drawers stay at their closed transform and `scrollTo` no-ops. Set
   `scroll-behavior:auto` and override the transform.
8. ⚠️ **`REACT_APP_VERSION=45` is a hard-coded force-update PLACEHOLDER** for the gopher app — a
   browser or simulator build dies on "It's time to Update!" before rendering. Raise it (13.9.1) in
   a **gitignored worktree copy only**; native builds need `MARKETING_VERSION` in `project.pbxproj`
   instead, and `cap sync` also rewrites `ios/App/Podfile` — **revert both**.
9. ⚠️ The dev account's **OTP is reusable**, so a browser sign-in works without a fresh SMS — but
   requesting one **does fire a real Twilio SMS**.

---

## Open questions for John

**None.** Every decision was ruled on in-session: merge on code-level evidence (ACs 1/3/4
deferred); global caption rename accepted; prototype edit reverted; 101 guide edit reverted and its
staleness accepted; backend fix merged and deployed.
