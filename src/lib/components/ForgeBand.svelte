<!--
  LOOM FORGE — "ONE ROW, FOUR STAGES".

  THE BRIEF, EXACTLY: build it like the reference canvas (a source picture on
  the left, connected across to the result on the right), but instead of one
  before/after, show the real progression — photo, then 3D with no texture,
  then the fur, then the textured model. All four in ONE LINE on desktop,
  stacked one below the other on mobile. And it must not be heavy.

  WHY THIS BEATS EVERY PREVIOUS VERSION OF THIS BAND. Four designs shipped
  before this one and all four were a picture of a product next to a paragraph
  about the product — a claim the reader has to take on trust. This row is not
  a claim. Tiles 2, 3 and 4 are the SAME FILE, rendered live, three times,
  with only the material changed: bare geometry, geometry plus the normal map,
  and the shipped textures. The reader is looking at the actual asset at each
  stage, turning, draggable. There is nothing left to take on trust, which is
  the whole reason this section exists.

  "IT MUST NOT BE HEAVY" — WHAT THAT COST, CONCRETELY:
    - The Meshy export is 58 MB (859k triangles, two 4K JPEGs). Re-authored
      offline with gltf-transform to 588 KB / 20k triangles / 1024px WebP. The
      fur lives in the normal map, so the triangle budget is nearly free.
    - ONE WebGL context and ONE mesh for all three 3D tiles — a single canvas
      spans the row and the renderer draws the mesh into three scissored
      viewports (see StageViews.js). Three <canvas> elements would have been
      three contexts and three uploads of the same model, on a page that
      already spends a context on the hero butterfly, against a measured iOS
      cap (see $three/glContext.js).
    - three + GLTFLoader + the GLB are dynamic-imported only when the row
      nears the viewport, and the context is RELEASED when it leaves.
    - The one rAF this component owns is IntersectionObserver-gated: off
      screen, nothing runs at all.
    - Tile rectangles are measured from the DOM on resize only, never per
      frame — so the same code drives the desktop row and the mobile stack
      without knowing which one it is looking at.
    - prefers-reduced-motion / save-data / no-WebGL: the canvas never mounts,
      and the three tiles fall back to stills of the same three stages. Same
      row, same four steps, no GL.
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
  let rowEl = $state(null) // the flex row (desktop) / stack (mobile) the canvas is stretched over
  let canvasEl = $state(null)
  let tileEls = $state([null, null, null]) // the three 3D tiles, in stage order — measured for the viewports
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

  /** Where each 3D tile sits, in CSS pixels relative to the canvas. Measured
   *  from the real elements so the desktop row and the mobile stack need no
   *  separate code path — and only on resize, never per frame. */
  function measure() {
    if (!canvasEl || !rowEl) return
    const c = canvasEl.getBoundingClientRect()
    if (views) {
      views.resize(canvasEl.clientWidth, canvasEl.clientHeight)
      views.setViews(
        tileEls.map((el) => {
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }
        })
      )
    }
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

  /* ═══ THE FOUR STAGES ═══
     Facts, not copy: site.js opens with "NOTHING IN THIS FILE IS A CLAIM" and
     that survives every redesign. A photograph goes in; about a minute passes;
     four named formats come back; it costs 2 JOD and the first is free. The
     stage names describe what is ON SCREEN in each tile — geometry, then the
     normal-mapped surface, then the textured material — because that is
     exactly what the renderer is drawing, and nothing here should describe a
     pipeline step the reader cannot see. */
  const STAGES = [
    { n: '01', name: 'Your photo', note: 'One picture. Any product.' },
    { n: '02', name: 'Geometry', note: 'Real mesh. No colour yet.' },
    { n: '03', name: 'Detail', note: 'Every hair, in the surface.' },
    { n: '04', name: 'Textured', note: 'Yours in GLB, FBX, OBJ, USDZ.' }
  ]
</script>

<!-- `id="forge"` lives on the band's own root — the anchor the long page's
     ORDER comment names, what a deep link into the 2D->3D pitch resolves to. -->
<section class="fgw" id="forge" bind:this={sectionEl} aria-label="LOOM Forge — send a photo, get a 3D model">
  <div class="fgw-head">
    <p class="fgw-kicker"><span>The 3D Lab</span></p>
    <h2 class="fgw-h">Photograph it once.<br />Sell it in 3D.</h2>
    <p class="fgw-lede">
      One photo goes in. About a minute later a real model comes back — the
      same object you can spin on your site, stand in a customer's room, or
      drop straight into a game.
    </p>
  </div>

  <!-- THE ROW. Four tiles, in one line on desktop, stacked on mobile.
       The three 3D tiles are EMPTY boxes: they hold no canvas of their own,
       they are just the rectangles the single shared renderer draws into (see
       StageViews.js). Their stills sit inside them as the loading state and
       as the permanent no-WebGL fallback. -->
  <div class="fgw-row" bind:this={rowEl}>
    {#if wantsCanvas}
      <!-- One canvas, stretched over the whole row, under the tiles' own
           chrome and above nothing else. `aria-hidden` because every tile it
           draws into is already labelled in the list below it. -->
      <canvas bind:this={canvasEl} class="fgw-canvas" class:is-ready={ready} aria-hidden="true"></canvas>
    {/if}

    <ol class="fgw-tiles">
      <li class="fgw-tile fgw-tile--photo">
        <figure class="fgw-frame">
          <picture>
            <source srcset="/img/forge/wolf-source.avif" type="image/avif" />
            <img src="/img/forge/wolf-source.webp" alt="The photograph that was sent — a grey wolf pup" width="760" height="868" loading="lazy" decoding="async" />
          </picture>
        </figure>
        <p class="fgw-cap"><span class="fgw-n">{STAGES[0].n}</span> {STAGES[0].name}</p>
        <p class="fgw-note">{STAGES[0].note}</p>
      </li>

      {#each [1, 2, 3] as i}
        <li class="fgw-tile">
          <div class="fgw-frame" bind:this={tileEls[i - 1]}>
            <!-- The still is what a reader sees while the GLB is in flight and
                 what they see forever without WebGL. It is a capture of this
                 same stage, not an illustration of it. -->
            <img
              class="fgw-still"
              class:is-hidden={ready}
              src={`/img/forge/wolf-stage-${i}.webp`}
              alt={i === 1
                ? 'The wolf pup as bare 3D geometry, untextured'
                : i === 2
                  ? 'The same model with its surface detail, showing the fur'
                  : 'The finished model with its textures applied'}
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

  <div class="fgw-foot">
    <p class="fgw-price">
      <strong>2 JOD</strong> <span>a model.</span> <em>Your first is free.</em>
    </p>
    <div class="fgw-cta">
      <WoolButton label="Make one free" photo={false} yarn="magenta" onclick={onmake} />
    </div>
    {#if wantsCanvas}
      <p class="fgw-hint">Drag to turn all three</p>
    {/if}
  </div>
</section>

<style>
  /* The board: the site's ink, with the reference's dotted canvas grid. The
     dots are a 22px repeating radial gradient rather than an image — one
     paint, no request, and it scales with the section instead of tiling at a
     fixed device size. */
  .fgw {
    position: relative;
    isolation: isolate;
    /* The generous bottom padding is not taste: this site carries a fixed
       "Start a project" pill and a chat widget along the bottom of every
       screen, and at the tighter value the price line and the button sat
       underneath both of them. */
    padding: clamp(64px, 9vw, 128px) clamp(20px, 5vw, 72px) clamp(96px, 11vw, 160px);
    background:
      radial-gradient(circle at 1px 1px, rgba(242, 240, 247, 0.07) 1px, transparent 0) 0 0 / 22px 22px,
      radial-gradient(120% 90% at 78% 20%, color-mix(in srgb, var(--cyan) 12%, transparent), transparent 60%),
      var(--ink);
  }

  .fgw-head { max-width: 46rem; margin: 0 auto clamp(36px, 5vw, 64px); text-align: center; }
  .fgw-kicker {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 0 0 0.7rem;
    font-family: var(--display);
    font-size: 0.78rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(242, 240, 247, 0.7);
  }
  .fgw-kicker span { color: var(--cyan); }
  .fgw-kicker::before,
  .fgw-kicker::after { content: ''; height: 1px; width: 46px; background: rgba(242, 240, 247, 0.28); }
  .fgw-h {
    margin: 0 0 0.7rem;
    font-family: var(--bloom);
    font-weight: 620;
    font-size: clamp(2rem, 4.2vw, 3.1rem);
    line-height: 1.05;
    color: #f2f0f7;
  }
  .fgw-lede {
    margin: 0 auto;
    max-width: 46ch;
    font-size: clamp(1rem, 1.25vw, 1.1rem);
    line-height: 1.55;
    color: rgba(242, 240, 247, 0.82);
  }

  /* ——— THE ROW ———
     `position: relative` because the shared canvas is absolutely positioned
     over it; everything below sizes the four tiles inside it. */
  .fgw-row { position: relative; max-width: 1400px; margin: 0 auto; }

  /* ONE CANVAS, THE WHOLE ROW. It is not interactive furniture — it is a
     drawing surface the tiles are cut out of — so it sits under the tile
     captions and takes pointer events only where a tile is (the tiles
     themselves are pointer-transparent; see .fgw-frame). */
  .fgw-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.5s ease;
    cursor: grab;
  }
  .fgw-canvas.is-ready { opacity: 1; }
  .fgw-canvas:active { cursor: grabbing; }

  /* FOUR EQUAL COLUMNS ON DESKTOP — "all in one line", and equal because the
     four stages are four steps of one process, not a hero plus three
     footnotes. The connectors between them are drawn on the tiles' own ::after
     (see below) rather than as separate elements, so a wrapped or stacked
     layout can simply turn them off. */
  .fgw-tiles {
    position: relative;
    z-index: 2;
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: clamp(16px, 2.4vw, 40px);
  }
  .fgw-tile {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  /* THE CONNECTOR — the reference's blue line between panels, as a hairline
     with a lit dot at each end, sitting in the gutter to the tile's left.
     Drawn from the tile rather than as its own element so it disappears with
     `:first-child` and at the stacked breakpoint without any extra markup. */
  .fgw-tile + .fgw-tile::before {
    content: '';
    position: absolute;
    top: 28%;
    right: 100%;
    width: clamp(16px, 2.4vw, 40px);
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--cyan), transparent);
    opacity: 0.75;
  }
  .fgw-tile + .fgw-tile::after {
    content: '';
    position: absolute;
    top: 28%;
    right: calc(100% - 3px);
    width: 5px;
    height: 5px;
    margin-top: -2px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 10px 2px color-mix(in srgb, var(--cyan) 45%, transparent);
  }

  /* The tile's window. Square, because the renderer frames the model to a
     square viewport — a non-square frame would letterbox the model rather
     than crop it, and the four tiles would stop reading as one row. */
  /* THE FRAME IS A WINDOW, NOT A CARD, and on the three 3D tiles that is
     load-bearing rather than stylistic: the shared canvas is painted UNDER
     the tile list, so anything opaque in here — a background fill, a
     backdrop-filter — hides the very thing the tile exists to show. The
     first capture of this design had exactly that fault: three softly
     frosted panes with the stills showing through and the live render
     invisible behind them. The 3D tiles therefore carry a border and
     nothing else; only the photo tile, which has a real image inside it,
     gets a surface. */
  .fgw-frame {
    position: relative;
    margin: 0;
    aspect-ratio: 1 / 1;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(242, 240, 247, 0.14);
    pointer-events: none; /* the drag target is the canvas UNDER these boxes — a tile that swallowed the pointer would make the model undraggable exactly where the model is */
  }
  .fgw-tile--photo .fgw-frame {
    background: linear-gradient(160deg, rgba(242, 240, 247, 0.07), rgba(242, 240, 247, 0.02));
  }
  .fgw-frame img { display: block; width: 100%; height: 100%; object-fit: cover; }

  /* The stills sit inside the 3D tiles and fade out under the live canvas
     once a real frame has painted. They are never removed: without WebGL the
     canvas element does not exist at all and these are the row. */
  .fgw-still { transition: opacity 0.5s ease; opacity: 1; }
  .fgw-still.is-hidden { opacity: 0; }

  .fgw-cap {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin: 0.35rem 0 0;
    font-family: var(--display);
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(242, 240, 247, 0.92);
  }
  .fgw-n { color: var(--cyan); }
  .fgw-note {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.4;
    color: rgba(242, 240, 247, 0.58);
  }

  /* ——— THE CLOSE ———
     Price, button, and the one line that tells the reader the row is
     interactive. Centred under the row: the four tiles are the argument and
     this is what to do about it. */
  /* PRICE LEFT, BUTTON RIGHT — deliberately NOT a centred stack. The site
     carries a fixed "Start a project" pill at the bottom centre of every
     screen, and a centred close puts this band's own price and button
     directly underneath it whenever the two line up. Pushing them to the
     outer edges of the row means the fixed pill lands in the gap between
     them instead of on top of either. */
  .fgw-foot {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem clamp(20px, 3vw, 40px);
    max-width: 1400px;
    margin: clamp(36px, 5vw, 60px) auto 0;
  }
  .fgw-price {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    column-gap: 0.5rem;
    margin: 0;
  }
  .fgw-price strong {
    font-family: var(--bloom);
    font-weight: 620;
    color: #f2f0f7;
    font-size: clamp(1.8rem, 2.8vw, 2.4rem);
    line-height: 1;
  }
  .fgw-price span { font-size: 1rem; color: rgba(242, 240, 247, 0.72); }
  .fgw-price em { font-style: normal; font-size: 0.95rem; color: var(--cyan); }
  /* The button sits beside the price, both on the LEFT. Not spread to the
     outer edges as first built: the right edge is where this site's fixed
     chat widget lives, and the knitted pill landed underneath it. The whole
     close therefore keeps to the half of the band nothing is floating over —
     the fixed pill sits centre, the widget sits right, this sits left. */
  .fgw-cta { margin: 0; }
  .fgw-hint {
    flex-basis: 100%;
    margin: 0;
    font-family: var(--display);
    font-size: 0.64rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(242, 240, 247, 0.42);
  }

  /* ——— TABLET: two by two ———
     Four tiles across a 900px viewport puts each one under 200px, which is
     below the size at which the difference between "geometry" and "detail" —
     the entire point of the row — is visible. Two by two keeps them legible
     while still reading left to right, top to bottom, in stage order. */
  @media (max-width: 1000px) and (min-width: 641px) {
    .fgw-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .fgw-tile:nth-child(3)::before,
    .fgw-tile:nth-child(3)::after { display: none; } /* the connector would point at the tile above it, not the one before it */
  }

  /* ——— PHONE: one below the other, as asked ———
     The connector rotates with the layout: it now runs vertically in the gap
     above each tile, so the row still reads as a sequence rather than as four
     unrelated cards. */
  @media (max-width: 640px) {
    .fgw-tiles {
      grid-template-columns: minmax(0, 1fr);
      gap: clamp(28px, 7vw, 44px);
      max-width: 380px;
      margin: 0 auto;
    }
    .fgw-tile + .fgw-tile::before {
      top: auto;
      right: auto;
      left: 50%;
      bottom: 100%;
      width: 1px;
      height: clamp(28px, 7vw, 44px);
      background: linear-gradient(180deg, transparent, var(--cyan), transparent);
    }
    .fgw-tile + .fgw-tile::after {
      top: auto;
      right: auto;
      left: 50%;
      margin-left: -2px;
      bottom: calc(100% - 3px);
    }
    .fgw-cap { justify-content: flex-start; }
  }

  @media (prefers-reduced-motion: reduce) {
    /* Belt and braces alongside the JS gate: no reduced-motion visitor watches
       anything move here. The stills are the row. */
    .fgw-canvas, .fgw-still { transition: none; }
    .fgw-canvas { display: none; }
    .fgw-still { opacity: 1; }
  }
</style>
