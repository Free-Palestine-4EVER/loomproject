"""Work out where a flower can actually go on each letter.

Sample the glyph into a coarse mask, run a distance-to-edge transform, then take
the best-separated maxima: those are the points furthest from any edge, i.e. the
middle of every thick part of the letter. Each one gets a flower sized to the
clearance the transform measured, so a fat bowl gets a big bloom and a thin bar
gets a small one — nothing is ever dropped on a stem too narrow to hold it.

Cached to out/anchors.json; delete that file to force a recompute.
"""
import json
import os

import numpy as np

import glyphs as G

CELL = 13.0
MAXSPOTS = 3   # real ornament is dense; four of them buries the letterform
MIN_CLEAR = 3.0          # cells — below this the area is too thin for a flower


def _mask(path, body):
    xs = np.arange(CELL / 2, body, CELL)
    ys = np.arange(-30 + CELL / 2, G.CAP + 60, CELL)
    m = np.zeros((len(ys), len(xs)), dtype=bool)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            m[j, i] = path.contains((float(x), float(y)))
    return m, xs, ys


def _distance(m):
    """How many erosions each cell survives = its clearance, in cells."""
    d = np.zeros(m.shape, dtype=np.int16)
    cur = m.copy()
    while cur.any():
        d += cur
        e = np.zeros_like(cur)
        e[1:-1, 1:-1] = (cur[1:-1, 1:-1] & cur[:-2, 1:-1] & cur[2:, 1:-1]
                         & cur[1:-1, :-2] & cur[1:-1, 2:])
        cur = e
    return d


def spots_for(path, body):
    m, xs, ys = _mask(path, body)
    if not m.any():
        return []
    d = _distance(m).astype(float)
    out = []
    for _ in range(MAXSPOTS):
        j, i = np.unravel_index(np.argmax(d), d.shape)
        clear = d[j, i]
        if clear < MIN_CLEAR:
            break
        out.append({'x': float(xs[i]), 'y': float(ys[j]), 'clear': float(clear * CELL)})
        # blank a disc around the spot so the next one lands somewhere else
        r = max(2.6, clear * 1.9)
        jj, ii = np.ogrid[:d.shape[0], :d.shape[1]]
        d[((jj - j) ** 2 + (ii - i) ** 2) <= r * r] = 0
    return out


def build(force=False):
    here = os.path.dirname(os.path.abspath(__file__))
    cache = os.path.join(here, 'out', 'anchors.json')
    if os.path.exists(cache) and not force:
        return json.load(open(cache))
    base = G.build_glyphs()
    table = {}
    for name, (path, adv) in base.items():
        body = adv
        table[name] = spots_for(path, body)
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    json.dump(table, open(cache, 'w'))
    return table


if __name__ == '__main__':
    t = build(force=True)
    n = sum(len(v) for v in t.values())
    print(f'{len(t)} glyphs, {n} anchors, {n / max(1, len(t)):.1f} per glyph')
    for k in ('A', 'B', 'O', 'I', 'M', 'period'):
        if k in t:
            print(k, [(round(s['x']), round(s['y']), round(s['clear'])) for s in t[k]])
