/**
 * ui.js — the configurator panel.
 *
 * Built from config.js at runtime, so the catalogue is the single source of
 * truth and the panel can never list a finish the renderer cannot build.
 *
 * TWO PRINCIPLES, both learned from watching people use these things:
 *
 *  1. A SWATCH IS THE CONTROL. Nobody reads "Fumed Wenge" and pictures it.
 *     Every option is a colour or a drawn thumbnail first and a label second,
 *     and the label stays visible — a swatch grid with hover-only names is
 *     unusable on touch, which is where most of this traffic is.
 *
 *  2. THE PANEL MUST NOT COVER THE PRODUCT. On desktop it is a column down one
 *     side with the 3D running full-bleed behind it. On mobile it becomes a
 *     sheet you can collapse to a single row, because a phone screen split
 *     50/50 shows you neither the kitchen nor the choices.
 */

import {
  DOOR_STYLES, CABINET_FINISHES, WORKTOPS, METALS, FLOORS, LAYOUTS, LIGHTING,
  SPLASHBACKS, HANDLES, specify,
} from './config.js'
import { VIEWS } from './camera.js'

const el = (tag, cls, txt) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (txt != null) n.textContent = txt
  return n
}

/**
 * Swatch fill. Wood finishes get a drawn gradient with grain lines rather than
 * a flat colour — a flat brown square next to a flat grey square tells you
 * nothing about which is timber.
 */
/**
 * Door styles have no colour of their own — they are a PROFILE. Drawing the
 * profile as a gradient is what makes the four of them distinguishable at
 * 60 px; four identical dark squares with captions is not a swatch grid, it is
 * a radio list wearing a costume.
 */
const DOOR_SWATCH = {
  fluted: 'repeating-linear-gradient(90deg, #14100c 0 1px, #453427 1px 3px, #6b503a 3px 4px, #453427 4px 6px)',
  slab: 'linear-gradient(160deg, #55402e 0%, #3a2b1e 55%, #241a12 100%)',
  shaker: 'linear-gradient(#3a2b1e, #3a2b1e) padding-box, linear-gradient(160deg, #6b503a, #241a12) border-box',
  vgroove: 'repeating-linear-gradient(90deg, #3f2f22 0 9px, #17110c 9px 10px, #6b503a 10px 11px)',
}

function swatchStyle(node, opt) {
  if (opt.lead !== undefined) {
    // A door style. Keyed off the catalogue entry rather than the id so a new
    // door without art falls through to a plain fill instead of rendering black.
    node.style.background = DOOR_SWATCH[opt.__id] ?? 'linear-gradient(160deg,#55402e,#241a12)'
    if (opt.__id === 'shaker') {
      node.style.border = '5px solid transparent'
      node.style.backgroundClip = 'padding-box, border-box'
      node.style.backgroundOrigin = 'border-box'
    }
    return
  }
  if (opt.wood || opt.kind === 'wood') {
    const w = opt.wood ?? opt.params ?? {}
    node.style.background =
      `repeating-linear-gradient(92deg, ${w.late ?? '#3a2418'} 0 2px, ${w.early ?? '#5a3b26'} 2px 5px, ${w.late ?? '#3a2418'} 5px 7px)`
  } else if (opt.marble) {
    node.style.background =
      `linear-gradient(135deg, ${opt.marble.base} 0%, ${opt.marble.haze} 46%, ${opt.marble.vein} 52%, ${opt.marble.base} 60%, ${opt.marble.hairline} 74%, ${opt.marble.base} 100%)`
  } else if (opt.metal) {
    node.style.background =
      `linear-gradient(120deg, #0000 0%, #fff6 22%, #0000 40%, #fff3 62%, #0000 80%), ${opt.swatch}`
  } else {
    node.style.background = opt.swatch
  }
}

function group(title, options, current, onPick, { columns = 3 } = {}) {
  const wrap = el('section', 'grp')
  const head = el('header', 'grp-h')
  head.append(el('h3', null, title))
  const val = el('span', 'grp-v', options[current]?.name ?? '')
  head.append(val)
  wrap.append(head)

  const grid = el('div', 'sw-grid')
  grid.style.setProperty('--cols', columns)
  for (const [id, opt] of Object.entries(options)) {
    opt.__id = id
    const b = el('button', 'sw')
    b.type = 'button'
    b.dataset.id = id
    b.setAttribute('aria-pressed', String(id === current))
    b.title = opt.name
    const chip = el('span', 'sw-chip')
    swatchStyle(chip, opt)
    b.append(chip, el('span', 'sw-n', opt.name))
    b.addEventListener('click', () => {
      for (const s of grid.children) s.setAttribute('aria-pressed', 'false')
      b.setAttribute('aria-pressed', 'true')
      val.textContent = opt.name
      onPick(id)
    })
    grid.append(b)
  }
  wrap.append(grid)
  return wrap
}

function segmented(title, options, current, onPick) {
  const wrap = el('section', 'grp')
  wrap.append(el('h3', null, title))
  const row = el('div', 'seg')
  for (const [id, opt] of Object.entries(options)) {
    const b = el('button', 'seg-b', opt.name)
    b.type = 'button'
    b.setAttribute('aria-pressed', String(id === current))
    b.addEventListener('click', () => {
      for (const s of row.children) s.setAttribute('aria-pressed', 'false')
      b.setAttribute('aria-pressed', 'true')
      onPick(id)
    })
    row.append(b)
  }
  wrap.append(row)
  return wrap
}

export function buildUI(state, handlers) {
  const panel = document.getElementById('panel')
  panel.innerHTML = ''

  const opts = el('div', 'panel-scroll')

  // A group with one option is not a choice — it is a label pretending to be a
  // control. While the catalogue is cut to a single approved scheme, every
  // group collapses to one entry, so they are all skipped and the panel hides
  // itself. Add a second finish to any table in config.js and its group
  // reappears automatically.
  const add = (node, count) => { if (count > 1) opts.append(node) }

  add(segmented('Layout', LAYOUTS, state.layout, handlers.set('layout')),
    Object.keys(LAYOUTS).length)
  add(group('Door', DOOR_STYLES, state.door, handlers.set('door'), { columns: 4 }),
    Object.keys(DOOR_STYLES).length)
  add(group('Cabinet finish', CABINET_FINISHES, state.cabinet, handlers.set('cabinet')),
    Object.keys(CABINET_FINISHES).length)
  add(group('Worktop', WORKTOPS, state.worktop, handlers.set('worktop')),
    Object.keys(WORKTOPS).length)
  add(group('Ironmongery', METALS, state.metal, handlers.set('metal'), { columns: 4 }),
    Object.keys(METALS).length)
  add(group('Floor', FLOORS, state.floor, handlers.set('floor'), { columns: 4 }),
    Object.keys(FLOORS).length)
  add(segmented('Light', LIGHTING, state.lighting, handlers.set('lighting')),
    Object.keys(LIGHTING).length)
  add(segmented('Handles', HANDLES, state.handles, handlers.set('handles')),
    Object.keys(HANDLES).length)
  add(segmented('Splashback', SPLASHBACKS, state.splashback, handlers.set('splashback')),
    Object.keys(SPLASHBACKS).length)

  const empty = opts.children.length === 0
  document.body.classList.toggle('no-options', empty)
  if (!empty) panel.append(opts)

  return panel
}

/* ------------------------------------------------------------ spec sheet -- */

export function renderSpec(state, metrics) {
  const spec = specify(state, metrics)
  const host = document.getElementById('spec')
  host.innerHTML = ''

  const h = el('div', 'spec-h')
  h.append(el('span', 'spec-k', 'Specification'))
  host.append(h)

  const dl = el('dl', 'spec-l')
  for (const [k, v] of spec.lines) {
    dl.append(el('dt', null, k))
    dl.append(el('dd', null, v))
  }
  host.append(dl)

  const lead = el('div', 'spec-lead')
  lead.append(el('span', null, 'Indicative lead time'))
  lead.append(el('strong', null, spec.lead))
  host.append(lead)

  const notes = el('ul', 'spec-notes')
  for (const n of spec.notes) notes.append(el('li', null, n))
  host.append(notes)

  return spec
}

/* --------------------------------------------------------------- viewbar -- */

export function buildViewBar(current, onPick) {
  const bar = document.getElementById('views')
  bar.innerHTML = ''
  for (const [id, v] of Object.entries(VIEWS)) {
    const b = el('button', 'view-b')
    b.type = 'button'
    b.setAttribute('aria-pressed', String(id === current))
    b.append(el('span', 'view-n', v.name))
    b.append(el('span', 'view-h', v.hint))
    b.addEventListener('click', () => {
      for (const s of bar.children) s.setAttribute('aria-pressed', 'false')
      b.setAttribute('aria-pressed', 'true')
      onPick(id)
    })
    bar.append(b)
  }
}

/* ----------------------------------------------------------------- state -- */

/**
 * The config lives in the URL. Sharing a kitchen is the whole point of a
 * configurator — a customer picks a spec and sends it to their partner, their
 * architect and us. If that link does not restore the exact kitchen, the
 * feature does not exist.
 */
export function readStateFromURL(defaults) {
  const p = new URLSearchParams(location.search)
  const out = { ...defaults }
  for (const k of Object.keys(defaults)) {
    const v = p.get(k)
    if (v) out[k] = v
  }
  return validate(out, defaults)
}

export function writeStateToURL(state) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(state)) p.set(k, v)
  history.replaceState(null, '', `${location.pathname}?${p}`)
}

function validate(s, defaults) {
  const tables = {
    layout: LAYOUTS, door: DOOR_STYLES, cabinet: CABINET_FINISHES,
    worktop: WORKTOPS, metal: METALS, floor: FLOORS, lighting: LIGHTING,
  }
  for (const [k, table] of Object.entries(tables)) {
    if (!table[s[k]]) s[k] = defaults[k]
  }
  if (!HANDLES[s.handles]) s.handles = defaults.handles
  if (!SPLASHBACKS[s.splashback]) s.splashback = defaults.splashback
  if (!VIEWS[s.view]) s.view = defaults.view
  return s
}

/* ------------------------------------------------------------------ misc -- */

export function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('on')
  clearTimeout(toast._t)
  toast._t = setTimeout(() => t.classList.remove('on'), 2200)
}

export function setLoading(pct, label) {
  const g = document.getElementById('gate')
  if (!g) return
  if (pct >= 1) {
    g.classList.add('done')
    setTimeout(() => g.remove(), 900)
    return
  }
  g.querySelector('.gate-bar-fill').style.transform = `scaleX(${pct})`
  if (label) g.querySelector('.gate-l').textContent = label
}
