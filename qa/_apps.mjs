/** Throwaway: shoot #apps at two widths off the PREVIEW build (4941). */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.argv[2] || 'http://localhost:4941'
await mkdir('qa/shots', { recursive: true })
const b = await chromium.launch()

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const c = await b.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    isMobile: w < 500,
    hasTouch: w < 500,
  })
  const p = await c.newPage()
  await p.goto(BASE + '/#apps', { waitUntil: 'networkidle' })
  await p.waitForTimeout(4000)
  try {
    await p.evaluate(() => document.querySelector('#apps')?.scrollIntoView({ block: 'start' }))
  } catch {
    await p.waitForTimeout(2000)
    await p.evaluate(() => document.querySelector('#apps')?.scrollIntoView({ block: 'start' }))
  }
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `qa/shots/apps-${w}.png` })
  let over='?'
  try { over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) } catch {}
  console.log(w, 'horizontal overflow:', over)
  await c.close()
}
await b.close()
