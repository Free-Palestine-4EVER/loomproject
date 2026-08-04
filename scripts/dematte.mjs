// De-matte the wool renders.
//
// The knit buttons and felt icons were photographed on white and cut out
// badly: the original contact shadow was left in. It survives as a neutral
// grey band — still FULLY OPAQUE (alpha 255) — hugging the bottom and sides
// of every pill, plus a few small square "notch" tabs along the bottom edge
// (leftover mount tabs from the same cutout pass). On the site's near-black
// background that band reads as a grey plate around every button.
//
//   node scripts/dematte.mjs [--dry]
//
// Always reads from assets-src/wool-original/ (pristine backups, never
// written to) and writes to the live buttons/ and icons/ paths, so the pass
// is idempotent and safe to re-tune and re-run.
//
// ── Two approaches were tried first and both failed. Do not retry them. ──
//
// 1. COLOUR THRESHOLD, flooded inward from the border ("background if
//    alpha<=24 || (chroma<=34 && luma<=205)"). This looks reasonable until
//    you check it against real pixels: ordinary knit texture — the actual
//    yarn, not the shadow — spends huge stretches of every row inside that
//    same chroma/luma window. A cream pill's own ridges dip through
//    luma 130-205 constantly, and grey wool sits at chroma 0-15 all the
//    time. The only thing stopping the flood from consuming the *entire*
//    piece was the handful of bright specular-highlight pixels (luma>205)
//    that happened to wall off a path — and wherever the flood found a gap
//    around those walls it poured through, eating the highlight's own
//    fading edge and hollowing out whatever was past it. Measured result:
//    cancel.webp and log-out.webp almost entirely erased (71% of log-out).
//    Colour alone cannot separate "shadow" from "wool" here, at any
//    threshold, because their value ranges genuinely overlap.
// 2. LOCAL TEXTURE (5x5 std-dev, then multi-scale |luma - blur(luma)|
//    energy), hoping the shadow's smoothness would set it apart from knit
//    texture. It does not, in either direction. At 5x5 a cream specular
//    highlight (genuinely smooth, sd 5.1) reads *smoother* than an actual
//    shadow band on grey wool (sd 15.4 — the shadow still carries the knit's
//    own luma ripple, just desaturated). At larger radii the reverse
//    problem shows up: the highlight and the shadow both read as smooth
//    low-energy patches, so a texture-only rule keeps confusing the two.
//
// ── What works: geometry, not colour ──
//
// Every button is photographed as a near-perfect stadium/capsule (a
// rectangle with semicircular ends); every icon is a near-perfect circle.
// Both have a knit or twisted-rope trim tracing the TRUE outer edge. The
// baked-in shadow is a soft skirt that only ever ADDS area outside that
// true silhouette — bulging at the bottom and sides, plus the odd notch
// tab — and never removes any. The top edge is always clean (the light in
// every source photo comes from above), so it can be trusted completely.
//
// So: measure the top edge precisely (median across the central columns,
// well clear of the rounded ends), then find the true half-height by a
// containment search rather than by assuming a perfect semicircle. For a
// candidate total height T, mirror the trusted top curve about
// (topEdge + T) and check whether that mirrored curve fits entirely inside
// the actually-observed (shadow-inclusive) opaque region. It always does
// for T at or below the true size — the shadow can only have made the
// observed region bigger, never smaller — and it stops fitting once T
// overshoots, because past the true silhouette there is no more shadow
// material to satisfy an ever-larger mirrored curve. The largest T that
// still fits is the true height. This needs no assumption that the cap is
// a perfect circle (some of these aren't, exactly) and never looks at a
// single pixel of colour, so it can't be fooled by cream-on-cream or
// grey-on-grey the way the colour rule was.
//
// A capsule with that fitted height (plus a couple of pixels of slack for
// rope twist and antialiasing) is the keep mask. Everything originally
// opaque but outside it — the shadow skirt, the notch tabs — is dropped.
//
// One gap remains: on a handful of pieces the baked shadow is itself
// roughly pill-shaped (a fairly even light casts a shadow that echoes the
// object's own silhouette), so a *few* pixels of pale rim survive geometry
// alone — indistinguishable, by shape, from "the pill is just slightly
// bigger". Those are cleaned up with a second, narrow pass: only within a
// thin band next to the already-tight geometric edge, require chroma above
// a floor set relative to *that image's own* interior chroma (not a global
// constant — a saturated purple button and a near-neutral grey one need
// completely different floors). Because it only ever touches a shallow
// band right at an edge that geometry has already pulled in tight, it
// can't runaway-erode the piece the way the global flood fill did.
//
// ── A sharp gotcha that bit the first attempt too ──
//
// sharp's .blur() on a single-channel raw buffer silently upgrades the
// output to 3 channels (it round-trips through sRGB). Reading the result
// back as if it were still 1 byte/pixel misaligns every read by a factor
// of 3 partway through each row, which shows up as a sheared, diagonal
// corruption of the mask — not a crash, just wrong pixels. Force it back
// with .toColourspace('b-w') before .raw() whenever blurring a mask.

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC_DIRS = ['public/img/wool/buttons', 'public/img/wool/icons']
// NOT under public/ — Vite copies that directory verbatim into dist/, so the
// backups lived in every production build (1.5 MB of images no page requests).
const BACKUP = path.join(ROOT, 'assets-src/wool-original')
const DRY = process.argv.includes('--dry')

const ALPHA_BG = 16     // already-transparent cutoff
const MARGIN = 2        // px of slack added to the fitted silhouette radius
const BAND = 9          // px near the fitted edge where the colour mop-up also applies
const CHROMA_RATIO = 0.45 // mop-up chroma floor, relative to this image's own interior chroma
const CHROMA_FLOOR_MIN = 6
const FEATHER = 1.2     // px, final edge blur

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const n = s.length
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

// Fit a capsule (cx, cy, half-width a, half-height b) to the opaque mask,
// trusting only the top arc. See the header comment for the containment
// search that finds b without assuming the cap is a perfect semicircle.
function fitCapsule(data, W, H, C) {
  const leftX = new Int32Array(H).fill(-1)
  const rightX = new Int32Array(H).fill(-1)
  for (let y = 0; y < H; y++) {
    let l = -1, r = -1
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * C + 3] > ALPHA_BG) { if (l < 0) l = x; r = x }
    }
    leftX[y] = l; rightX[y] = r
  }
  const topY = new Int32Array(W).fill(-1)
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (data[(y * W + x) * C + 3] > ALPHA_BG) { topY[x] = y; break }
    }
  }

  // Top edge: median over the central ~24% of the width, safely inside the
  // flat top and clear of the rounded ends' curvature.
  const roughCx = W / 2
  const span = Math.round(W * 0.12)
  const centralTops = []
  for (let x = Math.round(roughCx - span); x <= Math.round(roughCx + span); x++) {
    if (topY[x] >= 0) centralTops.push(topY[x])
  }
  const topMed = median(centralTops)

  // Trusted top-curve samples, used both to test candidate heights and to
  // read off the true centre-x.
  const K = Math.min(0.42 * H, 110)
  const topRows = []
  for (let dy = 0; dy <= K; dy++) {
    const y = Math.round(topMed + dy)
    if (y < H && leftX[y] >= 0) topRows.push({ dy, l: leftX[y], r: rightX[y] })
  }

  // Containment search: the largest total height T for which mirroring the
  // top curve about (topMed + T) still lands entirely inside the observed
  // (shadow-inclusive) mask. TOL absorbs stray fibre/antialiasing noise.
  const TOL = 2
  let bestT = null
  for (let T = Math.round(H * 0.5); T <= Math.round(H * 1.5); T++) {
    let viol = 0, n = 0
    for (const row of topRows) {
      const ybot = Math.round(topMed + T - row.dy)
      if (ybot < 0 || ybot >= H) { viol += 1000; continue }
      const al = leftX[ybot], ar = rightX[ybot]
      if (al < 0) { viol += 1000; continue }
      viol += Math.max(0, (al - TOL) - row.l) + Math.max(0, row.r - (ar + TOL))
      n++
    }
    if (n < topRows.length * 0.9) continue
    if (viol < 1) bestT = T
  }

  const b = bestT != null ? bestT / 2 : H / 2 - topMed / 2
  const cy = topMed + b
  const cx = median(topRows.map((r) => (r.l + r.r) / 2))
  let a = 0
  for (let y = 0; y < H; y++) if (rightX[y] - leftX[y] > a) a = rightX[y] - leftX[y]
  a /= 2

  return { cx, cy, a, b }
}

async function dematte(rel) {
  const abs = path.join(ROOT, rel)
  const backup = path.join(BACKUP, path.basename(path.dirname(rel)), path.basename(rel))
  if (!fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(backup), { recursive: true })
    fs.copyFileSync(abs, backup)
  }

  const { data, info } = await sharp(backup).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = info.channels

  const { cx, cy, a, b } = fitCapsule(data, W, H, C)
  const s = Math.max(0, a - b)       // half-length of the capsule's flat spine
  const radius = b + MARGIN

  // This image's own interior chroma, sampled safely inside the fitted
  // silhouette (25px clear of the edge) — the reference the mop-up band
  // measures against, so a saturated and a near-neutral piece each get a
  // sensible floor instead of one global constant.
  const interiorChroma = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x
      if (data[p * C + 3] <= ALPHA_BG) continue
      const cxx = Math.min(Math.max(x, cx - s), cx + s)
      if (radius - Math.hypot(x - cxx, y - cy) < 25) continue
      const i = p * C
      interiorChroma.push(Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]))
    }
  }
  const chromaFloor = Math.max(CHROMA_FLOOR_MIN, (interiorChroma.length ? median(interiorChroma) : 30) * CHROMA_RATIO)

  const mask = Buffer.alloc(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x
      if (data[p * C + 3] <= ALPHA_BG) continue
      const cxx = Math.min(Math.max(x, cx - s), cx + s)
      const dist = Math.hypot(x - cxx, y - cy)
      if (dist > radius) continue // outside the true silhouette: shadow skirt / notch tab
      if (radius - dist <= BAND) {
        const i = p * C
        const chroma = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2])
        if (chroma < chromaFloor) continue // thin residual rim the geometry alone couldn't tell from wool
      }
      mask[p] = 255
    }
  }

  // Feather ~1px so the new edge is anti-aliased, not stair-stepped.
  // .toColourspace('b-w') undoes sharp's channel-expansion on blur() of a
  // single-channel buffer — see header comment. Without it this silently
  // reads garbage and shears the whole mask.
  const soft = await sharp(mask, { raw: { width: W, height: H, channels: 1 } })
    .blur(FEATHER).toColourspace('b-w').raw().toBuffer()

  let removed = 0, total = 0
  const out = Buffer.alloc(W * H * 4)
  for (let p = 0; p < W * H; p++) {
    const i = p * C, o = p * 4
    const origA = data[i + 3]
    // min(originalAlpha, mask) keeps opaque interiors at a true 255.
    const newA = Math.min(origA, soft[p])
    if (origA > ALPHA_BG) { total++; if (newA <= ALPHA_BG) removed++ }
    out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]; out[o + 3] = newA
  }

  const pct = total ? (100 * removed / total).toFixed(1) : '0.0'
  console.log(`  ${path.basename(rel).padEnd(30)} ${W}x${H}  stripped ${pct}%`)
  if (DRY) return

  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100 }).toFile(abs)
}

for (const dir of SRC_DIRS) {
  console.log(dir)
  const files = fs.readdirSync(path.join(ROOT, dir)).filter((f) => /\.webp$/i.test(f))
  for (const f of files) await dematte(path.join(dir, f))
}
console.log(DRY ? '\ndry run — nothing written' : '\ndone')
