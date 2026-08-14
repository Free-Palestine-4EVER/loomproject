/**
 * The industry tour, after it stopped being JavaScript (14 Aug 2026).
 *
 * The section pins and one scroll walks the visitor through thirty industries.
 * That behaviour is unchanged; what changed is that `animation-timeline` drives
 * it instead of a scroll listener, so the things worth asserting are the ones
 * that can only be got wrong in the new mechanism:
 *
 *   1. THE CARD AND THE PHOTOGRAPH AGREE. They are two independent animations
 *      over the same timeline with deliberately different ranges (the dissolve
 *      is wider than the card's hold), so an arithmetic slip in either one
 *      shows up as copy describing a different trade than the picture. Sampled
 *      mid-slice, where they must be identical, and on the handover boundary,
 *      where the dissolve is allowed to be mid-flight but the DOMINANT layer
 *      must already be the card's own.
 *   2. THE STAGE IS NEVER BLANK. `fill: both` resolves out-of-range layers to
 *      a keyframe, and getting the first or last one wrong empties the stage on
 *      the approach into the section or after the release out of it — a failure
 *      that is invisible in the middle of the track, which is where anyone
 *      testing by hand would look.
 *   3. THE ARM WINDOW HOLDS. `sol-arm-*` replaced a JS mount window and a JS
 *      lookahead; if its ranges are wrong the section either fetches all thirty
 *      renders (the regression the JS existed to prevent) or fetches the
 *      current one at the instant it is needed (the decode-on-a-visible-element
 *      that reads as flicker).
 *   4. SEARCH MOVES THE TRACK. The fix for "typing froze the tour": a resolved
 *      query scrolls to that industry's slice rather than overriding the stage,
 *      so after typing, the scroll position and the stage must agree.
 *
 * Run against a dev or preview server: node qa/tour.mjs [url]
 */
import { chromium } from 'playwright'

const URL = process.argv[2] || 'http://localhost:5199'
const fail = []
const ok = (cond, msg) => { if (!cond) fail.push(msg); return cond }

const b = await chromium.launch()

/* ——— desktop ——— */
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()

const imgReqs = []
p.on('request', (r) => { if (/\/img\/niches\//.test(r.url())) imgReqs.push(r.url()) })

await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)

const geo = await p.evaluate(() => {
  const pin = document.querySelector('.sol-pin')
  if (!pin || !pin.classList.contains('is-pinned')) return null
  return {
    top: pin.getBoundingClientRect().top + window.scrollY,
    total: pin.offsetHeight - window.innerHeight,
    layers: document.querySelectorAll('.sol-stage-bg').length,
    cards: document.querySelectorAll('.sol-tourcard').length,
    ticks: document.querySelectorAll('.sol-tour-tick').length,
    supports: CSS.supports('animation-timeline', 'view()'),
  }
})
if (!geo) { console.log('FAIL: .sol-pin.is-pinned not found — the tour did not mount'); await b.close(); process.exit(1) }

console.log(`timeline support: ${geo.supports}   layers: ${geo.layers}   cards: ${geo.cards}   ticks: ${geo.ticks}`)
ok(geo.layers === 30, `expected 30 layers, got ${geo.layers}`)
ok(geo.cards === 30, `expected 30 cards, got ${geo.cards}`)
ok(geo.ticks === 30, `expected 30 ticks, got ${geo.ticks}`)

const N = 30
const beforeTrack = imgReqs.length
console.log(`renders fetched before the track is entered: ${beforeTrack}`)
ok(beforeTrack <= 2, `${beforeTrack} niche renders fetched before the tour was reached — the arm window is opening too early`)

const sample = async (slice) => {
  await p.evaluate(({ slice, top, total, N }) => {
    window.scrollTo({ top: top + (slice / N) * total, behavior: 'instant' })
  }, { slice, top: geo.top, total: geo.total, N })
  await p.waitForTimeout(90)
  return p.evaluate(() => {
    const layers = [...document.querySelectorAll('.sol-stage-bg')]
    const cards = [...document.querySelectorAll('.sol-tourcard')]
    const ops = layers.map((e) => +getComputedStyle(e).opacity)
    let dom = 0
    for (let i = 1; i < ops.length; i++) if (ops[i] > ops[dom]) dom = i
    return {
      card: cards.findIndex((e) => getComputedStyle(e).visibility === 'visible'),
      dom,
      domOp: ops[dom],
      ops,
      lit: ops.filter((o) => o > 0.02).length,
      armed: layers.filter((e) => getComputedStyle(e).backgroundImage !== 'none').length,
      name: cards.find((e) => getComputedStyle(e).visibility === 'visible')
        ?.querySelector('.sol-answer-name')?.textContent?.trim(),
    }
  })
}

let maxArmed = 0
const rows = []
for (let i = 0; i < N; i++) {
  const mid = await sample(i + 0.5)
  maxArmed = Math.max(maxArmed, mid.armed)
  rows.push({ slice: i + 0.5, ...mid })
  ok(mid.card === i, `mid-slice ${i}: card is ${mid.card}, expected ${i}`)
  ok(mid.dom === i, `mid-slice ${i}: dominant layer is ${mid.dom}, expected ${i}`)
  ok(mid.domOp > 0.99, `mid-slice ${i}: dominant layer only at opacity ${mid.domOp.toFixed(2)} — the hold is too short`)

  if (i < N - 1) {
    /* The handover itself. A dissolve is expected here and asserting an exact
       winner would be asserting a floating-point tie: by construction the
       outgoing and incoming layers are both at 0.5 on the boundary, which is
       the whole point of straddling it. What must hold is that NEITHER has run
       ahead — the card's own layer has to be level with the brightest one. An
       earlier build failed this at the last boundary only, where a clipped
       range had compressed the incoming ramp so it finished early. */
    const edge = await sample(i + 1)
    maxArmed = Math.max(maxArmed, edge.armed)
    ok(
      edge.card >= 0 && Math.abs(edge.ops[edge.card] - edge.domOp) < 0.06,
      `boundary ${i}→${i + 1}: card ${edge.card} sits at opacity ${edge.ops[edge.card]?.toFixed(2)} while layer ${edge.dom} is at ${edge.domOp.toFixed(2)} — the picture is running ahead of the copy`
    )
    ok(edge.lit > 0, `boundary ${i}→${i + 1}: nothing lit, the stage went blank`)
  }
}

console.log(`\nfirst three: ${rows.slice(0, 3).map((r) => r.name).join(' · ')}`)
console.log(`last three:  ${rows.slice(-3).map((r) => r.name).join(' · ')}`)
console.log(`most layers armed at once: ${maxArmed}`)
ok(maxArmed <= 13, `${maxArmed} renders armed at once — the arm window is too wide`)
ok(maxArmed >= 3, `only ${maxArmed} armed — the lookahead is not running, decodes will land on visible layers`)

/* the two ends, where `fill: both` decides what shows */
for (const [where, slice] of [['approach', -0.4], ['release', N + 0.4]]) {
  const s = await sample(slice)
  ok(s.lit > 0, `${where}: the stage is blank outside the track`)
  ok(s.card >= 0, `${where}: no card is showing outside the track`)
  console.log(`${where}: ${s.name}`)
}

/* ——— the search fix ——— */
await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
await p.waitForTimeout(200)
await p.fill('#sol-search', 'cafe')
await p.waitForTimeout(400)
const search = await p.evaluate(() => {
  const pin = document.querySelector('.sol-pin')
  const top = pin.getBoundingClientRect().top + window.scrollY
  const total = pin.offsetHeight - window.innerHeight
  const cards = [...document.querySelectorAll('.sol-tourcard')]
  const shown = cards.find((e) => getComputedStyle(e).visibility === 'visible')
  return {
    name: shown?.querySelector('.sol-answer-name')?.textContent?.trim(),
    progress: (window.scrollY - top) / total,
    insideTrack: window.scrollY >= top && window.scrollY <= top + total,
  }
})
console.log(`\nsearch "cafe" → ${search.name} at ${(search.progress * 100).toFixed(1)}% of the track`)
ok(search.name === 'Cafés & Coffee', `search resolved to "${search.name}", expected Cafés & Coffee`)
ok(search.insideTrack, 'search did not move the scroll position into the track — the tour and the query disagree')

/* and the tour still drives afterwards: scrolling on from a search result must
   keep advancing rather than staying frozen on the query's answer */
const after = await sample(20.5)
ok(after.card === 20, `after a search, mid-slice 20 shows card ${after.card} — the tour stopped driving`)

await ctx.close()

/* ——— phone: the portrait render has to be the one that loads ——— */
const mctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })
const mp = await mctx.newPage()
const mReqs = []
mp.on('request', (r) => { if (/\/img\/niches\//.test(r.url())) mReqs.push(r.url()) })
await mp.goto(URL, { waitUntil: 'networkidle' })
await mp.waitForTimeout(800)
await mp.evaluate(() => {
  const pin = document.querySelector('.sol-pin')
  const top = pin.getBoundingClientRect().top + window.scrollY
  window.scrollTo({ top: top + (pin.offsetHeight - window.innerHeight) * 0.35, behavior: 'instant' })
})
await mp.waitForTimeout(500)
const portrait = mReqs.filter((u) => /-9x16\./.test(u)).length
const wide = mReqs.filter((u) => !/-9x16\./.test(u)).length
console.log(`\nphone: ${portrait} portrait renders, ${wide} wide renders fetched`)
ok(portrait > 0, 'phone fetched no portrait render — the 719px source switch is not firing')
ok(wide === 0, `phone fetched ${wide} wide renders — the source switch and the box shape disagree`)

await mctx.close()

/* ——— THE FALLBACK PATH ———
   Reduced motion, and by the same code path any engine without scroll-driven
   animation: no pin, no timeline, one industry showing, changed by the search
   field and the index. The thing that can quietly break here is the pair of
   `.is-on` rules — they are the only thing holding the other twenty-nine cards
   and layers down once no animation is running over them, and nothing on the
   normal path would ever reveal it. */
const rctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
const rp = await rctx.newPage()
const rReqs = []
rp.on('request', (r) => { if (/\/img\/niches\//.test(r.url())) rReqs.push(r.url()) })
await rp.goto(URL, { waitUntil: 'networkidle' })
await rp.waitForTimeout(900)

const flat = await rp.evaluate(() => {
  const pin = document.querySelector('.sol-pin')
  const cards = [...document.querySelectorAll('.sol-tourcard')]
  const layers = [...document.querySelectorAll('.sol-stage-bg')]
  return {
    pinned: pin?.classList.contains('is-pinned'),
    trackScreens: +(pin.offsetHeight / window.innerHeight).toFixed(1),
    visibleCards: cards.filter((e) => getComputedStyle(e).visibility === 'visible').length,
    litLayers: layers.filter((e) => +getComputedStyle(e).opacity > 0.02).length,
    rail: !!document.querySelector('.sol-tour'),
  }
})
console.log(`\nreduced motion: pinned=${flat.pinned}  track=${flat.trackScreens} screens  cards showing=${flat.visibleCards}  layers lit=${flat.litLayers}`)
ok(!flat.pinned, 'reduced motion still pinned the section — the scroll is being hijacked')
ok(flat.trackScreens < 2, `reduced motion track is ${flat.trackScreens} screens tall — it should be an ordinary block`)
ok(flat.visibleCards === 1, `${flat.visibleCards} cards showing at once with no animation running — the .is-on fallback is not holding`)
ok(flat.litLayers === 1, `${flat.litLayers} layers lit with no animation running — the .is-on fallback is not holding`)
ok(!flat.rail, 'the progress rail is showing on a section that does not scrub')
ok(rReqs.length <= 2, `reduced motion fetched ${rReqs.length} renders for a section showing one photograph`)

/* and it is still usable: the search field is the whole control surface here */
await rp.fill('#sol-search', 'law')
await rp.waitForTimeout(300)
const rSearch = await rp.evaluate(() => {
  const c = [...document.querySelectorAll('.sol-tourcard')].find((e) => getComputedStyle(e).visibility === 'visible')
  return c?.querySelector('.sol-answer-name')?.textContent?.trim()
})
console.log(`reduced motion, search "law" → ${rSearch}`)
ok(rSearch === 'Law Firms', `fallback search resolved to "${rSearch}", expected Law Firms`)

await b.close()

console.log(fail.length ? `\n${fail.length} FAILURE(S):\n · ${fail.join('\n · ')}` : '\nALL CHECKS PASSED')
process.exit(fail.length ? 1 : 0)
