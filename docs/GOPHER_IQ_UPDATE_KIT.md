# Gopher iQ — Update Kit

This one file does two jobs:

1. **Paste-the-prompt** — copy the block in Part 1 into a fresh chat (and attach your
   current sandbox HTML). It tells Claude everything about the project so an update is
   seamless and nothing important gets re-litigated or broken.
2. **Integration checklist** — Part 2 is the manual steps to push a finished change to
   your 4 live pages.

---

## PART 1 — PASTE THIS PROMPT TO START AN UPDATE

> Copy everything between the lines. Attach your latest `gopher-iq-sandbox-standalone.html`
> (and any spreadsheet/screenshot/style-guide files the task needs). Then add one sentence
> at the end saying what you want changed.

---8<------------------------------------------------------------------

You are continuing work on **Gopher iQ**, an AI "search pill" engine that lives as a
single self-contained HTML file. Read this whole brief before doing anything.

**The artifact.** I'll attach `gopher-iq-sandbox-standalone.html`. Treat it as the source
of truth. Work on a copy, edit in place, and at the end copy the finished file to the
outputs folder and present it. Keep the file self-contained.

**Two layers inside the file — keep them straight:**
- The **engine** = two blocks that get pasted into every real page:
  - `<style id="gopher-ai-engine-css-inline">` (the results dropdown, answer panel, scope menu, cards)
  - `<script id="gopher-ai-engine-js-inline">` (all logic + routing)
- The **sandbox demo page** has its *own* separate `<style>` block and the `.ai-bar`
  markup. The pill (`.ai-bar`: white bar, green "+", scope, mic) is styled HERE, not in
  the engine — host pages own their pill. Don't restyle `.ai-bar` from the engine.

**Engine architecture (don't redesign without me asking):**
- 8 service categories (slugs): `junk_removal, delivery, moving, ride_sharing,
  yard_work_outdoor_projects, hourly_day_labor, home_services, other`.
- Scoring (`scoreCategories`) matches single stemmed words via a stemSet; multiword
  matches only happen through each category's `phrases` array (substring). Weights:
  hints ×4, tokens ×2.5, pwords ×1.0. Multiword tokens/pwords are ignored by the stemSet.
- Tunables: `CAT_THRESH=4` (min for a card), `CAT_RELATED=2` (close-match bar),
  `CAT_HIGH=8` (strong + clear lead = high confidence), `FAQ_FLOOR=12`.
- Confidence: `classifyWithConfidence` → 'high' (clean green card) or 'less' (shaded card
  + related chips).
- FAQ groups: Customers, Workers, Support, Businesses.

**Routing config** lives in the `GOPHER_LINKS` object near the bottom of the engine JS.
Current values:
```
request:     'gopher-request.html#login'    // Submit a request -> login / sign-up
requestDemo: 'gopher-request.html#demo'     // See how it works
services:    'gopher-services.html'         // category chips
serviceSections: { junk_removal:'#junk-removal', delivery:'#delivery', moving:'#moving',
  ride_sharing:'#ride-sharing', yard_work_outdoor_projects:'#yard-outdoor',
  hourly_day_labor:'#day-labor', home_services:'#home-services', other:'#other' }
```
- `requestHref(slug)` inserts `?category=<slug>` BEFORE any `#hash`
  (e.g. `gopher-request.html?category=moving#login`). Preserve that ordering.
- `_go(url)` navigates with top-frame + new-tab fallbacks so it survives sandboxed
  previews. Don't revert it to a bare `window.location.href`.
- CTAs: "Submit a request" → `submitRequest(slug)`; "See how it works" →
  `seeHowItWorks()`; category chips → `openServices(slug)`. Never route people to a
  contact-us page — educate, then send to a request. Exception: worker/business FAQs get
  Close only (no request push). Customer-facing = FAQ groups {Customers, Support}.

**Brand tokens (from the style guide):** green `#33D975` (Shamrock), green-dark `#1CB061`,
green-light `#87F7BD`, green-tint `#e8f7ea`, navy `#002461` (Midnight Blue), navy-mid
`#253a7e`, cornflower `#BADBFC`, terracotta `#d97757`, sand `#fbf3e4`, paper `#ffffff`,
ink `#002461`, body `#424242`, muted `#6b7280`, rule `#e7e2d3`. Fonts: Nunito + DM Sans.
The branded pill follows the style guide's `.demo-ai-pill` spec (1.5px navy border, fully
rounded, soft hairline shadow, green circular "+" with a navy glyph, green focus glow).

**Standing rules / how I like to work:**
- Before adding category vocabulary, collision-guard at the word level — never silently
  push a term that already routes elsewhere.
- For collisions: keep the primary routing and surface the other category as a close-match
  chip (the established pattern: `ALSO_HOME_SERVICES` + `crossAffinity`, and
  `relatedCategories` for 'less' confidence). Don't invent score-gap hacks that add noise.
- Don't re-litigate the 8 categories, the confidence UI, or the 4-section FAQ order
  without me asking.
- Report errors honestly. Browser truth beats a passing Node test — you can verify logic
  and that the engine parses, but say plainly that live DOM rendering isn't verified.
- For spreadsheets/Word/PDF/PPT work, read the matching SKILL.md first.
- I give firm answers on functional decisions; on pure styling, "whatever you recommend"
  is fine — just make a tasteful call and tell me what you chose.

**Your method each turn:**
1. Make the change in the file.
2. Sanity-check: extract the engine JS and run a parse check; reproduce any routing/scoring
   logic in Node when relevant.
3. Copy the finished file to the outputs folder and present it.
4. Tell me **which block(s) changed** — CSS-only, JS-only, or both — and the exact 4-page
   propagation steps. If a change is CSS for the pill specifically, remind me it's
   host-page-owned and must also be pasted into each page's own styles.

My request for this session:
**<one or two sentences — what you want changed>**

------------------------------------------------------------------>8---

---

## PART 2 — INTEGRATION CHECKLIST (push a finished change live)

The 4 pages: **index, gopher-request, gopher-services, FAQ.**
For each page, do the same pass:

1. **Engine CSS** — paste the `<style id="gopher-ai-engine-css-inline">…</style>` block
   into the page's `<head>`. If an old one exists, **replace** it (duplicate `id`s collide).
2. **Engine JS** — paste the `<script id="gopher-ai-engine-js-inline">…</script>` block
   just before `</body>`. Replace any old one. *This is the block that carries logic and
   routing fixes.*
3. **Pill markup** — make sure the body contains the `.ai-bar` markup (the `.ai-plus` svg,
   the `<input>`, the `.ai-scope` span, the `.ai-mic` span). No `.ai-bar`, no pill — the
   engine attaches to the first `.ai-bar` it finds on load.
4. **Pill styling (branded look)** — paste the pill CSS into the page's own `<style>`.
   Optional: skip it if a page already styles its pill the way you want. The pill still
   *functions* without it; this only controls appearance.

**Verify each page (30 seconds):**
- Type e.g. `get rid of an old couch` → a result card appears.
- Click **Submit a request** → goes to `gopher-request.html?category=…#login`.
- Click **See how it works** → goes to `gopher-request.html#demo`.
- If nothing happens on load, open the console — `No .ai-bar element found on page` means
  the markup (step 3) is missing.

**Two gotchas:**
- Exactly **one** `.ai-bar` and **one** engine script per page. Duplicates break attach.
- Confirm the real anchor ids on your pages match `GOPHER_LINKS` — especially that the
  login/sign-up section is actually `id="login"`. If it's `signin`/`signup`/`auth`/etc.,
  change the single `request:` value and re-propagate the JS.

**Source files for copy-paste** (generated alongside this kit):
- `pill-propagation/1-engine-css-block.html`
- `pill-propagation/2-engine-js-block.html`
- `pill-propagation/3-pill-css.css`
- `pill-propagation/4-pill-markup.html`
