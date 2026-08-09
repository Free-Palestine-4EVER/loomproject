// Generic section shooter + height/overflow check.
//   node qa-shot.mjs aeo offer mcp
import { chromium } from 'playwright'

const ids = process.argv.slice(2)
const URL = process.env.URL || 'http://localhost:4930'
const OUT = '/private/tmp/claude-501/-Users-hideyourkids/28b8e0fc-9ff2-4332-b967-8d81ecd2e061/scratchpad'
const SIZES = [{ w: 1440, h: 900, t: 'd' }, { w: 390, h: 844, t: 'm' }]

const browser = await chromium.launch()
for (const { w, h, t } of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)

  for (const id of ids) {
    const found = await page.$(`#${id}`)
    if (!found) { console.log(`[${t}] #${id} ❌ NOT FOUND`); continue }
    await page.evaluate((i) => {
      const el = document.getElementById(i)
      const y = window.scrollY + el.getBoundingClientRect().top - 30
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)
    }, id)
    await page.waitForTimeout(1600)
    const hgt = await page.$eval(`#${id}`, (e) => Math.round(e.getBoundingClientRect().height))
    console.log(`[${t} ${w}x${h}] #${id} ${hgt}px (${(hgt / h).toFixed(2)} screens)`)
    await page.screenshot({ path: `${OUT}/${id}-${t}.png` })
  }
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  if (sw[0] > sw[1]) console.log(`  [${t}] ❌ horizontal overflow ${sw[0]}>${sw[1]}`)
  if (errs.length) console.log(`  [${t}] ❌ errors:`, errs.slice(0, 3))
  else console.log(`  [${t}] no page errors ✅`)
  await page.close()
}
await browser.close()
