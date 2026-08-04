// Dev-only inspection rig for the LIVE butterfly: a turntable against the
// site's own dark backdrop, using the exact same code path the real page
// runs — prepFlyer() from butterflyAsset.js, which is what Companion.js
// calls. This used to load public/models/butterfly.glb, a baked mesh that
// the site stopped rendering a while ago (see butterflyAsset.js's own
// header comment) — that made this lab useless for judging what visitors
// actually see. It now builds the same procedural, canvas-textured model
// Companion.js flies down the page, under the same lights, so a screenshot
// here is a screenshot of the real thing.
//
//   ?tint=0            skip the ORCHID emissive lift Companion applies (A/B)
//   ?lights=studio     swap Companion's page-rig lights for a neutral 3-point
//                       studio setup (A/B — isolates material from rig tuning)
//   ?flap=0..1         additive flap WEIGHT (amplitude), matches Companion
//   ?phase=0..1        freeze the flap at a fraction of its cycle
//   ?a=deg &e=deg &d=units   azimuth / elevation / distance
//   ?spin=0            stop the turntable
//   ?bg=#hex           backdrop colour (defaults to the page's #0d0716)
import * as THREE from 'three'
import { prepFlyer } from './butterflyAsset.js'

const q = new URLSearchParams(location.search)
const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : d)
const flag = (k, d) => (q.has(k) ? q.get(k) !== '0' && q.get(k) !== 'false' : d)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
renderer.outputColorSpace = THREE.SRGBColorSpace
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(q.get('bg') || '#0d0716')

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 100)
const dist = num('d', 3.2)
const az = (num('a', 25) * Math.PI) / 180
const el = (num('e', 12) * Math.PI) / 180
camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist)
camera.lookAt(0, 0, 0)

// ── lights ──
const lightsMode = q.get('lights') || 'page'
const VIOLET = new THREE.Color('#7b2fbe')
const MAGENTA = new THREE.Color('#f21c8c')
const WARM = new THREE.Color('#ffd9a0')
const ORCHID = new THREE.Color('#a67cff')
let rim = null, lamp = null

if (lightsMode === 'studio') {
  // Neutral judging light: does the MATERIAL itself have colour and depth,
  // independent of how the page's coloured rig happens to hit it.
  const key = new THREE.DirectionalLight(0xffffff, 3.0)
  key.position.set(2.5, 3.5, 4)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 1.1)
  fill.position.set(-3, -1, 2)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
} else {
  // Byte-for-byte the rig in Companion.js (constructor), so this lab
  // matches the real page exactly.
  const key = new THREE.DirectionalLight(WARM, 2.8)
  key.position.set(2.5, 3.5, 4)
  scene.add(key)
  const fill = new THREE.DirectionalLight(VIOLET, 1.8)
  fill.position.set(-3, -1, 2)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0x3a2856, 1.7))
  rim = new THREE.PointLight(ORCHID, 5, 6, 2)
  scene.add(rim)
  lamp = new THREE.PointLight(WARM, 8, 5, 2)
  scene.add(lamp)
}

const hud = document.getElementById('hud')
const clock = new THREE.Clock()
const spin = num('spin', 1)

const tintOn = flag('tint', true)
const flyer = prepFlyer(null, { tint: tintOn ? ORCHID : null, scale: 1 })
scene.add(flyer.root)

if (rim) rim.position.set(-1.0, 0.5, -1.4)
if (lamp) lamp.position.set(1.1, 1.2, 1.8)

flyer.flap.setEffectiveWeight(num('flap', 1))
if (q.has('phase')) {
  flyer.flap.time = num('phase', 0) * flyer.flap.getClip().duration
}

let meshN = 0, triN = 0
flyer.root.traverse((o) => {
  if (o.isMesh) {
    meshN++
    const idx = o.geometry.index
    triN += idx ? idx.count / 3 : o.geometry.attributes.position.count / 3
  }
})
const box = new THREE.Box3().setFromObject(flyer.root)
const size = box.getSize(new THREE.Vector3())
hud.textContent = [
  `variant: woven (procedural, live pipeline)`,
  `tint: ${tintOn ? 'on (ORCHID lift)' : 'off'}   lights: ${lightsMode}`,
  `meshes: ${meshN}   tris: ${Math.round(triN)}`,
  `bbox: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`,
].join('\n')
hud.style.whiteSpace = 'pre'
window.__labReady = true

function loop() {
  requestAnimationFrame(loop)
  const dt = Math.min(clock.getDelta(), 0.05)
  if (!q.has('phase')) flyer.mixer.update(dt)
  if (spin) flyer.root.rotation.y += dt * 0.35 * spin
  renderer.render(scene, camera)
}
loop()

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
})
