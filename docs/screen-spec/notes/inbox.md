VERDICT: ADAPT — messaging exists live; moderation + delete are the new layer.

BEHAVIOUR
- Conversation list + thread; per-message delete via the shared inbox module
  (G40-100 — one module, both apps).
- In-App Communication Policy (G40-35): moderation umbrella; contact-sharing is
  allowed AFTER accept (connected-job contact rule), filtered before.

ENDPOINTS / BACKEND SEAMS
- Live messaging transport carries; moderation_rules.json seam runs server-side on
  send; push notification tap-through must be built (live handlers are empty).
