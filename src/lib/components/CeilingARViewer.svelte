<script>
  import { onMount } from 'svelte'
  import * as THREE from 'three'
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
  import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

  let { model, onClose } = $props()

  let overlayElement
  let modelLoaded = $state(false)
  let sessionActive = $state(false)
  let surfaceReady = $state(false)
  let hasPlacement = $state(false)
  let status = $state('Preparing the chandelier…')
  let error = $state('')
  let scalePercent = $state(100)

  let renderer
  let scene
  let camera
  let placedObject
  let reticle
  let activeSession
  let hitTestSource
  let lastHitPosition
  let scale = 1

  function setSurfaceReady(ready) {
    if (surfaceReady === ready) return
    surfaceReady = ready
    if (!hasPlacement) {
      status = ready
        ? 'Ceiling found · tap Place on ceiling'
        : 'Aim upward and move slowly to find the ceiling'
    }
  }

  function updateScene(frame) {
    const referenceSpace = renderer.xr.getReferenceSpace()
    if (!referenceSpace || !hitTestSource) return

    const viewerPose = frame.getViewerPose(referenceSpace)
    if (!viewerPose) return

    const viewerPosition = viewerPose.transform.position
    const viewerOrientation = viewerPose.transform.orientation
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion(
        viewerOrientation.x,
        viewerOrientation.y,
        viewerOrientation.z,
        viewerOrientation.w,
      ),
    )
    const aimingUp = forward.y > 0.12
    let candidate = null

    if (aimingUp) {
      for (const result of frame.getHitTestResults(hitTestSource)) {
        const pose = result.getPose(referenceSpace)
        if (!pose) continue

        const position = pose.transform.position
        const orientation = pose.transform.orientation
        const planeUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
          new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w),
        )
        const horizontalSurface = Math.abs(planeUp.y) > 0.86
        const aboveCamera = position.y > viewerPosition.y + 0.18

        if (horizontalSurface && aboveCamera) {
          candidate = { result, pose }
          break
        }
      }
    }

    if (!candidate) {
      lastHitPosition = null
      reticle.visible = false
      setSurfaceReady(false)
      return
    }

    const position = candidate.pose.transform.position
    lastHitPosition = new THREE.Vector3(position.x, position.y, position.z)
    reticle.position.set(
      position.x,
      position.y - 0.008,
      position.z,
    )
    reticle.visible = true
    setSurfaceReady(true)
  }

  function placeOnCeiling() {
    if (!lastHitPosition || !placedObject) return
    placedObject.position.copy(lastHitPosition)
    placedObject.scale.setScalar(scale)
    placedObject.visible = true
    hasPlacement = true
    status = 'Placed · tracking the ceiling position'
  }

  function resizeObject(amount) {
    scale = THREE.MathUtils.clamp(scale + amount, 0.5, 2.25)
    scalePercent = Math.round(scale * 100)
    if (placedObject) placedObject.scale.setScalar(scale)
  }

  async function startTracking() {
    if (!renderer || !navigator.xr?.requestSession) {
      error = 'Ceiling tracking needs an ARCore-compatible Android phone with Chrome.'
      return
    }

    error = ''
    status = 'Starting camera tracking…'

    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: ['dom-overlay', 'plane-detection', 'anchors'],
        domOverlay: { root: overlayElement },
      })

      activeSession = session
      await renderer.xr.setSession(session)
      const viewerSpace = await session.requestReferenceSpace('viewer')
      hitTestSource = await session.requestHitTestSource({ space: viewerSpace })

      session.addEventListener(
        'end',
        () => {
          activeSession = null
          hitTestSource = null
          sessionActive = false
          status = 'Tracking ended'
        },
        { once: true },
      )

      sessionActive = true
      status = 'Aim upward and move slowly to find the ceiling'
    } catch (cause) {
      if (activeSession) {
        activeSession.end().catch(() => {})
        activeSession = null
      }
      error = cause?.name === 'NotSupportedError'
        ? 'This browser does not support ceiling AR. Open the page in Chrome on an ARCore-compatible Android phone.'
        : 'Could not start AR. Allow camera access, then try again.'
      status = 'Ready to try again'
    }
  }

  function closeViewer() {
    if (activeSession) activeSession.end().catch(() => {})
    onClose?.()
  }

  onMount(() => {
    if (!navigator.xr?.requestSession) {
      error = 'Ceiling tracking needs an ARCore-compatible Android phone with Chrome.'
      status = 'AR browser not available'
      return
    }

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 30)

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.xr.enabled = true
    renderer.xr.setReferenceSpaceType('local-floor')
    overlayElement.querySelector('.ceiling-ar__scene').appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x59604e, 2.1))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(1.5, 3, 2)
    scene.add(keyLight)

    placedObject = new THREE.Group()
    placedObject.visible = false
    scene.add(placedObject)

    reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.065, 0.082, 40),
      new THREE.MeshBasicMaterial({ color: 0xcde99b, side: THREE.DoubleSide, depthTest: false }),
    )
    reticle.rotation.x = Math.PI / 2
    reticle.renderOrder = 10
    reticle.visible = false
    scene.add(reticle)

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(
      model,
      (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const center = box.getCenter(new THREE.Vector3())
        // The model's top (chain attachment) sits at the tracked ceiling point.
        gltf.scene.position.set(-center.x, -box.max.y, -center.z)
        placedObject.add(gltf.scene)
        modelLoaded = true
        status = 'Ready · start ceiling tracking'
      },
      undefined,
      () => {
        error = 'The chandelier model could not load. Close this view and try again.'
        status = 'Model unavailable'
      },
    )

    renderer.setAnimationLoop((_time, frame) => {
      if (frame && sessionActive) updateScene(frame)
      renderer.render(scene, camera)
    })

    const resize = () => {
      if (!renderer || !camera) return
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      if (activeSession) activeSession.end().catch(() => {})
      renderer?.setAnimationLoop(null)
      renderer?.dispose()
    }
  })
</script>

<dialog class="ceiling-ar" open bind:this={overlayElement} aria-modal="true" aria-label="Ceiling chandelier AR">
  <div class="ceiling-ar__scene" aria-hidden="true"></div>

  <header class="ceiling-ar__header">
    <div>
      <p class="ceiling-ar__eyebrow">LOOM STUDIO · CEILING TRACKING</p>
      <p class="ceiling-ar__status" aria-live="polite">{status}</p>
    </div>
    <button class="ceiling-ar__close" type="button" onclick={closeViewer} aria-label="Close ceiling AR">×</button>
  </header>

  {#if error}
    <p class="ceiling-ar__error" role="status">{error}</p>
  {/if}

  <div class="ceiling-ar__controls">
    {#if hasPlacement}
      <div class="ceiling-ar__scale" aria-label="Chandelier size controls">
        <button type="button" onclick={() => resizeObject(-0.1)} aria-label="Make chandelier smaller">−</button>
        <span>{scalePercent}%</span>
        <button type="button" onclick={() => resizeObject(0.1)} aria-label="Make chandelier larger">+</button>
      </div>
    {/if}

    {#if !sessionActive}
      <button class="ceiling-ar__action" type="button" onclick={startTracking} disabled={!modelLoaded}>
        {modelLoaded ? 'START CEILING TRACKING' : 'PREPARING MODEL…'}
      </button>
      <p class="ceiling-ar__hint">For Android, use Chrome on an ARCore-ready phone.</p>
    {:else}
      <button
        class="ceiling-ar__action"
        type="button"
        onclick={placeOnCeiling}
        disabled={!surfaceReady || !modelLoaded}
      >
        {hasPlacement ? 'REPOSITION ON CEILING' : 'PLACE ON CEILING'}
      </button>
      <p class="ceiling-ar__hint">Point at a flat ceiling and move your phone slowly until the ring appears.</p>
    {/if}
  </div>
</dialog>

<style>
  .ceiling-ar {
    position: fixed;
    z-index: 2147483000;
    inset: 0;
    overflow: hidden;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: #171b17;
    color: #f6f4ec;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    touch-action: manipulation;
  }

  .ceiling-ar__scene {
    position: absolute;
    inset: 0;
  }

  .ceiling-ar__header,
  .ceiling-ar__controls {
    position: absolute;
    z-index: 2;
    right: max(1rem, env(safe-area-inset-right));
    left: max(1rem, env(safe-area-inset-left));
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .ceiling-ar__header {
    top: max(1rem, env(safe-area-inset-top));
    padding: 1rem 1.1rem;
    border: 1px solid rgb(255 255 255 / 18%);
    background: rgb(20 23 20 / 76%);
    backdrop-filter: blur(18px);
  }

  .ceiling-ar__eyebrow {
    margin: 0 0 0.45rem;
    color: #c6d5bb;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.16em;
  }

  .ceiling-ar__status {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .ceiling-ar__close,
  .ceiling-ar__scale button {
    display: grid;
    width: 2.65rem;
    height: 2.65rem;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid rgb(255 255 255 / 24%);
    border-radius: 50%;
    background: rgb(255 255 255 / 10%);
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-size: 1.45rem;
  }

  .ceiling-ar__error {
    position: absolute;
    z-index: 3;
    top: 7.8rem;
    right: 1rem;
    left: 1rem;
    margin: 0;
    padding: 0.9rem 1rem;
    background: #492d24;
    color: #fff2e9;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .ceiling-ar__controls {
    bottom: max(1rem, env(safe-area-inset-bottom));
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    background: linear-gradient(transparent, rgb(13 16 13 / 84%) 22%);
  }

  .ceiling-ar__action {
    width: min(100%, 26rem);
    min-height: 3.5rem;
    border: 1px solid #d6c6a0;
    border-radius: 999px;
    background: #e7ddc7;
    color: #1f2b23;
    cursor: pointer;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
  }

  .ceiling-ar__action:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .ceiling-ar__hint {
    max-width: 28rem;
    margin: 0.65rem 0 0;
    color: rgb(255 255 255 / 76%);
    font-size: 0.78rem;
    line-height: 1.5;
    text-align: center;
  }

  .ceiling-ar__scale {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 0.45rem;
    padding: 0.35rem 0.6rem;
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 999px;
    background: rgb(20 23 20 / 76%);
    backdrop-filter: blur(18px);
  }

  .ceiling-ar__scale span {
    min-width: 3.2rem;
    font-size: 0.82rem;
    text-align: center;
  }

  :global(.ceiling-ar canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
