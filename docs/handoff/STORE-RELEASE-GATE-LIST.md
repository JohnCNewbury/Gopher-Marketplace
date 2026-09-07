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

### ✅ RE-MEASURED 2026-09-06 — the coverage gap is **ONE ROW**, not 122

The "122 of 7,004" figure above was superseded the next day by a direct measurement against the
production **reader** (`pg_is_in_recovery = true`; control query returned 61,598 `role_id=2` rows
against the runbook's 61,463 baseline, so the probe was real).

| | |
|---|---|
| distinct `scan_ref` prefixes under `uploads/trustshield/` in S3 | **6,937** |
| APPROVED holders carrying a vendor `scan_ref` | **6,915** |
| …mirrored | **6,914** |
| …**not mirrored** | **1** |
| APPROVED with internal capture (nothing to mirror) | 9 |

**And the single gap was that night's newest verification** — `id=17682`, `user_id=143556`,
`updated_on 2026-09-07 00:03:48`, the most recent APPROVED row in the whole table. Nobody had
viewed that holder's ID yet.

**That confirms the mechanism rather than revealing a backlog:** the write-through backfill fires
**on first view**, so the gap is a rolling window of one or two of the newest verifications, never
an accumulation. The images are effectively already ours.

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

Fine for this message, which has nothing to deep-link to. Not fine for anything that does.

---

## How this file ends

Delete it. When items 1 and 2 are done, this file has no reason to exist, and leaving it behind is
how a countdown list turns into a fossil that reads as current.
