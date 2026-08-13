import { chromium } from 'playwright'
const BASE = 'http://localhost:4955'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()))
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message))
page.on('framenavigated', (f) => console.log('NAVIGATED:', f.url()))

await page.goto(BASE + '/pricing', { waitUntil: 'networkidle' })
const hrefs = await page.locator('.lang-switch--nav .lang-switch-opt').evaluateAll((els) =>
  els.map((e) => ({ href: e.getAttribute('href'), lang: e.getAttribute('lang'), text: e.textContent.trim() }))
)
console.log('HREFS:', JSON.stringify(hrefs))

await page.locator('.lang-switch--nav .lang-switch-opt[lang="ar"]').first().click()
await page.waitForTimeout(1500)
console.log('URL AFTER CLICK:', page.url())
await browser.close()
