# G40-39 — handoff to a fresh session, 2026-09-05

**Read this, then [`G40-39-completion-flow.md`](G40-39-completion-flow.md).** Written at the end of a
long session, deliberately, because the previous session's context was ~79% full and its judgement
had started to slip. Everything below is verified against merged `production` or against live
`order_logs` — not recalled.

---

## The one-line state

The **notification** half of G40-39 is fixed, merged, deployed and **proven on a live order**. The
**screen** half is not fixed and is precisely characterised. One regression (no rating prompt) is
open with the obvious cause ruled out.

---

## ✅ Done, deployed, proven — do NOT redo any of this

**Order 65185 (2026-09-05, live, non-A/R Delivery, gopher=1) is the proof:**

| Time (ET) | Event |
|---|---|
| 02:31:04 | Order Completed |
| 02:32:34 | Gopher added 1 completion photo — **+90s** |
| **02:32:35** | **Requester notified to confirm** — **1s after the photo** |
| 02:34:02 | Gopher skipped the photo step (owner went back and also tapped Skip) |
| 02:34:06 | Requester Confirmed |

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

---

## ⛔ OPEN #2 — no rating prompt on the Go app after confirmation

Owner reported it on order 65185. **Cause not found.**

**Already ruled out — do not re-investigate these:**
- ❌ *Not* the Done-button change. `/form` **does** mount `<BottomMenu />` (`renderForm.js:1253`),
  which owns the `rateYourRequestor` socket listener, and the completion screens do not set
  `hideBottom`.
- The backend emit (`controllers/order/update.js:2107`) is gated on `!gopher_already_rated` and falls
  back to a `pending_notifications` row if the socket emit fails.
- **No `pending_notifications` row exists for user 1 from this order** — which normally means the
  emit returned truthy, i.e. the backend believed it delivered.

**Not yet checked (where to start):** whether a `ratings` row already existed for order 65185 by
rater 1, which would mean the emit never ran. ⚠️ The `ratings` table has **no `created_at`** and uses
`rated_id`, not `ratee_id` — two column guesses that wasted queries last session.

---

## Device state — all three rebuilt and verified 2026-09-05

| Device | Go app | Requester app |
|---|---|---|
| Samsung A50 `R58N22N8QSM` | 3.9.1 **(902)** | 3.9.1 **(902)** |
| iPhone 12 Pro `92BE0D3B-…` | 13.9.1 **(34)** | 13.9.1 **(602)** |
| iPhone 15 Pro Max `4FE8ACA1-…` | ⚠️ **99.0.0 (31) — NOT ours** | 13.9.1 **(602)** |

- **Build number is the only reliable marker.** `versionName` is unchanged at 13.9.1/3.9.1 across
  old and new builds, so it cannot tell a stale binary from a current one.
- ⚠️ **Another session (or the owner) installed `99.0.0 (31)` on the iPhone 15's Go app.** Left alone
  deliberately — overwriting could destroy someone else's in-flight test. Ask before touching it.
- The owner's working pair is **Samsung = Gopher, iPhone 12 = Requester**.

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
