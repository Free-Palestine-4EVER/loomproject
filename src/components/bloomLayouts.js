// Layout registry for #typeface (the BLOOM act on the home page) — the ONLY
// file that knows every layout's id, label and motion numbers. Deliberately
// modelled on src/three/flight/index.js: same selection rules (URL param >
// sessionStorage > shipping default), same live-switch-by-hotkey idea, so
// "how do I try the other one" is the same answer everywhere on this site.
//
// The three layouts are compositions, not skins. Each one puts the word, the
// copy block, the stats and the cuts rail somewhere genuinely different, and
// each one carries its OWN mobile numbers — a phone is not a narrow desktop.
//
//   a — SPLIT     word bleeds off the right edge, copy is a left column
//   b — STAGE     word sinks into a bottom-cropped wall of type, copy on top
//                 — the shipping default, see DEFAULT_LAYOUT_ID below
//   c — SPECIMEN  word blurs back into a wash, copy arrives as a solid card
//
// Hotkeys are SHIFT+1/2/3 (not 1/2/3 — those already switch the butterfly's
// flight profile, and the two switchers must never fight over a key).

export const LAYOUTS = {
  a: { id: 'a', label: 'Split' },
  b: { id: 'b', label: 'Stage' },
  c: { id: 'c', label: 'Specimen' },
}

// Shipping default. STAGE, chosen by eye against the other two on both a
// 1440 desktop and a 390 phone. It is the only one of the three that keeps
// the word at full size all the way through — Split shrinks it, Specimen
// blurs it — so the section still ends on the typeface rather than on a
// paragraph about it, which is the whole point of the act. Same rule as
// DEFAULT_PROFILE_ID in src/three/flight/index.js: this is a design decision,
// not a default. Look at all three before changing it.
export const DEFAULT_LAYOUT_ID = 'b'

export const LAYOUT_STORAGE_KEY = 'loom:bloom-layout'

// Per-layout, per-breakpoint motion numbers for act three (the beat where the
// word steps back and the copy arrives). `d` = desktop, `m` = <=900px.
//
//   wordScale                  the word's act-three size.
//   wordY / wordX              where the word travels, in VIEWPORT units. The
//                              word is centred by its own wrapper, so these
//                              are read against the screen and not against a
//                              clamp()ed font size — 30vh means the same
//                              third of the viewport on every device, which
//                              is the only way "cropped by the bottom edge"
//                              survives a width change.
//   wordBlur                   px of blur the word picks up as the copy lands
//                              (0 = the word stays sharp; only 'specimen'
//                              uses it, but every layout declares it so the
//                              hook graph is identical across all three).
//   wordFade                   the word's opacity at the end of act three.
//   copyFrom                   where the copy block travels in from, px.
//   beat                       [start, end] scroll window for act three.
export const LAYOUT_MOTION = {
  a: {
    d: { wordScale: [1, 0.70], wordX: ['0vw', '29vw'], wordY: ['0vh', '-2vh'], wordBlur: [0, 0], wordFade: [1, 1], copyFrom: { x: -70, y: 0 }, beat: [0.72, 0.94] },
    m: { wordScale: [1, 0.98], wordX: ['0vw', '0vw'], wordY: ['0vh', '-13vh'], wordBlur: [0, 0], wordFade: [1, 1], copyFrom: { x: -24, y: 34 }, beat: [0.7, 0.92] },
  },
  b: {
    d: { wordScale: [1, 1.34], wordX: ['0vw', '0vw'], wordY: ['0vh', '32vh'], wordBlur: [0, 0], wordFade: [1, 0.92], copyFrom: { x: 0, y: -54 }, beat: [0.7, 0.93] },
    m: { wordScale: [1, 1.55], wordX: ['0vw', '0vw'], wordY: ['0vh', '50vh'], wordBlur: [0, 0], wordFade: [1, 0.92], copyFrom: { x: 0, y: -36 }, beat: [0.68, 0.91] },
  },
  c: {
    d: { wordScale: [1, 1.12], wordX: ['0vw', '0vw'], wordY: ['0vh', '-8vh'], wordBlur: [0, 9], wordFade: [1, 0.34], copyFrom: { x: 0, y: 84 }, beat: [0.7, 0.93] },
    m: { wordScale: [1, 1.02], wordX: ['0vw', '0vw'], wordY: ['0vh', '-18vh'], wordBlur: [0, 7], wordFade: [1, 0.3], copyFrom: { x: 0, y: 64 }, beat: [0.68, 0.91] },
  },
}

function validId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(LAYOUTS, id) ? id : null
}

/** URL param wins, then sessionStorage, then the shipping default. Never throws. */
export function resolveInitialLayoutId() {
  try {
    const fromUrl = validId(new URLSearchParams(window.location.search).get('bloom'))
    if (fromUrl) return fromUrl
  } catch { /* URL/location unavailable */ }
  try {
    const fromStorage = validId(window.sessionStorage.getItem(LAYOUT_STORAGE_KEY))
    if (fromStorage) return fromStorage
  } catch { /* sessionStorage unavailable (privacy mode etc.) */ }
  return DEFAULT_LAYOUT_ID
}

/** True once a reader has EXPLICITLY picked a layout — drives the corner HUD. */
export function isExplicitLayoutSelection() {
  try {
    if (validId(new URLSearchParams(window.location.search).get('bloom'))) return true
  } catch { /* ignore */ }
  try {
    if (validId(window.sessionStorage.getItem(LAYOUT_STORAGE_KEY))) return true
  } catch { /* ignore */ }
  return false
}

export function setStoredLayoutId(id) {
  try { window.sessionStorage.setItem(LAYOUT_STORAGE_KEY, id) } catch { /* ignore */ }
}

// SHIFT+1/2/3 switches live. Read from e.code, not e.key — with shift held,
// e.key is '!'/'@'/'#' on a US layout and something else entirely elsewhere,
// while e.code stays Digit1/2/3 on every layout. Ignored while focus is in a
// form control. Returns an unbind function.
export function bindLayoutHotkeys(onSelect) {
  const CODE_TO_ID = { Digit1: 'a', Digit2: 'b', Digit3: 'c' }
  const handler = (e) => {
    if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
    const id = CODE_TO_ID[e.code]
    if (!id) return
    const t = e.target
    const tag = t && t.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return
    e.preventDefault()
    setStoredLayoutId(id)
    onSelect(id)
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}

export function formatLayoutHud(id) {
  // ASCII only: the HUD is set in a monospace stack that has no ⇧ glyph, and
  // a tofu box is worse instructions than the word.
  return `bloom: ${id} — ${LAYOUTS[id].label}   (shift+1/2/3 to switch)`
}
