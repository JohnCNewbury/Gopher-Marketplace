# Gopher iQ — Plugging in an LLM (Claude)

**Status:** design / handoff. No production code written yet.
**Audience:** the developer (or owner) who will wire Gopher iQ to a real language model.
**Scope note:** everything here targets the **`gopher-backend-api`** service (Node/Express on
AWS Elastic Beanstalk) — **not** the `Final/` static prototype. The prototype only changes in one
small way (see *Frontend contract* below).

---

## 1. Why this exists — the motivating bug

Gopher iQ today gives **two different, contradicting answers to the same question** depending on the
verb the customer happens to type. Real example, same town:

| Customer types | iQ answers |
|---|---|
| "Do you **service** in Heber Springs, AR" | *"…doesn't have **many neighbors** registered as a local worker just yet…"* (honest, low-coverage) |
| "Do you **deliver** in Heber Springs, AR" | *"Delivery is available anywhere in the US, **including Heber Springs**…"* (unconditionally upbeat) |

Both are the same intent — *"is Gopher available where I live?"* — but the customer sees either an
encouraging or a discouraging answer based purely on word choice. That's a trust problem, not a
cosmetic one.

### Root cause (in the current engine)

The engine is **pure keyword matching**. In
[`Final/assets/js/gopher-ai-engine.js`](../../Final/assets/js/gopher-ai-engine.js):

- A `CATEGORIES` array carries a **hardcoded `phrases` list** (thousands of entries) per service. The
  word *deliver* matches the `delivery` category → emits the upbeat "Delivery is available…" card and
  **never checks coverage**.
- The word *service* matches **no** category → falls through to the generic availability path → runs
  `coverageTier()` → Heber Springs is a low-coverage tier → the "doesn't have many neighbors yet" card.

So the engine never *understands* either question. It string-matches a verb and takes one of two
branches that don't agree with each other.

### Why we are NOT patching the rules engine

Unifying the verbs (`deliver`/`service`/`serve`/`come to`/…) into one handler would fix *these two*
phrasings, but it is **whack-a-mole**: every new phrasing ("y'all work in Heber Springs?", "can I get a
gopher in 72543?", "when are you coming to Heber Springs?") needs another hand-added synonym. The
delivery category already needs *thousands* of hardcoded phrases — that's the signal this approach
doesn't scale. **Decision (owner, 2026-07-09): skip the temp fix; do the LLM properly.**

---

## 2. What an LLM actually fixes

An LLM classifies **every phrasing to the same intent** without you enumerating a single synonym:

```
"Do you service in Heber Springs"  ─┐
"Do you deliver in Heber Springs"  ─┼─►  intent = availability
"Y'all work in 72543?"             ─┤    location = "Heber Springs, AR"
"When are you coming to Heber?"    ─┘    service  = (optional)
                                              │
                                              ▼
                              ONE grounded coverage lookup
                                              │
                                              ▼
                                    ONE consistent answer
```

**Critical:** the LLM fixes the *intent* half. Consistency only holds if **both** answers draw from
**one** coverage source. The win is `intent classifier → single grounded lookup → one answer` — not two
answer-generators behind a smarter front door. If two code paths still generate coverage messaging
independently, you can reintroduce the same contradiction with a smarter parser. Funnel everything
through one availability answer built from one number.

---

## 3. Target architecture

```
  Static site (GitHub Pages)          gopher-backend-api (Elastic Beanstalk)        Anthropic
  ┌───────────────────────┐           ┌──────────────────────────────────┐        ┌─────────┐
  │ iQ pill               │  POST     │ POST /api/v1/iq/ask               │        │ Claude  │
  │ gopher-ai-engine.js   │ ────────► │  controllers/common/iq.js         │        │ Messages│
  │  (renders the card)   │  {question,│   ├─ gopher_count(lat,lng)  ◄─── real coverage (Aurora)  │
  │                       │   lat,lng} │   └─ lib/claude.js  ──────────────────────► API      │
  │                       │ ◄──────── │        (only file that requires   │        └─────────┘
  └───────────────────────┘  {answer, │         @anthropic-ai/sdk)        │
                              coverage}└──────────────────────────────────┘
```

The **API key never leaves the backend.** The static site calls *your* endpoint; your endpoint calls
Claude server-side. (Unlike the Google Maps key, which is client-side by design and referrer-locked, an
Anthropic key is a billing secret and must never appear in browser code.)

---

## 4. Where it plugs into the backend

Confirmed against the `gopher-backend-api` repo conventions:

- Entry `index.js` mounts route modules (`payment.routes`, `common.routes`, `admin.routes`, `routes/`)
  and already installs global `cors`, `express.json({limit:'10MB'})`, and a global `limiter`
  (express-rate-limit).
- Route files: `module.exports = (app) => { router.post('/path', ...mw, handler); app.use('/api/v1', router) }`.
- Controllers are either folders with an `index.js` Router (`controllers/order/`) or flat handler files
  (`controllers/common/report.js`).
- **Vendor SDKs live in `lib/` and are isolated** — `lib/payment.stripe.js` is the *only* file that
  `require('stripe')`. Mirror that.
- Auth: `middleware/auth_token.js` → `user_auth`, `user_type_auth`, etc.
- Secrets are read as `process.env.*` (see `config/db.config.js`).

### Three touch points

```
gopher-backend-api/
├─ lib/claude.js              NEW  — the ONLY file that require('@anthropic-ai/sdk')  (mirror lib/payment.stripe.js)
├─ controllers/common/iq.js   NEW  — handler: gather context → call lib/claude → return JSON
└─ routes/common.routes.js    EDIT — add one line + a dedicated rate limiter
```

**`lib/claude.js`** — isolation layer:

```js
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); // from Secrets Manager (see §6)

// FAQ/policy corpus goes in a STABLE system prefix so prompt caching applies (~90% cheaper after 1st call).
// The corpus is the real long pole — see §8. Keep it single-sourced.
exports.answerIQ = async ({ question, coverage }) => {
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',            // FAQ/search volume → Haiku 4.5 or Sonnet 5, NOT Opus
    max_tokens: 1024,
    system: [{ type: 'text', text: GOPHER_IQ_CORPUS, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Local coverage data: ${JSON.stringify(coverage)}\n\nCustomer question: ${question}`
    }],
  });
  return resp.content.find(b => b.type === 'text')?.text ?? '';
};
```

**`controllers/common/iq.js`** — handler (flat-file style, matching `controllers/common/*`):

```js
const claude = require('../../lib/claude');
const { gopher_count } = require('./requestor'); // reuse the REAL coverage query — see §5

exports.ask = async (req, res) => {
  try {
    const { question, lat, lng } = req.body;
    const coverage = await gopher_count({ lat, lng });   // live number the prototype fakes
    const answer = await claude.answerIQ({ question, coverage });
    return res.status(200).json({ answer, coverage });
  } catch (err) {
    // Claude/network errors: fall back to a safe canned availability message, log err.
    return res.status(200).json({ answer: SAFE_FALLBACK_TEXT, coverage: null });
  }
};
```

**`routes/common.routes.js`** — one line (add a tighter limiter than the global one; LLM calls cost money):

```js
router.post('/iq/ask', iqLimiter, iq.ask);   // → POST /api/v1/iq/ask
```

> Confirm the mount prefix at the bottom of `common.routes.js` — it follows the same `/api/v1` mount as
> `routes/index.js`. Add `iqLimiter` as a dedicated `express-rate-limit` instance (e.g. 20 req/min/IP).

---

## 5. The grounding data already exists (RAG)

The prototype **fakes** local-Gopher counts from a static table
([`Final/assets/js/gopher-iq-data.js`](../../Final/assets/js/gopher-iq-data.js)). The backend already has
the **real** version:

- `controllers/common/requestor.js → gopher_count` — "count of active users within a radius given
  lat/lng". Exposed today as `GET /api/v1/gopher_count`.

That is the exact grounding source. Feed its result into the prompt so "do you service/deliver in Heber
Springs?" is answered from **live DB numbers**, not a snapshot — and both phrasings hit the same number.

**Open item:** confirm the return shape of `gopher_count` (raw count vs. a tier). The answer text should
be derived from one canonical coverage object so the two-screenshot contradiction can't recur.

---

## 6. Secret handling — fold into work already queued

Do **not** add `ANTHROPIC_API_KEY` as a plaintext Elastic Beanstalk property — that is exactly surface
#2 in the SEC-1 / G40-283 secret exposure (~40 plaintext props). Put it in **SSM SecureString /
Secrets Manager** and load it into `process.env` at boot, in the **same Phase 0.5 rotation pass** the
AWS infra recap already prescribes
([`Documentation/AWS/Gopher-AWS-Infrastructure-and-Cost-Advisor-Recap.html`](../../Documentation/AWS/Gopher-AWS-Infrastructure-and-Cost-Advisor-Recap.html)).
One new secret, done the right way from the start.

---

## 7. Frontend contract (keeps the existing design)

The engine ([`gopher-ai-engine.js`](../../Final/assets/js/gopher-ai-engine.js), inlined into
`index.html`, `gopher-request.html`, `gopher-services.html`, `gopher-faqs.html`,
`2-engine-js-block.html`, `gopher-iq-sandbox-standalone.html`) currently string-matches locally and
renders via `coverageShell()` / `ctaRow()`. **Swap the *text source*, keep the *renderer*:**

```js
const { answer, coverage } = await fetch('https://api.gophergo.io/api/v1/iq/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question, lat, lng }),
}).then(r => r.json());
// feed `answer` into the existing coverageShell() — same pill UI, real AI text
```

CORS is already configured in the backend `index.js`, so the static site can call it. Keep a local
fallback so the pill still renders if the endpoint is unreachable.

---

## 8. The two things that actually gate this (be honest about effort)

The three files are the *easy* 20%. The 80% that decides whether iQ ships and whether it's any good:

1. **The FAQ / grounding corpus (`GOPHER_IQ_CORPUS`)** — iQ is only as smart as the content fed to it.
   This is the owner's content to define and the real long pole. Seed it from the existing `FAQS` data
   already in the engine, plus coverage/deals/availability policy. Single-source it.
   Do not write it from scratch: two years of real support Q&A already sit in Intercom — see **§11**
   for the export → scrub → synthesize path, and the two-year retention clock on it.
2. **Moderation** — constrain the model to answer **only** from the provided corpus + coverage data so
   it can't invent coverage numbers or deal terms. Tie into the in-app messaging moderation policy
   (G40-35 / `moderation_rules.json`).
3. **Model + cost** — Haiku 4.5 (or Sonnet 5) at FAQ volume is fractions of a cent per answer with
   `max_tokens: 1024` + prompt caching + the dedicated `iqLimiter`. Do not use Opus for this.
4. **The deploy** — real code in `gopher-backend-api`, deployed to Elastic Beanstalk. Human-dev / owner
   territory on the live backend.

---

## 9. Recommended build path

1. **Spike first (throwaway, scratchpad, standalone).** A tiny Express server making a real
   `client.messages.create()` call with a seed corpus + a stubbed coverage number, with a local copy of
   the iQ pill pointed at it. Lets you *watch* both "service" and "deliver" phrasings return the same
   grounded answer before any production work. Touches nothing live.
   - Prerequisite: an Anthropic API key (or run the spike in mock mode and drop the key in later).
2. **Real files** into `gopher-backend-api` (§4), corpus finalized (§8), secret in Secrets Manager (§6).
3. **Deploy** to Elastic Beanstalk; point the static pill at `/api/v1/iq/ask` (§7).

---

## 10. Reference — Claude Messages API notes

- Node SDK: `@anthropic-ai/sdk`; call is `client.messages.create({ model, max_tokens, system, messages })`.
- The API is **server-to-server and stateless** — it does **not** learn from or train on your traffic.
  "Learning behaviours" = *you* store user context (past requests, preferences) in your DB and feed the
  relevant slice back into each request. Not model fine-tuning.
- Prompt caching: put the stable corpus in a `system` block with `cache_control: {type:'ephemeral'}`;
  keep per-request/volatile content (the question, the coverage JSON) *after* it.
- Models: `claude-haiku-4-5` (cheapest, fast) or `claude-sonnet-5` for this workload.

---

## 11. Building `GOPHER_IQ_CORPUS` from the Intercom support history

§8 calls the corpus the real long pole. It does not have to be written from scratch — two years of
real support Q&A already exist in Intercom. Scripts live in
[`docs/handoff/intercom/`](intercom/). Both are stdlib-only Python 3 (this machine has no Node).

### Two constraints that set the schedule

1. **Intercom retains export data for two years.** Anything older is already unreachable.
2. **The API is the only path to message content.** Intercom's own docs are explicit: the CSV export
   is reporting metadata with *no transcripts*, and the S3 JSON export "will not contain a
   transcript." The Inbox PDF/text export caps out around 200–300 conversations per operation.
   There is no no-code way to get the corpus out.

Together: **export before any decision to leave Intercom.** API access ends with the subscription,
and the support history is a switching cost only for as long as it stays locked in there.

### Step 1 — Export

Mint a **read-only** access token from the Intercom Developer Hub (a new private app for the
workspace). Do **not** reuse the production `INTERCOM_ACCESS_TOKEN` — it is already in scope for the
SEC-1 / G40-283 rotation. Delete the export token afterward.

```sh
# smoke test first — 5 conversations, eyeball the output
INTERCOM_ACCESS_TOKEN=xxx INTERCOM_MAX=5 python3 intercom_export.py
head -1 intercom-conversations.jsonl | python3 -m json.tool

# then the full run (resumable; safe to re-run after any interruption)
INTERCOM_ACCESS_TOKEN=xxx python3 intercom_export.py
```

Throttled to ~8 req/s, retries on 429/5xx, checkpoints its cursor. The list endpoint omits message
bodies, so each conversation is fetched individually — that is why a large workspace takes hours,
and it is not avoidable. On finish it prints the **date range actually retrieved**, which is how you
confirm how far back the two-year window really reaches.

### Step 2 — Scrub and cluster

Raw transcripts are dense customer PII — names, emails, phones, addresses, card numbers. They must
not go into a prompt corpus as-is.

```sh
python3 intercom_scrub.py          # reads intercom-conversations.jsonl
```

Three passes: **redact** PII → **verify** by re-scanning its own output (exits non-zero and refuses
to bless the file if anything survives) → **cluster** near-duplicate questions. Outputs
`intercom-clean.jsonl`, `faq-clusters.json` (largest asks first), and `redaction-report.txt`.

Read `redaction-report.txt` and spot-check `intercom-clean.jsonl` **before** any of it reaches a
model. Two behaviours worth knowing:

- Name stripping keeps a name only if it is a lowercase dictionary word *and* actually used as one in
  the transcripts. That preserves "**Will** you check?" while removing customers named Robinson or
  Sarah. Either test alone gets it wrong.
- Clustering is lexical (Jaccard over keywords), so it merges *phrasings*, not *meanings*. "Where is
  my order?" and "My order hasn't arrived" stay in separate clusters. That is fine — it is a cheap
  pre-pass whose job is to collapse thousands of threads into dozens of groups. The semantic merge
  happens in Step 3.

### Step 3 — Synthesize

Feed `faq-clusters.json` to Claude in batches, largest clusters first, and have it emit one canonical
question + one best-form answer per topic in Gopher's voice, drawn from how support actually
answered. That output — reviewed by the owner — becomes `GOPHER_IQ_CORPUS`.

The clusters are ranked by thread count, so the highest-volume real questions get answered first,
and the tail can be dropped without much loss.

### Step 4 — Triage each batch against the live store

The store already has 183 FAQ entries, so most tail clusters are **duplicates or alternate phrasings**,
not new answers. `intercom_process_batch.py` does that triage automatically — it matches every cluster
against the live `FAQS` using the **real engine matcher** (driven via `osascript -l JavaScript`, so
"already covered" means "the engine already routes it to a good answer") and buckets each cluster:

```sh
python3 intercom_process_batch.py faq-clusters.json          # triage -> batch-report.txt + batch-worklist.json
# curate the correct near-miss rows into batch-enrich.approved.json, then:
python3 intercom_process_batch.py faq-clusters.json --apply  # folds ONLY approved keywords into all 7 copies
```

- **covered** — engine already answers it; skip.
- **near-miss** — same intent the engine *misses*; the cluster's phrasings become keyword-enrichment
  **candidates**. The suggested target is best-by-score and is **often the wrong entry** (a payment FAQ
  can outscore the order-status FAQ for "never showed up"), so these must be human-confirmed — `--apply`
  refuses to run on anything but a curated `batch-enrich.approved.json`.
- **new-entry candidate** — genuinely novel + enough volume; emitted with the raw support answers as
  synthesis material. The canonical answer is **never auto-written** — that is where a contradiction with
  the live store would come from (**live store wins**; see the batch-1 merge in
  [`gopher-iq-faq-corpus.md`](gopher-iq-faq-corpus.md)).
- **noise** — low-volume or no content words; dropped.

Because covered/near-miss clusters only ever contribute *keywords* (never answer text), this pass cannot
introduce a conflicting answer — the safety model is structural, not a matter of judgement.

### Why this survives leaving Intercom

The corpus is tool-agnostic. Export → scrub → synthesize has the same shape against Zendesk, Help
Scout, Front, or plain email. Only Step 1 is Intercom-specific.
