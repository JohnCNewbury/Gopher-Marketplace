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
