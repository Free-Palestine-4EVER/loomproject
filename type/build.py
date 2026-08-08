"""Build the LOOM Bloom family: OTF (CFF), TTF and WOFF2, plain + Floral.

    python3 build.py            # -> out/LOOMBloom-*.{otf,ttf,woff2}

Outlines come from glyphs.py as skia paths; this file only turns them into a
font. Both styles share one metric set, so text set in Regular and in Floral
lines up character for character.
"""
import os
import shutil
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.feaLib.builder import addOpenTypeFeatures
from fontTools.misc.timeTools import timestampNow

import glyphs as G
from floral import decorate
from geom import xform
import svgart

VERSION = "1.200"
UPM = G.UPM
ASC, DESC = 900, -200   # accents live between 746 and 900
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
    # the second family: same six approved species, four different TREATMENTS of
    # the letter (see floral.MODE) rather than four densities of one idea
    ('bloom', 'LOOM Bloom Wild', 'LOOMBloomWild-Regular'),
    ('hollow', 'LOOM Bloom Hollow', 'LOOMBloomHollow-Regular'),
    ('grow', 'LOOM Bloom Meadow', 'LOOMBloomMeadow-Regular'),
]

SPECIES = {
    'bloom': 'every species, packed, spilling past the letter',
    'hollow': 'the letter as an outline, the garden inside it',
    'grow': 'flowers rising from the baseline to a wavy line',
    'floral': 'line-drawn roses and anemones',
    'daisy': 'flat open blossoms',
    'tulip': 'tulip cups, buds and berry sprigs',
    'ivy': 'leaf sprigs — no bloom',
}

# A fat display face is nothing without these — the diagonals and the round
# right-hand sides leave holes big enough to drive a truck through.
KERN = """
languagesystem DFLT dflt;
languagesystem latn dflt;

@ROUND   = [C G O Q S U zero six eight nine Ccaron Cacute Ccedilla Scaron
            Oacute Ograve Ocircumflex Odieresis Otilde Uacute Ugrave
            Ucircumflex Udieresis];
@FLAT    = [B D E F H I K L M N P R Dcroat];
@UP      = [A V W Y Aacute Agrave Acircumflex Adieresis Atilde Aring Yacute];
@STOP    = [period comma colon semicolon];
@QUOTE   = [quotesingle quotedbl];

feature kern {
  # the diagonals — the biggest holes in a condensed face
  pos A V -78; pos V A -78; pos A W -64; pos W A -64;
  pos A Y -88; pos Y A -88; pos A T -92; pos T A -92;
  pos V Y -32; pos Y V -32; pos W Y -30; pos Y W -30;
  pos L T -96; pos L V -92; pos L W -80; pos L Y -98; pos L Yacute -98;

  # flat-to-round and round-to-flat: a straight stem beside a curve needs less
  pos @FLAT @ROUND -16;
  pos @ROUND @FLAT -16;
  pos @ROUND @ROUND -22;
  pos @UP @ROUND -34;
  pos @ROUND @UP -34;

  # the arms
  pos T @ROUND -44; pos T @UP -46;
  pos F @UP -58; pos P @UP -58; pos K @ROUND -30; pos R @UP -26;
  pos F A -60; pos P A -60; pos R V -28; pos R Y -34; pos R W -22;
  pos B @UP -20; pos D @UP -22; pos E @UP -8; pos H @UP -6;

  # punctuation — the classic gaps
  pos T @STOP -120; pos V @STOP -92; pos W @STOP -76; pos Y @STOP -106;
  pos F @STOP -92; pos P @STOP -92; pos L @QUOTE -80; pos A @QUOTE -34;
  pos @ROUND @STOP -26;
  pos @QUOTE A -34;

  # figures
  pos one one -30; pos seven four -34; pos two four -22; pos four one -20;
  pos seven @STOP -70; pos one @STOP -30;
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
    """Replay a skia path into a charstring pen, as CUBICS ONLY.

    The line-work in the planted cuts is Skia STROKE output, and Skia strokes
    round joins as conics, which garden.stroke_of turns into QUADS. A CFF
    charstring has no quadratic operator, so every quad has to be widened to its
    exact cubic equivalent here — an earlier version of this function simply had
    no branch for verb 2 and dropped those segments on the floor, which corrupts
    the outline silently and looks like a drawing bug three steps downstream.
    """
    open_ = False
    cur = (0.0, 0.0)
    for verb, pts in path:
        if verb == 0:
            if open_:
                pen.closePath()
            pen.moveTo(pts[0])
            cur = pts[0]
            open_ = True
        elif verb == 1:
            pen.lineTo(pts[0])
            cur = pts[0]
        elif verb == 2:
            # a quadratic is exactly the cubic with its controls at 2/3 of the way
            # from each endpoint toward the quad's single control point
            q, end = pts[0], pts[1]
            pen.curveTo((cur[0] + 2.0 / 3.0 * (q[0] - cur[0]), cur[1] + 2.0 / 3.0 * (q[1] - cur[1])),
                        (end[0] + 2.0 / 3.0 * (q[0] - end[0]), end[1] + 2.0 / 3.0 * (q[1] - end[1])),
                        end)
            cur = end
        elif verb == 4:
            pen.curveTo(pts[0], pts[1], pts[2])
            cur = pts[2]
        elif verb == 5:
            pen.closePath()
            open_ = False
        else:
            raise ValueError(f'_draw cannot replay verb {verb} — a conic reached '
                             'the charstring; convertConicsToQuads was skipped')
    if open_:
        pen.closePath()


_COLLECTED = {}


def collect(fam):
    """glyph name -> (path or None, advance). `fam` is None for the plain cut.

    Memoised per cut: every cut is written three times (OTF, TTF, WOFF2) and
    decorating a planted cut is minutes of boolean ops, so without this the
    garden is grown three times over for identical output.
    """
    if fam in _COLLECTED:
        return _COLLECTED[fam]
    base = G.build_glyphs()
    out = {'.notdef': (None, 600), 'space': (None, 300)}
    for name, (path, adv) in base.items():
        if fam:
            path = decorate(name, path, adv, fam=fam)
        out[name] = (path, adv)
    for name, _cp, kind in ORNAMENTS:
        art = svgart.motif(fam or 'floral', kind, 620.0)
        src = art if art is not None else xform(G.ornament(kind, fam or 'floral'), sx=1.35, sy=1.35)
        out[name] = (xform(src, dx=380, dy=G.CAP * 0.50), 760)
    _COLLECTED[fam] = out
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
    # `python3 build.py rose ivy` rebuilds just those cuts — one cut is ~2 min,
    # the whole family is ~10, and most edits only touch one species.
    only = {a.lower() for a in sys.argv[1:] if not a.startswith('-')}
    for fam, family, ps_name in CUTS:
        # the rose cut's internal family name is 'floral'; accept either
        keys = {(fam or 'regular'), 'rose' if fam == 'floral' else (fam or 'regular')}
        if only and not (keys & only):
            continue
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
