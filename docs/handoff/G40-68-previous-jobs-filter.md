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
   no order id, price, stars, comment, photos, description or title.
2. **Old builds: unchanged, plus a silent trim.** `get_latest_reviews` stops selecting
   `o.description`, which the response carried and no build rendered. Everything old builds
   display is untouched.
3. **Date: month + year, never the day.** This is the Deals provider card's 2026-08-26 rule
   (an exact date plus a job type is a key to the customer), adopted here.
4. **Release: the 10/2 Request store build.**
5. Confirmed as intended: unrated jobs now appear, and the dates become real.

## What was built

| Piece | Where | State (2026-09-30) |
|---|---|---|
| Backend `previous_jobs` on the 3 endpoints | gopher-backend-api **!657** | **MERGED 09:21:19 ET and LIVE** (owner's instruction). Merge 23cbc801; MR pipeline 2897387430 6/6 on e28aa643; production pipeline 2897422031 6/6; CodePipeline b8d8668c Succeeded 09:24:45; EB serving 23cbc801, Ready/Green |
| Live Request app screen (all 3 entry points) | gopher-mobile-requester-capacitorjs **!405** | open · green (7e354e649: 2897356478 31/31; 1b77cc627 pipeline 2897665160 started) · waits on the owner's hardware test |
| Front ends (Request web, Connect, Request prototype) | Code repo `G40-68-frontends`, off `feature/deals-google-maps-audience` 10798d3, pushed to GitHub | **not merged into the site branch, not deployed**; `git merge --ff-only G40-68-frontends` in the main checkout, then deploy on the owner's go |
| As-Built row | `Documentation/…/production-request-flow-granular.html` | written, updated for the 09:24 deploy · twin in gopher-dev-handoff **!84** (d8dd338), `cmp` identical, owner merges |
| Test builds | A50: Request 880 / 3.10.0 (878 was installed 09:48, then replaced by G40-547's 879 on the owner's order) · iPhone: 13.10.0 (5475) | both built and verified from the artefact; A50 re-queued behind G40-547, iPhone behind G40-553 |

### Backend (`helpers/previous_jobs.js`, `helpers/previous_jobs_rules.js`)
- `gopher.previous_jobs = { category, all, in_category }`. Rows are `{ month, year, category, type }`.
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
- Tests: `g40-68-previous-jobs-rules` (14), `…wiring` (12, all 3 handlers against a real 200),
  `…db` (15, real Postgres). All are mutation-checked.

### App (`src/component/PreviousJobs.js`)
- Replaces the three `top_reviews` blocks. Each row reads "Date: Mar 2026 · Request Type: …".
- Default is View All on every open. With `null` or no payload, nothing renders.
- Tests: `PreviousJobs.g4068` (10: Scenarios 1–5, privacy, nulls) and
  `CustomPullOver.previousJobs.g4068` (9: the real pull-over, and the real Review Profile tap in each list).

### Front ends
- **Request web:** rows are month + year and type, with no stars.
  `renderWorkerProfile(…, opts.showJobRatings)` shows stars only for the profile **modal**
  (Deals card, MY Gophers, inbox recommendations). Those keep the stars they always had.
- **Connect:** the dashboard Request Details profile still had the July stub (dead spans reading
  "View all previous <first word> jobs only"). It now has the real toggle, category rows and the
  empty state. The Deals card is unchanged.
- **Prototype:** rows are Date and Request Type only.
- All 18 of `scripts/web-checks/run-all.sh` pass, and the parity harness is OK.

## What is left, in order

1. ~~GitLab unblock~~ — done (08:56). ~~Merge of !657~~ — done and live (09:24).
2. **Hardware test by the owner:** A50 (install 880 when the desk releases it) and iPhone 15 Pro
   Max (install 5475, or higher than whatever is then installed). ⛔ Stamp **3.10.0 / 13.10.0**, not
   3.11.0 — a test phone reporting 3.11.0 before the release exists inflates G40-554's adoption gate.
3. **Merge of !405 before the 10/2 cut.** Then read the `production` pipeline by id.
4. **Front ends:** fast-forward the site branch to `G40-68-frontends`, then deploy on the owner's go.
5. **As-Built twin:** owner merges gopher-dev-handoff !84, then `cmp` the two copies on `main`.
6. After the app ships, fold the As-Built "LIVE TODAY" and "backend LIVE; app NOT live" paragraphs
   into one and delete the deployment-reality box.

## Open for the owner, deliberately not assumed

- Profiles opened from **MY Gophers** and **inbox recommendations** (website modal) still show
  per-job stars. Whether today's ruling reaches them is the owner's call.
- The Deals provider card shows per-job stars under the 2026-08-26 ruling. This profile does not.
  That is two rulings for two surfaces, recorded rather than reconciled.
