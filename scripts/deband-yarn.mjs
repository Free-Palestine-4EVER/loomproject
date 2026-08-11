/**
 * scripts/deband-yarn.mjs — one-off asset repair. Run once; originals are in git.
 *
 * WHAT WAS WRONG. Every yarn slice in static/img/wool/yarn/<colour>/ shipped
 * with a pale rectangle baked into its PIXELS: rows 41–94 of the 135px slice
 * carried a hazy white veil with knife-hard edges, starting part-way into
 * yarn-cap-l, crossing the whole of yarn-mid, and ending part-way into
 * yarn-cap-r — i.e. one rectangle drawn across the original spool photograph
 * before the slices were cut out of it. It survived the recolour into all
 * seven yarns, so EVERY .wool-btn--css on the site painted a pale box across
 * its own middle. The client flagged it on the gold "Check my business"
 * button: "some shit around it".
 *
 * WHY IT IS NOT A SIMPLE MULTIPLY. The veil raises the level AND flattens the
 * contrast — the grey yarn, the only one with no near-zero channel to confuse
 * the measurement, reads as a ~23% white overlay: mean +34 with the texture's
 * standard deviation falling 15.3 → 12.4. Dividing the band by a single gain
 * (the first attempt) matched the level and left the haze, so the rectangle
 * was still plainly visible. The recolour is non-linear, so the veil's
 * strength also differs per yarn and per channel and cannot be hard-coded.
 *
 * THE REPAIR. Split each slice into a low-frequency shading component (a wide
 * horizontal box blur — the yarn's strands are vertical, so averaging across
 * them leaves the cylinder's lighting) and the high-frequency fibre detail.
 *   · the veil's contribution to the shading is measured at BOTH edges, by
 *     comparing the first banded row against the clean rows above it
 *     extrapolated forward (and symmetrically at the bottom), then removed as
 *     a ramp between the two — which makes the seam continuous by
 *     construction, rather than merely close;
 *   · the fibre detail inside the band is rescaled by the ratio of its own
 *     standard deviation to that of the clean yarn just outside, restoring the
 *     contrast the veil washed out;
 *   · both are applied through an x mask derived from the size of the
 *     luminance step across y=41, so the caps' uncovered halves are untouched.
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'static/img/wool/yarn'
const Y0 = 41            // first banded row
const Y1 = 95            // first clean row after the band
const SLOPE = 8          // rows used to extrapolate the shading into the band
const BLUR_X = 13        // half-width of the horizontal box blur
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b

for (const colour of fs.readdirSync(ROOT)) {
  /* yarn-mid FIRST, and its numbers are then reused for the two caps.
     The veil is one rectangle drawn across one photograph, so its strength is
     the same in all three slices — but only yarn-mid can measure it honestly:
     it is a flat run of cylinder, where the rows just above and just below the
     band really are the same surface. A cap is a hemisphere whose shading
     curves through exactly that range, so measuring it locally read part of
     the cap's own falloff as veil and left a visible lighter wedge on both
     ends of every pill. */
  let fromMid = null
  for (const slice of ['yarn-mid', 'yarn-cap-l', 'yarn-cap-r']) {
    const src = path.join(ROOT, colour, `${slice}.webp`)
    if (!fs.existsSync(src)) continue
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width: W, height: H, channels: C } = info
    if (H !== 135) { console.log('skip (unexpected height)', src, H); continue }
    const at = (x, y, c) => data[(y * W + x) * C + c]

    // ── 1. which columns does the rectangle cover? ──────────────────────────
    const step = []
    for (let x = 0; x < W; x++) {
      let a = 0, b = 0
      for (let y = Y0; y < Y0 + 4; y++) a += lum(at(x, y, 0), at(x, y, 1), at(x, y, 2))
      for (let y = Y0 - 5; y < Y0 - 1; y++) b += lum(at(x, y, 0), at(x, y, 1), at(x, y, 2))
      step.push((a - b) / 4)
    }
    const sm = step.map((_, x) => {
      let s = 0, n = 0
      for (let i = -5; i <= 5; i++) { const j = x + i; if (j >= 0 && j < W) { s += step[j]; n++ } }
      return s / n
    })
    const peak = Math.max(...sm)
    if (peak < 12) { console.log('no band found in', src); continue }
    // The rectangle's vertical edge is pixel-hard in the source, so the mask
    // is a threshold with a 2px feather, not a ramp: an earlier soft ramp left
    // the left cap only half-corrected and put a visible lighter wedge back on
    // the end of every pill.
    const edgeX = []
    for (let x = 0; x < W; x++) edgeX.push(sm[x] > peak * 0.5 ? 1 : 0)
    const mask = edgeX.map((_, x) => {
      let s = 0, n = 0
      for (let i = -2; i <= 2; i++) { const j = x + i; if (j >= 0 && j < W) { s += edgeX[j]; n++ } }
      return s / n
    })

    // ── 2. split shading from fibre ────────────────────────────────────────
    // Horizontal box blur only: the strands run vertically, so this averages
    // the fibre away while leaving the cylinder's top-to-bottom falloff — the
    // one thing the repair has to reconstruct — completely intact.
    const low = new Float64Array(W * H * 3)
    for (let y = 0; y < H; y++) {
      for (let c = 0; c < 3; c++) {
        for (let x = 0; x < W; x++) {
          let s = 0, n = 0
          for (let i = -BLUR_X; i <= BLUR_X; i++) {
            const j = Math.min(W - 1, Math.max(0, x + i))
            s += at(j, y, c); n++
          }
          low[(y * W + x) * 3 + c] = s / n
        }
      }
    }
    const LO = (x, y, c) => low[(y * W + x) * 3 + c]

    // ── 3. how much shading did the veil add, at each edge? ────────────────
    const veilTop = new Float64Array(W * 3)
    const veilBot = new Float64Array(W * 3)
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) {
        const slopeA = (LO(x, Y0 - 1, c) - LO(x, Y0 - 1 - SLOPE, c)) / SLOPE
        veilTop[x * 3 + c] = LO(x, Y0, c) - (LO(x, Y0 - 1, c) + slopeA)
        const slopeB = (LO(x, Y1 + SLOPE, c) - LO(x, Y1, c)) / SLOPE
        veilBot[x * 3 + c] = LO(x, Y1 - 1, c) - (LO(x, Y1, c) - slopeB)
      }
    }

    // ── 4. how much contrast did it eat? ───────────────────────────────────
    // Measured on the detail layer, so the cylinder's own falloff cannot
    // masquerade as texture. Sampled in the 10 rows either side of each edge.
    const detailSd = (y0, y1) => {
      let n = 0, s = 0, ss = 0
      for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
        if (mask[x] < 0.9 || at(x, y, 3) < 250) continue
        const v = lum(at(x, y, 0), at(x, y, 1), at(x, y, 2)) - lum(LO(x, y, 0), LO(x, y, 1), LO(x, y, 2))
        n++; s += v; ss += v * v
      }
      return n > 50 ? Math.sqrt(ss / n - (s / n) ** 2) : null
    }
    const clean = [detailSd(Y0 - 11, Y0 - 1), detailSd(Y1 + 1, Y1 + 11)].filter(Boolean)
    const inside = [detailSd(Y0 + 1, Y0 + 11), detailSd(Y1 - 11, Y1 - 1)].filter(Boolean)
    let k = 1
    if (clean.length && inside.length) {
      const avg = (a) => a.reduce((p, q) => p + q, 0) / a.length
      k = Math.max(1, Math.min(1.9, avg(clean) / avg(inside)))
    }

    // adopt yarn-mid's measurement on the caps (see the note at the top of the
    // colour loop); yarn-mid keeps its own, since it is the one that measured
    if (slice === 'yarn-mid') {
      const mean = (arr, c) => {
        let s = 0, n = 0
        for (let x = 0; x < W; x++) if (mask[x] > 0.9) { s += arr[x * 3 + c]; n++ }
        return n ? s / n : 0
      }
      fromMid = { k, top: [0, 1, 2].map((c) => mean(veilTop, c)), bot: [0, 1, 2].map((c) => mean(veilBot, c)) }
    } else if (fromMid) {
      k = fromMid.k
      for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
        veilTop[x * 3 + c] = fromMid.top[c]
        veilBot[x * 3 + c] = fromMid.bot[c]
      }
    }

    // ── 5. put it back ─────────────────────────────────────────────────────
    const out = Buffer.from(data)
    for (let y = Y0; y < Y1; y++) {
      const t = (y - Y0) / (Y1 - 1 - Y0)
      for (let x = 0; x < W; x++) {
        const m = mask[x]
        if (m <= 0) continue
        for (let c = 0; c < 3; c++) {
          const kk = (y * W + x) * C + c
          const veil = (veilTop[x * 3 + c] * (1 - t) + veilBot[x * 3 + c] * t) * m
          const lo = LO(x, y, c) - veil
          const hi = (data[kk] - LO(x, y, c)) * (1 + (k - 1) * m)
          out[kk] = Math.max(0, Math.min(255, Math.round(lo + hi)))
        }
      }
    }

    const img = sharp(out, { raw: { width: W, height: H, channels: C } })
    await img.clone().webp({ quality: 92, alphaQuality: 100 }).toFile(src + '.tmp')
    fs.renameSync(src + '.tmp', src)
    const avif = src.replace(/\.webp$/, '.avif')
    if (fs.existsSync(avif)) {
      await img.clone().avif({ quality: 62 }).toFile(avif + '.tmp')
      fs.renameSync(avif + '.tmp', avif)
    }
    console.log(`${colour}/${slice}  detail x${k.toFixed(2)}  veil@top ${[0,1,2].map(c=>veilTop[Math.round(W*0.6)*3+c].toFixed(0)).join('/')}`)
  }
}
