<!--
  LOOM FORGE — "PHOTO, ASK, MODEL".

  THE SHAPE, per the reference canvas the client keeps pointing at: the picture
  you already have, a curved connector, the thing you ask for on a little card,
  another connector, and what comes back. Three panels, not four — the middle
  "detail" pass was cut on instruction, and it was the right cut: bare grey and
  normal-mapped grey were the two panels hardest to tell apart at tile size.

  WHY THIS IS NOT A PICTURE OF THE PRODUCT. Panels 2 and 3 are ONE GLB rendered
  live, twice, in the same second, under the same lights, with only the
  material swapped: bare geometry, then the textures the file ships with. They
  turn continuously so nobody has to be told they are 3D. Everything the band
  claims is on screen being done.

  THE GROUND IS THE SITE'S OWN PAPER, and that was a real bug, not a taste
  change. This band shipped on dark violet with cyan accents while the page
  around it has been baby pink (`--bg: #ffe9f2`, ink `#33243d`) since the
  10 Aug repaint. A dark slab in a light page reads as a panel someone forgot
  to restyle — which is exactly what "look how it looks cheap" was describing.
  Every colour here now comes from styles.css's tokens, and TEXT accents use
  --accent-ink / --magenta-deep rather than the bright yarns, per the rule
  those tokens carry: bright yarn for rules, bars and dots; ink-range mixes
  for anything with letterforms in it.

  "IT MUST NOT BE HEAVY" — WHAT THAT COST, CONCRETELY:
    - The Meshy export is 58 MB (859k triangles, two 4K JPEGs). Re-authored
      offline with gltf-transform to 588 KB / 20k triangles / 1024px WebP. The
      fur lives in the normal map, so the triangle budget is nearly free.
    - ONE WebGL context and ONE mesh for both 3D panels — a single canvas spans
      the row and the renderer draws the mesh into two scissored viewports (see
      StageViews.js). Two canvases would have been two more contexts on a page
      that already spends one on the hero butterfly, against a measured iOS cap
      (see $three/glContext.js).
    - three + GLTFLoader + the GLB are dynamic-imported only when the row nears
      the viewport, and the context is RELEASED when it leaves.
    - The one rAF this component owns is IntersectionObserver-gated.
    - Panel rectangles are measured from the DOM on resize only, never per
      frame — so the same code drives the desktop row and the mobile stack.
    - prefers-reduced-motion / save-data / no-WebGL: the canvas never mounts and
      the panels fall back to stills captured from these same two renders.
-->
<script>
  import { onMount } from 'svelte'
  import { reducedMotion, prefersReduced } from '$lib/motion.svelte.js'
  import { hasWebGL } from '$three/webglSupport.js'
  import WoolButton from '$lib/components/WoolButton.svelte'

  /** The band's ONE action. Forge.svelte owns the popup and passes its opener
   *  in; this component never opens anything itself — the popup carries auth,
   *  upload, payment and entitlement, and a band that could open it on its own
   *  would be a second place for that funnel to start. */
  let { onmake = () => {} } = $props()

  let sectionEl = $state(null)
  let rowEl = $state(null) // the row (desktop) / stack (mobile) the canvas is stretched over
  let canvasEl = $state(null)
  let tileEls = $state([null, null]) // the two 3D panels, in stage order — measured for the viewports
  let ready = $state(false) // first real frame painted — crossfade stills -> canvas
  let wantsCanvas = $state(false) // decided once in onMount: webgl + no save-data + not reduced

  let views = null // the StageViews instance, once its module has loaded
  let loadPromise = null // de-dupes ensure() if the IO fires again before the first load resolves
  let wantsVisible = false // io's last known state; a load resolving AFTER the row scrolled away must not acquire a context nobody asked for

  let raf = 0
  let running = false
  let io = null // starts/stops the rAF loop AND acquires/releases the GL context
  let ro = null

  /** save-data is a direct ask not to spend a reader's data on something
   *  decorative (same check Flyer.svelte makes for the butterfly hero); a
   *  failed hasWebGL() probe means the renderer's own constructor would throw
   *  anyway. Either one routes to the stills, never to a half-built WebGL
   *  layer discovered broken only after three.js has loaded. */
  function allowed() {
    try { if (navigator.connection?.saveData) return false } catch { /* API doesn't exist here; not a reason to bail */ }
    return hasWebGL()
  }

  /** Where each 3D panel sits, in CSS pixels relative to the canvas. Measured
   *  from the real elements so the desktop row and the mobile stack need no
   *  separate code path — and only on resize, never per frame. */
  function measure() {
    if (!canvasEl || !rowEl || !views) return
    const c = canvasEl.getBoundingClientRect()
    views.resize(canvasEl.clientWidth, canvasEl.clientHeight)
    views.setViews(
      tileEls.map((el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }
      })
    )
  }

  async function ensure() {
    if (!loadPromise) {
      loadPromise = (async () => {
        const { StageViews } = await import('./StageViews.js')
        if (!canvasEl) return null
        const v = new StageViews(canvasEl)
        try { await v.load() } catch (e) { v.dispose(); return null }
        return v
      })()
    }
    return loadPromise
  }

  async function enter() {
    wantsVisible = true
    const v = await ensure()
    if (!v || !wantsVisible) return // load failed, or the row left again while the GLB was in flight
    views = v
    if (!canvasEl?.clientWidth) return
    views.acquire(canvasEl.clientWidth, canvasEl.clientHeight)
    measure()
    views.renderFrame(performance.now() / 1000) // paint one frame immediately — otherwise the crossfade reveals a blank canvas until the next tick, a visible flash of nothing on a slow device
    ready = true
  }

  function exit() {
    wantsVisible = false
    views?.release() // hands the GL context back; see the file header
  }

  function frame(t) {
    if (!running) return
    views?.renderFrame(t / 1000)
    raf = requestAnimationFrame(frame)
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame) } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 }

  onMount(() => {
    // THE INITIAL GATE USES prefersReduced(), NOT reducedMotion.current — the
    // shared rune is armed from +layout.svelte's onMount, and Svelte runs a
    // DEEPER component's onMount before an ancestor's completes, so a
    // genuinely reduced-motion browser can still read reducedMotion.current as
    // false right here, at the one moment this file only gets to ask once.
    const startReduced = prefersReduced()
    wantsCanvas = !startReduced && allowed()

    window.addEventListener('resize', measure)
    ro = new ResizeObserver(measure)
    if (rowEl) ro.observe(rowEl)

    if (wantsCanvas) {
      // One observer for both jobs: the rAF loop and the GL context have the
      // same answer to "is this on screen", and splitting them into two
      // observers with two margins is how they end up disagreeing.
      io = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { enter(); start() } else { stop(); exit() } },
        { rootMargin: '400px 0px' }
      )
      io.observe(sectionEl)
    }

    // A MID-SESSION TOGGLE, unlike the initial gate above, is exactly what the
    // live rune is for — this effect only starts existing once the rune is
    // guaranteed armed, so there is no ordering race left. Turning reduced
    // motion on stops the turn and hands back the context; the stills are
    // already in the DOM underneath, so the row keeps working.
    let wasReduced = startReduced
    const unwatch = $effect.root(() => {
      $effect(() => {
        const now = reducedMotion.current
        if (now === wasReduced) return
        wasReduced = now
        if (now) { stop(); exit(); ready = false; wantsCanvas = false }
      })
    })

    return () => {
      unwatch()
      window.removeEventListener('resize', measure)
      ro?.disconnect()
      io?.disconnect()
      views?.dispose()
      stop()
    }
  })

  /* ═══ THE THREE PANELS ═══
     Facts, not copy: site.js opens with "NOTHING IN THIS FILE IS A CLAIM" and
     that survives every redesign. A photograph goes in; about a minute passes;
     four named formats come back; it costs 2 JOD and the first is free. The
     panel names describe what is ON SCREEN — a photo, geometry with no colour,
     the textured model — because that is exactly what the renderer is drawing,
     and nothing here should name a pipeline step the reader cannot see. */
  const STAGES = [
    { n: '01', name: 'Your photo', note: 'One picture. Any product.' },
    { n: '02', name: 'Geometry', note: 'Real mesh. No colour yet.' },
    { n: '03', name: 'Your model', note: 'GLB, FBX, OBJ, USDZ.' }
  ]
</script>

<!-- `id="forge"` lives on the band's own root — the anchor the long page's
     ORDER comment names, what a deep link into the 2D->3D pitch resolves to. -->
<section class="fgw" id="forge" bind:this={sectionEl} aria-label="LOOM Forge — send a photo, get a 3D model">
  <div class="fgw-head">
    <p class="fgw-kicker"><span>The 3D Lab</span></p>
    <h2 class="fgw-h">One photo in.<br />A real model back.</h2>
    <p class="fgw-lede">
      Send the picture you already have. About a minute later it returns as
      real geometry you can turn, light and drop into a website, a room or a game.
    </p>
  </div>

  <!-- THE ROW. Photo → bubble → geometry → model, with a curved connector in
       every gap. The two 3D panels are EMPTY boxes: they hold no canvas of
       their own, they are the rectangles the single shared renderer draws
       into (see StageViews.js). -->
  <div class="fgw-row" bind:this={rowEl}>
    {#if wantsCanvas}
      <!-- One canvas over the whole row. It sits ABOVE the panels rather than
           behind them: the panels are white cards now, and a card with a
           background is opaque to anything underneath it. Only the two
           scissored rectangles are ever painted, so the rest of this element
           stays fully transparent and the captions below read through it. -->
      <canvas bind:this={canvasEl} class="fgw-canvas" class:is-ready={ready} aria-hidden="true"></canvas>
    {/if}

    <ol class="fgw-tiles">
      <li class="fgw-tile fgw-tile--photo">
        <!-- FULL FRAME, NOT CROPPED. This panel used to be forced square like
             its neighbours, which cut the pup's ears and tail off — the one
             panel whose whole job is to be "the picture you already have" was
             the only one not showing a whole picture. It takes the image's own
             aspect ratio now, so nothing is cropped at any width. -->
        <figure class="fgw-frame fgw-frame--photo">
          <picture>
            <source srcset="/img/forge/wolf-source.avif" type="image/avif" />
            <img src="/img/forge/wolf-source.webp" alt="The photograph that was sent — a grey wolf pup" width="760" height="868" loading="lazy" decoding="async" />
          </picture>
        </figure>
        <p class="fgw-cap"><span class="fgw-n">{STAGES[0].n}</span> {STAGES[0].name}</p>
        <p class="fgw-note">{STAGES[0].note}</p>
      </li>

      <li class="fgw-link" aria-hidden="true"><i></i><i></i></li>

      <!-- THE BUBBLE — the reference's prompt card, and the piece the last
           build was missing. It is what turns three pictures into a sentence:
           the picture, the thing you ask for, the thing that comes back. It
           shows an upload and a request rather than a text field, because
           Forge takes a photo and a button — inventing a prompt box here would
           send readers looking for one that does not exist. -->
      <li class="fgw-bubble" aria-hidden="true">
        <div class="fgw-bubble-bar"><span>LOOM Forge</span></div>
        <div class="fgw-bubble-body">
          <p class="fgw-bubble-ask">Make this 3D.</p>
          <p class="fgw-bubble-file"><span></span>wolf-pup.jpg</p>
        </div>
      </li>

      <li class="fgw-link" aria-hidden="true"><i></i><i></i></li>

      {#each [1, 2] as i}
        {#if i === 2}
          <li class="fgw-link" aria-hidden="true"><i></i><i></i></li>
        {/if}
        <li class="fgw-tile">
          <div class="fgw-frame" bind:this={tileEls[i - 1]}>
            <!-- The still is what a reader sees while the GLB is in flight and
                 what they see forever without WebGL. It is a capture of this
                 same render, not an illustration of it. -->
            <img
              class="fgw-still"
              class:is-hidden={ready}
              src={`/img/forge/wolf-stage-${i}.webp`}
              alt={i === 1
                ? 'The wolf pup as bare 3D geometry, untextured'
                : 'The finished 3D model with its textures applied'}
              width="520"
              height="520"
              loading="lazy"
              decoding="async"
            />
          </div>
          <p class="fgw-cap"><span class="fgw-n">{STAGES[i].n}</span> {STAGES[i].name}</p>
          <p class="fgw-note">{STAGES[i].note}</p>
        </li>
      {/each}
    </ol>
  </div>

  <!-- ——— THE CLOSE ———
       The previous version put a display-size "2 JOD", a cyan sentence that
       looked like a link, and a knitted pill in a centred stack on a dark
       slab — "look how it looks cheap", and correctly. Money is set quietly
       here: the number at reading size in the ink the rest of the page uses,
       the unit beside it, and "first one free" as a bordered tag rather than
       a coloured sentence, so nothing shouts and nothing looks like a
       discount sticker. -->
  <div class="fgw-foot">
    <p class="fgw-price">
      <strong>2 JOD</strong>
      <span class="fgw-per">per model</span>
      <span class="fgw-free">First one free</span>
    </p>
    <div class="fgw-cta">
      <WoolButton label="Make one free" photo={false} yarn="magenta" onclick={onmake} />
    </div>
    {#if wantsCanvas}
      <p class="fgw-hint">Drag either model to turn it</p>
    {/if}
  </div>
</section>

<style>
  /* ——— THE BOARD ———
     The site's own paper, with the reference's dotted canvas grid drawn in the
     shared --line token. The dots are a repeating radial gradient rather than
     an image: one paint, no request, and it scales with the section instead of
     tiling at a fixed device size. The band is SHORTER than it was — the
     padding was carrying a dark-slab's worth of air that a paper section on a
     paper page does not need. */
  .fgw {
    position: relative;
    isolation: isolate;
    padding: clamp(48px, 6vw, 84px) clamp(20px, 4vw, 56px) clamp(56px, 6vw, 88px);
    color: var(--ink);
    background:
      radial-gradient(circle at 1px 1px, var(--line) 1px, transparent 0) 0 0 / 24px 24px,
      linear-gradient(180deg, #fff6fa 0%, var(--bg) 55%, var(--bg-2) 100%);
  }

  .fgw-head { max-width: 44rem; margin: 0 auto clamp(28px, 3.4vw, 44px); text-align: center; }
  .fgw-kicker {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 0 0 0.6rem;
    font-family: var(--display);
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .fgw-kicker span { color: var(--accent-ink, var(--magenta-deep)); }
  .fgw-kicker::before,
  .fgw-kicker::after { content: ''; height: 1px; width: 40px; background: var(--line); }
  .fgw-h {
    margin: 0 0 0.6rem;
    font-family: var(--bloom);
    font-weight: 620;
    font-size: clamp(1.9rem, 3.4vw, 2.7rem);
    line-height: 1.06;
    color: var(--ink);
  }
  .fgw-lede {
    margin: 0 auto;
    max-width: 48ch;
    font-size: clamp(0.95rem, 1.15vw, 1.05rem);
    line-height: 1.55;
    color: var(--ink-dim);
  }

  .fgw-row { position: relative; max-width: 1180px; margin: 0 auto; }

  /* ONE CANVAS, THE WHOLE ROW, ON TOP. It is a drawing surface the panels are
     cut out of, not furniture: only the two scissored rectangles are ever
     painted, everything else stays transparent. It takes the pointer because
     dragging the models IS the interaction. */
  .fgw-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
    opacity: 0;
    transition: opacity 0.5s ease;
    cursor: grab;
  }
  .fgw-canvas.is-ready { opacity: 1; }
  .fgw-canvas:active { cursor: grabbing; }

  /* Seven columns: three panels, the bubble, and a connector in each gap. The
     connectors are real grid items rather than pseudo-elements so that the
     mobile stack gets them for free — they simply become rows. */
  .fgw-tiles {
    position: relative;
    z-index: 1;
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: 1.1fr auto 0.95fr auto 1fr auto 1fr;
    align-items: stretch;
    gap: clamp(8px, 1.2vw, 18px);
  }
  /* THE PANELS BOTTOM-ALIGN, so the three caption blocks land on one line.
     The photo keeps its own taller ratio (it must — cropping it was the last
     fault fixed here), which means the panels genuinely are different heights;
     letting them all start at the top put the three "01 / 02 / 03" labels at
     three different heights, which read as a broken row rather than as a
     sequence. `margin-top: auto` on the frame pushes each panel to the bottom
     of an equal-height cell, and the captions follow it. */
  .fgw-tile { display: flex; flex-direction: column; justify-content: flex-end; gap: 0.4rem; }
  .fgw-frame { margin-top: auto; }

  /* THE CONNECTOR — the reference's curved blue line, as a stretched SVG in a
     background image (one cubic from the lower-left to the upper-right, drawn
     with preserveAspectRatio="none" so the SAME path serves the wide desktop
     gap and the tall mobile one) plus a lit dot at each end as real elements.
     The dots are elements and not part of the SVG on purpose: non-uniform
     stretching would turn circles into ellipses, and the ellipse would be
     wildly different in the two orientations. */
  .fgw-link {
    position: relative;
    align-self: center;
    width: clamp(28px, 3.4vw, 54px);
    height: 54px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 60' preserveAspectRatio='none'%3E%3Cpath d='M2,52 C36,52 62,8 98,8' fill='none' stroke='%23f21c8c' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-size: 100% 100%;
  }
  .fgw-link i {
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--magenta);
  }
  .fgw-link i:first-child { left: -3px; bottom: calc(13% - 3px); }
  .fgw-link i:last-child { right: -3px; top: calc(13% - 3px); }

  /* ——— THE PANELS ———
     White cards on paper, the way the reference's panels sit on its canvas.
     Square for the two 3D panels because the renderer frames the model to a
     square viewport; the photo panel keeps the picture's own ratio. */
  .fgw-frame {
    position: relative;
    margin: 0 0 0; /* top margin is set to auto above — see the bottom-align note */
    aspect-ratio: 1 / 1;
    border-radius: 16px;
    overflow: hidden;
    background: #fff;
    border: 1px solid var(--line);
    box-shadow: 0 18px 34px -26px rgba(51, 36, 61, 0.55);
  }
  .fgw-frame--photo { aspect-ratio: 760 / 868; }
  .fgw-frame img { display: block; width: 100%; height: 100%; object-fit: cover; }

  /* The stills sit inside the 3D panels and fade out as the live canvas above
     them comes up. They are never removed: without WebGL the canvas element
     does not exist at all and these are the row. */
  .fgw-still { transition: opacity 0.5s ease; opacity: 1; }
  .fgw-still.is-hidden { opacity: 0; }

  .fgw-cap {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    margin: 0.5rem 0 0;
    font-family: var(--display);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink);
  }
  .fgw-n { color: var(--accent-ink, var(--magenta-deep)); }
  .fgw-note { margin: 0; font-size: 0.85rem; line-height: 1.4; color: var(--ink-faint); }

  /* ——— THE BUBBLE ———
     The reference's prompt card: a titled bar over a white body. Same card
     language as the panels (radius, hairline, the same shadow) so it belongs
     to the row rather than floating over it. */
  .fgw-bubble {
    align-self: center;
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
    border: 1px solid var(--line);
    box-shadow: 0 18px 34px -26px rgba(51, 36, 61, 0.55);
  }
  .fgw-bubble-bar {
    padding: 0.5rem 0.75rem;
    background: var(--ink);
    font-family: var(--display);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.86);
  }
  .fgw-bubble-body { padding: 0.85rem 0.8rem 0.9rem; }
  .fgw-bubble-ask {
    margin: 0 0 0.6rem;
    font-size: clamp(0.9rem, 1.1vw, 1.02rem);
    line-height: 1.3;
    color: var(--ink);
  }
  .fgw-bubble-file {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    font-family: var(--display);
    font-size: 0.68rem;
    color: var(--ink-faint);
  }
  .fgw-bubble-file span {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    background: linear-gradient(140deg, var(--magenta), var(--violet));
    flex: 0 0 auto;
  }

  /* ——— THE CLOSE ———
     Price left, button beside it: this site carries a fixed "Start a project"
     pill at bottom centre and a chat widget at bottom right, and a centred
     close lands underneath both. */
  .fgw-foot {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.8rem clamp(16px, 2.4vw, 32px);
    max-width: 1180px;
    margin: clamp(28px, 3.4vw, 44px) auto 0;
  }
  .fgw-price {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin: 0;
  }
  .fgw-price strong {
    font-family: var(--bloom);
    font-weight: 620;
    font-size: 1.5rem; /* reading size, not display size — see the markup's note. A number set at 2.4rem next to a knitted button was the loudest thing in the band and the least persuasive */
    line-height: 1;
    color: var(--ink);
  }
  .fgw-per { font-size: 0.92rem; color: var(--ink-faint); }
  .fgw-free {
    align-self: center;
    padding: 0.2rem 0.6rem;
    border: 1px solid color-mix(in srgb, var(--magenta) 45%, transparent);
    border-radius: 999px;
    font-family: var(--display);
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-ink, var(--magenta-deep));
  }
  .fgw-cta { margin: 0; }
  .fgw-hint {
    flex-basis: 100%;
    margin: 0;
    font-family: var(--display);
    font-size: 0.64rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  /* ——— TABLET ———
     The row breaks after the bubble: photo and bubble on the first line, the
     two 3D panels on the second. Four columns of ~150px would put the two
     renders below the size at which "grey mesh" and "textured" are legibly
     different, which is the entire argument. */
  @media (max-width: 1080px) and (min-width: 681px) {
    .fgw-tiles { grid-template-columns: 1.15fr auto 1fr; row-gap: clamp(20px, 3vw, 32px); }
    .fgw-link:nth-of-type(2) { display: none; } /* the connector that would have crossed the line break */
  }

  /* ——— PHONE: one below the other, as asked ———
     Same items, one column. The connector's SVG stretches from a wide short
     box to a tall narrow one without changing a single path coordinate. */
  @media (max-width: 680px) {
    .fgw-tiles {
      grid-template-columns: minmax(0, 1fr);
      justify-items: stretch;
      max-width: 340px;
      margin: 0 auto;
      gap: 0;
    }
    .fgw-link {
      width: 44px;
      height: clamp(30px, 8vw, 44px);
      justify-self: center;
      margin: 0.35rem 0;
    }
    .fgw-link i:first-child { left: calc(13% - 3px); bottom: -3px; }
    .fgw-link i:last-child { right: calc(13% - 3px); top: -3px; }
    .fgw-bubble { align-self: stretch; }
    .fgw-foot { justify-content: flex-start; }
  }

  @media (prefers-reduced-motion: reduce) {
    /* Belt and braces alongside the JS gate: no reduced-motion visitor watches
       anything move here. The stills are the row. */
    .fgw-canvas, .fgw-still { transition: none; }
    .fgw-canvas { display: none; }
    .fgw-still { opacity: 1; }
  }
</style>
