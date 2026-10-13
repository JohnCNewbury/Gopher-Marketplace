# Messaging guard — AS-BUILT (production)

_Written 2026-10-12 (state as of 2026-10-11). This is the **as-built** record for the server and HQ half of
G40-598 (precheck, flag stamp, real-time alert) and G40-599 (conversation block, HQ review). The **spec** is
`docs/handoff/messaging-precheck.md`; where the spec's 2026-10-08 "update 2" differs from this file, **this file
is what is live in production**. Tickets track the work; this file records what the product does._

## Live

- **Backend MRs merged to `production`** (times ET, from GitLab):
  !704 (10/8 8:01 AM), !705 (10/8 8:06 AM), !706 (10/8 8:39 AM), !708 (10/9 9:43 AM), !710 (10/9 10:41 AM),
  !712 (10/9 11:35 AM), !713 (10/9 12:05 PM), !714 (10/9 12:14 PM, owner rulings R1–R3), !715 (10/9 1:07 PM, hotfix).
- **`CONVERSATION_BLOCK` is ON** in production, since about 10/9 12:35 PM ET (the owner ran the Elastic Beanstalk
  change at 12:32 PM).
- **HQ Dashboard, Listen → Message Review:** a Blocked conversations card (Read the thread, Clear, Confirm), a Hidden
  messages card (Release), then the usual alerts list. Owner-only actions, audited.

## Rules as shipped (owner rulings R1–R3, 2026-10-09)

| Case | What happens |
|---|---|
| **Payment / circumvention** message, on any order, hired or not | The text is **hidden from the recipient**. If the sender's app showed the pre-send warning first, the **conversation is also blocked for both people** until HQ reviews it. An **unwarned** send (every installed build today) is hidden but **not blocked**. |
| **Contact** (phone / email / social) **before hire** | Hidden from the recipient. The chat **stays open**. Never blocks. |
| **Contact after hire** | Allowed (the scorer skips the contact category once a worker has accepted). |
| A **hidden message after hire** | **Stays hidden** until HQ releases it (owner 10/9, "keep hidden"). |

- The recipient sees the placeholder text **"Message hidden for review"**. It is always a **string, never `null`**
  (!715: installed apps crash on `null`). The sender and HQ keep the real text.
- **HQ outcomes:** **Clear** lifts the block and releases the message. **Confirm** keeps the block active and the
  message hidden (a confirmed block can still be cleared; a cleared one cannot be confirmed). **Release** frees a hidden
  message that has no block.
- **Contract for the apps:** the chat history response carries a sibling `blocked: { blocked, blocked_user_id, since,
  review }` beside `data` (`data` is never reshaped). Socket events `conversationBlocked` and `conversationReview` are
  fire-and-forget; the history response is the source of truth.
- Fails open throughout: a failure of the guard never costs a clean message.

## Differences from the spec's 2026-10-08 update 2

1. Applies **hired or not**, not "submitted (unaccepted) orders only".
2. Blocks **both people**, not only the sender.
3. The message is **hidden** from the recipient, not "delivered flagged".
4. The recipient sees **"Message hidden for review"**, not "This message is currently flagged and under review".
5. HQ review has a **Confirm** outcome (new).

## Not live yet

- The **pre-send warning in the apps** (Edit message / Send as-is) is **G40-399**. It is merged in the app repos; **this
  record does not verify that any store build contains it.** Until a build with the warning is in users' hands, no real
  conversation is blocked, because a block needs the sender's app to report it showed the warning.
- The apps should **refetch an open chat when the socket reconnects or the app resumes** (**G40-596**), because the
  block events can be missed while a phone's socket is down.

## Evidence

- **Verified first-hand:** MR numbers and merge times (GitLab, 2026-10-11); production behaviour on **order 66293,
  2026-10-10** (a payment-and-contact message was hidden from the recipient, no conversation block, as designed for an
  unwarned send).
- **Inherited, not re-verified here:** that `CONVERSATION_BLOCK` is still set to on today (read from Elastic Beanstalk
  on 10/9), and the HQ screen behaviour (checked on 10/9 and 10/10).

## Tracking

G40-598 and G40-599 are **In Progress**. They are Done when the apps ship and the warning reaches users, not at merge.
