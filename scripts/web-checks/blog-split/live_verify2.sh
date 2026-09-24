#!/usr/bin/env bash
# Content-verify ROUND TWO (deploy 11927d7) on both live hosts, by string.
# Checks both that the new text is present AND that the old text is gone —
# a present-only check would pass on a stale cached copy.
set -u
HOSTS=("https://johncnewbury.github.io/Gopher-Marketplace" "https://gophergo.io.customers.tigertech.net/preview")
NAMES=("GitHub Pages" "TigerTech  ")
fail=0
get() { curl -s -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' "$1?cb=$(date +%s%N)$RANDOM"; }

want() { # file  needle  label
  if grep -qF "$2" <<<"$BODY"; then echo "  [ok]   $3"; else echo "  [FAIL] $3 — NOT FOUND in $1"; fail=1; fi
}
gone() { # file  needle  label
  if grep -qF "$2" <<<"$BODY"; then echo "  [FAIL] $3 — OLD TEXT STILL PRESENT in $1"; fail=1; else echo "  [ok]   $3"; fi
}

for h in 0 1; do
  B="${HOSTS[$h]}"
  echo "======================================================================"
  echo "  ${NAMES[$h]}  —  $B"
  echo "======================================================================"

  echo "  -- flag 1: retitle --"
  BODY=$(get "$B/blog-a-job-you-ll-actually-dig.html")
  want . "<title>A job you'll actually dig – Gopher</title>" "post <title> retitled"
  want . '"headline": "A job you'"'"'ll actually dig"' "JSON-LD headline retitled"
  want . "<h1 class=\"post-title\">A job you'll actually dig</h1>" "H1 retitled"
  gone . "A gig you'll actually dig" "no old title anywhere on the post page"
  gone . "a flexible gig you can do" "lead-in sentence reworded"
  gone . "That's a gig worth digging." "closing line reworded"

  BODY=$(get "$B/gopher-blog.html")
  want . "A job you'll actually dig" "index teaser retitled"
  gone . "A gig you'll actually dig" "no old title on the index"

  BODY=$(get "$B/feed.xml")
  want . "<title>A job you'll actually dig</title>" "feed item retitled"

  for p in blog-worker-centric-way-to-earn.html blog-refer-yourself.html; do
    BODY=$(get "$B/$p")
    gone . "A gig you'll actually dig" "related-reading link updated on $p"
  done

  echo "  -- flag 2: verification model --"
  BODY=$(get "$B/blog-on-demand-local-workforce.html")
  want . "identity-verified local Gophers claim it" "connect: identity-verified"
  gone . "background-checked local Gophers" "connect: old wording gone"

  BODY=$(get "$B/blog-age-restricted-deliveries.html")
  want . "An identity-verified Gopher accepts it." "age-restricted: step 2"
  gone . "A background-checked Gopher accepts it." "age-restricted: old wording gone"

  BODY=$(get "$B/blog-a-marketplace-seniors-can-trust.html")
  want . "clean background check on Elite and Elite+ Gophers, so you know exactly who's coming" "seniors: body promise"
  want . "verified identities, real ratings, and a clean background check on Elite and Elite+" "seniors: Key takeaways bullet"
  want . '"text": "Verified identities and real ratings, with a clean background check on Elite' "seniors: FAQPage answer"
  gone . "background checks, real ratings, and verified identities" "seniors: old wording gone"

  echo "  -- the map CTA --"
  BODY=$(get "$B/blog-gopher-marketplace-on-one-page.html")
  want . 'class="map-lead" href="gopher-marketplace.html"' "new map band present, linking the map"
  want . "See your whole neighborhood on one map" "band headline"
  want . "Explore the map" "band button copy"
  want . 'class="btn btn--primary" href="gopher-marketplace.html">Explore the interactive map' "end card: green button + new copy"
  # Scoped to the CTA CARD, not the whole page. The shared closing band also uses
  # .btn--navy — correctly, because .band is GREEN. A page-wide `gone` check here
  # failed on that legitimate button and read as a regression.
  CARD=$(python3 -c "
import sys
t=sys.stdin.read(); i=t.index('<div class=\"cta-card navy\">')
sys.stdout.write(t[i:t.index('</div>', t.index('cta-row', i))+600])" <<<"$BODY")
  if grep -qF "btn--navy" <<<"$CARD"; then
    echo "  [FAIL] end card: STILL a navy button on the navy card"; fail=1
  else
    echo "  [ok]   end card: no navy-on-navy button inside the CTA card"
  fi
  if grep -qF 'class="btn btn--navy" href="gopher-request.html"' <<<"$BODY"; then
    echo "  [ok]   closing band keeps its navy button (band is green — correct)"
  fi
  gone . "Open the map" "old button copy gone"
  n=$(grep -o 'href="gopher-marketplace.html"' <<<"$BODY" | wc -l | tr -d ' ')
  [ "$n" -ge 2 ] && echo "  [ok]   $n links to gopher-marketplace.html on the page" \
                 || { echo "  [FAIL] only $n link(s) to the map"; fail=1; }

  BODY=$(get "$B/assets/css/gopher-blog.css")
  want . ".map-lead{" "stylesheet carries the .map-lead rules"
  want . "flex:1 1 320px" "the wrap fix shipped"
  echo
done

echo "======================================================================"
[ "$fail" = "0" ] && echo "  ROUND TWO LIVE VERIFY: PASS on both hosts" || echo "  ROUND TWO LIVE VERIFY: FAILURES ABOVE"
echo "======================================================================"
exit $fail
