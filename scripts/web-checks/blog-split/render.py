#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Brief §3.3 / §3.4 — headless Chrome screenshots, DOM audit, fragment shim.

Two things this harness had to work around, both recorded so the next person
does not re-derive them:

  * Chrome on this Mac WRITES the screenshot / DOM dump and then fails to exit
    (CVDisplayLinkCreateWithCGDisplay, CVReturn -6670). The work is done, so a
    subprocess timeout is expected and the partial output is used.
  * `--window-size=430,...` does NOT give a 430px viewport here — Chrome floors
    the window at ~500px, so innerWidth came back 500. A phone width is
    therefore measured inside a same-origin 430px <iframe>, where innerWidth and
    the CSS media queries are genuinely 430.

  * `assets/js/gopher-header.js` REPLACES its <div id="gopher-header"> mount, so
    counting `#gopher-header` after load returns 0 on a correctly rendered page.
    The real signal is how many `header.gh-header` elements exist: exactly one.
"""
import json
import os
import re
import subprocess
import sys

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SERVE = ("/private/tmp/claude-501/-Users-johnnewbury-Desktop-All-New-Gopher-"
         "Documentation-Claude-Code-Review-Cleanup-Code/"
         "71348b84-f117-4347-b162-ad34c6e5bbe6/scratchpad/blog-serve")
BASE = "http://127.0.0.1:8531/"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "shots")
PROFILE = os.path.join(HERE, "chrome-profile")
os.makedirs(OUT, exist_ok=True)

PAGES = [
    ("gopher-blog.html", "index"),
    ("blog-service-provider-deals.html", "sp-deals"),
    ("blog-a-marketplace-seniors-can-trust.html", "seniors"),
    ("blog-merchant-deals-skip-the-delivery-app-cut.html", "merchant-deals"),
]

MARK = "###"  # assembled at runtime in JS so the script's own source can't match

PROBE = r"""
function gopherProbe(win){
  var d=win.document, de=d.documentElement, max=win.innerWidth+1, widest=null;
  var all=d.querySelectorAll('body *');
  for(var i=0;i<all.length;i++){
    var n=all[i], r=n.getBoundingClientRect();
    if(r.width>0 && r.right>max){ if(!widest || r.right>widest.right){
      widest={tag:n.tagName, cls:String(n.className||'').slice(0,50), right:Math.round(r.right)}; } }
  }
  return {
    title: d.title,
    headersRendered: d.querySelectorAll('header.gh-header').length,
    footers: d.querySelectorAll('footer.gopher-footer').length,
    h1: [].map.call(d.querySelectorAll('h1'), function(n){return n.textContent.trim();}),
    ldBlocks: d.querySelectorAll('script[type="application/ld+json"]').length,
    imgs: d.images.length,
    imgsBroken: [].filter.call(d.images, function(i){return i.complete && i.naturalWidth===0;})
                  .map(function(i){return i.getAttribute('src');}),
    innerW: win.innerWidth,
    scrollW: de.scrollWidth,
    overflow: de.scrollWidth > win.innerWidth + 1,
    widest: widest,
    takeaways: d.querySelectorAll('.takeaways li').length,
    relatedLinks: d.querySelectorAll('.related a').length,
    figures: d.querySelectorAll('figure').length,
    teaserCards: d.querySelectorAll('article.post-card').length,
    ctas: d.querySelectorAll('.cta-card').length,
    canonical: (d.querySelector('link[rel=canonical]')||{}).href || null,
    bodyText: d.body.innerText.replace(/\s+/g,' ').trim().length
  };
}
function gopherReport(o){
  var m='#'+'#'+'#';
  var pre=document.createElement('pre'); pre.id='PROBE';
  pre.textContent=m+JSON.stringify(o)+m;
  document.body.appendChild(pre);
}
"""

SELF_AUDIT = "<script>%s\nwindow.addEventListener('load',function(){setTimeout(function(){gopherReport(gopherProbe(window));},400);});</script>" % PROBE

IFRAME_HARNESS = """<!DOCTYPE html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#888}iframe{width:430px;height:%(h)dpx;border:0;display:block;margin:0 auto;background:#fff}</style>
</head><body>
<iframe id="f" src="%(src)s"></iframe>
<script>%(probe)s
document.getElementById('f').addEventListener('load', function(){
  var self=this;
  setTimeout(function(){
    var w=self.contentWindow;
    self.style.height = Math.max(800, w.document.documentElement.scrollHeight) + 'px';
    setTimeout(function(){ gopherReport(gopherProbe(w)); }, 300);
  }, 600);
});
</script></body></html>"""


class R(object):
    def __init__(self, stdout):
        self.stdout = stdout or ""


def run(args, timeout=25):
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return R(r.stdout)
    except subprocess.TimeoutExpired as e:
        out = e.stdout
        if isinstance(out, bytes):
            out = out.decode("utf-8", "replace")
        return R(out)


def chrome(width, height, extra, url, timeout=25):
    return run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                "--no-sandbox", "--user-data-dir=" + PROFILE,
                "--window-size=%d,%d" % (width, height),
                "--virtual-time-budget=6000"] + extra + [url], timeout=timeout)


def probe_result(dom):
    m = re.search(r'<pre id="PROBE">' + MARK + r"(\{.*?\})" + MARK + r"</pre>", dom, re.S)
    if not m:
        return None
    return json.loads(m.group(1).replace("&quot;", '"').replace("&amp;", "&")
                      .replace("&lt;", "<").replace("&gt;", ">"))


fails = []
rows = []
print("=" * 72)
print("3. RENDER — headless Chrome (1200px real viewport, 430px via iframe)")
print("=" * 72)

for page, label in PAGES:
    src = open(os.path.join(SERVE, page), encoding="utf-8").read()

    # --- desktop: real viewport ---
    twin = "__audit-%s.html" % label
    open(os.path.join(SERVE, twin), "w", encoding="utf-8").write(
        src.replace("</body>", SELF_AUDIT + "</body>", 1))
    png = os.path.join(OUT, "%s-1200.png" % label)
    chrome(1200, 2800, ["--screenshot=" + png], BASE + page)
    a = probe_result(chrome(1200, 2800, ["--dump-dom"], BASE + twin).stdout)
    os.remove(os.path.join(SERVE, twin))
    rows.append((page, 1200, png, a))

    # --- phone: 430px iframe ---
    hz = "__phone-%s.html" % label
    open(os.path.join(SERVE, hz), "w", encoding="utf-8").write(
        IFRAME_HARNESS % {"src": page, "probe": PROBE, "h": 3600})
    png = os.path.join(OUT, "%s-430.png" % label)
    chrome(470, 3800, ["--screenshot=" + png], BASE + hz)
    a = probe_result(chrome(470, 3800, ["--dump-dom"], BASE + hz).stdout)
    os.remove(os.path.join(SERVE, hz))
    rows.append((page, 430, png, a))

for page, w, png, a in rows:
    size = os.path.getsize(png) if os.path.exists(png) else 0
    if a is None:
        fails.append("%s @%dpx: audit produced no result" % (page, w))
        print("  %-52s %5dpx  AUDIT FAILED" % (page, w))
        continue
    p = []
    if a["headersRendered"] != 1:
        p.append("header rendered %dx" % a["headersRendered"])
    if a["footers"] != 1:
        p.append("%d footers" % a["footers"])
    if len(a["h1"]) != 1:
        p.append("%d h1s" % len(a["h1"]))
    if a["imgsBroken"]:
        p.append("broken imgs %s" % a["imgsBroken"])
    if a["overflow"]:
        p.append("H-OVERFLOW %d>%d widest=%s" % (a["scrollW"], a["innerW"], a["widest"]))
    if a["innerW"] != w:
        p.append("viewport is %dpx not %dpx" % (a["innerW"], w))
    if page != "gopher-blog.html":
        if a["relatedLinks"] < 2:
            p.append("only %d related links" % a["relatedLinks"])
        if a["takeaways"] < 3:
            p.append("only %d takeaways" % a["takeaways"])
        if a["ldBlocks"] < 2:
            p.append("only %d JSON-LD blocks" % a["ldBlocks"])
    else:
        if a["teaserCards"] != 14:
            p.append("%d teaser cards" % a["teaserCards"])
    fails.extend("%s @%dpx: %s" % (page, w, x) for x in p)
    print("  %-52s %4dpx png=%7db header=%d foot=%d h1=%d ld=%d img=%d/%d "
          "scrollW=%d/%d take=%d rel=%d fig=%d cta=%d text=%dch  %s"
          % (page, w, size, a["headersRendered"], a["footers"], len(a["h1"]),
             a["ldBlocks"], a["imgs"] - len(a["imgsBroken"]), a["imgs"],
             a["scrollW"], a["innerW"], a["takeaways"], a["relatedLinks"],
             a["figures"], a["ctas"], a["bodyText"],
             "OK" if not p else "  <-- " + "; ".join(p)))

# ── 4. fragment shim ──────────────────────────────────────────────────────
print()
print("=" * 72)
print("4. FRAGMENT SHIM — gopher-blog.html#<old-id> must land on the post page")
print("=" * 72)
sys.path.insert(0, HERE)
from meta import POSTS, ORDER  # noqa: E402

LAND = ("<script>window.addEventListener('load',function(){setTimeout(function(){"
        "var m='#'+'#'+'#';var pre=document.createElement('pre');pre.id='PROBE';"
        "pre.textContent=m+JSON.stringify({landed:location.pathname.split('/').pop(),"
        "title:document.title})+m;document.body.appendChild(pre);},300);});</script>")

for pid in ORDER:
    p = os.path.join(SERVE, POSTS[pid]["slug"] + ".html")
    t = open(p, encoding="utf-8").read()
    open(p, "w", encoding="utf-8").write(t.replace("</body>", LAND + "</body>", 1))

for pid in ORDER:
    want = POSTS[pid]["slug"] + ".html"
    a = probe_result(chrome(1000, 800, ["--dump-dom"], BASE + "gopher-blog.html#" + pid).stdout)
    got = a["landed"] if a else "(never reached a post page)"
    ok = got == want
    if not ok:
        fails.append("shim: #%s landed on %s" % (pid, got))
    print("  #%-20s -> %-52s %s" % (pid, got, "ok" if ok else "MISMATCH"))

for pid in ORDER:
    p = os.path.join(SERVE, POSTS[pid]["slug"] + ".html")
    t = open(p, encoding="utf-8").read()
    open(p, "w", encoding="utf-8").write(t.replace(LAND, "", 1))

print()
print("=" * 72)
print("RENDER RESULT: %d problems" % len(fails))
for f in fails:
    print("  " + f)
print("=" * 72)
sys.exit(1 if fails else 0)
