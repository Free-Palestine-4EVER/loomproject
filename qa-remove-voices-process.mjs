// One-off QA for the removal of Voices (#voices) and Process (#process),
// 10 Aug 2026. Run against the already-running dev server on :4930.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4930'
const SCRATCH = '/private/tmp/claude-501/-Users-hideyourkids/9286c1c2-28e6-4a23-bfc5-cac391db1070/scratchpad'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.addInitScript(() => { try { localStorage.setItem('loom.forge.popup.seen.v1', '1') } catch {} })
const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => consoleErrors.push(String(err)))

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500) // let loader/hero settle

const domCheck = await page.evaluate(() => {
  return {
    hasVoices: !!document.querySelector('#voices'),
    hasProcess: !!document.querySelector('#process'),
  }
})
console.log('DOM check:', domCheck)
if (domCheck.hasVoices || domCheck.hasProcess) {
  console.error('FAIL: #voices or #process still present in DOM')
  process.exitCode = 1
}

// Walk every nav link (desktop + mobile + footer share the same LINKS array,
// so pulling hrefs from the rendered footer sitemap covers all of them) and
// confirm each hash/path resolves to something real.
const hrefs = await page.evaluate(() => {
  const as = Array.from(document.querySelectorAll('footer a[href]'))
  return [...new Set(as.map((a) => a.getAttribute('href')))]
})
console.log('Footer/nav hrefs found:', hrefs)

const badLinks = []
for (const href of hrefs) {
  if (!href) continue
  if (href.startsWith('#')) {
    if (href === '#top') continue
    const exists = await page.evaluate((h) => !!document.querySelector(h), href)
    if (!exists) badLinks.push(href)
  } else if (href.startsWith('/')) {
    // route — allowlisted in PAGES, just confirm it's a known route
    if (!['/', '/type', '/ai-workshops'].includes(href)) badLinks.push(href)
  }
}
console.log('Dead links:', badLinks)
if (badLinks.length) {
  console.error('FAIL: dead nav/footer links ->', badLinks)
  process.exitCode = 1
}

// Also explicitly confirm no #voices/#process anywhere in the raw href list
if (hrefs.some((h) => h === '#voices' || h === '#process')) {
  console.error('FAIL: #voices or #process still present as a link href')
  process.exitCode = 1
}

// Horizontal overflow at three widths
for (const width of [390, 820, 1440]) {
  await page.setViewportSize({ width, height: 1000 })
  await page.waitForTimeout(300)
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  console.log(`width ${width}:`, overflow)
  if (overflow.scrollWidth !== overflow.clientWidth) {
    console.error(`FAIL: horizontal overflow at ${width} -> scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth}`)
    process.exitCode = 1
  }
}

// Screenshots at 1440 and 390, full page, after removals settle. Scroll the
// whole page first in steps so whileInView / IntersectionObserver reveals
// have all fired before the full-page capture — a straight fullPage shot
// without ever scrolling leaves most sections at their initial opacity: 0.
async function scrollThroughAndShoot(width, height, outPath) {
  await page.setViewportSize({ width, height })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const total = await page.evaluate(() => document.documentElement.scrollHeight)
  const step = Math.round(height * 0.8)
  for (let y = 0; y < total; y += step) {
    await page.evaluate((yy) => window.__lenis ? window.__lenis.scrollTo(yy, { immediate: true }) : window.scrollTo(0, yy), y)
    await page.waitForTimeout(220)
  }
  await page.evaluate(() => window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0))
  await page.waitForTimeout(500)
  await page.screenshot({ path: outPath, fullPage: true })
}
await scrollThroughAndShoot(1440, 900, `${SCRATCH}/loom-after-removal-1440.png`)
await scrollThroughAndShoot(390, 844, `${SCRATCH}/loom-after-removal-390.png`)

console.log('Console errors:', consoleErrors)
if (consoleErrors.length) {
  console.error('FAIL: console errors ->', consoleErrors)
  process.exitCode = 1
}

await browser.close()
if (!process.exitCode) console.log('ALL CHECKS PASSED')
