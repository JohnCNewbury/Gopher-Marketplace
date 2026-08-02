#!/usr/bin/env python3
"""
Screen-spec generator — the "Truth file" builder.

WHY THIS EXISTS: the spec is generated from what the prototype RENDERS, never from a
source file. A screen that does not render cannot enter the spec, which makes staleness
structurally impossible instead of something a human has to remember. (The 24 quarantined
-figma.html files are what happens without this rule.)

Mechanical + drift-proof (this script):   screen inventory · reference PNG · component
                                          tree · the token set actually painted
Authored per screen (not this script):    behaviour rules · endpoints · REUSE/ADAPT/NEW

Usage:  python3 gen-screen-spec.py [screen_id ...]
        (no args = every screen in both registries)
"""
import json, os, subprocess, sys, time, urllib.request, base64, re

try:
    import websocket  # websocket-client
except ImportError:
    sys.exit("pip install websocket-client")

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9333
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screen-spec")
URL = "http://localhost:8141/_prototypes/Go/gopher-go-prototype.html"
DEVICE_W, DEVICE_H = 430, 950


class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=60)
        self.i = 0

    def send(self, method, **params):
        self.i += 1
        self.ws.send(json.dumps({"id": self.i, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.i:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

    def eval(self, expr, timeout_note=""):
        r = self.send("Runtime.evaluate", expression=expr, returnByValue=True,
                      awaitPromise=True)
        res = r.get("result", {})
        if r.get("exceptionDetails"):
            raise RuntimeError(f"JS error {timeout_note}: "
                               f"{r['exceptionDetails'].get('text')} "
                               f"{res.get('description','')}")
        return res.get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass


# ---- the in-page extractor -------------------------------------------------
# Runs inside the prototype. Returns the condensed component tree + painted tokens
# for the CURRENT screen. Reads the shadow root, because Go's screens render there.
EXTRACT = r"""
(() => {
  const host = document.querySelector('.stage .host') || document.querySelector('.host');
  const root = host && host.shadowRoot ? host.shadowRoot : document;
  const frame = root.querySelector('.frame') || root.querySelector('body') || root;
  if (!frame) return {error: 'no frame'};

  const PROPS = ['color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight',
                 'borderRadius','borderColor','borderWidth','padding','margin','gap',
                 'display','flexDirection','justifyContent','alignItems','textAlign'];
  const tokens = {color:{}, backgroundColor:{}, fontSize:{}, fontWeight:{}, borderRadius:{}, fontFamily:{}};
  const bump = (k,v) => { if(!v||v==='none'||v==='normal') return; tokens[k][v]=(tokens[k][v]||0)+1; };

  // CSS custom properties declared for this screen, so painted values can be NAMED.
  // Custom props are authored as hex (#002461) but computed styles come back as
  // rgb(0, 36, 97) — without normalising, every token lookup misses. Normalise by
  // letting the browser resolve each declared value the same way it resolves a
  // painted one, so both sides of the map are in the same space.
  const varMap = {};
  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const norm = v => {
    v = (v || '').trim();
    if (!v) return v;
    if (!/^#|^rgb|^hsl/i.test(v)) return v;          // sizes/keywords pass through
    probe.style.color = '';
    probe.style.color = v;
    const c = getComputedStyle(probe).color;
    return c || v;
  };
  try {
    for (const sheet of [...(root.styleSheets||[])]) {
      let rules; try { rules = sheet.cssRules; } catch(e) { continue; }
      for (const r of rules) {
        if (!r.style) continue;
        for (const p of r.style) {
          if (!p.startsWith('--')) continue;
          const raw = r.style.getPropertyValue(p).trim();
          varMap[norm(raw)] = p;                      // normalised key
          varMap[raw] = p;                            // and the literal, for sizes
        }
      }
    }
  } catch(e) {}
  probe.remove();

  const SKIP = new Set(['SCRIPT','STYLE','LINK','SVG','PATH','CIRCLE','RECT','DEFS','LINEARGRADIENT','STOP','G']);
  let nodeCount = 0;

  function walk(el, depth) {
    if (depth > 7 || nodeCount > 400) return null;
    if (SKIP.has(el.tagName)) return null;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    nodeCount++;

    bump('color', cs.color); bump('backgroundColor', cs.backgroundColor);
    bump('fontSize', cs.fontSize); bump('fontWeight', cs.fontWeight);
    bump('borderRadius', cs.borderRadius); bump('fontFamily', (cs.fontFamily||'').split(',')[0]);

    const kids = [...el.children].map(c => walk(c, depth+1)).filter(Boolean);
    const ownText = [...el.childNodes]
      .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join(' ');

    // keep a node if it is interactive, carries its own text, has a class, or branches
    const cls = (typeof el.className === 'string' ? el.className : '').trim();
    const interactive = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL)$/.test(el.tagName) ||
                        el.hasAttribute('data-goto') || el.hasAttribute('data-goto2') ||
                        el.onclick != null;
    if (!interactive && !ownText && !cls && kids.length <= 1) return kids[0] || null;

    const style = {};
    for (const p of PROPS) { const v = cs[p]; if (v && v !== 'none' && v !== 'normal') style[p] = v; }

    return {
      tag: el.tagName.toLowerCase(),
      cls: cls.split(/\s+/).filter(Boolean).slice(0, 4),
      text: ownText.slice(0, 90),
      interactive: !!interactive,
      goto: el.getAttribute('data-goto') || el.getAttribute('data-goto2') || null,
      w: Math.round(rect.width), h: Math.round(rect.height),
      style: style,
      children: kids
    };
  }

  const tree = walk(frame, 0);
  const rank = o => Object.entries(o).sort((a,b) => b[1]-a[1])
                    .map(([v,n]) => ({value: v, count: n, token: varMap[v] || null}));
  const out = {};
  for (const k of Object.keys(tokens)) out[k] = rank(tokens[k]);
  const fr = frame.getBoundingClientRect();
  return {tree, tokens: out, nodeCount,
          clip: {x: fr.x, y: fr.y, width: fr.width, height: fr.height}};
})()
"""


def launch_chrome():
    prof = "/tmp/_specgen_profile"
    subprocess.run(["rm", "-rf", prof], check=False)
    p = subprocess.Popen(
        [CHROME, "--headless=new", f"--remote-debugging-port={PORT}",
         # Chrome 111+ rejects CDP websockets whose Origin it doesn't know.
         "--remote-allow-origins=*",
         f"--user-data-dir={prof}", "--no-first-run", "--no-default-browser-check",
         "--disable-gpu", "--hide-scrollbars", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            urllib.request.urlopen(f"http://localhost:{PORT}/json/version", timeout=1)
            return p
        except Exception:
            time.sleep(0.4)
    p.kill()
    sys.exit("chrome did not start")


def main():
    want = sys.argv[1:]
    os.makedirs(os.path.join(OUT, "img"), exist_ok=True)
    proc = launch_chrome()
    try:
        tgt = json.load(urllib.request.urlopen(f"http://localhost:{PORT}/json"))
        page = next(t for t in tgt if t["type"] == "page")
        c = CDP(page["webSocketDebuggerUrl"])
        c.send("Page.enable"); c.send("Runtime.enable")
        c.send("Emulation.setDeviceMetricsOverride", width=DEVICE_W, height=DEVICE_H,
               deviceScaleFactor=2, mobile=True)
        c.send("Page.navigate", url=URL)
        time.sleep(6)

        ids = c.eval("JSON.stringify({native:Object.keys(NATIVE),frames:Object.keys(FRAMES)})")
        reg = json.loads(ids)
        native, frames = reg["native"], reg["frames"]
        all_ids = native + [f for f in frames if f not in native]
        todo = [i for i in all_ids if (not want or i in want)]
        print(f"registries: {len(native)} NATIVE + {len(frames)} FRAMES "
              f"({len(all_ids)} unique) — generating {len(todo)}")

        index = []
        for sid in todo:
            try:
                c.eval(f"(()=>{{ load({json.dumps(sid)}); return 1; }})()")
                time.sleep(1.4)
                data = c.eval(EXTRACT, timeout_note=sid)
                if not data or data.get("error"):
                    print(f"  !! {sid}: {data}"); continue
                clip = data["clip"]
                shot = c.send("Page.captureScreenshot", format="png",
                              clip={"x": clip["x"], "y": clip["y"],
                                    "width": clip["width"],
                                    "height": min(clip["height"], 2000),
                                    "scale": 1})
                png = os.path.join(OUT, "img", f"{sid}.png")
                open(png, "wb").write(base64.b64decode(shot["data"]))
                served_by = "NATIVE" if sid in native else "FRAMES"
                rec = {"id": sid, "servedBy": served_by, "nodes": data["nodeCount"],
                       "tokens": data["tokens"], "tree": data["tree"]}
                json.dump(rec, open(os.path.join(OUT, f"{sid}.json"), "w"), indent=1)
                index.append({"id": sid, "servedBy": served_by, "nodes": data["nodeCount"]})
                print(f"  ✓ {sid:<22} {served_by:<7} {data['nodeCount']:>4} nodes")
            except Exception as e:
                print(f"  !! {sid}: {e}")
        json.dump(index, open(os.path.join(OUT, "_index.json"), "w"), indent=1)
        print(f"\nwrote {len(index)} screen spec(s) → {OUT}")
        c.close()
    finally:
        proc.kill()


if __name__ == "__main__":
    main()
