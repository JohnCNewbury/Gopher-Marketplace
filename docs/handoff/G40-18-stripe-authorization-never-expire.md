# G40-18 — Stripe authorization must NEVER expire during an order — TECHNICAL DEEP-DIVE

> ## ✅ RESOLVED 2026-08-20 — `gopher-backend-api!333` merged to `production` (`e25f5d7e`)
>
> **Everything below this header is the ORIGINAL 2026-06-12 analysis, kept as history. Its
> `file:line` anchors and its "seven flaws" are all superseded.** The cron rewrite (continuous,
> all non-terminal states, retry-capped) had already shipped by late 2025 under other tickets;
> !333 closed what remained, plus defects the build itself found. **What production does now:**
>
> - **The invariant is enforced at the payout seam:** `transfer()` re-reads THIS order's
>   PaymentIntent from Stripe and refuses to move money unless it is `succeeded` with
>   `amount_received` covering the transfer (the PI field — see the incident note below). Failure classes are distinct: **blocked** (409,
>   red `PAYOUT BLOCKED` order_log, support), **deferred** (503, retryable — Stripe unreadable),
>   **legacy** (`ch_` tokens block for an owner ruling).
> - **Re-auth rolls are real for every order that should hold funds:** must-confirm derives
>   from ORDER STATE (accepted/in_progress/scheduled), never from the stored intent's status.
>   Rolls are **cancel-only** (structurally cannot refund captured money), a `succeeded`
>   reading aborts the roll, both roll writes are **compare-and-swap on status + token**, a
>   failed confirm repoints the order at the new intent, and **success resets the retry
>   budget** (it used to burn it).
> - **AC6:** on retry exhaustion the requester gets SMS + push (`requestor.payment_action_needed`,
>   notif index 36, deep-link keys) + email (type 41), outcomes on the order as
>   `payment_action_needed_channels`. Fires in the loop's CATCH — the only reachable
>   exhaustion point; the old in-loop branch was dead code and is deleted.
> - **AC7:** capture/transfer/payout successes write `AUTH LIFECYCLE` order_logs; with the
>   cron's re-auth logs the order timeline reads authorized → re-authorized → captured →
>   transferred → paid in HQ.
> - **Webhooks:** `payment_intent.canceled` / `amount_capturable_updated` handled at the
>   existing signed endpoint (re-read trust model; self-cancel ledger filters our own rolls).
>   ~~Inert until the owner subscribes the Stripe endpoint to those events.~~ **LIVE since
>   2026-08-20** (`!335` → `2c460ed3`): Stripe scopes a destination to platform OR connected
>   events — never both — so the events come from a NEW destination
>   (`we_1U6TWpCQp3eawbpnwNazBAlG`, "Your account" scope, same URL) whose signing secret is
>   held in SSM `/gopher/production/stripe-webhook-secret-2` and verified by the now
>   multi-secret `middleware/stripe_webhook_auth.js` (5-min TTL — **rotate by overwriting the
>   parameter in place, never delete-then-recreate**). Proven end to end with real event
>   `evt_3U6UOzCQp3eawbpn1rMCMjv7` (order #64627): 200/Recovered, server-side SSM fetch on
>   that request, 0 rejections since.
> - The always-false double-capture guard is alive (409, already-captured = recovery path);
>   `services/payment_authorization.service.js` is deleted; `orders.stripe_charge_token` is
>   indexed.
>
> **Guard:** `test/g40-18-auth-invariant.test.js` — 41 anchored checks, 11 mutations proven;
> plus the multi-secret cases in `test/stripe-account-webhook.test.js` (29 checks, 5 mutations).
> **Closed 2026-08-20:** the Stripe event subscription (new destination + SSM secret, above)
> and the CloudWatch filters — alarms `Gopher-Prod-{PayoutBlocked,AuthCanceledLiveOrder,
> StrayHoldUnreleased}` exist and are registered in `docs/alert-markers.json`.
> **⚠️ INCIDENT + FIX, 2026-08-20 (order #64627 — the first live completion under this code):**
> every PaymentIntent verify read `amount_captured`, a field that exists only on Charge
> objects — a PI reports **`amount_received`**. So the first real Complete tap captured
> $218.14 at Stripe correctly and then failed its own verify (DB stuck `authorized`, worker
> unpaid), and the already-captured recovery branch 409'd all 11 retries instead of engaging.
> **Fixed same morning in `!337` (`ad2b3b9c`)** — 12-site field rename, no logic change; the
> invariant test gained an INCIDENT GUARD that fails on ANY `amount_captured` read in
> `payment.stripe.js`. The order healed exactly as designed on the next tap: recovery branch
> returned the captured intent → $200 transfer (`tr_1U6WNW…`) → instant payout → `paid`, the
> full AUTH LIFECYCLE timeline on the order. **This was also the invariant's first live
> positive control.** Lesson recorded: anchored source tests verify shape, not third-party
> schema truth — validate external field names against a real payload.
>
> **G40-402 CLOSED 2026-08-20 — and it was bigger than a deep-link.** Building the tap
> handler exposed that the AC6 notification was a promise the system could not keep: nothing
> un-exhausted an order after the requester fixed their card (the cron excludes
> `payment_auth_retry_count >= 3` forever, and a failed roll's repoint stamps a fresh 7-day
> expiry). Two merged halves:
> - **Backend `!342`** (`e3b096a1`, deploys on merge): the three requester card-fix endpoints
>   (select default / add card / attach) re-arm the requester's own exhausted live orders —
>   retry budget 0 AND `payment_auth_expires_at = NOW()` (webhook-handler semantics) — so the
>   cron rebuilds the hold within a minute, genuinely with the fixed card (`charge.create`
>   resolves the current default per attempt). Guards mirror the cron's own selection with a
>   drift-check (`test/g40-402-rearm-on-card-fix.test.js`, 12 checks, 5 mutations proven);
>   fail-open; AUTH LIFECYCLE order_log marks each re-arm.
> - **Client `gopher-mobile-requester-capacitorjs!233`** (`8ec24659`, **store-gated**): tapping
>   the push lands on the card-management screen via the PushTapListener seam. Deliberately
>   account-level, not order-scoped — the remedy is the default card and the re-arm covers
>   every exhausted order at once.
> **Still open:** `helpers/payment_error_handler.js` is caller-less from the cron path
> (cleanup ruling).

**Type:** Bug · **Priority:** Highest · `pay` · Both apps + backend. Verified against the 2026-06-12 `gopher-backend-api` export. All `file:line` refs are from that snapshot.

## The invariant (non-negotiable)
A requester's payment authorization **must never expire while an order is live.** The order is either **(a) cancelled**, or **(b) its authorization is continuously extended until captured.** If an authorization lapses mid-order and the worker then completes the job, the platform **must not** transfer or pay out to the worker. Paying a worker against an expired/absent hold = the platform eats the cost. That can never happen.

---

## How payment works today
Stripe **manual-capture PaymentIntent** = an authorization hold on the requester's saved card, captured later at completion.

- **PI options** — `lib/payment.stripe.js:1032-1055` (`private_utils.cal_charges`): `capture_method:'manual'`, `confirm:false`, `customer`, `payment_method`, `transfer_group`. **No `off_session`, no `setup_future_usage`** (matters for reauth — see fix B).
- **Create** — `charge.create` (`payment.stripe.js:1187`) → `stripe.paymentIntents.create`.
- **Authorization placed = 7-day clock starts at `charge.confirm`** (`payment.stripe.js:1318`) → `stripe.paymentIntents.confirm`. Called on **bid acceptance** `controllers/order/order_bids.js:604` and **cost adjustment** `controllers/order/cost_adjustment.js:671`. Sets `orders.payment_status='authorized'`, `orders.stripe_charge_token = PI id`.
- **Capture at completion** — `charge.capture` (`payment.stripe.js:1344`) → `stripe.paymentIntents.capture`.
- **Transfer to worker** — `charge.transfer` (`payment.stripe.js:1415`) → `stripe.transfers.create` (destination = gopher connected account; **funds pulled from the platform balance**, decoupled from the specific captured charge).
- **Completion flows** that run capture→transfer→payout:
  - Primary (gopher app) — `controllers/order/update.js:1353-1408` and a second at `:2150-2185`.
  - Admin / auto-payout cron — `controllers/admin.controller.js:52 confirm_pending_order_payout` (called by the every-minute `confirm_auto_payout` cron, `middleware/cronTasks.js:141`).
- **Enums** — `constants/index.js`: `PAYMENT_STATUS` = pending / authorized / captured / transferred / paid / failed. `ORDER_STATUS` = pending / accepted / picked_up / purchased / delivered / expired / cancelled / scheduled (no literal "in_progress"; "active" = accepted→picked_up→purchased).

## Stripe's hard constraint = the root cause
A manual-capture authorization is valid **up to 7 days** (card-network limit; some cards fewer). Gopher lets requesters schedule ~2 weeks out. Any capture attempted **>7 days after `confirm`** hits an authorization Stripe has already **auto-canceled**, releasing the held funds back to the requester. There is no Stripe parameter to hold a single authorization longer than 7 days — extension is only possible by **re-authorizing** (new PI) before expiry.

---

## What exists today for this — and why it's "not executed correctly"
There **is** a reauth cron: `middleware/crons.js:408 re_authorize_token` (runs **every minute** via `getTasks`, gated on env `START_CRONS='true'`, `crons.js:579-605`). It cancels the old PI and creates+confirms a fresh one. It **cannot** uphold the invariant, for seven concrete reasons:

1. **One-shot.** It sets `re_authorize_token=true` after the first reauth, and the query requires `re_authorize_token=false` (`crons.js:416`). So each order is reauthorized **at most once, ever** → the *second* 7-day window expires unprotected. (`orders.re_authorize_token` boolean, `models/orders.model.js:185`.)
2. **Excludes active orders.** Query filter `aasm_state IN ('pending','scheduled')` (`crons.js:411`). Once a gopher **accepts** (state → accepted/picked_up/purchased), the order is **never reauthorized** — this is exactly the "auth expires *during* an order" case. A job running >7 days loses its hold with no renewal.
3. **Scheduled-only.** Filter `request_schedule_later=true` (`crons.js:413`) — immediate "Need ASAP" orders that get delayed aren't covered.
4. **Narrow trigger window.** `now()+1 day > request_schedule_time AND request_schedule_time > updated_at + interval '6 days'` (`crons.js:414-415`) — fires only right before a *scheduled* activation, not to keep an active order's hold open.
5. **Auth age proxied off `updated_at`.** There is **no `authorized_at` / `authorization_expires_at` column** (confirmed — `models/orders.model.js`). `updated_at + 6 days` is a bad proxy: any edit (cost adjustment, status change) bumps `updated_at`, so the age calc is wrong and reauth fires late (after real expiry) or never.
6. **Cancel-then-recreate gap + silent failure.** It refunds/cancels the old hold **first** (`charge.refund`→cancel, `crons.js:424`) then creates a new one; if create/confirm fails, the order is left `payment_status='failed'` with **no hold and no retry**. It runs as `forEach(async …)` (not awaited) — per-order errors are swallowed; the outer try/catch can't catch them.
7. **Confirm only if SCHEDULED.** `if (aasm_state===SCHEDULED) confirm()` (`crons.js:443`) — for 'pending' the new PI is created but **not confirmed**, so it isn't actually holding funds.

## The other half — never pay a worker against an expired hold
- **Admin/auto flow** (`admin.controller.js:52`) is **status-gated**: `AUTHORIZED`→capture→`CAPTURED`→transfer→`TRANSFERRED`→payout→`PAID`. `charge.capture` throws on an expired/canceled PI, so transfer is blocked → this path **errors ("network error"), doesn't overpay** — but the worker is stuck unpaid.
- **Primary gopher-app flow** (`update.js:1353`) awaits capture with a `.catch` that re-throws (`:1371-1384`), so `charge.transfer` at `:1386` isn't reached on capture failure. **But** transfer here is **not gated on the DB `captured` state** — it relies solely on the throw, and `stripe.transfers.create` pulls from the **platform balance**. Any refactor/retry that reaches transfer with an uncaptured order pays the worker from platform funds. Fragile — tighten it.
- **Latent guard bug** — `charge.capture`, `payment.stripe.js:1353`: `if (!payment_info_status.status === 'requires_capture')`. Operator precedence makes this `(!status) === 'requires_capture'` → **always `false`**, so the "already captured / not capturable" short-circuit **never fires**; capture is always attempted (Stripe then throws on canceled/already-captured PIs). Fix to `payment_info_status.status !== 'requires_capture'`.
- **No webhook safety net.** `controllers/admin/stripe_webhook.js` is **44 lines and handles no `payment_intent` events** — the platform never learns an authorization expired until a capture attempt fails.

---

## Recommended direction (so the dev builds, not researches)
Uphold the invariant with **continuous, tracked re-authorization** + a **hard payout gate**:

**A. Track the authorization lifecycle (DB).** Add `authorized_at` and `authorization_expires_at` (= `authorized_at + 7d − safety buffer`, e.g. 24h) to `orders`; set on every `charge.confirm`. Stop proxying age off `updated_at`. Replace the one-shot `re_authorize_token` boolean with `reauth_count` / `last_reauthorized_at` (informational — never a gate that blocks future reauth).

**B. Continuous rolling re-authorization (rewrite `re_authorize_token`).** Each run, select **all non-terminal** orders (`aasm_state NOT IN ('delivered','cancelled','expired')`) with `payment_status='authorized'` and `authorization_expires_at < now()+buffer` — regardless of scheduled vs immediate, pending vs accepted vs active. For each: create+confirm a fresh manual-capture PI **off_session** (needs the card saved as reusable — add `off_session:true`/`setup_future_usage` at first authorization, or a SetupIntent), then cancel the old hold **only after** the new one succeeds (close the uncovered gap in flaw #6). Idempotent, **awaited** (not `forEach(async)`), per-order try/catch.

**C. Reauth-failure handling.** If the fresh authorization fails (declined/insufficient): pause the order, block payout, notify the requester to update their card, surface to admin/HQ. Never allow completion→payout on an order without a live hold.

**D. Hard payout gate (both completion flows).** Before ANY `charge.transfer`/`charge.payout`, verify **this order's** PI is `status==='succeeded'` with `amount_captured>0` (real capture happened) — not just the DB flag. Make capture→transfer transactional; on capture failure, mark needs-attention + notify, never transfer. Fix the `:1353` guard.

**E. Reschedule / cost-adjust alignment (AC3).** On reschedule or cost adjustment, recompute and re-authorize so the hold covers the new date/amount. `cost_adjustment.js` already re-confirms (`:671`) — extend it to reset `authorized_at`/`authorization_expires_at`.

**F. Webhook safety net.** Handle `payment_intent.canceled` / `charge.expired` / `payment_intent.amount_capturable_updated` to proactively flag an order whose hold lapsed and trigger reauth or pause.

**G. Product ceiling.** No single hold can exceed 7 days, so rolling reauth is mandatory for the 14-day window. Alternative/complement: cap scheduling at 7 days, or require the requester re-confirm the hold. Flag the tradeoff for John.

## Files the dev will touch
- `lib/payment.stripe.js` — `cal_charges` (save card / off_session), `charge.capture` (fix `:1353` guard + capture-verify), `charge.transfer`/`charge.payout` (capture-verified gate), `charge.create`/`confirm`.
- `middleware/crons.js` — rewrite `re_authorize_token` (`:408`) → continuous, all non-terminal states, tracked expiry, awaited.
- `controllers/order/update.js` (`:1353`, `:2150`) + `controllers/admin.controller.js` (`:52`) — gate transfer/payout on verified capture.
- `models/orders.model.js` + migration — `authorized_at`, `authorization_expires_at`, `reauth_count`/`last_reauthorized_at`.
- `controllers/admin/stripe_webhook.js` — add PI expiry/cancel handlers.
- `controllers/order/order_bids.js` (`:604`), `controllers/order/cost_adjustment.js` (`:671`) — set `authorized_at` on confirm; re-auth on reschedule.

## QA / acceptance to prove the invariant
- Authorize, let the clock pass 7 days on a scheduled order → hold is re-authorized before expiry; `authorization_expires_at` always > now while live.
- **Accepted/active** order running >7 days → hold re-authorized (this is the case today's cron misses entirely).
- Order past **two** 7-day windows (>13 days) → still authorized (proves the one-shot flag is gone).
- Reauth card decline → order paused, worker cannot be paid, requester notified.
- Force an expired/canceled PI, then attempt completion → capture blocked AND transfer/payout blocked; worker not paid; admin notified.
- Reschedule further out / cost adjustment → authorization window resets to cover it.
