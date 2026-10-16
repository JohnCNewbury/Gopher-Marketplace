# Audit D — Submit payload, step gates, drafts (Request web vs live Request app)

**Pins (read-only):** APP `b47efe59f` (gopher-mobile-requester-capacitorjs) · SERVER `7e571e9f` (= `origin/production` of gopher-backend-api) · WEB `9e29366` (live site root). All paths below are relative to those worktrees (`app/src/…`, `server/…`, `web/…`).
**Method:** every row read first-hand at the cited lines. Executed (read-only, `node`): (1) the app's own pure payload modules copied into `scratchpad/sync/harness/` with import extensions added and `moment` stubbed (only used for flexible-window dates), run through each flow's `valuesBeforePricing → withPickedAddress/withTimingFlags → reviewValues → summary.js createOrder shaping → createOrderObjcet` (`harness/run-payloads.js`); (2) the web's real `assets/js/gopher-step-gates.js` and the app's `deliveryFirstProblemStep` on the same input (`harness/run-gates.mjs`). Nothing was driven in a browser or on a device.

## The two facts that frame everything below

1. **The live website never sends a create-order request.** Its Submit (`web/gopher-request.html:18146-18158`) calls `submitRequestAndCapture()` (`:14540-14546`), which writes an in-page record through `window.__createDashboardRequest` (`:25283-25373`, `DASH_DATA.activeRequests.unshift(req)`). The only `fetch`es on the page are the worker-count lookup (`:19703`), self-referral (`:33383`) and commented stubs (`:20435`, `:30370`); no `/orders` call was found (searched `fetch(|XMLHttpRequest|apiCall|/orders|GOPHER_API_BASE` in the page and `assets/js/*.js`). So "the web payload" is the web's in-page **request record**, compared field-by-field against the app's **wire body**.
2. **The app's wire body is multipart, all strings.** `pages/summary.js:542-555` posts `createOrderObjcet(...)` with `"Content-Type": "multipart/form-data"` through `axios.post` (`axios/axios.js:310-319`, no `CapacitorHttp` in `capacitor.config.ts`), so axios (lock 1.18.1) serialises the object to FormData (nested keys as `address[line1]`, booleans/numbers as strings, `null` → `""`, `undefined` and empty arrays omitted — **inferred from axios 1.x source, not executed: no node_modules**). The server parses it with multer **inside the controller** (`server/controllers/order/create.js:304-308, 319`) and compares several flags as strings (`=== 'true'`, `:566-569, 584, 590, 651`). The app's own code corroborates the multipart wire (`services/goTo.js:421-423` "create.js answers a multer failure…", `services/goToBody.js:655` "multipart would drop it at send anyway").

## Summary

| ID | Rule | Verdict |
|---|---|---|
| D-1 | Where Submit goes (create endpoint) | DIVERGES |
| D-2 | Wire encoding and value types | APP-ONLY |
| D-3 | Server create contract: required / validated / ignored | APP-ONLY |
| D-4 | Money units on the wire | APP-ONLY |
| D-5 | What the offer means with a crew (Moving/Junk/Yard) | DIVERGES |
| D-6 | Category / sub-type / title routing strings | DIVERGES |
| D-7 | Age-restricted flag | DIVERGES (Custom Task only) |
| D-8 | G40-628 D6 flags `age_keyword_declined` / `age_keyword` | SAME (logic) |
| D-9 | Gopher iQ capture fields | DIVERGES |
| D-10 | Schedule fields | DIVERGES |
| D-11 | Worker-selection fields, MY Gophers subset | DIVERGES |
| D-12 | Coupon | APP-ONLY |
| D-13 | TrustShield / identity on submit | SAME (client) |
| D-14 | Unit/Apt # | DIVERGES |
| D-15 | Photos | DIVERGES |
| D-16 | Pick-up when "purchase from anywhere" / single-location is on | DIVERGES |
| D-17 | Item info, hazardous, hourly mode/hours | DIVERGES |
| D-18 | Stairs shape | DIVERGES |
| D-19 | Crew-count shape | DIVERGES |
| D-20 | Constant fields (waiver, counter-offers, emergency, amount) | APP-ONLY |
| D-21 | Vendored `gopherStepGates.js` in the app | DIVERGES (copy drift) |
| D-22 | Earlier steps re-checked before Review / Submit | DIVERGES |
| D-23 | Description required | SAME |
| D-24 | Cost of items required with a purchase | DIVERGES (Custom Task only) |
| D-25 | Age-keyword check (under-21 block, Yes/No, ID sheet) | SAME |
| D-26 | Age "Yes" moves the request to Delivery — what is carried | DIVERGES |
| D-27 | Age-restricted with no purchase sheet — dismiss / re-arm | DIVERGES |
| D-28 | Phone number in the description | DIVERGES |
| D-29 | Category-mismatch nudge | WEB-ONLY |
| D-30 | Step 3 worker choice required | SAME |
| D-31 | Crew ≥ 2 when the crew switch is on | SAME |
| D-32 | Moving: ≥ 1 item or Multiple | SAME |
| D-33 | Which addresses are required | SAME |
| D-34 | Pick-up and drop-off at the same place | DIVERGES |
| D-35 | Worker pay > $0 (step 5 and at submit) | SAME |
| D-36 | Bids / pay-by-the-hour availability | DIVERGES |
| D-37 | Low-offer notice | DIVERGES |
| D-38 | Low-availability notice | DIVERGES |
| D-39 | Scheduled time required | SAME |
| D-40 | Liability waiver required | SAME |
| D-41 | "Age-Restricted Waiver / I Agree" before submit | APP-ONLY |
| D-42 | Cash App order rule acknowledgement | APP-ONLY |
| D-43 | A payment method is required to submit | APP-ONLY |
| D-44 | Duplicate-request warning | DIVERGES |
| D-45 | Step order and count | SAME |
| D-46 | Step 3 contents for Yard and Custom Task | DIVERGES |
| D-47 | Answers carried across a category change | DIVERGES |
| D-48 | Draft storage location and scope | DIVERGES |
| D-49 | Resume a web draft in the app (and vice versa) | SAME (neither can) |
| D-50 | What a draft carries | DIVERGES |
| D-51 | A scheduled time that passed, on resume | DIVERGES |
| D-52 | Consent and acknowledgements on resume | SAME |
| D-53 | When a draft is saved, offered, discarded | DIVERGES |
| D-54 | GO-To storage | DIVERGES |
| D-55 | What a GO-To send carries and checks | DIVERGES |
| D-56 | Request Again | DIVERGES |
| D-57 | Editing a pending request | DIVERGES |
| D-58 | Editing a released (recovery-window) request | DIVERGES |
| D-59 | Server rules for an edit | APP-ONLY |

Counts: SAME 14 · DIVERGES 35 · APP-ONLY 9 · WEB-ONLY 1 · DECLARED 0 · NOT FOUND 0.

## Per-category payload comparison

App column = the wire body the app builds (harness output, `harness/run-payloads.js`, sample inputs listed there); every flow also sends the fixed keys of `helpers/orderObject.js:67-240` (49 keys, listed under D-3). Web column = the in-page record `captureRequestToDashboard` passes to `__createDashboardRequest` (`web/gopher-request.html:14455-14527`), which is never transmitted.

| Category | App wire body (key values) | Web in-page record | Differences that matter |
|---|---|---|---|
| **Delivery** | `category_type "Delivery"`, `sub "General Errand"` / `"CBD/Other"` (A/R), `title "Delivery-General Errand"` / `"Delivery - Age-Restricted"`; `gopher_offering 20`, `service_cost 45` (dollars); `age_restricted? false`; `age_keyword_declined true, age_keyword "beer"` (only when declined); `pickup_address{street_line1, street_line2=pickup Unit}`, `dropoff_address{…, street_line2 "4B"}`, `address`/`address_attributes` blank; with purchase-anywhere the drop-off becomes `address` and pick-up/drop-off are blanked (`summary.js:495-523`); `select_gopher false, notify_fav_gopher false` (First available); `request_schedule_now true`; `move_asc_desc.gopher_needed 0`; `offer_by_gopher false`; `allowed_counter_offer true`; `liability_waiver true`; `trip_distance ""` | `category 'delivery'`, `title "Delivery · <first 45 chars>"`, `costOfItems`, `perWorkerCost`, `workersNeeded 1`, `ageRestricted`, `idRequiredAtCompletion`, `ageKeywordDeclined/ageKeyword`, `idVerification{method,submittedAt}` (A/R only), `pickups[]`/`dropoffs[]` (strings), `workerSelection 'first'`, `scheduledForLater`, `when` (text), `bidsMode false` | no routing strings; Unit/Apt dropped (D-14); typed pick-up kept even with "purchase from anywhere" (D-16); iQ capture dropped (D-9); MY Gophers subset dropped (D-11) |
| **Need a Ride** | `"Need a Ride"`, sub `""`, title `"Need a Ride"`; `order_info.noof_rider ≥ 1` (0 typed → 1), `order_info.noof_bag`; `special_instructions`; both addresses with Unit on line 2; `gopher_needed 0`; no bids | `numRiders`, `numBags`, `specialInstructions`, `pickups`/`dropoffs`, `workersNeeded 1` | riders floor 1 is app-side only (`ride.js:46-47`); Unit/Apt dropped on web |
| **Moving** | `"Moving"`, sub `"Location Move"` / one-address string, title `"Moving - <sub>"`; `move_asc_desc{no_of_item 3, total_stair_flight 3 (pick-up 1 + dest 2), gopher_needed 2}`; `gopher_offering 120` (the job's total); flexible window: `request_schedule_later true, request_flexible_type 2, request_schedule_time = now+7d` | `pickupStairs`, `destStairs` separate; `workersNeeded 2`; `perWorkerCost` × crew = total; no item count | offer meaning (D-5): typed 120 → app 120, web 240; stairs shape (D-18); item count dropped (D-17) |
| **Junk Removal** | `"Junk Removal"`, sub `""`; `move_asc_desc{no_of_item 0 (Multiple), gopher_needed 1}`; `order_info{multiple_item_remove true, hazardous_material true}`; bids: `gopher_offering 0, offer_by_gopher true`; MY Gophers: `notify_fav_gopher true, notify_select_fav_gopher [101,102]`; `address{line1, line2 "Unit 9"}` | `bidsMode true`, `workerSelection 'my'`, `dropoffs[]`, `workersNeeded 1` | items / hazardous dropped (D-17); chosen MY Gophers dropped (D-11); web also offers hourly on Junk (D-36) |
| **Hourly / Day Labor** | `"Hourly / Day Labor"`; hourly: `order_info{payingby_hour true, noof_hour 3}`, `hourly_wage 25`, `gopher_offering 150` (= 25 × 3 h × 2 crew), `wage_per_gopher 0`; `total_stair_flight 1`; `gopher_needed 2` | `perWorkerCost` = rate × hours, `workersNeeded 2`, `destStairs` | hourly flag / hours / rate not on the web record (D-17) |
| **Yard Project** | `"Yard Project"`, sub `""`, title `"Yard Project"`; crew off → `gopher_needed 0`; one address; `select_gopher true` | `workerSelection 'select'` (forced), `workersNeeded 1` | crew-off shape 0 vs 1 (D-19); Step 3 choice (D-46); web hourly on Yard (D-36) |
| **Home Services** | `"Home Services"`, sub `""`; `home_service_what_needed {details: <description>}`; `address{line2 "Apt 2"}`; `gopher_needed 0` | `descriptionFull`, `dropoffs[]` | checklist entry and Unit/Apt app-only |
| **Custom Task** (web `other`) | `"Other"`, sub `""`, title `"Other - "`; `need_purchase true`, `service_cost 30` (purchase; waived with bids); `age_restricted?` from CT switch; First available | `category 'other'`, no purchase, no A/R, `workerSelection 'select'` (forced) | ruled CT port not built (D-7, D-24, D-46) |

---

## A. Submit payload

### D-1: Where "Submit" goes (the create-order request)
- APP: `pages/summary.js:542-555` — `await API.post(\`orders\`, data, {… "Content-Type": "multipart/form-data", isWebPlateform: true, … appversion …})` — POST `/api/v1/orders` (base URL + `routes/index.js:12`). Edits go to `PATCH orders/v2/${orderId}` (`summary.js:455-468`), a bid hire to `PUT orders/bid/${data.bid_id}` (`:321-332`). One decision point: `submitOrder` (`:630-659`).
- WEB: `gopher-request.html:18146-18158` — "Step 6 = Review. Advancing SUBMITS: capture into the dashboard log" → `submitRequestAndCapture()` (`:14540-14546`) → `captureRequestToDashboard()` (`:14372-14530`) → `window.__createDashboardRequest` (`:25283`) "Create a dashboard request from the flow's submitted data" → `DASH_DATA.activeRequests.unshift(req)` (`:25373`). Public (signed-out) demo captures nothing (`:14542` "public demo: nothing to capture"). `web/assets/js/gopher-step-gates.js:256-259` states the same: "these dashboards never POST an order".
- SERVER: `controllers/order/index.js:23-29` (`router.post('/', user_auth, user_type_auth, verify_user_existence, create.create)`); `create.js:316-1267`.
- VERDICT: DIVERGES
- IF DIVERGES: the app creates a real order (Stripe authorisation, broadcast, HQ log); the web creates a local record that vanishes on reload. Input: any complete request → app: an `orders` row; web: `GR-0001` in page memory only.
- CONFIDENCE: high. Not checked: the PT twin's `gopher-web-pt-bridge.js` (twin only, PT mode).

### D-2: Wire encoding and value types
- APP: `pages/summary.js:546-548` — `"Content-Type": "multipart/form-data"` passed to `axios/axios.js:310-319` `post` (`const payload = { ...data }` → `instance.request`). axios turns a plain object + multipart header into FormData (inferred from axios 1.x `transformRequest`/`toFormData`; lockfile `axios 1.18.1`, `package-lock.json:7780-7781`). Booleans travel as `"true"/"false"`, `null` as `""`, `undefined` (iQ fields when iQ never ran) and empty arrays (`attachments: []`, `notify_select_fav_gopher: []`) are omitted. Nested objects as bracket keys. Headers `appversion`, `isWebPlateform` set by the interceptor (`axios.js:27-42`).
- WEB: no wire (D-1). The record holds native JS types (`ageRestricted: !!data.ageRestricted`, numbers, arrays of address strings) — `gopher-request.html:25326-25372`.
- SERVER: `create.js:304-308` `multer({…}).any('attachments')`, run inside the handler (`:319`); string compares `req.body.request_schedule_later === 'true'` (`:566-569, 590, 651`), `request_schedule_now === 'true'` (`:584`); tolerant compares `String(x) === 'true'` for `age_restricted?`, `notify_fav_gopher`, `offer_by_gopher`, `suggested_offer_used` (`:523, 541, 578, 630, 641, 691`). `req.files.length` is read unguarded after the order row is inserted (`:855`), inside a `.then` whose `.catch` answers 406 "Could not create order." (`:1256-1261`). `getServiceFee` returns 0 with no `appversion` header (`helpers/functions.js:254-255`).
- VERDICT: APP-ONLY
- IF DIVERGES: n/a. ⚠️ For whoever wires the web to place real orders: a JSON body would (a) store `request_schedule_time` NULL and skip the schedule check for a scheduled request (`true !== 'true'`), and (b) per multer 1.4 behaviour leave `req.files` undefined, so `:855` would throw AFTER the order and its payment authorisation exist, returning 406. Post multipart (as the app does) and send `appversion`, or the request fee is $0.
- CONFIDENCE: medium. axios and multer behaviour inferred from library source knowledge (no node_modules in either pin); not executed.

### D-3: Server create contract — what is required, validated, ignored
- APP: always sends the full fixed key set (harness: `aasm_state, request_type, title, description, attachments, age_restricted?, [age_keyword_declined, age_keyword], service_cost, cost_of_goods, iq_* ×5, gopher_offering, location, move_asc_desc, address, pickup_address, purchase_anywhere, address_attributes, dropoff_address, trip_distance, time_limit, special_instructions, allowed_counter_offer, coupon, coupon_id, category_type, sub_category_type, select_gopher, notify_select_fav_gopher, notify_fav_gopher, request_schedule_now, request_schedule_flexible_time, request_schedule_later, request_flexible_type, request_schedule_time, order_info, hourly_wage, wage_per_gopher, need_purchase, home_service_what_needed, offer_by_gopher, bid_id, liability_waiver, emergency, error_message`) — `helpers/orderObject.js:67-240`.
- WEB: n/a (no request).
- SERVER (`create.js`): **refuses** with no address (`:374-385` needs `dropoff_address.street_line1` or `address_attributes.line1` (only when no drop-off, `:60-64`) or `pickup_address.street_line1`); **offer floor** `gopher_offering` < $0.01 unless `offer_by_gopher` = "true" (`:391-399`, `helpers/offer_floor.js:51-61`, `constants/index.js:329 MIN_GOPHER_OFFER_CENTS = 1`); **same place** ≤ 25 m for Delivery/Ride/Moving Location Move (`:462-476`); **under-21 / no DOB** + A/R title or `age_restricted?` → 403 (`:520-533`); **TrustShield** (`:539-552`); **schedule validity** when later (`:590-597`); **coupon** verify → 406 (`:717-730`). **Reads** (grep of `req.body.*` in `:316-1267`): the fields above plus `service_cost` (becomes `cost_of_goods`, `:607`), `hourly_wage`, `wage_per_gopher`, `order_info`, `home_service_what_needed`, `notify_select_fav_gopher`, `iq_*`, `suggested_offer_used`, `go_to_id`, `payment_method_id`, `item_already_paid`, `category`, `special_instructions`, `liability_waiver`, `emergency`, `allowed_counter_offer`. **Ignored** on create (not read): `cost_of_goods`, `need_purchase`, `trip_distance`, `request_type`, `location`, `time_limit`, `bid_id`, `error_message`, `coupon_id` (re-derived from the code), `request_schedule_flexible_time`, `address` (only `address_attributes` is used), `amount`. The whole body is archived in `orderJson.metadata` (`:1246-1251`).
- VERDICT: APP-ONLY
- IF DIVERGES: n/a. Harmful if a future web client omits: `service_cost` (`(parseFloat(undefined)*100).toFixed(0)` = "NaN", `:607`), `gopher_offering` (400), every address (400), `category_type` (no fee, no dispatch match), `title` (under-21 gate reads it). Harmless if omitted: the ignored list.
- CONFIDENCE: high for the code read; not checked: `same_place.js`, `set_order_info`, `charge.create` internals.

### D-4: Money units on the wire
- APP: pricing call sends cents (`json/requester/deliveryflow.json:662-667` `"offer": "{gopher_offering}*100"`, `"cost_of_goods": "{cost_of_goods}*100"`), merged into `values.summary` (`actions/action.js:347-350, 551-557, 581-584`); create divides back to dollars: `service_cost: values?.summary?.cost_of_goods / 100`, `gopher_offering: … values?.summary?.offer / 100` (`orderObject.js:79-80, 96-101`); `hourly_wage`, `wage_per_gopher` dollars (`:229-230`). Harness: Delivery `gopher_offering 20, service_cost 45`.
- WEB: dollars as numbers (`perWorkerCost`, `costOfItems`, `gopher-request.html:14463-14466`); never sent.
- SERVER: create multiplies to cents: `offer: (parseFloat(req.body.gopher_offering) * 100).toFixed(0)`, `cost_of_goods: (parseFloat(req.body.service_cost) * 100)…` (`create.js:606-607`), wages likewise (`:671-676`), iQ via `iqCents` (`:617-618`); `/orders/summary` takes cents (`:66-79`).
- VERDICT: APP-ONLY
- IF DIVERGES: n/a (both hold dollars; only the app transmits). Note: create = dollars, summary = cents.
- CONFIDENCE: high.

### D-5: What the offer means when more than one Gopher is needed (Moving, Junk, Yard)
- APP: Moving/Junk/Yard send the single offer field as the job's `gopher_offering`; no multiplication by crew in `mvValuesBeforePricing` (`yardFlow/movingFlowSteps.js:285-300`), `junkValuesBeforePricing` (`stepFlow/flows/junk.js:124-144`), Yard `valuesBeforePricing` (`yardFlowSteps.js:172-190`); label "Your offer to your worker" (`json/requester/movingflow.json:521`); review copy "One worker accepts your request and agrees to show up with all {crew} workers" (`yardFlow/YardReviewExtras.js:240-246`). Harness Moving: typed 120, crew 2 → `gopher_offering 120`. (Labor is the exception: `laborPay` total = per-Gopher × crew, `laborFlowSteps.js:160-185`.)
- WEB: `payAmount` is per worker — "Exact amount each Gopher takes home" (`gopher-request.html:16254`); `snapWorkerPay = perWorker * workersNeeded` (`:14437`), `amountLabel` `perWorker * workersNeeded + cog` (`:14473-14477`), `crewCount()` (`:15176-15177`).
- SERVER: stores what it receives as `offer` (`create.js:606`).
- VERDICT: DIVERGES
- IF DIVERGES: Moving, crew 2, typed $120 → app offers the Gopher $120 total; web totals $240 worker pay (and prices fees on $240). Labor agrees on both.
- CONFIDENCE: medium. Not checked: on-device copy of the app pay card for Moving/Junk; an owner ruling on which meaning is canonical.

### D-6: Category, sub-type and title routing strings
- APP: each flow sets exact routing strings before pricing: Delivery `"General Errand"`/`"Delivery-General Errand"` or `"CBD/Other"`/`"Delivery - Age-Restricted"` (`stepFlow/flows/delivery.js:58-61, 245-261`); Ride `"Need a Ride"`, sub `""` (`ride.js:137-150`); Moving `"Moving - <sub>"` (`movingFlowSteps.js:285-292`); Custom Task `"Other - "` (`helpers/orderObject.js:16-24`, `customTaskFlowSteps.js:220-223`); Home/Junk/Labor/Yard category as title, sub `""`.
- WEB: record carries `category: state.category` (key such as `'delivery'`) and a display title `` `${c.name} · ${shortDesc}` `` (`gopher-request.html:14413-14415, 14462`); no sub-type.
- SERVER: dispatch, fee and the under-21 title gate key on these strings (`create.js:522, 559, 573-575`).
- VERDICT: DIVERGES
- IF DIVERGES: an A/R Delivery → app sends sub `"CBD/Other"`, title `"Delivery - Age-Restricted"`; web record has `category 'delivery'`, title `"Delivery · case of beer"`. A web→server port must map keys to the app's strings (`gopher-flow-rules.js:35-44` has slugs, not these strings).
- CONFIDENCE: high.

### D-7: Age-restricted flag
- APP: `"age_restricted?": values.has_age_restriction ? … : false` (`orderObject.js:73-75`). Set by Delivery's switch (21+ only) and by Custom Task's switch (`customTaskFlowSteps.js:182-184` keeps `has_age_restriction`).
- WEB: `ageRestricted: state.ageRestricted` (`gopher-request.html:14480`); the switch exists only in the Delivery block (`:15772-15777`, `canSeeAgeRestricted()` `:15241-15244`); category-scoped reset (`:14720`).
- SERVER: `age_restricted_fee` and TrustShield discount from `age_restricted?` on any category (`create.js:577-582`).
- VERDICT: DIVERGES (Custom Task only)
- IF DIVERGES: Custom Task "bartender for my event" with the A/R switch on → app sends `age_restricted? true` (+$1.99 server fee); web `other` has no switch. Owner ruled the web gets the app's Custom Task logic (prior doc "CT" row, inherited) — not built at `9e29366`.
- CONFIDENCE: high for Delivery; Custom Task switch visibility to under-21 not re-checked here.

### D-8: G40-628 (D6) double-flag fields `age_keyword_declined` / `age_keyword`
- APP: set by the ID sheet's "Submit as-is" `set: { …, age_keyword_declined: true, age_keyword: term }` (`stepFlow/ageKeywordCheck.js:227-238`); sent only via `ageKeywordDeclinedFields` — not when A/R, only when the answered wording `dl_age_keyword_ack` still equals the description or special instructions, word trimmed to 100 (`helpers/ageKeywordDeclined.js:25-40`; spread at `orderObject.js:78`). Harness Delivery: `age_keyword_declined true, age_keyword "beer"`.
- WEB: "Submit as-is" sets `ageKeywordAck`, `idRequiredAtCompletion`, `ageKeywordDeclined`, `ageKeyword = String(kw).trim().slice(0, 100)` (`gopher-request.html:18540-18550`); every description/special-instructions edit clears them (`:17431, 17444-17447`); record `ageKeywordDeclined: !state.ageRestricted && !!state.ageKeywordDeclined` (`:14483-14484`, stored `:25350-25351`).
- SERVER: `ageKeywordFlag` (never on an A/R order, word ≤ 100) on create (`create.js:634`), `ageKeywordFlagForUpdate` keeps the stored flag when an edit does not mention it (`helpers/age_keyword_flag.js:34-60`); GO-To keeps both (`helpers/go_to_body.js:68-69`).
- VERDICT: SAME (logic)
- IF DIVERGES: n/a. Both invalidate on edit (web clears; app stops sending because the ack no longer matches). Only the app transmits.
- CONFIDENCE: high.

### D-9: Gopher iQ capture fields
- APP: `iq_suggested_offer`, `iq_model_version`, `suggested_offer_used`, `iq_tier`, `iq_tier_source` (`orderObject.js:88-95`), written by `component/smartPriceSuggestion.js:272-296` (suggestion + model version + tier), `:338` (manual edit → false), `:362` (commit → true); `undefined` when iQ never showed (omitted → NULL).
- WEB: computes `suggestedOfferUsed` (`gopher-request.html:14043, 17491`) and passes it (`:14524-14526`), but `__createDashboardRequest` does not store it (record `:25326-25372` has no such key; grep `data.suggestedOfferUsed` finds nothing). No suggested amount, model version or tier on the record (`DELIVERY_MODEL_VERSION`/`RIDE_MODEL_VERSION` exist only as exports, `assets/js/gopher-request-logic.js:452, 515, 915-916`).
- SERVER: stores all five (`create.js:617-630`).
- VERDICT: DIVERGES
- IF DIVERGES: Delivery, offer taken from the iQ modal → app sends `suggested_offer_used "true"` + amount + `g40-502-…` version; web record has none of it.
- CONFIDENCE: high.

### D-10: Schedule fields
- APP: `timingValues` maps ASAP / window 1-2-3 / exact to `need`, `flexible`, `request_flexible_type`, `request_schedule`, `request_schedule_time` (`yardFlowSteps.js:337-369`); create sends `request_schedule_now`, `request_schedule_later`, `request_flexible_type`, and for a window computes `request_schedule_time` = now + 1/7/14 days at submit (`orderObject.js:42-52, 179-186`). Harness Moving (week): `later true, flexible_type 2, time "…+7d"`.
- WEB: state `scheduleType`, `flexibleWindow`, `schedDate`, `timeSlot` (`gopher-request.html:14689-14695`); record keeps only `scheduledForLater: state.scheduleType !== 'now'` and a display string `when` (`:14389-14395, 14478-14479`) — no date, time or window code.
- SERVER: `preferred_delivery_time` 60/360, `delivery_eta` = schedule time when later (`create.js:558-570`), validity check (`:590-597`).
- VERDICT: DIVERGES
- IF DIVERGES: exact time Oct 20 3:00 PM → app sends an ISO timestamp; web record holds `"Oct 20, 2026 · 3:00 PM · awaiting selection"` text only.
- CONFIDENCE: high.

### D-11: Worker-selection fields and the MY Gophers subset
- APP: First available = `select_gopher false, notify_fav_gopher false`; "I'll select" = `select_gopher true`; MY Gophers = `notify_fav_gopher true` + `notify_select_fav_gopher` = the chosen ids (`orderObject.js:176-178`; `available` is a form-only flag). Harness Junk: `notify_select_fav_gopher [101,102]`.
- WEB: `workerSelection 'first'|'select'|'my'` (`gopher-request.html:14501-14502`); the chosen subset lives in `state.hireAgainGophers` (`:17325-17340`) and shows on Review (`:16518`) but is NOT passed to the record (`:14455-14527`); the record's 'my' branch auto-hires any MY Gopher via `window.__myGopherNames()` (all of them) (`:25317-25324`).
- SERVER: `selectgopher` = notify_fav ? true : select_gopher (`create.js:640-643`); notifies the listed favourites (`:928-937`).
- VERDICT: DIVERGES
- IF DIVERGES: MY Gophers A, B, C saved; requester ticks only A → app notifies A; web's record ignores the pick and can auto-hire B.
- CONFIDENCE: high (read); not driven.

### D-12: Coupon
- APP: `coupon` = Redux `coupon.coupon.coupon_data.code` else `values.coupon`; `coupon_id` likewise; both `null` on a bid (`orderObject.js:164-173`).
- WEB: `promoCode`/`promoApplied` in state (`gopher-request.html:14583-14585`); not on the record (`:14455-14527`).
- SERVER: verifies the code, ignores `coupon_id` (`create.js:717-730`).
- VERDICT: APP-ONLY
- IF DIVERGES: n/a.
- CONFIDENCE: high. Coupon maths is another audit's area.

### D-13: TrustShield / identity on submit
- APP: no client identity gate — `helpers/offerFloor.js:19-25` ("Referencing gates by id means the identity gate is never reachable from here"); nothing TrustShield-related in the body (`orderObject.js:67-240`).
- WEB: `'identity'` not in `SURFACE_GATES.request` (`assets/js/gopher-step-gates.js:297-299`, ruling text `:243-265`); record carries `idVerification.method` `'trustshield'|'submitted'|'pending'` for A/R Delivery (`gopher-request.html:14488-14497`), never sent.
- SERVER: `trust_shield_required` refuses an A/R order from an unverified requester under `TRUSTSHIELD_MIN_AGE` (code default 30) (`helpers/trustshield_policy.js:19, 28, 155-165`; `create.js:539-552`); TS $1 discount from the user row (`:579-582`).
- VERDICT: SAME (client)
- IF DIVERGES: n/a. ⛔ Whether the server gate is live depends on the production env `TRUSTSHIELD_MIN_AGE` (an inherited comment says 21 since 2026-08-31, `trustshield_policy.js:122-124`). **Not verified — needs an AWS/EB env read; blocked. No verdict depends on it.**
- CONFIDENCE: high for clients; server effect unverified (AWS).

### D-14: Unit/Apt #
- APP: the typed Unit/Apt becomes line 2 of the address sent — `withUnitApt` (`yardFlow/stepAddress.js:25-29`), Delivery/Ride `withUnit` (`delivery.js:310-321`, `ride.js:177-188`). Harness: Delivery `dropoff street_line2 "4B"`, Junk `address.line2 "Unit 9"`, Home `"Apt 2"`.
- WEB: `pickupUnit`/`destUnit` (`gopher-request.html:14653-14659`) are shown on Review only (`addrWithUnit`, `:16453, 16461`); not in the record (`:14455-14527`) nor the draft (`assets/js/gopher-request-draft.js:39-54`).
- SERVER: stores `line2`/`street_line2` (`create.js:943-1003`).
- VERDICT: DIVERGES
- IF DIVERGES: Delivery to "200 Oak Ave", Unit "4B" → app sends `street_line2 "4B"`; web record keeps `"200 Oak Ave"` only.
- CONFIDENCE: high.

### D-15: Photos
- APP: `attachments: values.attachment || []` (`orderObject.js:72`); server stores files/URLs (`create.js:819-903`).
- WEB: "Add a pic" picks a random demo image (`gopher-request.html:17388-17393`); `picThumbs` are not passed to the record (`:14455-14527`); record `live.pics: []` (`:25402`).
- SERVER: as above.
- VERDICT: DIVERGES
- IF DIVERGES: 2 photos attached → app uploads 2; web record has 0. (Web photos are demo stand-ins.)
- CONFIDENCE: high.

### D-16: Pick-up when "Gopher can purchase from anywhere" / "Single-location move" is on
- APP: the switch clears the pick-up (`purchaseAnywhereChanges(true)` sets `pickup_: ""`, blank `pickup_address`, `stepAddress.js:54-62`); create moves the drop-off into `address` and blanks pick-up/drop-off (`summary.js:495-523`); Moving one-address shape from `movingSubType` (`movingFlowSteps.js:264-273`).
- WEB: the toggle only flips the boolean (`gopher-request.html:17283-17286`); `pickups: state.pickupStops.slice()` regardless (`:14504`); `hasPickup` true for `['']` (`:14503`); only the review snapshot says "Any location" (`:14443-14445`).
- SERVER: builds the broadcast centre from pick-up first (`create.js:965-989`).
- VERDICT: DIVERGES
- IF DIVERGES: type pick-up "100 Main St", then switch "purchase from anywhere" on → app sends no pick-up; web record `pickups ["100 Main St"]`.
- CONFIDENCE: high (minor today; matters when the web posts).

### D-17: Item info, hazardous material, hourly mode and hours
- APP: `move_asc_desc.no_of_item`, `order_info.multiple_item_remove`, `hazardous_material`, `payingby_hour`, `noof_hour`, `hourly_wage` (`orderObject.js:103-107, 187-230`). Harness Junk: `multiple_item_remove true, hazardous_material true`; Labor: `payingby_hour true, noof_hour 3, hourly_wage 25`.
- WEB: record args carry none of `itemCount`, `multipleItems`, `hazardous`, `payByHour`, `numHours`, `junkTier`, `movingTier` (`gopher-request.html:14455-14527`); hours only folded into `perWorkerCost` (`:14377-14381`).
- SERVER: `set_order_info` (`create.js:925`), `no_of_item` (`:657-659`).
- VERDICT: DIVERGES
- IF DIVERGES: Junk "fridge + mattress", Multiple, hazardous → app sends both flags; web record has neither.
- CONFIDENCE: high.

### D-18: Stairs shape
- APP: one number `move_asc_desc.total_stair_flight`; Moving sends pick-up + destination (`mvStairTotal`, `movingFlowSteps.js:145-152`; harness 1 + 2 = 3); Labor `stair` (`laborFlowSteps.js:146-150`).
- WEB: `pickupStairs` and `destStairs` separately (`gopher-request.html:14512-14513`).
- SERVER: one column `total_stair_flight` (`create.js:660-662`).
- VERDICT: DIVERGES
- IF DIVERGES: Moving 1 + 2 flights → app `3`; web `{pickupStairs:1, destStairs:2}`. Shape only.
- CONFIDENCE: high.

### D-19: Crew-count shape
- APP: `move_asc_desc.gopher_needed` 0 with crew off on Delivery/Ride/Home/Yard/Custom Task, 1 on Moving/Junk/Labor, else the count (`stepFactories.js:79-81`; `delivery.js:269`, `ride.js:141`, `junk.js:128`, `laborFlowSteps.js:228`, `movingFlowSteps.js:294-296`, `yardFlowSteps.js:180`).
- WEB: `workersNeeded = crewCount()` → 1 when the crew control is hidden or off (`gopher-request.html:15176-15177, 14382`).
- SERVER: stores `gopher_needed` (`create.js:663-665`).
- VERDICT: DIVERGES
- IF DIVERGES: Delivery → app `0`, web `1`. Shape only; Gopher Go `.toString()`s it (app comments `delivery.js:33-34`).
- CONFIDENCE: high.

### D-20: Constant fields — waiver, counter-offers, emergency, amount
- APP: `liability_waiver` true once ticked (`orderObject.js:237`; Delivery DL-20 note `delivery.js:30-32`); `allowed_counter_offer` forced true by every flow (`stepFactories.js:93, 104`; `customTaskFlowSteps.js:216`; `movingFlowSteps.js:293`); `emergency` false (`orderObject.js:238`); `values.amount` is set (`summary.js:650, 656`) but is not a key of `createOrderObjcet`, so it is never sent (harness `amount_present: false`).
- WEB: record has none of these keys (`gopher-request.html:25326-25372`); no counter-offer toggle in the flow (searched `allowCounter|counterOffers|allowedCounterOffer` in the flow state).
- SERVER: stores `liability_waiver`, `allow_counter` (`create.js:670, 685-688`); computes the charge itself (`:741-760`), never reads `amount`.
- VERDICT: APP-ONLY
- IF DIVERGES: n/a.
- CONFIDENCE: high.

## B. Step gates

### D-21: The app's vendored `helpers/gopherStepGates.js`
- APP: imported only by `helpers/offerFloor.js:5` (grep for `gopherStepGates|GopherStepGates` across `src`); `offerFloor` imported only by `pages/renderForm.js:6`, where `gopher_offering`'s Yup test calls `offerBelowFloor` → `GopherStepGates.gateById("workerPaySubmit")` (`renderForm.js:276-288`, `offerFloor.js:76-87`). Yup only blocks `formik.submitForm()` (the legacy tile forms' `component/button.js:171, 285, 308`); the step flows advance through `YardStepNav.onContinue → stepProblem` (`yardFlow/YardStepNav.js:207-220`), which never calls Formik validation. So it is **not inert** (one gate, on the legacy tile forms and GO-To Form Mode) but it is **not the gate on any step flow**. Header says "BYTE-IDENTICAL copy" (`offerFloor.js:10-17`).
- WEB: `assets/js/gopher-step-gates.js` (loaded at `gopher-request.html:1823`).
- SERVER: not involved (searched `GopherStepGates|step-gates` in server: none).
- VERDICT: DIVERGES (copy drift)
- IF DIVERGES: sha256 differs (app `1f4c5e8f…`, web `0bfa9796…`); `diff` shows 4 hunks: "worker"→"Gopher" wording, the 2026-09-29 dropoff-address fix, the G40-274 same-place-by-location rule, the 2026-10-04 identity ruling comment. `workerPaySubmit` itself is identical. Input: Junk Removal at step 4 with an empty destination → the vendored `dropoffAddress` gate passes (bails on hidden pick-up section), the web's blocks — but the app never evaluates that gate, so no user-visible difference today.
- CONFIDENCE: high (diff run); Yup-vs-step-flow conclusion medium (not run in the app).

### D-22: Earlier steps re-checked before Review / Submit
- APP: every trip to Review (Continue on step 5, the progress bar's Review segment, Update Payment Info) runs `firstProblemStep` over steps 2–5, then every check (age keyword, same place, the flow's own) for steps 2–5 (`YardStepNav.js:93-110`; segment → `YARD_GOTO_REVIEW` `YardStepHeader.js:163-168` → `YardStepNav.js:166-170`).
- WEB: step tabs jump to any step ≤ `maxStepReached` with no checks (`gopher-request.html:14916-14926, 14938-14947`); at Submit `stepGate()` evaluates only gates whose step includes 6 (`gopher-step-gates.js:385-387, 404`): `addressesDiffer`, `workerPaySubmit`, `scheduleTime`, `waiver`; the age/phone checks run only on Step-2 Continue (`gopher-request.html:18074, 18096`).
- SERVER: create re-checks address, offer floor, same place, under-21 (`create.js:374-533`) — only for the app.
- VERDICT: DIVERGES
- IF DIVERGES: reach Review on Delivery, tap tab 2, clear the description (or, as 21+, type "case of beer"), tap tab 6, tick the waiver, Submit → web submits (executed: `GopherStepGates.evaluate({step:6, description:'', pickupStops:[''], dropoffStops:['']…})` → `{ok:true}`); app `deliveryFirstProblemStep` on the same values → `{step:2, problem:"Please describe what you need."}` (`harness/run-gates.mjs`).
- CONFIDENCE: high (module executed; page handler read, not driven).

### D-23: Description required
- APP: `!String(v.description || "").trim()` → "Please describe what you need." on Delivery, Yard, Junk, Home, Moving, Labor, Custom Task (`delivery.js:156-158`, `yardFlowSteps.js:283-285`, `junk.js:104-106`, `home.js:122-128` (an older order's checklist also satisfies it), `movingFlowSteps.js:193-195`, `laborFlowSteps.js:194-196`, `customTaskFlowSteps.js:137-139`); Ride has no description (`ride.js:65-68`).
- WEB: `description` gate `h.isVisible('describe') && !String(s.description || '').trim()` (`gopher-step-gates.js:59-67`); `describe` hidden for Ride only (`gopher-request.html:15010`).
- SERVER: not checked (searched `description` in `create.js`: stored only, `:604`).
- VERDICT: SAME
- IF DIVERGES: n/a (re-check gap is D-22).
- CONFIDENCE: high.

### D-24: Cost of items required when buying
- APP: Delivery `need_purchase && !(parseFloat(cost_of_goods) > 0)` (`delivery.js:161-163`); Custom Task the same **unless bids** (`customTaskFlowSteps.js:143-150`), and a bid sends no purchase (`:225-228`).
- WEB: `costOfItems` gate `itemsPurchased && !(parseFloat(…) > 0)`, no bids exemption (`gopher-step-gates.js:68-76`); purchase switch only in the Delivery block (`gopher-request.html:15772`).
- SERVER: not checked (cost stored, `create.js:607`).
- VERDICT: DIVERGES (Custom Task only)
- IF DIVERGES: Custom Task, purchase on, bids on, no cost → app continues (sends no purchase); web `other` has no purchase at all. Delivery is SAME. Settles with the ruled CT port (inherited).
- CONFIDENCE: high.

### D-25: Age-keyword check on Step 2 (under-21 block, "This looks age-restricted", ID sheet)
- APP: `ageKeywordCheck` on Step 2 of every flow, ahead of the flow's own check (`YardStepNav.js:60-68`); scans the description, Ride the special instructions (`ageKeywordCheck.js:65-66`, `ride.js:325`); no `can_request_restricted_items` → neutral block every time (`:149-166`); skipped when `has_age_restriction` or the same wording was answered (`:167`); "No" → ID sheet; "Submit as-is" sets the flags (`:168, 183-194, 207-242`).
- WEB: `$btnNext` Step-2 backstop for every category unless Delivery + A/R (`gopher-request.html:18067-18090`), `ageScanField()` Ride → special instructions (`:13474-13478`), under-21 → `ageRestrictedNotEligible` every attempt (`:18081-18084`, words `:18237-18242`), "No" → ID sheet, "Submit as-is" flags (`:18508-18550`); edits re-arm (`:17431, 17444-17447`).
- SERVER: under-21 title / `age_restricted?` 403 (`create.js:520-533`) — app only.
- VERDICT: SAME
- IF DIVERGES: n/a. Same sheets, buttons and re-arm rule. Differences in *when it re-runs* are D-22; the "Yes" carry-over is D-26.
- CONFIDENCE: high (matcher parity itself not re-run here; prior harness inherited).

### D-26: Age "Yes" outside Delivery moves the request to Delivery — what is carried
- APP: `deliveryCarryValues` carries the scanned text as the description, photos, A/R + purchase on, and nothing else; addresses are not carried (`ageKeywordCheck.js:87-101`; comment `:30-32` "⛔ The addresses do not"); navigation replaces the screen and drops the source draft (`YardStepNav.js:232-258`); a GO-To refuses to move (`:233-238`).
- WEB: "Yes" calls `switchCategory('delivery')` (`gopher-request.html:18490-18503`), which resets only the category-scoped keys (`:14740-14747, 14757-14763`) and keeps `pickupStops`/`dropoffStops`, `pickupUnit`/`destUnit`, `specialInstructions` (deliberately, `:14715-14717`).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: Ride with pick-up "1 Elm St", drop-off "Liquor Mart", special instructions "stop for beer" → Yes → app opens Delivery with empty addresses; web Delivery keeps "1 Elm St" as the store pick-up. (Prior doc records John's 10/14 "keep all three" for the APP side, inherited; no web change was made to match.)
- CONFIDENCE: high.

### D-27: Age-restricted with no purchase — "Most age-restricted orders need a purchase"
- APP: Delivery Step 2 `has_age_restriction && !need_purchase && !dl_age_no_purchase_ack` (`delivery.js:195-202`); "Continue without a purchase" sets the ack, which nothing clears (grep `dl_age_no_purchase_ack`: only `:201, 233`); "Don't show me this again" writes `localStorage` key `dl_age_no_purchase_dns` permanently (`:236`, `ContinueCheckSheet.js:280-289`).
- WEB: same trigger (`gopher-request.html:18107-18114`); switching purchase back on re-arms the ack (`:17295-17297`); "Don't show me this again" sets `state.agePurchaseDismissed` (`:18645-18647`), which `resetFlowState` resets on every new request and is not persisted (`:14609, 14700-14704`).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: tick "Don't show me this again" once → app never shows it again on that device; web shows it again on the next request. Or: Continue without a purchase → Back → purchase on → off → Continue → web re-asks, app does not.
- CONFIDENCE: high.

### D-28: Phone number in the description
- APP: masks as typed with `/\b(?:\d[ -()]?){9}\d\b(?!\d)/g` (`component/discriptionElement.js:56-59`); Continue not blocked.
- WEB: blocks Step-2 Continue with `/(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/` (`gopher-request.html:18096-18099`). Web-internal gap: after the age ID sheet's "Submit as-is" the page advances directly (`advanceFromJobDetails`, `:18467-18471, 18549`), skipping the phone gate.
- SERVER: not involved (searched phone patterns in `create.js`: none).
- VERDICT: DIVERGES
- IF DIVERGES: "call me 919-555-1234" → app sends it unmasked (the `[ -(]` range omits `-` and `.`); web blocks. Ruled D10 (prior doc, inherited): mask on both with the web's pattern; app ticket G40-626 — neither side built at these pins.
- CONFIDENCE: high (regexes read; app regex behaviour inherited from prior doc's run, not re-run).

### D-29: "Looks like a different category" nudge
- APP: no in-flow classifier (searched `classify|categoryMismatch|category-mismatch|G40-624` in `component/yardFlow`, `component/stepFlow`, `helpers`: none).
- WEB: Step-2 Continue, once, when no age keyword (`gopher-request.html:18100-18106`).
- SERVER: not involved.
- VERDICT: WEB-ONLY
- IF DIVERGES: n/a. Ruled D5 → the app adds it (G40-624, inherited); not built at `b47efe59f`.
- CONFIDENCE: high for the web; app absence = not found by those searches.

### D-30: Step 3 — a worker-selection choice is required
- APP: "Please choose how to select your worker." unless `available`/`select_gopher`/`notify_fav_gopher` (Delivery, Ride, Custom Task) or `select_gopher`/`notify_fav_gopher` (Moving, Junk, Home, Labor) (`delivery.js:164-166`, `ride.js:117-119`, `customTaskFlowSteps.js:151-153`, `movingFlowSteps.js:210-212`, `junk.js:107-109`, `home.js:129-131`, `laborFlowSteps.js:197-199`); Yard has no Step-3 choice check (`yardFlowSteps.js:281-300`); defaults are applied on first open (`junk.js:56-59`, `delivery.js:97`).
- WEB: no gate; `workerSelection` always holds a value (`gopher-request.html:14636`), radio rows (`:17305-17319`).
- SERVER: First Available when both flags false (`create.js:640-643`).
- VERDICT: SAME
- IF DIVERGES: n/a (both always submit with a choice).
- CONFIDENCE: medium (app default writers not traced for every flow).

### D-31: Crew ≥ 2 when "More than 1 Gopher" is on
- APP: `more_than_one_gopher && !(Number(gophers_needed) >= 2)` (`yardFlowSteps.js:286-292`, `movingFlowSteps.js:201-207`); pricing floors to 2 (`junk.js:131-134`, `laborFlowSteps.js:132-137`).
- WEB: counter minimum 2, maximum 20 (`gopher-request.html:15959, 17367-17368`).
- SERVER: not checked.
- VERDICT: SAME
- IF DIVERGES: n/a (app has no explicit max found).
- CONFIDENCE: high.

### D-32: Moving — at least 1 item or Multiple
- APP: `!v.multiple_item && !(itemsCount(v) >= 1)` (`movingFlowSteps.js:196-200`).
- WEB: item counter starts at 1 (`gopher-request.html:14647`); no gate needed.
- SERVER: not checked.
- VERDICT: SAME
- IF DIVERGES: n/a.
- CONFIDENCE: medium (web decrement floor not re-read).

### D-33: Which addresses are required
- APP: Delivery pick-up unless purchase-anywhere + destination (`delivery.js:167-176`); Ride both (`ride.js:120-125`); Moving both unless single-location, else one address (`movingFlowSteps.js:213-226`); Custom Task one address, or both with the pick-up switch off (`customTaskFlowSteps.js:154-163`); Yard/Junk/Home/Labor one address (`yardFlowSteps.js:293-295`, `junk.js:110-112`, `home.js:132-134`, `laborFlowSteps.js:200-202`).
- WEB: `pickupAddress` unless `noSpecificPickup` or the pick-up section is hidden; `dropoffAddress` always (`gopher-step-gates.js:115-150`); pick-up section on Delivery/Moving/Ride (`gopher-request.html:15030-15031`); the toggle reads "Single-location move" on Moving, "Gopher can purchase from anywhere" otherwise (`:16115-16121`).
- SERVER: at least one address (`create.js:374-385`).
- VERDICT: SAME
- IF DIVERGES: n/a (web `other` has no pick-up option yet — part of the CT port).
- CONFIDENCE: high.

### D-34: Pick-up and drop-off at the same place
- APP: by coordinates only, ≤ 25 m, on Step 4 of Delivery (unless purchase-anywhere), Ride, Moving (unless single-location); missing coordinates never block (`stepFlow/samePlaceCheck.js:40-49, 81-133`; flow entries `delivery.js:453-460`, `ride.js:300`, `stepFlows.js:251-258`); re-checked before Review (D-22).
- WEB: by `placeOf` coordinates when both known, **else by normalised address text** (`gopher-step-gates.js:350-357`), steps 4 and 6 (`:156`), wherever the pick-up section shows and `noSpecificPickup` is off (`:172`).
- SERVER: geocodes missing coordinates first, then refuses ≤ 25 m (`create.js:417-476`).
- VERDICT: DIVERGES
- IF DIVERGES: pick-up and drop-off both typed as "100 Main St" with no resolved coordinates → web blocks on text; app lets Continue through and the server refuses at Submit (400, `SAME_PLACE_MESSAGE`).
- CONFIDENCE: medium (whether the app can hold an address without coordinates was not driven).

### D-35: Worker pay > $0 (Step 5, and again at Submit)
- APP: Step 5 `!gopher_bid && !(parseFloat(gopher_offering) > 0)` (`yardFlowSteps.js:296-298`, `junk.js:113`, `home.js:135`, `movingFlowSteps.js:227`, `customTaskFlowSteps.js:164`), no bids on Delivery/Ride (`delivery.js:177-179`, `ride.js:126-128`), Labor rate/wage > 0 (`laborFlowSteps.js:203-213`); re-run before Review (`YardStepNav.js:96-101`).
- WEB: `workerPay` (step 5) and `workerPaySubmit` (step 6) `!(parseFloat(payAmount) > 0)` unless real bids (`gopher-step-gates.js:186-214`); the page supplies no `perWorkerPay`, so the raw amount is checked (`gopher-request.html:17827-17845`).
- SERVER: total ≥ 1 ¢ unless `offer_by_gopher` (`offer_floor.js:51-61`).
- VERDICT: SAME
- IF DIVERGES: n/a.
- CONFIDENCE: high.

### D-36: Bids and pay-by-the-hour availability
- APP: no bids on Delivery and Ride (`delivery.js:276-278`, `ride.js:146-148`); pay by the hour exists only in Labor, where it disables bids (`laborFlowSteps.js:95-106, 69-74`).
- WEB: `bidsAllowed = isVisible('bidsOption') && !(payByHour && (labor||yard))` (`gopher-request.html:15182`); the "Pay by the hour" toggle shows on every Worker-setup category except Moving — Yard, Junk, Other, Labor (`:15947-15974`, `FIELD_HIDDEN_FOR.workerSetup` `:15020`).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: Junk, pay by the hour on, bids → web allows bids with an hourly rate (Junk not in the `bidsAllowed` exclusion); app has no hourly on Junk. Ruled D14 "hourly on Labor only" (inherited) — not built on the web at `9e29366`.
- CONFIDENCE: high.

### D-37: Low-offer notice
- APP: inline notice + "Send as-is" when `offer < band.low`; it never blocks Continue (`component/smartPriceSuggestion.js:342-343, 505-533`; not referenced by any `stepProblem` — searched `lowAck|lowOffer` in `component/yardFlow`, `component/stepFlow`, `pages/summary.js`).
- WEB: blocks Step-5 Continue once with a modal (`gopher-request.html:18115-18129`); skipped in hourly mode.
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: Delivery $100 of items, offer $10 (below the low) → web stops Continue until "Send as-is"; app shows the note and Continue proceeds.
- CONFIDENCE: high.

### D-38: Low-availability notice
- APP: on picking an address, `GET /gopher_count` and a sheet when `data <= 20` (0 → "zero" sheet), each with a do-not-show key; not on Continue (`component/addresspicker.js:200-253`).
- WEB: on Step-4 Continue, once, when the client-side coverage table (`GopherIQData.lookup`) gives `< 20` (`gopher-request.html:16921-16957, 18130-18136`).
- SERVER: `/gopher_count` (app only).
- VERDICT: DIVERGES
- IF DIVERGES: exactly 20 Gophers near → app warns (`<= 20`), web does not (`< 20`); and the web blocks Continue while the app does not. Different data sources.
- CONFIDENCE: medium (gopher_count server handler not read).

### D-39: A scheduled time is required for "exact time"
- APP: the schedule sheet's Done / ✕ refuses "Please pick a date and time." (`yardFlow/YardReviewExtras.js:86-92, 130-138`); the server validates the time (`create.js:590-597`).
- WEB: Done disabled without a time (`gopher-request.html:16761-16764`) and the `scheduleTime` gate at Submit (`gopher-step-gates.js:215-222`).
- SERVER: as above (app only).
- VERDICT: SAME
- IF DIVERGES: n/a.
- CONFIDENCE: medium.

### D-40: Liability waiver required
- APP: Submit disabled while `yardFlow && !values?.liability_waiver` (`pages/summary.js:96-99, 794, 826, 862`).
- WEB: `waiver` gate (`gopher-step-gates.js:223-228`), checkbox `:16769-16775`, `requireWaiver` `:17931-17951`.
- SERVER: stores `liability_waiver` (`create.js:670`), no check.
- VERDICT: SAME
- IF DIVERGES: n/a.
- CONFIDENCE: high.

### D-41: "Age-Restricted Waiver — I Agree" before submitting an A/R request
- APP: a new A/R request opens the waiver sheet; only "I Agree" submits (`pages/summary.js:819-823, 855-859, 2404-2433`).
- WEB: the waiver text is only an info popover on the switch (`gopher-request.html:15779-15786`); no submit-time agreement (searched `I Agree|ageAgree|Age-restricted waiver` in the page).
- SERVER: not involved.
- VERDICT: APP-ONLY
- IF DIVERGES: n/a.
- CONFIDENCE: high.

### D-42: Cash App order rule acknowledged before submit
- APP: `cashAppRuleBlocksSubmit` stops every submit until the rule is acknowledged for this request (`pages/summary.js:617-631, 717-732`).
- WEB: a note in the add-payment sheet only (`gopher-request.html:13065`); no gate (searched `cashAppAck|cashAppRule|cash-app-rule`).
- SERVER: not involved.
- VERDICT: APP-ONLY
- IF DIVERGES: n/a.
- CONFIDENCE: high.

### D-43: A payment method is required to submit
- APP: with no method on file the primary button is "Choose Payment", not Submit (`pages/summary.js:776-838, 840-872`).
- WEB: `paymentMethod` defaults to `'visa'` (`gopher-request.html:14586`); no gate found (demo).
- SERVER: `charge.create` (`create.js:741-760`).
- VERDICT: APP-ONLY
- IF DIVERGES: n/a.
- CONFIDENCE: medium.

### D-44: Duplicate-request warning
- APP: when a **Delivery** form opens and any Delivery is still out (pending/accepted/picked_up/purchased); warn, never block; explicitly not at submit (`helpers/pendingCategoryRequest.js:43-63, 89-103`; `pages/renderForm.js:411`; `summary.js:529-540` "⛔ Do not reinstate a check here").
- WEB: at Submit, every category, when an active local request has the same category + normalised description + first drop-off (`gopher-request.html:14363-14367, 18152-18155, 25271-25277`).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: a Grocery delivery is out; start a different Delivery → app warns on open; web warns only if the description and drop-off match, and only at Submit. A Moving duplicate → web warns, app never.
- CONFIDENCE: high.

## C. Step order

### D-45: Step order and count
- APP: Step 1 is the home screen; steps 2–5 inputs, 6 review, 7 submitted, for all eight flows (`yardFlowSteps.js:34-37`, `FLOW_LIST` `stepFlows.js:457-466`; per-flow `STEP_FIELDS`/titles: Delivery `delivery.js:88-132`, Ride `ride.js:65-100`, Moving `movingFlowSteps.js:61-112`, Junk `junk.js:54-87`, Labor `laborFlowSteps.js:67-93`, Yard `yardFlowSteps.js:41-78`, Home `home.js:61-95`, Custom Task `customTaskFlowSteps.js:47-100`).
- WEB: 1 Pick a service · 2 Job details · 3 Worker info · 4 Locations · 5 Worker pay · 6 Review · 7 Submitted (`gopher-request.html:14548-14556`); step 3 is skipped only when both `workerSetup` and `workerSelectChoice` are hidden (`:17954-17971`), which no category is today (`:15020, 15028`).
- SERVER: not involved.
- VERDICT: SAME
- IF DIVERGES: n/a.
- CONFIDENCE: high.

### D-46: Step 3 contents for Yard and Custom Task
- APP: Yard: crew card + "I'll select my worker" / "Prioritize MY Gopher(s)" (`yardFlowSteps.js:47-58, 84-87`); Custom Task: First available + the two (`customTaskFlowSteps.js:39-61`).
- WEB: `workerSelectChoice` hidden for `yard` and `other`, selection forced to 'select' (`gopher-request.html:15022-15028`).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: Yard → app offers "Prioritize MY Gopher(s)"; web cannot. Ruled D13 (Yard) and the CT port (inherited) — not built at `9e29366`.
- CONFIDENCE: high.

### D-47: Answers carried across a category change mid-request
- APP: "Change ›" / Back from Step 2 leaves the flow for home with no values (`stepFlows.js:493-499`, every flow `leave: { path: "/request" }`); the next category opens fresh (or with its own draft). Only the age "Yes" move carries anything (D-26).
- WEB: `switchCategory` keeps description, photos, addresses, Unit/Apt, special instructions, rewinds to step 2 (`gopher-request.html:14706-14763`).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: Junk with description + address → change to Moving → web keeps both; app starts Moving empty.
- CONFIDENCE: high.

## D. Drafts and resume

### D-48: Where a draft lives, and whose it is
- APP: `localStorage` key `` `worker.${namespace}.draft.v1.${userId}` `` — one per flow (yard, customtask, moving, junk, labor, home, ride, delivery) and per signed-in user (`yardFlow/yardDraft.js:64-72`; namespaces `stepFlows.js:141-144, 216-232, 304-323, 370-384`, `delivery.js:483-504`, `ride.js:330-349`, `junk.js:288-301`, `home.js:290-294`); "Saved on this device… there is no account-side draft" (`yardDraft.js:16`).
- WEB: one `localStorage` key `gopher.request.draft` for the whole browser, not user-scoped (`assets/js/gopher-request-draft-store.js:59-75`); remote tier only if `window.GOPHER_API_BASE` + `__gopherAuthToken` exist (`gopher-request.html:18781-18791`) — neither is defined anywhere on the site (searched).
- SERVER: `GET/PATCH/DELETE /api/v1/requests/draft` exists in production code (`routes/index.js:13`, `controllers/draft/index.js:18-20`, `draft.js:62-199`, model `request_drafts`, merge `a0803558`). The prior doc's "unmerged" (cross-device-resume.md §6.4) is stale. Whether it is running on the host: unverified (needs AWS).
- VERDICT: DIVERGES
- IF DIVERGES: two people sign in one after the other on the same laptop → the web offers person A's draft to person B; the app keys by user id.
- CONFIDENCE: high.

### D-49: Resume a request started on the web in the app, and vice versa
- APP: no call to `/requests/draft` (searched `requests/draft|request_drafts|GopherRequestDraft` in `src`: only a comment, `yardDraft.js:10`).
- WEB: remote adapter disabled (D-48); the draft-map module that translates canonical ⇄ app fields is not even loaded (`gopher-request.html:1831-1832` load only the kernel and the store).
- SERVER: endpoint present, unused by both.
- VERDICT: SAME (neither can)
- IF DIVERGES: n/a. If both were wired, they would not interoperate: the web writes camelCase canonical fields (`gopher-request-draft.js:39-54`), the app writes Formik snake_case (`yardDraft.js:43-62`).
- CONFIDENCE: high.

### D-50: What a draft carries
- APP: `DRAFT_FIELDS` (description, crew, worker choice, address, offer/bids, timing, step) + each flow's `extraFields` (e.g. Delivery purchase, cost, A/R, both addresses, both Unit/Apts, trip distance; Ride riders/bags/instructions/trip minutes; Junk items/hazardous/iq tier) (`yardDraft.js:39-62, 84-96`); never photos (count only), waiver, price summary, coupon, id (`:39-42`); step clamped to ≤ 5 on restore (`:168-176`).
- WEB: `CONTRACT_FIELDS` (`gopher-request-draft.js:39-54`) — includes `promoCode`, `waiverChecked` (reset on resume), `idRequiredAtCompletion`, `junkTier`, `step` (restored as saved, may be 6); excludes `pickupUnit`, `destUnit`, `movingTier`, `ageKeywordDeclined`, `ageKeyword`; photos as a count (`:125-128`).
- SERVER: n/a.
- VERDICT: DIVERGES
- IF DIVERGES: Delivery drop-off with Unit "4B", leave, resume → app restores "4B"; web restores the address without it. A web draft saved on Review reopens on Review (step 6), skipping steps 2–5 checks (D-22); with a declined age keyword it restores `idRequiredAtCompletion: true` but not `ageKeywordDeclined`.
- CONFIDENCE: high.

### D-51: A scheduled time that has passed, on resume
- APP: exact time in the past (full timestamp compare) → Need ASAP (`yardDraft.js:159-167`).
- WEB: date before today → clears date, time slot and confirmation, keeps "scheduled" so the picker re-opens, with a note (`gopher-request-draft.js:180-193`; note `gopher-request.html:18919`). Same-day earlier times are not cleared (date-only compare).
- SERVER: rejects an invalid schedule at create (app only).
- VERDICT: DIVERGES
- IF DIVERGES: draft scheduled yesterday 3 PM → app resumes as ASAP; web asks for a new time. Draft scheduled today 9 AM, resumed at noon → app: ASAP; web: keeps 9 AM.
- CONFIDENCE: high.

### D-52: Consent and acknowledgements on resume
- APP: waiver forced `""` on restore and never saved (`yardDraft.js:14, 177`); age acks not in the saved fields, so the age check asks again (D-22 re-check).
- WEB: `waiverChecked`, `lowOfferAck` reset (`gopher-request-draft.js:88, 177-178`); `ageKeywordAck`, `agePurchaseAck`, `dupWarnAck`, `lowAvailabilityAck` reset (`:199-204`).
- SERVER: n/a.
- VERDICT: SAME
- IF DIVERGES: n/a.
- CONFIDENCE: high.

### D-53: When a draft is saved, offered and discarded
- APP: offered when a flow opens fresh from home (not edit, Request Again, carried values or GO-To); nothing saved until answered (`YardStepHeader.js:64-72`); saved on every change (400 ms) and at once on a new step (`:82-97`), flushed on hide/pagehide/unmount (`:101-117`); discarded on successful create (`summary.js:556-558`), "Start fresh" (`YardStepHeader.js:127-132`), or an age move (`YardStepNav.js:249`). A Request Again opens armed, so its values overwrite that category's saved draft (`YardStepHeader.js:71`).
- WEB: offered by a banner on page load (`gopher-request.html:18965-18968, 18872-18963`); saved at once on step change, typing debounced 2.5 s (`:18804-18822`; `gopher-request-draft-store.js:35-40`), flushed on pagehide/visibilitychange (`:18829-18831`); discarded on reaching step 7 and on **any** `resetFlowState` — Request Again, a home-screen category start, a deal start (`:18808, 18825-18826`).
- SERVER: n/a.
- VERDICT: DIVERGES
- IF DIVERGES: an unfinished Junk draft exists → tap Request Again on an old Delivery → web deletes the Junk draft immediately; app keeps it (only the Delivery draft is overwritten).
- CONFIDENCE: high.

## E. GO-To and Request Again

### D-54: GO-To storage
- APP: server-side `/go_tos` (`services/goTo.js:309-325`, `services/goToApi.js:14-49`); stored body = the create keys (`GOTO_BODY_KEYS`, `goToBody.js:63-106`), identical to the server's 39-key `KEPT_KEYS` (`server/helpers/go_to_body.js:60-101`; compared by script: 0 differences); coupon, bid, iQ capture, schedule times stripped (`goToBody.js:45-60`).
- WEB: `DASH_DATA.goTos` in page memory (`gopher-request.html:24795-24820`, "HOOK POINT: swap the array for a persisted per-user collection later"); no `localStorage`/`sessionStorage` for it (keys found: `gopher.request.deviceId`, `rqHomeView`, a remember key, saved addresses in sessionStorage).
- SERVER: `controllers/go_to/*`.
- VERDICT: DIVERGES
- IF DIVERGES: save a GO-To on the web, reload → gone; app → persists across devices.
- CONFIDENCE: high.

### D-55: What a GO-To "send" carries and checks
- APP: one tap → `GET /go_tos/:id/send_body` → the same `POST orders` with the same headers (`services/goTo.js:396-430`); the full stored body (addresses, cost, A/R, D6 flags, crew, schedule window from the tap); server validates as any create.
- WEB: `launchGoToNow` hands only `category`, `details`, `workerPay` to `__startRequestAgainNow` (`gopher-request.html:29495-29511`), which resets the flow, auto-ticks the waiver and clicks Submit at step 6 (`:18407-18414`); the GO-To's saved `pickup`, `dropoff`, `goodsCost`, `itemsPurchased`, `ageRestricted`, `counterOffers`, `notes` (`:29430-29461`) are dropped; only step-6 gates run (D-22), which pass with empty addresses (executed, D-22).
- SERVER: as D-3 (app only).
- VERDICT: DIVERGES
- IF DIVERGES: GO-To "Weekly grocery run" with pick-up Publix, drop-off home, $60 items → app sends all three; web creates a request with no addresses and $0 items.
- CONFIDENCE: medium-high (read; not driven).

### D-56: Request Again
- APP: opens the category's flow at Step 2 with the old order's answers (description, photos, addresses, crew, pay), clearing id, coupon, schedule and iQ capture (`helpers/requestAgain.js:29-33, 94-106`; e.g. `delivery.js:404-422`, `junk.js:216-230`); every step's Continue checks apply.
- WEB: `__startRequestAgainFast` sets category, description, pay and MY Gophers, forces ASAP, unticks the waiver and lands on Review (step 6, `maxStepReached 6`) (`gopher-request.html:18359-18397`); addresses are not carried; steps 2–5 checks never run (D-22).
- SERVER: app only.
- VERDICT: DIVERGES
- IF DIVERGES: Request Again on a past Delivery → app reopens with its pick-up/drop-off filled; web lands on Review with empty addresses and will submit them empty.
- CONFIDENCE: high.

## F. Edits after submit

### D-57: Editing a pending request
- APP: "Edit" only while `aasmState === "pending"` within the cancel window (`component/requestOrder.js:1159-1172`); reopens the order's flow with its values (`:489-545`); category fixed by the flow; Submit → `PATCH orders/v2/:id` with the full body (`summary.js:341-487, 648-654`); a numeric-id tripwire refuses to create instead (`:639-647`).
- WEB: Step 7 "Edit request" sets `state.step = 6` (`gopher-request.html:17747-17755`); Submit there calls `submitRequestAndCapture()` again, which always creates a new record (no update path: `__lastDashRequestId` is only read to open the detail page, `:14528, 17735-17736`); any step, category included, can be changed via the tabs.
- SERVER: `update_v2` is a full replace (`update.js:1027-1069`).
- VERDICT: DIVERGES
- IF DIVERGES: submit a Delivery, tap "Edit request", change the description, Submit → web now has two requests (the duplicate check does not fire because the description changed); app updates the one order.
- CONFIDENCE: high (read; not driven).

### D-58: Editing a request whose Gopher released it (recovery window)
- APP: no Edit in the recovery sheet, by owner ruling 2026-09-02 (`component/ReleaseRecoveryWatcher.js:533-548`); the server refuses an edit while `gopher_released_at` is set (`update.js:574-586`).
- WEB: the recovery modal's "Edit request" lets the requester change description, cost, pay, pick-up, drop-off and reposts as a NEW order number (`gopher-request.html:31812, 32019-32057`).
- SERVER: as above.
- VERDICT: DIVERGES
- IF DIVERGES: Gopher releases a pending Delivery → web offers "Edit & repost"; app offers only Assign New Gopher or Cancel.
- CONFIDENCE: high.

### D-59: Server rules for an edit
- APP: reaches them through `PATCH orders/v2/:id`.
- WEB: never reaches them.
- SERVER: `update_v2` refuses gophers (401), unknown order (404), a claimed order (400), expired/cancelled/delivered/accepted/scheduled (404 with state text, `constants/index.js:186-196`), a recovery window (404), a $0 offer (400), a body with no address (400 — full replace would wipe addresses) (`update.js:434-638`); schedule check (`:1074-1084`); D6 flag kept unless the body mentions it (`:1038-1042`).
- VERDICT: APP-ONLY
- IF DIVERGES: n/a.
- CONFIDENCE: high.

## DIVERGES, one line each

- D-1: app POSTs a real order; web writes a local record that is lost on reload.
- D-5: Moving/Junk/Yard crew — app's offer is the job total; web multiplies the per-worker amount by the crew ($120 × 2 → $120 vs $240).
- D-6: app sends exact category/sub-type/title routing strings; web record holds only a category key and a display title.
- D-7: Custom Task A/R switch exists only in the app (ruled CT port, unbuilt).
- D-9: app sends 5 iQ capture fields; web computes `suggestedOfferUsed`, then drops it.
- D-10: app sends machine-readable schedule fields; web record keeps a boolean and display text.
- D-11: app sends the chosen MY Gophers; web drops the pick and may auto-hire any MY Gopher.
- D-14: Unit/Apt reaches the order in the app; the web shows it on Review then drops it.
- D-15: app uploads photos; web photos are demo images, not on the record.
- D-16: app blanks the pick-up when "purchase from anywhere" is on; web record keeps the typed pick-up.
- D-17: item count, Multiple, hazardous, hourly mode/hours sent by the app; absent from the web record.
- D-18: app sends one stairs total; web keeps pick-up and destination stairs apart.
- D-19: crew-off count 0/1 by category in the app; always 1 on the web.
- D-21: the app's vendored gate file is not byte-identical to the web's (4 hunks) and gates only the legacy tile forms.
- D-22: app re-checks steps 2–5 before every Review; web tab-jumps reach Submit with only step-6 gates (empty description and addresses pass).
- D-24: Custom Task cost-of-items waived with bids in the app; web Custom Task has no purchase.
- D-26: age "Yes" move to Delivery carries addresses on the web, not in the app.
- D-27: "Don't show again" on the no-purchase sheet is permanent per device in the app, per request on the web; the web re-arms it, the app does not.
- D-28: app masks phone numbers (narrow regex, misses dashes); web blocks Continue (and skips the check after "Submit as-is").
- D-34: web falls back to matching address text when coordinates are missing; app compares coordinates only (server catches it at submit).
- D-36: web offers pay-by-the-hour on Yard/Junk/Other and bids with hourly on Junk; app has hourly on Labor only.
- D-37: web blocks Continue once for a low offer; app shows an inline, non-blocking note.
- D-38: low availability — web blocks Continue at < 20 from static data; app pops a sheet on address pick at ≤ 20 from the server.
- D-44: duplicate warning — app on opening any Delivery with one out; web at Submit on same category + description + drop-off.
- D-46: Yard and Custom Task Step 3 choices exist in the app; web forces "I'll select" (ruled D13/CT, unbuilt).
- D-47: web keeps description/photos/addresses across a category change; app starts the new category empty.
- D-48: app drafts are per category per user; web has one draft per browser, any user.
- D-50: web drafts drop Unit/Apt and can restore onto Review; app keeps Unit/Apt and restores to ≤ step 5.
- D-51: a past scheduled time resumes as ASAP in the app; the web clears it and asks again (date-only compare).
- D-53: web deletes the saved draft on any fresh start (Request Again, category CTA); app only overwrites that category's draft.
- D-54: app GO-Tos are server-stored; web GO-Tos live in page memory.
- D-55: app GO-To send posts the full stored body; web sends only category, description and pay (no addresses, cost, A/R).
- D-56: app Request Again reopens at Step 2 with addresses; web lands on Review without addresses and skips steps 2–5 checks.
- D-57: app Edit updates the same order (PATCH); web "Edit request" + Submit creates a second request.
- D-58: web lets a released request be edited and reposted; app/server refuse edits in the recovery window.

## Not checked / blocked

- **AWS (blocked, not worked around):** production env `TRUSTSHIELD_MIN_AGE` (D-13) and whether `/api/v1/requests/draft` is running on the host (D-48). Both need an EB env / host read.
- Nothing was driven on a device or in a browser; the axios FormData and multer non-multipart behaviours (D-2) are inferred from library source, not executed.
- Prior-doc claims used as context and marked **inherited**: owner rulings D5, D10, D13, D14, the CT port, the 10/14 "keep all three" calls, the G40-626 / G40-624 ticket numbers.
