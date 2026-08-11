/**
 * Build the LOOM post tiles for #the-machine from the generated brand renders.
 *
 *   node scripts/loom-posts.mjs
 *
 * ── WHERE THESE COME FROM ──────────────────────────────────────────────────
 * Twenty 4:5 posts generated on Higgsfield (Nano Banana Pro, 2K) to one brand
 * recipe: an everyday object rendered as knitted wool in the studio's palette —
 * hot pink and violet with gold thread and cream, on a dark plum ground under
 * magenta/violet rim light. Sources land in /tmp/loom-posts as ~7 MB PNGs at
 * 1856x2304.
 *
 * EVERY PROMPT ENDED IN "no text, no letters, no writing, no logo", and that is
 * not decoration. The studio's PREVIOUS brand renders are unusable for exactly
 * this reason: one spells the wordmark "LOOOM" with three O's, and another
 * renders a UI mock reading "Start eaving" over lorem-ipsum. A generated
 * misspelling of the client's own name is not a thing you catch at 58px, so the
 * only safe rule is to generate no lettering at all. Anything with glyphs in it
 * is rejected rather than fixed.
 *
 * NOT USED: the ig-grid tiles. Those nine "posts" are slices of ONE continuous
 * knit artwork, so as twenty thumbnails they read as a wall of identical purple
 * texture rather than twenty pieces of work. Checked by eye before ruling out.
 *
 * ── OUTPUT ─────────────────────────────────────────────────────────────────
 * static/img/loom/post-NN.webp (the src fallback) plus a 160/320/480/640 ladder
 * in webp and avif, and src/lib/data/loomPosts.json describing it.
 *
 * The desktop grid renders these into a 58px cell, so 160w is the rung actually
 * picked at DPR2 — the larger rungs exist for the phone layout, where the grid
 * drops to fewer columns and the cells are much bigger. A 7 MB PNG into a 58px
 * box was the single worst image offender on the page before this pass; the
 * whole twenty at 160w AVIF come to well under 100 KB.
 */
import sharp from 'sharp'
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const SRC = '/tmp/loom-posts'
const OUT = 'static/img/loom'
const LADDER = [160, 320, 480, 640]

// Order is the grid's reading order. Kept explicit rather than alphabetical so
// the wall opens on the two mascots (the studio's own characters) and mixes
// object types after that instead of grouping them.
const ORDER = [
  'spool', 'robot', 'camera', 'planet', 'butterfly', 'flower',
  'coffee', 'sneaker', 'perfume', 'headphones', 'phone', 'laptop',
  'bag', 'rocket', 'armchair', 'crown', 'cupcake', 'glasses',
  'watch', 'heart',
]

// Alt text, written per subject. These are decorative tiles inside a figure
// that already carries its own caption, but a screen reader landing on twenty
// unlabelled images is a worse outcome than twenty short honest ones.
const ALT = {
  spool: 'A spool of pink wool with a face, knitted',
  robot: 'A small knitted robot with a glowing face',
  camera: 'A camera knitted from wool',
  planet: 'A knitted planet with a gold ring',
  butterfly: 'A butterfly with knitted wings',
  flower: 'A flower crocheted from wool',
  coffee: 'A knitted takeaway coffee cup',
  sneaker: 'A high-top sneaker knitted from wool',
  perfume: 'A perfume bottle wrapped in knitted wool',
  headphones: 'Knitted over-ear headphones',
  phone: 'A phone knitted from wool',
  laptop: 'A laptop knitted from wool',
  bag: 'A knitted shopping bag with blossom',
  rocket: 'A knitted rocket mid-launch',
  armchair: 'A knitted armchair',
  crown: 'A crown knitted from gold wool',
  cupcake: 'A cupcake knitted from wool',
  glasses: 'Eyeglasses knitted from wool',
  watch: 'A wristwatch knitted from wool',
  heart: 'A heart knitted from pink wool',
}

await mkdir(OUT, { recursive: true })

const present = new Set(
  (await readdir(SRC).catch(() => [])).filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', ''))
)

const manifest = []
let n = 0

for (const key of ORDER) {
  if (!present.has(key)) continue
  n++
  const nn = String(n).padStart(2, '0')
  const base = `/img/loom/post-${nn}`
  const src = join(SRC, `${key}.png`)

  const variants = []
  for (const w of LADDER) {
    const pipe = sharp(src).resize({ width: w })
    await pipe.clone().webp({ quality: 78, effort: 5 }).toFile(join(OUT, `post-${nn}-${w}.webp`))
    await pipe.clone().avif({ quality: 50, effort: 5 }).toFile(join(OUT, `post-${nn}-${w}.avif`))
    variants.push({ w, webp: `${base}-${w}.webp`, avif: `${base}-${w}.avif` })
  }
  // The plain `src` fallback for a browser with no srcset support.
  await sharp(src).resize({ width: 640 }).webp({ quality: 78, effort: 5 }).toFile(join(OUT, `post-${nn}.webp`))

  manifest.push({
    id: `loom-${nn}`,
    key,
    src: `${base}.webp`,
    // 4:5 always — every source is 1856x2304 and every rung keeps the ratio.
    width: 640,
    height: 800,
    alt: ALT[key] || 'A LOOM post',
    variants,
  })
  process.stdout.write(`\r${n} tiles`)
}

await writeFile('src/lib/data/loomPosts.json', JSON.stringify(manifest, null, 1))

const total = (await Promise.all(
  manifest.map((m) => stat(join(OUT, `post-${m.id.slice(-2)}-160.avif`)).then((s) => s.size))
)).reduce((a, b) => a + b, 0)

console.log(`\n${manifest.length} tiles -> ${OUT}/`)
console.log(`all ${manifest.length} at the 160w AVIF rung (what the desktop grid picks): ${(total / 1024).toFixed(0)} KB total`)
if (manifest.length < 20) {
  console.log(`\nNOTE: only ${manifest.length} of 20 sources present in ${SRC}. Missing: ${ORDER.filter((k) => !present.has(k)).join(', ')}`)
}
