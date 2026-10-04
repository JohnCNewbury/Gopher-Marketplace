# bin/ — migration tooling

Mechanical, no-LLM scripts that index the legacy `Final/` tree for the Laravel port.
See `docs/port-notes/laravel-migration-plan.md` (Phase 0) for how they fit.

```bash
cd bin && npm install                                   # acorn, acorn-walk, parse5, fast-glob
node inventory.mjs ../Final --out out/inventory.json    # full index (5 MB, gitignored)
cp out/inventory.summary.json ../docs/port-notes/       # small summary — commit this, diff it
node changelog-ledger.mjs out/inventory.json --out-dir ../docs/port-notes
npm run extract                                         # services.json → docs/port-notes/
```

| script | what it does |
|---|---|
| `inventory.mjs` | Every page + every `assets/js` module: family, sections, functions (hashed), call graph, endpoints (wrapper-aware), storage keys, injection sites, dup ids, hardcoded keys, vendor / first-party opaque blocks, SEO head, changelog. |
| `changelog-ledger.mjs` | Header changelog → `docs/port-notes/<page>-changelog-ledger.md`. Only `gopher-request.html` has one today. |
| `extract-services.mjs` | The 107 family-A service pages → `services.json` + `categories.json` + `extract-report.md`. Self-verifying: body text vs captured text per page; `--strict` fails on any uncaptured copy. |
| `inventory.orig.mjs` | The 2026-09-05 pre-patch version, kept for reference. Delete when nobody needs the diff. |

Planned: `extract-services.mjs` (107 service pages → `services.json`), the Playwright parity harness.

Rules: scripts read `Final/` and never write to it. Output goes to `bin/out/` (ignored) or `docs/port-notes/` (committed, small).
