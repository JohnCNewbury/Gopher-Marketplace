VERDICT: REUSE (money mechanics) — the fronting/reimbursement model is live.

BEHAVIOUR
- Explains purchase jobs: the worker fronts the item cost at the store and is
  reimbursed in full at completion, on top of the offer. Deposit banner shows the
  breakdown ("$X is your pay · $Y fronts the purchase").

ENDPOINTS / BACKEND SEAMS
- Stripe 120% auth at submit, confirm-on-claim, partial capture at completion —
  carries as-is. Cost-of-goods flows to the worker at 100%.
