# Findings for the NEXT release — capture log

Opened 2026-08-28 during owner's release-testing session. **Capture first, ticket later** —
the owner is sending findings one at a time and will decide ticketing when the list is complete.

**Destination when we ticket:** Jira sprint **"John's Tickets"**.

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
