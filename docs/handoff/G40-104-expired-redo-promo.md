# G40-104 — Gopher Request: Expired-request "ReDo" promo email

**Jira:** G40-104 (Task) · Epic **G40-1 Bug Fixes & Polish** · Label `request` · Priority Lowest · folds into email program **G40-305**
**Surface:** `Documentation/SMS:Emails/gopher-email-expired.html` (rebranded preview) → backend dispatcher **type 17** (`expired-order`, transactional).
**Scope of this pass:** FRONT-END — the conditional promo block is authored in the email template; the full dev spec (coupon config, gate query, cron fire-point) is written up. Backend wiring is dev work.

---

## What the ticket asks (clarified by John, 2026-07-03)

When a request **expires**, the requestor gets the expired-request email. It carries a **"ReDo" promo** unless they've already used it:
- **Hasn't used ReDo** → email **with** the promo code.
- **Has used ReDo** → same email **without** the promo code.

**Decisions (John):**
- **Shape:** an **update to the existing transactional expired email** (conditional block), *not* a separate drip send. Stays transactional (`support@`, no unsubscribe).
- **ReDo mechanics:** **100% of Gopher fees waived → $0 fees on the next request, redeemable once per account.**
- **Timing:** "not in play until we start the Drip Campaign" — build now, ship behind an activation flag.

---

## ✅ DONE (front-end) — `gopher-email-expired.html`

Added a **conditional ReDo promo card** directly above the "Relist your request" CTA, built with the email's own tokens (Nunito/DM Sans, navy `#002461`, green `#33D975`, mint `#EAFBF1`):
- Eyebrow "A LITTLE NUDGE, ON US" → headline **"Your next request is fee-free."** → "Relist with code **ReDo** and we'll waive every Gopher fee — you pay **$0 in fees**. One-time, our treat." → dashed **ReDo** code chip.
- Delimited by a `G40-104 · ReDo promo block` comment stating the render rule: shown only when the requestor has **not** yet redeemed ReDo; suppressed (whole `<tr>`) after first use.
- Verified in-browser (local static server, 600px email width) — renders on-brand, sits naturally above the Relist button. Screenshot shared.

The preview shows the **block-present** state; the "already redeemed" state is the same email with the block removed.

## 🔧 TO BUILD (developer) — full spec in `SMS:Emails/impl-expired-redo-promo-G40-104.md`

Grounded in the live backend (`gopher-backend-api`); **no new promo infrastructure needed** — the `coupons` model already supports this.

1. **Create the ReDo coupon** (`models/coupons.model.js` row): `code:'ReDo'`, `applies_to:'requestor'`, `type:'percentOff'`, `value:100`, `reduces:'gopherFee'`, `once_per_acct:true`, `duration:'once'`, `active:true`, `redeem_by:<campaign end>`. Existing `verify_coupon_use` → `get_discounted_rate` already zeroes the fee — no math changes.
2. **Gate** — reuse the `once_per_acct` pattern already in `controllers/order/coupon.js:50-55`: `SELECT id FROM orders WHERE coupon_id=:redo AND requestor_id=:user` → row exists ⇒ suppress the block.
3. **Fire point** — the expiry cron sends the email at `middleware/crons.js:259` and `:278` (`send_mail(17, …)`). Compute `showReDo` there and pass `showReDo` + `redoCode` into `email_data`; make the second query also select `o.requestor_id`.
4. **Template** — port the rebranded `gopher-email-expired` markup to the type-17 view (`lib/sendEmail.js:44` → `expired-order.ejs`) and wrap the card in `<% if (showReDo) { %> … <% } %>`.
5. **Activation flag** — gate `showReDo` on `EXPIRED_REDO_ENABLED` (flip at drip-campaign go-live).

## Acceptance criteria → where it lives
| Rule | Front-end (done) | Backend (to build) |
|---|---|---|
| Expired email shows ReDo code when requestor hasn't used it | conditional promo card authored | `showReDo` gate + coupon row |
| Same email omits code once ReDo is redeemed | block wrapped as conditional | `hasUsedReDo` query (once_per_acct) |
| ReDo = 100% fee waiver, once per account | copy: "$0 in fees … One-time" | coupon `value:100 / reduces:gopherFee / once_per_acct` |
| Transactional, not a new drip send | stays in type 17 (`support@`) | no new dispatcher type |
| Not live until drip campaign | — | `EXPIRED_REDO_ENABLED` flag |

## Notes
- Optional one-tap redemption: `{{RELIST_URL}}` can prefill `?coupon=ReDo` so the relisted order auto-applies it (still validated by `verify_coupon_use`).
- Consumer (Gopher Request) side only — this is the requestor's expired-request email. Worker side out of scope.
