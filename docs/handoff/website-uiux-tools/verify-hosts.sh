#!/bin/bash
# Verify a deploy on all 3 hosts: every listed file must match Final/ byte for byte (sha256), and the
# page must contain each fixed-string sentinel. Cache-busted. Exit 0 only when all three hosts pass.
#
# usage (from the worktree root):
#   docs/handoff/website-uiux-tools/verify-hosts.sh <page.html> "<sentinel>" ["<sentinel>" ...] -- <file> [<file> ...]
# e.g.
#   docs/handoff/website-uiux-tools/verify-hosts.sh gopher-request.html "gopher-head-mask.svg" -- \
#       assets/img/gopher-head-mask.svg assets/video/gopher-that-couch.mp4
#
# Pages takes ~1 min after the push, TigerTech is usually first. Poll it (run_in_background + a loop),
# never claim "live" from one 200. TigerTech is ONLY gophergo.io.customers.tigertech.net/preview —
# gophergo.io/preview is a 301 to the WordPress site and proves nothing. A file that does not exist on
# TigerTech returns a 500 WordPress page (2704 B), not a 404.
page="$1"; shift
sentinels=(); while [ $# -gt 0 ] && [ "$1" != "--" ]; do sentinels+=("$1"); shift; done; shift
files=("$@")
ok=0; CB="cb=$(date +%s)"
for H in https://johncnewbury.github.io/Gopher-Marketplace \
         https://gophergo.io.customers.tigertech.net/preview \
         https://johncnewbury.github.io/Gopher-Marketplace-Prototype; do
  pass=0; bad=""
  for f in "${files[@]}"; do
    want=$(shasum -a 256 "Final/$f" | cut -d' ' -f1)
    got=$(curl -s -H 'Cache-Control: no-cache' "${H}/${f}?${CB}" | shasum -a 256 | cut -d' ' -f1)
    if [ "$got" = "$want" ]; then pass=$((pass+1)); else bad="$bad ${f##*/}"; ok=1; fi
  done
  html=$(curl -s -H 'Cache-Control: no-cache' "${H}/${page}?${CB}")
  sres=""
  for s in "${sentinels[@]}"; do
    n=$(printf '%s' "$html" | grep -c -F -- "$s"); sres="$sres [$n]"; [ "$n" -ge 1 ] || ok=1
  done
  echo "$H  files ${pass}/${#files[@]}${bad:+ FAIL:$bad}  sentinels${sres}"
done
exit $ok
