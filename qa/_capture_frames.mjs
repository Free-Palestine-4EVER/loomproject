import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://localhost:4941'
const WIDTH = Number(process.argv[3] || 1440)
const HEIGHT = Number(process.argv[4] || 900)
const OUT = process.argv[5] || '/tmp/frames'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } })
const page = await ctx.newPage()
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)

const pinInfo = await page.evaluate(() => {
  const pin = document.querySelector('.sol-pin')
  const rect = pin.getBoundingClientRect()
  return { height: pin.offsetHeight, scrollTopOfPin: window.scrollY + rect.top, innerHeight: window.innerHeight }
})
const total = pinInfo.height - pinInfo.innerHeight

// step 3 -> step 4 transition (arbitrary mid-tour pair), sample several points across the boundary
const idxFrom = 3, idxTo = 4
const bandStart = pinInfo.scrollTopOfPin + (idxFrom / 30) * total
const bandEnd = pinInfo.scrollTopOfPin + ((idxTo + 1) / 30) * total
const steps = 10
for (let i = 0; i <= steps; i++) {
  const y = bandStart + (i / steps) * (bandEnd - bandStart)
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await page.waitForTimeout(60)
  await page.screenshot({ path: `${OUT}/frame-${WIDTH}-${String(i).padStart(2, '0')}.png`, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } })
}
await browser.close()
