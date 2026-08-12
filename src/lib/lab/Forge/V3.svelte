<!--
  LOOM FORGE — lab concept 3 of 3, "THE FIELD".

  WHY THIS EXISTS. Four rejections in a row on this section shared one shape:
  a photograph of a sofa, sliced, tripled or spun. The client's objection was
  never the copy — it was that every version showed the same one product shot
  dressed three ways. This concept shows no photograph at all. Nothing beige,
  no furniture, nothing captured with a camera. Every pixel here is drawn at
  runtime from vertex lists, which is the only way to make the claim "we
  rebuild ANYTHING, there are a lot of them" without picking one thing to be
  the poster child of "anything."

  THE ENGINE. Hand-rolled 3D — vertices, a Y/X rotation matrix, a perspective
  divide, canvas `stroke()`/`fill()`. No three.js: it already owns the page's
  hero butterfly and a second WebGL context on one page is a real cost the
  brief explicitly ruled out. Canvas 2D at this vertex count (four ~30-60
  vert composite solids, a dozen primitives) is nowhere near its ceiling —
  the whole frame is a few hundred `lineTo` calls.

  ONLY THE FOUR NAMED OBJECTS RESOLVE. The approved copy names exactly four
  things — "a chair, a bottle, a shoe, a part" — and only those four are built
  as real composite solids with faces, so only those four can be lit and
  filled. The filler primitives (cubes, a cylinder, a torus) are wireframe
  ONLY: no faces are computed for them, which is not a shortcut taken for
  time, it is the honest shape of the claim. The copy names four kinds of
  thing, not twelve — resolving a torus into a lit solid would silently
  promise a fifth category nobody approved.

  RESOLVE IS TIME-DRIVEN, NOT MOUSE-DRIVEN. Each featured object runs its own
  looped journey — drifts in from an edge, dips toward the camera through
  the screen's centre, drifts back out — on its own period and phase so the
  four never resolve in sync. Solid-ness is `smoothstep` of how close the
  object currently is to mid-journey (screen-centre-ish AND nearest-to-camera
  at once), which is what makes "resolves near the centre, fades back to wire
  going away" true by construction instead of by scripting four keyframes by
  hand.

  BUDGET. One rAF loop, started/stopped by an IntersectionObserver on the
  section root per src/lib/viewportBudget.js's off-screen contract — this
  loop is the only per-frame work this file owns, so pausing it off-screen is
  the whole budget story. DPR-aware canvas sized on resize via a ResizeObserver
  fallback to window resize. Full teardown (RO, IO, rAF, resize) on unmount.
  `prefers-reduced-motion` never enters the rAF path at all: it composes and
  paints ONE frame with hand-picked journey positions (not "paused mid-loop",
  which reads as broken) and returns before the loop is ever started.

  THE PAYOFF (added after client sign-off on the field itself). Everything
  above proves "we rebuild ANYTHING" by refusing to show any one thing. That
  claim needs exactly one counter-example to become believable instead of
  abstract: a real photo next to the real geometry it became. `SofaModel.js`
  (the one helper file this component is allowed) owns a REAL blue-sofa GLB,
  genuinely rendered with three.js, genuinely draggable — the second WebGL
  context on this page, the first being the hero/companion butterfly's. Three
  rules keep that second context from being the liability $three/glContext.js
  warns about:
    1. LAZY. Nothing about three, GLTFLoader or the 400KB model is imported
       at module scope here — see `ensureSofaModel()` below, a dynamic
       `import()` gated by its own IntersectionObserver so the fetch doesn't
       even start until the section is nearing the viewport.
    2. ONE rAF. This file's own `frame(t)` loop — the one already driving the
       wireframe field — calls `sofaMod.renderFrame(t)` on the same tick, so
       there is exactly one requestAnimationFrame id on this whole component,
       not two loops independently vsync-scheduled and free to drift.
    3. RELEASE ON EXIT. `sofaMod.release()` calls `releaseRenderer()` the
       moment the payoff panel leaves the (generously margined) viewport —
       not "stop rendering," actually hand the GL context back — and
       `sofaMod.acquire()` reopens it on return. The parsed GLTF scene graph
       is kept in memory across that cycle (module-scope cache in
       SofaModel.js); only the renderer, the capped resource, opens and
       closes with visibility.
  `prefers-reduced-motion`, `navigator.connection.saveData`, and a failed
  `hasWebGL()` probe all take the SAME branch: the renderer is never
  constructed at all, and the panel shows a pre-rendered still
  (sofa-model.avif/webp, captured once via a headless Playwright pass over
  this exact scene) which doubles as the loading poster on a capable device
  while the GLB is still in flight.
-->
<script>
  import { onMount, onDestroy } from 'svelte'
  import { reducedMotion, prefersReduced } from '$lib/motion.svelte.js'
  import { hasWebGL } from '$three/webglSupport.js'
  import WoolButton from '$lib/components/WoolButton.svelte'

  // ---------------------------------------------------------------------
  // geometry — vertices + faces in local (object) space, +Y up, unit-ish scale
  // ---------------------------------------------------------------------

  const TAU = Math.PI * 2

  /** An axis-aligned box, `size` = [w,h,d], centred on `center` (or origin).
   *  Returns {verts, faces} — faces are 4-index quads, wound so a simple
   *  "away from centroid" normal is enough for flat shading; a box never
   *  needs a real normal computation. */
  function box(size, center = [0, 0, 0]) {
    const [w, h, d] = size.map((n) => n / 2)
    const [cx, cy, cz] = center
    const s = [-1, 1]
    const verts = []
    for (const x of s) for (const y of s) for (const z of s) verts.push([cx + x * w, cy + y * h, cz + z * d])
    // index order from the loop above: 000,001,010,011,100,101,110,111 (x,y,z bits)
    const i = (x, y, z) => x * 4 + y * 2 + z
    const faces = [
      [i(0, 0, 0), i(0, 0, 1), i(0, 1, 1), i(0, 1, 0)], // -x
      [i(1, 0, 1), i(1, 0, 0), i(1, 1, 0), i(1, 1, 1)], // +x
      [i(0, 0, 0), i(1, 0, 0), i(1, 0, 1), i(0, 0, 1)], // -y
      [i(0, 1, 1), i(1, 1, 1), i(1, 1, 0), i(0, 1, 0)], // +y
      [i(1, 0, 0), i(0, 0, 0), i(0, 1, 0), i(1, 1, 0)], // -z
      [i(0, 0, 1), i(1, 0, 1), i(1, 1, 1), i(0, 1, 1)], // +z
    ]
    return { verts, faces }
  }

  /** A prism: `segs`-gon cross-section, radius `r` (or [rTop, rBottom] for a
   *  taper — the bottle's neck and the part's bolt-head both need that),
   *  height `h`, centred at `cy` on the Y axis. */
  function prism(segs, r, h, cy = 0) {
    const [rTop, rBot] = Array.isArray(r) ? r : [r, r]
    const verts = []
    for (const [ry, y] of [[rTop, h / 2], [rBot, -h / 2]]) {
      for (let k = 0; k < segs; k++) {
        const a = (k / segs) * Math.PI * 2
        verts.push([Math.cos(a) * ry, cy + y, Math.sin(a) * ry])
      }
    }
    const faces = []
    for (let k = 0; k < segs; k++) {
      const k2 = (k + 1) % segs
      faces.push([k, k2, segs + k2, segs + k]) // side quad
    }
    faces.push([...Array(segs).keys()]) // top cap
    faces.push([...Array(segs).keys()].reverse().map((k) => segs + k)) // bottom cap
    return { verts, faces }
  }

  /** Merge parts already positioned in shared local space into one shape,
   *  offsetting each part's face indices past everything merged before it. */
  function merge(parts) {
    const verts = [], faces = []
    for (const p of parts) {
      const base = verts.length
      verts.push(...p.verts)
      for (const f of p.faces) faces.push(f.map((i) => i + base))
    }
    return { verts, faces }
  }

  /** Edge list from a face list, deduped — used by both the wire-only
   *  primitives (drawn from edges alone, faces never computed for them) and
   *  the featured solids' wire state. */
  function edgesFromFaces(faces) {
    const seen = new Set(), edges = []
    for (const f of faces) {
      for (let k = 0; k < f.length; k++) {
        const a = f[k], b = f[(k + 1) % f.length]
        const key = a < b ? `${a}_${b}` : `${b}_${a}`
        if (seen.has(key)) continue
        seen.add(key)
        edges.push([a, b])
      }
    }
    return edges
  }

  // THE FOUR NAMED OBJECTS. Built from boxes + prisms, all composite,
  // all with real faces so they can be filled and lit when they resolve.

  const CHAIR = merge([
    box([0.9, 0.08, 0.9], [0, -0.02, 0]), // seat
    box([0.9, 1.0, 0.08], [0, 0.5, -0.41]), // backrest
    box([0.07, 0.5, 0.07], [-0.4, -0.28, -0.4]), // 4 legs
    box([0.07, 0.5, 0.07], [0.4, -0.28, -0.4]),
    box([0.07, 0.5, 0.07], [-0.4, -0.28, 0.4]),
    box([0.07, 0.5, 0.07], [0.4, -0.28, 0.4]),
  ])

  const BOTTLE = merge([prism(10, 0.34, 0.9, -0.1), prism(10, [0.34, 0.12], 0.28, 0.48), prism(10, 0.12, 0.22, 0.73)])

  const SHOE = merge([
    box([1.15, 0.16, 0.42], [0.05, -0.32, 0]), // sole
    box([0.75, 0.34, 0.4], [-0.1, -0.08, 0]), // upper/vamp
    box([0.4, 0.46, 0.4], [0.42, 0.02, 0]), // toe box
    box([0.34, 0.4, 0.38], [-0.55, 0.05, 0]), // heel counter
  ])

  const PART = merge([prism(6, 0.42, 0.22, 0.34), prism(14, 0.16, 0.9, -0.16)]) // hex head + shaft, i.e. a bolt

  const FEATURED = [
    { shape: CHAIR, label: 'a chair', yarn: 'pink' },
    { shape: BOTTLE, label: 'a bottle', yarn: 'blue' },
    { shape: SHOE, label: 'a shoe', yarn: 'gold' },
    { shape: PART, label: 'a part', yarn: 'violet' },
  ]

  /** A low-poly torus: rings of a small circle swept around a big one. Built
   *  as {verts, faces} like every other shape even though only its .verts
   *  and a derived edge list get used — filler primitives never resolve to
   *  solid (see header), so the faces exist only to hand to
   *  `edgesFromFaces` and are never fed to `drawSolid`. */
  function torus(R, r, M, m) {
    const verts = []
    for (let i = 0; i < M; i++) {
      const a = (i / M) * TAU
      for (let j = 0; j < m; j++) {
        const b = (j / m) * TAU
        const rad = R + Math.cos(b) * r
        verts.push([Math.cos(a) * rad, Math.sin(b) * r, Math.sin(a) * rad])
      }
    }
    const faces = []
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < m; j++) {
        const i2 = (i + 1) % M, j2 = (j + 1) % m
        faces.push([i * m + j, i2 * m + j, i2 * m + j2, i * m + j2])
      }
    }
    return { verts, faces }
  }

  // Filler primitives — wireframe only, no faces ever passed to drawSolid.
  const PRIM_SHAPES = [
    box([0.6, 0.6, 0.6]),
    box([0.4, 0.4, 0.4]),
    prism(8, 0.32, 0.5),
    prism(6, 0.28, 0.28),
    torus(0.34, 0.12, 10, 6),
  ]
  const PRIM_EDGES = PRIM_SHAPES.map((s) => edgesFromFaces(s.faces))

  // ---------------------------------------------------------------------
  // the field — instances
  // ---------------------------------------------------------------------

  /** Deterministic PRNG (mulberry32) — the field must look the same on every
   *  load and every reduced-motion still, so it is seeded, not Math.random. */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const rnd = mulberry32(20260812)
  const lerp = (a, b, t) => a + (b - a) * t
  const smoothstep = (t) => (t = Math.max(0, Math.min(1, t))) * t * (3 - 2 * t)

  /** Featured instances: each runs a full edge-to-edge-through-centre
   *  journey on its own period/phase, dipping in Z at mid-journey. */
  const featured = FEATURED.map((f, i) => ({
    ...f,
    edges: edgesFromFaces(f.shape.faces),
    period: 19 + i * 6.5, // s — spread wide (19/25.5/32/38.5) so simultaneous full resolves at RESOLVE_X are rare, not just "different"
    phase: (i / FEATURED.length) * 17,
    edgeSide: i % 2 === 0 ? -1 : 1, // alternate which edge they enter from
    laneY: -0.55 + i * 0.34 + (rnd() - 0.5) * 0.2,
    spin: [0.15 + rnd() * 0.12, 0.22 + rnd() * 0.12],
    // 0.5, not the 1.05 an earlier pass shipped with — at 1.05 a resolved
    // object's near-camera size was ~470px on a 1440 canvas, bigger than the
    // sofa payoff tile beside it, which is backwards: these four are the
    // ROOM the payoff sits in, not a second thing competing for the eye. See
    // the composition note above RESOLVE_X below for the rest of this math.
    scale: 0.5,
  }))

  /** Filler primitives: fixed depth band, gentle constant spin, a lazy drift
   *  loop so the field never looks frozen even where nothing is resolving.
   *  Count raised 22 -> 34 and every size/alpha knob below pulled down at the
   *  same time it was raised — MORE of them, each SMALLER and FAINTER, is
   *  what "recedes into atmosphere" means as numbers; more of them at the old
   *  size would just be a denser wall of the same problem. */
  const PRIM_COUNT = 34
  const primitives = Array.from({ length: PRIM_COUNT }, (_, i) => {
    const depth = rnd() // 0 near .. 1 far
    // Near (large, bright) objects are kept closer to centre and far (small,
    // faint) ones spread wide — without this a near cube's spawn point near
    // a screen edge blows up to a few hundred px of box hanging half off the
    // canvas, which reads as a rendering bug, not as depth. Spread's own
    // ceiling was pulled in from 1.2 to 1.0 for the same "don't crop against
    // the section edge" reason RESOLVE_X below was pulled off the edge — the
    // near-field cap doesn't need the extra 20% to read as "spread wide."
    const spread = lerp(0.5, 1.0, depth)
    return {
      shapeIdx: i % PRIM_SHAPES.length,
      x0: (rnd() - 0.5) * 2.6 * spread,
      y0: (rnd() - 0.5) * 1.6 * spread,
      z: lerp(1.9, 5.6, depth), // pushed back from [1.3, 4.6] — further away is literally further away
      driftR: 0.15 + rnd() * 0.25,
      driftSpeed: 0.03 + rnd() * 0.05,
      driftPhase: rnd() * TAU,
      spin: [(rnd() - 0.5) * 0.3, 0.08 + rnd() * 0.2],
      rot0: [rnd() * TAU, rnd() * TAU],
      yarn: ['pink', 'violet', 'blue', 'gold'][i % 4],
    }
  })

  // ---------------------------------------------------------------------
  // renderer
  // ---------------------------------------------------------------------

  let sectionEl = $state(null)
  let canvasEl = $state(null)
  let contentEl = $state(null) // the copy column — bind:this only so resize() can read its box for label culling, see keepClearRects below
  let ctx = null
  let raf = 0
  let running = false
  let io = null
  let ro = null
  let W = 0, H = 0, DPR = 1

  // LABEL CULLING RECTS. The brief's second bug: "A PART"/"A SHOE" tags
  // colliding with the payoff panel and each other at the right edge. A
  // label's screen position comes from the SAME projection as the geometry
  // (see screenLabelPos), so it can land anywhere solidT>0.55 puts it — it
  // cannot be kept clear by hand-picking RESOLVE_X, because RESOLVE_X is a
  // WORLD-space target and these two rects are DOM boxes that also move on
  // resize/reflow. Recomputed on every resize() call (section-relative, so
  // they stay valid across scroll without a per-frame getBoundingClientRect
  // call — that would be one layout read per rect per frame, which a canvas
  // this size does not need). A frame's labelPositions filter drops any tag
  // whose anchor point falls inside either box (with a small pad, since the
  // pill has real width/height beyond its single anchor point) — culled
  // outright, not just faded, because a half-legible tag reads as a bug and
  // a fully hidden one reads as "that object just isn't named this frame,"
  // which is already true of the other three most of the time.
  let contentRect = null
  let payoffRect = null
  function inRect(x, y, rect, pad = 20) {
    if (!rect) return false
    return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad
  }

  // ---------------------------------------------------------------------
  // the payoff — real photo, real (lazily-loaded, budget-respecting) GLB
  // ---------------------------------------------------------------------

  let sofaWrapEl = $state(null) // the panel; also the element the sofa's own IO watches and the box SofaModel sizes its renderer to
  let sofaCanvasEl = $state(null)
  let sofaReady = $state(false) // first real frame has been painted — crossfade poster -> canvas
  let sofaWantsCanvas = $state(false) // decided once, in onMount: webgl + no save-data + not reduced. false ⇒ the <canvas> never enters the DOM at all (same "don't even mount an inert canvas" idiom Flyer.svelte uses for the butterfly)

  let sofaMod = null // the SofaModel instance, once its module has loaded
  let sofaLoadPromise = null // de-dupes ensureSofaModel() if the IO fires again before the first load resolves
  let sofaWantsVisible = false // the sofa IO's last known state — acquire()/release() and the late-arriving load both consult this so a load that resolves AFTER the panel scrolled back off doesn't acquire a context nobody asked for anymore
  let sofaIO = null

  /** save-data is a direct ask not to spend a reader's data on something
   *  decorative (same check Flyer.svelte makes for the butterfly); a failed
   *  hasWebGL() probe means the renderer's own constructor would throw
   *  anyway. Either one routes to the still image, never to a half-built
   *  WebGL layer discovered broken only after three.js already loaded. */
  function sofaAllowed() {
    try { if (navigator.connection?.saveData) return false } catch { /* API doesn't exist here; not a reason to bail */ }
    return hasWebGL()
  }

  function sofaPanelSize() {
    return sofaWrapEl ? { w: sofaWrapEl.clientWidth, h: sofaWrapEl.clientHeight } : { w: 0, h: 0 }
  }

  async function ensureSofaModel() {
    if (!sofaLoadPromise) {
      sofaLoadPromise = (async () => {
        const { SofaModel } = await import('./SofaModel.js')
        if (!sofaCanvasEl) return null
        const m = new SofaModel(sofaCanvasEl)
        try { await m.load() } catch (e) { m.dispose(); return null }
        return m
      })()
    }
    return sofaLoadPromise
  }

  async function sofaEnter() {
    sofaWantsVisible = true
    const m = await ensureSofaModel()
    if (!m || !sofaWantsVisible) return // load failed, or the panel left again while the GLB was still in flight
    sofaMod = m
    const { w, h } = sofaPanelSize()
    if (!w || !h) return
    sofaMod.acquire(w, h)
    sofaMod.renderFrame(performance.now() / 1000) // paint one frame immediately — otherwise the crossfade below reveals a blank canvas until this component's OWN rAF (`frame()`) next ticks, which on a slow device can be a visible flash of nothing
    sofaReady = true
  }

  function sofaExit() {
    sofaWantsVisible = false
    sofaMod?.release() // hands the GL context back; see file header
  }

  const YARN_HEX = { pink: '#d6247e', violet: '#9b55c9', blue: '#5cc0e8', gold: '#e0a82f' }
  const CYAN = '#59e6ff'

  function rotate([x, y, z], rx, ry) {
    const cy = Math.cos(ry), sy = Math.sin(ry)
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy
    const cx = Math.cos(rx), sx = Math.sin(rx)
    const y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx
    return [x1, y1, z2]
  }

  /** Project a rotated local point, offset by the instance's world position
   *  (ox,oy,oz), to screen space. Local coordinates and (ox,oy,oz) live in
   *  the SAME world-unit space — the instance offset is added before the
   *  perspective divide, not after, which is the bug this comment exists to
   *  flag against reintroducing: adding it after (or never adding it) still
   *  type-checks and still draws SOMETHING, it just draws every object
   *  piled on the exact centre of the screen, which is indistinguishable
   *  from "the field is empty" at a glance. `oz` is distance from camera;
   *  bigger = farther. Returns null if behind the camera (defensive —
   *  nothing in this file should get that close, but a stray edge case
   *  shouldn't throw mid-frame). `scale` converts world units to pixels. */
  function project([x, y, z], ox, oy, oz, scale) {
    const FOV = 2.2
    const wz = oz - z
    if (wz <= 0.05) return null
    const f = FOV / wz
    return { sx: (ox + x) * f * scale, sy: -(oy + y) * f * scale, f }
  }

  function drawWire(shapeVerts, edges, rx, ry, ox, oy, oz, scale, color, alpha, lineW) {
    ctx.beginPath()
    for (const [a, b] of edges) {
      const pa = project(rotate(shapeVerts[a], rx, ry), ox, oy, oz, scale)
      const pb = project(rotate(shapeVerts[b], rx, ry), ox, oy, oz, scale)
      if (!pa || !pb) continue
      ctx.moveTo(cx0 + pa.sx, cy0 + pa.sy)
      ctx.lineTo(cx0 + pb.sx, cy0 + pb.sy)
    }
    ctx.strokeStyle = color
    ctx.globalAlpha = alpha
    ctx.lineWidth = lineW
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  let cx0 = 0, cy0 = 0
  const LIGHT_DIR = normalize3([0.4, 0.6, -0.7])
  function normalize3([x, y, z]) { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l] }
  function faceNormal(p0, p1, p2) {
    const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]
    const v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]
    return normalize3([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]])
  }

  /** Filled+lit render for a resolving featured object. Faces painter-sorted
   *  back to front by average rotated Z (cheap and sufficient — these are
   *  convex-ish composite solids at a scale where a true z-buffer is
   *  overkill for four objects on screen at once, at most). */
  function drawSolid(shape, rx, ry, ox, oy, oz, scale, yarnHex, alpha) {
    const rv = shape.verts.map((v) => rotate(v, rx, ry))
    const withDepth = shape.faces.map((f) => ({ f, z: f.reduce((s, i) => s + rv[i][2], 0) / f.length }))
    withDepth.sort((a, b) => b.z - a.z)
    for (const { f } of withDepth) {
      const n = faceNormal(rv[f[0]], rv[f[1]], rv[f[2]])
      const lit = Math.max(0.12, n[0] * LIGHT_DIR[0] + n[1] * LIGHT_DIR[1] + n[2] * LIGHT_DIR[2])
      const pts = f.map((i) => project(rv[i], ox, oy, oz, scale)).filter(Boolean)
      if (pts.length < 3) continue
      ctx.beginPath()
      ctx.moveTo(cx0 + pts[0].sx, cy0 + pts[0].sy)
      for (let k = 1; k < pts.length; k++) ctx.lineTo(cx0 + pts[k].sx, cy0 + pts[k].sy)
      ctx.closePath()
      ctx.fillStyle = shadeMix(yarnHex, lit)
      ctx.globalAlpha = alpha
      ctx.fill()
      ctx.strokeStyle = shadeMix(yarnHex, Math.min(1, lit + 0.25))
      ctx.lineWidth = 1
      ctx.globalAlpha = alpha * 0.9
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  /** Mixes a yarn hex toward black/white by a 0..1 light factor — cheap flat
   *  shading without allocating a canvas gradient per face per frame. */
  const shadeCache = new Map()
  function shadeMix(hex, lit) {
    const key = hex + '_' + lit.toFixed(2)
    let v = shadeCache.get(key)
    if (v) return v
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
    const k = 0.25 + lit * 0.95
    const mix = (c) => Math.max(0, Math.min(255, Math.round(c * k)))
    v = `rgb(${mix(r)},${mix(g)},${mix(b)})`
    shadeCache.set(key, v)
    return v
  }

  /** One full paint. `time` in seconds. Shared by the rAF loop and the
   *  reduced-motion single-frame path — both call this, just once vs. forever. */
  function paint(time) {
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    cx0 = W / 2
    cy0 = H / 2
    // 0.28, not 0.34 — the field's whole job changed after the sofa payoff
    // grew into the section's hero (see .fg3-payoff below): this canvas now
    // needs to read as depth BEHIND that panel, not as a second thing the
    // same size fighting it. Combined with `inst.scale` above and the wider
    // zDip range below, a fully-resolved featured object now peaks around
    // 150-180px on a 1440 canvas — legible as "a chair," never bigger than
    // the sofa tile it's supposed to be atmosphere for.
    const worldScale = Math.min(W, H) * 0.28

    // THIN THE FIELD ON PHONE, don't shrink it. The brief is explicit: a
    // 390px viewport should draw fewer objects at the same visual weight,
    // not the same population squeezed smaller into mush. `primitives` is
    // built once at 22 instances; below 640px this loop simply stops after
    // the first half of them, cheapest possible thinning and it costs
    // nothing extra (no second array, no filter allocation per frame).
    const primLimit = W < 640 ? Math.ceil(primitives.length * 0.5) : primitives.length

    // primitives — far layer first, wire only, depth-faded
    for (let pi = 0; pi < primLimit; pi++) {
      const p = primitives[pi]
      const drift = time * p.driftSpeed + p.driftPhase
      const x = p.x0 + Math.cos(drift) * p.driftR
      const y = p.y0 + Math.sin(drift * 0.8) * p.driftR * 0.6
      const rx = p.rot0[0] + time * p.spin[0]
      const ry = p.rot0[1] + time * p.spin[1]
      const depthT = (p.z - 1.9) / 3.7 // 0 near .. 1 far — denominator matches the [1.9, 5.6] range p.z is drawn from above
      // Contrast pulled down (was [0.42, 0.08]) and size pulled down (was
      // [0.85, 0.35]) together — this is the "lower contrast" half of
      // "smaller, more numerous, further away, lower contrast" from the
      // brief. Filler was never meant to compete for the eye even at its
      // nearest; now it can't.
      const alpha = lerp(0.28, 0.05, depthT)
      const scale = worldScale * lerp(0.55, 0.22, depthT)
      const verts = PRIM_SHAPES[p.shapeIdx].verts
      const edges = PRIM_EDGES[p.shapeIdx]
      drawWire(verts, edges, rx, ry, x, y, p.z, scale, YARN_HEX[p.yarn], alpha, lerp(1.3, 0.6, depthT))
    }

    // featured — the four named objects, each on its own journey
    for (const inst of featured) {
      const u = (((time + inst.phase) % inst.period) + inst.period) % inst.period / inst.period // 0..1
      // journey: enters from one true screen edge, resolves near RESOLVE_X,
      // exits the other. RESOLVE_X used to be 1.05 — off the RIGHT EDGE of
      // the canvas at this FOV, which combined with the old (larger) scale
      // is exactly the "giant slab cropped against three edges" the client's
      // screenshot caught: a resolved object that size, that far off-centre,
      // never fully fit on screen. 0.55 keeps the resolve point in the GAP
      // between the copy column (left ~40%) and the sofa payoff panel — now
      // a hero-sized block anchored to the right edge, see .fg3-payoff below
      // — the one strip of the frame that belongs to neither. The panel's
      // own opaque tiles still occlude anything that drifts behind them;
      // this is just about the resolve point never needing that occlusion
      // to look intentional. The scrim over the copy column is still the
      // real defence, not this — see its own comment further down.
      const RESOLVE_X = 0.55
      const edge = inst.edgeSide * 1.9
      const xPath = u < 0.5 ? lerp(edge, RESOLVE_X, smoothstep(u * 2)) : lerp(RESOLVE_X, -edge, smoothstep((u - 0.5) * 2))
      const zDip = 3.6 - Math.sin(u * Math.PI) * 1.7 // near camera (small z) at u=0.5, range now [1.9, 3.6], widened from [1.45, 2.8] — further from the lens at every point in the journey, not just the resolve peak. Still clear of the magenta-card floor the old range respected (a property of the FOV, not of the range, so it moves with us)
      const y = inst.laneY + Math.sin(u * Math.PI) * 0.08
      const rx = time * inst.spin[0] + inst.phase
      const ry = time * inst.spin[1] + inst.phase * 1.3

      // resolve amount: 1 at mid-journey (near + centred), 0 at the edges
      const centreness = 1 - Math.abs(u - 0.5) / 0.16
      const solidT = smoothstep(centreness)
      const depthT = (zDip - 1.9) / 1.7
      // Ceiling pulled from 0.92 to 0.62 — a resolved object stays the
      // brightest thing the CANVAS draws, but the canvas isn't the
      // brightest thing the SECTION shows any more: that's the sofa payoff,
      // by design (see .fg3-payoff below). The scrim over the copy column
      // still has to win against this on its own; it isn't relying on the
      // field getting dimmer to do its job, but a dimmer field means it wins
      // by a wider margin at every frame, not just the ones that got checked.
      const baseAlpha = lerp(0.62, 0.22, Math.max(0, depthT - 0.35))
      const scale = worldScale * inst.scale * lerp(0.68, 0.92, 1 - depthT)

      if (solidT > 0.02) {
        drawSolid(inst.shape, rx, ry, xPath, y, zDip, scale, YARN_HEX[inst.yarn], Math.min(1, baseAlpha + 0.1))
      }
      if (solidT < 0.98) {
        drawWire(inst.shape.verts, inst.edges, rx, ry, xPath, y, zDip, scale, CYAN, baseAlpha * (1 - solidT * 0.85), 1.4)
      }

      inst._label = { x: xPath, y: y - 0.42, z: zDip, t: solidT, scale }
    }

    return featured
  }

  function screenLabelPos(inst) {
    const p = project([0, 0, 0], inst._label.x, inst._label.y, inst._label.z, inst._label.scale)
    if (!p) return null
    return { x: cx0 + p.sx, y: cy0 + p.sy }
  }

  // labels re-derived reactively from the same instances the canvas just
  // drew, so they can never drift out of sync with the geometry
  let labelPositions = $state([])

  function frame(t) {
    if (!running) return
    paint(t / 1000)
    // Same tick, same rAF id as the wireframe field above — see the header
    // comment's "ONE rAF" rule. sofaMod is null until its dynamic import
    // resolves and renderFrame() is a no-op without an acquired renderer, so
    // this is safe to call unconditionally before either has happened.
    sofaMod?.renderFrame(t / 1000)
    labelPositions = featured
      .filter((f) => f._label.t > 0.55)
      .map((f) => ({ label: f.label, t: f._label.t, pos: screenLabelPos(f) }))
      .filter((l) => l.pos && !inRect(l.pos.x, l.pos.y, contentRect) && !inRect(l.pos.x, l.pos.y, payoffRect))
    raf = requestAnimationFrame(frame)
  }

  function resize() {
    if (!canvasEl || !sectionEl) return
    DPR = Math.min(2, window.devicePixelRatio || 1)
    W = sectionEl.clientWidth
    H = sectionEl.clientHeight
    canvasEl.width = Math.round(W * DPR)
    canvasEl.height = Math.round(H * DPR)
    canvasEl.style.width = W + 'px'
    canvasEl.style.height = H + 'px'
    ctx = canvasEl.getContext('2d')
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    if (!running) paintStill() // covers both the reduced-motion still and a resize that lands before the loop has ever run once

    // The panel's own box (not W/H — the payoff is a hero-sized but still
    // bounded block, not full-bleed) drives the sofa renderer's size. No-op
    // while sofaMod hasn't acquired a renderer yet (release()'d or never
    // entered view).
    if (sofaMod) {
      const { w, h } = sofaPanelSize()
      if (w && h) sofaMod.resize(w, h)
    }

    // Section-relative boxes for label culling — see keepClearRects comment
    // above. Read once here (resize fires on mount, on window resize, and on
    // the ResizeObserver, which also catches layout-only reflow like a web
    // font swap), not per-frame.
    const sectionBox = sectionEl.getBoundingClientRect()
    const toLocal = (r) => ({ left: r.left - sectionBox.left, right: r.right - sectionBox.left, top: r.top - sectionBox.top, bottom: r.bottom - sectionBox.top })
    contentRect = contentEl ? toLocal(contentEl.getBoundingClientRect()) : null
    payoffRect = sofaWrapEl ? toLocal(sofaWrapEl.getBoundingClientRect()) : null
  }

  function start() {
    if (running) return
    running = true
    raf = requestAnimationFrame(frame)
  }
  function stop() {
    running = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  /** The reduced-motion frame. NOT time=0 of the loop — that catches every
   *  featured object at the far edge, unresolved, which reads as "the
   *  animation is broken/paused" rather than "this is the design." Picking
   *  each object's own mid-journey instant (u≈0.5, offset per-object so they
   *  don't stack) composes a frame with all four visibly resolving/resolved
   *  at once, which is the one frame of this design that argues for itself
   *  without moving. */
  function paintStill() {
    // ALL FOUR JOURNEYS PASS THROUGH ONE POINT, RESOLVE_X, BY DESIGN — that
    // is what "resolves near the centre" means. Forcing all four to u≈0.5
    // at once therefore does not compose a field, it piles four large solids
    // on top of each other at the one spot they're built to share. The
    // honest single frame is the one an in-motion visitor actually sees most
    // of the time: ONE object at or near its resolved peak, the other three
    // scattered earlier or later on their own journeys — still wire, still
    // spread across the field. Bottle drawn as the hero on this particular
    // frame; which object gets the peak is arbitrary (any one of the four
    // reads fine there) and not a claim about which is more important.
    const savedPhase = featured.map((f) => f.phase)
    const U_TARGET = [0.16, 0.5, 0.72, 0.86] // chair, bottle, shoe, part — see FEATURED order
    featured.forEach((f, i) => { f.phase = U_TARGET[i] * f.period })
    paint(0)
    labelPositions = featured
      .filter((f) => f._label.t > 0.5)
      .map((f) => ({ label: f.label, t: f._label.t, pos: screenLabelPos(f) }))
      .filter((l) => l.pos && !inRect(l.pos.x, l.pos.y, contentRect) && !inRect(l.pos.x, l.pos.y, payoffRect))
    featured.forEach((f, i) => { f.phase = savedPhase[i] })
  }

  onMount(() => {
    // THE INITIAL GATE USES prefersReduced(), NOT reducedMotion.current.
    // motion.svelte.js's own header warns about this by name: the shared rune
    // is armed from +layout.svelte's onMount, and Svelte runs a DEEPER
    // component's onMount before an ancestor's completes — so a genuinely
    // reduced-motion browser can still read reducedMotion.current as false
    // right here, at the one moment this file only gets to ask once (which
    // path to boot into). Getting this wrong doesn't error, it just silently
    // starts the rAF loop for a visitor who asked never to see it — a bug
    // with no console signature. `prefersReduced()` is a direct matchMedia
    // read for exactly this call site.
    const startReduced = prefersReduced()
    resize()
    window.addEventListener('resize', resize)
    ro = new ResizeObserver(resize)
    ro.observe(sectionEl)

    if (startReduced) {
      paintStill()
    } else {
      io = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) start(); else stop() },
        { rootMargin: '200px 0px' }
      )
      io.observe(sectionEl)
    }

    // THE SOFA PAYOFF'S OWN GATE — decided once, here, same reasoning as
    // `startReduced` above (this is the one moment the rune is guaranteed
    // stale, so read matchMedia directly). Reduced motion, save-data, and no
    // WebGL all take the same branch: `sofaWantsCanvas` stays false, the
    // <canvas> never enters the template (see the {#if} below), and the
    // still image is the whole story for that visitor, forever — not a
    // renderer that gets constructed and immediately discarded.
    sofaWantsCanvas = !startReduced && sofaAllowed()
    if (sofaWantsCanvas) {
      // Deliberately a WIDER rootMargin than the field's own 200px IO above:
      // this is the one that triggers the dynamic `import()` of three +
      // GLTFLoader + the 400KB GLB, and that fetch wants a head start so the
      // model has a chance to be parsed by the time the panel is actually
      // on screen, not a second IO doing the same job twice.
      sofaIO = new IntersectionObserver(
        ([entry]) => { entry.isIntersecting ? sofaEnter() : sofaExit() },
        { rootMargin: '450px 0px' }
      )
      sofaIO.observe(sofaWrapEl)
    }

    // A MID-SESSION TOGGLE, unlike the initial gate above, is exactly what
    // the live rune is for — this effect only starts existing once the rune
    // is guaranteed armed, so there is no ordering race left to worry about
    // here. Flipping reduced motion on stops the loop and repaints the
    // composed still; flipping it off resumes the loop only if the section
    // is actually on screen (the IO's last known state), not unconditionally.
    let wasReduced = startReduced
    const unwatch = $effect.root(() => {
      $effect(() => {
        const nowReduced = reducedMotion.current
        if (nowReduced === wasReduced) return
        wasReduced = nowReduced
        if (nowReduced) {
          stop()
          paintStill()
          sofaMod?.release() // a live toggle gets the same "never running" guarantee as the initial gate — see file header rule 4
        } else if (io) {
          io.disconnect(); io = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) start(); else stop() },
            { rootMargin: '200px 0px' }
          ); io.observe(sectionEl)
          // Sofa wasn't even wired up if the page BOOTED reduced (sofaWantsCanvas
          // stayed false and no <canvas>/IO exist to resume) — this branch only
          // does anything on a reduced->not-reduced->still-visible toggle.
          if (sofaMod && sofaWantsVisible) {
            const { w, h } = sofaPanelSize()
            if (w && h) { sofaMod.acquire(w, h); sofaMod.renderFrame(performance.now() / 1000) }
          }
        }
      })
    })

    return () => {
      unwatch()
      window.removeEventListener('resize', resize)
      ro?.disconnect()
      io?.disconnect()
      sofaIO?.disconnect()
      sofaMod?.dispose()
      stop()
    }
  })
</script>

<section class="fg3" bind:this={sectionEl} aria-label="LOOM Forge — send a photo, get a 3D model">
  <canvas bind:this={canvasEl} class="fg3-canvas" aria-hidden="true"></canvas>

  <div class="fg3-labels" aria-hidden="true">
    {#each labelPositions as l (l.label)}
      <span class="fg3-tag" style={`left:${l.pos.x}px; top:${l.pos.y}px; opacity:${Math.min(1, (l.t - 0.55) / 0.35)}`}>
        {l.label}
      </span>
    {/each}
  </div>

  <div class="fg3-scrim" aria-hidden="true"></div>

  <div class="fg3-content" bind:this={contentEl}>
    <p class="fg3-kicker"><span>New from the 3D Lab</span></p>
    <h2 class="fg3-h">Send a photo. Get a 3D model back.</h2>
    <p class="fg3-lede">One picture of the thing — a chair, a bottle, a shoe, a part.</p>
    <p class="fg3-lede">Our pipeline rebuilds it as real geometry.</p>
    <p class="fg3-lede">Spin it, light it, and drop it into a website, a game or an AR view.</p>

    <p class="fg3-chip">About a minute per model</p>

    <ul class="fg3-formats">
      {#each ['GLB', 'FBX', 'OBJ', 'USDZ'] as fmt (fmt)}
        <li>{fmt}</li>
      {/each}
    </ul>

    <p class="fg3-price"><strong>2 JOD</strong> a model — <em>your first one is free.</em></p>

    <div class="fg3-cta">
      <WoolButton label="Make one free" photo={false} yarn="magenta" size="big" onclick={() => {}} />
    </div>
  </div>

  <!-- THE PAYOFF: one real photo -> one real model, no caption needed because
       the two tiles sit close enough, joined by one wire, that the relationship
       reads on sight. Sits in the field's own right-hand zone (RESOLVE_X's
       territory, see drawSolid's comment above) rather than in the copy
       column, so the wireframe objects visibly share its space instead of
       drifting past an unrelated card. bind:this=sofaWrapEl is both the
       element the sofa's IntersectionObserver watches AND the box SofaModel
       sizes its renderer to — see ensureSofaModel()/sofaEnter() in script. -->
  <div class="fg3-payoff" bind:this={sofaWrapEl}>
    <div class="fg3-payoff-photo">
      <picture>
        <source srcset="/img/forge/sofa-room.avif" type="image/avif" />
        <img src="/img/forge/sofa-room.webp" alt="" width="1600" height="1197" loading="lazy" decoding="async" />
      </picture>
    </div>
    <svg class="fg3-payoff-link" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M4 20 H30" />
      <path d="M22 12 L32 20 L22 28" />
    </svg>
    <div class="fg3-payoff-model">
      <!-- Poster: also the loading state while the GLB is still in flight,
           also the permanent fallback for reduced-motion/save-data/no-webgl
           (sofaWantsCanvas stays false and the <canvas> below never mounts).
           Never removed from the DOM, only faded under the canvas once a
           real frame has painted — see sofaReady in script. -->
      <picture class="fg3-payoff-poster" class:is-hidden={sofaReady}>
        <source srcset="/img/forge/sofa-model.avif" type="image/avif" />
        <img src="/img/forge/sofa-model.webp" alt="The blue sofa from the photo, rebuilt as a real 3D model" width="1024" height="1024" loading="lazy" decoding="async" />
      </picture>
      {#if sofaWantsCanvas}
        <canvas bind:this={sofaCanvasEl} class="fg3-payoff-canvas" class:is-ready={sofaReady}></canvas>
      {/if}
    </div>
  </div>
</section>

<style>
  /* ————————————————————————————————————————————————————————
     THE FIELD is deliberately a dark cut-out on a light-theme page — the
     same move forge.css's own mesh stage makes (see its "a dark ground is
     what the artwork is" comment) and the only way a wireframe universe
     reads as a UNIVERSE instead of grey scratches on pink paper. `--ink` is
     the site's own darkest token (#33243d), not a new colour: it is what
     every OTHER section uses as ink-on-light, used here as ground-under-wire
     instead. No hex outside the token set appears anywhere below.
     ———————————————————————————————————————————————————————— */
  .fg3 {
    position: relative;
    isolation: isolate;
    min-height: 92vh;
    display: flex;
    align-items: center;
    overflow: hidden;
    background:
      radial-gradient(120% 90% at 18% 22%, color-mix(in srgb, var(--violet) 22%, transparent), transparent 60%),
      radial-gradient(100% 80% at 82% 78%, color-mix(in srgb, var(--magenta-deep) 18%, transparent), transparent 62%),
      var(--ink);
    padding: clamp(64px, 10vw, 128px) clamp(20px, 6vw, 96px);
  }

  .fg3-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  /* Screen-space labels for the four named objects, positioned every frame
     from the SAME projection math that placed the geometry — an HTML tag
     that just sat near a shape would drift the moment the journey timing
     changed. Only shown once an object is well into resolving (t>0.55), so
     a label never floats over bare wireframe with nothing to name yet. */
  .fg3-labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .fg3-tag {
    position: absolute;
    transform: translate(-50%, -100%);
    font-family: var(--display);
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink);
    background: color-mix(in srgb, var(--cyan) 88%, white);
    padding: 3px 9px;
    border-radius: 999px;
    white-space: nowrap;
    transition: opacity 0.25s linear;
  }

  /* A left-weighted scrim so the copy column is legible against ANY frame
     the field happens to be on — a bright resolved bottle can pass directly
     behind the headline mid-journey, and the scrim has to win that fight
     every time, not just on average. Built from --ink alone (same token as
     the section ground) so it reads as depth, not as a slapped-on panel. */
  .fg3-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      color-mix(in srgb, var(--ink) 88%, black) 0%,
      color-mix(in srgb, var(--ink) 72%, black) 34%,
      color-mix(in srgb, var(--ink) 20%, transparent) 62%,
      transparent 80%
    );
    pointer-events: none;
  }

  .fg3-content {
    position: relative;
    z-index: 2;
    max-width: 30rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }

  .fg3-kicker {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 0.4rem;
    font-family: var(--display);
    font-size: 0.78rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(242, 240, 247, 0.72);
  }
  .fg3-kicker span { color: var(--cyan); }
  .fg3-kicker::after { content: ''; height: 1px; width: 56px; background: rgba(242, 240, 247, 0.3); }

  .fg3-h {
    margin: 0 0 0.3rem;
    font-family: var(--bloom);
    font-weight: 620;
    font-size: clamp(2rem, 4.4vw, 3.2rem);
    line-height: 1.05;
    color: #f2f0f7;
    max-width: 16ch;
  }

  .fg3-lede {
    margin: 0;
    font-size: clamp(1rem, 1.4vw, 1.15rem);
    line-height: 1.5;
    color: rgba(242, 240, 247, 0.82);
    max-width: 40ch;
  }

  .fg3-chip {
    margin: 0.5rem 0 0;
    display: inline-flex;
    align-items: center;
    font-family: var(--display);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink);
    background: var(--cyan);
    padding: 6px 12px;
    border-radius: 999px;
  }

  .fg3-formats {
    margin: 0.35rem 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .fg3-formats li {
    font-family: var(--display);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    color: rgba(242, 240, 247, 0.75);
    border: 1px solid rgba(242, 240, 247, 0.22);
    border-radius: 999px;
    padding: 5px 11px;
  }

  .fg3-price {
    margin: 0.7rem 0 0;
    font-size: 1.05rem;
    color: rgba(242, 240, 247, 0.85);
  }
  .fg3-price strong {
    font-family: var(--display);
    color: #f2f0f7;
    font-size: 1.35rem;
  }
  .fg3-price em { font-style: normal; color: var(--cyan); }

  .fg3-cta { margin-top: 1rem; }

  /* ————————————————————————————————————————————————————————
     THE PAYOFF PANEL — reworked from "confirmation" to HERO.

     An earlier pass read "do not make the section heavy" as "keep the
     payoff small," which produced two ~90px tiles, smaller than the format
     chips beside them — on the one section that exists to show "from this
     photo, to this model," the transformation was the least visible thing
     on screen. That was never what "not heavy" meant. The field (the
     canvas, now pulled back in scale/contrast/depth — see worldScale and
     RESOLVE_X in the script) is what was supposed to stay light; the payoff
     is the argument, and an argument nobody can read isn't light, it's
     absent. `clamp` ceiling raised from 224px to 640px: at 1440px this
     panel now runs ~550px wide, with the model tile alone reading as a
     sofa-sized object rather than an icon.

     Still anchored in the field's own right-hand zone (see RESOLVE_X in the
     script — the wireframe objects resolve INTO the gap between this panel
     and the copy column, not through it), so the geometry and the payoff
     still visibly share ground instead of the panel reading as a card
     slapped over unrelated motion. */
  .fg3-payoff {
    position: absolute;
    z-index: 2; /* above the canvas + scrim, same stacking context as .fg3-content */
    right: clamp(20px, 6vw, 96px);
    top: 50%;
    transform: translateY(-46%);
    width: clamp(360px, 38vw, 640px);
    display: flex;
    align-items: center;
    gap: 16px;
    pointer-events: none; /* the drag target is the canvas itself, below, which re-enables pointer-events on its own */
  }

  .fg3-payoff-photo {
    flex: 0 0 auto;
    /* 30%, not 34% — every extra point here is a point the model tile (the
       actual "what it became") doesn't get, and at this panel's new scale
       30% is still a legible room photo, not a postage stamp. */
    width: 30%;
    aspect-ratio: 4 / 3;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(89, 230, 255, 0.35);
    box-shadow: 0 8px 22px rgba(10, 6, 18, 0.45);
  }
  .fg3-payoff-photo picture,
  .fg3-payoff-photo img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .fg3-payoff-link {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    stroke: var(--cyan);
    stroke-width: 2.5;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.8;
  }

  .fg3-payoff-model {
    position: relative;
    flex: 1 1 auto;
    aspect-ratio: 1 / 1;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(89, 230, 255, 0.5);
    background: color-mix(in srgb, var(--ink) 70%, black);
    box-shadow: 0 16px 44px rgba(10, 6, 18, 0.55);
    pointer-events: auto; /* the one interactive surface in this whole decorative field — dragging the model is the point */
  }

  .fg3-payoff-poster,
  .fg3-payoff-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .fg3-payoff-poster img { width: 100%; height: 100%; object-fit: contain; }

  /* Crossfade: poster is the loading state AND the permanent no-webgl/
     reduced-motion/save-data fallback (see sofaWantsCanvas in script — on
     that last path the canvas element never exists, so this transition
     simply never runs and the poster just sits there, which is correct). */
  .fg3-payoff-poster { transition: opacity 0.4s ease; opacity: 1; }
  .fg3-payoff-poster.is-hidden { opacity: 0; }
  .fg3-payoff-canvas { opacity: 0; transition: opacity 0.4s ease; touch-action: none; cursor: grab; }
  .fg3-payoff-canvas.is-ready { opacity: 1; }
  .fg3-payoff-canvas:active { cursor: grabbing; }

  /* ——— narrow (phone AND tablet, ≤900px): the payoff goes first ———
     The old breakpoint was 640px, which is why an 820px tablet screenshot
     still shipped the desktop absolute-right layout — at that width the
     hero-sized panel above and the copy column's 30rem max-width no longer
     fit side by side (measured: they'd overlap by ~80px at 820). Rather
     than shrink the payoff back down to fit a row — the exact mistake this
     whole pass exists to undo — this breakpoint takes it out of the row
     entirely: below 900px, the panel becomes a normal-flow block and
     `order` (not DOM position — the markup keeps content before payoff,
     see the template) puts it FIRST, full-width, before a word of copy.
     "Send a photo. Get a 3D model back." lands as a caption under a
     transformation the reader has already seen, not a promise they take on
     faith before scrolling past four wireframe animals to find the proof.

     `primitives` and `featured` are JS arrays sized once at module scope;
     the field's own phone-only thinning (see `primLimit` in the script)
     still keys off `W < 640`, unchanged — a 900px tablet can carry the full
     population fine, it was never the field's density that broke at this
     width, only the row layout. */
  @media (max-width: 900px) {
    .fg3 {
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      gap: 1.75rem;
      min-height: 100vh;
      padding-bottom: clamp(40px, 10vh, 72px);
    }
    .fg3-content { order: 2; max-width: 30rem; width: 100%; align-items: flex-start; }
    .fg3-h { max-width: 14ch; }
    .fg3-scrim {
      background: linear-gradient(
        0deg,
        color-mix(in srgb, var(--ink) 92%, black) 0%,
        color-mix(in srgb, var(--ink) 78%, black) 42%,
        color-mix(in srgb, var(--ink) 30%, transparent) 72%,
        transparent 100%
      );
    }
    .fg3-tag { display: none; } /* screen-space tags fight the stacked copy for the same real estate this narrow; the four nouns are already in the lede */

    /* Out of the absolute-right corner and into normal flow, `order: 1`
       above puts it ahead of .fg3-content. `100%` here is the FLEX
       CONTAINER's content box — .fg3's own horizontal padding (the
       clamp(20px,6vw,96px) on `.fg3` itself) is already subtracted before
       a percentage-width child ever sees it, which a raw `vw` unit would
       not have accounted for (94vw ignores the section's own padding and
       overflows a 390px screen by ~24px). `min(460px, 100%)` scales with
       whatever room the padding actually left, at every width. */
    .fg3-payoff {
      position: static;
      order: 1;
      transform: none;
      width: min(460px, 100%);
      gap: 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .fg3-tag { transition: none; }
    .fg3-payoff-poster,
    .fg3-payoff-canvas { transition: none; }
  }
</style>
