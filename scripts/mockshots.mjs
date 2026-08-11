/**
 * Render the hand-authored screens in `mocks/` to the app screenshots the
 * stage shows.
 *
 *   node scripts/mockshots.mjs              # every mock
 *   node scripts/mockshots.mjs lume tarz    # only keys starting with these
 *
 * Screens are 540x1174 (the size of the real KwaKwa captures) shot at DPR 2
 * and written 720px wide; icons are 128x128 shot at DPR 2 and written at 128.
 * Output lands in static/img/suite/ under the mock's own filename, so
 * `mocks/lume-2.html` becomes `static/img/suite/lume-2.webp`.
 *
 * Run `node scripts/responsive.mjs` afterwards — the stage reads its srcset
 * ladder out of responsive.json, and a new original with no entry there is
 * served unscaled at every width.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { readdir, mkdir } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'

const SRC = 'mocks'
const OUT = 'static/img/suite'

const SCREEN = { width: 540, height: 1174, out: 720 }
const ICON = { width: 128, height: 128, out: 128 }

const only = process.argv.slice(2)
const files = (await readdir(SRC))
  .filter((f) => f.endsWith('.html'))
  .filter((f) => !only.length || only.some((k) => f.startsWith(k)))
  .sort()

if (!files.length) {
  console.error(only.length ? `no mocks match ${only.join(', ')}` : 'no mocks found')
  process.exit(1)
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()

for (const file of files) {
  const name = basename(file, '.html')
  const spec = name.endsWith('-icon') ? ICON : SCREEN
  const ctx = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  })
  const page = await ctx.newPage()
  await page.goto('file://' + resolve(SRC, file))
  await page.evaluate(() => document.fonts.ready)
  // a beat for gradients/SVG to settle before the frame is taken
  await page.waitForTimeout(250)
  const png = await page.screenshot({ type: 'png' })
  await ctx.close()

  // Guard the contract: a screen that overflows its box would be captured
  // cropped, and the crop is invisible until it's on the stage.
  const meta = await sharp(png).metadata()
  if (meta.width !== spec.width * 2 || meta.height !== spec.height * 2) {
    console.error(`${file}: captured ${meta.width}x${meta.height}, expected ${spec.width * 2}x${spec.height * 2}`)
    process.exitCode = 1
  }

  const dest = join(OUT, `${name}.webp`)
  const info = await sharp(png)
    .resize({ width: spec.out })
    .webp({ quality: 82 })
    .toFile(dest)
  console.log(`${dest.padEnd(44)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`)
}

await browser.close()
