<!--
  Words rise out of a clipping mask, staggered.

  SSR CONTRACT: the server renders every word at its finished position. The
  markup below is readable with scripting off — which also means the headline
  is real text to a crawler, where the React version shipped an empty div and
  hoped the crawler ran the bundle.

  The mask is real in both states (overflow: hidden on .sw-mask), but the word
  only sits translated out of it once `armed` is true, and `armed` can only
  become true on the client, after hydration, for a heading that is still
  below the fold.

  NOTE: the observer watches the CONTAINER, never the words. A word translated
  out of its overflow:hidden mask has zero visible area, so a per-word observer
  never fires at all.
-->
<script>
  import { onMount } from 'svelte'
  import { EASE, reducedMotion } from '$lib/motion.svelte.js'

  let {
    text,
    as = 'span',
    class: className = '',
    delay = 0,
    once = true,
  } = $props()

  let root = $state(null)
  let armed = $state(false)
  let shown = $state(true) // server + no-JS: finished
  let settled = $state(true)

  const words = $derived(String(text).split(' '))

  onMount(() => {
    if (reducedMotion.current) return
    const rect = root.getBoundingClientRect()
    // On screen at hydration — leave it finished rather than flashing it in.
    if (rect.top < window.innerHeight * 0.92) return

    armed = true
    shown = false
    settled = false

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        shown = true
        // will-change is only worth paying for while the words are moving.
        // The React build learned this the hard way: a naive "not settled yet"
        // flag left every word of every un-reached heading promoted to its own
        // compositor layer for the entire session — 82 layers at rest on a
        // 390px phone. Layerisation of that order is paid in style, paint and
        // GPU memory, and shows up nowhere in a JS profile.
        setTimeout(() => { settled = true }, (delay + words.length * 0.045 + 0.9) * 1000)
        if (once) io.disconnect()
      } else if (!once) {
        shown = false
      }
    }, { rootMargin: '-8% 0px' })

    io.observe(root)
    return () => io.disconnect()
  })

  // Reduced-motion flipped on while a heading is armed and waiting below the
  // fold: release it to its finished state rather than leaving it clipped out
  // of view forever by an observer that is no longer allowed to fire.
  $effect(() => {
    if (reducedMotion.current && armed) { shown = true; settled = true }
  })

  const animating = $derived(armed && !settled)
</script>

<svelte:element
  this={as}
  bind:this={root}
  class="sw {animating ? 'is-animating' : ''} {className}"
  aria-label={text}
>
  {#each words as w, i}
    <span class="sw-mask" aria-hidden="true">
      <span
        class="sw-word"
        style:transform={shown ? 'translateY(0%) rotate(0deg)' : 'translateY(110%) rotate(4deg)'}
        style:transition={armed ? `transform 0.9s ${EASE} ${delay + i * 0.045}s` : 'none'}
        style:will-change={animating ? 'transform' : ''}
      >{w}&nbsp;</span>
    </span>
  {/each}
</svelte:element>
