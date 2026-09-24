# G40-363 — a Stripe `pm_` token where the order id belongs — ✅ RESOLVED 2026-08-20

**Both halves shipped.** Backend: `fix/order-id-numeric-validation` (`44845e87`, live) 400s a
non-numeric order id cleanly. Client (this fix): `gopher-mobile-requester-capacitorjs!232`
(merge `6530f756`) + the ported `gopher-mobile-gopher-capacitorjs!242` (merge `fcf08646`),
both merged to `production` 2026-08-20 — **store-gated**: they reach users with the next
store release (queued alongside the no-show fixes).

## The real defect — worse than the ticket's triage guess

The ticket guessed "stale/replayed request." It was a **reproducible user dead-end**: the
Saved Payment Methods picker (`src/component/paymentcard.js`, vendor-era line, originally
next to a debug `console.log`) wrote the selected card's Stripe id into `values.id` — the
slot `summary.js` reads as **the order id** (`const orderId = values?.id`).

So: open the picker on Summary → tap a card → `values.id = "pm_..."` → the re-render
recomputes `orderId` → submit routes to **update** (even for a brand-new request) →
`PATCH /orders/v2/pm_...` → 500 (pre-backend-guard) / 400 (after) → alert → every retry
fails until the flow is abandoned. Rare only because most users never switch cards at
Summary — which is also why Sentry saw one event in 14 days with `users=0` (only the server
observed it; nothing client-side captured).

The write had **zero legitimate readers**: the selection is already persisted by
`setDefaultCard` (server `select_payment_method` + formik `summary.default_payment_method`),
and every reader of `values.id` in both apps expects the order id (`summary.js`; the
`order_id` deep-link/template resolver in `action.js`).

## The fix

1. **Delete the assignment** — in BOTH apps. The forks share `paymentcard.js` line-for-line
   (checked per the diverged-forks rule). The worker app's Summary reads `orderId` from
   redux so its PATCH URL was immune, but its `action.js` `order_id` resolver reads the
   same slot — same poison, different symptom.
2. **Tripwire in the requester's `submitOrder`** — a present-but-non-numeric order id is
   refused with a client-side `Sentry.captureMessage` **before any URL is built**, so any
   future writer of garbage into `values.id` is caught with user attribution.
   **Deliberately NOT falling through to `createOrder`:** silently creating a new order
   during an edit is the G40-266 lost-order-number bug shape. A fresh request's `values.id`
   is `undefined` (verified: `formInitValue.js` seeds no `id` key), so the tripwire cannot
   block legitimate creates.

## Verification

Remote MR diffs reviewed line-by-line against the audited change (exactly the one-line
removal per app + the tripwire; nothing else). CI green on both branches. Merges
content-verified against `origin/production`. Prettier + eslint clean on touched files.

## What to watch after the store release ships

- Sentry `GOPHER-BACKEND-API-6` should go permanently quiet for `pm_` ids from the new app
  version (old installs can still emit until they upgrade).
- Any `G40-363: non-numeric order id` client events would mean a **new** writer is
  poisoning `values.id` — that's the tripwire doing its job; trace the writer.
