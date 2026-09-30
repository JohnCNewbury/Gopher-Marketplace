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

**State at 2026-09-30 18:55 ET: Jira Ready for Release. Everything is merged; it ships with the 10/2 Request store build.**

| Piece | Where | State |
|---|---|---|
| Backend `previous_jobs` on the 3 endpoints | gopher-backend-api **!657** | merged 09:21:19, LIVE (23cbc801; production pipeline 2897422031 6/6; CodePipeline b8d8668c) |
| Ratings on each row | gopher-backend-api **!662** | merged 12:56:05, LIVE (daf6a95e; pipeline 2898223817 6/6; CodePipeline c2fb24eb) |
| App screen + the owner's design (all 3 entry points) | Request **!405** | merged 17:40:35 (ab468edaf, pinned to 7e76cf624; pipeline 2898969201 31/31). Owner passed it on the A50 (881) and iPhone 12 (870) |
| Business OR personal header, keyed on `add_business` | Request **!419** | merged 18:49:29 (28f51c802; pipeline 2899115413 31/31). Owner said "merge it", with no hand test |
| Front ends (Request web, Connect, Request prototype) | Code `G40-68-frontends` | LIVE on both sites via Website Updates: live 77bf910, twin 20f0676, site merge f1db11d |
| As-Built rows | gopher-dev-handoff !84, !92, !94, !96 | all merged; `main` matches the Documentation copy on the G40-68 row and box |
| 101 guides | Website Updates' list | app wording waits for the 10/2 build |

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

## What is left

Nothing on this ticket except the 10/2 store release. After it ships:

1. Fold the As-Built "LIVE TODAY" and "backend LIVE; app NOT live" paragraphs into one, and delete the deployment box.
2. Walk Jira from Ready for Release to Done (10: "Work is complete and validated").

## Open for the owner, deliberately not assumed

- **PL-130:** chat → Review Profile shows other requesters' job details. It is filed with the
  desk, which verified the query and the render sites. Whether today's rulings extend there is the
  owner's call. Its Ride Sharing Info is already ride-only (this ticket).
- **Business Gophers:** the Business Name / Employee Name / Title lines are kept under the header
  card, as in the live app. Whether they stay is the owner's call.
