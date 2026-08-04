// Floating WhatsApp button — bottom-right on every viewport.
// Woven-wool mark to match the textile identity; opens a prefilled chat.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { BRAND } from '../data/site.js'
import './whatsapp-fab.css'

const HELLO = encodeURIComponent('Hi LOOM — I came from loomstudio-jo.com and I’d like to start a project.')

// ── the safe zone ──
// A real FAB is allowed to float over content — that alone isn't the bug.
// The bug was this button parked on top of running body copy at its full
// 110px size. Rather than guess a "safe" position that some future card
// layout invalidates, this measures: is the button's own RESTING footprint
// currently over rendered, non-empty text? If so it collapses toward a
// smaller, softer resting state (see useTextDuck below) until either the
// text scrolls out from under it or the reader actually goes to use it
// (hover/focus instantly restores full size, per useTextDuck's `hovering`
// escape hatch) — "collapse until hovered/scrolled to", not "hide".
//
// Selector kept identical to Flyer.jsx's — and to the QA probe — so "what we
// duck for" and "what gets measured" never quietly drift apart.
const TEXT_SELECTOR = 'p, h1, h2, h3, h4, li, button, a'
const DUCK_CHECK_MS = 160

// A big case-study card is one <button> wrapping a screenshot mockup plus a
// headline/meta strip — that button's own getBoundingClientRect() covers the
// screenshot too, and the FAB nudging a thumbnail is not "sitting on copy".
// So the real test is against the box of the element's rendered TEXT GLYPHS
// (every non-whitespace text node, via Range.getClientRects()), not the
// element's own box — that box is only used first as a cheap reject.
function textGlyphRects(el) {
  const rects = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue && n.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  })
  const range = document.createRange()
  let node
  while ((node = walker.nextNode())) {
    range.selectNodeContents(node)
    const list = range.getClientRects()
    for (let i = 0; i < list.length; i++) rects.push(list[i])
  }
  return rects
}

function overlapsText(rect, exclude) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false
  const vw = window.innerWidth, vh = window.innerHeight
  if (rect.right <= 0 || rect.left >= vw || rect.bottom <= 0 || rect.top >= vh) return false
  const nodes = document.querySelectorAll(TEXT_SELECTOR)
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i]
    if (exclude && el.closest(exclude)) continue
    const text = el.textContent
    if (!text || text.trim().length < 3) continue
    const outer = el.getBoundingClientRect()
    if (outer.width <= 0 || outer.height <= 0) continue
    if (outer.right <= rect.left || outer.left >= rect.right || outer.bottom <= rect.top || outer.top >= rect.bottom) continue
    for (const r of textGlyphRects(el)) {
      if (r.width <= 0 || r.height <= 0) continue
      if (r.right <= rect.left || r.left >= rect.right || r.bottom <= rect.top || r.top >= rect.bottom) continue
      return true
    }
  }
  return false
}

/** Polls whether `ref`'s element sits on top of text, `active` gates it off
 *  (hidden behind an overlay/menu — nothing to duck from).
 *
 *  Hysteresis: the collision test always runs against the last known RESTING
 *  (full-size, not-yet-shrunk) box, cached the moment we're NOT ducking.
 *  Testing the live box instead would create a feedback loop — shrink because
 *  of an overlap, the smaller box promptly clears it, un-shrink, immediately
 *  re-collide, shrink again, forever. Testing the constant full-size box
 *  means the duck state only flips when the text underneath (which is what's
 *  actually moving, via scroll) genuinely arrives or leaves. */
function useTextDuck(ref, active) {
  const [ducking, setDucking] = useState(false)
  const duckingRef = useRef(false)
  const restRect = useRef(null)

  useEffect(() => {
    if (!active) { duckingRef.current = false; setDucking(false); return }
    const tick = () => {
      const el = ref.current
      if (!el) return
      if (!duckingRef.current) restRect.current = el.getBoundingClientRect()
      const overlap = overlapsText(restRect.current, '.wa-fab-stack')
      if (overlap !== duckingRef.current) {
        duckingRef.current = overlap
        setDucking(overlap)
      }
    }
    tick()
    const id = setInterval(tick, DUCK_CHECK_MS)
    window.addEventListener('resize', tick, { passive: true })
    return () => { clearInterval(id); window.removeEventListener('resize', tick) }
  }, [active, ref])

  return ducking
}

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
  const [hovering, setHovering] = useState(false)
  const reduced = useReducedMotion()
  const fabRef = useRef(null)

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
  const ducking = useTextDuck(fabRef, visible)
  // Hovering/focusing is the reader reaching for it on purpose — full size,
  // full opacity, every time, regardless of what's under it.
  const duckActive = ducking && !hovering
  const prompt = usePromptLoop(visible && !reduced && !duckActive)

  const restingScale = visible ? 1 : 0.9
  const scale = duckActive ? 0.56 : restingScale
  const opacity = !visible ? 0 : duckActive ? 0.62 : 1

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
        ref={fabRef}
        className={`wa-fab${duckActive ? ' is-ducking' : ''}`}
        href={`${BRAND.whatsapp}?text=${HELLO}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with LOOM on WhatsApp"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        initial={false}
        animate={
          reduced
            ? { opacity, scale }
            : { y: visible ? 0 : 96, opacity, scale }
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
        {/* `loading="lazy"` is a no-op here — this button is `position: fixed`
            inside the viewport rect from the first frame, so the browser's
            viewport-proximity heuristic always treats it as already visible
            and fetches it immediately regardless of the attribute. The lever
            that actually works for an always-in-view fixed element is
            priority, not laziness: `fetchPriority="low"` keeps the request
            off the critical path so it doesn't compete with the hero art and
            fonts for bandwidth on first paint, without leaving the button
            visibly empty the way deferring the src until an interaction
            would. */}
        <img
          src="/img/whatsapp-wool.webp"
          alt=""
          width="192"
          height="192"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
        <span className="wa-fab__label">WhatsApp us</span>
      </motion.a>
    </div>
  )
}
