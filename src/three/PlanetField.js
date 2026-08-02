// PlanetField — the hero backdrop: the knitted LOOM planet suspended in a
// nebula, treated the way curated.media treats theirs.
//
// What was actually borrowed from curated.media is not their art, it is their
// RECIPE, and it is four things:
//   1. a deep, single-hue environment that the subject is lit out of
//   2. one bright subject carrying all the saturation in frame
//   3. a haze sheet drifting BETWEEN the lens and the subject, so the depth is
//      something you look through rather than at
//   4. bloom + vignette + a little grain over the whole thing, so it reads as
//      photographed rather than rendered
// Their version of (1) is a 2.7 MB photographic backplate. Ours is a shader —
// same look, no bytes, and no third decoded bitmap on a page that was already
// crashing iPhones on image memory (see src/lib/viewportBudget.js). The planet
// itself is the only texture in the scene.
//
// Same public API as ButterflyField/CuratedField: setScroll / setMouse /
// start / stop / resize / dispose.
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

const PLANET_MAP = '/img/hero/planet.webp'

// The site's own palette — styles.css :root, not a new set of colours.
const BG = new THREE.Color('#0d0716')
const VIOLET = new THREE.Color('#5a2292')
const MAGENTA = new THREE.Color('#b3126a')

/* ── the environment ───────────────────────────────────────────────────────
   Two octaves of value noise warped by a third, which is enough for cloud
   without looking like a plasma demo, plus a hashed star field that twinkles
   on a slow beat. Drawn on one quad pinned to the far plane. */
const NebulaShader = {
  uniforms: {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uAspect: { value: 1 },
    uBg: { value: BG },
    uViolet: { value: VIOLET },
    uMagenta: { value: MAGENTA },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform float uTime, uScroll, uAspect;
    uniform vec3 uBg, uViolet, uMagenta;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                 mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
      float t = uTime * 0.012;

      // domain warp — the clouds curl instead of sliding
      vec2 q = vec2(fbm(uv * 1.6 + t), fbm(uv * 1.6 + vec2(4.3, 1.7) - t));
      float cloud = fbm(uv * 2.1 + q * 1.4 + vec2(0.0, uScroll * 0.35));

      // two dyes, never a third: violet is the field, magenta is the bloom in it
      vec3 col = mix(uBg, uViolet, smoothstep(0.22, 0.86, cloud) * 1.05);
      col = mix(col, uMagenta, smoothstep(0.55, 0.98, cloud) * 0.62);

      // the field falls off at the edges so the frame is dark where the type sits
      float r = length(uv * vec2(0.72, 1.0));
      col *= 1.0 - smoothstep(0.40, 1.30, r) * 0.55;

      // stars, on a coarse grid so they land on pixels rather than crawling
      vec2 g = floor(uv * 190.0);
      float s = hash(g);
      float star = smoothstep(0.9975, 1.0, s);
      float twinkle = 0.55 + 0.45 * sin(uTime * 1.4 + s * 90.0);
      col += star * twinkle * (0.5 + 0.5 * hash(g + 3.1)) * 0.9;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

/* ── the grade ─────────────────────────────────────────────────────────────
   Vignette, a touch of saturation, and grain — the pass that stops the whole
   thing reading as a render. Lifted from CuratedField, which lifted the
   numbers from curated.media's own effect stack. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.62 },
    uNoise: { value: 0.055 },
    uSaturation: { value: 0.12 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uNoise, uSaturation;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, 1.0 + uSaturation);
      vec2 uv = (vUv - 0.5) * 2.0;
      c.rgb *= clamp(1.0 - uVignette * (dot(uv, uv) - 0.5), 0.0, 1.0);
      c.rgb += (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * uNoise;
      gl_FragColor = c;
    }
  `,
}

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

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !narrow, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrow ? 1.4 : 1.75))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = BG.clone()

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    this.camera.position.set(0, 0, 7)
    this.camBase = this.camera.position.clone()

    const quad = new THREE.PlaneGeometry(1, 1)
    this.disposables.push(quad)

    // ── environment. Pinned to the far plane and sized to the frustum there,
    //    so it always fills whatever the viewport turns out to be.
    // uniforms cloned, never shared: a second instance (HMR, a lab page) would
    // otherwise drive this one's time and aspect
    this.nebulaMat = new THREE.ShaderMaterial({
      vertexShader: NebulaShader.vertexShader,
      fragmentShader: NebulaShader.fragmentShader,
      uniforms: THREE.UniformsUtils.clone(NebulaShader.uniforms),
      depthWrite: false,
    })
    this.disposables.push(this.nebulaMat)
    this.nebula = new THREE.Mesh(quad, this.nebulaMat)
    this.nebula.position.z = -18
    this.nebula.renderOrder = -1
    this.scene.add(this.nebula)

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
    this.planet.scale.setScalar(narrow ? 3.2 : 3.6)
    // clear of the headline: the type owns the left two thirds, the planet
    // the right, and neither is asked to share a column
    this.planetHome = new THREE.Vector3(narrow ? 0 : 2.32, narrow ? 0.6 : 0.5, 0)
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
      vertexShader: NebulaShader.vertexShader,
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

    if (!reduced) {
      this.composer = new EffectComposer(this.renderer)
      this.composer.addPass(new RenderPass(this.scene, this.camera))
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.62, 0.78)
      this.composer.addPass(this.bloom)
      this.grade = new ShaderPass(GradeShader)
      this.composer.addPass(this.grade)
    }

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
    this.composer?.setSize(w, h)
    this.bloom?.setSize(w, h)
    this.nebulaMat.uniforms.uAspect.value = this.camera.aspect
    this._fit(this.nebula, this.nebula.position.z)
    this._fit(this.haze, this.haze.position.z, 1.2)
    this.moteMat.uniforms.uScale.value = Math.min(2, h / 700)
  }

  setScroll(v) { this.scrollTarget = v }
  setMouse(nx, ny) { this.mouseTarget.set(nx, ny) }
  start() { if (!this.running && !this.disposed) { this.running = true; this.clock.start(); this.loop() } }
  stop() { this.running = false }

  renderOnce() {
    this.composer ? this.composer.render() : this.renderer.render(this.scene, this.camera)
  }

  loop() {
    if (!this.running || this.disposed) return
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.time += dt

    // Everything chases its target rather than tracking it. The lag IS the
    // smoothness — the whole reason a site like this feels like butter.
    this.scroll += (this.scrollTarget - this.scroll) * Math.min(1, dt * 4)
    this.mouse.lerp(this.mouseTarget, Math.min(1, dt * 2.6))

    this.nebulaMat.uniforms.uTime.value = this.time
    this.nebulaMat.uniforms.uScroll.value = this.scroll
    this.moteMat.uniforms.uTime.value = this.time
    this.hazeMat.uniforms.uTime.value = this.time
    this.hazeMat.uniforms.uScroll.value = this.scroll
    if (this.grade) this.grade.uniforms.uTime.value = this.time

    if (this.planetFade != null && this.planetFade < 1) {
      this.planetFade = Math.min(1, this.planetFade + dt * 1.4)
      this.planetMat.opacity = this.planetFade
    }

    // The planet breathes, tips to the pointer, and sinks out of frame as the
    // reader scrolls past — the same ride curated's camera takes.
    const bob = Math.sin(this.time * 0.42) * 0.12
    this.planet.position.set(
      this.planetHome.x + this.mouse.x * 0.34,
      this.planetHome.y + bob + this.mouse.y * 0.22 - this.scroll * 2.6,
      this.planetHome.z - this.scroll * 3.2
    )
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
    this.composer?.dispose?.()
    this.renderer.dispose()
  }
}
