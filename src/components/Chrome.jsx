// Chrome: Loader, Nav, Cursor, ScrollProgress, Footer
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'motion/react'
import { BRAND } from '../data/site.js'
import { EASE, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton, WoolIcon } from './Wool.jsx'

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
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              {/* lowercase attr on purpose: React 18 does not know the camelCase
                  `fetchPriority` prop and passes it through with a console
                  warning. React 19 adds it; until then this is the quiet spelling. */}
              <img className="logo-woven" src="/img/logo/loom-woven-sm.webp" alt="LOOM" width="480" height="162" fetchpriority="high" />
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

// One array, three renderers (desktop header, mobile menu, footer).
// dedicated route. `go` below leaves non-hash hrefs to the App-level handler,
// which pushStates and swaps the page.
const LINKS = [
  { href: '#work', label: 'Work' },
  /* The Machine took the Crew slot on the page, so it takes the tab too —
     Crew and Ascent are gone, and #crew/#ascent no longer resolve. */
  { href: '#the-machine', label: 'Machine' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#apps', label: 'Apps' },
  { href: '#lab', label: '3D Lab' },
  { href: '#own-apps', label: 'Software' },
  /* A path, not a hash — go() below lets it fall through to the App-level
     route handler, which pushStates and swaps in the dedicated page. */
  { href: '/type', label: 'Typeface' },
  { href: '#contact', label: 'Contact' },
]

export function Nav({ onNavigate }) {
  const { open: openWizard } = useWizard()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const burgerRef = useRef(null)
  const menuRef = useRef(null)
  useEffect(() => {
    const fn = () => setScrolled((s) => (window.scrollY > 56 ? true : window.scrollY < 32 ? false : s))
    fn(); window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
    return () => document.documentElement.classList.remove('menu-open')
  }, [open])
  // Same contain-focus-and-restore contract as WizardModal: trap Tab inside while
  // open, Escape closes, and the cleanup (fires on every close path, not just Escape)
  // is what hands focus back to the burger.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key !== 'Tab') return
      const f = menuRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!f || !f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => menuRef.current?.querySelector('a, button')?.focus(), 60)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      burgerRef.current?.focus()
    }
  }, [open])
  const go = (e, href) => {
    // Every LINKS entry is a hash today, but the guard stays: a path link is
    // not a scroll target, and onNavigate would hand querySelector a string
    // like '/pricing' and throw on the invalid selector. Close the menu and
    // let a non-hash click bubble as an ordinary navigation.
    if (!href.startsWith('#')) { setOpen(false); return }
    e.preventDefault(); setOpen(false); onNavigate(href)
  }
  return (
    <>
      <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
        <a className="nav-logo" href="#top" onClick={(e) => go(e, '#top')} aria-label="LOOM — home">
          <img className="logo-woven" src="/img/logo/loom-woven-sm.webp" alt="LOOM" />
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
            <WoolButton label="Get started" size="small" onClick={() => { setOpen(false); openWizard({}) }} />
          </Magnetic>
          <button
            ref={burgerRef}
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
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
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
                  transition={{ delay: 0.04 + i * 0.03, duration: 0.4, ease: EASE }}
                >{l.label}</motion.a>
              ))}
            </div>
            <motion.div className="menu-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
              <WoolButton label="Start weaving" size="big" onClick={() => { setOpen(false); openWizard({}) }} />
              <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
              <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
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

/* THE FOOTER — the bloom tree is the last thing on the page.

   It used to stand between the two cards of `#offer`, where it was competing
   with them: the tree is the most beautiful object on the site and it was being
   asked to be a divider. Down here it has nothing to compete with, so it can be
   the closing image instead — the page ends in blossom rather than in a dark
   sitemap.

   The move brings the pink ground with it, which is what makes the footer read
   as an ending and not as another dark band: `.foot-sky` is the same masked
   watercolour `.offer` used to carry, bleeding UP past the footer's own top
   edge so the dark contact section above dissolves into it instead of butting
   against a rule. Everything from `.footer--bloom` down is therefore dark ink
   on light paper — the inverse of the rest of the site, stated once here and
   scoped so nothing else inherits it. */
export function Footer({ onNavigate }) {
  const reduced = useReducedMotion()
  return (
    <footer className="footer footer--bloom">
      {/* the sky. Same file, same phone cut, same reasoning as `.offer` used:
          media query, not a `w` descriptor, so a DPR-3 phone cannot talk itself
          into the 2200px original for a blurred watercolour behind a mask. */}
      <picture style={{ display: 'contents' }}>
        <source media="(max-width: 767px)" type="image/webp" srcSet="/img/tree/bloom-sky-sm.webp" />
        <img
          className="foot-sky"
          src="/img/tree/bloom-sky.webp"
          alt=""
          width={2200}
          height={1228}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
      </picture>

      {/* the tree. `aria-hidden` and no alt: it carries no information the copy
          beside it does not already state. One <img> and composited transforms
          only — the page already runs two WebGL layers and the footer does not
          get to open a third context to be pretty. */}
      <div className="foot-bloom" aria-hidden="true">
        <i className="foot-halo" />
        <picture style={{ display: 'contents' }}>
          <source media="(max-width: 767px)" type="image/avif" srcSet="/img/tree/bloom-tree-sm.avif" />
          <source media="(max-width: 767px)" type="image/webp" srcSet="/img/tree/bloom-tree-sm.webp" />
          <source type="image/avif" srcSet="/img/tree/bloom-tree.avif" />
          <img
            className="foot-tree"
            src="/img/tree/bloom-tree.webp"
            alt=""
            width={1860}
            height={1723}
            loading="lazy"
            decoding="async"
          />
        </picture>
        {!reduced && (
          <div className="foot-petals">
            {Array.from({ length: 7 }, (_, i) => <span key={i} style={{ '--i': i }} />)}
          </div>
        )}
      </div>

      {/* brand left, contact right, the tree standing in the gap between them.
          The nav is a horizontal row below both rather than a third column —
          a vertical list beside the trunk was reading as a branch. */}
      <div className="footer-grid">
        <div className="foot-brand">
          <LoomMark className="footer-mark" />
          <p>The AI-native creative agency.<br />Amman × Sarajevo.</p>
          {/* the nav lives INSIDE the left column, wrapping to three short rows.
              Centred under the copy it landed across the canopy, and the canopy
              is the busiest patch of pixels on the site — no ink value survives
              it, and laying a scrim over blossom to rescue link text would be
              admitting the composition does not work. Nothing is centred in
              this footer except the tree. */}
          <nav className="foot-nav" aria-label="Footer">
            {/* same rule as Nav's go(): only hash links are scroll targets,
                path links bubble to the App-level route handler */}
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  if (!l.href.startsWith('#')) return
                  e.preventDefault(); onNavigate(l.href)
                }}
              >{l.label}</a>
            ))}
          </nav>
        </div>
        <div className="footer-contact">
          <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">
            <WoolIcon name="phone" size="sm" />WhatsApp — {BRAND.phoneJO}
          </a>
          <a href={`mailto:${BRAND.email}`}>
            <WoolIcon name="share-nodes" size="sm" />{BRAND.email}
          </a>
          <span><WoolIcon name="pin" size="sm" />Amman · Sarajevo</span>
        </div>
      </div>

      <div className="footer-base">
        <span>© {new Date().getFullYear()} LOOM. All rights reserved.</span>
        <span>The edge is intentional.</span>
      </div>
    </footer>
  )
}
