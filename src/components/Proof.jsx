// ————————————————————————————————————————————————————————
// PROOF — slot 3, and the section that has to survive a sceptic.
//
// It replaces two weak neighbours with one strong one:
//
//   Marquee  — nineteen client names sliding past at a speed nobody reads
//              them at. A scrolling strip is a decoration that happens to
//              contain the most valuable words on the page: UNICEF, Vodafone,
//              Benetton. Motion was doing the opposite of its job.
//   Stats    — four CountUps in a row over a weave photograph. The numbers
//              were true and said nothing: "7" over the word "Countries
//              shipped to" is a fact with no claim attached, and the client's
//              verdict on it was blunt.
//
// The fix is not a third row of chrome. It is to make the two halves argue
// with each other: the names are the evidence, the numbers are the summary,
// and each number now carries the clause that says why it matters. Nothing
// here is a new claim — every value still comes from STATS and CLIENT_WALL in
// data/site.js, so the "verify every number" rule has exactly one place to
// check, as before.
//
// THE THREE ANCHORS. Benetton, UNICEF and Vodafone are set brighter than the
// other sixteen. Not favouritism — they are the three names a stranger in
// Amman or Sarajevo already knows, and a wall where every name is equally
// bright is a wall where none of them lands. The rest are not dimmed to hide
// them; they are the volume, and volume is a different argument from
// recognition.
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
  // page that reads as actual cloth. `once: false` is deliberate elsewhere on
  // this page; here the parallax is scroll-linked, so there is nothing to
  // re-trigger.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-10%', '10%'])

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

      {/* THE WALL. Real, wrappable, selectable text set as one block — not a
          marquee track, not a logo grid. Nobody has the logos cleared for use
          and a wall of mismatched PNGs would look worse than the words do;
          the names in the studio's own display face read as a colophon, which
          is the honest form for "here is who we have worked with". */}
      <div className="proof-wall" ref={wallRef}>
        {CLIENT_WALL.map((name, i) => (
          <motion.span
            key={name}
            className={`proof-name${ANCHORS.has(name) ? ' is-anchor' : ''}`}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={wallIn ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: reduced ? 0.01 : 0.5, delay: reduced ? 0 : i * 0.035, ease: EASE }}
          >
            {name}
            {i < CLIENT_WALL.length - 1 && <i className="proof-sep" aria-hidden="true">✳</i>}
          </motion.span>
        ))}
      </div>

      {/* THE SUMMARY. Same four numbers, given the clause that turns each one
          from a fact into a claim, and set as a rail rather than four boxed
          cells — the dividers were doing more work than the content. */}
      <div className="proof-stats">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} y={20} className="proof-stat" style={{ '--yarn': STAT_YARN[i % 4] }}>
            <div className="proof-value"><CountUp value={s.value} suffix={s.suffix} /></div>
            <p className="proof-label">{s.label}</p>
            {STAT_CLAUSE[s.label] && <p className="proof-clause">{STAT_CLAUSE[s.label]}</p>}
          </Reveal>
        ))}
      </div>
    </section>
  )
}
