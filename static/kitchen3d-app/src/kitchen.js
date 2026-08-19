/**
 * kitchen.js — the parametric kitchen.
 *
 * Nothing here is a loaded model. The whole room is built from real joinery
 * dimensions every time the config changes, which is the only way a
 * configurator can be honest: if you pick a U-shape with tall units, the run
 * length on the spec sheet is measured off the geometry that was actually
 * built, not off a lookup table someone forgot to update.
 *
 * COORDINATES. Metres. Floor at y = 0. Room centred on the origin: X is width,
 * Z is depth, back wall at -d/2, glazing on +X. Cabinet runs are described as
 * (origin, direction, length) and the builder walks them — so adding a layout
 * is a list of four runs, not a new function.
 *
 * DIMENSIONS are the European standard set, because that is what these are
 * actually made to:
 *   plinth 150 · base carcass 720 · worktop 20–40 · = 890–910 finished height
 *   wall units start at 1500, 720 tall, 350 deep
 *   tall units 2280 · standard depth 600 · island 1000 deep
 *   4 mm shadow gap between every front — the gap IS the design
 */

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  frontMaterial, worktopMaterial, metalMaterial, floorMaterial,
  wallMaterial, reededGlassMaterial, clearGlassMaterial,
} from './materials.js'
import { LAYOUTS, WORKTOPS, CABINET_FINISHES, METALS } from './config.js'

/* ------------------------------------------------------------ dimensions -- */

const D = {
  plinth: 0.15,
  baseCarcass: 0.72,
  baseDepth: 0.60,
  wallBottom: 1.50,
  wallHeight: 0.72,
  wallDepth: 0.35,
  tallHeight: 2.28,
  islandDepth: 1.00,
  gap: 0.004,          // shadow gap between fronts
  frontThick: 0.019,   // 19 mm front
  overhang: 0.02,      // worktop past the front face
}

/* ---------------------------------------------------------------- helpers -- */

// Everything visible gets a 1.5 mm radius. Real joinery has an arris; a
// perfectly sharp CG edge is the fastest way to make a render look synthetic,
// because it produces a zero-width specular line the eye never sees in life.
const geoCache = new Map()
function roundedBox(w, h, d, r = 0.0015) {
  const rr = Math.min(r, w / 2.05, h / 2.05, d / 2.05)
  const key = `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}|${rr.toFixed(4)}`
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 2, rr))
  return geoCache.get(key)
}

function mesh(geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.castShadow = cast
  m.receiveShadow = receive
  return m
}

const box = (w, h, d, mat, x, y, z, opts) => mesh(roundedBox(w, h, d), mat, x, y, z, opts)
// Same thing under a name that does not collide with local `box` variables
// inside the run builder.
const box3 = box

/** Direction helpers — runs are axis-aligned, so this stays trivial. */
function dirVec(dir) {
  return { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }[dir]
}
/**
 * Outward normal — the way the fronts face.
 *
 * This is `dir × up`, i.e. dir rotated 90° clockwise seen from above:
 *   +x -> +z    +z -> -x    -x -> -z    -z -> +x
 *
 * Layouts must therefore choose the run direction that puts this normal into
 * the room, not into the wall:
 *   back wall  (z = -d/2)  -> '+x'
 *   left wall  (x = -w/2)  -> '-z'
 *   right wall (x = +w/2)  -> '+z'
 *   front wall (z = +d/2)  -> '-x'
 *
 * Getting this backwards builds the entire kitchen behind the plasterboard,
 * which renders as a blank wall with a few edges poking through — and looks
 * far more like a lighting bug than a geometry one, so it is worth stating.
 */
function normalVec(dir) {
  return { '+x': [0, 1], '-x': [0, -1], '+z': [-1, 0], '-z': [1, 0] }[dir]
}


/* ---------------------------------------------------- fluted geometry -- */

/**
 * A REAL fluted panel — half-round staves cut into the front face.
 *
 * This was a normal map. A normal map is the right call for a texture you view
 * face-on, and the wrong call for the hero detail of the whole kitchen: the
 * silhouette stays a razor-straight line, the panel edge does not scallop, and
 * at the grazing angles you get across an island the reeds flatten out
 * completely. It reads as a printed panel, because that is what it is.
 *
 * Built as a purpose-made BufferGeometry rather than an ExtrudeGeometry: the
 * profile is constant up the panel, so the front face only needs two rows of
 * vertices and no cap triangulation. A 900 drawer front costs about 600
 * triangles, which is nothing, and buys a correct outline at every angle.
 *
 * Normals come from the analytic derivative of the profile, not from
 * computeVertexNormals — averaging across the flats between staves rounds off
 * the crisp shadow line where each reed meets the next, which is the entire
 * effect.
 */
const flutedCache = new Map()
// 6 mm of relief on an 18 mm pitch, not 4.5. Deeper reeds hold a shadow at
// shallower incidence, which is what keeps the fluting legible across a whole
// island rather than only where a light happens to graze it.
function flutedPanel(w, h, t, pitch = 0.018, relief = 0.006) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${t.toFixed(3)}|${pitch}`
  if (flutedCache.has(key)) return flutedCache.get(key)

  const staves = Math.max(3, Math.round(w / pitch))
  const seg = 5                                  // segments per stave
  const cols = staves * seg
  const pos = [], nor = [], uv = [], idx = []

  const halfW = w / 2, halfH = h / 2, front = t / 2

  // Front face: one quad strip, profile sampled across the width.
  for (let i = 0; i <= cols; i++) {
    const u = i / cols
    const x = -halfW + u * w
    const p = (i / seg) % 1                      // position within this stave
    // Half-round with a small flat land, matching how these are machined.
    const flat = 0.14
    let z = 0, dz = 0
    if (p > flat * 0.5 && p < 1 - flat * 0.5) {
      const q = (p - flat * 0.5) / (1 - flat)
      z = Math.sin(q * Math.PI) * relief
      // d/dx of the profile — the analytic normal.
      dz = Math.cos(q * Math.PI) * Math.PI * relief / ((1 - flat) * pitch)
    }
    const nx = -dz, nz = 1
    const len = Math.hypot(nx, nz)
    for (const y of [-halfH, halfH]) {
      pos.push(x, y, front + z)
      nor.push(nx / len, 0, nz / len)
      uv.push(u, (y + halfH) / h)
    }
  }
  for (let i = 0; i < cols; i++) {
    const a = i * 2
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }

  // Back and the four edges. Plain quads — none of this is ever seen, but the
  // panel has to be a closed solid or it renders inside-out from behind and
  // leaks light through the shadow gaps.
  const base = pos.length / 3
  const quad = (verts, n) => {
    const start = pos.length / 3
    for (const v of verts) {
      pos.push(v[0], v[1], v[2])
      nor.push(n[0], n[1], n[2])
      uv.push((v[0] + halfW) / w, (v[1] + halfH) / h)
    }
    idx.push(start, start + 1, start + 2, start, start + 2, start + 3)
  }
  const back = -front
  quad([[halfW, -halfH, back], [-halfW, -halfH, back], [-halfW, halfH, back], [halfW, halfH, back]], [0, 0, -1])
  quad([[-halfW, halfH, back], [-halfW, halfH, front], [halfW, halfH, front], [halfW, halfH, back]], [0, 1, 0])
  quad([[halfW, -halfH, back], [halfW, -halfH, front], [-halfW, -halfH, front], [-halfW, -halfH, back]], [0, -1, 0])
  quad([[halfW, -halfH, back], [halfW, halfH, back], [halfW, halfH, front], [halfW, -halfH, front]], [1, 0, 0])
  quad([[-halfW, halfH, back], [-halfW, -halfH, back], [-halfW, -halfH, front], [-halfW, halfH, front]], [-1, 0, 0])

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeBoundingSphere()
  flutedCache.set(key, g)
  return g
}

/**
 * Front panel geometry for a given door style. Fluted gets real relief;
 * everything else is a rounded box, because a slab front IS a rounded box and
 * spending triangles on it would buy nothing.
 *
 * `axis` is which way the panel faces: 'x' or 'z'.
 */
function frontGeometry(style, w, h, t, axis) {
  if (style !== 'fluted') {
    return axis === 'x' ? roundedBox(t, h, w) : roundedBox(w, h, t)
  }
  const g = flutedPanel(w, h, t)
  if (axis !== 'x') return g
  // Rotate a copy for runs facing along X. Cached on the same key plus the
  // axis, so this happens once per distinct panel size.
  const key = `rot|${w.toFixed(3)}|${h.toFixed(3)}|${t.toFixed(3)}`
  if (!flutedCache.has(key)) {
    const r = g.clone()
    r.rotateY(Math.PI / 2)
    flutedCache.set(key, r)
  }
  return flutedCache.get(key)
}

/* ------------------------------------------------------------ front sets -- */

/**
 * Split a run into cabinet-sized bays. Real kitchens are built from 300/450/
 * 600/800/900 carcasses, so a 3.4 m run is not one 3.4 m door — it is a
 * specific set of boxes. Getting this wrong is the single clearest tell that a
 * configurator was drawn rather than specified.
 */
function bays(length) {
  const sizes = [0.9, 0.8, 0.6, 0.45, 0.3]
  const out = []
  let left = length
  let guard = 0
  while (left > 0.28 && guard++ < 40) {
    const fit = sizes.find((s) => s <= left + 0.001) ?? 0.3
    out.push(fit)
    left -= fit
  }
  // Anything under a 300 carcass becomes a filler panel, exactly as it would on
  // site. Swallowing it into the last door would put the handles out of line.
  if (left > 0.005) out.push(-left)
  return out
}

/**
 * A base cabinet's front layout. Drawer stacks and doors are not
 * interchangeable: a 900 gets a 3-drawer stack, a 600 gets a door, a 300 gets a
 * pull-out. That mapping is what makes the elevation read as a real kitchen.
 */
function frontSplit(width, height) {
  // Returns [{ h, type }]. The TYPE matters as much as the height now that
  // these open: a 140 mm front is always a drawer, a 700 mm front on a 600
  // carcass is always a door, and guessing from height alone gets the 900
  // three-drawer stack wrong (its bottom drawer is 500 mm, taller than plenty
  // of doors).
  if (width <= 0.32) return [{ h: height, type: 'drawer' }]        // tall pull-out
  if (width >= 0.85) {
    return [
      { h: 0.14, type: 'drawer' },
      { h: height * 0.36, type: 'drawer' },
      { h: height * 0.5, type: 'drawer' },
    ]
  }
  if (width >= 0.75) return [{ h: 0.14, type: 'drawer' }, { h: height - 0.14, type: 'door' }]
  return [{ h: height, type: 'door' }]
}

/* --------------------------------------------------------------- opening -- */

/**
 * Registers a front so it can be opened, and returns the pivot group its mesh
 * and handle should be parented to.
 *
 * DOORS rotate about their hinge STILE, not their centre — which is why every
 * door needs its own group positioned on the hinge edge with the panel offset
 * inside it. Rotating a mesh about its own origin swings it through the
 * carcass and looks like a magic trick.
 *
 * The direction of swing is derived, not hard-coded: rotating the hinge-to-edge
 * vector `d` about Y moves it toward the outward normal `n` when
 * (d.z·n.x − d.x·n.z) is positive. That one expression covers runs along either
 * axis, facing either way, hinged on either side — the alternative is four
 * sign-flipped special cases that fall apart the first time a layout changes.
 */
function registerOpenable(ctx, { type, pivotPos, offset, normal, width, height, boxDepth }) {
  const pivot = new THREE.Group()
  pivot.position.copy(pivotPos)

  const swing = Math.sign(offset.z * normal.x - offset.x * normal.z) || 1
  ctx.openables.push({
    pivot,
    type,
    swing,
    normal: normal.clone(),

    // 88°, not 105°.
    //
    // The old value was justified as "past 90 it clears the adjacent front",
    // which is true of a real hinge and irrelevant here — nothing in this scene
    // collides. What it actually produced was doors swinging back on themselves
    // past square, which reads as broken rather than as generous. Add the
    // settle overshoot on top and they were reaching about 110°.
    //
    // Just under 90 is what a fitted kitchen door does when it stops, and it
    // keeps the front readable instead of edge-on to the camera.
    maxAngle: Math.PI * 0.489,

    // Travel is measured against THIS cabinet's box, not a global constant.
    //
    // Every drawer used to slide 540 mm — 90% of a base carcass — including
    // island drawers whose boxes are only 460 mm deep. The box left its own
    // carcass entirely and hung in the air over the floor. Now it is a fraction
    // of the real box depth, so the back of the drawer always stays inside the
    // cabinet and the thing reads as running on rails.
    maxSlide: (boxDepth ?? D.baseDepth) * 0.72,

    open: 0,
    target: 0,
  })
  return pivot
}

/**
 * Shelves inside a cabinet.
 *
 * Opening a door used to reveal an empty black carcass, which looks less like a
 * cupboard than a hole. A shelf or two costs nothing and is the difference
 * between "this door opens" and "this is a cupboard".
 */
function buildShelves(ctx, { cx, cz, nx, nz, dx, dz, width, depth, y0, y1 }) {
  const g = new THREE.Group()
  const span = y1 - y0
  // One shelf per ~380 mm of height, which is roughly how they are actually
  // set out — enough to be useful, not so many it reads as a display unit.
  const count = Math.max(1, Math.round(span / 0.38) - 1)
  const inset = 0.03

  for (let i = 1; i <= count; i++) {
    const y = y0 + (span / (count + 1)) * i
    const shelf = mesh(
      roundedBox(
        Math.abs(dx) * (width - inset * 2) + Math.abs(nx) * (depth - inset * 2),
        0.018,
        Math.abs(dz) * (width - inset * 2) + Math.abs(nz) * (depth - inset * 2),
        0.002
      ),
      ctx.shelfMat,
      cx + nx * depth / 2, y, cz + nz * depth / 2,
      { cast: false }
    )
    g.add(shelf)
  }
  return g
}



/**
 * The box behind a drawer front. Only built for drawers, only visible once one
 * is open — but without it an open drawer is a floating panel with a hole
 * behind it, which is worse than not opening at all.
 */
function drawerBox(ctx, w, h, depth, normal) {
  const g = new THREE.Group()
  const mat = ctx.drawerMat
  const wall = 0.014
  const inner = Math.max(0.08, h - 0.03)
  // Along the run vs across it — the box is built in the front's local frame,
  // where +x is the front's width and +z is into the cabinet.
  const along = Math.abs(normal.x) > 0.5 ? 'z' : 'x'
  const bw = along === 'x' ? w : depth
  const bd = along === 'x' ? depth : w

  const base = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.02, wall, bd - 0.02), mat)
  base.position.set(-normal.x * depth / 2, -inner / 2 + wall, -normal.z * depth / 2)
  base.castShadow = false
  g.add(base)

  const sideGeoA = along === 'x'
    ? new THREE.BoxGeometry(wall, inner, bd - 0.02)
    : new THREE.BoxGeometry(bw - 0.02, inner, wall)
  for (const sgn of [-1, 1]) {
    const side = new THREE.Mesh(sideGeoA, mat)
    side.position.set(
      -normal.x * depth / 2 + (along === 'x' ? sgn * (w / 2 - wall / 2) : 0),
      0,
      -normal.z * depth / 2 + (along === 'x' ? 0 : sgn * (w / 2 - wall / 2))
    )
    g.add(side)
  }
  const backGeo = along === 'x'
    ? new THREE.BoxGeometry(bw - 0.02, inner, wall)
    : new THREE.BoxGeometry(wall, inner, bd - 0.02)
  const back = new THREE.Mesh(backGeo, mat)
  back.position.set(-normal.x * (depth - wall), 0, -normal.z * (depth - wall))
  g.add(back)
  return g
}



/* --------------------------------------------------------------- cabinets -- */

/**
 * Builds one run of cabinetry and returns it plus the metrics the spec sheet
 * needs. `kind` is 'base' | 'wall' | 'tall'.
 */
function buildRun(spec, state, ctx) {
  const g = new THREE.Group()
  const [dx, dz] = dirVec(spec.dir)
  const [nx, nz] = normalVec(spec.dir)
  const kind = spec.kind
  const depth = kind === 'wall' ? D.wallDepth : D.baseDepth
  const height = kind === 'wall' ? D.wallHeight : kind === 'tall' ? D.tallHeight : D.baseCarcass
  const yBase = kind === 'wall' ? D.wallBottom : kind === 'tall' ? 0 : D.plinth

  const bayList = bays(spec.length)
  let cursor = 0
  const counts = { base: 0, wall: 0, tall: 0 }

  for (const raw of bayList) {
    const w = Math.abs(raw)
    const isFiller = raw < 0
    const cx = spec.x + dx * (cursor + w / 2)
    const cz = spec.z + dz * (cursor + w / 2)
    cursor += w

    // Carcass. Almost never seen, but it closes the shadow gaps — without a
    // dark body behind the fronts the gaps glow with whatever is behind the run.
    const carcass = box(
      Math.abs(dx) * w + Math.abs(nx) * depth,
      height,
      Math.abs(dz) * w + Math.abs(nz) * depth,
      ctx.carcassMat,
      cx + nx * depth / 2, yBase + height / 2, cz + nz * depth / 2,
      { cast: false }
    )
    g.add(carcass)

    if (isFiller) continue
    counts[kind]++

    // Fronts.
    const fw = w - D.gap
    const splits = kind === 'tall'
      ? [
        { h: 0.60, type: 'drawer' },
        { h: 0.80, type: 'door' },
        { h: height - 1.40 - D.gap * 2, type: 'door' },
      ]
      : kind === 'wall'
        ? [{ h: height, type: 'door' }]
        : frontSplit(w, height)

    let fy = yBase
    for (const split of splits) {
      const fh = split.h - D.gap
      const isGlass = spec.glass && fy >= 1.35
      const mat = isGlass ? ctx.glassMat : ctx.frontMat(fw, fh)
      const type = split.type

      const faceX = cx + nx * (depth + D.frontThick / 2)
      const faceZ = cz + nz * (depth + D.frontThick / 2)
      const cy = fy + fh / 2

      // Hinge side alternates down a run, so adjacent doors open away from
      // each other rather than colliding — which is how they are actually hung.
      const hingeSign = (counts.base + counts.wall + counts.tall) % 2 === 0 ? -1 : 1
      const halfAlongX = Math.abs(dx) > 0 ? fw / 2 : 0
      const halfAlongZ = Math.abs(dz) > 0 ? fw / 2 : 0

      const pivotPos = type === 'door'
        ? new THREE.Vector3(faceX + hingeSign * halfAlongX, cy, faceZ + hingeSign * halfAlongZ)
        : new THREE.Vector3(faceX, cy, faceZ)
      const offset = new THREE.Vector3(faceX - pivotPos.x, 0, faceZ - pivotPos.z)

      const boxDepth = depth - 0.05
      const pivot = registerOpenable(ctx, {
        type,
        pivotPos,
        offset,
        normal: new THREE.Vector3(nx, 0, nz),
        width: fw,
        height: fh,
        boxDepth,
      })
      g.add(pivot)

      // Doors get an interior. Drawers bring their own box, and glazed fronts
      // already have lit shelves built for them by the vitrine pass.
      if (type === 'door' && !isGlass) {
        g.add(buildShelves(ctx, {
          cx, cz, nx, nz, dx, dz,
          width: fw, depth, y0: fy + 0.04, y1: fy + fh - 0.04,
        }))
      }

      let front
      if (isGlass) {
        // A SINGLE PLANE, not a box. A closed box rendered transparent and
        // double-sided with depthWrite off is twelve blended layers stacked on
        // each other, and the sort order flips as the camera moves.
        front = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), mat)
        front.rotation.y = Math.abs(dx) > 0
          ? (nz > 0 ? 0 : Math.PI)
          : (nx > 0 ? Math.PI / 2 : -Math.PI / 2)
        front.renderOrder = 20
      } else {
        front = mesh(
          frontGeometry(state.door, fw, fh, D.frontThick, Math.abs(dx) > 0 ? 'z' : 'x'),
          mat, 0, 0, 0
        )
      }
      front.position.set(offset.x, 0, offset.z)
      front.userData.openable = ctx.openables.length - 1
      pivot.add(front)

      if (type === 'drawer') {
        const box = drawerBox(ctx, fw, fh, boxDepth, new THREE.Vector3(nx, 0, nz))
        box.position.set(offset.x, 0, offset.z)
        pivot.add(box)
      }

      if (isGlass) {
        // A glazed door is a frame plus a pane; the frame is what you read at
        // distance, so it gets the metal, not the glass.
        const fr = 0.022
        const addBar = (bw, bh, ox, oy) => {
          const bar = box3(
            Math.abs(dx) * bw + Math.abs(nx) * (D.frontThick + 0.002),
            bh,
            Math.abs(dz) * bw + Math.abs(nz) * (D.frontThick + 0.002),
            ctx.metalMat,
            offset.x + dx * ox, oy, offset.z + dz * ox
          )
          bar.userData.openable = ctx.openables.length - 1
          pivot.add(bar)
        }
        addBar(fw, fr, 0, fh / 2 - fr / 2)
        addBar(fw, fr, 0, -fh / 2 + fr / 2)
        addBar(fr, fh, -fw / 2 + fr / 2, 0)
        addBar(fr, fh, fw / 2 - fr / 2, 0)
        ctx.vitrines.push({ cx, cz, nx, nz, fy, fh, fw, dx, dz, depth })
      } else if (state.handles === 'rail') {
        const rail = box3(
          Math.abs(dx) * fw + Math.abs(nx) * 0.012, 0.016,
          Math.abs(dz) * fw + Math.abs(nz) * 0.012,
          ctx.metalMat,
          offset.x + nx * (D.frontThick / 2 + 0.004), fh / 2 - 0.014,
          offset.z + nz * (D.frontThick / 2 + 0.004)
        )
        rail.userData.openable = ctx.openables.length - 1
        pivot.add(rail)
      } else if (state.handles === 'bar') {
        const bl = Math.min(fw * 0.5, 0.32)
        // A door's handle sits on the LEAF edge, away from the hinge; a
        // drawer's sits centred. Putting a door pull next to its own hinge is
        // the detail everyone notices and nobody can name.
        const hx = type === 'door' ? -hingeSign * (fw / 2 - 0.06) : 0
        const bar = mesh(
          cylY(0.009, bl, Math.abs(dz) > 0),
          ctx.metalMat,
          offset.x + nx * (D.frontThick / 2 + 0.028) + dx * (type === 'door' ? hx : 0),
          type === 'drawer' ? 0 : 0,
          offset.z + nz * (D.frontThick / 2 + 0.028) + dz * (type === 'door' ? hx : 0)
        )
        if (type === 'door') {
          // Vertical pull on a door, horizontal on a drawer.
          bar.geometry = cylY(0.009, bl, false)
          bar.rotation.z = Math.PI / 2
        }
        bar.userData.openable = ctx.openables.length - 1
        pivot.add(bar)
      }

      fy += split.h
    }
  }

  // Plinth — set back 60 mm, which is what makes the run appear to float and
  // gives the LED strip somewhere to hide.
  if (kind !== 'wall') {
    const pw = spec.length
    g.add(box(
      Math.abs(dx) * pw + Math.abs(nx) * (depth - 0.06),
      D.plinth,
      Math.abs(dz) * pw + Math.abs(nz) * (depth - 0.06),
      ctx.plinthMat,
      spec.x + dx * pw / 2 + nx * (depth - 0.06) / 2,
      D.plinth / 2,
      spec.z + dz * pw / 2 + nz * (depth - 0.06) / 2,
      { cast: false }
    ))
  }

  return { group: g, counts, bayList }
}

// A cylinder lying along X or Z (for handle bars, rails, tap spouts).
function cylY(r, len, alongZ) {
  const geo = new THREE.CylinderGeometry(r, r, len, 16)
  geo.rotateZ(Math.PI / 2)
  if (alongZ) geo.rotateY(Math.PI / 2)
  return geo
}

/* ---------------------------------------------------------------- worktop -- */

function buildWorktop(spec, state, ctx) {
  const t = WORKTOPS[state.worktop].thickness
  const [dx, dz] = dirVec(spec.dir)
  const [nx, nz] = normalVec(spec.dir)
  const depth = D.baseDepth + D.frontThick + D.overhang
  const y = D.plinth + D.baseCarcass + t / 2

  const w = Math.abs(dx) * spec.length + Math.abs(nx) * depth
  const d = Math.abs(dz) * spec.length + Math.abs(nz) * depth
  const mat = worktopMaterial(state.worktop, [Math.max(w, 0.1), Math.max(d, 0.1)])
  ctx.disposables.push(mat)

  return box(
    w, t, d, mat,
    spec.x + dx * spec.length / 2 + nx * depth / 2,
    y,
    spec.z + dz * spec.length / 2 + nz * depth / 2,
    { cast: true }
  )
}

/* -------------------------------------------------------------- lighting -- */

/**
 * Under-cabinet and plinth light. Two parts, and both are needed:
 *  - an EMISSIVE STRIP, so the source is visible in the frame and in reflections
 *  - a RECT AREA LIGHT, so it actually lights the worktop
 * Doing only the first gives a glowing line that illuminates nothing; only the
 * second gives light with no visible source. Together they read as a real strip.
 */
function ledStrip(g, { x, y, z, length, dir, facing, color, intensity, width = 0.012, lit = true }) {
  const [dx, dz] = dirVec(dir)
  // TONE MAPPED. With tone mapping bypassed an LED strip clips to pure white
  // and stays a hard flat band no matter what the exposure is — the one thing
  // in the frame the eye cannot place. Run through the same curve as
  // everything else it rolls off, keeps a warm core, and reads as a lit strip
  // rather than a cut-out.
  const em = new THREE.MeshBasicMaterial({ color })
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(
      Math.abs(dx) * length + Math.abs(dz) * width, 0.006,
      Math.abs(dz) * length + Math.abs(dx) * width
    ), em
  )
  strip.position.set(x, y, z)
  g.add(strip)

  // `lit: false` gives the extrusion without the light. The strip still reads
  // as on — it is emissive, and the environment map carries a band at this
  // height — it just stops contributing a full area-light evaluation to every
  // fragment in the room.
  if (!lit) return { strip, light: null, material: em }

  const light = new THREE.RectAreaLight(color, intensity, length, width * 6)
  light.position.set(x, y - 0.004, z)
  if (Math.abs(dz) > 0) light.rotation.y = Math.PI / 2
  light.rotation.x = facing === 'down' ? -Math.PI / 2 : Math.PI / 2
  g.add(light)
  return { strip, light, material: em }
}

/* ------------------------------------------------------------- appliances -- */

function buildSink(ctx, x, z, facing) {
  const g = new THREE.Group()
  const steel = ctx.sinkMat
  const y = D.plinth + D.baseCarcass

  // Undermount bowl — the rim is under the stone, so what you see is the cut
  // edge of the slab and then the bowl below it.
  const bw = 0.52, bd = 0.40, bh = 0.20
  const wall = 0.008
  const shell = new THREE.Group()
  const add = (w, h, d, px, py, pz) => shell.add(mesh(roundedBox(w, h, d, 0.01), steel, px, py, pz, { cast: false }))
  add(bw, wall, bd, 0, -bh + wall / 2, 0)
  add(wall, bh, bd, -bw / 2 + wall / 2, -bh / 2, 0)
  add(wall, bh, bd, bw / 2 - wall / 2, -bh / 2, 0)
  add(bw, bh, wall, 0, -bh / 2, -bd / 2 + wall / 2)
  add(bw, bh, wall, 0, -bh / 2, bd / 2 - wall / 2)
  shell.position.set(x, y, z)
  g.add(shell)

  // Tap: professional pull-down. A gooseneck reads generic; the straight column
  // with a swivel spout is what is actually specified at this level.
  const col = mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.36, 20), ctx.tapMat, x, y + 0.18, z - 0.30)
  g.add(col)
  const spout = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 16), ctx.tapMat, x, y + 0.355, z - 0.19)
  spout.rotation.x = Math.PI / 2
  g.add(spout)
  const nose = mesh(new THREE.CylinderGeometry(0.016, 0.013, 0.07, 16), ctx.tapMat, x, y + 0.325, z - 0.075)
  g.add(nose)
  const lever = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.10, 12), ctx.tapMat, x + 0.03, y + 0.30, z - 0.30)
  lever.rotation.z = Math.PI / 2.4
  g.add(lever)
  return g
}

function buildHob(ctx, x, z) {
  const g = new THREE.Group()
  const y = D.plinth + D.baseCarcass + WORKTOPS[ctx.state.worktop].thickness
  // Flush-fit induction: a sheet of black glass set into the stone, nothing more.
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#0b0c0d', roughness: 0.06, metalness: 0, clearcoat: 1,
    clearcoatRoughness: 0.03, envMapIntensity: 1.4,
  })
  g.add(box(0.80, 0.006, 0.50, glass, x, y + 0.003, z, { cast: false }))
  // Zone rings, screen-printed. Barely visible, and their absence is noticed.
  const ring = new THREE.MeshBasicMaterial({ color: '#2a2c2e', toneMapped: false })
  for (const [ox, oz] of [[-0.19, -0.11], [0.19, -0.11], [-0.19, 0.11], [0.19, 0.11]]) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.088, 48), ring)
    r.rotation.x = -Math.PI / 2
    r.position.set(x + ox, y + 0.0065, z + oz)
    g.add(r)
  }
  return g
}

function buildOvenStack(ctx, x, z, facing) {
  const g = new THREE.Group()
  const [nx, nz] = normalVec(facing)
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#0d0e10', roughness: 0.10, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06,
  })
  // Two ovens stacked at eye level, in a tall housing. Heights are the real
  // installation heights — the top of the upper oven at 1.65 is why this reads
  // right even though you never consciously measure it.
  for (const y of [0.95, 1.55]) {
    g.add(box(0.596, 0.55, 0.02, glass, x + nx * 0.601, y, z + nz * 0.601, { cast: false }))
    g.add(box(0.596, 0.02, 0.03, ctx.metalMat, x + nx * 0.605, y - 0.30, z + nz * 0.605))
    // Control strip: a dark band with a lit display. One warm pixel of screen is
    // worth more than any amount of modelled dial.
    g.add(box(0.596, 0.05, 0.022, ctx.carcassMat, x + nx * 0.602, y + 0.31, z + nz * 0.602, { cast: false }))
    const dsp = new THREE.Mesh(
      new THREE.PlaneGeometry(0.10, 0.018),
      new THREE.MeshBasicMaterial({ color: '#ff8a3d', toneMapped: false })
    )
    dsp.position.set(x + nx * 0.614, y + 0.311, z + nz * 0.614)
    dsp.rotation.y = nx !== 0 ? Math.PI / 2 * Math.sign(nx) : (nz > 0 ? 0 : Math.PI)
    g.add(dsp)
  }
  return g
}


/**
 * Extractor hood. A hob with no extraction over it is the kind of absence
 * nobody consciously notices and everybody feels — it is the one appliance a
 * kitchen legally cannot do without, and its absence leaves a dead rectangle
 * of wall above the most important part of the run.
 *
 * Modelled as a box-hood: a slim canopy on a chimney to the ceiling, with a
 * lit underside. The light matters more than the shape — an unlit hood is a
 * shadow over the hob, which is the opposite of what one does.
 */
function buildHood(ctx, x, z, facing, ceilingY) {
  const g = new THREE.Group()
  const [nx, nz] = normalVec(facing)
  const body = new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.42, metalness: 0.55 })
  ctx.disposables.push(body)

  const w = 0.90, d = 0.52, hh = 0.16
  const y = 1.62                                  // 700 mm over a 900 worktop
  const cx = x + nx * (d / 2 - 0.04)
  const cz = z + nz * (d / 2 - 0.04)

  const canopy = new THREE.Mesh(
    roundedBox(Math.abs(nz) * w + Math.abs(nx) * d, hh, Math.abs(nx) * w + Math.abs(nz) * d, 0.006),
    body
  )
  canopy.position.set(cx, y, cz)
  canopy.castShadow = true
  g.add(canopy)

  // Chimney to the ceiling. Narrower than the canopy, set back to the wall.
  const chim = new THREE.Mesh(
    new THREE.BoxGeometry(Math.abs(nz) * 0.32 + Math.abs(nx) * 0.24, ceilingY - y - hh / 2, Math.abs(nx) * 0.32 + Math.abs(nz) * 0.24),
    body
  )
  chim.position.set(x + nx * 0.14, y + hh / 2 + (ceilingY - y - hh / 2) / 2, z + nz * 0.14)
  chim.castShadow = true
  g.add(chim)

  // The lit underside: a filter panel plus a real light onto the hob.
  const filter = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.abs(nz) * (w - 0.06) + Math.abs(nx) * (d - 0.06),
      Math.abs(nx) * (w - 0.06) + Math.abs(nz) * (d - 0.06)),
    new THREE.MeshStandardMaterial({ color: '#3a3a3d', roughness: 0.3, metalness: 0.8 })
  )
  filter.rotation.x = Math.PI / 2
  filter.position.set(cx, y - hh / 2 + 0.002, cz)
  g.add(filter)

  const lamp = new THREE.PointLight(0xffe9d2, 3.0, 2.6, 2)
  lamp.position.set(cx, y - hh / 2 - 0.05, cz)
  g.add(lamp)
  ctx.strips.push({ light: lamp, material: null })

  return g
}

/* ------------------------------------------------------------------ props -- */
// The reference image is 40% props by area. Without them a configurator looks
// like an estate agent's photo of an empty flat — technically the product, but
// nobody buys it.

function buildPendant(ctx, x, z, y0, drop) {
  const g = new THREE.Group()
  // Pendants hang FROM THE CEILING, so they belong to the lid. In the plan
  // view the ceiling is removed and three lamps left floating in mid-air over
  // the island — with three bright pools under them — is exactly the thing you
  // would never draw on a plan. Named so setLid takes them with it.
  //
  // Hiding the group also removes its light: the renderer skips invisible
  // objects when it collects lights, so this is one flag, not two.
  g.name = 'pendant'
  const cordMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 })
  g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, drop, 8), cordMat, x, y0 - drop / 2, z, { cast: false }))
  g.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 24), cordMat, x, y0 - 0.01, z, { cast: false }))

  // Dome shade. Lathe rather than a cylinder — the shoulder is the whole shape.
  const pts = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    pts.push(new THREE.Vector2(0.005 + Math.sin(t * Math.PI * 0.52) * 0.115, -t * 0.155))
  }
  const shade = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 40),
    new THREE.MeshPhysicalMaterial({ color: '#17181a', roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide })
  )
  shade.position.set(x, y0 - drop, z)
  shade.castShadow = true
  g.add(shade)

  // Brass collar and the lit interior. The bright disc inside the shade is what
  // sells a pendant — the shade itself is a silhouette.
  g.add(mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 20), ctx.metalMat, x, y0 - drop + 0.012, z))
  // Tone-mapped, unlike the LED strips. A pendant disc is a large bright area
  // right in the middle of the frame; left out of tone mapping it clips to pure
  // white, takes the bloom with it, and washes the nearest metre of worktop.
  // The strips are small enough to get away with it — this is not.
  // NO GLOWING DISC.
  //
  // This was a bright emissive circle at the shade mouth, and it is the single
  // thing that has been read as "those three lights" in every screenshot: three
  // luminous orbs hanging in the room with no relationship to the fittings
  // around them. A real pendant seen from below shows a DIFFUSER — a warm,
  // shaded surface, brighter than the shade outside but nowhere near a light
  // source in its own right. It is lit, not emitting.
  const bulb = new THREE.Mesh(
    new THREE.CircleGeometry(0.10, 32),
    new THREE.MeshStandardMaterial({
      color: '#d8cbbc',
      roughness: 0.85,
      // A whisper of self-illumination so the diffuser does not go black when
      // nothing in the room happens to be pointing at it. Two orders of
      // magnitude below what was here before.
      emissive: new THREE.Color('#3a2c1e'),
    })
  )
  const light = new THREE.PointLight(0xffc98a, 0, 6.0, 2)
  light.position.set(x, y0 - drop - 0.28, z)
  // NO SHADOW from the pendants.
  //
  // A point light casts a shadow CUBEMAP — six faces — and at the 512 px these
  // were running at, over a 6 m range, the result is a low-resolution blob.
  // Three of them over an island produced a large soft wedge of darkness
  // spreading across the floor and up the wall, which read as a stain rather
  // than as shading.
  //
  // Nothing is lost by removing it: contact and corner darkening come from the
  // GTAO pass, which is a far better tool for it, and the plinth glow does the
  // grounding under the island. The only shadows that remain are the sun's,
  // and at night the sun is off.
  light.castShadow = false
  g.add(light)
    // Halved. The pendants were burning two white pools into the worktop
  // directly beneath them — a real pendant at this height lights the surface,
  // it does not brand it.
  ctx.lamps.push({ light, base: 2.1, emissive: bulb.material })
  return g
}

function buildStool(ctx, x, z, rot) {
  const g = new THREE.Group()
  const fabric = new THREE.MeshPhysicalMaterial({ color: '#8c8175', roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color('#cfc4b4') })
  const leg = new THREE.MeshStandardMaterial({ color: '#151516', roughness: 0.5, metalness: 0.7 })
  const seatY = 0.66
  const shell = new THREE.Mesh(roundedBox(0.44, 0.10, 0.42, 0.045), fabric)
  shell.position.set(0, seatY, 0)
  shell.castShadow = true
  g.add(shell)
  const back = new THREE.Mesh(roundedBox(0.42, 0.34, 0.09, 0.04), fabric)
  back.position.set(0, seatY + 0.19, -0.17)
  back.rotation.x = -0.16
  back.castShadow = true
  g.add(back)
  for (const [lx, lz] of [[-0.16, -0.15], [0.16, -0.15], [-0.16, 0.15], [0.16, 0.15]]) {
    const l = mesh(new THREE.CylinderGeometry(0.011, 0.016, seatY, 10), leg, lx, seatY / 2, lz)
    l.rotation.set(lz * 0.10, 0, -lx * 0.10)
    g.add(l)
  }
  g.position.set(x, 0, z)
  g.rotation.y = rot
  return g
}

// One shared material for every glass in the kitchen, and deliberately NOT a
// transmissive one.
//
// `transmission` makes three.js maintain a full-scene render target and
// regenerate its mipmaps so refracting objects can sample what is behind them.
// That is worth it for the reeded cabinet doors and the window, which are large
// and whose whole character is the refraction. It is not worth it for eighteen
// 90 mm wine glasses that are four pixels wide in the wide shots — they were
// costing more than the entire cabinetry and reading as, correctly, glass.
// A rough transparent dielectric with a strong environment response looks the
// same at this size for none of the cost.
let cheapGlass = null
function glassMaterial(ctx) {
  if (!cheapGlass) {
    cheapGlass = new THREE.MeshPhysicalMaterial({
      color: '#e8eeec', metalness: 0, roughness: 0.05,
      transparent: true, opacity: 0.28, envMapIntensity: 2.4,
      side: THREE.DoubleSide, depthWrite: false,
    })
  }
  return cheapGlass
}

function buildGlassware(ctx, x, y, z) {
  const g = new THREE.Group()
  const glass = glassMaterial(ctx)
  // Wine glasses, drawn as a lathe so the bowl actually has a wall thickness —
  // a cone reads as plastic the instant it catches a specular.
  for (let i = 0; i < 2; i++) {
    const pts = []
    pts.push(new THREE.Vector2(0.001, 0))
    pts.push(new THREE.Vector2(0.035, 0.002))
    pts.push(new THREE.Vector2(0.006, 0.02))
    pts.push(new THREE.Vector2(0.005, 0.085))
    for (let j = 0; j <= 8; j++) {
      const t = j / 8
      pts.push(new THREE.Vector2(0.008 + Math.sin(t * Math.PI * 0.62) * 0.037, 0.085 + t * 0.095))
    }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), glass)
    m.position.set(x + i * 0.10, y, z + i * 0.03)
    m.castShadow = true
    // Below the cabinet pane's 20, so contents draw before the glass in front
    // of them rather than fighting it.
    m.renderOrder = 10
    g.add(m)
  }
  return g
}

function buildBottle(ctx, x, y, z, color = '#1d2a17') {
  const pts = [
    [0.001, 0], [0.038, 0.002], [0.040, 0.16], [0.036, 0.20],
    [0.014, 0.245], [0.013, 0.31], [0.016, 0.315], [0.001, 0.317],
  ].map(([a, b]) => new THREE.Vector2(a, b))
  const m = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 26),
    new THREE.MeshPhysicalMaterial({
      color, roughness: 0.08, metalness: 0,
      transparent: true, opacity: 0.82, envMapIntensity: 1.6,
    })
  )
  m.position.set(x, y, z)
  m.castShadow = true
  return m
}

function buildBoard(ctx, x, y, z) {
  const g = new THREE.Group()
  const m = new THREE.MeshPhysicalMaterial({ color: '#7c5a35', roughness: 0.55, clearcoat: 0.2 })
  g.add(box(0.30, 0.028, 0.44, m, x, y + 0.014, z))
  return g
}

function buildHerbs(ctx, x, y, z) {
  const g = new THREE.Group()
  const pot = new THREE.MeshStandardMaterial({ color: '#6f6a62', roughness: 0.85 })

  for (let i = 0; i < 3; i++) {
    const px = x + i * 0.17
    g.add(mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.10, 18), pot, px, y + 0.05, z))

    // Foliage is a MASS with a few leaves on its silhouette, not a fan of
    // quads. Quads large enough to see individually read as flat cards the
    // moment any light hits them edge-on, which in daylight is most of them.
    // A faceted low-poly ball catches light on every facet instead, and the
    // handful of quads only have to break the outline.
    const leaf = new THREE.MeshStandardMaterial({
      // Deep and desaturated. Under a 2700 K strip a bright herb green goes
      // acid yellow and the pots read as cabbages.
      color: i === 1 ? '#33482b' : '#2b3f26',
      roughness: 0.85,
      flatShading: true,
    })
    const mass = new THREE.Mesh(new THREE.IcosahedronGeometry(0.058, 1), leaf)
    mass.position.set(px, y + 0.145, z)
    mass.scale.set(1, 0.85, 1)
    mass.castShadow = true
    g.add(mass)

    const sprig = new THREE.MeshStandardMaterial({
      color: leaf.color, roughness: 0.85, side: THREE.DoubleSide, flatShading: true,
    })
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * Math.PI * 2 + i * 1.3
      const q = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.052), sprig)
      q.position.set(px + Math.cos(a) * 0.062, y + 0.17 + (j % 3) * 0.018, z + Math.sin(a) * 0.062)
      q.rotation.set(-0.7 + (j % 3) * 0.25, a, 0.35)
      g.add(q)
    }
  }
  return g
}

function buildBowl(ctx, x, y, z) {
  const g = new THREE.Group()
  // A shallow stone bowl with fruit. Both halves matter: the bowl alone reads
  // as a prop, the fruit alone reads as litter.
  const pts = []
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    pts.push(new THREE.Vector2(0.02 + t * 0.115, t * t * 0.055))
  }
  pts.push(new THREE.Vector2(0.132, 0.062))
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 34),
    new THREE.MeshPhysicalMaterial({ color: '#d9d3c7', roughness: 0.5, clearcoat: 0.3, side: THREE.DoubleSide })
  )
  bowl.position.set(x, y, z)
  bowl.castShadow = true
  g.add(bowl)
  const skin = new THREE.MeshPhysicalMaterial({ color: '#5d2233', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 })
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const r = i % 3 === 0 ? 0 : 0.045
    const sz = 0.027 + (i % 3) * 0.004
    const f = mesh(new THREE.SphereGeometry(sz, 14, 10), skin,
      x + Math.cos(a) * r, y + 0.045 + (i % 3 === 0 ? 0.022 : 0), z + Math.sin(a) * r)
    f.scale.y = 0.86
    g.add(f)
  }
  return g
}

function buildPlates(ctx, x, y, z, n = 5) {
  const g = new THREE.Group()
  const m = new THREE.MeshPhysicalMaterial({ color: '#e9e5dd', roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.15 })
  for (let i = 0; i < n; i++) {
    g.add(mesh(new THREE.CylinderGeometry(0.105, 0.098, 0.012, 28), m, x, y + i * 0.014, z, { cast: false }))
  }
  return g
}

export { D, frontGeometry, flutedPanel, registerOpenable, drawerBox, buildShelves, cylY, buildRun, buildWorktop, buildSink, buildHob, buildOvenStack, buildPendant,
         buildHood, buildStool, buildGlassware, buildBottle, buildBoard, buildHerbs, buildPlates, buildBowl,
         ledStrip, roundedBox, mesh, box, dirVec, normalVec, bays }
