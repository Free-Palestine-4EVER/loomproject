// Cut the dark-purple backdrop out of the Manifesto laptop/mascot render.
//
//   node scripts/clean-manifesto-alpha.mjs [in] [out]
//
// public/img/manifesto/laptop-mascot.webp is a MacBook + yarn-ball mascot
// composited over a soft, UNEVEN dark-purple backdrop (near var(--bg)
// #0d0716 in the corners, with at least one local warm glow patch behind the
// mascot) baked in as an opaque rectangle. It was "matte-matched to the
// page" (see src/styles.css) but the page itself isn't a flat fill
// (body::after adds grain), so the image's rectangle edge still shows as a
// box against the section.
//
// Two simpler approaches were tried and rejected:
//   - a single quadratic gradient surface fit to the border ring: too rigid
//     to reproduce the local glow blob, which then gets miskeyed as subject.
//   - a neighbour-relative flood fill from the border: the metal laptop
//     chassis has its own slow reflection gradients that are individually
//     under any usable per-step tolerance, so the fill creeps straight
//     through the chassis edge and eats the subject.
//
// What works: solve for the actual backdrop as a HARMONIC field — a Laplace
// equation with the confirmed-background outer ring as fixed (Dirichlet)
// boundary values, relaxed on a coarse grid (cheap, fully converges) and
// upsampled. A harmonic function is the smoothest possible surface that
// still matches the boundary exactly, so it reconstructs both the broad
// vignette AND the local glow (since the ring itself brightens near it)
// without the rigid shape of a low-order polynomial. Every pixel is then
// compared against its own predicted-background colour, with a distance
// ramp (LO..HI) so the cut feathers instead of stair-stepping.

import sharp from 'sharp'

const IN = process.argv[2] ?? 'public/img/manifesto/laptop-mascot.webp'
const OUT = process.argv[3] ?? 'public/img/manifesto/laptop-mascot-cutout.webp'

const GRID = 6           // downsample factor for the relaxation grid
const ITERS = 1200       // Gauss-Seidel sweeps (small grid, converges cleanly)
const LO = 14            // colour-distance at/below which a pixel is pure backdrop
const HI = 90            // colour-distance at/above which a pixel is pure subject
const MIN_ISLAND = 250   // stray fully-transparent-adjacent islands smaller than this are noise

const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h, channels: ch } = info
const n = w * h

// ---- 1. build the coarse relaxation grid ----
const GW = Math.ceil(w / GRID)
const GH = Math.ceil(h / GRID)
const gn = GW * GH
const fixed = new Uint8Array(gn)
const gr = new Float64Array(gn)
const gg = new Float64Array(gn)
const gb = new Float64Array(gn)

function srcPixel(x, y) {
  x = Math.max(0, Math.min(w - 1, x))
  y = Math.max(0, Math.min(h - 1, y))
  const i = (y * w + x) * ch
  return [data[i], data[i + 1], data[i + 2]]
}

for (let gy = 0; gy < GH; gy++) {
  for (let gx = 0; gx < GW; gx++) {
    const onBorder = gx === 0 || gy === 0 || gx === GW - 1 || gy === GH - 1
    if (!onBorder) continue
    const idx = gy * GW + gx
    // sample a real background pixel from the confirmed-pure outer ring,
    // near this cell's edge-facing side
    const x = gx === 0 ? 2 : gx === GW - 1 ? w - 3 : gx * GRID + (GRID >> 1)
    const y = gy === 0 ? 2 : gy === GH - 1 ? h - 3 : gy * GRID + (GRID >> 1)
    const [r, g, b] = srcPixel(x, y)
    fixed[idx] = 1
    gr[idx] = r; gg[idx] = g; gb[idx] = b
  }
}

// interior cells start from the mean of the boundary as a neutral seed
let meanR = 0, meanG = 0, meanB = 0, cnt = 0
for (let i = 0; i < gn; i++) if (fixed[i]) { meanR += gr[i]; meanG += gg[i]; meanB += gb[i]; cnt++ }
meanR /= cnt; meanG /= cnt; meanB /= cnt
for (let i = 0; i < gn; i++) if (!fixed[i]) { gr[i] = meanR; gg[i] = meanG; gb[i] = meanB }

// ---- 2. Gauss-Seidel relax the Laplace equation on the grid ----
for (let it = 0; it < ITERS; it++) {
  for (let gy = 1; gy < GH - 1; gy++) {
    for (let gx = 1; gx < GW - 1; gx++) {
      const idx = gy * GW + gx
      if (fixed[idx]) continue
      const l = idx - 1, r = idx + 1, u = idx - GW, d = idx + GW
      gr[idx] = (gr[l] + gr[r] + gr[u] + gr[d]) / 4
      gg[idx] = (gg[l] + gg[r] + gg[u] + gg[d]) / 4
      gb[idx] = (gb[l] + gb[r] + gb[u] + gb[d]) / 4
    }
  }
}

// ---- 3. bilinear-upsample the grid back to full resolution ----
function sampleGrid(arr, fx, fy) {
  const gx0 = Math.max(0, Math.min(GW - 1, Math.floor(fx)))
  const gy0 = Math.max(0, Math.min(GH - 1, Math.floor(fy)))
  const gx1 = Math.min(GW - 1, gx0 + 1)
  const gy1 = Math.min(GH - 1, gy0 + 1)
  const tx = fx - gx0, ty = fy - gy0
  const v00 = arr[gy0 * GW + gx0], v10 = arr[gy0 * GW + gx1]
  const v01 = arr[gy1 * GW + gx0], v11 = arr[gy1 * GW + gx1]
  const top = v00 + (v10 - v00) * tx
  const bot = v01 + (v11 - v01) * tx
  return top + (bot - top) * ty
}

// ---- 4. classify every pixel by distance from its predicted background ----
let cleared = 0
for (let y = 0; y < h; y++) {
  const fy = y / GRID - 0.5
  for (let x = 0; x < w; x++) {
    const fx = x / GRID - 0.5
    const pr = sampleGrid(gr, fx, fy)
    const pg = sampleGrid(gg, fx, fy)
    const pb = sampleGrid(gb, fx, fy)
    const i = (y * w + x) * ch
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const dist = Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2)
    let a
    if (dist <= LO) a = 0
    else if (dist >= HI) a = 255
    else a = Math.round((255 * (dist - LO)) / (HI - LO))
    if (a < 255) cleared++
    data[i + 3] = a
  }
}

// ---- 5. drop small stray fully-opaque islands (isolated dust) ----
const seen = new Uint8Array(n)
let dropped = 0
for (let start = 0; start < n; start++) {
  if (seen[start] || data[start * ch + 3] < 128) continue
  const island = []
  const stack = [start]
  seen[start] = 1
  while (stack.length) {
    const idx = stack.pop()
    island.push(idx)
    const x = idx % w
    const y = (idx / w) | 0
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return
      const j = ny * w + nx
      if (seen[j] || data[j * ch + 3] < 128) return
      seen[j] = 1
      stack.push(j)
    }
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
  if (island.length < MIN_ISLAND) {
    for (const idx of island) data[idx * ch + 3] = 0
    dropped += island.length
  }
}

// ---- 6. patch small interior holes (self-shadow creases inside the subject
// — e.g. between the mascot's arm and body — that are dark/desaturated
// enough to read as backdrop by colour alone, but don't touch the frame
// border so they can't actually be backdrop) ----
const HOLE_MAX = 40000
const seen2 = new Uint8Array(n)
let patched = 0
for (let start = 0; start < n; start++) {
  if (seen2[start] || data[start * ch + 3] >= 128) continue
  const island = []
  const stack = [start]
  seen2[start] = 1
  let touchesBorder = false
  while (stack.length) {
    const idx = stack.pop()
    island.push(idx)
    const x = idx % w
    const y = (idx / w) | 0
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesBorder = true
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return
      const j = ny * w + nx
      if (seen2[j] || data[j * ch + 3] >= 128) return
      seen2[j] = 1
      stack.push(j)
    }
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
  if (!touchesBorder && island.length < HOLE_MAX) {
    for (const idx of island) data[idx * ch + 3] = 255
    patched += island.length
  }
}

const meta = await sharp(data, { raw: { width: w, height: h, channels: ch } })
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(OUT)

console.log(`${OUT}  ${meta.width}x${meta.height}  ${Math.round(meta.size / 1024)}kB  (${cleared} px touched by the ramp, ${dropped} stray px erased, ${patched} interior px patched back opaque)`)
