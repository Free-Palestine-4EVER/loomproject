/**
 * COMPOSITOR LAYER BACKING STORE — the memory no bitmap probe can see.
 *
 * qa/memory.mjs sums decoded bitmaps (`w * h * 4`). That is only half of what a
 * page costs. The other half is the compositor: every element promoted to its
 * own layer gets a backing store of `layerWidth * layerHeight * 4` bytes in GPU
 * memory, and a full-bleed layer on a phone at DPR 3 is ~12 MB on its own —
 * before a single image. Promotion is triggered by transforms, opacity/filter
 * animations, `will-change`, `position: fixed`, backdrop-filter and more, so a
 * page can be getting LIGHTER on bitmaps while getting much heavier in the
 * compositor. That is exactly the trap this file exists to close: the industry
 * tour rewrite cut bitmaps by 44 MB and still killed the tab.
 *
 * Chromium only (CDP LayerTree), so treat it as a comparative instrument
 * between two builds rather than an absolute prediction of iOS behaviour.
 *
 *   node qa/layers.mjs <urlA> [urlB]
 */
import { chromium, devices } from 'playwright'

const urls = process.argv.slice(2)
if (!urls.length) { console.log('usage: node qa/layers.mjs <urlA> [urlB]'); process.exit(1) }

const b = await chromium.launch()

const measure = async (url) => {
  const ctx = await b.newContext({ ...devices['iPhone 13'] })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('DOM.enable')
  await cdp.send('LayerTree.enable')

  let latest = []
  cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) latest = e.layers })

  await p.goto(url, { waitUntil: 'load' })
  await p.waitForTimeout(1500)

  const samples = []
  const h = await p.evaluate(() => document.documentElement.scrollHeight)
  const steps = 14
  for (let i = 0; i <= steps; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), Math.round((h - 800) * (i / steps)))
    await p.waitForTimeout(420)
    const layers = latest
    let bytes = 0
    let big = []
    for (const l of layers) {
      const w = Math.round(l.width || 0), ht = Math.round(l.height || 0)
      if (!w || !ht) continue
      const bts = w * ht * 4
      bytes += bts
      big.push({ mb: +(bts / 1048576).toFixed(1), size: `${w}x${ht}` })
    }
    samples.push({ at: Math.round((i / steps) * 100), count: layers.length, mb: +(bytes / 1048576).toFixed(1), big })
  }
  await ctx.close()

  const peak = samples.reduce((a, s) => (s.mb > a.mb ? s : a), samples[0])
  return { peak, samples }
}

for (const url of urls) {
  const r = await measure(url)
  console.log(`\n══ ${url}`)
  console.log(`   peak layer backing store: ${r.peak.mb} MB across ${r.peak.count} layers (at ${r.peak.at}% down the page)`)
  const top = r.peak.big.sort((a, x) => x.mb - a.mb).slice(0, 6)
  console.log(`   biggest layers: ${top.map((t) => `${t.mb}MB ${t.size}`).join(' · ')}`)
  console.log(`   profile: ${r.samples.map((s) => `${s.at}%:${s.mb}`).join('  ')}`)
}

await b.close()
