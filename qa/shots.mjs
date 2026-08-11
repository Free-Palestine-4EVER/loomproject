/**
 * Screenshot the Svelte build at the three widths the React site is verified
 * at, and check the two things that have regressed on this site before.
 *
 *   node qa/shots.mjs [baseUrl]     default http://localhost:4941 (preview)
 *
 * One trap this script is written around, from CLAUDE.md:
 *
 * SCREENSHOTS TAKEN RIGHT AFTER LOAD CATCH THE HERO MID-ANIMATION and look
 *    blank or wrong. Wait for the scroll chase to settle (~2s) before judging a
 *    frame, and give lazy images time to decode — a footer shot taken too early
 *    shows an empty pink box, not a missing tree.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.argv[2] || 'http://localhost:4941'
const OUT = 'qa/shots'

const WIDTHS = [
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '820', width: 820, height: 1180, mobile: false },
  { name: '1440', width: 1440, height: 900, mobile: false },
]

const ROUTES = ['/', '/type', '/ai-workshops']

const scrollTo = (y) => `window.scrollTo(0, ${y})`

const problems = []

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()

for (const vp of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  })
  const page = await ctx.newPage()

  // Console errors are a finding, not noise. A hydration mismatch shows up
  // here and nowhere else.
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[${vp.name}] console: ${m.text().slice(0, 200)}`)
  })
  page.on('pageerror', (e) => problems.push(`[${vp.name}] pageerror: ${String(e).slice(0, 200)}`))

  for (const route of ROUTES) {
    const slug = route === '/' ? 'home' : route.replace(/\//g, '')
    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2400) // let the hero settle — see note 2 above

    await page.screenshot({ path: `${OUT}/${slug}-${vp.name}-top.png` })

    // ── THE HORIZONTAL SCROLLBAR CHECK ────────────────────────────────────
    // Full-bleed sections on this site have opened one before. This is the
    // check that catches it, and it must run at every width.
    const overflow = await page.evaluate(() => {
      const d = document.documentElement
      return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth }
    })
    if (overflow.scrollWidth > overflow.clientWidth) {
      problems.push(
        `[${vp.name}] ${route} HORIZONTAL OVERFLOW: scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}`
      )
      // Name the culprits so the fix does not start with a hunt.
      const wide = await page.evaluate((cw) => {
        const out = []
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect()
          if (r.right > cw + 1 || r.left < -1) {
            out.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} right=${Math.round(r.right)} left=${Math.round(r.left)}`)
          }
          if (out.length > 6) break
        }
        return out
      }, overflow.clientWidth)
      wide.forEach((w) => problems.push(`    ↳ ${w}`))
    }

    // Mid-page and footer, on the home page only — the sub-pages are short.
    if (route === '/') {
      const h = await page.evaluate(() => document.documentElement.scrollHeight)
      await page.evaluate(scrollTo(Math.round(h * 0.45)))
      await page.waitForTimeout(1400)
      await page.screenshot({ path: `${OUT}/${slug}-${vp.name}-mid.png` })

      await page.evaluate(scrollTo(h))
      await page.waitForTimeout(2000) // the tree is lazy; let it decode
      await page.screenshot({ path: `${OUT}/${slug}-${vp.name}-foot.png` })
    }
  }

  await ctx.close()
}

await browser.close()

console.log(`\nshots written to ${OUT}/`)
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`)
  problems.forEach((p) => console.log('  ' + p))
  process.exitCode = 1
} else {
  console.log('\nno console errors, no horizontal overflow at 390 / 820 / 1440.')
}
