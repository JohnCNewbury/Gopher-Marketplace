# G40-165 — Hide customer Apt/Unit on the Available (pre-acceptance) view

**Status:** Built + verified in the Go worker prototype · real-app fix located in the June-2026 export
**Jira:** G40-165 · Bug · Medium · `worker` · Bucket B (no scaffold)
**Rule:** on the Available tab (before a Gopher accepts) hide the customer's exact **house number AND
apartment/unit number**; reveal the full address on acceptance. All request types.

## The bug (verified in the live app)
The app already masks the house number pre-acceptance but leaks the apt/unit. In the legacy
`gopher-mobile-gopher` worker app (Ionic/Capacitor + React), the address is a structured object; apt/unit =
**`address.line2`**; pre-acceptance = **`aasm_state ∈ {pending, scheduled}`**. Two pre-accept surfaces:

- **Available list card** — `component/GopherOrderCardView.js` (`CardViewBody`, ~L604). `line1` masked via
  `streetDisplayName()` (L1221: `address.replace(/^\d+\s*,?\s*/, "")`) at L695/760/826, but **`line2`
  printed raw** at **L727/793/859**.
- **Tap-through detail** — `component/layoutComponent/RequestDetailPullOver.js`. `line1` is state-gated
  (L2905–2909: `["pending","scheduled"] ? streetDisplayName(line1) : line1`), but **`line2` has no gate** at
  **L2943 / 3017 / 3089** → apt leaks in the pending detail.
- **Post-accept reveal** — `component/ordercard.js` (`Ordercard`, via `navigate("/form")`), prints full
  `line1` (L2718) + `line2` (L2750) raw. **Correct — do not touch.**

## Real-app fix (dev)
Gate `line2` exactly like `line1` (line2 has no number to strip → hide it entirely until accepted):
- `RequestDetailPullOver.js` L2943/3017/3089: wrap in
  `["pending","scheduled"].indexOf(localFormProps.aasmState) !== -1 ? "" : props.request?.address?.line2`,
  and add the same state check to each block's `display: …line2 ? "flex":"none"` container (L2919/2991/3063)
  so the "Apt/Unit:" **label row** is suppressed too.
- `GopherOrderCardView.js` L703/769/835: this card is always pre-accept → set the Apt/Unit `DetailBlock`
  `display:"none"`.
- Recommended: centralize as `maskAddressForGopher(address, aasmState)` (mask `line1`, drop `line2` when
  pending/scheduled) used by both files, to avoid drift.

## Prototype build — `_prototypes/Go/gopher-go-worker.html`
The interactive worker prototype previously showed **full addresses** on the pre-accept detail (no masking at
all) and had no apt/unit demo data. Added:
- **`maskAddr(addr, accepted)`** — pre-accept, strips the leading house number (mirrors `streetDisplayName`)
  **and** drops apt/unit-style segments (`Apt/Unit/Suite/Ste/#/Floor/…` or a bare `42`/`3B`), keeping street
  name + city. Business/venue names (no leading number) pass through. `accepted:true` returns the full
  address (mirrors the post-accept reveal). This is the string-based equivalent of the real structured
  `line1`/`line2` fix.
- Wired into both pre-accept surfaces: the **alert glance** route and the **detail Route/Location** block
  (pickup + every drop-off), plus a **"🔒 Exact house & unit number shown after you accept"** note (optional
  UX clarification — the real fix just hides the data).
- Demo data: added apt/unit to residential addresses (move pickup `512 Glenwood Ave, Apt 3B`; delivery
  drop-offs `1801 Oberlin Rd, Apt 12`, `1820 Holloway St, Unit 4`).

### Verification (in-browser, real render)
No console errors. `maskAddr` unit cases all correct: `512 Glenwood Ave, Apt 3B, Raleigh → Glenwood Ave,
Raleigh`; `1801 Oberlin Rd, Apt 12, Raleigh → Oberlin Rd, Raleigh`; `Glenwood Market, Raleigh` (business,
unchanged); `4101 NC-55, Apex → NC-55, Apex`; `accepted=true` reveals the full address. Drove the detail for
the move job (GJ-4815): Route renders **"Glenwood Ave, Raleigh" / "Holloway St, Durham"** + the lock note,
with **no** house number or apt/unit leaking anywhere in the body. Screenshot shared.

Post-accept reveal lives in the active-job screen (`gopher-go-purchase-delivery-figma.html`), which already
shows full addresses — consistent with the real app's `ordercard.js` reveal.

## Files
- `_prototypes/Go/gopher-go-worker.html` — `maskAddr` helper, alert + detail wiring, demo apt/unit data.
- Real-app fix (legacy `gopher-mobile-gopher`): `GopherOrderCardView.js`, `RequestDetailPullOver.js` (NOT
  `ordercard.js`).
