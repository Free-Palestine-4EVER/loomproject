// Apple-quality draggable bottom sheet — mobile presentation for overlays/modals.
// 1:1 drag with grab offset, rubber-band above rest, velocity-projected dismiss,
// spring return with velocity handoff, fully interruptible. See docs/apple-design.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMotionValue, animate, useReducedMotion } from 'motion/react'
import './sheet.css'

const DECEL = 0.998 // Apple's momentum-projection deceleration constant
const DISMISS_RATIO = 0.32 // fraction of sheet height that counts as "gone" once projected
const FLICK_VELOCITY = 700 // px/s — fast enough to count as a flick regardless of position

const project = (v) => (v / 1000) * DECEL / (1 - DECEL)
const rubberband = (overshoot, dim, c = 0.55) => (overshoot * dim * c) / (dim + c * Math.abs(overshoot))

/** True while the viewport is at/under the mobile breakpoint — tracks live resizes. */
export function useIsMobile(query = '(max-width: 767px)') {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return mobile
}

/**
 * useBottomSheet({ onDismiss }) -> { y, bind, animateIn, animateOut, panelRef, reduced }
 * y            — motion value in px, 0 = fully open (rest), positive = toward dismiss.
 * bind         — pointer handlers for the drag region (handle/header).
 * animateIn()  — call on mount/open: slides up from offscreen with a critically-damped spring.
 * animateOut(velocity?) — call to dismiss (close button or drag-release): slides down the same
 *                 path, then fires onDismiss when the spring settles.
 * panelRef     — attach to the sheet panel DOM node; used to measure its height for projection.
 */
export function useBottomSheet({ onDismiss } = {}) {
  // Seed off-screen (not 0) so the very first paint — before the mount effect can
  // measure and call animateIn() — never flashes the sheet open at rest.
  const y = useMotionValue(typeof window !== 'undefined' ? window.innerHeight : 0)
  const reduced = useReducedMotion()
  const panelRef = useRef(null)
  const activeAnim = useRef(null)
  const drag = useRef(null)
  const heightRef = useRef(0)

  const measure = useCallback(() => {
    heightRef.current = panelRef.current?.offsetHeight || Math.round(window.innerHeight * 0.9)
    return heightRef.current
  }, [])

  const springTo = useCallback((target, { velocity, bounce = 0, onComplete } = {}) => {
    activeAnim.current?.stop()
    activeAnim.current = animate(y, target, {
      type: 'spring', bounce, duration: 0.4, velocity, onComplete,
    })
    return activeAnim.current
  }, [y])

  const animateIn = useCallback(() => {
    const h = measure()
    if (reduced) { y.set(0); return }
    y.set(h)
    springTo(0, { bounce: 0 })
  }, [measure, reduced, springTo, y])

  const animateOut = useCallback((velocity = 0) => {
    const h = heightRef.current || measure()
    if (reduced) { onDismiss?.(); return }
    springTo(h, { velocity, bounce: Math.abs(velocity) > FLICK_VELOCITY ? 0.2 : 0, onComplete: onDismiss })
  }, [measure, reduced, springTo, onDismiss])

  const onPointerDown = useCallback((e) => {
    if (reduced) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    activeAnim.current?.stop() // interruptible: grab the live presentation value, never a target
    if (!heightRef.current) measure()
    drag.current = {
      grabY: e.clientY,
      startVal: y.get(),
      history: [{ t: performance.now(), y: e.clientY }],
    }
  }, [measure, reduced, y])

  const onPointerMove = useCallback((e) => {
    const d = drag.current
    if (!d) return
    const delta = e.clientY - d.grabY
    let next = d.startVal + delta
    if (next < 0) next = -rubberband(-next, heightRef.current || 600) // resist above rest
    y.set(next)
    d.history.push({ t: performance.now(), y: e.clientY })
    if (d.history.length > 6) d.history.shift()
  }, [y])

  const onPointerUp = useCallback((e) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    let velocity = 0
    const hist = d.history
    if (hist.length >= 2) {
      const a = hist[0], b = hist[hist.length - 1]
      const dt = (b.t - a.t) / 1000
      if (dt > 0) velocity = (b.y - a.y) / dt
    }
    const current = y.get()
    const h = heightRef.current || 600
    const projected = current + project(velocity)
    const dismiss = projected > h * DISMISS_RATIO || velocity > FLICK_VELOCITY
    if (dismiss) animateOut(velocity)
    else springTo(0, { velocity, bounce: Math.abs(velocity) > FLICK_VELOCITY ? 0.2 : 0 })
  }, [y, animateOut, springTo])

  const bind = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }),
    [onPointerDown, onPointerMove, onPointerUp]
  )

  return useMemo(
    () => ({ y, bind, animateIn, animateOut, panelRef, reduced }),
    [y, bind, animateIn, animateOut, reduced]
  )
}

/**
 * Wraps a scrollable container's pointer handlers so a drag that starts while the
 * container is scrolled to top and moves downward hands off to the sheet's own drag —
 * lets the same region both scroll its content and drag the sheet closed.
 */
export function useSheetScrollHandoff(bind, scrollRef) {
  const state = useRef(null)

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    state.current = { startY: e.clientY, active: false }
  }, [])

  const onPointerMove = useCallback((e) => {
    const s = state.current
    if (!s) return
    if (!s.active) {
      const dy = e.clientY - s.startY
      const atTop = (scrollRef.current?.scrollTop || 0) <= 0
      if (atTop && dy > 6) {
        s.active = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        bind.onPointerDown({ ...e, clientY: s.startY })
      } else if (dy < -6 || !atTop) {
        state.current = null
        return
      } else {
        return
      }
    }
    e.preventDefault()
    bind.onPointerMove(e)
  }, [bind, scrollRef])

  const onPointerUp = useCallback((e) => {
    if (state.current?.active) bind.onPointerUp(e)
    state.current = null
  }, [bind])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}

/** Visible drag handle — 44px+ hit area, small bar indicator. */
export function SheetHandle({ bind, className = '' }) {
  return (
    <div className={`sheet-handle-wrap ${className}`} {...bind}>
      <span className="sheet-handle" aria-hidden="true" />
    </div>
  )
}
