// STATUS (2026-08): not currently wired to the live site. Companion.js — the
// rig that actually flies the butterfly down the page — switched to a
// procedural, canvas-textured model built at runtime by
// src/three/butterfly-model.js (see src/three/butterflyAsset.js's header for
// the full story). This generator and the GLB it produces are kept only as
// a reproducible reference / a possible future asset source; nothing in the
// production bundle loads public/models/butterfly.glb. Confirmed by grepping
// every built JS chunk in dist/assets/ for the filename: zero matches.
//
// Procedural felted-wool butterfly — geometry, skeleton, skinning and animation
// clips authored in code, exported as a single self-contained .glb.
//
//   node scripts/make-butterfly.mjs   ->  public/models/butterfly.glb
//
// Art direction is the wool butterfly from the LOOM asset system: violet and
// periwinkle wings with pale ice eyespots, dark indigo margins, a fuzzy plum
// body, big glossy eyes and clubbed antennae. Everything is generated — colour
// and the felt grain ride in COLOR_0, so the GLB stays one file with no
// textures to fetch.
//
// Model space: head faces +Z, up is +Y, wings spread along X.
// Body ~0.95 long, wingspan ~1.45.
//
// Two things here differ from make-bee.mjs and matter downstream:
//
//   1. Wing outlines are POLAR — r(theta) around the hinge, Catmull-Rom through
//      a handful of control points. A butterfly wing is an organic lobe with a
//      scalloped margin and a tail; no lerp between a leading and a trailing
//      edge gets there. It also hands the pattern function the exactly right
//      coordinates for free: real wing bands run parallel to the margin
//      (constant radius) and the veins run radially (constant theta).
//
//   2. "Flap" is authored as pure oscillation about the bind pose, so the field
//      can play it as an ADDITIVE action over whichever body clip is running
//      and drive flap AMPLITUDE with the action weight. Butterflies fly in
//      flap-glide bursts, which a normal-blended wing clip cannot express — the
//      wing bones would be owned by one clip at full weight forever.

import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/models/butterfly.glb')

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
// v2: swallowtail redesign. The v1 wash — violet/periwinkle bands on a violet
// body — sat almost invisibly close to the hero's own violet backdrop and
// LOOM's actual brand marks (magenta/gold) never showed up on the mascot at
// all. This pulls the wing straight onto the brand: near-black ground,
// hot-magenta and gold bands, a warm cream eyespot instead of ice-blue, so
// the butterfly reads as LOOM's own colour even before the field's emissive
// tint is added on top.
const C = {
  deep:    new THREE.Color('#0a0410'), // margin black
  indigo:  new THREE.Color('#2a0a28'), // black warmed toward magenta
  violet:  new THREE.Color('#5c1050'), // plum-magenta transition band
  orchid:  new THREE.Color('#d4166f'), // crimson-magenta
  lilac:   new THREE.Color('#f21c8c'), // brand magenta
  peri:    new THREE.Color('#ffb23e'), // gold wash, stands in for the old periwinkle
  ice:     new THREE.Color('#fff0cf'), // eyespot centres — warm cream, not ice-blue
  frost:   new THREE.Color('#fff8ea'),
  vein:    new THREE.Color('#200818'),
  fuzzDark:new THREE.Color('#100810'),
  fuzzMid: new THREE.Color('#4a0e3c'),
  fuzzHi:  new THREE.Color('#f4b942'), // gold highlight fuzz, was lilac
  eye:     new THREE.Color('#080510'),
  mouth:   new THREE.Color('#ffcf6b'),
  leg:     new THREE.Color('#180810'),
}

// ─────────────────────────────────────────────────────────── skeleton ──
// [name, parent, world rest position]. Order matters: parents before children.
const BONE_DEFS = [
  ['root',    null,     [0, 0, 0]],
  ['thorax',  'root',   [0, 0, 0.06]],
  ['head',    'thorax', [0, 0.035, 0.25]],
  ['antL1',   'head',   [0.030, 0.085, 0.295]],
  ['antL2',   'antL1',  [0.072, 0.185, 0.355]],
  ['antR1',   'head',   [-0.030, 0.085, 0.295]],
  ['antR2',   'antR1',  [-0.072, 0.185, 0.355]],
  ['abdA',    'thorax', [0, -0.005, -0.08]],
  ['abdB',    'abdA',   [0, -0.020, -0.26]],
  ['abdC',    'abdB',   [0, -0.035, -0.44]],
  // Forewings: hinge, mid-span, outer third. Three bones is what buys the
  // wingtip lag — a butterfly's membrane is soft enough that the tip is still
  // finishing the last stroke when the root starts the next one.
  ['wingLF1', 'thorax', [0.055, 0.050, 0.10]],
  ['wingLF2', 'wingLF1',[0.420, 0.050, 0.28]],
  ['wingLF3', 'wingLF2',[0.720, 0.050, 0.42]],
  ['wingRF1', 'thorax', [-0.055, 0.050, 0.10]],
  ['wingRF2', 'wingRF1',[-0.420, 0.050, 0.28]],
  ['wingRF3', 'wingRF2',[-0.720, 0.050, 0.42]],
  // Hindwings: hinge + outer half.
  ['wingLH1', 'thorax', [0.050, 0.028, -0.04]],
  ['wingLH2', 'wingLH1',[0.340, 0.028, -0.22]],
  ['wingRH1', 'thorax', [-0.050, 0.028, -0.04]],
  ['wingRH2', 'wingRH1',[-0.340, 0.028, -0.22]],
]

// six legs × (coxa+femur, tibia+tarsus). Butterfly legs are spindly and stay
// tucked in flight, so two joints each is plenty.
const LEG_CHAINS = [
  ['L1', 1, [[0.070, -0.055, 0.155], [0.120, -0.145, 0.165]]],
  ['L2', 1, [[0.080, -0.065, 0.055], [0.140, -0.160, 0.030]]],
  ['L3', 1, [[0.078, -0.065, -0.045], [0.135, -0.155, -0.100]]],
]
for (const [tag, , pts] of [...LEG_CHAINS]) {
  LEG_CHAINS.push([tag.replace('L', 'R'), -1, pts.map(([x, y, z]) => [-x, y, z])])
}
for (const [tag, , pts] of LEG_CHAINS) {
  BONE_DEFS.push([`${tag}a`, 'thorax', pts[0]])
  BONE_DEFS.push([`${tag}b`, `${tag}a`, pts[1]])
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
const MAT = { WOOL: 0, WING: 1, EYE: 2, VEIN: 3, MOUTH: 4 }
const buckets = Array.from({ length: 5 }, () => ({ pos: [], nor: [], col: [], idx: [], si: [], sw: [], n: 0 }))

// Push one triangle-soup part. `skinFn(x,y,z) -> [[boneIdx, weight], ...]`.
function emit(mat, positions, normals, indices, colorFn, skinFn) {
  const b = buckets[mat]
  const base = b.n
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2]
    b.pos.push(x, y, z)
    b.nor.push(normals[i], normals[i + 1], normals[i + 2])
    const c = colorFn(x, y, z, i / 3)
    b.col.push(c.r, c.g, c.b)
    const w = skinFn(x, y, z, i / 3)
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

// Deterministic hash noise — the butterfly must be byte-identical on rebuild.
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}
let rngState = 0x7a13c5d
function rnd() {
  rngState ^= rngState << 13; rngState ^= rngState >>> 17; rngState ^= rngState << 5
  return ((rngState >>> 0) % 100000) / 100000
}
const clamp = THREE.MathUtils.clamp
const smooth = THREE.MathUtils.smoothstep

// Piecewise colour ramp: stops are [t, THREE.Color], t ascending.
function ramp(stops, t) {
  t = clamp(t, 0, 1)
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i], [b, cb] = stops[i + 1]
    if (t <= b) return ca.clone().lerp(cb, (t - a) / Math.max(1e-6, b - a))
  }
  return stops[stops.length - 1][1].clone()
}

// Catmull-Rom through a list of 2D points, parameterised s in [0, 1] across the
// whole list. Wing outlines are authored as (x, z) points in the body's own
// plane rather than as r(theta): a butterfly's outer margin is close to a
// straight line and its apex is a corner, and neither survives being described
// as a radius — you get a circle every time.
function polyline(pts) {
  const n = pts.length - 1
  return (s) => {
    const t = clamp(s, 0, 1) * n
    const i = Math.min(n - 1, Math.floor(t))
    const f = t - i
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)]
    const f2 = f * f, f3 = f2 * f
    const c = (a, b, cc, d) => 0.5 * ((2 * b) + (-a + cc) * f
      + (2 * a - 5 * b + 4 * cc - d) * f2 + (-a + 3 * b - 3 * cc + d) * f3)
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]
  }
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
      pos.push(ca * r * squashX, sa * r * squashY + yBend, z)
      const t2 = Math.min(1, t + 1e-3), t1 = Math.max(0, t - 1e-3)
      const [z2, r2] = profile(t2), [z1, r1] = profile(t1)
      const dz = z2 - z1, dr = r2 - r1
      const len = Math.hypot(-dr, dz) || 1
      nor.push(ca * (dz / len) / squashX, sa * (dz / len) / squashY, -dr / len)
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

// Tapered tube through a polyline — legs, antennae, veins, proboscis.
function tube(points, radii, segsR = 7, twist = 0) {
  const pos = [], nor = [], idx = []
  const P = points.map((p) => new THREE.Vector3(...p))
  for (let i = 0; i < P.length; i++) {
    const fwd = new THREE.Vector3()
    if (i === 0) fwd.subVectors(P[1], P[0])
    else if (i === P.length - 1) fwd.subVectors(P[i], P[i - 1])
    else fwd.subVectors(P[i + 1], P[i - 1])
    if (fwd.lengthSq() < 1e-12) fwd.set(0, 0, 1)
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

// ═══════════════════════════════════════════════════════════════ wings ══
//
// Silhouettes, authored as (x, z) points on the right-hand side, traced from
// the costal root -> out along the leading margin -> apex -> around the outer
// margin -> tornus -> back along the inner margin to the body. Both wings are
// mirrored for the left side.
//
// Half-span works out at ~0.99 against a ~0.95 body, so the spread reads as a
// butterfly rather than a moth. The apex is a deliberate corner: two points
// close together at the tip is what stops Catmull-Rom rounding it into a lobe.
const FORE_PTS = [
  [0.085, 0.190],  // costal root
  [0.26, 0.360],
  [0.48, 0.480],
  [0.72, 0.550],
  [0.95, 0.578],   // apex
  [0.985, 0.492],  // apex corner
  [0.90, 0.352],
  [0.76, 0.202],
  [0.60, 0.088],   // tornus
  [0.44, 0.028],
  [0.28, -0.008],
  [0.14, -0.022],  // inner root
]
// v2: one long swallowtail spike instead of the reference's two stubby tails
// — the single most recognisable silhouette swap that makes this read as a
// different butterfly at a glance, not just a recolour.
const HIND_PTS = [
  [0.095, 0.022],  // forward root, tucked under the forewing
  [0.300, 0.000],
  [0.500, -0.060],
  [0.640, -0.175],
  [0.700, -0.310],
  [0.665, -0.430],
  [0.600, -0.485],  // tail base, outer side
  [0.500, -0.760],  // tail tip — long spike
  [0.430, -0.560],  // tail base, inner side
  [0.340, -0.470],
  [0.230, -0.360],
  [0.130, -0.230],
  [0.070, -0.162],  // inner root
]

const FORE_OUTLINE = polyline(FORE_PTS)
const HIND_OUTLINE = polyline(HIND_PTS)

// Eyespots live in the wing's own (x, z) plane so they come out round, which
// they never do in a (radius, parameter) space that is anisotropic by
// construction. `r` is a real distance in model units.
const FORE_SPOTS = [
  { x: 0.60, z: 0.330, r: 0.088 },
  { x: 0.74, z: 0.400, r: 0.062 },
  { x: 0.45, z: 0.215, r: 0.070 },
  { x: 0.62, z: 0.185, r: 0.048 },
  { x: 0.84, z: 0.470, r: 0.040 },
]
const HIND_SPOTS = [
  { x: 0.42, z: -0.185, r: 0.078 },
  { x: 0.30, z: -0.310, r: 0.060 },
  { x: 0.50, z: -0.330, r: 0.052 },
  { x: 0.20, z: -0.150, r: 0.044 },
]

// Bands run parallel to the margin, so the ramp is driven by radial fraction.
const FORE_BANDS = [
  [0.00, C.deep], [0.10, C.indigo], [0.26, C.violet], [0.42, C.orchid],
  [0.54, C.lilac], [0.64, C.peri], [0.74, C.orchid], [0.84, C.violet],
  [0.92, C.indigo], [1.00, C.deep],
]
const HIND_BANDS = [
  [0.00, C.deep], [0.12, C.indigo], [0.30, C.violet], [0.46, C.orchid],
  [0.58, C.lilac], [0.68, C.peri], [0.80, C.violet], [0.90, C.indigo], [1.00, C.deep],
]

function wingColor(u, s, lx, lz, kind) {
  const fore = kind === 'fore'
  const c = ramp(fore ? FORE_BANDS : HIND_BANDS, u)

  // Costal and inner margins: the first and last few percent of the outline go
  // dark, which is what frames the wing against the near-black hero.
  const edge = Math.min(smooth(s, 0, 0.07), smooth(1 - s, 0, 0.07))
  c.lerp(C.indigo, (1 - edge) * 0.75)

  // Pale discal wash — the bright patch across the middle of the wing.
  const wash = smooth(u, 0.30, 0.46) * (1 - smooth(u, 0.56, 0.72))
    * (0.25 + 0.75 * Math.exp(-(((s - 0.42) / 0.24) ** 2)))
  c.lerp(C.frost, wash * 0.20)

  // Hard marginal band. Without this the wing has no edge and floats; with it
  // the silhouette is legible at forty pixels across, which is the size it
  // actually plays at in the hero.
  c.lerp(C.deep, smooth(u, 0.82, 1.0) * 0.88)

  // Radial vein shading under the real vein tubes.
  const nV = fore ? 7 : 6
  const vph = Math.abs(((s * nV) % 1) - 0.5) * 2
  c.lerp(C.vein, (1 - smooth(vph, 0.0, 0.30)) * 0.26 * smooth(u, 0.08, 0.32))

  // Eyespots: dark ring, pale ice core, measured in real distance.
  for (const sp of (fore ? FORE_SPOTS : HIND_SPOTS)) {
    const d = Math.hypot(lx - sp.x, lz - sp.z)
    if (d > sp.r * 1.9) continue
    c.lerp(C.deep, (1 - smooth(d, sp.r * 0.60, sp.r * 1.5)) * 0.88)
    c.lerp(C.ice, (1 - smooth(d, sp.r * 0.10, sp.r * 0.58)) * 0.94)
  }

  // Felt grain — the whole reason this reads as wool and not vinyl. Two
  // octaves: a coarse mottle for the dyed-fibre blotching, a fine one for nap.
  const g0 = hash(lx * 11.7, lz * 13.3, 4.1)
  const g1 = hash(lx * 47.3, lz * 61.9, u * 13.7)
  c.lerp(g0 > 0.5 ? C.lilac : C.indigo, Math.abs(g0 - 0.5) * 0.20)
  c.lerp(g1 > 0.5 ? C.frost : C.deep, Math.abs(g1 - 0.5) * 0.24)
  return c
}

// Build one wing as a radial grid from the hinge out to the authored outline.
function wing(kind, side) {
  const fore = kind === 'fore'
  const outline = fore ? FORE_OUTLINE : HIND_OUTLINE
  const hinge = fore ? [0.055, 0.050, 0.10] : [0.050, 0.028, -0.04]
  const [hx, hy, hz] = hinge
  const nR = fore ? 30 : 26
  const nT = fore ? 132 : 116        // dense along the margin so eyespots stay round
  const U0 = 0.06
  const L = side > 0 ? 'L' : 'R'
  const bonesOf = fore ? [`wing${L}F1`, `wing${L}F2`, `wing${L}F3`] : [`wing${L}H1`, `wing${L}H2`]

  // Membrane height: cupped along the span, with a low ripple so raking light
  // never hits it as one flat plane.
  const heightAt = (u, s, lx, lz) => hy
    + 0.030 * Math.sin(Math.PI * u) * (fore ? 1 : 0.85)
    - 0.042 * u ** 2.4
    + 0.009 * Math.sin(s * Math.PI * 6 + u * 3.0)
    + 0.005 * Math.sin(lx * 9.0 + lz * 7.0)

  const pos = [], nor = [], idx = [], meta = []
  for (let i = 0; i <= nR; i++) {
    const u = U0 + (i / nR) * (1 - U0)
    for (let j = 0; j <= nT; j++) {
      const s = j / nT
      const [ox, oz] = outline(s)
      const lx = hx + u * (ox - hx)
      const lz = hz + u * (oz - hz)
      pos.push(side * lx, heightAt(u, s, lx, lz), lz)
      nor.push(0, 1, 0)
      meta.push(u, s, lx, lz)
      if (i < nR && j < nT) {
        const a = i * (nT + 1) + j
        idx.push(a, a + nT + 1, a + 1, a + 1, a + nT + 1, a + nT + 2)
      }
    }
  }

  const skinAt = (u) => {
    const root = 1 - smooth(u, 0.06, 0.24)
    if (fore) {
      const w1 = (1 - smooth(u, 0.18, 0.54)) * (1 - root)
      const w2 = smooth(u, 0.18, 0.54) * (1 - smooth(u, 0.54, 0.86)) * (1 - root)
      const w3 = smooth(u, 0.54, 0.86) * (1 - root)
      return [[B(bonesOf[0]), w1 + 1e-4], [B(bonesOf[1]), w2], [B(bonesOf[2]), w3], [B('thorax'), root * 0.85]]
    }
    const w1 = (1 - smooth(u, 0.24, 0.68)) * (1 - root)
    return [[B(bonesOf[0]), w1 + 1e-4], [B(bonesOf[1]), (1 - w1 - root) * 1], [B('thorax'), root * 0.85]]
  }

  emit(MAT.WING, pos, nor, idx,
    (x, y, z, vi) => wingColor(meta[vi * 4], meta[vi * 4 + 1], meta[vi * 4 + 2], meta[vi * 4 + 3], kind),
    (x, y, z, vi) => skinAt(meta[vi * 4]))

  // ── real vein tubes, stopping short of the margin ──
  const nV = fore ? 7 : 6
  const steps = 12
  for (let k = 0; k <= nV; k++) {
    const s = k / nV
    const [ox, oz] = outline(s)
    const pts = [], rad = [], us = []
    for (let i = 0; i <= steps; i++) {
      const u = 0.10 + (i / steps) * 0.80
      const lx = hx + u * (ox - hx)
      const lz = hz + u * (oz - hz)
      pts.push([side * lx, heightAt(u, s, lx, lz) + 0.0016, lz])
      rad.push(0.0022 * (1 - (i / steps) * 0.80) * (k === 0 || k === nV ? 1.5 : 1))
      us.push(u)
    }
    const t = tube(pts, rad, 5)
    emit(MAT.VEIN, t.pos, t.nor, t.idx, () => C.vein,
      (x, y, z, vi) => skinAt(us[Math.min(steps, Math.floor(vi / 6))]))
  }

  // ── felted fringe along the outer margin ──
  // The single cue that separates "wool butterfly" from "printed acetate": the
  // silhouette has to be furry, and no shader does that from inside the outline.
  const fp = [], fn = [], fi = [], fs = []
  let fv = 0
  const fringeCount = fore ? 700 : 560
  for (let i = 0; i < fringeCount; i++) {
    const s = 0.03 + rnd() * 0.94
    const [ox, oz] = outline(s)
    const [px, pz] = outline(Math.min(1, s + 0.004))
    // outward normal = the outline tangent rotated 90 deg, pointing away from
    // the hinge; the hinge test keeps the fringe from growing inward on the
    // concave stretch between the two tails.
    let nxx = (pz - oz), nzz = -(px - ox)
    const nl = Math.hypot(nxx, nzz) || 1
    nxx /= nl; nzz /= nl
    if ((ox - hx) * nxx + (oz - hz) * nzz < 0) { nxx = -nxx; nzz = -nzz }
    const len = 0.008 + rnd() * 0.013
    const y = heightAt(1, s, ox, oz)
    const w = 0.0030 + rnd() * 0.0018
    fp.push(side * ox, y - w, oz, side * ox, y + w, oz,
      side * (ox + nxx * len), y + (rnd() - 0.5) * 0.010, oz + nzz * len)
    for (let k = 0; k < 3; k++) { fn.push(0, 1, 0); fs.push(s) }
    fi.push(fv, fv + 1, fv + 2)
    fv += 3
  }
  emit(MAT.WING, fp, fn, fi,
    (x, y, z, vi) => wingColor(0.99, fs[vi], 0, 0, kind).lerp(C.deep, 0.25),
    () => (fore ? [[B(bonesOf[2]), 1]] : [[B(bonesOf[1]), 1]]))
}

wing('fore', 1); wing('fore', -1)
wing('hind', 1); wing('hind', -1)

// ═══════════════════════════════════════════════════════════════ body ══
// ── thorax: fuzzy plum barrel ──
{
  const thorax = revolve((t) => {
    const z = -0.09 + t * 0.34
    const r = 0.118 * Math.sin(Math.PI * Math.min(1, t * 0.86 + 0.11)) ** 0.44
    return [z, r]
  }, 28, 26, { squashY: 1.0, fuzz: 0.05 })
  emit(MAT.WOOL, thorax.pos, thorax.nor, thorax.idx, (x, y, z) => {
    const top = clamp((y + 0.04) * 3.4, 0, 1)
    return C.fuzzDark.clone().lerp(C.fuzzMid, top).lerp(C.fuzzHi, top * 0.4 * hash(x * 30, y * 30, z * 30))
  }, () => [[B('thorax'), 1]])

  // ~760 hair cards. Real silhouette fuzz, same trick as the bee's thorax.
  const hp = [], hn = [], hi = []
  let hv = 0
  for (let i = 0; i < 760; i++) {
    const u = rnd(), v = rnd()
    const zt = 0.03 + u * 0.85
    const z = -0.09 + zt * 0.34
    const r = 0.118 * Math.sin(Math.PI * Math.min(1, zt * 0.86 + 0.11)) ** 0.44
    const a = v * Math.PI * 2
    const nx = Math.cos(a), ny = Math.sin(a)
    const px = nx * r, py = ny * r
    const len = 0.020 + rnd() * 0.028
    const bend = (rnd() - 0.5) * 0.5
    const tipx = px + nx * len, tipy = py + ny * len + len * 0.2, tipz = z + bend * len
    const w = 0.005 + rnd() * 0.003
    const sx = -ny * w, sy = nx * w
    const mx = (px + tipx) / 2, my = (py + tipy) / 2, mz = (z + tipz) / 2
    hp.push(px - sx, py - sy, z, px + sx, py + sy, z,
      mx - sx * 0.55, my - sy * 0.55, mz, mx + sx * 0.55, my + sy * 0.55, mz,
      tipx, tipy, tipz)
    for (let k = 0; k < 5; k++) hn.push(nx, ny, 0)
    hi.push(hv, hv + 2, hv + 1, hv + 1, hv + 2, hv + 3, hv + 2, hv + 4, hv + 3)
    hv += 5
  }
  emit(MAT.WOOL, hp, hn, hi, (x, y, z) => {
    const top = clamp((y + 0.03) * 3.2, 0, 1)
    return C.fuzzDark.clone().lerp(C.fuzzMid, 0.4 + top * 0.6).lerp(C.fuzzHi, top * 0.55)
  }, () => [[B('thorax'), 1]])
}

// ── abdomen: six soft tergites, tapering to a rounded tip ──
{
  const abdomen = revolve((t) => {
    const z = -0.075 - t * 0.40
    const env = Math.sin(Math.PI * Math.min(1, t * 0.78 + 0.18)) ** 0.5
    const seg = 1 + 0.05 * Math.cos(t * Math.PI * 2 * 6)
    return [z, 0.082 * env * seg]
  }, 56, 26, { squashY: 0.94 })
  emit(MAT.WOOL, abdomen.pos, abdomen.nor, abdomen.idx, (x, y, z) => {
    const t = clamp((-0.075 - z) / 0.40, 0, 1)
    const band = smooth(Math.cos(t * Math.PI * 2 * 6), -0.1, 0.5)
    const c = C.fuzzDark.clone().lerp(C.fuzzMid, band * 0.85)
    return c.lerp(C.fuzzHi, band * 0.25 * clamp((y + 0.02) * 4, 0, 1)).lerp(C.deep, clamp(-y * 3.4, 0, 1) * 0.55)
  }, (x, y, z) => {
    const t = clamp((-0.075 - z) / 0.40, 0, 1)
    if (t < 0.42) return [[B('abdA'), 1 - t / 0.42], [B('abdB'), t / 0.42]]
    return [[B('abdB'), 1 - (t - 0.42) / 0.58], [B('abdC'), (t - 0.42) / 0.58]]
  })

  // abdominal fuzz, densest on the first bands
  const hp = [], hn = [], hi = []
  let hv = 0
  for (let i = 0; i < 460; i++) {
    const u = rnd() ** 1.4, v = rnd()
    const t = 0.02 + u * 0.82
    const z = -0.075 - t * 0.40
    const env = Math.sin(Math.PI * Math.min(1, t * 0.78 + 0.18)) ** 0.5
    const r = 0.082 * env * (1 + 0.05 * Math.cos(t * Math.PI * 2 * 6))
    const a = v * Math.PI * 2
    const nx = Math.cos(a), ny = Math.sin(a) * 0.94
    const px = nx * r, py = ny * r
    const len = 0.013 + rnd() * 0.020
    const w = 0.0042
    const sx = -ny * w, sy = nx * w
    hp.push(px - sx, py - sy, z, px + sx, py + sy, z, px + nx * len, py + ny * len, z - 0.006 - rnd() * 0.012)
    for (let k = 0; k < 3; k++) hn.push(nx, ny, 0)
    hi.push(hv, hv + 2, hv + 1)
    hv += 3
  }
  emit(MAT.WOOL, hp, hn, hi, (x, y, z) => {
    const t = clamp((-0.075 - z) / 0.40, 0, 1)
    const band = smooth(Math.cos(t * Math.PI * 2 * 6), -0.1, 0.5)
    return C.fuzzDark.clone().lerp(C.fuzzMid.clone().lerp(C.fuzzHi, hash(x * 44, y * 44, z * 44)), 0.35 + band * 0.65)
  }, (x, y, z) => {
    const t = clamp((-0.075 - z) / 0.40, 0, 1)
    if (t < 0.42) return [[B('abdA'), 1 - t / 0.42], [B('abdB'), t / 0.42]]
    return [[B('abdB'), 1 - (t - 0.42) / 0.58], [B('abdC'), (t - 0.42) / 0.58]]
  })
}

// ── head, eyes, mouth, antennae, proboscis ──
{
  const head = revolve((t) => {
    const z = 0.185 + t * 0.145
    const r = 0.088 * Math.sin(Math.PI * Math.min(1, t * 0.90 + 0.10)) ** 0.5
    return [z, r]
  }, 22, 24, { squashY: 0.96, squashX: 1.06, fuzz: 0.05 })
  emit(MAT.WOOL, head.pos, head.nor, head.idx, (x, y, z) => {
    const top = clamp((y + 0.03) * 3.6, 0, 1)
    return C.fuzzDark.clone().lerp(C.fuzzMid, 0.5 + top * 0.5).lerp(C.fuzzHi, top * 0.3 * hash(x * 34, y * 34, z * 34))
  }, () => [[B('head'), 1]])

  // head fuzz
  {
    const hp = [], hn = [], hi = []
    let hv = 0
    for (let i = 0; i < 260; i++) {
      const u = rnd(), v = rnd()
      const zt = 0.05 + u * 0.8
      const z = 0.185 + zt * 0.145
      const r = 0.088 * Math.sin(Math.PI * Math.min(1, zt * 0.90 + 0.10)) ** 0.5
      const a = v * Math.PI * 2
      const nx = Math.cos(a), ny = Math.sin(a)
      const px = nx * r * 1.06, py = ny * r * 0.96
      const len = 0.014 + rnd() * 0.018
      const w = 0.004
      const sx = -ny * w, sy = nx * w
      hp.push(px - sx, py - sy, z, px + sx, py + sy, z, px + nx * len, py + ny * len + len * 0.3, z + (rnd() - 0.5) * 0.01)
      for (let k = 0; k < 3; k++) hn.push(nx, ny, 0)
      hi.push(hv, hv + 2, hv + 1)
      hv += 3
    }
    emit(MAT.WOOL, hp, hn, hi, (x, y) => C.fuzzDark.clone().lerp(C.fuzzMid, 0.45 + clamp((y + 0.02) * 3.4, 0, 1) * 0.55),
      () => [[B('head'), 1]])
  }

  // Big glossy eyes. The reference's whole charm lives here — undersize them
  // and it stops being the LOOM mascot and becomes a moth.
  for (const s of [1, -1]) {
    const eye = revolve((t) => [0.248 + t * 0.115, 0.062 * Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)) ** 0.40],
      18, 20, { squashY: 1.10, squashX: 0.95 })
    const sh = []
    for (let i = 0; i < eye.pos.length; i += 3) sh.push(eye.pos[i] + s * 0.052, eye.pos[i + 1] + 0.016, eye.pos[i + 2])
    emit(MAT.EYE, sh, eye.nor, eye.idx, () => C.eye, () => [[B('head'), 1]])
  }

  // A small upturned smile — one tube, and it changes the read of the whole face.
  {
    const pts = []
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const a = (t - 0.5) * 1.5
      pts.push([Math.sin(a) * 0.032, -0.040 - Math.cos(a) * 0.014, 0.318 - Math.abs(a) * 0.006])
    }
    const m = tube(pts, pts.map(() => 0.0055), 6)
    emit(MAT.MOUTH, m.pos, m.nor, m.idx, () => C.mouth, () => [[B('head'), 1]])
  }

  // Antennae: shaft + club. Two bones each so they can wave independently.
  for (const [s, b1, b2] of [[1, 'antL1', 'antL2'], [-1, 'antR1', 'antR2']]) {
    const shaft = tube([
      [s * 0.030, 0.075, 0.290], [s * 0.048, 0.130, 0.322], [s * 0.066, 0.180, 0.348], [s * 0.078, 0.222, 0.365],
    ], [0.0075, 0.0065, 0.0058, 0.0052], 6)
    emit(MAT.WOOL, shaft.pos, shaft.nor, shaft.idx, () => C.fuzzDark,
      (x, y) => {
        const t = clamp((y - 0.075) / 0.11, 0, 1)
        return [[B(b1), 1 - t], [B(b2), t]]
      })
    const club = revolve((t) => [0.365 + t * 0.032, 0.017 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.12)) ** 0.4],
      10, 12, { squashY: 1.25 })
    const sh = []
    for (let i = 0; i < club.pos.length; i += 3) sh.push(club.pos[i] + s * 0.086, club.pos[i + 1] + 0.235, club.pos[i + 2])
    emit(MAT.WOOL, sh, club.nor, club.idx,
      (x, y, z) => C.fuzzDark.clone().lerp(C.fuzzMid, 0.35 + 0.4 * hash(x * 50, y * 50, z * 50)),
      () => [[B(b2), 1]])
  }

  // Coiled proboscis, tucked under the head.
  {
    const pts = [], rad = []
    for (let i = 0; i <= 22; i++) {
      const t = i / 22
      const a = t * Math.PI * 3.1
      const r = 0.052 * (1 - t * 0.55)
      pts.push([0, -0.062 - 0.030 - r * Math.cos(a) + 0.030, 0.276 + r * Math.sin(a)])
      rad.push(0.0045 * (1 - t * 0.5))
    }
    const p = tube(pts, rad, 5)
    emit(MAT.WOOL, p.pos, p.nor, p.idx, () => C.fuzzDark.clone().lerp(C.mouth, 0.12), () => [[B('head'), 1]])
  }
}

// ── legs ──
for (const [tag, side, pts] of LEG_CHAINS) {
  const [coxa, tibia] = pts
  const foot = [tibia[0] + side * 0.018, tibia[1] - 0.052, tibia[2] - 0.030]
  const toe = [foot[0] + side * 0.006, foot[1] - 0.014, foot[2] - 0.028]
  const chain = [[coxa[0] * 0.5, coxa[1] * 0.5, coxa[2]], coxa, tibia, foot, toe]
  const t = tube(chain, [0.017, 0.013, 0.0095, 0.0068, 0.0032], 6)
  emit(MAT.WOOL, t.pos, t.nor, t.idx,
    (x, y) => C.leg.clone().lerp(C.fuzzMid, clamp((y + 0.35) * 0.9, 0, 1) * 0.35),
    (x, y, z) => {
      const p = new THREE.Vector3(x, y, z)
      const d1 = p.distanceTo(new THREE.Vector3(...coxa)) + 1e-4
      const d2 = p.distanceTo(new THREE.Vector3(...tibia)) + 1e-4
      return [[B(`${tag}a`), 1 / (d1 * d1 * d1)], [B(`${tag}b`), 1 / (d2 * d2 * d2)]]
    })
}

// ─────────────────────────────────────────────────── merge + skin ──
const totalV = buckets.reduce((a, b) => a + b.n, 0)
const totalI = buckets.reduce((a, b) => a + b.idx.length, 0)
const position = new Float32Array(totalV * 3)
const normal = new Float32Array(totalV * 3)
const color = new Float32Array(totalV * 3)
const skinIndex = new Uint16Array(totalV * 4)
const skinWeight = new Float32Array(totalV * 4)
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
materials[MAT.WOOL] = new THREE.MeshPhysicalMaterial({
  name: 'ButterflyWool', vertexColors: true, roughness: 0.97, metalness: 0.0, side: THREE.DoubleSide,
  sheen: 0.55, sheenRoughness: 0.85, sheenColor: new THREE.Color('#8f78c8'),
})
// No transmission. Against a near-black backdrop it buys nothing, and any
// transmissive material costs three a second full scene render every frame —
// the same trap the bee's wings hit. A felted wing is opaque anyway; the life
// comes from sheen plus a whisper of iridescence.
materials[MAT.WING] = new THREE.MeshPhysicalMaterial({
  name: 'ButterflyWing', vertexColors: true, roughness: 0.78, metalness: 0.0,
  side: THREE.DoubleSide,
  // Sheen at 1.0 with a near-white sheenColor lays a bright veil over every
  // facing angle, which is exactly how a deep violet wing ends up reading as
  // lavender-white. Kept low and tinted, it only catches the margins.
  sheen: 0.32, sheenRoughness: 0.55, sheenColor: new THREE.Color('#8f7ac9'),
  clearcoat: 0.10, clearcoatRoughness: 0.7,
  iridescence: 0.14, iridescenceIOR: 1.30, iridescenceThicknessRange: [220, 620],
  emissive: new THREE.Color('#2a1656'), emissiveIntensity: 0.04,
})
materials[MAT.EYE] = new THREE.MeshPhysicalMaterial({
  name: 'ButterflyEye', color: C.eye, roughness: 0.10, metalness: 0.0,
  clearcoat: 1.0, clearcoatRoughness: 0.03,
})
materials[MAT.VEIN] = new THREE.MeshStandardMaterial({ name: 'ButterflyVein', color: new THREE.Color('#1f0f3e'), roughness: 0.85, metalness: 0.0 })
materials[MAT.MOUTH] = new THREE.MeshStandardMaterial({
  name: 'ButterflyMouth', color: C.mouth, roughness: 0.6, metalness: 0.0,
  emissive: C.mouth.clone().multiplyScalar(0.25),
})

const skeleton = new THREE.Skeleton(bones)
const mesh = new THREE.SkinnedMesh(geo, materials)
mesh.name = 'Butterfly'
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

// ── "Flap" ──
// Authored as pure oscillation about the bind pose so the field can run it as
// an ADDITIVE action and use the weight as flap amplitude: 1 for a burst, ~0.15
// for the ripple that runs through a gliding wing, 0 for a hard hold.
//
// The stroke is deep — a butterfly claps its wings above its back and drives
// them well below horizontal — and the outer bones LAG the hinge, which is the
// whole tell. A wing that pivots rigidly reads as a paper cutout no matter how
// good the texture.
{
  const dur = 0.34
  const N = 25
  const T = Array.from({ length: N }, (_, i) => (i / (N - 1)) * dur)
  const wave = (ph) => T.map((t) => Math.sin(((t / dur) - ph) * Math.PI * 2))
  const tracks = []
  for (const [b1, b2, b3, s, amp] of [
    ['wingLF1', 'wingLF2', 'wingLF3', 1, 1.0],
    ['wingRF1', 'wingRF2', 'wingRF3', -1, 1.0],
  ]) {
    const a0 = wave(0), a1 = wave(0.13), a2 = wave(0.26)
    tracks.push(qTrack(b1, T, a0.map((v, i) => [s * a1[i] * 0.10, s * a2[i] * 0.06, s * v * 1.02 * amp])))
    tracks.push(qTrack(b2, T, a1.map((v) => [0, 0, s * v * 0.34 * amp])))
    tracks.push(qTrack(b3, T, a2.map((v) => [0, 0, s * v * 0.26 * amp])))
  }
  for (const [b1, b2, s] of [['wingLH1', 'wingLH2', 1], ['wingRH1', 'wingRH2', -1]]) {
    // Hindwings trail the forewings by ~8% of the cycle and swing less.
    const a0 = wave(0.08), a1 = wave(0.20)
    tracks.push(qTrack(b1, T, a0.map((v) => [0, 0, s * v * 0.78])))
    tracks.push(qTrack(b2, T, a1.map((v) => [0, 0, s * v * 0.30])))
  }
  // The body rides the stroke: lifted on the downbeat, dropped on the recovery,
  // pitching with it. Without this the butterfly floats and the wings just wave.
  const b1w = wave(0.22)
  tracks.push(pTrack('root', T, b1w.map((v) => [0, v * 0.052, 0])))
  tracks.push(qTrack('thorax', T, b1w.map((v) => [v * 0.10, 0, 0])))
  tracks.push(qTrack('abdA', T, wave(0.30).map((v) => [v * 0.10, 0, 0])))
  tracks.push(qTrack('abdB', T, wave(0.38).map((v) => [v * 0.09, 0, 0])))
  tracks.push(qTrack('abdC', T, wave(0.46).map((v) => [v * 0.08, 0, 0])))
  clips.push(new THREE.AnimationClip('Flap', dur, tracks))
}

// Shared: wings held in a shallow dihedral V, the pose Flap oscillates around.
function wingPose(T, dihedral, sweep, ripple) {
  const w = (f, p = 0) => T.map((t, i) => Math.sin((i / (T.length - 1)) * Math.PI * 2 * f + p))
  const r1 = w(1), r2 = w(2, 0.8)
  return [
    qTrack('wingLF1', T, r1.map((v, i) => [0, sweep, dihedral + v * ripple])),
    qTrack('wingLF2', T, r2.map((v) => [0, 0, v * ripple * 0.8])),
    qTrack('wingLF3', T, r1.map((v) => [0, 0, v * ripple * 1.1])),
    qTrack('wingRF1', T, r1.map((v) => [0, -sweep, -dihedral - v * ripple])),
    qTrack('wingRF2', T, r2.map((v) => [0, 0, -v * ripple * 0.8])),
    qTrack('wingRF3', T, r1.map((v) => [0, 0, -v * ripple * 1.1])),
    qTrack('wingLH1', T, r2.map((v) => [0, sweep * 0.5, dihedral * 0.7 + v * ripple * 0.9])),
    qTrack('wingLH2', T, r1.map((v) => [0, 0, v * ripple * 0.9])),
    qTrack('wingRH1', T, r2.map((v) => [0, -sweep * 0.5, -dihedral * 0.7 - v * ripple * 0.9])),
    qTrack('wingRH2', T, r1.map((v) => [0, 0, -v * ripple * 0.9])),
  ]
}

// ── "Flutter" — station-keeping. Wandering, unhurried, never quite still. ──
{
  const N = 49, dur = 4.6
  const T = Array.from({ length: N }, (_, i) => (i / (N - 1)) * dur)
  const w = (f, p = 0) => T.map((t) => Math.sin((t / dur) * Math.PI * 2 * f + p))
  const s1 = w(1), s2 = w(2, 0.7), s3 = w(3, 1.9), s5 = w(5, 0.4)

  const tracks = [
    pTrack('root', T, T.map((_, i) => [s2[i] * 0.020, s1[i] * 0.030 + s3[i] * 0.010, s3[i] * 0.012])),
    qTrack('thorax', T, T.map((_, i) => [s1[i] * 0.09, s2[i] * 0.07, s3[i] * 0.05])),
    qTrack('head', T, T.map((_, i) => [s2[i] * 0.10, s1[i] * 0.16, 0])),
    qTrack('abdA', T, T.map((_, i) => [0.08 + s1[i] * 0.08, s2[i] * 0.04, 0])),
    qTrack('abdB', T, T.map((_, i) => [0.06 + s2[i] * 0.06, 0, 0])),
    qTrack('abdC', T, T.map((_, i) => [0.05 + s3[i] * 0.05, 0, 0])),
    qTrack('antL1', T, T.map((_, i) => [s3[i] * 0.20, 0.06 + s2[i] * 0.16, 0])),
    qTrack('antR1', T, T.map((_, i) => [s3[i] * 0.20, -0.06 - s2[i] * 0.16, 0])),
    qTrack('antL2', T, T.map((_, i) => [s5[i] * 0.24 - 0.10, s3[i] * 0.18, 0])),
    qTrack('antR2', T, T.map((_, i) => [s5[i] * 0.24 - 0.10, -s3[i] * 0.18, 0])),
    ...wingPose(T, 0.30, 0.05, 0.07),
  ]
  LEG_CHAINS.forEach(([tag, side], li) => {
    const a = w(1, li * 0.9)
    tracks.push(qTrack(`${tag}a`, T, T.map((_, i) => [0.62 + a[i] * 0.05, 0, side * -0.10])))
    tracks.push(qTrack(`${tag}b`, T, T.map((_, i) => [0.85 + a[i] * 0.06, 0, 0])))
  })
  clips.push(new THREE.AnimationClip('Flutter', dur, tracks))
}

// ── "Cruise" — committed forward flight: nose down, abdomen streamed, swept. ──
{
  const N = 31, dur = 2.6
  const T = Array.from({ length: N }, (_, i) => (i / (N - 1)) * dur)
  const w = (f, p = 0) => T.map((t) => Math.sin((t / dur) * Math.PI * 2 * f + p))
  const s1 = w(1), s2 = w(2, 0.4)
  const tracks = [
    pTrack('root', T, T.map((_, i) => [s2[i] * 0.010, s1[i] * 0.016, 0])),
    qTrack('thorax', T, T.map((_, i) => [-0.20 + s1[i] * 0.04, s1[i] * 0.05, s2[i] * 0.04])),
    qTrack('head', T, T.map((_, i) => [0.14 + s2[i] * 0.04, s1[i] * 0.06, 0])),
    qTrack('abdA', T, T.map((_, i) => [-0.05 + s1[i] * 0.03, 0, 0])),
    qTrack('abdB', T, T.map((_, i) => [-0.04 + s2[i] * 0.03, 0, 0])),
    qTrack('abdC', T, T.map(() => [-0.03, 0, 0])),
    qTrack('antL1', T, T.map((_, i) => [-0.22 + s2[i] * 0.05, 0.12, 0])),
    qTrack('antR1', T, T.map((_, i) => [-0.22 + s2[i] * 0.05, -0.12, 0])),
    qTrack('antL2', T, T.map(() => [-0.26, 0, 0])),
    qTrack('antR2', T, T.map(() => [-0.26, 0, 0])),
    ...wingPose(T, 0.16, 0.20, 0.04),
  ]
  LEG_CHAINS.forEach(([tag, side], li) => {
    const a = w(1, li * 0.7)
    tracks.push(qTrack(`${tag}a`, T, T.map((_, i) => [0.92 + a[i] * 0.03, 0, side * 0.18])))
    tracks.push(qTrack(`${tag}b`, T, T.map(() => [1.20, 0, 0])))
  })
  clips.push(new THREE.AnimationClip('Cruise', dur, tracks))
}

// ── "Land" — perched: wings closed straight up over the back, probing. ──
{
  const N = 41, dur = 4.0
  const T = Array.from({ length: N }, (_, i) => (i / (N - 1)) * dur)
  const w = (f, p = 0) => T.map((t) => Math.sin((t / dur) * Math.PI * 2 * f + p))
  const s1 = w(1), s3 = w(3, 0.3), s5 = w(5, 1.1)
  const tracks = [
    pTrack('root', T, T.map((_, i) => [0, -0.09 + s1[i] * 0.004, 0])),
    qTrack('thorax', T, T.map((_, i) => [s1[i] * 0.02, s1[i] * 0.04, 0])),
    qTrack('head', T, T.map((_, i) => [0.06 + s3[i] * 0.08, s1[i] * 0.20, 0])),
    qTrack('abdA', T, T.map((_, i) => [0.05 + s1[i] * 0.04, 0, 0])),
    qTrack('abdB', T, T.map((_, i) => [0.04 + s3[i] * 0.03, 0, 0])),
    qTrack('abdC', T, T.map(() => [0.03, 0, 0])),
    qTrack('antL1', T, T.map((_, i) => [s5[i] * 0.28, 0.30 + s3[i] * 0.18, 0])),
    qTrack('antR1', T, T.map((_, i) => [s5[i] * 0.28, -0.30 - s3[i] * 0.18, 0])),
    qTrack('antL2', T, T.map((_, i) => [-0.30 + s5[i] * 0.30, 0, 0])),
    qTrack('antR2', T, T.map((_, i) => [-0.30 + s5[i] * 0.30, 0, 0])),
    // The resting pose is wings pressed together straight up — not folded back
    // like a bee's. It is the single most recognisable butterfly silhouette.
    qTrack('wingLF1', T, T.map((_, i) => [0, -0.10, 1.50 + s1[i] * 0.03])),
    qTrack('wingLF2', T, T.map(() => [0, 0, 0.04])),
    qTrack('wingLF3', T, T.map(() => [0, 0, 0.03])),
    qTrack('wingRF1', T, T.map((_, i) => [0, 0.10, -1.50 - s1[i] * 0.03])),
    qTrack('wingRF2', T, T.map(() => [0, 0, -0.04])),
    qTrack('wingRF3', T, T.map(() => [0, 0, -0.03])),
    qTrack('wingLH1', T, T.map((_, i) => [0, -0.06, 1.46 + s1[i] * 0.03])),
    qTrack('wingLH2', T, T.map(() => [0, 0, 0.04])),
    qTrack('wingRH1', T, T.map((_, i) => [0, 0.06, -1.46 - s1[i] * 0.03])),
    qTrack('wingRH2', T, T.map(() => [0, 0, -0.04])),
  ]
  LEG_CHAINS.forEach(([tag, side], li) => {
    const a = w(1, li * 1.3)
    tracks.push(qTrack(`${tag}a`, T, T.map((_, i) => [-0.06 + a[i] * 0.02, 0, side * -0.30])))
    tracks.push(qTrack(`${tag}b`, T, T.map((_, i) => [0.72 + a[i] * 0.03, 0, 0])))
  })
  clips.push(new THREE.AnimationClip('Land', dur, tracks))
}

// ───────────────────────────────────────────────────────────── export ──
const root = new THREE.Group()
root.name = 'ButterflyRig'
root.add(mesh)

const exporter = new GLTFExporter()
const glb = await new Promise((res, rej) =>
  exporter.parse(root, res, rej, { binary: true, animations: clips, onlyVisible: false }))

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, Buffer.from(glb))

geo.computeBoundingBox()
const bb = geo.boundingBox
const tri = index.length / 3
console.log(`butterfly.glb  ${(glb.byteLength / 1024).toFixed(0)} KB`)
console.log(`  ${totalV.toLocaleString()} verts / ${tri.toLocaleString()} tris`)
console.log(`  bbox  ${(bb.max.x - bb.min.x).toFixed(3)} x ${(bb.max.y - bb.min.y).toFixed(3)} x ${(bb.max.z - bb.min.z).toFixed(3)}`)
console.log(`  ${bones.length} bones, ${clips.length} clips: ${clips.map((c) => `${c.name}(${c.duration}s)`).join(', ')}`)
