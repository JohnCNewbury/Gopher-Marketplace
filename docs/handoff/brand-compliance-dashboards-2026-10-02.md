# Brand compliance pass — Request & Connect dashboards (handoff, 2026-10-02)

> ## ⛔ CORRECTED 2026-10-02, second pass — read this box first
>
> A verification pass against the branch tip re-confirmed every **line reference** in this
> doc, and confirmed both of the owner's own findings. It also found **four claims below
> that are wrong**, including the headline finding and the remedy in §6. Each is struck
> and corrected in place, marked **◼ CORRECTED**. The short version:
>
> 1. **`--ink-on-green` is `#ffffff` in Request** (`gopher-request.html:6536`, top-level,
>    unconditional, and its *only* definition). So `:3919` — cited below as the correct
>    exemplar — renders white-on-Shamrock at 1.85:1, and so do **33 green surfaces**.
>    *Following §6 step 2 as originally written would have spread the failing pair, not
>    fixed it.* Changing that one line fixes all 33.
> 2. **The "30 silent failures" finding does not hold.** Every undefined `var()` in both
>    files carries a fallback, so none become invalid and none fall back to inherited.
>    Verified with a positive control.
> 3. **Neither page loads `gopher-connect-uc.css`.** Connect's only mention of it is inside
>    a comment — the §4 trap catching this doc's own author.
> 4. **The real drift is Request's `:root`**, which was never brought to canon.
>
> Side-by-side of fix #1: `docs/handoff/brand-ink-on-green-before-after.html`.

**Status: AUDIT COMPLETE, NOTHING IMPLEMENTED.** The owner asked for findings
first — *"point out as many as you can and i'll review then before actual
implementation."* Do not start changing colours until he has reviewed.

Audit artifact (his review copy): https://claude.ai/artifact/HkzzJqMqnxcZ82RNseWJN7

Branch: `feature/deals-google-maps-audience`. Working tree clean at handoff.
Everything already deployed; see `website-updates-deck-2026-09-30.md` §1.

---

## 1 · ⛔ READ THE STYLE GUIDE FIRST — it exists, and it is not in this repo

```
/Users/johnnewbury/Desktop/All New Gopher/Documentation/Brand/
  Gopher Brand Standards/
    Gopher Style Guide.html        ← 2026-09-20, THE live one. Start here.
    Gopher Style Guide 2026.pdf    ← 2026-05-27
    Gopher Style Guide 2023.pdf · 2020.pdf · Brand Standards 2018.pdf   (historical)
  Gopher Logos/
```

⚠️ I audited for a while before finding this, because it is **outside the Code
repo** and `Final/` contains no style-guide page. Read `Gopher Style Guide.html`
before touching anything — it is the authority, not `CLAUDE.md` and not the
tokens in the page files.

**Verified first-hand** that the HTML holds the contrast card the owner
screenshotted (`Navy on Sand`, `Navy on Shamrock`, `White on Shamrock`) and
defines: `#002461` navy · `#33D975` shamrock · `#FBF3E4` sand · `#C44257` alert
red · `#1CB061` green-dark · `#D97757` terracotta.

### The two rulings that drive most findings

| Pair | Ratio | Verdict |
|---|---|---|
| Navy on Shamrock | 7.8 : 1 | AAA — **this is the correct pairing** |
| **White on Shamrock** | **2.0 : 1** | **FAIL** |

And the owner, 2026-10-02: **"red is only used in negative/alerts."**

---

## 2 · What the owner raised, confirmed with measurements

### His #1 — red outside alerts
`gopher-request.html:7496`

```css
.req-card.is-clickable:hover { border-color:#C44257; }
```

⛔ This is on **every** request card, not only ones needing attention — an
In Progress or Scheduled card turns red on hover with nothing wrong. That is the
one he saw. Three more:

| Where | What | Line |
|---|---|---|
| `.req-card.has-attention` | red border 45% + red background wash | 7497 |
| `.req-detail-header.has-attention` | 4px solid red left border | 7548 |
| `.req-action.attention` | **red 20px glow behind a GREEN button** | 7467 |

### His #2 — white on green, and the fuzziness
`gopher-connect.html:7038` sets `color:#fff`; `:7048 .done` and `:7052 .active`
override **only** the background to green, so the ink is never corrected.
Measured **1.85 : 1**.

~~⭐ **His diagnosis was right: the fuzziness is mostly the contrast, not the rendering.**
Correcting the ink to navy sharpens them with no other change.~~

◼ **CORRECTED by the owner, 2026-10-02, looking at a before/after of the ink change:**
*"It looks more readable but i wouldn't say more crisp."* **Contrast buys readability, not edge
definition — do not sell the ink fix as a sharpness fix.** The navy correction still stands on
its own merits (the guide's ruling, 33 surfaces failing AA), but the softness has a different
cause and is still unidentified.

⛔ **My before/after page was incapable of showing crispness and I did not notice**: it set
`-webkit-font-smoothing:antialiased` on its body, so *both* panels already carried the smoothing
correction while the live files set the property **zero** times (= `auto`). The only variable left
was ink. A demo must inherit the target's rendering settings, not quietly improve them —
same family as the §4 traps. Replacement diagnostic, one variable per strip and smoothing left on
`auto`: `docs/handoff/brand-crispness-isolation-test.html`.

~~⛔ **The fix already exists in this codebase.** `--ink-on-green:#002461` is
defined, and `gopher-request.html:3919` already does it right. The main flow tabs simply
never adopted it. Prefer the token over a literal.~~

◼ **CORRECTED — this is backwards, and it was the most dangerous line in the doc.**
In **Connect** the token is correct (`connect.html:83  --ink-on-green: #002461`).
In **Request** its one and only definition is:

```css
gopher-request.html:6536      :root { --ink-on-green:#ffffff; }
```

Top-level, unconditional, brace depth 0 — grafted in with the login-portal CSS, where white
was wanted for a *navy* portal button. Written at `:root`, it went global.

So `:3919` does **not** do it right: it renders **white on Shamrock, 1.85:1**. And it is not
alone — **33 declarations** in Request ask for `var(--ink-on-green)` and are all handed white:
tabs, primary CTAs, selected segment buttons, check marks, the sent-message bubble.

**Consequence for the fix order:** adopting the token on *more* surfaces, as this doc
originally advised, would have propagated the failing pair. The correct first edit is the
token itself — one line, 33 surfaces, and it makes Request agree with Connect rather than
introducing anything new.

---

## 3 · The rest of the audit

White on Shamrock also at: `.mst-tab.done/.active` (connect:7048/7052) — plus
`.mst-tab.done:hover`, which keeps white ink over `--green-dark` **#1CB061 at 2.83:1**;
even the hover green will not carry white.

◼ **CORRECTED:** `.req-action.attention` (request:7467) and `.dni-badge` (request:7172)
were listed here as literal white. Both actually say `var(--ink-on-green)` — they are two
of the **33** governed by the broken token above, and are fixed by that one line, not
individually.

Below AA: `.req-status.status-in-progress` 2.39 (request:7385) ·
`.dash-block-head .view-all` 2.42 (:7324) · `.g40-demo-tag` 3.10 (:7760) ·
`.dash-nav-divider` 3.45 (:7098).

Crispness, in fix order:
1. `-webkit-font-smoothing` is `auto`. Much of this UI is light-on-dark (navy
   sidebar, navy buttons, top bar) — exactly where macOS renders heavy and soft.
   `antialiased` is the one-line correction.
2. Coloured glows under small text: `.mst-tab.active` 16px blur at 12.5px;
   `.req-action.attention` 20.4px at 11px.
3. Half-pixel font sizes — Request 36 elements (11.5/13.5/15.5px), Connect 56
   (12.5/10.5/15.5px). **⚠️ OPEN QUESTION WITH THE OWNER, do not act on it
   blind:** at 2x Retina these land on whole device pixels and are fine; at 1x
   they land on half-pixels and render soft. I asked whether the fuzziness is
   worse on one screen than another and he has not answered. The answer decides
   whether rounding them is worth doing at all.
4. `.dni-ext` renders text at `opacity:0.7`.

### ~~⭐ The most consequential finding, invisible on screen~~ ◼ CORRECTED — does not hold

~~**30 declarations reference CSS custom properties that are never defined**, so the
property falls back to **inherited** — not to the brand colour.~~

◼ **CORRECTED.** The *count* was right; the *mechanism and the consequence* were not.
**Every** undefined `var()` reference in both files carries a fallback — `var(--error,#c44257)`,
never bare `var(--error)`. A `var()` with a fallback does not invalidate the declaration, so
**zero** of them fall back to inherited.

Verified with a positive control: a bare undefined `var()` injected into Request was caught;
the fallback form was correctly ignored; a known-good token was correctly seen as defined.
`--error`'s fallback is `#c44257` — **canonical Lava Alert** — so the alert colour renders
correctly all 11 times. Nothing is silently off-brand here.

**What is real, in its place:** the fallbacks are unmanaged literals, and some have drifted.
`--line` resolves to **three different greys** in Connect (`#cbd5e1`, `#e1e6f0`, `#e2e8f0`);
`--text-soft #64748b` and `--bg-soft #f8fafc` are slate values absent from the palette
entirely. That is a maintainability and palette-drift finding, not an invisible-failure one.

### ⭐ The genuinely consequential finding: Request's `:root` was never brought to canon

Connect's token block is annotated against the guide and correct. Request's is not:

| Token | Request | Style guide |
|---|---|---|
| `--ink-on-green` | `#ffffff` | `#002461` — **the 33-surface bug above** |
| `--navy` | `#2a3654` | `#002461` Midnight Blue |
| `--green-dark` | `#1fb85f` | `#1CB061` Mountain Meadow |
| `--text` | `#2c2c3e` | `#424242` Body Copy |
| `--tan` | `#EBE8E5`, commented *"brand neutral"* | **retired** — "don't use on new work" (4 uses) |
| `--white` | *never defined* | `#FFFFFF` |

Note `--navy #2a3654` on Sand is **10.86:1** — it still passes AAA. This row is a brand-canon
violation, not an accessibility one, and should be described to the owner that way.

| Page | Undefined tokens | Declarations |
|---|---|---|
| Request | `--error` (11), `--ink`, `--white`, `--line`, `--green-tint`, `--navy-deep` | 17 |
| Connect | `--line` (5), `--navy-deep`, `--text-soft`, `--green-tint`, `--tip-arrow`, `--green-d`, `--bg-soft` | 13 |

`--error` is the one to flag: the alert colour is referenced 11 times in Request
and resolves to nothing. This is the same fault that made the deals button
render white-on-cream earlier today (fixed in `7acf006` with a literal `#002461`).

~~**Why it persists:** the canonical tokens live in `gopher-connect-uc.css`.
Connect loads it; **Request does not**.~~

◼ **CORRECTED: neither page loads it.** Request links `gopher-fonts.css` and
`gopher-inbox-delete.css`; Connect links those two plus `gopher-footer.css`. No `<link>`,
no `@import`, no JS injection of `gopher-connect-uc.css` in either file. Connect's *only*
mention of it is **inside a comment** at `connect.html:1961` saying its values "match
gopher-connect-uc.css exactly" — which is exactly the §4 trap about counting your own
comments, sprung on the author of §4.

Both pages define their tokens inline and independently. A shared brand stylesheet is still
the right end state, but it is a **refactor**, not the bug fix — and it is *not* a
prerequisite for the one-line `--ink-on-green` correction.

---

## 4 · ⛔ Traps that cost me real time today — do not re-learn these

- **A contrast probe must COMPOSITE ALPHA.** My first pass took a gradient's raw
  first colour stop and reported near-white cards as 1.02 : 1 against their own
  text, because `rgba(196,66,87,0.04)` is a 4% wash, not a red background. My
  second pass walked past the navy sidebar entirely, because that sidebar uses a
  `linear-gradient` and so has a *transparent* `backgroundColor` — it reported
  white-on-navy (15.6 : 1, fine) as failing. **Three probe versions before the
  numbers were real.** Composite alpha over the parent chain, and handle
  gradients, or every number is fiction.
- **A `grep -c "var(--green-d"` also matches `var(--green-dark)`.** That single
  prefix error turned 1 use into "212 declarations" — I nearly reported it. Match
  the closing `)` or `,`.
- **Counting a string in a file counts your own comments.** A verification probe
  reported "white card still there" on all three hosts; it was matching the class
  name inside the comment explaining the removal. Strip comments before asserting
  absence.
- **A JS parse check does NOT catch a CSS brace error.** Earlier today a missing
  `}` in an injected `@media` block killed every rule after it; the parse check
  reported 14/14 clean while the page was visibly broken. Add a brace-balance
  check across `<style>` blocks after any CSS edit — both files currently balance
  (request 2992/2992, connect 2773/2773).
- ◼ **ADDED: a `var()` census must distinguish `var(--x)` from `var(--x,fallback)`.**
  Only the bare form invalidates the declaration. Conflating them turned 20 harmless
  fallback references into a fabricated "30 silent failures" headline. Prove any such zero
  (or any such alarm) with a positive control before reporting it.
- ◼ **ADDED: brace counts here strip comments first** (Request 2990/2990, Connect 2773/2773);
  the 2992 figure below counts braces inside comments. Both balance either way.
- The Browser pane runs at `devicePixelRatio: 1`. The owner's Mac does not. Any
  sub-pixel conclusion drawn in the pane needs that caveat stated.

---

## 5 · Standing rules that apply to this work

- ⛔ **Audit, do not implement, until he reviews.** His words, this session.
- ⛔ **Ask before building when there is a discrepancy.** Owner, 2026-10-02,
  after I twice guessed at a deck slide and got it wrong.
- ⛔ **101 guides are DEFERRED to near-launch** (owner, 2026-10-02). Do not list
  them as outstanding; this supersedes the `CLAUDE.md` rule from 2026-08-05.
- Deploy: bare `scripts/deploy.sh --push` ships **both** sites. Scope-check the
  dry run (its diffstat elides — compare the count against the list), then
  content-verify all three hosts, never by SHA. **The lagging host varies** —
  Pages lagged on two runs today, TigerTech on another. Poll, never conclude from
  a first fetch.
- Preview the dashboards: they open only via sign-in, so use the published
  artifacts (Request `UakWSaDiygowUcwPM6kx9P`, Connect `9bpG9NEdpaXea7p6sQK7TG`),
  which carry a preview-only bootstrap that is **not** in the repo copies.

---

## 6 · Suggested order, once he approves

◼ **CORRECTED ORDER.** Steps 1 and 2 as first written were, respectively, not a bug and
actively harmful. The replacement:

1. **`gopher-request.html:6536` → `--ink-on-green:#002461`.** One line. Fixes 33 green
   surfaces, including every one this doc previously listed individually. Nothing else is a
   prerequisite. Side-by-side: `brand-ink-on-green-before-after.html`.
2. **Connect's `.mst-tab`** — the owner's own finding, the only true literal-white-on-green
   left (`connect.html:7038`, plus `.done:hover` over `--green-dark`).
3. Red confined to alerts — starting with the hover rule at request:7496.
4. `-webkit-font-smoothing:antialiased`.
5. The remaining sub-AA pairs.
6. Half-pixel sizes **only if he confirms** it differs by display. ⛔ Still unanswered as
   of this correction pass — not acted on.
7. *(Refactor, not a fix)* one shared brand stylesheet for both pages, and bring Request's
   remaining `:root` tokens to canon (`--navy`, `--green-dark`, `--text`, retire `--tan`).
