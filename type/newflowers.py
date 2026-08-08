"""Candidate flowers — drawn for approval, NOT wired into any cut.

Nothing in here is imported by garden.py, floral.py or build.py. It exists so a
species can be drawn, looked at, and said yes or no to BEFORE it costs a font
build. Once a candidate is approved it gets moved into garden.py and given a
cut.

Every candidate returns `line` — the white line-work that will be subtracted out
of the letter — in the same idiom as garden.py's species, and is judged the same
two ways:

    python3 flowersheet.py      -> out/NEWFLOWERS.png

    the PORTRAIT   one bloom, large, white on black. Is it a good drawing?
    the SWATCH     the same bloom scattered at letter scale. Does it hold up as
                   a texture, which is the only way it is ever actually seen?

The second one is the real test. Plenty of flowers that are lovely at 400 units
turn to grey mush at 150, and the swatch is where that shows.
"""
import math
import random

from geom import U, DIFF, circle, ellipse
from garden import (stroke_of, curve, bez, lobe, radial_parts, outline_each,
                    outline_stacked, _polar, xform, _stamens, _ruffle,
                    sakura, poppy, sunflower, forgetmenot, anemone, hibiscus)


# ————————————————————————————————————————————————————————— helpers












def wildrose(rng, size=180):
    """Five plain rounded petals — the dog-rose. The simplest flower there is."""
    R = size / 2
    pet = lobe(R * 0.92, R * 0.56, tipw=0.54, shoulder=0.70, belly=1.14)
    parts = radial_parts(pet, 5, r0=R * 0.17, phase=rng.uniform(0, 72))
    lw = max(8.0, R * 0.105)
    return U(outline_stacked(parts, lw),
             stroke_of(circle(0, 0, R * 0.20), lw),
             _stamens(11, R * 0.33, lw * 0.55))


def chrysanth(rng, size=210):
    """Three rings of thin petals, each ring turned off the last."""
    R = size / 2
    lw = max(6.0, R * 0.075)
    rings = []
    for k, (rad, n, ln) in enumerate([(0.30, 8, 0.44), (0.52, 12, 0.40), (0.72, 16, 0.34)]):
        pet = lobe(R * ln, R * 0.10, tipw=0.40, shoulder=0.56)
        rings.append(outline_each(
            radial_parts(pet, n, r0=R * rad, phase=k * 13 + rng.uniform(0, 20)), lw))
    return U(*rings, circle(0, 0, R * 0.12))


def carnation(rng, size=185):
    """A frilled cup — all edge, no face."""
    R = size / 2
    lw = max(8.0, R * 0.10)
    return U(_ruffle(R * 0.88, 9, 0.13, lw, phase=rng.uniform(0, 40)),
             _ruffle(R * 0.58, 7, 0.15, lw * 0.85, phase=rng.uniform(0, 40)),
             _ruffle(R * 0.30, 5, 0.18, lw * 0.7),
             stroke_of(curve([(0, -R * 0.86), (0, -R * 0.34)]), lw))




def thistle(rng, size=200):
    """A crosshatched bulb under a splayed tuft.

    The first version fanned every filament from ONE point, which reads as a
    shell or a palm frond, not a thistle. Two things fix it: the filaments start
    spread across the top of the bulb rather than from a single origin, and they
    splay outwards instead of running parallel.
    """
    R = size / 2
    lw = max(7.0, R * 0.085)
    bulb = ellipse(0, -R * 0.42, R * 0.40, R * 0.30)
    # the criss-cross scales on the bulb — the thistle's real tell
    scales = []
    for k in range(-2, 3):
        for sgn in (1, -1):
            scales.append(stroke_of(curve([(k * R * 0.15 - sgn * R * 0.16, -R * 0.70),
                                           (k * R * 0.15 + sgn * R * 0.16, -R * 0.16)]), lw * 0.5))
    scales = [DIFF(sc, DIFF(ellipse(0, -R * 0.42, R * 0.44, R * 0.34),
                            ellipse(0, -R * 0.42, R * 0.36, R * 0.26))) for sc in scales]
    tuft = []
    for i in range(11):
        t = (i - 5) / 5.0
        x0 = t * R * 0.30                     # spread along the top of the bulb
        tip = (t * R * 0.86 + rng.uniform(-0.05, 0.05) * R, R * (0.80 - abs(t) * 0.26))
        tuft.append(stroke_of(curve(bez((x0, -R * 0.16), (x0 * 1.2, R * 0.22),
                                        (tip[0] * 0.7, R * 0.52), tip, 10)), lw * 0.5))
    return U(stroke_of(bulb, lw), *scales, *tuft)


def lily(rng, size=215):
    """Six pointed tepals and long stamens — the trumpet flower."""
    R = size / 2
    pet = lobe(R * 0.96, R * 0.34, tipw=0.10, shoulder=0.60)
    parts = radial_parts(pet, 6, r0=R * 0.10, phase=rng.uniform(0, 60))
    lw = max(7.0, R * 0.09)
    ribs = [stroke_of(curve([(0, 0), _polar(a, R * 0.78)]), lw * 0.5)
            for a in range(0, 360, 60)]
    return U(outline_stacked(parts, lw), *ribs,
             _stamens(6, R * 0.52, lw * 0.55, phase=22))




def cosmos(rng, size=200):
    """Eight broad petals with notched, squared-off tips."""
    R = size / 2
    L, W = R * 0.86, R * 0.40
    pet = lobe(L, W, tipw=0.86, shoulder=0.72)
    pet = DIFF(pet, circle(0, L * 1.06, W * 0.26))
    parts = radial_parts(pet, 8, r0=R * 0.20, phase=rng.uniform(0, 45))
    lw = max(7.0, R * 0.095)
    return U(outline_stacked(parts, lw),
             stroke_of(circle(0, 0, R * 0.20), lw),
             _stamens(8, R * 0.15, lw * 0.5, tip=False))


def lavender(rng, size=215):
    """A vertical spike of florets — the only candidate that is not radial, which
    is exactly why it is here: it gives a field a direction.

    The first version stacked the florets on the same axis, so they piled into a
    blob on a stick. They now alternate to left and right of the stem with clear
    air between, and the outlines are occluded so overlaps do not show.
    """
    R = size / 2
    lw = max(7.0, R * 0.095)
    spine = bez((0, -R), (R * 0.12, -R * 0.52), (-R * 0.12, R * 0.02), (0, R * 0.40), 14)
    stem = stroke_of(curve(spine), lw)
    florets = []
    for i in range(9):
        t = i / 8.0
        y = -R * 0.34 + t * R * 1.16
        w = R * 0.34 * (1.0 - 0.42 * t)
        side = -1 if i % 2 else 1
        florets.append(xform(lobe(w * 1.7, w, tipw=0.42, shoulder=0.66),
                             rot=side * 46 - 6, dx=side * R * 0.13, dy=y))
    leaves = [xform(lobe(R * 0.40, R * 0.10, tipw=0.05), rot=s * 26, dx=s * R * 0.05, dy=-R * 0.90)
              for s in (1, -1)]
    return U(stem, outline_stacked(florets, lw), outline_each(leaves, lw * 0.9))


def peony(rng, size=205):
    """A ruffled ball — layered, heavy, no visible centre."""
    R = size / 2
    lw = max(7.0, R * 0.085)
    return U(_ruffle(R * 0.92, 8, 0.10, lw, phase=rng.uniform(0, 45)),
             _ruffle(R * 0.68, 6, 0.13, lw, phase=rng.uniform(0, 60)),
             _ruffle(R * 0.44, 5, 0.16, lw * 0.9, phase=rng.uniform(0, 72)),
             _ruffle(R * 0.22, 4, 0.20, lw * 0.8))


def clover(rng, size=175):
    """Three heart leaves round a short stem — the meadow filler.

    The first version cut the heart notch with a circle big enough to eat half
    the leaf, so each one came out a crescent, and hung a bloom off one corner
    that unbalanced the whole thing. Smaller notch, no bloom, and a pale crease
    down each leaf instead.
    """
    R = size / 2
    lw = max(7.0, R * 0.10)
    leaf = DIFF(lobe(R * 0.78, R * 0.42, tipw=0.70, shoulder=0.78),
                circle(0, R * 0.88, R * 0.20))
    phase = rng.uniform(0, 120)
    parts = radial_parts(leaf, 3, r0=R * 0.02, phase=phase)
    creases = [stroke_of(curve([(0, 0), _polar(phase + 120 * k + 90, R * 0.56)]), lw * 0.5)
               for k in range(3)]
    stem = stroke_of(curve(bez((0, 0), (R * 0.10, -R * 0.30), (-R * 0.08, -R * 0.58),
                               (R * 0.02, -R * 0.92), 8)), lw * 0.8)
    return U(outline_stacked(parts, lw), *creases, stem)




def marigold(rng, size=195):
    """Dense short ruffled petals, packed tight — the busiest of the set."""
    R = size / 2
    lw = max(6.0, R * 0.075)
    rings = []
    for k, (rad, n, ln, w) in enumerate([(0.72, 14, 0.30, 0.13),
                                         (0.50, 11, 0.28, 0.14),
                                         (0.28, 8, 0.26, 0.15)]):
        pet = lobe(R * ln, R * w, tipw=0.82, shoulder=0.74)
        rings.append(outline_each(
            radial_parts(pet, n, r0=R * rad, phase=k * 17 + rng.uniform(0, 25)), lw))
    return U(*rings, circle(0, 0, R * 0.10))


CANDIDATES = [
    ('SAKURA', 'cherry blossom — five cleft petals, stamen burst', sakura),
    ('POPPY', 'four crumpled petals, heavy seed head', poppy),
    ('SUNFLOWER', 'narrow rays round a real phyllotaxis disc', sunflower),
    ('WILD ROSE', 'the dog-rose — five plain rounded petals', wildrose),
    ('CHRYSANTH', 'three rings of thin petals, each turned off the last', chrysanth),
    ('CARNATION', 'a frilled cup — all edge, no face', carnation),
    ('FORGET-ME-NOT', 'a cluster of tiny blooms — a spray, not one flower', forgetmenot),
    ('THISTLE', 'spiked bract under a tuft — unmistakable silhouette', thistle),
    ('LILY', 'six pointed tepals, long stamens', lily),
    ('ANEMONE', 'broad petals round a very dark dense eye', anemone),
    ('COSMOS', 'eight broad petals, notched square tips', cosmos),
    ('LAVENDER', 'a vertical spike — the only one that is not radial', lavender),
    ('PEONY', 'a ruffled ball, layered, no visible centre', peony),
    ('CLOVER', 'three heart leaves and a round bloom', clover),
    ('HIBISCUS', 'five overlapping petals, long protruding style', hibiscus),
    ('MARIGOLD', 'dense short ruffled petals, packed tight', marigold),
]
