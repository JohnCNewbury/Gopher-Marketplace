# Website Code/Logic seat — handoff, 2026-10-16 ~7:10 AM ET

Written by the outgoing session for the session that replaces it. Read this top to bottom
before you touch anything. **Nothing listed here is merged or deployed unless it says so.**

---

## 0. Who you are, and the rules you work under

- **You are the Website Code/Logic seat.** It is a standing seat. You report to the sprint desk,
  the **908 "iQ | Brain Sprint"** session. Message it with `mcp__ccd_session_mgmt__send_message`,
  `session_id local_80fa74d0-6e10-497a-9b94-ed46e4b5ed29`.
- **Scope (John 10/14):** "exclusively code and logic synchronized with App/Web" (the Request
  app ↔ the Request website ↔ the server rules both use). Connect and Deals are parked. Go is
  in scope only where server logic is shared.
- **ONE ASKER:** you ask **John directly** for every push, merge, deploy and pick. The desk never
  asks for you. Report each merge, push and install to the desk. Tell the desk before a web
  deploy (it owns the deploy slot).
- **The server deploys on merge.** A merge to `gopher-backend-api` `production` auto-deploys to
  live. Before asking John: what it solves, the risk, the undo. After merging, verify live:
  - CodePipeline `gopher-prod-codepipeline` Succeeded for the SHA;
  - EB `Gopher-Production` Green/Ok (it goes Red mid-swap first);
  - CloudWatch `/aws/elasticbeanstalk/Gopher-Production/var/log/web.stdout.log` has
    "Database initialization complete!" and no new TypeError/ReferenceError or 5xx.
- **Merge hand-off:** always state target `production` · squash **No** · delete source **No**.
- **Mobile MRs target `production`** (the `next` rule was superseded on 9/4). `glab mr merge`
  needs the **full** SHA. Run `glab mr merge` as a plain command (no `cd x &&` prefix).
- **Never:** type passwords or OTPs; create a Jira ticket without asking; push or deploy without
  John's word; create live orders without John's word per tap; touch another session's work.
- **Standing rules** (authoritative): `Dev/gopher-dev-handoff/src/content/docs/start-here/standing-rules.md`.
  §13: claim files in the work registry before editing shared docs.

## 1. The objective (John 10/15)

> "Web and App logic in sync … it's not just documentation. It's synchronization. We're already
> very close, but need to get it perfect" — plus "the total shared logic documentation to Matt".

- **Deadline:** ~5 PM ET Sat 10/17 (48 h from 10/15 ~5 PM).
- **Matt O'Donnell** is the contractor developer. He sees ONLY `gopher-dev-handoff` on GitLab;
  anything he needs must be written there.
- **G40-628 close-out** (Jira hops to Ready for Release, PL items, DOC UPDATE, done report) is
  **parked until the doc ships** (John).

## 2. The fact that shapes everything

The live web Request page (`Final/gopher-request.html`) **does not create orders on the server.**
- Submit writes an in-browser dashboard record, lost on reload.
- Its only network calls are `GET api.gophergo.io/api/v1/public/worker_count` and a referral link.

So every rule is one of three kinds:
1. **Client rules** (what each screen allows, asks or blocks): must be identical code behaviour now.
2. **Server-owned rules** (fees, suggested offers, coupons, 15-mile conversion, distance, holds,
   cancel, dispute timing): the app asks the server; the web re-implements them. They must
   match, and the doc tells Matt to call the endpoint and delete the copy when he wires the web.
3. **Declared differences:** owner-ruled.

## 3. Owner rulings (dated, binding)

**10/13** — "The logic MUST be the same on Web and App."
- D1: age scan on every category.
- D2: TrustShield $1 = A/R + Ride. This is **G40-365, its own session**.
- D3: the 8% before the $1, nearest cent (done).
- D4: same place by map point (done, G40-274).
- D5: category nudge blocks Continue once (app **G40-624**).
- D10: MASK phone numbers as typed, with the web's wider pattern.
- D11/D12: server offer models (done).
- D13: Yard gets the app's 2 worker choices.
- D14: hourly = Labor only.
- The Custom Task port to the web; the CT A/R switch hidden from under-21 (app **G40-614**).

**10/14** — the app prototype is a "lame duck", redone after the web logic. Connect is parked.

**10/15** (the desk logged these as RQ-51…RQ-53):
- **RQ-51:** the crew offer on Yard/Moving/Junk is the **whole job**; Labor only is per worker × crew.
- **Default:** "App wins; bugs fixed on both" wherever there is no ruling.
- **Caps:** both sides use the web's: crew 2–20, hours 1–24, riders 1–6, stairs 0–10.
- **Dashboard:** port the app's helpers to the web and drop the live Demo/Simulate controls.
- **Offer line:** the app's words everywhere: "Exact amount your worker takes home: 100% of your
  offer. Request fees are shown at review."
- **Phone notice, both sides:** title "Phone number hidden"; body "For your privacy we don't
  broadcast phone numbers. Once your request is submitted you can text or call your Gopher
  in-app."; buttons OK + "Don't show again".
- **Description:** 300 characters on **every** category, both sides.
- **Request Again:** the web keeps landing on Review. **DECLARED** difference; both check every
  step before sending.
- **Category switch:** carries the words + photos, **not addresses**, on both, for every switch.
  This supersedes the web's 7/19 note.
- **Exact-time picker:** the web's 30-min 6 AM–9 PM grid with no silent default; **the app
  adopts it.**
- **PL-324:** an invalid coupon at bid accept means **the hire goes through without it.**
- **Go feed under-21 filter:** **fail closed** (7,797 Gophers have no date of birth; 185 active
  in the last 90 days).
- **RQ-47:** the web's all-in bid card is DECLARED (older).
- **PL-314** (MRs open): a review the Gopher raised is never shown as a dispute. Requester pill
  "ID NOT CONFIRMED"; Go "UNDER REVIEW".

## 4. Where everything is (branch · SHA · state)

**Repos**
- **Web:** Code repo `…/Claude Code Review:Cleanup/Code`; the deploy branch is `main` (flattened).
- **App:** `Dev/gopher-mobile-request`, remote `gophergo/gopher-mobile-requester-capacitorjs`.
- **Server:** `Dev/gopher-backend-api`, remote `gophergo/gopher-backend-api`.
- **Handoff:** `Dev/gopher-dev-handoff`, remote GitLab `gophergo/gopher-dev-handoff`.

All branch refs live in those repos. The outgoing session's worktrees were under its scratchpad
`/private/tmp/claude-501/.../8df699a9-…/scratchpad/sync/` and **may be gone**. If they are, make
fresh worktrees from the branch names.

### WEB — `code-logic/request-sync` @ **febd65ef** (local, not pushed, not deployed)
It is based on web source **3f1d015**, which is NOT the newest source. Commits since 3f1d015:
- **b521214** — parity harness repair. G40-611 broke check 1 and stopped the whole run. The
  classifier is now built from the live page, and the app/server probes came in.
- **eb71d40** — PL-321: Review/Submit re-check every earlier step (`walkEarlierStepsOk`,
  `onContinue`). Request Again carries addresses.
- **6160c03 / 3558be7** — RQ-51: `payCrew()` (Labor-only multiply); the stale comment fixed.
- **f0e6d5a** — D13 Yard choices, D14 hourly Labor-only (hourly turns bids off), B-17 seeding.
  The flow-rules module has a `prototype` override.
- **23ef876** — GO-To: A/R gated, under-21 dead stop, priced as itself, sends what it saved.
- **f76830d** — 300 cap (since widened to all categories) + AGE-8 (age answer kept per wording).
- **529561e** — John's picks: offer line; 300 on all categories; phone MASK + "Phone number
  hidden".
- **123ca42** — MONEY-2 (2 decimals), MONEY-17 (low-offer note, not a pop-up), MONEY-26 (hold =
  total + ceil 20%, so $31.10).
- **db037ba** — B-27 (exact time 1 h to 14 days), B-29 (an expired draft time becomes ASAP).
- **7d62fb0** — the category switch carries words + photos, not addresses.
- **d5610c64** — merge of `code-logic/dashboard-app-logic` (6 commits):
  - `scripts/sync-app-helpers.py` vendors 10 app helpers into `Final/assets/js/app-shared/` with
    a byte check;
  - `gopher-dash-order.js` mapping;
  - dashboard cards, cancel, confirm, dispute and rating follow the app;
  - the demo controls are removed.
- **01f29aef + febd65ef** — Custom Task port (`other` runs the app's Custom Task logic; $40 A/R +
  TS = $46.50) + web check 30.

**Checks:**
- `bash scripts/web-checks/run-all.sh`: **28/30**. 14 (Go parity, a disk-only prototype file)
  and 18 (Deals) **fail on the base too**.
- `python3 docs/handoff/request-app-parity/run_parity_harness.py`: **PARITY OK**, 0 failures,
  4 warnings. One of those (same-address) is stale.

Every web change was driven in a browser on a local copy (`.claude/launch.json` entry `reqsync`,
port 8731, serving `sync/websrc/Final`). Evidence is in each commit message.

### APP — local branches, all rebased onto app production **9ba8ef5e4** on 10/16 (not pushed)

| Branch | SHA | What | Gates |
|---|---|---|---|
| `G40-624-category-nudge` | 5fb669ee6 | D5 "This looks like a ___ job" sheet, Step 2, once per wording | ✅ 207/207 |
| `G40-626-phone-mask` | 99a260d2e | D10 mask with the web pattern + "Phone number hidden" | ❌ **5 suites FAIL after rebase, not yet investigated** |
| `G40-614-under-21-age-options` | d69952ef7 | CT A/R switch + A/R iQ ideas hidden from under-21 | ✅ |
| `fix/review-id-line-flagged` | 46d36eacd | PL-309: the web's ID line on Review "What to expect" | ✅ |
| `fix/request-input-caps` | 91ca0f88e | crew 2–20, hours 1–24, riders 1–6, stairs 0–10 | ✅ |
| `fix/description-300-cap` | d51c3ebb2 | 300 real on every flow; "Max characters reached" | ✅ |
| `fix/dispute-reason-min-length` | f432dcc2c | the server's ≥10-char reason enforced before sending | ✅ |
| `fix/scheduled-card-state` | cbc7920e1 | PL-327: booked scheduled card + step bar | ✅ |
| `fix/category-switch-carries-words-photos` | 0fb46c119 | one helper `stepFlow/categorySwitch.js` | ✅ |
| `fix/exact-time-slot-grid` | 6dc6cf553 | the 30-min 6 AM–9 PM grid, no default (review sheet only) | ✅ |
| `PL-314-worker-review` | 94ac94e2b | rebased; MR **!517** is open on the old head | ✅ |

**Gates** = `npm run test:services`, `npx eslint ./src/ --max-warnings=0`, `npx prettier . --check`,
and all `node scripts/*` guards from `.gitlab-ci.yml`. Full results:
`docs/handoff/request-app-parity/sync-2026-10-15/rebase-app.txt`.

**Ownership of G40-614/624/626 is John's call:** the desk asked him, and a chip exists for 614.
Hand the branches over if he assigns them to another session.

**Open app notes**, in `sync-2026-10-15/build-app-1.md` and `build-app-2.md`:
- the A1 sheet uses the app's category names;
- the A2 mask covers every text box of that kind app-wide;
- the A3 profile flag is fixed server-side by **!767**;
- the time grid applies to the review sheet only, not the live-request reschedule;
- "Select a time above to continue." is new app copy (flag it to John).

### GO — PL-314 MR **!454** is open on `PL-314-worker-review` @ 9838708d3
It needs a rebase onto Go production **9099b5828** (G40-604 phase 2 restyled the same files).

### SERVER — `gopher-backend-api`

| MR / branch | SHA | What | State |
|---|---|---|---|
| **!767** `fix/profile-age-fail-closed` | ba32714c | PL-322: the profile's `can_request_restricted_items` fails closed (`getAge(null)` = 56) | **OPEN**, pushed on John's go, awaiting his merge |
| **!768** `fix/order-view-round-cents` | 0f888b6b | PL-323: order view + 3 lists round, never truncate | **OPEN** |
| **!769** `fix/bid-accept-coupon-revalidate` | 5a56b937 | PL-324: coupon re-checked at bid accept; invalid → hire without it | **OPEN** |
| **!770** `fix/trip-distance-meters` | 31fd7976 | PL-325: distance from Google metres ("1,204 mi" was 1) | **OPEN** |
| `fix/go-feed-age-fail-closed` (local) | **b470bb48** | Go feed under-21 filter fails closed (`hides_restricted_work`) | **NOT pushed**; needs John's push/MR word |

- All of them are on production **5ca39221**.
- Run server tests alone with `STRIPE_API_KEY=sk_test_dummy SENDGRID_API_KEY=SG.test node test/<file>`.
- Lint with the repo's `./node_modules/.bin/eslint` (7.32), not npx.
- Full suite on a temp merge: 443/445. The 2 known failures (`cancellation-emails-one-each`,
  `g40-35-moderation-parity`) fail on the base too.
- Each MR description has the what/risk/undo; !770 has the before/after Ride price table.

### DOC FOR MATT — `gopher-dev-handoff` branch `code-logic/request-shared-logic` @ **9f6db32** (local)
- NEW `src/content/docs/platform/request-shared-logic.md`: 198 rows. 59 SAME, 50 FIXED-ON-BRANCH,
  40 DIVERGES, 24 SERVER-OWNED, 19 APP-ONLY, 4 DECLARED, 2 WEB-ONLY. Plus the wiring contract
  and the PL list.
- `platform/app-web-alignment.md` is marked superseded; it keeps the Go section.
- `programme/launch-sow.md` §E link repointed.
- **Before pushing:**
  1. refresh the statuses (CT port, the 4 rulings, the app rebases, the Go feed fix);
  2. claim the file in `programme/work-registry.md` (§13);
  3. get John's push go.
- The site build was not run (no node_modules in that worktree).

### PL-314 (from 10/15) — MRs **Request !517**, **Go !454**, open
- Desk note: G40-604 phase 2 restyled sheets in the same files. Whoever merges second rebases.
- Tell the desk before merging them.

## 5. Next steps, in order

1. **Web deploy (the desk gave this seat the slot at 6:51 AM 10/16).**
   - Live main is **a9aa51ce** (UI/UX's BITE section).
   - Source = `origin/brand-audit-corrections-2026-10-02` @ **db8654c9**.
   - Merge that into `code-logic/request-sync`. NOT a rebase: the branch has a merge commit.
     The fetch hung once; use `GIT_HTTP_LOW_SPEED_LIMIT=1000 GIT_HTTP_LOW_SPEED_TIME=15`.
   - Re-run run-all + the harness, then the whole-repo dry run (`scripts/deploy.sh`, dry run by
     default; read CLAUDE.md's deploy rules: content verification, both sites, scope check).
   - Send the file list to the desk, then ask John for "deploy".
   - After the deploy, verify by content on Pages, the twin, and TigerTech `/preview/`.
2. **Investigate G40-626's 5 failing suites after the rebase.** Likely a G40-604 kit change in a
   sheet test; fix on the branch.
3. **Ask John (one question batch):**
   - merge !767–!770, one at a time, verifying each live;
   - push + MRs for the 10 app branches, the Go feed branch, and the rebased PL-314;
   - the **CAT-3 ruling**: should the web get the app's Custom Task "Before you continue"
     category sheet? (Details in `sync-2026-10-15/build-web-ct.md`.)
   - Report each merge to the desk.
4. **Remaining web items** (all "app wins"; evidence in the audits):
   - D-44: duplicate warning (app: on opening a Delivery while another is out);
   - B-14/D-38: low availability uses the live `worker_count` (≤20 within 15 mi, on address pick);
   - B-9/D-34 and B-4: no text fallback for same-place; refuse an address Google can't find;
     risky on the live site, ask first;
   - MONEY-32: Cash App copy is stale (the 9/10 retired rule) and needs an acknowledgement;
   - MONEY-33: Link payment method;
   - MONEY-24: promo shown as its own row;
   - MONEY-13: Ride suggestion before the route = straight-line;
   - B-11/B-12: the 15-mile conversion scope (ASAP First Available on Delivery/Ride only; never
     a hand-picked favourite);
   - plus small B-35, DESC-5, D-27, B-5.
5. **Doc:** refresh, claim the registry, push on John's word. Then the **G40-628 close-out**.
6. **Dangling notes:**
   - the stale harness warning (same-address, G40-274 is done on both sides);
   - standing-rules §12b still names prototypes as the web's twin (sweep it, with the desk);
   - the web 101 guide CT 21+ line (101 seat);
   - the TrustShield popover copy on the web says "Delivery & Ride-Sharing".

## 6. Evidence (durable, in this repo)

`docs/handoff/request-app-parity/sync-2026-10-15/`:
- `audit-A-category-description.md`, `audit-B-where-who-when.md`, `audit-C-money.md`,
  `audit-D-submit-gates-drafts.md`, `audit-E-after-submit.md`: every rule, file:line on
  app/web/server at B24 (app b47efe59f, server 7e571e9f, web 9e29366).
- `build-server.md`, `build-app-1.md`, `build-app-2.md`, `build-web-dashboard.md`,
  `build-web-ct.md`, `rebase-app.txt`.

Older log: `APP-DIVERGENCE-2026-10-13.md` (branch `code-logic/coupon-pl289-web`).

## 7. PL numbers raised (the desk logged them)
- **PL-311:** the !760 defect, fixed by !761 (G40-628).
- **PL-314:** worker-raised review shown as a dispute.
- **PL-315:** the Go ID sheet accepts "confirmed" with no photo.
- **PL-316:** Prioritize MY Gopher reached non-favourites.
- **PL-317:** a $0.01 offer reached Review.
- **PL-309:** the app's Review ID line.
- **PL-321:** web skipped earlier-step checks.
- **PL-322:** null-DOB counted as 21+ on the profile.
- **PL-323:** order view truncated a cent.
- **PL-324:** bid-accept coupon not re-checked.
- **PL-325:** distance parsed from display text.
- **PL-326:** the app's 300 cap.
- **PL-327:** booked scheduled card.
- **PL-328:** web confirm/dispute guards.

## 8. Traps that cost time
- **zsh:**
  - an unquoted multi-line variable is ONE argument; use `arr=(${(f)"$(cmd)"})` + `"${arr[@]}"`;
  - `=====` in a command breaks it;
  - `--include=*.js` globs fail; use `git grep`.
- Never chain `git commit` after a check with `;`, because a failing check still commits. Gate
  on the check's result.
- **`element.click()` is a no-op inside that element's own click handler.** That's why PL-321
  calls `onContinue()` directly.
- **Localhost preview:** Google Maps refuses localhost (RefererNotAllowed), so address
  placement falls back after ~4 s; wait ≥6 s in tests.
- **Local Postgres 127.0.0.1:55432 is shared:** DB tests collide with other sessions. Re-run
  alone before blaming a change.
- **`dispute_resolved_at` / `dispute_resolution` mean "an admin decided"** to every app and HQ.
  Never stamp them from a worker or requester path (PL-311).
- **Server production moves often:** fetch, then rebase right before an MR. The desk names the
  current baseline (B27 on 10/16).
- **`git fetch` to GitLab/GitHub can hang:** use the low-speed env vars and run it in the
  background.
