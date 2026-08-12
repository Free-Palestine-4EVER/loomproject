<!--
  #forge — LAB CONCEPT 1 of 3 — "THE SCAN LINE"

  FOUR DESIGNS REJECTED BEFORE THIS ONE, ALL FOR THE SAME REASON: they showed
  a photograph of a sofa. Split slider, three stills, a turntable, a diptych —
  four different chrome around one unchanging move, "here is a picture of the
  product." The client is not tired of a layout. He is tired of the section
  being a photo booth for furniture.

  SO THIS ONE HAS NO PHOTOGRAPH IN IT. Not stage-photo, not stage-mesh, not
  stage-model, not a stock render standing in for them — nothing beige, no
  furniture, nothing drawn to LOOK like a captured image. Every pixel here is
  type, CSS shape and gradient. The section does not show the pipeline
  working on an object. It performs the pipeline ON ITSELF: a cyan scan line
  drops down the band as the visitor scrolls, and everything above it stays
  flat 2D type while everything the line has already passed is rebuilt with
  real depth — extruded headline, a wireframe floor, volumetric shapes, a
  cast shadow. The demo is not a picture of a conversion. It IS one.

  WHY THE HEADLINE IS LITERALLY WRITTEN TWICE. `.headline-flat` and
  `.headline-3d` are the same copy, "Send a photo. Get a 3D model back.",
  stacked in the same box. Only one of the two is ever the accessible one —
  `.headline-3d` carries the real `<h2 id>`; `.headline-flat` is
  `aria-hidden`, a duplicate for the eye only, the way forge.css already
  layers a mesh image and a model image over the same photograph rather than
  cross-fading one image into another (see its "WHY TWO WIPES AND NOT THREE
  LAYERS FADING" note). Same reasoning here: `clip-path: inset()` is
  composited and free, and unlike an opacity cross-fade it never shows a
  flat letterform ghosted through an extruded one at the seam.

  --scan IS A REGISTERED PERCENTAGE, same reason forge.css registers --t: an
  unregistered custom property is a string to the engine and cannot be
  interpolated by a scroll-driven animation, only re-declared per frame. Its
  `initial-value: 50%` is not decoration, it is the whole answer to "what
  does a visitor see who never scrolls at all" — see the block below.

  WHICH WAY --scan MOVES, AND WHY IT IS NOT THE OBVIOUS WAY. --scan is the
  beam's distance from the TOP of the stage; the flat layer always occupies
  0 → scan, the 3D layer always occupies scan → 100%. A "scanner sweeping
  down the page" reads as scan counting UP, and that was the first version —
  wrong, because a growing scan value grows the FLAT region and shrinks the
  3D one, so scrolling further into the section made more of it revert to
  flat. The pitch is the opposite: keep scrolling and MORE of the section
  should read as converted. So scan counts DOWN, 50% → 6%, and the visible
  motion is the beam retreating toward the top edge while the dimensional
  floor and the extruded type fill in beneath it — by the time a reader has
  scrolled past, only a thin flat margin is left at the very top, under the
  kicker, as the "before" the rest of the band has clearly moved past.

  SCROLL-DRIVEN, THE SAME IDIOM AS ScrollProgress.svelte's --t: `animation-
  timeline: view()` moves --scan on the compositor, no JS, no scroll
  listener, while it is supported (Chrome/Edge, current Safari). Unlike
  ScrollProgress's `scroll()` — which tracks the WHOLE document — this needs
  `view()`, which tracks this element's OWN transit through the viewport, so
  the sweep belongs to the section instead of to the page.

  THE PARK POSITION IS THE INITIAL VALUE, NOT A SEPARATE STATE. The keyframe
  animation is `animation-fill-mode: forwards` (not `both`): before the view-
  timeline range starts, no keyframe is in effect at all, so the registered
  property falls back to its own `initial-value`, 50% — dead on the
  headline's own midline, so the clip cuts straight through the letterforms
  at rest: top halves flat, bottom halves already extruded. That is one CSS
  declaration doing three jobs at once:
  it is what a visitor sees before scrolling ("the split is visible before
  any scroll happens", per the brief), it is what every browser without
  `view()` support sees permanently, and it is what `prefers-reduced-motion`
  gets by simply never attaching the animation. No separate "parked" markup,
  no separate reduced-motion layout — one property, three call sites, same
  value.

  FALLBACK FOR BROWSERS WITHOUT view(): a plain scroll listener, same shape
  as ScrollProgress.svelte's rAF path — feature-detected once on mount, and
  attached ONLY where the CSS timeline is missing, so a capable browser never
  pays for both. It is skipped entirely under reduced motion, which is what
  leaves those readers on the static 50% park position rather than a hand-
  rolled substitute animation.
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import WoolButton from '$lib/components/WoolButton.svelte'

  let stageEl = $state(null)
  let needsJs = $state(false)

  onMount(() => {
    if (!browser) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Reduced motion: attach nothing. The registered --scan initial-value
    // (50%) is already a legitimate, readable, half-flat/half-3D layout —
    // that is the point of putting the park position IN the property rather
    // than in a JS branch.
    if (reduced) return
    if (CSS.supports('animation-timeline', 'view()')) return

    needsJs = true
    let raf = 0
    let queued = false

    const write = () => {
      queued = false
      if (!stageEl) return
      const r = stageEl.getBoundingClientRect()
      const vh = window.innerHeight
      // Mirrors the CSS `animation-range: entry 25% cover 75%` below: the
      // sweep starts once the stage is a quarter into the viewport and
      // finishes once it is three-quarters through it. Outside that span the
      // clamp holds the property at its two rest values, 50 and 6 — the same
      // two the CSS keyframes use, counting DOWN for the reason explained at
      // the top of the file — so a browser that falls into this branch draws
      // the identical two end states, just interpolated by hand.
      const start = vh * 0.9
      const span = r.height * 1.15 || 1
      const p = Math.min(1, Math.max(0, (start - r.top) / span))
      stageEl.style.setProperty('--scan', `${50 - p * 44}%`)
    }
    const onScroll = () => {
      if (queued) return
      queued = true
      raf = requestAnimationFrame(write)
    }

    write()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  })
</script>

<section class="scan-forge" aria-labelledby="scan-forge-h">
  <p class="kicker"><span>New from the 3D Lab</span></p>

  <div class="scan-stage" class:is-js={needsJs} bind:this={stageEl}>
    <!-- The floor grid is the "wireframe residue" the scan leaves behind —
         it lives INSIDE the 3D layer so one clip-path governs it and the
         extruded headline together; a second independent clip would let the
         grid's edge and the text's edge drift apart by a frame under the JS
         fallback's rAF. -->
    <div class="layer layer-3d">
      <div class="floor" aria-hidden="true"></div>
      <p class="headline headline-3d" id="scan-forge-h">
        Send a photo. Get a 3D model back.
      </p>
      <div class="shape-row" aria-hidden="true">
        <span class="shape shape--blob shape--3d"></span>
        <span class="shape shape--cap shape--3d"></span>
        <span class="shape shape--cube shape--3d"></span>
      </div>
    </div>

    <div class="layer layer-flat" aria-hidden="true">
      <p class="headline headline-flat">Send a photo. Get a 3D model back.</p>
      <div class="shape-row">
        <span class="shape shape--blob"></span>
        <span class="shape shape--cap"></span>
        <span class="shape shape--cube"></span>
      </div>
    </div>

    <!-- THE BEAM. Three lines, not one: the bright cyan core, and a magenta
         and a violet hairline riding a couple of pixels above and below it
         on `mix-blend-mode: screen` — a cheap, static stand-in for chromatic
         aberration that reads as "a scanner", not just "a border". -->
    <div class="beam" aria-hidden="true">
      <span class="beam-fringe beam-fringe--a"></span>
      <span class="beam-core"></span>
      <span class="beam-fringe beam-fringe--b"></span>
      <span class="beam-dust"></span>
    </div>
  </div>

  <div class="copy-band">
    <p class="lede">One picture of the thing — a chair, a bottle, a shoe, a part.</p>
    <p class="lede">Our pipeline rebuilds it as real geometry.</p>
    <p class="lede">Spin it, light it, and drop it into a website, a game or an AR view.</p>

    <div class="meta-row">
      <span class="chip">About a minute per model</span>
      <span class="formats">GLB&nbsp;·&nbsp;FBX&nbsp;·&nbsp;OBJ&nbsp;·&nbsp;USDZ</span>
    </div>

    <div class="offer-row">
      <p class="price">
        <span class="price-num">2 JOD</span>
        <span class="price-unit">a model —</span>
        <span class="price-free">your first one is free.</span>
      </p>
      <WoolButton label="Make one free" photo={false} onclick={() => {}} />
    </div>
  </div>
</section>

<style>
  /* --scan is the beam's distance from the stage's top edge. 0 = the beam
     sits at the very top (nothing flat left above it, the whole stage
     reads as converted); 100 = the beam has reached the bottom (nothing
     converted yet). See the file header for why the keyframes below COUNT
     DOWN, 50 → 6, rather than sweeping the more obvious way. */
  @property --scan {
    syntax: '<percentage>';
    inherits: true;
    initial-value: 50%;
  }

  .scan-forge {
    position: relative;
    padding: clamp(3rem, 6vw, 5.5rem) clamp(1.1rem, 4vw, 3rem) clamp(3.5rem, 7vw, 6rem);
    background: var(--bg);
    color: var(--ink);
    overflow: hidden;
  }

  .kicker {
    max-width: 1100px;
    margin: 0 auto clamp(1rem, 2vw, 1.6rem);
    font-family: var(--display);
    font-size: 0.78rem;
    font-weight: 620;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .kicker span { color: var(--magenta); }

  /* ————————————————————————————————————————————————————————————
     THE STAGE — the part of the section that is actually the demo.
     Everything below it (.copy-band) is plain, always-readable marketing
     copy; deliberately NOT run through the same effect, because "the whole
     page keeps getting harder to read as you scroll" is a worse pitch than
     "watch the section convert once, then read what it means."
     ———————————————————————————————————————————————————————————— */
  .scan-stage {
    position: relative;
    max-width: 1100px;
    margin: 0 auto;
    min-height: clamp(320px, 46vw, 460px);
    border-radius: clamp(16px, 1.6vw, 24px);
    isolation: isolate;
    /* Belt-and-suspenders: clip-path already confines each layer to 0-100%
       of this box, but a shape's own drop shadow (`shape--3d`'s stacked
       box-shadow) paints past the shape's border box, and on a short phone
       stage that shadow is the thing most likely to peek past the rounded
       corner. */
    overflow: hidden;
    /* A visible seat for the beam even before anything intersects: a plain
       border in --line so the stage reads as a frame, not a stray gap in
       the page, whichever layer currently fills more of it. */
    box-shadow: 0 0 0 1px var(--line);
    /* This is the element whose OWN transit through the viewport drives
       --scan. `view()` with no argument tracks the nearest scrollport,
       which for a section sitting in normal document flow is the page —
       exactly the axis a visitor is already moving along. */
    animation: scan-sweep linear forwards;
    animation-timeline: view();
    animation-range: entry 25% cover 75%;
  }
  @keyframes scan-sweep {
    from { --scan: 50%; }
    to   { --scan: 6%; }
  }
  /* Browsers without a scroll-driven timeline (and the JS fallback covers
     them) must not also run this — two writers on one custom property is
     how you get a fight, not a fallback. */
  @supports not (animation-timeline: view()) {
    .scan-stage { animation: none; }
  }
  .scan-stage.is-js { animation: none; }

  .layer {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: clamp(1.4rem, 3vw, 2.4rem);
    padding: clamp(1.6rem, 4vw, 3.2rem);
    border-radius: inherit;
  }

  /* ABOVE THE LINE: plain, inert, deliberately boring — a flat plate, flat
     type, flat shapes. This is the "before" and it is allowed to look like
     nothing, because the whole pitch depends on it looking like nothing. */
  .layer-flat {
    background: var(--bg-2);
    clip-path: inset(0 0 calc(100% - var(--scan)) 0);
  }

  /* BELOW THE LINE: real depth. The plate itself is --ink mixed toward
     black rather than a new hex value — no new colour, just the existing
     ink token pushed dark enough to hold a cyan wireframe and a cast
     shadow, the way forge.css's own dark stage plate does with hand-picked
     hex; this version stays inside the token budget. */
  .layer-3d {
    background: color-mix(in srgb, var(--ink) 90%, black);
    clip-path: inset(var(--scan) 0 0 0);
    color: var(--bg);
  }

  /* THE FLOOR GRID — the "wireframe residue" the scan leaves filled in
     behind it. A receding perspective grid drawn from two repeating
     gradients, tilted with a 3D transform rather than faked with skew, so
     the lines actually converge instead of just leaning. It sits UNDER the
     layer's own children in paint order and fades toward the top of the
     dark plate so it reads as "just converted" near the beam rather than
     as a floor that was always there. */
  .floor {
    position: absolute;
    inset: -20% -30% -10%;
    background-image:
      repeating-linear-gradient(
        to right,
        color-mix(in srgb, var(--cyan) 55%, transparent) 0 1px,
        transparent 1px 64px
      ),
      repeating-linear-gradient(
        to bottom,
        color-mix(in srgb, var(--cyan) 40%, transparent) 0 1px,
        transparent 1px 46px
      );
    opacity: 0.3;
    transform: perspective(700px) rotateX(58deg);
    transform-origin: 50% 0%;
    mask-image: linear-gradient(to bottom, transparent, black 30%, black 80%, transparent);
    pointer-events: none;
  }

  /* ————————————————————————————————————————————————————————————
     THE HEADLINE, SET TWICE. Same string, same box, one flat and one
     extruded — see the file header for why this is duplicated markup
     rather than one element animating between two states.
     ———————————————————————————————————————————————————————————— */
  .headline {
    margin: 0;
    max-width: 14ch;
    font-family: var(--bloom);
    font-weight: 620;
    font-size: clamp(1.9rem, 4.6vw, 3.4rem);
    line-height: 1.04;
    letter-spacing: -0.01em;
  }
  .headline-flat { color: var(--ink); }

  /* THE EXTRUSION. A stepped stack of text-shadows, not a real preserve-3d
     transform: at this font size a `translateZ` stack needs a dozen actual
     DOM copies to stay crisp (each face is its own flat plane, and a single
     rotated block just looks skewed, not solid), while a shadow stack costs
     one element and is exactly as sharp as the glyph outlines already are.
     Each step nudges 1px right and 1px down and shifts from --violet toward
     --magenta-deep, which is what reads as a lit, receding side face rather
     than a blurred drop shadow — a blur here would look like fog, not
     geometry. The front face is --bg (pale, not a new colour) so the cap of
     the letterforms stays legible against the dark plate underneath. */
  .headline-3d {
    color: var(--bg);
    text-shadow:
      1px 1px 0 var(--violet),
      2px 2px 0 var(--violet),
      3px 3px 0 color-mix(in srgb, var(--violet) 60%, var(--magenta-deep)),
      4px 4px 0 color-mix(in srgb, var(--violet) 40%, var(--magenta-deep)),
      5px 5px 0 color-mix(in srgb, var(--violet) 20%, var(--magenta-deep)),
      6px 6px 0 var(--magenta-deep),
      7px 7px 0 var(--magenta-deep),
      8px 8px 10px rgba(0, 0, 0, 0.5),
      8px 8px 26px color-mix(in srgb, var(--magenta) 45%, transparent);
  }

  /* ————————————————————————————————————————————————————————————
     THE SHAPES — "a chair, a bottle, a shoe, a part" without literally
     drawing any of them (drawing a specific product is the trap this
     concept exists to avoid). Three generic silhouettes stand in for "any
     object": a blob, a capsule, a block — flat fills above the line,
     volumes below it.
     ———————————————————————————————————————————————————————————— */
  .shape-row { display: flex; gap: clamp(1rem, 2.4vw, 1.8rem); align-items: flex-end; }
  .shape { display: block; width: clamp(2.4rem, 5vw, 3.6rem); height: clamp(2.4rem, 5vw, 3.6rem); }

  /* --shape sets its own hue once, in ONE custom property, so the extrusion
     rule below can stay a single shared block instead of three near-
     duplicate ones. It matters more than usual here: the 3D layer's plate
     is color-mix(ink, black) — near-black — so a BLACK contact shadow (the
     obvious first draft, and what shipped here initially) sits on a
     near-black ground and disappears completely. Reviewed at 1440 and 390
     against the real dark plate, not guessed at. The fix is to make the
     "shadow" a saturated glow of the shape's OWN colour instead of a
     darkening — which also reads better as a floor lit by a coloured lab
     scanner than a plain drop shadow would. */
  .shape--blob { --shape: var(--yarn-pink); border-radius: 42% 58% 55% 45% / 55% 42% 58% 45%; background: var(--shape); }
  .shape--cap  { --shape: var(--yarn-blue); border-radius: 999px; background: var(--shape); }
  .shape--cube { --shape: var(--yarn-gold); border-radius: 8px; background: var(--shape); }

  /* Flat: solid, no depth, no light — deliberately inert. */
  .layer-flat .shape { box-shadow: none; }

  /* 3D: the same fill, plus a stacked box-shadow doing the same "stepped
     extrusion" trick as the headline's text-shadow — each step darkened
     toward the shape's own hue, never toward plain black, so the step is
     still visible once it lands on the dark plate — plus a blurred,
     coloured ellipse UNDER the shape standing in for a floor lit by the
     shape itself, the cheapest signal that this is a volume sitting on a
     floor and not a sticker. */
  .shape--3d {
    position: relative;
    box-shadow:
      2px 2px 0 color-mix(in srgb, var(--shape) 55%, black),
      4px 4px 0 color-mix(in srgb, var(--shape) 32%, black),
      0 8px 16px -2px color-mix(in srgb, var(--shape) 70%, transparent);
  }
  .shape--3d::after {
    content: '';
    position: absolute;
    left: 6%;
    right: 6%;
    bottom: -0.65rem;
    height: 0.55rem;
    border-radius: 50%;
    background: radial-gradient(closest-side, color-mix(in srgb, var(--shape) 65%, transparent), transparent 75%);
  }

  /* ————————————————————————————————————————————————————————————
     THE BEAM — the scanner performing the conversion. Positioned by the
     same --scan the two layers clip against, so it always sits exactly on
     the seam between them; nothing here reads its own scroll position.
     ———————————————————————————————————————————————————————————— */
  .beam {
    position: absolute;
    left: 0;
    right: 0;
    top: var(--scan);
    height: 0;
    z-index: 3;
    pointer-events: none;
  }
  .beam-core {
    position: absolute;
    inset: -1px 0 auto 0;
    height: 2px;
    background: var(--cyan);
    box-shadow:
      0 0 10px 1px color-mix(in srgb, var(--cyan) 80%, transparent),
      0 0 34px 6px color-mix(in srgb, var(--cyan) 45%, transparent);
  }
  .beam-fringe {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    opacity: 0.75;
    mix-blend-mode: screen;
  }
  .beam-fringe--a { top: -3px; background: var(--magenta); }
  .beam-fringe--b { top: 3px; background: var(--violet); }

  /* Dust lifting off the seam: a handful of static points positioned with
     box-shadow (one element, no repeated markup) that drift up and fade —
     small, slow, and turned off entirely under reduced motion below. */
  .beam-dust {
    position: absolute;
    top: -2px;
    left: 6%;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow:
      14vw -6px 0 -0.5px color-mix(in srgb, var(--cyan) 85%, transparent),
      27vw 4px 0 0.5px color-mix(in srgb, var(--magenta) 70%, transparent),
      41vw -10px 0 -1px color-mix(in srgb, var(--cyan) 70%, transparent),
      58vw 2px 0 0px color-mix(in srgb, var(--violet) 75%, transparent),
      73vw -5px 0 -0.5px color-mix(in srgb, var(--cyan) 85%, transparent),
      88vw 6px 0 0.5px color-mix(in srgb, var(--magenta) 60%, transparent);
    animation: dust-drift 3.6s ease-in-out infinite;
  }
  @keyframes dust-drift {
    0%, 100% { transform: translateY(0); opacity: 0.9; }
    50% { transform: translateY(-9px); opacity: 0.35; }
  }

  /* ————————————————————————————————————————————————————————————
     COPY BAND — plain marketing copy under the demo. Not clipped, not
     dual-rendered: legibility for the actual sales copy is not something
     this concept is allowed to spend on the trick above it.
     ———————————————————————————————————————————————————————————— */
  .copy-band {
    max-width: 720px;
    margin: clamp(2rem, 4vw, 3rem) auto 0;
    display: grid;
    gap: 0.7rem;
  }
  .lede { margin: 0; color: var(--ink-dim); font-size: clamp(1rem, 1.6vw, 1.18rem); }

  .meta-row {
    margin-top: 0.6rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.7rem 1rem;
  }
  .chip {
    font-family: var(--display);
    font-size: 0.78rem;
    font-weight: 620;
    letter-spacing: 0.05em;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    color: var(--magenta-deep);
    background: color-mix(in srgb, var(--magenta) 12%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--magenta) 30%, transparent);
  }
  .formats {
    font-family: var(--display);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
    text-transform: uppercase;
  }

  .offer-row {
    margin-top: clamp(1.2rem, 2.4vw, 1.8rem);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1.2rem;
  }
  .price { margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.4rem; }
  .price-num {
    font-family: var(--bloom);
    font-weight: 620;
    font-size: clamp(1.5rem, 2.6vw, 1.9rem);
    color: var(--ink);
  }
  .price-unit { color: var(--ink-dim); }
  .price-free { color: var(--magenta-deep); font-weight: 600; }

  /* ————————————————————————————————————————————————————————————
     REDUCED MOTION — the section must still MAKE ITS ARGUMENT statically,
     not just stop moving. --scan is already parked at 50% by its own
     initial-value the instant the sweep and the JS fallback are both
     absent (see the file header), so this block's only job is silencing
     the two independently-timed loops: the dust drift and, if a future
     edit adds one, anything else on a bare `infinite` timer. Nothing here
     touches layout, because the half-flat/half-3D split IS the layout.
     ———————————————————————————————————————————————————————————— */
  @media (prefers-reduced-motion: reduce) {
    .scan-stage { animation: none; }
    .beam-dust { animation: none; opacity: 0.6; }
  }

  /* ————————————————————————————————————————————————————————————
     390 / 820 / 1440 — no horizontal overflow at any of them. The stage's
     own max-width plus clamp() sizing already scales the type and shapes
     down; the only phone-specific change is loosening the offer row back
     to a stacked column so the price and the button do not fight for one
     line under ~480px.
     ———————————————————————————————————————————————————————————— */
  @media (max-width: 30rem) {
    .offer-row { flex-direction: column; align-items: flex-start; }
    .shape-row { gap: 0.85rem; }
  }
</style>
