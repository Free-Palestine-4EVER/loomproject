<!--
  /diaaz — a clone of /configurator: the live 3D product configurator, and
  nothing else.

  UNLISTED. Nothing links here; it exists to be pasted into an email. See
  +page.js for what that does and does not guarantee.

  Same embed as /configurator, same source: the configurator is SERVED FROM
  THIS SITE, at /loom-table.html, with its bundle in static/_next and its model
  in static/models. This route is a second URL onto that one build so the Diaaz
  conversation can have a link of its own without either page's URL leaking
  into the other's thread.

  WHAT THIS REPLACED: /diaaz was a reverse proxy onto diaaz-konfigurator.web.app
  — the separately-deployed, Diaaz-branded copy of this same Textura build. It
  needed an HTML/JS/CSS rewriter ($lib/server/diaazProxy.js), a companion proxy
  route at /table.html for the inner viewer document, and three vercel.json
  rewrites (/assets, /brand, /refs) to reach assets Firebase Hosting served
  without CORS headers. Every one of those is deleted. Nothing here depends on
  a deployment this repo does not control, and no request leaves our origin.

  Still an iframe rather than a port, for the same reason as /configurator: the
  configurator is a compiled Next.js build with a patched three.js scene inside
  it. Rewriting that into SvelteKit would fork it permanently; pointing a frame
  at it on the same origin costs nothing and keeps it exactly as tested.

  DELIBERATELY BARE. No hero, no copy, no nav, no footer — +layout.svelte opts
  this route out of the whole shell alongside /configurator. Anything above or
  below would either push the viewport the configurator needs off screen, or sit
  over a live 3D scene the visitor is meant to drag.
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
