# Build report: Request app, items A1 to A4 (2026-10-15)

Worktree: `scratchpad/sync/app-work` (repo gopher-mobile-requester-capacitorjs). Left detached at `origin/production`, clean.
Nothing pushed, no MRs, nothing merged, nothing built or installed.

## Base moved during the work: branches rebased

`origin/production` moved from `b47efe59f` to **`9ba8ef5e4`** while I was working (G40-604 phase 2 buttons and PL-320 merged; a fetch from the shared repo updated the ref). All four branches were built on `b47efe59f`. I then **rebased them onto `9ba8ef5e4`**. Only one conflict came up: an import line in `YardStepNav.js` against G40-604's `BTN_*` import, and both sides were kept. Every gate was re-run on each rebased branch.

- Baseline at `9ba8ef5e4`: 205/205 suites pass, eslint clean, prettier clean, all 28 guards pass.
- **Trial merge of all four branches together** onto `9ba8ef5e4`: no conflicts. 212/212 suites, 3535 tests pass, eslint 0 warnings, prettier clean, 28/28 guards pass. The trial branch was deleted afterwards.

The gates for every branch were: `npx jest --config jest.services.config.json` (all suites), `npx eslint ./src/ --max-warnings=0`, `npx prettier . --check`, and every `node scripts/*` listed in `.gitlab-ci.yml` (28). The runner is `scratchpad/sync/run-gates.sh`.

| Item | Branch | Commit(s) on `9ba8ef5e4` | Suites | Gates |
|---|---|---|---|---|
| A1 | `G40-624-category-nudge` | `5fb669ee6` | 207/207 | all pass |
| A2 | `G40-626-phone-mask` | `adfb8eeab`, then `99a260d2e` (owner's 10/15 notice) | 207/207 | all pass |
| A3 | `G40-614-under-21-age-options` | `d69952ef7` | 207/207 | all pass |
| A4 | `fix/review-id-line-flagged` (PL-309) | `46d36eacd` | 206/206 | all pass |

Before the rebase the SHAs were `c5672f77b`, `a0c60c1c3` + `d96b29584`, `72aa448b1` and `e19e6dfc0`. They are gone and should not be used.

I searched local and remote refs for branches or commits carrying G40-624, G40-626, G40-614 or PL-309 before building, and found none.

---

## A1: G40-624 "This looks like a ___ job" (`G40-624-category-nudge`, `5fb669ee6`)

**What it does.** On Continue from Step 2, after the age-keyword check and before the flow's own check (the web's order), a description that clearly points to another category opens a sheet. It blocks Continue once.
- **Keep as …** goes on to Step 3. The app remembers the answer for those exact words (`category_check_ack`), so it won't ask again; new words ask again.
- **Switch to …** moves the request to that category's Step 2. It reuses the age check's "Yes" move: the source draft is dropped and its exit-save is blocked, the history entry is replaced so Back goes home, and the new form opens fresh.
- **What carries over (R1):** the description and photos go; the addresses never do. When switching into Need a Ride, the words go into its special instructions and no photos go, because Ride takes none.

**Decision logic.** It is the website's `detectCategoryMismatch`, ported line for line with its tuned constants (`STRONG_BAR` 8, `MARGIN` 5, `UNAMBIG_RATIO` 2.5, `DOMINANCE_RATIO` 2.5, `CAT_THRESH`).
- **One brain:** scoring comes from the iQ brain the home already runs. A new `iqEngine.js brainCategories()` returns `getBrain().categories`, the same object the web hands this check. No second classifier was added.
- **Parity check (run outside the repo):** I ran the web's own `gopher-request-logic.js` and this port on the app's brain over 3,940 phrases × 8 categories (31,520 pairs). There were 0 differences.

**Where it does not run:**
- Need a Ride: it has no description, and the web hides that box.
- A GO-To being set up: the web's GO-To editor has no such check.
- An order being edited, or re-priced by Update Payment Info (`isAutoSubmit`).
- Any step other than 2.
- A description containing an age-restricted word: the age check owns those, as on the web.

**Words:** the website's sentences, verbatim:
- Title: "This looks like a {X} job"
- Body: "Requests in the wrong category may not reach the right workers — workers filter available jobs by category. Switch to **{X}**?"
- Buttons: "Switch to {X}" / "Keep as {Y}"

**Files:**
- `src/component/stepFlow/categoryMismatchCheck.js` (new)
- `src/component/home/iqEngine.js` (`brainCategories` export)
- `src/component/yardFlow/YardStepNav.js`:
  - the check is added to `checkFor`;
  - `moveTo.as` names the remount key, so the age move stays `age-move-…` and this move is `category-move-…`.
- `src/component/yardFlow/ContinueCheckSheet.js` (doc line only)
- Tests: `categoryMismatchCheck.g40624.test.js`, `YardStepNav.g40624.test.js`, and `ContinueCheckSheet.g40623.test.js` (the new sheet was added to the kit guard)

**Sheet added:** `category-mismatch`, built on the existing **ContinueCheckSheet** (G40-595 kit).
- Navy `PrimaryPill` "Switch to …" stacked over an outlined `BackPill` "Keep as …".
- G40-308 shape: black title and a 🧭 badge on the neutral tint, sized to its content.
- The kit guard now draws it: shared pills in the bar, centred words, black title, badge.

**Tests:**
- The web's MATRIX, verbatim (19 rows, from `run_parity_harness.py` on `origin/code-logic/coupon-pl289-web`), plus the audit's 4 runs.
- It never suggests Other and never the category already chosen.
- A source guard checks it uses one brain; every slug maps to a flow.
- Words and pills; every place it must not run; once per wording; the Switch carry, including no addresses and Ride's box.
- Real-bar tests through the real `YardStepNav`, sheet and router:
  - Keep goes on and doesn't ask again;
  - ✕ stays on Step 2 and asks again;
  - new words ask again;
  - Switch moves Junk Removal to Home Services with words and photos, drops the Junk draft, Back goes home, and Home Services doesn't ask again;
  - Custom Task to Need a Ride;
  - GO-To, edit, Ride, an age word, and a description that fits all go straight on.

## A2: G40-626 phone mask (`G40-626-phone-mask`, `adfb8eeab` + `99a260d2e`)

**Commit 1 (`adfb8eeab`): the pattern.**
- `src/helpers/phoneMask.js` (new) carries the website's pattern verbatim (`/(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/`). It also masks any run of 10+ digits **whole**; otherwise "9195551234567" would leave "919" showing, because the pattern ends in `\b`.
- The mask (`**********`) and masking as typed are unchanged.
- `DescriptionField` (`discriptionElement.js`) uses it. That covers both the description and Ride's special instructions (PHONE-2), since both use this box.
- Words that arrive already written (iQ's words from home, a resumed draft, a carried request) are now masked when the box opens. Before, they were only masked once edited, so a number typed into iQ could go out.
- **Tests (`phoneMask.g40626.test.js`):**
  - the pattern equals the web's character for character;
  - the ticket's 5 formats are fully masked;
  - the rest of the web's table, including SKU and order-number runs;
  - negatives stay untouched: "2 couches", "$1,250", 27601, 27601-1234, 555-1234, gate codes, dates;
  - over 40,000 seeded random strings, the web's pattern finds nothing after masking, and text without a number is returned unchanged.
- **Tests (`discriptionElement.g40626.test.js`):** mounts the real Step-2 cards (Custom Task's description, Ride's special instructions), types each format, and checks the value and the notice. 8 of its 11 original tests failed against the old component.

**Commit 2 (`99a260d2e`): the owner's 10/15 ruling.**
- The "Attention!" sheet is replaced by the short notice, in the website's words, with typographic apostrophes:
  - title "Phone number hidden"
  - body "For your privacy we don’t broadcast phone numbers. Once your request is submitted you can text or call your Gopher in-app."
  - one primary button "OK"
  - "Don’t show again"
- The words live in `helpers/phoneMask.js` (`PHONE_HIDDEN_SHEET`).
- "Don’t show again" keeps the old behaviour and the **same device key** (`doNotShowPhoneNumberChecked`). It is remembered only when ticked and OK is tapped, and a device that ticked the old sheet's box is not shown this one.

**Sheet changed:** the text box's phone sheet. It was a hand-built `PullOverModal` "Attention!" with an "Edit Request" pill. It is now drawn by the kit's **ContinueCheckSheet**:
- `PrimaryPill` "OK" in the bar;
- the kit's "don't show" box, with its label set to "Don’t show again";
- G40-308 title and badge. **The badge is my pick: 🔒 on the neutral tint**, because the ruling named no icon.
- The kit guard draws it too.

**Tests for commit 2:**
- title, words, a single OK pill in the bar, and "Don’t show again";
- OK closes the notice and the number stays masked;
- ticking the box then OK writes the key, and the next number is masked with no notice;
- the old sheet's stored key still suppresses the notice.

**Note:** this masking applies to every `DescriptionField` in the app, as the old pattern did: the rating comment, dispute text, report and delete-reason popups, and legacy forms. It is wider now; for example, a 10+ digit tracking number in a support report would be masked there too.

## A3: G40-614 under-21 options (`G40-614-under-21-age-options`, `d69952ef7`)

**What it does:**
- Custom Task's "Slide if this custom task includes Age-restricted items" now has Delivery's own gate (`profileFlag: "can_request_restricted_items"`). The flag is read the same way: from the stored profile (`localStorage "items"`), and a missing or unreadable value counts as not eligible.
- The home's iQ ideas leave out age-restricted ideas for anyone not eligible (`iqIdeas.js ideasShownTo`). The age-keyword scan itself decides which ideas those are: today exactly "Beer & liquor run" and "Tobacco, vape and nicotine delivery (21+ only)", and a test pins that.
- Typing an idea's name into iQ only counts as that idea if it is offered (`HomeScreen.js`, `shownGuidanceFor`).

**Files:**
- `CustomTaskDetails.js`, `iqIdeas.js`, `HomeCategories.js`, `HomeScreen.js`
- Tests: new `customTaskAgeSwitch.g40614.test.js` and `iqIdeas.g40614.test.js`. `HomeScreen.g40549.test.js` gains an under-21 mount test.
- Three existing mounts that click the age switch or the Beer idea now set a 21+ profile explicitly: `customTaskMount.g40573`, `stepDetails.g40584`, `HomeScreen.g40549`.

**Sheets:** none.

**Tests:**
- The real Step-2 card: shown to 21+; hidden for under-21, no flag, no profile, and an unreadable profile; the purchase switch is untouched; it uses the same gate as Delivery's JSON.
- Ideas: 21+ is offered 5 Delivery ideas, everyone else 3; other categories unchanged; typed idea names handled.
- 6 of the new tests fail on the old code.

**Deliberately not done:** the web also forces `ageRestricted` off before sending for an ineligible requester. The app does not. Right after sign-in the login response carries no flag, so eligibility can briefly read as "no". Forcing the flag off then would silently drop a real 21+ request's age-restricted flag, which is the compliance-risk direction. A stale under-21 draft with the flag on still gets the server's 403.

## A4: PL-309 Review ID line (`fix/review-id-line-flagged`, `46d36eacd`)

**What it does.**
- "What to expect after your request is submitted" on Review gains the website's line, word for word, as the web's amber "!" item after the numbered steps: "This request requires **a picture of the front of a valid ID** before items can be exchanged."
- It uses the website's condition (`ageRestricted || idRequiredAtCompletion`): an age-restricted request, or a "No" → "Submit as-is" keyword-flagged one.
- The flagged case is read from what Submit will send (`helpers/ageKeywordDeclined.js`). So the line shows exactly when the request goes out flagged, and it disappears once the word is edited away.
- Display only: the payload is unchanged.

**Files:** `YardReviewExtras.js` (`needsIdAtExchange`, `IdLine`); test `whatToExpectIdLine.pl309.test.js`.

**Sheets:** none.

**Tests:**
- The flagged values come from the real sheets ("No", then "Submit as-is") for Delivery, Custom Task, Moving, and Ride's special instructions. The line is last, appears once, and has the web's bold words.
- Bid requests show it too; an A/R request shows it once.
- Editing the word away removes it.
- Plain requests and a "No" not yet followed by "Submit as-is" show nothing.

---

## Owner questions (each built the unambiguous way, noted here instead of guessed)

1. **A1, which category names the sheet uses.** The web's title and Switch button use the classifier's labels: "This looks like a **Ride Sharing** job", "Switch to **Yard Work & Outdoor Projects**". Its "Keep as …" uses its tab names (Need a Ride, Yard Project, Custom Task). The app uses its own category names in all three places, because the app shows those names everywhere, its iQ card included. The web's labels would be a one-word change.
2. **A1, blur trigger.** The web also opens the sheet when the description box loses focus (blur). The app runs it on Continue only, which is what D5 says ("blocks Continue once"). Re-arming also differs slightly: the web re-arms on any edit, the app on different words (so editing and then reverting to the same words doesn't re-ask).
3. **A1, the Custom Task idea "Assemble a grill".** It is one of Custom Task's own iQ ideas. A Custom Task described as "assemble a grill" gets "This looks like a Home Services job" on both the web and the app, because the logic is the same. Flagging it in case that is unwanted.
4. **A3, unknown date of birth (audit AGE-5).** The server's `can_request_restricted_items` is **true** for an account with no date of birth: `profile.js:276` uses `getAge(null)`, which is 56. The order itself is refused for those accounts (`create.js`, G40-370, fails closed). As the app can see it, "unknown" (no profile, no flag, unreadable) counts as not eligible. But a null-DOB account still reads as eligible everywhere the flag is read: the Delivery switch, the Custom Task switch, the iQ ideas, the age-keyword block, the legacy Age-Restricted tile, and GO-To forms. I did not change that here, because it would move the age gate for every flow.
   - Cleanest fix: one line on the server, computing the flag with `signup_age_policy.age_from_dob`.
   - App alternative: one shared reader that also requires a date of birth. This needs about 10 G40-623/628/581 test fixtures to gain a `date_of_birth`.
5. **A4, A/R requests.** I followed the web's condition, so age-restricted requests (not only keyword-flagged ones) also show the line. Narrowing it to flagged-only is a one-line change.
6. **A4, edited orders.** When a flagged order is edited, the line does not show. The app does not load `age_keyword_declined` back into the form, though the server keeps the flag because the app never sends `false`.
7. **A2, phone notice badge.** The 🔒 is my pick; the ruling named no icon.
8. **Sibling worktree.** `app-work2` is on `fix/category-switch-carries-words-photos`, with no commits yet when I looked. Its name suggests it may touch the same carry-on-move behaviour as A1's Switch (`categoryMismatchCheck.switchCarryValues` and the `YardStepNav` `moveTo`). Worth comparing before both merge.

## Merge hand-off (for each branch, when the owner decides)

Target branch `production`. Squash or not, and whether to delete the source branch, are the owner's call; nothing is pushed. The four branches merge together without conflicts on `9ba8ef5e4`. G40-626 is two commits; the other three are one each.
