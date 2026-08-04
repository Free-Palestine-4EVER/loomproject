// Probe: measure overlap of the Flyer butterfly and the WhatsAppFab against
// every visible text element, at three breakpoints, scrolling in steps.
//
// Written against GENERIC selectors only (p, h1-h4, li, button, a) — the
// page's section markup is being rewritten by other agents concurrently, so
// this must not depend on any component's class names.
//
// The butterfly's DOM element (a position:fixed; inset:0 canvas) always
// covers the whole viewport — its getBoundingClientRect() is meaningless for
// overlap. Flyer.jsx exposes window.__loomFlyerBBox = {left,top,right,bottom,
// opacity}, the actual projected on-screen box of the 3D model, updated every
// frame. We use that instead, and only count an overlap as a real offender
// when opacity is above a "clearly visible" threshold — a translucent/ducked
// butterfly is not the bug the ticket describes.
//
// The FAB is measured by its own real DOM rect (it's a real, appropriately
// sized fixed element, not a full-viewport canvas), tagged with whether
// WhatsAppFab.jsx currently has it in its shrunk `is-ducking` state.
import { chromium } from 'playwright'

const URL = 'http://localhost:4930/'
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '900', width: 900, height: 900 },
  { name: '390', width: 390, height: 844 },
]
const OPACITY_VISIBLE_THRESHOLD = 0.5 // above this, the butterfly reads as "clearly there"
const TEXT_SELECTOR = 'p, h1, h2, h3, h4, li, button, a'

function rectsIntersect(a, b) {
  if (!a || !b) return null
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.right, b.right)
  const bottom = Math.min(a.bottom, b.bottom)
  if (right <= left || bottom <= top) return null
  return { left, top, right, bottom, area: (right - left) * (bottom - top) }
}

async function waitForFlyer(page, timeout = 12000) {
  try {
    await page.waitForFunction(() => !!window.__loomFlyerBBox, null, { timeout })
    return true
  } catch {
    return false
  }
}

async function measureStep(page, label) {
  // Force the butterfly to actually move/advance and let the duck checks run.
  await page.mouse.wheel(0, 1) // nudge scroll listener (Flyer/FAB don't need it, but harmless)
  // > both duck-check intervals (130ms / 160ms), long enough for the FAB's
  // 0.4s spring shrink to fully settle, AND long enough for any scroll-
  // triggered card reveal animation nearby to finish — a mid-transition read
  // would blame the fix for a transition frame, not for its resting state.
  await page.waitForTimeout(1100)

  const data = await page.evaluate((sel) => {
    const flyer = window.__loomFlyerBBox || null
    const fab = document.querySelector('.wa-fab')
    const fabRect = fab ? fab.getBoundingClientRect() : null
    const fabDucking = fab ? fab.classList.contains('is-ducking') : false
    const fabVisible = fab ? getComputedStyle(fab).pointerEvents !== 'none' : false

    // Same refinement the fix itself uses: a card is routinely one <button>
    // wrapping an image + a headline strip, and the button's own
    // getBoundingClientRect() covers the image too. A floater's bbox meeting
    // a screenshot thumbnail inside a card is not "covering copy" — so this
    // measures actual rendered TEXT GLYPHS (via Range.getClientRects() on
    // every non-whitespace text node), not each candidate element's own box.
    const texts = []
    document.querySelectorAll(sel).forEach((el) => {
      if (el.closest('.flyer-layer, .wa-fab-stack')) return
      const text = (el.textContent || '').trim()
      if (text.length < 3) return
      const outer = el.getBoundingClientRect()
      if (outer.width <= 0 || outer.height <= 0) return
      if (outer.bottom <= 0 || outer.top >= innerHeight || outer.right <= 0 || outer.left >= innerWidth) return
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.nodeValue && n.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
      })
      const range = document.createRange()
      let node
      while ((node = walker.nextNode())) {
        range.selectNodeContents(node)
        const list = range.getClientRects()
        for (let i = 0; i < list.length; i++) {
          const r = list[i]
          if (r.width <= 0 || r.height <= 0) continue
          if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue
          texts.push({
            tag: el.tagName.toLowerCase(),
            text: text.slice(0, 60),
            rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
          })
        }
      }
    })
    return {
      flyer,
      fab: fab ? { rect: fabRect, ducking: fabDucking, visible: fabVisible } : null,
      texts,
      scrollY: window.scrollY,
    }
  }, TEXT_SELECTOR)

  const offenders = { label, scrollY: data.scrollY, flyer: [], fab: [] }

  if (data.flyer && data.flyer.opacity > OPACITY_VISIBLE_THRESHOLD) {
    for (const t of data.texts) {
      const hit = rectsIntersect(data.flyer, t.rect)
      if (hit) offenders.flyer.push({ tag: t.tag, text: t.text, area: Math.round(hit.area), opacity: data.flyer.opacity })
    }
  }

  if (data.fab && data.fab.visible) {
    for (const t of data.texts) {
      const hit = rectsIntersect(data.fab.rect, t.rect)
      if (hit) offenders.fab.push({ tag: t.tag, text: t.text, area: Math.round(hit.area), ducking: data.fab.ducking })
    }
  }

  return offenders
}

async function run() {
  const browser = await chromium.launch({ args: ['--disable-gpu'] })
  const results = []

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
    await page.goto(URL, { waitUntil: 'networkidle' })

    // Kick the Flyer's idle/scroll boot, then wait for it to actually mount.
    await page.mouse.wheel(0, 200)
    await page.mouse.wheel(0, -200)
    const flyerReady = await waitForFlyer(page)

    const full = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
    const steps = 14
    for (let i = 0; i <= steps; i++) {
      const y = Math.round((full * i) / steps)
      await page.evaluate((yy) => window.scrollTo(0, yy), y)
      const offenders = await measureStep(page, `${vp.name}px @ scroll ${y}`)
      offenders.flyerReady = flyerReady
      results.push({ viewport: vp.name, ...offenders })
    }
    await page.close()
  }

  await browser.close()

  const flyerOffenders = results.flatMap((r) =>
    r.flyer.map((f) => ({ viewport: r.viewport, scrollY: r.scrollY, ...f })))
  const fabOffenders = results.flatMap((r) =>
    r.fab.map((f) => ({ viewport: r.viewport, scrollY: r.scrollY, ...f })))

  console.log('\n=== FLYER (butterfly) offenders — visible-opacity overlap with running text ===')
  console.log('count:', flyerOffenders.length)
  flyerOffenders
    .sort((a, b) => b.area - a.area)
    .slice(0, 15)
    .forEach((o) => console.log(`  [${o.viewport}px @y=${o.scrollY}] area=${o.area}px² opacity=${o.opacity.toFixed(2)} <${o.tag}> "${o.text}"`))

  console.log('\n=== FAB (WhatsApp button) offenders — overlap with running text ===')
  console.log('count:', fabOffenders.length)
  fabOffenders
    .sort((a, b) => b.area - a.area)
    .slice(0, 15)
    .forEach((o) => console.log(`  [${o.viewport}px @y=${o.scrollY}] area=${o.area}px² ducking=${o.ducking} <${o.tag}> "${o.text}"`))

  const flyerReadyAny = results.some((r) => r.flyerReady)
  console.log('\nflyer mounted at least once:', flyerReadyAny)
  console.log('\nJSON:', JSON.stringify({ flyerOffenders, fabOffenders }, null, 0))
}

run().catch((e) => { console.error(e); process.exit(1) })
