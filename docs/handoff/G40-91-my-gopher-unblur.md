# G40-91 — Show full Requestor identity to a MY Gopher (skip anonymisation) + close the pre-acceptance identity leak

**Jira:** G40-91 (Task, Low) · Gopher Go · Label `worker`
**Assignee:** John Newbury
**Scope:** BACKEND (payload masking) + Gopher app (client render). Dev-only. No static-prototype surface
(the worker "available requests" feed is a runtime screen, not in `Final/`).

---

## Decisions locked by John (this pass)

1. **Display mechanism = client-side unblur (fast).** The Gopher app already receives the MY-Gopher flag
   and already blurs cosmetically; render full/unblurred when the recipient is a MY Gopher.
2. **Fold the privacy leak into this ticket.** Today the backend sends the **full** Requestor identity
   (name + photo) to **every** gopher pre-acceptance — the blur is purely cosmetic on the client. That
   leak is closed here: non-MY-Gopher recipients must **not** receive the full identity in the payload.

Net effect: the anonymisation moves **server-side** (mask for non-MY-Gophers, full only for MY Gophers),
and the client keeps a light touch — it honors the MY-Gopher flag so a MY Gopher never sees a blur.

---

## What already exists (verified in code)

- **MY-Gopher membership is already computed per order for the recipient gopher.** Helper
  `helpers/functions.js:347 isFavGopher(gopher_id, requestor_id)`; used in
  `controllers/order/retrieve.js:364` and the per-order flag `order.is_you_fav_gopher`
  (`retrieve.js:370`, via `is_notify_first`). The broadcast/notification path also checks
  `db.fav_gophers.findOne(...)` (`controllers/order/notification.js:247`). **The data the rule needs is
  already in the hot path — no new lookup infrastructure required.**
- **The backend currently sends full identity to all.** `retrieve.js:431` (and the parallel blocks at
  `:1170`, `:1846`) build `newOrder.requestor = { ...req_data, ...requester_ratings }` with the full
  user record — **no masking**. This is the leak.
- **The blur is client-side.** In the Gopher app, `src/component/InAppMessage.js:526-533 & 602-609`
  apply `filter: blur(3–5px)` driven by a `blured` flag; `src/component/GopherOrderCardView.js:234,308`
  already passes `isYouFavGopher={request?.is_you_fav_gopher}` into the card.

---

## The change

### 1. Server-side — mask the pre-acceptance Requestor payload for non-MY-Gophers (closes the leak + enforces the rule)
In the gopher-facing, **pre-acceptance** order serialisation (`retrieve.js` `newOrder.requestor` blocks
at `:431`, `:1170`, `:1846`, and any broadcast/notification preview payload), branch on the already-
computed MY-Gopher flag for that recipient:

- **Recipient is a MY Gopher** (`is_you_fav_gopher` / `isFavGopher` true) → send **full** identity
  (unchanged: full `first_name`/`last_name` + real profile image URL).
- **Recipient is NOT a MY Gopher** → send a **masked** requestor object: name reduced to first name only
  (or first name + last initial — match the current cosmetic mask), and **omit the real profile image**
  (send `null` / a placeholder key, not the real URL). Do not include fields that reveal identity.

Evaluate **per recipient at send/serialise time** (a single broadcast yields full identity to MY-Gopher
recipients and masked to everyone else — AC Scenario 3). Post-acceptance payloads are unchanged
(identity already revealed — Scenario 6).

> This is the "fold-in": once non-MY-Gophers no longer receive the real name/photo, the client blur
> becomes belt-and-suspenders rather than the sole protection.

### 2. Client-side — unblur for MY Gophers (the "fast" display change)
In the Gopher app, wherever the Requestor identity is blurred/masked pre-acceptance (the order card,
request-details view, and notification/broadcast preview — all fed by the payload above), **skip the
blur and show the full name when `is_you_fav_gopher` is true.** The flag is already on the card
(`GopherOrderCardView.js`); thread it into the `blured` decision in `InAppMessage.js` (and the request-
details/notification-preview components) so `is_you_fav_gopher === true` ⇒ `blured = false`.

For non-MY-Gophers the app now receives already-masked data, so the existing blurred/placeholder
rendering still looks correct.

---

## Acceptance mapping
- **S1 / S4** MY Gopher → full name + unblurred photo on push, broadcast preview, request details.
- **S2** non-MY-Gopher → masked name + no real photo (now enforced server-side, not just blurred).
- **S3** mixed broadcast → per-recipient result, because masking is decided per recipient at serialise.
- **S5** removed from MY Gopher before the broadcast → treated as non-fav → masked. (Membership is read
  at send time.)
- **S6** post-acceptance unchanged.

## QA (delta)
- MY Gopher recipient: full name + real photo on all three pre-acceptance surfaces.
- Non-MY-Gopher recipient: inspect the **payload** (not just the UI) — confirm the real name/photo are
  **absent**, not merely blurred.
- Mixed broadcast to one MY Gopher + one non → different payloads/renders.
- Remove from MY Gopher, re-broadcast → masked.
- iOS + Android.
