# G40-302 — Request-app bottom-sheet consolidation (inventory + conversion)

**Ticket:** G40-302 (reskin-readiness modal audit) · implements the sheet half of its
"structural reskin targets" short list.
**Standard:** `G40-308-popup-modal-standards.md` → **Guide B — bottom sheet (native)**.
**Surface:** `_prototypes/Request/` only. No web app, backend, or payment code.
**Date:** 2026-08-12

---

## Why this existed

G40-302's audit named four competing bottom-sheet classes in the Request app prototype —
`.sheet`, `.g40-sheet`, `.gsheet`, `.su-sheet` — to be consolidated onto one Guide-B token.
The ticket has sat since 2026-07-08 with the audit done and the build not started.

## Real scope — the raw grep was misleading

A naive `grep` counts **76** references. That number is wrong for two reasons, both worth
recording because they recur in this repo:

1. **It included non-shipping files.** `_prototypes/Request/` holds 34 files, but only 6 ship
   via the `PROTO[]` allowlist in `scripts/deploy.sh`. The rest are disk-only variants
   (`sim_base.upload.html`, the two `FOOTER-FIXED` copies, `gopher-request-app.html`), plus
   `_stale_pre_upload/` and `reqpkg/` — the latter deliberately frozen.
2. **`\bsheet\b` matches inside hyphenated names.** A hyphen is a word boundary, so the pattern
   hits `g40-sheet-head`, `g40-sheet-title`, etc. This is the same false positive that made
   `\bloc\b` match `rq-loc` and `rl-loc` during the Deals-chip work the same day. **Match the
   full class token, not a word-boundary substring.**

### Actual element counts on shipping surfaces

| Class | Elements | Files |
| --- | --- | --- |
| `.sheet` | 4 | deals (1), refer (3) |
| `.g40-sheet` | 4 | inprogress |
| `.gsheet` | 1 | home |
| `.su-sheet` | **0 in markup — but ≥1 at runtime** | home, flow (built in JS; see finding 1) |

Four more `.sheet` elements live in tracked-but-undeployed files
(`gopher-request-completion.html`, `gopher-deals-screen-FOOTER-FIXED.html`) and are out of scope.

## Findings

### 1. ⚠️ `.su-sheet` is NOT dead CSS — corrected, and this is the important lesson here

The first pass of this work concluded `.su-sheet` was dead (two rules each in `home` and `flow`,
**zero elements**) and deleted it. **That was wrong, and it broke a live component.**

`.su-sheet` is the **signup sheet, built in JavaScript**:

```js
const sheet = document.createElement('div');
sheet.className = 'su-sheet';
sheet.id = 'suSheet';
```

The element-count inventory scanned `class="…"` in markup and therefore could not see it. The
deletion was caught by a post-change verification pass, both files were restored from backup, and
the rules are intact.

**The rule this establishes for any future class-consolidation work in this repo:** an element
count taken from markup is a *lower bound*, never proof of deadness. Before deleting a rule,
also grep for the bare class name in JS — `className=`, `classList.add`, `setAttribute('class'`,
and template literals. These prototypes build a great deal of their DOM at runtime.

`.su-sheet` is consequently **left un-consolidated** for now. Folding it into `.sheet` is possible
but not free: `home` would then have two different components sharing `.sheet` (the former
`.gsheet` and the signup sheet) whose rules would merge, and the JS `className` assignment would
need to change in lockstep. That is a deliberate follow-up, not an oversight.

### 2. `.sheet` meant two different things
The worst of the four, because the name implied a shared component that did not exist:

| | deals `.sheet` | refer `.sheet` |
| --- | --- | --- |
| background | `--card` | `--paper` |
| height model | `max-height:88%` | `top:54px` (near-full-screen) |
| easing | `cubic-bezier(.22,.61,.36,1)` | `cubic-bezier(.4,0,.2,1)` |

The height difference is **intentional design** — deals is a partial sheet, refer is a panel —
so it is preserved as a modifier rather than flattened. Everything else was drift.

### 3. All four were off-standard
Guide B specifies radius **26px 26px 0 0**, padding **22px 20px 26px**, `--shadow-sheet`, and
`transition:transform .34s cubic-bezier(.2,.8,.3,1)`. Before this change: radius 22px (three of
them) and 24px (`g40-sheet`); three different entrance mechanisms including two different easing
curves and one `@keyframes g40rise`.

### 4. ⚠️ The standard references two tokens that do not exist in these files
`--shadow-sheet` and `--scrim-b` are named in G40-308 but are **defined in none of the Request
prototype files**. Implementing the standard literally would have produced an invisible shadow.
The files use `--over-sh` instead — and `gopher-request-deals.html` defines neither.

Worth noting the canonical value is not merely different, it is **directionally correct**:
`--shadow-sheet: 0 -10px 40px rgba(0,0,0,.25)` casts *upward*, which is right for a
bottom-anchored sheet, where `--over-sh: 0 16px 40px -10px rgba(0,36,97,.3)` casts downward.
`--shadow-sheet` is now defined locally in each converted file.

**This is a gap in G40-308 itself, not just here** — any other surface implementing Guide B will
hit the same missing tokens. Flagged for whoever picks up the remaining G40-302 targets.

## The canonical token is `.sheet` — not a new class

G40-308 already names it: *"Default form: Bottom sheet (`.sheet`)"*, *"Origin in code:
`.sheet` / `.sheet-overlay` (worker)"*. An earlier draft of this work proposed inventing
`.g-sheet`; that was wrong and was corrected by reading the standard. **Consolidate onto the
name the standard already specifies.**

## What was changed

| File | Change |
| --- | --- |
| `gopher-request-home.html` | `.gsheet` → `.sheet` (4 occurrences: CSS rule, 1 element, 1 `closest()` call, 1 comment); normalise to Guide B. **`.su-sheet` left intact** — see finding 1 |
| `gopher-request-flow.html` | **no change** — its only sheet token was `.su-sheet`, which is live. Byte-identical to its pre-change state |
| `gopher-request-deals.html` | normalise base to Guide B (name already correct); 8 descendant selectors untouched |
| `gopher-request-inprogress.html` | `.g40-sheet*` family → `.sheet*` (30 occurrences: base 5, `-title` 7, `-head` 7, `-x` 6, `-copy` 5); normalise |
| `gopher-request-refer.html` | normalise base; `top:54px` + `max-height:none` preserved as `.sheet.sheet--full`, applied to all 3 sheets |

## Deliberately NOT changed

- **The open-state class.** deals uses `.on`, refer and home use `.show`. Unifying them looks
  tempting but `.on` is a **file-wide generic state class** in deals — it is also on `#webview`,
  `#detail`, `#review`, `#idvDot1`, `#idvBar` and more. Renaming it for sheets would ripple
  through unrelated components for no design-system gain. The Guide-B token is the *component*
  class; the state class is a per-file convention and belongs to a separate pass if wanted.
- **`inprogress`'s `@keyframes g40rise` entrance.** Its sheets render already-open inside an
  overlay and have no open-state class to drive a transition, so the keyframe is the correct
  mechanism there. Duration/easing aligned to the standard; the mechanism kept.
- **`.su-sheet`** — see finding 1; consolidating it is a real follow-up with a real cost, not an oversight.
- **Disk-only variants and `reqpkg/` / `_stale_pre_upload/`.** Not shipped, deliberately frozen.
- **The four `.sheet` elements in tracked-but-undeployed files.** Out of scope; noted above.

## Still open on G40-302 after this

The other structural targets from its short list are untouched:

- `.ca-overlay` fee/rating/dispute family — Request + Connect web
- Connect `.signin-` / `.otp-modal-overlay` — rename only
- Go web `.gl-overlay` + `.rhm-overlay`

## Verification performed

- All 5 files: every inline `<script>` block parses clean.
- `gopher-request-flow.html` proven **byte-identical** to its pre-change backup.
- 0 occurrences of `gsheet` or `g40-sheet` remain; `.su-sheet` rules confirmed present and
  `#suSheet` confirmed in the DOM at runtime.
- **refer** — all 3 sheets computed: radius 26px, shadow `rgba(0,0,0,.25) 0 -10px 40px`,
  `max-height:none` (modifier overriding the base, which is why it is written `.sheet.sheet--full`
  at specificity 0,2,0 — as a single class it lost to `.sheet` on source order and capped the
  panel at 88%).
- **inprogress** — rule set is now `.sheet`, `.sheet-head`, `.sheet-title`, `.sheet-x`,
  `.sheet-copy`; a sheet rendered at radius 26px, padding `22px 20px 26px`, canonical shadow.
- **deals** — base normalised; behaviour A/B'd against the pre-change file served side by side.
  A `.deal.svc` card does not open the sheet in **either** build, so that is pre-existing routing,
  not a regression. Delta confirmed as intended: radius 22→26px, closed height 46→48px (padding).
