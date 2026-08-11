<!--
  The site-wide contact popup. Mounted once in the layout/page; opened from
  anywhere via `wizard.open(...)` (see $lib/wizard.svelte.js).

  Overlay contract (also carried by Nav's drawer and NeedModal): toggle
  `.overlay-open` on <html> — styles.css sets `html.overlay-open,
  html.menu-open { overflow: hidden }`, which is the scroll lock (this used
  to be reinforced by Lenis also stopping on that class; Lenis is gone, this
  CSS rule was always the real lock and still is) — close on Escape, trap Tab
  inside, restore focus to the trigger on every close path.
-->
<script>
  import { browser } from '$app/environment'
  import { fade } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { wizard } from '$lib/wizard.svelte.js'
  import { BottomSheet, isMobile, createSheetScrollHandoff } from '$lib/sheet.svelte.js'
  import ContactWizard from './ContactWizard.svelte'
  import SheetHandle from './SheetHandle.svelte'
  import { BRAND } from '$data/site.js'

  let panelEl = $state(null)
  let triggerEl = null // the element focused the instant the modal opened — restored on every close path, not just Escape

  const sheet = new BottomSheet(() => wizard.close())

  $effect(() => isMobile.start())
  $effect(() => { sheet.setPanel(panelEl) })

  function requestClose() {
    if (isMobile.current && !sheet.reduced) sheet.animateOut()
    else wizard.close()
  }

  // Slide the sheet in the instant the modal opens on a phone. Runs whenever
  // isOpen or isMobile.current flips true together — mirrors the React
  // effect's [isOpen, isMobile] dependency pair.
  $effect(() => {
    if (wizard.isOpen && isMobile.current) sheet.animateIn()
  })

  // The overlay lock, focus trap and focus restore. Fires on every close path
  // (Escape, backdrop, the ✕, a completed send) because the cleanup is what
  // does the restoring, not the Escape handler itself.
  $effect(() => {
    if (!browser || !wizard.isOpen) return

    triggerEl = document.activeElement
    document.documentElement.classList.add('overlay-open')

    const onKey = (e) => {
      if (e.key === 'Escape') { requestClose(); return }
      if (e.key !== 'Tab') return
      const f = panelEl?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!f || !f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => panelEl?.querySelector('button, input')?.focus(), 60)

    return () => {
      document.documentElement.classList.remove('overlay-open')
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      if (triggerEl && document.contains(triggerEl)) triggerEl.focus()
    }
  })

  let bodyEl = $state(null)
  const handoff = createSheetScrollHandoff(sheet.bind, () => bodyEl)

  // Desktop panel entrance/exit: y + opacity + a touch of scale, matching the
  // React version's `{ y: 40, opacity: 0, scale: 0.98 }` -> rest. `fly` alone
  // has no scale axis, so this is a small custom transition rather than
  // dropping the scale.
  function popIn(node, { y = 40, duration = 500 }) {
    return {
      duration,
      easing: cubicOut,
      css: (t, u) => `opacity: ${t}; transform: translateY(${u * y}px) scale(${1 - u * 0.02});`,
    }
  }
  function popOut(node, { y = 24, duration = 500 }) {
    return {
      duration,
      easing: cubicOut,
      css: (t, u) => `opacity: ${t}; transform: translateY(${u * y}px) scale(${1 - u * 0.01});`,
    }
  }
</script>

{#if wizard.isOpen}
  <div
    class="wmodal"
    role="dialog"
    aria-modal="true"
    aria-label="Start a project with LOOM"
    transition:fade={{ duration: 300 }}
  >
    <button class="wmodal-backdrop" onclick={requestClose} aria-label="Close" tabindex="-1"></button>

    {#if isMobile.current}
      <div
        class="wmodal-panel is-sheet"
        style="transform: translateY({sheet.y}px);"
        bind:this={panelEl}
      >
        <SheetHandle bind={sheet.bind} />
        <header class="wmodal-bar">
          <span class="wmodal-brand">LOOM — Start a project</span>
          <button class="wmodal-close" onclick={requestClose} aria-label="Close">✕</button>
        </header>
        <div class="wmodal-scroll" bind:this={bodyEl} {...handoff}>
          {#key wizard.seed?._t}
            <ContactWizard seed={wizard.seed} />
          {/key}
          <p class="wmodal-direct">
            Rather talk now? <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
          </p>
        </div>
      </div>
    {:else}
      <div
        class="wmodal-panel"
        bind:this={panelEl}
        in:popIn
        out:popOut
      >
        <header class="wmodal-bar">
          <span class="wmodal-brand">LOOM — Start a project</span>
          <button class="wmodal-close" onclick={requestClose} aria-label="Close">✕</button>
        </header>
        <div class="wmodal-scroll">
          {#key wizard.seed?._t}
            <ContactWizard seed={wizard.seed} />
          {/key}
          <p class="wmodal-direct">
            Rather talk now? <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
          </p>
        </div>
      </div>
    {/if}
  </div>
{/if}
