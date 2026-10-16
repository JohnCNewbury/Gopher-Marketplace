# Audit B: WHERE / WHO / WHEN, Request web vs live Request app

**Pins (read-only worktrees, paths below are relative to `scratchpad/sync/`):**
APP `app/` @ b47efe59f · SERVER `server/` @ 7e571e9fb · WEB `web/` @ 9e29366.

**Method.** Every rule was traced by following its data (what reads the field, what writes it),
then read at the cited lines. Where a rule is a pure function on both sides it was executed with
`node` (probe script: `scratchpad/auditB/sameplace-probe.js`). Nothing was driven on a device or a
browser.

**One fact that frames every row.** The web never sends an order to the server. The only network
calls in `web/gopher-request.html` are the iQ worker count (`:19703`, `api.gophergo.io/.../worker_count`)
and two commented-out stubs (`:20435`, `:30370`); `assets/js/gopher-request-logic.js` and
`gopher-step-gates.js` make none. A submitted web request is written to a local dashboard store
(`window.__createDashboardRequest`, `:25283`). So where the app relies on the SERVER (worker count,
trip distance, the 15-mile conversion, schedule validation), the web side is a client-side
re-implementation or a simulation, and that is what is compared.

## Summary

| ID | Rule | Verdict |
|---|---|---|
| B-1 | Which address cards each category shows (all but Custom Task) | SAME |
| B-2 | Custom Task address shape (pick-up switch, Unit/Apt, stairs) | DIVERGES (ruled: CT port, web changes) |
| B-3 | Which addresses are required to continue | SAME |
| B-4 | An address must geocode to be accepted | DIVERGES |
| B-5 | Autocomplete region | DIVERGES (minor) |
| B-6 | Quick-pick fallbacks (current location, home, saved) | DIVERGES |
| B-7 | Multiple stops | SAME (neither offers them) |
| B-8 | D4 same place: method, threshold, categories, block | SAME |
| B-9 | D4 when a map point is unknown | DIVERGES (edge only) |
| B-10 | How trip distance is computed | DIVERGES |
| B-11 | 15-mile rule: which First Available requests it converts | DIVERGES (scheduled Delivery/Ride) |
| B-12 | 15-mile rule and a hand-picked MY Gopher | DIVERGES |
| B-13 | 15-mile rule never blocks the requester | SAME |
| B-14 | Low local-Gopher availability notice | DIVERGES |
| B-15 | Worker-selection options per category | SAME for 6 categories; DIVERGES for Yard (D13) and Custom Task (CT port) |
| B-16 | Default worker selection | SAME (where the choice exists on both) |
| B-17 | Hand-picks when the default lands on Prioritize MY Gophers | DIVERGES |
| B-18 | Prioritize MY Gophers with zero saved Gophers | DIVERGES (medium confidence) |
| B-19 | Crew ("More than 1 worker") categories and bounds | DIVERGES (bounds; Custom Task) |
| B-20 | D14 pay by the hour: which categories | DIVERGES (ruled: web changes) |
| B-21 | Hours bounds when paying by the hour | DIVERGES |
| B-22 | Hourly turns bids off | DIVERGES (moot once D14 lands) |
| B-23 | Timing options offered, per category | SAME |
| B-24 | Need ASAP stays open 1 h / about 6 h, per category | SAME |
| B-25 | Flexible window expiry (24 h / 7 d / 14 d) | SAME |
| B-26 | Tapping "Schedule for later" pre-selects a window | DIVERGES |
| B-27 | Exact time: earliest, latest, time-of-day grid | DIVERGES |
| B-28 | Exact time: default value | DIVERGES |
| B-29 | A resumed draft whose scheduled time has passed | DIVERGES |
| B-30 | Time zone of a scheduled time | SAME (device-local on both) |
| B-31 | Ride: number of riders | DIVERGES |
| B-32 | Ride: large bags 0–6 | SAME |
| B-33 | Ride: no description/photos; special instructions; no bids | SAME |
| B-34 | Moving: single-location switch (default off) | SAME |
| B-35 | Moving/Junk: item count 1–4, then Multiple | SAME, with a minor DIVERGES on turning Multiple off |
| B-36 | Stairs: which ends, which categories, bounds | DIVERGES (bounds; Custom Task) |
| B-37 | Delivery: purchase switch + cost of items > 0 | SAME |
| B-38 | Delivery: "purchase from anywhere" | SAME |
| B-39 | No service elevator on Request | SAME |

---

## WHERE

### B-1: Which address cards each category shows (Custom Task excluded, see B-2)
- APP: per-flow step-4 field lists. Delivery `app/src/component/stepFlow/flows/delivery.js:108-117` — "pickup_", "picupapt", "dropoff_", "dropoffapt", "tripDistance" — pick-up hidden while `purchase_anywhere` (`:145-146`). Ride `ride.js:80-88` — "NR-09: always a pick-up and a destination, no switch". Moving `app/src/component/yardFlow/movingFlowSteps.js:80-92` + `:154-166` — pick-up/drop-off while the switch is off, one `address_` while on. Junk `junk.js:68` "one address, the work happens there"; Home `home.js:75`; Labor `laborFlowSteps.js:83`; Yard `yardFlowSteps.js:60` "One address, no Unit/Apt (Y-08 "B")".
- WEB: `web/gopher-request.html:15030` — `pickupSection: ['home','labor','junk','yard','other'], // Delivery, Moving, Ride only`; `:15031` — `noSpecificPickup` shown for Delivery and Moving only; Destination is unconditional markup (`:16157-16160`). Unit/Apt: `:15111` `UNIT_CATEGORIES = ['moving','junk','labor','home','ride','delivery']` (destination), `:15116` `PICKUP_UNIT = ['moving','ride','delivery']`; rendered at `:17004` and `:17088`. Trip-distance pill only with a pick-up (`:17089`).
- SERVER: `server/controllers/order/create.js:343-356` — needs at least one of drop-off, legacy address or pick-up, else 400 "Invalid location provided".
- VERDICT: SAME (Delivery, Ride, Moving, Junk, Home, Labor, Yard: same cards, same Unit/Apt ends, no Unit/Apt on Yard on either side).
- CONFIDENCE: high for the field lists; the rendered screens were not driven.

### B-2: Custom Task (web `other`) address shape
- APP: `app/src/component/yardFlow/customTaskFlowSteps.js:62-78` — "Pick-up location (the "No pick up — work happens on site" switch, ON by default; OFF shows the pick-up picker)", with `apt` and `dropoffapt`; `:154-163` requires both addresses when the switch is off. No stairs field on Custom Task (not in `CT_STEP_FIELDS`). No same-place check (no `samePlace` entry, `stepFlows.js:158-233`).
- WEB: `other` hides the pick-up section (`gopher-request.html:15030`), is not in `UNIT_CATEGORIES` (`:15111`, so no Unit/Apt), and DOES show destination stairs: `:15042` `destStairs: ['delivery','home','junk','yard','ride']` (shown for Moving, Labor, Other).
- SERVER: `server/helpers/same_place.js:38-42` — "Other" is not a two-address category, so no same-place refusal either way.
- VERDICT: DIVERGES. Owner ruling "CT: Web gets the live app's Custom Task logic" (APP-DIVERGENCE doc) already decides the direction: the web changes.
- IF DIVERGES: the app offers a pick-up + destination pair, a Unit/Apt on the address(es), and no stairs; the web offers one address, no Unit/Apt, and a stairs counter. Input: a Custom Task "pick up my dry cleaning and bring it home" with the switch off: the app asks for two addresses; the web cannot take a pick-up at all.
- CONFIDENCE: high.

### B-3: Which addresses must be filled before Continue
- APP: Delivery `delivery.js:167-176` — pick-up "unless the Gopher can purchase from anywhere", then destination; Ride `ride.js:120-125` both; Moving `movingFlowSteps.js:213-226` both (switch off) or one; Junk/Home/Labor/Yard one address (`junk.js:110`, `home.js:132`, `laborFlowSteps.js:200`, `yardFlowSteps.js:293`).
- WEB: `web/assets/js/gopher-step-gates.js:116-127` pick-up gate (skipped when `noSpecificPickup` or the pick-up section is hidden) and `:128-150` drop-off gate, "a flexible pick-up does not make the DESTINATION optional".
- SERVER: `create.js:343-356` (at least one address).
- VERDICT: SAME.
- CONFIDENCE: high.

### B-4: An address has to be found on the map to be accepted
- APP: `app/src/component/googleMapAutocomplete.js:239-305` — `handlePlaceSelect` geocodes (`getGeocode`) and writes the field only on success; `:320-348` typed text goes through the same path and, on failure, "We couldn't find that address. Check the spelling, or add the city and ZIP." with the dialog left open. Every committed address therefore carries lat/lng.
- WEB: `web/gopher-request.html:13662-13665` — `_writeStop` stores `el.value.trim()` on every `change`; the gates only test for non-empty text (`gopher-step-gates.js:122`, `:145`, `firstEmpty` `:372-378`). A geocode is attempted only for the same-place check (`:13671-13674`, `:18052-18058`) and its failure is remembered as `null`, never as an error (`:13622-13627`).
- SERVER: `create.js:401-455` geocodes any address that arrives without coordinates and refuses with 400 "Invalid location provided. Please provide a valid location" if Google cannot place it.
- VERDICT: DIVERGES.
- IF DIVERGES: the web accepts free text that Google cannot place; the app refuses it at entry. Input: destination "qwerty 999" → web: Step 4 Continue passes; app: the address is never committed and the error sentence shows.
- CONFIDENCE: high for both readings; neither was driven.

### B-5: Address autocomplete region
- APP: `googleMapAutocomplete.js:186-204` — `requestOptions` carries only a 200 km location bias when the device location is known; no country restriction.
- WEB: `web/assets/js/gopher-address-autocomplete.js:44` — `includedRegionCodes:[country]`, default `'us'` (`:17`, `:180`); the inline copy in the page does the same (`gopher-request.html:32932` `includedRegionCodes:['us']`).
- SERVER: not involved (searched: `componentRestrictions`, `region` in `helpers/functions.js`, `create.js`).
- VERDICT: DIVERGES (minor).
- IF DIVERGES: input "100 Queen St W, Toronto": the app suggests it; the web offers no prediction (the typed text is still accepted, B-4).
- CONFIDENCE: medium (predictions not exercised).

### B-6: Address quick-pick fallbacks
- APP: `googleMapAutocomplete.js:981` "Use my current location", `:992` "My home address" (from the profile; geocoded again when the saved row has no coordinates, `:376-399`), and server-backed saved addresses `:227-237` (`listSavedAddresses`).
- WEB: `gopher-request.html:13691-13700` — `GopherSaved`, a `sessionStorage` list of `{label, addr}` text ("empty until the user adds addresses in the dashboard"); no current-location or home-address row was found (searched: "current location", "geolocation", "My home address" in the page; the only hit, `:19225`, is the iQ pill's "near me").
- SERVER: saved addresses `server/controllers/saved_address/` (app only).
- VERDICT: DIVERGES.
- IF DIVERGES: input: a signed-in requester with a profile home address taps the pick-up field: the app offers "My home address"; the web offers only what was saved in this browser session.
- CONFIDENCE: medium (web search for absence is pattern-based, as listed).

### B-7: Multiple pick-up / drop-off stops
- APP: one `pickup_` and one `dropoff_` per flow (B-1 field lists); no stop arrays.
- WEB: `gopher-request.html:15043` — `multiStop` hidden for all eight categories, "Request: single pickup + single destination only (no multi-stop)"; add-stop buttons gated on it (`:16984`, `:17064`).
- SERVER: one `Order_PickUp` and one `Order_DropOff` row per order (`server/helpers/helper.js:157-206` reads one of each).
- VERDICT: SAME.
- CONFIDENCE: high.

### B-8: D4 same place: how it is detected, which categories, block or warn
- APP: `app/src/component/stepFlow/samePlaceCheck.js:29` `SAME_PLACE_METERS = 25`; `:52-63` haversine (R = 6371008.8); `:65-68` `isSamePlace`; `:81-133` opens S1, then S2 from the second Continue on the same pair; every button is `then: "stay"` (`:90-110`), and `YardStepNav.js:264-269` keeps the step, so it blocks every time. Opt-in per flow: Delivery `delivery.js:453-460` "unless the worker can purchase from anywhere"; Ride `ride.js:300`; Moving `stepFlows.js:251-258` `applies: (v) => !isSingleLocation(v)`. Run on Continue (`YardStepNav.js:207-218`) and again for every step before Review (`:104-110`). The old server-"0" "Oops!" sheet is off in these flows: `deliveryflow.json:545`, `rideflow.json:454` `"sameAddressSheet": false` (`getDistance.js:34-36`).
- WEB: `web/assets/js/gopher-step-gates.js:156-185` gate `addressesDiffer`, steps `[4, 6]`, off when `noSpecificPickup` or no pick-up section; `:325-357` same 25 m haversine on host map points. Applies where `pickupSection` shows: Delivery, Moving, Ride (`gopher-request.html:15030`). Continue looks up unplaced addresses first (`:18052-18058`), then opens the sheets (`:18064`, `:18025-18045`; S1 then S2 on the second try of the same pair).
- SERVER: `server/helpers/same_place.js:31` 25 m; `:38-42` Delivery, Need a Ride, Moving "Location Move" / "Store Pick Up & Delivery"; `:106-115` refusal; enforced on create (`create.js:462-476`) and edit (`update.js:734-749`), 400 "To proceed with your request, the pick up and drop off must be different."
- VERDICT: SAME. Executed: the three implementations agreed on 20,000 random coordinate pairs (0 disagreements), on string coordinates, on blank strings and on the 0,0 placeholder (`scratchpad/auditB/sameplace-probe.js`). Unit/Apt is ignored on all three (the web compares the stop text, which never holds the unit: `pickupUnit`/`destUnit` are separate fields, `:14653-14659`).
- CONFIDENCE: high for the rule; the sheets themselves were not driven.

### B-9: D4 when a map point is unknown
- APP: `samePlaceCheck.js:38-49`, `:65-68` — no point, no block ("Missing coordinates never block here", `:26-27`). In practice an app address always has a point (B-4).
- WEB: `gopher-step-gates.js:348-357` — "By map point when the host knows both, else by normalised text"; the page geocodes with a 4-second ceiling (`gopher-request.html:13628-13646`, `ms || 4000` at `:13634`) and caches an unplaceable text as `null` (`:13622-13627`), which then falls back to the text match.
- SERVER: `same_place.js:22-26` "NEVER BLOCK ON MISSING DATA" (it geocodes first, `create.js:417-455`).
- VERDICT: DIVERGES (edge only; it cannot change a correctly geocoded pair).
- IF DIVERGES: input: Google is slower than 4 s, pick-up "123 Main St, Raleigh, NC", drop-off "123 Main Street, Raleigh, NC" → web: no points, texts differ (`normAddr` keeps "st" vs "street"), Continue passes; app: both points known, blocked. Executed: `samePlace('123 Main St','123 Main Street',{})` → false on the web.
- CONFIDENCE: medium (timing case reasoned, not reproduced).

### B-10: How the trip distance is computed
- APP: `app/src/helpers/getDistance.js:27-49` asks the server `GET get_distance?origin=lat,lng&destination=lat,lng` and shows `distance` ("{distance} mi", `:114-119`), plus `tripDuration` (`:60-65`).
- SERVER: `server/helpers/functions.js:754-806` — one Distance Matrix call, and "`distance` is exactly what it has always been — miles as a number, or the string '0'": `if (element.distance.text.indexOf('mi') !== -1) distance = parseFloat(element.distance.text.split(' ')[0])`; minutes to one decimal from `duration.value`. (The claim-distance helper `server/helpers/helper.js:53-110` was already fixed to read metres: "READ THE METRES, NEVER THE TEXT"; this endpoint was not.)
- WEB: `web/gopher-request.html:13575-13597` — client-side `DistanceMatrixService`, `miles = el.distance.value / 1609.34`, shown `toFixed(1)`; minutes `Math.round(value / 60)`.
- VERDICT: DIVERGES.
- IF DIVERGES: executed on sample Google answers: text "492 ft" (150 m) → app "0 mi", web "0.1 mi"; text "1,204 mi" → app `parseFloat("1,204")` = **1 mi**, web 1204.0 mi. Typical trips ("12.4 mi") agree. This number feeds the Ride iQ price (D12), so a divergence here moves the suggested offer.
- CONFIDENCE: high (parsers executed; live Google answers not fetched).

### B-11: 15-mile rule: which First Available requests it converts
- APP: no client logic; the requester only sees the server's flag: `app/src/component/live/offerRows.js:150-155` "only when the server says the distance needs approval".
- SERVER: `server/controllers/order/update.js:4920-4966` (in `assign_order`, declared `:4707`) — evaluated only when `!get_order.selectgopher`, category not in `CLAIM_DISTANCE_SKIP_CATEGORIES` (`server/constants/index.js:601-608`: the five services + "Other"), NOT `isScheduledAsapOnlyCategory` (`:628` `['Need a Ride', 'Delivery']` with `request_schedule_later`), Standard Gopher only (`gopher_type_id === 0`), app build supports `long_distance_approval`; distance to the pick-up, or the drop-off/single address with purchase-anywhere (`helper.js:157-206`, Google driving miles); `> NEED_APPROVAL_ON_EXCEED_DISTANCE` (15, `constants/index.js:816`) turns the claim into a Select My Gopher record (`update.js:4968-4974`).
- WEB: `web/gopher-request.html:25311-25316` — First Available auto-hires the first demo worker unless `needsDistanceApproval(_w)`; `:26199-26202` `isStandardTier(w) && d != null && Number(d) > 15`. No schedule test. (Category scope matches in effect: `'first'` only survives on Delivery and Ride, `:17229-17243`.)
- VERDICT: DIVERGES. The owner's rule ("CONVERTS a far ASAP First Available … Delivery + Need a Ride only") is what the server does; the web also converts SCHEDULED requests.
- IF DIVERGES: input: Delivery, scheduled for tomorrow 2 PM, First Available; a Standard Gopher 20 mi away accepts → server: connected directly (not evaluated while scheduled); web: auto-hire withheld and the "needs approval" distance line shown (`:26603`).
- CONFIDENCE: high for both readings; the web's distances are demo values, so only the rule is comparable.

### B-12: 15-mile rule and a hand-picked MY Gopher
- APP: no client logic (as B-11).
- SERVER: a Prioritize order is stored with `selectgopher` true: `create.js:640-643` and `update.js:1045-1048` "`String(req.body.notify_fav_gopher) === 'true' ? true : …`". The distance block runs only when `!get_order.selectgopher` (`update.js:4930-4935`), so `distance_exceeded` stays false and a hand-picked favourite is auto-connected (`update.js:4989-4993`, `auto_connect_fav = is_notify_favgopher && notify_fav_gopher && !distance_exceeded`). No path found that sets `selectgopher` false later (searched `selectgopher\s*[:=]\s*false`, `SET selectgopher` in controllers/helpers/middleware/services).
- WEB: `gopher-request.html:25317-25325` — "Live requires `!distance_exceeded` before a hand-picked favourite is auto-hired"; `if(_mine && !needsDistanceApproval(_mine))`. A far Standard favourite is NOT auto-hired.
- VERDICT: DIVERGES. The web comment's premise is literally true but unreachable on the server: `distance_exceeded` cannot be true on a MY Gophers order.
- IF DIVERGES: input: Prioritize MY Gophers, hand-picked Standard favourite 20 mi away accepts → server: connected on accept; web: left as a candidacy needing the requester.
- CONFIDENCE: medium-high (`is_notify_first` itself not traced).

### B-13: The 15-mile rule never blocks the requester
- APP: the far Gopher is shown as an offer line ("4.2 mi from your drop-off", `offerRows.js:147-155`); accepting is not refused.
- WEB: Hire/Deny stay on every pending worker card (`gopher-request.html:26569-26576`); the far case only adds a note (`:26603`, `:26723`).
- SERVER: `server/controllers/order/order_gophers.js:303-311` — "DISTANCE never blocks the requester … A 9/25 hard block here (b8118ba7) refused the accept; removed."
- VERDICT: SAME.
- CONFIDENCE: high.

### B-14: Low local-Gopher availability notice
- APP: `app/src/component/addresspicker.js:200-252` — on each committed address, `GET /gopher_count?lat&lon&request_type&subcategory`; `if (response.data.data <= 20)` (`:223`) opens the zero or limited sheet (each with its own "do not show again", `:239`, `:329-333`); the counted point is the pick-up, or the single address, or the drop-off with purchase-anywhere (`app/src/helpers/gopherCountOwner.js:22-43`).
- SERVER: `server/controllers/common/requestor.js:16-48` — live headcount within `GET_GOPHER_COUNT_IN_RADIUS` (15 mi, `constants/index.js:331`) filtered by category and sub-type (`helpers/worker_count.js`).
- WEB: `gopher-request.html:16915-16956` — count from the static coverage table `GopherIQData.lookup("City, State")` parsed out of the address text, the better of pick-up and drop-off; `const low = w < 20`; shown once on Step 4 Continue until "Post my request anyway" (`:18134-18136`).
- VERDICT: DIVERGES.
- IF DIVERGES: threshold: exactly 20 Gophers → app warns (`<= 20`), web does not (`< 20`). Source: live, category-filtered 15-mile count vs a city-level static table. Point: app counts around the pick-up; web takes the max of both ends. Trigger: app on address pick (once per device with "do not show"), web on Continue (once per request).
- CONFIDENCE: high for the code; counts not fetched.

---

## WHO

### B-15: Worker-selection options per category
- APP: a First Available control exists only in `deliveryflow.json:222`, `rideflow.json:137`, `customtaskflow.json:142` (grep of all eight `*flow.json`). Delivery `delivery.js:97-104` "DL-10: all three choices"; Ride `ride.js:69-77`; Custom Task `customTaskFlowSteps.js:52-61` (three); Moving `movingFlowSteps.js:53-58`, Junk `junk.js:56-66`, Home `home.js:63-73`, Labor `laborFlowSteps.js:75-80`, **Yard** `yardFlowSteps.js:51-57` "I'll select my worker · Prioritize MY Gopher(s), no First Available (Y-05)".
- WEB: `gopher-request.html:15100` `NO_FIRST_AVAILABLE = ['moving','junk','labor','home']`; `:15028` `workerSelectChoice: ['yard','other']` (no choice drawn); `:17229-17230` forces `'select'` for those two.
- SERVER: not involved in which options show.
- VERDICT: SAME for Delivery, Ride (3 options) and Moving, Junk, Labor, Home (2 options). DIVERGES for Yard (D13, ruled "Yard shows the app's two options", web not yet changed at 9e29366) and Custom Task (CT port, ruled).
- IF DIVERGES: input: a Yard request by a requester with saved MY Gophers → app: Prioritize MY Gopher(s) offered and chosen by default (B-16); web: no choice, sent as "I'll select". Custom Task → app offers First Available; web offers nothing.
- CONFIDENCE: high.

### B-16: Default worker selection
- APP: Delivery/Ride/Custom Task: `available` `"defaultValue": true` (`deliveryflow.json:222-227`), kept true unless another option is set (`app/src/component/checkbox.js:33-38`). Moving/Junk/Labor/Home: `movingFlowSteps.js:477-484` `mvGopherDefaults` — MY Gophers if any saved, else "I'll select", applied only to a never-made choice (`MovingCrewCard.js:59-71`). Yard: `setYardGopherChoice` (`yardflow.json:66`, `app/src/helpers/setDefaultValue.js:1-20`) — same rule, and "I'll select" is locked (`select_gopherdisable`) when no MY Gophers.
- WEB: `gopher-request.html:14636` `workerSelection: 'first'`; `:17231-17243` for Moving/Junk/Labor/Home an untouched `'first'` becomes `myN > 0 ? 'my' : 'select'`, "The rule is the merged app's … mvGopherDefaults()".
- VERDICT: SAME where both sides offer the choice (Yard/Custom Task covered in B-15).
- CONFIDENCE: high.

### B-17: Hand-picked MY Gophers when the default lands on Prioritize
- APP: `app/src/component/favgophercheckbox.js:66-78` — Prioritize turning on from "nothing decided" seeds the selection with `initialFavGopherSelection` = every saved MY Gopher (`:23-28`), including when the default set it.
- WEB: tapping the row seeds all (`gopher-request.html:17311-17316`), but the default in `render()` (`:17242`) sets `workerSelection = 'my'` without touching `hireAgainGophers` (initial `[]`, `:14639`), and the panel then reads "None selected — opens to everyone" (`:16091`).
- VERDICT: DIVERGES.
- IF DIVERGES: input: a requester with 2 saved MY Gophers opens Junk and does not touch Step 3 → app: both hand-picked (`notify_select_fav_gopher` = both ids); web: Prioritize selected with zero hand-picks.
- CONFIDENCE: medium-high (app ordering of the two effects read, not run).

### B-18: Prioritize MY Gophers when no Gopher is saved
- APP: two writers. `checkbox.js:56-60` hides the row when `fav_gopher_details` is empty, but the step map re-shows every listed field on its step: `YardStepHeader.js:175-182` sets `<key>visible` from `visibilityForStep`, and no flow has a show-rule for `notify_fav_gopher` (e.g. `delivery.js:141-149`, `stepFactories.js:29-46`); `YardStepNav.g40547.test.js:426-463` pins that the step map overrides the load-time flag. By reading, the row is drawn and tappable with zero saved Gophers.
- WEB: `gopher-request.html:15921` `myUnlocked = myGCount > 0`; with none, a locked row "Unlocks once you've favorited neighborhood Gophers from completed jobs" (`:16060-16065`).
- VERDICT: DIVERGES (by reading).
- IF DIVERGES: input: a new requester with no saved Gophers on Delivery Step 3 → app: "Prioritize MY Gopher(s)" selectable (it would be sent as `notify_fav_gopher` with no hand-picks; the server then stores `selectgopher` true); web: row locked.
- CONFIDENCE: medium. Not run; the net of the two writers is inferred from effect order and the cited test, not observed.

### B-19: Crew ("More than 1 worker needed") categories and bounds
- APP: crew card on Yard (`yardFlowSteps.js:50`), Moving (`movingFlowSteps.js:70`), Junk (`junk.js:61`), Labor (`laborflow.json` `lb_setup_card`); Home draws none (`homeflow.json:150` `"defaultsOnly": true`); Custom Task has none ("Custom Task has no crew", `YardReviewExtras.js:218-221`). Count `min={2}`, no max (`MovingCrewCard.js:131-137`; `MovingCounter.js:26`, `:99` caps only when `max` is given). Step 3 refuses on < 2 (`yardFlowSteps.js:286-292`, `movingFlowSteps.js:201-207`).
- WEB: `gopher-request.html:15020` `workerSetup` hidden for Delivery, Home, Ride (so shown on Moving, Labor, Junk, Yard, **Other**); counter `:17367-17368` `Math.min(20, …)` / `Math.max(2, …)`.
- SERVER: no crew bound found (searched `gopher_needed` in `validators/orders.validator.js`, `create.js`).
- VERDICT: DIVERGES.
- IF DIVERGES: input: a Moving crew of 21 → app accepts, web stops at 20. Input: Custom Task with 3 workers → web offers a crew; app has no crew control.
- CONFIDENCE: high.

### B-20: D14 pay by the hour: which categories
- APP: `paying_by_hour` exists only in `laborflow.json` (grep of all eight flows); `laborFlowSteps.js:95-97` `isHourly`.
- WEB: the toggle lives in `workerSetup` (B-19) and is removed only for Moving: `gopher-request.html:15947` `const noHourly = state.category === 'moving'`, `:15969-15985`. So hourly is offered on Labor, Junk, Yard and Other.
- VERDICT: DIVERGES. Owner ruling D14 "Pay by the hour on Labor only … Web: remove it from Yard, Custom Task and Junk"; not yet done at 9e29366.
- IF DIVERGES: input: Junk Removal, Step 3 → web shows "Pay by the hour"; the app does not.
- CONFIDENCE: high.

### B-21: Hours bounds when paying by the hour
- APP: `laborflow.json:129` `{"type": "stepCounter", "label": "# of hours needed", "min": 1}`; `StepCounterField.js:8-19` passes no max; `laborFlowSteps.js:139-144` floors at 1.
- WEB: `gopher-request.html:17369-17370` `Math.min(24, …)` / `Math.max(1, …)`.
- SERVER: none found (searched `noof_hour` in validators and `create.js`).
- VERDICT: DIVERGES.
- IF DIVERGES: input: Labor, 30 hours → app accepts; web stops at 24.
- CONFIDENCE: high.

### B-22: Paying by the hour turns bids off
- APP: `laborFlowSteps.js:99-102` `bidsAllowed = !isHourly` (Labor, the only hourly flow).
- WEB: `gopher-request.html:15182` `!(state.payByHour && (state.category === 'labor' || state.category === 'yard'))`.
- VERDICT: DIVERGES today (Junk/Other hourly keep bids on the web); moot once D14 removes hourly outside Labor.
- IF DIVERGES: input: Junk, pay by the hour on → web still offers "Request bids".
- CONFIDENCE: high.

---

## WHEN

### B-23: Timing options offered, per category
- APP: one `TimingChoice` on every step-flow review (`app/src/component/yardFlow/YardReviewExtras.js:499-527`): Need ASAP, or Schedule for later → Flexible window (24 h / a week / 2 weeks) or Pick exact time (`:107-205`). Labor's `timing: { asap: true }` (`stepFlows.js:369`) has no reader (grep `flow.timing`).
- WEB: `gopher-request.html:16734-16764` Need ASAP / Schedule for later → Flexible window (same three) / Pick exact time, for every category.
- VERDICT: SAME.
- CONFIDENCE: high.

### B-24: Need ASAP stays open 1 hour or about 6 hours
- APP: `asapHours` 6 for Yard (`stepFlows.js:140`), Moving (`:268`), Labor (`:346`), Junk (`junk.js:265`), Home (`home.js:272`); 1 for Custom Task (`stepFlows.js:177`), Delivery (`delivery.js:466`), Ride (`ride.js:308`).
- WEB: `gopher-request.html:15137-15140` `home: 6, moving: 6, junk: 6, yard: 6, labor: 6 … delivery: 1, ride: 1, other: 1`.
- SERVER: `create.js:558-564` 60 minutes, 360 when `SERVICE_ORDERS[category_type]` (`constants/index.js:586-592`).
- VERDICT: SAME.
- CONFIDENCE: high.

### B-25: Flexible window expiry
- APP: `app/src/helpers/orderObject.js:42-52` request time = now + 1, 7 or 14 days, sent with `request_schedule_later` (`:179-186`); `yardFlowSteps.js:392-399` "open for 24 hours / 7 days / 2 weeks".
- WEB: `gopher-request.html:16793-16799` "expires in 24 hrs / 7 days / 14 days".
- SERVER: `create.js:566-570` the expiry (`delivery_eta`) is the sent time.
- VERDICT: SAME.
- CONFIDENCE: high.

### B-26: Tapping "Schedule for later"
- APP: `YardReviewExtras.js:117-120` the tile only opens the sheet (`setSheetOpen(true)`); timing stays Need ASAP until a window row or the exact-time tab is tapped (`:153-169`, `:192-204`); the tile reads "Pick a window or time" meanwhile (`:126`).
- WEB: `gopher-request.html:17588-17592` flips `scheduleType` to `'flexible'`, and `flexibleWindow` already defaults to `'24hr'` (`:14691`), so "Within 24 hours" is selected at once.
- VERDICT: DIVERGES.
- IF DIVERGES: input: tap "Schedule for later", then Done → app: still Need ASAP; web: Within 24 hours.
- CONFIDENCE: medium-high (read, not driven).

### B-27: Exact time: earliest, latest, time-of-day grid
- APP: `app/src/component/datetimepicker.js:34-35` `minDate = now + 1 hour`, `maxDate = now + 14 days`; `:62-68` a time must be strictly after now + 1 h; `:162` `timeIntervals={5}`; any hour of the day. Label `YardReviewExtras.js:189` "Schedule your request between 1 hour and 2 weeks."
- WEB: `gopher-request.html:16346-16351` "First valid bookable day = tomorrow (can't schedule a "later" job for today)"; `:16319-16328` slots every 30 min, 6:00 AM–9:00 PM; no latest date (the next-month arrow is never disabled, `:16422`, `:17609-17617`).
- SERVER: `server/helpers/validate_schedule_time.js:27-49` rejects only a past time ("No lead-time requirement enforced here on purpose").
- VERDICT: DIVERGES.
- IF DIVERGES: inputs: today 6:00 PM requested at 3:00 PM → app allows, web cannot (today disabled); 3 weeks out → web allows, app cannot; 11:30 PM tomorrow → app allows, web has no slot.
- CONFIDENCE: high.

### B-28: Exact time: default value
- APP: switching to "Pick exact time" mounts the picker, which writes `request_schedule_time` = now + 1 h at once (`datetimepicker.js:19-26`, `:76-82`); Done only refuses an empty time (`YardReviewExtras.js:86-90`), so the default is accepted silently.
- WEB: the date defaults to tomorrow (`gopher-request.html:16353-16361`) but the time is `''` "no false default — user must pick" (`:14695`); Done is disabled (`:16762-16764`) and the step-6 gate blocks (`gopher-step-gates.js:216-222`).
- VERDICT: DIVERGES.
- IF DIVERGES: input: choose "Pick exact time" and tap Done without choosing → app: scheduled for one hour from now; web: cannot continue.
- CONFIDENCE: medium-high (read, not driven).

### B-29: A resumed draft whose scheduled time has passed
- APP: `app/src/component/yardFlow/yardDraft.js:159-178` — an exact time not in the future becomes Need ASAP ("the time it was for has passed").
- WEB: `web/assets/js/gopher-request-draft.js:180-192` — clears date and time only when the DATE is before today; the request stays "scheduled" with the picker reopened. A same-day past time is kept, and the step-6 gate checks only that a slot exists (`gopher-step-gates.js:219-221`).
- VERDICT: DIVERGES.
- IF DIVERGES: inputs: a draft scheduled for yesterday 2 PM, resumed today → app: Need ASAP; web: "Schedule for later" with no date/time, must pick. A draft for today 9 AM, resumed at 3 PM → app: Need ASAP; web: keeps 9:00 AM today (a past time) and lets it through.
- CONFIDENCE: medium-high (the web draft path from `out` to `state` not fully traced).

### B-30: Time zone of a scheduled time
- APP: the picker's value is the device's own `Date` ("reads in the requester's own time zone", `YardReviewExtras.js:43-48`); windows use `moment()` (`orderObject.js:42-52`).
- WEB: a local calendar date plus a time label string (`gopher-request.html:16330-16335`, `:16363-16367`), never converted.
- SERVER: stores the instant; rejects past ones (`validate_schedule_time.js`).
- VERDICT: SAME (both use the device's zone; neither uses the job address's zone).
- CONFIDENCE: medium (the web keeps a label, not an instant, so there is nothing to send yet).

---

## Category specifics

### B-31: Ride: number of riders
- APP: `rideflow.json:107-113` `"min": 1`, no max; `ride.js:44-47` floors at 1; the counter has no cap without `max` (`MovingCounter.js:26`; `CustomTaskDetails.js:295-305` passes `criterion.max`).
- WEB: `gopher-request.html:15835-15837` a select of `'1'…'6'`.
- SERVER: none found (searched `noof_rider` in validators and `create.js`).
- VERDICT: DIVERGES.
- IF DIVERGES: input: 7 riders → app accepts; web cannot express it.
- CONFIDENCE: high.

### B-32: Ride: large bags
- APP: `rideflow.json:114-120` `"min": 0, "max": 6`; `ride.js:45`, `:48-49`.
- WEB: `gopher-request.html:15841-15843` `'0'…'6'`.
- VERDICT: SAME.
- CONFIDENCE: high.

### B-33: Ride: no description or photos; special instructions; no bids
- APP: `ride.js:65-68` "No description, no photos"; special instructions `rideflow.json:121-126`; no bids `ride.js:142-148` (`gopher_bid: false`).
- WEB: `gopher-request.html:15010-15011` `describe`/`addPic` hidden for ride; textarea `:15854-15856`; `:15049` `bidsOption: ['delivery','ride']`.
- VERDICT: SAME.
- CONFIDENCE: high.

### B-34: Moving: single-location switch
- APP: `movingFlowSteps.js:49-51` "Single-location move" starting OFF; `:114-118` anything not `true` is off; ON = one address, OFF = pick-up + destination (`:154-166`).
- WEB: `gopher-request.html:16115-16126` the same switch label for Moving, `noSpecificPickup: false` (`:14652`); ON drops the pick-up section (`:16123`).
- SERVER: Moving sub-type "Location Move" vs "Same Location Move" drives the same-place rule (`same_place.js:41`).
- VERDICT: SAME.
- CONFIDENCE: high.

### B-35: Moving/Junk: item count 1–4, then "Multiple"
- APP: Moving `MovingDetails.js:113-122` `min={1}`, `max={4}`, `onOverflow={toggleMultiple}`; Junk `junkflow.json:169-176` same; turning Multiple off resets the count to 1 (`MovingDetails.js:53-61`; Junk `junkflow.json:183` `onClear: {number_of_items: 1}`).
- WEB: `gopher-request.html:17361-17366` `itemCount++`, "5+ items → automatically activate Multiple"; `dec` floors at 1. Turning Multiple off (`:17283-17286`, the generic toggle, which only flips the flag) leaves `itemCount` at 5, and the review reads "5 items · mixed" while Multiple is on (`:16487`) where the app reads "Multiple items" (`movingFlowSteps.js:619-623`).
- VERDICT: SAME for the rule; DIVERGES (minor) on what Multiple-off leaves behind.
- IF DIVERGES: input: tap + to 5 (Multiple turns on), then turn Multiple off → app shows 1 item; web shows 5 with the "Auto-on · 5+ items" chip.
- CONFIDENCE: high.

### B-36: Stairs
- APP: Moving pick-up and destination counters (`movingflow.json:319`, `:371`; pick-up hidden when single, `MovingStairs.js:40`), sent as one total (`movingFlowSteps.js:145-152`); Labor destination (`laborFlowSteps.js:83`, `lb_stairs`); `min={0}`, no max (`MovingStairs.js:56-62`). Custom Task: none (B-2).
- WEB: `gopher-request.html:15032` pick-up stairs Moving only; `:15042` destination stairs Moving, Labor, Other; `:17371-17374` `Math.min(10, …)`.
- VERDICT: DIVERGES.
- IF DIVERGES: input: 12 flights at the destination → app accepts, web stops at 10. Custom Task: web asks for destination stairs, app does not (B-2). (The owner ruled two fields correct, `:16130-16134`; the app has two counters and sends their sum because the server has one column, `orders.total_stair_flight`.)
- CONFIDENCE: high.

### B-37: Delivery: purchase switch and cost of items
- APP: `delivery.js:161-163` "Please enter the cost of items needed." when `need_purchase` and cost not > 0.
- WEB: `gopher-step-gates.js:68-76` `costOfItems` gate when `itemsPurchased`.
- VERDICT: SAME.
- CONFIDENCE: high (the age switch turning purchase on is left to the age-rules audit).

### B-38: Delivery: "purchase from anywhere"
- APP: `stepAddress.js:54-63` ON blanks the pick-up; `delivery.js:170-171` pick-up not required; `delivery.js:455` no same-place check; the Gopher count and the 15-mile distance use the drop-off (`gopherCountOwner.js:28`, server `helper.js:173-206`).
- WEB: `gopher-request.html:16115-16126` the switch (Delivery label "Gopher can purchase from anywhere"); gates skip the pick-up (`gopher-step-gates.js:121`, `:172`); review pick-up "Any location" (`:14443-14445`).
- VERDICT: SAME (labels differ: app "Worker can purchase from anywhere", `deliveryflow.json:501-504`; copy only).
- CONFIDENCE: high.

### B-39: No service elevator on Request
- APP: no service-elevator field in any Request flow JSON (searched `elevator` in `src/json/requester/*flow.json`).
- WEB: `gopher-request.html:15041` `serviceElevator` hidden for all eight ("a Connect feature").
- VERDICT: SAME.
- CONFIDENCE: high.

---

## Notes for the reader

- **Rulings already made, not yet built on the web at 9e29366:** D13 (B-15 Yard), D14 (B-20, B-22), the Custom Task port (B-2, B-15, B-19, B-36). They show as DIVERGES here because the code still differs; the direction is decided.
- **D4 is done on both sides** (B-8): same 25 m haversine, same categories, blocks every time, server refuses too. The 10/13 doc's "app warns, does not block" row is superseded by G40-274 (`samePlaceCheck.js`, `same_place.js`).
- **Not compared** (outside this area, or not reachable from this code): the server's MY Gophers roll-out timing, the iQ suggested-price values (pricing area), age-restricted routing (age area), and anything the worker app shows.
