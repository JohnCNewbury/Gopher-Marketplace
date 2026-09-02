/* One source of truth for the requester-side no-show window, shared by the
   order screen's sticky banner (ordercard.js) and the app-level banner
   (NoShowWatcher.js) so the two can never disagree on gate, clock format, or
   window length.

   The window mirrors the worker app's timer: 10 minutes from the moment
   POST orders/:id/gopher_reached succeeded — the same moment the backend
   stamped requestor_reminded_at (gopher-backend-api!327 exposes both fields
   to the requester on GET /orders/:id, only while purchased/picked_up).

   The timestamp is REQUIRED and must parse: a reminded flag with no usable
   timestamp yields inactive (the same degradation as an older backend)
   rather than an uncloseable clockless banner.

   ⛔ THIS RULE IS IMPLEMENTED THREE TIMES. All three are held together by
   tests; none of them is free to drift quietly.

     1. HERE — gopher-mobile-request, the requester app. The source of truth.
     2. Final/gopher-request.html (web), function noShowStateFrom — a byte-
        identical PORT of this file, bound by noshow-parity.js over 84 cases.
     3. _prototypes/Go/gopher-go-prototype.html, noShowWindowFrom — the worker
        prototype, bound by noshow-three-way.js.

   A byte-identical copy of THIS file is vendored into the Code repo at
   scripts/web-checks/vendor/noShow.js (+ .sha256, + PROVENANCE.md), so those
   tests run without needing this repo checked out. PROVENANCE.md records every
   re-vendor and whether it was cosmetic or a real rule change.

   THE TWO SIGNATURE DIFFERENCES ARE DELIBERATE — do not "unify" them:

   - The prototype takes a DEADLINE, not (reminded, remindedAt, aasmState). It
     has no aasm state and no backend reminder; the Gopher opens the window by
     tapping "Customer not present". The test maps
     `deadlineMs === Date.parse(remindedAt) + NO_SHOW_WINDOW_MS` OUTSIDE all
     three functions, exactly as the web port keeps its own mapping
     (web 'in-progress' -> aasm 'purchased') outside noShowStateFrom.
   - The prototype returns msLeft, not a clock string. It renders M:SS ("9:59")
     and this file renders MM:SS ("09:59"). The tests compare EXPIRY and the
     DISPLAYED SECOND, never the format, so nobody is ever pushed to change a
     prototype's visuals to satisfy a test.

   ⚠️ IF YOU CHANGE THE RULE — window length, the aasm-state gate, the clock
   format, or the degradation when the timestamp is missing or unparseable —
   SAY SO, so the copy is re-vendored and all three are re-checked. The
   freshness check goes red on any edit here, but only once someone has this
   repo checked out beside the Code repo. Between those moments the link is
   this comment: a sha cannot see a change nobody pulls.

   A cosmetic edit here is harmless — it reports STALE, they re-vendor, and the
   matrices confirm the rule did not move. That has already happened once, on
   purpose, to prove the loop fires. */

export const NO_SHOW_WINDOW_MS = 10 * 60000;

const NO_SHOW_STATES = ["purchased", "picked_up"];

/**
 * @param {boolean} reminded   requestor_reminded from the order payload
 * @param {string|null} remindedAt  requestor_reminded_at from the order payload
 * @param {string} aasmState   the order's current state
 * @param {number} nowMs       Date.now() at evaluation time
 * @returns {{active:boolean, expired:boolean, clock:string|null}}
 */
export function noShowStateFrom(reminded, remindedAt, aasmState, nowMs) {
  const deadline = remindedAt
    ? new Date(remindedAt).getTime() + NO_SHOW_WINDOW_MS
    : NaN;
  const active =
    Number.isFinite(deadline) &&
    !!reminded &&
    NO_SHOW_STATES.indexOf(aasmState) !== -1;
  const msLeft = active ? deadline - nowMs : null;
  const expired = msLeft !== null && msLeft <= 0;
  const clock =
    msLeft !== null && msLeft > 0
      ? `${String(Math.floor(msLeft / 60000)).padStart(2, "0")}:${String(
          Math.floor((msLeft % 60000) / 1000),
        ).padStart(2, "0")}`
      : null;
  return { active, expired, clock };
}
