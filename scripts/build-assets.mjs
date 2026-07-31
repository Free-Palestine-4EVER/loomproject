// Curates ADVN deck extractions into web-ready assets for the LOOM site.
// Sources: scratchpad advn/pages (page renders) + advn/embedded (full-res artwork).
import sharp from 'sharp'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SRC = '/private/tmp/claude-501/-Users-hideyourkids/f168913c-735e-4085-9351-11e1737b027a/scratchpad/advn'
const OUT = new URL('../public/img', import.meta.url).pathname

// Case slug -> { pages: [deck pages used as gallery boards], stars: [embedded files for cover/feature] }
const CASES = {
  boccapiena:  { pages: [8, 9, 10, 11, 12], stars: ['p08_x149.jpeg', 'p09_x154.png', 'p10_x171.jpeg'] },
  auraa:       { pages: [13, 14, 15, 16],   stars: ['p13_x198.png', 'p15_x215.jpeg', 'p15_x216.jpeg'] },
  scion:       { pages: [17, 18, 19, 20, 21], stars: ['p17_x234.png', 'p20_x254.png'] },
  benetton:    { pages: [22, 23, 24],       stars: [] },
  bezdrob:     { pages: [25, 26],           stars: ['p25_x295.png'] },
  zen2fit:     { pages: [27, 28],           stars: ['p27_x310.jpeg'] },
  slatko:      { pages: [30, 31, 32, 33, 34], stars: ['p31_x333.png', 'p31_x334.png'] },
  herbas:      { pages: [35, 36],           stars: ['p35_x364.jpeg', 'p36_x370.png', 'p36_x371.png'] },
  sahmat:      { pages: [37, 38],           stars: ['p37_x382.jpeg', 'p38_x1381.png', 'p38_x386.png'] },
  place87:     { pages: [39, 40],           stars: ['p39_x407.jpeg', 'p40_x412.png', 'p40_x415.png'] },
  modulart:    { pages: [41, 42],           stars: ['p41_x427.png'] },
  weitnauer:   { pages: [43, 44],           stars: ['p43_x446.png', 'p44_x450.png', 'p44_x452.png'] },
  shteq:       { pages: [45, 46],           stars: ['p45_x456.jpeg', 'p46_x462.png', 'p46_x460.png'] },
  vucko:       { pages: [47, 48],           stars: ['p48_x473.jpeg', 'p48_x476.jpeg'] },
}

const webp = (input, out, width, quality = 82) =>
  sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(out)

const jobs = []
for (const [slug, def] of Object.entries(CASES)) {
  const dir = join(OUT, 'cases', slug)
  mkdirSync(dir, { recursive: true })
  // deck pages as art-directed gallery boards
  for (const p of def.pages) {
    const src = join(SRC, 'pages', `p${String(p).padStart(2, '0')}.png`)
    jobs.push(webp(src, join(dir, `board-${p}.webp`), 1680, 80))
  }
  // full-res star artwork: feature (1680w) + cover thumb (960w)
  def.stars.forEach((f, i) => {
    const src = join(SRC, 'embedded', f)
    if (!existsSync(src)) { console.warn('MISSING', f); return }
    jobs.push(webp(src, join(dir, `star-${i}.webp`), 1680, 82))
    if (i === 0) jobs.push(webp(src, join(dir, `cover.webp`), 960, 78))
  })
}
// covers for cases with no star: crop of first board page
for (const [slug, def] of Object.entries(CASES)) {
  if (!CASES[slug].stars.length) {
    const p = def.pages[0]
    const src = join(SRC, 'pages', `p${String(p).padStart(2, '0')}.png`)
    jobs.push(webp(src, join(OUT, 'cases', slug, 'cover.webp'), 960, 78))
  }
}
// hero cover art (particle wave) + og image
jobs.push(webp(join(SRC, 'embedded', 'p01_x66.jpeg'), join(OUT, 'edge-cover.webp'), 1680, 82))
jobs.push(
  sharp(join(SRC, 'pages', 'p01.png')).resize({ width: 1200, height: 630, fit: 'cover' })
    .jpeg({ quality: 84 }).toFile(join(OUT, 'og.jpg'))
)

await Promise.all(jobs)
console.log('assets done:', jobs.length, 'files')
