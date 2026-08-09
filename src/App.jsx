import { useCallback, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { Loader, Nav, Cursor, ScrollProgress, Footer } from './components/Chrome.jsx'
import { Hero, Marquee, Manifesto, Process, Stats, Studios, Contact } from './components/Sections.jsx'
import { Work } from './components/Work.jsx'
import { AppsShowcase, ToolsLab } from './components/Products.jsx'
import { OwnApps } from './components/OwnApps.jsx'
import { LoomMcp } from './components/LoomMcp.jsx'
import { AnswerEngine } from './components/AnswerEngine.jsx'
import { Solutions } from './components/Solutions.jsx'
import { TheMachine } from './components/TheMachine.jsx'
import { Hiring } from './components/Hiring.jsx'
import { Counter, OfferPair, Bolt } from './components/Banners.jsx'
import { MobileChrome } from './components/MobileChrome.jsx'
import { Flyer } from './components/Flyer.jsx'
import { WhatsAppFab } from './components/WhatsAppFab.jsx'
import { WizardProvider } from './lib/wizard.jsx'
import { WizardModal } from './components/WizardModal.jsx'
import { mountInteractions } from './lib/interactions.js'
import { mountFx } from './lib/fx.js'
import { mountViewportBudget } from './lib/viewportBudget.js'
import { Typeface } from './components/Typeface.jsx'
import { TypeShowcase } from './components/TypeShowcase.jsx'
import { Workshops } from './components/Workshops.jsx'
import { WorkshopsPromo } from './components/WorkshopsPromo.jsx'

// firebase.json rewrites ** -> /index.html, so every path already boots this
// SPA. A real URL therefore costs one pathname check, not a router dependency
// or a second Vite entry: /type renders the typeface specimen, /ai-workshops
// renders the workshops booking page, everything else renders the long page.
// Trailing slash tolerated (cleanUrls is on). PAGES is also the allow-list
// for the in-page link interceptor below.
const PAGES = ['/type', '/ai-workshops']

const currentRoute = () => {
  if (typeof window === 'undefined') return '/'
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return PAGES.includes(path) ? path : '/'
}

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const lenisRef = useRef(null)
  // Read once at mount, then keep in sync with back/forward — the in-page links
  // below use pushState, so popstate is the only way back without a reload.
  const [route, setRoute] = useState(currentRoute)
  useEffect(() => {
    const onPop = () => setRoute(currentRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Read live, not just at mount — a user who flips reduced-motion mid-session
  // (OS setting or Chrome's Battery Saver) must lose Lenis/FX immediately, not
  // just on next reload. Mirrors useIsMobile in lib/sheet.jsx.
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Lenis smooth scroll — disabled for reduced-motion users
  useEffect(() => {
    if (reducedMotion) return
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.02 })
    lenisRef.current = lenis
    window.__lenis = lenis // programmatic scroll hook (QA + integrations)
    let raf
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      lenisRef.current = null
      delete window.__lenis
    }
  }, [reducedMotion])

  // Pause smooth scroll while the menu or any overlay locks the page
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const locked = document.documentElement.classList.contains('overlay-open')
        || document.documentElement.classList.contains('menu-open')
      const lenis = lenisRef.current
      if (!lenis) return
      locked ? lenis.stop() : lenis.start()
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1100)
    return () => clearTimeout(t)
  }, [])

  // pointer spotlight, card tilt, thread trail, active-section nav — both
  // mount fns re-read the media query internally, so re-invoking on toggle
  // picks up the new state instead of leaving stale listeners mounted
  useEffect(() => mountInteractions(), [reducedMotion])

  // FX pack — velocity marquee, nav scramble, stat glitch, confetti threads, edge glow, hero shimmer
  useEffect(() => mountFx(), [reducedMotion])

  // What the page may spend off-screen: parks the showcase's 23 looping
  // animations, and on touch devices evicts far-off image bitmaps so a fast
  // flick cannot walk the tab into iOS Safari's memory ceiling.
  useEffect(() => mountViewportBudget(), [])

  // The sticky header's height is not a constant: it shrinks once the page is
  // scrolled, and the mobile bar is a different size again. A hardcoded -70
  // left five of the eight nav targets landing with their kicker and the top of
  // their h2 tucked behind a 96px header. Measure it at click time instead, and
  // keep a small breath below it. `--nav-anchor-gap` mirrors this for the
  // CSS-only path (scroll-margin-top, used by the reduced-motion fallback and
  // by a hash typed straight into the address bar).
  const anchorOffset = () => {
    const h = document.querySelector('header')?.getBoundingClientRect().height || 70
    return -(Math.round(h) + 18)
  }

  const navigate = useCallback((href) => {
    // A hash link clicked from a sub-page has no target in the DOM — the long
    // page is not mounted. Return to / first, then scroll on the commit after
    // the sections exist.
    if (href.startsWith('#') && currentRoute() !== '/') {
      window.history.pushState({}, '', '/')
      setRoute('/')
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const t = href === '#top' ? document.body : document.querySelector(href)
        if (!t) return
        if (lenisRef.current) lenisRef.current.scrollTo(href === '#top' ? 0 : t, { offset: anchorOffset(), duration: 1.2 })
        else t.scrollIntoView({ behavior: 'smooth' })
      }))
      return
    }
    const el = href === '#top' ? document.body : document.querySelector(href)
    if (!el) return
    const run = () => {
      if (lenisRef.current) lenisRef.current.scrollTo(href === '#top' ? 0 : el, { offset: anchorOffset(), duration: 1.4 })
      else el.scrollIntoView({ behavior: 'smooth' })
    }
    // The menu/overlay lock is released in the SAME commit as this click, and
    // lenis.start() runs reset() -> animate.stop(), which cancels any in-flight
    // scrollTo. Wait for the unlock to land before scrolling.
    const root = document.documentElement
    if (root.classList.contains('menu-open') || root.classList.contains('overlay-open'))
      requestAnimationFrame(() => requestAnimationFrame(run))
    else run()
  }, [])

  // In-page anchors marked [data-scroll] (the hero "See the work" CTA) had no
  // handler at all and fell through to the browser's native hash jump, landing
  // the target 86px under the fixed nav instead of at the Lenis offset of -70.
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.('a[data-scroll]')
      const href = a?.getAttribute('href')
      if (!href?.startsWith('#')) return
      e.preventDefault()
      navigate(href)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [navigate])

  // Client-side hop between / and the sub-pages. Same-origin, plain-left-click
  // only — modified clicks and new-tab middle clicks must stay native so
  // "open in new tab" on a link keeps working, and [download] must never be
  // intercepted or the font files would navigate instead of saving.
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest?.('a[href]')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const href = a.getAttribute('href')
      if (href !== '/' && !PAGES.includes(href)) return
      e.preventDefault()
      window.history.pushState({}, '', href)
      setRoute(href === '/' ? '/' : href)
      window.scrollTo(0, 0)
      if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <WizardProvider>
      {/* the loom never stops running — a fixed, compositor-only backdrop
          behind every section (see loom-bg.css) */}
      <div className="loom-bg" aria-hidden="true">
        <div className="loom-bg-warp" />
        <div className="loom-bg-dye"><i /><i /><i /></div>
        <div className="loom-bg-weft" />
        <div className="loom-bg-weft loom-bg-weft--low" />
      </div>
      <Loader done={loaded} />
      <Cursor />
      <ScrollProgress />
      <Nav onNavigate={navigate} />
      <main>
        {route === '/type' ? (
          /* /type — the specimen and download page for LOOM Bloom, the
             studio's own display face. Contact stays off it on purpose: the
             page's job is the download, not a lead. */
          <Typeface />
        ) : route === '/ai-workshops' ? (
          /* /ai-workshops — corporate AI training. Its own page because the
             booking form (module picker + live price) needs room the long
             page's sections don't have; the home page only pitches and links
             here via WorkshopsPromo, below. */
          <Workshops />
        ) : (
        <>
        {/* ORDER IS A CONVERSION DECISION, NOT A TASTE ONE (reordered 9 Aug 2026).
            The page runs in five bands, and nothing may be inserted without
            picking one:

              PROOF     hero → client wall → numbers → cases
              QUALIFY   the eight needs → the fork → thirty industries
              SELL      the three things a visitor can actually buy
              CAPABLE   what LOOM builds, including for itself
              CLOSE     process → why → where → offer → contact

            What moved and why is annotated at each seam below. The rule that
            drove all of it: nothing that cannot be bought today may sit above
            something that can. */}
        <Hero />
        {/* PROOF. Nineteen client names — Benetton, UNICEF, Vodafone — are the
            cheapest credibility on the page and cost the reader one second.
            They now run before anything asks for attention. */}
        <Marquee />
        {/* Stats came up from slot 17. 28 brands / 7 countries / 12 tools is
            the sentence a sceptic wants BEFORE reading sixteen case studies,
            not after every ask on the page has already been made. */}
        <Stats />
        {/* Work came up from slot 7. It was behind the typeface, the manifesto
            and two "start here" modules — the visitor was asked to choose a
            service before being shown a single thing LOOM had finished. */}
        <Work />
        {/* QUALIFY. Now that the proof has landed, the visitor places
            themselves: eight needs, then the fork ("I have a business" / "I
            have an idea"), then their own industry. Three self-selection
            beats in a row, all pointing at the SELL band under them. */}
        {/* MERGED, 9 Aug 2026. Solutions came up from slot 15 first — a
            qualifier is worthless after seven product pitches — and then
            straight into the Counter, because they were never two questions.
            "Which of these eight do you need?" and "which industry are you
            in?" are one ask with two doors, and running them as two full
            sections meant two kickers, two display headlines and two CTAs
            for a single decision. One section, one quote button at the end
            of it. See Solutions.jsx's `merged` prop for the tag swap. */}
        <Counter>
          <Solutions merged />
        </Counter>
        {/* Now AFTER the merged qualifier rather than between its halves. The
            fork is the fallback for the visitor who found themselves in
            neither the eight needs nor the thirty industries. */}
        <OfferPair />
        {/* SELL — the three offerings with a price and a way in, ranked by
            what LOOM actually wants sold. The Machine is the recurring
            subscription and now opens the band instead of arriving at 13,
            under two things nobody can buy. */}
        <TheMachine />
        {/* Same shelf, one step lighter: the Protocol puts LOOM inside the
            client's AI; this puts the CLIENT inside everyone else's. Four
            deliverables, one demo, one CTA. */}
        <AnswerEngine />
        {/* AI LOOM runs FOR a client, then AI LOOM teaches the client's own
            team to run. Has its own booking page with a live price, so it
            closes the sell band rather than trailing the capability one. */}
        <WorkshopsPromo />
        {/* CAPABLE — everything that answers "can they actually build it?"
            rather than "what am I buying?". Shipped work first, then tools,
            then the things that are honestly not for sale yet. */}
        <AppsShowcase />
        <ToolsLab />
        {/* OwnApps and the Protocol came DOWN from 10 and 11. OwnApps says in
            its own lede that nothing is live yet and the Protocol is private
            beta issued by hand — the two lowest-intent sections on the page
            were sitting in its highest-intent real estate, between the case
            studies and the offers. The old note claiming the Protocol must
            precede The Machine is retired with this move: a dev-tool waitlist
            does not outrank the subscription. */}
        <OwnApps />
        <LoomMcp />
        {/* TypeShowcase came down from slot 2 — it was the second thing a
            buyer saw, before one client name. A free typeface is the purest
            craft flex LOOM has and converts nobody; it belongs with the rest
            of the R&D, where it also stops pulling four heavy planted font
            cuts into the top of the page. /type still carries it in the nav
            for anyone who came for the font. */}
        <TypeShowcase />
        {/* CLOSE — an unbroken ramp to the ask. How it works, why it works,
            who does it, one last offer, then the form. Nothing new is
            introduced past this point. */}
        <Process />
        {/* Manifesto came down from slot 4. "Trends don't lead our work.
            Thinking does." is a claim, and a claim only pays once there is
            evidence behind it — it now reads as the conclusion of the page
            rather than its opening assertion. */}
        <Manifesto />
        <Studios />
        {/* BY RESULT (1.75 JOD per WhatsApp conversation) was retired 8 Aug 2026:
            LOOM cannot promise an outcome that depends on the client's own
            replies and market. `components/ByResult.jsx` is still in the tree,
            mounted by nothing. */}
        <Bolt />
        <Contact />
        {/* Last section on the page, just above the footer — the client asked
            for this literally ("just above the footer"). Contact carries the
            sales CTA; this is a different ask entirely (careers, not a lead),
            short enough that it reads as a footnote to the page rather than a
            second pitch competing with Contact's. */}
        <Hiring />
        </>
        )}
      </main>
      <Footer onNavigate={navigate} />
      {/* the butterfly rides the whole page, above the copy and under the nav */}
      <Flyer />
      <MobileChrome />
      <WhatsAppFab />
      <WizardModal />
    </WizardProvider>
  )
}
