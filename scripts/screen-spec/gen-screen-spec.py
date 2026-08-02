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

Covers BOTH apps:
  Go      — _prototypes/Go/gopher-go-prototype.html (single page; screens render in a
            SHADOW ROOT via load(id); registries NATIVE + FRAMES read off the live page)
  Request — _prototypes/Request/gopher-request-*.html (one page per screen, PLAIN DOM;
            the 7-step flow is one page driven to each step via state.step + render())

Full-scroll capture: phone mocks keep content inside fixed-height inner scrollers
(#phone/#scroll). Before shooting, scroll containers are expanded (height:auto,
overflow:visible) so the PNG shows the WHOLE screen, then captured with
captureBeyondViewport. Without this, every tall screen publishes as a half-screen.

Usage:  python3 gen-screen-spec.py [screen_id ...]
        (no args = every screen in both apps)
Needs:  a local serve of the repo on :8141 (serve a COPY, not the Desktop tree — TCC
        blocks Chrome from reading it):
        python3 -m http.server 8141 --directory <serve-copy>
"""
import json, os, subprocess, sys, time, urllib.request, base64

try:
    import websocket  # websocket-client
except ImportError:
    sys.exit("pip install websocket-client")

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9333
# Tooling lives in scripts/, the DELIVERABLE lives in docs/ — the dev partner reads the
# latter. Resolved from the repo root, not from this file's neighbours, so moving the
# script cannot silently strand the output in a second location. (Two copies of the spec
# is the exact drift this whole system exists to prevent.)
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(REPO, "docs", "screen-spec")
BASE = "http://localhost:8141/_prototypes"
GO_URL = f"{BASE}/Go/gopher-go-prototype.html"
DEVICE_W, DEVICE_H = 1280, 950
MAX_SHOT_H = 6000   # sanity cap — nothing legitimate is taller

# Request app: one page per screen. "prep" runs in-page before extraction (the flow
# page is driven to each step; other pages need nothing). Steps 3+ get representative
# state so the render is what a real requester would see, not an empty form.
FLOW = f"{BASE}/Request/gopher-request-flow.html"
_FLOW_SEED = """
Math.random = () => 0.42;   // freeze random-driven copy ("N workers already interested")
state.category = state.category || 'delivery';
state.description = state.description || 'Pick up my grocery order from Harris Teeter and deliver it to my door.';
"""
def _flow(step, extra=""):
    # Timers are cleared in the SAME synchronous block as render() — the typewriter
    # status line never gets a tick, so it freezes at zero chars every run instead of
    # at a wall-clock-dependent point (which made consecutive runs diff).
    return (_FLOW_SEED + extra +
            f"state.step={step}; state.maxStepReached={step}; render(); "
            "{const _m=setTimeout(()=>{},0); for(let _i=1;_i<=_m;_i++){clearInterval(_i);clearTimeout(_i);}}")

REQUEST_SCREENS = [
    # id                url                                          prep JS (runs in-page)
    ("req-home",        f"{BASE}/Request/gopher-request-home.html",       ""),
    ("req-flow-step-1", FLOW, "state.step=1; state.maxStepReached=1; render();"),
    ("req-flow-step-2", FLOW, _flow(2)),
    ("req-flow-step-3", FLOW, _flow(3)),
    ("req-flow-step-4", FLOW, _flow(4)),
    ("req-flow-step-5", FLOW, _flow(5)),
    ("req-flow-step-6", FLOW, _flow(6, "state.payAmount=state.payAmount||'$25'; ")),
    ("req-flow-step-7", FLOW, _flow(7, "state.payAmount=state.payAmount||'$25'; state.waiverChecked=true; ")),
    ("req-deals",       f"{BASE}/Request/gopher-request-deals.html",      ""),
    ("req-inbox",       f"{BASE}/Request/gopher-request-inbox.html",      ""),
    ("req-inprogress",  f"{BASE}/Request/gopher-request-inprogress.html", ""),
    ("req-refer",       f"{BASE}/Request/gopher-request-refer.html",      ""),
]


class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=90)
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

    def eval(self, expr, note=""):
        r = self.send("Runtime.evaluate", expression=expr, returnByValue=True,
                      awaitPromise=True)
        res = r.get("result", {})
        if r.get("exceptionDetails"):
            raise RuntimeError(f"JS error {note}: "
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
# for the CURRENT screen, and prepares it for a full-height capture.
#
# Go screens render inside a shadow root (.stage .host); Request pages are plain DOM —
# the same extractor handles both by picking root/frame accordingly.
EXTRACT = r"""
(() => {
  const host = document.querySelector('.stage .host') || document.querySelector('.host');
  const shadow = host && host.shadowRoot ? host.shadowRoot : null;
  const root = shadow || document;
  // Screen container: Go NATIVE = .frame · Go deals frame + Request pages = #phone/.phone
  // · storyboard screens (job-card-states) have no wrapper → largest top-level element.
  // Storyboard screens (job-card-states) have no wrapper — sibling blocks straight in
  // the (shadow) root — so fall back to the host element / body, whose box spans them.
  let frame = root.querySelector('.frame') ||
              root.querySelector('#phone') || root.querySelector('.phone') ||
              (shadow ? host : document.body);

  // The browser pane / headless tab may be treated as background — freeze-proof the
  // read by finishing (or cancelling infinite) animations before measuring.
  try {
    (frame.getAnimations ? frame.getAnimations({subtree:true}) : []).forEach(a => {
      try { a.finish(); } catch(_) { try { a.cancel(); } catch(__){} }
    });
  } catch(_){}
  // SMIL (inline <animate>) is outside getAnimations() — pause every SVG at t=0 or
  // the mascot art shoots a different frame each run.
  try {
    (frame.shadowRoot || frame).querySelectorAll('svg').forEach(s => {
      try { s.pauseAnimations(); s.setCurrentTime(0); } catch(_){}
    });
  } catch(_){}

  // FULL-SCROLL: expand fixed-height phones + inner scrollers so nothing is clipped.
  const expand = () => {
    const scope = frame.shadowRoot || frame;   // host-element root: descend into shadow
    const els = [frame, ...scope.querySelectorAll('*')];
    for (const el of els) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4) {
        el.style.setProperty('overflow-y', 'visible', 'important');
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('max-height', 'none', 'important');
      }
      if ((el.id === 'phone' || el.classList.contains('phone') || el.classList.contains('frame'))
          && el.scrollHeight > el.clientHeight + 4) {
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('max-height', 'none', 'important');
      }
    }
  };
  expand(); expand();   // second pass catches scrollers revealed by the first
  // ...and ancestor scrollers (the Go dev shell scrolls the .stage, not the page) —
  // a clipped ancestor means everything below the fold paints as background.
  // NOTE: start at the shadow HOST itself, not its parent — the Go shell's .host is a
  // fixed-height scroller (a phone-chrome box) and is outside both the frame subtree
  // and the parent chain if skipped; it silently clips every tall screen at ~854px.
  for (let anc = (frame.getRootNode().host || frame); anc; anc = anc.parentElement) {
    const cs = getComputedStyle(anc);
    if (/(auto|scroll|hidden|clip)/.test(cs.overflowY)) {
      anc.style.setProperty('overflow', 'visible', 'important');
      anc.style.setProperty('height', 'auto', 'important');
      anc.style.setProperty('max-height', 'none', 'important');
    }
  }
  // Ancestor flex-centering re-positions the frame every time the viewport is resized
  // for capture — the clip chases a moving target. Opt OUT of ancestor layout entirely:
  // pin the screen (the shadow host, or the frame itself) fixed at the top-left. Its
  // shadow styles stay intact and the clip geometry becomes stable across resizes.
  const pin = shadow ? host : frame;
  if (pin !== document.body) {
    pin.style.setProperty('position', 'fixed', 'important');
    pin.style.setProperty('top', '0', 'important');
    pin.style.setProperty('left', '0', 'important');
    pin.style.setProperty('margin', '0', 'important');
  }
  // dev-shell chrome (index sidebar, title bar, restart pill) is pinned over the page
  // and would bake into tall captures — hide anything fixed/sticky OUTSIDE the screen.
  const inScreen = frame.getRootNode().host || frame;
  for (const el of document.querySelectorAll('body *')) {
    if (el === inScreen || el.contains(inScreen) || inScreen.contains(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.position === 'sticky')
      el.style.setProperty('visibility', 'hidden', 'important');
  }
  window.scrollTo(0, 0);

  const PROPS = ['color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight',
                 'borderRadius','borderColor','borderWidth','padding','margin','gap',
                 'display','flexDirection','justifyContent','alignItems','textAlign'];
  const tokens = {color:{}, backgroundColor:{}, fontSize:{}, fontWeight:{}, borderRadius:{}, fontFamily:{}};
  const bump = (k,v) => {
    if(!v||v==='none'||v==='normal'||v==='rgba(0, 0, 0, 0)'||v==='transparent') return;
    if(k==='borderRadius' && v==='0px') return;      // "no radius" is not a design value
    tokens[k][v]=(tokens[k][v]||0)+1;
  };

  // CSS custom properties declared for this screen, so painted values can be NAMED.
  // Custom props are authored as hex (#002461) but computed styles come back as
  // rgb(0, 36, 97) — without normalising, every token lookup misses. Normalise by
  // letting the browser resolve each declared value the same way it resolves a
  // painted one. A value can carry several names (--navy and --ink are both #002461)
  // — report ALL of them, the ambiguity is real and the dev should see it.
  // Kind-aware maps — a 16px FONT must not be labelled --radius-card just because the
  // card radius happens to be 16px. Colors resolve in color-space, radii against
  // size-valued tokens, fonts against font tokens; fontSize/fontWeight have no tokens
  // in the vocabulary yet and stay honest literals.
  const varMap = {color:{}, size:{}, font:{}};
  const put = (space, v, name) => {
    if (!v) return;
    const m = varMap[space];
    (m[v] = m[v] || []).includes(name) || m[v].push(name);
  };
  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const unq = s => (s||'').trim().replace(/^['"]|['"]$/g, '');
  const norm = v => {
    v = (v || '').trim();
    if (!v) return v;
    if (!/^#|^rgb|^hsl/i.test(v)) return v;          // sizes/keywords pass through
    probe.style.color = '';
    probe.style.color = v;
    const c = getComputedStyle(probe).color;
    return c || v;
  };
  // Shadow screens: read ONLY the screen's own sheets — the dev shell's page-level
  // :root vars (--green:#33D975 etc.) are shell chrome, not app vocabulary, and every
  // screen now declares the full canonical set on :host.
  const sheets = [...(root.styleSheets || [])];
  for (const sheet of sheets) {
    let rules; try { rules = sheet.cssRules; } catch(e) { continue; }
    for (const r of rules) {
      if (!r.style) continue;
      for (const p of r.style) {
        if (!p.startsWith('--')) continue;
        const raw = r.style.getPropertyValue(p).trim();
        if (/^#|^rgb|^hsl/i.test(raw)) put('color', norm(raw), p);
        else if (/^-?[\d.]+(px|%|em|rem)$/.test(raw)) put('size', raw, p);
        else put('font', unq(raw), p);
      }
    }
  }
  probe.remove();
  const SPACE = {color:'color', backgroundColor:'color', borderRadius:'size',
                 fontFamily:'font', fontSize:null, fontWeight:null};

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
    bump('borderRadius', cs.borderRadius);
    bump('fontFamily', unq((cs.fontFamily||'').split(',')[0]));

    // a host-element root keeps its content in the shadow root, not in .children
    const kidEls = (el.shadowRoot ? el.shadowRoot.children : el.children);
    const kids = [...kidEls].map(c => walk(c, depth+1)).filter(Boolean);
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
  const rank = (o, space) => Object.entries(o).sort((a,b) => b[1]-a[1])
                    .map(([v,n]) => {
                      const names = space && varMap[space][v];
                      return {value: v, count: n, token: names ? names.join(' · ') : null};
                    });
  const out = {};
  for (const k of Object.keys(tokens)) out[k] = rank(tokens[k], SPACE[k]);
  const fr = frame.getBoundingClientRect();
  return {tree, tokens: out, nodeCount,
          clip: {x: fr.x + window.scrollX, y: fr.y + window.scrollY,
                 width: fr.width, height: fr.height}};
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


REMEASURE = r"""
(() => {
  const host = document.querySelector('.stage .host') || document.querySelector('.host');
  const shadow = host && host.shadowRoot ? host.shadowRoot : null;
  const root = shadow || document;
  const frame = root.querySelector('.frame') ||
                root.querySelector('#phone') || root.querySelector('.phone') ||
                (shadow ? host : document.body);
  window.scrollTo(0, 0);
  const fr = frame.getBoundingClientRect();
  return {x: fr.x + window.scrollX, y: fr.y + window.scrollY,
          width: fr.width, height: fr.height};
})()
"""


def _painted_pct(png_bytes):
    """Rough bottom-of-paint check: how far down the image the last non-background row
    sits. Heuristic (a real screen can end in flat background) — only used to trigger
    retries, never to reject a capture outright."""
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(png_bytes)).convert('RGB')
        w, h = im.size
        bg = im.getpixel((w // 2, h - 2))
        for y in range(h - 1, -1, -1):
            row = [im.getpixel((x, y)) for x in range(0, w, 40)]
            if any(abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > 30 for r, g, b in row):
                return 100.0 * y / h
        return 0.0
    except Exception:
        return 100.0     # no PIL → skip the check


def capture(c, sid, served_by, data, index):
    # Headless paints only the emulated viewport — a clip taller than the viewport
    # captures unpainted background. Resize the viewport to the content, re-measure
    # (resizing reflows), flush frames, shoot, restore. Rasterisation of the
    # newly-revealed area is ASYNC — verify paint coverage and retry, or tall screens
    # ship half-painted, cut exactly at the old viewport line.
    # Resizing the viewport RE-POSITIONS the frame (the shell re-centers it), so a
    # single resize leaves the clip hanging past the painted page — iterate until the
    # whole frame fits inside the viewport at its post-resize position.
    clip = data["clip"]
    for _ in range(4):
        vh = min(int(clip["y"] + clip["height"]) + 40, MAX_SHOT_H)
        c.send("Emulation.setDeviceMetricsOverride", width=DEVICE_W,
               height=max(vh, DEVICE_H), deviceScaleFactor=2, mobile=False)
        time.sleep(0.8)
        clip = c.eval(REMEASURE, note=f"{sid} remeasure")
        if clip["y"] + clip["height"] + 4 <= max(vh, DEVICE_H):
            break
    data["clip"] = clip
    raw = b""
    for attempt in range(4):
        # Force a FULL re-raster: regions revealed by the resize otherwise keep stale
        # compositor tiles (the pre-resize page bleeds into the shot below the fold).
        # The display toggle RESTARTS CSS animations — re-freeze them or consecutive
        # runs shoot different animation phases and the spec never diffs clean.
        c.eval("(()=>{const d=document.documentElement;d.style.display='none';"
               "void d.offsetHeight;d.style.display='';void d.offsetHeight;"
               "const freeze=els=>els.forEach(a=>{try{a.finish()}catch(_){try{a.cancel()}catch(__){}}});"
               "try{freeze(document.getAnimations())}catch(_){}"
               "const h=document.querySelector('.stage .host');"
               "try{if(h)freeze(h.getAnimations({subtree:true}))}catch(_){}"
               "const pauseSvg=r=>{try{r.querySelectorAll('svg').forEach(s=>{try{s.pauseAnimations();s.setCurrentTime(0)}catch(_){}})}catch(_){}};"
               "pauseSvg(document); if(h&&h.shadowRoot)pauseSvg(h.shadowRoot);"
               # the display toggle restarts one-shot CSS animations (and shadow-tree
               # animations dodge getAnimations) — disable animation at the CSS level
               "const kill=r=>{if(!r.querySelector('#__speckill')){const st=document.createElement('style');"
               "st.id='__speckill';st.textContent='*{animation:none !important;transition:none !important}';"
               "(r.head||r).appendChild(st);}};"
               "kill(document); if(h&&h.shadowRoot)kill(h.shadowRoot);"
               "return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,150))))})()",
               note=f"{sid} raster")
        shot = c.send("Page.captureScreenshot", format="png",
                      clip={"x": clip["x"], "y": clip["y"],
                            "width": clip["width"],
                            "height": min(clip["height"], MAX_SHOT_H),
                            "scale": 1})
        raw = base64.b64decode(shot["data"])
        if _painted_pct(raw) >= 95.0:
            break
        # kick the compositor: scroll to the bottom of the clip and back, force reflow
        c.eval("(()=>{window.scrollTo(0,document.documentElement.scrollHeight);"
               "void document.body.offsetHeight;"
               "return new Promise(r=>requestAnimationFrame(()=>{window.scrollTo(0,0);"
               "requestAnimationFrame(()=>setTimeout(r,150))}))})()", note=f"{sid} kick")
        time.sleep(1.0)
    c.send("Emulation.setDeviceMetricsOverride", width=DEVICE_W, height=DEVICE_H,
           deviceScaleFactor=2, mobile=False)
    png = os.path.join(OUT, "img", f"{sid}.png")
    open(png, "wb").write(raw)
    rec = {"id": sid, "servedBy": served_by, "nodes": data["nodeCount"],
           "frame": {"w": round(clip["width"]), "h": round(clip["height"])},
           "tokens": data["tokens"], "tree": data["tree"]}
    json.dump(rec, open(os.path.join(OUT, f"{sid}.json"), "w"), indent=1)
    index.append({"id": sid, "servedBy": served_by, "nodes": data["nodeCount"],
                  "frame": rec["frame"]})
    print(f"  ✓ {sid:<22} {served_by:<9} {data['nodeCount']:>4} nodes  "
          f"{round(clip['width'])}×{round(clip['height'])}")


def main():
    want = sys.argv[1:]
    os.makedirs(os.path.join(OUT, "img"), exist_ok=True)
    proc = launch_chrome()
    index = []
    try:
        tgt = json.load(urllib.request.urlopen(f"http://localhost:{PORT}/json"))
        page = next(t for t in tgt if t["type"] == "page")
        c = CDP(page["webSocketDebuggerUrl"])
        c.send("Page.enable"); c.send("Runtime.enable")
        c.send("Emulation.setDeviceMetricsOverride", width=DEVICE_W, height=DEVICE_H,
               deviceScaleFactor=2, mobile=False)

        # ---------- Go (single page, shadow-root screens) ----------
        c.send("Page.navigate", url=GO_URL)
        time.sleep(6)
        reg = json.loads(c.eval(
            "JSON.stringify({native:Object.keys(NATIVE),frames:Object.keys(FRAMES)})"))
        native, frames = reg["native"], reg["frames"]
        go_ids = native + [f for f in frames if f not in native]
        todo = [i for i in go_ids if (not want or i in want)]
        print(f"Go registries: {len(native)} NATIVE + {len(frames)} FRAMES "
              f"({len(go_ids)} unique) — generating {len(todo)}")
        for sid in todo:
            try:
                # reload between screens so one screen's scroll-expansion can't leak
                c.eval(f"(()=>{{ load({json.dumps(sid)}); return 1; }})()")
                time.sleep(1.4)
                data = c.eval(EXTRACT, note=sid)
                if not data or data.get("error"):
                    print(f"  !! {sid}: {data}"); continue
                capture(c, sid, "NATIVE" if sid in native else "FRAMES", data, index)
                c.send("Page.navigate", url=GO_URL)
                time.sleep(4)
            except Exception as e:
                print(f"  !! {sid}: {e}")

        # ---------- Request (one page per screen, plain DOM) ----------
        todo_r = [(s, u, p) for (s, u, p) in REQUEST_SCREENS if (not want or s in want)]
        print(f"Request app: {len(REQUEST_SCREENS)} screens — generating {len(todo_r)}")
        for sid, url, prep in todo_r:
            try:
                c.send("Page.navigate", url=url)
                time.sleep(4)
                if prep:
                    c.eval(f"(()=>{{ {prep} return 1; }})()", note=f"{sid} prep")
                    time.sleep(0.8)
                data = c.eval(EXTRACT, note=sid)
                if not data or data.get("error"):
                    print(f"  !! {sid}: {data}"); continue
                capture(c, sid, "REQUEST", data, index)
            except Exception as e:
                print(f"  !! {sid}: {e}")

        if not want:
            json.dump(index, open(os.path.join(OUT, "_index.json"), "w"), indent=1)
        else:   # partial run: merge into the existing index
            try:
                old = {e["id"]: e for e in json.load(open(os.path.join(OUT, "_index.json")))}
            except Exception:
                old = {}
            for e in index: old[e["id"]] = e
            json.dump(list(old.values()), open(os.path.join(OUT, "_index.json"), "w"), indent=1)
        print(f"\nwrote {len(index)} screen spec(s) → {OUT}")
        c.close()
    finally:
        proc.kill()


if __name__ == "__main__":
    main()
