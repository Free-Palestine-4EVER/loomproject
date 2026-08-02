// CuratedField — curated.media's hero scene, rebuilt in vanilla three.js with
// their hummingbird taken out and our bee flying its path instead.
//
// Everything here is lifted from the clone's scene-state
// (~/Desktop/dev/Web Clones/curated-clone/scene-state/a2be68de-….json):
//   engineState.pwObjects   → the graph, transforms, hierarchy   (GRAPH below)
//   engineState.pwMaterials → colours, maps, blend modes
//   engineState.effects     → the post chain
//   animations.sheetsById   → the scroll choreography, extracted to
//                             public/models/curated/scene-anim.json by
//                             scripts/extract-curated-anim.mjs
//
// Their engine is a proprietary webpack bundle, so the graph is reconstructed
// rather than executed — same numbers, our renderer.
//
// The one substitution: the three `white-necked-jacobin-hummingbird` instances
// are gone, and the bee rides the Bird-Rig's keyframes. That rig descends
// y 12.51 → 8.18 across the scroll, weaving x between the hibiscus positions
// and holding at each one — so the bee works its way down flower to flower,
// exactly as their bird did, and turns to face each on the way.
//
// Same public API as BeeField/HeroField: setScroll / setMouse / start / stop /
// resize / dispose.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

const ASSETS = '/models/curated/'
const BEE = '/models/honeybee.glb'

// Their palette, straight out of pwMaterials.
const NAVY = '#171b3c'   // every flat plane, the frame, the margins
const PERI = '#666cff'   // the smoke sheet
const SKY = '#75A5EC'    // hibiscus tint + the hero backplate's tint

// Object ids are the scene-state's own (8-char prefix), so the extracted
// animation tracks bind straight onto the nodes built here.
const GRAPH = {
  camera: { pos: [0.7046, 12.5599, 1.0708], fov: 40 },

  groups: {
    hero: { id: '5e38fb60', parent: 'scene', pos: [0.5450, 12.4255, -0.1826] },
    bottom: { id: 'a7380b60', parent: 'scene', pos: [0.7400, 7.1200, -0.6600] },
    bgs: { id: '68e8cbae', parent: 'bottom', pos: [-0.0300, -0.1100, -0.2800] },
    birdRig: { id: '70a64fb1', parent: 'scene', pos: [0.8200, 12.5100, 0.4400] },
    cards: { id: '56db365e', parent: 'scene', pos: [0.3000, 10.0000, -0.1400], rot: [0.73, -1.10, 0.20] },
    cardsInner: { id: '44ec02b9', parent: 'cards', pos: [0.0500, 0.0700, 0] },
    cardsMove: { id: 'ff2c81e8', parent: 'cardsInner', pos: [0.3400, 0.1000, -0.4700], scale: 0.02 },
  },

  planes: [
    { id: '26186bfb', parent: 'scene', pos: [0.8406, 8.8450, -1.2800], scale: [5, 7, 0.1], color: NAVY, side: 'double' },
    { id: 'e8430bb1', parent: 'hero', pos: [0.4592, -0.7084, 0.6400], scale: [5, 1, 0.1], color: NAVY, side: 'double' },
    { id: 'd747ac20', parent: 'hero', pos: [0.4177, -1.0400, 0.0500], scale: [5, 1, 0.1], color: NAVY, side: 'double' },
    { id: '132eff5b', parent: 'hero', pos: [0.4592, -1.1600, 0.6400], scale: [5, 2, 0.1], color: NAVY, side: 'double', hidden: true },
    { id: '3f6b3856', parent: 'bottom', pos: [-0.0283, 1.9797, 0.6711], scale: [4.0242, 1.1534, 1], color: NAVY },
    { id: '8688f2ce', parent: 'bottom', pos: [-0.0351, 0.1060, 0.6711], scale: [4.0242, 1.1534, 1], color: NAVY },
    { id: 'df3e232e', parent: 'hero', pos: [0.1542, 0.0808, 0.0315], scale: [2, 1.5, 1], color: SKY, map: 'bg-hero.webp' },
    { id: '27e8fbf8', parent: 'bgs', pos: [0, 1.0785, -0.0119], scale: [2.5, 1.25, 1.25], color: '#ffffff', map: 'bg-bottom.webp' },
    // Their smoke sheet sits 0.12 in front of the lens and rises into frame
    // around scroll 0.1 — it is the wipe that covers their section change,
    // timed to HTML arriving behind it. We have nothing behind it yet, so it
    // would simply blank the screen. Off until there is something to reveal.
    { id: 'b88a7069', parent: 'hero', pos: [0.3297, -0.0700, 1.1300], rot: [0, 0, Math.PI], scale: [3.0217, 0.5, 1], color: PERI, alphaMap: 'alpha-gradient.jpg', hidden: true },
  ],

  frame: { id: '9ca70751', parent: 'bottom', pos: [-0.3900, 1.0500, 0.6600], rot: [1.57, 1.57, 0], scale: 0.05 },

  hibiscus: [
    { id: '55fb6151', parent: 'hero', pos: [0.4500, -0.6900, 0.3500], rot: [3.14, -2.41, 3.14], scale: 0.08 },
    { id: 'b9ad8c2e', parent: 'scene', pos: [1.3700, 10.8200, 0.2900], rot: [0, 0, 0], scale: 0.06 },
    { id: '339aa29f', parent: 'scene', pos: [1.3400, 9.0000, 0.2900], rot: [0, 0, 0], scale: 0.06 },
    { id: '851869fe', parent: 'scene', pos: [0.0300, 10.3200, 0.2900], rot: [-3.14, 0, -3.14], scale: 0.06 },
  ],

  // The 11-card stack, 6 units apart down the `move` group's local Z. Their
  // per-card tracks fan it out over the scroll.
  cards: [
    '5d1736a7', '897d68b8', '31419cde', 'b95641be', '7ba1a263', '2f284200',
    'e87e73dc', '3e582860', '9629e237', 'fa73d731', 'a4b51ff5',
  ],
  cardBase: { rot: [2.88, -0.31, 1.40], scale: [1.3, 1, 1] },

  lights: [
    // The pair that hung on Bird-Rig: a blue kicker and a white key. They keep
    // riding the rig, so the bee carries its own light down the flowers.
    { id: '153f570c', parent: 'birdRig', pos: [-0.0846, -0.0479, 0.7656], color: '#0083ff', intensity: 2, distance: 2, decay: 2.89 },
    { id: '4f86fdb2', parent: 'birdRig', pos: [-0.0637, -0.0364, 0.7760], color: '#ffffff', intensity: 2, distance: 2, decay: 2.44 },
    // …and the pair that lit Bird-2 / Bird-3 down in the BGS group.
    { id: '453866e7', parent: 'bgs', pos: [0.6606, 1.1555, 0.4408], color: '#ffffff', intensity: 0.5, distance: 2, decay: 2.44 },
    { id: '4d811092', parent: 'bgs', pos: [-0.7469, 0.9135, 0.4408], color: '#ffffff', intensity: 0.5, distance: 2, decay: 2.44 },
  ],
}

// Their section changes are done by sliding opaque sheets across the lens: the
// periwinkle smoke and two navy planes all rise to camera height and wipe the
// screen, timed to HTML sections arriving behind them. We have nothing behind
// them yet, so left running they just black the scene out mid-scroll. The
// objects stay in the graph at their authored positions — only the wipe
// keyframes are dropped, which keeps the bee's whole descent visible.
const WIPE_TRACKS = new Set(['b88a7069', 'e8430bb1', 'd747ac20', '132eff5b'])

// The bird sat at this local offset inside the rig, at scale 2. Our bee is a
// different asset at a different authored size, so it is normalised to the same
// on-screen length and dropped in the same slot — inheriting the rig's descent
// and the bird's own yaw track, which is what turns it to face each flower.
// `length` is the bee's longest dimension in scene units. Their bird filled a
// similar slot at rig-scale 2, but the two assets are authored at wildly
// different sizes, so this is measured against the scene rather than copied.
// `yaw` is the bird's own value; `yawOffset` corrects for the bee model facing
// a different way than the bird did. Both are live-tunable — see setBee().
const BEE_SLOT = { id: '0c4550c1', pos: [-0.1400, -0.0600, 0.1400], yaw: 1.15, yawOffset: 1.5708, length: 0.10 }

// effects[] from the scene-state, as one grade pass: VIGNETTE (offset 0.5,
// darkness 0.5), NOISE (opacity 0.1), HUE_SATURATION (saturation +0.1).
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignetteOffset: { value: 0.5 },
    uVignetteDarkness: { value: 0.5 },
    uNoise: { value: 0.1 },
    uSaturation: { value: 0.1 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignetteOffset, uVignetteDarkness, uNoise, uSaturation;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, 1.0 + uSaturation);
      vec2 uv = (vUv - 0.5) * 2.0;
      float v = clamp(1.0 - uVignetteDarkness * (dot(uv, uv) - uVignetteOffset), 0.0, 1.0);
      c.rgb *= v;
      float n = hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5;
      c.rgb += n * uNoise;
      gl_FragColor = c;
    }
  `,
}

// ── Theatre.js keyframe sampling ──────────────────────────────────────────
// Each pair of consecutive keys is a cubic-bezier(x1, y1, x2, y2) easing where
// (x1, y1) is the left key's outgoing handle and (x2, y2) the right key's
// incoming one. Newton on x, then evaluate y — the same solve a browser does
// for a CSS bezier.
function bezierX(t, x1, x2) {
  const u = 1 - t
  return 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t
}
function bezierY(t, y1, y2) {
  const u = 1 - t
  return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t
}
function solveBezier(x, x1, y1, x2, y2) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let t = x
  for (let i = 0; i < 8; i++) {
    const err = bezierX(t, x1, x2) - x
    if (Math.abs(err) < 1e-5) break
    const u = 1 - t
    const d = 3 * u * u * x1 + 6 * u * t * (x2 - x1) + 3 * t * t * (1 - x2)
    if (Math.abs(d) < 1e-6) break
    t = Math.min(1, Math.max(0, t - err / d))
  }
  return bezierY(t, y1, y2)
}
// frames: [[pos, value, rightX, rightY, leftX, leftY], …] sorted by pos
function sampleTrack(frames, s) {
  if (s <= frames[0][0]) return frames[0][1]
  const last = frames[frames.length - 1]
  if (s >= last[0]) return last[1]
  let i = 0
  while (i < frames.length - 2 && frames[i + 1][0] <= s) i++
  const a = frames[i]
  const b = frames[i + 1]
  const span = b[0] - a[0]
  if (span <= 1e-9) return b[1]
  const local = (s - a[0]) / span
  return a[1] + (b[1] - a[1]) * solveBezier(local, a[2], a[3], b[4], b[5])
}

export class CuratedField {
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
    this.nodes = {}        // scene-state id → Object3D
    this.anim = null
    this.bee = null
    this.beeYaw = BEE_SLOT.yawOffset
    this.wingPhase = { value: 0 }

    const isMobile = window.innerWidth < 768
    this.isMobile = isMobile

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.4 : 1.75))
    // TONE_MAPPING mode 6 in their effect stack is ACES Filmic, exposure 1.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(NAVY)

    this.camera = new THREE.PerspectiveCamera(GRAPH.camera.fov, 1, 0.01, 200)
    this.camera.position.set(...GRAPH.camera.pos)
    this.camBase = this.camera.position.clone()

    for (const [key, g] of Object.entries(GRAPH.groups)) {
      const node = new THREE.Group()
      node.position.set(...g.pos)
      if (g.rot) node.rotation.set(...g.rot)
      if (g.scale) node.scale.setScalar(g.scale)
      this._parentOf(g.parent).add(node)
      this.nodes[g.id] = node
      this[key] = node
    }

    const tex = new THREE.TextureLoader()
    const load = (file, { data = false } = {}) => {
      const t = tex.load(ASSETS + file)
      t.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      this.disposables.push(t)
      return t
    }

    const planeGeo = new THREE.PlaneGeometry(1, 1)
    this.disposables.push(planeGeo)

    for (const p of GRAPH.planes) {
      const mat = new THREE.MeshBasicMaterial({
        color: p.color,
        side: p.side === 'double' ? THREE.DoubleSide : THREE.FrontSide,
        ...(p.map ? { map: load(p.map) } : {}),
        ...(p.alphaMap ? { alphaMap: load(p.alphaMap, { data: true }), transparent: true, depthWrite: false } : {}),
      })
      this.disposables.push(mat)
      const mesh = new THREE.Mesh(planeGeo, mat)
      mesh.position.set(...p.pos)
      if (p.rot) mesh.rotation.set(...p.rot)
      mesh.scale.set(...p.scale)
      mesh.visible = !p.hidden
      this._parentOf(p.parent).add(mesh)
      this.nodes[p.id] = mesh
    }

    for (const l of GRAPH.lights) {
      const light = new THREE.PointLight(new THREE.Color(l.color), l.intensity, l.distance, l.decay)
      light.position.set(...l.pos)
      this._parentOf(l.parent).add(light)
      this.nodes[l.id] = light
    }
    // Their hibiscus is a PHYSICAL material and the graph carries nothing but
    // those four tiny point lights, so it needs an ambient + sky to read at all.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const sky = new THREE.DirectionalLight(0xbcd4ff, 1.1)
    sky.position.set(1.5, 14, 3)
    this.scene.add(sky)

    this.clock = new THREE.Clock()
    this.resize = this.resize.bind(this)
    this.loop = this.loop.bind(this)
    window.addEventListener('resize', this.resize)
    this.resize()

    if (!reduced) {
      this.composer = new EffectComposer(this.renderer)
      this.composer.addPass(new RenderPass(this.scene, this.camera))
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.35, 0.85)
      this.composer.addPass(this.bloom)
      this.grade = new ShaderPass(GradeShader)
      this.composer.addPass(this.grade)
      this.resize()
    }

    this._loadAnim()
    this._loadHibiscus()
    this._loadFrame()
    this._loadCards()
    this._loadBee()

    if (reduced) this.renderOnce()
    else this.start()
  }

  _parentOf(key) {
    return key === 'scene' ? this.scene : (this[key] || this.scene)
  }

  async _loadAnim() {
    try {
      const res = await fetch(ASSETS + 'scene-anim.json')
      if (!res.ok) return
      const data = await res.json()
      // Keys in the file are full uuids; the graph uses the 8-char prefix.
      this.anim = {}
      for (const [id, tracks] of Object.entries(data.tracks)) {
        const key = id.slice(0, 8)
        if (WIPE_TRACKS.has(key)) continue
        this.anim[key] = tracks
      }
      if (this.reduced) this.renderOnce()
    } catch { /* no choreography → the scene still stands, it just holds still */ }
  }

  _loadHibiscus() {
    new GLTFLoader().load(ASSETS + 'hibiscus.glb', (gltf) => {
      if (this.disposed) return
      GRAPH.hibiscus.forEach((h, i) => {
        const node = i === 0 ? gltf.scene : gltf.scene.clone(true)
        node.position.set(...h.pos)
        node.rotation.set(...h.rot)
        node.scale.setScalar(h.scale)
        node.traverse((o) => {
          if (!o.isMesh) return
          const mat = new THREE.MeshPhysicalMaterial({ color: SKY, roughness: 0.75, metalness: 0 })
          o.material = mat
          this.disposables.push(mat)
        })
        this._parentOf(h.parent).add(node)
        this.nodes[h.id] = node
      })
      if (this.reduced) this.renderOnce()
    }, undefined, () => {})
  }

  _loadFrame() {
    new GLTFLoader().load(ASSETS + 'frame.glb', (gltf) => {
      if (this.disposed) return
      const node = gltf.scene
      node.position.set(...GRAPH.frame.pos)
      node.rotation.set(...GRAPH.frame.rot)
      node.scale.setScalar(GRAPH.frame.scale)
      node.traverse((o) => {
        if (!o.isMesh) return
        const mat = new THREE.MeshBasicMaterial({ color: NAVY })
        o.material = mat
        this.disposables.push(mat)
      })
      this._parentOf(GRAPH.frame.parent).add(node)
      this.nodes[GRAPH.frame.id] = node
      if (this.reduced) this.renderOnce()
    }, undefined, () => {})
  }

  _loadCards() {
    if (this.reduced || this.isMobile) return   // 11 extra draws of background dressing
    new GLTFLoader().load(ASSETS + 'card.glb', (gltf) => {
      if (this.disposed) return
      GRAPH.cards.forEach((id, i) => {
        const node = i === 0 ? gltf.scene : gltf.scene.clone(true)
        node.position.set(0, 0, 60 - i * 6)    // their stack: z 60 → 0, six apart
        node.rotation.set(...GRAPH.cardBase.rot)
        node.scale.set(...GRAPH.cardBase.scale)
        node.traverse((o) => {
          if (!o.isMesh) return
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          o.material = mats.map((m) => {
            const mat = m.clone()
            mat.transparent = true
            mat.opacity = i === 0 ? 1 : 0.96
            mat.depthWrite = false
            this.disposables.push(mat)
            return mat
          })
          if (o.material.length === 1) o.material = o.material[0]
        })
        this.cardsMove.add(node)
        this.nodes[id] = node
      })
      if (this.reduced) this.renderOnce()
    }, undefined, () => {})
  }

  // The bee takes the hummingbird's slot inside the rig, so it inherits the
  // rig's whole flower-to-flower descent for free.
  _loadBee() {
    new GLTFLoader().load(BEE, (gltf) => {
      if (this.disposed) return
      const root = gltf.scene
      const box = new THREE.Box3().setFromObject(root)
      const size = new THREE.Vector3()
      const centre = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(centre)
      const unit = BEE_SLOT.length / Math.max(size.x, size.y, size.z, 1e-4)

      // Recentre on the body before scaling, or the slot offset is measured
      // from wherever the exporter happened to leave the origin.
      root.traverse((o) => { if (o.isMesh) o.geometry.translate(-centre.x, -centre.y, -centre.z) })

      const holder = new THREE.Group()
      holder.add(root)
      this.beeUnit = unit / BEE_SLOT.length   // scene units per unit of `length`
      holder.scale.setScalar(unit)
      holder.position.set(...BEE_SLOT.pos)
      holder.rotation.y = BEE_SLOT.yaw + BEE_SLOT.yawOffset
      this.birdRig.add(holder)
      this.nodes[BEE_SLOT.id] = holder
      this.bee = holder

      // NOTE: this asset is a single unrigged mesh — no bones, no clips, and the
      // wings are welded into the same buffer as the body. An earlier attempt to
      // hinge them in the vertex shader tore the mesh, because no cheap spatial
      // mask separates wing from thorax cleanly. The bee holds still for now;
      // flapping needs the wing verts split out into their own geometry first.
      root.traverse((o) => { if (o.isMesh) o.frustumCulled = false })
      if (this.reduced) this.renderOnce()
    }, undefined, () => {})
  }

  // Walk the extracted tracks and push every keyed property onto its node.
  // Values are absolute, and any axis a node doesn't key simply keeps whatever
  // the graph authored — which is why nothing has to be restored here.
  _applyAnim(s) {
    if (!this.anim) return
    for (const id in this.anim) {
      const node = this.nodes[id]
      if (!node) continue
      const tracks = this.anim[id]
      for (const prop in tracks) {
        const v = sampleTrack(tracks[prop], s)
        if (typeof v !== 'number') continue
        const dot = prop.indexOf('.')
        if (dot > 0) {
          const group = node[prop.slice(0, dot)]
          if (group) group[prop.slice(dot + 1)] = v
        } else if (prop === 'opacity' && node.material) {
          node.material.opacity = v
          node.material.transparent = true
        }
      }
    }
    // The bird's own yaw track is what swings it round to face each flower it
    // arrives at, and the bee inherits it — but the two models front different
    // axes, so the correction rides on top of the keyframed value.
    if (this.bee && this.beeYaw) this.bee.rotation.y += this.beeYaw
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

  // Live tuning for the bee's slot, so its size/facing/offset can be dialled in
  // against the real scene instead of guessed from the numbers.
  setBee({ length, yawOffset, pos } = {}) {
    if (!this.bee) return
    if (length !== undefined) this.bee.scale.setScalar(this.beeUnit * length)
    if (yawOffset !== undefined) this.beeYaw = yawOffset
    if (pos) this.bee.position.set(...pos)
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
    const k = dt ? 1 : 0

    this.scroll += (this.scrollTarget - this.scroll) * (k ? 0.06 : 1)
    this.mouse.x += (this.mouseTarget.x - this.mouse.x) * (k ? 0.045 : 1)
    this.mouse.y += (this.mouseTarget.y - this.mouse.y) * (k ? 0.045 : 1)

    this._applyAnim(THREE.MathUtils.clamp(this.scroll, 0, 1))

    // Their camera has no keyframes — it holds still and the scene travels past
    // it. Only the pointer shifts it, and only enough to feel alive.
    this.camera.position.x = this.camBase.x + this.mouse.x * 0.10
    this.camera.position.y = this.camBase.y + this.mouse.y * 0.05
    this.camera.lookAt(this.camBase.x + this.mouse.x * 0.04, this.camBase.y - 0.02, this.camBase.z - 2)

    // ~11 Hz on screen. A real bee runs past 200 Hz and anything near the frame
    // rate just strobes; this is the rate that still reads as a blur.
    this.wingPhase.value = Math.sin(t * 11 * Math.PI * 2) * 0.5

    if (this.grade) this.grade.uniforms.uTime.value = t
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
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose() })
    for (const d of this.disposables) d.dispose?.()
    if (this.composer) this.composer.dispose?.()
    this.renderer.dispose()
  }
}
