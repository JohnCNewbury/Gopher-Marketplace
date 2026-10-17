# G40-570 "Duplicate Request Category Cleanup" — handoff

Session "Gopher #2 · G40-570", 10/17 (ET). Sprint 908. Owner text: "Need to change CDB to Age-Restricted" + screenshot "Wrong Category.png".

## What the ticket is (verified first-hand)

The screenshot (Jira attachment 15540, downloaded with the token file and opened) is the Request app's
**"You Already Have One Out"** sheet: *"Your **CBD/Other** request is accepted — a Gopher is on it (#65980)."*

`CBD/Other` is the **stored** `sub_category_type` of every age-restricted delivery. The Age-Restricted tile (`cbd.json`)
and the new Delivery flow's age switch still send it (`stepFlow/flows/delivery.js` `AGE_RESTRICTED_SUB_TYPE`).
Dispatch (`category_match.js`), Work Settings (`Delivery-CBD/Other`), the under-21 gate (`AGE_RESTRICTED_KEYWORDS`) and
the fee all key on it. **So the fix is display-only. No DB change, nothing stored changes.**

G40-495 had already relabelled most captions and merged the Go work-settings rows into one "Age-Restricted" row.
At the production heads (Request 46c0498e1b, Go a7228d6f9e, backend 5edfb306a0, web docs/handoff-2026-10-17 9025e130)
these still showed "CBD/Other" to a user:

1. Request: the duplicate sheet label (`renderForm` → `categoryOfSchema(schema).subCategory` = cbd.json's "CBD/Other").
   It shows when the old cbd form opens: Request Again or editing an age-restricted order. (Home → Delivery now opens
   the single step flow, which says "Delivery".)
2. Request: low-offer note in `button.js` ("…for Delivery - CBD/Other").
3. Older orders' stored **title** "Delivery - CBD/Other" (pre-G40-495 builds), shown by the title helpers in both apps,
   the backend's `displayTitle` (emails/SMS) and the web cards.
4. Backend Previous Jobs type "Delivery · CBD/Other" (`previous_jobs_rules.jobTypeLabel`) and provider-history detail.
5. Web `gopher-go.html` signed-in job-history card (raw `sub_category_type`).

Not changed (verified not user-visible): Go `RequestCategoryBlock` "CBD/Other" button (no Go schema uses
`requestCategoryBlock`), Go `button.js` low-offer copy (requester flow, kept out of Go), icon/logic comparisons, dead
category lists named in the G40-495 doc.

## Branches (all `G40-570-age-restricted-label`, worktrees under `Dev/G40-570-wt/`)

| repo | base | commit | files |
|---|---|---|---|
| gopher-backend-api | production 5edfb306a0 | 809646e9 | helpers/display_title.js (+displaySubType, title map), previous_jobs_rules.js, provider_history.js, 2 old pins, new test/g40-570-age-restricted-label.test.js |
| gopher-mobile-request | production 46c0498e1b | 6030db087 | helpers/categoryLabel.js (+subCategoryLabel, title + Previous Jobs map), PendingCategoryRequestModal.js, button.js, tests |
| gopher-mobile-gopher | production a7228d6f9e | d6c67d97b | helpers/jobTitleLabel.js (title map), tests |
| Code (web) | docs/handoff-2026-10-17 9025e130 | b19e60c3 (+ this note) | app-shared categoryLabel.js regenerated from Request 6030db087 + lock; gopher-go.html card; this note |

MRs (all target production, open, NOT merged): backend !779
https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/779 · Request !536
https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/536 · Go !460
https://gitlab.com/gophergo/gopher-mobile-gopher-capacitorjs/-/merge_requests/460. Web: branch pushed, no deploy.

Heads after CI fixes: backend 27f621eb, Request cff6bde79, Go 088758c70 (each = feature commit + one CI-fix commit).
**CI green on all three (10/17 ~2:45 PM ET):** backend all 451 suites (incl. g40-570 8/8, g40-551 sites/email/title,
g40-68); Request services 3643 passed (categoryLabel.g40570, pendingCategory.g40549, PreviousJobs.g4068); Go services
1294 passed (jobTitleLabel.g40570); lint/prettier green. Web generated helper exercised with node; sync `--check` ok.
⚠️ Local node tooling (jest, prettier, DB-stubbed suites) hung at 0% CPU on this machine on 10/17 — CI is the evidence.

## Rules for landing

- Merge only on John's word. Target `production`, squash **no**, delete source **no**. Desk notice before each backend merge.
- Backend auto-deploys on merge; the apps ship with the next store build; the web after the Request MR merges.
- **Web:** after the Request MR merges, re-run `python3 scripts/sync-app-helpers.py` (defaults: owner clone, origin/production)
  in the web worktree, then `--check`. The header SHA should stay 6030db087 if Request merged without squash. Deploy only in the
  desk's slot, from the shared web source, dry run first (0 changes to files not mine), then push the source.
- **Modal gate:** the duplicate sheet's copy changed (label word only, same DecisionSheet kit piece, G40-549 G6). It needs a
  screenshot from a build before a build number is issued.

## Paste-ready prompt for the next session

> You are picking up Jira G40-570 (CBD/Other → Age-Restricted, display only). Read
> `Dev/G40-570-wt/web/docs/handoff/G40-570-handoff.md` first. Branches `G40-570-age-restricted-label` exist in
> gopher-backend-api, gopher-mobile-request, gopher-mobile-gopher and the Code repo (worktrees in `Dev/G40-570-wt/`).
> Check the MR states, then do only what is still open: merge on John's word (target production, squash no, delete
> source no, desk notice first), regenerate the web app-shared copy from origin/production after the Request merge,
> deploy the web in the desk's slot, and take the modal-gate screenshot of the "You already have one out" sheet for an
> age-restricted order on the build that carries it. Report to the desk with what it solved, the risk and the undo.

## Update 10/17 ~2:50 PM ET: build 5745 + a correction

**Correction (verified in code at Request production b43401aa1):** John's screenshot (10/2) predates G40-581 (c259b63f3, 10/4).
Since then, Home → Delivery and Request Again on a Delivery order open the step-by-step Delivery flow. Its duplicate sheet
says "Delivery" (duplicate_scope "category"). The old cbd.json form is reachable only through GO-To, which skips the sheet.
So **the screenshot's sheet was already fixed by G40-581**; my sheet and low-offer changes are defensive. The live
"CBD/Other" text that remains, and that these MRs fix, is in three places:
- Previous Jobs "Delivery · CBD/Other" (server !779; the app maps it too in !536);
- old "Delivery - CBD/Other" titles;
- the web Go job card.

**!536 rebased** onto production b43401aa1 → **058b065ec** (force-pushed).

**iOS 5745** (desk-issued) = production b43401aa1 + !536 058b065ec, Release, MARKETING 14.0.0, appversion 48, splash
G40-552 = 2, bundle contains the title map. Built in my scratchpad `req5745`, a detached worktree with a real npm ci.
Traps hit:
- `cap copy` needs the env, so run it as `npx env-cmd -f .env.requestor.production npx cap copy ios`.
- `pod install` needs `LANG=en_US.UTF-8`.
- Build with the pod-1.17 Podfile.lock, then restore the 1.16.2 lock afterwards; restoring it before the build fails the Pods manifest check. Tree clean after.

Installed on **John's iPhone 12** (00008101-000178C41100001E) at 2:48 PM ET.
devicectl before: Gopher 14.0.0 (5737), Go 14.0.0 (5733). After: Gopher 14.0.0 (5745), Go 14.0.0 (5733).

**Run sheet:** https://claude.ai/artifact/Ras139bMkGD1DDtkdpMswy (db `results`, doc id = row id; G6 pre-marked by Claude).
Rows S1 splash/launch, P2–P3 Previous Jobs, H4 old history titles, D5 the already-out sheet (unchanged, says Delivery),
G6 Go untouched. Screenshots: `xcrun devicectl device capture screenshot --device <udid> --destination x.png` while
John holds the screen.

Go !460 is verified on the A50 when the desk issues an Android number.
