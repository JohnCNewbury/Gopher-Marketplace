# Blog-split checks (2026-09-16)

The scripts that built and verified the one-page-per-post blog split. Kept because the *checks* stay
useful every time a `blog-*.html` page changes — they were written in a session scratchpad, which is
wiped.

Full record of the work: [`docs/handoff/blog-split-seo-aeo-2026-09-16.md`](../../../docs/handoff/blog-split-seo-aeo-2026-09-16.md).

## ⛔ `build.py.SPENT-DO-NOT-RUN`

The one-shot migration out of the old single-page blog. It reads the 14 post bodies out of
`gopher-blog.html` — **which no longer contains them.** Running it against the pre-split snapshot
would regenerate the pages from stale copy and silently discard every fix made since. It is kept for
its record of how the pages were generated, and renamed so it cannot be run by reflex.

**The post pages are now the source of truth for post copy.** Edit them directly, the way
`fix_flags.py` does.

## What to run

| Script | What it checks | Needs a server? |
|---|---|---|
| `verify.py` | every relative `href`/`src` resolves **with exact case** (compared against `os.listdir` — `os.path.exists` is case-insensitive on macOS); no root-absolute paths; no hotlinked assets; every JSON-LD block parses and carries its required keys; canonical/`og:url` match the page's own URL; banned-word grep; word-count parity | no |
| `render.py` | headless Chrome at 1200px and 430px: header renders exactly once, one footer, one H1, images load, no horizontal overflow; then drives all 14 old `#id`s through the fragment shim | yes |
| `shim_retest.py` | re-tests specific shim cases with more headroom, using the landing page's own canonical rather than an injected probe | yes |
| `fix_flags.py` | the applied copy corrections, as a worked example: every replacement asserts an expected hit count, so a miss fails loudly instead of doing nothing | no |
| `live_verify.sh` / `live_verify2.sh` | content-verify the two live hosts by string, cache-busted, asserting the new text is present **and** the old text is gone | no (hits live) |

`meta.py` holds the per-post slugs, dates, meta descriptions, takeaways and FAQ entries.
`baseline_words.json` is the pre-split word count per post — the fixed point parity is measured
against.

Paths are absolute to this repo and to a session scratchpad; **`SERVE` and `BASE` in `render.py` /
`shim_retest.py` point at a scratchpad that no longer exists.** Repoint them at a copy of `Final/`
served over HTTP before use.

## Traps these scripts already account for — do not re-derive them

- **Chrome writes its screenshot / DOM dump and then never exits** on this Mac
  (`CVDisplayLinkCreateWithCGDisplay … CVReturn: -6670`). A subprocess timeout is expected; the
  partial output is the real output.
- **`--window-size=430,…` does not give a 430px viewport** — Chrome floors the window near 500px.
  Phone width is measured inside a same-origin 430px `<iframe>`.
- **`gopher-header.js` replaces its `<div id="gopher-header">` mount**, so counting `#gopher-header`
  after load returns 0 on a *correctly* rendered page. Count `header.gh-header` instead.
- **An injected probe's silence is not a failure.** The shim suite reported 0, 1, 2 and 0 failures
  across four runs of identical code. Settled with a signal the page emits about itself — its own
  `<link rel="canonical">` — not by retrying: 10/10, probe absent every time, canonical right every
  time.
- **A page-wide "this class is absent" assertion manufactures false regressions.** Checking that
  `btn--navy` was gone from the marketplace explainer failed on both hosts, because the shared
  closing band legitimately uses it on a green background. Scope such checks to the element.

## Deliberate deltas

`verify.py`'s `EXPECTED_DELTA` records copy changed *after* the migration, so an **undeclared** drift
still fails rather than the check being loosened. Add to it rather than relaxing the threshold.
