// The butterfly that rides down the whole page.
//
// A fixed, full-viewport canvas above the copy and below the nav. It is fed
// scroll PROGRESS (0..1 across the document) and scroll VELOCITY in viewport
// heights per second; Companion.js turns those into a flight path with lag,
// buffeting and a flap that beats harder the faster you move.
//
// Companion's PATH waypoints already keep to the outer thirds "for most of
// the page" (see its own comment) — but "outer third of the viewport" is not
// the same as "outside the content", because on real breakpoints the card
// grids run close to full width. Chasing that with more path tuning means
// hardcoding knowledge of every section's layout into a decorative flight
// path, which six other agents are actively rewriting right now. Instead this
// duck logic asks the one question that actually matters, live, every ~130ms:
// is the butterfly's PROJECTED on-screen box currently over rendered, non-empty
// text? If so it fades toward transparent until it clears — it never freezes,
// never teleports, and never stops flying, it just stops fighting the copy for
// attention. `window.__loomFlyerBBox` exposes the same projected box (plus the
// live opacity) so a Playwright probe can measure the true visual overlap
// instead of the full-viewport canvas element's own (meaningless) bounding rect.
//
// REMOVED 10 Aug 2026, client request ("remove the butterfly text"): this
// file used to also own a bilingual EN/AR speech-bubble system — a portalled
// `.flyer-say-layer`, a `SAYINGS` table of zone-triggered lines, and a
// scored eight-slot placement search that kept the bubble off the page's own
// content. All of it is gone, not just hidden: no portal renders, no
// placement search runs, no SAY_* timer fires. The old placement-scoring
// comment block (measured clipping bugs, the stickiness rule, the cost of
// the scan) documented a system that no longer exists, so it went with it —
// see git history (this file, pre-10-Aug-2026) if the bubble is ever wanted
// back. `flyer-say.css` is left in the tree unreferenced, same convention as
// `Voices.jsx`/`AscentLoom`, since nothing here imports it any more.
//
// The butterfly itself — flight, flap, the DUCK (fading off copy; see below)
// — is unchanged.
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { hasWebGL } from '../three/webglSupport.js'
import './flyer.css'

// Kept identical to the selector list the QA probe uses, so "what we duck for"
// and "what we measure against" can never quietly drift apart.
const TEXT_SELECTOR = 'p, h1, h2, h3, h4, li, button, a'
const DUCK_CHECK_MS = 130

// The duck ignores the flyer's own layer (obviously) and the WhatsApp FAB,
// whose label is chrome rather than copy the butterfly could be said to be
// obscuring.
const SELF_SELECTOR = '.flyer-layer, .wa-fab-stack'

// ── hysteresis ──────────────────────────────────────────────────────────────
// MEASURED BUG (the "glitching"). The duck used to be a bare
// `classList.toggle('is-ducking', overlapsText(box))` at 7.5 Hz: a BINARY
// predicate, on a CONTINUOUS quantity (how much glyph area is under the wing),
// with no memory. Anywhere near a text boundary — and a slow idle wander parks
// it there for seconds at a time — the predicate flips on consecutive checks.
// Instrumented with a MutationObserver on the class attribute (no sampling, so
// no flip can be missed): 10 / 11 / 12 flips per 20s of scripted wheel scroll,
// including pairs 133ms, 277ms and 405ms apart — faster than the 0.45s opacity
// transition in flyer.css can even finish, so the layer never reached 1 or
// 0.45, it strobed somewhere in between. That is the glitch.
//
// The fix is a SCHMITT TRIGGER, on all four axes at once, because each one
// alone still leaves a case:
//
//   1. TWO AREA THRESHOLDS, not one. Ducking starts at ENTER_AREA of glyph
//      overlap and only stops below EXIT_AREA, which is far lower. A box
//      hovering at exactly the enter threshold therefore cannot un-duck: it
//      has to actually get clear.
//   2. ASYMMETRIC BOX. Entering tests the tight box (wingspan + a small flap
//      margin). Leaving tests a deliberately BIGGER one, so "clear" means
//      clear with room, not clear by a pixel.
//   3. CONSECUTIVE AGREEMENT. One disagreeing check never flips the state.
//      Asymmetric again: ducking off copy should be responsive (2 checks,
//      ~260ms); un-ducking is the direction that reads as a flicker when it is
//      wrong, so it needs ~0.8s of sustained agreement.
//   4. MINIMUM HOLD. Whatever the checks say, the class cannot change more
//      often than DUCK_MIN_HOLD_MS — set well above the 0.45s CSS fade, which
//      makes "flips faster than the fade can render" structurally impossible
//      rather than merely unlikely.
//
// Everything here is biased toward STAYING ducked. That asymmetry is free:
// ducked is opacity 0.45, a visible butterfly, so an extra second of it costs
// nothing, while an extra second of a butterfly sitting opaque on a headline
// is the bug this whole system exists to prevent.
const DUCK_ENTER_PAD = 0.24   // × half-wingspan, margin for flap/bounce
const DUCK_EXIT_PAD = 1.15    // must be THIS clear of text to un-duck
const DUCK_ENTER_CHECKS = 2   // ~260ms of agreement to start ducking
const DUCK_EXIT_CHECKS = 6    // ~780ms of agreement to stop
const DUCK_MIN_HOLD_MS = 1100 // >> the 0.45s fade in flyer.css

// A single stray glyph rect touching the projected box's own safety margin
// used to be enough to blank the whole creature. This is deliberately a
// SMALL floor, not a big one: it exists only to stop sub-glyph rounding
// noise and a literal single-pixel corner graze from counting as "on the
// copy" — one lowercase letter at body size is already ~250-450px², so this
// still ducks the moment a real character is under the wing. A first pass
// at a much bigger threshold (several thousand px², reasoned as "a fraction
// of a line") was tried and measured wrong: real overlaps stayed un-ducked
// at full opacity — a whole h2 with 12,861px² of glyph area, footer contact
// links, a run of list items — because the box sitting over a whole card
// grid spreads its overlap across many DIFFERENT elements (this check is
// deliberately per-element, see below), each individually under a big
// threshold even while the combined effect reads as "parked on the row of
// cards". A small floor is the only version of this that is actually safe.
//
// EXIT_OVERLAP_AREA is the low rail of the Schmitt trigger above: once ducked,
// the butterfly holds the duck until the biggest single reading unit under it
// is down to a graze. The two rails are what stop a box parked on the
// threshold from dithering across it.
const MIN_OVERLAP_AREA = 900
const EXIT_OVERLAP_AREA = 250

// Used by the duck's textOverlapArea() below. A big card is routinely
// wrapped in one <button> (image + headline + meta), and that button's own
// getBoundingClientRect() covers the image too — the butterfly clipping a
// screenshot thumbnail inside a card is not "sitting on copy". So the actual
// test isn't the element's box, it's the box of its rendered TEXT GLYPHS:
// every non-whitespace text node inside it, via Range.getClientRects().
// el.getBoundingClientRect() is used first purely as a cheap reject — most
// candidates fail it and never pay for a Range walk.
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

// How much rendered text `rect` (viewport px: {left,top,right,bottom}) is
// sitting on, in px² of glyph area — the raw CONTINUOUS signal the Schmitt
// trigger above thresholds twice. Returning the number instead of a bool is
// the whole point: a single threshold inside this function is exactly what
// made the duck flip on a boundary hover.
//
// `exclude` skips a component's own DOM (the FAB's own label text isn't "copy
// the butterfly is obscuring", and neither is the butterfly's own speech
// bubble). Area is accumulated PER ELEMENT (one paragraph, heading or link is
// one reading unit) and the MAX across elements is what is returned, so a wing
// brushing the corner of one short link and a wing sitting across three words
// of a paragraph are told apart rather than both counting as "touched some
// text". `cap` short-circuits the walk once the answer can no longer change
// the caller's decision — the early-out that keeps this affordable at 7.5 Hz.
function textOverlapArea(rect, exclude, cap) {
  if (!rect || rect.right <= rect.left || rect.bottom <= rect.top) return 0
  const vw = window.innerWidth, vh = window.innerHeight
  if (rect.right <= 0 || rect.left >= vw || rect.bottom <= 0 || rect.top >= vh) return 0
  const nodes = document.querySelectorAll(TEXT_SELECTOR)
  let best = 0
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i]
    if (exclude && el.closest(exclude)) continue
    const text = el.textContent
    if (!text || text.trim().length < 3) continue
    const outer = el.getBoundingClientRect()
    if (outer.width <= 0 || outer.height <= 0) continue
    if (outer.right <= rect.left || outer.left >= rect.right || outer.bottom <= rect.top || outer.top >= rect.bottom) continue
    let area = 0
    for (const r of textGlyphRects(el)) {
      if (r.width <= 0 || r.height <= 0) continue
      const left = Math.max(r.left, rect.left)
      const top = Math.max(r.top, rect.top)
      const right = Math.min(r.right, rect.right)
      const bottom = Math.min(r.bottom, rect.bottom)
      if (right <= left || bottom <= top) continue
      area += (right - left) * (bottom - top)
      if (area >= cap) return area
    }
    if (area > best) best = area
  }
  return best
}

// A device that has told us outright it cannot afford a decorative WebGL
// layer. Deliberately does NOT include "is a phone": see the call site.
function isTooSmallToFly() {
  try {
    if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2) return true
    if (navigator.connection && navigator.connection.saveData === true) return true
  } catch (e) { /* neither API exists here; that is not a reason to bail */ }
  return false
}

export function Flyer() {
  const canvasRef = useRef(null)
  const layerRef = useRef(null)
  const reduced = useReducedMotion()
  // Same probe PlanetField's caller uses (webglSupport.js), computed once in
  // the same render that first paints. A visitor with no WebGL at all used to
  // still get the full `.flyer-layer` div + canvas (hidden via
  // `canvas.style.display = 'none'` deep inside the boot() catch below) —
  // harmless (pointer-events:none, display:none), but pure dead weight: a
  // decorative layer that was never going to draw anything doesn't need to
  // mount at all. Folding `noGL` into the same early-return `reduced` already
  // uses is the whole fix.
  const [noGL] = useState(() => !hasWebGL())

  useEffect(() => {
    // Reduced-motion readers never download any of it, and neither does a
    // visitor whose browser cannot create a WebGL context in the first place.
    if (reduced || noGL) return
    // …and neither do the two kinds of device that genuinely cannot afford it.
    // This is a NARROW gate on purpose. The butterfly is not what makes this
    // page expensive (measured: 1.3 MB of framebuffer at the mobile clamp,
    // against ~115 MB of decoded bitmaps at the page's worst section), so
    // deleting it from every phone would cost the site its signature and buy
    // almost nothing. What it does buy is the last resort for a device that
    // has SAID it is in trouble: `saveData` is the reader asking not to be
    // sent 700 KB of decorative JS, and `deviceMemory <= 2` is a browser
    // reporting a 2 GB phone. Safari reports neither, so an iPhone still gets
    // the companion — correctly, because an iPhone is not the problem.
    if (isTooSmallToFly()) return
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
      // Companion.js already statically imports 'three', so this second,
      // dynamic import resolves from the same chunk it triggers anyway — it
      // costs nothing extra, it just gives this file its own handle on
      // Vector3 for the projection math below.
      const [{ Companion }, THREE] = await Promise.all([
        import('../three/Companion.js'),
        import('three'),
      ])
      if (cancelled || !canvasRef.current) return
      let field
      try {
        field = new Companion(canvasRef.current, { reduced: false })
      } catch (e) {
        // WebGL unavailable (or the context limit is already spent on the hero)
        canvasRef.current.style.display = 'none'
        return
      }

      // ── the duck ──
      // Companion exposes `pos` (world position), `camera` (fixed, never
      // moves) and `baseScale` (world units per wingspan) as plain instance
      // properties. Projecting the wingspan corners through the camera every
      // frame turns those into a real on-screen box — cheap (two Vector3
      // projections into SCRATCH vectors allocated once, so the loop stays
      // garbage-free), so it runs every frame. The expensive part, scanning
      // the DOM for text under that box, is throttled to ~7.5 Hz and gated by
      // the hysteresis above.
      let raf = 0
      let lastDuckCheck = 0
      let locked = false // overlay/menu open — layer is opacity:0 by CSS; skip the scan too

      // duck state machine (see the hysteresis block at the top of the file)
      let ducking = false
      let agree = 0
      let lastDuckChange = -Infinity

      // scratch — projecting into these instead of `new THREE.Vector3()` twice
      // a frame is the difference between 0 and ~120 short-lived objects a
      // second on a page that also runs a WebGL render loop.
      const pA = new THREE.Vector3()
      const pB = new THREE.Vector3()
      const boxOf = (pad) => {
        const wing = (field.baseScale * 2.02) / 2 // half wingspan, world units
        const m = wing * (1 + pad)
        const c = field.pos
        pA.set(c.x - m, c.y + m, c.z).project(field.camera)
        pB.set(c.x + m, c.y - m, c.z).project(field.camera)
        const vw = window.innerWidth, vh = window.innerHeight
        return {
          left: ((pA.x + 1) / 2) * vw,
          top: ((1 - pA.y) / 2) * vh,
          right: ((pB.x + 1) / 2) * vw,
          bottom: ((1 - pB.y) / 2) * vh,
        }
      }

      const setDuck = (next, now) => {
        ducking = next
        agree = 0
        lastDuckChange = now
        layerRef.current?.classList.toggle('is-ducking', next)
      }

      let lastFrame = 0
      const measure = (now) => {
        raf = requestAnimationFrame(measure)
        const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0
        lastFrame = now
        if (locked) {
          if (ducking) setDuck(false, now)
          return
        }
        if (!field.flyer) return // model still loading; nothing on screen yet

        const rect = boxOf(DUCK_ENTER_PAD)
        // The layer's settled opacity, derived from state rather than read
        // back with getComputedStyle() — that read forced a style recalc on
        // EVERY frame just to publish a number this file already knows.
        const opacity = ducking ? 0.45 : 1
        // Exposed for the QA probe: the canvas itself is position:fixed;
        // inset:0, so ITS bounding rect is the whole viewport and useless for
        // measuring real overlap. This is the box that actually has wings in it.
        window.__loomFlyerBBox = { ...rect, opacity }

        // The 7.5Hz block.
        if (now - lastDuckCheck >= DUCK_CHECK_MS) {
          lastDuckCheck = now

          // Asymmetric box: a tight one to START ducking, a generous one to stop.
          // Asymmetric rail too: ENTER at MIN_OVERLAP_AREA, only LEAVE below
          // EXIT_OVERLAP_AREA. `hit` is "the state the raw signal is asking for".
          const probe = ducking ? boxOf(DUCK_EXIT_PAD) : rect
          const rail = ducking ? EXIT_OVERLAP_AREA : MIN_OVERLAP_AREA
          const area = textOverlapArea(probe, SELF_SELECTOR, rail)
          const hit = area >= rail
          if (hit === ducking) agree = 0
          else if (++agree >= (ducking ? DUCK_EXIT_CHECKS : DUCK_ENTER_CHECKS)
                   && now - lastDuckChange >= DUCK_MIN_HOLD_MS) {
            setDuck(!ducking, now)
          }
        }
      }
      raf = requestAnimationFrame(measure)

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

      const onResize = () => { onScroll() }

      // Hidden tab: stop the WebGL loop AND this measurement loop. rAF is
      // already throttled hard in a backgrounded tab, but "throttled" is not
      // "off" — an occluded-but-not-hidden window still gets frames on some
      // platforms, and every one of those frames was paying for a projection
      // and, 7.5 times a second, a full DOM text scan of a 22,000px document
      // that nobody is looking at.
      const onVis = () => {
        if (document.hidden) {
          field.stop()
          cancelAnimationFrame(raf); raf = 0
        } else {
          if (!locked) field.start()
          // A dead context means there is nothing on screen to measure — see
          // onGlLost below. Coming back to the tab must not restart the scan.
          if (!raf && !field.contextLost) { lastFrame = 0; raf = requestAnimationFrame(measure) }
        }
      }

      // ── surviving a context eviction, this file's half ──
      // Under memory pressure iOS Safari drops the oldest live WebGL context
      // and carries on silently. Companion.js already stops its render loop
      // when that happens (see its own handlers), but THIS file's loop is a
      // separate one and knows nothing about it: it would keep projecting a
      // butterfly that is no longer drawn and keep running the duck's
      // viewport-wide text scan over a 39,000px document 7.5 times a second,
      // for the rest of the visit, for nothing. Stop, and pick it back up if
      // the browser hands the context back.
      const onGlLost = () => {
        if (ducking) setDuck(false, performance.now())
        cancelAnimationFrame(raf); raf = 0
        delete window.__loomFlyerBBox
      }
      const onGlRestored = () => {
        if (!raf && !document.hidden) { lastFrame = 0; raf = requestAnimationFrame(measure) }
      }
      canvasRef.current.addEventListener('webglcontextlost', onGlLost, false)
      canvasRef.current.addEventListener('webglcontextrestored', onGlRestored, false)

      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onResize, { passive: true })
      document.addEventListener('visibilitychange', onVis)

      // A case study or the wizard opening locks page scroll but leaves the
      // butterfly's own rAF loop running underneath it — a second animation
      // loop fighting the overlay's own scroll/drag every frame, which is
      // exactly the "opens fine, then scrolling goes stiff" symptom. Same
      // overlay-open/menu-open signal Lenis and MobileChrome already watch.
      const lockObs = new MutationObserver(() => {
        locked = document.documentElement.classList.contains('overlay-open')
          || document.documentElement.classList.contains('menu-open')
        locked ? field.stop() : (document.hidden || field.start())
      })
      lockObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

      // Dev-only handle so a QA probe can read attitude/velocity straight off
      // the instance instead of inferring it from pixels. Never in a build.
      if (import.meta.env.DEV) window.__loomFlyer = field

      const canvasEl = canvasRef.current
      teardown = () => {
        lockObs.disconnect()
        cancelAnimationFrame(raf)
        canvasEl?.removeEventListener('webglcontextlost', onGlLost, false)
        canvasEl?.removeEventListener('webglcontextrestored', onGlRestored, false)
        delete window.__loomFlyerBBox
        delete window.__loomFlyer
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        document.removeEventListener('visibilitychange', onVis)
        field.dispose()
      }
    }

    // PERF (10 Aug 2026 audit): the scroll listener used to call boot()
    // straight from the scroll event's own task. boot()'s dynamic imports
    // are async (network time, fine either way), but once they resolved the
    // continuation — `new Companion()`, which synchronously builds 20 meshes
    // and paints a canvas texture — ran in THAT SAME task, landing its
    // multi-second block exactly when the visitor had just started
    // scrolling: the single worst moment for a long task to land. Booting
    // off the idle-callback backstop was already fine (nothing else is
    // contending for the main thread then); only the scroll-triggered path
    // needed to stop firing on the leading edge. `bootIdle` re-defers
    // through requestIdleCallback so the heavy work always starts in a
    // browser-reported idle window, never inside the input handler itself.
    let bootIdleHandle = 0
    const bootIdle = () => {
      if (window.requestIdleCallback) {
        bootIdleHandle = requestIdleCallback(boot, { timeout: 600 })
      } else {
        bootIdleHandle = setTimeout(boot, 0)
      }
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
    <div className="flyer-layer" ref={layerRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
