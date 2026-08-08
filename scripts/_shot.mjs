import { chromium } from 'playwright'

const [, , url, out, w = '1500', h = '2000', wait = '1200'] = process.argv
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 })
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()) })
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await p.goto(url, { waitUntil: 'networkidle' })
await p.waitForTimeout(+wait)
await p.screenshot({ path: out, fullPage: true })
await b.close()
console.log('shot', out)
