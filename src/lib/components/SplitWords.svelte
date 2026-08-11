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
  import { EASE, reducedMotion, prefersReduced } from '$lib/motion.svelte.js'

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

  /* Per-word stagger step, clamped so a long headline does not run away.
     30ms/word is the house stagger ceiling, but on a long headline that
     alone still pushes the last word out arbitrarily far — so the total
     spread across all words is ALSO capped at 100ms, and the per-word step
     is whichever of the two is smaller. A 3-word headline gets ~30ms steps;
     a 9-word one compresses to ~12.5ms steps. Either way the whole headline
     is fully underway within ~400ms of the reveal (100ms max spread + the
     320ms rise itself). */
  const WORD_DURATION = 0.32
  const STEP_CEILING = 0.03
  const SPREAD_CEILING = 0.1
  const step = $derived(
    words.length > 1 ? Math.min(STEP_CEILING, SPREAD_CEILING / (words.length - 1)) : 0
  )

  onMount(() => {
    // See motion.svelte.js's `prefersReduced()` comment: the shared rune may
    // not be set yet this early in mount order on a genuinely reduced-motion
    // browser, so it is checked directly too, not just the rune.
    if (reducedMotion.current || prefersReduced()) return
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
        setTimeout(() => { settled = true }, (delay + (words.length - 1) * step + WORD_DURATION) * 1000)
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
        style:transition={armed ? `transform ${WORD_DURATION}s ${EASE} ${delay + i * step}s` : 'none'}
        style:will-change={animating ? 'transform' : ''}
      >{w}&nbsp;</span>
    </span>
  {/each}
</svelte:element>
