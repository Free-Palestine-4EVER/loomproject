<!--
  One CUT in the wall on /type — and a cut is a pair, so this figure sets its
  own name twice: once in the fill, once in the outline, stacked so the two
  land directly above each other. Same word, same width, same metrics; only
  the ink changes. That vertical alignment is the whole argument, which is why
  the two lines are one grid and not two paragraphs.

  Weight: the wall names all four cuts, which is 913 KB of display type if all
  eight faces resolve at mount — Flora alone is 244 + 216 KB. Each figure
  therefore claims its own two faces only as it comes up the page via
  `nearViewport` ($lib/motion.svelte.js), the same primitive the home act's
  cycling word is gated behind. The caption is set in the body font and reads
  correctly the whole time; only the two specimen words swap.

  CAPS: `cut.label` is title case in the data (it is also a caption), so the
  specimen lines upper-case it explicitly — these faces have no lowercase.
-->
<script>
  import { nearViewport, reveal } from '$lib/motion.svelte.js'

  let { cut, delay = 0 } = $props()

  let near = $state(false)

  const word = $derived(cut.label.toUpperCase())
</script>

<figure
  class="tf-spec"
  use:reveal={{ delay }}
  use:nearViewport={{ margin: '300px', onNear: () => (near = true) }}
>
  <div class="tf-spec-pair">
    <p class="tf-spec-word" style:font-family={near ? cut.fill.family : undefined}>{word}</p>
    <p class="tf-spec-word tf-spec-word--outline" style:font-family={near ? cut.outline.family : undefined}>{word}</p>
  </div>
  <figcaption>
    <strong>{cut.label} <span class="tf-spec-styles">Fill / Outline</span></strong>
    <span>{cut.note}</span>
  </figcaption>
</figure>
