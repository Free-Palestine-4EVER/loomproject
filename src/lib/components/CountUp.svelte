<!--
  Number counts up when scrolled into view.

  SSR CONTRACT: the server renders the FINAL value, not zero. This matters
  beyond aesthetics — these are the studio's proof numbers (clients, years,
  countries), and a server-rendered "0 clients" is what a crawler, a link
  preview and a scripting-off reader would have seen if this opened at zero
  the way the React version did.

  The count only ever runs for an instance that is still below the fold when
  hydration completes, so the value never visibly falls from its real figure
  back to zero in front of anyone.
-->
<script>
  import { onMount } from 'svelte'
  import { reducedMotion } from '$lib/motion.svelte.js'

  let { value, suffix = '', duration = 1.6 } = $props()

  let root = $state(null)
  let n = $state(value) // server + no-JS + reduced motion: the real number

  onMount(() => {
    if (reducedMotion.current) return
    const rect = root.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.92) return // on screen — leave it

    n = 0
    let raf, start
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const tick = (t) => {
        if (start === undefined) start = t
        const p = Math.min((t - start) / (duration * 1000), 1)
        n = Math.round(value * (1 - Math.pow(1 - p, 4))) // quart-out
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { rootMargin: '-10% 0px' })

    io.observe(root)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  })

  // Reduced motion switched on mid-count (or mid-wait): snap to the real
  // number instead of leaving a stalled partial figure on the page.
  $effect(() => { if (reducedMotion.current) n = value })
</script>

<span bind:this={root}>{n}{suffix}</span>
