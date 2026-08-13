<!--
  A pill CTA whose gradient drifts, slowly and forever, through the site's
  pinks and purples.

  WHY IT EXISTS. The wool buttons are photographs — a knitted spool with the
  label burned into the bitmap. That is right for a poster-scale CTA with air
  around it and wrong for a button inside a dense card: the texture competes
  with the copy it is meant to conclude, the label inherits the photograph's
  own contrast rather than the page's, and the button cannot change width
  without the wool stretching. This one is drawn, so it is exactly as legible
  at 280px as at 180px, and it costs no image.

  HOW THE MOTION WORKS, AND WHY IT IS THIS WAY. The gradient is five stops
  wide — hot pink, brand magenta, orchid, violet, purple — painted at 300% of
  the button's width, and the animation slides the PAINT, not the button.
  Sliding a background is a repaint of one small box; it never touches layout,
  never invalidates a parent, and never allocates. The stop list ends on the
  colour it starts with, so the 14s loop closes seamlessly instead of snapping
  back — that seam is the usual tell of a "smooth" gradient animation that
  isn't.

  NOT `@property` + an animated hue. That interpolates more elegantly, but it
  is unsupported in older WebKit and the FALLBACK is a button whose gradient
  jumps between keyframes — a worse failure than no animation at all, on the
  site's primary conversion. A background-position animation degrades to a
  static gradient everywhere, which is the failure you want.

  Reduced motion parks it mid-sweep and keeps the gradient. The setting asks
  for less movement, not for a grey button.
-->
<script>
  import './gradient-button.css'

  let {
    label,
    onclick,
    class: cls = '',
    /* the four-point sparkle from the reference. Decorative — the label
       already says what the button does — so it is aria-hidden rather than
       given a title nobody needs read to them. */
    spark = true,
    type = 'button',
    ...rest
  } = $props()
</script>

<button {type} class="gbtn {cls}" {onclick} {...rest}>
  <span class="gbtn-sheen" aria-hidden="true"></span>
  {#if spark}
    <svg class="gbtn-spark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.6c.9 5.1 2.4 6.6 7.5 7.5v.4c-5.1.9-6.6 2.4-7.5 7.5h-.4c-.9-5.1-2.4-6.6-7.5-7.5v-.4c5.1-.9 6.6-2.4 7.5-7.5z" />
    </svg>
  {/if}
  <span class="gbtn-label">{label}</span>
</button>
