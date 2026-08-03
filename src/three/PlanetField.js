// PlanetField — the hero backdrop: the knitted LOOM planet, floating over a
// photographed candy-cloud environment, treated the way curated.media treats
// theirs.
//
// The environment used to be a procedural nebula shader (no bytes, matched
// the site's own palette). It is now a real photograph in .hero-canvas-wrap's
// CSS background (see styles.css) — the user supplied art-directed desktop
// and mobile versions and asked for them directly, so this canvas no longer
// draws an environment at all. What survives from the curated.media recipe:
// one bright subject carrying the saturation, and a haze sheet drifting
// BETWEEN lens and subject so the depth is something you look through.
//
// GOTCHA, cost real time: `UnrealBloomPass` does not preserve alpha through
// its composite — a renderer created with `alpha:true` and `setClearColor`
// alpha 0 still painted the canvas fully opaque once bloom was in the chain,
// hiding the CSS photograph underneath it entirely. Postprocessing existed
// to fake an environment this canvas no longer draws, so it is gone rather
// than fought: renders straight to the canvas via renderer.render(), and the
// canvas gets a CSS drop-shadow glow instead of a bloom pass.
//
// Same public API as ButterflyField/CuratedField: setScroll / setMouse /
// start / stop / resize / dispose.
import * as THREE from 'three'

const PLANET_MAP = '/img/hero/planet.webp'

// The site's own palette — styles.css :root, not a new set of colours.
const MAGENTA = new THREE.Color('#b3126a')

const PASSTHROUGH_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

export class PlanetField {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas
    this.reduced = reduced
    this.running = false
    this.disposed = false
    this.time = 0
    this.scroll = 0
    this.scrollTarget = 0
    this.mouse = new THREE.Vector2()
    this.mouseTarget = new THREE.Vector2()
    this.disposables = []

    const narrow = window.innerWidth < 900
    this.narrow = narrow

    // alpha:true + no scene.background — the environment is now the real
    // photograph in .hero-canvas-wrap's CSS (see styles.css), not a shader.
    // This canvas renders only the LOOM planet, its motes and its haze, on
    // top of that photo; the nebula shader is gone entirely rather than kept
    // and hidden, since nothing was going to sample it any more.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !narrow, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrow ? 1.4 : 1.75))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    this.camera.position.set(0, 0, 7)
    this.camBase = this.camera.position.clone()

    const quad = new THREE.PlaneGeometry(1, 1)
    this.disposables.push(quad)

    // ── the subject. A billboard, not a sphere: the render already carries its
    //    own lighting and knit detail, and no mesh we could build in the budget
    //    of one WebGL context would come close to it.
    this.planetMat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      opacity: 0,          // faded in on decode, so it never pops in half-loaded
      toneMapped: false,
    })
    this.disposables.push(this.planetMat)
    this.planet = new THREE.Mesh(quad, this.planetMat)
    // Vertical fov is fixed, so a portrait screen (aspect well under 1) has a
    // NARROWER horizontal frustum than a desktop one — the same world-space
    // scale therefore eats a much bigger fraction of a phone's width. 2.0 is
    // tuned against an iPhone's ~0.45 aspect, not guessed down from desktop's.
    this.planet.scale.setScalar(narrow ? 2.0 : 4.05)
    this.planetScale = narrow ? 2.0 : 4.05
    // Desktop: type owns the left two thirds, planet the right. Mobile is
    // single-column — planet dead centre of the frame, behind the type.
    this.planetHome = new THREE.Vector3(narrow ? 0 : 2.32, narrow ? 0 : -0.05, 0)
    this.planet.position.copy(this.planetHome)
    this.scene.add(this.planet)

    new THREE.TextureLoader().load(PLANET_MAP, (t) => {
      if (this.disposed) { t.dispose(); return }
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy())
      this.planetMat.map = t
      this.planetMat.needsUpdate = true
      this.disposables.push(t)
      this.planetFade = 0
    })

    // ── motes. The only particles in the scene; they read as dust in the
    //    haze, and they are what makes the parallax legible at all.
    const COUNT = narrow ? 90 : 170
    const pos = new Float32Array(COUNT * 3)
    const seed = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = -6 + Math.random() * 10
      seed[i] = Math.random()
    }
    const moteGeo = new THREE.BufferGeometry()
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    this.disposables.push(moteGeo)
    this.moteMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
      vertexShader: /* glsl */`
        attribute float aSeed;
        uniform float uTime, uScale;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.25 + aSeed * 6.28) * 0.5;
          p.x += cos(uTime * 0.18 + aSeed * 5.13) * 0.42;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = 0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * 0.9 + aSeed * 12.0));
          gl_PointSize = (1.6 + aSeed * 3.4) * uScale * (9.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(1.0, 0.86, 0.97, vA * smoothstep(0.5, 0.0, d) * 0.5);
        }
      `,
    })
    this.disposables.push(this.moteMat)
    this.motes = new THREE.Points(moteGeo, this.moteMat)
    this.scene.add(this.motes)

    // ── the haze sheet, between lens and subject. Curated's is a texture; a
    //    two-stop gradient in a shader is the same sheet without the fetch.
    this.hazeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uTint: { value: MAGENTA } },
      vertexShader: PASSTHROUGH_VERT,
      fragmentShader: /* glsl */`
        uniform float uTime, uScroll;
        uniform vec3 uTint;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                     mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        void main() {
          float n = noise(vUv * 3.0 + vec2(uTime * 0.03, uTime * 0.012));
          // rises into frame as the reader leaves the hero, exactly the job
          // curated's sheet does at their section change
          float band = smoothstep(0.0, 0.55, vUv.y + uScroll * 0.6 - 0.12)
                     * (1.0 - smoothstep(0.45, 1.0, vUv.y));
          gl_FragColor = vec4(uTint, band * n * 0.30);
        }
      `,
    })
    this.disposables.push(this.hazeMat)
    this.haze = new THREE.Mesh(quad, this.hazeMat)
    this.haze.position.z = 3.4
    this.haze.renderOrder = 2
    this.scene.add(this.haze)

    this.clock = new THREE.Clock()
    this.resize = this.resize.bind(this)
    this.loop = this.loop.bind(this)
    window.addEventListener('resize', this.resize)

    // The soft bloom postprocessing used to add is approximated in CSS on the
    // canvas element instead — see .hero-canvas in styles.css — since a real
    // bloom pass is what was breaking transparency (see the file banner).
    this.resize()
    if (reduced) this.renderOnce()
    else this.start()
  }

  /** Fit a plane at depth `z` to the camera frustum, with a little overscan. */
  _fit(mesh, z, over = 1.06) {
    const dist = this.camera.position.z - z
    const h = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * dist
    mesh.scale.set(h * this.camera.aspect * over, h * over, 1)
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this._fit(this.haze, this.haze.position.z, 1.2)
    this.moteMat.uniforms.uScale.value = Math.min(2, h / 700)
  }

  setScroll(v) { this.scrollTarget = v }
  setMouse(nx, ny) { this.mouseTarget.set(nx, ny) }
  start() { if (!this.running && !this.disposed) { this.running = true; this.clock.start(); this.loop() } }
  stop() { this.running = false }

  renderOnce() {
    this.renderer.render(this.scene, this.camera)
  }

  loop() {
    if (!this.running || this.disposed) return
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.time += dt

    // Everything chases its target rather than tracking it. The lag IS the
    // smoothness — the whole reason a site like this feels like butter.
    this.scroll += (this.scrollTarget - this.scroll) * Math.min(1, dt * 4)
    this.mouse.lerp(this.mouseTarget, Math.min(1, dt * 2.6))

    this.moteMat.uniforms.uTime.value = this.time
    this.hazeMat.uniforms.uTime.value = this.time
    this.hazeMat.uniforms.uScroll.value = this.scroll

    if (this.planetFade != null && this.planetFade < 1) {
      this.planetFade = Math.min(1, this.planetFade + dt * 1.4)
      this.planetMat.opacity = this.planetFade
    }

    // The planet breathes, tips to the pointer, shrinks and sinks out of frame
    // as the reader scrolls past — the same ride curated's camera takes.
    // Explicit scale on top of the z-recession: relying on perspective alone
    // reads as drifting away, not shrinking, until the scroll range is huge.
    const bob = Math.sin(this.time * 0.42) * 0.12
    const shrink = 1 - Math.min(0.62, this.scroll * 0.7)
    this.planet.position.set(
      this.planetHome.x + this.mouse.x * 0.34,
      this.planetHome.y + bob + this.mouse.y * 0.22 - this.scroll * 2.6,
      this.planetHome.z - this.scroll * 3.2
    )
    this.planet.scale.setScalar(this.planetScale * shrink)
    this.planet.rotation.z = Math.sin(this.time * 0.19) * 0.035 + this.mouse.x * 0.02

    // Parallax lives on the camera, so nebula, motes and haze separate without
    // any of them having to know about the pointer.
    this.camera.position.x = this.camBase.x + this.mouse.x * 0.42
    this.camera.position.y = this.camBase.y + this.mouse.y * 0.28
    this.camera.lookAt(0, this.mouse.y * 0.1, 0)

    this.motes.rotation.z = this.time * 0.006

    this.renderOnce()
    this.raf = requestAnimationFrame(this.loop)
  }

  dispose() {
    this.disposed = true
    this.stop()
    if (this.raf) cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    for (const d of this.disposables) d.dispose?.()
    this.renderer.dispose()
  }
}
