/**
 * Anchor navigation — native smooth scroll.
 *
 * Everything in here is client-only by construction: it is called from
 * onMount, and it touches window on every line.
 *
 * ── LENIS WAS REMOVED — DO NOT RE-ADD IT FOR "SMOOTHNESS" ──
 * This file used to hand every scroll to Lenis, which intercepts wheel/touch
 * input and interpolates toward a target position frame by frame. That is
 * smooth-LOOKING but, by construction, always at least one frame behind the
 * input — real, measurable latency between the wheel turning and the page
 * moving. Native scroll on macOS/iOS/Chrome is already smooth (the compositor
 * does it) AND has zero input latency. The client's own words were "lenis is
 * making the scrooooool slooooow" — they were right, and it is not a tuning
 * problem (lerp, wheelMultiplier), it is the whole approach.
 *
 * Reduced-motion visitors were ALREADY on this exact native path — Lenis's
 * old `startLenis()` was a no-op under `reducedMotion.current`, so every
 * call site already had a working native fallback before this file lost the
 * Lenis branch entirely. Nothing here is new; the fallback is just the only
 * path now.
 */

import { browser } from '$app/environment'
import { goto } from '$app/navigation'

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
  const run = () => {
    if (href === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.querySelector(href)
    if (!el) return
    // NO manual offset here. `scrollIntoView` on a target with a CSS
    // `scroll-margin-top` (styles.css sets 114px / 92px under 900px on every
    // `section[id]`, to clear the sticky header) already parks the section
    // correctly under the header — adding a second, hand-measured header-gap
    // offset on top of that was the exact bug `anchorOffset()` used to carry
    // a long comment about: it applied the inset TWICE and parked every
    // anchor ~114px too low. Do not reintroduce a manual offset here.
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // The menu/overlay lock is released in the SAME commit as this click.
  // Waiting a couple of frames for the unlock (and any layout it triggers,
  // e.g. the drawer's scroll-lock removing a body inset) to land keeps the
  // scroll targeting the FINAL layout rather than one still mid-close.
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
