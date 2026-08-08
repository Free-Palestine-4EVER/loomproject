"""The planted cuts — the same skeleton with a garden cut out of it.

The rule that makes this work, and that the first three versions of this file got
wrong: **a flower is drawn by subtracting its OUTLINE, not its body.** Subtract a
solid bloom and it eats the stem, so you can only afford two or three per letter
and the result reads as stickers. Subtract the line-work — petal separations, eye
rings, veins — and the letter keeps most of its ink, so the field can run edge to
edge at full density and the letter is still black and still legible.

    letter  ->  U(letter, spill)  ->  DIFF(that, line-work)

`spill` is the solid silhouette of any bloom whose centre lands ON the letter. It
is what lets a packed daisy overhang the stem it grew out of, instead of being
guillotined flat along the silhouette.

The field itself lives in garden.py: one big scatter per species, generated once,
sampled at a different seeded offset per glyph so no two letters carry the same
arrangement.
"""
import hashlib
import math

from geom import U, DIFF, ISECT, xform
import garden

# How far past its own silhouette a letter is allowed to bloom, in units. Big
# enough to read as an overhang, small enough that O's counter stays a counter.
# Ref 1 spills about 12% of the cap height and no more; past that the silhouette
# stops being a silhouette and the word stops being a word.
SPILL_CAP = {'daisy': 70.0, 'tulip': 0.0, 'floral': 0.0, 'ivy': 0.0}

# The RIM: a band of solid ink round the whole silhouette that no flower may cut
# into. This is the single device that makes refs 3 and 4 legible at size — the
# letter keeps an unbroken outline and the garden lives strictly inside it.
# The two spilling cuts carry a thinner rim, because a bloom that overhangs the
# edge has to be allowed to break it here and there or the overhang reads as a
# sticker sitting on top of the letter rather than growing out of it.
RIM = {'floral': 26.0, 'ivy': 24.0, 'daisy': 15.0, 'tulip': 26.0,
       'bloom': 20.0, 'hollow': 0.0, 'grow': 18.0}

SPILL_CAP.update({'bloom': 56.0, 'hollow': 0.0, 'grow': 0.0})

# HOW each cut treats the letter. This is what makes the four new cuts four
# different styles rather than four densities of one idea — 'field' alone can
# only ever vary how busy a letter is.
#
#   field    solid letter, garden cut into it, solid rim round the silhouette.
#            The four original cuts, and WILD.
#   hollow   the letter is reduced to an OUTLINE and the garden fills the space
#            inside it — the letter reads as a container, not a shape.
#   grow     the garden fills the letter from the baseline up to a wavy line
#            partway up, and the letter is solid above it — flowers growing up
#            the letters rather than covering them.
#
# An 'inline' mode was tried and cut: a band narrow enough to leave a solid core
# inside a 178-unit stem is ~44 units, and no flower survives being sliced to 44
# units. It read as distressed texture, not as flowers. The lesson is that a
# style only works if its region is big enough to hold a WHOLE bloom.
MODE = {'hollow': 'hollow', 'grow': 'grow'}

# hollow: how thick the letter's own outline is left
HOLLOW_W = 40.0
# grow: how far up the letter the garden reaches, and how much the boundary
# waves. A ruler-straight cut reads as a mistake; the wave reads as planting.
GROW_UP, GROW_WAVE = 0.56, 52.0


def _offset(name, fam):
    """A stable per-glyph slice of the field. Seeded off the glyph name so a
    rebuild is reproducible and A never inherits B's flowers."""
    h = hashlib.md5(f'{fam}/{name}'.encode()).digest()
    return (int.from_bytes(h[0:4], 'big') % 2400) - 1200, \
           (int.from_bytes(h[4:8], 'big') % 1900) - 950


def decorate(name, path, advance=None, body=None, fam='floral'):
    f = garden.field(fam)
    dx, dy = _offset(name, fam)

    # Move the LETTER into field space, not the field to the letter: a glyph is
    # a handful of contours and the field is tens of thousands, so this is the
    # difference between a four-minute build and an hour-long one.
    g = xform(path, dx=-dx, dy=-dy)
    x0, y0, x1, y1 = g.bounds

    cap = SPILL_CAP.get(fam, 0.0)
    lines = _tiles_over(f, x0, y0, x1, y1)
    spills = []
    if cap:
        for ink, (cx, cy) in zip(f['ink'], f['centre']):
            if x0 <= cx <= x1 and y0 <= cy <= y1 and g.contains((cx, cy)):
                spills.append(ink)

    mode = MODE.get(fam, 'field')

    if mode == 'hollow':
        # The letter becomes its own outline, and the garden fills the space it
        # encloses. The band is cut from the SOLID letter rather than stroked
        # round it, so the outer silhouette is still exactly the approved one.
        inner = _core(g, HOLLOW_W)
        out = DIFF(g, inner)
        if lines:
            out = U(out, ISECT(lines, _core(inner, 16.0)))
        return xform(out, dx=dx, dy=dy)

    if mode == 'grow':
        # The garden rises from the baseline to a wavy line partway up; above it
        # the letter is untouched. The wave is seeded off the glyph so no two
        # letters break at the same height.
        out = g
        if lines:
            top = y0 + (y1 - y0) * GROW_UP
            band = _wave(x0 - 80, y0 - 90, x1 + 80, top, GROW_WAVE, dx + dy)
            out = DIFF(out, ISECT(ISECT(lines, band), _core(g, 18.0)))
        return xform(out, dx=dx, dy=dy)

    out = g
    if spills:
        # clip the spill to a halo so a bloom on the rim of O cannot wander into
        # the counter and close it
        out = U(out, ISECT(U(*spills), _halo(g, cap)))
    if lines:
        # and clip the line-work to the ERODED letter, so the rim survives
        out = DIFF(out, ISECT(lines, _core(out, RIM.get(fam, 20.0))))
    return xform(out, dx=dx, dy=dy)


def _wave(x0, y0, x1, top, amp, seed):
    """A rectangle whose TOP edge is a sine wave — the planting line for `grow`."""
    pts = [(x0, y0)]
    n = 48
    ph = (seed % 360) * math.pi / 180.0
    for i in range(n + 1):
        t = i / n
        x = x0 + (x1 - x0) * t
        pts.append((x, top + amp * math.sin(ph + t * 5.4) + amp * 0.45 * math.sin(ph * 1.7 + t * 11.0)))
    pts.append((x1, y0))
    from geom import poly
    return poly(pts)


def _tiles_over(f, x0, y0, x1, y1):
    """The union of the pre-unioned field tiles covering this box. No padding is
    needed — garden._tile_lines clips each tile to its own rectangle, so the
    tiles cover the plane exactly and nothing overhangs the one it is filed
    under."""
    t = garden.TILE
    got = []
    for gx in range(int(math.floor(x0 / t)), int(math.floor(x1 / t)) + 1):
        for gy in range(int(math.floor(y0 / t)), int(math.floor(y1 / t)) + 1):
            tile = f['tiles'].get((gx, gy))
            if tile is not None:
                got.append(tile)
    return U(*got) if got else None


def _halo(path, r, n=24):
    """The letter dilated by r — the letter plus a band r wide all round it.

    Done by unioning n copies of the letter pushed out in a ring of directions,
    NOT by stroking the outline. Stroking is the obvious way and it is wrong at
    this radius: the letter's own concave corners make a stroke that wide
    self-intersect, and simplifying that leaves rectangular slabs of stray ink,
    which the line-work pass then bites back out — the ragged square notches
    that appeared along the top of every daisy letter. Offset copies cannot
    self-intersect. (The erosion in _core stays a stroke: at RIM widths it is
    well under the radius where this bites.)
    """
    parts = [path]
    for i in range(n):
        a = 2 * math.pi * i / n
        parts.append(xform(path, dx=r * math.cos(a), dy=r * math.sin(a)))
    return U(*parts)


def _core(path, r):
    """The letter ERODED by r — everything more than r inside the edge. Taking
    the outline's own stroke away from the letter is a true erosion, and it eats
    the counters' inner edges too, which is what we want: the rim runs round the
    hole in an O as well as round its outside."""
    if r <= 0:
        return path
    return DIFF(path, garden.stroke_of(path, r * 2.0))
