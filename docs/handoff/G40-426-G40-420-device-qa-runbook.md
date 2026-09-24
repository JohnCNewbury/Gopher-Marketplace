# G40-426 + G40-420 — device QA runbook

Written 2026-09-04 for the Appflow build now being cut. Both tickets are complete in code and
deployed; **each has exactly one acceptance criterion left, and both need a real build.**

| Ticket | Status | What's owed |
|---|---|---|
| **G40-426** | Closed, with a carried gate | AC4 — a push tap routes to the right screen, on a handset |
| **G40-420** | Ready for QA | AC5 — picker verified on **Android and iOS** |

---

## Preconditions — verified in production 2026-09-04, not assumed

Account **user 124281** (`johncnewbury+johnc@gmail.com`) has both installs live:

| role | app | platform | app_version | fcm_token | js_app |
|---|---|---|---|---|---|
| **2** | Go (worker) | android | `3.9.1(901)` | present (142 ch) | `true` |
| **3** | Request | **ios** | `13.8.0(841)` | present (142 ch) | `true` |

`js_app: true` on both matters — it is what selects the **data-only** FCM payload, which is the
path G40-426 fixed. A role sitting on `false` would take the legacy notification path and the tap
test would prove nothing. See memory `android-push-delivery-architecture`.

⚠️ **Phones only hit production.** There is no stage build; do not try to point either app at
`Gopher-Stage`. Both fixes are already live on production, so this is fine — just be aware you are
testing against real data.

---

## 1. G40-426 AC4 — the push tap (Android, Go app)

⚠️ **This one CANNOT be shortcut with Capacitor live-reload.** The fix is **native Java** —
`MyFirebaseMessagingService.java` (puts the FCM data on the tap intent with a per-notification
`requestCode`) and `MainActivity.java` (reads it back and dispatches a `gopherPushTap` window
event). Live-reload only swaps the web layer, so it would test the unfixed native code and give a
confident wrong answer. **This needs the real build.**

**Why it was broken:** the native service posts the notification itself, so Capacitor's
`pushNotificationActionPerformed` never fires on Android. Every routing rule written against it was
unreachable — proven on a handset 2026-09-04: a real `order.payout` push, tapped, did not navigate.

### Steps

1. Install the new build on the **A50** and sign in as **user 124281, worker (Go) side**.
2. Open the app, then **background it from a screen that is NOT the Request tab** — the whole point
   is observing a navigation, so start somewhere else.
3. Say the word and **I fire a real push** through the production `sendPushNotif` to that role's
   token with `type=order.payout` (I can do this from the EB instance over SSM; ~30 seconds).
   I will not send it unprompted — it goes to your actual phone.
4. **Tap the notification.**

### Pass / fail

- **PASS** — the app opens **on the Request tab**. Routing works end to end.
- **FAIL** — the app opens on whatever screen it was backgrounded from. That is the exact
  pre-fix symptom.

**If it fails,** the first thing to check is the notification channel: the fix also derives
`CHANNEL_ID = "gopher_" + sound`. A notification landing in **"Miscellaneous"** means it took the
legacy path, and the tap test is invalid rather than failed — tell me and I'll re-check `js_app`
for that role.

**Revert if needed:** one commit per repo — gopher app `!269` (`f18473f8`), requester `!274`
(`8dfc80ce`).

---

## 2. G40-420 AC5 — the schedule picker (Android **and** iOS, Request app)

Pure web layer, so the build simply needs to contain `!275`. Both checks below are quick.

### 2a. New request — the picker's bounds

1. Start a **Grocery** request (or any of the 34 categories using the picker).
2. Tick **"Schedule For Specific Date/Time"**.
3. Confirm: **no date before today is selectable**, and the default lands **today or later** —
   it should sit about an hour ahead.

### 2b. The actual bug — the reschedule sheet ⭐

This is the one worth your attention; 2a passed even before the fix.

The defect was never that you could *pick* a past date — it was that the picker **adopted a past
value it inherited and committed it on mount, with no interaction**. The fix
(`safeInitialScheduleTime`) refuses to seed from a stale value.

1. Open an order whose scheduled time **has already passed**.
2. Open its **reschedule** sheet.
3. Confirm the picker defaults to **about an hour from now**, *not* to the order's old time.

- **PASS** — default is in the future.
- **FAIL** — the old, past date appears pre-selected (it will look selected even though its day
  is greyed out — that combination is the signature of this bug).

### 2c. Round-trip

Create a scheduled request a few days out, submit, and confirm the time shown afterwards matches
what you picked. I'll confirm the stored `request_schedule_time` in production against it.

### iOS

Role 3 is already an **iOS** install, so the iOS half is doable on your iPhone — it needs the
requester build to reach the device (TestFlight, if this Appflow run includes iOS). If this build is
Android-only, **say so and AC5 stays half-open** rather than being recorded as passed.

**The Go app needs no picker testing.** Verified twice, independently, on `origin/production`: its
copy of `datetimepicker.js` is `useState(moment().add(1, "hour").toDate())` and never reads
`existingScheduleTime`, so it structurally cannot inherit a stale value.

---

## What I can do live while you test

- Fire the G40-426 push on your word, and read back what FCM accepted.
- Watch `order_logs` and `orders` in production as you go, and confirm the stored
  `request_schedule_time` matches what the picker showed.
- Confirm the running EB version still matches the deployed commits.

## What closes on a pass

- **G40-426** — AC4 satisfied; the ticket is already closed, so this just clears its carried gate.
- **G40-420** — moves Ready for QA → Done, **only if both platforms pass**. If iOS isn't in this
  build, it holds.
