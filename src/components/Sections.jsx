// Page sections: Hero, Marquee, Manifesto, Services, Process, AiLoom, Stats, Studios, Contact
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { BRAND, CLIENT_WALL, SERVICES, PROCESS, STATS } from '../data/site.js'
import { EASE, SplitWords, Reveal, CountUp, Magnetic } from '../lib/motion.jsx'
import { HeroField } from '../three/HeroField.js'

export function Hero() {
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
          <Magnetic><a className="btn btn--primary" href={BRAND.whatsapp} target="_blank" rel="noreferrer">Start a project</a></Magnetic>
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

export function Manifesto() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yImg = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-8%', '8%'])
  return (
    <section className="manifesto" ref={ref}>
      <div className="manifesto-grid">
        <div className="manifesto-copy">
          <p className="kicker"><span>01</span> Manifesto</p>
          <SplitWords as="h2" className="h2" text="Trends don’t lead our work. Thinking does." />
          <Reveal delay={0.15}>
            <p className="lede">
              LOOM operates where technology, design and storytelling meet. Two studios — Amman and
              Sarajevo — one loom: strategy, craft and AI woven into brands and digital experiences
              meant to last beyond the scroll.
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
              src="/img/edge-cover.webp" alt="Iridescent particle weave — LOOM brand artwork"
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
                <p>{s.blurb}</p>
                <div className="svc-tags">{s.tags.map((t) => <span key={t}>{t}</span>)}</div>
              </div>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

export function Process() {
  return (
    <section className="process">
      <div className="section-head">
        <p className="kicker"><span>04</span> Process</p>
        <SplitWords as="h2" className="h2" text="One process. No templates. No shortcuts." />
      </div>
      <div className="process-grid">
        {PROCESS.map((p, i) => (
          <Reveal key={p.n} delay={i * 0.08} className="process-cell">
            <div className="process-card" data-cursor>
              <span className="process-n">{p.n}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <i className="process-thread" aria-hidden="true" />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export function AiLoom() {
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
      </div>
      <div className="ailoom-glow" aria-hidden="true" />
    </section>
  )
}

export function Stats() {
  return (
    <section className="stats" aria-label="Studio in numbers">
      {STATS.map((s, i) => (
        <Reveal key={s.label} delay={i * 0.07} className="stat">
          <div className="stat-value"><CountUp value={s.value} suffix={s.suffix} /></div>
          <div className="stat-label">{s.label}</div>
        </Reveal>
      ))}
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

export function Studios() {
  const amman = useCityTime('Asia/Amman')
  const sarajevo = useCityTime('Europe/Sarajevo')
  const cities = [
    { name: 'Amman', country: 'Jordan', role: 'HQ — strategy, AI & production', time: amman, phone: BRAND.phoneJO, href: BRAND.whatsapp, action: 'WhatsApp us' },
    { name: 'Sarajevo', country: 'Bosnia & Herzegovina', role: 'Design & campaign studio', time: sarajevo, phone: BRAND.phoneBA, href: `mailto:${BRAND.email}`, action: 'Email the studio' },
  ]
  return (
    <section className="studios" id="studio">
      <div className="section-head">
        <p className="kicker"><span>05</span> Studios</p>
        <SplitWords as="h2" className="h2" text="Two cities. One loom." />
      </div>
      <div className="studios-grid">
        {cities.map((c, i) => (
          <Reveal key={c.name} delay={i * 0.1}>
            <article className="studio-card" data-cursor>
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
    </section>
  )
}

export function Contact() {
  return (
    <section className="contact" id="contact">
      <p className="kicker kicker--center"><span>06</span> Contact</p>
      <h2 className="contact-h2">
        <SplitWords text="Ready to push" />
        <br />
        <span className="contact-accent"><SplitWords text="boundaries?" delay={0.15} /></span>
      </h2>
      <Reveal delay={0.2}>
        <p className="contact-sub">If you’re ready to push boundaries — we’re ready to build.</p>
      </Reveal>
      <Reveal delay={0.3} className="contact-ctas">
        <Magnetic><a className="btn btn--primary btn--big" href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp — {BRAND.phoneJO}</a></Magnetic>
        <Magnetic><a className="btn btn--ghost btn--big" href={`mailto:${BRAND.email}?subject=Project%20inquiry%20—%20LOOM`}>{BRAND.email}</a></Magnetic>
      </Reveal>
      <Reveal delay={0.4}>
        <p className="contact-ig"><a href={BRAND.instagram} target="_blank" rel="noreferrer">Instagram {BRAND.instagramHandle}</a></p>
      </Reveal>
    </section>
  )
}
