// Cuts the knitted LOOM planet out of its Higgsfield render for the hero.
//
// The render arrives on a soft bokeh nebula, and no single threshold separates
// them: the nebula carries the same pinks and violets the planet does. What it
// does NOT carry is DETAIL — it was rendered as a blurred backdrop. So the key
// is mostly a local-contrast measure (pixel vs its own 6px blur), with
// saturation and luminance as minor votes, then morphology to turn that spray
// of edge pixels into one solid silhouette:
//   close (dilate→erode)  the stitch-level speckle becomes a body
//   flood fill from the border   everything not reached is interior, so the
//                                planet's own smooth areas fill in
//   open (erode→dilate)   loose stars and nebula crumbs fall off
//   largest component     whatever survives that isn't the planet is dropped
//   blur 2.2px            a feathered edge, so it sits in the scene
//
// GOTCHA, cost an hour: sharp promotes a 1-channel raw buffer to 3 channels on
// blur(). Indexing the result as 1 channel reads every third byte and returns a
// perfectly plausible-looking, completely wrong alpha — a 1px horizontal stripe
// pattern. Always divide by the actual length.
//
// Usage: node scripts/make-hero-planet.mjs <render.png>
import sharp from 'sharp'
import fs from 'node:fs'

const SRC = process.argv[2]
const OUT = 'public/img/hero/planet.webp'
const N = 1024

if (!SRC || !fs.existsSync(SRC)) {
  console.error('usage: node scripts/make-hero-planet.mjs <render.png>')
  process.exit(1)
}

function morph(src, r, dilate) {
  const out = Buffer.alloc(N * N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let v = dilate ? 0 : 255
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= N) continue
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= N) continue
          const s = src[yy * N + xx]
          v = dilate ? Math.max(v, s) : Math.min(v, s)
        }
      }
      out[y * N + x] = v
    }
  }
  return out
}

/** Keep only the biggest blob — the planet — and drop every other island. */
function largestComponent(mask) {
  const label = new Int32Array(N * N).fill(-1)
  let best = null, bestSize = 0
  for (let s = 0; s < N * N; s++) {
    if (mask[s] === 0 || label[s] !== -1) continue
    const stack = [s]
    const cells = []
    label[s] = s
    while (stack.length) {
      const i = stack.pop()
      cells.push(i)
      const x = i % N, y = (i / N) | 0
      const push = (j) => { if (mask[j] && label[j] === -1) { label[j] = s; stack.push(j) } }
      if (x > 0) push(i - 1)
      if (x < N - 1) push(i + 1)
      if (y > 0) push(i - N)
      if (y < N - 1) push(i + N)
    }
    if (cells.length > bestSize) { bestSize = cells.length; best = s }
  }
  const out = Buffer.alloc(N * N)
  for (let i = 0; i < N * N; i++) if (label[i] === best) out[i] = 255
  return out
}

const data = await sharp(SRC).resize(N, N).removeAlpha().raw().toBuffer()
const soft = await sharp(SRC).resize(N, N).removeAlpha().blur(6).raw().toBuffer()

let m = Buffer.alloc(N * N)
for (let i = 0; i < N * N; i++) {
  const r = data[i * 3] / 255, g = data[i * 3 + 1] / 255, b = data[i * 3 + 2] / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  const sat = mx === 0 ? 0 : (mx - mn) / mx
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const detail = (Math.abs(data[i * 3] - soft[i * 3])
                + Math.abs(data[i * 3 + 1] - soft[i * 3 + 1])
                + Math.abs(data[i * 3 + 2] - soft[i * 3 + 2])) / 765
  const score = Math.min(1, detail * 7) * 0.6
              + Math.min(1, Math.max(0, (sat - 0.12) / 0.30)) * 0.25
              + Math.min(1, Math.max(0, (lum - 0.42) / 0.35)) * 0.35
  m[i] = score > 0.5 ? 255 : 0
}

m = morph(m, 7, true)
m = morph(m, 7, false)

// interior = everything the background flood never reaches
const seen = new Uint8Array(N * N)
const stack = []
for (let x = 0; x < N; x++) stack.push(x, (N - 1) * N + x)
for (let y = 0; y < N; y++) stack.push(y * N, y * N + N - 1)
while (stack.length) {
  const i = stack.pop()
  if (seen[i] || m[i]) continue
  seen[i] = 1
  const x = i % N, y = (i / N) | 0
  if (x > 0) stack.push(i - 1)
  if (x < N - 1) stack.push(i + 1)
  if (y > 0) stack.push(i - N)
  if (y < N - 1) stack.push(i + N)
}
let body = Buffer.alloc(N * N)
for (let i = 0; i < N * N; i++) body[i] = seen[i] ? 0 : 255

body = morph(body, 9, false)
body = morph(body, 9, true)
body = largestComponent(body)

const blurred = await sharp(body, { raw: { width: N, height: N, channels: 1 } }).blur(2.2).raw().toBuffer()
const ch = blurred.length / (N * N)   // see the GOTCHA above

const rgba = Buffer.alloc(N * N * 4)
for (let i = 0; i < N * N; i++) {
  rgba[i * 4] = data[i * 3]
  rgba[i * 4 + 1] = data[i * 3 + 1]
  rgba[i * 4 + 2] = data[i * 3 + 2]
  rgba[i * 4 + 3] = blurred[i * ch]
}

fs.mkdirSync('public/img/hero', { recursive: true })
await sharp(rgba, { raw: { width: N, height: N, channels: 4 } })
  .webp({ quality: 88, alphaQuality: 95 })
  .toFile(OUT)

// the phone still: the hero canvas is skipped on touch (one WebGL context only)
await sharp(rgba, { raw: { width: N, height: N, channels: 4 } })
  .resize(560)
  .webp({ quality: 82, alphaQuality: 90 })
  .toFile('public/img/hero/planet-sm.webp')

console.log(OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB')
console.log('public/img/hero/planet-sm.webp', (fs.statSync('public/img/hero/planet-sm.webp').size / 1024).toFixed(0) + ' KB')
