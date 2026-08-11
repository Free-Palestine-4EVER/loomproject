<!--
  One entry in the species wall (Typeface.jsx's SpecWord). The wall names all
  seven planted cuts, which is 1.5 MB of display type if they all resolve at
  mount — so each figure claims its own face only as it comes up the page via
  `nearViewport` ($lib/motion.svelte.js), same primitive TypeShowcase's own
  cycling word is gated behind. The caption is set in the body font and reads
  correctly the whole time; only the specimen word swaps.
-->
<script>
  import { nearViewport, reveal } from '$lib/motion.svelte.js'

  let { cut, delay = 0 } = $props()

  let near = $state(false)
</script>

<figure
  class="tf-spec"
  use:reveal={{ delay }}
  use:nearViewport={{ margin: '300px', onNear: () => (near = true) }}
>
  <p class="tf-spec-word" style:font-family={near ? cut.family : undefined}>
    {cut.label.toUpperCase()}
  </p>
  <figcaption>
    <strong>{cut.label}</strong>
    <span>{cut.species}</span>
  </figcaption>
</figure>
