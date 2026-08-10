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
//   ?flap=0..1         additive flap WEIGHT (amplitude), matches Companion.
//                       Explicit presence of this param OVERRIDES whatever
//                       weight the active flight profile would otherwise set
//                       (rig overrides from the profile still apply).
//   ?phase=0..1        freeze the flap at a fraction of its cycle (also
//                       freezes the flight profile — nothing animates)
//   ?a=deg &e=deg &d=units   azimuth / elevation / distance
//   ?spin=0            stop the turntable
//   ?bg=#hex           backdrop colour (defaults to the page's #ffe9f2)
//   ?flight=a|b|c      flight profile (a=Glider, b=Flutter, c=Darter) — same
//                       registry the real page uses (src/three/flight/),
//                       persisted to sessionStorage; keys 1/2/3 switch live.
//                       Drives flyer.rig every frame so a profile author can
//                       see their own wing-rig behaviour on the turntable.
import * as THREE from 'three'
import { prepFlyer } from './butterflyAsset.js'
import {
  resolveInitialProfileId, loadProfile, bindProfileHotkeys, applyRigOverrides,
  formatHudText, mulberry32,
} from './flight/index.js'

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
scene.background = new THREE.Color(q.get('bg') || '#ffe9f2')

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
  // `frozen` (below) skips mixer.update() every frame so the turntable holds
  // still — but mixer.update() is also the ONLY thing that ever calls
  // bf.update(), which is what actually poses the wing hinges from flap.time.
  // Setting flap.time alone left the model sitting at whatever pose
  // createButterfly() constructs it in (wings at rest/fully spread) no matter
  // what ?phase asked for. Bake the requested pose once here by calling
  // mixer.update with a dt that lands flap.time exactly on the target instead
  // of advancing it further.
  const target = num('phase', 0) * flyer.flap.getClip().duration
  flyer.flap.time = 0
  flyer.mixer.update(target / flyer.flap.timeScale)
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
const baseHud = [
  `variant: woven (procedural, live pipeline)`,
  `tint: ${tintOn ? 'on (ORCHID lift)' : 'off'}   lights: ${lightsMode}`,
  `meshes: ${meshN}   tris: ${Math.round(triN)}`,
  `bbox: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`,
]
hud.style.whiteSpace = 'pre'

// ── flight profile: same registry/switching mechanics as Companion.js ──
const flapExplicit = q.has('flap')
const frozen = q.has('phase')
let profile = null, profileState = null, profileId = null, profileLabel = null
let rng = Math.random
let labTime = 0

function buildCtx(dt) {
  return {
    t: labTime,
    dt,
    // The turntable has no scroll and no real flight path — a profile
    // author reading these gets a static, honest zero rather than a faked
    // number.
    scrollP: 0, scrollRaw: 0, scrollVel: 0,
    pos: flyer.root.position,
    speed: 0,
    baseScale: 1,
    isMobile: false,
    rng,
  }
}

function updateHud() {
  const flightLine = profileId ? formatHudText(profileId, profileLabel) : 'flight: loading…'
  hud.textContent = [...baseHud, '', flightLine].join('\n')
}
updateHud()

async function setProfile(id) {
  const loaded = await loadProfile(id)
  if (profile && typeof profile.dispose === 'function') {
    try { profile.dispose(profileState) } catch (e) { /* profile bug, not ours */ }
  }
  profile = loaded.module
  profileId = loaded.id
  profileLabel = loaded.label
  rng = mulberry32((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0)
  profileState = typeof profile.init === 'function' ? (profile.init(buildCtx(0)) || {}) : {}
  updateHud()
}
bindProfileHotkeys((id) => setProfile(id))
setProfile(resolveInitialProfileId())

window.__labReady = true

function loop() {
  requestAnimationFrame(loop)
  const dt = Math.min(clock.getDelta(), 0.05)
  labTime += dt
  if (!frozen) {
    const drive = (profile && typeof profile.update === 'function')
      ? (profile.update(buildCtx(dt), profileState) || {})
      : {}
    if (!flapExplicit && drive.flapWeight != null) {
      flyer.flap.setEffectiveWeight(THREE.MathUtils.clamp(drive.flapWeight, 0, 1))
    }
    if (drive.flapRate != null) flyer.flap.timeScale = drive.flapRate * flyer.flap.getClip().duration
    applyRigOverrides(flyer, drive.rig)
    flyer.mixer.update(dt)
  }
  if (spin) flyer.root.rotation.y += dt * 0.35 * spin
  renderer.render(scene, camera)
}
loop()

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
})
