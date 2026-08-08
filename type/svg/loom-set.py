"""Regenerate the LOOM flower set in `raw/` from the client's four bitmaps.

The bitmaps are the originals the studio supplied; the crops below are the
motifs picked out of them. Re-run after replacing a source image:

    cd type/svg && python3 loom-set.py

Anything it writes is named `loom-*.svg`; the older public-domain files in
`raw/` are untouched.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import raster  # noqa: E402

SRC = os.path.join(HERE, 'src')
RAW = os.path.join(HERE, 'raw')

SHEET = os.path.join(SRC, 'flowers-solid.jpeg')     # seven flat flowers
LINE = os.path.join(SRC, 'roses-line.png')          # rose + anemone sprays
SWIRL = os.path.join(SRC, 'swirl-flower.png')       # five-petal outline

# name, source, crop (x0,y0,x1,y1), options
SET = [
    # ——— rose: open line-work, fattened so it survives being cut from a stem
    ('loom-rose-bloom',    LINE,  (136,   4, 258, 104), dict(fatten=5, eps=2.2, longest=640)),
    ('loom-rose-anemone',  LINE,  (248, 258, 370, 368), dict(fatten=5, eps=2.2, longest=640)),
    ('loom-rose-leafspray', LINE, (238,  10, 352,  74), dict(fatten=5, eps=2.2, longest=640)),

    # ——— daisy: flat blossoms, heads only (a stem reads as a slash in a letter)
    ('loom-daisy-open',    SHEET, (370,  45, 491, 156), dict()),
    ('loom-daisy-ring',    SHEET, ( 75,  37, 177, 141), dict()),
    ('loom-daisy-swirl',   SWIRL, None,                 dict(fatten=2, eps=1.2)),

    # ——— tulip: cups and buds
    ('loom-tulip-cup',     SHEET, (223,  38, 327, 152), dict()),
    ('loom-tulip-bud',     SHEET, (400, 309, 483, 388), dict()),
    ('loom-tulip-berry',   SHEET, (232, 150, 327, 276), dict()),

    # ——— ivy: leaf sprigs
    ('loom-ivy-heart',     SHEET, (199, 309, 278, 512), dict()),
    ('loom-ivy-branch',    SHEET, (293, 309, 376, 512), dict()),
    ('loom-ivy-sprig',     SHEET, ( 78, 150, 180, 279), dict()),
]


def main():
    os.makedirs(RAW, exist_ok=True)
    for name, src, crop, opt in SET:
        d, size, n = raster.trace(src, crop, **opt)
        if not d:
            print('EMPTY', name); continue
        raster.write_svg(os.path.join(RAW, name + '.svg'), d, size)
        print(f'{name:22} {size[0]:5.0f}x{size[1]:<5.0f} {n:4d} points')


if __name__ == '__main__':
    main()
