// One combination per run: node shot.mjs <browserName> <path> <width> <height>
// Writes a screenshot + prints overflow + console errors, then exits.
import { chromium, webkit } from 'playwright'

const [, , browserName, path, widthStr, heightStr] = process.argv
const width = parseInt(widthStr, 10)
const height = parseInt(heightStr, 10)
const BASE = 'http://localhost:4955'

const engine = browserName === 'webkit' ? webkit : chromium
const browser = await engine.launch()
const page = await browser.newPage({ viewport: { width, height } })

const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message))

await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(600)

const overflow = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}))

const safeName = (path === '/' ? 'home' : path.replace(/\//g, '_')).replace(/^_/, '')
const outPath = `/private/tmp/claude-501/-Users-hideyourkids/d306c176-e993-4840-83fb-6a59436d7dc4/scratchpad/i18n/qa/${browserName}_${safeName}_${width}x${height}.png`
await page.screenshot({ path: outPath, fullPage: false })

console.log(JSON.stringify({
  browser: browserName, path, width, height,
  overflow,
  overflowOk: overflow.scrollWidth === overflow.clientWidth,
  consoleErrors,
  screenshot: outPath,
}, null, 2))

await browser.close()
