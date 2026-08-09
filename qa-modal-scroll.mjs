// Does the need panel's inner scroller actually scroll?
// Opens a Counter tile, then sends a real wheel event over .nm-body and reads
// scrollTop before/after. A mouse wheel is the thing that is broken; keyboard
// and programmatic scrollTo would both "work" and prove nothing.
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:4930'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)

// scroll to the counter tiles and open one
await page.evaluate(() => {
  const t = document.getElementById('counter') || document.getElementById('solutions')
  const y = window.scrollY + t.getBoundingClientRect().top - 40
  window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)
})
await page.waitForTimeout(900)

const tile = await page.$('.cnt-tile')
if (!tile) {
  const cands = await page.$$eval('#counter button, #counter [role="button"]', (els) =>
    els.slice(0, 8).map((e) => `${e.tagName}.${e.className}`))
  console.log('no tile matched. candidates:', cands)
} else {
  await tile.click()
}
await page.waitForTimeout(1200)

const has = await page.$('.nm-body')
if (!has) { console.log('❌ .nm-body never appeared — modal did not open'); await browser.close(); process.exit(0) }

const before = await page.$eval('.nm-body', (e) => e.scrollTop)
const box = await page.$eval('.nm-body', (e) => {
  const r = e.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, sh: e.scrollHeight, ch: e.clientHeight }
})
console.log(`.nm-body scrollHeight ${box.sh} clientHeight ${box.ch} (overflows by ${box.sh - box.ch}px)`)

await page.mouse.move(box.x, box.y)
await page.mouse.wheel(0, 400)
await page.waitForTimeout(600)
const after = await page.$eval('.nm-body', (e) => e.scrollTop)

console.log(`wheel over .nm-body: scrollTop ${before} -> ${after}  ${after > before ? '✅ scrolls' : '❌ FROZEN'}`)

// Is Lenis eating it?
const lenis = await page.evaluate(() => ({
  exists: !!window.__lenis,
  stopped: window.__lenis?.isStopped ?? null,
  prevented: document.querySelectorAll('[data-lenis-prevent]').length,
}))
console.log('lenis:', JSON.stringify(lenis))

await browser.close()
