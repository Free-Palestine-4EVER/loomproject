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

    // ——— THE REBUILD: THREE REPRESENTATIONS OF ONE SOFA ———
    //
    // The band this feeds is no longer "a render sitting in a room" — it is
    // the rebuild happening: the photograph is scanned, the geometry arrives
    // as loose vertices, the vertices knit into a mesh, the mesh takes its
    // material. That is not three separate models and not a video: it is the
    // SAME parsed GLB drawn three ways, crossfaded by `setBuild(p)`.
    //
    //   pointsGroup — THREE.Points over the mesh's own vertex positions
    //   wireGroup   — EdgesGeometry line segments over the same triangles
    //   the model   — the shipped materials, faded up last
    //
    // Cheap because all three share the geometry that was already parsed: no
    // second fetch, no second parse, ~2,941 vertices total (see the header
    // above for why this mesh is as small as it is).
    this.pointsGroup = new THREE.Group()
    this.wireGroup = new THREE.Group()
    this.group.add(this.pointsGroup, this.wireGroup)

    // ONE material per representation, shared across every mesh in it, so a
    // crossfade is two property writes rather than a traversal per frame.
    this.pointsMat = new THREE.PointsMaterial({
      color: 0x8fd8ee, // the site's cyan token — the same colour the band's kicker and rules use, so the scan reads as LOOM's, not as a generic sci-fi overlay
      size: 0.016,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
    this.wireMat = new THREE.LineBasicMaterial({
      color: 0x8fd8ee,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
    this.solidMats = [] // cloned per instance in load() — see the note there

    // THE SCAN PLANE. A single horizontal clipping plane that sweeps up
    // through the model: everything below it exists, everything above it has
    // not been rebuilt yet. Built-in three clipping (renderer.localClipping),
    // not a custom shader — PointsMaterial and LineBasicMaterial both honour
    // `clippingPlanes` in their own fragment shaders, which is exactly the
    // reveal this needs and none of the maintenance a hand-patched
    // onBeforeCompile would cost.
    //
    // Normal is (0,-1,0) with constant `c`, so the kept half-space is y <= c:
    // raising c reveals upward, from the sofa's feet to the top of its back.
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
    this.pointsMat.clippingPlanes = [this.clipPlane]
    this.wireMat.clippingPlanes = [this.clipPlane]
    this.yBounds = { min: -0.5, max: 0.5 } // replaced with the model's real extent in load()

    /** 0 → nothing rebuilt yet, 1 → finished solid model. The band drives
     *  this from scroll; nothing in here advances it on its own. Defaults to
     *  1 so any caller that never sets it (the /lab gallery, a reduced-motion
     *  visitor) gets the finished sofa rather than an empty frame. */
    this.build = 1

    // Idle auto-turn + drag state. Idle spin resumes 900ms after the reader
    // lets go, same "let the reader take over, then hand it back" shape as
    // any product-turntable interaction — never fights an active drag.
    // ——— THE TURN IS CHOREOGRAPHED, NOT FREE ———
    //
    // This used to be a plain turntable: one full revolution every 26s,
    // forever. On a band where the model was permanently on screen that was
    // fine. On a band where the model is the PAYOFF of a scroll sequence it
    // is not, and the first capture of the finished design showed exactly
    // why — the reader arrives at the moment the sofa is finally solid and
    // the turntable happens to be showing its BACK. A flat navy wall. The
    // one frame the whole section is built to deliver is left to chance.
    //
    // So: while the model is being rebuilt, yaw is a function of BUILD — the
    // sofa turns into its hero three-quarter angle as it materialises, which
    // also makes scroll feel like it is orbiting the object. Once built, it
    // sways gently around that angle instead of revolving past it. Every
    // angle the reader can land on is now a good one, and dragging still
    // overrides all of it (that is the interaction; this is just what the
    // object does when nobody is touching it).
    this.heroYaw = 0.42 // three-quarter view: both the curved back and the near arm read
    this.swayAmp = 0.3 // ±17°, enough to be alive, never enough to reach the back
    this.swayRate = 0.16
    this.yaw = this.heroYaw
    this.lastT = null
    this.pitchTilt = -0.06
    this.dragging = false
    this.lastDragT = -Infinity
    this._dragYawStart = 0
    this._dragXStart = 0
    // The sway is anchored to wall-clock t, not accumulated per-frame — same
    // rule Flyer.svelte's header states for Companion.js ("every eased value
    // uses a per-SECOND rate, never a per-frame fraction"). renderFrame()'s
    // call rate here is whatever the band's rAF happens to run at, which is
    // usually ~60fps but is never guaranteed to be. `idleAnchorT === null`
    // means "not currently idling" (dragging, or still inside the 900ms
    // grace period); it is set the instant idling actually starts, so a slow
    // frame or a release/re-acquire cycle never shows as a stutter or a snap.
    this.idleAnchorT = null

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
    this.model = model

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
    // 1.6, not 1.9. 1.9 was tuned to fill the frame and did — but "fill" and
    // "overflow" turned out to be the same number here: the sofa is yawed
    // ~23° (see this.yaw below) so its far corner swings laterally into a
    // part of the frustum that narrows toward the camera, and at 1.9 that
    // corner (and the near armrest) rendered PAST the canvas edge — the
    // "model crops off the right edge" fault. 1.6 gives back enough margin
    // that the whole silhouette, at every yaw the idle turntable/drag ever
    // reaches, stays inside the canvas. Still reads as large/close, not as
    // the old ~220px "confirmation tile" this comment used to compare
    // against — see git history if that number is ever needed again.
    const s = 1.6 / longest
    model.scale.setScalar(s)
    // Y is deliberately NOT re-centred to 0 like X/Z: a sofa's mass sits in
    // its lower half (cushions/frame low, only thin backrest reaching up), so
    // centring the true bounding-box middle puts the seat cushions above the
    // panel's own centreline and leaves the ground/contact-shadow area (see
    // .fg3-shadow in ForgeBand.svelte, anchored to the PANEL's bottom edge,
    // not to this model) floating disconnected from the object above it.
    // Shifting down by 22% of the scaled height pulls the seat/legs toward
    // the panel's lower third, so the CSS contact shadow sitting at the
    // panel's own bottom edge actually reads as underneath the object instead
    // of underneath a patch of empty canvas.
    const yShift = size.y * s * 0.22
    model.position.set(-center.x * s, -center.y * s - yShift, -center.z * s)

    this.group.add(model)

    // MATERIALS ARE CLONED PER INSTANCE, unlike every earlier version of this
    // file, and the reason is the crossfade: the solid pass now animates
    // `opacity`/`transparent` on these materials, and the module-scope GLTF
    // cache hands the SAME material objects to every clone. Sharing them was
    // free while nobody wrote to them; the moment one instance fades its
    // sofa in, a second instance elsewhere on the page would fade with it.
    // Cloning is a handful of small objects — and it is why dispose() below
    // now disposes them, which it correctly refused to do while they were
    // shared state.
    model.traverse((o) => {
      if (!o.isMesh || !o.material) return
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone()
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) this.solidMats.push(m)
    })

    // The points and the wireframe are drawn in the GROUP's space, not each
    // mesh's, so they turn with the model as one object: bake each mesh's
    // own matrix into a cloned geometry once, here, instead of parenting to
    // the meshes and paying a nested-transform update every frame.
    model.updateMatrixWorld(true)
    model.traverse((o) => {
      if (!o.isMesh || !o.geometry) return
      const g = o.geometry.clone()
      g.applyMatrix4(o.matrixWorld)
      this.pointsGroup.add(new THREE.Points(g, this.pointsMat))
      // EdgesGeometry, not WireframeGeometry: wireframe draws every triangle
      // edge including the ones inside flat quads, which on a subdivided sofa
      // reads as noise. Edges keeps the ones that describe the FORM (30° dihedral
      // threshold) — the silhouette, the seams, the cushion breaks.
      this.wireGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), this.wireMat))
    })

    // The scan plane's travel, measured from the framed model rather than
    // assumed: `s`/`yShift` above mean the model's own extent is not
    // symmetric about the origin, so a hardcoded ±1 sweep would spend half
    // its range in empty space.
    const framed = new THREE.Box3().setFromObject(model)
    this.yBounds = { min: framed.min.y, max: framed.max.y }

    this.applyBuild() // put the three layers into the state `this.build` asks for BEFORE the first frame paints — otherwise a band that mounts at build 0 flashes a finished sofa for one frame
    this.ready = true
  }

  /** 0..1 — how far through the rebuild this model is. Called from the band's
   *  scroll handler; clamped here so callers never have to. */
  setBuild(p) {
    const v = p < 0 ? 0 : p > 1 ? 1 : p
    if (v === this.build) return
    this.build = v
    this.applyBuild()
  }

  /** The crossfade itself, split out so load() can call it once before the
   *  first paint. Windows deliberately OVERLAP — points are still fading out
   *  while the wireframe fades in, and the wireframe outlives the moment the
   *  solid starts arriving — so the sofa is never momentarily invisible and
   *  the three stages read as one continuous build rather than three slides. */
  applyBuild() {
    const p = this.build
    const seg = (a, b) => (p <= a ? 0 : p >= b ? 1 : (p - a) / (b - a))
    const ease = (x) => x * x * (3 - 2 * x) // smoothstep: the linear ramps read as three abrupt hand-offs, the eased ones as one motion

    // The sweep runs a little past the model's top so the last vertices are
    // fully revealed before the wireframe stage takes over.
    const sweep = ease(seg(0.02, 0.42))
    const span = this.yBounds.max - this.yBounds.min
    this.clipPlane.constant = this.yBounds.min + sweep * (span + span * 0.06)

    const pts = ease(seg(0.02, 0.14)) * (1 - ease(seg(0.44, 0.62)))
    const wire = ease(seg(0.3, 0.48)) * (1 - ease(seg(0.66, 0.86)))
    const solid = ease(seg(0.58, 0.9))

    this.pointsMat.opacity = pts
    this.wireMat.opacity = wire
    this.pointsGroup.visible = pts > 0.001
    this.wireGroup.visible = wire > 0.001

    for (const m of this.solidMats) {
      m.opacity = solid
      // Transparency is switched OFF once the fade completes rather than left
      // on at opacity 1: a transparent material is sorted and blended every
      // frame and skips depth-write, which on a self-occluding mesh like a
      // curved sofa shows as cushions drawing through the backrest. The
      // finished state is the one a reader spends the most time looking at,
      // so it gets the correct opaque render, not the fade's.
      const opaque = solid > 0.999
      m.transparent = !opaque
      m.depthWrite = true
    }
    if (this.model) this.model.visible = solid > 0.001
  }

  /** Open the GL context. Cheap and idempotent — the parsed model already
   *  lives in `this.group`, so re-acquiring after a release() is just "make
   *  a renderer and hand it the same scene graph again," not a reload. */
  acquire(width, height) {
    if (this.renderer || this.disposed) return
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)) // hard cap — an uncapped DPR3 phone rendering a full-scene WebGL canvas is the single easiest way to turn "decorative" into "the tab's thermal throttle"
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.localClippingEnabled = true // the scan plane above is a per-MATERIAL clip (points + wireframe only, never the solid), which three only honours with local clipping switched on
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
    const dt = this.lastT === null ? 0 : Math.min(0.05, t - this.lastT) // clamped: a backgrounded tab returns with a multi-second gap, and an unclamped step would snap the sofa round in one frame
    this.lastT = t

    if (!this.dragging && t - this.lastDragT > 0.9) {
      if (this.idleAnchorT === null) { this.idleAnchorT = t } // idling just started (or resumed after a release/re-acquire) — anchor here, once

      // The angle the model WANTS to be at right now: turning into the hero
      // view while it builds, swaying around it once built.
      const built = this.build
      const target =
        built < 1
          ? this.heroYaw - 0.85 * (1 - built) // starts a little further round so the reveal turns toward the reader rather than sitting still
          : this.heroYaw + this.swayAmp * Math.sin((t - this.idleAnchorT) * this.swayRate)

      // Time-based damping, never a per-frame fraction (same rule Flyer.svelte
      // states for Companion.js): this is what lets a reader drag the sofa
      // anywhere, let go, and watch it ease back to the choreography instead
      // of snapping — and it is frame-rate independent, so a 120Hz display
      // and a throttled 30Hz one settle over the same wall-clock time.
      this.yaw += (target - this.yaw) * (1 - Math.exp(-2.6 * dt))
    }
    this.group.rotation.y = this.yaw
    this.group.rotation.x = this.pitchTilt
    this.renderer.render(this.scene, this.camera)
  }

  /** Full, final teardown — component unmount only. Releases the renderer
   *  (if still held) and drops the event listeners. Does NOT touch the GLTF
   *  cache or the geometries/materials INSIDE it: that parsed gltf.scene is
   *  shared module-scope state another SofaModel instance may still be
   *  cloning from, and it is a trivially small resource next to the GL
   *  context itself — the thing iOS actually caps and the thing this whole
   *  file is organised around.
   *
   *  It DOES dispose what this instance made for itself: the cloned solid
   *  materials, the points/edges geometries built in load(), and the two
   *  scan materials. Those are per-instance by construction (see load()) so
   *  nothing else can be holding them, and they are GPU allocations — the
   *  category this file exists to be careful with. */
  dispose() {
    this.disposed = true
    this.release()
    for (const m of this.solidMats) m.dispose()
    for (const o of [...this.pointsGroup.children, ...this.wireGroup.children]) o.geometry?.dispose()
    this.pointsMat.dispose()
    this.wireMat.dispose()
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    window.removeEventListener('pointermove', this._onPointerMove)
    window.removeEventListener('pointerup', this._onPointerUp)
  }
}
