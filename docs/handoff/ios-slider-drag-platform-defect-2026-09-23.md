# NO SLIDER IN THE REQUEST APP CAN BE DRAGGED ON iOS

> ## ✅ RESOLVED 2026-09-23 (second session) — root cause found, fixed, device-verified, MERGED (not yet released).
>
> **Cause: touches landed ~54pt below the finger.** `capacitor.config.ts` set
> `ios.contentInset: "automatic"` (since `a16bb3fa1`, 2024-03-28). That drew the page
> 59pt down, below the status bar, while touches reached WebKit as if the page started
> at the top of the screen. WebKit starts a native range drag **only** if the touch
> lands inside the thumb (`SliderThumbElement::handleTouchStart`, 48pt minimum hit
> box), so every thumb was missed, silently: no `touchcancel` and no `preventDefault`.
> Taps worked because a tap on a range only uses X. Buttons survived because they are
> tall. It affects **GO too**: Work Settings & Radius (`work_radius.js`), which the
> owner says has been broken for a long time.
>
> **How it was proven (all readings are screenshots of the owner's 15 Pro Max, read
> first-hand):**
> 1. The §4 probe read `tgt:INPUT/range prevented:no cancelable:y`. None of the three
>    branches in §4 applied.
> 2. A v4 probe showed `elementFromPoint` at the finger returning the card panel, not
>    the slider.
> 3. A v5 probe showed every slider's own thumb centre hit-tests to **itself**, and all
>    34 other MUI dialog/drawer roots are `visibility:hidden`. Nothing covers the thumb.
> 4. A v6 red dot drawn at `touch.clientX/Y` sat **~54pt below** a finger held on the
>    thumb.
> 5. Changing **only** `contentInset` to `"never"` fixed it: a native range went 5→15
>    in one drag, and the red dot sat under the finger.
>
> ⚠️ An earlier reading in this session wrongly concluded "the finger was on the thumb"
> because it did not subtract the 59pt webview origin. It was corrected by step 4.
>
> **Fix** (`"never"` alone slides the page under the status bar):
> - `ios/App/App/SafeAreaBridgeHostViewController.swift` pins Capacitor's web view
>   between the safe-area top and bottom, so layout is unchanged. Measured at 3×: a
>   uniform 1pt shift down (the old inset used 58pt; the safe area is 59pt).
> - It passes its safe area to the web view as `additionalSafeAreaInsets`, so
>   `--safe-area-inset-top/bottom` still read **59px/34px**, measured on the device.
>   `IdCaptureBox`'s camera offset and all bottom paddings are unchanged.
> - `contentInset: "never"`. ⚠️ Putting it back to `"automatic"` with the controller in
>   place insets the page **twice**.
>
> **MRs — MERGED to `production` 2026-09-23 on the owner's GO** (squash No, source branches
> kept). The merge commits were content-verified and their `production` pipelines passed:
> Request `d764361fe` (!384 `8d30d7c67`, then !385 `d764361fe`) and GO `9df42466d` (!365).
> **Merged is not released:** these ship with the next store build of each app. Tracked by
> **G40-543**, which points back here.
>
> | repo | MR | branch | commit | what |
> |---|---|---|---|---|
> | `gopher-mobile-requester-capacitorjs` | !384 | `fix/ios-slider-touch-offset` | `f1b1bfa2b` | the touch fix |
> | `gopher-mobile-requester-capacitorjs` | !385 | `G40-502-slider-dollar-domain` | `d722f833c` | §5 dollar-domain fix, rebased onto `94501ef65`; conflict with G40-535's tests resolved (both kept) |
> | `gopher-mobile-gopher-capacitorjs` | !365 | `fix/ios-slider-touch-offset` | `295b5780f` | the touch fix, GO |
>
> **Verified (device = owner's 15 Pro Max, iOS 26.6.2):**
> - The Gopher iQ rail and a native range drag (Request).
> - The Work Settings & Radius thumb follows the finger and the miles value updates
>   (GO, as reported by the owner).
> - The keyboard over a form field is unchanged, and the request photo picker works.
> - Safe-area values are 59/34.
> - CI contract scripts pass: 25/25 in each repo.
> - jest: Request 501/501 (touch branch) and 504/504 (dollar branch); GO 204/204.
>   eslint 0, prettier clean.
> - The dollar-domain guards are mutation-checked on the new base: exactly 3 fail
>   without the fix.
>
> **Post-merge device checks (2026-09-23, owner's 15 Pro Max, combined build of the
> merged code):**
> - ✅ **TrustShield ID-capture camera** (measured from a screenshot at 3×): the preview
>   fills its 215pt box (178.0–392.7pt) with clean edges, and the white frame sits
>   centred in it: 14.0pt above and 14.3pt below, identical at three columns. No offset.
>   Cancelled without capturing.
>   The owner also confirmed the TrustShield screen worked fine.
> - ⏳ **Stripe sheet: STILL UNVERIFIED.** An earlier revision of this line said the owner
>   had confirmed it. That was wrong: his "worked fine" referred to TrustShield.
>   Corrected the same day.
> - Android is not affected: the change is iOS-native plus an iOS-only config key.
>
> The sections below are the first session's record. §3's five dead hypotheses and §5
> still stand. §4's decision tree was exhausted by the reading above.

**Handoff from the G40-502 session, 2026-09-23.** Confirmed by the owner on his
**iPhone 15 Pro Max** across **five** sliders. ~~UNRESOLVED~~ — see the resolution
above. Five hypotheses tested and killed. This note exists so the next session
starts from evidence instead of repeating them.

> ⛔ **THIS IS NOT A G40-502 DEFECT AND MUST NOT BE FILED AS ONE.**
> A bare, unstyled, uncontrolled `<input type="range">` placed on the form
> **outside any modal**, with no code of G40-502's anywhere near it, fails
> identically. Every slider in the app is affected. This predates the ticket.

---

## 1 · The symptom

Tapping a point on the track moves the thumb there. **Dragging the thumb does
nothing** — it will not follow the finger. iOS only; never reproduced in a
browser.

## 2 · What is PROVEN, with the reading that proves it

An on-screen probe was built into the card (see §6). All readings are from the
owner's handset.

| # | Finding | Evidence |
|---|---|---|
| 1 | The React component is **not** the cause | control **B** — plain, unstyled, uncontrolled `<input type="range">` — fails identically |
| 2 | The **MUI Dialog** is not the cause | control **D**, on the form **outside the modal**, fails identically |
| 3 | Touch events **do reach the page** | `DOC tm:` increments on every drag (document-level listener) |
| 4 | The element's React handlers see **nothing** | `A react down:0 move:0` while `input:` still increments |
| 5 | The element's **native** listeners see nothing either | `native down:0 move:0`, bound directly with `addEventListener` |
| 6 | The value changes come from **synthesised clicks**, not touch | `input:` increments with `down:0`; `click` is the only path left |
| 7 | **`touch-action` is NOT the cause** | control **E** — fully native appearance, inline `touch-action: auto` — still fails |

## 3 · ⛔ Five hypotheses, all WRONG. Do not re-run these.

1. **WebKit half-native thumb.** `home.css` sets `-webkit-appearance: none` on
   `::-webkit-slider-thumb` while the same line on the input is commented out
   (since 2023-12-12, `0ec0bf826`). Plausible, real, **not this** — a scoped
   stylesheet fixing it shipped to the handset and changed nothing.
2. **Percent/dollar quantisation round-trip.** The rail ran `min=0 max=100`
   while storing whole dollars, so 88 of 101 positions snapped back.
   ⭐ **This was a genuine defect and is fixed** (§5) — but it was **not** the
   drag bug. Control B has no such logic and fails the same way.
3. **`Keyboard.hide()` on every touchmove.** `bottomMenu.js:50` adds a
   window-level `touchmove` listener on native platforms that calls
   `Keyboard.hide()`. The theory was that resigning first responder cancels the
   touch. **Disabled it entirely and rebuilt — no change.** File restored.
4. **`touch-action: none`** — added by the G40-502 session's own stylesheet on
   theory 1. ⚠️ **This made it worse, not better**, and was reverted to `auto`.
5. **Global `input { touch-action: manipulation }`** in
   `src/css/requester/style.css:22-31` (added for Stripe on iOS 18). It does
   hit every `input` including ranges, and it is worth scoping regardless —
   **but it is not the cause**: control E overrode it inline with `auto` and
   still failed.

⚠️ **A sixth candidate was checked and cleared:** `handleContentTouch`, a
non-passive `touchmove` listener in the bundle, belongs to a date-picker's own
viewport element. Not global.

## 4 · ⛔ WHERE TO PICK IT UP — the one unread measurement

A build is **on the owner's phone right now** with the final probe installed.
Its readout ends:

```
| tgt:<tag/type>  prevented:<YES|no>  cancelable:<y|n>
```

⚠️ The listener is deliberately in the **BUBBLE** phase, so it runs after every
other listener has had its chance to `preventDefault`. In capture phase it runs
first and reports `no` every time — a probe that cannot observe the thing it
measures.

**Read it while dragging, then branch:**

- **`prevented:YES`** → something cancels the gesture. Find the non-passive
  `touchmove` listener that does it. Nothing in `src/` calls `preventDefault`
  on touch, so look in **node_modules** and in the **native/Capacitor** layer.
- **`tgt:` is not `INPUT/range`** → the moves land on a different element.
  Find what is capturing them.
- **`cancelable:n`** → it cannot be cancelled from JS, which points **below the
  web layer** — WKWebView gesture recognisers / Capacitor's bridge.

## 5 · ⭐ What IS fixed, and must not be lost

The one real defect G40-502 had in this area, **verified and test-pinned**:

- **`docs/handoff/G40-502-slider-dollar-domain-fix.patch`** — the rail's domain
  changed from percent to dollars, removing a lossy round-trip that made 88 of
  101 thumb positions snap back. Includes **three mutation-proved guard tests**
  (sweep, not sample: every integer position must round-trip, at the $14 band
  and at the $10 floor).
- **`71/71` jest, `eslint 0`, `prettier 0`** — verified with the diagnostic
  code removed, so the patch stands alone.
- Apply against `gopher-mobile-request` `origin/production` (`fb3c13677`).
- Also needs `src/css/smart-price-slider.css` (untracked, in the worktree —
  §7). ⚠️ Its `touch-action` must be **`auto`**. Earlier revisions used `none`,
  which is actively harmful.

⚠️ **Fixing this does not make the slider draggable.** Ship it because it is
correct, not because it solves the reported bug — it does not.

## 6 · The probe harness

**`docs/handoff/ios-slider-drag-DIAGNOSTIC-HARNESS.patch`** — apply on top of
the fix to get the instrumented build back. It adds, all marked
**REMOVE BEFORE MERGE**:

- an on-screen readout (React counters, native counters, document counters,
  computed `touch-action`/`appearance`/height);
- controls **B** (plain uncontrolled), **C**, **E** (native + `touch-action:
  auto`) inside the card, and **D** outside the modal;
- `defaultPrevented` / `target` / `cancelable` reporting.

⚠️ **Control C is INVALID** — it sets `-webkit-appearance: none` with no thumb
rules, so it has no grabbable thumb and could never drag whatever the cause.
It is kept only so its label says so. **Do not draw conclusions from C.**

## 7 · Reproducing — the build loop, which works

Worktree (has `node_modules`, Pods, and the env file already):
`<scratch>/wt-req-prod` at `origin/production` `fb3c13677`.
⚠️ Do **not** build from `Dev/gopher-mobile-request` — it sits on another
session's branch with their uncommitted edits.

```bash
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8      # pod install fails without this
CI=false NODE_OPTIONS=--max-old-space-size=8192 \
  npx env-cmd -f .env.requestor.production react-scripts build
npx env-cmd -f .env.requestor.production npx cap copy ios
cd ios/App && xcodebuild -workspace App.xcworkspace -scheme gopher-requester \
  -configuration Debug -destination "id=00008130-000E2D802652001C" \
  -derivedDataPath <dd> -allowProvisioningUpdates build
xcrun devicectl device install app --device 00008130-000E2D802652001C <dd>/Build/Products/Debug-iphoneos/gopher-requester.app
xcrun devicectl device process launch --device 00008130-000E2D802652001C gopher.gopher-requester-ios
```

⚠️ **Traps that cost this session time:**
- The scheme is **`gopher-requester`**, not `App`.
- **Stamp the version.** `MARKETING_VERSION` is `13.1.1` locally (trapeze only
  writes the real one in CI, and `IOS_VERSION` has no default). The live gate
  is **`ios_requester: 13.8.0`** (`GET /api/v1/apiversion`), so an unstamped
  build hits a forced-update wall. This session used **13.9.5 / 1395**.
- `xcrun xctrace list devices` does **not** show paired devices — it looks like
  no phone is attached. Use **`xcrun devicectl list devices`**.
- The clone's `node_modules` is behind `origin/production`
  (`@capacitor-community/stripe` missing). Install in the worktree.

## 8 · Blast radius

Anything drag-based in the Request app: **`work_radius.js`** (the only other
`input[type="range"]`, see **PL-070**), and any swipe or carousel interaction.
Worth checking whether **Gopher GO** shares the cause — it was not examined.

## 9 · What this session did NOT do

- Did not edit `src/css/requester/style.css` or `home.css` — shared, and the
  other consumer (`work_radius.js`) cannot be tested from here.
- Did not commit anything to `gopher-mobile-request`. The fix and the harness
  are patches in this folder.
- Did not run G40-502's own QA. It needs no slider and is still outstanding:
  the purchase toggle across all six Delivery forms, card placement, and
  **$50 → $14**.
