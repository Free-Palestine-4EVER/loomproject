// The Ascent — a climb up the inside of a loom.
//
// The visitor rises through a vertical shaft of warp threads while six weft
// rings (one per territory) pass by, each with a shuttle running around it.
// Near the top the whole shaft funnels in and the threads converge overhead.
//
// Deliberately cheap: 1 InstancedMesh for every warp thread, 6 rings, 6 shuttle
// spheres, 1 point cloud. No lights, no shadows, no post — MeshBasicMaterial
// everywhere, because the whole look is line-work and fog. three.js itself is
// already on the page for the companion butterfly, so this adds geometry, not a
// second engine.

const YARNS = [0xd6247e, 0x9b55c9, 0x5cc0e8, 0xe0a82f]

// sky/fog colour per altitude band — matches the CSS gradient behind the canvas
const BANDS = [
  { at: 0.00, c: 0x1b1026 },
  { at: 0.26, c: 0x3a1c3f },
  { at: 0.50, c: 0x7b2fbe },
  { at: 0.74, c: 0x2a1150 },
  { at: 0.92, c: 0x05060a },
]

const WARPS = 84
const RADIUS = 7
const HEIGHT = 260
const RINGS = 6
const CLIMB = 178          // world units travelled over the whole section

export class LoomShaft {
  constructor(canvas, THREE, { reduced = false } = {}) {
    this.THREE = THREE
    this.canvas = canvas
    this.reduced = reduced
    this.p = 0
    this.mouse = { x: 0, y: 0 }
    this.aim = { x: 0, y: 0 }
    this.raf = 0
    this.running = false
    this.t = 0

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer = renderer

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x1b1026, 0.028)
    this.scene = scene
    this.fogColor = new THREE.Color(0x1b1026)
    this.tmpColor = new THREE.Color()

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400)
    this.camera.position.set(0, 0, 0)

    // ————— warp: the vertical threads, one instanced box for all of them
    this.shaft = new THREE.Group()
    scene.add(this.shaft)

    const geo = new THREE.BoxGeometry(0.055, HEIGHT, 0.055)
    // NOT vertexColors — BoxGeometry has no colour attribute, so that flag makes
    // the shader read a missing attribute and every thread comes out black.
    // instanceColor is enabled automatically by setColorAt below.
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: true })
    const warp = new THREE.InstancedMesh(geo, mat, WARPS)
    const m = new THREE.Matrix4()
    const col = new THREE.Color()
    for (let i = 0; i < WARPS; i++) {
      const a = (i / WARPS) * Math.PI * 2
      m.makeTranslation(Math.cos(a) * RADIUS, HEIGHT / 2 - 30, Math.sin(a) * RADIUS)
      warp.setMatrixAt(i, m)
      col.setHex(YARNS[i % YARNS.length])
      // every fourth thread is a house yarn, the rest are pale linen — that
      // ratio is what stops it reading as a rainbow
      warp.setColorAt(i, i % 4 === 0 ? col : col.setHex(0xefe7da).multiplyScalar(0.62))
    }
    warp.instanceMatrix.needsUpdate = true
    // without this the colour buffer is never uploaded and every thread renders
    // black — setColorAt allocates instanceColor but does not flag it
    if (warp.instanceColor) warp.instanceColor.needsUpdate = true
    this.shaft.add(warp)
    this.warp = warp

    // ————— weft: one ring per territory, each with a shuttle running it
    this.rings = []
    this.shuttles = []
    // The territory rings have to be fat enough to read as a band passing the
    // camera, not a hairline. Thin filler rings sit between them so the shaft
    // looks woven the whole way up rather than empty between territories.
    const ringGeo = new THREE.TorusGeometry(RADIUS, 0.19, 6, 120)
    const fillGeo = new THREE.TorusGeometry(RADIUS, 0.05, 5, 80)
    const fillMat = new THREE.MeshBasicMaterial({ color: 0xefe7da, transparent: true, opacity: 0.28 })
    for (let i = 0; i < 22; i++) {
      const f = new THREE.Mesh(fillGeo, fillMat)
      f.rotation.x = Math.PI / 2
      f.position.y = 4 + i * 8.2
      this.shaft.add(f)
    }
    const shuttleGeo = new THREE.SphereGeometry(0.42, 10, 8)
    for (let i = 0; i < RINGS; i++) {
      const c = YARNS[i % YARNS.length]
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95 }))
      ring.rotation.x = Math.PI / 2
      ring.position.y = 16 + i * 27
      this.shaft.add(ring)
      this.rings.push(ring)

      const sh = new THREE.Mesh(shuttleGeo, new THREE.MeshBasicMaterial({ color: 0xefe7da }))
      sh.position.y = ring.position.y
      this.shaft.add(sh)
      this.shuttles.push(sh)
    }

    // ————— stars, for the top of the climb
    const starGeo = new THREE.BufferGeometry()
    const N = 420
    const pos = new Float32Array(N * 3)
    let seed = 5
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2
      const r = 26 + rnd() * 70
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = 40 + rnd() * 260
      pos[i * 3 + 2] = Math.sin(a) * r
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.5, transparent: true, opacity: 0, fog: false,
    }))
    scene.add(this.stars)

    this.resize()
    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)
    this.renderOnce()
  }

  resize() {
    const { canvas, renderer, camera } = this
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  setProgress(p) { this.p = Math.min(1, Math.max(0, p)) }
  setMouse(x, y) { this.aim.x = x; this.aim.y = y }

  /** Fog + sky colour for the current altitude band. */
  bandColor(p) {
    let i = 0
    for (let k = 0; k < BANDS.length; k++) if (p >= BANDS[k].at) i = k
    const a = BANDS[i]
    const b = BANDS[Math.min(BANDS.length - 1, i + 1)]
    const t = Math.min(1, (p - a.at) / Math.max(0.001, b.at - a.at))
    return this.tmpColor.setHex(a.c).lerp(this.THREE.Color.prototype.setHex.call(new this.THREE.Color(), b.c), t)
  }

  frame(dt) {
    const { camera, p } = this
    this.t += dt

    // climb
    const y = p * CLIMB
    camera.position.y += (y - camera.position.y) * 0.12

    // the shaft funnels in near the top: the threads close overhead
    const s = 1 - Math.max(0, (p - 0.62) / 0.38) * 0.66
    this.shaft.scale.set(s, 1, s)
    this.shaft.rotation.y = this.t * 0.03

    // look slightly up the shaft, with a little mouse parallax
    this.mouse.x += (this.aim.x - this.mouse.x) * 0.06
    this.mouse.y += (this.aim.y - this.mouse.y) * 0.06
    camera.rotation.set(
      0.22 + this.mouse.y * 0.09,
      this.mouse.x * 0.16,
      Math.sin(this.t * 0.14) * 0.012
    )

    // shuttles run their rings
    for (let i = 0; i < this.shuttles.length; i++) {
      const a = this.t * (0.5 + i * 0.09) + i * 1.7
      const r = RADIUS
      this.shuttles[i].position.set(Math.cos(a) * r, this.rings[i].position.y, Math.sin(a) * r)
    }

    // sky
    const c = this.bandColor(p)
    this.fogColor.lerp(c, 0.08)
    this.scene.fog.color.copy(this.fogColor)
    this.scene.fog.density = 0.03 - p * 0.012

    this.stars.material.opacity = Math.max(0, (p - 0.55) / 0.4) * 0.9

    this.renderer.render(this.scene, camera)
  }

  renderOnce() { this.frame(0) }

  start() {
    if (this.running) return
    this.running = true
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      this.frame(dt)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  dispose() {
    this.stop()
    window.removeEventListener('resize', this._onResize)
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((mm) => mm.dispose())
      }
    })
    this.renderer.dispose()
  }
}
