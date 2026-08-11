<!--
  ModelViewer — orbit/inspect a FORGE-generated GLB right on the dashboard,
  instead of only offering a download link. Follows Flyer.svelte's house
  idiom for mounting three.js in Svelte 5 (PORTING.md + Flyer.svelte's own
  header comment are the reference): dynamic `import('three')`, a top-level
  `$effect`, `bind:this` canvas, a `browser` guard, try/catch around the
  renderer's own construction, full dispose on teardown.

  Props:
    src   — GLB url to load (required; nothing boots without it)
    poster — optional preview image, shown before the model loads and as the
      permanent fallback when WebGL is unavailable
    alt   — accessible label for the poster/placeholder

  Context budget: this component does not decide how many viewers exist on
  the page — that policy lives in the caller (dashboard/+page.svelte opens
  at most one at a time, see the comment there). This component's own job is
  just to give back the WebGL context it took, reliably, the moment it is
  torn down — via `releaseRenderer` from $three/glContext.js, which exists
  precisely because `renderer.dispose()` alone leaves the context attached to
  the canvas (see that file's header comment).
-->
<script>
  import { browser } from '$app/environment'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import { hasWebGL } from '$three/webglSupport.js'
  import { releaseRenderer } from '$three/glContext.js'
  import './model-viewer.css'

  let { src, poster = null, alt = '3D model preview' } = $props()

  let wrap = $state(null)
  let canvas = $state(null)

  // 'boot' (checking WebGL) -> 'nogl' | 'loading' -> 'ready' | 'error'
  let phase = $state('boot')
  let errorMsg = $state(null)

  $effect(() => {
    if (!browser || !canvas || !wrap || !src) return
    if (!hasWebGL()) { phase = 'nogl'; return }

    phase = 'loading'
    errorMsg = null

    // Read once into a local at boot, same reasoning as Flyer.svelte: the
    // effect already re-subscribes to the rune because reading `.current`
    // inside the effect body tracks it, but the render loop below needs a
    // value it can flip synchronously on first interaction without fighting
    // a live subscription mid-frame.
    let reduced = reducedMotion.current

    let cancelled = false
    let THREE, renderer, scene, camera, model
    let rafId = 0
    let running = false // is the continuous rAF loop alive right now
    let tabVisible = !document.hidden
    let inView = true
    let userInteracted = false
    let resizeObs = null
    let io = null

    // ─── orbit state (manual — no OrbitControls import, full control over
    //     "auto-spin stops forever on first interaction") ──────────────────
    let target = null // THREE.Vector3, set after auto-frame
    let radius = 1
    let minRadius = 0.1
    let maxRadius = 100
    let theta = 0.6 // azimuth
    let phi = Math.PI / 2 - 0.3 // polar, clamped away from the poles below
    const PHI_EPS = 0.06
    let autoSpinSpeed = 0.12 // rad/s, gentle

    // active pointers, for drag-to-rotate and two-finger pinch-to-zoom
    const pointers = new Map()
    let dragLast = null

    function clampPhi(v) { return Math.min(Math.PI - PHI_EPS, Math.max(PHI_EPS, v)) }
    function clampRadius(v) { return Math.min(maxRadius, Math.max(minRadius, v)) }

    function applyCamera() {
      if (!camera || !target) return
      const sinPhi = Math.sin(phi)
      camera.position.set(
        target.x + radius * sinPhi * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * sinPhi * Math.cos(theta),
      )
      camera.lookAt(target)
    }

    // ─── render-on-demand for reduced motion: a static frame plus one more
    //     frame per interaction, never a running loop ─────────────────────
    function renderOnce() {
      if (!renderer || !scene || !camera) return
      applyCamera()
      renderer.render(scene, camera)
    }

    function startLoop() {
      if (running || reduced) return
      running = true
      let last = performance.now()
      const tick = (now) => {
        if (!running) return
        const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
        last = now
        if (!userInteracted) theta += autoSpinSpeed * dt
        applyCamera()
        renderer.render(scene, camera)
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }

    function stopLoop() {
      running = false
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    }

    function maybeRun() {
      if (reduced) { renderOnce(); return }
      if (tabVisible && inView) startLoop()
      else stopLoop()
    }

    function markInteracted() {
      if (userInteracted) return
      userInteracted = true // auto-spin stops permanently for this instance
    }

    function onPointerDown(e) {
      markInteracted()
      canvas.setPointerCapture?.(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) dragLast = { x: e.clientX, y: e.clientY }
    }
    function onPointerMove(e) {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.size === 2) {
        // pinch-to-zoom: scale radius by the change in finger distance
        const pts = [...pointers.values()]
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        if (onPointerMove._lastDist) {
          const scale = onPointerMove._lastDist / Math.max(1, dist)
          radius = clampRadius(radius * scale)
          if (reduced) renderOnce()
        }
        onPointerMove._lastDist = dist
        return
      }

      if (pointers.size === 1 && dragLast) {
        const dx = e.clientX - dragLast.x
        const dy = e.clientY - dragLast.y
        dragLast = { x: e.clientX, y: e.clientY }
        theta -= dx * 0.008
        phi = clampPhi(phi - dy * 0.008)
        if (reduced) renderOnce()
      }
    }
    function onPointerUp(e) {
      pointers.delete(e.pointerId)
      onPointerMove._lastDist = null
      if (pointers.size < 2) onPointerMove._lastDist = null
      if (pointers.size === 1) {
        const remaining = [...pointers.values()][0]
        dragLast = { x: remaining.x, y: remaining.y }
      } else {
        dragLast = null
      }
    }
    function onWheel(e) {
      e.preventDefault()
      markInteracted()
      radius = clampRadius(radius * (1 + Math.sign(e.deltaY) * 0.08))
      if (reduced) renderOnce()
    }
    function onTouchStart() { markInteracted() }

    async function boot() {
      try {
        THREE = await import('three')
      } catch {
        if (!cancelled) { phase = 'error'; errorMsg = "Couldn't load preview" }
        return
      }
      if (cancelled) return

      // ─── renderer ───────────────────────────────────────────────────────
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false })
      } catch {
        if (!cancelled) { phase = 'error'; errorMsg = "Couldn't load preview" }
        return
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.05

      const rect = wrap.getBoundingClientRect()
      const w = Math.max(1, rect.width)
      const h = Math.max(1, rect.height)
      renderer.setSize(w, h, false)

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000)

      // ─── neutral lighting: no HDR, no CDN fetch, just a key + fill +
      //     ambient/hemisphere rig, all defined in code ────────────────────
      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9)
      const key = new THREE.DirectionalLight(0xffffff, 1.6)
      key.position.set(2.5, 3.5, 3)
      const fill = new THREE.DirectionalLight(0xffffff, 0.55)
      fill.position.set(-3, 1.5, -2)
      const ambient = new THREE.AmbientLight(0xffffff, 0.35)
      scene.add(hemi, key, fill, ambient)

      // ─── load the model ─────────────────────────────────────────────────
      let GLTFLoaderMod
      try {
        GLTFLoaderMod = await import('three/examples/jsm/loaders/GLTFLoader.js')
      } catch {
        if (!cancelled) { phase = 'error'; errorMsg = "Couldn't load preview" }
        return
      }
      if (cancelled) return

      const loader = new GLTFLoaderMod.GLTFLoader()
      loader.load(
        src,
        (gltf) => {
          if (cancelled) return
          model = gltf.scene || gltf.scenes?.[0]
          if (!model) { phase = 'error'; errorMsg = "Couldn't load preview"; return }
          scene.add(model)

          // ─── auto-frame: size the camera off the model's own bounding
          //     box, never a hardcoded distance — Meshy models range from a
          //     few centimetres to a few metres in their authored units ────
          const box = new THREE.Box3().setFromObject(model)
          const size = new THREE.Vector3()
          const center = new THREE.Vector3()
          box.getSize(size)
          box.getCenter(center)
          const maxDim = Math.max(size.x, size.y, size.z, 0.0001)

          target = center
          const fovRad = (camera.fov * Math.PI) / 180
          const fitDistance = (maxDim / (2 * Math.tan(fovRad / 2))) * 1.7
          radius = fitDistance
          minRadius = maxDim * 0.35
          maxRadius = fitDistance * 6
          camera.near = Math.max(maxDim / 200, 0.001)
          camera.far = fitDistance * 50 + maxDim * 10
          camera.updateProjectionMatrix()
          applyCamera()

          phase = 'ready'
          if (reduced) renderOnce()
          else maybeRun()
        },
        undefined,
        () => {
          if (cancelled) return
          phase = 'error'
          errorMsg = "Couldn't load preview"
        },
      )

      // ─── resize the canvas with its container, not the window — this
      //     viewer lives inside a click-to-expand row, not the full page ───
      resizeObs = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry || !renderer || !camera) return
        const cw = Math.max(1, entry.contentRect.width)
        const ch = Math.max(1, entry.contentRect.height)
        renderer.setSize(cw, ch, false)
        camera.aspect = cw / ch
        camera.updateProjectionMatrix()
        if (reduced) renderOnce()
      })
      resizeObs.observe(wrap)

      // ─── pause when the tab is hidden or the canvas scrolls out of view ──
      const onVis = () => { tabVisible = !document.hidden; maybeRun() }
      document.addEventListener('visibilitychange', onVis)

      io = new IntersectionObserver(([entry]) => {
        inView = !!entry?.isIntersecting
        maybeRun()
      }, { threshold: 0.01 })
      io.observe(wrap)

      canvas.style.touchAction = 'none'
      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointercancel', onPointerUp)
      canvas.addEventListener('wheel', onWheel, { passive: false })
      canvas.addEventListener('touchstart', onTouchStart, { passive: true })

      cleanupExtra = () => {
        document.removeEventListener('visibilitychange', onVis)
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointercancel', onPointerUp)
        canvas.removeEventListener('wheel', onWheel)
        canvas.removeEventListener('touchstart', onTouchStart)
      }
    }

    let cleanupExtra = null
    boot()

    return () => {
      cancelled = true
      stopLoop()
      resizeObs?.disconnect()
      io?.disconnect()
      cleanupExtra?.()

      // ─── full dispose: geometries, materials and every texture map a
      //     material might carry, then hand the WebGL context itself back
      //     via glContext.js's releaseRenderer (dispose() alone leaves the
      //     context attached to the canvas — see that file's header) ──────
      if (scene) {
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose()
          const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
          for (const mat of mats) {
            const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'displacementMap', 'alphaMap', 'envMap', 'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap']
            for (const key of maps) mat[key]?.dispose?.()
            mat.dispose?.()
          }
        })
      }
      if (renderer) releaseRenderer(renderer)
    }
  })
</script>

<div class="mv-wrap" bind:this={wrap}>
  {#if phase === 'nogl'}
    <div class="mv-fallback" role="img" aria-label={alt}>
      {#if poster}
        <img src={poster} alt={alt} loading="lazy" decoding="async" />
      {:else}
        <span class="mv-fallback-box" aria-hidden="true"></span>
        <p>3D preview needs WebGL — download the file instead.</p>
      {/if}
    </div>
  {:else if phase === 'error'}
    <div class="mv-fallback mv-fallback--error">
      {#if poster}<img src={poster} alt="" loading="lazy" decoding="async" />{/if}
      <p>{errorMsg}</p>
    </div>
  {:else}
    <!-- Canvas is always mounted once we get past the WebGL check, so there
         is no layout shift when the model finishes loading — the wrapper's
         own aspect-ratio (model-viewer.css) reserves the space up front. -->
    <canvas bind:this={canvas} aria-label={alt}></canvas>
    {#if phase === 'loading'}
      <div class="mv-loading" aria-hidden="true">
        <span class="mv-loading-box"></span>
      </div>
    {/if}
  {/if}
</div>
