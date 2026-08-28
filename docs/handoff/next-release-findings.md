# Findings for the NEXT release — capture log

Opened 2026-08-28 during owner's release-testing session. **Capture-first, ticket-after.** Capture phase closed 2026-08-28; see ticket mapping below.

**TICKETED 2026-08-28** into Jira sprint **John's Tickets** (id `677`, board 2, project G40).
All five are type **Bug**, status **To Do**, labelled `release-testing-2026-08`.

| ticket | covers | |
|---|---|---|
| **G40-420** | **F4b** — scheduling picker allows PAST dates | ⛔ functional; ranks first |
| **G40-421** | **F3** — iOS keyboard hides the entire support composer | ⛔ functional; support channel |
| **G40-422** | **F1a, F1b, F2a–d** — Gopher Go overlap/clipping (6 defects) | F1b carries mis-tap risk on an age-restricted decision |
| **G40-423** | **F4a** — Request scheduling picker Done overlaps Inbox tab | mis-tap navigates away mid-compose |
| **G40-424** | **F5a–c** — Favorite Gopher Referral: list buried, subject broken, needs layout pass | F5a may be a dead end |

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

**F5c — the screen has no coherent spacing system (owner: "overall poor UI").**
Beyond the two specific defects, the composition itself is the problem:
- the subject row is cramped against both the divider above and the text below
- the message bubble is wide and squared off against a narrow gutter, with a large empty gap under it
- the referral list is jammed into whatever vertical space is left, then covered
- the avatar and its TrustShield badge sit in a large empty band with no relationship to what follows

This is not a list of pixels to nudge — the screen needs laying out again with a consistent
spacing scale. Treat F5b/F5c as one design pass, not as separate tweaks.

⚠️ **Not yet checked on iOS.**

**Pattern — this is the FOURTH instance in one session** of a fixed/bottom-anchored element
covering content that the user needs (F1b, F2c, F4a, F5a). Four screens, two apps. This is no
longer a series of one-off layout bugs; it is a systemic problem with how bottom-anchored
controls are composed against scrollable content. Worth one deliberate look rather than four
patches.
