<!--
  LOOM-built software — ONE section, `#apps`, "THE STAGE".

  10 Aug 2026: the client asked for six products (apps + software together,
  content from $data/suite.js) but rejected the flat card grid it first
  shipped as ("not designed... make it change on scroll like it used to
  do"). This restores the OLD `AppsShowcase` DESIGN — one product centre
  stage, an icon rail of real tabs, the featured product changing as the
  reader scrolls past a pinned card — re-plumbed onto SUITE's six honest
  entries, and WITHOUT the cost that design used to carry.

  What did NOT come back, on purpose:
    - AppScreens.jsx's live animated device mockups (never imported here).
    - The seven-capture "shot cycle" / three-phone fan (SUITE items carry
      exactly one `art` image each — there is nothing to cycle or fan).
    - #lab / ToolsLab. Gone, and its nav tab stays gone.
  Only the SELECTED product's image is ever mounted, so there is never more
  than one <img> decoding for the stage at a time; switching products swaps
  the DOM node rather than crossfading six pre-loaded ones.

  Every animated value here is transform/opacity (the rail's selection tick,
  the aura's colour cross-fade) — nothing sizes, positions or filters per
  frame, and the scroll driver is a single rAF-throttled `scroll` listener,
  passive, torn down on unmount — same contract the rest of the site uses
  (see Products' own paint()/onScroll below, and Nav.svelte's scrolled state).
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { SUITE } from '$data/suite.js'
  import { reducedMotion, reveal } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import LiveBadge from './LiveBadge.svelte'
  import './products-stage.css' // .stg-* — the stage design
  import './heads-v7.css'       // .apps-status

  // Real dimensions of every file in public/img/suite/, read with
  // `sharp(...).metadata()` — never guessed. Keyed by SUITE's own `key`.
  const DIMS = {
    'evora-scan': { art: [440, 977], icon: [128, 128] },
    '2d3d': { art: [720, 325] },
    'quran-noor': { art: [720, 1561], icon: [128, 128] },
    kun: { art: [720, 325] },
    kwakwa: { art: [540, 1174], icon: [128, 128] },
    ellie: { art: [720, 1565], icon: [128, 128] },
  }

  const two = (n) => String(n + 1).padStart(2, '0')

  const N = SUITE.length
  let i = $state(0)
  let wrap = $state(null)
  let refs = $state([])

  // the stage pins for SUITE.length slices of scroll, so scrolling THROUGH
  // the section walks the rail on its own — scroll POSITION is the only
  // input; nothing is hijacked, no wheel listener, the scrollbar and a deep
  // link drive it identically.
  //
  // THE GUARD IS HEIGHT, NOT WIDTH — a card taller than the viewport cannot
  // sit still in a sticky box, so a short viewport (or a short phone) falls
  // back to an unpinned, click-only stage instead of pinning over a track
  // nothing can read. products-stage.css states the same rule again to
  // unpin `.stg-scroll` / `.stg-pin`; the two must always agree.
  const STAGE_PIN = '(min-width: 761px) and (min-height: 620px), (max-width: 760px) and (min-height: 760px)'

  /** Scroll to a product's slice of the pin. Falls back to setting state
   *  when the section isn't pinned (short viewport / reduced motion). */
  function goTo(n) {
    const total = wrap ? wrap.offsetHeight - window.innerHeight : 0
    const pinned = !reducedMotion.current && window.matchMedia(STAGE_PIN).matches && total > 0
    if (!pinned) { i = n; return }
    const top = wrap.getBoundingClientRect().top + window.scrollY
    const y = top + (n / (N - 1)) * total
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  /* Shared tab keyboard behaviour for the rail: one tab stop for the whole
     list (roving tabindex), arrows move selection AND focus, Home/End jump
     to the ends. Both arrow axes are accepted deliberately — the rail is
     vertical on desktop and horizontal on a phone. */
  function onRailKeydown(e) {
    let next = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % N
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + N) % N
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = N - 1
    if (next === null) return
    e.preventDefault()
    goTo(next)
    refs[next]?.focus()
  }

  // ——— the scroll driver: one passive listener, rAF-throttled, torn down on
  // unmount and whenever reduced motion is on (the pin is removed in CSS at
  // the same time, so there is nothing left to read). ———
  onMount(() => {
    if (reducedMotion.current) return
    const mq = window.matchMedia(STAGE_PIN)
    let raf = 0
    const paint = () => {
      raf = 0
      if (!wrap || !mq.matches) return
      const total = wrap.offsetHeight - window.innerHeight
      if (total <= 0) return
      const y = Math.min(Math.max(-wrap.getBoundingClientRect().top, 0), total)
      // rounded, not eased: the stage has no intermediate state to draw — a
      // tab is either the selected one or it isn't, so the only thing scroll
      // position decides is WHEN the switch fires
      const near = Math.round((y / total) * (N - 1))
      if (i !== near) i = near
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint) }
    paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    mq.addEventListener('change', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      mq.removeEventListener('change', onScroll)
    }
  })

  const item = $derived(SUITE[i])
  const dims = $derived(DIMS[item.key] || {})
  const artW = $derived(dims.art?.[0] ?? 720)
  const artH = $derived(dims.art?.[1] ?? 480)
</script>

<!-- The rail icon. Four of six items ship a real icon file; 2D3D and KUN
     don't (they're desktop tools, not app-store products with a square
     glyph) — those fall back to a gradient squircle carrying the product's
     own initial, drawn in CSS, so a rail of six never waits on a missing
     asset. -->
{#snippet productIcon(it, cls = '')}
  {#if it.icon}
    {@const d = DIMS[it.key]?.icon || [128, 128]}
    <span class="pi pi--photo {cls}">
      <img src={it.icon} alt="" aria-hidden="true" loading="lazy" decoding="async" width={d[0]} height={d[1]} />
    </span>
  {:else}
    <span class="pi {cls}" style="--g1:{it.grad[0]};--g2:{it.grad[1]}" aria-hidden="true">
      <em>{it.name.trim()[0]}</em>
    </span>
  {/if}
{/snippet}

<section class="apps" id="apps">
  <div class="section-head">
    <p class="kicker"><span>—</span> What we've built</p>
    <SplitWords as="h2" class="h2" text="We don’t just market software. We ship it." />
    <div use:reveal={{ delay: 0.15 }}>
      <p class="lede" style="margin-top:22px">
        Six products, one stage. <strong>Just scroll</strong> — the stage changes
        itself, and the rail is there when you want to jump. Only one is downloadable
        by a stranger today; the rest carry exactly the status they've earned.
      </p>
    </div>
    <div use:reveal={{ delay: 0.22 }}>
      <div class="apps-status">
        <LiveBadge label="App Store — live" />
        <LiveBadge label="TestFlight · submitted" />
        <LiveBadge label="Built · in the lab" />
      </div>
    </div>
  </div>

  <!-- the tall element. Its height IS the rail's timeline; the sticky child
       is what the reader actually sees. Both collapse to nothing under the
       media query in the stylesheet, which is the short-viewport /
       reduced-motion fallback. -->
  <div
    class="stg-scroll{reducedMotion.current ? ' stg-scroll--flat' : ''}"
    bind:this={wrap}
    style="--steps:{N - 1}"
  >
  <div class="stg-pin">
  <!-- the card carries the selected item's own colour pair, which is all the
       aura and the floor pool below the device are made of — a colour
       transition on two gradients, not a repaint of anything -->
  <div class="stg" style="--g1:{item.grad[0]};--g2:{item.grad[1]}">
    <div class="stg-aura" aria-hidden="true"></div>
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div class="stg-rail" role="tablist" aria-label="Choose a product" onkeydown={onRailKeydown}>
      {#each SUITE as it, n (it.key)}
        <button
          type="button"
          role="tab"
          id="stg-tab-{n}"
          bind:this={refs[n]}
          aria-selected={n === i}
          aria-controls="stg-panel"
          tabindex={n === i ? 0 : -1}
          onclick={() => goTo(n)}
          data-cursor
        >
          <!-- the accessible name of the tab — the icon itself is decorative -->
          <span class="p-sr-only">{it.name}</span>
          {@render productIcon(it)}
        </button>
      {/each}
    </div>

    <!-- The tabpanel is the whole right-hand half — identity AND imagery —
         because both change when the rail changes tab. Reading order is
         identity first (icon, name, tag, blurb, status), imagery second;
         DOM order and visual order agree, so keyboard/screen-reader order
         matches what a sighted reader sees left to right / top to bottom. -->
    <div class="stg-stage" role="tabpanel" id="stg-panel" aria-labelledby="stg-tab-{i}">
      <div class="stg-info">
        <div class="stg-id">
          {@render productIcon(item, 'stg-icon')}
          <div>
            <h3>{item.name}</h3>
          </div>
        </div>
        <div class="stg-tag">{item.tag}</div>
        <p class="stg-blurb">{item.blurb}</p>
        <div class="stg-meta">
          <span class="pstore" data-s={item.status}><i></i>{item.status}</span>
        </div>
        <!-- Only Quran Noor resolves to a real store page — see data/suite.js.
             Every other item is a plain, non-clickable panel; there is no
             store badge here that could 404. -->
        {#if item.href}
          <a class="stg-open" href={item.href} target="_blank" rel="noreferrer" data-cursor>
            View on the App Store ↗
          </a>
        {/if}
        <!-- how far through the six the scroll has carried the stage -->
        <div class="stg-count">
          <b>{two(i)}</b> / {two(N - 1)} — LOOM-built products
          <i aria-hidden="true" style="--w:{(i / (N - 1)) * 100}%"></i>
        </div>
      </div>

      <!-- The imagery column. Only the SELECTED item's picture is mounted —
           keyed on `item.key` so it remounts (and replays its one entrance
           animation) rather than crossfading a stack of preloaded images.
           `fit` decides the presentation: a portrait phone capture goes
           behind the site's iPhone frame; a wide desktop capture gets its
           own plate instead of being crammed into a phone screen it was
           never shot for. -->
      <div class="stg-panel">
        {#if item.fit === 'contain'}
          {#key item.key}
            <div class="stg-phone">
              <div class="stg-glass">
                <img
                  class="is-contain"
                  src={item.art}
                  width={artW}
                  height={artH}
                  loading="lazy"
                  decoding="async"
                  alt="{item.name} — real app screenshot"
                />
              </div>
              <img class="stg-frame" src="/img/devices/iphone-frame.png" alt="" aria-hidden="true" loading="lazy" decoding="async" width="900" height="1813" />
            </div>
          {/key}
        {:else}
          {#key item.key}
            <div class="stg-wide" style="background:linear-gradient(155deg, {item.grad[0]}, {item.grad[1]})">
              <img
                src={item.art}
                width={artW}
                height={artH}
                loading="lazy"
                decoding="async"
                alt="{item.name} — real capture"
              />
            </div>
          {/key}
        {/if}
      </div>
    </div>
  </div>
  </div>
  </div>
</section>
