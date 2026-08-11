import { chromium } from 'playwright'

const BASE = 'http://localhost:4945'
const HASH_TABS = ['#work', '#solutions', '#pricing', '#the-machine', '#aeo', '#apps', '#mcp', '#faq', '#contact']

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const results = {}

for (const hash of HASH_TABS) {
  // find the nav link with this href among visible nav-links (desktop)
  const link = page.locator(`.nav-links a[href="${hash}"]`).first()
  const count = await link.count()
  if (count === 0) {
    results[hash] = { error: 'nav link not found in .nav-links' }
    continue
  }
  try {
    await link.click({ timeout: 5000 })
  } catch (e) {
    results[hash] = { error: 'click failed: ' + e.message }
    continue
  }
  await page.waitForTimeout(1200) // smooth scroll settle
  // wait for scroll to stop
  let lastY = -1
  for (let i = 0; i < 20; i++) {
    const y = await page.evaluate(() => window.scrollY)
    if (y === lastY) break
    lastY = y
    await page.waitForTimeout(150)
  }

  const rect = await page.evaluate((h) => {
    const el = document.querySelector(h)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, height: r.height }
  }, hash)

  // check nothing tucked under sticky header: find header height
  const headerH = await page.evaluate(() => {
    const nav = document.querySelector('header') || document.querySelector('nav')
    return nav ? nav.getBoundingClientRect().height : null
  })

  results[hash] = { rect, headerH, scrollY: lastY }
}

await browser.close()
console.log(JSON.stringify(results, null, 2))
