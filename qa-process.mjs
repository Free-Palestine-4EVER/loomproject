// Process redesign: does the thread hit its own knots, does the band fit a
// screen, and does the scroll draw actually light the knots in order?
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:4930'
const OUT = '/private/tmp/claude-501/-Users-hideyourkids/28b8e0fc-9ff2-4332-b967-8d81ecd2e061/scratchpad'
const SIZES = [{ w: 1440, h: 900, t: 'd' }, { w: 820, h: 1100, t: 't' }, { w: 390, h: 844, t: 'm' }]

const browser = await chromium.launch()
for (const { w, h, t } of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2400)

  await page.evaluate(() => {
    const s = document.getElementById('process')
    const y = window.scrollY + s.getBoundingClientRect().top - 30
    window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)
  })
  await page.waitForTimeout(1400)

  const r = await page.evaluate(() => {
    const band = document.querySelector('.proc-band')
    const svg = document.querySelector('.proc-thread')
    const knots = [...document.querySelectorAll('.proc-knot')]
    const b = band.getBoundingClientRect()
    // knot centre vs the path vertex it is supposed to sit on
    let maxOff = null
    if (svg && getComputedStyle(svg).display !== 'none') {
      const s = svg.getBoundingClientRect()
      maxOff = Math.max(...knots.map((k, i) => {
        const kr = k.getBoundingClientRect()
        const wantX = s.left + ((i + 0.5) / knots.length) * s.width
        return Math.abs(kr.left + kr.width / 2 - wantX)
      }))
    }
    return {
      bandH: Math.round(b.height),
      secH: Math.round(document.getElementById('process').getBoundingClientRect().height),
      knots: knots.length,
      lit: knots.filter((k) => k.classList.contains('is-lit')).length,
      maxOff: maxOff === null ? null : +maxOff.toFixed(1),
      threadOn: svg ? getComputedStyle(svg).display !== 'none' : false,
    }
  })
  console.log(
    `[${t} ${w}x${h}] band ${r.bandH}px, section ${r.secH}px (${(r.secH / h).toFixed(2)} screens) | ` +
    `knots ${r.knots} lit ${r.lit} | thread ${r.threadOn ? 'on' : 'off (stacked)'}` +
    (r.maxOff === null ? '' : ` | knot-vs-path offset ${r.maxOff}px ${r.maxOff < 2 ? '✅' : '❌'}`)
  )
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  if (sw[0] > sw[1]) console.log(`  ❌ horizontal overflow ${sw[0]}>${sw[1]}`)
  if (errs.length) console.log('  ❌ page errors:', errs.slice(0, 3))

  await page.screenshot({ path: `${OUT}/process-${t}.png` })
  await page.close()
}
await browser.close()
