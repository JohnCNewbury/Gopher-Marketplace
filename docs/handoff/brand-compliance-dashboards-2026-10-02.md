# Brand compliance pass — Request & Connect dashboards (handoff, 2026-10-02)

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

⭐ **His diagnosis was right and worth repeating to him: the fuzziness is mostly
the contrast, not the rendering.** White on bright green has almost no luminance
difference, so glyph edges have nothing to resolve against. Correcting the ink
to navy sharpens them with no other change.

⛔ **The fix already exists in this codebase.** `--ink-on-green:#002461` is
defined, and `gopher-request.html:3919` already does it right:
`.idsub-stepchip.done { background:var(--green); color:var(--ink-on-green); }`.
The main flow tabs simply never adopted it. Prefer the token over a literal.

---

## 3 · The rest of the audit

White on Shamrock also at: `.req-action.attention` (request:7467),
`.dni-badge` (request:7172), `.mst-tab.done/.active` (connect:7048/7052).

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

### ⭐ The most consequential finding, invisible on screen

**30 declarations reference CSS custom properties that are never defined.** An
undefined `var()` makes the whole declaration invalid at computed-value time, so
the property falls back to **inherited** — not to the brand colour, and with no
error anywhere.

| Page | Undefined tokens | Declarations |
|---|---|---|
| Request | `--error` (11), `--ink`, `--white`, `--line`, `--green-tint`, `--navy-deep` | 17 |
| Connect | `--line` (5), `--navy-deep`, `--text-soft`, `--green-tint`, `--tip-arrow`, `--green-d`, `--bg-soft` | 13 |

`--error` is the one to flag: the alert colour is referenced 11 times in Request
and resolves to nothing. This is the same fault that made the deals button
render white-on-cream earlier today (fixed in `7acf006` with a literal `#002461`).

**Why it persists:** the canonical tokens live in
`Final/assets/css/gopher-connect-uc.css`. Connect loads it; **Request does not**
and re-declares its own set. One shared brand stylesheet closes both.

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

1. Define the 13 missing tokens, or point both pages at one shared brand
   stylesheet. Everything else is cosmetic next to colours that silently are not
   brand colours.
2. `--ink-on-green` on every white-on-green surface.
3. Red confined to alerts — starting with the hover rule at request:7496.
4. `-webkit-font-smoothing:antialiased`.
5. The remaining sub-AA pairs.
6. Half-pixel sizes **only if he confirms** it differs by display.
