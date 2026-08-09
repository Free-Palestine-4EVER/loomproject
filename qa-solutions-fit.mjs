// Does the industry card hold 21:9, and does the whole #solutions band fit in
// one viewport? Both have to be true at once — a card that keeps its ratio by
// growing off the bottom of the screen is the bug this measures.
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:4930'
const SIZES = [
  { w: 1440, h: 900 }, { w: 1280, h: 800 }, { w: 1180, h: 720 }, { w: 1100, h: 1000 },
]
const browser = await chromium.launch()

for (const { w, h } of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2400)

  await page.evaluate(() => {
    const t = document.getElementById('solutions')
    const y = window.scrollY + t.getBoundingClientRect().top - 40
    window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)
  })
  await page.waitForTimeout(1000)

  const r = await page.evaluate(() => {
    const card = document.querySelector('.sol-answer.has-photo')
    if (!card) return { err: 'no .sol-answer.has-photo (stacked layout at this width)' }
    const c = card.getBoundingClientRect()
    // is anything inside taller than the box? (the card is overflow:hidden)
    const clipped = card.scrollHeight - card.clientHeight
    return {
      cw: Math.round(c.width), ch: Math.round(c.height),
      ratio: +(c.width / c.height).toFixed(2),
      bottom: Math.round(c.bottom),
      clipped,
    }
  })
  if (r.err) { console.log(`[${w}x${h}] ${r.err}`); await page.close(); continue }

  const ratioOK = Math.abs(r.ratio - 2.33) < 0.06
  const fitsOK = r.bottom <= h
  console.log(
    `[${w}x${h}] card ${r.cw}x${r.ch} ratio ${r.ratio} ${ratioOK ? '✅' : '❌'} | ` +
    `bottom ${r.bottom}/${h} ${fitsOK ? '✅ on screen' : '❌ off screen'} | ` +
    `clipped ${r.clipped}px ${r.clipped <= 1 ? '✅' : '❌'}`
  )
  await page.screenshot({ path: `/private/tmp/claude-501/-Users-hideyourkids/28b8e0fc-9ff2-4332-b967-8d81ecd2e061/scratchpad/sol-${w}x${h}.png` })
  await page.close()
}
await browser.close()
