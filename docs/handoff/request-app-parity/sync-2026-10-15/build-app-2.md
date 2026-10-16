# Request app: build B1 to B4 (local commits only)

Worktree: `scratchpad/sync/app-work2`. Every branch was cut from `origin/production` = `b47efe59f` (re-fetched first; it had not moved). Each branch holds one commit.

Nothing was pushed. No MR was opened, nothing was merged, and nothing was built or installed on a device.

I removed upstream tracking from all four branches. `git switch -c … origin/production` had set `origin/production` as their upstream, so a bare `git push` could have aimed at production. The worktree is back to detached `origin/production` and is clean.

Baseline on `b47efe59f` before any change: 203 suites, 3381 tests passed, 5 skipped.

Each branch was gated with:
- `npx jest --config jest.services.config.json` (that is `npm run test:services`)
- `npx eslint ./src/ --max-warnings=0`
- `npx prettier . --check`
- all 28 `node scripts/…` guards listed in `.gitlab-ci.yml`

The gate script is `scratchpad/sync/gates/run-gates.sh`. Per-branch output is in `gates/B1.txt` to `gates/B4.txt`.

| Item | Branch | Commit | Tests (suites / passed) | eslint | prettier | guards |
|---|---|---|---|---|---|---|
| B1 | `fix/request-input-caps` | `c57dbb44e` | 204 / 3412 | pass | pass | 28/28 |
| B2 | `fix/description-300-cap` | `def65aadd` | 204 / 3388 | pass | pass | 28/28 |
| B3 | `fix/dispute-reason-min-length` | `d06807776` | 205 / 3391 | pass | pass | 28/28 |
| B4 | `fix/scheduled-card-state` | `c7fb00df9` | 203 / 3385 | pass | pass | 28/28 |

**Sheets and modals touched: none, on all four branches.** No sheet was created, changed or restyled. B3's check sits inline on the dispute form. It uses the existing G40-592 `attention.js` `pulse` plus an inline `role="alert"` line, and adds no modal.

---

## B1: web caps on crew, hours, riders, stairs (`fix/request-input-caps`, `c57dbb44e`)

**Ranges (owner ruling 10/15, "The web's caps on both"):**
- Workers: 2–20, when "More than 1 worker needed" is on.
- Hours, paying by the hour: 1–24.
- Riders: 1–6.
- Flights of stairs: 0–10 for each counter.

**Verified first-hand:** the web's counter handler uses `Math.min(20|24|10, …)`, and the "# of riders" select offers `'1'…'6'`. Checked in `sync/web/gopher-request.html` at 9e29366 and in the Code repo's `Final/gopher-request.html`.

**Every live control is a stepper.** There is no typed field for these four values on any live path:
- New requests open the step-by-step flows. `request.json` and `service.json` route to `movingflow`, `laborflow`, `junkflow`, `rideflow` and `yardflow`.
- Edit, Update Payment Info, Request Again and GO-To all use `flowForOrder` first. For Moving, Junk, Labor, Ride and Yard that matches on category alone.
- The old tile forms have typed counters (`counterbox.js` `IncDecCounter`, used by `hourly.json`, `needaride.json`, `locationmove.json`, `othermoving.json`, `samelocationmove.json`, `storepickupdelivery.json`, `junkremoval.json`). They are no longer reachable for these categories, so I left them alone.

**What changed:**
- **The steppers stop at the cap** (`+` is disabled there):
  - the crew card (`MovingCrewCard`), which Moving, Junk, Yard and Labor all draw;
  - Labor's "# of hours needed": `laborflow.json` now has `"max": 24`, and `StepCounterField` accepts `max`;
  - each stairs counter (`MovingStairs`), for Moving pick-up, Moving destination and Labor;
  - the Ride rider counter: `rideflow.json` now has `"max": 6`.
- **Every write path caps the value too**, so nothing above a cap can be priced or sent:
  - values before pricing in Moving, Yard, Junk, Labor and Ride. This also covers GO-To saves, which go through `goToReview` → `valuesBeforePricing`;
  - the re-open fields used by Edit, Update Payment Info and Request Again;
  - the legacy-Yard GO-To prefill (`goToBody.js prefillFromOrderView`);
  - Labor's pay figures (`crewSize`, `hoursOf`, `stairsOf`), so the pay step's totals use the capped numbers;
  - the review rows;
  - Ride's `ridersOf`, which caps exactly as `bagsOf` already does.
- **Values held from before the cap** (an old order or draft) now show, price and send the cap. A stored crew of 400 shows 20, and `−` takes it to 19.
- **Two-address moves:** re-opening one whose stored stairs total is over 10 puts the remainder on the pick-up counter. A stored total of up to 20 is still sent unchanged. A one-address move has a single counter, so it comes back at no more than 10.
- **New shared module `yardFlow/countLimits.js`** (no imports). The category files get the caps through `stepFactories.js`, the only kit file they are allowed to import.
- **`renderForm.js`** now passes `max` through its props allowlist. Only `no_of_hours` sets it.
- **`CustomTaskDetails` counters** with a `max` and no `overflowTo` (Ride riders and bags) never show more than the max. Junk's items counter, which overflows into "Multiple", is unchanged.

**Files:**
- `src/component/yardFlow/countLimits.js` (new)
- `stepFactories.js`
- `MovingCrewCard.js`
- `MovingStairs.js`
- `StepCounterField.js`
- `CustomTaskDetails.js`
- `movingFlowSteps.js`
- `yardFlowSteps.js`
- `laborFlowSteps.js`
- `src/component/stepFlow/flows/junk.js`
- `src/component/stepFlow/flows/ride.js`
- `src/json/requester/laborflow.json`
- `src/json/requester/rideflow.json`
- `src/pages/renderForm.js`
- `src/services/goToBody.js`
- test: `src/component/yardFlow/countLimits.test.js` (new)

**Tests:** `countLimits.test.js` has 31 tests.
- They tap the real controls past each cap: the crew card, the Labor hours counter mounted from `laborflow.json`, both stairs counters, and the Ride rider counter mounted from `rideflow.json`.
- They also run the real write paths with values above the caps: values before pricing, review rows, re-open fields, Labor pay, and the GO-To prefill.
- 10 of them fail when the control changes are reverted.

**Server:** it does not bound `gopher_needed`, `noof_hour`, `noof_rider` or `total_stair_flight`. This is inherited from audit B; I did not re-check it. The caps exist on the client only.

## B2: the description's 300 cap is real (`fix/description-300-cap`, `def65aadd`)

**The bug, confirmed in `discriptionElement.js`:** the cap branch wrote the cut value. Then the phone-number check below it wrote the full `e.target.value` over it.

**What changed:**
- Each change now writes exactly one value. The phone number is masked first, then the text is cut to `maxCharLimit`. Masking first means a number that crosses the 300 mark is never left partly visible.
- The textarea now carries `maxLength` when the cap is on:
  - typing stops at 300;
  - a paste is cut to the room left;
  - the JS cut stays as a backstop for keyboards that get past `maxLength`.
- "Max charactors reached" is kept, typo included. It now shows once the box is full (300) and clears below 300. It cannot wait for character 301 any more, because the box can no longer reach 301.
- **There is no character counter anywhere in the app**, so there was no counter to keep. The message is the only indicator.
- Fields without `isMaxCharValidation` are unchanged.

**Where it applies:**
- every step-by-step flow's "Describe what you need" (kit `StepDetails`, `maxChars` 300);
- Moving's details (`MovingDetails`, 300);
- the old tiles that set `isMaxCharValidation`.

Ride's special instructions stay uncapped (DESC-3).

**Files:** `src/component/discriptionElement.js`, plus the new test `src/component/discriptionElement.cap.test.js`.

**Tests:** 7 tests.
- They mount the real field and the kit's `StepDetails`.
- They type 301 characters, paste 500, check `maxLength`, check when the message shows, check the phone mask (applied before the cut), and check that an uncapped field is unchanged.
- 6 of them fail on the old element.

## B3: dispute reason minimum (`fix/dispute-reason-min-length`, `d06807776`)

**The server's exact rule**, read at `sync/server` 7e571e9f (= its `origin/production`), in `controllers/order/report_dispute.js` `dispute_order`:
- `MIN_DISPUTE_REASON = 10`
- `String(dispute_reason || '').trim().length < 10` returns a 400 with: *"Please tell us what went wrong before opening a dispute. Your Gopher only sees what you write here, so a short sentence about the problem is enough — for example what was missing, wrong or damaged."*

**What changed:**
- `live/dispute.js` now carries:
  - `MIN_DISPUTE_REASON`;
  - `DISPUTE_REASON_REQUIRED`, which matches the server's sentence byte for byte (checked with node against the server source);
  - `disputeReasonProblem(text)`.
- `DisputeForm` applies the rule to the exact string it sends (chip plus details, `disputeText`). This is the only live dispute path: `/startDispute` → `Orderdispute`.
- When the reason is too short:
  - nothing is posted;
  - the Details box pulses and takes focus (the existing G40-592 `pulse`);
  - the server's sentence shows under it, in brand red with `role="alert"`, the same pattern as GoToReviewSheet's inline problem line.
- The sentence disappears as soon as the reason is long enough.
- Submit is **not** disabled, so the requester is told why it did not go.

**Which chips fail on their own:**
- Fail: "Late" (4), "Damage" (6), "Other" (5).
- Pass: "Not finished" (12), "Missing or wrong items" (22). These were already accepted by the server and are sent as before.

**Files:**
- `src/component/live/dispute.js`
- `src/component/live/DisputeViews.js`
- new tests: `src/component/live/disputeReason.test.js` (9) and `src/component/Orderdispute.reason.test.js` (1)

**Tests:**
- The rule is tested against the server's own refused and accepted test cases, and against every chip on its own.
- The real form is tapped.
- The real dispute screen posts nothing for "Late", then posts `"Late: arrived two hours late"`.
- 4 of these fail when the form change is reverted.

## B4: booked scheduled card and step bar (`fix/scheduled-card-state`, `c7fb00df9`)

**Verified first-hand in the server:** a scheduled request's hire sets `aasm_state: 'scheduled'` together with `gopher_id`. This happens in `controllers/order/update.js` (the "Check if scheduled, Assign to gopher" block, ~5190–5212) and in `order_bids.js` ~880. GET `/orders/v3` selects every column, so `gopher_id` reaches the home list.

**(a) Home card (`homeCards.js`):**
- **The bug:** `isScheduledList` covered both `pending` and `scheduled`, and it ran before the "with {name}" branch.
- **The fix:** a new `isScheduledBooked` check covers `request_schedule_later` together with either `accepted`, or `scheduled` with a `gopher_id`.
- A booked card now reads **"SCHEDULED · {when} · with {name}"**. These are the words the existing accepted + scheduled card already uses. No new wording was added and no other state changed.
- A `scheduled` row with no `gopher_id` has no worker to name, so it keeps "waiting for a worker". That keeps the existing test valid.

**(b) Step bar (`live/liveStatus.js` `liveSteps`):**
- `scheduled` now takes the same position as `accepted`: Accepted is done and In progress is next.
- This matches the band above it, which already says "{name} accepted your scheduled request".
- `ORDER_STATE` itself is unchanged.

**Files:**
- `src/component/home/homeCards.js`
- `src/component/live/liveStatus.js`
- extended tests: `homeCards.g40549.test.js` (+3) and `live.g40549.test.js` (+1)

**Tests:** 3 of the new tests fail on the old code.

---

## Questions for the owner (built what was unambiguous; nothing guessed)

- **None of the four items is blocked.**
- **B1, legacy tile forms:** the typed counters in the old tile forms were not touched, because no live path reaches them for these categories. If any route back to those forms comes back, they would need `"max"` support in `counterbox.js`. Today that component caps every counter at 100 and lets a typed field hold any value.
- **B2, message timing:** "Max charactors reached" now appears at exactly 300 instead of on an attempted 301st character. This is wording-neutral but a timing change. The typo is still in the copy, untouched; correcting it is the owner's call.

## Found in passing (not built; outside these items)

1. **The description phone mask misses dashed numbers.** The regex `/\b(?:\d[ -()]?){9}\d\b(?!\d)/g` in `discriptionElement.js` has the class `[ -()]`, which is the range space to `(` plus `)`. It does not include `-`, so "919-555-1234" is not masked. "919 555 1234" and "9195551234" are masked.
2. **`orderConfirmation.js` posts `raise_dispute` with an empty body,** so the server would refuse it. Audit E says that screen is unreachable. This is inherited; I did not re-verify reachability.
3. **Web parity for B3:** the web opens a dispute with an empty reason (audit E-38). That is the web's side and outside this app worktree.

---

## B2 amendment: "300 on every category" and the message spelling (owner, 10/15)

**Branch `fix/description-300-cap`, new commit `2df9c1182`.** It sits on top of `def65aadd`, which was not rewritten.

**Branch heads:**
- `fix/description-300-cap`: `def65aadd` → `2df9c1182`
- `fix/request-input-caps`: `c57dbb44e`, untouched
- `fix/dispute-reason-min-length`: `d06807776`, untouched
- `fix/scheduled-card-state`: `c7fb00df9`, untouched

None of the branches has an upstream. Nothing was pushed. The worktree is back to detached `origin/production` and clean.

### What I found first

Every current step flow already had the 300 limit configured. On production that limit did nothing anywhere, because of the overwrite bug. `def65aadd` made it work. So after `def65aadd`, every flow's description was already capped at 300.

How each flow gets the limit:
- **Six flows draw their description through the kit's `StepDetails`** (`CustomTaskDetails`):
  - Delivery `dl_details`
  - Yard `yd_details`
  - Junk `jr_details`
  - Labor `lb_details`
  - Home Services `hs_details`
  - Custom Task `ct_details`

  `StepDetails` always passes `isMaxCharValidation` with `maxCharLimit={opt.maxChars}`, and the default is 300. No flow JSON sets `maxChars`, and `undefined` options don't replace the default. So all six get 300.
- **Moving** draws its own card (`MovingDetails`) and passes 300 itself.
- **The 21 old tile forms that still have a description field** each set `isMaxCharValidation` and `maxCharLimit` 300 in their JSON.

So no category lacked the limit. Production's problem was that the limit never actually worked on any of them.

### What changed

- **One shared number:** `DESCRIPTION_MAX_CHARS = 300`, exported from `discriptionElement.js`. Both components that draw step-flow descriptions now use it:
  - `CustomTaskDetails` (`DEFAULTS.maxChars`)
  - `MovingDetails` (`maxCharLimit`)

  The value is the same as before, so Moving and Custom Task behave exactly as they did.
- **Message spelling:** "Max charactors reached" is now **"Max characters reached"** (`MAX_CHARS_MESSAGE`).

**Files:**
- `src/component/discriptionElement.js`
- `src/component/yardFlow/CustomTaskDetails.js`
- `src/component/yardFlow/MovingDetails.js`
- `src/component/discriptionElement.cap.test.js`

**Sheets and modals touched:** none.

### Need a Ride: left alone

The app does not treat Ride's special instructions as the description:
- `rideflow.json` sets `"describe": false`.
- `ride.js` says "No description, no photos" (NR-03) and sends `special_instructions`, never `description`.
- The review shows that box as "Special instructions".

The box stays uncapped (DESC-3). One caveat for the owner: the app does use this box *in place of* the description in two places:
- the iQ idea guidance (`iqIdeas.js`, "Need a Ride has no description box: its line goes in 'Special instructions for driver'");
- the age-keyword scan (`ageScanField: "special_instructions"`, G40-623).

Whether the 300 rule should also cover it is an **owner question**. I did not guess.

### Not changed: the same misspelling elsewhere

"Max charactors reached" also appears on three other boxes. They are the 150-character comment boxes for cost adjustments and counter-offers, not the description's message:
- `src/component/ordercard.js` ~7218
- `src/component/layoutComponent/RequestDetailPullOver.js` ~5849
- `src/component/layoutComponent/RequestDetailPullOver.js` ~7722

If G40-615 covers those as well, they are a one-word change each. I left them out because the instruction was limited to "that same message".

### Tests

`discriptionElement.cap.test.js` gains 10 tests, for 17 in all:
- the constant is 300 and the message is spelled correctly;
- the rendered message contains no "charactors";
- each of the six kit flows, mounted from its own JSON entry with the props `renderForm` passes, types 301 and ends with 300 plus the message; each test also checks that the flow sets no `maxChars` of its own;
- Moving's card gets the same check;
- Ride has no description box, and its special instructions are left uncapped.

When run against production's `discriptionElement.js` (with only the two new exports added), 9 of the new tests fail.

### Gates (output in `gates/B2-amend.txt` and `gates/B2-amend-jest.txt`)

| Gate | Result |
|---|---|
| jest (`jest.services.config.json`) | 204 suites / 3398 passed, 5 skipped |
| eslint `--max-warnings=0` | pass |
| prettier `--check` | pass |
| CI guards | 28/28 pass |

The first full jest run on this commit hung for about 10 minutes. All its workers were idle, at the same time the sibling agent's runs were sharing the machine. I stopped it and ran again, and the clean run passed in its normal time. I don't know what caused the hang. The new suite on its own runs in about 1 s.

---

## Two more owner rulings (10/15), each on its own branch from the new `origin/production` = `9ba8ef5e4`

I re-fetched `origin/production`. It has moved to `9ba8ef5e4`, which includes G40-604 phase 2 (the button kit) and PL-320.

**State of all six branches:**
- Both new branches are cut from `9ba8ef5e4`.
- None of the six branches has an upstream.
- Nothing has been pushed.
- The worktree is back to detached `origin/production` and clean.

**The four earlier branches** (B1, B2, B3, B4) are still based on the old `b47efe59f`. A `git merge-tree` dry run shows each of them **merges cleanly onto `9ba8ef5e4`**. I did not rebase them.

**Baseline on `9ba8ef5e4`:** 205 test suites. Each new branch adds one test file.

| Ruling | Branch | Commit | Tests (suites / passed) | eslint | prettier | guards |
|---|---|---|---|---|---|---|
| "Carry words + photos, not addresses" | `fix/category-switch-carries-words-photos` | `0fb46c119` | 206 / 3416 | pass | pass | 28/28 |
| "Web keeps its grid; app adopts it" | `fix/exact-time-slot-grid` | `6dc6cf553` | 206 / 3410 | pass | pass | 28/28 |

Gate output is in `gates/S1.txt`, `gates/S1-jest.txt`, `gates/S2.txt` and `gates/S2-jest.txt`.

On the first branch, eslint flagged two conditional `expect` calls in a test after the full jest run. I fixed them (test only), and that suite was re-run and passed (87/87).

### 1. Category switch carries words + photos, not addresses (`0fb46c119`)

**One shared helper: `src/component/stepFlow/categorySwitch.js`.**
- `carryOf(values, from)` takes the request's words and photos from the flow being left:
  - the words come from that flow's own box: the description, or for a ride its `special_instructions` (`flow.ageScanField`);
  - the photos are `attachment` plus `attachments`.
- `carriedValues(carry, to)` builds the target flow's Step 2 values: `yard_step: 2`, the words in the target's box, and the photos.
- `categorySwitchValues(values, from, to)` combines the two.
- `leaveToFlow(…)` does the leave-and-reopen.
- `switchCategory(navigate, {from, to, values})` is the call **G40-624's nudge Switch** should make.

**Addresses never carry.** Every other answer starts fresh in the new flow: counts, crew, pay, timing, the age switch, the worker choice.

**Plain switch.** In the app, a mid-flow category change goes through home:
- "Change ›", progress segment 1 and Back from Step 2 now leave for home *with* the carry (`stepFlows.js leaveFlow`).
- The category tapped next on home opens with it (`homeNav.js openCategory`, `HomeScreen.js`). This also covers Custom Task's "Before you continue" sheet.
- Before this, the new category always started empty.
- Rules I chose:
  - Tapping the same category is not a switch. It opens as before and offers its own saved request back.
  - Typed iQ words or a tapped example start a new request.
  - An order being edited carries nothing.
  - The old category's saved request is kept.

**Age "Yes" move (G40-623).** `deliveryCarryValues` now builds on the shared helper, and YardStepNav leaves through `leaveToFlow`. The behaviour is the same as before: the old flow's draft is discarded, and the navigation uses `replace` and `remount`.

**Need a Ride.** Its registry entry now says `photos: false` (documented in `FLOW_FIELDS`), matching NR-03 "no photos". A switch neither takes photos from a ride nor gives photos to one.
- This changes one existing age-move test: a ride's age move no longer carries photos. A ride cannot hold photos, so the test fixture's photos were artificial.

**Photo picker fix (`imageuploadfororder.js`).**
- The picker only showed `attachments` (uploaded URLs) plus photos added in this visit. It now also starts with any photo files the form already holds.
- Without this, a carried photo was sent with the request but not shown, and the next photo the requester added replaced it.
- **The same was true of the age move's carried photos.** I found this by reading the code and confirmed it in a mount test. It has not been checked on a device.

**Button kit:** no buttons were added or changed. **Sheets touched:** none.

**Tests:**
- `stepFlow/categorySwitch.test.js` (16 tests):
  - the rule itself;
  - the real step header answering Change ›: it goes home with the carry and no addresses, and keeps the old draft;
  - an edit carries nothing, and an empty form carries nothing;
  - `openCategory` for another category, for Ride, for the same category, and for typed words, an example, or no switch;
  - the real Junk Step 2 showing the carried words and both photos, and holding nothing else;
  - `switchCategory` for the nudge.
- `home/HomeScreen.g40549.test.js` (+2): the real home tile after Change ›.
- 5 of these fail with the wiring reverted.

**Points for the owner / coordinator:**
- **Drafts:** a carried open skips the target category's "Pick up where you left off" offer. Once something worth keeping is typed, it then saves over that category's draft. The age move already does this, and the memory note "a Delivery walk REPLACES the phone's Delivery draft" records it.
- **G40-624:** the nudge worktree should call `switchCategory` from `stepFlow/categorySwitch.js` once this branch lands, or rebase onto it.
- **Web parity:** the web's `switchCategory` (at 9e29366) still keeps addresses and special instructions (`CATEGORY_SCOPED_KEYS` comment, "Deliberately NOT reset … addresses, specialInstructions"). The ruling says web and app alike, so the web needs its own change.

### 2. Exact-time slot grid, no default (`6dc6cf553`)

All changes are in the existing picker, `datetimepicker.js`, using two opt-in props. No new component. Only the review's "Pick exact time" uses the props (`YardReviewExtras.js`).

**`slots`:**
- Offers 30-minute slots from 6:00 AM to 9:00 PM (31 slots: 6:00, 6:30 … 8:30, 9:00 PM). This is the web's `TIME_SLOTS`.
- Uses `timeIntervals` 30 and a `filterTime` that combines the existing "more than an hour from now" rule with the grid.
- Times outside the window or the grid are hidden, not greyed (`datetimeselector.css` `.gp-slot-grid`). So today only offers slots more than an hour out.
- The date range is unchanged: `minDate` is now + 1 h and `maxDate` is now + 14 days.

**`noDefault`:**
- Nothing is written until a slot is picked. `request_schedule_time` stays 0 (empty), which is what the other timings leave.
- A day tapped first is treated as a date, not a time, so the field stays empty until a slot is tapped. react-datepicker reports a day as onChange followed by onSelect, and a time as onChange alone, which is how the two are told apart.
- A later day keeps the time already picked.
- An earlier pick still more than an hour away is kept as it is, even if it is off the grid, because it was the requester's own choice. A passed pick is dropped.

**Done button:**
- Done is the kit's `PrimaryPill` (G40-604) and is disabled while "Pick exact time" has no time.
- It sits in the kit's `SheetStack`, with the web's own line "Select a time above to continue." above it.
- ✕ or a swipe still shows the existing toast "Please pick a date and time.".
- Flexible windows are unchanged.

**Sheets touched:** the review's "Schedule for later" sheet (`PullOverModal`, already on the G40-595 kit). Its bar is now `SheetStack` holding the hint line and `PrimaryPill` Done.

**Tests:** `src/component/datetimepicker.slots.test.js` (12 tests), with the clock fixed by a Date subclass because Jest 27 cannot fake Date alone.
- the grid itself;
- the real picker:
  - opens empty;
  - at 10:10 AM, offers today only 11:30 AM to 9:00 PM;
  - offers a later day the whole grid;
  - treats a tapped day as not a time;
  - accepts a slot picked first, or after a day;
  - keeps or drops an existing pick as described above;
  - keeps the date range;
  - with neither prop, behaves exactly as before;
- the real review sheet: Done stays disabled with the line until a slot is picked; a Flexible window leaves it available.

8 of these fail on the old picker.

**Points for the owner / coordinator:**
- **Scope:** the picker's other callers keep the old behaviour (now + 1 h default, 5-minute steps):
  - `layoutComponent/RequestDetailPullOver.js` (a live request's reschedule);
  - `popup.js`;
  - `deletePopup.js`;
  - `renderForm`'s `datetimepicker` type (old tile forms).

  If "the app's exact-time picker" is meant to include the reschedule, it is the same two props.
- **New app copy:** "Select a time above to continue." is the web's live line (its v112). I reused it rather than writing new wording. Flagging it because it is new in the app.
- **Web's first bookable day:** the web lets the requester book from tomorrow (`firstBookableISO`). The app keeps its own rule, which allows today when the slot is more than an hour out, as the ruling said.
