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

## Options

1. **Give Android a real native splash — `values-v31/styles.xml`.** Set
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
