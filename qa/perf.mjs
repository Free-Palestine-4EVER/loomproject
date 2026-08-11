/**
 * The before/after measurement. The whole rebuild was sold on speed, so the
 * speed claim has to be evidence and not assertion.
 *
 *   node qa/perf.mjs <reactUrl> <svelteUrl>
 *   node qa/perf.mjs http://localhost:4931 http://localhost:4941
 *
 * Both must be PRODUCTION builds (vite preview), not dev servers — a dev server
 * ships unbundled modules and would flatter the comparison in whichever
 * direction happened to be convenient.
 *
 * ── WHY THIS SCRIPT LOOKS OVERBUILT ────────────────────────────────────────
 * The first version of it reported LCP 0, JS bytes 0 and FCP 52ms vs 56ms, and
 * every one of those numbers was wrong:
 *
 *   · BYTES came from the `content-length` response header, which simply is
 *     not present on a compressed or chunked response. Fixed by reading
 *     `encodedBodySize` off the Resource Timing entries instead, which is what
 *     actually crossed the wire, per resource, after compression.
 *
 *   · LCP was read synchronously from getEntriesByType, which returns nothing
 *     unless an observer with `buffered: true` has already been registered.
 *     Fixed by registering the observer and waiting for it to settle.
 *
 *   · FCP on a warm localhost with no throttling measures nothing but the
 *     machine. Both numbers land in the 50ms range and the difference is
 *     scheduler noise. Fixed by throttling CPU and network through CDP to a
 *     mid-range device on a real connection — which is the condition the
 *     rebuild is actually FOR. An unthrottled localhost run cannot distinguish
 *     "paints from HTML" from "paints after parsing 182 KB of JS", because on
 *     a desktop with a warm cache both are nearly instant.
 *
 * The throttle profile below is Lighthouse's "Slow 4G / 4x CPU slowdown"
 * mobile preset, which is the industry default for exactly this comparison.
 */
import { chromium } from 'playwright'

const RUNS = 5
const [, , A, B] = process.argv
if (!A || !B) {
  console.error('usage: node qa/perf.mjs <reactUrl> <svelteUrl>')
  process.exit(1)
}

// Lighthouse mobile preset.
const NET = {
  offline: false,
  latency: 150,                       // ms RTT
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
}
const CPU_SLOWDOWN = 4

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const ms = (n) => `${n.toFixed(0)} ms`

async function measure(browser, url) {
  const runs = []

  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      // A cold visitor. Reusing a context would measure the cache, not the site.
      bypassCSP: false,
    })
    const page = await ctx.newPage()

    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', NET)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN })

    await page.goto(url, { waitUntil: 'load' })

    // LCP is only final once the page stops changing. Give it room, and give
    // the lazy imagery below the fold a chance to settle too.
    await page.waitForTimeout(5000)

    const m = await page.evaluate(() => new Promise((resolve) => {
      const nav = performance.getEntriesByType('navigation')[0] || {}
      const fcp = performance.getEntriesByType('paint')
        .find((p) => p.name === 'first-contentful-paint')?.startTime ?? 0

      // Buffered observers — the ONLY way to get entries emitted before this
      // script ran.
      let lcp = 0
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) lcp = Math.max(lcp, e.startTime)
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      } catch {}

      let cls = 0
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value
        }).observe({ type: 'layout-shift', buffered: true })
      } catch {}

      // encodedBodySize is what actually crossed the wire, after compression.
      // It is 0 for cross-origin resources without Timing-Allow-Origin, but
      // everything here is same-origin.
      let js = 0, css = 0, img = 0, font = 0, total = 0
      for (const r of performance.getEntriesByType('resource')) {
        const n = r.encodedBodySize || 0
        total += n
        if (r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name)) js += n
        else if (/\.css(\?|$)/.test(r.name)) css += n
        else if (/\.(webp|avif|png|jpg|jpeg|svg)(\?|$)/.test(r.name)) img += n
        else if (/\.(woff2?|ttf|otf)(\?|$)/.test(r.name)) font += n
      }
      // The HTML document itself is not a resource entry.
      total += nav.encodedBodySize || 0

      // One frame for the observers to flush.
      setTimeout(() => resolve({
        ttfb: nav.responseStart ?? 0,
        fcp,
        lcp,
        cls,
        domInteractive: nav.domInteractive ?? 0,
        html: nav.encodedBodySize ?? 0,
        js, css, img, font, total,
      }), 400)
    }))

    runs.push(m)
    await ctx.close()
  }

  const pick = (k) => median(runs.map((r) => r[k]))
  return Object.fromEntries(
    ['ttfb', 'fcp', 'lcp', 'cls', 'domInteractive', 'html', 'js', 'css', 'img', 'font', 'total']
      .map((k) => [k, pick(k)])
  )
}

const browser = await chromium.launch()
console.log(`${RUNS} cold runs each, Slow-4G + ${CPU_SLOWDOWN}x CPU throttle, median reported.\n`)

const react = await measure(browser, A)
const svelte = await measure(browser, B)
await browser.close()

const row = (label, a, b, fmt, lowerIsBetter = true) => {
  const pct = a === 0 ? (b === 0 ? 0 : 100) : ((b - a) / a) * 100
  const better = lowerIsBetter ? b < a : b > a
  const arrow = Math.abs(pct) < 2 ? '·' : better ? '▼' : '▲'
  console.log(
    label.padEnd(16) +
    fmt(a).padStart(10) + fmt(b).padStart(12) +
    `   ${arrow} ${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
  )
}

console.log(`${''.padEnd(16)}${'React'.padStart(10)}${'Svelte'.padStart(12)}   change`)
console.log('─'.repeat(56))
row('TTFB', react.ttfb, svelte.ttfb, ms)
row('FCP', react.fcp, svelte.fcp, ms)
row('LCP', react.lcp, svelte.lcp, ms)
row('DOM interactive', react.domInteractive, svelte.domInteractive, ms)
row('CLS', react.cls, svelte.cls, (n) => n.toFixed(3))
console.log('─'.repeat(56))
row('HTML', react.html, svelte.html, kb, false) // bigger HTML is the POINT here
row('JS', react.js, svelte.js, kb)
row('CSS', react.css, svelte.css, kb)
row('Fonts', react.font, svelte.font, kb)
row('Images', react.img, svelte.img, kb)
row('Total', react.total, svelte.total, kb)

console.log('\n▼ = Svelte better, ▲ = Svelte worse, · = within noise')
console.log('HTML is the one row where BIGGER is better: it is the content that')
console.log('arrives already rendered instead of being built by JS after load.')
