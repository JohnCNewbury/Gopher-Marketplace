# Admin/HQ cancellation — who gets told

**Owns:** the notification rule for `DELETE`-style admin cancellation
(`controllers/admin/orders.js` `exports.cancelOrder`, reached from HQ › Orders and the
legacy admin panel). Canonical home for this behaviour — cite this file, not a ticket.

**Status:** shipped to `production` 2026-09-09 (MR !533, commit `7f0d5ad6`).
**Verified first-hand** against the live code and the production database on 2026-09-09;
nothing in the "the rule" or "what was wrong" sections is inherited from another session.

---

## The rule

When an admin cancels a request, **two independent emails** go out:

| Type | Recipient | Template | Condition |
|---|---|---|---|
| 25 | The gopher | `cancelation-byadmin-mail-to-gopher.ejs` | **only** if a gopher was assigned |
| 26 | The requester | `cancelation-byadmin-mail-to-requestor.ejs` | **always** |

The requester's notice does not depend on a gopher existing. The requester is the party whose
card was authorized and is now being refunded, so they are told in every case — including a
request that was cancelled before anyone accepted it.

Neither send blocks the other, and neither blocks the refund.

---

## What was wrong, and for how long

Both sends sat inside one guard:

```js
if (cancelled_order.gopher_id) {     // the outer guard
  ...
  if (gopher_data) {
    send_mail(25, gopher_data.email, mail_data);
    send_mail(26, requester_data.email, mail_data);   // requester, gated on the gopher
  }
}
```

With no gopher assigned the whole block was skipped — address lookup, `mail_data`, both sends.
The inner `if (gopher_data)` was redundant and the `if (gopher_id) / else` branch inside it was
unreachable.

**Scale, measured on production 2026-09-09:** of **888** admin-cancelled orders all time
(`aasm_state='cancelled' AND revoked=3`), **489 had no gopher** — every one of those requesters
was told nothing. Roughly 11 a month, still running at the time of the fix.
Reported case: **order 65306**, 2026-09-08.

---

## ⚠️ The hazard that comes with the fix

Widening the guard makes the address lookup run for orders it never ran for. **4 of those 489
have no `Order` / `Order_PickUp` address row at all — only `Order_DropOff`.** The old code
dereferenced `address.line1` unguarded, and the throw lands **before** the refund:

```
db.orders.update(... payment_status: 'refunded' ...)   <- already written
  ... email block ...                                   <- a throw here
if (order.payment_status === AUTHORIZED) refund(...)    <- never reached
```

That would leave an order marked refunded in the database while the card stayed authorized —
worse than the missing email. So `cancelOrder` carries the same null guard and drop-off
fallback already applied in `controllers/order/cancel.js` and `controllers/order/emails.js`
(MRs !511, !522). **Do not remove it**, and do not re-widen any similar guard in this file
without checking what runs after it.

The requester template never dereferences the `gopher` object (its only `gopher.` is an image
URL), so it renders correctly with `gopher = null`.

## Regression cover

`test/admin-cancel-notifies-the-requester.test.js` drives the real `cancelOrder` handler with
its collaborators stubbed at the boundary. 13 checks; **5 of them fail if the guard is put
back**, verified by reverting the controller and re-running the same suite. Case 3 is the one
that matters — it pins that the refund still runs when the order has no primary address.

## Related

- `docs/handoff/G40-81-cancellation-fee-system.md` — cancellation **fees** (a separate register)
- `docs/handoff/requester-cancel-live-pair-audit.md` — requester-initiated cancel
- Requester-initiated cancel notifies the worker: `test/requester-cancel-notifies-the-worker.test.js`
