// QA for the three sections added 10 Aug 2026 (#pricing, #voices, #faq),
// the moved #process, and the nav. Drives the real dev server.
//
// Lenis hijacks window.scrollTo — scripted scrolling MUST go through
// window.__lenis.scrollTo(y, { immediate: true }), and it does not exist until
// the instance is created, hence the waitForFunction.
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:4930'
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-hideyourkids/28b8e0fc-9ff2-4332-b967-8d81ecd2e061/scratchpad'
const WIDTHS = [
  { w: 390, h: 844, tag: 'm' },
  { w: 820, h: 1100, tag: 't' },
  { w: 1440, h: 900, tag: 'd' },
]

const browser = await chromium.launch()

for (const { w, h, tag } of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`))

  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => !!window.__lenis, null, { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(2600) // hero settles; screenshots taken earlier look blank

  // ——— section order, read off the real DOM ———
  if (tag === 'd') {
    const ids = await page.$$eval('main [id]', (els) => els.map((e) => e.id))
    console.log('\nSECTION ORDER:', ids.join(' → '))
    const navs = await page.$$eval('.nav-links a', (as) =>
      as.map((a) => `${a.textContent.trim()}${a.classList.contains('is-extra') ? '*' : ''}`))
    console.log('NAV TABS:', navs.join(' | '))
  }

  // ——— horizontal overflow: full-bleed sections have opened a scrollbar here before
  const over = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }))
  console.log(`[${tag} ${w}px] scrollWidth ${over.sw} vs clientWidth ${over.cw} ${over.sw > over.cw ? '❌ OVERFLOW' : '✅'}`)

  for (const id of ['process', 'pricing', 'voices', 'faq']) {
    const el = await page.$(`#${id}`)
    if (!el) { console.log(`[${tag}] #${id} ❌ NOT FOUND`); continue }
    await page.evaluate((i) => {
      const t = document.getElementById(i)
      const y = window.scrollY + t.getBoundingClientRect().top - 40
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)
    }, id)
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/${id}-${tag}.png` })
  }

  // FAQ accordion actually opens?
  if (tag === 'd') {
    await page.click('#faq .faq-item:first-of-type .faq-q')
    await page.waitForTimeout(700)
    const openH = await page.$eval('#faq .faq-item:first-of-type .faq-a', (e) => e.getBoundingClientRect().height)
    console.log(`FAQ first panel height when open: ${Math.round(openH)}px ${openH > 40 ? '✅' : '❌'}`)
    await page.screenshot({ path: `${OUT}/faq-open-d.png` })
  }

  if (errs.length) console.log(`[${tag}] CONSOLE ERRORS:\n  ` + errs.slice(0, 6).join('\n  '))
  else console.log(`[${tag}] no console errors ✅`)

  await page.close()
}

await browser.close()
