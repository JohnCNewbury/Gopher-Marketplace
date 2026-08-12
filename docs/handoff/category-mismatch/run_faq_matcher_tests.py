#!/usr/bin/env python3
"""Regression tests for the iQ FAQ MATCHER (scoreRec/searchFaqs).

    python3 run_faq_matcher_tests.py        # exit 0 if all pass, 1 otherwise

Companion to run_category_tests.py, which covers the CATEGORY classifier. This
one covers the other half of a pill answer: which FAQ is offered as the related
answer. It runs the REAL functions extracted verbatim from
Final/assets/js/gopher-ai-engine.js — no re-implementation, because a
re-implementation is a different program and would pass while the page fails.

WHY THIS EXISTS (owner screenshot, 2026-08-12)
  "Can you help me with electrical work" returned the FAQ "How does delivery
  work WITH Gopher?" — matched on the function words `with` and `help`, which
  the screenshot showed highlighted as the matched terms.

  Root cause was NOT the STOP list. scoreRec already excludes low-information
  words from `terms` via the LOWINFO guard. But `synExtra` was built from
  expandQuery(q), and expandQuery returns the ORIGINAL query words alongside any
  synonyms. Only `terms` were subtracted from that set — so every LOWINFO word
  the guard had just excluded (help / with / you) re-entered as a fake "synonym"
  and bought the capped -3 confidence bonus, dragging unrelated records under
  FAQ_FLOOR. The guard was doing its job; the bonus path was going around it.

  Fixed by also subtracting the raw query words from synSet, so synExtra holds
  only words a SYNONYMS entry genuinely ADDED.

THE RULE THIS PROTECTS
  A query must never be matched to a FAQ on function words alone. Assertions
  below are of two kinds:
    MUST_MATCH  — real intents that must keep answering (guards against
                  over-tightening, the "cash out" failure mode of 2026-07-21)
    MUST_NOT    — queries whose only overlap with the named record is filler
"""
import json, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ENGINE = os.path.join(ROOT, "Final/assets/js/gopher-ai-engine.js")

# (query, substring that must appear in the TOP record's question)
MUST_MATCH = [
    ("how do I cash out",                 "cash out"),
    ("when do I get paid",                "paid"),
    ("can I pay with cash",               "cash"),
    ("how much does it cost",             "cost"),
    ("what is trustshield",               "trustshield"),
    ("how do I become a gopher",          "gopher"),
    ("how does delivery work with Gopher", "delivery work"),
    ("can I use contactless delivery",    "contactless"),
]

# (query, substring of a record question that must NOT be the top match)
MUST_NOT = [
    # the owner's repro — a trade query must not land on the delivery FAQ
    ("Can you help me with electrical work",  "delivery work"),
    ("can you help me with plumbing work",    "delivery work"),
    ("can you help me with carpentry work",   "delivery work"),
    # filler-only queries must not manufacture a confident match at all
    ("can you help me with this",             "delivery work"),
    ("do you have something for me",          "delivery work"),
]

EXTRACT = r"""
var fs = require('fs');
var eng = fs.readFileSync(ENGINE_PATH, 'utf8');
function efn(name){
  var i = eng.indexOf('function ' + name + '(');
  if (i === -1) return null;
  var k = eng.indexOf('{', i), d = 0;
  while (k < eng.length){
    if (eng[k] === '{') d++;
    else if (eng[k] === '}'){ d--; if (d === 0) return eng.slice(i, k+1); }
    k++;
  }
}
function econst(name){
  var i = eng.indexOf('const ' + name);
  if (i === -1) return null;
  var k = eng.indexOf('=', i), d = 0;
  while (k < eng.length){
    var ch = eng[k];
    if ('[{('.indexOf(ch) >= 0) d++;
    else if (']})'.indexOf(ch) >= 0) d--;
    else if (ch === ';' && d === 0) return eng.slice(i, k+1);
    k++;
  }
}
var parts = [];
['STOP','LOWINFO','FAQS','SYNONYMS','FAQ_FLOOR','DEAL_CUST','DEAL_BIZ'].forEach(function(c){
  var s = econst(c); if (s) parts.push(s);
});
['subseqScore','wordIn','expandQuery','dealAudience','scoreRec','searchFaqs'].forEach(function(f){
  var s = efn(f); if (s) parts.push(s);
});
var API = new Function(parts.join('\n') + ';return {searchFaqs: searchFaqs};')();
var CASES = JSON.parse(CASES_JSON);
var out = CASES.map(function(c){
  var r = API.searchFaqs(c.q, '*');
  var topQ = r.length ? r[0].rec.q : null;
  var topS = r.length ? r[0].score : null;
  var hit = topQ ? topQ.toLowerCase().indexOf(c.needle.toLowerCase()) !== -1 : false;
  return { q: c.q, kind: c.kind, needle: c.needle, top: topQ, score: topS,
           pass: c.kind === 'match' ? hit : !hit };
});
console.log(JSON.stringify(out));
"""


def main():
    cases = ([{"q": q, "needle": n, "kind": "match"} for q, n in MUST_MATCH] +
             [{"q": q, "needle": n, "kind": "reject"} for q, n in MUST_NOT])
    script = ("var ENGINE_PATH = " + json.dumps(ENGINE) + ";\n"
              "var CASES_JSON = " + json.dumps(json.dumps(cases)) + ";\n" + EXTRACT)
    tmp = "/tmp/_faq_matcher_harness.js"
    open(tmp, "w").write(script)
    node = os.path.expanduser("~/bin/node")
    if not os.path.exists(node):
        node = "node"
    out = subprocess.run([node, tmp], capture_output=True, text=True)
    os.unlink(tmp)
    if out.returncode != 0:
        sys.exit("node error: %s" % (out.stderr.strip() or out.stdout.strip()))
    rows = json.loads(out.stdout.strip())

    passed = 0
    print("-- FAQ matcher: must ANSWER --")
    for r in [x for x in rows if x["kind"] == "match"]:
        print("  [%s] %-40s -> %s" % ("PASS" if r["pass"] else "FAIL", r["q"][:40],
                                      (r["top"] or "(no match)")[:52]))
        if not r["pass"]:
            print("         expected a question containing %r" % r["needle"])
        passed += 1 if r["pass"] else 0
    print("-- FAQ matcher: must NOT be function-word-matched --")
    for r in [x for x in rows if x["kind"] == "reject"]:
        print("  [%s] %-40s -> %s" % ("PASS" if r["pass"] else "FAIL", r["q"][:40],
                                      (r["top"] or "(no match)")[:52]))
        if not r["pass"]:
            print("         matched %r on filler alone (score %.2f)" % (r["needle"], r["score"]))
        passed += 1 if r["pass"] else 0

    print("\n%d/%d passed" % (passed, len(rows)))
    sys.exit(0 if passed == len(rows) else 1)


if __name__ == "__main__":
    main()
