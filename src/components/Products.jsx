// LOOM-built software: Apps showcase (phone frames) + 3D Lab (tool cards)
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { APPS, TOOLS } from '../data/site.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'
import { AppScreen } from './AppScreens.jsx'
import { LabPreview } from './LabPreviews.jsx'
import './products-touch.css'

// True on coarse pointers (touch) — cards use this to swap hover-only
// interactions for scroll/tap equivalents, and never attach the extra
// listeners at all on fine-pointer desktops.
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

// Minimal platform/store marks, drawn in the house 1.5px stroke style.
function PlatformMark({ id }) {
  const P = {
    ios: <path d="M15.5 5.6c-.9.1-2 .7-2.6 1.5-.6.7-1.1 1.8-.9 2.8 1 0 2.1-.6 2.7-1.4.6-.7 1-1.8.8-2.9ZM12 9.9c-1.4 0-2.6.8-3.4.8-.8 0-1.9-.8-3.1-.8-1.6 0-3.4 1.4-3.4 4.1 0 2.7 2 5.7 3.5 5.7.8 0 1.7-.8 3-.8s2 .8 3 .8c1.5 0 3.4-3.1 3.4-4.4-1.6-.7-2.4-1.8-2.4-3.1 0-1.2.7-2 1.6-2.6-.7-1-1.7-1.7-2.2-1.7Z" transform="translate(3.5 -1.5) scale(0.92)" />,
    macos: <><rect x="3.5" y="5" width="17" height="11.5" rx="1.6" /><path d="M8.5 20h7M12 16.5V20" /></>,
    windows: <><path d="M4 6.6 11 5.5v6H4v-4.9ZM13 5.2 20 4v7.5h-7V5.2ZM4 13.5h7v6L4 18.4v-4.9ZM13 13.5h7V20l-7-1.2v-5.3Z" /></>,
    linux: <><circle cx="12" cy="9" r="4.4" /><path d="M9.4 12.6 7.6 18a1.4 1.4 0 0 0 1.4 1.8h6a1.4 1.4 0 0 0 1.4-1.8l-1.8-5.4M10.4 8.4h.01M13.6 8.4h.01M11 10.4c.3.4 1.7.4 2 0" /></>,
    web: <><circle cx="12" cy="12" r="8.2" /><path d="M3.8 12h16.4M12 3.8c2.6 2.4 3.9 5.2 3.9 8.2s-1.3 5.8-3.9 8.2c-2.6-2.4-3.9-5.2-3.9-8.2s1.3-5.8 3.9-8.2Z" /></>,
    appstore: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.2" /><path d="m9.2 15.5 4.6-8M14.2 15.5 12.9 13M7 15.5h6.3M15.6 15.5H17" /></>,
    testflight: <><path d="M4 12.5 20 4l-4.2 16-4.6-6.2L4 12.5ZM11.2 13.8 20 4" /></>,
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[id] || null}
    </svg>
  )
}

const PLATFORM_LABEL = { ios: 'iOS', macos: 'macOS', windows: 'Windows', linux: 'Linux', web: 'Web' }

function PhoneCard({ app, i }) {
  const [c1, c2] = app.grad
  const cardRef = useRef(null)
  const shotRef = useRef(null)
  const coarse = useCoarsePointer()
  const reduced = useReducedMotion()

  // Touch: no hover, so pan the screenshot's object-position from the
  // card's own journey through the viewport (0-100% across the card's transit).
  useEffect(() => {
    if (!coarse || reduced || !app.shot) return
    const card = cardRef.current
    const shot = shotRef.current
    if (!card || !shot) return
    let raf = null
    const update = () => {
      raf = null
      const r = card.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      const total = r.height + vh
      const traveled = vh - r.top
      const progress = Math.min(1, Math.max(0, traveled / total))
      shot.style.setProperty('--pan', `${progress * 100}%`)
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
  }, [coarse, reduced, app.shot])

  return (
    <Reveal delay={(i % 3) * 0.07} className="app-cell">
      <article className="app-card" data-cursor ref={cardRef}>
        <div className="app-phone" style={{ '--g1': c1, '--g2': c2 }}>
          <i className="app-notch" aria-hidden="true" />
          <div className="app-screen">
            {app.shot
              ? <img ref={shotRef} className="app-shot" src={app.shot} alt={`${app.name} — real app screenshot`} loading="lazy" />
              : <AppScreen slug={app.screen} />}
            <i className="app-sheen" aria-hidden="true" />
          </div>
          {app.shot && <span className="app-real" aria-hidden="true">REAL BUILD</span>}
          <div className="app-glow" aria-hidden="true" />
        </div>
        <div className="app-meta">
          <header>
            <h3>{app.name}</h3>
            <span>{app.tag}</span>
          </header>
          <p>{app.blurb}</p>
          <div className="app-badges">
            {(app.platforms || []).map((p) => (
              <span className="app-badge" key={p}><PlatformMark id={p} />{PLATFORM_LABEL[p] || p}</span>
            ))}
            {app.store && (
              <span className={`app-badge app-badge--store ${app.store === 'App Store' ? 'is-live' : ''}`}>
                <PlatformMark id={app.store === 'App Store' ? 'appstore' : 'testflight'} />
                {app.store}
              </span>
            )}
          </div>
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

function LabCard({ t, i }) {
  const coarse = useCoarsePointer()
  const [xray, setXray] = useState(false)
  const tappable = coarse && !!t.shot

  const onTap = () => {
    if (!tappable) return
    setXray((v) => !v)
  }
  const onKeyDown = (e) => {
    if (!tappable) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() }
  }

  return (
    <Reveal delay={(i % 3) * 0.07}>
      <article className={`lab-card ${xray ? 'is-xray' : ''}`} data-cursor>
        <div
          className={`lab-preview-wrap ${t.shot ? 'has-shot' : ''} ${tappable ? 'is-tappable' : ''}`}
          role={tappable ? 'button' : undefined}
          tabIndex={tappable ? 0 : undefined}
          aria-pressed={tappable ? xray : undefined}
          aria-label={tappable ? `${t.name} — toggle real screenshot` : undefined}
          onClick={onTap}
          onKeyDown={onKeyDown}
        >
          <LabPreview name={t.name} />
          {t.shot && (
            <>
              <img className="lab-shot" src={t.shot} alt={`${t.name} — real tool screenshot`} loading="lazy" />
              <span className="lab-real" aria-hidden="true">REAL TOOL</span>
            </>
          )}
        </div>
        <header>
          <h3>{t.name}</h3>
          <span className="lab-tag">{t.tag}</span>
        </header>
        <p className="lab-kicker">{t.kicker}</p>
        <p className="lab-blurb">{t.blurb}</p>
        <i className="lab-thread" aria-hidden="true" />
      </article>
    </Reveal>
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
        {TOOLS.map((t, i) => <LabCard key={t.name} t={t} i={i} />)}
      </div>
    </section>
  )
}
