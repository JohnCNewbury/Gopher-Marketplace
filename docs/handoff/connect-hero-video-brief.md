# Gopher Connect — hero video brief (4 clips)

**Status:** the only thing blocking this item is the footage. The player wiring, the
CSS, the photo→video handoff and the reduced-motion path are **already built and
dormant** in `Final/gopher-connect.html`. When four files land, it is ~10 lines of
markup to go live.

**Written:** 2026-07-27. Derived from the code, not from prior notes — two of those
notes were stale (see "Corrections" at the end).

---

## 1. What the hero is today

The hero background is a **9-photo cycle** (`.hero-imgs`, `heroCycle 45s`). It is
**photos-only**: the Services b-roll stand-ins were removed by owner decision on
2026-07-17 because, by design of the takeover behavior, any clip that loads
successfully *hides the photo rotation* — so the stand-ins put Gopher Go footage on
the Connect hero.

The photos are **not throwaway**. They remain:
- the fallback until a clip can play, and
- the **`prefers-reduced-motion` experience** (clips never play; the first photo
  shows statically).

So the clips must sit alongside the photos' visual language, not replace it.

---

## 2. Hard technical spec (read this before shooting)

Taken from `@keyframes heroClip`, `.hero-clip`, `.hero-overlay` and the dormant
wiring comment.

| Item | Value | Why |
|---|---|---|
| Count | **4** | `animation-delay` 0 / 6 / 12 / 18s in a 24s cycle |
| On-screen time | **~6s full opacity + ~1.2s crossfade** | `0%,25%` opacity 1 → `30%` opacity 0 of 24s |
| Minimum usable length | **8s**; **10s preferred** | must cover the visible window with margin |
| Looping | **Must loop seamlessly** (first frame ≈ last frame) | clips carry `loop` and run continuously; the loop point **drifts** relative to the opacity window, so a hard cut *will* eventually land on screen |
| Audio | **None — strip the track** | element is `muted`; audio is dead weight |
| Codec | **H.264 MP4 required.** VP9 WebM optional as the first `<source>` | mp4 is the universal fallback |
| Resolution | **1920×1080, 16:9** | displayed `object-fit:cover`, full-bleed |
| Frame rate | 24–30 fps | matches the still, cinematic look |
| Byte budget | **≤600 KB per clip** (~2 MB for all four) | reference: the 18 `services-clip-*.mp4` are 5.2s at 136–337 KB each, 3.4 MB total. This is a **background**, not feature content |
| On-screen text / logos | **None** | crushed by the overlay, and not localizable |

### Two framing rules that come from the CSS, not from taste

1. **Do not bake in a zoom or push.** The CSS already animates
   `transform: scale(1.06) → scale(1.0)` across the visible window — a slow
   drift-out. A clip with its own push compounds into a lurch. Shoot **locked-off
   or very slow drift**.
2. **Leave ~6% edge safe margin.** That same 1.06 scale crops the frame edges at the
   start of every cycle.

### Composition

- The headline block sits **left** (`.hero-inner` is a `1.6fr / 1fr` grid, copy in
  column one: H1, paragraph, three buttons). **Keep the subject right-of-centre**;
  treat the left third as occupied.
- On mobile the grid collapses to one column and **text overlays the whole frame**,
  and `cover` crops to a centre vertical slice. So: **keep action centred
  vertically, leave headroom**, and don't rely on anything near the frame edges.

### The single most important constraint — the overlay

`.hero-overlay` sits above the video: a navy gradient at **86% → 78% → 70% opacity**,
plus `.hero-glow`, a green radial in the top-right.

Consequences, and they are severe:

- **Colour grading is essentially thrown away.** Do not spend the budget there.
- **Dark footage turns to mud.** Shoot **bright / high-key**, well-lit interiors,
  daylight exteriors.
- **What survives is contrast, silhouette and motion.** A clip reads by its shapes
  and its movement, not its detail. Favour clean separation between subject and
  background.

---

## 3. Content — the four clips

The hero copy names exactly four groups: *"local couriers, laborers, cleaners, and
skilled professionals."* The four clips should map to that promise.

The established look across the nine hero stills, which the clips must match:
**navy polo + navy cap** (brand navy) as a consistent uniform, **real work
mid-action** (never posed to camera), **commercial settings**, **one clear
foreground subject with secondary workers giving depth**, natural or practical
light, slightly desaturated.

| # | Subject | Matches still | Suggested action |
|---|---|---|---|
| 1 | **Courier / delivery** | `connect-hero-imgs.webp` | Courier wheeling a stack of boxes off a hand truck from an open van, city street, mid-morning |
| 2 | **Laborers / moving crew** | `connect-hero-img-4.webp` | Two-person crew carrying a wrapped sofa down a truck ramp into a commercial entrance |
| 3 | **Commercial cleaning** | `connect-hero-img-7.webp` | Floor-burnisher pass across a glass-walled office lobby, after hours, second cleaner in background |
| 4 | **Warehouse / fulfillment** | `connect-hero-img-3.webp` | Forklift easing a wrapped pallet out of a racking aisle, pallet-jack operator in foreground, hi-vis over navy |

### ⚠️ One content decision for the owner

The copy promises **"skilled professionals"**, but the fourth slot above is
**warehouse/fulfillment**, matching the existing still. Both are real Connect
categories (there are use-case pages for `warehouse-fulfillment` *and*
`skilled-trades`). Options:

- **(a) Keep warehouse** — matches the existing photo set exactly; "skilled
  professionals" then goes unrepresented in the hero motion.
- **(b) Swap in skilled trades** — e.g. an electrician or HVAC tech working a
  commercial panel or rooftop unit. Matches the headline copy precisely and covers
  the highest-value category, at the cost of diverging from the stills.

**Recommendation: (b).** The hero copy is a promise, and trades is the category a
business owner is least likely to assume an on-demand platform can staff.

### Production hygiene

- **No legible third-party brand logos.** The 2026-07-22 photo pass rejected frames
  for exactly this; it is an established bar, not a preference.
- **Signed releases for every identifiable person on camera.**
- Keep wardrobe consistent with the stills (navy polo/cap; hi-vis over navy where
  the setting genuinely calls for it).
- Avoid anything that reads as safety-incorrect — the same 7/22 pass also rejected a
  hazmat-suit frame as off-message.

---

## 4. Delivery and wiring

**Deliver:** four files, `clip-1` … `clip-4`, mp4 (plus optional webm), named in
shot order above.

**Where they should live — note a conflict.** The dormant code comment says
`hero-media/clip-1..4`. That folder exists at `Final/hero-media/` and is **empty**,
and the path predates the asset reorganisation. Every other video on the site lives
in `assets/video/` under `<context>-<descriptor>-<n>.<ext>`
(`docs/handoff/folder-structure.md`).

**Recommendation:** `Final/assets/video/connect-hero-1..4.mp4`, and update the
comment. Either works; the convention-matching path is better for the rebuild.

**What happens on arrival** (~10 lines, plus verification):

1. Add four `<video class="hero-clip" autoplay muted loop playsinline>` elements
   inside `.hero-video-bg`, with inline `animation-delay: 0s / 6s / 12s / 18s`.
2. Nothing else. `goLive()` already listens for `loadeddata` / `playing` on any
   `.hero-clip` and adds `.clips-live`, which hides the photo cycle.
3. `prefers-reduced-motion` already strips `autoplay` and pauses, leaving the static
   first photo.

**Verify after wiring:** clips actually take over (not just 200 on the file), the
photo cycle hides, reduced-motion still shows the static photo, no horizontal
overflow at 375, and total hero payload stays within budget.

---

## 5. Corrections to earlier notes

Both of these were carried forward incorrectly and are fixed here:

- **"The hero plays services b-roll stand-ins meanwhile"** (CLAUDE.md outstanding
  to-do, from the 7/15 entry) — **stale.** The stand-ins were removed on 2026-07-17.
  The hero is photos-only today.
- **The 8 hero-clip 404s** are long gone; there are no `.hero-clip` elements in the
  markup at all, so nothing is requested and nothing 404s.
