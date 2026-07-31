// The Weave — a living particle thread-field, echoing the "Edge of
// Creativity" cover: iridescent grains flowing over a dark violet ground.
// Vanilla three.js, inline GLSL (no shader plugins), DPR-capped, pausable.
import * as THREE from 'three'

const VERT = /* glsl */ `
uniform float uTime;
uniform float uScroll;
uniform vec2  uMouse;      // world-space, lerped
uniform float uPixelRatio;
attribute float aSeed;
varying float vGlow;
varying float vSeed;

// ——— simplex noise (Ashima) ———
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main(){
  vSeed = aSeed;
  vec3 p = position;
  float t = uTime * 0.18;

  // layered waves — the fabric of the weave
  float wave = snoise(vec3(p.x * 0.22, p.z * 0.30, t)) * 1.35;
  wave += snoise(vec3(p.x * 0.55 + 7.0, p.z * 0.62, t * 1.6)) * 0.45;
  wave += sin(p.x * 0.35 + uTime * 0.35 + p.z * 0.5) * 0.22;
  p.y += wave;

  // scroll unravels the weave upward
  p.y += uScroll * (1.5 + aSeed * 2.5);
  p.x += uScroll * (aSeed - 0.5) * 4.0;

  // mouse swell
  float md = length(p.xz - uMouse);
  float push = smoothstep(3.2, 0.0, md);
  p.y += push * 0.9;

  vGlow = smoothstep(-0.4, 1.6, wave) + push * 1.2;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = (1.1 + aSeed * 2.2) * (1.0 + vGlow * 0.8);
  gl_PointSize = size * uPixelRatio * (18.0 / -mv.z);
}
`

const FRAG = /* glsl */ `
precision highp float;
varying float vGlow;
varying float vSeed;
uniform float uTime;

void main(){
  vec2 uv = gl_PointCoord.xy - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.05, d);

  // violet ground -> magenta ridge -> iridescent sparkle on the crests
  vec3 deep    = vec3(0.16, 0.07, 0.32);
  vec3 magenta = vec3(0.95, 0.11, 0.55);
  vec3 spark   = vec3(0.35, 0.9, 1.0);
  vec3 gold    = vec3(1.0, 0.78, 0.25);

  vec3 col = mix(deep, magenta, smoothstep(0.15, 1.1, vGlow));
  float irid = step(0.93, fract(vSeed * 61.7 + uTime * 0.02));
  col = mix(col, mix(spark, gold, step(0.5, fract(vSeed * 17.3))), irid * smoothstep(0.6, 1.4, vGlow));
  col += vGlow * 0.12;

  gl_FragColor = vec4(col, alpha * (0.5 + vGlow * 0.45));
}
`

export class HeroField {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas
    this.reduced = reduced
    this.running = false
    this.disposed = false
    this.scrollTarget = 0
    this.mouseTarget = new THREE.Vector2(0, 0)

    const isMobile = window.innerWidth < 768
    const count = reduced ? 4000 : isMobile ? 16000 : 42000

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80)
    this.camera.position.set(0, 2.6, 9.5)
    this.camera.lookAt(0, 0.4, 0)

    // ribbon of particles: wide in x, deep in z
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 26
      const z = (Math.random() - 0.5) * 14 - 1
      const y = (Math.random() - 0.5) * 0.4
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z
      seed[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

    this.uniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.6) },
    }
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.points = new THREE.Points(geo, mat)
    this.scene.add(this.points)
    this.geo = geo; this.mat = mat

    this.clock = new THREE.Clock()
    this.resize = this.resize.bind(this)
    this.loop = this.loop.bind(this)
    window.addEventListener('resize', this.resize)
    this.resize()

    if (reduced) { this.renderOnce() } else { this.start() }
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    if (this.reduced) this.renderOnce()
  }

  setScroll(v) { this.scrollTarget = v }
  setMouse(nx, ny) { this.mouseTarget.set(nx * 12, ny * 6) }

  renderOnce() {
    this.uniforms.uTime.value = 2.5
    this.renderer.render(this.scene, this.camera)
  }

  start() { if (!this.running && !this.disposed) { this.running = true; this.clock.start(); this.loop() } }
  stop() { this.running = false }

  loop() {
    if (!this.running || this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const u = this.uniforms
    u.uTime.value += Math.min(this.clock.getDelta(), 0.05)
    u.uScroll.value += (this.scrollTarget - u.uScroll.value) * 0.06
    u.uMouse.value.x += (this.mouseTarget.x - u.uMouse.value.x) * 0.05
    u.uMouse.value.y += (this.mouseTarget.y - u.uMouse.value.y) * 0.05
    this.camera.position.y = 2.6 + u.uScroll.value * 1.4
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    this.stop()
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    this.geo.dispose(); this.mat.dispose(); this.renderer.dispose()
  }
}
