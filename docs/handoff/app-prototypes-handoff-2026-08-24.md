# App Prototypes — session handoff, 2026-08-24

**This is an INDEX into a transcript, not a diary.** The transcript is never deleted and stays
full-text searchable. Everything below exists so you can *find* what was already worked out
instead of re-deriving it.

- **Transcript:** `~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/4ca34573-81ba-48cc-8f88-c2f72607b11d.jsonl`
- **Lane:** `_prototypes/` — the Go + Request app blueprints, the split-screen harness, and the
  canonical flow docs that govern them. **Not** the `Final/` web build (that is Website Updates).
- **Span:** 2026-08-17 → 2026-08-24.

## Grep anchors

Search the transcript or the repo for these — each one lands in the middle of a worked problem:

| Anchor | What it finds |
|---|---|
| `workerSelection` / `wsMode(` | the acceptance-path enum + the relay's normaliser |
| `requesterPicks` | the three-acceptance-path logic in `split-screen.html` |
| `statusBucket(` | Submitted vs Scheduled vs Active bucketing |
| `CATEGORY_SCOPED_KEYS` / `realignCategoryState(` | the 26-key category-switch reset |
| `idVerifiedNow(` | the TrustShield identity gate (3 refs — see below) |
| `FIELD_HIDDEN_FOR` | ⚠️ a **HIDE** list, not a show list — polarity trap, see below |
| `ptSyncHome` / `__ptApprove(` / `__ptConfirmed(` | harness seams for driving a live demo |
| `confirmSeen` / `ratingSeen` / `navSeen` / `flagSeen` | the Reset-demo seen-maps |
| `7ab7a68` `254c788` `5b017aa` `3b63a14` `b9a2d12` | the load-bearing commits |

## State of play

**All my work is committed.** `git status` shows nothing of mine — the modified
`.claude/*` files and the three `docs/handoff/*-2026-08-24.md` files belong to other
retiring sessions.

### Disk-only files I touched (invisible to `git status` — this is the section that matters)

Most of `_prototypes/` is gitignored. I touched exactly **one** disk-only file:

- `_prototypes/Go/gopher-go-canonical.html` — the byte-identical mirror of
  `Documentation/Canonical Go Flow - Master/gopher-go-canonical.html`.
  **Verified IN SYNC at retire time** (both `0e79904a7035`). If you edit either, re-sync the other.

I did **not** touch `_prototypes/Go/gopher-banner.js` or `_prototypes/Request/gopher-banner.js`
(the other two gitignored allowlisted files). They still exist on disk and a **pinned-worktree
deploy will abort until you copy them in from the clone** — that is expected, not a fault.

Both canonical Request-flow copies also verified in sync at retire time (`19f57d21f002`):
`Canonical Request Flow - Master /connect-flows-granular.html` and the `Dev-Handoff-FeeModel/` copy.

### Mirrored to `Final/` vs deliberately NOT

| Change | Prototype | `Final/` web | Why |
|---|---|---|---|
| Acceptance paths (3-way split) | done | **canonical doc corrected, web not re-verified** | doc is the source of truth; web build was not in my lane |
| `workerSelection` `'prioritize'`→`'my'` | done | **legacy alias kept** | old records still carry `prioritize`; `wsMode()` normalises on read AND write |
| Submitted/Scheduled bucketing | done | not mirrored | web dashboard has its own bucketing; raise before copying |
| Set-price vocabulary (not "bid") | done | not audited | worth a sweep on the web build |
| Stairs end-to-end | done | not mirrored | web request flow does not emit stairs |
| Modal system unification (G40-308) | n/a | **done on all 4 portals** | this one went the other way |
| Scrim/visual changes | **reverted** | **reverted** | ⛔ owner rule below |

## ⛔ Standing owner rules that bit this session

1. **"Do not implement any changes to current UI without showing me a side-by-side comparison
   of proposed vs current. I'm happy with most of the current UI, if not all of it."**
   I shipped a scrim unification without asking and had to revert it byte-identical across
   3 files (a surgical revert mis-ordered same-length swaps — I had to restore wholesale from
   backups). Owner then ruled **"Keep current look."** Memory: `ui-changes-need-side-by-side-first`.
2. **"MY is always capitalized for Michael Yorrie (our first Favorite Gopher)."** Not a style
   choice. It is why the enum value is `my` and why the copy reads *MY Gophers*.
3. **Stand down on the TrustShield gate removal until Website Updates has wired Connect and
   Request web.** See the open question below — that precondition is now MET.

## Traps that cost me time

- **`FIELD_HIDDEN_FOR` is a HIDE list.** `isVisible = (f) => !FIELD_HIDDEN_FOR[f].includes(state.category)`.
  Removing a category from the list **enables** the field. I wrote a comment describing the
  opposite and had to correct it in `d3211f4`. Read the predicate before trusting a name.
- **Verifying a gate by reading a downstream fee line proves nothing.** My first TrustShield
  check read a line that only renders on the review step, so it returned `false` for all four
  cases — including two that should pass. **Evaluate the condition itself.**
- **A "pinned to bottom" assertion that measured the wrong box.** I compared `nav.bottom` to the
  *frame* bottom, but the Go frame grows past the viewport, so it always passed. The real defect
  was the shared `.nav` rule missing `position:sticky`. **Assert against the viewport, not the parent.**
- **Any negative probe is a hypothesis.** A grep for `stairs:` found nothing because the string is
  built by runtime concatenation. Prove the probe can SEE a known-present case before believing a
  zero. Memory: `negative-grep-is-a-hypothesis`.
- **Mutation-test your harness assertions.** `if(false && …)` around my identity gate left the
  harness **PASSING** — it caught deletion but not disabling. A green test that cannot fail proves
  nothing.
- **The split-screen seen-maps survive "⟳ Reset demo"** unless explicitly cleared, and order id
  `GR-00128` is reused every run — so a warm harness silently suppresses relays and you diagnose
  the harness instead of the product. Reload `split-screen.html` between scenarios.
- **`git` author does not identify a session** — every commit is "John Newbury". Read the sibling
  paths in the same commit to find the owning lane.
- **A pinned deploy can be a REVERT.** Pin at your own *latest* commit, never an older one.
  Riders and reverts look identical in a dry-run diffstat; one `curl` tells them apart.

## ⚠️ OPEN — needs John, not a peer

**TrustShield gate removal, surface 2 of 3 (G40-410) is now unblocked and I did not do it.**

- Owner ruled 2026-08-24: *"You are to stand down on this until Website Updates can wire Connect
  and Request web."* He confirmed the change itself is correct and coming.
- **That precondition is now met.** Verified at retire time: commit `77b4617`
  *"TrustShield gate removed from both web surfaces — G40-410 surface 1"*, and
  `Final/gopher-request.html` + `Final/gopher-connect.html` both contain **0** occurrences of the
  gate string. My file still contains **1**.
- **The change is one condition** in `stepGate()` in `_prototypes/Request/gopher-request-flow.html`:
  ```js
  if(state.step===2 && state.category==='delivery' && state.ageRestricted && !idVerifiedNow())
    return {ok:false,sel:'.ts-promo',msg:'Verify your identity for this age-restricted order to continue.',tone:'alert'};
  ```
- **Touch exactly one of the three `idVerifiedNow` references:**

  | Line (approx) | What | Action |
  |---|---|---|
  | 1144 | the function itself | **keep** |
  | 1223 | `ts-verified` — *"Identity verified…"* | **keep** |
  | 2078 | the gate | **remove** |

  Removing all three deletes **the perk, not the gate**. Voluntary-but-visible is the end state.
- **⛔ There is NO under-21 logic in this prototype to preserve.** The spec originally asked for it;
  App/Web Sync verified and corrected that to web-only in `c093f50`. Zero `isMinor`,
  `calculateAge`, `customerAge`, `date_of_birth`. Every `21` is copy. An acceptance criterion
  asserting the prototype preserves an under-21 gate would **pass vacuously**.
- **Harness:** App/Web Sync owns updating all six assertions atomically with the change. When it
  lands, `prototype enforces the RULED gate` will fail **correctly** — but that failure is not
  evidence the check is sound (it is blind to a *disabled* gate).

**Ask John for a direct go before touching it.** A peer cannot authorize it, and the last word
from him was stand down.

## MEMORY.md lines owed

⛔ Not appended — MEMORY.md is over its limit and twelve sessions are retiring concurrently.
Add these lines by hand later:

```
- [Three acceptance paths](three-acceptance-paths-canon.md) — First Available · I'll select · Prioritize MY is SPLIT; enum 'my' not 'prioritize'
- [Submitted vs Scheduled bucketing](submitted-vs-scheduled-bucketing.md) — acceptance is the gate; submitted stays Submitted even if scheduled
```
