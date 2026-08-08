// Shared motion primitives — split-text reveals, count-ups, magnetic buttons.
import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

export const EASE = [0.16, 1, 0.3, 1] // expo-out — the house easing

/** True once the node has been within `margin` of the viewport. Never flips
 *  back — a face already painted must not be dropped when you scroll away.
 *
 *  This is what keeps the LOOM Bloom planted cuts off the critical path: they
 *  are 108–338 KB each and naming one in a style is what makes the browser go
 *  and fetch it, so anything set in a planted cut waits for this. Pick the
 *  margin against the WEIGHT being armed, not against how early it would look
 *  nice: a generous lead on a 390px phone, where the whole page stacks and
 *  everything sits within a screen or two of the fold, fires at scrollY 0. */
export function useNearViewport(ref, margin = '800px') {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (!('IntersectionObserver' in window)) { setNear(true); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setNear(true); io.disconnect() }
    }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, near, margin])
  return near
}

/** Words rise out of a clipping mask, staggered.
 *  NOTE: inView is observed on the CONTAINER — a word clipped inside its
 *  overflow:hidden mask has zero visible area, so per-word observers never fire. */
export function SplitWords({ text, as: Tag = 'span', className = '', delay = 0, once = true }) {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once, margin: '-8% 0px' })
  // will-change is only worth paying for while the words are actually moving —
  // `once: true` means they settle ~1s after entering view and never move again.
  // Gate on inView: out of view, initial === animate, so motion fires
  // onAnimationComplete immediately and a naive flag would settle too early.
  //
  // Which is why the hint keys off `inView && !settled`, not `!settled`.
  // Guarding setSettled with `if (inView)` stops an off-screen instance
  // settling too early, but it also means it never settles at all — nothing
  // animates, so onAnimationComplete never fires, and `!settled` alone left
  // every word of every un-reached heading promoted to its own compositor
  // layer for the whole session. On a 390px phone that measured 82 layers at
  // rest, and layerisation of that order is paid in style/paint/GPU memory —
  // it does not show up as script time, so it is invisible in a JS profile.
  const [settled, setSettled] = useState(false)
  const animating = inView && !settled
  const words = String(text).split(' ')
  const hidden = reduced ? { opacity: 0 } : { y: '110%', rotate: 4 }
  const shown = reduced ? { opacity: 1 } : { y: '0%', rotate: 0 }
  return (
    <Tag ref={ref} className={`sw ${animating ? 'is-animating' : ''} ${className}`} aria-label={text}>
      {words.map((w, i) => (
        <span className="sw-mask" key={i} aria-hidden="true">
          <motion.span
            className="sw-word"
            initial={hidden}
            animate={inView ? shown : hidden}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.045 }}
            onAnimationComplete={i === words.length - 1 ? () => { if (inView) setSettled(true) } : undefined}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

/** Fade-rise on scroll into view. */
export function Reveal({ children, delay = 0, y = 36, className = '', once = true, style }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-10% 0px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Number counts up when scrolled into view. */
export function CountUp({ value, suffix = '', duration = 1.6 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduced = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduced) { setN(value); return }
    let raf, start
    const tick = (t) => {
      if (start === undefined) start = t
      const p = Math.min((t - start) / (duration * 1000), 1)
      setN(Math.round(value * (1 - Math.pow(1 - p, 4))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration, reduced])
  return <span ref={ref}>{n}{suffix}</span>
}

/** True on coarse pointers (touch) — shared by Crew.jsx and Agents.jsx to
 *  swap pointer-tilt for scroll-linked sway and hover-activate for tap-activate. */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return coarse
}

/** Magnetic hover — element leans toward the cursor. */
export function Magnetic({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || reduced || !window.matchMedia('(pointer:fine)').matches) return
    const move = (e) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2)
      const y = e.clientY - (r.top + r.height / 2)
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`
    }
    const leave = () => { el.style.transform = 'translate(0,0)' }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave) }
  }, [strength, reduced])
  return <div ref={ref} className={`magnetic ${className}`}>{children}</div>
}
