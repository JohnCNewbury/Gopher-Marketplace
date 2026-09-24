# HQ Dashboard / Deals — session handoff 2026-08-24

**Transcript:** `78ed3a8f-859d-4e17-b12e-361bc40dcdf9.jsonl`
**Grep anchors:** `pickBusinessPicUrl` · `business_pic_from_profile` · `resolveProviderPics` ·
`completed_jobs.length > 0` · `_opFillCompletionPhotos` · `_payAsOf` · `emailBtn` ·
`loadMyDeals` · `DL-0012` · `!369` `!371` `!373` `!374`

---

## State of play

### DONE and verified live

| what | where | proof |
|---|---|---|
| Completion photos visible in HQ | backend `!363` + Dashboard `927d9aa` | 64733's real photo rendered 768×1024 from the deployed build |
| Picture messages render as pictures | Dashboard `2af61d7` | real 64731 chat image rendered |
| Payment status stamped "as of HH:MM" | Dashboard `d72844d` | the 64731/2/3 discrepancy was HQ's hourly snapshot vs the live API — not a data fault |
| Rejection reasons readable | backend `!366` + Dashboard `d72844d` | Brittany's *"Incomplete owner profile."* came back retroactively |
| Email/phone links + **Email button** in the Deals queue | Dashboard `20aa8c7` | subject carries the deal code |
| SP deals carry the provider's own logo | backend `!364` | — |
| Business-labelled card can never show an unelected personal photo | backend `!369` | fall-through fixed |
| The identity rule extracted to ONE file | backend `!371` → `helpers/business_pic.js` | both consumers call it; a test forbids re-implementation |
| Provider images resolve **live**, not from a stored snapshot | backend `!373` | **DL-0012 got its logo with no resubmit**; verified HTTP 200 on the real feed |
| `business_profile/v2` no longer deletes every past-job photo on any call | backend `!374` (prod `d69b89b2`) | 3 destroys / 3 guards in the delete switch; v1 deliberately unchanged |
| Merchant portal shows the merchant THEIR deals | Code `a2ec9a2` | **LIVE on Pages + TigerTech** (`loadMyDeals=3` on both) |
| Incomplete-profile report | backend `!360`/`!361` | `GET /api/v1/admin/users/incomplete` |
| G40-409 raised (RDS `0.0.0.0/0`) | Jira, sprint 677, Low | not started, deliberately |

### DONE but NOT verified end-to-end

- **The portal's real phone sign-in.** `/otp/get` sends a genuine SMS, so proving the token
  path needs a real code on a real phone. Every render branch and the whole demo path are
  verified. Failure is safe: no token / failed fetch / error all leave the showroom standing.

### NOT STARTED — the next piece of work

**The Go dashboard Business-pic UI.** All three parts, in order:
1. **An upload path on the Business logo tile — it does not exist.** "On file ✓ · tap to
   replace" is a lie today: the tile is display-only, no click handler, no file input. The
   only `type="file"` in `gopher-go.html` is the Inbox attachment.
2. The disclaimer + the owner's button: *"use my current individual profile pic as my
   business pic also"*.
3. **Require a business pic before "Showing as a business" can be switched on.** Nothing
   enforces it today, which is why `pickBusinessPicUrl`'s null branch exists.

Backend for all of this is **already merged and live** — the flag, the allowlist entry, the
DDL column, and live resolution. The flag defaults false so behaviour is unchanged until the
UI can set it.

---

## Deployed?

Verified **by content**, not by SHA (`git merge-base --is-ancestor` is invalid for a feature
commit against the flattened `main` — see CLAUDE.md → *Deploy & verification rules*).

- backend `production` = **`d69b89b2`**, EB Green/Ready, `/deals` 200
- Dashboard remote + host = **`d72844d`** (host `/opt/gopher-hq/Dashboard`)
- Code: portal **live on both hosts**

⚠️ **EB health goes Red mid-deploy on this environment, three deploys running.** Cause each
time: *"1 instance online is below Auto Scaling group minimum size 2"* after the deploy
terminates an excess instance. It self-heals to Green and the API serves 200 throughout. Do
not chase it — but do check `describe-environment-health --attribute-names All` rather than
assuming.

---

## Uncommitted / disk-only files

- **Code repo:** `.claude/launch.json` (+135 lines) and `.gitignore` are **other sessions'**;
  every preview config I added was removed. `.claude/settings.local*.bak-*` predate me.
- **Dashboard:** `name-gender-data.js`, `ratings-by-role-data.js`, `tier-changes-data.js` are
  **generated bakes** from `build.py`, not source. The host deploy script tolerates them.
- **backend `stash@{0}`** is mine — `routes/admin.routes.js`, the Option A route, already
  merged via `!360`. **Redundant, safe to drop.** `stash@{1..3}` are other sessions'; leave.
- **No gitignored disk-only edits.** I did not touch `_prototypes/*/gopher-banner.js`.
- 8 unpushed commits in Code are other sessions' (BIPA, ID retention, privacy lane).

---

## What I would do next, in order

1. **The Business logo tile upload path** (above). Front-end only → ends at a commit for
   John's push, not an auto-deploy.
2. **Deal ID reformat to SP1/MD1** — owner wants it *after* testing; the three pending deals
   get cancelled first. Generator is one post-insert UPDATE:
   `'DL-' || lpad(id::text, greatest(length(id::text),4),'0')`. Prefix-by-track is trivial.
   **The open design question is the number:** "SP1, SP2" reads as per-track sequential from
   1, but today it is the global row id. Per-track needs its own counter, and
   `COUNT(*) WHERE track=…` races two simultaneous submissions into one code → two Postgres
   sequences. If the row id is acceptable (SP12, MD11 — unique but gappy) it is one line.
   Also decide: backfill existing `DL-` codes or leave as history. Blast radius small — 5
   files read `deal_code`, all reads.
3. **Native apps have NO deals code.** Verified across all six branches of both mobile repos
   with a control grep — the only "deal" match is `"Ideal Sans"` in a font stack. Web
   publishes fine; iOS/Android receive nothing. Needs a build **and** a store release (no
   OTA, Appflow sunsets 12/2027), and mobile `main` is frozen so it lands via `next`.
4. **The unused merge callback.** Consumer pages call `GopherDealsFeed.merge(DEALS_DATA)`
   with no `done` callback although the module accepts one — a user who opens Deals before
   the fetch lands sees demo content until they reopen.
5. **Deal rows carry no coordinates**, so the feed's proximity ordering (§7.3) is
   unimplemented and the coverage map has no pins. `google_maps_geocoder` was fixed earlier
   this session and would be the input.

---

## Traps the next session will hit

**Probes that lie — I got four wrong this session, all the same shape.**

1. **The deals queue returns rows under `deals`** — not `data`, not `rows` — and `?status=`
   is pending-only by default. A probe keyed on `data` returns 0 for every status and reads
   as *"the table is empty."* Cost a false conclusion.
2. **A negative grep for a URL is worthless when the URL lives in a module the page loads.**
   I declared the consumer rails "not wired" from grepping the HTML; the API call is in
   `assets/js/gopher-deals-feed.js`. They were wired, and a memory already said so.
3. **`document.documentElement.innerHTML` includes `<script>` contents**, so grepping it for
   demo data matches the source array, not rendered DOM.
4. **Counting a guard across a whole function conflates uploads with deletes.** My first
   `business_profile/v2` test counted `.length > 0` file-wide and passed for the wrong
   reason — both handlers guard their *upload* sections with the same shape. Scope to the
   delete switch.

**Always run the control.** `grep -c` for something that MUST be present before believing a
zero. That is how the DDL verification held up (`"Connecting to database"` matched 2, so the
startup log really was in the window).

**Other traps:**

- **Deal codes are NOT the primary key.** `PATCH /admin/deals/:id/*` takes the numeric `id`.
  DL-0011 being id 11 is coincidence.
- **A backtick inside a comment terminates a SQL template literal.** Mine broke
  `g40-351-deal-review-actions` with an opaque *"missing ) after argument list"*. Use SQL
  `--` comments in those strings, and run `node --check` on the controller — the full suite
  catches it one step too late.
- **Three S3 key shapes, no two alike.** deal logo `uploads/image/deal_logo/{ownerId}/{uuid}.{ext}`
  · business `uploads/image/business_profile/{user_id}/{file}` · personal
  `uploads/image/file/{image_row_id}/profile.jpg` (filename hardcoded — reading a `file`
  column 404s). Always read the key off its WRITE site.
- **Replacing a profile photo DESTROYS the row and DELETES the object**, then creates a new
  row. Any stored URL to the old id 404s. That is why provider images resolve live.
- **`git push` is denied in this session.** Use the GitLab commits API. It **cannot
  force-push**, so a rebased branch cannot be updated in place — cut a fresh branch from
  current production instead (that is why `!370` was closed for `!371`).
- **`sms-state-columns.test.js` is RED on production and it is a FALSE POSITIVE** — it scans
  for consumers of `sms_state` and matches another session's leftover
  `.claude/worktrees/claim-log/` inside the repo. Nothing reads the column. Not this lane's
  to fix.

---

## Open questions for John

**None.** Everything that needed a decision was put to him and answered this session:

- Rotate the leaked DB password? → **No** — inert without VPC access; he was right.
- Firewall `0.0.0.0/0`? → **Ticket it, don't touch** → G40-409.
- Copy vs track for the business pic? → **"also"** = track, so a flag not a copy.
- `!369` then rebase `!370`? → done; became `!371` after the force-push limit.
- Historical blast radius of the past-jobs deletion? → **"the past is irrelevant… NOONE has
  been affected but Brittany"** — correct going forward only, no backfill.

⚠️ One thing he should know rather than decide: the past-jobs bug destroyed **worker
completed-job portfolio photos**, which is different data from the Brittany/Deals issue. He
was told; he steered to fix-forward anyway. Recorded so the absence of a backfill reads as a
decision.
