// The Hive — hero backdrop. Same staging as the curated.media bird scene
// (flyers drifting at depth, blossoms below, drifting smoke, per-flyer rim
// lights), rebuilt in vanilla three.js with our wool butterflies.
//
// The MAIN butterfly is not in here. It lives in Companion.js, on a fixed layer
// that follows the reader down the whole page — so this scene keeps only the
// two smaller flankers that drift behind the headline at depth.
//
// The butterfly is scripts/make-butterfly.mjs -> public/models/butterfly.glb:
// 32 bones, four clips. Flap is played ADDITIVELY so its weight is the flap
// amplitude, which is what lets each flyer burst and then glide.
//
// Drop-in for the old BeeField: same constructor, setScroll/setMouse/start/
// stop/dispose.
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { loadButterfly, prepFlyer, cloneSkinned } from './butterflyAsset.js'

const BG = new THREE.Color('#0d0716')
const MAGENTA = new THREE.Color('#f21c8c')
const VIOLET = new THREE.Color('#7b2fbe')
const CYAN = new THREE.Color('#59e6ff')
const GOLD = new THREE.Color('#ffc740')
const ORCHID = new THREE.Color('#a67cff')

// Flight paths. Each flyer traces a lissajous, wide and slow so they read as
// passing through the frame rather than orbiting in it.
// ONE flanker, staged low and right over the blossoms.
//
// The hero's star is the companion butterfly on the page-wide layer, and it is
// large. Small flyers behind the headline do not read as butterflies at that
// distance — they read as smudges on the lens crossing the type — so the scene
// keeps a single one, low enough to stay clear of every line of copy, working
// the flowers it is plausibly there for.
const FLYERS = [
  { scale: 0.58, at: [1.70, -1.35, -3.4], amp: [1.45, 0.40, 0.9], freq: [0.10, 0.21, 0.08], phase: 2.1, tint: ORCHID },
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
// sheen and the petals' iridescence are both lifeless without one, and
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
// half a step, a throat and a stamen column the butterflies can plausibly work.
function blossom(color) {
  const g = new THREE.Group()
  const petalMat = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.55, metalness: 0,
    // sheen, not transmission — any transmissive material in the scene costs a
    // second full render pass every frame
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

export class ButterflyField {
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
    this.glow = new THREE.PointLight(ORCHID, 12, 6, 2)
    this.glow.position.set(2.4, 1.0, -0.9)
    this.scene.add(this.glow)

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
        c.copy(ORCHID).lerp(Math.random() > 0.7 ? CYAN : MAGENTA, Math.random() * 0.7)
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

    // ── butterflies ──
    this.flyers = []
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

    this._load()
    if (reduced) this.renderOnce()
    else this.start()
  }

  async _load() {
    let gltf
    try {
      gltf = await loadButterfly()
    } catch {
      return // lights, blossoms and motes still render
    }
    if (this.disposed) return

    const count = this.reduced || this.isMobile ? 1 : FLYERS.length
    // Clone every scene BEFORE any of them is prepped. prepFlyer swaps in tinted
    // material clones, and cloning after the first prep would carry those over
    // and tint them a second time.
    const scenes = [gltf.scene]
    for (let i = 1; i < count; i++) scenes.push(cloneSkinned(gltf.scene))

    for (let i = 0; i < count; i++) {
      const cfg = FLYERS[i]
      const flyer = prepFlyer({ scene: scenes[i], animations: gltf.animations }, {
        tint: cfg.tint, scale: cfg.scale, wingAlpha: 0.92,
      })
      this.world.add(flyer.root)
      this.disposables.push(...flyer.disposables)

      // Per-flyer lights, as in the source scene: a warm key on the camera side
      // so the body is actually lit, and a tinted rim behind it to pick the
      // felt out of the dark.
      const lamp = new THREE.PointLight(0xffdca8, 8, 4.2, 2)
      const rim = new THREE.PointLight(cfg.tint, 7, 3.6, 2)
      this.world.add(lamp, rim)

      this.flyers.push({
        ...flyer, cfg, lamp, rim,
        prev: new THREE.Vector3(...cfg.at),
        vel: new THREE.Vector3(),
        speed: 0,
        roll: 0,
        burst: Math.random(),
        seed: Math.random() * 10,
      })
    }
    if (this.reduced) this.renderOnce()
  }

  // Position for a flyer at time t. The caller derives heading from the
  // frame-to-frame delta so banking follows the actual motion instead of a
  // hand-authored curve.
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
    for (const f of this.flyers) {
      const { cfg, root } = f
      // the flyers lean toward the cursor — subtle, but it makes the scene feel
      // aware of the reader rather than pre-rendered
      const pos = this._pathAt(cfg, t)
      pos.x += this.mouse.x * 0.35 * cfg.scale
      pos.y += this.mouse.y * 0.22 * cfg.scale - this.scroll * 0.7
      if (dt > 0) {
        f.vel.subVectors(pos, f.prev).divideScalar(Math.max(dt, 1e-3))
      } else {
        f.vel.copy(this._pathAt(cfg, t + 0.05)).sub(pos).divideScalar(0.05)
      }
      f.prev.copy(pos)
      root.position.copy(pos)

      const speed = f.vel.length()
      f.speed += (speed - f.speed) * (dt ? 0.08 : 1)

      // Heading: +Z is the butterfly's forward axis, so lookAt aims it down the
      // path. Raw path velocity regularly points it straight upstage, where all
      // the reader gets is an abdomen — so the heading is biased toward camera,
      // which keeps every flyer in a legible three-quarter without freezing the
      // turn into a fixed pose.
      fwd.copy(f.vel)
      if (fwd.lengthSq() > 1e-5) {
        fwd.normalize()
        fwd.set(fwd.x, fwd.y * 0.55, fwd.z * 0.45 + 0.5).normalize()
        root.lookAt(pos.clone().add(fwd))
        // bank into the turn, proportional to lateral speed
        const bankTarget = THREE.MathUtils.clamp(-f.vel.x * 0.20, -0.6, 0.6)
        f.roll += (bankTarget - f.roll) * (dt ? 0.05 : 1)
        root.rotateZ(f.roll)
      }

      // Flap-glide: burst, then coast. Two incommensurate sines so the rhythm
      // never repeats, floored by airspeed so a fast pass always beats hard.
      const rhythm = 0.5 + 0.5 * Math.sin(t * 1.2 + f.seed) * Math.sin(t * 0.41 + f.seed * 2)
      const drive = THREE.MathUtils.clamp((f.speed - 0.3) / 1.4, 0, 1)
      f.burst += (Math.max(rhythm, drive) - f.burst) * (dt ? 0.08 : 1)
      f.flap.setEffectiveWeight(0.16 + f.burst * 0.84)
      // ~3.2-5 Hz. Matching the companion's calmer beat; anything faster reads
      // as a moth panicking rather than a butterfly crossing the frame.
      f.flap.timeScale = 1.10 + f.burst * 0.62

      const cruiseW = THREE.MathUtils.clamp((f.speed - 0.45) / 0.9, 0, 1)
      f.cruise.weight = cruiseW
      f.flutter.weight = 1 - cruiseW

      f.lamp.position.set(pos.x + 0.7 * cfg.scale, pos.y + 0.8 * cfg.scale, pos.z + 1.3 * cfg.scale)
      f.rim.position.set(pos.x - 0.7 * cfg.scale, pos.y + 0.5 * cfg.scale, pos.z - 1.1 * cfg.scale)
      f.mixer.update(dt)
    }

    this.glow.intensity = 11 + Math.sin(t * 0.7) * 2.5
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
    for (const f of this.flyers) f.mixer.stopAllAction()
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
    })
    for (const d of this.disposables) d.dispose?.()
    if (this.scene.environment) this.scene.environment.dispose()
    if (this.composer) this.composer.dispose?.()
    this.renderer.dispose()
  }
}
