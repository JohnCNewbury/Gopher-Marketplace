# Android: the splash never draws — and our 2.5s config holds a blank screen instead

**Found 2026-09-10, first time either app has been run on Android.** Both apps, same cause.

## What a user sees

Tap the icon on Android 12+ and **nothing Gopher appears for ~4–5 seconds.** Not a splash, not a
white screen — *the launcher home screen*, or whatever app was on screen before. Then the app
appears all at once.

The 26 `splash.png` drawables per app are never shown on Android 12 or newer. They still work on
API ≤ 30.

## Measured, on a cold-booted Pixel-class AVD — Android 16 (API 36), 1080×2400 @ 420dpi

| App | `launchShowDuration` | `am start -W` TotalTime |
|---|---|---|
| Gopher Go | **2500** (what we merged) | **4790 ms** |
| Gopher Go | 0 (mutation) | **1403 / 1067 ms** |
| Gopher Request | **2500** | **4127 / 4128 ms** |

All warm launches, taken after a throwaway launch so dex/profile work is not counted. The mutation
was verified as *applied* before believing it — `capacitor.config.json` in the built APK read
`launchShowDuration: 0`.

So our config accounts for roughly **3.4 seconds** of the delay. It did not create the invisibility;
it made an already-invisible splash last five times longer.

## Why nothing draws — cause, not inference

`android/app/src/main/res/values/styles.xml`, **identical in both apps**:

```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
    <item name="android:windowIsTranslucent">true</item>
</style>
```

Under `Theme.SplashScreen` on API 31+ the system draws the splash window itself, from
`windowSplashScreenBackground` and `windowSplashScreenAnimatedIcon`. **Neither is set**, there is
no `postSplashScreenTheme`, and there is no `values-v31/` override in either app. What *is* set is
`windowIsTranslucent`, which makes the launch window see-through.

WindowManager confirms it directly on the transition:

```
m=OPEN f=TRANSLUCENT ...
isTopActivityTransparent=true  isActivityStackTransparent=true
```

Capacitor's own plugin is behaving correctly — `SplashScreen.java` calls
`installSplashScreen()` + `setKeepOnScreenCondition`, which is exactly what honours
`launchShowDuration`. It holds a window that has been told to render nothing.

The behaviour is vivid when another app was in front: launching Request showed the **previous
app's screen** for four seconds.

## Why this is not a one-line fix

The Android 12+ splash is not a full-bleed image. The system masks the icon to a circle (≈240dp
outer, ≈160dp of usable inner area) on a flat background colour. The current `splash.png` is a
full-screen composition — it cannot be dropped into `windowSplashScreenAnimatedIcon` and look
right. Making this correct needs an **icon-shaped mark**, which is a design decision, not a port.

Options, cheapest first:

1. **Lower `launchShowDuration` on Android only** (Capacitor config takes a per-platform `android`
   override). Keeps 2.5s on iOS where the splash genuinely renders; stops holding a blank screen on
   Android. No new artwork.
2. **Add `values-v31/styles.xml`** with `windowSplashScreenBackground` (#ffffff),
   `windowSplashScreenAnimatedIcon` (a new circular mark), `postSplashScreenTheme`, and drop
   `windowIsTranslucent`. Correct fix; needs the icon asset.
3. Leave it. It has been this way for years and nobody reported it — but the 2.5s we merged makes
   it markedly worse, so doing nothing is a decision, not the status quo.

⚠️ **Not applied.** Option 1 is a one-line change but it alters shipped behaviour, and option 2
needs an asset the brand owns. Owner's call.

## What DID pass on Android

Verified on the same build, same device, after proving the installed APK was today's (`versionCode`,
`lastUpdateTime` and the bundle hash in logcat all checked — an earlier run was silently rolled back
to a 2026-09-04 build by the emulator's snapshot restore, and was discarded):

- **The redesigned sign-in screen renders correctly** — the approved lockup, "Welcome back.", the
  "Have a new number?" recovery link, and the short consent line.
- **The rebuilt Help Center renders correctly** — three buttons, correct order, correct colours,
  balanced vertically, nothing clipped at 411×914 dp.

## Repro

```
emulator -avd gopher-phone-36 -no-snapshot     # -no-snapshot, or a stale build is restored
adb shell settings put global airplane_mode_on 0 && adb shell svc wifi enable
# bump android/app/build.gradle versionName above the live floor, or the update gate hides everything
adb shell am start -W -n io.gophergoapp.go/.MainActivity
```
