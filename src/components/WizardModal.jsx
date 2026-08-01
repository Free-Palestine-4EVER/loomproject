// The site-wide contact popup. Mounted once in App; opened from anywhere via useWizard().
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { EASE } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { ContactWizard } from './ContactWizard.jsx'
import { BRAND } from '../data/site.js'

export function WizardModal() {
  const { isOpen, seed, close } = useWizard()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab') return
      // focus trap
      const f = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!f || !f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.documentElement.classList.add('overlay-open')
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => panelRef.current?.querySelector('button, input')?.focus(), 60)
    return () => {
      document.documentElement.classList.remove('overlay-open')
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [isOpen, close])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="wmodal"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog" aria-modal="true" aria-label="Start a project with LOOM"
        >
          <button className="wmodal-backdrop" onClick={close} aria-label="Close" tabIndex={-1} />
          <motion.div
            className="wmodal-panel" ref={panelRef}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <header className="wmodal-bar">
              <span className="wmodal-brand">LOOM — Start a project</span>
              <button className="wmodal-close" onClick={close} aria-label="Close">✕</button>
            </header>
            <div className="wmodal-scroll">
              <ContactWizard key={seed?._t} seed={seed} />
              <p className="wmodal-direct">
                Rather talk now? <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
