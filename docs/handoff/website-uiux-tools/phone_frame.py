#!/usr/bin/env python3
"""Frame a real-app capture in the site's titanium phone bezel.

usage: phone_frame.py <capture> <out.webp> <out_width> [--time 9:41]

The 101-guide captures are the app viewport with no status bar (content starts
~23px from the top), so the status bar is ADDED above the content rather than
painted over it. Output height follows from the capture's aspect, the bezel and
the status band; the script prints it so the page's width/height attributes can
match. Transparent outside the frame, like the images it replaces.
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def font(size, bold=True):
    for p in ["/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        try:
            return ImageFont.truetype(p, size, index=1 if (bold and p.endswith(".ttc")) else 0)
        except Exception:
            pass
    return ImageFont.load_default()

def main():
    cap_path, out_path, W = sys.argv[1], sys.argv[2], int(sys.argv[3])
    t = sys.argv[sys.argv.index("--time") + 1] if "--time" in sys.argv else "9:41"
    S = 4                                   # supersample for smooth edges
    cap = Image.open(cap_path).convert("RGB")
    pad = round(W * 0.007)                  # room for the side buttons
    frame_w = W - 2 * pad
    rim = round(W * 0.011)                  # titanium rim
    bez = round(W * 0.022)                  # black bezel
    scr_w = frame_w - 2 * (rim + bez)
    cap_h = round(cap.height * scr_w / cap.width)
    band = round(scr_w * 0.087)             # status bar band added above the content
    scr_h = band + cap_h
    frame_h = scr_h + 2 * (rim + bez)
    H = frame_h + 2 * pad
    R_out = round(frame_w * 0.15); R_scr = R_out - rim - bez

    big = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    # side buttons (left: action + 2 volume; right: power)
    bc = (58, 63, 71, 255)
    def btn(x, y, h):
        d.rounded_rectangle([x * S, y * S, (x + pad + 2) * S, (y + h) * S], radius=2 * S, fill=bc)
    btn(0, pad + round(frame_h * 0.17), round(frame_h * 0.035))
    btn(0, pad + round(frame_h * 0.23), round(frame_h * 0.065))
    btn(0, pad + round(frame_h * 0.31), round(frame_h * 0.065))
    btn(W - pad - 2, pad + round(frame_h * 0.25), round(frame_h * 0.10))
    # titanium rim: vertical gradient clipped to the outer rounded rect
    grad = Image.new("RGBA", (frame_w * S, frame_h * S))
    gd = ImageDraw.Draw(grad)
    stops = [(0, (58, 63, 71)), (0.18, (107, 112, 121)), (0.5, (44, 48, 54)), (0.82, (90, 95, 103)), (1, (52, 56, 63))]
    for x in range(frame_w * S):
        f = x / (frame_w * S - 1)
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= f <= b:
                k = (f - a) / (b - a); col = tuple(round(ca[i] + (cb[i] - ca[i]) * k) for i in range(3)); break
        gd.line([(x, 0), (x, frame_h * S)], fill=col + (255,))
    mask = Image.new("L", grad.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, frame_w * S - 1, frame_h * S - 1], radius=R_out * S, fill=255)
    big.paste(grad, (pad * S, pad * S), mask)
    # black bezel
    d.rounded_rectangle([(pad + rim) * S, (pad + rim) * S, (pad + frame_w - rim) * S - 1, (pad + frame_h - rim) * S - 1],
                        radius=(R_out - rim) * S, fill=(10, 12, 16, 255))
    # screen = status band + capture
    scr = Image.new("RGB", (scr_w, scr_h))
    top = cap.crop((0, 0, cap.width, 1)).resize((1, 1)).getpixel((0, 0))
    strip = cap.crop((0, 0, cap.width, max(2, round(cap.height * 0.02))))
    varied = len(set(strip.resize((40, 2)).getdata())) > 6
    capr = cap.resize((scr_w, cap_h), Image.LANCZOS)
    # A varied top (a map) gets its corner colour, not a mirror: mirroring copied
    # the floating status card upside-down into the band.
    fill = cap.getpixel((3, 3)) if varied else top
    scr.paste(Image.new("RGB", (scr_w, band), fill), (0, 0))
    scr.paste(capr, (0, band))
    sd = ImageDraw.Draw(scr)
    ink = (17, 17, 17)
    fs = round(scr_w * 0.042)
    sd.text((round(scr_w * 0.12), round(band * 0.52)), t, font=font(fs), fill=ink, anchor="mm")
    # right icons: signal, wifi, battery
    cx = round(scr_w * 0.80); cy = round(band * 0.52); u = max(2, round(scr_w * 0.0085))
    for i in range(4):
        h = u * (1.2 + i * 0.9)
        sd.rounded_rectangle([cx - 30 * u // 4 + i * 2 * u, cy + 2.2 * u - h, cx - 30 * u // 4 + i * 2 * u + 1.4 * u, cy + 2.2 * u], radius=u // 2, fill=ink)
    wx = cx + round(4.2 * u)
    for r in (3.2, 2.1, 1.0):
        sd.arc([wx - r * u, cy - r * u + u, wx + r * u, cy + r * u + u], 225, 315, fill=ink, width=max(1, round(u * 0.75)))
    bx = cx + round(8.2 * u)
    sd.rounded_rectangle([bx, cy - 1.5 * u, bx + 5.4 * u, cy + 1.5 * u], radius=u, outline=ink, width=max(1, u // 2))
    sd.rounded_rectangle([bx + 0.6 * u, cy - 0.9 * u, bx + 4.8 * u, cy + 0.9 * u], radius=u // 2, fill=ink)
    sd.rounded_rectangle([bx + 5.6 * u, cy - 0.6 * u, bx + 6.2 * u, cy + 0.6 * u], radius=u // 3, fill=ink)
    # dynamic island
    iw, ih = round(scr_w * 0.30), round(band * 0.62)
    sd.rounded_rectangle([(scr_w - iw) // 2, round(band * 0.2), (scr_w + iw) // 2, round(band * 0.2) + ih], radius=ih // 2, fill=(0, 0, 0))
    scrS = scr.resize((scr_w * S, scr_h * S), Image.LANCZOS)
    smask = Image.new("L", scrS.size, 0)
    ImageDraw.Draw(smask).rounded_rectangle([0, 0, scrS.width - 1, scrS.height - 1], radius=R_scr * S, fill=255)
    big.paste(scrS, ((pad + rim + bez) * S, (pad + rim + bez) * S), smask)
    out = big.resize((W, H), Image.LANCZOS)
    out.save(out_path, "WEBP", quality=88, method=6)
    print(f"{out_path}: {W}x{H} (screen {scr_w}x{scr_h}, status band {band}px, {'map-continued' if varied else 'solid'} band)")

if __name__ == "__main__":
    main()
