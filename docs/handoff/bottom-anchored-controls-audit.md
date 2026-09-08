# Bottom-anchored controls vs scrollable content — the cross-cutting look

Written 2026-09-04, before starting **G40-424 F5c**. The G40-424 ticket asks for exactly this:

> A fixed/bottom-anchored element covering content the user needs: **G40-422** (F1b, F2c),
> **G40-423** (F4a), and now F5a. Four screens, two apps. This is no longer a series of one-off
> layout bugs — it is systemic. **Worth one deliberate look across all four before patching
> individually.**

Doing F5c as a one-screen pass is what that note warns against, so this comes first.

---

## The inventory

`position: fixed` in `src/`, and how many of those are bottom-anchored:

| app | `position:fixed` | bottom-anchored files | files using `safe-area-inset` |
|---|---|---|---|
| **Request** | 23 | `IdCaptureBox` · `InAppMessage` · `CancelReasonSheet` · `payoutlist` · `requestOrder` | 13 |
| **Go** | 20 | `InAppMessage` · `RequestDetailPullOver` · `CancelReasonSheet` · `ordercard` · `payoutlist` | 7 |

Three of those files exist in **both** apps (`InAppMessage`, `CancelReasonSheet`, `payoutlist`) —
diverged forks of the same component, so a fix in one is not a fix in the other.

---

## The failure taxonomy — four distinct bugs, not one

Reading the two already-shipped fixes, these are **different root causes** that happen to produce
the same screenshot. That matters: a single "add more padding" rule would have fixed none of them.

**1. `overflow` with no bound does nothing.** (F5a, `dbfc088a2`)
`overflowY: "auto"` with no height — the element grows to fit its content, so overflow never
exists and no scrollbar can appear. **The tell:** content is clipped and *nothing* scrolls, as
opposed to scrolling badly.

**2. The reservation's unit doesn't match the stack's unit.** (F5a, `f24492247`)
The reservation was `12%` of `innerHeight`; the stack it had to clear is anchored in **px**
(`bottom: 65px` + two ~45px buttons). What got cleared therefore depended on screen height —
~89px reserved against ~155px occupied. **Short screens lose.** The tell: it looks right on one
handset and wrong on another.

**3. Nothing arbitrates z-index between a fixed control and a sibling overlay.** (F4a,
`0412fd5f8` — *"the picker's Done rendered under the Inbox tab — nothing arbitrated z-index"*)
Not an occlusion-by-space problem at all; a stacking-order problem.

**4. The safe-area inset isn't in the arithmetic.** (memory `ios-safe-area-swallows-bottom-taps`)
A control at `bottom: ~16–22px` renders fine and **silently loses taps** to the iOS home
indicator. Invisible in a desktop emulator, where the inset is 0.

---

## What is actually systemic

Not "bottom bars overlap things". It is that **every screen re-derives its own clearance by hand,
and the derivation is a duplicate of a number that lives somewhere else.**

The current F5a fix is the clearest example — correct today, and fragile by construction:

```js
marginBottom: "180px",   //  65px container offset
                         // + 90px two buttons and margins
                         // + 25px readability clearance
```

That 180 is a hand-computed copy of the button stack's height. **Change the stack — a third
button, a taller label, a wrapped string — and the reservation is silently wrong again**, with no
test and no type to catch it. This is the same shape as the F5b string that lived in two places
and had already drifted.

Note also that the two F5a fixes disagree with each other on units: fix #1 bounds the list with
`innerHeight * 45 / 100` (percent) while fix #2 argues percent is the bug. Both are defensible in
isolation — one bounds a flexible region, the other clears a fixed stack — but the file now mixes
them with no stated rule for which applies when.

---

## Recommended pattern — measure, don't duplicate

One shared primitive per app, used by every screen that pins a control over scrollable content:

1. **Measure the bar, don't restate it.** A ref plus `ResizeObserver` on the action bar, writing
   its height to a CSS custom property. The content's reservation then reads that property, so it
   is correct by construction and cannot drift when the bar changes.
2. **Add the inset once, inside the primitive.**
   `calc(var(--action-bar-h) + env(safe-area-inset-bottom, 0px))`. The `, 0px` fallback is
   load-bearing — it makes the change a no-op where there is no inset.
3. **The scroll container gets an explicit bound.** `min-height: 0` in a flex column, or an
   explicit `max-height` — never `overflow` alone.
4. **One z-index scale**, declared in one place, so a fixed control and a sibling overlay have a
   defined winner rather than depending on DOM order.

**Cost/benefit:** this is a refactor across ~10 files in two diverged repos, all of it UI, all of
it needing device verification on a build. It is **not** a same-day change and should not be
bundled into F5c.

---

## What this means for G40-424 F5c

> ⛔ **SUPERSEDED 2026-09-04 — owner: *"dont change the existing layout, that was not the issue."***
> F5c is retired and this screen is not being re-laid-out. The recommendation below is kept as the
> record of what a pattern fix would look like **if** the wider refactor is ever taken up; it is
> **not** a work item for G40-424, and the `180px` clearance is deliberately left as-is.

- ~~**F5c should adopt the pattern locally** — measure the bar rather than keeping `180px` — and be
  presented as a side-by-side per the standing UI rule. That is one screen, reviewable.~~
- **The wider refactor is its own ticket**, sequenced after the current build's device pass so it
  is not competing with release verification.
- **AC3 is a design question, not a layout one.** Making rows reachable (done) does not stop
  **Select All** being the easiest control to hit, so the path of least resistance is still to
  accept every referral without seeing who they are. Options worth putting to the owner: disable
  Select All until the list has been scrolled; require an explicit count confirmation
  ("Accept all 7?"); or drop Select All entirely on a screen where the decision is per-person.

## Verified vs inferred

- **Verified:** the inventory counts, the two shipped F5a fixes and their reasoning, the F4a
  z-index fix, that `SupportMessage.js` contains no safe-area handling, that its button container
  sits at `bottom: 65px`.
- **Inferred:** that `bottom: 65px` clears the ~34px iOS inset comfortably, so this screen is
  **not** exposed to the swallowed-tap failure. Arithmetic, not an on-device observation — the
  consequence is only that the 180px reservation under-reserves by the inset on iOS, which is
  cosmetic rather than a dead tap.
- **Not checked:** the G40-422 screens (F1b, F2c) in the Go app. Their fixes were not read for
  this audit, so the taxonomy above may be missing a fifth mode.
