import { chromium } from 'playwright'
const url = process.argv[2] || 'http://localhost:4931/'
const tag = process.argv[3] || 'after'
const OUT = '/private/tmp/claude-501/-Users-hideyourkids/9286c1c2-28e6-4a23-bfc5-cac391db1070/scratchpad'

for (const [label, vw, vh] of [['1440', 1440, 900], ['390', 390, 844]]) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: vw, height: vh } })
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(2500)
  // dodge the FORGE popup (auto-opens ~14s in) — never let it hijack these shots
  await page.evaluate(() => { try { localStorage.setItem('loom.forge.popup.seen.v1', '1') } catch {} })
  await page.keyboard.press('Escape').catch(() => {})

  // full page
  await page.screenshot({ path: `${OUT}/${tag}-full-${label}.png`, fullPage: true })

  // solutions
  await page.evaluate(() => document.getElementById('solutions')?.scrollIntoView())
  await page.waitForTimeout(1200)
  const sol = await page.$('#solutions')
  if (sol) await sol.screenshot({ path: `${OUT}/${tag}-solutions-${label}.png` })

  // work
  await page.evaluate(() => document.getElementById('work')?.scrollIntoView())
  await page.waitForTimeout(1200)
  const work = await page.$('#work')
  if (work) await work.screenshot({ path: `${OUT}/${tag}-work-${label}.png` })

  await browser.close()
}
console.log('done', tag)
