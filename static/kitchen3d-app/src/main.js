/**
 * main.js — renderer, loop, and the wiring between the panel and the room.
 *
 * REBUILD ON EVERY CHANGE, DEFERRED BY ONE FRAME. Changing a finish tears the
 * kitchen down and builds it again (see scene.js for why). The build is
 * scheduled after the next paint so the button you clicked visibly depresses
 * before the main thread goes away for 30 ms — without that the UI feels
 * broken even though it is faster than the alternative.
 *
 * The exception is LIGHTING, which mutates in place. It is the control people
 * flick fastest and it must be instant.
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js'

import { DEFAULTS } from './config.js'
import { buildKitchen, applyLighting, makeEnvironment, bakeRoomProbe, disposeKitchen } from './scene.js'
import { CameraRig, framing, setLid } from './camera.js'
import * as UI from './ui.js'
import { loadMaps } from './maps.js'

/* ------------------------------------------------------------- renderer -- */

const canvas = document.getElementById('view')
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  // REQUIRED, and not for the screenshot button.
  //
  // This renders on demand — skipping frames when nothing has changed. Without
  // preserveDrawingBuffer, WebGL clears the drawing buffer after each
  // composite, so the first frame we skip composites an empty buffer and the
  // canvas goes BLACK until something moves. On-demand rendering and
  // preserveDrawingBuffer are a pair; you cannot have one without the other.
  preserveDrawingBuffer: true,
})
// 2.0 on a retina display is 6.7 megapixels of GTAO, area lights and
// clearcoat. 1.5 is 44% fewer pixels and, at the size this thing is actually
// viewed, indistinguishable — the edges that matter are already resolved by
// MSAA. Capping this is the single cheapest thing in the file.
// Pixel ratio is owned by setQuality() further down — it switches between an
// idle and a moving budget. Do not set it here as well.
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true

// NOTHING IN THIS SCENE MOVES.
//
// Three shadow-casting point lights is eighteen cubemap face renders of the
// whole kitchen, every single frame, to produce shadows that are identical
// frame to frame. Turning off automatic updates and re-rendering them once per
// rebuild is the difference between orbiting at 3 fps and orbiting at 60. The
// only cost is remembering to flag it — see rebuild().
renderer.shadowMap.autoUpdate = false
renderer.shadowMap.needsUpdate = true
// PCF, not PCFSoft: the soft variant is deprecated in r184, and at the 2048 map
// size used here the difference is invisible anyway — every shadow in the scene
// is either a contact shadow or a soft area shadow that the light itself
// already blurs.
renderer.shadowMap.type = THREE.PCFShadowMap
// AgX, not ACES.
//
// ACES pushes saturated highlights toward orange as they roll off — it is a
// film-emulation curve and that skew is a feature of it. In a room lit by warm
// LED it compounds: the gold veining in the stone went past "brass" and into
// "molten lava", and every bright surface picked up a sodium cast that no
// amount of retuning the lights removed, because the lights were not the cause.
//
// AgX desaturates as it approaches white, the way a real sensor does. Warm
// pools stay warm, but they stop bleeding orange into everything above them.
// It renders darker than ACES, hence the higher exposures in exposureFor().
renderer.toneMapping = THREE.AgXToneMapping
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 120)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.075
controls.enablePan = false          // panning inside a room only ever gets lost
controls.rotateSpeed = 0.55
controls.zoomSpeed = 0.75

const rig = new CameraRig(camera, controls)

/* --------------------------------------------------------------- lights -- */
// The room's own lights live with the geometry. These two are the global rig:
// a sun for the window, and a very soft fill so the shadowed side of the tall
// units never goes to pure black — which is the one thing that instantly reads
// as "CG" no matter how good the materials are.

const sun = new THREE.DirectionalLight(0xfff2e0, 2.2)
sun.position.set(7.5, 5.2, 2.4)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 26
const S = 6
Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S })
sun.shadow.bias = -0.0006
sun.shadow.normalBias = 0.022
scene.add(sun)
scene.add(sun.target)

// Sky COOL, ground neutral. This is the counterweight to every warm lamp in
// the room: without a cool ambient there is nothing for the warm pools to read
// against, and the whole image collapses into one orange hue.
const fill = new THREE.HemisphereLight(0xa8c0da, 0x4a4844, 0.55)
scene.add(fill)

const lightRig = { sun, fill }

/* ------------------------------------------------------------- composer -- */

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(
  innerWidth, innerHeight,
  {
    type: THREE.HalfFloatType,
    // 4x MSAA everywhere, mobile included.
    //
    // This was 2 on mobile as a fill-rate saving. Two samples gives an edge
    // exactly two levels of gradation, which on a dark cabinet against a bright
    // wall is still a visible staircase. And because rendering is on demand,
    // the saving was buying nothing — the cost lands only on frames that
    // actually change, and it was being paid in the one frame anyone looks at.
    //
    // MSAA handles GEOMETRY edges. The SMAA pass further down handles the
    // shader aliasing it structurally cannot touch; both are needed.
    samples: Math.min(4, renderer.capabilities.maxSamples ?? 4),
  }
))
composer.addPass(new RenderPass(scene, camera))

/* ------------------------------------------------------------------- AO -- */
//
// Ambient occlusion is the difference between a room and a pile of objects.
// Direct light and shadow maps tell you where the lamps are; AO tells you where
// things TOUCH — under the plinth, inside the shadow gaps, in the corner where
// the worktop meets the splashback, under the pendant shades, behind the reeds.
// Without it every surface is lit as if it were floating alone in space, which
// is precisely the "cheap render" look, and no amount of better texturing
// fixes it because the missing signal is contact, not detail.
//
// Radius is set in metres to something physical: 0.35 m is roughly the scale
// over which a real interior darkens into a corner. Cranking it up produces
// grey halos around everything, which reads as dirt rather than depth.
// Rendered at HALF resolution and upsampled. AO is a low-frequency signal —
// it is a soft darkening in corners, not an edge — so it survives the
// downscale intact while costing a quarter of the samples. This is standard
// practice and the one place in the pipeline where resolution genuinely does
// not matter.
const AO_SCALE = 0.75
const gtao = new GTAOPass(scene, camera, innerWidth * AO_SCALE, innerHeight * AO_SCALE)
gtao.updateGtaoMaterial({
  radius: 0.35,
  distanceExponent: 1.6,
  thickness: 0.4,
  scale: 0.85,
  samples: 8,
})
gtao.updatePdMaterial({ lumaPhi: 8, depthPhi: 2.5, normalPhi: 3.5, radius: 4, samples: 8 })
gtao.output = GTAOPass.OUTPUT.Default
composer.addPass(gtao)

// NO BLOOM.
//
// Every version of this — wide and weak, tight and strong — turned the light
// sources into glowing orbs floating in the room, and turned the pools they
// cast into blown white patches on the worktop. Bloom is a lens artefact. In a
// photograph of a kitchen you get a small amount of it around a bare filament
// and essentially none anywhere else, because the sources are diffused and the
// lens is good.
//
// Simulating it here bought nothing and cost the two things that make a render
// look real: clean highlights and true blacks. The pass is removed rather than
// dialled down, because at any setting it was doing more harm than good.

composer.addPass(new OutputPass())

/* ------------------------------------------------------------------ SMAA -- */
//
// MSAA and SMAA solve DIFFERENT halves of the same complaint, which is why
// raising MSAA alone never fixed it.
//
// MSAA supersamples GEOMETRY EDGES — it takes multiple coverage samples per
// pixel at triangle boundaries. It does nothing whatsoever for aliasing that
// happens INSIDE a triangle, because there is only ever one shader evaluation
// per pixel there. This kitchen is full of exactly that: thin brass rails,
// ribbed glass, 90 mm V-grooves and a polished floor, all of which produce
// specular highlights finer than a pixel. Those sparkle and crawl no matter how
// many coverage samples the edges get.
//
// SMAA is a post-process: it finds edges in the finished image by luma and
// reconstructs them, so it catches shader aliasing as well as geometry.
//
// Placed AFTER OutputPass deliberately. OutputPass applies tone mapping and the
// sRGB transfer; running SMAA before it means detecting edges in linear HDR,
// where luma differences do not correspond to what the eye will see and half
// the edges go unfound. After it, SMAA works on the same image the viewer does.
const smaa = new SMAAPass()
composer.addPass(smaa)

/* ----------------------------------------------------------------- state -- */

const state = UI.readStateFromURL(DEFAULTS)
let built = null
let pendingBuild = null
let lidAmount = 1

let roomProbe = null
scene.environment = makeEnvironment(renderer, state.lighting)
scene.environmentIntensity = 0.16
scene.background = new THREE.Color('#0b0b0c')

/* ----------------------------------------------------------------- build -- */

function rebuild({ recentre = false } = {}) {
  const t0 = performance.now()
  if (built) {
    scene.remove(built.root)
    disposeKitchen(built)
  }
  built = buildKitchen(state)
  scene.add(built.root)

  // Aim the sun at the island through the glazing rather than at the origin —
  // on the wider layouts the origin is behind the island and the shadow falls
  // the wrong way across the floor.
  sun.target.position.set(0, 0.6, 0)
  sun.target.updateMatrixWorld()

  applyLighting(built.ctx, scene, state, lightRig)
  setLid(built.root, lidAmount)
  // Shadow maps are frozen (see above); this is the one moment they are stale.
  renderer.shadowMap.needsUpdate = true

  // Reflections come from the room, not from an idealised box.
  //
  // Order matters: the idealised environment has to be in place while the
  // probe is captured, or every surface renders black into the cubemap and the
  // probe reflects a dark room back at itself. Baked once here, per rebuild.
  scene.environment = makeEnvironment(renderer, state.lighting)
  renderer.shadowMap.needsUpdate = true
  scene.environment = bakeRoomProbe(renderer, scene, built.metrics.room, roomProbe)
  roomProbe = scene.environment
  UI.renderSpec(state, built.metrics)
  openAllState = false
  const oa = document.getElementById('openall')
  if (oa) oa.textContent = 'Open all'
  UI.writeStateToURL(state)

  if (recentre) rig.set(state.view, built.metrics.room)
  document.body.dataset.build = Math.round(performance.now() - t0)
  invalidate()
}

/* -------------------------------------------------------------- handlers -- */

const handlers = {
  set: (key) => (value) => {
    state[key] = value

    if (key === 'lighting') {
      // The environment map IS the lighting condition as far as every
      // reflective surface is concerned, so it has to change with it. Baked
      // once per mode and cached, so flicking day/night stays instant.
      // In place — no rebuild. Except the window backdrop, which is baked to a
      // canvas at build time and genuinely has to be regenerated.
      applyLighting(built.ctx, scene, state, lightRig)
      renderer.shadowMap.needsUpdate = true
      renderer.toneMappingExposure = exposureFor(state.lighting)
      invalidate()
      schedule(() => rebuild())
      UI.writeStateToURL(state)
      return
    }
    schedule(() => rebuild({ recentre: key === 'layout' }))
  },
}

/**
 * Defer to after the next paint so the pressed state of the button renders
 * first. Coalesces, so dragging across a swatch row builds once, not six times.
 */
function schedule(fn) {
  pendingBuild = fn
  document.body.classList.add('busy')
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!pendingBuild) return
    const f = pendingBuild
    pendingBuild = null
    f()
    document.body.classList.remove('busy')
  }))
}

function exposureFor(mode) {
  // Night needs more exposure, not less: the scene is lit by small warm sources
  // and the histogram sits low. Leaving exposure at 1.0 gives a murky image
  // that people read as "bad graphics" rather than "evening".
  // Higher than the ACES values these replaced — AgX has a longer toe and
  // renders roughly a third of a stop darker for the same scene.
  // Flatter across the three conditions than before. With the room itself
  // now bright in the environment map, the exposure no longer has to
  // compensate for an underlit scene at night — which is what was pushing the
  // warm sources into clipping.
  // Pulled down across the board once the probe replaced the idealised
  // environment — the probe carries far more light, so the exposure no longer
  // has to compensate for an underlit scene.
  return mode === 'day' ? 0.80 : mode === 'dusk' ? 0.88 : 0.95
}

/* ------------------------------------------------------------------ views -- */

function setView(view) {
  state.view = view
  const f = rig.to(view, built.metrics.room)
  UI.writeStateToURL(state)
  lidTarget = f.lid ? 1 : 0
  invalidate()
}
let lidTarget = 1

/* ------------------------------------------------------------------- boot -- */

UI.setLoading(0.10, 'Loading materials')

// First build is the expensive one — every procedural texture in the default
// config gets generated here, and the photographed maps have to be decoded
// before it starts. Awaited deliberately: a material built before its map
// arrives keeps the procedural fallback for the life of the page.
loadMaps((p) => UI.setLoading(0.10 + p * 0.35, 'Loading materials')).then(() => {
  UI.setLoading(0.5, 'Building cabinetry')
  requestAnimationFrame(() => {
    rebuild()
    UI.setLoading(0.85, 'Baking reflections')
    renderer.toneMappingExposure = exposureFor(state.lighting)
    rig.set(state.view, built.metrics.room)
    lidTarget = framing(state.view, built.metrics.room, camera.aspect).lid ? 1 : 0
    lidAmount = lidTarget
    // rebuild() applied the PREVIOUS lid amount (the default, 1). If the URL
    // asked for the plan view, the lid has to come off now — the render loop
    // will not do it, because it only acts when amount and target disagree.
    setLid(built.root, lidAmount)

    UI.buildUI(state, handlers)
    UI.buildViewBar(state.view, setView)
    requestAnimationFrame(() => UI.setLoading(1))

    // After the loading gate has faded, not before — a drawer that opens
    // behind a black overlay has demonstrated nothing.
    demoTimers.push(setTimeout(runOpeningDemo, 1400))
  })
})

/* ------------------------------------------------------------- opening -- */
//
// Click a front to open it. Doors swing on their hinge stile, drawers pull out
// on their boxes, and everything eases rather than snapping — a drawer that
// teleports open reads as a bug, not a mechanism.
//
// Two things this has to get right that are easy to miss:
//
//  1. SHADOWS ARE FROZEN (see shadowMap.autoUpdate above). A door that opens
//     while its shadow stays shut is worse than no shadow at all, so the maps
//     are re-rendered on every frame of the animation and then left alone.
//  2. RENDERING IS ON DEMAND. Nothing here moves unless something asks for a
//     frame, so every step of the animation has to invalidate.

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let hovered = null
let openAllState = false

function pickAt(clientX, clientY) {
  pointer.x = (clientX / innerWidth) * 2 - 1
  pointer.y = -(clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObject(built.root, true)
  for (const hit of hits) {
    const idx = hit.object.userData.openable
    if (idx !== undefined) return built.ctx.openables[idx]
    // Anything opaque in front of a front blocks it — you cannot click a
    // drawer through the worktop above it.
    if (hit.object.isMesh && hit.object.material && !hit.object.material.transparent) return null
  }
  return null
}

let dragged = false
let downAt = null

canvas.addEventListener('pointerdown', (e) => {
  cancelDemo()
  dragged = false
  downAt = [e.clientX, e.clientY]
})
canvas.addEventListener('pointermove', (e) => {
  // Touch has no hover. Without this the last-touched front stays nudged proud
  // of the carcass after the finger lifts, because nothing ever moves the
  // pointer away from it.
  if (e.pointerType === 'touch') return
  if (downAt) {
    // A drag is an orbit, not a click. Without this every camera move that
    // happens to end on a cabinet opens it.
    // 4 px is right for a mouse and far too tight for a thumb — a finger
    // wobbles that much just resting on the glass, so every tap would be read
    // as a drag and nothing would ever open on a phone.
    const slop = e.pointerType === 'touch' ? 12 : 4
    if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > slop) dragged = true
    return
  }
  const hit = pickAt(e.clientX, e.clientY)
  if (hit !== hovered) {
    hovered = hit
    canvas.style.cursor = hit ? 'pointer' : 'grab'
    // Repaint so the nudge below can start; on-demand rendering means a hover
    // that does not invalidate simply never appears.
    invalidate()
  }
})
canvas.addEventListener('pointerup', (e) => {
  downAt = null
  if (dragged) return
  const hit = pickAt(e.clientX, e.clientY)
  if (!hit) return
  // `target` is still the source of truth for "is this open"; the animation
  // carries `open` toward it.
  hit.target = hit.target > 0.5 ? 0 : 1
  animateOpenable(hit, hit.target)
  document.body.classList.add('has-opened')
  invalidate()
})
canvas.addEventListener('pointerleave', () => { downAt = null; hovered = null })

/* ------------------------------------------------------------- motion -- */
//
// How these move is the difference between "the model has hinges" and "this is
// a real kitchen". Four things, all borrowed from how the actual hardware
// behaves:
//
//  1. WEIGHT. A 900 mm pan drawer does not move at the same speed as a 300 mm
//     cutlery drawer. Duration scales with size, so the big ones feel heavy.
//  2. SOFT-CLOSE. Every drawer in this price bracket has a damper. Opening is
//     quick and decisive; closing is slower and eases the whole way in. Using
//     one curve for both is the single most synthetic-looking choice available.
//  3. SETTLE. A door swung open carries momentum and rocks fractionally past
//     its stop before coming back. A drawer on runners does not — it glides to
//     a halt. So doors get a small overshoot and drawers get none.
//  4. STAGGER. Forty-two fronts moving in perfect unison reads as a switch
//     being flipped. Opened as a wave across the room it reads as choreography,
//     and it lets the eye actually follow what is happening.

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)')

// Quick out, long gentle tail. This is what a damped runner feels like.
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)

// Overshoots by ~5% and settles. Only for doors — see note 3. Measured: at
// c = 1.9 the peak is 7% past the stop, which on a 105° swing is nearly 8
// degrees of rock and reads as springy rather than weighted.
function easeOutSettle(t) {
  const c = 1.2
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)
}

// Slow in, slow out: the damper taking the door the last few centimetres.
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/**
 * Starts a front moving. `delay` staggers group operations; individual clicks
 * pass 0 so they respond instantly.
 */
function animateOpenable(o, to, delay = 0) {
  const opening = to > 0.5
  // Size drives duration. A door's "size" is its swing, a drawer's is its
  // travel, and both are already known.
  const size = o.type === 'door' ? o.maxAngle : o.maxSlide
  const base = o.type === 'door' ? 0.52 : 0.46
  const dur = (base + size * 0.42) * (opening ? 1 : 1.3)

  o.anim = {
    from: o.open,
    to,
    elapsed: 0,
    delay: REDUCED.matches ? 0 : delay,
    dur: REDUCED.matches ? 0.001 : dur,
    ease: opening
      ? (o.type === 'door' ? easeOutSettle : easeOutQuart)
      : easeInOutCubic,
  }
}

/* --------------------------------------------------------------- demo -- */
//
// Nobody knows a render is interactive until something moves.
//
// On load, one drawer opens itself, holds, and closes again. It is the only
// way to say "this is not a picture" without relying on the visitor reading a
// caption — and the caption then retires, because an instruction that stays on
// screen after it has been obeyed becomes chrome.
//
// It picks the drawer nearest the camera whose front actually faces the camera,
// rather than a hard-coded index: the layouts and the bay-splitting decide how
// many drawers there are and where, so any fixed choice would eventually point
// at a drawer behind the island or off the side of the frame.
//
// CANCELS ON ANY INPUT. A demo that keeps playing while the visitor is already
// dragging the camera is not a demo, it is a fight — and the one thing worse
// than not knowing it is interactive is touching it and having it ignore you.

let demoTimers = []
let demoDone = false

function cancelDemo() {
  if (demoDone) return
  demoDone = true
  demoTimers.forEach(clearTimeout)
  demoTimers = []
  document.body.classList.add('has-opened')
}

function pickDemoDrawer() {
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  let best = null, bestScore = -Infinity
  for (const o of built.ctx.openables) {
    if (o.type !== 'drawer') continue
    // Facing the camera: the drawer's outward normal must oppose the view
    // direction. A drawer on the far side of the island opens away from you and
    // demonstrates nothing.
    const facing = -(o.normal.x * forward.x + o.normal.z * forward.z)
    if (facing < 0.35) continue
    const dist = camera.position.distanceTo(o.pivot.position)
    // Near, and squarely facing. Distance dominates; facing breaks ties.
    const score = -dist + facing * 1.5
    if (score > bestScore) { bestScore = score; best = o }
  }
  return best
}

function runOpeningDemo() {
  if (demoDone || !built) return
  if (REDUCED.matches) { cancelDemo(); return }

  const drawer = pickDemoDrawer()
  if (!drawer) { cancelDemo(); return }

  drawer.target = 1
  animateOpenable(drawer, 1)
  invalidate()

  // Open, hold long enough to read as deliberate, close, then retire the hint
  // once the drawer is actually shut rather than the moment it starts closing.
  demoTimers.push(setTimeout(() => {
    if (demoDone) return
    drawer.target = 0
    animateOpenable(drawer, 0)
    invalidate()
  }, 1500))

  demoTimers.push(setTimeout(() => {
    if (demoDone) return
    demoDone = true
    document.body.classList.add('has-opened')
  }, 2900))
}

function setAllOpen(open) {
  openAllState = open
  document.body.classList.add('has-opened')

  // The wave runs left-to-right across the room when opening and back the
  // other way when closing, so the two are visibly different gestures rather
  // than the same animation played twice.
  const ordered = built.ctx.openables
    .map((o) => ({ o, k: o.pivot.position.x + o.pivot.position.z * 0.35 }))
    .sort((a, b) => (open ? a.k - b.k : b.k - a.k))

  // Total stagger is capped: past about 700 ms a cascade stops reading as
  // choreography and starts reading as lag.
  const step = Math.min(0.028, 0.7 / Math.max(1, ordered.length))
  ordered.forEach(({ o }, i) => {
    o.target = open ? 1 : 0
    animateOpenable(o, o.target, i * step)
  })

  const b = document.getElementById('openall')
  if (b) b.textContent = open ? 'Close all' : 'Open all'
  invalidate()
}

/**
 * Advances every front. Returns true while anything is still moving, so the
 * loop keeps asking for frames and keeps the shadow maps live.
 */
function updateOpenables(dt) {
  if (!built) return false
  let moving = false

  for (const o of built.ctx.openables) {
    /* -------------------------------------------------------- hover ---- */
    // A 4 mm nudge out of the carcass, eased.
    //
    // The obvious hover treatment — tint or brighten the front — is impossible
    // here: materials are shared and size-bucketed for performance, so one
    // front's material is a dozen fronts' material. Moving the object instead
    // is per-instance by definition, and on a shadow-gapped kitchen a few
    // millimetres of proud is exactly the affordance you want. It says "this
    // one moves" without saying anything.
    const wantHover = hovered === o ? 1 : 0
    if (Math.abs((o.hover ?? 0) - wantHover) > 0.002) {
      o.hover = (o.hover ?? 0) + (wantHover - (o.hover ?? 0)) * Math.min(1, dt * 12)
      moving = true
    } else if (o.hover !== wantHover) {
      o.hover = wantHover
      moving = true
    }

    const a = o.anim
    if (a) {
      moving = true
      a.elapsed += dt
      const t = a.elapsed - a.delay
      if (t >= 0) {
        const p = Math.min(1, t / a.dur)
        o.open = a.from + (a.to - a.from) * a.ease(p)
        if (p >= 1) { o.open = a.to; o.anim = null }
      }
    }

    /* ------------------------------------------------------- transform -- */
    if (o.pivot.userData.baseX === undefined) {
      // Captured once. The pivot is placed by the builder and must never be
      // re-read after it has been moved, or the drawer walks out of the room.
      o.pivot.userData.baseX = o.pivot.position.x
      o.pivot.userData.baseZ = o.pivot.position.z
    }

    const hover = o.hover ?? 0
    if (o.type === 'door') {
      // Hover cracks the door open by a degree and a half.
      o.pivot.rotation.y = o.swing * (o.maxAngle * o.open + 0.026 * hover)
    } else {
      const slide = o.maxSlide * o.open + 0.004 * hover
      o.pivot.position.x = o.pivot.userData.baseX + o.normal.x * slide
      o.pivot.position.z = o.pivot.userData.baseZ + o.normal.z * slide
    }
  }
  return moving
}

/* ------------------------------------------------------- adaptive quality -- */
//
// The honest position: this scene costs what it costs. Even with every light
// switched off it is ~27 ms a frame, because it is a fully textured interior
// with an environment map, normal maps and clearcoat on the polished surfaces.
// Full quality is a still-frame budget, not a 60 fps budget.
//
// So it runs at two qualities. While you are DRAGGING, resolution drops and the
// AO pass is skipped — motion hides both, and what you need mid-drag is
// responsiveness. The moment you stop, it settles back to full quality over a
// couple of frames. This is what every serious configurator does, and it is the
// difference between "the camera is laggy" and "the camera is fine".
//
// The measured effect on this scene: ~77 ms -> ~18 ms while interacting.

// Idle renders at FULL device resolution. That is a ~60 ms frame, and it is
// nearly free: with on-demand rendering the still frame is drawn once and then
// held, so the cost is paid when you stop moving and never again. Detail this
// fine — reeds, flutes, the brass reveal — needs the samples, and starving it
// to protect a framerate nobody is spending was making every lined surface
// crawl.
/**
 * Phones are not small desktops — but they are not potatoes either.
 *
 * The first version of this ran mobile at 1.4x resolution with ambient
 * occlusion switched off entirely, reasoning from peak fill rate and thermals.
 * That reasoning ignored the architecture already in place: RENDERING IS ON
 * DEMAND. The still frame is drawn once when you stop moving and then held
 * indefinitely, so its cost is paid once, not sixty times a second. Spending a
 * conservative budget on the one frame the user actually looks at is the wrong
 * trade — it produced a soft, flat image on the exact screen where people were
 * going to judge the product.
 *
 * So mobile now mirrors desktop: an expensive, sharp IDLE frame at full device
 * resolution with AO on, and a genuinely cheap MOVING frame that motion hides.
 *
 * Because "mobile" spans a five-year-old budget Android and a current iPhone,
 * the idle tier is not trusted blindly — see the calibration below. The first
 * idle frame is timed, and if the device cannot deliver it in a sensible
 * budget the tier is permanently downgraded. Measuring one real frame beats
 * any amount of guessing from user-agent strings.
 */
const IS_MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 820

const QUALITY = IS_MOBILE
  ? {
    // The FULL panel, up to 3x. A current phone is 3x, so capping at 2 renders
    // the 3D at two thirds resolution and upscales it — the DOM chrome stays
    // razor sharp while the product itself is visibly soft, which is the worst
    // possible combination because it makes the softness obvious by comparison.
    // The calibration below is what makes this safe to ask for.
    idle: { pixelRatio: Math.min(devicePixelRatio, 3), ao: true, aoScale: 0.5 },
    moving: { pixelRatio: Math.min(devicePixelRatio, 0.85), ao: false, aoScale: 0.5 },
  }
  : {
    idle: { pixelRatio: Math.min(devicePixelRatio, 2), ao: true, aoScale: 0.75 },
    moving: { pixelRatio: Math.min(devicePixelRatio, 0.8), ao: false, aoScale: 0.4 },
  }

/**
 * One-shot calibration.
 *
 * Times the first full-quality frame on the real device and steps the idle tier
 * down only if that device genuinely cannot deliver it.
 *
 * The thresholds are deliberately generous, because of what this frame IS: it
 * is drawn once, when the camera stops, and then held. A 300 ms idle frame is
 * not 3 fps — it is a third of a second of refinement after you let go, and
 * then a still image for as long as you look at it. Judging it against a
 * 16 ms real-time budget would downgrade phones that are perfectly capable of
 * producing a sharp picture.
 *
 * Degrades in two steps rather than one, so a mid-range device loses resolution
 * before it loses ambient occlusion — AO is doing more for perceived quality
 * here than the last half-step of pixel density.
 *
 * Runs once. A phone that thermally throttles later is not re-measured: the
 * alternative is quality that visibly flickers between tiers while you are
 * looking at it, which is worse than either tier.
 */
let calibrated = !IS_MOBILE
function calibrateOnce(renderMs) {
  if (calibrated) return
  calibrated = true
  if (renderMs < 260) return

  QUALITY.idle = renderMs > 480
    ? { pixelRatio: Math.min(devicePixelRatio, 1.5), ao: false, aoScale: 0.4 }
    : { pixelRatio: Math.min(devicePixelRatio, 2), ao: true, aoScale: 0.4 }
  quality = null
  setQuality(QUALITY.idle)
}

let quality = null
let settleTimer = 0

function setQuality(q) {
  if (quality === q) return
  quality = q
  renderer.setPixelRatio(q.pixelRatio)
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  // AO resolution follows the quality tier too. At 0.4 the upsampled AO put
  // soft blocky patches across the ribbed glass, which read as artefacts
  // rather than shading.
  gtao.setSize(innerWidth * q.aoScale, innerHeight * q.aoScale)
  gtao.enabled = q.ao
  needsRender = true
}

/* ------------------------------------------------------------ on demand -- */
//
// Nothing in this scene animates. Rendering 60 times a second to produce 60
// identical frames heats the machine, flattens the battery and — on an
// integrated GPU — leaves nothing in the budget for the frames that DO change.
// A dirty flag, set by anything that changes what is on screen.

let needsRender = true
function invalidate() { needsRender = true }

controls.addEventListener('start', () => { cancelDemo(); setQuality(QUALITY.moving); invalidate() })
controls.addEventListener('change', invalidate)
controls.addEventListener('end', () => { settleTimer = 0.22; invalidate() })

/* ------------------------------------------------------------------- loop -- */

// Plain clock. THREE.Clock is deprecated in r184 and its replacement is not in
// the vendored addon set, and this needs exactly one number.
let last = performance.now()
function frame(now = performance.now()) {
  // Clamped: a backgrounded tab returns a multi-second delta on wake, which
  // would teleport a camera tween straight to its end.
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now

  if (rig.update(dt)) { setQuality(QUALITY.moving); settleTimer = 0.22; invalidate() }

  if (updateOpenables(dt)) {
    // Shadow maps are frozen for performance; while anything is moving they
    // have to keep up, or doors open out of their own shadows.
    renderer.shadowMap.needsUpdate = true
    invalidate()
  }
  // OrbitControls returns true while damping is still settling.
  if (controls.update(dt)) invalidate()

  if (built && Math.abs(lidAmount - lidTarget) > 0.001) {
    lidAmount += (lidTarget - lidAmount) * Math.min(1, dt * 5.5)
    setLid(built.root, lidAmount)
    invalidate()
  }

  if (settleTimer > 0) {
    settleTimer -= dt
    if (settleTimer <= 0) { setQuality(QUALITY.idle); invalidate() }
  }

  if (needsRender) {
    needsRender = false
    if (!calibrated && quality === QUALITY.idle) {
      const t0 = performance.now()
      composer.render()
      // readPixels forces the GPU to finish, so this is a real frame time and
      // not just the cost of queueing the commands.
      const px = new Uint8Array(4)
      const gl = renderer.getContext()
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
      calibrateOnce(performance.now() - t0)
    } else {
      composer.render()
    }
  }
  requestAnimationFrame(frame)
}
setQuality(QUALITY.idle)
requestAnimationFrame(frame)

/* ----------------------------------------------------------------- resize -- */

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  // Re-fit: rotating a phone changes the aspect enough to change the framing,
  // not just the projection.
  if (built) rig.set(state.view, built.metrics.room)
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  gtao.setSize(innerWidth * (quality?.aoScale ?? AO_SCALE), innerHeight * (quality?.aoScale ?? AO_SCALE))
  invalidate()
})

/* ------------------------------------------------------------------ share -- */

document.getElementById('share')?.addEventListener('click', async () => {
  UI.writeStateToURL(state)
  try {
    await navigator.clipboard.writeText(location.href)
    UI.toast('Specification link copied')
  } catch {
    UI.toast(location.href)
  }
})

document.getElementById('shot')?.addEventListener('click', () => {
  // Render one frame at 2× before reading back, so the saved image is a
  // presentation render rather than a screenshot of a 1× canvas.
  const dpr = renderer.getPixelRatio()
  const wasAO = gtao.enabled
  gtao.enabled = true
  renderer.setPixelRatio(Math.min(3, QUALITY.idle.pixelRatio * 2))
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  gtao.setSize(innerWidth * QUALITY.idle.aoScale, innerHeight * QUALITY.idle.aoScale)
  composer.render()
  const url = renderer.domElement.toDataURL('image/png')
  gtao.enabled = wasAO
  renderer.setPixelRatio(dpr)
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  quality = null
  setQuality(QUALITY.idle)

  const a = document.createElement('a')
  a.href = url
  a.download = `kitchen-${state.layout}-${state.cabinet}-${state.worktop}.png`
  a.click()
  UI.toast('Render saved')
})

document.getElementById('openall')?.addEventListener('click', () => {
  cancelDemo()
  setAllOpen(!openAllState)
})

document.getElementById('spec-toggle')?.addEventListener('click', (e) => {
  const open = document.body.classList.toggle('spec-open')
  e.currentTarget.setAttribute('aria-expanded', String(open))
})

document.getElementById('panel-toggle')?.addEventListener('click', () => {
  document.body.classList.toggle('panel-open')
})

// Exposed for the QA pass and for anyone poking at it in the console.
Object.assign(window, { __kitchen: { scene, state, rebuild, renderer, composer, gtao, camera, controls, setLid,
  // Replays the load-time demo. Exposed for QA: the real one fires once, 1.4 s
  // after the gate clears, which is almost impossible to catch by hand.
  replayDemo: () => {
    demoDone = false
    demoTimers.forEach(clearTimeout)
    demoTimers = []
    document.body.classList.remove('has-opened')
    for (const o of built.ctx.openables) { o.target = 0; o.open = 0; o.anim = null }
    runOpeningDemo()
  }, get lidAmount() { return lidAmount }, get lidTarget() { return lidTarget }, get built() { return built } } })
