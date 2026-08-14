/**
 * TASKS.md #11 — Core Web Vitals baseline, logged so regressions are visible
 * later. This is NOT a Lighthouse run: Lighthouse is not an installed
 * dependency (`node_modules/lighthouse` does not exist, and this repo's
 * house rule is no new npm dependencies without asking — see
 * agents/technical-agent.md). `npx lighthouse` was tried and refused to run
 * without downloading the package, so it was not used. This script measures
 * everything Playwright/CDP can genuinely observe — TTFB, FCP, LCP, CLS,
 * transfer bytes, request count — and does NOT produce a Performance /
 * Accessibility / SEO / Best-Practices score, because those are Lighthouse's
 * own audits and a guessed number would be a fabrication.
 *
 *   node qa/webvitals-baseline.mjs <baseUrl> <label>
 *   node qa/webvitals-baseline.mjs https://www.loomstudio-jo.com production
 *   node qa/webvitals-baseline.mjs http://localhost:4941 local
 *
 * <baseUrl> must be a real, already-running origin — production as it is
 * live today, or a local `vite preview` (a real production build, not
 * `vite dev`, which ships unbundled modules and would flatter the numbers).
 *
 * Runs every route in ROUTES, mobile and desktop, RUNS times each, and
 * prints the median. Throttle profiles are Lighthouse's own published
 * default constants (mobile: Slow 4G / 4x CPU; desktop: 40ms RTT / 10Mbps /
 * 1x CPU) applied through CDP, so a number from this script is comparable to
 * a number from an actual Lighthouse run even though this script cannot
 * produce Lighthouse's category scores itself.
 */
import { chromium } from 'playwright'

const [, , BASE, LABEL] = process.argv
if (!BASE || !LABEL) {
  console.error('usage: node qa/webvitals-baseline.mjs <baseUrl> <label>')
  process.exit(1)
}

const RUNS = 3
const ROUTES = ['/', '/work', '/pricing', '/contact']

const PROFILES = {
  mobile: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    net: {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8, // Slow 4G, Lighthouse mobile preset
      uploadThroughput: (750 * 1024) / 8,
    },
    cpu: 4,
  },
  desktop: {
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    net: {
      offline: false,
      latency: 40,
      downloadThroughput: (10 * 1024 * 1024) / 8, // 10 Mbps, Lighthouse desktop preset
      uploadThroughput: (10 * 1024 * 1024) / 8,
    },
    cpu: 1,
  },
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
const ms = (n) => `${n.toFixed(0)}`
const kb = (n) => `${(n / 1024).toFixed(0)}`

async function measureOnce(browser, url, profile) {
  const ctx = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    deviceScaleFactor: profile.deviceScaleFactor,
  })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', profile.net)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu })

  let status = null
  page.once('response', (r) => { if (r.url() === url || r.url() === url + '/') status = r.status() })

  await page.goto(url, { waitUntil: 'load', timeout: 45000 })
  // LCP/CLS observers need buffered time to settle; matches qa/perf.mjs.
  await page.waitForTimeout(5000)

  const m = await page.evaluate(() => new Promise((resolve) => {
    const nav = performance.getEntriesByType('navigation')[0] || {}
    const fcp = performance.getEntriesByType('paint')
      .find((p) => p.name === 'first-contentful-paint')?.startTime ?? 0

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

    setTimeout(() => {
      const resources = performance.getEntriesByType('resource')
      let total = nav.encodedBodySize || 0
      for (const r of resources) total += r.encodedBodySize || 0
      resolve({
        ttfb: nav.responseStart ?? 0,
        fcp,
        lcp,
        cls,
        requests: resources.length + 1, // +1 for the document itself
        transferKB: total,
      })
    }, 400)
  }))

  await ctx.close()
  return { ...m, httpStatus: status }
}

async function measureRoute(browser, base, route, profileName) {
  const url = base.replace(/\/$/, '') + route
  const profile = PROFILES[profileName]
  const runs = []
  for (let i = 0; i < RUNS; i++) {
    runs.push(await measureOnce(browser, url, profile))
  }
  const pick = (k) => median(runs.map((r) => r[k]))
  return {
    route,
    profile: profileName,
    httpStatus: runs[0].httpStatus,
    ttfb: pick('ttfb'),
    fcp: pick('fcp'),
    lcp: pick('lcp'),
    cls: pick('cls'),
    requests: pick('requests'),
    transferKB: pick('transferKB'),
  }
}

const browser = await chromium.launch()
console.log(`# ${LABEL} — ${BASE}`)
console.log(`${RUNS} runs/route, median reported. Mobile = Slow-4G+4x CPU. Desktop = 40ms/10Mbps+1x CPU.\n`)
console.log('route'.padEnd(12) + 'profile'.padEnd(9) + 'http'.padEnd(6) + 'ttfb'.padEnd(7) + 'fcp'.padEnd(7) + 'lcp'.padEnd(7) + 'cls'.padEnd(8) + 'reqs'.padEnd(6) + 'KB')

const results = []
for (const route of ROUTES) {
  for (const profileName of ['mobile', 'desktop']) {
    const r = await measureRoute(browser, BASE, route, profileName)
    results.push(r)
    console.log(
      r.route.padEnd(12) +
      r.profile.padEnd(9) +
      String(r.httpStatus ?? '?').padEnd(6) +
      ms(r.ttfb).padEnd(7) +
      ms(r.fcp).padEnd(7) +
      ms(r.lcp).padEnd(7) +
      r.cls.toFixed(3).padEnd(8) +
      String(r.requests).padEnd(6) +
      kb(r.transferKB)
    )
  }
}
await browser.close()

console.log('\n--- JSON ---')
console.log(JSON.stringify({ label: LABEL, base: BASE, date: new Date().toISOString(), results }, null, 2))
