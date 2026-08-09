import { chromium } from 'playwright'
const OUT = '/private/tmp/claude-501/-Users-hideyourkids/85a104d2-b675-48e0-b958-7d4b5e66951a/scratchpad'
const b = await chromium.launch()
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  await p.goto('http://localhost:4930/', { waitUntil: 'load' })
  await p.waitForTimeout(2200)
  const grid = p.locator('.cnt-grid').first()
  await grid.scrollIntoViewIfNeeded()
  await p.waitForTimeout(2200)
  await grid.screenshot({ path: `${OUT}/cards-${w}.png` })
  console.log(w, 'ok', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
  await p.close()
}
await b.close()
