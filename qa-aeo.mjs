// QA for #mcp (size) and #aeo (the new AEO section) — run from the project root.
import { chromium } from 'playwright'

const OUT = '/private/tmp/claude-501/-Users-hideyourkids/ea405f03-1bcd-44f7-b179-6f2efd2aa93c/scratchpad'
const URL = 'http://localhost:4930/'

const b = await chromium.launch()

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  const errs = []
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(4000)

  const heights = await p.evaluate(() => ({
    mcp: Math.round(document.querySelector('#mcp').getBoundingClientRect().height),
    aeo: Math.round(document.querySelector('#aeo').getBoundingClientRect().height),
    vh: innerHeight,
  }))

  for (const id of ['#mcp', '#aeo']) {
    await p.evaluate((sel) => {
      const el = document.querySelector(sel)
      const y = el.getBoundingClientRect().top + window.scrollY - 90
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
      else window.scrollTo(0, y)
    }, id)
    await p.waitForTimeout(2600) // let the typewriter finish before the frame
    await p.screenshot({ path: `${OUT}/${id.slice(1)}-${tag}-a.png`, animations: 'disabled' })
    await p.evaluate(() => window.__lenis?.scrollTo(window.scrollY + 780, { immediate: true }))
    await p.waitForTimeout(900)
    await p.screenshot({ path: `${OUT}/${id.slice(1)}-${tag}-b.png`, animations: 'disabled' })
  }

  const overflow = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }))
  console.log(tag, JSON.stringify(heights),
    '| overflow:', overflow.sw > overflow.cw ? `YES ❌ ${overflow.sw}>${overflow.cw}` : 'no ✅',
    '| errors:', errs.length, errs.slice(0, 3))
  await p.close()
}

// the llms.txt the AEO card links to must actually be served
const p = await b.newPage()
const r = await p.goto('http://localhost:4930/llms.txt')
console.log('/llms.txt →', r.status(), (await r.text()).split('\n')[0])
await b.close()
