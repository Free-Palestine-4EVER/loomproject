// Flight profile registry — the ONLY file that knows every profile's id,
// label and module path. A profile author touches ONLY their own file
// (glider.js / flutter.js / darter.js); nobody needs to edit this file, the
// registration below already exists for all three, or Companion.js/the lab.
//
// See src/three/Companion.js's header for the full profileContract: what
// `ctx` a profile's update() receives and what fields its return value may
// set. This file only owns SELECTION (which profile is active, how it is
// chosen and switched) and a couple of tiny helpers both Companion.js and
// butterfly-lab.js call so their switching logic can never drift apart.
export const PROFILES = {
  a: { id: 'a', label: 'Glider', load: () => import('./glider.js') },
  b: { id: 'b', label: 'Flutter', load: () => import('./flutter.js') },
  c: { id: 'c', label: 'Darter', load: () => import('./darter.js') },
}

// Shipping default: what a visitor who never touches ?flight= or 1/2/3 sees.
// Flutter is the closest of the three stubs to the flight feel this rig
// already tuned (a burst-then-coast wingbeat with moderate banking), so it
// is the safe "nothing selected" choice.
export const DEFAULT_PROFILE_ID = 'b'

// sessionStorage key both entry points read/write, so a profile switch made
// on the real page is remembered if the reader opens the lab next (and vice
// versa) for the rest of the tab's session — never across a new tab/session.
export const FLIGHT_STORAGE_KEY = 'loom:flight-profile'

function validId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(PROFILES, id) ? id : null
}

// URL param wins, then sessionStorage, then the shipping default. Never
// throws — safe to call before any DOM/storage guarantee (SSR-safe callers
// should still guard for `window` themselves; this file assumes a browser).
export function resolveInitialProfileId() {
  try {
    const fromUrl = validId(new URLSearchParams(window.location.search).get('flight'))
    if (fromUrl) return fromUrl
  } catch { /* URL/location unavailable — fall through */ }
  try {
    const fromStorage = validId(window.sessionStorage.getItem(FLIGHT_STORAGE_KEY))
    if (fromStorage) return fromStorage
  } catch { /* sessionStorage unavailable (privacy mode etc.) */ }
  return DEFAULT_PROFILE_ID
}

// True once a reader has EXPLICITLY named a profile — via the URL or a prior
// hotkey press this session — as opposed to silently riding the shipping
// default. Drives whether the corner HUD is allowed to show outside dev.
export function isExplicitProfileSelection() {
  try {
    if (validId(new URLSearchParams(window.location.search).get('flight'))) return true
  } catch { /* ignore */ }
  try {
    if (validId(window.sessionStorage.getItem(FLIGHT_STORAGE_KEY))) return true
  } catch { /* ignore */ }
  return false
}

export function setStoredProfileId(id) {
  try { window.sessionStorage.setItem(FLIGHT_STORAGE_KEY, id) } catch { /* ignore */ }
}

// Resolves and imports a profile module. Always resolves — an unknown id
// silently falls back to the shipping default rather than leaving the flyer
// undriven.
export async function loadProfile(id) {
  const entry = PROFILES[validId(id) || DEFAULT_PROFILE_ID]
  const mod = await entry.load()
  return { id: entry.id, label: entry.label, module: mod.default }
}

// Keys 1/2/3 switch live, everywhere both entry points run. Ignored while
// focus is in a form control (typing "1" into a field should type "1", not
// change the flight). Returns an unbind function.
export function bindProfileHotkeys(onSelect) {
  const KEY_TO_ID = { 1: 'a', 2: 'b', 3: 'c' }
  const handler = (e) => {
    const id = KEY_TO_ID[e.key]
    if (!id) return
    const t = e.target
    const tag = t && t.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return
    setStoredProfileId(id)
    onSelect(id)
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}

// Applies a profile's `rig` overrides (a partial WING_RIG_DEFAULTS patch) to
// a prepFlyer() flyer. Both Companion.js and butterfly-lab.js call this same
// one-liner so "how a profile's rig patch reaches the model" has exactly one
// implementation.
export function applyRigOverrides(flyer, rigPatch) {
  if (rigPatch && flyer && flyer.rig) Object.assign(flyer.rig, rigPatch)
}

export function formatHudText(id, label) {
  return `flight: ${id} — ${label}   (1/2/3 to switch)`
}

// Small seeded PRNG (mulberry32) — handed to profiles as ctx.rng so they can
// use reproducible-for-the-life-of-this-activation pseudo-randomness without
// polluting (or being polluted by) any other Math.random() consumer on the
// page. Reseeded on every profile activation, including re-selecting the
// same profile — it is not a per-page-load-stable seed.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
