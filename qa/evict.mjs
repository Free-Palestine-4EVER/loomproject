/**
 * IS viewportBudget ACTUALLY EVICTING, AND DOES IT KEEP UP WITH A HARD SCROLL?
 *
 * The crash is iOS-only and only on a very fast scroll. Both of those point at
 * the eviction pass rather than at any individual image: viewportBudget.js runs
 * only where `pointer: coarse` matches, and its whole job is to stop a fast
 * flick from leaving every decoded bitmap on the page resident at once.
 *
 * Every previous measurement I took scrolled in steps WITH WAITS, which gives
 * eviction all the time in the world to catch up — so it reported a healthy
 * number no matter what. This one flicks as fast as the page will go and
 * samples continuously, which is the condition that actually crashes.
 *
 * What matters is not the peak on its own but the SHAPE: a working budget
 * plateaus, a broken one climbs and never comes back down.
 *
 *   node qa/evict.mjs <urlA> [urlB]
 */
import { chromium, devices } from 'playwright'

const urls = process.argv.slice(2)
if (!urls.length) { console.log('usage: node qa/evict.mjs <urlA> [urlB]'); process.exit(1) }

const b = await chromium.launch()

const run = async (url) => {
  const ctx = await b.newContext({ ...devices['iPhone 13'] })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'load' })
  await p.waitForTimeout(1800) // let the budget mount

  const budgetOn = await p.evaluate(() => matchMedia('(pointer: coarse)').matches)

  const series = await p.evaluate(async () => {
    const sample = () => {
      let bytes = 0, n = 0, blanked = 0
      for (const i of document.images) {
        if (!i.currentSrc || i.currentSrc.startsWith('data:')) { blanked++; continue }
        if (!i.naturalWidth) continue
        bytes += i.naturalWidth * i.naturalHeight * 4
        n++
      }
      return { mb: +(bytes / 1048576).toFixed(1), n, blanked }
    }
    const out = []
    const h = document.documentElement.scrollHeight
    // a HARD flick: no waiting for anything, just go
    for (let y = 0; y < h; y += 1400) {
      window.scrollTo(0, y)
      await new Promise((r) => requestAnimationFrame(r))
      out.push({ y, ...sample() })
    }
    // and back up, which is where a broken budget really shows
    for (let y = h; y > 0; y -= 1400) {
      window.scrollTo(0, y)
      await new Promise((r) => requestAnimationFrame(r))
      out.push({ y, ...sample() })
    }
    // then sit still and let it recover
    for (let k = 0; k < 8; k++) {
      await new Promise((r) => setTimeout(r, 400))
      out.push({ y: -1, ...sample() })
    }
    return out
  })

  await ctx.close()

  const during = series.filter((s) => s.y >= 0)
  const after = series.filter((s) => s.y < 0)
  const peak = during.reduce((a, s) => (s.mb > a.mb ? s : a), during[0])
  const settled = after[after.length - 1]
  return { budgetOn, peak, settled, during }
}

for (const url of urls) {
  const r = await run(url)
  console.log(`\n══ ${url}   (budget active: ${r.budgetOn})`)
  console.log(`   peak during hard scroll : ${r.peak.mb} MB  (${r.peak.n} decoded, ${r.peak.blanked} evicted)`)
  console.log(`   after settling          : ${r.settled.mb} MB  (${r.settled.n} decoded, ${r.settled.blanked} evicted)`)
  const recovered = r.peak.mb - r.settled.mb
  console.log(`   reclaimed after scroll  : ${recovered.toFixed(1)} MB  ${recovered < 5 ? '<-- NOT RECOVERING' : 'ok'}`)
  console.log(`   climb: ${r.during.filter((_, i) => i % 3 === 0).map((s) => s.mb).join(' → ')}`)
}

await b.close()
