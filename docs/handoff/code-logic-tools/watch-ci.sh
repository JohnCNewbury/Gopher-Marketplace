#!/bin/zsh
# Wait until MR $2 (in repo $1) has a pipeline on commit $3 (8-char prefix) that has finished.
for i in $(seq 1 90); do
  out=$(glab mr view $2 -R $1 -F json 2>/dev/null | python3 -c "
import json,sys;d=json.load(sys.stdin);p=d.get('head_pipeline') or {}
print(p.get('status') if (p.get('sha') or '').startswith('$3') else 'waiting')")
  case "$out" in success) echo "CI GREEN on $3 at $(date '+%H:%M:%S %Z')"; exit 0;; failed|canceled|skipped) echo "CI $out on $3 at $(date '+%H:%M:%S')"; exit 1;; esac
  [ $((i % 6)) -eq 0 ] && echo "$(date '+%H:%M:%S') ci=$out"
  sleep 20
done; echo TIMEOUT; exit 2
