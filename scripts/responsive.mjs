/**
 * Generate responsive variants for the site's photography.
 *
 *   node scripts/responsive.mjs          # generate + write the manifest
 *   node scripts/responsive.mjs --dry    # report what it would do
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Measured on the built site at 1440px/DPR2, 51 of 90 images were being served
 * at more than twice the pixels they were displayed at, and the worst were far
 * beyond that: every case-study `star-*` thumbnail is a 1300px-wide file
 * rendered into a 58px box. At DPR2 that is ~11x the width, which is ~125x the
 * pixel DATA, for a thumbnail the size of a fingernail.
 *
 * This was invisible in the React build for an accidental reason: the SPA built
 * its DOM with JS, so most of these images did not exist as elements until
 * after first paint and the browser never got the chance to fetch them early.
 * Server-rendering the same markup put all 90 in the document at first parse,
 * Chrome's lazy-load threshold pulled in 51 of them, and the page started
 * fetching 1379 KB of imagery instead of 600 KB — which pushed FCP the wrong
 * way even though the JS had dropped by 96%.
 *
 * So this is not a nice-to-have that came along with the port. Server-rendering
 * is what EXPOSED it, and fixing it is what makes the port actually faster
 * rather than merely lighter in JS.
 *
 * ── WHAT IT DOES ───────────────────────────────────────────────────────────
 * For every source image under the directories in SETS, emit avif + webp at
 * each width in WIDTHS that is genuinely smaller than the original — never an
 * upscale, which would cost bytes to add blur. Write `responsive.json` mapping
 * each original public path to the variants that exist, and let Pic.svelte
 * build a `srcset` from it at render time.
 *
 * The originals are LEFT IN PLACE and stay the `src`. They remain the fallback
 * for a browser that understands neither srcset nor avif, and they are what a
 * `<source>`-less <img> resolves to.
 */
import sharp from 'sharp'
import { readdir, writeFile, stat } from 'node:fs/promises'
import { join, extname, relative } from 'node:path'

const STATIC = 'static'
const DRY = process.argv.includes('--dry')

/** Directories whose contents are photography that scales. Deliberately does
 *  NOT include img/tex, img/wool or img/logo — those are tiling textures, UI
 *  chrome and a wordmark, all of which are either already tiny or must not be
 *  resampled (a tile resized to a non-multiple width seams visibly).
 *
 *  img/loom ADDED 11 Aug 2026: TheMachine.svelte's 20-cell "studio's own
 *  feed" grid (post-01..20.webp, 640px originals rendered at 58 CSS px) was
 *  the single heaviest image block on the page by its own code comment, and
 *  already called <Pic sizes="…58px">  expecting a ladder — but this
 *  directory was never in SETS, so responsive.json had no entry, Pic fell
 *  back to the unscaled original every time, and the fix that shipped in the
 *  component was silently inert. (A stray hand-cut set of `-640` files
 *  already existed on disk from before this directory was wired up; they are
 *  outside WIDTHS and this script neither reads nor deletes them.) */
/*  img/core and img/forge ADDED 12 Aug 2026, and both are the same trap the
 *  img/loom note above describes: a component was rewritten to call <Pic>
 *  with a `sizes` string, the directory was never listed here, so
 *  responsive.json had no entry, Pic quietly fell back to a plain <img> at
 *  the full original width, and the optimisation read as done while doing
 *  nothing. img/core holds the four wool still lifes behind "Every client
 *  gets these four" (rendered into a ~330px column); img/forge holds the
 *  three pipeline stages on the 2D→3D band. ADDING A DIRECTORY OF <Pic>
 *  SOURCES WITHOUT ADDING IT HERE IS ALWAYS THIS BUG. */
const SETS = ['img/cases', 'img/niches', 'img/needs', 'img/apps', 'img/suite', 'img/workshops', 'img/lab', 'img/mcp', 'img/manifesto', 'img/hero', 'img/tree', 'img/loom', 'img/core', 'img/forge']

const WIDTHS = [160, 320, 480, 768, 1024, 1600, 2048]
const SRC_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg'])

// Encoder settings. Quality is chosen per format: avif holds detail at a much
// lower quality number than webp does, which is the whole reason it wins.
const AVIF = { quality: 52, effort: 5 }
const WEBP = { quality: 76, effort: 5 }

async function* walk(dir) {
  let entries
  try { entries = await readdir(join(STATIC, dir), { withFileTypes: true }) }
  catch { return }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (SRC_EXT.has(extname(e.name).toLowerCase())) yield p
  }
}

const manifest = {}
let made = 0, skipped = 0, srcBytes = 0, outBytes = 0

for (const set of SETS) {
  for await (const rel of walk(set)) {
    const abs = join(STATIC, rel)
    // A `-sm` file is already a hand-made phone cut with its own art direction
    // (the footer sky and the bloom tree both have one). Leave those alone —
    // they are a different crop, not a different size.
    if (/-sm\.[a-z]+$/.test(rel)) { skipped++; continue }

    // DO NOT EAT YOUR OWN OUTPUT. The walk writes variants into the very
    // directories it is walking, so without this guard a file emitted early
    // (`board-13-1024.webp`) is picked up later in the same run as a fresh
    // source and given its own ladder (`board-13-1024-320.webp`). The first
    // run of this script did exactly that: 248 real sources turned into 472,
    // and 224 manifest keys were variants pretending to be originals.
    if (new RegExp(`-(${WIDTHS.join('|')})\\.[a-z]+$`).test(rel)) { skipped++; continue }

    let meta
    try { meta = await sharp(abs).metadata() } catch { skipped++; continue }
    if (!meta.width) { skipped++; continue }

    const publicPath = '/' + rel.split('\\').join('/')
    const base = publicPath.replace(/\.[a-z]+$/i, '')
    const variants = []

    for (const w of WIDTHS) {
      // Never upscale. A variant wider than the original is bytes spent on
      // interpolation.
      if (w >= meta.width) continue

      const outA = `${base}-${w}.avif`
      const outW = `${base}-${w}.webp`

      if (!DRY) {
        const pipe = sharp(abs).resize({ width: w, withoutEnlargement: true })
        await pipe.clone().avif(AVIF).toFile(join(STATIC, outA.slice(1)))
        await pipe.clone().webp(WEBP).toFile(join(STATIC, outW.slice(1)))
        outBytes += (await stat(join(STATIC, outA.slice(1)))).size
        outBytes += (await stat(join(STATIC, outW.slice(1)))).size
      }
      variants.push({ w, avif: outA, webp: outW })
      made += 2
    }

    if (variants.length) {
      manifest[publicPath] = { width: meta.width, height: meta.height, variants }
      srcBytes += (await stat(abs)).size
    }
  }
}

if (!DRY) {
  await writeFile('src/lib/responsive.json', JSON.stringify(manifest))
}

const kb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`
console.log(`${DRY ? '[dry run] ' : ''}sources with variants: ${Object.keys(manifest).length}`)
console.log(`files ${DRY ? 'that would be ' : ''}written: ${made}   skipped: ${skipped}`)
if (!DRY) console.log(`originals ${kb(srcBytes)} -> variants ${kb(outBytes)} (added to disk; the page now picks ONE per slot)`)
