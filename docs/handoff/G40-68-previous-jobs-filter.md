# G40-68 — Gopher profile: All vs [Category] previous jobs

**Jira:** G40-68 (High) · Label `worker` · Sprint 875 "Flow Modification" · Owner: John Newbury
**Rewritten 2026-09-30** by the G40-68 seat. The July 2026 version of this note described a
front-end-only, demo-grade build with the backend "reserved for a developer". That rule was
retired on 2026-08-09, and this rewrite supersedes that version.

**The doc of record is the As-Built:** `Documentation/Canonical Request Flow - Master /production-request-flow-granular.html`,
§ *Counter offers, bids & Select-My-Gopher*. This note is the work log. If the two
disagree, the As-Built is right.

---

## What it solves, in user terms

A requester deciding whom to hire taps **Review Profile** on a Gopher from Gophers Interested,
Bids or Counter Offers. The profile offers **View All Previous Jobs** (the default) and **View
Previous [Category] Jobs Only**, where the category is the request's top-level bucket:
Delivery, Need A Ride, Service or Other. When the Gopher has none, it shows **No Previous
[Category] Jobs**.

## ⛔ The July premise was wrong — the live app already had a list

VERIFIED on `production` 2026-09-30: all three live profile screens (`CustomPullOver.js`
3366 / 4157 / 4949) have rendered `gopher.top_reviews` since April 2024. That list is the
latest 20 **rated** delivered+paid jobs. For each job it shows **another requester's** order #,
title, earnings, stars, comment and completed-job photos, and a date that reads *today*
(`created_at` is never selected). The July flow-scrub read only the list captions and called
the feature "net-new".

## Owner rulings, 2026-09-30

1. **Payload: job facts only.** Each row is month + year, top-level category and type. There is
   no order id, price, comment, photos, description or title. *Stars were excluded in the
   morning; after using the screen on the A50 the owner added them (ruling 6).*
2. **Old builds: unchanged, plus a silent trim.** `get_latest_reviews` stops selecting
   `o.description`, which the response carried and no build rendered. Everything old builds
   display is untouched.
3. **Date: month + year, never the day.** This is the Deals provider card's 2026-08-26 rule
   (an exact date plus a job type is a key to the customer), adopted here.
4. **Release: the 10/2 Request store build.**
5. Confirmed as intended: unrated jobs now appear, and the dates become real.
6. **After the A50 test (14:00 ET):** "ONLY show ride sharing info for ride sharing requests
   (ever)"; the list was "very dull" and "need to include rating"; "We're excluding pics and
   comments". The design the owner picked from the mockups is:
   - a header card with **First name + last initial**;
   - a centred stat bar: Jobs · ★ Rating · shield + **"Background checked"** (Pro / Pro+) or
     **"Identity Verified"** (standard);
   - **View All** is the default and **green**; tapping the category button turns it green and
     All white;
   - job cards carry ★ ratings.
7. "Interested (Select-My-Gopher) and Counter Offers should be identical. Ride Sharing adds the
   ride info." Taken as acceptance of the A50 test.

## What was built

| Piece | Where | State (2026-09-30) |
|---|---|---|
| Backend `previous_jobs` on the 3 endpoints | gopher-backend-api **!657** | **MERGED 09:21:19 ET and LIVE** (owner's instruction). Merge 23cbc801; MR pipeline 2897387430 6/6 on e28aa643; production pipeline 2897422031 6/6; CodePipeline b8d8668c Succeeded 09:24:45; EB serving 23cbc801, Ready/Green |
| Ratings on each row | gopher-backend-api **!662** (bf35a8cc) | **MERGED 12:56:05 ET and LIVE** (owner: merge when green). Merge daf6a95e; production pipeline 2898223817 6/6; CodePipeline c2fb24eb Succeeded 12:59:07; EB Ready/Green 13:01:29 |
| Live Request app screen (all 3 entry points) + the owner's design | gopher-mobile-requester-capacitorjs **!405** | open · green at **7e76cf624** (MR pipeline 2898222136 31/31) · A50 test **passed**; iPhone test pending; the owner merges before the 10/2 cut |
| Front ends (Request web, Connect, Request prototype) | Code repo `G40-68-frontends` (a75639d), off `feature/deals-google-maps-audience` 10798d3, pushed to GitHub | **not merged into the site branch, not deployed**; `git merge --ff-only G40-68-frontends` in the main checkout, then deploy on the owner's go |
| As-Built rows | `Documentation/…/production-request-flow-granular.html` | updated for ratings + design · twin: gopher-dev-handoff **!84** merged 10:44:21 (8baca5a6); **!92** (b4fa8f54) carries today's update, `cmp` identical, owner merges |
| Test builds | A50: Request **881** / 3.10.0 — owner tested 14:47–14:58 ET · iPhone: 13.10.0, rebuilt at installed+1 when the desk releases it | 5475 was deleted (collided with G40-537's 5475) |

### Backend (`helpers/previous_jobs.js`, `helpers/previous_jobs_rules.js`)
- `gopher.previous_jobs = { category, all, in_category }`. Rows are `{ month, year, category, type, rating }`.
- `rating` is the newest positive `ratings.score` for that order and Gopher, read by subquery so a
  job rated twice is listed once; `null` means "Not rated".
- `category` is the **active** request's bucket, derived server-side from `orders.category_type`.
  Service is `sp_eligibility.SERVICE_CATEGORY_TYPES` (imported, the Deals card's list).
  Delivery is `Delivery`, `Errand`. Need A Ride is `Need a Ride`. Other is `Other`.
- Legacy values, from a read-only census on 2026-09-30: `NULL` (3,069 orders, 2018 to Mar 2022)
  appears under All only and is never guessed. `Moving / Junk Removal` and `'Moving '` count as
  Service. `Errand` counts as Delivery.
- `in_category` is its own query, so an empty state means none at all.
- `type` is the category plus a **whitelisted** sub-type. It never comes from the title, which is
  typed text for "Other" requests.
- A failed lookup returns `previous_jobs: null` and the app hides the section. The failure goes to
  Sentry and is registered as acknowledged-unalarmed in `docs/alert-markers.json`.
- Tests: `g40-68-previous-jobs-rules` (15), `…wiring` (12, all 3 handlers against a real 200),
  `…db` (17, real Postgres, including the twice-rated and 0-score cases). All are mutation-checked.

### App (`src/component/GopherProfileHeader.js`, `src/component/PreviousJobs.js`)
- `GopherProfileHeader` replaces the three copies of the old header (each about 335 lines) in
  `CustomPullOver.js`. It shows photo + tier badge, "First L.", the since-line, tagline and business
  lines, over the navy stat bar (Jobs · ★ Rating · Background checked / Identity Verified).
- `PreviousJobs` replaces the three `top_reviews` blocks. It has stacked green/white filter
  buttons. Each job card has the category icon, type, "Mar 2026" and "★ 5.0" or "Not rated".
- Default is View All on every open. With `null` or no payload, nothing renders.
- **Ride Sharing Info** shows only when the request's `category_type` is `Need a Ride`: on the
  three profiles and on chat → Review Profile (`InAppMessage.js`). It is **never** shown on
  MY Gophers (`fav_gropher_details.js`).
- Tests: 39 across `PreviousJobs.g4068`, `GopherProfileHeader.g4068` and
  `CustomPullOver.previousJobs.g4068`. They cover Scenarios 1–5, the green/white swap, ratings,
  privacy, nulls, the header, and ride info hidden on Home Services but shown on Need a Ride.

### Front ends
- **Request web:** rows are month + year, type and stars (ratings restored after ruling 6).
- **Connect:** the dashboard Request Details profile still had the July stub (dead spans reading
  "View all previous <first word> jobs only"). It now has the real toggle, category rows and the
  empty state. The Deals card is unchanged.
- **Connect:** the dashboard rows carry ratings again.
- **Prototype:** mirrors the app design (header card, stat bar, green buttons, rated cards).
- All 18 of `scripts/web-checks/run-all.sh` pass, and the parity harness is OK.

## What is left, in order

1. ~~GitLab unblock~~ (08:56). ~~!657~~ live (09:24). ~~!662 ratings~~ live (12:59). ~~A50 test~~
   passed (881, 14:47–14:58 ET).
2. **iPhone 15 Pro Max test** when the desk releases it (queue: G40-537 → G40-553 → G40-68).
   Rebuild from the latest branch at installed+1. ⛔ Stamp **3.10.0 / 13.10.0**, not 3.11.0. A test
   phone reporting 3.11.0 before the release exists inflates G40-554's adoption gate.
3. **Merge of !405 before the 10/2 cut.** Then read the `production` pipeline by id.
4. **Front ends:** fast-forward the site branch to `G40-68-frontends`, then deploy on the owner's go.
5. **As-Built twin:** owner merges gopher-dev-handoff !92, then `cmp` the two copies on `main`.
6. After the app ships, fold the As-Built "LIVE TODAY" and "backend LIVE; app NOT live" paragraphs
   into one and delete the deployment-reality box.

## Open for the owner, deliberately not assumed

- **PL-130:** chat → Review Profile shows other requesters' job details. It is filed with the
  desk, which verified the query and the render sites. Whether today's rulings extend there is the
  owner's call. Its Ride Sharing Info is already ride-only (this ticket).
- **Business Gophers:** the Business Name / Employee Name / Title lines are kept under the header
  card, as in the live app. Whether they stay is the owner's call.
