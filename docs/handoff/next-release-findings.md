# Findings for the NEXT release — capture log

Opened 2026-08-28 during owner's release-testing session. **Capture-first, ticket-after.** Capture phase closed 2026-08-28; see ticket mapping below.

**TICKETED 2026-08-28** into Jira sprint **John's Tickets** (id `677`, board 2, project G40).
All five are type **Bug**, status **To Do**, labelled `release-testing-2026-08`.

| ticket | covers | |
|---|---|---|
| **G40-420** | **F4b** — scheduling picker allows PAST dates | ⛔ functional; ranks first |
| **G40-421** | **F3 + F3b** — keyboard occlusion: **WIDENED 8/28 to the audit + shared fix** | ⛔ functional; 9th instance in 14 months, none ever swept |
| **G40-422** | **F1a, F1b, F2a–d** — Gopher Go overlap/clipping (6 defects) | F1b carries mis-tap risk on an age-restricted decision |
| **G40-423** | **F4a** — Request scheduling picker Done overlaps Inbox tab | mis-tap navigates away mid-compose |
| **G40-424** | **F5a–c** — Favorite Gopher Referral: list buried, subject broken, needs layout pass | **F5a + F5b SHIPPED 9/1**; **F5c WILL NOT DO** (owner 9/4) |

Grouped by repo rather than one-ticket-per-finding: the two apps are diverged forks, so tickets
spanning both create double work, and several findings are one fix.

**Each ticket points back at this doc.** Per the standing rule, the doc is the record and the
ticket dies with the fix — so update the finding here, not only the ticket.

**Why a doc first:** per the standing rule, the doc carries the canonical record and the ticket
references it — never the reverse. A finding written only into a ticket dies with the ticket.

## Context these findings arrived in

Builds under test, all published 2026-08-28:

| app | platform | build | where |
|---|---|---|---|
| Gopher Go | iOS | 13.9.1 (863) | TestFlight |
| Gopher Request | iOS | 13.9.1 (851) | TestFlight |
| Gopher Go | Android | 3.9.1 (864) | Play internal |
| Gopher Request | Android | 3.9.1 (852) | Play internal |

⚠️ **No OTA exists.** Everything captured here needs a store release to reach users, so these
findings are batched for the next build rather than shipped piecemeal.

---

## Findings

### F1 — Age-Restricted ID Confirmation screen: layout is broken in two places

**Where:** Age-Restricted ID Confirmation (TrustShield ID check), worker-side — the gopher
confirming the requester's ID at drop-off.
**Seen on:** Android, Galaxy A50 (1080×2340, Android 11), build 3.9.1. Screenshot in owner's
2026-08-28 test session.

**Two distinct layout defects, both visible in one screenshot:**

**F1a — Title collides with the Back control.**
"Age-Restricted ID Confirmation" wraps to two lines and the wrapped text runs **over/behind the
"← Back" link** at top-left. The subtitle then sits tight under it with no breathing room. The
header block reads as one jammed mass: title, subtitle and "Selfie of Gopher Inc" with no
separation.

**F1b — The "user not present" link is clipped by the confirm button. ⚠️ This is the worse one.**
The tappable text reads:

> "Tap here if user is not present at drop off location. We will notify them immediately
> via text."

…but **"via text" is cut off behind the green `ID And Identity Confirmed` button**, which
overlaps the third line. So:
- the instruction is unreadable at exactly the point it explains what happens
- part of the link's tap area is underneath the primary CTA — a worker aiming at the link may
  hit **Confirm** instead, which is the *opposite* action and is not reversible from this screen

That second point makes this more than cosmetic. The two controls it sits between are
"ID And Identity Confirmed" and "ID And Identity Not Confirmed" — an age-restricted delivery
decision. A mis-tap here has legal weight.

**Open question, not asserted as a defect:** the screen names the requester **"Gopher Inc"**
("Selfie of Gopher Inc", "verified ID of Gopher Inc") while the ID beneath reads
NEWBURY JOHN CHRISTOPHER. If that is just the owner's test-account display name, ignore it. If a
**company/business name can land in a field meant for the person whose face is being matched**,
that is a separate and more serious finding — the worker is being asked to match a face to a name
that is not a person's.

⚠️ **Check before fixing:** there are **two ID-capture components** in this codebase, and the two
apps are diverged forks. A layout fix here probably needs applying in more than one place — verify
rather than assume one edit covers it. See memory `two-id-capture-components`,
`check-every-consumer-before-changing-a-shared-value`.

⚠️ **Not yet checked on iOS.** Text wraps differently; the clipping may be better, worse, or absent.

### F2 — Gopher GO "Available" request list: four overlapping/clipping defects on one screen

**Where:** Gopher GO → **Available** tab (the worker's open-jobs list).
**Seen on:** Android, Galaxy A50, build 3.9.1 (864). Owner screenshot, 2026-08-28 10:10.

Four separate layout problems visible in a single viewport:

**F2a — Card title is sliced by the filter row.**
The first card's title ("Hourly / Day Labor") renders **cut horizontally**, with the top half
hidden behind the Active / Scheduled / Available chips. The list scrolls *under* the filter row
and the row has no opaque background, so card content bleeds through it. Every card title will do
this as it scrolls past.

**F2b — "Select My Gopher" label is truncated by the card edge.**
The label wraps to two lines and the second line is clipped mid-glyph — renders as
"Select My Gophe…". The icon row has insufficient height for a two-line label.

**F2c — Folder icon overlaps "Tap to view".**
The icon sits **on top of** the text, hiding a character — renders as "Tap ⌷o view". The two
elements are competing for the same horizontal space.

**F2d — The "Scheduled" pill crowds into the icon.**
The blue rounded pill ("Scheduled Aug 28th, 09:45 AM") extends far enough right that it runs into
the folder icon / "Tap to view" cluster, which is what forces F2c.

**Assessment:** F2a is the most visible — it affects *every* card on the most-used screen in the
worker app, and it looks broken rather than merely tight. F2b–d are one cluster: that header row
has more content than it has width, and nothing is reflowing.

⚠️ **Open question, possibly functional rather than cosmetic:** the card shows
**"Scheduled Aug 28th, 09:45 AM"** while the device clock reads **10:10** — a job whose scheduled
start passed 25 minutes ago is still sitting in **Available**. Either that is intended (the job
stays claimable after its start time) or stale jobs are not being aged out of the available feed.
Worth deciding deliberately; I am not asserting it is a bug.

⚠️ **Not yet checked on iOS.**

### F3 — iOS: the keyboard completely hides the support message composer ⚠️ FUNCTIONAL

**Where:** **More → Help Center → Message support → Send us a message** (the Intercom messenger).
**Platform:** **iOS** — Gopher Go, TestFlight 13.9.1 (863). Owner test, 2026-08-28.
**Android status:** not yet checked.

**Symptom, from two screenshots taken seconds apart:**

| keyboard up | keyboard dismissed |
|---|---|
| No composer visible **at all**. Screen shows the Intercom header, "Ask us anything, or share your feedback.", then blank white down to the keyboard. | Composer appears, containing the text that was typed blind: `Bdbdjsnnejxjdjdjdndhbb`, plus the attachment clip and the send arrow. |

So the text field, the attachment control **and the send button** are all underneath the keyboard
while typing. The user types with **zero visual feedback** — they cannot see their own message,
cannot proofread it, and cannot reach Send without first dismissing the keyboard.

**Why this one matters more than a layout nit:** this is the **support channel**. The person
using it is, by definition, already having a problem. Handing them a text box they cannot see is
the worst possible moment for a broken screen, and it will read as "this app is broken" rather
than "this screen is broken".

**Diagnosis — NOT established, candidates only:**
1. **Capacitor keyboard resize mode.** `@capacitor/keyboard@8.0.5` is in the build. If `resize` is
   `none`, or the webview does not resize on `keyboardWillShow`, bottom-anchored content stays
   under the keyboard. This is the classic Capacitor-on-iOS shape and the first thing to check.
2. **Intercom's own messenger** handling insets incorrectly inside the webview / when presented
   over it. If the messenger is Intercom's native SDK rather than web, our keyboard config is not
   the cause and the fix is elsewhere entirely.

**Determine which before writing any fix** — these have completely different remedies, and
guessing wrong burns a store cycle. Related: `@capacitor/keyboard` is *also* implicated in
Android's `Keyboard$1.onEnd` NPE (see the crash baseline), so the plugin is worth a proper look
rather than a patch.

⚠️ **Check the same path on Android** before ticketing — if it reproduces there too, it is one
ticket, not two.

**RESOLVED 2026-09-01, device-verified 2026-09-04 — root cause established, scoped fix merged, now confirmed on a real handset.**

**Root cause: ours, not Intercom's.** `@intercom/messenger-js-sdk` is the **web SDK** — the messenger
renders inside this app's own webview, so no native Intercom SDK is involved and this app's own
Capacitor keyboard config governs it. `capacitor.config.ts` sets `Keyboard.resize: "body"`, and the
plugin's own definition of that mode is explicit: only the CSS `body` element is resized — **the
viewport itself never changes**. Intercom's composer is bottom-anchored `position: fixed`, which
positions against the viewport, so a viewport that never moves leaves it under the keyboard. Android
was unaffected because `resizeOnFullScreen` resizes the Android webview by a separate, OS-level
mechanism (`windowSoftInputMode="adjustResize"`) that Capacitor's `resize` config doesn't even
control on that platform — confirmed by reading `@capacitor/keyboard`'s own Android implementation,
not assumed from the "iOS fails, Android is fine" symptom alone (Intercom ships separate iOS/Android
SDKs, so a native-SDK bug could just as easily have been one-sided).

⚠️ **Why the fix is NOT a global `resize: "native"` switch** — that is the obvious one-line change,
and it would break far more than it fixes: this codebase hard-codes `height: innerHeight` from a
**module-scope capture frozen at load**, across thousands of call sites in both apps. Under `"body"`
the viewport never changes, so those frozen values stay valid. Under `"native"` the webview actually
shrinks while the frozen values do not, so every keyboard-adjacent screen in both apps would lay out
against a height that no longer exists — a far larger blast radius than the one screen this finding
is about.

**The actual fix** (`src/intercom.ts`, `gopher-mobile-gopher`, merged `08ca974c0` → `production`
2026-09-01): switch to `resize: "native"` **only while the Intercom messenger is open**, reading and
restoring whatever mode was active before (not hardcoding back to `"body"`, so a future config
change isn't silently overridden) — restored on the messenger closing **and** on app pause, so a
crash or backgrounding mid-chat can't leave the whole app mis-laid-out for the rest of the session.
Guarded by `scripts/assert-intercom-keyboard-scope.mjs`, which is specifically built to fail if
someone later "simplifies" this back to the tempting global one-liner.

**Device-verified 2026-09-04**, closing the one gap the merge itself flagged as open ("NOT
device-verified" in its own commit message): real iPhone 15, current build. With the keyboard up on
the Message Support composer, the text field, attachment icon and Send button are all visible and
typed text is readable as entered — the exact inverse of the original two-screenshot repro (blank
white down to the keyboard, text typed blind). Screenshot on file.

**Still open, not covered by this fix:** the ticket this finding maps to (G40-421) was widened to
"audit every text input in both apps," which this fix does not do — it closes the one reported
screen (Intercom support composer, Gopher Go, iOS). Not yet verified: Android on a real device
(reasoning above is established from source, not handset-tested), the Gopher **Request** app's
equivalent surfaces, and the email-OTP "Not your email? Change it" screen named in the ticket title
(owner ruled 2026-08-28 this one is **not a blocker** for this release — see F3b below).

**UPDATE 2026-09-05 — Request app ported, CI guard gap found and fixed, real audit progress and
its real limits.**

- **Gopher Request app**: `intercom.ts` had never received this fix at all (confirmed: zero hits
  for `bindMessengerKeyboardFix` in the pre-fix file). Ported identically —
  `gopher-mobile-requester-capacitorjs` MR
  [!279](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/279),
  commit `1f868db2d`, CI green. **Built, not yet device-verified, not yet merged** — the phone
  test that would close this is the next thing this doc needs updated with a result.
- ⛔ **The CI guard was never actually a guard.** `scripts/assert-intercom-keyboard-scope.mjs`
  shipped with the original merge (`08ca974c0`) and passes cleanly when run by hand, but **neither
  app's `.gitlab-ci.yml` ever invoked it** — confirmed by grep, zero mentions of "intercom" in
  either pipeline config before today. A revert to the global `resize:"native"` one-liner this
  script exists to catch would have shipped clean through CI in both apps. Fixed in
  `gopher-mobile-gopher-capacitorjs` MR
  [!275](https://gitlab.com/gophergo/gopher-mobile-gopher-capacitorjs/-/merge_requests/275) and
  folded into Request's !279 — both add an `intercom-keyboard-scope-contract` job, no install step
  needed (the script imports only Node builtins). **Neither MR merged yet.**
- **AC3 ("ONE shared mechanism"), checked directly, not assumed:** both apps' `package.json` name
  is literally `"my-app"` — no shared package, no monorepo, no workspace. A real shared mechanism
  means standing up a new shared package and wiring both CI pipelines to consume it — infra work,
  not a same-morning fix. Worse than "not shared yet": **the codebase already has three
  independent, non-unified answers to this exact problem**, found by reading, not guessed:
    1. **Intercom messenger** (this finding) — toggles `Keyboard.setResizeMode` globally while open.
    2. **`InAppMessage.js`**, the apps' own requester↔Gopher chat composer — a completely separate,
       already-working fix from **G40-377**: tracks `keyboardHeight` via
       `Keyboard.addListener("keyboardWillShow"/"keyboardWillHide", ...)` locally in the component
       and sets `bottom: keyboardHeight + "px"` directly. Confirmed equivalent in both apps (diff is
       mostly unrelated feature drift — image attachments, permission handling — the keyboard logic
       itself, comment included, is line-for-line identical).
    3. **`CancelReasonSheet.js`** (G40-188, byte-identical in both apps) — a third technique again:
       no keyboard listener at all, just an "Other" textarea placed *above* the action buttons
       inside a scrolling sheet body, relying on the scroll to keep it clear. **This file's own
       header comment already names G40-421 by number**: *"When G40-421 lands its shared fix, this
       should adopt it rather than keep its own arrangement."* So this was a deliberate, reasoned
       placeholder left by whoever wrote G40-188 — not an unflagged bug — and it is exactly as
       device-unverified as the other two. Left alone rather than given a fourth bespoke arrangement
       under this morning's deadline.
  **Recommendation for owner sign-off:** accept per-repo duplication of a proven pattern as the
  answer for now (what exists), and treat "build one real shared mechanism" as its own follow-on
  infra ticket — not something to force into a same-morning close. This finding, not a shipped
  unification, is the AC3 deliverable the ticket itself allows for ("if a shared fix is genuinely
  not possible, that finding is itself the deliverable").
- ⚠️ **AC2 ("every text input enumerated"), attempted, and its methodology gap surfaced by the
  ticket's own named bug.** Grepped both apps for `position:fixed`/`position:absolute` combined
  with an input-like element in the same file — real counts: Go app 74 `<input>` + 16 `<textarea>`
  + 5 `<TextField>/<Field>` (95 total); Request app 75 + 14 + 5 (94 total). This surfaced
  `InAppMessage.js` and `CancelReasonSheet.js` above, plus several files not yet individually
  checked with the same rigor: `fileUpload.js`, `Orderdispute.js`, `multipleCheckBox.js`,
  `locationSearchInput.js` (both apps), `verifyotp.js` (Go only), `selectYes.js` (Request only).
  **But this method has a proven blind spot**: checked `pages/verifyEmail.js` — the exact
  email-OTP "Change it" field named in this ticket's own title, already owner-verified as broken
  on-device — and its input sits in **plain document flow, no `position:fixed` or `absolute`
  anywhere near it**. The occlusion there almost certainly comes from a *different* mechanism this
  grep cannot see: a fixed-height, non-scrolling screen container (computed from the same
  frozen-`innerHeight` pattern) leaving nothing for WebKit's native focus-scroll to scroll within —
  not viewport-pinned positioning at all. **A grep for `position:fixed/absolute` will structurally
  miss this class of bug wherever else it exists.** Concretely: AC2 as a fully rigorous
  "every input, both classes of risk checked" enumeration is not something this pass completed, and
  I don't think it's honestly completable by grep alone — it needs either device-testing each
  remaining screen or a slower per-component read of container/scroll CSS. Flagging the real state
  rather than reporting a clean sweep.

  **The six remaining candidates above have since been individually checked and cleared** — none
  match the occlusion shape: `fileUpload.js` and `Orderdispute.js`'s `position:absolute` hits are
  unrelated loading-spinner overlays, several lines from the nearest input; `multipleCheckBox.js`'s
  `<input>` is `type="checkbox"` (no keyboard involved at all); `locationSearchInput.js`'s absolute
  element is its autocomplete *suggestions dropdown*, not the input itself — a different, lower-
  priority risk (a keyboard could cover the suggestion list) not the same as covering the
  input/Send button, worth a follow-up note but not a fresh instance of this bug; `verifyotp.js`'s
  `bottom: 0` hits are `position: "relative"` (a no-op offset, not viewport-pinned) and its digit
  inputs sit in plain flow on a short, single-screen form; `selectYes.js` (Request) follows the
  same unrelated-absolute-spinner shape as the others. **This closes out the `position:fixed`/
  `absolute` sweep entirely** — the two real findings from it remain `InAppMessage.js` (already
  fixed, independently, via G40-377) and `CancelReasonSheet.js` (self-documented placeholder,
  unverified). The second failure class (fixed-height/no-scroll containers with in-flow inputs —
  the class the actual email-OTP bug belongs to) has not been swept at all; it isn't grep-able the
  same way and would need a slower pass or device time.

---

### F3b — ⛔ F3 IS THE NINTH INSTANCE. Nine tickets, fourteen months, not one sweep.

**Raised 2026-08-28 by the release-QA session (App/Play Store Release Notes) during D3 device
testing of G40-271 §B. Every row below verified against Jira on 2026-08-28 — status and date, not
transcribed from the report.**

Keyboard occlusion has been found, ticketed and closed **nine separate times**, and every single
one was fixed as a *single screen*. None was ever swept across the apps.

| ticket | date | screen | state |
|---|---|---|---|
| G40-36 | Jul 2025 | inputs during request creation | Done |
| G40-50 | Jul 2025 | debit/CC entry | Done |
| G40-233 | Dec 2025 | message input box | Done |
| G40-234 | Dec 2025 | Name/DOB/Email (Android) | Done |
| G40-236 | Dec 2025 | ↑ its regression | Canceled |
| G40-245 | Dec 2025 | iOS address entry, text not visible | Done |
| G40-252 | Jan 2026 | Android composer shifts out of view | Done |
| **G40-377** | Aug 2026 | iOS in-app composer — **carries the actual root cause** | Ready for Release |
| **G40-421** | **2026-08-28** | **support composer (F3, this doc)** | **To Do** |
| *(new)* | 2026-08-28 | **email-OTP "Not your email? Change it"** | see below |

**G40-377 already found the mechanism:** the safe-area inset was subtracted from `bottom`, pushing
the composer *down* rather than up. And ledger finding **F-011** records that G40-377's fix **did
not propagate to an adjacent screen** — so the handling is **per-screen, not global.** That is the
whole problem in one sentence: there is no shared solution, so each screen fails independently and
each fix buys exactly one screen.

**The tenth instance is the one that matters most.** On the email-OTP screen, tapping
*"Not your email? Change it"* reveals the address field and the keyboard covers it — owner:
*"completely blocked by the keyboard… a terrible experience."*

⚠️ **Every previous instance covered a field on a screen the user could LEAVE. This one covers the
only EXIT from the email-verification trap.** A user who mistypes their address cannot see the
field that corrects it, and therefore cannot get into the app at all. It is the door out of
G40-271, and the keyboard is standing in front of it.

**Owner ruling 2026-08-28: not a blocker** for this release.

**Repro accounts** (both `confirmed_at` NULL, so sign-in drops straight onto the email-OTP screen —
this is the **resume** path; initial signup was never broken, so testing a fresh signup gives a
**false pass**):

- **82271** — `johncnewbury+614@gmail.com`, +1 614 222 4444, roles [2,3]. Pending address carries a
  real typo: `johncnewbury+614@gmil.com`
- **84223** — `johncnewbury+gizelle@gophergo.io`, +1 618 232 3232, role [3], **no profile picture**

**Disposition — NO new ticket was raised, deliberately.** The standing owner directive of
2026-08-27 is *"complete the backlog, not add to it"* (`G40-418` was cancelled for exactly this).
Raising a tenth point-fix ticket would also be the precise mistake this finding is about. Instead
**G40-421 was widened from one screen to the audit + shared fix**, and linked to G40-377. This
doc is the record; the ticket is the disposable half.

**Related, owned elsewhere — do not absorb:** ledger **F-027** (this pattern) and **F-028** (back
from email-OTP on a picture-less account dead-ends on an empty profile; recovery was force-close —
owner: not a blocker) belong to the release-QA session and live in
`Dev/gopher-dev-handoff/release/TESTING-FINDINGS-LEDGER.html` @ `51e662e`.

### F4 — Android Request: the scheduling picker's "Done" button collides with the tab bar

**Where:** Gopher Request → new Grocery request → schedule (date/time picker).
**Platform:** **Android**, build 3.9.1 (852). Owner screenshot, status bar 9:56.

**F4a — "Done" is rendered on top of the "Inbox" tab. ⚠️ Same class as F1b.**
The picker sheet extends down over the bottom navigation bar. Its **Done** button and the
**Inbox** tab occupy the same pixels — "Done" renders as `D⌷ne` with the envelope icon showing
through it. The picker's last date row (30, 31, 1–5) sits directly on the tab strip, and the time
column's final entry (12:25 PM) is clipped by it.

Why it is more than ugly: **Done is the commit action for the schedule.** A near-miss hits
**Inbox**, which navigates away from the request being composed. Whether the in-progress request
survives that navigation is unknown and worth testing deliberately — if it does not, a mis-tap
costs the user everything they have entered.

This is the **third** instance tonight of a primary action overlapping another control (F1b, F2c,
F4a). Three separate screens, same failure shape: a bottom-anchored sheet or row that does not
account for what is beneath it. Worth considering whether these get one structural fix rather
than three patches.

**F4b — ⚠️ OPEN QUESTION, possibly serious, NOT asserted: are past dates selectable?**
In the screenshot, **23 is selected** (blue) and **23–27 are enabled** (black, tappable), while
everything up to 22 is greyed out. If this screenshot was taken on **28 August**, then five past
dates are selectable and one is pre-selected — meaning a user could schedule a request **in the
past**.

I cannot confirm this from the screenshot alone, because the capture date is not visible and this
testing session may span days. **Two possibilities:**
- The screenshot was taken on/around **23 August** → the picker is behaving correctly, ignore.
- It was taken **28 August** → past-date scheduling is possible, which is a **functional defect
  well above the UI issues in this log** and needs its own ticket.

**RESOLVED 2026-08-28 — owner confirms the screenshot was taken TODAY, 28 August.**

⛔ **F4b IS REAL. Past dates are selectable when scheduling a request.**
On 28 August the picker enables **23–27 August** and **pre-selects 23** — five days in the past,
with a past date as the default value. Everything up to 22 is correctly greyed, so a minimum-date
bound exists but is being computed wrong (note it lands exactly 5 days before "today", which may
be a clue — a stale or relative min-date rather than a missing one).

⚠️ **Verified only as far as the picker.** Past dates are *selectable*; whether a request actually
**submits and persists** with one is **NOT verified** — downstream validation may reject it. That
distinction changes severity substantially:
- rejected at submit → annoying dead end, medium
- accepted → a job exists that can never be fulfilled on time, and the requester was told it was
  scheduled. High.

**Next step before or alongside the fix:** actually submit one and see. That is a five-minute test
and it decides how hard this needs to be hit.

**RESOLVED 2026-09-04 — the five-minute test, and the fix, for real this time.**

**The severity question is answered: past dates WERE accepted and persisted.** Read
`controllers/order/create.js`, `update.js` and `re_schedule.js` in `gopher-backend-api` directly —
none of the three paths that can write `orders.request_schedule_time` (create, update, the Gopher's
reschedule proposal, the requester's reschedule acceptance) compared it to `Date.now()` anywhere. A
past `request_schedule_time` reaching any of them was copied straight into the DB and persisted.
**High**, per this finding's own severity table.

**Root cause on the client — one confirmed mechanism, one that could not be reproduced.**
`src/component/datetimepicker.js` (`gopher-mobile-requester-capacitorjs`) computes `minDate` and the
"no existing value" default fresh on every render (`moment().add(1, "hour")`) — that part was
already correct and unchanged since January 2026, so the exact 28-August reproduction (23–27
enabled, 23 pre-selected) could not be reproduced from current code alone; device clock skew on the
test handset is a plausible, unfalsifiable candidate. **What WAS a confirmed, live bug**, diffed
directly against the Gopher app's copy of the same component: this app's picker seeds its initial
`value` from `props.formik.values?.request_schedule_time` **whenever that field is truthy, with no
check that it is still in the future** — a pre-existing form value (this app's own
`RequestDetailPullOver` reschedule sheet hands the picker one; any future draft-resume path would
too) becomes the picker's silent default, and an effect a few lines down writes it straight back
into the form on the very next render, no interaction required. The Gopher app's fork of this exact
file has no such branch — it always defaults to `moment().add(1, "hour")` — which is why this is a
Request-only defect (see AC5 below).

**Fixed, both ends, defense in depth — the server fix is the one that actually closes the hole:**

- **Server (`gopher-backend-api`, MR pending):** new `helpers/validate_schedule_time.js`, one
  definition, wired into all four write sites — `create.js`, `update.js`'s `update_v2`,
  `re_schedule.js`'s `request_reschedule` (the Gopher's proposal) AND `accept_reschedule` (the
  requester's acceptance — re-validated separately, because a proposal that was future-dated when
  raised can go stale before it's accepted). Rejects with a 400 (410 on a stale accept, since that
  proposal was valid when made) before any Stripe side effect. This is the fix that matters
  regardless of the client mechanism: it closes the hole for a skewed device clock, a tampered
  request, or any client bug not yet found, not just this one.
- **Client (`gopher-mobile-requester-capacitorjs`, MR pending):** the stale-seed branch above,
  fixed — a pre-existing `request_schedule_time` is only honoured if it is still in the future;
  otherwise the picker falls back to the same safe default used when there is no existing value.

**AC4 — same-day past times: already handled correctly, now documented as a deliberate decision.**
`filterTime={filterPassedTime}` requires the selected time to be more than **one hour** from the
moment of selection, uniformly — so 09:00 is never selectable at 14:00 on the same day, and neither
is 14:30 (inside the one-hour buffer). No separate same-day rule was needed; this is the existing
lead-time rule doing double duty, confirmed by reading it rather than assumed.

**AC5 — verified rather than assumed, per this finding's own warning that the two apps are diverged
forks:** `gopher-mobile-gopher` (the Go app) carries its own copy of `datetimepicker.js`, diffed
directly against the Request app's — confirmed simpler (no stale-seed branch) and not vulnerable to
this specific defect, so no client fix was needed there. Both apps build against ONE JS bundle each
via Capacitor (not separate Android/iOS source), so the Request-side client fix covers both
platforms by construction — not verified on a physical device or simulator this round; build-verified
only (`react-scripts build`, compiled clean, zero new warnings). **On-device confirmation on both
platforms is still owed before this closes.**

### F5 — Favorite Gopher Referral: the referred gophers are hidden behind the action buttons ⚠️ POSSIBLE DEAD END

**Where:** Gopher **Request** → Inbox → "You Have A Favorite Gopher Referral" message.
**Platform:** Android, build 3.9.1 (852). Owner screenshot, status bar 3:55.

**F5a — ⚠️ the list of referred gophers is unreachable behind the fixed buttons.**
Below the message body the screen shows a **Select All** checkbox, then the first referral row —
**"Ryan Newbury"** — **sliced horizontally**: half the avatar, half the name, half the checkbox.
Everything below that is covered by the fixed **Accept Referrals** / **Decline** buttons.

**Why this may be a functional dead end, not a layout nit:**
Both buttons render **greyed out / disabled** — presumably because no gopher is selected yet. But
the per-gopher checkboxes are exactly what is buried under those buttons. If the list does not
scroll independently, the user **cannot select anyone, so cannot enable the buttons, so cannot
action the referral at all.**

⚠️ **NOT VERIFIED: does the list scroll behind the fixed buttons?** A screenshot cannot show this.
- Scrolls → bad layout, recoverable, medium
- Does not scroll → the referral flow is **unusable** on this screen size. High.

**Test that first.** It is one swipe and it decides the severity.

> ### ✅ ANSWERED, then FIXED — owner on device 2026-09-01: *"There was no ability to scroll at all."*
>
> **So this was the HIGH branch: a genuine dead end.** A referral arrived in the Inbox, the user
> opened it, and no sequence of taps could accept or decline it.
>
> **Root cause was one missing property, not a sizing mistake.** `SupportMessage.js` declared
> `overflowY: "auto"` with **no height bound** — `overflow-y` with nothing to overflow *does
> nothing*, because the element simply grows to fit its content, so a scrollbar can never exist.
> Fixed in **`dbfc088a2`**.
>
> **A second, different bug surfaced immediately after** (owner: *"I can tap it but it's poor UI.
> I just need a little more room."*): the space reserved for the fixed buttons was expressed as a
> **percentage**, while the button stack it had to clear is anchored in **px** — a unit mismatch,
> so the reservation drifted with viewport height instead of tracking the thing it was clearing.
> Fixed in **`f24492247`**. Both merged to `production` via **`4e6359952`**.
>
> ⚠️ **AC3 is NOT closed by this.** Making the rows reachable does not address the ticket's sharper
> point below — **Select All** remains the easiest control to hit, so the path of least resistance
> is still to accept every referral without seeing who they are. That is a design decision, and it
> is still open.

**Second-order problem even if it does scroll:** **Select All** *is* reachable while the individual
rows are not. So the path of least resistance is to accept **every** referral without being able to
see who they are. Favorite Gophers affect who gets offered work — accepting blind is not a neutral
outcome.

**F5b — the subject row is broken, and it is the first thing the eye lands on.**
The subject reads **"You Have A Favorite Gopher Referra"** on line one with the final **"l"
orphaned onto line two by itself**. Beside it, the **"Subject:" label sits stranded** — its
baseline aligns with the orphaned "l", not with the first line of the value it labels, so the two
elements read as unrelated.

Three things are wrong at once in that one row:
- the value column is too narrow, so a 35-character subject cannot fit and wraps by one character
- the label is baseline-aligned to the wrong line
- there is no padding between the value and the right edge

The net effect is that the **headline of the message looks like a rendering failure**. Owner's
words: *"look at subject"* — it is the most visible defect on the screen even though F5a is the
more consequential one.

> ### ✅ FIXED 2026-09-01 — `f33d1b54`, merged to `production` via `f43a147d`
>
> **Shortened to "Favorite Gopher Referral"** on the owner's instruction, rather than widening the
> column. The value column is **shared by every inbox message type**, so widening it to fit this
> one 35-character title would have re-laid-out all of them. The title is computed per query, not
> stored, so existing messages picked it up with **no migration**.
>
> ⚠️ **The same user-facing string lived in two places and had already drifted** — `"You have A"`
> in the push notification against `"You Have A"` in the inbox query. Changing one and not the
> other would have left a push and the message it opens disagreeing. Both were changed together.

**F5c — the screen has no coherent spacing system (owner: "overall poor UI").**
Beyond the two specific defects, the composition itself is the problem:
- the subject row is cramped against both the divider above and the text below
- the message bubble is wide and squared off against a narrow gutter, with a large empty gap under it
- the referral list is jammed into whatever vertical space is left, then covered
- the avatar and its TrustShield badge sit in a large empty band with no relationship to what follows

This is not a list of pixels to nudge — the screen needs laying out again with a consistent
spacing scale. Treat F5b/F5c as one design pass, not as separate tweaks.

> ### ⛔ CLOSED — WILL NOT DO. Owner ruling 2026-09-04, verbatim:
> ### *"dont change the existing layout, that was not the issue"*
>
> **F5c is retired, and AC5 with it.** The defect on this screen was the **dead end** — the list
> could not scroll, so the checkboxes that enable Accept/Decline were unreachable. That is fixed
> (F5a). The spacing observations below stand as a description of what was seen on 2026-08-28;
> they are **not** a work item, and the screen is not to be re-laid-out.
>
> ⚠️ **Do not re-raise this.** The "overall poor UI" note in the original finding reads like an
> open invitation to a design pass; the owner has now explicitly declined one. Same shape as the
> scrim and white-on-green sweeps — the observation being fair is not a licence to act on it.
>
> **One latent risk is deliberately being left alone**, because fixing it would mean touching the
> layout: the F5a clearance is a hand-computed `marginBottom: "180px"` (65 + 90 + 25) that
> duplicates the button stack's height, so adding a third button or wrapping a label silently
> re-breaks it. Recorded in `bottom-anchored-controls-audit.md`; not actioned.

⚠️ **Not yet checked on iOS** — AC6 remains open for the whole of G40-424, and is gated on an
Appflow build (in progress 2026-09-04). Everything shipped so far is build/test-verified only.

**Pattern — this is the FOURTH instance in one session** of a fixed/bottom-anchored element
covering content that the user needs (F1b, F2c, F4a, F5a). Four screens, two apps. This is no
longer a series of one-off layout bugs; it is a systemic problem with how bottom-anchored
controls are composed against scrollable content. Worth one deliberate look rather than four
patches.

---

## Ruling — the no-show gate is ONE feature, and G40-419 governs it (2026-08-28)

**G40-192 and G40-419 specced the same no-show payout gate with different numbers.** Consolidated
under one owner on 2026-08-28. Recorded here because the ruling must outlive both tickets.

| rule | G40-192 (older) | ⭐ GOVERNING — G40-419 |
|---|---|---|
| Distance threshold | 50 feet | a **distinct, tighter no-show constant**, explicitly not `FRAUD_COMPLETION_DIST_M` |
| Payout hold | 24 hours | **48 h auto-release, or manual sooner** |
| Fraud alert | on no-show submit | **immediately at tap time, inside `gopher_reached`** |
| Requester ack | **blocking precondition** | ⛔ **flag, do not block** |

**G40-192 keeps only what it uniquely owns** — the age-restricted completion flow (TrustShield vs
on-site ID capture, completion popup + Do-Not-Show-Again GPS log, the 10-minute timer, Confirmation
Pending, admin manual complete).

### ⛔ Why the ack-gate had to go — the deadlock

G40-192 required the requester to **acknowledge the timer before a no-show could be submitted**. The
acknowledgment surface is the red `!! ACTION NEEDED !!` countdown banner — and **F-030 proves that
banner has never rendered** (order 64913, 2026-08-28, Android build 852 *which contains it*; push,
SMS and email all delivered, banner absent even after force-close; backend ruled out live). Evidence
lives in the release-QA ledger, `gopher-dev-handoff/release/TESTING-FINDINGS-LEDGER.html` → **F-030**.

Built as specced, the chain is:

> banner never renders → requester can never acknowledge → **no Gopher can ever submit a no-show** →
> the job cannot complete → **the worker is not paid**

A fraud control becomes a payout outage. **"Flag, don't block" is not the softer option here — it is
the one that does not strand workers.**

### Two defects this feature cannot ship without

1. **The banner render itself.** Suspect *(not cause)*: `NoShowWatcher` bails unless
   `localStorage.activeRequest` is set, a key written in exactly one place —
   `locationPermission.js` inside `fetchActiveRequest()`. Settle it by reading that key on the
   handset during a live no-show window; a debuggable build or WebView inspect, **not another test
   order**.
2. **The client ignores `requestor_reminded_seconds_remaining`.** The backend added it because the
   app computes the deadline from the **device clock**, so a skewed clock reads "window passed" the
   instant the banner appears. Backend half shipped; client half never did.

### ⚠️ The no-show control exists ONLY in the age-restricted flow

`ordercard.js` gates it on `props.state.request["age_restricted?"]`. On a standard order **there is
no button to tap** — owner confirms this is expected. So G40-419's client pop-up physically lives
inside G40-192's screen, and **a no-show cannot be tested on a standard order.** The earlier
"testable on any order type" was true of the backend and false of the client, and it burned a live
test order.

**Generalisable lesson, worth keeping:** *"the API allows it" is not "the user can do it."*
