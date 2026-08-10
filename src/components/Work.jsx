// ————————————————————————————————————————————————————————
// Selected Work — the living Mosaic, the discipline filters, and the
// full-screen case overlay.
//
// The board used to be a plain 3-up grid of 4:3 cards. It is now the Mosaic
// prototyped and measured in work-lab.html #c2: ONE picture wall in four size
// classes where the size IS the ranking, and the ranking is re-argued on a
// beat. Everything below is that prototype driven from `CASES` instead of the
// lab's hardcoded copy, plus the three things the lab page never modelled —
// the case overlay, the discipline filters, and the device preview.
//
// THE FOUR MOTIONS, and why they do not fight each other
// ------------------------------------------------------
// 1. THE RE-TILING. Grid spans are not animatable, so a block of the wall
//    swaps its size map and every moved card is FLIPped from its old box to
//    its new one on transform alone. 2.6s beat, 3.4s move — the move is
//    longer than the gap, so a move is always in flight.
// 2. THE BREATH. Every photograph runs a permanent 27–48s Ken-Burns drift on
//    its own period, bearing and phase, so the wall is alive even between
//    beats and on a phone, where the re-tiling is deliberately off.
// 3. THE POINTER DRIFT. Every visible crop leans toward the cursor by an
//    amount that falls off with distance, so sixteen framed pictures read as
//    one surface you are moving over.
// 4. THE DEVICE PREVIEW. See `wm-dev` below.
//
// Each of those owns exactly ONE node of the photo stack
// (.wm-ph > .wm-par > img — FLIP, drift, breath in that order) and nothing
// else ever writes that node. That separation is the entire reason the
// effects compose instead of overwriting each other, and it is load-bearing:
// only .wm-ph is ever scaled non-uniformly, and only as the exact inverse of
// its own tile's box scale, so the composite crop can be cropped tighter or
// looser but can never stretch. Do not collapse the stack.
//
// WHY THE TILES ARE DRIVEN IMPERATIVELY. A FLIP is measure → mutate →
// measure in one synchronous pass; React state cannot do that. So the tiles
// are rendered once per filter and the controller below owns their size
// classes through `classList`. React never writes `className` on a tile after
// mount — every className prop in the JSX is a constant string, so
// re-rendering (a hover, a filter, an overlay open) cannot clobber the
// classes the controller put there. Anything React DOES need to toggle rides
// on a `data-` attribute instead, which lives in a different attribute
// namespace and cannot collide.
// ————————————————————————————————————————————————————————
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { CASES, FILTERS } from '../data/site.js'
import { EASE, SplitWords, Reveal } from '../lib/motion.jsx'
import { useBottomSheet, useIsMobile, useSheetScrollHandoff, SheetHandle } from '../lib/sheet.jsx'
import { WoolButton } from './Wool.jsx'
import { DeviceShowcase } from './DeviceShowcase.jsx'
import './heads-v7.css'
import './work-mosaic.css'

// Spelled-out numerals up to the range this board can plausibly reach; past
// that the digit is fine and honest.
const NUMBER_WORD = {
  5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
  16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
  21: 'twenty-one', 22: 'twenty-two', 23: 'twenty-three', 24: 'twenty-four',
  25: 'twenty-five',
}
const titleCase = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1)

// `country` is prose, not a code: "Sarajevo" means Bosnia, "CH / BiH" is two
// countries, "German market" is a market served rather than a place worked in.
// Normalise to real countries so the headline counts what it claims to count.
const COUNTRY_ALIAS = {
  sarajevo: 'Bosnia', bih: 'Bosnia', ch: 'Switzerland', switzerland: 'Switzerland',
  'german market': 'Germany', germany: 'Germany', uae: 'UAE', oman: 'Oman',
  jordan: 'Jordan', croatia: 'Croatia', usa: 'USA',
}
const COUNTRY_COUNT = new Set(
  CASES.flatMap((c) => String(c.country || '').split(/[/×,]/))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => COUNTRY_ALIAS[s] || s)
).size

// Fade images in on decode — ref callback handles the cached case (onLoad
// never fires for images that were complete before hydration).
const imgFade = (el) => { if (el && el.complete && el.naturalWidth) el.classList.add('is-loaded') }
const onImgLoad = (e) => e.currentTarget.classList.add('is-loaded')

const n2 = (i) => String(i + 1).padStart(2, '0')

// ————————————————————————————————————————————————————————
// THE SIZE MAPS
//
// A block is a run of contiguous cards built to occupy EXACTLY two rows of
// the four-column grid. A block's "map" is the list of size classes its cards
// wear; every map below fills its two rows with no holes and no spill, which
// is what makes the wall a fixed number of rows tall no matter which maps are
// showing — swap a map and nothing under #work moves.
//
// Every map here was verified against a simulation of CSS grid's SPARSE
// auto-placement (4 columns, cursor never moves backwards) before it shipped:
// two candidates that looked fine by eye — ['m-w','m-w','m-t','m-t'] for four
// cards and a two-band map for two — turned out to need three rows and leave
// four empty cells, and were dropped.
//
// wm-h = 4 cols x 2 rows   wm-f = 2 x 2   wm-t = 1 x 2   wm-w = 2 x 1   wm-s = 1 x 1
// ————————————————————————————————————————————————————————
const SIZES = ['wm-h', 'wm-f', 'wm-t', 'wm-w', 'wm-s']
const AREA = { 'wm-h': 8, 'wm-f': 4, 'wm-t': 2, 'wm-w': 2, 'wm-s': 1 }
// the classes big enough to carry a MacBook + iPhone legibly
const BIG = new Set(['wm-h', 'wm-f'])

const MAPS = {
  1: { h1: ['wm-h'] },
  2: { f1: ['wm-f', 'wm-f'] },
  3: {
    f1: ['wm-f', 'wm-t', 'wm-t'],
    f2: ['wm-f', 'wm-w', 'wm-w'],
    f3: ['wm-t', 'wm-t', 'wm-f'],
  },
  4: {
    f1: ['wm-f', 'wm-s', 'wm-s', 'wm-w'],
    f2: ['wm-f', 'wm-w', 'wm-s', 'wm-s'],
    t1: ['wm-t', 'wm-t', 'wm-w', 'wm-w'],
    t2: ['wm-t', 'wm-t', 'wm-t', 'wm-t'],
  },
  5: {                                                     // five cards, eight cells, two rows
    f1: ['wm-f', 'wm-s', 'wm-s', 'wm-s', 'wm-s'],          // feature left, four standards right
    t2: ['wm-t', 'wm-t', 'wm-w', 'wm-s', 'wm-s'],          // two towers, a band, two standards
    t3: ['wm-t', 'wm-t', 'wm-s', 'wm-s', 'wm-w'],          // …band drops to the second row
    t4: ['wm-t', 'wm-s', 'wm-s', 'wm-t', 'wm-w'],          // towers to the outside, band centred
  },
  6: {                                                     // six cards, eight cells, two rows
    w1: ['wm-s', 'wm-s', 'wm-w', 'wm-s', 'wm-s', 'wm-w'],
    b1: ['wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-w', 'wm-w'],  // the base map: four + two bands
    b2: ['wm-s', 'wm-s', 'wm-s', 'wm-t', 'wm-s', 'wm-w'],
    b3: ['wm-s', 'wm-t', 'wm-s', 'wm-s', 'wm-s', 'wm-w'],
    b4: ['wm-t', 'wm-s', 'wm-s', 'wm-s', 'wm-w', 'wm-s'],
  },
  7: {
    s1: ['wm-w', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s'],
    s2: ['wm-s', 'wm-s', 'wm-w', 'wm-s', 'wm-s', 'wm-s', 'wm-s'],
    s3: ['wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-w', 'wm-s', 'wm-s'],
    s4: ['wm-t', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s'],
    s5: ['wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-w'],
  },
  8: { a1: ['wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s'] },
}
// Each block walks its chain like a metronome — 0,1,2,3,2,1,0,… — because
// ADJACENT maps in these chains differ in only three or four cards. Jumping
// across a chain would re-flow the whole block; stepping along it moves the
// smallest legible number of cards.
const CHAINS = {
  1: ['h1'], 2: ['f1'], 3: ['f1', 'f2', 'f3'], 4: ['f1', 'f2', 't1', 't2'],
  5: ['f1', 't2', 't3', 't4'], 6: ['w1', 'b1', 'b2', 'b3', 'b4'],
  7: ['s1', 's2', 's3', 's4', 's5'], 8: ['a1'],
}
// where each block rests: the composition the wall falls back to on a phone,
// under reduced motion and on every resize below the switching threshold
const BASE_AT = { 6: 1 }

/** Cut a list of N cards into blocks of two grid rows each.
 *  16 → 5,5,6, exactly the partition the lab measured. */
function blockSizes(n) {
  const out = []
  let r = n
  while (r > 0) {
    if (r <= 8) { out.push(r); break }
    if (r - 5 >= 5) { out.push(5); r -= 5 } else { out.push(6); r -= 6 }
  }
  return out
}

/** Index 0 of a block gets the top tier in most of its maps, so a `featured`
 *  case is walked to the head of each block. Relative order is preserved
 *  inside both pools, so the wall is still the data's order, only re-phrased
 *  — no hardcoded slug list like the lab's, which could not survive a filter. */
function arrange(list, sizes) {
  const feat = list.filter((c) => c.featured)
  const rest = list.filter((c) => !c.featured)
  const out = []
  let fi = 0, ri = 0
  for (const n of sizes) {
    const block = []
    if (fi < feat.length) block.push(feat[fi++])
    while (block.length < n) {
      if (ri < rest.length) block.push(rest[ri++])
      else if (fi < feat.length) block.push(feat[fi++])
      else break
    }
    out.push(...block)
  }
  return out
}

const DUR = 3400, STAGGER = 140
const FLIP_EASE = 'cubic-bezier(.42,0,.24,1)'   // long, soft in, no snap at the end
const DRIFT = 1.35

function Mosaic({ list, onOpen }) {
  const wallRef = useRef(null)
  const tileRefs = useRef([])
  // the slugs currently showing a MacBook + iPhone. On a fine pointer this is
  // at most one — see the wm-dev note below.
  const [devSlugs, setDevSlugs] = useState([])
  const devSet = useMemo(() => new Set(devSlugs), [devSlugs])

  const wall = useMemo(() => {
    const sizes = blockSizes(list.length)
    return { sizes, cards: arrange(list, sizes) }
  }, [list])

  useEffect(() => {
    const root = wallRef.current
    const cards = wall.cards
    const tiles = tileRefs.current.slice(0, cards.length)
    if (!root || tiles.length !== cards.length || tiles.some((t) => !t)) return

    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wide = () => window.matchMedia('(min-width: 1001px)').matches
    const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

    // ── the blocks ──────────────────────────────────────────────────────────
    const blocks = []
    let at = 0
    for (const n of wall.sizes) {
      const maps = MAPS[n]
      const chain = CHAINS[n]
      if (!maps || !chain) { at += n; continue }
      blocks.push({
        maps, chain, from: at, to: at + n, tiles: tiles.slice(at, at + n),
        at: BASE_AT[n] ?? 0, base: BASE_AT[n] ?? 0, dir: 1, busy: 0,
      })
      at += n
    }

    const wear = (b, next) => {
      const map = b.maps[b.chain[next]]
      b.tiles.forEach((t, i) => {
        t.classList.remove(...SIZES)
        t.classList.add(map[i])
        // the caption carries the lead flag too — that is what drives the
        // bigger heading and the always-open reveal on the largest cards
        t.querySelector('.wm-cap')?.classList.toggle('is-lead', BIG.has(map[i]))
      })
      b.at = next
    }
    const rest = () => blocks.forEach((b) => wear(b, b.base))
    rest()

    const running = new Set()   // every in-flight WAAPI animation, so unmount can cancel

    /* ── the move itself: FLIP ────────────────────────────────────────────────
       A grid span is not an animatable property — swapping `span 2` for
       `span 1` snaps. So: read every rect in the block, swap the classes, read
       the rects again, then run each moved card from its OLD box to its new
       one on transform alone. Nothing here touches layout after that single
       measure/mutate/measure pass; the frames are compositor work.

       Three counter-animations stop the content deforming inside a box that is
       being scaled non-uniformly:
         · the .wm-ph LAYER — not the img, which is busy breathing — gets
           scale(1.04c/sx, 1.04c/sy) where c = max(sx,sy), resolving to its
           resting scale(1.04). The card's own scale(sx,sy) multiplies through
           and leaves scale(1.04c, 1.04c) — a UNIFORM scale about the photo's
           centre, so it never stretches; and 1.04c >= c >= sx,sy guarantees it
           still covers the box at every frame even with the drift and the
           breath riding inside it.
         · the .wm-cap gets scale(1/sx, 1/sy) about its own bottom-left anchor,
           so the type is drawn at true proportions throughout. It dips to 12%
           opacity for the first tenth of the move and is back by a third,
           which covers the one thing that cannot be transformed away: the
           heading changing size class under it.
         · the .wm-dev layer, when one is mounted, gets the same inverse about
           its own CENTRE — the device frames are a fixed-proportion object and
           a stretched MacBook is the most obvious artefact on the page. */
    function moveTo(b, next) {
      if (b.busy || next === b.at || next < 0 || next >= b.chain.length) return
      const first = b.tiles.map((t) => t.getBoundingClientRect())
      wear(b, next)
      const last = b.tiles.map((t) => t.getBoundingClientRect())

      const movers = []
      b.tiles.forEach((t, i) => {
        const a = first[i], z = last[i]
        if (!z.width || !z.height) return                       // never divide by a zero box
        const dx = a.left - z.left, dy = a.top - z.top
        const sx = a.width / z.width, sy = a.height / z.height
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 &&
            Math.abs(sx - 1) < 0.004 && Math.abs(sy - 1) < 0.004) return
        movers.push({ t, dx, dy, sx, sy })
      })
      if (!movers.length) return

      b.busy = movers.length
      movers.forEach((m, k) => {
        const timing = { duration: DUR, delay: k * STAGGER, easing: FLIP_EASE, fill: 'backwards' }
        m.t.classList.add('is-moving')
        m.t.style.willChange = 'transform'   // only while moving — 16 permanent layers is not free
        const c = Math.max(m.sx, m.sy)
        const ph = m.t.querySelector('.wm-ph')
        const cap = m.t.querySelector('.wm-cap')
        const dev = m.t.querySelector('.wm-dev')
        ph.style.willChange = 'transform'
        running.add(ph.animate([
          { transform: `scale(${1.04 * c / m.sx},${1.04 * c / m.sy})` },
          { transform: 'scale(1.04)' },
        ], timing))
        running.add(cap.animate([
          { transform: `scale(${1 / m.sx},${1 / m.sy})`, opacity: 0.12, offset: 0 },
          { opacity: 0.12, offset: 0.1 },
          { opacity: 1, offset: 0.34 },
          { transform: 'none', offset: 1 },
        ], timing))
        if (dev) running.add(dev.animate([
          { transform: `scale(${1 / m.sx},${1 / m.sy})` },
          { transform: 'none' },
        ], timing))
        const run = m.t.animate(
          [{ transform: `translate(${m.dx}px,${m.dy}px) scale(${m.sx},${m.sy})` }, { transform: 'none' }],
          timing)
        running.add(run)
        run.finished.then(() => {
          m.t.classList.remove('is-moving')
          m.t.style.willChange = ph.style.willChange = ''
          if (--b.busy <= 0) { b.busy = 0; invalidateBoxes() }
        }).catch(() => { b.busy = 0; m.t.classList.remove('is-moving'); invalidateBoxes() })
      })
    }

    /* ── THE AMBIENT RE-TILE IS GONE (11 Aug 2026, client: "delete this
       animation, make it static on pc") ──────────────────────────────────────
       The wall used to recompose itself forever: one block every 2.6s, each
       move a 3.4s FLIP with a 140ms stagger, so there was never an instant
       with no card in flight. It was already desktop-only (`wide()` is
       min-width 1001px), which is exactly the surface the client was looking
       at. The layout now stays on each block's resting map for the whole
       visit.

       `moveTo` and the FLIP machinery above are KEPT and still called — the
       hover promotion below walks a block to whichever map gives the hovered
       card the most area, and that is a deliberate response to the reader
       rather than motion that plays at them. What is deleted is the timer:
       the interval, the A→C→B rotation, the `live()` gate that existed to
       decide when the timer was allowed to run, and the `is-beating` marker
       the note under the wall wore while it ticked.

       `held` survives because the promotion still needs to know the pointer is
       in the wall; it no longer pauses anything. */
    let held = false, hoverT = null

    /* ── attention sets size, and mounts the hardware ─────────────────────────
       Hovering or tab-focusing a card walks its block to whichever of its maps
       gives THAT card the most area, and the ambient cycle stands down while
       the pointer is anywhere in the wall.

       The device preview rides the same 200ms intent timer. The wall is
       photography at rest; stop on a card and it shows you the site itself,
       running on a real MacBook and a real iPhone. That is where the frames
       belong: they are the reward for stopping, and mounting them one at a
       time means the two heavy frame PNGs are decoded once instead of sixteen
       times — which is exactly what the previous 3-up grid did, and the single
       most expensive thing about it.

       flushSync is load-bearing. The promotion FLIP measures the DOM in the
       same tick, so the device layer has to already BE there when moveTo looks
       for `.wm-dev` to counter-scale — otherwise the frames spend the whole
       3.4s move inside a non-uniform scale, stretched. */
    const best = new Map()
    blocks.forEach((b) => b.tiles.forEach((t, i) => {
      let bi = b.at, ba = -1
      b.chain.forEach((k, ci) => { const a = AREA[b.maps[k][i]]; if (a > ba) { ba = a; bi = ci } })
      best.set(t, { block: b, at: bi })
    }))
    // same gate as the ambient cycle minus the pause flags — a promotion is
    // wanted precisely when the pointer IS in the wall
    const askable = () => !reduced() && wide() && !document.hidden

    // Below 1001px there is no hover to reward and the wall never re-tiles, so
    // the size classes are static — which makes the largest card of each block
    // a safe permanent home for the pair. That is how a phone still gets the
    // device preview on the board itself, and it is at most one per block.
    const staticDevices = () => {
      const out = []
      blocks.forEach((b) => {
        const map = b.maps[b.chain[b.base]]
        const big = map.map((cls, i) => (BIG.has(cls) ? i : -1)).filter((i) => i >= 0)
        // A block whose resting map has no flagship (the seven-case maps are
        // six standards and a band) still gets one — the largest card it has.
        const picks = big.length ? big : [map.reduce((bi, cls, i) => (AREA[cls] > AREA[map[bi]] ? i : bi), 0)]
        picks.forEach((i) => out.push(cards[b.from + i].slug))
      })
      return out
    }
    const restDevices = () => setDevSlugs(wide() && fine() ? [] : staticDevices())
    restDevices()

    let devTile = null
    const promote = (t, i) => {
      if (t === devTile) return
      clearTimeout(hoverT)
      if (!wide() || !fine()) return
      hoverT = setTimeout(() => {                 // don't thrash on a sweep
        devTile = t
        flushSync(() => setDevSlugs([cards[i].slug]))
        if (!askable()) return
        const p = best.get(t)
        if (p) moveTo(p.block, p.at)
      }, 200)
    }
    const unpromote = () => { clearTimeout(hoverT); devTile = null; restDevices() }

    const offs = []
    const on = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); offs.push(() => el.removeEventListener(ev, fn, opts)) }

    // Focus is per-tile; the pointer is handled on the WALL, in the same
    // pointermove that already drives the drift. `pointerenter` on the tile is
    // not enough: this wall moves, so a card can slide out from under a
    // stationary cursor and the next card slide in beneath it without any
    // pointer event firing at all — which left the reader hovering a card with
    // no preview on it until they twitched the mouse.
    tiles.forEach((t, i) => { on(t, 'focus', () => promote(t, i)) })
    on(root, 'pointerenter', () => { held = true })
    on(root, 'pointerleave', () => { held = false; unpromote() })
    on(root, 'focusin', () => { held = true })
    on(root, 'focusout', () => { held = false; unpromote() })

    /* ── the breath: live windows, not stills ─────────────────────────────────
       Every card's photograph runs a permanent, very slow Ken-Burns drift — a
       pan of under a percent and a zoom of four to seven points, over 27 to 48
       seconds. It is deliberately below the threshold where you can watch it
       happen: you notice the wall is alive, not that anything moved.

       Nothing about it is shared. Each card gets its own period (27.00s +
       i×1.37s — no common factor, so the wall can never fall into step), its
       own bearing (the golden angle, 137.508° apart), its own zoom range and
       its own starting phase.

       IT CANNOT DISTORT THE PHOTO. The breath owns the <img> and nothing else
       does; the FLIP counter-scale lives one node up on .wm-ph. Both scales
       are uniform on their own node, and the pan is bounded by the zoom: the
       minimum scale s0 leaves a margin of (s0-1)/2 on every edge and the pan
       amplitude is strictly under it (0.55 ≤ 0.9, 0.67 ≤ 1.2, 0.79 ≤ 1.5,
       0.91 ≤ 1.8). So the breathing image always covers its own box with room
       to spare, and every transform outside it only scales that covered region.

       WHAT IT COSTS. One compositor-only transform animation per card, created
       lazily and PAUSED the moment the card leaves the viewport or the tab
       goes away. No will-change anywhere: a running WAAPI transform gets its
       layer for the duration and gives it back on pause. Reduced motion
       cancels them outright. */
    const BREATH = tiles.map((t, i) => {
      const dur = 27000 + i * 1370                       // 27.00s … 47.55s, all distinct
      const ang = i * 137.508 * Math.PI / 180            // golden angle: no shared bearing
      const s0 = 1.018 + (i % 4) * 0.006                 // 1.018 … 1.036 — the floor
      const s1 = s0 + 0.038 + (i % 5) * 0.007            // +3.8 … +6.6 points of zoom
      const amp = 0.55 + (i % 4) * 0.12                  // %, strictly under (s0-1)/2
      const phase = (i * 6700 + (i % 3) * 4100) % (2 * dur)
      return {
        t, i, img: t.querySelector('.wm-par img'), par: t.querySelector('.wm-par'),
        dur, s0, s1, phase, vis: false, anim: null,
        tx: +(amp * Math.cos(ang)).toFixed(3), ty: +(amp * Math.sin(ang)).toFixed(3),
      }
    })
    const syncBreath = (b) => {
      if (!b.img) return
      if (!reduced() && b.vis && !document.hidden) {
        if (!b.anim) {
          b.anim = b.img.animate([
            { transform: `translate(${-b.tx}%,${-b.ty}%) scale(${b.s0})` },
            { transform: `translate(${b.tx}%,${b.ty}%) scale(${b.s1})` },
          ], {
            duration: b.dur, iterations: Infinity, direction: 'alternate',
            easing: 'cubic-bezier(.45,0,.55,1)',
          })
          b.anim.currentTime = b.phase
        }
        if (b.anim.playState !== 'running') b.anim.play()
      } else if (b.anim) {
        if (reduced()) { b.anim.cancel(); b.anim = null } else b.anim.pause()
      }
    }
    const syncBreathAll = () => BREATH.forEach(syncBreath)

    /* ── the pointer: the crop leans toward you ───────────────────────────────
       One rAF and N string writes per pointer move, with no measurement — the
       boxes are cached and only re-read after a block settles or on resize. It
       lives on .wm-par, between the counter-scaled .wm-ph and the breathing
       img, and it spends the 4% of slack .wm-ph permanently holds: 1.35% of
       drift against ~1.9% of headroom, so it can never expose an edge either.
       The 0.6s CSS transition means the crop trails the cursor, not tracks it. */
    let boxes = null, praf = 0, ptr = null
    function invalidateBoxes() { boxes = null }
    const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v)
    const drift = () => {
      praf = 0
      if (!boxes) {
        boxes = tiles.map((t) => {
          const r = t.getBoundingClientRect()
          return {
            cx: r.left + scrollX + r.width / 2, cy: r.top + scrollY + r.height / 2,
            w: Math.max(r.width, 1), h: Math.max(r.height, 1),
          }
        })
      }
      BREATH.forEach((b, i) => {
        if (!ptr || !b.vis || reduced()) { if (b.par.style.transform) b.par.style.transform = ''; return }
        const q = boxes[i]
        const dx = clamp1((ptr.x - q.cx) / (q.w * 1.6))
        const dy = clamp1((ptr.y - q.cy) / (q.h * 1.6))
        b.par.style.transform = `translate(${(dx * DRIFT).toFixed(3)}%,${(dy * DRIFT).toFixed(3)}%)`
      })
    }
    const askDrift = () => { if (!praf) praf = requestAnimationFrame(drift) }
    on(root, 'pointermove', (e) => {
      if (reduced() || e.pointerType === 'touch') return
      ptr = { x: e.clientX + scrollX, y: e.clientY + scrollY }
      askDrift()
      const t = e.target?.closest?.('.wtile')
      if (t) { const i = tiles.indexOf(t); if (i >= 0) promote(t, i) }
    }, { passive: true })
    on(root, 'pointerleave', () => { ptr = null; askDrift() })

    // ── the gates ───────────────────────────────────────────────────────────
    const wallIO = new IntersectionObserver(() => {}, { rootMargin: '120px' })
    wallIO.observe(root)
    const tileIO = new IntersectionObserver((es) => es.forEach((e) => {
      const b = BREATH.find((x) => x.t === e.target)
      if (!b) return
      b.vis = e.isIntersecting
      syncBreath(b)
      if (!b.vis && b.par.style.transform) b.par.style.transform = ''
    }), { rootMargin: '80px' })
    BREATH.forEach((b) => tileIO.observe(b.t))

    on(document, 'visibilitychange', () => { syncBreathAll() })

    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onRM = () => {
      if (reduced()) { rest(); ptr = null }
      syncBreathAll(); drift()
    }
    rmq.addEventListener('change', onRM)

    // Below 1001px the wall settles: at one or two columns a size class no
    // longer buys a distinct shape (a "tall" card is just a column-wide card),
    // the maps stop tiling cleanly, and every switch would push the rest of the
    // document up and down. So phone and tablet get the base composition, held
    // still — and the device preview moves onto the biggest card of each block.
    let wasWide = wide()
    const onResize = () => {
      invalidateBoxes()
      const now = wide()
      if (now !== wasWide) { wasWide = now; if (!now) rest(); restDevices() }
    }
    on(window, 'resize', onResize)

    if (import.meta.env.DEV) {
      window.__mosaic = {
        tiles, blocks, moveTo, rest, wide, syncBreathAll, DUR, DRIFT,
        breathParams: BREATH.map((b) => ({ i: b.i, slug: b.t.dataset.slug, durMs: b.dur, phaseMs: b.phase, s0: b.s0, s1: b.s1, tx: b.tx, ty: b.ty })),
      }
    }

    return () => {
      clearTimeout(hoverT)
      if (praf) cancelAnimationFrame(praf)
      offs.forEach((f) => f())
      rmq.removeEventListener('change', onRM)
      wallIO.disconnect(); tileIO.disconnect()
      BREATH.forEach((b) => { b.anim?.cancel(); b.anim = null })
      running.forEach((a) => { try { a.cancel() } catch { /* already gone */ } })
      running.clear()
      if (import.meta.env.DEV) delete window.__mosaic
    }
    // setDevSlugs is a stable setState; `wall` is the only real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wall])

  return (
    <>
      {/* keyed on the filter's card list so the whole wall is rebuilt (and the
          controller re-run) when the discipline changes. The old grid used
          motion's `layout` + AnimatePresence for that; a layout animation and
          a FLIP are two systems writing one transform, so the wall cross-fades
          on opacity instead — see work-mosaic.css. */}
      <div className="wmosaic" ref={wallRef}>
        {wall.cards.map((c, i) => (
          <button
            key={c.slug}
            ref={(el) => { tileRefs.current[i] = el }}
            type="button"
            className="wtile"
            data-slug={c.slug}
            data-cursor
            data-dev={devSet.has(c.slug) ? '' : undefined}
            onClick={() => onOpen(c.slug)}
            aria-label={`Open case study: ${c.client} — ${c.title}`}
          >
            {/* three layers, three motions — see the file banner */}
            <span className="wm-ph"><span className="wm-par">
              <img
                src={c.cover} alt={`${c.client} — ${c.title}`}
                loading="lazy" decoding="async"
              />
            </span></span>
            {c.video && (
              <video className="wm-video" src={c.video} poster={c.cover}
                muted loop playsInline preload="none" tabIndex={-1} aria-hidden="true" />
            )}
            <span className="wm-scrim" aria-hidden="true" />
            <span className="wm-thread" aria-hidden="true" />
            {devSet.has(c.slug) && (
              <span className="wm-dev" aria-hidden="true"><span className="wm-devbox">
                {/* Convention over configuration: make-case-screens.mjs writes
                    screen-desktop/screen-mobile into every case folder, so the
                    slug alone resolves the pair. `devices` stays as the
                    explicit override for a case with real client screenshots,
                    and the cover is the last resort so a missing file is never
                    a hole. aria-hidden because the overlay shows the same pair
                    with real alt text — on the board it is decoration. */}
                <DeviceShowcase
                  card
                  desktop={c.devices?.desktop || `/img/cases/${c.slug}/screen-desktop.webp`}
                  mobile={c.devices?.mobile || `/img/cases/${c.slug}/screen-mobile.webp`}
                  fallback={c.cover}
                  alt={`${c.client} — ${c.title}`}
                />
              </span></span>
            )}
            {c.video && <span className="wm-reel" aria-hidden="true">REEL</span>}
            <span className="wm-cap">
              <span className="wm-rank">{n2(i)}</span>
              <h3>{c.client}</h3>
              <span className="wm-rev">
                <p>{c.title}</p>
                <span className="wm-meta">
                  <span>{c.scope.slice(0, 2).join(' · ')}</span>
                  <span className="wm-market">{c.country}</span>
                  <span>{c.year}</span>
                </span>
              </span>
            </span>
            <span className="wm-seal" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H9M17 7v8" /></svg>
            </span>
          </button>
        ))}
      </div>
      {/* The lab page carried a six-item engineering key under the wall (beat
          length, move length, the four size classes, the breath period). That
          was documentation for a concept review; on a client-facing board it
          reads as a developer talking. What survives is the part a visitor can
          act on — that the board is live, and that every card opens onto real
          hardware. The dot is driven from the actual cycle, not decoration. */}
      {/* "The board re-ranks itself while you watch" used to lead this line.
          It described the ambient re-tile, which was deleted on 11 Aug 2026 —
          so it became a claim the page no longer keeps, next to a pulse dot
          that could never light again. Both are gone; what is left is true on
          every width. */}
      <p className="wmosaic-note">
        <span>Open any card to see the site running on a <b>real MacBook and iPhone</b></span>
      </p>
    </>
  )
}

function CaseOverlay({ c, onClose, onPrev, onNext }) {
  const scrollRef = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const isMobile = useIsMobile()
  const sheet = useBottomSheet({ onDismiss: onClose })
  const requestClose = useCallback(() => {
    if (isMobile && !sheet.reduced) sheet.animateOut()
    else onClose()
  }, [isMobile, sheet, onClose])
  const scrollBind = useSheetScrollHandoff(sheet.bind, scrollRef)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { requestClose(); return }
      if (e.key === 'ArrowLeft') { onPrev(); return }
      if (e.key === 'ArrowRight') { onNext(); return }
      // Contain Tab. aria-modal hides the page from assistive tech but does
      // nothing to the tab order, so without this the next Tab walks out of
      // the dialog and into a nav the user cannot see.
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    document.documentElement.classList.add('overlay-open')

    // Move focus in, and put it back where it came from on close — otherwise
    // focus sits on <body> and a keyboard user has to tab the whole page again.
    const returnTo = document.activeElement
    const raf = requestAnimationFrame(() => closeRef.current?.focus())

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('overlay-open')
      if (returnTo instanceof HTMLElement && document.contains(returnTo)) returnTo.focus()
    }
  }, [requestClose, onPrev, onNext])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [c.slug])
  // Re-fires whenever isMobile flips true — not just at mount — so rotating a
  // phone or resizing across the breakpoint while a case is open still animates
  // the sheet in, instead of leaving it parked off-screen (see WizardModal).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isMobile) sheet.animateIn() }, [isMobile])

  const panelProps = isMobile
    ? {
        className: 'overlay-panel is-sheet',
        style: { y: sheet.y },
        ref: sheet.panelRef,
      }
    : {
        className: 'overlay-panel',
        initial: { y: '6%', opacity: 0 }, animate: { y: '0%', opacity: 1 }, exit: { y: '4%', opacity: 0 },
        transition: { duration: 0.55, ease: EASE },
      }

  return (
    <motion.div
      ref={panelRef}
      className="overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="dialog" aria-modal="true" aria-label={`Case study: ${c.client}`}
    >
      <motion.div {...panelProps}>
        {isMobile && <SheetHandle bind={sheet.bind} />}
        <header className="overlay-bar">
          <span className="overlay-brand">LOOM — Case study</span>
          <div className="overlay-nav">
            <button onClick={onPrev} aria-label="Previous case">←</button>
            <button onClick={onNext} aria-label="Next case">→</button>
            <button ref={closeRef} className="overlay-close" onClick={requestClose} aria-label="Close case study">✕</button>
          </div>
        </header>
        <div className="overlay-scroll" data-lenis-prevent ref={scrollRef} {...(isMobile ? scrollBind : null)}>
          {/* keyed fade bridges prev/next case switches (content used to teleport) */}
          <motion.div
            key={c.slug}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
          <div className="overlay-head">
            <p className="overlay-scope">{c.scope.join(' · ')}</p>
            <h2>{c.client}</h2>
            <p className="overlay-title">{c.title}</p>
            <div className="overlay-facts">
              <span><em>Market</em>{c.country}</span>
              <span><em>Year</em>{c.year}</span>
              <span><em>Studio</em>LOOM</span>
            </div>
            <p className="overlay-copy">{c.copy}</p>
          </div>
          {/* The full-size device pair. The board shows one of these at a time
              as the reward for holding a card; the overlay is where it is the
              subject — one per case, at panel width, with real alt text. Every
              case gets shown on real hardware, not just the jobs that happened
              to ship a dedicated mobile capture: when `devices` is missing,
              both panes fall back to the same cover shot the tile uses, so a
              case with one production still reads as "responsive", never as a
              placeholder or a missing asset. */}
          <div className="overlay-devices">
            <DeviceShowcase
              desktop={c.devices?.desktop || `/img/cases/${c.slug}/screen-desktop.webp`}
              mobile={c.devices?.mobile || `/img/cases/${c.slug}/screen-mobile.webp`}
              fallback={c.cover}
              alt={`${c.client} — ${c.title}`}
            />
          </div>
          <div className="overlay-gallery">
            {c.video && (
              <motion.figure
                className="overlay-board overlay-video"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <video
                  src={c.video} poster={c.cover}
                  autoPlay muted loop playsInline controls
                />
                <figcaption>Production reel — {c.client}</figcaption>
              </motion.figure>
            )}
            {c.feature.map((src, i) => (
              <motion.figure
                key={src}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-5% 0px' }}
                transition={{ duration: 0.7, ease: EASE, delay: (i % 2) * 0.06 }}
              >
                {/* Not lazy. The gallery is the only thing that makes this
                    panel taller than its scroll box, and a lazy image has no
                    height until it loads — so it never entered view, never
                    loaded, and the overlay could not be scrolled at all. */}
                <img src={src} alt={`${c.client} — feature visual ${i + 1}`} decoding="async" ref={imgFade} onLoad={onImgLoad} />
              </motion.figure>
            ))}
            {c.boards.map((src, i) => (
              <motion.figure
                key={src} className="overlay-board"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-5% 0px' }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <img src={src} alt={`${c.client} — case board ${i + 1}`} decoding="async" ref={imgFade} onLoad={onImgLoad} />
              </motion.figure>
            ))}
          </div>
          <footer className="overlay-foot">
            <WoolButton label="Next case" onClick={onNext} />
          </footer>
          </motion.div>
        </div>
      </motion.div>
      <button className="overlay-backdrop" onClick={requestClose} aria-label="Close" tabIndex={-1} />
    </motion.div>
  )
}

export function Work() {
  const [filter, setFilter] = useState('all')
  const [openSlug, setOpenSlug] = useState(null)

  const list = useMemo(
    () => (filter === 'all' ? CASES : CASES.filter((c) => c.filter.includes(filter))),
    [filter]
  )

  const openCase = useCallback((slug) => setOpenSlug(slug), [])
  const close = useCallback(() => setOpenSlug(null), [])
  const idx = CASES.findIndex((c) => c.slug === openSlug)
  const prev = useCallback(() => setOpenSlug(CASES[(idx - 1 + CASES.length) % CASES.length].slug), [idx])
  const next = useCallback(() => setOpenSlug(CASES[(idx + 1) % CASES.length].slug), [idx])

  return (
    <section className="work" id="work">
      <div className="section-head">
        <p className="kicker"><span>—</span> Selected work</p>
        {/* Counted from the data, never typed. The headline read "Seventeen"
            while CASES held eighteen — a claim on a client-facing agency site
            that drifts the moment someone adds a case. Countries are counted
            the same way: `country` is a free-text field that mixes markets
            ("German market") with pairs ("CH / BiH", "Oman × UAE"), so split
            on the separators and fold the city onto its country before
            counting distinct ones. */}
        <SplitWords as="h2" className="h2" text={`${titleCase(NUMBER_WORD[CASES.length] ?? CASES.length)} brands launched across ${NUMBER_WORD[COUNTRY_COUNT] ?? COUNTRY_COUNT} countries — not one template between them.`} />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Everything on this board went live — and most of it went further. Open any tile and walk the whole case.
          </p>
        </Reveal>
      </div>

      <div className="work-all">
        {/* Toggle buttons, not tabs: role="tab" promises a tabpanel to own and
            arrow-key roving focus, and neither exists here — a screen reader
            would announce "tab 1 of 6" and the arrow keys would do nothing. */}
        <div className="work-filters" role="group" aria-label="Filter case studies">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              className={`filter ${filter === f.id ? 'is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >{f.label}</button>
          ))}
        </div>
        <Mosaic key={filter} list={list} onOpen={openCase} />
      </div>

      <AnimatePresence>
        {openSlug && (
          <CaseOverlay
            c={CASES[idx]}
            onClose={close} onPrev={prev} onNext={next}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
