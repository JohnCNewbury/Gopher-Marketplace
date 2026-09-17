# Blog split for SEO / AEO — build brief

**Owner decision (2026-09-13):** "This sounds like it is a no brainer and must be done for effective
SEO/AEO." Scheduled for Wednesday 2026-09-16 morning. This document is the complete instruction set
for that session. Read it top to bottom before touching a file, then re-read `CLAUDE.md` and
`Dev/gopher-dev-handoff/src/content/docs/start-here/standing-rules.md`.

---

## 1. The problem, in one paragraph

`Final/gopher-blog.html` is one URL carrying 14 blog posts as `<details class="post-card">` cards
(~91 KB, ~7,900 words, 1 H1, 15 H2s, no JSON-LD, one title tag, one meta description, one canonical,
one Open Graph card, one sitemap entry). Search engines and answer engines rank and cite URLs. With
one URL, no post can rank for its own query, every search result and social share shows the generic
blog title, there is no per-post date or schema, adding a post creates no new URL (no freshness
signal, no Discover eligibility, no feed), and LLM crawlers that cap page length may never read the
later posts. The fix is the pattern the site already uses for services: a hub page
(`gopher-services.html`) linking to one page per item (`food-delivery.html` is the model leaf).

## 2. What to build (deliverables, all in `Final/`)

### 2.1 Fourteen post pages, flat at the site root

**URL convention: `blog-<slug>.html` at the root of `Final/`.** Not a `blog/` subfolder. Reason
(verified 2026-09-13): `assets/js/gopher-header.js` hard-codes page-relative links
(`'gopher-blog.html'`, `'index.html'`, …), the footer block uses `assets/...` and `x.html`, and every
one of the ~130 pages sits at the root. A subfolder would break header nav on the new pages unless
the header script changed. Flat files need zero shared-code changes and match the 120 service pages.

| Card id (old `#anchor`) | New file | Category chip | Date on card |
|---|---|---|---|
| `how-it-fits` | `blog-gopher-marketplace-on-one-page.html` | The marketplace | Sep 12, 2026 |
| `deals-for-merchants` | `blog-merchant-deals-skip-the-delivery-app-cut.html` | For merchants | Sep 12, 2026 |
| `service-providers` | `blog-service-provider-deals.html` | For Service Providers | Sep 13, 2026 |
| `marketplace` | `blog-the-marketplace-your-community-runs-on.html` | The marketplace | Jun 1, 2026 |
| `realtors` | `blog-help-for-busy-realtors.html` | For businesses | Apr 22, 2026 |
| `bring-your-own` | `blog-no-gopher-nearby-yet.html` | For neighbors | Apr 15, 2026 |
| `connect` | `blog-on-demand-local-workforce.html` | For businesses | Mar 30, 2026 |
| `age-restricted` | `blog-age-restricted-deliveries.html` | For neighbors | Mar 18, 2026 |
| `junk` | `blog-junk-removal-the-easy-way.html` | For neighbors | Feb 4, 2026 |
| `seniors` | `blog-a-marketplace-seniors-can-trust.html` | For neighbors | Jan 9, 2026 |
| `earn` | `blog-worker-centric-way-to-earn.html` | For Service Providers | Dec 2, 2025 |
| `restaurant` | `blog-restaurant-delivery-without-the-30-percent-bite.html` | For merchants | Nov 12, 2025 |
| `refer-yourself` | `blog-refer-yourself.html` | For Service Providers | Oct 28, 2025 |
| `a-gig` | `blog-a-job-you-ll-actually-dig.html` | For Service Providers | Sep 16, 2025 |

(The last slug deliberately avoids the brand-banned word "gig". The post's *title* still contains
it — see §6, flag for owner, do not change the title silently.)

**Every post page must have, in this order:**

1. `<head>` modelled on `food-delivery.html` (read it first):
   - `<title>` = post title + ` – Gopher` (en dash, site convention). Keep under ~60 characters
     where the title allows; if a title is long, use it anyway rather than inventing a new one.
   - `<meta name="description">` unique per post, 120–155 characters, written from the post's own
     dek/lead-in, containing the post's primary phrase (e.g. "Service Provider Deals").
   - `<link rel="canonical" href="https://gophergo.io/blog-<slug>.html">`.
   - Open Graph + Twitter: `og:type` = `article`, `og:title`, `og:description`, `og:url`,
     `og:image` = the post's **own** card image as an absolute `https://gophergo.io/assets/img/...`
     URL (fall back to `assets/img/og-default.jpg` only for the two brand-tile posts),
     `article:published_time`, `article:modified_time`, `article:section` = category label,
     `twitter:card` = `summary_large_image`.
   - `<link rel="alternate" type="application/rss+xml" href="feed.xml">`.
   - Stylesheets: `assets/css/gopher-fonts.css` (self-hosted fonts, no Google Fonts hotlink),
     `assets/css/gopher-footer.css`, plus the post-page styles. Reuse the existing blog CSS by
     moving the shared rules into `assets/css/gopher-blog.css` and linking it from the index and
     every post; do not copy 200 lines of CSS into 14 files.
   - **JSON-LD block 1 — `BlogPosting`:** `headline`, `description`, `image` (absolute), `datePublished`
     and `dateModified` (ISO 8601, from the card date; modified = published unless the post was
     edited later — the three Sep 2026 posts and the June post were edited 2026-09-12/13),
     `author` `{ "@type": "Organization", "name": "Gopher" }`, `publisher` with `logo`
     `ImageObject` → `https://gophergo.io/assets/img/og-default.jpg`, `mainEntityOfPage` → the
     canonical URL, `url`, `articleSection`, `wordCount`, `inLanguage": "en-US"`.
   - **JSON-LD block 2 — `BreadcrumbList`:** Home → Blog → post.
   - **JSON-LD block 3 — `FAQPage`** *only* where the post already answers 2–4 concrete questions
     (the Service Provider Deals, merchant Deals, age-restricted, seniors and restaurant posts do).
     Questions must be answerable verbatim from the post's existing text. Do not invent facts.
2. `<div id="gopher-header"></div>` at the top of `<body>` — the shared header injects itself via
   `assets/js/gopher-header.js`, whose `<script>` tag is already inside the copied footer block.
   **Do not add a second script tag** (that produced a duplicate header on 2026-09-12).
3. Article body:
   - Breadcrumb links (Home › Blog › category) above the H1.
   - **H1 = the post title, exactly as on the card.** Category tag, byline ("Gopher Team"), date,
     reading time.
   - Hero image = the card image, `loading="eager"`, with the card's existing `alt` text.
   - **Answer-first opening (AEO):** the card's `pc-dek` becomes the first paragraph, styled as the
     lead. It must state the answer in the first two sentences — it already does for the three new
     posts; for older posts, use the dek as written.
   - **"Key takeaways" box** directly after the lead: 3–5 one-line bullets pulled from the post's
     own H3s and facts. This is the passage answer engines lift. No new claims.
   - The existing post body, **copy unchanged**, with the existing H3s. Keep the existing inline
     figures and their captions (the SP post has four figures; the merchant post has two).
   - Existing CTA card at the end, unchanged.
   - "Related reading": 2–3 links to other post pages in the same or adjacent category.
   - "← All posts" link to `gopher-blog.html`.
4. The canonical footer block (copy it from the current `gopher-blog.html`, mission band included).

### 2.2 The index page, `gopher-blog.html`

- Keep the page, the hero, the filter chips and the card grid. Cards become **teasers**: thumbnail,
  category, title (now an `<a>` to the post page), dek, byline, "Read the story →" link. **Remove the
  `<details>` full bodies from the index** — the full text must live on exactly one URL (the post).
- Chip counts stay hard-coded (`All 14 …`); `data-cat` values unchanged.
- Add JSON-LD `Blog` with `blogPost: [ … 14 BlogPosting stubs (headline, url, datePublished, image) ]`
  and a `BreadcrumbList` (Home › Blog).
- Keep the existing canonical, title and description on the index.
- **Fragment redirect shim** (top of `<body>` or in `<head>`): map every old `#id` in the table above
  to its new file with `location.replace('blog-<slug>.html')`. GitHub Pages cannot serve 301s, so
  this JS shim is what keeps old links, bookmarks and any indexed fragment landing on the right
  page. Keep the `id` attributes on the teaser cards too, so a user with JS off still lands on the
  card.

### 2.3 Inbound links to update (grep, don't assume)

- `gopher-go.html` links to `gopher-blog.html#refer-yourself` → point at `blog-refer-yourself.html`.
- Re-grep `Final/` for `gopher-blog.html#` and for the three new post ids after your edits; the
  marketplace explainer (`gopher-marketplace.html`) and the three new posts cross-link each other —
  any `href="#restaurant"` style links *inside* post bodies become `blog-…html` links.
- Nav/footer "Blog" links stay pointed at `gopher-blog.html`.

### 2.4 Sitemap and feed

- `sitemap.xml`: add 14 `<url>` entries (`https://gophergo.io/blog-<slug>.html`) with `<lastmod>`
  = the post's modified date. Keep the existing `gopher-blog.html` entry.
- New `feed.xml` (RSS 2.0, absolute URLs, `pubDate` in RFC 822, description = the dek, one
  `<item>` per post, newest first). Link it from the index `<head>` as well.

### 2.5 What NOT to do

- Do not rewrite post copy. Meta descriptions, takeaways and FAQ answers are *derived* from the
  text, not new claims. The Style Guide bans: ecosystem, seamlessly, platform, users, gig,
  leverage, optimize, unlock, empower, utilize. Sentence case. The four labels are Neighbors ·
  Businesses · Merchants · Service Providers (Gopher = nickname for a Service Provider).
- Do not touch `gopher-services.html` (it has the same one-URL weight problem, 392 KB / ~45k
  words, but that is a separate task — flag it, don't fix it).
- Do not add external scripts, fonts or images. Everything is self-hosted and relative.
- Do not create a `blog/` folder or any root-absolute path (`/assets/...` 404s on Pages).
- Do not commit or push without the owner's explicit go (see §4).

## 3. Verification (do all of it, report what you ran)

1. **Paths:** script over the 15 pages + feed + sitemap: every `href`/`src` that is relative
   resolves to an existing file **with exact case** (`os.path.exists` on macOS is case-insensitive —
   compare against `os.listdir` names). No leading-slash paths. No `http` hotlinks except the
   absolute `https://gophergo.io/...` URLs in canonical/OG/JSON-LD/feed.
2. **JSON-LD:** parse every block with `json.loads`; assert required keys per type. Then paste two
   pages into https://validator.schema.org/ (public, no login) and record the result. Google's Rich
   Results Test is owner-optional; say so rather than claiming it was run.
3. **Render:** headless Chrome (`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   --headless=new --disable-gpu --hide-scrollbars --user-data-dir=<scratch> --window-size=1200,H
   --screenshot=…`) via `python subprocess.run(..., timeout=70)` for at least: the index, the SP
   Deals post, the seniors post, at 1200 and 430 px wide. Confirm the header renders once, the
   footer renders, figures load, no horizontal overflow (`document.documentElement.scrollWidth <=
   innerWidth` via a JS audit in the preview pane). A local server config exists in
   `.claude/launch.json` (`finalmkt`, port 8523, serving a scratchpad copy of `Final/` — refresh
   the copy after edits; serving the Desktop path directly fails with a sandbox getcwd error).
4. **Fragment shim:** open `gopher-blog.html#service-providers` locally and confirm it lands on
   `blog-service-provider-deals.html`.
5. **Banned-word grep** over the 15 pages (case-insensitive, whole word) and report hits; the
   pre-existing title "A gig you'll actually dig" will hit — that is a flag, not a fix.
6. **Word-count parity:** for each post, the body word count on the new page equals the old card
   body word count (±2%). This proves nothing was dropped in the move.

## 4. Deploy (rules that cause real bugs; do not skip)

- The deploy publishes the **working tree** to **two live hosts** from `main` via
  `scripts/deploy.sh`. Run the **dry run first** (`scripts/deploy.sh --allow-dirty`), read the
  *full* file list (the script's diffstat elides), and check that it contains only: the 14 new
  `blog-*.html`, `gopher-blog.html`, `gopher-go.html`, `sitemap.xml`, `feed.xml`, and the new/moved
  CSS file. **Anything else is another session's uncommitted work or a revert** — `curl` the live
  file to tell which, and get the owner's OK before it rides along.
- Put the three things in front of the owner in plain words: what it solves, the risk (14 new
  public URLs; old fragment links depend on a JS shim; a broken shared CSS move would restyle the
  index), the reward (per-post ranking, citations, feed, per-post dates), and how it is undone
  (re-run the deploy from the previous `main` commit; note the current `main` sha before pushing).
  **Then wait for "go".** The auto-mode classifier blocked `--push` on 2026-09-13; if it does again,
  hand the owner the exact command with `cd` to the repo root (their terminal was in `pipeline/`).
- After push, **content-verify both hosts by string, never by status code or SHA:**
  `https://johncnewbury.github.io/Gopher-Marketplace/<file>` and
  `https://gophergo.io.customers.tigertech.net/preview/<file>` (the bare `gophergo.io/<file>`
  returns a 301 and reads as a false failure). Cache-bust the curl, grep for a string that only
  exists in the new version, check one JSON-LD block and the feed on each host.
- Nothing is committed on the feature branch by the deploy. Say so in the report; do not commit
  unless the owner asks.

## 5. Report back (end of session)

- URLs of all 15 pages on both hosts, what was verified and how, what was not (Rich Results Test).
- Word-count parity table.
- The flags in §6 with a one-line recommendation each.
- Risk/reward bullets at the end.

## 6. Flags for the owner (surface, do not resolve on your own)

1. Post title "A gig you'll actually dig" uses the banned word "gig". Recommend a retitle; the
   slug already avoids it.
2. Three older posts (Connect, age-restricted, seniors) still say "background-checked" where the
   Style Guide now says identity-verified, with Elite as the background-check tier.
3. `gopher-services.html` is a 392 KB / ~45k-word hub with the same one-URL problem. Separate task.
4. Two posts use brand tiles instead of photos (`how-it-fits`, `marketplace`) and so fall back to
   `og-default.jpg` for social cards. Fine to ship; a real image would share better.

## 7. Background you may need

- Fee model truth (`Gopher-Fee-Model-Code-Handoff-Spec.md`): the customer pays Gopher's fee on
  top; the worker always receives the full posted price. Never write that the worker's pay is cut.
- SP Deals eligibility (from `gopher-go-101.html`): verified badge (Elite, Elite+ or Pro) + 20
  completed service jobs + 4.75★ over the last 20 service jobs; delivery, ride-sharing and Other
  don't count. Customer pays a 10% Deal Boost on top. Reach up to 50 miles.
- The marketplace explainer `gopher-marketplace.html` is generated from a template saved at
  `Documentation/Gopher — Intended/gopher-marketplace-build/`; if you change its links, edit the
  `Final/` page and mirror the change into the standalone doc (see memory
  `gopher-marketplace-explainer-page`).
- Brand: Sand #FBF3E4, Midnight Blue #002461, Shamrock #33D975, Terracotta #D97757 (Caveat
  accents only), Nunito headlines / DM Sans body. Style Guide:
  `Documentation/Brand/Gopher Brand Standards/Gopher Style Guide.html`.
