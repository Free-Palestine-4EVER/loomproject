// Confirms an English visitor never fetches the Arabic font, and an Arabic
// visitor does.
import { chromium } from 'playwright'
const BASE = 'http://localhost:4955'

for (const path of ['/', '/ar']) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const fontReqs = []
  page.on('request', (req) => {
    if (req.url().includes('ibm-plex-sans-arabic')) fontReqs.push(req.url())
  })
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  console.log(path, '-> Arabic font requests:', fontReqs.length, fontReqs)
  await browser.close()
}
