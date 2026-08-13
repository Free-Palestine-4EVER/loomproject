// Opens the mobile drawer and screenshots it, for one locale per run.
import { chromium } from 'playwright'
const [, , path] = process.argv
const BASE = 'http://localhost:4955'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 430, height: 932 } })
const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message))

await page.goto(BASE + path, { waitUntil: 'networkidle' })
await page.click('.burger')
await page.waitForTimeout(700)

const safeName = (path === '/' ? 'home' : path.replace(/\//g, '_')).replace(/^_/, '')
const outPath = `/private/tmp/claude-501/-Users-hideyourkids/d306c176-e993-4840-83fb-6a59436d7dc4/scratchpad/i18n/qa/drawer_${safeName}.png`
await page.screenshot({ path: outPath })

const hasDrawerSwitch = await page.locator('.lang-switch--drawer').count()
console.log(JSON.stringify({ path, hasDrawerSwitch, consoleErrors, screenshot: outPath }, null, 2))
await browser.close()
