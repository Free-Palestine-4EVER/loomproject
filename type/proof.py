"""Render a word in every planted cut, straight from the paths, to one PNG.

    python3 proof.py FLOWERS

No font build, no browser — this is the loop for judging the artwork. It draws
the real skia paths through PIL, so what you see is exactly what build.py will
put in the font.
"""
import sys
import time

from PIL import Image, ImageDraw

import glyphs as G
from floral import decorate

SCALE = 0.46          # units -> px
PAD = 40
CUTS = [('floral', 'ROSE'), ('daisy', 'DAISY'), ('tulip', 'TULIP'), ('ivy', 'IVY')]

def draw_path(dr, path, ox, oy, H):
    """Fill a skia path with the nonzero rule, by handing PIL each contour and
    letting even-odd stand in — wrong for self-intersecting art, right here
    because pathops has already resolved everything to non-overlapping contours
    wound outer-clockwise / hole-anticlockwise."""
    from pathops import Path
    p = Path()
    p.addPath(path)
    p.simplify()
    polys = []
    for c in p.contours:
        pts = _flatten(c)
        if len(pts) >= 3:
            polys.append((_area(pts), pts))
    if not polys:
        return
    # Don't assume a winding convention — take the sign of the BIGGEST contour
    # as "outer" and call everything wound the other way a hole. Two levels is
    # all a glyph ever has.
    sign = 1.0 if max(polys, key=lambda a: abs(a[0]))[0] > 0 else -1.0
    # Paint BIGGEST FIRST, alternating by winding. A decorated glyph nests three
    # and four deep — an island of ink inside a flower inside the stem — and
    # painting every hole after every outer erases those islands, which is what
    # made whole blooms come out as flat white discs.
    for a, pts in sorted(polys, key=lambda p: -abs(p[0])):
        dr.polygon([(ox + x * SCALE, H - (oy + y * SCALE)) for x, y in pts],
                   fill=0 if a * sign > 0 else 255)


def _flatten(contour, n=8):
    pts = []
    cur = (0.0, 0.0)
    for verb, p in contour:
        if verb == 0:
            cur = p[0]
            pts.append(cur)
        elif verb == 1:
            cur = p[0]
            pts.append(cur)
        elif verb == 2:
            for i in range(1, n + 1):
                t = i / n
                u = 1 - t
                pts.append((u * u * cur[0] + 2 * u * t * p[0][0] + t * t * p[1][0],
                            u * u * cur[1] + 2 * u * t * p[0][1] + t * t * p[1][1]))
            cur = p[1]
        elif verb == 4:
            for i in range(1, n + 1):
                t = i / n
                u = 1 - t
                pts.append((u**3 * cur[0] + 3 * u * u * t * p[0][0] + 3 * u * t * t * p[1][0] + t**3 * p[2][0],
                            u**3 * cur[1] + 3 * u * u * t * p[0][1] + 3 * u * t * t * p[1][1] + t**3 * p[2][1]))
            cur = p[2]
    return pts


def _area(pts):
    s = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        s += x0 * y1 - x1 * y0
    return s / 2.0


def main():
    word = (sys.argv[1] if len(sys.argv) > 1 else 'FLOWERS').upper()
    base = G.build_glyphs()
    names = {}
    for ch in set(word):
        if ch == ' ':
            continue
        names[ch] = ch if ch in base else None

    rows = []
    for fam, label in CUTS:
        t0 = time.time()
        glyphs = []
        for ch in word:
            if ch == ' ':
                glyphs.append((None, 300))
                continue
            n = names[ch]
            p, adv = base[n]
            glyphs.append((decorate(n, p, adv, fam=fam), adv))
        rows.append((label, glyphs))
        print(f'{label:6s} {time.time() - t0:5.1f}s')

    wid = max(sum(a for _, a in gl) for _, gl in rows)
    rowh = int((G.CAP + 190) * SCALE)
    W = int(wid * SCALE) + PAD * 2
    H = rowh * len(rows) + PAD * 2
    im = Image.new('L', (W, H), 255)
    dr = ImageDraw.Draw(im)
    for r, (label, gl) in enumerate(rows):
        oy = PAD + (len(rows) - 1 - r) * rowh + 60 * SCALE
        ox = PAD
        for p, adv in gl:
            if p is not None:
                draw_path(dr, p, ox, oy, H)
            ox += adv * SCALE
    out = 'out/PROOF.png'
    im.save(out)
    print('->', out, im.size)


if __name__ == '__main__':
    main()
