# G40-309 — Modal Disposition Log

_Source: John's review export 2026-07-06 17:27. Full pass of 54 modals._

**Summary:** 17 Keep · 11 Update · 26 Removed · 0 Pending → **28 survive in the tracker.**

> Modals marked **Remove** are deleted from the tracker HTML — only survivors remain. This log records every disposition + note for G40-309.

### Related code fixes (this session)

- **Bid-request "What to expect" logic error** — fixed on all 3 surfaces (gopher-request.html, gopher-connect.html web + gopher-request-flow.html app): the Review-step rundown is now bid-aware (bid requests show bid-flow steps, not billing/pre-auth) and collapsed into an expandable. Canonical flow doc updated to v3.3.

- **Age-restricted → auto-enable Purchase-needed + Attention modal (G40-310)** — implemented + verified in both web prototypes.

## Removed — deleted from tracker (26)

| Node | Surface | Modal | Advice | New-UX | Notes |
|---|---|---|---|---|---|
| `3600:7589` | Gopher Go | Counter-offer sent — what happens next | ↓ Simplify | toast | ↓ SIMPLIFY — INLINE |
| `3600:7618` | Gopher Go | Select-My-Gopher offer sent | ↓ Simplify | toast | ↓ SIMPLIFY — INLINE |
| `3740:372` | Gopher Go | Accepted (non-age-restricted) — next steps | ↓ Simplify | inline banner | ↓ SIMPLIFY — INLINE |
| `3411:14766` | Gopher Go | Complete your profile (About Me) | ↓ Simplify | inline banner | ↓ SIMPLIFY — INLINE INLINE BANNER |
| `6563:1484` | Gopher Go | Purchase-needed (counter-offer) | ✕ Remove | — | Merge with the accept-path purchase-needed guard (dynamic payout line). |
| `4838:1863` | Gopher Go | Cost adjustment before leaving merchant | 🛡 Guardrail | rebuild to G40-308 |  |
| `6505:9198` | Gopher Go | Increase cost of items — upload receipt | ↓ Simplify | UPLOAD RECEIPT (REQUIRED) | ↓ SIMPLIFY — INLINE UPLOAD RECEIPT (REQUIRED) |
| `7046:28692` | Gopher Go | Counter-offer accepted — credits left | ↓ Simplify | toast | ↓ SIMPLIFY — INLINE TOAST |
| `3639:404` | Gopher Go | Not interested — remove from queue | ↓ Simplify | toast | ↓ SIMPLIFY — INLINE TOAST |
| `5431:6591` | Gopher Go | Keep app open for location | ↓ Simplify | inline banner | ↓ SIMPLIFY — INLINE INLINE BANNER |
| `4957:1188` | Gopher Go | Request temporarily unavailable | ↓ Simplify | inline banner | This is a duplicate, please remove entirely. |
| `5588:893` | Gopher Go | Held request now available | 🛡 Guardrail | rebuild to G40-308 | Remove entirely. Make sure this modal is and any corresponding logic is removed. Please confirm this is not continued if part of live app (might need to check repos) |
| `5459:2250` | Gopher Go | Already accepted by another Gopher | ↓ Simplify | inline banner | ↓ SIMPLIFY — INLINE INLINE BANNER |
| `3814:13593` | Gopher Go | Need A Ride requires car info | 🛡 Guardrail | Vehicle photos required | This is no longer relevant. This info will be required in a gophers work settings and radius and if not complete, they will not see ride-sharing jobs. |
| `3804:13559` | Gopher Go | Earnings range advice (>$10 deliveries) | ↓ Simplify | inline banner | no longer in play, expired modal |
| `5290:10773` | Gopher Go | Need ASAP but >15 miles away | ↓ Simplify | inline banner | ↓ SIMPLIFY — INLINE INLINE BANNER |
| `5167:10501` | Gopher Go | Add a photo for confirmation | 🛡 Guardrail | rebuild to G40-308 | This needs to be inline when a new user signs up (both customer and worker apps) this needs to be relayed to all customer and worker platforms. If user attempts to continue without a pic, this pop-up occurs. Continue button will be deactivated until pic added |
| `4851:1294` | Gopher Go | Request reported — thanks | ↓ Simplify | Report this request | This is recognition for flagging a request, this can simply be an inline pop-up thanking a gopher for flagging an order. |
| `5327:2609` | Gopher Go | Rewards: 100 points → $10 | ↓ Simplify | Gopher Rewards — launching 2027 | not in play, completely remove |
| `5327:2687` | Gopher Go | Rewards: 100 points → $10 (variant) | ✕ Remove | — |  |
| `6689:20091` | Gopher Go | Pro Shopper demographic consent | 🛡 Guardrail | rebuild to G40-308 | not in play, completely remove |
| `5783:1707` | Shared | Inbox messaging terms | 🛡 Guardrail | rebuild to G40-308 | redundant. this is communicated during a potential violation. no need for a proactive modal. |
| `5783:1744` | Shared | Inbox messaging terms (variant) | ✕ Remove | — |  |
| `7130:19994` | Shared | OTP not received — help | ↓ Simplify | info tooltip | ↓ SIMPLIFY — INLINE INFO TOOLTIP |
| `4862:787` | Shared | Report a Bug — sent | ↓ Simplify | toast | No longer in play |
| `4862:843` | Shared | Contact Us — sent | ↓ Simplify | toast | ↓ SIMPLIFY — INLINE TOAST |

## Keep (17)

| Node | Surface | Modal | Advice | New-UX | Notes |
|---|---|---|---|---|---|
| `4642:1983` | Request | Age-restricted — no purchase needed | 🛡 Guardrail | Attention — age-restricted, no purchase | The modal that should pop-up here  occurs because 95+% of all age-restricted deliveries DO request a purchase. What should be happening here is when the "Slide if this delivery includes Age-Restricted Items" is activated, so is the Slide if this delivery requires a purchase needed (this needs to be fixed because i just checking in gopher-connect and gopher-request and that is not happening. This will resolve most issues we're facing with incorrect age-restricted orders. The user is then clearly reminded to enter the $ amount. IF they reverse the slide, and continues, we would pop-up the "Attention" modal letting them know that most all age restricted deliveries require a purchase. The modal would allow for a "do not show me this again" if in fact it is an edge case where purchase is truly not needed. (like Rx pick-ups and pre-paid alcohol) IF we don't not have an established modal for this, we need to build one and code how its triggered. |
| `3426:23602` | Request | Offer below category average | 🛡 Guardrail | A quick note on your offer | New modal good |
| `5448:3386` | Request | Payment not authorized after acceptance | 🛡 Guardrail | rebuild to G40-308 | New modal accepted |
| `7046:28668` | Request | Can't delete only card on file | 🛡 Guardrail | rebuild to G40-308 | new modal accepted |
| `7046:28638` | Request | Selected Gopher already on a job | 🛡 Guardrail | rebuild to G40-308 | new modal accepted |
| `5414:9191` | Request | Duplicate request | 🛡 Guardrail | You already have this request out |  |
| `4320:10175` | Gopher Go | Accepted (age-restricted) — next steps | 🛡 Guardrail | rebuild to G40-308 |  |
| `3504:3906` | Gopher Go | Purchase-needed — pay out of pocket | 🛡 Guardrail | rebuild to G40-308 |  |
| `3602:7877` | Gopher Go | Can't complete — pending cost adjustment | 🛡 Guardrail | rebuild to G40-308 |  |
| `3754:54151` | Gopher Go | Cost adjustment > 20% auth | 🛡 Guardrail | rebuild to G40-308 |  |
| `7354:8063` | Gopher Go | Adjusted pay below original offer | 🛡 Guardrail | rebuild to G40-308 |  |
| `5447:3360` | Gopher Go | Requestor payment issue — hold | 🛡 Guardrail | rebuild to G40-308 |  |
| `6829:9746` | Gopher Go | Multi-worker job accept | 🛡 Guardrail | rebuild to G40-308 | TARGET · TO BUILD |
| `4893:2932` | Gopher Go | Payout account required | 🛡 Guardrail | rebuild to G40-308 |  |
| `7602:7413` | Gopher Go | Payout card blocked / compromised | 🛡 Guardrail | ⚠️ Payout couldn’t be deposited |  |
| `4893:2893` | Gopher Go | You're now a Favorite Gopher | ↓ Simplify | You’re a Favorite! |  |
| `4816:8858` | Shared | iDenfy identity verification intro | 🛡 Guardrail | Verify your identity |  |

## Update — carries a change note (11)

| Node | Surface | Modal | Advice | New-UX | Notes |
|---|---|---|---|---|---|
| `5617:2177` | Request | Pick-up = drop-off address | 🛡 Guardrail | rebuild to G40-308 | This needs to be for delivery only. If moving, change "Pick-up = drop-off address It looks like your pick up and drop off addresses are the same. If you do not have a preference as to where your items are picked up, please slide the toggle bar after “Gopher can purchase from anywhere.” to "Pick-up = drop-off address It looks like your pick up and drop off addresses are the same. If this is a single location move, please slide the pick-up address toggle bar to No specific pick-up location" |
| `5418:845` | Request | Phone number entered | 🛡 Guardrail | rebuild to G40-308 | Change the "Edit my request" button to "Edit my message" |
| `4160:7115` | Request | Age-restricted ID agreement | 🛡 Guardrail | Submit Identification | This should follow the age-restricted protocol in place, identified when a user doesn't have Trustshield. Please update with that. |
| `4902:2963` | Request | Accepted Gopher no longer available | 🛡 Guardrail | Your Gopher cancelled | I need to see what occurs AFTER "options" is selected. Once the update is given to CC, please respond with what those option are. |
| `4514:1156` | Request | Cancel deterrent — Gophers available | 🛡 Guardrail | (JS-rendered) | This is a new feature. Please fully update G40-40. Share with new dev team the trigger, logic and function. This is intended to hopefully detour a cancellation from occurring in a relatively active market. |
| `5802:1346` | Request | Still broadcasting — Still Need / Cancel | ✕ Remove | — | Need thumbnail. This modal is regarding to G40-209. |
| `8821:8919` | Request | Request expired — interested workers | 🛡 Guardrail | rebuild to G40-308 | This is regarding ticket G40-43 |
| `3600:7530` | Gopher Go | Bid sent — what happens next | ↓ Simplify | toast | I significant logic error was discovered here. I will note in CC |
| `3746:19620` | Gopher Go | Complete request — outcome options | 🛡 Guardrail | rebuild to G40-308 | This is NOT a complete request modal. This is IF the gopher selected ID and Identity NOT CONFIRMED. |
| `3816:20864` | Gopher Go | Counter-offer exceeds 150% max | ↓ Simplify | YOUR COUNTER-OFFER | The 150% cap is ONLY for standard Gophers, there is no cap for Elite/Elite+/Pro Gophers. This has been updated in the Gopher — Intended / Matrix |
| `5167:10546` | Gopher Go | Delivery photos (Picture 1 / 2) | ✕ Remove | — | This modal is when a requester selects "tap to view details" at the confirmation screen from that a gopher took when completing a request. This allows them to see work done that was either contactless or remote. This technically doesn't need to be a modal. Review my desktop completion screen.png for a way to incorporate this into all customer apps |

## Pending — still to review (0)

| Node | Surface | Modal | Advice | New-UX | Notes |
|---|---|---|---|---|---|

## New — built to G40-308 (added post-review · payout-card management)

Not part of the original 54-modal Figma pass (no old node); these are new-UX worker modals built directly on
the G40-308 standard and demoed in `G40-308-modal-kit.html` (Guide B — bottom sheet). Both belong to the
combined **G40-19** ticket (which now absorbs **G40-194**).

| Node | Surface | Modal | Advice | New-UX | Notes |
|---|---|---|---|---|---|
| new · G40-19 | Gopher Go | Payout couldn’t be sent (failed instant transfer) | ✅ Keep — build to G40-308 | Guide B sheet: card last-4 + failed amount + 2-day retry list; CTA → Payout Info → Add a new card | Fires with the push alert on a Stripe `payout.failed`. Kit demo `demoB('payoutfail')`. ✅ Prototype `#payoutFailOverlay` in `Final/gopher-go.html` **reskinned to the `.gc-modal` G40-308 standard** (2026-07-07) — off the ad-hoc `.rhm-overlay`/red-CTA. |
| new · G40-194 | Gopher Go | Attention! — last payout card can’t be deleted | ✅ Keep — build to G40-308 | Guide B sheet; blocking. Primary **Add New Card** (John’s option-1), secondary **Back** | Shown on a `409 LAST_PAYOUT_CARD` from the delete-card call. Kit demo `demoB('lastcard')`. Merged into G40-19. |
