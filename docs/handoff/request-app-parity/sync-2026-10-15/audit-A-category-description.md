# Audit A: Category + Description (Request web vs live Request app)

Pinned code, read-only: APP `b47efe59f`, SERVER `7e571e9f`, WEB `9e29366`. Paths below are relative to each worktree
(`app/`, `server/`, `web/`). `gopher-request.html` is abbreviated `GR`.

**How this was checked.** Every row was read at the cited lines. Where both sides have a pure function, the two were run
side by side with `node` on the same inputs. The harnesses are in `scratchpad/auditA/` and are read-only:
- `age_parity.js`: app `helpers/ageKeywords.js` against web `GopherRequestLogic.findAgeRestrictedMatch`. **0 differences on 18,410 inputs.**
- `cmp_lists.js`: the five word lists. **Identical.**
- `brain_parity.mjs`: the app's vendored iQ brain against the web's inlined brain. **0 differences on 376 queries** when both get the same FAQ set.
- `nudge.js`: the web's `detectCategoryMismatch`, run on sample inputs.
- `ideas_cmp.mjs`: app `IDEAS` against web `HOME_IDEAS`.
- The phone regexes and the app's `handleChange` were also executed.

**Sources of truth.** Owner rulings come from `APP-DIVERGENCE-2026-10-13.md` (branch `code-logic/coupon-pl289-web`). They are **inherited** (doc, not code). Code facts are first-hand.

## Summary

| ID | Rule | Verdict |
|---|---|---|
| CAT-1 | The 8 categories: keys, display names, order, all enabled | SAME |
| CAT-2 | Stored sub-type / title per category (General Errand / CBD/Other, Location Move / Same Location Move, "Other - ") | APP-ONLY |
| CAT-3 | Custom Task "Before you continue" sheet: pick a real category first | APP-ONLY |
| CAT-4 | iQ Ideas per category: guidance as placeholder, never text; Ride goes to special instructions | SAME (first 5) / DECLARED (web's 6th idea) |
| ROUTE-1 | Classifier data and scoring (iQ brain, gopher-iq @ 90e2524) | SAME |
| ROUTE-2 | Typed text in "What can we help you with?" opens that category with the text prefilled | DIVERGES |
| ROUTE-3 | What moves with the request on an in-flow category change (description / photos / addresses) | DIVERGES |
| NUDGE-1 | Category-mismatch nudge (D5): blocks Continue once on Step 2 | WEB-ONLY (ruled; app ticket G40-624 not built) |
| CT-1 | Custom Task Step 2: A/R switch, purchase switch, cost of items | APP-ONLY (ruled CT port, not built on web) |
| CT-2 | Custom Task A/R switch hidden from under-21 | APP-ONLY, and the app breaks the ruling (shows it to all) |
| CT-3 | Custom Task cost-of-items check waived in bid mode | APP-ONLY |
| AGE-1 | Age-keyword word lists | SAME |
| AGE-2 | Age-keyword matcher (folding, boundaries, plurals, exceptions, context pass) | SAME |
| AGE-3 | Scan runs on every category's Step 2; Ride reads special instructions (D1) | SAME |
| AGE-4 | Scan re-runs before Review / submit (tab-jump, Request Again fast) | DIVERGES |
| AGE-5 | Who counts as under 21: unknown date of birth | DIVERGES |
| AGE-6 | Under-21 block: neutral words, every attempt, word selected on close | SAME |
| AGE-7 | 21+ first sheet "This looks age-restricted": when shown, words, buttons | SAME |
| AGE-8 | When an answered prompt re-arms (per wording vs any edit) | DIVERGES (edge) |
| AGE-9 | "Yes": Delivery stays; other categories move to Delivery with A/R + purchase on; Ride text carried | SAME (addresses: see ROUTE-3) |
| AGE-10 | "No" opens the second sheet "You'll need your ID for this one" (D6); Submit as-is flags `age_keyword_declined` + `age_keyword` | SAME |
| AGE-11 | Review's "What to expect" ID line for A/R and keyword-flagged requests | WEB-ONLY |
| AGE-12 | GO-To set-up: age scan + A/R switch gating | DIVERGES |
| AGE-13 | Delivery A/R switch shown only to 21+ | SAME |
| AGE-14 | TrustShield interplay with the scan | SAME |
| AGE-15 | Server's own under-21 guard (title list + `age_restricted?`, 403) | APP-ONLY (web posts no orders yet) |
| PHONE-1 | Phone number in description (D10): mask vs block, and the pattern | DIVERGES (ruled; neither side built) |
| PHONE-2 | Which boxes the phone rule covers | DIVERGES |
| DESC-1 | Description required on every category except Ride | SAME on Continue; DIVERGES on edit + tab-jump |
| DESC-2 | Description length limit | DIVERGES (app's 300 cap is not enforced: bug) |
| DESC-3 | Ride special instructions: optional, no limit | SAME |
| DESC-4 | Photos: up to 3, optional, every category except Ride | SAME |
| DESC-5 | Review's "brief description" advice (< 25 chars, Second Set of Eyes) | DIVERGES |

---

## 1. Category catalogue

### CAT-1: The same 8 categories, names, order, all enabled
- APP: `src/component/home/homeNav.js:22-31` — `HOME_CATEGORIES = ["Delivery","Junk Removal","Moving","Home Services","Hourly / Day Labor","Yard Project","Need a Ride","Other"]`. `src/helpers/categoryLabel.js:25-27` — `Other: "Custom Task"`; display-only, the stored value stays "Other". `src/component/yardFlow/stepFlows.js:457-466`: `FLOW_LIST` has the 8 flows, each opening at Step 2 (`yardFlowSteps.js:34 FIRST_STEP = 2`).
- WEB: `GR:14064-14250` `CATEGORIES`, keys `delivery, junk, moving, home, labor, yard, ride, other`. Names at 14066 'Delivery', 14089 'Junk Removal', 14112 'Moving', 14141 'Home Services', 14164 'Hourly / Day Labor', 14188 'Yard Project', 14211 'Need a Ride', 14234 'Custom Task'. The dashboard home tiles (`GR:22809-22880`, `data-homecat`) are in the same order; a tile calls `__startRequestWithCategory`, which jumps to Step 2 (`GR:18311-18332`).
- SERVER: `constants/index.js:44-56` `FEES` and `:586-592` `SERVICE_ORDERS` key on the same stored names. Not involved in choosing a category.
- VERDICT: SAME
- CONFIDENCE: high. Not checked: the legacy Services page / old tile JSONs (`src/json/requester/alcohol.json` etc.). The new home does not reach them.

### CAT-2: Stored sub-type and title derived per category
- APP: `stepFlow/flows/delivery.js:56-60`: Delivery sends `"General Errand"` / `"Delivery-General Errand"`, or, with the A/R switch on, `"CBD/Other"` / `"Delivery - Age-Restricted"`. `yardFlow/movingFlowSteps.js:39-40, 287-291`: Moving sends `"Location Move"` / `"Same Location Move"` from the single-location switch. `helpers/orderObject.js:16`: Custom Task's title is `"Other - "`. Home, Junk, Ride, Labor and Yard send `sub_category_type: ""` (e.g. `flows/home.js:155`, `flows/ride.js:139`).
- WEB: not found by these searches: `sub_category|subCategory|subType|General Errand` in `GR`. The web builds only a local request record (`GR:14470-14484`).
- SERVER: `constants/index.js:302-303`: `AGE_RESTRICTED_KEYWORDS` is matched against the **title** (`controllers/order/create.js:520-523`). So the title the client derives is what triggers the server's under-21 guard.
- VERDICT: APP-ONLY
- IF the web starts posting orders, it must derive these same strings, or the server's title-based guard and fee routing will differ.
- CONFIDENCE: high on the app; medium on "web has none" (string search only; there is no web payload to the server to follow).

### CAT-3: Custom Task's "Before you continue" category-pick sheet
- APP: `component/home/HomeScreen.js:94-103`: `if (category === CUSTOM_TASK && !skipsCustomTaskSheet()) { setPreSheet(...) }`. `component/live/CustomTaskCategorySheet.js:1-12, 37-60`: *"Please ensure the request you're looking for isn't already included in our category menu."* It shows the 7 other categories as tiles; a tile opens that category with the typed words. "Continue with Custom Task" and "don't show again" (`doNotShowPreOtherModal`, `homeNav.js:90-96`). It applies to every door: tile, iQ card, "Didn't find the right fit?".
- WEB: not found by these searches: `Before you continue|doNotShowPreOtherModal|preOther|PreSheet` in `GR`. The Custom Task tile goes straight to Step 2 (`GR:23499-23506` → `18311`).
- SERVER: not involved.
- VERDICT: APP-ONLY
- Concrete input: tap Custom Task. App: the category-pick sheet opens first. Web: Step 2 opens.
- CONFIDENCE: high. This sheet is not named in the CT-port ruling's field list (description, A/R switch, purchase + cost, addresses, bids), so whether the web should get it is **unruled**.

### CAT-4: iQ Ideas per category (tapped examples)
- APP: `component/home/iqIdeas.js` `IDEAS` (5 per category). A tapped idea puts its **guidance** as placeholder, never text (`homeNav.js:70-85`, *"do NOT pre-populate with real text"*). `guidanceField`: Need a Ride goes to `special_instructions`.
- WEB: `GR:23329-23450` `window.HOME_IDEAS`. `__startRequestWithCategory` sets `state.iqGuidance`; the field is `specialInstructions` for ride (`GR:18318-18323`).
- SERVER: not involved.
- VERDICT: SAME for the first five ideas and their guidance text (run: 0 guidance differences). DECLARED for the web's 6th idea per category ("Store return drop-off", "Appliance removal", "Storage unit load-in", "Install a ceiling fan", "Unload a delivery truck", "Weed the beds & borders", "Pick up a family member", "Hang holiday lights"). `GR:23315-23317`: *"The SIXTH idea in each category is WEB-ONLY (owner's 10/13 symmetry ruling…)"*. The ruling is inherited from the code comment.
- CONFIDENCE: high (executed).

## 2. Routing into a category

### ROUTE-1: Classifier data and scoring
- APP: `component/home/iqEngine.js:16-19, 41-50`: `makeBrain({faqs: FAQS, categories: window.GopherCategoryClassifier.CATEGORIES, scope: "customer"})`. `home/vendor/SOURCE.json:4-5`: built from gopher-iq `90e25248…`. Scoring is in `vendor/brain-categories.js` (`CAT_THRESH 4`, `CAT_HIGH 8`).
- WEB: `GR:18995` inline brain, *"Source: gophergo/gopher-iq @ 90e25248…"*. `GR:20012-20017` builds `BRAIN` and **re-points `window.GopherCategoryClassifier` at `BRAIN.categories`**; the web nudge (NUDGE-1) reads that. `assets/js/gopher-category-classifier.js` is byte-identical to the app's vendored copy (sha256 `b26faa7d…`). It is **not loaded** on `GR`.
- SERVER: not involved (no classifier found by `classif|scoreCategories|category_mismatch`).
- VERDICT: SAME
- Executed: `CATEGORIES` JSON identical (8 slugs). With the same FAQ set, app and web brains gave **0 differences** on 376 queries (service top, confidence, alternatives, related, contact-us).
- ⚠ The standalone `scoreCategories` inside `gopher-category-classifier.js` differs from `brain.categories.scoreCategories` on "u-haul" phrasing ("Load or unload a U-Haul"). **Neither side routes with it**, so it is not a live divergence. It would become one if anything starts calling the standalone function.
- CONFIDENCE: high.

### ROUTE-2: Typed text opens the matched category with the words prefilled
- APP: `home/HomeIq.js:155-157`: `askIq(query)`, then `classify(query, result)`. `:214-221`: "Submit a request" calls `onStart(match.top.category, query)`, labelled *"Starts with “…” as the description"*. `homeNav.js:62-68` `prefillValues`: Ride's text goes to `special_instructions`. `HomeScreen.js:94-103`: words equal to an idea name are treated as a tapped idea. `HomeIq.js:252-263`: "Didn't find the right fit?" opens Custom Task with the text.
- WEB:
  - The only typed iQ box that routes is the **public hero pill** (`GR:11530`). Its "Submit a request" is `submitRequest(slug)` (`GR:20131`), which stashes `window.__aiBookedCategory=slug` and calls `openPortal()` (`GR:20384`).
  - Not found by these searches: any reader of `__aiBookedCategory` (only writes, at `GR:20384`), and any `?category=` reader (`location.search|searchParams|get('category')`). The typed text is not carried.
  - The signed-in dashboard's Gopher Assistant only answers (`GR:33631-33645` `plainAnswer`: label + blurb, no request button).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: the app opens the category flow at Step 2 with the typed words. The web goes to sign-in and drops both the category and the words. Also:
  - Labels: the app shows the live names (`iqEngine.js:29-38` `SLUG_TO_CATEGORY` → "Need a Ride", "Yard Project", "Custom Task"). The web pill shows the classifier labels (`GR:20128` `esc(top.label)` → "Ride Sharing", "Yard Work & Outdoor Projects", "Other").
  - Scope: the app uses `customer` scope; the web pill uses `public` scope with `IQ_PUBLIC`. 3 of 376 queries differ in whether a service card appears at all ("Mount a TV", "drop me off", "pick me up": a card on the app, none on the web pill).
  - Input: type "haul away an old couch" → app: Junk Removal Step 2 with that text in the description. Web: sign-in portal, then the home screen with no category and an empty description.
- CONFIDENCE: high on the code paths. Not driven in a browser or on a device.

### ROUTE-3: What moves with the request on an in-flow category change
- APP: the only in-flow move is the age "Yes" outside Delivery. `stepFlow/ageKeywordCheck.js:87-101` `deliveryCarryValues` carries `description` (from the scanned box), `attachment`, A/R on, purchase on. Addresses are **not** carried (`:30-32`, *"⛔ The addresses do not"*). There are no category tabs inside a flow; "Change ›" leaves to home (`stepFlows.js:137`).
- WEB: the in-flow tabs (`GR:14880-14897`), the nudge's "Switch" (`GR:18608`) and the age "Yes" (`GR:18490`) all call `switchCategory` (`GR:14757-14764`). It resets only `CATEGORY_SCOPED_KEYS` (`GR:14718-14736`). Those keys do not include `description`, `picThumbs`, `pickupStops` or `dropoffStops`, so **addresses are kept**. From Ride, `state.description = state.specialInstructions` (`GR:18489-18491`).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: on age "Yes", the web keeps pick-up and drop-off; the app clears them. Input: a 21+ Need a Ride with pick-up "123 Main St", destination "RDU Airport", special instructions "stop for a 12 pack". Tap Yes. Web: Delivery keeps both addresses (the rider's pick-up becomes the store end). App: Delivery Step 4 has both addresses empty.
- CONFIDENCE: high (read). Owner "keep all three" (10/14, inherited) ruled the **app's** behaviour ("call 1"). Whether the web should match it is not stated: **needs a ruling**.

### NUDGE-1: "This looks like a … job" (D5)
- APP: not found by these searches: `detectCategoryMismatch|CategoryMismatch|category_check|scoreCategories|GopherCategoryClassifier|wrong category|filter available jobs|Switch to |classify(` outside `home/vendor`. The only classifier call is `HomeIq.js:157` (home iQ sheet, before a flow opens). Following the data: inside a flow, `description` is read only by the step checks (empty test), the age scan, Home's checklist, drafts, Second Set of Eyes and the order builder (`grep \.description` across `yardFlow/`, `stepFlow/`, `helpers/`).
- WEB: `assets/js/gopher-request-logic.js:52-106` `detectCategoryMismatch`. It fires when:
  - the top category scores ≥ 8 (`STRONG_BAR`), beats the selected one by ≥ 5 (`MARGIN`), and the selected one is weak (< `CAT_THRESH` 4, or top ≥ 2.5× selected); or
  - "unambiguous": top ≥ 4, selected < 1, top ≥ 2.5× the runner-up.
  - It never suggests *to* Other, and one content word alone only fires via the unambiguous path.
  - Wiring is at `GR:18588-18620`:
    - Words: *"This looks like a {label} job"* / *"Requests in the wrong category may not reach the right workers…"*, with "Switch to …" and "Keep as …".
    - Trigger: Continue on Step 2 (`GR:18104-18106`), **and on blur** of the description (`GR:17455-17459`).
    - Precedence: skipped when the description has an age keyword.
    - "Keep as" sets `userAcknowledgedCategory`, re-armed on any description edit (`GR:17448`).
- SERVER: not involved.
- VERDICT: WEB-ONLY. Owner ruled D5 "blocks Continue once (the web's rule)" for the app; ticket G40-624. Inherited.
- IF DIVERGES: run results (`nudge.js`):
  - Junk + "I need an electrician" → Home Services.
  - Junk + "Looking to have a couch moved to 3rd floor" → Moving.
  - Other + "mow and edge my lawn" → Yard.
  - Home + "drive me to the airport" → Ride.
  - Example: Home Services + "drive me to the airport". Web blocks Continue with the nudge; the app continues.
  - Copy note: the web modal uses classifier labels ("This looks like a Ride Sharing job"), not the category names on the tabs.
- CONFIDENCE: high.

## 3. Custom Task ("Other")

### CT-1: Custom Task Step 2 has an A/R switch, a purchase switch and cost of items
- APP: `yardFlow/CustomTaskDetails.js:91-103` `CUSTOM_TASK_CRITERIA`:
  - *"Slide if this custom task includes Age-restricted items"* (`has_age_restriction`);
  - *"This task requires a purchase"* (`need_purchase`, reveals cost).
  - `customTaskFlowSteps.js:136-149`: description required, and cost > 0 when purchasing.
  - `orderObject.js:73-74`: the switch is sent as `"age_restricted?"`.
  - `ageKeywordCheck.js:167`: the switch on means the 21+ question is not asked.
- WEB: `GR:15012`: `deliveryType` is hidden for `'other'`. The only `ageRestricted` / `itemsPurchased` toggles on the page are inside the Delivery-only section (`GR:15772-15826`). The `data-toggle` list on the page has no Custom Task switch. Web Custom Task Step 2 is description + photos only.
- SERVER: `controllers/order/create.js:520-531` refuses `age_restricted?` for under-21 / unknown age. A/R fee on any category is D7 (fees area, not audited here).
- VERDICT: APP-ONLY. Owner ruled the "CT port" (web gets the app's Custom Task logic, inherited); not built at `9e29366`.
- IF DIVERGES: Custom Task "bartender for my event, wine":
  - App (21+): turn the switch on and the request is A/R with no keyword prompt.
  - Web: no switch; the keyword prompt fires and "Yes" moves it to Delivery.
- CONFIDENCE: high.

### CT-2: Custom Task A/R switch hidden from under-21
- APP: `CustomTaskDetails.js:91-103`: the A/R criterion has **no `profileFlag`**, unlike Delivery's (`json/requester/deliveryflow.json:128` `"profileFlag": "can_request_restricted_items"`). `:230-235` hides a criterion only when it carries a `profileFlag`, so every requester sees it. If an under-21 switches it on with no keyword in the text, there is no client stop, and the server returns 403 "Unauthorized." at submit (`create.js:520-531`).
- WEB: no switch (CT-1).
- SERVER: `create.js:520-531` as above.
- VERDICT: APP-ONLY. The app currently **contradicts the owner's CT under-21 ruling** ("hide the A/R switch from under-21s", G40-614, inherited).
- IF DIVERGES: an under-21 opens Custom Task. App: the A/R switch is visible and usable, and submit fails 403. Web: no switch.
- CONFIDENCE: high on code. Not seen on a device.

### CT-3: Custom Task cost-of-items check waived in bid mode
- APP: `customTaskFlowSteps.js:142-149`: `v.need_purchase && !v.gopher_bid && !(cost > 0)`.
- WEB: `assets/js/gopher-step-gates.js:68-76` `costOfItems` has no bids exemption. It is moot for `other` because the purchase switch never shows there.
- SERVER: not involved.
- VERDICT: APP-ONLY. Settles with the CT port.
- CONFIDENCE: high.

## 4. Age-restricted keyword scan

### AGE-1: Word lists
- APP: `src/helpers/ageKeywordsData.json`: keywords 1657, supplement 352, flavors 201, forms 24, exceptions 4 (`1792`, `game`, `corona`, `wine`). `source`: *"Code repo branch G40-623-web 38eb5f5 … Do NOT hand-edit"*.
- WEB: `assets/js/gopher-age-keywords.js` (`window.GopherAgeKeywords`, generated from the four iQ xlsx files). `assets/js/gopher-age-supplement.js` (supplement, flavors, forms; `GopherAgeExceptions` at `:382`).
- SERVER: does not scan descriptions (no `findAgeRestricted|ageKeywords` in `controllers/ helpers/ services/ constants/`). Its own list is a title list (AGE-15).
- VERDICT: SAME. Executed: all five arrays/objects are `JSON.stringify`-identical.
- ⚠ The prior doc's "1658" is now **1657**: the keyword "on the" was cut (G40-623).
- CONFIDENCE: high.

### AGE-2: Matcher
- APP: `helpers/ageKeywords.js`. In order:
  1. Smart punctuation folded 1:1 (`:34-38`).
  2. Literal pass: every keyword, case-insensitive, whitespace-flexible, alphanumeric boundaries; every occurrence is tried so a ruled exception can be skipped (`:181-208`).
  3. Normalised pass (`:43-56, 209-245`): letters/digits only; skips keywords ending in punctuation (6) and normalised keywords shorter than 6 (204), leaving 1,799; allows a trailing `s`/`es`; word-boundary enforced; exceptions re-applied.
  4. Context pass: a flavour + a product form within 3 tokens (`:120-174`).
- WEB: `assets/js/gopher-request-logic.js:143-147, 177-191, 204-229, 231-281, 353-391`: the same four passes, same constants.
- SERVER: not involved.
- VERDICT: SAME. Executed: **0 verdict/term/offset differences on 18,410 inputs**, including:
  - every keyword × 7 shapes;
  - flavour × form combinations;
  - the ruled cases: "wine fridge" → null; "wine glasses and a bottle of wine" → the second "wine"; "1792 Main St" → null; "leave it on the porch" → null; "weed the beds" → "weed" (cut declined); "grizly wintergreen pouches" → "wintergreen pouches"; curly "Tito’s" → match.
- CONFIDENCE: high.

### AGE-3: Which categories scan, and which box (D1)
- APP: `yardFlow/YardStepNav.js:60-68` `checkFor`: `ageKeywordCheck(flow, s, values)` comes first, for every flow. All 8 flow JSONs mount `yardStepNav`/`stepNav`. `stepFlow/ageKeywordCheck.js:65-66, 135-140`: the field is `flow.ageScanField || "description"`; only on `FIRST_STEP`. `flows/ride.js:325`: `ageScanField: "special_instructions"`.
- WEB: `GR:18067-18090`: *"ALL categories — compliance"* on `state.step === 2`. `GR:13474-13478` `ageScanField()`: ride reads `specialInstructions`, everyone else `description`.
- SERVER: not involved.
- VERDICT: SAME (D1 as ruled, built on both).
- CONFIDENCE: high.

### AGE-4: Does the scan re-run before Review / submit?
- APP: `YardStepNav.js:93-110` `goToReview`: before pricing it re-runs `firstProblemStep` and **every step's checks** (`for s = FIRST_STEP..LAST_INPUT_STEP: checkFor(s, values)`). It is reached from Continue on Step 5 and from the progress bar's Review segment (`:163-170`, `YardStepHeader.js:166`). Request Again opens the flow at Step 2 (`helpers/requestAgain.js:94-106`; no `yard_step` set).
- WEB: the scan runs only in the `$btnNext` handler with `state.step === 2` (`GR:18074`).
  - The step tabs allow any jump up to `maxStepReached` with no gate (`GR:14916-14927`).
  - Step 6 submit evaluates only step-6 gates (`gopher-step-gates.js:404` `guardsStep(g, state.step)`).
  - Request Again Fast lands on step 6 and Request NOW submits at once, with the history description and no scan (`GR:18359-18392, 18407-18413`).
- SERVER: does not scan descriptions (AGE-1).
- VERDICT: DIVERGES
- IF DIVERGES: on the web, an edit made after Step 2 has been passed can skip the scan. Input:
  - Web: a Delivery "groceries", carried through to Review; tap the Step-2 tab and change it to "groceries and a 12 pack of beer"; tap the Step-6 tab; Submit. **No age sheet, no under-21 block** (editing re-armed `ageKeywordAck`, `GR:17444`, but nothing re-asks).
  - App: the same edit, then the Review segment or Continue, opens the age sheet (or, under 21, the block).
- CONFIDENCE: high on code. Not driven in a browser.

### AGE-5: Who counts as under 21: the unknown-DOB case
- APP: `ageKeywordCheck.js:70-77` `canRequestRestricted()` reads `localStorage.items.can_request_restricted_items`. That comes from `users/profile/:id` (`component/bottomRoutes.js:183-185`).
- WEB: `GR:15205-15222, 15240-15244` `canSeeAgeRestricted()`: `customerAgeYears() >= 21`. An unknown DOB returns `null` and is **not eligible** (`GR:15236`).
- SERVER: `controllers/user/profile.js:163, 276`: `getAge(user.date_of_birth)`; `can_request_restricted_items: +user_age >= 21 || false`. `helpers/functions.js:50-63` `getAge`. **Executed: `getAge(null)` = 56, so the flag is `true`.** `getAge(undefined/'')` = NaN, so `false`. Order create uses the fail-closed `signup_age_policy.age_from_dob` (`create.js:504-520`, comment *"getAge(null) is 56"*).
- VERDICT: DIVERGES
- IF DIVERGES: an account whose `date_of_birth` is null types "a 12 pack of beer".
  - App: treated as 21+. The Delivery A/R switch is visible and "This looks age-restricted" appears; "Yes" then gets 403 "Unauthorized." from create.
  - Web: treated as under 21; the neutral block.
- CONFIDENCE: medium. The flag computation was executed. Not checked: whether such accounts store `null` rather than another value, and the login-response path (`actions/action.js:427`), which also writes `items`.

### AGE-6: Under-21 block
- APP: `ageKeywordCheck.js:49-51, 149-166`:
  - Title "One thing to change"; *"This request includes an item we can’t deliver for you. Please edit your request to continue."*; one button, "Edit my request".
  - No answer is stored, so it blocks every attempt. `select: field`: closing (button, ✕ or swipe) selects the tripping word (`YardStepNav.js:86-91, 292-295`; `ageKeywordCheck.js:267-289`).
  - It is checked **before** the "already A/R" skip.
- WEB: `GR:18081-18084` with `G40_REQ.ageRestrictedNotEligible()` (`GR:18237-18242`): same title, sentence and button; no ack set. `selectAgeTermOnClose` (`GR:13479-13490`) selects the word on the button or a tap outside. The under-21 check sits **inside** `!(delivery && ageRestricted)`, but `GR:17227` clears `ageRestricted` for anyone who cannot see A/R, so no input reaches that difference.
- SERVER: `create.js:520-531` is the backstop for posted orders (AGE-15).
- VERDICT: SAME
- CONFIDENCE: high.

### AGE-7: 21+ first sheet "This looks age-restricted"
- APP: `ageKeywordCheck.js:167-196`. Skipped if `has_age_restriction` (Delivery's or Custom Task's switch) or the ack equals this wording. The body (*"Your request mentions “{term}”, which is commonly an age-restricted item…"*), the non-refundable note, "Yes — this IS an age-restricted request" and "No — this is NOT age-restricted" (outlined).
- WEB: `GR:18074` skip condition is `ageKeywordAck || (delivery && ageRestricted)`. Overlay `GR:20750-20770`: same title, body, note and buttons (texts compared). The web overlay has no dismiss; the app sheet can be closed by ✕, which leaves the request unanswered on Step 2, so the outcome is the same.
- SERVER: not involved.
- VERDICT: SAME. The only extra skip on the app is Custom Task's switch, which the web lacks (CT-1).
- CONFIDENCE: high.

### AGE-8: When an answered prompt re-arms
- APP: the answer is stored **per wording**: `AGE_KEYWORD_ACK` = the trimmed text (`ageKeywordCheck.js:53-55, 167, 233`). Any change to the text re-asks; identical text does not. Flags are dropped at submit unless the ack still equals a box (`helpers/ageKeywordDeclined.js:29-33`).
- WEB: **every `input` event** on the description (or Ride's instructions) resets `ageKeywordAck`, `idRequiredAtCompletion`, `ageKeywordDeclined` and `ageKeyword` (`GR:17431, 17444-17447`).
- SERVER: not involved.
- VERDICT: DIVERGES (edge, low impact)
- IF DIVERGES: answer "No" → "Submit as-is" for "beer run", go back, type a space and delete it, then Continue. Web: asked again and the flags were cleared. App: not asked; the flags stand.
- CONFIDENCE: high.

### AGE-9: "Yes"
- APP: `ageKeywordCheck.js:103-132`. On Delivery: set A/R + purchase + the A/R sub-type/title + ack; stay on Step 2. Elsewhere: `moveTo` Delivery Step 2 (`YardStepNav.js:232-258`), replacing the screen and dropping the source draft. Ride's special instructions become the description.
- WEB: `GR:18478-18504`: `switchCategory('delivery')` (no-op if already Delivery); from Ride, description = special instructions; `ageRestricted=true`; `itemsPurchased=true`; ack; `render()` stays on Step 2.
- SERVER: not involved.
- VERDICT: SAME, except that the web keeps addresses (ROUTE-3) and the GO-To handling differs (AGE-12).
- CONFIDENCE: high.

### AGE-10: "No" → "You'll need your ID for this one" (D6); Submit-as-is flags
- APP: "No" sets `dl_age_keyword_no` and re-checks, which returns `idWarningSheet` (`ageKeywordCheck.js:168, 184-193, 207-242`).
  - "Edit my request" clears it, goes to Step 2 and selects the word.
  - "Submit as-is" sets the ack + `age_keyword_declined: true` + `age_keyword: term`.
  - Sent only when true, never on an A/R order, word trimmed to ≤ 100 (`helpers/ageKeywordDeclined.js:25-40`).
- WEB: "No" re-scans and opens `#ageIdWarnOverlay` (`GR:18508-18521`; markup `GR:20777-20788`, same words). Edit selects the word and acknowledges nothing (`GR:18527-18535`). Submit-as-is sets `ageKeywordAck`, `idRequiredAtCompletion`, `ageKeywordDeclined`, and `ageKeyword` (trimmed, sliced to 100) (`GR:18540-18550`). The record carries them only when not A/R (`GR:14481-14484`).
- SERVER: `helpers/age_keyword_flag.js:34-43`: never on an A/R order, word trimmed to ≤ 100. `:51-60`: an update changes the flag only when the body names it.
- VERDICT: SAME
- ⚠ Web-side ordering: "Submit as-is" calls `advanceFromJobDetails()` (`GR:18467-18471`) directly, so the rest of the Step-2 Continue checks (the phone gate, `GR:18096-18099`) **never run** for that click. See PHONE-1.
- CONFIDENCE: high.

### AGE-11: Review's "What to expect" ID line
- APP: not found by these searches: `front of a valid ID|picture of the front` in `src/` (excluding vendor and tests). `age_keyword_declined` has no display reader (only `ageKeywordCheck.js`, `ageKeywordDeclined.js`, `services/goToBody.js:73`). `yardFlow/YardReviewExtras.js` "What to expect" has no age reference.
- WEB: `GR:16724`: *"This request requires a picture of the front of a valid ID before items can be exchanged."* when `ageRestricted || idRequiredAtCompletion`.
- SERVER: not involved.
- VERDICT: WEB-ONLY. The D6 ruling (inherited) says the Request app should "show the website's line".
- IF DIVERGES: a 21+ request "beer run" → No → Submit as-is → Review. The web shows the ID line; the app does not.
- CONFIDENCE: medium. String and data search only; not run on a device.

### AGE-12: GO-To set-up: scan and A/R gating
- APP: a GO-To is set up inside the step flow, so the same `YardStepNav` checks run: the under-21 block and the 21+ sheet. "Yes" in a GO-To shows a toast and does not move: *"A GO-To can’t move to Delivery…"* (`YardStepNav.js:232-238`). The Delivery A/R switch keeps its `profileFlag`.
- WEB: "Create a GO-To" opens a separate editor, `openGoToEditor` (`GR:28926-28937, 29078+`):
  - free-text "Description" (`GR:29211-29214`);
  - a toggle *"My order includes age-restricted items"* rendered with **no `canSeeAgeRestricted` gate** (`GR:29220-29223`);
  - not found by these searches: any age-keyword call in it. `findAgeRestricted*` is called only at `GR:13460-13461, 13485, 17457, 18076, 18104, 18510, 18531, 18542`.
- SERVER: `create.js:520-531` applies when the GO-To is sent (app only today).
- VERDICT: DIVERGES
- IF DIVERGES: an under-21 creates a GO-To with "Pick up cigarettes". App: blocked at Step 2 and the A/R switch is hidden. Web: saved with no prompt, and the A/R toggle is offered.
- CONFIDENCE: medium. Read, not driven. Not checked: whether a saved web GO-To later passes through the Step-2 scan when it is sent.

### AGE-13: Delivery A/R switch is 21+ only
- APP: `json/requester/deliveryflow.json:125-128` `has_age_restriction` with `"profileFlag": "can_request_restricted_items"`. `CustomTaskDetails.js:230-235` hides it otherwise. Turning it on also turns the purchase on (`onSet`).
- WEB: `GR:15775`: `${canSeeAgeRestricted() ? … data-toggle="ageRestricted"`. `GR:17227` clears it for ineligible users.
- SERVER: `profile.js:276` (the app's flag).
- VERDICT: SAME. The only difference is unknown DOB (AGE-5); Custom Task is APP-ONLY (CT-2); the web GO-To editor is ungated (AGE-12).
- CONFIDENCE: high.

### AGE-14: TrustShield interplay
- APP: `ageKeywordCheck.js` reads no TrustShield state. `deliveryflow.json:141-143`: a `trustShield` row shows while `has_age_restriction` is on. There is no identity gate in Delivery's `stepProblem` (`flows/delivery.js:154-183`).
- WEB: the backstop (`GR:18074-18090`) reads no TrustShield state. With A/R on, Delivery shows `.ar-banner` + `ageRestrictedBannerControl()` + `tsPromoMarkup()` (`GR:15790-15799`). The `identity` gate is not in the Request enable list (`assets/js/gopher-step-gates.js:297-299`).
- SERVER: `create.js:533-547` `trust_shield_required(...)` (policy; not part of the scan). The $1 discount scope is D2 (fees area, not audited here).
- VERDICT: SAME
- CONFIDENCE: high for the scan. The TrustShield row and banner were compared by reading only.

### AGE-15: Server's own under-21 guard
- APP: posts `title` and `"age_restricted?"` (`orderObject.js:70-74`), so it reaches the guard.
- WEB: posts nothing (record is local: `GR:14470-14484`; the prior doc says `__createDashboardRequest` is local only). Inherited, consistent with the payload code read.
- SERVER: `create.js:520-531`. Under 21 or unknown age, plus a title in `AGE_RESTRICTED_KEYWORDS` (`constants/index.js:302-303`, a comma-joined string matched with `indexOf`) or `age_restricted? === 'true'`, gives 403 "Unauthorized." Twin in `update.js:911`.
- VERDICT: APP-ONLY (only app orders reach it today)
- CONFIDENCE: high.

## 5. Contact info in the description

### PHONE-1: Mask vs block, and the pattern (D10)
- APP: `component/discriptionElement.js:55-66`:
  - regex `/\b(?:\d[ -()]?){9}\d\b(?!\d)/g`;
  - the match is **replaced with `**********` as typed**, and an "Attention!" sheet opens (`:139-267`, with "Do not show me this again"); Continue is not blocked.
  - `[ -()]` is a range (space..`(`) plus `)`, so `-` and `.` are not separators.
- WEB: `GR:18096-18099`: on Step 2 Continue, `/(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/` tested against `state.description` **blocks** via `G40_REQ.phoneEntered()` (`GR:18250`, "Remove the phone number"). No ack.
- SERVER: not involved. `models/orders.model.js:14-16` stores `description` as `TEXT`; no phone filter found (`phone` near `description` in `controllers/order/`).
- VERDICT: DIVERGES. Owner ruled "mask as typed, with the web's wider pattern, both sides" (G40-626, inherited). **Neither side has changed** at these SHAs.
- IF DIVERGES (executed):

| Typed | App | Web |
|---|---|---|
| `9195551234`, `919 555 1234`, `+1 919 555 1234` | masks | blocks |
| `919-555-1234`, `(919) 555-1234`, `(919)555-1234`, `919.555.1234`, `1-919-555-1234`, `919 555-1234`, `919-5551234` | **no** | blocks |
| `order #12345678901`, `9195551234567`, `SKU 123-456-7890` | no | **blocks** (no leading `\b`: any 10+ digit run trips it) |
| `order 1234567890` | masks | blocks |

  - ⚠ Web bypasses of its own block:
    - "Submit as-is" on the ID sheet (AGE-10) advances without the phone gate. Input: a 21+ request "12 pack of beer, call me 919-555-1234" → No → Submit as-is → Step 3 with the number intact.
    - Request Again Fast/NOW skips Step 2 (AGE-4).
  - ⚠ The app masks only on a change event, so text prefilled from iQ (ROUTE-2) is not masked until edited.
- CONFIDENCE: high (executed).

### PHONE-2: Which boxes the phone rule covers
- APP: every `DescriptionField` masks. That is the description in all flows (`CustomTaskDetails.js:251-266`, `MovingDetails.js:76-83`) **and** Ride's special instructions (`CustomTaskDetails.js:323-335`, criterion `type: "text"`; `rideflow.json:123-124`).
- WEB: only `state.description` (`GR:18097`). Ride's `specialInstructions` is not tested, and Ride has no description (`GR:15010`).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: Need a Ride, special instructions "call me at 919 555 1234". App masks it. Web lets it through.
- CONFIDENCE: high.

## 6. Description length, required-ness, photos

### DESC-1: Description required (all categories except Ride)
- APP: each flow's Step-2 `stepProblem` returns "Please describe what you need.":
  - `flows/delivery.js:156-158`, `customTaskFlowSteps.js:137-139`, `movingFlowSteps.js:193`, `laborFlowSteps.js:194`, `yardFlowSteps.js:283`, `flows/junk.js:104`;
  - `flows/home.js:118-128` (the same, unless an older order's stored checklist is being edited);
  - Ride has none (`flows/ride.js:115-130`).
  - Re-validated for every step before Review (`YardStepNav.js:96-101`).
- WEB: `assets/js/gopher-step-gates.js:59-67` `description` gate, `isVisible('describe') && !description.trim()`; `describe` is hidden only for ride (`GR:15010`). Step-guarded: runs only while on step 2 (`:404`).
- SERVER: `validators/orders.validator.js:171-176` defines `description` notEmpty, but not found by these searches: any route using `orders.validator` / `order_update` (`routes/`). Not relied on.
- VERDICT: SAME on the Continue path. DIVERGES on edit + tab-jump.
- IF DIVERGES: web: reach Review, tap the Step-2 tab, clear the description, tap the Step-6 tab, Submit; it submits with an empty description. App: the Review segment sends the user back to Step 2 with "Please describe what you need."
- CONFIDENCE: high on code. The tab-jump was not driven in a browser.

### DESC-2: Length limit
- APP: `CustomTaskDetails.js:104-117` `DEFAULTS.maxChars: 300` (every `stepDetails`/`customTaskDetails` flow). `MovingDetails.js:82-83` `maxCharLimit={300}`. `discriptionElement.js:39-66`: over 300 it writes the truncated value, **then line 64-65 overwrites it with the full `e.target.value`**, and shows "Max charactors reached" (`:122-134`).
  - Executed: 301 chars leaves the formik value at 301, with the alert shown.
  - So the cap is **not enforced** (bug); only a red message appears.
  - Ride's special instructions have no cap.
- WEB: `GR:15749` `#descriptionInput` has no `maxlength` and no length check.
- SERVER: `models/orders.model.js:14-16` `description: Sequelize.TEXT`; no length validator found.
- VERDICT: DIVERGES (display only; neither side truncates)
- IF DIVERGES: a 301-character description. App: "Max charactors reached" shows and Continue proceeds with all 301. Web: no message.
- CONFIDENCE: high (executed). Needs a ruling: enforce 300 on both, or drop it.

### DESC-3: Ride special instructions
- APP: optional (`flows/ride.js:115-130` has no check), no cap, shown on review when typed (`:219-220`).
- WEB: optional (no gate in `gopher-step-gates.js`), no `maxlength` (`GR:15854-15856`).
- SERVER: `orders.model.js:17-19` `TEXT`.
- VERDICT: SAME
- CONFIDENCE: high.

### DESC-4: Photos
- APP:
  - "Add a pic (up to 3)" in every flow except Ride. `CustomTaskDetails.js:268-276`: `photos` defaults to true; `rideflow.json` has `photos: false`; `MovingDetails.js:93-99`.
  - Max 3: `imageuploadfororder.js:429, 468`, *"You may only upload up to three images."*
  - Optional: no `stepProblem` reads `attachment`.
  - Real camera/gallery, 10 MB limit (`helpers/CommonFunctions.js:14, 79-86`).
- WEB: `GR:15750-15767`: "Add a pic (up to 3)", `addPic` hidden only for ride (`GR:15011`); `GR:17385-17396` stops at 3. Optional (no gate). The picker is a **demo**: it attaches a random stock image (`PIC_OPTIONS`), not the user's file.
- SERVER: not compared (upload path).
- VERDICT: SAME for count, required-ness and categories. The web's picker is still a prototype stub, which is outside the decision logic.
- CONFIDENCE: high.

### DESC-5: Review's "brief description" advice (Second Set of Eyes)
- APP: `yardFlow/SecondSetOfEyes.js:41-43` `sseState`: brief when < 25 characters, all-clear when ≥ 25; **description length only**. Shown on every flow except Ride (`secondSetOfEyes` keys in `stepFlows.js`, `delivery.js:478`, `junk.js:281`, `home.js:285`; `ride.js:320-321` "Do NOT include").
- WEB: `GR:16630-16633`: `sseThin` < 25, **plus** `sseAgePurchaseMiss = delivery && ageRestricted && !itemsPurchased`. `sseAllClear` requires both to be false. Not on ride (`GR:16626`).
- SERVER: not involved.
- VERDICT: DIVERGES
- IF DIVERGES: a 21+ Delivery, A/R on, purchase turned off ("Continue without a purchase"), description "Pick up a 12 pack of Bud Light from the store" (≥ 25). Web: the card pulses as "Want a second set of eyes?". App: "Gopher iQ reviewed your request 👍" (all clear).
- CONFIDENCE: high (read). Not checked: the scenario bullet text in `reviewAdvice.js` against the web's `REVIEW_ADVICE`.

---

## Re-verification of the prior log (APP-DIVERGENCE-2026-10-13.md)
- **D1** holds and is built on both (AGE-3).
- **D5** holds: the app has no in-flow nudge (NUDGE-1).
- **D6** built on both: sheets, words and flags SAME (AGE-10). The app still lacks the "What to expect" ID line the ruling asked for (AGE-11).
- **D10** pattern table re-run and confirmed. Neither side has changed (PHONE-1).
- **CT finding** (app shows the Custom Task A/R switch to under-21) still true at `b47efe59f` (CT-2).
- **List count**: keywords are now 1657, not 1658.

## New findings this pass (not in the prior log)
AGE-4, AGE-5, AGE-8, AGE-11, AGE-12, ROUTE-2, ROUTE-3, PHONE-2, the web phone-gate bypass via Submit-as-is (PHONE-1), DESC-1's tab-jump path, the app's unenforced 300-character cap (DESC-2), and DESC-5.
