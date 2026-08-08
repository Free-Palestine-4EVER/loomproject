# The garden brief — what "good" means for the planted cuts

Working file for the rebuild of LOOM Bloom's four floral cuts. Read this before
touching `garden.py` or `floral.py`.

## The client's actual complaint

The shipped cuts (v1–v5) place **three flowers per letter** at measured anchor
points. At text size that reads as three stickers dropped on a stem, and the
client called it exactly that. Four reference faces were supplied — they are in
`type/refs/`:

| File | What it is | What to take from it |
|---|---|---|
| `ref1-daisy-packed.png` | "FLOWERS", packed daisies | Blooms **touch and overlap**, cover the letter edge to edge, and **spill past the silhouette**. Petals are fat and rounded, separated by clean WHITE OUTLINES. |
| `ref2-sakura.png` | "SAKURA KEI", cherry blossom | Blossoms knocked out of the letter **white and solid**, plus loose petals **scattered outside** the letters. |
| `ref3-millefleur.png` | "FLORAL", outline letters | The letter keeps a **solid unbroken rim**; the pattern lives strictly INSIDE it. Fine, small, dense: little roses, leaves, dots. |
| `ref4-morris-vine.png` | "FLOWERS IN OUR SOUL" | A continuous **Morris damask vine** running edge to edge, dense enough to have no bald patches, still perfectly legible. |

## The two rules the client stated

1. **The letterform does not change.** LOOM Bloom's condensed brutal grotesque
   skeleton in `glyphs.py` is finished and approved. *"the font style and the
   flowers are 2 different things — we need flowers on the same letters style."*
   Nothing in `glyphs.py` may be edited. Only the flowers change.
2. **Four different flowers**, one per cut, each clearly its own species.

## The architecture that replaced the anchors

`garden.py` builds ONE big scatter per species — a jittered grid of motifs over a
3700 × 3300 area, cached to `out/fields/<fam>.pickle`. `floral.py` samples it at a
seeded per-glyph offset so no two letters carry the same arrangement.

Every motif returns **`(ink, line)`**:

- **`ink`** — the solid silhouette. Used ONLY for spill: a bloom whose centre
  lands on the letter may overhang the silhouette (ref 1 / ref 2 behaviour).
- **`line`** — the white line-work that gets **subtracted**: petal separations,
  eye rings, veins, seed dots.

```
letter -> U(letter, spill) -> DIFF(that, line-work)
```

### THE rule, and the one that keeps getting broken

**`line` must always be LINE-WORK, never a filled body.** Subtracting a solid
bloom eats the stem — that is the original bug in a new costume. Subtracting the
bloom's *outline* draws it while the letter keeps ~85% of its ink.

The trap: `stroke_of(shape, w)` **fills the shape solid** when `w` is close to or
greater than the shape's narrow dimension. A 26-unit petal stroked at 10 is a
ring; the same petal stroked at 24 is a white blob. Any motif whose parts are
small must scale its stroke width down with them, and every motif must be checked
on the contact sheet, not reasoned about.

## Legibility — non-negotiable

The word has to read as a word at 40 px. Two devices, both in the references:

- **The rim.** Refs 3 and 4 keep a solid band of ink round the whole silhouette
  and put the pattern only inside it. `floral.py` erodes the letter and clips the
  line-work to that, so no flower can chew the outer edge into lace.
- **Spill is a garnish, not the look.** Ref 1 spills maybe 12% of the cap height.
  More than that and the silhouette dissolves.

## How to check your work

```bash
cd type
python3 sheet.py            # every motif, isolated and large — drawing bugs
python3 proof.py FLOWERS    # the real word in all four cuts -> out/PROOF.png
```

**Look at the PNGs.** Both of them, every time, before claiming anything. The
field cache is in `out/fields/` — delete it after editing any motif or you will
be looking at the previous drawing.

`proof.py` draws the same skia paths `build.py` puts in the font, so if it looks
right there it is right. Full font build is `python3 build.py` (~4 min).
