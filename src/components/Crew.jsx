// The LOOM Crew — mascot cast. Cards tilt to the pointer, characters float,
// and picking one seeds the contact wizard with that discipline.
import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { CREW } from '../data/crew.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import './crew.css'

function CrewCard({ c, i, active, setActive }) {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const isOn = active === c.id

  const onMove = (e) => {
    if (reduced) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setTilt({ x: -py * 9, y: px * 11 })
  }
  const onLeave = () => setTilt({ x: 0, y: 0 })

  return (
    <Reveal delay={i * 0.08} className="crew-cell">
      <motion.article
        ref={ref}
        className={`crew-card ${isOn ? 'is-on' : ''}`}
        style={{ '--accent': c.accent }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onFocus={() => setActive(c.id)}
        onMouseEnter={() => setActive(c.id)}
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        data-cursor
      >
        <div className="crew-glow" aria-hidden="true" />
        <div className="crew-stage">
          <motion.img
            src={c.img} alt={`${c.name} — ${c.role}, the LOOM mascot for ${c.owns}`}
            loading="lazy"
            animate={reduced ? {} : { y: [0, -10, 0] }}
            transition={{ duration: 4.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="crew-shadow" aria-hidden="true" />
        </div>
        <div className="crew-meta">
          <span className="crew-role">{c.role}</span>
          <h3 className="crew-name">{c.name}</h3>
          <p className="crew-owns">{c.owns}</p>
          <p className="crew-line">{c.line}</p>
          <p className="crew-quote">“{c.quote}”</p>
        </div>
      </motion.article>
    </Reveal>
  )
}

export function Crew() {
  const [active, setActive] = useState(null)
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-8%', '8%'])

  return (
    <section className="crew" id="crew" ref={ref}>
      <motion.div className="crew-bg" style={{ y: bgY }} aria-hidden="true" />
      <div className="section-head">
        <p className="kicker"><span>06</span> The Crew</p>
        <SplitWords as="h2" className="h2" text="Four characters. One loom." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Every discipline at LOOM has a face. Meet the crew that shows up for your brand —
            each one woven from the same thread, each one very good at exactly one thing.
          </p>
        </Reveal>
      </div>

      <div className="crew-grid">
        {CREW.map((c, i) => (
          <CrewCard key={c.id} c={c} i={i} active={active} setActive={setActive} />
        ))}
      </div>

      <Reveal delay={0.2} className="crew-cta">
        <p>Pick a problem — we’ll send the right one.</p>
        <button className="btn btn--primary btn--big" onClick={() => open({ note: 'Send me the crew' })}>
          Put the crew on my brand
        </button>
      </Reveal>
    </section>
  )
}
