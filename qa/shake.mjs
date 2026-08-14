/**
 * WHERE IS THE PINNED SECTION VIBRATING?
 *
 * The client has reported a shake in #solutions on Safari through four separate
 * fixes now — two compositor-layer hints, a JS-driven pin (reverted), and the
 * removal of every remount and src-mutation from the scrub. Rebuilding the tour
 * on `animation-timeline` did not end it either, which is the point of this
 * probe: if the shake survives a change of driver, the driver was never it.
 *
 * A `position: sticky; top: 0` box has exactly one correct value for
 * `getBoundingClientRect().top` while it is parked: 0, on every frame. Anything
 * else is the pin arriving late, and the size of the deviation is the size of
 * the shake. Every box INSIDE it should likewise hold one top and one height
 * for the whole scrub — a box that resizes per industry is a shake that no
 * amount of compositor hinting will fix, because nothing is lagging, something
 * is genuinely moving.
 *
 * So this samples every candidate box on every animation frame during a real
 * wheel scroll and reports the spread of each. Run:
 *   node qa/shake.mjs [url] [chromium|webkit]
 */
import { chromium, webkit, devices } from 'playwright'

const URL = process.argv[2] || 'http://localhost:5199'
const ENGINE = process.argv[3] || 'webkit'
const browserType = ENGINE === 'chromium' ? chromium : webkit

const TARGETS = {
  'pin-inner (the sticky box)': '.sol-pin-inner',
  'search bar': '.sol-bar',
  'stage (the photograph)': '.sol-stage',
  'card slot': '.sol-answer-slot',
  'progress rail': '.sol-tour',
  'section head': '.sol-act2',
}

const run = async (label, contextOpts, wheelStep) => {
  const b = await browserType.launch()
  const ctx = await b.newContext(contextOpts)
  const p = await ctx.newPage()
  await p.goto(URL, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)

  // park at the top of the track, then wheel through it while sampling
  await p.evaluate(() => {
    const pin = document.querySelector('.sol-pin')
    window.scrollTo({ top: pin.getBoundingClientRect().top + window.scrollY + 40, behavior: 'instant' })
  })
  await p.waitForTimeout(400)

  await p.evaluate((targets) => {
    window.__samples = []
    window.__stop = false
    const els = Object.fromEntries(
      Object.entries(targets).map(([k, sel]) => [k, document.querySelector(sel)])
    )
    const tick = () => {
      if (window.__stop) return
      const row = { y: window.scrollY }
      for (const [k, el] of Object.entries(els)) {
        if (!el) continue
        const r = el.getBoundingClientRect()
        row[k] = { top: r.top, h: r.height }
      }
      /* the brightest layer's opacity, frame by frame. Under a steady scroll
         this must move monotonically; a value that goes up, back down and up
         again inside one dissolve is the fade STEPPING, which reads as exactly
         the shimmer a positional probe reports as perfectly still. */
      let hi = 0
      for (const l of document.querySelectorAll('.sol-stage-bg')) {
        const o = +getComputedStyle(l).opacity
        if (o > hi) hi = o
      }
      row.topOpacity = hi
      window.__samples.push(row)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, TARGETS)

  /* FRACTIONAL deltas, deliberately. A trackpad does not deliver whole pixels,
     and a probe that steps by round numbers cannot see rounding: a sticky box
     resolved against a fractional scroll offset can land on a different device
     pixel from one frame to the next while its CSS `top` never stops reading
     0. That is a shake nothing in the layout is responsible for, and it is
     invisible to every measurement taken so far on this section. */
  for (let i = 0; i < 90; i++) {
    await p.mouse.wheel(0, wheelStep + (i % 3) * 0.37 + 0.13)
    await p.waitForTimeout(16)
  }
  await p.evaluate(() => { window.__stop = true })

  const samples = await p.evaluate(() => window.__samples)
  await b.close()

  // only the frames where the box is actually parked are meaningful
  const parked = samples.filter((s) => s['pin-inner (the sticky box)'] && Math.abs(s['pin-inner (the sticky box)'].top) < 200)
  console.log(`\n── ${label} · ${ENGINE} · ${parked.length} parked frames of ${samples.length} ──`)
  if (parked.length < 10) { console.log('   not enough parked frames — the track never pinned'); return }

  for (const key of Object.keys(TARGETS)) {
    const tops = parked.map((s) => s[key]?.top).filter((v) => v !== undefined)
    const hs = parked.map((s) => s[key]?.h).filter((v) => v !== undefined)
    if (!tops.length) { console.log(`   ${key.padEnd(28)} — not present`); continue }
    const spread = (a) => +(Math.max(...a) - Math.min(...a)).toFixed(2)
    const dTop = spread(tops)
    const dH = spread(hs)
    // how many DISTINCT heights — one is correct, more than one is the box
    // genuinely resizing under the scrub rather than lagging
    const distinctH = new Set(hs.map((v) => v.toFixed(1))).size
    const flag = dTop > 1 || dH > 1 ? '  ⚠️' : ''
    console.log(`   ${key.padEnd(28)} top spread ${String(dTop).padStart(7)}px   height spread ${String(dH).padStart(7)}px   distinct heights ${distinctH}${flag}`)
  }

  /* the sticky box against the DEVICE pixel grid. `top` reading 0.00 every
     frame is not the same as the box landing on the same physical pixel every
     frame: at dpr 2 a half-pixel of scroll offset is a whole device pixel of
     movement, and that is a visible shimmer on a full-bleed photograph. */
  const dpr = contextOpts.deviceScaleFactor || 1
  const pinTops = parked.map((s) => s['pin-inner (the sticky box)']?.top).filter((v) => v !== undefined)
  const devicePx = pinTops.map((t) => Math.round(t * dpr) / dpr)
  const distinctDevice = new Set(devicePx.map((v) => v.toFixed(3)))
  console.log(`   ${'└ sticky box on the pixel grid'.padEnd(28)} dpr ${dpr} · ${distinctDevice.size} distinct device-pixel positions${distinctDevice.size > 1 ? '  ⚠️  SUB-PIXEL SHAKE' : ''}`)

  const ops = parked.map((s) => s.topOpacity).filter((v) => v !== undefined)
  let reversals = 0
  for (let i = 2; i < ops.length; i++) {
    const a = ops[i - 2], b = ops[i - 1], c = ops[i]
    if ((b - a) * (c - b) < -1e-6) reversals++
  }
  console.log(`   ${'└ dissolve opacity'.padEnd(28)} ${reversals} direction reversals across ${ops.length} frames${reversals > 4 ? '  ⚠️  THE FADE IS STEPPING' : ''}`)
}

await run('desktop 1440×900', { viewport: { width: 1440, height: 900 } }, 40)
await run('desktop retina 1440×900 @2x', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, 40)
