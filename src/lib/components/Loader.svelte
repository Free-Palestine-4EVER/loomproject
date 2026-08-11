<!--
  ─────────────────────────────────────────────────────────────────────────
  THE LOADER IS THE ONE PIECE OF CHROME SSR ARGUES WITH, AND IT IS A BRAND
  CALL, NOT AN ENGINEERING ONE — SO IT IS LEFT IN AND MADE SWITCHABLE.

  In the React SPA this curtain was free. There was nothing behind it: the
  document was an empty <div id="root"> until the bundle parsed, so a branded
  panel covering that gap cost nothing and hid a genuine blank.

  Under SSR the situation inverts. The server now ships complete, styled,
  readable HTML that the browser can paint before a byte of JS is parsed —
  and this component's job is to cover that up for 1.1 seconds. Held at the
  React build's timing, an SSR page would measure faster and FEEL slower than
  the SPA it replaced, which is the exact opposite of the point of the
  rebuild.

  Three changes, none of which delete the brand moment:

  1. HOLD is 1100ms → 520ms. Long enough to read as intentional, short enough
     that it is gone before a visitor decides the page is slow. The wordmark
     animation is retimed to land inside it rather than being cut off.
  2. Reduced motion skips it ENTIRELY (not "plays it without animation").
     Battery Saver forces that query on, so this is a large slice of ordinary
     laptop traffic getting the fastest possible path to the content.
  3. A returning visitor in the same tab session never sees it twice.
     sessionStorage, not localStorage — a first visit each day still gets the
     studio's opening beat; a click back from /type does not.

  Set HOLD to 0 to retire the curtain outright. Everything else on the page
  is indifferent to it.
  ─────────────────────────────────────────────────────────────────────────
-->
<script>
  import { onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { reducedMotion } from '$lib/motion.svelte.js'

  const HOLD = 520

  // Starts FALSE on the server. The prerendered HTML therefore contains no
  // curtain at all — a crawler, a scripting-off reader and a slow connection
  // all get the page itself, and the curtain is something only a JS-capable
  // client briefly adds on top.
  let show = $state(false)

  onMount(() => {
    if (HOLD === 0) return
    if (reducedMotion.current) return
    if (sessionStorage.getItem('loom:seen-loader')) return

    show = true
    const t = setTimeout(() => {
      show = false
      sessionStorage.setItem('loom:seen-loader', '1')
    }, HOLD)
    return () => clearTimeout(t)
  })
</script>

{#if show}
  <div class="loader" out:fly={{ y: '-100%', duration: 900, easing: cubicOut }}>
    <div class="loader-inner">
      <div class="loader-word">
        <img
          class="logo-woven"
          src="/img/logo/loom-woven-sm.webp"
          alt="LOOM"
          width="480"
          height="162"
          fetchpriority="high"
        />
      </div>
      <div class="loader-thread"></div>
      <p class="loader-sub">Amman × Sarajevo</p>
    </div>
  </div>
{/if}

<style>
  /* Retimed to land inside the shortened HOLD. These were motion/react
     `initial`/`animate` pairs; as CSS they cost no JS and start on the frame
     the element is inserted, not on the frame after hydration schedules them. */
  .loader-word {
    animation: loader-word 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .loader-thread {
    animation: loader-thread 420ms cubic-bezier(0.16, 1, 0.3, 1) 140ms both;
  }
  .loader-sub {
    animation: loader-sub 300ms cubic-bezier(0.16, 1, 0.3, 1) 240ms both;
  }

  @keyframes loader-word {
    from { opacity: 0; transform: scale(0.94) translateY(14px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes loader-thread {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  @keyframes loader-sub {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
</style>
