#!/usr/bin/env python3
"""Lean a framed phone (transparent PNG/WebP) like the old Go hero renders.
usage: tilt.py <framed> <out.webp> <out_width> <out_height> [--deg 14] [--persp 0.07]
Clockwise lean (top to the right) with the right edge receding slightly."""
import sys, math
from PIL import Image

def solve(A, b):
    n = len(b); M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c])); M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                M[r] = [M[r][k] - f * M[c][k] for k in range(n + 1)]
    return [M[i][n] / M[i][i] for i in range(n)]

def coeffs(dst, src):
    # PIL wants the map OUTPUT(x,y) -> SOURCE(u,v)
    A, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return solve(A, b)

def main():
    src_p, out_p, OW, OH = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    deg = float(sys.argv[sys.argv.index("--deg") + 1]) if "--deg" in sys.argv else 14
    p = float(sys.argv[sys.argv.index("--persp") + 1]) if "--persp" in sys.argv else 0.07
    im = Image.open(src_p).convert("RGBA"); w, h = im.size
    S = 3; big = im.resize((w * S, h * S), Image.LANCZOS); w, h = big.size
    th = math.radians(deg); pts = []
    for x, y in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]:
        f = 1 - p * (x / (w / 2))          # right edge shorter = receding
        x2, y2 = x * (1 - p * 0.6), y * f
        pts.append((x2 * math.cos(th) - y2 * math.sin(th), x2 * math.sin(th) + y2 * math.cos(th)))
    minx = min(q[0] for q in pts); maxx = max(q[0] for q in pts); miny = min(q[1] for q in pts); maxy = max(q[1] for q in pts)
    BW, BH = OW * S, OH * S; m = 0.02
    sc = min(BW * (1 - 2 * m) / (maxx - minx), BH * (1 - 2 * m) / (maxy - miny))
    dst = [((q[0] - minx) * sc + (BW - (maxx - minx) * sc) / 2, (q[1] - miny) * sc + (BH - (maxy - miny) * sc) / 2) for q in pts]
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    out = big.transform((BW, BH), Image.PERSPECTIVE, coeffs(dst, src), Image.BICUBIC)
    out = out.resize((OW, OH), Image.LANCZOS)
    out.save(out_p, "WEBP", quality=88, method=6); print(out_p, out.size)

if __name__ == "__main__":
    main()
