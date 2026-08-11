#!/usr/bin/env node
/**
 * subset-patterns-home.mjs — cuts the LOOM Patterns faces down to the exact
 * glyphs the HOME PAGE HERO sets in them, and nothing else.
 *
 * WHY THIS EXISTS
 * The four pattern cuts are outline-heavy display faces (Organic 30 KB,
 * Linear 85 KB, Retro 111 KB, Flora 249 KB per cut — ~913 KB for all eight)
 * because the pattern IS the letter: every zebra ribbon, crackle cell and
 * flower is real contour data, so the file scales with the ornament, not with
 * the alphabet. The hero headline is the LCP element at tablet/desktop widths.
 * Shipping a whole 98-glyph face to render seventeen distinct letters is the
 * single most expensive mistake available on this page, so the hero points at
 * SUBSET families instead — same drawings, only the characters it sets.
 *
 * This mirrors the Bloom precedent ("Home" cuts, see the comment block above
 * the `... Home` @font-face rules in src/lib/styles/styles.css): separate file,
 * separate family name, full faces left untouched for /type and its ZIP.
 *
 * WHAT IT PRODUCES
 *   static/fonts/loom-patterns/LOOMLinear-Home.woff2         -> 'LOOM Linear Home'
 *   static/fonts/loom-patterns/LOOMLinearOutline-Home.woff2  -> 'LOOM Linear Outline Home'
 *
 * THE GLYPH SET IS THE HERO HEADLINE, UPPERCASED
 * Hero.svelte sets "We weave brands / on the edge / of creativity." and
 * styles.css puts `text-transform: uppercase` on `.hero-h1`, so the characters
 * actually shaped are the uppercase ones plus U+0020 and the full stop in
 * `.hero-h1 .dot`. These faces are CAPS-ONLY (no lowercase glyphs at all), so
 * the uppercase transform is not a style choice, it is what keeps the line from
 * falling back to the OS sans mid-word.
 *
 * IF THE HERO COPY CHANGES, RERUN THIS. A character that is not in the subset
 * does NOT render as tofu — it silently falls back to the next family in the
 * stack, so a stale subset shows up as one unstyled letter in the middle of a
 * patterned word. Update HERO_TEXT below and run:
 *
 *     export PATH="$HOME/.local/node/bin:$PATH"
 *     node scripts/subset-patterns-home.mjs
 *
 * Requires fontTools (python3 -m fontTools.subset) with woff2 support —
 * `python3 -c "import fontTools; print(fontTools.version)"` to check.
 *
 * The exact underlying invocation this script runs, recorded verbatim so it can
 * be reproduced by hand without node:
 *
 *   python3 -m fontTools.subset static/fonts/loom-patterns/LOOMLinear-Regular.ttf \
 *     --text=" .ABCDEFGHIJKLMNOPQRSTUVWXYZ" (see HERO_TEXT — the real list is
 *     just the characters below, not the whole alphabet) \
 *     --output-file=static/fonts/loom-patterns/LOOMLinear-Home.woff2 \
 *     --flavor=woff2 --layout-features='' --no-hinting --desubroutinize \
 *     --drop-tables+=DSIG --name-IDs='' --notdef-outline
 */
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'static/fonts/loom-patterns')

// The literal hero headline, uppercased, plus the full stop in `.hero-h1 .dot`.
// Keep this in sync with Hero.svelte's three `.hero-line` spans.
const HERO_TEXT = 'WE WEAVE BRANDS ON THE EDGE OF CREATIVITY.'

// Fill cut for the two solid lines, outline cut for the magenta accent line.
// Both are subset to the WHOLE headline rather than to their own line only:
// the two cuts share metrics exactly, the difference in bytes is a rounding
// error at this glyph count, and it means swapping which line is outlined is a
// one-line CSS change instead of a font rebuild.
const CUTS = [
  ['LOOMLinear-Regular.ttf', 'LOOMLinear-Home.woff2'],
  ['LOOMLinearOutline-Regular.ttf', 'LOOMLinearOutline-Home.woff2'],
]

const chars = [...new Set(HERO_TEXT)].sort().join('')
console.log(`glyph set (${chars.length} chars): ${JSON.stringify(chars)}`)

for (const [src, out] of CUTS) {
  const srcPath = join(DIR, src)
  const outPath = join(DIR, out)
  execFileSync('python3', [
    '-m', 'fontTools.subset', srcPath,
    `--text=${HERO_TEXT}`,
    `--output-file=${outPath}`,
    '--flavor=woff2',
    '--layout-features=',       // no kern/liga needed for three fixed lines
    '--no-hinting',
    '--desubroutinize',
    '--drop-tables+=DSIG',
    '--name-IDs=',
    '--notdef-outline',
  ], { stdio: 'inherit' })
  const before = statSync(join(DIR, src.replace('.ttf', '.woff2'))).size
  const after = statSync(outPath).size
  console.log(
    `${relative(ROOT, outPath)}  ${(after / 1024).toFixed(1)} KB` +
    `  (full face ${(before / 1024).toFixed(1)} KB — ${(100 - (after / before) * 100).toFixed(0)}% saved)`
  )
}
