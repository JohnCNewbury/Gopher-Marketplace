# G40-216 — Gopher Go: photo attachments in in-app messaging (parity with Requestor)

**Type:** Bug · **Priority:** Low · **Label:** worker · **Status:** To Do → dev-ready (with two flags)

Bring the **Gopher** side of in-app messaging to photo-attachment parity with the Requestor, gated so a
Gopher can only send photos once **accepted** onto an **active** request. Ticket is exhaustively specced
(7 scenarios, business rules, QA). This doc grounds it in the June-2026 backend and flags two things the
ticket's "just reuse the Requestor pipeline" framing gets wrong.

## Where messaging lives (June-2026 export)
- **Controller:** `controllers/order/faq.js` — the in-app message ("faq") seam.
  - `create_faq` (REST, L13) — gopher→requestor text send.
  - `create_faq_socket` (L87) — the **socket** send path; takes `content_type` (`'text'` default / `'image'`).
  - `get_all_faqs_v2` (L172) — thread fetch; **already** renders `content_type === 'image'` → S3 URL
    (`.../uploads/image/In_app_message/{order_id}/{faq_id}/{filename}`, L208-210) and marks viewed.
  - `set_viewed` (L235).
- **Model:** `models/orders_faqs.model.js` — `from`, `to`, `content` (TEXT), `content_type` (TEXT),
  `viewed` (BOOL), `order_id`. **`content_type` is the parity mechanism and already exists.**
- **Order fields (the gate inputs):** `orders.gopher_id` = the accepted gopher (set at acceptance,
  `order_accepted_on`); `orders.aasm_state` enum = `pending` → `accepted`/`active` → `delivered`
  (= Completed) · `cancelled` (= Canceled).

## What already works (reuse, don't rebuild)
- **Viewing photos** on both sides — `get_all_faqs_v2` already maps image messages to their S3 URL, so
  Scenario 7 (historical photos stay visible after Completed/Canceled) is already satisfied — viewing is
  not gated, only sending needs gating.
- **The `content_type='image'` message shape** — send an image message by creating an `orders_faqs` row
  with `content_type='image'` and `content` = the stored filename. No schema change needed.

## ⚠️ Flag 1 — the backend image-UPLOAD endpoint is commented-out dead code
`faq.js` L262-311: `uploadFaqImage` (multer, 10 MB) and `exports.send_image` are **entirely commented
out**, and inside it **even the S3 put is commented** (`// await s3Actions.upload(params.key, params.body)`).
So the "the Requestor already has a working backend photo pipeline, just reuse it" assumption is **not
true at the REST layer in this export.** Two possibilities the dev must confirm against the live app:
1. The Requestor uploads image bytes **client-side directly to S3** (pre-signed/SDK) and only the
   `orders_faqs` row is created over the socket (`create_faq_socket(..., 'image')`) — in which case the
   Gopher side mirrors that exact client path and there is **no reusable server upload** to inherit; or
2. There is a live server upload endpoint **not present / not enabled in this export**.

**Action:** confirm where the Requestor's image bytes actually land in S3 before estimating. If it's (1),
the "backend upload pipeline needs no changes" note in the ticket is misleading — the binary path is
client-side and must be replicated, and the commented `send_image` may need to be finished (uncomment,
wire `s3Actions.upload`) if the server is meant to own the upload.

## ⚠️ Flag 2 — there is NO server-side acceptance gate today (this is the real work + a latent bug)
The ticket's headline requirement — "the gate must be enforced **server-side** before the message is
persisted" — **does not exist today**, for photos *or text*:
- `create_faq` (L18-31) only checks `if (!gopher)` (caller has the gopher flag) and that the order exists.
  It does **not** check that the caller is *this order's accepted gopher*, nor the order status. A gopher
  can POST a message to **any** `order_id` they don't belong to.
- `create_faq_socket` checks only that `from`/`to` are present — no ownership/status check at all.

So this ticket should also **add the missing authorization** (defense-in-depth; worth noting to security):

**The gate (server-side, before persist), for a gopher-originated message:**
```
allowed = order.gopher_id === caller_id            // caller is THIS order's accepted gopher
       && ['accepted','active'].includes(order.aasm_state)   // active, not delivered/cancelled
```
- Fail → reject (403), do not persist. Applies in both `create_faq` and `create_faq_socket` (socket is the
  path images actually use, so gating only the REST endpoint would leave the hole open).
- Pre-acceptance (`gopher_id` null or ≠ caller, or `aasm_state='pending'`) → no photo; text behavior per
  current product rule (ticket says pre-acceptance text is unchanged — but note text is currently
  *ungated* too; confirm whether pre-acceptance gopher↔requestor text is even intended).
- `delivered` / `cancelled` → sending disabled (both text-photo per ticket = photo; viewing still works).

## Implementation summary
1. **Gate** (`create_faq` + `create_faq_socket`): enforce `gopher_id===caller && aasm_state∈{accepted,active}`
   before persist; reject otherwise. (Fixes the latent any-order hole and satisfies Scenarios 2/5/6 server-side.)
2. **Image send parity**: replicate the Requestor's image path on the Gopher side — create the `orders_faqs`
   row with `content_type='image'` + store bytes to the same S3 prefix. **First confirm Flag 1** (client-side
   S3 vs. finishing `send_image`).
3. **Client (Gopher app)**: mirror the Requestor's picker/preview/caption/send/tap-to-expand exactly
   (Scenario 3) — no Gopher-specific UX; enable the attach control only when accepted+active.
4. **No change to the Requestor path** (Scenario 4) and **no schema change** (content_type exists).

## Acceptance criteria (unchanged from ticket) — with grounding
- Scenarios 1-6 as written; the gate above is the server-side enforcement they require.
- Scenario 7 (historical photos remain) is **already** satisfied by `get_all_faqs_v2`.
- Add: server rejects a gopher's send (text or image) to an order where they are not the accepted gopher
  or the order is not active — closes the current hole.

## Related
- Same controller as **G40-249** (recommend-MY-Gopher duplicate inbox) and **G40-282** (set_viewed /
  Intercom) — coordinate if those land concurrently.
- In-app messaging moderation (**G40-35 / G40-263**) also hooks this send seam (`orders_faqs`, precheck) —
  the photo path should pass through the same moderation precheck as text where applicable.
