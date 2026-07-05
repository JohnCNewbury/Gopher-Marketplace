# G40-139 — Gopher Go: Available tab instant refresh (a.k.a. "Platform Stability Issue")

**Type:** Task/Bug · **Priority:** Medium · **Label:** worker · **Assignee:** John Newbury
**Status:** groomed to dev-ready — 2026-07-02. No prototype build (native-lifecycle behavior);
core logic already scaffolded. No open questions.

## The issue (despite the vague title)
The **Available tab is slow to show new requests** after a push notification. In a time-sensitive
marketplace a Gopher can miss a request before it appears. The Available feed must refresh
**instantly** (within ~1–2s) when: (a) the app is opened via a push notification, (b) the app
returns to the foreground, or (c) a new-request payload arrives while the app is open — **without**
a manual pull-to-refresh, a full reload, a flash, or **losing scroll position**.

## Why there's no prototype build
This is **native app-lifecycle + data-fetch** behavior (Capacitor foreground events, push
handlers, optional WebSocket). The static prototype has no push, no lifecycle, and no backend, so
there is nothing meaningful to simulate. Visual reference only: the **"Available jobs"** frame in
`_prototypes/Go/gopher-go-prototype.html`.

## Core logic is already scaffolded + tested (owner)
`G40-Build-Recap.md` → **`wave2/g40-139/refreshDecider.js`** (+ **`useAvailableRefresh.jsx`**):
*"refresh on push-foreground / app-foreground / in-app payload, debounced. Tested. Hook wires
Capacitor lifecycle; preserve scroll."* **Wire the FE to this; don't re-derive.**

## What the DEVELOPER does (all native/FE runtime work)
1. Mount `useAvailableRefresh` on the Available tab; drive it from `refreshDecider` on:
   - **App foreground via push** (tapped notification) — iOS AppDelegate/SceneDelegate foreground;
     Android `onResume` / foreground notification handler. Via Capacitor: the `App`
     `appStateChange`/`resume` events + the push `pushNotificationReceived` / `pushNotificationActionPerformed`.
   - **App foreground from background** (no notification).
   - **In-app new-request payload** while open (push received in foreground, or a real-time
     socket event if the channel is active — confirm it is and that it triggers the UI update).
2. **Debounce** so overlapping triggers cause one fetch; do an **incremental data update**, not a
   full page reload — **preserve scroll position**, no flash.
3. Replace any polling-interval / tab-focus-only fetch that causes the delay.

## Acceptance criteria (from the ticket)
1. Open via push → new request already visible in Available, no manual refresh.
2. App open on Available → new request populates in real time on notification.
3. App returns to foreground (no notification) → Available refetches immediately.
4. New request visible within **1–2s** of the push / foreground.
5. **No UI disruption or scroll-position loss** on refresh. Test iOS + Android.

## Related
Owner reference build: `Documentation/Jira Tickets/` + `G40-Build-Recap.md`
(this ticket = "Available-tab instant refresh", Wave 2, ✅ tested). Notifications/push plumbing
overlaps the backend notification map (SMS/push senders) — see the backend export
`lib/sendPushNotif.js` for the send side; this ticket is the **receive/refresh** side in the app.
