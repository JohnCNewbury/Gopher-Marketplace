# Gopher Marketplace — Developer Handoff Brief

> ## ⚠️ READ FIRST: this is a prototype, not production code
>
> Everything in this repository is an **AI-generated static HTML prototype** — a
> **visual and product blueprint**. It exists to **communicate intent** (look, flow,
> copy, and feature scope) to the human developer who will perform a **production
> rebuild**. **It must NOT be shipped as production code.**
>
> Every "working" action — sign in, request a service, pay, hire, message, claim a
> deal — is **faked in the browser**. There is **no backend, no database, no auth, and
> no real payments**. Data lives in in-memory JavaScript and disappears on page reload.
> Treat the pages as a clickable spec, not as a system to extend.

### 🧹 State of cleanup — updated 2026-06-26

**Done:** image externalization — **4.9 MB** of content images + **16.66 MB** of shared
header/footer chrome (logos/badges: 862 inline base64 copies → 7 cached files) moved out
of the HTML; honesty copy fixes in `gopher-request.html`; handoff-doc page-count
reconciliation to the verified **133 files / 107 service-detail** after a duplicate page
was deleted.
**Verified clean:** **zero** inline chrome base64 remains site-wide (sha256-checked); all
page/component counts re-verified against the filesystem, not memory.
**Outstanding (parked, by reason):** next base64 batch — page-specific rasters on
deals/connect/etc. (in scope, lower yield); the 8 hero clips (**blocked** — videos must be
produced, see [missing-files.md](missing-files.md)); the "verify visually" image rows + two
downgrades (**human review by design**, see [asset-match-report.md](asset-match-report.md));
the inbound-link-graph counts in [page-inventory.md](page-inventory.md) (**cosmetic** re-scan).
Detail: [chrome-dedup-manifest.md](chrome-dedup-manifest.md) and
[base64-image-manifest.csv](base64-image-manifest.csv).

_This brief is the front door to `docs/handoff/`. Skim it, then dive into the linked
documents for detail. All handoff docs are dated 2026-06-24._

---

## 1. What Gopher Marketplace is meant to be

Derived from the actual page content, Gopher is pitched as **"The Human Services
Marketplace"** — neighbors and vetted local pros helping neighbors get things done, for
a price the customer sets. It has three sides:

- **Gopher Request** (`gopher-request.html`) — the customer side: request any service
  ("Hire a Gopher"), set your own offer, pick a provider by name/rating, track them.
- **Gopher Go** (`gopher-go.html`) — the provider side: become a vetted service provider,
  with verification **tiers** (`gopher-tiers.html`) and **TrustShield** identity
  verification (`gopher-trustshield.html`).
- **Gopher Connect** (`gopher-connect.html`) — the business side: on-demand workforce for
  companies, with paid plans.

Supporting surfaces: a **Services hub** (`gopher-services.html`) organizing **107
service-detail pages** across **7 categories** (Delivery & Errands, Home Services, Yard &
Outdoor, Moving, Junk Removal, Hourly & Day Labor, Ride Sharing); a **Deals** product for
merchants (`gopher-deals.html`) and customers (`gopher-customer-deals.html`); a **"gopher
iQ"** AI-style search assistant; plus blog, FAQs, our-story, contact, and legal pages.

See the full map: **[page-inventory.md](page-inventory.md)** (133 files = 19 core/brand/
legal + 107 service-detail + 7 components/fragments, with titles, sizes, inbound links,
a Mermaid sitemap, and duplicate analysis).

## 2. Deployment facts

- **Hosting:** GitHub Pages — **static only, no server-side anything.**
- **Live URL (subdirectory):** https://johncnewbury.github.io/Gopher-Marketplace/
- **Site root:** the `Final/` folder (`Final/index.html` is the homepage).
- **Two rules that cause real bugs** (because of the subdirectory + Linux hosting):
  1. **All paths must be relative**, never root-absolute — a leading `/` resolves to the
     domain root and 404s.
  2. **File references are case-sensitive** — must match on-disk casing exactly.
- No build step, no framework, no package manager — each page is self-contained HTML with
  inlined CSS/JS (many pages are multi-megabyte due to base64-embedded media).

## 3. Known issues (with detail docs)

| Area | Status | Detail |
|---|---|---|
| **Secrets / sensitive data** | ✅ Clean — none found | [secrets-scan.md](secrets-scan.md) |
| **Broken internal references** | 🟡 22 of 45 fixed; 23 remain (mostly intentional demo code + CDN-resolved icons) | [broken-references.md](broken-references.md) |
| **Files still to create** | 8 hero-clip videos (+1 optional shared-header script) | [missing-files.md](missing-files.md) |
| **Unfinished / fake JS & forms** | Almost everything is faked; 1 real submission site-wide | [unfinished-functions.md](unfinished-functions.md) |
| **Structural duplication** | Header/footer copy-pasted into ~128 pages; 107 service pages are one cloned template | [component-structure.md](component-structure.md) |
| **Page map / orphans / duplicates** | 133 pages catalogued; the stray `e-waste-removal_1.html` duplicate has been deleted | [page-inventory.md](page-inventory.md) |

Other expected prototype traits (documented in `CLAUDE.md`): multi-megabyte base64-bloated
pages, duplicate element IDs, and demo-only JS (`bookService`, `analyzeUpload`,
`contactSupport`). These are artifacts of the prototype, not defects to patch in place —
the rebuild resolves them structurally.

## 4. What the developer must build (the backend)

The prototype only **fakes** these. Each was **deliberately left for the human
developer** — AI work was intentionally kept away from payments, auth, database,
matching, and security (per `CLAUDE.md`). Full per-function scope is in
[unfinished-functions.md](unfinished-functions.md); the capability summary:

| Capability | What's faked today | What to build |
|---|---|---|
| **Payments / billing** | Stripe upgrade/downgrade/cancel just `console.log('(simulated)')`; "add payment method" is a stub; bids update memory only | PSP tokenization, Stripe subscriptions, deal/bid auction settlement |
| **Authentication / accounts** | Logins match hardcoded demo-user arrays; **SMS OTP accepts any 6 digits**; provider application ends in a fake success screen | Real signup/login, SMS OTP, provider application + verification tiers |
| **Database / persistence** | Requests, deals, businesses, messages all push to in-memory objects and vanish on reload | A real data layer + APIs (requests, deals, accounts, scheduling) |
| **Matching** | Worker "acceptance" auto-fires on a 3-second timer; matching is mock data | The matching engine that connects requesters and Gophers |
| **File upload / processing** | All uploads are local `FileReader` data URLs; `analyzeUpload()` simulates a delay and returns a stub | Upload endpoint + storage, ID verification, document/vision analysis |
| **Messaging / support** | Inbox sends fire a fake `setTimeout` auto-reply; feedback shows "done" with no POST; contact form opens `mailto:` | Real messaging/inbox, feedback + support endpoints |

> **The only real network call in the entire site** is the merchant/worker
> pre-registration form in `gopher-deals.html`, which POSTs to a Google Apps Script /
> Google Sheet. Everything else is front-end choreography.

## 5. Recommended rebuild approach

Move from 133 self-contained HTML pages to a **component/partials architecture** with a
real backend. Full breakdown (component tree, CSS/JS extraction) is in
[component-structure.md](component-structure.md).

**Front-end:** a component framework (React/Vue/Svelte) or a templating/partials system
(Astro, 11ty, Nunjucks, etc.). Render shared chrome once; drive the 107 service pages
from **one template + a data file**; extract shared `tokens.css` / `base.css` and shared
`header.js` / `footer.js`. This also kills the base64-bloat and duplicate-ID problems.

**Back-end:** stand up the capabilities in §4 behind an API the static-style front-end
calls. Keep all secrets server-side (see §6).

### Suggested order of work

1. **Scaffold the new app** (framework + routing) and extract **header + footer** into
   shared components/partials — touches ~128 pages, biggest immediate win.
2. **Collapse the 107 service pages** into one `ServiceDetailPage` template + a
   service-data file; extract shared CSS (`tokens`/`base`/`service-detail`).
3. **Stand up auth + accounts** (real login/signup, OTP) — gates everything user-specific.
4. **Add the database/persistence layer** and wire the request flow to it (replace the
   in-memory `DASH_DATA`).
5. **Integrate payments** (PSP tokenization, Stripe subscriptions, bid settlement).
6. **Build the matching engine** connecting requesters and Gophers.
7. **File upload/processing** (storage, ID verification) and **messaging/support**.
8. **Port remaining content pages** (legal, blog, FAQs, 101 tutorials) and finish media
   ([missing-files.md](missing-files.md): the 8 hero clips).

Doing auth → database → payments → matching in that order means each layer has the one
beneath it to build on. Each backend area maps to a discrete front-end form module, so
they can be wired one at a time.

## 6. Do NOT regress — security & privacy boundaries

The prototype is currently clean ([secrets-scan.md](secrets-scan.md)). Keep it that way
as real integrations land:

- **Never commit a secret.** This is a public site + public git history. API keys, OAuth
  client secrets, DB connection strings, and cloud credentials live **only** in
  server-side env vars / a secrets manager — never in client code. Add a pre-commit
  scanner (`gitleaks` / `trufflehog`).
- **Front-end gets publishable keys only** (e.g. Stripe `pk_…`, a Firebase web config),
  and even those should be scoped/referrer-restricted.
- **Do real auth server-side.** The demo's "accept any 6-digit OTP" and hardcoded
  demo-user logins are placeholders — replace with verified, server-validated auth.
  Never trust client-side checks for access control.
- **Handle payment data through a PSP only.** Never store or transmit raw card/PAN data
  yourself; tokenize via the processor. (The prototype already avoids persisting PANs —
  preserve that.)
- **Protect PII and uploads.** Real IDs, selfies, addresses, and contact info must be
  transmitted over TLS to access-controlled storage — not held as client-side data URLs.
  Apply least-privilege access and retention limits.
- **Keep paths relative and case-correct** so nothing silently breaks on the
  subdirectory + Linux host (see §2 and [broken-references.md](broken-references.md)).
- **Don't reintroduce the fake data as if it were real** — the demo emails, seeded
  accounts, hardcoded promo codes, and simulated successes are illustrative only.

---

### Handoff document index

- **[README.md](README.md)** — this brief (start here)
- **[page-inventory.md](page-inventory.md)** — every page: title, purpose, size, links, sitemap, duplicates
- **[unfinished-functions.md](unfinished-functions.md)** — every stubbed/fake function & form, grouped by backend capability
- **[component-structure.md](component-structure.md)** — repeated UI blocks + reusable-component rebuild plan
- **[broken-references.md](broken-references.md)** — link/asset audit (fixed vs. remaining)
- **[missing-files.md](missing-files.md)** — files that must be created by hand
- **[secrets-scan.md](secrets-scan.md)** — secrets/sensitive-data scan + remediation rules

_Also see `CLAUDE.md` at the repo root for the working rules used while cleaning up this prototype._
