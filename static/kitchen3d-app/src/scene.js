/**
 * scene.js — assembles a whole room from the config and hands back metrics.
 *
 * REBUILD STRATEGY. Changing a finish rebuilds the kitchen from scratch rather
 * than walking the graph swapping materials. That sounds wasteful and is not:
 * the expensive part is texture generation, which is cached in materials.js, so
 * a rebuild is a few hundred cheap allocations (~15 ms). What it buys is that
 * there is exactly one code path for "kitchen in state X", so the third finish
 * you pick cannot look different from the first — which is precisely the bug
 * that swap-in-place configurators ship with.
 *
 * Everything disposed on rebuild EXCEPT cached textures and the geometry cache,
 * both of which are keyed by value and shared.
 */

import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import * as K from './kitchen.js'
import { D } from './kitchen.js'
import {
  frontMaterial, worktopMaterial, metalMaterial, floorMaterial,
  wallMaterial, reededGlassMaterial,
} from './materials.js'
import { LAYOUTS, WORKTOPS, METALS, LIGHTING } from './config.js'

RectAreaLightUniformsLib.init()

/**
 * Window output per lighting condition. One table, read by both the builder and
 * the live lighting switch, so the two cannot drift — the bug where the window
 * is correct on load and wrong after you touch the control.
 */
const WINDOW_INTENSITY = { day: 2.4, dusk: 1.8, night: 0.7 }

/* ---------------------------------------------------------------- layouts -- */

/**
 * A layout is a plain description: runs against the walls, plus island
 * segments. Adding one is data, not code.
 *
 * `runs`  — { kind, dir, x, z, length, glass?, feature? }
 * `island`— [{ x0, z0, x1, z1, fronts: ['+z','-x'], bar?: '+x' }]
 */
function layoutPlan(id) {
  const room = LAYOUTS[id].room
  const W = room.w / 2, Dp = room.d / 2
  const m = 0.1                                    // margin off the side walls

  if (id === 'L') {
    return {
      room,
      runs: [
        // Oven housing, then the working run, then the tall larder bank —
        // reading left to right exactly as the reference elevation does.
        { kind: 'tall', dir: '+x', x: -W + m, z: -Dp, length: 1.2, feature: 'ovens' },
        { kind: 'base', dir: '+x', x: -W + m + 1.2, z: -Dp, length: 2.8, feature: 'hob' },
        { kind: 'wall', dir: '+x', x: -W + m + 1.2, z: -Dp, length: 1.2, glass: true },
        { kind: 'tall', dir: '+x', x: -W + m + 4.0, z: -Dp, length: 2.1, glass: true },
      ],
      island: [
        // The L. Main leg carries the sink and faces the room; the short return
        // runs toward the viewer and ends in a breakfast bar, which is what
        // gives this layout its depth in a photograph.
        // 1.15 m of walkway between the back run's fronts and the island —
        // the figure every kitchen is set out to, and the thing that decides
        // whether the room photographs as generous or as tight.
        { x0: -1.85, z0: -1.25, x1: 1.25, z1: -0.25, fronts: ['+z', '-x'], sink: true },
        { x0: 0.25, z0: -0.25, x1: 1.25, z1: 0.95, fronts: ['-x', '+z'], bar: '+x' },
      ],
      pendants: { x: -0.65, z: -0.75, dir: 'x', count: 3, spacing: 0.80 },
      glazing: '+x',
    }
  }

  if (id === 'U') {
    return {
      room,
      runs: [
        { kind: 'tall', dir: '+x', x: -W + m, z: -Dp, length: 1.8, feature: 'ovens' },
        { kind: 'base', dir: '+x', x: -W + m + 1.8, z: -Dp, length: 3.3, feature: 'hob' },
        { kind: 'wall', dir: '+x', x: -W + m + 1.8, z: -Dp, length: 3.3, glass: false },
        { kind: 'base', dir: '-z', x: -W + m, z: Dp - m, length: 2.4, sink: true },
        { kind: 'base', dir: '+z', x: W - m, z: -Dp + 0.7, length: 2.4 },
        { kind: 'wall', dir: '+z', x: W - m, z: -Dp + 0.7, length: 2.4, glass: true },
      ],
      island: [],
      pendants: { x: 0, z: 0.4, dir: 'x', count: 2, spacing: 0.9 },
      glazing: '+z',
    }
  }

  if (id === 'island') {
    return {
      room,
      runs: [
        { kind: 'tall', dir: '+x', x: -W + m, z: -Dp, length: 2.4, feature: 'ovens' },
        { kind: 'tall', dir: '+x', x: -W + m + 2.4, z: -Dp, length: 3.7, glass: true },
      ],
      island: [
        { x0: -1.9, z0: -0.35, x1: 1.9, z1: 0.75, fronts: ['+z', '-x', '+x'], sink: true, hob: true, bar: '+z' },
      ],
      pendants: { x: 0, z: 0.2, dir: 'x', count: 3, spacing: 0.85 },
      glazing: '+x',
    }
  }

  // galley
  return {
    room,
    runs: [
      { kind: 'base', dir: '+x', x: -W + m, z: -Dp, length: 4.8, feature: 'hob' },
      { kind: 'wall', dir: '+x', x: -W + m, z: -Dp, length: 4.8, glass: true },
      { kind: 'base', dir: '-x', x: W - m, z: Dp - m - 1.4, length: 4.8, sink: true },
    ],
    island: [],
    pendants: { x: 0, z: 0, dir: 'x', count: 2, spacing: 1.1 },
    glazing: '-z',
  }
}

/* ------------------------------------------------------------------ shell -- */

function buildShell(plan, state, ctx) {
  const g = new THREE.Group()
  const { w, d, h } = plan.room
  const W = w / 2, Dp = d / 2

  const floorMat = floorMaterial(state.floor, plan.room)
  // Sized to the room, not oversized: the parquet texture is laid to these
  // exact dimensions, so a floor plane bigger than the room would repeat it.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  g.add(floor)

  // Neutral warm-grey, not beige. A beige wall under warm light has no way to
  // read as anything but yellow — there is no hue left in it to shift.
  // Near-white plaster in every condition. In the reference the wall reads at
  // roughly 75% even at night; a mid-grey wall can never get there no matter
  // how much light is thrown at it, because it simply does not reflect enough.
  const wallMat = wallMaterial('#d5d3cf')
  const addWall = (name, px, py, pz, ww, hh, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), wallMat)
    m.position.set(px, py, pz)
    m.rotation.y = ry
    m.receiveShadow = true
    m.name = name
    g.add(m)
  }
  // Named because the plan view has to take the lid and the near wall off. A
  // dollhouse view of a sealed box shows you the outside of a box.
  // The glazed wall gets an aperture instead of a solid plane — see
  // buildGlazing. Everything else is one quad.
  const glazed = plan.glazing
  if (glazed !== '-z') addWall('wall-back', 0, h / 2, -Dp, w, h, 0)
  if (glazed !== '-x') addWall('wall-left', -W, h / 2, 0, d, h, Math.PI / 2)
  if (glazed !== '+x') addWall('wall-right', W, h / 2, 0, d, h, -Math.PI / 2)
  if (glazed !== '+z') addWall('wall-front', 0, h / 2, Dp, w, h, Math.PI)
  ctx.addWall = addWall

  // Ceiling.
  //
  // This was originally a smaller plane with a gap at the perimeter, to fake
  // the recessed cove that makes a ceiling appear to float. That gap is a hole
  // in the room: from a low camera you see straight through it to whatever is
  // outside, and the sky backdrop leaks in above the wall heads. The cove is
  // now a modelled reveal — a full-size ceiling with a shallow box dropped
  // below it — which reads the same and does not perforate the box.
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#e6e6e5', roughness: 0.95 })
  ctx.disposables.push(ceilMat)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat)
  ceil.rotation.x = Math.PI / 2
  ceil.position.y = h
  ceil.name = 'ceiling'
  g.add(ceil)

  const coveMat = new THREE.MeshStandardMaterial({ color: '#f0f0ef', roughness: 0.95 })
  ctx.disposables.push(coveMat)
  const cove = new THREE.Mesh(new THREE.BoxGeometry(w - 0.34, 0.055, d - 0.34), coveMat)
  cove.position.set(0, h - 0.028, 0)
  cove.name = 'ceiling'
  cove.receiveShadow = true
  g.add(cove)

  // Track lighting on the ceiling, as in the reference.
  const trackMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.6, metalness: 0.3 })
  ctx.disposables.push(trackMat)
  const track = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 0.035, 0.045), trackMat)
  track.position.set(0, h - 0.02, -Dp + 0.9)
  track.name = 'ceiling'
  g.add(track)
  for (let i = -2; i <= 2; i++) {
    const lit = i === -1 || i === 1
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.10, 14), trackMat)
    head.position.set(i * (w - 1.6) / 4, h - 0.09, -Dp + 0.9)
    head.rotation.z = 0.30
    g.add(head)
    // The ceiling track heads are FITTINGS. These were five hard white dots
    // punched into the ceiling with tone mapping bypassed — the brightest
    // pixels in the entire frame, on objects nobody is looking at.
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.028, 18),
      new THREE.MeshStandardMaterial({
        color: '#c9beb0', roughness: 0.8, emissive: new THREE.Color('#241a10'),
      })
    )
    lens.position.set(i * (w - 1.6) / 4 - 0.03, h - 0.135, -Dp + 0.9)
    lens.rotation.x = Math.PI / 2
    g.add(lens)
    ctx.trackLenses.push(lens.material)

    // These used to be lit lenses that emitted nothing — five little lamps
    // pretending. They are what puts the scalloped wash down the back wall and
    // the graze across the splashback, which is most of what stops a run of
    // tall units reading as a flat black slab.
    // Five track heads, two of them actually emitting. The other three are
    // fittings with lit lenses. Every real light in this room is paid for by
    // every lit fragment on screen, so the honest question for each one is not
    // "would this fitting be on" but "can you tell which ones are" — and with
    // two washing the same wall, you cannot.
    if (!lit) continue
    const spot = new THREE.SpotLight(0xfff0e2, 0, 7, 0.75, 0.6, 1.3)
    spot.position.set(i * (w - 1.6) / 4, h - 0.14, -Dp + 0.9)
    spot.target.position.set(i * (w - 1.6) / 4 * 1.1, 1.3, -Dp + 0.05)
    g.add(spot, spot.target)
    ctx.spots.push({ light: spot, base: 20 })
  }

  // Glazing. Full-height, black steel mullions — and crucially a bright plane
  // beyond it: an unlit window is a black hole that drags the whole image down.
  buildGlazing(g, plan, state, ctx)

  /* ------------------------------------------------------------- bounce */
  //
  // There is no global illumination, and the surface that suffers is the one
  // the customer is buying: the island fronts. They are vertical, every lamp in
  // the room points down, and the environment map alone leaves them near black.
  // In a real room they are lit almost entirely by bounce off the ceiling and
  // off the wall behind you.
  //
  // These are a HEMISPHERE and a shadowless DIRECTIONAL, not two big area
  // lights. Area lights are evaluated analytically per fragment and are by far
  // the most expensive light type three.js has; spending two of them on a
  // diffuse ambient fill — the one job where directionality barely matters —
  // was costing more than every real light in the kitchen combined.
  const bounce = new THREE.DirectionalLight(0xeef0f2, 0)
  bounce.position.set(-w * 0.25, 1.9, d * 0.9)
  bounce.target.position.set(0, 0.75, -d * 0.2)
  g.add(bounce, bounce.target)

  ctx.bounce = [{ light: bounce, day: 1.1, dusk: 0.7, night: 0.45 }]

  return g
}

/**
 * The glazed wall.
 *
 * Built as an APERTURE, not as a plane with a window drawn on it: jambs either
 * side, a head above, and a hole in between. The reason is not detail, it is
 * containment — a solid wall plus a big backdrop behind it leaks the backdrop
 * around every edge of the room the moment the camera drops below the wall
 * head. With a real opening, the backdrop can be sized to the opening and sits
 * where it belongs.
 */
function buildGlazing(g, plan, state, ctx) {
  const { w, d, h } = plan.room
  const W = w / 2, Dp = d / 2
  const side = plan.glazing
  const along = side === '+x' || side === '-x' ? 'z' : 'x'
  const wallLen = along === 'z' ? d : w

  // The opening: centred, 66% of the wall, from 0 to 150 mm below the ceiling.
  const openLen = wallLen * 0.66
  const openTop = h - 0.15
  const jamb = (wallLen - openLen) / 2

  const px = side === '+x' ? W : side === '-x' ? -W : 0
  const pz = side === '+z' ? Dp : side === '-z' ? -Dp : 0
  const ry = along === 'z' ? (side === '+x' ? -Math.PI / 2 : Math.PI / 2)
    : (side === '+z' ? Math.PI : 0)
  const axis = (t) => along === 'z' ? [px, pz + t] : [px + t, pz]

  // Jambs + head, in the same plaster as every other wall.
  for (const t of [-(openLen + jamb) / 2, (openLen + jamb) / 2]) {
    const [jx, jz] = axis(t)
    ctx.addWall('wall-glazed', jx, h / 2, jz, jamb, h, ry)
  }
  const [hx, hz] = axis(0)
  ctx.addWall('wall-glazed', hx, openTop + (h - openTop) / 2, hz, openLen, h - openTop, ry)

  const frame = new THREE.MeshStandardMaterial({ color: '#171718', roughness: 0.45, metalness: 0.5 })
  ctx.disposables.push(frame)

  /* --------------------------------------------------------- the view out */
  // A gradient, not a colour: the top of a window is always brighter than the
  // bottom, and matching that is most of why a CG window reads as glass rather
  // than as a light box.
  const cvs = document.createElement('canvas')
  cvs.width = 8; cvs.height = 256
  const c2 = cvs.getContext('2d')
  const grad = c2.createLinearGradient(0, 0, 0, 256)
  const ramp = state.lighting === 'day' ? ['#e9f0f5', '#cfd8de', '#a8b0b2']
    : state.lighting === 'dusk' ? ['#f5c98f', '#e08a52', '#5a4650']
      : ['#161d29', '#28313f', '#3d3a33']
  grad.addColorStop(0, ramp[0]); grad.addColorStop(0.55, ramp[1]); grad.addColorStop(1, ramp[2])
  c2.fillStyle = grad; c2.fillRect(0, 0, 8, 256)
  if (state.lighting === 'night') {
    // City at night: a scatter of warm windows. A few pixels of nothing that
    // make the whole room feel like it is somewhere.
    c2.fillStyle = '#ffcf8e'
    for (let i = 0; i < 90; i++) {
      c2.globalAlpha = 0.2 + (i % 5) * 0.16
      c2.fillRect((i * 3) % 8, 120 + ((i * 37) % 130), 1, 1 + (i % 2))
    }
    c2.globalAlpha = 1
  }
  const skyTex = new THREE.CanvasTexture(cvs)
  skyTex.colorSpace = THREE.SRGBColorSpace
  ctx.disposables.push(skyTex)

  // Sized to the opening plus a margin, and set just outside it — big enough
  // to fill the view through the glass from any angle the controls allow,
  // small enough that it cannot appear anywhere else.
  const outX = side === '+x' ? 0.9 : side === '-x' ? -0.9 : 0
  const outZ = side === '+z' ? 0.9 : side === '-z' ? -0.9 : 0
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(openLen * 2.6, openTop * 2.2),
    new THREE.MeshBasicMaterial({ map: skyTex })
  )
  backdrop.position.set(px + outX, openTop * 0.5, pz + outZ)
  backdrop.rotation.y = ry
  g.add(backdrop)

  /* ------------------------------------------------------------ the glass */
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(openLen, openTop),
    // No transmission — see reededGlassMaterial for why. A window pane in
    // front of a painted backdrop is a specular sheet, nothing more.
    new THREE.MeshPhysicalMaterial({
      color: '#e6eef2', roughness: 0.03, metalness: 0,
      transparent: true, opacity: 0.14, side: THREE.DoubleSide,
      envMapIntensity: 2.0, depthWrite: false,
    })
  )
  pane.position.set(px, openTop / 2, pz)
  pane.rotation.y = ry
  g.add(pane)
  ctx.disposables.push(pane.material)

  /* --------------------------------------------------------- the mullions */
  const bayCount = Math.max(2, Math.round(openLen / 1.5))
  for (let i = 0; i <= bayCount; i++) {
    const t = -openLen / 2 + (openLen / bayCount) * i
    const [bx, bz] = axis(t)
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, openTop, 0.07), frame)
    bar.position.set(bx, openTop / 2, bz)
    bar.rotation.y = ry
    g.add(bar)
  }
  const [tx, tz] = axis(0)
  for (const y of [openTop, 2.05, 0.02]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(openLen, 0.05, 0.07), frame)
    rail.position.set(tx, y, tz)
    rail.rotation.y = ry
    g.add(rail)
  }

  /* ---------------------------------------------------------- the daylight */
  // A rect area light sized to the opening, not a directional: it gives the
  // soft wide gradient across the floor that a point or a sun cannot.
  // A RectAreaLight's output scales with its AREA, and this one is ~12 m².
  // The intensities here look small next to a point light's and are not: at 9,
  // which is a perfectly ordinary number for a lamp, this window puts out more
  // light than the sun and every matt front in the room renders as white paper.
  const wl = new THREE.RectAreaLight(
    state.lighting === 'dusk' ? 0xffb87a : state.lighting === 'night' ? 0x8fa6d6 : 0xdce8f4,
    WINDOW_INTENSITY[state.lighting],
    openLen, openTop
  )
  wl.position.set(px - outX * 0.12, openTop / 2, pz - outZ * 0.12)
  wl.lookAt(0, 1.0, 0)
  g.add(wl)
  ctx.windowLight = wl
}

/* ---------------------------------------------------------------- island -- */

function buildIsland(plan, state, ctx) {
  const g = new THREE.Group()
  if (!plan.island.length) return { group: g, counts: 0, area: 0, run: 0 }

  const t = WORKTOPS[state.worktop].thickness
  const topY = D.plinth + D.baseCarcass + t / 2
  let counts = 0, area = 0, run = 0

  for (const seg of plan.island) {
    const w = seg.x1 - seg.x0, d = seg.z1 - seg.z0
    const cx = (seg.x0 + seg.x1) / 2, cz = (seg.z0 + seg.z1) / 2

    // Body. The island carcass is a solid block; only the sides listed in
    // `fronts` get doors, the rest get matching end panels — same as built.
    g.add(K.box(w, D.baseCarcass, d, ctx.carcassMat, cx, D.plinth + D.baseCarcass / 2, cz, { cast: true }))

    // Recessed plinth + the light that hides in it. In the reference this glow
    // is doing enormous work: it separates the island from the floor and gives
    // the whole image its depth.
    g.add(K.box(w - 0.12, D.plinth, d - 0.12, ctx.plinthMat, cx, D.plinth / 2, cz, { cast: false }))

    for (const side of seg.fronts) {
      const along = side === '+z' || side === '-z' ? 'x' : 'z'
      const len = along === 'x' ? w : d
      // An island face is named by the direction it looks in, so the offset is
      // read straight off the side — no run-normal indirection needed here.
      const ox = side === '+x' ? 1 : side === '-x' ? -1 : 0
      const oz = side === '+z' ? 1 : side === '-z' ? -1 : 0

      const bayList = K.bays(len)
      let cursor = 0
      for (const raw of bayList) {
        const bw = Math.abs(raw)
        const bc = (along === 'x' ? seg.x0 : seg.z0) + cursor + bw / 2
        cursor += bw
        if (raw < 0) continue
        counts++

        // Island fronts are a two-band composition: a shallow drawer band over a
        // deep one, split by the metal reveal. That proportion (roughly 1:1.6)
        // is what the reference is doing and it is not arbitrary — the reveal
        // lands just above worktop-minus-a-forearm, where a hand naturally goes.
        const bands = [0.27, D.baseCarcass - 0.27 - D.gap]
        let fy = D.plinth
        for (const bh0 of bands) {
          const bh = bh0 - D.gap
          const fw = bw - D.gap
          const mat = ctx.frontMat(fw, bh)
          const px = along === 'x' ? bc : cx + ox * (w / 2 + D.frontThick / 2)
          const pz = along === 'x' ? cz + oz * (d / 2 + D.frontThick / 2) : bc

          // Island fronts are all drawers — every band on an island is a
          // drawer box in practice, because a door on an island opens into the
          // walkway.
          const pivot = K.registerOpenable(ctx, {
            type: 'drawer',
            pivotPos: new THREE.Vector3(px, fy + bh / 2, pz),
            offset: new THREE.Vector3(0, 0, 0),
            normal: new THREE.Vector3(ox, 0, oz),
            width: fw, height: bh,
          })
          g.add(pivot)

          const panel = K.mesh(
            K.frontGeometry(state.door, fw, bh, D.frontThick, along === 'x' ? 'z' : 'x'),
            mat, 0, 0, 0
          )
          panel.userData.openable = ctx.openables.length - 1
          pivot.add(panel)
          pivot.add(K.drawerBox(ctx, fw, bh, D.islandDepth / 2 - 0.04,
            new THREE.Vector3(ox, 0, oz)))

          if (state.handles === 'bar') {
            const bl = Math.min(fw * 0.5, 0.32)
            const bar = K.mesh(
              K.cylY(0.009, bl, along !== 'x'),
              ctx.metalMat, ox * (D.frontThick / 2 + 0.028), 0, oz * (D.frontThick / 2 + 0.028)
            )
            bar.userData.openable = ctx.openables.length - 1
            pivot.add(bar)
          }
          fy += bh0
        }
      }

      // The brass reveal — a continuous band right across the run, not per-bay.
      // Running it per-bay would break it at every shadow gap and lose the line
      // that ties the whole island together.
      const rpx = along === 'x' ? cx : cx + ox * (w / 2 + D.frontThick + 0.002)
      const rpz = along === 'x' ? cz + oz * (d / 2 + D.frontThick + 0.002) : cz
      g.add(K.box(
        along === 'x' ? len : 0.014, 0.022, along === 'x' ? 0.014 : len,
        ctx.metalMat, rpx, D.plinth + 0.27 - 0.011, rpz
      ))
    }

    // Worktop, oversized by the overhang on the front faces.
    const oh = D.overhang + D.frontThick
    const barSide = seg.bar
    const bx = barSide === '+x' ? 0.36 : barSide === '-x' ? -0.36 : 0
    const bz = barSide === '+z' ? 0.36 : barSide === '-z' ? -0.36 : 0
    const tw = w + oh * 2 + Math.abs(bx)
    const td = d + oh * 2 + Math.abs(bz)
    const mat = worktopMaterial(state.worktop, [tw, td])
    g.add(K.box(tw, t, td, mat, cx + bx / 2, topY, cz + bz / 2, { cast: true }))
    area += tw * td

    ctx.islandTops.push({ cx: cx + bx / 2, cz: cz + bz / 2, w: tw, d: td, y: topY + t / 2, seg })
  }

  // Total island run for the spec, measured on the fronted sides only.
  for (const seg of plan.island) {
    for (const side of seg.fronts) {
      run += (side === '+z' || side === '-z') ? (seg.x1 - seg.x0) : (seg.z1 - seg.z0)
    }
  }

  return { group: g, counts, area, run }
}

/* ---------------------------------------------------------------- build -- */

export function buildKitchen(state) {
  const plan = layoutPlan(state.layout)
  const root = new THREE.Group()

  const metal = METALS[state.metal]
  const ctx = {
    state,
    disposables: [],
    lamps: [],
    strips: [],
    trackLenses: [],
    spots: [],
    bounce: [],
    underCabLights: 0,
    openables: [],
    drawerMat: new THREE.MeshStandardMaterial({ color: '#6f6a63', roughness: 0.8 }),
    vitrines: [],
    islandTops: [],
    carcassMat: new THREE.MeshStandardMaterial({ color: '#141313', roughness: 0.92 }),
    plinthMat: new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: 0.95 }),
    metalMat: metalMaterial(state.metal, 'x', 4),
    sinkMat: metalMaterial('nickel', 'x', 2),
    tapMat: metalMaterial(state.metal === 'brass' ? 'brass' : 'nickel', 'y', 1),
    glassMat: reededGlassMaterial(state.metal),
    // Shared and cached — see materials.js. Deliberately NOT added to
    // `disposables`.
    frontMat: (w, h) => frontMaterial(state.cabinet, state.door, [w, h]),
  }
  // Only the two locally-built materials are per-build; the metal, sink, tap
  // and glass all come from the shared cache.
  ctx.disposables.push(ctx.carcassMat, ctx.plinthMat, ctx.drawerMat)

  root.add(buildShell(plan, state, ctx))

  /* runs */
  const counts = { base: 0, wall: 0, tall: 0 }
  let runMetres = 0, topArea = 0
  for (const spec of plan.runs) {
    if (spec.length <= 0) continue
    const built = K.buildRun(spec, state, ctx)
    root.add(built.group)
    counts.base += built.counts.base
    counts.wall += built.counts.wall
    counts.tall += built.counts.tall
    if (spec.kind !== 'wall') runMetres += spec.length
    if (spec.kind === 'base') {
      root.add(K.buildWorktop(spec, state, ctx))
      topArea += spec.length * (D.baseDepth + D.frontThick + D.overhang)
      // Splashback: full height between worktop and wall units, in the same
      // stone. The reference does this and it is the detail that reads as
      // expensive from across the room.
      addSplashback(root, spec, state, ctx, plan)
    }
    // Under-cabinet strip. Only the FIRST wall run gets a real light; the rest
    // get the emissive extrusion alone. See the note on the light budget below.
    if (spec.kind === 'wall') {
      const [dx, dz] = K.dirVec(spec.dir)
      const [nx, nz] = K.normalVec(spec.dir)
      ctx.strips.push(K.ledStrip(root, {
        x: spec.x + dx * spec.length / 2 + nx * (D.wallDepth - 0.06),
        y: D.wallBottom - 0.012,
        z: spec.z + dz * spec.length / 2 + nz * (D.wallDepth - 0.06),
        length: spec.length - 0.1, dir: spec.dir, facing: 'down',
        // 6, down from 11. At 11 this was grazing the stone splashback to
      // 122/255 — a near-black Portoro rendering as mid-grey, which is most of
      // why the back of the room looked flat and cheap.
      color: 0xffe6cc, intensity: 6,
        lit: ctx.underCabLights++ === 0,
      }))
    }
    if (spec.feature === 'ovens') {
      const [dx, dz] = K.dirVec(spec.dir)
      root.add(K.buildOvenStack(ctx, spec.x + dx * spec.length / 2, spec.z + dz * spec.length / 2, spec.dir))
    }
    if (spec.feature === 'hob') {
      const [dx, dz] = K.dirVec(spec.dir)
      const [nx, nz] = K.normalVec(spec.dir)
      const hx = spec.x + dx * spec.length / 2 + nx * D.baseDepth / 2
      const hz = spec.z + dz * spec.length / 2 + nz * D.baseDepth / 2
      root.add(K.buildHob(ctx, hx, hz))
      root.add(K.buildHood(ctx, spec.x + dx * spec.length / 2, spec.z + dz * spec.length / 2,
        spec.dir, plan.room.h))
    }
    if (spec.sink) {
      const [dx, dz] = K.dirVec(spec.dir)
      const [nx, nz] = K.normalVec(spec.dir)
      root.add(K.buildSink(ctx,
        spec.x + dx * spec.length / 2 + nx * D.baseDepth / 2,
        spec.z + dz * spec.length / 2 + nz * D.baseDepth / 2, spec.dir))
    }
  }

  /* island */
  const isl = buildIsland(plan, state, ctx)
  root.add(isl.group)
  runMetres += isl.run
  topArea += isl.area
  counts.base += isl.counts

  // Island plinth glow.
  //
  // ONE area light per island segment, aimed at the floor, rather than one per
  // fronted side. Four of them round an L-shaped island is four of the most
  // expensive lights in the renderer producing a pool of light on the floor
  // that a single wider one produces identically — the reveal itself is
  // emissive geometry, and that is the part you actually see.
  // Island plinth glow — ONE LIGHT PER SEGMENT, not one for the island.
  //
  // This was a single rect light sized to the island's BOUNDING BOX, on the
  // reasoning that one area light is cheaper than four. It is, and it is also
  // wrong the moment the island is not a rectangle: an L-shape has an empty
  // notch inside its bounding box, so the light poured a hard-edged rectangle
  // of floor illumination into the corner where there is no plinth and no
  // cabinet above it. It read as a glowing panel lying on the floor next to
  // the breakfast bar.
  //
  // A light per segment follows the actual footprint. Two on this layout.
  for (const seg of plan.island) {
    const sw = seg.x1 - seg.x0, sd = seg.z1 - seg.z0
    const cx = (seg.x0 + seg.x1) / 2, cz = (seg.z0 + seg.z1) / 2

    const segLight = new THREE.RectAreaLight(0xffe0c2, 2.0, sw + 0.12, sd + 0.12)
    segLight.position.set(cx, 0.09, cz)
    segLight.rotation.x = -Math.PI / 2
    root.add(segLight)
    ctx.strips.push({ light: segLight, material: null })

    // The visible line of light under the plinth, on every fronted side.
    // TONE MAPPED. Bypassing the curve makes an LED strip clip to flat white
    // and stay a hard cut-out band at any exposure. Run through the same curve
    // as everything else it keeps a warm core and reads as a lit strip.
    const em = new THREE.MeshBasicMaterial({ color: 0xffe6cc })
    ctx.disposables.push(em)
    for (const side of seg.fronts) {
      const along = side === '+z' || side === '-z' ? 'x' : 'z'
      const len = along === 'x' ? sw : sd
      const ox = side === '+x' ? 1 : side === '-x' ? -1 : 0
      const oz = side === '+z' ? 1 : side === '-z' ? -1 : 0
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(along === 'x' ? len : 0.02, 0.012, along === 'x' ? 0.02 : len), em
      )
      bar.position.set(cx + ox * (sw / 2 - 0.05), D.plinth - 0.01, cz + oz * (sd / 2 - 0.05))
      root.add(bar)
      ctx.strips.push({ light: null, material: em })
    }
  }

  /* pendants over the island */
  if (plan.island.length) {
    const p = plan.pendants
    for (let i = 0; i < p.count; i++) {
      const off = (i - (p.count - 1) / 2) * p.spacing
      root.add(K.buildPendant(ctx, p.x + (p.dir === 'x' ? off : 0), p.z + (p.dir === 'z' ? off : 0),
        plan.room.h, 1.05 + (i % 2) * 0.0))
    }
  }

  /* vitrine interiors — shelves, plates, glassware, and a light */
  //
  // ONE light per cabinet, not one per shelf. Each RectAreaLight is evaluated
  // analytically for every lit fragment on screen, so they are the most
  // expensive light type in three.js by a wide margin — six of them inside a
  // display cabinet nobody can see into cost more than the entire rest of the
  // lighting rig. The shelves still read as individually lit because each one
  // carries an emissive strip, which is free.
  for (const v of ctx.vitrines) {
    const shelfMat = ctx.carcassMat
    const nShelf = Math.max(1, Math.floor(v.fh / 0.34))
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xffe6cc })
    ctx.disposables.push(stripMat)

    for (let i = 1; i <= nShelf; i++) {
      const y = v.fy + (v.fh / (nShelf + 1)) * i
      root.add(K.box(
        Math.abs(v.dx) * v.fw + Math.abs(v.nx) * (v.depth - 0.04), 0.016,
        Math.abs(v.dz) * v.fw + Math.abs(v.nz) * (v.depth - 0.04),
        shelfMat, v.cx + v.nx * v.depth / 2, y, v.cz + v.nz * v.depth / 2, { cast: false }
      ))
      const cx = v.cx + v.nx * v.depth * 0.45
      const cz = v.cz + v.nz * v.depth * 0.45
      if (i % 2) root.add(K.buildPlates(ctx, cx, y + 0.014, cz, 4))
      else root.add(K.buildGlassware(ctx, cx - 0.05, y + 0.008, cz))

      // The visible source. Free, and it is what the eye actually reads.
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.abs(v.dx) * v.fw * 0.9 + Math.abs(v.nx) * 0.012, 0.005,
          Math.abs(v.dz) * v.fw * 0.9 + Math.abs(v.nz) * 0.012
        ), stripMat
      )
      strip.position.set(v.cx + v.nx * v.depth * 0.16, y + 0.012, v.cz + v.nz * v.depth * 0.16)
      root.add(strip)
      ctx.strips.push({ light: null, material: stripMat })
    }

    // One POINT light, not an area light. The cabinet interior does need a
    // real source — without it the shelves go black and the ribbed glass has
    // nothing to refract, so the whole cabinet reads as a blank panel. A point
    // light costs a fraction of a RectAreaLight and inside a 350 mm-deep box
    // behind ribbed glass, nobody can tell the difference in shape.
    // Brighter than it looks like it needs to be: the contents have to out-read
    // the glass's own reflection, and they are behind a diffusing pane.
    const pl = new THREE.PointLight(0xffe8cc, 4.5, 1.8, 2)
    pl.position.set(
      v.cx + v.nx * v.depth * 0.35, v.fy + v.fh * 0.78, v.cz + v.nz * v.depth * 0.35
    )
    root.add(pl)
    ctx.strips.push({ light: pl, material: null })
  }

  /* props on the worktops */
  if (ctx.islandTops.length) {
    const top = ctx.islandTops[0]
    root.add(K.buildBoard(ctx, top.cx - top.w * 0.28, top.y, top.cz - 0.1))
    root.add(K.buildBottle(ctx, top.cx + top.w * 0.30, top.y, top.cz + 0.05, '#20301a'))
    root.add(K.buildGlassware(ctx, top.cx + top.w * 0.34, top.y, top.cz - 0.18))
    root.add(K.buildBowl(ctx, top.cx - top.w * 0.05, top.y, top.cz + 0.18))
    const bar = ctx.islandTops[ctx.islandTops.length - 1]
    if (bar.seg.bar) {
      const ox = bar.seg.bar === '+x' ? 1 : bar.seg.bar === '-x' ? -1 : 0
      const oz = bar.seg.bar === '+z' ? 1 : bar.seg.bar === '-z' ? -1 : 0
      for (let i = 0; i < 2; i++) {
        const t = (i - 0.5) * 0.62
        root.add(K.buildStool(ctx,
          bar.cx + ox * (bar.w / 2 + 0.28) + (ox ? 0 : t),
          bar.cz + oz * (bar.d / 2 + 0.28) + (oz ? 0 : t),
          ox ? -Math.PI / 2 * ox : (oz > 0 ? Math.PI : 0)))
      }
    }
  }
  // Herbs on the back run — the one warm-green note against all that stone.
  const backRun = plan.runs.find((r) => r.kind === 'base')
  if (backRun) {
    const [dx, dz] = K.dirVec(backRun.dir)
    const [nx, nz] = K.normalVec(backRun.dir)
    const y = D.plinth + D.baseCarcass + WORKTOPS[state.worktop].thickness
    root.add(K.buildHerbs(ctx,
      backRun.x + dx * 0.35 + nx * 0.22, y, backRun.z + dz * 0.35 + nz * 0.22))
  }

  const metrics = {
    openables: ctx.openables.length,
    runMetres,
    topArea,
    baseUnits: counts.base,
    wallUnits: counts.wall,
    tallUnits: counts.tall,
    room: plan.room,
    plan,
  }

  return { root, ctx, metrics, plan }
}

/* ----------------------------------------------------------- splashback -- */

function addSplashback(root, spec, state, ctx, plan) {
  const t = WORKTOPS[state.worktop].thickness
  const [dx, dz] = K.dirVec(spec.dir)
  const [nx, nz] = K.normalVec(spec.dir)
  const y0 = D.plinth + D.baseCarcass + t
  const full = state.splashback !== 'plaster'
  const h = (full ? plan.room.h - 0.35 : D.wallBottom) - y0
  if (h <= 0) return
  const mat = state.splashback === 'plaster'
    ? wallMaterial('#c9c8c5')
    : worktopMaterial(
      // 'contrast' is always the dark stone, whatever the worktop is.
      state.splashback === 'contrast' ? 'portoro' : state.worktop,
      [spec.length, h]
    )
  const m = new THREE.Mesh(new THREE.PlaneGeometry(spec.length, h), mat)
  // Offset along the run's OUTWARD normal — 5 mm into the room. Negating this
  // puts the splashback 5 mm inside the plasterboard, where it renders as a
  // plain painted wall and the most expensive surface in the kitchen silently
  // does not exist.
  m.position.set(
    spec.x + dx * spec.length / 2 + nx * 0.005,
    y0 + h / 2,
    spec.z + dz * spec.length / 2 + nz * 0.005
  )
  m.rotation.y = Math.abs(dx) > 0 ? (nz > 0 ? 0 : Math.PI) : (nx > 0 ? Math.PI / 2 : -Math.PI / 2)
  m.receiveShadow = true
  root.add(m)
}

/* ---------------------------------------------------------------- lights -- */

/**
 * Applies a lighting condition to an already-built kitchen. Kept separate from
 * the build so switching day/night is instant — it is the control people play
 * with most and a 200 ms rebuild there feels broken.
 */
export function applyLighting(ctx, scene, state, rig) {
  const mode = state.lighting
  const lampOn = mode === 'night' ? 1 : mode === 'dusk' ? 0.72 : 0.0

  for (const l of ctx.lamps) {
    l.light.intensity = l.base * lampOn
    l.emissive.color.setHex(lampOn > 0 ? 0xd8ab7d : 0x2a2622)
  }
  for (const s of ctx.strips) {
    if (s.light) {
      // Capture the intensity the builder authored the first time we touch the
      // light, so repeated lighting changes scale the original value rather
      // than compounding on the last scaled one.
      if (s.light.userData.authored === undefined) s.light.userData.authored = s.light.intensity
      // Strips never go fully dark in daylight — they are still on in the
      // reference daytime shots, just overwhelmed. Zeroing them makes the
      // under-cabinet zone read as a dead black band.
      // The under-cabinet and plinth strips stay strong in DAYLIGHT too. In
      // the reference they are visibly on in every shot — they are not a
      // night-time effect, they are what makes the splashback and the floor
      // read, and switching them down by time of day was flattening the
      // daytime renders.
      s.light.intensity = s.light.userData.authored * (0.55 + lampOn * 0.75)
    }
    if (s.material) s.material.color.setHex(lampOn > 0.1 ? 0xffe6cc : 0x1e1c19)
  }
    // The ceiling track heads are FITTINGS. They were five hard white dots
  // punched into the ceiling — the brightest pixels in the frame, on objects
  // nobody is looking at.
  for (const m of ctx.trackLenses) m.emissive.setHex(lampOn > 0.1 ? 0x241a10 : 0x080706)
  for (const s2 of ctx.spots) s2.light.intensity = s2.base * lampOn
  for (const b of ctx.bounce) b.light.intensity = b[mode]

  if (ctx.windowLight) {
    ctx.windowLight.intensity = WINDOW_INTENSITY[mode]
    ctx.windowLight.color.setHex(mode === 'dusk' ? 0xffb87a : mode === 'night' ? 0x8fa6d6 : 0xdce8f4)
  }

  rig.sun.intensity = mode === 'day' ? 1.5 : mode === 'dusk' ? 1.6 : 0.0
  rig.sun.color.setHex(mode === 'dusk' ? 0xffb877 : 0xfff6ec)
  // Evening is not darkness. Pulling the pendants down to stop them clipping
  // the stone took light out of the whole room, and the fill is what puts the
  // ambient back without re-creating three hotspots.
  // Hemisphere fill is UNIFORM — it lifts lit and unlit surfaces by the same
  // amount, so every unit of it is a unit of contrast removed. It is there to
  // stop shadows going pure black, and nothing more. The room's brightness
  // comes from the environment map, which is directional and keeps its shape.
  rig.fill.intensity = mode === 'day' ? 0.42 : mode === 'dusk' ? 0.26 : 0.18
  // Tuned against BONE MATT, not against the dark finishes. A near-white matt
  // front is the whole exposure budget: get it holding detail and every darker
  // finish is comfortably inside range, whereas tuning on wenge leaves the
  // light kitchens clipped to paper and unsellable.
  // These numbers jumped when the environment stopped being a bright studio
  // box and became a dark room. Same perceived brightness, very different
  // multiplier — intensity is relative to whatever the map actually contains,
  // so it is meaningless to carry these values across an environment change.
  // The environment now carries the ROOM — a bright ceiling and light walls —
  // so it does most of the lifting, and the lamps only have to supply their
  // own pools rather than trying to light the whole space.
  // Much lower than the values these replaced, because the environment is no
  // longer an idealised box — it is a probe of the real room, which is a great
  // deal brighter than the box was. Measured: at the old 0.95 the scene mean
  // went from 84 to 145 and the blacks collapsed from 33% of the frame to 3%.
  // Intensity is relative to whatever the map contains and is meaningless
  // carried across an environment change.
  scene.environmentIntensity = mode === 'day' ? 0.55 : mode === 'dusk' ? 0.42 : 0.34
  scene.backgroundIntensity = scene.environmentIntensity
}

/* ------------------------------------------------------- environment map -- */

/**
 * The environment map — what every reflective surface in the room reflects.
 *
 * This used to be three's RoomEnvironment: a bright, neutral studio box. It is
 * an excellent default and it was quietly ruining the render. Polished stone,
 * unlacquered brass and a clearcoated floor are mirrors; in a dark evening
 * kitchen they should be reflecting a dark room with a few bright sources in
 * it. Reflecting an evenly-lit grey box instead puts a milky film over every
 * expensive surface — the worktop loses its depth, the brass goes to flat
 * yellow, and no amount of tuning the direct lights gets it back, because the
 * problem is in the indirect.
 *
 * So the environment is built from the room it is standing in: dark walls, one
 * bright window, a warm band where the pendants hang, a glow at plinth level.
 * It costs one PMREM bake per lighting condition and it is the single biggest
 * difference between this looking rendered and looking photographed.
 */
function environmentScene(mode) {
  const s = new THREE.Scene()
  const add = (color, w, h, d, x, y, z, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color), side: THREE.BackSide })
    )
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, 0)
    s.add(m)
    return m
  }
  const panel = (color, w, h, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color) })
    )
    m.position.set(x, y, z)
    m.rotation.y = ry
    s.add(m)
    return m
  }

  // The room itself, seen from the inside. Dark — this is the ground the
  // bright sources sit against, and getting it too light is what produces the
  // milky look in the first place.
  // NEUTRAL, deliberately. This is the map every polished surface in the
  // kitchen reflects, so whatever colour it is, the whole room becomes. Built
  // warm — as it was — and the brass, the stone, the floor and the walls all
  // come back orange no matter what colour the actual lamps are. The warmth
  // belongs in the lamp bands below, which are small and local; the ground it
  // sits against has to stay neutral or there is nothing for it to read warm
  // AGAINST.
  // Measured off the reference frame rather than guessed. In that photograph
  // the CEILING and WALLS are the brightest large surfaces in the room —
  // roughly 75-85% — and the joinery is near-black. The picture is a bright
  // room with dark cabinets in it.
  //
  // Every previous version of this file had it backwards: a dim room lit by
  // small warm pools. That produces a murky image at every time of day, which
  // is exactly why day, dusk and evening were all wrong together — they shared
  // the same broken assumption, so retuning any one of them could not fix it.
  const shell = mode === 'day' ? '#8e8f91' : mode === 'dusk' ? '#5a5a5e' : '#45464a'
  add(shell, 14, 7, 14, 0, 1.2, 0)

  // Ceiling — always the brightest large surface in a real interior, because
  // every uplight and every lamp bounces off it.
  // A lit ceiling, not a dark one. This is the single biggest lever on how
  // expensive the room looks, because it is what every horizontal surface and
  // every satin finish in the kitchen reflects.
  const ceil = mode === 'day' ? '#ffffff' : mode === 'dusk' ? '#d8d2c8' : '#c3bcb2'
  const cMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ceil) })
  cMat.color.multiplyScalar(mode === 'day' ? 2.2 : mode === 'dusk' ? 1.7 : 1.45)
  const c = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), cMat)
  c.rotation.x = Math.PI / 2
  c.position.y = 4.6
  s.add(c)

  // The window. Big, bright, and on one side only — the asymmetry is what
  // gives metal and stone a direction to reflect, and it is exactly what a
  // uniform studio environment cannot provide.
  const win = mode === 'day' ? '#ffffff' : mode === 'dusk' ? '#ffc79a' : '#2c3f5e'
  const winPower = mode === 'day' ? 4.0 : mode === 'dusk' ? 2.6 : 0.5
  const wp = panel(win, 6.5, 3.4, 6.4, 1.7, 0, -Math.PI / 2)
  wp.material.color.multiplyScalar(winPower)

  // Pendant band and the plinth glow, at their real heights. These are what
  // put the warm streaks into the brass and the long soft reflection down the
  // polished stone.
  if (mode !== 'day') {
    const lamp = panel('#ffd9ae', 4.2, 0.30, 0, 1.75, -1.2)
    lamp.material.color.multiplyScalar(mode === 'night' ? 3.4 : 1.9)
    const lamp2 = panel('#ffd9ae', 4.2, 0.30, 0, 1.75, 1.2, Math.PI)
    lamp2.material.color.multiplyScalar(mode === 'night' ? 3.4 : 1.9)

    const plinth = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 0.5),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb877') })
    )
    plinth.material.color.multiplyScalar(mode === 'night' ? 1.6 : 0.9)
    plinth.rotation.x = -Math.PI / 2
    plinth.position.set(0, 0.06, 0)
    s.add(plinth)
  }

  return s
}

const envCache = new Map()

/**
 * Bakes a cubemap probe FROM THE ACTUAL ROOM and returns it as an environment.
 *
 * This is the difference between a product render and archviz.
 *
 * `makeEnvironment` above builds an idealised box — dark walls, a bright
 * ceiling, a window panel. Every polished surface in the kitchen reflects that
 * box, which means the worktop never reflects the cabinets standing on it and
 * the floor never reflects the island. Surfaces come out shaded rather than
 * situated, and no amount of material tuning fixes it, because the information
 * simply is not in the map.
 *
 * So: set the idealised map first, render the real scene into a cubemap from
 * the middle of the room, then PMREM that and use it instead. It is one bounce
 * of global illumination, done once.
 *
 * It is affordable for exactly the reason the rest of this design is: the
 * scene is static and rendering is on demand, so this is six faces plus a
 * PMREM per REBUILD, not per frame. On a scene that never rebuilds it happens
 * once, at load.
 */
export function bakeRoomProbe(renderer, scene, room, previous) {
  // 512, not 256. A polished floor is a mirror, and a mirror shows you exactly
  // how much detail its reflection source actually has — at 256 the reflected
  // cabinets dissolved into coloured smears. This is a one-off cost per
  // rebuild, so the resolution is worth buying.
  // 256 on phones. The probe is six full scene renders plus a PMREM; at 512 it
  // is a visible hitch on load and a memory cost that matters on a device with
  // a hard texture budget.
  // 384 on phones rather than 256: the probe is what the polished floor and the
  // stone reflect, and at 256 those reflections were mush on a screen held a
  // foot from your face. Still one bake per rebuild, not per frame.
  const probeRes = matchMedia('(pointer: coarse)').matches || innerWidth < 820 ? 384 : 512
  const rt = new THREE.WebGLCubeRenderTarget(probeRes, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  })
  const cam = new THREE.CubeCamera(0.1, 60, rt)
  // Standing height, slightly back from the island — roughly where a person
  // is, which is whose reflection of the room we want.
  cam.position.set(0, 1.45, room.d * 0.12)
  scene.add(cam)
  cam.update(renderer, scene)
  scene.remove(cam)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const tex = pmrem.fromCubemap(rt.texture).texture
  pmrem.dispose()
  rt.dispose()

  // The previous probe belongs to the previous build and nothing else refers
  // to it once this returns.
  previous?.dispose?.()
  return tex
}

export function makeEnvironment(renderer, mode = 'night') {
  if (envCache.has(mode)) return envCache.get(mode)
  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const scene = environmentScene(mode)
  const tex = pmrem.fromScene(scene, 0.02).texture
  pmrem.dispose()
  scene.traverse((o) => {
    if (o.isMesh) { o.geometry.dispose(); o.material.dispose() }
  })
  envCache.set(mode, tex)
  return tex
}

/* --------------------------------------------------------------- dispose -- */

export function disposeKitchen(built) {
  built.root.traverse((o) => {
    if (o.isMesh) {
      // Geometry is value-cached in kitchen.js and shared across rebuilds —
      // disposing it here would delete the cache out from under the next build.
      // `shared` materials are owned by the cache in materials.js and are
      // reused by every subsequent build. Disposing one here would delete it
      // out from under the next kitchen — which shows up as untextured black
      // fronts the second time you pick a finish you have already used.
      const m = o.material
      if (m && !Array.isArray(m) && !m.userData.shared) m.dispose()
    }
    if (o.isRectAreaLight || o.isPointLight) o.dispose?.()
  })
}
