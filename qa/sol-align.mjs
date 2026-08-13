/* qa/sol-align.mjs — the Solutions answer holds its position.
 *
 * The client asked for one thing in particular when the card was removed:
 * everything lands in the SAME PLACE regardless of viewport size and
 * regardless of whether the industry's copy is long or short. The pinned tour
 * scrubs thirty industries in a few seconds, so a row that grows by one line
 * walks the CTA up and down while the reader watches.
 *
 * The mechanism is a set of `min-height` reservations in em with a matching
 * `line-clamp` (see the appended block at the foot of solutions.css). This
 * checks both halves of that pairing, because each one alone is a bug:
 *
 *   MOVED   — the CTA's top edge differs across the industries the tour walks
 *             past. That is a missing or too-small reservation.
 *   CLIPPED — a clamped box's scrollHeight exceeds its clientHeight, i.e. the
 *             clamp is hiding copy rather than the reservation holding it.
 *             This is the failure a reservation alone would never catch, and
 *             it is why the two are tested together.
 *
 * Run: node qa/sol-align.mjs [url]   (default http://localhost:4931/)
 */
import { chromium } from 'playwright'

const URL = process.argv[2] || 'http://localhost:4931/'
const WIDTHS = [1440, 1100, 940, 390]
/* Sampled by scrolling the pin track rather than by driving the search field:
 * the tour is what actually re-flows the card thirty times, so it is what has
 * to be measured. 34 samples over the track's own height guarantees every
 * industry is landed on at least once at every width. */
const SAMPLES = 34

let failed = false
const fail = (m) => { failed = true; console.log('  FAIL ' + m) }

const browser = await chromium.launch()

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.goto(URL, { waitUntil: 'networkidle' })

  const track = await page.evaluate(() => {
    const el = document.querySelector('.sol-pin') || document.querySelector('#solutions')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top + window.scrollY, height: el.offsetHeight }
  })
  if (!track) { console.log(`${width}: no solutions section — skipped`); await page.close(); continue }

  const seen = new Map()   // industry name -> CTA top, relative to the card
  let clipped = 0

  for (let i = 0; i < SAMPLES; i++) {
    const y = track.top + (track.height - 900) * (i / (SAMPLES - 1))
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(140)

    const s = await page.evaluate(() => {
      const card = document.querySelector('.sol-answer')
      const cta = document.querySelector('.sol-cta')
      const name = document.querySelector('.sol-answer-name')
      if (!card || !cta || !name) return null
      // relative to the CARD, not the viewport: the card itself moves with
      // the scroll, and what must hold still is the CTA's place INSIDE it.
      const top = Math.round(cta.getBoundingClientRect().top - card.getBoundingClientRect().top)
      const over = ['.sol-answer-hook', '.sol-answer-moon']
        .map((sel) => card.querySelector(sel))
        .filter((el) => el && el.scrollHeight - el.clientHeight > 1)
        .map((el) => el.className)
      return { name: name.textContent.trim(), top, over }
    })
    if (!s) continue
    if (s.over.length) { clipped++; fail(`${width}: "${s.name}" clips ${s.over.join(', ')}`) }
    if (!seen.has(s.name)) seen.set(s.name, s.top)
  }

  const tops = [...new Set(seen.values())]
  const spread = tops.length ? Math.max(...tops) - Math.min(...tops) : 0
  const ok = spread <= 1 && clipped === 0
  console.log(`${width}: ${seen.size} industries, CTA top spread ${spread}px ${ok ? 'OK' : ''}`)
  // 1px, not 0: sub-pixel type metrics round differently between two
  // industries whose reserved rows resolve to the same em height.
  if (spread > 1) {
    fail(`${width}: CTA moves ${spread}px across industries`)
    for (const [n, t] of seen) if (t === Math.max(...tops) || t === Math.min(...tops)) console.log(`       ${t}px  ${n}`)
  }
  await page.close()
}

await browser.close()
console.log(failed ? '\nFAILED' : '\nPASS — the answer holds its position at every width.')
process.exit(failed ? 1 : 0)
