<!-- /bbsimon2 — HH-101. See $components/BBSimonProduct.svelte. -->
<script>
  import BBSimonProduct from '$components/BBSimonProduct.svelte'
  import { PRODUCTS } from '$data/bbsimon.js'

  const product = PRODUCTS.bbsimon2
  const TITLE = `${product.title} — 3D & AR concept | B.B. Simon × LOOM`
  const DESC =
    'A B.B. Simon product page rebuilt with a live 3D preview and in-room AR try-on. ' +
    'A LOOM concept.'
</script>

<svelte:head>
  <title>{TITLE}</title>
  <meta name="description" content={DESC} />
  <!-- Unlisted, and carrying a client's product photography: keep it out of search. -->
  <meta name="robots" content="noindex, nofollow" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={TITLE} />
  <meta property="og:description" content={DESC} />
</svelte:head>

<BBSimonProduct {product} />
