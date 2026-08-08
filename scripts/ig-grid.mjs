// ————————————————————————————————————————————————————————————————
// LOOM — Instagram 3×3 grid background.
//
// Renders ONE knitted field across a 4:5 master canvas, then slices it
// into nine 1080×1350 tiles. 4:5 because that is how Instagram crops
// profile-grid thumbnails — a 1:1 tile loses its top and bottom band to
// the grid and the stitches stop lining up across the seams.
//
// The stitch is stockinette: a V whose legs meet at the bottom centre,
// columns aligned, rows stacked. Each V gets a dark under-copy and a
// light over-copy so it has a lit side, and a per-stitch jitter so the
// field reads hand-knitted instead of printed.
//
// Colour is NOT random per stitch. Six colour sources sit at fixed
// points on the canvas with radial falloff; each stitch takes whichever
// source is strongest at its centre. That yields soft intarsia zones
// that survive being cut in nine — a per-stitch random palette turns to
// grey mush at thumbnail size.
//
//   node scripts/ig-grid.mjs
// ————————————————————————————————————————————————————————————————
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'ig-grid')

const TILE_W = 1080, TILE_H = 1350          // one Instagram post, 4:5
const COLS = 3, ROWS = 3
const W = TILE_W * COLS                      // 3240
const H = TILE_H * ROWS                      // 4050

const BG = '#0d0716'

// stitch gauge — 60 columns across the master, so 20 per tile. On a
// ~360px grid thumbnail that is an 18px stitch: still legibly a stitch.
const SW = W / 60                            // 54
const SH = 48

// ── seeded RNG so re-runs are identical ────────────────────────────
let seed = 0x10031982
const rnd = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
  return ((seed >>> 0) % 100000) / 100000
}

// ── the colour sources ─────────────────────────────────────────────
// The plum ground is a FLAT baseline score, not a radial source. A
// radial plum decays with distance, so every yarn source out-scores it
// across most of the canvas and the field goes solid pink — which is
// exactly what the first render did. As a constant, plum holds
// everywhere a yarn does not actively beat it.
//
// A yarn claims ground only where (1 - d/r) * w > GROUND, i.e. inside
// a radius of r * (1 - GROUND/w). With w≈.95 and r≈1500 that is a
// ~520px blob — about half a tile — before the wobble deforms it.
const GROUND = { hex: '#241633', score: 0.60 }
const SOURCES = [
  { hex: '#d6247e', r: 1560, w: 0.95, x: 0.17, y: 0.12 },  // yarn pink
  { hex: '#9b55c9', r: 1480, w: 0.94, x: 0.85, y: 0.28 },  // yarn violet
  { hex: '#5cc0e8', r: 1400, w: 0.93, x: 0.26, y: 0.66 },  // yarn blue
  { hex: '#e0a82f', r: 1360, w: 0.92, x: 0.82, y: 0.88 },  // yarn gold
  { hex: '#efe7da', r: 1080, w: 0.88, x: 0.55, y: 0.45 },  // cream, the small heart
  { hex: '#f21c8c', r: 1020, w: 0.90, x: 0.08, y: 0.93 },  // brand magenta, one corner
]

const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const shade = (hex, f) => rgb2hex(hex2rgb(hex).map(v => f < 1 ? v * f : v + (255 - v) * (f - 1)))

// low-frequency wobble so the zone edges are organic, not circles
// Three octaves. The first two deform the blob into a shape; the third
// is small and fast, and only roughens the boundary — push it much
// past ~60 and the edge stops being a knitted colour-change and starts
// being speckle.
const wobble = (x, y) =>
  Math.sin(x / 760 + y / 1180) * 340 +
  Math.sin(x / 395 - y / 505 + 2.1) * 215 +
  Math.sin(x / 205 + y / 168 + 4.4) * 96 +
  Math.sin(y / 118 - x / 149 + 1.3) * 52

function colourAt(x, y) {
  let best = GROUND.hex, bestScore = GROUND.score
  const wob = wobble(x, y)
  for (const s of SOURCES) {
    const dx = x - s.x * W, dy = y - s.y * H
    const d = Math.hypot(dx, dy) + wob
    const score = (1 - d / s.r) * s.w
    if (score > bestScore) { bestScore = score; best = s.hex }
  }
  return best
}

// A real plum yarn is heathered — a few fibres of another dye spun into
// it. One stitch in fourteen on the ground takes a yarn colour, which
// keeps the quiet majority of the canvas from reading as flat fill.
const FLECK = ['#d6247e', '#9b55c9', '#5cc0e8', '#e0a82f']

// ── build the stitches ─────────────────────────────────────────────
const parts = []
parts.push(`<rect width="${W}" height="${H}" fill="${BG}"/>`)

// a soft light off the top-centre, the same direction the site lights from
parts.push(`<ellipse cx="${W * 0.5}" cy="${H * 0.1}" rx="${W * 0.72}" ry="${H * 0.42}" fill="#ffffff" opacity="0.045"/>`)

const legW = SW * 0.40
const rows = Math.ceil(H / SH) + 2
const cols = Math.ceil(W / SW) + 2

for (let r = -1; r < rows; r++) {
  for (let c = -1; c < cols; c++) {
    // jitter: a knitter's hand, not a printer's
    const jx = (rnd() - 0.5) * SW * 0.12
    const jy = (rnd() - 0.5) * SH * 0.12
    const x = c * SW + jx
    const y = r * SH + jy
    const cx = x + SW / 2, cy = y + SH / 2
    if (cx < -SW || cx > W + SW || cy < -SH || cy > H + SH) continue

    let base = colourAt(cx, cy)
    // heathering: only on the ground, and dimmed, so it reads as a fibre
    // spun into the plum rather than as a stray bright pixel
    const isGround = base === GROUND.hex
    if (isGround && rnd() < 0.07) base = shade(FLECK[(rnd() * 4) | 0], 0.5)
    // per-stitch value drift keeps a zone from going flat
    const drift = 0.86 + rnd() * 0.3
    const lean = (rnd() - 0.5) * SW * 0.10   // the V's point wanders

    // legs bow outward slightly — yarn under tension, never straight
    const bow = SW * 0.10
    const d =
      `M${(x).toFixed(1)},${(y + SH * 0.06).toFixed(1)} ` +
      `Q${(x + SW * 0.16 - bow).toFixed(1)},${(y + SH * 0.6).toFixed(1)} ` +
      `${(x + SW / 2 + lean).toFixed(1)},${(y + SH * 0.94).toFixed(1)} ` +
      `Q${(x + SW * 0.84 + bow).toFixed(1)},${(y + SH * 0.6).toFixed(1)} ` +
      `${(x + SW).toFixed(1)},${(y + SH * 0.06).toFixed(1)}`

    // 1 · the shadow the stitch casts into the row below it
    parts.push(`<path d="${d}" fill="none" stroke="#05020a" stroke-opacity=".55" stroke-width="${(legW * 1.18).toFixed(1)}" stroke-linecap="round" transform="translate(0,${(SH * 0.09).toFixed(1)})"/>`)
    // 2 · the yarn itself
    parts.push(`<path d="${d}" fill="none" stroke="${shade(base, drift)}" stroke-width="${legW.toFixed(1)}" stroke-linecap="round"/>`)
    // 3 · the lit top edge of the strand
    parts.push(`<path d="${d}" fill="none" stroke="${shade(base, 1.34)}" stroke-opacity=".5" stroke-width="${(legW * 0.30).toFixed(1)}" stroke-linecap="round" transform="translate(${(-legW * 0.16).toFixed(1)},${(-legW * 0.24).toFixed(1)})"/>`)
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`

// ── render + slice ─────────────────────────────────────────────────
await mkdir(OUT, { recursive: true })
await writeFile(join(OUT, '_master.svg'), svg)

console.log(`rendering ${W}×${H} · ${rows * cols} stitches …`)
const master = await sharp(Buffer.from(svg), { density: 72, limitInputPixels: false })
  .png({ compressionLevel: 9 }).toBuffer()
await writeFile(join(OUT, 'master.png'), master)

// Instagram puts the NEWEST post top-left and pushes older ones right
// and down. So the grid assembles only if you post in reverse reading
// order: bottom-right first, top-left last. The filenames carry that
// order so the tiles cannot be posted wrong.
let postNo = 9
const manifest = []
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const name = `post-${String(postNo).padStart(2, '0')}_r${r + 1}c${c + 1}.png`
    await sharp(master, { limitInputPixels: false })
      .extract({ left: c * TILE_W, top: r * TILE_H, width: TILE_W, height: TILE_H })
      .png({ compressionLevel: 9 })
      .toFile(join(OUT, name))
    manifest.push({ post: postNo, row: r + 1, col: c + 1, file: name })
    postNo--
  }
}

manifest.sort((a, b) => a.post - b.post)
await writeFile(join(OUT, 'POSTING-ORDER.txt'),
  `LOOM — Instagram 3×3 grid\n` +
  `master ${W}×${H} · tiles ${TILE_W}×${TILE_H} (4:5)\n\n` +
  `Instagram shows the NEWEST post top-left, so post in THIS order.\n` +
  `The file names are already numbered by posting order — just go 01 → 09.\n\n` +
  manifest.map(m => `  ${String(m.post).padStart(2, '0')}.  ${m.file}   → lands at row ${m.row}, column ${m.col}`).join('\n') +
  `\n\nCheck 'contact-sheet.png' to see how the nine reassemble.\n`)

// a contact sheet with the seams drawn, to eyeball the reassembly
const gap = 14
const sheetW = TILE_W * COLS + gap * (COLS + 1)
const sheetH = TILE_H * ROWS + gap * (ROWS + 1)
const cells = []
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  cells.push({
    input: await sharp(master, { limitInputPixels: false })
      .extract({ left: c * TILE_W, top: r * TILE_H, width: TILE_W, height: TILE_H }).png().toBuffer(),
    left: gap + c * (TILE_W + gap), top: gap + r * (TILE_H + gap),
  })
}
await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#0d0716' } })
  .composite(cells).resize({ width: 1200 }).png().toFile(join(OUT, 'contact-sheet.png'))

// and a thumbnail at roughly the size Instagram actually renders the
// grid — the only honest test of whether the stitch still reads
await sharp(master, { limitInputPixels: false })
  .resize({ width: 640 }).png().toFile(join(OUT, 'preview-small.png'))

console.log(`\n✓ ${OUT}`)
console.log(`  master.png            ${W}×${H}`)
console.log(`  post-01 … post-09     ${TILE_W}×${TILE_H} each, named in posting order`)
console.log(`  contact-sheet.png     the nine with seams, to check the reassembly`)
console.log(`  POSTING-ORDER.txt`)
