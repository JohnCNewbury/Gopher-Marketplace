#!/bin/zsh
# Rebuild a local preview of Final/gopher-request.html: the repo file + the LOCAL PREVIEW SHIM
# (opens the dashboard without sign-in; ?preview=home, &view=, &sec=, &detail=1). NEVER commit
# the shim. usage: S=/path/to/scratch/snap  docs/handoff/website-uiux-tools/resync.sh
set -e
D="$(cd "$(dirname "$0")" && pwd)"; W="${W:-$(git -C "$D" rev-parse --show-toplevel)}"; S="${S:?set S to a scratch snapshot dir}"
mkdir -p "$S"
python3 "$D/splice.py" "$W/Final/gopher-request.html" "$D/shim.html" "$S/gopher-request.html"
rsync -a "$W/Final/assets/" "$S/assets/"
grep -q "LOCAL PREVIEW SHIM" "$W/Final/gopher-request.html" && { echo "!! SHIM LEAKED INTO REPO"; exit 1; } || true
echo "resynced -> $S (serve it: cd \"$S\" && python3 -m http.server 8969 --bind 127.0.0.1)"
