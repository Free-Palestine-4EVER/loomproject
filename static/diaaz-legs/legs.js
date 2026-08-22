// Real leg meshes, reconstructed from Diaaz's own technical drawings.
//
// Legs do not need to be parametric. A leg is a fixed product design; only its
// scale changes with the table. So a reconstructed mesh, fitted to the leg
// envelope, beats any approximation built from boxes — and it captures the
// shapes that straight bars simply cannot draw, like the ring legs and the
// sculptural spider base.
//
// Two things have to be handled on import:
//   1. Several drawings include the tabletop, so the reconstruction has a slab
//      on it. That slab is found and removed — we supply our own top, which
//      has to change size.
//   2. The reconstruction arrives at an arbitrary scale and pivot, so it is
//      normalised: centred, stood on the floor, and fitted to the height and
//      width the configured table needs.

const THREE = window.__SITE_THREE__;
import { GLTFLoader } from './GLTFLoader.js'
import { mergeVertices, toCreasedNormals } from './BufferGeometryUtils.js'

const loader = new GLTFLoader()
const cache = new Map()

export async function loadLeg(value) {
  if (cache.has(value)) return cache.get(value)
  const promise = loader.loadAsync(`/models/legs/${value}.glb`)
    .then(gltf => prepare(gltf.scene))
    .catch(() => null)
  cache.set(value, promise)
  return promise
}

/** Merge every mesh into one geometry in world space. */
function flatten(root) {
  root.updateMatrixWorld(true)
  const chunks = []
  root.traverse(o => {
    if (!o.isMesh) return
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
    g.applyMatrix4(o.matrixWorld)
    chunks.push(g.getAttribute('position').array)
  })
  if (!chunks.length) return null
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const pos = new Float32Array(total)
  let at = 0
  for (const c of chunks) { pos.set(c, at); at += c.length }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return g
}

/**
 * Finds the underside of the tabletop, if the reconstruction has one.
 *
 * A tabletop announces itself as a broad band of upward-facing area near the
 * top of the model. Walking down from the top, the first height at which that
 * horizontal area collapses is where the slab ends and the legs begin.
 * Returns null when there is no slab — many drawings show the base alone.
 */
function findSlabUnderside(pos, bbox) {
  const BINS = 80
  const minY = bbox.min.y, maxY = bbox.max.y
  const span = maxY - minY
  if (span <= 0) return null
  const flatArea = new Float64Array(BINS)
  const anyArea = new Float64Array(BINS)

  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3()

  for (let i = 0; i < pos.length; i += 9) {
    a.set(pos[i], pos[i + 1], pos[i + 2])
    b.set(pos[i + 3], pos[i + 4], pos[i + 5])
    c.set(pos[i + 6], pos[i + 7], pos[i + 8])
    ab.subVectors(b, a); ac.subVectors(c, a)
    n.crossVectors(ab, ac)
    const area = n.length() * 0.5
    if (!(area > 0)) continue
    n.normalize()
    const cy = (a.y + b.y + c.y) / 3
    let bin = Math.floor(((cy - minY) / span) * BINS)
    bin = Math.max(0, Math.min(BINS - 1, bin))
    anyArea[bin] += area
    if (Math.abs(n.y) > 0.82) flatArea[bin] += area
  }

  const peak = Math.max(...flatArea)
  if (peak <= 0) return null

  // The slab must live in the top third, and must dominate the model's area.
  const topThird = Math.floor(BINS * 0.66)
  let peakBin = -1
  for (let i = topThird; i < BINS; i++) if (flatArea[i] === peak) peakBin = i
  if (peakBin < 0) return null

  const totalArea = anyArea.reduce((s, v) => s + v, 0)
  if (peak < totalArea * 0.06) return null   // no dominant horizontal plane

  // Walk down while this band still looks like slab.
  let bin = peakBin
  while (bin > 0 && flatArea[bin - 1] > peak * 0.16) bin--
  const y = minY + (bin / BINS) * span
  // Refuse a cut that would eat most of the model.
  if (y < minY + span * 0.55) return null
  return y
}

/**
 * Keeps only the geometry that belongs to the base itself.
 *
 * Several of Diaaz's drawings put a small side-view detail of a single leg
 * beside the table. The reconstruction is faithful and includes it, so that
 * detail arrives as a separate lump of geometry floating next to the model —
 * a stray spike hanging in mid-air with nothing attached to it.
 *
 * Triangles are grouped into connected pieces, the largest piece seeds the
 * base, and any piece overlapping that group's footprint joins it. Whatever is
 * left sits on its own somewhere else in the drawing, and is dropped.
 */
function keepBaseGeometry(pos) {
  const triangleCount = pos.length / 9
  if (triangleCount < 2) return pos

  // Union-find over triangles that share a vertex position.
  const parent = new Int32Array(triangleCount).map((_, i) => i)
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a] } return a }
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra }

  const key = (i, k) => {
    const o = i * 9 + k * 3
    return `${Math.round(pos[o] * 1e4)},${Math.round(pos[o + 1] * 1e4)},${Math.round(pos[o + 2] * 1e4)}`
  }
  const seen = new Map()
  for (let i = 0; i < triangleCount; i++) {
    for (let k = 0; k < 3; k++) {
      const h = key(i, k)
      if (seen.has(h)) union(seen.get(h), i); else seen.set(h, i)
    }
  }

  // Collect pieces with their footprints.
  const pieces = new Map()
  for (let i = 0; i < triangleCount; i++) {
    const r = find(i)
    let p = pieces.get(r)
    if (!p) { p = { tris: [], minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }; pieces.set(r, p) }
    p.tris.push(i)
    for (let k = 0; k < 3; k++) {
      const o = i * 9 + k * 3
      p.minX = Math.min(p.minX, pos[o]); p.maxX = Math.max(p.maxX, pos[o])
      p.minZ = Math.min(p.minZ, pos[o + 2]); p.maxZ = Math.max(p.maxZ, pos[o + 2])
    }
  }
  const list = [...pieces.values()].sort((a, b) => b.tris.length - a.tris.length)
  if (list.length < 2) return pos

  const group = { ...list[0] }
  const overlaps = (p, g, pad) =>
    p.minX <= g.maxX + pad && p.maxX >= g.minX - pad &&
    p.minZ <= g.maxZ + pad && p.maxZ >= g.minZ - pad

  const kept = [list[0]]
  let grew = true
  while (grew) {
    grew = false
    const pad = Math.max(group.maxX - group.minX, group.maxZ - group.minZ) * 0.22
    for (const p of list) {
      if (kept.includes(p)) continue
      if (!overlaps(p, group, pad)) continue
      kept.push(p)
      group.minX = Math.min(group.minX, p.minX); group.maxX = Math.max(group.maxX, p.maxX)
      group.minZ = Math.min(group.minZ, p.minZ); group.maxZ = Math.max(group.maxZ, p.maxZ)
      grew = true
    }
  }
  if (kept.length === list.length) return pos

  const out = []
  for (const p of kept) {
    for (const i of p.tris) {
      for (let k = 0; k < 9; k++) out.push(pos[i * 9 + k])
    }
  }
  return out.length > 24 ? new Float32Array(out) : pos
}

function prepare(scene) {
  const merged = flatten(scene)
  if (!merged) return null
  merged.computeBoundingBox()
  const pos = merged.getAttribute('position').array

  /*
    ORDER MATTERS, AND THIS IS THE ORDER THE iOS APP USES (LegMesh.swift's
    stripSlabAndCentre: baseGeometryOnly, THEN slabUnderside). Stray-piece
    removal has to run while the tabletop is still attached.

    A four-legged design — the wire legs, the straight profiles — is four
    separate lumps of geometry joined only THROUGH the top. Cut the top off
    first and they stop touching: the largest-piece rule then keeps ONE leg and
    throws the other three away, and the table comes up with a single strut
    huddled under the middle of it. With the slab still in place all four are
    one connected piece and only what genuinely floats beside the drawing goes.
  */
  let kept = keepBaseGeometry(pos)

  const box = new THREE.Box3()
  for (let i = 0; i < kept.length; i += 3) {
    const v = new THREE.Vector3(kept[i], kept[i + 1], kept[i + 2])
    box.expandByPoint(v)
  }
  const cut = findSlabUnderside(kept, box)
  if (cut != null) {
    const out = []
    for (let i = 0; i < kept.length; i += 9) {
      const cy = (kept[i + 1] + kept[i + 4] + kept[i + 7]) / 3
      if (cy < cut) for (let k = 0; k < 9; k++) out.push(kept[i + k])
    }
    if (out.length > 24) kept = new Float32Array(out)
  }

  let g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(kept, 3))

  // Reconstructions arrive as loose triangle soup, so per-face normals leave
  // every curve visibly faceted. Welding coincident vertices and then creasing
  // by angle smooths the curvature while keeping genuine edges crisp — a
  // rounded leg reads round, a machined arris stays sharp.
  g = mergeVertices(g, 1e-4)
  g = toCreasedNormals(g, Math.PI / 4)
  g.computeBoundingBox()

  // Centre on the origin and stand it on the floor.
  const bb = g.boundingBox
  const cx = (bb.min.x + bb.max.x) / 2
  const cz = (bb.min.z + bb.max.z) / 2
  g.translate(-cx, -bb.min.y, -cz)
  g.computeBoundingBox()
  return g
}

/**
 * Fits the leg mesh under a table of the given size.
 *
 * Height is matched exactly — a leg that is not the right height is not a leg.
 * Width and depth are fitted to the space under the top, but never stretched
 * past their natural aspect, so a 300 cm table gets a longer *base*, not a
 * grotesquely wide one.
 */
export function fitLeg(geometry, { length, width, legHeight, spreadX = 0.62, spreadZ = 0.66 }) {
  const g = geometry.clone()
  const bb = g.boundingBox
  const size = new THREE.Vector3().subVectors(bb.max, bb.min)
  if (size.y <= 0) return g

  // Height is exact — a leg of the wrong height is not a leg.
  const sy = legHeight / size.y

  // The base is made to suit the top it carries, so it is fitted to a share
  // of the table rather than scaled uniformly. Left uniform, a base drawn
  // under a small table stays huddled in the middle of a long one.
  // The spread is a parameter because it is a JUDGEMENT, not a constant: it
  // depends on what the base sits under. 0.62/0.66 suits Diaaz's own tops. The
  // walnut-spider GLB's baked base spans the FULL footprint, so a leg fitted to
  // 62% of it next to that reference reads as undersized — comically so on a
  // 213 cm top.
  const targetX = length * spreadX
  const targetZ = width * spreadZ
  let sx = size.x > 0.001 ? targetX / size.x : sy
  let sz = size.z > 0.001 ? targetZ / size.z : sy

  // But never stretch a member out of proportion — clamp each axis to a
  // sane band around the height scale so bars keep their section.
  const clamp = (v) => Math.min(Math.max(v, sy * 0.62), sy * 1.75)
  sx = clamp(sx)
  sz = clamp(sz)

  g.scale(sx, sy, sz)
  g.computeBoundingBox()

  // A leg stops at the underside of the top it carries and never reaches
  // through it. When the slab detector misses a tabletop on a reconstruction,
  // that leftover slab gets scaled up to the leg envelope and its ragged edge
  // punches through the finished surface as a row of black spikes. Clipping
  // in height as well as footprint makes that impossible regardless of what
  // the detector did.
  return clipBox(g, length * 0.5, width * 0.5, legHeight - 0.004)
}

/**
 * Clips a triangle soup against a half-space, splitting triangles that cross
 * the plane rather than discarding them.
 *
 * Dropping whole straddling triangles is what left a row of black spikes where
 * a leg met the underside of the top: every triangle that crossed the cut was
 * thrown away entire, so the cut came out serrated instead of flat.
 *
 * `axis` is 0/1/2 and `keepBelow` selects which side survives.
 */
function clipHalfSpace(positions, axis, limit, keepBelow) {
  const out = []
  const inside = (p) => (keepBelow ? p[axis] <= limit : p[axis] >= limit)
  const lerp = (a, b) => {
    const t = (limit - a[axis]) / (b[axis] - a[axis])
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  }

  for (let i = 0; i < positions.length; i += 9) {
    const v = [
      [positions[i], positions[i + 1], positions[i + 2]],
      [positions[i + 3], positions[i + 4], positions[i + 5]],
      [positions[i + 6], positions[i + 7], positions[i + 8]],
    ]
    const keep = v.map(inside)
    const count = keep.filter(Boolean).length
    if (count === 3) {
      for (const p of v) out.push(p[0], p[1], p[2])
      continue
    }
    if (count === 0) continue

    if (count === 1) {
      // One corner survives: a smaller triangle to the plane.
      const k = keep.indexOf(true)
      const a = v[k], b = v[(k + 1) % 3], c = v[(k + 2) % 3]
      const ab = lerp(a, b), ac = lerp(a, c)
      for (const p of [a, ab, ac]) out.push(p[0], p[1], p[2])
    } else {
      // Two corners survive: a quad, emitted as two triangles.
      const k = keep.indexOf(false)
      const a = v[k], b = v[(k + 1) % 3], c = v[(k + 2) % 3]
      const ab = lerp(a, b), ac = lerp(a, c)
      for (const p of [ab, b, c]) out.push(p[0], p[1], p[2])
      for (const p of [ab, c, ac]) out.push(p[0], p[1], p[2])
    }
  }
  return out
}

function clipBox(geometry, halfX, halfZ, maxY) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  let pos = Array.from(source.getAttribute('position').array)

  // Height first — that is the cut that shows — then the footprint.
  pos = clipHalfSpace(pos, 1, maxY, true)
  pos = clipHalfSpace(pos, 0, halfX, true)
  pos = clipHalfSpace(pos, 0, -halfX, false)
  pos = clipHalfSpace(pos, 2, halfZ, true)
  pos = clipHalfSpace(pos, 2, -halfZ, false)

  if (pos.length < 24) return source

  const clipped = new THREE.BufferGeometry()
  clipped.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  // Cutting creates new edges, so normals are rebuilt and re-creased rather
  // than carried over; otherwise the fresh faces have none at all.
  const welded = mergeVertices(clipped, 1e-5)
  const finished = toCreasedNormals(welded, Math.PI / 4)
  finished.computeBoundingBox()
  return finished
}

