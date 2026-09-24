# G40-39 / G40-427 — Android live test: everything you need, in one place

**For:** the session running the one remaining Android order (and reviewing related logs).
**From:** the session that built and merged the fixes, 2026-09-04.
**Canonical doc:** [`G40-39-completion-flow.md`](G40-39-completion-flow.md) — that is the source of
truth. Write your result **into it**, then reference it from the tickets. Not the reverse.

---

## What you are testing, in one sentence

A Gopher completes a **non-age-restricted** job on **Android**, is offered the photo step, adds a
photo — and the requester sees it above **Confirm Completion** *before* they release payment.

**Everything except the native layer is already proven.** The React logic is byte-identical on both
platforms and was verified live on iOS (order 65146). What this order uniquely buys is the **native
camera capture and the multipart upload** on Android. If the photo lands in the DB, the Android leg
is done — the display logic downstream is the same code iOS already exercised.

---

## The devices are already prepared — do not rebuild

**Samsung Galaxy A50, serial `R58N22N8QSM`, connected by USB.** Both apps installed 2026-09-04:

| App | Package | versionName | versionCode | Built from |
|---|---|---|---|---|
| Gopher Go | `io.gophergoapp.go` | 3.9.1 | 901 | `3a28f1c21` (carries !266) |
| Gopher (Requester) | `io.gophergoapp.requester` | 3.9.1 | 901 | `18cb0de0f` (carries !271) |

Verified already: both bundles **contain the fixes** (grepped the APK's `assets/public/static/js`
for `completion_photos` / `View pic(s) of completed request`), the Go app **clears the version gate**
on the real phone, is signed in, and lands on the **Active / Scheduled / Available** tab bar.

The iPhones (12 Pro, 15 Pro Max) carry the same commits at **13.9.1**, so either can be the
requester side.

- ⚠️ **`versionName` alone cannot tell you if a build is current** — the phone already read 3.9.1
  *before* these installs. **Check `versionCode` (must be 901):**
  `adb -s R58N22N8QSM shell dumpsys package io.gophergoapp.go | grep -m1 versionCode`
- ⚠️ **I killed the emulator deliberately.** With it running, every bare `adb` command fails with
  `adb: more than one device/emulator`. If you boot one, pass `-s R58N22N8QSM` everywhere.

---

## Running it

1. **The order must be NON-age-restricted.** A/R orders never get the photo step — they run the ID
   flow instead (`applies = !is_age_restricted(order)`, and it reads *nothing else*). An A/R order
   proves nothing here and wastes the money.
2. **Gopher on the Samsung**, completing through the **Active tab** — that is the whole point.
   `ordercard.js` (which always had the fix) is *not* the live path; `RequestDetailPullOver.js`
   behind the tab bar is, and that's what !266 fixed.
3. **Watch for:** after tapping **Completed**, the app should go to a photo screen (up to 3 photos,
   camera or gallery, Skip available). **Take a photo and submit** — skipping proves nothing.
4. **Requester side:** open the order from the **"Order Completed" push notification**, not by
   navigating in-app. The push opens `Orderdispute.js`, which is the screen that had no photo code
   at all until !271. Look for **"View pic(s) of completed request"** above **Confirm Completion**.

---

## Reading the logs — the exact shape of a pass

Production DB, read-only, via the SSM tunnel: see memory `production-db-access-via-ssm-tunnel`
(tunnel to **`gopher-prod.cluster-ro-…`**, assert `pg_is_in_recovery` — a pinned instance name flips
role on failover).

Pull the three events for the order and compute offsets. A **pass** looks like this — the shape from
order 65146, which is the iOS run that passed:

| Event | Offset | Meaning |
|---|---|---|
| Order Completed | 0s | Gopher tapped Completed |
| Photo attached | **+33s** | native capture + upload worked ← *this is the Android-specific proof* |
| Requester Confirmed | +74s (+41s after the photo) | photo was on screen before payout released |

**The pass condition is simply: `photo_attached < requester_confirmed`, with the photo row existing
at all.**

### Interpretation traps — all of these have already bitten someone

- ⛔ **Completion *always* precedes the photo.** The order is marked complete first, *then* the
  Gopher is routed to the photo step. A photo timestamp after the completion timestamp is **normal**,
  not a race. Do not re-raise this.
- ⛔ **"It appeared too early" was already asked and answered** for 65146 — from timestamps, not
  impressions. The photo existed 41s before the confirm tap. Don't re-derive it.
- ⛔ **No photo row ≠ the fix failed.** A legitimate Skip and an upload still in flight are
  **indistinguishable to the requester's app** — `photo_requirement` is served only to the *Gopher's*
  app, never the requester's. If there's no photo row, find out whether the Gopher skipped before
  concluding anything. (Order **65140** is the trap case: reached confirmation with zero attachments,
  9.8s after Complete.)
- ⛔ **Owner's test accounts are `1`, `31677`, and `82271`** (82271 confirmed by the owner
  2026-09-04). A test order on 82271 is *not* a live customer — I flagged it as one and was wrong.
- ⛔ **CloudWatch on prod lags ~20 minutes.** An empty recent-log query is **lag, not absence** — see
  memory `production-cloudwatch-lags-20-minutes`. Relevant if your related log review touches it.

---

## When it passes, write it here

1. **`G40-39-completion-flow.md`, "Still owed" item 6** — replace the "one live order still owed"
   wording with the order id and its timeline table. That item is the only thing keeping the Android
   leg open.
2. **Jira G40-39 and G40-427** — a comment pointing at the doc. The doc carries the truth; the ticket
   carries only what should die with the fix.

After that, the **only** remaining items on G40-39 are both blocked on a store release:
the original seven scenarios on the shipped build, and publishing the 101 copy.

## ⛔ Do not publish the 101 guide copy

`G40-39-101-guide-copy-STAGED.md` holds paste-ready copy for **both** 101 guides. It is staged
**outside `Final/` on purpose**: `deploy.sh` publishes from the **working tree**, so anything left in
`Final/` can be shipped by any session's `--allow-dirty` run.

It must not ship until a store release carries `3a28f1c21` + `18cb0de0f`. On today's store build a
worker completing from the Active tab is never offered the photo step, and a requester arriving via
push never sees photos — so that copy would describe behaviour most users cannot get, which is
exactly what the 101 rule forbids. **A passing Android test does not clear this gate; only a store
release does.**
