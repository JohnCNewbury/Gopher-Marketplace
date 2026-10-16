# Audit C: MONEY. Request web vs live Request app (+ server), first-hand

**Pinned code (read-only):** APP `b47efe59f` · SERVER `7e571e9fb` · WEB `9e29366` (paths below are relative to each tree root: `app/src/...`, `server/...`, `web/...`).
**Method:** every row read at the cited lines. Where arithmetic is claimed, it was RUN, not reasoned: a node probe loads the server's real `helpers/instant_transfer_fee.js`, `helpers/coupon_discount.js` (logger stubbed), `constants/index.js` and `helpers/suggested_pricing.js`, re-implements `controllers/order/create.js exports.summary` (lines 66-151) and the Stripe `cal_charges` path statement for statement, and runs the web's real `computeRequestFee` lifted verbatim from `web/gopher-request.html` (13325-13447) with the real `web/assets/js/gopher-request-logic.js`. Probe files: `scratchpad/money-probe/probe.js`, `fuzz.js`, `ex.js`, `junk-learn.js`, `trunc.js`, `offer-probe.js` (the branch's `app-offer-probe.js` with the `Final/` prefix removed).
**Not done:** nothing driven in a browser or on a device; no database, Stripe or AWS read. "The app" = app client + the server it prices through (the app has no fee constants: a search for `0.99|1.99|2.99|3.99|4.99|0.08` and `99|199|299|399|499` in `app/src/{pages,component,helpers,actions,services}` non-test JS found only `borderRadius: 99`).
**Context that bounds every web number:** the live web places no real orders (`__createDashboardRequest` is local), so web figures are what a visitor is *quoted*, never charged.

## Summary

| ID | Rule | Verdict |
|---|---|---|
| MONEY-1 | Worker pay must be > $0 (bids exempt) | SAME |
| MONEY-2 | Offer input precision / maximum | DIVERGES |
| MONEY-3 | Gopher (request) fee per category | SAME |
| MONEY-4 | Gopher fee when offer + items = $0 (D8) | SAME in effect (moot, D8 closed) |
| MONEY-5 | $1.99 age-restricted fee: which requests carry it | DIVERGES (ruled CT port, web pending) |
| MONEY-6 | 8% instant-transfer fee: base and rounding (D3 / G40-625) | SAME (re-verified; D3 now resolved) |
| MONEY-7 | TrustShield $1: who gets it | DIVERGES on Ride (D2 ruled, server/app pending G40-365); SAME on A/R |
| MONEY-8 | Total assembly order (ITF on gross, TS last, promo, cap) | SAME |
| MONEY-9 | Crew: is the offer per worker or for the whole job? | **DIVERGES (new; up to ×crew)** |
| MONEY-10 | Pay by the hour on Yard / Junk / Custom Task (D14) | DIVERGES (D14 ruled, web pending) |
| MONEY-11 | Suggested offer, Delivery (D11) | SAME |
| MONEY-12 | Suggested offer, Ride model (D12) | SAME |
| MONEY-13 | Ride suggestion before the road distance arrives | DIVERGES (transient) |
| MONEY-14 | Suggested offer, Junk (incl. web-only learning store) | SAME (latent web-only blend, no reachable writer found) |
| MONEY-15 | Suggested offer, Moving | SAME |
| MONEY-16 | Which categories get a suggestion | SAME |
| MONEY-17 | Offer below the suggested "low": helper or gate | DIVERGES |
| MONEY-18 | Where bids are allowed | SAME |
| MONEY-19 | Fees on a hired bid | SAME |
| MONEY-20 | Promo code on a bids request | DIVERGES |
| MONEY-21 | Bid card amount (all-in vs worker's offer) | DECLARED (RQ-47) |
| MONEY-22 | Promo code validation | DECLARED (D9: demo codes until web places orders) |
| MONEY-23 | Promo discount arithmetic (incl. PL-289) | SAME |
| MONEY-24 | Review "Request fee" line: is the promo inside it? | DIVERGES (display) |
| MONEY-25 | Review-step Total | SAME (outside rows 5, 7, 9, 10, 20) |
| MONEY-26 | Pre-authorization hold shown to the requester (order 66493) | DIVERGES (1¢) |
| MONEY-27 | Hold actually authorised, capture amount, re-authorisation above the cushion | APP-ONLY (server) |
| MONEY-28 | Post-hire total (PL-291) | DIVERGES (1¢, server-caused, coupon orders) |
| MONEY-29 | Counter-offer cap and $0 counter | APP-ONLY (server, worker side) |
| MONEY-30 | Price after accepting a counter-offer | DIVERGES (web adopts a pre-footed object) |
| MONEY-31 | Price after approving a cost adjustment | DIVERGES (web adopts a pre-footed object) |
| MONEY-32 | Cash App ceiling: rule text and acknowledgement | DIVERGES |
| MONEY-33 | Payment methods offered; method-specific fees | DIVERGES (web lacks Link); fees SAME (none) |
| MONEY-34 | Tips | NOT FOUND BY THESE SEARCHES |
| MONEY-35 | Pro / Pro+ price differences | NOT FOUND BY THESE SEARCHES |
| MONEY-36 | Service-deal zero-fee pricing | WEB-ONLY (Deals parked) |
| MONEY-37 | Legacy minimum-order "low offer" modal (MIN_ORDER_AMMOUNT) | APP-ONLY (legacy, iOS) |
| MONEY-38 | GO-To review: what it prices | DIVERGES |

### The DIVERGES list, one line each (same input, both numbers)

- **MONEY-9 Crew multiplier (NEW, largest):** web multiplies the typed offer by the crew on Yard/Moving/Junk/Custom Task; app sends it as the whole-job pay. Yard $50, crew 3: web **$166.31**, app **$58.31**.
- **MONEY-5 A/R fee:** app Custom Task can carry $1.99 (+TS $1); web only Delivery. CT $40, A/R on, TrustShield: app **$46.50**, web **$45.35**.
- **MONEY-7 TrustShield on Ride:** web takes $1 off every Ride; server today only on A/R. Ride $30, TrustShield: web **$34.63**, app **$35.63**.
- **MONEY-10 Hourly on Yard/Junk/CT:** web offers it (rate × hours × crew), app has hourly on Labor only (D14 not yet built on web).
- **MONEY-20 Promo on a bids request:** web carries the review-time promo amount; server re-prices the coupon on the bid. Junk bid $100, 50% coupon: web **$110.15**, server **$106.15**.
- **MONEY-26 Hold shown:** web shows total × 1.20 rounded; server holds total + ceil(20%). $25.91 total: web **$31.09**, app/server **$31.10**.
- **MONEY-28 Post-hire total:** server order view truncates on coupon orders. Delivery $14.93, 50% coupon: app post-hire **$16.05**, web **$16.06**, captured **$16.06**.
- **MONEY-24 Request fee line:** app shows fees before promo + a separate promo row; web nets the promo into "Request Fee". Yard $20 + 50%: app **$5.91** (+ Promo −$2.96), web **$2.95**; both Totals $22.95.
- **MONEY-2 Offer precision:** web accepts `0.004` (passes the > $0 gate, shows worker pay $0.00, total $4.31 on Yard); app input caps 2 decimals; server would reject it as $0.
- **MONEY-13 Ride before the route resolves:** web uses a fixed 8 mi / 18 min default; app's server uses straight-line miles. A 4.3-mile trip: web **10/14/17**, server **8/9/11**.
- **MONEY-17 Low offer:** app shows an inline, never-blocking notice; web blocks Continue once with a modal.
- **MONEY-30 / 31 Counter / cost adjustment:** web copies the counter's / adjustment's pre-built fee object (no re-pricing, no coupon re-application, no hold check). Counter A on a 50%-coupon request: web **$85.31**, server **$81.65**.
- **MONEY-32 Cash App:** web says an adjustment "can only bring a Cash App request's total down, never up" (the retired 9/06 rule); app/server allow up to the hold, and the app requires an acknowledgement before submit.
- **MONEY-33 Methods:** server/app offer Link; web does not list it.
- **MONEY-38 GO-To review:** web prices the GO-To with the flow's leftover `state` (category default `null` → "Other" fee, A/R ignored), not the GO-To's own type. Delivery GO-To $20: web **$23.75**, app **$22.67**.

---

## Offer floor and input

### MONEY-1: A worker's pay must be greater than $0; a real bids request is the only exception
- APP: `app/src/component/stepFlow/flows/delivery.js:177` "`if (step === 5 && !(parseFloat(v.gopher_offering) > 0))`"; the same check at `ride.js:126`, `junk.js:113`, `home.js:135`, `yardFlow/yardFlowSteps.js:296`, `movingFlowSteps.js:227`, `customTaskFlowSteps.js:164` (each `!v.gopher_bid && ...` except Delivery/Ride, which force `gopher_bid: false` at `delivery.js:276`, `ride.js:146`); Labor `laborFlowSteps.js:203-212` "Please enter your hourly offer" / "Please enter a payment for your worker, or choose bids." Blocks Continue on Step 5.
- WEB: `web/assets/js/gopher-step-gates.js:191-199` `workerPay`: "`if (s.payMode === 'bids' && h.bidsAllowed()) return false; return !(parseFloat(...payAmount...) > 0)`"; `:200-213` `workerPaySubmit` re-checks at Step 6 ("Your worker’s pay can’t be $0"). Same exemption (bids only where bids are allowed).
- SERVER: `server/helpers/offer_floor.js:51-61` "`if (exports.isBidJob(body.offer_by_gopher)) return null; ... if (cents >= MIN_GOPHER_OFFER_CENTS) return null;`" → 400; `constants/index.js:329` `MIN_GOPHER_OFFER_CENTS = 1`; called from `controllers/order/create.js:391` and `update.js:595`.
- VERDICT: SAME
- CONFIDENCE: high (code read on all three). Not driven.

### MONEY-2: Offer input precision and maximum
- APP: `app/src/component/currencyinputfield.js:52-55` "`NumberConverters.twoDecimal.toNumber({ string: e.target.value, max: Number.MAX_SAFE_INTEGER })`", `:408` "`decimalsLimit={2}`". Two decimals; no business maximum.
- WEB: `web/gopher-request.html:17483-17490` "`let v = $pay.value.replace(/[^0-9.]/g,'')`" keeps one dot but **no decimal limit**; no maximum. The > $0 gate (MONEY-1) reads `parseFloat`, so `0.004` passes.
- SERVER: `server/helpers/offer_floor.js:36-40` `offerToCents` = `Math.round(n * 100)`; `0.004` → 0 → rejected. No maximum (no cap found in `offer_floor.js` / `create.js`).
- VERDICT: DIVERGES
- IF DIVERGES: web accepts sub-cent offers that are $0 in cents. Input: Yard, offer `0.004`. Web: passes Step 5 and 6, shows worker pay $0.00, Total **$4.31** (0.004 + 3.99 + ITF 0.32, run). App: the field cannot hold a third decimal. Server: 400 "can't be $0".
- CONFIDENCE: medium-high (code + arithmetic; the web input not driven). No maximum offer exists anywhere (searched `max`, `MAX_` in the three offer paths).

## Fees

### MONEY-3: Gopher (request) fee per category
- APP: none locally; the review prices through `POST orders/summary` (`app/src/json/requester/deliveryflow.json:648-695` `"url": "{baseurl}/orders/summary"`, posted with all form values by `app/src/actions/action.js:449-451`). App sends `appversion` on every call (`app/src/axios/axios.js:32-33`), which the server's fee needs.
- WEB: `web/gopher-request.html:13325-13334` "`delivery: 0.99, ride: 2.99, labor: 2.99, junk: 3.99, yard: 3.99, moving: 3.99, home: 4.99, other: 1.99`".
- SERVER: `server/constants/index.js:44-52` (cents) and `helpers/functions.js:254-306` `getServiceFee` ("`if (!appversion) return 0;`" then by category).
- VERDICT: SAME (8/8 categories; web key ↔ app `category_type`: Delivery, Need a Ride, Hourly / Day Labor, Junk Removal, Yard Project, Moving, Home Services, Other)
- CONFIDENCE: high (run in the probe for every category).

### MONEY-4: Gopher fee when offer + items = $0
- APP/SERVER: `server/controllers/order/create.js:88-90` summary charges the fee only "`if (combined_offering > 0)`", but create charges it unconditionally (`create.js:572-576`). Bids display `expectedRequestFee` instead (`app/src/pages/summary.js:216-219`).
- WEB: `web/gopher-request.html:13396` always `baseGopher`; bids show "TBD" (`:16576-16590`, `:16615`).
- SERVER: as above.
- VERDICT: SAME in effect (owner D8, 10/15: "offer can NEVER be $0", so only a bid can reach $0, and both clients defer the bid's fees to hire)
- CONFIDENCE: high.

### MONEY-5: Which requests carry the $1.99 age-restricted fee
- APP: Delivery's switch and Custom Task's switch: `app/src/component/yardFlow/CustomTaskDetails.js:91-96` "`key: "has_age_restriction", label: "Slide if this custom task includes Age-restricted items"`"; sent as `"age_restricted?"` (`app/src/helpers/orderObject.js:73-75`).
- WEB: `web/gopher-request.html:13397` "`const baseAge = (state.category === 'delivery' && state.ageRestricted) ? AGE_FEE : 0;`"; the switch renders only inside `${state.category === 'delivery' ? ...}` (`:15772-15777`).
- SERVER: any category: `create.js:577-578` "`String(req.body['age_restricted?']) === 'true' ? AGE_RESTRICTED_FEE : 0`"; summary `create.js:95-96`.
- VERDICT: DIVERGES (owner-ruled CT port 10/13 says the web takes the app's Custom Task logic, including the A/R switch for 21+; not yet built at `9e29366`)
- IF DIVERGES: Custom Task (`other`) $40, A/R on, TrustShield. App/server: fee 1.99 + A/R 1.99 + ITF 3.52 − TS 1.00 = **$46.50**. Web: no A/R → **$45.35** (run).
- CONFIDENCE: high. D6 "No — not age-restricted" adds no fee on either side (web keeps `state.ageRestricted` false; server `helpers/age_keyword_flag.js` is not read by the fee code).

### MONEY-6: The 8% instant-transfer fee: base and rounding (D3, G40-625)
- APP: server's figure (`instantTransferFee`, `app/src/pages/summary.js:221`).
- WEB: `web/gopher-request.html:13340-13343` "`const baseCents = Math.round(...*100); return Math.round(baseCents * INSTANT_TRANSFER_RATE) / 100;`" applied at `:13405` "`itfCents(cogOffer + feeSubtotal)`" (feeSubtotal = Gopher fee + FULL A/R fee, `:13398`).
- SERVER: `server/helpers/instant_transfer_fee.js:36-37` "`Math.round((+base_cents || 0) * PAYOUT_FEE)`", base = offer + items + Gopher fee + full A/R (`:60`); used by the quote (`create.js:105-107`), the charge (`lib/payment.stripe.js:1757-1781`), the edit re-quote (`update.js:965-969`) and capture (`payment.stripe.js:2648-2655`). `grep PAYOUT_FEE` finds no other 8% formula outside the HQ CSV SQL (`controllers/admin/orders.js:1010`, also nearest-cent on the full base).
- VERDICT: SAME. The prior log's D3 ("web unrounded, server ceil on a TS-netted base") is resolved on both sides.
- CONFIDENCE: high: 4,000 random single-worker inputs across 8 categories, A/R on Delivery, TrustShield (non-Ride) and the 50% coupon: **0** ITF or Total differences (`fuzz.js`).

### MONEY-7: TrustShield $1: who gets it, where it comes off
- APP: server's `trust_shield_discount` (`app/src/pages/summary.js:223`), subtracted in the Request fee line (`CustomTaskReviewCard.js:123-130`).
- WEB: `web/gopher-request.html:13415` "`tsEligible = hasTS && ((state.category === 'delivery' && state.ageRestricted) || state.category === 'ride')`"; off the total last (`:13428`).
- SERVER: A/R only: `create.js:579-582` "`requester_data.trust_shield_verified && age_restricted_fee ? TRUST_SHIELD_DISCOUNT : 0`"; summary `create.js:95-101` (only inside `if (has_age_restriction)`); `update.js:960-963` same.
- VERDICT: DIVERGES on Ride (owner D2 10/13 rules the web's rule; the server half is G40-365, not merged at `7e571e9fb`). SAME on A/R Delivery.
- IF DIVERGES: Ride $30, TrustShield holder: web **$34.63**, app/server **$35.63** (run). A/R Delivery $50 + TS: both **$56.22**.
- CONFIDENCE: high.

### MONEY-8: How the total is assembled
- APP: server `create.js:136-141` "`combined_offering + application_fee + trustshield_fee + transaction_fee - Math.round(discount_amount * 100)`" (trustshield_fee = A/R − TS, `:101`).
- WEB: `web/gopher-request.html:13408-13432`: fees, then promo, then TS "`Math.min(tsRaw, totalFees - promoDiscount)`", total = cogOffer + requestFee. The cap (promo + TS ≤ fees) cannot bind on the server's inputs (TS ≤ A/R fee; a coupon never exceeds the fee legs).
- SERVER: as APP.
- VERDICT: SAME
- CONFIDENCE: high (fuzz above).

### MONEY-9: Crew requests: is the typed offer per worker or for the whole job?
- APP: only Labor multiplies: `app/src/component/yardFlow/laborFlowSteps.js:160-185` "`combined: cents(perGopher * gophers)`" sent as the offer (`:229-248` "`gopher_offering: total`"). Yard/Moving/Junk send the typed offer unchanged: `yardFlowSteps.js:172-181` (sets only `gophers_needed`), `movingFlowSteps.js:285-300`, `stepFlow/flows/junk.js:124-144`; the summary posts "`{gopher_offering}*100`" (`json/requester/yardflow.json:593`). The field reads "Your offer to your worker" / "Exact amount your worker takes home: 100% of your offer." (`yardflow.json:452, 473`; same in moving/junk).
- WEB: `web/gopher-request.html:15176-15177` `crewCount()` for every category showing `workerSetup` (Yard, Moving, Junk, Labor, Other: `:15020`); review `:16495-16504` "`const workerPayNum = perWorkerPay * workerCount; ... const cogOffer = costItemsNum + workerPayNum;`"; frozen deal `:14437` "`const snapWorkerPay = perWorker * workersNeeded;`"; field note `:16254` "Exact amount each Gopher takes home — 100% of your offer."
- SERVER: prices whatever offer it is sent (`create.js:78-79`).
- VERDICT: DIVERGES (not in the 10/13 divergence log; found by following the offer into the total)
- IF DIVERGES: Yard, offer $50, crew of 3. App/server: $50 + 3.99 + ITF 4.31 = **$58.31**. Web: $150 + fees = **$166.31**. Same for Moving and Junk; Labor agrees ($165.23 both). Custom Task has no crew in the app (`customTaskFlowSteps.js:204-218`), so the web's `other` crew is settled by the CT port.
- CONFIDENCE: high on code and arithmetic; not driven on either side. Which reading is intended (per-worker vs whole job) needs the owner; the live app is the reference.

### MONEY-10: Pay by the hour on Yard, Junk and Custom Task (D14)
- APP: Labor only: `laborFlowSteps.js:95-106`; Yard forces `paying_by_hour: false` (`yardFlowSteps.js:146`).
- WEB: `web/gopher-request.html:15947` "`const noHourly = state.category === 'moving';`": the "Pay by the hour" toggle (`:15969-15986`) shows on Yard, Junk, Labor and Other; hourly pay = rate × hours × crew (`:16496-16499`).
- SERVER: not involved (prices the offer it gets).
- VERDICT: DIVERGES (owner D14 10/13: "Pay by the hour on Labor only", web change not built at `9e29366`)
- IF DIVERGES: Yard, hourly $20 × 3 h, 1 worker: web offer $60 → Total **$69.11** (60 + 3.99 + ITF 5.12, run); the app cannot build that request.
- CONFIDENCE: high.

## Suggested offer

### MONEY-11: Suggested offer, Delivery (D11)
- APP: shows `POST orders/smart_price` (`app/src/component/smartPriceSuggestion.js:224` "`API.post(\`orders/smart_price\`, payload...`"), band from the server (`:239-246`), input `service_cost` = cost of items (`helpers/orderObject.js:293`).
- WEB: `web/gopher-request.html:13510` "`return window.GopherRequestLogic.deliverySuggestedOffer(itemCost);`" → `web/assets/js/gopher-request-logic.js:452-475` (G40-502 anchors).
- SERVER: `server/helpers/suggested_pricing.js:1229-1245` (unregistered categories fall to `suggestedOffer`, G40-502 anchors `:107-226`).
- VERDICT: SAME
- CONFIDENCE: high: 15/15 costs identical (`offer-probe.js`), e.g. $100 → 15/20/25 both.

### MONEY-12: Suggested offer, Ride model (D12)
- APP: same `smart_price` call; trip miles/minutes from `getDistance` (`smartPriceSuggestion.js:128-153`; `orderObject.js:410-416`); scheduled = `request_schedule || flexible` (`orderObject.js:437`).
- WEB: `web/gopher-request.html:13741-13743` → `gopher-request-logic.js:531-548` (worker pay, floor after band, uplift after floor); scheduled = `state.scheduleType !== 'now'` (`:13880`).
- SERVER: `suggested_pricing.js:1089-1140` `rideBand`.
- VERDICT: SAME
- CONFIDENCE: high: 10/10 trips identical, incl. the floor-then-uplift case.

### MONEY-13: Ride suggestion before a road distance exists
- APP: server with no `trip_distance` uses straight-line miles from the coordinates and estimated minutes (`suggested_pricing.js:1044-1064`, `:1092-1096`); the app re-asks when the road distance lands (`smartPriceSuggestion.js:151-152`).
- WEB: `web/gopher-request.html:13546-13557` "`const DEFAULT_MILES = 8; const DEFAULT_MINUTES = 18;`" until Google Distance Matrix resolves.
- SERVER: as APP.
- VERDICT: DIVERGES (transient; both converge once each side has Google road miles)
- IF DIVERGES: a 4.3-mile (straight-line) trip, before the route resolves: web **10/14/17**, server **8/9/11** (run). No route at all: server 8/8/8.
- CONFIDENCE: medium (timing not driven; whether a requester can see the pre-route number depends on network speed).

### MONEY-14: Suggested offer, Junk
- APP: `smart_price`; tier detected server-side, correctable (`smartPriceSuggestion.js:248-286`).
- WEB: `gopher-request-logic.js:677-694` `suggestedJunkOffer` **blends a per-browser learned median** from localStorage `gopher_junk_pay_learn_v3` (`:645-694`, `w = n/(n+8)`); the only writer on the page is `seedJunkLearningOnce` (`web/gopher-request.html:13772-13783`, called `:13894`), which reads `DASH_DATA`, declared `const` inside the `rqDashboardInit` IIFE (`:23169`, `:24541`), so by scope it is `undefined` there; Connect's copy is the same shape (`gopher-connect.html:16127-16138` vs `dashboardInit` `:16409-16410`).
- SERVER: no learning: `suggested_pricing.js:558-560` "`function junkLearningSeam(/* tier */) { return null; }`".
- VERDICT: SAME (3/3 tiers and 8/8 detector samples identical with an empty store). Latent web-only rule: if the store ever holds data the web drifts, e.g. one $78 "old couch" completion → single tier web 35/45/55 vs server 30/40/50 (`junk-learn.js`).
- CONFIDENCE: medium (the dead-writer conclusion is from scope reading, not a browser).

### MONEY-15: Suggested offer, Moving
- APP: `smart_price` (`movingflow.json` `smartPriceSuggestion`).
- WEB: `gopher-request-logic.js:848-877` (learning frozen, w = 0).
- SERVER: `suggested_pricing.js:607-799` (`movingBand`), registry `:1147-1151`.
- VERDICT: SAME (4/4 tiers; detector identical).
- CONFIDENCE: high.

### MONEY-16: Which categories get a suggestion
- APP: `smartPriceSuggestion` appears in `deliveryflow.json`, `rideflow.json`, `junkflow.json`, `movingflow.json` (plus legacy single-page forms).
- WEB: `web/gopher-request.html:13829` "`const PRICED_CATEGORIES = ['delivery','ride','junk','moving'];`"; hidden when paying hourly (`:16287`).
- SERVER: registry `suggested_pricing.js:1142-1181` (moving, junk removal, need a ride; Delivery is the fallback).
- VERDICT: SAME
- CONFIDENCE: high.

### MONEY-17: An offer below the suggested "low"
- APP: `smartPriceSuggestion.js:342-343` "`!!band && offer > 0 && offer < band.low && !lowAck`" → inline notice "That's a little on the low side ... you can still send as-is" whose button only does `setLowAck(true)` (`:505-531`). No Continue check reads it: `lowAck|lowOffer|low_offer|showLowNotice` appear in no other app file.
- WEB: `web/gopher-request.html:18115-18129` on Continue from Step 5: "`if(offerModel && payNum > 0 && payNum < offerModel.low){ ... __openLowOfferNotice ...; return; }`" (modal `:20812-20820`, "Adjust my offer" / "Send as-is"). Compares the per-worker amount, not the crew total.
- SERVER: not involved (searched `low` in `create.js` summary/create).
- VERDICT: DIVERGES (same threshold, different mechanism)
- IF DIVERGES: Delivery, $100 items (band 15/20/25), offer $10. App: notice under the field, Continue works. Web: Continue opens the modal and does not advance until a choice.
- CONFIDENCE: high on code; not driven.

## Bids

### MONEY-18: Where bids are allowed
- APP: off on Delivery and Ride (`delivery.js:276`, `ride.js:146`); Labor only when not hourly (`laborFlowSteps.js:99-106`).
- WEB: `web/gopher-request.html:15049` `bidsOption: ['delivery','ride']`; `:15182` also hidden when hourly on Labor/Yard.
- SERVER: not involved (accepts `offer_by_gopher`).
- VERDICT: SAME (Yard hourly differs only through MONEY-10)
- CONFIDENCE: high.

### MONEY-19: Fees on a hired bid
- APP: `app/src/component/requestOrder.js:585-623` `hireBid` prices the bid with `orders/summary` (`offer: item.offer, cost_of_goods`).
- WEB: `web/gopher-request.html:27316-27357` `__bidBreakdown`: Gopher + A/R fee from the frozen deal, ITF via `__itfCents(cog + offer + gopher + age)`, TS from `trustShieldDiscount` (PL-291 fix `:27343-27346`); written onto the deal by `__applyHiredBid` (`:27271-27289`).
- SERVER: `controllers/order/order_bids.js:757-773` re-derives the fee (`getServiceFee`) and uses `get_charge_details` (the one formula).
- VERDICT: SAME (without a promo; see MONEY-20)
- CONFIDENCE: medium-high (formula identity checked; bid flow not driven).

### MONEY-20: A promo code on a bids request
- APP: no coupon is sent on create for a bid (`app/src/helpers/orderObject.js:164-172` "`coupon: !values.gopher_bid ? ... : null`"); the coupon is entered on the hire review and priced on the bid (`pages/summary.js:256-292`), then sent as `coupon_id` on accept.
- WEB: the promo row shows on the bids review (`web/gopher-request.html:16598-16612`) and is priced at review on the then-current worker pay (0, or a stale `payAmount`: switching to bids does not clear it, `:17305-17318`); at hire `__bidBreakdown` carries that fixed amount: "`const promoDisc = Math.min(num(fee.promoDiscount), feesPre);`" (`:27342`).
- SERVER: `order_bids.js:560, 775-776` takes `coupon_id` and the charge re-prices it on the bid's fees (`payment.stripe.js:1783-1834`). Create ignores a coupon on a bid (`create.js:710-724` is inside the non-bid branch).
- VERDICT: DIVERGES
- IF DIVERGES: Junk, bids, GOPHER50 (server given the same 50% both-fees coupon), bid $100: web promo $2.16 → **$110.15**; server promo $6.16 → **$106.15** (run).
- CONFIDENCE: medium-high (arithmetic run; flow not driven).

### MONEY-21: The amount on a bid card
- APP: the worker's offer (`app/src/component/live/OffersSheet.js:14-16`).
- WEB: all-in total (`web/gopher-request.html:27359-27360` "`__bidAllIn = ... .total`").
- SERVER: not involved.
- VERDICT: DECLARED (owner 10/15, canon RQ-47)
- CONFIDENCE: high.

## Promo codes

### MONEY-22: Which codes are valid
- APP: whatever the server accepts; server reasons shown (`pages/summary.js:273-291`).
- WEB: one demo code: `web/gopher-request.html:13352-13359` "`GOPHER50: { ... type: 'percentOff', value: 50, age_restricted_discount: false }`", exact match after trim/upper; error "That code isn't valid" (`:16611`).
- SERVER: `controllers/order/coupon.js:19-184`: active, case-insensitive code, `redeem_by` expiry, `applies_to`, once per account (completed orders only), `max_redemption` for 'forever' coupons.
- VERDICT: DECLARED (owner D9 10/15: "Demo codes stay until the website places real orders; then it checks codes with the server")
- CONFIDENCE: high.

### MONEY-23: What a promo takes off (PL-289)
- APP: server figure (`pages/summary.js:211-213`).
- WEB: `web/assets/js/gopher-request-logic.js:489-513` `couponDiscount` (PL-289 remainder `:500`), fed the A/R fee net of TS (`web/gopher-request.html:13421-13424`).
- SERVER: `server/helpers/coupon_discount.js:20-165` (PL-289 `:96-104`); summary passes `trustshield_fee` (net) at `create.js:119-124`.
- VERDICT: SAME
- CONFIDENCE: high (identical code paths; Yard $20 → $2.96 both, A/R $50 + TS → $2.62 both; the fuzz includes 30% coupon cases).

### MONEY-24: Is the promo inside the "Request fee" line?
- APP: Request fee excludes the promo: `app/src/component/yardFlow/CustomTaskReviewCard.js:123-130` "`age_restricted_fee + gopherRequestFee + instantTransferFee - trust_shield_discount`"; separate "Promo code − $X" row `:298-303`; Total = server `totalCharge` `:316-325`. All 8 flows use this card (`reviewLayout: "card"` in `stepFlows.js` ×4, `delivery.js`, `home.js`, `ride.js`, `junk.js`). Fees sheet also excludes it (`RequestFeesSheet.js:73`).
- WEB: `web/gopher-request.html:13431` "`const requestFee = totalFees - totalDiscount;`" shown as "Request Fee" (`:16576`, value `:16596`); the promo amount appears only inside the "?" popover (`:16588`).
- SERVER: not involved in the label.
- VERDICT: DIVERGES (display; Totals equal)
- IF DIVERGES: Yard $20 + 50% coupon: app "Request fee $5.91", "Promo code − $2.96", Total $22.95; web "Request Fee $2.95", Total $22.95.
- CONFIDENCE: high.

## Totals, hold, capture

### MONEY-25: The review-step Total
- APP: server `totalCharge` (`pages/summary.js:222`).
- WEB: `web/gopher-request.html:16504-16507` `fee.gmvTotal`.
- SERVER: `create.js:136-141`.
- VERDICT: SAME for single-worker requests outside MONEY-5/7/9/10/20 (4,000/4,000 identical; Yard $20 → $25.91, Delivery $20 + $100 items → $130.67, A/R $50 + TS → $56.22, Home $19.99 → $26.98).
- CONFIDENCE: high.

### MONEY-26: The pre-authorisation hold shown before submit (order 66493)
- APP: `app/src/component/yardFlow/YardReviewExtras.js:237` "`const hold = money(priceDetails?.adjustable_amount);`" → text `:290-293` "bringing the hold to {hold}". `adjustable_amount` is the server's (`pages/summary.js:205`).
- WEB: `web/gopher-request.html:16680` "`bringing the hold to <b>${fmt(totalNum * 1.20)}</b>`".
- SERVER: `server/helpers/functions.js:65-69` "`Math.ceil((total_amount * ADJUSTABLE_AMOUNT_PER) / 100) + +total_amount`", `constants/index.js:40` `ADJUSTABLE_AMOUNT_PER = 20`; returned by summary `create.js:151`, and it is the amount authorised (`payment.stripe.js:1887-1897`).
- VERDICT: DIVERGES (1¢ whenever 20% of the total has a fractional cent that rounds down)
- IF DIVERGES: total $25.91: server hold 2591 + ceil(518.2) = **$31.10** (app shows $31.10); web shows **$31.09**. Also $25.86 → $31.04 vs $31.03, $25.92 → $31.11 vs $31.10.
- **66493 explained:** $25.91 is exactly a Yard request at a $20 offer (3.99 + ITF 1.92); its hold is $31.10 by the cushion rule above, and the capture with no adjustment is $25.91 (`payment.stripe.js:2648-2664`). The category/offer of 66493 is an **inference from the arithmetic**; the order row was not read (no DB access used).
- CONFIDENCE: high on the rule; inference flagged.

### MONEY-27: What is authorised, captured and re-authorised
- APP/SERVER: create authorises total + cushion (`create.js:741-758`, `payment.stripe.js:1894-1897`); bid accept the same (`order_bids.js:779-782`); a cost adjustment above the hold creates a new authorisation for the exact total with no cushion (`cost_adjustment.js:1031-1052`, `charge.create(order, ..., true)` → `ignore_adjustable_amount`); capture = total − promo (`payment.stripe.js:2648-2664`).
- WEB: none ("Demo only — no real charge.", `web/gopher-request.html:27553`).
- VERDICT: APP-ONLY (server)
- CONFIDENCE: high.

### MONEY-28: The total shown after a hire (PL-291)
- APP: `app/src/component/live/LiveReviewCard.js:49` "`totalCharge: cents(o.total_charge)`" from the order view.
- WEB: `web/gopher-request.html:27260-27264` `__agreedTotalFor` = frozen deal total; `startJob` `:27416-27434`.
- SERVER: `controllers/order/retrieve.js:3718-3722` "`total_charge: get_order.discount ? to_without_decimal(Number(+total_charge / 100 - +get_order.discount).toFixed(2)) : total_charge`", where `to_without_decimal` = `Math.trunc(x * 100)` (`helpers/functions.js:214-221`). The history rows were fixed for this (`retrieve.js:1686-1697`, "can read 1 cent low on a coupon order"); this view was not.
- VERDICT: DIVERGES (rule is the same: "what the requester pays"; the app's number is 1¢ low on some coupon orders because of the server view)
- IF DIVERGES: Delivery $14.93 + 50% coupon: captured **$16.06**, web post-hire **$16.06**, app post-hire **$16.05** (`trunc.js`; the app's own pre-hire review says $16.06). Also the server's documented case: 502¢ − $1 → shows 401, captures 402.
- CONFIDENCE: high on arithmetic; medium that `LiveReviewCard` reads this exact endpoint (`GET orders/:id` → `order_view`).

## Counter-offers and cost adjustments

### MONEY-29: Counter-offer limits
- APP/SERVER: worker-side only: `controllers/order/counter_offer.js:56-72` ("cannot make a counter offer for a total of $0"), `:91-99` (`allow_counter`), `:100-112` + `helpers/functions.js:1118-1121` "`Math.max(20, currentOffer * 1.5)`".
- WEB: the live requester site never creates counters; seeded counters (`web/gopher-request.html:24938-24966`) and PT counters (`web/assets/js/gopher-web-pt-bridge.js:725-747`, "`counter: co.counter || {}`") are accepted with no cap check.
- VERDICT: APP-ONLY (server)
- CONFIDENCE: high.

### MONEY-30: Price after accepting a counter-offer
- APP: server re-prices: `counter_offer.js:527-545` "`coupon_data = await db.coupons.findByPk(order.coupon_id ...)`" → `charge.update` with the counter's offer/items (one ITF formula, coupon re-applied, new hold `:562`).
- WEB: `web/gopher-request.html:27896-27911` copies the counter's fee object ("`snap.total = C.gmvTotal`"); seeds still carry pre-G40-625 unrounded ITF (`:24945` "`instantTransfer:6.3192`").
- VERDICT: DIVERGES (mechanism; equal on the seeds at display precision: $85.31 both)
- IF DIVERGES: counter A ($28 offer, $50 items) on a request carrying the 50% coupon: server **$81.65** (promo $3.66 re-applied); web **$85.31** (counter object has `promo:null`).
- CONFIDENCE: medium (web side is demo/PT data by design).

### MONEY-31: Price after approving a cost adjustment
- APP: server re-prices with coupon and checks the hold: `cost_adjustment.js:945-980` ("`order.discount = coupon_calc.discount_amount`"), Cash App ceiling `:1005-1029`, new authorisation above the cushion `:1031-1052`.
- WEB: `web/gopher-request.html:27785-27805` "`No fee math here — the adjusted object is pre-footed mock data`"; card `:27519-27556`.
- VERDICT: DIVERGES (mechanism; web is demo)
- IF DIVERGES: any adjustment on a coupon order: the server recomputes the coupon on the new ITF; the web shows whatever `pendingAdjustment.adjusted.gmvTotal` carries.
- CONFIDENCE: medium (no live web adjustment path to drive).

## Payment methods

### MONEY-32: Cash App: how far a total may be adjusted, and whether the requester must acknowledge it
- APP: `app/src/component/modals/CashAppOrderRuleModal.js:110-129` "Cash App holds the request total plus 20%... it can be more or less than the estimate — as long as it stays within the held amount."; submit blocked until acknowledged: `pages/summary.js:617-627` `cashAppRuleBlocksSubmit`.
- WEB: `web/gopher-request.html:13065` "a cost adjustment can only bring a Cash App request's total down, never up." (in the add-method sheet); no acknowledgement gate found (searched `Paying with Cash App`, `never up`, `cash app` in the page: the only hits are this note and comments `:12946-12949`).
- SERVER: `server/helpers/cash_app_order_rule.js:1-50`: refuses only totals above `adjustable_amount`; "⛔ Do not 'restore' the old wording. It describes a rule that was retired." (owner 2026-09-10).
- VERDICT: DIVERGES
- IF DIVERGES: Cash App order, total $25.91, worker raises items so the new total is $28.00 (< $31.10 hold): app/server allow it; web copy says it cannot happen.
- CONFIDENCE: high.

### MONEY-33: Payment methods offered; any method-specific fee
- APP: "card with scan, Apple Pay, Google Pay, Link, Cash App Pay" (`pages/summary.js:670-673`).
- WEB: cards + `WALLETS` Apple Pay, Google Pay, Cash App, each "`fee:false`" (`web/gopher-request.html:12946-12954`; PayPal/Venmo excluded per owner 9/06).
- SERVER: setup intents `payment_method_types: ['card', 'cashapp', 'link']` (`lib/payment.stripe.js:412-423`); no method enters the fee formula (`instant_transfer_fee.js`, `create.js` summary).
- VERDICT: DIVERGES (web lacks Link); fees SAME (none on any side)
- CONFIDENCE: medium-high.

## Not found / one-sided

### MONEY-34: Tips
- APP / WEB / SERVER: NOT FOUND BY THESE SEARCHES: `tip_amount|tipamount|gratuity|add a tip|leave a tip|addTip|add_tip` and `\btips?\b *[:=(]` in `server/{controllers,helpers,lib,models}`, `app/src/{pages,helpers,component/live,component/yardFlow}`, `web/gopher-request.html` (only tooltip names and test ids matched).
- VERDICT: NOT FOUND BY THESE SEARCHES
- CONFIDENCE: medium.

### MONEY-35: Pro / Pro+ price differences
- APP/SERVER: `getServiceFee(category, appversion)` takes no tier (`functions.js:254`); summary and charge read no worker tier (`create.js:66-151`, `payment.stripe.js:1752-1897`).
- WEB: flat `GOPHER_FEE` (`:13325`).
- VERDICT: NOT FOUND BY THESE SEARCHES (`GOPHER_TYPE`, `pro`, `tier` in the fee helpers above)
- CONFIDENCE: medium.

### MONEY-36: Service-deal requests are a set price with zero fees
- WEB: `web/gopher-request.html:13385-13393` "`if(state.fromDeal && state.dealKind === 'service'){ ... gopherFee:0 ... requestFee:0 ... }`".
- APP: not found by `fromDeal|dealKind|deal_id|service_deal|serviceDeal` in `app/src/{pages,component,helpers}`.
- SERVER: not found by `deal` in `controllers/order/create.js`.
- VERDICT: WEB-ONLY (Deals are parked, owner 10/15; noted, not a sync item now)
- CONFIDENCE: medium.

### MONEY-37: Legacy "your offer is below the minimum" modal
- APP: `app/src/component/button.js:128-145` (iOS, legacy single-page forms only): `GET orders/getminorderammout`, "`if (gopher_amount < avgPrice[0].cost)`" → `lessOfferModalVisible`. Compares worker pay to a COST-OF-GOODS table.
- SERVER: `controllers/order/create.js:1269-1276`, `constants/index.js:305-314` (`MIN_ORDER_AMMOUNT`, advisory per its own comment `:325-334`).
- WEB: not found (`getminorderammout` count 0).
- VERDICT: APP-ONLY (legacy). Whether any live entry still reaches the legacy forms was not traced.
- CONFIDENCE: low on reachability.

### MONEY-38: What the GO-To review prices
- APP: the GO-To form's own `orders/summary` (`app/src/component/goTo/GoToReviewSheet.js:267-282` "fees and total from the form's own orders/summary pricing").
- WEB: `web/gopher-request.html:17110` "`const fee = computeRequestFee(workerPayNum + goodsNum);`": `computeRequestFee` reads the FLOW's `state.category`, `state.ageRestricted`, `state.promoApplied` (`:13394-13397`), not the GO-To record's `category`/`ageRestricted` (built at `:29436-29440`). The flow's default category is `null` (`:14572`), which prices as "Other" (`GOPHER_FEE[state.category] ?? GOPHER_FEE.other`).
- VERDICT: DIVERGES
- IF DIVERGES: Delivery GO-To, worker pay $20, flow not used this session: web "Request Fees $3.75 / Total today $23.75"; app $2.67 / **$22.67**. A Yard GO-To shows the same $23.75 on the web vs $25.91 in the app.
- CONFIDENCE: medium-high (code + arithmetic; not driven).

---

## Found in passing (server-only, not a web↔app parity item)

- `controllers/order/order_bids.js:560, 775-776`: bid accept takes `req.body.coupon_id || req.body.coupon` and loads it with `findByPk`; it does **not** call `verify_coupon_use`, so expiry, once-per-account and the redemption cap are not checked at bid accept (the app's earlier `orders/summary` call does verify, but the accept endpoint itself trusts the id).
- `controllers/order/retrieve.js:3718-3722` (order view) truncates coupon totals (MONEY-28); `:470-488` and `:1636-1650` use the same `to_without_decimal` shape for list rows.
- `lib/payment.stripe.js:1822-1825` subtracts `coupon_calc.discount_amount * 100` without rounding (summary rounds at `create.js:141`); the `.toFixed()` at `:1896-1897` rounds the charge amount, so no cent difference was produced in the runs above.

## Prior findings re-verified

- D3 (8% base/rounding): **resolved on both sides** (MONEY-6).
- D2 (TS on Ride): still divergent pending the server (MONEY-7).
- D7 (A/R any category): still divergent pending the CT port (MONEY-5).
- D8: moot (MONEY-4). D9 + PL-289: coupon math SAME, validation DECLARED (MONEY-22/23).
- D11, D12: SAME on the models (MONEY-11/12); new transient input gap MONEY-13.
- D14: ruled, not built on web (MONEY-10).
- PL-291: SAME rule; 1¢ server-caused gap on coupon orders (MONEY-28). RQ-47: DECLARED (MONEY-21).
