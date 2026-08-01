// Selected Work — featured showcases, filterable grid, full-screen case overlay.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { CASES, FILTERS } from '../data/site.js'
import { EASE, SplitWords, Reveal } from '../lib/motion.jsx'
import { useBottomSheet, useIsMobile, useSheetScrollHandoff, SheetHandle } from '../lib/sheet.jsx'
import { WoolIcon } from './Wool.jsx'
import './heads-v7.css'

// Fade images in on decode — ref callback handles the cached case (onLoad
// never fires for images that were complete before hydration).
const imgFade = (el) => { if (el && el.complete && el.naturalWidth) el.classList.add('is-loaded') }
const onImgLoad = (e) => e.currentTarget.classList.add('is-loaded')

function CaseCard({ c, onOpen, big = false }) {
  const ref = useRef(null)
  const vidRef = useRef(null)
  const reduced = useReducedMotion()
  const [coarse, setCoarse] = useState(false)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-6%', '6%'])

  // Featured tiles "develop" like a print — desaturated on mount, full color once
  // the card has crossed 40% into the viewport. Reduced motion (and non-featured
  // grid cards) render already-developed, no transition to skip.
  const [developed, setDeveloped] = useState(!big || !!reduced)
  useEffect(() => {
    if (!big || reduced || developed || !ref.current) return
    const io = new IntersectionObserver(
      (entries) => {
        const en = entries[0]
        if (en && en.isIntersecting) {
          setDeveloped(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    io.observe(ref.current)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big, reduced])

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const set = () => setCoarse(mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  // Cards with a reel play it on hover (fine pointers), poster otherwise — no autoplay bandwidth cost.
  const playVideo = () => {
    if (reduced || coarse || !vidRef.current) return
    vidRef.current.play().catch(() => {})
  }
  const stopVideo = () => {
    if (coarse || !vidRef.current) return
    vidRef.current.pause()
    vidRef.current.currentTime = 0
  }

  // Touch devices: hover doesn't exist, so autoplay the reel muted while the card is
  // substantially in view instead — preload stays 'none' until the first play() call.
  useEffect(() => {
    if (!coarse || reduced || !c.video || !ref.current) return
    const vid = vidRef.current
    const io = new IntersectionObserver(
      (entries) => {
        const en = entries[0]
        if (!en) return
        if (en.isIntersecting) vid?.play().catch(() => {})
        else vid?.pause()
      },
      { threshold: 0.6 }
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [coarse, reduced, c.video])

  return (
    <motion.article
      ref={ref}
      className={`case-card ${big ? 'case-card--big' : ''}`}
      whileHover={reduced || coarse ? undefined : 'hover'}
      onHoverStart={playVideo} onHoverEnd={stopVideo}
      data-cursor
    >
      <button className="case-hit" onClick={() => onOpen(c.slug)} aria-label={`Open case study: ${c.client} — ${c.title}`}>
        <div className={`case-media ${big && !developed ? 'is-developing' : ''}`}>
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
            // Coarse pointers never hover, so the veil that tells a visitor the card
            // opens something has to rest partly visible instead of hiding at 0 —
            // quieter than the full-strength hover reveal desktop gets on interest.
            initial={{ opacity: coarse ? 0.58 : 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* the ↗ becomes a felt seal — inline-flex here because .case-veil span
                is plain inline text and would drop the 30px medallion on the baseline */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Open case <WoolIcon name="arrow-right" size="sm" />
            </span>
          </motion.div>
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
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const isMobile = useIsMobile()
  const sheet = useBottomSheet({ onDismiss: onClose })
  const requestClose = useCallback(() => {
    if (isMobile && !sheet.reduced) sheet.animateOut()
    else onClose()
  }, [isMobile, sheet, onClose])
  const scrollBind = useSheetScrollHandoff(sheet.bind, scrollRef)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { requestClose(); return }
      if (e.key === 'ArrowLeft') { onPrev(); return }
      if (e.key === 'ArrowRight') { onNext(); return }
      // Contain Tab. aria-modal hides the page from assistive tech but does
      // nothing to the tab order, so without this the next Tab walks out of
      // the dialog and into a nav the user cannot see.
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    document.documentElement.classList.add('overlay-open')

    // Move focus in, and put it back where it came from on close — otherwise
    // focus sits on <body> and a keyboard user has to tab the whole page again.
    const returnTo = document.activeElement
    const raf = requestAnimationFrame(() => closeRef.current?.focus())

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('overlay-open')
      if (returnTo instanceof HTMLElement && document.contains(returnTo)) returnTo.focus()
    }
  }, [requestClose, onPrev, onNext])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [c.slug])
  // Re-fires whenever isMobile flips true — not just at mount — so rotating a
  // phone or resizing across the breakpoint while a case is open still animates
  // the sheet in, instead of leaving it parked off-screen (see WizardModal).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isMobile) sheet.animateIn() }, [isMobile])

  const panelProps = isMobile
    ? {
        className: 'overlay-panel is-sheet',
        style: { y: sheet.y },
        ref: sheet.panelRef,
      }
    : {
        className: 'overlay-panel',
        initial: { y: '6%', opacity: 0 }, animate: { y: '0%', opacity: 1 }, exit: { y: '4%', opacity: 0 },
        transition: { duration: 0.55, ease: EASE },
      }

  return (
    <motion.div
      ref={panelRef}
      className="overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="dialog" aria-modal="true" aria-label={`Case study: ${c.client}`}
    >
      <motion.div {...panelProps}>
        {isMobile && <SheetHandle bind={sheet.bind} />}
        <header className="overlay-bar">
          <span className="overlay-brand">LOOM — Case study</span>
          <div className="overlay-nav">
            <button onClick={onPrev} aria-label="Previous case">←</button>
            <button onClick={onNext} aria-label="Next case">→</button>
            <button ref={closeRef} className="overlay-close" onClick={requestClose} aria-label="Close case study">✕</button>
          </div>
        </header>
        <div className="overlay-scroll" ref={scrollRef} {...(isMobile ? scrollBind : null)}>
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
            {/* stays a basted-outline ghost button; only the → is re-made in felt
                (.btn is inline-flex already, it just carries no gap of its own) */}
            <button className="btn btn--ghost" onClick={onNext} style={{ gap: 10 }}>
              Next case <WoolIcon name="arrow-right" size="sm" />
            </button>
          </footer>
          </motion.div>
        </div>
      </motion.div>
      <button className="overlay-backdrop" onClick={requestClose} aria-label="Close" tabIndex={-1} />
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
        <SplitWords as="h2" className="h2" text="Seventeen launches. Seven countries. Zero templates." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Everything on this board went live — and most of it went further. Open any tile and walk the whole case.
          </p>
        </Reveal>
      </div>

      <div className="work-featured">
        {featured.map((c, i) => (
          <Reveal key={c.slug} delay={(i % 2) * 0.08} className={`feat-cell feat-cell--${i % 3}`}>
            <CaseCard c={c} onOpen={openCase} big />
          </Reveal>
        ))}
      </div>

      <div className="work-all">
        {/* Toggle buttons, not tabs: role="tab" promises a tabpanel to own and
            arrow-key roving focus, and neither exists here — a screen reader
            would announce "tab 1 of 6" and the arrow keys would do nothing. */}
        <div className="work-filters" role="group" aria-label="Filter case studies">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
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
