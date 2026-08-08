"""Motif contact sheet — every species in garden.py, isolated and large, so a
drawing bug (line-work that is secretly a filled body) shows up as a picture,
not as reasoning about code.

    python3 sheet.py    ->  out/SHEET.png
"""
import random

from PIL import Image, ImageDraw, ImageFont

from geom import xform
from proof import draw_path, _flatten, _area
import garden as G

SEED = 4242
CELL = 220          # px per cell (line-work cell and knockout cell)
GUTTER = 14
LABEL_W = 170        # left margin for the row label
ROW_PAD = 10

MOTIFS = [G._daisy, G._rosehead, G._leaf, G._bud, G._tulipcup, G._fivedot, G._sprig]

# R ranges actually used per species in garden.py's _build_field() specs —
# read off every (fn, pitch, jitter, scale_range) entry that calls this fn.
R_RANGES = {
    '_daisy': (0.52, 1.35),      # daisy field: (1.05,1.35) + (0.52,0.78)
    '_rosehead': (0.95, 1.30),   # floral field
    '_leaf': (0.65, 1.10),       # floral/tulip/ivy fields combined
    '_bud': (0.75, 1.15),        # tulip field
    '_tulipcup': (0.95, 1.25),   # tulip field
    '_fivedot': (0.60, 1.30),    # floral/ivy fields combined
    '_sprig': (0.85, 1.25),      # ivy field
}

N_PER_ROW = 6


def _bounds(path):
    x0, y0, x1, y1 = path.bounds
    return x0, y0, x1, y1


def _fit_scale(bounds, cell, pad=0.10):
    x0, y0, x1, y1 = bounds
    w, h = max(x1 - x0, 1e-3), max(y1 - y0, 1e-3)
    avail = cell * (1 - 2 * pad)
    return avail / max(w, h)


def _ink_ratio(im):
    hist = im.histogram()
    black = sum(hist[:128])
    total = sum(hist)
    return black / total if total else 0.0


def _positioned(path, bounds, scale, cell):
    """Recentre + scale `path` (font units) so `bounds` lands centred in a
    cell x cell square."""
    x0, y0, x1, y1 = bounds
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    return xform(path, sx=scale, sy=scale, dx=-cx * scale, dy=-cy * scale)


def _cell_image(path, bounds, scale, cell):
    """Cell A: `path` filled black on white — reuses proof.py's draw_path,
    which already knows how to fill a pathops Path with holes handled (it
    assumes contours nest at most 2 deep: outer + simple holes, which holds
    for a motif's own union'd `line`/`ink` path)."""
    im = Image.new('L', (cell, cell), 255)
    dr = ImageDraw.Draw(im)
    p = _positioned(path, bounds, scale, cell)
    import proof as PF
    old_scale = PF.SCALE
    PF.SCALE = 1.0
    try:
        draw_path(dr, p, cell / 2.0, cell / 2.0, cell)
    finally:
        PF.SCALE = old_scale
    return im


def _knockout_image(line, bounds, scale, cell):
    """Cell B: the motif as it appears cut out of solid ink — a black cell
    with `line`'s own shape painted white on top.

    Deliberately NOT `DIFF(black_square, line)` run through pathops: that
    booleans a big square against `line`'s many overlapping stroke contours
    and routinely produces nesting deeper than 2, which is more than
    draw_path's outer/hole rule can read (verified: it silently miscounts
    stray positive-area fragments as extra outers). Painting `line` directly
    on a pre-filled black canvas uses the same 2-level nesting `line` already
    satisfies when drawn alone in cell A, so it's the robust way to render
    the same idea.
    """
    im = Image.new('L', (cell, cell), 0)
    dr = ImageDraw.Draw(im)
    p = _positioned(line, bounds, scale, cell)
    from pathops import Path
    pp = Path()
    pp.addPath(p)
    pp.simplify()
    polys = []
    for c in pp.contours:
        pts = _flatten(c)
        if len(pts) >= 3:
            polys.append((_area(pts), pts))
    if polys:
        sign = 1.0 if max(polys, key=lambda a: abs(a[0]))[0] > 0 else -1.0
        outers = [pts for a, pts in polys if a * sign > 0]
        holes = [pts for a, pts in polys if a * sign < 0]
        for pts in outers:
            dr.polygon([(cell / 2 + x, cell / 2 - y) for x, y in pts], fill=255)
        for pts in holes:
            dr.polygon([(cell / 2 + x, cell / 2 - y) for x, y in pts], fill=0)
    return im


def main():
    rows = len(MOTIFS)
    W = LABEL_W + N_PER_ROW * (2 * CELL + GUTTER) + GUTTER
    H = rows * (CELL + ROW_PAD * 2)
    sheet = Image.new('L', (W, H), 255)
    dr = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    print(f'{"motif":10s} {"#":>2s}  R      bounds (units)                  cellB ink')
    for r, fn in enumerate(MOTIFS):
        name = fn.__name__
        lo, hi = R_RANGES[name]
        rng = random.Random(SEED + r)   # per-row fixed seed -> reproducible
        row_y = r * (CELL + ROW_PAD * 2) + ROW_PAD
        dr.text((4, row_y + CELL / 2 - 6), name, fill=0, font=font)

        for i in range(N_PER_ROW):
            R = lo + (hi - lo) * i / (N_PER_ROW - 1)
            ink, line = fn(rng, R)

            ox = LABEL_W + i * (2 * CELL + GUTTER)

            # cell A — the line-work alone
            b_line = _bounds(line)
            s_line = _fit_scale(b_line, CELL)
            im_a = _cell_image(line, b_line, s_line, CELL)
            sheet.paste(im_a, (ox, row_y))

            # cell B — the motif knocked out of solid ink: black cell, `line`
            # painted white on top, same framing as cell A (fit to line's own
            # bounds, no extra square/pad needed since the whole cell is ink)
            im_b = _knockout_image(line, b_line, s_line, CELL)
            sheet.paste(im_b, (ox + CELL + GUTTER, row_y))

            x0, y0, x1, y1 = b_line
            ratio_b = _ink_ratio(im_b)
            flag = ' SOLID?' if ratio_b < 0.45 else ''
            print(f'{name:10s} {i:2d}  R={R:.2f}  bounds=({x0:7.1f},{y0:7.1f},{x1:7.1f},{y1:7.1f})'
                  f'  cellB_ink={ratio_b:.3f}{flag}')

    sheet.save('out/SHEET.png')
    print('->', 'out/SHEET.png', sheet.size)


if __name__ == '__main__':
    main()
