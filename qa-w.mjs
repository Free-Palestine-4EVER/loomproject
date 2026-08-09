import { chromium } from 'playwright'
const b = await chromium.launch()
for (const w of [1600, 1440, 1180, 900, 600, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } })
  await p.goto('http://localhost:4930/', { waitUntil: 'load' })
  await p.waitForTimeout(2200)
  await p.evaluate(() => window.__lenis?.scrollTo(document.body.scrollHeight, { immediate: true }))
  await p.waitForTimeout(1200)
  const r = await p.evaluate(() => {
    const de = document.documentElement
    const over = []
    if (de.scrollWidth > de.clientWidth) {
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect()
        if (b.right > de.clientWidth + 1 || b.left < -1) over.push(`${el.tagName}.${el.className?.toString().slice(0,40)} ${Math.round(b.left)}..${Math.round(b.right)}`)
      }
    }
    return { hScroll: de.scrollWidth - de.clientWidth, over: over.slice(0, 6) }
  })
  console.log(w, JSON.stringify(r))
  await p.close()
}
await b.close()
