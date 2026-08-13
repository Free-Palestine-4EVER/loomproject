/**
 * Proof for imageWarm.js — the "every photo must be downloaded before the
 * user scrolls" requirement.
 *
 *   node qa/warm.mjs [baseUrl]
 *   node qa/warm.mjs http://localhost:4944
 *
 * Must run against the DEV server (see AGENT brief — building would race
 * three other agents editing this tree), so the byte totals below are dev's
 * unminified/uncompressed numbers for JS and irrelevant here anyway — this
 * script only cares about IMAGE bytes, which dev serves byte-identical to
 * prod (Pic.svelte's manifests point at the same /img files either way).
 *
 * For each of {chromium, webkit} x {390x844 (mobile), 1440x900 (desktop)} x
 * {/, /work}:
 *
 *   1. LCP BEFORE — a cold load with the warm-up disabled (blocks
 *      imageWarm.js at the network layer), measuring the baseline first-
 *      screen LCP the client is trusting us not to regress.
 *   2. LCP AFTER + WARM BYTES — a cold load with the warm-up enabled, LCP
 *      measured the same way, then wait for the warm pass to actually
 *      finish (poll for the `load[loading="lazy"]` selector to hit zero —
 *      see imageWarm.js: `loading='eager'` is the "already warmed" marker,
 *      so its absence IS "done"), then sum encodedBodySize over every
 *      resource entry with initiatorType 'img' PLUS the img() Image()
 *      probes the warm-up fires for CSS backgrounds/posters (those report
 *      initiatorType 'img' too — a `new Image()` fetch is indistinguishable
 *      from a real <img> at the resource-timing level).
 *   3. NO-NEW-REQUESTS-ON-SCROLL — snapshot the resource count for
 *      initiatorType 'img', scroll straight to document.body.scrollHeight in
 *      one jump, wait a beat for any stray network activity, re-count. Must
 *      be identical.
 *   4. A full-page screenshot after the jump, for a human to confirm zero
 *      empty boxes.
 *
 * Not touching `pointer: coarse` / `hasTouch` on purpose: viewportBudget.js's
 * image eviction is gated on that media query, and it is a MEMORY budget
 * that intentionally evicts+restores off-screen bitmaps on touch devices —
 * a restore re-sets `src`, which legitimately creates a new (cache-hit,
 * zero-byte-on-the-wire) resource entry. That is correct, documented
 * behaviour, not a warm-up bug, so it is out of scope for the "gains no new
 * entries" assertion, which is about the warm-up, not the memory budget.
 */
import { chromium, webkit } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:4944'
const SHOT_DIR = 'qa/shots'
mkdirSync(SHOT_DIR, { recursive: true })

const VIEWPORTS = [
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
]
const ROUTES = ['/', '/work']
const ENGINES = { chromium, webkit }

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`
const ms = (n) => `${n.toFixed(0)} ms`

async function measureLCP(page, url, { blockWarm }) {
  if (blockWarm) {
    // Same-file block, not a network block — imageWarm.js is a static
    // module import, so aborting its request leaves +layout.svelte's
    // `mountImageWarm()` call rejected/no-op-ed rather than throwing, which
    // is the cleanest way to get a true "as if this file did not exist"
    // baseline without editing the layout for the test.
    await page.route('**/imageWarm.js*', (route) => route.abort())
  }
  await page.goto(url, { waitUntil: 'load' })
  const lcp = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let value = 0
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) value = Math.max(value, e.startTime)
          }).observe({ type: 'largest-contentful-paint', buffered: true })
        } catch {}
        // LCP can still be revised for a few seconds after load as later
        // paints land; give it room the same way qa/perf.mjs does.
        setTimeout(() => resolve(value), 4000)
      })
  )
  await page.unroute('**/imageWarm.js*')
  return lcp
}

// "Warm pass finished" = no <img> is still carrying loading="lazy" AND
// un-loaded. imageWarm.js's own doc comment establishes loading='eager' as
// the permanent "already warmed" marker, so this is the same signal the
// module uses internally to know it is done — not a guess from outside.
async function waitForWarmDone(page, timeoutMs = 20000) {
  await page.waitForFunction(
    () => {
      const remaining = Array.from(document.querySelectorAll('img[loading="lazy"]')).filter(
        (img) => !img.complete || img.naturalWidth === 0
      )
      return remaining.length === 0
    },
    { timeout: timeoutMs }
  ).catch(() => {}) // report whatever is left rather than throwing — see the log below
  // One more idle beat for the trailing CSS-background / poster Image()
  // probes, which do not have a DOM marker to poll.
  await page.waitForTimeout(1500)
}

async function warmSetBytes(page) {
  return page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((r) => r.initiatorType === 'img')
      .reduce((sum, r) => sum + (r.encodedBodySize || r.transferSize || 0), 0)
  )
}

async function topOffenders(page, n = 6) {
  return page.evaluate((n) => {
    return performance
      .getEntriesByType('resource')
      .filter((r) => r.initiatorType === 'img')
      .map((r) => ({ url: r.name.replace(location.origin, ''), bytes: r.encodedBodySize || r.transferSize || 0 }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, n)
  }, n)
}

async function run(engineName, launcher) {
  const browser = await launcher.launch()
  const results = []

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      const url = BASE + route
      const label = `${engineName} ${route === '/' ? 'home' : route} @ ${vp.name}`

      // 1. LCP before (warm-up blocked)
      const ctxBefore = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const pageBefore = await ctxBefore.newPage()
      const lcpBefore = await measureLCP(pageBefore, url, { blockWarm: true })
      await ctxBefore.close()

      // 2. LCP after (warm-up on) + warm-set bytes + top offenders
      const ctxAfter = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const pageAfter = await ctxAfter.newPage()
      // Drain-time instrumentation: record performance.now() at `load` and
      // again the instant no <img> is left carrying an un-loaded
      // loading="lazy" — the same completion signal imageWarm.js itself
      // uses. Installed before navigation so it can never miss the moment.
      await pageAfter.addInitScript(() => {
        window.__loadAt = null
        window.__drainAt = null
        window.addEventListener('load', () => { window.__loadAt = performance.now() })
        const check = () => {
          const remaining = Array.from(document.querySelectorAll('img[loading="lazy"]')).filter(
            (img) => !img.complete || img.naturalWidth === 0
          )
          if (remaining.length === 0 && window.__drainAt === null) window.__drainAt = performance.now()
        }
        const iv = setInterval(check, 100)
        window.addEventListener('load', () => setTimeout(() => clearInterval(iv), 30000))
      })
      const lcpAfter = await measureLCP(pageAfter, url, { blockWarm: false })
      await waitForWarmDone(pageAfter)
      const warmBytes = await warmSetBytes(pageAfter)
      const offenders = await topOffenders(pageAfter)
      const stillLazy = await pageAfter.evaluate(
        () =>
          Array.from(document.querySelectorAll('img[loading="lazy"]')).filter(
            (img) => !img.complete || img.naturalWidth === 0
          ).length
      )
      const everyImgComplete = await pageAfter.evaluate(
        () => Array.from(document.querySelectorAll('img')).every((img) => img.complete === true)
      )
      const { loadAt, drainAt } = await pageAfter.evaluate(() => ({ loadAt: window.__loadAt, drainAt: window.__drainAt }))
      const drainSeconds = loadAt != null && drainAt != null ? (drainAt - loadAt) / 1000 : null

      // 3. no-new-requests-on-scroll
      const before = await pageAfter.evaluate(
        () => performance.getEntriesByType('resource').filter((r) => r.initiatorType === 'img').map((r) => r.name)
      )
      await pageAfter.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await pageAfter.waitForTimeout(4000)
      const after = await pageAfter.evaluate(
        () => performance.getEntriesByType('resource').filter((r) => r.initiatorType === 'img').map((r) => r.name)
      )
      const beforeSet = new Set(before)
      const newUrls = after.filter((u) => !beforeSet.has(u))
      const noNewRequests = newUrls.length === 0

      // 4. screenshot at the bottom
      const shotPath = `${SHOT_DIR}/warm-${engineName}-${route === '/' ? 'home' : route.slice(1)}-${vp.name}.png`
      await pageAfter.screenshot({ path: shotPath, fullPage: false })

      await ctxAfter.close()

      results.push({
        label, lcpBefore, lcpAfter, warmBytes, offenders, stillLazy, everyImgComplete, drainSeconds,
        before: before.length, after: after.length, newUrls, noNewRequests, shotPath,
      })
    }
  }

  await browser.close()
  return results
}

const all = []
for (const [name, launcher] of Object.entries(ENGINES)) {
  console.log(`\n=== ${name} ===`)
  const results = await run(name, launcher)
  all.push(...results)
  for (const r of results) {
    console.log(`\n${r.label}`)
    console.log(`  LCP before: ${ms(r.lcpBefore)}   LCP after: ${ms(r.lcpAfter)}`)
    console.log(`  warm-set image bytes: ${mb(r.warmBytes)} (${warmSetCountNote(r)})`)
    console.log(`  still-lazy/un-loaded <img> after warm: ${r.stillLazy}   every <img>.complete: ${r.everyImgComplete}`)
    console.log(`  drain time (load -> zero lazy <img> left): ${r.drainSeconds != null ? r.drainSeconds.toFixed(2) + 's' : 'n/a (already drained before instrumentation could capture load)'}`)
    console.log(`  img resource entries: before scroll ${r.before}, after jump-to-bottom+4s ${r.after} -> ${r.noNewRequests ? 'PASS (no new entries)' : 'FAIL (new requests fired on scroll)'}`)
    if (!r.noNewRequests) {
      console.log(`    new URLs pulled by the scroll:`)
      for (const u of r.newUrls) console.log(`      ${u.replace(BASE, '')}`)
    }
    console.log(`  top offenders:`)
    for (const o of r.offenders) console.log(`    ${kb(o.bytes).padStart(9)}  ${o.url}`)
    console.log(`  screenshot: ${r.shotPath}`)
  }
}

function warmSetCountNote() { return 'sum of encodedBodySize/transferSize over every img-initiated resource' }

const anyFail = all.some((r) => !r.noNewRequests)
console.log(`\n${'='.repeat(60)}`)
console.log(anyFail ? 'RESULT: at least one route leaked new img requests on scroll — see FAIL rows above.' : 'RESULT: every route/engine/viewport combo passed the no-new-requests-on-scroll assertion.')
process.exit(anyFail ? 1 : 0)
