// Cut a generated wool button off its white studio background.
//
// The Nano Banana renders arrive as a knitted pill floating on flat white with
// one soft contact shadow. The site sits on near-black, so a grey shadow baked
// into the cutout reads as a smudge — the shadow is dropped and wool.css draws
// its own halo instead.
//
//   node scripts/cut-buttons.mjs <in-dir> [out-dir]
//
// Background is found by flood fill from the frame edge, so the off-white
// embroidered label survives: it is bright, but it is not edge-connected.

import sharp from 'sharp'
import { readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'

const IN = process.argv[2]
const OUT = process.argv[3] ?? 'public/img/wool/buttons'
const WIDTH = 720

// a pixel is background-ish if it is bright and unsaturated — that covers both
// the white sweep and the grey contact shadow, but not the gold/magenta wool
// Thresholds are tight on purpose: pale gold wool sits around 211/196/193, and
// a looser test reads that as grey and eats straight through the pill. The
// second fill pass relaxes them (see cut()) once the frame is already known.
const isBgRef = { min: 206, spread: 11 }
const isBg = (r, g, b) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return min > isBgRef.min && max - min < isBgRef.spread
}

async function cut(file) {
  Object.assign(isBgRef, { min: 206, spread: 11 })
  const src = sharp(file).ensureAlpha()
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: ch } = info

  // flood fill from every edge pixel
  const bg = new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const i = y * w + x
    if (bg[i]) return
    const p = i * ch
    if (!isBg(data[p], data[p + 1], data[p + 2])) return
    bg[i] = 1
    stack.push(x, y)
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  const drain = () => {
    while (stack.length) {
      const y = stack.pop()
      const x = stack.pop()
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
    }
  }
  drain()

  // The contact shadow's core is too dark for the first pass, so it survives as
  // a pale rim under the pill. Creep into it from the background already found,
  // at a threshold that still cannot reach the wool (even pale gold spreads ~18
  // across its channels, well past the 14 allowed here).
  const seeds = []
  for (let i = 0; i < w * h; i++) if (bg[i]) seeds.push(i % w, (i / w) | 0)
  Object.assign(isBgRef, { min: 170, spread: 14 })
  for (let i = 0; i < seeds.length; i += 2) {
    push(seeds[i] + 1, seeds[i + 1]); push(seeds[i] - 1, seeds[i + 1])
    push(seeds[i], seeds[i + 1] + 1); push(seeds[i], seeds[i + 1] - 1)
  }
  drain()

  // knock the background out, and find the ink bounds while we are here
  let x0 = w, y0 = h, x1 = 0, y1 = 0
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) { data[i * ch + 3] = 0; continue }
    const x = i % w, y = (i / w) | 0
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  if (x1 <= x0 || y1 <= y0) throw new Error(`${file}: nothing survived the cut`)

  const cw = x1 - x0 + 1
  const chh = y1 - y0 + 1

  // Feather the alpha by hand rather than with sharp's blur: joinChannel runs
  // at the END of a sharp pipeline, so a separately-blurred alpha would be
  // joined after the resize had already changed the size underneath it.
  // A 3x3 box pass is enough to stop the fill's 1px boundary looking scissored.
  const alpha = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) alpha[i] = data[i * ch + 3]
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      let sum = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += alpha[i + dy * w + dx]
      data[i * ch + 3] = (sum / 9) | 0
    }
  }

  const name = path.basename(file, path.extname(file))
  const out = path.join(OUT, `${name}.webp`)
  const meta = await sharp(data, { raw: { width: w, height: h, channels: ch } })
    .extract({ left: x0, top: y0, width: cw, height: chh })
    .resize({ width: WIDTH })
    .webp({ quality: 90, alphaQuality: 90 })
    .toFile(out)

  return { name, w: meta.width, h: meta.height }
}

await mkdir(OUT, { recursive: true })
const files = (await readdir(IN)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
const done = []
for (const f of files) done.push(await cut(path.join(IN, f)))

console.log(done.map((d) => `${d.name}  ${d.w}x${d.h}`).join('\n'))
console.log('\nRATIO entries:')
console.log(done.map((d) => `  '${d.name}': ${d.w} / ${d.h},`).join('\n'))
