// ————————————————————————————————————————————————————————————————
// LOOM — the two photographed pieces the service tile's strip is made of.
//
//   tape-cream   the woven cotton tape the label sits on   (opaque)
//   button-wool  the crocheted yarn button, the CTA        (ALPHA)
//
// Both come off Higgsfield as ~9 MB 2K PNGs. They render at ~400×56 and
// ~64×64 CSS pixels. Shipping the masters would cost more than every
// other image on the page put together.
//
// Format is webp, not avif. avif is ~20% smaller here but the button is
// the CTA on eight tiles above the fold, and avif's decode is measurably
// slower on the low-end phones this site actually gets — at 6 KB the
// bytes saved are worth less than the decode. webp alpha is universal.
//
//   node scripts/make-strip-assets.mjs
// ————————————————————————————————————————————————————————————————
import sharp from 'sharp'
import { stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DL = join(process.env.HOME, 'Downloads')
const IMG = join(ROOT, 'public/img/wool')

const SRC_BUTTON = join(DL, 'hf_20260807_220002_01177c82-07e3-46c7-8431-ae3a1d475ca7.png')
const SRC_TAPE = join(DL, 'hf_20260807_213316_ef9cc7ab-899d-4d49-b7d4-cb27b2c79f69 (1).png')

const kb = n => (n / 1024).toFixed(1) + ' KB'
const report = async (label, path, note = '') => {
  const { size } = await stat(path)
  const m = await sharp(path).metadata()
  console.log(`  ${label.padEnd(22)} ${String(m.width + '×' + m.height).padEnd(11)} ${kb(size).padStart(9)}   ${note}`)
}

console.log('\nsource:')
await report('button (png)', SRC_BUTTON)
await report('tape (png)', SRC_TAPE)

// ── the button ─────────────────────────────────────────────────────
// The render has NO alpha channel. The transparency checkerboard you can
// see in it is PAINTED IN — the model drew a grey-and-white chequer
// because that is what "transparent background" looks like in every
// reference image it has ever seen. Shipping it as-is puts a chequered
// square behind the CTA, and sharp's .trim() cannot help: every pixel is
// opaque, so there is nothing to trim.
//
// So cut it here. The chequer is perfectly achromatic (r == g == b) and
// the button is saturated pink, so chroma separates them cleanly where a
// luminance key would fail — the chequer's white squares and the cream
// thread in the button's centre sit at nearly the same brightness.
async function cutout(src) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const mask = new Uint8Array(w * h)

  for (let i = 0, p = 0; p < w * h; p++, i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const chroma = Math.max(r, g, b) - Math.min(r, g, b)
    mask[p] = chroma > 26 ? 1 : 0
  }

  // The button is a disc, so per-row span-fill closes it: everything
  // between the first and last solid run on a row is button, including
  // the cream thread X in the middle, which is nearly achromatic and
  // would otherwise punch a hole straight through the centre.
  // A run of 6 is what stops one stray jpeg-ish pixel opening a span
  // across an empty row.
  const alpha = new Uint8Array(w * h)
  const RUN = 6
  for (let y = 0; y < h; y++) {
    const row = y * w
    let first = -1, last = -1, run = 0
    for (let x = 0; x < w; x++) {
      if (mask[row + x]) { if (++run >= RUN && first < 0) first = x - RUN + 1 }
      else { if (run >= RUN) last = x - 1; run = 0 }
    }
    if (run >= RUN) last = w - 1
    if (first >= 0 && last > first) alpha.fill(255, row + first, row + last + 1)
  }

  // Blur the hard mask to get an antialiased edge, then pull the ramp
  // inward. Without the inward pull the outermost ring of pixels keeps
  // the chequer's grey mixed into it and the button ships with a white
  // halo — which is exactly what the first pass did.
  // toColourspace('b-w') is load-bearing: sharp promotes a 1-channel raw
  // input to 3-channel sRGB on the way out, so without it `soft` comes
  // back 3x too long, joinChannel is handed a buffer that does not match
  // the {channels:1} it was told about, and the result quietly has no
  // alpha at all — an opaque image and no error anywhere.
  const soft = await sharp(Buffer.from(alpha), { raw: { width: w, height: h, channels: 1 } })
    .blur(2.2).toColourspace('b-w').raw().toBuffer()
  for (let p = 0; p < soft.length; p++) {
    const v = (soft[p] / 255 - 0.62) / 0.30        // 0 below .62, 1 above .92
    soft[p] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255)
  }

  // TWO passes, and it has to be two. sharp runs its pipeline in a fixed
  // order regardless of call order, and trim happens near the START —
  // before joinChannel has attached the alpha. Chaining .trim() here
  // silently trims against the chequer's top-left pixel instead, matches
  // nothing, and hands back a full-size opaque image.
  // NO .removeAlpha() here. Same fixed-pipeline trap as trim: sharp runs
  // removeAlpha AFTER joinChannel, so it strips the alpha we just
  // attached and hands back a 3-channel image. The source has no alpha
  // to remove in the first place.
  const rgba = await sharp(src)
    .joinChannel(soft, { raw: { width: w, height: h, channels: 1 } })
    .png().toBuffer()

  return sharp(rgba).trim({ threshold: 1 }).png().toBuffer()
}

// 2 renders: 256 for the tile (64 CSS px at 4x — the fibre halo is the
// whole point of the asset and it is the first thing to mush), and 128
// for anywhere it is used small.
const trimmed = await cutout(SRC_BUTTON)

for (const w of [256, 128]) {
  await sharp(trimmed)
    .resize({ width: w, height: w, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    // effort 6 is the encoder's slowest useful setting. This runs once,
    // offline — there is no reason to leave bytes on the table.
    .webp({ quality: 88, alphaQuality: 92, effort: 6 })
    .toFile(join(IMG, `buttons/wool-button-${w}.webp`))
}

// ── the tape ───────────────────────────────────────────────────────
// The strip is ~7:1 and the tape source is ~2.4:1, so background-size:
// cover crops the middle band — which is exactly where the four dyed
// threads run. Cropping to that band HERE instead of in CSS means we
// ship a third of the pixels and the browser never decodes the rest.
const tapeMeta = await sharp(SRC_TAPE).metadata()
const bandH = Math.round(tapeMeta.height * 0.46)   // keeps all four threads + cream either side
await sharp(SRC_TAPE)
  .extract({
    left: 0,
    top: Math.round((tapeMeta.height - bandH) / 2),
    width: tapeMeta.width,
    height: bandH,
  })
  // 1100 wide covers the widest the strip ever renders (~420 CSS px) at 2.6x
  .resize({ width: 1100 })
  .webp({ quality: 82, effort: 6 })
  .toFile(join(IMG, 'tex/tape-cream.webp'))

// ── the tape, seamless ─────────────────────────────────────────────
// `cover` blows the weave up to ~4x its natural gauge on a 400px strip
// and the cloth stops reading as cloth. Tiling it at its own scale fixes
// that, but a tile needs its left and right edges to match or every
// repeat shows a hard vertical seam through the weave.
//
// So wrap it: cross-fade the last N columns onto the first N and drop
// the overlap. out(x) for x < N blends src(x) with src(x + W - N); the
// last column of the result then runs into the first without a join.
const band = await sharp(SRC_TAPE)
  .extract({ left: 0, top: Math.round((tapeMeta.height - bandH) / 2), width: tapeMeta.width, height: bandH })
  .resize({ width: 1100 })
  .raw().toBuffer({ resolveWithObject: true })

{
  const { data, info } = band
  const W = info.width, H = info.height, C = info.channels
  const N = 140                      // fade width, in output pixels
  const M = W - N                    // the seamless tile's width
  const out = Buffer.alloc(M * H * C)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < M; x++) {
      const o = (y * M + x) * C
      const a = (y * W + x) * C
      if (x < N) {
        const t = x / N
        const b = (y * W + (x + M)) * C
        for (let c = 0; c < C; c++) out[o + c] = Math.round(data[b + c] * (1 - t) + data[a + c] * t)
      } else {
        for (let c = 0; c < C; c++) out[o + c] = data[a + c]
      }
    }
  }
  await sharp(out, { raw: { width: M, height: H, channels: C } })
    .webp({ quality: 82, effort: 6 })
    .toFile(join(IMG, 'tex/tape-tile.webp'))
}

console.log('\nshipped:')
await report('wool-button-256', join(IMG, 'buttons/wool-button-256.webp'), 'the CTA')
await report('wool-button-128', join(IMG, 'buttons/wool-button-128.webp'), 'small use')
await report("tape-cream", join(IMG, "tex/tape-cream.webp"), "the strip")
await report("tape-tile", join(IMG, "tex/tape-tile.webp"), "seamless, repeat-x")
console.log()
