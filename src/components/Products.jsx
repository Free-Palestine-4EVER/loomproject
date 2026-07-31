// LOOM-built software: Apps showcase (phone frames) + 3D Lab (tool cards)
import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { APPS, TOOLS } from '../data/site.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'

function PhoneCard({ app, i }) {
  const [c1, c2] = app.grad
  return (
    <Reveal delay={(i % 3) * 0.07} className="app-cell">
      <article className="app-card" data-cursor>
        <div className="app-phone" style={{ '--g1': c1, '--g2': c2 }}>
          <i className="app-notch" aria-hidden="true" />
          <div className="app-screen">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={app.glyph} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="app-screen-name">{app.name}{app.ar ? <em> {app.ar}</em> : null}</span>
          </div>
          <div className="app-glow" aria-hidden="true" />
        </div>
        <div className="app-meta">
          <header>
            <h3>{app.name}</h3>
            <span>{app.tag}</span>
          </header>
          <p>{app.blurb}</p>
        </div>
      </article>
    </Reveal>
  )
}

export function AppsShowcase() {
  return (
    <section className="apps" id="apps">
      <div className="section-head">
        <p className="kicker"><span>04</span> Apps we built</p>
        <SplitWords as="h2" className="h2" text="We don’t just market software. We ship it." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            The same studio that weaves your brand builds real products — iOS apps,
            AR commerce, ordering platforms. Design, code and launch under one roof.
          </p>
        </Reveal>
      </div>
      <div className="apps-grid">
        {APPS.map((a, i) => <PhoneCard key={a.name} app={a} i={i} />)}
      </div>
    </section>
  )
}

export function ToolsLab() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-4%', '4%'])
  return (
    <section className="lab" id="lab" ref={ref}>
      <motion.div className="lab-bg" style={{ y }} aria-hidden="true" />
      <div className="section-head">
        <p className="kicker kicker--light"><span>05</span> The 3D Lab</p>
        <SplitWords as="h2" className="h2 h2--light" text="Our own 3D & AI software." />
        <Reveal delay={0.15}>
          <p className="lede lede--light" style={{ marginTop: 22 }}>
            Tools we engineered in-house — the unfair advantage behind every LOOM project.
            Rooms scanned into 3D, plans that furnish themselves, worlds edited like documents.
          </p>
        </Reveal>
      </div>
      <div className="lab-grid">
        {TOOLS.map((t, i) => (
          <Reveal key={t.name} delay={(i % 3) * 0.07}>
            <article className="lab-card" data-cursor>
              <header>
                <h3>{t.name}</h3>
                <span className="lab-tag">{t.tag}</span>
              </header>
              <p className="lab-kicker">{t.kicker}</p>
              <p className="lab-blurb">{t.blurb}</p>
              <i className="lab-thread" aria-hidden="true" />
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
