// The LOOM Crew — mascot cast. Cards tilt to the pointer, characters float,
// and picking one seeds the contact wizard with that discipline.
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { CREW_READY as CREW } from '../data/crew.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'
import './crew.css'

// True on coarse pointers (touch) — used to swap pointer-tilt for
// scroll-linked sway and hover-activate for tap-activate.
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return coarse
}

function CrewCard({ c, i, active, setActive }) {
  const reduced = useReducedMotion()
  const coarse = useCoarsePointer()
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const isOn = active === c.id

  const onMove = (e) => {
    if (reduced || coarse) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setTilt({ x: -py * 9, y: px * 11 })
  }
  const onLeave = () => setTilt({ x: 0, y: 0 })

  // Touch: pointer-tilt is dead, so sway a few degrees from the card's
  // own journey through the viewport instead — alive while scrolling.
  useEffect(() => {
    if (!coarse || reduced) return
    const el = ref.current
    if (!el) return
    let raf = null
    const update = () => {
      raf = null
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      const centerDelta = (r.top + r.height / 2) - vh / 2
      const progress = Math.max(-1, Math.min(1, centerDelta / (vh / 2 + r.height / 2)))
      setTilt({ x: progress * -3.5, y: progress * 5 })
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [coarse, reduced])

  // Touch: tapping a card activates its glow (tapping elsewhere deactivates,
  // wired at the grid level below).
  const onTap = () => { if (coarse) setActive(c.id) }

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
        onClick={onTap}
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
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
  const coarse = useCoarsePointer()
  const { open } = useWizard()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-8%', '8%'])

  // Touch: tapping outside any crew card clears the active glow.
  useEffect(() => {
    if (!coarse) return
    const onPointerDown = (e) => {
      if (!e.target.closest('.crew-card')) setActive(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [coarse])

  return (
    <section className="crew" id="crew" ref={ref}>
      <motion.div className="crew-bg" style={{ y: bgY }} aria-hidden="true" />
      <div className="section-head">
        <p className="kicker"><span>04</span> The Crew</p>
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
        <WoolButton
          label="Put the crew on my brand"
          yarn="violet"
          size="big"
          onClick={() => open({ note: 'Send me the crew' })}
        />
      </Reveal>
    </section>
  )
}
