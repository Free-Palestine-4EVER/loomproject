"""Contact sheet of the candidate flowers — for yes/no BEFORE any font build.

    python3 flowersheet.py        -> out/NEWFLOWERS.png

Every candidate is shown twice, because a flower has to pass two different tests
and passing one says nothing about the other:

  PORTRAIT  one bloom, large, white on black — is it a good drawing?
  SWATCH    the same bloom scattered at the size it actually appears inside a
            letter — does it hold up as a texture, or turn to grey mush?

White on black throughout, because that is how it is seen: the line-work is
subtracted OUT of a black letter, so white line on black IS the deliverable, and
judging it black-on-white flatters drawings that will not survive.
"""
import os
import random

from PIL import Image, ImageDraw, ImageOps, ImageFont

import proof
from geom import U
from garden import xform
from newflowers import CANDIDATES

COLS = 4
CARD_W, CARD_H = 620, 610
PORTRAIT = 360
SWATCH_H = 150
PAD = 26
BG = 12          # the card ground: not pure black, so the sheet has some air


def _font(size, bold=False):
    for p in ('/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else
              '/System/Library/Fonts/Supplemental/Arial.ttf',
              '/System/Library/Fonts/Helvetica.ttc'):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default()


def _tile(path, w, h, scale, ox, oy):
    """Render a path white-on-black. proof.draw_path only paints black-on-white,
    so draw it that way and invert the tile — cheaper and less error-prone than
    a second painter that would drift out of step with the first."""
    im = Image.new('L', (w, h), 255)
    dr = ImageDraw.Draw(im)
    old = proof.SCALE
    proof.SCALE = scale
    try:
        proof.draw_path(dr, path, ox, oy, h)
    finally:
        proof.SCALE = old
    return ImageOps.invert(im)


def portrait(fn, seed):
    rng = random.Random(seed)
    p = fn(rng)
    x0, y0, x1, y1 = p.bounds
    s = (PORTRAIT - 40) / max(x1 - x0, y1 - y0)
    ox = PORTRAIT / 2 - (x0 + x1) / 2 * s
    oy = PORTRAIT / 2 + (y0 + y1) / 2 * s      # draw_path measures y up from oy
    return _tile(p, PORTRAIT, PORTRAIT, s, ox, oy)


def swatch(fn, seed, w=CARD_W - PAD * 2, h=SWATCH_H):
    """The bloom at the size it really appears in a letter: LOOM Bloom's cap is
    700 units, so a 180-unit flower is about a quarter of the cap. Scaled here so
    the strip reads as a piece of a letter, not as a poster."""
    rng = random.Random(seed + 991)
    lib = [fn(rng) for _ in range(5)]
    scale = h / 620.0                     # ~1/4 of a 700-unit cap across the strip
    pitch = 210.0
    parts = []
    for gy in range(-1, int(620 / pitch) + 2):
        for gx in range(-1, int(w / scale / pitch) + 2):
            cx = gx * pitch + rng.uniform(-0.3, 0.3) * pitch
            cy = gy * pitch + rng.uniform(-0.3, 0.3) * pitch
            parts.append(xform(lib[rng.randrange(len(lib))],
                               rot=rng.uniform(0, 360), dx=cx, dy=cy))
    return _tile(U(*parts), w, h, scale, 0, 0)


def main():
    rows = (len(CANDIDATES) + COLS - 1) // COLS
    W = COLS * CARD_W + PAD
    H = rows * CARD_H + PAD + 96
    sheet = Image.new('L', (W, H), BG)
    dr = ImageDraw.Draw(sheet)

    f_title = _font(30, bold=True)
    f_num = _font(20, bold=True)
    f_name = _font(21, bold=True)
    f_desc = _font(15)
    f_lab = _font(12, bold=True)

    dr.text((PAD + 12, 26), 'CANDIDATE FLOWERS  —  say yes or no, then they go in the font',
            font=f_title, fill=235)
    dr.text((PAD + 12, 64), 'white on black is how they are actually seen: the line-work is cut OUT of the letter.'
                            '  left = one bloom large,  below = the same bloom at letter size.',
            font=f_desc, fill=130)

    for i, (name, desc, fn) in enumerate(CANDIDATES):
        cx = PAD + (i % COLS) * CARD_W
        cy = 96 + (i // COLS) * CARD_H
        dr.text((cx + 4, cy + 4), f'{i + 1:02d}', font=f_num, fill=225)
        dr.text((cx + 40, cy + 5), name, font=f_name, fill=235)
        dr.text((cx + 4, cy + 32), desc, font=f_desc, fill=125)

        sheet.paste(portrait(fn, 100 + i), (cx + 4, cy + 58))
        dr.text((cx + PORTRAIT + 18, cy + 58), 'AT LETTER SIZE', font=f_lab, fill=120)
        sw = swatch(fn, 200 + i, w=CARD_W - PORTRAIT - 40, h=PORTRAIT - 24)
        sheet.paste(sw, (cx + PORTRAIT + 18, cy + 80))

    out = 'out/NEWFLOWERS.png'
    sheet.save(out)
    print('->', out, sheet.size)


if __name__ == '__main__':
    main()
