# Typography sentence-case scrub + ratings-visibility change — 2026-07-11

Two related pieces of work, both **copy/behavior only** (no logic, data, backend, or
structural HTML changes):

1. **Typography scrub** — standardized casing across the `Final/` prototype per the Gopher
   Style Guide (§12.4: sentence case; title case only for legal + email subjects).
2. **Ratings visibility + post-confirm nav** — in the split-screen live prototype
   (`_prototypes/`), ratings are no longer shown to either party, and the Go app returns
   home after a request is confirmed.

---

## 1 · Typography scrub

### The rule (as applied)

- **Sentence case:** buttons/CTAs, form labels, card & panel titles, eyebrows/kickers,
  tabs/chips, status text, and other in-app microcopy.
- **Kept title case (unchanged):**
  - **Hero / major-header H1–H2** marketing headlines (owner call: "major header, title
    case OK").
  - **Category taxonomy** — e.g. *Home & Indoor Services*, *Yard & Outdoor*, *Skilled Trades
    & Handymen*, *Office & Commercial Cleaning*.
  - **Service names** on the 107 service-detail pages — e.g. *TV Mounting*, *Lawn Mowing*
    (owner call: keep, for parent/child continuity with the categories).
  - **Legal pages** — `gopher-privacy.html`, `gopher-terms-of-service.html`,
    `gopher-prohibited-list.html` (guide permits title case for legal).
  - **Proper nouns preserved everywhere:** Gopher · Gopher Request/Connect/Deals/Go ·
    Connect / Go / Deals (product refs) · Request (capital when it's the *product*,
    lowercase when it's the *action* — "Cancel request", "Edit request") · TrustShield ·
    Pro / Pros / Elite · the Gopher Marketplace · Dashboard (Gopher HQ nickname) ·
    Yardstik · **MY Gophers** emphasis · acronyms (ID, TV, FAQ, SMS, Rx, …). Merchant names
    were blocklisted; "Safe-Guarding" corrected to "Safeguarding".

### Owner rulings folded in (the 7 judgment calls)

| Item | Ruling |
|---|---|
| Age-Restricted | sentence case → "Age-restricted waiver / items" |
| Worker | common noun → "Worker info", "User & worker rating" |
| Dashboard | proper noun (Gopher HQ) → keep capital |
| Request / Deal | lowercase when it's the action; capital only as the product |
| Deal Specifics | → "Deal specifics:" |
| Request Site | product ref → keep "Request" capital → "Visit Request site" |
| Safe-Guarding | → "Safeguarding & identity verification activated" (+ spelling) |

### Pages changed (verified in-browser, no console errors)

| File | Replacements | Notable before → after |
|---|---:|---|
| `gopher-request.html` | 230 | Payment Methods on File → Payment methods on file · See How It Works → See how it works · Start Job → Start job · TrustShield Verified → TrustShield verified |
| `gopher-connect.html` | 282 | View Instant Demo → View instant demo · Start Business Plan → Start business plan · Refer Gopher · Share & Earn → Refer Gopher · share & earn · Visit Connect Site → Visit Connect site |
| `gopher-go.html` | 63 | See Jobs Near You → See jobs near you · Work On Your Terms → Work on your terms · Visit Gopher Go Site → Visit Gopher Go site · Offer My Service → Offer my service |
| `gopher-deals.html` | 66 | Offer My Deal → Offer my deal · For Local Businesses → For local businesses · For Top-Rated Pros → For top-rated Pros · Visit Deals Site → Visit Deals site |
| `index.html` | 4 | For Workers/Neighbors/Merchants/Businesses → sentence case |
| `gopher-faqs.html` | 8 | Help Center → Help center · I'm a Worker/Customer → sentence case · Switch to Worker FAQs → Switch to worker FAQs |
| `gopher-blog.html` | 14 | For Neighbors/Workers/Businesses → sentence case |
| `gopher-customer-deals.html` | 6 | Offer My Deal/Service → my · I'm a Merchant/Service Provider → sentence case |
| `gopher-connect-101.html` | 12 | Business Info → Business info · Verified Business → Verified business · Users & Access → Users & access |
| `gopher-trustshield.html` | 1 | Get the Gopher Request App → Get the Gopher Request app |
| `gopher-contact-us.html` | 1 | Watch a Quick Tutorial → Watch a quick tutorial |
| `gopher-go-101.html` | 1 | Becoming a Favorite → Becoming a favorite |

### Pages intentionally NOT changed

- **107 service-detail pages** — only content is the service name + "Back to <Category>"
  button, both kept title case (owner call).
- **3 legal pages** — title case permitted by the guide.
- `gopher-services.html`, `gopher-tiers.html`, `gopher-our-story.html`,
  `gopher-request-101.html` — no title-case UI issues found (mastheads "Our Story", "The
  Gopher Blog" kept as page titles).

### Method / safety notes for the dev

- Changes were applied to **HTML text-node content only** — never to JS keys, attribute
  values, comments, or changelog notes. (Confirmed none of the target strings are used as
  JS comparison keys, so casing changes are display-only and cannot alter behavior.)
- Naive find-replace is **unsafe** on these app files: labels double as prose in dated dev
  comments, and `accept="image/*"` breaks comment detection. The scrub used a text-node
  guard + proper-noun/product/plan preservation + merchant-name blocklist.
- Counts exceed the unique-phrase count because the big app pages render the same label
  across many multi-state templates (e.g. "Start Job" appears 22× in `gopher-request`).

---

## 2 · Ratings visibility + post-confirm navigation

Location: **split-screen live prototype** under `_prototypes/` (the two-app Request↔Go
demo). Policy: **neither party is ever shown the star rating they received** — a low score
from a nearby counterpart is a safety/retaliation risk and it feeds worker pay. Ratings are
still collected for the system; they are just never displayed.

### `_prototypes/Go/gopher-go-prototype.html`

- **`__ptRated(id, stars)`** (requester-confirm handler): no longer toasts the received
  star. Marks the job confirmed, briefly shows a neutral "Confirmed · paid out" state, then
  **auto-returns the worker to a plain home ~2.2s later**.
- **Job-detail render (post-complete action block):** removed the "*[requester] rated you
  N★*" row; now shows neutral "**Confirmed by [requester] — $X paid out.**" Two-way rating
  is preserved (the worker can still rate the requester; the score is recorded, not shown).
- **`openRateRequester` toast:** dropped the star number ("your rating of X was submitted").

### `_prototypes/Request/gopher-request-home.html`

- Confirmed the Request app **already never surfaces the Gopher's rating of the requester**
  (the worker's rating stays local to the Go app — no relay, no display).
- For side-by-side symmetry, the **live post-rating toast** no longer echoes the star.
  Request *history* and the saved-MY-Gophers note still show the requester's own rating
  (owner call: "history is fine").

### `_prototypes/split-screen.html`

- Harness status banner softened — was "…it just landed in their app 🎉" (now inaccurate);
  now "You confirmed [order] and rated your Gopher — payout released, and their app returned
  home. Ratings stay private to each side. ✅"

**Verified end-to-end** by driving the full flow (post → accept → complete → confirm + rate
**1★**): the Go app showed the 1★ nowhere and returned to a plain home; no console errors.

---

## Status

- All typography edits verified present after concurrent iQ-engine/FAQS re-inlining landed
  (no clobbering — different regions).
- **Nothing was committed.** At the time of writing, the working tree also carried
  **concurrent, unrelated edits** from another session (iQ FAQS corpus + engine re-inline in
  `gopher-services.html`, `gopher-request-101.html`, `2-engine-js-block.html`,
  `gopher-ai-engine.js`, the iQ sandbox, and merchant-agreement clauses in the legal
  `gopher-terms-of-service.html`). Keep those separate when staging/committing.
