<!--
  Floating WhatsApp button — bottom-right on every viewport.
  Woven-wool mark to match the textile identity; opens a prefilled chat.
-->
<script>
  import { browser } from '$app/environment'
  import { fly } from 'svelte/transition'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import { BRAND } from '$data/site.js'
  import './whatsapp-fab.css'

  const HELLO = encodeURIComponent('Hi LOOM — I came from loomstudio-jo.com and I’d like to start a project.')

  // THE DUCK IS GONE (11 Aug 2026, client request). This button used to
  // measure, on a 160ms interval, whether its own resting footprint sat over
  // rendered text — querySelectorAll over every p/h1-h4/li/button/a in the
  // document, a getBoundingClientRect on each, then a TreeWalker and
  // Range.getClientRects() walk of the text nodes of anything that overlapped —
  // and collapsed itself to 56% scale and 62% opacity when it did. It was the
  // same machinery the butterfly carried, in a second copy, and it is deleted
  // for the same reason: a floating action button is allowed to float over
  // content. It is now always full size and full opacity.
  //
  // git has it if it is ever wanted: this file before 11 Aug 2026.

  // Always short — this sits inside a small bubble next to a 76px button, not
  // a sentence. Rotates so a reader who lingers doesn't see the same line on
  // every cycle. LIVE — this loop is a different, unrelated thing from the
  // deleted duck above; do not confuse the two or delete this one.
  const PROMPTS = ['Message us', 'Any questions?', 'We reply fast', 'Say hi 👋']
  const SHOW_MS = 5000
  const HIDE_MS = 10000

  let locked = $state(false)

  // Yield to overlays/menus — same signal MobileChrome watches
  $effect(() => {
    if (!browser) return
    const sync = () => {
      const html = document.documentElement
      locked = html.classList.contains('overlay-open') || html.classList.contains('menu-open')
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  })

  const visible = $derived(!locked)
  const active = $derived(visible && !reducedMotion.current)

  /** Cycles PROMPTS on a show/hide loop — 5s visible, 10s gone, repeat.
   *  Paused whenever the FAB itself is hidden (an overlay/menu is open) so it
   *  can't pop back in behind a modal and re-trigger the moment it closes. */
  let promptVisible = $state(false)
  let promptIndex = $state(0)
  let timer = null

  $effect(() => {
    if (!browser || !active) { promptVisible = false; clearTimeout(timer); return }
    let mounted = true
    const showTimer = () => {
      promptVisible = true
      timer = setTimeout(() => {
        if (!mounted) return
        promptVisible = false
        promptIndex = (promptIndex + 1) % PROMPTS.length
        timer = setTimeout(() => { if (mounted) showTimer() }, HIDE_MS)
      }, SHOW_MS)
    }
    // a beat after mount, not instantly on load — the button itself is still
    // sliding in at that point (see the FAB's own spring below)
    timer = setTimeout(showTimer, 1400)
    return () => { mounted = false; clearTimeout(timer) }
  })

  const scale = $derived(visible ? 1 : 0.9)
  const opacity = $derived(visible ? 1 : 0)
  const fabStyle = $derived(
    reducedMotion.current
      ? `opacity: ${opacity}; transform: scale(${scale}); transition: opacity 0.2s linear; pointer-events: ${visible ? 'auto' : 'none'};`
      : `opacity: ${opacity}; transform: translateY(${visible ? 0 : 96}px) scale(${scale}); ` +
        `transition: transform 0.4s cubic-bezier(0.34, 1.15, 0.64, 1), opacity 0.4s; pointer-events: ${visible ? 'auto' : 'none'};`
  )
</script>

<div class="wa-fab-stack">
  {#if promptVisible}
    <div
      class="wa-fab-bubble"
      transition:fly={{ y: 8, duration: 400, opacity: 0 }}
    >
      {PROMPTS[promptIndex]}
      <i class="wa-fab-bubble__tail" aria-hidden="true"></i>
    </div>
  {/if}

  <a
    class="wa-fab"
    href="{BRAND.whatsapp}?text={HELLO}"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with LOOM on WhatsApp"
    style={fabStyle}
    aria-hidden={!visible}
    tabindex={visible ? 0 : -1}
  >
    <!-- `loading="lazy"` is a no-op here — this button is `position: fixed`
         inside the viewport rect from the first frame, so the browser's
         viewport-proximity heuristic always treats it as already visible and
         fetches it immediately regardless of the attribute. The lever that
         actually works for an always-in-view fixed element is priority, not
         laziness: `fetchpriority="low"` keeps the request off the critical
         path so it doesn't compete with the hero art and fonts for bandwidth
         on first paint, without leaving the button visibly empty the way
         deferring the src until an interaction would. -->
    <img
      src="/img/whatsapp-wool.webp"
      alt=""
      width="192"
      height="192"
      loading="lazy"
      decoding="async"
      fetchpriority="low"
    />
    <span class="wa-fab__label">WhatsApp us</span>
  </a>
</div>
