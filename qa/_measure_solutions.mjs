import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://localhost:4940'
const WIDTH = Number(process.argv[3] || 1440)
const HEIGHT = Number(process.argv[4] || 900)
const NUM_NICHES = 30

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR', m.text()) })

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

const pinInfo = await page.evaluate(() => {
  const pin = document.querySelector('.sol-pin')
  const rect = pin.getBoundingClientRect()
  const scrollTopOfPin = window.scrollY + rect.top
  return { height: pin.offsetHeight, scrollTopOfPin, innerHeight: window.innerHeight }
})
console.log('pin info', pinInfo)

const total = pinInfo.height - pinInfo.innerHeight
console.log('total scrollable range inside pin:', total)

const rows = []
for (let idx = 0; idx < NUM_NICHES; idx++) {
  // target the middle of this industry's band
  const p = (idx + 0.5) / NUM_NICHES
  const y = pinInfo.scrollTopOfPin + p * total
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await page.waitForTimeout(220) // let rAF paint settle + transition

  const data = await page.evaluate(() => {
    const card = document.querySelector('.sol-panelcard')
    const stage = document.querySelector('.sol-stage')
    const img = document.querySelector('.sol-stage-bg')
    const slot = document.querySelector('.sol-answer-slot')
    const name = document.querySelector('.sol-answer-name')?.textContent?.trim()
    const r = (el) => el ? (({ top, left, width, height }) => ({ top, left, width, height }))(el.getBoundingClientRect()) : null
    return {
      name,
      card: r(card),
      stage: r(stage),
      img: r(img),
      slot: r(slot),
    }
  })
  rows.push({ idx, ...data })
}

console.log('\n%-4s %-28s %8s %8s %8s %8s %8s %8s', 'idx', 'name', 'card.top', 'card.h', 'stage.top', 'stage.h', 'img.top', 'img.h')
for (const r of rows) {
  console.log(
    String(r.idx).padStart(3),
    (r.name || '').padEnd(28).slice(0, 28),
    String(r.card?.top?.toFixed(1)).padStart(9),
    String(r.card?.height?.toFixed(1)).padStart(8),
    String(r.stage?.top?.toFixed(1)).padStart(9),
    String(r.stage?.height?.toFixed(1)).padStart(8),
    String(r.img?.top?.toFixed(1)).padStart(9),
    String(r.img?.height?.toFixed(1)).padStart(8),
  )
}

// summarize variance
function variance(field, obj) {
  const vals = rows.map((r) => r[obj]?.[field]).filter((v) => typeof v === 'number')
  return { min: Math.min(...vals), max: Math.max(...vals), range: Math.max(...vals) - Math.min(...vals) }
}
console.log('\n--- variance summary ---')
for (const obj of ['card', 'stage', 'img', 'slot']) {
  for (const field of ['top', 'height']) {
    console.log(obj, field, variance(field, obj))
  }
}

await browser.close()
