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

   ⛔ THIS FILE IS VENDORED ELSEWHERE. If you change the RULE — the window
   length, the aasm-state gate, the clock format, or the degradation when the
   timestamp is missing or unparseable — a byte-identical copy of this file
   lives in the Code repo at:

       scripts/web-checks/vendor/noShow.js   (+ .sha256, + PROVENANCE.md)

   and the web requester banner in Final/gopher-request.html is tested for
   behavioural parity against that copy over an 84-case matrix.

   Its freshness check compares the vendored sha against THIS file, so it goes
   red on any edit here — but only once someone has this repo checked out
   beside it. Between those moments the link is this comment. That is why the
   comment exists: the sha cannot see a change nobody pulls.

   So: change the rule, then say so, so the copy is re-vendored and the web
   port re-checked. A cosmetic edit here is harmless — it will report STALE,
   they re-vendor, and parity confirms the rule did not move. */

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
