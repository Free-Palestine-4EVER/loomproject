<!--
  Native-app chrome for mobile only — a floating bottom CTA pill that behaves
  like iOS Safari's URL bar: appears once you've scrolled past the hero,
  hides while flicking down, reappears the instant you scroll up, and stays
  out of the way while any overlay/menu owns the screen.
-->
<script>
  import { browser } from '$app/environment'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import './mobilechrome.css'

  const MOBILE_QUERY = '(max-width: 767px)'
  const HIDE_ACCUM = 10 // px of same-direction travel before the pill flips state — the "lerp" against jitter

  /* The floating "Start a project" pill, switched off 14 Aug 2026 at the
     client's request — see the long note at the markup below for what else
     went with it and why the machinery around it is still here. A named
     constant rather than deleting the block, so the intent reads as a decision
     rather than as dead code somebody should tidy away. */
  const SHOW_CTA_PILL = false

  let isMobile = $state(false)
  let pastHero = $state(false)
  let hiddenByScroll = $state(false)
  let locked = $state(false)

  let lastY = 0
  let accum = 0
  let dir = 0

  // Mount/unmount with viewport — matches the (max-width: 767px) gate everywhere else in this file
  $effect(() => {
    if (!browser) return
    const mq = window.matchMedia(MOBILE_QUERY)
    const sync = () => { isMobile = mq.matches }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  })

  // Reveal past the hero, and drive the direction-aware hide/show
  $effect(() => {
    if (!browser || !isMobile) return
    lastY = window.scrollY
    const heroLimit = () => window.innerHeight * 0.82

    const onScroll = () => {
      const y = window.scrollY
      pastHero = y > heroLimit()

      if (reducedMotion.current) { lastY = y; return } // reduced-motion: no direction-based hiding, ever

      const dy = y - lastY
      lastY = y
      if (Math.abs(dy) < 0.5) return

      const d = dy > 0 ? 1 : -1
      if (d !== dir) { dir = d; accum = 0 }
      accum += Math.abs(dy)

      if (d < 0) {
        // scrolling up — reappear immediately, like Safari's chrome
        hiddenByScroll = false
        accum = 0
      } else if (y > heroLimit() && accum > HIDE_ACCUM) {
        hiddenByScroll = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  })

  // Yield to overlays/menus — watched via class on <html>, same signal Lenis itself watches
  $effect(() => {
    if (!browser || !isMobile) return
    const sync = () => {
      const html = document.documentElement
      locked = html.classList.contains('overlay-open') || html.classList.contains('menu-open')
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  })

  const visible = $derived(pastHero && !hiddenByScroll && !locked)
  const pillStyle = $derived(
    reducedMotion.current
      ? `opacity: ${pastHero && !locked ? 1 : 0}; transition: opacity 0.2s linear; pointer-events: ${visible ? 'auto' : 'none'};`
      : `transform: translateY(${visible ? 0 : 96}px); opacity: ${visible ? 1 : 0}; ` +
        `transition: transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.35s; pointer-events: ${visible ? 'auto' : 'none'};`
  )
</script>

<!-- THE FLOATING "START A PROJECT" PILL IS REMOVED (14 Aug 2026, client:
     "remove the start a project button on bottom of the screen"). Its desktop
     twin, <StartProject />, is unmounted in routes/+layout.svelte in the same
     pass — the CTA existed as one pill per viewport, so taking out only one of
     them would have left it on the other kind of device.

     The machinery above (`isMobile`, `visible`, `pastHero`, `pillStyle`) is
     left in place: it is what decides when the pill may show, it costs a
     matchMedia listener and a scroll flag, and putting the pill back is
     re-adding this block and nothing else. `.mobile-cta-pill` in
     mobilechrome.css stays with it for the same reason.

     Nothing else was positioned against it — the WhatsApp FAB's own bottom
     offset is a fixed value tuned independently (whatsapp-fab.css says it is
     "tuned against .mobile-cta-pill", but it is a literal, not a calc), so no
     other element moves as a result of this. Verified by measurement. -->
{#if SHOW_CTA_PILL && isMobile}
  <div
    class="mobile-cta-pill"
    style={pillStyle}
    aria-hidden={!visible}
  >
    <button
      type="button"
      class="mobile-cta-pill__btn"
      onclick={() => wizard.open({})}
      tabindex={visible ? 0 : -1}
    >
      Start a project
    </button>
  </div>
{/if}
