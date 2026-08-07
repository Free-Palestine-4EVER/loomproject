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
