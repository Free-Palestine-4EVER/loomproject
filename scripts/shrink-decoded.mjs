// Re-encode and RESIZE for decoded-bitmap memory, not for download size.
//
//   node scripts/shrink-decoded.mjs            dry run, prints the ledger
//   node scripts/shrink-decoded.mjs --apply    rewrites in place / writes cuts
//
// WHY THIS EXISTS, and why it is not optimize-assets.mjs
// ─────────────────────────────────────────────────────
// iOS Safari kills a tab at a per-tab memory ceiling. What counts against that
// ceiling is DECODED bitmap RAM — `naturalWidth * naturalHeight * 4` bytes,
// resident for as long as the <img> holds the bitmap. It is completely
// independent of file size and of codec: re-encoding a 20 KB webp as a 12 KB
// AVIF saves 8 KB of download and EXACTLY ZERO bytes of RAM. Only fewer pixels
// help, and halving a width QUARTERS the RAM.
//
// Measured with Playwright at 390x844 / DPR 2 and DPR 3, scrolling the whole
// document and summing naturalWidth*naturalHeight*4 across document.images:
// peak 119.1 MB resident across 61 images, in the ~4,200px band the viewport
// budget keeps alive around y≈9,600 (the Selected Work mosaic, where every
// tile carries a MacBook + iPhone frame + a screenshot + a cover).
//
// `optimize-assets.mjs` is the BYTES pass — it sizes brand furniture (nav
// logo, wool buttons, the FAB) against its painted box and re-encodes. This
// file is the PIXELS pass, and it targets a different, larger set: the
// photographic content that repeats. The two are independent and both are
// re-runnable; run optimize-assets first, then this.
//
// EVERY cap below is the LARGEST CSS box that image is ever painted at,
// measured on the built site at 390px AND 1440px viewports (crawling the whole
// document, plus the CSS that owns the box where a crawl cannot reach it),
// then multiplied by 2 for retina and rounded up. Nothing here is a guess; the
// measured box is quoted next to each entry so a future change can re-derive
// it. Where the cap would degrade an image, the entry says so and is skipped.
//
// Originals are kept in scripts/_asset-originals/ (outside public/, or they
// would be copied into dist/ and served).
import sharp from 'sharp'
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join, relative, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const PUB = join(ROOT, 'public')
const BACKUP = join(HERE, '_asset-originals')
const APPLY = process.argv.includes('--apply')

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const mb = (n) => `${(n / 1048576).toFixed(2)} MB`
const rows = []
let bytesBefore = 0, bytesAfter = 0, ramBefore = 0, ramAfter = 0

function backup(abs) {
  const dest = join(BACKUP, relative(PUB, abs))
  if (existsSync(dest)) return
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(abs, dest)
}

const walk = (dir, test) => {
  if (!existsSync(dir)) return []
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p, test))
    else if (test(e.name)) out.push(p)
  }
  return out
}

/** Shrink a file IN PLACE to `width`, keeping its name and its codec.
 *  Same name on purpose: several of these are referenced by convention
 *  (`/img/cases/<slug>/screen-desktop.webp` is assembled from a slug), so a
 *  rename would have to be chased through code that builds paths as strings. */
async function shrink(abs, width, note = '') {
  if (!existsSync(abs)) return
  const was = statSync(abs).size
  const img = sharp(abs)
  const meta = await img.metadata()
  if (meta.width <= width) {
    rows.push(`  ${relative(PUB, abs).padEnd(46)} ${String(meta.width).padStart(5)}px  already <= ${width}px — skipped`)
    return
  }
  const h2 = Math.round((meta.height * width) / meta.width)
  const p = img.resize({ width, withoutEnlargement: true })
  // PNG stays PNG (the two device frames carry a real alpha cutout and are
  // referenced as .png from a component this pass is not allowed to edit).
  const buf = meta.format === 'png'
    ? await p.png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 }).toBuffer()
    : meta.format === 'jpeg'
      ? await p.jpeg({ quality: 84, mozjpeg: true }).toBuffer()
      : await p.webp({ quality: 84, alphaQuality: 100, effort: 6 }).toBuffer()

  bytesBefore += was; bytesAfter += buf.length
  ramBefore += meta.width * meta.height * 4
  ramAfter += width * h2 * 4
  rows.push(
    `  ${relative(PUB, abs).padEnd(46)} ${String(meta.width).padStart(5)} -> ${String(width).padStart(5)}px` +
    `   ${kb(was).padStart(8)} -> ${kb(buf.length).padStart(8)}` +
    `   RAM ${mb(meta.width * meta.height * 4).padStart(8)} -> ${mb(width * h2 * 4).padStart(8)}  ${note}`
  )
  if (APPLY) { backup(abs); writeFileSync(abs, buf) }
}

/** Write a NEW small cut next to the original. The original stays — it is
 *  still the right file on a wide desktop; the cut is what a phone picks via
 *  srcset, and both descriptors are stated honestly in the component. */
async function cut(absIn, absOut, width, quality = 84) {
  if (!existsSync(absIn)) { rows.push(`  MISSING ${relative(PUB, absIn)}`); return }
  const meta = await sharp(absIn).metadata()
  const w = Math.min(width, meta.width)
  const h2 = Math.round((meta.height * w) / meta.width)
  const buf = await sharp(absIn).resize({ width: w, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer()
  bytesAfter += buf.length
  rows.push(
    `  ${relative(PUB, absOut).padEnd(46)} ${'cut'.padStart(5)} -> ${String(w).padStart(5)}px` +
    `   ${''.padStart(8)}    ${kb(buf.length).padStart(8)}` +
    `   RAM ${''.padStart(8)}    ${mb(w * h2 * 4).padStart(8)}  derived`
  )
  if (APPLY) { mkdirSync(dirname(absOut), { recursive: true }); writeFileSync(absOut, buf) }
}

/** An AVIF sibling. The webp keeps its filename and stays the <img src>, so a
 *  browser with no AVIF and any path built by string concatenation are both
 *  unaffected — the AVIF is only ever reached through an explicit <source> in
 *  a component. This buys download bytes and NOT ONE BYTE of decoded RAM; it
 *  is here because first paint on a slow connection is a real problem too,
 *  just not THE problem.
 *
 *  ALWAYS written, even in the rare case it loses on bytes. `<picture>` does
 *  NOT fall through to the next <source> when the one it picked 404s — it
 *  paints a broken image and stops. So "write it only if it wins" would make
 *  the set of files on disk depend on the encoder's mood, and a component
 *  naming one of them would be one bad frame away from a hole in the page.
 *  A file that exists is worth more than a few hundred bytes. */
async function avif(absWebp, { quality = 52 } = {}) {
  if (!existsSync(absWebp)) { rows.push(`  MISSING (avif source) ${relative(PUB, absWebp)}`); return }
  const was = statSync(absWebp).size
  const out = absWebp.replace(/\.webp$/, '.avif')
  const buf = await sharp(absWebp).avif({ quality, effort: 4 }).toBuffer()
  bytesAfter += buf.length
  const verdict = buf.length < was ? `-${Math.round((1 - buf.length / was) * 100)}%` : 'LOSES — kept anyway, see comment'
  rows.push(`  ${relative(PUB, out).padEnd(46)} ${'avif'.padStart(5)}          ${kb(was).padStart(8)} -> ${kb(buf.length).padStart(8)}   ${verdict}`)
  if (APPLY) writeFileSync(out, buf)
}

/** Re-encode in place at the SAME pixel dimensions. Pure download win. */
async function recompress(abs, opts = {}) {
  if (!existsSync(abs)) return
  const was = statSync(abs).size
  const meta = await sharp(abs).metadata()
  const buf = meta.format === 'png'
    ? await sharp(abs).png({ compressionLevel: 9, palette: true, quality: opts.pngQuality ?? 90, effort: 10 }).toBuffer()
    : meta.format === 'jpeg'
      ? await sharp(abs).jpeg({ quality: opts.quality ?? 82, mozjpeg: true }).toBuffer()
      : await sharp(abs).webp({ quality: opts.quality ?? 82, alphaQuality: 100, effort: 6 }).toBuffer()
  if (buf.length >= was) {
    rows.push(`  ${relative(PUB, abs).padEnd(46)} ${kb(was).padStart(8)} — already smaller, left alone`)
    return
  }
  bytesBefore += was; bytesAfter += buf.length
  rows.push(`  ${relative(PUB, abs).padEnd(46)} ${String(meta.width).padStart(5)}px  same size   ${kb(was).padStart(8)} -> ${kb(buf.length).padStart(8)}`)
  if (APPLY) { backup(abs); writeFileSync(abs, buf) }
}

/* ══════════════ 1 · IN-PLACE RESIZES ══════════════
   These are referenced from components this pass may not edit, so srcset is
   off the table and the file itself has to be the right size. Each cap is
   >= 2x the largest box the image is ever painted at. */

console.log('\ndevice frames — the single worst offender on the page')
// .stg-phone is `clamp(190px, 46vw, 264px)` (products-stage.css) and that 264
// is the largest box this frame ever gets: the Work mosaic card paints it at
// 30% of an 88%-wide tile (<=175px at 1440) and the case overlay at 30% of
// .devshow's 620px max-width (186px). 264 * 2 = 528. SIX of these are resident
// at once in the mosaic, at 4.44 MB each — 26.6 MB of the 119 MB peak, for a
// black bezel.
await shrink(join(PUB, 'img/devices/iphone-frame.png'), 560, 'box <=264px (.stg-phone clamp); x6 resident')
// macbook-frame is NOT resized: .devshow is max-width 620px, so it needs 1240px
// at 2x and only has 1180. It is already slightly under-provisioned.

console.log('\ncase screenshots — the MacBook screen is 80.17% of a 620px box')
for (const f of walk(join(PUB, 'img/cases'), (n) => n === 'screen-desktop.webp')) {
  await shrink(f, 1000, 'box <=497px (.devshow-mac-screen); x3 resident')
}
// screen-mobile.webp is 390px for a <=165px box (.devshow-phone-screen, 88.68%
// of a 186px phone). 1.26 MB each and only three are ever resident — capped,
// but it is a rounding error next to the frames above.
for (const f of walk(join(PUB, 'img/cases'), (n) => n === 'screen-mobile.webp')) {
  await shrink(f, 360, 'box <=165px (.devshow-phone-screen)')
}

console.log('\napp screenshots — painted inside .stg-glass (88.52% of 264px) and the app cards')
for (const f of walk(join(PUB, 'img/apps'), (n) => n.endsWith('.webp') && !n.includes('-icon'))) {
  await shrink(f, 540, 'box <=246px measured; x3-6 resident')
}

console.log('\ncase overlay art — 1680-2000px stills painted in a <=1244px column')
// The overlay gallery is two columns inside a panel inset by clamp(8px,2vh,28px)
// with clamp(20px,5vw,70px) padding: at 1440 that is 609px per feature and
// 1244px for a full-width board. At <=1024px it collapses to ONE column, and on
// a 390px phone every one of these is painted at ~334px. They are NOT lazy
// (Work.jsx explains why: a lazy image has no height, so the panel could not
// scroll), so opening a case decodes the whole gallery at once — 3 stars plus
// 5 boards at 6-15 MB each is 50-90 MB in one go, which is its own crash.
// Stars sit in a 2-up grid: 609px per column at 1440, so 1300px is 2.1x and
// several of them are currently 1600-2000px. Boards span BOTH columns —
// 1244px at 1440 and ~1724px on a 1920 desktop — so at 1680px they are already
// slightly under-provisioned and are deliberately left alone. The honest fix
// for boards is a phone cut selected by media query, and that needs a srcset
// in Work.jsx, which this pass is not allowed to touch. Flagged in the report.
for (const f of walk(join(PUB, 'img/cases'), (n) => /^star-\d+\.webp$/.test(n))) {
  await shrink(f, 1300, 'overlay feature, box <=609px at 1440')
}

console.log('\nlab bench — bg-hero is only loaded by curated-lab.html, never by the site')
await shrink(join(PUB, 'models/curated/bg-hero.webp'), 1600, 'lab entry point only')

/* ══════════════ 2 · PHONE CUTS ══════════════
   New filenames, wired up in the components that own them. The original file
   is untouched and stays the desktop candidate, so nothing that builds a path
   by string concatenation can miss.

   These are consumed by `<source media="(max-width: 767px)">`, NOT by `w`
   descriptors, and that is a deliberate correction. A `w` descriptor is
   resolved against devicePixelRatio, and the phones this whole exercise is
   about run at DPR 3: a 420px box asks for 1260px, so the browser dutifully
   skips a 900px cut and takes the 1700px original — the srcset is satisfied
   and the memory problem is completely untouched. It is exactly the trap the
   tree break is already in (`bloom-tree-sm.webp 800w` never wins on a DPR-3
   phone). When the goal is a CEILING on decoded pixels rather than the
   sharpest possible image, the breakpoint has to decide, not the DPR. Each cut
   below is still >= 2x its measured phone box, so nothing is soft. */

console.log('\nneed tiles — 1264px stills painted at 155px on a phone, 291px at 1440')
// Eight of these mount together in .cnt-grid at 4.09 MB each: 32.7 MB, the
// densest single screenful on the page. 520w is 3.4x the 155px phone box.
// `have-business` / `have-idea` are skipped throughout: they are the OfferPair's
// old knitted panels, cut when that section became the wish tags, and nothing
// in src/ names them any more (both the .webp and the .png). Deriving cuts and
// AVIFs for them would just ship more dead bytes in dist/.
const NEED_LIVE = (n) => n.endsWith('.webp') && !n.endsWith('-sm.webp') && !n.startsWith('have-')
for (const f of walk(join(PUB, 'img/needs'), NEED_LIVE)) {
  await cut(f, f.replace(/\.webp$/, '-sm.webp'), 520)
}

console.log('\nmanifesto laptop — 1700px, the largest single bitmap on the long page')
await cut(join(PUB, 'img/manifesto/laptop-mascot-cutout.webp'),
  join(PUB, 'img/manifesto/laptop-mascot-cutout-sm.webp'), 900) // box 420px at 390, 655px at 1440

console.log('\ncrew mascots — four cards, box 92-179px on a phone')
for (const f of walk(join(PUB, 'img/crew'), (n) => n.endsWith('.webp') && !n.endsWith('-sm.webp') && n !== 'lineup.webp')) {
  await cut(f, f.replace(/\.webp$/, '-sm.webp'), 400)
}

console.log('\nweave-alt — full-bleed at 1440, 390px on a phone')
await cut(join(PUB, 'img/weave-alt.webp'), join(PUB, 'img/weave-alt-sm.webp'), 800)

console.log('\nbolt lockup — the woven wordmark, 1579px for a 335px box on a phone')
await cut(join(PUB, 'img/logo/loom-woven.webp'), join(PUB, 'img/logo/loom-woven-phone.webp'), 760)

// NOT a shrink — a REPAIR. bloom-tree-sm.webp is 343px wide but Banners.jsx
// advertises it as `800w`, so on the rare DPR-2 phone that does pick it, a
// 427px box gets a 0.8x upscale of a watercolour. The descriptor was lying;
// this makes the file match it, and the component now selects it by media
// query so it is what every phone actually gets.
console.log('\nbloom tree phone cut — regenerated to match the 800w descriptor it already claims')
await cut(join(PUB, 'img/tree/bloom-tree.webp'), join(PUB, 'img/tree/bloom-tree-sm.webp'), 800)

/* ══════════════ 3 · BYTES ══════════════
   No RAM effect whatsoever. Here because first paint on a slow connection is
   a real problem, and because four of the biggest files in public/ are PNGs
   that have no business being PNGs. */

console.log('\nPNG stills that should never have been PNGs')
// 1264x848 photographic stills at 200-430 KB each. They keep the .png
// extension: agents.js addresses them as .png, and the have-* pair is
// currently referenced by nothing at all, so a rename buys nothing and risks
// a hole. Palette + max effort is the whole win available without renaming.
for (const f of walk(join(PUB, 'img/agents'), (n) => n.endsWith('.png'))) await recompress(f)
for (const f of walk(join(PUB, 'img/needs'), (n) => n.endsWith('.png'))) await recompress(f)
for (const f of walk(join(PUB, 'img/tex'), (n) => n.endsWith('.png'))) await recompress(f)

console.log('\nAVIF siblings — only for images whose component states a <source> for them')
// Anything listed here MUST be inside a <picture> in Banners/Crew/Sections, or
// the file ships in dist/ and is never fetched. Keep the two in step.
const AVIF_SET = [
  ...walk(join(PUB, 'img/needs'), (n) => n.endsWith('.webp') && !n.startsWith('have-')),
  join(PUB, 'img/manifesto/laptop-mascot-cutout.webp'),
  join(PUB, 'img/manifesto/laptop-mascot-cutout-sm.webp'),
  join(PUB, 'img/weave-alt.webp'),
  join(PUB, 'img/weave-alt-sm.webp'),
  join(PUB, 'img/tree/bloom-tree.webp'),
  join(PUB, 'img/tree/bloom-tree-sm.webp'),
  ...walk(join(PUB, 'img/crew'), (n) => n.endsWith('.webp') && n !== 'lineup.webp'),
]
for (const f of AVIF_SET) await avif(f)

console.log()
console.log(rows.join('\n'))
console.log(`\nbytes  ${kb(bytesBefore)} -> ${kb(bytesAfter)}`)
console.log(`RAM    ${mb(ramBefore)} -> ${mb(ramAfter)}   (saved ${mb(ramBefore - ramAfter)} of decoded bitmap, per full set)`)
console.log(APPLY ? 'Written; originals in scripts/_asset-originals/.' : 'Dry run — pass --apply to write.')
