// StageViews — ONE WebGL context, ONE mesh, THREE pictures of it.
//
// The band this feeds shows a product moving through the pipeline in a single
// row: the photograph you send, then the same object as bare geometry, then
// with its surface detail, then fully textured. The naive build of that is
// three <canvas> elements with three renderers and three copies of the model,
// which on this page would be four live GL contexts (the hero butterfly holds
// one) against a measured iOS Safari cap — see $three/glContext.js — and three
// uploads of the same 20k-triangle mesh.
//
// So there is one canvas stretched across the whole row, one renderer, and one
// mesh drawn three times per frame into three scissored viewports, swapping
// only the MATERIAL between passes. Cost per frame is three draws of a mesh
// that is already resident, and cost in memory is one of everything.
//
// THE THREE MATERIALS ARE THE WHOLE POINT, and they are all built from what
// the GLB already ships:
//   geometry — a plain grey standard material. No maps at all. The form, and
//              nothing else: this is what "a 3D model" means before anyone
//              has painted it.
//   detail   — the same grey, plus the GLB's own normal map. Every hair of
//              the fur is in that map; this pass is what shows that the
//              surface detail is real data and not a texture painted flat.
//   textured — the material the file actually shipped with.
// Nothing here is illustrative or faked: all three are the same asset, and
// the differences between them are exactly the differences between the
// pipeline's own stages.
//
// THE ASSET. Meshy's export is 58 MB — 859k triangles and two 4K JPEGs. That
// is a fine sculpt and an impossible web asset. It is re-authored offline
// (gltf-transform optimize: weld + simplify to ~20k triangles, textures to
// 1024 WebP, quantized) to 588 KB, which is the file loaded here. The
// simplification is aggressive on purpose and costs almost nothing visible,
// because the fur detail everyone actually looks at lives in the NORMAL MAP,
// not in the triangles. If you re-export this model, re-run that step; do not
// ship a Meshy download to the browser.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { releaseRenderer } from '$three/glContext.js'

let gltfPromise = null
function loadWolfGLTF() {
  if (!gltfPromise) gltfPromise = new GLTFLoader().loadAsync('/models/wolf-pup.glb')
  return gltfPromise
}

export class StageViews {
  /** @param {HTMLCanvasElement} canvas one canvas covering all three stage tiles */
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = null // only exists between acquire() and release()
    this.ready = false
    this.disposed = false
    this.views = [] // {x,y,w,h} in CSS px, relative to the canvas — set by the band from real element rects

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
    this.camera.position.set(0, 0.05, 3.15)
    this.camera.lookAt(0, 0, 0)

    // Lighting is identical for all three passes, which is what makes the row
    // an honest comparison — if the textured tile were lit more warmly than
    // the grey ones, the row would be selling the lighting, not the pipeline.
    const key = new THREE.DirectionalLight(0xffffff, 2.5)
    key.position.set(2, 2.6, 2.4)
    const fill = new THREE.DirectionalLight(0xffd7e9, 0.85) // the page's own pink, as fill: on a paper ground the bounce would be warm, and a cyan fill (what this was) reads as a studio gel nobody in the photograph is standing under
    fill.position.set(-2.6, 0.8, -1.2)
    const amb = new THREE.AmbientLight(0xffffff, 0.62) // pulled back from 0.78: that value was fighting a dark slab. On white cards the same ambient flattens the model into the panel
    this.scene.add(key, fill, amb)

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.mesh = null
    this.materials = [] // [geometry, detail, textured] — index matches the band's tile order

    // One turn shared by all three tiles: they are three views of ONE object,
    // so they must never drift out of phase with each other. Drag anywhere in
    // the row turns all of them.
    this.yaw = 0.5
    this.dragging = false
    this.lastDragT = -Infinity
    this.idleAnchorT = null
    this.lastT = null
    this._dragYawStart = 0
    this._dragXStart = 0
    // 0.34 rad/s — a full turn in about 18s. The earlier 0.16 was chosen to
    // read as "alive"; the brief is the opposite and it is right: the tiles
    // have to be UNDERSTOOD as 3D by someone who glances at them for two
    // seconds, and at 40s per revolution a glance sees a still image. This is
    // fast enough that the parallax is obvious immediately and slow enough
    // that it never reads as a spinning product demo.
    this.idleRate = 0.34

    this._onPointerDown = (e) => {
      this.dragging = true
      this.idleAnchorT = null
      this._dragYawStart = this.yaw
      this._dragXStart = e.clientX
      this.canvas.setPointerCapture?.(e.pointerId)
    }
    this._onPointerMove = (e) => {
      if (!this.dragging) return
      this.yaw = this._dragYawStart + (e.clientX - this._dragXStart) * 0.012
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

  async load() {
    const gltf = await loadWolfGLTF()
    if (this.disposed) return

    const model = gltf.scene.clone(true)
    let src = null
    model.traverse((o) => { if (o.isMesh && !src) src = o })
    if (!src) return

    // The GLB is one welded mesh (see the header — `join` runs in the
    // optimize pass), so one geometry and one material slot is the whole
    // model. Bake the source node's transform in and drop the scene graph:
    // three tiles turning in sync is easier to guarantee with one Object3D
    // than with a hierarchy that each pass has to keep consistent.
    model.updateMatrixWorld(true)
    const geo = src.geometry.clone()
    geo.applyMatrix4(src.matrixWorld)

    const textured = Array.isArray(src.material) ? src.material[0].clone() : src.material.clone()
    // TWO PASSES, NOT THREE. An earlier build had a middle "detail" material
    // (grey plus the normal map) between these two. It went, on instruction —
    // the row is three panels now — and it is not missed: at tile size the
    // bare-grey and normal-mapped greys were the two hardest to tell apart,
    // so the cut removes the weakest comparison in the row rather than a real
    // one. The fur still arrives, in the textured pass, where the normal map
    // ships anyway.
    //
    // The bare material is deliberately matte (roughness 0.95 scatters light
    // evenly, flattening the surface to pure silhouette and volume) — that is
    // what "geometry, no texture" looks like, and it makes the jump to the
    // textured tile as large as the truth allows.
    const geometryOnly = new THREE.MeshStandardMaterial({
      color: 0x8e879e, // mid, not light: these panels are white cards now, and the pale grey this was tuned to on the old dark slab lost its silhouette against them
      roughness: 0.95,
      metalness: 0
    })
    this.materials = [geometryOnly, textured]

    this.mesh = new THREE.Mesh(geo, geometryOnly)
    // Frame it: centre the bounding box at the origin and scale the longest
    // axis to a fixed world size, so the camera above works regardless of the
    // units or pivot the export happened to use. Y is shifted down slightly
    // for the same reason SofaModel does it — a sitting animal's mass is in
    // its lower half, and true-bbox centring floats it in the tile.
    const box = new THREE.Box3().setFromObject(this.mesh)
    const size = new THREE.Vector3(); box.getSize(size)
    const center = new THREE.Vector3(); box.getCenter(center)
    // 1.42, not 1.62: at 1.62 the pup filled the tile and then some — ears
    // clipped at the top edge and paws at the bottom, at every viewport,
    // because the tile is square and the model is tall. The row is a
    // comparison, and a comparison of three crops is not one.
    const s = 1.42 / (Math.max(size.x, size.y, size.z) || 1)
    this.mesh.scale.setScalar(s)
    this.mesh.position.set(-center.x * s, -center.y * s - size.y * s * 0.04, -center.z * s)

    this.group.add(this.mesh)
    this.ready = true
  }

  acquire(width, height) {
    if (this.renderer || this.disposed) return
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)) // hard cap — an uncapped DPR3 phone rendering three viewports is the fastest way to turn "decorative" into "thermal throttle"
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setSize(width, height, false) // false: canvas CSS size is owned by layout
    renderer.setScissorTest(true)
    this.renderer = renderer
  }

  release() {
    if (!this.renderer) return
    releaseRenderer(this.renderer)
    this.renderer = null
  }

  resize(width, height) {
    if (this.renderer) this.renderer.setSize(width, height, false)
  }

  /** Tile rectangles, in CSS pixels relative to the canvas's own top-left.
   *  The band measures these from the real DOM (so the row can be a flex row
   *  on desktop and a stacked column on mobile without this file knowing
   *  anything about either) and re-measures on resize — never per frame. */
  setViews(views) {
    this.views = views
  }

  renderFrame(t) {
    if (!this.renderer || !this.ready || !this.views.length) return

    const dt = this.lastT === null ? 0 : Math.min(0.05, t - this.lastT) // clamped: a backgrounded tab returns with a multi-second gap, and an unclamped step would snap the model round in one frame
    this.lastT = t
    if (!this.dragging && t - this.lastDragT > 0.9) {
      if (this.idleAnchorT === null) this.idleAnchorT = t
      this.yaw += this.idleRate * dt // per-SECOND rate, never a per-frame fraction — same rule Flyer.svelte states for Companion.js
    }
    this.group.rotation.y = this.yaw
    this.group.rotation.x = -0.03

    const h = this.canvas.clientHeight
    for (let i = 0; i < this.views.length; i++) {
      const v = this.views[i]
      const mat = this.materials[i]
      if (!v || !mat || v.w <= 0 || v.h <= 0) continue
      // WebGL's origin is bottom-left and the DOM's is top-left: flip Y here,
      // once, rather than making the caller think in GL coordinates.
      const y = h - (v.y + v.h)
      this.renderer.setViewport(v.x, y, v.w, v.h)
      this.renderer.setScissor(v.x, y, v.w, v.h)
      this.camera.aspect = v.w / Math.max(1, v.h)
      this.camera.updateProjectionMatrix()
      this.mesh.material = mat
      this.renderer.render(this.scene, this.camera)
    }
  }

  /** Full teardown — component unmount only. Disposes what this instance
   *  built for itself (the cloned geometry and the three materials); leaves
   *  the module-scope GLTF cache alone, since another instance may still be
   *  cloning from it and it is small next to the GL context this file exists
   *  to be careful with. */
  dispose() {
    this.disposed = true
    this.release()
    this.mesh?.geometry?.dispose()
    for (const m of this.materials) m.dispose()
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    window.removeEventListener('pointermove', this._onPointerMove)
    window.removeEventListener('pointerup', this._onPointerUp)
  }
}
