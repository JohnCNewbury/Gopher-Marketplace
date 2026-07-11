# Gopher Deals — Merchant Agreement + ToS liability hardening (2026-07-11)

Scope: expand Deals liability coverage across the legal surface, add a merchant-facing
agreement, and surface it in the footer site-wide.

## 1. ToS Section 8 (Gopher Deals) — expanded

`Final/gopher-terms-of-service.html`, Section 8. Added **9 subsections** after the existing
ones (numbering untouched — everything is Deals-specific, so no top-level renumber):

- Your Responsibility on Merchant Sites (user 100% responsible for charges/credentials on
  merchant sites; Gopher never touches payment info)
- No Guarantee of Availability, Pricing, or Endorsement
- Regulated & Age-Restricted Deals (merchant owns compliance; ties to §9 for delivery)
- **Merchant Fulfillment & Deals Privileges** — revocable privilege; verified non-fulfillment
  → loss of privileges
- Merchant Representations, Warranties & Indemnity
- Merchant Brand & Content License
- Deal Payment Disputes & Chargebacks
- Leaving Gopher; Merchant Data & Privacy Practices
- Deals Disclaimer & Limitation of Liability (references §31 cap + §30 arbitration rather
  than duplicating them)

### ⚠️ Deliberate design decision (see inline `<!-- ATTORNEY REVIEW -->` comment)
The "Deals Privileges" trigger is **verified merchant non-fulfillment**, NOT "the customer
decided not to pay their Gopher." Tying a merchant penalty to the customer's payment choice
would conflict with §16/§31 (a Gopher who did the work is owed) and is legally weaker. The
text explicitly preserves: *merchant non-fulfillment does not relieve a user of amounts owed
to an independent Gopher for work actually performed.* Do not reframe this without counsel.

## 2. New page — `Final/gopher-merchant-agreement.html`

The document a merchant accepts when submitting a Deal. 27 sections, built on the ToS chrome
(same CSS, shared header via `gopher-header.js`, inline footer, sticky TOC, scroll-spy,
auto "Last Updated"). Binds merchants to the Section 8 positions: role-is-listing-only,
merchant reps/warranties, fulfillment & refunds, no-transactional-fee, merchant taxes,
brand/content license, regulated-goods compliance, revocable privileges, merchant indemnity,
disclaimers, $100/12-mo liability cap (mirrors ToS §31), NC arbitration + class waiver
(mirrors ToS §30). Cross-linked both ways with the ToS (§8 "Deal Submission & Approval").

### ⚠️ Enforceability depends on an acceptance gate (dev action required)
This agreement only binds a merchant if the **Deal-submission flow presents an explicit
"I Agree" checkpoint linking to it.** There is no built merchant-submission surface in the
prototype today (Deals is Google-Maps/listing only). When that intake is built, it needs a
recorded acceptance step (checkbox + timestamp) referencing this page. Until then the
agreement is published but not contractually accepted by anyone.

## 3. Merchant Agreement link in the footer — site-wide

Added to the **Legal** column in this order: Privacy → Terms of Service → **Merchant
Agreement** → Prohibited List. Two places, because the site has two footer systems:

- `Final/assets/js/gopher-footer.js` (shared component) — 109 pages
- **19 pages with inline, hard-coded footers** — patched individually (index, gopher-deals,
  gopher-connect, gopher-request, gopher-services, gopher-customer-deals, privacy,
  prohibited-list, terms-of-service, our-story, blog, contact-us, faqs, tiers, trustshield,
  merchant-agreement, + the 3 tutorial/101 pages)

Total: **128 footers** now carry the link, verified exactly once each, correct order, no dupes.
The 7 files with no footer (`*-block.html`, `*-markup.html`, `gopher-iq-sandbox-standalone`,
`SETUP-Google-Maps-Steps`, `gopher-header.html`, `refer-card`) are fragments/tools — n/a.

## 4. Why the 19 pages still aren't on the shared footer (the standing gap)

This is the maintenance trap to fix in the rebuild, deferred for two concrete reasons:

**(a) SEO.** The shared footer is injected by JS at runtime, so its nav/footer links are
**not in the server-delivered HTML**. The 19 inline pages are exactly the SEO-critical ones
— homepage, all product/Deals pages, legal, tutorials. Keeping their footer in the raw HTML
was a deliberate choice from the componentization work (G40-315) to avoid an SEO regression
on the pages that matter most. Moving them to JS injection *here* would be a downgrade, not
an upgrade. The production rebuild solves this properly with **server/build-time components**
(one shared source that still renders real HTML) — that gets you both DRY and SEO.

**(b) Content drift — a blind swap would change these pages.** The inline footers are NOT
byte-identical to the component (verified 2026-07-11):
  - Logo asset differs: inline pages use `gopher-logo.svg` (gopher-request uses
    `wp-hero-logo-peek-1.webp`); the component uses `gopher-logo-footer.webp`.
  - Extra social icon: most inline footers include a **LinkedIn** icon the component lacks —
    and they aren't even consistent among themselves (gopher-deals has no LinkedIn).
  So "just point them at the component" isn't free; it first needs a canonical-footer
  decision (which logo? include LinkedIn?), then reconcile the component, then swap all 19.

**Net for pre-handoff:** keeping the footer link in sync across both systems (done here) is
the correct cheap win. Full componentization is correctly a rebuild task because doing it in
the static prototype would regress SEO on the marquee pages. It is a decision + rebuild-tech
task, not a cleanup task.

### Recurring hazard
Any future footer change must be made in **`gopher-footer.js` AND the 19 inline pages**, or
it will appear to work while silently missing the homepage and every product/Deals page.
