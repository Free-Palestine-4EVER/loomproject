// #typeface — the home page's own-typeface act. Three screens of scroll pinned
// to one viewport: the word flies together letter by letter, then blooms
// through all four planted cuts while a petal field drifts behind it, then
// hands over the copy and the CTAs.
//
// LOOM drew a whole typeface from nothing, so "we can make anything" is not a
// claim in this section — it is the thing you are reading.
//
// Act three exists in THREE interchangeable compositions — Split / Stage /
// Specimen — each with its own desktop and mobile numbers. See
// ./bloomLayouts.js for what they are and how one is chosen; this file only
// spends the numbers that file hands it. Acts one and two (the word flying
// together, the four cuts blooming) are the same in all three.
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useMotionTemplate, useReducedMotion } from 'motion/react'
import { EASE, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import {
  LAYOUT_MOTION, resolveInitialLayoutId, isExplicitLayoutSelection,
  bindLayoutHotkeys, formatLayoutHud,
} from './bloomLayouts.js'
import './typeshowcase.css'

const WORD = 'BLOOM'

const CUTS = [
  { id: 'regular', label: 'Regular', family: 'LOOM Bloom', note: 'the face itself' },
  { id: 'rose', label: 'Rose', family: 'LOOM Bloom Rose', note: 'a millefleur of spiral roses' },
  { id: 'daisy', label: 'Daisy', family: 'LOOM Bloom Daisy', note: 'packed open daisies' },
  { id: 'tulip', label: 'Tulip', family: 'LOOM Bloom Tulip', note: 'three-lobed tulip cups' },
  { id: 'ivy', label: 'Ivy', family: 'LOOM Bloom Ivy', note: 'a Morris vine, no bloom' },
  { id: 'wild', label: 'Wild', family: 'LOOM Bloom Wild', note: 'six species, overhanging' },
  { id: 'hollow', label: 'Hollow', family: 'LOOM Bloom Hollow', note: 'the letter as an outline' },
  { id: 'meadow', label: 'Meadow', family: 'LOOM Bloom Meadow', note: 'flowers up from the baseline' },
]

// The planted cuts share the scroll between them, so this file never hard-codes
// how many there are — adding a cut to CUTS above re-times the whole sequence.
const PLANTED = CUTS.length - 1
const BLOOM_FROM = 0.28
const BLOOM_TO = 0.80
const BLOOM_STEP = (BLOOM_TO - BLOOM_FROM) / Math.max(1, PLANTED - 1)

const STATS = [['8', 'cuts'], ['98', 'glyphs each'], ['0', 'licences bought']]

// deterministic scatter — the same letters land the same way on every visit
const SCATTER = [
  { x: -46, y: -120, r: -14 }, { x: 34, y: 140, r: 11 }, { x: -22, y: -170, r: 7 },
  { x: 40, y: 120, r: -9 }, { x: -30, y: -140, r: 13 },
]

/** True once the node has been within a screen of the viewport. Never flips back. */
function useNearViewport(ref, margin = '800px') {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (!('IntersectionObserver' in window)) { setNear(true); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setNear(true); io.disconnect() }
    }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, near, margin])
  return near
}

/** One letter of the plain word, flying in from its own scatter. */
function Letter({ p, i, ch, reduced }) {
  const s = SCATTER[i % SCATTER.length]
  const end = 0.06 + i * 0.026
  const range = [Math.max(0, end - 0.16), end]
  const y = useTransform(p, range, [s.y * (reduced ? 0 : 1), 0])
  const x = useTransform(p, range, [s.x * (reduced ? 0 : 1), 0])
  const rotate = useTransform(p, range, [s.r * (reduced ? 0 : 1), 0])
  const opacity = useTransform(p, range, [0, 1])
  return <motion.span className="ts-ltr" style={{ x, y, rotate, opacity }}>{ch}</motion.span>
}

/** The drifting field of ornament glyphs behind the word. Canvas, not DOM. */
function Petals({ active, reduced }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || reduced) return
    const ctx = cv.getContext('2d')
    let raf, w = 0, h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const glyphs = ['❀', '✿', '❦']
    // seeded so the field is identical every mount — no layout lottery
    let seed = 7
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const bits = Array.from({ length: 46 }, () => ({
      x: rnd(), y: rnd(), s: 16 + rnd() * 52, v: 0.12 + rnd() * 0.5,
      g: glyphs[Math.floor(rnd() * 3)], a: 0.05 + rnd() * 0.12, rot: rnd() * Math.PI * 2,
      spin: (rnd() - 0.5) * 0.004,
    }))
    const size = () => {
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = w * dpr; cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    window.addEventListener('resize', size)
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const b of bits) {
        b.y -= b.v / h
        b.rot += b.spin
        if (b.y < -0.12) { b.y = 1.12; b.x = rnd() }
        ctx.save()
        ctx.translate(b.x * w, b.y * h)
        ctx.rotate(b.rot)
        ctx.globalAlpha = b.a
        ctx.fillStyle = '#f21c8c'
        ctx.font = `${b.s}px "LOOM Bloom", sans-serif`
        ctx.fillText(b.g, 0, 0)
        ctx.restore()
      }
      raf = requestAnimationFrame(draw)
    }
    if (active) raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [active, reduced])
  return <canvas ref={ref} className="ts-petals" aria-hidden="true" />
}

/** `true` while the viewport is at or under the section's mobile breakpoint. */
function useNarrow(query = '(max-width: 900px)') {
  const [narrow, setNarrow] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
  ))
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(query)
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return narrow
}

// Public entry. Owns only the CHOICE of layout, and remounts Act (via `key`)
// whenever the layout or the breakpoint changes — every useTransform below
// reads its ranges from that choice, and a scroll transform that is handed
// new ranges mid-life keeps the old ones. A remount is the honest way to
// re-derive them, and it costs nothing: the section is scroll-driven, so
// there is no in-flight animation state to lose.
export function TypeShowcase() {
  const [layout, setLayout] = useState(resolveInitialLayoutId)
  const narrow = useNarrow()
  const [hud, setHud] = useState(() => import.meta.env.DEV || isExplicitLayoutSelection())

  useEffect(() => bindLayoutHotkeys((id) => { setLayout(id); setHud(true) }), [])

  return (
    <>
      <Act key={`${layout}-${narrow ? 'm' : 'd'}`} layout={layout} narrow={narrow} />
      {hud && (
        <div className="ts-hud" aria-hidden="true">{formatLayoutHud(layout)}</div>
      )}
    </>
  )
}

function Act({ layout, narrow }) {
  const wrap = useRef(null)
  const reduced = useReducedMotion()
  const near = useNearViewport(wrap)
  const { open: openWizard } = useWizard()
  const [live, setLive] = useState(0)
  const M = LAYOUT_MOTION[layout][narrow ? 'm' : 'd']

  const { scrollYProgress: p } = useScroll({ target: wrap, offset: ['start start', 'end end'] })

  // act one — the word assembles
  const kickerO = useTransform(p, [0, 0.05, 0.72, 0.8], [0, 1, 1, 0])
  const plainO = useTransform(p, [0.26, 0.34], [1, 0])
  // act three — the word steps back, the copy arrives. Every range comes
  // from the active layout's numbers; the shape of the graph never changes,
  // only the destinations, which is what keeps all three switchable live.
  const [b0, b1] = M.beat
  const wordScale = useTransform(p, [b0, b1], M.wordScale)
  const wordY = useTransform(p, [b0, b1], M.wordY)
  const wordX = useTransform(p, [b0, b1], M.wordX)
  const wordO = useTransform(p, [b0, b1], M.wordFade)
  const wordBlurPx = useTransform(p, [b0, b1], M.wordBlur)
  const wordFilter = useMotionTemplate`blur(${wordBlurPx}px)`
  const copyO = useTransform(p, [b0 + 0.06, b1 - 0.04], [0, 1])
  const copyY = useTransform(p, [b0 + 0.06, b1], [M.copyFrom.y, 0])
  const copyX = useTransform(p, [b0 + 0.06, b1], [M.copyFrom.x, 0])
  const bandX = useTransform(p, [0, 1], ['4%', '-22%'])
  const band2X = useTransform(p, [0, 1], ['-18%', '8%'])

  // which planted cut is on top right now — drives the rail's lit row
  useEffect(() => {
    const un = p.on('change', (v) => {
      const n = v < BLOOM_FROM ? 0
        : Math.min(PLANTED, 1 + Math.floor((v - BLOOM_FROM) / BLOOM_STEP))
      setLive((c) => (c === n ? c : n))
    })
    return () => un()
  }, [p])

  return (
    <section className={`ts ts--${layout}`} id="typeface" ref={wrap}>
      <div className="ts-sticky">
        <Petals active={near} reduced={reduced} />

        {/* two bands of alphabet drifting opposite ways */}
        <div className="ts-bands" aria-hidden="true">
          <motion.div className="ts-band" style={{ x: reduced ? 0 : bandX, fontFamily: near ? 'LOOM Bloom' : undefined }}>
            ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
          </motion.div>
          <motion.div className="ts-band ts-band--low" style={{ x: reduced ? 0 : band2X, fontFamily: near ? 'LOOM Bloom Rose' : undefined }}>
            ROSE ✿ DAISY ❀ TULIP ❦ IVY ✿ ROSE ❀ DAISY
          </motion.div>
        </div>

        <motion.p className="ts-kicker" style={{ opacity: kickerO }}>
          <span>◆</span> Our own typeface — eight cuts, free
        </motion.p>

        {/* the word: one animated plain layer, four planted layers blooming through */}
        {/* Three nested boxes, one job each: the anchor CENTRES the word (pure
            CSS, so no motion value has to spend itself on centring), the shift
            TRAVELS it in viewport units, the word SCALES. Splitting travel from
            scale is what lets a layout say "30vh down" and mean it — a single
            element would have to express that as a percentage of its own
            clamp()ed line box, which changes with the width.

            `filter` is attached only where a layout actually blurs: a live
            `blur(0px)` still forces the word onto its own rasterised layer
            every frame, which is real cost for no pixels. */}
        <div className="ts-word-anchor">
        <motion.div
          className="ts-word-shift"
          style={{
            x: wordX, y: wordY, opacity: wordO,
            ...(M.wordBlur[1] ? { filter: wordFilter } : null),
          }}
        >
        <motion.div className="ts-word" style={{ scale: wordScale }}>
          <motion.div className="ts-layer ts-layer--plain"
                      style={{ opacity: plainO, fontFamily: near ? 'LOOM Bloom' : undefined }}>
            {WORD.split('').map((ch, i) => (
              <Letter key={ch + i} p={p} i={i} ch={ch} reduced={reduced} />
            ))}
          </motion.div>
          {CUTS.slice(1).map((c, n) => (
            <Bloom key={c.id} p={p} n={n} last={n === PLANTED - 1}
                   family={near ? c.family : undefined} />
          ))}
        </motion.div>
        </motion.div>
        </div>

        {/* the rail of cut names, lighting up as each one blooms */}
        <div className="ts-rail" aria-hidden="true">
          {CUTS.map((c, n) => (
            <span key={c.id} className={`ts-rail-item ${n === live ? 'is-live' : ''}`}>
              <i /> {c.label}
            </span>
          ))}
        </div>

        {/* The slot does the PLACING (it is what each layout repositions), the
            block inside does the MOVING — so a layout can park the copy
            anywhere with plain CSS without fighting the scroll transform. */}
        <div className="ts-copy-slot">
          <motion.div className="ts-copy" style={{ opacity: copyO, y: copyY, x: copyX }}>
            <h2 className="ts-h2">We didn't license a font. We drew one.</h2>
            <p className="ts-lede">
              A condensed display face in eight cuts — one plain, seven with a
              garden cut out of every letter.{' '}
              <span className="ts-lede-more">
                Every outline was generated in our own pipeline: no foundry, no
                licence, no subscription.{' '}
              </span>
              Free to download, and the shortest answer we have to{' '}
              <em>“can you make…?”</em>
            </p>
            <div className="ts-stats">
              {STATS.map(([n, l]) => (
                <div className="ts-stat" key={l}>
                  <span className="ts-stat-n" style={{ fontFamily: near ? 'LOOM Bloom' : undefined }}>{n}</span>
                  <span className="ts-stat-l">{l}</span>
                </div>
              ))}
            </div>
            <div className="ts-cta">
              <Magnetic strength={0.2}>
                <a className="ts-btn ts-btn--fill" href="/type">
                  Open the specimen<span aria-hidden="true">→</span>
                </a>
              </Magnetic>
              <button
                className="ts-btn"
                onClick={() => openWizard({ intent: 'brand', note: 'I want a custom typeface / lettering system.' })}
              >Commission your own</button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/** One planted cut of the word, blooming in over its slice of the scroll. */
function Bloom({ p, n, last, family }) {
  const a = BLOOM_FROM + n * BLOOM_STEP
  const opacity = useTransform(
    p,
    [a, a + BLOOM_STEP * 0.64, a + BLOOM_STEP, a + BLOOM_STEP * 1.64],
    last ? [0, 1, 1, 1] : [0, 1, 1, 0],
  )
  const scale = useTransform(p, [a, a + BLOOM_STEP * 0.82], [1.06, 1])
  return (
    <motion.div className="ts-layer ts-layer--cut" style={{ opacity, scale, fontFamily: family }}>
      {WORD}
    </motion.div>
  )
}
