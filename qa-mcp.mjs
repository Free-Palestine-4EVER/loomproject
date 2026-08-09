// QA for the #mcp section — run from the project root: node qa-mcp.mjs
import { chromium } from 'playwright'

const OUT = '/private/tmp/claude-501/-Users-hideyourkids/ea405f03-1bcd-44f7-b179-6f2efd2aa93c/scratchpad'
const URL = 'http://localhost:4930/'

const b = await chromium.launch()

for (const [w, h, tag] of [[1440, 900, 'desktop'], [820, 1180, 'tablet'], [390, 844, 'mobile']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  const errs = []
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
  // NOT networkidle — the page lazy-loads three.js and a wall of webp; it can
  // idle late or never. domcontentloaded plus the settle wait below is enough.
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(2500)

  // Lenis hijacks window.scrollTo — go through the instance.
  await p.evaluate(() => {
    const el = document.querySelector('#mcp')
    const y = el.getBoundingClientRect().top + window.scrollY - 90
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
  })

  // Prove the stagger: sample the three cards' opacity a few hundred ms into
  // the entry. If they deal in one after another these are three different
  // numbers, ascending card 1 → 3.
  const stagger = await p.evaluate(() => new Promise((res) => {
    const read = () => [...document.querySelectorAll('#mcp .mcp-cell')]
      .map((el) => +getComputedStyle(el).opacity.slice(0, 4))
    const frames = []
    let n = 0
    const tick = () => { frames.push(read()); if (++n < 4) setTimeout(tick, 170); else res(frames) }
    tick()
  }))

  await p.waitForTimeout(1800)

  const overflow = await p.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  // Viewport shots, not element shots: Lenis is still easing and the loom
  // backdrop never stops, so `waiting for element to be stable` never resolves.
  await p.screenshot({ path: `${OUT}/mcp-${tag}-1.png`, animations: 'disabled' })
  await p.evaluate(() => window.__lenis?.scrollTo(window.scrollY + 760, { immediate: true }))
  await p.waitForTimeout(900)
  await p.screenshot({ path: `${OUT}/mcp-${tag}-2.png`, animations: 'disabled' })

  // open the gate on the first card
  await p.locator('#mcp .mcp-unlock').first().click({ force: true })
  await p.waitForTimeout(700)
  await p.screenshot({ path: `${OUT}/mcp-form-${tag}.png`, animations: 'disabled' })

  console.log(tag, 'overflow:', overflow.scrollWidth > overflow.clientWidth ? 'YES ❌' : 'no ✅',
    '| stagger frames:', JSON.stringify(stagger),
    '| console errors:', errs.length, errs.slice(0, 3))
  await p.close()
}
await b.close()
