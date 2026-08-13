<!--
  /apps — THE CATALOGUE, not the home page's scroll stage a second time.

  The first version of this route mounted `<AppsShowcase />` (the home page's
  `#apps` pinned rail) and closed with the shuttle band. The client's note on
  it was exact: "you think making the other pages for the menu items is just
  put the section and that's it". They were right.

  So /apps is now the whole suite on one page: `AppsIndex.svelte` (this
  folder) — a hero counted off suite.js, a status filter, and every product
  laid out in three bands cut on shipping reality (installable today / built
  but not public / concept, nothing built), each product with its icon, tag,
  status, blurb, its screens in the device treatment its `kind` demands, and
  a store link ONLY where suite.js carries one. The home page's `#apps` stage
  is untouched.

  `<Contact />` still closes the route: it is where the closing band points
  and it already exists.
-->
<script>
  import AppsIndex from './AppsIndex.svelte'
  import Contact from '$lib/components/Contact.svelte'
  import {
    TOTAL, LIVE_COUNT, CONCEPT_COUNT, NOT_PUBLIC_COUNT, PHONE_COUNT, DESKTOP_COUNT,
  } from './facts.js'
  import '../route-page.css'

  // Generated, not typed — see ./facts.js. The description states the honest
  // split in the search result itself, so the page cannot over-promise before
  // anybody has even clicked it.
  const TITLE = `Apps & Software — All ${TOTAL} LOOM Products`
  // The tail sentence branches on the data for the same reason the hero's
  // does: "0 are concepts" is a sentence no reader should ever be shown, and
  // hard-coding "3 are concepts" is how it was wrong in the first place.
  const SPLIT =
    CONCEPT_COUNT > 0
      ? `${LIVE_COUNT} on the App Store today and ${CONCEPT_COUNT} concepts with nothing built`
      : `${LIVE_COUNT} on the App Store today, ${NOT_PUBLIC_COUNT} built but not public yet`
  const DESC =
    `The full catalogue of software LOOM has built for itself: ${TOTAL} products — ` +
    `${PHONE_COUNT} on iPhone, ${DESKTOP_COUNT} in the browser. ` +
    `${SPLIT} — and every one says which it is.`
  const CANONICAL = 'https://www.loomstudio-jo.com/apps'
</script>

<svelte:head>
  <title>{TITLE}</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href={CANONICAL} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={CANONICAL} />
  <meta property="og:title" content={TITLE} />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="route-page">
  <AppsIndex />

  <Contact />
</div>
