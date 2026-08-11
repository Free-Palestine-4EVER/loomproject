<!--
  LiveBadge — a small status pill with a pulsing dot, used by Products.svelte
  ("App Store — live", "TestFlight · submitted", "Built · in the lab").

  Split out of Rich.jsx on purpose: that file also carries ServiceVisual,
  ProcessGlyph, ThreadDivider and StatSpark, which belong to Proof/Sections —
  components this port does not own. LiveBadge is the one piece Products.svelte
  needs, so it gets its own file, same convention as Chevron.svelte splitting
  out of Wool.jsx. Styles (`.rc-live*`) still come from the shared rich.css.
-->
<script>
  import './rich.css'
  import { reducedMotion } from '$lib/motion.svelte.js'

  let { label = 'Live' } = $props()
</script>

<span class="rc-live {reducedMotion.current ? 'rc-reduced' : ''}">
  <span class="rc-live-dot-wrap">
    <span class="rc-live-ring"></span>
    <span class="rc-live-dot"></span>
  </span>
  {label}
</span>
