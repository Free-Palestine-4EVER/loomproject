// SofaModel — the payoff for THE FIELD: the real blue-sofa GLB, genuinely
// rendered, genuinely turning, draggable. This file is the SECOND WebGL
// context on the page (the first is the hero/companion butterfly's, see
// $three/Companion.js). Everything below exists to make that second context
// cheap to open, cheap to leave running, and — this is the part a normal
// three.js mount does not bother with — cheap to CLOSE and reopen as the
// section crosses the viewport edge, because $three/glContext.js documents a
// measured iOS Safari cap on live contexts per tab: past it, the browser
// silently drops the OLDEST context or kills the tab outright. V3.svelte
// already runs a hand-rolled Canvas2D field for the same reason (a SECOND
// three.js layer was ruled out for the field itself) — this module is the
// one deliberate exception, because "the real model, really rendered" is not
// buildable in Canvas2D at any vertex-shading quality worth showing.
//
// NOT A CLASS THAT OWNS ITS OWN rAF LOOP. Companion.js owns its own loop
// because it is the only WebGL thing on the page at any given scroll
// position. This module is not: V3.svelte's field already runs one rAF for
// the wireframe canvas, and running a second, independently-scheduled loop
// for this canvas would be two loops racing the same frame budget for no
// reason — both are vsync-locked, so nothing is gained and the failure mode
// (field and model drifting out of phase, or a moment where svelte pauses
// one loop's host component before the other tears down) is the exact "field
// canvas loop and a separate WebGL loop fighting" the brief calls out by
// name. So SofaModel exposes `renderFrame(t)` and the CALLER — V3's own
// `frame(t)` — drives it, on the same tick, from the same requestAnimationFrame
// id. One rAF, two canvases, two draw calls in it.
//
// THE GLTF IS FETCHED AND PARSED AT MOST ONCE PER PAGE LOAD. Scrolling the
// section off-screen and back releases the RENDERER (the iOS-capped, GPU-side
// resource) but keeps the already-parsed THREE.Group in memory — it is a few
// hundred KB of typed arrays, not a capped resource, and re-fetching +
// re-parsing the GLB every time a reader scrolls past the section once more
// would turn "release on exit" into "re-pay the network+CPU cost on every
// re-entry," which is not what the budget rule is asking for. Module-scope
// cache, shared by every SofaModel instance the page ever constructs.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { releaseRenderer } from '$three/glContext.js'

// ——— NO DRACO, AND THAT IS THE WHOLE OPTIMISATION ———
//
// The file as downloaded from its source shipped Draco-compressed, which
// forced a DRACOLoader here plus 251 KB of self-hosted decoder (wasm + its JS
// wrapper) under static/draco/. Inspecting the asset showed why that was a bad
// trade: THE MESH IS 2,941 VERTICES. Draco was compressing something that
// barely needed compressing, and charging a quarter of a megabyte of decoder
// to read it. The 410 KB was never the mesh — 349 KB of it was a 1024² normal
// map, on a sofa that renders about 400 px wide.
//
// So the asset was re-authored offline instead (gltf-transform): Draco
// stripped, textures resized to 512², mesh quantized via KHR_mesh_quantization
// — which GLTFLoader reads natively with NO decoder at all. Result: 410 KB +
// 251 KB of decoder became 155 KB and nothing else. Same sofa, ~77% less.
//
// IF YOU EVER REPLACE THIS MODEL: check `gltf-transform inspect` before
// reaching for compression. On a mesh this small, Draco costs far more than it
// saves, and re-adding it here means re-adding static/draco/ too.
let gltfPromise = null
function loadSofaGLTF() {
  if (!gltfPromise) {
    gltfPromise = new GLTFLoader().loadAsync('/models/blue-sofa.glb')
  }
  return gltfPromise
}

const TAU = Math.PI * 2

export class SofaModel {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = null // only exists between acquire() and release()
    this.ready = false
    this.disposed = false

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
    this.camera.position.set(0, 0.35, 3.4)
    this.camera.lookAt(0, 0, 0) // the model is centred at the origin (see load()); without this the camera keeps its default -Z-from-wherever-it-sits orientation, which points level with y=0.35, not at the model — small on a wide-and-flat mesh like a sofa, it reads as "shifted low in frame," not as a wrong angle, which is an easy miss in review

    // Two lights, not one — a single key light on a navy velvet surface
    // (near-zero specular, low albedo) reads as a black silhouette from any
    // angle the fill doesn't also cover, which on a DRAGGABLE model is most
    // angles a reader will actually stop on. Rim light is the cyan token, not
    // white: it is what lets the model visually belong to the field's cyan
    // wireframe palette instead of looking like a product photo pasted onto it.
    const key = new THREE.DirectionalLight(0xffffff, 2.4)
    key.position.set(2.2, 3, 2)
    const fill = new THREE.DirectionalLight(0x8fd8ee, 0.9)
    fill.position.set(-2.4, 0.6, -1.6)
    const amb = new THREE.AmbientLight(0xffffff, 0.55)
    this.scene.add(key, fill, amb)

    this.group = new THREE.Group() // holds the model, centred+scaled; rotated for drag/idle
    this.scene.add(this.group)

    // Idle auto-turn + drag state. Idle spin resumes 900ms after the reader
    // lets go, same "let the reader take over, then hand it back" shape as
    // any product-turntable interaction — never fights an active drag.
    this.yaw = 0.4
    this.pitchTilt = -0.06
    this.idleRate = TAU / 26 // one full turn per 26s — slow enough to read as "alive," not "spinning for attention"
    this.dragging = false
    this.lastDragT = -Infinity
    this._dragYawStart = 0
    this._dragXStart = 0
    // Idle spin is anchored to wall-clock t, not accumulated per-frame — same
    // rule Flyer.svelte's header states for Companion.js ("every eased value
    // uses a per-SECOND rate, never a per-frame fraction"). renderFrame()'s
    // call rate here is whatever V3's field rAF happens to run at, which is
    // usually ~60fps but is never guaranteed to be, and a `yaw += rate/60`
    // per call would silently run the turn at the wrong speed on any tick
    // rate other than exactly that. `idleAnchorT === null` means "not
    // currently idling" (dragging, or still inside the 900ms grace period);
    // it gets set the instant idling actually starts, and yaw becomes a pure
    // function of (t - idleAnchorT), so a slow frame or a release/re-acquire
    // cycle mid-spin never shows as a stutter or a snap.
    this.idleAnchorT = null
    this.idleAnchorYaw = this.yaw

    this._onPointerDown = (e) => {
      this.dragging = true
      this.idleAnchorT = null // leaving idle — re-anchored once the post-release grace period elapses
      this._dragYawStart = this.yaw
      this._dragXStart = e.clientX
      this.canvas.setPointerCapture?.(e.pointerId)
    }
    this._onPointerMove = (e) => {
      if (!this.dragging) return
      const dx = e.clientX - this._dragXStart
      this.yaw = this._dragYawStart + dx * 0.012
    }
    this._onPointerUp = () => {
      this.dragging = false
      this.lastDragT = performance.now() / 1000
    }
    canvas.style.touchAction = 'none' // dragging IS the interaction; don't let the browser also try to scroll/pinch the canvas
    canvas.addEventListener('pointerdown', this._onPointerDown)
    window.addEventListener('pointermove', this._onPointerMove)
    window.addEventListener('pointerup', this._onPointerUp)
  }

  /** Fetch+parse the GLB (once, shared) and frame it in the group. Safe to
   *  call before acquire() — building the scene graph needs no renderer. */
  async load() {
    const gltf = await loadSofaGLTF()
    if (this.disposed) return
    // clone(true): non-skinned static furniture mesh, so a plain Object3D
    // clone is correct and cheap — no SkeletonUtils needed (that machinery
    // exists for rigged characters, which this GLB is not). Materials are
    // shared by reference across clones deliberately: see dispose() for why
    // that is also why dispose() never calls material.dispose() here.
    const model = gltf.scene.clone(true)

    // Frame the model regardless of the units/pivot it shipped with — centre
    // its bounding box at the origin and scale its longest axis to a fixed
    // world size, so the camera distance chosen above works no matter what
    // the source GLB's own scale/origin conventions were.
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)
    const longest = Math.max(size.x, size.y, size.z) || 1
    const s = 1.45 / longest // leaves ~15% margin on the panel's tightest axis — the sofa's longest axis is its width, and a wide-and-low shape in a SQUARE frame (the panel is aspect-ratio:1/1) has almost no vertical margin to spare once the horizontal one is used up
    model.scale.setScalar(s)
    model.position.set(-center.x * s, -center.y * s, -center.z * s)

    this.group.add(model)
    this.ready = true
  }

  /** Open the GL context. Cheap and idempotent — the parsed model already
   *  lives in `this.group`, so re-acquiring after a release() is just "make
   *  a renderer and hand it the same scene graph again," not a reload. */
  acquire(width, height) {
    if (this.renderer || this.disposed) return
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)) // hard cap — an uncapped DPR3 phone rendering a full-scene WebGL canvas is the single easiest way to turn "decorative" into "the tab's thermal throttle"
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setSize(width, height, false) // false: canvas CSS size is owned by layout, not by three
    this.renderer = renderer
  }

  /** Close it. See the file header — this is the half of "release on exit"
   *  a normal mount/unmount three.js component never has to implement,
   *  because a normal one only ever does this once, at teardown. Here it
   *  happens every time the section leaves the viewport. */
  release() {
    if (!this.renderer) return
    releaseRenderer(this.renderer)
    this.renderer = null
  }

  resize(width, height) {
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
    if (this.renderer) this.renderer.setSize(width, height, false)
  }

  /** Called from V3's own rAF tick — see the file header for why this file
   *  does not schedule its own. `t` is seconds, same clock the field canvas
   *  already uses, so idle-spin phase is stable across a release/re-acquire
   *  cycle (it's a function of wall-clock t, not of frames-since-acquire). */
  renderFrame(t) {
    if (!this.renderer || !this.ready) return
    if (!this.dragging && t - this.lastDragT > 0.9) {
      if (this.idleAnchorT === null) { this.idleAnchorT = t; this.idleAnchorYaw = this.yaw } // idling just started (or resumed after a release/re-acquire) — anchor here, once
      this.yaw = this.idleAnchorYaw + this.idleRate * (t - this.idleAnchorT)
    }
    this.group.rotation.y = this.yaw
    this.group.rotation.x = this.pitchTilt
    this.renderer.render(this.scene, this.camera)
  }

  /** Full, final teardown — component unmount only. Releases the renderer
   *  (if still held) and drops the event listeners. Does NOT touch the GLTF
   *  cache or dispose geometries/materials: those are shared module-scope
   *  state that may still be in use by another SofaModel instance (e.g. a
   *  second mount from client-side navigation away and back), and they are
   *  a trivially small resource next to the GL context itself — the thing
   *  iOS actually caps and the thing this whole file is organised around. */
  dispose() {
    this.disposed = true
    this.release()
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    window.removeEventListener('pointermove', this._onPointerMove)
    window.removeEventListener('pointerup', this._onPointerUp)
  }
}
