<!--
  /configurator — the live 3D product configurator, and nothing else.

  UNLISTED. Nothing links here; it exists to be pasted into an email. See
  +page.js for what that does and does not guarantee.

  The configurator is SERVED FROM THIS SITE, at /loom-table.html, with its
  bundle in static/_next and its model in static/models. It used to be an
  iframe onto a separate deploy (diaz.web.app); that meant every fix had to be
  deployed there and nothing about it was under this repo's control or in its
  git history. Now a push here ships the whole thing.

  RENAMED from /table.html, TWICE (2026-08-21): back when /diaaz was a reverse
  proxy onto its own Diaaz-branded copy of this exact same Textura build, that
  copy's iframe requested the literal path /table.html?bare=1 — hardcoded in
  its build, unchangeable from here. A static file at /table.html always wins
  over a vercel.json rewrite for that same path regardless of query string
  (Vercel matches static assets by pathname only), so while this route's own
  copy sat at /table.html too, the /diaaz proxy could never win that path.
  That proxy is gone — /diaaz is now a clone of this route, embedding this
  same /loom-table.html — but the rename stays: the SECOND reason below is
  still live, and /table.html is now simply an unused path.

  First rename landed on /configurator.html — wrong, for a DIFFERENT reason
  than the one it fixed: SvelteKit's own prerendered output for the
  /configurator ROUTE is itself literally named configurator.html
  (trailingSlash convention), so the static asset and the route's own build
  output collided at the exact same output path. The route won; every
  request for the static file 404'd through the app's own not-found page
  instead (x-sveltekit-page: true) — the SAME class of bug the kitchen3d-app
  folder-naming comment below already warns about, just missed here on the
  file rather than the folder. /loom-table.html shares no name with any
  route, so nothing to collide with.

  Still an iframe rather than a port: the configurator is a compiled Next.js
  build with a patched three.js scene inside it. Rewriting that into SvelteKit
  would fork it permanently; pointing a frame at it on the same origin costs
  nothing and keeps it exactly as tested.

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

  const DEMO = '/loom-table.html'
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
  <meta name="twitter:title" content="Live 3D Product Configurator — LOOM" />
  <meta name="twitter:description" content={DESC} />
  <meta name="twitter:image" content="https://www.loomstudio-jo.com/img/configurator-poster.jpg" />
</svelte:head>

<iframe
  class="cfg-frame"
  src={DEMO}
  title="LOOM 3D table configurator"
  loading="eager"
  allow="autoplay; fullscreen; xr-spatial-tracking"
></iframe>
