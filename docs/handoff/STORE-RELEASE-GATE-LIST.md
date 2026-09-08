# ⛔ STORE RELEASE GATE LIST — do these when the apps are LIVE in the stores

> **Written 2026-09-05.** This is the checklist for the moment a store release actually reaches
> users. Everything below is **built, tested and deliberately not activated**, each waiting on the
> same event.
>
> **Nothing here is a rule.** It is a countdown list, and it should shrink to nothing and then be
> deleted. If an item is still here after the release has been live a week, that is the bug.

## The distinction that governs this whole file

**Merged ≠ submitted ≠ live.** Three different states, and only the third unblocks anything here.

| state | what it means | unblocks this list? |
|---|---|---|
| merged to `production` | the code is in the branch | ❌ **no** |
| in a build submitted to the stores | Appflow ran, the stores have it | ❌ **no** |
| **release LIVE, users updating** | the binary is downloadable and installs are moving | ✅ **yes** |

**Why the distinction is load-bearing rather than pedantic:** there is **no OTA on these apps**.
The stores ship binaries. A client merge changes what a *future* build contains and changes
**nothing** for anyone holding today's app. Every item below is a server-side change that would
misbehave against the currently-installed client.

**Current position, 2026-09-07: ALL FOUR SURFACES AT 100%. The owner's gate condition is MET.**

| surface | state | verified |
|---|---|---|
| App Store GO **3.9.2** | `READY_FOR_SALE`, `phasedReleaseState: COMPLETE` | 2026-09-07, ASC API |
| App Store Request **3.8.2** | `READY_FOR_SALE`, `phasedReleaseState: COMPLETE` | 2026-09-07, ASC API |
| Play GO **866** | `status: completed`, no `userFraction` | 2026-09-07, Play API |
| Play Request **854** | `status: completed`, no `userFraction` | 2026-09-07, Play API |

The owner rolled Play from 20% to 100% and ended both Apple phased releases early (they were on
**day 1 of 7**, ~1% auto-updating) after Sentry showed the release clean. **Both items below are
now unblocked.**

⚠️ **Verify a rollout by CONTENT, never by report.** Play at 100% reads as `status: "completed"`
with **no `userFraction` key at all**, and the superseded release drops off the track entirely.
Apple reads `phasedReleaseState: COMPLETE`. Both were re-read on fresh edits/requests above.

⚠️ **Store API credentials are READ-ONLY and that is deliberate** — the Play service account is
literally `claude-readonly@gopher-inc.iam.gserviceaccount.com`, and the ASC key returns
`403 FORBIDDEN_ERROR` on any write. Rollout ramps and phased-release completion are **owner-only,
in the consoles**. Do not propose widening either credential. See memory
`store-credentials-are-read-only` for the exact console paths.

**Superseded, kept so the reasoning is not re-litigated:** the 2026-09-05 owner decision — *"we'll
leave both until we're 100% launched on both stores"* — was the stricter bar this file waited on,
and at phased day 1 with Play unpublished it was correct that "iOS is live" unblocked nothing.

### Sentry at the moment of the ramp, 2026-09-07

The evidence the ramp was taken on, so a later reader can judge it rather than trust it:

- **Zero fatal events on any 3.9.2 build in 7 days.** All 11 fatals in the window sit on
  13.9.1 (5), 13.9.0 (2), 3.9.1 (2), 3.9.0 (2).
- **No new issue types on 3.9.2.** Only two issues org-wide were first seen in 48h; neither on 3.9.2.
- **Events per affected user (48h)** — the only comparison not distorted by cohort size, since
  3.9.2 was on ~20% of Android and ~1% of iOS: `gopher@3.9.1` **15.0** and `gopher@13.9.0` **14.5**
  are the two worst on the board, against `gopher@13.9.2` 4.5 · `requester@13.9.2` 4.5 ·
  `gopher@3.9.2` 3.9 · `requester@3.9.2` **2.4**. The new builds are at the low end.
- **The largest cluster in the project is fixed and stays fixed:** `locationTrackingService.initialize`
  → `this.currentOrder.requestor.id` undefined, **5,691 events / 376 users over 7 days, every one on
  3.9.0 / 13.9.0.** Zero on 3.9.1, zero on 3.9.2.
- ⚠️ **Still to watch:** `LocationUnavailableError` on Android GO — 1,639 events / 67 users on
  3.9.1, about **24 events per user**, a loop. On 3.9.2 it was 14 events / 1 user: directionally
  better but n=1. **This is the headline fix in the GO release notes — re-check it now that the
  population is real.**
- ⚠️ Play's own crash/ANR rate was **`Data unavailable`** at ramp time — its freshness window had
  not passed. Sentry did that job. Re-read the Play vitals once they populate.

⚠️ **`NSMicrophoneUsageDescription` is missing from all four iOS `Info.plist` files** across both
repos, and is **still missing in 3.9.2** (checked in the working tree). It produces a hard SIGABRT.
Low volume so far — 1 user / 2 events on 13.9.1 — but deterministic. The obvious suspect, the Inbox
voice-search button, was **checked and ruled out**: `speech.start()` is never called, so that
control is dead code. **The trigger is unidentified.** Needs a ticket, not a guess.

---

## 1. `gopher-backend-api!436` — the $0 offer floor, server half

**Ticket:** G40-415 (priority **Highest**, Code Review) · **Doc:**
`docs/handoff/offer-floor-2026-08-26.md` (the authority) · **Branch:**
`fix/offer-must-be-nonzero` · **Memory:** `worker-offer-nonzero-rule`

**The rule (owner, 2026-07-17, restated 2026-08-26 on order 64826):** *"We can't allow users to
set an offer to $0 ever."* — `offer > 0` **unless** `offer_by_gopher` is true.

**Client half already shipped** — `!252` (`21f14644ba9e`), merged 2026-08-31, browser-verified by
the owner against production: `$0.00` blocked with the reason shown, `$0.01` submits, and **`$0`
with the bid toggle on still submits** (the row that matters — a naive implementation silently
kills the bids product).

### ⚠️ Why it must not merge before the release is live — CONDITION NOW SATISFIED 2026-09-07

*Kept because it is the reasoning, not the status. Both stores are at 100%, so the objection
below no longer applies — it explains what the wait was buying.*

`src/component/requestOrder.js:312` in the **shipped** client is an empty `else` block. A live
requester submitting `$0` against a guarded server gets a **403 and sees nothing at all** — no
message, no error, no retry.

**That is worse than the bug it fixes.** A `$0` order today is *recoverable*: a worker can
counter-offer, and the `max($20, 1.5 × offer)` cap means the **$20 floor binds**, so the job still
gets done at a real price. A swallowed 403 is recoverable by nobody. This is exactly the owner's
2026-08-26 ruling — *"leaving it is better than killing the broadcast."*

**Scale, so the urgency is weighed honestly:** 282 zero-offer non-bid orders all-time, **71
delivered** — but **since 2026-01-01 it is 2 of 104**. Largely historical, not a current bleed.

### ✅ MERGED 2026-09-07 — item 1 is DONE. The rebased branch is now a TRAP; read the box below.

**Branch: `rebase/offer-floor-2026-09-06`** (in `gopher-backend-api`), rebased from
`fix/offer-must-be-nonzero` onto `production`, zero behind.

⛔ **Pushed as a NEW branch, deliberately NOT force-pushed over `fix/offer-must-be-nonzero`,**
because **MR !436 points at that branch** and force-updating it rewrites shared history.
**Open owner decision: repoint !436 at the rebased branch, or force-update the original.**

**One conflict, in `controllers/order/update.js`** — production had added the G40-9 released-order
guard in the same place. **Both kept**, with the offer floor placed **after** it, on the branch's
own logic: a released order should report as released, not as a pricing problem.

**Verification, all first-hand:**

| check | result |
|---|---|
| placement — `create.js` floor L242 vs `payment_actions.charge.create` L536 | ✅ fires **before** the charge |
| placement — `update.js` state checks L274/L296, released guard L334, floor **L355** | ✅ fires **after** all three |
| `test/offer-floor.test.js` | **13/13** |
| `node --check`, prettier | clean |
| `$0.00` · absent · negative | blocked |
| `$0.00` **with `offer_by_gopher`** (boolean *and* string) · `$0.01` · `$10.00` | allowed |

⚠️ **A near-miss worth keeping, because it nearly became a false alarm on a payments guard.** An
ad-hoc probe first reported `$10 → BLOCKED`. That was the harness, not the code: the field is
**`gopher_offering`, in DOLLARS**, not `offer` in cents, so every case read as absent. Read
`helpers/offer_floor.js` before writing any test against this path.

### ✅ MERGED — verified from the merge commit, not from the MR's word

**`!436` merged to `production` 2026-09-07 18:35 UTC** as `3bdd0f98`, **from the ORIGINAL branch
`fix/offer-must-be-nonzero`** — so the "repoint or force-update" decision above resolved itself by
merging the original, and the rebased branch was never used. Confirmed by reading the merge commit
rather than the MR status: it carries `helpers/offer_floor.js` (new), the guard in `create.js`
(before any Stripe token is created) and in `update.js`, `constants/index.js`, and the 161-line
`test/offer-floor.test.js` — 5 files, 272 insertions, 0 deletions.

✅ **`rebase/offer-floor-2026-09-06` — DELETED 2026-09-08.** Recovery handle if it is ever wanted back: its tip was **`267f13717fbaf756fce76b10e4a77b2e4d350334`** (`git branch <name> 267f1371`). It was a trap: rebased on
2026-09-06 and `production` has moved a long way since. Its diff against `production` today is
**3,990 deletions against 92 insertions** — merging it would revert the payout-stock sweep, the
Stripe wallets work, the address null-guards, the refresh-token diagnosis, the release-resets-ETA
fix and their tests. It carries nothing production does not already have: its one commit is the
same offer-floor change that shipped by the other route.

### Remaining steps

1. ~~Decide the MR pointer, then merge.~~ **DONE — `!436` merged 2026-09-07 (`3bdd0f98`).**
2. ~~Delete `rebase/offer-floor-2026-09-06`.~~ **DONE 2026-09-08.** Checked before deleting, not
   after: `helpers/offer_floor.js` and `test/offer-floor.test.js` are **byte-identical** between the
   branch and `production`, and every one of the branch's edits to the other three files is present
   there — `require('../../helpers/offer_floor')` and `offer_floor.offerFloorError(req.body)` in
   **both** `order/create` and `order/update`, plus `MIN_GOPHER_OFFER_CENTS = 1` in
   `constants/index.js`. Nothing unique was lost, and no open MR pointed at it.
3. ~~Close **G40-415 AC 6**.~~ **ALREADY CLOSED — verified in Jira 2026-09-07:** G40-415 is
   `status: Done`, `resolution: Done`. AC 6 was *"the server guard merges in the same release, or
   after the app can display a create error — never before"*, and `!436` merging behind a live
   client half is exactly that. **Nothing to do here.**

⚠️ **The ticket's DESCRIPTION is stale even though its status is right** — it still reads *"TODO —
NOT SHIPPED"* and *"the server guard is built and pushed but deliberately NOT merged."* Left alone
deliberately: the ticket is closed, and this file plus `offer-floor-2026-08-26.md` are the
authority. Do not reopen it to tidy the prose.

✅ **AC 5 is NOT open — corrected 2026-09-05.** It was already satisfied on 2026-08-29 by
`c67c482aa` (an ancestor of `production`): `src/helpers/validation.js` no longer exists in the
requester app and `validateRequire` has **zero occurrences** anywhere in the repo. The ticket's
2026-09-01 comment said otherwise and was stale; that stale line is what made this look open, and
it was repeated here before being checked. **G40-415 is down to AC 6 alone.**

✅ **CORRECTED 2026-09-07 — the GO app's copy is gone too, so there is nothing left to do.** This
file previously said the identical dead file *"does still exist one repo over."* It does not:
`src/helpers/validation.js` was removed from `gopher-mobile-gopher` by `9813549cf` (*"Remove a
validator that nothing has ever called"*), which is on `origin/production`, and `validateRequire`
has **zero occurrences** in `src`. The only copy still on disk is an untracked leftover in a local
working tree checked out on an older branch — **repo truth is that both apps are clean**, which is
what satisfies G40-415 AC 5 on both sides rather than one.

---

## 2. G40-350 / G40-410 — the TrustShield gate removal and the iDenfy exit

**Doc:** `docs/handoff/trustshield-gate-removal-interim.md` · **Memories:**
`trustshield-cliff-and-gate-removal`, `idenfy-exit-decided`

**The state as recorded 2026-09-04:** all backend and client work merged and deployed, **11 of 12
acceptance criteria device-verified**. Only the store release remains.

### ⚠️ The env var is NOT a contingency — it is a component of the release

The tempting reading is that `TRUSTSHIELD_MIN_AGE=21` un-gates iDenfy on its own, with no deploy.
**It does not, and cannot.** The shipped `3.9.1` client gates on its **own hardcoded threshold**,
so the server setting cannot loosen anything for an installed app. The env var's real job is to
stop the **new** client's un-gated flow hitting a 403 at submit — so it must be correct **at the
moment the release goes live**, neither before as a rescue nor after as a fix-up.

### ✅ Contradiction SETTLED 2026-09-05 — the env var IS live

The interim doc disagreed with itself: line ~64 said `TRUSTSHIELD_MIN_AGE=21` was confirmed live,
its §3 table said *"REINSTATED, still unset"*. **Line 64 was right.** Read directly off
`Gopher-Production`:

| variable | value |
|---|---|
| `TRUSTSHIELD_MIN_AGE` | **21** |
| `TRUSTSHIELD_TOKEN_GATED_AGES_ONLY` | **false** |

Control: 64 environment variables visible, so this is a real reading rather than an empty result.
An earlier attempt the same day returned nothing and **that was an expired AWS session, not the
configuration** — the trap in `aws-cli-session-expiry-reads-as-zero-results`. `aws sts
get-caller-identity` first, every time.

The stale table row in `trustshield-gate-removal-interim.md` has been corrected.

⚠️ **Filter the query to those two names.** A broad `grep -iE "TRUSTSHIELD|IDENFY"` over the EB
configuration also returns `IDENFY_API_KEY`, `IDENFY_SECRET_KEY` and
`IDENFY_CALLBACK_SIGNING_KEY`. Never paste that output into a doc, a ticket or a transcript.

**So item 1 below is done. What remains on G40-350 is the store release itself.**

### Also on this ticket, from the interim doc's own table

| # | item | where | needs |
|---|---|---|---|
| 1 | disable the server-side gate | `TRUSTSHIELD_MIN_AGE=21` | ✅ **done — verified live 2026-09-05** |
| 2 | remove the client tap-gate, **keep the under-21 hide** | `RequestCategoryBlock.js` | store release |
| 3 | stop hiding the A/R toggle for under-30 | `togglebutton.js:139` | store release |
| 4 | error state instead of an infinite spinner | `idenfy.js` | store release |
| 5 | TrustShield in **Account**, captured by us not iDenfy | client | store release |
| 6 | post-cliff message that does not send users into a retry loop | `trustshield.js` | ✅ done, backend only |

### ✅ CORRECTED 2026-09-05 — the "irreversible" iDenfy item is largely DONE

This section previously said the worker's ID-confirmation screen hotlinks the requester's selfie
and licence live from iDenfy, and that mirroring them was the one thing that becomes impossible.
**That was written from the ticket, not the code, and it is out of date.** Verified today:

| | |
|---|---|
| `scripts/trustshield-export-images.js` | ran **2026-08-07/08** |
| objects under `uploads/trustshield/` | **20,391** |
| serve path | **mirror FIRST, iDenfy as fallback** — `helpers/trustshield_files.js`, live on `production` |
| self-repair | a mirror miss iDenfy *can* still answer is copied into the mirror in the background |
| internal capture | takes precedence over both |

So existing holders are **not** waiting on anything here, and the completion flow does not go blank
the day iDenfy stops answering.

### ⛔ RE-MEASURED 2026-09-07 — the gap is **6 scan refs**. The "ONE ROW" figure below was WRONG.

**Correction.** On 2026-09-06 this file recorded the gap as **1 row**. A clean re-run on 2026-09-07,
after `TRUSTSHIELD_IDENFY_ENROLMENT_DISABLED=true` was set, finds **6**. Four of the six are from
**March–June 2024** — they were not new arrivals, they were **missed by the earlier measurement**.
Treat the 09-06 number as retracted, and the commit that carried it (`20271a1`) as wrong on this point.

⚠️ **The likely cause is a `comm` on inputs that were not identically sorted** — it fails silently
and produces a plausible-looking smaller number. **Sort both sides explicitly and run the difference
in BOTH directions**, as a control. This run's reverse difference returned 27 S3 prefixes with no
APPROVED row (non-approved statuses), which is the sanity check that the comparison works at all.

| | |
|---|---|
| S3 prefixes under `uploads/trustshield/` | **6,937** |
| APPROVED rows carrying a vendor `scan_ref` (all legacy, `capture_source` NULL) | **6,916** |
| **unmirrored** | **6** |
| S3 prefixes with no APPROVED row (control) | 27 |

Probe controls: `pg_is_in_recovery = true`, and `role_id=2` read **61,606** against 61,598 earlier
the same day — live data, not a cached or empty result.

### The six, and why they are two different problems

**Four are from 2024 and are almost certainly already unrecoverable** — users 55102 (2024-06-03),
39760 (2024-03-28), 44613 (2024-03-27), 45002 (2024-03-27). The export run of 2026-08-07/08 found
roughly 98 scan refs iDenfy would **no longer answer for**; these fit that population. Severing does
not destroy anything here that is not already gone.

**Two are recent** (`17c46d56…`, user 143556, 2026-09-07 00:03, and `13f1b3a8…`). These are the live
self-heal-on-first-view category and are still recoverable **while iDenfy credits last**.

⚠️ **Note the row/ref distinction: 6 distinct scan refs span 9 rows** — several users hold duplicate
`trust_shield_users` rows with the same ref. Count refs, not rows, or the number inflates.

✅ **With enrolment now disabled the gap is bounded** — no new unmirrored rows can appear, so 6 is a
ceiling that can only shrink as the two recent ones are viewed.

### ✅ CLOSED 2026-09-07 — the two recoverable holders are mirrored. Owner accepted the other four.

**Owner ruling 2026-09-07:** *"mirror the 2 and those old 4 are accepted casualties. leave them behind."*

**Done, and verified by content:**

| | before | after |
|---|---|---|
| S3 prefixes under `uploads/trustshield/` | 6,937 | **6,939** |
| unmirrored APPROVED scan refs | 6 | **4** |

Both new prefixes carry the full set — `FRONT.png`, `BACK.png`, `FACE.png` at realistic sizes,
matching a known-good holder used as a control. Users **143556** and **143586**.

⭐ **No script was run, and that was the point.** `scripts/trustshield-export-images.js` says in its
own usage note that it *"runs where the backend runs, not from a laptop"*, and it does
`require('../models')` — so it executes the **production boot DDL** as a side effect of mirroring
two files.

**Instead the existing self-heal path was triggered.** `GET /admin/user/:id/trustshield_files`
(`controllers/admin/user.js:1543`) goes through `helpers/trustshield_files.js`, which serves
mirror-first, falls back to iDenfy on a miss, and **copies the images into the mirror in the
background**. HQ already wires that endpoint in its user-detail view (`app_part4.js:4557`), so the
owner simply opened the two holders. No script, no DDL, no credentials on a laptop, and it exercised
the production path rather than a parallel one.

⚠️ **The backfill is deliberately not awaited** — it must never add latency to the serve path — so
allow a moment before verifying, and verify against **S3**, not against the HTTP response.

**The four left behind:** users 55102, 39760, 44613, 45002 — all March–June 2024, and consistent with
the ~98 scan refs the August export found iDenfy would no longer answer for. Accepted as lost by
owner ruling; severance destroys nothing here that was still recoverable.

### The severance sequence

1. **Set `TRUSTSHIELD_IDENFY_ENROLMENT_DISABLED`** so no new unmirrored rows can appear. The kill
   switch is merged (`c86875bb` → `b75b4ac3`) and inert until the var is set. **This is the step
   that must come first** — a final sweep is worthless while enrolment is still writing.
2. Let the handful in flight settle, or force them.
3. **Re-run the sweep and confirm zero**, using the same S3-prefix ÷ DB set-difference as above.
4. Sever.

### ⏱️ The credit clock, re-read 2026-09-08 — **86 credits left, and the old date was wrong**

**`Count used 3284 · Service limit 3370` ⇒ 86 remaining**, read from **Finance → Identification**
(never the Overview, which renders `used / limit` and has already been misread once as
`remaining / total`, wrong by a factor of twenty).

⛔ **The "~10 September" cliff this file carried did not happen, and the 11.8/day slope behind it
halved.** Three points now:

| Date | Remaining | leg | burn |
|---|---|---|---|
| 2026-08-23 | 218 | — | — |
| 2026-08-29 | 147 | 6 days, 71 used | **11.83/day** |
| 2026-09-08 | **86** | 10 days, 61 used | **6.10/day** |

16-day average **8.25/day**. From 86 remaining that projects **~22 Sept** at the latest leg,
**~18 Sept** at the average. **The honest window is mid-to-late September** — and G40-410's original
*"22–25 Sept"* was closer than the 11.8/day alarm that displaced it.

⚠️ **Do not re-harden this into a date.** A two-point burn rate on a number driven by signup volume
is a hypothesis; the previous one over-predicted by about a factor of two. Whether 6.10/day holds is
now the open question. **There is roughly a fortnight of margin, not "possibly already gone" — but
re-read before acting on any date above.**

**Owner constraint (2026-08-04):** everyone who already holds TrustShield **keeps it**, and their
completion protocol behaves identically end to end. Only *new* enrolment is shut off. The
enrolment kill switch is merged (`c86875bb` → `b75b4ac3`) and **inert until its env var is set**.

---

## 3. Carried device gates from the 2026-09-05 sprint

These are already closed on their tickets, listed only so nobody re-opens them looking for a
store-release dependency that does not exist.

| ticket | state |
|---|---|
| G40-424 | ✅ closed — device-verified iOS + Android 2026-09-05 |
| G40-426 | ✅ closed — AC4 verified on the A50, build 905. ⚠️ **AC4 means "the tap reaches the handler and routes", NOT "opens the specific order"** — clarified 2026-09-07, see note below. |
| G40-420 | ✅ closed — device-verified both platforms |

⛔ **G40-426 / F-037 reconciled 2026-09-07 — BOTH RECORDS ARE TRUE. The row above was incomplete,
not wrong.** It read *"✅ closed — AC4 tap routing verified on the A50, build 905"* and appeared to
contradict **F-037** in `TESTING-FINDINGS-LEDGER.html` (*"tapping an Android push still does not
open the right order"*, OPEN, device-confirmed on GO 866 / Request 854). Read against the shipped
source, **they assert different success criteria, and F-037's is the one that no code implements.**

⭐ **The build-905 test record itself proves this**, and it was sitting in the session memory the
whole time: the tap *"moved the app from **Available Requests** to the **Request tab**."* That is
`navigate("/request")` — the GO **dashboard**. The build-905 verification was real, correctly run
(APK provenance proven by grepping the installed dex, notification channel read back out of
`dumpsys`), and it verified **exactly what the code does**. It never claimed to open a specific
order, and it could not have.

⛔ **THE TICKET'S OWN WORDING SETTLES IT — read 2026-09-08 from Jira.** G40-426 AC#4 is, verbatim:

> **4. A push tap routes to the right screen on Android, verified on a handset.**

**"the right screen" — not "the specific order."** Build 905 moved the app from Available Requests to
the Request tab. That *is* the right screen, and it is the only screen GO's rule set can produce.
**AC#4 was met.** F-037/E5 tested a different sentence and correctly failed it.

⛔ **The App Links lead in the reopen comment is a DEAD END for AC#4 — do not spend time on it.**
The push tap path contains **no deep link at all**: an explicit `Intent(this, MainActivity.class)`
with `putExtra`, then a `gopherPushTap` window event, then `react-router` `navigate()`. No URI, no
`VIEW` action, no domain verification anywhere in it. Android App Links cannot affect it.

⭐ **But the Play Console warning is real and now identified — it is just a different thing.** The
`autoVerify` intent-filter lists five hosts. `api.gophergo.io` is correctly configured (assetlinks
declares **both** `io.gophergoapp.go` and `io.gophergoapp.requester`, 3 fingerprints each). The two
Firebase Dynamic Links hosts — `gophergoapp.page.link` and `gopherrequestapp.page.link` — publish
assetlinks declaring **only `io.gophergoapp.requester`**; `io.gophergoapp.go` is absent. That is
exactly *"2 deep links may be failing"* on the **GO** listing.

⛔ **CORRECTION 2026-09-08 — I first called those two hosts "probably dead weight" on the assumption
FDL was sunset. Wrong: I asserted it instead of checking.** Both URLs are **live**, each answering
**302 → `https://lnk.gophergo.io/`**. Two things follow, and neither changes the AC#4 conclusion:

1. **The likelier cause of the Play warning is simpler than assetlinks.** Both entries read
   `android:host="gophergoapp.page.link/PZXe"` — **a path jammed into `android:host`**, which takes
   a hostname only. It cannot match a URL and cannot verify. The three `api.gophergo.io` entries
   beside them correctly use `host` + `pathPrefix`.
2. ⭐ **`lnk.gophergo.io` is claimed by nothing.** Its assetlinks is **correctly** configured — both
   packages, 3 fingerprints each — yet it appears in **neither** Android manifest and **neither**
   iOS entitlement. A link on it opens the **browser**, not the app.

⚠️ **Not user-facing today** — nothing in any repo generates a `page.link` or `lnk.gophergo.io` URL;
referral SMS uses `api.gophergo.io/self-referral/`, a 200 landing page by design. It is a latent trap
for whoever starts using that domain. **Raised as [G40-457](https://gopherapp.atlassian.net/browse/G40-457);
still unrelated to push routing.**

⭐ **A third record agrees, and it is the authoritative procedure:**
`docs/handoff/G40-426-G40-420-device-qa-runbook.md` §1 states the pass criterion in as many words —
*"PASS — the app opens **on the Request tab**."* ⚠️ **That file is currently UNTRACKED in this
checkout** — commit it, because it is the only place the correct test is written down.

⛔ **Where the drift actually came from — fix this before the next test sheet is written.** The
2026-09-05 sprint test sheet phrased E5 as *"Tapping a push notification opens the right **order** —
Android."* That is not AC#4, and it is not what any build does. **Copying that wording forward will
manufacture the same false contradiction again.** Phrase it as the runbook does: name the push type,
name the destination screen.

**What the shipped builds actually do.** `src/component/PushTapListener.js` is the single routing
authority in both apps (mounted in each `router.js`; the `index.tsx` listener is the legacy
empty-body one). At `release/android-866` / `release/android-854` its complete rule set is:

| app | `data.type` | where the tap lands |
|---|---|---|
| GO | `order.payout` | `/request` — the **dashboard**, deliberately: the dashboard's bottomMenu owns the rating pipeline |
| GO | anything else | nowhere — early `return` |
| Request | `requestor.payment_action_needed` | the card list — **but this branch is dead**, see below |
| Request | `no_show_warning` | the order screen, **only** when `localStorage.activeRequest.id === data.order_id` |
| Request | anything else | nowhere — early `return` |

**`no_show_warning` in the Request app is the only push in the product that opens a specific
order.** A test phrased *"tapping a push opens the right order"* therefore cannot pass on GO on any
build, and cannot pass on Request unless the push is a no-show warning for the order that is
currently stored as `activeRequest`.

**Three of the four hypotheses are dead, on evidence:**

1. ❌ *"build 905 predates the fix / the fix is not in the release."* `1464eeb47` is an ancestor of
   tag `release/android-866`; `933d0aa56` is an ancestor of `release/android-854` **and**
   `release/ios-853`. The fix shipped on all three.
2. ❌ *"the native delivery chain is broken."* All three links are present and correct at the
   release tags — the FCM service puts the data on the intent, `MainActivity` reads it back and
   dispatches `gopherPushTap`, `PushTapListener` feeds it to the same handler as the Capacitor
   event. `MainActivity` is `launchMode="singleTask"`, so a tap on a **backgrounded** app arrives
   via `onNewIntent` with extras intact — no activity recreation, no cold-start race.
3. ❌ *"the payload carries no `type` / `order_id`."* `controllers/order/notification.js` attaches
   `{type, order_id}` to every push (generic block, ~line 1064), and `lib/sendPushNotif.js`
   string-coerces it and merges it into `data` for **both** the new-app and old-app payloads.
4. ✅ *"the two describe different payload paths."* This is the survivor — and it is stronger than
   that: they assert **different success criteria**. *"AC4 tap routing verified"* is fully
   consistent with an `order.payout` tap landing on the GO dashboard, which is what the code is
   built to do and what `scripts/assert-push-tap-delivery.js` guards. *"Opens the right order"* is a
   different claim, and nothing in GO implements it.

## ✅ OWNER DECISION 2026-09-08 — the COPY moves, not the code. F-037 is release-note debt.

**AC#4 is met; F-037 stays OPEN purely as a copy correction.** The apps route a tap to a *screen*,
deliberately, and that behaviour is not changing for 3.9.3. The live release notes promise something
the product does not do, so **the promise is what gets corrected.**

⚠️ **The scope is wider than the debt row below records: the claim is false on iOS too.** The
routing table above sits **above** the delivery layer, and iOS runs the same `handleTap` via the
Capacitor event. So *"Tapping a notification opens that specific order / job"* must be corrected on
**all four surfaces** — App Store GO 3.9.2 (*"Tapping a banner notification opens that specific
job."*), App Store Request 3.8.2, Play GO and Play Request — not on Play alone.

**Per-order routing was considered and not taken.** GO's own code comment argues against it: the
dashboard's bottomMenu owns the pending-alert pipeline, so navigating straight to an order would
need a second order fetch and a second routing path that can drift from the pipeline's. If it is
ever wanted, it is a new ticket and a store release, not a correction to this one.

⭐ **The corrected copy is now written out in full, once, in
`gopher-dev-handoff/public/release/RELEASE-NOTES-3.9.3-CORRECTIONS.md`** — replacement wording for
all three owed lines, which surfaces each is wrong on, and the read-back check. **Paste all four
store surfaces from that one file, in one sitting.** The reusable
`RELEASE-EXECUTION-CHECKLIST.html` now carries the two rules behind it: *quote the AC, never
paraphrase it* (Phase 0) and *write the copy once, paste four, read back* (Phase 3). The sprint test
sheet's **E5** has been reworded at source, since the next sheet is written by copying it.

✅ **Separate live defect found while reconciling — FIXED AND MERGED 2026-09-08 (`7d64b899`).** The
Request app's card-list deep link is dead: `notification.js` notif_types[36] sent
`type: 'payment_action_needed'` while `PushTapListener` compares against
`'requestor.payment_action_needed'`. Confirmed dead on `origin/production` and on both shipped tags
(`release/android-854`, `release/ios-853`), and **reachable, not latent** — `middleware/crons.js:1123`
calls the notifier from the live `re_authorize_token` cron behind no feature flag.

**Owner decision 2026-09-07: the BACKEND moves**, because it reaches every handset already in the
field on deploy; the client fix would have waited on a store release. Shipped as
[!514](https://gitlab.com/gophergo/gopher-backend-api/-/merge_requests/514) (branch
`fix/payment-action-needed-deeplink-type`, one string plus two guards — no payments or authorization
logic). **Merged to `production` 2026-09-08 as `7d64b899`**, which auto-deploys via CodePipeline →
Elastic Beanstalk (a merge to `production` IS the deploy; ~40s). Re-verified against the merged
production code, not the branch: both guards pass there, including the runtime check that the type
leaving the server is now the prefixed form, and the full suite is 241/242 (the one failure is the
known stale-`node_modules` `express-jwt` false red). Production API answers **301** on
`/api/v1/app/requester`, the documented liveness signature.

✅ **DEPLOYED AND VERIFIED 2026-09-08 17:43 UTC — this is now fixed for users.** Read from Elastic
Beanstalk, not inferred: `Gopher-Production` is `Status: Ready`, `Health: Green`, running version
`code-pipeline-1788889257651-7d64b899c9f7914d130b946f66f7d943dd95eb28` — whose SHA is a
**character-for-character match** for the merge commit on `production`. Events confirm *"New
application version was deployed to running EC2 instances"* and *"Environment update completed
successfully."*

⚠️ **The `Degraded` warning at 17:44 was the rollout, not a fault.** EB briefly ran **2 instances**
during the deploy, so one was still on the old version — *"Incorrect application version found on 1
out of 2 instances."* It terminated the excess instance and health went `Degraded → Ok` at 17:45.
**Confirmed back to a single instance** (`i-0a34fadcbbf20dbff`), which matters here: two instances
break socket.io in this environment. Do not read that WARN in the event log as a failed deploy.

The only thing still unproven is the handset experience itself — the server now emits the string the
shipped client matches, but nobody has tapped a real push.

*Checked while fixing:* three of the four hand-written `extra_data.type` values diverge from their
dispatch key, so there is **no file-wide convention** — `no_show_warning` is *correctly* short
because that is what its own shipped client rule matches, `order.payout` matches its key, and
`gopher_released` is short only because nothing routes on it. Only notif_types[36] had a client rule
written against the form the backend did not send. The `g40-18` invariant test pinned the old string
and moved with the fix; it now also **rejects** the short form.

### The handset test is now ONE decisive check, not an exploration

- Android, **Gopher Request** build 854, two or more orders in progress.
- Confirm which order is stored as `activeRequest` first. The rule only fires on a match, so a
  warning for the *other* order correctly does nothing — **that is a pass, not a failure.**
- Trigger a real `no_show_warning` push for the order that IS the stored `activeRequest`, background
  the app, tap it.
- Expect: the order screen for **that** order.
- Separately on **GO** 866: tap an `order.payout` push and expect the **dashboard**. That is AC#4 as
  built — record it that way, not as "the specific order."
- Record whether `pushNotificationActionPerformed` fired (on Android it should **not**) and whether
  `gopherPushTap` fired (it should). Neither firing means the native chain broke.

---

⭐ **A web-layer fix may already be on the handset.** G40-424 waited on "the Appflow build" it did
not need — the fix had shipped in build 902 on 9/4, proven by pulling the installed APK and
grepping its bundle. **Before assuming an item here needs the release, check what is installed:**
`adb shell pm path <pkg>` → `adb pull` → `unzip 'assets/public/*'` → grep `main.*.js` for a string
unique to the fix. For a **native** fix, grep `classes*.dex` instead.

---

## 4. The in-app "update is available" announcement

### ✅ SENT AND CLOSED 2026-09-07 — all four went out

**Owner sent all four in-app notifications** (GO/Play, GO/Apple, Request/Play, Request/Apple) after
both stores reached 100%. Delivery and push both confirmed. **Item 4 is done — do not re-send.**

⛔ **Owner ruling: no further announcement.** *"not sending 4 more announcement… not disrupting user
again."* If a later session finds this section and reads it as outstanding, it is not.

**Before sending, a scoped self-test was run** (Custom user-ID filter, live count of 1) with the real
Play URL as the body: push received, message opened, link tapped, Play Store reached. That closed the
one silent-failure risk — an unwrapped URL would have shipped as dead plain text with every other
signal looking healthy.

⚠️ **"Pushes work" here means DELIVERY works.** It does not touch **F-037** (tapping an Android push
does not open the right *order*), which remains OPEN — see the G40-426 note. An inbox campaign has
nothing to deep-link to, so it could never have tested that.

### ✅ UNBLOCKED 2026-09-07 — both blockers are gone

Both reasons this was held have been removed by the 100% rollout recorded at the top of this file:

1. **Android can now act on it.** 3.9.2 is downloadable by every Android install. Until the ramp it
   was not — a staged Play rollout gives users outside the cohort **no Update button at all**, so
   the message would have been simply false for ~80% of them.
2. **There is no staged rollout left to defeat.** The tension was real while it existed: phasing
   throttles *automatic* updaters only, and a mass "update now" notice drives *manual* updates that
   bypass it entirely. With both stores at 100% the conflict does not exist.

⚠️ **Apple was never the constraint, and this was nearly got wrong.** Phased release throttles only
automatic updates — anyone tapping the App Store link could always update manually. **Only the two
Play messages ever needed to wait.**

### Sending it — four messages, one per app per store

Owner drafted four: GO/Play, Request/Play, GO/Apple, Request/Apple. Audience is `ur.role_id` +
`ur.device_type`: **role 2 = Gopher (GO app), role 3 = Requester (Request app)**.

⛔ **Each send needs EXACTLY ONE role and EXACTLY ONE device ticked.** In
`controllers/admin/inbox_message.js` the role filter applies only when `role.length === 1`, and the
device filter only when exactly one of ios/android is chosen (`if (ios && !android) … else if
(android && !ios)`). **Tick both, or neither, and that filter is silently dropped and the message
goes to everyone.** No error, no warning.

⚠️ **The SUBJECT becomes the push notification title.** The push body is hardcoded to
`"Check your Gopher Inbox here"` (`send_inbox_mail`), so the subject is what every recipient reads
on their lock screen. Three of the four drafts had no headline at all.

⚠️ **Proofread the app name against the link.** The GO/Play draft read *"A new version of **Gopher
Request** is available"* above the `io.gophergoapp.go` URL.

**Links do work, and the mechanism is not obvious.** HQ auto-wraps bare URLs into the `@!url!@`
markup (`_autoLinkMarkup` in the portal), and `SupportMessage.js` renders that as a real
`<a href target="_blank">` in both apps. The **list preview** uses a different renderer
(`inbox.js` → `formatMessage`) which strips the markup to plain text and truncates at 70 chars —
that is the preview, not the opened message.

- **In-app inbox is the only channel with a real read receipt** (`inbox_users.viewed`). Push and
  SMS have none, deliberately — see memory `campaign-recipient-reporting`.
- **Deactivated and deleted are suppressed by `helpers/campaign_audience.js`** — not something to
  remember per send.

### ✅ VERIFIED IN PRODUCTION 2026-09-07 — the link chain works end to end

Owner sent a scoped test to himself (Custom user-ID filter, live count **1** before sending) with
the real Play URL as the body. Result: **push received · message opened · link tapped · landed on
the Play Store listing.**

**That closes the silent-failure risk on this whole campaign.** Both halves are confirmed on the
deployed HQ and the shipped apps:

1. **HQ wraps bare URLs** into `@!url!@` on the way in (`_autoLinkMarkup` in the campaigns portal).
2. **`SupportMessage.js` renders that markup as a real `<a href target="_blank">`**, and the tap
   reaches the store.

⚠️ **Why this needed testing at all:** if step 1 had failed, the send would still have succeeded —
delivered, pushed, logged in the ledger — and every recipient would have received a **dead
plain-text URL**. Nothing anywhere would have reported a problem. **A bare URL that HQ fails to
wrap does not linkify**; the app recognises the markup and nothing else.

⚠️ **Judge the link from the OPENED message, never the list preview.** They are different
renderers: the list uses `inbox.js` → `formatMessage`, which strips the markup back to plain text
and truncates at 70 chars. Only `SupportMessage.js` produces the anchor.

**Test-scoping recipe, reusable:** Custom = your `users.id` (**not** the role-row id — the audience
query aliases `users_roles.id` away as `role_id`), one Role ticked, **Device left unticked**.
Device is per role row and reflects the *last device signed in for that role*, so an Android filter
silently matches **zero** if you last opened that app on an iPhone. ⛔ **Confirm the live count
reads 1 before sending** — that number comes from the server's own audience query, and a silently
dropped filter shows up there as thousands.

### ⛔ Do NOT treat this send as a G40-426 AC#4 verification

**`F-037` is OPEN: "Tapping an Android push still does not open the right order" — shipped
knowingly 2026-09-05, confirmed on these exact release builds.** A session proposed using the
announcement push as a free confirmation of G40-426 AC#4 and **that was wrong**; it is already
known broken here.

✅ **RESOLVED 2026-09-07 — see the reconciliation note in §3. No handset was needed.** §3 appeared to
contradict this, recording G40-426 as *"closed — AC4 tap routing verified on the A50, build 905."*
**Both records are true**: they assert different success criteria, and the build-905 test record
says so itself — the tap *"moved the app from Available Requests to the Request tab,"* i.e. the
dashboard, which is what GO's only routing rule does. The fix is in
the release builds (`1464eeb47` → `release/android-866`; `933d0aa56` → `release/android-854` and
`release/ios-853`) and the native delivery chain is intact — but **`no_show_warning` in the Request
app is the only push in the product that opens a specific order.** GO's only rule sends an
`order.payout` tap to the dashboard, deliberately. So "AC4 tap routing verified" can be true while
F-037 is also true. **F-037 stays OPEN** — and it is understated: the claim is false on iOS too.

### ⚠️ 2026-09-07 observation — "the banner tap opened the app" proves NOTHING about routing

During the test above, tapping the Android push **opened the app with the inbox badge lit**. Do not
let that be read as AC#4 passing.

**Android launches the app from a notification by default, via the native content intent — with or
without `pushNotificationActionPerformed` firing in the JS layer.** See memory
`android-push-delivery-architecture`: that handler never fires on this stack. So "the app opened"
is entirely consistent with the handler being dead, and F-037 is about the **routing** failing, not
the tap being inert.

**Record it as "opens the app, routing unproven."** It neither confirms nor contradicts §3's
"AC4 verified on the A50, build 905" — the contradiction there is still open and still needs a real
handset with a deep-linkable payload.

Fine for this message, which has nothing to deep-link to. Not fine for anything that does.

---

## How this file ends

Delete it. When items 1 and 2 are done, this file has no reason to exist, and leaving it behind is
how a countdown list turns into a fossil that reads as current.
