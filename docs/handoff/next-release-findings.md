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
