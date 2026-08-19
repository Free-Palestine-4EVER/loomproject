<!--
  /kitchen3d — the live 3D kitchen configurator, and nothing else.

  Same shape as /configurator, and for the same reasons.

  SERVED FROM THIS SITE, at /kitchen3d-app/. The whole thing — three.js, the
  procedural material generators, the photographed stone and floor maps — is
  under static/kitchen3d-app, so a push here ships it. Nothing points at another
  deploy, which is what kept the old table configurator out of this repo's
  history and made every fix a two-step.

  Still an iframe rather than a port. The configurator is a no-build ES-module
  app with its own import map for three.js; pulling it into SvelteKit's bundler
  would mean re-resolving `three/addons/*`, re-testing the whole render pipeline
  and owning a fork of it forever. Pointing a frame at it on the same origin
  costs nothing and keeps it exactly as tested.

  THE APP DIRECTORY IS 'kitchen3d-app', NOT 'kitchen3d'. A static folder named
  the same as a route is a collision waiting to happen — /kitchen3d/ would be
  ambiguous between this page and the folder's index.html, and which one wins
  depends on the adapter. The suffix keeps them apart.

  DELIBERATELY BARE. No hero, no copy, no nav, no footer — +layout.svelte opts
  this route out of the shell. Anything above or below would either push the
  viewport the configurator needs off screen, or sit over a live 3D scene the
  visitor is meant to drag.
-->
<script>
  import './kitchen3d.css'

  // The explicit index.html, not the directory. SvelteKit's prerender crawler
  // follows the iframe src and resolves it as a file — a bare directory URL is
  // a 404 to it and fails the whole build, even though a real static host would
  // serve the index. /configurator points at /table.html for the same reason.
  const DEMO = '/kitchen3d-app/index.html'
  const DESC =
    'A live 3D kitchen configurator running in the browser: real hinged doors and ' +
    'drawers that open, photographed stone, and reflections baked from the room itself.'
</script>

<svelte:head>
  <title>Live 3D Kitchen Configurator — LOOM</title>
  <meta name="description" content={DESC} />
  <!-- Unlisted: handed out by link, kept out of search. -->
  <meta name="robots" content="noindex, nofollow" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Live 3D Kitchen Configurator — LOOM" />
  <meta property="og:description" content={DESC} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Live 3D Kitchen Configurator — LOOM" />
  <meta name="twitter:description" content={DESC} />
</svelte:head>

<iframe
  class="k3d-frame"
  src={DEMO}
  title="LOOM 3D kitchen configurator"
  loading="eager"
  allow="autoplay; fullscreen; xr-spatial-tracking"
></iframe>
