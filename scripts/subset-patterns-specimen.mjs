#!/usr/bin/env node
/**
 * subset-patterns-specimen.mjs — cuts the LOOM Patterns faces down to the four
 * letters the #typeface SPECIMEN sets in them, and nothing else.
 *
 * WHY THIS EXISTS
 * #typeface is a comparative specimen: every beat sets the SAME word, BLOOM,
 * and the only variable is which cut draws it. That word is five characters
 * long and uses four distinct glyphs — B, L, O, M. The full faces are
 * 98-glyph display fonts whose weight scales with the ornament inside the
 * letter, not with the alphabet: Organic 30/31 KB, Linear 85/80 KB,
 * Retro 111/106 KB, Flora 249/221 KB. Shipping 470 KB of Retro + Flora so the
 * home page can draw B, L, O and M is why those two cuts were dropped from the
 * sequence in the first place, and why the client saw a specimen that skipped
 * half the family.
 *
 * Subsetting to BLOOM is what puts them back. Same drawings, same metrics,
 * four glyphs each.
 *
 * This mirrors the two precedents already in the tree — the Bloom "Home" cuts
 * and subset-patterns-home.mjs (the hero headline) — one more time: separate
 * files, separate family names, full faces left untouched for /type and its
 * ZIP. The @font-face rules for these live in
 * src/lib/components/typeshowcase.css, NOT in styles.css, because they belong
 * to exactly one section and must never be parsed by a page that has no
 * #typeface on it.
 *
 * ORGANIC IS NOT SUBSET, DELIBERATELY. #typeface also sets 'LOOM Organic' in
 * two drifting bands (the whole alphabet plus digits), in the caption band
 * (four cut names plus three ornaments) and in the canvas glyph field, so the
 * full Organic face is fetched by that section regardless; a BLOOM subset
 * beside it would be a second file for glyphs the page already has.
 *
 * RERUN IF THE SPECIMEN WORD CHANGES. A character missing from a subset does
 * NOT render as tofu — it silently falls back to the next family in the stack,
 * so a stale subset reads as one unstyled letter inside a patterned word.
 * Update WORD below and run:
 *
 *     export PATH="$HOME/.local/node/bin:$PATH"
 *     node scripts/subset-patterns-specimen.mjs
 *
 * Requires fontTools with woff2 support (`python3 -m fontTools.subset`).
 */
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'static/fonts/loom-patterns')

// The specimen word, verbatim from TypeShowcaseAct.svelte's `WORD`. Caps only:
// these faces have no lowercase glyphs at all.
const WORD = 'BLOOM'

const CUTS = [
  ['LOOMLinear-Regular.ttf', 'LOOMLinear-Specimen.woff2'],
  ['LOOMLinearOutline-Regular.ttf', 'LOOMLinearOutline-Specimen.woff2'],
  ['LOOMRetro-Regular.ttf', 'LOOMRetro-Specimen.woff2'],
  ['LOOMRetroOutline-Regular.ttf', 'LOOMRetroOutline-Specimen.woff2'],
  ['LOOMFlora-Regular.ttf', 'LOOMFlora-Specimen.woff2'],
  ['LOOMFloraOutline-Regular.ttf', 'LOOMFloraOutline-Specimen.woff2'],
]

const chars = [...new Set(WORD)].sort().join('')
console.log(`glyph set (${chars.length} chars): ${JSON.stringify(chars)}`)

let totalBefore = 0
let totalAfter = 0
for (const [src, out] of CUTS) {
  const outPath = join(DIR, out)
  execFileSync('python3', [
    '-m', 'fontTools.subset', join(DIR, src),
    `--text=${WORD}`,
    `--output-file=${outPath}`,
    '--flavor=woff2',
    '--layout-features=',       // no kern/liga needed for one fixed word
    '--no-hinting',
    '--desubroutinize',
    '--drop-tables+=DSIG',
    '--name-IDs=',
    '--notdef-outline',
  ], { stdio: 'inherit' })
  const before = statSync(join(DIR, src.replace('.ttf', '.woff2'))).size
  const after = statSync(outPath).size
  totalBefore += before
  totalAfter += after
  console.log(
    `${relative(ROOT, outPath)}  ${(after / 1024).toFixed(1)} KB` +
    `  (full face ${(before / 1024).toFixed(1)} KB — ${(100 - (after / before) * 100).toFixed(0)}% saved)`
  )
}
console.log(
  `\ntotal ${(totalAfter / 1024).toFixed(1)} KB instead of ${(totalBefore / 1024).toFixed(1)} KB`
)
