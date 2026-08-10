// Verifies the hero WebGL fallback: normal WebGL, forced no-WebGL,
// prefers-reduced-motion, and mobile. Run with:
//   export PATH="$HOME/.local/node/bin:$PATH"
//   node qa-hero-fallback.mjs
import { chromium } from 'playwright'

// :4931 (npm run preview, the real bundled dist/) rather than :4930's dev
// server — the dev server transforms ~480 unbundled ES modules on a cold
// request and, under concurrent edits from other agents, keeps invalidating
// that cache mid-session, which was measured making the WebGL planet look
// "missing" at a normal 3-5s wait for reasons having nothing to do with
// WebGL support. The preview server serves the same dist/ a real visitor
// gets, with none of that variance.
const URL = 'http://localhost:4931/'
const OUT = '/private/tmp/claude-501/-Users-hideyourkids/9286c1c2-28e6-4a23-bfc5-cac391db1070/scratchpad'

async function settle(page, ms = 3000) {
  await page.waitForTimeout(ms)
}

async function report(page, label) {
  const info = await page.evaluate(() => {
    const c = document.querySelector('.hero-canvas')
    const sp = document.querySelector('.hero-static-planet')
    const mp = document.querySelector('.hero-mobile-planet')
    const flyerCanvas = document.querySelector('.flyer-layer canvas')
    const rect = (el) => el ? el.getBoundingClientRect() : null
    let webgl2 = null, webgl = null
    try {
      const test = document.createElement('canvas')
      webgl2 = !!test.getContext('webgl2')
      webgl = !!test.getContext('webgl')
    } catch (e) {}
    return {
      webgl2, webgl,
      heroCanvas: c ? { display: getComputedStyle(c).display, w: c.width, h: c.height, rect: rect(c) } : null,
      staticPlanet: sp ? { display: getComputedStyle(sp).display, visible: sp.classList.contains('is-visible') } : null,
      mobilePlanet: mp ? { display: getComputedStyle(mp).display } : null,
      flyerLayer: !!document.querySelector('.flyer-layer'),
      flyerCanvasDisplay: flyerCanvas ? getComputedStyle(flyerCanvas).display : null,
    }
  })
  console.log(`\n── ${label} ──`)
  console.log(JSON.stringify(info, null, 2))
}

async function run() {
  // (a) normal WebGL visitor, desktop
  {
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(URL, { waitUntil: 'load' })
    await settle(page, 5500)
    await report(page, 'a) normal WebGL, desktop 1440')
    await page.screenshot({ path: `${OUT}/hero-a-normal-webgl.png` })
    await browser.close()
  }

  // (b) WebGL forcibly disabled — init script nulls getContext for webgl*
  {
    const browser = await chromium.launch({
      args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-webgl', '--disable-webgl2'],
    })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (typeof type === 'string' && type.toLowerCase().includes('webgl')) return null
        return orig.call(this, type, ...args)
      }
    })
    await page.goto(URL, { waitUntil: 'load' })
    await settle(page, 3500)
    await report(page, 'b) WebGL forcibly disabled, desktop 1440')
    await page.screenshot({ path: `${OUT}/hero-b-no-webgl.png` })
    await browser.close()
  }

  // (c) prefers-reduced-motion: reduce
  {
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    await page.goto(URL, { waitUntil: 'load' })
    await settle(page, 3500)
    await report(page, 'c) prefers-reduced-motion: reduce, desktop 1440')
    await page.screenshot({ path: `${OUT}/hero-c-reduced-motion.png` })
    await browser.close()
  }

  // (d) mobile 390px, normal WebGL
  {
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    await page.goto(URL, { waitUntil: 'load' })
    await settle(page, 3500)
    await report(page, 'd) mobile 390px, normal WebGL')
    await page.screenshot({ path: `${OUT}/hero-d-mobile.png` })
    await browser.close()
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
