# Date of birth sent as arithmetic — client-side investigation

**2026-08-31.** Handed over by the Sentry session, which patched the backend (MR !448, commit
`53791a18`) and asked this session to find the client cause. **That session was unreachable by the
time these findings were ready** — its id and its name both fail to resolve, so this file is the
delivery. Anyone picking the work up should read it alongside the handover in that session's
transcript.

## The bug, as handed over

A stored `YYYY-MM-DD` date of birth is evaluated as a maths expression before being sent, so the
server receives a bare 4-digit number: `1962-06-22` → `1934`. Two confirmed production cases —
user 97424 on 2026-08-30 (seven 500s, could not save a profile at all) and a second on 2026-08-22.
The backend now drops the mangled value rather than writing it, so existing users are unblocked; a
brand-new user whose app mangles the value still cannot onboard.

⛔ **All of the backend detail above is INHERITED from the Sentry session, not verified here.**
Everything below the line is first-hand.

---

## 1. The guards ARE in the shipped builds — release hypothesis is dead

The handover's leading hypothesis was that the guards exist in the repo but not in the builds users
run — the same shape as the live-tracking fix. **That is false for 3.9.1.**

Verified by reading the file at the release tags rather than by commit ancestry, because SHA-based
deploy checks have produced false answers on this project before:

| tag | guard evidence |
|---|---|
| `release/android-864`, `release/ios-863` (GO) | `stringFields` incl. `"date_of_birth"` :153 · `stringFields.includes(item.name)` :173 · `isDateString(expr)` :177 |
| `release/android-852` (Request) | same three at :146 / :167 / :171 |

⚠️ **Correction to the handover:** `c10078700` **does not exist in the requester repo.** It is a
Go-repo commit ("Release to production - March 2026"); `git cat-file -t` in the requester repo
returns *"Not a valid object name"*. Request received its guards by a different commit, so the
cross-repo citation does not hold.

## 2. The failing client is Gopher GO, not Request

The Request app carries a **third guard the Go app does not**, immediately after
`coerceIfExpression` (`action.js` ~:207 as shipped):

```js
if (stringFields.includes(item.name) && finalValue != null) {
  finalValue = String(finalValue);   // "Asegurar que campos específicos siempre sean strings"
}
```

Go's flat-field branch ends at `coerceIfExpression(replacedExpression)` with **no `String()`
coercion**.

The handover reports the server received `date_of_birth: 1934` **as a JSON number, not a string**.
The Request app cannot produce that — it stringifies every `stringFields` value on the way out.
**So the failing client is Gopher Go.**

⚠️ Falsifiable: if either Sentry event turns out to have come from the Request app, this reasoning
is wrong and should be discarded rather than worked around.

## 3. `evaluateExpression` is NOT the path

The handover flagged it as an unguarded evaluator and the leading suspect. It is unguarded, but it
is not wired to this data.

Every evaluator call site in both apps — `safeEvaluate`, `trySafeEvaluate`, `new Function`, `eval`:
**exactly two per app**, both in `action.js` (the guarded `evalMathExpression`, and
`evaluateExpression`).

Every `expression` action in every schema JSON in both repos, by `targetControl`:

> `vol_cubic_yards` · `cost_of_goods` · `area_square_feet` · `cog_diplay` · `total` ·
> `total_offered` · `total_wage_offered` · `hourly_wage_offered` · `wage_per_gopher` ·
> `gopher_offering` · `smart_pricevisible`

Pricing and geometry only. **Nothing targets or references `date_of_birth` in either app.**

Still worth closing as hardening — an unguarded evaluator on user data earns its removal on its own
merits — but it is not producing this defect.

## 4. The only guard bypass that exists

`CallApi`, Go `src/actions/action.js`:

```js
const patchPayload = action.mapping ? formdata : formik.values;
```

**With a mapping**, the body is the guarded `formdata`. **Without one**, it is raw `formik.values`
and `mappingVariable` never runs — so no guard applies at all. That is exactly the "entire 76-key
view model" body the handover observed, and it is the only bypass found.

## ⛔ 5. What could NOT be established

**What writes a number into `formik.values.date_of_birth` in the first place.**

Every `setFieldValue` in the shipped file was traced: `UpdateValue` routes through the guarded
`mappingVariable`; `SetValue` / `StoreValue` copy values verbatim; `evaluateExpression` is not wired
to DOB. **In the current Go code the path cannot be constructed.** That is stated as a limit, not
softened into a hypothesis.

## 6. The question that settles it — needs Sentry or DB access

**What `app_version` were the two affected events on?** The Sentry release tag, or
`users_roles.app_version` for user 97424. Production DB reads are classifier-blocked in this
session.

- **If the March build** — everything fits. The verified code is 3.9.1, live 2026-08-29; the 08-22
  case predates it entirely, and the 08-30 case at 22:34 UTC is well within the window where a user
  has not yet updated. That would make this **already fixed by the release that shipped on the
  29th**, with the remaining exposure being un-updated installs — a materially different conclusion
  from "the client is still sending arithmetic."
- **If 3.9.1** — there is a live path not found here, and the next step is the full PATCH body from
  the Sentry event, worked backwards.

## 7. Not done, and why

No change was made to either mobile repo. Both already carry open client MRs awaiting the owner's
merge and device QA (G40-188 — GO !261, Request !249, a ship-together pair). Adding a third change
for an unconfirmed cause would muddy that pair for no proven gain.

**Recommended order when someone picks this up:** answer §6 first. It decides whether there is any
client work at all.
