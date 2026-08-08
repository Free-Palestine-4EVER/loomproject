"""Raster ornament -> SVG.

The public-domain artwork in `svg/raw/` arrived as vector. The client's own
flower set did not: it arrived as four bitmaps. This turns one of those bitmaps
(or a crop of one) into a single filled SVG path that `svgart.load()` can read
like any other ornament.

The chain is deliberate, and every step of it is there for a reason:

  resample   the mask is built from a LANCZOS downsample, so the contour follows
             the antialiased edge instead of the pixel staircase
  despeckle  JPEG artefacts and stray dots (the source sheets are lossy, and one
             of them sits on a printed dot grid) are dropped by area
  trace      each pixel contributes its four edges, wound clockwise in y-down;
             shared edges cancel, so what is left chains into closed loops with
             outers clockwise and holes anticlockwise — correct nonzero fill,
             no hole-detection heuristics
  simplify   Ramer-Douglas-Peucker, hard. Auto-traced edges are jagged, and a
             serrated ornament reads as a thistle at glyph scale and makes the
             font build ten times slower
  smooth     the surviving corners become Catmull-Rom cubics, so the outline is
             curves like the rest of the family rather than a polygon

    python3 raster.py sheet.png out.svg --crop 75,37,180,279 --thr 140
"""
import argparse
import os
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


# ————————————————————————————————————————————————————————————— the mask

def mask(path, crop=None, thr=140, longest=420):
    """Binary ink mask, resampled so its long side is `longest` px."""
    im = Image.open(path).convert('RGBA')
    im = Image.alpha_composite(Image.new('RGBA', im.size, (255,) * 4), im).convert('L')
    if crop:
        im = im.crop(crop)
    w, h = im.size
    s = longest / max(w, h)
    # resample UP as well as down: a small crop of line-art has to be enlarged
    # before it can be fattened, or a 2 px dilation eats its own counters
    im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    return np.array(im) < thr


def dilate(m, r):
    """Fatten the ink by `r` px. Line-art scanned at a few hundred pixels comes
    out hairline once it is scaled into a 1000-unit glyph and subtracted from a
    stem — it has to carry weight before it can carry a flower."""
    if not r:
        return m
    im = Image.fromarray((m * 255).astype(np.uint8))
    im = im.filter(ImageFilter.MaxFilter(2 * int(r) + 1))
    return np.array(im) > 127


def despeckle(m, minpx=None, keep_holes=None):
    """Drop ink islands and interior holes smaller than a threshold."""
    if minpx is None:
        minpx = max(12, int(0.00035 * m.size))
    if keep_holes is None:
        keep_holes = minpx
    out = m.copy()
    for target, floor, fill in ((True, minpx, False), (False, keep_holes, True)):
        seen = np.zeros(m.shape, bool)
        h, w = m.shape
        for y in range(h):
            for x in range(w):
                if seen[y, x] or out[y, x] != target:
                    continue
                q = deque([(y, x)]); seen[y, x] = True; cells = []
                edge = False
                while q:
                    cy, cx = q.popleft(); cells.append((cy, cx))
                    if cy in (0, h - 1) or cx in (0, w - 1):
                        edge = True
                    for ny, nx in ((cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)):
                        if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and out[ny, nx] == target:
                            seen[ny, nx] = True; q.append((ny, nx))
                if len(cells) < floor and not (target is False and edge):
                    for cy, cx in cells:
                        out[cy, cx] = fill
    return out


# ————————————————————————————————————————————————————————————— tracing

def loops(m):
    """Closed pixel-boundary loops. Outers clockwise (y down), holes the other
    way, because every pixel is wound clockwise and shared edges cancel."""
    h, w = m.shape
    edges = {}
    raw = {}
    ys, xs = np.nonzero(m)
    for y, x in zip(ys.tolist(), xs.tolist()):
        for a, b in (((x, y), (x + 1, y)),
                     ((x + 1, y), (x + 1, y + 1)),
                     ((x + 1, y + 1), (x, y + 1)),
                     ((x, y + 1), (x, y))):
            if raw.get((b, a)):
                raw[(b, a)] -= 1
                if not raw[(b, a)]:
                    del raw[(b, a)]
            else:
                raw[(a, b)] = raw.get((a, b), 0) + 1

    for (a, b), n in raw.items():
        for _ in range(n):
            edges.setdefault(a, []).append(b)

    out = []
    while edges:
        start = next(iter(edges))
        pt = start
        path = [start]
        prev = None
        while True:
            outs = edges.get(pt)
            if not outs:
                break
            if len(outs) == 1 or prev is None:
                nxt = outs[0]
            else:
                # at a pinch point take the sharpest clockwise turn, which keeps
                # the two lobes as two loops instead of one figure-of-eight
                ix, iy = pt[0] - prev[0], pt[1] - prev[1]
                def turn(c):
                    dx, dy = c[0] - pt[0], c[1] - pt[1]
                    return np.arctan2(ix * dy - iy * dx, ix * dx + iy * dy)
                nxt = min(outs, key=turn)
            outs.remove(nxt)
            if not outs:
                del edges[pt]
            prev, pt = pt, nxt
            if pt == start:
                break
            path.append(pt)
        if len(path) > 7:
            out.append([(float(x), float(y)) for x, y in path])
    return out


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    ax, ay = pts[0]; bx, by = pts[-1]
    dx, dy = bx - ax, by - ay
    n = (dx * dx + dy * dy) ** 0.5
    worst, wi = -1.0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = (abs(dy * px - dx * py + bx * ay - by * ax) / n) if n else \
            ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
        if d > worst:
            worst, wi = d, i
    if worst <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[:wi + 1], eps)[:-1] + rdp(pts[wi:], eps)


def simplify_loop(pts, eps):
    """RDP round a closed ring, anchored on its two most distant points so the
    result does not depend on where the trace happened to start."""
    if len(pts) < 8:
        return pts
    a = 0
    far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[a][0]) ** 2 + (pts[i][1] - pts[a][1]) ** 2)
    r = pts[a:far + 1]
    s = pts[far:] + [pts[a]]
    out = rdp(r, eps)[:-1] + rdp(s, eps)[:-1]
    return out


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]; x1, y1 = pts[(i + 1) % len(pts)]
        s += x0 * y1 - x1 * y0
    return s / 2.0


# ————————————————————————————————————————————————————————————— output

def catmull(pts, tension=0.5):
    """Closed Catmull-Rom through the points, as SVG cubic segments."""
    n = len(pts)
    d = [f'M {pts[0][0]:.2f} {pts[0][1]:.2f}']
    for i in range(n):
        p0 = pts[(i - 1) % n]; p1 = pts[i]; p2 = pts[(i + 1) % n]; p3 = pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3)
        d.append(f'C {c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}')
    d.append('Z')
    return ' '.join(d)


def trace(src, crop=None, thr=140, eps=1.35, minarea=26.0, longest=420,
          minpx=None, tension=0.5, fatten=0):
    m = despeckle(dilate(mask(src, crop, thr, longest), fatten), minpx)
    rings = []
    for lp in loops(m):
        s = simplify_loop(lp, eps)
        if len(s) < 4 or abs(area(s)) < minarea:
            continue
        rings.append(s)
    if not rings:
        return None, (0, 0), 0
    xs = [p[0] for r in rings for p in r]; ys = [p[1] for r in rings for p in r]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    pad = 4.0
    w, h = (x1 - x0) + pad * 2, (y1 - y0) + pad * 2
    shift = lambda r: [(p[0] - x0 + pad, p[1] - y0 + pad) for p in r]
    d = ' '.join(catmull(shift(r), tension) for r in rings)
    return d, (w, h), sum(len(r) for r in rings)


def write_svg(path, d, size):
    w, h = size
    with open(path, 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}" '
                f'width="{w:.1f}" height="{h:.1f}">\n'
                f'<path fill="#000000" fill-rule="nonzero" d="{d}"/>\n</svg>\n')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--crop', default=None, help='x0,y0,x1,y1 in source pixels')
    ap.add_argument('--thr', type=int, default=140)
    ap.add_argument('--eps', type=float, default=1.35)
    ap.add_argument('--minarea', type=float, default=26.0)
    ap.add_argument('--longest', type=int, default=420)
    ap.add_argument('--minpx', type=int, default=None)
    ap.add_argument('--fatten', type=int, default=0, help='dilate the ink, px')
    a = ap.parse_args()
    crop = tuple(int(v) for v in a.crop.split(',')) if a.crop else None
    d, size, n = trace(a.src, crop, a.thr, a.eps, a.minarea, a.longest, a.minpx,
                       fatten=a.fatten)
    if not d:
        raise SystemExit('no ink found')
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    write_svg(a.out, d, size)
    print(f'{os.path.basename(a.out)}  {size[0]:.0f}x{size[1]:.0f}  {n} points')
