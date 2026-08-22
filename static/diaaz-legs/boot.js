/*
  Diaaz legs for the LOOM configurator — /loom-table.html?legs=1 only.

  WHAT THIS IS. The table, the camera, the lighting, the tabs and every existing
  option are the configurator's own and are not touched. This adds ONE more tab,
  "Legs", carrying Diaaz's real leg catalogue: the same 3D meshes the Diaaz iOS
  app ships as USDZ (`Diaaz/Resources/Legs`), exported to glTF. "Original" is the
  first chip and the default, so the page opens on exactly the table it opened on
  before — the spider base that is baked into walnut-spider-tables.glb.

  WHY IT IS A SEPARATE FILE AND A QUERY FLAG. /configurator and /diaaz are the
  same build, the same HTML and the same chunks. Only /diaaz asks for the legs
  (its iframe src carries ?legs=1), and only then is this file loaded. The three
  hooks it uses inside chunk 933 are no-ops while nothing defines them, so
  /configurator runs byte-identically to before.

  HOW A LEG GETS INTO THE SCENE.
    1. `__diaazAugment(scene)` runs on the cloned model before the site collects
       its groups, and appends one hidden donor mesh per catalogue entry. That is
       the site's own mechanism for building a tab — a donor is a two-triangle
       invisible mesh whose userData names a group and a variant, and the panel
       draws a swatch for each one. No model file was modified to add this tab.
    2. Picking a chip calls the controller's setMaterial("Legs", <title>), which
       `pre()` intercepts: the mesh is fetched, prepared and fitted, the baked
       base is hidden and the new leg is added under the top.
    3. `post()` runs after every OTHER choice, because they all reach the legs:
       a shape change moves the footprint the leg must fit, and a wood or base
       change is the material the leg has to take.

  GEOMETRY. `legs.js` is Diaaz's own module, unchanged — it strips the tabletop
  out of the drawing, drops the stray side-view detail beside it, welds and
  creases the triangle soup, and fits the result to a given envelope. The
  envelope here is measured off the BAKED BASE for the current shape, so a Diaaz
  leg occupies exactly the space the original base occupied: same height, same
  footprint, same centre. That is what keeps "just the legs changed" true.
*/

const FLAG = 'legs'
const LEGS_GROUP_INDEX = 5
const MODULES = '/diaaz-legs/'
const THUMBS = MODULES + 'thumbs/'

/*
  Diaaz's catalogue, in the app's own order and with the app's own titles
  (`ConfigOptions.swift`): the eleven timber-section legs first, then the metal
  ones. The label under a chip IS the variant id the panel reports back, so
  these strings have to be unique — six shapes exist in both families with
  genuinely different sections, and those carry "· metal".

  Three of the app's 32 files are byte-identical to their timber twin
  (Xmasivnimetal, Okrugleravnemetal, Kockavelmermetal — same mesh, filed twice
  because the app picks the file from the material). They are not shipped: the
  material here is the configurator's own Base tab, so a second copy of one mesh
  would be a chip that does nothing. 29 distinct legs remain.
*/
const CATALOGUE = [
  { id: 'Original' },
  { id: 'Centralni spajder', file: 'Centralnispajder' },
  { id: 'Kitzer', file: 'Kitzer' },
  { id: 'Kocka velmer', file: 'Kockavelmer' },
  { id: 'Okrugle konus', file: 'Okruglekonus' },
  { id: 'Okrugle ravne', file: 'Okrugleravne' },
  { id: 'Ravne dijagonalne', file: 'Ravnedijagonalne' },
  { id: 'Ravne profil kvadrat', file: 'Ravneprofilkvadrat' },
  { id: 'Ravne profil pravougaonik', file: 'Ravneprofilpravougaonik' },
  { id: 'Spajder', file: 'Spajder' },
  { id: 'Trapez', file: 'Trapeznew' },
  { id: 'X masivni', file: 'Xmasivni' },
  { id: 'Centralni spajder · metal', file: 'Centralnispajdermetal' },
  { id: 'Cube', file: 'Cubemetal' },
  { id: 'Elvis Presley', file: 'Elvispresleymetal' },
  { id: 'Herkul', file: 'Herkulmetal' },
  { id: 'Krila', file: 'Krilametal' },
  { id: 'Model A', file: 'Modelametal' },
  { id: 'Model X s otvorom', file: 'Modelxsacentralnimotvorommetal' },
  { id: 'Model Z', file: 'Modelzmetal' },
  { id: 'Žičane noge 80/90', file: 'Modelzicanenoge8090' },
  { id: 'Ravne dijagonale · metal', file: 'Ravnedijagonalemetal' },
  { id: 'Ravne profil kvadrat · metal', file: 'Ravneprofilkvadratmetal' },
  { id: 'Ravne profil pravougaonik · metal', file: 'Ravneprofilpravougaonikmetal' },
  { id: 'Ravne tanke', file: 'Ravnetankametal' },
  { id: 'Spajder · metal', file: 'Spajdermetal' },
  { id: 'Trapez · metal', file: 'Trapezmetal' },
  { id: 'X bez spojeva s prorezom', file: 'Xbezspojevasaprorezommetal' },
  { id: 'X bez spojeva', file: 'Xbezspojevametal' },
  { id: 'X masivni i profil', file: 'Xmasivniiprofilmetal' },
]

const PARAMS = new URLSearchParams(location.search)
if (PARAMS.get(FLAG) === '1') install()
if (PARAMS.get('panel') === '0') hidePanel()
if (PARAMS.get('bridge') === '1') bridge()

/*
  The embed's own bottom panel, hidden.

  /diaaz drives the configurator from its own control rail beside the frame, so
  the panel inside it would be a second set of the same controls sitting over
  the table. Hidden by attribute-prefix selector rather than the hashed class
  name, which is a build artefact and changes whenever the bundle is rebuilt.
*/
function hidePanel() {
  const el = document.createElement('style')
  /*
    VISIBILITY, NOT DISPLAY. The page's own landing script composes the shot by
    scrolling until the option panel's bottom sits just inside the viewport —
    it measures getBoundingClientRect() on that exact element. `display:none`
    returns a zero rect, the target computes as "scroll to the top", and the
    frame is left on the wide washed-out approach shot forever. Hidden this way
    the panel still occupies its box, so the framing is the one /configurator
    lands on, with nothing drawn over the table.
  */
  el.textContent =
    '[class*="ColorPanel_panel"]{visibility:hidden!important;pointer-events:none!important}'
  document.documentElement.appendChild(el)
}

/*
  postMessage bridge: everything the outer page needs to run the configurator
  and nothing more.

  Out: one "ready" carrying every group and its variants, in the order the
  panel would have drawn them, so the rail is built from what the MODEL
  actually offers rather than from a hardcoded list that can drift from it.
  In: {type:'set', group, id} — the exact call the panel makes on a click.

  Same origin either way (the page and the frame are both served from this
  site), so this is a message channel for convenience, not a trust boundary.
*/
function bridge() {
  const post = (msg) => parent.postMessage({ ...msg, channel: 'diaaz-cfg' }, location.origin)

  const announce = () => {
    const c = window.__diaazController
    if (!c || !c.materials) return false
    const groups = Object.entries(c.materials).map(([group, variants]) => ({
      group,
      // Reversed: the panel enumerates each group back-to-front, and that
      // reversed order is the one every label and swatch was authored against.
      options: Object.keys(variants).reverse(),
    }))
    post({ type: 'ready', groups, state: { ...(c.state || {}) } })
    return true
  }

  window.addEventListener('diaaz:controller', announce)
  if (!announce()) {
    const poll = setInterval(() => announce() && clearInterval(poll), 200)
    setTimeout(() => clearInterval(poll), 60000)
  }

  window.addEventListener('message', (e) => {
    const d = e.data
    if (!d || d.channel !== 'diaaz-cfg' || d.type !== 'set') return
    const c = window.__diaazController
    if (!c) return
    c.setMaterial(d.group, d.id)
    post({ type: 'applied', group: d.group, id: d.id })
  })
}

function install() {
  const state = { id: 'Original', mesh: null, token: 0, ready: null }

  /* The chips. `ti` in the page chunk holds one CSS background per swatch, per
     group, in on-screen order. The chunk now reads `window.__diaazChips` first
     and falls back to its own `ti`, so a build that never loads this file draws
     exactly the five rows it always did. Legs are the sixth group — the tab
     order comes from the model file (Shape, Wood, Finish, Resin, Base) and the
     donors above are appended after all of it. Diaaz's own catalogue drawings, trimmed and darkened, are
     the images; "Original" gets the table's own walnut rather than a drawing,
     because it is not a Diaaz product, it is what the table already has. */
  window.__diaazChips = {}
  window.__diaazChips[LEGS_GROUP_INDEX] = CATALOGUE.map((e) =>
    e.file
      ? `#fff url("${THUMBS}${e.file}.webp") center/contain no-repeat`
      : 'linear-gradient(118deg,#3A2A1C 0%,#6B4A2E 34%,#8A6238 50%,#6B4A2E 66%,#3A2A1C 100%)'
  )

  style()

  /* Hidden donor meshes are how this site builds a tab; see the note at the
     top. They are appended in REVERSE because the panel enumerates each group
     back-to-front, and the site seeds a group's default from the last entry in
     file order — which after the reverse is "Original", so the page still opens
     on the table's own base without touching the defaults map. */
  window.__diaazAugment = (scene) => {
    const THREE = window.__SITE_THREE__
    if (!THREE || !scene) return
    const material = new THREE.MeshStandardMaterial()
    for (let i = CATALOGUE.length - 1; i >= 0; i--) {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.001, 0, 0, 0, 0.001, 0], 3))
      const donor = new THREE.Mesh(g, material)
      donor.userData = { materialNodeId: 'Legs', id: CATALOGUE[i].id, noShadow: true }
      donor.visible = false
      scene.add(donor)
    }
  }

  window.__diaazLegs = {
    // Runs INSTEAD of the site's own handler when the group is ours.
    pre(group, id, ctx) {
      if (group !== 'Legs') return false
      select(id, ctx)
      return true
    },
    // Runs after every other choice: they all change something a leg depends on.
    post(group, id, ctx) {
      if (state.id === 'Original') return
      if (group === 'Shape') refit(ctx)
      else dressLeg(ctx)
      hideBakedBase(ctx)
    },
  }

  /* ---- the swap ------------------------------------------------------- */

  function select(id, ctx) {
    const entry = CATALOGUE.find((e) => e.id === id) || CATALOGUE[0]
    state.id = entry.id
    if (!entry.file) return showOriginal(ctx)
    build(entry, ctx)
  }

  function showOriginal(ctx) {
    state.token++
    if (state.mesh) {
      state.mesh.parent && state.mesh.parent.remove(state.mesh)
      state.mesh.geometry.dispose()
      state.mesh = null
    }
    // Hand the baked base back to the site's own visibility rule rather than
    // forcing it on: on a shape it does not belong to it must stay hidden.
    const st = ctx.st
    each(ctx, 'Base', (o) => {
      const shapeId = o.userData && o.userData.shapeId
      o.visible = !shapeId || shapeId === st.shape
    })
  }

  async function build(entry, ctx) {
    const token = ++state.token
    try {
      const { loadLeg, fitLeg } = await modules()
      const raw = deslab(await loadLeg(entry.file), entry.file)
      if (!raw || token !== state.token) return
      mount(raw, fitLeg, ctx, token)
    } catch (err) {
      console.warn('[diaaz-legs] could not build', entry.file, err)
    }
  }

  function refit(ctx) {
    const entry = CATALOGUE.find((e) => e.id === state.id)
    if (entry && entry.file) build(entry, ctx)
  }

  function mount(raw, fitLeg, ctx, token) {
    const THREE = window.__SITE_THREE__
    const env = bakedBaseEnvelope(ctx)
    if (!env) return

    const size = env.getSize(new THREE.Vector3())
    // spread 1: the leg is fitted to the envelope the baked base already
    // occupies, so nothing about the table's proportions moves. Diaaz's own
    // 0.62/0.66 is for its own tops, whose bases sit well inside the footprint.
    const geometry = fitLeg(raw, {
      length: size.x,
      width: size.z,
      legHeight: size.y,
      spreadX: 1,
      spreadZ: 1,
    })
    boxProjectUVs(geometry, 0.5)

    if (token !== state.token) return

    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())
    const centre = env.getCenter(new THREE.Vector3())
    mesh.position.set(centre.x, env.min.y, centre.z)
    mesh.castShadow = true
    mesh.receiveShadow = false // the top receiving its own shadow is trap 1
    mesh.userData = { diaazLeg: true }

    showOriginal(ctx) // clears any previous leg
    state.token = token
    state.mesh = mesh
    ctx.model.add(mesh)
    dressLeg(ctx)
    hideBakedBase(ctx)
  }

  /** The leg wears whatever the Base tab is currently showing. */
  function dressLeg(ctx) {
    if (!state.mesh) return
    let donor = null
    each(ctx, 'Base', (o) => {
      if (!donor && o.material) donor = o.material
    })
    if (donor) state.mesh.material = donor.clone()
  }

  function hideBakedBase(ctx) {
    each(ctx, 'Base', (o) => {
      o.visible = false
    })
  }

  /**
   * The box the baked base for the CURRENT shape fills, in the model's own
   * space. Measured rather than assumed: each shape ships its own base in the
   * GLB, scaled to that top's footprint, and reading it is what makes a Diaaz
   * leg land at the right height under every one of them.
   */
  function bakedBaseEnvelope(ctx) {
    const THREE = window.__SITE_THREE__
    const nodes = (ctx.nodes && ctx.nodes.Base) || []
    const shape = ctx.st.shape
    const box = new THREE.Box3()
    let found = false
    for (const node of nodes) {
      const shapeId = node.userData && node.userData.shapeId
      if (shapeId && shapeId !== shape) continue
      const one = new THREE.Box3().setFromObject(node)
      if (one.isEmpty()) continue
      box.union(one)
      found = true
    }
    if (!found) return null
    ctx.model.updateMatrixWorld(true)
    return box.applyMatrix4(new THREE.Matrix4().copy(ctx.model.matrixWorld).invert())
  }

  function each(ctx, group, fn) {
    const nodes = ctx.nodes && ctx.nodes[group]
    if (nodes) nodes.forEach(fn)
  }


  /**
   * Second pass at the tabletop, on top of the one legs.js already does.
   *
   * Diaaz's drawings mostly include the table the legs are drawn under, and
   * legs.js finds and removes that slab by looking for a horizontal plane that
   * dominates the model's SURFACE AREA. On a few of the reconstructions that
   * test misses — a heavily detailed base carries enough area of its own that
   * the slab never dominates — and the leg then arrives with a full tabletop
   * welded to the top of it. Fitted under a table, that reads as a second,
   * thicker top hanging under the real one: obviously wrong, and the reason
   * Kitzer, Spajder · metal and Ravne profil kvadrat · metal were unusable.
   *
   * A tabletop is better identified by FOOTPRINT than by area: it is a flat
   * upward face that covers most of the model's own plan. A rail or a mounting
   * plate never does — the widest apron here covers under a third. So: bin the
   * upward-facing area by height, and if any bin in the top third covers 45% or
   * more of the plan, walk down while the band still looks like slab and cut.
   *
   * Cached per file: the prepared geometry it reads is cached by legs.js, so
   * this runs once per leg no matter how often it is picked.
   */
  function deslab(geometry, key) {
    if (!geometry) return geometry
    if (deslab.cache.has(key)) return deslab.cache.get(key)
    const THREE = window.__SITE_THREE__
    // legs.js welds its output, so what comes back is INDEXED and its position
    // array is not three-vertices-per-triangle. Everything below walks
    // triangles, so it has to see the expanded form.
    const source = geometry.index ? geometry.toNonIndexed() : geometry
    const pos = source.getAttribute('position').array
    if (!source.boundingBox) source.computeBoundingBox()
    const bb = source.boundingBox
    const span = bb.max.y - bb.min.y
    const plan = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z)
    let out = geometry
    if (span > 0 && plan > 0) {
      const BINS = 60
      const flat = new Float64Array(BINS)
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
      const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3()
      for (let i = 0; i < pos.length; i += 9) {
        a.set(pos[i], pos[i + 1], pos[i + 2])
        b.set(pos[i + 3], pos[i + 4], pos[i + 5])
        c.set(pos[i + 6], pos[i + 7], pos[i + 8])
        ab.subVectors(b, a); ac.subVectors(c, a); n.crossVectors(ab, ac)
        const area = n.length() * 0.5
        if (!(area > 0)) continue
        n.normalize()
        if (n.y < 0.8) continue // upward faces only: the slab's own top surface
        const cy = (a.y + b.y + c.y) / 3
        let bin = Math.floor(((cy - bb.min.y) / span) * BINS)
        bin = Math.max(0, Math.min(BINS - 1, bin))
        flat[bin] += area
      }
      let peak = 0, peakBin = -1
      for (let i = Math.floor(BINS * 0.66); i < BINS; i++) {
        if (flat[i] > peak) { peak = flat[i]; peakBin = i }
      }
      if (peakBin >= 0 && peak >= plan * 0.45) {
        let bin = peakBin
        while (bin > 0 && flat[bin - 1] > peak * 0.2) bin--
        const cut = bb.min.y + (bin / BINS) * span
        if (cut > bb.min.y + span * 0.5) {
          // Normals are CARRIED, not recomputed: legs.js welded and creased
          // this geometry by angle, and recomputing on the loose triangles it
          // hands back would flatten every rounded member into facets.
          const nrm = source.getAttribute('normal')
          const keptPos = [], keptNrm = []
          for (let i = 0; i < pos.length; i += 9) {
            const cy = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3
            if (cy >= cut) continue
            for (let k = 0; k < 9; k++) keptPos.push(pos[i + k])
            if (nrm) for (let k = 0; k < 9; k++) keptNrm.push(nrm.array[i + k])
          }
          if (keptPos.length > 24) {
            const g = new THREE.BufferGeometry()
            g.setAttribute('position', new THREE.Float32BufferAttribute(keptPos, 3))
            if (keptNrm.length === keptPos.length) {
              g.setAttribute('normal', new THREE.Float32BufferAttribute(keptNrm, 3))
            } else {
              g.computeVertexNormals()
            }
            g.computeBoundingBox()
            out = g
          }
        }
      }
    }
    deslab.cache.set(key, out)
    return out
  }
  deslab.cache = new Map()
  // Published so the catalogue can be swept from the console — every leg
  // prepared, fitted and rendered in one pass — without clicking 29 chips.
  window.__diaazDeslab = deslab

  /* ---- support -------------------------------------------------------- */

  function modules() {
    if (!state.ready) state.ready = import(MODULES + 'legs.js')
    return state.ready
  }

  /**
   * Diaaz's legs arrive as position-and-normal soup with no UVs at all, and the
   * timber materials here are textured. Each vertex is projected off its
   * dominant normal onto a 0.5 m grid — a box projection, because one planar
   * projection smears the grain into stripes down every diagonal bar. The tile
   * is the legs' own, far finer than the top's 2.6 m: a 115 mm bar at the top's
   * scale covers about one texel and comes out flat and pale.
   *
   * Written to both `uv` and `uv1`: the species materials read TEXCOORD_1 (the
   * world-scale set) while the walnut sheet reads TEXCOORD_0, and the leg has
   * to look right under either.
   */
  function boxProjectUVs(geometry, tile) {
    const THREE = window.__SITE_THREE__
    const pos = geometry.getAttribute('position')
    const nor = geometry.getAttribute('normal')
    if (!pos || !nor) return
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i))
      let u, v
      if (ny > 0.5) { u = x; v = z }
      else if (nx > 0.5) { u = z; v = y }
      else { u = x; v = y }
      uv[i * 2] = u / tile
      uv[i * 2 + 1] = v / tile
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    geometry.setAttribute('uv1', new THREE.BufferAttribute(uv.slice(), 2))
  }

  /**
   * A leg is a shape, not a colour, so its chips are taller than the material
   * swatches next to them — a Diaaz drawing squeezed into the stock 120x40 slot
   * is unreadable. Scoped to the sixth group in the row, which is this one, so
   * every existing tab keeps the panel it has always had.
   */
  function style() {
    const css = `
      .ColorPanel_colors__noG_Z > *:nth-child(6) .ColorPanel_colorContent__HCSeO {
        width: 6.75rem !important;
        height: 4.75rem !important;
        background-color: #fff;
      }
      .ColorPanel_colors__noG_Z > *:nth-child(6) .ColorPanel_block__udna5 p {
        max-width: 7.25rem;
        line-height: 1.25;
        font-size: 0.75rem;
      }
      @media (max-width: 640px) {
        .ColorPanel_colors__noG_Z > *:nth-child(6) .ColorPanel_colorContent__HCSeO {
          width: 5.25rem !important;
          height: 3.75rem !important;
        }
      }
    `
    const el = document.createElement('style')
    el.textContent = css
    document.head.appendChild(el)
  }
}
