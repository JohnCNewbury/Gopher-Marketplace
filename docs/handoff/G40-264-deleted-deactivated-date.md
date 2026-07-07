# G40-264 — User report "Deleted/Deactivated date" shows Created date — DEV HANDOFF

**Type:** Task (`spine`) · **Priority:** Medium · Admin Panel / backend. Verified against the 2026-06-12 `gopher-backend-api` export. Status: In Progress (root-caused).

## Root cause (exact)
Two facts combine:

1. **No deletion/deactivation timestamp is ever recorded.** `models/users.model.js` has only a **boolean `deleted`** (`:143`) — no `deleted_at`/`deactivated_at`. `controllers/admin/user.js deactive_user` (`:692`) flips `aasm_state` to `USER_STATE.DEACTIVATED`/`ACTIVATED` and writes an `account_note`, but **stamps no date on the user**.
2. **The report query hardcodes `created_at` for that column.** `controllers/admin/user.js:901` (in `getCSV`, the User report export):
   ```sql
   case when u.aasm_state='Deleted' OR u.aasm_state='deactivated'
     then TO_CHAR(u.created_at at time zone 'UTC' at time zone :admin_timezone, 'mm-dd-yyyy hh:mi AM')
     else null end as "deleted/deactivated date"
   ```
   For deleted/deactivated accounts it emits `u.created_at` verbatim — exactly the reported symptom. (The `else null` branch already satisfies **Scenario 3** — active accounts correctly show null.)

## Two things the query already gets right / a latent bug
- ✅ Active accounts → `null` (Scenario 3 already met).
- ⚠️ **Casing inconsistency:** the CASE tests `'Deleted'` (capital D) OR `'deactivated'` (lowercase). Verify the real `aasm_state` literals (the `USER_STATE` constants). If the deleted state is stored lowercase `'deleted'`, this `'Deleted'` branch **never matches** and deleted accounts fall through to `null`. Align the literals with the actual enum values while fixing this.

## Fix
1. **DB** — add `deactivated_at TIMESTAMP NULL` to `users` (and `deleted_at TIMESTAMP NULL` if hard/soft deletes are tracked separately from deactivation).
2. **Backend stamp the action:**
   - `deactive_user` (`user.js:692`): on deactivation (`deactivate_user === false → DEACTIVATED`) set `deactivated_at = NOW()`; on reactivation, clear it or preserve the last value per the churn definition (decide with the analytics owner).
   - Wherever the delete action lives, set `deleted_at = NOW()`.
3. **Report query** (`getCSV:901`): replace `u.created_at` in that CASE with the real timestamp — e.g. `COALESCE(u.deleted_at, u.deactivated_at)` — keep `else null`, and fix the state-literal casing so both states match. **Check for a sibling on-screen User-report query** with the same pattern (this is the CSV export path; the on-screen report may duplicate it) and fix both.
4. **Backfill** — historical deactivations have no recoverable timestamp (none was ever stored). Per the ticket, pre-fix rows may remain inaccurate; note it rather than fabricate dates.

## Go-forward surface
The Admin Panel is being replaced by the **HQ Dashboard** (`Documentation/Dashboard/`); its churn/attrition metrics should read the new `deactivated_at`/`deleted_at`. Ties to G40-95 / G40-103 (user report fields).

## QA
- Deactivate a test account → User report shows today's date in Deleted/Deactivated date; Created date unchanged (Scenario 1, 2).
- Delete a test account → shows the delete date (verify the state-literal casing matches).
- Active account → column is null (Scenario 3 — already works).
- Both deleted and deactivated states covered.

## Files
- `models/users.model.js` (+ migration) — add `deactivated_at` / `deleted_at`.
- `controllers/admin/user.js` — `deactive_user` (`:692`) stamp the timestamp; `getCSV` (`:901`) read it instead of `created_at` + fix state casing; check for a sibling on-screen report query.
