# The bar every screen in `mocks/` has to clear

The client looked at the first pass and said one screen was good — `quran-noor-2` /
`quran-noor-3` — and the rest read as fake. He was right, and the difference is not
taste. It is these rules. Read `mocks/quran-noor-3.html` before writing anything.

## What made Quran Noor read as real

**1. Density.** The screen is FULL. Five prayer rows, a compass, a header, a date, a
countdown, a tab bar — top edge to bottom edge, no dead air. The fake ones had three
big rounded cards floating in 400px of empty gradient. A real app screen is packed,
because real apps have real content.

**2. No illustration.** Not one drawn object. No duck, no cat, no perfume bottle, no
glowing orb. Vector cartoons are the single loudest "this is a mockup" signal there
is. If a screen would show a photograph, either crop it small and build it from
layered gradients + noise so it reads as a photo edge, or pick a different screen —
a list, a form, a data view — that doesn't need one.

**3. Real strings, irregular numbers.** `04:32`, `27 Safar 1448 AH`, `157° SE`,
`110 ayahs`. Never `12:00`, never `100`, never `Item 1`, never lorem. Numbers that
end in 0 or 5 read as invented. Names, dates, file sizes and durations must all be
specific and slightly awkward, the way real data is.

**4. Native iOS, measured not vibed.**
- 16px side margins on content, separators inset to the text, not the screen edge.
- Type ramp: large title ~34px/800, section header ~13px/600 uppercase tracked,
  row title ~17px/500, secondary ~15px, caption ~13px. Stay on it.
- A real nav bar (back chevron + title) or a real large title — not a centred logo.
- A real tab bar: five items, icon over 10px label, one tinted active.
- The home-indicator bar at the bottom, always.

**5. Type does the work.** Hierarchy comes from size and weight. Not from glow, not
from neon, not from a gradient behind every card. ONE accent colour, used on maybe
three elements in the whole screen.

**6. Let it overflow.** A real capture cuts a row in half at the bottom edge, or
shows the top of the next section. A screen that ends in a tidy 200px of nothing is
a poster, not a screenshot. Fill past the fold and let it clip.

## The smell test before you re-render

Put your screen next to `static/img/suite/quran-noor-3.webp`. If yours has more
empty space, fewer rows, rounder cards, bigger glows or any drawn character in it,
it is not done.
