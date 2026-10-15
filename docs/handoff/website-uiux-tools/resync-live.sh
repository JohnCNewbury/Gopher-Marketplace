#!/bin/zsh
# Re-sync this worktree's Final/ from live: old base $1 -> new live $2 (default origin/main).
# Files I hold no changes in are taken from live; gopher-request.html is a 3-way merge-file.
# Any _prototypes/ change on live is reported, NOT copied (live holds the published form).
set -e
B=$1; L=${2:-origin/main}; T=$(mktemp -d)
for f in $(git diff --name-only $B $L); do
  case "$f" in
    _prototypes/*) echo "!! live changed $f — take its SOURCE from the owning branch (not copied)"; continue;;
    CLAUDE.md|README.md|.nojekyll|.github/*) continue;;
  esac
  if [ "$f" = "gopher-request.html" ]; then
    git show $B:$f > $T/base; git show $L:$f > $T/live; cp Final/$f $T/mine
    if ! git merge-file -p $T/mine $T/base $T/live > $T/merged; then echo "!! CONFLICT in $f"; exit 1; fi
    diff $T/base $T/mine | grep -v '^[0-9]' > $T/h1 || true; diff $T/live $T/merged | grep -v '^[0-9]' > $T/h2 || true
    cmp -s $T/h1 $T/h2 || { echo "!! hunks changed in $f"; exit 1; }
    cp $T/merged Final/$f; echo "merged  $f (= live + exactly my hunks)"
  else
    if [ -f "Final/$f" ] && [ "$(git hash-object "Final/$f")" != "$(git rev-parse $B:$f 2>/dev/null)" ]; then echo "!! I hold changes in $f — stop"; exit 1; fi
    mkdir -p "$(dirname "Final/$f")"; git show "$L:$f" > "Final/$f"; echo "taken   $f"
  fi
done
