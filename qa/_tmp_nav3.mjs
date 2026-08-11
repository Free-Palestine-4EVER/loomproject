import { chromium } from 'playwright'

const BASE = 'http://localhost:4941'
const TABS = ['#work', '#solutions', '#pricing', '#the-machine', '#apps', '#contact']

const browser = await chromium.launch()
const results = {}

for (const hash of TABS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  const link = page.locator(`.nav-links a[href="${hash}"]`).first()
  await link.scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => window.scrollY)
  await link.click({ force: true })

  // poll until scrollY stabilizes (or times out)
  let y = before
  let stableCount = 0
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150)
    const ny = await page.evaluate(() => window.scrollY)
    if (Math.abs(ny - y) < 1) {
      stableCount++
      if (stableCount >= 3) break
    } else {
      stableCount = 0
    }
    y = ny
  }
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
}

await browser.close()
console.log(JSON.stringify(results, null, 2))
