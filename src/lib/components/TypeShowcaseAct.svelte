<!--
  The pinned scroll sequence for #typeface — three screens pinned to one
  viewport: the word flies together letter by letter, then blooms through all
  the planted cuts while a petal field drifts behind it, then hands over the
  copy and the CTAs.

  Ported from TypeShowcase.jsx's internal `Act` component. Framer's
  useScroll/useTransform (a MotionValue graph that keeps its own subscriber
  list) has no faithful one-line Svelte equivalent, so this rewrites the whole
  graph as ONE reactive scroll progress `p` (a plain $state number, updated by
  a scroll listener throttled to one rAF write per frame — never a spring on
  the main thread, per PORTING.md rule 2) plus a small `interp()` helper that
  does what `useTransform(p, inputRange, outputRange)` did: piecewise-linear
  interpolation, clamped at both ends, unit-aware so it can return `"12.4vw"`
  as easily as a bare number.

  TypeShowcase.svelte wraps an instance of this in `{#key layout+breakpoint}`
  — see its own comment for why: with `p` and the render below both freshly
  re-derived from `layout`/`narrow` on every change already, the port does not
  actually NEED the remount for correctness the way framer's useTransform did
  (a MotionValue handed new ranges mid-life keeps the old ones; a plain
  reactive expression here just recomputes). It is kept anyway because it is
  also what resets this component's own local state — `p`, the per-cut
  `armed` flags, the `live` rail index, the petal field — to a clean slate on
  a breakpoint change, exactly like a fresh mount.
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { reducedMotion, nearViewport, magnetic } from '$lib/motion.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import { LAYOUT_MOTION } from './bloomLayouts.js'

  let { layout, narrow } = $props()

  const WORD = 'BLOOM'

  // Home-page use only ever sets the literal word "BLOOM" (plus, for Rose, the
  // drifting cut-name band below) in these faces, so each points at the glyph
  // SUBSET built for that — 10-70 KB instead of 110-337 KB. /type still
  // imports its own CUTS with the full family names; nothing there reads this
  // array.
  const CUTS = [
    { id: 'regular', label: 'Regular', family: 'LOOM Bloom', note: 'the face itself' },
    { id: 'rose', label: 'Rose', family: 'LOOM Bloom Rose Home', note: 'a millefleur of spiral roses' },
    { id: 'daisy', label: 'Daisy', family: 'LOOM Bloom Daisy Home', note: 'packed open daisies' },
    { id: 'tulip', label: 'Tulip', family: 'LOOM Bloom Tulip Home', note: 'three-lobed tulip cups' },
    { id: 'ivy', label: 'Ivy', family: 'LOOM Bloom Ivy Home', note: 'a Morris vine, no bloom' },
    { id: 'wild', label: 'Wild', family: 'LOOM Bloom Wild Home', note: 'six species, overhanging' },
    { id: 'hollow', label: 'Hollow', family: 'LOOM Bloom Hollow Home', note: 'the letter as an outline' },
    { id: 'meadow', label: 'Meadow', family: 'LOOM Bloom Meadow Home', note: 'flowers up from the baseline' },
  ]

  // The planted cuts share the scroll between them, so this file never
  // hard-codes how many there are — adding a cut to CUTS above re-times the
  // whole sequence.
  const PLANTED = CUTS.length - 1
  // The whole sequence must FINISH before act three starts (the earliest
  // layout beat is 0.68) — otherwise the last cuts bloom while the word has
  // already shrunk into the wall of type behind the copy, and they are never
  // really seen as the word. At five cuts 0.80 was fine; at seven it hid
  // three of them.
  const BLOOM_FROM = 0.24
  const BLOOM_TO = 0.64
  const BLOOM_STEP = (BLOOM_TO - BLOOM_FROM) / Math.max(1, PLANTED - 1)
  // A planted cut is 108-338 KB, and all seven layers are mounted at once —
  // so naming the family unconditionally would make the browser fetch 1.5 MB
  // of display type the moment the section is armed, for six faces the reader
  // cannot see yet. Each layer therefore claims its own font only once the
  // scroll is within ARM_LEAD of its slice: one cut's worth arrives just
  // ahead of the bloom that needs it, and a reader who never reaches
  // #typeface pays for none of them. `armed[n]` never flips back — scrolling
  // up must not drop a face that is already painted.
  const ARM_LEAD = BLOOM_STEP * 1.5

  const STATS = [['8', 'cuts'], ['98', 'glyphs each'], ['0', 'licences bought']]

  // deterministic scatter — the same letters land the same way on every visit
  const SCATTER = [
    { x: -46, y: -120, r: -14 }, { x: 34, y: 140, r: 11 }, { x: -22, y: -170, r: 7 },
    { x: 40, y: 120, r: -9 }, { x: -30, y: -140, r: 13 },
  ]

  // ── the scroll-progress graph ─────────────────────────────────────────────
  // num()/unit() split a range endpoint like '29vw' into 29 and 'vw'; interp()
  // is the piecewise-linear, clamped-at-the-ends stand-in for
  // useTransform(p, inputRange, outputRange) — inputRange/outputRange can
  // have more than two points (the kicker and each bloom fade through four),
  // and an outputRange element can be a plain number or a unit-suffixed
  // string; the unit rides along on the interpolated result either way.
  function num(x) { return typeof x === 'number' ? x : parseFloat(x) }
  function unitOf(x) { const m = typeof x === 'string' ? x.match(/[a-z%]+$/i) : null; return m ? m[0] : '' }
  function interp(v, inR, outR) {
    const n = inR.length
    let i
    if (v <= inR[0]) i = 0
    else if (v >= inR[n - 1]) i = n - 2
    else { i = 0; for (let k = 0; k < n - 1; k++) { if (v >= inR[k] && v <= inR[k + 1]) { i = k; break } } }
    const span = inR[i + 1] - inR[i]
    const t = span ? Math.min(1, Math.max(0, (v - inR[i]) / span)) : (v >= inR[i + 1] ? 1 : 0)
    const a = outR[i], b = outR[i + 1]
    const u = unitOf(a) || unitOf(b)
    const val = num(a) + (num(b) - num(a)) * t
    return u ? `${val}${u}` : val
  }

  let wrapEl = $state(null)
  let p = $state(0)

  $effect(() => {
    if (!browser || !wrapEl) return
    let raf = null
    const compute = () => {
      raf = null
      const rect = wrapEl.getBoundingClientRect()
      const total = wrapEl.offsetHeight - window.innerHeight
      p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(compute) }
    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf != null) cancelAnimationFrame(raf)
    }
  })

  // ── the two font-loading gates ────────────────────────────────────────────
  // `near` pre-warms cheap things at an 800px lead. On a 390px phone the whole
  // page stacks and #typeface lands ~1000px down — inside 800px + a 664px
  // viewport — so it fires at scrollY 0. The plain Regular cut is 7 KB and can
  // stay on `near`; anything planted waits for `onScreen` (0px lead, i.e.
  // actually on screen) instead.
  let near = $state(false)
  let onScreen = $state(false)
  function armNear(node) { return nearViewport(node, { margin: '800px', onNear: () => { near = true } }) }
  function armOnScreen(node) { return nearViewport(node, { margin: '0px', onNear: () => { onScreen = true } }) }

  const M = $derived(LAYOUT_MOTION[layout][narrow ? 'm' : 'd'])

  // act one — the word assembles
  const kickerO = $derived(interp(p, [0, 0.05, 0.72, 0.8], [0, 1, 1, 0]))
  const plainO = $derived(interp(p, [0.26, 0.34], [1, 0]))

  // act three — the word steps back, the copy arrives. Every range comes from
  // the active layout's numbers; the shape of the graph never changes, only
  // the destinations, which is what keeps the layout switchable live.
  const b0 = $derived(M.beat[0])
  const b1 = $derived(M.beat[1])
  const wordScale = $derived(interp(p, [b0, b1], M.wordScale))
  const wordY = $derived(interp(p, [b0, b1], M.wordY))
  const wordX = $derived(interp(p, [b0, b1], M.wordX))
  const wordO = $derived(interp(p, [b0, b1], M.wordFade))
  const wordBlurPx = $derived(interp(p, [b0, b1], M.wordBlur))
  const wordFilter = $derived(M.wordBlur[1] ? `blur(${wordBlurPx}px)` : null)
  const copyO = $derived(interp(p, [b0 + 0.06, b1 - 0.04], [0, 1]))
  const copyY = $derived(interp(p, [b0 + 0.06, b1], [M.copyFrom.y, 0]))
  const copyX = $derived(interp(p, [b0 + 0.06, b1], [M.copyFrom.x, 0]))
  const bandX = $derived(interp(p, [0, 1], ['4%', '-22%']))
  const band2X = $derived(interp(p, [0, 1], ['-18%', '8%']))

  const wordShiftStyle = $derived(
    `transform: translate(${wordX}, ${wordY}); opacity: ${wordO};` + (wordFilter ? ` filter: ${wordFilter};` : '')
  )

  // Svelte will not let a `style:` directive share an element with a plain
  // `style` attribute, and several of these bands/layers need a conditional
  // font-family alongside a computed transform — so each gets ONE assembled
  // style string instead, the same shape as `wordShiftStyle` above.
  const bandStyle = $derived(
    `transform: translateX(${reducedMotion.current ? '0px' : bandX});` +
      (near ? ` font-family: 'LOOM Bloom';` : '')
  )
  const band2Style = $derived(
    `transform: translateX(${reducedMotion.current ? '0px' : band2X});` +
      (onScreen ? ` font-family: 'LOOM Bloom Rose Home';` : '')
  )

  // which planted cut is on top right now — drives the rail's lit row
  const live = $derived(
    p < BLOOM_FROM ? 0 : Math.min(PLANTED, 1 + Math.floor((p - BLOOM_FROM) / BLOOM_STEP))
  )

  // the flying-in plain letters
  const letters = $derived(WORD.split('').map((ch, i) => {
    const s = SCATTER[i % SCATTER.length]
    const end = 0.06 + i * 0.026
    const range = [Math.max(0, end - 0.16), end]
    const r = reducedMotion.current ? 0 : 1
    return {
      ch, i,
      x: interp(p, range, [s.x * r, 0]),
      y: interp(p, range, [s.y * r, 0]),
      rot: interp(p, range, [s.r * r, 0]),
      op: interp(p, range, [0, 1]),
    }
  }))

  // the seven planted-cut layers, each blooming over its own slice
  let armed = $state(Array(PLANTED).fill(false))
  $effect(() => {
    if (!browser) return
    const v = p
    for (let n = 0; n < PLANTED; n++) {
      const a = BLOOM_FROM + n * BLOOM_STEP
      if (!armed[n] && v >= a - ARM_LEAD) armed[n] = true
    }
  })
  const blooms = $derived(CUTS.slice(1).map((c, n) => {
    const a = BLOOM_FROM + n * BLOOM_STEP
    const last = n === PLANTED - 1
    const opacity = interp(
      p,
      [a, a + BLOOM_STEP * 0.64, a + BLOOM_STEP, a + BLOOM_STEP * 1.64],
      last ? [0, 1, 1, 1] : [0, 1, 1, 0],
    )
    const scale = interp(p, [a, a + BLOOM_STEP * 0.82], [1.06, 1])
    const isArmed = armed[n]
    return {
      id: c.id,
      style: `opacity: ${opacity}; transform: scale(${scale});` + (isArmed ? ` font-family: '${c.family}';` : ''),
    }
  }))

  // ── the drifting petal field — canvas, not DOM ────────────────────────────
  let canvasEl = $state(null)
  $effect(() => {
    if (!browser) return
    const active = near
    const reduced = reducedMotion.current
    const cv = canvasEl
    if (!cv || reduced) return
    const ctx = cv.getContext('2d')
    let raf, w = 0, h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const glyphs = ['❀', '✿', '❦']
    // seeded so the field is identical every mount — no layout lottery
    let seed = 7
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const bits = Array.from({ length: 46 }, () => ({
      x: rnd(), y: rnd(), s: 16 + rnd() * 52, v: 0.12 + rnd() * 0.5,
      g: glyphs[Math.floor(rnd() * 3)], a: 0.05 + rnd() * 0.12, rot: rnd() * Math.PI * 2,
      spin: (rnd() - 0.5) * 0.004,
    }))
    const size = () => {
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = w * dpr; cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    window.addEventListener('resize', size)
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const b of bits) {
        b.y -= b.v / h
        b.rot += b.spin
        if (b.y < -0.12) { b.y = 1.12; b.x = rnd() }
        ctx.save()
        ctx.translate(b.x * w, b.y * h)
        ctx.rotate(b.rot)
        ctx.globalAlpha = b.a
        ctx.fillStyle = '#f21c8c'
        ctx.font = `${b.s}px "LOOM Bloom", sans-serif`
        ctx.fillText(b.g, 0, 0)
        ctx.restore()
      }
      raf = requestAnimationFrame(draw)
    }
    if (active) raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  })

  function commissionType() {
    wizard.open({ intent: 'brand', note: 'I want a custom typeface / lettering system.' })
  }
</script>

<section class="ts ts--{layout}" id="typeface" bind:this={wrapEl} use:armNear use:armOnScreen>
  <div class="ts-sticky">
    <canvas bind:this={canvasEl} class="ts-petals" aria-hidden="true"></canvas>

    <!-- two bands of alphabet drifting opposite ways -->
    <div class="ts-bands" aria-hidden="true">
      <div class="ts-band" style={bandStyle}>ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</div>
      <div class="ts-band ts-band--low" style={band2Style}>ROSE ✿ DAISY ❀ TULIP ❦ IVY ✿ ROSE ❀ DAISY</div>
    </div>

    <p class="ts-kicker" style:opacity={kickerO}>
      <span>◆</span> Our own typeface — eight cuts, free
    </p>

    <!-- the word: one animated plain layer, seven planted layers blooming
         through. Three nested boxes, one job each: the anchor CENTRES the
         word (pure CSS, so no scroll value has to spend itself on centring),
         the shift TRAVELS it in viewport units, the word SCALES. Splitting
         travel from scale is what lets a layout say "30vh down" and mean it —
         a single element would have to express that as a percentage of its
         own clamp()ed line box, which changes with the width. -->
    <div class="ts-word-anchor">
      <div class="ts-word-shift" style={wordShiftStyle}>
        <div class="ts-word" style="transform: scale({wordScale});">
          <div class="ts-layer ts-layer--plain" style:opacity={plainO} style:font-family={near ? 'LOOM Bloom' : undefined}>
            {#each letters as l (l.ch + l.i)}
              <span class="ts-ltr" style="transform: translate({l.x}px, {l.y}px) rotate({l.rot}deg); opacity: {l.op};">{l.ch}</span>
            {/each}
          </div>
          {#each blooms as b (b.id)}
            <div class="ts-layer ts-layer--cut" style={b.style}>{WORD}</div>
          {/each}
        </div>
      </div>
    </div>

    <!-- the rail of cut names, lighting up as each one blooms -->
    <div class="ts-rail" aria-hidden="true">
      {#each CUTS as c, n (c.id)}
        <span class="ts-rail-item {n === live ? 'is-live' : ''}"><i></i> {c.label}</span>
      {/each}
    </div>

    <!-- the slot PLACES (it is what each layout repositions), the block
         inside MOVES — so a layout can park the copy anywhere with plain CSS
         without fighting the scroll transform. -->
    <div class="ts-copy-slot">
      <div class="ts-copy" style="opacity: {copyO}; transform: translate({copyX}px, {copyY}px);">
        <h2 class="ts-h2">We didn't license a font. We drew one.</h2>
        <p class="ts-lede">
          A condensed display face in eight cuts — one plain, seven with a
          garden cut out of every letter.
          <span class="ts-lede-more">
            Every outline was generated in our own pipeline: no foundry, no
            licence, no subscription.
          </span>
          Free to download, and the shortest answer we have to <em>“can you make…?”</em>
        </p>
        <div class="ts-stats">
          {#each STATS as [n, l] (l)}
            <div class="ts-stat">
              <span class="ts-stat-n" style:font-family={near ? 'LOOM Bloom' : undefined}>{n}</span>
              <span class="ts-stat-l">{l}</span>
            </div>
          {/each}
        </div>
        <div class="ts-cta">
          <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
            <a class="ts-btn ts-btn--fill" href="/type">
              Open the specimen<span aria-hidden="true">→</span>
            </a>
          </div>
          <button type="button" class="ts-btn" onclick={commissionType}>Commission your own</button>
        </div>
      </div>
    </div>
  </div>
</section>
