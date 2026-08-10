// Where does the desktop scroll actually lose its frames?
// Drives a steady scroll down the whole page and records per-frame intervals
// plus every long task, attributed to the band of the page it happened in.
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const kill = (name) => args.includes('--no-' + name)

// REAL GPU, NOT SWIFTSHADER. Headless Chromium defaults to a software GL
// (ANGLE/SwiftShader), where 77k triangles cost what a whole page costs and
// every conclusion about "the 3D layer is the lag" comes out true whether it
// is or not. Verified with WEBGL_debug_renderer_info: without these flags this
// machine reports "SwiftShader driver", with them "ANGLE Metal Renderer: Apple
// M4". Any perf claim made from this file has to be made on the second one.
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] })
const page = await b.newPage({ viewport: { width: 1440, height: 900 } })

// Flyer.jsx bails on `navigator.connection.saveData`, which is the one switch
// that turns off the BUTTERFLY without touching the hero's PlanetField.
if (kill('flyer')) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true }) })
  })
}
if (kill('gl')) {
  // refuse every WebGL context: kills the flyer AND the hero field at once
  await page.addInitScript(() => {
    const g = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (t, ...r) {
      if (String(t).includes('webgl')) return null
      return g.call(this, t, ...r)
    }
  })
}

await page.goto('http://localhost:4930/', { waitUntil: 'load' })
await page.waitForTimeout(5500)   // let the hero settle and the flyer boot

const res = await page.evaluate(() => new Promise((resolve) => {
  const frames = []
  const longs = []
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) longs.push({ d: Math.round(e.duration), at: Math.round(window.scrollY) })
  }).observe({ entryTypes: ['longtask'] })

  const H = document.documentElement.scrollHeight - window.innerHeight
  const DUR = 12000
  const t0 = performance.now()
  let last = t0
  const tick = (now) => {
    const el = now - t0
    frames.push({ dt: now - last, y: Math.round(window.scrollY) })
    last = now
    if (el >= DUR) return resolve({ frames, longs, H })
    const y = (el / DUR) * H
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}))

const dts = res.frames.map((f) => f.dt).slice(1)
dts.sort((a, b) => a - b)
const pct = (p) => dts[Math.floor(dts.length * p)].toFixed(1)
const dropped = dts.filter((d) => d > 20).length
const bad = dts.filter((d) => d > 50).length
console.log(`label: ${args.join(' ') || 'baseline'}`)
console.log(`  frames ${dts.length}   median ${pct(0.5)}ms   p90 ${pct(0.9)}ms   p99 ${pct(0.99)}ms   max ${dts[dts.length - 1].toFixed(0)}ms`)
console.log(`  >20ms (a dropped frame): ${dropped} (${((dropped / dts.length) * 100).toFixed(1)}%)   >50ms (visible hitch): ${bad}`)
console.log(`  long tasks: ${res.longs.length}, total ${res.longs.reduce((a, x) => a + x.d, 0)}ms`)
// which part of the page hurt
const bands = {}
for (const f of res.frames) {
  if (f.dt <= 20) continue
  const band = Math.floor(f.y / 2000) * 2000
  bands[band] = (bands[band] || 0) + 1
}
const worst = Object.entries(bands).sort((a, b) => b[1] - a[1]).slice(0, 6)
console.log('  worst scroll bands (scrollY -> dropped frames):', worst.map(([y, n]) => `${y}:${n}`).join('  '))
await b.close()
