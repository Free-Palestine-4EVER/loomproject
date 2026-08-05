// The butterfly the flight code flies.
//
// This used to fetch public/models/butterfly.glb — a baked, skinned, 32-bone
// mesh with four clips. It is now a procedural butterfly (Woven) from
// src/three/butterfly-model.js: built in code at runtime, no GLB, no textures,
// every wing pattern painted into a canvas. That swap is worth one thing above
// all: the live model bends each wing membrane in a VERTEX SHADER, so the wing
// trails behind the stroke instead of hinging rigidly. Shader deformation is
// not animation data and cannot ride inside a GLB, which is exactly why the
// baked version always looked stiffer than the preview it came from.
//
// What did NOT change is the LEGACY surface the page already drove. prepFlyer
// returns:
//
//   { root, mixer, flutter, cruise, flap, rig, bf, disposables }
//
// `flap` is still the slice of three's AnimationAction API the flight code
// already used (setEffectiveWeight / timeScale / time / getClip().duration) —
// ButterflyField.js only ever touches this and never needs to change.
// Underneath there is no AnimationMixer at all — the stroke is driven
// directly on the wing hinges. Two fields are NEW, additive, and optional:
// `rig` is the live wing-rig drive object (see butterfly-model.js's
// WING_RIG_DEFAULTS for every field) that a flight profile writes into via
// Companion; `bf` is the raw model instance, for callers (the lab, a future
// profile) that want to drive update(t, drive) directly. Neither is required
// reading — a caller that only knows `flap` still gets full-quality motion.
import * as THREE from 'three'
import { createButterfly, SPECS, WING_RIG_DEFAULTS } from './butterfly-model.js'

// The generator's README nominates Blossom, and Blossom is the wrong call HERE.
// It is pale pink matte on a hero that is already a pink knitted world, so it
// vanished into the backdrop and read as untextured plastic next to photoreal
// wool. Woven is an actual warp/weft lattice with open gaps and a bound brass
// selvedge — it holds its own against that backdrop because it has real surface
// detail, and it is the obvious one for a studio whose whole name is the loom.
// The others (blossom, mango, aqua, lantern, velvet) are one word away.
const VARIANT = 'woven'

// Companion sizes the butterfly from an assumed wingspan of 2.02 world units
// (Companion.js:142-144) and every scale, bounce and clamp downstream is
// derived from that number. The procedural model is not born that size, so it
// is normalised here instead of retuning the flight code around a new figure.
const RIG_WINGSPAN = 2.02

// The baked clip was 0.34s and Companion divides by it to get the stroke phase
// for the bounce. Blossom's own spec.period is 2.2s — deliberately dreamy, and
// far too slow to read as flight (README: real butterflies run 5-12 Hz). We
// keep the rig's 0.34s beat and let Companion's timeScale ride it as before.
const BEAT = 0.34

// Nothing to fetch any more. Kept async and kept exported because Companion
// and ButterflyField both await it, and because a future variant might load
// something again.
export async function loadButterfly() {
  return { procedural: true }
}

// Every variant ships tuned for a preview turntable, where the butterfly fills
// the frame and a coarse wing passes. On the page it is a hero element against
// a photographic backdrop, and at the stock tessellation the silhouette went
// visibly polygonal — the outline stepped, and the vertex-shader bend (the whole
// reason we use the live model over the GLB) had too few rings to bend smoothly,
// so the wing creased instead of curving.
//
// It matters more for `woven` than for any other variant: the lattice is real
// geometry with open gaps, so the weave's own resolution is the wing's texture.
// Starve it of rings and the cloth reads as a coarse net.
//
// Overriding the spec here rather than editing butterfly-model.js keeps that
// file a byte-identical drop-in from ~/Desktop/loom-butterfly, so it can be
// re-copied when the generator changes without re-applying a patch.
const QUALITY = {
  rings: 18,   // radial subdivisions root->rim; drives how smoothly the bend curves
  segs: 120,   // subdivisions along the outline; drives silhouette smoothness
}

export function prepFlyer(_source, { tint = null, scale = 1, wingAlpha = 1 } = {}) {
  Object.assign(SPECS[VARIANT], QUALITY)
  const bf = createButterfly(THREE, VARIANT)
  const root = bf.group

  // Normalise to the rig's wingspan BEFORE the caller's scale, so root.scale
  // stays exactly the number Companion computed and can keep setting it on
  // resize without knowing the model changed.
  const box = new THREE.Box3().setFromObject(root)
  const span = Math.max(box.max.x - box.min.x, 1e-4)
  bf.inner.scale.multiplyScalar(RIG_WINGSPAN / span)
  root.scale.setScalar(scale)

  const disposables = []
  root.traverse((o) => {
    if (!o.isMesh) return
    // The wings sweep far outside the bind-pose bounds every stroke, and a
    // culled mesh pops out of frame mid-flap.
    o.frustumCulled = false
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const mat of mats) {
      // Tint is a lift toward the page's orchid, never a recolour: these wing
      // patterns are painted per-variant and repainting them in emissive would
      // throw away the thing that makes each variant itself.
      //
      // THE BUG THIS USED TO BE: MeshPhysicalMaterial defaults emissiveIntensity
      // to 1, and this line used to write `Math.max(mat.emissiveIntensity ?? 1, 0.08)`
      // — a "floor" of 0.08 that never once fires, because the default it is
      // flooring is already 1. The result was a full-strength, completely flat
      // (unlit, UV-independent) violet wash added over every pixel of the wing,
      // which is what actually produced the "flat dull grey" look: emissive
      // colour ignores lighting direction and the map entirely, so it steamrolled
      // the hand-painted gold/cream weave into a uniform lavender-white flood.
      // A lift has to stay visually subordinate to the painted albedo — cap the
      // intensity low instead of flooring it.
      if (tint && mat.emissive) {
        mat.emissive = mat.emissive.clone().lerp(tint, 0.22)
        mat.emissiveIntensity = Math.min(mat.emissiveIntensity ?? 1, 0.1)
      }
      if (wingAlpha < 1 && mat.transparent !== undefined) {
        mat.transparent = true
        mat.opacity = Math.min(mat.opacity ?? 1, wingAlpha)
        mat.depthWrite = false
      }
    }
  })

  const S = bf.spec

  // The emulated action. `time` advances at `timeScale` beats-per-BEAT exactly
  // as the mixer used to advance the clip, so Companion's phase read — and the
  // bounce locked to it — is unchanged.
  const flap = {
    time: Math.random() * BEAT,
    timeScale: 1.9,
    weight: 1,
    setEffectiveWeight(w) { this.weight = w },
    getEffectiveWeight() { return this.weight },
    getClip: () => ({ duration: BEAT, name: 'Flap' }),
  }

  // Body clips no longer exist — the model's own update() carries the idle
  // sway and tilt that Flutter/Cruise used to. They stay as inert weight
  // holders so ButterflyField and Companion can keep crossfading them without
  // a null check, and so removing them stays a separate decision.
  const inert = () => ({ weight: 0, setEffectiveWeight(w) { this.weight = w }, play() { return this } })
  const flutter = inert()
  const cruise = inert()

  // The rig-drive channel. A plain, mutable object — a flight profile (via
  // Companion) writes any subset of WING_RIG_DEFAULTS' fields onto it any
  // time before mixer.update(dt) runs for that frame; unset fields keep
  // whatever they were last, starting from the model's own defaults. This is
  // separate from `flap`: `flap.weight`/`timeScale` stay the one legacy
  // channel every caller (ButterflyField included) already speaks — mixer
  // update() below derives `rig.strokeAmp` from `flap.weight` every frame,
  // but never touches any other field on `rig`, so a profile's own writes to
  // (say) `rig.hindPhase` or `rig.bobAmp` are never stomped.
  const rig = { ...WING_RIG_DEFAULTS }

  // Real elapsed seconds, kept separately from the stroke clock. The two are
  // NOT the same rate and conflating them is the whole reason this needs a
  // comment: see below.
  let elapsed = 0

  const mixer = {
    update(dt) {
      flap.time += dt * flap.timeScale
      elapsed += dt

      // The model derives everything from one `t`, via t / spec.period. To make
      // one rig beat equal one wing cycle we have to hand it a clock running
      // period/BEAT — about 6.5x — faster than real time.
      //
      // strokeAmp is the ONE rig field this layer owns unconditionally: it is
      // the native replacement for the old post-hoc "scale hinge.rotation.y
      // around the rest angle" patch, driven straight from flap.weight so
      // every existing caller (ButterflyField included) keeps working with
      // zero changes on their end.
      rig.strokeAmp = THREE.MathUtils.clamp(flap.weight, 0, 1)
      bf.update(flap.time * (S.period / BEAT), rig)

      // ...which is correct for the stroke and WRONG for everything in that
      // same function that is written in real seconds. The idle sway terms
      // (sin(t * 0.42), sin(t * 0.31)) are meant to be a slow drift measured in
      // seconds; fed the stroke clock they ran ~6.5x too fast and the body
      // shook instead of drifting. Rewrite exactly those two from the real
      // clock. Everything else update() touches — the bob, the body tilt, the
      // membrane bend — is stroke-locked on purpose and must stay on the
      // stroke clock.
      bf.inner.rotation.z = Math.sin(elapsed * 0.42) * 0.06
      bf.inner.rotation.y = Math.sin(elapsed * 0.31) * 0.14
    },
    stopAllAction() {},
  }

  disposables.push({ dispose: () => bf.dispose?.() })

  return { root, mixer, flutter, cruise, flap, rig, bf, disposables }
}

// Each call to prepFlyer builds its own butterfly, so there is no shared
// skeleton left to rebind — the SkeletonUtils dance the baked mesh needed is
// gone. Kept as identity so ButterflyField's existing clone-then-prep flow
// keeps working unchanged.
export function cloneSkinned(source) {
  return source
}

// Catmull-Rom through waypoints [[t, ...values], ...] with t ascending in [0,1].
// Used for the companion's flight path down the page.
export function waypointSampler(points) {
  const n = points.length - 1
  const dim = points[0].length - 1
  return (t, out = []) => {
    const x = THREE.MathUtils.clamp(t, points[0][0], points[n][0])
    let i = 0
    while (i < n - 1 && x > points[i + 1][0]) i++
    const p1 = points[i], p2 = points[i + 1]
    const p0 = points[Math.max(0, i - 1)], p3 = points[Math.min(n, i + 2)]
    const f = (x - p1[0]) / Math.max(1e-6, p2[0] - p1[0])
    const f2 = f * f, f3 = f2 * f
    for (let k = 1; k <= dim; k++) {
      const a = p0[k], b = p1[k], c = p2[k], d = p3[k]
      out[k - 1] = 0.5 * ((2 * b) + (-a + c) * f
        + (2 * a - 5 * b + 4 * c - d) * f2 + (-a + 3 * b - 3 * c + d) * f3)
    }
    return out
  }
}

export { SPECS, VARIANT }
