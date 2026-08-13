# Canonical service categories — the ONE list

**Owner-confirmed 2026-08-13.** Read this before writing any category list anywhere.

## ⛔ Why this file exists

There was no authoritative record of the service taxonomy, so every session derived it by
grepping whichever file it happened to open — and got a different answer each time. Three
separate wrong lists reached real work before the owner caught them:

| Where | What it claimed | Reality |
|---|---|---|
| A working doc built for the owner | `Cleaning`, `Handyman`, `Other service` | **None of these exist.** Invented by pattern-matching plausible service names. |
| `Final/gopher-go.html` work-settings cards | `Yard / Outdoor` | Customer apps say **`Yard / Outdoor Projects`** |
| A session's build plan | "the 7 categories" | There are **8** customer-facing |

None of these errored. A wrong category is a **silent** failure: it renders fine, saves
nothing, and is only caught by a human recognising the words are wrong. That is why the list
lives in a doc now and not in whichever file you found first.

## 1. The customer-facing taxonomy — 8 categories

Taken from the live Step-1 pickers in Request and Connect. **This is what a customer sees and
what a worker should choose from.**

| # | Category |
|---|---|
| 1 | Delivery / Errand |
| 2 | Junk Removal |
| 3 | Moving |
| 4 | Home / Office Services |
| 5 | Hourly / Day Labor |
| 6 | Yard / Outdoor Projects |
| 7 | Ride Sharing |
| 8 | Other |

⚠️ **Connect and Request disagree on two labels — fix at source, do not propagate.**
Connect renders **"Delivery / Courier"** and **"Other / Custom"** where Request renders
**"Delivery / Errand"** and **"Other"**. Everything else matches. **Follow Request**; it
carries the job volume, and "Errand" matches the server's Delivery sub-types.

## 2. The work-settings API vocabulary — 7 values, different words

`GET/PUT /api/v1/users/worksettings` keys its `selectionMap` by **its own** values, which are
**not** the customer labels. Source of truth: `controllers/user/worksettings.js`,
`categorySelectionOptions` — and the GET response ships the whole list in `categoryOptions`,
so **ask the server rather than hardcoding**.

| Customer label | `selectionMap` key |
|---|---|
| Delivery / Errand | `Delivery` |
| Junk Removal | `Junk Removal` |
| Moving | `Moving` |
| Home / Office Services | `Home Services` |
| Hourly / Day Labor | `Hourly / Day Labor` |
| Yard / Outdoor Projects | `Yard Project` |
| Ride Sharing | `Need a Ride` |
| **Other** | **— none —** |

**Only three of eight match outright.** A wrong key does not error; the selection simply never
persists.

### 2.1 Age-restricted is a SUB-TYPE, not a category

The Go work-settings pane carries an "Delivery — Age-Restricted" card by owner decision
(2026-07-23). Server-side it is the two `isAgeRestricted` sub-types of Delivery:
`Delivery-Alcohol` and `Delivery-CBD/Other`. Selecting it must also select `Delivery` — a
sub-type without its parent is not something the server can act on.

### 2.2 Fields that look settable and are not

`minEarnings` is returned by the GET but is deprecated in the controller's own words
(*"being removed as a filterable field"*), and `setWorkSettings` **forces `offer_limit` to 0**
regardless of what is sent. Do not build UI that implies either can be set.

## 3. Deals categories are a DIFFERENT list — do not cross them

Gopher Deals has its own four registerable categories plus a publication-only fifth
(`restaurants` · `favorites` · `age` · `retail` · `providers`), settled by owner ruling
2026-08-05. See `deals-registration-to-publication-config.md` §9.1. **A Deals category is not a
service category and they must never be mapped onto each other.**

## 4. Rules

1. **Never write a category list from memory or by pattern-matching.** Take it from this file,
   or from the server's `categoryOptions`.
2. **Never bind a UI label to a near-miss server value.** If there is no exact match — `Other`
   is the live example — leave it unmapped and say so.
3. **Validate at runtime.** `GoWork.validate()` in `Final/gopher-go.html` checks every mapped
   value against the `categoryOptions` the server actually sent and reports drift, because the
   failure mode is silence.
4. **If a label changes, change it here first**, then in the surfaces.
