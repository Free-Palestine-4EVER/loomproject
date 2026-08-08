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
// This file also owns the SPEECH BUBBLES (see `flyer-say.css` and the SAYINGS
// table below) — a bilingual EN/AR aside anchored to the same projected box.
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import './flyer.css'
import './flyer-say.css'

// Kept identical to the selector list the QA probe uses, so "what we duck for"
// and "what we measure against" can never quietly drift apart.
const TEXT_SELECTOR = 'p, h1, h2, h3, h4, li, button, a'
const DUCK_CHECK_MS = 130

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

// ── what the butterfly says ────────────────────────────────────────────────
// Both languages are shown STACKED and simultaneously, not alternated on a
// timer: a reader who wants the Arabic should not have to wait for it, and a
// bubble that swaps language mid-read is its own flicker bug. The Arabic is
// native Arabic in a real `dir="rtl" lang="ar"` element — the browser's own
// bidi + shaping does the joining; nothing here reverses or mirrors anything.
const SAYINGS = [
  {
    id: 'intro',
    en: 'Scroll down to start exploring',
    ar: 'مرّر للأسفل لتبدأ الاستكشاف',
    // The very top of the page, before the reader has committed to anything.
    test: () => window.scrollY < window.innerHeight * 0.5,
  },
  {
    id: 'offer',
    en: 'This section helps you get started — choose one',
    ar: 'هذا القسم يساعدك على البدء — اختر واحدًا',
    // The tree + the two choices. Fires when #offer owns the middle band of
    // the viewport, not merely when a pixel of it is on screen.
    test: () => {
      const el = document.getElementById('offer')
      if (!el) return false
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      return r.top < vh * 0.72 && r.bottom > vh * 0.28
    },
  },
]
const SAY_HOLD_MS = 6800      // it says its piece, then gets out of the way
const SAY_COOLDOWN_MS = 20000 // …and does not nag on every re-entry
const SAY_NAV_SAFE = 96       // px kept clear at the top: the nav lives there
const SAY_GAP = 16            // px between the wingtip box and the bubble

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

export function Flyer() {
  const canvasRef = useRef(null)
  const layerRef = useRef(null)
  const bubbleRef = useRef(null)
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

      // ── the speech bubbles ──
      // Driven imperatively from this same loop: a React state update per
      // frame to move a decorative div would re-render the tree 60×/second
      // for something that is pure transform. The bubble lives INSIDE
      // .flyer-layer, which buys three things for free — it is under the nav
      // (z-index 70 vs 80), it is pointer-events:none, and the group opacity
      // of `.is-ducking` applies to it, so the bubble ducks with the
      // butterfly without a second code path. overlapsText() already excludes
      // `.flyer-layer`, so the bubble's own words never make the butterfly
      // duck from itself.
      let sayId = null          // what is on screen right now
      let sayShownAt = 0
      const sayLastEnd = new Map()  // id -> when it last went away (cooldown)
      let bw = 0, bh = 0        // cached bubble size; re-measured only on change
      let bx = 0, by = 0, bPlaced = false

      const measureBubble = () => {
        const el = bubbleRef.current
        if (!el) return
        bw = el.offsetWidth
        bh = el.offsetHeight
      }

      const showSay = (s, now) => {
        const el = bubbleRef.current
        if (!el) return
        el.querySelector('.flyer-say-en').textContent = s.en
        el.querySelector('.flyer-say-ar').textContent = s.ar
        sayId = s.id
        sayShownAt = now
        bPlaced = false
        measureBubble()
        el.classList.add('is-on')
        window.__loomFlyerSay = s.id
      }
      const hideSay = (now) => {
        if (!sayId) return
        sayLastEnd.set(sayId, now)
        sayId = null
        bubbleRef.current?.classList.remove('is-on')
        window.__loomFlyerSay = null
      }

      // Placement: above the wingtip box, tail pointing down at it; flipped
      // below when there is no room left under the nav. Clamped into the
      // viewport, and the tail slides along the bubble so it keeps pointing at
      // the actual creature even when the bubble itself has been clamped.
      const placeSay = (rect, dt) => {
        const el = bubbleRef.current
        if (!el || !sayId || !bw) return
        const vw = window.innerWidth, vh = window.innerHeight
        const cx = (rect.left + rect.right) / 2
        let tx = cx - bw / 2
        let ty = rect.top - SAY_GAP - bh
        let below = false
        if (ty < SAY_NAV_SAFE) { ty = rect.bottom + SAY_GAP; below = true }
        tx = Math.max(12, Math.min(tx, vw - bw - 12))
        ty = Math.max(SAY_NAV_SAFE, Math.min(ty, vh - bh - 12))
        if (!bPlaced) { bx = tx; by = ty; bPlaced = true }
        else {
          // Frame-rate-independent ease, same rule as Companion.js: a
          // per-SECOND rate, never a per-frame fraction. Without it the bubble
          // twitches on the wingbeat, which is exactly the kind of motion this
          // task exists to remove.
          const k = dt > 0 ? 1 - Math.exp(-9 * dt) : 1
          bx += (tx - bx) * k
          by += (ty - by) * k
        }
        el.style.transform = `translate3d(${Math.round(bx)}px, ${Math.round(by)}px, 0)`
        el.style.setProperty('--tail', `${Math.round(Math.max(20, Math.min(cx - bx, bw - 20)))}px`)
        el.classList.toggle('is-below', below)
      }

      let lastFrame = 0
      const measure = (now) => {
        raf = requestAnimationFrame(measure)
        const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0
        lastFrame = now
        if (locked) {
          if (ducking) setDuck(false, now)
          hideSay(now)
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

        placeSay(rect, dt)

        if (now - lastDuckCheck < DUCK_CHECK_MS) return
        lastDuckCheck = now

        // Asymmetric box: a tight one to START ducking, a generous one to stop.
        // Asymmetric rail too: ENTER at MIN_OVERLAP_AREA, only LEAVE below
        // EXIT_OVERLAP_AREA. `hit` is "the state the raw signal is asking for".
        const probe = ducking ? boxOf(DUCK_EXIT_PAD) : rect
        const rail = ducking ? EXIT_OVERLAP_AREA : MIN_OVERLAP_AREA
        const area = textOverlapArea(probe, '.flyer-layer, .wa-fab-stack', rail)
        const hit = area >= rail
        if (hit === ducking) agree = 0
        else if (++agree >= (ducking ? DUCK_EXIT_CHECKS : DUCK_ENTER_CHECKS)
                 && now - lastDuckChange >= DUCK_MIN_HOLD_MS) {
          setDuck(!ducking, now)
        }

        // Zone check rides the same throttle — one getBoundingClientRect on
        // #offer at 7.5 Hz, not per frame.
        const want = SAYINGS.find((s) => { try { return s.test() } catch (e) { return false } })
        if (sayId && (!want || want.id !== sayId || now - sayShownAt > SAY_HOLD_MS)) hideSay(now)
        if (!sayId && want && now - (sayLastEnd.get(want.id) ?? -Infinity) > SAY_COOLDOWN_MS) showSay(want, now)
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

      const onResize = () => { measureBubble(); bPlaced = false; onScroll() }

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
          if (!raf) { lastFrame = 0; raf = requestAnimationFrame(measure) }
        }
      }
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

      teardown = () => {
        lockObs.disconnect()
        cancelAnimationFrame(raf)
        delete window.__loomFlyerBBox
        delete window.__loomFlyerSay
        delete window.__loomFlyer
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
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
    // aria-hidden covers the bubbles too, and that is the deliberate choice:
    // they are decoration that restates what the page already says in its own
    // headings ("scroll down", "choose one"). An aria-live region firing off
    // scroll position would interrupt a screen-reader user mid-sentence with
    // information they already have, twice, in two languages — that is noise,
    // not access. The guidance itself is not exclusive to the bubble.
    <div className="flyer-layer" ref={layerRef} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="flyer-say" ref={bubbleRef}>
        <span className="flyer-say-en" lang="en" dir="ltr" />
        <span className="flyer-say-ar" lang="ar" dir="rtl" />
      </div>
    </div>
  )
}
