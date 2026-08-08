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
import svgart

_ANCHORS = None

# The ornaments are real public-domain artwork (see svgart.ART and
# svg/sources.json), normalised to 300 units across, so their half-size is 150.
# A spot with clearance C should carry art of roughly that half-size.
ART_TARGET = 300.0
FIT = 178.0
MIN_SCALE, MAX_SCALE = 0.32, 1.0

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
        art = svgart.motif(fam, i, ART_TARGET)
        base = art if art is not None else motif_single(i, fam)
        motif = xform(base, sx=scale, sy=scale, rot=(i * 23) % 360,
                      dx=s['x'], dy=s['y'])
        out = DIFF(out, motif)
    return out
