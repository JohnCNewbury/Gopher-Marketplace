# G40-81 — Two-strike cancellation-fee system (code-grounding addendum + front-end reference)

**Jira:** G40-81 (Task, Low) · Gopher Go · Label `pay` · Relates G40-305 (email templates) · Depends G40-42 (rating after Gopher cancel), G40-225 (Stripe auto-reject on deactivation)
**Assignee:** John Newbury
**What this doc is:** grounds the (already very detailed) ticket in the code that exists today, records
two decisions John locked, and points to the one prototype-buildable surface. The full behavioural spec
(16 scenarios, definitions, Stripe mechanics, rehabilitation) lives in the ticket — not repeated here.
**Scope:** BACKEND + Admin Panel + Stripe (dev-only per `Final/CLAUDE.md`). Only the Requestor prompt
is front-end.

---

## Decisions locked by John (this pass)

1. **Canonical auto-deactivation trigger = Stripe balance ≤ $-10** (dollar-driven, **not** a lifetime
   Approved-Cancel-Fee strike count). The ticket's "or 2 Approved Cancel Fees (equivalently)" wording is
   **superseded** — the two diverge once a payout offsets a balance or rehabilitation erases strike
   records, and John chose the balance rule. *Update the ticket's Step 5 / Business Rules / Scenario 12
   to read "balance ≤ $-10" as the sole trigger; drop the "2 Approved Cancel Fees" equivalence.*
2. **Scope for this pass:** ground dev-ready + build the Requestor "Agreed / Not Agreed" prompt as a
   front-end reference (done — see bottom). Everything else is the developer's.

---

## Code-grounding addendum — what already exists vs. net-new

**Already exists (legacy `gopher-backend-api` — a simpler binary charge/waive model to REPLACE):**
- **`controllers/admin/order_cancelation_fee.js`** → `charge_fee` endpoint: admin marks an order
  `charge_fee: true` (idempotent — early-returns if already true). This is today's entire "apply a
  cancellation fee" action.
- **`orders.charge_fee`** (boolean) + **`orders.revoked`** state (`2` = cancelled by Gopher, `3` =
  admin cancellation) — `models/orders.model.js:63,164`.
- **`controllers/order/cancel.js`** — the Gopher-cancel path (`order_canceled_by_gopher`, `revoked=2`).
  On cancel it already: counts the Gopher's cancellations + waived count
  (`total_order_cancelled`, `waved_order where charge_fee=false and revoked=2`), emails the Gopher a
  **`waive_fee_link`** (`/booking/:orderId`), and fires `order.cancelled.gopher`.
- **`controllers/admin/user.js:137-140`** — per-Gopher cancellation counters
  (`total_cancelation` revoked=2, `admin_cancelation` revoked=3).
- Admin order views already surface `charge_fee` / `revoked` (`controllers/admin/orders.js`).

**Net-new for G40-81 (all developer work):**
1. **Requestor Agreed/Not-Agreed vote + 6-hr window** — no such prompt/state exists today. New states:
   `agreed / not_agreed / timeout / requestor_deleted`.
2. **New `cancellation_reviews` table** (ticket's recommended shape): `cancellation_id, order_id,
   gopher_id, requestor_response, admin_disposition, created_at, requestor_responded_at,
   admin_resolved_at, auto_resolved`.
3. **Two-strike grace + three-way admin disposition** — today it's a binary charge/waive. New:
   `No Cancel Fee` (strike, no fee) / `Approve Cancel Fee` (gated on ≥2 prior No-Fee strikes) /
   `Excused` (no strike). Wire both the **admin@gophergo.io email link** and the **Admin Panel button**
   to the **same endpoint** (Scenario 15).
4. **6-hr + 48-hr timers** — one scheduled-sweep job over `cancellation_reviews.created_at` /
   `requestor_responded_at` (mirror the cron style in `middleware/cronTasks.js`). Defaults on admin
   timeout: ≥2 priors → Approve Fee; else No Fee.
5. **Stripe negative-balance ledger** — record a $-5 entry on the connected account at Approve-Fee; the
   payout flow must consult the ledger and offset before paying (extends `lib/payment.stripe.js`).
   *Gophers are instant-payout / no-balance today, so this ledger is genuinely new.*
6. **Account-deletion block while balance < $0** — server-side guard on the delete flow (anti-evasion).
7. **Auto-deactivation at balance ≤ $-10** → route through the existing admin-deactivation flow
   (G40-225, which also auto-rejects the Stripe account).
8. **Rehabilitation counter** — integer on the Gopher record: +1 per 5-star completion, reset to 0 on
   any new unexcused cancellation, at 50 erase all strike records (not the balance).
9. **Gopher initial + follow-up emails** — templates land in G40-305; this ticket wires the triggers.

> Migration note: `charge_fee`/`revoked` stay useful, but the disposition model moves onto
> `cancellation_reviews`. Decide whether `charge_fee=true` is derived from an Approve-Fee disposition
> (recommended) so admin/orders.js views keep working.

---

## Front-end status & reference — DONE (the one buildable piece)

Only the **Requestor "Agreed / Not Agreed" prompt** is front-end; everything else is backend/Admin
Panel. The go-forward prototype has no such prompt today (only demo cancellation copy in Gopher Go's
Request History, e.g. `gopher-go.html:3333` "Cancelled within the grace window — no fee").

Built: **`docs/handoff/G40-81-cancellation-agreed-prompt.html`** — interactive, brand-styled. Shows the
prompt with a 6-hr countdown and all four resolutions (Agreed → ends; Not Agreed → review; 6-hr
timeout → Not Agreed; requestor-deleted → Not Agreed), each captioned to Scenarios S1–S4, plus a
5-step downstream flow strip for context. The dev builds this into the real Requester app; the fee
logic sits behind it.

---

## Still-open for the dev? — none (product)
All product decisions are resolved (deactivation trigger = balance ≤ $-10; two-strike grace; $5 fee;
6-hr/48-hr windows; 50-star rehab). Remaining items are engineering implementation (Stripe Connect
negative-balance ledger API, cron cadence) and coordination with G40-42 / G40-225 / G40-305, all of
which the ticket already calls out.
