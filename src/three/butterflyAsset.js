// Shared loader + flyer factory for public/models/butterfly.glb.
//
// The GLB is fetched ONCE and parsed once PER RENDERER. Two things force that
// split: the hero backdrop and the page-wide companion are separate WebGL
// contexts, and three's GPU-side caches are keyed per renderer — handing the
// same BufferGeometry to both works right up until one of them disposes it out
// from under the other, which is a blank canvas with no console error.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const MODEL_URL = '/models/butterfly.glb'
let bufferPromise = null

function buffer() {
  if (!bufferPromise) {
    bufferPromise = fetch(MODEL_URL).then((r) => {
      if (!r.ok) throw new Error(`butterfly.glb: HTTP ${r.status}`)
      return r.arrayBuffer()
    })
    // a failed fetch must not poison every later attempt
    bufferPromise.catch(() => { bufferPromise = null })
  }
  return bufferPromise
}

export async function loadButterfly() {
  const buf = await buffer()
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  return loader.parseAsync(buf.slice(0), '')
}

// Wire one parsed butterfly for flight. Returns the pieces the fields drive:
// a body clip pair to crossfade on speed, and an ADDITIVE flap whose weight is
// the flap amplitude — that is what lets a butterfly burst and then glide,
// which a normal-blended wing clip cannot do at all (it would own the wing
// bones at full weight forever, no matter what weight you set).
export function prepFlyer(gltf, { tint = null, scale = 1, wingAlpha = 1 } = {}) {
  const root = gltf.scene
  root.scale.setScalar(scale)

  const disposables = []
  root.traverse((o) => {
    if (!o.isMesh) return
    // The wings sweep far outside the mesh's bind-pose bounds every stroke, and
    // a culled skinned mesh pops out of frame mid-flap.
    o.frustumCulled = false
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    const cloned = mats.map((m) => {
      const mat = m.clone()
      if (tint && (mat.name === 'ButterflyWing' || mat.name === 'ButterflyWool')) {
        mat.emissive = (mat.emissive || new THREE.Color(0)).clone().lerp(tint, 0.55)
        mat.emissiveIntensity = mat.name === 'ButterflyWing' ? 0.10 : 0.06
      }
      if (mat.name === 'ButterflyWing' && wingAlpha < 1) {
        mat.transparent = true
        mat.opacity = wingAlpha
        mat.depthWrite = false
      }
      disposables.push(mat)
      return mat
    })
    o.material = cloned.length === 1 ? cloned[0] : cloned
  })

  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]))
  const mixer = new THREE.AnimationMixer(root)

  const flutter = mixer.clipAction(clips.Flutter)
  flutter.play()
  flutter.time = Math.random() * clips.Flutter.duration

  const cruise = mixer.clipAction(clips.Cruise)
  cruise.play()
  cruise.weight = 0
  cruise.time = Math.random() * clips.Cruise.duration

  const flap = mixer.clipAction(clips.Flap, root, THREE.AdditiveAnimationBlendMode)
  flap.play()
  flap.time = Math.random() * clips.Flap.duration
  // Clip is 0.34s, so timeScale 1.9 lands around 5.6 Hz. Real butterflies run
  // 5-12 Hz; past ~9 the stroke starts to strobe against 60fps.
  flap.timeScale = 1.9

  return { root, mixer, flutter, cruise, flap, disposables }
}

// Object3D.clone() leaves a SkinnedMesh bound to the *original* skeleton, so
// every copy would animate off the first butterfly's bones. three ships
// SkeletonUtils for this; only the one function is needed, so it is inlined.
export function cloneSkinned(source) {
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

// Catmull-Rom through waypoints [[t, ...values], ...] with t ascending in [0,1].
// Used for the companion's flight path down the page.
export function waypointSampler(points) {
  const n = points.length - 1
  const dim = points[0].length - 1
  return (t, out = []) => {
    const x = THREE.MathUtils.clamp(t, points[0][0], points[n][0])
    let i = 0
    while (i < n - 1 && x > points[i + 1][0]) i++
    const p1 = points[i], p2 = points[i + 1]
    const p0 = points[Math.max(0, i - 1)], p3 = points[Math.min(n, i + 2)]
    const f = (x - p1[0]) / Math.max(1e-6, p2[0] - p1[0])
    const f2 = f * f, f3 = f2 * f
    for (let k = 1; k <= dim; k++) {
      const a = p0[k], b = p1[k], c = p2[k], d = p3[k]
      out[k - 1] = 0.5 * ((2 * b) + (-a + c) * f
        + (2 * a - 5 * b + 4 * c - d) * f2 + (-a + 3 * b - 3 * c + d) * f3)
    }
    return out
  }
}
