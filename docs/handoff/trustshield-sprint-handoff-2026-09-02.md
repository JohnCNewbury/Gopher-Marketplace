# Session handoff — G40-9 (Auto-Repost when a Gopher cancels) — 2026-09-02

**Transcript:** `~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/0d5ce217-5441-4841-aba0-693014154200.jsonl` (34 MB)

**Lane I owned:** G40-9 end to end — backend release path, `keep_listed`, the requester
recovery sheet, and the device testing of all of it. Earlier in the same session I also
shipped G40-421 (Go app Intercom keyboard) and the header safe-area double-count in BOTH
mobile apps.

⚠️ **A SECOND, OLDER SESSION titled just "TrustShield" exists on worktree
`claude/frosty-knuth-a99268`, last active 8/29. I did not touch that worktree and none of
its work is mine.** Files I claimed are listed under "Files I changed" below; anything
else in TrustShield territory belongs to that session or to code-f3 (Appflow).

## Grep anchors

    GOPHER_RELEASE_ENABLED          the env flag (currently false)
    gopher_released_at              the recovery-window column
    RELEASABLE_STATES               the any-stage gate in cancel.js
    keep_listed                     the endpoint behind "Assign New Gopher"
    gopher_released_order           the requester notification
    release_expires_at              server-computed deadline (helpers/gopher_release_window.js)
    ReleaseRecoveryWatcher          the requester sheet
    assert-release-window-not-recomputed.mjs   its CI guard
    close_expired_gopher_releases   the auto-cancel cron
    88212657 / d47122d3 / ac44024e  the three backend deploys today

## State of play

### DONE and device-verified (owner saw it work on his iPhone)
- Release fires from **any live state** (accepted / picked_up / purchased / scheduled).
  Original ACCEPTED-only scope almost never fired: the Go app logs "Order In-Progress"
  ~38s after accept (order 65064: accepted 10:23:46, picked_up 10:24:24, cancelled 10:24:54).
- The requester gets a **push** and the **Request Options sheet** (owner's own design),
  with the gopher's **reason** rendered.
- **Cancel Request** works — calls `DELETE /orders/:id`.
- The header safe-area fix and G40-421 (separate, earlier, both merged and verified).

### DONE but NOT verified end to end
- `keep_listed` auth fix (`88212657`). The route is live (PATCH → 440 with no auth vs 404
  for a nonexistent route). **Nobody has seen "Assign New Gopher" succeed** — every
  previous attempt 403'd, and the flag went off before a retest.
- The `close_expired_gopher_releases` double-refund guard. Never exercised by a real
  expiry.

> ## ✅ SUPERSEDED 2026-09-04 — BOTH BLOCKERS BELOW ARE FIXED AND ON PRODUCTION
>
> **Read this before acting on the section that follows.** The analysis below was correct when
> written (2026-09-02) and is kept because it is the record of *why* the fix was needed — but it
> now describes a state that no longer exists, and it is being relayed to other sessions as
> current. It is not.
>
> | blocker, as written below | state on `origin/production`, verified 2026-09-04 |
> |---|---|
> | 1. accept path re-confirms a live PaymentIntent → "bank denied" → flags the card BAD | **FIXED.** `43eee125` — `lib/payment.stripe.js` now detects `requires_capture`/`succeeded` and logs `CONFIRM SKIPPED: … reusing the existing authorization instead of re-confirming` |
> | 3. broadcast exclusion needs a column recording the releasing gopher | **FIXED.** `order_gophers.released_at` added, and the release path stamps it; the releasing gopher is excluded from the re-broadcast and from their own list |
>
> Verified on **real Stripe**, not from logs alone: orders **65079** and **65080** both show
> `CONFIRM SKIPPED`, with zero `bank denied` / card-flag events across both live tests. Order
> **65135** then traced the whole chain end to end on real devices (iOS and Android).
>
> ⚠️ **`GOPHER_RELEASE_ENABLED` is still `false`, and should stay false — but NOT for the reason
> given below.** Re-verified `false` today with a control. The accept path no longer damages
> anyone's payment state. It stays off because **the client half needs a store release**: the
> recovery sheet ships in the app, so turning the flag on before that release would expose the
> server behaviour with no UI to meet it.
>
> **Why this correction matters more than the fix.** "Keep the flag off because accepting a
> released order flags the requester's card bad" is a *false* statement about production today.
> Left standing it does two kinds of damage: someone re-does work that is already merged, or
> someone reads "payments are corrupting cards" and escalates a problem that no longer exists.
> A stale blocker in a handoff outlives the sprint that wrote it — which is exactly what this
> project's docs-are-truth rule exists to prevent.

### ⛔ IN FLIGHT — G40-9 CANNOT SHIP. Two blockers, both structural. *(see the correction above — both are now fixed)*

**1. A released order carries a LIVE authorisation, and the accept path cannot handle it.**
`controllers/order/update.js:3434` calls `payment_actions.charge.confirm(stripe_charge_token)`
on accept. A released order's PaymentIntent is already `requires_capture` — confirmed and
holding funds — so confirm fails, and the catch treats ANY Stripe failure as a declined card:

    payment_status: REQUIRE_PAYMENT_METHOD
    stripe_error: "User's bank denied transaction"   <- hard-coded, the bank denied nothing
    deletes all counter_offers, OrderGophers, order_bids
    set_bad_card_to_payment_method(...)              <- flags the requester's card BAD

Observed on order **65073** (PENDING / REQUIRES_PAYMENT_METHOD in admin). So **no gopher can
accept a released order at all**, and the first one who tries corrupts the requester's
payment state. This is the "reuse the manual-capture PaymentIntent, no new authorisation"
seam that `G40-9-PR.md` deferred; the release was built without it.

**2. The re-broadcast re-offers the request to the gopher who just released it.**
Nothing anywhere excludes a gopher from a broadcast audience — the fav-gopher list is built
from `db.fav_gophers where user_id = requester`, which still contains them. Owner saw a
MY-Gopher request go straight back to the gopher who had just walked away. Fixing it needs
the release to RECORD who released (`gopher_id` is nulled, so the identity currently only
survives in an order_log note) and the broadcast to exclude them.

### NOT STARTED
- **Admin › Orders repost (AC6)** — owner ruled 2026-09-02: not building it now.
- **UX polish on the sheet.** Owner: "UX doesn't really match that well." Some of it was
  the remount bug (fixed); the rest is unaddressed and he has not yet said what is off.
- **The countdown** is in the build but NOT in the owner's mockup. He has not ruled.

## Deployed? (verified by CONTENT, not SHA)

    PATCH https://api.gophergo.io/api/v1/orders/1/keep_listed        -> 440  (route live)
    PATCH https://api.gophergo.io/api/v1/orders/1/nonexistent_route  -> 404  (control)

Backend production is running `88212657`. **`GOPHER_RELEASE_ENABLED` is `false`** (owner set
it 14:24 UTC after the payment finding). Env `Ready`/`Green`.

⚠️ `git merge-base --is-ancestor <feature sha> origin/production` is INVALID here for the
prototype repo — see CLAUDE.md. For the backend/mobile repos, merges are real merges so
ancestry does work; the curl above is still the better proof.

## Uncommitted / disk-only

Nothing of mine is unpushed. All branches are 0 ahead of origin.

- `gopher-mobile-request`: `ios/App/App.xcodeproj/project.pbxproj` (MARKETING_VERSION bumped
  to 13.9.0) and `ios/App/Podfile.lock`. **BOTH DELIBERATELY UNCOMMITTED** — Appflow injects
  the version via trapeze, so committing it fights the release pipeline. Re-apply the bump
  after any `checkout -B production origin/production` or the build fails the version floor.
- `gopher-mobile-gopher`: same pbxproj bump, same reason. Branch is
  `fix/header-safe-area-double-count`, already merged; content == origin/production.
- `gopher-backend-api-wt-G40-9`: clean. **The 4 stashes there are NOT mine** — they belong to
  other sessions' branches (hq-incomplete-profiles, referral-id-validation, g40-43,
  claude/exciting-chaum). Do not drop them.
- `Code` repo: I added `docs/handoff/G40-9-recovery-modal-copy-review.html` (the side-by-side
  the owner approved the copy from) and this handoff. Both untracked; that repo is 129 ahead
  of origin from OTHER sessions' work — do not `git add -A` there.
- I touched **neither** `_prototypes/Go/gopher-banner.js` nor `_prototypes/Request/gopher-banner.js`.

## What I'd do next, in order

⚠️ **Items 1-3 were completed 2026-09-04 — do not redo them.** See the correction banner above.

1. ~~**Do not re-enable the flag** until blocker 1 is fixed.~~ ✅ Blocker 1 is fixed. The flag
   stays `false`, but now only because the **client half needs a store release**, not because
   accepting a released order damages payment state — it no longer does.
2. ~~**Fix the accept path**~~ ✅ **DONE** — `43eee125`, verified on real Stripe (orders 65079,
   65080: `CONFIRM SKIPPED`, zero card-flag events).
3. ~~**Fix the broadcast exclusion**~~ ✅ **DONE** — `order_gophers.released_at` added and
   stamped on release; the departing gopher is excluded from the re-broadcast and their list.
4. Then retest the whole flow, then ask the owner for his UX notes and his countdown ruling.

## Traps the next session will hit

**OBSERVED, first-hand:**
- ⛔ **`req.body.decoded`, NOT `req.decodedToken`.** `middleware/auth_token.js` puts the caller
  identity on `req.body.decoded` (88 controllers read it that way; `cancel.js:25` is the
  model). I wrote `req.decodedToken` in `keep_listed` and **every call 403'd for hours**, while
  52 source-assertion tests passed. `scripts/check-route-authz.js` does NOT catch it — it
  asserts the handler MENTIONS `decoded`, and the broken version did.
- ⛔ **Never define a component inside a component that re-renders on a timer.** `P` and `B`
  were declared in `ReleaseRecoveryWatcher`'s body; React treats a function created during
  render as a NEW TYPE and remounts its subtree. The sheet ticks every second, so its buttons
  were destroyed and recreated once a second and taps did not register. eslint sees nothing.
- ⛔ **The v2 orders poll param is `statuses[]`, not `aasm_state[]`.** The wrong name leaves
  `req.query.statuses` undefined, `.map()` throws, the endpoint 500s — and `axios.js:185`
  alerts "Network Error!" on EVERY 500, so an app-wide 15s poll throws a blocking modal four
  times a minute.
- ⛔ **A bundle grep is not proof a fix is committed.** The `statuses[]` fix lived only in my
  working tree and in one commit on an MR that was later closed as superseded. Every rebuilt
  bundle looked right; `checkout -B production origin/production` wiped it. Verify the BRANCH,
  not the artefact.
- ⛔ **`xcodebuild -sdk iphonesimulator` proves nothing about the phone.** I verified simulator
  builds for hours while the owner ran a device build three fixes old. Use `-sdk iphoneos`, and
  check the bundle inside `Build/Products/Debug-iphoneos/*.app`.
- ⛔ **An expired JWT surfaces as "Network Error!", not a sign-out.** `auth_token.js` throws a
  generic Error (a 500), so `axios.js`'s clean 401/440 branch never runs. Two hours of testing
  ages a token out. First remedy: sign out and back in.
- ⛔ **`pod install` needs `LANG=en_US.UTF-8`** or CocoaPods dies normalising the project path
  ("Unicode Normalization not appropriate for ASCII-8BIT"). Also: `git checkout` between
  branches desyncs `Pods/` from `Podfile.lock` and Xcode refuses to build until you re-run it.
- ⛔ **Piping a build to `tail` hides its exit code.** `npm run build && npx cap copy` reported
  success while `cap copy` had failed (it needs `env-cmd -f .env.<app>.production`).

**THINK, not yet tested:**
- The owner reported the **Android Gopher Go app "doing the blinking thing again"** during
  testing. I did NOT investigate it. It may be the same class as the remount bug above
  (a component redefined during render) but that is a guess and nothing supports it yet.
- `order_logs.create({ created_on: ... })` — the model defines `created_at`, so `created_on`
  is silently ignored. `cancel.js` does the same, so rows still get a timestamp from the
  column default. Harmless as far as I can tell; not chased.

## Open questions for John

**None.** The flag decision, the PURCHASED-state ruling, the copy rewording, option B for the
edit block, and dropping AC6 were all resolved with him in-session today.

---

# UPDATE — successor session ("TrustShield Sprint"), 2026-09-02 evening

**Transcript:** this session. **Grep anchors:** `CONFIRM SKIPPED`, `released_rows`,
`g40-9-broadcast-exclusion.db`, `52713b5e`, `43eee125`, `!470`, order `65079`, PI
`pi_3UBIrvCQp3eawbpn13KSvcGI`.

## Shipped — MR !470, squashed `43eee125`, merge `52713b5e`, deployed and content-verified

1. **Accept path (blocker 1).** `charge.confirm()` returns early when the intent is already
   `requires_capture`/`succeeded` — mirrors the G40-18 guard in `capture()`. Narrow: every
   other status still falls through, so real declines keep SMS/push/admin alert.
2. **Release marks the gopher declined** on `order_gophers` (blocker 2 — partial, see below).
3. **`DB_PORT` was dead.** `config/db.config.js` computed a port and never passed it to the
   Sequelize constructor; everything dialled 5432, which silently defeats an SSM port-forward
   to the production DB. EB has `DB_PORT=5432`, so this is a verified no-op in production.
4. **`.prettierignore` now covers `logs/`** — `npm run check` could not pass on any machine
   that had run the server.

Three new suites, each verified to fail on the pre-fix tree. `test/g40-9-broadcast-exclusion.db.test.js`
runs the exclusion as real SQL against Postgres+PostGIS, builds its tables from the app's own
models, provisions its own database, and resolves `PGTEST_URL || PGURL || local`. 203 suites,
1690 assertions.

## ⛔ PROVEN IN PRODUCTION — the premise is no longer inherited

Flag was ON 2:13–2:40pm ET. Order 65079: gopher 31677 accepted → released → requester kept it
listed → **gopher 14 accepted the released order and `CONFIRM SKIPPED` fired at 2:31:08pm.**
Zero `bank denied` / `StripeCardError` / `REQUIRE_PAYMENT_METHOD` / `set_bad_card` events.
`keep_listed` also succeeded for the first time (previously "nobody has seen it work").

**`GOPHER_RELEASE_ENABLED` is `false` again** — verified with a control. Off for the gaps
below, NOT for the payment bug, which is fixed.

## Open — in priority order

1. **The releaser can still SEE the released order.** The decline marker excludes them from the
   re-broadcast and push, but NOT from their own available list: `retrieve.js`'s decline check
   is gated on `ord.selectgopher === true` and a `notify_fav_gopher` order never reaches it.
   Observed live. ⚠️ **A previous statement of mine that `retrieve.js` would hide it was wrong.**
2. **No accountability for a releasing gopher (owner, 2026-09-02).** A release is
   indistinguishable from an ordinary decline — both `declined: true` — so releases cannot be
   queried or counted per gopher. `orders.gopher_id` is nulled then overwritten by the new
   gopher. **Smallest fix: additive `released_at` on `order_gophers`,** which also fixes (1).
3. **UI on the recovery sheet.** Owner: *"not the right UI"* and *"very slow"* end to end.
   Specifics not yet given. Approved copy reference:
   `docs/handoff/G40-9-recovery-modal-copy-review.html`. The auto-cancel countdown in the build
   is still not in the owner's mockup and still has no ruling.
4. **Perceived slowness is partly by design** — G40-44 re-broadcasts in tiers at 0s/60s/120s and
   the app polls ~every 7s. Request timings were fine (30–600ms; claim 1.1s).
5. **Order 65079 is live and accepted by gopher 14** with a real $14.25 hold. Close it deliberately.
6. **65073's card-flagging was never confirmed** — `set_bad_card_to_payment_method` is
   conditional on `error.raw.payment_method`, which a wrong-state Stripe error does not carry.
   One `requester_card_errors` query settles whether anyone needs remediating.

## Traps

- ⛔ **The production DB and the SSM port-forward are classifier-blocked for a session.** The
  `aws` reads and EB config reads are allowed; `update-environment` is not. Flag flips are
  owner-run. Ask; do not hunt for a phrasing that gets through.
- ⛔ **`db.config`'s init does NOT create tables** — it is almost all ALTERs and reports "145
  queries skipped (tables may not exist yet)" on a clean database. A test that TRUNCATEs and
  passes locally is reading leftovers from an earlier run of itself.
- ⛔ **Sequelize reports a UNIQUE violation as the bare string `"Validation error"`.** The detail
  is on `.original`/`.parent`. `users` has a unique index on `(uid, provider)` whose defaults
  (`''`, `'email'`) collide on the second seeded row.
- ⚠️ **Admin panel renders dates as `YYYY-DD-MM`** — today's order showed as `2026-02-09`.
  Cosmetic, but it will mislead anyone reading order history.
