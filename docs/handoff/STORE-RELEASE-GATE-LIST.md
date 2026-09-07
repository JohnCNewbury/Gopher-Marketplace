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

### ✅ Step 1 DONE 2026-09-06 — rebased, verified, pushed. Only the merge remains.

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

### Remaining steps

1. Decide the MR pointer (above), then merge — **target `production` · squash NO · delete source NO**.
2. Close **G40-415 AC 6**.

✅ **AC 5 is NOT open — corrected 2026-09-05.** It was already satisfied on 2026-08-29 by
`c67c482aa` (an ancestor of `production`): `src/helpers/validation.js` no longer exists in the
requester app and `validateRequire` has **zero occurrences** anywhere in the repo. The ticket's
2026-09-01 comment said otherwise and was stale; that stale line is what made this look open, and
it was repeated here before being checked. **G40-415 is down to AC 6 alone.**

⚠️ The identical dead file **does** still exist one repo over, in `gopher-mobile-gopher`
(`src/helpers/validation.js`, 0 importers). Out of scope, flagged not fixed, and deliberately
left until the current release is out of the way.

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

⚠️ **The credit balance is the clock and the last reading is stale.** 147 credits on 2026-08-29 at
~11.8/day projects to exhaustion around **10 September** — i.e. possibly already gone. Re-read from
**Finance → Identification**, never the Overview, which renders `used / limit` and has already been
misread once as `remaining / total`, wrong by a factor of twenty.

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
| G40-426 | ✅ closed — AC4 tap routing verified on the A50, build 905 |
| G40-420 | ✅ closed — device-verified both platforms |

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

⚠️ **§3 of this file contradicts that** — it records G40-426 as *"closed — AC4 tap routing verified
on the A50, build 905."* Both cannot describe the same thing. **Flagged, not resolved:** build 905
may not be the release build, or the verification may not have held. **F-037 is the later and more
specific finding and it is marked OPEN**, so treat Android push tap as broken until someone
reconciles the two on a real handset.

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
