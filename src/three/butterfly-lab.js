// Dev-only inspection rig for the generated butterfly: neutral studio light, a
// turntable, and query params to freeze any angle, clip or flap phase.
// Not referenced by the site; see butterfly-lab.html.
//
//   ?clip=Flutter|Cruise|Land   body clip
//   ?flap=0..1                  additive flap WEIGHT (amplitude), not rate
//   ?phase=0..1                 freeze the flap at a fraction of its cycle
//   ?a=deg &e=deg &d=units      azimuth / elevation / distance
//   ?spin=0                     stop the turntable
//   ?src=/models/butterfly.glb
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const q = new URLSearchParams(location.search)
const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : d)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
renderer.outputColorSpace = THREE.SRGBColorSpace
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(q.get('bg') || '#0d0716')

// studio env so sheen and clearcoat have something to catch
const w = 32, h = 16
const data = new Uint8Array(w * h * 4)
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const v = y / (h - 1)
    const c = new THREE.Color('#3a2450').lerp(new THREE.Color('#ffd0a0'), Math.max(0, 1 - Math.abs(v - 0.3) * 3))
    const i = (y * w + x) * 4
    data[i] = c.r * 255; data[i + 1] = c.g * 255; data[i + 2] = c.b * 255; data[i + 3] = 255
  }
}
const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
tex.mapping = THREE.EquirectangularReflectionMapping
tex.colorSpace = THREE.SRGBColorSpace
tex.needsUpdate = true
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromEquirectangular(tex).texture

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 100)
const dist = num('d', 3.0)
const az = num('a', 30) * Math.PI / 180
const el = num('e', 20) * Math.PI / 180
camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist)
camera.lookAt(0, 0, 0)

const key = new THREE.SpotLight(0xffe9c9, 60, 20, 0.7, 0.5, 1.5)
key.position.set(3, 4, 3)
scene.add(key, key.target)
scene.add(new THREE.DirectionalLight(0x8f6bd0, 2.4).translateX(-4))
const rim = new THREE.PointLight(0xff5fd0, 22, 10, 2)
rim.position.set(-1.6, 0.8, -2.2)
scene.add(rim)
scene.add(new THREE.AmbientLight(0x3a2a50, 1.8))

const hud = document.getElementById('hud')
let mixer = null, flapAction = null, rig = null
const clock = new THREE.Clock()
const spin = num('spin', 1)

const loader = new GLTFLoader()
loader.setMeshoptDecoder(MeshoptDecoder)
loader.load(q.get('src') || '/models/butterfly.glb', (gltf) => {
  rig = gltf.scene
  scene.add(rig)
  const box = new THREE.Box3().setFromObject(rig)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  rig.position.sub(center)

  mixer = new THREE.AnimationMixer(rig)
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]))
  const body = q.get('clip') || 'Flutter'
  if (clips[body]) mixer.clipAction(clips[body]).play()
  if (clips.Flap) {
    // Additive, so the weight is flap AMPLITUDE and the body clip keeps
    // ownership of the wings' mean pose. Same wiring the site uses.
    flapAction = mixer.clipAction(clips.Flap, rig, THREE.AdditiveAnimationBlendMode)
    flapAction.setEffectiveWeight(num('flap', body === 'Land' ? 0 : 1))
    flapAction.play()
    if (q.has('phase')) {
      flapAction.paused = true
      flapAction.time = num('phase', 0) * clips.Flap.duration
    }
  }

  let skinned = 0, bonesN = 0
  rig.traverse((o) => { if (o.isSkinnedMesh) { skinned++; bonesN = o.skeleton.bones.length } })
  hud.textContent = [
    `clips: ${gltf.animations.map((c) => c.name).join(' ')}`,
    `playing: ${body}  flap-weight: ${flapAction ? flapAction.getEffectiveWeight().toFixed(2) : 'n/a'}`,
    `skinnedMesh: ${skinned}   bones: ${bonesN}`,
    `bbox: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`,
  ].join('\n')
  hud.style.whiteSpace = 'pre'
  window.__labReady = true
}, undefined, (e) => {
  hud.textContent = `LOAD FAILED: ${e?.message || e}`
  window.__labReady = 'error'
})

function loop() {
  requestAnimationFrame(loop)
  const dt = Math.min(clock.getDelta(), 0.05)
  if (mixer) mixer.update(dt)
  if (rig && spin) rig.rotation.y += dt * 0.35 * spin
  renderer.render(scene, camera)
}
loop()

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
})
