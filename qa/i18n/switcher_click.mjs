import { chromium } from 'playwright'
const BASE = 'http://localhost:4955'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message))

// Start on an inner page, not home, to prove the switcher preserves the route.
await page.goto(BASE + '/pricing', { waitUntil: 'networkidle' })
const beforeLang = await page.evaluate(() => document.documentElement.lang)

// Desktop nav switcher -> Arabic
await page.locator('.lang-switch--nav .lang-switch-opt[lang="ar"]').first().click()
await page.waitForURL('**/ar/pricing')
await page.waitForTimeout(300)
const afterUrl = new URL(page.url()).pathname
const afterLang = await page.evaluate(() => document.documentElement.lang)

// Click back to English from there
await page.locator('.lang-switch--nav .lang-switch-opt[lang="en"]').first().click()
await page.waitForURL((u) => u.pathname === '/pricing')
await page.waitForTimeout(300)
const backUrl = new URL(page.url()).pathname
const backLang = await page.evaluate(() => document.documentElement.lang)

console.log(JSON.stringify({
  beforeLang, afterUrl, afterLang, backUrl, backLang, consoleErrors,
  expectAfterUrl: '/ar/pricing', expectBackUrl: '/pricing',
}, null, 2))
await browser.close()
