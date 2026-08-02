# Type & shape scale — measured, not invented

**Generated from all 44 rendered screens, 2026-08-02.** Every number below is what the
prototypes **actually paint**, counted. Nothing here is a design opinion.

This exists because the screen spec correctly flags `fontSize` / `fontWeight` / `borderRadius`
values as *"literal, needs a token"* — no type scale exists in any canon source. That left an
open-ended gap. Measuring it turns it into a short list of decisions.

**Status: PROPOSAL. Owner/design decides.** Nothing in the prototypes was changed to produce it.

---

## 1. ✅ FIXED 2026-08-02 — the unstyled form controls

**Was:** 373 elements painted `Arial`, 351 of them at `13.3333px` — Chrome's user-agent default
for an unstyled form control, and the 4th most common font size in the product. Any token scale
built on top of that would have enshrined an accident.

**Root cause, proven rather than assumed.** Every single non-brand element was either a form
control (160) or a descendant of one (150) — **zero other causes**. Form controls do not inherit
`font`; the UA stylesheet pins them. An earlier hypothesis — that screen roots were missing a
`font-family` — was **wrong** and was discarded after measuring: every root already declared
DM Sans, including screens with 69 Arial elements *and* screens with none.

**Fix:** one rule, applied where every screen's CSS is assembled rather than to 36 per-component
selectors that the next new button would have missed:

```css
button, input, select, textarea { font-family: inherit; font-size: inherit; }
```

`font-weight` is deliberately **not** reset — buttons that look bold declare their own weight,
and `font: inherit` would flatten them.

**Result, measured across all 44 rendered screens:**

| | Before | After |
|---|---|---|
| `Arial` | 373 | **0** |
| `13.3333px` (UA default) | 351 | **0** |
| Brand-face coverage | 92.5% | **99.98%** |
| Screens whose height or node count changed | — | **0 of 44** |

Zero layout movement, so this is safe to carry into the reskin as-is.

**One stray remains, deliberately not chased:** `work-settings` → `<button class="vp-i js-vpinfo">`,
the 10px "i" info affordance, paints Georgia — a single element, and the only non-brand text left
in the product.

---

## 2. Font size — 34 distinct values, but only ~8 real steps

`16px` (now 46% — it absorbed the controls that used to paint 13.3333px) is overwhelmingly the
**inherited default on layout containers**, not a text step. Excluding it, the real ladder is:

| Painted | Uses | Reading |
|---|---|---|
| 9px · 9.5px | 91 | micro |
| 10px · 10.5px | 246 | caption |
| 11px · 11.5px | **762** | secondary / meta — the workhorse |
| 12px · 12.5px | **687** | body-small |
| 13px · 13.5px | 383 | body |
| 14px · 14.5px | 122 | body-large |
| 15px · 18px | 192 | subhead |
| 22px | 37 | title |

**The half-pixel pairs are drift, not intent.** Nobody designs `11px` *and* `11.5px` as separate
steps. Collapsing each pair gives a clean **8-step scale**: `9 · 10 · 11 · 12 · 13 · 14 · 18 · 22`.

**Decision needed:** approve the 8 steps (and which side of each pair wins), or supply a scale.

---

## 3. Font weight — 6 painted, 4 meaningful

| Weight | Uses | Share |
|---|---|---|
| 400 | 2,699 | 54.4% |
| 800 | 1,174 | 23.7% |
| 900 | 560 | 11.3% |
| 700 | 370 | 7.5% |
| 600 | 136 | 2.7% |
| 500 | 24 | **0.5% — noise, retire it** |

All are available: Nunito and DM Sans are variable fonts covering 400–900, so this costs nothing
to standardise. **Proposal:** `400 regular · 700 semibold · 800 bold · 900 black`; fold 500 → 400
and 600 → 700.

---

## 4. Font family — the intended split is already holding

| Family | Uses | Share |
|---|---|---|
| DM Sans | 2,854 | 57.5% — body |
| Nunito | 2,098 | 42.3% — headings / emphasis |
| Arial | **0** | eliminated — see §1 |

Two brand faces, cleanly split, plus Caveat (10 uses, the script accent). §1 took Arial to 0.

---

## 5. Border radius — 27 distinct, ~6 real

`99px` (187) and `999px` (19) are **two spellings of "pill"**. `50%` (88) is circle.
The rest cluster: 6 · 7 · 9 · 10 · 11 · 12 · 13 · 14 · 16 · 18 · 30.

**Proposal:** `sm 8 · md 12 · lg 16 · xl 20 · pill · circle`, with one spelling for pill.

---

## How to refresh

```bash
python3 scripts/screen-spec/gen-screen-spec.py     # re-render every screen
python3 scripts/screen-spec/render-spec-site.py    # rebuild the site
```

Then re-run the aggregation that produced this file. Every count above moves with the
prototypes — this document is measured output, not a hand-maintained artifact, and it is
subject to the same rule as the rest of the spec: **generated from what renders.**
