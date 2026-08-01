// Native-app chrome for mobile only — a floating bottom CTA pill that behaves
// like iOS Safari's URL bar: appears once you've scrolled past the hero,
// hides while flicking down, reappears the instant you scroll up, and stays
// out of the way while any overlay/menu owns the screen.
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useWizard } from '../lib/wizard.jsx'
import './mobilechrome.css'

const MOBILE_QUERY = '(max-width: 767px)'
const HIDE_ACCUM = 10 // px of same-direction travel before the pill flips state — the "lerp" against jitter

export function MobileChrome() {
  const [isMobile, setIsMobile] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [hiddenByScroll, setHiddenByScroll] = useState(false)
  const [locked, setLocked] = useState(false)
  const reduced = useReducedMotion()
  const { open } = useWizard()

  const lastYRef = useRef(0)
  const accumRef = useRef(0)
  const dirRef = useRef(0)

  // Mount/unmount with viewport — matches the (max-width: 767px) gate everywhere else in this file
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Reveal past the hero, and drive the direction-aware hide/show
  useEffect(() => {
    if (!isMobile) return
    lastYRef.current = window.scrollY
    const heroLimit = () => window.innerHeight * 0.82

    const onScroll = () => {
      const y = window.scrollY
      setPastHero(y > heroLimit())

      if (reduced) { lastYRef.current = y; return } // reduced-motion: no direction-based hiding, ever

      const dy = y - lastYRef.current
      lastYRef.current = y
      if (Math.abs(dy) < 0.5) return

      const dir = dy > 0 ? 1 : -1
      if (dir !== dirRef.current) {
        dirRef.current = dir
        accumRef.current = 0
      }
      accumRef.current += Math.abs(dy)

      if (dir < 0) {
        // scrolling up — reappear immediately, like Safari's chrome
        setHiddenByScroll(false)
        accumRef.current = 0
      } else if (y > heroLimit() && accumRef.current > HIDE_ACCUM) {
        setHiddenByScroll(true)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [isMobile, reduced])

  // Yield to overlays/menus — watched via class on <html>, same signal Lenis itself watches
  useEffect(() => {
    if (!isMobile) return
    const sync = () => {
      const html = document.documentElement
      setLocked(html.classList.contains('overlay-open') || html.classList.contains('menu-open'))
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [isMobile])

  if (!isMobile) return null

  const visible = pastHero && !hiddenByScroll && !locked

  return (
    <motion.div
      className="mobile-cta-pill"
      initial={false}
      animate={
        reduced
          ? { opacity: pastHero && !locked ? 1 : 0 }
          : { y: visible ? 0 : 96, opacity: visible ? 1 : 0 }
      }
      transition={
        reduced
          ? { duration: 0.2, ease: 'linear' }
          : { type: 'spring', bounce: 0, duration: 0.35 }
      }
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
      aria-hidden={!visible}
    >
      <button
        type="button"
        className="mobile-cta-pill__btn"
        onClick={() => open({})}
        tabIndex={visible ? 0 : -1}
      >
        Start a project
      </button>
    </motion.div>
  )
}
