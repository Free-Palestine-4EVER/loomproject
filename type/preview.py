"""Render a contact sheet of the raw glyph paths to SVG (QA loop, not shipped)."""
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import RecordingPen

import glyphs as G
from geom import DIFF


class _Rec(RecordingPen):
    pass


def path_to_d(path, dx=0, dy=0, flip=True):
    pen = SVGPathPen(None)
    for verb, pts in path:
        f = lambda p: (p[0] + dx, (-p[1] if flip else p[1]) + dy)
        if verb == 0:
            pen.moveTo(f(pts[0]))
        elif verb == 1:
            pen.lineTo(f(pts[0]))
        elif verb == 4:
            pen.curveTo(f(pts[0]), f(pts[1]), f(pts[2]))
        elif verb == 5:
            pen.closePath()
    return pen.getCommands()


def sheet(out, floral=False, cols=10, cell=760):
    gl = G.build_glyphs()
    order = ([c for c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'] +
             list(G.FIGURES.keys()) + list(G.PUNCT.keys()))
    rows = (len(order) + cols - 1) // cols
    Wd, Ht = cols * cell, rows * cell
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{Wd//2}" height="{Ht//2}" viewBox="0 0 {Wd} {Ht}">',
             f'<rect width="{Wd}" height="{Ht}" fill="#fff"/>']
    for i, name in enumerate(order):
        path, adv = gl[name]
        if floral:
            from floral import decorate
            path = decorate(name, path)
        cx = (i % cols) * cell + (cell - adv) / 2 + G.SB
        cy = (i // cols) * cell + cell * 0.78
        parts.append(f'<rect x="{(i%cols)*cell}" y="{(i//cols)*cell}" width="{cell}" height="{cell}" fill="none" stroke="#eee"/>')
        parts.append(f'<path d="{path_to_d(path, cx, cy)}" fill="#111"/>')
    parts.append('</svg>')
    open(out, 'w').write('\n'.join(parts))
    print('wrote', out)


def words(out, text='LOOM BLOOM', floral=False, size=760):
    gl = G.build_glyphs()
    x = 60
    parts = []
    for ch in text:
        if ch == ' ':
            x += 300
            continue
        name = G.CMAP.get(ord(ch))
        if not name:
            continue
        path, adv = gl[name]
        if floral:
            from floral import decorate
            path = decorate(name, path)
        parts.append(f'<path d="{path_to_d(path, x + G.SB, 800)}" fill="#111"/>')
        x += adv
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{(x+60)//2}" height="550" '
           f'viewBox="0 0 {x+60} 1100"><rect width="{x+60}" height="1100" fill="#fff"/>'
           + ''.join(parts) + '</svg>')
    open(out, 'w').write(svg)
    print('wrote', out)


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'sheet'
    floral = '--floral' in sys.argv
    if mode == 'sheet':
        sheet('out/sheet.svg' if not floral else 'out/sheet-floral.svg', floral)
    else:
        txt = sys.argv[2] if len(sys.argv) > 2 else 'LOOM BLOOM'
        words('out/word.svg' if not floral else 'out/word-floral.svg', txt, floral)
