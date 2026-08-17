<!--
  /work — THE ARCHIVE, not the home page's wall a second time.

  The first version of this route mounted `<Work />` (the home page's `#work`
  mosaic) and closed with the shuttle band. The client's note on it was
  exact: "you think making the other pages for the menu items is just put the
  section and that's it". They were right — a URL that renders the same
  component as an anchor on / is a duplicate, not a page.

  So /work is now its own thing, built for the one visitor who types it: a
  buyer evaluating the studio. `WorkIndex.svelte` (this folder) is the whole
  page — hero counted off the data, three combinable filters plus a sort,
  every case at equal size with all six of its facts, the case dialog, and a
  closing band. The home page's `#work` section is untouched and still the
  curated teaser it was; nothing is shared between them but the DATA and the
  dialog's stylesheet.

  `<Contact />` still closes the route, because it is the actual destination
  the closing band points at and it already exists.
-->
<script>
  import WorkIndex from './WorkIndex.svelte'
  import Contact from '$lib/components/Contact.svelte'
  import {
    CASE_COUNT, COUNTRY_COUNT, DISCIPLINE_LIST, YEAR_FIRST, YEAR_LAST,
  } from './facts.js'
  import '../route-page.css'

  // The <title> and description are GENERATED, for the same reason the hero
  // is: a "16 case studies" typed into a meta tag is the one number nobody
  // notices going stale, because nothing on screen changes when a seventeenth
  // case lands in $data/site.js. See ./facts.js.
  const TITLE = `Work Archive — ${CASE_COUNT} Case Studies by LOOM`
  const DESC =
    `The full LOOM archive: ${CASE_COUNT} case studies across ${COUNTRY_COUNT} countries, ` +
    `${YEAR_FIRST}–${YEAR_LAST} — ${DISCIPLINE_LIST}. ` +
    `Filter by discipline, market or year and open any case for the brief, the work and the market it launched in.`
  const CANONICAL = 'https://www.loomstudio-jo.com/work'
</script>

<svelte:head>
  <title>{TITLE}</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href={CANONICAL} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={CANONICAL} />
  <meta property="og:title" content={TITLE} />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="https://www.loomstudio-jo.com/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={TITLE} />
  <meta name="twitter:description" content={DESC} />
</svelte:head>

<div class="route-page">
  <WorkIndex />

  <Contact />
</div>
