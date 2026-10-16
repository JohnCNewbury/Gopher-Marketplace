# Audit E — AFTER SUBMIT (requester side): Request website vs live Request app

**Date:** 2026-10-15. **Scope:** offers, cancellation, reschedule, cost adjustments, messaging, live states, completion/dispute/rating, worker-raised reviews, Home cards.

**Pinned code (read-only):**

| Side | Root (relative paths below hang off `.../scratchpad/sync/`) | Ref |
|---|---|---|
| APP (Request app) | `app/` | `b47efe59f` |
| SERVER (backend) | `server/` | `7e571e9fb` |
| WEB (live site root) | `web/` | `9e29366` |

## Read this first: what the web side is

- **The web request dashboard is a local simulation.** Every request lives in `DASH_DATA.activeRequests` inside the page (`web/gopher-request.html:24541`). They come from 9 seeded demo records (`:24874-25255`) or from `window.__createDashboardRequest` (`:25283`), which writes locally and calls no server. The interested-worker pool is demo data (`buildInterestedPool`, `:14387-14388`).
- **The web has no server fields.** The app reads `aasm_state`, `requestor_alerts`, `has_active_cog`, `photo_step_resolved` and so on. The web has its own record fields instead: `status` ∈ pending / in-progress / scheduled / completed, plus `needsAttention`, `awaitingConfirmation`, `disputeState`, `pendingAdjustment`, `counterOffers` and `noShow`.
- **So the comparison is of the decision rule each side encodes, not of data.** "Order state X" in a DIVERGES line means the app's server state; the web equivalent is named in each case.
- **Several web paths are reachable only through the PT harness or a DEMO button.**
  - PT is `gopher-web-pt-bridge.js`. It cannot run on the live hosts (`:19-25`, "IT CANNOT RUN IN PRODUCTION").
  - The DEMO buttons are "Simulate decline", "Simulate expiry" and "Simulate: Gopher cancelled".
  - Each block says which.
- **The app was read at its live screens:**
  - `requestOrder.js` (the live map);
  - `Orderdispute.js` (`/startDispute`, the confirm/dispute screen);
  - `pages/unresolvedDispute.js`, `live/*`, `home/*`, `rating.js` and `ReleaseRecoveryWatcher.js`.
- **App pure helpers were RUN under node.** They were copied, read-only, to `scratchpad/e-harness/` (`homeCards`, `openRequest`, `liveStatus`, `dispute`), and that output is quoted below as "node:".

## Summary

| ID | Rule | Verdict |
|---|---|---|
| E-1 | Offer actions are Hire / Deny / Message (no Consider) | SAME |
| E-2 | Who gets hired without the requester (First Available, MY Gophers, far Standard worker, I'll select) | SAME |
| E-3 | A request hires exactly one worker | SAME |
| E-4 | Hiring a busy Standard worker is refused | SAME (words differ) |
| E-5 | Bid card shows the all-in number; web hires a bid directly | DECLARED |
| E-6 | Counter-offer card (new total, What changed, Hire for $X / Deny / Message) | SAME |
| E-7 | "N mi from your drop-off" only for a far Standard worker | SAME |
| E-8 | Waiting card says how long the request stays open | APP-ONLY |
| E-9 | Live interest keeps a request open past its time | DIVERGES |
| E-10 | Expired with no interest: "No worker found" card + page | APP-ONLY |
| E-11 | When the requester may cancel | DIVERGES |
| E-12 | Cancel with a worker booked offers "find a different worker" | DIVERGES |
| E-13 | Cancel needs a reason; scheduling-conflict intercept; 24 h reason rule on repost | APP-ONLY |
| E-14 | Cancelling a request nobody has taken yet | DIVERGES |
| E-15 | A requester cancel before the worker starts is free | SAME |
| E-16 | Edit a request while it is pending | APP-ONLY |
| E-17 | Web list-card ✕ cancels a request in any state | WEB-ONLY |
| E-18 | Worker cancels an accepted job: the requester's recovery choices | DIVERGES |
| E-19 | Card declined after a worker accepts | DIVERGES |
| E-20 | Worker asks for a new time (reschedule) | APP-ONLY |
| E-21 | Cost adjustment: approve changes the total, decline keeps it | SAME |
| E-22 | Which states show a cost adjustment | DIVERGES |
| E-23 | Receipt rule on a cost adjustment | SAME |
| E-24 | Confirm is refused while a cost adjustment is unanswered | DIVERGES |
| E-25 | No requester-side cap on counters / adjustments | SAME |
| E-26 | When chat is available | SAME |
| E-27 | Pre-send warning: detector and escalation | DIVERGES |
| E-28 | "Send anyway" on payment / off-app: conversation blocked, hired or not | DIVERGES |
| E-29 | Contact details: withheld before hire, allowed after | DIVERGES |
| E-30 | A withheld message stays hidden from the recipient | APP-ONLY |
| E-31 | Photos in chat | SAME |
| E-32 | State right after a hire (Accepted vs In Progress) | DIVERGES |
| E-33 | Live step bar | DIVERGES |
| E-34 | No-show ID-check countdown | SAME |
| E-35 | Confirm only after the worker's photo step resolves | APP-ONLY |
| E-36 | Confirm completion finalizes, then rating | SAME |
| E-37 | A dispute can be raised only on a worker-completed, unpaid order, once | SAME |
| E-38 | Dispute form and the reason requirement | DIVERGES |
| E-39 | Confirm is still allowed during an open dispute | SAME |
| E-40 | "Unable to resolve" waits 24 h after the dispute opened | DIVERGES |
| E-41 | After "Unable to resolve" | DIVERGES |
| E-42 | 48 h auto-confirm | APP-ONLY |
| E-43 | Decided-dispute views (paid_worker / cancelled_refunded / already_handled) | APP-ONLY |
| E-44 | Rating after confirm | DIVERGES |
| E-45 | "Report a request" on the request screen | WEB-ONLY |
| E-46 | Worker-raised review (ID not confirmed / no-show) as the requester sees it | DIVERGES |
| E-47 | Home card per state (pill + sentence) | DIVERGES |
| E-48 | What makes a card "needs you" | DIVERGES |
| E-49 | Order of cards on Home | DIVERGES |
| E-50 | Home headline | SAME |
| E-51 | An open dispute on the Home card | DIVERGES |

**Counts:**
- SAME 17
- DIVERGES 23
- APP-ONLY 9
- WEB-ONLY 2
- DECLARED 1

---

## 1. Offers, bids, counter-offers

### E-1: The requester's offer actions are Hire / Deny / Message (no Consider)
- APP: `app/src/component/live/OffersSheet.js:107-133`
  - Quote: `{busy === "hire" ? "Hiring…" : hireLabel}` … `"Deny"` … `Message`.
  - Every offer card (answers, counter-offers, bids) carries exactly these three.
  - Header `:3-4`: "Change "Accept" to "Hire" and "Decline" to "Deny"".
- WEB: `web/gopher-request.html:26573-26577`
  - Quote: `data-wact="hire">Hire` / `data-wact="deny">Deny` / `data-wact="message">Message`.
  - `:26645-26656`: "CONSIDER IS CONNECT-ONLY — removed from Request 2026-10-14". A legacy `considered` worker is folded back into Interested with the same three buttons.
- SERVER: involved only as the target of Hire. A Hire on an answer is `PUT orders/gopherorder/:id/accept` (`server/controllers/order/index.js:330`, `order_gophers.js:270`).
- VERDICT: SAME
- CONFIDENCE: high. Neither UI was driven.

### E-2: Who is hired without the requester choosing
- SERVER: `server/controllers/order/update.js` (inside `assign_order`):
  - `:4923` `isNonProGopher = +users_roles.gopher_type_id === 0`;
  - `:4960` `distance_exceeded = true` when the distance is `> NEED_APPROVAL_ON_EXCEED_DISTANCE` (= 15, `constants/index.js:816`);
  - `:4969` `(get_order.selectgopher || distance_exceeded)` creates an OrderGophers answer the requester must Hire;
  - `:4989` `auto_connect_fav` (MY Gopher, not far) is assigned straight away;
  - otherwise a First Available claim assigns directly.
- APP: no client rule. It renders what the server returns: `select_my_gopher` / `counter_offers` / `order_bids` from `GET orders/:id` (`app/src/component/requestOrder.js:333-341`).
- WEB: `web/gopher-request.html:25310-25325`:
  - `_mode === 'first'` hires the first interested worker unless `needsDistanceApproval`;
  - `'my'` hires a MY Gopher who is not far;
  - `'select'` is always a candidacy.
  - `needsDistanceApproval` (`:26199-26202`) = Standard tier and `> 15` mi.
- VERDICT: SAME. The web simulates the server's branch: same tiers, same 15 mi.
- CONFIDENCE: medium.
  - The web's pool is demo data.
  - I did not check that the web's distance reference (drop-off) equals the server's (`update.js:4947-4955` measures to the PICK-UP, or the drop-off when there is none or `purchase_anywhere`).

### E-3: A request hires exactly one worker
- APP / SERVER: once one offer is hired, the server invalidates the rest (`InvalidateCounterOffers` `update.js:4585`, `InvalidateSelectMyGophers` `:4636`). The sheet re-reads the order (`OffersSheet.js:193-196`). There is no client cap.
- WEB: `web/gopher-request.html:26658-26659`
  - Quote: `needed = 1` "Request hires exactly ONE worker".
  - `:27075-27079`: `if(hiredCount >= needed){ showHireCapModal(needed); return; }`.
- VERDICT: SAME (one hire). The mechanism differs.
- CONFIDENCE: medium. I did not read the two Invalidate* bodies.

### E-4: Hiring a busy Standard worker is refused
- SERVER: `server/controllers/order/update.js:4818-4840` (in `assign_order`, so it runs on a requester's Hire too). A Standard Gopher with an order in `IN_PROGRESS_STATES` gets 400 `'Gopher can only claim one request at a time!'`.
- APP: `app/src/component/live/OffersSheet.js:189-204`. `run()` shows the server's sentence with `showAlert`.
- WEB: `web/gopher-request.html:27068-27074`. `list[i].busy` opens `G40_REQ.selectedGopherBusy` (`:18278`), "That Gopher is on another job … Message the Gopher / Choose another Gopher". The `busy` flag exists only on a seed (`:24888-24889`).
- VERDICT: SAME (both refuse the hire). The words differ: the web offers Message; the app shows the server's raw sentence.
- CONFIDENCE: medium. The app path is inferred from server code plus the generic alert, not driven.

### E-5: Bid card number and how a bid is hired
- APP:
  - `OffersSheet.js:343` `price={money(b.offer)}` (the worker's offer).
  - `:344` Hire goes to `hireBid` (`requestOrder.js:585-623`): `POST orders/summary`, then the review sheet's Submit (`:1308-1318`, "Hiring a bid keeps today's review-and-pay step").
  - The card also shows the bid's comment (`OffersSheet.js:357-359`) and the bid's OWN `b.cost_of_goods` (`:351-355`).
- WEB:
  - `web/gopher-request.html:26589-26595`: "⛔ WEB-ONLY, owner 2026-10-15: the bid NUMBER is the ALL-IN total … the web hires straight away".
  - `:26609` shows `usd(window.__bidAllIn(r, w))`.
  - Hire calls `startJob` directly (`:27127`, `:27418`).
- SERVER: `PUT orders/bid/:id` (`index.js:343-345`), app only.
- VERDICT: DECLARED. The owner ruling is recorded in the code comment and, per the prior log, as canon RQ-47 (inherited, not seen in canon by me).
- Not covered by the declaration, found by reading:
  - the web bid card shows no bid comment (`:26606-26613`);
  - its "Cost of items" line reads the REQUEST's `reviewSnapshot.costOfItems` (`:26605`), not the bid's own figure.
- CONFIDENCE: high for the code. The ruling itself is inherited.

### E-6: Counter-offer card
- APP: `OffersSheet.js:281-333`
  - Price `money(c.total_charge)`, struck `money(o.total_charge)`, `hireLabel={`Hire for ${money(c.total_charge)}`}`, the "Counter-offer" tag, the comment, and "What changed ›".
  - The table (`GET orders/:id/counter_offer` → `offerRows.js:62-112`) adds Hourly / Day Labor rows: Wage per worker, or Hourly wage + Number of hours, plus Number of workers.
- WEB: `web/gopher-request.html:26709-26780`
  - Same tag, comment, "What changed ›", and `Hire for ${usd(C.gmvTotal)}` / Deny / Message.
  - Rows (`:26729-26738`): `if(!isLabor) row('Cost of items'…)`, then Payment, Fees, Discount, Total. There are no labor wage/hours/workers rows.
- VERDICT: SAME (actions and totals). The labor row set differs; that is display only.
- CONFIDENCE: high (reading).

### E-7: The distance line only for a far worker needing approval
- APP: `offerRows.js:150-155`. `if (!item?.require_distance_approval) return null;` then `${d} mi from your drop-off`.
- WEB: `web/gopher-request.html:26603-26604`. `(firstAvailable && !isLive && distMi != null && needsDistanceApproval(w))` gives the same words.
- SERVER: `update.js:5033` `order_gopher_data.require_distance_approval = true` when `distance_exceeded` (Standard only, `:4923`; 15 mi `constants/index.js:816`).
- VERDICT: SAME
- CONFIDENCE: high (same threshold, same words). The distance reference caveat is as in E-2.

### E-8: The waiting card says how long the request stays open
- APP: `app/src/component/home/homeCards.js:64-77`, `openFor()`: "open for N more min" / "open for about N more hours" from `delivery_eta`; blank once passed. It is used at `:305-313`.
  - node: `pending_no_offers | calm | SUBMITTED | Looking for your worker… · open for about 3 more hours`.
- WEB: not found by these searches over the dashboard range (`:20012-33590`): `open for|more hours|more min|Looking for your worker|Finding your worker|time left|expires in`.
  - The web card sub is `[r.worker, r.when]` (`:26041`), e.g. "2 workers interested · Today, 4:30 PM · awaiting your selection".
- SERVER: `delivery_eta` (data only).
- VERDICT: APP-ONLY
- CONFIDENCE: high

### E-9: Live interest keeps a request open past its time
- SERVER: `server/middleware/crons.js:579-628`, `expire_orders`.
  - A pending order past `delivery_eta` expires only when it has no pending counter, bid or Gopher acceptance ("OWNER 2026-10-09 … LIVE INTEREST KEEPS A REQUEST OPEN").
  - The backstop is `delivery_eta + LIVE_INTEREST_MAX_HOURS` (`:70-78`, default 48, "A DEFAULT CHOSEN BY THE ENGINEER, NOT YET RULED ON BY THE OWNER", `:607-608`).
- APP: `homeCards.js:64-66`, "an order can stay open past it while offers are out (middleware/crons.js), so we never say 'expired'".
- WEB:
  - `G40_REQ.expiredInterestedWorkers` (`web/gopher-request.html:18279`) says "Your request expired — workers are interested … View interested workers / Cancel request".
  - It opens from the DEMO bar `__g40ExpirySimBar` (`:18291-18296`, no PT gate). The bar renders on a pending request with interested workers and no hire (`:26898`, `:26910`).
  - The web never expires an active request. Not found by these searches: `expiredRequests\.(unshift|push)|status *= *'expired'|statusLabel *= *'Expired'|delivery_eta`.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the web describes, and its demo produces, "your request expired, workers are interested". The server keeps such a request open until the requester chooses or cancels.
  - **Order state:** a pending request past its open-until time with 2 pending Gopher acceptances.
    - App: still on Home as NEEDS YOU, the offers are hireable.
    - Web demo: "Your request expired".
- CONFIDENCE: high (reading).

### E-10: Expired with no interest: "No worker found"
- APP: `homeCards.js:145-154`.
  - `pill: "NO WORKER FOUND"`, grey; `Ended ${ended} · tap for options`.
  - Kept on Home 24 h (`:119-128`), fetched from history (`app/src/component/requestHeader.js:231-244`).
  - Tap → `NoGopherFoundPage.js:40-89`: "No worker took this request", "worker accepted in time. You weren't charged.", "Request again".
- WEB:
  - No expiry of active requests (searches as E-9).
  - Expired requests exist only as Request History seeds (`:24642-24647`, "No workers accepted within the scheduled window").
- SERVER: `crons.js:584-628` sets `expired`; `server/middleware/cronTasks.js:64-100` cancels the authorization.
- VERDICT: APP-ONLY
- CONFIDENCE: high

## 2. Cancellation

### E-11: When the requester may cancel
- APP: `app/src/services/requesterCancelWindow.js:29-36`, `REQUESTER_CANCELLABLE_STATES = ["pending","scheduled","accepted"]`. The Cancel button is gated by it (`requestOrder.js:1161`).
- SERVER:
  - `server/controllers/order/cancel.js:46-51`: `job_has_started` = picked_up / purchased / delivered.
  - `:99-112`: a requester cancel there is refused with `STARTED_REFUSAL` (`:57-58`), "Your Gopher has already started this request…".
- WEB:
  - `web/assets/js/gopher-request-logic.js:318-326`: `CANCEL_BLOCKED_STATUSES = ['in-progress','active','completed']`.
  - `gopher-request.html:26495-26499` hides "Cancel request"; `:25499-25506` routes to "This request is already in progress".
  - A hire sets `r.status = goScheduled ? 'scheduled' : 'in-progress'` (`:27421-27423`) at the moment of hiring.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the app (and server) lets the requester cancel until the worker taps "In Progress" (`picked_up`). The web blocks cancel the moment a worker is hired, because a hire is already "in-progress" there.
  - **Order state:** an on-demand request just hired, `aasm_state = accepted`, worker not started.
    - App: "Cancel request" is shown, free, with "Find a different worker".
    - Web: the Cancel button is hidden; the modal says "Your Gopher has started, so it can't be cancelled here."
- CONFIDENCE: high

### E-12: Cancel with a worker booked offers "find a different worker" (repost)
- APP:
  - `requestOrder.js:1367-1371`: `canRepost={ !!request?.gopher?.id && (aasm_state === "scheduled" || aasm_state === "accepted") }`.
  - `app/src/component/modals/CancelReasonSheet.js:357-406`: "{name} is booked for this", "Find a different worker", "Your request stays on for the same time, and your card is not charged or refunded", "Message {name}", "Cancel it altogether", "Keep my worker".
  - Repost = `PATCH /orders/:id/repost` (`requestOrder.js:689-716`).
- SERVER: `server/controllers/order/repost.js:120`, `REPOSTABLE_STATES = [SCHEDULED, ACCEPTED]`.
- WEB:
  - `web/gopher-request.html:25507-25510`: the repost modal opens only for `r.status === 'pending' && hasHired` ("Repost to new Gophers", `:25743-25755`).
  - Every hire path calls `startJob` at once (`:27127`, `:27924`, `:25421-25423`; PT `hire()` too). So pending-with-a-hire does not persist on these paths.
  - A scheduled hired request falls to the generic confirm (`:25515-25518`; markup `:20634-20642`, "Cancel this request? … Yes, cancel request").
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the app offers repost or cancel on scheduled and accepted requests with a worker. The web never reaches its repost modal, and a scheduled hired request gets only "Yes, cancel request".
  - **Order state:** a scheduled request a worker has booked (`aasm_state = scheduled`, `gopher_id` set).
    - App: the fork with "Find a different worker".
    - Web: the generic cancel only.
- CONFIDENCE: medium-high. "Unreachable" is from reading every hire path I found; not driven.

### E-13: Cancel needs a reason; the scheduling-conflict intercept; the 24 h repost-reason rule
- APP:
  - `app/src/services/cancelReasons.js:40-51`: six reasons, "Other" needs 3 words (`:94-98`).
  - `CancelReasonSheet.js:240-247` and `:408-428`: "Scheduling conflict" intercepts with "Ask {name} about a different time … Message {name} / No — cancel the request".
  - `cancelReasons.js:129-135`: a repost needs a reason only within 24 h of the scheduled time.
  - `submitCancel` sends `cancellation_reason` (`requestOrder.js:653-660`).
- SERVER: `repost.js:165-179`, `reason_required = !(hours_until > 24)`; `cancel.js:69` reads `cancellation_reason` (optional, `|| null`).
- WEB: the generic (`:20634-20642`), early (`:25658-25678`) and accepted (`:25743-25755`) cancel modals collect no reason. The record gets `reason: 'Cancelled by you'` (`:25532-25538`).
- VERDICT: APP-ONLY
- CONFIDENCE: high

### E-14: Cancelling a request nobody has taken yet
- APP:
  - `requestOrder.js:1353-1357`: the reason sheet subtitle "No worker has taken this yet, so cancelling is free. Telling us why takes a second."
  - Then the reason list and `PATCH /orders/:id/denied` (`:653-661`).
- WEB: `web/gopher-request.html:25622-25715`, the early-cancel modal.
  - Variant A (≤ 20 min and > 20 Gophers nearby): "Hang tight — a Gopher's likely close … Still need it — keep looking".
  - Variant B: "Still need it — re-alert Gophers".
  - "Still need it" shows "We've sent a fresh alert to Gophers near you" (`:25680-25688`) and makes no call.
- SERVER:
  - No re-alert call was found in the app's cancel path (searched `requestOrder.js`, `CancelReasonSheet.js`).
  - `server/helpers/order_rebroadcast.js` exists; it was not traced.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the web puts a "keep looking / re-alert Gophers" step before cancelling a broadcasting request. The app goes straight to the reasons.
  - **Order state:** a pending request with no offers. The app shows the reason sheet; the web shows "Still want us to keep looking?".
- CONFIDENCE: medium

### E-15: A requester cancel before the worker starts is free
- APP:
  - `CancelReasonSheet.js:471-473`: "…held this time for you … it is free to cancel before they start".
  - `:477-499`: the fee band is "GOPHER SIDE ONLY … a REQUESTER cancelling before the Gopher starts … pays NOTHING".
- SERVER: `cancel.js:18-21`, "a requester may cancel, free, until the Gopher starts … the post-start $5 is G40-324, Phase II, and is NOT charged here". The refund is at `:527-536`.
- WEB:
  - `web/gopher-request.html:25725-25727`: "no cancel fee before the job starts".
  - `:25747-25748`: "…hasn't started yet, so you're free to make a change — no fee."
- VERDICT: SAME. Neither charges a requester cancel fee. The window differs (E-11).
- CONFIDENCE: high

### E-16: Edit a request while it is pending
- APP: `requestOrder.js:1163-1172`. `aasmState === "pending"` shows "Edit", and `onTappedEdit` (`:489-545`) re-opens the flow.
- WEB: not found by these searches over the dashboard range: `Edit request|editRequest|data-edit-req|reqDetailEdit`. The only "Edit request" is the gopher-cancel recovery (`:31814`, E-18).
- VERDICT: APP-ONLY
- CONFIDENCE: medium (search-based on the web side).

### E-17: The web list-card ✕ cancels a request in any state
- WEB:
  - `web/gopher-request.html:26112-26114`: the ✕ renders for every `r.userCreated` card, whatever its status.
  - `:26141-26153`: it calls `__openCancelModal(doDelete)`, legacy mode A (`:25488-25489`). That shows the generic confirm, and Confirm runs `cb()` (`:25606-25607`), which splices the record.
  - So `jobBlocksCancel` and the started note are bypassed, and nothing is filed to Cancelled.
- APP: no equivalent door found. Every app Cancel reads `requesterCanCancel` (`requesterCancelWindow.js:24-27`), and the server refuses after start (`cancel.js:99`).
- VERDICT: WEB-ONLY (a web defect)
- CONFIDENCE: high (reading; not clicked).

### E-18: Worker cancels an accepted job: the requester's recovery choices
- APP: `app/src/component/ReleaseRecoveryWatcher.js:604-688`, the "Worker cancelled" page.
  - "{name} cancelled your request" and "{name}'s reason: …".
  - "Assign new worker" (`PATCH /orders/:id/keep_listed`, `:505-529`).
  - "Cancel request", which opens the reason sheet (`:690-708`) and sends `DELETE /orders/:id` with `cancellation_reason` (`:556-589`).
  - `:530-544`: "NO EDIT HANDLER … Owner ruling 2026-09-02: block the edit (option B)".
  - The clock is the server's `release_expires_at` (`app/src/helpers/gopherRelease.js:13-26`): the earlier of +15 min and the card hold's expiry − 5 min.
- WEB: `web/gopher-request.html:31793-31827`.
  - "Assign New Gopher ASAP".
  - **"Edit request** — Adjust the details, cost of items, or payment, then repost under a new order #".
  - "Cancel request — … Rate the Gopher who cancelled".
  - A fixed 15:00 client timer (`:31896-31913`).
  - Opened by "Simulate: Gopher cancelled ▸" (`:22927`) or PT.
- SERVER: `cancel.js` (G40-9 / G40-484 model), `helpers/gopher_release_window.js` (not read).
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the web offers Edit-and-repost, which the owner blocked on the app on 2026-09-02. The web's cancel rates the worker and asks no reason; the app's asks a reason. The web timer is a flat 15 min; the app's is the server deadline.
  - **Order state:** an accepted order whose worker cancelled (`release_expires_at` set).
    - App: two choices, no Edit.
    - Web: three choices, including Edit.
- CONFIDENCE: high (reading).

### E-19: Card declined after a worker accepts
- SERVER: `update.js:4475-4520`. On a failed charge at assign: `payment_status: REQUIRE_PAYMENT_METHOD`, `stripe_error: decline_reason`, and every counter, answer and bid is deleted (`:4489-4516`).
- APP:
  - `homeCards.js:155-166`: `pill: "PAYMENT FAILED"`, red, with the decline reason or "Your card was declined · update payment info".
  - Tap (`requestHeader.js:276-287`) → `PaymentFailedSheet.js:65-89`: "Update your card to keep this request" / "Update payment info". That re-opens the request to resubmit.
- WEB: `G40_REQ.paymentNotAuthorized` (`web/gopher-request.html:18251`): "Update your card in the next **5 minutes** and we'll reassign it to them. If they're no longer available, we'll rebroadcast…".
  - It is reachable only through the DEMO bar `__g40PayDeclineBar` (`:18283-18288`). That bar renders only when a request has a hired worker in the not-started branch (`:26896`, `:26908`), a state that `startJob` leaves at once (E-12).
  - No 5-minute reassign window found in the server by these searches (controllers/order, helpers, middleware, constants): `5 ?min|five minutes|300000|REQUIRE_PAYMENT_METHOD`.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the web promises a 5-minute reassign to the same worker. The server drops all offers and marks the order `requires_payment_method`, and the app sends the requester to resubmit.
  - **Order state:** `payment_status = requires_payment_method` after a hire.
- CONFIDENCE: medium (the web modal is effectively unreachable on live).

## 3. Reschedule and cost adjustments

### E-20: Worker asks for a new time (reschedule)
- APP:
  - `homeCards.js:225-233`: NEEDS YOU "{name} asked for a new time".
  - `requestOrder.js:1098-1114`: a NEEDS YOU card opens `RescheduleSheet.js:27-53`, "New time requested", "Accept {new}" / "Keep {old}".
  - Calls: `PATCH /orders/:id/accept/rescheduled`, `DELETE /orders/:id/declined/rescheduled` (`requestOrder.js:718-792`).
- SERVER: `controllers/order/re_schedule.js` (only the assigned Gopher may raise one, per `requestOrder.js:553-559`; not read first-hand).
- WEB: not found by these searches over the dashboard range: `reschedul|new time|different time`. The only hit is a history seed string at `:24640`.
- VERDICT: APP-ONLY
- CONFIDENCE: high

### E-21: Cost adjustment: approve changes the total, decline keeps it
- APP: `app/src/component/live/useCostAdjustment.js:44-67`. `PUT orders/:id/cog/accept` or `/cog/decline`, then re-read.
- SERVER: `server/controllers/order/cost_adjustment.js:783-836`, requester decline: the adjustment goes inactive, the Gopher is notified, the price is unchanged ("Sucessfully declined"). `accept_cog` is at `:866`.
- WEB: `web/gopher-request.html:27789-27808`. Approve copies the adjusted fee object, so the total becomes the adjusted total; decline deletes `pendingAdjustment` and the price is unchanged.
- VERDICT: SAME
- CONFIDENCE: high

### E-22: Which states show a cost adjustment
- APP:
  - `requestOrder.js:1090-1097`: `isLiveState && localFormProps.hasActiveCog`, where `isLiveState` = accepted / scheduled / picked_up / purchased / delivered (`:836-839`).
  - During a dispute: `Orderdispute.js:399-419`, a NEEDS YOU card plus a read-only "Cost adjustment approved" view.
- SERVER: `cost_adjustment.js:140`. `create_cog` refuses only a cancelled order.
- WEB: `web/gopher-request.html:26926`, `_showAdj = (r.status === 'in-progress' && r.pendingAdjustment)`.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the web shows an adjustment only on `in-progress`; the app shows it in every live state, plus a read-only "approved" view during a dispute.
  - **Order state:** a scheduled request with a booked worker who sends an adjustment.
    - App: a NEEDS YOU card.
    - Web: nothing.
  - The web's awaiting-confirmation record keeps `status: 'in-progress'` (`:25215`), so that case does show.
- CONFIDENCE: medium (web adjustments arrive only from seeds or PT).

### E-23: Receipt rule on a cost adjustment
- APP: `CostAdjustmentSheet.js:41-44`, `<CostAdjustmentReceipt src={adj.receipt?.src} missing={adj.receipt_missing} />` (`receipt_missing` comes from the server).
- WEB: `web/gopher-request.html:27505-27516`.
  - The photo if attached; "No receipt provided" when the cost of items went up with no photo; nothing otherwise.
  - "Compared in cents, as the server does".
- SERVER: `helpers/cost_adjustment_receipt.js` (not read first-hand).
- VERDICT: SAME
- CONFIDENCE: medium. The server's `receipt_missing` rule is inherited from the web comment.

### E-24: Confirm is refused while a cost adjustment is unanswered
- SERVER: `update.js:1928-1938`, `find_pending_cost_adjustment` → `res.status(400).json(cost_adjustment_pending_payload())`, "Please wait for Cost Adjustment Accept Or Decline" (`:93-94`).
- APP: Confirm makes no client check. The server's 400 surfaces through `serverAlert` (`Orderdispute.js:142-161`).
- WEB: `resolveCompletion` (`web/gopher-request.html:27635-27645`) has no adjustment check. Confirm shows "Completion confirmed — receipt emailed, payment released".
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** with an unanswered adjustment, the server refuses Confirm; the web confirms.
  - **Order state:** delivered, an `OrdersCogs` row with `active: null`. App: alert "Please wait for Cost Adjustment Accept Or Decline"; web: confirmed.
- CONFIDENCE: medium. The web can hold both states only through a seed or PT.

### E-25: No requester-side cap on counter-offers or adjustments
- SERVER:
  - Counter cap: `counter_offer.js:99-112`, on the WORKER's submit: "Counter offer exceeds the allowed limit!".
  - No cap found in `create_cog` (searched `cap|max|limit|percent` in `cost_adjustment.js`; only the multer file limit).
- APP / WEB: neither client caps what the requester can accept (OffersSheet / CostAdjustmentSheet; web `:27789-27808`, `:27896-27925`).
- VERDICT: SAME
- CONFIDENCE: medium

## 4. Messaging

### E-26: When chat is available
- APP:
  - Before a hire: Message on an offer card goes to that worker (`requestOrder.js:562-580`, `recieverId: item?.gopher_id`).
  - After a hire: Text / Call on the live band (`:1065-1071`).
  - During a dispute: Text / Call (`Orderdispute.js:274-298`).
  - After escalation: still "Text or call is still available" (`pages/unresolvedDispute.js:109-124`).
- WEB:
  - Message on a candidate (`web/gopher-request.html:27087-27092`, `openInboxThread(r.id + '::' + list[i].name)`).
  - Text / Call on the assigned card (`:26840-26849`).
  - The dispute copy says "You can also still message and/or call your Gopher" (`:28168`).
- VERDICT: SAME
- CONFIDENCE: high

### E-27: Pre-send warning: detector and escalation
- APP:
  - `app/src/component/InAppMessage.js:561-595`: `askPrecheck` → `POST orders/faq/precheck`. "A courtesy, never a gate"; it warns only on `verdict === "warn"`.
  - `chatWarnings.js:17-20`: "The server decides everything".
- SERVER:
  - The corpus has 11 categories (`server/helpers/moderation_rules.json` `categories`).
  - Only payment / circumvention can block (`helpers/conversation_block.js:43`; header `:9` "contact / social / conduct never block").
- WEB: `web/assets/js/gopher-message-guard.js:100-180`, a local regex check in 4 families (payment, contact, off_platform, conduct).
  - Escalation is PER USER (`:345`).
  - `blockAtLevel: 3` (`:90`).
  - Conduct level 3 = `verdict: 'block'`, "Message Not Sent" (`:244-245`).
  - Off-platform is always `'warn'` (`:351`).
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the web refuses to send a 3rd conduct hit outright and escalates per user. The server never blocks conduct; it only flags it.
  - **Order state:** any chat, the requester's third profane message.
    - Web: "Message Not Sent".
    - App / server: flagged, not blocked.
  - The two detectors (web regex vs server corpus) were NOT compared case by case.
- CONFIDENCE: medium

### E-28: "Send anyway" on payment / off-app: the conversation is blocked, hired or not
- SERVER: `conversation_block.js:72-83`. `would_block` = `enabled() && warned === true && categories ∈ {payment, circumvention}`; "it applies HIRED or not" (R1 + R2, `:11-12`). The switch is `CONVERSATION_BLOCK` (`:53-55`); its live value is env and was not checked.
- APP:
  - `chatWarnings.js:49-53`: `BLOCKING_LIVE = true`, "Send anyway: it will be flagged, and this conversation will be blocked while our team reviews it".
  - `InAppMessage.js:634-656`: `warning_shown: true`; a 400 with `blocked` closes the composer.
  - `chatWarnings.js:61-80` `blockView`: "This conversation is blocked."
- WEB:
  - "Send as-is" → `onAllow` → `sendInboxMessage(t.id, text, true)` (`web/gopher-request.html:24460`), which pushes `{…, f:1}` (`:24513`).
  - No blocked-conversation state found in the Request inbox. Searched the dashboard range for `withheld|conversation is blocked|convBlocked|threadBlocked|blocked_user`; the only hits (`:30734`, `:30952`) are unrelated.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** in the app a sent-anyway payment or off-app message blocks the conversation for both people until review. On the web the message goes out flagged and the chat carries on.
  - **Order state:** a hired order; the requester sends "I'll pay you on Venmo instead" and picks Send anyway / Send as-is.
- CONFIDENCE: medium (the server switch state was not verified, so live server behaviour is inherited).

### E-29: Contact details: withheld before hire, allowed after
- SERVER:
  - `conversation_block.js:64` and `:97-105`: contact / social is withheld from the recipient when `connected === false`, and the chat stays open.
  - `helpers/message_guard.js:66-71`: connected = `order_accepted_on` is set.
  - Allowed after hire (`moderation_rules.json` `context_rules.contact_on_connected_order`).
- APP: renders the server's verdict. A withheld message shows `WithheldBubble` and "Hidden: flagged for review" (`InAppMessage.js:1781-1783`, `:1888-1890`); the sender sees "Flagged" (`:1885-1887`).
- WEB:
  - The contact family is skipped when connected (`gopher-message-guard.js:332`). Connected means that worker is hired or on the crew (`web/gopher-request.html:24441-24456`). That matches the server after hire.
  - Before a hire, Send as-is delivers the text readable, with the note "This message was flagged for a possible terms violation." for the recipient (`:24178-24183`).
  - The sender's own copy shows no tag ("our own side renders clean", `:24510-24513`).
- VERDICT: DIVERGES (before hire; after hire is the same)
- IF DIVERGES:
  - **Difference:** before a hire, the server withholds the text from the worker. The web delivers it readable with a note.
  - **Order state:** pending, a Message to a candidate: "text me 919-555-1234" → Send anyway.
    - App / server: the worker sees "Hidden: flagged for review".
    - Web: the number is readable (reaches a worker only via PT).
- CONFIDENCE: medium

### E-30: A withheld message stays hidden from the recipient
- APP: `InAppMessage.js:1781-1783`, `!isMyMessage && item.withheld ? <WithheldBubble />`; tag at `:1888-1889`. The owner ruling "keep hidden" after hire is applied server-side (`conversation_block.js:86-96`).
- WEB: `renderInboxMsg` (`web/gopher-request.html:24177-24196`) always renders `m.text`. No `withheld` field was found (searches as E-28).
- VERDICT: APP-ONLY
- CONFIDENCE: high

### E-31: Photos in chat
- APP: `InAppMessage.js:614-618` and `:671-690`, an image sent through `orders/faq/image_send`.
- WEB: `web/gopher-request.html:24512` (photo message) and `:24405`, the 10 MB limit "as the app's".
- Neither runs the text guard on a photo (by reading); the server's image path was not read.
- VERDICT: SAME
- CONFIDENCE: medium

## 5. Live states

### E-32: State right after a hire
- SERVER:
  - `update.js:5348`, `aasm_state: ORDER_STATUS.ACCEPTED` (on-demand).
  - `:5208`, `ORDER_STATUS.SCHEDULED` (`request_schedule_later`).
  - The worker later moves it to picked_up ("In Progress"), then purchased, then delivered.
- APP:
  - `homeCards.js:272-285`: `pill: "ACCEPTED"`, `${name} accepted · ★ r`.
  - `requestOrder.js:865-876`: livePill accepted = "Accepted"; band "{name} accepted" (`:1056-1059`).
  - It reads `aasm_state` from the 7.5 s `GET orders/:id` poll (`:265-399`, interval `:454-460`).
  - node: `accepted_ondemand | calm | ACCEPTED | Marcus accepted · ★ 4.9`.
- WEB: `startJob` (`web/gopher-request.html:27421-27435`).
  - `r.status = goScheduled ? 'scheduled' : 'in-progress'`, `statusLabel 'In Progress'`.
  - `r.when = 'Started just now · matching complete'`.
  - The web has no state between "hired" and "started".
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the app shows "Accepted" until the worker starts. The web shows "In Progress" from the moment of hire.
  - **Order state:** `accepted`, worker not started. App "ACCEPTED"; web "In Progress".
- CONFIDENCE: high

### E-33: Live step bar
- APP: `app/src/component/live/liveStatus.js:22-51`.
  - Steps: Accepted (≥ accepted), In progress (≥ picked_up), and "Item purchased" / "Item picked up" ONLY for Delivery, Custom Task, or a Mulch Project with delivery. Then Completed.
  - `ORDER_STATE` has no `scheduled`, so a scheduled order shows nothing done.
  - node:
    - `steps picked_up moving: Accepted ✓, In progress ✓, Completed (current)`;
    - `steps scheduled: Accepted (current, not done)…`.
- WEB:
  - `startJob` (`web/gopher-request.html:27458-27462`): `[Accepted ✓, In-Progress ✓, Items Purchased, Completed]` for every category.
  - `:28321-28324` relabels the item row "Items Picked-Up" when nothing was bought.
  - Scheduled: `[Accepted ✓, Scheduled ✓, In-Progress, Completed]`.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the web ticks In-Progress at hire and shows an items step on every category. The app ticks In progress only at picked_up, and shows an item row only on goods runs.
  - **Order state:** a Moving request just hired (`accepted`).
    - App: Accepted ✓ · In progress (current) · Completed.
    - Web: Accepted ✓ · In-Progress ✓ · Items Picked-Up (current) · Completed.
- CONFIDENCE: high (node run on the app; web read).

### E-34: No-show ID-check countdown
- APP:
  - `app/src/helpers/noShow.js:53-81`: `noShowStateFrom`, 10 min from `requestor_reminded_at`, only in purchased / picked_up.
  - Shown on the order screen (`requestOrder.js:811-823`, `:924-935`) and app-wide (`NoShowWatcher.js`).
  - Words (`NoShowBanner.js:26-71`): "Your worker is at your door to check your ID", MM:SS; expired: "ID check missed".
- WEB: `web/gopher-request.html:28005-28024`. The function body diffs IDENTICAL to the app's apart from one space (checked with `diff`).
  - `in-progress` maps to `purchased` (`:28031-28033`).
  - Words (`:28116-28137`): "{who} is waiting at your drop-off … 10-minute window"; expired: "The wait window has passed … they may still be able to complete the delivery."
  - The fields arrive only through PT (`gopher-web-pt-bridge.js:414-422`).
- SERVER: the fields are served on `GET /orders/:id` while purchased / picked_up (per the `noShow.js` header; not re-read).
- VERDICT: SAME (gate, window and clock). The expired wording differs in tone.
- CONFIDENCE: high

## 6. Completion, dispute, rating

### E-35: Confirm only after the worker's photo step resolves
- APP:
  - `app/src/helpers/photoStep.js:35-39`: `delivered && photo_step_resolved === false && !disputed`.
  - `openRequest.js:23-29` routes to confirm only when resolved.
  - `homeCards.js:234-251`: "WRAPPING UP · {name} marked it complete" (calm) vs "NEEDS YOU … confirm or dispute".
  - Guards: `requestOrder.js:380-399`, `Orderdispute.js:115-121`.
  - node: `delivered_photo_pending | calm | WRAPPING UP … tap-> requestorder`.
- SERVER:
  - `server/controllers/order/retrieve.js:3948`, `response.photo_step_resolved = photo_step_resolved(...)`.
  - Rule: `server/helpers/photo_step_resolution.js:55-64`.
- WEB:
  - No photo-step field found (searched `photo_step|photoStep` in the dashboard range).
  - `buildCompletionBlock` shows Confirm as soon as `awaitingConfirmation` (`:28154-28194`).
  - PT sets `awaitingConfirmation` at Complete with or without photos (`gopher-web-pt-bridge.js:696-716`).
- VERDICT: APP-ONLY
- CONFIDENCE: high

### E-36: Confirm completion finalizes, then rating
- APP:
  - `app/src/component/live/CompletedView.js:18-19`: "Confirming finalizes your order and emails your receipt. It can't be cancelled or refunded after."
  - `Orderdispute.js:123-142`: `POST orders/confirm_payout/:id`, then the rating screen.
- WEB:
  - `web/gopher-request.html:28186-28192`: "Selecting Confirm completion will finalize your order … cannot be cancelled or refunded."
  - `resolveCompletion` (`:27635-27645`): the toast "Completion confirmed — receipt emailed, payment released", then the rating overlay.
- SERVER: `update.js:1870` onward, `confirm_order_payout`.
- VERDICT: SAME
- After confirm, the two differ in where the request goes:
  - App: it leaves Home, because the v3 list keeps delivered orders only while `payment_status` ∈ authorized / pending / requires_payment_method (`retrieve.js:1172-1189`).
  - Web: it stays as "Completed" with "Rate now →" (`:28160-28162`).
- CONFIDENCE: high

### E-37: A dispute can be raised only on a worker-completed, unpaid order, once
- SERVER: `server/controllers/order/report_dispute.js:105-118`. "To raise a dispute, the order needs to be delivered first." / "A dispute request has already been raised".
- APP: "Something wrong? Dispute" appears only on the delivered confirm screen (`CompletedView.js:75-83`).
- WEB: Dispute appears only in the awaiting-confirmation block (`web/gopher-request.html:28191`).
- VERDICT: SAME
- CONFIDENCE: high

### E-38: Dispute form and the reason requirement
- APP:
  - `app/src/component/live/DisputeViews.js:55-125`: "What went wrong?" with chips (`dispute.js:14-20`: Not finished / Missing or wrong items / Damage / Late / Other), then "Details".
  - Submitted as `"Reason: details"` (`dispute.js:22-26`).
- SERVER: `report_dispute.js:198-217`, `MIN_DISPUTE_REASON = 10`. A 400 with "Please tell us what went wrong before opening a dispute…".
- WEB:
  - `web/gopher-request.html:28164-28171`: one free-text box, "Enter a comment".
  - `:27028-27033` submits any text, including empty, sets `disputeState = 'disputed'`, and shows the toast "Dispute submitted — your Gopher has been notified."
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the web opens a dispute with an empty reason and has no reason chips. The server refuses anything under 10 characters.
  - **Order state:** awaiting confirmation; the requester taps Submit with the box empty.
    - Web: the dispute opens.
    - App / server: refused, "Please tell us what went wrong…".
- CONFIDENCE: high

### E-39: Confirm is still allowed during an open dispute
- SERVER: `update.js:1969`, "⛔ A DISPUTE MUST NOT BLOCK THE REQUESTER'S OWN CONFIRM".
- APP: `DisputeViews.js:226-234`, "Resolved? Confirm completion".
- WEB: `web/gopher-request.html:28178-28179`, "If your request has been resolved … please confirm below. / Confirm completion".
- VERDICT: SAME
- CONFIDENCE: high

### E-40: "Unable to resolve" waits 24 h after the dispute opened
- SERVER:
  - `retrieve.js:3634-3639`: `is_dispute_unable_to_resolve = hoursSinceDispute < DISPUTE_LOCK_HOURS` (= 24, `constants/index.js:42`).
  - The `PUT unable_to_dispute` handler (`report_dispute.js:362-436`) has no time check.
- APP:
  - `Orderdispute.js:52`: `canEscalateDispute = isDisputeUnableToResolve === false`.
  - `DisputeViews.js:235-251`: the button is disabled with "Available in N h M min" (`dispute.js:31-39`).
  - node: `escalation: Available in 18 h 0 min`.
- WEB:
  - `web/gopher-request.html:28180-28181`: "Unable to resolve" is live at once.
  - `:27035` opens the escalation modal.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the app holds escalation for 24 h; the web allows it immediately.
  - **Order state:** a dispute opened 1 hour ago.
    - App: disabled, "Available in 23 h …".
    - Web: tap → "Gopher, Inc has been notified".
- CONFIDENCE: high

### E-41: After "Unable to resolve"
- APP:
  - `Orderdispute.js:441-491`: "Sent to Gopher support", then Done → `unresolvedDispute`.
  - `pages/unresolvedDispute.js:75-82`: "Pending dispute resolution · Gopher support has it", with Text / Call and the receipt, and no Confirm button.
  - Routing: `openRequest.js:30-36`.
  - Home: "Gopher support is stepping in" (`homeCards.js:190-192`).
- SERVER: `report_dispute.js:413-425` sets `unable_to_dispute: true`.
- WEB:
  - `web/gopher-request.html:27035-27036` only shows the modal; no state is written.
  - The disputed block keeps "Confirm completion" and "Unable to resolve" (`:28173-28182`); the list still says "PENDING DISPUTE" (`:26122`).
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the app moves the requester to a support-owned page and changes the Home sentence. The web keeps the requester-and-worker dispute block and lets "Unable to resolve" be pressed again.
  - **Order state:** `disputed = true`, `unable_to_dispute = true`.
- CONFIDENCE: high

### E-42: 48 h auto-confirm
- SERVER: `server/middleware/cronTasks.js:256-263`, `confirm_auto_payout`.
  - Condition: `aasm_state='delivered' … disputed=false and updated_at + interval :auto_pay_duration <= NOW()`.
  - The duration is env `AUTO_PAY_DURATION`, not readable here. "48 h" is inherited from the code comments and the FAQ (`app/src/component/home/vendor/faqs.json:548`, "Confirm or dispute within 48 hours…").
- APP: no client countdown (searched `48 \?h|48 hours|48-hour` in the app's component/pages/helpers/services/json: only the FAQ and a comment at `photoStep.js:29`). It relies on the server.
- WEB: no auto-confirm on the dashboard (searched `48[ -]?h` in the dashboard range: only the comment at `:28104`).
- VERDICT: APP-ONLY (server behaviour that the web simulation never performs)
- CONFIDENCE: medium (the duration value is inherited).

### E-43: Decided-dispute views
- APP:
  - `app/src/helpers/disputeState.js:14-21`.
  - `homeCards.js:173-184`: RESOLVED, "Gopher support paid {name} · rate them" / "Gopher support closed this dispute".
  - `openRequest.js:15-17`.
  - `DisputeResolvedPage.js:22-32`, `:54-63`: paid → "Rate {name} →"; refunded and closed → no rating.
  - `requestOrder.js:383-387` leaves the live screen once decided.
- SERVER: `server/helpers/dispute_resolution.js:63-70`, `paid_worker` / `cancelled_refunded` / `already_handled`.
- WEB: not found by these searches: `paid_worker|cancelled_refunded|already_handled|disputeResolution|dispute_resolved|dispute was settled|Gopher support paid|unable_to_dispute` (FAQ text only).
- VERDICT: APP-ONLY
- CONFIDENCE: high

### E-44: Rating after confirm
- APP: `app/src/component/rating.js:270-320`.
  - No score until a hole is tapped ("Tap a hole to rate"); Done is disabled until rated (`:314-316`).
  - One option: "Add {name} as a MY Gopher". It is unchecked unless they already are one, and it saves at once (`PATCH /favgopher/:id`, `:174-185`).
  - No recommend option, no block option.
  - Saved by `POST /ratings` (`json/requester/rating.json`).
- WEB:
  - `paintRating` (`web/gopher-request.html:27619-27630`): defaults to 5★.
  - At ≥ 4★, "Add as MY Gopher" and "Recommend … for similar jobs" are both pre-checked; at ≤ 3★, "Do not send requests to {name} again".
  - `submitRating` (`:27649-27714`) acts on them.
  - The overlay can be dismissed; "Rate now →" persists.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the web pre-selects 5★ and pre-ticks "Add as MY Gopher" + "Recommend", and offers "do not send again". The app needs a tap for any score, never pre-ticks MY Gopher, and has neither recommend nor block.
  - **Order state:** right after Confirm, the requester taps Done without touching anything.
    - Web: a 5★ rating is saved and the worker is added to MY Gophers and recommended.
    - App: Done is disabled.
- CONFIDENCE: high

### E-45: "Report a request" on the request screen
- WEB:
  - `web/gopher-request.html:22950`, "⚑ Report" on the request detail.
  - `:28055-28085`: six reasons.
  - `:26996-27026`: records `r.flagReport`. The `POST orders/:id/flag` is a seam only.
- APP:
  - No Report found on the requester's live screens. `requestOrder.js` and `Orderdispute.js` were read in full.
  - The app's "Report A Request" sheet is in `app/src/component/getOrders.js:372-378`, `:1382`, `:1449`. That is the worker-feed list inherited from the Go fork (imports `GopherOrderCardView`, radius), rendered via `json/requester/gopher.json` / `gopherrequest.json`. Whether a requester can reach it was not traced.
- VERDICT: WEB-ONLY
- CONFIDENCE: medium

## 7. Worker-raised reviews

### E-46: Worker-raised review (ID not confirmed / no-show) as the requester sees it
- SERVER: `server/controllers/order/update.js:242-262`. `routeToFraudReview` sets `disputed: true`, `dispute_reason`, `disputed_at`.
  - No-show on an ID-check order goes to review (`:3541-3551`).
  - ID not confirmed goes to review (`:3637`).
  - In both, `aasm_state` is left unchanged, NOT delivered (`:3567-3580`).
  - Reason strings: `server/helpers/age_restricted_review.js:68-71`.
- APP: `homeCards.js:185-195`. `if (item?.disputed)` → `pill: "DISPUTE OPEN"`, `${name} is making it right`.
  - node: `worker_noshow_review | hold | DISPUTE OPEN | Marcus is making it right | tap-> requestorder`.
  - The tap opens the live map in purchased / picked_up, with "ID check missed" (`NoShowBanner.js:26-36`).
  - The tell-don't-ask "No-show recorded" text exists only in `app/src/component/orderConfirmation.js:136-180`. Nothing navigates there: `rating.js:225-226` says "orderConfirmation's route is unreachable", and grep `orderconfirm` finds only the json and the renderForm case.
- WEB:
  - `buildNoShowBlock` (`web/gopher-request.html:28105-28114`): "No-show recorded … This is under review — there's nothing for you to confirm."
  - `r.noShow` is set only by PT (`gopher-web-pt-bridge.js:420`), which cannot run on the live hosts.
  - Not found by these searches: `idNotConfirmed|id_not_confirmed` (no ID-not-confirmed handling).
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the pinned app shows a worker-raised review as an open dispute ("DISPUTE OPEN · {name} is making it right"). The web shows "No-show recorded … under review".
  - **Order state:** `aasm_state = purchased`, `disputed = true`, a `disputed_pending_review` log after the worker's no-show.
  - **PL-314** (open MRs, not merged, not in the pinned app) targets exactly the app side of this.
- CONFIDENCE: high for the app (node), medium for the web (PT-only path).

## 8. Home cards

### E-47: Home card per state (pill + sentence)

The app column is `homeCards.js` (node output). The web columns are `renderHomeLive` `:26029-26041` and the list `:26101-26122`, from the seeds.

| Order state | App pill · sentence | Web pill · sentence |
|---|---|---|
| pending, no offers | SUBMITTED · "Looking for your worker… · open for about N more hours" | "Needs you" · "Open this request — it needs your response" (`needsAttention` is true at submit, `:25337`); the list shows "Pending" + red NEEDS ATTENTION |
| accepted (just hired) | ACCEPTED · "Marcus accepted · ★ 4.9" | "In Progress" · "Marcus B. (Pro) · Started just now · matching complete" |
| picked_up | IN PROGRESS · "Marcus is on the job" | "In Progress" |
| purchased | ON THE WAY · "Marcus has your items and is on the way" | "In Progress" (no distinction) |
| scheduled, worker booked | SCHEDULED · "Fri, Oct 16 · 9:00 AM · waiting for a worker" (see Found in passing #1) | "Scheduled" · "Rosa P. (Pro) · Tomorrow, 9:00 AM" |
| delivered, photos ready | NEEDS YOU · "Marcus marked it complete · confirm or dispute" | "Completed — confirm" with no attention (seed `:25215-25216`) |
| delivered, photos pending | WRAPPING UP · "Marcus marked it complete" | no such state |
| payment failed | PAYMENT FAILED (red) | no such state |
| expired | NO WORKER FOUND (24 h) | no such state |

- APP: `app/src/component/home/homeCards.js:130-315`.
- WEB: `web/gopher-request.html:26029-26041`, `:26101-26126`.
- SERVER: `aasm_state`, `payment_status`, `requestor_alerts`, `photo_step_resolved`, `dispute_*` (the v3 list).
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** see the table.
  - **Order state:** `accepted`. App "ACCEPTED · Marcus accepted"; web "In Progress".
- CONFIDENCE: high

### E-48: What makes a card "needs you"
- APP: `homeCards.js:196-251`. Green NEEDS YOU for:
  - unviewed offers or bids (`requestor_alerts.order_gophers` / `bids`);
  - a counter (`counter`);
  - a cost adjustment (`cogs`, "Cost adjustment approval needed");
  - a reschedule;
  - delivered with photos ready.
  - Red for a failed payment (`:155-166`).
- WEB: a single boolean, `needsAttention`.
  - Set true at submit (`:25337`), on repost (`:25786`), and by PT counter / complete.
  - Set false at hire (`:27424`).
  - The seeded cost adjustment (`:25005`) and seeded completion (`:25215`) both carry `needsAttention:false`.
  - The web code says it has no attention TYPE (`:26032-26038`).
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the app derives "needs you" from what the server says needs the requester. The web flags every new request and does not flag an adjustment or a completion.
  - **Order state:** picked_up with an unanswered cost adjustment.
    - App: NEEDS YOU "Cost adjustment approval needed".
    - Web: "In Progress", no attention.
- CONFIDENCE: high

### E-49: Order of cards on Home
- APP: `homeCards.js:319-328`. `RANK = { bad: 0, good: 1, calm: 2, hold: 2, sched: 3, ended: 4 }`, then newest id first.
- WEB:
  - `homeLiveList` (`:25967-25972`): needs-attention first, otherwise store order.
  - The list (`:26100`) is store order, with new requests unshifted to the top.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the app puts live work above scheduled work; the web keeps store order.
  - **Order state:** one scheduled and one picked_up request, the scheduled one newer.
    - App: picked_up first.
    - Web: the newer scheduled one first.
- CONFIDENCE: medium (minor)

### E-50: Home headline
- APP: `homeCards.js:332-357`. "You have N current request(s)" plus ", M need(s) you". Ended requests are excluded, and an ended-only headline reads "Your request ended with no worker".
- WEB: `web/gopher-request.html:25996-26004`. "You have N current request(s), M need(s) attention"; the empty state is the app's "What can we help you with today, {first}?".
- VERDICT: SAME (format). The counts differ through E-48, and the web has no ended-only headline (E-10).
- CONFIDENCE: high

### E-51: An open dispute on the Home card
- APP: `homeCards.js:185-195`. Grey DISPUTE OPEN with "{name} is making it right", or "Gopher support is stepping in" after escalation (owner 10/11: a dispute is between requester and worker).
- WEB:
  - The list pill says "PENDING DISPUTE" (`web/gopher-request.html:26122`).
  - The Home carousel shows `statusLabel` (`:26031`), "Completed — confirm", with no dispute shown.
- VERDICT: DIVERGES
- IF DIVERGES:
  - **Difference:** the app names whose move it is; the web says "PENDING DISPUTE" in the list and nothing on the Home card.
  - **Order state:** delivered, `disputed = true`.
- CONFIDENCE: high

---

## Found in passing (app or web defects, not verdicts)

1. **App: a scheduled request a worker has BOOKED reads "waiting for a worker".**
   - Where: `homeCards.js:95-97` makes `isScheduledList` true for `aasm_state` pending OR scheduled, and it is checked (`:252-261`) before the "with {name}" branch (`:262-271`).
   - The server sets `scheduled` WITH a `gopher_id` on hire (`update.js:5205-5210`).
   - node: `scheduled_booked | sched | SCHEDULED | Fri, Oct 16 · 9:00 AM · waiting for a worker`.
2. **App: a scheduled order's step bar ticks nothing.** `liveStatus.js:14-20` `ORDER_STATE` has no `scheduled`, so Accepted is not done.
3. **App: a chip-only dispute is refused by the server.** "Late" alone = 4 chars (node `disputeText("Late","")`), under `MIN_DISPUTE_REASON = 10`. The app does not pre-check; the server's sentence is shown.
4. **App: the "No-show recorded" tell-don't-ask screen is unreachable** (`orderConfirmation.js`; per `rating.js:225-226`). The owner's 2026-08-30 ruling is carried only by the web and a dead app screen.
5. **Web: list-card ✕ bypasses the started-job cancel block** (E-17).
6. **Web: the "Simulate decline / Simulate expiry / Simulate: Gopher cancelled" DEMO controls ship on the live page.**
   - Their copy promises behaviour the server does not have: a 5-minute reassign (E-19), "expired with workers interested" (E-9), and an Edit-and-repost the owner blocked (E-18).
7. **Web: a stale comment in the PT bridge.** `gopher-web-pt-bridge.js:442-452` says a user-created Request record carries no `reviewSnapshot`.
   - That is no longer true: `captureRequestToDashboard` builds one at submit (`gopher-request.html:14411-14453`).
   - The comment, not the code, is out of date.

## Not checked (so not claimed)

- The server's message-corpus patterns vs the web's regex lists, case by case.
- The live value of the `CONVERSATION_BLOCK` and `AUTO_PAY_DURATION` env vars.
- The server `re_schedule.js`, `cost_adjustment_receipt.js` and `gopher_release_window.js` bodies.
- Whether the app's `getOrders.js` Report sheet is reachable by a requester.
- Push and SMS copy the requester receives.
- Request History detail views.
- Nothing was driven on a device or in a browser.
