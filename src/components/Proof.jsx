// ————————————————————————————————————————————————————————
// PROOF — slot 3, and the section that has to survive a sceptic.
//
// It already replaced two weak neighbours (a marquee sliding the most valuable
// words on the page past at a speed nobody reads them at, and four CountUps
// with no claim attached). REDESIGNED AGAIN 10 Aug 2026, for the four faults
// the client named across the page:
//
//   Weak hierarchy — head, then wall, then a four-column stat rail: three
//                    stacked blocks of equal weight, so nothing led. The
//                    headline says "these names already said yes" and then
//                    the eye landed on a row of numbers.
//   Templated      — a four-across stat rail is the same shape as every other
//                    four-across row on the page.
//   Too tall       — three full-width bands stacked is the tallest possible
//                    arrangement of this much content.
//   Flat           — a weave photograph at 0.16 opacity behind flat type.
//
// NOW: one split. The names take the left and stay the hero — they are what
// the headline points at — and the four numbers become a narrow right-hand
// rail read as a column, not a row. Side by side instead of stacked is most of
// the height saving; the rest is that the rail no longer needs its own
// full-width band of air above and below it.
//
// THE THREE ANCHORS. Benetton, UNICEF and Vodafone are set brighter than the
// other sixteen. Not favouritism — they are the three names a stranger in
// Amman or Sarajevo already knows, and a wall where every name is equally
// bright is a wall where none of them lands. The rest are not dimmed to hide
// them; they are the volume, and volume is a different argument from
// recognition.
//
// NOTHING HERE IS A NEW CLAIM — every value still comes from STATS and
// CLIENT_WALL in data/site.js, so the "verify every number" rule has exactly
// one place to check, as before.
// ————————————————————————————————————————————————————————
import { useRef } from 'react'
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { CLIENT_WALL, STATS } from '../data/site.js'
import { EASE, SplitWords, Reveal, CountUp } from '../lib/motion.jsx'

import './proof.css'

// The clause each number was missing. STATS carries the value and the label;
// this carries the "so what". Keyed by label so a reordered STATS cannot
// silently pair a number with the wrong sentence — an index would.
const STAT_CLAUSE = {
  'Brands woven': 'Identity, content, product — not one campaign each.',
  'Countries shipped to': 'Jordan to Bosnia to the Gulf, in two languages.',
  'Apps & tools in the lab': 'Built for ourselves first, then for clients.',
  'Studios — Amman × Sarajevo': 'When one sleeps, the other is already sewing.',
}

const ANCHORS = new Set(['United Colors of Benetton', 'UNICEF', 'Vodafone'])

const STAT_YARN = ['var(--magenta)', 'var(--yarn-blue)', 'var(--yarn-violet)', 'var(--yarn-gold)']

export function Proof() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const wallRef = useRef(null)
  const wallIn = useInView(wallRef, { once: true, margin: '-18% 0px' })

  // A slow counter-drift on the backdrop only — the weave photograph the old
  // Stats section already carried, kept because it is the one texture on the
  // page that reads as actual cloth.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-8%', '8%'])

  return (
    <section className="proof" id="proof" aria-label="Clients and studio in numbers" ref={ref}>
      <motion.div className="proof-bg" style={{ y }} aria-hidden="true">
        <picture style={{ display: 'contents' }}>
          <source media="(max-width: 767px)" type="image/avif" srcSet="/img/weave-alt-sm.avif" />
          <source media="(max-width: 767px)" type="image/webp" srcSet="/img/weave-alt-sm.webp" />
          <source type="image/avif" srcSet="/img/weave-alt.avif" />
          <img src="/img/weave-alt.webp" alt="" loading="lazy" />
        </picture>
      </motion.div>

      <div className="proof-head">
        <p className="kicker"><span>—</span> Proof</p>
        <SplitWords as="h2" className="h2 proof-h2" text="These names already said yes." />
      </div>

      {/* ——— THE SPLIT ———
          Names left (the hero — the headline points at them), numbers right
          (the summary). Two columns instead of three stacked bands. */}
      <div className="proof-split">
        {/* THE WALL. Real, wrappable, selectable text set as one block — not a
            marquee track, not a logo grid. Nobody has the logos cleared for
            use and a wall of mismatched PNGs would look worse than the words
            do; the names in the studio's own display face read as a colophon,
            which is the honest form for "here is who we have worked with". */}
        <div className="proof-wall" ref={wallRef}>
          {CLIENT_WALL.map((name, i) => (
            <motion.span
              key={name}
              className={`proof-name${ANCHORS.has(name) ? ' is-anchor' : ''}`}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={wallIn ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: reduced ? 0.01 : 0.5, delay: reduced ? 0 : i * 0.03, ease: EASE }}
            >
              {name}
              {i < CLIENT_WALL.length - 1 && <i className="proof-sep" aria-hidden="true">✳</i>}
            </motion.span>
          ))}
        </div>

        {/* THE RAIL. The same four numbers, read as a column. Each keeps the
            clause that turns it from a fact into a claim, and its own yarn
            stub — the whole chrome budget, replacing the old divider cross. */}
        <div className="proof-rail">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.07} y={16} className="proof-stat" style={{ '--yarn': STAT_YARN[i % 4] }}>
              <div className="proof-value"><CountUp value={s.value} suffix={s.suffix} /></div>
              <div className="proof-stat-copy">
                <p className="proof-label">{s.label}</p>
                {STAT_CLAUSE[s.label] && <p className="proof-clause">{STAT_CLAUSE[s.label]}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
