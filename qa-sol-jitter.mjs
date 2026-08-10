// Reproduce the mobile shake in #solutions' pinned tour.
// Samples geometry every frame WHILE scrolling through the pin, the way a
// thumb actually moves through it.
import { webkit, chromium } from 'playwright'

const URL = 'http://localhost:4930/'
const engine = process.argv.includes('--chromium') ? chromium : webkit

const b = await engine.launch()
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load' })
await page.waitForTimeout(3500)

const y = await page.evaluate(() => {
  const pin = document.querySelector('.sol-pin')
  const top = pin.getBoundingClientRect().top + window.scrollY
  return Math.round(top + window.innerHeight * 0.6)
})
await page.evaluate((y) => {
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
  else window.scrollTo(0, y)
}, y)
await page.waitForTimeout(1000)

// Mobile WebKit has no wheel, so the scroll is driven from inside the page —
// one steady step per frame for 2.5s, then released, which is what a thumb
// drag through the tour actually looks like to the section's own code.
await page.evaluate(() => {
  window.__rec = []
  const t0 = performance.now()
  const start = window.scrollY
  const tick = () => {
    const el = performance.now() - t0
    if (el < 2500) {
      const ny = start + el * 0.42            // ~420px/s, a slow read-through
      if (window.__lenis) window.__lenis.scrollTo(ny, { immediate: true })
      else window.scrollTo(0, ny)
    }
    const card = document.querySelector('.sol-pin .sol-panelcard')
    const r = card?.getBoundingClientRect()
    window.__rec.push({
      t: Math.round(performance.now() - t0),
      y: Math.round(window.scrollY),
      top: r ? Math.round(r.top * 10) / 10 : null,
      h: r ? Math.round(r.height * 10) / 10 : null,
      op: card ? +(getComputedStyle(card).opacity) : null,
      tf: card ? getComputedStyle(card).transform : null,
      n: document.querySelector('.sol-answer-name')?.textContent ?? null,
    })
    if (performance.now() - t0 < 6000) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

await page.waitForTimeout(6300)          // recorder runs 6s, then settle

const rec = await page.evaluate(() => window.__rec)

// how much does the card's TOP EDGE move against the scroll it is anchored to?
// It is bottom-anchored inside a pinned viewport, so at a steady scroll it
// should be perfectly still except when the industry changes.
let flips = 0, prevN = rec[0]?.n
const jumps = []
for (let i = 1; i < rec.length; i++) {
  if (rec[i].n !== prevN) { flips++; prevN = rec[i].n }
  const d = Math.abs((rec[i].top ?? 0) - (rec[i - 1].top ?? 0))
  if (d > 0.6) jumps.push({ t: rec[i].t, d: +d.toFixed(1), h: rec[i].h, n: rec[i].n, op: rec[i].op })
}
const heights = [...new Set(rec.map((s) => s.h))]
console.log('frames:', rec.length, ' industry changes:', flips)
console.log('distinct card heights seen:', heights.join(', '))
console.log('frames where the card top jumped >0.6px:', jumps.length)
console.log(JSON.stringify(jumps.slice(0, 28), null, 0))
const tail = rec.slice(-40)
console.log('AFTER SCROLL STOPPED — top travel:',
  (Math.max(...tail.map((s) => s.top)) - Math.min(...tail.map((s) => s.top))).toFixed(1),
  ' opacity travel:', (Math.max(...tail.map((s) => s.op)) - Math.min(...tail.map((s) => s.op))).toFixed(2))

await page.screenshot({ path: 'qa-sol-jitter.png' })
await b.close()
