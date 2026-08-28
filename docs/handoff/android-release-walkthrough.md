# Android release — page-by-page walkthrough

Written 2026-08-28 01:00. Everything below is what remains AFTER tonight's four green builds.
Baseline numbers and the reasoning behind the QA order: `android-release-2026-08-baseline.md`.

**Where things stand right now:** both AABs are uploaded to Play as **internal-track DRAFTS**.
Nothing is published. Play production is still serving the March builds (Go 856/3.9.0,
Request 840/3.8.0).

| app | package | new build | replaces |
|---|---|---|---|
| Gopher GO | `io.gophergoapp.go` | **864 / 3.9.1** | 856 / 3.9.0 |
| Gopher Request | `io.gophergoapp.requester` | **852 / 3.9.1** | 840 / 3.8.0 |

⚠️ Ignore the `io.gophergo.*` entries in the app list — dead listings Google removed.

---

## PHASE 1 — Publish the internal drafts

Do this twice, once per app. ~5 minutes each.

### 1.1 Open the app
`play.google.com/console` → **Gopher GO** (the one with 2.2K installs, `io.gophergoapp.go`).

### 1.2 Go to the internal track
Left nav → **Test and release** → **Testing** → **Internal testing**.

### 1.3 Find the draft
The **Releases** tab lists a release containing **864** with status **Draft**.
Click **Edit release** on that row.

### 1.4 Fill in release notes
The **"What's new in this release"** box must have text for at least one language or the
**Next** button stays greyed out. Suggested:

    Capacitor 8 and Android 16 (API 36) support.
    Updated background location SDK and licence.
    Includes all fixes merged since the March release.

### 1.5 Publish it
**Next** → review screen → **Start rollout to Internal testing**.

Internal testing needs no Google review. Live for testers within minutes.

### 1.6 Confirm you are a tester
Same page → **Testers** tab. Your account must be on one of the listed email lists.
Copy the **opt-in URL** shown there — you need it in Phase 2.

### 1.7 Repeat for Gopher Request
Same path, `io.gophergoapp.requester`, release **852**.

---

## PHASE 2 — Install from Play, not from Appflow

You already sideloaded the Appflow APKs. Same code, but **two things do not work from a
sideloaded build**:

- **Crashes never reach Play Vitals** — vitals only collects from Play-installed apps. Without
  this, you cannot compare against the baseline, which is the whole point of having captured it.
- **The signature differs.** You signed with the upload key; Play re-signs with the app signing
  key. Anything keyed to a certificate fingerprint — **Google Maps rendering**, FCM, Google
  Sign-In — may behave differently. A blank/grey map on the sideloaded build is very likely a
  SHA-1 restriction, NOT a defect. Compare fingerprints under **Test and release → Setup →
  App integrity** before chasing one.

**So:** uninstall the sideloaded APKs, open the opt-in URL from 1.6 on the phone, accept, then
install each app from the Play listing.

---

## PHASE 3 — Device QA

Ordered by what this release most likely broke or fixed. Full reasoning in the baseline doc.

- [ ] **GO — run a real job, watch locations reach the backend.**
      The only test of the **Android** Transistorsoft licence (a different key from the iOS one
      already proven), and the only way to see whether the `ForegroundServiceDidNotStartInTime`
      crash — **73.5 % of Go's affected users** — moved in either direction.
- [ ] **BOTH — open the photo picker.** `CameraPlugin.lambda$openPhotos$4` NPE is in both apps'
      crash lists and is 50 % of Request's events.
- [ ] **BOTH — show and hide the keyboard** on a text field. `Keyboard$1.onEnd` NPE, the other
      50 % of Request's crashes.
- [ ] **BOTH — check for content under the status bar and the navigation bar.** `targetSdk 36`
      ENFORCES edge-to-edge; Play already flags this on the live builds. Most likely visual
      regression in the release.
- [ ] **BOTH — open on a tablet or foldable.** API 36 ignores orientation and resizability
      restrictions on large screens.
- [ ] **BOTH — sign in, complete one request end to end.**

**If anything fails:** stop. Do not promote. Fix, rebuild, republish to internal.

---

## PHASE 4 — Promote to Production (staged)

⚠️ **Unlike internal, a production release IS reviewed by Google.** Budget hours, occasionally
days. Do not start this expecting same-hour availability.

**Recommendation: promote Gopher Request FIRST**, then Go a day later.
Request has the smaller change set (76 commits vs 98), no background-location dependency, and
the clearest expected win — it is currently **over** Google's crash threshold at 1.17 %, and its
entire measured crash surface is the two Capacitor plugin bugs this release may fix. Go carries
the riskiest subsystem (background location), so it benefits from watching Request land first.

### 4.1 Promote
**Test and release → Testing → Internal testing** → on the release, **Promote release** →
**Production**.

### 4.2 Set a staged rollout
On the production release page, set the rollout percentage to **5 %** (10 % at most).
Do NOT do a full rollout. 98 commits landing at once on an app with a known crash-rate problem
is the highest-risk shape there is.

### 4.3 Release notes and review
Same notes as 1.4. **Start rollout to Production** → Google review begins.

---

## PHASE 5 — Watch, then widen

Compare against the baseline (`android-release-2026-08-baseline.md`):

| | live today | threshold |
|---|---|---|
| Go crash rate | 0.85 % | 1.09 % — currently UNDER |
| Request crash rate | **1.17 %** | 1.09 % — currently **OVER** |

- **Android vitals** takes ~24h to populate meaningfully. **Sentry is faster** — check it first.
- Hold at 5 % for at least **24–48 hours**.
- **Halt and roll back if:** either crash rate rises above its baseline, or a new crash cluster
  appears that is not in the baseline's top-10 lists.
- If flat or improving: **5 % → 20 % → 50 % → 100 %**, a day or more at each step.

**No OTA exists.** Every fix after this needs another store cycle. That is the whole reason for
the staged rollout.
