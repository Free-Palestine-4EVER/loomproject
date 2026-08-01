// The Ascent — scroll-scrubbed moonrise. LOOM's emotional crescendo.
import { useMemo, useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { SplitWords } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import './moon.css'

const STAGES = [
  { n: '01', title: 'Rebrand', body: 'We find what you actually stand for, then make it unmistakable.' },
  { n: '02', title: 'Produce', body: 'Photography, film and 3D — generated at the volume your feed eats.' },
  { n: '03', title: 'Automate', body: 'AI agents that answer, book and sell while you sleep.' },
  { n: '04', title: 'Ascend', body: 'Then we push. New markets, new formats, new altitude.' },
]

// deterministic pseudo-random star field — no external images, no hydration jitter
function starShadows(count, w, h, seedStart) {
  let seed = seedStart
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  const out = []
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * w)
    const y = Math.round(rand() * h)
    const a = rand() > 0.82 ? 0.95 : 0.5
    out.push(`${x}px ${y}px 0 rgba(242,240,247,${a.toFixed(2)})`)
  }
  return out.join(',')
}

function StageCard({ stage, index, progress }) {
  const start = 0.1 + index * 0.19
  const opacity = useTransform(progress, [start, start + 0.13], [0, 1])
  const y = useTransform(progress, [start, start + 0.13], [34, 0])
  const side = index % 2 === 0 ? 'left' : 'right'
  return (
    <motion.div
      className={`moon-stage moon-stage--${side}`}
      style={{ opacity, y, top: `${78 - index * 19}%` }}
    >
      <span className="moon-stage-dot" aria-hidden="true" />
      <span className="moon-stage-n">{stage.n}</span>
      <h3 className="moon-stage-title">{stage.title}</h3>
      <p className="moon-stage-body">{stage.body}</p>
    </motion.div>
  )
}

export function Moon() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  const stars1 = useMemo(() => starShadows(110, 2000, 1300, 17), [])
  const stars2 = useMemo(() => starShadows(60, 2000, 1300, 401), [])

  const moonY = useTransform(scrollYProgress, [0, 1], ['48vh', '-4vh'])
  const moonScale = useTransform(scrollYProgress, [0, 1], [0.76, 1.14])
  const starsFarY = useTransform(scrollYProgress, [0, 1], ['0%', '-6%'])
  const starsNearY = useTransform(scrollYProgress, [0, 1], ['0%', '-15%'])
  const threadLength = useTransform(scrollYProgress, [0.03, 0.86], [0, 1])
  const finaleOpacity = useTransform(scrollYProgress, [0.83, 1], [0, 1])
  const finaleY = useTransform(scrollYProgress, [0.83, 1], [26, 0])
  const kickerOpacity = useTransform(scrollYProgress, [0, 0.08, 0.75, 0.9], [0, 1, 1, 0])

  if (reduced) {
    return (
      <section className="moon moon--static" id="ascent">
        <div className="moon-stage-fixed" aria-hidden="true">
          <div className="moon-halo" />
          <div className="moon-body">
            <span className="moon-crater moon-crater--1" />
            <span className="moon-crater moon-crater--2" />
            <span className="moon-crater moon-crater--3" />
            <span className="moon-crater moon-crater--4" />
          </div>
        </div>
        <p className="kicker kicker--light kicker--center"><span>07</span> The Ascent</p>
        <ul className="moon-static-list">
          {STAGES.map((s) => (
            <li key={s.n}>
              <span className="moon-stage-n">{s.n}</span>
              <h3 className="moon-stage-title">{s.title}</h3>
              <p className="moon-stage-body">{s.body}</p>
            </li>
          ))}
        </ul>
        <div className="moon-finale">
          <h2 className="moon-finale-h2">Reach the moon with us.</h2>
          <button className="btn btn--primary btn--big" onClick={() => open({ intent: 'grow' })}>
            Start the ascent
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="moon" id="ascent" ref={ref}>
      <div className="moon-sticky">
        <motion.span
          className="moon-stars moon-stars--far"
          style={{ boxShadow: stars1, y: starsFarY }}
          aria-hidden="true"
        />
        <motion.span
          className="moon-stars moon-stars--near"
          style={{ boxShadow: stars2, y: starsNearY }}
          aria-hidden="true"
        />

        <motion.p className="kicker kicker--light moon-kicker" style={{ opacity: kickerOpacity }}>
          <span>07</span> The Ascent
        </motion.p>

        <motion.div className="moon-body-wrap" style={{ y: moonY, scale: moonScale }} aria-hidden="true">
          <div className="moon-halo" />
          <div className="moon-body">
            <span className="moon-crater moon-crater--1" />
            <span className="moon-crater moon-crater--2" />
            <span className="moon-crater moon-crater--3" />
            <span className="moon-crater moon-crater--4" />
          </div>
        </motion.div>

        <svg className="moon-thread" viewBox="0 0 100 900" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="moonThreadGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f21c8c" />
              <stop offset="55%" stopColor="#7b2fbe" />
              <stop offset="100%" stopColor="#59e6ff" />
            </linearGradient>
            <filter id="moonThreadGlow" x="-200%" y="-20%" width="500%" height="140%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.path
            d="M50,895 C14,730 86,600 50,460 C18,330 82,190 50,20"
            fill="none"
            stroke="url(#moonThreadGrad)"
            strokeWidth="1.6"
            strokeLinecap="round"
            filter="url(#moonThreadGlow)"
            style={{ pathLength: threadLength }}
          />
        </svg>

        <div className="moon-stages">
          {STAGES.map((s, i) => (
            <StageCard key={s.n} stage={s} index={i} progress={scrollYProgress} />
          ))}
        </div>

        <motion.div className="moon-finale" style={{ opacity: finaleOpacity, y: finaleY }}>
          <SplitWords as="h2" className="moon-finale-h2" text="Reach the moon with us." />
          <button className="btn btn--primary btn--big" onClick={() => open({ intent: 'grow' })}>
            Start the ascent
          </button>
        </motion.div>
      </div>
    </section>
  )
}
