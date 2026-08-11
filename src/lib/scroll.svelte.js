/**
 * Lenis smooth scroll + anchor navigation.
 *
 * Everything in here is client-only by construction: it is called from
 * onMount, and it touches window on every line.
 */

import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { reducedMotion } from '$lib/motion.svelte.js'

/** The live Lenis instance, or null under reduced motion. */
let lenis = null
export const getLenis = () => lenis

/**
 * The sticky header's height is NOT a constant: it shrinks once the page is
 * scrolled, and the mobile bar is a different size again. A hardcoded offset
 * left five of the eight nav targets landing with their kicker and the top of
 * their h2 tucked behind a 96px header. Measure it at click time instead.
 *
 * ── LENIS ALREADY READS `scroll-margin-top` — DO NOT ADD IT TWICE ──
 * Since lenis 1.3, `scrollTo(element)` subtracts the target's own computed
 * `scroll-margin-top` before it scrolls, and styles.css gives every
 * `section[id]` 114px (92px under 900px) for the CSS-only path — the one used
 * by reduced-motion readers and by a hash typed straight into the address bar.
 * Handing Lenis the measured header gap ON TOP of that applies the inset
 * twice: every <section> anchor parks ~114px too low, so the kicker lands in
 * the middle of the viewport under a header-sized hole.
 *
 * Measured on the real page when this was wrong: eight of the nine nav anchors
 * landed at rect.top 228 with an 86px header; the ninth, `#solutions`, is a
 * DIV (merged mode) with no scroll-margin and was the only one landing
 * correctly at 114.
 *
 * So: add the element's OWN scroll-margin back, and both paths agree at one
 * gap.
 */
export function anchorOffset(el) {
  const h = document.querySelector('header')?.getBoundingClientRect().height || 70
  const sm = el?.nodeType === 1 ? parseFloat(getComputedStyle(el).scrollMarginTop) || 0 : 0
  return -(Math.round(h) + 18) + sm
}

/** Start Lenis. Returns a teardown. No-op under reduced motion — those users
 *  get the browser's native scroll and none of this file's behaviour. */
export function startLenis(Lenis) {
  if (!browser || reducedMotion.current) return () => {}

  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.02 })
  window.__lenis = lenis // programmatic scroll hook (QA + integrations)

  let raf
  const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
  raf = requestAnimationFrame(loop)

  // Pause smooth scroll while the menu or any overlay locks the page.
  const obs = new MutationObserver(() => {
    if (!lenis) return
    const root = document.documentElement
    const locked = root.classList.contains('overlay-open') || root.classList.contains('menu-open')
    locked ? lenis.stop() : lenis.start()
  })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  return () => {
    cancelAnimationFrame(raf)
    obs.disconnect()
    lenis.destroy()
    lenis = null
    delete window.__lenis
  }
}

/**
 * Navigate to a hash anchor or a route.
 *
 * A hash link clicked from a sub-page has no target in the DOM — the long page
 * is simply not mounted. Go home first, then scroll once the sections exist.
 */
export async function navigate(href) {
  const onHome = window.location.pathname.replace(/\/+$/, '') === ''

  if (href.startsWith('#') && !onHome) {
    await goto('/')
    // Two frames: one for Kit to commit the route, one for the sections to lay
    // out. Scrolling on the first lands against a page that has not reflowed.
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToHash(href)))
    return
  }

  if (href.startsWith('#')) { scrollToHash(href); return }
  await goto(href)
}

function scrollToHash(href) {
  const el = href === '#top' ? document.body : document.querySelector(href)
  if (!el) return

  const run = () => {
    if (lenis) {
      lenis.scrollTo(href === '#top' ? 0 : el, {
        offset: href === '#top' ? 0 : anchorOffset(el),
        duration: 1.4,
      })
    } else {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // The menu/overlay lock is released in the SAME commit as this click, and
  // lenis.start() runs reset() → animate.stop(), which cancels any in-flight
  // scrollTo. Wait for the unlock to land before scrolling, or the scroll is
  // silently thrown away.
  const root = document.documentElement
  if (root.classList.contains('menu-open') || root.classList.contains('overlay-open')) {
    requestAnimationFrame(() => requestAnimationFrame(run))
  } else {
    run()
  }
}

/**
 * In-page anchors marked [data-scroll] (the hero "See the work" CTA). Without
 * this they fall through to the browser's native hash jump and land the target
 * under the fixed nav instead of at the measured offset.
 *
 * Kit's own link handling covers real routes, so unlike the React build this
 * only has to deal with hashes — the whole PAGES allow-list and the
 * modified-click / [download] / target=_blank guards are gone, because
 * SvelteKit's router already gets all of that right.
 */
export function mountAnchorLinks() {
  if (!browser) return () => {}
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest?.('a[data-scroll]')
    const href = a?.getAttribute('href')
    if (!href?.startsWith('#')) return
    e.preventDefault()
    navigate(href)
  }
  document.addEventListener('click', onClick)
  return () => document.removeEventListener('click', onClick)
}
