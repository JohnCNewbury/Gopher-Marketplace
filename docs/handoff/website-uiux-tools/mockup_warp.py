#!/usr/bin/env python3
"""Put a real-app capture into an existing tilted phone mockup (John 10/15: keep the
approved silver phone and its tilt; only the screen changes).

usage: mockup_warp.py <mockup.webp> <capture.webp> <out.webp> --quad '<json from fitquad.py>'
                      [--radius 0.13] [--icons 0.80] [--debug dbg.png]

The screen = a slim status band (9:41, signal, wifi, battery) + the capture, mapped onto
the mockup's screen quad by a true perspective transform (3x supersampled). The mockup's
own hardware inside the screen (notch or Dynamic Island) is put back on top, so the
phone, its tilt, shading and camera stay exactly as approved."""
import sys, json, argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage

def font(size):
    for p in ["/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        try:
            return ImageFont.truetype(p, size, index=1 if p.endswith(".ttc") else 0)
        except Exception:
            pass
    return ImageFont.load_default()

def build_screen(cap, icons_x, band_frac, cy_frac, scale=3):
    """Capture + a status band of `band_frac` x width, so the content starts below the
    mockup's notch / island like a real iPhone's safe area (the 101 captures have none).
    Status items centred at `cy_frac` x width. Built at `scale` x for a crisp warp."""
    cap = cap.convert("RGB")
    W = cap.width * scale
    capr = cap.resize((W, cap.height * scale), Image.LANCZOS)
    band = round(W * band_frac)
    scr = Image.new("RGB", (W, band + capr.height), cap.getpixel((cap.width // 2, 2)))
    scr.paste(capr, (0, band))
    d = ImageDraw.Draw(scr); ink = (17, 17, 17)
    cy = round(W * cy_frac)
    d.text((round(W * 0.12), cy), "9:41", font=font(round(W * 0.042)), fill=ink, anchor="mm")
    u = max(2, round(W * 0.0085)); cx = round(W * icons_x)
    for i in range(4):
        h = u * (1.2 + i * 0.9)
        d.rounded_rectangle([cx - 30 * u // 4 + i * 2 * u, cy + 2.2 * u - h, cx - 30 * u // 4 + i * 2 * u + 1.4 * u, cy + 2.2 * u], radius=u // 2, fill=ink)
    wx = cx + round(4.2 * u)
    for r in (3.2, 2.1, 1.0):
        d.arc([wx - r * u, cy - r * u + u, wx + r * u, cy + r * u + u], 225, 315, fill=ink, width=max(1, round(u * 0.75)))
    bx = cx + round(8.2 * u)
    d.rounded_rectangle([bx, cy - 1.5 * u, bx + 5.4 * u, cy + 1.5 * u], radius=u, outline=ink, width=max(1, u // 2))
    d.rounded_rectangle([bx + 0.6 * u, cy - 0.9 * u, bx + 4.8 * u, cy + 0.9 * u], radius=u // 2, fill=ink)
    d.rounded_rectangle([bx + 5.6 * u, cy - 0.6 * u, bx + 6.2 * u, cy + 0.6 * u], radius=u // 3, fill=ink)
    return scr

def homography(src, dst):
    """3x3 H with dst ~ H @ src (4 point pairs)."""
    A = []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y, -u])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y, -v])
    _, _, Vt = np.linalg.svd(np.array(A, float))
    return (Vt[-1] / Vt[-1, -1]).reshape(3, 3)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mockup"); ap.add_argument("capture"); ap.add_argument("out")
    ap.add_argument("--quad", required=True); ap.add_argument("--radius", type=float, default=0.13)
    ap.add_argument("--icons", type=float, default=0.80); ap.add_argument("--hw", type=float, default=0.12)
    ap.add_argument("--band", type=float, default=0.09); ap.add_argument("--cy", type=float, default=0.07)
    ap.add_argument("--island-from", help="mockup whose Dynamic Island is transplanted into this screen")
    ap.add_argument("--island-quad", help="that mockup's quad (fitquad.py json)")
    ap.add_argument("--no-restore", action="store_true", help="do not copy this mockup's own top hardware back")
    ap.add_argument("--debug")
    a = ap.parse_args()
    mock = Image.open(a.mockup).convert("RGBA"); MW, MH = mock.size
    q = json.loads(a.quad); quad = [q[k] for k in ("TL", "TR", "BR", "BL")]
    scr = build_screen(Image.open(a.capture), a.icons, a.band, a.cy)
    sw, sh = scr.size
    if a.island_from:
        # Flatten the reference phone's screen to this screen's pixel grid and lift its
        # island (largest black blob in the top-centre), so it is drawn in screen space
        # and gets this phone's perspective in the warp below.
        ref = Image.open(a.island_from).convert("RGBA")
        rq = json.loads(a.island_quad); rquad = [rq[k] for k in ("TL", "TR", "BR", "BL")]
        Hs = homography([(0, 0), (sw, 0), (sw, sh), (0, sh)], rquad)   # screen px -> ref px
        flat = ref.transform((sw, sh), Image.PERSPECTIVE, tuple((Hs / Hs[2, 2]).flatten()[:8]), Image.BICUBIC)
        f = np.asarray(flat).astype(int)
        isl = (f[..., 3] > 200) & (f[..., :3].max(-1) < 25)
        win = np.zeros_like(isl); win[round(0.02 * sw):round(0.16 * sw), round(0.25 * sw):round(0.75 * sw)] = True
        isl &= win
        lab, n = ndimage.label(isl)
        big = 1 + int(np.argmax(ndimage.sum(isl, lab, range(1, n + 1))))
        isl = ndimage.binary_fill_holes(lab == big)
        isl = ndimage.binary_dilation(isl, iterations=2)
        m8 = Image.fromarray((isl * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))
        scr.paste(flat.convert("RGB"), (0, 0), m8)
        print(f"island transplanted from {a.island_from.split('/')[-1]}: {int(isl.sum())} px")
    # rounded-corner alpha in screen space
    alpha = Image.new("L", scr.size, 0)
    ImageDraw.Draw(alpha).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=round(sw * a.radius), fill=255)
    scr = scr.convert("RGBA"); scr.putalpha(alpha)
    # warp at SS x the mockup size; PIL wants output->input coefficients
    SS = 3
    dst = [(x * SS, y * SS) for x, y in quad]
    src = [(0, 0), (sw, 0), (sw, sh), (0, sh)]
    Hinv = homography(dst, src)
    coeffs = (Hinv / Hinv[2, 2]).flatten()[:8]
    warped = scr.transform((MW * SS, MH * SS), Image.PERSPECTIVE, tuple(coeffs), Image.BICUBIC)
    warped = warped.resize((MW, MH), Image.LANCZOS)
    out = mock.copy(); out.alpha_composite(warped)
    if a.no_restore:
        out.save(a.out, "WEBP", quality=88, method=6)
        print(f"{a.out}: {MW}x{MH}; screen {sw}x{sh}; no hardware restore")
        return
    # put the mockup's own hardware (notch / island) back: black blobs in the top
    # `hw` of the screen, holes filled (camera lens), small specks dropped
    m = np.asarray(mock).astype(int)
    blk = (m[..., 3] > 200) & (m[..., :3].max(-1) < 25)
    yy, xx = np.mgrid[0:MH, 0:MW]
    Hf = homography([(x, y) for x, y in quad], src)          # mockup px -> screen px
    den = Hf[2, 0] * xx + Hf[2, 1] * yy + Hf[2, 2]
    su = (Hf[0, 0] * xx + Hf[0, 1] * yy + Hf[0, 2]) / den
    sv = (Hf[1, 0] * xx + Hf[1, 1] * yy + Hf[1, 2]) / den
    inside = (su > -0.02 * sw) & (su < 1.02 * sw) & (sv > -0.02 * sh) & (sv < a.hw * sh)
    hw = blk & inside
    lab, n = ndimage.label(hw)
    sizes = ndimage.sum(hw, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 150])
    keep = ndimage.binary_fill_holes(keep)
    keep = ndimage.binary_dilation(keep, iterations=1)       # cover the warp's anti-alias seam
    hwmask = Image.fromarray((keep * 255).astype(np.uint8))
    out.paste(mock, (0, 0), hwmask)
    out.save(a.out, "WEBP", quality=88, method=6)
    print(f"{a.out}: {MW}x{MH}; screen {sw}x{sh}; hardware px restored: {int(keep.sum())}")
    if a.debug:
        Image.fromarray((keep * 255).astype(np.uint8)).save(a.debug)

if __name__ == "__main__":
    main()
