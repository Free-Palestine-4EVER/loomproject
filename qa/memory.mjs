/**
 * DECODED-BITMAP MEMORY, INCLUDING CSS BACKGROUNDS.
 *
 * qa/decoded-footprint.mjs sums `naturalWidth * naturalHeight * 4` across every
 * <img>. That was the whole picture until the industry tour was rebuilt on
 * scroll-driven CSS (14 Aug 2026): its thirty stacked layers are `<i>` elements
 * carrying `background-image`, not <img>. So they are invisible to that tool —
 * AND, far more seriously, invisible to viewportBudget.js, which evicts by
 * iterating `document.images`. A bitmap the budget cannot see is a bitmap it
 * cannot drop when iOS Safari starts running out of room.
 *
 * This counts both, and reports the PEAK while scrubbing the tour rather than a
 * single resting sample — the tour arms and disarms layers as it goes, so the
 * resting number in any one position understates what the page actually holds.
 *
 * Run against a preview build: node qa/memory.mjs [url]
 */
import { chromium, devices } from 'playwright'

const URL = process.argv[2] || 'http://localhost:5299'
const b = await chromium.launch()
// iPhone 13 gives touch + `pointer: coarse`, which is what arms viewportBudget
const ctx = await b.newContext({ ...devices['iPhone 13'] })
const p = await ctx.newPage()

await p.addInitScript(() => {
  // natural size of a background image, resolved once per URL and cached
  window.__natCache = new Map()
  window.__nat = (url) =>
    new Promise((res) => {
      if (window.__natCache.has(url)) return res(window.__natCache.get(url))
      const i = new Image()
      i.onload = () => { const v = { w: i.naturalWidth, h: i.naturalHeight }; window.__natCache.set(url, v); res(v) }
      i.onerror = () => { const v = { w: 0, h: 0 }; window.__natCache.set(url, v); res(v) }
      i.src = url
    })

  window.__sample = async () => {
    let imgBytes = 0, imgCount = 0
    for (const im of document.images) {
      if (!im.naturalWidth) continue
      imgBytes += im.naturalWidth * im.naturalHeight * 4
      imgCount++
    }
    let bgBytes = 0, bgCount = 0
    const seen = []
    for (const el of document.querySelectorAll('*')) {
      const bi = getComputedStyle(el).backgroundImage
      if (!bi || bi === 'none') continue
      /* ONE URL PER DECLARATION, NOT ONE PER CANDIDATE. `image-set(url(x.avif)
         type(...), url(x.webp) type(...))` lists every candidate in the
         computed value, but the browser decodes exactly one of them — counting
         both doubles every layer and invents memory that does not exist.
         Taking the first is correct here: the stage lists AVIF first and every
         engine this runs on supports it. */
      const all = [...bi.matchAll(/url\((['"]?)([^'")]+)\1\)/g)].map((x) => x[2])
      const m = /image-set\(/i.test(bi) ? all.slice(0, 1) : all
      for (const u of m) {
        if (u.startsWith('data:')) continue
        const n = await window.__nat(u)
        if (!n.w) continue
        bgBytes += n.w * n.h * 4
        bgCount++
        seen.push({ u: u.split('/').slice(-1)[0], mb: +(n.w * n.h * 4 / 1048576).toFixed(1) })
      }
    }
    return { imgBytes, imgCount, bgBytes, bgCount, top: seen.sort((a, b) => b.mb - a.mb).slice(0, 6) }
  }
})

await p.goto(URL, { waitUntil: 'load' })
await p.waitForTimeout(1500)

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`
const geo = await p.evaluate(() => {
  const pin = document.querySelector('.sol-pin')
  if (!pin) return null
  return { top: pin.getBoundingClientRect().top + window.scrollY, total: pin.offsetHeight - window.innerHeight }
})
if (!geo) { console.log('no .sol-pin — is this the home route?'); await b.close(); process.exit(1) }

/* scrub the tour and take the PEAK, not a resting sample */
let peak = null
for (let i = 0; i <= 12; i++) {
  await p.evaluate(({ top, total, f }) => window.scrollTo(0, top + total * f), { ...geo, f: i / 12 })
  await p.waitForTimeout(320)
  const s = await p.evaluate(() => window.__sample())
  const total = s.imgBytes + s.bgBytes
  if (!peak || total > peak.total) peak = { ...s, total, at: `${Math.round((i / 12) * 100)}%` }
}

console.log(`\n══ decoded bitmap memory · iPhone 13 · ${URL} ══`)
console.log(`peak during the tour scrub (at ${peak.at} of the track)`)
console.log(`  <img> bitmaps          ${mb(peak.imgBytes).padStart(9)}   (${peak.imgCount} images)`)
console.log(`  CSS background bitmaps ${mb(peak.bgBytes).padStart(9)}   (${peak.bgCount} boxes)  <- invisible to viewportBudget`)
console.log(`  TOTAL                  ${mb(peak.total).padStart(9)}`)
console.log(`\nheaviest single bitmaps resident at peak`)
for (const t of peak.top) console.log(`  ${String(t.mb).padStart(6)} MB  ${t.u}`)
console.log(
  `\niOS Safari kills a tab somewhere around 200-380 MB of total process memory;` +
  `\nbitmaps are only part of that, so treat anything over ~80 MB here as the crash budget being spent.`
)

await b.close()
