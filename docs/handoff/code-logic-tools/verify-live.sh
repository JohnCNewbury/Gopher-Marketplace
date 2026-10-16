#!/bin/zsh
# Live check after a server merge. Usage: verify-live.sh <merge-epoch-seconds>
# Counts, from the merge to now: DB init lines and JS errors (web.stdout), 5xx (nginx),
# plus 5xx in the same-length window BEFORE the merge as the baseline.
M=$1; NOW=$(date +%s); L=$((NOW-M)); G=/aws/elasticbeanstalk/Gopher-Production/var/log
# zsh does not word-split ${4:+...}: build the args as an array, and let errors SHOW (a silent
# failure read as "0 errors" once).
q(){ local a=(--log-group-name "$1" --start-time $(( $2*1000 )) --end-time $(( $3*1000 )) --query 'events[].message' --output text --max-items 20000); [ -n "$4" ] && a+=(--filter-pattern "$4"); aws logs filter-log-events "${a[@]}" | tr '\t' '\n'; }
echo "window: $(date -r $M '+%H:%M:%S') -> $(date -r $NOW '+%H:%M:%S %Z') (${L}s)"
echo "DB init lines since merge: $(q $G/web.stdout.log $M $NOW Database | grep -c 'Database initialization complete')"
E=$(q $G/web.stdout.log $M $NOW '?TypeError ?ReferenceError ?"UNHANDLED REJECTION" ?SyntaxError' | grep -E 'TypeError|ReferenceError|UNHANDLED REJECTION|SyntaxError')
echo "JS errors since merge: $(printf '%s' "$E" | grep -c .)"; [ -n "$E" ] && printf '%s\n' "$E" | cut -c1-220 | sort | uniq -c | sort -rn | head -8
A=$(q $G/nginx/access.log $M $NOW | grep -E '" 5[0-9]{2} '); B=$(q $G/nginx/access.log $((M-L)) $M | grep -E '" 5[0-9]{2} ')
echo "nginx 5xx since merge: $(printf '%s' "$A" | grep -c .)   same window before: $(printf '%s' "$B" | grep -c .)"
[ -n "$A" ] && printf '%s\n' "$A" | grep -oE '"[A-Z]+ [^ ?]+[^"]*" 5[0-9]{2}' | sed -E 's/\?[^ ]*//' | sort | uniq -c | sort -rn | head -8
