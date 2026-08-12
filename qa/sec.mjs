import { chromium } from 'playwright'
const BASE = process.argv[2] || 'http://localhost:4941'
const OUT = process.argv[3] || '/private/tmp/claude-501/-Users-hideyourkids/13f824cc-446c-4b39-91e3-15a83a2c49e4/scratchpad/shots'
const sels = (process.argv[4] || '.sol-core,#forge').split(',')
const widths = (process.argv[5] || '1440,390').split(',').map(Number)
import { mkdir } from 'node:fs/promises'
await mkdir(OUT, { recursive: true })
const b = await chromium.launch()
for (const w of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, deviceScaleFactor: 2, isMobile: w < 500, hasTouch: w < 500 })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  // scroll through to trigger reveals
  const h = await p.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < h; y += 600) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(120) }
  await p.waitForTimeout(1200)
  for (const s of sels) {
    const el = await p.$(s)
    if (!el) { console.log('MISSING', s); continue }
    /* A REAL scroll, centred — not scrollIntoViewIfNeeded().
       viewportBudget.js evicts off-screen images on touch devices by swapping
       their src for a 1x1 gif and restoring it when they come back. If the
       shot is taken while the section is still off screen (or only barely
       nudged into view), every image in it screenshots BLANK and the run
       reports a bug that does not exist — which is exactly what this cost once
       already. Centre it, then give the observer time to put the src back. */
    await p.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), s)
    await p.waitForTimeout(2500)
    const name = s.replace(/[^a-z0-9]/gi, '') + '-' + w + '.png'
    await el.screenshot({ path: `${OUT}/${name}` }).catch(e => console.log('ERR', s, e.message))
    console.log('shot', name)
  }
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  console.log('overflow@' + w, ov)
  await ctx.close()
}
await b.close()
