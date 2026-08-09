# Handoff — `eligibleWorkers` backend seam (Connect request flow)

**File:** `Final/gopher-connect.html`
**Domain:** matching logic (who a Go request is broadcast to).

> ⚠️ **Superseded 2026-08-09** — CLAUDE.md's *Scope of AI work* no longer reserves these for a human developer (there is no dev partner, and sessions have been shipping auth/authz/DB work to `production`). **The gate is now the owner's informed consent before production:** what it solves, the risk, the reward — then his decision. Build status below is still accurate; the *who may build it* framing is not.
**Status:** Part A done (front-end token cleanup). Part B below is the dev's to wire.
**Date:** 2026-07-05

---

## Background

`state.eligibleWorkers` is the Step‑3 "which workers are eligible" radio. Three choices:

| User label | Canonical token |
|---|---|
| Only send to Gopher Elite and Pros | `elite_pros` |
| Only send to MY Gophers | `my_gophers` |
| Send to entire Gopher Go Workforce | `entire_workforce` |

This is the **canonical enum** (canonical flow doc `connect-flows-granular.html`, INV‑11 + state glossary; realignment D‑021/D‑028). The **Request app (`gopher-request.html`) already uses these exact tokens.**

---

## Part A — DONE (front-end token normalization)

Connect previously stored the **legacy** tokens `pros` / `my` / `all` (default `pros`). That was a pure identifier mismatch — behavior was correct, but Connect disagreed with both the canonical spec and the already-migrated Request app (a latent integration bug the moment a shared backend reads the field).

Renamed in lockstep across all 10 sites in `gopher-connect.html` — `pros→elite_pros`, `my→my_gophers`, `all→entire_workforce`:

- `:10091` — state default (now `elite_pros`) + contract comment
- `:10742` / `:10754` / `:10767` — the three radio rows (`data-val` **and** the `===` selected-state check)
- `:11164` / `:11294` / `:11554` — the three Step‑6 review-label ternaries
- `:12744` / `:12772` / `:12799` — the three deal/hire-again bridges that force `my_gophers`

No behavior or UX change; the display labels ("MY Gophers", etc.) were untouched. Verified: zero legacy tokens remain in any `eligibleWorkers` context.

---

## Part B — TODO (dev only): put `eligibleWorkers` in the submit payload

**The gap:** `eligibleWorkers` currently drives **only** the Step‑6 review label. It is **not** included in the object passed to `__createDashboardRequest` (the simulated backend seam), so today the eligibility choice never leaves the flow. Verified against the full payload object at `gopher-connect.html:12665–12722` — it carries `firstAvailable`, `hireAgainGophers`, `interestedWorkers`, `suggestedOfferUsed`, etc., but **not** `eligibleWorkers`.

**Why it matters:** matching can't honor "Elite & Pros only" / "MY Gophers only" / "entire workforce" unless the submitted request actually carries the selection. The token cleanup (Part A) makes the value correct; this step makes it *reach the backend*.

### What to wire

1. **Add the field to the payload** in the `__createDashboardRequest({ ... })` call (`gopher-connect.html:~12665`), emitting the canonical token verbatim:

   ```js
   eligibleWorkers: state.eligibleWorkers,   // 'elite_pros' | 'my_gophers' | 'entire_workforce'
   ```

   Note the existing `firstAvailable: isVisible('workerSelectChoice') && state.workerSelection === 'first'` (`:12698`) already carries the *worker-selection* radio; `eligibleWorkers` is the separate *eligibility pool* radio and should ride alongside it.

2. **Persist/consume it in the receiver** `window.__createDashboardRequest = (data) => { ... }` (`gopher-connect.html:17804`) — store `data.eligibleWorkers` on the created request record so downstream matching / the real submit POST can read it.

3. **Real submit POST (production):** send `eligibleWorkers` as a field on the create-request request body, using the same three tokens. Mirror the naming already used for the analogous `suggested_offer_used` seam noted at `:12716`.

### Acceptance criteria

- Submitting a Connect request with each of the three choices results in a request record whose `eligibleWorkers` equals `elite_pros` / `my_gophers` / `entire_workforce` respectively.
- The token strings are **identical** to what `gopher-request.html` submits for the same choices (cross-surface parity — the whole point).
- Deal-seeded and Hire-Again requests (which force `my_gophers`) carry `my_gophers` through to the record.

### No open questions

The enum is fixed (`elite_pros` / `my_gophers` / `entire_workforce`) — no naming decision is left to the developer. If a real backend needs different wire names, map at the POST boundary; do **not** reintroduce the legacy `pros/my/all` into the flow state.
