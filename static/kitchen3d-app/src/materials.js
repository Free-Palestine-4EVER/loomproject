/**
 * materials.js — config id in, three.js material out.
 *
 * Texture GENERATION is expensive (a 1024² marble is ~40 ms of JS) and texture
 * REUSE is free, so every generated set is cached by id for the life of the
 * page. Switching back to a finish you have already seen is instant, which is
 * exactly the interaction a configurator lives or dies on — people flick back
 * and forth between two options ten times before they commit.
 *
 * Textures are shared but wrapped per-use: a slab needs a different `repeat`
 * than a door, so each consumer gets a lightweight clone that points at the
 * same GPU upload. Cloning a texture does NOT re-upload the image.
 */

import * as THREE from 'three'
import * as T from './textures.js'
import { CABINET_FINISHES, WORKTOPS, METALS, FLOORS } from './config.js'
import { MAPS, tiled } from './maps.js'

const cache = new Map()
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

/**
 * MATERIAL cache, distinct from the texture cache above.
 *
 * Caching textures but building a fresh material per cabinet front left this
 * scene with ~200 unique materials. Unique materials do not batch: every one is
 * its own draw call with its own uniform upload and its own four texture binds,
 * and at that point the renderer is bound by CPU-side state changes rather than
 * by anything on screen — which is why dropping the resolution barely moved the
 * frame time.
 *
 * Panel size is bucketed to 25 mm. Size only feeds the texture tiling and the
 * profile pitch, and 25 mm of drift in grain scale is not visible on a cabinet
 * door; collapsing to buckets takes those 200 materials down to about a dozen.
 *
 * Cached materials are marked `shared` so the per-rebuild disposal in scene.js
 * leaves them alone — disposing one would delete it out from under every other
 * kitchen that reuses it.
 */
const B = 0.025
const bucket = (v) => Math.max(B, Math.round(v / B) * B)

function sharedMaterial(key, make) {
  if (!cache.has(key)) {
    const m = make()
    m.userData.shared = true
    cache.set(key, m)
  }
  return cache.get(key)
}

/**
 * Clone a generated texture set and re-tile it. `rot` is in radians and is
 * applied about the texture centre — needed because the grain on a vertical
 * door runs the other way to the grain on a horizontal worktop, and rotating
 * the UVs is far cheaper than generating the map twice.
 */
function tile(set, repeatX, repeatY, rot = 0) {
  const out = {}
  for (const k of Object.keys(set)) {
    const t = set[k].clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeatX, repeatY)
    if (rot) { t.center.set(0.5, 0.5); t.rotation = rot }
    out[k] = t
  }
  return out
}

/* ------------------------------------------------------------- cabinetry -- */

/**
 * A cabinet front. `size` is the real panel size in metres so the grain and the
 * flute pitch stay at their true physical scale no matter what the door is —
 * the single most common tell in a bad configurator is a drawer front whose
 * wood grain scales with the drawer.
 */
export function frontMaterial(finishId, doorStyle, size = [0.6, 0.7]) {
  const bw = bucket(size[0]), bh = bucket(size[1])
  return sharedMaterial(
    `front:${finishId}:${doorStyle}:${bw.toFixed(3)}:${bh.toFixed(3)}`,
    () => buildFrontMaterial(finishId, doorStyle, [bw, bh])
  )
}

function buildFrontMaterial(finishId, doorStyle, size) {
  const f = CABINET_FINISHES[finishId]
  const [w, h] = size

  const mat = new THREE.MeshPhysicalMaterial({
    side: THREE.FrontSide,
    envMapIntensity: 1.0,
  })

  if (f.kind === 'wood') {
    const set = cached(`wood:${finishId}`, () => T.wood({ seed: 3, ...f.wood }))
    // 1.1 m of board per texture tile. Any tighter and the cathedral figure
    // starts repeating visibly across a run of drawers.
    const t = tile(set, w / 1.1, h / 1.1)
    mat.map = t.map
    mat.normalMap = t.normalMap
    mat.roughnessMap = t.roughnessMap
    // 0.28, down from 0.55. The wood normal map was corrugating every flat
    // front; with the grain now carried by colour and roughness, the relief
    // only has to break the specular, not sculpt the surface.
    mat.normalScale.set(0.28, 0.28)
    mat.roughness = 1.0            // modulated by the map
    // No clearcoat. Hard-wax oil is not a lacquer — there is no film — and a
    // clearcoat lobe on forty cabinet fronts is a second full BRDF evaluation
    // per fragment for an effect the roughness map already carries.
    mat.clearcoat = 0
  } else {
    const p = f.paint
    mat.color = new THREE.Color(p.color)
    // Roughness comes from the imperfection map, scaled to this finish's
    // specified value. Painted fronts previously had a single constant
    // roughness across every panel in the kitchen — perfectly uniform, and
    // uniformity is what makes a surface read as a swatch rather than a door.
    const imp = cached('imperfection', () => T.imperfection({ res: 512 }))
    const it = tile(imp, Math.max(1, w / 0.8), Math.max(1, h / 0.8))
    mat.roughnessMap = it.roughnessMap
    mat.roughness = p.rough * 1.9
    // Sprayed 2-pack is matt by specification. The orange-peel normal below is
    // what makes it read as sprayed; a clearcoat just makes it look like vinyl.
    mat.clearcoat = 0
    // Sprayed 2-pack still has orange peel. Without it a matt door renders as a
    // flat vector shape and the whole scene loses its sense of scale.
    const set = cached('peel', () => T.plaster({ res: 512, seed: 61, color: '#ffffff', rough0: 0 }))
    const t = tile(set, w / 0.35, h / 0.35)
    mat.normalMap = t.normalMap
    mat.normalScale.set(0.06, 0.06)
  }

  /* ------------------------------------------------------------- profile */
  // The door PROFILE overrides whatever normal map the finish supplied. It is
  // relief, and relief wins over the wood's own micro-texture at every scale
  // you can actually see.
  //
  // All three are generated at true world pitch and cached on the number that
  // determines the pattern — stave count, groove count, or the panel size
  // bucket. Keying on the finish instead would regenerate identical maps for
  // every colour, and keying on nothing would scale the profile with the door.
  const applyProfile = (set, repeatY = 1, scale = 1) => {
    mat.normalMap = set.normalMap.clone()
    mat.normalMap.wrapS = mat.normalMap.wrapT = THREE.RepeatWrapping
    mat.normalMap.repeat.set(1, repeatY)
    mat.normalMap.needsUpdate = true
    mat.normalScale.set(scale, scale)
    if (set.roughnessMap) {
      const r = set.roughnessMap.clone()
      r.wrapS = r.wrapT = THREE.RepeatWrapping
      r.repeat.set(1, repeatY)
      r.needsUpdate = true
      mat.roughnessMap = r
      mat.roughness = 1.0
    }
  }

  // NOTE: 'fluted' is deliberately absent. Fluted fronts carry real relief
  // geometry (see frontGeometry in kitchen.js), and stacking a flute normal map
  // on top of actual flutes double-shades every reed — the highlight lands in
  // the wrong place and the panel reads worse than either treatment alone.
  if (doorStyle === 'vgroove') {
    const grooves = Math.max(2, Math.round(w / 0.09))          // 90 mm boards
    applyProfile(cached(`vgroove:${grooves}`, () => T.vgroove({ grooves, res: 1024 })), 1, 0.9)
  } else if (doorStyle === 'shaker') {
    // Bucketed to 50 mm so a run of near-identical drawers shares one map
    // instead of generating a 512² texture per front.
    const bw = Math.max(0.15, Math.round(w * 20) / 20)
    const bh = Math.max(0.10, Math.round(h * 20) / 20)
    applyProfile(cached(`shaker:${bw}x${bh}`, () => T.shaker({ w: bw, h: bh, res: 512 })), 1, 1.0)
  }

  return mat
}

/* --------------------------------------------------------------- worktop -- */

export function worktopMaterial(worktopId, size = [3, 1]) {
  const bx = bucket(size[0]), bz = bucket(size[1])
  return sharedMaterial(
    `top:${worktopId}:${bx.toFixed(2)}:${bz.toFixed(2)}`,
    () => buildWorktopMaterial(worktopId, [bx, bz])
  )
}

function buildWorktopMaterial(worktopId, size) {
  const w = WORKTOPS[worktopId]
  const [lx, lz] = size
  const mat = new THREE.MeshPhysicalMaterial({ envMapIntensity: 1.2 })

  if (w.marble && MAPS.marble) {
    // Photographed slab. 2.6 m of stone per tile — close to a real slab, so the
    // book-match across the island reads as one piece rather than as a pattern.
    const t = tiled('marble', lx / 2.6, lz / 2.6)
    mat.map = t.map
    mat.normalMap = t.normalMap
    mat.roughnessMap = t.roughnessMap
    mat.normalScale.set(0.35, 0.35)
    mat.roughness = 1.0
    // Polished stone is a clearcoat over a rough substrate, not a smooth
    // dielectric. This is what gives it depth rather than a plastic sheen.
    mat.clearcoat = 0.85
    mat.clearcoatRoughness = 0.06
    // The photograph is a warm cream; tinted toward the specified colour so
    // one slab image can serve several stones without reading as the same rock.
    mat.color = new THREE.Color(w.marble.base).lerp(new THREE.Color('#ffffff'), 0.55)
  } else if (w.marble) {
    // 2048, not 1024. A worktop is the largest continuous surface in the frame
    // and the camera gets within half a metre of it in the detail view; at
    // 1024 over a 2.4 m slab that is 426 px per metre, and the veins turn to
    // mush exactly where the customer is looking hardest.
    const set = cached(`marble:${worktopId}`, () => T.marble({ res: 2048, ...w.marble }))
    // 2.4 m slab per tile — close to a real slab, so the book-match reads.
    const t = tile(set, lx / 2.4, lz / 2.4)
    mat.map = t.map
    mat.normalMap = t.normalMap
    mat.roughnessMap = t.roughnessMap
    mat.normalScale.set(0.30, 0.30)
    mat.roughness = 1.0
    // Polished stone is a clearcoat over a rough substrate, not a smooth
    // dielectric. This is what gives it depth rather than a plastic sheen.
    mat.clearcoat = 0.85
    mat.clearcoatRoughness = 0.06
  } else if (w.plaster) {
    const set = cached(`plaster:${worktopId}`, () => T.plaster({ res: 512, ...w.plaster }))
    const t = tile(set, lx / 1.5, lz / 1.5)
    Object.assign(mat, { map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap })
    mat.roughness = 1.0
    mat.normalScale.set(0.4, 0.4)
    mat.clearcoat = 0.15
  } else if (w.wood) {
    const set = cached(`wood:top:${worktopId}`, () => T.wood({ res: 1024, seed: 9, ...w.wood }))
    const t = tile(set, lx / 1.2, lz / 1.2, Math.PI / 2)
    Object.assign(mat, { map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap })
    mat.roughness = 1.0
    mat.normalScale.set(0.6, 0.6)
    mat.clearcoat = 0.20
    mat.clearcoatRoughness = 0.5
  }
  return mat
}

/* ----------------------------------------------------------------- metal -- */

export function metalMaterial(metalId, brushDir = 'x', scale = 1) {
  return sharedMaterial(`metal:${metalId}:${brushDir}:${scale}`,
    () => buildMetalMaterial(metalId, brushDir, scale))
}

function buildMetalMaterial(metalId, brushDir, scale) {
  const m = METALS[metalId]
  const set = cached(`brushed:${brushDir}`, () => T.brushed({ dir: brushDir, base: 0 }))
  const t = tile(set, scale, scale)
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(m.color),
    metalness: m.metal,
    roughness: m.rough,
    roughnessMap: t.roughnessMap,
    normalMap: t.normalMap,
    normalScale: new THREE.Vector2(0.25, 0.25),
    envMapIntensity: 1.6,
  })
}

/* ----------------------------------------------------------------- floor -- */

export function floorMaterial(floorId, room) {
  return sharedMaterial(`floor:${floorId}:${room.w}x${room.d}`,
    () => buildFloorMaterial(floorId, room))
}

function buildFloorMaterial(floorId, room) {
  const f = FLOORS[floorId]
  const mat = new THREE.MeshPhysicalMaterial({ envMapIntensity: 0.8 })
  if (f.kind === 'herringbone' && MAPS.floor) {
    // 3.2 m of floor per tile. Sized off the block length rather than the room,
    // so the boards stay the right size whatever the layout does.
    const t = tiled('floor', room.w / 3.2, room.d / 3.2, Math.PI / 4)
    Object.assign(mat, { map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap })
    mat.normalScale.set(0.55, 0.55)
    mat.roughness = 1.0
    // POLISHED, not satin.
    //
    // A lacquered floor is a hard clear film over timber: the wood keeps its
    // own roughness underneath, and the film on top is nearly smooth. That is
    // exactly what clearcoat models, so the shine comes from pushing the coat
    // to near-full and its roughness right down — NOT from lowering the base
    // roughness, which would make the timber itself look like plastic.
    //
    // Normal scale comes down at the same time: at 0.85 the board relief was
    // shredding the reflection into noise. A polished floor is flat; that is
    // what makes it a mirror.
    // Satin-lacquer, not mirror. 0.92/0.09 was a wet-look finish — real, but
    // it turned the floor into the brightest thing in the room and pulled the
    // eye off the joinery. This still reflects the island clearly, it just
    // stops competing.
    // Polished, and deliberately back up after a pass at satin.
    //
    // Worth knowing what the roughness number is actually trading. The
    // reflection comes from a CUBEMAP PROBE captured at one point in the room,
    // and a cubemap has no parallax — it reflects as though everything in it
    // were infinitely far away. On a big flat plane the reflected cabinets
    // therefore do not sit where the real ones are, and a mirror-sharp coat
    // shows that mismatch as streaks that slide as the camera moves.
    //
    // 0.16 is the point where the floor reads as genuinely polished — it holds
    // the island's glow and the ceiling sweep — while staying just soft enough
    // that the parallax error is not legible as a wrong image. Going below
    // about 0.12 starts to show it. The real fix for a sharper floor than this
    // is a planar reflector, mirroring the scene about the floor plane.
    mat.clearcoat = 0.85
    mat.clearcoatRoughness = 0.16
    // Tinted hard toward the specified colour. The source photograph is a pale
    // board; a smoked floor has to actually be smoked, and at 0.62 toward white
    // it came out as light tile and stopped anchoring the room.
    // Darker board under the polish. A gloss coat reflects the bright ceiling
    // across the whole floor at grazing angles — that is correct Fresnel, but
    // on a pale board it just reads as washed out. The shine only registers as
    // shine when there is a dark surface for it to sit on.
    mat.color = new THREE.Color(f.params.late).lerp(new THREE.Color('#ffffff'), 0.24)
  } else if (f.kind === 'herringbone') {
    // Keyed on the room size as well as the finish: the texture is laid out at
    // the room's real dimensions and used once, so a different-sized room needs
    // its own floor rather than a rescaled one.
    const metres = Math.max(room.w, room.d) * 1.15
    const set = cached(`herring:${floorId}:${metres.toFixed(1)}`,
      () => T.herringbone({ res: 2048, metres, ...f.params }))
    // Repeat 1 — this texture does not tile and must not be asked to. The 45°
    // rotation is what turns a straight-laid floor into one running diagonally
    // to the island, which is how these are actually set out.
    const t = tile(set, 1, 1, Math.PI / 4)
    Object.assign(mat, { map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap })
    mat.normalScale.set(0.7, 0.7)
    mat.roughness = 1.0
    // A satin-finished floor, not a gloss one. High clearcoat was adding a
    // broad sheen across the whole plane on top of an already over-lit surface.
    mat.clearcoat = 0.18
    mat.clearcoatRoughness = 0.45
  } else {
    const set = cached(`floorplaster:${floorId}`, () => T.plaster({ res: 512, ...f.params }))
    const t = tile(set, room.w / 1.2, room.d / 1.2)
    Object.assign(mat, { map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap })
    mat.roughness = 1.0
    mat.normalScale.set(0.3, 0.3)
    mat.clearcoat = 0.25
    mat.clearcoatRoughness = 0.3
  }
  return mat
}

/* ---------------------------------------------------------------- rooms   -- */

export function wallMaterial(color = '#c9c3b8') {
  return sharedMaterial(`wall:${color}`, () => buildWallMaterial(color))
}

function buildWallMaterial(color) {
  const set = cached(`wall:${color}`, () => T.plaster({ res: 512, seed: 77, color, rough0: 0.88 }))
  const t = tile(set, 4, 3)
  return new THREE.MeshStandardMaterial({
    map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap,
    normalScale: new THREE.Vector2(0.35, 0.35), roughness: 1.0, envMapIntensity: 0.7,
  })
}

/* ----------------------------------------------------------------- glass -- */

/**
 * Reeded glass for the display cabinets.
 *
 * NOT `transmission`, despite that being the physically correct answer.
 *
 * A single transmissive material makes three.js render the whole scene into a
 * full-resolution target and regenerate its mipmap chain every frame, so the
 * renderer runs the kitchen twice. Measured on this scene it was 56 ms of a
 * 105 ms frame — for two objects, one of which is a flat window pane and the
 * other of which is deliberately obscuring what is behind it.
 *
 * What actually reads as ribbed glass is the SPECULAR: vertical highlights
 * running the height of the door, smearing horizontally, with the shelf lights
 * behind broken into a row of glints. All of that comes from the normal map and
 * the environment, and none of it needs refraction. Plain alpha transparency
 * carries the rest.
 */
export function reededGlassMaterial(metalId) {
  return sharedMaterial('reededGlass', () => buildReededGlassMaterial())
}

function buildReededGlassMaterial() {
  const set = cached('reeded', () => T.reededGlass({ reeds: 34 }))
  const n = set.normalMap.clone()
  n.repeat.set(1, 1); n.needsUpdate = true
  return new THREE.MeshPhysicalMaterial({
    // Opacity 0.22, not 0.42. The point of a glazed cabinet is that you can
    // SEE INTO it — the lit shelves, the plates, the glassware. At 0.42 the
    // pane went milky and the cabinet read as a flat white panel, which is a
    // worse result than the transmissive version it replaced. The ribbing has
    // to distort what is behind it, not hide it.
    color: new THREE.Color('#dde4e0'),
    metalness: 0,
    // 0.14, not 0.05. At mirror roughness every rib sweeps the reflection
    // vector across the ceiling, and with a bright ceiling in the environment
    // the pane returns a near-white reflection over its whole area — you get a
    // lit panel, not a window. Real reeded glass is slightly diffusing.
    roughness: 0.14,
    normalMap: n,
    // Vertical reeds blur horizontally and not vertically. Zeroing Y is what
    // separates ribbed glass from frosted glass.
    normalScale: new THREE.Vector2(0.85, 0.02),
    // 0.9, not 2.6. At near-zero roughness a high environment intensity turns
    // the pane into a MIRROR of the ceiling — the cabinet reads as a lit white
    // panel and you cannot see the shelves at all, which is the opposite of
    // what a glazed cabinet is for. Glass needs to reflect a little and
    // transmit a lot.
    // The reflection has to sit BELOW what is behind the glass, or the
    // cabinet contents never show. This is the single number that decides
    // whether a glazed cabinet reads as a display case or as a light box.
    envMapIntensity: 0.3,
    transparent: true,
    opacity: 0.16,
    // FRONT face only. The pane is one surface now (see kitchen.js); rendering
    // both sides of it doubles the blending for a back face nobody can see.
    side: THREE.FrontSide,
    depthWrite: false,
  })
}

export function clearGlassMaterial() {
  // Same reasoning as above. A flat pane in front of a flat backdrop gains
  // nothing from refraction.
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e6eef0'),
    metalness: 0, roughness: 0.03,
    transparent: true, opacity: 0.16,
    envMapIntensity: 2.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}

export function clearCache() { cache.clear() }
