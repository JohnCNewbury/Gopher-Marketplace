# Android: the splash stopped drawing — a G40-203 regression, not an old defect

**Found 2026-09-10, the first time either app had been run on Android.** Both apps, same cause.

> ## ⚠️ CORRECTED the same day, and the correction IS the diagnosis
>
> The first version of this note said the native splash "has been this way for years and nobody
> reported it." Owner pushed back: *"the android old splash worked perfectly."* **He is right.**
>
> The Android splash users actually saw was **never the native one**. It was
> `src/component/formComponent/SplashScreen.jsx` rendering
> `assets_1/GopherGo-App-Animation-720x1280.gif` — a full-screen 1.66 MB animation
> ("Make more money per gig." → the gopher rises → "Transparent and fast pay.") drawn by React
> *inside the webview*, immediately after the invisible native window.
>
> So the native splash has been dead on Android 12+ all along **and it never mattered**: at the
> 500 ms default the invisible gap was too short to notice, and the GIF carried the entire
> perceived splash.
>
> Verified on device — an Android build from **2026-09-04**, predating the splash work, plays that
> GIF on launch, frame-for-frame identical to the asset.

## What a user sees now

Tap the icon on Android 12+ and **nothing Gopher appears for ~4–5 seconds.** Not a splash, not a
white screen — *the launcher home screen*, or whatever app was in front before. Then the app
arrives all at once.

## The causal chain

| | Android, before G40-203 | Android, now |
|---|---|---|
| native launch window | invisible, ~500 ms | invisible, **2500 ms** |
| what filled it | **the GIF splash** — branded | **nothing** |
| result | looked perfect | ~4.8 s of launcher |

Two G40-203 changes combined, each defensible on its own:

1. **The GIF was removed** (`25e714356`). Owner, 2026-09-09: *"when logging off, the old splash
   shows up. There should be no old splash and NO splash at all for logging off."* It was gated on
   `isSplash && !token`, and `isSplash` resets true on every mount, so a logout re-ran the
   cold-start splash. Removing it was correct.
2. **`launchShowDuration` 500 → 2500.** Owner, 2026-09-10: *"I would like the Splash to be at least
   2 full seconds. It appears in a flash (not a splash)."* Correct on iOS, where the launch
   storyboard genuinely renders.

The load-bearing assumption is in the comment written into `SignUp.js` at the time:

> *"The native launch screen already covers app start, so the sign-in form appears directly
> after it."*

**True on iOS. False on Android.** Removing the GIF was only safe if something else drew during app
start. Nothing does. Step 2 then stretched that nothing from half a second to two and a half.

## Measured — cold-booted Pixel-class AVD, Android 16 (API 36), 1080×2400 @ 420dpi

| App | `launchShowDuration` | `am start -W` TotalTime |
|---|---|---|
| Gopher Go | **2500** (what we merged) | **4790 ms** |
| Gopher Go | 0 (mutation) | **1403 / 1067 ms** |
| Gopher Request | **2500** | **4127 / 4128 ms** |

All warm launches, taken after a throwaway launch so dex/profile work is not counted. The mutation
was verified as *applied* before the result was believed — `capacitor.config.json` inside the built
APK read `launchShowDuration: 0`.

⚠️ An earlier run was measured against a **2026-09-04 build**: the emulator's snapshot restore had
silently rolled back the install. Caught by checking `versionCode`, `lastUpdateTime` and the bundle
hash in logcat, and discarded. Boot with `-no-snapshot`. (That discarded run is what later supplied
the "before" evidence above.)

## Why the native splash draws nothing

`android/app/src/main/res/values/styles.xml`, the same in both apps:

```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
    <item name="android:windowIsTranslucent">true</item>
</style>
```

Under `Theme.SplashScreen` on API 31+ the system draws the splash itself, from
`windowSplashScreenBackground` and `windowSplashScreenAnimatedIcon`. **Neither is set**, there is no
`postSplashScreenTheme`, and neither app has a `values-v31/`. What *is* set is
`windowIsTranslucent`, which makes the launch window see-through.

WindowManager confirms it on the transition:

```
m=OPEN f=TRANSLUCENT ...
isTopActivityTransparent=true  isActivityStackTransparent=true
```

Capacitor is behaving correctly — `SplashScreen.java` calls `installSplashScreen()` +
`setKeepOnScreenCondition`, which is exactly what honours `launchShowDuration`. It is faithfully
holding a window that has been told to render nothing.

Vivid version: launching Request while Go was in front showed **Go's screen** for four seconds.

## ⚠️ CORRECTED 2026-09-11 — the 2026-09-10 fix covered API 31+ ONLY, and that was not enough

**API 24–30 was left with no splash at all.** `minSdkVersion` is 24. The owner raised it on his own
handset, an Android 11 (API 30) Samsung SM-A505U:

> *"I would not want a different experience for users based on their device. I HAD a splash on my
> A50 and there is no reason i can have the new one."*

He is describing the GIF he used to see. **As it stood, 3.9.3 would have shipped LESS splash to
those users than 3.9.2 did.**

### The false claim, and where it was written

`values-v31/styles.xml` justified its own scope like this:

> *"Resource qualifiers REPLACE, so this whole style is redefined for v31+ and API ≤30 keeps the old
> translucent theme — where the legacy splash.png path still works."*

The first clause is true. **The second is false**, for two reasons neither established on 2026-09-10:

1. **Capacitor calls the Android-12 API path on every API level.** `SplashScreen.showOnLaunch()` →
   `showWithAndroid12API()`, with no `SDK_INT` branch (`SplashScreen.java:62-79`). The legacy
   ImageView/dialog route is only its catch-block fallback. So the 26 `splash.png` drawables are
   dead on the launch path on **every** Android version — the finding in this doc was never
   API-31-specific, and reading it that way is what produced the gap.
2. **`androidx.core:core-splashscreen` backports the whole mechanism through UNPREFIXED
   attributes**, and forwards them to the platform ones on 31+. From the library's own
   `res/values-v31/values-v31.xml`:
   `<item name="android:windowSplashScreenAnimatedIcon">?windowSplashScreenAnimatedIcon</item>`.
   The base `values/styles.xml` alone would always have covered API 24 through 36, and
   `values-v31/styles.xml` was **redundant from the start**, not merely incomplete.

### The fix

`values/styles.xml`, `AppTheme.NoActionBarLaunch`, one file per app: drop
`android:windowIsTranslucent`, add `windowSplashScreenBackground` /
`windowSplashScreenAnimatedIcon` / `postSplashScreenTheme` **unprefixed**.

**No `MainActivity` change** — Capacitor already calls `installSplashScreen()`, so adding one there
would be a duplicate. No new dependency. `launchShowDuration` untouched.

| Repo | MR |
|---|---|
| `gopher-mobile-gopher-capacitorjs` | [!309](https://gitlab.com/gophergo/gopher-mobile-gopher-capacitorjs/-/merge_requests/309) |
| `gopher-mobile-requester-capacitorjs` | [!323](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/323) |

Verified by resource linking on both apps — `aapt2 dump` of the linked `.ap_` shows the unprefixed
attributes resolving to real library attr IDs in the default config (not silently dropped), with the
v31 platform attrs still applying above it:

```
() default config   postSplashScreenTheme(0x7f0303e8)=@style/AppTheme.NoActionBar
                    windowSplashScreenAnimatedIcon(0x7f03057a)=@drawable/splash_icon
                    windowSplashScreenBackground(0x7f03057c)=@0x0106000b
(v31) config        0x0101062c=@0x0106000b
```

⚠️ **Not yet verified on an API 30 runtime** — built and resource-verified, not yet *seen to draw*.
The release-notes session is running an API 30 emulator.

⚠️ **The lesson, because it is the second time on this same defect.** The 2026-09-10 fix was scoped
from a remembered platform rule (`android:windowSplashScreen*` is API 31+) without checking what the
already-present compat library did, and the scope decision was then written into a code comment as
if established. A measurement on ONE API level does not license a conclusion about the others.

---

## ✅ FIXED 2026-09-10 — option 1, built and verified (API 31+ only — see the correction above)

`values-v31/styles.xml` + `splash_icon.png` at five densities, both apps. Verified on a
cold-booted API 36 emulator: **white ground, mark centred, ~3.4 s, fading into the redesigned
sign-in screen.** No launcher stare, no GIF.

| Repo | MR |
|---|---|
| `gopher-mobile-gopher-capacitorjs` | [!304](https://gitlab.com/gophergo/gopher-mobile-gopher-capacitorjs/-/merge_requests/304) |
| `gopher-mobile-requester-capacitorjs` | [!316](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/316) |

⚠️ **`/android` is in `.gitignore`, but 128 files under `android/` are already tracked.** New files
there are invisible to `git status` and skipped by a plain `git add` — these needed `git add -f`.
Anything else added under `android/` must be too, or it will silently never ship.

## Options as they stood before the fix

1. **Give Android a real native splash — `values-v31/styles.xml`.** ← done Set
   `windowSplashScreenBackground` to `#ffffff`, `windowSplashScreenAnimatedIcon` to the approved
   mark, `postSplashScreenTheme` to `AppTheme.NoActionBar`, and drop `windowIsTranslucent`.
   Android 12+ masks that icon to a circle on a flat ground — **which is exactly the mark-on-white
   splash already approved** ("Balanced 36%"). The full-bleed `splash.png` cannot be reused as the
   icon, but the mark inside it can. This is what makes Android match iOS at 2.5 s.
   ⚠️ Confirm the icon canvas and safe-zone sizes against Android's current docs at implementation
   time rather than trusting a remembered number.
2. **Stopgap — an Android-only `launchShowDuration`.** Capacitor takes a per-platform override, so
   iOS keeps 2.5 s and Android drops to ~0. Removes the blank stare, but leaves Android with no
   splash at all: a fast, unbranded launch. One line, no artwork.
3. **Do NOT simply restore the GIF.** It fixes Android and re-breaks what the owner asked for: it
   reappears on every logout, it is old branding, and on iOS it puts two different marks on screen
   within two seconds. If a web splash is ever wanted again it must be gated on a process-lifetime
   flag, not `isSplash`.

**Recommendation: 1, with 2 only if the store build cannot wait for the asset.** Doing nothing is
not "the status quo" — the status quo had a working splash.

⚠️ **Nothing applied.** Option 1 needs an asset decision; option 2 changes shipped behaviour.

## What DID pass on Android

Same build, same device, with the installed APK proved to be today's:

- **The redesigned sign-in screen renders correctly** — approved lockup, "Welcome back.", the
  "Have a new number?" recovery link, the short consent line.
- **The rebuilt Help Center renders correctly** — three buttons, right order, right colours,
  balanced, nothing clipped at 411×914 dp.

## Repro

```
emulator -avd gopher-phone-36 -no-snapshot     # -no-snapshot, or a stale build is restored
adb shell settings put global airplane_mode_on 0 && adb shell svc wifi enable
# bump android/app/build.gradle versionName above the live floor, or the update gate hides everything
adb shell am start -W -n io.gophergoapp.go/.MainActivity
```
