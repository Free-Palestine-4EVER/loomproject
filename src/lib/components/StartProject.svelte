<!--
  The persistent "Start a project" bar — DESKTOP ONLY.

  Mobile already had this: MobileChrome's floating pill, same label, same
  wizard, since before this file existed. Adding a second one there would put
  two identical pills in the same 40px of screen, so this mounts strictly
  above 767px and MobileChrome keeps everything below it. One CTA per
  viewport, two implementations, because the two viewports genuinely want
  different furniture.

  It is bottom-CENTRE, not bottom-right. The WhatsApp FAB owns the right
  corner (right: 28, 110px tall, plus a bubble that reaches up to 150) and the
  client asked for both to stay; a second thing in that corner would either
  overlap the bubble or push it somewhere it was not designed for. The centre
  is empty at every width and reads as a page-level action rather than a
  third floating widget.

  z-index 92 (startproject.css) — the same layer WhatsAppFab and MobileChrome
  already sit on, deliberately UNDER the overlay (95) and the wizard modal
  (96), so a CTA to open a dialog is never painted on top of that dialog.
-->
<script>
  import { browser } from '$app/environment'
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import './startproject.css'

  const DESKTOP_QUERY = '(min-width: 768px)'

  let isDesktop = $state(false)
  let pastHero = $state(false)
  let locked = $state(false)

  $effect(() => {
    if (!browser) return
    const mq = window.matchMedia(DESKTOP_QUERY)
    const sync = () => { isDesktop = mq.matches }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  })

  /* Past the hero only. The hero already carries "Start weaving" as its own
     primary button — showing this over it would be the same offer twice in
     one screenful, and the floating copy would be the weaker of the two.

     ——— AND IT RETRACTS WHILE THE READER IS READING (13 Aug 2026) ———
     A UI pass down the finished page found this pill sitting ON TOP of real
     content at most scroll positions — over a pricing card's "from" figure,
     over the software section's captions, over the app stage. That is the
     cost of a permanently parked centre-bottom object on a page this long,
     and it is not a z-index or spacing problem: no amount of page padding
     helps something that is fixed to the viewport.

     So it follows the header's own rule, which this site already established:
     retract on the way DOWN, come back the instant the reader scrolls UP.
     Reading is downward, so the pill is out of the way exactly while it would
     be covering something; the moment anyone looks back up — the gesture that
     precedes deciding — it is there. Same three guards as Nav.svelte's bar,
     for the same reasons: a 6px dead zone (trackpad inertia and rubber-band
     scrolling emit tiny alternating deltas, and a control that answers those
     flutters), never retracted near the top of the page, and never retracted
     while an overlay owns the screen (handled by `locked` below). */
  let retracted = $state(false)
  $effect(() => {
    if (!browser || !isDesktop) return
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      pastHero = y > window.innerHeight * 0.82
      const dy = y - last
      if (Math.abs(dy) > 6) {
        retracted = dy > 0 && y > window.innerHeight * 1.2
        last = y
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  })

  // Hide while any overlay owns the screen. Same MutationObserver contract
  // the layout uses to stop Lenis — a fixed CTA left mounted under a modal is
  // still in the tab order, which is how a focus trap ends up trapping
  // nothing.
  $effect(() => {
    if (!browser) return
    const root = document.documentElement
    const read = () => { locked = root.classList.contains('overlay-open') || root.classList.contains('menu-open') }
    read()
    const obs = new MutationObserver(read)
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  })

  const show = $derived(isDesktop && pastHero && !locked && !retracted)
</script>

{#if show}
  <div
    class="sp-bar"
    in:fly={{ y: reducedMotion.current ? 0 : 26, opacity: 0, duration: reducedMotion.current ? 10 : 420, easing: cubicOut }}
    out:fly={{ y: reducedMotion.current ? 0 : 18, opacity: 0, duration: reducedMotion.current ? 10 : 420, easing: cubicOut }}
  >
    <button type="button" class="sp-btn" onclick={() => wizard.open({})}>
      <span class="sp-dot" aria-hidden="true"></span>
      Start a project
      <span class="sp-arrow" aria-hidden="true">→</span>
    </button>
  </div>
{/if}
