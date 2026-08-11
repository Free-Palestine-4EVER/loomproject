import { chromium } from 'playwright'

const BASE = 'http://localhost:4945'
const TABS = ['#work', '#solutions', '#pricing', '#the-machine', '#apps', '#contact']

const browser = await chromium.launch()
const results = {}

for (const hash of TABS) {
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(3000)

    const link = page.locator(`.nav-links a[href="${hash}"]`).first()
    await link.waitFor({ state: 'visible', timeout: 15000 })
    const before = await page.evaluate(() => window.scrollY)
    await link.click({ force: true, timeout: 15000 })
    await page.waitForTimeout(12000) // generous settle: full smooth-scroll + all lazy content loaded
    const after = await page.evaluate(() => window.scrollY)

    const info = await page.evaluate((h) => {
      const el = document.querySelector(h)
      if (!el) return { error: 'no element' }
      const r = el.getBoundingClientRect()
      const heading = el.querySelector('h1,h2,h3')
      const hr = heading ? heading.getBoundingClientRect() : null
      return {
        sectionTop: r.top,
        headingTag: heading?.tagName,
        headingTop: hr?.top,
        headingText: heading?.textContent?.trim().slice(0, 60),
      }
    }, hash)
    results[hash] = { ...info, scrollBefore: before, scrollAfter: after }
    await ctx.close()
  } catch (e) {
    results[hash] = { error: String(e.message || e) }
  }
}

await browser.close()
console.log(JSON.stringify(results, null, 2))
