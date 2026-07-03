# G40-101 — Cost Adjustment: receipt required + tall/narrow display + pinch-to-zoom

**Type:** Task (child of Epic G40-1) · **Priority:** Medium · **Assignee:** John Newbury
**Status:** front-end flow BUILT into the prototypes; backend is the only remaining work.
Built 2026-07-02. Product decisions confirmed by John Newbury (see below).

## What the ticket asks
When a Gopher submits a Cost Adjustment whose **Cost of Items exceeds the original**,
they must attach a **receipt photo**. Three requirements: (1) a popup blocks submission
until a receipt is attached; (2) the receipt displays **tall & narrow** (≈2:5, no crop /
distort); (3) the **requestor can pinch-to-zoom** the receipt to verify the total before
approving. No receipt when Cost of Items is unchanged or decreased.

## Decisions (John, 2026-07-02)
- **Surfaces:** worker = **Gopher Go**; customer review = **Request + Connect + Deals**.
- Build the **entire front-end flow** in the prototypes and make the **DB/backend seam as
  simple as possible** for the dev.
- **Deals note:** Deals has **no cost-adjustment review flow** in the prototype (it's the
  abbreviated path — a Deal becomes a normal request tracked in the **Request** app). So the
  receipt review is inherited from Request/Connect; nothing was built in `gopher-deals.html`.
  If Deals ever gets its own in-app request tracking, drop the same component in (below).
- G40-101 was **missing from the backlog-reduction map** (`Gopher-Backlog-Reduction-Map.csv`);
  John will fold it in on his RFP reconciliation pass. Suggested home: **Bucket B** (Gopher Go
  worker flow) for the attach/gate/display + **Bucket A** (demand flow) for the requestor zoom.

## What was BUILT (front-end, in the prototypes)

**One shared component — the whole point ("simple for the dev"):**
`docs/handoff/receipt-flow-component.html` is the canonical, self-contained component
(CSS + JS, no dependencies). It is injected **byte-identical** into every surface between
`<!-- GOPHER-RECEIPT-COMPONENT (G40-101) START/END -->` markers. It exposes:
- `window.__receiptThumb(src, label)` → tall/narrow (2:5, `object-fit:contain`) thumbnail HTML.
- `window.__receiptViewer(src)` → fullscreen **pinch-to-zoom** viewer (touch pinch + drag-pan
  + double-tap; desktop wheel + drag + double-click; Esc/backdrop to close).
- `window.__demoReceipt()` → **DEMO ONLY** generated SVG receipt so the flow renders with no
  asset server (delete in production).
- Static-HTML hydration: a `<span data-receipt-demo data-width data-label>` placeholder becomes
  a thumbnail (used where screens are built from strings, e.g. the Go walkthrough); a
  `MutationObserver` hydrates placeholders injected after load. Any `[data-rcpt-open]` element
  also opens the viewer.

**Customer review — `Final/gopher-request.html` & `Final/gopher-connect.html`:**
- Added `receipt` to the demo `pendingAdjustment`; the receipt renders (tall/narrow, tap-to-zoom)
  in **both** the compact adjustment card (`buildAdjustmentCard`) and the full breakdown modal
  (`buildAdjustmentModal`), **before** the Approve/Decline buttons (Scenarios 3–5).
- Connect's demo was a labor-only adjustment (COG $0) → converted to a coherent **COG-increase**
  (Gopher fronts catering supplies; re-footed: COG 0→25, ITF/connectFee/gmvTotal recomputed) so
  the receipt correctly appears. Rendering is gated on `P.receipt` — no receipt, nothing shows
  (that's Scenario 2, "no receipt when COG not increased").

**Worker — `_prototypes/Go/gopher-go-prototype.html`:**
- The worker cost-adjustment is a guided **walkthrough** (status stepper), not a live form. The
  "Items purchased · receipt" step now shows a **tappable, tall/narrow, zoomable** receipt (the
  same component) so the worker-side display + zoom are demonstrated (Scenario 3, worker side).

## What the DEVELOPER wires (backend — the only remaining work)
The seam is one field. See `gopher-go-backend-wiring-checklist.md` §5 (two new lines added):
1. **Receipt upload** — on a COG-increase cost adjustment, upload the photo to storage (same
   path as profile-photo upload, §2) and store `receipt_url` on the `cost_adjustment` record.
2. **Serve it back** — the customer review screen reads `receipt_url`; pass it as
   `pendingAdjustment.receipt.src` (when null the demo receipt shows — replace it and the demo
   generator is never called).
3. ⚠️ **Enforce the gate server-side** — reject/hold any cost adjustment that raises Cost of
   Items without a `receipt_url`. The Gopher Go popup that blocks submit is **UX only**.
4. The interactive **"popup that blocks submit until a receipt is attached"** (Scenarios 1–2) is
   built in the real worker form during the rebuild — the walkthrough can't host a live gate.
   Rule: fire when `newCostOfItems > originalCostOfItems`; never when unchanged/decreased.

## Acceptance criteria mapping
| # | Scenario | Where it lives now |
|---|----------|--------------------|
| 1 | Popup on COG increase, blocks submit | Dev builds in the real Go form; rule + server gate specified above |
| 2 | No popup when COG not increased | Same rule; Connect/Request render nothing when `!P.receipt` |
| 3 | Receipt displays tall & narrow, no crop | **Built** — `.rcpt-thumb` 2:5 + `object-fit:contain`, worker + customer |
| 4 | Requestor pinch-to-zoom | **Built** — `__receiptViewer` (touch pinch + desktop wheel) |
| 5 | Receipt visible before approve/decline | **Built** — rendered above the action buttons in card + modal |

## Files touched
- `Final/gopher-request.html` — demo data + card + modal render + component.
- `Final/gopher-connect.html` — demo data (→COG-increase) + card + modal render + component.
- `_prototypes/Go/gopher-go-prototype.html` — receipt step + component.
- `docs/handoff/receipt-flow-component.html` — canonical shared component (source of the injected block).
- `_prototypes/Go/gopher-go-backend-wiring-checklist.md` — §5 receipt upload + server-gate lines.
- **Not touched:** `Final/gopher-deals.html` (no adjustment flow — see Deals note).

## Verification note
Validated with the JavaScriptCore engine (component script + the nested-template render edits
parse & run) and structural checks (clean single START/END markers per file). A local browser
server was blocked by the environment sandbox; eyeball in the Launch preview (open an
in-progress request with a pending cost adjustment → the receipt shows in the card/modal → tap
to zoom).
