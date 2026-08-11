/**
 * Does #solutions move vertically between tour steps?
 *
 * The client reported the pinned industry tour "jiggles" — the card and image
 * shift up and down as you scroll between industries. The suspected cause is
 * per-industry content of differing height moving the box's own top edge.
 *
 * Success is ONE distinct value for the card's top and ONE for its height
 * across every step. Anything else is the jiggle.
 */
import { chromium } from 'playwright'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
await p.goto('http://localhost:4941', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)

const box = await p.evaluate(() => {
  const s = document.querySelector('#solutions')
  if (!s) return null
  const r = s.getBoundingClientRect()
  return { top: r.top + window.scrollY, h: s.offsetHeight, vh: window.innerHeight }
})
if (!box) { console.log('#solutions not found'); await b.close(); process.exit(1) }

const STEPS = 14
const rows = []
for (let i = 0; i <= STEPS; i++) {
  const y = Math.round(box.top + (box.h / (STEPS + 1)) * i)
  await p.evaluate((v) => window.scrollTo(0, v), y)
  await p.waitForTimeout(420)
  const m = await p.evaluate(() => {
    const q = (sel) => {
      const e = document.querySelector(sel)
      if (!e) return null
      const r = e.getBoundingClientRect()
      return { t: Math.round(r.top), h: Math.round(r.height) }
    }
    const active = document.querySelector('.sol-idx button[aria-current="true"], .sol-idx .is-active')
    return {
      card: q('.sol-answer') || q('.sol-card') || q('.sol-a-card') || q('.sol-panel'),
      stage: q('.sol-stage') || q('.sol-shot') || q('.sol-media'),
      img: q('.sol-stage img') || q('.sol-shot img') || q('.sol-media img'),
      niche: active ? active.textContent.trim().slice(0, 22) : '',
    }
  })
  rows.push({ step: i, ...m })
}

const f = (o) => (o ? `t=${String(o.t).padStart(5)} h=${String(o.h).padStart(4)}` : '        —      ')
rows.forEach((r) => console.log(
  `step ${String(r.step).padStart(2)}  card ${f(r.card)}   stage ${f(r.stage)}   img ${f(r.img)}  ${r.niche}`
))

const uniq = (k, f2) => [...new Set(rows.map((r) => r[k] && r[k][f2]).filter((v) => v != null))]
console.log('')
for (const [label, key] of [['card', 'card'], ['stage', 'stage'], ['img', 'img']]) {
  const t = uniq(key, 't'), h = uniq(key, 'h')
  if (!t.length) continue
  console.log(`${label.padEnd(6)} top: ${t.length} distinct ${t.length === 1 ? '✓ fixed' : '✗ MOVES ' + JSON.stringify(t.slice(0, 6))}`)
  console.log(`${''.padEnd(6)} height: ${h.length} distinct ${h.length === 1 ? '✓ fixed' : '✗ RESIZES ' + JSON.stringify(h.slice(0, 6))}`)
}
await b.close()
