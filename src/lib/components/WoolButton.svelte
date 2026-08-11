<!--
  A knitted button. `label` decides whether it can be photographic;
  `yarn` picks the CSS fallback's colour (magenta by default).
-->
<script>
  import { RENDERED, RATIO, norm } from './wool.js'

  let {
    label,
    onclick,
    size = 'md',
    yarn = 'magenta',
    href = null,
    class: className = '',
    type = 'button',
    /** The hero's two CTAs are the only WoolButtons above the fold — every
     *  other one on the page is genuinely below it. Both were shipping
     *  `loading="lazy"` regardless, which on a phone-width viewport made the
     *  "See the work" button's own 720px photograph the page's LCP element
     *  AND a lazy-loaded one — a fetch the browser delays exactly when LCP is
     *  timing it. `eager` lets Hero.svelte opt its two buttons out of the
     *  lazy default without changing every other call site's contract. */
    eager = false,
    ...rest
  } = $props()

  const asset = $derived(RENDERED[norm(label)])
  const sizeClass = $derived(size === 'big' ? ' is-big' : size === 'small' ? ' is-small' : '')
  const src = $derived(asset ? `/img/wool/buttons/${asset}.webp` : null)
  const h = $derived(asset ? Math.round(720 / RATIO[asset]) : 0)
  const cls = $derived(
    `wool-btn ${asset ? 'wool-btn--photo' : `wool-btn--css wool-btn--${yarn}`}${sizeClass} ${className}`.trimEnd()
  )
  /** The 33 renders are NOT one shape. "See the work" is 2.14:1, "Make one
   *  free" is 1.77:1, "Request a quote" is 2.45:1 — they were shot as
   *  individual objects, not cut from one template. Sizing them all off a
   *  common WIDTH therefore gave them wildly different cap heights, and the
   *  squarest render ("Make one free", the widest gap from the set's median)
   *  came out 107px tall against "See the work"'s 82 — the client's "too fat".
   *  Publishing the render's own ratio lets wool.css size a photographed pill
   *  off its HEIGHT instead, so every knit on the page shares a cap height and
   *  the width falls out of the photograph. Anything that still sets
   *  --wool-btn-w by hand (the nav bar, the hero, the wizard chrome) keeps
   *  overriding this untouched. */
  const style = $derived(asset ? `--wool-btn-ar:${RATIO[asset].toFixed(4)}` : undefined)
</script>

<!--
  Both variants are built from the same three layers, so hover/press feel
  identical whether the pill is a photograph or cut from yarn slices:
    halo  — the fibre bloom that lifts off the dark on hover
    plate — the wool itself
    sheen — a light pass travelling over the nap
  The halo is a plain tinted gradient, NOT a blurred copy of the wool. A
  blurred duplicate looked marginally better and cost 36 permanently
  rasterised blur layers across the page — it stalled scrolling outright.
-->
{#snippet inner()}
  <span class="wool-btn-halo" aria-hidden="true"></span>
  {#if asset}
    <img
      {src}
      alt=""
      width="720"
      height={h}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      fetchpriority={eager ? 'high' : undefined}
    />
    <span class="wool-btn-label">{label}</span>
  {:else}
    <span class="wool-btn-plate" aria-hidden="true"></span>
    <span class="wool-btn-text">{label}</span>
  {/if}
{/snippet}

{#if href}
  <a {href} class={cls} {style} {onclick} {...rest}>{@render inner()}</a>
{:else}
  <button {type} class={cls} {style} {onclick} {...rest}>{@render inner()}</button>
{/if}
