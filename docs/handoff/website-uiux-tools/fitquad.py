#!/usr/bin/env python3
"""Find the screen quad of a tilted phone mockup: the inner edge of the black bezel on
each side, fitted as four straight lines (a perspective keeps lines straight), then
intersected. usage: fitquad.py <mockup.webp> [debug.png]  -> prints TL TR BR BL."""
import sys, json
import numpy as np
from PIL import Image, ImageDraw

def load(p):
    im = np.asarray(Image.open(p).convert("RGBA")).astype(int)
    rgb, a = im[..., :3], im[..., 3]
    black = (a > 200) & (rgb.max(-1) < 25)
    solid = a > 200
    return im, black, solid

def inner_edge(line_black, line_solid, rev=False):
    """Walk in from the outside: transparent -> frame -> black bezel (>=2px) -> content.
    Return the index of the first content pixel after the first bezel run, or None."""
    n = len(line_black)
    idx = range(n - 1, -1, -1) if rev else range(n)
    seen_solid = False; run = 0
    for i in idx:
        if not seen_solid:
            seen_solid = line_solid[i]; continue
        if line_black[i]:
            run += 1
        elif run >= 2:
            return i
        elif run:
            run = 0
    return None

def fit(points, horizontal):
    """Robust line fit. vertical edges: x = a*y + b ; horizontal edges: y = a*x + b."""
    P = np.array(points, float)
    u, v = (P[:, 0], P[:, 1]) if horizontal else (P[:, 1], P[:, 0])
    keep = np.ones(len(u), bool)
    for _ in range(6):
        a, b = np.polyfit(u[keep], v[keep], 1)
        r = np.abs(v - (a * u + b))
        thr = max(1.5, np.median(r[keep]) * 3)
        nk = r < thr
        if (nk == keep).all(): break
        keep = nk
    return a, b, int(keep.sum()), float(np.abs(v[keep] - (a * u[keep] + b)).max())

def main():
    p = sys.argv[1]
    im, black, solid = load(p)
    H, W = black.shape
    ys = np.where(solid.any(1))[0]; xs = np.where(solid.any(0))[0]
    y0, y1 = ys.min(), ys.max(); x0, x1 = xs.min(), xs.max()
    L, R, T, B = [], [], [], []
    for y in range(y0 + (y1 - y0) // 5, y1 - (y1 - y0) // 5):
        l = inner_edge(black[y], solid[y]);           r = inner_edge(black[y], solid[y], rev=True)
        if l is not None: L.append((l, y))
        if r is not None: R.append((r, y))
    for x in range(x0 + (x1 - x0) // 6, x1 - (x1 - x0) // 6):
        t = inner_edge(black[:, x], solid[:, x]);      b = inner_edge(black[:, x], solid[:, x], rev=True)
        if t is not None: T.append((x, t))
        if b is not None: B.append((x, b))
    lines = {}
    for name, pts, hor in (("L", L, False), ("R", R, False)):
        lines[name] = fit(pts, hor)
        print(f"{name}: {len(pts)} pts, kept {lines[name][2]}, max resid {lines[name][3]:.2f}px", file=sys.stderr)
    # top/bottom: only points strictly between the side edges (a turned phone's side
    # bezel is crossed by the same columns)
    m = 90
    def between(pt):
        x, y = pt
        return lines["L"][0] * y + lines["L"][1] + m < x < lines["R"][0] * y + lines["R"][1] - m
    T = [pt for pt in T if between(pt)]; B = [pt for pt in B if between(pt)]
    # the rounded corners run further in along a turned top/bottom edge: fit the
    # middle 60% only (measured 10/15: the ends drift +4..+7px, the middle is straight)
    def middle(pts):
        pts = sorted(pts); k = len(pts) // 5
        return pts[k:len(pts) - k]
    T = middle(T); B = middle(B)
    for name, pts, hor in (("T", T, True), ("B", B, True)):
        lines[name] = fit(pts, hor)
        print(f"{name}: {len(pts)} pts, kept {lines[name][2]}, max resid {lines[name][3]:.2f}px", file=sys.stderr)
    def meet(v, h):  # v: x = a*y+b ; h: y = c*x+d
        a, b = lines[v][:2]; c, d = lines[h][:2]
        y = (c * b + d) / (1 - c * a); x = a * y + b
        return [round(x, 2), round(y, 2)]
    q = {"TL": meet("L", "T"), "TR": meet("R", "T"), "BR": meet("R", "B"), "BL": meet("L", "B")}
    print(json.dumps(q))
    if len(sys.argv) > 2:
        dbg = Image.open(p).convert("RGBA")
        bg = Image.new("RGBA", dbg.size, (255, 0, 255, 255)); bg.paste(dbg, (0, 0), dbg)
        d = ImageDraw.Draw(bg)
        poly = [tuple(q[k]) for k in ("TL", "TR", "BR", "BL")]
        d.line(poly + [poly[0]], fill=(0, 255, 255, 255), width=2)
        for pt in L + R + T + B: d.point(pt, fill=(255, 255, 0, 255))
        bg.convert("RGB").save(sys.argv[2])

if __name__ == "__main__":
    main()
