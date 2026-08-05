// Side-by-side flight chooser — three live butterflies, one per profile in
// src/three/flight/, flying at the same time under the same lights so the
// only difference on screen is the flight itself.
//
// It deliberately does NOT import Companion.js: Companion is welded to the
// real page (scroll, sections, the site's waypoint table) and dragging it in
// here would mean editing the site to make a dev page work. Instead this
// file re-implements the small part of Companion's per-frame maths that the
// flight contract actually touches — idle wander, profile path offsets,
// heading bias, bank, angle of attack, the flap envelope — reading the exact
// same `drive` fields from the exact same profile modules. Scroll is zero
// throughout (there is no page to scroll), so what you see is each profile's
// own idea of how to fly, which is the thing being chosen between.
//
// Three renderers would mean three WebGL contexts and three copies of the
// canvas-baked wing textures; this uses ONE renderer with a scissored
// viewport per panel instead.
import * as THREE from 'three'
import { prepFlyer } from './butterflyAsset.js'
import { PROFILES, applyRigOverrides, setStoredProfileId, mulberry32 } from './flight/index.js'

const BLURB = {
  a: 'Flap hard, then stop dead and soar. Long descending glides, wide lazy arcs, wings parked mid-stroke through the hold.',
  b: 'Never stops beating. Fine lateral zig-zag while travelling, easing into a slow figure-eight loiter on the spot.',
  c: 'Sharp and nervous. Unpredictable jinks, a single hard punch of a stroke into each one, steep banking out of it.',
}
const ORCHID = new THREE.Color('#a67cff')
const VIOLET = new THREE.Color('#7b2fbe')
const WARM = new THREE.Color('#ffd9a0')

const IDS = Object.keys(PROFILES) // ['a','b','c']
const canvas = document.getElementById('gl')
const ui = document.getElementById('ui')
const pickedBanner = document.getElementById('picked')

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setScissorTest(true)

const CAM_DIST = 6.2
const FOV = 40
// The flight zone sits a little below panel centre so a climbing profile
// never wanders up behind its own caption.
const ZONE_Y_BIAS = -0.18
// Wingspan as a fraction of the panel's SHORT side. The panels are tall and
// narrow on a laptop and short and wide on an external display, so a fixed
// world scale reads correctly on exactly one of them — this fits the
// butterfly to whichever dimension is tighter, every resize.
const SPAN_FRAC = 0.46

// ── one scene per panel: same light rig Companion.js builds on the page,
// so a butterfly judged here is lit the way a visitor will see it ──
function makeScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#0d0716')
  const key = new THREE.DirectionalLight(WARM, 2.8)
  key.position.set(2.5, 3.5, 4)
  scene.add(key)
  const fill = new THREE.DirectionalLight(VIOLET, 1.8)
  fill.position.set(-3, -1, 2)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0x3a2856, 1.7))
  const rim = new THREE.PointLight(ORCHID, 5, 9, 2)
  rim.position.set(-1.6, 0.8, -1.8)
  scene.add(rim)
  const lamp = new THREE.PointLight(WARM, 8, 8, 2)
  lamp.position.set(1.6, 1.6, 2.4)
  scene.add(lamp)
  return scene
}

function damp(cur, target, rate, dt) {
  return dt > 0 ? target + (cur - target) * Math.exp(-rate * dt) : target
}

// Companion's FLIGHT_DEFAULTS, for the fields this page reads. Kept as a
// local copy rather than imported because Companion.js does not export them
// and this page must not require editing it.
const FLIGHT_DEFAULTS = {
  idleWanderAmp: 1, buffetAmp: 1, burstiness: 1, glideiness: 0,
  headingDampRate: 10, bankGain: 0.32, bankMax: 0.62, bankDampRate: 3.7,
  aoaGain: 0.5, aoaMax: 0.3, aoaDampRate: 4, cruiseAoA: 0.05,
}

class Panel {
  constructor(id, label) {
    this.id = id
    this.label = label
    this.scene = makeScene()
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100)
    this.camera.position.set(0, 0, CAM_DIST)
    this.camera.lookAt(0, 0, 0)

    this.flyer = prepFlyer(null, { tint: ORCHID, scale: 1 })
    this.scene.add(this.flyer.root)
    // Measure the wingspan ONCE, at rest, before anything animates — resize()
    // divides into this to fit the butterfly to the panel.
    this.baseSpan = Math.max(
      new THREE.Box3().setFromObject(this.flyer.root).getSize(new THREE.Vector3()).x,
      1e-3,
    )

    this.t = 0
    this.pos = new THREE.Vector3()
    this.prev = new THREE.Vector3()
    this.velSmooth = new THREE.Vector3()
    this.speed = 0
    this.roll = 0
    this.aoa = 0
    this.burst = 0.5
    this._move = new THREE.Vector3()
    this._fwd = new THREE.Vector3()
    this._eye = new THREE.Vector3()
    this._up = new THREE.Vector3(0, 1, 0)
    this._lookMat = new THREE.Matrix4()
    this._qHeading = new THREE.Quaternion()
    this._qRoll = new THREE.Quaternion()
    this._qPitch = new THREE.Quaternion()
    this._qTarget = new THREE.Quaternion()
    this._axisX = new THREE.Vector3(1, 0, 0)
    this._axisZ = new THREE.Vector3(0, 0, 1)

    this.viewW = 1
    this.viewH = 1
    this.profile = null
    this.state = null
    this.rng = Math.random
    this.hud = ''
  }

  async load() {
    const mod = await PROFILES[this.id].load()
    this.profile = mod.default
    this.restart()
  }

  restart() {
    if (!this.profile) return
    this.rng = mulberry32(((this.id.charCodeAt(0) * 7919) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0)
    this.state = typeof this.profile.init === 'function' ? (this.profile.init(this.ctx(0)) || {}) : {}
    this.t = 0
  }

  ctx(dt) {
    return {
      t: this.t, dt,
      // No page, so no scroll — a profile reading these gets an honest zero.
      scrollP: 0, scrollRaw: 0, scrollVel: 0,
      pos: this.pos, speed: this.speed, baseScale: 1, isMobile: false, rng: this.rng,
    }
  }

  resize(w, h) {
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    // World extent visible at the butterfly's own depth (z = 0), so the
    // normalized -1..1 path coordinates a profile emits map onto the panel
    // the same way they map onto the page.
    this.viewH = 2 * Math.tan((FOV * Math.PI) / 360) * CAM_DIST
    this.viewW = this.viewH * this.camera.aspect
    const span = Math.min(this.viewW, this.viewH) * SPAN_FRAC
    this.flyer.root.scale.setScalar(span / this.baseSpan)
  }

  update(dt) {
    if (!this.profile) return
    this.t += dt
    const t = this.t
    const drive = (typeof this.profile.update === 'function')
      ? (this.profile.update(this.ctx(dt), this.state) || {})
      : {}

    // ── position: idle wander + the profile's own path offsets ──
    // (Companion adds a scroll waypoint and scroll buffeting here; both are
    // identically zero on a page that does not scroll.)
    const idleWanderAmp = drive.idleWanderAmp ?? FLIGHT_DEFAULTS.idleWanderAmp
    let xn = (Math.sin(t * 0.31) * 0.055 + Math.sin(t * 0.17 + 1.7) * 0.035) * idleWanderAmp
    let yn = (Math.sin(t * 0.43 + 0.9) * 0.050 + Math.sin(t * 0.23) * 0.030) * idleWanderAmp
    let depth = Math.sin(t * 0.19 + 2.4) * 0.35 * idleWanderAmp

    xn += drive.pathXOffset ?? 0
    yn += drive.pathYOffset ?? 0
    depth += drive.pathDepthOffset ?? 0

    this.pos.set(
      THREE.MathUtils.clamp(xn, -0.55, 0.55) * this.viewW * 0.5,
      // Asymmetric on purpose: the caption occupies the top of every panel,
      // so the ceiling is much lower than the floor.
      (THREE.MathUtils.clamp(yn, -0.5, 0.16) + ZONE_Y_BIAS) * this.viewH * 0.5,
      depth,
    )

    const { root, mixer, flap } = this.flyer

    if (dt > 0) {
      const inst = this.pos.distanceTo(this.prev) / Math.max(dt, 1e-3)
      this.speed = damp(this.speed, inst, 6.3, dt)
    }
    this._move.subVectors(this.pos, this.prev)
    this.prev.copy(this.pos)
    root.position.copy(this.pos)

    // ── attitude: heading (biased toward camera), AoA, bank — one quaternion ──
    this.velSmooth.x = damp(this.velSmooth.x, dt > 0 ? this._move.x / dt : 0, 8, dt)
    this.velSmooth.y = damp(this.velSmooth.y, dt > 0 ? this._move.y / dt : 0, 8, dt)
    this.velSmooth.z = damp(this.velSmooth.z, dt > 0 ? this._move.z / dt : 0, 8, dt)

    if (this.velSmooth.lengthSq() > 1e-6) {
      this._fwd.copy(this.velSmooth).normalize()
      this._fwd.set(this._fwd.x, this._fwd.y * 0.55, this._fwd.z * 0.35 + 0.78).normalize()
      this._eye.copy(root.position).add(this._fwd)
      this._lookMat.lookAt(root.position, this._eye, this._up)
      this._qHeading.setFromRotationMatrix(this._lookMat)

      const bankTarget = THREE.MathUtils.clamp(
        -this.velSmooth.x * (drive.bankGain ?? FLIGHT_DEFAULTS.bankGain),
        -(drive.bankMax ?? FLIGHT_DEFAULTS.bankMax),
        drive.bankMax ?? FLIGHT_DEFAULTS.bankMax,
      )
      this.roll = damp(this.roll, bankTarget, drive.bankDampRate ?? FLIGHT_DEFAULTS.bankDampRate, dt)
      this._qRoll.setFromAxisAngle(this._axisZ, this.roll)

      const aoaMax = drive.aoaMax ?? FLIGHT_DEFAULTS.aoaMax
      const aoaTarget = THREE.MathUtils.clamp(
        this.velSmooth.y * (drive.aoaGain ?? FLIGHT_DEFAULTS.aoaGain) + (drive.cruiseAoA ?? FLIGHT_DEFAULTS.cruiseAoA),
        -aoaMax, aoaMax,
      )
      this.aoa = damp(this.aoa, aoaTarget, drive.aoaDampRate ?? FLIGHT_DEFAULTS.aoaDampRate, dt)
      this._qPitch.setFromAxisAngle(this._axisX, this.aoa)

      this._qTarget.copy(this._qHeading).multiply(this._qPitch).multiply(this._qRoll)
      const slerpT = dt > 0 ? 1 - Math.exp(-(drive.headingDampRate ?? FLIGHT_DEFAULTS.headingDampRate) * dt) : 1
      root.quaternion.slerp(this._qTarget, slerpT)
    }

    // ── flap envelope, same shape Companion uses; a profile that drives
    // flapWeight itself (Glider does) overrides it outright ──
    const burstiness = drive.burstiness ?? FLIGHT_DEFAULTS.burstiness
    const rhythm = 0.5 + 0.5 * Math.sin(t * 1.35) * Math.sin(t * 0.47 + 1.1)
    const driveSignal = THREE.MathUtils.clamp(this.speed * 0.14, 0, 1)
    this.burst = damp(this.burst, 0.5 + (Math.max(rhythm, driveSignal) - 0.5) * burstiness, 3.7, dt)

    const weight = drive.flapWeight != null
      ? THREE.MathUtils.clamp(drive.flapWeight, 0, 1)
      : THREE.MathUtils.clamp(0.35 + this.burst * 0.65, 0, 1)
    flap.setEffectiveWeight(weight)
    if (drive.flapRate != null) flap.timeScale = drive.flapRate * flap.getClip().duration

    applyRigOverrides(this.flyer, drive.rig)
    mixer.update(dt)

    this.hud = `wing ${weight.toFixed(2)}   beat ${(drive.flapRate ?? 0).toFixed(1)}/s\n`
      + `bank ${(this.roll * 57.3).toFixed(0)}°   aoa ${(this.aoa * 57.3).toFixed(0)}°`
  }
}

// ── panels + their overlay cards ──
const panels = IDS.map((id) => new Panel(id, PROFILES[id].label))
const cards = panels.map((p, i) => {
  const el = document.createElement('div')
  el.className = 'panel'
  el.innerHTML = `
    <div class="head">
      <div class="k">option ${i + 1} · key ${i + 1}</div>
      <h2>${p.label}</h2>
      <p>${BLURB[p.id] || ''}</p>
    </div>
    <div class="foot">
      <div class="stat"></div>
      <button type="button">Choose ${p.label}</button>
    </div>`
  el.querySelector('button').addEventListener('click', () => choose(p.id))
  ui.appendChild(el)
  return { el, stat: el.querySelector('.stat') }
})

function choose(id) {
  setStoredProfileId(id)
  panels.forEach((p, i) => cards[i].el.classList.toggle('picked', p.id === id))
  pickedBanner.textContent = `picked: ${PROFILES[id].label} — the site now runs ?flight=${id}`
  pickedBanner.classList.add('on')
}

addEventListener('keydown', (e) => {
  if (e.key === ' ') { paused = !paused; e.preventDefault() }
  else if (e.key.toLowerCase() === 'r') panels.forEach((p) => p.restart())
  else if (['1', '2', '3'].includes(e.key)) choose(IDS[Number(e.key) - 1])
})

function resize() {
  const w = innerWidth, h = innerHeight
  // updateStyle MUST stay on (the default). With it off, three sets only the
  // canvas's width/height ATTRIBUTES — which on a 2x display are 2x the CSS
  // pixels — and a bare `position:fixed; inset:0` does not stretch a replaced
  // element back down. The canvas then lays out at its intrinsic 2x size and
  // the reader sees one magnified quadrant of the page.
  renderer.setSize(w, h)
  panels.forEach((p) => p.resize(w / panels.length, h))
}
addEventListener('resize', resize)
resize()

let paused = false
const clock = new THREE.Clock()

function loop() {
  requestAnimationFrame(loop)
  const dt = paused ? 0 : Math.min(clock.getDelta(), 0.05)
  if (paused) clock.getDelta() // keep the clock from banking time while paused

  const w = innerWidth, h = innerHeight
  const pw = Math.floor(w / panels.length)
  panels.forEach((p, i) => {
    if (!paused) p.update(dt)
    const x = i * pw
    const width = i === panels.length - 1 ? w - x : pw
    renderer.setViewport(x, 0, width, h)
    renderer.setScissor(x, 0, width, h)
    renderer.render(p.scene, p.camera)
    cards[i].stat.textContent = p.hud
  })
}

// ── deterministic stepping hook, for capture/QA only ──
// A screenshot tool's frame interval is whatever the tool's latency happens
// to be, which aliases badly against a 4-5Hz wingbeat and makes a filmstrip
// useless for judging the stroke. This pauses the clock and advances the sim
// by an EXACT dt so a strip of frames is evenly spaced in sim time.
window.__step = (dt) => {
  paused = true
  panels.forEach((p) => p.update(dt))
}
window.__panels = panels

Promise.all(panels.map((p) => p.load())).then(() => {
  window.__compareReady = true
  loop()
})
