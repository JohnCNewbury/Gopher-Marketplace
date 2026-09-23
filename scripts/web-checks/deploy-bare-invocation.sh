#!/usr/bin/env bash
# A bare `scripts/deploy.sh` must survive argument parsing on macOS bash 3.2.
#
# WHY: bash 3.2 — what macOS ships, and what every session here runs — treats
# "${ARR[@]}" on an EMPTY array as an unbound variable under `set -u`. When
# both-sites became the default, a bare invocation began routing through a
# forwarding loop that expands ARGS=("$@"), which is empty precisely when no
# arguments were given. It died with `ARGS[@]: unbound variable`.
#
# ⚠️ THE SHAPE OF THE MISS IS THE POINT. `--push` was never affected: passing
# ANY argument makes ARGS non-empty. So the DRY RUN was the broken half and the
# real deploy ran fine — the safety step failed while the dangerous one did not.
# Every test run while writing that change passed a flag (--allow-dirty,
# --site …), so none of them touched the broken path. A bare run is now asserted.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bad=0
ok(){ if [ "$1" = "0" ]; then printf '  ✓ %s\n' "$2"; else printf '  ✗ FAIL %s\n' "$2"; bad=1; fi; }

# 1. the idiom itself must behave on THIS bash, not on a remembered one
out="$(bash -u -c 'ARR=(); for a in ${ARR[@]+"${ARR[@]}"}; do :; done; echo ok' 2>&1)"
[ "$out" = "ok" ]; ok $? "\${ARR[@]+\"\${ARR[@]}\"} survives an empty array on $(bash --version | head -1 | sed 's/.*version //;s/ .*//')"

out2="$(bash -u -c 'ARR=(); for a in "${ARR[@]}"; do :; done; echo ok' 2>&1)"
[ "$out2" != "ok" ]; ok $? 'and the UNGUARDED form still fails — so this check can go red'

# 2. the two argument arrays must use the guarded form
for v in ARGS FWD; do
  if grep -q "\${$v\[@\]}" "$ROOT/scripts/deploy.sh" \
     && ! grep -q "\${$v\[@\]+\"\${$v\[@\]}\"}" "$ROOT/scripts/deploy.sh"; then
    ok 1 "$v is expanded unguarded"
  else
    ok 0 "$v uses the empty-safe expansion"
  fi
done

# 3. a bare run must get past argument parsing. --site nonsense exits 2 at the
#    case statement, which is AFTER the forwarding loop — so reaching that exit
#    proves the loop survived. It touches no remote and writes nothing.
bash "$ROOT/scripts/deploy.sh" --site nonsense >/dev/null 2>&1
[ $? -eq 2 ]; ok $? 'argument parsing completes (exits 2 on an unknown --site)'

bash -n "$ROOT/scripts/deploy.sh"; ok $? 'deploy.sh parses'
[ $bad -eq 0 ] && echo "PASS — a bare deploy.sh survives bash 3.2" || echo "FAIL"
exit $bad
