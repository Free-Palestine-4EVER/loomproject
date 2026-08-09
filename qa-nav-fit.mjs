// Measures the gap between the last visible nav tab and the "Get started"
// pill across the desktop range. Anything <= 0 is an overlap; the pill is
// drawn over the tabs, so an overlap is invisible in code and obvious only in
// a screenshot at exactly the wrong width.
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:4930'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 900 } })
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)

for (let w = 1100; w <= 1920; w += 40) {
  await page.setViewportSize({ width: w, height: 900 })
  await page.waitForTimeout(160)
  const r = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.nav-links a')]
      .filter((a) => getComputedStyle(a).display !== 'none')
    const cta = document.querySelector('.nav-cta')
    if (!links.length || !cta) return null
    const last = links[links.length - 1].getBoundingClientRect()
    return { n: links.length, gap: Math.round(cta.getBoundingClientRect().left - last.right) }
  })
  console.log(`${w}px  tabs:${String(r.n).padStart(2)}  gap:${String(r.gap).padStart(5)}px  ${r.gap <= 8 ? '❌' : '✅'}`)
}

await browser.close()
