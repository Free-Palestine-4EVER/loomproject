// Instrumented shake measurement for #solutions pinned stage.
// Usage: node shake.mjs <chromium|webkit> <width> <height> <label>
import { chromium, webkit } from 'playwright'
import fs from 'node:fs'

const [, , engineName, wStr, hStr, label] = process.argv
const width = parseInt(wStr, 10)
const height = parseInt(hStr, 10)
const engine = engineName === 'chromium' ? chromium : webkit

const b = await engine.launch()
const ctx = await b.newContext({ viewport: { width, height } })
const p = await ctx.newPage()
await p.goto('http://localhost:4930/', { waitUntil: 'networkidle' })
await p.waitForTimeout(800)

// find #solutions track top/bottom in document coords
const box = await p.evaluate(() => {
  const s = document.querySelector('#solutions')
  const pin = document.querySelector('.sol-pin.is-pinned') || document.querySelector('.sol-pin')
  if (!s || !pin) return null
  const r = pin.getBoundingClientRect()
  return { top: r.top + window.scrollY, h: pin.offsetHeight, vh: window.innerHeight }
})
if (!box) {
  console.log(JSON.stringify({ label, engine: engineName, width, height, error: 'no #solutions/.sol-pin found' }))
  await b.close()
  process.exit(0)
}

// Scroll well INSIDE the already-pinned range (not at the entry transition,
// which legitimately moves the inner box as it engages sticky/fixed), then
// scrub through a chunk of the pinned range in small increments, sampling
// rects each frame. 400px in is comfortably clear of the entry animation on
// every width this section ships at.
const startY = Math.max(0, Math.round(box.top + 400))
await p.evaluate((y) => window.scrollTo(0, y), startY)
// give any `use:reveal` entrance transition triggered by this jump-scroll
// (e.g. the merged act2 heading, if it had not yet crossed its
// IntersectionObserver threshold) time to fully settle before the timed
// scrub starts — otherwise the settle itself gets measured as if it were
// scroll-linked jitter, which is a test-harness artifact, not the bug.
await p.waitForTimeout(900)

const SELECTORS = {
  pinInner: '.sol-pin-inner',
  stage: '.sol-stage',
  photo: '.sol-stage-bg.is-on',
  bar: '.sol-bar',
  name: '.sol-answer-name',
  cta: '.sol-cta',
}

async function sampleAll() {
  return p.evaluate((sels) => {
    const out = {}
    for (const [k, sel] of Object.entries(sels)) {
      const e = document.querySelector(sel)
      if (!e) { out[k] = null; continue }
      const r = e.getBoundingClientRect()
      out[k] = { top: r.top, left: r.left }
    }
    return out
  }, SELECTORS)
}

const samples = { pinInner: [], stage: [], photo: [], bar: [], name: [], cta: [] }

// THE FIRST PASS (discrete Playwright round-trips, one scrollBy + a settle
// wait per CDP call) measured a clean 0px everywhere in both engines — CDP
// round-trip overhead (tens of ms) gives the compositor far longer than one
// real 16.7ms frame to settle between steps, so it cannot see a rounding
// artifact that only exists WHILE the compositor is actively resolving a
// sticky offset against fractional scroll deltas. So this loop runs entirely
// INSIDE the page via one evaluate call: real consecutive rAF frames, no
// cross-process round trip between them, and FRACTIONAL scroll deltas
// (15.37, 14.63, ... alternating) rather than whole pixels — a real
// trackpad/momentum scroll lands on sub-pixel offsets constantly, and
// fractional-offset sticky recomputation independent of a blurred
// compositor layer's own fractional rounding is exactly the mechanism
// under suspicion.
const N = 180
const STEP_SELECTORS = SELECTORS
const raw = await p.evaluate(async ({ sels, n }) => {
  const out = {}
  for (const k of Object.keys(sels)) out[k] = []
  const deltas = [15.37, 14.63, 15.81, 14.19, 15.5, 14.5]
  for (let i = 0; i < n; i++) {
    window.scrollBy(0, deltas[i % deltas.length])
    await new Promise((r) => requestAnimationFrame(r))
    for (const [k, sel] of Object.entries(sels)) {
      const e = document.querySelector(sel)
      if (!e) continue
      const r = e.getBoundingClientRect()
      out[k].push({ top: r.top, left: r.left })
    }
  }
  return out
}, { sels: STEP_SELECTORS, n: N })
for (const k of Object.keys(samples)) samples[k] = raw[k] || []

function peakToPeak(arr, axis) {
  if (!arr.length) return null
  const vals = arr.map((v) => v[axis])
  return Math.max(...vals) - Math.min(...vals)
}
// oscillation metric: sum of |delta reversals| — a monotonic drift (expected,
// since during the pin the whole point is NOT moving, so top should be
// perfectly constant; any nonzero range already IS the shake) — but also
// report direction-reversal count to distinguish jitter from smooth drift.
function reversals(arr, axis) {
  const vals = arr.map((v) => v[axis])
  let rev = 0
  let dir = 0
  for (let i = 1; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1]
    if (Math.abs(d) < 1e-6) continue
    const nd = Math.sign(d)
    if (dir !== 0 && nd !== dir) rev++
    dir = nd
  }
  return rev
}

const report = { label, engine: engineName, width, height, metrics: {} }
for (const [k, arr] of Object.entries(samples)) {
  if (!arr.length) { report.metrics[k] = 'not found / never sampled'; continue }
  report.metrics[k] = {
    n: arr.length,
    topP2P: +peakToPeak(arr, 'top').toFixed(3),
    leftP2P: +peakToPeak(arr, 'left').toFixed(3),
    topReversals: reversals(arr, 'top'),
  }
}
report.raw = { stageTop: samples.stage.map((v) => +v.top.toFixed(2)) }
console.log(JSON.stringify(report, null, 2))

// pixel-diff on the pinned inner across two consecutive small steps, at a
// stable point mid-scrub (industries several past the first, so the fade
// cross-transition isn't mid-flight).
try {
  const pinInner = await p.$('.sol-pin-inner')
  if (pinInner) {
    const dir = '/private/tmp/claude-501/-Users-hideyourkids/d306c176-e993-4840-83fb-6a59436d7dc4/scratchpad/shots'
    fs.mkdirSync(dir, { recursive: true })
    const shots = []
    for (let i = 0; i < 4; i++) {
      const buf = await pinInner.screenshot()
      shots.push(buf)
      await p.evaluate((s) => window.scrollBy(0, s), 15.4)
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    }
    shots.forEach((buf, i) => fs.writeFileSync(`${dir}/${label}-${engineName}-${width}-frame${i}.png`, buf))
  }
} catch (e) {
  console.error('screenshot diff failed:', e.message)
}

await b.close()
