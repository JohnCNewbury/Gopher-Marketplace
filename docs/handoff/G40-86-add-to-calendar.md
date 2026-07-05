# G40-86 — Gopher Go: "Add to Calendar" on scheduled orders

**Jira:** G40-86 (Task) · Epic **G40-1 Bug Fixes & Polish** · Label `worker` · RFP: **KEEP**, Bucket B
**Assignee:** John Newbury
**Surface built:** Gopher Go real design screens — `_prototypes/Go/gopher-go-purchase-delivery-figma.html`,
which owns the accepted-job lifecycle (active → detail → update). The button lives in the **request
details of an accepted, scheduled order, directly above the Start button** — where it has historically
sat. NOT `gopher-go-worker.html` (reference-only concept file, per `gopher-go-manifest.html`) and NOT
`Final/gopher-go.html` (marketing/settings).
**Scope of this branch:** FRONT-END placement, in the real design system. The Add-to-Calendar button is
drawn on the accepted scheduled-order detail frame, above the Start button, reusing existing tokens/
components. The `.ics` builder and native on-device hand-off are dev work (see TO BUILD).

---

## What the ticket asks (clarified by John, 2026-07-02 → placement corrected 2026-07-03)

Not a calendar page — a simple **"Add to Calendar" link on a scheduled order**. Tapping it hands the
order's **title, date, and time** to the worker's **native phone calendar**; the OS creates the event and
the worker takes it from there. **Gopher Go is only the trigger** — after the hand-off it's entirely
between the user and their device.

- **Only scheduled orders.** A **"flexible"** order counts as scheduled.
- **Flexible defaulting:** default the event to the flexible window — **24 hours / 7 days / 2 weeks**.
  Because the worker sees it in their own calendar, they can re-time it to whatever they want; that's not
  Gopher Go's concern.

### Placement rule (John, 2026-07-03) — critical
The button **only exists after the order has been accepted**, in the **request details** of that scheduled
order, **right above the Start button**. It must **never** appear before acceptance — a Gopher who hasn't
accepted isn't connected to the request and can't schedule it. ASAP/now orders never enter this
scheduled-detail state, so the button is inherently scheduled-only.

---

## ✅ DONE (front-end placement) — `gopher-go-purchase-delivery-figma.html`

New frame **"G40-86 · Scheduled order (accepted · pre-start)"**, built in John's real design system,
reusing existing components — `.topbar`, navy `.pay-hero`, `.block` cards, `.kv` rows, `.pill` (`● Scheduled`),
and the `.btn` system. No makeshift markup.

- Header pill reads **● Scheduled**; hero notes **"pays on completion · no out-of-pocket"** — this is a
  post-accept surface a Gopher only reaches after accepting the job.
- A **when-hero** shows the scheduled date/time (`Sat, Jun 21 · 9:00 AM window` · "starts in 2 days").
- The **foot is stacked** (`.foot.stack`): the outlined **Add to Calendar** button sits **directly above**
  the green **Start job →** button — the historical placement John specified.
- Gated by lifecycle, not a string test: this frame is the accepted + scheduled state only. ASAP orders
  never reach it.

### Flexible orders
Same button, same placement. A flexible order counts as scheduled and gets the button; the event defaults
to the flexible window (24h / 7d / 2w) and the worker re-times it in their own calendar. Per John, noting
this rule here is sufficient — no separate flexible frame was drawn.

### Cleanup
The earlier misplaced build in the reference-only concept file `gopher-go-worker.html` (button on the
**pre-accept** browse job-detail, where Pass/Accept live) was **fully reverted** — CSS, markup, click
handler, and the `.ics` utility all removed; verified 0 remnants. That placement was a logic bug (a Gopher
could schedule a request they aren't connected to) and lived in a file the manifest marks reference-only.

---

## 🔧 TO BUILD (developer / native)
- **Wire the button to the real accepted scheduled-order detail** in production (this frame is the design
  reference for placement — above Start, post-accept, scheduled/flexible only, never ASAP).
- **Use the order's real structured datetime**, not a display label. Pass the scheduled datetime (or the
  flexible tier) straight into the calendar-event builder.
- **Build the `.ics` / native hand-off:** generate a standard VEVENT (SUMMARY = order title, DTSTART/DTEND
  from the scheduled datetime + duration, LOCATION = on-site/pickup→drop-off, UID, DESCRIPTION) and open it
  on device — cross-platform `.ics` open, or the platform calendar intent (iOS `EKEventStore` / event-edit
  view controller pre-filled; Android `Intent.ACTION_INSERT`).
- **Flexible window source:** read the order's flexible tier (24h / 7d / 2w); default the event start from
  it with a DESCRIPTION note ("Flexible — defaults to within 7 days; adjust the date & time in your
  calendar"). The user re-times in their own calendar.
- **Trigger only.** No post-handoff logic — once the event is in the native calendar it's between the user
  and their device.

## Acceptance criteria → where it lives
| Rule | Front-end (done) | Native/backend (to build) |
|---|---|---|
| Only on **accepted** scheduled orders (flexible = scheduled), above Start | frame + stacked foot on the accepted scheduled-detail | wire to real accepted scheduled order |
| Never before acceptance / never ASAP | lifecycle-gated frame (post-accept only) | render only on accepted scheduled/flexible orders |
| Hands title/date/time to native calendar | placement reference | `.ics` VEVENT / native calendar intent |
| Flexible defaults to 24h / 7d / 2w, user-adjustable | rule noted | pass the order's flexible tier |
| Gopher Go is only the trigger | no post-handoff logic | (nothing — by design) |

## Notes
- Worker app only (`worker` label). The requester side is out of scope.
- **Built in the correct surface:** `gopher-go-purchase-delivery-figma.html` (real accepted-job lifecycle),
  **not** `gopher-go-worker.html` (reference-only concept, per `gopher-go-manifest.html`) and **not**
  `Final/gopher-go.html` (marketing/settings). Earlier drafts in both were reverted.
- Placement matches John's historical convention: Add to Calendar directly above Start, in the request
  details of the accepted scheduled order.
