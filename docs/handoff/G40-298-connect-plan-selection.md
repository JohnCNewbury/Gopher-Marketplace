# G40-298 — CON-5 · Connect plan selection (Free vs $49.99/mo Business)

**Status:** In Progress · Assignee: John Newbury
**App:** Gopher Connect (`Final/gopher-connect.html`)
**Ticket intent:** Connect plan tiers — Free (Starter, $0) vs $49.99/mo Business — selectable at
signup **and** upgrade.

---

## TL;DR for the dev

The prototype **already implements** plan selection end-to-end. This ticket was almost entirely a
**verification** pass; the one real gap was that the two marketing `#pricing` call-to-action buttons
both dropped the user into signup **without** carrying the plan they clicked. That gap is now fixed
with a small, self-contained bridge — no new UI, no reserved-scope logic.

**Reserved scope untouched:** no payment capture, no account creation, no persistence. The Business
plan's card fields are the existing demo Stripe-test placeholders; real billing remains the dev's
server-side work.

---

## What was already in place (verified, no change needed)

1. **Signup Step 2 plan picker** (`~L20226`): three `.signup-plan[data-plan]` cards —
   `starter` / `business` / `enterprise` — with `let selectedPlan = 'business'` default and a
   click-to-select `forEach` wiring block (`~L20262`).
2. **Payment gating** — `updateBizCheckout()` shows/hides the `#snBizCheckout` payment block so the
   card fields appear **only** when Business is chosen; Starter shows no payment.
3. **90-day trial disclosure** — `#snTrialNote` renders "First 90 days free — your card is not charged
   until \<date\>. Cancel anytime before then at no cost." under the Business plan.
4. **Upgrade path** — the in-dashboard upgrade to Business reuses the same `#snBizCheckout` block and
   `updateBizCheckout()`; a Starter account can move to Business post-signup.
5. **Marketing `#pricing` section** (`~L8356`) — Starter ($0) / Business ($49.99, 90-day trial) /
   Enterprise cards, matching the signup tiers. **This is John's canonical feature split** (resolves
   the "placeholder feature list?" question in the build recap — see connectPlans.js note below).

## The gap that was fixed

Both `#pricing` CTAs (`Get Started Free`, `Start Business Plan`) called only
`window.__openSigninModal()` — they opened signup **at the default plan**, so a user who clicked
"Start Business Plan" from the marketing page still landed on Starter (or vice-versa). No signal
carried from the marketing CTA into the signup picker.

### Fix — 3 edits in `Final/gopher-connect.html`

**A. Plan-carry bridge** (added after the `.signup-plan` click-wiring `forEach`, `~L20262`):

```js
// G40-298 — bridge so the marketing #pricing CTAs carry the chosen plan into signup Step 2
window.__selectSignupPlan = (planId) => {
  const target = document.querySelector('.signup-plan[data-plan="' + planId + '"]');
  if(!target) return;
  document.querySelectorAll('.signup-plan').forEach(b => b.classList.remove('selected'));
  target.classList.add('selected');
  selectedPlan = planId;
  updateBizCheckout();   // re-gates the payment block to match
  validateStep2();
};
```

**B. "Get Started Free" CTA** (`#pricing` Starter card):

```html
<a href="#" class="plan-btn plan-btn-outline"
   onclick="if(window.__openSigninModal){window.__openSigninModal('signup-new');}
            if(window.__selectSignupPlan){window.__selectSignupPlan('starter');}return false;">
   Get Started Free</a>
```

**C. "Start Business Plan" CTA** (`#pricing` Business card):

```html
<a href="#" class="plan-btn plan-btn-solid"
   onclick="if(window.__openSigninModal){window.__openSigninModal('signup-new');}
            if(window.__selectSignupPlan){window.__selectSignupPlan('business');}return false;">
   Start Business Plan</a>
```

Both use the existing `window.__openSigninModal('signup-new')` entry (opens signup at Step 1) plus the
new bridge to pre-select the plan, so Step 2 already reflects the user's marketing-page choice.

---

## Verification (browser, isolated preview of the edited file)

| Action | Result |
| --- | --- |
| Click **Get Started Free** | `signupNewOpen:true`, `selectedPlan:"starter"`, Starter card `.selected`, **payment hidden** ✅ |
| Click **Start Business Plan** | `signupNewOpen:true`, `selectedPlan:"business"`, Business card `.selected`, **payment shown**, trial note "First 90 days free…" ✅ |
| Step 2 visual (Business path) | Business card highlighted with "90 DAYS FREE" / "MOST POPULAR"; **Payment — Business Plan ($49.99/mo)** block + card fields visible ✅ |

Screenshots captured during the session; no console errors on load or on either CTA.

---

## Notes / follow-ups for the dev

- **`connectPlans.js` scaffold reconciliation** (`Documentation/Jira Tickets/`): the scaffold's
  per-plan `features[]` arrays were placeholders. The **canonical** feature lists are the ones on the
  prototype's `#pricing` cards (Starter / Business / Enterprise). When wiring the real plan config,
  seed `connectPlans.js` from the prototype card copy, not the scaffold placeholders.
- **Billing is reserved scope.** The Business plan's card inputs are Stripe-test demo fields. The
  server-side subscription create / 90-day-trial clock / cancel-before-charge enforcement is the
  dev's work — the prototype only proves the *selection + disclosure* UX.
- The bridge is idempotent and null-safe (`if(!target) return;`), so it's harmless if the plan ids
  ever change or a CTA is removed.

## Files touched

- `Final/gopher-connect.html` — 3 edits (bridge + 2 CTA onclicks). No other files.
