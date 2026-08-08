"""The garden — dense floral FIELDS, clipped by the letter.

This replaces the old one-bloom-per-thick-region idea, which is what made the
planted cuts read as three stickers dropped on a stem. Every reference for this
kind of face — packed daisy caps, sakura display faces, Morris damask initials —
does the same two things, and neither of them is "place a flower in the middle":

  1. The flowers are a CONTINUOUS FIELD covering the whole letter edge to edge,
     not a handful of anchored spots.
  2. The flowers are drawn as LINE-WORK — a stroked outline — so the letter keeps
     ~85% of its ink and stays black and readable. Subtracting a solid bloom eats
     the stem; subtracting the bloom's outline draws it.

So each species builds one big field once, as two paths:

    ink   the solid silhouettes of the blooms. Only used to let a bloom whose
          centre sits ON the letter SPILL past the silhouette, the way a packed
          daisy cap overhangs its own stem.
    line  the white line-work — petal separations, eye rings, veins, seed dots.
          This is what gets subtracted.

    letter -> U(letter, spill) -> DIFF(that, line)

The field is generated once per species over an area big enough that any glyph,
shifted by its own seeded offset, samples a different part of it. That is what
stops all 93 glyphs carrying the same three flowers in the same three places.
"""
import math
import os
import pickle
import random

from pathops import Path, LineCap, LineJoin

from geom import U, DIFF, ISECT, circle, ellipse, poly, xform


# ————————————————————————————————————————————————————————— the drawing kit

def stroke_of(path, w, cap=LineCap.ROUND_CAP, join=LineJoin.ROUND_JOIN):
    """The outline of `path` as a filled ring of width w. Skia strokes it; we
    copy first because stroke() mutates in place."""
    p = Path()
    p.addPath(path)
    p.stroke(w / 2.0, cap, join, 4.0)
    # Skia strokes round joins as CONICS, which pathops' own boolean ops refuse
    # to read. Every stroked path has to be converted before it can be unioned,
    # simplified or written to a charstring.
    p.convertConicsToQuads(0.25)
    p.simplify()
    return p


def curve(pts):
    """An OPEN path through a list of (x, y) — straight segments. Meant to be
    handed to stroke_of(), never filled."""
    p = Path()
    pen = p.getPen()
    pen.moveTo(pts[0])
    for q in pts[1:]:
        pen.lineTo(q)
    pen.endPath()
    return p


def bez(p0, c1, c2, p3, n=18):
    """Sample a cubic into a polyline — the spine of every stem and vine."""
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
                    u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1]))
    return out


def lobe(L, W, tipw=0.26, shoulder=0.58, belly=1.0):
    """One petal / leaf, growing from the origin along +Y, symmetric on x.

    tipw   how blunt the tip is — 0.02 is a spear, 0.4 is a rounded paddle
    shoulder  where the widest point sits along the length
    """
    p = Path()
    pen = p.getPen()
    pen.moveTo((0.0, 0.0))
    pen.curveTo((W * 0.80 * belly, L * 0.08), (W * belly, L * shoulder * 0.72), (W * tipw, L * 0.93))
    pen.curveTo((W * tipw * 0.92, L * 1.0), (-W * tipw * 0.92, L * 1.0), (-W * tipw, L * 0.93))
    pen.curveTo((-W * belly, L * shoulder * 0.72), (-W * 0.80 * belly, L * 0.08), (0.0, 0.0))
    pen.closePath()
    return p


def notched_lobe(L, W, notch=0.16):
    """A petal with a cleft tip — what makes a cherry blossom read as a cherry
    blossom and not a generic five-pointed star."""
    base = lobe(L, W, tipw=0.40, shoulder=0.62)
    cut = circle(0.0, L * (1.0 + notch * 0.55), W * notch * 2.6)
    return DIFF(base, cut)


def radial_parts(petal, n, r0=0.0, phase=0.0, jitter=0.0, rng=None):
    """n copies of a petal round the origin, each pushed out r0 from centre —
    returned as a LIST, deliberately, so the caller can outline them one by one."""
    parts = []
    for i in range(n):
        a = phase + 360.0 * i / n + (rng.uniform(-jitter, jitter) if rng and jitter else 0.0)
        ra = math.radians(a)
        parts.append(xform(petal, rot=a - 90, dx=r0 * math.cos(ra), dy=r0 * math.sin(ra)))
    return parts


def radial(petal, n, r0=0.0, phase=0.0, jitter=0.0, rng=None):
    return U(*radial_parts(petal, n, r0, phase, jitter, rng))


def outline_each(parts, w):
    """Outline every part SEPARATELY, then union the outlines.

    This is the difference between a flower and cracked mud, and it cost a whole
    round to see. `stroke_of(U(*petals))` outlines the merged silhouette, so every
    boundary WHERE TWO PETALS OVERLAP disappears and what is left is an irregular
    cell wall round the whole blob. Outlining each petal first keeps its full
    contour, and the overlaps read as petals lying over one another — which is
    exactly what a packed daisy does.
    """
    return U(*[stroke_of(p, w) for p in parts])


# ————————————————————————————————————————————————————————— the species
# Every motif returns (ink, line):
#   ink  — the solid silhouette, for spill past the letter edge
#   line — the white line-work to subtract out of the letter

def _daisy(rng, R=1.0):
    """A packed open daisy: many narrow petals, a seeded eye. Reads at size."""
    n = rng.choice([8, 9, 10, 11])
    L = 120 * R * rng.uniform(0.90, 1.10)
    Wp = L * rng.uniform(0.34, 0.44)
    phase = rng.uniform(0, 360)
    eye_r = L * rng.uniform(0.25, 0.31)
    pet = lobe(L, Wp, tipw=0.48, shoulder=0.64)
    parts = radial_parts(pet, n, r0=eye_r * 0.86, phase=phase,
                         jitter=360.0 / n * 0.12, rng=rng)
    crown = U(*parts)

    ink = U(crown, circle(0, 0, eye_r * 1.04))
    lw = max(7.0, L * 0.065)
    line = U(outline_each(parts, lw),                    # every petal, whole
             stroke_of(circle(0, 0, eye_r), lw * 1.15))  # the eye ring
    seeds = [circle(*_polar(rng.uniform(0, 360), eye_r * rng.uniform(0.18, 0.62)),
                    eye_r * 0.11) for _ in range(rng.randint(3, 4))]
    line = U(line, *seeds)
    return ink, line


def _polar(a, r):
    ra = math.radians(a)
    return r * math.cos(ra), r * math.sin(ra)


def _rosehead(rng, R=1.0):
    """A small spiral rose — three open bands wound off-centre, the way a rose
    is drawn in a millefleur pattern. Concentric rings read as a vinyl record;
    the eccentricity is the whole trick."""
    r = 62 * R * rng.uniform(0.85, 1.18)
    lw = max(9.0, r * 0.22)
    spine = []
    a = rng.uniform(0, 360)
    turns = rng.uniform(2.2, 2.8)
    steps = 46
    for i in range(steps + 1):
        t = i / steps
        ang = math.radians(a + 360 * turns * t)
        rad = r * (0.16 + 0.84 * t)
        ex = r * 0.13 * t          # the spiral drifts off centre as it opens
        spine.append((rad * math.cos(ang) + ex, rad * math.sin(ang) * 0.94))
    line = stroke_of(curve(spine), lw)
    # two outer petals wrapping the head
    for k in range(2):
        aa = a + 200 + k * 120
        line = U(line, stroke_of(xform(_arcspine(r * 1.02, aa, aa + 130), rot=0), lw))
    ink = circle(0, 0, r * 1.05)
    return ink, line


def _arcspine(r, a0, a1, n=16):
    return curve([_polar(a0 + (a1 - a0) * i / n, r) for i in range(n + 1)])


def _leaf(rng, R=1.0, L=None):
    L = L or 130 * R * rng.uniform(0.8, 1.25)
    W = L * rng.uniform(0.30, 0.40)
    lw = max(8.0, L * 0.085)
    body = lobe(L, W, tipw=0.03, shoulder=0.52)
    line = U(stroke_of(body, lw),
             stroke_of(curve([(0, L * 0.05), (0, L * 0.9)]), lw * 0.8))
    veins = []
    for i in range(3):
        t = 0.26 + i * 0.21
        side = 1 if i % 2 == 0 else -1
        veins.append(stroke_of(curve([(0, L * t), (side * W * 0.62, L * (t + 0.16))]), lw * 0.62))
    return body, U(line, *veins)


def _bud(rng, R=1.0):
    L = 74 * R * rng.uniform(0.8, 1.2)
    W = L * 0.52
    lw = max(8.0, L * 0.13)
    cup = lobe(L, W, tipw=0.30, shoulder=0.66)
    line = U(stroke_of(cup, lw),
             stroke_of(curve([(0, L * 0.16), (0, L * 0.74)]), lw * 0.7))
    return cup, line


def _tulip_cup_body(L, Wc):
    """The cup as ONE closed contour: narrow base, wide shoulder, and a top
    edge with three rounded lobes (a tall centre crown flanked by two lower
    ones), like a real tulip head seen from the side. One path, drawn once —
    not a union of overlapping petals, which is what read as a blob before."""
    bw = Wc * 0.16          # base, where the stem meets the cup
    sw = Wc * 0.52           # shoulder — the cup's widest point
    cleft = Wc * 0.30        # half-width of the dip between the lobes
    peak = Wc * 0.48         # half-width of each side lobe's peak

    shoulder_y = L * 0.50
    side_y = L * 0.88
    cleft_y = L * 0.72
    top_y = L * 1.0

    p = Path()
    pen = p.getPen()
    pen.moveTo((0.0, 0.0))
    # right side: base -> shoulder -> side-lobe peak -> cleft -> centre peak
    pen.curveTo((bw * 1.1, L * 0.06), (sw * 0.82, L * 0.24), (sw, shoulder_y))
    pen.curveTo((sw * 1.03, L * 0.66), (peak * 0.92, L * 0.80), (peak, side_y))
    pen.curveTo((peak * 0.70, L * 0.97), (cleft * 1.05, cleft_y + L * 0.03), (cleft, cleft_y))
    pen.curveTo((cleft * 0.55, L * 0.90), (Wc * 0.10, L * 0.97), (0.0, top_y))
    # left side, mirrored
    pen.curveTo((-Wc * 0.10, L * 0.97), (-cleft * 0.55, L * 0.90), (-cleft, cleft_y))
    pen.curveTo((-cleft * 1.05, cleft_y + L * 0.03), (-peak * 0.70, L * 0.97), (-peak, side_y))
    pen.curveTo((-peak * 0.92, L * 0.80), (-sw * 1.03, L * 0.66), (-sw, shoulder_y))
    pen.curveTo((-sw * 0.82, L * 0.24), (-bw * 1.1, L * 0.06), (0.0, 0.0))
    pen.closePath()
    return p


def _tulipcup(rng, R=1.0):
    """A tulip HEAD — the recognisable three-lobed crown cup — on a very short
    stem stub. No leaves baked in here: leaves are a separate, smaller filler
    layer laid down by _leaf in the 'tulip' field spec, the same way the ivy
    and rose cuts layer theirs.

    This is a compact-motif rewrite. A tulip drawn as cup + long stem + leaf is
    tall and narrow (~330u), and a letter is a set of narrow bars ~180u wide —
    almost every plant landed with its cup outside the ink and only a stem/leaf
    fragment inside, which read as scribble. Reducing the motif to essentially
    just the cup, roughly as wide as it is tall (~150-170u total), is what lets
    the whole plant fit inside one stem of a letter instead of getting sliced."""
    L = 150 * R * rng.uniform(0.88, 1.12)
    Wc = L * rng.uniform(0.74, 0.90)      # wide relative to L — a squat head, not a spire
    lw = max(8.0, L * 0.065)

    cup = _tulip_cup_body(L, Wc)

    stem_len = L * rng.uniform(0.16, 0.26)   # a stub, just enough to read "stem"
    stem = curve([(0.0, 0.0), (0.0, -stem_len)])
    stem_lw = lw * 1.1

    line = U(stroke_of(cup, lw), stroke_of(stem, stem_lw))
    ink = U(cup, stroke_of(stem, stem_lw * 2.2))
    return ink, line


def _fivedot(rng, R=1.0):
    """The tiny filler blossom every millefleur pattern is half made of.

    Drawn as an OUTLINE like everything else — this one shipped as a filled
    union once and knocked a solid white blob out of every letter it touched.
    Its stroke has to scale with r or the ring closes up and it is a blob again.
    """
    r = 26 * R * rng.uniform(0.7, 1.35)
    n = rng.choice([5, 5, 6])
    pet = circle(0, 0, r)
    parts = radial_parts(pet, n, r0=r * 1.25, phase=rng.uniform(0, 360))
    crown = U(*parts)
    lw = max(6.0, r * 0.34)
    return crown, U(outline_each(parts, lw), circle(0, 0, r * 0.42))


def _sprig(rng, R=1.0):
    """A stem with leaves — the connective tissue of a damask."""
    L = 300 * R * rng.uniform(0.7, 1.4)
    bend = rng.uniform(-0.55, 0.55)
    spine = bez((0, 0), (L * bend, L * 0.3), (L * bend * 1.5, L * 0.62), (L * bend * 0.5, L))
    lw = max(14.0, L * 0.075)
    line = stroke_of(curve(spine), lw)
    ink = Path()
    ink.addPath(stroke_of(curve(spine), lw * 2.2))
    for t in (0.14, 0.28, 0.42, 0.56, 0.70, 0.84, 0.96):
        i = int(t * (len(spine) - 1))
        px, py = spine[i]
        nx, ny = spine[min(i + 1, len(spine) - 1)]
        ang = math.degrees(math.atan2(ny - py, nx - px))
        side = 1 if int(t * 100) % 2 else -1
        li, ll = _leaf(rng, L=L * rng.uniform(0.20, 0.30))
        rot = ang + side * rng.uniform(48, 74) - 90
        line = U(line, xform(ll, rot=rot, dx=px, dy=py))
        ink = U(ink, xform(li, rot=rot, dx=px, dy=py))
    return ink, line


# ————————————————————————————————————————————————————————— the fields
# Each entry: (motif callables with weights, grid pitch, spill?)

FIELD_W, FIELD_H = 3700, 3300      # big enough that every glyph gets its own slice
FIELD_X0, FIELD_Y0 = -1500, -1300


VARIANTS = 16      # unique drawings per layer, reused across the whole field


def _scatter(rng, pitch, jitter, fn, scale_range, rot=True):
    """Jittered-grid scatter over the whole field. A jittered grid packs far more
    evenly than pure random — pure random clumps and leaves bald patches, which
    at this density reads as a mistake.

    A field holds ~500 blooms per layer, but it only DRAWS sixteen. Drawing a
    fresh flower per grid cell means ~500 stroke-and-union passes over a
    self-intersecting union of nine petals, which is what took nine minutes a
    field; sixteen drawings reused at random rotation and scale is visually
    identical at this density and costs almost nothing, because placing one is a
    pure coordinate transform with no boolean op in it. This is what a type
    designer does by hand anyway — a handful of drawings, repeated.
    """
    lib = [fn(rng, rng.uniform(*scale_range)) for _ in range(VARIANTS)]
    inks, lines, centres = [], [], []
    nx = int(FIELD_W / pitch) + 2
    ny = int(FIELD_H / pitch) + 2
    for gy in range(ny):
        for gx in range(nx):
            cx = FIELD_X0 + gx * pitch + rng.uniform(-jitter, jitter) * pitch
            cy = FIELD_Y0 + gy * pitch + rng.uniform(-jitter, jitter) * pitch
            ink, line = lib[rng.randrange(VARIANTS)]
            a = rng.uniform(0, 360) if rot else 0.0
            s = rng.uniform(0.86, 1.16)       # a little size variety on top
            inks.append(xform(ink, sx=s, sy=s, rot=a, dx=cx, dy=cy))
            lines.append(xform(line, sx=s, sy=s, rot=a, dx=cx, dy=cy))
            centres.append((cx, cy))
    return inks, lines, centres


def _mix(rng, specs):
    """specs = [(fn, pitch, jitter, scale_range)] — several layers overlaid."""
    inks, lines, centres = [], [], []
    for fn, pitch, jitter, sr in specs:
        i, l, c = _scatter(rng, pitch, jitter, fn, sr)
        inks += i
        lines += l
        centres += c
    return inks, lines, centres


def _build_field(fam):
    rng = random.Random({'daisy': 11, 'floral': 23, 'tulip': 37, 'ivy': 53}[fam])
    if fam == 'daisy':
        # a single layer of big daisies, spaced enough to keep the letter black
        specs = [(_daisy, 380, 0.26, (1.00, 1.30))]
        spill = True
    elif fam == 'floral':
        # millefleur: roses, leaves and tiny five-dot fillers, fine and dense
        specs = [(_rosehead, 260, 0.32, (0.95, 1.30)),
                 (_leaf, 190, 0.36, (0.70, 1.05)),
                 (_fivedot, 165, 0.40, (0.75, 1.30))]
        spill = False
    elif fam == 'tulip':
        # compact tulip HEADS, packed tight enough that letters actually
        # carry them (density benchmarked against daisy/ivy), plus a smaller
        # leaf layer as filler between the cups — same recipe rows 2 and 4 use
        specs = [(_tulipcup, 165, 0.26, (0.95, 1.18)),
                 (_leaf, 215, 0.40, (0.45, 0.72))]
        spill = True
    else:  # ivy — a Morris vine damask, edge to edge, no spill
        specs = [(_sprig, 330, 0.28, (0.80, 1.15)),
                 (_leaf, 175, 0.38, (0.65, 1.05)),
                 (_fivedot, 210, 0.42, (0.60, 1.00))]
        spill = False
    inks, lines, centres = _mix(rng, specs)
    return {'ink': inks, 'line': lines, 'centre': centres, 'spill': spill}


_FIELDS = {}

# ————————————————————————————————————————————————————————— the cache
# Generating a field is ~1000 motifs of stroke-and-union, which is the slow part
# of the whole build. It is also completely deterministic, so it is cached to
# disk as raw verb/point lists. Delete out/fields/ to force a redraw.

def _freeze(p):
    return [(v, [list(pt) for pt in pts]) for v, pts in p]


def _thaw(data):
    p = Path()
    pen = p.getPen()
    for v, pts in data:
        pts = [tuple(pt) for pt in pts]
        if v == 0:
            pen.moveTo(pts[0])
        elif v == 1:
            pen.lineTo(pts[0])
        elif v == 2:
            pen.qCurveTo(pts[0], pts[1])
        elif v == 4:
            pen.curveTo(pts[0], pts[1], pts[2])
        elif v == 5:
            pen.closePath()
    return p


def _cache_path(fam):
    here = os.path.dirname(os.path.abspath(__file__))
    d = os.path.join(here, 'out', 'fields')
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, f'{fam}.pickle')


# ————————————————————————————————————————————————————————— tiling
# A glyph touches ~100 motifs. Unioning those 100 paths per glyph, for 93 glyphs
# across 4 cuts, is ~37,000 boolean ops and by far the slowest thing in the
# build. So the line-work is pre-unioned ONCE into a grid of tiles: a glyph then
# unions the ~12 tiles it overlaps instead of 100 loose motifs.
#
# The other half of the trick is in floral.py — it moves the GLYPH into field
# space rather than moving the field to the glyph, because a letter is a handful
# of contours and the field is tens of thousands.

TILE = 340.0


def _tile_lines(lines):
    """Cut the whole field's line-work into tiles that TILE THE PLANE EXACTLY.

    A motif goes into every tile its bounding box touches, and each tile's union
    is then clipped to the tile's own rectangle. That matters for speed, not
    tidiness: if tiles merely *contain* the motifs filed under them they overhang
    unpredictably, so a glyph has to pad its query by a whole tile all round and
    ends up pushing eight times its own area of pattern through every boolean op.
    Clipped tiles mean a glyph asks for exactly the tiles it overlaps.
    """
    buckets = {}
    for line in lines:
        x0, y0, x1, y1 = line.bounds
        for gx in range(int(math.floor(x0 / TILE)), int(math.floor(x1 / TILE)) + 1):
            for gy in range(int(math.floor(y0 / TILE)), int(math.floor(y1 / TILE)) + 1):
                buckets.setdefault((gx, gy), []).append(line)
    out = {}
    for (gx, gy), v in buckets.items():
        cell = poly([(gx * TILE, gy * TILE), ((gx + 1) * TILE, gy * TILE),
                     ((gx + 1) * TILE, (gy + 1) * TILE), (gx * TILE, (gy + 1) * TILE)])
        out[(gx, gy)] = ISECT(U(*v), cell)
    return out


def field(fam):
    if fam in _FIELDS:
        return _FIELDS[fam]
    cp = _cache_path(fam)
    if os.path.exists(cp):
        with open(cp, 'rb') as fh:
            raw = pickle.load(fh)
        f = {'ink': [_thaw(d) for d in raw['ink']],
             'tiles': {k: _thaw(v) for k, v in raw['tiles'].items()},
             'centre': raw['centre'], 'spill': raw['spill']}
    else:
        f = _build_field(fam)
        f['tiles'] = _tile_lines(f.pop('line'))
        with open(cp, 'wb') as fh:
            pickle.dump({'ink': [_freeze(p) for p in f['ink']],
                         'tiles': {k: _freeze(v) for k, v in f['tiles'].items()},
                         'centre': f['centre'], 'spill': f['spill']}, fh)
    _FIELDS[fam] = f
    return f
