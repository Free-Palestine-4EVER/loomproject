// ————————————————————————————————————————————
// capture-client-sites.mjs
// Captures the REAL, live website of a case-study client and writes it as
// that case's screen-desktop.webp / screen-mobile.webp — the pair
// Work.jsx's <DeviceShowcase> resolves from the slug alone.
//
// This is the honest counterpart to make-case-screens.mjs, which RENDERS a
// plausible-looking landing page out of the brand's own photography. That
// script is the right answer for a case with no live site (a campaign, a
// packaging job, a CGI mascot); it is the wrong answer for a client whose
// actual site is one fetch away, because the showcase then presents an
// invention as the client's web work.
//
// Only slugs listed in SITES below are captured. A case that is not in the
// map keeps whatever make-case-screens.mjs generated for it — running this
// never blanks a case.
//
// Usage:
//   export PATH="$HOME/.local/node/bin:$PATH"
//   node scripts/capture-client-sites.mjs [slug ...]
// ————————————————————————————————————————————

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import sharp from 'sharp'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CASES_DIR = path.join(ROOT, 'public', 'img', 'cases')

// Verified live as of Aug 2026 — each one was opened and its identity checked
// against the case in site.js, not just resolved by DNS. Domains that turned
// out to be parked, for sale or a blank placeholder are deliberately absent
// rather than captured: anaellie.com ("A Brand New Domain!"), modulart.de
// ("steht zum Verkauf") and maisondelavenir.com (empty stub) are all squats
// or leftovers, not the client.
const SITES = {
  ojar: 'https://ojarofficial.com',
  evorahome: 'https://evorahome.online',
  weitnauer: 'https://www.weitnauer.com',
  herbas: 'https://herbas.ba',
  zen2fit: 'https://zen2fit.com',
  slatko: 'https://slatkoislano.ba',
  benetton: 'https://www.benetton.com',
}

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const SCALE = 2 // capture at 2x, downsample to exact target for crisp output
const WEBP_QUALITY = 82

const wanted = process.argv.slice(2)
const slugs = Object.keys(SITES).filter((s) => !wanted.length || wanted.includes(s))

// A live site is not a static asset: cookie walls, newsletter modals, lazy
// hero video and webfonts all land after load. Settle, then dismiss what we
// can, then settle again — a capture taken at `load` is routinely a white
// box with a consent overlay on it.
async function settle(page) {
  await page.waitForTimeout(6000)
  for (const re of [/accept/i, /agree/i, /got it/i, /allow all/i, /prihvati/i, /continue/i]) {
    const btn = page.getByRole('button', { name: re }).first()
    try {
      if (await btn.isVisible({ timeout: 700 })) { await btn.click({ timeout: 1500 }); break }
    } catch { /* no such button on this site */ }
  }
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(2500)
  // Pull lazy content in, then return to the top so the capture is the hero.
  await page.evaluate(() => window.scrollTo(0, window.innerHeight)).catch(() => {})
  await page.waitForTimeout(1200)
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
  await page.waitForTimeout(1200)
}

const browser = await chromium.launch()
let ok = 0

for (const slug of slugs) {
  const url = SITES[slug]
  const outDir = path.join(CASES_DIR, slug)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  for (const [kind, vp] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: SCALE,
      isMobile: kind === 'mobile',
      hasTouch: kind === 'mobile',
    })
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await settle(page)
      const buf = await page.screenshot()
      await sharp(buf)
        .resize(vp.width, vp.height, { fit: 'cover', position: 'top' })
        .webp({ quality: WEBP_QUALITY })
        .toFile(path.join(outDir, `screen-${kind}.webp`))
      console.log(`[OK]   ${slug} ${kind} <- ${url}`)
      ok++
    } catch (e) {
      console.log(`[FAIL] ${slug} ${kind} <- ${url} : ${e.message.split('\n')[0]}`)
    }
    await page.close()
  }
}

await browser.close()
console.log(`\n${ok}/${slugs.length * 2} captures written.`)
