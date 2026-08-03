// Cut a render off a FLAT studio backdrop into a transparent PNG.
//   node scripts/cut-flat-key.mjs <source> <out.png> [--bg RRGGBB]
//
// This is the easy sibling of clean-manifesto-alpha.mjs. That one has to solve
// a Laplace field because its backdrop is a vignette plus a glow blob; these
// renders were commissioned on a deliberately flat #9A9A9A sweep precisely so
// a straight distance key would be enough, and a key is far more predictable
// than a relaxation solve.
//
// Two things a naive key gets wrong, both handled below:
//   · a hard threshold leaves a 1px aliased fringe of backdrop colour around
//     every curve, which reads as a grey halo on a dark page. So alpha ramps
//     across a LO..HI band instead of flipping.
//   · un-premultiplying is not optional. A partly-transparent edge pixel still
//     carries the backdrop's grey mixed into its RGB; left alone that grey
//     shows through wherever alpha < 1. We solve each edge pixel back toward
//     its true colour before writing.
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const [src, out] = argv.filter((a) => !a.startsWith('--'))
if (!src || !out) {
  console.error('usage: node scripts/cut-flat-key.mjs <source> <out.png> [--bg RRGGBB]')
  process.exit(1)
}
const bgFlag = argv.find((a) => a.startsWith('--bg'))
const hex = bgFlag ? bgFlag.split('=')[1] || argv[argv.indexOf(bgFlag) + 1] : null

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info

// Sample the backdrop from the four corners rather than trusting the flag —
// the render is what it is, not what the prompt asked for.
const corners = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]
let br = 0, bg = 0, bb = 0
for (const [x, y] of corners) {
  const i = (y * W + x) * C
  br += data[i]; bg += data[i + 1]; bb += data[i + 2]
}
br /= 4; bg /= 4; bb /= 4
if (hex) {
  br = parseInt(hex.slice(0, 2), 16); bg = parseInt(hex.slice(2, 4), 16); bb = parseInt(hex.slice(4, 6), 16)
}

// Bands in RGB distance. LO: anything this close to the backdrop IS backdrop.
// HI: anything this far is fully subject. Between them alpha ramps, which is
// what keeps a fuzzy wool edge looking fuzzy instead of laser-cut.
const LO = 26
const HI = 68

const px = W * H
const rgba = Buffer.alloc(px * 4)
for (let p = 0; p < px; p++) {
  const i = p * C
  const r = data[i], g = data[i + 1], b = data[i + 2]
  const d = Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2)

  let a = d <= LO ? 0 : d >= HI ? 1 : (d - LO) / (HI - LO)

  let R = r, G = g, B = b
  if (a > 0 && a < 1) {
    // observed = subject*a + backdrop*(1-a)  ->  solve for subject
    R = (r - br * (1 - a)) / a
    G = (g - bg * (1 - a)) / a
    B = (b - bb * (1 - a)) / a
  }
  const o = p * 4
  rgba[o] = Math.max(0, Math.min(255, R))
  rgba[o + 1] = Math.max(0, Math.min(255, G))
  rgba[o + 2] = Math.max(0, Math.min(255, B))
  rgba[o + 3] = Math.round(a * 255)
}

const outPath = out.startsWith('/') ? out : fileURLToPath(new URL(`../${out}`, import.meta.url))
const res = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(outPath)

const opaque = rgba.filter((_, k) => k % 4 === 3).length
console.log(
  `keyed bg rgb(${br | 0},${bg | 0},${bb | 0}) -> ${outPath.split('/').pop()} ` +
  `${res.width}x${res.height} ${(res.size / 1024).toFixed(0)} kB (${opaque} px scanned)`
)
