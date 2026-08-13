<!--
  The app shell.

  Everything here except the page itself is chrome that outlives a route
  change: the running loom backdrop, the loader, the cursor, the scroll
  progress bar, the nav, the footer, the butterfly, and the persistent CTAs.

  In the React build all of this was wrapped in <AuthProvider><WizardProvider>.
  Both are gone — the rune singleton in
  lib/wizard.svelte.js are reactive to every importer with no tree wrapping,
  so the shell is the shell rather than the shell plus two context frames.
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { afterNavigate } from '$app/navigation'
  import { page } from '$app/state'
  import { reducedMotion, coarsePointer } from '$lib/motion.svelte.js'
  import { mountAnchorLinks } from '$lib/scroll.svelte.js'
  import { mountImageWarm, rewarmAfterNavigation } from '$lib/imageWarm.js'
  import { i18n, localeHref } from '$lib/i18n.svelte.js'

  // hreflang alternates — every route on the site, both locales, computed
  // from the CURRENT page's own path (not hardcoded per route) so a Wave B
  // route added later gets correct alternates automatically. 'x-default'
  // points at the English URL: the brief's own rule is "/ stays English
  // with no prefix", i.e. English is the unprefixed default for a reader
  // whose Accept-Language the crawler cannot resolve to either locale.
  const SITE = 'https://www.loomstudio-jo.com'
  const altEn = $derived(SITE + localeHref(page.url.pathname, 'en'))
  const altAr = $derived(SITE + localeHref(page.url.pathname, 'ar'))

  import Loader from '$lib/components/Loader.svelte'
  import ScrollProgress from '$lib/components/ScrollProgress.svelte'
  import Nav from '$lib/components/Nav.svelte'
  import Footer from '$lib/components/Footer.svelte'
  import Flyer from '$lib/components/Flyer.svelte'
  import MobileChrome from '$lib/components/MobileChrome.svelte'
  import StartProject from '$lib/components/StartProject.svelte'
  import WhatsAppFab from '$lib/components/WhatsAppFab.svelte'
  import WizardModal from '$lib/components/WizardModal.svelte'

  // Design system, in cascade order. These are global on purpose — the class
  // names in them (.hero-h1, .loom-bg-warp, .fg-side-tab, …) are already
  // carefully namespaced across 16k lines, and putting them through Svelte's
  // scoping would rewrite every selector for no benefit and a large
  // regression surface. Colocated per-component CSS is imported by each
  // component. wool.css goes LAST so it wins on ties, exactly as main.jsx
  // ordered it.
  import '$lib/styles/styles.css'
  import '$lib/styles/loom-bg.css'
  import '$lib/styles/textile.css'
  import '$lib/styles/textile-details.css'
  import '$lib/styles/brand-skin.css'
  import '$lib/styles/sheet.css'
  import '$lib/styles/wool.css'
  // LAST of all: the button scale settles ties between the ten component
  // stylesheets that each sized their own CTA. See button-scale.css.
  import '$lib/styles/button-scale.css'

  let { children } = $props()

  /* KEEP `<html lang>` CORRECT ACROSS CLIENT-SIDE NAVIGATION. hooks.server.js
     writes the right `lang` into the BYTES on the wire — but that hook only
     ever runs for a real HTTP request (a full page load or a hard refresh).
     Clicking the switcher, or any in-app link between an English and an
     Arabic route, is a SvelteKit CLIENT-SIDE transition: the router fetches
     the new route's data and patches the existing DOM, and it never asks the
     server to re-render `app.html` — so without this, `<html lang>` would
     stay stuck at whatever it was on the tab's very first load, silently
     wrong for every navigation after the first. This effect is the
     client-side half of the same promise hooks.server.js makes for the
     first one: read the now-current locale (i18n.locale — a getter over
     page.data/page.url, safe to read reactively, see i18n.svelte.js) and
     write it straight to the one DOM node that matters. Deliberately not
     `dir` — see hooks.server.js's own note on why this project never sets
     that at the document level. */
  $effect(() => {
    if (!browser) return
    document.documentElement.lang = i18n.locale
  })

  /* ...AND WRITE THE PREFERENCE COOKIE FROM THE CLIENT, for the same reason
     one layer down. hooks.server.js sets `loom_locale`, and the blocking
     script in app.html reads it to send a returning Arabic visitor from `/`
     to `/ar` before first paint. But every route on this site is
     `prerender = true`, so in production Vercel serves flat HTML off the CDN
     and that hook NEVER RUNS for a real visitor — only in dev and preview,
     where nobody needed it. The cookie would never exist, the redirect would
     never fire, and "remember my language" would be a comment describing
     something that does not happen.

     So the client writes it, on whichever locale is actually being read —
     which also covers the case the switcher's own click handler would miss:
     someone who arrives on an `/ar` link from outside and never touches the
     control at all. SameSite=Lax because the only thing that reads it is a
     top-level navigation to this same site; a year, because a language
     preference does not expire in a session. */
  $effect(() => {
    if (!browser) return
    document.cookie = `loom_locale=${i18n.locale}; path=/; max-age=31536000; samesite=lax`
  })

  // Live media queries. Started here rather than per-component so there is one
  // matchMedia listener per query for the whole app instead of one per
  // consumer.
  onMount(() => {
    const stopRM = reducedMotion.start()
    const stopCP = coarsePointer.start()
    const stopAnchors = mountAnchorLinks()

    // (The account check that used to run here is gone with Forge — nothing
    // on this site is behind a login any more.)

    // What the page may spend off-screen: parks looping animations, and on
    // touch devices evicts far-off image bitmaps so a fast flick cannot walk
    // the tab into iOS Safari's memory ceiling. Runs regardless of motion
    // preference — it is a memory budget, not an effect.
    let stopBudget = () => {}
    import('$lib/viewportBudget.js').then((m) => {
      stopBudget = m.mountViewportBudget?.() || (() => {})
    })

    // The client's "every photo must be downloaded before the user scrolls"
    // requirement. Waits for `load`, then walks the document forcing every
    // remaining `loading="lazy"` image (plus CSS backgrounds and video
    // posters) to fetch, batched so the first screen is never starved. Also
    // runs regardless of motion preference — bandwidth, not motion — and is
    // gated only on `navigator.connection.saveData` inside the module
    // itself. See src/lib/imageWarm.js for the full design.
    const stopWarm = mountImageWarm()

    return () => {
      stopRM(); stopCP(); stopAnchors(); stopBudget(); stopWarm()
    }
  })

  // A client-side route change (`/work` -> `/machine`, etc.) swaps in a new
  // document's worth of lazy images without ever firing another `load`
  // event, so the warm-up above would otherwise only ever run once, on the
  // very first route. Re-kick it on every navigation instead.
  afterNavigate(() => rewarmAfterNavigation())

  // The interaction pack and the FX pack are torn down and rebuilt when
  // reduced-motion flips, not merely skipped at mount — a user who turns it on
  // mid-session (or whose laptop drops into Battery Saver, which forces the
  // query on) must lose both immediately.
  //
  // Both are dynamically imported, so a reduced-motion visitor never
  // downloads either: fx.js and interactions.js are together the largest
  // block of behaviour-only JS on the site, and this is the branch where
  // neither is wanted.
  //
  // Scrolling itself is no longer part of this branch. The site used to run
  // Lenis here for "smooth" scroll — removed. Lenis intercepts wheel/touch
  // input and interpolates toward a target position, which by construction
  // renders at least a frame behind the input; native scroll on macOS/iOS/
  // Chrome has zero input latency and is already smooth. Every scroll site in
  // the codebase now uses the browser's native smooth scroll unconditionally
  // (see scroll.svelte.js), so there is no reduced-motion branch to gate here
  // any more — reduced-motion readers were always on native scroll, and now
  // everyone is.
  $effect(() => {
    if (!browser || reducedMotion.current) return

    let stops = []
    let cancelled = false
    const keep = (fn) => { cancelled ? fn?.() : stops.push(fn || (() => {})) }

    import('$lib/interactions.js').then((m) => keep(m.mountInteractions?.()))
    import('$lib/fx.js').then((m) => keep(m.mountFx?.()))

    return () => {
      cancelled = true
      stops.forEach((fn) => fn?.())
      stops = []
    }
  })
</script>

<!-- Every route's own <svelte:head> (each +page.svelte already sets its own
     title/description/OG) merges with this one rather than replacing it —
     that is how SvelteKit's <svelte:head> works across nested layouts — so
     this is the one place the hreflang pair needs writing, not fourteen. -->
<svelte:head>
  <link rel="alternate" hreflang="en" href={altEn} />
  <link rel="alternate" hreflang="ar" href={altAr} />
  <link rel="alternate" hreflang="x-default" href={altEn} />
</svelte:head>

<!-- The loom never stops running — a fixed, compositor-only backdrop behind
     every section (see loom-bg.css). Pure CSS, so it is in the server HTML and
     painting before a single byte of JS has been parsed. -->
<div class="loom-bg" aria-hidden="true">
  <div class="loom-bg-warp"></div>
  <div class="loom-bg-dye"><i></i><i></i><i></i></div>
  <div class="loom-bg-weft"></div>
  <div class="loom-bg-weft loom-bg-weft--low"></div>
</div>

<Loader />
<ScrollProgress />
<Nav />

<main>
  {@render children()}
</main>

<Footer />

<!-- the butterfly rides the whole page, above the copy and under the nav -->
<Flyer />

<MobileChrome />

<!-- The persistent CTA. MobileChrome already carries an identical pill below
     768px, so this one mounts only above it — one per viewport. Bottom-centre,
     because WhatsAppFab owns the right corner and the client asked for both to
     stay. -->
<StartProject />
<WhatsAppFab />

<WizardModal />
