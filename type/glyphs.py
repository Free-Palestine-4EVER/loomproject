"""LOOM Bloom — glyph construction.

A fat, geometric, round-terminal display face. One stem weight everywhere, so
every glyph is drawn from the same three primitives and unioned. Uppercase only
by design (lowercase codepoints map to the same glyphs), which is how the
reference display faces of this class behave.
"""
import math

from geom import (U, DIFF, ISECT, arc, arc_pt, capsule, circle, ellipse, poly,
                  rect, ring)

UPM = 1000
CAP = 700          # cap height
W = 176            # the one stem weight
OV = 14            # round overshoot
SB = 52            # default sidebearing
DESC = -200

HW = W / 2.0


def vstem(x, y0=0.0, y1=CAP):
    return capsule((x + HW, y0 + HW), (x + HW, y1 - HW), W)


def hbar(y, x0, x1):
    return capsule((x0 + HW, y), (x1 - HW, y), W)


def diag(p0, p1, w=W):
    return capsule(p0, p1, w)


# ————————————————————————————————————————————————— letters
def _A(B=640):
    apex = (B / 2, CAP - HW)
    left = diag((HW, HW), apex)
    right = diag((B - HW, HW), apex)
    t = (215.0 - HW) / (CAP - W)
    xl = HW + t * (B / 2 - HW)
    bar = capsule((xl + 26, 215), (B - xl - 26, 215), W * 0.9)
    return U(left, right, bar), B


def _bowl(join_x, ytop, ybot, right, wid=W):
    """Right-side D bowl from ytop down to ybot, outer edge at `right`."""
    cy = (ytop + ybot) / 2
    ry = (ytop - ybot) / 2
    rx = right - wid / 2 - join_x
    return arc(join_x, cy, rx, ry, -90, 90, wid, cap0=False, cap1=False)


def _B(B=620):
    ymid = CAP * 0.525
    jx = B * 0.30
    top = U(_bowl(jx, CAP - HW, ymid, B - 12), hbar(CAP - HW, 0, jx + HW))
    bot = U(_bowl(jx, ymid, HW, B), hbar(HW, 0, jx + HW))
    return U(vstem(0), top, bot, hbar(ymid, 0, jx + HW)), B


def _C(B=650):
    cx, cy = B / 2, CAP / 2
    return arc(cx, cy, B / 2 - HW, CAP / 2 - HW + OV, 54, 306, W), B


def _D(B=650):
    jx = B * 0.28
    return U(vstem(0), hbar(CAP - HW, 0, jx + HW), hbar(HW, 0, jx + HW),
             _bowl(jx, CAP - HW, HW, B)), B


def _E(B=560):
    return U(vstem(0), hbar(CAP - HW, 0, B), hbar(CAP / 2, 0, B * 0.90),
             hbar(HW, 0, B)), B


def _F(B=540):
    return U(vstem(0), hbar(CAP - HW, 0, B), hbar(CAP * 0.50, 0, B * 0.88)), B


def _G(B=660):
    cx, cy = B / 2, CAP / 2
    rx, ry = B / 2 - HW, CAP / 2 - HW + OV
    a1 = 314
    body = arc(cx, cy, rx, ry, 54, a1, W)
    ex, ey = arc_pt(cx, cy, rx, ry, a1)
    bar_y = CAP * 0.50
    spur = capsule((ex, ey), (ex, bar_y), W)
    bar = capsule((B * 0.52, bar_y), (ex, bar_y), W)
    return U(body, spur, bar), B


def _H(B=660):
    return U(vstem(0), vstem(B - W), hbar(CAP / 2, 0, B)), B


def _I(B=W):
    return vstem(0), B


def _J(B=540):
    ry = 132.0
    cy = HW + ry
    rx = (B - W) / 2
    cx = B / 2
    hook = arc(cx, cy, rx, ry, 0, -180, W, cap0=False)
    stem = capsule((cx + rx, cy), (cx + rx, CAP - HW), W)
    return U(hook, stem), B


def _K(B=640):
    return U(vstem(0),
             diag((W * 0.86, CAP * 0.46), (B - HW, CAP - HW)),
             diag((W * 0.72, CAP * 0.42), (B - HW, HW))), B


def _L(B=530):
    return U(vstem(0), hbar(HW, 0, B)), B


def _M(B=800):
    apex_y = CAP * 0.20
    return U(vstem(0), vstem(B - W),
             diag((HW, CAP - HW), (B / 2, apex_y)),
             diag((B - HW, CAP - HW), (B / 2, apex_y))), B


def _N(B=670):
    return U(vstem(0), vstem(B - W), diag((HW, CAP - HW), (B - HW, HW))), B


def _O(B=690):
    return ring(B / 2, CAP / 2, B / 2 - HW, CAP / 2 - HW + OV, W), B


def _P(B=610):
    ymid = CAP * 0.44
    jx = B * 0.30
    return U(vstem(0), hbar(CAP - HW, 0, jx + HW), hbar(ymid, 0, jx + HW),
             _bowl(jx, CAP - HW, ymid, B)), B


def _Q(B=690):
    o, _ = _O(B)
    tail = capsule((B * 0.60, CAP * 0.30), (B * 0.94, -46), W * 0.92)
    return U(o, tail), B


def _R(B=630):
    ymid = CAP * 0.44
    p, _ = _P(B)
    leg = diag((B * 0.40, ymid + HW * 0.4), (B - HW, HW))
    return U(p, leg), B


def _S(B=620):
    # two flat bowls plus a waist. ry is sized so 2*(2ry + W) lands just over the
    # cap height — any rounder and the bowls swallow each other into a blob.
    cx = B / 2
    rx = B / 2 - HW
    ry = CAP * 0.205
    cyt = CAP - HW + OV - ry
    cyb = HW - OV + ry
    a_top_end, a_bot_end = 252.0, 72.0
    cxt, cxb = cx - 10, cx + 10
    top = arc(cxt, cyt, rx, ry, 8, a_top_end, W, cap1=False)
    bot = arc(cxb, cyb, rx, ry, 188, 360 + a_bot_end, W, cap0=False)
    waist = capsule(arc_pt(cxt, cyt, rx, ry, a_top_end),
                    arc_pt(cxb, cyb, rx, ry, a_bot_end), W * 0.92)
    return U(top, bot, waist), B


def _T(B=610):
    return U(hbar(CAP - HW, 0, B), capsule((B / 2, HW), (B / 2, CAP - HW), W)), B


def _U(B=660):
    ry = CAP * 0.32
    cy = HW - OV + ry
    rx = B / 2 - HW
    cx = B / 2
    hook = arc(cx, cy, rx, ry, 180, 360, W, cap0=False, cap1=False)
    return U(hook, capsule((cx - rx, cy), (cx - rx, CAP - HW), W),
             capsule((cx + rx, cy), (cx + rx, CAP - HW), W)), B


def _V(B=650):
    return U(diag((HW, CAP - HW), (B / 2, HW)),
             diag((B - HW, CAP - HW), (B / 2, HW))), B


def _W(B=920):
    mid_y = CAP * 0.58
    return U(diag((HW, CAP - HW), (B * 0.275, HW)),
             diag((B * 0.275, HW), (B / 2, mid_y)),
             diag((B / 2, mid_y), (B * 0.725, HW)),
             diag((B * 0.725, HW), (B - HW, CAP - HW))), B


def _X(B=640):
    return U(diag((HW, CAP - HW), (B - HW, HW)),
             diag((B - HW, CAP - HW), (HW, HW))), B


def _Y(B=630):
    j = (B / 2, CAP * 0.40)
    return U(diag((HW, CAP - HW), j), diag((B - HW, CAP - HW), j),
             capsule(j, (B / 2, HW), W)), B


def _Z(B=600):
    return U(hbar(CAP - HW, 0, B), hbar(HW, 0, B),
             diag((B - HW, CAP - HW), (HW, HW))), B


# ————————————————————————————————————————————————— figures
def _zero(B=650):
    return ring(B / 2, CAP / 2, B / 2 - HW, CAP / 2 - HW + OV, W), B


def _one(B=420):
    stem = capsule((B * 0.60, HW), (B * 0.60, CAP - HW), W)
    flag = diag((B * 0.10, CAP * 0.74), (B * 0.60 - HW * 0.3, CAP - HW), W * 0.9)
    return U(stem, flag), B


def _two(B=610):
    rx = B / 2 - HW
    ry = (CAP * 0.56 - W) / 2
    cx, cy = B / 2, CAP - HW + OV - ry
    top = arc(cx, cy, rx, ry, 200, -20, W)
    ex, ey = arc_pt(cx, cy, rx, ry, -20)
    return U(top, diag((ex, ey), (HW + 10, HW)), hbar(HW, 0, B)), B


def _three(B=610):
    rx = B / 2 - HW
    ry = CAP * 0.205
    cyt = CAP - HW + OV - ry
    cyb = HW - OV + ry
    cx = B / 2
    top = arc(cx, cyt, rx, ry, 172, -86, W)
    bot = arc(cx, cyb, rx, ry, 86, -172, W)
    return U(top, bot), B


def _four(B=650):
    apex = (B * 0.66, CAP - HW)
    return U(capsule(apex, (B * 0.66, HW), W),
             diag(apex, (HW, CAP * 0.29)),
             hbar(CAP * 0.29, 0, B)), B


def _five(B=600):
    ry = (CAP * 0.60 - W) / 2
    cy = HW - OV + ry
    rx = B / 2 - HW
    cx = B / 2
    bowl = arc(cx, cy, rx, ry, 104, -186, W)
    shoulder = cy + ry
    return U(bowl, capsule((HW, shoulder), (HW, CAP - HW), W),
             hbar(CAP - HW, 0, B * 0.96),
             capsule((HW, shoulder), (cx - rx * 0.1, shoulder), W)), B


def _six(B=640):
    ry = (CAP * 0.58 - W) / 2
    cy = HW - OV + ry
    rx = B / 2 - HW
    cx = B / 2
    bowl = ring(cx, cy, rx, ry, W)
    spine = arc(cx, cy, rx, CAP - HW - cy, 180, 108, W, cap0=False)
    return U(bowl, spine), B


def _seven(B=590):
    return U(hbar(CAP - HW, 0, B), diag((B - HW, CAP - HW), (B * 0.22, HW))), B


def _eight(B=660):
    w = W * 0.82
    ryt, ryb = 118.0, 132.0
    cyt = CAP - w / 2 + OV - ryt
    cyb = w / 2 - OV + ryb
    return U(ring(B / 2, cyt, B / 2 - w / 2 - 24, ryt, w),
             ring(B / 2, cyb, B / 2 - w / 2, ryb, w)), B


def _nine(B=640):
    ry = (CAP * 0.58 - W) / 2
    cy = CAP - HW + OV - ry
    rx = B / 2 - HW
    cx = B / 2
    bowl = ring(cx, cy, rx, ry, W)
    tail = arc(cx, cy, rx, cy - HW, 0, -72, W, cap0=False)
    return U(bowl, tail), B


# ————————————————————————————————————————————————— punctuation
def _period(B=W):
    return circle(HW, HW, HW), B


def _comma(B=W + 20):
    return U(circle(HW, HW, HW), capsule((HW, HW), (HW * 0.55, -110), W * 0.72)), B


def _colon(B=W):
    return U(circle(HW, HW, HW), circle(HW, CAP * 0.46, HW)), B


def _semicolon(B=W + 20):
    c, _ = _comma()
    return U(c, circle(HW, CAP * 0.46, HW)), B


def _exclam(B=W):
    return U(circle(HW, HW, HW), capsule((HW, CAP * 0.30), (HW, CAP - HW), W)), B


def _question(B=520):
    cx = B * 0.52
    rx = B / 2 - HW
    ry = CAP * 0.20
    cy = CAP - HW - ry
    top = arc(cx, cy, rx, ry, 200, -55, W)
    ex, ey = arc_pt(cx, cy, rx, ry, -55)
    return U(top, capsule((ex, ey), (cx, CAP * 0.32), W), circle(cx, HW, HW)), B


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


def _paren(B=360, flip=False):
    rx, ry = B * 1.05, CAP * 0.58
    cx = B / 2 - rx * 0.72 if not flip else B / 2 + rx * 0.72
    a0, a1 = (-44, 44) if not flip else (224, 136)
    return arc(cx, CAP * 0.42, rx, ry, a0, a1, W * 0.92), B


def _slash(B=460):
    return diag((HW - 20, -60), (B - HW + 20, CAP - HW + 20)), B


def _backslash(B=460):
    return diag((HW - 20, CAP - HW + 20), (B - HW + 20, -60)), B


def _ampersand(B=740):
    w = W * 0.76
    rt = CAP * 0.185
    cxt, cyt = B * 0.36, CAP - w / 2 - rt
    rbx, rby = B * 0.30, CAP * 0.215
    cxb, cyb = B * 0.34, w / 2 - OV + rby
    top = ring(cxt, cyt, rt, rt, w)
    bot = ring(cxb, cyb, rbx, rby, w)
    tail = capsule((cxb + rbx * 0.55, cyb - rby * 0.55), (B - w / 2, CAP * 0.42), w)
    return U(top, bot, tail), B


def _at(B=880):
    cx, cy = B / 2, CAP * 0.50
    w = W * 0.56
    outer = arc(cx, cy, B / 2 - w / 2, cy - w / 2, -54, 290, w)
    hook = arc(cx, cy, B * 0.21, CAP * 0.26, -74, 176, w)
    eye = ring(cx, cy, B * 0.055, CAP * 0.06, w)
    return U(outer, hook, eye), B


def _percent(B=760):
    r = CAP * 0.16
    return U(ring(r + HW, CAP - HW - r, r, r, W * 0.8),
             ring(B - r - HW, HW + r, r, r, W * 0.8),
             diag((B * 0.14, HW), (B * 0.86, CAP - HW), W * 0.86)), B


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


def _bullet(B=340):
    return circle(B / 2, CAP * 0.42, W * 0.62), B


def _asciitilde(B=560):
    p = arc(B * 0.28, CAP * 0.40, B * 0.20, CAP * 0.10, 180, 0, W * 0.8)
    q = arc(B * 0.72, CAP * 0.40, B * 0.20, CAP * 0.10, 180, 360, W * 0.8)
    return U(p, q), B


def _degree(B=380):
    return ring(B / 2, CAP * 0.76, B * 0.24, B * 0.24, W * 0.78), B


# ————————————————————————————————————————————————— ornaments
def _leaf(length=260, wid=120, bend=0.30):
    """A pointed leaf: two arcs meeting at both tips, plus a black vein."""
    r = (length ** 2 / 4 + wid ** 2 / 4) / max(wid, 1)
    top = ISECT(circle(length / 2, -r + wid / 2, r), rect(-10, -wid, length + 10, wid))
    bot = ISECT(circle(length / 2, r - wid / 2, r), rect(-10, -wid, length + 10, wid))
    body = ISECT(top, bot)
    vein = capsule((length * 0.10, 0), (length * 0.92, 0), 16)
    ribs = U(*[capsule((length * t, 0),
                       (length * t + 42, -30 if i % 2 else 30), 12)
               for i, t in enumerate((0.30, 0.42, 0.54, 0.66))])
    leaf = DIFF(body, U(vein, ribs))
    from geom import xform
    return xform(leaf, rot=math.degrees(bend))


def _rose(r=95):
    """A little rose: nested open arcs, so it reads as line-work when cut out."""
    petals = U(*[arc(0, 0, r * s, r * s * 0.92, a, a + 300, r * 0.20)
                 for s, a in ((1.0, 20), (0.62, 200), (0.30, 40))])
    return U(petals, circle(0, 0, r * 0.12))


def _swirl(scale=1.0):
    """A curling vine."""
    from geom import xform
    parts = [arc(0, 0, 150, 150, 180, 20, 26),
             arc(150 + 96, 0, 96, 96, 200, -140, 22),
             arc(150 + 96 + 120, 40, 60, 60, 160, -60, 18)]
    return xform(U(*parts), sx=scale, sy=scale)


def ornament(kind=0):
    """The floral motif that gets cut out of a letter. Origin at its anchor."""
    from geom import xform
    if kind == 0:
        return U(xform(_rose(96), dx=0, dy=0),
                 xform(_leaf(300, 130), rot=205, dx=-40, dy=60),
                 xform(_leaf(250, 110), rot=-15, dx=70, dy=-70),
                 xform(_swirl(0.9), rot=120, dx=-30, dy=-40))
    if kind == 1:
        return U(xform(_rose(78), dx=90, dy=40),
                 xform(_rose(52), dx=-70, dy=-70),
                 xform(_leaf(280, 120), rot=250, dx=10, dy=-30),
                 xform(_swirl(0.75), rot=40, dx=-40, dy=60))
    return U(xform(_leaf(320, 140), rot=160, dx=60, dy=40),
             xform(_rose(70), dx=-50, dy=-40),
             xform(_swirl(0.85), rot=-160, dx=60, dy=-60),
             xform(_leaf(210, 96), rot=30, dx=-30, dy=90))


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
    'parenleft': lambda: _paren(), 'parenright': lambda: _paren(flip=True),
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


def build_glyphs():
    """name -> (Path, advance width). Space is handled by the builder."""
    out = {}
    for name, fn in list(LETTERS.items()) + list(FIGURES.items()) + list(PUNCT.items()):
        path, body = fn()
        path.simplify(fix_winding=True, keep_starting_points=False)
        out[name] = (path, body + 2 * SB)
    return out
