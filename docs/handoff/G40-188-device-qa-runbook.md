# G40-188 — device QA runbook (cancellation reason picker)

Written 2026-08-30 for a next-morning run. **Everything needed is already on the machine**;
nothing here requires an Appflow build or a store upload.

- Device attached and confirmed: **SM-A505U (Galaxy A50), Android 11 / API 30**, serial `R58N22N8QSM`
- Both apps installed at **3.9.1** (`io.gophergoapp.go`, `io.gophergoapp.requester`)
- This Mac on the LAN at **192.168.1.134**
- Branches to test: `feat/g40-188-cancel-reason` in **both** mobile repos
  (GO [!261](https://gitlab.com/gophergo/gopher-mobile-gopher-capacitorjs/-/merge_requests/261) ·
  Request [!249](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/249))

---

## Why live-reload rather than a build

The sheet is **100% web layer** — no native code, no plugin changes. Capacitor can point the
installed app at a dev server on this Mac, so the edit-test loop is seconds instead of a 45-minute
build. `capacitor.config.ts` already has the hooks; someone used this before and left them
commented out.

⚠️ **The one rule that matters below is that the config edit never gets committed.** A `server.url`
pointing at a laptop in a shipped build is a dead app on every phone that installs it.

⚠️ **This does not replace the release-build pass.** §5 of the sprint prep requires device QA on a
RELEASE-signed build, and that rule is real — it exists because a licensed SDK behaved fine in debug
and would have shipped live tracking dead. That failure mode is **SDK licensing**, which this change
does not touch, so live-reload is representative *for this change*. The release build remains the
pre-ship confirmation.

---

## Setup — once per app

In the worktree or a checkout of `feat/g40-188-cancel-reason`:

**1.** In `capacitor.config.ts`, inside the existing `server: { … }` block, uncomment and set:

```ts
  server: {
    url: "http://192.168.1.134:3000",
    cleartext: true,
    errorPath: "/",
  },
```

**2.** Start the dev server (leave it running):

```bash
npm start
```

**3.** Build and install the debug APK once:

```bash
npx cap sync android && npx cap run android
```

From here every save reloads on the phone. No rebuild.

**Phone and Mac must be on the same wifi.** If the app opens to a blank screen, that is almost always
the wifi or a firewall prompt on the Mac, not the code.

---

## Test A — Requester: reason required

**Setup:** a scheduled request, accepted by a Gopher, not started.

| # | Step | Pass looks like |
|---|---|---|
| A1 | Tap **Cancel Request** | The sheet slides up. ⛔ The request is **not** cancelled — the old build cancelled on this tap with no confirmation |
| A2 | Read the sheet | Names the Gopher; says it is free to cancel before they start |
| A3 | Try the primary button with nothing selected | **Disabled**, grey |
| A4 | Pick any listed reason | Row highlights green, button enables, navy text on green |
| A5 | Pick **Other** | Textarea appears **above** the buttons; button goes disabled again |
| A6 | Type one word | Still disabled; helper reads "Please use at least 3 words" in red |
| A7 | Type three words | Enables; helper switches to the `n / 150` counter |
| A8 | ⚠️ **With the keyboard open, check the textarea and both buttons are reachable** | Nothing hidden behind the keyboard. **This is the G40-421 risk and the main reason to test on a device** |
| A9 | Submit | Request cancels, lands back on the request list |
| A10 | Check the Gopher's email | Cancellation email now shows the **chosen reason**, not "Not provided" |

## Test B — Requester: the reschedule intercept

| # | Step | Pass looks like |
|---|---|---|
| B1 | Pick **"Scheduling conflict — need a different time"** | Sheet switches to the intercept — *"Change the time instead?"* |
| B2 | Read it | Offers **Message {Gopher}**; does **not** claim the time has been moved |
| B3 | Tap **Message {Gopher}** | Opens the in-app thread with that Gopher, correct order |
| B4 | Back out, reopen, pick it again, tap **"No — cancel the request"** | Returns to the option list with the choice still made |

⛔ There is deliberately **no** "propose a new time" button. Only the assigned Gopher may raise a
reschedule (owner ruling 2026-08-05, enforced in `re_schedule.js` — a requester gets 401).

## Test C — Gopher: picker replaces free text

**Setup:** a scheduled job the test Gopher has accepted, not started.

| # | Step | Pass looks like |
|---|---|---|
| C1 | Open the job, tap **Cancel Request** | **One** sheet, with seven options. ⚠️ The old build rendered two identical sheets stacked — if you see any doubling, that is a regression |
| C2 | Confirm the seven options and their order | Emergency · Can't make the time · Vehicle/equipment · Not as described · Can't reach requester · Safety concern · Other |
| C3 | Same disabled/enabled and 3-word behaviour as A3–A8 | As above |
| C4 | Submit | Job cancels |
| C5 | Check the requester's email | Shows the chosen label |

## Test D — the second door

| # | Step | Pass looks like |
|---|---|---|
| D1 | Reach the Gopher-side cancel from the **other** screen (the request-detail list, not the active-order card) | It opens the **same sheet**. ⛔ It must not cancel silently — that path used to send no reason at all |

## Test E — the open question

**E1.** Note whether the test Gopher account is **Standard, Pro or Pro+**, and whether the scheduled
job's cancel control is reachable at all after backing out of the screen and returning.

This is the unresolved finding 5 on the ticket: the code has a cancel button gated on `scheduled`,
but the route to it is Standard-only (`bottomRoutes.js` gates the pin redirect on
`!user?.gopher_type_id`). **If the answer is Pro or Pro+ and the control is unreachable, the routing
still needs fixing and this MR does not cover it.**

---

## Teardown — do not skip

```bash
git checkout -- capacitor.config.ts
git status        # must be clean before anything is pushed
```

Then reinstall the store build from Play, or leave the debug build if more testing is coming.

---

## What a failure means

- **Keyboard covers the textarea (A8):** real, and it is G40-421's shape. Tell me — the fix belongs
  in the shared component, not a one-off here.
- **Two sheets appear (C1):** the deletion of the duplicate `PullOverModal` blocks did not take.
- **Email still says "Not provided" (A10):** the reason is not reaching the API. Check the request
  payload — it should be `PATCH /orders/:id/denied` with `cancellation_reason`.
- **Blank screen on launch:** wifi/firewall, not the branch.

---

# RESULTS — partial run, 2026-09-02 (browser viewport, NOT a handset)

⛔ **Read the caveat before the table.** This run drove the **real production `CancelReasonSheet`**
(worktree at `origin/production`: Request `d53971411`, Go `7eccf75a6`) in the Browser pane at
375x812, mounted through a **throwaway harness route** — not reached through the real cancel flow,
and **not on a device**. It proves the component; it does not prove reachability or anything that
depends on a native soft keyboard.

**The sheet had never rendered anywhere before this run.** It has now.

⚠️ **Both apps ship a byte-identical `CancelReasonSheet.js` and `cancelReasons.js`** (verified by
`diff`), so component-level results transfer between them. Only the CALL SITES differ, and those are
what the device run still has to exercise.

## Passed

| case | result |
|---|---|
| **C1** one sheet, not two | ✅ single sheet. Go app has one `<CancelReasonSheet/>` in `ordercard.js` + one in `requestOrder.js` (the intended second door, test D); Request app one. No stacking |
| **C2** seven Gopher options, in order | ✅ Emergency · Can't make the time · Vehicle/equipment · Not as described · Can't reach requester · Safety concern · Other |
| **A2** sheet copy | ✅ "Test Gopher has held this time for you… free to cancel before they start" — names the Gopher |
| **A3** submit disabled with nothing picked | ✅ grey, `disabled` |
| **A4** selection styling | ✅ green row + filled radio, submit enables, **navy on green** (Guide B) |
| **A5** "Other" reveals textarea ABOVE the buttons | ✅ and submit returns to disabled. Measured: textarea bottom **670px**, Cancel button top **709px** |
| **A6** one word | ✅ still disabled, helper "Please use at least 3 words" |
| **A7** three words | ✅ enables, helper switches to the `n / 150` counter |
| **B1/B2** reschedule intercept | ✅ "Change the time instead?" — offers **Message {Gopher}**, and does **not** claim the time was moved |
| **B4** decline the intercept | ✅ returns to the option list with the choice still made (submit stays enabled) |
| payload shape | ✅ a listed option submits the **label** verbatim (`"Safety concern"`); "Other" submits the typed text. This is what lands in `orders.cancellation_reason` and renders into the type-45 email |

## NOT covered by this run — still owed on a handset

- **A8 keyboard occlusion.** The whole reason a device is required. A browser has no native soft
  keyboard; the 670/709px measurement above says the layout is *arranged* correctly, not that the
  Android IME leaves it reachable.
- **A1 / A9 / A10** — reaching the sheet from a real Cancel tap, the cancel actually completing, and
  the email carrying the chosen reason. All need a live scheduled order.
- **B3** — that Message {Gopher} opens the right in-app thread. The harness only proves the callback
  fires.
- **D1 / E** — the second door and the Standard vs Pro/Pro+ reachability question.
- **iOS entirely.** The A50 is Android; the code branches on `isIOS` in places.

## ⚠️ New question this run raised, not in the original runbook

The **Request** app renders two active-order screens: schema `requestorder` -> `requestOrder.js`
(has the new picker) and schema `order` -> the legacy `Ordercard`, which still opens an **old
free-text cancel modal** firing `PATCH /orders/:id/denied` with `gopher_location`. Both schemas are
navigated to (`requestorder` from 4 call sites, `order` from 8, incl. `bottomRoutes.js` and
`activeOrder.js`).

The copy and the endpoint are worker-shaped, so this is **probably fork residue a requester never
lands on** — but reading cannot settle it, and it is the same shape as the second door the MR
already closed in the Go app. **Add it as a device case:** on a scheduled order, does the requester
ever reach a cancel control that is NOT the picker?

## Traps hit while running this

- ⚠️ **Both mobile clones had other sessions' uncommitted work** (`gopher-mobile-gopher` on
  `G40-430-background-location-loop`; `gopher-mobile-request` carrying modified
  `ReleaseRecoveryWatcher.js`, `orderConfirmation.js`, `requestorhistory.js`). Serving the dev
  server from either clone would have tested THEIR code, not `production`. Use a detached worktree
  at `origin/production` and symlink `node_modules` from the clone — `package.json` is identical at
  the same commit, so it is safe and instant.
- ⚠️ **The Browser pane's click transport times out on this MUI `Dialog`** — every `computer`
  left_click returned "pane may be stuck" while `elementFromPoint` showed the option was the topmost
  element and no backdrop was over it. Drive it with dispatched DOM clicks instead; the React
  handlers fire normally. Do not read the timeout as a defect in the sheet.
- ⚠️ **Debug and release share the applicationId** (`io.gophergoapp.go` / `.requester`, no
  `applicationIdSuffix`), so installing a test build REQUIRES uninstalling the store build and wipes
  its data. Plan for re-signing-in.


---

# RESULTS — real device run, order #65114, 2026-09-03 — requester half PROVEN END-TO-END

⛔ **This supersedes the browser-viewport partial run above.** That run used a throwaway harness
route and a stubbed `onSubmit`. This run used the **real cancel flow, on the physical A50, against
a real production order**, driven via Chrome DevTools Protocol against the app's own debuggable
WebView (`adb forward` to the `webview_devtools_remote_<pid>` unix socket — no live-reload needed).

**Accepting Gopher confirmed Pro+** ("Gopher Pro+ since Sep 2026" on the acceptance screen).

## Passed — every case the browser run could not fully prove, now confirmed live

| case | result |
|---|---|
| **A1** real tap | ✅ opened the sheet; confirmed via logcat that no DELETE/PATCH fired before submit |
| **A3–A7** | ✅ all as before, now against real DOM computed styles — A4's selected-row colors are an **exact match** to the `GREEN`/`GREEN_LIGHT` source constants (`rgb(51,217,117)` / `rgb(226,243,233)`) |
| **A8 keyboard occlusion** | ✅ **PROVEN.** Real Samsung IME, real typed text ("device keyboard test works"). Textarea and both buttons stayed fully visible above the keyboard. This is the one thing the browser run could not touch. |
| **B1/B2** | ✅ as before |
| **B3 Message Gopher** | ✅ **PROVEN — opens the correct thread**, not just a stub callback: "Gopher Pro+ - Gopher, Inc", Rating 5.00, Jobs 79, Subject "Junk Removal" — all matching the real order |
| **B4** | ✅ as before |
| **A9 real submit** | ✅ order cancelled, app returned to the request list |
| **A10 the email** | ✅ **arrived and is correct.** Subject "Request #65114 was cancelled by the requester". Body carries `Reason: Wrong details in my request` — the exact picker label, verbatim, no fallback. Full HTML inspected: no `undefined`/`null`/`[object Object]`. |

## Still not confirmed

- **Push notification** — inconclusive, not negative. No matching entry in the active notification
  list for `io.gophergoapp.go` around the cancellation time, but the app was foregrounded on-device,
  which commonly suppresses the heads-up banner. Don't read this as a defect without more evidence.
- **⛔ Scenario 3 / finding 5 — Pro+ reachability — still UNPROVEN.** This run tested the
  *requester*-cancel path. The Pro+ account here was the order's *accepter*; that is not the same as
  proving it can *reach a cancel control from inside Go*. Needs a second order, Gopher-initiated
  cancel (C1–C5, D1, E). Order #65114 is now consumed by this run.
- iOS — still untested.

## What actually worked, for next time

**Skip live-reload.** Capacitor kept resolving `https://localhost` and ignoring a configured
`server.url`, even when the URL was verified correct inside the installed APK's
`assets/capacitor.config.json`. Bundle the real `npm run build` output into the APK instead
(`npx cap sync` with no `server.url` set in `capacitor.config.ts`) — slower per-iteration, but it
actually loads.

**⛔ Two build blockers hit and fixed, both worth checking first on this box:**
1. **iCloud duplicates itself files inside `node_modules`** (`values 2.xml`, `AndroidManifest 2.xml`,
   etc. — 309 found across both mobile clones). Gradle's `mergeDebugResources` dies on these as
   "Duplicate resources." All were confirmed to be regenerable build output under
   `.../build/intermediates/...` before deleting — never delete outside that path without checking.
2. **The version-floor gate walls off a bare local build.** `App.getInfo().version` (native
   `versionName` in `build.gradle`) must clear whatever `/mobile-config?v=` currently requires —
   probe the endpoint directly rather than guessing, and don't confuse it with `REACT_APP_VERSION`
   (a separate, JS-only value baked at build time).

**Interacting with the WebView:** `adb shell input tap` at screenshot-estimated coordinates is
unreliable — one full miss on this run. `uiautomator dump` is useless here too (a Capacitor WebView
is a single opaque node to the accessibility tree). The reliable path is CDP: `adb forward tcp:PORT
localabstract:webview_devtools_remote_<pid>`, then `Runtime.evaluate` with real DOM queries and
`.click()` — exact, and it doubles as a way to read back computed styles for verifying color/layout
claims precisely rather than eyeballing screenshots.
