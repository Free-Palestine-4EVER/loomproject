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
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import './flyer.css'

// Kept identical to the selector list the QA probe uses, so "what we duck for"
// and "what we measure against" can never quietly drift apart.
const TEXT_SELECTOR = 'p, h1, h2, h3, h4, li, button, a'
const DUCK_CHECK_MS = 130

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
const MIN_OVERLAP_AREA = 900

// A big card is routinely wrapped in one <button> (image + headline + meta),
// and that button's own getBoundingClientRect() covers the image too — the
// butterfly clipping a screenshot thumbnail inside a card is not "sitting on
// copy". So the actual test isn't the element's box, it's the box of its
// rendered TEXT GLYPHS: every non-whitespace text node inside it, via
// Range.getClientRects(). el.getBoundingClientRect() is used first purely as
// a cheap reject — most candidates fail it and never pay for a Range walk.
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

// True if `rect` (viewport px: {left,top,right,bottom}) visually overlaps a
// MEANINGFUL patch of rendered text — not just a pixel of it. `exclude` skips
// a component's own DOM (the FAB's own label text isn't "copy the butterfly
// is obscuring"). Overlap area is accumulated PER ELEMENT (one paragraph,
// heading or link is one reading unit) so a wing brushing the corner of one
// short link and a wing sitting across three words of a paragraph are told
// apart, rather than both counting as "touched some text".
function overlapsText(rect, exclude) {
  if (!rect || rect.right <= rect.left || rect.bottom <= rect.top) return false
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
    let area = 0
    for (const r of textGlyphRects(el)) {
      if (r.width <= 0 || r.height <= 0) continue
      const left = Math.max(r.left, rect.left)
      const top = Math.max(r.top, rect.top)
      const right = Math.min(r.right, rect.right)
      const bottom = Math.min(r.bottom, rect.bottom)
      if (right <= left || bottom <= top) continue
      area += (right - left) * (bottom - top)
      if (area >= MIN_OVERLAP_AREA) return true
    }
  }
  return false
}

export function Flyer() {
  const canvasRef = useRef(null)
  const layerRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    // Reduced-motion readers never download any of it.
    if (reduced) return
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
      // projections), so it runs every frame. The expensive part, scanning
      // the DOM for text under that box, is throttled to ~7.5 Hz; the
      // existing 0.45s opacity transition on .flyer-layer already smooths
      // over a check that coarse.
      let raf = 0
      let lastDuckCheck = 0
      let locked = false // overlay/menu open — layer is opacity:0 by CSS; skip the scan too
      const measure = (now) => {
        raf = requestAnimationFrame(measure)
        if (locked) { layerRef.current?.classList.remove('is-ducking'); return }
        if (!field.flyer) return // model still loading; nothing on screen yet
        const wing = (field.baseScale * 2.02) / 2 // half wingspan, world units
        const pad = wing * 0.24 // margin for flap/bounce between checks
        const c = field.pos
        const tl = new THREE.Vector3(c.x - wing - pad, c.y + wing + pad, c.z).project(field.camera)
        const br = new THREE.Vector3(c.x + wing + pad, c.y - wing - pad, c.z).project(field.camera)
        const vw = window.innerWidth, vh = window.innerHeight
        const rect = {
          left: ((tl.x + 1) / 2) * vw,
          top: ((1 - tl.y) / 2) * vh,
          right: ((br.x + 1) / 2) * vw,
          bottom: ((1 - br.y) / 2) * vh,
        }
        const opacity = layerRef.current ? parseFloat(getComputedStyle(layerRef.current).opacity) : 1
        // Exposed for the QA probe: the canvas itself is position:fixed;
        // inset:0, so ITS bounding rect is the whole viewport and useless for
        // measuring real overlap. This is the box that actually has wings in it.
        window.__loomFlyerBBox = { ...rect, opacity }

        if (now - lastDuckCheck < DUCK_CHECK_MS) return
        lastDuckCheck = now
        const duck = overlapsText(rect, '.flyer-layer, .wa-fab-stack')
        if (layerRef.current) layerRef.current.classList.toggle('is-ducking', duck)
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
        locked = document.documentElement.classList.contains('overlay-open')
          || document.documentElement.classList.contains('menu-open')
        locked ? field.stop() : (document.hidden || field.start())
      })
      lockObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

      teardown = () => {
        lockObs.disconnect()
        cancelAnimationFrame(raf)
        delete window.__loomFlyerBBox
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
        document.removeEventListener('visibilitychange', onVis)
        field.dispose()
      }
    }

    const start = () => {
      window.removeEventListener('scroll', start)
      if (idle) cancelIdleCallback?.(idle)
      clearTimeout(timer)
      boot()
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
      if (teardown) teardown()
    }
  }, [reduced])

  if (reduced) return null
  return (
    <div className="flyer-layer" ref={layerRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
