// Page sections: Hero, Marquee, Manifesto, Services, Process, AiLoom, Stats, Studios, Contact
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { BRAND, CLIENT_WALL, SERVICES, PROCESS, STATS } from '../data/site.js'
import { EASE, SplitWords, Reveal, CountUp, Magnetic } from '../lib/motion.jsx'
import { HeroField } from '../three/HeroField.js'
import { ContactWizard } from './ContactWizard.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { ServiceVisual, ProcessGlyph, ThreadDivider, StatSpark } from './Rich.jsx'
import './sections-stage.css'

export function Hero() {
  const { open: openWizard } = useWizard()
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    let field
    try {
      field = new HeroField(canvasRef.current, { reduced })
    } catch (e) {
      // WebGL unavailable — CSS gradient fallback stays visible
      canvasRef.current.style.display = 'none'
      return
    }
    const onScroll = () => {
      const h = window.innerHeight
      field.setScroll(Math.min(window.scrollY / h, 1.4))
    }
    const onMouse = (e) => {
      field.setMouse((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
    }
    const io = new IntersectionObserver(([en]) => {
      if (reduced) return
      en.isIntersecting ? field.start() : field.stop()
    })
    io.observe(wrapRef.current)
    const onVis = () => { if (!reduced) document.hidden ? field.stop() : field.start() }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('mousemove', onMouse, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouse)
      document.removeEventListener('visibilitychange', onVis)
      io.disconnect()
      field.dispose()
    }
  }, [reduced])

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start start', 'end start'] })
  const yType = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '38%'])
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  return (
    <section className="hero" id="top" ref={wrapRef}>
      <div className="hero-canvas-wrap" aria-hidden="true">
        <canvas ref={canvasRef} className="hero-canvas" />
        <div className="hero-vignette" />
      </div>
      <motion.div className="hero-type" style={{ y: yType, opacity: fade }}>
        <motion.p
          className="hero-eyebrow"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.8, ease: EASE }}
        >
          {BRAND.positioning} — Amman <span className="x">×</span> Sarajevo
        </motion.p>
        <h1 className="hero-h1">
          <span className="hero-line"><motion.span initial={{ y: '108%' }} animate={{ y: '0%' }} transition={{ delay: 1.35, duration: 1, ease: EASE }}>We weave brands</motion.span></span>
          <span className="hero-line hero-line--accent"><motion.span initial={{ y: '108%' }} animate={{ y: '0%' }} transition={{ delay: 1.47, duration: 1, ease: EASE }}>on the edge</motion.span></span>
          <span className="hero-line"><motion.span initial={{ y: '108%' }} animate={{ y: '0%' }} transition={{ delay: 1.59, duration: 1, ease: EASE }}>of creativity<span className="dot">.</span></motion.span></span>
        </h1>
        <motion.p
          className="hero-sub"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8, ease: EASE }}
        >
          Branding, campaigns, AI systems and CGI for brands across the Gulf, the Balkans and beyond.
          Trends don’t lead our work — thinking does.
        </motion.p>
        <motion.div
          className="hero-ctas"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.95, duration: 0.8, ease: EASE }}
        >
          <Magnetic><button className="btn btn--primary" onClick={() => openWizard({})}>Start a project</button></Magnetic>
          <Magnetic><a className="btn btn--ghost" href="#work" data-scroll>See the work</a></Magnetic>
        </motion.div>
      </motion.div>
      <motion.div
        className="hero-scrollhint" aria-hidden="true"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}
        style={{ opacity: fade }}
      >
        <span>Scroll</span><i />
      </motion.div>
    </section>
  )
}

export function Marquee() {
  const row = [...CLIENT_WALL, ...CLIENT_WALL]
  return (
    <section className="marquee" aria-label="Selected clients">
      <div className="marquee-track">
        {row.map((c, i) => (
          <span key={i} aria-hidden={i >= CLIENT_WALL.length}>{c}<em>✳</em></span>
        ))}
      </div>
    </section>
  )
}

/** Manifesto headline: words fill from --ink-faint to full white as the reader
 *  scrolls through the section — thread pulling taut through cloth, not a
 *  once-on-enter reveal. Driven by the SAME section scroll progress the media
 *  parallax uses, just windowed to the entrance so it resolves before the
 *  reader is even a third of the way down. */
function ManifestoHeadline({ text, progress, reduced }) {
  const words = useMemo(() => text.split(' '), [text])
  const n = words.length
  return (
    <h2 className="h2 manifesto-ink" aria-label={text}>
      {words.map((w, i) => (
        <InkWord
          key={i}
          word={w}
          last={i === n - 1}
          progress={progress}
          range={[i / n, Math.min(1, (i + 0.72) / n)]}
          reduced={reduced}
        />
      ))}
    </h2>
  )
}

function InkWord({ word, last, progress, range, reduced }) {
  const color = useTransform(progress, range, ['#6b6284', '#ffffff'])
  if (reduced) {
    return (
      <span className="ink-word" aria-hidden="true" style={{ color: '#fff' }}>
        {word}{!last && ' '}
      </span>
    )
  }
  return (
    <motion.span className="ink-word" aria-hidden="true" style={{ color }}>
      {word}{!last && ' '}
    </motion.span>
  )
}

export function Manifesto() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yImg = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-8%', '8%'])
  const inkProgress = useTransform(scrollYProgress, [0.08, 0.4], [0, 1])
  const ruleScale = useTransform(scrollYProgress, [0.08, 0.4], [0, 1])
  return (
    <section className="manifesto" ref={ref}>
      <div className="manifesto-grid">
        <div className="manifesto-copy">
          <p className="kicker"><span>01</span> Manifesto</p>
          <ManifestoHeadline
            text="Trends don’t lead our work. Thinking does."
            progress={inkProgress}
            reduced={reduced}
          />
          <motion.span
            className="manifesto-ink-rule" aria-hidden="true"
            style={{ scaleX: reduced ? 1 : ruleScale }}
          />
          <Reveal delay={0.15}>
            <p className="lede" style={{ marginTop: 18 }}>
              LOOM is two studios threaded through one machine — Amman for the engine, Sarajevo for
              the eye. We build brands the way looms build cloth: one decision at a time, under
              tension, until it holds.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <p className="body-dim">
              Creativity doesn’t live in comfort zones. It lives on the edge — where emotion meets
              logic, aesthetics meet performance, and every idea is backed by working technology.
            </p>
          </Reveal>
        </div>
        <div className="manifesto-media">
          <div className="manifesto-frame" data-cursor>
            <motion.img
              src="/img/weave-key.webp" alt="Iridescent particle weave — LOOM brand artwork"
              style={{ y: yImg }} loading="lazy"
            />
          </div>
          <p className="manifesto-caption">The edge is intentional.</p>
        </div>
      </div>
    </section>
  )
}

export function Services() {
  const [active, setActive] = useState(null)
  return (
    <section className="services" id="services">
      <div className="section-head">
        <p className="kicker"><span>02</span> Capabilities</p>
        <SplitWords as="h2" className="h2" text="Everything a brand needs. Nothing it doesn’t." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Six disciplines, one tension. Pull any thread and the rest of the machine moves with it.
          </p>
        </Reveal>
      </div>
      <ul className="svc-list">
        {SERVICES.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.05}>
            <li
              className={`svc ${active === i ? 'is-open' : ''}`}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            >
              <button
                className="svc-row"
                aria-expanded={active === i}
                onClick={() => setActive(active === i ? null : i)}
              >
                <span className="svc-n">{s.n}</span>
                <span className="svc-title">{s.title}</span>
                <span className="svc-arrow" aria-hidden="true">→</span>
              </button>
              <div className="svc-body">
                <div className="svc-body-inner">
                  <div className="svc-copy">
                    <p>{s.blurb}</p>
                    <div className="svc-tags">{s.tags.map((t) => <span key={t}>{t}</span>)}</div>
                  </div>
                  <div className="svc-visual"><ServiceVisual n={s.n} /></div>
                </div>
              </div>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

/** Measures the four .process-card stations relative to the grid that holds
 *  them and hands back the exact points a connecting thread needs — a top
 *  node for the desktop horizontal line, a left node for the mobile vertical
 *  one. Real DOM measurement beats a guessed percentage split because the
 *  gap between cards is a clamp(), not a fixed value. */
function useProcessThread(count, reduced) {
  const gridRef = useRef(null)
  const cardRefs = useRef([])
  const [pts, setPts] = useState(null)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const measure = () => {
      const gRect = grid.getBoundingClientRect()
      const next = cardRefs.current.slice(0, count).map((el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return {
          top: r.top - gRect.top,
          left: Math.max(0, r.left - gRect.left),
          cx: r.left - gRect.left + r.width / 2,
          cy: r.top - gRect.top + r.height / 2,
        }
      })
      if (next.every(Boolean)) setPts({ w: gRect.width, h: gRect.height, cards: next })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(grid)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [count])

  const { scrollYProgress } = useScroll({ target: gridRef, offset: ['start 0.85', 'end 0.45'] })
  const [lit, setLit] = useState(() => (reduced ? count : 0))
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (reduced) return
    const n = Math.max(0, Math.min(count, Math.round(p * count)))
    setLit((prev) => (prev === n ? prev : n))
  })

  return { gridRef, cardRefs, pts, scrollYProgress, lit }
}

const STRIP = 38 // .process-stage padding-top, desktop only — see sections-stage.css

export function Process() {
  const reduced = useReducedMotion()
  const count = PROCESS.length
  const { gridRef, cardRefs, pts, scrollYProgress, lit } = useProcessThread(count, reduced)

  const hD = pts && pts.cards.length === count
    ? `M ${pts.cards[0].cx} ${STRIP / 2} ` + pts.cards.slice(1).map((c) => `L ${c.cx} ${STRIP / 2}`).join(' ')
    : ''
  const vX = pts && pts.cards[0] ? pts.cards[0].left / 2 : 0
  const vD = pts && pts.cards.length === count
    ? `M ${vX} ${pts.cards[0].cy} ` + pts.cards.slice(1).map((c) => `L ${vX} ${c.cy}`).join(' ')
    : ''

  return (
    <section className="process">
      <ThreadDivider />
      <div className="section-head">
        <p className="kicker"><span>10</span> Process</p>
        <SplitWords as="h2" className="h2" text="One process. No templates. No shortcuts." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Four stations on one line. Your brand enters as raw thread and leaves wearing itself.
          </p>
        </Reveal>
      </div>
      <div className="process-stage">
        {pts && (
          <svg
            className="process-linewrap process-linewrap--h"
            width={pts.w} height={STRIP} viewBox={`0 0 ${pts.w} ${STRIP}`}
            aria-hidden="true"
          >
            <motion.path
              className="pt-line" d={hD} fill="none" stroke="var(--violet)" strokeWidth="1.6" strokeLinecap="round"
              style={{ pathLength: reduced ? 1 : scrollYProgress }}
            />
            {pts.cards.map((c, i) => (
              <circle key={i} className={`pt-node ${i < lit ? 'is-lit' : ''}`} cx={c.cx} cy={STRIP / 2} r="4.5" />
            ))}
          </svg>
        )}
        {pts && (
          <svg
            className="process-linewrap process-linewrap--v"
            width={Math.max(vX * 2, 1)} height={pts.h} viewBox={`0 0 ${Math.max(vX * 2, 1)} ${pts.h}`}
            aria-hidden="true"
          >
            <motion.path
              className="pt-line" d={vD} fill="none" stroke="var(--violet)" strokeWidth="1.6" strokeLinecap="round"
              style={{ pathLength: reduced ? 1 : scrollYProgress }}
            />
            {pts.cards.map((c, i) => (
              <circle key={i} className={`pt-node ${i < lit ? 'is-lit' : ''}`} cx={vX} cy={c.cy} r="4.5" />
            ))}
          </svg>
        )}
        <div className="process-grid" ref={gridRef}>
          {PROCESS.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.08} className="process-cell">
              <div
                className={`process-card ${i < lit ? 'is-lit' : ''}`}
                ref={(el) => { cardRefs.current[i] = el }}
                data-cursor
              >
                <div className="process-glyph"><ProcessGlyph n={p.n} /></div>
                <span className="process-n">{p.n}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <i className="process-thread" aria-hidden="true" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function AiLoom() {
  const { open: openWizard } = useWizard()
  const LINES = [
    ['Generative campaign imagery', 'art-directed, on-brand, at volume'],
    ['AI film & motion', 'launch spots without a film crew'],
    ['Content engines', 'calendars that fill themselves'],
    ['Chat & voice agents', 'brands that answer at 3am'],
    ['Automation pipelines', 'from brief to published, hands-off'],
  ]
  return (
    <section className="ailoom">
      <div className="ailoom-inner">
        <p className="kicker kicker--light"><span>03</span> The AI Loom</p>
        <SplitWords as="h2" className="h2 h2--light" text="Human taste. Machine scale." />
        <Reveal>
          <p className="lede lede--light">
            We build AI into the loom itself — generative systems trained on your brand, run by
            people with taste. The output is volume; the standard is craft.
          </p>
        </Reveal>
        <ul className="ailoom-list">
          {LINES.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.06}>
              <li><strong>{t}</strong><span>{d}</span></li>
            </Reveal>
          ))}
        </ul>
        <div className="ailoom-cta">
          <Magnetic><button className="btn btn--primary" onClick={() => openWizard({ note: 'Interested in the AI systems' })}>Put AI in my brand</button></Magnetic>
        </div>
      </div>
      <div className="ailoom-art" aria-hidden="true">
        <img src="/img/ai-loom.webp" alt="" loading="lazy" />
      </div>
      <div className="ailoom-glow" aria-hidden="true" />
    </section>
  )
}

export function Stats() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-12%', '12%'])
  return (
    <section className="stats" aria-label="Studio in numbers" ref={ref}>
      <motion.div className="stats-bg" style={{ y }} aria-hidden="true">
        <img src="/img/weave-alt.webp" alt="" loading="lazy" />
      </motion.div>
      <div className="stats-grid">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07} className="stat">
            <div className="stat-value"><CountUp value={s.value} suffix={s.suffix} /></div>
            <div className="stat-label">{s.label}</div>
            <StatSpark seed={i + 3} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function useCityTime(tz) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => setTime(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date()))
    fmt()
    const id = setInterval(fmt, 30_000)
    return () => clearInterval(id)
  }, [tz])
  return time
}

/** Measures the Amman and Sarajevo cards and builds a single quadratic-bezier
 *  arc between their top edges — a thread pulled taut over the two studios,
 *  not through them. Apex is the true bezier midpoint, not a guess, so the
 *  "2,100 km" label always sits exactly on the line. */
function useTwoCityArc() {
  const stageRef = useRef(null)
  const cardRefs = useRef([])
  const [geo, setGeo] = useState(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => {
      const sRect = stage.getBoundingClientRect()
      const a = cardRefs.current[0]?.getBoundingClientRect()
      const b = cardRefs.current[1]?.getBoundingClientRect()
      if (!a || !b) return
      const p0 = { x: a.left - sRect.left + a.width * 0.86, y: a.top - sRect.top }
      const p2 = { x: b.left - sRect.left + b.width * 0.14, y: b.top - sRect.top }
      const ctrl = { x: (p0.x + p2.x) / 2, y: Math.min(p0.y, p2.y) - 92 }
      const apex = {
        x: 0.25 * p0.x + 0.5 * ctrl.x + 0.25 * p2.x,
        y: 0.25 * p0.y + 0.5 * ctrl.y + 0.25 * p2.y,
      }
      setGeo({
        w: sRect.width, h: sRect.height,
        d: `M ${p0.x} ${p0.y} Q ${ctrl.x} ${ctrl.y} ${p2.x} ${p2.y}`,
        apex,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  return { stageRef, cardRefs, geo }
}

export function Studios() {
  const reduced = useReducedMotion()
  const amman = useCityTime('Asia/Amman')
  const sarajevo = useCityTime('Europe/Sarajevo')
  const cities = [
    { name: 'Amman', country: 'Jordan', role: 'HQ — strategy, AI & production', time: amman, phone: BRAND.phoneJO, href: BRAND.whatsapp, action: 'WhatsApp us' },
    { name: 'Sarajevo', country: 'Bosnia & Herzegovina', role: 'Design & campaign studio', time: sarajevo, phone: 'By appointment', href: `mailto:${BRAND.email}`, action: 'Email the studio' },
  ]
  const { stageRef, cardRefs, geo } = useTwoCityArc()
  return (
    <section className="studios" id="studio">
      <div className="section-head">
        <p className="kicker"><span>11</span> Studios</p>
        <SplitWords as="h2" className="h2" text="Two cities. One loom." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Two thousand one hundred kilometres of thread between Amman and Sarajevo, pulled tight.
            When one studio sleeps, the other is already sewing.
          </p>
        </Reveal>
      </div>
      <div className="studios-stage" ref={stageRef}>
        {geo && (
          <div className="studios-thread" aria-hidden="true">
            <svg className="studios-arc" viewBox={`0 0 ${geo.w} ${geo.h}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="studios-arc-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--magenta)" stopOpacity="0.65" />
                  <stop offset="50%" stopColor="var(--cyan)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--magenta)" stopOpacity="0.65" />
                </linearGradient>
              </defs>
              <path d={geo.d} stroke="url(#studios-arc-grad)" strokeWidth="1.6" fill="none" strokeDasharray="1 7" strokeLinecap="round" />
            </svg>
            {!reduced && (
              <span className="studios-arc-pulse" style={{ offsetPath: `path('${geo.d}')` }} />
            )}
            <span className="studios-arc-label" style={{ left: geo.apex.x, top: geo.apex.y }}>
              <i />2,100 km
            </span>
          </div>
        )}
        <div className="studios-grid">
          {cities.map((c, i) => (
            <Reveal key={c.name} delay={i * 0.1}>
              <article className="studio-card" ref={(el) => { cardRefs.current[i] = el }} data-cursor>
                <header>
                  <h3>{c.name}</h3>
                  <span className="studio-time" aria-label={`Local time in ${c.name}`}>{c.time}</span>
                </header>
                <p className="studio-country">{c.country}</p>
                <p className="studio-role">{c.role}</p>
                <footer>
                  <span>{c.phone}</span>
                  <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{c.action} →</a>
                </footer>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Contact() {
  return (
    <section className="contact" id="contact">
      <p className="kicker kicker--center"><span>12</span> Contact</p>
      <h2 className="contact-h2">
        <SplitWords text="Ready to push" />
        <br />
        <span className="contact-accent"><SplitWords text="boundaries?" delay={0.15} /></span>
      </h2>
      <Reveal delay={0.2}>
        <p className="contact-sub">Tell the machine what you are making. A human answers — fast, and in your language.</p>
      </Reveal>
      <Reveal delay={0.3}>
        <ContactWizard />
      </Reveal>
      <Reveal delay={0.35} className="contact-direct">
        <span>Prefer it direct?</span>
        <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
        <i aria-hidden="true">·</i>
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </Reveal>
    </section>
  )
}
