// Recolour the photographed yarn plate into the full brand palette.
//
// The three slices in public/img/tex/ (yarn-cap-l / yarn-mid / yarn-cap-r) are
// a single magenta spool shot once. CSS hue-rotate() cannot retint them
// accurately — it is a linear matrix approximation, so "violet" lands on
// indigo and "blue" lands on green. This does a real HSV rotation on the
// pixels instead, measured against the source's own median hue.
//
//   node scripts/build-yarn.mjs   ->  public/img/wool/yarn/<name>/*.png
//
// Re-run only if the source slices are re-shot.

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const SRC = 'public/img/tex'
const OUT = 'public/img/wool/yarn'
const SLICES = ['yarn-cap-l', 'yarn-mid', 'yarn-cap-r']

// measured from yarn-mid.png: median hue 308.8°, median saturation 0.73
const SRC_HUE = 308.8
const SRC_SAT = 0.73

// target hue / saturation read off the brand tokens in styles.css
const YARNS = {
  magenta: { hue: 329.6, sat: 0.71, brightness: 1.0 },
  violet: { hue: 276.3, sat: 0.52, brightness: 1.12 },
  blue: { hue: 197.2, sat: 0.75, brightness: 1.27 },
  gold: { hue: 44, sat: 0.62, brightness: 1.24 },
  crimson: { hue: 347.9, sat: 0.75, brightness: 1.02 },
  cream: { hue: 36, sat: 0.34, brightness: 1.75 },
  grey: { hue: 300, sat: 0.04, brightness: 0.92 },
}

// sharp only accepts an integer hue rotation
const wrap = (d) => Math.round(((d % 360) + 360) % 360)

for (const [name, t] of Object.entries(YARNS)) {
  await mkdir(`${OUT}/${name}`, { recursive: true })
  for (const slice of SLICES) {
    await sharp(`${SRC}/${slice}.png`)
      .modulate({
        hue: wrap(t.hue - SRC_HUE),
        saturation: t.sat / SRC_SAT,
        brightness: t.brightness,
      })
      .png({ compressionLevel: 9 })
      .toFile(`${OUT}/${name}/${slice}.png`)
  }
  console.log(`${name.padEnd(8)} hue ${wrap(t.hue - SRC_HUE).toFixed(0).padStart(3)}°  sat x${(t.sat / SRC_SAT).toFixed(2)}  bright x${t.brightness}`)
}
