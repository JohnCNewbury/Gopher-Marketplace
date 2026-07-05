# G40-170 — New User Incomplete Experience (potential-user capture)

**Status:** Built (HQ Dashboard Users tab) + verified · backend capture seam documented
**Jira:** G40-170 · Story · Medium · label `spine`
**Pairs with:** G40-157 (signup flow) · scaffold `Documentation/Jira Tickets/potentialUser.js` (tested)

## Goal
Capture attempted users who tap "continue" during signup but never finish, as **potential
users** with an **Incomplete** status and a **unique chronological ID** — surfaced in the
**Admin Panel Users tab** so the team can follow up and inspire them to complete signup.

## Acceptance criteria → where satisfied
1. ✅ Entries a potential user makes (name, DOB, email, phone…) saved as a potential user — represented in the HQ Dashboard Users tab (seed feed stands in for the backend capture).
2. ✅ Admin Panel has an **Incomplete** status — added to the Users tab (badge + filter + KPI).
3. ✅ Unique ID in chronological order, mirroring the live-user integer id scheme — potential users get the next sequential IDs and sort newest-first.

## What was built — Gopher HQ Dashboard (the Admin Panel replacement)
Source: `Documentation/Dashboard/` (compiled to `output/Gopher_HQ_Dashboard.html` via `python3 build.py`).

- **Seed potential users** — `app_part2.js`, right after the `USR` build (~line 366).
  A self-contained IIFE appends Incomplete potential-user records to `USR`, each with:
  - the next sequential **integer id** (`maxId+1…`), so IDs are unique & chronological (AC #3);
  - the most-recent `signupDay`, so they sort to the **top** (newest-first) of the list;
  - `status:'Incomplete'`, `source:'Signup (incomplete)'`, `role:'Other'` (won't inflate requester/gopher KPIs);
  - a realistic **partial-capture ladder** (name-only → +phone → +email → +DOB) mirroring where users bail.
  This seed stands in for the backend capture feed (see seam below).
- **Incomplete status surfaced in the Users tab** — `app_part3.js`:
  - new **Status** column in the user records table, with an amber **Incomplete** badge
    (`.t-incomplete`, added in `dashboard.html`); live users show Active / their own status;
  - **Activity filter** gains an "Incomplete signups" option to isolate potential users;
  - a top-level **"Incomplete signups" KPI** (count of Incomplete records).
- **User detail page** already renders `status` generically, so an Incomplete potential user
  opens cleanly (name / partial fields / member-since / ID) with no extra work.
- **CSV Export** already includes `status`, so exports carry the Incomplete flag out of the box.

### Rebuild
`cd Documentation/Dashboard && python3 build.py` → writes `output/Gopher_HQ_Dashboard.html`.

### Verification
No JS engine in-session (no node), and the 72 MB compiled file is too heavy to load in the
preview reliably, so the exact added logic was exercised in an isolated browser harness
(seed IIFE + status cell + filter + sort, verbatim). **12/12 assertions pass:** 5 records
appended, KPI=5, unique chronological IDs 1004–1008 (all > max live id), an Incomplete user
sorts to the top, the partial-capture ladder is preserved, the Incomplete filter returns
exactly the 5, the amber badge renders, and live Active/deleted users are unaffected.

## Backend seam — client capture on "continue" (NOT built here)
Reserved per `Final/CLAUDE.md` (no auth/accounts, no persistence) — and inherently backend,
since the capture must reach the admin Users tab across apps. Wire the tested scaffold:

- `Documentation/Jira Tickets/potentialUser.js` — `buildPotentialUser`, `upsertOnContinue`,
  `potentialUserId` (chronological, enrich-without-clobber, status Incomplete). Tested.
- On each signup "continue" (pairs with G40-157's flow, Request `#rqSuPhoneOtpBtn` /
  `#rqSuEmailOtpInline` commitment points and Connect's stepped continues), call
  `upsertOnContinue(store, sessionKey, fieldsSoFar, nextSeq)` → **POST** the partial record
  to the backend with status `Incomplete`.
- On successful account creation, promote/clear the Incomplete record to a real user.
- Assign the potential user a **unique chronological ID** consistent with the live user id
  scheme (the dashboard mirrors this).
- Privacy: capturing PII before signup completion needs a consent/notice + retention policy —
  flag for product/legal before shipping the capture.

## Files touched
- `Documentation/Dashboard/dashboard.html` — `.t-incomplete` badge style.
- `Documentation/Dashboard/app_part2.js` — seed Incomplete potential users into `USR`.
- `Documentation/Dashboard/app_part3.js` — Status column, Incomplete filter, KPI.
- `Documentation/Dashboard/output/Gopher_HQ_Dashboard.html` — rebuilt.
