# Session handoff — G40-425 lane — 2026-09-04

**Read this top to bottom before touching G40-425.** Everything below was verified first-hand in
this session unless explicitly marked otherwise. Where I state a fact I also state how it was
checked, because several claims here contradict older docs and tickets.

---

# PART 1 — G40-425 (the main lane) — DEFINED IN FULL

**Ticket:** G40-425 — *"Neither app persists its config — /mobile-config is an uncached hard gate in
front of BOTH entire apps"* (ledger F-024). Also closes **F-026** (cold-start refresh gap) — the two
could not be done separately, see §1.4.

**Sprint:** moved TrustShield → **Payment Options** (id 743, Sept 9–16) by owner decision 2026-09-04.
**Status:** To Do. **Merge is HELD by the owner until the iOS half of AC6 passes.**

> ## ✅ MERGED 2026-09-05 (owner instruction, same session). Request !276 → `production` merge commit `5fe5927a0`; Go !273 → `production` merge commit `39dd80358`. Squash no, source branches deleted. Verified by content: `src/services/mobileConfigCache.js` present on `origin/production` in both repos. **Client-only — not live until a store release.** Worktrees removed.
>
> ## ✅ UPDATE 2026-09-05 — the iOS half of AC6 PASSED. AC6 is complete. Merge is no longer held.
>
> Run by the owner on his **iPhone 15 Pro Max (iOS 26.6.1)**, driven from this Mac by the G40-425
> follow-on session. Builds were local Xcode Debug builds of the pushed branch heads (`b5b7f84d1`
> Request, `5ec6ad99c` Go), installed with `devicectl`. Nothing on the branches changed.
>
> | | cached config + airplane mode | control: device-level uninstall → reinstall → airplane mode ON before first open |
> |---|---|---|
> | Request | past config → session prompt → **full home screen** (offline banner, all four request buttons) | **"Failed to load configuration"** |
> | Go | **full Go home screen** (tabs, order list waiting on network) | **"Failed to load configuration"** |
>
> Step 5 (resume after airplane off) confirmed: no loading flash. Same build, same network state,
> only the cache differed — so WKWebView `localStorage` **does** survive a full process kill, which
> was the one question iOS could genuinely fail.
>
> **⚠️ The first control attempt was VOID, and the reason matters for anyone repeating this.** The
> owner deleted both apps from the Home Screen, I reinstalled, airplane mode on, and both apps
> **reached sign-in** — i.e. the cache was still there. A device-level `devicectl device uninstall`
> (which removes the data container), reinstall, then airplane mode produced the correct failure on
> both. Either the Home Screen removal did not purge the container or an app was launched for an
> instant before airplane mode; I could not distinguish. **Always run the iOS control with a
> device-level uninstall**, not a Home Screen delete.
>
> **Two corrections to §1.9 (iOS local build):**
> - `MARKETING_VERSION` is **NOT** 13.9.0 in either Xcode project — it is **13.1.1 (Request) and
>   13.0.3 (Go)** on the branch heads. Appflow injects `IOS_VERSION` at build time; the projects do
>   not carry it. The live endpoint returns `requiresUpdate: true` for both project values and
>   `false` at 13.9.0, so a local device build **needs the bump** (I used 13.9.1) exactly as Android
>   did. **Reverted, verified against the pushed refs.**
> - Xcode could not reach either iPhone for ~40 minutes ("Connection was invalidated",
>   `tunnelState: unavailable`, "previously reported preparation errors") despite replug, Trust and a
>   phone restart. The Mac-side **`remotepairingd` and `CoreDeviceService`** (user-owned XPC
>   services, up since boot) were the stuck party — `kill`ing both brought **both** phones online in
>   seconds. They are not `launchctl` services; `kickstart` does not find them.
>
> Also observed: after dismissing the session prompt, a signed-in Request user gets the **home screen**
> offline, not just the prompt. §1.7's caveat stands (the data behind the buttons still needs the
> network) but the app is more usable offline than §1.7 describes.
>
> **Merge hand-off (unchanged):** target **`production`** · squash **no** · delete source branch
> **yes**. Per the owner's 2026-09-04 ruling, recorded in `standing-rules.md` (`b024ae2`), mobile MRs
> target `production` while the owner is the sole author; **do not retarget to `next`.**

## 1.1 What is on the branches right now

| repo | branch | HEAD | MR |
|---|---|---|---|
| `gopher-mobile-request` | `G40-425-persist-mobile-config` | **`b5b7f84d1`** | **!276** |
| `gopher-mobile-gopher` | `G40-425-persist-mobile-config` | **`5ec6ad99c`** | **!273** |

Both branches are pushed and match their remotes exactly (verified with `ls-remote`). Both worktrees
are clean — **zero uncommitted changes**.

**Merge hand-off, already stated on both MRs:** target **`production`** · **squash: no** (the commits
carry the reasoning) · **delete source branch: yes**.

⚠️ `production` is the live line, NOT `next`. Verified: `production` was 94 (Request) / 45 (Go)
commits ahead of `next`, and G40-419/420/426 all merged to `production`. `next` was later reset to
equal `production` by another session — I re-verified `origin/next == origin/production` in both
repos. **My branches were cut from `production` and are unaffected by that reset** (merge-base
confirmed on production's history).

Both branches are now a few commits behind `production` (2 Request, 7 Go). Conflict risk is low:
only 3 commits in 3 weeks have touched my files, and they were the F-023/F-025 fixes in the same
area.

## 1.2 Files changed

**Both apps, identical:**
- `src/services/mobileConfigCache.js` — **NEW.** The whole cache: read/write/validate/clear, the
  version-stamp check, and the logout-preserving clear. Byte-identical in both repos.
- `src/services/mobileConfigCache.test.js` — **NEW.** 32 tests. Byte-identical in both repos.
- `src/mobileconfig.tsx` — seeded state, background-refresh shape, resume listener, stale-gate effect.
- `src/actions/action.js`, `src/pages/summary.js`, `src/helpers/index.ts` — `localStorage.clear()`
  → `clearStoragePreservingConfig()`.

**Request only:** `jest.services.config.json` (**NEW**, copied from Go) and a `test:services` script
in `package.json`. Go already had a jest runner; Request had none, so its copy of the module was
untested. Test-only, does not ship in the bundle.

**Go only:** `src/pages/SignUp.js` also had two `clear()` calls.

Run the tests: `npm run test:services` in either repo (or
`npx jest --config jest.services.config.json`).

## 1.3 The design decisions — DO NOT "FIX" THESE WITHOUT READING WHY

Each of these looks wrong at a glance and is deliberate. The reasoning is also in the code comments,
but it is collected here because a reviewer is the most likely person to undo one.

**1. `localStorage`, NOT `@capacitor/preferences`.**
Preferences is not a dependency of either app. Adding it means a new native plugin and a `cap sync`
— native project churn days before a store release — for no functional gain. `localStorage` is
already used in 80+ files per app and survives a process kill in both WKWebView and Android WebView.
If iOS ever evicts it we fall back to fetching, which is exactly today's behaviour, so the worst case
is no worse than now.

**2. `requiresUpdate` IS persisted, and that makes the kill switch STRONGER, not weaker.**
It is persisted so that a device already told to update stays gated across restarts with no network —
going offline must not be an escape hatch. It also gates *from cache*, and it is the one thing a
background refresh is allowed to put on screen over live content. A kill switch that politely waits
for a restart is not a kill switch.

**3. …but a cached gate is stamped with the app version, and only counts for THAT version.**
Without this, persisting the gate locks out the users who complied: told to update → they update
through the store → they open the new build **offline** → the stale `true` gates a perfectly good
build with no network to clear it. `isGateStillOurs()` compares the stamped version to
`App.getInfo().version`. That call is **local**, so it resolves in airplane mode — which is exactly
when it matters. Runs on mount only, so a verdict arriving later from the server (which *is* about
this build) is never second-guessed.

**4. Ambiguity always resolves to NOT GATED.** Missing/malformed `requiresUpdate`, missing/malformed
`appVersion` → not gated. Defaulting the other way would lock every user out of both apps on one bad
response. That asymmetry is deliberate and is pinned by tests.

**5. Only three fields are persisted**, never the whole response. Both keys are *publishable* (Stripe
publishable key, Maps browser key) and already ship inside the bundle, so storing them adds no
exposure. Storing the response wholesale would persist whatever the server adds later, unseen.

**6. The refresh is background-only and must never set `isLoading`.** The render gate is on
`isLoading`; flipping it true after boot would unmount the app and flash "Loading configuration…"
over live content. This is precisely why a resume listener had been tried and rejected before.

**7. Production never writes `moderation_rules.json`-style tracked files — see §1.5 defect 1.**

## 1.4 Why F-026 is in the same change

`requiresUpdate` only ever evaluated at cold start, so a resident device could ignore the kill switch
indefinitely. The fix is an `App.addListener("resume")` background refresh. That is **only safe once
the refresh is background-only**, which is what this change makes it. They are one job, not two.

## 1.5 Three defects I introduced and fixed — do not reintroduce

Each was found by looking harder, not by a test failing. That density is why the owner is holding the
merge for verification.

1. **Writing a git-tracked file from production.** The first cut persisted the topped-up corpus back
   to disk to "self-heal the cache". Applied to the Dashboard's `moderation_rules.json` this left the
   EC2 host's working tree dirty on a **tracked** file, and `deploy-hq.sh` refuses to deploy over
   non-generated dirt — **it would have blocked the next deploy.** (That instance was G40-429; the
   same instinct is why the mobile fallback path does not write anything either.) Caught by checking
   the host's `git status` after a refresh instead of assuming the deploy was still healthy.
2. **A cached gate outliving its build** — see §1.3 item 3.
3. **Logout wiping the cache.** Both apps call `localStorage.clear()` from logout (`removeToken`),
   the `DeleteStorage` action, and the "You are not authorised." branches — **10 sites across the two
   repos**. Every one wiped the config as collateral, so an unrelated 401 left the next cold start
   with nothing to boot from. All 10 now route through `clearStoragePreservingConfig()`. **Zero bare
   `localStorage.clear()` calls remain in app code in either repo** — keep it that way.

Also fixed a bug in the test suite itself: `beforeEach` cleared storage *before* restoring mocks, so
the new test that mocks `Storage.prototype.clear` to throw leaked into the next test. **Restore now
precedes clear.**

## 1.6 What is verified, and how

| AC | Status | Evidence |
|---|---|---|
| 1 — both apps persist last good config | ✅ | 32 unit tests per app, byte-identical module |
| 2 — cold start with no network boots from cache | ✅ | Browser run + **Android on both apps**, with control |
| 3 — fetch becomes background refresh, failure silent | ✅ | Refresh failed against a dead backend, no error surfaced |
| 4 — `requiresUpdate` still hard-gates | ✅ | Cached `true` + dead backend → update screen, sign-in unreachable |
| 5 — refresh never unmounts / no loading over live content | ✅ | No loading flash on the cached-boot path |
| 6 — device, airplane mode, both apps, both platforms | **PARTIAL** | **Android ✅ both apps. iOS ⛔ both apps.** |

**The Android runs (the strongest evidence, reproduce this way):**

| | with cached config + airplane mode | control: app data wiped, same airplane mode |
|---|---|---|
| Request | got past config → session prompt | "Failed to load configuration" |
| Go | **full sign-in screen, usable** | "Failed to load configuration" |

Same build, same network state, **only the cache differs**. The control is what makes the pass mean
anything — without it a pass could be for any reason. **Always run the control.**

Go's result is the cleaner one: with no session behind it, the app reaches a fully usable screen
offline, which isolates the config layer unambiguously.

## 1.7 ⚠️ What this ticket does NOT deliver — do not overstate it

The description says a user "who only wanted to look at a past order is blocked by a network call
they never needed." **Removing the config gate does not deliver that.** In airplane mode the app now
clears config and immediately hits **"We couldn't verify your session just now — please sign in to
continue."**

**Config was one gate; session verification is a second gate directly behind it.**

- ✅ Genuinely fixed: `/mobile-config` is no longer a single point of failure in front of both entire
  apps. Cold starts proceed when that endpoint is unhealthy.
- ❌ Not delivered: offline access to your own data. Only *signed-out* users get a fully working app
  offline.

Whether offline read of cached data is wanted is a separate product decision. **No ticket opened.**

## 1.8 REMAINING WORK — the iOS half of AC6

**⛔ THE BLOCKER: iOS cannot be tested on any build cut from `production`.** Verified: the branch is
**not merged**, and `src/services/mobileConfigCache.js` **does not exist on `production`** in either
repo. A build from `production` — including any AppFlow build running now — does **not** contain this
change.

**This creates a false negative that will waste someone's evening:** test such a build in airplane
mode and you get "Failed to load configuration", which is *identical* to the fix failing.

**So one of these must happen first:**
- point an AppFlow build at `G40-425-persist-mobile-config`, or
- merge first and build from `production` — which contradicts the owner's hold.

**What iOS actually tests.** The logic is identical TypeScript already proven on Android, so it
reduces to **one question that can genuinely fail: does WKWebView's `localStorage` survive a full
process kill?** Android's WebView does. iOS is a different storage engine with different eviction
behaviour. If it does not persist, **this fix is a silent no-op on iOS** — the app shows "Failed to
load configuration" exactly as today, with nothing indicating why. That is the failure mode to watch
for: not a crash, just the fix quietly not existing.

Secondary: `App.getInfo()` resolves offline on iOS (the version-stamped gate depends on it), and a
resume does not flash the loading screen.

**The test, per app:**
1. Open online, reach the home/sign-in screen. (Seeds the cache.)
2. **Swipe the app fully closed.** Backgrounding is NOT enough — the 30-minute window is in memory
   and survives backgrounding, so it would pass for the wrong reason.
3. Airplane mode ON.
4. Open. **PASS:** the app renders. **FAIL:** "Failed to load configuration".
5. Airplane mode off → background → reopen. Nothing should flash.
6. **CONTROL:** delete and reinstall, airplane mode ON *before* first open. It **should** show the
   config error. If it does not, step 4 passed for the wrong reason.

## 1.9 Build traps (all hit and solved this session)

**Android local build:**
- Force-updated out until the **native** `versionName` is raised: `3.0.3` → `3.9.1` clears
  `android_requester 3.8.0` and `android_gopher 3.9.0`. `REACT_APP_VERSION` is **ignored** on device.
- Also needs a **`versionCode`** bump — the phone *and* the emulator already carry **901**, so a
  debug build at 63 is refused as `INSTALL_FAILED_VERSION_DOWNGRADE`.
- ⛔ **REVERT BOTH.** `android/app/build.gradle` is tracked. I reverted them and verified the pushed
  branches still carry `versionCode 63` / `versionName "3.0.3"`.
- `npx cap sync` must go through the repo's env-wrapped script (`npm run sync:android:<app>_production`)
  or it fails on `REACT_APP_APP_ID`.
- ⛔ **The owner's physical A50 was NOT written to.** The install was refused as a downgrade and I did
  not override it — forcing it would have replaced his real app. All testing was on the emulator
  (`gopher-phone-36`). Keep it that way.

**iOS local build:**
- `MARKETING_VERSION` is already `13.9.0` in both apps, which clears both minimums — **no version
  bump needed**.
- CocoaPods needs `LANG=en_US.UTF-8` or it dies on `Encoding::CompatibilityError`.
- The workspace scheme is **`gopher-requester`** (not `App`).
- ⚠️ **Pre-existing repo bug, NOT mine:** `@capacitor-community/camera-preview` is in `package.json`
  on `production` but **absent from the checked-in `Podfile.lock`**, so
  `npm run sync:ios:<app>_production` (which uses `--deployment`) **fails on a clean checkout for
  anyone**. I worked around it with a non-deployment `pod install` and reverted `Podfile`/`Podfile.lock`.
  **I did not fix it** — changing native deps days before a store release is not something to slip in.
  Worth its own ticket.
- My simulator attempt died on a simulator crash, not a code problem. Not retried.

## 1.10 My worktrees (delete after merge)

    <scratchpad>/wt-425-request   -> branch G40-425-persist-mobile-config, clean, b5b7f84d1
    <scratchpad>/wt-425-go        -> branch G40-425-persist-mobile-config, clean, 5ec6ad99c

Scratchpad root:
`/private/tmp/claude-501/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/1d1f5598-8dbd-4497-96ef-f91a7aa4aadb/scratchpad`

Both have `node_modules` **symlinked** to the main checkouts. That is fine for jest and gradle, but
be aware the symlink points at whatever branch the main checkout is on — it is why the iOS pod
lockfile mismatch appeared. Remove the worktrees with `git worktree remove` once the MRs merge.

---

# PART 2 — THE BIGGEST OPEN FINDING (not a ticket yet, needs an owner decision)

> ## ✅ G40-446 MERGED AND LIVE 2026-09-05 (owner instruction). MR !498 → `production` merge commit `87b532e2`, unsquashed, source branch kept. Deployed by CodePipeline/EB at 11:57:58 UTC (version label `code-pipeline-…-87b532e2…`), environment Green, zero 5xx after deploy, no limiter validation errors in the app log.
> **Live proof from this Mac (64.99.216.171):** before deploy, `RateLimit-Remaining` started at 28 and skipped numbers mid-window (other users drawing on the shared bucket); after deploy it decrements by exactly one per request. A 45-request parallel burst at 12:00:04 UTC: **30 × 200, 15 × 429**, and the next request after the window admitted. Log attribution of those 15 to this address alone is pending CloudWatch's ~20-min lag (recorded on G40-446 when read). **AC5 (Twilio non-keyword inbound) is the owner's to run.**
>
> ## ✅ UPDATE 2026-09-05 — ticketed, built, and up for the owner's merge; the Aug 30 cause is found
>
> - **G40-446** — the shared-bucket limiter. Fix built on `gopher-backend-api` branch
>   `fix/rate-limiter-per-client-ip` (`ad59815e`, cut from `production` `acde84af`), **MR !498 →
>   `production`, squash no, delete source no.** CI pipeline 2822720044 green on all six jobs.
>   `trust proxy` is set to **`['loopback', 'uniquelocal']`** — an address list, not `true` (forgeable)
>   and not a hop count (wrong by one if nginx's header handling differs; the live nginx config could
>   not be read because SSM was blocked for the session, so the fix was made independent of it). The
>   muted library validation is removed. Consumers re-checked on production: Twilio uses
>   `SERVER_BASE_URL`; the two hand-rolled `x-forwarded-for` parsers never touch `req.ip`; nothing
>   reads `req.protocol`/`req.hostname`. 14 new tests drive the real middleware over real HTTP.
>   **Merging auto-deploys to live.** Ceiling (30/s) deliberately unchanged — separate decision.
> - **G40-447** — **what Aug 30 17:20 UTC actually was.** Not abuse. EB autoscaling (trigger:
>   RequestCount 20000/4000) added a second instance at 17:18:36; **ALB stickiness is OFF**
>   (`StickinessEnabled=false`) and socket.io runs the in-memory adapter, so long-polling clients
>   hit the new instance, got `400 Session ID unknown`, and re-polled in a loop — **~110,000
>   `/socket.io/` hits in five minutes** from the apps' web views, which fed the RequestCount trigger
>   that caused it. The API calls riding alongside tripped the shared bucket → the 429s. Storm ended
>   when the instance was failed and removed at 17:33. Every future scale-out (and every "Rolling with
>   additional batch" deploy) repeats it. Infrastructure decision, options on the ticket.
> - The Retry-button feedback loop noted below still stands and is folded into G40-446's context.

## A global rate limiter is throttling the entire user base to 30 requests/second

This is **bigger than G40-425** and is **server-side — no store release needed.**

`gopher-backend-api/index.js` on `origin/production`:

```js
const limiter = rateLimit({ windowMs: 1000, max: 30, … });
app.use(limiter);            // global, every route
```

…and **`trust proxy` is NOT set.** Verified by grep, and corroborated by two existing comments in the
codebase — `middleware/twilioWebhook.js:15`: *"because `trust proxy` is not enabled on this app —
behind the load balancer."*

**Mechanism:** behind the EB nginx proxy, `req.ip` is the **proxy's** address, so express-rate-limit
puts every request from every user into **one shared bucket**. That is **30 requests/second for the
entire user base, across all routes**, on a single running instance.

**Evidence — 7 days of production nginx logs.** 429s span **15+ distinct routes**, ~3,200 blocked
requests:

| route | blocked |
|---|---|
| `socket/emit/gopher-location-change` | 529 |
| `mobile-config` | 445 |
| `orders/available-active` | 404 |
| `users/messages` | 333 |
| `apiversion` | 223 |
| `users/payment_account/check` | 186 |
| …9 more | |

That breadth **rules out anything route-specific** and is exactly what a shared bucket predicts (this
was run as a falsifiable prediction, not a fishing trip). On `/mobile-config` alone: **387 of the 445
blocks landed in a single hour — Aug 30, 17:00 UTC** — with the remaining 58 spread thinly across the
week. A burst pushes total throughput past 30/sec and **everyone is throttled at once**.

A 429 on `/mobile-config` is a **hard block**: `!res.ok` throws, the user cannot open the app at all.

**The fix, and the trap in it:** set `trust proxy` so the limiter keys on real client IPs. It must be
`app.set('trust proxy', 1)` — trust exactly one hop — **NOT `true`**. `true` would let anyone forge
`X-Forwarded-For` and evade rate limiting entirely, turning an availability bug into a security one.
The 30/sec ceiling probably also wants raising, but that is a second decision.

⚠️ **I did not change it.** Production abuse-protection on live infrastructure needs the owner's
decision with risk stated on both sides.

⚠️ Also: the config error screen has a **Retry** button, so a blocked user hammering Retry generates
more requests against the very limit blocking them. **An incident is somewhat self-sustaining.**

**Open questions for the owner:** (a) open a ticket for this? I did not, to avoid padding the
backlog. (b) Was Aug 30 organic traffic or something anomalous? Nobody has looked, and the cause
matters before anyone changes a limit.

---

# PART 3 — everything else in this session

## G40-429 — DONE, deployed, verified (Dashboard repo)
`regen_reports.py` silent-degradation fix. Merged `c885e0b`, deployed to the EC2 host `8d7bfb1`,
18/18 tests under the host's Python 3.12, tracked tree clean after a full refresh. Ticket **Done**
with AC1 formally amended in the description (owner approved) — the literal wording would have taken
the dashboard down hourly. Dashboard repo is **0 unpushed**.

⚠️ Durable finding recorded in `GOPHER_HQ_STATE_addendum_moderation.md`: **the moderation xlsx never
reaches the server** (it is gitignored; the host only gets files via `git pull`), so production serves
the *committed* `moderation_rules.json`. The loop is *edit xlsx → rebuild on the Mac → **commit the
JSON** → deploy*, and step 3 is the one that gets skipped. That undocumented step caused all seven
recurrences.

## G40-409 — parked in Payment Options, evidence accruing
VPC flow logs **enabled and confirmed delivering** (`fl-00e5e9ef3f440e48d` →
`s3://gopher-vpc-flow-logs-049786760635`, 14-day lifecycle). Last checked: **ACTIVE, 83 non-empty
files, still writing.** The 5432 ingress is **untouched** — steps 1 and 3 deliberately not done.

⚠️ **Query the logs before ~Sept 18** or the lifecycle deletes them and the wait restarts.

Findings on the ticket: the recorded IPs had already drifted (prod EB changed address twice in one
day — the ticket's own thesis, demonstrated); `StageProdDBConnect` is a DB client nobody had
enumerated; and stage RDS *looks* internet-exposed but is not — its subnet routes through a **NAT
gateway, not an IGW**. Do not re-raise that as a security issue.

## G40-9 — Done. A stale handoff was corrected.
`docs/handoff/trustshield-sprint-handoff-2026-09-02.md` said G40-9 "CANNOT SHIP" with two structural
blockers. **Both were fixed and deployed on 2026-09-04** — accept path `43eee125` (verified on real
Stripe, orders 65079/65080, `CONFIRM SKIPPED`, zero card-flag events) and the broadcast exclusion
(`order_gophers.released_at`). That doc is now marked superseded (commit `2dbe19b` in the Code repo);
its next-steps list no longer sends anyone to redo merged work.

⚠️ **`GOPHER_RELEASE_ENABLED` is still `false` and should stay false — but NOT for the reason that
handoff gives.** Re-verified `false` today with a control. The accept path no longer damages payment
state. It stays off because **the client half needs a store release**.

## Relayed to me, NOT my lane, NOT actioned
**G40-414 discoverability QA** (requester address field) — owner-directed, needs a *human* tester
because the whole question is whether a real person finds the way through. Detail is on G40-414.

---

# PART 4 — housekeeping state

- **Both my worktrees: clean, pushed, matching remotes.** Nothing of mine is uncommitted anywhere.
- **Main mobile checkouts belong to other sessions** — `gopher-mobile-request` is on
  `G40-9-recovery-sheet-ui-and-instant-wake` (19 dirty files), `gopher-mobile-gopher` on
  `G40-430-background-location-loop` (4 dirty). **I never touched either**; I worked only in
  worktrees. Leave them alone.
- The **Code repo** has ~153 unpushed commits — that is the shared repo with other sessions' work,
  not mine to push. My only commit there is the handoff correction `2dbe19b`.
- All Android version bumps reverted and **verified against the pushed refs**, not just locally.
- Temporary `g425cfg` entry removed from `.claude/launch.json`; scratch dirs holding real customer
  message data deleted; all simulators and emulators shut down.

# PART 5 — the single most important thing to carry

**Do not let anyone test G40-425 on a build cut from `production`.** It does not contain the change,
and the symptom of "not present" is identical to the symptom of "broken". That one confusion could
easily get this ticket wrongly declared a failure.
