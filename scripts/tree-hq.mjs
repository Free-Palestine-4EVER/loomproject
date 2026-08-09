// Re-export the bloom tree from the 1860px original at full resolution.
// The shipped pair was downscaled to 1600 and encoded for a 560px slot; the
// footer now gives the tree its own column and shows it larger, so it gets its
// own bytes back. Filenames are versioned (-hq) — caches serve the old ones.
import sharp from 'sharp'
import { homedir } from 'node:os'

const SRC = `${homedir()}/Downloads/tree-cutout.png`
const OUT = 'public/img/tree'
const jobs = [
  { w: 1860, name: 'bloom-tree-hq' },
  { w: 930,  name: 'bloom-tree-hq-sm' },
]
for (const { w, name } of jobs) {
  const base = sharp(SRC).resize({ width: w, kernel: 'lanczos3' })
  await base.clone().avif({ quality: 66, effort: 6, chromaSubsampling: '4:4:4' }).toFile(`${OUT}/${name}.avif`)
  await base.clone().webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(`${OUT}/${name}.webp`)
  const m = await sharp(`${OUT}/${name}.avif`).metadata()
  console.log(name, `${m.width}x${m.height}`)
}
