import { useCallback, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { Loader, Nav, Cursor, ScrollProgress, Footer } from './components/Chrome.jsx'
import { Hero, Marquee, Manifesto, Services, Process, AiLoom, Stats, Studios, Contact } from './components/Sections.jsx'
import { Work } from './components/Work.jsx'
import { AppsShowcase, ToolsLab } from './components/Products.jsx'
import { Solutions } from './components/Solutions.jsx'
import { Crew } from './components/Crew.jsx'
import { HQ } from './components/HQ.jsx'
import { Moon } from './components/Moon.jsx'
import { Counter, OfferPair, Bolt } from './components/Banners.jsx'
import { MobileChrome } from './components/MobileChrome.jsx'
import { Flyer } from './components/Flyer.jsx'
import { WizardProvider } from './lib/wizard.jsx'
import { WizardModal } from './components/WizardModal.jsx'
import { mountInteractions } from './lib/interactions.js'
import { mountFx } from './lib/fx.js'

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const lenisRef = useRef(null)

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

  const navigate = useCallback((href) => {
    const el = href === '#top' ? document.body : document.querySelector(href)
    if (!el) return
    const run = () => {
      if (lenisRef.current) lenisRef.current.scrollTo(href === '#top' ? 0 : el, { offset: -70, duration: 1.4 })
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
        <Hero />
        <Marquee />
        <Manifesto />
        <Services />
        <Counter />
        <AiLoom />
        <Work />
        <OfferPair />
        <AppsShowcase />
        <ToolsLab />
        <Crew />
        <HQ />
        <Solutions />
        <Moon />
        <Process />
        <Stats />
        <Bolt />
        <Studios />
        <Contact />
      </main>
      <Footer onNavigate={navigate} />
      {/* the butterfly rides the whole page, above the copy and under the nav */}
      <Flyer />
      <MobileChrome />
      <WizardModal />
    </WizardProvider>
  )
}
