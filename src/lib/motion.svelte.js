/**
 * Shared motion primitives — split-text reveals, count-ups, magnetic buttons.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE ONE RULE THAT CHANGED IN THE PORT: NOTHING STARTS INVISIBLE.
 *
 * The React versions of these opened at `opacity: 0` and animated to 1 once
 * an observer fired. In a client-rendered SPA that was free — there was no
 * HTML before the JS ran, so "hidden until JS" cost nothing that was not
 * already lost.
 *
 * Under SSR it is the opposite, and it would have quietly destroyed the whole
 * reason for this rebuild: the server would ship perfect, complete, styled
 * HTML, and the first stylesheet would paint every section of it at zero
 * opacity — a blank page held blank until the hydration bundle landed. We
 * would have paid for SSR and shipped a slower-feeling site than the SPA.
 *
 * So every primitive here is written the other way round:
 *
 *   1. The server-rendered markup is the FINISHED state. No JS, no hydration,
 *      dead-slow connection, crawler with scripting off — the content is
 *      readable and correctly laid out.
 *   2. `armReveal()` runs on the client only, and only AFTER hydration. It is
 *      what adds the class that pushes an element back to its start pose, and
 *      it adds it only to elements that are still below the fold. Anything
 *      already on screen when hydration completes is left alone at its
 *      finished state — animating it in at that point is a flash, not a
 *      reveal.
 *   3. `prefers-reduced-motion` short-circuits step 2 entirely, so the whole
 *      pack collapses back to case 1.
 *
 * That inversion is why the animations here are CSS-driven with an
 * IntersectionObserver flipping one class, rather than a JS animation library
 * interpolating styles. It is also why `motion/react`'s replacement is ~40
 * lines instead of a dependency: the library's value was orchestrating an
 * initial→animate pair, and under SSR we are not allowed to have an initial.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { browser } from '$app/environment'

/** expo-out — the house easing. Same curve the React build used. */
export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
export const EASE_ARRAY = [0.16, 1, 0.3, 1]

/** Live `prefers-reduced-motion`, as a rune-backed singleton.
 *
 *  Read LIVE, not once at mount. Chrome's Battery Saver forces this query on,
 *  so a user flipping it mid-session is an ordinary laptop visitor, not a rare
 *  branch — and they must lose Lenis, the FX pack and the flyer immediately.
 *  On the server it reports false, which is correct: the server renders the
 *  finished state either way, and the client corrects on hydration. */
class ReducedMotion {
  current = $state(false)
  #mq = null

  start() {
    if (!browser || this.#mq) return () => {}
    this.#mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.current = this.#mq.matches
    const onChange = () => { this.current = this.#mq.matches }
    this.#mq.addEventListener('change', onChange)
    return () => {
      this.#mq?.removeEventListener('change', onChange)
      this.#mq = null
    }
  }
}
export const reducedMotion = new ReducedMotion()

/**
 * A direct, synchronous `prefers-reduced-motion` read — NOT the shared rune.
 *
 * Every entrance primitive below arms itself the instant it mounts, but
 * `reducedMotion.start()` (which sets the live rune from matchMedia) runs
 * from `+layout.svelte`'s `onMount`, and Svelte fires a child's mount effects
 * — including a `use:` action's own setup, and a child component's own
 * `onMount` — before its ancestors' `onMount` callbacks complete. On a
 * genuinely reduced-motion browser (not a mid-session toggle, which the rune
 * handles fine once it exists) that ordering means a below-the-fold section
 * can read `reducedMotion.current` as still `false` and arm to opacity 0
 * before the layout has had a chance to set it — the exact case this file's
 * top banner promises never happens. Falling back to a direct matchMedia
 * check at the one moment it matters (the initial gate, before the rune is
 * guaranteed to exist) closes that gap without every call site needing to
 * pass a reactive flag through `use:reveal={{ ... }}`. */
export function prefersReduced() {
  return browser && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Live `(pointer: coarse)` — swaps pointer-tilt for scroll-linked sway and
 *  hover-activate for tap-activate. */
class CoarsePointer {
  current = $state(false)
  start() {
    if (!browser) return () => {}
    const mq = window.matchMedia('(pointer: coarse)')
    this.current = mq.matches
    const update = () => { this.current = mq.matches }
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }
}
export const coarsePointer = new CoarsePointer()

/**
 * Svelte action: fade-rise into view. Replaces <Reveal>.
 *
 *   <div use:reveal>…</div>
 *   <div use:reveal={{ delay: 0.2, y: 60 }}>…</div>
 *
 * The element is rendered finished. On the client, if it is below the fold and
 * motion is allowed, we push it to the start pose and let an observer bring it
 * back. `once` never flips back — an element already painted must not be
 * dropped when you scroll away from it.
 */
export function reveal(node, opts = {}) {
  if (!browser) return {}
  const { delay = 0, y = 36, once = true, margin = '-10% 0px' } = opts

  let io = null
  let armed = false

  const finish = () => {
    node.style.transition = `opacity 0.32s ${EASE} ${delay}s, transform 0.32s ${EASE} ${delay}s`
    node.style.opacity = '1'
    node.style.transform = 'none'
    // Drop the compositor hint once the element has landed. Leaving
    // will-change on every revealed block promotes each to its own layer for
    // the life of the session — paid in style, paint and GPU memory, and
    // invisible in a JS profile because it is not script time.
    const clear = () => {
      node.style.willChange = ''
      node.removeEventListener('transitionend', clear)
    }
    node.addEventListener('transitionend', clear)
  }

  const arm = () => {
    if (reducedMotion.current || prefersReduced()) return
    const rect = node.getBoundingClientRect()
    // Already on screen at hydration: leave it finished. Animating it now
    // reads as a flash, not an entrance.
    if (rect.top < window.innerHeight * 0.92) return
    armed = true
    node.style.opacity = '0'
    node.style.transform = `translateY(${y}px)`
    node.style.willChange = 'opacity, transform'

    io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        finish()
        if (once) { io.disconnect(); io = null }
      } else if (!once) {
        node.style.opacity = '0'
        node.style.transform = `translateY(${y}px)`
      }
    }, { rootMargin: margin })
    io.observe(node)
  }

  arm()

  return {
    destroy() { io?.disconnect() },
    update(next) {
      // Reduced-motion flipped on mid-session with an element still armed and
      // waiting below the fold: it would sit at opacity 0 forever, because the
      // thing that was going to reveal it is exactly what just got switched
      // off. Release it.
      if (next?.reduced && armed) { io?.disconnect(); io = null; finish(); armed = false }
    },
  }
}

/**
 * Svelte action: true once the node has been within `margin` of the viewport.
 * Never flips back. Replaces useNearViewport.
 *
 * This is what keeps the LOOM Bloom planted cuts off the critical path — they
 * are 108–338 KB each, and naming one in a style is what makes the browser go
 * and fetch it, so anything set in a planted cut waits for this. Pick the
 * margin against the WEIGHT being armed, not against how early it would look
 * nice: a generous lead on a 390px phone, where the whole page stacks and
 * everything sits within a screen or two of the fold, fires at scrollY 0.
 */
export function nearViewport(node, { margin = '800px', onNear } = {}) {
  if (!browser) return {}
  if (!('IntersectionObserver' in window)) { onNear?.(); return {} }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { onNear?.(); io.disconnect() }
  }, { rootMargin: margin })
  io.observe(node)
  return { destroy: () => io.disconnect() }
}

/**
 * Svelte action: magnetic hover — element leans toward the cursor.
 * Fine pointers only, and never under reduced motion.
 */
export function magnetic(node, { strength = 0.35 } = {}) {
  if (!browser) return {}
  if (reducedMotion.current || !window.matchMedia('(pointer:fine)').matches) return {}

  const move = (e) => {
    const r = node.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    node.style.transform = `translate(${x * strength}px, ${y * strength}px)`
  }
  const leave = () => { node.style.transform = 'translate(0,0)' }

  node.addEventListener('mousemove', move)
  node.addEventListener('mouseleave', leave)
  return {
    destroy() {
      node.removeEventListener('mousemove', move)
      node.removeEventListener('mouseleave', leave)
    },
  }
}
