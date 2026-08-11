<!--
  The site-wide contact popup — the studio's single most important conversion
  surface. Mounted once in the layout; opened from anywhere via
  `wizard.open({ intent, niche, note })` (see $lib/wizard.svelte.js).

  ── THE ONE RULE OF THIS COMPONENT: IT NEVER SCROLLS. ──────────────────────
  Not on a 1440 laptop, not on a 360 phone, on none of the four steps. The old
  panel was a header + an `overflow-y: auto` body, so on a phone the four
  intent cards ran off the bottom and the "most important thing on the page"
  arrived as a scroll bar. The rework designs TO the viewport instead:

    • the panel takes a DEFINITE height — `min(<cap>, <what the viewport has>)`
      — so every row inside it resolves against a real number rather than
      against content;
    • its interior is a grid whose stage row is `1fr` with `min-height: 0`,
      and every pane inside the stage is a flex column that gives its one
      elastic child the leftover and nothing more;
    • what does not fit at 360 is REDUCED, not scrolled — see wizard-modal.css
      for the two things that shrink (the intent card descriptions and the
      brand mark) and why.

  The steps themselves still come from ContactWizard.svelte, untouched: same
  four steps, same options, same fields, same validation, same WhatsApp/mail
  handoff, same `note` passthrough. This file owns the SHELL and the shell's
  stylesheet owns the layout; `.wizard` is re-laid-out with `display: contents`
  so the rail, the stage and this shell's own furniture become siblings in one
  grid without a single line of ContactWizard changing.

  Overlay contract (shared with Nav's drawer, NeedModal and Work's case
  overlay): toggle `.overlay-open` on <html> — styles.css sets
  `html.overlay-open, html.menu-open { overflow: hidden }`, which is the scroll
  lock. EXACTLY ONE lock: this component never touches `menu-open`, and it
  only removes `overlay-open` if it was the one that added it, so it cannot
  unlock the page under another overlay that is still open. The scroll offset
  is captured once on open and put back on close only if something moved it.
-->
<script>
  import { browser } from '$app/environment'
  import { fade } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { wizard } from '$lib/wizard.svelte.js'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import { BottomSheet, isMobile, createSheetScrollHandoff } from '$lib/sheet.svelte.js'
  import ContactWizard from './ContactWizard.svelte'
  import SheetHandle from './SheetHandle.svelte'
  import { BRAND } from '$data/site.js'
  import './wizard-modal.css'

  let panelEl = $state(null)
  let triggerEl = null // the element focused the instant the modal opened — restored on every close path, not just Escape

  const sheet = new BottomSheet(() => wizard.close())

  $effect(() => isMobile.start())
  $effect(() => { sheet.setPanel(panelEl) })

  /* THE EXIT IS CSS, NOT A SVELTE `out:`.
     ────────────────────────────────────────────────────────────────────────
     `out:` on this panel never got a single frame: with the panel inside the
     `{#if}` that is being destroyed, the block tore the subtree down while
     the outro was still queued, so the modal rose in beautifully and then
     blinked out — measured, not guessed (computed opacity stayed at 1 for
     every frame between the keypress and removal).
     So closing is a state flag: mark the dialog `.is-closing`, let a CSS
     animation play the panel down and the scrim off, and unmount when it is
     done. Same easing as the entrance, the reverse direction. */
  const CLOSE_MS = 320
  let closing = $state(false)
  let closeTimer = null

  function requestClose() {
    if (isMobile.current && !sheet.reduced) { sheet.animateOut(); return }
    if (closing) return
    closing = true
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => wizard.close(), reducedMotion.current ? 180 : CLOSE_MS)
  }

  // a fresh open must never inherit the last close's state
  $effect(() => {
    if (wizard.isOpen) { closing = false; clearTimeout(closeTimer) }
  })

  /* THE KEY MUST NOT CHANGE WHEN THE MODAL CLOSES.
     ────────────────────────────────────────────────────────────────────────
     The wizard is re-keyed so that opening it a second time with a different
     context (a different section's CTA, carrying a different `note`) rebuilds
     the form from step one rather than leaving the previous answers in it.
     `wizard.seed._t` is the monotonic stamp that makes two opens distinct.

     Keying the block directly on `wizard.seed?._t` looked equivalent and was
     not: `wizard.close()` sets `seed = null`, so the key flips to `undefined`
     in the SAME tick the outer `{#if wizard.isOpen}` starts its outro. Svelte
     then has to tear down and re-create a keyed block inside a block that is
     already being destroyed, and the outro never runs — the panel stayed
     mounted at full opacity, marked `inert`, forever.

     It only showed up on the Escape path. The ✕ and the backdrop call the
     exact same requestClose(), but a click lands in a different task to the
     keydown handler, so the two state writes did not coincide.

     Latching the last NON-NULL stamp fixes it: the key changes when a new
     wizard opens (which is what it is for) and never on close. */
  let seedKey = $state(0)
  $effect(() => { if (wizard.seed) seedKey = wizard.seed._t })

  // Slide the sheet in the instant the modal opens on a phone. Runs whenever
  // isOpen or isMobile.current flips true together.
  $effect(() => {
    if (wizard.isOpen && isMobile.current) sheet.animateIn()
  })

  // The overlay lock, focus trap and focus restore. Fires on every close path
  // (Escape, backdrop, the ✕, a completed send) because the cleanup is what
  // does the restoring, not the Escape handler itself.
  $effect(() => {
    if (!browser || !wizard.isOpen) return

    // Captured BEFORE focus moves into the panel — this is still the CTA the
    // visitor just activated, whichever of the dozen across the site it was.
    triggerEl = document.activeElement

    const root = document.documentElement
    // ONE lock. If another overlay already claimed `.overlay-open` (the
    // NeedModal -> wizard handoff opens this one before that one closes), we
    // neither re-add nor later release it — the owner does. `menu-open` is
    // the nav drawer's own class and is never read or written here, so the
    // two can never land on <html> at once because of this component.
    const claimed = !root.classList.contains('overlay-open')
    if (claimed) root.classList.add('overlay-open')
    // The lock is `overflow: hidden`, which preserves the offset on Chrome
    // and does not always on Safari — capture once, restore only if it moved.
    const scrollY = window.scrollY

    const onKey = (e) => {
      if (e.key === 'Escape') { requestClose(); return }
      if (e.key !== 'Tab') return
      const f = [...(panelEl?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) || [])].filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    // Into the dialog: the first real choice if there is one (the intent
    // cards), otherwise the first control — never the ✕, which would make
    // "close" the default action of the site's main conversion surface.
    const t = setTimeout(() => {
      // querySelector with a selector LIST returns the first match in
      // DOCUMENT order, not list order — and the ✕ is the panel's first
      // button, so a list would have focused "close" every time. Ordered
      // fallbacks, most-wanted first.
      const first =
        panelEl?.querySelector('.wintent') ||
        panelEl?.querySelector('.wchip') ||
        panelEl?.querySelector('.wform input') ||
        panelEl?.querySelector('button')
      first?.focus()
    }, 60)

    return () => {
      if (claimed) {
        root.classList.remove('overlay-open')
        if (Math.abs(window.scrollY - scrollY) > 1) window.scrollTo(0, scrollY)
      }
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      if (triggerEl && document.contains(triggerEl)) triggerEl.focus()
    }
  })

  let bodyEl = $state(null)
  const handoff = createSheetScrollHandoff(sheet.bind, () => bodyEl)

  /* ── THE SEND STEP'S TWO ACTIONS ARE BUILT HERE ───────────────────────────
     Step 4 is the last thing a prospective client sees before contacting the
     studio, and it was shipping two photographed knitted pills at ~350x140 —
     at that size the knit photograph reads as a cheap texture rather than a
     crafted control, and a purple pill next to a cyan one next to pink paper
     is three colour stories in one row.

     ContactWizard.svelte is not ours to edit (the inline Contact section
     renders the same component and must keep its knits), so the modal copy is
     UPGRADED IN PLACE instead: when a `.wsend` row appears inside this panel
     we read the two hrefs off the anchors ContactWizard already rendered,
     hide those anchors (wizard-modal.css), and append two natively-built
     actions carrying the SAME hrefs — a clear magenta primary for WhatsApp
     and a paper secondary for email.

     Reading the href rather than recomputing it is deliberate: the brief, the
     `note` passthrough, the subject line and the encoding all stay authored in
     exactly one place — ContactWizard's `$derived` — so the two paths cannot
     drift. The pane is re-created by the `{#key step}` in ContactWizard on
     every step change, so going back to edit and returning re-runs this with
     the rebuilt brief; the `data-wm-acts` latch keeps a single upgrade per
     pane (and stops the MutationObserver reacting to our own append).

     Nothing else is lost by not clicking the originals: the only handler on
     them is `onclick={() => onState?.('sent')}`, and this shell does not pass
     `onState`. */
  const ICON = {
    wa: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="currentColor"><path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.8 9.8 0 0 0 4.68 1.19h.01c5.43 0 9.84-4.4 9.84-9.84S17.47 2 12.04 2Zm0 17.98h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.18.83.85-3.1-.2-.32a8.13 8.13 0 0 1-1.25-4.35c0-4.5 3.67-8.16 8.19-8.16 2.19 0 4.24.85 5.79 2.4a8.11 8.11 0 0 1 2.4 5.77c0 4.5-3.67 8.16-8.13 8.16Zm4.49-6.11c-.25-.12-1.45-.71-1.67-.79-.22-.08-.39-.12-.55.12-.16.25-.63.79-.77.95-.14.16-.28.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.45-1.37-1.7-.14-.25-.01-.38.11-.5.11-.11.25-.28.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.45-.59 1.65-1.17.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.6" y="4.8" width="18.8" height="14.4" rx="2.6"/><path d="m3.4 7.4 7.3 5.1a2.3 2.3 0 0 0 2.6 0l7.3-5.1"/></svg>',
    go: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M12.5 6l6 6-6 6"/></svg>',
  }

  function buildAct(kind, href, lead, note, extra) {
    const a = document.createElement('a')
    a.className = `wm2-act wm2-act--${kind}`
    a.href = href
    if (extra) Object.assign(a, extra)
    a.innerHTML =
      `<span class="wm2-act-ico" aria-hidden="true">${ICON[kind]}</span>` +
      `<span class="wm2-act-copy"><span class="wm2-act-lead"></span>` +
      `<span class="wm2-act-note"></span></span>` +
      `<span class="wm2-act-go" aria-hidden="true">${ICON.go}</span>` +
      `<span class="wm2-act-sheen" aria-hidden="true"></span>`
    // text, not innerHTML — the labels are ours, but nothing that reaches a
    // DOM string here is ever allowed to be markup
    a.querySelector('.wm2-act-lead').textContent = lead
    a.querySelector('.wm2-act-note').textContent = note
    return a
  }

  $effect(() => {
    if (!browser || !wizard.isOpen || !panelEl) return
    const el = panelEl

    const upgrade = () => {
      const row = el.querySelector('.wsend')
      if (!row || row.dataset.wmActs) return
      const links = [...row.querySelectorAll('a[href]')]
      const mail = links.find((a) => (a.getAttribute('href') || '').startsWith('mailto:'))
      const wa = links.find((a) => a !== mail && (a.getAttribute('href') || '').includes('wa.me'))
      if (!wa || !mail) return // ContactWizard changed shape — leave its own buttons alone
      row.dataset.wmActs = '1'
      row.classList.add('is-upgraded')
      const acts = document.createElement('div')
      acts.className = 'wm2-acts'
      acts.append(
        buildAct('wa', wa.getAttribute('href'), 'Send via WhatsApp', 'Fastest — we usually reply within the hour', {
          target: '_blank',
          rel: 'noreferrer',
        }),
        buildAct('mail', mail.getAttribute('href'), 'Send as email', 'Straight to the studio inbox'),
      )
      row.appendChild(acts)
    }

    upgrade()
    const mo = new MutationObserver(upgrade)
    mo.observe(el, { childList: true, subtree: true })
    return () => mo.disconnect()
  })

  /* Panel entrance/exit.
     ────────────────────────────────────────────────────────────────────────
     Three cases in two functions rather than two markup branches (a branch
     would re-mount the whole wizard, and its answers with it, the moment a
     phone is rotated across the 767px line):
       • phone  — the BottomSheet spring owns `transform`, so the transition
                  must not also write one; duration 0 and let the spring run;
       • reduced motion — opacity only, no transform of any kind;
       • desktop — rise + a breath of scale, the house `--ease` (cubicOut is
                  its JS twin for the short distances used here). */
  function panelIn(node, { y = 44, duration = 560 } = {}) {
    if (isMobile.current) return { duration: 0 }
    if (reducedMotion.current) return { duration: 240, css: (t) => `opacity: ${t};` }
    return {
      duration,
      easing: cubicOut,
      css: (t, u) => `opacity: ${t}; transform: translateY(${u * y}px) scale(${1 - u * 0.03});`,
    }
  }
</script>

{#if wizard.isOpen}
  <div
    class="wmodal wm2"
    class:is-closing={closing}
    role="dialog"
    aria-modal="true"
    aria-labelledby="wm2-title"
  >
    <!-- The scrim carries its own fade, and the panel its own rise. They used
         to share one `transition:fade` on this wrapper, and that outro was the
         only one that ever played: with a transition on the removed BLOCK
         itself, the panel's `out:` never got its frames, so the modal rose in
         and then simply blinked out. Splitting them gives the close the same
         directional motion as the open, in reverse. -->
    <button
      class="wmodal-backdrop"
      onclick={requestClose}
      aria-label="Close"
      tabindex="-1"
      in:fade={{ duration: 300 }}
    ></button>

    <div
      class="wmodal-panel wm2-panel"
      class:is-sheet={isMobile.current}
      style={isMobile.current ? `transform: translateY(${sheet.y}px);` : undefined}
      bind:this={panelEl}
      in:panelIn
    >
      {#if isMobile.current}
        <SheetHandle bind={sheet.bind} />
      {/if}

      <button class="wmodal-close wm2-close" onclick={requestClose} aria-label="Close">
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none"
             stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <!-- The panel's whole interior is ONE grid (see wizard-modal.css). The
           wizard's own wrapper is `display: contents`, so its seed line, its
           step rail and its stage sit in this grid alongside the masthead and
           the direct line, and the rail can live in the left column on a
           laptop and above the stage on a phone without either component
           knowing about the other. `.wmodal-scroll` is kept as a class only
           because sheet.css/styles.css hang the sheet's `touch-action` off
           it — it does not scroll, and `overflow: hidden` here is a backstop
           against a future regression, not a scroller. -->
      <div class="wm2-body wmodal-scroll" bind:this={bodyEl} {...handoff}>
        <div class="wm2-mast">
          <!-- 'LOOM Organic' — the studio's own pattern face. Caps only, one
               word, 3rem+; it is the display mark and never body copy. -->
          <span class="wm2-mark" aria-hidden="true">LOOM</span>
          <span class="wm2-eyebrow" id="wm2-title">LOOM — Start a project</span>
        </div>

        {#key seedKey}
          <ContactWizard seed={wizard.seed} />
        {/key}

        <p class="wmodal-direct">
          Rather talk now? <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
        </p>
      </div>
    </div>
  </div>
{/if}
