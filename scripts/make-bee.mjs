// Procedural AAA-tier honeybee — geometry, skeleton, skinning and animation
// clips authored in code, exported as a single self-contained .glb.
//
//   node scripts/make-bee.mjs   ->  public/models/bee.glb
//
// Everything is generated: no purchased/scraped asset, no textures (colour and
// the fuzz mask ride in COLOR_0, so the GLB stays one file and ~a few hundred KB).
// Anatomy is real-bee proportioned: head + compound eyes + jointed antennae,
// fuzzy thorax with ~900 hair cards, petiole, five-segment tapering abdomen with
// stinger, six three-joint legs with pollen baskets, and four venated wings.
//
// Model space: head faces +Z, up is +Y, body length ~1.0 unit.

import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/models/bee.glb')

// GLTFExporter's binary path reads its Blob through FileReader, which Node has
// no global for. Minimal stand-in — only readAsArrayBuffer/onloadend are used.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => { this.result = buf; this.onloadend?.() })
    }
  }
}

// ─────────────────────────────────────────────────────────── palette ──
// Tuned against the LOOM hero: warm gold body reading against #0d0716,
// violet-cool sheen in the chitin so the bee sits *in* the scene's light
// rather than on top of it.
const C = {
  fuzzWarm:  new THREE.Color('#e8a93a'),
  fuzzPale:  new THREE.Color('#f6dfa8'),
  fuzzDark:  new THREE.Color('#5d3b1a'),
  chitinGold:new THREE.Color('#f2ad2c'),
  chitinDark:new THREE.Color('#15100b'),
  chitinWarm:new THREE.Color('#8f4d15'),
  eye:       new THREE.Color('#2b2029'),
  leg:       new THREE.Color('#2c1c10'),
  pollen:    new THREE.Color('#e0a82f'),
  wing:      new THREE.Color('#cfd8ea'),
  vein:      new THREE.Color('#4a3a2c'),
}

// ─────────────────────────────────────────────────────────── skeleton ──
// [name, parent, world rest position]. Order matters: parents before children.
const BONE_DEFS = [
  ['root',    null,     [0, 0, 0]],
  ['thorax',  'root',   [0, 0, 0.05]],
  ['head',    'thorax', [0, 0.02, 0.26]],
  ['antL1',   'head',   [0.045, 0.10, 0.36]],
  ['antL2',   'antL1',  [0.10, 0.15, 0.44]],
  ['antR1',   'head',   [-0.045, 0.10, 0.36]],
  ['antR2',   'antR1',  [-0.10, 0.15, 0.44]],
  ['abdA',    'thorax', [0, 0, -0.06]],
  ['abdB',    'abdA',   [0, -0.01, -0.24]],
  ['abdC',    'abdB',   [0, -0.02, -0.42]],
  ['sting',   'abdC',   [0, -0.03, -0.56]],
  ['wingLF',  'thorax', [0.055, 0.14, 0.10]],
  ['wingLH',  'thorax', [0.050, 0.12, 0.01]],
  ['wingRF',  'thorax', [-0.055, 0.14, 0.10]],
  ['wingRH',  'thorax', [-0.050, 0.12, 0.01]],
]

// six legs × (coxa, femur, tibia) — tarsus is skinned to tibia
const LEG_CHAINS = [
  ['L1', 1, [[0.085, -0.065, 0.15], [0.145, -0.145, 0.19], [0.175, -0.245, 0.16]]],
  ['L2', 1, [[0.095, -0.080, 0.04], [0.165, -0.160, 0.03], [0.205, -0.260, -0.03]]],
  ['L3', 1, [[0.095, -0.080, -0.09], [0.170, -0.160, -0.14], [0.215, -0.260, -0.22]]],
]
for (const [tag, , pts] of [...LEG_CHAINS]) {
  LEG_CHAINS.push([tag.replace('L', 'R'), -1, pts.map(([x, y, z]) => [-x, y, z])])
}
for (const [tag, , pts] of LEG_CHAINS) {
  BONE_DEFS.push([`${tag}a`, 'thorax', pts[0]])
  BONE_DEFS.push([`${tag}b`, `${tag}a`, pts[1]])
  BONE_DEFS.push([`${tag}c`, `${tag}b`, pts[2]])
}

const boneIndex = new Map(BONE_DEFS.map(([n], i) => [n, i]))
const bones = BONE_DEFS.map(([name, parent, pos]) => {
  const b = new THREE.Bone()
  b.name = name
  const p = parent ? BONE_DEFS[boneIndex.get(parent)][2] : [0, 0, 0]
  b.position.set(pos[0] - p[0], pos[1] - p[1], pos[2] - p[2])
  return b
})
BONE_DEFS.forEach(([, parent], i) => { if (parent) bones[boneIndex.get(parent)].add(bones[i]) })
const B = (n) => boneIndex.get(n)

// ───────────────────────────────────────────────────────── mesh buffers ──
// One interleaved pile per material; merged into a single geometry with groups
// at the end so the whole bee is one SkinnedMesh (one draw call per material).
const MAT = { FUZZ: 0, CHITIN: 1, EYE: 2, WING: 3, VEIN: 4, POLLEN: 5 }
const buckets = Array.from({ length: 6 }, () => ({ pos: [], nor: [], col: [], idx: [], si: [], sw: [], n: 0 }))

// Push one triangle-soup part. `skinFn(x,y,z) -> [[boneIdx, weight], ...]`.
function emit(mat, positions, normals, indices, colorFn, skinFn) {
  const b = buckets[mat]
  const base = b.n
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2]
    b.pos.push(x, y, z)
    b.nor.push(normals[i], normals[i + 1], normals[i + 2])
    const c = colorFn(x, y, z)
    b.col.push(c.r, c.g, c.b)
    const w = skinFn(x, y, z)
    const idx = [0, 0, 0, 0], wt = [0, 0, 0, 0]
    let total = 0
    for (let k = 0; k < 4 && k < w.length; k++) { idx[k] = w[k][0]; wt[k] = w[k][1]; total += w[k][1] }
    if (total > 0) for (let k = 0; k < 4; k++) wt[k] /= total
    else wt[0] = 1
    b.si.push(...idx); b.sw.push(...wt)
    b.n++
  }
  for (const t of indices) b.idx.push(t + base)
}

// Deterministic hash noise — the bee must be byte-identical on every rebuild.
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}
let rngState = 0x2f6e2b1
function rnd() {
  rngState ^= rngState << 13; rngState ^= rngState >>> 17; rngState ^= rngState << 5
  return ((rngState >>> 0) % 100000) / 100000
}

// Surface of revolution about the Z axis: profile(t) -> [z, radius].
function revolve(profile, segsZ, segsR, opts = {}) {
  const { squashY = 1, squashX = 1, fuzz = 0, offsetY = 0, curveY = null } = opts
  const pos = [], nor = [], idx = []
  for (let i = 0; i <= segsZ; i++) {
    const t = i / segsZ
    const [z, r0] = profile(t)
    const yBend = (curveY ? curveY(t) : 0) + offsetY
    for (let j = 0; j <= segsR; j++) {
      const a = (j / segsR) * Math.PI * 2
      const ca = Math.cos(a), sa = Math.sin(a)
      let r = r0
      if (fuzz) r *= 1 + (hash(i * 0.9, j * 1.7, 3.3) - 0.5) * fuzz
      const x = ca * r * squashX, y = sa * r * squashY + yBend
      pos.push(x, y, z)
      // analytic-ish normal: radial, then flattened by the profile slope
      const t2 = Math.min(1, t + 1e-3), t1 = Math.max(0, t - 1e-3)
      const [z2, r2] = profile(t2), [z1, r1] = profile(t1)
      const dz = z2 - z1, dr = r2 - r1
      const nz = -dr, nr = dz
      const len = Math.hypot(nz, nr) || 1
      const n = new THREE.Vector3(ca * (nr / len) * (1 / squashX), sa * (nr / len) * (1 / squashY), nz / len).normalize()
      nor.push(n.x, n.y, n.z)
    }
  }
  const row = segsR + 1
  for (let i = 0; i < segsZ; i++) {
    for (let j = 0; j < segsR; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  return { pos, nor, idx }
}

// Tapered tube through a polyline — legs, antennae, wing veins.
function tube(points, radii, segsR = 8, twist = 0) {
  const pos = [], nor = [], idx = []
  const P = points.map((p) => new THREE.Vector3(...p))
  for (let i = 0; i < P.length; i++) {
    const fwd = new THREE.Vector3()
    if (i === 0) fwd.subVectors(P[1], P[0])
    else if (i === P.length - 1) fwd.subVectors(P[i], P[i - 1])
    else fwd.subVectors(P[i + 1], P[i - 1])
    fwd.normalize()
    const up = Math.abs(fwd.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)
    const side = new THREE.Vector3().crossVectors(up, fwd).normalize()
    const up2 = new THREE.Vector3().crossVectors(fwd, side).normalize()
    for (let j = 0; j <= segsR; j++) {
      const a = (j / segsR) * Math.PI * 2 + twist * i
      const n = new THREE.Vector3()
        .addScaledVector(side, Math.cos(a))
        .addScaledVector(up2, Math.sin(a))
      pos.push(P[i].x + n.x * radii[i], P[i].y + n.y * radii[i], P[i].z + n.z * radii[i])
      nor.push(n.x, n.y, n.z)
    }
  }
  const row = segsR + 1
  for (let i = 0; i < P.length - 1; i++) {
    for (let j = 0; j < segsR; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  return { pos, nor, idx }
}

// ─────────────────────────────────────────────────────────────── head ──
{
  // head: rounded triangular capsule, wider than deep
  const head = revolve((t) => {
    const z = 0.18 + t * 0.20
    const r = 0.115 * Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)) ** 0.62
    return [z, r]
  }, 26, 26, { squashY: 0.92, squashX: 1.15 })
  emit(MAT.CHITIN, head.pos, head.nor, head.idx,
    (x, y, z) => C.chitinDark.clone().lerp(C.chitinWarm, THREE.MathUtils.clamp((y + 0.06) * 2.4, 0, 1) * 0.22),
    () => [[B('head'), 1]])

  // compound eyes — the big lateral ovals are the single strongest "bee" cue.
  // Kept wide rather than tall: tall, narrow eyes read as a housefly.
  for (const s of [1, -1]) {
    const eye = revolve((t) => [0.185 + t * 0.205, 0.072 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)) ** 0.45], 20, 20,
      { squashY: 1.15, squashX: 0.60 })
    const shifted = []
    for (let i = 0; i < eye.pos.length; i += 3) {
      shifted.push(eye.pos[i] + s * 0.092, eye.pos[i + 1] + 0.035, eye.pos[i + 2])
    }
    // faint vertical falloff so the dome isn't a flat black hole
    emit(MAT.EYE, shifted, eye.nor, eye.idx,
      (x, y) => C.eye.clone().lerp(C.chitinDark, THREE.MathUtils.clamp(0.5 - y * 2.5, 0, 1)),
      () => [[B('head'), 1]])
  }

  // three ocelli on the crown
  for (const [ox, oz] of [[0, 0.375], [0.035, 0.362], [-0.035, 0.362]]) {
    const o = revolve((t) => [oz + t * 0.014, 0.012 * Math.sin(Math.PI * t) ** 0.5], 8, 10, { offsetY: 0 })
    const sh = []
    for (let i = 0; i < o.pos.length; i += 3) sh.push(o.pos[i] + ox, o.pos[i + 1] + 0.085, o.pos[i + 2])
    emit(MAT.EYE, sh, o.nor, o.idx, () => C.eye, () => [[B('head'), 1]])
  }

  // antennae: scape (straight) + flagellum (elbowed, tapering) — two bones each
  for (const [s, b1, b2] of [[1, 'antL1', 'antL2'], [-1, 'antR1', 'antR2']]) {
    const scape = tube(
      [[s * 0.03, 0.075, 0.33], [s * 0.045, 0.10, 0.36], [s * 0.055, 0.115, 0.385]],
      [0.010, 0.009, 0.008], 7)
    emit(MAT.CHITIN, scape.pos, scape.nor, scape.idx, () => C.chitinDark, () => [[B(b1), 1]])
    const flag = tube(
      [[s * 0.055, 0.115, 0.385], [s * 0.085, 0.145, 0.415], [s * 0.115, 0.158, 0.45], [s * 0.145, 0.150, 0.487]],
      [0.0085, 0.0075, 0.0062, 0.004], 7)
    emit(MAT.CHITIN, flag.pos, flag.nor, flag.idx, () => C.chitinDark,
      (x, y, z) => [[B(b2), THREE.MathUtils.clamp((z - 0.385) / 0.05, 0, 1)], [B(b1), 1 - THREE.MathUtils.clamp((z - 0.385) / 0.05, 0, 1)]])
  }

  // mandibles
  for (const s of [1, -1]) {
    const m = tube([[s * 0.045, -0.055, 0.34], [s * 0.055, -0.085, 0.36], [s * 0.038, -0.105, 0.355]],
      [0.017, 0.014, 0.007], 7)
    emit(MAT.CHITIN, m.pos, m.nor, m.idx, () => C.chitinWarm, () => [[B('head'), 1]])
  }
  // proboscis, tucked
  const pro = tube([[0, -0.085, 0.33], [0, -0.125, 0.315], [0, -0.155, 0.29]], [0.013, 0.009, 0.005], 7)
  emit(MAT.CHITIN, pro.pos, pro.nor, pro.idx, () => C.chitinDark, () => [[B('head'), 1]])
}

// ───────────────────────────────────────────────────────────── thorax ──
{
  const thorax = revolve((t) => {
    const z = -0.09 + t * 0.32
    const r = 0.155 * Math.sin(Math.PI * Math.min(1, t * 0.88 + 0.09)) ** 0.42
    return [z, r]
  }, 30, 28, { squashY: 0.98, fuzz: 0.045 })
  emit(MAT.FUZZ, thorax.pos, thorax.nor, thorax.idx, (x, y, z) => {
    const top = THREE.MathUtils.clamp((y + 0.05) * 3.2, 0, 1)
    return C.fuzzDark.clone().lerp(C.fuzzWarm, top).lerp(C.fuzzPale, top * 0.35 * hash(x * 30, y * 30, z * 30))
  }, () => [[B('thorax'), 1]])

  // petiole — the waist. Skipping it is what makes CG bees read as flies.
  const waist = revolve((t) => [-0.055 - t * 0.045, 0.075 - t * 0.012], 6, 16)
  emit(MAT.CHITIN, waist.pos, waist.nor, waist.idx, () => C.chitinDark, () => [[B('abdA'), 1]])

  // ~900 hair cards over the thorax + collar: real silhouette fuzz, not a shader trick
  const hairPos = [], hairNor = [], hairIdx = []
  let hv = 0
  for (let i = 0; i < 900; i++) {
    const u = rnd(), v = rnd()
    const zt = 0.02 + u * 0.86
    const z = -0.09 + zt * 0.32
    const r = 0.155 * Math.sin(Math.PI * Math.min(1, zt * 0.88 + 0.09)) ** 0.42
    const a = v * Math.PI * 2
    const nx = Math.cos(a), ny = Math.sin(a) * 0.98
    const px = nx * r, py = ny * r, pz = z
    const len = 0.020 + rnd() * 0.026
    const bend = (rnd() - 0.5) * 0.5
    const tipx = px + nx * len, tipy = py + ny * len + len * 0.25, tipz = pz + bend * len
    const w = 0.0055 + rnd() * 0.003
    // tapered 2-quad strip, billboarded around the surface normal
    const sx = -ny * w, sy = nx * w
    const mx = (px + tipx) / 2, my = (py + tipy) / 2, mz = (pz + tipz) / 2
    hairPos.push(px - sx, py - sy, pz, px + sx, py + sy, pz,
      mx - sx * 0.55, my - sy * 0.55, mz, mx + sx * 0.55, my + sy * 0.55, mz,
      tipx, tipy, tipz)
    for (let k = 0; k < 5; k++) hairNor.push(nx, ny, 0)
    hairIdx.push(hv, hv + 2, hv + 1, hv + 1, hv + 2, hv + 3, hv + 2, hv + 4, hv + 3)
    hv += 5
  }
  emit(MAT.FUZZ, hairPos, hairNor, hairIdx, (x, y, z) => {
    const top = THREE.MathUtils.clamp((y + 0.04) * 3.0, 0, 1)
    return C.fuzzDark.clone().lerp(C.fuzzWarm, 0.35 + top * 0.65).lerp(C.fuzzPale, top * 0.5)
  }, () => [[B('thorax'), 1]])
}

// ──────────────────────────────────────────────────────────── abdomen ──
{
  // five visible tergites: each bulges then pinches, so the silhouette is
  // segmented rather than one smooth cone.
  const abdomen = revolve((t) => {
    const z = -0.08 - t * 0.50
    const env = Math.sin(Math.PI * Math.min(1, t * 0.86 + 0.12)) ** 0.55
    const seg = 1 + 0.055 * Math.cos(t * Math.PI * 2 * 5)
    return [z, 0.152 * env * seg]
  }, 60, 30, { squashY: 0.9 })
  emit(MAT.CHITIN, abdomen.pos, abdomen.nor, abdomen.idx, (x, y, z) => {
    const t = (-0.08 - z) / 0.50
    // Banding is the whole silhouette read at hero distance, so the tergite
    // edges are near-black and the transition is tight — a soft gradient here
    // washes out to plain amber a few metres from camera.
    const band = Math.cos(t * Math.PI * 2 * 5)
    const dark = THREE.MathUtils.smoothstep(band, 0.0, 0.45)
    const base = C.chitinGold.clone().lerp(C.chitinWarm, t * 0.65)
    const col = C.chitinDark.clone().lerp(base, dark)
    // ventral side is always darker; dorsal catches the rim light
    return col.lerp(C.chitinDark, THREE.MathUtils.clamp(-y * 3.0, 0, 1) * 0.6)
  }, (x, y, z) => {
    const t = THREE.MathUtils.clamp((-0.08 - z) / 0.50, 0, 1)
    if (t < 0.34) return [[B('abdA'), 1 - t / 0.34], [B('abdB'), t / 0.34]]
    if (t < 0.72) return [[B('abdB'), 1 - (t - 0.34) / 0.38], [B('abdC'), (t - 0.34) / 0.38]]
    return [[B('abdC'), 1 - (t - 0.72) / 0.28], [B('sting'), (t - 0.72) / 0.28]]
  })

  // abdominal fuzz — sparser than the thorax, concentrated on the first bands
  const hp = [], hn = [], hi = []
  let hv = 0
  for (let i = 0; i < 420; i++) {
    const u = rnd() ** 1.6, v = rnd()
    const t = 0.02 + u * 0.7
    const z = -0.08 - t * 0.50
    const env = Math.sin(Math.PI * Math.min(1, t * 0.86 + 0.12)) ** 0.55
    const r = 0.152 * env * (1 + 0.055 * Math.cos(t * Math.PI * 2 * 5))
    const a = v * Math.PI * 2
    const nx = Math.cos(a), ny = Math.sin(a) * 0.9
    const px = nx * r, py = ny * r
    const len = 0.012 + rnd() * 0.016
    const w = 0.004
    const sx = -ny * w, sy = nx * w
    hp.push(px - sx, py - sy, z, px + sx, py + sy, z, px + nx * len, py + ny * len, z - 0.006 - rnd() * 0.01)
    for (let k = 0; k < 3; k++) hn.push(nx, ny, 0)
    hi.push(hv, hv + 2, hv + 1)
    hv += 3
  }
  // hairs take the band colour underneath them, or they'd erase the stripes
  emit(MAT.FUZZ, hp, hn, hi, (x, y, z) => {
    const t = THREE.MathUtils.clamp((-0.08 - z) / 0.50, 0, 1)
    const dark = THREE.MathUtils.smoothstep(Math.cos(t * Math.PI * 2 * 5), 0.0, 0.45)
    return C.fuzzDark.clone().lerp(
      C.fuzzPale.clone().lerp(C.fuzzWarm, hash(x * 40, y * 40, z * 40)), dark)
  },
    (x, y, z) => {
      const t = THREE.MathUtils.clamp((-0.08 - z) / 0.50, 0, 1)
      if (t < 0.34) return [[B('abdA'), 1 - t / 0.34], [B('abdB'), t / 0.34]]
      return [[B('abdB'), 1 - (t - 0.34) / 0.38], [B('abdC'), (t - 0.34) / 0.38]]
    })

  // stinger
  const st = tube([[0, -0.015, -0.555], [0, -0.022, -0.585], [0, -0.028, -0.612]], [0.014, 0.007, 0.0015], 8)
  emit(MAT.CHITIN, st.pos, st.nor, st.idx, () => C.chitinDark, () => [[B('sting'), 1]])
}

// ─────────────────────────────────────────────────────────────── legs ──
for (const [tag, side, pts] of LEG_CHAINS) {
  const [coxa, femur, tibia] = pts
  const foot = [tibia[0] + side * 0.022, tibia[1] - 0.055, tibia[2] - 0.042]
  const toe = [foot[0] + side * 0.010, foot[1] - 0.010, foot[2] - 0.038]
  const chain = [
    [coxa[0] * 0.55, coxa[1] * 0.6, coxa[2]], coxa, femur, tibia, foot, toe,
  ]
  const t = tube(chain, [0.032, 0.027, 0.021, 0.016, 0.012, 0.006], 8)
  emit(MAT.CHITIN, t.pos, t.nor, t.idx,
    (x, y, z) => C.leg.clone().lerp(C.chitinWarm, THREE.MathUtils.clamp((y + 0.4) * 0.9, 0, 1) * 0.4),
    (x, y, z) => {
      // blend along the chain by distance to each joint
      const p = new THREE.Vector3(x, y, z)
      const joints = [[`${tag}a`, coxa], [`${tag}b`, femur], [`${tag}c`, tibia]]
      const w = joints.map(([n, j]) => {
        const d = p.distanceTo(new THREE.Vector3(...j)) + 1e-4
        return [B(n), 1 / (d * d * d)]
      })
      return w.sort((a, b) => b[1] - a[1]).slice(0, 3)
    })

  // hind legs carry corbiculae (pollen baskets) — the loaded-forager silhouette
  if (tag.endsWith('3')) {
    const mid = [(femur[0] + tibia[0]) / 2 + side * 0.014, (femur[1] + tibia[1]) / 2 - 0.005, (femur[2] + tibia[2]) / 2]
    // a flattened lozenge packed against the tibia, not a bead floating beside it
    const basket = revolve((t2) => [mid[2] - 0.05 + t2 * 0.10, 0.034 * Math.sin(Math.PI * Math.min(1, t2 * 0.86 + 0.14)) ** 0.45], 14, 16,
      { squashY: 1.5, squashX: 0.72 })
    const sh = []
    for (let i = 0; i < basket.pos.length; i += 3) sh.push(basket.pos[i] + mid[0], basket.pos[i + 1] + mid[1], basket.pos[i + 2])
    emit(MAT.POLLEN, sh, basket.nor, basket.idx, () => C.pollen, () => [[B(`${tag}b`), 0.5], [B(`${tag}c`), 0.5]])
  }
}

// ────────────────────────────────────────────────────────────── wings ──
// Membrane as a cambered blade + a venation network laid on top. Forewing and
// hindwing per side, each on its own bone so they can flap out of phase.
function wingBlade(bone, side, len, wid, rootZ, rootY, sweep, camber) {
  // widest around 40% span, then a long rounded taper — the flat rectangle a
  // naive lerp gives you reads as a dragonfly, not a bee
  const planform = (u) => wid * Math.sin(Math.PI * Math.min(1, u * 0.68 + 0.20)) ** 0.55 * (1 - u * u * 0.55)
  const nx = 26, ny = 12
  const pos = [], nor = [], idx = []
  for (let i = 0; i <= nx; i++) {
    const u = i / nx
      const halfW = planform(u)
    for (let j = 0; j <= ny; j++) {
      const v = j / ny * 2 - 1
      const x = side * (0.05 + u * len)
      const z = rootZ + v * halfW - u * sweep
      const y = rootY + camber * (1 - v * v) * u * 0.55 + Math.sin(u * Math.PI) * 0.012
      pos.push(x, y, z)
      nor.push(0, 1, 0)
      if (i < nx && j < ny) {
        const a = i * (ny + 1) + j
        idx.push(a, a + ny + 1, a + 1, a + 1, a + ny + 1, a + ny + 2)
      }
    }
  }
  emit(MAT.WING, pos, nor, idx, () => C.wing, (x, y, z) => {
    const u = THREE.MathUtils.clamp((Math.abs(x) - 0.05) / len, 0, 1)
    // root softening so the membrane doesn't tear off the thorax when it flaps
    return [[B(bone), 0.35 + 0.65 * Math.min(1, u * 4)], [B('thorax'), 0.65 * Math.max(0, 1 - u * 4)]]
  })

  // venation: costal margin + radial spars + a couple of cross-veins
  const veins = [
    { t: 0.0, r: 0.0032 },   // leading edge
    { t: 0.34, r: 0.0022 },
    { t: 0.66, r: 0.0019 },
    { t: 1.0, r: 0.0016 },   // trailing edge
  ]
  for (const { t, r } of veins) {
    const pts = []
    for (let i = 0; i <= 12; i++) {
      const u = i / 12
      const halfW = planform(u)
      const v = -1 + t * 2
      pts.push([
        side * (0.05 + u * len),
        rootY + camber * (1 - v * v) * u * 0.55 + Math.sin(u * Math.PI) * 0.012 + 0.0012,
        rootZ + v * halfW - u * sweep,
      ])
    }
    const vt = tube(pts, pts.map((_, i) => r * (1 - i / 24)), 5)
    emit(MAT.VEIN, vt.pos, vt.nor, vt.idx, () => C.vein, (x) => {
      const u = THREE.MathUtils.clamp((Math.abs(x) - 0.05) / len, 0, 1)
      return [[B(bone), 0.35 + 0.65 * Math.min(1, u * 4)], [B('thorax'), 0.65 * Math.max(0, 1 - u * 4)]]
    })
  }
  for (const u0 of [0.28, 0.5, 0.72]) {
    const halfW = planform(u0)
    const pts = [-0.85, 0, 0.85].map((v) => [
      side * (0.05 + u0 * len),
      rootY + camber * (1 - v * v) * u0 * 0.55 + Math.sin(u0 * Math.PI) * 0.012 + 0.0012,
      rootZ + v * halfW - u0 * sweep,
    ])
    const vt = tube(pts, [0.0013, 0.0013, 0.0013], 5)
    emit(MAT.VEIN, vt.pos, vt.nor, vt.idx, () => C.vein, () => {
      const w = 0.35 + 0.65 * Math.min(1, u0 * 4)
      return [[B(bone), w], [B('thorax'), 1 - w]]
    })
  }
}
wingBlade('wingLF', 1, 0.60, 0.155, 0.10, 0.14, 0.12, 0.05)
wingBlade('wingLH', 1, 0.34, 0.095, 0.01, 0.12, 0.08, 0.035)
wingBlade('wingRF', -1, 0.60, 0.155, 0.10, 0.14, 0.12, 0.05)
wingBlade('wingRH', -1, 0.34, 0.095, 0.01, 0.12, 0.08, 0.035)

// ───────────────────────────────────────────────────── merge + skin ──
const totalV = buckets.reduce((a, b) => a + b.n, 0)
const totalI = buckets.reduce((a, b) => a + b.idx.length, 0)
const position = new Float32Array(totalV * 3)
const normal = new Float32Array(totalV * 3)
const color = new Float32Array(totalV * 3)
const skinIndex = new Uint16Array(totalV * 4)
const skinWeight = new Float32Array(totalV * 4)
// vertex count stays well under 65k, so 16-bit indices halve the index buffer
const index = totalV > 65535 ? new Uint32Array(totalI) : new Uint16Array(totalI)
const groups = []
let vo = 0, io = 0
buckets.forEach((b, mi) => {
  if (!b.n) return
  position.set(b.pos, vo * 3)
  normal.set(b.nor, vo * 3)
  color.set(b.col, vo * 3)
  skinIndex.set(b.si, vo * 4)
  skinWeight.set(b.sw, vo * 4)
  for (let i = 0; i < b.idx.length; i++) index[io + i] = b.idx[i] + vo
  groups.push({ start: io, count: b.idx.length, materialIndex: mi })
  vo += b.n; io += b.idx.length
})

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(position, 3))
geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
geo.setAttribute('color', new THREE.BufferAttribute(color, 3))
geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4))
geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4))
geo.setIndex(new THREE.BufferAttribute(index, 1))
for (const g of groups) geo.addGroup(g.start, g.count, g.materialIndex)
geo.computeVertexNormals()
geo.computeBoundingSphere()

const materials = []
materials[MAT.FUZZ] = new THREE.MeshStandardMaterial({
  name: 'BeeFuzz', vertexColors: true, roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide,
})
materials[MAT.CHITIN] = new THREE.MeshPhysicalMaterial({
  name: 'BeeChitin', vertexColors: true, roughness: 0.46, metalness: 0.06,
  clearcoat: 0.28, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new THREE.Color('#ffd68a'),
})
materials[MAT.EYE] = new THREE.MeshPhysicalMaterial({
  name: 'BeeEye', color: C.eye, roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05,
  iridescence: 0.7, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520],
})
// Transmission samples whatever is behind the wing, and behind it is a near
// black scene — physically right, visually a black slab. So the membrane leans
// on thin-film iridescence and a faint self-lit tint instead, which is what
// actually sells a fast-moving wing against a dark background.
materials[MAT.WING] = new THREE.MeshPhysicalMaterial({
  name: 'BeeWing', color: C.wing, roughness: 0.05, metalness: 0.0, transmission: 0.55, thickness: 0.002,
  ior: 1.33, transparent: true, opacity: 0.30, side: THREE.DoubleSide,
  emissive: new THREE.Color('#6f7fb0'), emissiveIntensity: 0.16,
  specularIntensity: 1.0,
  iridescence: 1.0, iridescenceIOR: 1.4, iridescenceThicknessRange: [180, 700],
})
materials[MAT.VEIN] = new THREE.MeshStandardMaterial({ name: 'BeeVein', color: C.vein, roughness: 0.55, metalness: 0.0 })
materials[MAT.POLLEN] = new THREE.MeshStandardMaterial({ name: 'BeePollen', color: C.pollen, roughness: 1.0, metalness: 0.0 })

const skeleton = new THREE.Skeleton(bones)
const mesh = new THREE.SkinnedMesh(geo, materials)
mesh.name = 'Bee'
mesh.add(bones[0])
mesh.bind(skeleton)

// ─────────────────────────────────────────────────────── animation ──
const q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))
function qTrack(bone, times, eulers) {
  const v = []
  for (const e of eulers) { const k = q(...e); v.push(k.x, k.y, k.z, k.w) }
  return new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, v)
}
function pTrack(bone, times, vecs) {
  const base = bones[B(bone)].position
  const v = []
  for (const d of vecs) v.push(base.x + d[0], base.y + d[1], base.z + d[2])
  return new THREE.VectorKeyframeTrack(`${bone}.position`, times, v)
}

const clips = []

// "Flap" — wings only, one 0.05s cycle (20 Hz on screen; real bees run ~230 Hz,
// which just strobes). Kept as its own clip so it can layer onto any body clip
// and be re-timed independently.
{
  const T = [0, 0.0125, 0.025, 0.0375, 0.05]
  const up = 0.95, dn = -0.72, tw = 0.55
  const tracks = []
  for (const [b, s, amp] of [['wingLF', 1, 1], ['wingLH', 1, 0.85], ['wingRF', -1, 1], ['wingRH', -1, 0.85]]) {
    tracks.push(qTrack(b, T, [
      [s * tw * 0.2, 0, s * up * amp],
      [s * tw, 0, s * 0.15 * amp],
      [-s * tw * 0.6, 0, s * dn * amp],
      [-s * tw * 0.3, 0, s * 0.15 * amp],
      [s * tw * 0.2, 0, s * up * amp],
    ]))
  }
  clips.push(new THREE.AnimationClip('Flap', 0.05, tracks))
}

// "Hover" — station-keeping body: slight bob, abdomen pump, antennae sampling
// the air, legs hanging and swaying. 3.2s so it never reads as a loop.
{
  const N = 33, dur = 3.2
  const T = Array.from({ length: N }, (_, i) => (i / (N - 1)) * dur)
  const w = (f, p = 0) => T.map((t) => Math.sin((t / dur) * Math.PI * 2 * f + p))
  const s1 = w(1), s2 = w(2, 0.7), s3 = w(3, 1.9)

  const tracks = [
    pTrack('root', T, T.map((_, i) => [s2[i] * 0.012, s1[i] * 0.022, s3[i] * 0.008])),
    qTrack('thorax', T, T.map((_, i) => [s1[i] * 0.06 - 0.02, s2[i] * 0.05, s3[i] * 0.035])),
    qTrack('head', T, T.map((_, i) => [s2[i] * 0.09, s1[i] * 0.13, 0])),
    qTrack('abdA', T, T.map((_, i) => [0.10 + s1[i] * 0.07, s2[i] * 0.03, 0])),
    qTrack('abdB', T, T.map((_, i) => [0.07 + s2[i] * 0.05, 0, 0])),
    qTrack('abdC', T, T.map((_, i) => [0.05 + s3[i] * 0.04, 0, 0])),
    qTrack('antL1', T, T.map((_, i) => [s3[i] * 0.22, s2[i] * 0.18, 0])),
    qTrack('antR1', T, T.map((_, i) => [s3[i] * 0.22, -s2[i] * 0.18, 0])),
    qTrack('antL2', T, T.map((_, i) => [s2[i] * 0.3 - 0.15, s3[i] * 0.2, 0])),
    qTrack('antR2', T, T.map((_, i) => [s2[i] * 0.3 - 0.15, -s3[i] * 0.2, 0])),
  ]
  // Legs stay tucked under the body while hovering — a hovering bee folds them
  // in, and letting them hang splayed is what makes CG insects read as spiders.
  LEG_CHAINS.forEach(([tag, side], li) => {
    const ph = li * 0.9
    const a = w(1, ph), b2 = w(2, ph + 0.5)
    tracks.push(qTrack(`${tag}a`, T, T.map((_, i) => [0.50 + a[i] * 0.05, 0, side * (-0.12 + b2[i] * 0.04)])))
    tracks.push(qTrack(`${tag}b`, T, T.map((_, i) => [0.78 + b2[i] * 0.06, 0, 0])))
    tracks.push(qTrack(`${tag}c`, T, T.map((_, i) => [0.62 + a[i] * 0.07, 0, 0])))
  })
  clips.push(new THREE.AnimationClip('Hover', dur, tracks))
}

// "Fly" — committed forward flight: nose down, abdomen streamed back, legs tucked.
{
  const N = 25, dur = 2.0
  const T = Array.from({ length: N }, (_, i) => (i / (N - 1)) * dur)
  const w = (f, p = 0) => T.map((t) => Math.sin((t / dur) * Math.PI * 2 * f + p))
  const s1 = w(1), s2 = w(2, 0.4)
  const tracks = [
    pTrack('root', T, T.map((_, i) => [s2[i] * 0.008, s1[i] * 0.012, 0])),
    qTrack('thorax', T, T.map((_, i) => [-0.22 + s1[i] * 0.03, s1[i] * 0.06, s2[i] * 0.05])),
    qTrack('head', T, T.map((_, i) => [0.16 + s2[i] * 0.04, s1[i] * 0.08, 0])),
    qTrack('abdA', T, T.map((_, i) => [-0.06 + s1[i] * 0.03, 0, 0])),
    qTrack('abdB', T, T.map((_, i) => [-0.04 + s2[i] * 0.03, 0, 0])),
    qTrack('abdC', T, T.map(() => [-0.02, 0, 0])),
    qTrack('antL1', T, T.map((_, i) => [-0.25 + s2[i] * 0.06, 0.10, 0])),
    qTrack('antR1', T, T.map((_, i) => [-0.25 + s2[i] * 0.06, -0.10, 0])),
    qTrack('antL2', T, T.map(() => [-0.30, 0, 0])),
    qTrack('antR2', T, T.map(() => [-0.30, 0, 0])),
  ]
  LEG_CHAINS.forEach(([tag, side], li) => {
    const a = w(1, li * 0.7)
    tracks.push(qTrack(`${tag}a`, T, T.map((_, i) => [0.75 + a[i] * 0.04, 0, side * 0.25])))
    tracks.push(qTrack(`${tag}b`, T, T.map(() => [1.15, 0, 0])))
    tracks.push(qTrack(`${tag}c`, T, T.map(() => [1.05, 0, 0])))
  })
  clips.push(new THREE.AnimationClip('Fly', dur, tracks))
}

// "Land" — settled on a surface: legs planted, wings folded back, antennae grooming.
{
  const N = 41, dur = 4.0
  const T = Array.from({ length: N }, (_, i) => (i / (N - 1)) * dur)
  const w = (f, p = 0) => T.map((t) => Math.sin((t / dur) * Math.PI * 2 * f + p))
  const s1 = w(1), s3 = w(3, 0.3), s5 = w(5, 1.1)
  const tracks = [
    pTrack('root', T, T.map((_, i) => [0, -0.10 + s1[i] * 0.004, 0])),
    qTrack('thorax', T, T.map((_, i) => [s1[i] * 0.02, s1[i] * 0.04, 0])),
    qTrack('head', T, T.map((_, i) => [s3[i] * 0.10, s1[i] * 0.22, 0])),
    qTrack('abdA', T, T.map((_, i) => [0.06 + s1[i] * 0.05, 0, 0])),
    qTrack('abdB', T, T.map((_, i) => [0.05 + s3[i] * 0.03, 0, 0])),
    qTrack('abdC', T, T.map(() => [0.04, 0, 0])),
    qTrack('antL1', T, T.map((_, i) => [s5[i] * 0.35, 0.25 + s3[i] * 0.2, 0])),
    qTrack('antR1', T, T.map((_, i) => [s5[i] * 0.35, -0.25 - s3[i] * 0.2, 0])),
    qTrack('antL2', T, T.map((_, i) => [-0.4 + s5[i] * 0.4, 0, 0])),
    qTrack('antR2', T, T.map((_, i) => [-0.4 + s5[i] * 0.4, 0, 0])),
    // wings folded flat back over the abdomen (yaw swings them tailward, not
    // over the head — the sign here is the whole difference)
    qTrack('wingLF', T, T.map(() => [0.1, 0.95, 0.12])),
    qTrack('wingLH', T, T.map(() => [0.1, 1.05, 0.10])),
    qTrack('wingRF', T, T.map(() => [0.1, -0.95, -0.12])),
    qTrack('wingRH', T, T.map(() => [0.1, -1.05, -0.10])),
  ]
  LEG_CHAINS.forEach(([tag, side], li) => {
    const a = w(1, li * 1.3)
    tracks.push(qTrack(`${tag}a`, T, T.map((_, i) => [-0.10 + a[i] * 0.02, 0, side * -0.25])))
    tracks.push(qTrack(`${tag}b`, T, T.map(() => [0.55, 0, 0])))
    tracks.push(qTrack(`${tag}c`, T, T.map((_, i) => [0.80 + a[i] * 0.03, 0, 0])))
  })
  clips.push(new THREE.AnimationClip('Land', dur, tracks))
}

// ───────────────────────────────────────────────────────────── export ──
const root = new THREE.Group()
root.name = 'BeeRig'
root.add(mesh)

const exporter = new GLTFExporter()
const glb = await new Promise((res, rej) =>
  exporter.parse(root, res, rej, { binary: true, animations: clips, onlyVisible: false }))

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, Buffer.from(glb))

const tri = index.length / 3
console.log(`bee.glb  ${(glb.byteLength / 1024).toFixed(0)} KB`)
console.log(`  ${totalV.toLocaleString()} verts / ${tri.toLocaleString()} tris`)
console.log(`  ${bones.length} bones, ${clips.length} clips: ${clips.map((c) => `${c.name}(${c.duration}s)`).join(', ')}`)
