<!--
  DeviceShowcase — the case-study "on real hardware" shot.

  Every case in Work.svelte ships one production screenshot (`cover.webp`);
  most never had a separate mobile capture taken because the work itself was
  a desktop deliverable. Rather than inventing a second image per case (or,
  worse, leaving mobile out of a "responsive" portfolio entirely), this
  component always renders BOTH devices and simply lets the same still stand
  in behind both panes of glass when a case has no dedicated `devices` field.
  The frames are real mockup PNGs (public/img/devices/*-frame.png). Two
  different techniques produce the two apertures — see device-showcase.css's
  FRAME MATH note for the numbers and how each was derived:
    - iphone-frame.png:  the screen really is alpha-cut (RGBA alpha == 0).
    - macbook-frame.png: the screen is painted solid near-black, alpha 255,
      same as the bezel — there is no cutout. The screen art is layered on
      top (z-index) inside a rect measured to match that painted rectangle.
  This file only recombines the two frames with the right rect maths.

  PORT NOTE: the React version declared `whileHover="hover"` variants on the
  mac/shot/phone layers, gated on an ancestor propagating a "hover" label —
  but nothing that actually mounts this component (Work.jsx's plain `<button
  class="wtile">`, the overlay's plain `<div>`) ever sets `whileHover="hover"`
  on an ancestor. Framer's variant propagation only reaches descendants
  through other motion components in the tree, so those three hover variants
  were dead code — never triggered in the shipped app. The floating idle
  animation (`devshow-float`, pure CSS `@keyframes`) is the only motion here
  that ever actually ran, so that is the only thing carried across.
-->
<script>
  let { desktop, mobile, alt, fallback, compact = false, card = false } = $props()

  const variant = $derived(compact ? ' devshow--compact' : card ? ' devshow--card' : '')

  // Screen art fades in on decode instead of popping — same convention
  // Work.svelte uses for the cover image.
  const shotFade = (el) => { if (el && el.complete && el.naturalWidth) el.classList.add('is-loaded') }
  const onShotLoad = (e) => e.currentTarget.classList.add('is-loaded')

  // `fallback` is the swap-on-404, not a default: the generated screens are
  // resolved by slug convention in Work.svelte, so a case whose screens have
  // not been rendered yet would otherwise show a broken pane inside a real
  // device frame — worse than showing nothing. Swapping to the case's own
  // cover keeps the frame full. Guarded so a missing fallback cannot loop.
  function swapOnError(e) {
    const el = e.currentTarget
    if (!fallback || el.dataset.fellBack) { el.style.visibility = 'hidden'; return }
    el.dataset.fellBack = '1'
    el.src = fallback
  }
</script>

<div class="devshow{variant}" data-cursor>
  <div class="devshow-mac">
    <!-- Screen rect below is measured directly off this PNG's painted-black
         rectangle (pixel-sampled, not eyeballed) — see device-showcase.css. -->
    <img class="devshow-mac-frame" src="/img/devices/macbook-frame.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
    <div class="devshow-mac-screen">
      <img
        src={desktop} alt="{alt} — desktop view" loading="lazy" decoding="async"
        use:shotFade onload={onShotLoad} onerror={swapOnError}
      />
    </div>
  </div>
  {#if !compact}
    <div class="devshow-phone">
      <!-- Alpha-cut PNG — see the file banner. Rect below is the measured
           transparent hole, not a guess. -->
      <img class="devshow-phone-frame" src="/img/devices/iphone-frame.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <div class="devshow-phone-screen">
        <img
          src={mobile} alt="{alt} — mobile view" loading="lazy" decoding="async"
          use:shotFade onload={onShotLoad} onerror={swapOnError}
        />
      </div>
    </div>
  {/if}
</div>
