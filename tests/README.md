# tests/ — parity harness (Playwright) + legacy unit tests

The oracle for the Laravel port. Two layers, both run against **golden** (the static `Final/` tree, served locally) and **candidate** (the Laravel app):

| layer | what | command |
|---|---|---|
| **render parity** | per page: HTTP status, visible text, SEO head, h1, JSON-LD, broken same-origin links, console/page errors, duplicate ids, full-page pixel diff at 3 viewports | `node parity.mjs` |
| **flows** | behavioural specs that must pass on both sites (`@playwright/test`) | `npx playwright test` |

## Setup (once)

```bash
cd tests && npm install && npx playwright install chromium
```

If the browser download is blocked (corporate allowlist, the Cowork VM), point the harness at any Chromium/Chrome binary instead: `export CHROMIUM_PATH=/path/to/chrome` (macOS: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`).

## Run

```bash
cd tests

# 1. golden server (case-sensitive, like the Linux hosts)
npm run serve:golden                 # = node serve.mjs ../Final --port 8140

# 2. noise floor — golden against itself. Do this FIRST and keep the report.
npm run parity:noise -- --family A --limit 10

# 3. real comparison (Laravel on :8000, clean URLs)
npm run parity -- --candidate http://127.0.0.1:8000 --url-map cleanUrls
npm run parity -- --family A                      # just the 107 service pages
npm run parity -- --pages index.html,gopher-faqs.html --no-screenshots

# 4. flows — same specs, both targets
npm run flows:golden
npm run flows:candidate

# 5. the pre-existing unit tests for the shared JS modules (step gates, flow rules, draft store/map)
npm run unit
```

Reports: `tests/out/parity/report.md` + `report.json` + screenshots/diffs; `tests/out/flows-report/index.html`.

## Legacy unit tests (`npm run unit`)

`docs/handoff/request-app-parity/test-*.js` are mutation-tested node scripts that lock the behaviour of `Final/assets/js/gopher-step-gates.js`, `gopher-flow-rules.js`, `gopher-request-draft-store.js` and `-draft-map.js` — 215 assertions. They stay where they are (they resolve `Final/` by relative path) and run from here. When those modules are ported to PHP, their fixtures become the Pest tests. `test-prototype-stepgate-equivalence.js` is excluded: it hardcodes an absolute path on the original author's Desktop and needs repointing before it can run anywhere else.

## Rules the harness enforces on itself

- **Never touches production.** `api.gophergo.io`, Google Maps, unpkg and the old Apps Script endpoint are stubbed in-browser (`lib/stubs.mjs`); every would-be API call is logged so flows can assert counts (deals: exactly one `POST /users/deals` per submit).
- **The page list is the inventory's.** `lib/pages.mjs` reads `docs/port-notes/inventory.summary.json` (produced by `bin/inventory.mjs`); it never has its own list to drift.
- **Selectors are `data-testid` or ARIA roles.** Never classes or ids from today's markup — Livewire will re-render all of it. App-flow specs are `test.fixme` until the testids are added to the golden HTML (a zero-risk change; the ids each spec needs are named in its `fixme` message).
- **Flows assert visible behaviour, never storage.** Golden keeps drafts in `localStorage`; the port keeps them in the session.
- **Motion is frozen before screenshots** (`lib/capture.mjs`): transitions/animations off, `.reveal` forced visible, videos hidden.

## Reading a parity failure

| column | means |
|---|---|
| text −/+ | lines of visible text only in golden / only in candidate. Must be 0/0 for families A–C. |
| seo | `<head>` keys that differ (title, description, canonical, OG, Twitter). Canonical is *expected* to differ once the port switches to clean URLs — update `seoKeys` in `harness.config.mjs` then. |
| links+ | same-origin links broken on candidate but not on golden. Golden's own broken links are listed separately at the bottom of `report.md`. |
| errs+ / ids+ | new console errors / duplicate ids on candidate. |
| mobile/tablet/desktop | pixel diff ratio. Above `pixelThreshold` (1%) writes `<page>.<viewport>.diff.png`. |

## Extending

- New flow: copy `flows/service-page.spec.mjs`, import `{ test, expect }` from `./fixtures.mjs`, use `url('/golden-path.html')` for navigation.
- New API fixture: `fixtures/api/<METHOD>_<path_with_underscores>.json` (e.g. `GET_users_deals_mine.json`). Anything without a fixture gets `{ ok: true, stub: true }`.
- Maps stub needs a new class: add it to `MAPS_STUB` in `lib/stubs.mjs`; set `window.__gmStubPlace` / `__gmStubGeocode` / `__gmStubDistance` / `__gmStubPredictions` from a test to control what the stub returns.
