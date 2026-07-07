# G40-303 — Scale-hardening pass (front-end tech-debt) — AUDIT & BASELINE

**Type:** Task (umbrella) · **Priority:** Highest · **Status:** groomed — 2026-07-05. Assignee: John.
Umbrella tech-debt tracker for the post-UX **framework rebuild**. This doc grounds each debt dimension in real numbers and delivers the one **do-now** item: the pre-live `DEMO_*` flag audit. Relates to reskin-readiness audits **G40-301** (banner) and **G40-302** (pop-up modal).

---

## A. Pre-live `DEMO_*` flag audit — the actionable blocker (delivered here)

**Complete inventory across BOTH representations** (`Final/` compiled simulators **and** `_prototypes/` standalone sources):

| Flag | Location | Value | Type | Pre-live action |
|---|---|---|---|---|
| `DEMO_SKIP_PHOTO_GATE` | `Final/gopher-request.html:21850` | `true` | **behavior gate** — skips the completion photo gate | ⚠️ **flip false / remove** |
| `DEMO_SHOW_CARD_DISMISS` | `_prototypes/Request/gopher-request-home.html:860` | `true` | **behavior gate** — renders the card "×" dismiss + enables the dismiss branch | ⚠️ **flip false / remove** |
| `DEMO_USER` | `Final/gopher-request.html:16644` | `'11111111'` | demo login routing (magic phone → returning user) | remove — bypasses real auth |
| `DEMO_SIGNUP` | `Final/gopher-request.html:16645` | `'22222222'` | demo login routing (magic phone → new sign-up) | remove — bypasses real auth |
| `DEMO_USERS` | `Final/gopher-request.html:16665` | array | seeded demo accounts | remove |
| `DEMO_GOPHER_USERS` | `Final/gopher-connect.html:18794` | array | seeded demo accounts | remove |

**Two behavior gates are currently `true`.** Both must be off before any live prototype or reskin. Leaving them on now is fine — the active demos need them — but they are the go-live gate.
Adjacent sweep: no `DEBUG/MOCK/FAKE/TEST_MODE/BYPASS/SKIP` boolean gates, and no hardcoded `localhost`/`staging` endpoints in `Final/`. The `DEMO_*` set is the whole surface.

### ⚠️ The ticket's own acceptance check is insufficient — fix the method
The AC says *"Grep for `/DEMO_/` and confirm each is off/removed."* That **misses `DEMO_SHOW_CARD_DISMISS`**, because:
1. **Sources are split** — flags live in both `Final/*.html` (compiled) and `_prototypes/*` (standalone). Grepping only the shipped `Final/` file finds `DEMO_SKIP_PHOTO_GATE` but **not** the card-dismiss gate, which lives only in the prototype source.
2. **Embedding hides strings** — screens get "re-embedded in the base64 simulator" (per commit `b8d283d`); a flag baked into a base64 blob is invisible to a plaintext `/DEMO_/` grep of the shipped file. (Verified: the 37 base64 blobs in `gopher-request.html` are assets, but the mechanism is the risk.)

**Recommendation:** make demo flags a **single source of truth** (one `demoFlags` module imported everywhere) **and** add a **build-time assertion** that fails the production build if any `DEMO_*` / demo flag is truthy in the compiled output — grep-by-hand cannot be the gate.

---

## B. Debt baseline (measured — gives the rebuild real targets)

**Single-file weight** (no build step; whole app per file):
- `Final/gopher-request.html` — 24,094 lines / 2.4 MB
- `Final/gopher-connect.html` — 21,395 lines / 5.4 MB
- `_prototypes/Go/gopher-go-prototype.html` — 2,781 lines / 2.5 MB

**Base64-inlined assets** (the ~33% bloat + cache/parallelism defeat the ticket cites):
- `gopher-request.html` — 37 blobs, ~984 KB inlined (**40%** of the file)
- `gopher-connect.html` — 60 blobs, ~4,415 KB inlined (**79%** of the file)
- → move to CDN files w/ cache headers, `srcset`, WebP/AVIF.

**CSS fragmentation** (drift source — caused the footer-consistency bug):
- Go prototype: **47** inline-style / JS-string-CSS hits + 5 `<style>` blocks — CSS stored in per-screen JS strings.
- `gopher-request.html` 6 `<style>` blocks; `gopher-connect.html` 4 — duplicated/inline rather than one tokenized stylesheet.
- → consolidate to design tokens + shared stylesheet(s); kill per-screen blocks.

**JS / architecture:** single-file inline scripts, no bundler/lint/CI, global leakage; single-file HTML pages → componentized framework + real state layer + backend (payments/auth/persistence/matching/security stay human-dev scope per `AGENTS.md`).

---

## C. Recommended split (once the rebuild starts)
Sub-task per area so it burns down deliberately: **assets** (base64→CDN pipeline) · **CSS** (tokenize + de-dupe) · **JS** (bundle + lint + CI) · **framework** (components + state) · **flags** (single-source demo flags + build-time assertion). The **flags** sub-task is the only one that must ship **before** any live prototype/reskin — the rest ride with the framework rebuild.
