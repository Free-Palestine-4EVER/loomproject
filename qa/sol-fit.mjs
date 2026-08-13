import { chromium, webkit } from 'playwright'
import fs from 'node:fs'

const [, , engineName, wStr, hStr] = process.argv
const width = parseInt(wStr, 10)
const height = parseInt(hStr, 10)
const engine = engineName === 'chromium' ? chromium : webkit

const b = await engine.launch()
const ctx = await b.newContext({ viewport: { width, height } })
const p = await ctx.newPage()
await p.goto('http://localhost:4930/', { waitUntil: 'networkidle' })
await p.waitForTimeout(800)

const box = await p.evaluate(() => {
  const pin = document.querySelector('.sol-pin.is-pinned')
  const r = pin.getBoundingClientRect()
  return { top: r.top + window.scrollY, h: pin.offsetHeight }
})

// list of industry keys/names to hit — includes longest title/hook
const targets = await p.evaluate(() => {
  return window.__NICHES_DEBUG || null
})

const dir = 'qa/shots'
fs.mkdirSync(dir, { recursive: true })

const STEPS = 6
const results = []
for (let i = 0; i < STEPS; i++) {
  const frac = i / (STEPS - 1)
  const total = box.h - height
  const y = Math.round(box.top + frac * total * 0.9 + 10)
  await p.evaluate((yy) => window.scrollTo(0, yy), y)
  await p.waitForTimeout(500)

  const m = await p.evaluate(() => {
    const stage = document.querySelector('.sol-stage')
    const pinInner = document.querySelector('.sol-pin-inner')
    const cta = document.querySelector('.sol-cta')
    const name = document.querySelector('.sol-answer-name')
    const hook = document.querySelector('.sol-answer-hook')
    const slot = document.querySelector('.sol-answer-slot')
    const r = (el) => el ? el.getBoundingClientRect() : null
    const stageR = r(stage)
    const pinInnerR = r(pinInner)
    const ctaR = r(cta)
    return {
      niche: name ? name.textContent.trim() : null,
      viewportH: window.innerHeight,
      pinInnerTop: pinInnerR ? pinInnerR.top : null,
      pinInnerH: pinInnerR ? pinInnerR.height : null,
      stageTop: stageR ? stageR.top : null,
      stageBottom: stageR ? stageR.bottom : null,
      stageH: stageR ? stageR.height : null,
      gapAbove: stageR ? stageR.top : null,
      gapBelow: pinInnerR && stageR ? (pinInnerR.top + pinInnerR.height) - stageR.bottom : null,
      ctaH: ctaR ? ctaR.height : null,
      ctaCenterX: ctaR ? ctaR.left + ctaR.width / 2 : null,
      viewportCenterX: window.innerWidth / 2,
      slotH: slot ? slot.getBoundingClientRect().height : null,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }
  })
  results.push(m)
  await p.screenshot({ path: `${dir}/verify-${engineName}-${width}-step${i}.png` })
}

console.log(JSON.stringify({ engine: engineName, width, height, results }, null, 2))
await b.close()
