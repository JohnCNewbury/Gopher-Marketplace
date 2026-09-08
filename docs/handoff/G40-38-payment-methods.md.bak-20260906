# G40-38 — New payment options for Requestors (Stripe)

**Jira:** G40-38 (Task, High) · Epic **G40-1 Bug Fixes & Polish** · Label `pay` · Fix version *Phase 1 — Bug Fixes & Polish*
**Assignee:** John Newbury
**Surface (Requestor / customer side):** Request web `Final/gopher-request.html` + Connect `Final/gopher-connect.html` (canonical flow). Same in the native Gopher Request/Connect apps.
**Scope of this branch:** FRONT-END reference is **already complete** (prototype v115, ported from Connect). No Stripe/payment code — reserved for the human dev per `Final/CLAUDE.md`.

---

## TL;DR for the developer

The **payment-method UX is fully built as a reference** in the prototype and matches the three
product decisions locked below. Your work is the **Stripe + native-SDK backend** that makes it
real: Payment Element + Express Checkout Element, server-side webhook confirmation, a real
surcharge line, native card scan, and standalone Venmo via Braintree. **No open questions — build
to this contract.**

### Locked decisions (John, this session)
1. **Standalone Venmo → BUILD IT** via **Braintree** (PayPal's platform), in addition to Venmo
   coming free through the PayPal-via-Stripe path. US-only, business fee **1.9% + $0.10**, and it
   **must not** run in a WebView (Safari View Controller on iOS / Chrome Custom Tabs on Android).
2. **Fees → PASS THROUGH as a surcharge.** PayPal / Cash App / Venmo (and Braintree Venmo) carry
   higher processing fees; the Requestor pays the difference as a **surcharge disclosed before
   confirm.** (This matches the prototype's "small fee" tags — see *Fee surcharge* below.)
3. **Card scan → KEEP IN SCOPE.** Photo-to-register stays; dev confirms current Stripe mobile-SDK
   card-scan availability (it has narrowed in recent SDK versions) and wires it to the existing
   affordance.

---

## ✅ DONE in the prototype (front-end reference — no further FE work needed)

Built in **`gopher-request.html`** and **`gopher-connect.html`** (parity; Connect is canonical),
tagged `G40-38`. Session-only, no real Stripe calls. What's there:

- **One shared in-session store** `window.__payStore` driving **both** the checkout pay-picker
  **and** the account "Payment Info" screen — add/edit/default/remove in one reflects in the other.
  Helpers: `__addPayMethod / __updatePayMethod / __removePayMethod / __setDefaultPayMethod /
  __setSelectedPayKey / __renderPayMethods / __openAddPaymentModal(editKey)`. Entry shape:
  `{key,brand,shortLabel,name,cardholder,nick,sub,isDefault,last4,exp,wallet}`.
- **All target methods present:** Apple Pay, Google Pay, PayPal, Cash App, Venmo + cards (Visa/
  Amex/MC/Discover) and ACH. Wallets carry a `fee` flag (`paypal/cashapp/venmo = true`).
- **Fee disclosure before confirm:** "small fee" tags render on PayPal/Cash App/Venmo at the
  checkout step **before** the Requestor confirms — the placeholder for the real surcharge line.
- **Device-linked note** on Apple/Google Pay ("Linked to your device") — placeholder for Stripe's
  real device-aware presentation.
- **Add-Payment modal that "acts real":** live brand detection (Visa `^4` · Amex `^3[47]` · MC
  `51-55/2221-2720` · Discover `6011/65/64[4-9]/622`), brand-aware formatting (Amex 4-6-5 + 4-digit
  CVC; others 4-4-4-4 + 3), live 1.586:1 card preview, and a **"Scan" demo autofill** for the
  card-scan affordance.

**No front-end gaps** for the ticket's ACs. The one intentional placeholder is the *exact*
surcharge number (below), which depends on live Stripe pricing + finance.

---

## 🔧 TO BUILD (developer / backend — this is the real ticket)

### 1. Core integration — Payment Element + Express Checkout Element
- Implement Stripe's **Payment Element** + **Express Checkout Element** via the **iOS and Android
  SDKs** for in-app payments (and Elements on web for Request web/Connect).
- **Enable Dynamic Payment Methods** in the Stripe Dashboard so methods toggle without code changes;
  Stripe auto-orders by conversion probability.
- **Device-aware display is automatic** via Express Checkout Element: **Apple Pay only on Apple
  devices, Google Pay only on Android/Chrome.** Do not hand-roll detection.
- **Accordion layout** for 4+ methods (top 3–4 + "More"). **Enable Stripe Link** for one-click
  returning-user checkout.

### 2. Server-side confirmation (never trust the client)
- **All data tokenized through Stripe** before it reaches Gopher servers (PCI DSS). No raw card
  data server-side.
- **Webhooks confirm success/failure/cancellation** for every method. A request is **activated
  only after** the webhook confirms payment success — never on client-side confirmation alone.

### 3. Fee surcharge (PASS THROUGH — decision #2)
- For fee-bearing methods (PayPal, Cash App, Venmo, Braintree Venmo), compute the **surcharge** and
  show it as a **line item before confirm** (the prototype's "small fee" tag is the placeholder).
- **Confirm the exact fee structure with finance before go-live** (e.g., Braintree Venmo 1.9% +
  $0.10; PayPal/Cash App per current Stripe pricing). Surface the real number, not "small fee."

### 4. Card scan (KEEP — decision #3)
- Wire **Stripe mobile-SDK card scanning** to the existing "Scan" affordance; tokenize via the SDK
  (no raw PAN stored). **Confirm card-scan is available in the current Stripe SDK version** — it has
  been narrowed/deprecated in recent releases; if unavailable, raise it (do not silently drop).

### 5. Standalone Venmo via Braintree (BUILD — decision #1)
- Integrate **Braintree** (PayPal's platform) iOS/Android SDKs for standalone Venmo (users without a
  linked PayPal). **US-only, requires a US business entity, 1.9% + $0.10.**
- **Must launch in Safari View Controller (iOS) / Chrome Custom Tabs (Android) — never a WebView/
  iframe.** (Venmo will reject WebView.)
- Also: **enabling PayPal through Stripe unlocks Venmo for linked accounts** — do both paths.

---

## Acceptance criteria → where it lives

| Scenario | Front-end reference (done) | Backend (to build) |
|---|---|---|
| 1 — all eligible methods shown, device-aware | pay-picker w/ all methods + device note | Express Checkout Element auto-presents Apple/Google Pay per device |
| 2 — complete payment via each method | method selectable + confirm flow | real Stripe/Braintree processing + webhook-confirmed submit |
| 3 — card scan registers a card | "Scan" demo autofill affordance | Stripe SDK card scan → tokenize → register |
| 4 — fee differences shown before confirm | "small fee" tags before confirm | computed pass-through surcharge line (finance-verified) |

## QA (from ticket) — test on iOS **and** Android
Each method end-to-end (Apple/Google Pay, PayPal, Cash App, Venmo) → success + request submitted.
Apple Pay only on iOS, Google Pay only on Android/Chrome. Card scan populates + registers. Simulate
per-method failures → graceful return to payment screen. Fee disclosures show before confirm.
Success verified **server-side via webhook** before activation. Venmo launches in Safari View
Controller / Chrome Custom Tabs, **not** a WebView.

## Dependencies / notes
- Enable Dynamic Payment Methods in the Stripe Dashboard.
- PayPal via Stripe (unlocks linked-account Venmo) **and** Braintree for standalone Venmo.
- Confirm processing-fee structure with **finance** before go-live (surcharge is pass-through).
- Confirm Stripe SDK card-scan availability in the pinned SDK version.
- Configure webhooks for success/failure/cancellation across all methods.
- Evaluate/enable Stripe Link.
- Figma UI: https://www.figma.com/design/H6THlatWvwT6ESI2j4MPTi/Final-Flows?node-id=1149-3711

## Prototype limitations (don't mistake for real behavior)
Session-only, resets on reload; no Stripe/Braintree calls; "Scan" is a demo autofill; fee tags are
qualitative placeholders for the real computed surcharge. It exists to lock methods, states, copy,
fee-disclosure placement, and the store seam — build the real pipeline against the contract above.
