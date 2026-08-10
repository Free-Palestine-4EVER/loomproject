// One-off QA for the restored #apps scroll-driven stage. Run from repo root:
//   node qa-apps-stage.mjs
import { chromium } from 'playwright'

const BASE = 'http://localhost:4931'
const SHOT_DIR = '/private/tmp/claude-501/-Users-hideyourkids/9286c1c2-28e6-4a23-bfc5-cac391db1070/scratchpad'

async function main() {
  const browser = await chromium.launch()
  const results = {}
  const skipForgePopup = (ctx) => ctx.addInitScript(() => {
    try { window.localStorage.setItem('loom.forge.popup.seen.v1', '1') } catch { /* ignore */ }
  })

  // ——— 1440 desktop pass ———
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await skipForgePopup(ctx)
    const page = await ctx.newPage()
    const consoleErrors = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('pageerror', (e) => consoleErrors.push(String(e)))
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // scroll to #apps top
    await page.evaluate(() => {
      const el = document.getElementById('apps')
      const y = el.getBoundingClientRect().top + window.scrollY
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
      else window.scrollTo(0, y)
    })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${SHOT_DIR}/apps-1440-start.png` })

    // walk through the section, capturing which product is featured, at N points
    const wrapInfo = await page.evaluate(() => {
      const wrap = document.querySelector('.stg-scroll')
      return wrap ? { top: wrap.getBoundingClientRect().top + window.scrollY, h: wrap.offsetHeight } : null
    })
    results.wrapInfo = wrapInfo

    const seenNames = new Set()
    const positions = [0, 0.2, 0.4, 0.6, 0.8, 1]
    for (const [idx, f] of positions.entries()) {
      const y = wrapInfo.top + f * (wrapInfo.h - 900)
      await page.evaluate((yy) => {
        if (window.__lenis) window.__lenis.scrollTo(yy, { immediate: true })
        else window.scrollTo(0, yy)
      }, y)
      await page.waitForTimeout(300)
      const name = await page.evaluate(() => document.querySelector('.stg-info h3')?.textContent)
      seenNames.add(name)
      await page.screenshot({ path: `${SHOT_DIR}/apps-1440-scroll-${idx}.png` })
    }
    results.seenNames1440 = [...seenNames]

    // image load check across all six via rail clicks. Clicking a rail tab
    // while the section is pinned scrolls the page (Lenis, animated) rather
    // than setting state directly — the featured product only updates once
    // the scroll-linked driver reads the new position — so this waits for
    // the NAME to actually change before reading the image, not just for
    // whatever image happens to be in the DOM at click time.
    const rail = await page.$$('.stg-rail button')
    results.railCount = rail.length
    const expectedNames = await page.$$eval('.stg-rail .p-sr-only', (els) => els.map((e) => e.textContent))
    const imgStates = []
    for (let n = 0; n < rail.length; n++) {
      await rail[n].click()
      await page.waitForFunction((want) => document.querySelector('.stg-info h3')?.textContent === want, expectedNames[n], { timeout: 4000 }).catch(() => {})
      await page.waitForFunction(() => {
        const img = document.querySelector('.stg-phone img:not(.stg-frame), .stg-wide img')
        return img && img.complete && img.naturalWidth > 0
      }, { timeout: 5000 }).catch(() => {})
      const state = await page.evaluate(() => {
        const img = document.querySelector('.stg-phone img:not(.stg-frame), .stg-wide img')
        const name = document.querySelector('.stg-info h3')?.textContent
        const href = document.querySelector('.stg-open')?.getAttribute('href') || null
        return {
          name,
          href,
          complete: img ? img.complete : null,
          naturalWidth: img ? img.naturalWidth : null,
        }
      })
      imgStates.push(state)
    }
    results.imgStates = imgStates

    // link check: only Quran Noor should have a real anchor — derived from
    // imgStates above (href is captured per selected item there)
    results.hrefByProduct = Object.fromEntries(imgStates.map((s) => [s.name, s.href]))

    results.consoleErrors1440 = consoleErrors
    results.scrollWidth1440 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))

    // fps measurement: entirely in-page (no CDP round trips during the
    // measurement window itself) — a rAF frame counter runs alongside a
    // burst of synthetic wheel events that drive Lenis's own scroll physics
    // through the section, which is how a real visitor scrolls it.
    await page.evaluate((yy) => { if (window.__lenis) window.__lenis.scrollTo(yy, { immediate: true }); else window.scrollTo(0, yy) }, wrapInfo.top)
    await page.waitForTimeout(300)
    const fps = await page.evaluate(async (wrap) => {
      const DURATION = 3000
      let frames = 0
      const frameTimes = []
      let last = performance.now()
      let running = true
      function loop(t) {
        frames++
        frameTimes.push(t - last)
        last = t
        if (running) requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
      const wheelTimer = setInterval(() => {
        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 90, bubbles: true, cancelable: true }))
      }, 16)
      const start = performance.now()
      await new Promise((r) => setTimeout(r, DURATION))
      clearInterval(wheelTimer)
      running = false
      const dur = performance.now() - start
      const sorted = [...frameTimes].sort((a, b) => a - b)
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0
      return { frames, durMs: dur, fps: frames / (dur / 1000), worstFrameMs: Math.max(...frameTimes), p95FrameMs: p95 }
    }, wrapInfo)
    results.fps1440 = fps
    results.hostLoadNote = 'measured on a shared dev machine with other agents/processes running concurrently — see `uptime`/`top` alongside this number'

    await ctx.close()
  }

  // ——— 390 mobile pass ———
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await skipForgePopup(ctx)
    const page = await ctx.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      const el = document.getElementById('apps')
      const y = el.getBoundingClientRect().top + window.scrollY
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
      else window.scrollTo(0, y)
    })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SHOT_DIR}/apps-390-start.png` })
    const wrapInfo = await page.evaluate(() => {
      const wrap = document.querySelector('.stg-scroll')
      return wrap ? { top: wrap.getBoundingClientRect().top + window.scrollY, h: wrap.offsetHeight } : null
    })
    for (const [idx, f] of [0, 0.3, 0.6, 1].entries()) {
      const y = wrapInfo.top + f * (wrapInfo.h - 844)
      await page.evaluate((yy) => { if (window.__lenis) window.__lenis.scrollTo(yy, { immediate: true }); else window.scrollTo(0, yy) }, y)
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${SHOT_DIR}/apps-390-scroll-${idx}.png` })
    }
    results.scrollWidth390 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    await ctx.close()
  }

  // ——— reduced motion pass ———
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    await skipForgePopup(ctx)
    const page = await ctx.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      document.getElementById('apps').scrollIntoView()
    })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SHOT_DIR}/apps-reduced-motion.png` })
    results.reducedMotionHasLenis = await page.evaluate(() => !!window.__lenis)
    results.reducedMotionHasImage = await page.evaluate(() => {
      const img = document.querySelector('.stg-phone img:not(.stg-frame), .stg-wide img')
      return img ? { complete: img.complete, naturalWidth: img.naturalWidth } : null
    })
    await ctx.close()
  }

  // ——— section byte weight: reload and sum transfer sizes for images/css tied to #apps ———
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await skipForgePopup(ctx)
    const page = await ctx.newPage()
    const reqs = []
    page.on('response', async (res) => {
      const url = res.url()
      if (/\/img\/suite\/|\/img\/devices\/iphone-frame|products-stage/.test(url)) {
        try {
          const buf = await res.body()
          reqs.push({ url, bytes: buf.length })
        } catch { /* ignore */ }
      }
    })
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.getElementById('apps').scrollIntoView())
    await page.waitForTimeout(1500)
    // click through all rail tabs to force every image to load
    const rail = await page.$$('.stg-rail button')
    for (const btn of rail) { await btn.click(); await page.waitForTimeout(200) }
    results.byteWeight = reqs
    results.byteWeightTotal = reqs.reduce((a, r) => a + r.bytes, 0)
    await ctx.close()
  }

  await browser.close()
  console.log(JSON.stringify(results, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
