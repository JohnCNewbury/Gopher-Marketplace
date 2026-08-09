# G40-11 — Payment method: required identifying info + OTP + dispute log

**Type:** Task (child of Epic G40-1 "Bug Fixes & Polish") · **Priority:** Medium · **Assignee:** John Newbury
**Status set:** groomed to dev-ready (unparked) — 2026-07-02
**Owner of build:** unassigned. ⚠️ *Superseded 2026-08-09* — this read *"human developer (payments + security are fenced off from AI work per CLAUDE.md)"*. That fence is retired; the gate is now owner consent before production. Card verification still touches payments and real user data, so it wants a stated risk/reward and a verification plan before it ships — but it is no longer waiting on a person who does not exist.

This doc is the authoritative, no-open-questions spec. Where it conflicts with the
original 2024 ticket body, **this doc wins.** Product decisions below were confirmed
by John Newbury on 2026-07-02.

---

## Goal (one line)
Every new card added must collect **five verifiable fields + billing address**, pass
name/address to Stripe for **AVS + Radar**, require an **SMS OTP** to the account phone
before the card is saved, and **log the verification event** so we have evidence to appeal
chargeback disputes.

## Resolved decisions (were the open questions — now closed)

| # | Decision | Answer (John, 2026-07-02) |
|---|----------|---------------------------|
| 1 | Ticket status (was parked pending Stripe Connect R&D) | **Unparked — build it.** |
| 2 | Which surfaces enforce this | **Native Gopher Request app + Gopher Request (web) + Gopher Connect (business).** Gopher Deals is **out of scope** for this ticket. |
| 3 | OTP after card add | **Required on EVERY card add** — even though the account phone is already OTP-verified at signup. No "skip if already verified." |
| 4 | Dispute evidence | **Log each card-add verification event** (see "Dispute audit log" below) so disputes can be appealed with more info. |
| 5 | Prototype UI | **Do not build UI in the prototype.** Build during production rebuild; use the existing prototype screens below as visual reference only. |

## Required card-entry fields (all mandatory — Submit disabled until all valid)
1. **Full Name** — as it appears on the card
2. **Card Number**
3. **Expiration Date**
4. **CVC**
5. **Billing Address** — street, city, state, ZIP (as issued to the card)

## Stripe handling
- Use Stripe tokenization; **raw PAN never touches Gopher servers.**
- Pass full name + billing address in the **`billing_details`** object so Stripe can run
  **AVS** (address match) and **Radar** fraud scoring, and so we retain that data as
  dispute evidence.
- Enable AVS + CVC checks and Radar rules in the Stripe Dashboard (block/review on AVS or
  CVC mismatch). Refs: <https://docs.stripe.com/disputes/prevention> ·
  <https://docs.stripe.com/radar>
- **Engineering choice left to dev (not a product question):** the 2024 ticket named
  `CardElement`; the modern equivalent is **Payment Element + SetupIntent** for saving a
  card off-session. Either is acceptable as long as `billing_details` (name + address) is
  populated and AVS/Radar are active. Recommend Payment Element + SetupIntent.

## OTP step (required on every card add)
- After the card details are submitted, send a **6-digit SMS OTP** to the phone number
  **already on the account** (no new phone input). Reuse the existing signup OTP provider
  (Twilio / current SMS provider).
- Card is **not saved** until the OTP is verified.
- **Expiry: 5 minutes. Resend: allowed once.**
- Incorrect/expired OTP → card not saved, user prompted to resend or retry.

## Dispute audit log (NEW — John's requirement)
On each card-add attempt, persist an **auditable, retained** record for chargeback appeals.
Capture at minimum:
- Account/user id and the Stripe **payment method id** (+ card brand / last4)
- **Timestamp** (UTC) of the verification
- **Phone number** the OTP was sent to (store per data-policy — masked or hashed as
  appropriate) and **OTP outcome** (sent / verified / failed / expired / resent)
- **IP address and device/user-agent** of the session adding the card
- Stripe result codes returned: **AVS result, CVC result, Radar risk score/outcome**

Store in a dedicated, retained audit table (not overwritten on card edit/removal) so the
full trail survives for dispute response. Retention should meet the chargeback dispute
window (typically ~120+ days after the transaction; confirm against card-network / Stripe
timelines during build).

## Acceptance criteria (updated)
1. Submit stays disabled until all five fields (incl. billing address) are valid.
2. On submit, an SMS OTP is sent to the account phone; card is not saved pre-verification.
3. Correct OTP → card saved and available.
4. Incorrect/expired OTP → card not saved; resend (once) / retry offered.
5. Name + billing address are present on the Stripe payment method object (AVS + Radar).
6. **A dispute audit record is written for every card-add attempt** with the fields above.
7. Behavior holds on native Request app (iOS + Android), Request web, and Connect.

## Front-end reference in the prototype (visual blueprint only — do NOT edit)
The go-forward web prototypes already contain the card modal and a reusable phone-OTP UI.
Mirror these; note the two gaps to add during the rebuild.

**Gopher Request web — `Final/gopher-request.html`**
- Add-payment modal: `ensureModal()` / `window.__openAddPaymentModal` (~lines 10792–10937).
  Field ids: `payName`, `payNum`, `payExp`, `payCvc`, save button `paySave`, error `payErr`.
  Collects Name/Number/Exp/CVC only — **no billing address, no OTP step** (both must be added).
- Reusable signup phone-OTP component: `rqSuPhoneOtpBtn`, label `rqOtpLabel`, copy
  "We sent a 6-digit code to your phone" (~line 16316, 16398). Reuse this pattern for the
  card-add OTP screen.

**Gopher Connect — `Final/gopher-connect.html`**
- Same add-payment modal ("Add a payment method" ~line 9468, "Name on card" ~9474,
  `__openAddPaymentModal` ~9573) — also lacks billing address + card-add OTP.
- Same signup phone-OTP ("We sent a 6-digit code" ~line 7290). A street/city/state address
  input pattern already exists elsewhere in the page (~7097) to mirror for the billing block.

**Figma (from ticket):**
- Card entry screen 1 — <https://www.figma.com/design/g7DWLbI86O6SqiwITY7jeL/%E2%9C%8F%EF%B8%8F-Gopher-UI_UX?node-id=5945-10274>
- Card entry screen 2 — <https://www.figma.com/design/g7DWLbI86O6SqiwITY7jeL/%E2%9C%8F%EF%B8%8F-Gopher-UI_UX?node-id=5945-10275>

## QA
- Missing any required field (incl. billing address) → Submit disabled.
- Complete entry → OTP sent to account phone; wrong OTP → not saved + retry/resend; expired
  OTP → not saved + resend; correct OTP → saved.
- Stripe Dashboard shows name + billing address on the payment method; AVS mismatch triggers
  the configured Radar action.
- Confirm a dispute audit record is written with all listed fields.
- No raw card data stored on Gopher servers.
- Test native iOS + Android, Request web, and Connect.
