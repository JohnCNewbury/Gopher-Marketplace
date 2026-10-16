# Server fixes S1–S4: build report (2026-10-15)

Worktree: `scratchpad/sync/server-work`. Nothing was pushed, no MR opened, nothing merged.
Each branch is one commit on **`a0924fb5`** (origin/production at build time) and has no upstream set.

**S5 (G40-365) was not built**, as the coordinator instructed. I created no branch and changed nothing for it. A `G40-365-trustshield-ride` branch does now exist, but it is not mine: the G40-365 ticket session created it in its own worktree (`Dev/gopher-backend-api-wt-G40-365`), at `a0924fb5`, with no commits yet. My read-only notes for the ticket session are in §S5 below.

## Before you merge

- **The base moved.** The brief said origin/production was `7e571e9f`. While I worked, another session fetched, and origin/production became `a0924fb5` (one email-template merge, `dbeabc82`, touching only `views/card-declined-admin-2026.ejs` and two email tests). S1 was rebased onto `a0924fb5`, so all four branches share the same base.
- **The node_modules symlink was broken.** It pointed at `Dev/gopher-backend-api-wt-G40-68/node_modules`, which no longer exists. I re-pointed it (it is gitignored and not committed) to `Dev/gopher-backend-api-wt-pristine/node_modules`. That copy has the same package.json and package-lock.json as production, and none of its files are iCloud "dataless".
  - I tried the main `Dev/gopher-backend-api/node_modules` first, but it has about 5,000 dataless files. eslint hung in `pread` on two of them, so I did not use it.
  - `scratchpad/be-628/node_modules` points at the same dead G40-68 path.
- **Lint used the repo's own config.** I ran the repo's eslint 7.32 (`.eslintrc.json`, airbnb + prettier) and prettier 2.8.8. Plain `npx eslint` runs a cached eslint 10 with the inert `eslint.config.mjs`, so I did not rely on it. Every changed file passes both.
- **No SQL changed in any branch.**

## Summary

| Fix | Branch | Commit | Files | New test |
|---|---|---|---|---|
| S1 | `fix/profile-age-fail-closed` | `09eb1e6d` | `controllers/user/profile.js` | `test/profile-restricted-items-fail-closed.test.js`: 10/10 |
| S2 | `fix/order-view-round-cents` | `a67c1699` | `controllers/order/retrieve.js`, `helpers/coupon_total.js` (new) | `test/order-view-coupon-total-rounds.test.js`: 8/8 |
| S3 | `fix/bid-accept-coupon-revalidate` | `4f87e2ae` | `controllers/order/coupon.js`, `controllers/order/order_bids.js` | `test/bid-accept-coupon-revalidated.test.js`: 17/17 |
| S4 | `fix/trip-distance-meters` | `67fbf6eb` | `helpers/functions.js`, `helpers/distance_matrix_element.js` (new) | `test/trip-distance-reads-metres.test.js`: 17/17 |

Every new test fails against the unmodified code (negative control): S1 fails 3, S2 fails 2, S3 fails 16, S4 fails 6.

**Full suite:** I ran it once, on a temporary detached octopus merge of S1–S4 (`1d34bc5d`, not a branch). Result: **443/445 passed.**
- The two failures are exactly the known ones: `cancellation-emails-one-each.test.js` and `g40-35-moderation-parity.test.js`.
- I re-ran both alone on the bare base `a0924fb5`, and both fail there too.
- No other session was running db tests at the time; I waited for G40-563's `npm test` to finish first.
- On this base the suite has 441 suites, not the 436 in the brief. So the comparable baseline here is 439/441, and 443/445 is that baseline plus the four new suites.

## S1: `can_request_restricted_items` fails closed

**What I verified first-hand:**
- `getAge(null)` returns 56 (I ran it), so `+getAge(null) >= 21 || false` is true. An account with no date of birth was told it may request age-restricted items.
- `create.js:504-520` and `update.js:893-909` refuse `!Number.isFinite(requester_age) || +requester_age < 21`, using `signup_age_policy.age_from_dob`.

**The fix** (`profile.js:163`, `:276`):
- The age is now read with `age_from_dob`.
- The flag is now `!(!Number.isFinite(user_age) || +user_age < 21)`, the exact negation of the create refusal, so the switch is offered exactly when the order would be accepted.
- `getAge` is not changed. The now-unused `helpers/functions` require is dropped, and the controller still loads.

**Other places that could compute this flag:** I searched the profile response, the login/auth response, services and sockets. This is the only client-facing restricted-items or under-21 flag. The login response sends only `dateOfBirth`.

**Found but not changed** (a worker-side behaviour change, needs your decision): the Go feed's under-21 filter (`retrieve.js:244`, `:1304`, `:2351`) still uses `getAge`. So a Gopher with no date of birth is **shown** age-restricted orders in the feed. The broadcast path (`get_non_restricted_users`, SQL `NULL > 7670.25`) already leaves them out, so the feed and the notifications disagree. Fixing it would hide A/R orders from every no-DOB Gopher, and I can't size that without production data.

## S2: the order view rounds to the nearest cent

**What I verified first-hand:** Delivery $14.93 with a 50% coupon:
- Fee $0.99 + 8% transfer fee $1.27 = $17.19, and the discount is $1.13.
- The old line gives `Math.trunc(1605.9999999999998)` = 1605, so the view showed $16.05.
- Capture computes `1719 - Math.round(1.13 * 100)` = 1606, which is $16.06.

**The fix:** `total_after_coupon` = `total_charge - Math.round(discount * 100)`, the same arithmetic as capture.
- **Scope note:** I also fixed three sibling sites with the identical truncating line: `get_all_order_v2` (:487), `get_all_order_v3` (:1649) and `get_gopher_active_and_available_orders` (:2505). Otherwise the order lists would still disagree with the order view.
- Orders without a coupon are unchanged.

**Grid check:** every offer from $1.00 to $150.00, times three coupons, times two fees (89,406 coupon orders), run through the real `charge_amounts` and `couponDiscount`:
- The new value equals the capture amount every time.
- The old line was 1 cent low on 6,101 of them.

## S3: bid accept re-checks the coupon

**What I verified first-hand:**
- `accept_bid` priced `req.body.coupon_id || req.body.coupon` via `db.coupons.findByPk`, with no check at all.
- A bid request (`offer_by_gopher`) skips coupon verification at create (`create.js:681-779`). So accept is where a bid order's coupon is redeemed, and it was the one redemption site G40-96 missed.
- The Request app sends the summary's `coupon_data.id` (`app-work src/helpers/orderObject.js:169`).

**The fix:** a new `coupon_for_bid_accept` (in `coupon.js`) runs the real `verify_coupon_use` on the coupon's code. That checks active, expiry, who it applies to, once per account, and the forever cap.
- It runs as the requester and excludes this order from its own counts.
- When an id is sent, the coupon that verifies must be that same id.

**My decision when the coupon is no longer valid: price without it and don't fail the hire.**
- The bid is accepted and charged without the coupon.
- The order is written `coupon_id 0` / `discount 0`, which is how `update.js` writes "no coupon". That way capture can't apply a coupon the authorisation didn't, and the email's `promo_code` line can't dereference a null coupon.
- An `order_logs` row (type `'error'`, the admin console's filter) records which coupon and why.
- Why not refuse: the Request app swallows accept errors (`summary.js acceptBidOrder` catches into Sentry). A refusal would leave the requester on a spinner, resending the same dead coupon every time they tap.
- The cost: in the rare case a coupon expires between the review screen and the tap, the requester is charged more than the screen showed, with the log explaining why.
- A database error is not treated as a coupon refusal; it still throws.

**Tested cases (the real `verify_coupon_use`, models stubbed):**
- Applied: valid by id, by digit string and by code; a coupon expiring tomorrow; under the cap.
- Not applied: expired; over the cap (and the cap query excludes this order); once-per-account already used; inactive; unknown id; gopher-only; an id that isn't the code's active coupon.
- Also: nothing asked for; a database error still throws; the `accept_bid` wiring.
- 26 related coupon and bid suites still pass.

**Pre-existing, not changed:** if a bid order already has a stored `discount` and the accept sends no coupon, the confirmation email's `order.coupon_data.code` would throw after the charge. I found this by reading the code; I did not run it.

## S4: trip distance reads metres

**What I verified first-hand:** in `functions.js:782-784`, `"1,204 mi"` parses to 1, and `"492 ft"` and `"12 km"` give the `'0'` sentinel.

**The fix:**
- Miles now come from `distance.value` (metres), rounded to 0.1 mi with the same constant and rounding as `helper.js`. Minutes come from `duration.value`.
- The only live caller is `GET /get_distance` (`controllers/common/distance.js`). Callers' units are unchanged: miles, or `'0'`.
- `'0'` is kept for a route Google can't build and for under about 80 m of road. The apps' "both addresses are the same" sheet branches on it.
- The cache is unchanged.
- Every ordinary trip from 0.1 to 99.9 mi reads exactly the number its text said.
- Duration-only difference: a missing `duration.value` now gives null minutes instead of 0, matching the function's own "null, never 0" comment.

**Ride before/after.** Suggested offer from the real `rideBand` on this branch, ASAP. Totals are offer + $2.99 fee + 8% transfer fee (`charge_amounts`).
- **TrustShield:** both columns are the same with and without it, because the server gives no TrustShield $1 on a Ride today (G40-365 is not built). Once G40-365 lands, each total with TrustShield is $1.00 lower; the 8% doesn't change.
- **"Was '0'" rows:** the app sent `trip_distance` 0, so the price fell back to a straight-line haversine. I modelled that straight line as 0.8 × road miles.

| Google answer | Metres / min | Miles priced, before → after | Low / suggested / generous, before | Low / suggested / generous, after | Total before | Total after |
|---|---|---|---|---|---|---|
| 492 ft | 150 / 1 | 0.07 (was '0') → 0.1 | 8 / 8 / 8 | 8 / 8 / 8 | $11.87 | $11.87 |
| 1.2 mi | 1,931 / 5 | 1.2 → 1.2 | 8 / 8 / 8 | 8 / 8 / 8 | $11.87 | $11.87 |
| 4.3 mi | 6,920 / 12 | 4.3 → 4.3 | 8 / 8 / 11 | 8 / 8 / 11 | $11.87 | $11.87 |
| 9.8 mi | 15,771 / 18 | 9.8 → 9.8 | 11 / 15 / 19 | 11 / 15 / 19 | $19.43 | $19.43 |
| 25.0 mi | 40,234 / 30 | 25 → 25 | 23 / 30 / 38 | 23 / 30 / 38 | $35.63 | $35.63 |
| 60.0 mi | 96,561 / 60 | 60 → 60 | 44 / 59 / 74 | 44 / 59 / 74 | $66.95 | $66.95 |
| 125 mi | 201,500 / 125 | 125 → 125.2 | 83 / 111 / 139 | 83 / 111 / 139 | $123.11 | $123.11 |
| 12 km (metric text) | 12,000 / 15 | 5.97 (was '0') → 7.5 | 8 / 11 / 14 | 9 / 12 / 15 | $15.11 | **$16.19 (+$1.08)** |
| 1,204 mi | 1,937,648 / 1,080 | 1 → 1,204 | 224 / 298 / 373 | 705 / 940 / 1,175 | $325.07 | **$1,018.43** |

**What moves:** only comma-formatted (≥ 1,000 mi), km-shaped and ft-shaped answers. Ordinary trips do not change price, and ft trips stay at the $8 floor. The displayed "{n} mi" changes for ft trips: "0" becomes "0.1". A trip of 80–160 m no longer raises the same-address sheet. The 25 m same-place gate at order create (`helpers/same_place.js`) is unchanged.

**Not changed:** the website rounds minutes to whole minutes; the server keeps 0.1 min. That can move the whole-dollar suggestion only at a rounding edge.

## S5 (G40-365): not built. Notes for the ticket session

These come from reading the code; I did not run them.
- **Where TrustShield is set:** only three writers set `trust_shield_discount`:
  - the fee/estimate summary (`create.js:86-101`, inside `if (has_age_restriction)`)
  - order create (`create.js:579-582`)
  - order edit (`update.js:960-963`)

  Bids, counter-offers, cost adjustments, capture, views and emails all read the stored column through `charge_amounts`, which already takes the 8% before TrustShield (G40-625).
- **Negative A/R trap: where the sign matters.** On a Ride, `age_restricted_fee - trust_shield_discount` is −100, and it reaches `couponDiscount` as the A/R leg. That shrinks a 21+ coupon by up to $1.
  - Unclamped (the trap fires): `create.js:101`, `coupon.js:227` (capture), `cost_adjustment.js:63` and `:974`.
  - Clamped: `payment.stripe.js:1806`.
  - Guarded: `update.js:988`.
  - Today authorisation (clamped) and capture (unclamped) would disagree.
- **Website cap:** the website caps promo + TrustShield at the total fees. On a Ride, a 100% or large fixed coupon plus TrustShield would otherwise take the total below the worker's pay.
  - The summary for a no-offer Ride bid has a $0 fee, so TrustShield alone would show −$1.
- **Emails:** two templates gate the TrustShield line on A/R: `order-cancellation-requestor-2026.ejs:40` and `order-cancelation-charge-admin-2026.ejs:37`. On a Ride the total would include the $1 while the line is hidden.
- **SQL that reads TrustShield:**
  - The fraud cron (`cronTasks.js:604-608`, `GREATEST(ar - ts, 0)`) would overstate a Ride+TrustShield subtotal by $1. It's an alert heuristic only.
  - The HQ CSV (`admin/orders.js:1014-1020`) is additive in `(ar - ts)`, so it reads right.
- **App copy:** the copy still says "age-restricted" only (`trustShieldEnroll.js:675` and the iQ FAQ, per the APP-DIVERGENCE D2 row).
