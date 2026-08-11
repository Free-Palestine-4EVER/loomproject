/**
 * Build the 20 LOOM post tiles for #the-machine.
 *
 *   node scripts/loom-posts.mjs
 *
 * ── WHERE THESE COME FROM ──────────────────────────────────────────────────
 * LOOM's own brand imagery lives in the React repo's `gen-images/` as nine
 * 2752x1536 landscape renders: four branded scenes (the mascot lineup under
 * the LOOM banner, the weaving studio, the fragrance still, the UI sheet) and
 * five mascot character sheets, each carrying three turnaround views of one
 * mascot.
 *
 * The grid cell is post-shaped (4:5 portrait), so a landscape source cannot be
 * dropped in whole — it would letterbox or centre-crop to nothing. This script
 * cuts 20 portrait tiles out of those nine sources: three per character sheet
 * (one per turnaround view) and one or two per branded scene.
 *
 * NOT USED, deliberately: `ig-grid/`. Its nine "posts" are tiles of ONE
 * continuous knitted artwork, so as twenty thumbnails they would read as a wall
 * of identical purple texture rather than twenty different pieces of work.
 * Checked by eye before ruling them out.
 *
 * ── OUTPUT ─────────────────────────────────────────────────────────────────
 * static/img/loom/post-NN.{webp,avif} at 640w (the base), plus the responsive
 * ladder at 160/320/480. The desktop grid renders these into a 58px cell, so
 * 160w is the rung that will actually be picked at DPR2 — the larger rungs are
 * for the phone layout, where the cells are much bigger.
 */
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SRC = '/Users/hideyourkids/Desktop/LOOM PROJECT/gen-images'
const OUT = 'static/img/loom'
const W = 2752, H = 1536

// A 4:5 window. `cx` is the horizontal centre as a fraction of the source
// width; `y`/`h` are absolute pixels. Width is derived so every crop is
// exactly 4:5 and nothing is squashed.
const win = (cx, y, h) => {
  const height = h
  const width = Math.round(height * 0.8)
  let left = Math.round(cx * W - width / 2)
  left = Math.max(0, Math.min(left, W - width))
  const top = Math.max(0, Math.min(y, H - height))
  return { left, top, width, height }
}

// Three turnaround views sit at roughly 19% / 50% / 81% across every character
// sheet, standing between y≈500 and y≈1210. A 1000px-tall window from y=380
// contains each with headroom, and at 800px wide the three do not overlap.
const sheetCrops = (n) => [0.19, 0.5, 0.81].map((cx, i) => ({
  src: `mascot-character-sheets/mascot-character-sheets-00${n}.png`,
  ...win(cx, 380, 1000),
  tag: `sheet${n}-${i}`,
}))

const CROPS = [
  // The four branded scenes. Two windows each where the composition carries
  // two distinct subjects, one where it does not.
  { src: '01-mascot-lineup-loom-banner.png', ...win(0.20, 300, 1150), tag: 'lineup-spool' },
  { src: '01-mascot-lineup-loom-banner.png', ...win(0.44, 180, 1250), tag: 'lineup-camera' },
  { src: '01-mascot-lineup-loom-banner.png', ...win(0.62, 280, 1150), tag: 'lineup-bot' },
  { src: '02-weaving-studio-loom-sign.png', ...win(0.34, 120, 1350), tag: 'studio-a' },
  { src: '02-weaving-studio-loom-sign.png', ...win(0.66, 120, 1350), tag: 'studio-b' },
  { src: '03-loom-for-her-fragrance.png', ...win(0.38, 120, 1350), tag: 'fragrance-a' },
  { src: '03-loom-for-her-fragrance.png', ...win(0.64, 120, 1350), tag: 'fragrance-b' },
  { src: '04-ui-nav-button-card-sheet.png', ...win(0.30, 140, 1300), tag: 'ui-a' },
  { src: '04-ui-nav-button-card-sheet.png', ...win(0.70, 140, 1300), tag: 'ui-b' },
  // Five character sheets x three views = fifteen.
  ...sheetCrops(0), ...sheetCrops(1), ...sheetCrops(2), ...sheetCrops(3), ...sheetCrops(4),
].slice(0, 20)

await mkdir(OUT, { recursive: true })

const LADDER = [160, 320, 480, 640]
const manifest = []

for (const [i, c] of CROPS.entries()) {
  const n = String(i + 1).padStart(2, '0')
  const base = `/img/loom/post-${n}`
  const region = { left: c.left, top: c.top, width: c.width, height: c.height }

  const cut = sharp(join(SRC, c.src)).extract(region)

  const variants = []
  for (const w of LADDER) {
    const pipe = cut.clone().resize({ width: w })
    await pipe.clone().webp({ quality: 78, effort: 5 }).toFile(join(OUT, `post-${n}-${w}.webp`))
    await pipe.clone().avif({ quality: 50, effort: 5 }).toFile(join(OUT, `post-${n}-${w}.avif`))
    variants.push({ w, webp: `${base}-${w}.webp`, avif: `${base}-${w}.avif` })
  }
  // The `src` fallback: the widest rung, as plain webp.
  await cut.clone().resize({ width: 640 }).webp({ quality: 78, effort: 5 }).toFile(join(OUT, `post-${n}.webp`))

  manifest.push({
    key: `loom-${n}`,
    src: `${base}.webp`,
    width: 640,
    height: 800, // 4:5, always
    variants,
    from: c.tag,
  })
  process.stdout.write(`\rcut ${i + 1}/${CROPS.length}`)
}

await writeFile('src/lib/data/loomPosts.json', JSON.stringify(manifest, null, 1))
console.log(`\n${manifest.length} tiles -> ${OUT}/`)
