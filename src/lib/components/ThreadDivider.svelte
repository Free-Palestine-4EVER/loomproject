<!--
  A stitched thread divider between sections — a hand-drawn wave with a
  travelling pulse. Ported from Rich.jsx's `ThreadDivider` (helper #3 of
  four in that file). Purely decorative (aria-hidden), so there is nothing
  SSR-sensitive here: it is the same markup in every render, and
  `reducedMotion.current` only ever removes the pulse's CSS animation
  (rich.css's reduced-motion block already does that globally via
  `.rc-thread *`), so this component does not need to branch on it itself.
-->
<script>
  import './rich.css'
  import { reducedMotion } from '$lib/motion.svelte.js'

  let { flip = false } = $props()
</script>

<div class="rc-thread {flip ? 'rc-flip' : ''} {reducedMotion.current ? 'rc-reduced' : ''}" aria-hidden="true">
  <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
    <defs>
      <linearGradient id="rc-thread-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="var(--magenta)" stop-opacity="0.55" />
        <stop offset="50%" stop-color="var(--violet)" stop-opacity="0.55" />
        <stop offset="100%" stop-color="var(--cyan)" stop-opacity="0.55" />
      </linearGradient>
    </defs>
    <path
      d="M0,60 C180,10 360,110 540,60 C720,10 900,110 1080,60 C1260,10 1440,60 1440,60"
      stroke="url(#rc-thread-grad)" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke"
    />
    <path
      d="M0,60 C180,10 360,110 540,60 C720,10 900,110 1080,60 C1260,10 1440,60 1440,60"
      stroke="var(--line)" stroke-width="1" stroke-dasharray="1 10" fill="none" vector-effect="non-scaling-stroke" transform="translate(0 10)"
    />
    <circle r="5" fill="var(--cyan)" class="rc-thread-pulse" opacity="0.9" />
  </svg>
</div>
