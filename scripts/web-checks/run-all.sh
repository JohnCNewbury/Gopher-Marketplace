#!/usr/bin/env bash
# Regression guard for the web surfaces + the web↔Go playground bridge.
#
# Run this before committing anything that touches Final/gopher-request.html,
# Final/gopher-connect.html, or Final/assets/js/gopher-web-pt-bridge.js.
#
# It answers the two questions that matter:
#   1. did I break the live web apps?      (parse + the repo's own parity harnesses)
#   2. can the playground leak into prod?  (the ?pt=1 + dev-host gate)
set -uo pipefail
cd "$(dirname "$0")/../.."
fail=0
step(){ printf '\n\033[1m── %s\033[0m\n' "$1"; }
run(){ if "$@"; then :; else fail=1; printf '\033[31m   ^ FAILED\033[0m\n'; fi; }

step "1/26 inline JS parses (both live web apps)"
run node scripts/web-checks/parse-inline-js.js Final/gopher-request.html
run node scripts/web-checks/parse-inline-js.js Final/gopher-connect.html
run node --check Final/assets/js/gopher-web-pt-bridge.js && echo "  ✓ bridge module parses"

step "2/26 PT cannot activate on a production host"
run node scripts/web-checks/pt-production-gate.js

step "3/26 the Maps callback shim (the ride-distance race)"
run node scripts/web-checks/maps-callback-shim.js

step "4/26 requester <-> Gopher messaging crosses the PT bridge"
run node scripts/web-checks/pt-message-relay.js

step "5/26 the age gate: flavour + product form (the context pass)"
run node scripts/web-checks/age-context-pass.js

step "6/26 one lifecycle definition — Request and Connect both delegate"
run node scripts/web-checks/lifecycle-parity.js

step "7/26 a bare deploy.sh survives macOS bash 3.2"
run bash scripts/web-checks/deploy-bare-invocation.sh

step "8/26 the harness <-> Go seam matches in BOTH directions"
run node scripts/web-checks/pt-contract-both-ways.js

step "9/26 the relay loop schedules itself exactly once per pass"
run node scripts/web-checks/tick-single-scheduler.js

step "10/26 web no-show port vs the VENDORED requester rule (never skips)"
run node scripts/web-checks/noshow-parity.js

step "11/26 all THREE no-show implementations agree (mobile / web / prototype)"
run node scripts/web-checks/noshow-three-way.js

step "12/26 is the vendored rule still upstream's? (skips without the clone)"
run node scripts/web-checks/noshow-freshness.js

step "13/26 Request/Connect/prototype parity harness"
run python3 docs/handoff/request-app-parity/run_parity_harness.py >/tmp/wc-parity.$$ 2>&1
tail -1 /tmp/wc-parity.$$; rm -f /tmp/wc-parity.$$

step "14/26 Go parity harness"
run python3 docs/handoff/go-app-parity/run_go_parity_harness.py >/tmp/wc-go.$$ 2>&1
tail -1 /tmp/wc-go.$$; rm -f /tmp/wc-go.$$

step "15/26 shared-module unit tests"
run node docs/handoff/request-app-parity/test-step-gates.js >/tmp/wc-sg.$$ 2>&1
tail -1 /tmp/wc-sg.$$; rm -f /tmp/wc-sg.$$
run node docs/handoff/request-app-parity/test-flow-rules.js >/tmp/wc-fr.$$ 2>&1
tail -1 /tmp/wc-fr.$$; rm -f /tmp/wc-fr.$$

step "16/26 shared worker helpers are in a scope BOTH call sites can see"
run node scripts/web-checks/helper-scope.js

step "17/26 Go prototype money parsing (a typed \$61.40 is \$61.40, not \$6,140)"
run node scripts/web-checks/go-money-parse.js

step "18/26 Deals home crowns the merchant who PAID, and nobody otherwise"
run node scripts/web-checks/deals-featured-picks.js

step "19/26 after a hire the total is what the requester pays, never worker pay (PL-291)"
run node scripts/web-checks/post-hire-total.js

step "20/26 a 21+ \"No\" opens the ID warning; Submit as-is double-flags (G40-628)"
run node scripts/web-checks/age-id-warning.js

step "21/26 Review and Submit re-check every earlier step, as the app does (PL-321)"
run node scripts/web-checks/review-rechecks-earlier-steps.js

step "22/26 crew offer = the whole job except Labor, as the app (RQ-51)"
run node scripts/web-checks/crew-offer-whole-job.js

step "23/26 Yard worker choice, Labor-only hourly, MY Gophers seeding, as the app (D13/D14/B-17)"
run node scripts/web-checks/worker-choice-and-hourly.js

step "24/26 GO-To set-up, price and send match the app (AGE-12, MONEY-38, D-55)"
run node scripts/web-checks/goto-parity.js

step "25/26 description cap (Moving/Custom Task) + age answer per wording, as the app (AGE-8)"
run node scripts/web-checks/description-rules.js

step "26/26 offer precision, low-offer note, hold amount match the app (MONEY-2/17/26)"
run node scripts/web-checks/money-small-parity.js

if [ "$fail" = "0" ]; then printf '\n\033[32m✅ ALL WEB CHECKS PASS\033[0m\n'; else printf '\n\033[31m❌ SOMETHING FAILED — do not commit\033[0m\n'; fi
exit "$fail"
