# Unfinished / Stubbed JavaScript & Forms — Gopher Marketplace

_Generated: 2026-06-24 · Read-only audit — no files modified._

This catalogs every JavaScript function/handler that is **unfinished, stubbed,
demo-only, or fake**, plus every form on the site and whether it actually submits
anywhere. Findings are grouped by the **backend capability** each one implies, so the
production team can scope work area by area.

**The headline:** this prototype has **almost no backend wiring**. Nearly every action
(request, payment, login, hire, message, deal, bid) updates in-memory JavaScript state
or shows a simulated success, then is lost on reload. There is exactly **one** real
network submission in the whole site (see "The one thing that actually submits").

> Per CLAUDE.md, this is expected — it's an AI-generated static blueprint. Nothing here
> is a "bug to fix" in the prototype; it's a scope map for the rebuild. Payments, auth,
> database, matching, and security are explicitly reserved for the human developer.

---

## The one thing that actually submits

| What | File · Line | Behavior |
|---|---|---|
| Merchant / Worker **pre-registration** | `gopher-deals.html` · `submitForm()` @ 5117 (called by `dpSubmit()` @4939, `wpSubmit()` @5025) | **Really POSTs** collected fields to a Google Apps Script → Google Sheet (`GOPHER_FORM_ENDPOINT`), with a `localStorage` fallback. File attachments send filename only, not file data. This is the sole working data path. |

Everything else below is **not wired**.

---

## A shared, duplicated engine ("gopher iQ")

The three originally-known stubs live in the shared **gopher iQ** search engine, whose
code is **duplicated/inlined into 7 files**: `gopher-ai-engine.js` (canonical),
`index.html`, `gopher-request.html`, `gopher-services.html`, `gopher-faqs.html`,
`gopher-iq-sandbox-standalone.html`, and `2-engine-js-block.html`. Line numbers below
are the canonical `gopher-ai-engine.js`; the same functions repeat in the others.

| Function | File · Line | What it does now | Real implementation needs |
|---|---|---|---|
| `analyzeUpload(file)` | `gopher-ai-engine.js` · 773 | `await setTimeout(600ms)` to **simulate a network round-trip**, then returns a hardcoded `{_stub:true, slug:null, confidence:'none'}`. UI shows a "not wired yet" note. | **File upload + processing** — POST file to a vision/document model, look up similar past requests in DB, return a category + confidence. |
| `bookService(slug,label)` | `gopher-ai-engine.js` · 748 | Back-compat shim — just calls `submitRequest(slug)` (navigates to the request page). Overridden in `gopher-services.html` @2803 to `scrollToCategory()` (in-page scroll). | Not a data op — navigation only. No backend needed unless booking becomes a real action. |
| `contactSupport()` | `gopher-ai-engine.js` · 750 | `console.log('[Gopher iQ] contactSupport (unused)')` — no-op. Overridden in `gopher-services.html` @2805 to navigate to the contact page. | **Messaging/support** if reinstated — route to a support channel. |
| iQ search / `lookupKnowledge()` | `gopher-ai-engine.js` (FAQS array + fuzzy match) | Answers come from a **hardcoded local `FAQS` knowledge array** via client-side fuzzy matching — no server. | **Search/matching** — real semantic search / RAG over a maintained KB. |

---

## Findings by backend capability

### 💳 Payments / billing
All payment UI is visual; nothing charges, tokenizes, or persists a card.

| Function / handler | File · Line | Current behavior | Needs |
|---|---|---|---|
| Add payment method | `gopher-request.html` · `__addPayMethod()` / `__payStore` @10447–10695 | Stores card in an in-memory array; PAN never persisted; no tokenization. | PSP tokenization (Stripe/Square/Adyen), secure vault. |
| Add payment method | `gopher-deals.html` · `addPayBtn` @6310 | Toast "Add Payment Method — coming soon"; all `renderPayMethods()` buttons visual-only. Hardcoded demo cards @6285. | PSP add-payment flow (card/ACH/wallet). |
| Upgrade to Business | `gopher-connect.html` · @17538 | `console.log('[STRIPE seam] … (simulated)')`; shows success modal. Commented real `stripe.subscriptions.create(...)`. | Stripe subscription create + trial. |
| Downgrade plan | `gopher-connect.html` · @17573 | Logs "(simulated) cancel_at_period_end=true"; updates UI locally. | Stripe subscription modify. |
| Cancel subscription | `gopher-connect.html` · @17586 | Logs "(simulated)"; opens a mailto. | Stripe subscription cancel. |
| Business subscription on signup | `gopher-connect.html` · @18158 | Logs "(simulated)"; builds fake subscription object. | Stripe customer + subscription from card token. |
| Place featured-placement bid | `gopher-deals.html` · `bidPlace` @6707 | Updates in-memory `PLACEMENTS`; toast. TODO @6713: "POST the bid … settle the monthly auction server-side." | Bid persistence, monthly auction settlement, payment auth. |

### 🔐 Authentication / accounts
No real auth. Logins match hardcoded demo accounts; sign-ups create no account.

| Function / handler | File · Line | Current behavior | Needs |
|---|---|---|---|
| Sign-in / sign-up | `gopher-request.html` · `lookupDemoUser()` / `completeSignIn()` @15880–16826 | Matches phone/email against a hardcoded `DEMO_USERS` array (~7 seeded accounts); session is in-memory; nothing persists. | Real auth backend, account creation, session/OTP. |
| Account lookup | `gopher-connect.html` · `lookupGopherAccount()` @16796–16883 | 4 seeded demo accounts (John, Dave, Tom, Bryan); comment says replace with real lookup. | Auth + user DB. |
| SMS code send | `gopher-deals.html` · `sendOtp(btn)` @5056 | Shows the OTP field; **sends no SMS**. TODO @5060: "call your backend to send a real one-time code." | SMS provider (Twilio Verify / AWS SNS). |
| SMS code verify | `gopher-deals.html` · `checkOtp(btn)` @5065 | **Accepts any 6 digits** as valid. TODO @5068: "validate the code against your backend." | Backend OTP validation. |
| Provider application | `gopher-tiers.html` · `proApp` multi-step form @1087 (step nav @1620) | 3 steps then shows a **fake step-4 success screen** with a client-side reference number; no POST. | Account/provider-application API + verification-tier backend. |
| Sign-out wipes data | `gopher-connect.html` · @18524 | Comment: "Nothing persists … demo starts fresh." Confirms no server session. | Session management. |

### 📤 File upload / processing
All file pickers read locally via `FileReader` (data URLs); nothing is uploaded.

| Function / handler | File · Line | Current behavior | Needs |
|---|---|---|---|
| `analyzeUpload(file)` | shared engine (see above) | Simulated 600ms, returns stub. | Vision/document model + storage. |
| ID + selfie verification | `gopher-request.html` · `__openIdSubmitModal()` @12276 · `gopher-connect.html` `idvFinish` @13808 | Reads images into local state via `FileReader`; no upload. Comment @17609: "no upload backend in the demo." | ID-verification service (Jumio/Socure), file storage. |
| Profile photo capture | `gopher-request.html` · `__openCompletePhotoModal()` @19742 · `gopher-connect.html` @13786 | `readAsDataURL` to local state only. | File upload endpoint + image storage (S3/CDN). |
| Pre-registration file field | `gopher-deals.html` · `submitForm()` @5117 | Submits **filename only**, not the file. | Multipart upload to storage. |

### 💬 Messaging / support
Inboxes, feedback, and support are simulated; some auto-reply on a timer.

| Function / handler | File · Line | Current behavior | Needs |
|---|---|---|---|
| Contact form | `gopher-contact-us.html` · `contactForm` @329, handler @382 | Validates, then opens a `mailto:support@gophergo.io` (uses visitor's mail app). Comment: "SWAP HERE … replace with a fetch() POST (Formspree/Web3Forms)." No server. | Form-handling endpoint (or keep mailto). |
| Send feedback | `gopher-connect.html` · `fbForm` submit @16320 | Hides form, shows "done" view; **no network call**. Comment @16324: "In production, POST {feedbackType, message} to the feedback endpoint." | Feedback API. |
| Send feedback | `gopher-request.html` · @19847 | Rendered; commented example `fetch('/api/feedback', …)`; no real handler. | Feedback API. |
| Inbox send (customer) | `gopher-connect.html` · `sendInboxMessage()` @14947 · `gopher-deals.html` `inboxComposerSend` @6264 | Pushes message to in-memory thread; **`setTimeout` triggers a hardcoded auto-reply** (~1.1s). | Message persistence + real routing. |
| Hire worker | `gopher-connect.html` · @11685 | Button text → "✓ Hire requested"; visual only ("illustrative only in the demo"). | Send hire request to worker (messaging + DB). |
| Message worker | `gopher-connect.html` · @11693 | Button text → "💬 Conversation opened"; no-op. | Open conversation thread. |
| "Ask Gopher" assistant | `gopher-connect.html` · `ask()` @16246–16259 | `setTimeout` 550–900ms "thinking", then returns a hardcoded answer from `ASK_GOPHER_KB`; `defaultReply()` @16188 is a fixed string. | KB search / support assistant backend. |

### 🔎 Search / matching
Search, matching, promo validation, and the deals feed are all local/hardcoded.

| Function / handler | File · Line | Current behavior | Needs |
|---|---|---|---|
| iQ search / `lookupKnowledge` | shared engine | Fuzzy-matches a hardcoded `FAQS` array; no server. | Real search / RAG. |
| Voice input | `gopher-connect.html` · @9948 | "Simulate a voice-input demo" — types a random sample phrase char-by-char, then matches. No speech-to-text. | Speech-to-text API. |
| Worker matching | `gopher-connect.html` · `scheduleGopherAcceptance()` @15709 · `gopher-request.html` `__getMyGophers()` @17650 | `setTimeout(3000)` auto-moves workers "interested"→"hired" in memory; returns mock worker data. | **Matching logic** (reserved for human dev) + worker DB. |
| Promo code | `gopher-request.html` · `getPromo()`/`tryApplyPromo()` @10785 · `gopher-connect.html` @9537 | Validated against a hardcoded map (e.g. `GOPHER50`); client-side only. | Server-side promo validation (expiry, usage limits). |
| Address entry | `gopher-request.html` · Step 4 inputs (~11680) | Free-form text → state; no geocoding/validation. | Geocoding + service-area validation (Maps/Mapbox). |
| Deals "near me" search | `gopher-customer-deals.html` · @3372–3377 | `alert('Great! Local deals for "…" are on the way. (Connect this to your live deals feed.)')` — fake. | Deals search over a live feed (search + DB). |
| Gopher photo lookup | `gopher-deals.html` · `loadGopherPhoto()` @5039 | No-op until DB exists; commented fetch example. | Phone→profile lookup (DB). |

### 🗄️ Database / persistence
There is no persistence layer — all records live in JS objects and vanish on reload.

| Function / handler | File · Line | Current behavior | Needs |
|---|---|---|---|
| Submit a request | `gopher-request.html` · `submitRequestAndCapture()` @11544 · `gopher-connect.html` `__createDashboardRequest()` @15814 | Generates a fake ID (e.g. `GC-00…`), pushes to in-memory `DASH_DATA`; no POST. | `POST /api/requests` + DB. |
| Start a deal-linked request | `gopher-request.html` · `__startDealRequest()` @14094 | Accepts payload; no implementation/persistence. | Deal eligibility + pricing DB. |
| Scheduling | `gopher-request.html` · time `<select>` @12851 | `state.timeSlot = "2:00 PM"`; no availability check. | Worker schedule / booking API. |
| Publish a deal | `gopher-deals.html` · `ndPublish` @6544 | Toast "submitted for review"; in-memory only. TODO @6546: "POST the deal … to your backend." | Deal creation + review workflow. |
| Add business / location | `gopher-deals.html` · `naSave` @6591 · `la-save` @6578 | Pushes to in-memory `ACCOUNT.businesses`; lost on reload. | Persist business/location records. |
| Mobile-address flag | `gopher-deals.html` · `ndMobileAddr` @6440 | Sets in-memory flag. TODO @6436: backend must drive the "Make a Gopher Request" parlay. | Flag persistence + request-flow integration. |

---

## Forms inventory

The site has only **4 actual `<form>` elements**; most "forms" are `div`+`button` UIs
driven by JS (especially the request flow, payment, login, and deals modals).

| Form | File · Line | Submits anywhere? |
|---|---|---|
| `aiAssistForm` (iQ search bar) | `gopher-request.html` @15545 · `gopher-connect.html` @7403 | **No** — `preventDefault()`; runs the local iQ search / file picker. No server. |
| `contactForm` | `gopher-contact-us.html` @329 | **Partly** — validates then opens `mailto:support@gophergo.io`. No server endpoint. |
| `proApp` (provider application) | `gopher-tiers.html` @1087 | **No** — 3-step wizard → fake success screen + client-side reference number. No POST. |
| `aiAssistForm` duplicate | (the two above are the only `<form action>`-less search bars) | — |

**Form-like UIs without a `<form>` tag** (JS-driven, none submit except the one noted):

- `gopher-deals.html` / `gopher-customer-deals.html` — merchant/worker pre-registration
  modals (**the only real submit**, via `submitForm()` → Google Apps Script), plus deal
  builder, bid form, add-business/location, OTP, inbox composer — all in-memory.
- `gopher-request.html` / `gopher-connect.html` — multi-step request wizard, payment
  modal, login/signup, ID-verify, scheduling, address — all in-memory state only.

No form anywhere uses an HTML `action=` attribute.

---

## Summary

| Capability | Stubbed items | Real work implied |
|---|---|---|
| Payments / billing | 7 | PSP tokenization, Stripe subscriptions, bid/auction settlement |
| Auth / accounts | 6 | Real login/signup, SMS OTP, provider application + verification tiers |
| File upload / processing | 4 | Upload endpoint + storage, ID verification, vision/doc analysis |
| Messaging / support | 7 | Contact/feedback endpoints, real inbox, hire/message routing |
| Search / matching | 7 | Semantic search, **matching engine (reserved)**, geocoding, deals feed, promo validation |
| Database / persistence | 6 | Request/deal/business persistence, scheduling, the whole data layer |

The single working integration is the Google Apps Script pre-registration capture in
`gopher-deals.html`. Treat everything else as front-end choreography awaiting a backend.
Reminder: **payments, auth, database, matching, and security are reserved for the human
developer** (CLAUDE.md) — this document scopes them, it does not implement them.
