# Required-Field Gate UX — Standardized "pulse the card" Pattern

_Dated 2026-06-27. Lives in `docs/handoff/` alongside the other handoff docs.
Front-end UX consistency only — no change to **what** counts as required, no real
validation/enforcement added, nothing in backend-reserved areas (payments, auth,
persistence, matching, security)._

## What changed and why

When a user taps a forward control (Continue / Submit / Save / Send) and a required
field is empty, every surface now responds the **same way**: the **bordered card that
contains the missing field pulses** with a soft reddish glow, the view scrolls to it,
and the existing "what's needed" message still shows. This replaces the old
inline indicator that ringed/shook the **bare input** (`field-required-flash` in
Connect/Request, `.field-invalid` on the bare input in the Request prototype, a
one-shot `.attn` flash on the bare input in the Go prototype).

The gating logic (what's required, when a gate fires, the message text) is
**unchanged** — only the *visual response* was standardized.

## Source-of-truth effect (reused, not reinvented)

The canonical effect is the reddish pulsing glow already used on the gopher-iQ
"Want a second set of eyes?" card in `Final/gopher-connect.html`:

- Keyframe **`redGlowPulse`** — soft `box-shadow` breathing in `rgba(196,66,87,…)`,
  `3s ease-in-out infinite`, with a `prefers-reduced-motion` fallback to a static glow.
- Applied via **`.sse-block.pulse-attn`** by toggling a class; removed by removing it.

Each surface already shipped its own copy of this same effect (same red), so we
**reused the per-file equivalent in place** rather than unifying to one shared class
(lower risk, no cross-file CSS surgery). Timings differ slightly by file and that's
accepted (Connect 3s, Request 2.6s).

| Surface | Glow keyframe | Card-pulse class used |
|---|---|---|
| Connect | `redGlowPulse` (existing) | `.req-card-pulse` (new helper, reuses the keyframe) |
| Request | `attnRedGlow` (existing) | `.attn-pulse` (existing generic helper) |
| Request prototype | `attnRedGlow` (existing, inside the screen) | `.field-invalid` (existing, now escalated to the card) |
| Go prototype | none — **ported in** `redGlowPulse` | `.req-card-pulse` (new) |

## The standard response (when a gate fires)

1. Keep/show the existing message (toast or inline copy) — unchanged.
2. Resolve the **card** = the bordered section/group the field lives in (NOT the bare
   input), apply the surface's card-pulse class to it, and remove any bare-input
   indicator so the old one is **gone, not layered underneath**.
3. `scrollIntoView({behavior:'smooth', block:'center'})` to the card.
4. Clear the pulse when the field is satisfied / on next interaction (mirrors how the
   iQ effect clears), with a timed backstop so it can't breathe forever.
5. When several fields are empty at once, the existing `stepGate()` returns the
   **first** failing field, so it naturally pulses/scrolls to the first.

Field → card map (the three text-input gates that previously ringed the bare input):

| Field | Card pulsed | Reached via |
|---|---|---|
| Describe textarea (`#descriptionInput`) | `.step-section` | `field.closest('.step-section')` |
| Cost of items (`#costOfItemsInput`) | `.cost-input-box` | `field.closest('.cost-input-box')` |
| Worker pay (`#payAmountInput`) | `.cost-input-box` | `field.closest('.cost-input-box')` |

Container-anchored gates that already targeted a card (category grid, age/ID banners,
schedule row, liability waiver) were left on their existing path.

## Per-surface wiring

- **Connect (`Final/gopher-connect.html`)** — added CSS helper `.req-card-pulse`
  (reuses `redGlowPulse` + reduced-motion fallback) near the keyframe. In
  `showGatePrompt()`, the three text-input gates divert to pulse `.step-section` /
  `.cost-input-box`; all other gates fall through to the untouched original path.
- **Request (`Final/gopher-request.html`)** — same change in `showGatePrompt()`,
  reusing the file's existing generic `.attn-pulse` (keyframe `attnRedGlow`). No new
  CSS needed.
- **Go prototype (`_prototypes/gopher-go-prototype.html`)** — ported the canonical
  glow in (`@keyframes redGlowPulse` + `.req-card-pulse` + reduced-motion), added a
  `pulseCard(el)` helper (pulse + scroll + clear), and converted all five gates
  (categories, Ride Sharing, identity, payout card, support message) to pulse the
  `.field` / card container instead of the bare input. Renders inside the page's
  Shadow DOM.
- **Request prototype (`_prototypes/gopher-request-prototype.html`)** — screens are
  base64 `srcdoc` iframes. **No head-injection was needed** (unlike the messaging
  guard): the flow screen already ships the `attnRedGlow` keyframe + `.field-invalid`
  class, and its `flashGate()` already scrolls and escalates inputs to `.sub-field`.
  The fix is a 2-line escalation inside the (decoded → patched → re-encoded) screen:
  `.closest('.sub-field')` → `.closest('.sub-field, .step-section')` in both
  `flashGate()` and the input-clear path in `bindFieldInputs()`. Cost/Pay still
  resolve to their nearer `.sub-field`; Describe now resolves to its `.step-section`
  card. Verified rendering **inside the iframe**.

## Implementation note — clearing when the trigger lives inside the card (Go)

In Connect/Request the forward button sits in the footer, outside the pulsed card.
In the Go prototype, some gates' Save/Send buttons sit **inside** the container being
pulsed (e.g. Send inside `.cu-form`), so the same click bubbled up and fired the
"clear on click" listener immediately — the pulse never showed. Fixed by **deferring
the clear-listener attachment by one tick** (`setTimeout(…, 0)`) in `pulseCard()`.

## Deliberate boundary — auth flow left on the old pattern

Connect's **sign-up / create-account modal** gates (`validateStep1` / `validateStep2`
/ `flashSignupField`) are **intentionally left on the old field-flash pattern**.
Authentication/accounts are reserved for the human developer (CLAUDE.md); these gates
should be standardized **when auth is rebuilt**, not patched here. This is a chosen
boundary, not a missed surface.

## Verification

Each converted gate was confirmed in a **real browser via computed style** (not
code-reading): the card carries the glow animation (`redGlowPulse` / `attnRedGlow`)
and the bare input no longer carries the old indicator class. For the Request
prototype this was checked **inside** `#appFrame.contentDocument`. Page-height capture
quirks on the multi-megabyte pages were worked around by framing with a tall viewport;
computed style is the authoritative check.
