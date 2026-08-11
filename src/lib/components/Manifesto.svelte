<!--
  Manifesto headline: each word rises, flips up off its own baseline and
  ignites through the brand magenta on its way from unlit grey to white as the
  reader scrolls through the section — thread pulling taut through cloth, not
  a once-on-enter reveal. Driven by the SAME section scroll progress the media
  reaction uses, just windowed to the entrance so it resolves before the
  reader is even halfway down.

  SSR CONTRACT — this is not `use:reveal`, it is a continuous scroll-driven
  effect, so it gets its own version of the same rule: the server markup (and
  anything with scripting off) renders the words in their FINISHED state —
  real ink colour, full opacity, no transform — because that is what
  `sections-stage.css`'s bare `.ink-word` rule paints with no inline style at
  all. On the client, if the section is still below the fold at hydration
  (armReveal's own gate, applied here by hand: rect.top past 92% of the
  viewport), it is pushed back to its unlit ghost pose and driven forward by
  actual scroll position from then on — never a spring, never a rAF tied to
  anything but the real scrollY. An element already on screen at hydration is
  left at its finished pose rather than being yanked back to grey, same
  reasoning `reveal()` uses for a flash-vs-reveal call.

  The words stay real, wrappable text. Each <span> is inline-block (a
  transform needs that) but the separating spaces are ordinary text nodes
  BETWEEN the spans, not characters inside them: whitespace at the end of an
  inline-block is stripped as end-of-line whitespace, which is why a no-break
  space smuggled inside each word was the old workaround — and a no-break
  space is exactly what stops a long headline wrapping on a phone. A plain
  space text node between two inline-blocks is a real break opportunity, so
  the line wraps normally at every width. The h2 keeps the full sentence in
  aria-label and every span is aria-hidden, so assistive tech still reads one
  clean sentence.
-->
<script>
  import { onMount } from 'svelte'
  import { cubicOut } from 'svelte/easing'
  import { reducedMotion, reveal } from '$lib/motion.svelte.js'
  import './sections-stage.css'

  const MANIFESTO_TEXT = 'Trends don’t lead our work. Thinking does.'
  const words = MANIFESTO_TEXT.split(' ')
  const n = words.length

  /** Per-word scroll windows for the headline.
   *
   *  A strictly linear i/n stagger reads as a queue: seven identical beats one
   *  metronome tick apart. The sine term below front-loads the line (the gaps
   *  between successive words start wide and then close up), so the reveal
   *  reads as a crest rolling along the sentence and settling on the last
   *  word, which is where the meaning is. Windows are 0.34 long against a
   *  0.66 span of starts, so about four words are in flight at any moment: a
   *  wave with a body, not a row of separate pop-ins.
   *
   *  The last word finishes at 0.61 + 0.34 = 0.95 of the ink window, which
   *  lands well inside the section: nobody is ever parked on a half-grey
   *  headline. */
  function inkRanges(count) {
    return Array.from({ length: count }, (_, i) => {
      const base = count === 1 ? 0 : i / (count - 1)
      const start = Math.max(0, Math.min(0.66, base * 0.66 + Math.sin(base * Math.PI * 1.5) * 0.05))
      return [start, Math.min(1, start + 0.34)]
    })
  }
  const ranges = inkRanges(n)

  function lerp(a, b, t) { return a + (b - a) * t }
  function clamp01(t) { return Math.min(1, Math.max(0, t)) }
  function stopLerp(t, xs, ys) {
    if (t <= xs[0]) return ys[0]
    for (let i = 1; i < xs.length; i++) {
      if (t <= xs[i]) return lerp(ys[i - 1], ys[i], (t - xs[i - 1]) / (xs[i] - xs[i - 1]))
    }
    return ys[ys.length - 1]
  }
  const hx = (v) => Math.round(v).toString(16).padStart(2, '0')
  function stopLerpColor(t, xs, colors) {
    if (t <= xs[0]) return colors[0]
    for (let i = 1; i < xs.length; i++) {
      if (t <= xs[i]) {
        const lt = (t - xs[i - 1]) / (xs[i] - xs[i - 1])
        const a = colors[i - 1], b = colors[i]
        const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16)
        const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16)
        return `#${hx(lerp(ar, br, lt))}${hx(lerp(ag, bg, lt))}${hx(lerp(ab, bb, lt))}`
      }
    }
    return colors[colors.length - 1]
  }

  let sectionEl = $state(null)
  let mediaEl = $state(null)
  let ruleFillEl = $state(null)
  let ruleHeadEl = $state(null)
  const wordNodes = []
  // Svelte action: collects each word span into `wordNodes` by index, keeping
  // the DOM refs out of reactive state — this loop runs every scroll frame
  // and must never trigger a Svelte re-render on its own.
  function registerWord(node, i) {
    wordNodes[i] = node
    return { destroy() { if (wordNodes[i] === node) wordNodes[i] = null } }
  }

  onMount(() => {
    if (reducedMotion.current || !sectionEl) return
    // Same gate `reveal()` uses: already on screen at hydration -> leave the
    // SSR-finished pose alone. Below the fold -> allowed to visibly progress.
    const initialRect = sectionEl.getBoundingClientRect()
    if (initialRect.top < window.innerHeight * 0.92) return

    let raf = null
    const update = () => {
      raf = null
      const rect = sectionEl.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // offset ['start end', 'end start']: 0 while the section's top is at the
      // viewport's bottom, 1 once its bottom reaches the viewport's top.
      const progress = clamp01((vh - rect.top) / (vh + rect.height))
      // The ink window: everything below happens between 5% and 42% of the
      // section's travel, i.e. while it is entering and coming to rest in the
      // middle of the viewport — resolved well before a reader has it fully
      // on screen.
      const inkProgress = clamp01((progress - 0.05) / (0.42 - 0.05))

      for (let i = 0; i < n; i++) {
        const node = wordNodes[i]
        if (!node) continue
        const [s, e] = ranges[i]
        const t = cubicOut(clamp01((inkProgress - s) / (e - s)))
        // Pale cloth -> magenta ignition -> deep magenta -> ink. THE RAMP MUST
        // END ON THE INK, NOT ON WHITE — see the React comment this carries
        // forward: on the pink ground, "unlit cloth" is a tint of the ink,
        // not a mid grey, and a ramp ending lighter than the page fades the
        // headline to invisible exactly as it lands.
        node.style.color = stopLerpColor(t, [0, 0.38, 0.7, 1], ['#a896b4', '#f21c8c', '#b3126a', '#33243d'])
        // Never starts at 0: an unlit ghost of the sentence is always
        // present, so the headline reads as ink filling existing cloth, not
        // as missing text.
        node.style.opacity = String(stopLerp(t, [0, 0.3, 1], [0.14, 0.9, 1]))
        node.style.transform =
          `translateY(${lerp(52, 0, t).toFixed(2)}%) rotateX(${lerp(-74, 0, t).toFixed(2)}deg) scale(${lerp(0.93, 1, t).toFixed(3)})`
      }

      // The rule draws itself only once the first words have landed, and a
      // spark head runs at the front of the fill and burns out as it reaches
      // the end: a line being drawn, not a progress bar filling.
      const ruleT = clamp01((inkProgress - 0.22) / (1 - 0.22))
      if (ruleFillEl) ruleFillEl.style.transform = `scaleX(${ruleT.toFixed(3)})`
      if (ruleHeadEl) {
        ruleHeadEl.style.transform = `translateX(${lerp(-100, 0, ruleT).toFixed(2)}%)`
        ruleHeadEl.style.opacity = String(stopLerp(inkProgress, [0.2, 0.34, 0.9, 1], [0, 1, 1, 0]))
      }

      // The laptop answers the same progress: a slow parallax across the
      // whole section, plus a tilt/scale that resolves on the headline's own
      // beat, so the column and the image read as one move rather than two
      // unrelated ones.
      if (mediaEl) {
        const mediaY = lerp(7, -7, progress)
        const mediaScale = lerp(0.9, 1, inkProgress)
        const mediaRotateY = lerp(12, 0, inkProgress)
        const mediaRotateX = lerp(7, 0, inkProgress)
        mediaEl.style.transform =
          `translateY(${mediaY.toFixed(2)}%) scale(${mediaScale.toFixed(3)}) rotateY(${mediaRotateY.toFixed(2)}deg) rotateX(${mediaRotateX.toFixed(2)}deg)`
        mediaEl.style.opacity = String(stopLerp(inkProgress, [0, 0.5], [0.25, 1]))
      }
    }

    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  })
</script>

<section class="manifesto" bind:this={sectionEl}>
  <div class="manifesto-grid">
    <div class="manifesto-copy">
      <p class="kicker"><span>—</span> Manifesto</p>
      <h2 class="h2 manifesto-ink" aria-label={MANIFESTO_TEXT}>
        {#each words as w, i}
          <span class="ink-word" aria-hidden="true" use:registerWord={i} style="transform-perspective: 620px">{w}</span
          >{i < n - 1 ? ' ' : ''}
        {/each}
      </h2>
      <span class="manifesto-ink-rule" aria-hidden="true">
        <span class="manifesto-ink-fill" bind:this={ruleFillEl}></span>
        <span class="manifesto-ink-head" bind:this={ruleHeadEl} style="opacity: 0"></span>
      </span>
      <p class="lede" style="margin-top: 18px" use:reveal={{ delay: 0.15 }}>
        LOOM is two studios threaded through one machine — Amman for the engine, Sarajevo for
        the eye. We build brands the way looms build cloth: one decision at a time, under
        tension, until it holds.
      </p>
      <p class="body-dim" use:reveal={{ delay: 0.25 }}>
        Creativity doesn’t live in comfort zones. It lives on the edge — where emotion meets
        logic, aesthetics meet performance, and every idea is backed by working technology.
      </p>
    </div>
    <div class="manifesto-media" bind:this={mediaEl}>
      <!-- 1700x1275 — at 8.27 MB of decoded bitmap this is the single largest
           resident image on the long page, and `.manifesto-laptop` paints it
           at 150% of its column: 420px on a 390px phone, 655px at 1440. The
           phone cut is 900px, 2.1x that box.

           `media`, not a `w` descriptor: at DPR 3 a 420px box asks for 1260px
           and any srcset would skip a 900px cut and take the 1700px original
           — which is precisely the phone that cannot afford it. `display:
           contents` keeps the <picture> out of layout, since the img is a
           grid/flex child of `.manifesto-media` and carries its own `width:
           150%`. -->
      <picture style="display: contents">
        <source media="(max-width: 767px)" type="image/avif" srcset="/img/manifesto/laptop-mascot-cutout-sm.avif" />
        <source media="(max-width: 767px)" type="image/webp" srcset="/img/manifesto/laptop-mascot-cutout-sm.webp" />
        <source type="image/avif" srcset="/img/manifesto/laptop-mascot-cutout.avif" />
        <img
          class="manifesto-laptop"
          src="/img/manifesto/laptop-mascot-cutout.webp"
          alt="The LOOM website on a laptop, with the studio's yarn-ball mascot climbing out of the screen"
          loading="lazy"
        />
      </picture>
      <p class="manifesto-caption">The edge is intentional.</p>
    </div>
  </div>
</section>
