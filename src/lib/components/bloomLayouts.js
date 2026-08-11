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

// ONE COMPOSITION, 11 Aug 2026 (client: "I want this as a variant, remove the
// rest"). `#typeface` used to carry three interchangeable act-three
// compositions — a Split, b Stage, c Specimen — switchable with ?bloom= or
// shift+1/2/3, each with its own desktop AND mobile numbers to keep working.
// The client picked Split and dropped the other two, so the switcher, the two
// unused layouts and the HUD that advertised them are gone rather than left
// behind as dead options nobody can reach. b and c are in git if the choice is
// ever reopened.
export const LAYOUTS = {
  a: { id: 'a', label: 'Split' },
}

// Shipping default. STAGE, chosen by eye against the other two on both a
// 1440 desktop and a 390 phone. It is the only one of the three that keeps
// the word at full size all the way through — Split shrinks it, Specimen
// blurs it — so the section still ends on the typeface rather than on a
// paragraph about it, which is the whole point of the act. Same rule as
// DEFAULT_PROFILE_ID in src/three/flight/index.js: this is a design decision,
// not a default. Look at all three before changing it.
export const DEFAULT_LAYOUT_ID = 'a'

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

// The shift+1/2/3 switcher is gone with the layouts it switched between —
// one composition needs no picker, and a hotkey that can only ever re-select
// what is already showing is worse than no hotkey. `bindLayoutHotkeys` is
// exported as a no-op so `TypeShowcase.jsx` and the lab entry points keep
// their call sites; both immediately unbind it.
export function bindLayoutHotkeys() {
  return () => {}
}

export function formatLayoutHud(id) {
  // The "(shift+1/2/3 to switch)" hint went with the switcher — there is one
  // layout now, so the line named a key combination that does nothing. A dev
  // HUD that lies is worse than no HUD.
  return `bloom: ${id} — ${LAYOUTS[id].label}`
}
