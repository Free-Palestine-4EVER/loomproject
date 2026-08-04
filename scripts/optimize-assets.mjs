// Re-encode the oversized static assets.
//
//   node scripts/optimize-assets.mjs            dry run, prints the ledger
//   node scripts/optimize-assets.mjs --apply    rewrites in place
//
// Measured against the running site rather than guessed: an in-page audit read
// every <img>'s naturalWidth against its rendered box and flagged anything
// carrying more than 2x the pixels a retina display can use. The nav logo was
// the worst — 1579px wide, painted at 95px, eager, above the fold, 185 KB.
//
// Originals are kept in scripts/_asset-originals/ (outside public/, or they
// would be copied into dist/ and served).
import sharp from 'sharp'
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const PUB = join(ROOT, 'public')
const BACKUP = join(HERE, '_asset-originals')
const APPLY = process.argv.includes('--apply')

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
let before = 0, after = 0
const rows = []

function backup(abs) {
  const rel = relative(PUB, abs)
  const dest = join(BACKUP, rel)
  if (existsSync(dest)) return
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(abs, dest)
}

async function reencode(abs, { width = null, quality = 84, label = '' } = {}) {
  if (!existsSync(abs)) return
  const was = statSync(abs).size
  let img = sharp(abs)
  const meta = await img.metadata()
  if (width && meta.width > width) img = img.resize({ width, withoutEnlargement: true })
  const buf = await img.webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer()
  before += was; after += buf.length
  rows.push(`  ${relative(PUB, abs).padEnd(44)} ${String(meta.width).padStart(5)}px -> ${String(Math.min(width || meta.width, meta.width)).padStart(5)}px   ${kb(was).padStart(7)} -> ${kb(buf.length).padStart(7)}  ${label}`)
  if (APPLY) { backup(abs); writeFileSync(abs, buf) }
}

// New file rather than an in-place resize: the same asset is also painted as a
// full-width footer word, where the big one is right.
async function derive(absIn, absOut, width, quality = 84) {
  if (!existsSync(absIn)) return
  const buf = await sharp(absIn).resize({ width, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer()
  after += buf.length
  rows.push(`  ${relative(PUB, absOut).padEnd(44)} ${'new'.padStart(5)}    -> ${String(width).padStart(5)}px   ${''.padStart(7)}    ${kb(buf.length).padStart(7)}  derived`)
  if (APPLY) writeFileSync(absOut, buf)
}

const walk = (dir, test) => {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p, test))
    else if (test(e.name)) out.push(p)
  }
  return out
}

console.log('logo — 8.3x oversampled in the nav, and eager above the fold')
await derive(join(PUB, 'img/logo/loom-woven.webp'), join(PUB, 'img/logo/loom-woven-sm.webp'), 480)

console.log('\nwool icons — 320px squares painted at 26-72px')
for (const f of walk(join(PUB, 'img/wool/icons'), (n) => n.endsWith('.webp'))) {
  await reencode(f, { width: 160, quality: 86 })
}

console.log('\nyarn tiles — 179px PNGs at 40-60 KB each; webp does the same job in a tenth')
for (const f of walk(join(PUB, 'img/wool/yarn'), (n) => n.endsWith('.png'))) {
  const out = f.replace(/\.png$/, '.webp')
  const was = statSync(f).size
  const buf = await sharp(f).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer()
  before += was; after += buf.length
  rows.push(`  ${relative(PUB, f).padEnd(44)} ${'png'.padStart(5)}    -> ${' webp'.padStart(5)}   ${kb(was).padStart(7)} -> ${kb(buf.length).padStart(7)}`)
  if (APPLY) { backup(f); writeFileSync(out, buf) }
}

console.log('\nfull-bleed art — capped at 1400px, which is 2x its largest painted box')
for (const n of ['img/weave-key.webp', 'img/weave-alt.webp', 'img/ai-loom.webp', 'img/edge-cover.webp']) {
  await reencode(join(PUB, n), { width: 1400, quality: 82 })
}

console.log('\ncrew art — card figures, never painted above ~420px')
for (const f of walk(join(PUB, 'img/crew'), (n) => n.endsWith('.webp'))) {
  await reencode(f, { width: 900, quality: 84 })
}

// These three are WoolButton's single hardest-shared renders (nav + hero +
// mobile burger menu, at three DIFFERENT box sizes) — a 2026-08 audit read
// them oversized even after the blanket 560px pass below. A shared width
// can't fix that without either blurring whichever context is biggest or
// leaving the smaller contexts fat, so each gets its OWN target, sized off
// the actual largest getBoundingClientRect it hits anywhere on the page
// (measured with Playwright across 1440x900 / 1920x1080 / 390x844, every
// scroll position, nav menu open): get-started maxes in the nav (120px,
// size="small"), 256px is ~2.1x. see-the-work is hero-only, capped at 176px
// by .hero-ctas' clamp; 360px is ~2x. start-weaving's biggest box is NOT the
// 176px hero copy — it's the "big" CTA in the mobile burger menu, whose
// clamp(210px, 19vw, 252px) floors at 210px for every width the menu can
// even be open at (<=820px); 440px covers that at ~2.1x. Quality bumped to
// 90 (from the blanket pass's 82) since these are the site's most-seen brand
// buttons and got shrunk hard.
const WOOL_BUTTON_OVERRIDES = {
  'get-started': 256,
  'start-weaving': 440,
  'see-the-work': 360,
}

// The pills are photographs of real wool, so they need real resolution — but
// 720px for a nav CTA painted at 120px is four times what any display can use.
// 560px covers the largest one on the page (the hero pair, ~254px) at 2.2x.
console.log('\nwool buttons — 720px photographs, painted between 120px and 254px')
for (const f of walk(join(PUB, 'img/wool/buttons'), (n) => n.endsWith('.webp'))) {
  if (Object.keys(WOOL_BUTTON_OVERRIDES).some((name) => f.endsWith(`/${name}.webp`))) continue
  await reencode(f, { width: 560, quality: 82 })
}

console.log('\nwool buttons (audited pair) — resized to their real max on-page box, not the shared 560px guess')
for (const [name, width] of Object.entries(WOOL_BUTTON_OVERRIDES)) {
  await reencode(join(PUB, `img/wool/buttons/${name}.webp`), { width, quality: 90 })
}

// The FAB mark is a fixed CSS box — 86px on desktop, 74px on mobile — at
// every viewport, forever (see whatsapp-fab.css); it never grows. 500px
// source was 5.8x oversampled AND eager-equivalent (downloaded on first
// paint of every page). 180px is ~2.1x the 86px box; quality 90 to match
// the wool buttons above — it's the same felted-cutout brand material.
console.log('\nwhatsapp FAB mark — fixed 86px box on every viewport, never bigger')
await reencode(join(PUB, 'img/whatsapp-wool.webp'), { width: 180, quality: 90 })

console.log('\ncase covers + boards — grid tiles and overlay boards')
for (const f of walk(join(PUB, 'img/cases'), (n) => n.endsWith('.webp'))) {
  if (statSync(f).size < 120 * 1024) continue
  await reencode(f, { width: 1600, quality: 82 })
}

console.log()
console.log(rows.join('\n'))
console.log(`\ntotal  ${kb(before)} -> ${kb(after)}   (saved ${kb(before - after)})`)
console.log(APPLY ? 'Written; originals in scripts/_asset-originals/.' : 'Dry run — pass --apply to write.')
