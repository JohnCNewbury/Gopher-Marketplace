# Cross-device resume — start a request on the web, finish it in the app

**Goal (owner, 2026-08-03):** begin a request on a computer at home, get pulled away,
open the app, and carry on exactly where you left off.

**Status:** the platform-neutral half is **built and tested**. The live app half is
**specified with a single surgical integration point**, and is not merged — see §5.

---

## 1. The finding that shapes everything

The live Request app **cannot express a resumable request today**, and the gap is
structural rather than a missing API call. Verified against
`gopher-mobile-requester @ origin/production e0a56bb3b`:

| What we need | What the live app does | Where |
|---|---|---|
| One request object | Per-**screen** Formik values, merged forward through react-router history | `pages/renderForm.js:307`, `actions/action.js:554` |
| Something to persist | **Nothing is persisted.** Force-kill mid-request and the work is gone | no `redux-persist` / `Preferences` / storage key holds form values |
| Serializable data | `attachment` holds live **`File` objects** mixed with URL strings | `imageuploadfororder.js:67-68` |
| Data separate from UI | UI flags are generated INTO the same object: `cost_of_goodsvisible` sits beside `cost_of_goods` | `action.js:98`, `setRequestDetails.js:13-15` |
| Stable field names | Three naming layers: Formik ≠ canonical ≠ submit payload (`attachment`→`attachments`, `gophers_needed`←`gopher_needed`, `line1` vs `street_line1` in one body) | `helpers/orderObject.js` |
| Consistent units | Money is dollars in Formik, ×100 for summary, ÷100 on rehydrate | `alcohol.json` onload_actions |

There was also **no draft concept server-side** — no table, no column, no endpoint
(`grep draft|cart|resume|autosave` across models, migrations, routes: zero).

**So this was never a wiring job.** Both ends had to be built.

---

## 2. What is built (all tested, all committed)

### The kernel — `Final/assets/js/gopher-request-draft.js`
Defines what a resumable request **is**: the contract fields, what never travels, how
two devices reconcile, what must be re-derived on arrival. Pure — no DOM, no fetch, no
globals — so the same file runs in the static web build, a React/Capacitor bundle, and
a Node test.

**UMD dual export.** The older shared modules are IIFE + `window.X`, which a bundler can
only consume for side-effect — a real obstacle to the React/Capacitor target. Everything
new here exports as CommonJS, AMD **and** a browser global.

### The store — `Final/assets/js/gopher-request-draft-store.js`
Where drafts live and when they move. Adapters for memory, web `localStorage`, Capacitor
`Preferences` (injected — this file never imports `@capacitor/*`), the remote API, and a
tiered local-first/write-through combination. Plus the autosave controller: debounce,
coalescing, dedupe, offline retry with backoff, conflict surfacing.

### The map — `Final/assets/js/gopher-request-draft-map.js`
Canonical ⇄ live-app Formik fields: renames, address shapes, schedule booleans → enum,
UI-flag stripping, `File` exclusion.

### The server — branch `feat/g40-request-drafts` in `gopher-backend-api`
`GET / PATCH / DELETE /api/v1/requests/draft`. One JSONB draft per requester, modelled on
the existing `user_jsons` + `users/onboarding` store rather than inventing a pattern.

### Tests
```bash
node docs/handoff/request-app-parity/test-draft-store.js   # 67 assertions
node docs/handoff/request-app-parity/test-draft-map.js     # 31 assertions
npm run test:request-drafts                                # 23, in the backend repo
```

---

## 3. The rules that are decisions, not implementation details

**Identity documents and photos never travel.** `idVerification` carries data-URL
photographs of a government ID and a live selfie; `picThumbs[].src` are full base64
images. Excluded for three independent reasons, any one sufficient: it is PII being
duplicated into a convenience cache; the API logs whole request bodies when the socket
debugger flag is on; and the draft endpoint shares a **30 req/sec global limiter** and a
10 MB body limit with live order traffic. A photo **count** travels so the resuming
device can say what to re-attach. Enforced client-side by whitelist and again
server-side by `assertSafeDraft()` — a client regression must degrade autosave, not copy
ID photographs into the database.

*Measured: a state carrying multi-megabyte base64 images serialises to a ~500-byte draft.*

**Consent is re-taken, never inherited.** A liability waiver ticked on the phone does not
pre-tick on the laptop, where the user could submit without ever seeing it. Carrying data
forward is convenience; carrying consent forward is not ours to do. Same for the
low-offer acknowledgement. One-line change if the owner disagrees (`RECONSENT_FIELDS`).

**Gates re-run on arrival.** Age-restricted, category-mismatch, duplicate and
availability acknowledgements are transient by design: the resuming device re-derives
them from the description that actually arrived, so a resumed request is validated
identically to a fresh one.

**Stale decisions are dropped, typed input is kept.** A scheduled date in the past is
cleared (with a note for the UI); a promo code keeps the text but loses the "applied"
verdict, because the server revalidates at submit anyway.

**Conflicts ask the user.** Whole-draft, never field-level auto-merge: this form has
interdependent fields (category scoping, pay mode, schedule), and merging can assemble a
request neither device ever displayed. When both sides have moved, the server returns
**409 with the stored draft** and the user chooses. Silent clobber is the failure users
never forgive.

**Autosave is paced to a budget.** One global 30 req/sec limiter, before routing, shared
with order creation — and behind a proxy it keys on the proxy IP, so every requester
shares the bucket. Hence debounce-on-idle (2.5 s), a hard floor between remote writes
(8 s), coalescing, dedupe, and `flush()` on step change / app background. **Do not lower
these without understanding that limiter.**

---

## 4. Wiring the web app

Load the three modules after the existing shared ones, then:

```js
var Store = GopherRequestDraftStore;
var store = Store.createStore({
  origin: 'web',
  // A FUNCTION, not a value. The store calls it only when it is about to persist a
  // draft, so a visitor who never starts a request is never given a device id. Minting
  // it eagerly means every page load stamps a permanent identifier — inert while it
  // stays local, but it would travel to the server the day the remote tier is enabled.
  clientId: getDeviceId,
  adapter: Store.tieredAdapter(
    Store.webLocalAdapter({}),                       // offline + signed-out resume
    Store.remoteAdapter({                            // cross-device — omit if signed out
      baseUrl: API_BASE,
      getHeaders: function () { return { 'access-token': token }; }
    })
  ),
  onConflict: function (local, remote) { /* show both, let the user pick */ }
});

// after every state change (render tail is the natural hook):
store.touch(state);
// step transitions / pagehide / visibilitychange:
store.flush(state);
// on submit or explicit discard:
store.discard();

// at load:
store.load().then(function (found) {
  if (!found) return;
  // found.summary → { description, step, picCount, updatedAt, origin }
  // on accept:
  var r = store.resumeInto(found.draft, makeInitialState());
  Object.assign(state, r.state);   // r.notes drives honest copy
  render();
});
```

**Honesty rule (this repo's standing one):** with no remote adapter configured the resume
is *this device only*. The UI must not imply cross-device sync until the API base URL and
a real token are wired — same trap as the 2026-06 `gopher-request.html` copy fixes.

---

## 5. Wiring the live app — one integration point

The app already passes accumulated values forward on every screen transition:

```js
// src/actions/action.js:554
export function Navigate(action, navigate, values) {
  navigate("/form", { state: { next: action.path, hideBottom: action.hideBottom, values } });
}
```

That is the hook. `Navigate` is where a complete-so-far snapshot exists, and it is
already called on every forward move:

1. `stripEngineNoise(values)` → `fromLive(...)` → `store.touch(...)`.
2. Resume check at the category entry screen; on accept, `toLive(draft.data)` into the
   Formik `initvalue` merge that already exists at `renderForm.js:301-305`.
3. Adapter: `capacitorPreferencesAdapter({ Preferences })` + `remoteAdapter` using the
   existing `access-token` from `localStorage`.

The modules are UMD, so CRA consumes them with a plain `require` — no build change.

**Not built, deliberately.** This is live production code under the standing
no-live-changes rule, and it is the one part of this work where a mistake reaches real
users mid-request. It wants a branch, a review and a device test, not an unattended
commit.

---

## 6. Open items for the owner

1. **Category has no stable id.** The live app carries `category_type` /
   `sub_category_type` as free-text display strings (`"Other"`, `"Mulch Project"`) — the
   same missing `category_id` already documented against order analytics. The map covers
   the values confirmable from the repo, preserves anything else verbatim under
   `categoryRaw`, and *reports* it as unmapped rather than guessing. Production should
   introduce a real category id.
2. **Photos on resume.** v1 does not transfer them, by the PII/size rule above. If they
   should survive, the path is uploading to the existing S3/attachments infrastructure
   before submit and syncing URLs — which adds orphan cleanup. Owner decision.
3. **One draft per user** is the current model ("pick up where I left off" is singular).
   Multiple concurrent drafts would need a `draft_id` and a picker.
4. **Deploying the backend branch** merges to `production`, which auto-deploys.
   ⚠️ **Corrected 2026-08-26: it is PUSHED, not "unpushed."** `feat/g40-request-drafts` is on
   the remote at `f8542ac0` and its suite was re-run there the same day — **PASS, 0 failures**.
   `origin/production` carries **0** draft references, so it is *unmerged*, which is the accurate
   word. The distinction matters: "unpushed" reads as work sitting on one machine that could be
   lost; this is reviewable, fetchable, and one merge from live.

---

## 7. Provenance

Traced from clean detached worktrees of `origin/production` — mobile
`e0a56bb3b`, backend `98ce5744` — never from `main` or a work branch. The shared clones
in `Dev/` were left on their own sessions' branches, untouched.
