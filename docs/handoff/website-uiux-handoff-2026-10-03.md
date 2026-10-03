# Website UI/UX — session handoff, 2026-10-03

Session **Website UI/UX [ecbf0b]**. Branch `feature/deals-google-maps-audience`.
Everything below is committed and pushed. **The brand work is LIVE on all three
hosts.** The home-screen work is a settled design and is **not** built.

> ⛔ **Session identity.** On 2026-10-03 the owner addressed this session as
> "Website Code/Logic" and told it to drop branding. That comment was meant for
> the **other** session — `Website Code/Logic [927f4e]`, a separate peer. He
> confirmed: *"You're Website UI/UX."* Branding and UI belong **here**. Do not
> hand this work to Code/Logic without an explicit instruction.

---

## 1 · What shipped and is live

Deployed 2026-10-02 ~20:25 ET by the owner (`scripts/deploy.sh --push`), live
`ba0b9c0 -> origin/main`, twin `3b89805 -> proto/main`. Scope was exactly 2 of
727 files in `Final/`. Content-verified on both Pages hosts, not by SHA, clean
on the first poll. The third host (`explore.` / `tour.gophergo.io`) was mirrored
and content-verified by **Explorer Deck & Public Tour [7f17d8]**, who confirmed
byte-identical delivery.

| Change | Scale | Effect |
|---|---|---|
| `--ink-on-green` → `#002461` (Request) | 1 line | 32 surfaces, 1.85 → 7.95:1 |
| Connect `.mst-tab.done/.active` | 2 rules | 1.85 → 7.95:1; hover 5.22:1 |
| Ungated red card hover removed | 1 rule | falls through to the existing green hover |
| `-webkit-font-smoothing:antialiased` | 2 lines | the only confirmed *sharpness* fix |
| Four sub-AA pairs | 4 rules | demo tag 4.83, nav labels 6.64, pill 4.99, link 5.42 |
| Literal white on green | **51 rules** | incl. `.btn-green`, the primary CTA style |
| Half-pixel font sizes rounded up | **461 decls** | whole-pixel + the larger size he picked |

⛔ **The only white-on-Shamrock left in either file is `.dash-logo-text .dlt-mark`,
and it is deliberate** — logo colour is governed separately by the guide and the
owner has previously ruled a recoloured wordmark a violation. One line if he
ever asks.

⛔ **`6fabc59` is the revert boundary for the type change alone.** It is the only
commit in the pass that can move layout; everything before it was colour. Revert
it without disturbing any colour fix.

---

## 2 · The style guide was amended — outside this repo

`Documentation/Brand/Gopher Brand Standards/Gopher Style Guide.html`, **not under
version control**. Backup taken first:
`Gopher Style Guide.html.bak-20261002-195811-pre-green-text`.

Added **Pine `#0F7A3F`** — §3.2 swatch plus a "Why Pine exists" row, and two
contrast cells in §3.4 placing *Mountain Meadow on White 2.8:1 FAIL* beside
*Pine on White 5.4:1 AA*. Reason: **no green in the palette passes AA as text.**
Shamrock is 2.39:1 on its own tint; Mountain Meadow, the darkest, is 2.83:1 on
white. Pine is text-only, never a fill.

⛔ The name "Pine" is mine, not the owner's — he approved a hex. ⚠️ The PDF
exports no longer match the HTML.

---

## 3 · Four corrections made to the original audit

Recorded because each was believed and acted on before being checked:

1. **`--ink-on-green` was `#ffffff`** in Request. The audit cited `:3919` as the
   *correct exemplar*; it was the bug, on 32 surfaces. Its advice — "adopt the
   token everywhere" — would have spread the failing pair.
2. **The "30 declarations fall back to inherited" headline did not hold.** Every
   undefined `var()` carries a fallback. Proven with a positive control.
3. **Neither page loads `gopher-connect-uc.css`.** Connect's only mention is
   inside a comment — the audit's own §4 trap, sprung on its author.
4. **The red finding was padded 4 → 1.** Three of the four were gated on
   `.has-attention` / `.attention` and are correct usage.

---

## 4 · Home screen — SETTLED DESIGN, NOT BUILT

Artifact: **https://claude.ai/artifact/PzgR4CB2RifYm3eV7A5rdu**
Source: `docs/handoff/brand-home-concept4-two-states.html`

Owner's model, arrived at over several rounds:

- **Cards lead.** The two cards are the home screen in every state.
- **One container** above them when anything is live — never a row of tiles.
- **Page-turn edges** step through more than one (his pick of three options).
  `i > 0` renders the left edge, `i < n-1` the right. At a ceiling of 3 the
  edges *are* the position indicator — right only = first, both = middle, left
  only = last. **No dots needed.**
- **Messages never appear on the canvas** — a **green** pulsing Inbox badge only.
  Green, not red, because an unread message is not a negative. Owner: "ok".
- **Attention sorts to index 0** — you always land on the one that wants you.
- **Every string is a template.** Owner: *"I dont have realtime AI for this. You
  need to be thinking SCALE."* Headline:
  `"You have " + n + (n===1 ? " current request" : " current requests") + (a ? ", " + a + (a===1 ? " needs" : " need") + " attention" : "")`

⛔ **Realistic ceiling is 2 concurrent requests** (owner). An earlier mock built a
segmented switcher, carousel and pagination for a volume that does not exist.
Do not rebuild that.

⛔ **Request History stays in the sidebar**, off the main canvas (owner).

**Consequence not yet actioned:** this merges the `choose` section into the
`home` section, so sidebar **Home** and **Dashboard** become one destination and
the Dashboard badge needs a home. Flagged, not decided.

---

## 5 · Open items, with owners

| Item | State | Owner |
|---|---|---|
| `gcancel` renders **"Your cancelled"** | **BUG, unfixed** — see `attention-labels-2026-10-03.md` §1 | whoever builds next |
| `confirm` vs `adjust` look like the same event | product question, unanswered | **John** |
| `bid` carries two unrelated events | product question, unanswered | **John** |
| Missing-name fallback spelled 4 ways | minor cleanup | any |
| Home design → build | designed, not built | **John to schedule** |
| Deploy permission rule | **blocked** — the auto-mode classifier refuses both the deploy and reading permission settings (Self-Modification). Owner wants it; must be added by him. Exact rule and command in this session's transcript. | **John** |

---

## 6 · Traps worth keeping

- ⛔ **A terse owner reply can be INCOMPLETE, not just ambiguous.** "and the
  13/16" looked like a whole answer; the sentence that reversed the conclusion
  arrived seconds later, after a doc had been committed saying the opposite.
- ⛔ **"X stays" is scope removal, not a defect report.** The pulsing attention
  glow cost three rounds because a boundary was read as a bug.
- ⛔ **Check the state gate before calling a colour use a violation.**
- ⛔ **A `var()` census must split `var(--x)` from `var(--x,fallback)`.**
- ⛔ **A demo must inherit the target's rendering settings.** A before/after page
  set `antialiased` on its own body while the live files run `auto`, so it could
  not have shown the crispness it claimed to.
- The artifact viewer's CSP blocks external images — **embed logos as data URIs**
  or they render blank for the owner.
- `scripts/deploy.sh` guards dirty state **scoped to `Final/`** only, so a dirty
  `docs/` does not require `--allow-dirty`. Do not pass it.

---

**Nothing is waiting on me.** The brand pass is live and verified; the home design
is settled and documented; the only unfixed defect is named above with its fix.
