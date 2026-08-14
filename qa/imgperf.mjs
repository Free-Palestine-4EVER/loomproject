/**
 * WHAT DOES THE PAGE ACTUALLY COST, AND WHAT IS MAKING IT ROUGH?
 *
 * Four questions, because they have four different answers and mixing them is
 * how a "performance pass" turns into guesswork:
 *
 *   1. WHAT ARRIVES BEFORE A READER SCROLLS. Bytes on the wire up to the load
 *      event, split by type, plus LCP. This is the number that decides whether
 *      the site feels instant on a phone in Amman.
 *   2. WHAT ARRIVES THAT NOBODY SEES. Images fetched during the initial load
 *      that are never in the first viewport — the classic cause of a heavy
 *      first paint on a long marketing page.
 *   3. WHAT IS BIGGER THAN THE BOX IT LANDS IN. Intrinsic pixels against
 *      displayed pixels at the device's own DPR. A 2x ratio is 4x the bytes.
 *   4. WHAT MAKES SCROLLING ROUGH. Long tasks on the main thread and dropped
 *      frames, sampled while actually scrolling rather than while idle.
 *
 * Run against a PREVIEW build, never dev: `npm run build && npm run preview`.
 * Dev serves unminified JS and skips the asset pipeline, so every number here
 * would be wrong in a way that flatters some problems and invents others.
 */
import { chromium, devices } from 'playwright'

const URL = process.argv[2] || 'http://localhost:5299'
const MOBILE = process.argv[3] === 'mobile'

const b = await chromium.launch()
const ctx = await b.newContext(
  MOBILE
    ? { ...devices['iPhone 13'] }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
)
const p = await ctx.newPage()

const reqs = []
p.on('response', async (r) => {
  const req = r.request()
  let size = 0
  try { size = (await r.body()).length } catch { size = 0 }
  reqs.push({ url: r.url(), type: req.resourceType(), size, status: r.status() })
})

const t0 = Date.now()
await p.goto(URL, { waitUntil: 'load' })
const loadMs = Date.now() - t0
await p.waitForTimeout(2500)

const initial = reqs.slice()
const by = (t) => initial.filter((r) => r.type === t).reduce((a, r) => a + r.size, 0)
const kb = (n) => `${(n / 1024).toFixed(0)} KB`

const lcp = await p.evaluate(
  () =>
    new Promise((res) => {
      let v = null
      new PerformanceObserver((l) => {
        const e = l.getEntries()
        v = e[e.length - 1]
      }).observe({ type: 'largest-contentful-paint', buffered: true })
      setTimeout(() => res(v ? { ms: Math.round(v.startTime), el: v.element?.className || v.url || '?' } : null), 400)
    })
)

console.log(`\n══ ${MOBILE ? 'iPhone 13' : 'desktop 1440 @2x'} · ${URL} ══`)
console.log(`load event        ${loadMs} ms`)
console.log(`LCP               ${lcp ? `${lcp.ms} ms  (${String(lcp.el).slice(0, 60)})` : 'not reported'}`)
console.log(`\nbytes before any scroll`)
console.log(`  images          ${kb(by('image'))}`)
console.log(`  scripts         ${kb(by('script'))}`)
console.log(`  fonts           ${kb(by('font'))}`)
console.log(`  stylesheets     ${kb(by('stylesheet'))}`)
console.log(`  TOTAL           ${kb(initial.reduce((a, r) => a + r.size, 0))}`)

/* the ten heaviest images that arrived before a scroll, and whether any of
   them were even on screen — an image that costs 200 KB to not be looked at is
   the single most common finding on a page like this */
const offscreen = await p.evaluate(() => {
  const seen = {}
  for (const i of document.querySelectorAll('img')) {
    const r = i.getBoundingClientRect()
    if (i.currentSrc) seen[i.currentSrc] = r.top < window.innerHeight && r.bottom > 0
  }
  return seen
})
const imgs = initial
  .filter((r) => r.type === 'image')
  .sort((a, b) => b.size - a.size)
  .slice(0, 10)
console.log(`\nheaviest images on first load`)
for (const i of imgs) {
  const name = i.url.split('/').slice(-2).join('/')
  const vis = offscreen[i.url]
  console.log(`  ${kb(i.size).padStart(8)}  ${vis === false ? 'OFF-SCREEN ' : vis === true ? 'in view    ' : 'css/none   '} ${name}`)
}
const wasted = imgs.filter((i) => offscreen[i.url] === false).reduce((a, i) => a + i.size, 0)
if (wasted) console.log(`  → ${kb(wasted)} of the top ten was never in the first viewport`)

/* everything, once scrolled: oversizing and missing dimensions */
await p.evaluate(async () => {
  const h = document.documentElement.scrollHeight
  for (let y = 0; y < h; y += 700) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 70))
  }
})
await p.waitForTimeout(3000)

const audit = await p.evaluate(() => {
  const dpr = window.devicePixelRatio
  const out = { oversize: [], noDims: [], eagerBelowFold: [] }
  for (const i of document.querySelectorAll('img')) {
    const r = i.getBoundingClientRect()
    if (!i.naturalWidth || !r.width) continue
    const ratio = i.naturalWidth / (r.width * dpr)
    const name = i.currentSrc.split('/').slice(-2).join('/')
    if (ratio > 1.35) out.oversize.push({ name, nat: i.naturalWidth, shown: Math.round(r.width), ratio: +ratio.toFixed(2) })
    if (!i.getAttribute('width') || !i.getAttribute('height')) out.noDims.push(name)
  }
  return out
})

console.log(`\noversized (intrinsic > 1.35x the box at this DPR): ${audit.oversize.length}`)
for (const o of audit.oversize.sort((a, b) => b.ratio - a.ratio).slice(0, 12)) {
  console.log(`  ${String(o.ratio).padStart(5)}x  ${String(o.nat).padStart(5)}px natural → ${String(o.shown).padStart(4)}px box   ${o.name}`)
}
console.log(`\nmissing width/height (each one is a CLS risk): ${audit.noDims.length}`)
for (const n of [...new Set(audit.noDims)].slice(0, 10)) console.log(`  ${n}`)

/* ——— smoothness, measured while scrolling ——— */
await p.evaluate(() => window.scrollTo(0, 0))
await p.waitForTimeout(600)
await p.evaluate(() => {
  window.__long = []
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__long.push(Math.round(e.duration))
  }).observe({ type: 'longtask', buffered: false })
  window.__frames = []
  let last = performance.now()
  window.__rafOn = true
  const t = () => {
    const n = performance.now()
    window.__frames.push(n - last)
    last = n
    if (window.__rafOn) requestAnimationFrame(t)
  }
  requestAnimationFrame(t)
})
for (let i = 0; i < 60; i++) {
  await p.mouse.wheel(0, 90)
  await p.waitForTimeout(24)
}
const smooth = await p.evaluate(() => {
  window.__rafOn = false
  const f = window.__frames.filter((x) => x > 0)
  f.sort((a, b) => a - b)
  return {
    longTasks: window.__long.length,
    longestTask: window.__long.length ? Math.max(...window.__long) : 0,
    totalBlocking: window.__long.reduce((a, d) => a + Math.max(0, d - 50), 0),
    medianFrame: +f[Math.floor(f.length / 2)]?.toFixed(1),
    p95Frame: +f[Math.floor(f.length * 0.95)]?.toFixed(1),
    dropped: f.filter((x) => x > 24).length,
    frames: f.length,
  }
})
console.log(`\nscrolling`)
console.log(`  long tasks      ${smooth.longTasks}  (longest ${smooth.longestTask} ms, blocking ${smooth.totalBlocking} ms)`)
console.log(`  frame median    ${smooth.medianFrame} ms   p95 ${smooth.p95Frame} ms`)
console.log(`  frames over 24ms ${smooth.dropped} of ${smooth.frames}`)

await b.close()
