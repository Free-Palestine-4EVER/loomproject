"""Build the LOOM Bloom family: OTF (CFF), TTF and WOFF2, plain + Floral.

    python3 build.py            # -> out/LOOMBloom-*.{otf,ttf,woff2}

Outlines come from glyphs.py as skia paths; this file only turns them into a
font. Both styles share one metric set, so text set in Regular and in Floral
lines up character for character.
"""
import os
import shutil

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.feaLib.builder import addOpenTypeFeatures
from fontTools.misc.timeTools import timestampNow

import glyphs as G
from floral import decorate
from geom import xform

VERSION = "1.000"
UPM = G.UPM
ASC, DESC = 800, -200
YEAR = 2026
VENDOR = "LOOM"
DESIGNER = "LOOM (Amman × Sarajevo)"
URL = "https://loomstudio-jo.com"

ORNAMENTS = [("floret", 0x2740, 0), ("bloom", 0x273F, 1), ("sprig", 0x2766, 2)]

# The family: one plain cut, and four planted ones. Each decorated cut carries a
# different species, drawn by glyphs.ornament(kind, fam).
CUTS = [
    (None, 'LOOM Bloom', 'LOOMBloom-Regular'),
    ('floral', 'LOOM Bloom Rose', 'LOOMBloomRose-Regular'),
    ('daisy', 'LOOM Bloom Daisy', 'LOOMBloomDaisy-Regular'),
    ('tulip', 'LOOM Bloom Tulip', 'LOOMBloomTulip-Regular'),
    ('ivy', 'LOOM Bloom Ivy', 'LOOMBloomIvy-Regular'),
]

SPECIES = {
    'floral': 'roses, leaves and a curling vine',
    'daisy': 'twelve-petal daisies and sprigs',
    'tulip': 'tulips on their necks, with long leaves',
    'ivy': 'trailing ivy — leaves and tendrils, no bloom',
}

# A fat display face is nothing without these — the diagonals and the round
# right-hand sides leave holes big enough to drive a truck through.
KERN = """
languagesystem DFLT dflt;
languagesystem latn dflt;
feature kern {
  pos A V -70; pos V A -70; pos A W -55; pos W A -55;
  pos A Y -75; pos Y A -75; pos A T -80; pos T A -80;
  pos L T -85; pos L V -80; pos L W -70; pos L Y -85;
  pos T O -35; pos T C -35; pos T G -35;
  pos P A -55; pos F A -55; pos V O -25; pos W O -20;
  pos Y O -30; pos O V -25; pos O W -20; pos O Y -30; pos O X -20;
  pos R V -20; pos R Y -25; pos K O -25; pos K C -25;
  pos T period -110; pos T comma -110;
  pos V period -80; pos V comma -80;
  pos W period -65; pos W comma -65;
  pos Y period -95; pos Y comma -95;
  pos F period -80; pos F comma -80;
  pos P period -80; pos P comma -80;
  pos L quotesingle -70; pos L quotedbl -70;
} kern;
"""


def to_charstring(path, advance):
    pen = T2CharStringPen(advance, None)
    _draw(path, pen)
    return pen.getCharString()


def to_ttglyph(path, glyph_set):
    pen = TTGlyphPen(glyph_set)
    _draw(path, Cu2QuPen(pen, max_err=0.6))
    return pen.glyph()


def _draw(path, pen):
    open_ = False
    for verb, pts in path:
        if verb == 0:
            if open_:
                pen.closePath()
            pen.moveTo(pts[0])
            open_ = True
        elif verb == 1:
            pen.lineTo(pts[0])
        elif verb == 4:
            pen.curveTo(pts[0], pts[1], pts[2])
        elif verb == 5:
            pen.closePath()
            open_ = False
    if open_:
        pen.closePath()


def collect(fam):
    """glyph name -> (path or None, advance). `fam` is None for the plain cut."""
    base = G.build_glyphs()
    out = {'.notdef': (None, 600), 'space': (None, 300)}
    for name, (path, adv) in base.items():
        if fam:
            path = decorate(name, path, adv, fam=fam)
        out[name] = (path, adv)
    for name, _cp, kind in ORNAMENTS:
        orn = xform(G.ornament(kind, fam or 'floral'), sx=1.35, sy=1.35,
                    dx=440, dy=G.CAP * 0.50)
        out[name] = (orn, 880)
    return out


def cmap_for():
    cm = dict(G.CMAP)
    cm[0x20] = 'space'
    cm[0xA0] = 'space'
    for name, cp, _k in ORNAMENTS:
        cm[cp] = name
    return cm


def build(fam=None, family='LOOM Bloom', ps_name='LOOMBloom-Regular', fmt='otf'):
    gl = collect(fam)
    order = ['.notdef', 'space'] + [n for n in gl if n not in ('.notdef', 'space')]

    fb = FontBuilder(UPM, isTTF=(fmt == 'ttf'))
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap_for())
    advances = {n: (int(round(gl[n][1])), 0) for n in order}

    if fmt == 'ttf':
        glyf = {}
        for n in order:
            path, _adv = gl[n]
            glyf[n] = to_ttglyph(path, None) if path is not None else TTGlyphPen(None).glyph()
        fb.setupGlyf(glyf)
    else:
        cs = {}
        for n in order:
            path, adv = gl[n]
            pen = T2CharStringPen(int(round(adv)), None)
            if path is not None:
                _draw(path, pen)
            cs[n] = pen.getCharString()
        fb.setupCFF(ps_name, {
            'FullName': family + ' Regular',
            'FamilyName': family,
            'Weight': 'Regular',
            'version': VERSION,
            'Notice': f'© {YEAR} LOOM. Free for personal and commercial use.',
        }, cs, {})

    fb.setupHorizontalMetrics(advances)
    fb.setupHorizontalHeader(ascent=ASC, descent=DESC, lineGap=0)
    fb.setupNameTable({
        'familyName': family,
        'styleName': 'Regular',
        'uniqueFontIdentifier': f'{ps_name};{VERSION};{YEAR}',
        'fullName': family + ' Regular',
        'psName': ps_name,
        'version': 'Version ' + VERSION,
        'copyright': f'© {YEAR} LOOM. Free for personal and commercial use.',
        'designer': DESIGNER,
        'description': ('A condensed brutal display face — flat terminals, mitred '
                        'joins, one corner radius — drawn from scratch for LOOM.'
                        + (' This cut carries ' + SPECIES[fam] + ' cut out of the '
                           'letterforms.' if fam else '')),
        'manufacturer': 'LOOM',
        'vendorURL': URL,
        'designerURL': URL,
        'licenseDescription': ('Free to use, embed and modify for personal and '
                               'commercial work. Do not resell the font files '
                               'themselves.'),
        'sampleText': 'LOOM BLOOM',
        'typographicFamily': family,
        'typographicSubfamily': 'Regular',
    })
    fb.setupOS2(sTypoAscender=ASC, sTypoDescender=DESC, sTypoLineGap=0,
                usWinAscent=ASC + 60, usWinDescent=-DESC,
                sCapHeight=G.CAP, sxHeight=int(G.CAP * 0.72),
                achVendID='LOOM', fsType=0, usWeightClass=800, usWidthClass=5,
                panose=dict(bFamilyType=2, bSerifStyle=11, bWeight=9,
                            bProportion=4, bContrast=0, bStrokeVariation=0,
                            bArmStyle=0, bLetterForm=0, bMidline=0, bXHeight=0))
    fb.setupPost(isFixedPitch=0, underlinePosition=-120, underlineThickness=90)
    fb.font['head'].created = fb.font['head'].modified = timestampNow()
    if fmt == 'ttf':
        fb.setupDummyDSIG()
    addOpenTypeFeatures(fb.font, _fea_path(), tables=['GPOS', 'GSUB'])
    return fb, ps_name


_FEA = None


def _fea_path():
    global _FEA
    if _FEA is None:
        _FEA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'kern.fea')
        open(_FEA, 'w').write(KERN)
    return _FEA


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, 'out')
    os.makedirs(out, exist_ok=True)
    made = []
    for fam, family, ps_name in CUTS:
        for fmt in ('otf', 'ttf'):
            fb, ps = build(fam, family, ps_name, fmt)
            p = os.path.join(out, f'{ps}.{fmt}')
            fb.save(p)
            made.append(p)
            if fmt == 'ttf':   # woff2 compresses the quadratic build smaller
                fb.font.flavor = 'woff2'
                w = os.path.join(out, f'{ps}.woff2')
                fb.font.save(w)
                made.append(w)
    for p in made:
        print(f'{os.path.basename(p):38s} {os.path.getsize(p)/1024:7.1f} KB')


if __name__ == '__main__':
    main()
