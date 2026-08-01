// Selected Work — featured showcases, filterable grid, full-screen case overlay.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { CASES, FILTERS } from '../data/site.js'
import { EASE, SplitWords, Reveal } from '../lib/motion.jsx'

// Fade images in on decode — ref callback handles the cached case (onLoad
// never fires for images that were complete before hydration).
const imgFade = (el) => { if (el && el.complete && el.naturalWidth) el.classList.add('is-loaded') }
const onImgLoad = (e) => e.currentTarget.classList.add('is-loaded')

function CaseCard({ c, onOpen, big = false }) {
  const ref = useRef(null)
  const vidRef = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-6%', '6%'])

  // Cards with a reel play it on hover, poster otherwise — no autoplay bandwidth cost.
  const playVideo = () => {
    if (reduced || !vidRef.current) return
    vidRef.current.play().catch(() => {})
  }
  const stopVideo = () => {
    if (!vidRef.current) return
    vidRef.current.pause()
    vidRef.current.currentTime = 0
  }

  return (
    <motion.article
      ref={ref}
      className={`case-card ${big ? 'case-card--big' : ''}`}
      whileHover={reduced ? undefined : 'hover'}
      onHoverStart={playVideo} onHoverEnd={stopVideo}
      data-cursor
    >
      <button className="case-hit" onClick={() => onOpen(c.slug)} aria-label={`Open case study: ${c.client} — ${c.title}`}>
        <div className="case-media">
          <motion.img
            src={c.cover} alt={`${c.client} — ${c.title}`} loading="lazy"
            ref={imgFade} onLoad={onImgLoad}
            style={{ y }}
            variants={{ hover: { scale: 1.06 } }}
            transition={{ duration: 0.8, ease: EASE }}
          />
          {c.video && (
            <video
              ref={vidRef} className="case-video" src={c.video} poster={c.cover}
              muted loop playsInline preload="none" tabIndex={-1} aria-hidden="true"
            />
          )}
          {c.video && <span className="case-reel" aria-hidden="true">REEL</span>}
          <motion.div
            className="case-veil" aria-hidden="true"
            variants={{ hover: { opacity: 1 } }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          ><span>Open case ↗</span></motion.div>
        </div>
        <div className="case-meta">
          <div>
            <h3>{c.client}</h3>
            <p>{c.title}</p>
          </div>
          <div className="case-tags">
            <span className="case-country">{c.country}</span>
            <span className="case-year">{c.year}</span>
          </div>
        </div>
      </button>
    </motion.article>
  )
}

function CaseOverlay({ c, onClose, onPrev, onNext }) {
  const scrollRef = useRef(null)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    document.documentElement.classList.add('overlay-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('overlay-open')
    }
  }, [onClose, onPrev, onNext])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [c.slug])

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="dialog" aria-modal="true" aria-label={`Case study: ${c.client}`}
    >
      <motion.div
        className="overlay-panel"
        initial={{ y: '6%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '4%', opacity: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <header className="overlay-bar">
          <span className="overlay-brand">LOOM — Case study</span>
          <div className="overlay-nav">
            <button onClick={onPrev} aria-label="Previous case">←</button>
            <button onClick={onNext} aria-label="Next case">→</button>
            <button className="overlay-close" onClick={onClose} aria-label="Close case study">✕</button>
          </div>
        </header>
        <div className="overlay-scroll" ref={scrollRef}>
          {/* keyed fade bridges prev/next case switches (content used to teleport) */}
          <motion.div
            key={c.slug}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
          <div className="overlay-head">
            <p className="overlay-scope">{c.scope.join(' · ')}</p>
            <h2>{c.client}</h2>
            <p className="overlay-title">{c.title}</p>
            <div className="overlay-facts">
              <span><em>Market</em>{c.country}</span>
              <span><em>Year</em>{c.year}</span>
              <span><em>Studio</em>LOOM</span>
            </div>
            <p className="overlay-copy">{c.copy}</p>
          </div>
          <div className="overlay-gallery">
            {c.video && (
              <motion.figure
                className="overlay-board overlay-video"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <video
                  src={c.video} poster={c.cover}
                  autoPlay muted loop playsInline controls
                />
                <figcaption>Production reel — {c.client}</figcaption>
              </motion.figure>
            )}
            {c.feature.map((src, i) => (
              <motion.figure
                key={src}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-5% 0px' }}
                transition={{ duration: 0.7, ease: EASE, delay: (i % 2) * 0.06 }}
              >
                <img src={src} alt={`${c.client} — feature visual ${i + 1}`} loading="lazy" ref={imgFade} onLoad={onImgLoad} />
              </motion.figure>
            ))}
            {c.boards.map((src, i) => (
              <motion.figure
                key={src} className="overlay-board"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-5% 0px' }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <img src={src} alt={`${c.client} — case board ${i + 1}`} loading="lazy" ref={imgFade} onLoad={onImgLoad} />
              </motion.figure>
            ))}
          </div>
          <footer className="overlay-foot">
            <button className="btn btn--ghost" onClick={onNext}>Next case →</button>
          </footer>
          </motion.div>
        </div>
      </motion.div>
      <button className="overlay-backdrop" onClick={onClose} aria-label="Close" tabIndex={-1} />
    </motion.div>
  )
}

export function Work() {
  const [filter, setFilter] = useState('all')
  const [openSlug, setOpenSlug] = useState(null)

  const list = useMemo(
    () => (filter === 'all' ? CASES : CASES.filter((c) => c.filter.includes(filter))),
    [filter]
  )
  const featured = CASES.filter((c) => c.featured)

  const openCase = useCallback((slug) => setOpenSlug(slug), [])
  const close = useCallback(() => setOpenSlug(null), [])
  const idx = CASES.findIndex((c) => c.slug === openSlug)
  const prev = useCallback(() => setOpenSlug(CASES[(idx - 1 + CASES.length) % CASES.length].slug), [idx])
  const next = useCallback(() => setOpenSlug(CASES[(idx + 1) % CASES.length].slug), [idx])

  return (
    <section className="work" id="work">
      <div className="section-head">
        <p className="kicker"><span>—</span> Selected work</p>
        <SplitWords as="h2" className="h2" text="Seventeen case studies. Seven countries. One standard." />
      </div>

      <div className="work-featured">
        {featured.map((c, i) => (
          <Reveal key={c.slug} delay={(i % 2) * 0.08} className={`feat-cell feat-cell--${i % 3}`}>
            <CaseCard c={c} onOpen={openCase} big />
          </Reveal>
        ))}
      </div>

      <div className="work-all">
        <div className="work-filters" role="tablist" aria-label="Filter case studies">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab" aria-selected={filter === f.id}
              className={`filter ${filter === f.id ? 'is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >{f.label}</button>
          ))}
        </div>
        <motion.div className="work-grid" layout>
          <AnimatePresence mode="popLayout">
            {list.map((c) => (
              <motion.div
                key={c.slug} layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <CaseCard c={c} onOpen={openCase} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {openSlug && (
          <CaseOverlay
            c={CASES[idx]}
            onClose={close} onPrev={prev} onNext={next}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
