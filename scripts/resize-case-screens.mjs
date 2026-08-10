// Case-study device-mockup screenshots (screen-desktop.webp / screen-mobile.webp)
// were shipped at a flat 1000x625 / 360x779 for every one of the 16 cases,
// regardless of how big the mockup is actually painted. A Playwright audit
// across 390/820/1440 found the largest real box is ~750px CSS-equivalent
// for the desktop mockup and ~270px for the mobile one (both already >2x
// headroom at DPR2) — everything above that is pure waste on every case page
// load. Originals backed up to scripts/_asset-originals/ first.
//
// node scripts/resize-case-screens.mjs [--apply]
import sharp from 'sharp'
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const PUB = join(ROOT, 'public')
const BACKUP = join(HERE, '_asset-originals')
const APPLY = process.argv.includes('--apply')
const MIN_AVIF_GAIN = 0.12

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
let before = 0, after = 0

function backup(abs) {
  const rel = relative(PUB, abs)
  const dest = join(BACKUP, rel)
  if (existsSync(dest)) return
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(abs, dest)
}

const TARGETS = { 'screen-desktop.webp': 760, 'screen-mobile.webp': 280 }

const dirs = readdirSync(join(PUB, 'img/cases'), { withFileTypes: true }).filter((d) => d.isDirectory())
for (const d of dirs) {
  for (const [name, width] of Object.entries(TARGETS)) {
    const abs = join(PUB, 'img/cases', d.name, name)
    if (!existsSync(abs)) continue
    const was = statSync(abs).size
    const meta = await sharp(abs).metadata()
    if (meta.width <= width) { console.log(`skip  ${d.name}/${name}  already ${meta.width}px`); continue }
    const buf = await sharp(abs).resize({ width, withoutEnlargement: true }).webp({ quality: 84, effort: 6 }).toBuffer()
    before += was; after += buf.length
    console.log(`webp  ${d.name}/${name}  ${meta.width}px -> ${width}px   ${kb(was)} -> ${kb(buf.length)}`)
    if (APPLY) {
      backup(abs)
      writeFileSync(abs, buf)
      // Any avif sibling was encoded from the OLD 1000/360px master — stale
      // dimensions now, so drop it and let it regenerate at the new size below.
      const avifPath = abs.replace(/\.webp$/, '.avif')
      if (existsSync(avifPath)) { backup(avifPath); unlinkSync(avifPath) }
    }

    // avif sibling at the NEW size, same >=12% gate the rest of the pipeline uses
    const avifOut = abs.replace(/\.webp$/, '.avif')
    if (APPLY) {
      const avifBuf = await sharp(buf).avif({ quality: 66, effort: 5, chromaSubsampling: '4:2:0' }).toBuffer()
      const gain = 1 - avifBuf.length / buf.length
      if (gain >= MIN_AVIF_GAIN) {
        writeFileSync(avifOut, avifBuf)
        console.log(`avif  ${d.name}/${name.replace('.webp', '.avif')}  ${kb(buf.length)} -> ${kb(avifBuf.length)} (${(gain * 100).toFixed(0)}%)`)
      } else {
        console.log(`avif  ${d.name}/${name.replace('.webp', '.avif')}  rejected, ${(gain * 100).toFixed(0)}% < 12%`)
      }
    }
  }
}

console.log(`\ntotal  ${kb(before)} -> ${kb(after)}  (saved ${kb(before - after)})`)
console.log(APPLY ? 'Written; originals in scripts/_asset-originals/.' : 'Dry run — pass --apply to write.')
