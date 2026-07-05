# G40-103 — Gopher HQ Dashboard: Users detail must carry the FULL user record (with DB source map)

**Jira:** G40-103 (Bug, Low) · Label `spine`
**Assignee:** John Newbury
**Re-scope (John):** the legacy Admin Panel already shows main categories; the go-forward concern is
the **Gopher HQ Dashboard** — its Users detail drawer must include **ALL** user info (Work Settings &
Radius, Ride Sharing, Business, Ratings, etc.). This doc gives the developer the **exact DB source for
every field** so there is zero discovery.

---

## Requirement is already documented (verified)

The "mirror the full production View User" intent is written in the dashboard's own notes —
`Documentation/Dashboard/CARRYOVER.md` §"DETAIL DRILL-DOWN": *`openUserDetail(id)` … render a slide-in
drawer mirroring the production "View User" … page*, and it tracks fields *"NOT yet embedded (owner
deferred, PII decision pending)."* So completeness is the stated goal; this ticket names the remaining
missing fields and their sources.

## Current gap (what `openUserDetail` renders today — `Dashboard/app_part4.js:1885`)

Present: Profile (email, state, zip, device, found-via, signup) · Contact (phone, DOB, address) ·
Verification (email, TrustShield, Stripe ×2) · Activity (logins, requests, completions, gopher type) ·
Order log · Communication.

**Missing:** Work Settings & Radius (**main categories, sub-categories, radius**), Ride Sharing Info,
Business Info/Address, Ratings (avg + total), Payout Status, Last check-in, Requesting Primarily,
Discover Gopher.

---

## DB source map — every field → table.column

**Authoritative source: `gopher-backend-api` → `controllers/admin/user.js` → `get_user_by_id` (the query
that feeds the production "View User" page).** Column aliases in parentheses.

### Base identity — table `users` (alias `u`)
| Field (View User) | DB column |
| --- | --- |
| ID# | `users.id` |
| First / Last name | `users.first_name`, `users.last_name` |
| Telephone | `users.telephone` |
| Email | `users.email` |
| Email confirmed | `users.confirmed_at` (non-null = Yes) |
| Date of Birth | `users.date_of_birth` |
| Profile Status | `users.aasm_state` (COALESCE → 'active') |
| TrustShield | `users.trust_shield_verified` (+ `users.trust_shield_verified_on`) |
| Last check-in | `users.current_sign_in_at` |
| Creation Date | `users.created_at` |
| Last Updated | `users.updated_at` |
| Requesting Primarily | `users.requesting_primarly` (+ `users.requesting_primarly_others`) |
| Discover Gopher | `users.discover_gopher` (+ `users.discover_gopher_others`) |

### Role / Work Settings — table `users_roles` (Gopher = role_id 2, Requester = 3, Admin = 1)
| Field | DB column |
| --- | --- |
| Requester / Gopher / Admin flags | existence of `users_roles` row with role_id 3 / 2 / 1 |
| Device / Device info / App version | `users_roles.device_type`, `.device_info`, `.app_version` (per role) |
| **Available for categories (MAIN)** | **`users_roles.selecttype`** (role_id 2) — comma-joined; written by `controllers/user/worksettings.js:244` |
| **Available for sub categories** | **`users_roles.selectsubtype`** (role_id 2) — comma-joined; `worksettings.js:245` |
| **Gopher Radius** | **`users_roles.radius`** (role_id 2) |
| Gopher Offer limit | `users_roles.offer_limit` (role_id 2) — deprecated, always 0 (`worksettings.js:219`) |
| Gopher Type (Pro / Pro+ / Elite) | `users_roles` gopher-tier field (role_id 2) — see G40-199 rename |
| **Payout Status** | Stripe connected-account **`payouts_enabled`**, keyed by `users_roles.stripe_id` (role_id 2). NB: the admin endpoint strips `stripe_id` from the payload at `user.js:173` — expose a derived `payout_enabled` boolean instead of the raw id |

### Ratings — table `ratings`
| Field | DB source |
| --- | --- |
| Average Rating | `AVG(ratings.score) WHERE rated_id = user.id` (`user.js:36`) |
| Total Ratings | `COUNT(*) FROM ratings WHERE rated_id = user.id` (`user.js:35`) |

### Addresses — table `addresses` (polymorphic `addressable_type`)
| Field | DB source |
| --- | --- |
| Home Address (Line1/2, City, State, Zip) | `addresses WHERE addressable_type='User'` → `line1,line2,city,state,zip_code` (`user.js:64`) |
| Business Address | `addresses WHERE addressable_type='BUSINESS'` (`user.js:254-257`) |

### Profile photo — table `images`
| Field | DB source |
| --- | --- |
| Profile picture | `images WHERE imageable_type='User' AND user_id=user.id` (`user.js:63`, alias `profile_pic_id`) |

### Ride Sharing + Business — table `users_info` (one row per user; loaded at `user.js:175`)
| Field | DB column |
| --- | --- |
| Sharing (ride-sharing on/off) | `users_info.ride_sharing` |
| Car make / model | `users_info.make`, `users_info.model` |
| Max passengers | `users_info.max_passengers` |
| License plate | `users_info.license_plate_number` |
| Driver license | `users_info.driver_license` |
| Car insurance | `users_info.car_insurance` |
| Business enabled | `users_info.add_business` |
| Company Name / Title | `users_info.company_name` / `company_title` |

### Activity aggregates — computed over table `orders`
| Field | DB source (from `get_user_by_id` sub-selects) |
| --- | --- |
| Requests placed (as requester) | `orders` grouped by `requestor_id` (MIN/MAX created_at) |
| Completed as requester | `orders WHERE aasm_state='delivered'` by `requestor_id` |
| Jobs completed as gopher | `orders WHERE aasm_state='delivered'` by `gopher_id` |
| Cancellations (gopher) | `orders WHERE aasm_state='cancelled' AND revoked=2` by `gopher_id` |
| Admin cancellations | `orders WHERE aasm_state='cancelled' AND revoked=3` by `gopher_id` |
| First/last request/order dates | MIN/MAX of `orders.created_at` / `orders.updated_at` |

---

## How this lands in the Gopher HQ Dashboard (two layers)

The dashboard embeds a static user record built offline, so "include all info" needs both:
1. **Pipeline** — `Documentation/Dashboard/regen_full.py` builds the embedded user record from
   **`Users.csv`** (currently ~40 columns). Add the columns above that aren't yet carried
   (`selecttype`, `selectsubtype`, `radius`, `ride_sharing`+car fields, business, `avg rating`,
   `total ratings`, `current_sign_in_at`, `requesting_primarly`, `discover_gopher`) to the exported
   record. (Each maps 1:1 to the DB columns above — `Users.csv` is an export of `users`/`users_roles`/
   `users_info`.)
2. **UI** — add sections to `openUserDetail` (`app_part4.js:1885`): **"Work Settings & Radius"**
   (categories, sub-categories, radius, gopher type, offer limit), **"Ride Sharing"**, **"Business"**,
   and **Ratings** into Profile. Mirror the field order of the production View User page.

Until a field is in the pipeline, render it with the existing `'Backfill at integration'` badge
(`app_part4.js:1938`) so the gap is visible rather than silently missing.

## Acceptance
- The dashboard Users detail shows every field in the map above, matching the production View User page.
- Categories (main) + sub-categories + radius are visible for a Gopher (the original G40-103 ask).
- Fields not yet in the data export show the "Backfill at integration" badge, not a blank.
