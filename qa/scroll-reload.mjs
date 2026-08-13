// Reproduces the client's exact journey: load /, let warm-up drain, scroll to
// bottom, scroll to top, scroll to bottom again. Asserts no <img> src/srcset
// is ever mutated (MutationObserver over the whole document), no image goes
// complete:true -> complete:false, counts resource entries (network vs cache),
// and screenshots the way back up.
//
// Usage: node qa/scroll-reload.mjs <chromium|webkit> <width>x<height> [touch]
import { chromium, webkit } from 'playwright'
import fs from 'node:fs'

const [, , engineName, sizeArg, touchArg] = process.argv
const engine = engineName === 'webkit' ? webkit : chromium
const [width, height] = sizeArg.split('x').map(Number)
const hasTouch = touchArg === 'touch'

const BASE = 'http://localhost:4930'
const outDir = 'qa/shots'
fs.mkdirSync(outDir, { recursive: true })
const tag = `${engineName}-${sizeArg}${hasTouch ? '-touch' : ''}`

const b = await engine.launch()
const ctxOpts = { viewport: { width, height } }
if (hasTouch) { ctxOpts.hasTouch = true; ctxOpts.isMobile = true }
const ctx = await b.newContext(ctxOpts)
const p = await ctx.newPage()

// Instrument BEFORE navigation so nothing is missed.
await p.addInitScript(() => {
  window.__mutations = []
  window.__completeFlips = []
  window.__completeSeen = new WeakMap()
  const track = () => {
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type !== 'attributes') continue
        if (r.attributeName !== 'src' && r.attributeName !== 'srcset') continue
        const el = r.target
        window.__mutations.push({
          tag: el.tagName,
          attr: r.attributeName,
          old: r.oldValue,
          new: el.getAttribute(r.attributeName),
          cls: el.className || '',
          id: el.id || '',
        })
      }
    })
    mo.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['src', 'srcset'],
      subtree: true,
    })
    window.__mo = mo
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', track)
  else track()

  // Poll complete flips AND resident-bitmap total at rAF cadence (cheap: only
  // touches <img> elements) so the peak reported is the real peak reached
  // during the journey, not just at the four scroll checkpoints.
  window.__peakDecoded = 0
  const pollComplete = () => {
    let total = 0
    for (const img of document.images) {
      const was = window.__completeSeen.get(img)
      const now = img.complete
      if (was === true && now === false) {
        window.__completeFlips.push({ src: img.currentSrc || img.src, cls: img.className || '' })
      }
      window.__completeSeen.set(img, now)
      if (img.naturalWidth > 2) total += img.naturalWidth * img.naturalHeight * 4
    }
    if (total > window.__peakDecoded) window.__peakDecoded = total
    requestAnimationFrame(pollComplete)
  }
  requestAnimationFrame(pollComplete)
})

console.log(`[${tag}] navigating...`)
await p.goto(BASE + '/', { waitUntil: 'load' })

// Let the warm-up pass drain (imageWarm.js: batches of 7, idle-scheduled) AND
// the viewportBudget downscale queue settle (8-concurrent, ~25ms/image, but
// gated on images actually being warmed first). Poll rather than a fixed
// sleep: warm-up's own comments document real-world drains up to ~20-40s
// under sustained compositor load, and starting the scroll journey before it
// is done would make the downscale pass's own one-time thumbnail swap look
// like a re-eviction reload in the instrumentation below — a false positive,
// not the bug this script exists to catch.
await p.waitForFunction(
  () => document.querySelectorAll('img[loading="lazy"]').length === 0,
  { timeout: 30000 }
).catch(() => {})
// give the downscale queue (rate-limited, rAF-driven) time to drain any
// images that only just became complete
await p.waitForTimeout(4000)
// reset instrumentation now that the warm-up's own (legitimate, one-time)
// src rewrites are done — we only care about mutations from here on
await p.evaluate(() => { window.__mutations.length = 0; window.__completeFlips.length = 0 })

const countResources = async () => p.evaluate(() => {
  const entries = performance.getEntriesByType('resource').filter((e) => e.initiatorType === 'img' || /\.(avif|webp|jpg|jpeg|png|gif)(\?|$)/i.test(e.name))
  return {
    total: entries.length,
    network: entries.filter((e) => e.transferSize > 0).length,
    cached: entries.filter((e) => e.transferSize === 0).length,
  }
})

const peakDecoded = async () => p.evaluate(() => {
  let total = 0
  for (const img of document.images) {
    if (img.naturalWidth > 2) total += img.naturalWidth * img.naturalHeight * 4
  }
  return total
})

const before = await countResources()
let peak = await peakDecoded()

const scrollTo = async (pos) => {
  await p.evaluate(async (target) => {
    const step = target > window.scrollY ? 400 : -400
    let y = window.scrollY
    while ((step > 0 && y < target) || (step < 0 && y > target)) {
      y = Math.max(0, Math.min(target, y + step))
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 30))
    }
    window.scrollTo(0, target)
    await new Promise((r) => setTimeout(r, 200))
  }, pos)
  const d = await peakDecoded()
  if (d > peak) peak = d
}

const scrollHeight = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)

console.log(`[${tag}] scrolling to bottom (${scrollHeight}px)...`)
await scrollTo(scrollHeight)
await p.screenshot({ path: `${outDir}/${tag}-1-bottom.png` })

console.log(`[${tag}] scrolling back to top...`)
await scrollTo(0)
await p.screenshot({ path: `${outDir}/${tag}-2-top.png` })

console.log(`[${tag}] scrolling to bottom again...`)
await scrollTo(scrollHeight)
await p.screenshot({ path: `${outDir}/${tag}-3-bottom-again.png` })

await scrollTo(0)
await p.screenshot({ path: `${outDir}/${tag}-4-top-again.png` })

const after = await countResources()
const mutations = await p.evaluate(() => window.__mutations)
const flips = await p.evaluate(() => window.__completeFlips)
const realPeak = await p.evaluate(() => window.__peakDecoded)
if (realPeak > peak) peak = realPeak

// The BLANK gif is the eviction signature (viewportBudget.js's `evict()`) —
// an already-decoded image dropping its src/srcset to nothing, which is the
// literal bug this pass fixes. A blob: URL is the DOWNSCALE pass's one-time
// thumbnail swap (also viewportBudget.js, but a permanent size optimisation,
// not a repeated evict/restore). Anything else touching src/srcset on this
// route is AppsShowcase.svelte's product rail, keyed on the selected product
// (`{#key item.key}`) and changing deliberately as the reader scrolls past
// it — a feature the client explicitly asked for ("make it change on scroll
// like it used to do"), not a candidate for this file's fix, and not in this
// task's file scope.
const BLANK_RE = /^data:image\/gif;base64,R0lGODlhAQABAIAAAAAAAP/
const eviction = mutations.filter((m) => BLANK_RE.test(m.new || '') || m.new === null && BLANK_RE.test(m.old || ''))
const downscale = mutations.filter((m) => (m.new || '').startsWith('blob:'))
const other = mutations.filter((m) => !eviction.includes(m) && !downscale.includes(m))

console.log(`\n===== ${tag} =====`)
console.log('resources before round trip:', before)
console.log('resources after round trip: ', after)
console.log('peak decoded bitmap total (MB):', (peak / 1024 / 1024).toFixed(1))
console.log(`src/srcset mutations during journey: ${mutations.length} total`)
console.log(`  eviction (BLANK placeholder swap — THE BUG):  ${eviction.length}`)
console.log(`  downscale (one-time thumbnail optimisation):  ${downscale.length}`)
console.log(`  other (AppsShowcase product-rail content):    ${other.length}`)
if (eviction.length) {
  console.log('  EVICTION sample (first 10):')
  for (const m of eviction.slice(0, 10)) {
    console.log(`    <${m.tag} class="${m.cls}"> ${m.attr}: ${JSON.stringify(m.old)} -> ${JSON.stringify(m.new)}`)
  }
}
console.log(`complete:true -> complete:false flips: ${flips.length}`)
if (flips.length) {
  console.log('  sample (first 10):')
  for (const f of flips.slice(0, 10)) console.log(`    ${f.src} (${f.cls})`)
}

const pass = eviction.length === 0
console.log(pass ? 'PASS — zero eviction/reload signals' : 'FAIL — eviction reload signals detected')

await b.close()
process.exit(pass ? 0 : 1)
