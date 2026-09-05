# G40-39 — handoff to a fresh session, 2026-09-05

**Read this, then [`G40-39-completion-flow.md`](G40-39-completion-flow.md).** Written at the end of a
long session, deliberately, because the previous session's context was ~79% full and its judgement
had started to slip. Everything below is verified against merged `production` or against live
`order_logs` — not recalled.

---

## The one-line state

**All three are closed on live orders as of 2026-09-05 05:28 EDT.** The notification half (65185),
the screen half (**65198**, on a local build of `next` carrying !278 — see the completion-flow
doc's "2026-09-05 (morning)" section), and the rating prompt (65198, single-device gopher 31677,
prompt delivered and used). What remains is store-gated: the release carrying `3a28f1c21`,
`18cb0de0f`, `b6530ac39`, then the App Store scenario check and the staged 101 copy.

---

## ✅ Done, deployed, proven — do NOT redo any of this

**Order 65185 (2026-09-04, live, non-A/R Delivery, gopher=1, requester=test account 141548) is the
proof.** ⚠️ Corrected 2026-09-04 evening: the times below were first written as "ET" but were
UTC; these are **EDT**, read back from `order_logs` and the production log.

| Time (EDT) | Event |
|---|---|
| 18:31:04 | Order Completed |
| **18:31:09** | Requester's confirm screen already polling for photos — **+5s** (this is OPEN #1) |
| 18:32:34 | Gopher added 1 completion photo — **+90s** |
| **18:32:35** | **Requester notified to confirm** — **1s after the photo** |
| 18:34:02 | Gopher skipped the photo step (owner went back and also tapped Skip) |
| 18:34:06 | Requester Confirmed |
| 18:34:09 | Payout done; `rateYourRequestor` **emitted to socket `eqzzeaZMjkwwjjqMAAKb`** (this is OPEN #2) |

Two things that timeline proves: the notification **waited 90 seconds** for the photo, and the later
skip did **not** re-notify — the one-shot marker held.

**Merged and content-verified:**

| Repo | Merge | What |
|---|---|---|
| `gopher-backend-api` | `2524bba3` | Notification deferred to photo-step resolution; `skip` endpoint; one-shot marker; `mark_notified` on the inline push |
| `gopher-mobile-gopher` | `63c963ef5` | Client sends `defer_completion_notify`; skip signals the server |
| `gopher-mobile-gopher` | `a0212eec` | Requester request-creation removed from the worker app; Done → job list |
| `gopher-mobile-request` | (earlier) | `CompletionPhotosSection` on `Orderdispute.js` |

⚠️ **The backend AUTO-DEPLOYS on merge to `production`** (CodePipeline → Elastic Beanstalk).
`2524bba3` deployed and was verified Succeeded. Treat a backend merge as a deploy.

---

## ⛔ OPEN #1 — the confirm/dispute SCREEN fires early (the actual remaining bug)

**This is not the notification.** The owner proved it live: the confirm/dispute screen was already up
on the requester's phone while the Gopher had not yet taken the photo, and the *banner* only arrived
when the photo was submitted.

**Mechanism:** the requester app renders that screen from **order state**. The moment the order flips
to `delivered`, an app already open on that order shows the confirm view. Gating the push does
nothing about it.

⚠️ **The previous session got this wrong and cost the owner a live order.** He reported, on the first
run, that the requester got "the confirm/dispute notification **and** screen transition" — two
things. The session fixed the notification and then told him the requester "can't act on
confirm/dispute until the pics are there," which was false. **Do not repeat that: the notification
and the screen are separate paths.**

**⛔ BLOCKED ON AN OWNER DECISION — ask before building.** When the photo step is unresolved, should
the requester:

- **(a)** not reach the confirm screen at all yet, or
- **(b)** reach it with **Confirm disabled** and a "your Gopher is adding photos…" state, Dispute
  still available?

They are different fixes. The owner has been asked twice and it has not been answered yet.

**The signal already exists server-side.** The `order_logs` note
`Requester notified to confirm completion` means the photo step is resolved (photos in, or
deliberately skipped). Exposing that on the order read the confirm screen already polls
(`GET /orders/order_log/:id`) is the natural mechanism — no new state needed.

**✅ 2026-09-04 evening — mechanism proven, OWNER RULED (option a, no timeout), BOTH HALVES
BUILT.** The log shows the requester's confirm screen polling `order_log` from **+5s**; the path is
`requestOrder.js` (poll → `/request` on `delivered`) → `requestHeader.js` red card tap →
`startDispute` → `Orderdispute.js`, and nothing on it consulted the photo step.
- **`gopher-backend-api` MR !495 — MERGED to `production` `5813d416`, 19:55 EDT, LIVE** —
  `photo_step_resolved` on `GET /orders/:id` (while delivered), `GET /orders/order_log/:id`, and per
  delivered row on `GET /orders/v3` (requester lists). Not squashed, source kept, content-verified.
- **`gopher-mobile-requester-capacitorjs` MR !278 — MERGED to `next` `9b595b414`, 19:55 EDT** —
  the screen waits: tracking screen holds, list card stays green and its tap opens the order view,
  both confirm screens bounce back if reached early. Strict `=== false`, so it reads !495's field.
  Not squashed, source kept, content-verified. Store-gated. **Device-verified 2026-09-05 on order
  65198** (iPhone 12, local build 13.9.1 (603); 30 order polls and zero confirm-screen polls across
  the 73 s before the photo). `next` is 2 commits ahead of `production`; intended, do not "fix" it.
- Owner, verbatim, on the no-timer consequence: *"if the gopher doesn't skip or submit pics,
  nothing is triggered, so their screen still shows items picked up."* Do not add a fail-open.
Full write-up: [`G40-39-completion-flow.md`](G40-39-completion-flow.md), section
"2026-09-04 (evening)" and "Owner rulings".

---

## ⛔ OPEN #2 — no rating prompt on the Go app after confirmation

Owner reported it on order 65185. **CLOSED 2026-09-04 evening.** Owner: *"i already rated it by
going into the request history and tapping the all red gopher holes representing the rating was
still needed"* — the Scenario 5 catch-all worked. Root cause below; the verified/inferred split is
in [`G40-39-completion-flow.md`](G40-39-completion-flow.md), section "2026-09-04 (evening)".

- ✅ **The server delivered it.** `ratings` has **no** gopher-side row for 65185 (only the requester
  rating the Gopher), so the guard passed; the log shows `Sending rateYourRequestor` **and then
  `EMITTING TO SOCKET ID: eqzzeaZMjkwwjjqMAAKb`** at 18:34:09 EDT. That is the success branch, which
  is why no `pending_notifications` row exists. ⚠️ Filtering the log on `"65185"` hides the EMITTING
  line — it carries no order id.
- ✅ **The registered device was not the Samsung.** The backend keeps **one** socket per
  `(user, gopher)` (replaced on every connect) and **one** `fcm_token`/`device_type`/`app_version`
  per role (stamped at sign-in). `users_roles` for user 1 / gopher reads **`ios, 99.0.0(31)`** — the
  iPhone 15's "NOT ours" build in the table below. The Payday push went to that token.
- ✅ **Proven (after `aws login`, 19:50 EDT):** socket `eqzzeaZMjkwwjjqMAAKb` was registered for
  gopher 1 at **18:24:47 EDT** by a connect-replace-connect within one second (the iOS resume
  reconnect; Android never reconnects on resume), stayed registered through the emit, and
  **disconnected at 19:01:51 EDT while the Samsung's Go app was in the foreground until after
  19:30**. An iOS Go app also fetched `mobile-config` at the emit second. The Samsung's socket had
  been displaced from the one-slot registry at 18:24:47. Which iPhone, the server cannot say.
- **Not a product defect for a one-phone worker.** It is the shared test account on three handsets.
  Secondary weakness (report, don't fix): multi-device accounts get confirm-time events on one device
  only, and the `pending_alert` drain also emits to the registry's socket, not the caller's.
- **To close:** open the iPhone 15's Go app and look for the 65185 rating / Payday banner, or check
  the Samsung's history card for 65185 shows "Rate now →". Then re-run a confirm with the gopher
  account signed into **one** Go device. If it still shows nothing then, look at the client pipeline
  (`bottomMenu.js` → `pendingAlertKey` → `fireAlert` → `grating`), which reads sound but has not
  been exercised single-device since G40-331 shipped.

**Still true from before — do not re-investigate:**
- ❌ *Not* the Done-button change. `/form` **does** mount `<BottomMenu />` (`renderForm.js:1253`),
  which owns the `rateYourRequestor` socket listener, and the completion screens do not set
  `hideBottom`.
- ⚠️ The `ratings` table has **no `created_at`** and uses `rated_id`, not `ratee_id`; `order_logs`
  uses `created_at`, not `created_on`; `users_roles` has no `updated_at`; there is no
  `order_notification` table on production.

---

## Device state — all three rebuilt and verified 2026-09-05

| Device | Go app | Requester app |
|---|---|---|
| Samsung A50 `R58N22N8QSM` | ⚠️ 3.9.1 **(904)** — local build of G40-422 branch (MR !276), installed 2026-09-05 06:38 EDT; NOT `production` | 3.9.1 **(902)** |
| iPhone 12 Pro `92BE0D3B-…` | 13.9.1 **(34)** — Go signed OUT 2026-09-05 | 13.9.1 **(603)** — carries !278, installed 2026-09-05 04:52 EDT |
| iPhone 15 Pro Max `4FE8ACA1-…` | ⚠️ **99.0.0 (31) — NOT ours** | 13.9.1 **(602)** |

- **Build number is the only reliable marker.** `versionName` is unchanged at 13.9.1/3.9.1 across
  old and new builds, so it cannot tell a stale binary from a current one.
- ⚠️ **Another session (or the owner) installed `99.0.0 (31)` on the iPhone 15's Go app.** Left alone
  deliberately — overwriting could destroy someone else's in-flight test. Ask before touching it.
  **And it is the device the server currently treats as gopher 1's phone** (`users_roles`:
  `ios, 99.0.0(31)`) — see OPEN #2. As of 19:35 EDT the iPhone 15 is not attached to the Mac.
- The owner's working pair is **Samsung = Gopher, iPhone 12 = Requester**. ⚠️ The Samsung's Go app
  is signed in as **31677 ("Gopher, Inc")**, not user 1 — read from its web storage 2026-09-05. Its
  `users_roles` row is `android 3.9.1(902)`. User 1 remains registered to the iPhone 15.
- ⛔ **Before any confirm-time device test, sign the gopher account into ONE Go device** — or read
  `users_roles.device_type / app_version` for that user and check it names the phone in hand. The
  rating prompt, DisputeResolved, favorite congrats and the Payday push all go to that one device.

---

## Traps that cost real time last session

- ⛔ **Never conclude from a grep of a minified bundle.** Three false negatives, each briefly believed.
  A zero that also comes back zero for a known-present string means the pattern is broken. Always run
  the same grep against a case you *know* is present before trusting a zero.
- ⛔ **Whole-file `indexOf` in a file with more than one writer.** Broke the same assertion twice —
  matched `already_notified`'s lookup, then `mark_notified`'s create. Scope to the function body.
- ⛔ **Branch-green is not proof.** The double-notify defect passed every branch test and was caught
  only by verifying the **merge**. Verify merged `production`, not your branch.
- ⛔ **`git checkout -- <file>` in a worktree reverts your own uncommitted work**, not just a test
  mutation. Cost a confusing red run.
- ⚠️ `JAVA_HOME` is `~/.local/opt/jdk21/Contents/Home`; `/usr/libexec/java_home` cannot find it.
  Don't set `JAVA_HOME` — the ambient one is correct.
- ⚠️ CI runs `eslint .` **and** `prettier . --check` as separate steps. Run both.
- ⚠️ Adding a `logger.error` in `helpers/` trips the alert-marker ratchet — register it in
  `docs/alert-markers.json` and raise the baseline in `test/alert-marker-manifest.test.js`.

## Still owed beyond the two open items

- **101 guide copy** — written, paste-ready, in
  [`G40-39-101-guide-copy-STAGED.md`](G40-39-101-guide-copy-STAGED.md). ⛔ Staged **outside `Final/`
  on purpose**; must not ship before a store release carries the fixes.
- **The original seven scenarios on the App Store build** — blocked on a store release.

---

## Observed 2026-09-05 ~05:10 EDT during the !278 device test — OUTSIDE G40-39, report don't fix

Logged at the owner's request. **Observed by the owner on device AND corroborated by the server's
own `order_logs` for order 65198** (read live from the production reader). The *why* is not yet
read in code.

**Server record, order 65198** (`notify_fav_gopher = true`, `selectgopher = true`, one
`notify_first_orders` row = the hand-pick; Delivery / General Errand; not age-restricted), EDT:

| Time | `order_logs.notes` |
|---|---|
| 05:04:16.620 | Order Created (Delivery-General Errand) |
| 05:04:30.768 | **Order Accepted by Fav- Gopher#31677** |
| 05:04:33.609 | **Order Assigned to Fav Gopher#31677** |
| 05:04:34.011 | AUTH LIFECYCLE: authorization holding $14.25 |

**Accept → Assign is 2.84 s apart, as two separate writes.** That gap is the owner's 2–3 s
window exactly: the order sits in the plain *accepted* state (which the requester client renders
as the "I'll select" path — "(!) New Request Info (!)") until the follow-up assign step lands
and flips it to connected. So the mechanism is server-side sequencing, not a client guess; what
is not yet known is *why* the assign is a second step rather than the same transaction.

**Setup:** requester 141548 on iPhone 12 (Requester 13.9.1 build 603, the `!278` build), gopher
31677 "Gopher, Inc" on the Samsung A50 (Go 3.9.1 build 902). The owner used **Notify MY Gophers**
with 31677 hand-picked. *Why:* it lets him send a test request essentially privately, without
broadcasting to the live Gopher network. Use the same pattern for future live tests.

**What happened:**
1. On submit, the requester got the banner and the distinct "you're a favorite…" notification —
   correct.
2. When 31677 (the hand-picked MY Gopher) accepted, the requester's screen **briefly behaved as
   the "I'll select my Gopher" path**: "Request Submitted…" with the red **"(!) New Request Info
   (!) / View Here"** row and the "New Request Information Available" banner — for **about 2–3
   seconds** — and only then transitioned to **"Request Accepted by: Gopher, Inc"**, the
   auto-connected state.
3. The end state was correct. The transient is the defect: 2–3 s is long enough to tap "View
   Here", which opens the approve/decline flow for an acceptance that needs no approval.

**Canon it violates** (owner, 2026-08-23; memory `three-acceptance-paths-canon`): with Notify MY
Gophers on, an acceptance **by the hand-picked MY Gopher behaves exactly like First Available**;
an acceptance by **any other Gopher behaves like "I'll select"**. The client showed the
"select" state first and corrected itself afterwards — so something on the requester side
classifies the acceptance before it knows the accepting Gopher is the hand-picked one (or the
server emits a generic "new bid" event before the auto-connect state lands). Which of those it
is has not been checked.

**Not part of G40-39.** Ticketed as **G40-445** (Bug, sprint "Payment Options", 9–16 Sep,
created 2026-09-05 at the owner's instruction; the ticket points back here). It needs a session
that reads: the requester's acceptance/bid socket handling in
`gopher-mobile-requester-capacitorjs` (the poll or event that flips to "New Request Info"), and
the backend accept path for `notify_fav_gopher` orders (whether the order is moved to the
connected state in the same transaction as the acceptance, or after a follow-up step).
