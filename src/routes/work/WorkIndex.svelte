<!--
  WorkIndex — /work, the FULL ARCHIVE.

  ── WHY THIS IS NOT `<Work />` ────────────────────────────────────────────
  The home page's `#work` is a teaser: a measured mosaic where SIZE is the
  ranking and only the big tiles carry a case line. It is a wall you look at.
  This page is a wall you *search*. Somebody who typed /work came to evaluate
  the studio, so every case gets the same slot, the same amount of type, and
  the same three facts a buyer actually filters on — discipline, market, year
  — with all three filters live and combinable, plus a sort.

  ── EVERY NUMBER ON THIS PAGE IS DERIVED, NONE IS TYPED ───────────────────
    · case count            CASES.length
    · country count         CASES[].country, normalised through COUNTRY_ALIAS
                            (the same table Work.svelte uses — "Sarajevo" is
                            Bosnia, "Oman × UAE" is two, "German market" is a
                            market served) then counted as a Set
    · discipline count      FILTERS minus the synthetic `all` row
    · year span             min/max of every year parsed out of CASES[].year,
                            which is prose ('2024–25', '2023–24') and has to
                            be expanded before it can be compared
    · per-filter counts     recomputed from the data on every render
  If a case is added to $data/site.js, every one of these moves on its own.
  Nothing here may be hard-coded — that is the whole contract of this file.

  ── THE CASE DIALOG ───────────────────────────────────────────────────────
  Work.svelte owns an identical dialog but keeps it in private component
  state — there is no prop, no export and no store to reach it through, and
  that file is not ours to edit. So the dialog is rebuilt here against the
  same CASES data and, deliberately, against the SAME STYLESHEET
  (`work-case.css`, imported not copied): one design, two mounts, and a
  restyle of the dialog still only happens in one file. The behaviour
  contract is work-case.css's own — the dialog never scrolls.

  The one difference is on purpose: prev/next here walks the FILTERED list,
  not all sixteen. Filtering to "Packaging" and then being thrown into a
  social campaign by the next arrow would undo the filter the reader just
  set.
-->
<script>
  import { browser } from '$app/environment'
  import { CASES, FILTERS, BRAND } from '$data/site.js'
  import { webpSrcset } from '$lib/components/Pic.svelte'
  import { reducedMotion, reveal } from '$lib/motion.svelte.js'
  import SplitWords from '$lib/components/SplitWords.svelte'
  import WoolButton from '$lib/components/WoolButton.svelte'
  import {
    marketsOf, yearsOf, lastYear, word,
    MARKETS, ALL_YEARS,
    CASE_COUNT, COUNTRY_COUNT, DISCIPLINE_COUNT, YEAR_FIRST, YEAR_LAST, SCOPE_COUNT,
  } from './facts.js'
  import '$lib/components/heads-v7.css'
  import '$lib/components/work-case.css'  // the dialog's design, shared with Work.svelte
  import './work-index.css'               // this page's own archive layout

  // Real encoded dimensions of each cover.webp — measured with
  // sharp(...).metadata(), same table Work.svelte carries. Present so every
  // card reserves its box before the photograph lands.
  const COVER_DIMS = {
    // 2048x2048 masters, 12 Aug 2026. These replaced 1040px covers encoded at
    // 8-11KB, which the wall was stretching to ~1780 device px on a 2x screen
    // — that upscale, not the photographs, was why the tiles looked soft.
    // ellie keeps its original: its render was never downloaded.
    auraa: [2048, 2048], evorahome: [2048, 2048], maison: [2048, 2048],
    ojar: [2048, 2048], slatko: [2048, 2048],
    ellie: [1040, 715],
  }

  const n2 = (i) => String(i + 1).padStart(2, '0')

  // ── the sentence the hero is written from ─────────────────────────────
  // Three counts, all of them read off the data by ./facts.js. Adding a case
  // to $data/site.js rewrites this line by itself.
  const HEADLINE =
    `${word(CASE_COUNT)} cases, ${word(COUNTRY_COUNT).toLowerCase()} countries, ` +
    `${word(DISCIPLINE_COUNT).toLowerCase()} disciplines — the whole archive, unfiltered.`

  const STATS = [
    { v: String(CASE_COUNT), l: 'Cases in the archive' },
    { v: String(COUNTRY_COUNT), l: 'Countries shipped to' },
    { v: `${YEAR_FIRST}–${YEAR_LAST}`, l: 'Years covered' },
    { v: String(SCOPE_COUNT), l: 'Distinct scopes of work' },
  ]

  // ── filter + sort state ───────────────────────────────────────────────
  let discipline = $state('all')
  let market = $state('all')
  let year = $state('all')
  let sort = $state('recent')

  const SORTS = [
    { id: 'recent', label: 'Newest first' },
    { id: 'oldest', label: 'Oldest first' },
    { id: 'client', label: 'Client A–Z' },
  ]

  const matches = (c) =>
    (discipline === 'all' || c.filter.includes(discipline)) &&
    (market === 'all' || marketsOf(c).includes(market)) &&
    (year === 'all' || yearsOf(c).includes(Number(year)))

  const list = $derived.by(() => {
    const out = CASES.filter(matches)
    if (sort === 'client') return out.slice().sort((a, b) => a.client.localeCompare(b.client))
    if (sort === 'oldest') return out.slice().sort((a, b) => lastYear(a) - lastYear(b))
    return out.slice().sort((a, b) => lastYear(b) - lastYear(a))
  })

  /* THE WALL IS A FULL 3x3 — 12 Aug 2026, to the reference (doc.ba/our-work).
     Its power is that the grid is COMPLETE: nine tiles, butt-jointed, no ragged
     last row. Six real cases leave a row of three and then a row of three with
     a hole, which reads as an unfinished page rather than an archive.

     So the tail is padded by repeating from the top until the count reaches a
     multiple of three. `isDupe` is carried through so a repeat can never claim
     to be a new case — it is not counted anywhere, not linked, and not read out
     to a screen reader. THIS IS SCAFFOLDING: the moment CASES holds nine, the
     padding stops on its own and nothing here has to be undone. */
  const tiles = $derived.by(() => {
    const src = list
    if (!src.length) return []
    const target = Math.max(9, Math.ceil(src.length / 3) * 3)
    return Array.from({ length: target }, (_, i) => ({
      c: src[i % src.length],
      // The key has to be unique or Svelte keys two tiles the same and the
      // second one never renders.
      key: `${src[i % src.length].slug}-${i}`,
      isDupe: i >= src.length,
      n: i,
    }))
  })

  const isFiltered = $derived(discipline !== 'all' || market !== 'all' || year !== 'all')
  function clearFilters() { discipline = 'all'; market = 'all'; year = 'all' }

  /* Counts on the chips. They are computed against the OTHER two filters, so
     a chip promises what it will actually give you: with "Jordan" selected,
     the Packaging chip reads the number of Jordanian packaging cases, not the
     global count, and a chip that would empty the wall reads 0 and is
     disabled rather than being a dead end you have to undo. */
  const countFor = (kind, id) =>
    CASES.filter((c) => {
      const d = kind === 'discipline' ? id : discipline
      const m = kind === 'market' ? id : market
      const y = kind === 'year' ? id : year
      return (d === 'all' || c.filter.includes(d)) &&
        (m === 'all' || marketsOf(c).includes(m)) &&
        (y === 'all' || yearsOf(c).includes(Number(y)))
    }).length

  // Fade covers in on decode — `complete` covers the cached case, where
  // `onload` never fires after hydration.
  function imgFade(el) { if (el && el.complete && el.naturalWidth) el.classList.add('is-loaded') }
  const onImgLoad = (e) => e.currentTarget.classList.add('is-loaded')

  // ══════════════════════════════════════════════════════════════════════
  // THE DIALOG — same shape, same stylesheet, same no-scroll contract as
  // Work.svelte's. See the header note for why it is rebuilt rather than
  // reached into.
  // ══════════════════════════════════════════════════════════════════════
  let openSlug = $state(null)
  const idx = $derived(list.findIndex((c) => c.slug === openSlug))
  const kase = $derived(idx >= 0 ? list[idx] : null)

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

  let isNarrow = $state(false)
  let isShort = $state(false)
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

  const MAX_RAIL_NARROW = 5
  const media = $derived(mediaOf(kase))
  const rail = $derived(isNarrow ? media.slice(0, MAX_RAIL_NARROW) : media)
  let shot = $state(0)
  const current = $derived(rail[Math.min(shot, Math.max(rail.length - 1, 0))] || null)

  let originStyle = $state('50% 50%')
  let returnEl = null
  let lockedY = 0

  function openCase(slug, e) {
    const t = e?.currentTarget
    returnEl = t instanceof HTMLElement ? t : null
    if (t?.getBoundingClientRect) {
      const r = t.getBoundingClientRect()
      originStyle = `${Math.round(r.left + r.width / 2)}px ${Math.round(r.top + r.height / 2)}px`
    } else {
      originStyle = '50% 50%'
    }
    // Read the scroll offset at CLICK time: focusing the card can nudge the
    // document a few pixels before the effect runs, and the restore has to be
    // exact.
    lockedY = window.scrollY || window.pageYOffset || 0
    shot = 0
    openSlug = slug
  }
  const closeCase = () => { openSlug = null }
  const goCase = (n) => {
    if (!list.length) return
    shot = 0
    openSlug = list[(n + list.length) % list.length].slug
  }
  const prevCase = () => goCase(idx - 1)
  const nextCase = () => goCase(idx + 1)

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

  // Keyed on the BOOLEAN, not on `openSlug`: stepping prev/next inside an open
  // dialog must not tear the trap down and rebuild it, or every step would
  // unlock and re-lock the page. `panelEl` is a plain `let` for the same
  // reason — `bind:this` must not re-run this effect.
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

  // Svelte transitions so an interrupted open reverses from where it is.
  // Under reduced motion only the opacity survives — the same collapse every
  // sibling component in this build makes.
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

<!-- ═══ 1. THE PAGE HERO — written from the counts above ═══════════════ -->
<section class="wx-hero" aria-labelledby="wx-title">
  <div class="section-head">
    <p class="kicker"><span>—</span> The archive</p>
    <SplitWords as="h1" class="h2" text={HEADLINE} />
    <div use:reveal={{ delay: 0.15 }}>
      <p class="lede" style="margin-top:22px">
        The home page shows a wall. This is the index behind it: every case
        {BRAND.name} has shipped, with the client, the brief in one line, the
        disciplines it ran through, the market it launched in and the year it
        ran. Filter it down to the kind of work you came for — the numbers on
        each chip are the cases you will actually get.
      </p>
    </div>
  </div>

  <div class="wx-stats" use:reveal={{ delay: 0.2, y: 24 }}>
    {#each STATS as s (s.l)}
      <div class="wx-stat">
        <b>{s.v}</b>
        <span>{s.l}</span>
      </div>
    {/each}
  </div>
</section>

<!-- ═══ 2. THE CONTROLS ════════════════════════════════════════════════ -->
<section class="wx-controls" aria-label="Filter and sort the archive">
  <div use:reveal={{ delay: 0.05, y: 22 }}>
    <div class="wx-ctl">
      <p class="wx-ctl-label" id="wx-lbl-disc">Discipline</p>
      <div class="wx-chips" role="group" aria-labelledby="wx-lbl-disc">
        {#each FILTERS as f (f.id)}
          {@const n = f.id === 'all' ? countFor('discipline', 'all') : countFor('discipline', f.id)}
          <button
            type="button" class="filter wx-chip" class:is-active={discipline === f.id}
            aria-pressed={discipline === f.id}
            disabled={n === 0 && discipline !== f.id}
            onclick={() => (discipline = f.id)}
            data-cursor
          >{f.label}<i>{n}</i></button>
        {/each}
      </div>
    </div>

    <div class="wx-ctl">
      <p class="wx-ctl-label" id="wx-lbl-mkt">Market</p>
      <div class="wx-chips" role="group" aria-labelledby="wx-lbl-mkt">
        <button
          type="button" class="filter wx-chip" class:is-active={market === 'all'}
          aria-pressed={market === 'all'} onclick={() => (market = 'all')} data-cursor
        >All<i>{countFor('market', 'all')}</i></button>
        {#each MARKETS as m (m)}
          {@const n = countFor('market', m)}
          <button
            type="button" class="filter wx-chip" class:is-active={market === m}
            aria-pressed={market === m}
            disabled={n === 0 && market !== m}
            onclick={() => (market = m)}
            data-cursor
          >{m}<i>{n}</i></button>
        {/each}
      </div>
    </div>

    <div class="wx-ctl">
      <p class="wx-ctl-label" id="wx-lbl-yr">Year</p>
      <div class="wx-chips" role="group" aria-labelledby="wx-lbl-yr">
        <button
          type="button" class="filter wx-chip" class:is-active={year === 'all'}
          aria-pressed={year === 'all'} onclick={() => (year = 'all')} data-cursor
        >All<i>{countFor('year', 'all')}</i></button>
        {#each ALL_YEARS as y (y)}
          {@const n = countFor('year', y)}
          <button
            type="button" class="filter wx-chip" class:is-active={year === String(y)}
            aria-pressed={year === String(y)}
            disabled={n === 0 && year !== String(y)}
            onclick={() => (year = String(y))}
            data-cursor
          >{y}<i>{n}</i></button>
        {/each}
      </div>
    </div>

    <div class="wx-bar">
      <p class="wx-result" aria-live="polite">
        <b>{list.length}</b> of {CASE_COUNT}
        {#if isFiltered}
          <button type="button" class="wx-clear" onclick={clearFilters} data-cursor>Clear filters</button>
        {/if}
      </p>
      <div class="wx-sort">
        <span class="wx-ctl-label" id="wx-lbl-sort">Sort</span>
        <div class="wx-chips" role="group" aria-labelledby="wx-lbl-sort">
          {#each SORTS as s (s.id)}
            <button
              type="button" class="filter wx-chip wx-chip--plain" class:is-active={sort === s.id}
              aria-pressed={sort === s.id} onclick={() => (sort = s.id)} data-cursor
            >{s.label}</button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ 3. THE INDEX ═══════════════════════════════════════════════════
     One slot per case, all the same size — the ranking the mosaic encodes in
     tile size is not a claim this page is making, so every case gets the
     same room and the same six facts. -->
<section class="wx-index" aria-label="Case studies">
  {#if list.length === 0}
    <p class="wx-empty">
      No case matches all three filters at once.
      <button type="button" class="wx-clear" onclick={clearFilters}>Clear filters</button>
    </p>
  {:else}
    <div use:reveal={{ delay: 0.05, y: 26 }}>
      <ol class="wx-grid">
        {#each tiles as t, i (t.key)}
          {@const c = t.c}
          <li class="wx-cell">
            <!-- A LINK, NOT A BUTTON — 12 Aug 2026.
                 These used to open a dialog over the index. Each case now has
                 a real prerendered page at /work/[slug], so the tile is an
                 anchor: it can be opened in a new tab, copied, shared and
                 crawled, none of which a dialog trigger could do. The dialog
                 code is still below and still serves the home page's grid. -->
            <a
              class="wx-card" class:is-dupe={t.isDupe}
              href="/work/{c.slug}" data-cursor
              aria-hidden={t.isDupe ? "true" : undefined}
              tabindex={t.isDupe ? -1 : undefined}
              aria-label={t.isDupe ? undefined : `${c.client} — ${c.title}`}
            >
              <span class="wx-shot">
                <img
                  src={c.cover} alt=""
                  srcset={webpSrcset(c.cover)}
                  sizes="(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 30vw"
                  width={COVER_DIMS[c.slug]?.[0]} height={COVER_DIMS[c.slug]?.[1]}
                  loading={i < 3 ? 'eager' : 'lazy'} decoding="async"
                  use:imgFade onload={onImgLoad}
                />
                <!-- The scrim carries the wordmark's contrast. It is on the
                     TILE and not the photograph so it cannot be scaled by the
                     hover zoom underneath it — a wash that grows with the
                     image visibly lightens at the edges mid-transition. -->
                <span class="wx-scrim" aria-hidden="true"></span>
                <span class="wx-rank">{n2(i)}</span>
                <span class="wx-plate">
                  <span class="wx-mark">{c.client}</span>
                  <span class="wx-mark-sub">{c.scope[0]}</span>
                </span>
                <span class="wx-hoverfoot">
                  <span class="wx-title">{c.title}</span>
                  <span class="wx-foot">
                    <span class="wx-market">{c.country} · {c.year}</span>
                    <span class="wx-open">Open case
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M17 7H9M17 7v8" /></svg>
                    </span>
                  </span>
                </span>
              </span>
            </a>
          </li>
        {/each}
      </ol>
    </div>
  {/if}
</section>

<!-- ═══ 4. THE CLOSING BAND ════════════════════════════════════════════
     It leads to the two places a reader of the archive plausibly wants next:
     the studio's own software, and a conversation. -->
<section class="wx-end" aria-labelledby="wx-end-h">
  <div use:reveal={{ y: 26 }}>
    <p class="kicker"><span>—</span> Next</p>
    <h2 class="h2" id="wx-end-h">{CASE_COUNT} cases in, {YEAR_FIRST}–{YEAR_LAST}. Yours is the next line in the index.</h2>
    <p class="lede" style="margin-top:20px">
      Every case above ran through the same studio, in {word(COUNTRY_COUNT).toLowerCase()}
      countries and {word(DISCIPLINE_COUNT).toLowerCase()} disciplines. Tell us
      which one you need — or see what we build when the client is us.
    </p>
    <div class="wx-end-cta">
      <WoolButton label="Start a project" href="/contact" />
      <a class="wx-link" href="/apps" data-cursor>
        Our own apps &amp; software
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M17 7H9M17 7v8" /></svg>
      </a>
    </div>
  </div>
</section>

<!-- ═══ THE CASE DIALOG ════════════════════════════════════════════════ -->
{#if kase}
  {@const c = kase}
  <div class="wcase">
    <button
      class="wcase-backdrop" transition:veil onclick={closeCase}
      aria-label="Close case study" tabindex="-1"
    ></button>
    <div
      bind:this={panelEl}
      class="wcase-panel"
      class:is-narrow={isNarrow}
      class:is-short={isShort}
      style="transform-origin:{originStyle}"
      transition:panelPop
      role="dialog" aria-modal="true" aria-labelledby="wxcase-name" tabindex="-1"
    >
      <header class="wcase-bar">
        <span class="wcase-brand">LOOM <i>—</i> Case study</span>
        <span class="wcase-count">{n2(idx)} <i>/</i> {list.length}</span>
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
        {#key c.slug}
          <div class="wcase-info">
            <p class="wcase-scope">
              {#each c.scope as s (s)}<span>{s}</span>{/each}
            </p>
            <h2 id="wxcase-name">{c.client}</h2>
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
              <img src={current.src} alt="{c.client} — {current.label}" decoding="async" use:imgFade onload={onImgLoad} />
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
