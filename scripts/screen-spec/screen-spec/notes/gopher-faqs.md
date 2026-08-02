VERDICT: ADAPT — static FAQ render backed by the canonical corpus.

BEHAVIOUR
- Worker-relevant FAQ list with categories; same corpus as the iQ engine
  (canonical source: Final/assets/js/gopher-ai-engine.js FAQS store, 184 entries/copy,
  integrity-checked by verify-faqs-integrity.py).
- Copy canon enforced here: "Requester" spelling, "Previous requests" naming.

ENDPOINTS / BACKEND SEAMS
- Serve the FAQ corpus from one source of truth; no per-screen copies in production.
