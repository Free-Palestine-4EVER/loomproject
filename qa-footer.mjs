import { chromium } from 'playwright'

const URL = process.env.URL || "http://localhost:4930/"
const OUT = '/private/tmp/claude-501/-Users-hideyourkids/85a104d2-b675-48e0-b958-7d4b5e66951a/scratchpad'
const SIZES = [[1600, 900], [1440, 900], [1024, 1180], [820, 1180], [390, 844]]

const b = await chromium.launch()
for (const [w, h] of SIZES) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  await p.goto(URL, { waitUntil: 'load' })
  await p.waitForTimeout(2500)
  await p.evaluate(() => {
    const y = document.body.scrollHeight
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
  })
  await p.waitForTimeout(2500)
  await p.evaluate(() => {
    const y = document.body.scrollHeight
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
  })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => ({
    hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    petals: document.querySelectorAll('.foot-petals span').length,
    cta: !!document.querySelector('.foot-cta'),
    links: document.querySelectorAll('.foot-col a').length,
  }))
  console.log(w, JSON.stringify(info), errs.length ? errs : '')
  await p.locator('footer.footer--bloom').screenshot({ path: `${OUT}/footer-${w}.png` })
  await p.close()
}
await b.close()
