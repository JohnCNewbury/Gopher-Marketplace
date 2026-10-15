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
| D6 | **Ruled 2026-10-15 (John): "phone needs to do the same", and ENFORCED** (his pick: "Enforce it"). When a 21+ requester answers "No — this is NOT age-restricted" but the word is still in the request, the order is flagged **ID required at completion**, and the worker really checks the ID at Complete as on an age-restricted job. It is still NOT age-restricted: no $1.99 fee, no TrustShield discount. | **Server:** a new order flag, accepted on create/update and returned to Go (today the server has none). **Request app:** set it on "No" and show the website's line, *"This request requires a picture of the front of a valid ID before items can be exchanged."* **Gopher Go:** the Complete step's ID check runs when `isAgeRestricted(request)` **or** the flag is set (today only the former). **Web:** already sets `idRequiredAtCompletion` and shows the line; it reaches the server once the website places real orders (today `__createDashboardRequest` is local only). ⚠️ Verified 10/15: on the web the flag reached no worker, only the requester's own What-to-expect line and the local dashboard record. | **Ruled.** One ticket across server + Request + Go, via the desk (John: "one ticket via the desk"). |
| D8 | **Moot (John 2026-10-15): "offer can NEVER be $0".** Both sides already require worker pay > $0 (parity row above), so the server's "fee only when offer + cost > 0" condition is always true and cannot diverge. | — | **Closed.** |
| D9 | **Ruled 2026-10-15 (John): the website copies the REAL coupon rules** (his pick: "Copy the real rules"). The website's promo box uses the server's exact discount: off the **Gopher fee + the transfer fee always**, plus the **$1.99 age-restricted fee only for a 21+ coupon** (owner rule 2026-09-10, `helpers/coupon_discount.js`); percent-off or dollar-off. Demo codes stay until the website places real orders; then it checks codes with the server as the app does (HQ coupons: expiry, once per account, caps, requester/worker/both). | **Web** (this seat, no ticket). Today `GOPHER50` takes 50% off the WHOLE fee bundle, the A/R fee included, every time. | **Ruled.** |
| PL-289 | **Server coupon over-discount, FIXED 2026-10-15** (found while copying D9). An `amountOff` coupon with the 21+ flag also took the A/R leg whenever the Gopher fee alone covered it (the remainder was reduced only on the transfer-fee branch): a $2 coupon took $3.99, and a $0.50 coupon on an A/R delivery took $1.00. John: "Fix it, server + web". | **Server:** gopher-backend-api !752 → production `7b8c74d6`, 6:33 AM ET; CodePipeline Succeeded, EB Green/Ok 6:37, 0 5xx. Tests: section 7 of `coupon-discount-always-both-fees.test.js`. **Web:** the same one-line fix in `gopher-request-logic.js` `couponDiscount` (branch `code-logic/coupon-pl289-web`), 960/960 identical to the live server; it ships with the D9/D11/D12 batch. | **Server live; web ships with the batch.** |

### D6 SPEC — John, 2026-10-15 (the build follows this; it refines "Enforce it")

**Who:** 21+ requesters only. Under-21s are still blocked outright (G40-623).

**Flow, web and app alike:**
1. A clear age-restricted keyword opens the existing **"This looks age-restricted"** sheet
   (Yes / No).
2. **No** now opens a **second sheet** (owner-approved words, verbatim; the keyword in quotes):
   > **You'll need your ID for this one**
   >
   > Your request mentions **"alcohol"**, which is almost always an age-restricted item. Only
   > submit it if you can show a valid ID proving you're 21 or older when it's delivered.
   >
   > If you can't show ID, your worker can't hand over the items. The order is non-refundable:
   > it pays your worker for their time and anything they bought for you.
   >
   > *Flagged by mistake? Sorry about that. Age-restricted items are tightly regulated, and these
   > checks protect you, your worker and Gopher. A real person reviews every request flagged
   > like this.*
   >
   > **[ Edit my request ]** · [ Submit as-is ]
   - **Edit my request** is the final backstop: it returns to the box with the word selected,
     as the under-21 block does.
   - The sheet is on the modal kit: G40-308 Guide B on the app, Guide A on the web, G40-595
     pills.
3. **Submit as-is** makes the order **DOUBLE-FLAGGED**:
   - **ID required at completion:** Gopher Go's Complete step checks the ID as on an
     age-restricted job.
   - **Tracked:** the order stores the flag AND the word that triggered it, and HQ shows a tag
     and a filter. This is the data for deciding whether to add the $1.99 A/R fee to these
     automatically ("if we find the process is being circumvented for legit AR items").
   - Today: no $1.99 fee and no TrustShield $1 on these orders.

**Rulings with it (John 10/15):**
- **"A real person reviews every request flagged like this" STAYS:** HQ reviews the flagged list.
- **NON-REFUNDABLE on both sheets.** The first sheet's note ("the order may be canceled, you may
  still be charged worker time/fees") changes to match:
  > *Submitting an age-restricted request without a valid ID at completion means the worker
  > cannot release the items. The order is non-refundable: it pays your worker for their time and
  > anything they bought for you, and repeat issues can lead to account review.*
  - ⚠️ The customer-service reference, the Request 101 and the Terms must agree. That is copy
    for their owners; John publishes the Terms himself.
- **Tracking = orders + the word** (not a count of every warning shown).

**Build:**
- **Server:** two order columns (the double flag + the word), accepted on create/update,
  returned to Go and HQ. ⛔ The raw-SQL rule applies: a .db test on local Postgres with
  production column types.
- **Request app:** the second sheet, the flag + word on submit, the first sheet's note.
- **Gopher Go:** the Complete ID step when `isAgeRestricted(request) || flag`.
- **HQ:** the tag + filter.
- **Web:** the same sheets and logic. The web's `idRequiredAtCompletion` becomes this flag
  and reaches the server once the web places real orders.

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


### Tickets: sprint 908 "iQ | Brain" (2026-10-14 → 10-21; it was named "iQ Boost" when they were filed the same evening), created or moved on the owner's "All six"

**Canonical writer (2026-10-14, current):** the **"iQ | Brain Sprint" desk**. The 909 desk
"(!)Gopher 4.0 UI/UX Update(!) Sprint" said the same morning, relaying John, that it is now the
PENDING-RELEASE (14.0.0) desk only: *"Send all further comparisons, rulings and DOC UPDATEs to the
"iQ | Brain Sprint" desk"*. RQ-35..45 are already in the master. *History:* ~~the "iQ | Brain Sprint"
desk~~, then **corrected the same night (10/13): John keeps the 909 desk on the canonicals until he retires it.** Rows for canon go to the 909 desk "(!)Gopher 4.0 UI/UX Update(!) Sprint". It published D1–D5 + Custom Task as master rows **RQ-35 to RQ-40** (ruled).

The tickets point here; this doc is the source of truth. Three already existed, so they were moved
into the sprint with a dated comment instead of being duplicated.

| Ruling | Ticket | Note |
|---|---|---|
| D1 + item 1 (app scans every category; highlight; false positives) | **G40-623** (new) | Matcher fix is made on the web first, then re-extracted into the app |
| D5 (app adds the in-flow category check) | **G40-624** (new) | |
| D3 (server: one 8% formula, full A/R base, nearest cent) | **G40-625** (new) | The server has THREE 8% formulas today: summary + charge net TrustShield out, and `update.js` leaves the A/R fee out entirely. Build with G40-612 |
| D2 (TrustShield $1 on Ride) | **G40-365** (existing, moved in) | ⚠️ After/with G40-625: the charge path subtracts TrustShield from the A/R fee, so a Ride's $1 would enter the 8% base as a negative A/R fee |
| D4 (block by place, Delivery/Ride/Moving) | **G40-274** (existing, In Progress since April, moved in) | Its 07-19 scrub said the app had "zero same-address validation". Wrong, the same miss as this doc's first D4 |
| CT under-21 (app hides the switch) | **G40-614** (already in sprint) | Matches the ruling; unchanged |

Web-side work (this seat, no ticket): Custom Task logic on `other`, under-21 suppression kept; the
item-1 matcher fix upstream for G40-623 (done, live dfce6fd). ~~D4 location comparison on the web~~:
**moved to G40-274 (10/14)**. John spawned a G40-274 session that owns BOTH halves of D4. This seat
wrote no D4 code: on 10/14 `gopher-step-gates.js` and `gopher-request.html` on G40-623-web were
byte-identical to live. ⚠️ G40-274's app half touches the same files as G40-623's MR !500
(delivery.js, ride.js, YardStepNav.js, stepFlows.js), so it waits for !500 to merge.

## Second pass: the four areas not compared on the first pass (2026-10-13, late)

Each rule was found by following its data, not by searching for words. A "not found" says what was
traced.

### Phone numbers in the description: D10 (DIVERGES) and a live app bug

| | App (`component/discriptionElement.js` ~39-66, the description field every flow draws) | Web (`gopher-request.html` ~17166) |
|---|---|---|
| Behaviour | **Masks as you type**: the matched number is replaced in the box with `**********`, then a sheet opens: "It looks like you've entered a phone number. … Please select Edit Request to remove the phone number." with a "Do not show me this again" box. The number never reaches the server; Continue is not blocked. | **Blocks Continue** (`G40_REQ.phoneEntered()`, no acknowledgement) until the number is edited out. |
| Pattern | `/\b(?:\d[ -()]?){9}\d\b(?!\d)/g` | `/(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/` |

⚠️ **LIVE APP BUG, found by running both patterns.** In `[ -()]` the unescaped hyphen makes a
**range**, space (0x20) through `(` (0x28). So `-` and `.` are NOT separators. The app's mask
misses the most common US formats:

| Typed | App masks? | Web blocks? |
|---|---|---|
| `9195551234`, `919 555 1234`, `+1 919 555 1234` | yes | yes |
| **`919-555-1234`** | **NO** | yes |
| **`(919) 555-1234`**, **`(919)555-1234`** | **NO** | yes |
| **`919.555.1234`**, **`1-919-555-1234`** | **NO** | yes |

So a phone number typed with dashes goes out unmasked in a description that is broadcast to Gophers,
against "phone numbers are never broadcast". This is the Request-app seat's code; reported, not
touched. The sheet's wording ("phones numbers", "Ones your") is already G40-615.
**Needs a ruling:** one pattern (the web's is the wider one), and mask-as-you-type (app) or block
Continue (web).

### App-only step checks: equivalent, except one small difference

| App check (code read line by line) | Web |
|---|---|
| Yard and Moving: crew switch on → at least 2 workers (`yardFlowSteps.js` ~286, `movingFlowSteps.js` ~199) | The crew counter's minimum is 2 (`dec-workers` → `Math.max(2, …)`, ~16528), so fewer than 2 cannot happen. **Equivalent.** |
| Moving: at least 1 item, or "multiple" (`movingFlowSteps.js` ~195) | The item counter's minimum is 1 (~15035). **Equivalent.** |
| Labor: hourly offer > 0, or per-worker wage > 0 unless bids (`laborFlowSteps.js` ~203-212) | `workerPay` gate: pay > 0 unless bids. **Equivalent** (by reading; not driven). |
| Custom Task: cost of items required with a purchase, **waived when bids are on** (`customTaskFlowSteps.js` ~144) | `costOfItems` gate has no bids exemption. **Small divergence**; settled by the Custom Task port. |
| ~~**First Available**: offered on Delivery, Ride, Yard, Custom Task … **Parity**~~ ⛔ **WRONG, corrected below (same night).** I matched the word `"available"` in `yardflow.json`, but there it is only a `targetControl` inside other controls' actions. See **D13** in the field-visibility section. | — |

### Suggested offer: the app shows the server's `POST orders/smart_price`

Both implementations were RUN on the same inputs: the server's `helpers/suggested_pricing.js` at
`origin/production` (a pure module, no database) against the web's real files, by
`app-offer-probe.js` (this folder), which harness §8 runs every time. Junk and Moving FAIL on a break;
D11 and D12 WARN.

**Scope: parity.** Both price Delivery, Ride, Junk and Moving only (web `PRICED_CATEGORIES`; app
`smart_price` in those four flows' JSON).

| Model | Result |
|---|---|
| **Junk** (single / half / full: 40 / 60 / 100, ±25% on a $5 grid) | **Parity**: same bands, and the same detected tier on 8 sample descriptions |
| **Moving** (few / truck / home_small / home_large: 75 / 110 / 225 / 375) | **Parity**: same bands, and the same detected tier on the same samples |
| **D11 · Delivery** | **DIVERGES from $25 of items upward.** |
| **D12 · Ride** | **DIVERGES on what the number means.** |

**D11 · Delivery, by cost of items:**

| Items | $25 | $100 | $150 | $200 | $300 | $500 |
|---|---|---|---|---|---|---|
| Web (low/suggested/generous) | 8/11/14 | 16/21/26 | 23/30/38 | 34/45/56 | 64/85/106 | 124/165/206 |
| Server | 9/12/15 | 15/20/25 | 19/25/31 | 23/30/38 | 30/40/50 | 45/60/75 |

* **Server:** `MODEL_VERSION 'g40-502-owner-anchors-2026-09-21'`, `OWNER_ANCHORS` $10→10, $100→20,
  $200→30, then +$0.10 per $.
* **Web:** `OFFER_TABLE` "NC" column, from the 2026-07-09 directive, then +$0.40 per $ above $200.
* **The server carries the NEWER owner decision (G40-502, 9/21); the web never took it.** Harness §4
  pins the web's numbers ($100 → 16/21/26), so it changes with the fix.

**D12 · Ride:**

| Trip | 4.3 mi / 13 min | 12 / 20 | 15.1 / 24 | 15.1 / 24 scheduled | 30 / 40 |
|---|---|---|---|---|---|
| Web | 10/13/15 | 18/22/27 | 21/27/32 | 24/31/37 | 32/42/52 |
| Server | 8/9/11 | 13/18/22 | 16/22/27 | 19/25/31 | 27/36/45 |

* Same mileage tiers, per-minute rate, $8 floor, scheduled uplift and band.
* **Server:** `'g40-535-ride-worker-pay-2026-09-23'`, worker pay only:
  `max(variable × m, 8)` (`is_worker_pay: true`).
* **Web** (`rideSuggestedOffer`, ~12923): adds the $2.99 platform fee and the 8%,
  `max(2.99 + variable × m, 8) × 1.08`. That is a rider all-in figure, shown in the slot where the
  requester sets the WORKER's offer, so the web suggests about $4–6 more than the app.
* **The server again carries the newer decision (G40-535, 9/23).**

**Needs a ruling:** adopt the server's G40-502 Delivery anchors and G40-535 worker-pay Ride model on
the web? Recommended: both are the owner's later decisions, and the app already shows them.

### Field visibility per category: D13, D14 and parity

The app's map was traced from each flow's `STEP_FIELDS` / `SHOW_WHEN` and the components that draw
them (background agent; every divergence below re-read by me). The web's is
`gopher-flow-rules.js` `tableFor()` plus the page's own render conditions.

**D13 · Worker choice on Step 3, which corrects the First Available row above.** First Available is a
real control (`"available"`, type checkbox) **only in the Delivery, Ride and Custom Task flows**.

| Category | App | Web |
|---|---|---|
| Delivery, Ride | First Available · I'll select my worker · Prioritize MY Gophers | same (**parity**) |
| Moving, Junk, Labor, Home | I'll select · Prioritize (no First Available) | same (`NO_FIRST_AVAILABLE`) (**parity**) |
| **Yard** | I'll select · Prioritize (`yardFlowSteps.js` ~47-56, "no First Available (Y-05)") | **no choice shown at all**: `workerSelectChoice` is hidden for `yard`, and the page forces `'select'` (~16389) |
| **Custom Task** (web `other`) | First Available · I'll select · Prioritize | **no choice shown** (forced `'select'`). Settled by the Custom Task port. |

**D14 · Pay by the hour.**
* **App:** `paying_by_hour` exists only in the **Labor** flow (`laborflow.json`; `isHourly`).
* **Web:** the "Pay by the hour" toggle sits in Worker setup (`workerSetup`: Yard, Other, Moving,
  Junk, Labor) and is removed only for Moving (`noHourly`, MV-05, ~15109). So the web offers hourly on
  **Yard, Custom Task and Junk**, where the app does not. A page comment says "Junk keeps it too";
  that is not a dated owner ruling I could find.

**Parity, read on both sides:**
* photos and description hidden on Ride;
* Gopher iQ suggestion on Delivery / Ride / Junk / Moving only;
* bids off on Delivery and Ride (app forces `gopher_bid:false`); Labor's bids are off while hourly;
* hazardous on Junk only; item info on Moving and Junk (5+ means "multiple" on both);
* stairs at pick-up on Moving only; stairs at destination on Moving and Labor;
* rider info and special instructions on Ride only;
* no service elevator on Request (app MV-11 "not built"; web hides `serviceElevator` everywhere);
* Unit/Apt everywhere except Yard;
* the age switch on Delivery behind the under-21 flag;
* timing (ASAP / schedule) and the liability waiver on every category.

**Custom Task differs in many fields** (pick-up switch "No pick up, work happens on site", the A/R
and purchase switches, cost, bids note, crew, destination stairs). All of it is settled by the ruled
Custom Task port.

**Needs a ruling:** D13 Yard (show the app's two-option choice on the web?) and D14 (hourly only on
Labor, as the app has it, or also on Yard / Custom Task / Junk?).


## Owner rulings on the second pass (2026-10-13, late)

All four answered as recommended. **In D11–D14 the WEB changes** (Website Code/Logic seat, no ticket).
In D10 both sides change, and the app half is ticketed.

| # | Ruling | Who changes |
|---|---|---|
| D10 | **Mask the phone number as it is typed** (the app's behaviour), with the **web's wider pattern** on both sides | **App:** the pattern (fixes `919-555-1234` / `(919) 555-1234` / `919.555.1234` going out unmasked); ticket below. **Web:** stop blocking Continue and mask instead. |
| D11 | Web adopts the server's **G40-502 Delivery anchors** ($10→10, $100→20, $200→30, then +$0.10/$) | **Web.** Harness §4's pinned spot values change with it. |
| D12 | Web adopts the server's **G40-535 worker-pay Ride model** (no $2.99 fee, no 8% in the suggestion) | **Web** |
| D13 | **Yard shows the app's two options** (I'll select my worker · Prioritize MY Gophers; no First Available) | **Web** |
| D14 | **Pay by the hour on Labor only** | **Web:** remove it from Yard, Custom Task and Junk |

**D10 app ticket:** **G40-626** (Bug, sprint 908 "iQ | Brain"). Do it with G40-615 (the sheet's typos).

**Canon:** the 909 desk published the second pass as master rows **RQ-41 to RQ-45** (ruled) on 2026-10-13. The parity list is logged without rows. The desk re-ran the app's phone pattern independently and confirmed the three common formats are not masked.

## G40-623, the app half (2026-10-14, Website Code/Logic seat): ✅ MERGED, production `4232d4507`, 9:52 AM ET

### ⭐ Final state, 10/14 ~5:45 PM ET: ✅ Ready for Release (Jira 14 on John's word)

**Everything is merged and live.** The app half reaches customers with the **next store release**;
the web half is live now.

**App merges** (Request `production`; no squash, every source branch kept):

| MR | What | Merge commit | Time (ET) |
|---|---|---|---|
| !500 | the check on every flow, the highlight, the matcher cuts | `4232d4507` | 9:52 AM |
| !503 | the word selection fix + the sheet on the G40-595 standard | `7f1718264` | 1:36 PM |
| !504 | the sheets in the G40-308 shape ("308 shapes, 595 colours") + the no-purchase sheet in the website's words | `11ec17b67` | 3:24 PM |
| !505 | the no-purchase sheet names the real switch | `d84be5011` | 4:23 PM |
| !506 | Ride's special instructions carry into the Delivery description | `557eb6c2f` | 5:25 PM |

Production `557eb6c2f` also carries G40-274's !502 and G40-611's !501.

**Web deploys** (live / twin): `dfce6fd` 8:08 AM · `f24429a` 2:48 PM · `16e833e` 3:13 PM ·
`21c2028` / `33ce759` 4:29 PM · `35c303f` / `d641690` 5:08 PM. Each was verified by content on
Pages, the twin and TigerTech.

**Rulings added 10/14** (John):
- **"308 shapes, 595 colours":** the app sheets use G40-308 Guide B (grab handle, badge, title,
  only as tall as their content); the web uses Guide A cards. Picks: **U21-TITLE = A** ("One thing
  to change", 1:46 PM), **AR-NO-BUTTON = A** (the outlined No, 2:23 PM).
- **The no-purchase sheet uses the website's words, on both.**
- **The sheet names the switch the requester sees:** "turned off **This delivery requires a
  purchase**". The web switch reads "Slide if this delivery requires a purchase"; it used to say
  "…a purchase needed". John on build 993: "yes change it on both".
- **Ride → Yes carries the rider's text** (John: "Carry it over"). The text that tripped the check
  moves as Delivery's description; on Ride that is the special instructions. This **supersedes**
  call 1's "a ride carries no description" below. Same rule on the web (`#ageKwYes`), the app
  (`deliveryCarryValues(values, flow)`) and the Request prototype.

**Device passes (A50, Android):**
- Under 21: **992** and **993**.
- 21+: **993**, **995** and **996**. 996 is exactly production `557eb6c2f`; the full pass ran
  5:30–5:34 PM. John: the A50 pass is the Android pass.

**iOS:** 5690–5698 were installed for the earlier heads. !505 and !506 are JS only and were
device-tested on Android.

**Not run on a device:** the GO-To toast. Neither testing account has a GO-To, and none was created.
`YardStepNav.g40623.test.js` covers it.

**Carried to the desk:**
- The Request 101 age paragraph, after the store release.
- The parking lot:
  - the GO-To's pill logo goes blank when selected (Request History);
  - PL-280: `run-all.sh` is red on 3 checks that aren't from this ticket;
  - PL-284: the Request prototype's age sheet is still pre-kit.

**Merged** on John's word ("merge, report it"): MR !500 → Request `production` **`4232d4507`**,
2026-10-14 **9:52:18 AM ET**. Pinned to the tested head `9bab9ea4d` (pipeline 2947053992 passed). No
squash, so `1564d016d` and `9bab9ea4d` keep their SHAs. The source branch is kept. Production's tree
equals `9bab9ea4d`, so the tested builds (iOS **5691**, Android **991**) carry exactly this code. It
reaches customers only with the **next store release**: live 872/873 don't have it.

**Device test (A50):**
- **990** (9:22–9:29 AM ET) passed (b) and found one defect: after the move to Delivery, ✕ went back
  to the Yard form with a leftover draft.
- Fixed in `9bab9ea4d`: the move replaces the screen, remounts Delivery, and drops the source draft.
- **991** retest (9:46–9:50 AM ET) passed: ✕ and Android Back go home; no leftover draft; Delivery
  keeps its own draft.
- **Test (a), under 21, is still not run on a device:** it waits on John's under-21 account.

**Harness:** `PENDING_G40_623` is deleted. Against production `4232d4507` the lists, the exceptions
and all 8,058 verdicts are identical. Any difference now FAILS, and so does a return to a
Delivery-only scan.

### Follow-up ✅ MERGED: MR !503 → production `7f1718264`, 1:36:03 PM ET, 10/14

The G40-274 session merged it on John's "merge !503", and I verified it: the tree equals the tested
head `097d9db4b`, no squash, branch `G40-623-select-fix` kept. Builds iOS **5692** / Android **992**.

- **`5a4b57333`:** the under-21 block now highlights the word. `DescriptionField` puts the same id
  on its wrapper div and its textarea, and `getElementById` returned the div.
- **`097d9db4b`:** `ContinueCheckSheet` now uses the G40-595 sheet standard (S-01 bar, S-03
  pills, S-04 black/red title and navy ✕, centred words). This was on John's "update the
  ContinueCheckSheet so no one make that mistake again". A guard test fails on the old look.
- **Under-21 device walk (A50, 992), all PASS:**
  - Delivery hides the age switch.
  - The block shows on every attempt.
  - Edit my request and ✕ both highlight the word with the keyboard up.
  - Ride highlights it in special instructions.
  - A replaced word continues to Step 3.
- **Not tested on a device:**
  - The GO-To path. The minor account has no requests, and the toast is 21+ only.
  - The 21+ question sheet and Delivery's "Attention!" in the new look. The guard test covers them.

### Before the merge

App repo `gophergo/gopher-mobile-requester-capacitorjs`, branch **`G40-623`**, commit **`1564d016d`**
(on `production` ab399d3f7). Pushed on John's "yes push it" (10/14). **MR !500** →
`production`, squash **NO**, delete source **YES**, John merges:
https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/500

**What it does (D1 + item 1, as ruled):**
- The age-keyword check runs on **Step 2 of all eight flows** (`stepFlow/ageKeywordCheck.js`, run by
  `YardStepNav` ahead of each flow's own check, on Continue and again before Review). On Need a Ride
  it reads the **special instructions** (owner 10/14).
- **Under 21:** the neutral block on every attempt. Closing it (Edit my request, ✕ or a swipe) selects
  the tripping word in the box (owner 10/13, "Both").
- **21+:** "This looks age-restricted" once per wording. "No" goes on (D6 is still unruled; the app's
  behaviour is kept). "Yes" on Delivery is unchanged. "Yes" anywhere else moves the request to
  **Delivery Step 2** with the age switch and the purchase ON (owner 10/14, "same as web").
- The lists and the matcher are re-extracted from the web (live `dfce6fd`), with the ruled cuts
  (P1, P2, P4; P3 declined).

**Proof:**
- Harness §8 run on the branch (`GOPHER_REQUEST_APP_REF=G40-623`, added for this): lists, exceptions
  and verdicts are identical on 8,058 inputs; "age-keyword scan: every flow on both" PASSES. The two
  G40-623 warnings are gone.
- `app-age-probe.js`: 0 verdict, 0 code and 0 range differences.
- App: 187/187 suites, 3,152 tests, eslint 0, Prettier clean, all 26 CI node guards pass.
- The Delivery onload change gives **every stored order shape exactly what it gave before** (test over
  `cost_of_goods` INTEGER/null × `age_restricted?` BOOLEAN/null). It only differs for the moved request.

**Three calls, RULED by John 10/14 ("keep all three"):**

1. **The move to Delivery carries the description and photos, NOT the addresses.** The web keeps
   addresses across a category switch. But a ride's pick-up is the rider's own location, while a
   delivery's pick-up is the store, so carrying them would point the Gopher at the wrong end.
   ~~A ride carries no description (it has none), as on the web.~~ ⛔ **Superseded 10/14:** a ride
   now carries its special instructions as the description (John: "Carry it over"; !506 and web
   `35c303f`). The addresses rule is unchanged.
2. **A request already marked age-restricted is not asked again** on any flow: Delivery's switch, as
   before, and now also **Custom Task's switch**. Otherwise "bartender for my event, wine" with the
   switch already on would be asked and moved to Delivery. The web has no Custom Task switch yet
   (the CT port), so this has no web counterpart today. **Under 21 is blocked regardless.**
3. **A GO-To does not move.** "Yes" there shows a toast: "A GO-To can’t move to Delivery. Please edit
   your request to continue." Moving it would drop GO-To mode and carry its values into a live request.

~~**Not proven yet (needs a phone build):**~~ ✅ **Both proven on the A50:** the selected word with the keyboard up (992/993), and Delivery opening with age + purchase ON after a move (993, 996). Original note: whether the keyboard comes up on the selected word. jsdom's
focus model differs from a WebView: a negative control (focus release off) still passed 5 of 6, so the
mount test does not prove the focus release. That needs a device check. So does the Delivery screen
opening with age + purchase ON after a move. The onload mapping is tested with the real
`mappingVariable`, but the screen itself has not been run.

**After it merges:** delete `PENDING_G40_623` from `run_parity_harness.py`. The D1 detector already
recognises the new shape and FAILS if it regresses.
