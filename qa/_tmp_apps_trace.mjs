import { chromium } from 'playwright'

const BASE = 'http://localhost:4945'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

const link = page.locator('.nav-links a[href="#apps"]').first()
await link.click({ force: true })

const trace = []
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(200)
  const y = await page.evaluate(() => window.scrollY)
  trace.push(y)
}
console.log('trace:', trace.join(','))

const final = await page.evaluate(() => {
  const el = document.querySelector('#apps')
  const r = el.getBoundingClientRect()
  const h = el.querySelector('h1,h2,h3')
  const hr = h ? h.getBoundingClientRect() : null
  const wrap = document.querySelector('.stg-wrap, .apps .stg-scroll') || null
  return {
    sectionTop: r.top, sectionHeight: r.height,
    headingTop: hr?.top,
    scrollY: window.scrollY,
    docHeight: document.documentElement.scrollHeight,
    innerH: window.innerHeight,
  }
})
console.log('final:', JSON.stringify(final, null, 2))
await page.screenshot({ path: 'qa/shots/_apps_final.png', fullPage: false })
await browser.close()
