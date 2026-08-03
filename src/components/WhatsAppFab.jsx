// Floating WhatsApp button — bottom-right on every viewport.
// Woven-wool mark to match the textile identity; opens a prefilled chat.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { BRAND } from '../data/site.js'
import './whatsapp-fab.css'

const HELLO = encodeURIComponent('Hi LOOM — I came from loomstudio-jo.com and I’d like to start a project.')

// Always short — this sits inside a small bubble next to a 76px button, not
// a sentence. Rotates so a reader who lingers doesn't see the same line
// on every cycle.
const PROMPTS = ['Message us', 'Any questions?', 'We reply fast', 'Say hi 👋']
const SHOW_MS = 5000
const HIDE_MS = 10000

/** Cycles PROMPTS on a show/hide loop — 5s visible, 10s gone, repeat.
 *  Paused whenever the FAB itself is hidden (an overlay/menu is open) so it
 *  can't pop back in behind a modal and re-trigger the moment it closes. */
function usePromptLoop(active) {
  const [visible, setVisible] = useState(false)
  const [i, setI] = useState(0)
  const timer = useRef(null)

  useEffect(() => {
    if (!active) { setVisible(false); return }
    let mounted = true
    const showTimer = () => {
      setVisible(true)
      timer.current = setTimeout(() => {
        if (!mounted) return
        setVisible(false)
        setI((n) => (n + 1) % PROMPTS.length)
        timer.current = setTimeout(() => { if (mounted) showTimer() }, HIDE_MS)
      }, SHOW_MS)
    }
    // a beat after mount, not instantly on load — the button itself is still
    // sliding in at that point (see the FAB's own spring below)
    timer.current = setTimeout(showTimer, 1400)
    return () => { mounted = false; clearTimeout(timer.current) }
  }, [active])

  return { visible, text: PROMPTS[i] }
}

export function WhatsAppFab() {
  const [locked, setLocked] = useState(false)
  const reduced = useReducedMotion()

  // Yield to overlays/menus — same signal MobileChrome watches
  useEffect(() => {
    const sync = () => {
      const html = document.documentElement
      setLocked(html.classList.contains('overlay-open') || html.classList.contains('menu-open'))
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const visible = !locked
  const prompt = usePromptLoop(visible && !reduced)

  return (
    <div className="wa-fab-stack">
      <AnimatePresence>
        {prompt.visible && (
          <motion.div
            className="wa-fab-bubble"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92 }}
            transition={{ type: 'spring', bounce: 0.35, duration: 0.4 }}
          >
            {prompt.text}
            <i className="wa-fab-bubble__tail" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.a
        className="wa-fab"
        href={`${BRAND.whatsapp}?text=${HELLO}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with LOOM on WhatsApp"
        initial={false}
        animate={
          reduced
            ? { opacity: visible ? 1 : 0 }
            : { y: visible ? 0 : 96, opacity: visible ? 1 : 0, scale: visible ? 1 : 0.9 }
        }
        transition={
          reduced
            ? { duration: 0.2, ease: 'linear' }
            : { type: 'spring', bounce: 0.2, duration: 0.4 }
        }
        style={{ pointerEvents: visible ? 'auto' : 'none' }}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
      >
        <img src="/img/whatsapp-wool.webp" alt="" width="192" height="192" loading="lazy" decoding="async" />
        <span className="wa-fab__label">WhatsApp us</span>
      </motion.a>
    </div>
  )
}
