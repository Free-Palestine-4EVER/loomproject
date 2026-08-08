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
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import './flyer.css'
import './flyer-say.css'

// Kept identical to the selector list the QA probe uses, so "what we duck for"
// and "what we measure against" can never quietly drift apart.
const TEXT_SELECTOR = 'p, h1, h2, h3, h4, li, button, a'
const DUCK_CHECK_MS = 130

// Two exclusion lists, and the difference between them is not an oversight.
//
// The DUCK ignores the flyer's own two layers (the creature must not duck from
// its own speech bubble) and the WhatsApp FAB, whose label is chrome rather
// than copy the butterfly could be said to be obscuring.
//
// The BUBBLE must only ignore the flyer's own layers. The FAB is a real
// obstacle to it, and in the opposite direction: the FAB sits at a HIGHER
// z-index, so a bubble placed under it does not cover the FAB, the FAB covers
// the bubble. Sharing one list put the offer bubble behind the FAB at 390px
// with the second line of Arabic underneath the green button.
const SELF_SELECTOR = '.flyer-layer, .flyer-say-layer, .wa-fab-stack'
const SAY_SELF_SELECTOR = '.flyer-layer, .flyer-say-layer'

// What the BUBBLE must stay off. A superset of TEXT_SELECTOR, and the extra
// terms are the reason: a wish tag in `#offer` is an `<article>` — a paper card
// with generous padding — and the bubble was measured clipping 7,744px² of one
// while touching only 1,415px² of its actual words. Covering the blank corner
// of a card is still covering the card. `article`, `figure` and `blockquote`
// are the standard "this is one piece of content" boxes. `section` is
// deliberately absent — every one of them is full-bleed, so including them
// would mark the whole viewport occupied and the scoring would carry no
// information at all.
//
// Pictures count too, and `#offer` is the reason: the bloom tree between the
// two wish tags is the centrepiece of that section, and the first version of
// this — text boxes only — parked the bubble squarely on it. But `#offer` also
// has a 100vw <img> for its sky, and `<canvas>` covers both this file's own
// full-viewport layer and the hero's. So imagery is included and then filtered
// by SIZE (see visibleContentRects): a picture bigger than BACKDROP_FRACTION of
// the viewport is a backdrop, not a thing on the page, and cannot be avoided
// because there is nowhere else to be.
// `.wa-fab-stack` is named outright because it is a plain <div> wrapper: its
// anchor and label would be caught anyway, but the stack's own box is what
// actually has to be cleared, tail and all.
const CONTENT_SELECTOR = TEXT_SELECTOR + ', article, figure, blockquote, img, svg, video, canvas, .wa-fab-stack'
const MEDIA_TAGS = /^(IMG|SVG|VIDEO|CANVAS)$/
const BACKDROP_FRACTION = 0.42
const SAY_CLEAR_X = 10  // keep-out grown around every content box…
const SAY_CLEAR_Y = 56  // …taller than it is wide, because scrolling is vertical

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
const SAY_EDGE = 12           // px kept clear at the other three viewport edges

// ── keeping the bubble off the page's own content ───────────────────────────
// MEASURED BUG. The bubble was pinned to ONE placement — centred above the
// butterfly, flipped below only when the nav was in the way — and then clamped
// into the viewport. That is a rule about the CREATURE with no term at all for
// the PAGE, so wherever the flight path happened to pass over a card, the
// bubble landed on it. A 26-step scroll sweep of `#offer` caught it sitting on
// the left wish tag ("I have a business already.") for five consecutive
// samples, peaking at 23,649px² of the card covered at 390px, and on a
// solutions card button for 12,033px² at 1440px.
//
// The fix keeps the same anchor but makes the placement a CHOICE: eight
// candidate slots around the projected wingtip box (the four sides, then the
// four diagonals as the escape hatch when every axis is busy), each clamped
// into the safe area, each scored by how much rendered content it would cover.
// Lowest score wins, with the order below breaking ties — so "above the
// butterfly" is still what you get whenever it is free, and the bubble only
// leaves that spot to get off the copy.
//
// Two things keep it from twitching between slots. The scan runs at ~2.5Hz, not
// per frame (it is a viewport-wide DOM walk; the duck's own scan only ever looks
// at the small box under the wings). And a switch has to be worth SAY_SWITCH_WIN
// px² of recovered content — a slot that is merely a rounding error better than
// the one already chosen does not win, so a bubble drifting along a card edge
// settles instead of oscillating. The move itself is then eased, as before.
// 130ms, the same cadence as the duck scan. The pass costs a measured 0.91ms
// (310 candidate nodes in the document, 14–16 of them on screen) and only runs
// while a bubble is actually up — at most ~6.8s per zone — so the tighter loop
// is affordable, and it halves how far the page can scroll under an already
// placed bubble before the placement is reconsidered.
const SAY_PLACE_MS = 130
const SAY_SWITCH_WIN = 1800
const SAY_PARK_COST = 3000
const SAY_TRAVEL_COST = 2  // px² of penalty per px the bubble would have to move
const SAY_SNAP_PX = 150    // longer than this and the move is cut, not glided

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

// Every piece of the page's own content currently on screen, as plain rects —
// the sheet the bubble's eight candidate slots are scored against.
//
// This deliberately uses each element's BOUNDING BOX, not the glyph rects the
// duck uses, and the two want opposite things. The duck asks "am I sitting on
// letters?", where a <button> wrapping a card image would over-report wildly,
// so it walks Ranges. The bubble asks "am I sitting on something the reader is
// looking at?", where covering the image half of a card is just as bad as
// covering its headline — the reported bug was the bubble on top of a wish
// tag, most of which is not glyphs. The box is also ~30× cheaper: one
// querySelectorAll and one layout flush, no Range walk per node, which is what
// makes a viewport-wide scan affordable at all.
function visibleContentRects() {
  const vw = window.innerWidth, vh = window.innerHeight
  const nodes = document.querySelectorAll(CONTENT_SELECTOR)
  const out = []
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i]
    if (el.closest(SAY_SELF_SELECTOR)) continue
    // .toUpperCase() is not decoration: an inline <svg> in an HTML document
    // reports tagName as lowercase 'svg', so the bare test silently missed
    // every one of them.
    const media = MEDIA_TAGS.test(el.tagName.toUpperCase())
    // Text boxes have to actually hold words; pictures hold none, so the
    // length test would throw every one of them away.
    if (!media) {
      const t = el.textContent
      if (!t || t.trim().length < 3) continue
    }
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) continue
    if (media && r.width * r.height > vw * vh * BACKDROP_FRACTION) continue
    // Grown by a clearance margin, and mostly a VERTICAL one, because the
    // thing that moves content under an already-placed bubble is the scroll.
    // Scoring the exact rects left the bubble permanently 130ms behind the
    // page: entering `#offer` on a phone it was measured clipping the left
    // wish tag by up to 6,636px² for three consecutive samples while it walked
    // upward, always landing on a slot that was clear when chosen and covered
    // by the time it got there. A margin roughly the size of one scroll step
    // makes a slot have to be clear with room, so the collision is avoided
    // before it happens rather than corrected after.
    out.push({
      left: r.left - SAY_CLEAR_X, right: r.right + SAY_CLEAR_X,
      top: r.top - SAY_CLEAR_Y, bottom: r.bottom + SAY_CLEAR_Y,
    })
  }
  return out
}

// px² of `rects` covered by the box (x, y, w, h). Summed, not maxed: a slot
// that clips three different cards a little is worse than one that clips a
// single card the same amount, which is the opposite of the duck's per-element
// MAX (there, "one paragraph is one reading unit" is the whole point).
function coverArea(x, y, w, h, rects) {
  let sum = 0
  const r1 = x + w, b1 = y + h
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    const l = Math.max(x, r.left), t = Math.max(y, r.top)
    const rt = Math.min(r1, r.right), bt = Math.min(b1, r.bottom)
    if (rt > l && bt > t) sum += (rt - l) * (bt - t)
  }
  return sum
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
      // for something that is pure transform. The bubble lives in its OWN
      // fixed layer, portalled to <body> — same z-index 70 (under the nav),
      // same pointer-events:none, but deliberately NOT under
      // `.flyer-layer.is-ducking`'s group opacity, which was fading the words
      // along with the creature. textOverlapArea() excludes both layers via
      // SELF_SELECTOR, so the bubble's own words still never make the
      // butterfly duck from itself.
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

      // Where the bubble WANTS to be: the eight candidate slots around the
      // projected wingtip box, in preference order. Each is clamped into the
      // safe area — SAY_NAV_SAFE at the top (the nav lives there) and SAY_EDGE
      // on the other three sides — so every candidate is a legal position and
      // scoring is comparing like with like.
      let tx = 0, ty = 0            // the chosen target, in viewport px
      let lastPlaceAt = -Infinity
      let placeScore = Infinity
      const cands = []              // reused array, no per-scan garbage
      const chooseSlot = (rect) => {
        const vw = window.innerWidth, vh = window.innerHeight
        const cx = (rect.left + rect.right) / 2
        const cy = (rect.top + rect.bottom) / 2
        const above = rect.top - SAY_GAP - bh
        const below = rect.bottom + SAY_GAP
        const left = rect.left - SAY_GAP - bw
        const right = rect.right + SAY_GAP
        // (x, y, penalty). The eight slots hugging the creature carry no
        // penalty and are tried in this order, so ties resolve upward.
        cands.length = 0
        cands.push(cx - bw / 2, above, 0)   // over the creature — the default look
        cands.push(cx - bw / 2, below, 0)
        cands.push(left, cy - bh / 2, 0)
        cands.push(right, cy - bh / 2, 0)
        cands.push(left, above, 0)
        cands.push(right, above, 0)
        cands.push(left, below, 0)
        cands.push(right, below, 0)
        // …and four PARKING slots, in the corners of the safe area, for the
        // case the eight all fail: a phone in the hero has a headline, a lede
        // and two buttons in one viewport, and every slot around the butterfly
        // was measured covering at least 7,664px² of it. The penalty is what
        // keeps these last-resort — a corner only wins when staying near the
        // creature would cost more than SAY_PARK_COST px² of the reader's
        // page, so the bubble does not wander off to a corner merely because
        // the corner is empty.
        cands.push(SAY_EDGE, SAY_NAV_SAFE, SAY_PARK_COST)
        cands.push(vw - bw - SAY_EDGE, SAY_NAV_SAFE, SAY_PARK_COST)
        cands.push(SAY_EDGE, vh - bh - SAY_EDGE, SAY_PARK_COST)
        cands.push(vw - bw - SAY_EDGE, vh - bh - SAY_EDGE, SAY_PARK_COST)

        const rects = visibleContentRects()
        let bestX = 0, bestY = 0, best = Infinity
        for (let i = 0; i < cands.length; i += 3) {
          const x = Math.max(SAY_EDGE, Math.min(cands[i], vw - bw - SAY_EDGE))
          const y = Math.max(SAY_NAV_SAFE, Math.min(cands[i + 1], vh - bh - SAY_EDGE))
          // …plus a small toll on DISTANCE from where the bubble already is.
          // Two slots that are both clear are not equally good: the far one has
          // to be travelled to, and the trip is what drags the bubble across
          // the copy in between. A few px² per px is enough to prefer the near
          // one without ever overriding a real content collision.
          const s = coverArea(x, y, bw, bh, rects) + cands[i + 2]
            + (bPlaced ? Math.hypot(x - bx, y - by) * SAY_TRAVEL_COST : 0)
          if (s < best) { best = s; bestX = x; bestY = y }
        }
        // STICKINESS. This used to try to find the incumbent among the twelve
        // candidates by coordinate — which never matched, because every one of
        // those coordinates is derived from the butterfly's box and the
        // butterfly never stops moving. `cur` was therefore Infinity on every
        // pass, SAY_SWITCH_WIN never once engaged, and the bubble re-targeted
        // 2.5 times a second: it chased the creature, and a 26-step sweep
        // caught it mid-flight across the left wish tag (27,199px² at 1440px,
        // 15,679px² at 390px) — the reported bug surviving in a new form.
        //
        // The incumbent is not a candidate. It is (tx, ty), and it is scored
        // as itself. The bubble then holds that spot until some other slot is
        // SAY_SWITCH_WIN px² better, so it moves when content slides under it
        // and not merely because the butterfly wandered.
        const cur = bPlaced ? coverArea(tx, ty, bw, bh, rects) : Infinity
        if (cur - best < SAY_SWITCH_WIN) { placeScore = cur; return }
        tx = bestX; ty = bestY; placeScore = best
      }

      // Placement: re-chosen at SAY_PLACE_MS, eased toward every frame. The
      // tail slides along the bubble so it keeps pointing at the creature even
      // when the bubble has been clamped against a viewport edge — and is
      // dropped outright (`.is-tailless`) when the chosen slot is beside the
      // butterfly rather than over or under it, where no edge-mounted tail can
      // point at anything true.
      const placeSay = (rect, now, dt) => {
        const el = bubbleRef.current
        if (!el || !sayId || !bw) return
        if (!bPlaced || now - lastPlaceAt >= SAY_PLACE_MS) {
          lastPlaceAt = now
          chooseSlot(rect)
        }
        // A SHORT move is eased; a LONG one is cut. Easing is right for the
        // small corrections that keep the bubble reading as attached to the
        // creature, and wrong for a re-slot, because the whole reason to
        // re-slot is that the old spot was on the copy — and a 400px glide to
        // the new one drags an opaque card straight across everything between.
        // A tooltip that repositions instantly is ordinary; a tooltip that
        // sails over the page is not.
        const far = bPlaced && Math.hypot(tx - bx, ty - by) > SAY_SNAP_PX
        if (!bPlaced || far) { bx = tx; by = ty; bPlaced = true }
        else {
          // Frame-rate-independent ease, same rule as Companion.js: a
          // per-SECOND rate, never a per-frame fraction. Without it the bubble
          // twitches on the wingbeat, which is exactly the kind of motion this
          // task exists to remove.
          const k = dt > 0 ? 1 - Math.exp(-9 * dt) : 1
          bx += (tx - bx) * k
          by += (ty - by) * k
        }
        const cx = (rect.left + rect.right) / 2
        const over = by + bh <= rect.top + 2   // bubble sits above the creature
        const under = by >= rect.bottom - 2    // …or below it
        const inSpan = cx > bx + 14 && cx < bx + bw - 14
        el.style.transform = `translate3d(${Math.round(bx)}px, ${Math.round(by)}px, 0)`
        el.style.setProperty('--tail', `${Math.round(Math.max(20, Math.min(cx - bx, bw - 20)))}px`)
        el.classList.toggle('is-below', under && inSpan)
        el.classList.toggle('is-tailless', !inSpan || (!over && !under))
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

        // The 7.5Hz block. This used to `return` early and let placeSay() run
        // above it, which put the frame that SHOWS a bubble in the wrong order:
        // showSay() sets .is-on (a 0.42s fade-in) at the END of this block, so
        // the first frame the bubble was visible still carried the transform
        // from the LAST time it spoke — a stale position, measured once at
        // 29,313px² on top of a wish tag, corrected on the following frame.
        // Placing AFTER the show/hide decision makes the first visible frame
        // the correctly-placed one.
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

          // Zone check rides the same throttle — one getBoundingClientRect on
          // #offer at 7.5 Hz, not per frame.
          const want = SAYINGS.find((s) => { try { return s.test() } catch (e) { return false } })
          if (sayId && (!want || want.id !== sayId || now - sayShownAt > SAY_HOLD_MS)) hideSay(now)
          if (!sayId && want && now - (sayLastEnd.get(want.id) ?? -Infinity) > SAY_COOLDOWN_MS) showSay(want, now)
        }

        placeSay(rect, now, dt)
        // The bubble's own settled box, for the QA probe: it is transform-
        // positioned inside a fixed layer, so this is the number a placement
        // test wants — alongside the px² of page content the chosen slot is
        // covering, which is the thing that is supposed to stay at zero.
        window.__loomFlyerSayBox = sayId
          ? { id: sayId, left: bx, top: by, width: bw, height: bh, cover: placeScore }
          : null
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
        delete window.__loomFlyerSayBox
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
    <>
      <div className="flyer-layer" ref={layerRef} aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
      {/* The bubble is PORTALLED to <body>, into its own fixed layer at the
          same z-index (70). `.flyer-layer.is-ducking` sets opacity on the
          LAYER, and group opacity reaches every descendant — so while the
          bubble lived inside it, the duck dragged the bubble's contrast down
          with the butterfly's (measured 3.33:1 EN / 2.09:1 AR at 390px, both
          failing). Fading a decorative creature off the copy is the point;
          fading the words it is saying is not. Portalling is what separates
          the two without a second opacity path to keep in sync — the bubble
          keeps every other property of living there, because .flyer-say-layer
          restates them (see flyer-say.css).

          aria-hidden covers the bubble, and that is the deliberate choice: it
          is decoration that restates what the page already says in its own
          headings ("scroll down", "choose one"). An aria-live region firing
          off scroll position would interrupt a screen-reader user mid-sentence
          with information they already have, twice, in two languages — that is
          noise, not access. The guidance itself is not exclusive to the bubble.

          The Arabic is a plain `dir="rtl" lang="ar"` span holding ordinary
          logical-order Arabic; the browser's own bidi and shaper do the
          joining. Nothing here reverses, mirrors or pre-shapes the string. */}
      {createPortal(
        <div className="flyer-say-layer" aria-hidden="true">
          <div className="flyer-say" ref={bubbleRef}>
            <span className="flyer-say-en" lang="en" dir="ltr" />
            <span className="flyer-say-ar" lang="ar" dir="rtl" />
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
