// ————————————————————————————————————————————————————————
// The need panel — what a Counter tile opens now.
//
// The tile used to call openWizard({ note: need }) directly: eight
// photographs of a decision, and the first touch produced a form. The page
// never said what "AI systems" or "Brand identity" actually means at LOOM, so
// the form was asking for a commitment the page had not earned yet. This sits
// between them — the detail, then the brief — and the wizard still receives
// the same `note`, so nothing downstream of it changed.
//
// It deliberately reuses WizardModal's overlay contract rather than inventing
// a second one: `.overlay-open` on <html> (App.jsx's MutationObserver watches
// that class and stops Lenis on it — a modal that forgets it leaves the page
// scrolling underneath), Escape to close, a Tab focus trap, and the shared
// bottom-sheet on phones. Two overlays with two different contracts is how a
// site ends up with one of them scrolling the body behind it.
// ————————————————————————————————————————————————————————
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { EASE } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { NEEDS } from '../data/needs.js'
import { WoolButton } from './Wool.jsx'
import { useBottomSheet, useIsMobile, SheetHandle, useSheetScrollHandoff } from '../lib/sheet.jsx'

import './needmodal.css'

export function NeedModal({ need, onClose }) {
  const { open: openWizard } = useWizard()
  const reduced = useReducedMotion()
  const panelRef = useRef(null)
  const bodyRef = useRef(null)
  const isMobile = useIsMobile()
  const sheet = useBottomSheet({ onDismiss: onClose })
  // Lets .nm-body both scroll its own content AND drag the sheet shut when a
  // downward drag starts at scrollTop 0. Without it the panel is a scroller
  // on a phone and the sheet gesture only works on the 20px handle.
  const handoff = useSheetScrollHandoff(sheet.bind, bodyRef)

  // `need` is the prop; `shown` is what is on screen. They diverge the moment
  // a "pairs with" button swaps the panel's contents without closing it —
  // that is the whole point of the cross-sell, and it is why this is local
  // state seeded from the prop rather than the prop read directly.
  const [shown, setShown] = useState(need)
  useEffect(() => { if (need) setShown(need) }, [need])

  const isOpen = Boolean(need)
  const d = shown ? NEEDS[shown] : null

  const requestClose = useCallback(() => {
    if (isMobile && !sheet.reduced) sheet.animateOut()
    else onClose()
  }, [isMobile, sheet, onClose])

  useEffect(() => {
    if (isOpen && isMobile) sheet.animateIn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMobile])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') { requestClose(); return }
      if (e.key !== 'Tab') return
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
    const t = setTimeout(() => panelRef.current?.querySelector('.nm-close')?.focus(), 60)
    return () => {
      document.documentElement.classList.remove('overlay-open')
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [isOpen, requestClose])

  // Swapping to a paired need scrolls the panel's own scroller back to the
  // top. Without this the reader lands halfway down a panel they have not
  // read, because the scroll position belongs to the SCROLLER and the
  // scroller did not unmount — only its contents changed.
  const swapTo = useCallback((next) => {
    setShown(next)
    bodyRef.current?.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }, [reduced])

  const start = useCallback(() => {
    // close first, then open the wizard: two overlays both holding
    // `.overlay-open` means the class survives the first one's cleanup and
    // Lenis stays stopped after the second closes. Ordering, not timing.
    onClose()
    requestAnimationFrame(() => openWizard({ note: shown }))
  }, [onClose, openWizard, shown])

  const panelProps = isMobile
    ? {
        className: 'nm-panel is-sheet',
        style: { y: sheet.y },
        ref: (el) => { panelRef.current = el; sheet.panelRef.current = el },
      }
    : {
        className: 'nm-panel',
        ref: panelRef,
        initial: reduced ? false : { y: 42, opacity: 0, scale: 0.985 },
        animate: { y: 0, opacity: 1, scale: 1 },
        exit: reduced ? { opacity: 0 } : { y: 26, opacity: 0, scale: 0.99 },
        transition: { duration: reduced ? 0.01 : 0.5, ease: EASE },
      }

  return (
    <AnimatePresence>
      {isOpen && d && (
        <motion.div
          className="nm-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.35, ease: EASE }}
          onClick={(e) => { if (e.target === e.currentTarget) requestClose() }}
        >
          <motion.div
            {...panelProps}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nm-title"
            style={{ ...(panelProps.style || {}), '--nm-yarn': `var(--yarn-${d.yarn}, var(--magenta))` }}
          >
            {isMobile && <SheetHandle bind={sheet.bind} />}

            <button type="button" className="nm-close" onClick={requestClose} aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="nm-body" ref={bodyRef} {...(isMobile ? handoff : {})}>
              {/* The hero is the same 21:9 the tile itself wears, so the panel
                  reads as that tile enlarged rather than as a new place —
                  1400x600, the ratio the whole need set is rendered at.

                  ONE candidate per <source>. A srcset of two bare URLs with
                  no descriptor is not a fallback chain, it is two 1x
                  candidates and therefore invalid — the browser is free to
                  pick either. When the dedicated panel art lands, this points
                  at it by swapping the path, not by listing both. */}
              <div className="nm-hero">
                <picture style={{ display: 'contents' }}>
                  <source type="image/avif" srcSet={`/img/needs/${d.key}-wide.avif`} />
                  <img
                    className="nm-hero-img"
                    src={`/img/needs/${d.key}-wide.webp`}
                    alt=""
                    width={1400}
                    height={600}
                    decoding="async"
                  />
                </picture>
                <div className="nm-hero-ink">
                  <p className="nm-kicker">{d.group}</p>
                  <h2 className="nm-title" id="nm-title">{shown}</h2>
                </div>
              </div>

              <p className="nm-hook">{d.hook}</p>
              <p className="nm-para">{d.body}</p>

              <div className="nm-grid">
                <div className="nm-col">
                  <h3 className="nm-h3">What arrives</h3>
                  <ul className="nm-list">
                    {d.deliverables.map((line) => (
                      <li key={line}><i className="nm-tick" aria-hidden="true" />{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="nm-col nm-col--side">
                  <div className="nm-fact">
                    <p className="nm-fact-label">Timeline</p>
                    <p className="nm-fact-value">{d.timeline}</p>
                  </div>
                  <div className="nm-fact">
                    <p className="nm-fact-label">Pairs with</p>
                    <div className="nm-pairs">
                      {d.pairs.filter((p) => NEEDS[p]).map((p) => (
                        <button type="button" key={p} className="nm-pair" onClick={() => swapTo(p)}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <p className="nm-proof"><span>Why us</span>{d.proof}</p>
            </div>

            {/* Outside .nm-body on purpose: the body scrolls, this does not.
                A CTA that scrolls out of a 90vh panel is a CTA the reader has
                to go looking for. */}
            <div className="nm-foot">
              <WoolButton label="Start a project" size="big" onClick={start} />
              <button type="button" className="nm-foot-link" onClick={requestClose}>
                Keep looking
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
