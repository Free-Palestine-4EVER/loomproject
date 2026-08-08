// Generate an AVIF sibling for every shipping raster in public/, and convert the
// last PNG/JPEG holdouts to WebP.
//
// SOURCE MATTERS. A webp in public/ is already lossy, so re-encoding it to AVIF
// stacks a second generation of loss on top of the first. scripts/_asset-originals/
// holds the pre-optimise masters, so this prefers the ORIGINAL whenever one
// exists and only falls back to the shipped webp when it does not — and says so
// in the report, per file.
//
// An AVIF is kept only if it beats its webp by >=12%. Below that the byte saving
// does not pay for a second decoder path, a second file in the repo and a second
// thing to keep in sync.
//
// Run: node scripts/to-avif.mjs [--write]   (default is a dry run)
import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const PUB = path.join(ROOT, 'public')
const ORIG = path.join(ROOT, 'scripts/_asset-originals')
const WRITE = process.argv.includes('--write')
const MIN_GAIN = 0.12

// og.jpg is read by social scrapers, many of which still do not take webp/avif.
// favicon-woven.png is a favicon. Both stay as they are, deliberately.
const KEEP = new Set(['img/og.jpg', 'img/logo/favicon-woven.png'])

async function walk(dir, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (!/_original|_asset-originals/.test(p)) await walk(p, acc) }
    else acc.push(p)
  }
  return acc
}

const kb = (n) => (n / 1024).toFixed(1) + 'kb'
const files = (await walk(PUB)).filter((f) => /\.(webp|png|jpe?g)$/i.test(f))

let before = 0, after = 0, made = 0, skipped = 0, converted = 0
const fromOriginal = [], fromWebp = [], rejected = []
const manifest = []

for (const f of files.sort()) {
  const rel = path.relative(PUB, f)
  if (KEEP.has(rel)) { skipped++; continue }
  const ext = path.extname(f).toLowerCase()
  const base = f.slice(0, -ext.length)
  const size = (await stat(f)).size

  // 1 · PNG/JPEG holdouts -> webp beside them (references get updated separately)
  if (ext !== '.webp') {
    const out = base + '.webp'
    try { await stat(out); } catch {
      const buf = await sharp(f).webp({ quality: 82, effort: 6 }).toBuffer()
      // a webp that is BIGGER than the png it came from is not a conversion,
      // it is a downgrade with extra steps (iphone-frame.png: 10.2kb -> 12.0kb,
      // because flat UI chrome with hard edges is what PNG is good at)
      if (buf.length < size) {
        if (WRITE) await writeFile(out, buf)
        converted++
        console.log(`webp  ${rel}  ${kb(size)} -> ${kb(buf.length)}`)
      } else {
        console.log(`keep  ${rel}  png wins (${kb(size)} vs ${kb(buf.length)} webp)`)
      }
    }
  }

  // 2 · avif sibling, preferring the pre-optimise master
  const avifOut = base + '.avif'
  try { await stat(avifOut); manifest.push('/' + path.relative(PUB, avifOut)); continue } catch {}

  let src = f, origin = 'webp'
  for (const cand of [path.join(ORIG, rel), path.join(ORIG, rel.replace(/\.\w+$/, '.png')), path.join(ORIG, rel.replace(/\.\w+$/, '.jpg'))]) {
    try { await stat(cand); src = cand; origin = 'original'; break } catch {}
  }

  let buf
  // A master can afford q58. A shipped webp is already lossy, so encoding it at
  // the same number stacks two generations of the same artifacts in the same
  // places; q66 buys back most of that and still clears the 12% gate.
  try { buf = await sharp(src).avif({ quality: origin === 'original' ? 58 : 66, effort: 5, chromaSubsampling: '4:2:0' }).toBuffer() }
  catch (e) { console.log(`FAIL  ${rel}: ${e.message}`); continue }

  const gain = 1 - buf.length / size
  if (gain < MIN_GAIN) { rejected.push(`${rel} (${(gain * 100).toFixed(0)}%)`); continue }

  if (WRITE) { await mkdir(path.dirname(avifOut), { recursive: true }); await writeFile(avifOut, buf) }
  manifest.push('/' + path.relative(PUB, avifOut))
  before += size; after += buf.length; made++
  ;(origin === 'original' ? fromOriginal : fromWebp).push(rel)
}

manifest.sort()
if (WRITE) {
  await writeFile(path.join(ROOT, 'src/lib/avif-manifest.json'), JSON.stringify(manifest, null, 0) + '\n')
}

console.log(`\n${WRITE ? 'WROTE' : 'DRY RUN'}`)
console.log(`avif made        ${made}  (${kb(before)} -> ${kb(after)}, ${(100 - after / before * 100).toFixed(0)}% smaller)`)
console.log(`  from originals ${fromOriginal.length}`)
console.log(`  from webp      ${fromWebp.length}   <- second generation of loss`)
console.log(`png/jpg -> webp  ${converted}`)
console.log(`left alone       ${skipped} (${[...KEEP].join(', ')})`)
console.log(`rejected <12%    ${rejected.length}`)
console.log(`manifest entries ${manifest.length}`)
