# Request web vs the LIVE Request app — first true divergence list

**2026-10-13, Website Code/Logic seat. Step 1 of the app↔web shared-logic plan.**
Owner, 2026-10-13: the store releases are done, the live apps are canonical, and
the web should share the app's logic. Steps 2–4 (extract the app's helper layer,
vendor it on the web, retire the web's private copies) wait on him.

## What was compared, and how

| Side | Source | Ref |
|---|---|---|
| Live Request app | `gophergo/gopher-mobile-requester-capacitorjs` | `origin/production` **ab399d3f7** (2026-10-13, the store cut) |
| Live server (the app's fees) | `gophergo/gopher-backend-api` | `origin/production` **e8d67ff1** (2026-10-13) |
| Web | `Final/gopher-request.html` + `Final/assets/js/` | branch `feature/deals-google-maps-audience` **a70a73d** |

- Both GitLab repos were read **through git at `origin/production`**, never a
  working tree. The app clone's checkout was on a 2026-09-02 feature branch.
- The parity harness had never read the app: its "prototype" surface is a
  hand-built model in this repo. **§8 of `run_parity_harness.py` now reads the
  app and the server.** Rules that match today **FAIL** if they break; known
  divergences **WARN**, each detected from both sides, not printed from a list.
- Every row below was read first-hand at the cited lines. Where a background
  search found something I could not confirm, the row says **unverified**.

## The fact that shapes everything else

**The app computes no fees.** It has no fee constants (none of 0.08 / 0.99 /
1.99 / 2.99 / 3.99 / 4.99 appear in its JS outside vendored files and tests). It posts the form to the server's
`POST orders/summary` and adds up the lines that come back (`pages/summary.js`
~1935). So "the app's fee behaviour" is the server's, and the server is what
the web's fee math has to match.

## Parity — holds today (harness FAILs if it breaks)

| Rule | Evidence |
|---|---|
| Age-keyword **detector** and its four lists | App `helpers/ageKeywords.js` is the web's `findAgeRestrictedKeyword`, copied from web `5700b69`. The web's three age files are byte-identical to that point. Lists 1658 / 352 / 201 / 24 identical; **0 differences on 8,053 inputs** (every keyword ×4 shapes + the harness cases). Mutation-tested: dropping one keyword fails it. |
| Per-category fee table | Server `constants/index.js` (cents) == web Request `GOPHER_FEE`: delivery 0.99 · ride 2.99 · labor 2.99 · junk 3.99 · moving 3.99 · yard 3.99 · home 4.99 · other 1.99. Mutation-tested. |
| Age-restricted fee | Server `AGE_RESTRICTED_FEE: 199` == web `AGE_FEE = 1.99`. |
| Instant-transfer **rate** | Server `PAYOUT_FEE: 0.08` == web `INSTANT_TRANSFER_RATE = 0.08` (the *base* differs, below). |
| No-show rule | `noShow.js` byte-identical: app production, the web's vendored copy, its pinned sha. |

## Parity — confirmed by reading, not mechanised

| Rule | App | Web |
|---|---|---|
| Who counts as under 21 | Server `can_request_restricted_items = getAge(date_of_birth) >= 21` (`controllers/user/profile.js:276`); unknown DOB → false | `canSeeAgeRestricted()`: `customerAgeYears() >= 21`; unknown → not eligible |
| Under-21 block sheet | `UNDER_21_BLOCK_SENTENCE`, one button "Edit my request", no ack: blocks every attempt (`flows/delivery.js:197, 228-236`) | Same sentence and button (d605e3b, on the branch, **not yet live**) |
| Identity gate | None (`offerFloor.js` skips it deliberately) | None (owner 2026-10-04) |
| Worker pay > $0 | Every flow's Step 5 check | `workerPay` / `workerPaySubmit` |
| Liability waiver | Required to submit on every step-flow category (`summary.js:99`, `variant="yardFlow"` is the shared review) | `waiver` gate, every request |

## Divergences — WARN in the harness, each needs an owner ruling

| # | Rule | Live app / server | Web Request | Who it touches |
|---|---|---|---|---|
| D1 | **Where the age-keyword scan runs** | **Delivery only**: Step 2, age switch off (`flows/delivery.js:218-223`) | **Every category** (~17141 "Runs for EVERY category") | **Item 1.** "a wine fridge" blocks a Moving job on the web, never in the app. Matching the app removes the cross-category false positives with no matcher change. |
| D2 | **TrustShield $1 scope** | `trust_shield_verified && age_restricted_fee`: **A/R orders only** (`create.js:552`, `update.js:888`, summary via `getAgeRestrictedDiscount`) | A/R delivery **or every Ride** (`tsEligible`, ~12687; Connect ~11865 the same) | **Item 2.** Real logic, not just copy. ⚠️ Harness §7 still *requires* the Ride arm; it pins the web's rule, not the live one. |
| D3 | **8% transfer-fee base and rounding** | `ceil((offer + fee + (A/R fee − TrustShield)) × 0.08)` in cents (`create.js` summary ~98) | `0.08 × (offer + fee + A/R fee)`, unrounded | A TrustShield holder on an A/R delivery pays **8¢ more** on the web; every web total carries fractional cents. |
| D4 | **Pick-up ≠ drop-off** ⛔ *corrected, see below* | **Warns, does not block**: trip distance `"0"` from the server's `get_distance` opens an "Oops!" sheet, *"It looks like your pick up and drop off addresses are the same."*, button "Back" (closes it). Nothing in the step checks reads the distance (code reading, not driven). Mounted in **Delivery and Ride only** (`getDistance.js`; `deliveryflow.json`, `rideflow.json`) | **Blocks** Continue on matching normalised address text (`addressesDiffer`), wherever a pick-up shows, **Moving included** | The two check different things in different ways. |
| D5 | **"Looks like a different category" nudge** | None in a flow. The classifier runs only in the home search sheet (`HomeIq.js:116`), before a flow opens | Blocks Continue once on Step 2 | Web-only friction. |

> ⛔ **D4 CORRECTED 2026-10-13, same evening, after the owner said the app already checks.**
> This row first read *"Not checked (exists only in the vendored `gopherStepGates.js`, which
> nothing evaluates)"*. **That was false.** The app checks by **measurement**, not by wording:
> `helpers/getDistance.js` asks the server for the trip distance and opens a sheet at `"0"`.
> Every search (mine and a background agent's) looked for the rule's *words* ("same address",
> "different addresses", `normAddr`, `pickup === dropoff`), and the app's sheet says "addresses
> are the same" with "pick up" as two words and compares coordinates. **A search that found
> nothing was written down as "the app does not check"**, and the harness warning was built on
> the same blind search. Both are fixed. The method change: a rule is found by following its
> data (what reads both addresses?), and "not found" is reported as "not found by these
> searches", never as a fact about the app. D1 and D5, the other two negative claims the
> rulings rest on, were re-checked that way the same evening (below) and hold.

### Divergences found by reading, not yet mechanised

| # | Rule | App | Web |
|---|---|---|---|
| D6 | 21+ answers **"No — not age-restricted"** | Continues as an ordinary delivery; records the ack only (`delivery.js:263-268`) | Continues **and** sets `idRequiredAtCompletion` (~17511) |
| D7 | A/R fee **condition** | `has_age_restriction`, **any category**: the server never checks category (`summary`, `create.js:550`). The app's Custom Task has an A/R switch, so Custom Task can carry the $1.99 | `category === 'delivery' && ageRestricted` only |
| D8 | Fee when the offer is $0 | Server charges the category fee only when offer + cost > 0 (`summary`) | Always |
| D9 | Coupons | Server coupon system (`get_discout_summary`) | One hard-coded demo code, `GOPHER50` |

## Not yet compared (so not claimed either way)

- **Suggested offer.** Different engines: the app asks the server
  (`orders/smart_price`, Delivery / Ride / Junk / Moving only; ±25% fallback
  band), while the web computes locally from `OFFER_TABLE` ($100 → 16/21/26).
  Comparing *values* means reading the server's `smart_price`; not done.
- **Field visibility per category.** The app's per-flow `STEP_FIELDS` /
  `SHOW_WHEN` against the web's `FIELD_HIDDEN_FOR`. Field names differ
  (snake_case vs camelCase), so this needs a field-name map first.
- **App-only step checks** the web may lack: Yard crew ≥ 2 when the crew switch
  is on; Moving items ≥ 1; Labor hourly rate > 0; Custom Task's cost check
  waived in bid mode. Background-search finding, **unverified** line by line.
- **Phone number in the description.** The web hard-blocks it. App comments say
  its description field "masks phone numbers"; I could not locate that code in
  two searches. **Unverified.**
- **Connect.** It has no app counterpart. It is a separate product with its own
  fees (A/R $2.99, D-031) and is compared only with Request.

## Found in passing — NOT this seat's surface

- ⚠️ **Live app: Custom Task shows "Slide if this custom task includes
  Age-restricted items" to every requester, including under-21s.**
  `CustomTaskDetails.js` `CUSTOM_TASK_CRITERIA` has no `profileFlag`, unlike
  Delivery's (`can_request_restricted_items`), and its test mounts the card with
  no profile and clicks the switch. That would conflict with the owner's
  "under 21 sees nothing A/R" ruling. Code-and-test evidence only; **not seen on
  a device**. Belongs to the Request-app seat (G40-549 owns all Request app
  work); reported, not touched.
- **Fixed here:** `scripts/web-checks/noshow-freshness.js` (run-all step 12)
  compared the vendored no-show rule with the app clone's **working tree**,
  which was a month stale. It matched by luck. It now reads `origin/production`
  through git, and it now runs from a worktree, where it used to skip.

## Rulings needed before Steps 2–4

*Answered the same evening — see **Owner rulings** below. Kept as asked.*

1. **Does "the live apps are canonical" cover the fee *math* too** (D3, D8), or
   only the rules? D3 changes what a web customer is quoted by up to 8¢.
2. **D2 Ride**: already ruled 10/4, "AR only for live right now". The live
   server agrees. Item 2 will change logic + copy + harness §7 together.
3. **D1**: scan Delivery only, as the app does? That is item 1's lighter fix,
   and it changes nothing in the app.
4. **D4 addresses-differ**: keep the web's rule and ask the app to add it, or
   drop it to match the app?
5. **D5 category nudge, D6 "No" path**: match the app, or keep?

## Owner rulings — 2026-10-13 evening (John, to the Website Code/Logic seat)

**The direction:** *"The logic MUST be the same on Web and App."* The divergences settle with the
**next app release**; tickets go in the sprint starting 2026-10-14. Where a ruling picks the web's
rule, the **app** (or the server behind it) changes, not the web.

| # | Ruling | What changes | Status |
|---|---|---|---|
| D1 | Age-keyword check runs on **every category** (the web's rule) | App: scan every flow, not just Delivery. ⚠️ That takes the under-21 block to every app category, so the item-1 fixes (highlight the tripping word; cut matcher false positives; owner "Both", same evening) have to ship **in the app too**, from the same re-extracted lists, or the app gets the web's false positives everywhere. | Ruled |
| D2 | TrustShield $1 = **age-restricted + Ride Sharing** (the web's rule) | Server: owner adds Ride next sprint (today `trust_shield_verified && age_restricted_fee`). App copy changes with it: `trustShieldEnroll.js:675` "discount applies to age-restricted requests", iQ FAQ "$1 off each age-restricted order". **Supersedes the 10/4 "AR only for live right now" as the target**: the web is NOT narrowed, and harness §7's Ride pin is now the correct rule. | Ruled |
| D3 | 8% fee taken **before** the TrustShield $1, i.e. on the gross A/R fee (the web's rule) | Server: `summary`/`create`/`update` stop netting TrustShield out of the 8% base. | **Ruled.** Rounding (same evening): **nearest cent**, applied when the 8% line is calculated, on web AND server, so every line adds up to the total and the card charge equals what was shown. Today the server rounds the 8% **up** (`Math.ceil`) and the web rounds only for display. |
| D4 | **Block Continue when pick-up and drop-off are the same PLACE** (compared by location, not text), on **every two-address category: Delivery, Ride, Moving**, web and app | App: today it **lets the requester continue** after the "Oops!" sheet (owner, on a device, 2026-10-13: *"It DOES allow you to continue on app and it should not."*), and Moving has no check. Web: compares address **text** today, so it must compare by location. | Ruled |
| D5 | **Blocks Continue once** (the web's rule) | App: add the in-flow nudge. | Ruled |
| CT | **Web gets the live app's Custom Task logic** | Web `other` ⇄ app Custom Task: description, the A/R switch, purchase + cost, pick-up/destination vs one address, bids. Per the server, the $1.99 A/R fee and the TrustShield $1 apply on **any** category with the switch on (D7 settles with this). | Ruled. Under-21 (same evening): **hide the A/R switch from under-21s** on the web port, matching "under 21 sees nothing age-restricted"; the app gets the same fix (today it shows the switch with no `profileFlag`, and the server then refuses at submit with a bare 403 "Unauthorized."). |
| D6, D8, D9 | Not ruled | — | Open |

### Re-checked by mechanism the same evening (because D4 was missed)

- **D1 holds.** The server does not scan descriptions: `AGE_RESTRICTED_KEYWORDS` (`constants/index.js:302`)
  is matched against the order's **title**, inside an under-21 guard: under-21 or unknown age plus an
  A/R title or `age_restricted?` gives **403 "Unauthorized."** (`create.js:492`, twin in `update.js`).
  In the app, `findAgeRestrictedKeyword` has one caller (`flows/delivery.js:222`).
- **D5 holds.** Inside the app's flows the description is read only to check it is not empty (every
  flow), for Delivery's age scan, for Home's checklist and for drafts. No classifier runs in a flow;
  `classify()`'s only caller is the home search sheet.
- **Still not compared** (where more can hide): field visibility per category, suggested-offer
  values, the app-only step checks, phone numbers in the description. Listed above; no claims made.

