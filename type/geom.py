"""Shape primitives for the LOOM Bloom typeface.

Every glyph is a boolean union of three primitives — capsules (round-capped
strokes), ellipses, and arcs cut out of an annulus. Skia's path ops does the
union, so overlapping strokes fuse into one clean contour and the terminals stay
perfectly round without hand-drawn joins.
"""
import math
from functools import reduce

from pathops import Path, PathOp, op

K = 0.5522847498307936  # circle -> cubic bezier magic number


# ————————————————————————————————— boolean ops
def U(*paths):
    ps = [p for p in paths if p is not None]
    return reduce(lambda a, b: op(a, b, PathOp.UNION), ps)


def DIFF(a, b):
    return op(a, b, PathOp.DIFFERENCE)


def ISECT(a, b):
    return op(a, b, PathOp.INTERSECTION)


# ————————————————————————————————— primitives
def ellipse(cx, cy, rx, ry):
    p = Path()
    pen = p.getPen()
    pen.moveTo((cx + rx, cy))
    pen.curveTo((cx + rx, cy + ry * K), (cx + rx * K, cy + ry), (cx, cy + ry))
    pen.curveTo((cx - rx * K, cy + ry), (cx - rx, cy + ry * K), (cx - rx, cy))
    pen.curveTo((cx - rx, cy - ry * K), (cx - rx * K, cy - ry), (cx, cy - ry))
    pen.curveTo((cx + rx * K, cy - ry), (cx + rx, cy - ry * K), (cx + rx, cy))
    pen.closePath()
    return p


def circle(cx, cy, r):
    return ellipse(cx, cy, r, r)


def poly(points):
    p = Path()
    pen = p.getPen()
    pen.moveTo(points[0])
    for pt in points[1:]:
        pen.lineTo(pt)
    pen.closePath()
    return p


def rect(x0, y0, x1, y1):
    return poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def capsule(p0, p1, w, cap0=True, cap1=True):
    """A stroke of width w from p0 to p1 with round caps."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    ln = math.hypot(dx, dy)
    r = w / 2.0
    if ln < 1e-6:
        return circle(x0, y0, r)
    nx, ny = -dy / ln * r, dx / ln * r
    body = poly([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny),
                 (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)])
    parts = [body]
    if cap0:
        parts.append(circle(x0, y0, r))
    if cap1:
        parts.append(circle(x1, y1, r))
    return U(*parts)


def _wedge(cx, cy, a0, a1, R):
    """Pie slice from a0 to a1 (degrees, CCW), big enough to clip any ring."""
    pts = [(cx, cy)]
    steps = max(2, int(abs(a1 - a0) / 8) + 2)
    for i in range(steps + 1):
        a = math.radians(a0 + (a1 - a0) * i / steps)
        pts.append((cx + R * math.cos(a), cy + R * math.sin(a)))
    return poly(pts)


def arc(cx, cy, rx, ry, a0, a1, w, cap0=True, cap1=True):
    """Round-capped stroke riding the ellipse (rx, ry) from angle a0 to a1."""
    ring = DIFF(ellipse(cx, cy, rx + w / 2, ry + w / 2),
                ellipse(cx, cy, max(rx - w / 2, 1), max(ry - w / 2, 1)))
    R = (max(rx, ry) + w) * 3
    span = a1 - a0
    n = max(1, int(math.ceil(abs(span) / 110.0)))
    pieces = []
    for i in range(n):
        b0 = a0 + span * i / n
        b1 = a0 + span * (i + 1) / n
        pieces.append(ISECT(ring, _wedge(cx, cy, b0, b1, R)))
    body = U(*pieces)
    caps = []
    if cap0:
        caps.append(circle(cx + rx * math.cos(math.radians(a0)),
                           cy + ry * math.sin(math.radians(a0)), w / 2))
    if cap1:
        caps.append(circle(cx + rx * math.cos(math.radians(a1)),
                           cy + ry * math.sin(math.radians(a1)), w / 2))
    return U(body, *caps)


def arc_pt(cx, cy, rx, ry, a):
    return (cx + rx * math.cos(math.radians(a)), cy + ry * math.sin(math.radians(a)))


def ring(cx, cy, rx, ry, w):
    return DIFF(ellipse(cx, cy, rx + w / 2, ry + w / 2),
                ellipse(cx, cy, max(rx - w / 2, 1), max(ry - w / 2, 1)))


def xform(path, sx=1.0, sy=1.0, rot=0.0, dx=0.0, dy=0.0):
    """Scale, then rotate (degrees), then translate."""
    a = math.radians(rot)
    ca, sa = math.cos(a), math.sin(a)
    out = Path()
    pen = out.getPen()

    def t(pt):
        x, y = pt[0] * sx, pt[1] * sy
        return (x * ca - y * sa + dx, x * sa + y * ca + dy)

    for verb, pts in path:
        if verb == 0:      # moveTo
            pen.moveTo(t(pts[0]))
        elif verb == 1:    # lineTo
            pen.lineTo(t(pts[0]))
        elif verb == 2:    # quadTo
            pen.qCurveTo(t(pts[0]), t(pts[1]))
        elif verb == 4:    # curveTo
            pen.curveTo(t(pts[0]), t(pts[1]), t(pts[2]))
        elif verb == 5:    # closePath
            pen.closePath()
    return out


def bar(p0, p1, w, ext=None):
    """A square-capped stroke: the rectangle only, no end circles. `ext` is how
    far it runs past each endpoint (w/2 by default, so it covers exactly the
    same ground a round-capped stroke would)."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    ln = math.hypot(dx, dy)
    e = w / 2.0 if ext is None else ext
    if ln < 1e-6:
        return rect(x0 - w / 2, y0 - w / 2, x0 + w / 2, y0 + w / 2)
    ux, uy = dx / ln, dy / ln
    nx, ny = -uy * w / 2, ux * w / 2
    ax, ay = x0 - ux * e, y0 - uy * e
    bx, by = x1 + ux * e, y1 + uy * e
    return poly([(ax + nx, ay + ny), (bx + nx, by + ny),
                 (bx - nx, by - ny), (ax - nx, ay - ny)])


def polystroke(points, w, miter=4.0):
    """A stroke along a polyline with MITERED joins — the corner is filled to a
    point, the way a knife-cut letter behaves, instead of two bars overlapping
    and leaving a wedge of white on the inside of every acute angle."""
    n = len(points)
    if n < 2:
        return rect(points[0][0] - w / 2, points[0][1] - w / 2,
                    points[0][0] + w / 2, points[0][1] + w / 2)

    def unit(a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1.0
        return dx / ln, dy / ln

    left, right = [], []
    for i, p in enumerate(points):
        if i == 0:
            d1 = d2 = unit(points[0], points[1])
        elif i == n - 1:
            d1 = d2 = unit(points[-2], points[-1])
        else:
            d1 = unit(points[i - 1], p)
            d2 = unit(p, points[i + 1])
        n1 = (-d1[1], d1[0])
        n2 = (-d2[1], d2[0])
        mx, my = n1[0] + n2[0], n1[1] + n2[1]
        ml = math.hypot(mx, my)
        if ml < 1e-6:            # a full reversal — fall back to one side
            mx, my, ml = n1[0], n1[1], 1.0
        mx, my = mx / ml, my / ml
        cos_half = max(mx * n1[0] + my * n1[1], 1e-3)
        k = min(1.0 / cos_half, miter) * w / 2
        left.append((p[0] + mx * k, p[1] + my * k))
        right.append((p[0] - mx * k, p[1] - my * k))
    return poly(left + right[::-1])


def rrect(x0, y0, x1, y1, r, corners=(1, 1, 1, 1)):
    """Rounded rectangle. `corners` is (top-left, top-right, bottom-right,
    bottom-left) — a 0 leaves that corner square. This is the skeleton the whole
    round half of the face is built on: straight sides, one corner radius."""
    w, h = x1 - x0, y1 - y0
    r = max(0.0, min(r, w / 2, h / 2))
    tl, tr, br, bl = [r if c else 0.0 for c in corners]
    p = Path()
    pen = p.getPen()
    pen.moveTo((x0 + bl, y0))
    pen.lineTo((x1 - br, y0))
    if br:
        pen.curveTo((x1 - br + br * K, y0), (x1, y0 + br - br * K), (x1, y0 + br))
    pen.lineTo((x1, y1 - tr))
    if tr:
        pen.curveTo((x1, y1 - tr + tr * K), (x1 - tr + tr * K, y1), (x1 - tr, y1))
    pen.lineTo((x0 + tl, y1))
    if tl:
        pen.curveTo((x0 + tl - tl * K, y1), (x0, y1 - tl + tl * K), (x0, y1 - tl))
    pen.lineTo((x0, y0 + bl))
    if bl:
        pen.curveTo((x0, y0 + bl - bl * K), (x0 + bl - bl * K, y0), (x0 + bl, y0))
    pen.closePath()
    return p


def rring(x0, y0, x1, y1, w, r, corners=(1, 1, 1, 1), ri=None):
    """A rounded-rectangle ring of stroke width w."""
    if ri is None:
        ri = max(r - w * 0.62, 24)
    return DIFF(rrect(x0, y0, x1, y1, r, corners),
                rrect(x0 + w, y0 + w, x1 - w, y1 - w, ri, corners))
