<!--
  The scroll progress bar.

  The React version was `useScroll()` + `useSpring()` from motion/react — a
  spring simulation running on every frame of every scroll, on the main
  thread, to move one bar. This does the same thing with a scroll-driven CSS
  animation, which runs on the compositor and costs no JS at all while
  scrolling.

  `animation-timeline: scroll()` is supported in Chrome/Edge; Safari and
  Firefox fall back to the rAF path below, which is still cheaper than a
  spring because it only writes a transform.
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'

  let bar = $state(null)
  let needsJs = $state(false)

  onMount(() => {
    // Feature-detect rather than UA-sniff. Where the CSS timeline works, we
    // attach no listener whatsoever.
    if (browser && CSS.supports('animation-timeline', 'scroll()')) return

    needsJs = true
    let raf = 0
    let queued = false

    const write = () => {
      queued = false
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      const p = max > 0 ? Math.min(doc.scrollTop / max, 1) : 0
      if (bar) bar.style.transform = `scaleX(${p})`
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

<div bind:this={bar} class="progress" class:is-js={needsJs}></div>

<style>
  .progress {
    transform-origin: 0 50%;
    transform: scaleX(0);
  }

  /* The compositor path. No JS runs while scrolling. */
  @supports (animation-timeline: scroll()) {
    .progress:not(.is-js) {
      animation: progress-grow linear both;
      animation-timeline: scroll();
    }
  }

  @keyframes progress-grow {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }

  /* A reader who has asked for less motion still wants to know where they
     are in a very long page — the bar is position, not decoration. It just
     must not be animated into place. */
  @media (prefers-reduced-motion: reduce) {
    .progress { transition: none; }
  }
</style>
