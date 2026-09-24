#!/usr/bin/env bash
#
# Open a local preview page in CHROME, always freshly loaded.
#
# WHY THIS EXISTS (owner, 2026-08-25: "These damn local hosts never populate for
# me. AND i always have to refresh."). Two causes, both avoidable:
#
#   1. NO CACHE-BUSTER. `python3 -m http.server` sends Last-Modified and Chrome
#      happily serves the cached copy, so a page rebuilt seconds ago still shows
#      the old build. Whoever set the preview up was appending `?v=N` for their
#      own testing and handing over the bare URL — so they saw the new build and
#      the owner saw the old one. This always appends a timestamp.
#
#   2. THE #hash. `open` with a URL that a tab is ALREADY sitting on does not
#      reload it, it just focuses the tab — and a fragment-only difference is
#      not a navigation either. So "#app" pages looked frozen until a manual
#      refresh. The cache-buster changes the QUERY, which forces a real load,
#      and the fragment is re-appended after it so routing still works.
#
# Usage:
#   scripts/preview-open.sh                       # index.html, auto-detected port
#   scripts/preview-open.sh gopher-go.html
#   scripts/preview-open.sh 'gopher-go.html#app'
#   scripts/preview-open.sh gopher-go.html 8249
#
set -euo pipefail

PAGE="${1:-index.html}"
PORT="${2:-}"

# Split any #fragment off the page — it must go AFTER the query string.
FRAG=""
case "$PAGE" in
  *\#*) FRAG="#${PAGE#*\#}"; PAGE="${PAGE%%\#*}" ;;
esac

# Auto-detect the port when one wasn't given: look for listening local servers.
if [[ -z "$PORT" ]]; then
  # NOT `mapfile` — that is bash 4+, and macOS ships bash 3.2 as /bin/bash.
  # This script must work under whichever bash the owner's shell hands it.
  PORTS=()
  while IFS= read -r _p; do
    [[ -n "$_p" ]] && PORTS+=("$_p")
  done < <(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null \
    | awk '/^(Python|python3|node|ruby)/ {split($9,a,":"); print a[length(a)]}' \
    | sort -un)
  if [[ ${#PORTS[@]} -eq 0 ]]; then
    echo "No local preview server is listening. Start one first (preview_start), or pass a port." >&2
    exit 1
  elif [[ ${#PORTS[@]} -gt 1 ]]; then
    echo "Several local servers are listening: ${PORTS[*]}" >&2
    echo "Pass the one you want:  scripts/preview-open.sh '$PAGE$FRAG' <port>" >&2
    exit 1
  fi
  PORT="${PORTS[0]}"
fi

URL="http://localhost:${PORT}/${PAGE}?t=$(date +%s)${FRAG}"

# Confirm the server is actually answering for THIS page before opening a tab —
# a blank Chrome window is the symptom this script exists to remove, and a 404
# or a dead port looks identical to "it didn't populate".
# ⚠️ NO `|| echo 000` HERE. curl already writes 000 on a connection failure, so
# the fallback appended a second one and produced "000000" — which matched
# neither branch below, and the dead-port case printed no explanation at all.
# `|| true` is REQUIRED under `set -e`: curl exits 7 when it cannot connect, which
# killed the script before the diagnosis below could print — a dead port produced
# a silent exit 7, the least helpful possible answer to "it didn't populate".
# It must be `|| true` and NOT `|| echo 000`, which APPENDS to curl's own "000"
# and yields "000000", matching neither branch.
CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/${PAGE}" 2>/dev/null || true)"
CODE="${CODE:-000}"
if [[ "$CODE" != "200" ]]; then
  echo "http://localhost:${PORT}/${PAGE} returned ${CODE} — not opening a tab." >&2
  [[ "$CODE" == "000" ]] && echo "  Nothing is listening on ${PORT}." >&2
  [[ "$CODE" == "404" ]] && echo "  The server is up but does not have that page." >&2
  exit 1
fi

open -a "Google Chrome" "$URL"
echo "opened in Chrome (fresh, cache-busted):"
echo "  $URL"
