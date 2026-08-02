VERDICT: ADAPT — the flow REPLACES the live JSON-driven form engine with a real UI;
fee/money mechanics underneath carry.

BEHAVIOUR
- Step 1 of 7 "What do you need today?": photo category tiles + iQ category tags +
  radio checks; Continue gated on a selection.
- Entry points: ?step=1 (signed-in browse, from Home's "All services"), ?category=
  (Home tile), ?demo=1 (adds "no account needed" ribbon — demo only), ?from=deal
  (merchant deal → lands prefilled on Step 6), ?from=again (re-request).

ENDPOINTS / BACKEND SEAMS
- Live taxonomy trap: the live app's screen flow is JSON-driven (request.json →
  sub-menu JSONs); getCategoryTypeSelectionList.json is STALE with zero references —
  do not port it.
