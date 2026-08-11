<!--
  The need panel — what a Counter tile opens now.

  The tile used to call wizard.open({ note: need }) directly: eight
  photographs of a decision, and the first touch produced a form. The page
  never said what "AI systems" or "Brand identity" actually means at LOOM, so
  the form was asking for a commitment the page had not earned yet. This sits
  between them — the detail, then the brief — and the wizard still receives
  the same `note`, so nothing downstream of it changed.

  It deliberately reuses WizardModal's overlay contract rather than inventing
  a second one: `.overlay-open` on <html> (the layout's Lenis watches that
  class and stops on it — a modal that forgets it leaves the page scrolling
  underneath), Escape to close, a Tab focus trap, and the shared bottom sheet
  on phones. Two overlays with two different contracts is how a site ends up
  with one of them scrolling the body behind it. FORGE's popup follows this
  same contract — get it right here and Forge inherits it correctly.
-->
<script>
  import { browser } from '$app/environment'
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import { NEEDS } from '$data/needs.js'
  import { BottomSheet, isMobile, createSheetScrollHandoff } from '$lib/sheet.svelte.js'
  import WoolButton from './WoolButton.svelte'
  import SheetHandle from './SheetHandle.svelte'
  import './needmodal.css'

  let { need = null, onClose } = $props()

  let panelEl = $state(null)
  let bodyEl = $state(null)
  // The element that had focus the instant this panel opened — a tile,
  // almost always. Restored on close so keyboard/screen-reader users land
  // back where they were instead of at <body>, which is where focus goes by
  // default once the element it was on stops being part of any active trap.
  let triggerEl = null

  const sheet = new BottomSheet(() => onClose?.())
  $effect(() => isMobile.start())
  $effect(() => { sheet.setPanel(panelEl) })
  const handoff = createSheetScrollHandoff(sheet.bind, () => bodyEl)

  // `need` is the prop; `shown` is what is on screen. They diverge the moment
  // a "pairs with" button swaps the panel's contents without closing it —
  // that is the whole point of the cross-sell, and it is why this is local
  // state seeded from the prop rather than the prop read directly.
  let shown = $state(need)
  $effect(() => { if (need) shown = need })

  const isOpen = $derived(Boolean(need))
  const d = $derived(shown ? NEEDS[shown] : null)

  function requestClose() {
    if (isMobile.current && !sheet.reduced) sheet.animateOut()
    else onClose?.()
  }

  $effect(() => {
    if (isOpen && isMobile.current) sheet.animateIn()
  })

  // The overlay lock, focus trap and focus restore.
  //
  // Only the release matters here, not the acquire: `start()` below hands off
  // to WizardModal by opening it BEFORE this panel closes, specifically so
  // that by the time this cleanup runs, `wizard.isOpen` is already true and
  // the unconditional class removal that used to sit here doesn't fire — that
  // removal was real: it dropped `.overlay-open` for a frame while the wizard
  // was already on screen, Lenis un-paused under a modal, then the wizard's
  // own effect put the class straight back. A flash, not a freeze, but a real
  // one — caught with two `[role="dialog"]` elements on screen at once,
  // mid-handoff.
  $effect(() => {
    if (!browser || !isOpen) return

    // Capture BEFORE anything below moves focus into the panel — this is
    // still the tile a mouse click or Enter/Space keypress just activated.
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
    const t = setTimeout(() => panelEl?.querySelector('.nm-close')?.focus(), 60)

    return () => {
      // Only release the lock if nothing else has since claimed it — see the
      // comment above this effect.
      if (!wizard.isOpen) document.documentElement.classList.remove('overlay-open')
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      // Not guarded on `document.activeElement` being inside the panel first
      // — Escape and the close button both leave focus inside the panel
      // right up to the moment it unmounts, so that check would never skip
      // anything real; it would only add a way to silently do nothing.
      if (triggerEl && document.contains(triggerEl)) triggerEl.focus()
    }
  })

  // Swapping to a paired need scrolls the panel's own scroller back to the
  // top. Without this the reader lands halfway down a panel they have not
  // read, because the scroll position belongs to the SCROLLER and the
  // scroller did not unmount — only its contents changed.
  function swapTo(next) {
    shown = next
    bodyEl?.scrollTo({ top: 0, behavior: reducedMotion.current ? 'auto' : 'smooth' })
  }

  function start() {
    // Open the wizard FIRST, close this panel a frame later — the reverse of
    // what this used to do. Closing first reads as more correct but isn't:
    // `.overlay-open` is a plain classList toggle, not reference-counted, so
    // whichever effect's cleanup runs first removes it outright. Close-then-
    // open left a real gap — measured at ~200-300ms, with TWO
    // `[role="dialog"]` elements on screen at once (this panel mid-exit, the
    // wizard mid-entrance) — where Lenis resumed under a modal that was still
    // visibly there. Opening first means `.overlay-open` is already claimed
    // by the wizard by the time this panel's own cleanup asks whether it's
    // safe to let go (see the guard above) — it never lets go, because the
    // wizard now owns the lock, and the class is never removed and re-added,
    // so there is nothing left to flicker.
    wizard.open({ note: shown })
    requestAnimationFrame(() => onClose?.())
  }

  const nmYarn = $derived(`var(--nm-accent-${d?.yarn}, var(--magenta))`)
</script>

{#if isOpen && d}
  <div
    class="nm-scrim"
    transition:fade={{ duration: reducedMotion.current ? 10 : 350, easing: cubicOut }}
    onclick={(e) => { if (e.target === e.currentTarget) requestClose() }}
  >
    {#if isMobile.current}
      <div
        class="nm-panel is-sheet"
        style="transform: translateY({sheet.y}px); --nm-yarn: {nmYarn};"
        bind:this={panelEl}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nm-title"
      >
        <SheetHandle bind={sheet.bind} />

        <button type="button" class="nm-close" onclick={requestClose} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div class="nm-body" data-lenis-prevent bind:this={bodyEl} {...handoff}>
          {@render body()}
        </div>

        <div class="nm-foot">
          <WoolButton label="Start a project" size="big" onclick={start} />
          <button type="button" class="nm-foot-link" onclick={requestClose}>Keep looking</button>
        </div>
      </div>
    {:else}
      <div
        class="nm-panel"
        style="--nm-yarn: {nmYarn};"
        bind:this={panelEl}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nm-title"
        in:fly={reducedMotion.current ? { opacity: 0, duration: 10 } : { y: 42, opacity: 0, duration: 500, easing: cubicOut }}
        out:fly={reducedMotion.current ? { opacity: 0, duration: 10 } : { y: 26, opacity: 0, duration: 500, easing: cubicOut }}
      >
        <button type="button" class="nm-close" onclick={requestClose} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div class="nm-body" data-lenis-prevent bind:this={bodyEl}>
          {@render body()}
        </div>

        <!-- Outside .nm-body on purpose: the body scrolls, this does not. A
             CTA that scrolls out of a 90vh panel is a CTA the reader has to
             go looking for. -->
        <div class="nm-foot">
          <WoolButton label="Start a project" size="big" onclick={start} />
          <button type="button" class="nm-foot-link" onclick={requestClose}>Keep looking</button>
        </div>
      </div>
    {/if}
  </div>
{/if}

{#snippet body()}
  <!-- The hero is the same 21:9 the tile itself wears, so the panel reads as
       that tile enlarged rather than as a new place — 1400x600, the ratio
       the whole need set is rendered at.

       ONE candidate per <source>. A srcset of two bare URLs with no
       descriptor is not a fallback chain, it is two 1x candidates and
       therefore invalid — the browser is free to pick either. When the
       dedicated panel art lands, this points at it by swapping the path, not
       by listing both. -->
  <div class="nm-hero">
    <picture style="display: contents">
      <source type="image/avif" srcset="/img/needs/{d.key}-wide.avif" />
      <img
        class="nm-hero-img"
        src="/img/needs/{d.key}-wide.webp"
        alt=""
        width="1400"
        height="600"
        decoding="async"
      />
    </picture>
    <div class="nm-hero-ink">
      <p class="nm-kicker">{d.group}</p>
      <h2 class="nm-title" id="nm-title">{shown}</h2>
    </div>
  </div>

  <p class="nm-hook">{d.hook}</p>
  <p class="nm-para">{d.body}</p>

  <div class="nm-grid">
    <div class="nm-col">
      <h3 class="nm-h3">What arrives</h3>
      <ul class="nm-list">
        {#each d.deliverables as line (line)}
          <li><i class="nm-tick" aria-hidden="true"></i>{line}</li>
        {/each}
      </ul>
    </div>
    <div class="nm-col nm-col--side">
      <div class="nm-fact">
        <p class="nm-fact-label">Timeline</p>
        <p class="nm-fact-value">{d.timeline}</p>
      </div>
      <div class="nm-fact">
        <p class="nm-fact-label">Pairs with</p>
        <div class="nm-pairs">
          {#each d.pairs.filter((p) => NEEDS[p]) as p (p)}
            <button type="button" class="nm-pair" onclick={() => swapTo(p)}>{p}</button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <p class="nm-proof"><span>Why us</span>{d.proof}</p>
{/snippet}
