#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Drive the Gopher iQ pill on the pages whose engine copy was touched.

Parse-clean is not works: the engine runs inside an IIFE, so the only proof it
still attaches is to type into the pill and see an answer render, then follow
the "See how it works" link and check where it points.
"""
import json
import os
import re
import subprocess

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SERVE = ("/private/tmp/claude-501/-Users-johnnewbury-Desktop-All-New-Gopher-"
         "Documentation-Claude-Code-Review-Cleanup-Code/"
         "71348b84-f117-4347-b162-ad34c6e5bbe6/scratchpad/blog-serve")
BASE = "http://127.0.0.1:8531/"
PROFILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chrome-iq")

PAGES = ["gopher-faqs.html", "index.html", "gopher-services.html"]

PROBE = r"""
<script>
(function(){
  var errs=[];
  window.addEventListener('error', function(e){ errs.push(String(e.message)); });
  window.addEventListener('load', function(){
    setTimeout(function(){
      var d=document, m='#'+'#'+'#', out={errors:errs};
      var input=d.getElementById('aiInput'), scope=d.getElementById('aiScope');
      out.pillPresent = !!d.querySelector('.ai-bar');
      out.engineHooksAttached = !!(input && scope);
      var pre0 = d.getElementById('aiResults');
      out.resultsBefore = pre0 ? pre0.innerText.replace(/\s+/g,' ').trim().length : -1;
      if(input){
        // type a question and submit the way a person would
        input.value = 'how much does it cost';
        input.dispatchEvent(new Event('input',{bubbles:true}));
        var ev = new KeyboardEvent('keydown',{key:'Enter',keyCode:13,which:13,bubbles:true});
        input.dispatchEvent(ev);
      }
      setTimeout(function(){
        // #aiResults is the container the engine actually writes into
        // (getElementById('aiResults') + .innerHTML in gopher-ai-engine.js).
        // No weak fallback: if that container has no text, the engine did not answer.
        var panel = d.getElementById('aiResults');
        out.resultsContainerExists = !!panel;
        out.resultsBefore = out.resultsBefore || 0;
        var txt = panel ? panel.innerText.replace(/\s+/g,' ').trim() : '';
        out.answerRendered = txt.length > 20;
        out.answerSample = txt.slice(0,140);
        // where does "See how it works" point, as the engine computed it?
        var links = [].map.call(d.querySelectorAll('a[href*="gopher-request.html"]'),
                                function(a){ return a.getAttribute('href'); });
        out.requestLinks = links.slice(0,6);
        var pre=d.createElement('pre'); pre.id='IQ';
        pre.textContent=m+JSON.stringify(out)+m; d.body.appendChild(pre);
      }, 900);
    }, 700);
  });
})();
</script>
"""


def run(args, timeout=30):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout).stdout or ""
    except subprocess.TimeoutExpired as e:
        o = e.stdout
        return (o.decode("utf-8", "replace") if isinstance(o, bytes) else o) or ""


print("=" * 70)
print("GOPHER iQ PILL — runtime check on the pages whose engine copy was touched")
print("=" * 70)
fail = 0
for page in PAGES:
    p = os.path.join(SERVE, page)
    orig = open(p, encoding="utf-8").read()
    open(p, "w", encoding="utf-8").write(orig.replace("</body>", PROBE + "</body>", 1))
    try:
        dom = run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
                   "--user-data-dir=" + PROFILE, "--window-size=1280,900",
                   "--virtual-time-budget=9000", "--dump-dom", BASE + page])
    finally:
        open(p, "w", encoding="utf-8").write(orig)
    m = re.search(r'<pre id="IQ">###(\{.*?\})###</pre>', dom, re.S)
    if not m:
        print("  %-24s PROBE ABSENT — inconclusive, not a pass" % page)
        fail += 1
        continue
    raw = m.group(1).replace("&quot;", '"').replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    a = json.loads(raw)
    bad = []
    if not a["pillPresent"]:
        bad.append("no .ai-bar on page")
    if not a["engineHooksAttached"]:
        bad.append("engine did NOT attach (aiInput/aiScope missing)")
    if a["errors"]:
        bad.append("JS errors: %s" % a["errors"][:2])
    if not a.get("resultsContainerExists"):
        bad.append("#aiResults container missing")
    if not a["answerRendered"]:
        bad.append("engine did NOT answer (#aiResults still empty)")
    if a.get("resultsBefore", -1) > 20:
        bad.append("#aiResults was already populated before typing — result not attributable")
    if bad:
        fail += 1
    print("  %-24s pill=%s hooks=%s #aiResults %d->%d chars errors=%d  %s"
          % (page, a["pillPresent"], a["engineHooksAttached"], a.get("resultsBefore",-1),
             len(a.get("answerSample","")), len(a["errors"]),
             "OK" if not bad else "<-- " + "; ".join(bad)))
    if a.get("answerSample"):
        print("      answer: %s" % a["answerSample"])

print()
print("RESULT: %d problem page(s)" % fail)
