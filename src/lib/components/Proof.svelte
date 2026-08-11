<!--
  ————————————————————————————————————————————————————————
  PROOF — slot 3, and the section that has to survive a sceptic.

  Merges what used to be two sections: a client-name marquee sliding the most
  valuable words on the page past at a speed nobody reads them at, and a
  four-column Stats stat rail with no claim attached to any of its numbers.
  REDESIGNED 10 Aug 2026, for the four faults the client named across the
  page:

    Weak hierarchy — head, then wall, then a four-column stat rail: three
                     stacked blocks of equal weight, so nothing led. The
                     headline says "these names already said yes" and then
                     the eye landed on a row of numbers.
    Templated      — a four-across stat rail is the same shape as every other
                     four-across row on the page.
    Too tall       — three full-width bands stacked is the tallest possible
                     arrangement of this much content.
    Flat           — a weave photograph at 0.16 opacity behind flat type.

  NOW: one split. The names take the left and stay the hero — they are what
  the headline points at — and the four numbers become a narrow right-hand
  rail read as a column, not a row. Side by side instead of stacked is most of
  the height saving; the rest is that the rail no longer needs its own
  full-width band of air above and below it.

  THE THREE ANCHORS. Benetton, UNICEF and Vodafone are set brighter than the
  other sixteen. Not favouritism — they are the three names a stranger in
  Amman or Sarajevo already knows, and a wall where every name is equally
  bright is a wall where none of them lands. The rest are not dimmed to hide
  them; they are the volume, and volume is a different argument from
  recognition.

  NOTHING HERE IS A NEW CLAIM — every value still comes from STATS and
  CLIENT_WALL in $data/site.js, so the "verify every number" rule has exactly
  one place to check, as before.
  ————————————————————————————————————————————————————————
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { CLIENT_WALL, STATS } from '$data/site.js'
  import { EASE, reducedMotion, reveal, prefersReduced } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import CountUp from './CountUp.svelte'
  import './proof.css'

  // The clause each number was missing. STATS carries the value and the
  // label; this carries the "so what". Keyed by label so a reordered STATS
  // cannot silently pair a number with the wrong sentence — an index would.
  const STAT_CLAUSE = {
    'Brands woven': 'Identity, content, product — not one campaign each.',
    'Countries shipped to': 'Jordan to Bosnia to the Gulf, in two languages.',
    'Apps & tools in the lab': 'Built for ourselves first, then for clients.',
    'Studios — Amman × Sarajevo': 'When one sleeps, the other is already sewing.',
  }

  const ANCHORS = new Set(['United Colors of Benetton', 'UNICEF', 'Vodafone'])
  const STAT_YARN = ['var(--magenta)', 'var(--yarn-blue)', 'var(--yarn-violet)', 'var(--yarn-gold)']

  // The wall is 18 names long. A flat 30ms-per-name step (the old value) put
  // the last name landing 540ms after the first before it had even started
  // its own transition — clamp the SPREAD across the whole wall instead of
  // the per-name step, same fix as SplitWords' headline stagger.
  const WALL_DURATION = 0.3
  const WALL_STEP_CEILING = 0.03
  const WALL_SPREAD_CEILING = 0.25
  const wallStep = CLIENT_WALL.length > 1
    ? Math.min(WALL_STEP_CEILING, WALL_SPREAD_CEILING / (CLIENT_WALL.length - 1))
    : 0

  let sectionEl = $state(null)
  let bgEl = $state(null)
  let wallEl = $state(null)

  // A slow counter-drift on the backdrop only — the weave photograph the old
  // Stats section already carried, kept because it is the one texture on the
  // page that reads as actual cloth. One passive rAF-throttled scroll
  // listener writing a transform straight to the DOM, same idiom as Hero's
  // and Manifesto's own scroll reactions — never a spring, never routed
  // through a second scroll-linked value system.
  onMount(() => {
    if (!browser || reducedMotion.current || !sectionEl) return
    let raf = null
    const update = () => {
      raf = null
      if (!bgEl) return
      const rect = sectionEl.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // offset ['start end', 'end start']
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)))
      bgEl.style.transform = `translateY(${(-8 + progress * 16).toFixed(2)}%)`
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  })

  // THE WALL's entrance: once-only, staggered per name, gated on the wall
  // itself entering view rather than `use:reveal` per name — the React
  // version used one shared `useInView` flag driving every name's
  // initial/animate pair together, and matching that shared gate (instead of
  // 20 independent IntersectionObservers) is what keeps the stagger reading
  // as one wall arriving rather than 20 unrelated reveals racing each other.
  let wallIn = $state(false)
  onMount(() => {
    if (!browser || !wallEl) return
    // Direct matchMedia check too, not just the rune — see motion.svelte.js's
    // `prefersReduced()` comment for why the rune alone can lag this early.
    if (reducedMotion.current || prefersReduced()) { wallIn = true; return }
    // Same gate `reveal()` uses: already on screen at hydration -> render
    // finished immediately rather than flashing the wall in.
    if (wallEl.getBoundingClientRect().top < window.innerHeight * 0.92) { wallIn = true; return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { wallIn = true; io.disconnect() }
    }, { rootMargin: '-18% 0px' })
    io.observe(wallEl)
    return () => io.disconnect()
  })
</script>

<section class="proof" id="proof" aria-label="Clients and studio in numbers" bind:this={sectionEl}>
  <div class="proof-bg" bind:this={bgEl} aria-hidden="true">
    <picture style="display: contents">
      <source media="(max-width: 767px)" type="image/avif" srcset="/img/weave-alt-sm.avif" />
      <source media="(max-width: 767px)" type="image/webp" srcset="/img/weave-alt-sm.webp" />
      <source type="image/avif" srcset="/img/weave-alt.avif" />
      <img src="/img/weave-alt.webp" alt="" width="1400" height="782" loading="lazy" decoding="async" />
    </picture>
  </div>

  <div class="proof-head">
    <p class="kicker"><span>—</span> Proof</p>
    <SplitWords as="h2" class="h2 proof-h2" text="These names already said yes." />
  </div>

  <!-- ——— THE SPLIT ———
      Names left (the hero — the headline points at them), numbers right
      (the summary). Two columns instead of three stacked bands. -->
  <div class="proof-split">
    <!-- THE WALL. Real, wrappable, selectable text set as one block — not a
        marquee track, not a logo grid. Nobody has the logos cleared for use
        and a wall of mismatched PNGs would look worse than the words do; the
        names in the studio's own display face read as a colophon, which is
        the honest form for "here is who we have worked with". -->
    <div class="proof-wall" bind:this={wallEl}>
      {#each CLIENT_WALL as name, i (name)}
        <span
          class="proof-name{ANCHORS.has(name) ? ' is-anchor' : ''}"
          style:opacity={reducedMotion.current ? 1 : wallIn ? 1 : 0}
          style:transform={reducedMotion.current ? 'none' : wallIn ? 'none' : 'translateY(12px)'}
          style:transition={reducedMotion.current
            ? 'none'
            : `opacity ${WALL_DURATION}s ${EASE} ${i * wallStep}s, transform ${WALL_DURATION}s ${EASE} ${i * wallStep}s`}
        >
          {name}
          {#if i < CLIENT_WALL.length - 1}<i class="proof-sep" aria-hidden="true">✳</i>{/if}
        </span>
      {/each}
    </div>

    <!-- THE RAIL. The same four numbers, read as a column. Each keeps the
        clause that turns it from a fact into a claim, and its own yarn stub —
        the whole chrome budget, replacing the old divider cross. -->
    <div class="proof-rail">
      {#each STATS as s, i (s.label)}
        <div class="proof-stat" style="--yarn: {STAT_YARN[i % 4]}" use:reveal={{ delay: i * 0.03, y: 16 }}>
          <div class="proof-value"><CountUp value={s.value} suffix={s.suffix} /></div>
          <div class="proof-stat-copy">
            <p class="proof-label">{s.label}</p>
            {#if STAT_CLAUSE[s.label]}<p class="proof-clause">{STAT_CLAUSE[s.label]}</p>{/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
