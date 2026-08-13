<!--
  LOOM-built software — ONE section, `#apps`, "THE STAGE".

  10 Aug 2026: the client asked for six products (apps + software together,
  content from $data/suite.js) but rejected the flat card grid it first
  shipped as ("not designed... make it change on scroll like it used to
  do"). This restores the OLD `AppsShowcase` DESIGN — one product centre
  stage, an icon rail of real tabs, the featured product changing as the
  reader scrolls past a pinned card — re-plumbed onto SUITE's nine honest
  entries (six, plus three concepts added 11 Aug 2026), and WITHOUT the cost
  that design used to carry.

  What did NOT come back, on purpose:
    - AppScreens.jsx's live animated device mockups (never imported here).
    - #lab / ToolsLab. Gone, and its nav tab stays gone.
  Only the SELECTED product's images are ever mounted, so there is never more
  than one product decoding for the stage at a time; switching products swaps
  the DOM nodes rather than crossfading nine pre-loaded sets.

  THE IMAGERY (11 Aug 2026). Three mockups, chosen by the product's own
  `kind` in data/suite.js — a fact about what the FILES are, not a preference:
    'panels'   → three finished App-Store cards, hero centre. The card already
                 contains its own phone and headline, so NO bezel is drawn
                 around it (see scripts/panels.mjs for how one is built).
    'app'      → three phones in a fan, hero centre, two flanks set back.
                 For bare captures with no scene around them.
    'software' → one MacBook, the capture in its display.
  Both frames are pure CSS (appscreens.css) — no frame PNG is fetched here
  any more. Where a product has no capture for a slot yet, `shots` holds a
  `null` and the frame draws a brand-tinted placeholder: never a broken
  image, never a 404.

  Both mockups are sized off ONE height token (`--dv-h`) rather than off the
  captures inside them, so the card is exactly as tall on a MacBook product
  as on a phone product and the rail can be walked without anything below
  `#apps` moving. See appscreens.css's "height contract".

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
  import { registerReactiveUrls } from '$lib/imageWarm.js'
  import SplitWords from './SplitWords.svelte'
  import LiveBadge from './LiveBadge.svelte'
  import './products-stage.css' // .stg-* — the stage design
  import './appscreens.css'     // .dv-*  — the CSS device frames (loaded 2nd on purpose)
  import './heads-v7.css'       // .apps-status

  // Real pixel dimensions of the icon files in static/img/suite/ — read off
  // the files, never guessed. Screenshot dimensions travel with the shot
  // itself in suite.js, so only the icons need a table here.
  const ICON_DIMS = {
    'evora-scan': [128, 128],
    'quran-noor': [128, 128],
    kwakwa: [128, 128],
    ellie: [128, 128],
    lume: [128, 128],
    tarz: [128, 128],
    naqi: [128, 128],
    myfairytrail: [256, 256],
    ajniha: [256, 256],
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

  // ——— WARM EVERY PRODUCT'S IMAGERY, NOT JUST THE SELECTED ONE'S ———
  // `stg-bg` and the three `shots` below are keyed on `item.key`, so only the
  // SELECTED product's <img>s are ever in the DOM (see the header comment on
  // why: never more than one product decoding at a time). That is right for
  // paint cost, but it means scrolling to a product that has never been the
  // selection before mounts brand-new <img loading="lazy"> nodes at the
  // exact moment the scroll reveals them — a fetch that starts AT scroll
  // time, which is the one thing imageWarm.js's brief forbids. None of these
  // URLs carry a srcset/responsive candidate (see the screen/card/laptop
  // snippets above — plain `src={shot.src}`, no `<picture>`), so there is no
  // viewport decision to mirror here: registering the literal path from
  // suite.js IS the URL the browser will actually request, for every
  // viewport. Registered once for the component's lifetime (not per
  // selection change) since the list is the whole SUITE, not the current
  // item — imageWarm.js's own batching is what keeps this from flooding the
  // connection pool.
  onMount(() => {
    return registerReactiveUrls(() =>
      SUITE.flatMap((it) => [it.bg, ...(it.shots || []).filter(Boolean).map((s) => s.src)]).filter(Boolean)
    )
  })

  const item = $derived(SUITE[i])
</script>

<!-- The rail icon. Seven of nine items ship a real icon file; 2D3D and KUN
     don't (they're desktop tools, not app-store products with a square
     glyph) — those fall back to a gradient squircle carrying the product's
     own initial, drawn in CSS, so a rail of nine never waits on a missing
     asset. -->
{#snippet productIcon(it, cls = '')}
  {#if it.icon}
    {@const d = ICON_DIMS[it.key] || [128, 128]}
    <span class="pi pi--photo {cls}">
      <img src={it.icon} alt="" aria-hidden="true" loading="lazy" decoding="async" width={d[0]} height={d[1]} />
    </span>
  {:else}
    <span class="pi {cls}" style="--g1:{it.grad[0]};--g2:{it.grad[1]}" aria-hidden="true">
      <em>{it.name.trim()[0]}</em>
    </span>
  {/if}
{/snippet}

<!-- ——— what goes behind the glass ———
     A `shot` is either `{src,w,h}` or `null`. `null` is a first-class case,
     not a failure: it draws a soft panel in the product's own two colours
     carrying its initial, so a screen we haven't been given yet reads as
     part of the design. There is no <img> in that branch, so nothing is
     requested and nothing 404s. The placeholder is decorative — the panel's
     accessible name is already the product's, above. -->
{#snippet screen(shot, it, label)}
  {#if shot}
    <img
      src={shot.src}
      width={shot.w}
      height={shot.h}
      loading="lazy"
      decoding="async"
      alt="{it.name} — {label}"
    />
  {:else}
    <div class="dv-ph" aria-hidden="true"><em>{it.name.trim()[0]}</em></div>
  {/if}
{/snippet}

<!-- the phone: bezel, glass, dynamic island — all CSS, no frame asset -->
{#snippet phone(shot, it, label)}
  <div class="dv-phone">
    <div class="dv-screen">
      {@render screen(shot, it, label)}
      <span class="dv-island" aria-hidden="true"></span>
    </div>
  </div>
{/snippet}

<!-- the panel: an App-Store card that ALREADY contains its own device and
     headline (scripts/panels.mjs composites a Higgsfield scene, the real
     screen capture and the type). So there is deliberately no bezel drawn
     around it — a CSS phone wrapped around a picture of a phone is the whole
     mistake this branch exists to avoid. -->
{#snippet card(shot, it, label)}
  <div class="dv-card">
    {#if shot}
      <img
        src={shot.src}
        width={shot.w}
        height={shot.h}
        loading="lazy"
        decoding="async"
        alt="{it.name} — {label}"
      />
    {:else}
      <div class="dv-ph" aria-hidden="true"><em>{it.name.trim()[0]}</em></div>
    {/if}
  </div>
{/snippet}

<!-- the laptop: lid with camera over a hinge bar with a thumb notch -->
{#snippet laptop(shot, it)}
  <div class="dv-mac">
    <div class="dv-lid">
      <span class="dv-cam" aria-hidden="true"></span>
      <div class="dv-screen">
        {@render screen(shot, it, 'desktop screenshot')}
      </div>
    </div>
    <div class="dv-base" aria-hidden="true"></div>
  </div>
{/snippet}

<section class="apps" id="apps">
  <div class="section-head">
    <p class="kicker"><span>—</span> What we've built</p>
    <SplitWords as="h2" class="h2" text="We don’t just market software. We ship it." />
    <div use:reveal={{ delay: 0.15 }}>
      <p class="lede" style="margin-top:22px">
        {N} products, one stage. <strong>Just scroll</strong> — the stage changes
        itself, and the rail is there when you want to jump. Only one is downloadable
        by a stranger today; the rest carry exactly the status they've earned, down
        to the three that are still only drawings.
      </p>
    </div>
    <div use:reveal={{ delay: 0.22 }}>
      <div class="apps-status">
        <LiveBadge label="App Store — live" />
        <LiveBadge label="TestFlight · submitted" />
        <LiveBadge label="Built · in the lab" />
        <LiveBadge label="Concept · in design" />
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
    <!-- ——— the card's own place (12 Aug 2026) ———
         Every product now sits on a photograph of the world it belongs to
         rather than on the shared page ground: the eight cards were one card
         with the nouns swapped, and the aura's two tinted pools were the only
         thing distinguishing a wedding app from a helicopter app.

         DECORATIVE, AND HELD THAT WAY ON PURPOSE. aria-hidden, no alt, and
         `.stg-scrim` lies over it — the pictures are deliberately far out of
         focus and dark, and the scrim then takes another bite out of the
         contrast, because the readable things on this card are the blurb and
         three phone screenshots and neither may lose to scenery. If a
         background ever fights them, the background is wrong.

         `{#key}` on the image, not on the wrapper, so a tab change swaps the
         file and re-runs the fade rather than tearing down the frame. The
         `onerror` drops a failed decode and leaves the aura and the card's
         plain ground exactly as they were before this existed — a missing
         background costs a picture, never a layout. -->
    {#if item.bg}
      <div class="stg-bg" aria-hidden="true">
        {#key item.key}
          <img
            src={item.bg}
            alt=""
            loading="lazy"
            decoding="async"
            onerror={(e) => { e.currentTarget.style.display = 'none' }}
          />
        {/key}
      </div>
      <div class="stg-scrim" aria-hidden="true"></div>
    {/if}
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
        <!-- the slot is always here, the link is not: only Quran Noor
             resolves to a real store page. Reserving the row keeps the copy
             column the same height on all nine products, which is the other
             half of the no-reflow contract (see appscreens.css). -->
        <div class="dv-cta">
          {#if item.href}
            <a class="stg-open" href={item.href} target="_blank" rel="noreferrer" data-cursor>
              View on the App Store ↗
            </a>
          {/if}
        </div>
        <!-- how far through the nine the scroll has carried the stage -->
        <div class="stg-count">
          <b>{two(i)}</b> / {two(N - 1)} — LOOM-built products
          <i aria-hidden="true" style="--w:{(i / (N - 1)) * 100}%"></i>
        </div>
      </div>

      <!-- The imagery column. Only the SELECTED item's pictures are mounted —
           keyed on `item.key` so the whole stage remounts (and replays its
           one entrance animation) rather than crossfading a stack of
           preloaded images.

           `kind` decides the mockup, and it is a fact about the product, not
           a styling choice: an iOS product gets three phones, a desktop tool
           gets a MacBook. A wide desktop capture is never crammed into a
           phone screen it was never shot for, and a portrait capture is
           never stretched across a laptop display.

           The fan reads shots[1] · shots[0] · shots[2] left to right, so the
           HERO capture is the one in the middle. Missing slots draw a
           placeholder rather than a hole. -->
      <div class="stg-panel">
        {#key item.key}
          <div class="dv-stage">
            {#if item.kind === 'panels'}
              <div class="dv-cards">
                <div class="dv-slot dv-slot--l">
                  {@render card(item.shots[1], item, 'app store panel 2')}
                </div>
                <div class="dv-slot dv-slot--m">
                  {@render card(item.shots[0], item, 'app store panel 1')}
                </div>
                <div class="dv-slot dv-slot--r">
                  {@render card(item.shots[2], item, 'app store panel 3')}
                </div>
              </div>
            {:else if item.kind === 'app'}
              <div class="dv-fan">
                <div class="dv-slot dv-slot--l">
                  {@render phone(item.shots[1], item, 'app screenshot 2')}
                </div>
                <div class="dv-slot dv-slot--m">
                  {@render phone(item.shots[0], item, 'app screenshot 1')}
                </div>
                <div class="dv-slot dv-slot--r">
                  {@render phone(item.shots[2], item, 'app screenshot 3')}
                </div>
              </div>
            {:else}
              <div class="dv-slot dv-slot--m">
                {@render laptop(item.shots[0], item)}
              </div>
            {/if}
          </div>
        {/key}
      </div>
    </div>
  </div>
  </div>
  </div>
</section>
