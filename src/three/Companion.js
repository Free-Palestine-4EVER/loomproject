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
import * as THREE from 'three'
import { loadButterfly, prepFlyer, waypointSampler } from './butterflyAsset.js'

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
    this.roll = 0
    this.flapEnv = 1
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
    this.clock = new THREE.Clock()
    this.resize = this.resize.bind(this)
    this.loop = this.loop.bind(this)
    window.addEventListener('resize', this.resize)
    this.resize()
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
    const frac = this.isMobile ? 0.27 : 0.165
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

  start() { if (!this.running && !this.disposed) { this.running = true; this.clock.start(); this.loop() } }
  stop() { this.running = false }

  renderOnce() {
    this.time = 1.5
    this._advance(0)
    this.renderer.render(this.scene, this.camera)
  }

  _advance(dt) {
    const t = this.time

    // ── the drag ──
    // A fast flick opens a real gap between where you are and where the
    // butterfly thinks it is; it then closes that gap under its own power.
    // Chasing harder when the gap is wide keeps it from being left behind on a
    // 28,000px page without making short scrolls feel snappy.
    const gap = this.scrollTarget - this.scrollSmooth
    const chase = 0.030 + Math.min(0.075, Math.abs(gap) * 1.4)
    this.scrollSmooth += gap * (dt ? chase : 1)
    // Velocity decays here rather than in the listener: scroll events stop
    // firing the moment the reader stops, and a velocity that only ever gets
    // topped up would leave the butterfly buffeted forever.
    if (dt) this.velTarget *= Math.pow(0.02, dt)
    this.vel += (this.velTarget - this.vel) * (dt ? 0.10 : 1)

    const wp = this.pathAt(this.scrollSmooth)
    let [xn, yn, depth] = wp

    // idle wander, so a still page never freezes it
    xn += Math.sin(t * 0.31) * 0.055 + Math.sin(t * 0.17 + 1.7) * 0.035
    yn += Math.sin(t * 0.43 + 0.9) * 0.050 + Math.sin(t * 0.23) * 0.030
    depth += Math.sin(t * 0.19 + 2.4) * 0.35

    // buffeting: scrolling down shoves it down and skids it sideways
    yn -= THREE.MathUtils.clamp(this.vel * 0.16, -0.42, 0.42)
    xn += THREE.MathUtils.clamp(this.vel * 0.05, -0.16, 0.16)

    this.pos.set(
      THREE.MathUtils.clamp(xn, -this.xClamp, this.xClamp) * this.viewW * 0.5,
      THREE.MathUtils.clamp(yn, -0.88, 0.88) * this.viewH * 0.5,
      depth,
    )

    if (!this.flyer) return
    const { root, mixer, flutter, cruise, flap } = this.flyer

    if (dt > 0) {
      const inst = this.pos.distanceTo(this.prev) / Math.max(dt, 1e-3)
      this.speed += (inst - this.speed) * 0.10
    }
    const move = new THREE.Vector3().subVectors(this.pos, this.prev)
    this.prev.copy(this.pos)
    root.position.copy(this.pos)

    // Heading: +Z is forward. Raw path velocity regularly aims the butterfly
    // straight upstage, where all the reader gets is an abdomen — so it is
    // biased toward camera, which holds a legible three-quarter through every
    // turn without freezing into a fixed pose.
    let oriented = false
    if (move.lengthSq() > 1e-8) {
      oriented = true
      const fwd = move.clone().normalize()
      fwd.set(fwd.x, fwd.y * 0.55, fwd.z * 0.35 + 0.78).normalize()
      root.lookAt(this.pos.clone().add(fwd))
      const bankTarget = THREE.MathUtils.clamp(-move.x * 26, -0.62, 0.62)
      this.roll += (bankTarget - this.roll) * (dt ? 0.06 : 1)
      root.rotateZ(this.roll)
    }

    // Flap-glide. Butterflies do not beat steadily; they burst, then coast.
    // The envelope is two incommensurate sines so the rhythm never repeats,
    // floored by airspeed so a hard scroll always forces a real burst.
    const rhythm = 0.5 + 0.5 * Math.sin(t * 1.35) * Math.sin(t * 0.47 + 1.1)
    const drive = THREE.MathUtils.clamp(this.speed * 0.14 + Math.abs(this.vel) * 0.16, 0, 1)
    this.burst += (Math.max(rhythm, drive) - this.burst) * (dt ? 0.06 : 1)
    // Amplitude never drops to a twitch. A butterfly coasting still holds its
    // wings moving; at 0.14 the stroke was invisible and the whole thing read
    // as a sticker being slid down the page.
    flap.setEffectiveWeight(0.45 + this.burst * 0.55)
    // The clip is 0.34s, so timeScale is beats/0.34s. Real butterflies run
    // 5-12 Hz — 1.75 is 5.1 Hz coasting, 2.75 is 8.1 Hz in a burst. Below 5 Hz
    // it stops looking like a wing and starts looking like a slow-motion clip.
    flap.timeScale = 1.75 + this.burst * 1.0

    // ── the bounce ──
    // This is the single thing that separates flying from sliding: a butterfly
    // is thrown UP on every downstroke and falls back between beats, so its
    // path is a scallop, not a line. Read the stroke's own phase so the lift is
    // locked to the wings the reader is watching rather than a free-running
    // sine that drifts out of sync with them.
    const clipDur = flap.getClip().duration || 0.34
    const phase = ((flap.time % clipDur) / clipDur) * Math.PI * 2
    const amp = 0.45 + this.burst * 0.55
    const bounce = Math.sin(phase) * this.baseScale * 0.34 * amp

    // ── the sawtooth ──
    // Between bursts it sinks; a burst wins the height back. Integrating rather
    // than reading a sine means altitude is a consequence of how hard it is
    // beating, which is what makes the drifting feel like it costs something.
    this.lift = (this.lift || 0) + (this.burst - 0.52) * dt * 1.5
    this.lift = THREE.MathUtils.clamp(this.lift, -0.5, 0.5) * (dt ? Math.pow(0.55, dt) : 1)

    root.position.y += bounce + this.lift * this.baseScale * 0.9
    // Nose-up as it climbs out of each downstroke. rotateX is relative, so it
    // may only run on a frame where lookAt() has just rewritten the rotation —
    // otherwise the pitch integrates and the butterfly tumbles.
    if (oriented) root.rotateX(Math.sin(phase - 0.6) * 0.16 * amp)

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
    if (this.flyer) {
      this.flyer.mixer.stopAllAction()
      for (const m of this.flyer.disposables) m.dispose?.()
    }
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose() })
    this.renderer.dispose()
  }
}
