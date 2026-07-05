# G40-308 — Pop-up Modal Standards (Guide A + Guide B)

**Jira:** G40-308 (Task, High) · Labels `spine, design-system, blocker` · **HARD BLOCKER** on all dev handoffs.
**Companion:** `docs/handoff/G40-308-modal-kit.html` — rendered reference implementation + reusable component.

This is the single source of truth for every pop-up / modal in the product. **No modal derives its visual
design from old Figma** ([[no-old-figma-carryover]]). All values below are grounded in the *current*
new-UX prototypes, harmonized onto the canonical brand palette.

---

## Two guides, one token system

| | **Guide A — Request + Connect** | **Guide B — the 2 native apps** (Gopher App + Gopher Go) |
| --- | --- | --- |
| Surfaces | `Final/gopher-request.html`, `Final/gopher-connect.html` | requester native app, `_prototypes/Go/gopher-go-worker.html` |
| Default form | **Centered card** (`.gr-modal`/`.gc-modal`) | **Bottom sheet** (`.sheet`) |
| Alt form | full-screen form (wide variant) | centered alert (short confirms) |
| Origin in code | `gr-modal` (Request), `gc-modal` (Connect) — 95% identical | `.sheet` / `.sheet-overlay` (worker) |

Both guides share ONE set of design tokens (below). The difference is **shape + motion**, not color/type.

---

## Design tokens (canonical — from Connect & the worker app)

> ⚠️ **The Request app modals are currently on an OLD palette** (`--navy:#2a3654`, white text on green).
> They must migrate to the canonical values below. Connect and the worker app are already correct.

```css
/* Brand */
--green:#33D975;        /* Shamrock — primary */
--green-dark:#1CB061;   /* Mountain Meadow — hover/active */
--green-light:#e2f3e9;  /* soft fills */
--ink-on-green:#002461; /* Midnight Blue — text/icons ON green. NEVER white (WCAG "white-text trap") */
--navy:#002461;         /* Midnight Blue — all headlines */
--navy-mid:#1a3a7a;
--navy-light:#eef0f8;
--sand:#FBF3E4;         /* canonical light canvas */
--text:#424242;         /* body */
--muted:#6b7280;        /* sub-copy, secondary */
/* Status */
--terracotta:#D97757;   /* attention/brand accent */
--error:#C44257;        /* destructive */
--warning:#FFDE00; --warning-text:#92580D;
/* Shape & depth */
--radius:18px;                        /* card corners (A) */
--sheet-radius:26px;                  /* top corners (B) */
--scrim-a:rgba(13,26,62,.55);         /* centered card scrim */
--scrim-b:rgba(3,16,43,.55);          /* sheet scrim (+ backdrop-blur 2px) */
--shadow-card:0 30px 80px rgba(0,0,0,.35);
--shadow-sheet:0 -10px 40px rgba(0,0,0,.25);
```
**Type:** headings/buttons **Nunito** (800 titles are 900; buttons 800–900); body **DM Sans**.
Title 19px, body 13–13.5px (line-height ~1.5), button 14–14.5px.

**The white-text rule (non-negotiable):** text/icons placed on Shamrock green use **Midnight Blue
`#002461`**, never white. White on `#33D975` fails WCAG contrast; navy passes AAA. This is why
`--ink-on-green` is navy.

---

## Guide A — centered card

### Anatomy (top → bottom)
1. **Scrim** — `--scrim-a`, fixed, fland centered, 24px padding, `z-index:9500`.
2. **Card** — white, `--radius`, padding `28px 26px 24px`, `max-width:380px`, centered text, `--shadow-card`.
3. **Close ×** — top-right (12/15px), 23px, `--muted` → `--navy` on hover. (Omit on blocking decisions.)
4. **Icon** (optional) — 54px **circle**, emoji 26px. Tint by intent: info `#fff5e6` · success `--green-light`
   · warning `#fdeaec`.
5. **Title** — `h4`, Nunito 900, 19px, `--navy`.
6. **Body** — DM Sans 13.5px, `--muted`, line-height 1.55.
7. **Primary button** — full-width, `--green` bg, **`--ink-on-green` text**, radius 11, padding 13,
   Nunito 800 14px, green shadow; hover `--green-dark`; disabled `#d8dee6`/`#9aa6b4`.
8. **Secondary button** (optional) — outlined: transparent + `1.5px #dfe3ec`, `--navy` text; hover fills navy.
9. **Text button** (optional) — muted Nunito 700 12.5px; **destructive** variant = `--error` bold.
10. **Danger button** — `--error` fill, white text (error red is not the white-text-trap color).

### Sizes
- **Default** 380px, centered text — confirmations, alerts, single input.
- **Wide/form** 600px, **left-aligned**, `max-height:90vh; overflow-y:auto` — multi-field forms (e.g. profile edit).

### Motion
Fade scrim + card scale/opacity in ~0.2s. Dismiss reverse. (Request/Connect currently toggle `hidden`;
the kit adds the standard transition.)

---

## Guide B — bottom sheet (native)

### Anatomy
1. **Scrim** — `--scrim-b` + `backdrop-filter:blur(2px)`, opacity/visibility transition .28s.
2. **Sheet** — bottom-anchored, `border-radius:26px 26px 0 0`, padding `22px 20px 26px`, `--shadow-sheet`;
   enters via `translateY(100%)→0`, `transition:transform .34s cubic-bezier(.2,.8,.3,1)`; respects safe-area inset.
3. **Grab handle** — 42×5, `#dfe4ee`, centered (affordance for swipe-to-dismiss).
4. **Icon** (optional) — 56px **rounded square** (radius 16), green gradient, emoji 27px, green shadow.
   *(Note the deliberate contrast with Guide A's circle — sheets use the rounded-square badge.)*
5. **Title** — `h3`, Nunito 900 19px `--navy`, centered, letter-spacing −.3.
6. **Sub** — 13px `--muted`, centered.
7. **Info list** (optional) — `.sh-list` grey card of icon+label+detail rows.
8. **Primary CTA** — full-width green gradient, **`--ink-on-green` text**, radius 14, padding 16, Nunito 900 14.5.
9. **Close** — full-width text button, `--muted`, Nunito 800 12.5.

### Centered-alert variant
For short, urgent confirms (e.g. destructive "Are you sure?"), a native centered alert is allowed instead
of a sheet — same tokens, Guide A card geometry, but rendered by the app's native alert layer.

### Dismissal
Swipe-down on the grab handle, tap scrim, or the Close button. Blocking decisions omit scrim-dismiss.

---

## Variants (both guides)

| Variant | Icon tint | Buttons |
| --- | --- | --- |
| **Info** | neutral `#fff5e6` / gradient | one primary |
| **Confirm** | neutral | primary + secondary/text cancel |
| **Success** | `--green-light` / green gradient | one primary |
| **Warning** | `#fdeaec` | primary + text |
| **Destructive** | `#fdeaec` | **danger** primary + text ("keep") |
| **Input** | optional | primary (disabled until valid) + text |

---

## Accessibility (required)

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title id (Guide A already does this).
- **Focus trap** while open; return focus to the trigger on close.
- **Esc** closes (except hard-blocking decisions). Scrim tap closes for non-blocking only.
- Min tap target 44×44 on native.
- Contrast: enforce the white-text rule; verify body/muted on white ≥ 4.5:1.

---

## Voice

"Neighbor" voice — warm, plain, reassuring. Titles are short and human ("Still need a Gopher?"), body
explains + reassures, primary button is a clear verb. Destructive actions name the consequence.

---

## Reusable component (the deliverable that unblocks handoff)

`docs/handoff/G40-308-modal-kit.html` implements **one** modal component per guide with a small JS API:

```js
GModal.open({ variant, icon, title, body, primary:{label,onClick}, secondary, text, size });   // Guide A
GSheet.open({ variant, icon, title, sub, list, cta:{label,onClick}, closeLabel });               // Guide B
```

**Adoption plan (before dev handoff):**
1. Land the canonical tokens in all four surfaces (Request needs the palette migration).
2. Replace `.gr-modal` and `.gc-modal` markup with the shared `GModal` component (Guide A).
3. Adopt `GSheet` in the worker app and the requester native app (Guide B).
4. **Inventory + migrate** existing modals: Request has **26** (`.gr-modal-overlay`), Connect **~35**
   (`.gc-modal-overlay`), worker uses `.sheet`. Each converts to the component; ad-hoc one-offs removed.
5. Tickets with modal UI (e.g. G40-137 "Counter-Offer Update" = Guide B sheet) build against this kit.

## Migration notes / gotchas

- **Request palette drift** — `--navy:#2a3654`→`#002461`; `--ink-on-green:#ffffff`→`#002461`;
  `--green-dark:#1fb85f`→`#1CB061`. Audit any hard-coded `#fff` on green fills.
- Prefix unification — collapse `gr-`/`gc-` prefixes into one `g-modal` namespace so both apps share CSS.
- Keep the two icon shapes distinct on purpose: **circle** (Guide A) vs **rounded-square badge** (Guide B).
