// The Hive — hero backdrop. Same staging as the curated.media bird scene
// (one hero flyer held near frame-centre, two smaller flankers drifting at
// depth, blossoms below, drifting smoke, per-flyer rim lights), rebuilt in
// vanilla three.js with a bee in place of the hummingbird.
//
// The bee is scripts/make-bee.mjs -> public/models/bee.glb: 33 bones, four
// clips (Flap / Hover / Fly / Land). Flap layers on top of the body clip, and
// Hover<->Fly crossfade by the flyer's own speed, so a bee that swings wide
// through the frame commits to forward flight and eases back to station-keeping.
//
// Drop-in for HeroField: same constructor, setScroll/setMouse/start/stop/dispose.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const BG = new THREE.Color('#ffe9f2')
const MAGENTA = new THREE.Color('#f21c8c')
const VIOLET = new THREE.Color('#7b2fbe')
const CYAN = new THREE.Color('#59e6ff')
const GOLD = new THREE.Color('#ffc740')

// Flight paths. Each flyer traces a lissajous; the hero's is tight (it holds
// station near the headline), the flankers' are wide and slow so they read as
// passing through rather than orbiting.
const FLYERS = [
  { scale: 1.00, at: [1.55, 0.55, 0.6], amp: [0.62, 0.40, 0.42], freq: [0.21, 0.33, 0.15], phase: 0.0, tint: GOLD, hero: true },
  { scale: 0.56, at: [-2.05, 1.35, -2.4], amp: [1.35, 0.52, 0.85], freq: [0.13, 0.25, 0.10], phase: 2.1, tint: MAGENTA },
  { scale: 0.40, at: [-0.35, -0.75, -4.3], amp: [1.75, 0.44, 1.0], freq: [0.09, 0.19, 0.07], phase: 4.3, tint: CYAN },
]

// Blossoms: the hibiscus stand-ins the birds fed from, restyled as LOOM-palette
// five-petal flowers. Procedural, so nothing external is fetched.
const BLOSSOMS = [
  { at: [1.15, -1.55, 0.15], scale: 1.0, tilt: [-0.35, 0.4, 0.1], color: MAGENTA },
  { at: [-1.85, -1.95, -1.6], scale: 0.78, tilt: [-0.5, -0.6, -0.2], color: VIOLET },
  { at: [2.6, -2.1, -2.9], scale: 0.62, tilt: [-0.4, 1.2, 0.15], color: MAGENTA },
]

// ── procedural assets ────────────────────────────────────────────────────
// Soft radial sprite, reused for smoke puffs and the light blooms.
function puffTexture() {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grd.addColorStop(0, 'rgba(255,255,255,0.85)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.28)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// A violet-to-warm equirect gradient, prefiltered into an env map. The wings'
// iridescence and the chitin's clearcoat are both lifeless without one, and
// generating it keeps the scene fully offline — no HDR fetch to fail.
function envMap(renderer) {
  const w = 32, h = 16
  const data = new Uint8Array(w * h * 4)
  const top = new THREE.Color('#2a1440')
  const horizon = new THREE.Color('#6b2f7a')
  const warm = new THREE.Color('#ffb14d')
  const floor = new THREE.Color('#0a0512')
  const c = new THREE.Color()
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1)
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1)
      c.copy(v < 0.5 ? top.clone().lerp(horizon, v * 2) : horizon.clone().lerp(floor, (v - 0.5) * 2))
      // warm key patch, upper-right — matches the spotlight below
      const d = Math.hypot((u - 0.72) * 1.6, v - 0.30)
      c.lerp(warm, Math.max(0, 1 - d * 3.2) * 0.7)
      const i = (y * w + x) * 4
      data[i] = c.r * 255; data[i + 1] = c.g * 255; data[i + 2] = c.b * 255; data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  const pmrem = new THREE.PMREMGenerator(renderer)
  const rt = pmrem.fromEquirectangular(tex)
  pmrem.dispose()
  tex.dispose()
  return rt.texture
}

// Petal surface: u runs root→tip, v across. The three things that stop it
// reading as folded paper are all here — a cupped spine, a ruffled edge that
// only waves where the petal is thin, and a tip that curls back on itself.
function petalGeometry(len, wid, ruffle) {
  const nx = 16, ny = 12
  const pos = [], idx = []
  for (let i = 0; i <= nx; i++) {
    const u = i / nx
    const half = wid * Math.sin(Math.PI * Math.min(1, u * 0.80 + 0.16)) ** 0.62 * (1 - u * u * 0.22)
    for (let j = 0; j <= ny; j++) {
      const v = (j / ny) * 2 - 1
      const edge = Math.abs(v) ** 3
      // spine dips, edges lift, tip curls back and outward
      let y = 0.20 * v * v * u + 0.26 * u * u - 0.30 * u ** 4
      y += ruffle * edge * Math.sin(u * 11.0 + v * 2.0) * u
      const z = 0.10 + u * len - 0.10 * u ** 4
      pos.push(v * half, y, z)
      if (i < nx && j < ny) {
        const a = i * (ny + 1) + j
        idx.push(a, a + ny + 1, a + 1, a + 1, a + ny + 1, a + ny + 2)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// Two-ring blossom: five broad outer petals, five smaller inner ones offset by
// half a step, a throat and a stamen column the bees can plausibly be working.
function blossom(color) {
  const g = new THREE.Group()
  const petalMat = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.55, metalness: 0,
    // sheen, not transmission — see the wing note in _loadBees: any transmissive
    // material in the scene costs a second full render pass every frame
    sheen: 1.0, sheenRoughness: 0.4, sheenColor: new THREE.Color('#ffd6ef'),
    ior: 1.4, side: THREE.DoubleSide,
  })
  const innerMat = petalMat.clone()
  innerMat.color = color.clone().lerp(new THREE.Color('#ffe9b0'), 0.35)

  const outerGeo = petalGeometry(0.80, 0.30, 0.055)
  const innerGeo = petalGeometry(0.52, 0.20, 0.035)
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(outerGeo, petalMat)
    p.rotation.y = (i / 5) * Math.PI * 2
    p.rotation.x = -0.62 - (i % 2) * 0.09
    g.add(p)
    const q = new THREE.Mesh(innerGeo, innerMat)
    q.rotation.y = ((i + 0.5) / 5) * Math.PI * 2
    q.rotation.x = -1.02 - (i % 2) * 0.06
    q.position.y = 0.07
    g.add(q)
  }
  const throat = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.30, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: color.clone().lerp(GOLD, 0.5), roughness: 0.85, side: THREE.DoubleSide })
  )
  throat.rotation.x = Math.PI
  throat.position.y = -0.12
  g.add(throat)
  const stamenMat = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.5, emissive: GOLD, emissiveIntensity: 0.15 })
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.5, 5), stamenMat)
    st.position.set(Math.cos(a) * 0.05, 0.24, Math.sin(a) * 0.05)
    st.rotation.z = Math.cos(a) * 0.22
    st.rotation.x = -Math.sin(a) * 0.22
    g.add(st)
    const anther = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), stamenMat)
    anther.position.set(Math.cos(a) * 0.11, 0.5, Math.sin(a) * 0.11)
    g.add(anther)
  }
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.030, 0.048, 1.6, 8),
    new THREE.MeshStandardMaterial({ color: new THREE.Color('#2e2142'), roughness: 0.95 })
  )
  stem.position.y = -0.9
  g.add(stem)
  return g
}

export class BeeField {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas
    this.reduced = reduced
    this.running = false
    this.disposed = false
    this.time = 0
    this.scrollTarget = 0
    this.scroll = 0
    this.mouseTarget = new THREE.Vector2(0, 0)
    this.mouse = new THREE.Vector2(0, 0)
    this.disposables = []

    const isMobile = window.innerWidth < 768
    this.isMobile = isMobile

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.4 : 1.75))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    // The CSS gradient behind the canvas is the sky, so the scene stays alpha —
    // fog only has to swallow the far flankers into that same violet.
    this.scene.fog = new THREE.FogExp2(BG, 0.075)
    this.scene.environment = envMap(this.renderer)

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60)
    this.camera.position.set(0, 0.55, 6.4)
    this.camera.lookAt(0, 0.35, 0)

    this.world = new THREE.Group()
    this.scene.add(this.world)

    // ── lighting: warm key from upper right, violet fill, magenta kicker ──
    const key = new THREE.SpotLight(0xffd9a0, reduced ? 40 : 62, 26, 0.62, 0.5, 1.4)
    key.position.set(4.6, 5.2, 3.4)
    this.scene.add(key, key.target)
    const fill = new THREE.DirectionalLight(VIOLET, 1.5)
    fill.position.set(-4, 1.2, 2)
    this.scene.add(fill)
    const kick = new THREE.PointLight(MAGENTA, 26, 14, 2)
    kick.position.set(-2.2, -0.4, -2.2)
    this.scene.add(kick)
    this.scene.add(new THREE.AmbientLight(0x2a1a3d, 1.4))
    // rim behind the hero flyer — the curated scene gave every bird its own
    this.heroRim = new THREE.PointLight(GOLD, 14, 6, 2)
    this.heroRim.position.set(2.4, 1.0, -0.9)
    this.scene.add(this.heroRim)

    // ── blossoms ──
    this.blossoms = []
    for (const b of BLOSSOMS) {
      const g = blossom(b.color)
      g.position.set(...b.at)
      g.rotation.set(...b.tilt)
      g.scale.setScalar(b.scale)
      this.world.add(g)
      this.blossoms.push({ g, base: g.rotation.clone(), seed: Math.random() * 10 })
      g.traverse((o) => { if (o.geometry) this.disposables.push(o.geometry); if (o.material) this.disposables.push(o.material) })
    }

    // ── drifting smoke ──
    const puff = puffTexture()
    this.disposables.push(puff)
    this.smoke = []
    const smokeCount = reduced ? 5 : isMobile ? 9 : 16
    for (let i = 0; i < smokeCount; i++) {
      const mat = new THREE.SpriteMaterial({
        map: puff,
        color: i % 3 === 0 ? MAGENTA : VIOLET,
        transparent: true,
        opacity: 0.05 + Math.random() * 0.05,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
      const s = new THREE.Sprite(mat)
      s.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6 - 0.4, -1 - Math.random() * 7)
      s.scale.setScalar(3 + Math.random() * 5)
      s.userData = { seed: Math.random() * 100, drift: 0.02 + Math.random() * 0.05 }
      this.world.add(s)
      this.smoke.push(s)
      this.disposables.push(mat)
    }

    // ── pollen motes ──
    {
      const count = reduced ? 200 : isMobile ? 500 : 1100
      const pos = new Float32Array(count * 3)
      const seed = new Float32Array(count)
      const col = new Float32Array(count * 3)
      const c = new THREE.Color()
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 16
        pos[i * 3 + 1] = (Math.random() - 0.5) * 8
        pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2
        seed[i] = Math.random()
        c.copy(GOLD).lerp(Math.random() > 0.7 ? CYAN : MAGENTA, Math.random() * 0.7)
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: this.renderer.getPixelRatio() } },
        vertexShader: /* glsl */`
          uniform float uTime; uniform float uPixelRatio;
          attribute float aSeed; varying float vFade; varying vec3 vCol;
          void main(){
            vec3 p = position;
            float s = aSeed * 6.283;
            p.x += sin(uTime * 0.18 + s) * 0.5;
            p.y += cos(uTime * 0.13 + s * 1.7) * 0.4 + mod(uTime * 0.05 * (0.4 + aSeed), 6.0) - 3.0;
            p.z += sin(uTime * 0.09 + s * 2.3) * 0.4;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (6.0 + aSeed * 14.0) * uPixelRatio / max(-mv.z, 0.6);
            vFade = smoothstep(28.0, 4.0, -mv.z) * (0.35 + 0.65 * aSeed);
            vCol = color;
          }`,
        fragmentShader: /* glsl */`
          varying float vFade; varying vec3 vCol;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vCol, a * a * vFade * 0.75);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      })
      this.motes = new THREE.Points(geo, mat)
      this.moteUniforms = mat.uniforms
      this.world.add(this.motes)
      this.disposables.push(geo, mat)
    }

    // ── bees ──
    this.bees = []
    this.clock = new THREE.Clock()
    this.resize = this.resize.bind(this)
    this.loop = this.loop.bind(this)
    window.addEventListener('resize', this.resize)
    this.resize()

    // Bloom is what makes the rim light and the pollen read as light rather
    // than as bright pixels. Skipped on mobile and for reduced motion.
    if (!reduced && !isMobile) {
      this.composer = new EffectComposer(this.renderer)
      this.composer.addPass(new RenderPass(this.scene, this.camera))
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.72, 0.68)
      this.composer.addPass(bloom)
      this.bloom = bloom
      this.resize()
    }

    this._loadBees()
    if (reduced) this.renderOnce()
    else this.start()
  }

  _loadBees() {
    const loader = new GLTFLoader()
    loader.load('/models/bee.glb', (gltf) => {
      if (this.disposed) return
      const src = gltf.scene
      const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]))
      const count = this.reduced ? 1 : this.isMobile ? 2 : FLYERS.length

      for (let i = 0; i < count; i++) {
        const cfg = FLYERS[i]
        const root = i === 0 ? src : cloneSkinned(src)
        root.scale.setScalar(cfg.scale)
        this.world.add(root)

        // A transmissive material forces three to re-render the whole scene into
        // a transmission target every frame. Against a near-black backdrop it
        // buys nothing the thin-film iridescence isn't already selling, so the
        // wings drop transmission here and keep the shimmer.
        root.traverse((o) => {
          if (!o.isMesh) return
          o.frustumCulled = false
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          o.material = mats.map((m) => {
            const mat = m.clone()
            if (mat.name === 'BeeWing') {
              mat.transmission = 0
              mat.opacity = cfg.hero ? 0.38 : 0.32
              mat.transparent = true
              mat.depthWrite = false
            }
            if (mat.name === 'BeeChitin') mat.emissive = cfg.tint.clone().multiplyScalar(0.06)
            this.disposables.push(mat)
            return mat
          })
          if (o.material.length === 1) o.material = o.material[0]
        })

        const mixer = new THREE.AnimationMixer(root)
        const flap = mixer.clipAction(clips.Flap)
        flap.play()
        // ~11 Hz on screen. A real bee runs past 200 Hz, and anything near the
        // frame rate just strobes; this is the rate that still reads as a blur.
        flap.timeScale = 0.5 + Math.random() * 0.2
        const hover = mixer.clipAction(clips.Hover)
        hover.play()
        hover.time = Math.random() * clips.Hover.duration
        const fly = mixer.clipAction(clips.Fly)
        fly.play()
        fly.weight = 0
        fly.time = Math.random() * clips.Fly.duration

        // Per-flyer lights, as in the source scene: a warm key on the camera
        // side so the gold body is actually lit, and a tinted rim behind it to
        // pick the fuzz out of the dark.
        const lamp = new THREE.PointLight(0xffdca8, cfg.hero ? 11 : 5, cfg.hero ? 5 : 3.5, 2)
        const rim = new THREE.PointLight(cfg.tint, cfg.hero ? 9 : 4, cfg.hero ? 4.5 : 3, 2)
        this.world.add(lamp, rim)

        this.bees.push({
          root, mixer, hover, fly, flap, cfg, lamp, rim,
          prev: new THREE.Vector3(...cfg.at),
          vel: new THREE.Vector3(),
          speed: 0,
          roll: 0,
        })
      }
      if (this.reduced) this.renderOnce()
    }, undefined, () => { /* model missing -> lights, blossoms and motes still render */ })
  }

  // Position + orientation for a flyer at time t. Returns the path point; the
  // caller derives heading from the frame-to-frame delta so banking follows the
  // actual motion instead of a hand-authored curve.
  _pathAt(cfg, t) {
    const [ax, ay, az] = cfg.amp
    const [fx, fy, fz] = cfg.freq
    const p = cfg.phase
    return new THREE.Vector3(
      cfg.at[0] + Math.sin(t * fx * Math.PI * 2 + p) * ax,
      cfg.at[1] + Math.sin(t * fy * Math.PI * 2 + p * 1.7) * ay,
      cfg.at[2] + Math.sin(t * fz * Math.PI * 2 + p * 0.6) * az
    )
  }

  resize() {
    const parent = this.canvas.parentElement
    if (!parent) return
    const { clientWidth: w, clientHeight: h } = parent
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    if (this.composer) this.composer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    if (this.reduced) this.renderOnce()
  }

  setScroll(v) { this.scrollTarget = v }
  setMouse(nx, ny) { this.mouseTarget.set(nx, ny) }

  renderOnce() {
    this.time = 2.2
    this._advance(0)
    this.renderer.render(this.scene, this.camera)
  }

  start() { if (!this.running && !this.disposed) { this.running = true; this.clock.start(); this.loop() } }
  stop() { this.running = false }

  _advance(dt) {
    const t = this.time

    this.scroll += (this.scrollTarget - this.scroll) * (dt ? 0.06 : 1)
    this.mouse.x += (this.mouseTarget.x - this.mouse.x) * (dt ? 0.045 : 1)
    this.mouse.y += (this.mouseTarget.y - this.mouse.y) * (dt ? 0.045 : 1)

    // camera: gentle mouse parallax, scroll pulls back and lifts
    this.camera.position.x = this.mouse.x * 0.55
    this.camera.position.y = 0.55 + this.mouse.y * 0.32 + this.scroll * 1.1
    this.camera.position.z = 6.4 + this.scroll * 1.6
    this.camera.lookAt(this.mouse.x * 0.18, 0.35 + this.scroll * 0.55, 0)

    if (this.moteUniforms) this.moteUniforms.uTime.value = t

    for (const s of this.smoke) {
      const { seed, drift } = s.userData
      s.position.y += drift * dt
      s.position.x += Math.sin(t * 0.07 + seed) * 0.004
      s.material.rotation = Math.sin(t * 0.05 + seed) * 0.6
      if (s.position.y > 3.6) s.position.y = -3.6
    }

    for (const b of this.blossoms) {
      b.g.rotation.x = b.base.x + Math.sin(t * 0.32 + b.seed) * 0.045
      b.g.rotation.z = b.base.z + Math.cos(t * 0.27 + b.seed) * 0.05
    }

    const fwd = new THREE.Vector3()
    for (const bee of this.bees) {
      const { cfg, root } = bee
      // the flyers lean toward the cursor — subtle, but it makes the scene feel
      // aware of the reader rather than pre-rendered
      const pos = this._pathAt(cfg, t)
      pos.x += this.mouse.x * 0.35 * cfg.scale
      pos.y += this.mouse.y * 0.22 * cfg.scale - this.scroll * 0.7
      if (dt > 0) {
        bee.vel.subVectors(pos, bee.prev).divideScalar(Math.max(dt, 1e-3))
      } else {
        bee.vel.copy(this._pathAt(cfg, t + 0.05)).sub(pos).divideScalar(0.05)
      }
      bee.prev.copy(pos)
      root.position.copy(pos)

      const speed = bee.vel.length()
      bee.speed += (speed - bee.speed) * (dt ? 0.08 : 1)

      // Heading: +Z is the bee's forward axis, so lookAt aims it down the path.
      // Raw path velocity regularly points the bee straight upstage, where all
      // the reader gets is an abdomen — so the heading is biased toward camera,
      // which keeps every flyer in a legible three-quarter without freezing the
      // turn into a fixed pose.
      fwd.copy(bee.vel)
      if (fwd.lengthSq() > 1e-5) {
        fwd.normalize()
        fwd.set(fwd.x, fwd.y * 0.55, fwd.z * 0.45 + 0.5).normalize()
        const target = pos.clone().add(fwd)
        root.lookAt(target)
        // bank into the turn, proportional to lateral speed
        const bankTarget = THREE.MathUtils.clamp(-bee.vel.x * 0.16, -0.5, 0.5)
        bee.roll += (bankTarget - bee.roll) * (dt ? 0.05 : 1)
        root.rotateZ(bee.roll)
      }

      // Hover holds station; Fly is the committed, nose-down posture. Crossfade
      // on speed so neither ever pops.
      const flyW = THREE.MathUtils.clamp((bee.speed - 0.45) / 0.9, 0, 1)
      bee.fly.weight = flyW
      bee.hover.weight = 1 - flyW
      bee.flap.timeScale = (0.55 + flyW * 0.3) * (cfg.hero ? 1 : 1.15)

      bee.lamp.position.set(pos.x + 0.7 * cfg.scale, pos.y + 0.8 * cfg.scale, pos.z + 1.3 * cfg.scale)
      bee.rim.position.set(pos.x - 0.7 * cfg.scale, pos.y + 0.5 * cfg.scale, pos.z - 1.1 * cfg.scale)
      bee.mixer.update(dt)
    }

    this.heroRim.intensity = 12 + Math.sin(t * 0.7) * 2.5
  }

  loop() {
    if (!this.running || this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.time += dt
    this._advance(dt)
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    this.stop()
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    for (const bee of this.bees) bee.mixer.stopAllAction()
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
    })
    for (const d of this.disposables) d.dispose?.()
    if (this.scene.environment) this.scene.environment.dispose()
    if (this.composer) this.composer.dispose?.()
    this.renderer.dispose()
  }
}

// Object3D.clone() leaves a SkinnedMesh bound to the *original* skeleton, so
// every copy would animate off the first bee's bones. three ships SkeletonUtils
// for this; only the one function is needed, so it is inlined.
function cloneSkinned(source) {
  const sourceLookup = new Map()
  const cloneLookup = new Map()
  const copy = source.clone()

  const parallelTraverse = (a, b, cb) => {
    cb(a, b)
    for (let i = 0; i < a.children.length; i++) parallelTraverse(a.children[i], b.children[i], cb)
  }
  parallelTraverse(source, copy, (sourceNode, clonedNode) => {
    sourceLookup.set(clonedNode, sourceNode)
    cloneLookup.set(sourceNode, clonedNode)
  })

  copy.traverse((node) => {
    if (!node.isSkinnedMesh) return
    const sourceMesh = sourceLookup.get(node)
    const sourceBones = sourceMesh.skeleton.bones
    node.skeleton = sourceMesh.skeleton.clone()
    node.bindMatrix.copy(sourceMesh.bindMatrix)
    node.skeleton.bones = sourceBones.map((bone) => cloneLookup.get(bone))
    node.bind(node.skeleton, node.bindMatrix)
  })

  return copy
}
