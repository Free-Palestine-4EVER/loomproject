// Cut the background residue out of the photographed wool buttons.
//
//   node scripts/clean-button-alpha.mjs            dry run + preview sheet
//   node scripts/clean-button-alpha.mjs --apply    rewrite the assets
//
// Every render in public/img/wool/buttons/ ships with a light, OPAQUE shelf of
// leftover studio backdrop under the pill — a ragged white plate under the pink
// spool, a grey slab under the cream one. On a near-black page it reads as a bar
// of dirt beneath the site's primary CTA, and it is on every screen. All 32
// files have it.
//
// It is not a designed shadow: it is LIGHTER than the page it sits on, and
// wool.css already applies its own drop-shadow on top.
//
// No CSS can reach it. The residue is fully opaque and lives in the asset's
// alpha channel.
//
// Method: find the pill's bottom silhouette per column, smooth that curve, then
// clear everything under it.
//
// The obvious approach — per-column walk up from the bottom, stopping at the
// first pixel that looks like yarn — does not work. Stray fibres and the pill's
// own lit bottom edge stop the walk in scattered columns, and the result is a
// comb of one-pixel spikes hanging off the pill. Smoothing the silhouette curve
// is what turns that comb back into an edge: a median kills the single-column
// outliers, and a small dilation after it keeps the rounded ends from being
// shaved.
import sharp from 'sharp'
import { readdirSync, mkdirSync, copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(HERE, '../public/img/wool/buttons')
// outside public/ on purpose — anything under it is copied into dist/ and served
const BACKUP = resolve(HERE, '_button-originals')
const PREVIEW = resolve(HERE, '_button-alpha-preview.png')
const APPLY = process.argv.includes('--apply')

// Only ever consider the bottom slice of the frame. Nothing above this can be
// the shelf, and not looking there means a bad threshold can never punch a hole
// through the middle of a button.
const BAND = 0.17
const SAT_YARN = 46     // max-min above this = coloured yarn
const STD_YARN = 9.5    // local luma std-dev above this = knitted texture
const MEDIAN = 22       // half-window, in columns
const DILATE = 2        // push the curve back down, in rows
const FEATHER = 3       // rows of alpha ramp under the curve
const WIN = 2           // local-variance half-window, in pixels

// Brightness cannot separate a white pill from a white plate — several of these
// buttons ARE cream or grey, at the same luma as the backdrop behind them. What
// separates them is TEXTURE: knitted yarn has strong high-frequency detail in
// every 5x5 neighbourhood, and a studio sweep has almost none. So the test is
// "saturated, or locally noisy", computed from summed-area tables so the window
// costs four lookups instead of twenty-five.
function localStd(data, W, H, CH) {
  const n = W * H
  const A = (W + 1) * (H + 1)
  const s1 = new Float64Array(A)   // sum of luma over OPAQUE pixels
  const s2 = new Float64Array(A)   // sum of luma^2 over opaque pixels
  const sc = new Float64Array(A)   // count of opaque pixels
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * CH
      // Transparent pixels carry undefined RGB — usually black. Counting them
      // makes the smooth residue right at the cut edge look as noisy as yarn,
      // which is exactly where the decision matters, so they are masked out of
      // the window entirely rather than merely down-weighted.
      const m = data[i + 3] >= 128 ? 1 : 0
      const l = m ? 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] : 0
      const k = (y + 1) * (W + 1) + (x + 1)
      s1[k] = l + s1[k - 1] + s1[k - W - 1] - s1[k - W - 2]
      s2[k] = l * l + s2[k - 1] + s2[k - W - 1] - s2[k - W - 2]
      sc[k] = m + sc[k - 1] + sc[k - W - 1] - sc[k - W - 2]
    }
  }
  const out = new Float32Array(n)
  const box = (s, x0, y0, x1, y1) =>
    s[(y1 + 1) * (W + 1) + (x1 + 1)] - s[y0 * (W + 1) + (x1 + 1)]
    - s[(y1 + 1) * (W + 1) + x0] + s[y0 * (W + 1) + x0]
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - WIN), y1 = Math.min(H - 1, y + WIN)
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - WIN), x1 = Math.min(W - 1, x + WIN)
      const c = box(sc, x0, y0, x1, y1)
      if (c < 6) { out[y * W + x] = 0; continue }
      const m = box(s1, x0, y0, x1, y1) / c
      out[y * W + x] = Math.sqrt(Math.max(0, box(s2, x0, y0, x1, y1) / c - m * m))
    }
  }
  return out
}

function clean(data, W, H, CH) {
  const from = Math.floor(H * (1 - BAND))
  const std = localStd(data, W, H, CH)

  // 1. lowest yarn row per column, inside the band
  const bottom = new Int32Array(W).fill(from - 1)
  for (let x = 0; x < W; x++) {
    for (let y = H - 1; y >= from; y--) {
      const i = (y * W + x) * CH
      if (data[i + 3] < 24) continue
      const sat = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2])
      if (sat >= SAT_YARN || std[y * W + x] >= STD_YARN) { bottom[x] = y; break }
    }
  }

  // 2. median over a window — this is what removes the comb
  const med = new Int32Array(W)
  const win = []
  for (let x = 0; x < W; x++) {
    win.length = 0
    for (let k = -MEDIAN; k <= MEDIAN; k++) {
      const xx = x + k
      if (xx >= 0 && xx < W) win.push(bottom[xx])
    }
    win.sort((a, b) => a - b)
    med[x] = win[win.length >> 1]
  }

  // 3. small dilation, so the rounded ends and any genuine fringe survive
  const edge = new Int32Array(W)
  for (let x = 0; x < W; x++) {
    let m = med[x]
    for (let k = -DILATE; k <= DILATE; k++) {
      const xx = x + k
      if (xx >= 0 && xx < W) m = Math.max(m, med[xx])
    }
    edge[x] = m
  }

  // 4. clear under the curve, with a short ramp so the new edge is not a
  //    one-pixel stairstep
  let cleared = 0
  for (let x = 0; x < W; x++) {
    for (let y = edge[x] + 1; y < H; y++) {
      const i = (y * W + x) * CH
      if (data[i + 3] === 0) continue
      const d = y - edge[x]
      const a = d > FEATHER ? 0 : Math.round(data[i + 3] * (1 - d / (FEATHER + 1)))
      if (a < data[i + 3]) cleared++
      data[i + 3] = a
    }
  }
  return cleared
}

const files = readdirSync(DIR).filter((f) => /\.(webp|png)$/i.test(f)).sort()
const tiles = []
let touched = 0

for (const file of files) {
  const src = join(DIR, file)
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: CH } = info
  const before = Buffer.from(data)
  const cleared = clean(data, W, H, CH)

  console.log(`${file.padEnd(30)} ${W}x${H}  cleared ${cleared.toString().padStart(7)} px`)
  if (cleared) touched++

  if (!APPLY && tiles.length < 16) {
    const strip = async (buf) => sharp({
      create: { width: W, height: 130, channels: 4, background: { r: 13, g: 7, b: 22, alpha: 1 } },
    }).composite([{
      input: await sharp(buf, { raw: { width: W, height: H, channels: CH } })
        .extract({ left: 0, top: H - 130, width: W, height: 130 }).png().toBuffer(),
      top: 0, left: 0,
    }]).png().toBuffer()
    tiles.push({ label: file, before: await strip(before), after: await strip(data), W })
  }

  if (APPLY && cleared) {
    if (!existsSync(BACKUP)) mkdirSync(BACKUP, { recursive: true })
    if (!existsSync(join(BACKUP, file))) copyFileSync(src, join(BACKUP, file))
    const buf = await sharp(data, { raw: { width: W, height: H, channels: CH } })
      .webp({ quality: 92, alphaQuality: 100 })
      .toBuffer()
    writeFileSync(src, buf)
  }
}

if (!APPLY && tiles.length) {
  const W = tiles[0].W, TH = 130, GAP = 8
  const comp = []
  tiles.forEach((t, i) => {
    comp.push({ input: t.before, top: i * (TH + GAP), left: 0 })
    comp.push({ input: t.after, top: i * (TH + GAP), left: W + 24 })
  })
  await sharp({
    create: { width: W * 2 + 24, height: tiles.length * (TH + GAP), channels: 4, background: { r: 13, g: 7, b: 22, alpha: 1 } },
  }).composite(comp).png().toFile(PREVIEW)
  console.log(`\npreview (left = before, right = after): ${PREVIEW}`)
}

console.log(`\n${touched}/${files.length} assets carried residue.${APPLY ? ' Rewritten; originals kept in scripts/_button-originals/.' : ' Dry run — pass --apply to write.'}`)
