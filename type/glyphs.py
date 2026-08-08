"""LOOM Bloom — glyph construction.

A fat, geometric, round-terminal display face. One stem weight everywhere, so
every glyph is drawn from the same three primitives and unioned. Uppercase only
by design (lowercase codepoints map to the same glyphs), which is how the
reference display faces of this class behave.
"""
import math

from geom import (U, DIFF, ISECT, arc_pt, circle, ellipse, poly, rect, ring)
from geom import arc as _arc, bar as _bar, capsule as rcapsule, polystroke
from geom import rrect, rring


# LOOM Bloom is a CONDENSED BRUTAL face: no round terminals anywhere. Every
# straight stroke is a square-capped bar, every arc is cut flat on the radius,
# and each finished glyph is trimmed to its cap-height box so the joins come out
# as hard corners instead of chopped-off capsule ends.
def capsule(p0, p1, w, cap0=True, cap1=True):
    return _bar(p0, p1, w)


def arc(cx, cy, rx, ry, a0, a1, w, cap0=False, cap1=False):
    return _arc(cx, cy, rx, ry, a0, a1, w, cap0=False, cap1=False)


rarc = _arc

UPM = 1000
CAP = 700          # cap height
W = 178            # the one stem weight
OV = 14            # round overshoot
SB = 40            # default sidebearing
DESC = -200

HW = W / 2.0
R1 = 168            # the one corner radius the round half is built on


def vstem(x, y0=0.0, y1=CAP):
    return capsule((x + HW, y0 + HW), (x + HW, y1 - HW), W)


def hbar(y, x0, x1):
    return capsule((x0 + HW, y), (x1 - HW, y), W)


def diag(p0, p1, w=W):
    # diagonals run PAST their endpoint and get trimmed to the glyph box, so an
    # apex or a leg joins as a hard corner instead of a chopped-off stroke end
    return _bar(p0, p1, w, ext=w * 0.95)


# ————————————————————————————————————————————————— letters
def _A(B=640):
    # one mitred polyline up to the apex and back down, then the crossbar
    body = polystroke([(HW - 40, -90), (B / 2, CAP + 130), (B - HW + 40, -90)], W)
    t = (190.0 + 90) / (CAP + 130 + 90)
    xl = (HW - 40) + t * (B / 2 - HW + 40)
    bar = capsule((xl + 30, 190), (B - xl - 30, 190), W * 0.86)
    return U(body, bar), B


def _bowl(join_x, ytop, ybot, right, wid=W):
    """Right-side D bowl from ytop down to ybot, outer edge at `right`."""
    cy = (ytop + ybot) / 2
    ry = (ytop - ybot) / 2
    rx = right - wid / 2 - join_x
    return arc(join_x, cy, rx, ry, -90, 90, wid, cap0=False, cap1=False)


def _bowl_r(x0, y0, x1, y1, cy0, cy1, r=None, ri=64):
    """A right-side bowl: outer rounded box, counter box stated separately so the
    top and bottom rails can be different weights."""
    r = R1 if r is None else r
    return DIFF(rrect(x0, y0, x1, y1, r, corners=(0, 1, 1, 0)),
                rrect(x0 + W, cy0, x1 - W, cy1, ri, corners=(0, 1, 1, 0)))


def _B(B=650):
    # straight left stem, two flat-sided bowls. The middle rail is lighter than
    # the outer two, which is what buys both counters their height.
    wm = W * 0.72
    yw = CAP * 0.520
    top = _bowl_r(0, yw - wm / 2, B * 0.96, CAP, yw + wm / 2, CAP - W, r=R1 * 0.82)
    bot = _bowl_r(0, 0, B, yw + wm / 2, W, yw - wm / 2, r=R1 * 0.92)
    return U(rect(0, 0, W, CAP), top, bot,
             rect(0, yw - wm / 2, B * 0.70, yw + wm / 2)), B


def _C(B=660):
    mouth = rect(B * 0.55, CAP * 0.235, B + 20, CAP * 0.765)
    return DIFF(rring(0, 0, B, CAP, W, R1), mouth), B


def _D(B=660):
    return rring(0, 0, B, CAP, W, R1, corners=(0, 1, 1, 0)), B


def _E(B=560):
    return U(rect(0, 0, W, CAP), rect(0, CAP - W, B, CAP),
             rect(0, CAP / 2 - W * 0.43, B * 0.88, CAP / 2 + W * 0.43),
             rect(0, 0, B, W)), B


def _F(B=540):
    return U(rect(0, 0, W, CAP), rect(0, CAP - W, B, CAP),
             rect(0, CAP * 0.50 - W * 0.43, B * 0.86, CAP * 0.50 + W * 0.43)), B


def _G(B=680):
    mouth = rect(B * 0.55, CAP * 0.30, B + 20, CAP * 0.765)
    body = DIFF(rring(0, 0, B, CAP, W, R1), mouth)
    bar = rect(B * 0.46, CAP * 0.30, B, CAP * 0.30 + W)
    return U(body, bar), B


def _H(B=660):
    return U(rect(0, 0, W, CAP), rect(B - W, 0, B, CAP),
             rect(0, CAP / 2 - W / 2, B, CAP / 2 + W / 2)), B


def _I(B=W):
    return rect(0, 0, W, CAP), B


def _J(B=540):
    h = CAP * 0.62
    ri = max(R1 - W * 0.62, 24)
    hook = DIFF(rrect(0, 0, B, h, R1, corners=(0, 0, 1, 1)),
                rrect(W, W, B - W, h + 80, ri, corners=(0, 0, 0, 1)))
    hook = DIFF(hook, rect(-1, R1 + 1, W + 1, h + 80))       # no left wall on a J
    return U(rect(B - W, R1 * 0.5, B, CAP), hook), B


def _L(B=520):
    return U(rect(0, 0, W, CAP), rect(0, 0, B, W)), B


def _O(B=680):
    return rring(0, 0, B, CAP, W, R1), B


def _P(B=630):
    yb = CAP * 0.30
    return U(rect(0, 0, W, CAP),
             _bowl_r(0, yb, B, CAP, yb + W, CAP - W, r=R1 * 0.95)), B


def _Q(B=680):
    tail = poly([(B * 0.50, CAP * 0.26), (B * 0.50 + W, CAP * 0.26),
                 (B * 0.94, -CAP * 0.08), (B * 0.94 - W, -CAP * 0.08)])
    return U(rring(0, 0, B, CAP, W, R1), tail), B


def _R(B=660):
    yb = CAP * 0.38
    leg = polystroke([(B * 0.42, yb + W * 0.30), (B - W * 0.30, -90)], W)
    return U(rect(0, 0, W, CAP),
             _bowl_r(0, yb, B * 0.95, CAP, yb + W, CAP - W, r=R1 * 0.9), leg), B


def _S(B=640):
    # two flat-sided bowls that overlap at the waist; each has one side cut away
    h = (CAP + W) / 2
    top = DIFF(rring(0, CAP - h, B, CAP, W, R1),
               rect(B - W - 1, CAP - h - 1, B + 1, CAP - h + h * 0.42))
    bot = DIFF(rring(0, 0, B, h, W, R1),
               rect(-1, h * 0.58, W + 1, h + 1))
    return U(top, bot), B


def _T(B=620):
    return U(rect(0, CAP - W, B, CAP), rect(B / 2 - W / 2, 0, B / 2 + W / 2, CAP)), B


def _U(B=660):
    return U(rring(0, 0, B, CAP, W, R1, corners=(0, 0, 1, 1)),
             rect(0, CAP * 0.5, W, CAP), rect(B - W, CAP * 0.5, B, CAP)), B


def _K(B=640):
    j = (W * 0.80, CAP * 0.44)
    return U(rect(0, 0, W, CAP), polystroke([(B + 90, CAP + 90), j, (B + 90, -90)], W)), B


def _M(B=800):
    apex_y = CAP * 0.16
    return polystroke([(HW, -90), (HW, CAP + 90), (B / 2, apex_y),
                       (B - HW, CAP + 90), (B - HW, -90)], W), B


def _N(B=670):
    return polystroke([(HW, -90), (HW, CAP + 90), (B - HW, -20),
                       (B - HW, CAP + 90)], W), B


def _V(B=650):
    return polystroke([(HW, CAP + 90), (B / 2, -110), (B - HW, CAP + 90)], W), B


def _W(B=920):
    mid_y = CAP * 0.62
    return polystroke([(HW - 30, CAP + 90), (B * 0.29, -110), (B / 2, mid_y),
                       (B * 0.71, -110), (B - HW + 30, CAP + 90)], W), B


def _X(B=640):
    return U(polystroke([(HW - 60, CAP + 90), (B - HW + 60, -90)], W),
             polystroke([(B - HW + 60, CAP + 90), (HW - 60, -90)], W)), B


def _Y(B=630):
    j = (B / 2, CAP * 0.42)
    return U(polystroke([(HW - 30, CAP + 90), j, (B - HW + 30, CAP + 90)], W),
             capsule((B / 2, HW), (B / 2, j[1] + 20), W)), B


def _Z(B=600):
    return polystroke([(-90, CAP - HW), (B - HW * 0.7, CAP - HW),
                       (HW * 0.7, HW), (B + 90, HW)], W, miter=2.2), B


# ————————————————————————————————————————————————— figures
def _zero(B=620):
    return rring(0, 0, B, CAP, W, R1), B


def _one(B=420):
    x = B * 0.58
    return polystroke([(B * 0.02, CAP * 0.72), (x, CAP + 90), (x, -90)], W), B


def _two(B=610):
    h = CAP * 0.56
    bowl = DIFF(rring(0, CAP - h, B, CAP, W, R1),
                rect(-1, CAP - h - 1, W + 1, CAP - h + h * 0.55))
    dia = polystroke([(B - W / 2, CAP - h + h * 0.34), (W * 0.62, W / 2),
                      (B + 90, W / 2)], W, miter=2.2)
    return U(bowl, dia), B


def _three(B=600):
    h = (CAP + W) / 2
    top = DIFF(rring(0, CAP - h, B, CAP, W, R1, corners=(1, 1, 1, 1)),
               rect(-1, CAP - h - 1, W + 1, CAP - h + h * 0.62))
    bot = DIFF(rring(0, 0, B, h, W, R1),
               rect(-1, h * 0.38, W + 1, h + 1))
    return U(top, bot), B


def _four(B=650):
    xs, yb = B * 0.68, CAP * 0.30
    return U(polystroke([(xs, CAP + 90), (-30, yb), (B + 90, yb)], W, miter=2.4),
             capsule((xs, -90), (xs, CAP), W)), B


def _five(B=600):
    h = CAP * 0.58
    bowl = DIFF(rring(0, 0, B, h, W, R1),
                rect(-1, h * 0.52, W + 1, h + 1))
    return U(bowl, rect(0, h * 0.52 - W, W, CAP), rect(0, CAP - W, B * 0.96, CAP)), B


def _six(B=620):
    h = CAP * 0.60
    bowl = rring(0, 0, B, h, W, R1)
    spine = polystroke([(B - W * 0.5, CAP + 90), (W * 0.5, h * 0.55)], W)
    return U(bowl, spine), B


def _seven(B=590):
    return polystroke([(-90, CAP - W / 2), (B - W * 0.6, CAP - W / 2),
                       (B * 0.20, -90)], W, miter=2.4), B


def _eight(B=640):
    h = (CAP + W * 0.9) / 2
    return U(rring(B * 0.02, CAP - h, B * 0.98, CAP, W, R1),
             rring(0, 0, B, h, W, R1)), B


def _nine(B=620):
    h = CAP * 0.60
    bowl = rring(0, CAP - h, B, CAP, W, R1)
    tail = polystroke([(W * 0.5, -90), (B - W * 0.5, CAP - h * 0.55)], W)
    return U(bowl, tail), B


# ————————————————————————————————————————————————— punctuation
def _period(B=W):
    return rect(0, 0, W, W), B


def _comma(B=W + 20):
    return poly([(0, W), (W, W), (W * 0.62, -150), (0, -150)]), B


def _colon(B=W):
    return U(rect(0, 0, W, W), rect(0, CAP * 0.46 - HW, W, CAP * 0.46 + HW)), B


def _semicolon(B=W + 20):
    c, _ = _comma()
    return U(c, rect(0, CAP * 0.46 - HW, W, CAP * 0.46 + HW)), B


def _exclam(B=W):
    return U(rect(0, 0, W, W), poly([(W * 0.06, CAP * 0.30), (W * 0.94, CAP * 0.30),
                                     (W, CAP), (0, CAP)])), B


def _question(B=560):
    h = CAP * 0.62
    y0 = CAP - h
    bowl = DIFF(rring(0, y0, B, CAP, W, R1 * 0.9),
                rect(-1, y0 - 1, B * 0.52, y0 + h * 0.52))   # open the bottom-left
    sx = B * 0.52
    stem = rect(sx, CAP * 0.26, sx + W, y0 + W)
    return U(bowl, stem, rect(sx, 0, sx + W, W)), B


def _hyphen(B=380):
    return hbar(CAP * 0.42, 0, B), B


def _endash(B=520):
    return hbar(CAP * 0.42, 0, B), B


def _emdash(B=760):
    return hbar(CAP * 0.42, 0, B), B


def _underscore(B=620):
    return capsule((HW, -110), (B - HW, -110), W), B


def _quotesingle(B=W):
    return capsule((HW, CAP * 0.70), (HW, CAP - HW), W), B


def _quotedbl(B=W * 2 + 60):
    return U(capsule((HW, CAP * 0.70), (HW, CAP - HW), W),
             capsule((W + 60 + HW, CAP * 0.70), (W + 60 + HW, CAP - HW), W)), B


def _paren(B=310, flip=False):
    ring = rring(-B * 1.4, -CAP * 0.06, B * 0.95, CAP * 0.86, W * 0.92, R1 * 3)
    half = ISECT(ring, rect(0, -200, B, CAP + 200))
    if flip:
        from geom import xform
        half = xform(half, sx=-1, dx=B)
    return half, B


def _slash(B=460):
    return diag((HW - 20, -60), (B - HW + 20, CAP - HW + 20)), B


def _backslash(B=460):
    return diag((HW - 20, CAP - HW + 20), (B - HW + 20, -60)), B


def _ampersand(B=700):
    w = W * 0.58
    st, sb = CAP * 0.44, CAP * 0.60
    top = rring(B * 0.06, CAP - st, B * 0.06 + st * 0.88, CAP, w, R1 * 0.48)
    bot = rring(0, 0, sb * 0.94, sb, w, R1 * 0.52)
    tail = polystroke([(sb * 0.86, sb * 0.26), (B - w * 0.5, CAP * 0.46)], w)
    return U(top, bot, tail), B


def _at(B=820):
    # a blocky @: a cut ring, a squared-off inner bowl, and the bar that closes it
    cx, cy = B / 2, CAP * 0.50
    w = W * 0.52
    outer = arc(cx, cy, B / 2 - w / 2, cy - w / 2, -48, 292, w)
    ix, iy = B * 0.20, CAP * 0.20
    inner = DIFF(rect(cx - ix, cy - iy, cx + ix, cy + iy),
                 rect(cx - ix + w, cy - iy + w, cx + ix - w, cy + iy - w))
    stub = rect(cx + ix - w, cy - iy - w * 1.1, cx + ix, cy - iy)
    return U(outer, inner, stub), B


def _percent(B=760):
    s = CAP * 0.40
    w = W * 0.58
    return U(rring(0, CAP - s, s, CAP, w, R1 * 0.42),
             rring(B - s, 0, B, s, w, R1 * 0.42),
             polystroke([(B * 0.04, -90), (B * 0.96, CAP + 90)], W * 0.86)), B


def _plus(B=560):
    return U(hbar(CAP * 0.42, 0, B), capsule((B / 2, CAP * 0.42 - (B / 2 - HW)),
                                             (B / 2, CAP * 0.42 + (B / 2 - HW)), W)), B


def _equal(B=560):
    return U(hbar(CAP * 0.28, 0, B), hbar(CAP * 0.58, 0, B)), B


def _asterisk(B=460):
    cx, cy = B / 2, CAP * 0.70
    r = B * 0.46
    arms = [capsule((cx, cy), (cx + r * math.cos(math.radians(a)),
                               cy + r * math.sin(math.radians(a))), W * 0.62)
            for a in (90, 162, 234, 306, 18)]
    return U(*arms), B


def _numbersign(B=740):
    a = []
    for x in (B * 0.28, B * 0.60):
        a.append(capsule((x + 60, HW), (x - 60, CAP - HW), W * 0.82))
    for y in (CAP * 0.30, CAP * 0.60):
        a.append(capsule((HW, y), (B - HW, y), W * 0.82))
    return U(*a), B


def _bullet(B=320):
    r = W * 0.44
    return rect(B / 2 - r, CAP * 0.42 - r, B / 2 + r, CAP * 0.42 + r), B


def _asciitilde(B=560):
    y, h = CAP * 0.40, CAP * 0.085
    return polystroke([(0, y - h), (B * 0.34, y + h), (B * 0.66, y - h), (B, y + h)],
                      W * 0.78, miter=2.0), B


def _degree(B=380):
    return ring(B / 2, CAP * 0.76, B * 0.24, B * 0.24, W * 0.78), B


# ————————————————————————————————————————————————— ornaments
def _petal(length, wid, ang, dist, taper=0.5):
    """One petal, wide at the base and rounded to a tip."""
    from geom import xform
    x0, x1 = dist, dist + length
    hb, ht = wid / 2, wid / 2 * taper
    body = poly([(x0, -hb), (x1 - ht, -ht), (x1 - ht, ht), (x0, hb)])
    return xform(U(body, circle(x1 - ht, 0, ht), circle(x0, 0, hb * 0.92)), rot=ang)


def _rose(r=140):
    """A spiral rose. Four open bands winding out from a solid heart — the gaps
    between the bands ARE the drawing, which is why it reads as a rose at any
    size instead of as a ring of blobs."""
    s = r / 140.0
    bands = []
    for rad, a0, span, w, ox, oy in (
            (46, 30, 320, 25, 5, 4), (78, -50, 300, 27, 14, 11),
            (110, -130, 290, 29, 24, 18), (140, -210, 260, 30, 34, 25)):
        bands.append(rarc(ox * s, oy * s, rad * s, rad * s * 0.94,
                          a0, a0 + span, w * s))
    return U(circle(4 * s, 3 * s, 21 * s), *bands)


def _daisy(r=135):
    """A daisy: eleven tapered petals and a seeded eye."""
    s = r / 135.0
    petals = U(*[_petal(122 * s, 46 * s, a, 26 * s, taper=0.34)
                 for a in range(0, 360, 33)])
    body = U(petals, circle(0, 0, 44 * s))
    cuts = [rcapsule((46 * s * math.cos(math.radians(a)), 46 * s * math.sin(math.radians(a))),
                     (162 * s * math.cos(math.radians(a)), 162 * s * math.sin(math.radians(a))),
                     11 * s) for a in range(16, 376, 33)]
    cuts.append(DIFF(circle(0, 0, 46 * s), circle(0, 0, 36 * s)))
    cuts += [circle(20 * s * math.cos(math.radians(a)), 20 * s * math.sin(math.radians(a)), 6.5 * s)
             for a in range(0, 360, 51)]
    return DIFF(body, U(*cuts))


def _leaf(length=360, wid=150, bend=0.30):
    """A smooth almond leaf with a midrib and three fine ribs. No serration —
    teeth at this scale read as a thistle, not a leaf."""
    r = (length ** 2 / 4 + wid ** 2 / 4) / max(wid, 1)
    top = ISECT(circle(length / 2, -r + wid / 2, r), rect(-10, -wid, length + 10, wid))
    bot = ISECT(circle(length / 2, r - wid / 2, r), rect(-10, -wid, length + 10, wid))
    body = ISECT(top, bot)
    k = length / 360.0
    vein = rcapsule((length * 0.08, 0), (length * 0.93, 0), 20 * k)
    ribs = U(*[rcapsule((length * t, 0), (length * t + 46 * k, (-1 if i % 2 else 1) * 30 * k), 12 * k)
               for i, t in enumerate((0.30, 0.46, 0.62))])
    stem = rcapsule((-length * 0.15, 0), (length * 0.08, 0), 22 * k)
    from geom import xform
    return xform(U(DIFF(body, U(vein, ribs)), stem), rot=math.degrees(bend))


def _tulip(h=190):
    """A tulip: one smooth cup, three tips, one neck. Nothing striped."""
    s = h / 190.0
    cup = ISECT(ellipse(0, 0, 100 * s, h * 0.94), rect(-130 * s, -h, 130 * s, h * 0.42))
    tips = U(circle(-52 * s, h * 0.40, 42 * s),
             ellipse(0, h * 0.50, 44 * s, 52 * s),
             circle(52 * s, h * 0.40, 42 * s))
    body = U(cup, tips)
    # two thin cuts from the rim down the shoulder — enough to read as three
    # petals without striping the whole cup
    notch = U(rcapsule((-36 * s, h * 0.72), (-18 * s, -h * 0.20), 17 * s),
              rcapsule((36 * s, h * 0.72), (18 * s, -h * 0.20), 17 * s))
    neck = rcapsule((0, -h * 0.80), (0, -h * 1.85), 20 * s)
    return U(DIFF(body, notch), neck)


def _ivy(size=120):
    """An ivy leaf as a pointed heart — two round shoulders and a sharp tip.
    Lobed versions dissolve into a cloud once they are scaled into a stem."""
    s = size / 120.0
    shoulders = U(circle(-36 * s, 38 * s, 48 * s), circle(36 * s, 38 * s, 48 * s))
    blade = poly([(-82 * s, 30 * s), (82 * s, 30 * s), (0, -120 * s)])
    body = U(shoulders, blade)
    # the dip between the shoulders, and the midrib
    dip = poly([(-30 * s, 100 * s), (30 * s, 100 * s), (0, 26 * s)])
    vein = rcapsule((0, -104 * s), (0, 58 * s), 11 * s)
    stem = rcapsule((0, -108 * s), (0, -178 * s), 13 * s)
    return U(DIFF(body, U(dip, vein)), stem)


def _swirl(scale=1.0):
    """A tapering vine. Flat-cut ends, no bobbles."""
    parts = [arc(0, 0, 150, 150, 174, 22, 26),
             arc(150 + 96, 0, 96, 96, 198, -138, 20),
             arc(150 + 96 + 118, 40, 56, 56, 154, -72, 14)]
    from geom import xform
    return xform(U(*parts), sx=scale, sy=scale)


def _bud(r=52):
    """A closed bud on a neck."""
    cup = ISECT(ellipse(0, 0, r, r * 1.12), rect(-r * 1.2, -r * 1.3, r * 1.2, r * 0.45))
    body = U(cup, ellipse(0, r * 0.34, r * 0.58, r * 0.58))
    cut = ISECT(circle(0, r * 0.42, r * 0.34), rect(-r * 0.1, 0, r, r * 2))
    neck = rcapsule((0, -r * 1.0), (0, -r * 2.0), r * 0.2)
    return U(DIFF(body, cut), neck)


def _sprig(n=5, spread=300, scale=1.0):
    """A run of small leaves down a stem — filler between the blooms."""
    from geom import xform
    stem = arc(0, 0, spread * 0.9, spread * 0.5, 202, 338, 22 * scale)
    leaves = []
    for i in range(n):
        t = 202 + (136 * (i + 0.5) / n)
        px, py = arc_pt(0, 0, spread * 0.9, spread * 0.5, t)
        leaves.append(xform(_leaf(150 * scale, 62 * scale), rot=t + 90, dx=px, dy=py))
    return U(stem, *leaves)


def motif_single(kind=0, fam='floral'):
    """ONE bloom, centred on the origin, about 150 units across at scale 1.

    The cluster in ornament() is for the ornament glyphs and for free-standing
    use. Inside a letter a cluster cannot be fitted — its bounding box is wider
    than most stems — so the planted cuts place these instead: one flower per
    piece of the letter that is actually thick enough to hold one.
    """
    from geom import xform
    k = kind % 3
    if fam == 'daisy':
        f = _daisy(132 if k == 0 else 108 if k == 1 else 148)
    elif fam == 'tulip':
        f = xform(_tulip(150 if k == 0 else 122 if k == 1 else 168), rot=(k - 1) * 16)
    elif fam == 'ivy':
        f = xform(_ivy(150 if k == 0 else 124 if k == 1 else 170), rot=(k - 1) * 22)
    else:
        f = _rose(136 if k == 0 else 112 if k == 1 else 152)
    if fam == 'ivy':
        # ivy is a leaf already — pairing it with an almond leaf made every spot
        # read as two crossed blobs
        second = xform(_ivy(86 if k else 74), rot=150 + k * 40, dx=-88 + k * 30, dy=-72 + k * 26)
        return U(f, second)
    # one leaf tucked behind, on alternating sides, so a spot never reads as a
    # sticker dropped on the stem
    leaf = xform(_leaf(230, 96), rot=200 + k * 55, dx=-30 + k * 24, dy=-60 + k * 30)
    return U(f, leaf)


def ornament(kind=0, fam='floral'):
    """The cluster cut out of a letter. Origin sits at the anchor point;
    everything that hangs off the letter simply disappears. `fam` picks the
    species — each cut of the family carries a different flower."""
    from geom import xform
    if fam != 'floral':
        return _ornament_other(kind, fam)
    if kind == 0:      # a full rose with two leaves and a trailing vine
        return U(xform(_rose(140)),
                 xform(_leaf(330, 150), rot=196, dx=-96, dy=104),
                 xform(_leaf(280, 128), rot=-24, dx=118, dy=-104),
                 xform(_bud(56), rot=-40, dx=176, dy=118),
                 xform(_swirl(0.9), rot=126, dx=-52, dy=-72))
    if kind == 1:      # rose and bud on a vine, leaning the other way
        return U(xform(_rose(118), dx=96, dy=52),
                 xform(_bud(66), rot=28, dx=-118, dy=-46),
                 xform(_leaf(320, 145), rot=232, dx=26, dy=-58),
                 xform(_leaf(240, 112), rot=16, dx=176, dy=-138),
                 xform(_swirl(0.78), rot=44, dx=-66, dy=96))
    return U(xform(_rose(126), dx=-58, dy=-40),        # leafy sprig
             xform(_leaf(345, 158), rot=152, dx=96, dy=76),
             xform(_leaf(255, 118), rot=34, dx=-56, dy=138),
             xform(_bud(58), rot=150, dx=-186, dy=76),
             xform(_swirl(0.85), rot=-150, dx=86, dy=-96))


def _ornament_other(kind, fam):
    from geom import xform
    k = kind % 3
    if fam == 'daisy':
        if k == 0:
            return U(xform(_daisy(132)),
                     xform(_daisy(78), dx=168, dy=126),
                     xform(_leaf(300, 132), rot=200, dx=-96, dy=90),
                     xform(_leaf(240, 108), rot=-26, dx=110, dy=-104),
                     xform(_swirl(0.8), rot=130, dx=-40, dy=-70))
        if k == 1:
            return U(xform(_daisy(112), dx=90, dy=60),
                     xform(_daisy(70), dx=-110, dy=-72),
                     xform(_leaf(280, 122), rot=240, dx=20, dy=-46),
                     xform(_sprig(4, 250, 0.9), rot=30, dx=-60, dy=70))
        return U(xform(_daisy(96), dx=-64, dy=-40),
                 xform(_daisy(120), dx=110, dy=88),
                 xform(_leaf(300, 130), rot=150, dx=70, dy=-70),
                 xform(_swirl(0.7), rot=-150, dx=-70, dy=60))
    if fam == 'tulip':
        if k == 0:
            return U(xform(_tulip(200)),
                     xform(_tulip(140), rot=-20, dx=150, dy=-40),
                     xform(_leaf(330, 120), rot=210, dx=-90, dy=40),
                     xform(_leaf(300, 110), rot=-30, dx=90, dy=-120))
        if k == 1:
            return U(xform(_tulip(180), rot=14, dx=60, dy=30),
                     xform(_tulip(120), rot=-24, dx=-130, dy=-60),
                     xform(_leaf(320, 116), rot=240, dx=10, dy=-40),
                     xform(_sprig(4, 240, 0.85), rot=20, dx=-50, dy=80))
        return U(xform(_tulip(210), rot=-8, dx=-40, dy=20),
                 xform(_leaf(340, 124), rot=160, dx=90, dy=60),
                 xform(_leaf(260, 100), rot=26, dx=-40, dy=130),
                 xform(_tulip(120), rot=26, dx=140, dy=-80))
    # ivy — no big bloom, a dense trailing vine instead
    if k == 0:
        return U(xform(_sprig(4, 300, 0.9), rot=8),
                 xform(_ivy(150), rot=-12, dx=-50, dy=70),
                 xform(_ivy(120), rot=155, dx=150, dy=-50),
                 xform(_ivy(96), rot=40, dx=40, dy=-130))
    if k == 1:
        return U(xform(_sprig(4, 280, 0.85), rot=192),
                 xform(_ivy(138), rot=22, dx=70, dy=-60),
                 xform(_ivy(112), rot=-158, dx=-130, dy=60),
                 xform(_ivy(90), rot=100, dx=-30, dy=-140))
    return U(xform(_sprig(4, 320, 0.9), rot=98),
             xform(_ivy(146), rot=198, dx=-80, dy=-60),
             xform(_ivy(116), rot=-28, dx=90, dy=90),
             xform(_ivy(92), rot=140, dx=150, dy=-60))




# ————————————————————————————————————————————————— spacing
# One global sidebearing spaces a round O exactly like a flat H, which is what
# made the first cut look gappy around O/C/S and tight around A/V/W. These are
# left/right sidebearings in units, applied by build_glyphs.
SB_ROUND = 30
SB_FLAT = 46
SB_OPEN = 26
SIDE = {}
for _n in 'BDEFHIKLMNPR':
    SIDE[_n] = (SB_FLAT, SB_FLAT)
for _n in 'COQGSU':
    SIDE[_n] = (SB_ROUND, SB_ROUND)
for _n in 'AVWXYZT':
    SIDE[_n] = (SB_OPEN, SB_OPEN)
SIDE.update({
    'J': (SB_ROUND, SB_FLAT), 'L': (SB_FLAT, SB_OPEN), 'P': (SB_FLAT, SB_ROUND),
    'F': (SB_FLAT, SB_OPEN), 'T': (SB_OPEN - 6, SB_OPEN - 6),
    'zero': (SB_ROUND, SB_ROUND), 'one': (SB_FLAT, SB_FLAT),
    'two': (SB_ROUND, SB_ROUND), 'three': (SB_ROUND, SB_ROUND),
    'four': (SB_OPEN, SB_OPEN), 'five': (SB_ROUND, SB_ROUND),
    'six': (SB_ROUND, SB_ROUND), 'seven': (SB_OPEN, SB_OPEN),
    'eight': (SB_ROUND, SB_ROUND), 'nine': (SB_ROUND, SB_ROUND),
})
DEFAULT_SIDE = (SB_FLAT - 6, SB_FLAT - 6)


# ————————————————————————————————————————————————— accents
# Sarajevo is half the company, so the Bosnian set (Č Ć Ž Š Đ) is not optional.
ACC_Y = CAP + 46          # where a mark sits above the cap


def _acute(w=120, h=118):
    return polystroke([(0, 0), (w, h)], W * 0.62)


def _grave(w=120, h=118):
    return polystroke([(0, h), (w, 0)], W * 0.62)


def _circumflex(w=200, h=120):
    return polystroke([(0, 0), (w / 2, h), (w, 0)], W * 0.6, miter=2.2)


def _caron(w=200, h=120):
    return polystroke([(0, h), (w / 2, 0), (w, h)], W * 0.6, miter=2.2)


def _dieresis(gap=150):
    s = W * 0.56
    return U(rect(0, 0, s, s), rect(gap, 0, gap + s, s))


def _tilde_acc(w=230, h=96):
    return polystroke([(0, 0), (w * 0.34, h), (w * 0.66, 0), (w, h)], W * 0.54, miter=2.0)


def _ring_acc(r=78):
    # the stroke has to stay well under the radius or the ring fills in solid
    return rring(0, 0, r * 2, r * 2, W * 0.30, r)


def _cedilla(w=120):
    return polystroke([(w * 0.5, 0), (w * 0.5, -66), (0, -104)], W * 0.5, miter=2.0)


ACCENTS = {
    'acute': (_acute, 120), 'grave': (_grave, 120), 'circumflex': (_circumflex, 200),
    'caron': (_caron, 200), 'dieresis': (_dieresis, 150 + W * 0.56),
    'tilde': (_tilde_acc, 230), 'ring': (_ring_acc, 152),
}

# name -> (base letter, accent, y offset)
COMPOSITES = {
    'Aacute': ('A', 'acute', 0), 'Agrave': ('A', 'grave', 0),
    'Acircumflex': ('A', 'circumflex', 0), 'Adieresis': ('A', 'dieresis', 26),
    'Atilde': ('A', 'tilde', 10), 'Aring': ('A', 'ring', 0),
    'Cacute': ('C', 'acute', 0), 'Ccaron': ('C', 'caron', 0),
    'Eacute': ('E', 'acute', 0), 'Egrave': ('E', 'grave', 0),
    'Ecircumflex': ('E', 'circumflex', 0), 'Edieresis': ('E', 'dieresis', 26),
    'Iacute': ('I', 'acute', 0), 'Igrave': ('I', 'grave', 0),
    'Icircumflex': ('I', 'circumflex', 0), 'Idieresis': ('I', 'dieresis', 26),
    'Ntilde': ('N', 'tilde', 10),
    'Oacute': ('O', 'acute', 0), 'Ograve': ('O', 'grave', 0),
    'Ocircumflex': ('O', 'circumflex', 0), 'Odieresis': ('O', 'dieresis', 26),
    'Otilde': ('O', 'tilde', 10),
    'Scaron': ('S', 'caron', 0),
    'Uacute': ('U', 'acute', 0), 'Ugrave': ('U', 'grave', 0),
    'Ucircumflex': ('U', 'circumflex', 0), 'Udieresis': ('U', 'dieresis', 26),
    'Yacute': ('Y', 'acute', 0),
    'Zcaron': ('Z', 'caron', 0),
}

COMPOSITE_CPS = {
    'Aacute': 0xC1, 'Agrave': 0xC0, 'Acircumflex': 0xC2, 'Adieresis': 0xC4,
    'Atilde': 0xC3, 'Aring': 0xC5, 'Cacute': 0x106, 'Ccaron': 0x10C,
    'Eacute': 0xC9, 'Egrave': 0xC8, 'Ecircumflex': 0xCA, 'Edieresis': 0xCB,
    'Iacute': 0xCD, 'Igrave': 0xCC, 'Icircumflex': 0xCE, 'Idieresis': 0xCF,
    'Ntilde': 0xD1, 'Oacute': 0xD3, 'Ograve': 0xD2, 'Ocircumflex': 0xD4,
    'Odieresis': 0xD6, 'Otilde': 0xD5, 'Scaron': 0x160, 'Uacute': 0xDA,
    'Ugrave': 0xD9, 'Ucircumflex': 0xDB, 'Udieresis': 0xDC, 'Yacute': 0xDD,
    'Zcaron': 0x17D, 'Ccedilla': 0xC7, 'Dcroat': 0x110,
}


def build_accented(base_paths):
    """Composites: the base letter with a mark centred over it."""
    from geom import xform
    out = {}
    for name, (base, acc, dy) in COMPOSITES.items():
        if base not in base_paths:
            continue
        path, body = base_paths[base]
        fn, aw = ACCENTS[acc]
        mark = fn()
        mark = xform(mark, dx=(body - aw) / 2, dy=ACC_Y - dy)
        out[name] = (U(path, mark), body)

    # Ç and Đ are not mark-over-base, so they are drawn outright
    if 'C' in base_paths:
        path, body = base_paths['C']
        from geom import xform as xf
        out['Ccedilla'] = (U(path, xf(_cedilla(), dx=body * 0.5 - 60)), body)
    if 'D' in base_paths:
        path, body = base_paths['D']
        bar = rect(-W * 0.28, CAP * 0.46, W * 1.1, CAP * 0.46 + W * 0.62)
        out['Dcroat'] = (U(path, bar), body)
    return out


# ————————————————————————————————————————————————— registry
def _mk(fn, *a, **k):
    return fn(*a, **k)


LETTERS = {
    'A': _A, 'B': _B, 'C': _C, 'D': _D, 'E': _E, 'F': _F, 'G': _G, 'H': _H,
    'I': _I, 'J': _J, 'K': _K, 'L': _L, 'M': _M, 'N': _N, 'O': _O, 'P': _P,
    'Q': _Q, 'R': _R, 'S': _S, 'T': _T, 'U': _U, 'V': _V, 'W': _W, 'X': _X,
    'Y': _Y, 'Z': _Z,
}

FIGURES = {
    'zero': _zero, 'one': _one, 'two': _two, 'three': _three, 'four': _four,
    'five': _five, 'six': _six, 'seven': _seven, 'eight': _eight, 'nine': _nine,
}

PUNCT = {
    'period': _period, 'comma': _comma, 'colon': _colon, 'semicolon': _semicolon,
    'exclam': _exclam, 'question': _question, 'hyphen': _hyphen,
    'endash': _endash, 'emdash': _emdash, 'underscore': _underscore,
    'quotesingle': _quotesingle, 'quotedbl': _quotedbl,
    'parenleft': lambda: _paren(flip=True), 'parenright': lambda: _paren(),
    'slash': _slash, 'backslash': _backslash, 'ampersand': _ampersand,
    'at': _at, 'percent': _percent, 'plus': _plus, 'equal': _equal,
    'asterisk': _asterisk, 'numbersign': _numbersign, 'bullet': _bullet,
    'asciitilde': _asciitilde, 'degree': _degree,
}

# character -> glyph name for everything the font covers
CMAP = {}
for ch in LETTERS:
    CMAP[ord(ch)] = ch
    CMAP[ord(ch.lower())] = ch          # display face: lowercase types as caps
for i, name in enumerate(['zero', 'one', 'two', 'three', 'four', 'five', 'six',
                          'seven', 'eight', 'nine']):
    CMAP[ord(str(i))] = name
for _nm, _cp in COMPOSITE_CPS.items():
    CMAP[_cp] = _nm
    # lowercase forms type as caps, like every other letter in this face
    _lc = chr(_cp).lower()
    if _lc != chr(_cp):
        CMAP[ord(_lc)] = _nm

CMAP.update({
    0x2E: 'period', 0x2C: 'comma', 0x3A: 'colon', 0x3B: 'semicolon',
    0x21: 'exclam', 0x3F: 'question', 0x2D: 'hyphen', 0x2013: 'endash',
    0x2014: 'emdash', 0x5F: 'underscore', 0x27: 'quotesingle', 0x22: 'quotedbl',
    0x2018: 'quotesingle', 0x2019: 'quotesingle', 0x201C: 'quotedbl',
    0x201D: 'quotedbl', 0x28: 'parenleft', 0x29: 'parenright',
    0x5B: 'parenleft', 0x5D: 'parenright', 0x2F: 'slash', 0x5C: 'backslash',
    0x26: 'ampersand', 0x40: 'at', 0x25: 'percent', 0x2B: 'plus',
    0x3D: 'equal', 0x2A: 'asterisk', 0x23: 'numbersign', 0x2022: 'bullet',
    0x7E: 'asciitilde', 0xB0: 'degree',
})


# How condensed the face is. Every glyph's body width is scaled by this; the
# stem weight is NOT, which is what makes it read as a compressed grotesque.
CONDENSE = 0.86

# Glyphs whose diagonals overshoot: after the union, clip to this box (as a
# fraction-free tuple of x0, y0, x1, y1, with B substituted for the body width).
# Everything else is left alone so round overshoot survives.
TRIM = {
    'A': (0, 0, 'B', CAP), 'K': (0, 0, 'B', CAP), 'M': (0, 0, 'B', CAP),
    'N': (0, 0, 'B', CAP), 'R': (0, 0, 'B', CAP), 'V': (0, 0, 'B', CAP),
    'W': (0, 0, 'B', CAP), 'X': (0, 0, 'B', CAP), 'Y': (0, 0, 'B', CAP),
    'Z': (0, 0, 'B', CAP),
    'one': (0, 0, 'B', CAP), 'four': (0, 0, 'B', CAP), 'seven': (0, 0, 'B', CAP),
    'two': (0, 0, 'B', CAP + OV + 2),
    'percent': (0, 0, 'B', CAP), 'seven': (0, 0, 'B', CAP),
    'slash': (0, -180, 'B', CAP + 60), 'backslash': (0, -180, 'B', CAP + 60),
}


def _fit(name, path, B):
    box = TRIM.get(name)
    if not box:
        return path
    x0, y0, x1, y1 = [B if v == 'B' else v for v in box]
    return ISECT(path, rect(x0, y0, x1, y1))


def build_glyphs():
    """name -> (Path, advance width). Space is handled by the builder."""
    import inspect
    out = {}
    from geom import xform
    raw = {}
    for name, fn in list(LETTERS.items()) + list(FIGURES.items()) + list(PUNCT.items()):
        sig = inspect.signature(fn)
        kw = {}
        if 'B' in sig.parameters:
            default = sig.parameters['B'].default
            if isinstance(default, (int, float)):
                kw['B'] = max(W, default * CONDENSE)
        path, body = fn(**kw)
        path = _fit(name, path, body)
        raw[name] = (path, body)

    raw.update(build_accented(raw))

    for name, (path, body) in raw.items():
        lsb, rsb = SIDE.get(name, DEFAULT_SIDE)
        # the outline is drawn from x=0, so it has to be shifted into its own
        # left sidebearing — otherwise every glyph sits flush against the
        # previous one and all the air ends up on the right
        path = xform(path, dx=lsb)
        path.simplify(fix_winding=True, keep_starting_points=False)
        out[name] = (path, body + lsb + rsb)
    return out
