import { chromium } from 'playwright'
const url = process.argv[2] || 'http://localhost:4931/'
const OUT = '/private/tmp/claude-501/-Users-hideyourkids/9286c1c2-28e6-4a23-bfc5-cac391db1070/scratchpad'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(2000)
await page.evaluate(() => { try { localStorage.setItem('loom.forge.popup.seen.v1', '1') } catch {} })
await page.evaluate(() => document.getElementById('solutions')?.scrollIntoView())
await page.waitForTimeout(800)
await page.fill('#sol-search', 'wedding')
await page.waitForTimeout(1200)
const sol = await page.$('.sol-stage')
if (sol) await sol.screenshot({ path: `${OUT}/wedding-stage-1440.png` })
await page.screenshot({ path: `${OUT}/wedding-full-1440.png` })
await browser.close()
