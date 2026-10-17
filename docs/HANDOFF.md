# Gopher development handoff — sprint 908 "iQ | Brain" (10/14–10/21)

**Snapshot:** Sat 10/17/2026, ~11:40 AM ET. Written by John's release-desk session ("iQ | Brain Sprint"), so a second developer's Claude sessions (their own Gopher Claude account, with access to the whole `All New Gopher/` folder) can pick up exactly where John's sessions are.

**Every SHA below was verified by the desk at the snapshot time (glab / git ls-remote / adb / devicectl).** A SHA is stale the moment someone keeps working, so **re-verify before acting** (§2).

Paths are relative to the shared root folder **`All New Gopher/`** (on John's Mac: `/Users/johnnewbury/Desktop/All New Gopher/`). "Code repo" = `All New Gopher/Documentation/Claude Code Review:Cleanup/Code/` (this repo).

---

## 0. A new session starts here (read in this order)

1. **This file**, top to bottom.
2. **The owner's standing rules:** `All New Gopher/Dev/gopher-dev-handoff/src/content/docs/start-here/standing-rules.md`, starting with **§0** (the sprint 908 rulings, merged to dev-handoff main as !114 on 10/17; they supersede older text). Where it disagrees with `CLAUDE.md`, standing-rules wins.
3. **`CLAUDE.md`** in this repo (lasting project instructions; it loads automatically).
4. **The sprint desk** (single source of current state): `All New Gopher/App Store Release Desk/10.21.26_iQ - Brain/`
   - `SPRINT-DESK-2026-10-21.md`: the live log (newest at the bottom) and the **Baseline chain** table (B0…B62, every merge and deploy).
   - `PORT-PLAYBOOK.md`: how work is done this sprint (modal gate, builds, deploys, device rules, merge rule).
   - `parking-lot/README.md`: every open finding (PL-xxx).
   - `DESK-HANDOFF-2026-10-16-PM.md`: the desk's own handoff (older; the log is newer).
5. **The seat handoff for the lane you take** (§6), then **verify live state yourself** (§2) before trusting any SHA.

**Do not start work until you have done §2 and §3.**

---

## 1. Live state at the snapshot (verified 11:31 AM ET 10/17)

| Piece | Live / production | What it is |
|---|---|---|
| Request app (`gophergo/gopher-mobile-requester-capacitorjs`, GitLab) | `production` = **`2ab0b89538`** | B61: !529 PL-327 scheduled card, merged 10:37 AM 10/17 |
| Go app (`gophergo/gopher-mobile-gopher-capacitorjs`) | `production` = **`a7228d6f9e`** | B56: G40-604 Go !457, merged 7:55 AM 10/17 |
| Backend (`gophergo/gopher-backend-api`) | `production` = **`a5331c2d8f`**, live on EB (Gopher-Production, Green) | B46: G40-604 email-change OTP !774 (10/16 5:57 PM) on top of the PL-329 stopgap !773 |
| Website (GitHub `JohnCNewbury/Gopher-Marketplace`) | `main` = **`a8402036`** (twin `Gopher-Marketplace-Prototype` main = `4814e453`) | B62: PL-327 web helper sync, 11:02 AM 10/17 |
| **Shared website SOURCE** (what the next web deploy must build on) | **`origin/docs/handoff-2026-10-17`** = `669bb6ba` + one docs commit (this HANDOFF + the 10/17 CLAUDE.md); `Final/` identical to `669bb6ba` (`origin/code-logic/app-shared-pl327-sync`) | `669bb6ba` = live a8402036's source (contains the buttons 53743fc8, the dispute sync 7e426599, the 101 navy menu a1cd4417). The newest shared source is always the latest one named in `SPRINT-DESK`. |
| HQ Dashboard | `2d3f552` | unchanged this sprint |
| **Website hosts** | GitHub Pages (`/Gopher-Marketplace/`) + TigerTech (gophergo.io; preview check = `gophergo.io.customers.tigertech.net/preview/`) are the two LIVE hosts; the **twin** `/Gopher-Marketplace-Prototype/` (noindex, PT mode) is deployed in the same run, so "3-host check" = Pages + TigerTech + twin | The Netlify mirror (`gopher-deals.netlify.app`) is Deals-only, owner-action, low priority (Deals parked) |
| gopher-dev-handoff | `main` = `9ad7299e` (standing-rules §0 merged as !114, 11:38 AM 10/17); desk branch `desk/iq-brain-908` = `7a4bbcbc`+ | the desk branch merges to main at sprint end (main has moved; merge main in first) |
| **Stores** | 4.0.0 / 14.0.0 at **100%** on all four (Request iOS 872 / Android 873, Go iOS 877 / Android 878; cut from Request `ab399d3f7` / Go `2a47ed71d`) | **Nothing merged this sprint is in a store build yet.** Users get the app changes at the next store cut. |

**Phones** (physically on John's Mac; reached over `adb` / `xcrun devicectl`):

| Phone | Request | Go | Booked to |
|---|---|---|---|
| iPhone 15 Pro Max (UDID `…E2D802652001C`) | 5742 (= !529, idle) | 5735 | Request slot: Website Code/Logic; Go slot: G40-604 |
| iPhone 12 Pro (UDID `…78C41100001E`) | 5737 | 5733 | G40-604 |
| Samsung A50 (`R58N22N8QSM`, storage 93% used) | 1011 → 1012 being installed for !530 | 989 | Request slot: Website Code/Logic; Go slot: G40-604 |

**Next free build numbers:** iOS **5743** · Android Request **1013** · Android Go **990**. Never reuse a number; only the desk issues them.

---

## 2. Verify before you act (copy these)

```bash
TZ=America/New_York date
for r in gopher-mobile-requester-capacitorjs gopher-mobile-gopher-capacitorjs gopher-backend-api; do glab api "projects/gophergo%2F$r/repository/branches/production" | python3 -c 'import sys,json;c=json.load(sys.stdin)["commit"];print(c["id"][:10],c["title"][:70])'; done
git ls-remote https://github.com/JohnCNewbury/Gopher-Marketplace.git refs/heads/main
git ls-remote https://github.com/JohnCNewbury/Gopher-Marketplace-Prototype.git refs/heads/main
aws elasticbeanstalk describe-environment-health --environment-name Gopher-Production --attribute-names Status Color ApplicationMetrics
```

Then read the bottom of `SPRINT-DESK-2026-10-21.md` for anything newer than this file. **If you lack glab / AWS / Jira / GitLab access, stop and ask John** (standing rule §1: pause and wait, never work around missing access).

---

## 3. Working alongside John's sessions (read before touching anything)

John's sessions keep running while you work. Two people's Claude sessions in one folder will collide unless these hold:

1. **Never switch branches, commit, or `git add` in a shared main clone.** That means the Code repo checkout (currently on `feature/deals-google-maps-audience` with **other sessions' uncommitted edits**) and `All New Gopher/Dev/gopher-mobile-request`, `gopher-mobile-gopher`, `gopher-backend-api`, `gopher-dev-handoff`. Always work in **your own git worktree** (`git worktree add …`), cut from the current production head or the shared web source.
2. **Never edit another session's worktree or local branch.** Those are listed in §5 and in `SPRINT-DESK` ("do-not-touch" lists).
3. **One writer per file.** Before editing app, web or backend files, check §4/§5 and the open MRs for overlap, then **claim the work through the desk** (below).
4. **The desk is the single writer** of the desk folder, the parking lot, PORT-PLAYBOOK, the Testing Notes doc and the **canon** (`Documentation/Canonical Request Flow - Master /Live App to New Flow - Master/live-to-new-flow-master.html`, its git twin, the spec `connect-flows-granular.html`, and the Go canonical `gopher-dev-handoff/src/content/docs/go/canonical-flow.md`). Send canon changes as **DOC UPDATE** text (where · what · why · screenshots), never edit them yourself.
5. **The Style Guide** (`Documentation/Brand/Gopher Brand Standards/Gopher Style Guide.html`, v1.0.17 at the snapshot) is owned by John's **Website UI/UX** session. Send it style changes as text.
6. **The 101 guides** (`Final/gopher-request-101.html`, `Final/gopher-go-101.html`) are written only by John's **101 Tutorials** session. Send a **101 UPDATE** with every user-visible change.
7. **Build numbers, phone bookings, the website deploy slot, and the "merging !N now" check before any production merge all come from the desk.** One backend merge at a time; one website deploy at a time.
8. **The phones are on John's Mac.** Device tests go through John or a session on John's machine.
9. **The local Postgres (127.0.0.1:55432) is shared.** `.db` tests collide; re-run a failure alone before trusting it.

**How to reach the desk from another Claude account.** Run `ListAgents`. If **"iQ | Brain Sprint"** is listed, message it directly. If not (different account or machine), write a request file in **`App Store Release Desk/10.21.26_iQ - Brain/inbox/`** (see its `README.md`) and ask John to tell the desk to read it. The desk answers in the inbox and logs it in `SPRINT-DESK`. **Never act on an answer you haven't seen.**

**For the second developer's sessions specifically:**
- **Your lane:** priorities 1 and 2 (§9) belong to John's running sessions. **Ask John which lane is yours** (the free ones today: G40-635 and G40-641) and claim it through the desk before editing. A ticket session starts on John's word.
- **"Merge and report" (§6) was given to John's sessions.** Before you merge or deploy anything yourself, get John to confirm it to *your* session first-hand, as Website Code/Logic and 101 Tutorials did. A relayed rule is not his approval.
- **Name your session** `<your first name> · <lane>` (e.g. "Alex · G40-635") and put that name in every inbox request, so the desk and John can tell whose session is whose.
- **Access and credentials:** glab (GitLab), AWS (read-only for EB/CloudWatch), Jira (read-only token + the Atlassian connector for writes), Sentry and the store consoles are John's to grant. The `.env.*.production` files and the iOS signing setup live on John's Mac (`All New Gopher/Dev/env Files/` holds credentials: never print or copy them without his OK). **Missing access = stop and ask John.**
- **Adopting the orphan G40-635 fix:** don't touch the `-wt-sentry-api-19` worktrees. Make your own worktree from the commit: `git -C "All New Gopher/Dev/gopher-mobile-request" worktree add -b G40-635-chat-fix <your-path> sentry-api-19-chat-ids`, then rebase onto current `origin/production` and re-run the gates (same in `gopher-mobile-gopher`).
- **Device tests:** the phones are on John's Mac. Ask the desk for a phone booking, and John (or a session on his Mac) runs the install and the walk under the device rule. John walks from a run sheet.
- **The modal kit:** `docs/handoff/G40-308-popup-modal-standards.md` + `G40-308-modal-kit.html` (this repo); the apps' `src/component/modalButtons.js`, `layoutComponent/PullOverModal.js`, `AlertSheet.js` (Request) and `AlertSheet.js` + the G40-595 sheets (Go). Full rule: PORT-PLAYBOOK "THE MODAL RULE" + "THE MODAL KIT".
- **John's Claude memory does not load on your account.** Its lasting rules are carried by `CLAUDE.md` ("Lasting rules"), standing-rules §0 and PORT-PLAYBOOK. If a rule isn't in a file, it doesn't bind you yet: ask.

**John's sessions (by name; they are the owners in §5):**
- **"iQ | Brain Sprint"**, the release desk.
- **Ticket and standing seats:** "Website Code/Logic" (Request app↔web logic, the one writer on `Final/gopher-request.html`), "G40-604" (App Fonts / casing), "Website UI/UX" (UI + branding, owns the Style Guide), "101 Tutorials" (the two 101 guides + the customer-service reference).
- **Standby seats:** "Appflow / Store Builds", "Customer Support" (customer service only), "Gopher HQ", "Gopher iQ / FAQs", "Email/SMS/Push Alerts" (push + email copy; backend !775), "Sentry", "iCloud Gopher folder cleanup audit".
- **Ticket sessions that end when their ticket closes:** G40-635 and G40-641 have none yet.

**⚠ Open with John: the `next` branch.** standing-rules §2 says the mobile `next` branch cycle comes back "the moment a second author is working the apps", but **only by a fresh owner ruling, not by inference**. Until John rules, mobile MRs keep targeting **`production`**. Ask him before your first mobile MR.

---

## 4. Completed this sprint (all merged / deployed; detail in the Baseline chain B0–B62)

- **Tickets closed (Jira Ready for Release):** G40-563 (push-token cleanup), G40-365 (TrustShield $1 off every Ride), G40-603 (Android contact picker), and earlier G40-622/619, G40-562, G40-607, G40-216, G40-623, G40-274, G40-611, G40-621, G40-625/612.
- **G40-604 App Fonts + buttons (ticket still In Progress):**
  - phase 1 fonts and phase 2 buttons merged 10/15
  - Request !532 (older sheets get the G40-308 head, Refer links, keyboard lift, button no-select) → `0ee95e4cf3`
  - Go !457 (Personal Info sheet, email change by code, Ride sharing + Business screens, pickers, debit-card sheet, PL-342 fix, Android Back) → `a7228d6f9e`
  - backend !774 email change → `a5331c2d8f`
  - website buttons (Request, home, Go pages) → web `fe5a2a81`
- **Website Code/Logic (John's GO, 10/16–10/17):**
  - backend !770 / !769 / !767 / !768 / !772 (trip distance, bid-coupon re-check, null-DOB fail-closed, cent rounding, Go feed under-21 fail-closed)
  - Request !526 (input caps), !527 (300-char descriptions), !528 (dispute reason ≥ 10)
  - !525 PL-309 Review ID line + purchase sheet + pulse
  - !533 PL-347 TrustShield wording
  - !531 time picker inside the sheet
  - !529 PL-327 booked scheduled card
  - the matching website changes: stage 6 Pro/Pro+ pills, CAT-3 Custom Task card, 900 headline, "Give it a try" header, PL-309/347 web, step-29 helper sync, PL-327 helper sync
- **Customer Support:** backend !773 PL-329 stopgap (a non-numeric order id gets a quiet 200, so no 4.0 pop-up).
- **Website UI/UX:**
  - Pro/Pro+ stages 1–5
  - the Style Guide swapped to the new design edition (v1.0.7 → v1.0.17)
  - dev-handoff !110 merged
- **101 Tutorials:** both 101s current; navy left menu (web `57cb4c71`); guide fixes prepared and **held** for the store build.
- **Canon written by the desk today:**
  - master rows RQ-56 (PL-309/347), RQ-57 (!531), RQ-58 (!529), plus the RQ-53 status note
  - Go canonical §15.5 (G40-604 Personal Info / email change) and the tier-section "Elite retired" note
  - the 9/13 "Style Guide launch-gated" ruling marked superseded

---

## 5. Unfinished work, branches, and what exists ONLY LOCALLY

### 5a. In flight (owner session · state · next step)

| Work | Owner (John's session) | State at snapshot | Next |
|---|---|---|---|
| **Request !530** category switch carries words + photos | Website Code/Logic | pushed `5e9abcb5b`, 0 behind `2ab0b8953`; Android 1012 issued → A50; walk pending | device capture → walk → "merging !530 now" → merge → report |
| **PL-314** Request !517 (`39caf9a69`) + Go !454 (`d597f9865`) | Website Code/Logic | open, **stale base** (10/16) | rebase onto current heads → one walk (two phones) → merge |
| **G40-624 / 626 / 614** Request !522 / !523 / !524 | Website Code/Logic (ownership **open with John**) | open, stale base | wait for John's ownership call |
| **G40-604 phase 3 casing** (all 4 stages ruled) | G40-604 | file list approved; **LOCAL commits in progress, unpushed** (at 11:42: Request `G40-604-casing` @ `65b75d4e6` = 3 commits on `2ab0b8953`; Go `G40-604-casing` @ `dd99499e6` = 2 commits on `a7228d6f9`; web + backend branches empty) | finish commits → modal gate → numbers → walks → push/MR → merge; web half on `669bb6ba`+ |
| **G40-635** PL-329 real app fix (chat "connect" listener leak) | none running | Jira sprint 908, High; orphan fix branches exist (below) | needs a session on John's word; adopt the orphan branches |
| **G40-641** keyboard intrusion (chat + Intercom) | none | Jira **To Do, sprint 908, unassigned**, created 10/17 9:05 AM | needs a session on John's word |
| **Backend !775** email receipts (no purged sub-category) | Email/SMS/Push Alerts (not running) | open, mergeable, `22a7404eb` | owner session reports + merges |
| **Store cut** | Appflow / Store Builds | none cut | after all sprint sessions are done: Request ≥ `2ab0b8953`, Go ≥ `a7228d6f9e`; bump Appflow PROD to Request ≥ 49 / Go ≥ 51 |

### 5b. ⚠ Exists ONLY LOCALLY (not pushed anywhere)

**Real unmerged work (would be lost if the folder were lost):**
- `Dev/gopher-mobile-request` branch **`sentry-api-19-chat-ids` @ `e299d3ae2`** and `Dev/gopher-mobile-gopher` branch **`sentry-api-19-chat-ids` @ `bc3d92db3`**: the PL-329 app fix written 10/15 by an archived side-task (cleanup `off("connect")`, id guards, "This chat isn't available" screen, inbox guard, tests; unit tests only, never built). **1 commit each, not in production, no remote.** Earmarked for G40-635. The `Dev/gopher-mobile-*-wt-sentry-api-19` worktrees must stay.
- `Dev/gopher-mobile-request` branch `wip/531-exact-time-inline` @ `fa7a956cc` (2 commits): an early !531 draft, **superseded** by the merged !531. Keep until its owner says delete.
- Code repo branch **`code-logic/request-tier-badges` @ `61746c48`**: one docs commit, Website Code/Logic's 10/17 AM seat handoff (`docs/handoff/website-code-logic-handoff-2026-10-17-am.md`). origin is `5d3606bc`.
- **G40-604 casing, LOCAL commits (moving fast):** `Dev/gopher-mobile-request` `G40-604-casing` @ `65b75d4e6` (3 commits) and `Dev/gopher-mobile-gopher` `G40-604-casing` @ `dd99499e6` (2 commits), worktrees `Dev/gopher-mobile-*-wt-G40-604`; Code `G40-604-web-casing` and backend `G40-604-banner-casing` have no commits yet. Owned by John's G40-604 session; don't touch.
- **G40-635 worktrees** `Dev/gopher-mobile-request-wt-G40-635` / `Dev/gopher-mobile-gopher-wt-G40-635` (branch `G40-635-undefined-ids`, at the 10/16 production, no commits): set up by the G40-635 session before it stopped. A new G40-635 owner may reuse them after rebasing onto current production.
- **Files outside git:**
  - `Dev/G40-604-evidence/` (G40-604 resume files, casing inventories, screenshots)
  - `Documentation/Brand/Gopher Brand Standards/` (the Style Guide master copy; its git copy is on dev-handoff main via !110)
  - `Code/output/*` (session evidence and screenshots)
  - `~/Desktop/Screenshots/Jira/G40-keyboard-intrusion-*.webp` (G40-641 screenshots, on John's Mac only)
- **Uncommitted edits in the main Code clone** (branch `feature/deals-google-maps-audience`): `_prototypes/Go/gopher-go-prototype.html`, five `_prototypes/Request/*.html`, two `docs/handoff/*.md`, `.gitignore`, `.claude/launch.json`. **Owner unknown. Do not commit, discard or deploy from this checkout.**
- **This handoff (`docs/HANDOFF.md`) and the 10/17 `CLAUDE.md`** are in the main Code clone's working tree **and** committed + pushed on the docs branch named in `SPRINT-DESK` (10/17 ~11:5x entry), so a new worktree cut from the shared web source carries them. `docs/handoff/customer-service-reference.md` is an **untracked file that lives only in the main Code clone** (101 Tutorials and Customer Support edit it); read it there, never from a worktree.

**Local-only but already in production (safe; patch-equivalent; old copies):** Request `G40-604-sheet-heads`, `fix/description-300-cap`, `fix/dispute-reason-min-length`, `fix/review-id-line-flagged`, `G40-604-phase2-buttons`, `backup/G40-604-refer-links-8c4b2fe3c`; backend `fix/otp-empty-number-refused`; Code repo older web branches from retired seats (`code-logic/custom-task-port`, `code-logic/dashboard-app-logic`, `G40-216-web`, `G40-604-web-headlines`, `G40-623-web` (+3 docs commits), `code-logic/age-matcher-false-positives` (+5), `claude/*` worktree branches). **Never deploy from these.** The live site has moved on.

### 5c. Seat handoff documents (for picking up a lane)

- **Website Code/Logic:** `git show code-logic/request-tier-badges:docs/handoff/website-code-logic-handoff-2026-10-17-am.md` (Code repo, local branch).
- **G40-604:** `Dev/G40-604-evidence/RESUME-2026-10-17-0945.md`; file list `Dev/G40-604-evidence/phase3-casing/FILE-LIST-for-desk.md`.
- **Website UI/UX:** `git -C "All New Gopher/Documentation/Claude Code Review:Cleanup/Code" show origin/brand-audit-corrections-2026-10-02:docs/handoff/website-uiux-handoff-2026-10-16-pm.md`.
- **101 Tutorials:** `gopher-dev-handoff` `evidence/101-guides-refresh/HELD-guide-changes-until-store-build.md` (items held for the store build).

---

## 6. Important decisions and why (owner rulings, verbatim where it matters)

| When | Ruling | Why it matters |
|---|---|---|
| 10/17 ~10:10 AM + 11:03 AM | **"I want you pushing, creating MRs and merging. I am not the one who merges…"** + **"Merge and report"** (covers backend merges and website deploys too). Confirmed first-hand to Code/Logic (11:06) and 101 Tutorials (11:21). | Sessions merge or deploy their own work when they recommend it, then report to John what it solved, the risk and the undo. They ask first only for picks, opinions or clarifications. The desk's sequencing still applies. |
| 10/17 ~10:30 AM | **"Request and Go CANNOT ever be on the same device for testing…"** | A live walk puts the requester and the Gopher on different phones. The session drives its feature's side on a phone it can watch. |
| 10/17 ~7:38 AM | **"Session 'Website UI/UX' is a continual session for UI/UX and Branding. They own it."** | Only Website UI/UX edits the Style Guide. Ticket sessions send it changes. |
| 10/17 ~8:2x AM | **"The Style Guide is the truth for the apps and the site, with the one on-the-go 900 exception."** | Supersedes the 9/13 "logos only" ruling; **the Elite / Elite+ ladder is retired**; tiers stay Standard / Gopher Pro / Gopher Pro+. |
| 10/17 | **Casing:** C1 = B ("Title Case for names, sentence case for sentences"), C2 = A (small labels UPPERCASE via style), C3 = A (button labels sentence case), C4 = A (heroes sentence case), banners IN (sentence case). | G40-604 phase 3. Banner copy lives in the backend (`controllers/order/notification.js`), so it ships to every installed app on deploy. |
| 10/17 | PL-309 **"Ask, skippable"** + **"Until opened"**; PL-347 **"Different words"** for TrustShield holders; !531 **"The live website"** layout + **"What it was before"** for ✕. | See canon RQ-56/57. |
| 10/17 4:27 AM | On-the-go headline = **900** (W1 = B) | The one named exception to G40-604's web headline rule. |
| 10/16–10/17 | Website buttons = Stage 5 A (+ B5.1–B5.3). Named navy-fill exceptions: "Request Again" and the web "Submit identification" (owner 8/25). | PL-343 fixed on Request / home / Go pages; Deals / Connect stay navy (parked). |
| 10/16 | "Matt does not need to doc today, relax the urgency there until next week TBD" | The Code/Logic shared-logic doc for Matt has no date; G40-628's close-out waits on it. |
| 10/15 | **"Leave them"** (Deals + Connect parked) | No work on Deals or Connect. |
| 10/14 | **One approved baseline**: ≤ 3 building sessions; every build = current production + one ticket. | The desk refuses a number for a build not on the current heads. |
| 10/13 | **Every ticket is Web AND App, with the same logic.** | UI may differ; logic may not. Every AC includes a web↔app hand-off check. |
| 10/16 | **101 guides move with every ticket** through the 101 Tutorials seat. | A ticket isn't retired until its 101 UPDATE is in. |

---

## 7. Tests run and results (recent, all first-hand unless noted)

**Backend:**
- !770 / !769 / !767 / !768 / !772: full suite 443–446 of 448 each (2 known environment failures, pass in CI); CI green; EB Ready/Green with 0 5xx after each (desk AWS checks).
- !773: its test fails 19 checks on the old code and passes 25/25 on the fix; nginx after deploy shows `faq/v2/undefined` → 200/304 and 0 faq 400s.
- !774: combined-tree checks (64), g40-553 22/22; the routes answer 440 when unsigned; live Z8 email change passed.

**Request (jest gates + CI on each merged tip):**

| MR | Suites | Tests / notes |
|---|---|---|
| !527 | 210/210 | — |
| !528 | 212/212 | 3499 |
| !525 (round 2) | 214/214 | — |
| !533 | 214/214 | — |
| !532 | 218 | 3576 on the combined tree |
| !531 | 219/219 | 3607 |
| !529 | 219/219 | 3611 |
| !530 | 220/220 | 3629 (walk pending) |

Every merged tip also passed eslint, prettier and 28/28 guards.

**Go:** !457 101 suites / 1287 tests.

**Device walks (John's run sheets, Claude artifacts on John's account):**
- **G40-604:** Round 7 Z1–Z8 PASS (iPhone 15 Go 5735); Round 8 Android AR1/3/4/6/7 + AG2–AG9 PASS, AR2 FAIL (pre-existing, PL-344), AG1 John's; Round 9 I1–I3 PASS (iPhone 12 Request 5737).
- **!525:** round 2 Q1–Q6 PASS (5736).
- **!533:** T1–T3 PASS (5738).
- **!531:** round 1 W1 FAIL (the date-picker pop-up) → rebuilt; 5740 R1, R3–R9 PASS and R2 FAIL (✕) → fixed; 5741 S1–S4 PASS.
- **!529:** LIVE walk on order #66582 (A50 Request 1011 + iPhone 15 Go 5735), A1–A4 PASS; cancelled free from Request.

**Website:**
- `scripts/web-checks/run-all.sh` = 28/30. Steps **14** (Go parity) and **18** (Deals) fail, both known and pre-existing. Step 29 was fixed 10/17.
- Every deploy passed a 3-host content check (Pages, TigerTech, twin) and the desk's ls-remote + diff verification.

---

## 8. Known issues (open)

- **Owner actions:**
  - PL-319: the Yardstik key is visible in the gophergo.io Gopher Pro page source; rotate it.
  - PL-342: count the businesses whose "Licensed" was flipped to No, and decide whether to tell them.
  - PL-341: the "John T." job disappeared server-side.
  - PL-332: HQ shows TrustShield orders 8¢ low (via the HQ seat).
  - PL-338 / PL-340: READ_CONTACTS before SDK 37 needs its own ticket.
  - Who owns the As-Built doc (no named writer since 10/2).
  - The force-update floor raise.
  - Ownership of G40-614 / 624 / 626.
- **App defects:**
  - G40-641: chat + Intercom keyboard intrusion.
  - PL-329 root cause (G40-635): the store app still has the chat listener leak; the server stopgap hides the pop-up.
  - PL-344: Android Back on a step "?" tip leaves the whole flow.
  - PL-345: card page shows the wrong "Set as default".
  - PL-348: the store app's date-picker pop-up; fixed in !531, ships with the store build.
  - PL-349: Home card first name vs band business name.
- **Web:**
  - PL-346: the Review iQ card is cramped at 375px.
  - PL-343 remains on Deals / Connect (parked).
  - run-all steps 14 and 18.
- **Process / infra:**
  - Jira shows sprint 908 as **"future"** (never started on board 2).
  - iCloud's file-provider is heavily loaded (the Mac is sluggish at times; PL-331: evicted git packs in `Dev/gopher-admin-frontend`, `Dev/gopher-db`, `Documentation/Dashboard`).
  - The A50 is at 93% storage.
  - 14 `Dev` worktrees hold local-only commits (iCloud audit report).
  - The spec's git twin is stale.
  - The desk branch → dev-handoff main merge is pending at sprint end.
- **Customer-service answers** must come only from `docs/handoff/customer-service-reference.md`. Payouts are **debit card only**.

---

## 9. Next three priorities

1. **Finish Website Code/Logic's phase 3** in the agreed order:
   - !530: A50 walk → merge.
   - PL-314: Request !517 + Go !454; rebase, one live walk on two phones, merge.
   - !522 / !523 / !524 after John rules who owns G40-624 / 626 / 614.
   - The matching web helper syncs through the desk's slot.
2. **G40-604 phase 3 casing**, from the approved file list:
   - Request + Go local commits, then builds (numbers from the desk) and walks on two phones.
   - Merge and report; the website casing on `669bb6ba` or later; the backend banners (notification.js).
   - Style Guide changes to Website UI/UX; 101 + DOC UPDATEs to the desk.
   - Then the G40-604 close-out (Jira sign-off).
3. **The chat fixes: G40-635 (PL-329 root cause) + G40-641 (keyboard intrusion).** Both need a session started on John's word. Both touch `InAppMessage.js` / `inbox.js` / `IntercomChatButton.js`, which casing also touches; the desk orders them. G40-635 should adopt the orphan `sentry-api-19-chat-ids` branches (§5b).

**After those: the store cut**, by Appflow once every sprint session is done. Then 101 Tutorials deploys its held guide changes.
