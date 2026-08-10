// QA script for the merged Suite section (#apps). Run from the project root
// so playwright resolves out of this repo's node_modules.
import { chromium } from 'playwright'

const SCRATCH = '/private/tmp/claude-501/-Users-hideyourkids/9286c1c2-28e6-4a23-bfc5-cac391db1070/scratchpad'
const URL = 'http://localhost:4930'

async function checkWidth(page, width, height) {
  await page.setViewportSize({ width, height })
  await page.waitForTimeout(300)
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  const ok = result.scrollWidth === result.clientWidth
  console.log(`[width ${width}] scrollWidth=${result.scrollWidth} clientWidth=${result.clientWidth} -> ${ok ? 'OK' : 'FAIL — horizontal overflow'}`)
  return ok
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // Scroll to #apps using Lenis, since it hijacks window.scrollTo.
  await page.evaluate(() => {
    const el = document.querySelector('#apps')
    if (window.__lenis && el) window.__lenis.scrollTo(el, { immediate: true })
    else if (el) el.scrollIntoView()
  })
  await page.waitForTimeout(2000)

  const cardCount = await page.locator('.suite-card').count()
  console.log('suite-card count:', cardCount)
  if (cardCount !== 6) console.log('FAIL — expected 6 cards')

  const imgResults = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.suite-art'))
    return imgs.map((img) => ({
      src: img.getAttribute('src'),
      complete: img.complete,
      naturalWidth: img.naturalWidth,
    }))
  })
  console.log('art images:', JSON.stringify(imgResults, null, 2))
  const badImgs = imgResults.filter((i) => !i.complete || i.naturalWidth === 0)
  if (badImgs.length) console.log('FAIL — images not loaded:', badImgs)
  else console.log(`OK — all ${imgResults.length} art images loaded`)

  const iconResults = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.suite-icon'))
    return imgs.map((img) => ({ src: img.getAttribute('src'), complete: img.complete, naturalWidth: img.naturalWidth }))
  })
  const badIcons = iconResults.filter((i) => !i.complete || i.naturalWidth === 0)
  if (badIcons.length) console.log('FAIL — icons not loaded:', badIcons)
  else console.log(`OK — all ${iconResults.length} icon images loaded`)

  await page.screenshot({ path: `${SCRATCH}/suite-1440.png`, fullPage: false })
  const section = page.locator('#apps')
  await section.screenshot({ path: `${SCRATCH}/suite-1440-section.png` })

  // 390 phone
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    const el = document.querySelector('#apps')
    if (window.__lenis && el) window.__lenis.scrollTo(el, { immediate: true })
    else if (el) el.scrollIntoView()
  })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${SCRATCH}/suite-390.png`, fullPage: false })
  await section.screenshot({ path: `${SCRATCH}/suite-390-section.png` })

  const w390 = await checkWidth(page, 390, 844)
  const w820 = await checkWidth(page, 820, 1180)
  const w1440 = await checkWidth(page, 1440, 900)

  console.log('console/page errors:', errors.length ? errors : 'none')

  await browser.close()

  const pass = cardCount === 6 && badImgs.length === 0 && badIcons.length === 0 && w390 && w820 && w1440
  console.log(pass ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED')
  process.exit(pass ? 0 : 1)
}

main()
