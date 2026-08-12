<!--
  Selected Work — the Mosaic wall, the discipline filters, and the
  full-screen case overlay.

  ── THE WALL IS STATIC (11 Aug 2026, client: "remove the animation from this
  section, make it static") ────────────────────────────────────────────────
  This board used to be a live surface: an ambient re-tile on a 2.6s beat, a
  hover-promotion FLIP that re-measured and re-scaled every card in a block,
  a permanent Ken-Burns "breath" on all sixteen photographs, a rAF pointer
  drift, and a device-preview mock that faded in over a dimmed crop. All of
  it is gone — deleted, not disabled.

  What is left is a plain CSS grid. Each card's size class is decided ONCE,
  from `RESTING` below, as ordinary derived data rendered into `class=`. The
  composition is still the measured mosaic (size is the ranking); it simply
  never changes after first paint. There is no rAF, no scroll listener, no
  resize handler, no getBoundingClientRect, and no imperative controller.
  The only motion in the section is the sibling `use:reveal` one-shot as the
  wall first enters the viewport, and CSS hover affordances on a card.

  ── NO HOVER SCRIM ────────────────────────────────────────────────────────
  Hovering a tile used to drop a translucent plate over the photograph so a
  MacBook/iPhone mock could be read on top of it. The client does not want an
  overlay on hover, so both the scrim and the device preview it existed to
  serve are removed. Hover is now: a 6px lift, a magenta hairline, a deeper
  shadow, a slight push-in on the crop, and the case line unfolding. Nothing
  covers the image.
-->
<script>
  import { webpSrcset } from './Pic.svelte'
  import { browser } from '$app/environment'
  import { CASES, FILTERS } from '$data/site.js'
  import { reducedMotion, reveal } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import './heads-v7.css'
  import './work-mosaic.css'
  import './work-case.css'

  // Real encoded dimensions of each case's cover.webp — `sharp(...).metadata()`,
  // not assumed — keyed by slug, so every tile reserves its box before the
  // photo lands instead of reflowing.
  const COVER_DIMS = {
    // 2048x2048 masters, 12 Aug 2026. These replaced 1040px covers encoded at
    // 8-11KB, which the wall was stretching to ~1780 device px on a 2x screen
    // — that upscale, not the photographs, was why the tiles looked soft.
    auraa: [2048, 2048], evorahome: [2048, 2048], maison: [2048, 2048],
    ojar: [2048, 2048], slatko: [2048, 2048], ellie: [2048, 2048],
  }

  // Spelled-out numerals up to the range this board can plausibly reach;
  // past that the digit is fine and honest.
  const NUMBER_WORD = {
    // 2-4 were missing, and the gap showed: this map feeds BOTH numbers in one
    // sentence, and with four countries on the board the headline read "Six
    // brands launched across 4 countries" — a spelled word and a digit inside
    // the same clause. The map has to cover every value either number can
    // actually take, not just the case count's range.
    2: 'two', 3: 'three', 4: 'four',
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
  // THE SIZE MAP — decided once, never re-argued.
  //
  // A block is a run of contiguous cards built to occupy EXACTLY two rows of
  // the four-column grid. `RESTING[n]` is the map a block of n cards wears,
  // for good; each one fills its two rows with no holes and no spill, which
  // is what keeps the wall a fixed number of rows tall.
  //
  // wm-h = 4 cols x 2 rows   wm-f = 2 x 2   wm-t = 1 x 2   wm-w = 2 x 1   wm-s = 1 x 1
  //
  // These are the exact maps the old controller used as each block's RESTING
  // composition, so the static wall is the layout the wall already fell back
  // to on a phone and under reduced motion.
  // ————————————————————————————————————————————————————————
  const RESTING = {
    1: ['wm-h'],
    2: ['wm-f', 'wm-f'],
    3: ['wm-f', 'wm-t', 'wm-t'],
    4: ['wm-f', 'wm-s', 'wm-s', 'wm-w'],
    5: ['wm-f', 'wm-s', 'wm-s', 'wm-s', 'wm-s'],
    6: ['wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-w', 'wm-w'],
    7: ['wm-w', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s'],
    8: ['wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s', 'wm-s'],
  }
  // big enough to carry the case line without being asked
  const BIG = new Set(['wm-h', 'wm-f'])

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

  /** Index 0 of a block gets the top tier in its map, so a `featured` case is
   *  walked to the head of each block. Relative order is preserved inside
   *  both pools, so the wall is still the data's order, only re-phrased. */
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

  // ── state ──────────────────────────────────────────────────────────────
  let filter = $state('all')
  let openSlug = $state(null)

  const list = $derived(filter === 'all' ? CASES : CASES.filter((c) => c.filter.includes(filter)))
  const idx = $derived(CASES.findIndex((c) => c.slug === openSlug))
  const kase = $derived(idx >= 0 ? CASES[idx] : null)

  const headline = $derived(
    `${titleCase(NUMBER_WORD[CASES.length] ?? CASES.length)} brands launched across ${NUMBER_WORD[COUNTRY_COUNT] ?? COUNTRY_COUNT} countries — not one template between them.`
  )

  /** The wall: every card paired with the size class it will wear forever. */
  const wall = $derived.by(() => {
    const sizes = blockSizes(list.length)
    const cards = arrange(list, sizes)
    const out = []
    let at = 0
    for (const n of sizes) {
      const map = RESTING[n] || Array.from({ length: n }, () => 'wm-s')
      for (let i = 0; i < n && at < cards.length; i++, at++) {
        out.push({ c: cards[at], size: map[i] || 'wm-s', lead: BIG.has(map[i]) })
      }
    }
    // any remainder (a block size with no map) still renders, smallest class
    for (; at < cards.length; at++) out.push({ c: cards[at], size: 'wm-s', lead: false })

    /* THE HOME WALL IS A COMPLETE 3x3 — 12 Aug 2026, same call as /work.
       The reference (doc.ba/our-work) reads as an archive because its grid has
       no ragged edge. Six cases left a hole in the second row.

       Every tile is forced to the small square class: the mosaic's size variety
       WAS the ranking, and a 3x3 states the same six cases without claiming one
       outranks another — which is exactly what the reference does. Duplicates
       then fill to nine and are marked so they stay out of assistive tech and
       are never counted. Self-removing: at nine real cases the padding stops. */
    const uniform = out.map((o) => ({ ...o, size: 'wm-s', lead: false }))
    if (!uniform.length) return uniform
    const target = Math.max(9, Math.ceil(uniform.length / 3) * 3)
    return Array.from({ length: target }, (_, i) => ({
      ...uniform[i % uniform.length],
      key: uniform[i % uniform.length].c.slug + '-' + i,
      isDupe: i >= uniform.length,
    }))
  })

  // ══════════════════════════════════════════════════════════════════════
  // THE CASE OVERLAY
  //
  // A true full-screen dialog that NEVER scrolls: three rows (bar / body /
  // foot), the body a fixed-height grid, and the media stage sized by
  // `object-fit: contain` into whatever height is left. Copy is line-clamped
  // by breakpoint rather than allowed to push the panel taller than the
  // viewport, and on a phone the media rail is capped so the thumbnails stay
  // tappable. Everything the case owns is reachable from the rail.
  // ══════════════════════════════════════════════════════════════════════

  /** Every visual a case owns, in reading order. */
  function mediaOf(c) {
    if (!c) return []
    const out = []
    if (c.video) out.push({ kind: 'video', src: c.video, poster: c.cover, label: 'Reel' })
    out.push({ kind: 'img', src: c.cover, label: 'Cover' })
    ;(c.feature || []).forEach((src, i) => out.push({ kind: 'img', src, label: `Visual ${i + 1}` }))
    ;(c.boards || []).forEach((src, i) => out.push({ kind: 'img', src, label: `Board ${i + 1}` }))
    return out
  }

  let isNarrow = $state(false)   // phone-shaped viewport
  let isShort = $state(false)    // not enough height for the full copy block
  $effect(() => {
    if (!browser) return
    const narrow = window.matchMedia('(max-width: 860px)')
    const short = window.matchMedia('(max-height: 760px)')
    const sync = () => { isNarrow = narrow.matches; isShort = short.matches }
    sync()
    narrow.addEventListener('change', sync)
    short.addEventListener('change', sync)
    return () => {
      narrow.removeEventListener('change', sync)
      short.removeEventListener('change', sync)
    }
  })

  // On a phone the rail has to stay tappable (44px targets), so it carries at
  // most five slots. Every case's full set is available on any wider screen.
  const MAX_RAIL_NARROW = 5
  const media = $derived(mediaOf(kase))
  const rail = $derived(isNarrow ? media.slice(0, MAX_RAIL_NARROW) : media)
  let shot = $state(0)
  const current = $derived(rail[Math.min(shot, Math.max(rail.length - 1, 0))] || null)

  // Where the open/close scale animation is anchored — the centre of the tile
  // that was clicked, in viewport coordinates.
  let originStyle = $state('50% 50%')
  let returnEl = null

  function openCase(slug, e) {
    const t = e?.currentTarget
    returnEl = t instanceof HTMLElement ? t : null
    if (t?.getBoundingClientRect) {
      const r = t.getBoundingClientRect()
      originStyle = `${Math.round(r.left + r.width / 2)}px ${Math.round(r.top + r.height / 2)}px`
    } else {
      originStyle = '50% 50%'
    }
    // Read the scroll position HERE, not inside the effect: clicking the tile
    // focuses it, and a browser may nudge the document a few pixels to bring
    // the focused button fully into view before the effect ever runs. Taking
    // the number at click time is what makes the restore exact.
    lockedY = window.scrollY || window.pageYOffset || 0
    shot = 0
    openSlug = slug
  }
  const closeCase = () => { openSlug = null }
  const goCase = (n) => {
    const next = CASES[(n + CASES.length) % CASES.length]
    shot = 0
    openSlug = next.slug
  }
  const prevCase = () => goCase(idx - 1)
  const nextCase = () => goCase(idx + 1)

  // ── scroll lock, with exact restore ────────────────────────────────────
  // `html.overlay-open` alone (overflow:hidden) is enough on Chrome but not
  // on iOS Safari, which keeps scrolling the document behind a fixed layer.
  // Pinning the body at a negative offset holds the page AND remembers where
  // it was, so closing returns to the pixel the visitor left.
  let lockedY = 0
  function lockScroll() {
    const b = document.body
    b.style.position = 'fixed'
    b.style.top = `-${lockedY}px`
    b.style.left = '0'
    b.style.right = '0'
    b.style.width = '100%'
    document.documentElement.classList.add('overlay-open')
  }
  function unlockScroll() {
    const b = document.body
    b.style.position = ''
    b.style.top = ''
    b.style.left = ''
    b.style.right = ''
    b.style.width = ''
    document.documentElement.classList.remove('overlay-open')
    window.scrollTo(0, lockedY)
  }

  // Focus trap + Escape/arrow keys + focus return. Runs only while an overlay
  // is OPEN — deliberately keyed on the boolean, not on `openSlug`: stepping
  // prev/next inside an open dialog must not tear this down and rebuild it,
  // or every step would unlock and re-lock the page and bounce focus out to
  // the tile and back. For the same reason `panelEl` is a plain `let`, not
  // `$state` — `bind:this` assigning it must not re-run this effect.
  let panelEl = null
  const isOpen = $derived(!!openSlug)
  $effect(() => {
    if (!browser || !isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeCase(); return }
      if (e.key === 'ArrowLeft') { prevCase(); return }
      if (e.key === 'ArrowRight') { nextCase(); return }
      if (e.key !== 'Tab') return
      const panel = panelEl
      if (!panel) return
      const focusable = [...panel.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])'
      )].filter((el) => el.offsetParent !== null || el === panel)
      if (!focusable.length) { e.preventDefault(); panel.focus(); return }
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    lockScroll()

    const raf = requestAnimationFrame(() => panelEl?.focus({ preventScroll: true }))
    const back = returnEl

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      unlockScroll()
      if (back instanceof HTMLElement && document.contains(back)) back.focus({ preventScroll: true })
    }
  })

  // ── open / close motion ────────────────────────────────────────────────
  // Svelte transitions, so an interrupted open reverses from where it is
  // instead of jumping. Under reduced motion the transform drops out and only
  // the opacity remains, matching every sibling component in this build.
  const EASE_OUT = (t) => 1 - Math.pow(1 - t, 3)
  function panelPop(node, { duration = 420 } = {}) {
    const reduced = reducedMotion.current
    return {
      duration: reduced ? 180 : duration,
      easing: EASE_OUT,
      css: (t) => reduced
        ? `opacity:${t}`
        : `opacity:${Math.min(1, t * 1.8)};transform:scale(${0.9 + 0.1 * t})`,
    }
  }
  function veil(node, { duration = 320 } = {}) {
    return { duration: reducedMotion.current ? 150 : duration, easing: EASE_OUT, css: (t) => `opacity:${t}` }
  }
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
         arrow-key roving focus, and neither exists here. -->
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

    <!-- `use:reveal` rides the WRAPPER, the keyed wall rides the inner div:
         the wrapper's one-shot rise happens once, when the section first
         enters the viewport (the sibling idiom used everywhere else in this
         build), while the inner `wm-wall-in` opacity fade covers a filter
         swap. Two elements, so neither writes the other's opacity. -->
    <div use:reveal={{ delay: 0.05, y: 28 }}>
      {#key filter}
        <div class="wmosaic">
          {#each wall as { c, size, lead, isDupe, key }, i (key)}
            <!-- A LINK, NOT A DIALOG TRIGGER — 12 Aug 2026.
                 Matches /work: every case now has a real prerendered page, so
                 a tile on the home page is an anchor and behaves like one
                 (new tab, copy link, share, crawl). -->
            <a
              class="wtile {size}" class:is-dupe={isDupe}
              aria-hidden={isDupe ? 'true' : undefined}
              tabindex={isDupe ? -1 : undefined}
              href="/work/{c.slug}"
              data-slug={c.slug}
              data-cursor
              aria-label="{c.client} — {c.title}"
            >
              <span class="wm-ph"><span class="wm-par">
                <!-- `sizes` describes the TILE, not the viewport — the mosaic
                     is a multi-column wall, so a tile is a fraction of the
                     width at every breakpoint.
                     NOT <Pic> here, deliberately: this <img> carries
                     `use:imgFade`, and a Svelte action can only be applied to
                     a DOM element, not to a component. -->
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
              {#if c.video}<span class="wm-reel" aria-hidden="true">REEL</span>{/if}
              <!-- The mark is centred over the picture now, matching /work and
                   the reference. The caption keeps the rank, the title and the
                   meta and slides up from the foot on hover. -->
              <span class="wm-plate">
                <span class="wm-mark">{c.client}</span>
                <span class="wm-mark-sub">{c.scope[0]}</span>
              </span>
              <span class="wm-cap {lead ? 'is-lead' : ''}">
                <span class="wm-rank">{n2(i)}</span>
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
            </a>
          {/each}
        </div>
      {/key}
    </div>
    <p class="wmosaic-note">
      <span>Open any card for the full case — <b>the work, the market, the year</b></span>
    </p>
  </div>

  {#if kase}
    {@const c = kase}
    <div class="wcase">
      <button
        class="wcase-backdrop"
        transition:veil
        onclick={closeCase}
        aria-label="Close case study"
        tabindex="-1"
      ></button>
      <div
        bind:this={panelEl}
        class="wcase-panel"
        class:is-narrow={isNarrow}
        class:is-short={isShort}
        style="transform-origin:{originStyle}"
        transition:panelPop
        role="dialog"
        aria-modal="true"
        aria-labelledby="wcase-name"
        tabindex="-1"
      >
        <header class="wcase-bar">
          <span class="wcase-brand">LOOM <i>—</i> Case study</span>
          <span class="wcase-count">{n2(idx)} <i>/</i> {CASES.length}</span>
          <div class="wcase-nav">
            <button type="button" onclick={prevCase} aria-label="Previous case">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button type="button" onclick={nextCase} aria-label="Next case">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
            <button type="button" class="wcase-close" onclick={closeCase} aria-label="Close case study">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </header>

        <div class="wcase-body">
          <!-- keyed on the slug so stepping prev/next re-runs the column's
               short enter animation instead of teleporting the words -->
          {#key c.slug}
          <div class="wcase-info">
            <p class="wcase-scope">
              {#each c.scope as s (s)}<span>{s}</span>{/each}
            </p>
            <h2 id="wcase-name">{c.client}</h2>
            <p class="wcase-title">{c.title}</p>
            <p class="wcase-copy">{c.copy}</p>
            <dl class="wcase-facts">
              <div><dt>Market</dt><dd>{c.country}</dd></div>
              <div><dt>Year</dt><dd>{c.year}</dd></div>
              <div><dt>Studio</dt><dd>LOOM</dd></div>
            </dl>
            <div class="wcase-cta">
              <WoolButton label="Next case" size="small" onclick={nextCase} />
            </div>
          </div>
          {/key}

          <figure class="wcase-stage">
            {#key `${c.slug}-${shot}`}
              {#if current?.kind === 'video'}
                <video src={current.src} poster={current.poster} autoplay muted loop playsinline controls></video>
              {:else if current}
                <img
                  src={current.src}
                  alt="{c.client} — {current.label}"
                  decoding="async"
                  use:imgFade onload={onImgLoad}
                />
              {/if}
            {/key}
          </figure>
        </div>

        <footer class="wcase-foot">
          <div class="wcase-rail" role="group" aria-label="Case visuals">
            {#each rail as m, i (m.src)}
              <button
                type="button"
                class="wcase-thumb {i === Math.min(shot, rail.length - 1) ? 'is-on' : ''}"
                aria-pressed={i === Math.min(shot, rail.length - 1)}
                aria-label="Show {m.label}"
                onclick={() => (shot = i)}
              >
                <img src={m.kind === 'video' ? m.poster : m.src} alt="" decoding="async" loading="lazy" />
                {#if m.kind === 'video'}<span class="wcase-thumb-reel" aria-hidden="true">▶</span>{/if}
              </button>
            {/each}
          </div>
          <p class="wcase-legend">{current?.label ?? ''}</p>
        </footer>
      </div>
    </div>
  {/if}
</section>
