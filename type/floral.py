"""The decorated cuts — the same skeleton with a garden cut out of it.

The motif is *subtracted* from the letter, never added, so anything that spills
past the edge of a stem simply disappears into the page.

Where the flowers go is not hand-guessed: place.py samples each glyph, measures
how far every point is from the nearest edge, and hands back the middle of each
thick part of the letter together with the clearance it has. A flower is then
sized to that clearance — a fat bowl gets a big bloom, a narrow bar gets a small
one, and anything too thin to hold a flower gets none.

Four species share the same anchors: roses (`floral`), daisies, tulips and ivy.
"""
from geom import DIFF, xform
from glyphs import CAP, motif_single
import place

_ANCHORS = None

# the single motif is ~150 units across at scale 1, so scale = clearance / this
FIT = 168.0
MIN_SCALE, MAX_SCALE = 0.30, 1.05

# per-species trim — a daisy carries further than a tulip at the same scale
FAM_SCALE = {'floral': 1.0, 'daisy': 0.92, 'tulip': 1.04, 'ivy': 1.0}


def anchors():
    global _ANCHORS
    if _ANCHORS is None:
        _ANCHORS = place.build()
    return _ANCHORS


def decorate(name, path, advance=None, body=None, fam='floral'):
    """Cut this cut's motif out of one glyph, one flower per measured spot."""
    spots = anchors().get(name) or []
    if not spots:
        return path
    fs = FAM_SCALE.get(fam, 1.0)
    out = path
    for i, s in enumerate(spots):
        scale = max(MIN_SCALE, min(MAX_SCALE, s['clear'] / FIT)) * fs
        motif = xform(motif_single(i, fam), sx=scale, sy=scale,
                      rot=(i * 47) % 360, dx=s['x'], dy=s['y'])
        out = DIFF(out, motif)
    return out
