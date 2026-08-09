// ————————————————————————————————————————————————————————
// The persistent "Start a project" bar — DESKTOP ONLY.
//
// Mobile already had this: MobileChrome's floating pill, same label, same
// wizard, since before this file existed. Adding a second one there would put
// two identical pills in the same 40px of screen, so this mounts strictly
// above 767px and MobileChrome keeps everything below it. One CTA per
// viewport, two implementations, because the two viewports genuinely want
// different furniture.
//
// It is bottom-CENTRE, not bottom-right. The WhatsApp FAB owns the right
// corner (right: 28, 110px tall, plus a bubble that reaches up to 150) and
// the client asked for both to stay; a second thing in that corner would
// either overlap the bubble or push it somewhere it was not designed for.
// The centre is empty at every width and reads as a page-level action rather
// than a third floating widget.
//
// z-index 92 — the same layer WhatsAppFab and MobileChrome already sit on,
// deliberately UNDER the overlay (95) and the wizard modal (96), so a CTA to
// open a dialog is never painted on top of that dialog.
// ————————————————————————————————————————————————————————
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { useWizard } from '../lib/wizard.jsx'
import './startproject.css'

const DESKTOP_QUERY = '(min-width: 768px)'

export function StartProject() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [locked, setLocked] = useState(false)
  const reduced = useReducedMotion()
  const { open } = useWizard()

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Past the hero only. The hero already carries "Start weaving" as its own
  // primary button — showing this over it would be the same offer twice in
  // one screenful, and the floating copy would be the weaker of the two.
  useEffect(() => {
    if (!isDesktop) return
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.82)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isDesktop])

  // Hide while any overlay owns the screen. Same MutationObserver contract
  // App.jsx uses to stop Lenis — a fixed CTA left mounted under a modal is
  // still in the tab order, which is how a focus trap ends up trapping
  // nothing.
  useEffect(() => {
    const root = document.documentElement
    const read = () => setLocked(root.classList.contains('overlay-open') || root.classList.contains('menu-open'))
    read()
    const obs = new MutationObserver(read)
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const show = isDesktop && pastHero && !locked

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="sp-bar"
          initial={reduced ? { opacity: 0 } : { y: 26, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: 18, opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <button type="button" className="sp-btn" onClick={() => open({})}>
            <span className="sp-dot" aria-hidden="true" />
            Start a project
            <span className="sp-arrow" aria-hidden="true">→</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
