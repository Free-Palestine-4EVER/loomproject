// End-to-end QA for the FORGE band + popup: register a throwaway account,
// send a real photo, wait for the model, and check the download links land.
// Costs one Meshy generation (15 credits) per run — it is the only way to know
// the entitlement, the upload and the poll actually work together.
//
//   node qa-forge.mjs            # full run against http://localhost:4930
//   node qa-forge.mjs --nogen    # UI only, no generation, no credits spent
import { chromium } from 'playwright'

const BASE = process.env.QA_BASE || 'http://localhost:4930'
const SHOT = '/private/tmp/claude-501/-Users-hideyourkids/9286c1c2-28e6-4a23-bfc5-cac391db1070/scratchpad'
const PHOTO = `${SHOT}/testchair.jpg`
const NOGEN = process.argv.includes('--nogen')
const EMAIL = `forge-qa-${Date.now()}@loomstudio-jo.com`
const PASSWORD = 'ForgeQa!2026'

const log = (...a) => console.log('•', ...a)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console error]', m.text().slice(0, 160)) })

// Suppress the 14s auto-open so it cannot fire in the middle of a step.
await page.addInitScript(() => { try { localStorage.setItem('loom.forge.popup.seen.v1', '1') } catch {} })

await page.goto(BASE, { waitUntil: 'load' })
await page.waitForTimeout(2500)

// --- the section -----------------------------------------------------------
const section = page.locator('#forge')
await section.waitFor({ timeout: 15000 })
await page.evaluate(() => {
  const el = document.querySelector('#forge')
  // Lenis hijacks window.scrollTo — CLAUDE.md is explicit about this.
  if (window.__lenis) window.__lenis.scrollTo(el, { immediate: true })
  else el.scrollIntoView()
})
await page.waitForTimeout(1600)
log('section headline:', await page.locator('.forge-h2').innerText())
log('section price:', (await page.locator('.forge-price').innerText()).replace(/\n/g, ' '))
log('mascot image loaded:', await page.locator('.forge-media img').evaluate((i) => i.complete && i.naturalWidth > 0))
await page.screenshot({ path: `${SHOT}/forge-section.png` })

// --- horizontal overflow, the trap CLAUDE.md calls out ---------------------
for (const w of [390, 820, 1440]) {
  await page.setViewportSize({ width: w, height: 900 })
  await page.waitForTimeout(700)
  const over = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  log(`overflow @${w}:`, over.scroll === over.client ? 'clean' : `LEAKS ${over.scroll - over.client}px`)
}
await page.setViewportSize({ width: 1440, height: 900 })
await page.waitForTimeout(500)

// --- the popup -------------------------------------------------------------
await page.locator('.forge-cta .wool-btn').click()
await page.locator('.fg-panel').waitFor({ timeout: 8000 })
await page.waitForTimeout(900)
log('popup title:', await page.locator('.fg-title').innerText())
log('steps:', await page.locator('.fg-steps li .fg-step-t').allInnerTexts())
await page.screenshot({ path: `${SHOT}/forge-popup-auth.png` })

// --- register --------------------------------------------------------------
await page.locator('.fg-field input[type=email]').fill(EMAIL)
await page.locator('.fg-field input[type=password]').fill(PASSWORD)
await page.locator('.fg-auth button[type=submit]').click()
await page.locator('.fg-drop', { timeout: 20000 }).waitFor({ timeout: 20000 })
log('registered:', EMAIL)
log('entitlement badge:', await page.locator('.fg-drop-badge').innerText())
log('account line:', await page.locator('.fg-account').innerText())
await page.screenshot({ path: `${SHOT}/forge-popup-upload.png` })

if (NOGEN) {
  log('--nogen: stopping before the generation')
  await browser.close()
  process.exit(0)
}

// --- generate --------------------------------------------------------------
await page.locator('.fg-drop input[type=file]').setInputFiles(PHOTO)
await page.locator('.fg-job', { timeout: 40000 }).waitFor({ timeout: 40000 })
log('job started, polling…')

const deadline = Date.now() + 5 * 60 * 1000
let status = ''
while (Date.now() < deadline) {
  const done = await page.locator('.fg-files').count()
  const failed = await page.locator('.fg-job .fg-error').count()
  status = await page.locator('.fg-job-status, .fg-job .fg-error').first().innerText().catch(() => '')
  if (done || failed) break
  const bar = await page.locator('.fg-bar i').evaluate((e) => e.style.width).catch(() => '?')
  process.stdout.write(`   progress ${bar}\r`)
  await page.waitForTimeout(5000)
}
console.log()
log('final status:', status)

const files = await page.locator('.fg-file').allInnerTexts()
log('download formats:', files.length ? files.join(', ') : 'NONE')
if (files.length) {
  const href = await page.locator('.fg-file').first().getAttribute('href')
  log('first file url ok:', /^https?:\/\//.test(href || ''))
}
await page.screenshot({ path: `${SHOT}/forge-popup-done.png` })

// --- the paywall, now that the free model is spent -------------------------
await page.reload({ waitUntil: 'load' })
await page.waitForTimeout(2500)
await page.locator('#forge .forge-cta .wool-btn').scrollIntoViewIfNeeded()
await page.locator('.forge-cta .wool-btn').click()
await page.locator('.fg-panel').waitFor({ timeout: 8000 })
await page.waitForTimeout(2500)
const paywall = await page.locator('.fg-pay').count()
log('paywall after free model:', paywall ? 'shown' : 'MISSING')
if (paywall) log('paywall lead:', await page.locator('.fg-pay-lead').innerText())
await page.screenshot({ path: `${SHOT}/forge-popup-paywall.png` })

// --- mobile ----------------------------------------------------------------
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await m.addInitScript(() => { try { localStorage.setItem('loom.forge.popup.seen.v1', '1') } catch {} })
await m.goto(BASE, { waitUntil: 'load' })
await m.waitForTimeout(2500)
await m.evaluate(() => document.querySelector('#forge').scrollIntoView())
await m.waitForTimeout(1200)
await m.screenshot({ path: `${SHOT}/forge-section-mobile.png` })
await m.locator('.forge-cta .wool-btn').click()
await m.locator('.fg-panel').waitFor({ timeout: 8000 })
await m.waitForTimeout(1200)
log('mobile sheet:', await m.locator('.fg-panel.is-sheet').count() ? 'bottom sheet' : 'PLAIN PANEL')
await m.screenshot({ path: `${SHOT}/forge-popup-mobile.png` })

await browser.close()
log('done')
