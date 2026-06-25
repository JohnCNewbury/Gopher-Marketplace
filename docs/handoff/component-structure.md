# Component Structure & Reuse Plan — Gopher Marketplace

_Generated: 2026-06-24 · **Recommendation document for the production rebuild.** No files were refactored._

The prototype is 134 standalone HTML pages with **no build step and no includes**, so
every shared block — header, footer, design tokens, hero, cards — is **copy-pasted into
each page**. The same header CSS+JS (~123 KB) lives in 126 pages; the footer (~28 KB) in
128; 108 service pages are one template cloned. This document maps the repeated
structures and recommends a component/partial breakdown so the rebuild maintains each
block in **one** place.

> Scope reminder (CLAUDE.md): this is advisory for the rebuild. It does not implement
> payments/auth/database/matching, and nothing here changes the prototype files.

---

## How repetition shows up today

- **Shared chrome is inlined, not included.** The header is an inline
  `<style id="gopher-header-css">` + `<script id="gopher-header-js">` injector (the
  canonical copy is `gopher-header.html`); the footer is an inline `<style>` +
  `<footer class="gopher-footer">` block (`gopher-footer.html`). Both are pasted into
  almost every page. A single edit (e.g. a nav link) must be made 120+ times.
- **108 service pages are one template.** `errand-running.html`, `lawn-mowing.html`,
  `tv-mounting.html`, … share an identical section skeleton (hero → 3 pillars →
  comparison → price → steps → CTA → app badges), differing only in copy and one image.
- **Design tokens + base CSS are duplicated** in every page's inline `<style>` (the
  `:root{ --green:#33D975 … }` block and `.btn`, typography, etc.).
- **The "gopher iQ" engine** (~212 KB of JS) is inlined into 10 pages.

---

## Repeated UI blocks

| Block | What it is | Appears in | Variation |
|---|---|---|---|
| **Global header / nav** | Logo, primary nav, login/menu popovers, mobile drawer/burger; injected by `window.GopherHeader` boot script | **126 pages** | **Very low.** Identical CSS+JS everywhere; the only per-page difference is one config line (`window.GopherHeader = { logo:'request' }`) choosing the logo/brand. |
| **Global footer** | Brand block, link columns, social icons (FB/IG/TikTok/YouTube/Nextdoor/Reddit/X), legal links | **128 pages** | **Very low.** Same markup/CSS; occasional variant (e.g. "solid navy" footer noted in comments). |
| **Design tokens + base CSS** | `:root` color/spacing vars, typography (`Nunito`/`DM Sans`/`Caveat`), `.btn*`, reset | **111 pages** (`--green:#33D975`); fonts preconnect in **129** | **Low.** Token values consistent; base utilities repeat verbatim. |
| **Breadcrumb** (`.crumbs`) | Services / Category / Current trail | **108 pages** (all service pages) | **Low.** Same structure; category label + current page text differ. |
| **Hero section** (service) | Eyebrow, H1 + accent, sub-paragraph, two CTAs, chips, hero photo + handwritten note | **108 pages** | **Low–medium.** Identical layout; copy, chips, and image vary per service. |
| **"Three Pillars" cards** | 3 value-prop cards (icon, H4, paragraph) | **108 pages** | **Low–medium.** Same card grid; icon + copy vary. |
| **Comparison table** (`.ctable`) | "Gopher way vs. X" rows with ✕/✓ cells | **108 pages** | **Medium.** Same row structure; labels and competitor framing vary by category. |
| **Price card** (`.price-card`) | "What you pay" line items + footnote (neutral, no real prices) | **108 pages** | **Low.** Same 3-line structure; item labels vary. |
| **"How it works" steps** | Numbered 1–4 step cards | **108 pages** | **Low.** Same; step copy varies. |
| **Direct-order CTA** (`.order`) | H3 + paragraph + buttons + app badges | **108 pages** | **Low.** Copy varies. |
| **App-store badges** | "Download on the App Store" / "Get it on Google Play" (base64 images) | **119 pages** | **None.** Byte-identical. |
| **Scroll-reveal behavior** | `IntersectionObserver` adding `.in`/`.reveal` on scroll | **114 pages** | **None.** Same snippet repeated. |
| **iQ search bar + engine** | `aiAssistForm` pill, fuzzy KB search, upload analysis, result cards | **10 pages** | **Low.** Same engine inlined (see [unfinished-functions.md](unfinished-functions.md)). |
| **Deals map** | Leaflet map + deals UI | **2 pages** (`gopher-deals`, `gopher-customer-deals`) | **Medium.** Merchant vs. customer variants. |
| **Multi-step forms / wizards** | Request flow, provider application (`proApp`), payment/login/ID modals | request/connect/tiers | **High.** Bespoke per page (see forms inventory in the unfinished-functions doc). |
| **Tutorial ("101") layout** | Step-through walkthrough | **3 pages** (request/go/connect-101) | **Medium.** Same shell, different content. |

---

## Recommended component breakdown

A component framework (React/Vue/Svelte) **or** a templating/partials system (Astro,
11ty, Nunjucks, Jinja, PHP includes) would eliminate nearly all of this. Suggested tree:

```
Layout (HTML shell: <head>, fonts, token CSS, header, footer)
├── <SiteHeader logo="request" />        ← replaces the 126× inlined header
│     ├── <PrimaryNav />
│     ├── <LoginMenu /> (popover)
│     └── <MobileDrawer />
├── <SiteFooter variant="default|navy" /> ← replaces the 128× inlined footer
│     └── <SocialLinks />
│
├── ServiceDetailPage (drives all 108 service pages from data, not 108 files)
│     ├── <Breadcrumb category="…" current="…" />
│     ├── <ServiceHero eyebrow h1 accent sub ctas chips image note />
│     ├── <PillarGrid pillars=[{icon,title,body}] />
│     ├── <ComparisonTable rows=[…] competitorLabel="…" />
│     ├── <PriceCard lines=[…] footnote="…" />
│     ├── <HowItWorks steps=[…] />
│     ├── <OrderCTA heading body backHref />
│     └── <AppStoreBadges />            ← shared, used widely
│
├── Shared primitives
│     ├── <Button variant="primary|ghost|light" />
│     ├── <Chip /> , <Card /> , <SectionHead eyebrow h2 />
│     └── <RevealOnScroll>  (wraps the IntersectionObserver behavior)
│
├── <IqSearch />            ← the "gopher iQ" engine as one component (10 pages)
├── <DealsMap variant="merchant|customer" />   ← Leaflet wrapper (2 pages)
└── Form components: <MultiStepForm>, <ContactForm>, <ProviderApplication>,
      <PaymentMethodModal>, <LoginSignup>, <IdVerifyModal>
```

**The single biggest win:** turn the **108 service-detail pages into ONE
`ServiceDetailPage` template + a data file** (one record per service: name, category,
hero copy, pillars, comparison rows, steps, image). 108 HTML files collapse to 1
template + ~108 small data entries. Category labels/anchors come from a small category
map (the 7 categories already used by `gopher-services.html`).

---

## CSS to extract into shared stylesheets

Move the inline CSS that repeats across pages into a few real `.css` files:

1. **`tokens.css`** — the `:root` design tokens (colors, spacing, shadows) — currently
   duplicated in ~111 pages.
2. **`base.css`** — reset, typography (`Nunito`/`DM Sans`/`Caveat`), `.btn*`, links,
   `.eyebrow`, `.caveat`, `.section`, `.reveal`.
3. **`header.css`** / **`footer.css`** — extract the `#gopher-header-css` and footer
   styles (one file each instead of inlined in 126/128 pages).
4. **`service-detail.css`** — the `.hero`, `.pillars`, `.ctable`, `.price-card`,
   `.steps`, `.order` styles shared by all 108 service pages.
5. **Load Leaflet's CSS from CDN** on the 2 map pages (already done in the prior
   reference-fix pass) rather than inlining it.
6. **Drop per-page `<style>` blocks** in favor of the above + a small page-specific file
   only where genuinely unique (request/connect/deals).

There are already two real CSS files (`gopher-ai-engine.css`, `3-pill-css.css`) — good
precedent; the rest should follow the same pattern.

## JavaScript to extract into shared scripts

1. **`header.js`** — the `bootGopherHeader()` injector (logo config, nav, popovers,
   drawer). This is exactly the extraction the in-repo comment already calls for
   (`gopher-header.html:20` references a future shared `gopher-header.js`). One file,
   loaded everywhere; each page sets `window.GopherHeader = { logo:'…' }`.
2. **`footer.js`** — any footer behavior (mostly static, but keep parallel to header).
3. **`reveal.js`** — the `IntersectionObserver` scroll-reveal snippet (in 114 pages).
4. **`iq-engine.js`** — consolidate the "gopher iQ" engine (currently inlined in 10
   pages and also present as `gopher-ai-engine.js` + the `1-/2-engine-*` fragments) into
   the single canonical module, loaded only where the search bar appears.
5. **`leaflet` from CDN** + a small `deals-map.js` wrapper for the 2 deals pages.
6. **Form modules** — `payment.js`, `auth.js`, `id-verify.js`, `request-flow.js` — these
   are where the backend wiring will live; keeping them as discrete modules makes the
   stubs in [unfinished-functions.md](unfinished-functions.md) easy to replace one area
   at a time.

---

## Priority & impact

| Priority | Action | Why |
|---|---|---|
| **1 — highest** | Header + footer → components/partials + `header.js`/`footer.js` | Touches ~128 pages; one edit instead of 128; biggest byte + maintenance win. |
| **2** | 108 service pages → one `ServiceDetailPage` + data file | Collapses ~108 near-identical files into 1 template; eliminates the largest duplication class. |
| **3** | Extract `tokens.css` + `base.css` + `service-detail.css` | Removes duplicated CSS from every page; centralizes the design system. |
| **4** | `reveal.js` + shared primitives (`Button`, `Card`, `Chip`, `SectionHead`) | Small, high-reuse; quick consistency win. |
| **5** | Consolidate the iQ engine and Leaflet wrapper | Removes the ~212 KB engine from 10 inlined copies; isolates map code. |
| **6** | Form modules (payment/auth/id-verify/request-flow) | Aligns the component split with the backend-capability split, so each integration is scoped. |

**Net effect:** the rebuild goes from ~134 self-contained pages to a handful of layouts +
~20 components + a service-data file, with shared CSS/JS in real files. Also resolves
the prototype's known pain points (multi-megabyte base64-inlined pages, duplicate element
IDs) by rendering shared markup once and referencing external assets.
