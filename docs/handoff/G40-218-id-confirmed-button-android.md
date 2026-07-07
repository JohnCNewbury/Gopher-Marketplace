# G40-218 — "ID and Identity Confirmed" button unresponsive on Android — DEV HANDOFF

**Type:** Bug (`worker`) · **Priority:** Medium (ticket flags **high-severity** — forces admin override, degrades dispute audit trail) · Gopher Go, Android only, on-site ID-capture (non-TrustShield) path. Verified against the 2026-06-12 `gopher-mobile-gopher-` export. Ref user 103692 / order 49331 / Samsung Galaxy A36.

## Root cause (verified in code — matches "no error, no spinner")
The button is **not broken — it's `disabled`**, because the ID photo never lands in form state on Android.

1. **The button is gated on `formik.values.id_image`.** `src/component/ordercard.js:10837-10846` — the "ID and Identity Confirmed" button (`onClick → requestComplete(true)`, `:10852`, label `:10855`) is `disabled` when `!props.formik.values.id_image` (unless `idNotConfirmedScreen` / waiting-timer states). Empty `id_image` ⇒ button disabled ⇒ tap does nothing, no spinner, no error. Exactly the symptom.
2. **`id_image` is only ever set by the camera capture** — `src/component/cameraPreviewBox.js:74` `props.formik.setFieldValue("id_image", file)`, inside `takePicture()` (`:66-79`):
   ```js
   const result = await CameraPreview.capture(cameraPreviewPictureOptions); // @capacitor-community/camera-preview
   const base64String = result.value;
   const imageBlob = base64ToBlob(base64String, "image/jpeg");   // does atob(base64String) directly
   const file = new File([imageBlob], "image.jpg", { type: "image/jpeg" });
   props.formik.setFieldValue("id_image", file);
   ...
   } catch (error) { Sentry.captureException(error); }   // ← swallows silently, id_image never set
   ```
3. **The Android failure point** is that capture→convert chain. `base64ToBlob` (`src/helpers/convertBase64ToBlob.js`) calls **`atob(base64)` with no sanitization**. The camera-preview plugin's `capture().value` is not byte-identical across platforms — on Android it can carry a `data:image/jpeg;base64,` **prefix** and/or whitespace/newlines, which makes `atob()` throw `InvalidCharacterError`. That throw hits the silent catch at `:78`, so `id_image` stays empty and the button remains disabled. (iOS returns clean base64 → works. TrustShield path never uses this capture/`id_image` gate → unaffected. Both facts match the ticket.)

**Net:** a client-side, Android-specific capture failure that is silently swallowed, leaving the confirm button permanently disabled with zero feedback.

## Two defects to fix

### 1. The capture chain fails silently on Android → make it robust + loud
- **Sanitize before `atob`** in `base64ToBlob` (or in `takePicture` before calling it):
  ```js
  const clean = base64.replace(/^data:.*;base64,/, "").replace(/\s/g, "");
  const byteCharacters = atob(clean);
  ```
  This alone likely fixes the Android `atob` throw.
- **Validate the produced File** before gating on it: confirm `file.size > 0`; if the capture/convert failed, surface a clear **"Couldn't capture the ID — please retake"** error and let the Gopher retry. Do **not** leave `id_image` empty with no feedback.
- Replace the `Sentry.captureException` **only** catch (`cameraPreviewBox.js:78`) with Sentry **plus** a visible, actionable error.

### 2. The completion + button must never silently no-op (AC5 + business rule)
- `requestComplete` (`ordercard.js:1501`) also has a **silent catch** (`~:1586`) — it resets loading and closes the pullover but shows the Gopher **nothing** on failure. Surface a clear error there too.
- The confirm button must **never** be a silent dead end: either keep it enabled and validate on press (showing "ID photo missing — retake" when `id_image` is absent), or show *why* it's disabled. Per the business rule it must "succeed, surface a clear error, or transition to a recoverable state."

## Verify while implementing
- Reproduce on the Galaxy A36: log `result.value.slice(0,32)` from `CameraPreview.capture` on Android vs iOS to confirm the prefix/format difference driving the `atob` throw.
- Confirm `@capacitor-community/camera-preview` version + Android `resultType`/format options are consistent with iOS.
- Camera permission robustness: `checkCamera()` (`cameraPreviewBox.js:43`) alerts + opens Android settings on denial but doesn't re-verify after return — confirm capture is retried/permitted after the user grants.

## Acceptance mapping
- S1/S2 (Android happy path, previously-affected devices) → sanitized capture sets `id_image` → button enabled → `requestComplete(true)` → `/orders/{id}/complete/v2` → ratings screen.
- S3 (iOS) / S4 (TrustShield) → unchanged (neither hits the changed capture gate) — regression-test.
- S5 (backend/capture failure surfaces) → the new error-surfacing in both catches.
- S6 (no admin override) → completion now succeeds from the Gopher device; audit actor = Gopher.

## Files to touch
- `src/helpers/convertBase64ToBlob.js` — sanitize base64 before `atob`.
- `src/component/cameraPreviewBox.js` (`takePicture` `:66-79`) — validate File, surface capture errors (not Sentry-only).
- `src/component/ordercard.js` — confirm button gate (`:10837-10846`) + `requestComplete` catch (`~:1586`) error-surfacing. Note the same "ID and Identity Confirmed" button/`id_image` pattern also appears at `ordercard.js:8631/9473/11334` and `src/component/layoutComponent/RequestDetailPullOver.js:1479/1569` — apply the fix consistently.
