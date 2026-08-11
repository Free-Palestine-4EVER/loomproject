import { chromium } from 'playwright'

const BASE = 'http://localhost:4945'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

for (const hash of ['#pricing', '#apps']) {
  const link = page.locator(`.nav-links a[href="${hash}"]`).first()
  await link.click()
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `qa/shots/_nav_${hash.slice(1)}.png` })

  const info = await page.evaluate((h) => {
    const el = document.querySelector(h)
    const r = el.getBoundingClientRect()
    const heading = el.querySelector('h1,h2,h3')
    const hr = heading ? heading.getBoundingClientRect() : null
    const cs = getComputedStyle(el)
    return { sectionTop: r.top, scrollMarginTop: cs.scrollMarginTop, headingTag: heading?.tagName, headingTop: hr?.top, headingText: heading?.textContent?.trim().slice(0,60) }
  }, hash)
  console.log(hash, JSON.stringify(info))
}

await browser.close()
