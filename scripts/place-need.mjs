// Place a Higgsfield PNG into /public/img/needs as an optimised webp.
//   node scripts/place-need.mjs <source.png> <slug>
// Slug is the `photo` key in Banners.jsx NEED_BLOCK (or 'consultancy').
// 1600px wide is the widest the tile is ever painted at 2x; quality 82 is where
// the knit stitches stop losing definition on this material.
import sharp from 'sharp'
import { basename } from 'node:path'
// The repo lives at "…/LOOM PROJECT" — a space. url.pathname keeps it
// percent-encoded ("LOOM%20PROJECT") and sharp then writes to a directory that
// does not exist. fileURLToPath is the only correct decoder here.
import { fileURLToPath } from 'node:url'

const [src, slug] = process.argv.slice(2)
if (!src || !slug) {
  console.error('usage: node scripts/place-need.mjs <source.png> <slug>')
  process.exit(1)
}

const out = fileURLToPath(new URL(`../public/img/needs/${slug}.webp`, import.meta.url))

const info = await sharp(src)
  .resize({ width: 1600, withoutEnlargement: true })
  .webp({ quality: 82, effort: 6 })
  .toFile(out)

console.log(`${basename(src)} -> img/needs/${slug}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} kB`)
