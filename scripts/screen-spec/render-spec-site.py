#!/usr/bin/env python3
"""Render the generated screen JSON + PNGs into a browsable spec site.

Input : screen-spec/*.json + screen-spec/img/*.png   (from gen-screen-spec.py)
Output: screen-spec/index.html + screen-spec/<id>.html

The generated half only. Behaviour rules / endpoints / REUSE verdict are authored per
screen and live in screen-spec/notes/<id>.md — if that file exists it is folded in, and
if it does not the page says so out loud rather than looking complete.
"""
import json, os, glob, html

HERE = os.path.dirname(os.path.abspath(__file__))
from spec_paths import REPO, OUT, NOTES, require_destination   # one definition, three scripts

CSS = """
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
color:#1d2433;background:#f6f7f9;line-height:1.45}
.wrap{max-width:1400px;margin:0 auto;padding:22px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#5b6472;margin:22px 0 9px}
.meta{color:#5b6472;font-size:13px;margin:0 0 16px}
a{color:#185fa5}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.card{background:#fff;border:1px solid #e0e4ea;border-radius:10px;padding:11px;text-decoration:none;color:inherit;display:block}
.card:hover{border-color:#9aa4b2;box-shadow:0 2px 10px rgba(20,30,50,.08)}
.card img{width:100%;border-radius:6px;border:1px solid #eceff3;display:block;margin-bottom:8px}
.card b{font-size:13px}
.badge{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.04em;border-radius:5px;padding:2px 7px;margin-left:6px}
.b-native{background:#e1f5ee;color:#0f6e56}.b-frames{background:#faeeda;color:#854f0b}.b-request{background:#e3ecfa;color:#1d4f9c}
.cols{display:grid;grid-template-columns:390px 1fr;gap:24px;align-items:start}
@media(max-width:900px){.cols{grid-template-columns:1fr}}
.shot{background:#fff;border:1px solid #e0e4ea;border-radius:12px;padding:10px;position:sticky;top:16px}
.shot img{width:100%;border-radius:8px;display:block}
.panel{background:#fff;border:1px solid #e0e4ea;border-radius:12px;padding:16px 18px;margin:0 0 14px}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th,td{border:1px solid #eceff3;padding:5px 8px;text-align:left}
th{background:#f7f8fa;color:#5b6472;font-size:11px;text-transform:uppercase;letter-spacing:.03em}
td.v{font-family:ui-monospace,Menlo,monospace;font-size:11px}
.sw{display:inline-block;width:13px;height:13px;border-radius:3px;border:1px solid rgba(0,0,0,.15);vertical-align:-2px;margin-right:6px}
.tok{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#0f6e56;font-weight:700}
.untok{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#a33107}
.tree{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;line-height:1.75;white-space:pre;overflow-x:auto;
background:#f4f6f8;border:1px solid #e4e7ec;border-radius:8px;padding:11px 13px}
.tree .i{color:#185fa5;font-weight:700}.tree .t{color:#0f6e56}.tree .d{color:#8a93a3}
.warn{background:#fff8e1;border:1px solid #f3d98a;border-left:4px solid #e8a93b;border-radius:0 8px 8px 0;
padding:10px 13px;font-size:12.5px;color:#6b4e16;margin:0 0 14px}
.kpi{display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px;color:#5b6472;margin:0 0 12px}
.kpi b{color:#1d2433;font-size:15px;display:block}
"""


def badge(served):
    return {"NATIVE": "b-native", "FRAMES": "b-frames"}.get(served, "b-request")


def esc(s):
    return html.escape(str(s or ""))


def tree_html(n, depth=0, out=None):
    if out is None:
        out = []
    if depth > 6:
        return out
    pad = "  " * depth
    lbl = n["tag"] + ("." + ".".join(n["cls"][:3]) if n.get("cls") else "")
    bits = [f'{pad}<span class="i">{esc(lbl)}</span>']
    bits.append(f'<span class="d"> {n["w"]}×{n["h"]}</span>')
    if n.get("interactive"):
        bits.append('<span class="d"> [interactive'
                    + (f' → {esc(n["goto"])}' if n.get("goto") else "") + ']</span>')
    if n.get("text"):
        bits.append(f'<span class="t">  "{esc(n["text"])}"</span>')
    out.append("".join(bits))
    for c in n.get("children", []):
        tree_html(c, depth + 1, out)
    return out


def token_table(rows, kind):
    if not rows:
        return "<p style='color:#8a93a3;font-size:12.5px'>none</p>"
    body = []
    for r in rows[:14]:
        v = r["value"]
        sw = (f'<span class="sw" style="background:{esc(v)}"></span>'
              if kind in ("color", "backgroundColor") and v.startswith(("rgb", "#")) else "")
        name = (f'<span class="tok">{esc(r["token"])}</span>' if r["token"]
                else '<span class="untok">— literal, needs a token</span>')
        body.append(f"<tr><td class='v'>{sw}{esc(v)}</td><td>{r['count']}</td><td>{name}</td></tr>")
    return ("<table><tr><th>painted value</th><th>uses</th><th>token</th></tr>"
            + "".join(body) + "</table>")


def main():
    require_destination()   # fail loudly if the private handoff repo isn't there
    idx = json.load(open(os.path.join(OUT, "_index.json")))
    os.makedirs(NOTES, exist_ok=True)

    def cards_for(pred):
        cards = []
        for e in sorted(idx, key=lambda x: x["id"]):
            if not pred(e):
                continue
            fr = e.get("frame") or {}
            dims = f' · {fr["w"]}×{fr["h"]}' if fr else ""
            cards.append(
                f'<a class="card" href="{esc(e["id"])}.html">'
                f'<img src="img/{esc(e["id"])}.png" alt="">'
                f'<b>{esc(e["id"])}</b><span class="badge {badge(e["servedBy"])}">{esc(e["servedBy"])}</span>'
                f'<div style="font-size:11.5px;color:#8a93a3">{e["nodes"]} nodes{dims}</div></a>')
        return cards
    go_cards = cards_for(lambda e: e["servedBy"] != "REQUEST")
    rq_cards = cards_for(lambda e: e["servedBy"] == "REQUEST")

    open(os.path.join(OUT, "index.html"), "w").write(f"""<!doctype html><meta charset="utf-8">
<title>Gopher — Screen Spec (generated)</title><style>{CSS}</style><div class="wrap">
<h1>Gopher — Screen Implementation Spec</h1>
<p class="meta"><b>Generated from what the prototype renders</b>, not from any source file —
so it cannot go stale, and a screen that does not render cannot appear here.
Regenerate with <code>gen-screen-spec.py</code> then <code>render-spec-site.py</code>.</p>
<div class="warn"><b>Do not implement from <code>_prototypes/Go/_day1-figma-archive/</code>.</b>
Those 24 files are the day-1 Figma import, partially updated, and are not the build target.</div>
<h2>Gopher Go — {len(go_cards)} screens</h2><div class="grid">{''.join(go_cards)}</div>
<h2>Gopher Request — {len(rq_cards)} screens</h2><div class="grid">{''.join(rq_cards)}</div></div>""")

    for e in idx:
        d = json.load(open(os.path.join(OUT, f"{e['id']}.json")))
        tot = sum(len(d["tokens"][k]) for k in d["tokens"])
        named = sum(1 for k in d["tokens"] for r in d["tokens"][k] if r["token"])
        note_p = os.path.join(NOTES, f"{e['id']}.md")
        if os.path.exists(note_p):
            note = f"<pre style='white-space:pre-wrap;font-size:13px'>{esc(open(note_p).read())}</pre>"
        else:
            note = ("<div class='warn' style='margin:0'><b>Not authored yet.</b> "
                    "Behaviour rules, endpoints and the REUSE/ADAPT/NET-NEW verdict for this "
                    f"screen go in <code>notes/{esc(e['id'])}.md</code>. Until then this page is "
                    "the <i>visual + structural</i> spec only.</div>")
        toks = "".join(f"<h2>{k}</h2>{token_table(d['tokens'][k], k)}"
                       for k in ["color", "backgroundColor", "fontSize", "fontWeight", "borderRadius"])
        open(os.path.join(OUT, f"{e['id']}.html"), "w").write(f"""<!doctype html><meta charset="utf-8">
<title>{esc(e['id'])} — screen spec</title><style>{CSS}</style><div class="wrap">
<p class="meta"><a href="index.html">← all screens</a></p>
<h1>{esc(e['id'])}<span class="badge {badge(e['servedBy'])}">{esc(e['servedBy'])}</span></h1>
<p class="meta">Served by the <b>{esc(e['servedBy'])}</b> registry · {d['nodes']} rendered nodes ·
{named}/{tot} painted values map to a named token</p>
<div class="cols"><div class="shot"><img src="img/{esc(e['id'])}.png" alt=""></div><div>
<div class="panel"><h2 style="margin-top:0">Behaviour · endpoints · reuse verdict</h2>{note}</div>
<div class="panel"><h2 style="margin-top:0">Component tree</h2>
<div class="tree">{chr(10).join(tree_html(d['tree']))}</div></div>
<div class="panel"><h2 style="margin-top:0">Tokens actually painted</h2>
<p style="font-size:12.5px;color:#5b6472;margin:0 0 10px">Values marked
<span class="untok">literal</span> are hardcoded in the prototype and need a token before a
dev can implement them consistently.</p>{toks}</div>
</div></div></div>""")
    print(f"wrote index.html + {len(idx)} screen pages → {OUT}")


if __name__ == "__main__":
    main()
