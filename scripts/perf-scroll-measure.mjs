// One-off perf measurement: loads the page, waits for idle, scrolls the full
// document height, and reports total transferred bytes by resource type.
// node scripts/perf-scroll-measure.mjs [url]
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:4930/'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const bytesByType = {}
let totalBytes = 0
const reqs = []
page.on('response', async (res) => {
  try {
    const headers = res.headers()
    const len = headers['content-length'] ? parseInt(headers['content-length'], 10) : null
    const body = len == null ? await res.body().then((b) => b.length).catch(() => 0) : len
    const ct = (headers['content-type'] || 'unknown').split(';')[0]
    bytesByType[ct] = (bytesByType[ct] || 0) + body
    totalBytes += body
    reqs.push({ url: res.url(), bytes: body, ct })
  } catch { /* ignore */ }
})

await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(2000)

// Full scroll via Lenis if present, else native
await page.evaluate(async () => {
  const doc = document.documentElement
  const max = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight
  const steps = 60
  for (let i = 0; i <= steps; i++) {
    const y = Math.round((max * i) / steps)
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 220))
  }
})
await page.waitForTimeout(2500)

await browser.close()

const kb = (n) => (n / 1024).toFixed(1) + ' KB'
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB'

console.log(`\nURL: ${url}`)
console.log(`Total transferred after full scroll: ${mb(totalBytes)} (${totalBytes} bytes)`)
console.log('\nBy content-type:')
for (const [ct, b] of Object.entries(bytesByType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${ct.padEnd(28)} ${kb(b)}`)
}
console.log('\nTop 15 heaviest:')
for (const r of reqs.sort((a, b) => b.bytes - a.bytes).slice(0, 15)) {
  console.log(`  ${kb(r.bytes).padStart(10)}  ${r.url.replace(url.replace(/\/$/, ''), '')}`)
}
