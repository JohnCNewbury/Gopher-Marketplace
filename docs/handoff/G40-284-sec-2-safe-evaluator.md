# G40-284 (SEC-2) — Replace `eval`/`new Function` with a safe evaluator

**Type:** Task · **Priority:** Highest · `security` · **Status:** groomed dev-ready — 2026-07-05.
**Scaffold (already built):** `Documentation/Jira Tickets/safeEval.js` — tokenizer → token substitution → shunting-yard → arithmetic. Supports `{token}` **and** bare-identifier substitution, `+ - * / %`, unary minus, parentheses, decimals. Rejects unknown tokens/characters and any code execution.
**Verified against:** the 2026-06-12 mobile exports (`gopher-mobile-request`, `gopher-mobile-gopher-`).

## Affected call sites — the catalog (this was the ticket's missing dependency)
There is **no `eval(`** anywhere. The risk is `new Function("return " + expr)()`, and it lives in **one shared file that exists in BOTH apps**:

`src/actions/action.js` — a JSON-driven dynamic-form engine. Config supplies expression strings with `{variable}` tokens; the engine substitutes `formik.values[variable]` (or `values[variable]`) then evaluates the result as JS to get arithmetic results. **8 sites total (4 per app):**

| Function | Request app | Go app | What it evaluates |
|---|---|---|---|
| `evaluateExpression(formik, action)` | `action.js:130` | `action.js:129` | `action.expression` with `{tokens}` → number, written to `action.targetControl`. |
| `isValidMathExpression(expr)` (inside `mappingVariable`) | `action.js:151` | `action.js:150` | **Validity probe** — runs `new Function` purely to test if the substituted string is evaluable (try/catch → bool). |
| `mappingVariable` — `item.name2` branch | `action.js:170` | `action.js:171` | Substituted `item.value` → number when it's a valid math expr, else the substituted string. |
| `mappingVariable` — `else` branch | `action.js:182` | `action.js:183` | Same, for the flat `item.name` case. |

Both are near-identical copies (shared boilerplate) — fix must land in **both** repos.

## Behavior to preserve (important — not just "swap the call")
The engine has a **fallback contract**: substitute `{tokens}`; **if** the result is valid arithmetic → use the computed number; **else** → keep the substituted *string* (e.g. a name, an address). `new Function` throwing is how "not math" is currently detected (`isValidMathExpression`). `safeEval` throws on the same inputs (unknown token / bad char), so wrap it the same way:

```js
import { safeEval } from "../helpers/safeEval";   // ESM — see "Placement" below

// evaluateExpression — replaces action.js:130 / :129
formik.setFieldValue(action.targetControl, safeEval(replacedExpression));

// isValidMathExpression — replaces the :151 / :150 probe
function isValidMathExpression(expr) {
  try { safeEval(expr); return true; } catch { return false; }
}
// the :170/:171 and :182/:183 evaluations then stay structurally identical,
// calling safeEval(replacedExpression) where new Function(...) was.
```

Keep the existing `{token}` regex substitution that produces `replacedExpression` — the fallback branches need the substituted *string*. `safeEval(replacedExpression)` then evaluates the already-substituted numeric string with an empty context. (Optional cleanup: pass the raw expression + context in one step — `safeEval(action.expression, formik.values)` — since the scaffold does substitution itself; but the two-step keeps the diff minimal and the fallback obvious.)

## Placement
The scaffold is CommonJS (`module.exports = { safeEval }`); the apps are ESM. Drop it in each app as `src/helpers/safeEval.js` and change the last line to `export { safeEval };`. (`src/helpers/` already hosts the sibling utilities `action.js` imports.)

## Two latent bugs found while cataloguing (fold into the fix or file follow-ups)
1. **Go app, `action.js:129`** — `new Function("return" + replacedExpression)()` is **missing the space** after `return` (request app has it). `"return"+"10+3"` = `return10+3` → always throws. Switching to `safeEval(replacedExpression)` fixes this incidentally; note it so QA expects a behavior change on that path.
2. **`evaluateExpression` guard is always-true** — `if (action.expression !== "{0}" || action.expression !== "0")` uses `||` where `&&` was intended (a value can't equal both), so the `"{0}"/"0"` short-circuit never fires. Preserve or correct deliberately — don't copy the bug forward silently.

## Edge cases for regression tests (real form expressions)
- Known-good arithmetic: `"{base} + {tip} * 2"`, `"({a} + {b}) / 2"`, decimals, unary minus → outputs match old `new Function`.
- Non-math fallback: substituted value is a string (name/address) → `safeEval` throws → substituted string retained (matches today).
- **Undefined/null token** — `formik.values[x]` undefined → old code produced `"undefined + 3"` (→ `NaN`, no throw) or `"null + 3"` (→ `3`); `safeEval` throws on `u`/`n` and falls back to the string. **This is a divergence** — decide the desired behavior and lock it with a test (recommend: treat unknown token as non-math → fallback, which `safeEval`'s `context` path gives you for free).
- Malicious payload: `"process.exit(1)"`, `"global"`, `"this.constructor"` → old code **executes**; `safeEval` rejects (unexpected character/unknown token). This is the whole point — assert rejection.
- `isValidMathExpression("")`, unbalanced parens, divide-by-zero → `safeEval` throws (was: `new Function` throws or returns) — align expectations.

## Acceptance (maps to the ticket)
- No `eval`/`new Function` in `action.js` in **either** app · safe evaluator handles `{token}` substitution + math · existing outputs preserved (regression tests from real expressions) · malicious input rejected, not executed · scaffold placed as ESM `src/helpers/safeEval.js` in both repos.
