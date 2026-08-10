// Deep runtime inspection: long tasks during a scripted scroll, non-passive
// listeners, DOM size, decoding attrs, and an approximate scroll FPS.
// node scripts/perf-runtime-audit.mjs [url]
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:4931/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.addInitScript(() => {
  window.__longtasks = []
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__longtasks.push({
          start: e.startTime, dur: e.duration,
          attribution: (e.attribution || []).map((a) => a.name + '@' + (a.containerSrc || a.containerName || '')),
        })
      }
    }).observe({ entryTypes: ['longtask'] })
  } catch {}

  // Wrap addEventListener to catch non-passive wheel/touch/scroll listeners
  window.__badListeners = []
  const orig = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (['wheel', 'touchstart', 'touchmove', 'scroll'].includes(type)) {
      const passive = typeof options === 'object' && options !== null ? options.passive : undefined
      if (passive !== true) {
        window.__badListeners.push({ type, target: this === window ? 'window' : this === document ? 'document' : (this.tagName || this.constructor?.name || 'node'), passive })
      }
    }
    return orig.call(this, type, listener, options)
  }
})

await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(2000)

// DOM stats
const domStats = await page.evaluate(() => {
  const all = document.querySelectorAll('*')
  let maxDepth = 0
  const depth = (el, d) => { maxDepth = Math.max(maxDepth, d); for (const c of el.children) depth(c, d + 1) }
  depth(document.body, 0)
  const bySection = {}
  document.querySelectorAll('section, [id]').forEach((s) => {
    if (s.id) bySection[s.id] = s.querySelectorAll('*').length
  })
  return { totalNodes: all.length, maxDepth, bySection }
})

// decoding audit
const decoding = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')]
  const missing = imgs.filter((i) => i.decoding !== 'async').map((i) => i.src)
  return { total: imgs.length, missingAsync: missing }
})

// FPS + longtask during a real scroll (rAF-based frame counter)
const scrollResult = await page.evaluate(async () => {
  let frames = 0
  let running = true
  function tick() { frames++; if (running) requestAnimationFrame(tick) }
  requestAnimationFrame(tick)

  const doc = document.documentElement
  const max = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight
  const start = performance.now()
  const steps = 120
  for (let i = 0; i <= steps; i++) {
    const y = Math.round((max * i) / steps)
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 16))
  }
  const elapsed = performance.now() - start
  running = false
  await new Promise((r) => setTimeout(r, 300))
  return { frames, elapsed, fps: frames / (elapsed / 1000) }
})

await page.waitForTimeout(500)
const longtasks = await page.evaluate(() => window.__longtasks)
const badListeners = await page.evaluate(() => window.__badListeners)

console.log(`\nURL: ${url}`)
console.log(`\nDOM: ${domStats.totalNodes} nodes, max depth ${domStats.maxDepth}`)
console.log('Heaviest sections by node count:')
Object.entries(domStats.bySection).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([id, n]) => console.log(`  ${id.padEnd(24)} ${n}`))

console.log(`\nImages missing decoding=async: ${decoding.missingAsync.length}/${decoding.total}`)
decoding.missingAsync.slice(0, 10).forEach((s) => console.log('  ' + s))

console.log(`\nScroll FPS (scripted, ~2s full-document scroll): ${scrollResult.fps.toFixed(1)} fps (${scrollResult.frames} frames / ${(scrollResult.elapsed / 1000).toFixed(2)}s)`)

console.log(`\nLong tasks during scroll: ${longtasks.length}`)
const totalBlocking = longtasks.reduce((a, t) => a + Math.max(0, t.dur - 50), 0)
console.log(`Total blocking time (>50ms portion): ${totalBlocking.toFixed(0)}ms`)
longtasks.sort((a, b) => b.dur - a.dur).slice(0, 10).forEach((t) => console.log(`  ${t.dur.toFixed(1)}ms @${t.start.toFixed(0)}ms  ${JSON.stringify(t.attribution)}`))

console.log(`\nNon-passive wheel/touch/scroll listeners: ${badListeners.length}`)
badListeners.slice(0, 20).forEach((l) => console.log(`  ${l.type} on ${l.target} (passive=${l.passive})`))

await browser.close()
