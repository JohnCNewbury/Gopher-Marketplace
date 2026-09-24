# The Gopher location-permission journey has a SECOND surface — `LocationPermissionSetting`

**G40-481 · AC6 record · written 2026-09-13 by the release desk.**
⛔ **The decision on this screen is PENDING with the owner.** This row records the investigation and the
screen's current state. It deliberately does **not** state an outcome, because there is not one yet — a
doc that invents an outcome is worse than one that records an open decision.

---

## Why this file exists

G40-481's AC6: *"record that the Gopher location-permission journey has (or had) this second surface,
and what happened to it. This ticket is not Done until that row exists. If it is deleted, the record of
**why** is the only thing preventing someone rebuilding it."*

That is the whole point. This screen is finished, plausible work that nothing references. Whatever
happens to it, the next person to find it needs to know it was examined.

## What the surface is

`LocationPermissionSetting` — a full-screen component present in **both** mobile apps. Copy:

> "We need your location to show your nearby requests. Please go to Settings and enable Location
> Services."

One **Settings** button. On a successful permission re-check it routes onward with real intent: to
`work_radius` if the Gopher has not configured work preferences, otherwise to `gopherrequest` or their
active order. It is a purpose-built recovery path for a Gopher who denied location and therefore sees
no nearby requests.

## ⛔ Nothing routes to it

Established in the client at the stated scope (`origin/production`, both repos, braced rev:paths):
importers across all of `src` are only `renderForm.js` (GO :78/:968, Request :66/:946); `next: "setting"`
in JS across all `src` → **0**; `"next"/"path": "setting"` across all `src/json` → **0**; any `"setting"`
literal outside the component and its json → only the `case` label. The deep-link vector is structurally
closed: `AppUrlListener.tsx` calls `navigate(slug)` with **no `state`**, and `renderForm` reads `next`
from location state.

⚠️ **One residual is open and is NOT closed.** `history.js:20` sets `next` from **server-controlled**
category data (`category.split("/")[0].toLowerCase()`; same shape in `requestHeader.js`,
`requestOrder.js`). A category literally named "Setting" would route there. Implausible — but unproven.
**A deletion is only as safe as the weakest link in its unreachability argument, and this is that link.**

## Current behaviour, per platform

| | tapping **Settings** |
|---|---|
| **Android** | **Works.** `capacitor-native-settings` 8.1.0, `NativeSettingsPlugin.java:42`. Opens the app settings page; the promise settles on **return** (`startActivityForResult` + `@ActivityCallback`), so the re-check runs at the right moment. Correct by design. |
| **iOS** | **An alert reading exactly `{"code":"UNIMPLEMENTED"}`.** Settings never opens. |

### The iOS chain, each link read first-hand
The client calls the **Android-only** `NativeSettings.openAndroid(...)`. The Swift plugin registers only
`openIOS` and `open` (`NativeSettingsPlugin.swift:15-18`; the pod **is** in the build, `Podfile:31`). The
**JS layer never reaches the native bridge** — `@capacitor/core` 8.4.2 `dist/index.js:88-109`:
`pluginHeader` truthy, `methodHeader` undefined, and the web fallback is not loaded for `'ios'`. So `fn`
is undefined, throws inside a `.then()`, and surfaces as a **rejected promise**, which
`.catch(err => alert(JSON.stringify(err)))` renders.

⭐ **The one string that would explain anything is the one that gets stripped.** `CapacitorException`
does `super(message)` and then reassigns `this.message`, so `message` stays **non-enumerable** and
`JSON.stringify` drops it; `data` is undefined and also dropped. Only `code` survives. Confirmed under
node — own enumerable keys `["code","data"]`, `message` descriptor `enumerable:false`. The framework's
own text is *"NativeSettings.openAndroid() is not implemented on ios"*; the user, the support agent and
the developer reading a screenshot all get `{"code":"UNIMPLEMENTED"}` instead.

⛔ **This kills the obvious wrong diagnosis.** Reasoning from the **native** side alone predicts a hung
promise and **no alert at all** (`CapacitorBridge.swift:483-489` logs and returns without settling).
That is not what happens. **Anyone who "fixes" this by reading the native side fixes the wrong thing.**

## ⛔ The two-line fix exists, and shipping it alone would be a false green

`openIOS({ option: IOSSettings.App })` is registered and is the exact semantic twin of Android's
`ApplicationDetails`: `IOSSettings.App` = `"app"`, and `NativeSettings.swift:57-59` returns
`UIApplication.openSettingsURLString`, Apple's sanctioned "open this app's settings pane" URL.

**But it would not make the screen work.** iOS resolves via
`UIApplication.shared.open(url) { success in call.resolve(...) }` — the completion fires **when the app
finishes backgrounding**, not on return. So the `.then` re-check runs **while the user is still standing
in Settings**, `checkPermissions()` still reads denied, and control falls into an **empty `else if`
block**. The Gopher grants permission, returns, and is **stranded on the same screen**.

AC4's wording — *"the Settings button opens app settings"* — **would be satisfied by that change**. A
real fix also needs a resume-based re-check (`App.addListener('appStateChange')`) on the iOS path.

⚠️ **`IOSSettings.LocationServices` is the trap that looks like the answer.** It maps to the private
`App-prefs:` scheme; if `canOpenURL` fails the plugin calls `call.reject(...)`, landing in the **same**
`.catch` and showing the **same alert** — so it would look like it changed nothing. (That App Review
rejects `App-prefs:` is **inherited**, not verified here.) `IOSSettings.App` is the safe target.

## ⚠️ A correction to G40-481's own text
The ticket cites `ImageElement.js:44-53` as "the correct pattern" in **both** apps. **GO-accurate only.**
Request has a separate `handlePermissionDenied()` using `isIOS ? openIOS : openAndroid` behind a
`window.confirm` — same call pair, different shape, different lines. **Copying "44-53" into Request
copies the wrong thing.** `isIOS`/`isAndroid` both live at `src/helpers/index.ts:21-22` in both repos.

## Related: the copy is wrong in one app regardless
The file is **byte-identical across both repos** while being Gopher-specific throughout — the **Request**
copy still says *"show your nearby requests"*, calls `apptype=gopher`, branches on `gopher_type_id` and
navigates to `gopherrequest`. Both copies also carry a hardcoded `lat=23.3807208&lon=85.2942207`
(**Ranchi, India**). Harmless while unreachable; **actively wrong the moment it is not**, because the
screen would confidently show a Gopher the wrong place rather than failing visibly.

## The open decision

**Is this screen the answer to G40-480?** G40-480 covers a live, reachable dead end — a Gopher without
"Always allow" hits a bare OK alert with nowhere to go. This screen is a built, styled, nearly-working
answer to exactly that user, sitting unreferenced two files away.

⛔ **So G40-481 and G40-480 are one decision wearing two numbers, and it is the owner's.** The full
plain-language case, with entry-point options and risk/reward, is in the sprint folder at
`decisions/G40-481-AC5-owner-case.md`.

**Nothing has been built. No branch was cut. Nothing was deleted.**

## Not verified on a device
All of the above is from shipped code, framework source, and one local node experiment for the error
text. This is permission behaviour — **only a real handset confirms it**, an emulator is actively
misleading, and nothing merged now reaches a phone until the next Appflow build.
