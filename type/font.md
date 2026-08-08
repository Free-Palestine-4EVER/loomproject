# How to put flowers in a font

The method, written down after doing it wrong five times and right once. This is
about LOOM Bloom, but nothing here is specific to it — it applies to any face
that has to carry ornament inside the letterform.

If you read one thing, read **The three rules**. Everything else is detail.

---

## The problem

You want letters that are made of flowers. The obvious approach — draw a nice
flower, work out where it should sit on each letter, and cut it out — produces
something that looks like stickers dropped on a stem. Five versions of this
typeface shipped that way before a client said so in plain words.

The reason is arithmetic, not taste. **A solid bloom subtracted from a letter
eats the letter.** A 178-unit stem can afford maybe three small holes before it
stops being a stem, so an anchor-placement approach is structurally limited to
three flowers per letter, and three flowers per letter always reads as three
flowers stuck on a letter.

Every reference face that does this well does two things instead, and neither of
them is "place a flower carefully".

---

## The three rules

### 1. Subtract the flower's OUTLINE, not its body

This is the whole unlock. A filled bloom removes its entire area from the
letter. Its **outline** — a stroke a few units wide — removes maybe 15% of that,
and draws the same flower.

Because it costs so little ink, you are no longer rationing. The flowers stop
being placed and become a **field**: a continuous scatter covering the whole
letter edge to edge, clipped by the letterform. That is what the references are
doing, and it is why they look dense and still read.

```
letter  ->  DIFF(letter, line-work)
```

### 2. Outline every petal SEPARATELY

`stroke_of(union_of_petals)` outlines the merged silhouette. Every boundary
where two petals overlap disappears, and what is left is an irregular cell wall
round a blob — it reads as cracked mud, not a flower.

Outline each petal on its own and union the outlines. Now the overlaps read as
petals lying over one another, which is what a flower is.

For a bloom with **few broad petals** (four, five, six), go one further and
occlude: cut each petal's outline back by the union of the petals drawn on top
of it, so the flower has a front and a back. Without this, a five-petal bloom is
a tangle of crossing loops — every arc that should be hidden is visible.

```python
for i, petal in enumerate(parts):
    ring = stroke_of(petal, w)
    if i + 1 < len(parts):
        ring = DIFF(ring, U(*parts[i + 1:]))   # hidden by what lies on top
```

### 3. Leave a solid RIM

Erode the letter, and clip the line-work to what survives. That leaves an
unbroken band of ink round the whole silhouette — including round the inside of
an O's counter — that no flower may cut into.

This single device is what keeps the word a word at text size. Without it, the
flowers chew the outer edge into lace and the letter dissolves.

---

## Judging it

Two renders, and you need both. Neither one tells you what the other does.

**The motif, isolated and large** (`sheet.py`). Is it a good drawing? Does it
read as the flower it claims to be?

**The word, at size** (`proof.py`). Does the letter survive? A flower that is
lovely at 400 units routinely turns to grey mush at 150, and a field that looks
rich in isolation can bury a letterform completely.

Render **white on black**, always. The line-work is cut *out* of a black letter,
so white line on black is the actual deliverable. Judging it black-on-white
flatters drawings that will not survive.

And then **look at the PNG**. Not the code, not the numbers. Every mistake in
this project was found by looking at a picture, and several were introduced by
reasoning about geometry that turned out to be wrong.

---

## Four cuts, four TREATMENTS

Once you have a field, the temptation is to ship four cuts that differ only in
density. Don't — they read as one idea at four settings.

Vary the **relationship between the garden and the letter** instead:

| | what changes |
|---|---|
| **field** | solid letter, garden all over it, solid rim |
| **spill** | as above, plus blooms whose centre is on the letter may overhang its edge |
| **hollow** | the letter is reduced to its own outline; the garden fills the space inside |
| **grow** | the garden fills the letter from the baseline to a wavy line; solid above |

**A style only works if its region is big enough to hold a WHOLE bloom.** An
*inline* — a floral band tracing just inside the edge — was built and cut for
exactly this reason: leaving a solid core inside a 178-unit stem allows a band
of about 44 units, and no flower survives being sliced to 44 units. It read as
distressed grunge. The bottom of a letter is a big area, so `grow` works; a
44-unit ribbon is not, so `inline` never could.

---

## Approve the flowers before you build a font

Draw candidates in a file **nothing imports**, render a numbered contact sheet,
and get a yes or no on each one before any of them costs a font build. Show each
candidate twice — one bloom large, and the same bloom scattered at letter size.

Ten of sixteen candidates were rejected or redrawn on that sheet. Every one of
those would have been an hour of build time to discover otherwise.

---

## Traps

**Quads vanish silently in CFF.** Skia's stroker emits conics; converting them
gives quads; a CFF charstring has no quadratic operator. A path replayer with no
branch for verb 2 drops those segments on the floor and writes a corrupt outline
with no error. Widen each quad to its exact cubic:

```
C1 = P0 + 2/3 (Q - P0)      C2 = P2 + 2/3 (Q - P2)
```

**`stroke()` produces CONICS that pathops' own boolean ops refuse to read.** Call
`convertConicsToQuads()` before any union, difference or simplify.

**Stroking a glyph outline to dilate it self-intersects.** At radii above ~30
units the letter's concave corners make the stroke cross itself, and simplifying
that leaves rectangular slabs of stray ink. Dilate by unioning offset copies of
the letter in a ring of directions instead — offsets cannot self-intersect.
(Erosion by stroke is fine at small radii; it is the large ones that bite.)

**A wide flat petal tip tiles into a polygon.** Four petals with blunt tops make
a literal square; five make a pentagon. If a radial bloom is reading as a
polygon, the tip width is why.

**Stroking a shape narrower than the stroke fills it solid.** Any motif whose
parts are small must scale its stroke width down with them, or a "line-work"
flower silently becomes a filled blob. Check on the contact sheet; it is not
visible in the code.

**A tall thin plant gets sliced by the letter.** A stem-and-flower motif taller
than the cap height, or narrower than a stem, lands with its head outside the
ink and leaves only fragments — which read as scribble. Keep a motif roughly as
wide as it is tall and comfortably inside one stem width.

---

## Making it fast

Naively this build takes about six hours. It takes about twenty-five minutes.
Four changes, in order of how much they bought:

1. **Draw ~16 variants per layer and reuse them by transform.** Do not draw a
   fresh flower per grid cell. Placing one is then a pure coordinate transform
   with no boolean op in it, and at field density the repetition is invisible.
   This is what a type designer does by hand anyway.
2. **Pre-union the field into tiles, each clipped to its own rectangle.** Tiles
   that merely *contain* their motifs overhang unpredictably, so a glyph must
   pad its query by a whole tile and ends up pushing eight times its own area of
   pattern through every boolean op. Clipped tiles mean a glyph asks for exactly
   what it overlaps.
3. **Move the GLYPH into field space, not the field to the glyph.** A letter is
   a handful of contours; the field is tens of thousands.
4. **Memoise the decorated glyph set per cut.** Each cut is written three times
   (OTF, TTF, WOFF2); without this the garden is grown three times over.

Cache the field to disk, and **delete the cache after editing any motif** or you
will spend a round judging the previous drawing.

---

## The one rule about the letters

The letterform and the ornament are two different jobs. When the letters are
approved, freeze them — `glyphs.py` here — and change only the flowers. Every
cut in the family shares one metric set, so a line of text sets
character-for-character identically in all of them and any cut can be swapped
for any other mid-word without reflowing.
