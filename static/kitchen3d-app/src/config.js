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

// ONE SCHEME.
//
// The catalogue below has been cut to the single approved specification. Every
// generator behind it (textures.js, materials.js, kitchen.js) still accepts the
// full parameter range it always did — nothing was deleted from the engine — so
// adding a new scheme is adding an entry to these tables and nothing else.
//
// The previous catalogue is preserved verbatim in config.archive.js, next to
// this file, so a finish can be brought back by copying its object across.

export const DOOR_STYLES = {
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
  ivory: {
    name: 'Bone Matt',
    kind: 'paint',
    swatch: '#ddd6c9',
    paint: { color: '#ddd6c9', rough: 0.66, clear: 0.12 },
    note: 'Warm off-white — holds up under 2700 K far better than a true white',
  },
}

/* --------------------------------------------------------------- worktops -- */

export const WORKTOPS = {
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
}

/* ----------------------------------------------------------------- metals -- */

export const METALS = {
  nickel: {
    name: 'Brushed Nickel', swatch: '#a8aaad', color: '#c2c4c7', rough: 0.30, metal: 1.0,
    note: 'The neutral choice; disappears against stone',
  },
}

/* ------------------------------------------------------------------ floor -- */

// NOTE ON NAMING. These two are BASKETWEAVE parquet, not herringbone — the
// blocks group into alternating squares rather than running as a zigzag. That
// is what the layout algorithm in textures.js produces, and calling it
// herringbone on a spec sheet a joiner is going to read would be a lie about
// the product. Named for what it is.
export const FLOORS = {
  darkparquet: {
    name: 'Smoked Parquet', swatch: '#4a3423', kind: 'herringbone',
    params: { early: '#46301d', late: '#22150a' }, note: 'Engineered board, fumed through, laid 45° to the island',
  },
}

/* --------------------------------------------------------------- layouts -- */
// Metric, in metres, because that is what the joinery is drawn in.

export const LAYOUTS = {
  L: {
    name: 'L-shape + island',
    note: 'Wet run on the island, tall bank on the return.',
    // 6.0 m deep, not 5.2. The extra 800 mm is not for the kitchen — it is
    // standing room. A showroom camera needs somewhere to stand, and a room
    // sized exactly to its joinery can only ever be photographed from inside
    // the island.
    room: { w: 6.6, d: 6.6, h: 2.85 },
  },
}

/* --------------------------------------------------------------- lighting -- */

export const LIGHTING = {
  night: { name: 'Evening', note: 'Lamps only — the approved condition' },
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
export const HANDLES = {
  bar: { name: 'Bar' },
}

export const SPLASHBACKS = {
  worktop: { name: 'Match worktop' },
}

/* ------------------------------------------------------------ default set -- */

// The default scheme is the reference kitchen: near-black fluted wenge, a pale
// sintered-stone worktop, a dark stone splashback behind, brass reveals.
// The approved specification, and currently the only one.
export const DEFAULTS = {
  layout: 'L',
  door: 'vgroove',
  cabinet: 'ivory',
  worktop: 'calacatta',
  metal: 'nickel',
  floor: 'darkparquet',
  lighting: 'night',
  handles: 'bar',
  splashback: 'worktop',
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
