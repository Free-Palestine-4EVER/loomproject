// Chrome: Loader, Nav, Cursor, ScrollProgress, Footer
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'motion/react'
import { BRAND } from '../data/site.js'
import { EASE, Magnetic } from '../lib/motion.jsx'

export function LoomMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M8 6v22a6 6 0 0 0 6 6h18" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M16 6v14a6 6 0 0 0 6 6h10" stroke="var(--magenta)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="32" cy="12" r="3.4" fill="var(--magenta)" />
    </svg>
  )
}

export function Loader({ done }) {
  return (
    <AnimatePresence>
      {!done && (
        <motion.div className="loader" exit={{ y: '-100%', transition: { duration: 0.9, ease: EASE } }}>
          <div className="loader-inner">
            <motion.div
              className="loader-word"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {'LOOM'.split('').map((c, i) => (
                <motion.span
                  key={i}
                  initial={{ y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.08 * i }}
                >{c}</motion.span>
              ))}
            </motion.div>
            <motion.div
              className="loader-thread"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
            />
            <motion.p
              className="loader-sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >Amman × Sarajevo</motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  return <motion.div className="progress" style={{ scaleX }} />
}

const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#services', label: 'Services' },
  { href: '#studio', label: 'Studio' },
  { href: '#contact', label: 'Contact' },
]

export function Nav({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    fn(); window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
    return () => document.documentElement.classList.remove('menu-open')
  }, [open])
  const go = (e, href) => {
    e.preventDefault(); setOpen(false); onNavigate(href)
  }
  return (
    <>
      <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
        <a className="nav-logo" href="#top" onClick={(e) => go(e, '#top')} aria-label="LOOM — home">
          <LoomMark className="nav-mark" /> <span>LOOM</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>
              <span data-text={l.label}>{l.label}</span>
            </a>
          ))}
        </nav>
        <div className="nav-cta">
          <Magnetic strength={0.25}>
            <a className="btn btn--small" href={BRAND.whatsapp} target="_blank" rel="noreferrer">
              Start a project
            </a>
          </Magnetic>
          <button
            className={`burger ${open ? 'is-open' : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          ><span /><span /></button>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div
            className="menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="menu-links">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href} href={l.href} onClick={(e) => go(e, l.href)}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.7, ease: EASE }}
                >{l.label}</motion.a>
              ))}
            </div>
            <motion.div className="menu-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
              <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
              <span>Amman × Sarajevo</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced || !window.matchMedia('(pointer:fine)').matches) return
    document.documentElement.classList.add('has-cursor')
    let x = 0, y = 0, rx = 0, ry = 0, raf
    const move = (e) => {
      x = e.clientX; y = e.clientY
      if (dot.current) dot.current.style.transform = `translate(${x}px, ${y}px)`
    }
    const loop = () => {
      rx += (x - rx) * 0.14; ry += (y - ry) * 0.14
      if (ring.current) ring.current.style.transform = `translate(${rx}px, ${ry}px)`
      raf = requestAnimationFrame(loop)
    }
    const over = (e) => {
      const hot = e.target.closest('a, button, [data-cursor]')
      document.documentElement.classList.toggle('cursor-hot', !!hot)
    }
    window.addEventListener('mousemove', move, { passive: true })
    window.addEventListener('mouseover', over, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('has-cursor', 'cursor-hot')
    }
  }, [reduced])
  if (reduced) return null
  return (
    <div className="cursor" aria-hidden="true">
      <div ref={ring} className="cursor-ring" />
      <div ref={dot} className="cursor-dot" />
    </div>
  )
}

export function Footer({ onNavigate }) {
  return (
    <footer className="footer">
      <div className="footer-word" aria-hidden="true">LOOM</div>
      <div className="footer-grid">
        <div>
          <LoomMark className="footer-mark" />
          <p>The AI-native creative agency.<br />Amman × Sarajevo.</p>
        </div>
        <nav aria-label="Footer">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); onNavigate(l.href) }}>{l.label}</a>
          ))}
        </nav>
        <div className="footer-contact">
          <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp — {BRAND.phoneJO}</a>
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          <a href={BRAND.instagram} target="_blank" rel="noreferrer">Instagram {BRAND.instagramHandle}</a>
        </div>
      </div>
      <div className="footer-base">
        <span>© {new Date().getFullYear()} LOOM × ADVN Digital. All rights reserved.</span>
        <span>The edge is intentional.</span>
      </div>
    </footer>
  )
}
