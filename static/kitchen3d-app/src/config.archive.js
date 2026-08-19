/**
 * config.archive.js — THE FULL CATALOGUE, PARKED.
 *
 * This is the complete option set as it stood before the scheme was cut down to
 * one approved specification. It is not imported by anything and does not ship
 * any cost; it exists so that bringing a finish back is a copy-paste into
 * config.js rather than a rewrite.
 *
 * Everything here still works — the generators in textures.js and materials.js
 * were untouched and accept every parameter these entries use.
 */

/**
 * config.js — the product catalogue and the live specification.
 *
 * This file is the entire "what can a customer choose" surface. Geometry, UI
 * and the spec sheet all read from it, so adding a finish means adding one
 * object here and nothing else.
 *
 * DELIBERATELY NO PRICES. A demo configurator that invents numbers gets read as
 * a toy the moment a real kitchen buyer looks at it — they know what these cost.
 * It quotes materials, linear metres and lead-time drivers instead, which is
 * both honest and what an actual studio's quote request needs.
 */

/* ------------------------------------------------------------------ doors -- */

export const DOOR_STYLES = {
  fluted: {
    name: 'Fluted',
    note: 'Solid staves, 18 mm pitch, machined from one board so the reeds run through',
    lead: 3,
  },
  slab: {
    name: 'Slab',
    note: 'Flat front, 4 mm shadow gap, no handle — the quietest option',
    lead: 0,
  },
  shaker: {
    name: 'Shaker',
    note: 'Framed and panelled, 70 mm stile — the only traditional front here',
    lead: 2,
  },
  vgroove: {
    name: 'V-groove',
    note: 'Milled 45° grooves at 90 mm — reads as boarding, cleans like a slab',
    lead: 2,
  },
}

/* --------------------------------------------------------------- finishes -- */
// Each entry carries the numbers the wood/paint generator needs. The colour
// names are the ones a joiner would actually use.

export const CABINET_FINISHES = {
  wenge: {
    name: 'Fumed Wenge',
    kind: 'wood',
    swatch: '#2a1c14',
    // Fumed wenge is very nearly black — the reference reads it at under 10%
    // reflectance. It was sitting at more like 25%, which under a properly lit
    // room comes out mid-brown and takes the whole island with it.
    wood: { early: '#332318', late: '#150e09', sap: '#4a3120', rings: 13, warp: 1.4, baseRough: 0.36 },
    note: 'Fumed, not stained — the darkening goes through the board',
  },
  walnut: {
    name: 'American Walnut',
    kind: 'wood',
    swatch: '#4a3220',
    wood: { early: '#6b4b30', late: '#33200f', sap: '#8a6a48', rings: 11, warp: 1.5, baseRough: 0.42 },
    note: 'Crown-cut, book-matched across each run',
  },
  oak: {
    name: 'Smoked Oak',
    kind: 'wood',
    swatch: '#6d5334',
    wood: { early: '#8d6c46', late: '#4b361f', sap: '#a3855e', rings: 15, warp: 1.25, baseRough: 0.48, poreDepth: 0.7 },
    note: 'Open pore, hard-wax oiled — repairable in place',
  },
  graphite: {
    name: 'Graphite Matt',
    kind: 'paint',
    swatch: '#2f3134',
    paint: { color: '#2f3134', rough: 0.62, clear: 0.18 },
    note: 'Sprayed 2-pack, dead matt, fingerprint-resistant',
  },
  ivory: {
    name: 'Bone Matt',
    kind: 'paint',
    swatch: '#ddd6c9',
    paint: { color: '#ddd6c9', rough: 0.66, clear: 0.12 },
    note: 'Warm off-white — holds up under 2700 K far better than a true white',
  },
  olive: {
    name: 'Deep Olive',
    kind: 'paint',
    swatch: '#3c4433',
    paint: { color: '#3c4433', rough: 0.60, clear: 0.20 },
    note: 'Sprayed 2-pack; the only saturated colour we will put on a full run',
  },
}

/* --------------------------------------------------------------- worktops -- */

export const WORKTOPS = {
  portoro: {
    name: 'Portoro Gold',
    swatch: '#2b2620',
    thickness: 0.02,
    marble: {
      base: '#1c1b19', haze: '#262523', vein: '#8f7440', hairline: '#b8a077',
      scale: 2.4, warp: 1.5, veinSharpness: 11, polish: 0.045, seed: 7,
    },
    note: 'Book-matched across the island; 20 mm with a mitred 60 mm edge',
  },
  calacatta: {
    name: 'Calacatta Viola',
    swatch: '#e8e4de',
    thickness: 0.02,
    marble: {
      base: '#efece7', haze: '#ded7ce', vein: '#7c5f6b', hairline: '#4a3540',
      scale: 2.4, warp: 1.8, veinSharpness: 9, polish: 0.05, seed: 12,
    },
    note: 'Single slab, veins run through the sink cut-out',
  },
  ash: {
    name: 'Grigio Ash',
    swatch: '#9c9a97',
    thickness: 0.012,
    marble: {
      base: '#b3b1ad', haze: '#a4a29e', vein: '#c4c2be', hairline: '#d6d4d0',
      scale: 2.2, warp: 1.2, veinSharpness: 6, polish: 0.16, seed: 31,
    },
    note: 'Sintered stone, 12 mm — the thin-edge look, and it takes a hot pan',
  },
  cement: {
    name: 'Micro-cement',
    swatch: '#8e8a83',
    thickness: 0.03,
    plaster: { color: '#8e8a83', rough0: 0.72 },
    note: 'Poured seamless over the run; no joints anywhere',
  },
  butcher: {
    name: 'Oiled Oak',
    swatch: '#7a5a35',
    thickness: 0.04,
    wood: { early: '#9a7449', late: '#5b3f22', sap: '#b08b5f', rings: 22, warp: 1.1, baseRough: 0.5 },
    note: '40 mm stave-laminated — for the island only, never at the sink',
  },
}

/* ----------------------------------------------------------------- metals -- */

export const METALS = {
  brass: { name: 'Unlacquered Brass', swatch: '#b08d4f', color: '#c9a35c', rough: 0.28, metal: 1.0,
    note: 'Will patinate. That is the point — do not order it if that is a problem.' },
  blackened: { name: 'Blackened Steel', swatch: '#2a2a2c', color: '#3a3a3d', rough: 0.42, metal: 1.0,
    note: 'Hand-blackened and waxed' },
  nickel: { name: 'Brushed Nickel', swatch: '#a8aaad', color: '#c2c4c7', rough: 0.30, metal: 1.0,
    note: 'The neutral choice; disappears against stone' },
  bronze: { name: 'Dark Bronze', swatch: '#5c4530', color: '#6d5238', rough: 0.34, metal: 1.0,
    note: 'Warmer than blackened steel without going gold' },
}

/* ------------------------------------------------------------------ floor -- */

// NOTE ON NAMING. These two are BASKETWEAVE parquet, not herringbone — the
// blocks group into alternating squares rather than running as a zigzag. That
// is what the layout algorithm in textures.js produces, and calling it
// herringbone on a spec sheet a joiner is going to read would be a lie about
// the product. Named for what it is.
export const FLOORS = {
  herringbone: { name: 'Oak Parquet', swatch: '#7d5a38', kind: 'herringbone',
    // Mid-brown, not blonde. Under the brighter room the old values came out
    // pale and the floor stopped anchoring the image.
    // Darker again. Measured at 162/255 against a target near 95 — a floor
    // this pale competes with the ceiling for the eye and flattens the room.
    params: { early: '#5f4227', late: '#331f10' }, note: '600 × 150 blocks, basketweave, laid 45° to the island' },
  darkparquet: { name: 'Smoked Parquet', swatch: '#4a3423', kind: 'herringbone',
    params: { early: '#46301d', late: '#22150a' }, note: 'Same block, fumed through' },
  stone: { name: 'Large-format Stone', swatch: '#a6a29b', kind: 'plaster',
    params: { color: '#a6a29b', rough0: 0.55 }, note: '1200 × 1200, 3 mm joint' },
  cement: { name: 'Poured Micro-cement', swatch: '#8b8781', kind: 'plaster',
    params: { color: '#8b8781', rough0: 0.68 }, note: 'Seamless, underfloor-heating compatible' },
}

/* --------------------------------------------------------------- layouts -- */
// Metric, in metres, because that is what the joinery is drawn in.

export const LAYOUTS = {
  L: {
    name: 'L-shape + island',
    note: 'The reference layout. Wet run on the island, tall bank on the return.',
    // 6.0 m deep, not 5.2. The extra 800 mm is not for the kitchen — it is
    // standing room. A showroom camera needs somewhere to stand, and a room
    // sized exactly to its joinery can only ever be photographed from inside
    // the island.
    room: { w: 6.6, d: 6.6, h: 2.85 },
  },
  U: {
    name: 'U-shape',
    note: 'Three walls of run, no island — the most storage per square metre',
    room: { w: 5.4, d: 4.6, h: 2.85 },
  },
  island: {
    name: 'Single run + island',
    note: 'One wall of tall units, everything else on the island',
    room: { w: 6.4, d: 5.0, h: 2.85 },
  },
  galley: {
    name: 'Galley',
    note: 'Two facing runs, 1200 clear between — the working cook’s layout',
    room: { w: 5.0, d: 4.2, h: 2.85 },
  },
}

/* --------------------------------------------------------------- lighting -- */

export const LIGHTING = {
  day: { name: 'Daylight', note: 'Overcast north light, no lamps' },
  dusk: { name: 'Dusk', note: 'Low sun through the glazing, lamps just on' },
  night: { name: 'Evening', note: 'Lamps only — the reference condition' },
}

/* ------------------------------------------------------- splashback -- */

/**
 * The splashback is its own decision, not a consequence of the worktop.
 *
 * The reference kitchen pairs a light grey worktop with a near-black stone
 * splashback, and that pairing is the whole composition: a pale horizontal
 * plane against a dark vertical one. "Match worktop" cannot express it, and
 * forcing them to agree was quietly flattening every scheme.
 */
export const SPLASHBACKS = {
  worktop: { name: 'Match worktop' },
  contrast: { name: 'Contrast stone' },
  plaster: { name: 'Plaster' },
}

/* ------------------------------------------------------------ default set -- */

// The default scheme is the reference kitchen: near-black fluted wenge, a pale
// sintered-stone worktop, a dark stone splashback behind, brass reveals.
export const DEFAULTS = {
  layout: 'L',
  door: 'fluted',
  cabinet: 'wenge',
  worktop: 'ash',
  metal: 'brass',
  floor: 'herringbone',
  lighting: 'night',
  handles: 'rail',
  splashback: 'contrast',
  view: 'showroom',
}

/* --------------------------------------------------------- specification -- */

/**
 * Turns a config into the text a studio would put on a quote request.
 * Lengths come from the layout the geometry actually built, so the two can
 * never drift apart.
 */
export function specify(state, metrics) {
  const cab = CABINET_FINISHES[state.cabinet]
  const top = WORKTOPS[state.worktop]
  const door = DOOR_STYLES[state.door]
  const metal = METALS[state.metal]
  const floor = FLOORS[state.floor]

  const lead = 8 + door.lead + (cab.kind === 'wood' ? 2 : 0) + (top.marble ? 2 : 0)

  return {
    lines: [
      ['Layout', LAYOUTS[state.layout].name],
      ['Run length', `${metrics.runMetres.toFixed(1)} linear m`],
      ['Worktop area', `${metrics.topArea.toFixed(1)} m²`],
      ['Fronts', `${door.name} — ${cab.name}`],
      ['Worktop', `${top.name}, ${Math.round(top.thickness * 1000)} mm`],
      ['Splashback', state.splashback === 'plaster' ? 'Lime plaster'
        : state.splashback === 'contrast' ? 'Portoro Gold, full height'
          : `${top.name}, full height`],
      ['Ironmongery', metal.name],
      ['Floor', floor.name],
      ['Cabinets', `${metrics.baseUnits} base · ${metrics.wallUnits} wall · ${metrics.tallUnits} tall`],
    ],
    lead: `${lead}–${lead + 3} weeks`,
    notes: [door.note, cab.note, top.note, metal.note].filter(Boolean),
  }
}
