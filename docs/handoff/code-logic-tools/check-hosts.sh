#!/bin/bash
# Website Code/Logic: poll the 3 hosts after a web deploy (10/17). EDIT W (your worktree) and the S=( ) markers:
# each must be present in the new Final/gopher-request.html and ABSENT from the previous live (check with git show <old>:gopher-request.html).
# Live + TigerTech are compared byte-for-byte to Final/; the twin (noindexed) by markers only. Polls ~8 min.
# Live + TigerTech: byte-identical to Final/. Twin: noindex'd, so markers only.
W=/private/tmp/claude-501/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/c83c18ad-93d2-4a26-9c2d-05a7acb25d66/scratchpad/reqweb
want=$(shasum -a 256 "$W/Final/gopher-request.html" | cut -d' ' -f1)
S=('Your TrustShield ID is on file, so no new photo is taken.'
   '<span id="agePurchaseOpening">'
   'wteSeen: false,')
for i in $(seq 1 32); do
  all=0; out=""
  for H in https://johncnewbury.github.io/Gopher-Marketplace \
           https://gophergo.io.customers.tigertech.net/preview \
           https://johncnewbury.github.io/Gopher-Marketplace-Prototype; do
    tmp=$(mktemp)
    code=$(curl -s -o "$tmp" -w '%{http_code}' -H 'Cache-Control: no-cache' "$H/gopher-request.html?cb=$(date +%s)$i")
    got=$(shasum -a 256 "$tmp" | cut -d' ' -f1)
    m=""; for s in "${S[@]}"; do n=$(grep -c -F -- "$s" "$tmp"); m="$m[$n]"; [ "$n" -ge 1 ] || all=1; done
    w=$(python3 -c 'import re,sys;t=open(sys.argv[1],encoding="utf-8",errors="replace").read();b=re.search(r"\.onthego-text h2 \{([^}]*)\}",t);print(re.search(r"font-weight:(\d+)",b.group(1)).group(1) if b else "none")' "$tmp")
    [ "$w" = 900 ] || all=1
    case "$H" in *Prototype) sh="(twin, noindex'd)"; grep -q 'noindex' "$tmp" || all=1;;
                 *) if [ "$got" = "$want" ]; then sh="sha=match"; else sh="sha=DIFF"; all=1; fi;; esac
    out="$out\n  $H http=$code $sh markers$m onthego-weight=$w"
    rm -f "$tmp"
  done
  if [ $all = 0 ]; then echo "PASS $(date '+%H:%M:%S %Z') try $i"; printf "$out\n"; exit 0; fi
  [ $i = 32 ] && { echo "NOT YET after try $i $(date '+%H:%M:%S %Z')"; printf "$out\n"; exit 1; }
  sleep 15
done
