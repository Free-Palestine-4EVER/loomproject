// #typeface — the home page's own-typeface act. Three screens of scroll pinned
// to one viewport: the word flies together letter by letter, then blooms
// through all four planted cuts while a petal field drifts behind it, then
// hands over the copy and the CTAs.
//
// LOOM drew a whole typeface from nothing, so "we can make anything" is not a
// claim in this section — it is the thing you are reading.
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { EASE, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import './typeshowcase.css'

const WORD = 'BLOOM'

const CUTS = [
  { id: 'regular', label: 'Regular', family: 'LOOM Bloom', note: 'the face itself' },
  { id: 'rose', label: 'Rose', family: 'LOOM Bloom Rose', note: 'roses, leaves, a curling vine' },
  { id: 'daisy', label: 'Daisy', family: 'LOOM Bloom Daisy', note: 'twelve-petal daisies' },
  { id: 'tulip', label: 'Tulip', family: 'LOOM Bloom Tulip', note: 'tulips on their necks' },
  { id: 'ivy', label: 'Ivy', family: 'LOOM Bloom Ivy', note: 'trailing ivy, no bloom' },
]

const STATS = [['5', 'cuts'], ['67', 'glyphs each'], ['0', 'licences bought']]

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

export function TypeShowcase() {
  const wrap = useRef(null)
  const reduced = useReducedMotion()
  const near = useNearViewport(wrap)
  const { open: openWizard } = useWizard()
  const [live, setLive] = useState(0)

  const { scrollYProgress: p } = useScroll({ target: wrap, offset: ['start start', 'end end'] })

  // act one — the word assembles
  const kickerO = useTransform(p, [0, 0.05, 0.72, 0.8], [0, 1, 1, 0])
  const plainO = useTransform(p, [0.26, 0.34], [1, 0])
  // act three — the word steps back, the copy arrives
  const wordScale = useTransform(p, [0.72, 0.94], [1, 0.52])
  const wordY = useTransform(p, [0.72, 0.94], ['-50%', '-118%'])
  const copyO = useTransform(p, [0.78, 0.9], [0, 1])
  const copyY = useTransform(p, [0.78, 0.94], [50, 0])
  const bandX = useTransform(p, [0, 1], ['4%', '-22%'])
  const band2X = useTransform(p, [0, 1], ['-18%', '8%'])

  // which planted cut is on top right now — drives the rail's lit row
  useEffect(() => {
    const un = p.on('change', (v) => {
      const n = v < 0.3 ? 0 : Math.min(4, 1 + Math.floor((v - 0.3) / 0.11))
      setLive((c) => (c === n ? c : n))
    })
    return () => un()
  }, [p])

  return (
    <section className="ts" id="typeface" ref={wrap}>
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
          <span>◆</span> Our own typeface — five cuts, free
        </motion.p>

        {/* the word: one animated plain layer, four planted layers blooming through */}
        <motion.div className="ts-word" style={{ scale: wordScale, y: wordY }}>
          <motion.div className="ts-layer ts-layer--plain"
                      style={{ opacity: plainO, fontFamily: near ? 'LOOM Bloom' : undefined }}>
            {WORD.split('').map((ch, i) => (
              <Letter key={ch + i} p={p} i={i} ch={ch} reduced={reduced} />
            ))}
          </motion.div>
          {CUTS.slice(1).map((c, n) => (
            <Bloom key={c.id} p={p} n={n} family={near ? c.family : undefined} />
          ))}
        </motion.div>

        {/* the rail of cut names, lighting up as each one blooms */}
        <div className="ts-rail" aria-hidden="true">
          {CUTS.map((c, n) => (
            <span key={c.id} className={`ts-rail-item ${n === live ? 'is-live' : ''}`}>
              <i /> {c.label}
            </span>
          ))}
        </div>

        <motion.div className="ts-copy" style={{ opacity: copyO, y: copyY }}>
          <h2 className="ts-h2">We didn't license a font. We drew one.</h2>
          <p className="ts-lede">
            LOOM Bloom is a condensed display face in five cuts — one plain, four
            with a different flower cut out of every letter. Every outline was
            generated in our own pipeline: no foundry, no licence, no subscription.
            It is free to download, and it is the shortest answer to <em>“can you
            make…?”</em>
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
    </section>
  )
}

/** One planted cut of the word, blooming in over its slice of the scroll. */
function Bloom({ p, n, family }) {
  const a = 0.30 + n * 0.11
  const opacity = useTransform(p, [a, a + 0.07, a + 0.11, a + 0.18], n === 3 ? [0, 1, 1, 1] : [0, 1, 1, 0])
  const scale = useTransform(p, [a, a + 0.09], [1.06, 1])
  return (
    <motion.div className="ts-layer ts-layer--cut" style={{ opacity, scale, fontFamily: family }}>
      {WORD}
    </motion.div>
  )
}
