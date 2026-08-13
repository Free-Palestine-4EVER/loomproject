// Decoded-bitmap footprint per route/viewport: sum of naturalWidth*naturalHeight*4
// across every <img> on the page after a full scroll-through (so lazy images
// resolve). This is the number that matters for memory risk, independent of
// file size/codec.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4930'
const ROUTES = ['/', '/work', '/machine', '/apps', '/solutions']
const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844, dpr: 1 },
  { name: '1440x900', width: 1440, height: 900, dpr: 1 },
]

const b = await chromium.launch()
const results = []

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr })
    const p = await ctx.newPage()
    await p.goto(BASE + route, { waitUntil: 'networkidle' })
    await p.waitForTimeout(1500)
    // scroll all the way down and back so every lazy <img> resolves
    await p.evaluate(async () => {
      const h = document.documentElement.scrollHeight
      for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) }
      window.scrollTo(0, h)
      await new Promise((r) => setTimeout(r, 300))
    })
    await p.waitForTimeout(3000)
    const data = await p.evaluate(() => {
      let total = 0
      let count = 0
      for (const img of document.images) {
        if (img.naturalWidth <= 2) continue
        total += img.naturalWidth * img.naturalHeight * 4
        count++
      }
      return { total, count, scrollHeight: document.documentElement.scrollHeight }
    })
    results.push({ route, vp: vp.name, mb: +(data.total / 1024 / 1024).toFixed(1), imgs: data.count })
    await ctx.close()
  }
}

console.log('route      viewport     decoded-MB   imgCount')
for (const r of results) {
  console.log(`${r.route.padEnd(10)} ${r.vp.padEnd(12)} ${String(r.mb).padStart(9)}   ${r.imgs}`)
}
await b.close()
