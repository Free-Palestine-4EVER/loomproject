// The butterfly that flies WITH the page.
//
// A fixed, full-viewport, pointer-events-none WebGL layer that sits above the
// content and below the nav. One butterfly lives in it for the entire scroll of
// the document: it weaves across the frame, dives and climbs, and is dragged
// around by how fast you scroll. Same idea as the bird that rides down
// curated.media, rebuilt against our own rig.
//
// Three things make it feel attached to the reader rather than looped:
//
//   1. It chases a SMOOTHED scroll position, not the live one. Flick the page
//      and the butterfly is still back where you were, then races to catch up.
//      That lag IS the drag — remove it and the butterfly is just a sprite
//      pinned to scrollTop.
//   2. Scroll velocity buffets it directly, down-and-sideways, and decays.
//   3. Flap amplitude and rate ride the resulting airspeed, so a fast scroll
//      makes it beat hard and a still page lets it glide. The flap clip is
//      additive precisely so its WEIGHT can be that amplitude.
//
// ── frame-rate independence ──
// Every eased value in this file (scroll chase, velocity, burst, roll, AoA,
// heading) uses THREE.MathUtils.damp (or the equivalent 1-exp(-rate*dt)
// SLERP factor) — a per-SECOND rate, not a per-frame fraction. A per-frame
// fraction closes the same PROPORTION of the gap every rendered frame
// regardless of how long that frame took, which is wrong twice over: it
// converges slower on a page struggling to hold 60fps, and a single slow
// frame (GC pause, layout, decode) between fast ones takes a visibly bigger
// step than its neighbours. damp(cur, target, rate, dt) is dt-correct at any
// frame rate: skip a frame, get a bigger dt, close exactly the gap that much
// more real time buys — no more, no less. dt === 0 (the reduced-motion
// static frame) snaps straight to target.
//
// ── body attitude ──
// The body's orientation is ONE quaternion, composed fresh every frame from
// three independent signals and SLERPed toward (never snapped to with
// lookAt()/rotateX()/rotateZ() the way this used to run):
//   heading — the direction from the butterfly to the CAMERA POSITION (not
//             to world +Z — see _advance() for why the difference matters
//             on a perspective camera), leaned off that by a little of the
//             smoothed velocity direction. The butterfly holds the reader's
//             eye wherever in the frame it happens to be.
//   AoA     — angle of attack: a nose-up/down pitch derived from the
//             SMOOTHED VERTICAL VELOCITY (climbing pitches the nose up,
//             diving pitches it down), plus a small constant cruise bias.
//             This is velocity-derived, NOT wing-stroke-derived.
//   roll    — bank, a CONSEQUENCE of turning: proportional to smoothed
//             lateral velocity/curvature, damped in behind it rather than
//             computed independently.
// Vertical STROKE-COUPLING (the body rising on the down-beat) is deliberately
// NOT here. It lives in exactly one place — butterfly-model.js's own
// update(), which derives it from the SAME stroke phase that drives the
// hinges. The old code here duplicated it (a raw sin(wingPhase) added
// straight into root.position.y every frame, on top of the model's own
// stroke-locked bob) — two systems writing the same axis, one of them badly
// oversized and locked to a 5-8Hz wingbeat a render frame cannot sample
// cleanly, which is what "flying reads as glitching in place" turned out to
// be. Do not add a second one back here.
//
// ── flight profiles ──
// A flight profile customises FEEL without touching this file, the model, or
// the registry (src/three/flight/index.js — read that file's header for
// selection/switching mechanics: URL/sessionStorage/hotkeys/HUD). A profile
// module default-exports:
//
//   { id, label,
//     init(ctx) -> state,          // once per activation (incl. re-selecting)
//     update(ctx, state) -> drive, // every rendered frame
//     dispose(state) {} }          // once when deactivated (optional)
//
// `ctx` passed to init()/update() — READ-ONLY, never mutate anything on it:
//   t          seconds, this Companion instance's own running clock
//   dt         seconds since last frame (<=0.05, already clamped); 0 on the
//              reduced-motion static frame
//   scrollP    0..1, the SMOOTHED scroll progress this instance is chasing
//   scrollRaw  0..1, the live/unsmoothed scroll progress
//   scrollVel  signed, smoothed viewport-heights/second
//   pos        THREE.Vector3, current world position (previous frame's)
//   speed      smoothed world-units/second of travel (previous frame's)
//   baseScale  world units per full wingspan at the current viewport
//   isMobile   bool
//   rng        () => [0,1) seeded PRNG, fresh per activation (see registry's
//              mulberry32) — use instead of Math.random() for reproducible-
//              for-this-activation randomness
//
// `drive` — the object update() returns. EVERY field is optional; an omitted
// field keeps Companion's own default (see FLIGHT_DEFAULTS below, exported
// from this file). Return `{}` (or nothing) to take every default.
//
//   // path shaping — applied to the sampled waypoint before clamping
//   pathXOffset, pathYOffset, pathDepthOffset   number, world-normalized units
//   idleWanderAmp   number, multiplier on the built-in idle-wander sines (default 1)
//   buffetAmp       number, multiplier on how hard scroll velocity buffets position (default 1)
//
//   // flap dynamics — forwarded onto flyer.flap
//   flapWeight   0..1, overrides the burst-envelope-derived amplitude outright
//   flapRate     beats/second, overrides the burst-derived rate outright
//   burstiness   number, multiplier on how sharply the amplitude swings
//                between glide and burst around its ~0.5 midpoint (default 1)
//   glideiness   0..1, how much of the built-in periodic "hold wings open and
//                coast" glide is allowed through (default 0 — never glides
//                on its own; a profile opts in)
//
//   // wing-rig passthrough — a PARTIAL WING_RIG_DEFAULTS patch (see that
//   // export in butterfly-model.js for every field, its unit and default),
//   // merged onto flyer.rig via Object.assign. Omit fields you don't want
//   // to touch — they keep whatever they were (the model's own default, or
//   // an earlier frame's value).
//   rig: { strokeRate, downstrokeFrac, pronationAmp, pronationPhase,
//          sweepAmp, sweepPhase, hindPhase, membraneLagFrac, membraneCamber,
//          bobAmp, tiltAmp }
//
//   // attitude gains — see FLIGHT_DEFAULTS for every default value
//   headingDampRate, bankGain, bankMax, bankDampRate,
//   aoaGain, aoaMax, aoaDampRate, cruiseAoA
import * as THREE from 'three'
import { loadButterfly, prepFlyer, waypointSampler } from './butterflyAsset.js'
import {
  resolveInitialProfileId, isExplicitProfileSelection, setStoredProfileId,
  loadProfile, bindProfileHotkeys, applyRigOverrides, formatHudText, mulberry32,
} from './flight/index.js'

// [scrollProgress, xNorm, yNorm, depth]
//   xNorm / yNorm: -1..1 across the viewport (0 = centre)
//   depth        : world units toward (+) or away from (-) the camera
//
// The path deliberately lives in the outer thirds for most of the page. The
// layer draws OVER the copy, and a butterfly parked on a headline is a bug no
// matter how nicely it is rendered.
//
// Two things push the on-screen footprint around independently of xNorm: the
// idle wander in _advance() (small, constant) and DEPTH — a positive depth
// pulls the butterfly toward the camera and perspective magnifies its
// projected box, a negative depth pushes it back and shrinks it. The
// original path paired a few near-centre xNorm values with the closest
// depths available (0.6-0.9), which is the worst combination for the duck
// check: big AND central. Every waypoint below still visits the centre for
// interest and still visits the camera for scale, but never both — the
// closer depths (>=0.3) now only land on waypoints already out past ~|0.55|
// on x, and the near-centre waypoints sit further back (more negative depth,
// smaller on screen) than before.
const PATH = [
  [0.00, 0.66, 0.12, 0.0],
  [0.06, 0.52, -0.34, -1.3],
  [0.13, -0.46, -0.10, -2.2],
  [0.21, -0.68, 0.26, -0.6],
  [0.29, -0.66, -0.36, 0.35],
  [0.37, 0.30, 0.34, -2.8],
  [0.45, 0.70, 0.04, -0.7],
  [0.53, 0.72, -0.34, 0.35],
  [0.61, -0.28, 0.30, -2.1],
  [0.69, -0.72, -0.06, -0.35],
  [0.77, -0.62, -0.36, 0.3],
  [0.85, 0.38, 0.28, -2.6],
  [0.93, 0.68, -0.12, -0.5],
  [1.00, 0.56, 0.20, 0.2],
]

const VIOLET = new THREE.Color('#7b2fbe')
const MAGENTA = new THREE.Color('#f21c8c')
const WARM = new THREE.Color('#ffd9a0')
const ORCHID = new THREE.Color('#a67cff')

// Companion's own defaults for every gain a flight profile's `drive` may
// override — see the header comment above for what each one does. Exported
// so a profile that wants a RELATIVE tweak (e.g. "a bit more bank than
// normal") can read the baseline instead of re-typing a magic number.
export const FLIGHT_DEFAULTS = Object.freeze({
  idleWanderAmp: 1,
  buffetAmp: 1,
  burstiness: 1,
  glideiness: 0,
  headingDampRate: 10,
  bankGain: 0.32,
  bankMax: 0.62,
  bankDampRate: 3.7,
  aoaGain: 0.5,
  aoaMax: 0.3,
  aoaDampRate: 4,
  cruiseAoA: 0.05,
})

// Frame-rate-independent exponential ease toward `target`. `rate` is a
// per-SECOND constant (bigger = snappier). dt === 0 snaps straight to
// target, which is what lets renderOnce() (the reduced-motion static frame)
// reuse this same helper.
function damp(cur, target, rate, dt) {
  return dt > 0 ? THREE.MathUtils.damp(cur, target, rate, dt) : target
}

export class Companion {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas
    this.reduced = reduced
    this.running = false
    this.disposed = false
    this.time = 0
    this.isMobile = window.innerWidth < 768

    this.pathAt = waypointSampler(PATH)
    this.scrollTarget = 0     // live scroll progress, 0..1
    this.scrollSmooth = 0     // what the butterfly believes; always behind
    this.velTarget = 0        // live scroll velocity, viewports/sec
    this.vel = 0
    this.speed = 0
    this.roll = 0             // bank, radians
    this.aoa = 0              // angle of attack, radians
    this.burst = 0

    this.renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: !this.isMobile, powerPreference: 'high-performance',
    })
    // 1.0 on phones: this layer is the only WebGL context there now, and on a
    // 3x display even 1.25 quadruples the framebuffer for a decorative flyer.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.0 : 1.5))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60)
    this.camera.position.set(0, 0, 6)
    this.camera.lookAt(0, 0, 0)

    // The layer floats over every section, so the butterfly carries its own
    // light: it cannot borrow any from whatever happens to be behind it.
    const key = new THREE.DirectionalLight(WARM, 2.8)
    key.position.set(2.5, 3.5, 4)
    this.scene.add(key)
    const fill = new THREE.DirectionalLight(VIOLET, 1.8)
    fill.position.set(-3, -1, 2)
    this.scene.add(fill)
    // Ambient this high flattens the violet into lavender; the key and rim do
    // the work instead.
    this.scene.add(new THREE.AmbientLight(0x3a2856, 1.7))
    // Orchid, not magenta: a hot pink rim at this intensity turns the whole
    // butterfly into a pink smear whenever it passes edge-on.
    this.rim = new THREE.PointLight(ORCHID, 5, 6, 2)
    this.scene.add(this.rim)
    this.lamp = new THREE.PointLight(WARM, 8, 5, 2)
    this.scene.add(this.lamp)

    this.flyer = null
    this.pos = new THREE.Vector3()
    this.prev = new THREE.Vector3()
    // Scratch objects for the attitude math in _advance() — allocated once
    // here, mutated every frame, never replaced, so orienting the creature
    // costs zero garbage per frame.
    this._move = new THREE.Vector3()
    this.velSmooth = new THREE.Vector3()
    this._velDir = new THREE.Vector3()
    this._fwd = new THREE.Vector3()
    this._eyeTarget = new THREE.Vector3()
    this._up = new THREE.Vector3(0, 1, 0)
    this._lookMat = new THREE.Matrix4()
    this._qHeading = new THREE.Quaternion()
    this._qRoll = new THREE.Quaternion()
    this._qPitch = new THREE.Quaternion()
    this._qTarget = new THREE.Quaternion()
    this._axisZ = new THREE.Vector3(0, 0, 1)
    this._axisX = new THREE.Vector3(1, 0, 0)

    this.clock = new THREE.Clock()
    this.resize = this.resize.bind(this)
    this.loop = this.loop.bind(this)
    window.addEventListener('resize', this.resize)
    this.resize()

    // ── flight profile: selection, switching, HUD ──
    this.profile = null
    this.profileId = null
    this.profileLabel = null
    this.profileState = null
    this._rng = Math.random
    this._profileToken = 0 // guards against a superseded async load applying late
    this._hud = null
    // persist: true — a hotkey press IS the reader explicitly choosing a
    // profile, and that is the only thing allowed to write the selection.
    this._unbindHotkeys = bindProfileHotkeys((id) => this.setProfile(id, { persist: true }))
    // Fire-and-forget: the loop runs fine with this.profile still null for
    // the handful of frames before the first profile resolves (drive = {},
    // every FLIGHT_DEFAULTS/WING_RIG_DEFAULTS value applies — this is
    // exactly the "looks correct with nothing driving it" contract).
    this.setProfile(resolveInitialProfileId())

    this._load()
  }

  async _load() {
    try {
      const gltf = await loadButterfly()
      if (this.disposed) return
      this.flyer = prepFlyer(gltf, { tint: ORCHID, scale: this.baseScale })
      this.scene.add(this.flyer.root)
      this._advance(0)
      if (this.reduced) this.renderOnce()
      else this.start()
    } catch (e) {
      // Model missing or WebGL lost: the layer just stays empty and the page
      // is otherwise untouched.
      this.canvas.style.display = 'none'
    }
  }

  // World-space extent of the z = 0 plane, which is how xNorm/yNorm become
  // positions and how the butterfly keeps a constant share of the viewport
  // instead of ballooning on a wide monitor.
  resize() {
    const w = window.innerWidth, h = window.innerHeight
    if (!w || !h) return
    this.isMobile = w < 768
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.viewH = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z
    this.viewW = this.viewH * this.camera.aspect
    // model wingspan is ~2.02 units; hold it at a fixed fraction of the frame.
    // Trimmed down from 0.32/0.20: the duck check's on-screen box scales
    // directly off this, and on a copy-dense page the old fraction meant the
    // box alone (before any padding) already covered 20-30% of the viewport
    // width — big enough to catch text almost anywhere it flew. Still a
    // clearly-sized creature, just no longer one that dominates a third of
    // the frame.
    // Mobile nudged 0.27 -> 0.31: on a phone the butterfly is the only piece of
    // the 3D layer a reader ever really sees, and at 0.27 it read as a detail
    // rather than as the companion it is. The duck's box scales off this, so
    // the cost of the extra 4% is that it ducks slightly more often — which is
    // the correct trade, and the hysteresis in Flyer.jsx now keeps that from
    // flickering the way it used to.
    const frac = this.isMobile ? 0.31 : 0.165
    this.baseScale = (frac * this.viewW) / 2.02
    // Keep the whole wingspan inside the frame. A flat ±0.92 clamp is fine on a
    // desktop where the butterfly is 13% of the width and clips by nothing; on a
    // phone it is 24% wide and a wingtip hangs off the edge.
    this.xClamp = 1 - frac * 0.62
    if (this.flyer) this.flyer.root.scale.setScalar(this.baseScale)
    if (this.reduced) this.renderOnce()
  }

  // p: 0..1 down the document. v: viewport-heights per second, signed.
  setScroll(p, v) {
    this.scrollTarget = THREE.MathUtils.clamp(p, 0, 1)
    this.velTarget = THREE.MathUtils.clamp(v, -8, 8)
  }

  // ── flight profile switching ──
  // Fully async-safe: if setProfile() is called again before the first load
  // resolves (a reader mashing 1/2/3), the stale resolution is dropped via
  // `_profileToken` rather than applying out of order. No renderer/scene
  // work happens here — this only swaps plain JS references — so switching
  // can never duplicate the rAF loop, leak a listener, or touch the WebGL
  // context.
  // `persist` writes the id to sessionStorage, which is ALSO what marks the
  // selection as explicit (see isExplicitProfileSelection) and therefore what
  // un-hides the corner HUD. It must stay false for the initial load: this
  // used to persist unconditionally, so simply opening the page stored the
  // shipping default, `isExplicitProfileSelection()` went true immediately,
  // and every real visitor got the dev HUD painted over the page in a
  // production build.
  async setProfile(id, { persist = false } = {}) {
    const token = ++this._profileToken
    let loaded
    try {
      loaded = await loadProfile(id)
    } catch (e) {
      // A broken profile module must not take the whole flyer down with it.
      return
    }
    if (this.disposed || token !== this._profileToken) return

    if (this.profile && typeof this.profile.dispose === 'function') {
      try { this.profile.dispose(this.profileState) } catch (e) { /* profile bug, not ours */ }
    }

    this.profile = loaded.module
    this.profileId = loaded.id
    this.profileLabel = loaded.label
    if (persist) setStoredProfileId(loaded.id)
    // Reseeded on every activation — including re-selecting the same
    // profile — so a profile's own rng() sequence is fresh each time.
    this._rng = mulberry32((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0)

    // Reset per-profile FLIGHT-FEEL state so the new profile starts clean
    // rather than inheriting the old one's momentum. Deliberately does NOT
    // touch scrollTarget/scrollSmooth/vel — that is real reader scroll
    // state, not profile state, and resetting it would jump the butterfly.
    this.burst = 0
    this.roll = 0
    this.aoa = 0
    this.velSmooth.set(0, 0, 0)

    this.profileState = typeof this.profile.init === 'function'
      ? (this.profile.init(this._buildCtx(0)) || {})
      : {}

    this._updateHud()
  }

  _buildCtx(dt) {
    return {
      t: this.time,
      dt,
      scrollP: this.scrollSmooth,
      scrollRaw: this.scrollTarget,
      scrollVel: this.vel,
      pos: this.pos,
      speed: this.speed,
      baseScale: this.baseScale || 0,
      isMobile: this.isMobile,
      rng: this._rng,
    }
  }

  // A small, unobtrusive corner readout — never part of the page's own
  // layout, never interactive. Shown in dev (import.meta.env.DEV) or once a
  // reader has explicitly picked a profile (URL param or a hotkey press this
  // session) — a normal production visit that never touches ?flight= or
  // 1/2/3 never sees it.
  _ensureHud() {
    if (this._hud) return this._hud
    const el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    Object.assign(el.style, {
      position: 'fixed', right: '10px', bottom: '10px', zIndex: '2147483647',
      font: '11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
      color: 'rgba(232,224,255,0.86)', background: 'rgba(13,7,22,0.55)',
      padding: '5px 9px', borderRadius: '7px', pointerEvents: 'none',
      letterSpacing: '0.02em', backdropFilter: 'blur(4px)', whiteSpace: 'nowrap',
    })
    document.body.appendChild(el)
    this._hud = el
    return el
  }

  _updateHud() {
    const dev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
    const show = dev || isExplicitProfileSelection()
    if (!show) { if (this._hud) this._hud.style.display = 'none'; return }
    if (!this.profileId) return
    const el = this._ensureHud()
    el.textContent = formatHudText(this.profileId, this.profileLabel)
    el.style.display = 'block'
  }

  start() { if (!this.running && !this.disposed) { this.running = true; this.clock.start(); this.loop() } }
  stop() { this.running = false }

  renderOnce() {
    this.time = 1.5
    this._advance(0)
    this.renderer.render(this.scene, this.camera)
  }

  _advance(dt) {
    const t = this.time

    // Ask the active flight profile what it wants this frame BEFORE any of
    // the below runs, so every system (path, burst, attitude, rig) can read
    // from one settled `drive` object. `drive` fields are all optional —
    // `??` against FLIGHT_DEFAULTS/hand-picked constants below is the
    // fallback for every one of them. See this file's header for the full
    // ctx/drive contract.
    const drive = (this.profile && typeof this.profile.update === 'function')
      ? (this.profile.update(this._buildCtx(dt), this.profileState) || {})
      : {}

    // ── the drag ──
    // A fast flick opens a real gap between where you are and where the
    // butterfly thinks it is; it then closes that gap under its own power.
    // Chasing harder when the gap is wide keeps it from being left behind on a
    // 28,000px page without making short scrolls feel snappy.
    const gap = this.scrollTarget - this.scrollSmooth
    const chaseRate = 1.8 + Math.min(4.9, Math.abs(gap) * 84)
    this.scrollSmooth = damp(this.scrollSmooth, this.scrollTarget, chaseRate, dt)
    // Velocity decays here rather than in the listener: scroll events stop
    // firing the moment the reader stops, and a velocity that only ever gets
    // topped up would leave the butterfly buffeted forever.
    if (dt) this.velTarget *= Math.pow(0.02, dt)
    this.vel = damp(this.vel, this.velTarget, 6.3, dt)

    const wp = this.pathAt(this.scrollSmooth)
    let [xn, yn, depth] = wp

    const idleWanderAmp = drive.idleWanderAmp ?? FLIGHT_DEFAULTS.idleWanderAmp
    const buffetAmp = drive.buffetAmp ?? FLIGHT_DEFAULTS.buffetAmp

    // idle wander, so a still page never freezes it
    xn += (Math.sin(t * 0.31) * 0.055 + Math.sin(t * 0.17 + 1.7) * 0.035) * idleWanderAmp
    yn += (Math.sin(t * 0.43 + 0.9) * 0.050 + Math.sin(t * 0.23) * 0.030) * idleWanderAmp
    depth += Math.sin(t * 0.19 + 2.4) * 0.35 * idleWanderAmp

    // buffeting: scrolling down shoves it down and skids it sideways
    yn -= THREE.MathUtils.clamp(this.vel * 0.16, -0.42, 0.42) * buffetAmp
    xn += THREE.MathUtils.clamp(this.vel * 0.05, -0.16, 0.16) * buffetAmp

    // profile-owned path shaping, on top of the shared waypoint table — a
    // profile customises the ride without ever owning PATH itself.
    xn += drive.pathXOffset ?? 0
    yn += drive.pathYOffset ?? 0
    depth += drive.pathDepthOffset ?? 0

    this.pos.set(
      THREE.MathUtils.clamp(xn, -this.xClamp, this.xClamp) * this.viewW * 0.5,
      THREE.MathUtils.clamp(yn, -0.88, 0.88) * this.viewH * 0.5,
      depth,
    )

    if (!this.flyer) return
    const { root, mixer, flutter, cruise, flap } = this.flyer

    if (dt > 0) {
      const inst = this.pos.distanceTo(this.prev) / Math.max(dt, 1e-3)
      this.speed = damp(this.speed, inst, 6.3, dt)
    }
    this._move.subVectors(this.pos, this.prev)
    this.prev.copy(this.pos)
    root.position.copy(this.pos)

    // ── attitude: heading, AoA and roll composed into ONE quaternion ──
    // Smooth the VELOCITY before it becomes a direction — a noisy tiny
    // vector stays noisy after normalizing, so smoothing first is a real
    // low-pass, not a band-aid applied after the fact.
    this.velSmooth.x = damp(this.velSmooth.x, dt > 0 ? this._move.x / dt : 0, 8, dt)
    this.velSmooth.y = damp(this.velSmooth.y, dt > 0 ? this._move.y / dt : 0, 8, dt)
    this.velSmooth.z = damp(this.velSmooth.z, dt > 0 ? this._move.z / dt : 0, 8, dt)

    {
      // ── Heading: aim at the READER, not at an axis ──
      // The model's local +Z is the wing normal AND the direction its face
      // looks (bbox is 2.02 x 1.26 x 0.28 — it is a flat thing in Z), so
      // pointing +Z at the eye is what puts the full dorsal spread, both
      // eyes and the antennae square to the viewer.
      //
      // "At the eye" is the whole point, and it is NOT the same as world +Z.
      // This camera is a PERSPECTIVE camera parked at (0, 0, 6) while the
      // butterfly flies out to roughly ±2.7 world units sideways and ±1.8
      // vertically. From a waypoint at the edge of the frame, world +Z is up
      // to ~30° away from where the reader actually is — so a heading biased
      // toward world +Z (what this used to do) still reads as a three-quarter
      // exactly where the path spends most of its time. Aiming at
      // camera.position is correct at every waypoint and every depth, and it
      // costs the same one subtraction.
      this._fwd.subVectors(this.camera.position, root.position).normalize()

      // Then lean off that by a little of where it is actually going, so it
      // is a creature holding your eye rather than a decal pinned to the
      // glass. LEAN is the sine of the worst-case deviation: 0.3 -> ~17° at
      // full tilt, and less than that whenever velocity is not perpendicular
      // to the view ray. Bank and angle-of-attack compose on top below.
      const LEAN = 0.3
      if (this.velSmooth.lengthSq() > 1e-6) {
        this._velDir.copy(this.velSmooth).normalize()
        this._fwd.addScaledVector(this._velDir, LEAN).normalize()
      }
      this._eyeTarget.copy(root.position).add(this._fwd)
      // ARGUMENT ORDER IS LOAD-BEARING, and it is not the order it reads as.
      // THREE.Matrix4.lookAt(eye, target, up) sets +Z = normalize(eye -
      // target): it builds a CAMERA basis, and cameras look down -Z.
      // Object3D.lookAt() hides this by passing (target, position) for
      // anything that is not a camera or a light, and (position, target)
      // only for those that are — see Object3D.js. This code drives the
      // matrix directly, so it has to do that compensation itself.
      //
      // It did not, and passed the camera order, which pointed the
      // butterfly's +Z a full 180° away from the aim vector — so every
      // "bias the heading toward the reader" tweak was steering its BACK
      // toward the reader, harder. Symmetric, wings spread, no eyes.
      // (target, position) is the mesh order and is what puts its face on
      // the aim vector.
      this._lookMat.lookAt(this._eyeTarget, root.position, this._up)
      this._qHeading.setFromRotationMatrix(this._lookMat)

      // Roll/bank: a CONSEQUENCE of turning, not an independent input —
      // proportional to smoothed lateral velocity, damped in behind its
      // target instead of chased with a flat per-frame fraction.
      const bankGain = drive.bankGain ?? FLIGHT_DEFAULTS.bankGain
      const bankMax = drive.bankMax ?? FLIGHT_DEFAULTS.bankMax
      const bankDampRate = drive.bankDampRate ?? FLIGHT_DEFAULTS.bankDampRate
      const bankTarget = THREE.MathUtils.clamp(-this.velSmooth.x * bankGain, -bankMax, bankMax)
      this.roll = damp(this.roll, bankTarget, bankDampRate, dt)
      this._qRoll.setFromAxisAngle(this._axisZ, this.roll)

      // Angle of attack: nose-up climbing, nose-down diving, derived from
      // the SMOOTHED VERTICAL VELOCITY plus a small constant cruise bias —
      // deliberately NOT a function of wing-stroke phase (see this file's
      // header on why the wingbeat's own body coupling stays in the model).
      const aoaGain = drive.aoaGain ?? FLIGHT_DEFAULTS.aoaGain
      const aoaMax = drive.aoaMax ?? FLIGHT_DEFAULTS.aoaMax
      const aoaDampRate = drive.aoaDampRate ?? FLIGHT_DEFAULTS.aoaDampRate
      const cruiseAoA = drive.cruiseAoA ?? FLIGHT_DEFAULTS.cruiseAoA
      const aoaTarget = THREE.MathUtils.clamp(this.velSmooth.y * aoaGain + cruiseAoA, -aoaMax, aoaMax)
      this.aoa = damp(this.aoa, aoaTarget, aoaDampRate, dt)
      this._qPitch.setFromAxisAngle(this._axisX, this.aoa)

      this._qTarget.copy(this._qHeading).multiply(this._qPitch).multiply(this._qRoll)
      const headingDampRate = drive.headingDampRate ?? FLIGHT_DEFAULTS.headingDampRate
      const slerpT = dt > 0 ? 1 - Math.exp(-headingDampRate * dt) : 1
      root.quaternion.slerp(this._qTarget, slerpT)
    }

    // Flap-glide. Butterflies do not beat steadily; they burst, then coast.
    // The envelope is two incommensurate sines so the rhythm never repeats,
    // floored by airspeed so a hard scroll always forces a real burst.
    // `burstiness` widens/narrows the swing around its own ~0.5 midpoint;
    // `glideiness` gates how much of the periodic "hold wings open and
    // coast" glide (borrowed from the wider rhythm signal) is allowed
    // through — 0 by default, a profile opts in.
    const burstiness = drive.burstiness ?? FLIGHT_DEFAULTS.burstiness
    const glideiness = THREE.MathUtils.clamp(drive.glideiness ?? FLIGHT_DEFAULTS.glideiness, 0, 1)
    const rhythm = 0.5 + 0.5 * Math.sin(t * 1.35) * Math.sin(t * 0.47 + 1.1)
    const driveSignal = THREE.MathUtils.clamp(this.speed * 0.14 + Math.abs(this.vel) * 0.16, 0, 1)
    const burstTarget = 0.5 + (Math.max(rhythm, driveSignal) - 0.5) * burstiness
    this.burst = damp(this.burst, burstTarget, 3.7, dt)
    const glideSignal = Math.sin(t * 0.083 + 0.4) * Math.sin(t * 0.021 + 2.1)
    const glide = glideiness > 0 ? THREE.MathUtils.smoothstep(glideSignal, 0.6, 0.88) * glideiness : 0

    // Amplitude never drops to a twitch outside a glide. A butterfly coasting
    // still holds its wings moving; at 0.14 the stroke was invisible and the
    // whole thing read as a sticker being slid down the page. During a glide
    // it deliberately DOES drop low — wings held open, riding the air.
    const flapWeight = drive.flapWeight != null
      ? THREE.MathUtils.clamp(drive.flapWeight, 0, 1)
      : THREE.MathUtils.lerp(0.45 + this.burst * 0.55, 0.16, glide)
    flap.setEffectiveWeight(flapWeight)

    // The clip is 0.34s, so timeScale is beats/0.34s. Real butterflies run
    // 5-12 Hz — 1.75 is 5.1 Hz coasting, 2.75 is 8.1 Hz in a burst. Below 5 Hz
    // it stops looking like a wing and starts looking like a slow-motion
    // clip — except mid-glide, where slow IS the point. `flapRate` (from a
    // profile) is documented in beats/second; the emulated clip's own
    // duration converts it to the timeScale the mixer actually advances by.
    flap.timeScale = drive.flapRate != null
      ? drive.flapRate * flap.getClip().duration
      : THREE.MathUtils.lerp(1.75 + this.burst * 1.0, 0.8, glide)

    // Wing-rig passthrough: a partial WING_RIG_DEFAULTS patch, merged onto
    // flyer.rig. Unset fields keep whatever they were (the model's own
    // default, or an earlier frame's value) — see butterfly-model.js.
    applyRigOverrides(this.flyer, drive.rig)

    const cruiseW = THREE.MathUtils.clamp((this.speed - 0.55) / 1.5, 0, 1)
    cruise.weight = cruiseW
    flutter.weight = 1 - cruiseW

    this.lamp.position.set(this.pos.x + 1.1, this.pos.y + 1.2, this.pos.z + 1.8)
    this.rim.position.set(this.pos.x - 1.0, this.pos.y + 0.5, this.pos.z - 1.4)
    this.rim.intensity = 4.5 + this.burst * 3

    mixer.update(dt)
  }

  loop() {
    if (!this.running || this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.time += dt
    this._advance(dt)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    this.stop()
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    this._unbindHotkeys?.()
    if (this._hud) { this._hud.remove(); this._hud = null }
    if (this.profile && typeof this.profile.dispose === 'function') {
      try { this.profile.dispose(this.profileState) } catch (e) { /* profile bug, not ours */ }
    }
    if (this.flyer) {
      this.flyer.mixer.stopAllAction()
      for (const m of this.flyer.disposables) m.dispose?.()
    }
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose() })
    this.renderer.dispose()
  }
}
