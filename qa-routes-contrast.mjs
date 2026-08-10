// The two ROUTES the page-level sweep never visits: /type and /ai-workshops.
// App.jsx swaps them in instead of the long page, so a sweep that scrolls the
// home page cannot reach a single element in either.
//
// Same method as the page sweep: for every visible text node, resolve the
// colour it actually paints and the first non-transparent background behind
// it, then compute the real contrast ratio.
import { chromium } from 'playwright'

const ROUTES = ['/type', '/ai-workshops']
const SIZES = [{ w: 1440, h: 900, t: 'd' }, { w: 390, h: 844, t: 'm' }]
const OUT = '/private/tmp/claude-501/-Users-hideyourkids/28b8e0fc-9ff2-4332-b967-8d81ecd2e061/scratchpad'

const AUDIT = () => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const parse = (s) => {
    const m = s && s.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(',').map((x) => parseFloat(x))
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }
  }
  // walk up for the first background that actually paints something
  const bgOf = (el) => {
    let n = el
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c && c.a > 0.5) return c.rgb
      n = n.parentElement
    }
    return [255, 233, 242]
  }
  const out = []
  for (const el of document.querySelectorAll('body *')) {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim()
    if (!txt || txt.length < 2) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.15) continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) continue
    const fg = parse(cs.color); if (!fg) continue
    const bg = bgOf(el)
    const a = L(fg.rgb) + 0.05, b = L(bg) + 0.05
    const ratio = Math.max(a, b) / Math.min(a, b)
    if (ratio < 2.4) out.push({ t: txt.slice(0, 46), cls: (el.className || '').toString().split(' ')[0], ratio: +ratio.toFixed(2), fg: cs.color, bg: `rgb(${bg.join(',')})` })
  }
  return out
}

const browser = await chromium.launch()
let total = 0
for (const route of ROUTES) {
  for (const { w, h, t } of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    const errs = []
    page.on('pageerror', (e) => errs.push(e.message))
    await page.goto('http://localhost:4930' + route, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3200)
    // walk the whole route so lazy sections mount
    await page.evaluate(async () => {
      const H = document.documentElement.scrollHeight
      for (let y = 0; y < H; y += window.innerHeight * 0.8) {
        window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 220))
      }
      window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0)
    })
    await page.waitForTimeout(900)

    const bad = await page.evaluate(AUDIT)
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    total += bad.length
    console.log(`\n${route} [${t} ${w}x${h}]  low-contrast: ${bad.length}  ${sw[0] > sw[1] ? '❌ H-SCROLL' : 'no h-scroll ✅'}  ${errs.length ? '❌ ' + errs[0].slice(0, 60) : 'no errors ✅'}`)
    for (const b of bad.slice(0, 12)) console.log(`   ${String(b.ratio).padStart(5)}:1  .${b.cls.padEnd(22)} ${b.fg} on ${b.bg}  "${b.t}"`)
    await page.screenshot({ path: `${OUT}/route-${route.replace(/\//g, '')}-${t}.png`, fullPage: false })
    await page.close()
  }
}
console.log(`\nTOTAL low-contrast across both routes: ${total}`)
await browser.close()
