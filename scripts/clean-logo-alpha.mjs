// De-haze the woven LOOM logotype.
//
// The source render was cut off a light background and kept two artefacts: a
// broad low-alpha fog across the whole frame (~a39), which reads as a grey box
// behind the mark on the loader's dark panel, and a handful of small stray
// islands of leftover matte near the L and the M.
//
//   node scripts/clean-logo-alpha.mjs <in.png> <out.webp>
//
// The ramp keeps the wool's genuinely soft edges — those sit well above the
// fog — while a connected-component pass drops anything too small to be part
// of a letter.

import sharp from 'sharp'

const IN = process.argv[2] ?? 'brand-refs/loom-woven-source.png'
const OUT = process.argv[3] ?? 'public/img/logo/loom-woven.webp'

const LO = 100 // at or below this, it is fog
const HI = 210 // at or above this, it is solid wool
// px. The letterforms break into ~14 islands (the O's are drawn as separate
// woven blocks with real gaps between them), the smallest legitimate one being
// ~400px; the leftover matte specks are all under 200. Raising this eats bites
// out of both O's, so it sits deliberately just under the real floor.
const MIN_ISLAND = 300

const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h, channels: ch } = info

for (let i = 0; i < w * h; i++) {
  const a = data[i * ch + 3]
  data[i * ch + 3] = a <= LO ? 0 : a >= HI ? 255 : Math.round((255 * (a - LO)) / (HI - LO))
}

// label 4-connected islands of any remaining opacity, and erase the small ones
const seen = new Uint8Array(w * h)
let dropped = 0
for (let start = 0; start < w * h; start++) {
  if (seen[start] || data[start * ch + 3] === 0) continue
  const island = []
  const stack = [start]
  seen[start] = 1
  while (stack.length) {
    const i = stack.pop()
    island.push(i)
    const x = i % w
    const y = (i / w) | 0
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return
      const j = ny * w + nx
      if (seen[j] || data[j * ch + 3] === 0) return
      seen[j] = 1
      stack.push(j)
    }
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
  if (island.length < MIN_ISLAND) {
    for (const i of island) data[i * ch + 3] = 0
    dropped += island.length
  }
}

const meta = await sharp(data, { raw: { width: w, height: h, channels: ch } })
  .webp({ quality: 88, alphaQuality: 95 })
  .toFile(OUT)

console.log(`${OUT}  ${meta.width}x${meta.height}  ${Math.round(meta.size / 1024)}kB  (${dropped} stray px erased)`)
