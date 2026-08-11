import { chromium } from 'playwright'

const BASE = 'http://localhost:4945'
const WIDTHS = [
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '820', width: 820, height: 1180, mobile: false },
  { name: '1440', width: 1440, height: 900, mobile: false },
]
const ROUTES = ['/', '/type', '/ai-workshops', '/dashboard', '/nope']

const results = {}

const browser = await chromium.launch()

for (const vp of WIDTHS) {
  for (const route of ROUTES) {
    const key = `${route}@${vp.name}`
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    })
    const page = await ctx.newPage()
    const consoleMsgs = []
    const pageErrors = []
    const failedReqs = []

    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMsgs.push(`[${msg.type()}] ${msg.text()}`)
      }
    })
    page.on('pageerror', (err) => pageErrors.push(String(err)))
    page.on('response', (res) => {
      if (res.status() >= 400) {
        failedReqs.push(`${res.status()} ${res.url()}`)
      }
    })

    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 })
      await page.waitForTimeout(2500) // let hero/scroll chase settle
    } catch (e) {
      consoleMsgs.push(`GOTO_ERROR: ${e.message}`)
    }

    // overflow check
    let overflow = null
    try {
      overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
    } catch {}

    results[key] = {
      consoleMsgs,
      pageErrors,
      failedReqs,
      overflow,
    }

    await ctx.close()
  }
}

await browser.close()
console.log(JSON.stringify(results, null, 2))
