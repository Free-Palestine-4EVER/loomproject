import { chromium } from 'playwright'
const b = await chromium.launch()
for (const w of [1440, 820, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } })
  await p.goto('http://localhost:4930/', { waitUntil: 'load' })
  await p.waitForTimeout(2000)
  await p.evaluate(() => window.__lenis?.scrollTo(document.body.scrollHeight, { immediate: true }))
  await p.waitForTimeout(1500)
  console.log(w, await p.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return 'MISSING'
      const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round).join(',') }
    const f = document.querySelector('footer').getBoundingClientRect()
    return JSON.stringify({ footer: [f.left, f.top, f.width, f.height].map(Math.round).join(','),
      base: r('.footer-base'), top: r('.foot-top'), edge: r('.foot-edge'), cta: r('.foot-cta') })
  }))
  await p.close()
}
await b.close()
