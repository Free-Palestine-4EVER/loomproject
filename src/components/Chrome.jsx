// Chrome: Loader, Nav, Cursor, ScrollProgress, Footer
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'motion/react'
import { BRAND, NICHES, NICHE_GROUPS } from '../data/site.js'
import { EASE, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { useAuth } from '../lib/auth.jsx'
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

// One array, three renderers (desktop header, mobile menu, footer). A hash is
// a section on the long page; a path is a dedicated route. `go` below leaves
// non-hash hrefs to the App-level handler, which pushStates and swaps the page.
/* The tab order MIRRORS the page order (see the band comments in App.jsx) —
   a nav that lists sections in a different sequence than the scroll does
   makes every tab feel like a jump backwards. Proof, then the qualifier,
   then the three things a visitor can buy, then capability.

   RE-SYNCED 9 Aug 2026 after the reorder. Two tabs had been left behind by it
   and read as jumps backwards: "AI Search" (#aeo) sat last-but-three while its
   section is the eighth thing on the page, so clicking it after MCP threw the
   reader 13,000px back UP; and "Typeface" (/type) sat above "AI Workshops"
   while `TypeShowcase` moved down to the R&D band and `WorkshopsPromo` closes
   the sell band. Verified against the rendered DOM — the long page's ordered
   ids are (re-verified 10 Aug 2026, after Voices and Process were REMOVED
   from the page at the client's request): top, work, counter(#solutions),
   offer, pricing, the-machine, aeo, ai-workshops, apps, mcp,
   typeface, studio, bolt, faq, contact, hiring. This list is that
   sequence, filtered to the tabs. Neither #voices nor #process ever had a
   tab — a testimonial and a "how we work" argument were both things you
   scrolled past on the way to the form, not destinations — and now neither
   id resolves on the page at all.

   #lab (ToolsLab, "3D Lab") dropped out of this sequence the same day: it
   merged into #apps (Suite.jsx) and no longer has its own tab or its own
   section. Twelve tabs remain, not thirteen — the counts quoted below are
   from before that merge and still describe the live breakpoint math, since
   removing one tab only gives the bar more room, never less. */
const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#solutions', label: 'Solutions' },
  /* Added 10 Aug 2026 with the section. Not `extra`: of the thirteen tabs
     this is the one a stranger is most likely to be hunting for, and the
     whole argument for the section was that a visitor who cannot find a
     floor assumes the ceiling — burying its tab in the burger between 1100
     and 1360 would re-open exactly that hole for laptop traffic. */
  { href: '#pricing', label: 'Pricing' },
  /* The Machine took the Crew slot on the page, so it takes the tab too —
     Crew and Ascent are gone, and #crew/#ascent no longer resolve. */
  { href: '#the-machine', label: 'Machine' },
  /* `extra` = shown everywhere EXCEPT the desktop bar between 1100 and 1360.
     Ten labels do not fit between the wordmark and the "Get started" pill until
     ~1360px, and the burger does not take over until 1100 — so a tenth tab
     buys 260px of a nav row sitting under the CTA. The mobile menu and the
     footer render it unconditionally; only `.nav-links a.is-extra` drops out,
     and only in that band. */
  { href: '#aeo', label: 'AI Search', extra: true },
  /* A path, not a hash — go() below lets it fall through to the App-level
     route handler, which pushStates and swaps in the dedicated page. The home
     page's own `WorkshopsPromo` (#ai-workshops) sits exactly here in the
     scroll, which is why the tab does too. */
  { href: '/ai-workshops', label: 'AI Workshops' },
  { href: '#apps', label: 'Apps' },
  /* AppsShowcase (#apps) and ToolsLab (#lab, "3D Lab") merged into one
     section — Suite.jsx — on 10 Aug 2026. #lab no longer resolves, so its
     tab is gone; #apps still resolves to the merged section and keeps its
     slot. Ten tabs remain in the always-visible/extra split below, so the
     1100–1360 bar math in the comment above still holds. */
  /* Demoted to `extra` on 10 Aug, when Pricing and FAQ took the list from
     eleven tabs to thirteen. Something had to leave the 1100–1360 bar and
     this is the most niche label on it — a private-beta developer protocol,
     addressed to an audience that arrives by link rather than by scanning a
     nav. It still renders in the burger and in the footer sitemap. */
  { href: '#mcp', label: 'MCP', extra: true },
  /* Same: a route, sitting where `#typeface` sits in the scroll. */
  { href: '/type', label: 'Typeface' },
  /* Sits between #bolt and #contact in the scroll, which is where it sits
     here. `extra` because a visitor who wants the FAQ is already reading the
     page and will reach it; the tab is for the one who came back looking for
     the ownership answer specifically. */
  { href: '#faq', label: 'FAQ', extra: true },
  { href: '#contact', label: 'Contact' },
]

/* THE INDUSTRIES DROPDOWN (desktop) / DISCLOSURE (mobile) — 11 Aug 2026.
   Solutions.jsx already owns the 30-niche index by category (`NICHES` /
   `NICHE_GROUPS` in data/site.js); this reuses that SAME data rather than
   hardcoding a second list, and reaches the section itself through a
   CustomEvent (`loom:select-niche`) since the long page may not even be
   mounted when the visitor is on a sub-page — App.jsx's route handler is what
   actually gets them back to '/' and scrolled to `#solutions` first, and
   Solutions.jsx picks the industry up from there. Same 7-group colour map
   Solutions.jsx uses for its own index, kept small and local here rather than
   imported from a component file. */
const NAV_GROUPS = NICHE_GROUPS.filter((g) => g.id !== 'all')
const NAV_GROUP_YARN = {
  food: 'var(--yarn-gold)', health: 'var(--yarn-blue)', beauty: 'var(--yarn-pink)',
  retail: 'var(--yarn-violet)', property: '#e0244a', services: '#a9a8b6', creative: 'var(--yarn-cream)',
}

const Chevron = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 12 8" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 1.5 6 6.5 11 1.5" />
  </svg>
)

/* Desktop: a hover/focus-revealed panel anchored to the existing "Solutions"
   tab — NOT a fourteenth tab and NOT extra width the bar has to fit, since
   the trigger is the same `<a>` qa-nav-fit.mjs already measures. The panel
   itself is absolutely positioned and does not participate in that layout. */
function NavIndustries({ link, go, onPick }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  const openNow = () => { clearTimeout(closeTimer.current); setOpen(true) }
  const closeSoon = () => { closeTimer.current = setTimeout(() => setOpen(false), 180) }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  useEffect(() => () => clearTimeout(closeTimer.current), [])

  return (
    <div className="nav-drop" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <a
        href={link.href}
        className={`nav-drop-trigger${link.extra ? ' is-extra' : ''}`}
        onClick={(e) => { setOpen(false); go(e, link.href) }}
        onFocus={openNow}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span data-text={link.label}>{link.label}</span>
        <Chevron className={`nav-drop-chev${open ? ' is-open' : ''}`} />
      </a>
      <AnimatePresence>
        {open && (
          <motion.div
            className="nav-drop-panel"
            role="menu"
            aria-label="Browse by industry"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            onMouseEnter={openNow}
            onMouseLeave={closeSoon}
          >
            <p className="nav-drop-lede">Thirty industries — the loom already knows yours.</p>
            <div className="nav-drop-grid">
              {NAV_GROUPS.map((g) => (
                <div className="nav-drop-col" key={g.id} style={{ '--grp-yarn': NAV_GROUP_YARN[g.id] }}>
                  <p className="nav-drop-glabel">{g.label}</p>
                  <ul>
                    {NICHES.filter((n) => n.group === g.id).map((n) => (
                      <li key={n.key}>
                        <button type="button" role="menuitem" onClick={() => { setOpen(false); onPick(n) }}>
                          {n.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* Mobile: a disclosure inside the drawer, below the big-type primary links —
   the industries are a secondary way in, not competing with WORK / SOLUTIONS
   / PRICING for the same scale of type. */
function MenuIndustries({ onPick }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="menu-industries">
      <button type="button" className="menu-ind-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>Browse by industry</span>
        <Chevron className={`menu-ind-chev${open ? ' is-open' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="menu-ind-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="menu-ind-inner">
              {NAV_GROUPS.map((g) => (
                <div className="menu-ind-group" key={g.id} style={{ '--grp-yarn': NAV_GROUP_YARN[g.id] }}>
                  <p className="menu-ind-glabel">{g.label}</p>
                  <div className="menu-ind-chips">
                    {NICHES.filter((n) => n.group === g.id).map((n) => (
                      <button key={n.key} type="button" onClick={() => onPick(n)}>{n.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* THE MOBILE MENU'S BACKGROUND — code-generated, nothing fetched. Three
   layers: a soft gradient ground (unchanged from before), two woven hatch
   passes at a whisper of opacity (the same warp/weft idea `loom-bg.css`
   carries elsewhere on the site, redrawn here in plain CSS gradients rather
   than shared with that layer, since this one sits inside a drawer that
   mounts and unmounts with the menu), and a small drift of petals reusing
   the footer's own `foot-fall` keyframe and hashed-not-random positioning —
   deterministic, so the set is identical every time the drawer opens rather
   than reshuffling. Reduced-motion drops the drift and the slow bloom pulse,
   keeps the gradient and the hatch. */
function MenuBackground() {
  const reduced = useReducedMotion()
  const petals = useMemo(
    () => Array.from({ length: 14 }, (_, i) => {
      const h = ((i * 2654435761) % 1000) / 1000
      const g = ((i * 40503) % 997) / 997
      return {
        i,
        leaf: i % 3 === 0,
        style: {
          '--x': `${4 + ((i * 6.8) % 92)}%`,
          '--s': 0.6 + h * 0.9,
          '--dx': `${-70 + g * 130}px`,
          '--rot': `${180 + h * 420}deg`,
          '--dur': `${9 + h * 8}s`,
          '--delay': `${-(g * 16).toFixed(2)}s`,
          '--o': 0.35 + g * 0.35,
        },
      }
    }),
    [],
  )
  return (
    <div className="menu-bg" aria-hidden="true">
      <span className="menu-bg-weave" />
      <span className="menu-bg-bloom menu-bg-bloom--a" />
      <span className="menu-bg-bloom menu-bg-bloom--b" />
      <span className="menu-bg-bloom menu-bg-bloom--c" />
      {!reduced && (
        <div className="menu-petals">
          {petals.map((p) => <i key={p.i} className={p.leaf ? 'is-leaf' : ''} style={p.style} />)}
        </div>
      )}
    </div>
  )
}

/* THE ACCOUNT CONTROL — deliberately NOT a fourteenth nav tab.
   `qa-nav-fit.mjs` verifies the bar at its documented 13-tab limit by
   measuring the gap between the last visible `.nav-links a` and `.nav-cta`'s
   left edge, and `.nav-cta` grows leftward as its own content grows — so this
   rides inside it, sized to add as little width as the burger does, rather
   than adding a label to `LINKS`. Signed out: a small pill that is the ONLY
   way into `/dashboard` from the header, since that route has no nav tab
   either. Signed in: a round initial that opens a two-item menu — the read
   never blocks on a network round trip past the first /me check, done once
   by AuthProvider; `loading` renders nothing rather than flashing "Sign in"
   before an existing session resolves. */
function NavAuth() {
  const { user, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (loading) return null

  if (!user) {
    return <a className="nav-auth-pill" href="/dashboard" aria-label="Sign in to your account">Sign in</a>
  }

  const initial = (user.email || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="nav-auth" ref={ref}>
      <button
        type="button"
        className="nav-auth-avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu — ${user.email || 'signed in'}`}
        onClick={() => setOpen((o) => !o)}
      >
        {initial}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="nav-auth-menu"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            <span className="nav-auth-email">{user.email}</span>
            <a role="menuitem" href="/dashboard" onClick={() => setOpen(false)}>Dashboard</a>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); signOut() }}>Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* Same account state, the drawer's own idiom — plain lines inside
   `.menu-meta`, alongside the WhatsApp number and the email address it
   already carries. `onClose` is the menu's own `setOpen(false)`, passed down
   so picking either link closes the drawer the same way every other link in
   it does. */
function MenuAuth({ onClose }) {
  const { user, loading, signOut } = useAuth()
  if (loading) return null
  if (!user) return <a href="/dashboard" onClick={onClose}>Sign in</a>
  return (
    <>
      <a href="/dashboard" onClick={onClose}>Dashboard — {user.email}</a>
      <button type="button" onClick={() => { signOut(); onClose?.() }}>Sign out</button>
    </>
  )
}

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
    // `/type` and `/ai-workshops` are paths, not scroll targets: onNavigate
    // would hand querySelector a string like '/type' and throw on the invalid
    // selector. Close the menu and let a non-hash click bubble as an ordinary
    // navigation — App.jsx's route interceptor picks it up from the document.
    if (!href.startsWith('#')) { setOpen(false); return }
    e.preventDefault(); setOpen(false); onNavigate(href)
  }
  // Shared by the desktop dropdown and the mobile disclosure — see the note
  // above NAV_GROUPS. Dispatches first so a listener already mounted on the
  // long page (Solutions.jsx) can act on it the instant the scroll lands.
  const pickNiche = (n) => {
    window.dispatchEvent(new CustomEvent('loom:select-niche', { detail: { key: n.key } }))
    setOpen(false)
    onNavigate('#solutions')
  }
  return (
    <>
      <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
        <a className="nav-logo" href="#top" onClick={(e) => go(e, '#top')} aria-label="LOOM — home">
          <img className="logo-woven" src="/img/logo/loom-woven-sm.webp" alt="LOOM" />
        </a>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) =>
            l.href === '#solutions' ? (
              <NavIndustries key={l.href} link={l} go={go} onPick={pickNiche} />
            ) : (
              <a
                key={l.href}
                href={l.href}
                className={l.extra ? 'is-extra' : undefined}
                onClick={(e) => go(e, l.href)}
              >
                <span data-text={l.label}>{l.label}</span>
              </a>
            ),
          )}
        </nav>
        <div className="nav-cta">
          <Magnetic strength={0.25}>
            <WoolButton label="Get started" size="small" onClick={() => { setOpen(false); openWizard({}) }} />
          </Magnetic>
          <NavAuth />
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
            data-lenis-prevent
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <MenuBackground />
            <div className="menu-content">
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
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.04 + LINKS.length * 0.03, duration: 0.4, ease: EASE }}
              >
                <MenuIndustries onPick={pickNiche} />
              </motion.div>
              <motion.div className="menu-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                <WoolButton label="Start weaving" size="big" onClick={() => { setOpen(false); openWizard({}) }} />
                <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
                <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
                <MenuAuth onClose={() => setOpen(false)} />
              </motion.div>
            </div>
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
  /* the share set. Brand glyphs are FILLED paths on `currentColor` with the
     stroke switched off — a logo drawn as a 1.7px outline stops being the logo,
     and these three are recognised by their silhouette or not at all. */
  linkedin: (
    <path fill="currentColor" stroke="none" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
  ),
  x: (
    <path fill="currentColor" stroke="none" d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
  ),
  facebook: (
    <path fill="currentColor" stroke="none" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
  ),
  link: (
    <>
      <path d="M10.5 13.5a4 4 0 0 0 5.66 0l2.55-2.55a4 4 0 1 0-5.66-5.66l-1.27 1.28" />
      <path d="M13.5 10.5a4 4 0 0 0-5.66 0l-2.55 2.55a4 4 0 1 0 5.66 5.66l1.27-1.28" />
    </>
  ),
  check: <path d="m4.8 12.6 4.7 4.7L19.2 7" />,
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
const EXPLORE = ['#work', '#pricing', '#the-machine', '#solutions', '#apps', '#contact']
const FOOT_COLS = [
  { title: 'Explore', links: LINKS.filter((l) => EXPLORE.includes(l.href)) },
  { title: 'Craft', links: LINKS.filter((l) => !EXPLORE.includes(l.href)) },
]

/* SHARE, not follow. LOOM has no social handles anywhere in the repo, and a
   footer that links to an Instagram account nobody has typed in is a broken
   promise on the last row of the page. These four hand the CURRENT url to a
   share intent instead — they need no account to exist, and they are the thing
   a visitor who liked the work actually wants. `url()` is read at click time,
   not at module scope, so a share from `/type` shares `/type`. */
const SHARE = [
  { id: 'whatsapp', label: 'Share on WhatsApp', to: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}` },
  { id: 'linkedin', label: 'Share on LinkedIn', to: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { id: 'x', label: 'Share on X', to: (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { id: 'facebook', label: 'Share on Facebook', to: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
]

function FootShare() {
  const [copied, setCopied] = useState(false)
  // the timeout is cleared on unmount: a 1.8s state write into a footer the
  // reader has already routed away from is a React warning and a real leak.
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  const url = () => window.location.href
  const title = `${BRAND.name} — ${BRAND.positioning}. ${BRAND.tagline}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url())
      setCopied(true)
    } catch {
      // clipboard is permission-gated and absent over plain http on a phone.
      // Falling back to the OS sheet is better than a button that does nothing.
      if (navigator.share) navigator.share({ title, url: url() }).catch(() => {})
    }
  }

  return (
    <div className="foot-share">
      <h3 className="foot-col-t">Share the studio</h3>
      <div className="foot-share-row">
        {SHARE.map((s) => (
          <a
            key={s.id}
            className="foot-sh"
            href={s.to('https://www.loomstudio-jo.com/', title)}
            aria-label={s.label}
            title={s.label}
            target="_blank"
            rel="noreferrer"
            /* the href carries the canonical url so the link is real with JS
               off and on a middle-click; the click swaps in the page the reader
               is actually on before the tab opens. */
            onClick={(e) => { e.currentTarget.href = s.to(url(), title) }}
          >
            <FootIcon name={s.id} />
          </a>
        ))}
        <button
          type="button"
          className={`foot-sh foot-sh--copy ${copied ? 'is-copied' : ''}`}
          onClick={copy}
          aria-label={copied ? 'Link copied' : 'Copy link'}
          title={copied ? 'Link copied' : 'Copy link'}
        >
          <FootIcon name={copied ? 'check' : 'link'} />
          <span className="foot-sh-say" aria-live="polite">{copied ? 'Copied' : ''}</span>
        </button>
      </div>
    </div>
  )
}

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

      {/* THREE COLUMNS, THE TREE IN THE MIDDLE: words left, blossom centre,
          contact right. The tree is the reason this footer exists, and stacking
          it above a four-up row of copy made it a header for a table. Standing
          it between the two halves puts it back where the eye ends and gives
          both columns a reason to be short. */}
      <div className="footer-grid">
        <div className="foot-side foot-side--l">
          <div className="foot-brand">
            <LoomMark className="footer-mark" />
            <p className="foot-tag">The AI-native creative agency.<br />We weave brands on the edge of creativity.</p>
            <p className="foot-cities">
              <FootIcon name="pin" />Amman × Sarajevo
            </p>
          </div>

          {/* same rule as Nav's go(): only hash links are scroll targets, path
              links bubble to the App-level route handler */}
          <div className="foot-cols">
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
          </div>
        </div>

        {/* THE TREE, IN THE MIDDLE COLUMN. It was a full-width flow item above
            the copy; it is a grid cell now, standing between the two columns
            with the brand on its left and the contact on its right. Being a
            CELL rather than a background is the whole trick — the columns sit
            beside it by the grid's own maths, so no text can ever land on the
            canopy and nothing needs a scrim to stay readable.

            `aria-hidden`, no alt: it says nothing the copy beside it does not.
            One <img> and composited transforms only — the page already runs two
            WebGL layers and the footer does not open a third to be pretty.

            `-hq` art, re-exported from the 1860px original: the shipped pair was
            downscaled to 1600 and encoded for a 560px slot, and this column
            shows it larger. New filenames, because the bytes changed and the
            caches would otherwise keep serving the small ones. */}
        <div className="foot-bloom" aria-hidden="true">
          <i className="foot-halo" />
          <picture style={{ display: 'contents' }}>
            <source media="(max-width: 767px)" type="image/avif" srcSet="/img/tree/bloom-tree-hq-sm.avif" />
            <source media="(max-width: 767px)" type="image/webp" srcSet="/img/tree/bloom-tree-hq-sm.webp" />
            <source type="image/avif" srcSet="/img/tree/bloom-tree-hq.avif" />
            <img
              className="foot-tree"
              src="/img/tree/bloom-tree-hq.webp"
              alt=""
              width={1860}
              height={1723}
              loading="lazy"
              decoding="async"
            />
          </picture>
        </div>

        <div className="foot-side foot-side--r">
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
        <FootShare />
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
