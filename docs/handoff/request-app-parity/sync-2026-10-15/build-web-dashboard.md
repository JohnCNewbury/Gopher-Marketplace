# Build: the Request website's dashboard runs the app's after-submit logic

**Date:** 2026-10-15
**Owner ruling:** "Port the app's logic + drop the demos". The live Request app is the reference.

## Where the work is

- **Worktree:** `scratchpad/sync/websrc2`
- **Branch:** `code-logic/dashboard-app-logic`, cut from `3f1d015` (the live web source).
- **Pushed:** no.
- **Deployed:** no. `scripts/deploy.sh` was never run.
- **Working tree:** clean. I copied the newer parity harness in for the test runs, then restored it.
- **Pinned refs:**
  - APP: `gopher-mobile-request` `origin/production` = `b47efe59f`, which is also the scratchpad app clone's ref.
  - SERVER: `7e571e9f`. I read it; I did not change it.

## Commits (oldest first)

| SHA | What |
|---|---|
| `940c67d` | The generator, its check and the vendored app helpers. Also the module bridge (`window.GopherAppShared`) and run-all step 19. |
| `7bedd81` | Every record now carries the server's order fields in `r.order`. Home cards, list pills, "needs you", card order, the headline and the step bar come from the app. A hire now reads ACCEPTED. The list ✕ now goes through the same cancel as the rest of the page (E-17). |
| `e6f06b7` | Removed the live Demo / Simulate controls and the copy that promised server behaviour that does not exist. |
| `7026da3` | Cancel, confirm, dispute, rating and the worker-cancelled page now follow the app. `lifecycle-parity` now points Request at the app's cancel rule. |
| `00a7563` | The Home card sentence wraps to two lines, as the app's card does. A one-line ellipsis cut it at 375 px. |
| `f8a2d10` | Removed the now-unused web status-pill rule. |

Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Files

**New:**
- `scripts/sync-app-helpers.py` is the generator. It uses Python 3 and git, nothing else.
  - **Write mode** reads each listed app helper at a ref and follows its relative imports. It refuses any file whose code touches React, the DOM, storage or the network; on 3 sample files it refused `requestOrder.js` and `useCostAdjustment.js` and accepted `noShow.js`. It rewrites only the import specifiers (it adds `.js`) and adds one header line naming the app path and the commit that last changed that file. It writes the result to `Final/assets/js/app-shared/`, mirroring the app's `src/` folders.
  - **`--check` mode** regenerates everything in memory and fails on a copy that differs, is missing or is stray, or on a stale lock file.
  - **Overrides:** the clone and ref can be set with `--app-clone` / `--ref` or with `GOPHER_APP_CLONE` / `GOPHER_APP_REF`.
- `scripts/app-shared-helpers.lock.json` records each copy's sha256. That lets the check still catch a hand-edited copy on a machine without the app clone.
- `Final/assets/js/app-shared/**` holds 10 generated files from `b47efe59f`: `homeCards`, `openRequest`, `liveStatus`, `dispute`, `disputeState`, `photoStep`, `categoryLabel`, `declineReason`, `requesterCancelWindow` and `cancelReasons`.
- `Final/assets/js/gopher-app-shared.js` is a module that publishes those helpers as a frozen `window.GopherAppShared` and then fires `gopher-app-shared-ready`.
- `Final/assets/js/gopher-dash-order.js` is **the one mapping** from a web record to the server's order, stored as `r.order`.
  - Its header documents each web field and the server field it becomes.
  - `sync(r)` leaves an order alone once it is marked `__source:'api'`, so when the real API is wired, its rows drop in unchanged.
  - It applies RQ-51: `offer = perWorkerCost × (Labor ? workersNeeded : 1)`. The demo bid base uses the same rule.
  - It loads as a classic script, and also under node through `module.exports`.
- `scripts/web-checks/app-shared-helpers.js` is run-all step 19, with 81 assertions:
  - the generator's `--check`;
  - every copy imports under node and names its app commit;
  - `GopherAppShared` hands out the app's own function objects;
  - 21 mapping cases, asserted in the app's own words;
  - static checks on the page: it loads both scripts by relative path, reads the helpers, uses the server's sentences, and ships no demo controls.

**Changed:**
- `Final/gopher-request.html`
- `scripts/web-checks/run-all.sh`: step 19 added, steps renumbered to /19.
- `scripts/web-checks/lifecycle-parity.js`: Request must now call the app's `requesterCanCancel`. Connect is unchanged and still calls `jobBlocksCancel`.

**Where my edits sit in `gopher-request.html`:** most hunks are in the dashboard script, from about line 23170 on. The ones outside it are:
- CSS at about lines 7600–8620;
- the script tags just before the dashboard script;
- the dashboard demo-bar markup at about line 22900;
- the early-cancel overlay markup at about line 20637;
- **in the `G40_REQ` modal block, at about lines 18190–18290** (in the flow file region):
  - removed the `paymentNotAuthorized` and `expiredInterestedWorkers` entries;
  - removed the two sim-bar functions;
  - rewrote the header comment.

  This is the one place a merge with the request-flow branch could touch the same lines.

## E-items now the SAME, and how each was verified

How each item was verified:
- **Browser** means the page was served by `python3 -m http.server` from the scratchpad worktree and driven in the built-in browser.
  - I opened the dashboard with `window.openRequestDashboard`, which is what sign-in calls.
  - I clicked through with DOM events.
  - Worker-side events used the PT bridge (`?pt=1` on 127.0.0.1): `GWeb.offer`, `hire`, `substage`, `update`, `gopherCancelled`.
  - To fake 24 hours passing, I overrode `Date.now` in the page.
- **Check** means a case asserted in `app-shared-helpers.js` (node).

| ID | Now | Verified |
|---|---|---|
| E-9 | The "Simulate expiry" bar and its "Your request expired — workers are interested" modal are gone. The web never expires a request, so it matches the server keeping one open. | Check: no `data-g40-expiresim` on the page. |
| E-11 | Cancel stays open in pending, scheduled and accepted, through the app's `requesterCanCancel`. It closes from In Progress on. A stray attempt shows the server's `STARTED_REFUSAL` sentence. | Browser: Cancel shown on GR-00123 (pending), GR-00128 (accepted) and GR-00122 (scheduled); hidden on GR-00127 and GR-00131 (picked_up) and GR-00130 (delivered). Check case. |
| E-12 | A booked worker gets the app's fork, in the app's words. "Find a different worker" reposts the same request; it asks a reason only inside 24 h (`repostNeedsReason`), using `REPOST_REASONS` and the "Send it back out" button. Afterwards the page goes Home. | Browser: on GR-00128, "Priya is booked for this…"; the repost reason sheet; Other needs 3 words ("Please use at least 3 words", then "23 / 150"); afterwards SUBMITTED. On GR-00122: "Rosa has held this time for you…". |
| E-13 (was APP-ONLY) | The app's six reasons. "Other" needs 3 words and 150 characters at most. The scheduling-conflict intercept appears. The reason is filed on the cancelled record. | Browser: the intercept reads "Ask Rosa about a different time…" and "No — cancel the request". The cancelled GR-0002 appears in Request History → Cancelled. |
| E-14 | Nobody has taken it yet, so the requester goes straight to the reasons ("No worker has taken this yet, so cancelling is free…"). The web-only "keep looking / re-alert Gophers" step and its overlay are deleted. | Browser on GR-00123 and a new GR-0002. Check: the "re-alert Gophers" text is gone. |
| E-15 | The app's words: "it is free to cancel before they start". | Browser (sheet text). |
| E-17 | The ✕ shows only while cancellable, and opens the same status-aware cancel by id. It no longer splices the record. | Browser: ✕ → reasons → filed to Cancelled. |
| E-18 | The demo module is deleted: no Edit option, no flat 15-minute timer, no rating instead of a reason. The app's "Worker cancelled" block is driven by `gopher_released_at` + `cancellation_reason`, with "Assign new worker" (keep_listed) and "Cancel request" (the reasons, with the app's subtitle for this screen). The cancelling worker stays named, as `cancel.js` keeps `gopher_id`. | Browser via PT `gopherCancelled`: the block's text, the cancel subtitle, and keep_listed closing it. Check case. **Difference left:** no countdown, because the app's clock is the server's `release_expires_at`, which the web cannot know. |
| E-19 | The "Simulate decline" bar and its 5-minute-reassign modal are deleted. `paymentFailed` / `stripeError` map to `requires_payment_method` → the app's PAYMENT FAILED card. | Check case ("Your bank declined the card · update payment info"). No web path produces a decline; that needs the server. |
| E-22 | The adjustment card shows in every live state (accepted, scheduled, picked_up, purchased, delivered). | Browser PT: shown on an accepted order and on a completed one. |
| E-24 | Confirm is refused with the server's "Please wait for Cost Adjustment Accept Or Decline" while an adjustment is unanswered. | Browser PT: the alert shows and the order stays unconfirmed. |
| E-32 | A hire is `accepted` (ACCEPTED · "Marcus accepted · ★ 4.9"). `startJob` no longer pre-ticks In-Progress. | Browser PT: accepted → picked_up → delivered as the worker taps. Check case. |
| E-33 | The step bar is the app's `liveSteps`. | Browser: GR-00128 shows Accepted ✓ · In progress (current) · Item purchased · Completed; GR-00131 (ride) has no item row; GR-00130 shows "Item picked up". Check: a Moving order has no item row. |
| E-35 (was APP-ONLY) | Confirm appears only when `orderScreenState` says so: photo step resolved, and not a worker-raised review. | Browser PT: `photoStepResolved:false` → WRAPPING UP, no Confirm block. Check case. |
| E-36 note | A confirmed, paid order leaves Home, as v3 drops it. The list labels it "Completed" (the app's history pill). | Browser: the headline went from 9 to 8 after Confirm. Check case. |
| E-38 | The app's reason chips and Details, sent as `disputeText`. Under 10 characters is refused with the server's sentence. | Browser: empty and chip-only ("Late") were both refused; "Late: Arrived an hour late" was accepted. |
| E-39 | "Resolved? Confirm completion" stays during an open dispute. | Browser. |
| E-40 | "Unable to resolve" is disabled until the server's 24 h is up, with the app's `escalationLabel`. | Browser: disabled with "Available in 23 h 60 min"; with `Date.now` set +25 h, enabled with "Available now". Check case. |
| E-41 | "Sent to Gopher support" sheet (the app's five lines), then a support-owned "Pending dispute resolution" view with no Confirm. Home reads "Gopher support is stepping in". | Browser, plus Home via PT. |
| E-43 (was APP-ONLY) | Decided dispute: RESOLVED; "Your dispute was settled"; "Gopher support reviewed it and paid Ana."; "Rate Ana →". | Browser PT, by setting `disputeResolvedAt` / `disputeResolution` (no web path produces a decision). |
| E-44 | No score until tapped. Done is off until then. One MY Gopher box: unticked unless already one; saved on tick; label changes to "… is one of your MY Gophers". No Recommend, no Do-not-send. "Thanks for confirming / Receipt sent to your email". | Browser. Check: no `optRec`, no `optBlock`, no default of 5. |
| E-47, E-48, E-49, E-50, E-51 | Home cards, list pills, "needs you", order and headline all come from `cardModel` / `orderCards` / `headline`. | Browser, 9 seeds in app order: GR-00141, 130, 129, 127 (cost adjustment), 123 (good); 131, 128 (calm); 122, 121 (sched). "You have 9 current requests, 5 need you". Check: 13 states. |

## What remains, and why

- **E-46 (worker-raised review): left as-is, per your instruction.**
  - The request screen shows it as a review ("No-show recorded … under review"; no Confirm, no dispute block).
  - The Home and list card say "DISPUTE OPEN · {name} is making it right", because that is what the pinned app helper says.
  - The mapping writes the server's exact reason string (`Requester no show - Age restricted order`). The app's PL-314 helper (`workerReview.js` on branch `PL-314-worker-review`, `0e42c62c0`) matches on that string.
  - When PL-314 merges, step 19 fails until the sync is re-run. After the re-run the web card reads "UNDER REVIEW / ID NOT CONFIRMED" with no other change.
- **E-8 (open-until) and the scheduled date on new requests:** the mapping and `__createDashboardRequest` already accept `deliveryEta` and `requestScheduleTime`. The flow does not pass them yet, and the flow is the other branch's area. Until it does, the card leaves those words out, as the app does when the server sends none. The seeds carry a schedule time.
- **APP-ONLY items not built:**
  - E-10 (no worker found);
  - E-16 (edit while pending);
  - E-20 (reschedule; the mapping already counts `re_scheduled_request`);
  - E-30;
  - E-42 (server cron).
- **Not in my list, so untouched:**
  - messaging, E-27 / E-28 / E-29;
  - E-45 Report (WEB-ONLY);
  - E-5 bid comment / "Cost of items";
  - E-6 labor rows.
- **Hand-ported, not byte-copied:** these words sit inside React screens the generator refuses, so each is ported with its source file named in a comment:
  - the detail pill (`requestOrder.js` livePill);
  - the dispute form, timeline and escalation sheet;
  - the unresolved and decided views;
  - the cancel fork and reasons sheet;
  - the worker-cancelled page;
  - the rating sheet.

  The rules behind them are the vendored helpers.
- **Rating hint wording:** the app's "Tap a hole to rate" reads "Tap a star to rate", because the web draws stars rather than the app's holes.

## Check results

I compared every check against a run on the untouched base (`3f1d015`, newer harness copied in):

| | Base | Final |
|---|---|---|
| run-all steps 1–12, 15–17 | pass (step 12 SKIPs: there is no clone relative to the worktree) | pass, same |
| 13 parity harness | BROKEN, 1 FAIL ("app age detector … list index out of range") + 1 WARN | **identical result lines** |
| 14 Go parity | FileNotFoundError, `_prototypes/Go/gopher-go-canonical.html` | same |
| 18 Deals featured picks | 8 FAIL lines | same 8 |
| 19 (new) | — | PASS, 81 assertions |

**New failures: none.** The negative tests also work:
- a hand-edited copy is reported as TAMPERED and DIFFERS;
- a stray file is reported as STRAY;
- with the clone absent, the app comparison SKIPs and the tamper check still runs;
- an app ref older than the last `homeCards` change makes the check fail with DIFFERS / STRAY / lock out of date.

## Found in passing

1. **App:** `escalationLabel` prints "Available in 23 h 60 min" right after a dispute opens. It rounds the minutes up with `Math.ceil` while the hours are floored. The web shows the same, because it runs the app's code.
2. **App:** the audit's found-in-passing #1 and #2 now show on the web too, because the web follows the pinned app:
   - a booked scheduled request reads "… · waiting for a worker";
   - a scheduled order's step bar has nothing ticked.
3. **Vendored `homeCards`:** `categoryPhoto` returns a root-absolute `/assets_1/home/...` path. The web never uses `card.photo`; it draws its own category mark.
4. **Web, pre-existing:** `toast` is undefined in the page (`typeof window.toast === 'undefined'`). Every `if(typeof toast === 'function') toast(…)` in the dashboard is silent, including the rating "Thanks" toast.
5. **Web seeds:** GR-00127 and GR-00128 hold the items-plus-offer figure in `perWorkerCost`, not the offer. Under RQ-51, their `r.order.offer` is therefore overstated. No helper reads `offer` today.
6. **Web, out of scope:** the Request History detail still offers "Do not send requests to {name} again".
7. The Request 101 guide already describes the app's fork, reasons and worker-cancelled page, so this change brings the site into line with its guide. I did not edit the guide.
