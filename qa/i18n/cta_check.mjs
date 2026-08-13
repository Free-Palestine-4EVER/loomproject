import { chromium } from 'playwright'
const BASE = 'http://localhost:4955'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(BASE + '/ar', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

const waLabel = await page.locator('.wa-fab__label').textContent()
const waAria = await page.locator('.wa-fab').getAttribute('aria-label')
await page.mouse.wheel(0, 2000)
await page.waitForTimeout(400)
await page.mouse.wheel(0, -100) // scroll back up a touch — StartProject reveals on upward scroll, retracts on downward
await page.waitForTimeout(600)
const spBtn = await page.locator('.sp-btn').textContent().catch(() => null)

console.log(JSON.stringify({ waLabel, waAria, spBtn }, null, 2))
await browser.close()
