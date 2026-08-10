// What is the tallest the pinned phone sheet gets, across all thirty?
// The card is bottom-anchored, so every millimetre of height variance is a
// jump of its top edge as the tour walks past.
import { webkit } from 'playwright'

const b = await webkit.launch()
const W = Number(process.argv[2] ?? 390)
const page = await b.newPage({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto('http://localhost:4930/', { waitUntil: 'load' })
await page.waitForTimeout(3000)

const y = await page.evaluate(() => {
  const pin = document.querySelector('.sol-pin')
  return Math.round(pin.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.6)
})
await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)), y)
await page.waitForTimeout(900)

const names = await page.evaluate(() => window.__NICHE_NAMES ?? null)
const list = names ?? JSON.parse(process.env.NICHES ?? '[]')

const rows = []
for (const name of list) {
  await page.fill('#sol-search', name)
  await page.waitForTimeout(120)
  const r = await page.evaluate(() => {
    const c = document.querySelector('.sol-pin .sol-panelcard')
    const b = c.getBoundingClientRect()
    return { h: Math.round(b.height * 10) / 10, top: Math.round(b.top * 10) / 10, shown: document.querySelector('.sol-answer-name')?.textContent }
  })
  rows.push({ name, ...r })
}
rows.sort((a, b) => b.h - a.h)
console.log(`width ${W} — tallest first`)
for (const r of rows.slice(0, 8)) console.log(`  ${String(r.h).padStart(6)}  ${r.shown}`)
console.log('  ...')
for (const r of rows.slice(-4)) console.log(`  ${String(r.h).padStart(6)}  ${r.shown}`)
console.log(`RANGE: ${rows[rows.length - 1].h} … ${rows[0].h}  (swing ${(rows[0].h - rows[rows.length - 1].h).toFixed(1)}px)`)
await b.close()
