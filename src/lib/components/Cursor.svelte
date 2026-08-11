<!--
  The custom cursor: a dot that tracks exactly, and a ring that chases it.

  Fine pointers only, and never under reduced motion — on a touch device the
  whole thing is dead weight, and the React version's guard is kept verbatim.
  Nothing is rendered on the server: a cursor is meaningless until there is a
  pointer, so this adds zero bytes to the prerendered HTML.
-->
<script>
  import { browser } from '$app/environment'
  import { reducedMotion } from '$lib/motion.svelte.js'

  let dot = $state(null)
  let ring = $state(null)
  let active = $state(false)

  // Top-level $effect, not one nested inside onMount — an effect has to be
  // created during component initialisation, and $effect() called later from
  // a callback is an orphan that never runs.
  //
  // It re-runs when reducedMotion.current flips, so a visitor whose laptop
  // drops into Battery Saver mid-session loses the chase loop immediately
  // rather than leaving a rAF running for the rest of the session.
  $effect(() => {
    if (!browser) return
    if (reducedMotion.current || !window.matchMedia('(pointer:fine)').matches) {
      active = false
      return
    }

    active = true
    document.documentElement.classList.add('has-cursor')

    let x = 0, y = 0, rx = 0, ry = 0, raf = 0

    const move = (e) => {
      x = e.clientX; y = e.clientY
      if (dot) dot.style.transform = `translate(${x}px, ${y}px)`
    }
    const loop = () => {
      rx += (x - rx) * 0.14
      ry += (y - ry) * 0.14
      if (ring) ring.style.transform = `translate(${rx}px, ${ry}px)`
      raf = requestAnimationFrame(loop)
    }
    const over = (e) => {
      const hot = e.target.closest?.('a, button, [data-cursor]')
      document.documentElement.classList.toggle('cursor-hot', !!hot)
    }

    window.addEventListener('mousemove', move, { passive: true })
    window.addEventListener('mouseover', over, { passive: true })
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('has-cursor', 'cursor-hot')
      active = false
    }
  })
</script>

{#if active}
  <div class="cursor" aria-hidden="true">
    <div bind:this={ring} class="cursor-ring"></div>
    <div bind:this={dot} class="cursor-dot"></div>
  </div>
{/if}
