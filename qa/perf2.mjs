/**
 * A FAIR before/after, with the confound removed.
 *
 * qa/perf.mjs measured every byte fetched in a 5s window, and that number was
 * not trustworthy: React's own JS reading swung 323KB -> 197KB across runs on
 * an UNCHANGED build. The cause is the decorative WebGL butterfly. It is
 * lazily imported behind an idle callback, so whether its ~500KB three.js
 * chunk and the 221KB planet texture land inside the window is a race — and
 * the Svelte build wins that race more often precisely BECAUSE its own JS is
 * lighter and the main thread goes quiet sooner. Measuring "bytes in 5s" was
 * therefore penalising the faster build for being faster.
 *
 * So this script blocks the decorative WebGL layer on BOTH sites and measures
 * the page proper. That layer is genuinely optional content — it does not
 * render text, it is skipped entirely on low-memory and save-data devices, and
 * it is not on either build's critical path.
 *
 * It also reports bytes BEFORE LCP separately, which is the number that
 * actually corresponds to "how long until this looks loaded".
 */
import { chromium } from 'playwright'

const RUNS = 7
const [, , A, B] = process.argv
const NET = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: 96000 }
const CPU = 4

// The decorative layer, on both builds.
const BLOCK = /glContext|Companion|butterfly|three|planet\.(avif|webp)/i

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const ms = (n) => `${n.toFixed(0)} ms`

async function measure(browser, url) {
  const runs = []
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.route('**/*', (r) => (BLOCK.test(r.request().url()) ? r.abort() : r.continue()))
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', NET)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

    await page.goto(url, { waitUntil: 'load' })
    await page.waitForTimeout(5000)

    const m = await page.evaluate(() => new Promise((res) => {
      const nav = performance.getEntriesByType('navigation')[0] || {}
      const fcp = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint')?.startTime ?? 0
      let lcp = 0
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = Math.max(lcp, e.startTime) }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch {}
      let cls = 0
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value }).observe({ type: 'layout-shift', buffered: true }) } catch {}
      setTimeout(() => {
        let js = 0, total = 0, beforeLcp = 0
        for (const r of performance.getEntriesByType('resource')) {
          const n = r.encodedBodySize || 0
          total += n
          if (r.responseEnd <= lcp) beforeLcp += n
          if (r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name)) js += n
        }
        const html = nav.encodedBodySize || 0
        res({ fcp, lcp, cls, js, html, total: total + html, beforeLcp: beforeLcp + html })
      }, 400)
    }))
    runs.push(m)
    await ctx.close()
  }
  const pick = (k) => median(runs.map((r) => r[k]))
  return Object.fromEntries(['fcp','lcp','cls','js','html','total','beforeLcp'].map((k) => [k, pick(k)]))
}

const browser = await chromium.launch()
console.log(`${RUNS} cold runs each, Slow-4G + ${CPU}x CPU, decorative WebGL blocked on both, median.\n`)
const a = await measure(browser, A), b = await measure(browser, B)
await browser.close()

const row = (label, x, y, fmt, lower = true) => {
  const pct = x === 0 ? 0 : ((y - x) / x) * 100
  const better = lower ? y < x : y > x
  const arrow = Math.abs(pct) < 3 ? '·' : better ? '▼' : '▲'
  console.log(label.padEnd(17) + fmt(x).padStart(10) + fmt(y).padStart(12) + `   ${arrow} ${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`)
}
console.log(`${''.padEnd(17)}${'React'.padStart(10)}${'Svelte'.padStart(12)}   change`)
console.log('─'.repeat(56))
row('FCP', a.fcp, b.fcp, ms)
row('LCP', a.lcp, b.lcp, ms)
row('CLS', a.cls, b.cls, (n) => n.toFixed(3))
console.log('─'.repeat(56))
row('HTML', a.html, b.html, kb, false)
row('JS', a.js, b.js, kb)
row('bytes before LCP', a.beforeLcp, b.beforeLcp, kb)
row('bytes total', a.total, b.total, kb)
