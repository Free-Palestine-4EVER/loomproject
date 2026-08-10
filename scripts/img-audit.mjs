// One-off: for every visible <img> on the page (after a full scroll pass at a
// given viewport), compare intrinsic vs painted size and flag over/undersampled.
// node scripts/img-audit.mjs [url] [width] [height]
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:4931/'
const vw = parseInt(process.argv[3] || '1440', 10)
const vh = parseInt(process.argv[4] || '900', 10)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 })
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(1500)

await page.evaluate(async () => {
  const doc = document.documentElement
  const max = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const y = Math.round((max * i) / steps)
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 90))
  }
  if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true })
  else window.scrollTo(0, 0)
})
await page.waitForTimeout(500)

const rows = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')]
  return imgs.map((img) => {
    const r = img.getBoundingClientRect()
    return {
      src: img.currentSrc || img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      cssWidth: Math.round(r.width),
      cssHeight: Math.round(r.height),
      decoding: img.decoding,
      loading: img.loading,
      visible: r.width > 0 && r.height > 0,
    }
  }).filter((x) => x.visible && x.naturalWidth > 0)
})

const dpr = 2
console.log(`\n${url} @ ${vw}x${vh} DPR${dpr}\n`)
console.log('ratio  natural       painted(css)  req@DPR2   decoding  src')
for (const r of rows.sort((a, b) => (a.naturalWidth / Math.max(1, a.cssWidth)) - (b.naturalWidth / Math.max(1, b.cssWidth)))) {
  const need = Math.round(r.cssWidth * dpr)
  const ratio = r.naturalWidth / Math.max(1, need)
  const flag = ratio > 2 ? 'OVER  ' : ratio < 0.9 ? 'SOFT  ' : 'ok    '
  console.log(`${flag}${ratio.toFixed(2)}  ${String(r.naturalWidth).padStart(5)}x${String(r.naturalHeight).padEnd(5)} ${String(r.cssWidth).padStart(5)}x${String(r.cssHeight).padEnd(5)} ${String(need).padStart(6)}px  ${(r.decoding||'').padEnd(8)}  ${r.src.replace(url.replace(/\/$/, ''), '')}`)
}
await browser.close()
