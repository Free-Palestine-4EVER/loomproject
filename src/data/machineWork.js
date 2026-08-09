// ——— THE MACHINE — "one month" showcase tiles ———
// This grid used to run on 16 cross-industry wool renders from
// public/img/niches/*-9x16 — generic style pieces attached to no client,
// which forced the caption to admit "not posts published for any one
// client". That undercut the section. This file now drives the grid from
// CASES (src/data/site.js) instead: the same 16 real client folders under
// public/img/cases/<slug>/ that the case-study pages already use. Every
// client name, country and year comes from CASES — nothing here is a typed
// literal — so the grid can never drift from what the case pages say.
//
// SELECTION. Each case contributes its star-*.webp frames (the post-shaped
// crops `feature: stars(slug, n)` already builds in site.js) when it has
// any, else falls back to its single cover.webp (only `benetton` has zero
// stars right now). A round-robin walks CASES in order, taking one image
// per client per pass, so the FIRST 16 picks already cover every client —
// extra passes only add a second frame to clients that have more, and stop
// once TARGET_COUNT is reached. This is deliberately an algorithm over the
// live CASES array, not a hand-picked list: add or resize a case in
// site.js and this reflows on its own.
//
// DIMENSIONS. <img> needs real width/height to avoid layout shift, and
// these files are not a uniform 720x1280 the way the old niche renders
// were — every client shoot has its own crop. DIMS below is a measured
// lookup (`sips -g pixelWidth -g pixelHeight`, not assumed) for every
// star/cover file any case could round-robin into, keyed by "slug/file" —
// intrinsic pixel sizes, not editorial content, so it stays a plain data
// table rather than something that could drift from the truth.
//
// AVIF. Coverage is uneven across the case folders (checked with `find
// public/img/cases -name '*.avif'`): only 12 of the 32 star frames and 6 of
// the 16 covers have an avif sibling. <picture> does NOT fall back to the
// next <source> when the chosen one 404s — that only happens on a
// type/media mismatch — so emitting an avif <source> for a file that
// doesn't exist would silently blank the tile for every avif-capable
// browser. AVIF_FILES below is read from disk via import.meta.glob at
// build time (Vite resolves globs statically), so "does this frame have an
// avif" is verified, never guessed.
import { CASES } from './site.js'

const DIMS = {
  'auraa/star-0': [1300, 993], 'auraa/star-1': [1300, 1950], 'auraa/star-2': [1300, 1950],
  'bezdrob/star-0': [1300, 807],
  'boccapiena/star-0': [1300, 867], 'boccapiena/star-1': [1291, 1936], 'boccapiena/star-2': [960, 720],
  'ellie/star-0': [1300, 1315],
  'evorahome/star-0': [1300, 917],
  'herbas/star-0': [1300, 867], 'herbas/star-1': [1300, 975], 'herbas/star-2': [1265, 1265],
  'maison/star-0': [1300, 1072], 'maison/star-1': [1300, 1605],
  'modulart/star-0': [1200, 1600],
  'ojar/star-0': [1300, 1625], 'ojar/star-1': [1300, 428], 'ojar/star-2': [1300, 1300],
  'place87/star-0': [1300, 777], 'place87/star-1': [1300, 975], 'place87/star-2': [1300, 975],
  'scion/star-0': [1300, 731], 'scion/star-1': [1300, 963],
  'shteq/star-0': [1300, 975], 'shteq/star-1': [1300, 731], 'shteq/star-2': [1152, 648],
  'slatko/star-0': [1300, 731], 'slatko/star-1': [1300, 731],
  'weitnauer/star-0': [1300, 867], 'weitnauer/star-1': [1300, 1300], 'weitnauer/star-2': [1300, 801],
  'zen2fit/star-0': [1300, 731],
  'auraa/cover': [960, 733], 'benetton/cover': [960, 540], 'bezdrob/cover': [960, 596],
  'boccapiena/cover': [960, 640], 'ellie/cover': [1040, 715], 'evorahome/cover': [1040, 715],
  'herbas/cover': [960, 640], 'maison/cover': [1040, 715], 'modulart/cover': [960, 1280],
  'ojar/cover': [1040, 1040], 'place87/cover': [960, 574], 'scion/cover': [960, 540],
  'shteq/cover': [960, 720], 'slatko/cover': [960, 540], 'weitnauer/cover': [960, 640],
  'zen2fit/cover': [960, 540],
}

const avifModules = import.meta.glob('/public/img/cases/*/*.avif', { eager: true, query: '?url', import: 'default' })
const AVIF_FILES = new Set(
  Object.keys(avifModules).map((p) => p.replace('/public/img/cases/', '').replace(/\.avif$/, ''))
)

// How many tiles the grid tries to fill. Real client work only, spread
// across as many distinct clients as the round-robin can reach — with 16
// case folders on disk, this reliably lands on all 16 before it ever
// reaches for a second frame.
const TARGET_COUNT = 20

const pools = CASES.map((c) => ({
  case: c,
  images: c.feature.length > 0 ? c.feature : [c.cover],
}))

const picked = []
let round = 0
while (picked.length < TARGET_COUNT) {
  let addedThisRound = false
  for (const p of pools) {
    if (picked.length >= TARGET_COUNT) break
    const path = p.images[round]
    if (!path) continue
    picked.push({ case: p.case, path })
    addedThisRound = true
  }
  round += 1
  if (!addedThisRound) break // every case's images are exhausted
}

const MACHINE_CLIENT_WORK = picked.map(({ case: c, path }) => {
  // path looks like /img/cases/<slug>/<file>.webp
  const m = path.match(/\/img\/cases\/([^/]+)\/([^/]+)\.webp$/)
  const [slug, file] = m ? [m[1], m[2]] : [c.slug, 'cover']
  const key = `${slug}/${file}`
  const [width, height] = DIMS[key] || [1300, 975]
  const src = path.replace(/\.webp$/, '')
  return {
    id: `case-${slug}-${file}`,
    src,
    avif: AVIF_FILES.has(key),
    alt: `${c.client} — ${c.title}, real work from LOOM's ${c.country} ${c.year} project`,
    kind: 'post',
    width,
    height,
    client: c.client,
  }
})

// Optional real client work — populated only if the files actually exist at
// build time. import.meta.glob is resolved by Vite at build, so this stays
// an empty array (never a 404) until public/img/work/evora/*.webp lands.
// Harmless probe, left in place: Evora already appears in MACHINE_CLIENT_WORK
// above via its case folder (public/img/cases/evorahome/), so nothing here
// needs to feed MACHINE_WORK today — this only exists so a future drop of
// real Evora carousel/reel frames at that path has somewhere to slot in.
const evoraFiles = import.meta.glob(
  '/public/img/work/evora/*.webp',
  { eager: true, query: '?url', import: 'default' }
)
void evoraFiles // referenced so the glob isn't flagged as dead code by linters

// No reel-shaped or video asset exists anywhere in this static build
// (checked: zero .mp4/.webm/.mov under public/). MACHINE_REELS stays a
// named, empty export — rather than left out entirely — so the intent
// reads in the data itself, and TheMachine.jsx's derived reel count is
// never a hand-typed number. The 'reel' rendering path (play-badge, round
// treatment) stays fully wired in TheMachine.jsx so a real reel cover slots
// in the moment one exists.
export const MACHINE_REELS = []

export const MACHINE_WORK = [...MACHINE_CLIENT_WORK, ...MACHINE_REELS]

// How many distinct clients actually made it into MACHINE_WORK — used by
// TheMachine.jsx's caption so "N clients" is always counted from the data,
// never typed as a literal.
export const MACHINE_CLIENT_COUNT = new Set(MACHINE_WORK.map((w) => w.client).filter(Boolean)).size
