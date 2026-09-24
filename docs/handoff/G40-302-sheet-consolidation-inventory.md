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

## The rest of G40-302's structural short list — status 2026-08-13

### ✅ Connect `.signin-` / `.otp-modal-overlay` — DONE (commit `94c1307`, live)

The audit called this *"rename only — visually Guide A already."* **That was wrong on the detail.**
`.gc-modal-overlay` already existed with **39 references**, so a literal rename meant merging a
3-reference component into it — and the sign-in overlay carries a `backdrop-filter:blur(3px)`, its
own `signinFadeIn` animation, a different scrim tint (`13,21,52` vs `13,26,62`), 20px padding and
`z-index:9000` that the canonical class does not. Renaming would have stripped the blur and the
fade-in from a live customer-facing page.

Resolved by consolidating the **name** while preserving behaviour: both overlays now carry
`.gc-modal-overlay` and inherit the canonical geometry, with only their genuine deltas as
modifiers (`.gc-mo--signin`, `.gc-mo--otp`) — the same shape as `.sheet.sheet--full` above.
Proven by A/B against a pre-change copy: **all 11 computed properties identical**, plus the
`[hidden]` behaviour. The inner `.signin-modal` / `.otp-modal` cards were left alone — the
audit's row named the overlay, and this file is on the WORK-REGISTRY's known-collision list.

### ✅ `.ca-overlay` fee/rating/dispute family — ALREADY COMPLIANT, no work needed

Measured 2026-08-13 against the G40-308 token block, both files (8 `.ca-overlay` + 8 `.ca-modal`
elements each). **Every token the standard specifies already matches exactly:**

| Token | `.ca-*` | G40-308 |
| --- | --- | --- |
| `--scrim-a` | `rgba(13,26,62,0.55)` | `rgba(13,26,62,.55)` ✓ |
| `--radius` | `18px` | `18px` ✓ |
| `--shadow-card` | `0 30px 80px rgba(0,0,0,.35)` | identical ✓ |
| z-index | `9500` | `9500` ✓ |
| card background | white | white ✓ |

Every remaining difference is **layout, not token**: `align-items:flex-start` + `padding:40px 16px`
+ `overflow:auto` on the overlay, and `width:430px` + no card padding + `overflow:hidden` on the
card. Those exist because the fee modal is tall, scrolls, and is left-aligned — and the audit's own
instruction is *"keep its fee layout, just align tokens."* **Guide A explicitly sanctions this
shape** as its wide/form variant (left-aligned, `max-height`/`overflow-y`) for multi-field forms.

**So this row should be closed as compliant, not built.** The only non-canonical thing left is the
`.ca-*` *name*. Migrating it into `.gr-modal`/`.gc-modal` would take 32 elements across two live
customer-facing pages and require enough overrides (width, padding, alignment, overflow) that the
consolidation would be nominal — **zero visual or behavioural gain for real regression risk.**
Recommend declining; raise it only if the design system later needs one literal class name.

### ✅ Go web `.gl-overlay` + `.gl-otp-overlay` + `.rhm-overlay` — DONE 2026-08-14

**⚠️ The change landed inside commit `dc8a8a7`, whose message describes only the other half of it.**
Another session committed while my edit was uncommitted in the shared tree, so `dc8a8a7`
("Remove the standing block toggle — the placement was the defect") contains *both* their
`.rl-block` removal *and* this overlay consolidation. Nothing was lost and both halves are correct;
the history simply under-describes it. Recorded here rather than rewritten, because the branch is
shared. **This is the WORK-REGISTRY hazard in its exact predicted form** — `deploy.sh` and every
`git commit` read the working tree, so uncommitted work belongs to whoever commits next.

All four elements now carry the canonical `.gc-modal-overlay` with only their genuine deltas as
modifiers:

| element | class | role | z-index |
| --- | --- | --- | --- |
| `#goLoginOverlay` | `.gc-mo--login` | sign-in card, top-aligned | 4000 |
| `#goNoAcctOverlay` | `.gc-mo--otp` | "no account" | 4100 |
| `#goOtpOverlay` | `.gc-mo--otp` | **the OTP step** | 4100 |
| `#rhmOverlay` | `.gc-mo--rhm` | request-history detail | 120 |

Written **`.gc-modal-overlay.gc-mo--x`** (specificity 0,2,0) so source order cannot decide the
winner — a single-class modifier ties with `.gc-modal-overlay` and loses on order, which is exactly
how `.sheet--full` silently capped a full-height panel above.

**Zero visual change, deliberately.** Each scrim tint is preserved: these read `rgba(0,18,49,·)`
while the canonical reads `rgba(13,26,62,0.55)`. **That is real drift and the one open design
question left on this ticket** — but it is a decision on the page carrying the owner's live sign-in,
so it is surfaced rather than made silently. The z-indexes are *functional*, not drift: the OTP step
must stack above the sign-in card or the auth flow breaks.

The three per-class `[hidden]` guards were dropped as redundant — `.gc-modal-overlay[hidden]` beats
the base `display:flex` at 0,2,0. That matters because **this file has no global `[hidden]` rule**;
an earlier claim that it did came from counting comment prose and was corrected by the Go/Deals
session. Verified masked: 0.

**`.menu-overlay` deliberately untouched** — the audit lists it, but it hides via
`opacity`/`visibility` and an `.open` class, not the `hidden` attribute, so none of this applies.

**Verified** against a pre-change copy served side by side: all four overlays computed-identical
across ten properties plus the hidden-state display. Sign-in driven through the app's own
`window.openGoLogin()`; the OTP covers the viewport, stacks above the sign-in card, and
`elementFromPoint` at screen centre lands on `#glOtpInputs` — inside the OTP — so it receives
clicks. 13 inline script blocks parse clean.

⚠️ **Not verified, and not verifiable from here: the full live OTP round trip.** Send-code needs a
real backend response and does not advance on a scratch serve — the untouched baseline behaves
identically, so that is not a regression. Entering a real code is also not something I will do. The
CSS contract is what changed and it is fully verified; end-to-end sign-in stays the owner's check.



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
