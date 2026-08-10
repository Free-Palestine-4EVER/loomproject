// The CliQ panel, on an account whose free model is already spent. Spends no
// Meshy credits — it only signs in, opens the popup and walks the pay flow.
//   node qa-forge-pay.mjs <email> <password>
import { chromium } from 'playwright'

const S = '/private/tmp/claude-501/-Users-hideyourkids/9286c1c2-28e6-4a23-bfc5-cac391db1070/scratchpad'
const [EMAIL, PASSWORD] = process.argv.slice(2)
const log = (...a) => console.log('•', ...a)

const b = await chromium.launch()

for (const [tag, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp, isMobile: tag === 'mobile', hasTouch: tag === 'mobile' })
  await p.addInitScript(() => { try { localStorage.setItem('loom.forge.popup.seen.v1', '1') } catch {} })
  await p.goto('http://localhost:4930', { waitUntil: 'load' })
  await p.waitForTimeout(2500)
  await p.evaluate(() => { const el = document.querySelector('#forge'); window.__lenis ? window.__lenis.scrollTo(el, { immediate: true }) : el.scrollIntoView() })
  await p.waitForTimeout(1200)
  await p.locator('.forge-cta .wool-btn').click()
  await p.locator('.fg-panel').waitFor({ timeout: 8000 })

  // Step 1 (the pitch) has a secondary "Already have an account? Sign in"
  // link that jumps straight to step 2 with the Sign in tab preselected.
  await p.locator('.fg-pitch-signin .fg-link').click()
  await p.locator('.fg-auth').waitFor({ timeout: 8000 })
  await p.locator('.fg-field input[type=email]').fill(EMAIL)
  await p.locator('.fg-field input[type=password]').fill(PASSWORD)
  await p.locator('.fg-auth button[type=submit]').click()

  await p.locator('.fg-pay').waitFor({ timeout: 20000 })
  log(`${tag} paywall:`, (await p.locator('.fg-pay .fg-fine').first().innerText()).replace(/\s+/g, ' ').slice(0, 90))
  await p.locator('.fg-pay').scrollIntoViewIfNeeded()
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${S}/pay-${tag}-quantity.png` })

  await p.locator('.fg-qty button').nth(2).click()
  await p.locator('.fg-pay .fg-pick').click()
  await p.locator('.fg-order').waitFor({ timeout: 20000 })
  await p.waitForTimeout(600)
  log(`${tag} total:`, (await p.locator('.fg-order-total').innerText()).replace(/\s+/g, ' '))
  log(`${tag} rows:`, await p.locator('.fg-payline dt').allInnerTexts())
  log(`${tag} instruction:`, (await p.locator('.fg-order .fg-fine').innerText()).replace(/\s+/g, ' ').slice(0, 110))
  const wa = await p.locator('.fg-order .fg-pick').getAttribute('href')
  log(`${tag} whatsapp text:`, decodeURIComponent(wa.split('?text=')[1]).replace(/\n/g, ' | '))
  await p.locator('.fg-order').scrollIntoViewIfNeeded()
  await p.waitForTimeout(400)
  await p.screenshot({ path: `${S}/pay-${tag}-order.png` })

  const over = await p.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }))
  log(`${tag} overflow:`, over.s === over.c ? 'clean' : `LEAKS ${over.s - over.c}px`)
  await p.close()
}

await b.close()
log('done')
