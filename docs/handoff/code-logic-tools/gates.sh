#!/bin/zsh
# All CI gates for the branch checked out in the given worktree. Usage: gates.sh <worktree> <label>
cd "$1" || exit 2
T=${0:h}/gates-out; mkdir -p $T
J=$(npx jest --config jest.services.config.json 2>&1 | tee $T/jest-$2.txt | grep -E "^Tests:|^Test Suites:" | tr '\n' ' ')
E=$(npx eslint ./src/ --max-warnings=0 >$T/eslint-$2.txt 2>&1 && echo eslint-ok || echo ESLINT-FAIL)
P=$(npx prettier . --check >$T/prettier-$2.txt 2>&1 && echo fmt-ok || echo FMT-FAIL)
G=(${(f)"$(grep -oE 'node scripts/[a-zA-Z0-9_./-]+\.m?js' .gitlab-ci.yml | sort -u | sed 's/^node //')"}); ok=0; bad=""
for s in "${G[@]}"; do if node "$s" >/dev/null 2>&1; then ok=$((ok+1)); else bad="$bad $s"; fi; done
echo "$(git branch --show-current) $(git rev-parse --short=9 HEAD) behind=$(git rev-list --count HEAD..origin/production) | $J| $E | $P | guards $ok/${#G[@]}$bad"
