// Dev-only inspection rig for the generated bee: neutral studio light, a
// turntable, and ?clip=/?a=/?e=/?d= to frame any angle or animation clip.
// Not referenced by the site; see bee-lab.html.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const q = new URLSearchParams(location.search)
const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : d)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(num('bg', 0) ? '#f8d8e8' : '#ffe9f2')

// simple studio env so clearcoat / transmission have something to reflect
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
const dist = num('d', 2.4)
const az = num('a', 35) * Math.PI / 180
const el = num('e', 12) * Math.PI / 180
camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist)
camera.lookAt(0, 0, 0)

const key = new THREE.SpotLight(0xffe9c9, 60, 20, 0.7, 0.5, 1.5)
key.position.set(3, 4, 3)
scene.add(key, key.target)
scene.add(new THREE.DirectionalLight(0x8f6bd0, 2.2).translateX(-4))
const rim = new THREE.PointLight(0xffc740, 22, 10, 2)
rim.position.set(-1.6, 0.8, -2.2)
scene.add(rim)
scene.add(new THREE.AmbientLight(0x3a2a50, 1.6))

const hud = document.getElementById('hud')
let mixer = null
const clock = new THREE.Clock()

new GLTFLoader().load(q.get('src') || '/models/bee.glb', (gltf) => {
  const bee = gltf.scene
  scene.add(bee)
  const box = new THREE.Box3().setFromObject(bee)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  bee.position.sub(center)

  mixer = new THREE.AnimationMixer(bee)
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]))
  const body = q.get('clip') || 'Hover'
  if (clips[body]) mixer.clipAction(clips[body]).play()
  if (body !== 'Land' && clips.Flap) {
    const f = mixer.clipAction(clips.Flap)
    f.timeScale = num('flap', 1)
    f.play()
  }
  hud.textContent = [
    `clips: ${gltf.animations.map((c) => c.name).join(' ')}`,
    `playing: ${body}`,
    `bbox: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`,
  ].join('\n')
  hud.style.whiteSpace = 'pre'
  window.__beeReady = true
}, undefined, (e) => { hud.textContent = 'load failed: ' + e })

const spin = num('spin', 0)
function loop() {
  requestAnimationFrame(loop)
  const dt = Math.min(clock.getDelta(), 0.05)
  if (mixer) mixer.update(q.has('freeze') ? 0 : dt)
  if (spin) {
    const t = clock.getElapsedTime() * spin
    camera.position.set(Math.sin(t) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(t) * Math.cos(el) * dist)
    camera.lookAt(0, 0, 0)
  }
  renderer.render(scene, camera)
}
loop()

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
})
