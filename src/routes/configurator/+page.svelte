<!--
  /configurator — the live 3D product configurator, and nothing else.

  UNLISTED. Nothing links here; it exists to be pasted into an email. See
  +page.js for what that does and does not guarantee.

  This page is one full-window iframe onto https://diaz.web.app, a separately
  deployed build (Next.js with a patched three.js configurator inside it).
  Iframed rather than ported so it stays a single source of truth: a redeploy
  there updates this page with no build here.

  DELIBERATELY BARE. No hero, no copy, no nav, no footer — +layout.svelte opts
  this one route out of the whole shell. Anything above or below would either
  push the viewport the configurator needs off screen, or sit over a live 3D
  scene the visitor is meant to drag.

  The embed loads immediately and needs no interaction: the build behind it
  hides its own loading gate, plays its scroll-driven reveal itself, and stops
  on the composed framing.
-->
<script>
  import './configurator.css'

  const DEMO = 'https://diaz.web.app'
  const DESC =
    'A live 3D product configurator running in the browser: four table shapes, six timbers, ' +
    'three finishes and a transmissive epoxy river, all from one real-time model.'
</script>

<svelte:head>
  <title>Live 3D Product Configurator — LOOM</title>
  <meta name="description" content={DESC} />
  <!-- Unlisted: handed out by link, kept out of search. -->
  <meta name="robots" content="noindex, nofollow" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Live 3D Product Configurator — LOOM" />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="https://www.loomstudio-jo.com/img/configurator-poster.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<iframe
  class="cfg-frame"
  src={DEMO}
  title="LOOM 3D table configurator"
  loading="eager"
  allow="autoplay; fullscreen; xr-spatial-tracking"
></iframe>
