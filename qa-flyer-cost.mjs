// The butterfly costs the desktop ~33ms a frame. What, specifically?
// Reads the renderer's own counters, then re-measures frame time under a few
// single-variable changes applied live through the dev handle.
import { chromium } from 'playwright'

const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4930/', { waitUntil: 'load' })
await page.waitForTimeout(5500)
await page.evaluate(() => window.__lenis?.scrollTo(4000, { immediate: true }))
await page.waitForTimeout(2500)

const info = await page.evaluate(() => {
  const f = window.__loomFlyer
  if (!f) return { error: 'no dev handle — is this a dev build?' }
  const r = f.renderer
  let meshes = 0, mats = new Set()
  f.scene?.traverse?.((o) => { if (o.isMesh) { meshes++; mats.add(o.material?.uuid) } })
  return {
    drawCalls: r.info.render.calls,
    triangles: r.info.render.triangles,
    programs: r.info.programs?.length,
    geometries: r.info.memory.geometries,
    textures: r.info.memory.textures,
    meshes,
    materials: mats.size,
    pixelRatio: r.getPixelRatio(),
    size: (() => { const v = r.getSize(new (Object.getPrototypeOf(f.pos).constructor)()); return `${v.x}x${v.y}` })(),
    canvasPx: `${r.domElement.width}x${r.domElement.height}`,
    antialias: r.getContext().getContextAttributes().antialias,
    constrained: f.constrained,
  }
})
console.log('renderer:', JSON.stringify(info, null, 2))

// single-variable frame-time probes
const measure = async (label, setup) => {
  if (setup) await page.evaluate(setup)
  await page.waitForTimeout(700)
  const dts = await page.evaluate(() => new Promise((res) => {
    const out = []; let last = performance.now(); const t0 = last
    const H = document.documentElement.scrollHeight - window.innerHeight
    const tick = (now) => {
      out.push(now - last); last = now
      const el = now - t0
      if (el > 4000) return res(out.slice(1))
      window.__lenis?.scrollTo(3000 + (el / 4000) * (H * 0.35), { immediate: true })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }))
  dts.sort((a, b) => a - b)
  console.log(`  ${label.padEnd(34)} median ${dts[Math.floor(dts.length / 2)].toFixed(1)}ms   frames ${dts.length}`)
}

console.log('\nsingle-variable probes (warm-up first, then A/B/A):')
await measure('warm-up (discard)')
await measure('as shipped #1')
await measure('renderer stopped', () => window.__loomFlyer.stop())
await measure('restarted', () => window.__loomFlyer.start())
await measure('stopped again', () => window.__loomFlyer.stop())
await measure('as shipped #2', () => window.__loomFlyer.start())
await b.close()
