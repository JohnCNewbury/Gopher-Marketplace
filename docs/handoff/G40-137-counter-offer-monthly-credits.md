# G40-137 — Counter-Offer Monthly Credits (Gopher Go)

**Jira:** G40-137 (Task, Low) · Label `worker` · Backlog map: KEEP / Wave 3
**Assignee:** John Newbury
**Modal design:** follows **G40-308 — Pop-up Modal Standards** (Guide B, native apps). ⚠️ The old Figma
node 94-11464 (`aRFH8dqUfSHLJTb89VZYNh`) is **OLD UX** — used here ONLY for message copy/intent, **not**
as the visual design (per policy: no old-app Figma carryover). Copy-reference PNG:
`docs/handoff/G40-137-counter-offer-update-figma.png`. **Blocked by G40-308.**

## Rule

- **Standard** Gophers: **5 counter-offer credits per calendar month**.
- **Elite** (legacy Pro) and **Elite+** (legacy Pro+): **unlimited** — no cap, no countdown.
- Credits reset on the **1st of each month**.
- **A credit is consumed when a counter-offer is ACCEPTED by the requester** — John's call
  (2026-07-03). Submitting a counter-offer is free; the scarce resource is an *accepted* one. So a
  Standard Gopher can have at most **5 accepted counter-offers per month**.

### Tier mapping (grounded)
`constants/index.js` → `GOPHER_TYPE = { STANDARD: 0, PRO: 1, PRO_PLUS: 2 }`. Stored on
`users_roles.gopher_type_id` (role_id 2 = Gopher). Per G40-199 rename, PRO→**Elite**, PRO_PLUS→**Elite+**
(display only; ids unchanged). **Cap applies only to `gopher_type_id === 0`.**

---

## Backend (repo `gopher-backend-api`)

### a) Track acceptance time — `models/counter_offers.model.js`
The table has `active` (set true on accept) + `updated_at`, but `updated_at` is not a reliable
"accepted at" (any later write moves it). Add a dedicated column so the monthly count is exact:
```js
accepted_at: { type: 'TIMESTAMP', allowNull: true },   // set once when the counter-offer is accepted
```
Migration: add nullable `accepted_at` to `counter_offers`. No backfill.

### b) Enforce + stamp at acceptance — `controllers/order/counter_offer.js` → `exports.accept_counter_offer` (line 345)
The counter-offer being accepted is loaded at ~line 368 (`counter_offer`, with `.gopher_id`). Insert the
cap check **after** that lookup and **before** the charge/assign (~line 408):

```js
const { GOPHER_TYPE } = require('../../constants');   // { STANDARD:0, PRO:1, PRO_PLUS:2 }
const moment = require('moment');

// G40-137: Standard Gophers may have at most 5 ACCEPTED counter-offers per calendar month.
const gRole = await user_services.get_users_role_details([
  { user_id: counter_offer.gopher_id, role_id: 2 },   // 2 = Gopher
]);
const gopherTypeId = gRole && gRole[0] ? gRole[0].gopher_type_id : GOPHER_TYPE.STANDARD;

if (gopherTypeId === GOPHER_TYPE.STANDARD) {
  const startOfMonth = moment().startOf('month').toDate();   // platform TZ — match existing monthly logic
  const acceptedThisMonth = await db.counter_offers.count({
    where: {
      gopher_id: counter_offer.gopher_id,
      active: true,
      deleted: false,
      accepted_at: { [db.Sequelize.Op.gte]: startOfMonth },
    },
  });
  if (acceptedThisMonth >= 5) {
    db.order_logs.create({
      notes: 'Counter-offer not accepted: Gopher has reached the 5/month Standard counter-offer limit.',
      order_id: id, created_on: new Date(), type: 'info',
    });
    const error = new Error(
      'This Gopher has used all 5 of their monthly counter-offers. They can accept the offer as-is, ' +
      'or upgrade to Elite for unlimited counter-offers.'
    );
    error.statusCode = 400;
    throw error;
  }
}
```
Then, where the acceptance is finalized (the same place `active` is set true for this counter-offer),
**stamp `accepted_at: new Date()`** on that row.

> Why the cap is at acceptance, not submit: only acceptance can be truly bounded at 5 — multiple
> pending counter-offers could otherwise all be accepted and blow past 5. The requester-facing accept
> action is the hard gate. To keep that from being a surprise, also surface remaining credits to the
> Gopher at submit time (see UI, optional polish).

### c) Remaining-credits value (for the modal + any profile display)
```js
// Standard → { limit: 5, used, remaining }.  Elite/Elite+ → { unlimited: true }.
async function counterOfferCredits(gopherUserId, gopherTypeId) {
  if (gopherTypeId !== GOPHER_TYPE.STANDARD) return { unlimited: true };
  const used = await db.counter_offers.count({
    where: { gopher_id: gopherUserId, active: true, deleted: false,
             accepted_at: { [db.Sequelize.Op.gte]: moment().startOf('month').toDate() } },
  });
  return { limit: 5, used, remaining: Math.max(0, 5 - used),
           resetDate: moment().add(1, 'month').startOf('month').format('MM-DD-YYYY') };
}
```
Include this in the **acceptance notification** sent to the Gopher (push + in-app) so the modal can render
the count and reset date. `resetDate` fills the Figma's `##-01-##` (= `MM-01-YYYY`, 1st of next month).

---

## UI — "Counter-Offer Update" modal

Built from **G40-308 Pop-up Modal Standards** (Guide B — native apps), **not** the old Figma frame.
Shown to the **Gopher** when their counter-offer is accepted. Copy/intent below; visual per G40-308 (Standard):

> **Counter-Offer Update**
> Your Counter-Offer has been accepted!
> With **Standard Gopher** status, you have **{remaining}** remaining Counter-Offers until **{resetDate}**.
> Reminder Gophers with **Elite** status have unlimited Counter-Offers available.
> **[ Continue ]**

- **Elite / Elite+**: no countdown line (they're unlimited) — show a plain "accepted" confirmation, or
  omit the credits copy entirely.
- **`{remaining}` = 0** case: message that they've used all 5 this month and reset date; lean into the
  Elite upsell.
- Data contract from backend: `{ tier: 'Standard'|'Elite'|'Elite+', remaining, resetDate }`.

**Prototype status:** `_prototypes/Go/gopher-go-worker.html` has the tier toggle
(`#tierSeg`: Standard / Elite+) and job detail, but **no counter-offer flow yet** (only "Accept job" /
"Place a bid"). This modal is built to the **G40-308** modal standard (Guide B) and added alongside the
counter-offer flow when that's built; there's no existing seam to bolt it onto today.

**Optional polish (recommended):** when a Standard Gopher opens the counter-offer entry, show
"{remaining} of 5 counter-offers left this month" and disable submit at 0 — so a maxed-out Gopher isn't
surprised by a later acceptance failure. Not required for the AC.

---

## Acceptance criteria

1. Standard Gopher, <5 accepted this month: requester can accept their counter-offer; on success the
   Gopher sees the modal with the decremented remaining count + reset date.
2. Standard Gopher, already 5 accepted this month: acceptance is blocked with the limit message; no
   assignment, no charge change.
3. Elite / Elite+ Gopher: unlimited — acceptance always allowed, no countdown shown.
4. Counts reset on the 1st: an acceptance on the 1st of a new month sees `remaining = 5` again
   (count filters on `accepted_at >= start of current month`).
5. `resetDate` renders as the 1st of the next month (`MM-01-YYYY`), matching the Figma `##-01-##`.
6. Submitting counter-offers is not itself capped; only accepted ones consume credits.
