#!/usr/bin/env bash
# Who else has been in this workstream's files? Run at the START of work.
#
# WHY. Standing rule 13 says claim your files in the work registry — and that
# file's own text says the quiet part out loud: "A registry only knows what
# people wrote down. Git knows what actually happened." Every mechanism that
# depends on another session REMEMBERING to tell us is best-effort. This one
# asks git and the filesystem instead, so it works when nobody said anything.
#
# It answers three questions, in the order they bite:
#   1. Is someone mid-change in this shared tree RIGHT NOW?  (uncommitted work)
#   2. Has anyone committed to these paths outside my branch? (landed work)
#   3. Has anything I ported FROM moved upstream?             (source drift)
#
# ⚠️ It reports. It does not judge and it never fails a build — deciding whether
# someone else's edit matters is reading work, not a script's call.
set -uo pipefail
cd "$(dirname "$0")/../.."

PATHS=(
  "Final/gopher-request.html"
  "Final/gopher-connect.html"
  "Final/assets/js/gopher-web-pt-bridge.js"
  "_prototypes/web-split-screen.html"
  "_prototypes/Go/gopher-go-prototype.html"
  "_prototypes/Request/gopher-request-home.html"
  "_prototypes/Request/gopher-request-flow.html"
  "scripts/web-checks"
  "docs/handoff/web-split-screen-playground.md"
  "docs/handoff/prototype-vs-live-findings.md"
)

hdr(){ printf '\n\033[1m── %s\033[0m\n' "$1"; }

hdr "1/3  Uncommitted changes in this tree, on files this workstream owns"
dirty=0
for p in "${PATHS[@]}"; do
  out=$(git status --porcelain -- "$p" 2>/dev/null)
  [ -n "$out" ] && { echo "$out"; dirty=1; }
done
if [ "$dirty" = "0" ]; then echo "  ✓ none"; else
  echo
  echo "  ⚠️ Someone — possibly you — has these open. The deploy reads the WORKING TREE,"
  echo "     so an --allow-dirty run publishes whatever is sitting here. And never 'git add -A'"
  echo "     in a shared tree: it sweeps another session's work into your commit, under your message."
fi

hdr "2/3  Commits touching these paths that are NOT on my branch"
# ⛔ `main` IS EXCLUDED, AND THAT IS NOT LAZINESS. `main` is the flattened rsync
# DEPLOY lineage: scripts/deploy.sh copies Final/ onto it from a throwaway
# worktree, so it shares no history with any feature branch and every deploy
# rewrites these exact paths. Including it buried the real signal under 20 lines
# of "Deploy: sync Final/ -> main" — and a check nobody reads is worse than no
# check, because it looks like coverage. Deploy commits are answered by the
# deploy's own dry-run scope check, not here.
base=$(git rev-parse --abbrev-ref HEAD)
others=$(git log --oneline --all --not "$base" main origin/main -- "${PATHS[@]}" 2>/dev/null | head -20)
if [ -z "$others" ]; then echo "  ✓ none — every commit on these paths is reachable from $base"
                          echo "    (the main/deploy lineage is excluded — see the note in this script)"; else
  echo "$others"
  echo
  echo "  ⚠️ ⛔ 'git author' does NOT identify a session — every commit here is 'John Newbury'."
  echo "     To find the owner, read the SIBLING PATHS in the same commit (a docs/handoff/<x>/"
  echo "     directory usually names the lane), or search session transcripts. Guessing has"
  echo "     already caused a misattribution another session had to correct."
fi

hdr "3/3  Upstream sources this workstream ported from"
node scripts/web-checks/upstream-watch.js

printf '\n\033[1mRegistry:\033[0m the claim file is gopher-dev-handoff:src/content/docs/programme/work-registry.md\n'
printf 'It is the push half and it is best-effort. The three checks above are the pull half.\n'
