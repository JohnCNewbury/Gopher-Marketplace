# Blog split for SEO / AEO — as built, 2026-09-16

Owner decision 2026-09-13: *"This sounds like it is a no brainer and must be done for effective
SEO/AEO."* Built against `docs/handoff/blog-split-seo-aeo-brief.md`, which stays the spec; this file
is the record of what actually exists and what was verified.

**State: DEPLOYED AND CONTENT-VERIFIED LIVE ON BOTH HOSTS, 2026-09-16** (deploy **`2bf8ecd`**,
rollback point **`99f9217`**). **NOT COMMITTED** on the feature branch. See §5 for what was verified
and §7 for what shipped that this session did not own.

**ROUND TWO IS ALSO DEPLOYED AND VERIFIED — deploy `11927d7`, 2026-09-16, see §8.** It fixes flag 2,
retitles the flag-1 post, and rebuilds the marketplace-explainer CTA. Rollback point for round two
is `2bf8ecd`.

---

## 1. What exists now

| | |
|---|---|
| 14 new pages | `Final/blog-<slug>.html`, flat at the site root |
| 1 new stylesheet | `Final/assets/css/gopher-blog.css` — the index's old inline `<style>` block, verbatim, plus teaser and post-page rules |
| 1 new feed | `Final/feed.xml` — RSS 2.0, 14 items, newest first |
| `gopher-blog.html` | now a teaser index: same masthead, chips and cards, no post bodies |
| `sitemap.xml` | +14 `<url>` rows with `<lastmod>`; the `gopher-blog.html` row is untouched |
| `gopher-go.html` | one link repointed, `gopher-blog.html#refer-yourself` → `blog-refer-yourself.html` |

### The slug table, as built

| Old `#anchor` | New file | Category | Published | Modified |
|---|---|---|---|---|
| `how-it-fits` | `blog-gopher-marketplace-on-one-page.html` | The marketplace | 2026-09-12 | 2026-09-12 |
| `deals-for-merchants` | `blog-merchant-deals-skip-the-delivery-app-cut.html` | For merchants | 2026-09-12 | 2026-09-12 |
| `service-providers` | `blog-service-provider-deals.html` | For Service Providers | 2026-09-13 | 2026-09-13 |
| `marketplace` | `blog-the-marketplace-your-community-runs-on.html` | The marketplace | 2026-06-01 | 2026-09-12 |
| `realtors` | `blog-help-for-busy-realtors.html` | For businesses | 2026-04-22 | 2026-04-22 |
| `bring-your-own` | `blog-no-gopher-nearby-yet.html` | For neighbors | 2026-04-15 | 2026-04-15 |
| `connect` | `blog-on-demand-local-workforce.html` | For businesses | 2026-03-30 | 2026-03-30 |
| `age-restricted` | `blog-age-restricted-deliveries.html` | For neighbors | 2026-03-18 | 2026-03-18 |
| `junk` | `blog-junk-removal-the-easy-way.html` | For neighbors | 2026-02-04 | 2026-02-04 |
| `seniors` | `blog-a-marketplace-seniors-can-trust.html` | For neighbors | 2026-01-09 | 2026-01-09 |
| `earn` | `blog-worker-centric-way-to-earn.html` | For Service Providers | 2025-12-02 | 2025-12-02 |
| `restaurant` | `blog-restaurant-delivery-without-the-30-percent-bite.html` | For merchants | 2025-11-12 | 2025-11-12 |
| `refer-yourself` | `blog-refer-yourself.html` | For Service Providers | 2025-10-28 | 2025-10-28 |
| `a-gig` | `blog-a-job-you-ll-actually-dig.html` | For Service Providers | 2025-09-16 | 2025-09-16 |

Only `marketplace` has `modified` ≠ `published`: the June post gained its
`gopher-marketplace.html` cross-link in the 2026-09-12 edit that added the three Sep posts.

### On every post page

`<title>` · unique meta description (120–155 chars) · canonical · Open Graph `article` with the
post's **own** image · `article:published_time` / `modified_time` / `section` · Twitter card ·
`<link rel="alternate">` to `feed.xml` · **BlogPosting** and **BreadcrumbList** JSON-LD · **FAQPage**
JSON-LD on the five posts that already answer concrete questions (merchant Deals, SP Deals,
age-restricted, seniors, restaurant) · breadcrumb nav · H1 = the card title · byline and date ·
eager hero image · the dek as the answer-first lead · a **Key takeaways** box · the post body
verbatim · the original CTA card · Related reading (3 links) · "← All posts".

### On the index

`Blog` JSON-LD with 14 `BlogPosting` stubs · `BreadcrumbList` · a **fragment shim** in `<head>`
mapping all 14 old `#id`s to their new page with `location.replace` (GitHub Pages cannot serve a
301). The teaser cards keep their old `id` attributes, so with JS off an old link still lands on the
right card.

---

## 2. Decisions taken, and why

- **Flat files at the root, no `blog/` folder.** `assets/js/gopher-header.js` hard-codes
  page-relative links, so a subfolder would break header nav on all 14 pages.
- **`<details>` → `<article>` on the index.** The CSS keeps its `> summary` rules (the footer's
  Tutorials submenu still uses `<details>`) and gains mirrored `> .pc-teaser` rules, so the index
  looks exactly as it did. The two JS blocks that existed only to manage `open` state were removed.
- **Post pages carry no entrance-animation script.** Nothing on them has `.reveal`.
- **`feed.xml` is not in the sitemap.** It is a feed, not a page.
- **Copy was moved by text slice, never re-rendered**, which is why word-count parity is exact
  rather than approximate (§3).

---

## 3. Verification — what was run, and the result

Scripts live in this session's scratchpad (`blogsplit/`): `build.py`, `verify.py`, `render.py`,
`shim_retest.py`.

| Check | Result |
|---|---|
| **Paths** — every relative `href`/`src` on the 15 pages resolves to a real file with **exact case** (compared against `os.listdir`, because `os.path.exists` is case-insensitive on macOS) | **574 references, 0 failures.** No root-absolute paths. No hotlinked fonts, scripts or images. |
| **JSON-LD parses** — `json.loads` on every block, required keys asserted per type | **35 blocks, 0 failures.** Canonical and `og:url` equal the page's own URL on all 14. |
| **schema.org validator** (validator.schema.org, public) — index + 3 posts | **0 errors on all four.** Types recognised: Blog, BlogPosting, BreadcrumbList, FAQPage, ListItem, Organization, ImageObject, Question, Answer, WebPage. |
| **Render** — headless Chrome, index + SP Deals + seniors + merchant Deals, at 1200px and 430px | **0 problems.** Header renders exactly once, one footer, one H1, every image loads, `scrollWidth == innerWidth` at both widths (no horizontal overflow). |
| **Fragment shim** — all 14 old `#id`s driven in a real browser | **14/14 land on the right post page.** |
| **Banned words** | 10 hits, **all pre-existing moved copy** — identical counts to `HEAD:Final/gopher-blog.html` (platform ×3, users ×1, gig ×6, unlock ×1). **0 banned words in any text written for this task.** See §4 flag 1 for the "gig" arithmetic. |
| **Word-count parity** | **Exact: 0-word drift on all 14 posts**, 5,442 words before and after. |
| **feed.xml / sitemap.xml** | Both parse. 14 `<item>`s, 14 new `<loc>`s, no duplicate locs, `gopher-blog.html` row preserved. |

**Not run, and owner-optional:** Google's **Rich Results Test**. It needs a live URL or a manual
paste; nothing here was submitted to it. Worth one pass on
`blog-service-provider-deals.html` after deploy, to confirm the FAQ rich result is eligible.

### Two harness traps worth recording

- Chrome on this Mac **writes the screenshot / DOM dump and then never exits**
  (`CVDisplayLinkCreateWithCGDisplay … CVReturn: -6670`). A subprocess timeout is expected; the
  partial output is the real output. Treating the timeout as a failure would have read as a broken
  page.
- **`--window-size=430,…` does NOT give a 430px viewport here** — Chrome floors the window near
  500px, so `innerWidth` came back 500 and the phone media queries never fired. Phone width is
  measured inside a same-origin 430px `<iframe>`, where `innerWidth` and the CSS media queries are
  genuinely 430.
- `gopher-header.js` **replaces** its `<div id="gopher-header">` mount, so counting `#gopher-header`
  after load returns 0 on a *correctly* rendered page. The real signal is one `header.gh-header`.

---

## 4. Flags for the owner

**Both flags 1 and 2 are now LIVE**, because the deploy went out before they were resolved. Neither
is a defect introduced by the split — both are pre-existing copy the split *propagated into more
places*. Exact locations below so the fix is one pass, not a hunt.

### Flag 1 — the banned word "gig", 8 occurrences, 6 of them one title

`A gig you'll actually dig` is the post title. The slug already avoids it
(`blog-a-job-you-ll-actually-dig.html`), but a post page repeats its own title in five places, and
other posts link to it by title:

| File | Line | What it is |
|---|---|---|
| `blog-a-job-you-ll-actually-dig.html` | 12 | `<title>` |
| " | 18 | `og:title` |
| " | 26 | `twitter:title` |
| " | 38 | JSON-LD `BlogPosting.headline` |
| " | 87 | JSON-LD `BreadcrumbList` item name |
| " | 108 | `<h1 class="post-title">` |
| `gopher-blog.html` | 147, 431 | index JSON-LD stub + teaser card title |
| `blog-worker-centric-way-to-earn.html` | 156 | Related-reading link text |
| `blog-refer-yourself.html` | 154 | Related-reading link text |

**A retitle clears every row above in one edit** (regenerate from `meta.py` + the card title).
The slug can stay as it is, so no URL changes and no redirect is needed.

**Two body sentences are separate and survive a retitle** — they are the author's prose, not the
title: `blog-a-job-you-ll-actually-dig.html:128` *"Looking for a flexible gig you can do on your own
time…"* and `:138` *"That's a gig worth digging."* Plus one unrelated use,
`blog-the-marketplace-your-community-runs-on.html:142` *"not anonymous gig accounts"* — arguably the
legitimate one, since it names what Gopher is not.

### Flag 2 — "background-checked" where the Style Guide says identity-verified

⚠️ **Only three lines are actually wrong.** Two posts already state the model correctly and must NOT
be swept:

| Correct — leave alone | |
|---|---|
| `blog-service-provider-deals.html:201` | "Every Gopher starts as **Standard**, identity verified through Stripe… **Elite** adds a clean criminal background check" |
| `blog-the-marketplace-your-community-runs-on.html:124, 142` | "identity-verified… Elite and Elite+ Gophers add a clean background check on top" |

| Wrong — implies every Gopher is background-checked | |
|---|---|
| `blog-on-demand-local-workforce.html:135` | "set a fair price, and **background-checked local Gophers** claim it" |
| `blog-age-restricted-deliveries.html:179` | step 2 of the how-it-works strip: "**A background-checked Gopher** accepts it." |
| `blog-a-marketplace-seniors-can-trust.html:173` | "**Trusted & safe** — background checks, real ratings, and verified identities" |

⚠️ **The split widened the seniors one specifically.** Takeaways and FAQ answers are derived from the
post's own words, so that sentence is now repeated in two more places on the same page — and one of
them is schema-marked, which is exactly the text an answer engine lifts:

- `blog-a-marketplace-seniors-can-trust.html:162` — the Key takeaways box
- `blog-a-marketplace-seniors-can-trust.html:111` — a `FAQPage` `acceptedAnswer`

So the seniors page states it **three times**, once in structured data. Fixing line 173 without 162
and 111 leaves the schema contradicting the page.

**Recommended wording**, matching the two posts that are already right: *"identity-verified, with
real ratings — and Elite and Elite+ Gophers add a clean background check on top."*

### Flag 3 — ⚠️ WITHDRAWN. The premise was false; I inherited it and repeated it.

The brief said `gopher-services.html` is *"a 392 KB / ~45k-word hub with the same one-URL problem"*
and this session repeated that to the owner twice, including an offer to go and split it. **Measured
first-hand on 2026-09-16, it is not true:**

| Claim | Measured |
|---|---|
| "~45k words" | **1,091 visible words** |
| "same one-URL problem" | it links **107 service leaf pages, every one of which exists** |
| implied duplicate content | **0 of 36 distinctive leaf sentences** appear on the hub |
| implied missing structure | **107 / 107 leaves already carry JSON-LD** |

**`gopher-services.html` is already the pattern the blog was just moved to** — a hub linking to one
page per item, each leaf with its own schema. It is the model the brief itself cited, not a copy of
the problem. **Splitting it would have been work on a false premise.** Do not do it.

The 392 KB is real, but it is **weight, not words**: 78.5% of the file is one inline `<script>`, and
that is a different finding — see §12.

*The rule this breaks: a second-hand claim written into a doc without inspecting it yourself is the
same failure as citing a ticket instead of a doc. The size figure was the tell — 392 KB with no
base64 was never going to be 45,000 words of prose.*

### Flag 4 — ⚠️ the brief's own flag 4 is STALE, and was NOT applied

The brief says `how-it-fits` and `marketplace` use brand tiles and must fall back to
`og-default.jpg`. **They do not.** Both carry real photos (`refer-app.webp`, `community.webp`), and
both use their own image for the OG card. **No post falls back to the default card.** The
`.brandtile` / `.hero-tile` CSS survives in `gopher-blog.css` but is now referenced by no blog page.

---

## 5. Deploy — DONE, `2bf8ecd`, content-verified on both hosts

The owner ran `scripts/deploy.sh --push --allow-dirty` himself on 2026-09-16, before reading the
flags in §4. 22 files shipped: the 19 that are this work, plus the 3 riders described below.
Rollback point: **`99f9217`**.

### What was checked on the LIVE sites, by string, cache-busted

Run on **both** `https://johncnewbury.github.io/Gopher-Marketplace/` and
`https://gophergo.io.customers.tigertech.net/preview/` — never on bare `gophergo.io`, which 301s and
reads as a false failure. Script: `blogsplit/live_verify.sh`.

| Checked | Result on BOTH hosts |
|---|---|
| `assets/css/gopher-blog.css` — the highest-consequence file, since all 15 pages depend on it | **22,168 bytes, header comment and post-page rules both present** |
| All 14 post pages | **200 with the right unique `<title>`**, each containing `Key takeaways`, `BlogPosting`, `BreadcrumbList`, `Related reading`, and a canonical equal to its own URL |
| `FAQPage` schema on the five posts that carry it | **live on all five** |
| `gopher-blog.html` | shim present, `Blog` JSON-LD present, feed link present, **14 `<article>` teasers, zero `<details>` post cards** (bodies really did move out) |
| `feed.xml` | **RSS 2.0, 14 `<item>`s** |
| `sitemap.xml` | **14 blog rows, `gopher-blog.html` row preserved** |
| `gopher-go.html` | link now points at `blog-refer-yourself.html` |

**Fragment shim, driven against the LIVE site** in headless Chrome (not just the local copy):
`#service-providers`, `#a-gig` and `#restaurant` each land on the right post page with the right
canonical. All 14 were verified locally before deploy.

**Still not run, still owner-optional:** Google's Rich Results Test. Now that the pages are live it
takes a URL — worth one pass on
`https://gophergo.io/blog-service-provider-deals.html` to confirm the FAQ rich result is eligible.

---

## 7. What shipped that this session did not own

### ⚠️ Three rider files from another session — now PUBLIC

The deploy reads the **working tree**, so it ships everything in `Final/`, not "my change". Between
this session's first dry run (10:46) and its last (11:15), another session added three
privacy-policy files to `Final/` — **the rider set grew while this work was being verified**, which
is why a dry-run file list is only as fresh as the moment it ran. All three went live in `2bf8ecd`:

| File | How it got there | Was live before | Is live now |
|---|---|---|---|
| `gopher-privacy-policy-stores.md` | **committed** `2398736`, 10:45, *"Update Privacy Policy for App Store and Play Store submission"* | 404 both hosts | **200 both hosts** |
| `gopher-privacy-policy-elementor.txt` | untracked, 10:49 | not on `main` | **200 both hosts** |
| `gopher-privacy-policy-elementor-html.txt` | untracked, 10:57 | not on `main` | **200 both hosts** |

Committing one did not hold it back — standing rules §3, *"a committed file ships on the next push by
anyone."* This is that rule firing, on schedule.

**Assessed after the fact, and the exposure is benign:**

- All three are the **August 2026 privacy policy** in three renderings (store-ready Markdown, an
  Elementor paste source, and an Elementor HTML paste source). Privacy policy text is public by
  nature.
- **No secrets, no internal notes, no draft markers.** The only address in any of them is
  `support@gophergo.io`, which is already public.
- **Not linked from any page and not in `sitemap.xml`**, so they will not be crawled from the site
  and do not compete with `gopher-privacy.html` in search.
- A `.md` / `.txt` on Pages renders as **plain text**, not a formatted page. Usable as a store
  privacy-policy URL, but it will look unstyled to anyone who opens it.

**No action is required. Two are worth a decision** by whoever owns the store-release lane: the two
`*-elementor*.txt` files are *paste sources* for building the WordPress page, not documents meant to
be read at a URL. If they should not be public, delete them from `Final/` and redeploy — a deploy
removes them, because `rsync --delete` mirrors the folder.

### On reading the dry run

22 files shipped: the 19 that are this work (14 posts, `feed.xml`, `gopher-blog.css`,
`gopher-blog.html`, `gopher-go.html`, `sitemap.xml`) plus the 3 riders. Confirmed independently by
hashing every file in `Final/` against `origin/main`, **because the script's own diffstat display is
`tail -20` and elides** — at 20 files it had already silently dropped `assets/css/gopher-blog.css`
from the display while still counting it in the total. Read the count, not just the rows.

### Rollback, if ever needed

One deploy from `99f9217`. The 14 new URLs 404 again, `gopher-blog.html` returns to the collapsing
single page, the feed disappears, and the three rider files go with it. Nothing else on the site
depends on any of it; the only non-blog file touched is a single `href` in `gopher-go.html`.

---

## 6. Not committed

Nothing here is committed on `feature/deals-google-maps-audience`; the brief said not to without the
owner asking. `.claude/launch.json` gained a `blogsrv` entry (port 8531) serving a scratchpad copy of
`Final/` — that file is not shipped by the deploy.

---

## 8. Round two — built and verified, NOT pushed

Three owner instructions, 2026-09-16, after the first deploy went out:

1. *"fix flag 2"*
2. *"retitle the gig post if safely recommended"*
3. *"[the map CTA] is the absolute most impactful thing on the page and … it's almost hidden. That
   should be higher up the page and definitely change the 'Open the map →' to something more
   enticing to click. That is where I want visitors to end up."*

### 8.1 Flag 2 — the verification model, corrected in five places

| File | Was | Now |
|---|---|---|
| `blog-on-demand-local-workforce.html` | "background-checked local Gophers claim it" | "**identity-verified** local Gophers claim it" |
| `blog-age-restricted-deliveries.html` | step 2: "A background-checked Gopher accepts it." | "An **identity-verified** Gopher accepts it." |
| `blog-a-marketplace-seniors-can-trust.html` body | "Trusted & safe — background checks, real ratings, and verified identities" | "Trusted & safe — **verified identities and real ratings, with a clean background check on Elite and Elite+ Gophers**" |
| " Key takeaways bullet | same claim, restated | same correction |
| " `FAQPage` `acceptedAnswer` | same claim, **in structured data** | same correction |

The last two are the ones the split had widened: the seniors page was stating it three times, once
where an answer engine would lift it. The two posts that already described the model correctly
(`blog-service-provider-deals.html`, `blog-the-marketplace-your-community-runs-on.html`) were
deliberately left alone.

### 8.2 Flag 1 — retitled, and it was safe

**"A gig you'll actually dig" → "A job you'll actually dig".**

**Why it is safe:** the slug does not change. The file is still
`blog-a-job-you-ll-actually-dig.html` — which is what the slug said all along — so **no URL moves,
no redirect is needed, no inbound link breaks, and the `#a-gig` fragment shim is untouched.** The
URL was live for roughly one hour before the retitle, so there is no accumulated ranking on the old
title to protect. The pun survives: "dig" is the Gopher joke, and it was never the banned word.

Changed in 12 places, all of them the same string: the post's `<title>`, `og:title`,
`twitter:title`, JSON-LD `headline`, breadcrumb name and `<h1>`; the index's `Blog` JSON-LD stub and
its teaser card; the two Related-reading links that name the post; the `feed.xml` item title; and a
stale HTML comment.

⚠️ **Two body sentences were also changed, and this went one step beyond the literal instruction —
flagging it rather than burying it.** A retitle alone would have left the banned word twice in the
prose of the very post being retitled, which is a half-fix:

- "Looking for a **flexible gig** you can do on your own time…" → "Looking for **flexible work** you
  can do on your own time…"
- "That's a **gig** worth digging." → "That's a **job** worth digging."

Both are one-word swaps that keep the voice. Revert them if you would rather keep the author's
original wording.

**Deliberately NOT changed:** `blog-the-marketplace-your-community-runs-on.html` — "real,
identity-verified people, **not anonymous gig accounts**". That is the one legitimate use: it names
what Gopher is not. **"gig" is now down from 8 occurrences to 1.** (Two further matches exist in
`gopher-blog.html` as the `a-gig` element id and shim key — identifiers, which the Style Guide
exempts, and changing them would break the old fragment links.)

### 8.3 The map CTA — there was a real defect behind the owner's instinct

**The button was invisible.** `.cta-card.navy` is `background:#002461`. `.btn--navy` is
`background:#002461`. **The button was the exact same colour as the card it sat on**, so it rendered
as plain white text with no button shape at all. That is why it did not "scream". Measured, not
guessed: computed `backgroundColor` was `rgb(0, 36, 97)` for both.

`blog-gopher-marketplace-on-one-page.html` was the **only** page in the set pairing those two
classes. The other two navy CTA cards (`blog-on-demand-local-workforce.html`,
`blog-worker-centric-way-to-earn.html`) already use `.btn--primary`, which is green.

**Three changes:**

| | |
|---|---|
| **Contrast** | `.btn--navy` → `.btn--primary` on that card. Now `rgb(51, 217, 117)` green on `rgb(0, 36, 97)` navy, matching the other two navy cards. |
| **Placement** | A new `.map-lead` invitation band sits **directly under Key takeaways**, at **34% down the page** instead of 64%. The whole band is the link, so the tap target is the card rather than just the button. |
| **Copy** | Band button: **"Explore the map →"**. End-of-post card: **"Open the map →" → "Explore the interactive map →"**. Band headline: "See your whole neighborhood on one map". |

The page now carries **two** links to `gopher-marketplace.html` — one high, one at the close —
where before it had one, at the bottom, effectively invisible.

⚠️ **A layout bug was caught and fixed during verification:** the band's copy block was given a fixed
`max-width:430px`, which plus the button overflowed the 760px column by a few pixels and wrapped,
leaving the right half of the band empty. Changed to `flex:1 1 320px`. Band height went 258px → 179px
and the button now sits to the right of the copy. Also note the probe reports the band's
`backgroundColor` as `rgba(0,0,0,0)` — that is correct and not a bug: the band is a
`linear-gradient`, which is a `background-image`, not a `background-color`.

### 8.4 Verification of round two

| Check | Result |
|---|---|
| Paths / exact case | **575 references, 0 failures** (one more than before — the new band link) |
| JSON-LD parse + keys | **0 failures** |
| schema.org validator, 5 pages incl. every changed one | **0 errors** |
| Banned words | **"gig" 8 → 1**; the remaining `platform`, `users`, `unlock` are untouched pre-existing prose |
| Word-count parity | **0 failures.** Every deliberate delta is now declared in `verify.py`'s `EXPECTED_DELTA` rather than the check being loosened, so an *undeclared* drift still fails: seniors `+8`, a-gig `−1`, how-it-fits `+1`. |
| `wordCount` in JSON-LD | refreshed on all three changed posts (309→310, 308→316, 232→231) |
| Render, 1200px and 430px | header once, one footer, one H1, no horizontal overflow, images load |
| Button-on-its-own-card colour clash | **none** — asserted programmatically, not by eye |

### 8.5 Shipped — `11927d7`, verified live on both hosts

Dry run was **10 files, all of them this work, no riders**: `assets/css/gopher-blog.css`, the 7
changed post pages, `gopher-blog.html`, `feed.xml`. Owner pushed it.

**Live content verification, both hosts, cache-busted** (`blogsplit/live_verify2.sh`) — every check
asserts the new string is present **and** the old string is gone, because a present-only check
passes against a stale cached copy:

| | GitHub Pages | TigerTech |
|---|---|---|
| retitle in `<title>`, JSON-LD headline, H1, index teaser, feed item, both related-reading links | ok | ok |
| old title absent everywhere | ok | ok |
| both reworded body sentences | ok | ok |
| connect / age-restricted / seniors wording, incl. the seniors takeaway and `FAQPage` answer | ok | ok |
| old "background-checked" wording absent | ok | ok |
| `.map-lead` band present and linking the map; band headline and button copy | ok | ok |
| end card: green button, new copy, **no navy button inside the navy card** | ok | ok |
| 2 links to `gopher-marketplace.html` on the page | ok | ok |
| stylesheet carries `.map-lead` and the `flex:1 1 320px` wrap fix | ok | ok |

**Fragment shim re-checked against the LIVE site** after the retitle: `#deals-for-merchants`,
`#service-providers`, `#a-gig` and `#seniors` all land on the right post. `#a-gig` still works — the
slug never changed, only the rendered title.

⚠️ **One live check was wrong and was corrected, not the page.** It asserted `btn btn--navy` was
absent from the whole marketplace-explainer page. It failed on both hosts — because the **shared
closing band** legitimately uses `.btn--navy`, and `.band` is GREEN, so that button is correct and
appears on all 15 pages. Scoped to the CTA card, the check passes: the card contains only
`btn btn--primary`. A page-wide absence assertion for a class that has a legitimate use elsewhere
manufactures a false regression.

```bash
cd "/Users/johnnewbury/Desktop/All New Gopher/Documentation/Claude Code Review:Cleanup/Code" && scripts/deploy.sh --push --allow-dirty -m "Blog: correct the verification model, retitle the Go post, and surface the marketplace map CTA"
```

**Risk** — low and contained. No URLs move, so nothing 404s and no redirect is needed. The only
shared file is `gopher-blog.css`, and the change to it is **additive** (a new `.map-lead` block plus
one property on a class nothing else uses), so the other 14 pages cannot restyle. Worst case is that
the new band looks wrong on one page.
**Reward** — the page's most important link stops being invisible and moves from 64% to 34% down the
page; the banned word drops from 8 places to 1; three posts stop overstating what verification every
Gopher carries, including one instance that was being served as structured data.
**Undone by** — one deploy from `2bf8ecd`, which is now the previous good state.

---

## 9. ⚠️ `build.py` is spent — do not re-run it

`blogsplit/build.py` was a **one-shot migration** out of the old single-page blog. It reads the 14
post bodies from `gopher-blog.html`, which no longer contains them. **The post pages are now the
source of truth for post copy.** Re-running it against the snapshot in `blogsplit/orig/` would
regenerate the pages from pre-split copy and silently discard every fix in §8. Edit the post pages
directly, as `fix_flags.py` does — it asserts an expected hit count for every replacement, so a miss
fails loudly instead of doing nothing.

---

## 10. ⚠️ The fragment-shim harness produces false negatives — read this before trusting a run

Across four runs of `render.py` the shim section reported **0, 1, 2 and 0** failures on the *same
unchanged shim code*. That is a harness defect, and it nearly got reported as a broken redirect.

**The mechanism.** The probe is a `<script>` appended to the TARGET page that waits for `load`, then
300ms, then writes a marker into the DOM; Chrome's `--dump-dom` is taken inside a 6s virtual-time
budget. On the two largest posts (`blog-service-provider-deals.html` ~22 KB with 8 images,
`blog-merchant-deals-skip-the-delivery-app-cut.html` ~20 KB with 6) that window is sometimes missed.
**The marker's absence then reads identically to "the redirect never happened."**

**How it was settled — with an independent signal, not a retry count.** `shim_retest.py` now also
reads the returned document's own `<link rel="canonical">`. That is emitted by the page itself and
owes nothing to the injected script. Result: **10/10 across the two cases, with the probe absent
every single time and the canonical correct every single time.** So the redirect had always worked;
only the instrument was late.

**The rule this is an instance of:** *a probe that fails to report is not evidence the thing under
test failed.* Prove the probe before believing its negative. Where a page can testify about itself —
a canonical URL, a title, a heading — prefer that over anything injected.

Verified independently on the live site after both deploys, using canonical rather than the probe.

---

## 11. Canonicals point at `gophergo.io` by design — SETTLED, do not re-raise

Every page in `Final/` — old and new — canonicals to `https://gophergo.io/<file>.html`, which today
301s to the WordPress site's homepage. The prototype itself is served at GitHub Pages and the
TigerTech preview.

**This is intentional and the owner already knows it.** Owner, 2026-09-16, when a session raised it:
*"I know they're different. I wanted the new one fixed. disregard the live blog."* The canonicals
describe where the marketplace site is going to live; the prototype's own `robots.txt` says the same
thing (*"effective once the site serves at the domain root"*). The brief specified these canonicals,
and `food-delivery.html` has carried the identical shape since long before this work.

**It is not a blocker on prototype work and must not be reported as one.** The scope of this task was
the marketplace site's blog, and that is what was built and verified. Nothing about the WordPress
site was in scope.

Two practical notes only:

- **Share prototype URLs on the Pages or TigerTech host**, never the bare `gophergo.io/<file>` form —
  that 301 reads as a false failure.
- **Do not submit `Final/sitemap.xml` to Search Console** while the prototype is served off-root.
  That is a mechanical consequence, not a finding worth raising again.

---

## 12. Surfaced, NOT started — five live pages each inline a drifted copy of the AI engine

Found 2026-09-16 while checking flag 3. **Not acted on: it is outside this task, it touches the
homepage and Gopher Request, and it needs the owner's decision and a proper scoping pass first.**

`assets/js/gopher-ai-engine.js` exists as an external, cacheable file (301 KB). **Five live pages
ignore it and inline their own copy instead** — and the copies have drifted apart:

| Page | Page size | Inline engine | sha256 (12) |
|---|---|---|---|
| `assets/js/gopher-ai-engine.js` | — | 300,921 | `1600b0c7a0c4` |
| `index.html` | 455 KB | 301,846 | `95f61dfe2883` |
| `gopher-services.html` | 392 KB | 301,846 | `95f61dfe2883` |
| `gopher-faqs.html` | 394 KB | 301,895 | `803123d97367` |
| `gopher-iq-sandbox-standalone.html` | 510 KB | 302,500 | `f1609d6db0b7` |
| `gopher-request.html` | 1.84 MB | 403,730 | `9001bccfa305` |

**Four distinct versions of the engine are live, and the external file matches none of them.**

**Why it matters:** a fix to the AI engine today has to be applied in five places, and nothing says
which copy is canonical — the external file's name makes it *look* canonical while being used by
nobody. That is the same shape as a stale doc: authoritative-looking and wrong. Secondary cost:
~300 KB re-downloaded per page instead of cached once.

⚠️ **This is NOT a mechanical swap to `<script src=…>`.** The copies differ, so a swap would change
behaviour on the homepage and on Request. It needs a diff of the four versions, a decision on which
is canonical, and a real verification pass per page. CLAUDE.md already names the page-weight half of
this under Known issues; the *divergence* half is new here.

**Recommendation: scope it as its own piece of work with the owner, do not fold it into anything.**

---

## 13. The two Elementor paste sources were removed from the site — `0e5749e`

Owner, 2026-09-16: *"remove the two txt files."*

`Final/gopher-privacy-policy-elementor.txt` and `-html.txt` were **moved to `docs/handoff/`, not
deleted.** They are the only copies on disk and their purpose is to be pasted into Elementor, so they
are still to hand; the deploy drops both public URLs either way. Both are committed (`61b3124`,
`eea66f1`), so the content is recoverable regardless.

`Final/gopher-privacy-policy-stores.md` was **left live** — the owner named only the two `.txt`
files, and that one is the store-submission URL, which plausibly needs to stay reachable.

Dry run and deploy were **2 files, both deletions, nothing else**.

**Verified after the push, on both hosts:**

| | GitHub Pages | TigerTech |
|---|---|---|
| `gopher-privacy-policy-elementor.txt` | **404** | **404** |
| `gopher-privacy-policy-elementor-html.txt` | **404** | **404** |
| `gopher-privacy-policy-stores.md` (kept) | 200 | 200 |
| `assets/css/gopher-blog.css`, a post page, the retitled post, the index, `feed.xml`, `sitemap.xml` | all 200 | all 200 |

⚠️ **Worth knowing: a DELETION propagates to TigerTech, not just a publish.** The two hosts reach the
site by different mechanisms — Pages serves `main` directly, TigerTech is fed by an FTPS workflow —
and "the file uploaded" and "the file was removed" are different operations. This was checked
explicitly rather than assumed. It held: both hosts returned 404.

### Deploy history for this work

| Deploy | What |
|---|---|
| `99f9217` | state before any of this — rollback point for the whole split |
| `2bf8ecd` | the blog split: 14 post pages, feed, shared CSS, teaser index, sitemap rows |
| `11927d7` | flag 2 corrected, the Go post retitled, the marketplace map CTA rebuilt |
| `0e5749e` | the two Elementor paste sources removed from the published site |
