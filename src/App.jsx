import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { Loader, Nav, Cursor, ScrollProgress, Footer } from './components/Chrome.jsx'
import { Hero, Marquee, Manifesto, Services, Process, AiLoom, Stats, Studios, Contact } from './components/Sections.jsx'
import { Work } from './components/Work.jsx'
import { AppsShowcase, ToolsLab } from './components/Products.jsx'
import { Solutions } from './components/Solutions.jsx'
import { Crew } from './components/Crew.jsx'
import { Moon } from './components/Moon.jsx'
import { WizardProvider } from './lib/wizard.jsx'
import { WizardModal } from './components/WizardModal.jsx'
import { mountInteractions } from './lib/interactions.js'
import { mountFx } from './lib/fx.js'

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const lenisRef = useRef(null)

  // Lenis smooth scroll — disabled for reduced-motion users
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.02 })
    lenisRef.current = lenis
    window.__lenis = lenis // programmatic scroll hook (QA + integrations)
    let raf
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); lenis.destroy() }
  }, [])

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

  // pointer spotlight, card tilt, thread trail, active-section nav
  useEffect(() => mountInteractions(), [])

  // FX pack — velocity marquee, nav scramble, stat glitch, confetti threads, edge glow, hero shimmer
  useEffect(() => mountFx(), [])

  const navigate = (href) => {
    const el = href === '#top' ? document.body : document.querySelector(href)
    if (!el) return
    if (lenisRef.current) lenisRef.current.scrollTo(href === '#top' ? 0 : el, { offset: -70, duration: 1.4 })
    else el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <WizardProvider>
      <Loader done={loaded} />
      <Cursor />
      <ScrollProgress />
      <Nav onNavigate={navigate} />
      <main>
        <Hero />
        <Marquee />
        <Manifesto />
        <Services />
        <AiLoom />
        <Work />
        <AppsShowcase />
        <ToolsLab />
        <Crew />
        <Solutions />
        <Moon />
        <Process />
        <Stats />
        <Studios />
        <Contact />
      </main>
      <Footer onNavigate={navigate} />
      <WizardModal />
    </WizardProvider>
  )
}
