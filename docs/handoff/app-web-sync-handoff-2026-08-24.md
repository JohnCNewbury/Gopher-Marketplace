# App / Web Sync — session handoff, 2026-08-24

**Transcript:** `~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/243563c9-93e0-4cbf-baf3-f69038a284e5.jsonl`
Full-text searchable and never deleted — this doc is an INDEX into it, not a replacement.

**Grep anchors** (search the transcript for these): `gopher-step-gates.js` · `get_trustshield_files` ·
`!367` / `a810ec6e` · `URL_TTL_SECONDS` · `can_request_restricted_items` · `TRUSTSHIELD_MIN_AGE` ·
`D-038` · `id-barcode-age-read.md` · `trustshield-gate-removal-interim.md` · `196bc40` / `e2c733e` ·
`Biometric Information Notice` · `G40-410`.

---

## What this session did (chronological lanes)

### 1. Phase 2 + Phase 3 — shared step-gate module ✅ DONE + LIVE
- **Built** `Final/assets/js/gopher-step-gates.js` (12-gate catalogue + per-surface enable list) —
  the extraction of `stepGate()` that Request/Connect/prototype each duplicated.
- **Phase 3:** Request + Connect now DELEGATE to it (deploy `941204a`). Fails closed if the module
  404s. Prototype still runs its own copy (App Prototypes' call).
- Tests: `docs/handoff/request-app-parity/test-step-gates.js` (56) +
  `run_parity_harness.py` (0 failures). Both **mutation-proved** — a green test that can't fail
  proves nothing; harness had THREE silent-drop bugs found only by mutation.
- Earlier same lane: **D-038 identity gate** (Finding 3) built into Connect then SUPERSEDED — see #4.

### 2. `get_trustshield_files` IDOR ✅ FIXED + MERGED + LIVE (`!367`, merge `a810ec6e`)
- `GET /users/get_trustshield_files/:reqid` returned any user's ID front/back/selfie to ANY
  authenticated caller — no authz. Bound to owner OR the assigned Gopher (order lookup). Answers
  **204** (not 403) so both clients stay quiet.
- Backend `controllers/user/trustshield.js` + `test/trustshield-files-authz.test.js`. Test proven to
  FAIL on unpatched production first (5 failures), 8/8 patched.
- **Severity is TARGETED disclosure, not mass-scrape** — auth = phone-OTP (attributable) + a global
  30 req/s per-IP rate limit. I overstated it first ("one request / whole population"), corrected in
  `docs/handoff/id-image-retention-findings.md` §1b.
- ⚠️ **Systemic:** `scripts/check-route-authz.js` PASSES on this route — it only covers WRITE routes.
  A read-side IDOR is outside its remit. The other 6 parameterised GET routes in
  `controllers/user/index.js` deserve a real audit (my quick scan was inconclusive + false-positived
  on `list_requestor_payment_methods`, which IS protected differently).

### 3. ID-data hygiene ✅ ALL DEPLOYED (verified by content, both hosts)
Deploy `e2c733e` (isolated-worktree, batch-only) + `196bc40` (full launch tree):
- **Privacy policy** discloses selfie + worker-visibility + retention (`gopher-privacy.html`).
- **Support@ email-your-ID path KILLED** — 7 corpus copies + static + trustshield FAQ. New copy:
  *"contact us… Please don't email a photo of your ID."* FAQ integrity green, hash `6584958a11`.
- Findings + verified 4.4/4.6 investigation in `docs/handoff/id-image-retention-findings.md`.

### 4. TrustShield gate removal (the September cliff) ⏳ SPEC + TICKET, NOT BUILT
- **Owner reversed D-038:** TrustShield becomes VOLUNTARY. iDenfy credits run out **~late Sept
  (26–29)** — 218 left @ ~6.0/day; top-up unaffordable, so the cliff is certain.
- Spec: `docs/handoff/trustshield-gate-removal-interim.md`. **Ticket G40-410** (Highest, sprint 677).
- 5 changes; **3 traps**: `TRUSTSHIELD_MIN_AGE=1` NOT 0; `TOKEN_GATED_AGES_ONLY` stays false (the
  Aug-6 outage config); **keep the under-21 hide** (`can_request_restricted_items` = the ONLY
  under-21 protection, and it's a DIFFERENT mechanism from TrustShield).
- Rollout web→prototype→live. **Website Updates owns surface 1** (was mid-work). App Prototypes stood
  down (surface 2 queued). Live-app = store release, must be in first release after 8/31.

### 5. Barcode DOB read (iDenfy replacement) ⏳ SPEC, NOT BUILT
- `docs/handoff/id-barcode-age-read.md` — read `DBB` off the PDF417 on the ID back. **ML Kit,
  on-device, both platforms** (owner decided). Fraud control, not compliance (door check is the
  compliance control). §5 corrected: client sends RAW payload, server re-derives (weaker trust
  boundary than a vendor — said so). §9.2: ONE enforcement moment, not two. AAMVA date-format trap
  (`CCYYMMDD` vs `MMDDCCYY`) — needs a real-card trial before the parser.

### 6. BIPA compliance language ✅ DEPLOYED (`196bc40`, launch preview)
- All 5 BIPA elements into ToS + Privacy + TrustShield page + the A/R waiver popover (request +
  connect). Consent-before-collection = ToS acceptance at signup. Numbers = BIPA statutory (3yr /
  30day). Written VENDOR-NEUTRAL (survives iDenfy exit). **Launch language, NOT live gophergo.io.**
  App enrollment consent = store-release item.

### 7. STANDING-RULES.md ✅ (dev-handoff, `e6ac553`, pushed by John)
- "A committed file ships on the next push by anyone" + "a SHA in a handoff is stale." My commit was
  eaten by autopull once (`reset --hard`), restored, then rode to remote via another push.

---

## Deploy status — VERIFIED BY CONTENT (not SHA; `main` shares no history with feature branches)

| Thing | State | Verified |
|---|---|---|
| `!367` authz fix | merged to `production`, auto-deploy pipeline ran | source on `origin/production` |
| Phase 3 step-gates | live both hosts | content grep |
| ID-hygiene (privacy, email-kill) | live both hosts | content grep |
| BIPA + Deals portal + under-30 ID-path | live both hosts (`196bc40`) | content grep, Pages + TigerTech |

---

## Uncommitted / disk-only

- **Code repo:** clean except `.claude/launch.json` (I added `csrv:8241` server entries — config
  noise, not a deliverable) + `.gitignore` + peer's `SESSION-RETIRE-CHECKLIST.md` (not mine).
- **No gitignored disk-only deliverables from me** (the `_prototypes/*/gopher-banner.js` banners I
  only COPIED into throwaway worktrees, never edited).
- Isolated worktree `scratchpad/wt-idhygiene` was `git worktree remove`d. Background http server on
  8251 may still be running (harmless).

---

## What I'd do next, in order

1. **G40-410 is the clock** — check with Website Updates where surface 1 stands; it MUST be in the
   first store release after 8/31 or new under-30 enrollment hits an infinite spinner post-cliff.
2. **Deals merchant portal owner** — I shipped `a2ec9a2` to preview with John's OK but couldn't
   identify the session. John knows which. They should be told it's live.
3. **4.2 counsel review** of the BIPA block + **4.4 AWS console check** (bucket default SSE,
   Block-Public-Access, access logging — invisible to code). Both need a person.
4. **Read-side authz audit** (the `check-route-authz.js` gap, #2 above).

---

## Traps that cost me time (don't repeat)

- **Negative grep is a hypothesis** — I hit it 3×: privacy policy "discloses nothing" (it did, worded
  differently); `id_image` "not in backend" (it was, via multer field name); the naive `<script>`
  splitter false-positived on `gopher-deals.html` (CSS-in-JS strings). Always prove the probe can SEE
  the thing.
- **Working-tree deploy ships EVERY committed file** — the ID-hygiene deploy needed an isolated
  worktree (reset riders to live+my-edit) to ship batch-only. Riders and reverts look identical in a
  diffstat; the only tell is `curl` the live URL.
- **A pinned worktree lacks gitignored banner files** — copy `_prototypes/{Go,Request}/gopher-banner.js`
  in from the clone or preflight aborts.
- **Localhost server from Bash `&` dies when the call returns** — use `run_in_background: true`.
- **The background http server may serve a STALE scratchpad copy** — `curl` + grep a string you just
  wrote before trusting any browser check.

---

## MEMORY.md lines owed (DO NOT append — 12 sessions retiring concurrently; merge in one pass)

- [get_trustshield_files IDOR fixed](trustshield-files-idor-fixed.md) — !367 live; read-side authz guard gap
- [D-038 identity gating](d038-identity-gate-then-voluntary.md) — gated at submit, then owner made TrustShield voluntary
- [TrustShield cliff + gate removal](trustshield-cliff-and-gate-removal.md) — ~late Sept; G40-410; 3 traps
- [Barcode DOB read spec](barcode-dob-read-spec.md) — ML Kit on-device; AAMVA date trap; server re-derives
- [BIPA language shipped](bipa-language-launch-surfaces.md) — 5 elements × 4 surfaces; launch not live; 3yr/30day
- [step-gate module + harness](step-gate-module-shared.md) — mutation-prove or it's decorative
