LOOM PATTERNS
Four caps-only display cuts, drawn from scratch by LOOM. Each cut is a heavy
grotesk silhouette filled with a pattern, and each is drawn twice — the pattern
inside a solid letter (Fill), and the same pattern inside a hollow one
(Outline). Eight faces:

  LOOMOrganic-Regular          thick zebra ribbons in a rounded slab
  LOOMOrganicOutline-Regular   the same ribbons, hollow letter
  LOOMRetro-Regular            a fine crackle / pebble mesh, wide grotesk
  LOOMRetroOutline-Regular     the same mesh, hollow letter
  LOOMLinear-Regular           a very fine scribble hairline, wide grotesk
  LOOMLinearOutline-Regular    the same scribble, hollow letter
  LOOMFlora-Regular            a light speckle
  LOOMFloraOutline-Regular     scattered flowers and dots, hollow letter

Every face carries the same 98 glyphs over the same 161 codepoints, so a line
of text sets identically in all eight and a Fill can be swapped for its Outline
without the line moving.

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

SIZE
  These are display faces and the pattern needs room. Below roughly 40px it
  stops resolving. Set them large.

ON THE WEB
  @font-face {
    font-family: 'LOOM Organic';
    src: url('/fonts/loom-patterns/LOOMOrganic-Regular.woff2') format('woff2');
    font-display: swap;
  }

  h1 { font-family: 'LOOM Organic', sans-serif; }

  The web files run 29 KB (Organic) to 244 KB (Flora). Load the faces a page
  actually sets, not the family.

LICENCE
  Free for personal and commercial work. Full terms in LICENCE.txt.

loomstudio-jo.com · Amman × Sarajevo
