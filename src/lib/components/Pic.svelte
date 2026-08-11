<!--
  <Pic> — one <img>, plus the best sources that actually exist for it.

  ── WHAT THIS DOES NOW, AND WHY IT CHANGED ────────────────────────────────
  The React version of this emitted an AVIF <source> beside the webp and
  nothing else. That was worth having and is kept. What it did NOT do was pick
  a SIZE, and that turned out to be the single biggest load-time problem on the
  site: measured on the built page at 1440/DPR2, 51 of 90 images were served at
  more than twice their displayed width, and every case-study `star-*` thumbnail
  was a 1300px file rendered into a 58px box — ~125x the pixel data needed.

  It stayed invisible in the SPA for an accidental reason: the DOM was built by
  JS, so most of those images did not exist as elements until after first paint.
  Server-rendering the same markup put all 90 in the document at first parse and
  the browser happily started fetching 1379 KB of them. The port made the page
  lighter in JS and heavier on the wire at the same time; this is the half that
  fixes the second part.

  So <Pic> now emits, in order of preference:

    <picture>
      <source type="image/avif" srcset="…-160.avif 160w, …-320.avif 320w, …" sizes>
      <source type="image/webp" srcset="…-160.webp 160w, …-320.webp 320w, …" sizes>
      <img src="…the original">
    </picture>

  and the browser picks one file per slot instead of the biggest one available.

  ── THE `sizes` PROP IS NOT OPTIONAL IN PRACTICE ──────────────────────────
  Without `sizes`, a srcset defaults to `100vw` — the browser assumes the image
  fills the viewport and picks the largest variant, which is exactly the bug
  this component exists to fix. Any caller rendering an image into something
  smaller than the full width MUST pass `sizes`. Callers that genuinely are
  full-bleed can leave it.

  ── WHY TWO MANIFESTS ──────────────────────────────────────────────────────
  `avif-manifest.json` answers "does a same-size AVIF sibling exist?" — it is
  the older, hand-curated set where AVIF beat webp by at least 12%, and 138
  files deliberately did NOT clear that gate. `responsive.json` answers "what
  widths were generated for this source?" and is written by
  scripts/responsive.mjs. A path can be in either, both, or neither, and the
  markup below degrades correctly in all four cases. Neither is ever guessed
  from a naming convention: a <source> is only emitted for a file that the
  encoder actually wrote, because the alternative costs a 404 per miss, per
  page load, per visitor.

  `display: contents` on the <picture> is load-bearing, and is the same reason
  the banners and the footer use it: several of these images are absolutely
  positioned against an ancestor, and a wrapper with a layout box of its own
  would become their containing block instead.
-->
<script module>
  import AVIF_MANIFEST from '$lib/avif-manifest.json'
  import RESPONSIVE from '$lib/responsive.json'

  const HAS_AVIF = new Set(AVIF_MANIFEST)

  /** `/img/x/y.webp` -> `/img/x/y.avif`, or null when no sibling was kept. */
  export function avifFor(src) {
    if (!src || typeof src !== 'string') return null
    const i = src.lastIndexOf('.')
    if (i < 0) return null
    const cand = src.slice(0, i) + '.avif'
    return HAS_AVIF.has(cand) ? cand : null
  }

  /** The generated width ladder for a source, or null. */
  export function variantsFor(src) {
    return RESPONSIVE[src] || null
  }

  const srcsetOf = (variants, key) =>
    variants.map((v) => `${v[key]} ${v.w}w`).join(', ')

  /**
   * A plain `srcset` string for a caller that must keep a real <img> element
   * rather than use this component — an <img> carrying a Svelte action, for
   * instance, since `use:` cannot be applied to a component.
   *
   * Returns undefined when the source has no ladder, which is the correct value
   * for the attribute: Svelte omits an undefined attribute entirely, so the
   * <img> falls back to plain `src` rather than shipping `srcset=""`.
   *
   * webp rather than avif, because this form has no <source> to fall back
   * from — every browser that understands srcset understands webp, which is
   * not true of avif.
   */
  export function webpSrcset(src) {
    const set = variantsFor(src)
    return set ? srcsetOf(set.variants, 'webp') : undefined
  }
</script>

<script>
  // Every remaining prop passes straight through to the <img>, so
  // width/height/loading/decoding/class/onload all behave exactly as they did.
  let {
    src,
    media = undefined,
    /** e.g. "(max-width: 767px) 50vw, 320px". See the note above — omitting
     *  this on a non-full-bleed image defeats the whole component. */
    sizes = undefined,
    ...rest
  } = $props()

  const set = $derived(variantsFor(src))
  const avif = $derived(avifFor(src))
</script>

{#if set}
  <picture style="display: contents">
    <source type="image/avif" srcset={srcsetOf(set.variants, 'avif')} {sizes} {media} />
    <source type="image/webp" srcset={srcsetOf(set.variants, 'webp')} {sizes} {media} />
    <img {src} {...rest} />
  </picture>
{:else if avif}
  <!-- No width ladder for this one (a texture, a logo, something already at or
       below the smallest rung) but a same-size AVIF sibling exists. -->
  <picture style="display: contents">
    <source type="image/avif" srcset={avif} {media} />
    <img {src} {...rest} />
  </picture>
{:else}
  <img {src} {...rest} />
{/if}
