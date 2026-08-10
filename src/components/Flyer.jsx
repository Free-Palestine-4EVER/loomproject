// The butterfly that rides down the whole page.
//
// A fixed, full-viewport canvas above the copy and below the nav. It is fed
// scroll PROGRESS (0..1 across the document) and scroll VELOCITY in viewport
// heights per second; Companion.js turns those into a flight path with lag,
// buffeting and a flap that beats harder the faster you move.
//
// ——— THE DUCK IS GONE (11 Aug 2026, client request) ———
// This file used to fade the butterfly toward transparent whenever its
// projected on-screen box was over rendered text. That system is deleted, not
// disabled: the butterfly is now always at full opacity, everywhere on the
// page, which is what was asked for and is also the shape this file had back
// when it worked well (9240dc8, 110 lines).
//
// What went with it, and why none of it is worth keeping: a per-frame rAF loop
// of its own that projected the wingspan through the camera and allocated a
// fresh `window.__loomFlyerBBox` object every frame; a ~7.5Hz scan that ran
// `querySelectorAll('p, h1, h2, h3, h4, li, button, a')` over a 34,000px
// document and called `getBoundingClientRect()` on all ~440 matches, then walked
// the text nodes of every candidate with a TreeWalker and `Range.getClientRects()`
// to total up glyph area; and a four-axis Schmitt trigger (two area rails, two
// box sizes, asymmetric consecutive-agreement counts, a minimum hold) that
// existed purely to stop that binary predicate strobing at text boundaries.
// Roughly 180 lines and a second animation loop to decide an opacity.
//
// The speech-bubble system it was originally built to serve (a portalled
// `.flyer-say-layer`, a `SAYINGS` table, an eight-slot placement search) was
// removed on 10 Aug; the duck outlived the thing it existed for by a day. Both
// are in git — see 8acccce..0fd4744 on this file — if either is ever wanted.
//
// Kept from the duck era, because none of it is about the duck: the WebGL
// capability check, the save-data/low-memory gate, and booting off an idle
// callback rather than out of the scroll handler's own task.
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { hasWebGL } from '../three/webglSupport.js'
import './flyer.css'

// A device that has told us outright it cannot afford a decorative WebGL
// layer. Deliberately does NOT include "is a phone": the butterfly is not what
// makes this page expensive, so deleting it from every phone would cost the
// site its signature and buy almost nothing. `saveData` is the reader asking
// not to be sent 700 KB of decorative JS, and `deviceMemory <= 2` is a browser
// reporting a 2 GB phone. Safari reports neither, so an iPhone still gets the
// companion — correctly, because an iPhone is not the problem.
function isTooSmallToFly() {
  try {
    if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2) return true
    if (navigator.connection && navigator.connection.saveData === true) return true
  } catch (e) { /* neither API exists here; that is not a reason to bail */ }
  return false
}

export function Flyer() {
  const canvasRef = useRef(null)
  const reduced = useReducedMotion()
  // A visitor with no WebGL at all used to still get the full `.flyer-layer`
  // div + canvas — harmless, but a decorative layer that was never going to
  // draw anything doesn't need to mount at all.
  const [noGL] = useState(() => !hasWebGL())

  useEffect(() => {
    if (reduced || noGL || isTooSmallToFly()) return
    let cancelled = false
    let teardown = null
    let idle = 0
    let timer = 0

    // three + the model is ~700 KB for a decorative flyer, and it used to be
    // fetched the moment this mounted — straight into contention with the hero's
    // own first paint. Wait for the main thread to go quiet, or for the reader to
    // scroll, whichever lands first. The butterfly starts in the hero either way;
    // it is only ever a few hundred ms later than it was.
    const boot = async () => {
      const { Companion } = await import('../three/Companion.js')
      if (cancelled || !canvasRef.current) return
      let field
      try {
        field = new Companion(canvasRef.current, { reduced: false })
      } catch (e) {
        // WebGL unavailable (or the context limit is already spent on the hero)
        canvasRef.current.style.display = 'none'
        return
      }

      let lastY = window.scrollY
      let lastT = performance.now()

      const onScroll = () => {
        const now = performance.now()
        const dt = Math.max(16, now - lastT) / 1000
        const dy = window.scrollY - lastY
        lastY = window.scrollY
        lastT = now
        const doc = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        field.setScroll(window.scrollY / doc, dy / window.innerHeight / dt)
      }
      onScroll()

      const onVis = () => { document.hidden ? field.stop() : field.start() }
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll, { passive: true })
      document.addEventListener('visibilitychange', onVis)

      // A case study or the wizard opening locks page scroll but leaves the
      // butterfly's own rAF loop running underneath it — a second animation
      // loop fighting the overlay's own scroll/drag every frame, which is
      // exactly the "opens fine, then scrolling goes stiff" symptom. Same
      // overlay-open/menu-open signal Lenis and MobileChrome already watch.
      const lockObs = new MutationObserver(() => {
        const locked = document.documentElement.classList.contains('overlay-open')
          || document.documentElement.classList.contains('menu-open')
        locked ? field.stop() : (document.hidden || field.start())
      })
      lockObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

      // Dev-only handle so a QA probe can read attitude/velocity straight off
      // the instance instead of inferring it from pixels. Never in a build.
      if (import.meta.env.DEV) window.__loomFlyer = field

      teardown = () => {
        lockObs.disconnect()
        delete window.__loomFlyer
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
        document.removeEventListener('visibilitychange', onVis)
        field.dispose()
      }
    }

    // PERF: the scroll listener used to call boot() straight from the scroll
    // event's own task. boot()'s dynamic import is async (fine either way), but
    // once it resolved the continuation — `new Companion()`, which synchronously
    // builds 20 meshes and paints a canvas texture — ran in THAT SAME task,
    // landing its block exactly when the visitor had just started scrolling.
    // `bootIdle` re-defers through requestIdleCallback so the heavy work always
    // starts in a browser-reported idle window, never inside the input handler.
    let bootIdleHandle = 0
    const bootIdle = () => {
      if (window.requestIdleCallback) bootIdleHandle = requestIdleCallback(boot, { timeout: 600 })
      else bootIdleHandle = setTimeout(boot, 0)
    }
    const start = () => {
      window.removeEventListener('scroll', start)
      if (idle) cancelIdleCallback?.(idle)
      clearTimeout(timer)
      bootIdle()
    }
    window.addEventListener('scroll', start, { passive: true, once: true })
    idle = window.requestIdleCallback
      ? requestIdleCallback(start, { timeout: 2500 })
      : 0
    // Safari has no requestIdleCallback, and the timeout is the backstop when the
    // main thread never goes quiet.
    timer = setTimeout(start, window.requestIdleCallback ? 3000 : 1400)

    // unmounted before the chunk landed -> nothing was ever wired up
    return () => {
      cancelled = true
      window.removeEventListener('scroll', start)
      if (idle) cancelIdleCallback?.(idle)
      clearTimeout(timer)
      if (bootIdleHandle) { cancelIdleCallback?.(bootIdleHandle); clearTimeout(bootIdleHandle) }
      if (teardown) teardown()
    }
  }, [reduced, noGL])

  // Nothing is going to be drawn into it, and an empty full-viewport <canvas>
  // is still a compositor layer the size of the screen — so don't render one.
  if (reduced || noGL || isTooSmallToFly()) return null
  return (
    <div className="flyer-layer" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
