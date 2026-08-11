/**
 * Apple-quality draggable bottom sheet — mobile presentation for overlays/modals.
 * 1:1 drag with grab offset, rubber-band above rest, velocity-projected dismiss,
 * spring return with velocity handoff, fully interruptible. See docs/apple-design.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PORT NOTE — why this is a hand-rolled rAF spring, not `Spring` from
 * `svelte/motion`.
 *
 * The React version drove `y` with Motion's `useMotionValue` + `animate(...,
 * { type: 'spring', duration, bounce, velocity })` — a duration/bounce spring
 * that accepts an initial velocity in px/s, which is exactly the unit a
 * pointer-release measurement produces. Svelte's own `Spring` class is a
 * stiffness/damping spring with no velocity parameter on `set()` (only
 * `preserveMomentum`, a millisecond hand-wave, not a real initial velocity),
 * so it cannot reproduce "let go while moving fast -> the spring continues at
 * that speed" without a lossy re-derivation.
 *
 * PORTING.md's rule for `useSpring` ("never a spring simulation on the main
 * thread") is aimed at decorative scroll-linked motion, where a CSS transition
 * or one rAF writing a transform is strictly better. A drag-to-dismiss sheet
 * is the other case: the physics IS the interaction (rubber-band, projected
 * velocity, interruptible spring-back), so this keeps the same one-rAF-per-
 * gesture shape the rest of the house style uses, just carrying real velocity
 * through it.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { browser } from '$app/environment'
import { reducedMotion } from './motion.svelte.js'

const DECEL = 0.998 // Apple's momentum-projection deceleration constant
const DISMISS_RATIO = 0.32 // fraction of sheet height that counts as "gone" once projected
const FLICK_VELOCITY = 700 // px/s — fast enough to count as a flick regardless of position

const project = (v) => (v / 1000) * DECEL / (1 - DECEL)
const rubberband = (overshoot, dim, c = 0.55) => (overshoot * dim * c) / (dim + c * Math.abs(overshoot))

/**
 * Live `(max-width: 767px)` (or any query), as a rune-backed singleton — same
 * shape as `reducedMotion` / `coarsePointer` in `$lib/motion.svelte.js`.
 *
 * Unlike those two, this is not started once from `+layout.svelte` — the
 * components that need it (WizardModal, NeedModal, …) mount and unmount on
 * their own schedule, so `start()` is reference-counted: the listener is
 * created on the first caller and torn down only once the last caller's
 * effect cleans up, rather than being torn down by whichever caller happens
 * to unmount first.
 */
class IsMobile {
  current = $state(false)
  #mq = null
  #onChange = null
  #refs = 0

  start(query = '(max-width: 767px)') {
    if (!browser) return () => {}
    this.#refs++
    if (!this.#mq) {
      this.#mq = window.matchMedia(query)
      this.current = this.#mq.matches
      this.#onChange = () => { this.current = this.#mq.matches }
      this.#mq.addEventListener('change', this.#onChange)
    }
    return () => {
      this.#refs = Math.max(0, this.#refs - 1)
      if (this.#refs === 0 && this.#mq) {
        this.#mq.removeEventListener('change', this.#onChange)
        this.#mq = null
        this.#onChange = null
      }
    }
  }
}
export const isMobile = new IsMobile()

/**
 * BottomSheet — one per modal instance. Construct inside the component's
 * `<script>` (component init, per the runes rule), start the live-viewport
 * listener from an `$effect`, and read `.y` in the panel's inline transform.
 *
 *   const sheet = new BottomSheet(() => close())
 *   $effect(() => isMobile.start())
 *   …
 *   <div style="transform: translateY({sheet.y}px)" bind:this={panelEl}>
 */
export class BottomSheet {
  /** motion value in px, 0 = fully open (rest), positive = toward dismiss */
  y = $state(browser ? window.innerHeight : 0)

  #onDismiss
  #panelEl = null
  #heightPx = 0
  #raf = null
  #velocity = 0
  #dragging = null

  constructor(onDismiss) {
    this.#onDismiss = onDismiss
  }

  get reduced() { return reducedMotion.current }

  /** Attach to the sheet panel DOM node; used to measure its height for projection. */
  setPanel(el) { this.#panelEl = el }

  #measure() {
    this.#heightPx = this.#panelEl?.offsetHeight || Math.round((browser ? window.innerHeight : 800) * 0.9)
    return this.#heightPx
  }

  #stop() {
    if (this.#raf != null) { cancelAnimationFrame(this.#raf); this.#raf = null }
  }

  /** duration/bounce spring with an initial velocity, matching Motion's contract. */
  #springTo(target, { velocity = 0, bounce = 0, onComplete } = {}) {
    this.#stop()
    const duration = 0.4
    const zeta = 1 - bounce
    const omega = (2 * Math.PI) / duration
    const stiffness = omega * omega
    const damping = 2 * zeta * omega
    let v = velocity
    let last = performance.now()
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const delta = this.y - target
      const accel = -stiffness * delta - damping * v
      v += accel * dt
      this.y += v * dt
      if (Math.abs(v) < 0.4 && Math.abs(this.y - target) < 0.4) {
        this.y = target
        this.#raf = null
        onComplete?.()
        return
      }
      this.#raf = requestAnimationFrame(step)
    }
    this.#raf = requestAnimationFrame(step)
  }

  /** call on mount/open: slides up from offscreen with a critically-damped spring. */
  animateIn = () => {
    const h = this.#measure()
    if (this.reduced) { this.y = 0; return }
    this.y = h
    this.#springTo(0, { bounce: 0 })
  }

  /** call to dismiss (close button or drag-release): slides down the same
   *  path, then fires onDismiss when the spring settles. */
  animateOut = (velocity = 0) => {
    const h = this.#heightPx || this.#measure()
    if (this.reduced) { this.#onDismiss?.(); return }
    this.#springTo(h, {
      velocity,
      bounce: Math.abs(velocity) > FLICK_VELOCITY ? 0.2 : 0,
      onComplete: this.#onDismiss,
    })
  }

  #onPointerDown = (e) => {
    if (this.reduced) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    this.#stop() // interruptible: grab the live presentation value, never a target
    if (!this.#heightPx) this.#measure()
    this.#dragging = {
      grabY: e.clientY,
      startVal: this.y,
      history: [{ t: performance.now(), y: e.clientY }],
    }
  }

  #onPointerMove = (e) => {
    const d = this.#dragging
    if (!d) return
    const delta = e.clientY - d.grabY
    let next = d.startVal + delta
    if (next < 0) next = -rubberband(-next, this.#heightPx || 600) // resist above rest
    this.y = next
    d.history.push({ t: performance.now(), y: e.clientY })
    if (d.history.length > 6) d.history.shift()
  }

  #onPointerUp = () => {
    const d = this.#dragging
    if (!d) return
    this.#dragging = null
    let velocity = 0
    const hist = d.history
    if (hist.length >= 2) {
      const a = hist[0], b = hist[hist.length - 1]
      const dt = (b.t - a.t) / 1000
      if (dt > 0) velocity = (b.y - a.y) / dt
    }
    const current = this.y
    const h = this.#heightPx || 600
    const projected = current + project(velocity)
    const dismiss = projected > h * DISMISS_RATIO || velocity > FLICK_VELOCITY
    if (dismiss) this.animateOut(velocity)
    else this.#springTo(0, { velocity, bounce: Math.abs(velocity) > FLICK_VELOCITY ? 0.2 : 0 })
  }

  /** pointer handlers for the drag region (handle/header) — spread onto a node. */
  bind = {
    onpointerdown: (e) => this.#onPointerDown(e),
    onpointermove: (e) => this.#onPointerMove(e),
    onpointerup: (e) => this.#onPointerUp(e),
    onpointercancel: (e) => this.#onPointerUp(e),
  }
}

/**
 * Wraps a scrollable container's pointer handlers so a drag that starts while the
 * container is scrolled to top and moves downward hands off to the sheet's own drag —
 * lets the same region both scroll its content and drag the sheet closed.
 *
 *   const handoff = createSheetScrollHandoff(sheet.bind, () => bodyEl)
 *   <div bind:this={bodyEl} {...handoff}>
 */
export function createSheetScrollHandoff(bind, getScrollEl) {
  let state = null

  const onpointerdown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    state = { startY: e.clientY, active: false }
  }

  const onpointermove = (e) => {
    const s = state
    if (!s) return
    if (!s.active) {
      const dy = e.clientY - s.startY
      const atTop = (getScrollEl()?.scrollTop || 0) <= 0
      if (atTop && dy > 6) {
        s.active = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        bind.onpointerdown({ ...e, clientY: s.startY })
      } else if (dy < -6 || !atTop) {
        state = null
        return
      } else {
        return
      }
    }
    e.preventDefault()
    bind.onpointermove(e)
  }

  const onpointerup = (e) => {
    if (state?.active) bind.onpointerup(e)
    state = null
  }

  return { onpointerdown, onpointermove, onpointerup, onpointercancel: onpointerup }
}
