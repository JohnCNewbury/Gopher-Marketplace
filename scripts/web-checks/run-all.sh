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

step "1/7  inline JS parses (both live web apps)"
run node scripts/web-checks/parse-inline-js.js Final/gopher-request.html
run node scripts/web-checks/parse-inline-js.js Final/gopher-connect.html
run node --check Final/assets/js/gopher-web-pt-bridge.js && echo "  ✓ bridge module parses"

step "2/7  PT cannot activate on a production host"
run node scripts/web-checks/pt-production-gate.js

step "3/7  web no-show port vs the VENDORED requester rule (never skips)"
run node scripts/web-checks/noshow-parity.js

step "4/7  is the vendored rule still upstream's? (skips without the clone)"
run node scripts/web-checks/noshow-freshness.js

step "5/7  Request/Connect/prototype parity harness"
run python3 docs/handoff/request-app-parity/run_parity_harness.py >/tmp/wc-parity.$$ 2>&1
tail -1 /tmp/wc-parity.$$; rm -f /tmp/wc-parity.$$

step "6/7  Go parity harness"
run python3 docs/handoff/go-app-parity/run_go_parity_harness.py >/tmp/wc-go.$$ 2>&1
tail -1 /tmp/wc-go.$$; rm -f /tmp/wc-go.$$

step "7/7  shared-module unit tests"
run node docs/handoff/request-app-parity/test-step-gates.js >/tmp/wc-sg.$$ 2>&1
tail -1 /tmp/wc-sg.$$; rm -f /tmp/wc-sg.$$
run node docs/handoff/request-app-parity/test-flow-rules.js >/tmp/wc-fr.$$ 2>&1
tail -1 /tmp/wc-fr.$$; rm -f /tmp/wc-fr.$$

if [ "$fail" = "0" ]; then printf '\n\033[32m✅ ALL WEB CHECKS PASS\033[0m\n'; else printf '\n\033[31m❌ SOMETHING FAILED — do not commit\033[0m\n'; fi
exit "$fail"
