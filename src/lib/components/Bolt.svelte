<!--
  LOOM — the banner layer, part 3: THE BOLT.

  The shuttle: ONE weft pass across the frame, transform only, replayed on
  every crossing rather than spent once. wool.css's lesson was about a layer
  left permanently compositing behind static content — a blurred halo
  rasterised and live on 36 buttons at once, forever. This is the opposite
  shape: idle off-frame at rest, it only costs anything for the 1.25s it is
  actually crossing the frame, and there is still exactly one of it.
  Retriggering on each pass is what actually answers "fires once and is gone
  forever" for a shuttle motif.

  WATCH THE FRAME, NOT THE SHUTTLE. The shuttle's own resting position is
  translateX(-140%) — fully outside the felt, by design, so it isn't visible
  before it plays. Observing that element directly asks "is an element sitting
  off past the left edge of the viewport in the viewport" — it never is, at
  rest, so an observer on it never reports entering. The frame never moves, so
  it is a fair trigger for a child that does. (Proved in the React build with a
  bare IntersectionObserver on `.bolt-weft` before touching this: isIntersecting
  stayed false through a full scroll past it.)
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { reveal, magnetic, reducedMotion, EASE } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import WoolIcon from './WoolIcon.svelte'
  import { wizard } from '$lib/wizard.svelte.js'
  import { BRAND } from '$data/site.js'
  import './banners.css'
  // loaded AFTER banners.css: the redesign lives in its own file because
  // banners.css also holds two unrelated bands. Its selectors are 0,2,1 so
  // they win on specificity, not on bundle order.
  import './bolt.css'

  let frameEl = $state(null)
  let shuttleOn = $state(false)

  onMount(() => {
    if (reducedMotion.current || !frameEl) return
    const io = new IntersectionObserver(
      ([e]) => { shuttleOn = e.isIntersecting },
      { rootMargin: '-12% 0px' }
    )
    io.observe(frameEl)
    return () => io.disconnect()
  })

  // forward pass is the whole point and eases in on a delay; the reset back
  // to the start line happens off-view while scrolling away, so it snaps
  // rather than spending time easing where nobody is looking
  const shuttleStyle = $derived(
    `transform: translateX(${shuttleOn ? '340%' : '-140%'}); ` +
    (shuttleOn ? `transition: transform 1.25s ${EASE} 0.2s;` : 'transition: none;')
  )
</script>

<section class="bolt" id="bolt" aria-label={BRAND.positioning}>
  <div use:reveal={{ y: 28 }}>
    <div class="bolt-frame felt stitched" bind:this={frameEl}>
      <i class="bolt-rail bolt-rail--top" aria-hidden="true"></i>
      <i class="bolt-rail bolt-rail--bot" aria-hidden="true"></i>
      {#if !reducedMotion.current}
        <i class="bolt-weft" aria-hidden="true" style={shuttleStyle}></i>
      {/if}

      <div class="bolt-inner">
        <div class="bolt-copy">
          <!-- WAS the 1579px full wordmark (189 KB) painted into
               `.bolt-lockup`'s clamp(140px, 14vw, 220px) box — up to 11x the
               pixels the box can show, on the theory that "the footer word"
               shared the same file at 880px elsewhere and this was a cache
               hit rather than a new download. Measured 11 Aug 2026: nothing
               else on the page references loom-woven.webp at all, so that
               reuse never existed and this was a pure loss. The nav mark's
               `loom-woven-sm.webp` (480px, 29 KB) is claimed elsewhere in
               this same comment history to read soft past ~300px, but this
               box tops out at 220px — well inside what a 480px source
               resolves sharp at, so it is now the only file this lockup
               loads on every breakpoint, avif first. -->
          <picture style="display: contents">
            <source type="image/avif" srcset="/img/logo/loom-woven-sm.avif" />
            <img
              class="bolt-lockup"
              src="/img/logo/loom-woven-sm.webp"
              alt={BRAND.name}
              width="480"
              height="162"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <!-- the cities now READ FIRST, as the eyebrow. Trailing the claim
               they were a footnote to a line nobody could see; ahead of it
               they frame it — where we are, then what we do. -->
          <p class="bolt-sub">
            <WoolIcon name="pin" size="sm" />
            {BRAND.cities.join(' × ')}
          </p>
          <SplitWords as="h2" class="h2 bolt-claim" text={`${BRAND.positioning}.`} />
        </div>

        <!-- the seam. A bolt of cloth is folded, not flat — this is the
             crease, not a divider borrowed for decoration. It is what the
             fork's seam already does between two panels; here it does the
             same job with one panel and one CTA either side of it, so the
             felt between them reads as the fabric's own fold instead of
             unused canvas. Desktop only — stacked on a phone, copy sits
             directly above the CTA and there is no gap left to fold. -->
        <div class="bolt-seam" aria-hidden="true">
          <i class="bolt-yarn"></i>
          <span class="bolt-rivet"></span>
          <i class="bolt-yarn"></i>
        </div>

        <!-- the one CTA. Two would turn this back into a promo pair.
             'Contact us' is photographed violet and is unused elsewhere, so
             no two photographed spools ever share a screen. -->
        <div class="bolt-cta magnetic" use:magnetic={{ strength: 0.35 }}>
          <WoolButton label="Contact us" size="big" onclick={() => wizard.open({})} />
        </div>
      </div>
    </div>
  </div>
</section>
