// Chrome: Loader, Nav, Cursor, ScrollProgress, Footer
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'motion/react'
import { BRAND } from '../data/site.js'
import { EASE, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'

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
  { href: '#mcp', label: 'MCP' },
  /* `extra` = shown everywhere EXCEPT the desktop bar between 1100 and 1360.
     Ten labels do not fit between the wordmark and the "Get started" pill until
     ~1360px, and the burger does not take over until 1100 — so a tenth tab
     buys 260px of a nav row sitting under the CTA. The mobile menu and the
     footer render it unconditionally; only `.nav-links a.is-extra` drops out,
     and only in that band. */
  { href: '#aeo', label: 'AI Search', extra: true },
  /* A path, not a hash — go() below lets it fall through to the App-level
     route handler, which pushStates and swaps in the dedicated page. */
  { href: '/type', label: 'Typeface' },
  { href: '/ai-workshops', label: 'AI Workshops' },
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
            <a
              key={l.href}
              href={l.href}
              className={l.extra ? 'is-extra' : undefined}
              onClick={(e) => go(e, l.href)}
            >
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
/* The footer's own icon set — INLINE SVG, not `WoolIcon`.

   The wool medallions are photographs of felted discs: gorgeous at 44px beside
   a heading, mud at 16px beside a phone number, and they cannot take the ink
   colour of the light footer because they carry their own baked-in lighting.
   Everything below is one stroked path on `currentColor`, so a link and its
   icon change colour together on hover and the whole set costs no requests. */
const FOOT_ICONS = {
  whatsapp: (
    <path fill="currentColor" stroke="none" d="M12.04 2A9.9 9.9 0 0 0 2.13 11.9c0 1.75.46 3.46 1.34 4.97L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01a9.9 9.9 0 0 0 9.9-9.9A9.9 9.9 0 0 0 12.04 2Zm0 18.1h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 0 1-1.26-4.38 8.23 8.23 0 0 1 14.06-5.82 8.18 8.18 0 0 1 2.42 5.83 8.23 8.23 0 0 1-8.23 8.24Zm4.52-6.17c-.25-.13-1.46-.72-1.69-.8-.22-.09-.39-.13-.55.12s-.63.8-.78.97c-.14.16-.28.19-.53.06a6.76 6.76 0 0 1-1.99-1.23 7.5 7.5 0 0 1-1.37-1.71c-.15-.25-.02-.38.11-.5.11-.12.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.13-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.42h-.47a.9.9 0 0 0-.66.31c-.22.25-.86.85-.86 2.06s.88 2.39 1 2.56c.13.16 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
  ),
  mail: (
    <>
      <rect x="2.6" y="4.8" width="18.8" height="14.4" rx="2.4" />
      <path d="m3.4 7.2 7.5 5.3a2 2 0 0 0 2.2 0l7.5-5.3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.4s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),
  arrowUp: <path d="M12 19.5v-15m0 0-6.2 6.2M12 4.5l6.2 6.2" />,
  arrowUpRight: <path d="M7 17 17 7m0 0H8.6M17 7v8.4" />,
  spark: <path d="M12 3.2 13.9 9 20 10.9 13.9 12.8 12 18.6 10.1 12.8 4 10.9 10.1 9 12 3.2Z" />,
}

function FootIcon({ name, className = '' }) {
  const glyph = FOOT_ICONS[name]
  if (!glyph) return null
  return (
    <svg
      className={`foot-i ${className}`.trimEnd()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >{glyph}</svg>
  )
}

/* The sitemap, split into two short columns instead of one ten-item run.

   The second column is the REMAINDER, not a second hand-written list. The
   footer is the sitemap: a tab added to `LINKS` for a new page has to turn up
   down here without anyone having to remember to add it in two places — which
   is exactly what did not happen the last three times a tab was added. Only
   the first column is curated; everything else lands in `Craft`, in `LINKS`
   order, and the two columns are `LINKS` entries themselves so a renamed label
   or href follows automatically. */
const EXPLORE = ['#work', '#the-machine', '#solutions', '#apps', '#contact']
const FOOT_COLS = [
  { title: 'Explore', links: LINKS.filter((l) => EXPLORE.includes(l.href)) },
  { title: 'Craft', links: LINKS.filter((l) => !EXPLORE.includes(l.href)) },
]

export function Footer({ onNavigate }) {
  const reduced = useReducedMotion()
  const { open: openWizard } = useWizard()
  const toTop = () => {
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.4 })
    else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }
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
      </div>

      {/* THE DRIFT — petals over the WHOLE footer, not just the canopy.
          They used to live inside `.foot-bloom`, which is a 560px box in the
          middle of the page, so the fall read as a leak from the tree rather
          than as weather. Lifted to a footer-level layer that spans the full
          box; the tree is still where they start, but the column they fall in
          is the page.

          Lane, size, drift, duration and delay are all derived from `--i` by
          the same integer hash, so 18 petals never resolve into a visible
          cycle and the set is identical on every render — no Math.random, so
          nothing shifts between an SSR-style first paint and a rerender.
          The layer clips its OWN overflow: `.footer--bloom` is `clip visible`
          on Y, so a petal falling past the hem would otherwise be free to
          lengthen the document at the very bottom of the page. */}
      {!reduced && (
        <div className="foot-petals" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => {
            const h = (i * 2654435761) % 1000 / 1000   // deterministic 0..1
            const g = (i * 40503) % 997 / 997
            return (
              <span
                key={i}
                className={i % 3 === 0 ? 'is-leaf' : ''}
                style={{
                  '--x': `${3 + ((i * 5.6) % 94)}%`,
                  '--s': 0.62 + h * 0.85,
                  '--dx': `${-90 + g * 150}px`,
                  '--rot': `${180 + h * 420}deg`,
                  '--dur': `${11 + h * 9}s`,
                  '--delay': `${-(g * 20).toFixed(2)}s`,
                  '--o': 0.45 + g * 0.45,
                }}
              />
            )
          })}
        </div>
      )}

      {/* FOUR COLUMNS: brand · Explore · Craft · the contact card.

          The old two-up put eight stacked links under the brand line and three
          bare rows opposite them, which is a sitemap, not a footer: nothing
          told you what the two groups WERE, and the contact details — the only
          part of this block anybody actually came for — had the same weight as
          a jump link. Named columns give the links a reason to be grouped, and
          the contact block is now a card so the phone number is the heaviest
          object below the tree. */}
      <div className="footer-grid">
        <div className="foot-brand">
          <LoomMark className="footer-mark" />
          <p className="foot-tag">The AI-native creative agency.<br />We weave brands on the edge of creativity.</p>
          <p className="foot-cities">
            <FootIcon name="pin" />Amman × Sarajevo
          </p>
        </div>

        {/* same rule as Nav's go(): only hash links are scroll targets, path
            links bubble to the App-level route handler */}
        {FOOT_COLS.map((col) => (
          <nav className="foot-col" key={col.title} aria-label={col.title}>
            <h3 className="foot-col-t">{col.title}</h3>
            <ul>
              {col.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={(e) => {
                      if (!l.href.startsWith('#')) return
                      e.preventDefault(); onNavigate(l.href)
                    }}
                  >
                    <span>{l.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="footer-contact">
          <h3 className="foot-col-t">Start a project</h3>
          <a className="foot-c-row is-lead" href={BRAND.whatsapp} target="_blank" rel="noreferrer">
            <span className="foot-c-ico"><FootIcon name="whatsapp" /></span>
            <span className="foot-c-txt">
              <em>WhatsApp</em>
              <b>{BRAND.phoneJO}</b>
            </span>
            <FootIcon name="arrowUpRight" className="foot-c-go" />
          </a>
          <a className="foot-c-row" href={`mailto:${BRAND.email}`}>
            <span className="foot-c-ico"><FootIcon name="mail" /></span>
            <span className="foot-c-txt">
              <em>Email</em>
              <b>{BRAND.email}</b>
            </span>
            <FootIcon name="arrowUpRight" className="foot-c-go" />
          </a>
          <p className="foot-hours"><FootIcon name="clock" />Amman · Sarajevo — GMT+3 / GMT+2</p>
          <button type="button" className="foot-cta" onClick={() => openWizard({})}>
            <FootIcon name="spark" />Get started
          </button>
        </div>
      </div>

      <div className="footer-base">
        <span>© {new Date().getFullYear()} LOOM. All rights reserved.</span>
        <span className="foot-edge">The edge is intentional.</span>
        {/* the only control on the hem. `window.__lenis` does not exist under
            reduced motion, hence the native fallback rather than a guard that
            silently does nothing. */}
        <button type="button" className="foot-top" onClick={toTop} aria-label="Back to top">
          <FootIcon name="arrowUp" />
        </button>
      </div>
    </footer>
  )
}
