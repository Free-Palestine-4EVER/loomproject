LOOM BLOOM
A condensed brutal display face — flat terminals, mitred joins, one corner
radius — drawn from scratch by LOOM. Five cuts:

  LOOMBloom-Regular        the plain face
  LOOMBloomRose-Regular    line-drawn roses, anemones and a leaf spray
  LOOMBloomDaisy-Regular   flat open blossoms — six petals, and one outlined
  LOOMBloomTulip-Regular   tulip cups, buds and berry sprigs
  LOOMBloomIvy-Regular     leaf sprigs — heart tip, branch and spray, no bloom

Every planted cut shares the Regular's metrics exactly, so the same line of text
lines up character for character across all five.

FILES
  .otf    install on macOS / Windows / Linux (desktop use)
  .ttf    same face, TrueType outlines — for older apps and Windows
  .woff2  for the web

CHARACTER SET  (v1.200)
  A–Z (lowercase types as caps by design), 0–9,
  the Bosnian/Croatian set Č Ć Ž Š Đ, and the common Western accents
  Á À Â Ä Ã Å  É È Ê Ë  Í Ì Î Ï  Ó Ò Ô Ö Õ  Ú Ù Û Ü  Ñ Ç Ý,
  . , : ; ! ? ' " “ ” ( ) [ ] / \ - – — _ & @ % # + = * ~ ° •
  and three ornaments: ❀ (U+2740) ✿ (U+273F) ❦ (U+2766)
  — the ornaments are drawn in each cut's own species.

ON THE WEB
  @font-face {
    font-family: 'LOOM Bloom';
    src: url('/fonts/loom-bloom/LOOMBloom-Regular.woff2') format('woff2');
    font-display: swap;
  }
  /* and the same for Rose / Daisy / Tulip / Ivy */

Set the planted cuts large — 48px and up. They are poster faces, not body text.

ORNAMENTS
  LOOM's own flower set since v1.200 — twelve ornaments vectorised from artwork
  supplied by the studio (type/svg/src/, traced into type/svg/raw/loom-*.svg).
  The public-domain / CC0 ornament used up to v1.100 is still in the project,
  with provenance in type/svg/sources.json. See LICENCE.txt.

SPACING
  Per-glyph sidebearings (round letters fit tighter than flat ones) and a
  class-based kerning feature covering the diagonals, the arms, round/flat
  pairs and punctuation.

© 2026 LOOM. See LICENCE.txt.
