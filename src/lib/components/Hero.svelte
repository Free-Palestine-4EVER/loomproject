<!--
  Hero — the most performance-critical section on the site.

  NOTHING HERE STARTS INVISIBLE. The React version opened every line of the
  headline, the eyebrow, the sub and the CTAs at `opacity: 0` and animated
  them in on a 1.25s-2.4s delay ladder once the page mounted. That choreography
  made sense for a client-rendered SPA behind a 1.1s branded loader curtain,
  but it is exactly what PORTING.md forbids: this section is above the fold by
  definition, the server-rendered HTML must be the finished state, and there is
  no reveal wrapper here at all — see Loader.svelte for where the studio's
  "opening beat" now lives (retimed to 520ms, skipped entirely under reduced
  motion, and never shown twice in a session). The hero itself just renders,
  full opacity, on the very first paint.

  The hero image/video layer is EAGER by contract — nothing here is `lazy` —
  because this is the one thing on the page guaranteed to be on screen at
  first paint. Every other section on the long page lazy-loads.
-->
<script>
  import { browser } from '$app/environment'
  import { BRAND } from '$data/site.js'
  import { reducedMotion, coarsePointer, magnetic } from '$lib/motion.svelte.js'
  import { hasWebGL } from '$three/webglSupport.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import WoolButton from './WoolButton.svelte'
  import './sections-stage.css'
  import './hero-fallback.css'

  let wrapEl = $state(null)
  let canvas = $state(null)
  let canvasWrapEl = $state(null)
  let typeEl = $state(null)
  let hintEl = $state(null)
  let mobilePlanetEl = $state(null)

  // Starts false on the SERVER — `hasWebGL()` touches `document`, which does
  // not exist during the prerender, and calling it there would throw. The
  // prerendered HTML therefore renders on the WebGL-available assumption
  // (the static fallback stays hidden); a real client corrects `noGL`
  // synchronously in the effect below, same idiom Flyer.svelte uses for its
  // own `canFly`.
  let noGL = $state(false)

  $effect(() => {
    if (!browser) return
    noGL = !hasWebGL()
  })

  // ONE WebGL context on touch devices. iOS Safari kills the whole tab when
  // GPU memory runs out — no error, no recovery — and the page-wide Companion
  // butterfly (Flyer.svelte) is already a context, so a coarse pointer keeps
  // the CSS-only `.hero-mobile-planet` below instead of this canvas. Reduced
  // motion never fetches PlanetField at all — the CSS gradient + the static
  // planet are already the whole picture for that reader.
  const canFly = $derived(browser && !noGL && !coarsePointer.current && !reducedMotion.current)

  // Mounts PlanetField — the hero's WebGL backdrop. `PlanetField` itself is
  // ported byte-for-byte in $three/PlanetField.js (untouched three.js, see
  // PORTING.md's table); this effect is only the Svelte-side wiring, mirroring
  // Flyer.svelte's mount for the page-wide Companion butterfly: dynamic
  // import (three is ~500KB and vite.config.js keeps it out of the vendor
  // chunk on purpose), try/catch around the constructor so a context-creation
  // failure hides the canvas and falls back to the static art rather than
  // taking the hero down, and start()/stop() gated on visibility + the
  // overlay/menu lock so a case study or the wizard opening doesn't leave this
  // loop fighting the overlay's own scroll underneath it.
  $effect(() => {
    if (!canFly || !canvas || !wrapEl) return

    // Read once into a local so this effect does not re-subscribe to the rune
    // mid-boot; `canFly` already re-runs the effect when reduced motion flips.
    const reduced = reducedMotion.current
    let cancelled = false
    let teardown = null

    ;(async () => {
      const { PlanetField } = await import('$three/PlanetField.js')
      if (cancelled || !canvas || !wrapEl) return

      let field
      try {
        field = new PlanetField(canvas, { reduced })
      } catch {
        // WebGL unavailable, or the context limit is already spent — the CSS
        // gradient + `.hero-static-planet` fallback stay visible.
        canvas.style.display = 'none'
        return
      }

      const onScroll = () => {
        const h = window.innerHeight || 1
        field.setScroll(Math.min(window.scrollY / h, 1.4))
      }
      const onMouse = (e) => {
        field.setMouse((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
      }
      let inView = false
      const sync = () => {
        const locked = document.documentElement.classList.contains('overlay-open')
          || document.documentElement.classList.contains('menu-open')
        ;(inView && !document.hidden && !locked) ? field.start() : field.stop()
      }
      const io = new IntersectionObserver(([en]) => { inView = en.isIntersecting; sync() })
      io.observe(wrapEl)
      // A case study or the wizard opening locks scroll but leaves this loop
      // running underneath it — see the identical note in Flyer.svelte.
      const lockObs = new MutationObserver(sync)
      lockObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      document.addEventListener('visibilitychange', sync)
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('mousemove', onMouse, { passive: true })
      teardown = () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('mousemove', onMouse)
        document.removeEventListener('visibilitychange', sync)
        io.disconnect()
        lockObs.disconnect()
        field.dispose()
      }
    })()

    // Unmounted before the chunk landed -> nothing was ever wired up.
    return () => { cancelled = true; if (teardown) teardown() }
  })

  // The hero's own scroll reaction — background parallax + drift for
  // .hero-canvas-wrap, the headline rising and fading as the section scrolls
  // past, and (touch only) a lighter single-property parallax for the CSS
  // planet stand-in. Framer's useScroll/useTransform drove this in React; here
  // it is ONE passive scroll listener, rAF-throttled, writing plain style
  // properties straight to the DOM — no Svelte re-render in the loop, and
  // never a spring simulation on the main thread.
  $effect(() => {
    if (!browser || reducedMotion.current) return
    let raf = null

    const update = () => {
      raf = null
      if (!wrapEl) return

      if (coarsePointer.current) {
        // Mobile planet: grows as the reader scrolls past — the opposite
        // direction from the desktop WebGL planet, which recedes/shrinks
        // (PlanetField.js) — because on mobile there's no z-depth to sell
        // "moving away", so "reacts to scroll at all" reads better as it
        // looming closer. Deliberately NOT routed through the same
        // progress-of-the-hero math as the desktop parallax below: this is
        // one passive listener writing one custom property to one element,
        // which is what keeps scrolling light on a phone.
        const h = window.innerHeight || 1
        const p = Math.min(1.4, Math.max(0, window.scrollY / h))
        mobilePlanetEl?.style.setProperty('--ms', (1 + p * 0.55).toFixed(3))
      } else {
        // Desktop/laptop parallax, keyed to the hero's own scroll progress:
        // 0 while its top sits at the top of the viewport, 1 once its bottom
        // has reached the top — the same window framer's
        // `offset: ['start start', 'end start']` produced.
        const rect = wrapEl.getBoundingClientRect()
        const progress = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)))

        if (canvasWrapEl) {
          canvasWrapEl.style.transform = `translateY(${(progress * 14).toFixed(2)}%) scale(${(1 + progress * 0.08).toFixed(4)})`
        }
        if (typeEl) {
          typeEl.style.transform = `translateY(${(progress * 38).toFixed(2)}%)`
          const fade = progress >= 0.75 ? 0 : 1 - progress / 0.75
          typeEl.style.opacity = String(fade)
        }
        if (hintEl) {
          const fade = progress >= 0.75 ? 0 : 1 - progress / 0.75
          hintEl.style.opacity = String(fade)
        }
      }
    }

    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  })
</script>

<section class="hero" id="top" bind:this={wrapEl}>
  <div class="hero-canvas-wrap" bind:this={canvasWrapEl} aria-hidden="true">
    <div class="hero-canvas-bg"></div>
    <!-- Nothing is going to be drawn into it on an incapable device, and an
         empty full-viewport-ish <canvas> is still a compositor layer — see
         the identical guard on Flyer.svelte's own canvas. -->
    {#if canFly}
      <canvas bind:this={canvas} class="hero-canvas"></canvas>
    {/if}
    <!-- Desktop/laptop stand-in for the WebGL planet, for the two cases the
         live canvas above never paints on a `pointer: fine` device: no WebGL
         context could be created at all (`noGL`), or the reader asked for
         reduced motion (PlanetField is never fetched at all for them, so
         there is nothing to renderOnce() from). Same subject art the WebGL
         canvas would have textured onto its billboard, so a visitor who
         flips a setting or comes back with acceleration on sees the same
         planet, just now animated. -->
    <div class="hero-static-planet{(reducedMotion.current || noGL) ? ' is-visible' : ''}" aria-hidden="true">
      <div class="hero-static-planet-inner"></div>
    </div>
    <!-- Touch-only stand-in for the WebGL planet (touch devices never get
         that context at all — see the mount effect above). Two nested layers
         so the scroll-driven scale (JS, this element) and the ambient float
         (CSS keyframe, the child) each own their own transform instead of
         fighting over one. -->
    <div bind:this={mobilePlanetEl} class="hero-mobile-planet" aria-hidden="true">
      <div class="hero-mobile-planet-inner"></div>
    </div>
    <div class="hero-vignette"></div>
  </div>

  <div class="hero-type" bind:this={typeEl}>
    <p class="hero-eyebrow">
      {BRAND.positioning} — Amman<span class="x">,</span> Jordan
    </p>
    <h1 class="hero-h1">
      <span class="hero-line">We weave brands</span>
      <span class="hero-line hero-line--accent">on the edge</span>
      <span class="hero-line">of creativity<span class="dot">.</span></span>
    </h1>
    <p class="hero-sub">
      One studio for the whole build: the brand, the website, the campaign that sells it,
      and the AI that keeps it running while you sleep.
    </p>
    <div class="hero-ctas">
      <!-- "Start weaving" is one of the 21 photographed spools — and it is the
           headline's own verb, so the hero CTA is real wool, not a CSS pill -->
      <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
        <WoolButton label="Start weaving" class="wool-btn--hero" onclick={() => wizard.open({})} eager />
      </div>
      <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
        <WoolButton label="See the work" href="#work" data-scroll eager />
      </div>
    </div>
  </div>

  <div class="hero-scrollhint" bind:this={hintEl} aria-hidden="true">
    <span class="hero-scrollhint-in">
      <span>Scroll</span><i></i>
    </span>
  </div>
</section>
