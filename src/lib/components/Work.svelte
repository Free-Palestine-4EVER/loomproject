<!--
  Selected Work — the living Mosaic, the discipline filters, and the
  full-screen case overlay.

  The board used to be a plain 3-up grid of 4:3 cards. It is now the Mosaic
  prototyped and measured in the React build's work-lab.html #c2: ONE picture
  wall in four size classes where the size IS the ranking, and the ranking is
  re-argued on a beat. Everything below is that prototype driven from `CASES`
  instead of the lab's hardcoded copy, plus the three things the lab page
  never modelled — the case overlay, the discipline filters, and the device
  preview.

  THE FOUR MOTIONS, and why they do not fight each other
  ------------------------------------------------------
  1. THE RE-TILING. Grid spans are not animatable, so a block of the wall
     swaps its size map and every moved card is FLIPped from its old box to
     its new one on transform alone. 2.6s beat, 3.4s move — the move is
     longer than the gap, so a move is always in flight.
  2. THE BREATH. Every photograph runs a permanent 27–48s Ken-Burns drift on
     its own period, bearing and phase, so the wall is alive even between
     beats and on a phone, where the re-tiling is deliberately off.
  3. THE POINTER DRIFT. Every visible crop leans toward the cursor by an
     amount that falls off with distance, so sixteen framed pictures read as
     one surface you are moving over.
  4. THE DEVICE PREVIEW. See the hover-promotion note below.

  Each of those owns exactly ONE node of the photo stack
  (.wm-ph > .wm-par > img — FLIP, drift, breath in that order) and nothing
  else ever writes that node. That separation is the entire reason the
  effects compose instead of overwriting each other, and it is load-bearing:
  only .wm-ph is ever scaled non-uniformly, and only as the exact inverse of
  its own tile's box scale, so the composite crop can be cropped tighter or
  looser but can never stretch. Do not collapse the stack.

  WHY THE TILES ARE DRIVEN IMPERATIVELY. A FLIP is measure → mutate → measure
  in one synchronous pass; Svelte's reactivity cannot do that any more than
  React's could. So the tiles are rendered once per filter and the controller
  below owns their size classes through `classList`. The template never binds
  a reactive `class=` expression to a tile's size — the base `class="wtile"`
  is a constant string, exactly like the React build's constant `className`
  prop, so a re-render triggered by hover/device-preview state cannot clobber
  the classes the controller put there. Anything Svelte DOES need to toggle
  rides on a separate `{#if}` (the device-preview markup) or a `data-`
  attribute, never the tile's own class list.

  ── THE AMBIENT RE-TILE IS GONE (11 Aug 2026, client: "delete this
  animation, make it static on pc") ──
  The wall used to recompose itself forever on a timer. It is now
  desktop-only, hover/focus-driven: stopping on a card walks its BLOCK to
  whichever map gives that card the most area, and the layout otherwise stays
  on each block's resting map for the whole visit. `moveTo` and the FLIP
  machinery are kept and still called by that hover promotion.
-->
<script>
  import { webpSrcset } from './Pic.svelte'
  import { flushSync } from 'svelte'
  import { browser } from '$app/environment'
  import { CASES, FILTERS } from '$data/site.js'
  import { reducedMotion, reveal } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import DeviceShowcase from './DeviceShowcase.svelte'
  import './heads-v7.css'
  import './work-mosaic.css'

  // Real encoded dimensions of each case's cover.webp — `sharp(...).metadata()`,
  // not assumed — keyed by slug. Same source-of-truth numbers as
  // machineWork.js's own DIMS table (that file measures the same 16 files for
  // its own grid), duplicated rather than imported because the two components
  // pick different files per case (this one is cover-only, machineWork.js
  // round-robins star frames too) and importing a private, unexported map
  // across files is more coupling than 16 numbers are worth. Every cover
  // <img> below carries these so the mosaic tile reserves its box before the
  // photo lands instead of reflowing — this is what closed the "19 images
  // with no width/height" gap the image-optimisation pass measured.
  const COVER_DIMS = {
    auraa: [960, 733], benetton: [960, 540], bezdrob: [960, 596],
    boccapiena: [960, 640], ellie: [1040, 715], evorahome: [1040, 715],
    herbas: [960, 640], maison: [1040, 715], modulart: [960, 1280],
    ojar: [1040, 1040], place87: [960, 574], scion: [960, 540],
    shteq: [960, 720], slatko: [960, 540], weitnauer: [960, 640],
    zen2fit: [960, 540],
  }

  // Spelled-out numerals up to the range this board can plausibly reach;
  // past that the digit is fine and honest.
  const NUMBER_WORD = {
    5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
    16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
    21: 'twenty-one', 22: 'twenty-two', 23: 'twenty-three', 24: 'twenty-four',
    25: 'twenty-five',
  }
  const titleCase = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1)

  // `country` is prose, not a code: "Sarajevo" means Bosnia, "CH / BiH" is
  // two countries, "German market" is a market served rather than a place
  // worked in. Normalise to real countries so the headline counts what it
  // claims to count.
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

  const n2 = (i) => String(i + 1).padStart(2, '0')

  // Fade images in on decode — the action handles the cached case (onload
  // never fires for images that were complete before hydration).
  function imgFade(el) { if (el && el.complete && el.naturalWidth) el.classList.add('is-loaded') }
  const onImgLoad = (e) => e.currentTarget.classList.add('is-loaded')

  // ————————————————————————————————————————————————————————
  // THE SIZE MAPS
  //
  // A block is a run of contiguous cards built to occupy EXACTLY two rows of
  // the four-column grid. A block's "map" is the list of size classes its
  // cards wear; every map below fills its two rows with no holes and no
  // spill, which is what makes the wall a fixed number of rows tall no
  // matter which maps are showing — swap a map and nothing under #work
  // moves.
  //
  // wm-h = 4 cols x 2 rows   wm-f = 2 x 2   wm-t = 1 x 2   wm-w = 2 x 1   wm-s = 1 x 1
  // ————————————————————————————————————————————————————————
  const SIZES = ['wm-h', 'wm-f', 'wm-t', 'wm-w', 'wm-s']
  const AREA = { 'wm-h': 8, 'wm-f': 4, 'wm-t': 2, 'wm-w': 2, 'wm-s': 1 }
  const BIG = new Set(['wm-h', 'wm-f']) // big enough to carry a MacBook + iPhone legibly

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
    5: {
      f1: ['wm-f', 'wm-s', 'wm-s', 'wm-s', 'wm-s'],
      t2: ['wm-t', 'wm-t', 'wm-w', 'wm-s', 'wm-s'],
      t3: ['wm-t', 'wm-t', 'wm-s', 'wm-s', 'wm-w'],
      t4: ['wm-t', 'wm-s', 'wm-s', 'wm-t', 'wm-w'],
    },
    6: {
      w1: ['wm-s', 'wm-s', 'wm-w', 'wm-s', 'wm-s', 'wm-w'],
      b1: ['wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-w', 'wm-w'],
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
  // ADJACENT maps in these chains differ in only three or four cards.
  const CHAINS = {
    1: ['h1'], 2: ['f1'], 3: ['f1', 'f2', 'f3'], 4: ['f1', 'f2', 't1', 't2'],
    5: ['f1', 't2', 't3', 't4'], 6: ['w1', 'b1', 'b2', 'b3', 'b4'],
    7: ['s1', 's2', 's3', 's4', 's5'], 8: ['a1'],
  }
  // where each block rests: the composition the wall falls back to on a
  // phone, under reduced motion and on every resize below the switching
  // threshold
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

  /** Index 0 of a block gets the top tier in most of its maps, so a
   *  `featured` case is walked to the head of each block. Relative order is
   *  preserved inside both pools, so the wall is still the data's order,
   *  only re-phrased. */
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
  const FLIP_EASE = 'cubic-bezier(.42,0,.24,1)' // long, soft in, no snap at the end
  const DRIFT = 1.35

  // ── state ──────────────────────────────────────────────────────────────
  let filter = $state('all')
  let openSlug = $state(null)

  const list = $derived(filter === 'all' ? CASES : CASES.filter((c) => c.filter.includes(filter)))
  const idx = $derived(CASES.findIndex((c) => c.slug === openSlug))

  const openCase = (slug) => { openSlug = slug }
  const closeCase = () => { openSlug = null }
  const prevCase = () => { openSlug = CASES[(idx - 1 + CASES.length) % CASES.length].slug }
  const nextCase = () => { openSlug = CASES[(idx + 1) % CASES.length].slug }

  const headline = $derived(
    `${titleCase(NUMBER_WORD[CASES.length] ?? CASES.length)} brands launched across ${NUMBER_WORD[COUNTRY_COUNT] ?? COUNTRY_COUNT} countries — not one template between them.`
  )

  // ══════════════════════════════════════════════════════════════════════
  // THE MOSAIC CONTROLLER
  //
  // Driven imperatively, once per filter change — mirrors the React build's
  // `useEffect(() => {...}, [wall])`, keyed the same way: the whole wall is
  // rebuilt (fresh tiles, fresh listeners) whenever `list` changes, which is
  // what `{#key filter}` around the markup below achieves. Nothing here runs
  // on the server; `onMount` (called from inside the keyed block via the
  // `mosaic` action below) is client-only by construction.
  // ══════════════════════════════════════════════════════════════════════
  let wallEl = $state(null)
  let tileEls = $state([])
  let devSlugs = $state([])
  const devSet = $derived(new Set(devSlugs))

  const wall = $derived.by(() => {
    const sizes = blockSizes(list.length)
    return { sizes, cards: arrange(list, sizes) }
  })

  /** Svelte action: mounted on `.wmosaic`. Runs the entire imperative
   *  controller once the tiles for THIS wall exist, and tears it fully down
   *  on destroy (which happens automatically whenever `{#key filter}` swaps
   *  the wall for a new one). */
  function mosaicController(root) {
    if (!browser) return {}
    const cards = wall.cards
    const tiles = tileEls.slice(0, cards.length)
    if (!root || tiles.length !== cards.length || tiles.some((t) => !t)) return {}

    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wide = () => window.matchMedia('(min-width: 1001px)').matches
    const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

    // ── the blocks ──────────────────────────────────────────────────────
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
        t.querySelector('.wm-cap')?.classList.toggle('is-lead', BIG.has(map[i]))
      })
      b.at = next
    }
    const rest = () => blocks.forEach((b) => wear(b, b.base))
    rest()

    const running = new Set() // every in-flight WAAPI animation, so unmount can cancel

    /* ── the move itself: FLIP ──────────────────────────────────────────
       A grid span is not an animatable property — swapping `span 2` for
       `span 1` snaps. So: read every rect in the block, swap the classes,
       read the rects again, then run each moved card from its OLD box to
       its new one on transform alone. */
    function moveTo(b, next) {
      if (b.busy || next === b.at || next < 0 || next >= b.chain.length) return
      const first = b.tiles.map((t) => t.getBoundingClientRect())
      wear(b, next)
      const last = b.tiles.map((t) => t.getBoundingClientRect())

      const movers = []
      b.tiles.forEach((t, i) => {
        const a = first[i], z = last[i]
        if (!z.width || !z.height) return
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
        m.t.style.willChange = 'transform'
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

    let held = false, hoverT = null

    /* ── attention sets size, and mounts the hardware ───────────────────
       Hovering or tab-focusing a card walks its block to whichever of its
       maps gives THAT card the most area. The device preview rides the same
       200ms intent timer — the wall is photography at rest; stop on a card
       and it shows you the site itself, running on a real MacBook and a
       real iPhone.

       `flushSync` is load-bearing, exactly as it was in the React build: the
       promotion FLIP measures the DOM in the same tick, so the device layer
       has to already BE there when `moveTo` looks for `.wm-dev` to
       counter-scale — otherwise the frames spend the whole 3.4s move inside
       a non-uniform scale, stretched. */
    const best = new Map()
    blocks.forEach((b) => b.tiles.forEach((t, i) => {
      let bi = b.at, ba = -1
      b.chain.forEach((k, ci) => { const a = AREA[b.maps[k][i]]; if (a > ba) { ba = a; bi = ci } })
      best.set(t, { block: b, at: bi })
    }))
    const askable = () => !reduced() && wide() && !document.hidden

    const staticDevices = () => {
      const out = []
      blocks.forEach((b) => {
        const map = b.maps[b.chain[b.base]]
        const big = map.map((cls, i) => (BIG.has(cls) ? i : -1)).filter((i) => i >= 0)
        const picks = big.length ? big : [map.reduce((bi, cls, i) => (AREA[cls] > AREA[map[bi]] ? i : bi), 0)]
        picks.forEach((i) => out.push(cards[b.from + i].slug))
      })
      return out
    }
    const restDevices = () => { devSlugs = wide() && fine() ? [] : staticDevices() }
    restDevices()

    let devTile = null
    const promote = (t, i) => {
      if (t === devTile) return
      clearTimeout(hoverT)
      if (!wide() || !fine()) return
      hoverT = setTimeout(() => {
        devTile = t
        devSlugs = [cards[i].slug]
        flushSync()
        if (!askable()) return
        const p = best.get(t)
        if (p) moveTo(p.block, p.at)
      }, 200)
    }
    const unpromote = () => { clearTimeout(hoverT); devTile = null; restDevices() }

    const offs = []
    const on = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); offs.push(() => el.removeEventListener(ev, fn, opts)) }

    tiles.forEach((t, i) => { on(t, 'focus', () => promote(t, i)) })
    on(root, 'pointerenter', () => { held = true })
    on(root, 'pointerleave', () => { held = false; unpromote() })
    on(root, 'focusin', () => { held = true })
    on(root, 'focusout', () => { held = false; unpromote() })

    /* ── the breath: live windows, not stills ────────────────────────── */
    const BREATH = tiles.map((t, i) => {
      const dur = 27000 + i * 1370
      const ang = i * 137.508 * Math.PI / 180
      const s0 = 1.018 + (i % 4) * 0.006
      const s1 = s0 + 0.038 + (i % 5) * 0.007
      const amp = 0.55 + (i % 4) * 0.12
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

    /* ── the pointer: the crop leans toward you ──────────────────────── */
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

    // ── the gates ───────────────────────────────────────────────────────
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

    let wasWide = wide()
    const onResize = () => {
      invalidateBoxes()
      const now = wide()
      if (now !== wasWide) { wasWide = now; if (!now) rest(); restDevices() }
    }
    on(window, 'resize', onResize)

    return {
      destroy() {
        clearTimeout(hoverT)
        if (praf) cancelAnimationFrame(praf)
        offs.forEach((f) => f())
        rmq.removeEventListener('change', onRM)
        wallIO.disconnect(); tileIO.disconnect()
        BREATH.forEach((b) => { b.anim?.cancel(); b.anim = null })
        running.forEach((a) => { try { a.cancel() } catch { /* already gone */ } })
        running.clear()
      },
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // THE CASE OVERLAY — a lightweight bottom sheet on mobile, a centred panel
  // on desktop. Drag physics are deliberately simplified from the React
  // build's spring simulation (useMotionValue + WAAPI spring) down to a CSS
  // transition driven by one `$state` offset, per PORTING.md rule 2 ("never
  // a spring simulation on the main thread") — position is still 1:1 with
  // the finger while dragging (no transition), and released motion animates
  // with a plain CSS cubic-bezier instead of an integrated spring.
  // ══════════════════════════════════════════════════════════════════════
  let isMobile = $state(false)
  $effect(() => {
    if (!browser) return
    const mq = window.matchMedia('(max-width: 767px)')
    isMobile = mq.matches
    const onChange = () => { isMobile = mq.matches }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  })

  let sheetY = $state(0)
  let sheetAnimating = $state(false) // true only while a CSS transition should run (release / open / close)
  let sheetPanelEl = $state(null)
  let sheetScrollEl = $state(null)
  let sheetDrag = null // { grabY, startVal, history[] } while a pointer is down

  function sheetMeasure() {
    return sheetPanelEl?.offsetHeight || Math.round(window.innerHeight * 0.9)
  }
  function sheetAnimateIn() {
    if (reducedMotion.current) { sheetAnimating = false; sheetY = 0; return }
    sheetAnimating = false
    sheetY = sheetMeasure()
    requestAnimationFrame(() => {
      sheetAnimating = true
      sheetY = 0
    })
  }
  function sheetAnimateOut(onDone) {
    if (reducedMotion.current) { onDone(); return }
    sheetAnimating = true
    sheetY = sheetMeasure() || Math.round(window.innerHeight * 0.9)
    setTimeout(onDone, 400)
  }

  const rubberband = (overshoot, dim, c = 0.55) => (overshoot * dim * c) / (dim + c * Math.abs(overshoot))

  function sheetPointerDown(e) {
    if (reducedMotion.current) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    sheetAnimating = false
    sheetDrag = { grabY: e.clientY, startVal: sheetY, history: [{ t: performance.now(), y: e.clientY }] }
  }
  function sheetPointerMove(e) {
    if (!sheetDrag) return
    const delta = e.clientY - sheetDrag.grabY
    let next = sheetDrag.startVal + delta
    const h = sheetMeasure()
    if (next < 0) next = -rubberband(-next, h || 600)
    sheetY = next
    sheetDrag.history.push({ t: performance.now(), y: e.clientY })
    if (sheetDrag.history.length > 6) sheetDrag.history.shift()
  }
  function sheetPointerUp(requestClose) {
    return () => {
      const d = sheetDrag
      if (!d) return
      sheetDrag = null
      let velocity = 0
      if (d.history.length >= 2) {
        const a = d.history[0], b = d.history[d.history.length - 1]
        const dt = (b.t - a.t) / 1000
        if (dt > 0) velocity = (b.y - a.y) / dt
      }
      const h = sheetMeasure() || 600
      const dismiss = sheetY > h * 0.32 || velocity > 700
      if (dismiss) requestClose()
      else { sheetAnimating = true; sheetY = 0 }
    }
  }

  // Wraps the scroll container's own pointer handlers so a drag that starts
  // while the container is scrolled to top and moves downward hands off to
  // the sheet's own drag — the same region both scrolls its content and
  // drags the sheet closed.
  let scrollHandoff = { active: false, startY: 0 }
  function sheetScrollPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    scrollHandoff = { active: false, startY: e.clientY }
  }
  function sheetScrollPointerMove(e, requestClose) {
    if (scrollHandoff.startY === undefined) return
    if (!scrollHandoff.active) {
      const dy = e.clientY - scrollHandoff.startY
      const atTop = (sheetScrollEl?.scrollTop || 0) <= 0
      if (atTop && dy > 6) {
        scrollHandoff.active = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        sheetPointerDown({ clientY: scrollHandoff.startY, currentTarget: e.currentTarget, pointerId: e.pointerId })
      } else if (dy < -6 || !atTop) { scrollHandoff = {}; return }
      else return
    }
    e.preventDefault()
    sheetPointerMove(e)
  }
  function sheetScrollPointerUp(requestClose) {
    return (e) => {
      if (scrollHandoff.active) sheetPointerUp(requestClose)()
      scrollHandoff = {}
    }
  }

  function requestCloseOverlay() {
    if (isMobile && !reducedMotion.current) sheetAnimateOut(closeCase)
    else closeCase()
  }

  // Focus trap + Escape/arrow keys + scroll-reset + focus return. Runs only
  // while an overlay is open — a top-level `$effect`, torn down when
  // `openSlug` clears (the destructor runs on every dependency change, not
  // only unmount, matching the React `useEffect` cleanup contract).
  let closeBtnEl = $state(null)
  let panelEl = $state(null)
  $effect(() => {
    if (!browser || !openSlug) return
    const onKey = (e) => {
      if (e.key === 'Escape') { requestCloseOverlay(); return }
      if (e.key === 'ArrowLeft') { prevCase(); return }
      if (e.key === 'ArrowRight') { nextCase(); return }
      if (e.key !== 'Tab') return
      const panel = panelEl
      if (!panel) return
      const focusable = panel.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    document.documentElement.classList.add('overlay-open')

    const returnTo = document.activeElement
    const raf = requestAnimationFrame(() => closeBtnEl?.focus())
    if (isMobile) sheetAnimateIn()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('overlay-open')
      if (returnTo instanceof HTMLElement && document.contains(returnTo)) returnTo.focus()
    }
  })
  // Scroll the panel back to the top whenever the case itself changes
  // (prev/next inside an open overlay) — separate from the open/close
  // effect above, exactly as the React build split these into two effects.
  $effect(() => {
    void openSlug
    sheetScrollEl?.scrollTo({ top: 0 })
  })
  // Re-fires whenever `isMobile` flips true — not just at open — so
  // rotating a phone or resizing across the breakpoint while a case is open
  // still animates the sheet in, instead of leaving it parked off-screen.
  $effect(() => { if (openSlug && isMobile) sheetAnimateIn() })
</script>

<section class="work" id="work">
  <div class="section-head">
    <p class="kicker"><span>—</span> Selected work</p>
    <!-- Counted from the data, never typed — see the COUNTRY_COUNT note
         above. -->
    <SplitWords as="h2" class="h2" text={headline} />
    <div use:reveal={{ delay: 0.15 }}>
      <p class="lede" style="margin-top:22px">
        Everything on this board went live — and most of it went further. Open any tile and walk the whole case.
      </p>
    </div>
  </div>

  <div class="work-all">
    <!-- Toggle buttons, not tabs: role="tab" promises a tabpanel to own and
         arrow-key roving focus, and neither exists here — a screen reader
         would announce "tab 1 of 6" and the arrow keys would do nothing. -->
    <div class="work-filters" role="group" aria-label="Filter case studies">
      {#each FILTERS as f (f.id)}
        <button
          type="button"
          aria-pressed={filter === f.id}
          class="filter {filter === f.id ? 'is-active' : ''}"
          onclick={() => (filter = f.id)}
        >{f.label}</button>
      {/each}
    </div>

    <!-- keyed on the filter itself so the whole wall (and the controller
         above) is rebuilt when the discipline changes — the direct Svelte
         equivalent of the React build's `<Mosaic key={filter} .../>`. The
         old grid used motion's `layout` + AnimatePresence for that; a
         layout animation and a FLIP are two systems writing one transform,
         so the wall cross-fades on opacity instead (see work-mosaic.css). -->
    {#key filter}
      <div class="wmosaic" bind:this={wallEl} use:mosaicController>
        {#each wall.cards as c, i (c.slug)}
          <button
            bind:this={tileEls[i]}
            type="button"
            class="wtile"
            data-slug={c.slug}
            data-cursor
            data-dev={devSet.has(c.slug) ? '' : undefined}
            onclick={() => openCase(c.slug)}
            aria-label="Open case study: {c.client} — {c.title}"
          >
            <!-- three layers, three motions — see the file banner -->
            <span class="wm-ph"><span class="wm-par">
              <!-- The mosaic tiles are the second-heaviest image block on the
                   page: 1040px covers rendered into a ~324px tile. `sizes`
                   describes the tile, not the viewport — the mosaic is a
                   multi-column wall, so a tile is a fraction of the width at
                   every breakpoint, and without this the browser would assume
                   100vw and take the largest rung every time.

                   The parallax layer (.wm-par) scales the image beyond its box,
                   so the rung asked for is deliberately generous rather than
                   exactly the measured tile width. -->
              <!-- NOT <Pic> here, deliberately: this <img> carries `use:imgFade`,
                   and a Svelte action can only be applied to a DOM element, not
                   to a component. So the ladder is attached by hand with the
                   same helpers Pic uses, and the element stays a real <img>. -->
              <img
                src={c.cover} alt="{c.client} — {c.title}"
                srcset={webpSrcset(c.cover)}
                sizes="(max-width: 767px) 92vw, (max-width: 1199px) 46vw, 30vw"
                width={COVER_DIMS[c.slug]?.[0]} height={COVER_DIMS[c.slug]?.[1]}
                loading="lazy" decoding="async"
                use:imgFade onload={onImgLoad}
              />
            </span></span>
            {#if c.video}
              <video class="wm-video" src={c.video} poster={c.cover}
                muted loop playsinline preload="none" tabindex="-1" aria-hidden="true"></video>
            {/if}
            <span class="wm-scrim" aria-hidden="true"></span>
            <span class="wm-thread" aria-hidden="true"></span>
            {#if devSet.has(c.slug)}
              <span class="wm-dev" aria-hidden="true"><span class="wm-devbox">
                <!-- Convention over configuration: the slug alone resolves
                     the screenshot pair. `devices` stays as the explicit
                     override for a case with real client screenshots, and
                     the cover is the last resort so a missing file is never
                     a hole. -->
                <DeviceShowcase
                  card
                  desktop={c.devices?.desktop || `/img/cases/${c.slug}/screen-desktop.webp`}
                  mobile={c.devices?.mobile || `/img/cases/${c.slug}/screen-mobile.webp`}
                  fallback={c.cover}
                  alt="{c.client} — {c.title}"
                />
              </span></span>
            {/if}
            {#if c.video}<span class="wm-reel" aria-hidden="true">REEL</span>{/if}
            <span class="wm-cap">
              <span class="wm-rank">{n2(i)}</span>
              <h3>{c.client}</h3>
              <span class="wm-rev">
                <p>{c.title}</p>
                <span class="wm-meta">
                  <span>{c.scope.slice(0, 2).join(' · ')}</span>
                  <span class="wm-market">{c.country}</span>
                  <span>{c.year}</span>
                </span>
              </span>
            </span>
            <span class="wm-seal" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H9M17 7v8" /></svg>
            </span>
          </button>
        {/each}
      </div>
    {/key}
    <!-- "The board re-ranks itself while you watch" used to lead this line.
         It described the ambient re-tile, which was deleted on 11 Aug 2026
         — so it became a claim the page no longer keeps. What is left is
         true on every width: every card opens onto real hardware. -->
    <p class="wmosaic-note">
      <span>Open any card to see the site running on a <b>real MacBook and iPhone</b></span>
    </p>
  </div>

  {#if openSlug}
    {@const c = CASES[idx]}
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Case study: {c.client}">
      <div
        bind:this={panelEl}
        class="overlay-panel {isMobile ? 'is-sheet' : ''}"
        style={isMobile ? `transform:translateY(${sheetY}px);transition:${sheetAnimating ? 'transform 0.4s cubic-bezier(.32,.72,0,1)' : 'none'}` : undefined}
      >
        {#if isMobile}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="sheet-handle-wrap" onpointerdown={sheetPointerDown} onpointermove={sheetPointerMove} onpointerup={sheetPointerUp(requestCloseOverlay)} onpointercancel={sheetPointerUp(requestCloseOverlay)}>
            <span class="sheet-handle" aria-hidden="true"></span>
          </div>
        {/if}
        <header class="overlay-bar">
          <span class="overlay-brand">LOOM — Case study</span>
          <div class="overlay-nav">
            <button onclick={prevCase} aria-label="Previous case">←</button>
            <button onclick={nextCase} aria-label="Next case">→</button>
            <button bind:this={closeBtnEl} class="overlay-close" onclick={requestCloseOverlay} aria-label="Close case study">✕</button>
          </div>
        </header>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="overlay-scroll"
          bind:this={sheetScrollEl}
          onpointerdown={isMobile ? sheetScrollPointerDown : undefined}
          onpointermove={isMobile ? (e) => sheetScrollPointerMove(e, requestCloseOverlay) : undefined}
          onpointerup={isMobile ? sheetScrollPointerUp(requestCloseOverlay) : undefined}
          onpointercancel={isMobile ? sheetScrollPointerUp(requestCloseOverlay) : undefined}
        >
          <!-- keyed fade bridges prev/next case switches (content used to
               teleport) -->
          {#key c.slug}
            <div>
            <div class="overlay-head">
              <p class="overlay-scope">{c.scope.join(' · ')}</p>
              <h2>{c.client}</h2>
              <p class="overlay-title">{c.title}</p>
              <div class="overlay-facts">
                <span><em>Market</em>{c.country}</span>
                <span><em>Year</em>{c.year}</span>
                <span><em>Studio</em>LOOM</span>
              </div>
              <p class="overlay-copy">{c.copy}</p>
            </div>
            <!-- The full-size device pair. Every case gets shown on real
                 hardware — when `devices` is missing, both panes fall back
                 to the same cover shot the tile uses, so a case with one
                 production still reads as "responsive". -->
            <div class="overlay-devices">
              <DeviceShowcase
                desktop={c.devices?.desktop || `/img/cases/${c.slug}/screen-desktop.webp`}
                mobile={c.devices?.mobile || `/img/cases/${c.slug}/screen-mobile.webp`}
                fallback={c.cover}
                alt="{c.client} — {c.title}"
              />
            </div>
            <div class="overlay-gallery">
              {#if c.video}
                <figure class="overlay-board overlay-video">
                  <video src={c.video} poster={c.cover} autoplay muted loop playsinline controls></video>
                  <figcaption>Production reel — {c.client}</figcaption>
                </figure>
              {/if}
              {#each c.feature as src, i (src)}
                <!-- Not lazy. The gallery is the only thing that makes this
                     panel taller than its scroll box, and a lazy image has
                     no height until it loads — so it never entered view,
                     never loaded, and the overlay could not be scrolled at
                     all. -->
                <figure>
                  <img src={src} alt="{c.client} — feature visual {i + 1}" decoding="async" use:imgFade onload={onImgLoad} />
                </figure>
              {/each}
              {#each c.boards as src, i (src)}
                <figure class="overlay-board">
                  <img src={src} alt="{c.client} — case board {i + 1}" decoding="async" use:imgFade onload={onImgLoad} />
                </figure>
              {/each}
            </div>
            <footer class="overlay-foot">
              <WoolButton label="Next case" onclick={nextCase} />
            </footer>
            </div>
          {/key}
        </div>
      </div>
      <button class="overlay-backdrop" onclick={requestCloseOverlay} aria-label="Close" tabindex="-1"></button>
    </div>
  {/if}
</section>
