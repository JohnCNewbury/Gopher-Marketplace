# Build: web Custom Task (`other`) gets the Request app's Custom Task logic

Worktree `scratchpad/sync/websrc2`, branch `code-logic/custom-task-port` (from `code-logic/request-sync` d5610c64).
Reference: APP `scratchpad/sync/app` @ b47efe59f, SERVER `scratchpad/sync/server` @ 7e571e9f. Nothing pushed, nothing deployed.

## Commits (local only)

| SHA | What |
|---|---|
| `01f29aef` | CT port (web): Custom Task runs the Request app's Custom Task logic. The page, `gopher-flow-rules.js`, `gopher-step-gates.js`, and 3 pinned checks updated to the ported values |
| `febd65ef` | Web check 30/30: `scripts/web-checks/custom-task-port.js`, registered in `run-all.sh` (steps renumbered `/29` → `/30`) |

## Every region touched in `Final/gopher-request.html` (line numbers at `febd65ef`)

| Lines | Region | Change |
|---|---|---|
| 13334-13335 | Fee model header comment | "delivery only" → Delivery + Custom Task |
| 13349-13359 | Right after `AGE_FEE` | new `AGE_SWITCH_CATEGORIES = ['delivery','other']` + comment |
| 13421 | `computeRequestFee` `baseAge` | A/R fee on `AGE_SWITCH_CATEGORIES` |
| 13435-13440 | `computeRequestFee` `tsEligible` | TrustShield $1 on A/R Delivery **or Custom Task**, or Ride |
| 14461-14474 | `captureRequestToDashboard` snapshot | `snapCostItems` uses `showsPurchase()`; a Custom Task with no pick-up stores `pickup: ''`, not the `'Any location'` sentinel |
| 14491, 14502 | same, record `costOfItems` + `amountLabel` | `purchaseCounts()` (a Custom Task bid carries no cost) |
| 14801 | `switchCategory` | `ctPickupDefault()` before `state.step = 2` |
| 15065-15068, 15076, 15078-15083, 15094 | inline `FIELD_HIDDEN_FOR` | `workerSetup` +other, `workerSelectChoice` → `[]`, `pickupSection` −other, `noSpecificPickup` −other, `destStairs` +other |
| 15163-15167 | `UNIT_CATEGORIES` | +`'other'` (destination Unit/Apt; `PICKUP_UNIT` untouched) |
| 15304-15370 | New block right after `const bidsAllowed` | `PURCHASE_CATEGORIES`, `purchaseCounts()`, `showsPurchase()`, `ctPickupDefault()`, `twoAddressRoute()`, `CT_CHOICE` + `ctChoiceLabel()` |
| 16016-16051 | `renderStep2`, after the Delivery block | new Custom Task "Optional criteria" section |
| 16239, 16261, 16275 | `renderStep3` three `rr-label`s | `state.category === 'other' ? ctChoiceLabel(...) : …` |
| 16342-16358 | `renderStep4` pick-up toggle | Custom Task branch: "No pick up — work happens on site", no ?, no note |
| 16542-16546 | `renderStep5` under "Request bids" | Custom Task bid note |
| 16763 | `renderStep6` `showCostOfItems` | `showsPurchase()` |
| 16803-16805, 16813 | `renderStep6` rows | no Pick-up row on a no-pick-up Custom Task; trip-distance row uses `twoAddressRoute()` |
| 17088 | `renderStep7` `s7costItems` | `showsPurchase()` |
| 17365 | `renderMultiAddressBlock_dropoff` trip-distance pill | `twoAddressRoute()` |
| 17395 | GO-To review pricing (MONEY-38 IIFE) | A/R kept on `AGE_SWITCH_CATEGORIES` |
| 17593-17611 | `render()` toggle listener | A/R → purchase smart default is Delivery-only; on Custom Task, purchase OFF zeroes the cost and "No pick up" ON clears the pick-up |
| 17632-17638 | `render()` radio listener | Custom Task: choosing bids turns the purchase off and zeroes the cost |
| 18356 | `needsPlaceLookup` | `!twoAddressRoute()` |
| 18449 | `jumpToReviewChecked` | `twoAddressRoute()` |
| 18490-18494 | `onContinue` Step-2 age backstop | `&& !(state.category === 'other' && state.ageRestricted)` appended. The existing literal is kept, because the parity harness matches it. |
| 18727 | `__startRequestWithCategory` | `ctPickupDefault()` |
| 18797-18812 | `__startRequestAgainFast` | `ctPickupDefault()` after the addresses; A/R prefill on `AGE_SWITCH_CATEGORIES`; D-55 comment |

Other files: `Final/assets/js/gopher-flow-rules.js` (Request base + new prototype/connect override rows), `Final/assets/js/gopher-step-gates.js` (`costOfItems` and `addressesDiffer` `when`s), `docs/handoff/request-app-parity/test-flow-rules.js`, `scripts/web-checks/{goto-parity,worker-choice-and-hourly}.js`, `scripts/web-checks/run-all.sh`, new `scripts/web-checks/custom-task-port.js`.

**Flow-rules overrides.** I did not change any existing `prototype` or `connect` value. Moving the Request base for `other` would have moved Connect and the prototype with it, so each now holds its pre-port value for those 4 fields as a new override entry. Their effective tables are byte-identical to before. The harness compares each surface with its own table and passes on all three.

## Each item: SAME now, and how it was verified

Browser checks were driven on `http://127.0.0.1:8742/gopher-request.html`, served from this worktree's `Final/` (the server is stopped now). The demo profile has DOB 1990 (age 35) and TrustShield.

| Item | App (reference) | Web now | Verified |
|---|---|---|---|
| **B-2: address shape** | Pick-up location card: "No pick up — work happens on site", ON by default. OFF = pick-up + destination. Unit/Apt on the destination (`apt` / `dropoffapt`), none on the pick-up. Switching ON clears the pick-up. Re-opened with a pick-up = OFF. | Same. The key is `noSpecificPickup`, which defaults to ON for `other` via `ctPickupDefault()` on tile, tab, iQ and Request Again. | Browser: Step 4 opens ON with only the destination and Unit/Apt. OFF shows the pick-up, Continue with it empty flags the pick-up. ON→OFF leaves the pick-up empty. Request Again with a pick-up opens OFF, filled. A tile switch from Delivery opens ON. Check 30. |
| **B-36: no stairs** | No stairs field on Custom Task | Destination stairs counter removed for `other` | Browser: no stairs counter on Step 4. Record `destStairs: 0`. |
| No same-place / trip distance (part of B-2) | No `samePlace` on the Custom Task flow. Server `TWO_ADDRESS_CATEGORIES` has no "Other". No `tripDistance` field. | Gate off for `other`; no place lookup; no pill or row | Browser: identical pick-up and destination text went to Step 5 (Delivery blocks the same pair: check 30 runs both). No pill. |
| **B-15 / D-46: worker choice** | Three: "First available", "I'll select my worker", "Prioritize MY Gopher(s)". `available` defaultValue true. | Same three, First available selected by default. The ? popovers use the app's sheet words with the CT names ("worker", as the app says it). | Browser: `first*: First available`, `select: I’ll select my worker`, `my: Prioritize MY Gopher(s)`, popover texts read back. |
| **B-19: no crew** | No crew control | `workerSetup` hidden; `crewCount()` = 1 | Browser: no "More than 1 worker" toggle. Record `workersNeeded: 1`. |
| **CT-1: A/R switch + purchase + cost** | "Optional criteria": "Slide if this custom task includes Age-restricted items", then "This task requires a purchase", which reveals "Cost of items needed" (0.00). A/R does not turn the purchase on. | Same words and order. Delivery's A/R → purchase smart default is now Delivery-only. | Browser: A/R on left the purchase off. Purchase on shows "COST OF ITEMS NEEDED" with placeholder 0.00. Continue with no cost pulses the box ("Please enter the cost of items needed before continuing."). |
| **CT-2: under-21** | The app shows the switch to everyone. **This is the app's bug against the ruling** (G40-614). | Drawn only when `canSeeAgeRestricted()`; unknown age = not eligible | Browser: DOB 2007 shows the purchase switch only, no A/R text on the step. `__customerDob` → null gives the same. Age 35 shows both. A Request Again carrying `ageRestricted` for under-21 priced with no A/R fee ($45.35). |
| **D-7 / MONEY-5: A/R fee + TrustShield** | Server prices `age_restricted?` on any category: `AGE_RESTRICTED_FEE` 199, and `trust_shield_verified && age_restricted_fee` → −100 (create.js summary 66-151, create 577-582) | `computeRequestFee` applies the A/R fee and TrustShield on A/R Delivery **and** Custom Task | Browser Review for Custom Task $40, A/R, TrustShield: Gopher Fee $1.99, Age-Restricted Fee $1.99, Instant Transfer $3.52, TrustShield −$1.00, **Total $46.50** (audit's app figure; was $45.35). Submit record: snapshot `total 46.5`, `fullAgeFee 1.99`, `trustShieldDiscount 1`. Check 30 runs the page's fee block: 46.50 / 47.50 without TrustShield / 45.35 without A/R; Delivery A/R $50 + TrustShield still $56.22. |
| Age scan (R2) | `ageKeywordCheck` runs on every flow; skipped when `has_age_restriction` | Still scans every category; skipped on Custom Task with A/R on | Browser: "Pick up a case of beer…" without A/R opens "This looks age-restricted". With A/R on it goes straight to Step 3. |
| **CT-3 / D-24: cost check waived for bids** | `need_purchase && !gopher_bid && !(cost>0)`. Choosing bids unchecks the purchase and zeroes the cost. Pricing drops a purchase on a bid. Note: "Requests for bids can’t include buying items, so no cost of items is sent." | Same: radio handler, gate exemption (`other` + bids + `bidsAllowed()`), `purchaseCounts()`, and the note under "Request bids" | Browser: choosing bids flipped the purchase off and showed the note. Back on Step 2, purchase on with an empty cost let Continue through. A purchase re-enabled with cost $30 on a bid submitted `costOfItems: 0` with no cost row on Review. A set-price Custom Task with $18 items + $20 offer: Review cost row $18.00, Total $43.19, record `costOfItems 18`. |
| Request Again / GO-To (D-55, MONEY-38) | `customTaskRequestAgainData` carries the age flag and the pick-up | A/R prefill and GO-To pricing on `AGE_SWITCH_CATEGORIES`, gated by `canSeeAgeRestricted()` | Browser: Request Again prefill for A/R and for the pick-up. GO-To pricing is code only, not driven. |

The browser console showed no errors except the expected local `RefererNotAllowedMapError` (Google Maps refuses `127.0.0.1`). So the same-place pass above used the text fallback.

## Not built, and why

- **CAT-3, the "Before you continue" sheet: not built, as instructed (needs an owner ruling).**
  - Where it lives in the app: `HomeScreen.js:94-103` and `live/CustomTaskCategorySheet.js`.
  - Which doors open it: every way into Custom Task (tile, iQ card, "Didn't find the right fit?"), unless `doNotShowPreOtherModal` is set.
  - What it shows, in John's 10/10 words: the grey pill "Custom Task"; heading *"Please ensure the request you're looking for isn't already included in our category menu."*; sub-line *"Workers select the categories they see so being accurate here helps everyone. If your request is truly custom, that's great, proceed with Custom Task."*; then the other 7 categories as tiles.
  - What the tiles do: a tile opens that category with the typed words carried over.
  - What it ends with: a navy "Continue with Custom Task" button and a "Do not show this again" checkbox.
- **Words with no app equivalent, left as the web has them:**
  - Step-2 title "Tell us about your custom task request". The app says "Tell us about your custom task".
  - Step-3 heading "How would you like us to find your Gopher?" and section title "How do you want to select your Gopher? (n of 3 options available)". The app's card says "How would you like to select your worker?".
  - Pick-up/drop-off placeholders "Enter pickup address" / "Enter drop-off address". The app says "Enter pick-up address" / "Enter Address".

  All of these are shared web layout used by every category, not Custom Task logic. I did not invent any copy.
- **App Step 5 "Cost of items" + "Total" rows (CT-08): not built.** These are presentation; the web's Step 5 shows neither for Delivery either. Cost and total do show on Review.
- **TrustShield label on the Review fee popover** still reads "($1 off Age-Restricted Delivery & Ride-Sharing)". The amount is right on Custom Task. This is web-wide copy, so I left it.
- **Cross-device drafts:** `gopher-request-draft-map.js` maps `noSpecificPickup` ↔ `purchase_anywhere` (Delivery's meaning). The app's Custom Task keeps its switch in `pickup_flexible`, so a Custom Task draft resumed on the app opens with its default (no pick-up). A draft saved on web before this change opens with the switch OFF. I did not touch the shared draft module.
- **Deals:** `__startDealRequest` is untouched (Deals parked). No deal routes to `other` today: service deals use `reqCategory` home/junk/yard, merchant deals use delivery.
- **App bug left for the app side:** CT-2. The app shows the Custom Task A/R switch to under-21 (no `profileFlag`), and the server then refuses with 403.
- **Request 101 guide (`gopher-request-101.html`):** it already describes the app's Custom Task (sheet, Optional criteria, the 3 choices, "No pick up — work happens on site" ON by default), so the web now matches it. Line 942 describes only Delivery's 21+ switch, not that Custom Task's is 21+ only. That is for the 101 seat to decide; I did not edit it.
- **Pre-existing, not touched:** `test-prototype-stepgate-equivalence.js` is not in `run-all.sh` and hard-codes the main checkout. It crashes the same way at HEAD (`ageScanText is not defined` in the prototype), independent of this change.

## Check results

- **`bash scripts/web-checks/run-all.sh`:** 30 steps. Only **14** (Go parity harness) and **18** (Deals featured picks) fail, the same two as the base run (`ct-webchecks-base.txt` vs `ct-webchecks-after.txt`). **No new failures.** Step 30 (custom-task-port) passes.
- **`python3 docs/handoff/request-app-parity/run_parity_harness.py`:** **PARITY: OK (0 failures, 4 warnings)**, the same 4 warnings as the base. Section 6: request 17 / connect 17 / prototype 14 shared fields, all match.
- **Updated pinned checks:** `worker-choice-and-hourly.js` (Custom Task now shows the choice), `goto-parity.js` (the D-55 regex reads `AGE_SWITCH_CATEGORIES`), `test-flow-rules.js` (the exact set of differing fields is now 7, plus a per-field "differ on `other` only" and "Connect/prototype not ported" pins). All pass.
- **`custom-task-port.js` mutation test:** I reverted `baseAge` to Delivery-only, ungated the A/R switch, and removed the same-place exclusion. That gave 4 FAILs. Restored, all pass.
