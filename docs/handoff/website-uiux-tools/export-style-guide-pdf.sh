#!/bin/bash
# Export the official Gopher Style Guide (HTML) to a Letter-landscape PDF.
# Same method as the 5/27 export: headless Chrome print-to-pdf, US Letter landscape (792 x 612 pt),
# colours printed as drawn, the screen-only sidebar hidden. The HTML is never modified; a temporary
# copy gets one extra <style> block for the page size.
#
# Run it after EVERY edit to the guide (John 10/17: "there needs to be a PDF copy"), then copy the PDF
# next to any other copy of the HTML (e.g. Dev/gopher-dev-handoff/product-docs/Brand/...).
#
#   usage: export-style-guide-pdf.sh [out.pdf]
#   default out: "Gopher Style Guide 2026.pdf" beside the HTML in Documentation/Brand/Gopher Brand Standards/
set -euo pipefail

B="$HOME/Desktop/All New Gopher/Documentation/Brand/Gopher Brand Standards"
SRC="$B/Gopher Style Guide.html"
OUT="${1:-$B/Gopher Style Guide 2026.pdf}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

[ -f "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }
[ -x "$CHROME" ] || { echo "Google Chrome not found at $CHROME" >&2; exit 1; }

T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
python3 -I - "$SRC" "$T/print.html" <<'PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
t = open(src, encoding="utf-8").read()
css = """<style id="print-export">
@page { size: 11in 8.5in; margin: 0; }
@media print {
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sg-sidebar, .sg-nav-toggle, .sg-backdrop { display: none !important; }
  body { margin: 0 !important; padding-left: 0 !important; }
}
</style>
</head>"""
assert t.count("</head>") == 1, "expected exactly one </head>"
open(dst, "w", encoding="utf-8").write(t.replace("</head>", css, 1))
PY

"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw --virtual-time-budget=20000 \
  --print-to-pdf="$OUT" "file://$T/print.html" >/dev/null 2>&1

[ -s "$OUT" ] || { echo "export failed: no PDF written" >&2; exit 1; }
echo "wrote $OUT"
command -v pdfinfo >/dev/null && pdfinfo "$OUT" | grep -E "Pages|Page size" || true
