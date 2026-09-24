# Screen Spec ("Truth file") — session brief

> **Audience: a Claude Code session — NOT the dev partner.** This is a work order. It talks
> about Chrome flags, scratchpads and browser-pane quirks, none of which are dev-partner
> concerns. The artifact the dev partner reads is the **generated spec site** this brief
> produces, not this file. Dev-facing documentation lives in `docs/handoff/`.

**Owner-approved 2026-08-02.** This is the brief for a **dedicated, autonomous session**. There
is no production risk in this work and the owner does not want to be pulled into it. Run the
loop, self-verify against the pass criteria below, report once at the end.

---

## Objective

Produce **one place** where every production screen needed for the reskin is accessible and
accurate, so the incoming dev partner can implement with precision.

## The rule that makes this work

**The spec is generated from what the prototype RENDERS — never from a source file.**

A screen that does not render cannot enter the spec. That makes staleness *structurally
impossible* rather than something a person has to remember.

This rule exists because the alternative already failed. On 2026-08-02, 24 `-figma.html` files
were quarantined to `_prototypes/Go/_day1-figma-archive/`. They were the day-1 Figma import,
kept "in sync" by hand, and they had drifted into the worst possible state — *partially*
updated, so they looked current:

| File | Drift |
|---|---|
| `gopher-go-home-figma.html` | 296 KB, has the iQ pill + "Previous requests" — but no SP Deal tile (7/24). The live version is 356 KB and has it. |
| `best-practices`, `counter-offer`, `refer-signup-flow` | still say **"Requestor"** after two spelling sweeps |
| `request-history-figma` | carries **both** "Previous requests" and the retired "Request History" |

**Do not reintroduce a hand-maintained second copy of the UI in any tool, Figma included.** If a
Figma deliverable is ever wanted, it must be *published from the generator*, never edited as a
source.

---

## What already exists (done 2026-08-02)

| Thing | Where |
|---|---|
| Quarantine + README explaining each stale file | `_prototypes/Go/_day1-figma-archive/` |
| Spec generator (renders each screen, captures PNG, extracts component tree + painted tokens) | `scripts/screen-spec/gen-screen-spec.py` → writes to `docs/screen-spec/` |
| Spec site renderer (JSON + PNG → browsable HTML) | `scripts/screen-spec/render-spec-site.py` |
| Working sample: `job-detail`, `work-settings`, `home` | run the two scripts |

Both scripts are proven end-to-end against the Go prototype. Requires a local serve on **8141**
(`python3 -m http.server 8141 --directory <serve-copy>`) — see Traps.

### What the generator does and does not do

- **Mechanical, drift-proof (the script):** screen inventory · reference PNG · component tree
  with real class names, sizes, text and interactivity · the token set actually painted.
- **Authored per screen (a human/AI writes these):** behaviour rules · endpoints · the
  REUSE / ADAPT / NET-NEW verdict. These go in `screen-spec/notes/<id>.md` and are folded into
  the page. **A page with no note says so out loud** rather than looking finished.

---

## Pass criteria — the loop self-checks against these

1. **Coverage** — every screen in both registries that renders is present. Go is **21 NATIVE +
   12 FRAMES = 32 unique**; Request adds the 7-step flow, home, deals, inbox, in-progress, refer.
2. **No quarantined references** — nothing in the spec cites `_day1-figma-archive/`.
3. **Token resolution** — every painted value either maps to a named token or is explicitly
   listed as a literal needing one. *(Baseline measured 2026-08-02: `job-detail` resolved only
   **3 of its top 20** values. The prototypes are roughly 15% tokenised — closing that gap is
   part of the job, not a side quest.)*
4. **Idempotent** — re-running the generator produces no diff. A diff means the prototype
   changed and the spec just caught it, which is the system working.
5. **Completeness per page** — image · component tree · tokens · behaviour · endpoints · verdict.

---

## Known gaps to fix first

1. **Full-scroll capture.** The PNG currently captures only the first viewport. `job-detail`'s
   frame is 390×1270 but its content scrolls past that, so the reference image is truncated.
   Fix before generating at scale — otherwise 32 half-screens get published.
2. **Request app support.** The generator targets the Go prototype. Request screens render in
   **plain DOM**, Go screens render in a **shadow root** — the extractor already reads the shadow
   root, so it needs a branch, not a rewrite.
3. **`request-history` dead entry.** That screen exists in both registries and the `FRAMES` copy
   is dead code shadowed by `NATIVE`. Delete the dead entry from `gopher-go-prototype.html`.
   *(This one already caused a real mistake — a session started editing the wrong copy.)*
4. **Unified token vocabulary.** Go declares `--aqua`, Request declares `--aquamarine`, for the
   same brand palette. One vocabulary across both apps.

---

## Ongoing rule after completion

When prototype work continues and a screen is enhanced, **re-run the generator**. That is the
entire maintenance obligation — no manual re-drawing, no second artifact to update. If a change
is worth shipping, the regeneration is one command and the diff shows exactly what moved.

---

## Traps (each of these has cost real time)

- **Chrome 111+ rejects CDP websockets** without `--remote-allow-origins=*`.
- **Custom properties are authored in hex, computed styles come back as `rgb()`** — without
  normalising, every token lookup silently misses and everything looks like a literal.
- **Serve a copy, not the Desktop tree** — TCC blocks the browser from reading it.
- **The browser pane runs pages in a background tab** (`document.hidden === true`), which freezes
  CSS transitions and throttles timers. A correct implementation can read as broken. Use
  `el.getAnimations().forEach(a => a.finish())` before reading settled style.
- **The scratchpad gets reaped mid-session.** Keep durable output in the repo, not `/tmp`.
- **"Renders from FRAMES" ≠ "is day-1."** The FRAMES container has been edited continuously —
  `home` and `account` carry the SP Deal tile, iQ pill, "Previous requests" and
  "Block Requesters". Do not treat FRAMES screens as stale; treat the archived files as stale.

---

## Scope note

`docs/` is excluded from the deploy (`EXCLUDE` in `scripts/deploy.sh`), so this brief and any
generated spec placed under `docs/` are **not published** to the live site.

---

## ✅ COMPLETED 2026-08-02 (commit `34a519f`)

All pass criteria verified:

1. **Coverage** — 44/44: Go 21 NATIVE + 11 FRAMES (the dead `request-history` FRAMES
   entry is deleted, so 32 unique) + Request 12 (7 flow steps + home, deals, inbox,
   in-progress, refer).
2. **No quarantined references** — the only `_day1-figma-archive` mention in the spec
   is the deliberate "do not implement from" warning box.
3. **Token resolution** — vocabulary unified across BOTH apps (`--aquamarine`→`--aqua`
   was the visible tip; the real fix was two whole dialects: old `--green`=#33D975 /
   `--muted`=#6b7280 in Go NATIVE + 3 FRAMES entries + the Request flow, renamed
   use-by-use onto the canonical names, plus `--green-deep` split off for the #178A4E
   clash). Every screen scope now declares the full canonical set (+ `--z-*` zones,
   radii, fonts). job-detail top-20: 3→7 named; the remainder are fontSize/fontWeight
   literals — no type-scale tokens exist in any canon source, so they are correctly
   listed as "literal, needs a token".
4. **Idempotent** — two consecutive full runs produce byte-identical JSON and
   pixel-identical PNGs (animations/SMIL frozen, Math.random seeded, flow typewriter
   timers cleared synchronously).
5. **Completeness** — every page: PNG (full-scroll, paint-verified) · component tree ·
   token table · authored note with behaviour, endpoints and REUSE/ADAPT/NET-NEW.

Three latent prototype bugs were fixed by the token work (pixel-diff-verified as the
only render changes): the Go NATIVE footer GO-button gradient (invalid var → was
rendering transparent), the FRAMES home "View all local Deals" link color, and two
author-intended greens in the Request flow.

**Maintenance:** after any screen change, `python3 scripts/screen-spec/gen-screen-spec.py`
then `render-spec-site.py` (serve a repo copy on :8141 first). The diff IS the review.
