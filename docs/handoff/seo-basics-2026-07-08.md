# Per-page SEO basics (G40-319)

_Done 2026-07-08. Part of Epic **G40-312**. Canonical/OG base domain = `https://gophergo.io/` (owner decision — the new site replaces gophergo.io at root)._

## Baseline (before)

| Tag | Coverage before |
|---|---|
| `<title>` | 127/127 ✅ (already good) |
| meta description | 113/127 |
| canonical | **0/127** |
| Open Graph | ~0/127 |
| `og:image` | 0/127 |
| Twitter card | 0/127 |
| exactly one `<h1>` | ✅ all (only the iQ sandbox tool has none) |

## What was added (126 pages)

Injected a consistent SEO block right after `</title>` on every content page:
- **`<link rel="canonical">`** — `https://gophergo.io/` for the homepage, `https://gophergo.io/<page>.html` for the rest.
- **Open Graph** — `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`.
- **Twitter** — `summary_large_image` card with title/description/image.
- **Filled 13 missing meta descriptions** (connect, request, deals, customer-deals, index, faqs, contact, privacy, terms, both tutorials, go, iQ sandbox) with hand-written copy.
- `lang="en"` was already present on all pages.

**Share image:** created `assets/img/og-default.jpg` (1200×630) — cream background, navy + green Gopher logo, tagline "Your Community Marketplace for Any Service" + service list, brand accent bars. Used as the default `og:image`/`twitter:image` site-wide (absolute URL `https://gophergo.io/assets/img/og-default.jpg`).

Idempotent (skips any page that already has a canonical); verified exactly one canonical / og:image / description per page, no double-injection. Browser-checked: tags present in DOM, one `<h1>`, header/footer intact, no console errors.

## Notes / for dev

- **Canonical URLs use `.html`** to match the current served filenames. If production adopts clean URLs (e.g. `/tv-mounting`), regenerate canonicals + `og:url` to drop `.html`.
- **`og:image` is one shared default.** Per-page custom share images (e.g. the service hero) would improve link previews — a nice future enhancement; the default is standard and correct for now.
- **`gopher-go-101.html` was intentionally skipped** — a concurrent go101 refactor is mid-flight in the working tree; add the same SEO block to its `<head>` once that lands.
- The iQ sandbox (`gopher-iq-sandbox-standalone.html`) has no `<h1>` — it's an embedded tool, not a content page; left as-is.
- `og:image` is an absolute `gophergo.io` URL, so it won't resolve on the interim preview host — it resolves once deployed to gophergo.io.
