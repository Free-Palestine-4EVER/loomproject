// Fixes duplicated case covers.
//
// Bug: public/img/cases/{ellie,maison,evorahome}/cover.webp were byte-identical
// (md5 c79cb38b56380bbf8c6167eb18cb1bb0) — a 1040x715 crop of Ana Ellie's branded
// kraft bag. Correct for `ellie`, copied by mistake onto `maison` and `evorahome`,
// so three unrelated clients rendered the same picture side by side in the Work grid.
//
// Fix: follow the house convention from build-assets.mjs — a case cover is that
// case's own star-0 artwork, re-encoded to webp. Here we keep the exact geometry the
// three broken covers already had (1040x715, fit: cover) so the grid is untouched,
// and only re-point maison + evorahome at their genuine imagery. ellie keeps its file.
// star-N originals are never modified.
import sharp from 'sharp'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath, not .pathname — the repo lives under a path containing a space.
const OUT = fileURLToPath(new URL('../public/img/cases', import.meta.url))

const WIDTH = 1040
const HEIGHT = 715
const QUALITY = 78

// slug -> source still inside that same case folder (verified as that client's work)
const FIX = {
  // "Nebula Nectar" fragrance launch — star-0 is the Maison de l'Avenir flacon
  // (brand name printed on the bottle) in the gold-splash key visual.
  maison: 'star-0.webp',
  // Furniture catalogue on a seamless set — star-0 is the curved sofa render.
  evorahome: 'star-0.webp',
}

const jobs = Object.entries(FIX).map(([slug, src]) =>
  sharp(join(OUT, slug, src))
    .resize({ width: WIDTH, height: HEIGHT, fit: 'cover', position: 'centre' })
    .webp({ quality: QUALITY })
    .toFile(join(OUT, slug, 'cover.webp'))
    .then((info) => console.log(`${slug}/cover.webp  <-  ${src}  ${info.width}x${info.height}  ${info.size}B`)),
)

await Promise.all(jobs)
console.log('covers fixed:', jobs.length)
