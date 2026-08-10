#!/usr/bin/env node
// Rebuilds the glyph-subset "Home" cuts of LOOM Bloom used by the home page
// (src/components/TypeShowcase.jsx + the --bloom-daisy hero headline in
// src/styles.css). Full fonts on /type (src/components/Typeface.jsx,
// PosterMachine.jsx) are untouched — they import the original CUTS with the
// full family names and always ship the complete glyph set + ZIP.
//
// Run this again if the hero headline copy (Sections.jsx `.hero-h1`), the
// cycling word (TypeShowcase's WORD), or the drifting Rose band text ever
// changes — a subset only carries the exact characters it was built with.
//
// Requires: python3 -m pip install fonttools brotli
//
//   node scripts/subset-bloom-home.mjs
import { execFileSync } from 'node:child_process'

const DIR = 'public/fonts/loom-bloom'

// Only "BLOOM" (the cycling word) is ever set in these five on the home page.
const BLOOM_ONLY = ['Tulip', 'Ivy', 'Wild', 'Hollow', 'Meadow']

// Rose also carries the drifting cut-name band (see TypeShowcase.jsx's
// ts-band--low), so its subset needs that text too.
const ROSE_TEXT = 'BLOOMROSE ✿ DAISY ❀ TULIP ❦ IVY ✿ ROSE ❀ DAISY'

// Daisy is the unconditional hero headline face (Sections.jsx `.hero-h1`) —
// "We weave brands / on the edge* / of creativity." (*that line is set in
// plain LOOM Bloom, not Daisy — see .hero-line--accent) — plus the cycling
// word.
const DAISY_TEXT = 'We weave brandsof creativity.BLOOM'

function subset(cut, text) {
  const input = `${DIR}/LOOMBloom${cut}-Regular.woff2`
  const output = `${DIR}/LOOMBloom${cut}-Home.woff2`
  execFileSync('python3', [
    '-m', 'fontTools.subset', input,
    `--text=${text}`,
    '--flavor=woff2', '--with-zopfli',
    `--output-file=${output}`,
    '--layout-features=', '--glyph-names', '--no-hinting', '--desubroutinize',
  ], { stdio: 'inherit' })
  console.log(`  -> ${output}`)
}

for (const cut of BLOOM_ONLY) subset(cut, 'BLOOM')
subset('Rose', ROSE_TEXT)
subset('Daisy', DAISY_TEXT)
