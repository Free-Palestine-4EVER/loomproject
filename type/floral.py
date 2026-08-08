"""The decorated cuts — the same skeleton with a garden cut out of it.

The motif is *subtracted* from the letter, never added, so anything that spills
past the edge of a stem simply disappears into the page. That is why an anchor
never has to be checked against the outline: an overhanging petal cannot leave a
stray blob behind, only a smaller flower — which is also why the generic EXTRA
spots below are safe on every letter.

Four species share one anchor table: roses (`floral`), daisies, tulips and ivy.
"""
from geom import DIFF, xform
from glyphs import CAP, SB, ornament

# name -> [(x fraction of body, y fraction of cap, scale, rotation, motif)]
ANCHORS = {
    'A': [(0.50, 0.84, 0.60, -8, 0), (0.22, 0.16, 0.44, 168, 2)],
    'B': [(0.20, 0.87, 0.62, 0, 0), (0.66, 0.16, 0.50, 160, 2)],
    'C': [(0.56, 0.92, 0.57, 12, 1), (0.30, 0.14, 0.44, 186, 2)],
    'D': [(0.16, 0.86, 0.70, 0, 0), (0.76, 0.14, 0.56, 170, 2)],
    'E': [(0.60, 0.88, 0.67, 8, 0), (0.24, 0.14, 0.44, 178, 1)],
    'F': [(0.58, 0.88, 0.67, 8, 1), (0.20, 0.20, 0.42, 176, 2)],
    'G': [(0.54, 0.92, 0.57, 12, 0), (0.24, 0.16, 0.44, 184, 2)],
    'H': [(0.16, 0.84, 0.67, 0, 0), (0.84, 0.20, 0.58, 175, 2)],
    'I': [(0.50, 0.80, 0.54, 0, 1), (0.50, 0.20, 0.40, 180, 2)],
    'J': [(0.78, 0.86, 0.62, 6, 0), (0.24, 0.12, 0.42, 190, 1)],
    'K': [(0.16, 0.86, 0.67, 0, 0), (0.78, 0.16, 0.54, 170, 2)],
    'L': [(0.16, 0.86, 0.67, 0, 0), (0.72, 0.10, 0.58, 176, 1)],
    'M': [(0.14, 0.84, 0.67, 0, 0), (0.86, 0.22, 0.58, 172, 2)],
    'N': [(0.16, 0.86, 0.67, 0, 0), (0.84, 0.18, 0.58, 172, 1)],
    'O': [(0.42, 0.93, 0.54, 14, 0), (0.58, 0.08, 0.46, 190, 2)],
    'P': [(0.16, 0.86, 0.67, 0, 0), (0.24, 0.16, 0.56, 165, 2)],
    'Q': [(0.42, 0.93, 0.54, 14, 0), (0.60, 0.10, 0.44, 188, 1)],
    'R': [(0.16, 0.86, 0.67, 0, 0), (0.80, 0.16, 0.54, 168, 2)],
    'S': [(0.60, 0.90, 0.50, 10, 1), (0.34, 0.12, 0.44, 190, 2)],
    'T': [(0.50, 0.92, 0.67, 0, 0), (0.50, 0.16, 0.54, 178, 2)],
    'U': [(0.14, 0.84, 0.62, 0, 0), (0.86, 0.80, 0.58, 8, 2)],
    'V': [(0.16, 0.88, 0.62, 0, 0), (0.80, 0.84, 0.48, 14, 2)],
    'W': [(0.12, 0.86, 0.62, 0, 0), (0.88, 0.86, 0.58, 6, 2)],
    'X': [(0.18, 0.88, 0.62, 0, 0), (0.82, 0.14, 0.54, 172, 2)],
    'Y': [(0.16, 0.88, 0.62, 0, 0), (0.84, 0.88, 0.54, 8, 1)],
    'Z': [(0.60, 0.92, 0.62, 6, 0), (0.36, 0.10, 0.54, 176, 2)],
}

# Every glyph also gets these, which is what turns a decorated letter into a
# planted one. They are generic on purpose: whatever lands on a counter or off
# the edge is simply never cut.
EXTRA = [
    (0.34, 0.48, 0.40, 26, 1),
    (0.82, 0.56, 0.36, -138, 2),
    (0.62, 0.36, 0.33, 96, 0),
]

DEFAULT = [(0.50, 0.86, 0.46, 6, 1), (0.50, 0.20, 0.38, 184, 2)]

# per-species size trim — a daisy carries further than a tulip at the same scale
FAM_SCALE = {'floral': 1.0, 'daisy': 0.94, 'tulip': 1.06, 'ivy': 1.0}


def decorate(name, path, advance=None, body=None, fam='floral'):
    """Cut this cut's motif out of one glyph."""
    spots = ANCHORS.get(name, DEFAULT) + EXTRA
    if body is None:
        body = (advance - 2 * SB) if advance else 600
    fs = FAM_SCALE.get(fam, 1.0)
    out = path
    for i, (fx, fy, s, rot, kind) in enumerate(spots):
        motif = xform(ornament((kind + i) % 3, fam), sx=s * fs, sy=s * fs,
                      rot=rot, dx=fx * body, dy=fy * CAP)
        out = DIFF(out, motif)
    return out
