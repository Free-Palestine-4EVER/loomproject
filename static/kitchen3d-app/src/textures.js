/**
 * textures.js — every surface in this kitchen is drawn here, at runtime.
 *
 * No image files ship with this configurator. Marble, timber, fluting, brushed
 * brass, micro-cement and the terrazzo floor are all generated onto <canvas>
 * and handed to three.js as textures. That keeps the whole build under a
 * megabyte of source and means a new finish is a few numbers, not a 4K download.
 *
 * Three rules learned the hard way, encoded here:
 *
 *  1. COLOUR AND RELIEF ARE DIFFERENT SIGNALS. A wood that only varies in
 *     colour reads as printed cardboard. Every material below builds a HEIGHT
 *     field first and derives colour, roughness and normal from it separately —
 *     the pores are darker AND lower AND rougher, which is what the eye checks.
 *
 *  2. THE DOMAIN WARP MUST EXCEED THE BAND SPACING. Grain and veining are made
 *     by warping a stripe function. If the warp amplitude is smaller than the
 *     distance between stripes you get wavy wallpaper, not timber. Warp is
 *     always specified as a MULTIPLE of the band period.
 *
 *  3. COLOUR MAPS ARE sRGB, DATA MAPS ARE NOT. Roughness/normal/AO carry
 *     measurements, not colour. Tagging them sRGB silently gamma-shifts the
 *     numbers and every surface comes out too glossy.
 */

import * as THREE from 'three'

/* ------------------------------------------------------------------ noise -- */

// Small deterministic PRNG. Same finish must look identical on every reload —
// a random-per-load veining pattern makes the "compare two worktops" flow lie.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SIZE = 256                      // permutation grid; tiles at SIZE
function makeNoise(seed) {
  const rnd = mulberry32(seed)
  const g = new Float32Array(SIZE * SIZE)
  for (let i = 0; i < g.length; i++) g[i] = rnd()

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)

  // Value noise, wrapping — so every texture tiles seamlessly at integer UVs.
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = x - xi, yf = y - yi
    const x0 = ((xi % SIZE) + SIZE) % SIZE, y0 = ((yi % SIZE) + SIZE) % SIZE
    const x1 = (x0 + 1) % SIZE, y1 = (y0 + 1) % SIZE
    const u = fade(xf), v = fade(yf)
    const a = g[y0 * SIZE + x0], b = g[y0 * SIZE + x1]
    const c = g[y1 * SIZE + x0], d = g[y1 * SIZE + x1]
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v
  }

  function fbm(x, y, octaves = 5, lac = 2.0, gain = 0.5) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x * freq, y * freq)
      norm += amp
      amp *= gain; freq *= lac
    }
    return sum / norm
  }

  // Ridged noise — the sharp creases that read as mineral rather than cloud.
  function ridge(x, y, octaves = 4) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(noise(x * freq, y * freq) * 2 - 1)
      sum += amp * n * n
      norm += amp
      amp *= 0.5; freq *= 2
    }
    return sum / norm
  }

  return { noise, fbm, ridge, rnd }
}

/* ------------------------------------------------------------- canvas i/o -- */

function canvas(res) {
  const c = document.createElement('canvas')
  c.width = c.height = res
  return c
}

function toTexture(cv, { srgb = false, repeat = 1, aniso = 16 } = {}) {
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = aniso
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.needsUpdate = true
  return t
}

/**
 * Sobel a height field into a tangent-space normal map.
 * `strength` is in height-units per texel — the single dial that decides
 * whether a surface reads as a photograph of relief or as actual relief.
 */
function heightToNormal(height, res, strength) {
  const cv = canvas(res)
  const ctx = cv.getContext('2d')
  const img = ctx.createImageData(res, res)
  const d = img.data
  const at = (x, y) => height[(((y % res) + res) % res) * res + (((x % res) + res) % res)]

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      // Sobel is worth the extra taps here: a 2-tap gradient aliases badly on
      // the fine grain frequencies and the flutes shimmer under camera motion.
      const dx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1))
      const dy =
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1))

      let nx = -dx * strength, ny = -dy * strength, nz = 1
      const len = Math.hypot(nx, ny, nz)
      nx /= len; ny /= len; nz /= len

      const i = (y * res + x) * 4
      d[i] = (nx * 0.5 + 0.5) * 255
      d[i + 1] = (ny * 0.5 + 0.5) * 255
      d[i + 2] = (nz * 0.5 + 0.5) * 255
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return cv
}

// Writes a single-channel field into a canvas as greyscale (roughness, AO…).
function fieldToCanvas(field, res, lo = 0, hi = 1) {
  const cv = canvas(res)
  const ctx = cv.getContext('2d')
  const img = ctx.createImageData(res, res)
  const d = img.data
  for (let i = 0; i < field.length; i++) {
    const v = Math.max(0, Math.min(1, lo + field[i] * (hi - lo))) * 255
    const j = i * 4
    d[j] = d[j + 1] = d[j + 2] = v
    d[j + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return cv
}

// sRGB hex -> linear-ish RGB triple we can lerp in without the mid-tones
// washing out. Mixing two colours in gamma space is why cheap procedural
// marble goes chalky exactly where the vein meets the ground.
function hexToLin(hex) {
  const c = new THREE.Color(hex).convertSRGBToLinear()
  return [c.r, c.g, c.b]
}
function linToSrgbByte(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, c * 255))
}

/* ----------------------------------------------------------------- marble -- */

/**
 * Stone. The vein network is ridged noise run through a warped coordinate
 * field, then thresholded twice: once wide and soft for the mineral haze, once
 * tight and bright for the hairline that actually catches the light.
 */
export function marble({
  res = 1024,
  seed = 7,
  base = '#2b2b30',
  haze = '#3a3a42',
  vein = '#c9a06a',
  hairline = '#e8d9bf',
  scale = 2.2,
  warp = 1.6,
  veinSharpness = 9,
  polish = 0.06,          // final roughness of the slab
} = {}) {
  const { fbm, ridge } = makeNoise(seed)
  const cv = canvas(res)
  const ctx = cv.getContext('2d')
  const img = ctx.createImageData(res, res)
  const d = img.data
  const height = new Float32Array(res * res)
  const rough = new Float32Array(res * res)

  const cBase = hexToLin(base), cHaze = hexToLin(haze)
  const cVein = hexToLin(vein), cHair = hexToLin(hairline)

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = (x / res) * scale, v = (y / res) * scale

      // Two-stage domain warp. One stage gives smooth waves; the second is what
      // produces the branching, non-repeating vein junctions real stone has.
      const w1x = fbm(u * 1.7 + 11.3, v * 1.7 + 4.1, 4)
      const w1y = fbm(u * 1.7 - 6.7, v * 1.7 + 19.4, 4)
      const w2x = fbm(u * 4.3 + w1x * 3.0, v * 4.3 + w1y * 3.0, 3)
      const w2y = fbm(u * 4.3 - w1y * 3.0, v * 4.3 + w1x * 3.0, 3)

      const wu = u + warp * (w1x - 0.5) * 2 + warp * 0.35 * (w2x - 0.5) * 2
      const wv = v + warp * (w1y - 0.5) * 2 + warp * 0.35 * (w2y - 0.5) * 2

      const r = ridge(wu * 1.15, wv * 1.15, 5)

      // THREE vein scales, not two. Real stone has a broad mineral haze, a
      // primary vein network, and a fine capillary web branching off it — and
      // it is the third one that makes it read as stone rather than as marbled
      // paper. Rendering only the first two gives soft coloured smears, which
      // is what this looked like before: recognisably "marble-ish", recognisably
      // not marble.
      const rFine = ridge(wu * 4.3 + 31.7, wv * 4.3 - 12.1, 4)

      const soft = Math.pow(r, 3.0)                       // mineral haze
      const sharp = Math.pow(r, veinSharpness)            // the primary vein
      const capillary = Math.pow(rFine, veinSharpness * 1.6) * 0.8
      const grain = fbm(u * 26, v * 26, 3)                // slab micro-texture

      let cr = cBase[0], cg = cBase[1], cb = cBase[2]
      cr += (cHaze[0] - cr) * soft * 0.85
      cg += (cHaze[1] - cg) * soft * 0.85
      cb += (cHaze[2] - cb) * soft * 0.85
      cr += (cVein[0] - cr) * sharp
      cg += (cVein[1] - cg) * sharp
      cb += (cVein[2] - cb) * sharp
      // The capillaries take the vein colour, never the hairline colour —
      // a fine web at full brightness turns the slab into cracked glass.
      cr += (cVein[0] - cr) * capillary
      cg += (cVein[1] - cg) * capillary
      cb += (cVein[2] - cb) * capillary
      const hair = Math.pow(r, veinSharpness * 2.6)
      cr += (cHair[0] - cr) * hair
      cg += (cHair[1] - cg) * hair
      cb += (cHair[2] - cb) * hair

      // Grain is a tint, not a lightener — pushing luminance here is what makes
      // procedural stone look dusty.
      const gm = 0.965 + grain * 0.07
      cr *= gm; cg *= gm; cb *= gm

      const i = (y * res + x) * 4
      d[i] = linToSrgbByte(cr)
      d[i + 1] = linToSrgbByte(cg)
      d[i + 2] = linToSrgbByte(cb)
      d[i + 3] = 255

      // Polished stone is flat: the veins sit a few microns proud at most. The
      // relief exists to break the specular highlight, nothing more.
      height[y * res + x] = sharp * 0.6 + soft * 0.22 + capillary * 0.3 + grain * 0.15
      // Veins are marginally less polished than the ground. This is the tell
      // that separates real stone from a photo pasted on a mirror.
      rough[y * res + x] = polish + sharp * 0.10 + capillary * 0.05 + grain * 0.03
    }
  }
  ctx.putImageData(img, 0, 0)

  return {
    map: toTexture(cv, { srgb: true }),
    normalMap: toTexture(heightToNormal(height, res, 0.45)),
    roughnessMap: toTexture(fieldToCanvas(rough, res)),
  }
}

/* ------------------------------------------------------------------- wood -- */

/**
 * Timber.
 *
 * THE FAILURE THIS IS WRITTEN AGAINST — and the one the first version shipped:
 * it came out as CORDUROY. Fine, hard, evenly-spaced vertical lines covering
 * every cabinet in the kitchen. It read as ribbed plastic, and because it was
 * on every wood surface it made the whole room look cheap regardless of the
 * lighting.
 *
 * Three specific mistakes caused it, all in the pores:
 *
 *  1. FREQUENCY. Pores ran at 210 cycles across a 1.1 m tile — roughly 5 mm
 *     apart. That is fine enough to alias into shimmer, and coarse enough to
 *     still be individually visible. Real pores are sub-millimetre: they are
 *     meant to blur into a TONE at any normal viewing distance, never resolve
 *     as lines.
 *  2. CONTRAST. They darkened the surface by up to 55%. Actual pores on
 *     fumed oak are maybe 8-12% darker than the surrounding wood.
 *  3. CONTINUITY. They were stretched 8:1 along the grain, which turns a pore
 *     into a continuous line running the full height of the door. Pores are
 *     short dashes that start and stop.
 *
 * What actually reads as timber at 2-4 m — which is where this is viewed —
 * is not pore detail at all. It is the LOW frequencies: cathedral figure,
 * board-to-board tonal variation, and growth rings that wander. Those are what
 * this now spends its detail budget on.
 */
export function wood({
  res = 1024,
  seed = 3,
  early = '#3a2418',
  late = '#1d120c',
  sap = '#5a3b26',
  rings = 14,            // band periods across the tile
  warp = 1.35,           // in band periods — keep >= 1.0
  poreDepth = 0.14,      // was 0.55. See note 2 above.
  baseRough = 0.42,
  along = 'y',           // grain direction in UV space
} = {}) {
  const { fbm, noise } = makeNoise(seed)
  const cv = canvas(res)
  const ctx = cv.getContext('2d')
  const img = ctx.createImageData(res, res)
  const d = img.data
  const height = new Float32Array(res * res)
  const rough = new Float32Array(res * res)

  const cEarly = hexToLin(early), cLate = hexToLin(late), cSap = hexToLin(sap)

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = x / res, v = y / res
      // `t` runs ACROSS the grain, `s` runs along it.
      const t = along === 'y' ? u : v
      const s = along === 'y' ? v : u

      // Ring warp. Amplitude is in band periods so it always exceeds the band
      // spacing — below that the grain reads as wallpaper stripes.
      const warpAmt =
        (fbm(t * 3.1 + 5.2, s * 0.38 + 1.7, 5) - 0.5) * 2 * (warp / rings)
      const cathedral =
        (fbm(t * 1.15 + 21.0, s * 0.16 + 8.3, 3) - 0.5) * 2 * (2.6 / rings)

      const band = (t + warpAmt + cathedral) * rings
      const saw = band - Math.floor(band)

      // SOFT rings. The old curve produced a hard edge at every band boundary,
      // which is the second source of the pinstripe look. Real latewood
      // darkens over a few millimetres, so the transition is smoothed and only
      // the darkest quarter of the band is fully late.
      const ring = saw * saw * (3 - 2 * saw)

      // Board-to-board tone, at a much larger scale than anything above. This
      // is what stops a run of fronts looking like one printed sheet, and it
      // is the single most valuable frequency in the whole texture.
      const boardTone = 0.86 + fbm(t * 0.7 + 60, s * 0.5 + 33, 3) * 0.30

      // Pores: fine, short, faint. Broken up ALONG the grain so they read as
      // dashes rather than continuous lines.
      const pore = Math.pow(noise(t * 120 + 3.3, s * 150 + 0.7), 2.2)
      // A handful of medullary rays — the occasional strong figure line that
      // real quarter-sawn timber has. These are the ONLY hard lines allowed,
      // and they are sparse by construction.
      const ray = Math.pow(fbm(t * 22 + 77, s * 0.6 + 5, 2), 9) * 0.6
      const sapStreak = Math.pow(fbm(t * 2.2 + 40, s * 0.3 + 12, 3), 4.0)

      let cr = cEarly[0], cg = cEarly[1], cb = cEarly[2]
      cr += (cLate[0] - cr) * ring
      cg += (cLate[1] - cg) * ring
      cb += (cLate[2] - cb) * ring
      cr += (cSap[0] - cr) * sapStreak * 0.55
      cg += (cSap[1] - cg) * sapStreak * 0.55
      cb += (cSap[2] - cb) * sapStreak * 0.55

      const shade = boardTone * (1 - pore * poreDepth) * (1 - ray * 0.45)
      cr *= shade; cg *= shade; cb *= shade

      const i = (y * res + x) * 4
      d[i] = linToSrgbByte(cr)
      d[i + 1] = linToSrgbByte(cg)
      d[i + 2] = linToSrgbByte(cb)
      d[i + 3] = 255

      // Relief follows the same restraint. Pores are shallow depressions and
      // latewood sits barely proud; the old values had the surface corrugated.
      height[y * res + x] = (1 - ring) * 0.22 + (1 - pore) * 0.16 + (1 - ray) * 0.10
      // Open pores scatter more than the finished surface around them. Kept
      // subtle — this is the tell at grazing angles, not a texture in itself.
      rough[y * res + x] = baseRough + pore * 0.12 + ray * 0.10 - ring * 0.04
    }
  }
  ctx.putImageData(img, 0, 0)

  return {
    map: toTexture(cv, { srgb: true }),
    normalMap: toTexture(heightToNormal(height, res, 0.35)),
    roughnessMap: toTexture(fieldToCanvas(rough, res)),
  }
}

/* ----------------------------------------------------------------- fluted -- */

/**
 * The fluted (reeded) front from the reference — vertical half-round staves.
 *
 * Modelled as a normal map rather than geometry on purpose: at the density the
 * reference shows (~18mm pitch across a 1200mm island) real geometry is ~65k
 * extra triangles per door and gains nothing except a correct silhouette at the
 * panel edge — which the door's own bevel already provides. The lighting is the
 * whole effect and the normal map carries all of it.
 */
export function fluted({ res = 1024, staves = 26, flat = 0.12, seed = 5 } = {}) {
  const { fbm } = makeNoise(seed)
  const height = new Float32Array(res * res)
  const rough = new Float32Array(res * res)

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = x / res
      const p = (u * staves) % 1
      // Half-round with a small flat land between staves, which is how these are
      // actually machined — a pure sine gives a wavy sheet, not distinct reeds.
      let h
      if (p < flat * 0.5 || p > 1 - flat * 0.5) {
        h = 0
      } else {
        const q = (p - flat * 0.5) / (1 - flat)
        h = Math.sin(q * Math.PI)
      }
      const micrograin = fbm(u * 300, (y / res) * 40, 2) * 0.05
      height[y * res + x] = h * 0.95 + micrograin
      rough[y * res + x] = 0.34 + (1 - h) * 0.06 + micrograin * 0.4
    }
  }

  return {
    normalMap: toTexture(heightToNormal(height, res, 1.6)),
    roughnessMap: toTexture(fieldToCanvas(rough, res)),
  }
}


/**
 * Framed (shaker) front — a raised frame with a recessed panel.
 *
 * Generated PER PANEL SIZE, because the stile width is a constant 70 mm in the
 * real world: on a 300 drawer the frame is a quarter of the front, on a 900
 * door it is a fourteenth. A single shared map would scale the frame with the
 * door, which is the tell that gives away every cheap shaker render — all the
 * frames come out visually the same width regardless of the door.
 */
export function shaker({ res = 512, w = 0.6, h = 0.72, stile = 0.07, seed = 41 } = {}) {
  const { fbm } = makeNoise(seed)
  const height = new Float32Array(res * res)
  const rough = new Float32Array(res * res)
  const fx = Math.min(0.45, stile / w)
  const fy = Math.min(0.45, stile / h)

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = x / res, v = y / res
      // Distance to the nearest edge, in units of frame width. < 1 is frame.
      const t = Math.min(Math.min(u, 1 - u) / fx, Math.min(v, 1 - v) / fy)
      let hgt
      if (t < 1) hgt = 1                       // frame face
      else if (t < 1.22) hgt = 1 - (t - 1) / 0.22  // the chamfer into the panel
      else hgt = 0                             // recessed panel
      const grain = fbm(u * 40, v * 40, 2) * 0.06
      height[y * res + x] = hgt * 0.94 + grain
      // The recessed panel collects a little more dust and holds paint
      // slightly flatter than the sprayed frame face.
      rough[y * res + x] = 0.5 + (1 - hgt) * 0.10 + grain * 0.3
    }
  }
  return {
    normalMap: toTexture(heightToNormal(height, res, 2.2)),
    roughnessMap: toTexture(fieldToCanvas(rough, res)),
  }
}

/**
 * V-groove front — 45° grooves milled at a fixed pitch, so the front reads as
 * boarding. Unlike fluting these are cuts, not staves: the face stays flat and
 * only the groove has relief, which is why it catches light as a hard line
 * rather than a soft roll.
 */
export function vgroove({ res = 512, grooves = 7, width = 0.10, seed = 43 } = {}) {
  const { fbm } = makeNoise(seed)
  const height = new Float32Array(res * res)
  const rough = new Float32Array(res * res)
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = x / res
      const p = (u * grooves) % 1
      // A narrow V centred on each pitch boundary.
      const d = Math.min(p, 1 - p) / (width / 2)
      const cut = d < 1 ? (1 - d) : 0
      const grain = fbm(u * 220, (y / res) * 30, 2) * 0.05
      height[y * res + x] = (1 - cut) * 0.95 + grain
      rough[y * res + x] = 0.46 + cut * 0.12 + grain * 0.4
    }
  }
  return {
    normalMap: toTexture(heightToNormal(height, res, 2.0)),
    roughnessMap: toTexture(fieldToCanvas(rough, res)),
  }
}

/**
 * The imperfection layer — smudges, settled dust, handle wear.
 *
 * Nothing in a render is uniformly perfect, and that uniformity is one of the
 * loudest CG tells there is. A real sprayed door has slightly different
 * roughness where hands touch it, dust settling on the upward faces, and a
 * faint unevenness across the panel from the spray pass itself. None of it is
 * individually visible; collectively it is the difference between a surface and
 * a swatch.
 *
 * Output is ROUGHNESS ONLY. Smudges do not change a surface's colour in any way
 * the eye can separate from the lighting — they change how it scatters. Tinting
 * the albedo instead is what produces the "dirty texture" look that reads as a
 * decal rather than as use.
 */
export function imperfection({ res = 512, seed = 91, amount = 0.16 } = {}) {
  const { fbm, noise } = makeNoise(seed)
  const rough = new Float32Array(res * res)
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = x / res, v = y / res
      // Broad unevenness — the spray pass.
      const pass = fbm(u * 2.6, v * 2.6, 4)
      // Mid-scale blotches — handling.
      const smudge = Math.pow(fbm(u * 7 + 30, v * 7 + 11, 3), 2.2)
      // Fine settled dust, biased to the top of the panel where it lands.
      const dust = noise(u * 90, v * 90) * Math.pow(1 - v, 1.6)
      rough[y * res + x] = 0.5 + (pass - 0.5) * amount + smudge * amount * 1.4 + dust * amount * 0.4
    }
  }
  return { roughnessMap: toTexture(fieldToCanvas(rough, res)) }
}

/* ------------------------------------------------------------ metal / misc -- */

/** Brushed metal: fine anisotropic scratches. Roughness + normal only. */
export function brushed({ res = 512, seed = 11, dir = 'x', base = 0.24 } = {}) {
  const { noise, fbm } = makeNoise(seed)
  const height = new Float32Array(res * res)
  const rough = new Float32Array(res * res)
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = x / res, v = y / res
      const a = dir === 'x' ? u : v
      const b = dir === 'x' ? v : u
      const scratch = noise(a * 4 + 2.2, b * 620) // stretched 150:1
      const dust = fbm(u * 60, v * 60, 3)
      height[y * res + x] = scratch * 0.8 + dust * 0.2
      rough[y * res + x] = base + scratch * 0.16 + dust * 0.05
    }
  }
  return {
    normalMap: toTexture(heightToNormal(height, res, 0.35)),
    roughnessMap: toTexture(fieldToCanvas(rough, res)),
  }
}

/** Micro-cement / plaster: the quiet surfaces. Mostly roughness break-up. */
export function plaster({ res = 512, seed = 19, color = '#cdc7bd', rough0 = 0.82 } = {}) {
  const { fbm } = makeNoise(seed)
  const cv = canvas(res)
  const ctx = cv.getContext('2d')
  const img = ctx.createImageData(res, res)
  const d = img.data
  const height = new Float32Array(res * res)
  const rough = new Float32Array(res * res)
  const c = hexToLin(color)
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = x / res, v = y / res
      const trowel = fbm(u * 5.5, v * 5.5, 4)
      const grit = fbm(u * 120, v * 120, 2)
      const m = 0.93 + trowel * 0.10 + grit * 0.04
      const i = (y * res + x) * 4
      d[i] = linToSrgbByte(c[0] * m)
      d[i + 1] = linToSrgbByte(c[1] * m)
      d[i + 2] = linToSrgbByte(c[2] * m)
      d[i + 3] = 255
      height[y * res + x] = trowel * 0.7 + grit * 0.3
      rough[y * res + x] = rough0 + trowel * 0.10 + grit * 0.05
    }
  }
  ctx.putImageData(img, 0, 0)
  return {
    map: toTexture(cv, { srgb: true }),
    normalMap: toTexture(heightToNormal(height, res, 0.5)),
    roughnessMap: toTexture(fieldToCanvas(rough, res)),
  }
}

/**
 * Herringbone floor — laid, not sampled.
 *
 * The first version of this computed a block index per pixel from the parity of
 * a coarse lattice. That is the tidy way to write it and it is wrong: a block
 * four cells long straddles four cells of ALTERNATING parity, so the "blocks"
 * break up and the floor renders as a checkerboard of grain directions. It
 * looked like a tiled floor with a printed wood pattern, which is exactly the
 * product nobody in this price bracket is buying.
 *
 * So the blocks are LAID instead: a greedy fill over a grid of block-width
 * cells, orientation chosen by which diagonal band the cell falls in, which is
 * what produces herringbone's zigzag. Anything the fill cannot place a full
 * block into becomes a cut block, exactly as it would at the edge of a real
 * floor.
 *
 * This texture does NOT tile — it is generated at the size of the actual room
 * and used once, at repeat 1. That costs a bigger canvas and buys two things:
 * no seam anywhere, and every block genuinely unique, so the eye never finds
 * the repeat that gives cheap CG flooring away.
 */
export function herringbone({
  res = 2048,
  seed = 23,
  metres = 6.6,          // the floor this texture has to cover
  blockLong = 0.6,       // 600 x 150 — the standard block
  blockShort = 0.15,
  early = '#8a6440',
  late = '#5e3f26',
  joint = '#140d07',
} = {}) {
  const { fbm, noise, rnd } = makeNoise(seed)
  const cv = canvas(res)
  const ctx = cv.getContext('2d')
  const hv = canvas(res)
  const hctx = hv.getContext('2d')

  const pxPerM = res / metres
  const W = Math.max(3, Math.round(blockShort * pxPerM))   // block width in px
  const L = Math.max(6, Math.round(blockLong * pxPerM))    // block length in px
  const n = Math.round(L / W)
  const cols = Math.ceil(res / W), rows = Math.ceil(res / W)

  ctx.fillStyle = joint
  ctx.fillRect(0, 0, res, res)
  hctx.fillStyle = '#000'          // joints are the low points
  hctx.fillRect(0, 0, res, res)

  const taken = new Uint8Array(cols * rows)
  const fits = (cx, cy, w, h) => {
    if (cx < 0 || cy < 0 || cx + w > cols || cy + h > rows) return false
    for (let y = cy; y < cy + h; y++) {
      for (let x = cx; x < cx + w; x++) if (taken[y * cols + x]) return false
    }
    return true
  }
  const mark = (cx, cy, w, h) => {
    for (let y = cy; y < cy + h; y++) {
      for (let x = cx; x < cx + w; x++) taken[y * cols + x] = 1
    }
  }

  /** One block, with its own grain, tone and a chamfered edge. */
  let placed = 0
  function drawBlock(px, py, pw, ph) {
    const id = placed++
    const horizontal = pw >= ph
    // Per-block tone. Real parquet is sorted but never uniform, and this
    // variation is most of what makes a floor read as timber at a glance.
    const tone = 0.80 + ((id * 2654435761) % 1000) / 1000 * 0.42
    const phase = ((id * 40503) % 997) / 997 * 10

    const g = ctx.createLinearGradient(
      px, py, horizontal ? px : px + pw, horizontal ? py + ph : py
    )
    const c1 = new THREE.Color(early).multiplyScalar(tone)
    const c2 = new THREE.Color(late).multiplyScalar(tone)
    g.addColorStop(0, `#${c2.getHexString()}`)
    g.addColorStop(0.5, `#${c1.getHexString()}`)
    g.addColorStop(1, `#${c2.getHexString()}`)
    ctx.fillStyle = g
    ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2)

    hctx.fillStyle = '#c8c8c8'
    hctx.fillRect(px + 1, py + 1, pw - 2, ph - 2)

    // Grain, drawn as strokes ALONG the block. Warped by noise so the lines
    // wander the way sawn timber does rather than running dead straight.
    const span = horizontal ? ph : pw
    const runLen = horizontal ? pw : ph
    const lines = Math.max(4, Math.round(span / 2.2))
    for (let i = 0; i < lines; i++) {
      const t = (i + 0.5) / lines
      const dark = noise(phase + t * 9, i * 0.7) 
      ctx.globalAlpha = 0.10 + dark * 0.30
      ctx.strokeStyle = dark > 0.62 ? '#1a0f06' : '#2a1a0d'
      ctx.lineWidth = dark > 0.82 ? 1.6 : 0.9
      ctx.beginPath()
      const steps = Math.max(4, Math.round(runLen / 14))
      for (let sIdx = 0; sIdx <= steps; sIdx++) {
        const u = sIdx / steps
        const wob = (fbm(phase + u * 3.2, t * 6 + i, 3) - 0.5) * span * 0.22
        const a = horizontal ? px + u * pw : px + t * pw + wob
        const b = horizontal ? py + t * ph + wob : py + u * ph
        sIdx ? ctx.lineTo(a, b) : ctx.moveTo(a, b)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // Greedy lay. Orientation follows the diagonal band the cell sits in, which
  // is what gives herringbone its zigzag; a cell that cannot take a full block
  // gets whatever fits, i.e. a cut block at the wall.
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      if (taken[cy * cols + cx]) continue
      const band = Math.floor((cx + cy) / n) % 2 === 0
      const first = band ? [n, 1] : [1, n]
      const second = band ? [1, n] : [n, 1]
      let w = 0, h = 0
      if (fits(cx, cy, first[0], first[1])) { [w, h] = first }
      else if (fits(cx, cy, second[0], second[1])) { [w, h] = second }
      else {
        // Cut block: shrink until it fits the space left against the wall.
        for (let k = n - 1; k >= 1 && !w; k--) {
          if (fits(cx, cy, k, 1)) { w = k; h = 1 }
          else if (fits(cx, cy, 1, k)) { w = 1; h = k }
        }
        if (!w) { w = 1; h = 1 }
      }
      mark(cx, cy, w, h)
      drawBlock(cx * W, cy * W, w * W, h * W)
    }
  }

  // Height comes off the drawn joint mask, so the V-grooves land exactly on the
  // block edges instead of being computed twice and drifting apart.
  const hd = hctx.getImageData(0, 0, res, res).data
  const height = new Float32Array(res * res)
  const rough = new Float32Array(res * res)
  for (let i = 0; i < height.length; i++) {
    const seam = hd[i * 4] / 255
    const grit = fbm((i % res) / res * 90, Math.floor(i / res) / res * 90, 2)
    height[i] = seam * (0.75 + grit * 0.25)
    // Joints hold dirt and no finish — they are always the roughest thing on
    // a floor, and skipping that leaves the whole surface looking laminated.
    rough[i] = 0.26 + (1 - seam) * 0.38 + grit * 0.10
  }

  return {
    map: toTexture(cv, { srgb: true }),
    normalMap: toTexture(heightToNormal(height, res, 1.4)),
    roughnessMap: toTexture(fieldToCanvas(rough, res)),
  }
}

/**
 * Reeded glass for the tall display cabinets. Vertical lensing, so the plates
 * behind it smear horizontally — the actual optical signature of the stuff.
 * Used as a normal map on a transmissive material.
 */
export function reededGlass({ res = 512, reeds = 40 } = {}) {
  const height = new Float32Array(res * res)
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const p = ((x / res) * reeds) % 1
      height[y * res + x] = Math.sin(p * Math.PI)
    }
  }
  return { normalMap: toTexture(heightToNormal(height, res, 2.4)) }
}
