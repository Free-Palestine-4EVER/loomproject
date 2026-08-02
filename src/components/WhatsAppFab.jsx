// Floating WhatsApp button — bottom-right on every viewport.
// Woven-wool mark to match the textile identity; opens a prefilled chat.
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BRAND } from '../data/site.js'
import './whatsapp-fab.css'

const HELLO = encodeURIComponent('Hi LOOM — I came from loomstudio-jo.com and I’d like to start a project.')

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

  return (
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
  )
}
