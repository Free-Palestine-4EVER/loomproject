/**
 * camera.js — three ways of looking at the same kitchen.
 *
 * SHOWROOM is the hero: eye height, standing where you would stand in the
 * doorway, 34° horizontal — the framing every kitchen photographer uses because
 * anything wider bows the run and anything tighter loses the island.
 *
 * PLAN is the dollhouse: the lid comes off, the near wall comes off, and the
 * camera goes a long way back with a narrow lens. A narrow lens at distance IS
 * an isometric view for practical purposes, and it means one camera and one
 * controls instance rather than swapping between perspective and orthographic
 * and having to re-derive the framing on every layout change.
 *
 * DETAIL is a close orbit on the island front, for judging a finish. This is
 * the view that sells the fluting, and it is the one people spend longest in.
 *
 * Transitions are eased, not cut. A cut between views makes the two look like
 * two different products; a 900 ms ease makes them obviously the same room.
 */

import * as THREE from 'three'

const EASE = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export const VIEWS = {
  showroom: { name: 'Showroom', hint: 'Eye level, from the doorway' },
  plan: { name: 'Plan', hint: 'Lid off — the whole layout at once' },
  detail: { name: 'Detail', hint: 'Close on the island front' },
}

/**
 * Where each view sits, derived from the room so it works on every layout.
 *
 * `aspect` matters and is not optional on a phone. Three's `fov` is VERTICAL,
 * so a framing composed at 16:9 keeps its vertical angle on a 9:19 portrait
 * screen and loses two thirds of its HORIZONTAL angle — the island fills the
 * frame and the run disappears off both sides.
 *
 * Two corrections, in this order:
 *
 *  1. Widen the vertical fov until horizontal coverage matches what the framing
 *     was composed for. Capped at 74°, because past that the barrel distortion
 *     at the frame edge is a worse artefact than the crop it fixes.
 *  2. Once the cap is reached, STEP THE CAMERA BACK by whatever the fov could
 *     not deliver. Distance costs nothing optically; over-wide lenses do.
 */
const REFERENCE_ASPECT = 16 / 9
const MAX_FOV = 74

function fitToAspect(f, aspect) {
  if (!aspect || aspect >= REFERENCE_ASPECT) return f

  // The aspect used for the CALCULATION is floored, deliberately.
  //
  // A phone in portrait is about 0.46. Solving for full desktop horizontal
  // coverage at 0.46 asks for a lens no camera has, so the shortfall lands on
  // the distance term and pushes the camera eleven metres back — outside the
  // room, looking at the box from across the street.
  //
  // Matching desktop coverage is the wrong goal on a phone anyway. A portrait
  // frame should show the island well and let the run of units run off the
  // edges, exactly as a person standing there would see it. 0.78 is the
  // narrowest aspect worth composing for; past that we stop chasing.
  const effective = Math.max(aspect, 0.78)

  const baseV = (f.fov * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(baseV / 2) * REFERENCE_ASPECT)
  const wantV = 2 * Math.atan(Math.tan(hFov / 2) / effective)
  const capV = (MAX_FOV * Math.PI) / 180
  const useV = Math.min(wantV, capV)

  // Whatever the capped lens cannot cover, distance covers — up to a point.
  // Beyond ~1.5x the camera leaves the room it is meant to be standing in.
  const pull = Math.min(1.5, Math.tan(wantV / 2) / Math.tan(useV / 2))
  const offset = f.pos.clone().sub(f.target).multiplyScalar(pull)

  return {
    ...f,
    fov: (useV * 180) / Math.PI,
    pos: f.target.clone().add(offset),
    maxDist: f.maxDist * pull,
    minDist: f.minDist * Math.min(pull, 1.4),
  }
}

export function framing(view, room, aspect) {
  const { w, d, h } = room
  if (view === 'plan') {
    // 52° down, 38° round. Pulled back far enough that the 20° lens flattens
    // the perspective into something a customer can read as a floor plan.
    //
    // The multiplier is set by the arithmetic, not by taste: a 20° vertical
    // lens sees 2*tan(10°) ≈ 0.353 of its distance, so covering a 6.6 m room
    // with headroom needs roughly 3.8x the longest wall. Guessing this is how
    // plan views end up cropping the corner units.
    const dist = Math.max(w, d) * 3.8
    const az = Math.PI * 0.30, el = Math.PI * 0.29
    return fitToAspect({
      pos: new THREE.Vector3(
        Math.sin(az) * Math.cos(el) * dist,
        Math.sin(el) * dist,
        Math.cos(az) * Math.cos(el) * dist
      ),
      target: new THREE.Vector3(0, 0.55, -0.15),
      fov: 20,
      lid: false,
      minDist: dist * 0.55, maxDist: dist * 1.5,
      polar: [0.15, Math.PI * 0.46],
    }, aspect)
  }
  if (view === 'detail') {
    return fitToAspect({
      // Far enough back to hold a full bay of fronts, the reveal and the
      // worktop edge in one frame. Closer than this and you are looking at a
      // texture; further and it is just the showroom view again.
      pos: new THREE.Vector3(-1.05, 1.28, d * 0.30),
      target: new THREE.Vector3(-0.50, 0.68, -0.50),
      fov: 36,
      lid: true,
      minDist: 0.9, maxDist: 4.2,
      polar: [0.35, Math.PI * 0.56],
    }, aspect)
  }
  // showroom — standing in the near corner, camera at 1.58 m, which is where a
  // person's eye actually is. Kitchen photography is shot lower than that, at
  // about 1.35, but a configurator is not a photograph: at 1.35 you cannot see
  // into the island worktop and the whole surface you are choosing disappears.
  return fitToAspect({
    pos: new THREE.Vector3(-w * 0.36, 1.70, d * 0.47),
    target: new THREE.Vector3(0.30, 0.92, -d * 0.30),
    fov: 42,
    lid: true,
    minDist: 1.4, maxDist: Math.max(w, d) * 1.25,
    // Never let the camera go below knee height or above head height in the
    // walk-in views. Both look like a mistake and neither sells anything.
    polar: [Math.PI * 0.30, Math.PI * 0.56],
  }, aspect)
}

export class CameraRig {
  constructor(camera, controls) {
    this.camera = camera
    this.controls = controls
    this.tween = null
  }

  /** Snap with no animation — used on first load and on layout change. */
  set(view, room) {
    const f = framing(view, room, this.camera.aspect)
    this.camera.position.copy(f.pos)
    this.camera.fov = f.fov
    this.camera.updateProjectionMatrix()
    this.controls.target.copy(f.target)
    this.applyLimits(f)
    this.controls.update()
    this.tween = null
    return f
  }

  /** Eased move. Returns the target framing so callers can toggle the lid. */
  to(view, room, ms = 900) {
    const f = framing(view, room, this.camera.aspect)
    this.tween = {
      t: 0, ms,
      fromPos: this.camera.position.clone(),
      toPos: f.pos.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: f.target.clone(),
      fromFov: this.camera.fov,
      toFov: f.fov,
      f,
    }
    // Limits are applied at the END of the move. Applying them up front can
    // clamp the camera mid-flight and produce a lurch — the classic
    // "why did it snap sideways" configurator bug.
    return f
  }

  applyLimits(f) {
    this.controls.minDistance = f.minDist
    this.controls.maxDistance = f.maxDist
    this.controls.minPolarAngle = f.polar[0]
    this.controls.maxPolarAngle = f.polar[1]
  }

  update(dt) {
    if (!this.tween) return false
    const tw = this.tween
    tw.t = Math.min(1, tw.t + (dt * 1000) / tw.ms)
    const e = EASE(tw.t)
    this.camera.position.lerpVectors(tw.fromPos, tw.toPos, e)
    this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, e)
    this.camera.fov = tw.fromFov + (tw.toFov - tw.fromFov) * e
    this.camera.updateProjectionMatrix()
    if (tw.t >= 1) {
      this.applyLimits(tw.f)
      this.tween = null
    }
    return true
  }
}

/**
 * Takes the lid and the near wall off for the plan view.
 *
 * `amount` is 0..1 and is driven by the same eased clock as the camera move, so
 * the ceiling dissolves as the camera lifts instead of blinking out — a wall
 * that vanishes on one frame reads as a glitch, one that fades reads as the
 * room opening up.
 */
const LID_PARTS = new Set(['ceiling', 'wall-front', 'wall-glazed'])

export function setLid(root, amount) {
  root.traverse((o) => {
    // Ceiling-hung fixtures go with the ceiling. Pendants hang FROM the lid, so
    // with the lid off they would be three lamps floating in mid-air over the
    // island, each burning a pool of light into the worktop — the one thing you
    // would never draw on a plan.
    //
    // Hiding the group takes its light with it: the renderer skips invisible
    // objects when collecting lights, so this is one flag rather than two.
    if (o.name === 'pendant') {
      o.visible = amount > 0.5
      return
    }
    if (!o.isMesh) return
    // The lid is everything between a top-down camera and the room: the
    // ceiling, and the two walls on the camera's side of it. The plan camera
    // sits over the +x/+z corner, so those are the front wall and the glazed
    // wall. The backdrop beyond the glazing is front-facing and culls itself
    // from outside, so removing its wall does not expose it.
    if (!LID_PARTS.has(o.name)) return
    const m = o.material
    if (!m || Array.isArray(m)) return
    o.visible = amount > 0.02
    m.transparent = amount < 0.995
    m.opacity = amount
    // Without this a half-faded ceiling still writes depth and punches a hole
    // in whatever is behind it.
    m.depthWrite = amount > 0.9
  })
}
